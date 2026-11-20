// commands.mjs — the installer's subcommands: install, update, list,
// doctor, validate, uninstall, restore.
//
// Every command returns a process exit code (0 ok, 1 operational
// failure, 2 usage error via UsageError). All output goes through
// ctx.out / ctx.err so tests can capture it.

import { cp, mkdir, readFile, readdir, readlink, rename, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { hashFile, hashTree, treeFingerprint, diffFileMaps } from './hashing.mjs';
import {
  entryKey,
  entryDest,
  entryRoot,
  manifestPath,
  newManifest,
  readManifest,
  sortedEntries,
  writeManifest,
} from './manifest.mjs';
import { createBackup, listBackups, readBackup, backupsDir } from './backups.mjs';
import { resolveSelection, splitList } from './library.mjs';
import { splitFrontmatter, parseFrontmatter } from '../lib/frontmatter.mjs';
import {
  UsageError,
  allLocations,
  backupReplacements,
  buildEntry,
  classifyInstall,
  classifyUpdate,
  cleanStaleStaging,
  computePlanned,
  computePlannedFromEntry,
  hashInstalled,
  linkPointsAtSource,
  lstatOrNull,
  mapsEqual,
  nowIso,
  resolveLocations,
  scanFiles,
  scanSkillDirs,
  stageItem,
  swapIn,
} from './installer.mjs';

function label(kind, name) {
  return kind === 'skill' ? name : `${name} (${kind})`;
}

function hasSelectors(ctx) {
  return [ctx.skills, ctx.categories, ctx.agents, ctx.workflows].some((v) => v && v.length);
}

// Read the manifest for a mutating command. A missing manifest
// starts fresh; a corrupt one is quarantined (renamed aside, never
// deleted) and started fresh, with a loud warning.
async function loadManifestForWrite(locations, ctx) {
  const { manifest, error } = await readManifest(locations.skillsDir);
  if (manifest) return { manifest, wasCorrupt: false };
  if (error === 'missing') {
    return {
      manifest: newManifest({
        target: locations.targetDef ? locations.targetDef.id : null,
        scope: locations.scope,
        toolVersion: ctx.library.version,
      }),
      wasCorrupt: false,
    };
  }
  const bad = manifestPath(locations.skillsDir);
  const quarantine = `${bad}.corrupt-${Date.now()}`;
  try {
    await rename(bad, quarantine);
    ctx.err(
      `warning: the manifest at ${bad} is ${error}; it was moved to ${quarantine} and a fresh manifest will be written. ` +
        'Previously installed items are still on disk; re-running install adopts them.',
    );
  } catch {
    ctx.err(
      `warning: the manifest at ${bad} is ${error} and could not be moved aside; a fresh manifest will be written.`,
    );
  }
  return {
    manifest: newManifest({
      target: locations.targetDef ? locations.targetDef.id : null,
      scope: locations.scope,
      toolVersion: ctx.library.version,
    }),
    wasCorrupt: true,
  };
}

// Resolve every 'conflict' action: --force/--backup overwrite (after
// a backup), interactive runs ask per item, anything else refuses.
// Returns true when the user aborted the run.
async function resolveConflicts(ctx, plannedItems) {
  let aborted = false;
  for (const p of plannedItems) {
    if (p.action !== 'conflict') continue;
    if (aborted) {
      p.action = 'skip';
      p.reason = 'skipped (run aborted)';
      continue;
    }
    if (ctx.force || ctx.backup) {
      p.action = 'overwrite';
      p.reason = 'overwriting; a backup is made first';
      continue;
    }
    if (ctx.interactive && !ctx.dryRun) {
      ctx.err(`Conflict: ${label(p.kind, p.name)} — ${p.reason}.`);
      const choice = await ctx.ask('Overwrite it (a backup is made first)?', [
        { key: 'o', label: 'overwrite' },
        { key: 's', label: 'skip' },
        { key: 'a', label: 'abort' },
      ]);
      if (choice === 'o') {
        p.action = 'overwrite';
        p.reason = 'overwriting; a backup is made first';
      } else if (choice === 'a') {
        aborted = true;
        p.action = 'skip';
        p.reason = 'skipped (run aborted)';
      } else {
        p.action = 'skip';
        p.reason = 'skipped by user';
      }
      continue;
    }
    p.action = 'refuse';
  }
  return aborted;
}

function printPlan(ctx, plannedItems, locations) {
  ctx.out(`Dry run — nothing will change. Target directory: ${locations.skillsDir}`);
  for (const p of plannedItems) {
    const dest = p.destAbs;
    switch (p.action) {
      case 'install':
        ctx.out(`would install ${label(p.kind, p.name)} → ${dest}${p.method === 'link' ? ' (symlink)' : ''}`);
        break;
      case 'update':
        ctx.out(`would update ${label(p.kind, p.name)} → ${dest} (${p.reason}; a backup is made first)`);
        break;
      case 'overwrite':
        ctx.out(`would overwrite ${label(p.kind, p.name)} → ${dest} (${p.reason})`);
        break;
      case 'already':
        ctx.out(`already installed: ${label(p.kind, p.name)} (no change)`);
        break;
      case 'skip':
        ctx.out(`would skip ${label(p.kind, p.name)} (${p.reason})`);
        break;
      case 'refuse':
      case 'conflict':
        ctx.out(
          `would refuse ${label(p.kind, p.name)} (conflict: ${p.reason}; use --force to overwrite or --backup to back up and overwrite)`,
        );
        break;
      default:
        ctx.out(`would ${p.action} ${label(p.kind, p.name)}`);
    }
  }
}

function printSummary(ctx, results) {
  const parts = [];
  if (results.installed.length) parts.push(`installed ${results.installed.length}`);
  if (results.updated.length) parts.push(`updated ${results.updated.length}`);
  if (results.already.length) parts.push(`already installed ${results.already.length}`);
  if (results.removed && results.removed.length) parts.push(`removed ${results.removed.length}`);
  if (results.restored && results.restored.length) parts.push(`restored ${results.restored.length}`);
  if (results.skipped.length) parts.push(`skipped ${results.skipped.length}`);
  if (results.refused.length) parts.push(`refused ${results.refused.length}`);
  if (results.failed.length) parts.push(`failed ${results.failed.length}`);
  ctx.out(parts.length ? `Summary: ${parts.join(', ')}.` : 'Summary: nothing to do.');
}

// Execute install/update/overwrite actions: one backup for all
// replacements, then per-item atomic install with verification.
// Mutates the manifest (caller writes it when dirty). Returns results.
async function executeInstallRun(ctx, locations, plannedItems, manifest, { command }) {
  const results = { installed: [], updated: [], already: [], skipped: [], refused: [], failed: [] };
  const toWrite = plannedItems.filter((p) => ['install', 'update', 'overwrite'].includes(p.action));

  const roots = [...new Set(toWrite.map((p) => p.rootDir))];
  for (const root of roots) {
    const cleaned = await cleanStaleStaging(root);
    for (const name of cleaned) ctx.err(`note: removed leftover staging directory ${name} from an interrupted run`);
  }

  let executable = toWrite;
  const replacements = toWrite.filter((p) => p.action !== 'install');
  let backup = null;
  if (replacements.length) {
    try {
      backup = await backupReplacements(locations.skillsDir, replacements, {
        target: locations.targetDef ? locations.targetDef.id : null,
        scope: locations.scope,
        reason: command === 'update' ? 'update' : 'replacement',
        command,
      });
    } catch (err) {
      ctx.err(`Backup failed (${err.message}); refusing to replace anything.`);
      for (const p of replacements) {
        p.action = 'failed';
        results.failed.push({ label: label(p.kind, p.name), error: `backup failed: ${err.message}` });
      }
      executable = toWrite.filter((p) => p.action === 'install');
    }
  }

  let manifestDirty = false;
  for (const p of executable) {
    const verb = p.action === 'install' ? 'installed' : 'updated';
    try {
      const staged = await stageItem(p);
      await swapIn(staged, p.destAbs);
      let files;
      if (p.method === 'link') {
        if (!(await linkPointsAtSource(p))) {
          throw new InstallerError('symlink verification failed after install');
        }
        files = new Map();
      } else {
        const installed = await hashInstalled(p);
        if (!installed || !mapsEqual(installed, p.plannedFiles)) {
          throw new InstallerError('installed content does not match the library (copy verification failed)');
        }
        files = installed;
      }
      manifest.items[entryKey(p.kind, p.name)] = await buildEntry(p, { files });
      manifestDirty = true;
      results[p.action === 'install' ? 'installed' : 'updated'].push(label(p.kind, p.name));
      ctx.out(`${verb} ${label(p.kind, p.name)} → ${p.destAbs}${p.method === 'link' ? ' (symlink)' : ''}`);
    } catch (err) {
      results.failed.push({ label: label(p.kind, p.name), error: err.message });
      ctx.err(`failed: ${label(p.kind, p.name)} — ${err.message}`);
    }
  }

  for (const p of plannedItems) {
    if (p.action === 'already') {
      if (p.adopt) {
        try {
          const files = p.method === 'link' ? new Map() : await hashInstalled(p);
          manifest.items[entryKey(p.kind, p.name)] = await buildEntry(p, { files: files || new Map() });
          manifestDirty = true;
          ctx.out(`already installed: ${label(p.kind, p.name)} (adopted into the manifest)`);
        } catch (err) {
          ctx.err(`warning: could not adopt ${label(p.kind, p.name)} into the manifest: ${err.message}`);
          ctx.out(`already installed: ${label(p.kind, p.name)}`);
        }
      } else {
        ctx.out(`already installed: ${label(p.kind, p.name)}`);
      }
      results.already.push(label(p.kind, p.name));
    } else if (p.action === 'skip') {
      results.skipped.push(label(p.kind, p.name));
      ctx.out(`skipped: ${label(p.kind, p.name)} (${p.reason})`);
    } else if (p.action === 'refuse') {
      const error = `${p.reason}. Re-run with --force to overwrite (a backup is made first) or --backup to back up and overwrite.`;
      results.refused.push({ label: label(p.kind, p.name), error });
      ctx.err(`refused: ${label(p.kind, p.name)} — ${error}`);
    }
  }

  if (backup) {
    ctx.out(`Backup created: ${backup.id} (${backup.items.length} item${backup.items.length === 1 ? '' : 's'}). Restore with: restore ${backup.id}`);
  }
  if (manifestDirty) {
    await mkdir(locations.skillsDir, { recursive: true });
    await writeManifest(locations.skillsDir, manifest);
  }
  return results;
}

function warnDeprecatedWorkflows(ctx, items, locations) {
  if (
    locations.targetDef &&
    locations.targetDef.workflows &&
    locations.targetDef.workflows.deprecated &&
    items.some((i) => i.kind === 'workflow')
  ) {
    ctx.err(`warning: ${locations.targetDef.workflows.deprecationNote}`);
  }
}

function noteLinkScope(ctx, items) {
  if (ctx.link && items.some((i) => i.kind !== 'skill')) {
    ctx.out('Note: --link applies to skills; agents and workflows are always copied (their installed form is a target-format conversion of the library file).');
  }
}

// ---------------------------------------------------------------- install

export async function cmdInstall(ctx) {
  const locations = resolveLocations(ctx);
  const selection = hasSelectors(ctx) ? ctx : { ...ctx, skills: ['all'] };
  const { items, errors } = resolveSelection(ctx.library, selection);
  if (errors.length) throw new UsageError(errors.join('; '));
  if (!items.length) {
    ctx.out('Nothing to install.');
    return 0;
  }
  warnDeprecatedWorkflows(ctx, items, locations);
  noteLinkScope(ctx, items);

  const plannedItems = [];
  for (const item of items) {
    plannedItems.push(await computePlanned(ctx.library, item, locations, ctx));
  }
  const { manifest } = await loadManifestForWrite(locations, ctx);
  for (const p of plannedItems) {
    const c = await classifyInstall(p, manifest);
    p.action = c.action;
    p.reason = c.reason;
    p.adopt = c.adopt;
  }
  if (!ctx.dryRun) await resolveConflicts(ctx, plannedItems);
  if (ctx.dryRun) {
    printPlan(ctx, plannedItems, locations);
    return 0;
  }
  const results = await executeInstallRun(ctx, locations, plannedItems, manifest, { command: 'install' });
  printSummary(ctx, results);
  if (results.installed.length || results.updated.length) {
    ctx.out('Restart the agent (or reload the project) so it picks up the new skills.');
  }
  return results.failed.length || results.refused.length ? 1 : 0;
}

// ---------------------------------------------------------------- update

export async function cmdUpdate(ctx) {
  const locations = resolveLocations(ctx);
  const { manifest, error } = await readManifest(locations.skillsDir);
  if (!manifest) {
    if (error === 'missing') {
      ctx.err(
        `No manifest at ${manifestPath(locations.skillsDir)}: nothing installed through this tool here. ` +
          'Use `install` to install skills (it adopts content identical to the library).',
      );
    } else {
      ctx.err(
        `Cannot update: the manifest at ${manifestPath(locations.skillsDir)} is ${error}. ` +
          'Run `doctor` for details; `install --force` can reinstall cleanly.',
      );
    }
    return 1;
  }
  if (ctx.link) {
    ctx.out('Note: update keeps each item\'s original install method; --link is ignored (uninstall, then install --link, to switch a skill to a symlink).');
  }

  // Selection filters manifest entries. Names match the manifest
  // directly (an entry may outlive its library item); categories
  // resolve through the library.
  let entries = sortedEntries(manifest);
  if (hasSelectors(ctx)) {
    const skillNames = new Set(splitList(ctx.skills));
    const agentNames = new Set(splitList(ctx.agents));
    const workflowNames = new Set(splitList(ctx.workflows));
    const categories = splitList(ctx.categories);
    for (const cat of categories) {
      if (cat !== 'all' && !ctx.library.categories.has(cat)) {
        throw new UsageError(`unknown category '${cat}' (known: ${[...ctx.library.categories].sort().join(', ')})`);
      }
    }
    const wantAllSkills = skillNames.has('all');
    const wantAllCategories = categories.includes('all');
    const categorySet = new Set(categories);
    entries = entries.filter((e) => {
      if (e.kind === 'skill') {
        if (wantAllSkills || wantAllCategories) return true;
        if (skillNames.has(e.name)) return true;
        const rec = ctx.library.skills.get(e.name);
        return rec && categorySet.has(rec.category);
      }
      if (e.kind === 'agent') return agentNames.has('all') || agentNames.has(e.name);
      return workflowNames.has('all') || workflowNames.has(e.name);
    });
    // Unknown names are an error, not a silent no-op.
    const manifestNames = new Set(entries.map((e) => `${e.kind}:${e.name}`));
    const unknown = [];
    for (const n of skillNames) {
      if (n !== 'all' && !manifestNames.has(`skill:${n}`) && !ctx.library.skills.has(n)) unknown.push(`unknown skill '${n}'`);
      else if (n !== 'all' && !manifestNames.has(`skill:${n}`)) unknown.push(`skill '${n}' is not installed here (use install)`);
    }
    for (const n of agentNames) {
      if (n !== 'all' && !manifestNames.has(`agent:${n}`) && !ctx.library.agents.has(n)) unknown.push(`unknown agent '${n}'`);
      else if (n !== 'all' && !manifestNames.has(`agent:${n}`)) unknown.push(`agent '${n}' is not installed here (use install)`);
    }
    for (const n of workflowNames) {
      if (n !== 'all' && !manifestNames.has(`workflow:${n}`) && !ctx.library.workflows.has(n)) unknown.push(`unknown workflow '${n}'`);
      else if (n !== 'all' && !manifestNames.has(`workflow:${n}`)) unknown.push(`workflow '${n}' is not installed here (use install)`);
    }
    if (unknown.length) throw new UsageError(unknown.join('; '));
  }
  if (!entries.length) {
    ctx.out('Nothing installed here to update.');
    return 0;
  }
  warnDeprecatedWorkflows(ctx, entries, locations);

  const plannedItems = [];
  const skipped = [];
  for (const entry of entries) {
    const byKind =
      entry.kind === 'skill' ? ctx.library.skills : entry.kind === 'agent' ? ctx.library.agents : ctx.library.workflows;
    const item = byKind.get(entry.name);
    if (!item) {
      skipped.push(`${label(entry.kind, entry.name)} (no longer in the library; left in place)`);
      continue;
    }
    plannedItems.push(await computePlannedFromEntry(ctx.library, item, entry, locations.skillsDir));
  }
  for (const p of plannedItems) {
    const entry = manifest.items[entryKey(p.kind, p.name)];
    const c = await classifyUpdate(p, entry);
    p.action = c.action;
    p.reason = c.reason;
  }
  if (!ctx.dryRun) await resolveConflicts(ctx, plannedItems);
  if (ctx.dryRun) {
    printPlan(ctx, plannedItems, locations);
    for (const s of skipped) ctx.out(`would skip ${s}`);
    return 0;
  }
  const results = await executeInstallRun(ctx, locations, plannedItems, manifest, { command: 'update' });
  for (const s of skipped) {
    results.skipped.push(s);
    ctx.out(`skipped: ${s}`);
  }
  printSummary(ctx, results);
  if (results.installed.length || results.updated.length) {
    ctx.out('Restart the agent (or reload the project) so it picks up the updated skills.');
  }
  return results.failed.length || results.refused.length ? 1 : 0;
}

// ---------------------------------------------------------------- list

export async function cmdList(ctx) {
  const locations = resolveLocations(ctx);
  const { manifest, error } = await readManifest(locations.skillsDir);
  const rows = [];
  let note = null;
  if (manifest) {
    for (const e of sortedEntries(manifest)) {
      rows.push({
        name: e.name,
        kind: e.kind,
        version: e.version || '—',
        method: e.method || '—',
        installed: (e.installed || '').slice(0, 10) || '—',
        source: 'manifest',
      });
    }
  } else {
    note =
      error === 'missing'
        ? 'no manifest found; showing directories found on disk'
        : `manifest is ${error}; showing directories found on disk`;
    for (const s of await scanSkillDirs(locations.skillsDir)) {
      rows.push({ name: s.name, kind: 'skill', version: '—', method: s.isSymlink ? 'link?' : '—', installed: '—', source: 'scan' });
    }
    if (locations.agentsDir) {
      for (const f of await scanFiles(locations.agentsDir)) {
        rows.push({ name: f.name.replace(/\.(md|toml)$/, ''), kind: 'agent', version: '—', method: '—', installed: '—', source: 'scan' });
      }
    }
    if (locations.workflowsDir) {
      for (const f of await scanFiles(locations.workflowsDir)) {
        rows.push({ name: f.name.replace(/\.md$/, ''), kind: 'workflow', version: '—', method: '—', installed: '—', source: 'scan' });
      }
    }
  }

  if (ctx.json) {
    ctx.out(JSON.stringify({ directory: locations.skillsDir, note, items: rows }, null, 2));
    return 0;
  }
  const where = locations.targetDef
    ? `${locations.targetDef.label} (${locations.scope})`
    : 'custom directory';
  ctx.out(`Installed in ${locations.skillsDir} — ${where}:`);
  if (note) ctx.out(`(${note})`);
  if (!rows.length) {
    ctx.out('  (nothing installed)');
    return 0;
  }
  const pad = (s, n) => String(s).padEnd(n);
  const wName = Math.max(...rows.map((r) => r.name.length), 4);
  ctx.out(`  ${pad('NAME', wName)}  KIND      VERSION  METHOD  INSTALLED`);
  for (const r of rows) {
    ctx.out(`  ${pad(r.name, wName)}  ${pad(r.kind, 8)}  ${pad(r.version, 7)}  ${pad(r.method, 6)}  ${r.installed}`);
  }
  ctx.out(`Total: ${rows.length} item${rows.length === 1 ? '' : 's'}.`);
  return 0;
}

// ---------------------------------------------------------------- doctor

async function checkLocation(ctx, locations) {
  const problems = []; // { level: 'fail'|'warn'|'info', message }
  const { targetDef, scope, skillsDir } = locations;
  const labelLoc = targetDef ? `${targetDef.label} (${scope}) — ${skillsDir}` : skillsDir;
  const dirExists = (await lstatOrNull(skillsDir)) !== null;

  // Legacy-path installs (a previous installer version's locations).
  if (locations.legacySkillsDir) {
    const legacy = await scanSkillDirs(locations.legacySkillsDir);
    if (legacy.length) {
      problems.push({
        level: 'warn',
        message: `${legacy.length} skill(s) in the legacy location ${locations.legacySkillsDir} (current location is ${skillsDir}); move them or reinstall with the current installer`,
      });
    }
  }

  if (!dirExists) {
    problems.push({ level: 'info', message: 'directory does not exist (nothing installed here)' });
    return { location: labelLoc, skillsDir, problems };
  }

  // Stale staging dirs from interrupted installs.
  let dirEntries = [];
  try {
    dirEntries = await readdir(skillsDir);
  } catch { /* ignore */ }
  for (const name of dirEntries) {
    if (name.startsWith('.skillforge-tmp-')) {
      problems.push({ level: 'warn', message: `leftover staging directory ${name} from an interrupted install; safe to delete` });
    }
  }

  const { manifest, error } = await readManifest(skillsDir);
  const scanned = await scanSkillDirs(skillsDir);
  if (!manifest) {
    if (error === 'missing') {
      if (scanned.length) {
        problems.push({
          level: 'warn',
          message: `${scanned.length} skill director${scanned.length === 1 ? 'y' : 'ies'} but no manifest (installed by another tool or an older installer; run install to adopt them)`,
        });
      } else {
        problems.push({ level: 'info', message: 'no manifest (nothing installed here)' });
      }
    } else {
      problems.push({ level: 'fail', message: `manifest is ${error}; list falls back to scanning, update/uninstall refuse to run` });
    }
  }

  const manifestKeys = new Set();
  if (manifest) {
    for (const entry of sortedEntries(manifest)) {
      manifestKeys.add(entryKey(entry.kind, entry.name));
      const dest = entryDest(skillsDir, entry);
      const st = await lstatOrNull(dest);
      const what = label(entry.kind, entry.name);
      if (!st) {
        problems.push({ level: 'fail', message: `stale: ${what} is in the manifest but missing on disk (${dest})` });
        continue;
      }
      if (entry.method === 'link') {
        if (!st.isSymbolicLink()) {
          problems.push({ level: 'fail', message: `${what} should be a symlink but is a real file/directory` });
          continue;
        }
        let target;
        try {
          target = await readlink(dest);
        } catch (err) {
          problems.push({ level: 'fail', message: `${what}: unreadable symlink (${err.message})` });
          continue;
        }
        const resolved = path.resolve(path.dirname(dest), target);
        if ((await lstatOrNull(resolved)) === null) {
          problems.push({ level: 'fail', message: `${what}: broken symlink → ${target}` });
        } else if (resolved !== path.join(ctx.library.root, entry.source)) {
          problems.push({ level: 'warn', message: `${what}: symlink points at ${target}, not the library` });
        }
        continue;
      }
      // Copy install: compare disk against the manifest.
      const planned = { kind: entry.kind, name: entry.name, destAbs: dest, destName: entry.destName };
      const current = await hashInstalled(planned);
      if (!current) {
        problems.push({ level: 'fail', message: `${what}: installed content has an unexpected shape` });
        continue;
      }
      const recorded = new Map(Object.entries(entry.files || {}));
      const diff = diffFileMaps(recorded, current);
      if (!diff.same) {
        const bits = [];
        if (diff.changed.length) bits.push(`modified: ${diff.changed.join(', ')}`);
        if (diff.added.length) bits.push(`added: ${diff.added.join(', ')}`);
        if (diff.removed.length) bits.push(`removed: ${diff.removed.join(', ')}`);
        problems.push({ level: 'warn', message: `${what} differs from the manifest (${bits.join('; ')})` });
      }
      if (entry.kind === 'skill' && (await lstatOrNull(path.join(dest, 'SKILL.md'))) === null) {
        problems.push({ level: 'fail', message: `${what}: SKILL.md is missing` });
      }
      // Library drift: is an update available, or is the source gone?
      const byKind =
        entry.kind === 'skill' ? ctx.library.skills : entry.kind === 'agent' ? ctx.library.agents : ctx.library.workflows;
      const item = byKind.get(entry.name);
      if (!item) {
        problems.push({ level: 'warn', message: `${what} is no longer in the library` });
      } else {
        try {
          let currentHash;
          if (entry.kind === 'skill') {
            currentHash = treeFingerprint(await hashTree(path.join(ctx.library.root, item.source)));
          } else {
            currentHash = await hashFile(path.join(ctx.library.root, item.source));
          }
          if (currentHash !== entry.sourceHash) {
            problems.push({ level: 'info', message: `${what}: a library update is available (run update)` });
          }
        } catch {
          problems.push({ level: 'warn', message: `${what}: library source is unreadable` });
        }
      }
    }
  }

  // Orphans: content on disk that no manifest entry covers.
  for (const s of scanned) {
    if (s.isSymlink) {
      let target = null;
      try {
        target = await readlink(s.dir);
      } catch { /* ignore */ }
      if (target && (await lstatOrNull(path.resolve(skillsDir, target))) === null) {
        problems.push({ level: 'fail', message: `broken symlink: ${s.name} → ${target}` });
      }
    }
    if (!manifestKeys.has(entryKey('skill', s.name))) {
      problems.push({ level: 'warn', message: `orphan skill directory ${s.name} (not in the manifest)` });
    }
    if (!s.hasSkillMd && !s.isSymlink) {
      problems.push({ level: 'fail', message: `skill directory ${s.name} has no SKILL.md` });
    }
  }
  if (locations.agentsDir) {
    for (const f of await scanFiles(locations.agentsDir)) {
      const name = f.name.replace(/\.(md|toml)$/, '');
      if (!manifestKeys.has(entryKey('agent', name))) {
        problems.push({ level: 'warn', message: `orphan agent file ${f.name} in ${locations.agentsDir} (not in the manifest)` });
      }
    }
  }
  if (locations.workflowsDir) {
    for (const f of await scanFiles(locations.workflowsDir)) {
      const name = f.name.replace(/\.md$/, '');
      if (!manifestKeys.has(entryKey('workflow', name))) {
        problems.push({ level: 'warn', message: `orphan workflow file ${f.name} in ${locations.workflowsDir} (not in the manifest)` });
      }
    }
  }

  return { location: labelLoc, skillsDir, problems };
}

export async function cmdDoctor(ctx) {
  let locationsList;
  if (ctx.dest) {
    locationsList = [resolveLocations(ctx)];
  } else if (ctx.target) {
    if (ctx.scope) {
      locationsList = [resolveLocations(ctx)];
    } else {
      locationsList = ['project', 'user'].map((scope) => resolveLocations({ ...ctx, scope }));
    }
  } else {
    locationsList = allLocations(ctx);
  }

  const reports = [];
  for (const locations of locationsList) {
    reports.push(await checkLocation(ctx, locations));
  }

  let fails = 0;
  let warns = 0;
  if (ctx.json) {
    for (const r of reports) {
      fails += r.problems.filter((p) => p.level === 'fail').length;
      warns += r.problems.filter((p) => p.level === 'warn').length;
    }
    ctx.out(JSON.stringify({ ok: fails === 0, fails, warns, locations: reports }, null, 2));
    return fails ? 1 : 0;
  }

  for (const r of reports) {
    ctx.out(`\n${r.location}`);
    if (!r.problems.length) {
      ctx.out('  OK — no problems found');
      continue;
    }
    for (const p of r.problems) {
      const tag = p.level === 'fail' ? 'FAIL' : p.level === 'warn' ? 'WARN' : 'info';
      ctx.out(`  [${tag}] ${p.message}`);
      if (p.level === 'fail') fails++;
      if (p.level === 'warn') warns++;
    }
  }
  ctx.out(`\nDoctor: ${fails} failure${fails === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}.`);
  if (fails) ctx.out('Failures need attention; warnings are informational (user edits and orphans are expected).');
  return fails ? 1 : 0;
}

// ---------------------------------------------------------------- validate

async function validateSkillDir(dir, name) {
  const problems = [];
  const skillMd = path.join(dir, 'SKILL.md');
  let text;
  try {
    text = await readFile(skillMd, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return ['SKILL.md is missing'];
    return [`SKILL.md is unreadable (${err.message})`];
  }
  const { raw, error } = splitFrontmatter(text);
  if (error) return [`frontmatter: ${error}`];
  const parsed = parseFrontmatter(raw);
  if (parsed.error) return [`frontmatter: ${parsed.error}`];
  const { data } = parsed;
  if (!data.name) problems.push('frontmatter has no name');
  else if (data.name !== name) problems.push(`frontmatter name '${data.name}' does not match directory '${name}'`);
  if (!data.description) problems.push('frontmatter has no description');
  return problems;
}

export async function cmdValidate(ctx) {
  const locations = resolveLocations(ctx);
  const { manifest } = await readManifest(locations.skillsDir);
  const skills = new Map(); // name -> dir
  if (manifest) {
    for (const e of sortedEntries(manifest)) {
      if (e.kind === 'skill') skills.set(e.name, entryDest(locations.skillsDir, e));
    }
  }
  for (const s of await scanSkillDirs(locations.skillsDir)) {
    if (!skills.has(s.name)) skills.set(s.name, s.dir);
  }

  const failures = [];
  const passes = [];
  for (const [name, dir] of [...skills.entries()].sort()) {
    const problems = await validateSkillDir(dir, name);
    if (problems.length) failures.push({ name, kind: 'skill', problems });
    else passes.push(name);
  }

  // Agents: the file must exist, and Markdown frontmatter (when
  // present) must name the file it lives in.
  if (manifest) {
    for (const e of sortedEntries(manifest)) {
      if (e.kind === 'skill') continue;
      const dest = entryDest(locations.skillsDir, e);
      const st = await lstatOrNull(dest);
      if (!st) {
        failures.push({ name: e.name, kind: e.kind, problems: ['installed file is missing'] });
        continue;
      }
      if (e.destName.endsWith('.md')) {
        try {
          const text = await readFile(dest, 'utf8');
          if (text.startsWith('---\n') || text.startsWith('---\r\n')) {
            const { raw, error } = splitFrontmatter(text);
            if (error) {
              failures.push({ name: e.name, kind: e.kind, problems: [`frontmatter: ${error}`] });
              continue;
            }
            const parsed = parseFrontmatter(raw);
            if (parsed.error) {
              failures.push({ name: e.name, kind: e.kind, problems: [`frontmatter: ${parsed.error}`] });
            } else if (parsed.data.name && parsed.data.name !== e.name) {
              failures.push({
                name: e.name,
                kind: e.kind,
                problems: [`frontmatter name '${parsed.data.name}' does not match file '${e.destName}'`],
              });
            } else {
              passes.push(label(e.kind, e.name));
            }
          } else {
            passes.push(label(e.kind, e.name));
          }
        } catch (err) {
          failures.push({ name: e.name, kind: e.kind, problems: [`unreadable (${err.message})`] });
        }
      } else {
        passes.push(label(e.kind, e.name));
      }
    }
  }

  if (ctx.json) {
    ctx.out(JSON.stringify({ directory: locations.skillsDir, passes, failures }, null, 2));
    return failures.length ? 1 : 0;
  }
  ctx.out(`Validating installed skills in ${locations.skillsDir}:`);
  if (!passes.length && !failures.length) {
    ctx.out('  (nothing installed)');
    return 0;
  }
  for (const name of passes) ctx.out(`  ok: ${name}`);
  for (const f of failures) {
    ctx.out(`  FAIL: ${label(f.kind, f.name)} — ${f.problems.join('; ')}`);
  }
  ctx.out(`Validate: ${passes.length} passed, ${failures.length} failed.`);
  return failures.length ? 1 : 0;
}

// ---------------------------------------------------------------- uninstall

export async function cmdUninstall(ctx) {
  const locations = resolveLocations(ctx);
  const { manifest, error } = await readManifest(locations.skillsDir);
  let manifestObj = manifest;
  if (!manifestObj) {
    if (error !== 'missing' && !ctx.force) {
      ctx.err(
        `Cannot uninstall: the manifest at ${manifestPath(locations.skillsDir)} is ${error}. ` +
          'Run `doctor` for details, or re-run with --force to uninstall selected items anyway (a backup is made first).',
      );
      return 1;
    }
    if (error !== 'missing') {
      ctx.err(`warning: manifest is ${error}; treating installed content as foreign (a backup is made before removal)`);
    }
    manifestObj = newManifest({
      target: locations.targetDef ? locations.targetDef.id : null,
      scope: locations.scope,
      toolVersion: ctx.library.version,
    });
  }

  if (!ctx.all && !hasSelectors(ctx)) {
    throw new UsageError('Nothing selected: pass --skill <name>, --agent <name>, --workflow <name>, --category <name>, or --all.');
  }

  // Resolve the selection against the union of manifest + library,
  // so items removed from the library can still be uninstalled.
  let targets = [];
  if (ctx.all) {
    targets = sortedEntries(manifestObj).map((e) => ({ kind: e.kind, name: e.name, entry: e }));
  } else {
    const wanted = [];
    for (const n of splitList(ctx.skills)) wanted.push({ kind: 'skill', name: n });
    for (const n of splitList(ctx.agents)) wanted.push({ kind: 'agent', name: n });
    for (const n of splitList(ctx.workflows)) wanted.push({ kind: 'workflow', name: n });
    for (const cat of splitList(ctx.categories)) {
      if (cat !== 'all' && !ctx.library.categories.has(cat)) {
        throw new UsageError(`unknown category '${cat}' (known: ${[...ctx.library.categories].sort().join(', ')})`);
      }
      for (const s of ctx.library.skills.values()) {
        if (cat === 'all' || s.category === cat) wanted.push({ kind: 'skill', name: s.name });
      }
    }
    const unknown = [];
    for (const w of wanted) {
      const inManifest = Boolean(manifestObj.items[entryKey(w.kind, w.name)]);
      const inLibrary =
        (w.kind === 'skill' && ctx.library.skills.has(w.name)) ||
        (w.kind === 'agent' && ctx.library.agents.has(w.name)) ||
        (w.kind === 'workflow' && ctx.library.workflows.has(w.name));
      if (!inManifest && !inLibrary) unknown.push(`unknown ${w.kind} '${w.name}'`);
    }
    if (unknown.length) throw new UsageError(unknown.join('; '));
    const seen = new Set();
    for (const w of wanted) {
      const key = entryKey(w.kind, w.name);
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push({ ...w, entry: manifestObj.items[key] || null });
    }
  }
  if (!targets.length) {
    ctx.out('Nothing installed here to uninstall.');
    return 0;
  }

  // Classify each target: absent | remove | modified | foreign.
  const planned = [];
  for (const t of targets) {
    let destAbs;
    if (t.entry) {
      destAbs = entryDest(locations.skillsDir, t.entry);
    } else if (t.kind === 'skill') {
      destAbs = path.join(locations.skillsDir, t.name);
    } else if (t.kind === 'agent' && locations.agentsDir) {
      const file = locations.targetDef.agents.format === 'toml' ? `${t.name}.toml` : `${t.name}.md`;
      destAbs = path.join(locations.agentsDir, file);
    } else if (t.kind === 'workflow' && locations.workflowsDir) {
      destAbs = path.join(locations.workflowsDir, `${t.name}.md`);
    } else {
      throw new UsageError(
        `Cannot uninstall ${label(t.kind, t.name)}: no ${t.kind} location for this target/scope combination.`,
      );
    }
    const st = await lstatOrNull(destAbs);
    if (!st) {
      planned.push({ ...t, destAbs, action: 'absent', reason: 'not installed' });
      continue;
    }
    if (!t.entry) {
      planned.push({ ...t, destAbs, action: 'foreign', reason: 'not recorded in the manifest (installed by another tool?)' });
      continue;
    }
    if (t.entry.method === 'link') {
      planned.push({ ...t, destAbs, action: 'remove', reason: 'symlink recorded in the manifest' });
      continue;
    }
    const current = await hashInstalled({ kind: t.kind, name: t.name, destAbs, destName: t.entry.destName });
    const recorded = new Map(Object.entries(t.entry.files || {}));
    if (current && mapsEqual(current, recorded)) {
      planned.push({ ...t, destAbs, action: 'remove', reason: 'matches the manifest' });
    } else {
      planned.push({ ...t, destAbs, action: 'modified', reason: 'installed content differs from the manifest (may contain your edits)' });
    }
  }

  const doomed = planned.filter((p) => p.action !== 'absent');
  if (ctx.all && doomed.length) {
    if (!ctx.force) {
      if (ctx.interactive && !ctx.dryRun) {
        const choice = await ctx.ask(`Remove all ${doomed.length} installed item(s) from ${locations.skillsDir}?`, [
          { key: 'y', label: 'yes' },
          { key: 'n', label: 'no' },
        ]);
        if (choice !== 'y') {
          ctx.out('Aborted; nothing removed.');
          return 0;
        }
      } else if (!ctx.dryRun) {
        ctx.err(
          `Refusing to uninstall --all non-interactively without --force (${doomed.length} item(s) would be removed). ` +
            'Re-run with --force to confirm.',
        );
        return 1;
      }
    }
  }

  // Resolve modified/foreign items like install conflicts.
  for (const p of planned) {
    if (p.action !== 'modified' && p.action !== 'foreign') continue;
    if (ctx.force || ctx.backup) {
      p.action = 'remove';
      p.reason += '; a backup is made first';
      continue;
    }
    if (ctx.interactive && !ctx.dryRun) {
      ctx.err(`${label(p.kind, p.name)} — ${p.reason}.`);
      const choice = await ctx.ask('Remove it anyway (a backup is made first)?', [
        { key: 'y', label: 'yes' },
        { key: 'n', label: 'no' },
      ]);
      if (choice === 'y') {
        p.action = 'remove';
        p.reason += '; a backup is made first';
      } else {
        p.action = 'skip';
        p.reason = 'skipped by user';
      }
      continue;
    }
    p.action = 'refuse';
  }

  if (ctx.dryRun) {
    ctx.out(`Dry run — nothing will change. Target directory: ${locations.skillsDir}`);
    for (const p of planned) {
      if (p.action === 'remove') ctx.out(`would remove ${label(p.kind, p.name)} (${p.destAbs})`);
      else if (p.action === 'absent') ctx.out(`not installed: ${label(p.kind, p.name)}`);
      else if (p.action === 'skip') ctx.out(`would skip ${label(p.kind, p.name)} (${p.reason})`);
      else ctx.out(`would refuse ${label(p.kind, p.name)} (${p.reason}; use --force to remove anyway — a backup is made first)`);
    }
    return 0;
  }

  const results = { removed: [], skipped: [], refused: [], failed: [], installed: [], updated: [], already: [] };
  const toRemove = planned.filter((p) => p.action === 'remove');
  const needBackup = planned.filter(
    (p) => p.action === 'remove' && (p.reason.includes('differs') || p.reason.includes('not recorded')),
  );
  if (needBackup.length) {
    try {
      const backup = await createBackup(locations.skillsDir, {
        target: locations.targetDef ? locations.targetDef.id : null,
        scope: locations.scope,
        reason: 'uninstall',
        command: 'uninstall',
        items: needBackup.map((p) => ({ kind: p.kind, name: p.name, destAbs: p.destAbs, entry: p.entry })),
      });
      if (backup) ctx.out(`Backup created: ${backup.id} (${backup.items.length} item${backup.items.length === 1 ? '' : 's'}). Restore with: restore ${backup.id}`);
    } catch (err) {
      ctx.err(`Backup failed (${err.message}); refusing to remove modified/foreign items.`);
      for (const p of needBackup) {
        p.action = 'failed';
        results.failed.push({ label: label(p.kind, p.name), error: `backup failed: ${err.message}` });
      }
    }
  }

  let manifestDirty = false;
  for (const p of toRemove) {
    if (p.action !== 'remove') continue;
    try {
      await rm(p.destAbs, { recursive: true, force: true });
      delete manifestObj.items[entryKey(p.kind, p.name)];
      manifestDirty = true;
      results.removed.push(label(p.kind, p.name));
      ctx.out(`removed ${label(p.kind, p.name)}`);
    } catch (err) {
      results.failed.push({ label: label(p.kind, p.name), error: err.message });
      ctx.err(`failed: ${label(p.kind, p.name)} — ${err.message}`);
    }
  }
  for (const p of planned) {
    if (p.action === 'absent') ctx.out(`not installed: ${label(p.kind, p.name)}`);
    else if (p.action === 'skip') {
      results.skipped.push(label(p.kind, p.name));
      ctx.out(`skipped: ${label(p.kind, p.name)} (${p.reason})`);
    } else if (p.action === 'refuse') {
      const error = `${p.reason}. Re-run with --force to remove anyway (a backup is made first).`;
      results.refused.push({ label: label(p.kind, p.name), error });
      ctx.err(`refused: ${label(p.kind, p.name)} — ${error}`);
    }
  }
  if (manifestDirty) {
    await mkdir(locations.skillsDir, { recursive: true });
    await writeManifest(locations.skillsDir, manifestObj);
  }
  printSummary(ctx, results);
  return results.failed.length || results.refused.length ? 1 : 0;
}

// ---------------------------------------------------------------- restore

function backupItemPaths(record, item) {
  const storedDir = path.join(record.dir, 'items', item.storedAs);
  return { storedDir, storedFile: item.fileName ? path.join(storedDir, item.fileName) : storedDir };
}

async function hashBackupContent(item, paths) {
  if (item.isSymlink) {
    try {
      return `link:${await readlink(paths.storedDir)}`;
    } catch {
      return null;
    }
  }
  if (item.isDirectory) {
    return treeFingerprint(await hashTree(paths.storedDir));
  }
  return hashFile(paths.storedFile);
}

async function hashLiveContent(item, destAbs) {
  const st = await lstatOrNull(destAbs);
  if (!st) return null;
  if (st.isSymbolicLink()) {
    try {
      return `link:${await readlink(destAbs)}`;
    } catch {
      return null;
    }
  }
  if (st.isDirectory()) return treeFingerprint(await hashTree(destAbs));
  return hashFile(destAbs);
}

export async function cmdRestore(ctx) {
  const locations = resolveLocations(ctx);
  const backups = await listBackups(locations.skillsDir);

  if (ctx.listBackups) {
    if (ctx.json) {
      ctx.out(JSON.stringify(backups, null, 2));
      return 0;
    }
    ctx.out(`Backups in ${backupsDir(locations.skillsDir)}:`);
    if (!backups.length) {
      ctx.out('  (none)');
      return 0;
    }
    for (const b of backups) {
      if (b.corrupt) {
        ctx.out(`  ${b.id}  (corrupt backup directory — backup.json unreadable)`);
        continue;
      }
      const names = b.items.map((i) => label(i.kind, i.name)).join(', ');
      ctx.out(`  ${b.id}  ${b.created || ''}  [${b.reason || ''}]  ${names}`);
    }
    return 0;
  }

  const id = ctx.positional[0];
  if (!id) throw new UsageError('restore needs a backup id (see `restore --list`) or --list.');
  let record;
  try {
    record = await readBackup(locations.skillsDir, id);
  } catch {
    const available = backups.map((b) => b.id);
    throw new UsageError(
      `No backup '${id}' in ${backupsDir(locations.skillsDir)}.` +
        (available.length ? ` Available: ${available.join(', ')}` : ' There are no backups here.'),
    );
  }

  let items = record.items;
  if (hasSelectors(ctx)) {
    const skillNames = new Set(splitList(ctx.skills));
    const agentNames = new Set(splitList(ctx.agents));
    const workflowNames = new Set(splitList(ctx.workflows));
    items = items.filter((i) => {
      if (i.kind === 'skill') return skillNames.has(i.name);
      if (i.kind === 'agent') return agentNames.has(i.name);
      return workflowNames.has(i.name);
    });
    if (!items.length) {
      ctx.out('No items in this backup match the selection.');
      return 0;
    }
  }

  // Classify: missing on disk | identical | replace.
  const planned = [];
  for (const item of items) {
    const entry = item.entry || { root: item.root || '.', destName: item.destName || item.name };
    const rootDir = entryRoot(locations.skillsDir, entry);
    const destAbs = path.join(rootDir, entry.destName);
    const paths = backupItemPaths(record, item);
    const storedHash = await hashBackupContent(item, paths);
    const liveHash = await hashLiveContent(item, destAbs);
    if (liveHash === null) planned.push({ item, entry, destAbs, paths, action: 'restore', reason: 'not present' });
    else if (storedHash !== null && storedHash === liveHash) planned.push({ item, entry, destAbs, paths, action: 'already', reason: 'already matches the backup' });
    else planned.push({ item, entry, destAbs, paths, action: 'replace', reason: 'current content differs from the backup' });
  }

  if (ctx.dryRun) {
    ctx.out(`Dry run — nothing will change. Backup: ${record.id} (${record.created})`);
    for (const p of planned) {
      if (p.action === 'restore') ctx.out(`would restore ${label(p.item.kind, p.item.name)} → ${p.destAbs}`);
      else if (p.action === 'replace') ctx.out(`would restore ${label(p.item.kind, p.item.name)} → ${p.destAbs} (current content is backed up first)`);
      else ctx.out(`already matches the backup: ${label(p.item.kind, p.item.name)}`);
    }
    return 0;
  }

  const results = { restored: [], already: [], skipped: [], refused: [], failed: [], installed: [], updated: [], removed: [] };
  const toReplace = planned.filter((p) => p.action === 'replace');
  if (toReplace.length) {
    // Restoring over current content backs the current content up
    // first, so a restore is always reversible.
    try {
      const pre = await createBackup(locations.skillsDir, {
        target: locations.targetDef ? locations.targetDef.id : null,
        scope: locations.scope,
        reason: 'pre-restore',
        command: 'restore',
        items: toReplace.map((p) => ({ kind: p.item.kind, name: p.item.name, destAbs: p.destAbs, entry: p.entry })),
      });
      if (pre) ctx.out(`Current content backed up as ${pre.id} before restoring.`);
    } catch (err) {
      ctx.err(`Backup failed (${err.message}); refusing to restore over current content.`);
      for (const p of toReplace) {
        p.action = 'failed';
        results.failed.push({ label: label(p.item.kind, p.item.name), error: `backup failed: ${err.message}` });
      }
    }
  }

  const { manifest } = await readManifest(locations.skillsDir);
  let manifestDirty = false;
  for (const p of planned) {
    if (p.action === 'already') {
      results.already.push(label(p.item.kind, p.item.name));
      ctx.out(`already matches the backup: ${label(p.item.kind, p.item.name)}`);
      continue;
    }
    if (p.action !== 'restore' && p.action !== 'replace') continue;
    try {
      await mkdir(path.dirname(p.destAbs), { recursive: true });
      const staged = path.join(
        path.dirname(p.destAbs),
        `.skillforge-tmp-restore-${p.entry.destName}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
      );
      try {
        if (p.item.isSymlink) {
          await symlink(await readlink(p.paths.storedDir), staged);
        } else if (p.item.isDirectory) {
          await cp(p.paths.storedDir, staged, { recursive: true });
        } else {
          await cp(p.paths.storedFile, staged);
        }
      } catch (err) {
        await rm(staged, { recursive: true, force: true }).catch(() => {});
        throw err;
      }
      await swapIn(staged, p.destAbs);
      // Refresh the manifest entry from the backup's record.
      if (manifest && p.item.entry) {
        const entry = { ...p.item.entry, updated: nowIso() };
        const restored = await hashInstalled({
          kind: p.item.kind,
          name: p.item.name,
          destAbs: p.destAbs,
          destName: p.entry.destName,
        });
        if (restored) entry.files = Object.fromEntries(restored);
        manifest.items[entryKey(p.item.kind, p.item.name)] = entry;
        manifestDirty = true;
      }
      results.restored.push(label(p.item.kind, p.item.name));
      ctx.out(`restored ${label(p.item.kind, p.item.name)} → ${p.destAbs}`);
    } catch (err) {
      results.failed.push({ label: label(p.item.kind, p.item.name), error: err.message });
      ctx.err(`failed: ${label(p.item.kind, p.item.name)} — ${err.message}`);
    }
  }
  if (manifestDirty) {
    await mkdir(locations.skillsDir, { recursive: true });
    await writeManifest(locations.skillsDir, manifest);
  }
  printSummary(ctx, results);
  return results.failed.length ? 1 : 0;
}
