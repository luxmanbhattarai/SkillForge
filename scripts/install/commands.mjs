// commands.mjs — the installer's subcommands: install, update, list,
// doctor, validate, uninstall, restore.
//
// Every command returns a process exit code (0 ok, 1 operational
// failure, 2 usage error via UsageError). All output goes through
// ctx.out / ctx.err so tests can capture it.

import { mkdir, readFile, readdir, readlink, rename, rm } from 'node:fs/promises';
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
import {
  backupItemPaths,
  createBackup,
  listBackups,
  readBackup,
  recoverBackupRecord,
  stageBackupItem,
  backupsDir,
  CorruptBackupError,
  InvalidBackupError,
} from './backups.mjs';
import { withLock, LOCK_NAME } from './lock.mjs';
import { expandProfiles, loadProfiles, resolveSelection, splitList } from './library.mjs';
import { splitFrontmatter, parseFrontmatter } from '../lib/frontmatter.mjs';
import {
  InstallerError,
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
  relativeRoot,
  resolveLocations,
  rollbackFromBackup,
  scanFiles,
  scanSkillDirs,
  stageItem,
  swapIn,
  targetLocations,
  verifyStaged,
  withLockHint,
} from './installer.mjs';
import { rmRecursiveOptions, sameLinkTarget } from './links.mjs';

function label(kind, name) {
  return kind === 'skill' ? name : `${name} (${kind})`;
}

function hasSelectors(ctx) {
  return [ctx.skills, ctx.categories, ctx.agents, ctx.workflows].some((v) => v && v.length);
}

// --profile/--bundle (Finding 2): expand the named profiles into
// the selection's skill/agent/workflow arrays (union with any
// other selectors — resolveSelection deduplicates). Unknown
// profiles are a usage error naming the known profiles. Returns
// a new selection object; the caller's ctx is not mutated.
// Profiles are NOT part of hasSelectors: restore ignores them,
// and adding them there would make `restore --profile x` filter
// to an empty selection instead of ignoring the flag.
async function expandProfileSelectors(ctx, selection) {
  const names = splitList(ctx.profiles);
  if (!names.length) return selection;
  const profiles = await loadProfiles(ctx.library);
  const { expanded, errors } = expandProfiles(profiles, names);
  if (errors.length) throw new UsageError(errors.join('; '));
  return {
    ...selection,
    skills: [...(selection.skills || []), ...expanded.skills],
    agents: [...(selection.agents || []), ...expanded.agents],
    workflows: [...(selection.workflows || []), ...expanded.workflows],
  };
}

// Needs-correction status filter (Finding 3). The library record
// carries `status` (from registry/skills.json, which derives it
// from sources/verification-status.json) and `statusNote` (the
// audit note, from verification-status.json directly).
//
// Semantics, by default (no --allow-needs-correction):
//   * a skill named EXPLICITLY via --skill/--skills is REFUSED
//     per item: the refusal is recorded in results.refused with a
//     clear stderr error naming the skill, its status, and the
//     opt-in flag; the rest of the run installs normally, and the
//     run exits 1 at the end. A refusal never aborts the run —
//     the engine's rule is "one bad item never aborts the run"
//     (A2-03), and a policy refusal is still one bad item. (An
//     earlier version threw here and aborted the whole run; it
//     was changed to per-item refusal for exactly this reason.)
//   * a needs-correction skill reached only through a BULK
//     selector (--skills all, --category, --profile) is warned
//     about on stderr and skipped; the rest of the run proceeds
//     (exit 0 — a bulk skip is a warning, not a failure).
// With --allow-needs-correction, all of them install, with a
// one-line stderr note naming them (the flag is the explicit
// acknowledgment; the note keeps the run auditable).
// Fixture libraries (SKILLFORGE_ROOT) carry no status unless
// their registry says so; skills without a status are unaffected
// (status null is not needs-correction).
// Returns { items, refused }: items is the installable subset,
// refused is [{ label, error }] in the results.refused shape,
// already reported to stderr in the `refused: <label> — <error>`
// format the engine uses for conflict refusals.
function applyStatusFilter(ctx, items, explicitSkillNames) {
  const bad = items.filter((i) => i.kind === 'skill' && i.status === 'needs-correction');
  if (!bad.length) return { items, refused: [] };
  if (ctx.allowNeedsCorrection) {
    ctx.err(
      `note: installing ${bad.length} needs-correction skill${bad.length === 1 ? '' : 's'} (--allow-needs-correction): ` +
        bad.map((i) => i.name).join(', '),
    );
    return { items, refused: [] };
  }
  const refused = [];
  const kept = [];
  for (const i of items) {
    if (i.kind !== 'skill' || i.status !== 'needs-correction') {
      kept.push(i);
      continue;
    }
    if (explicitSkillNames.has(i.name)) {
      const note = i.statusNote ? `: ${i.statusNote.slice(0, 200)}${i.statusNote.length > 200 ? '…' : ''}` : '';
      const error =
        `needs-correction${note}. These skills have known errors (see sources/verification-status.json). ` +
        'Re-run with --allow-needs-correction to install it anyway.';
      refused.push({ label: i.name, error });
      ctx.err(`refused: ${i.name} — ${error}`);
    } else {
      const note = i.statusNote ? ` — ${i.statusNote.slice(0, 160)}${i.statusNote.length > 160 ? '…' : ''}` : '';
      ctx.err(`warning: skipping skill '${i.name}' (needs-correction${note}); re-run with --allow-needs-correction to install it anyway.`);
    }
  }
  return { items: kept, refused };
}

// Agentic-SEO warnings (findings S-08/S-09, specified by the Stage
// B security review). The 'seo' skill is an upstream import whose
// own docs/scripts are unsafe in two ways the installer cannot fix
// (upstream is verbatim): its README and install.sh document a
// curl-piped-to-shell install, and its broken_links.py disables
// TLS verification. Detection is by the item/entry `source`
// prefix (the upstream vendor), not by the name 'seo' alone.
const AGENTIC_SEO_SOURCE_PREFIX = 'skills/upstream/agentic-seo/';

export function isAgenticSeoSource(source) {
  return typeof source === 'string' && source.startsWith(AGENTIC_SEO_SOURCE_PREFIX);
}

// The S-08 text quotes the upstream curl-pipe command as the thing
// to avoid — the quote IS the warning, so the line carries the
// scanner's line-level ignore (the same treatment as the exception
// for docs/AGENTIC-SEO-SAFE-INSTALL.md, which quotes the same
// command). Keep the S-08 text on ONE line: the ignore applies
// per line, and a line break inside the quote would also trip the
// scanner's multi-line curl-pipe pattern.
export const AGENTIC_SEO_WARNINGS = [
  `WARNING: the 'seo' skill (upstream: agentic-seo) documents an unsafe install method — a curl-piped-to-shell install from the main branch — in its README and install.sh. This install used SkillForge's vendored copy and is safe. Never run the upstream 'curl | bash' command. See docs/AGENTIC-SEO-SAFE-INSTALL.md (finding S-08).`, // security-scan:ignore CMD-01
  `WARNING: the 'seo' skill's broken_links.py script disables TLS certificate verification on its link checks. A 'healthy' verdict does not prove the real host answered — treat external-link results as advisory and re-check important links with a verifying client. See docs/AGENTIC-SEO-SAFE-INSTALL.md (finding S-09).`,
];

// Mutating commands run under the install lock (lock.mjs) so two
// concurrent runs cannot lose manifest entries or delete each
// other's staging. Dry runs and restore --list take no lock: they
// change nothing. When the lock file cannot be created at all
// (e.g. a read-only skills dir), the run proceeds unheld with a
// warning and ctx.lockHeld === false, which tells
// executeInstallRun to skip stale-staging cleanup — without the
// lock, another live run's staging could be deleted. Such a run
// cannot write the manifest anyway, so it cannot corrupt shared
// state; it fails at its first real write with the underlying
// error, exactly as before.
async function withInstallLock(ctx, locations, command, fn) {
  if (ctx.dryRun || ctx.listBackups) return fn();
  return withLock(locations.skillsDir, { command }, (lock) => {
    ctx.lockHeld = lock.held;
    if (!lock.held) {
      ctx.err(
        `warning: could not create the installer lock in ${locations.skillsDir} (${lock.error.message}); ` +
          'proceeding without concurrency protection.',
      );
    }
    return fn();
  });
}

// Read the manifest for a mutating command. A missing manifest
// starts fresh; a corrupt one is quarantined (renamed aside, never
// deleted) and started fresh, with a loud warning — and entries
// for installed items identical to the library are rebuilt from a
// disk scan, so items outside this run do not become orphans
// (A-09b). If the corrupt original cannot be moved aside, the run
// fails closed (A-09a): a fresh manifest must never overwrite the
// corrupt original in place.
async function loadManifestForWrite(locations, ctx) {
  const { manifest, error } = await readManifest(locations.skillsDir);
  if (manifest) return { manifest, wasCorrupt: false };
  const fresh = () =>
    newManifest({
      target: locations.targetDef ? locations.targetDef.id : null,
      scope: locations.scope,
      toolVersion: ctx.library.version,
    });
  if (error === 'missing') {
    return { manifest: fresh(), wasCorrupt: false };
  }
  const bad = manifestPath(locations.skillsDir);
  const quarantine = `${bad}.corrupt-${Date.now()}`;
  try {
    await rename(bad, quarantine);
  } catch (err) {
    throw new InstallerError(
      `the manifest at ${bad} is ${error} and could not be moved aside (${withLockHint(err, 'moving the corrupt manifest aside').message}); ` +
        'refusing to overwrite it. Move or delete it manually and re-run.',
    );
  }
  const rebuilt = fresh();
  const adopted = await rebuildEntriesFromDisk(ctx.library, locations);
  for (const [key, entry] of adopted) rebuilt.items[key] = entry;
  ctx.err(
    `warning: the manifest at ${bad} is ${error}; it was moved to ${quarantine} and a fresh manifest will be written` +
      (adopted.size
        ? ` (rebuilt ${adopted.size} entr${adopted.size === 1 ? 'y' : 'ies'} from installed content identical to the library; items that differ from the library are not in the new manifest).`
        : '. Previously installed items are still on disk; re-running install adopts them.'),
  );
  return { manifest: rebuilt, wasCorrupt: true };
}

/**
 * Rebuild manifest entries by scanning the disk (A-09b): for every
 * installed item identical to the library, build the entry the
 * adopt path would build. Items that differ from the library, are
 * not in the library, or cannot be verified are skipped, never
 * guessed. Returns a Map of manifest key → entry.
 */
async function rebuildEntriesFromDisk(library, locations) {
  const out = new Map();
  const adopt = async (item, planned) => {
    try {
      if (planned.method === 'link') {
        if (!(await linkPointsAtSource(planned))) return;
        out.set(entryKey(item.kind, item.name), await buildEntry(planned, { files: new Map() }));
        return;
      }
      const current = await hashInstalled(planned);
      if (current && mapsEqual(current, planned.plannedFiles)) {
        out.set(entryKey(item.kind, item.name), await buildEntry(planned, { files: current }));
      }
    } catch {
      // Unverifiable (unreadable, wrong shape): skip, never guess.
    }
  };
  for (const s of await scanSkillDirs(locations.skillsDir)) {
    const item = library.skills.get(s.name);
    if (!item) continue;
    try {
      const planned = await computePlanned(library, item, locations, { link: s.isSymlink });
      await adopt(item, planned);
    } catch {
      // No planned form (e.g. unreadable library source): skip.
    }
  }
  for (const [dir, byKind] of [
    [locations.agentsDir, library.agents],
    [locations.workflowsDir, library.workflows],
  ]) {
    if (!dir) continue;
    for (const f of await scanFiles(dir)) {
      const name = f.name.replace(/\.(md|toml)$/, '');
      const item = byKind.get(name);
      if (!item) continue;
      try {
        const planned = await computePlanned(library, item, locations, { link: false });
        await adopt(item, planned);
      } catch {
        // No location for this kind on this target, or unreadable
        // source: skip.
      }
    }
  }
  return out;
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
  // Agentic-SEO warnings (S-08/S-09): a dry run is the careful
  // path — warn here too, so a user who previews first learns
  // about the unsafe upstream docs before the real run. Only for
  // items the run would leave installed (install/update/
  // overwrite/already); skipped/refused items warn about nothing.
  // Once per run, like the execute-phase warning.
  if (
    plannedItems.some(
      (p) =>
        ['install', 'update', 'overwrite', 'already'].includes(p.action) &&
        isAgenticSeoSource(p.item?.source),
    )
  ) {
    for (const w of AGENTIC_SEO_WARNINGS) ctx.err(w);
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

// Clean stale staging leftovers for every root of this install
// location (A-30): skills, agents, and workflows — not just the
// roots of items being written, and on uninstall/restore as well
// as install/update, even when there is nothing to write. Only
// staged leftovers are removed; trash dirs
// (`.skillforge-tmp-old-*`) are never deleted (see
// cleanStaleStaging). Runs only under the lock: without it,
// another live run's staging could be deleted.
async function cleanAllStaleStaging(ctx, locations) {
  if (ctx.dryRun || ctx.lockHeld === false) return;
  for (const root of [locations.skillsDir, locations.agentsDir, locations.workflowsDir]) {
    if (!root) continue;
    const { removed, skipped } = await cleanStaleStaging(root);
    for (const name of removed) ctx.err(`note: removed leftover staging directory ${name} from an interrupted run`);
    // Skipped leftovers failed with a Windows file-lock error
    // (Stage D): harmless, and the next run retries them.
    for (const s of skipped) {
      ctx.err(
        `note: could not remove leftover staging directory ${s.name} (${s.error}); it will be retried on the next run`,
      );
    }
  }
}

// Execute install/update/overwrite actions: one backup for all
// replacements, then per-item atomic install with verification.
// Mutates the manifest (caller writes it when dirty). Returns results.
async function executeInstallRun(ctx, locations, plannedItems, manifest, { command, manifestDirty: initialDirty = false }) {
  const results = { installed: [], updated: [], already: [], skipped: [], refused: [], failed: [] };
  const toWrite = plannedItems.filter((p) => ['install', 'update', 'overwrite'].includes(p.action));

  await cleanAllStaleStaging(ctx, locations);

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

  // A repaired manifest (quarantined + rebuilt from disk) starts
  // dirty: the run must write it even when every item is already
  // installed, or the quarantine would leave no manifest at all.
  let manifestDirty = initialDirty;
  // Agentic-SEO warnings (S-08/S-09): emitted once per run, when
  // the first item from that upstream vendor is installed/updated
  // — or found already installed (below): a re-run that finds the
  // seo skill in place used to warn about nothing, so users who
  // installed before the warnings existed never saw them.
  let warnedAgenticSeo = false;
  // Persist incrementally (A-09): a kill mid-run leaves the items
  // installed so far recorded, instead of losing the whole run.
  // Best-effort — a failed incremental write only warns; the final
  // write below is authoritative and still reports failures.
  const persistManifest = async () => {
    try {
      await mkdir(locations.skillsDir, { recursive: true });
      await writeManifest(locations.skillsDir, manifest);
    } catch (err) {
      ctx.err(`warning: could not write the manifest yet (${err.message}); it will be retried at the end of the run`);
    }
  };
  for (const p of executable) {
    const verb = p.action === 'install' ? 'installed' : 'updated';
    try {
      const staged = await stageItem(p);
      // Verify BEFORE the swap (A-06): a copy that differs from
      // the library must never reach the destination.
      const preProblem = await verifyStaged(p, staged);
      if (preProblem) {
        await rm(staged, { recursive: true, force: true }).catch(() => {});
        throw new InstallerError(`staged content failed verification (${preProblem}); nothing was installed`);
      }
      await swapIn(staged, p.destAbs);
      // Post-swap verification stays as a second layer; on
      // mismatch, roll back (restore from the pre-replacement
      // backup, or remove a fresh install) — never leave
      // unverified content live with stale manifest hashes.
      const postProblem = await verifyStaged(p, p.destAbs);
      if (postProblem) {
        let rollbackNote;
        try {
          rollbackNote = await rollbackFromBackup(p, backup);
        } catch (rollbackErr) {
          throw new InstallerError(
            `installed content failed verification after install (${postProblem}); rollback also failed (${rollbackErr.message})` +
              (backup ? `; restore backup ${backup.id} manually` : ''),
          );
        }
        throw new InstallerError(
          `installed content failed verification after install (${postProblem}); ${rollbackNote}`,
        );
      }
      const files = p.method === 'link' ? new Map() : await hashInstalled(p);
      manifest.items[entryKey(p.kind, p.name)] = await buildEntry(p, { files: files || new Map() });
      manifestDirty = true;
      await persistManifest();
      if (!warnedAgenticSeo && isAgenticSeoSource(p.item.source)) {
        warnedAgenticSeo = true;
        for (const w of AGENTIC_SEO_WARNINGS) ctx.err(w);
      }
      results[p.action === 'install' ? 'installed' : 'updated'].push(label(p.kind, p.name));
      // In link mode, say which form was actually created: on
      // Windows without symlink privilege it is a junction, not a
      // symlink (A-11); stageItem records it on the planned item.
      const linkNote =
        p.method === 'link' ? (p.linkType === 'junction' ? ' (junction)' : ' (symlink)') : '';
      ctx.out(`${verb} ${label(p.kind, p.name)} → ${p.destAbs}${linkNote}`);
    } catch (err) {
      results.failed.push({ label: label(p.kind, p.name), error: err.message });
      ctx.err(`failed: ${label(p.kind, p.name)} — ${err.message}`);
    }
  }

  for (const p of plannedItems) {
    if (p.action === 'already') {
      // Agentic-SEO warnings (S-08/S-09): a run that leaves the
      // seo skill installed warns even when nothing was written
      // this run — otherwise a re-run, or an update with nothing
      // to do, silently skips the warning. Same once-per-run flag
      // as the install/update warning above.
      if (!warnedAgenticSeo && isAgenticSeoSource(p.item.source)) {
        warnedAgenticSeo = true;
        for (const w of AGENTIC_SEO_WARNINGS) ctx.err(w);
      }
      if (p.adopt) {
        try {
          const files = p.method === 'link' ? new Map() : await hashInstalled(p);
          manifest.items[entryKey(p.kind, p.name)] = await buildEntry(p, { files: files || new Map() });
          manifestDirty = true;
          await persistManifest();
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

// A profile can bundle agents/workflows a target has no location
// for (Muse documents neither). An explicitly requested --agent /
// --workflow still fails loudly — computePlanned throws a
// UsageError for it, aborting the run. But a profile member is
// not an explicit request: refusing the whole profile install
// over it would make profiles unusable on that target, so members
// are skipped with a warning and the rest installs. This applies
// only when a target IS given: a bare --dest install keeps the
// old rule — profiles include agents, agents need --target, and
// the run errors (see test/installer-profiles.test.mjs and
// docs/PROFILES.md). Returns the items to install.
function dropUnsupportedProfileMembers(ctx, locations, items) {
  if (!locations.targetDef) return items;
  const explicitAgents = new Set(splitList(ctx.agents));
  const explicitWorkflows = new Set(splitList(ctx.workflows));
  const label = locations.targetDef.label;
  const kept = [];
  for (const item of items) {
    if (item.kind === 'agent' && !locations.agentsDir && !explicitAgents.has(item.name)) {
      ctx.err(
        `warning: skipping agent '${item.name}' (profile member): ${label} has no documented agents location.`,
      );
      continue;
    }
    if (item.kind === 'workflow' && !locations.workflowsDir && !explicitWorkflows.has(item.name)) {
      ctx.err(
        `warning: skipping workflow '${item.name}' (profile member): ${label} has no documented workflow location.`,
      );
      continue;
    }
    kept.push(item);
  }
  return kept;
}

function noteLinkScope(ctx, items, locations) {
  if (ctx.link && items.some((i) => i.kind !== 'skill')) {
    ctx.out('Note: --link applies to skills; agents and workflows are always copied (their installed form is a target-format conversion of the library file).');
  }
  // Muse skills are a format conversion too (SKILL.md without
  // frontmatter + a generated skill.yaml), so --link cannot apply
  // to them either: they are always copied. Say so plainly —
  // silently copying after the user asked for links would be a
  // surprise, and failing the run would punish a harmless flag.
  if (ctx.link && locations && locations.targetDef && locations.targetDef.skillFormat === 'muse') {
    ctx.out('Note: --link does not apply to Muse installs: skills are converted to Muse format (SKILL.md + skill.yaml), so they are always copied.');
  }
}

// ---------------------------------------------------------------- install

export async function cmdInstall(ctx) {
  const locations = resolveLocations(ctx);
  return withInstallLock(ctx, locations, 'install', () => runInstall(ctx, locations));
}

async function runInstall(ctx, locations) {
  const baseSelection =
    hasSelectors(ctx) || (ctx.profiles && ctx.profiles.length) ? ctx : { ...ctx, skills: ['all'] };
  const selection = await expandProfileSelectors(ctx, baseSelection);
  const { items, errors } = resolveSelection(ctx.library, selection);
  if (errors.length) throw new UsageError(errors.join('; '));
  // Needs-correction filter (Finding 3): explicit --skill names
  // are refused per item (A2-03 — the rest still install, and the
  // run exits 1 at the end); bulk selections warn and skip.
  // 'all' is bulk, never explicit.
  const explicitSkillNames = new Set(splitList(ctx.skills).filter((n) => n !== 'all'));
  const { items: itemsToInstall, refused } = applyStatusFilter(ctx, items, explicitSkillNames);
  const installable = dropUnsupportedProfileMembers(ctx, locations, itemsToInstall);
  if (!installable.length) {
    if (refused.length) {
      // Everything requested was refused: nothing to install, and
      // the refusal (already on stderr) makes the run fail.
      printSummary(ctx, { installed: [], updated: [], already: [], skipped: [], refused, failed: [] });
      return 1;
    }
    ctx.out('Nothing to install.');
    return 0;
  }
  warnDeprecatedWorkflows(ctx, installable, locations);
  noteLinkScope(ctx, installable, locations);

  // A2-03: planning is per-item fault-isolated. computePlanned
  // throws on a missing skill source dir, an unreadable agent
  // file, or a '"""' in an agent body — and one such item used to
  // abort the whole run, contradicting the engine's stated rule
  // ("one bad item never aborts the run", installer.mjs). A
  // planning failure is now recorded like an execute-phase
  // failure: the rest install, and the failure is listed in the
  // summary with a non-zero exit code.
  const plannedItems = [];
  const planningFailures = [];
  for (const item of installable) {
    try {
      plannedItems.push(await computePlanned(ctx.library, item, locations, ctx));
    } catch (err) {
      // A UsageError is a problem with the invocation itself (e.g.
      // agent install without --target, or a workflow for a target
      // with no workflow location), not a bad library item: it
      // aborts the run with exit 2, as before the isolation. Only
      // data failures (missing/unreadable sources) are per-item.
      if (err instanceof UsageError) throw err;
      planningFailures.push({ label: label(item.kind, item.name), error: err.message });
      ctx.err(`failed: ${label(item.kind, item.name)} — ${err.message}`);
    }
  }
  // Dry runs change nothing (A-08): classify against a read-only
  // manifest read. A corrupt manifest is reported, not quarantined
  // — quarantining renames the file, which is a mutation.
  // (update/uninstall/restore dry runs already read the manifest
  // read-only; verified, not assumed.)
  let manifest;
  let wasCorrupt = false;
  if (ctx.dryRun) {
    const read = await readManifest(locations.skillsDir);
    manifest = read.manifest;
    if (!manifest && read.error !== 'missing') {
      ctx.err(
        `note: the manifest at ${manifestPath(locations.skillsDir)} is ${read.error}; ` +
          'dry run proceeds as if no manifest existed',
      );
    }
  } else {
    ({ manifest, wasCorrupt } = await loadManifestForWrite(locations, ctx));
  }
  for (const p of plannedItems) {
    const c = await classifyInstall(p, manifest);
    p.action = c.action;
    p.reason = c.reason;
    p.adopt = c.adopt;
  }
  if (!ctx.dryRun) await resolveConflicts(ctx, plannedItems);
  if (ctx.dryRun) {
    printPlan(ctx, plannedItems, locations);
    if (planningFailures.length || refused.length) {
      printSummary(ctx, { installed: [], updated: [], already: [], skipped: [], refused, failed: planningFailures });
      return 1;
    }
    return 0;
  }
  const results = await executeInstallRun(ctx, locations, plannedItems, manifest, { command: 'install', manifestDirty: wasCorrupt });
  results.failed.push(...planningFailures);
  results.refused.push(...refused);
  printSummary(ctx, results);
  if (results.installed.length || results.updated.length) {
    ctx.out('Restart the agent (or reload the project) so it picks up the new skills.');
  }
  return results.failed.length || results.refused.length ? 1 : 0;
}

// ---------------------------------------------------------------- update

export async function cmdUpdate(ctx) {
  const locations = resolveLocations(ctx);
  return withInstallLock(ctx, locations, 'update', () => runUpdate(ctx, locations));
}

async function runUpdate(ctx, locations) {
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
  if (hasSelectors(ctx) || (ctx.profiles && ctx.profiles.length)) {
    const skillNames = new Set(splitList(ctx.skills));
    const agentNames = new Set(splitList(ctx.agents));
    const workflowNames = new Set(splitList(ctx.workflows));
    const categories = splitList(ctx.categories);
    // --profile/--bundle (Finding 2): profile members join the
    // wanted set (union with the other selectors). Kept separate
    // from the typed name sets so the unknown-name check below
    // never complains about a profile member that simply is not
    // installed here.
    let profileSkills = new Set();
    let profileAgents = new Set();
    let profileWorkflows = new Set();
    if (ctx.profiles && ctx.profiles.length) {
      const profiles = await loadProfiles(ctx.library);
      const { expanded, errors } = expandProfiles(profiles, splitList(ctx.profiles));
      if (errors.length) throw new UsageError(errors.join('; '));
      profileSkills = new Set(expanded.skills);
      profileAgents = new Set(expanded.agents);
      profileWorkflows = new Set(expanded.workflows);
    }
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
        if (skillNames.has(e.name) || profileSkills.has(e.name)) return true;
        const rec = ctx.library.skills.get(e.name);
        return rec && categorySet.has(rec.category);
      }
      if (e.kind === 'agent') return agentNames.has('all') || agentNames.has(e.name) || profileAgents.has(e.name);
      return workflowNames.has('all') || workflowNames.has(e.name) || profileWorkflows.has(e.name);
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

  // Needs-correction filter (Finding 3): update never re-installs
  // a known-bad skill by default — it warns and skips it. (No
  // refusal here, unlike install: the content is already
  // installed, so refusing would protect nothing.)
  // --allow-needs-correction updates them, with a one-line note.
  const statusSkipped = [];
  const needsCorrectionEntries = entries.filter(
    (e) => e.kind === 'skill' && ctx.library.skills.get(e.name)?.status === 'needs-correction',
  );
  if (needsCorrectionEntries.length) {
    if (ctx.allowNeedsCorrection) {
      ctx.err(
        `note: updating ${needsCorrectionEntries.length} needs-correction skill${needsCorrectionEntries.length === 1 ? '' : 's'} (--allow-needs-correction): ` +
          needsCorrectionEntries.map((e) => e.name).join(', '),
      );
    } else {
      for (const e of needsCorrectionEntries) {
        const rec = ctx.library.skills.get(e.name);
        const note = rec?.statusNote ? ` — ${rec.statusNote.slice(0, 160)}${rec.statusNote.length > 160 ? '…' : ''}` : '';
        statusSkipped.push(
          `${label(e.kind, e.name)} (needs-correction${note}; re-run with --allow-needs-correction to update it anyway)`,
        );
        ctx.err(
          `warning: skipping update of skill '${e.name}' (needs-correction${note}); re-run with --allow-needs-correction to update it anyway.`,
        );
      }
      entries = entries.filter(
        (e) => !(e.kind === 'skill' && ctx.library.skills.get(e.name)?.status === 'needs-correction'),
      );
    }
  }

  const plannedItems = [];
  const planningFailures = [];
  const skipped = [];
  skipped.push(...statusSkipped);
  // The manifest records the target the items were installed
  // for; a Muse install must re-render SKILL.md + skill.yaml on
  // update, not copy verbatim (see computePlannedFromEntry).
  const targetId = manifest.target || locations.targetDef?.id || null;
  for (const entry of entries) {
    const byKind =
      entry.kind === 'skill' ? ctx.library.skills : entry.kind === 'agent' ? ctx.library.agents : ctx.library.workflows;
    const item = byKind.get(entry.name);
    if (!item) {
      skipped.push(`${label(entry.kind, entry.name)} (no longer in the library; left in place)`);
      continue;
    }
    // A2-03: per-item fault isolation, as in runInstall — a
    // missing/unreadable library source for one entry must not
    // abort the update of the rest. UsageErrors (an invocation
    // problem, not a data failure) still abort the run, as in
    // runInstall.
    try {
      plannedItems.push(await computePlannedFromEntry(ctx.library, item, entry, locations.skillsDir, targetId));
    } catch (err) {
      if (err instanceof UsageError) throw err;
      planningFailures.push({ label: label(entry.kind, entry.name), error: err.message });
      ctx.err(`failed: ${label(entry.kind, entry.name)} — ${err.message}`);
    }
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
    if (planningFailures.length) {
      printSummary(ctx, { installed: [], updated: [], already: [], skipped: [], refused: [], failed: planningFailures });
      return 1;
    }
    return 0;
  }
  const results = await executeInstallRun(ctx, locations, plannedItems, manifest, { command: 'update' });
  results.failed.push(...planningFailures);
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
    if (name.startsWith('.skillforge-tmp-old-')) {
      // Trash, not staging: it may hold the only copy of replaced
      // content, so it is reported, never auto-deleted (A-30).
      problems.push({ level: 'warn', message: `leftover trash directory ${name} from an interrupted install; it may hold the only copy of replaced content — check before deleting (the installer never deletes it)` });
    } else if (name.startsWith('.skillforge-tmp-')) {
      problems.push({ level: 'warn', message: `leftover staging directory ${name} from an interrupted install; safe to delete` });
    }
  }

  // A lingering lock file: a previous run may have been killed
  // (doctor takes no lock itself, so any lock file here is either
  // a concurrent run's or a stale one).
  if (dirEntries.includes(LOCK_NAME)) {
    problems.push({
      level: 'warn',
      message: `installer lock file ${LOCK_NAME} is present (another run may be in progress, or a previous run was killed; mutating commands refuse to run until it is gone or stale enough to take over)`,
    });
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
      // Agentic-SEO warnings (S-08/S-09): an installed item from
      // the agentic-seo upstream vendor carries the unsafe-install
      // docs and the TLS-blind link checker.
      if (isAgenticSeoSource(entry.source)) {
        for (const w of AGENTIC_SEO_WARNINGS) problems.push({ level: 'warn', message: w });
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
        } else if (!sameLinkTarget(resolved, path.join(ctx.library.root, entry.source))) {
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
      // One target, every scope it supports (Muse has no
      // project-level location, so only its user location).
      locationsList = targetLocations(ctx, ctx.target);
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
  // Muse installs carry skill.yaml beside a frontmatter-free
  // SKILL.md: the name and description live in the yaml, not in
  // frontmatter. A directory with skill.yaml is validated in
  // that shape (detected by the file's presence, so it works for
  // manifest entries and disk scans alike).
  let yamlText = null;
  try {
    yamlText = await readFile(path.join(dir, 'skill.yaml'), 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') return [`skill.yaml is unreadable (${err.message})`];
  }
  if (yamlText !== null) {
    const unquote = (v) => {
      const t = v.trim();
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
      return t;
    };
    const field = (key) => {
      for (const line of yamlText.split('\n')) {
        const m = line.match(new RegExp(`^${key}:\\s*(.*)$`));
        if (m) return unquote(m[1]);
      }
      return null;
    };
    const yamlName = field('name');
    if (!yamlName) problems.push('skill.yaml has no name');
    else if (yamlName !== name) problems.push(`skill.yaml name '${yamlName}' does not match directory '${name}'`);
    if (!field('description')) problems.push('skill.yaml has no description');
    return problems;
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
  return withInstallLock(ctx, locations, 'uninstall', () => runUninstall(ctx, locations));
}

async function runUninstall(ctx, locations) {
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

  if (!ctx.all && !hasSelectors(ctx) && !(ctx.profiles && ctx.profiles.length)) {
    throw new UsageError('Nothing selected: pass --skill <name>, --agent <name>, --workflow <name>, --category <name>, --profile <name>, or --all.');
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
    // --profile/--bundle (Finding 2): uninstall the profile's
    // members (union with the other selectors).
    if (ctx.profiles && ctx.profiles.length) {
      const profiles = await loadProfiles(ctx.library);
      const { expanded, errors } = expandProfiles(profiles, splitList(ctx.profiles));
      if (errors.length) throw new UsageError(errors.join('; '));
      for (const n of expanded.skills) wanted.push({ kind: 'skill', name: n });
      for (const n of expanded.agents) wanted.push({ kind: 'agent', name: n });
      for (const n of expanded.workflows) wanted.push({ kind: 'workflow', name: n });
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
  // Each planned item also carries a structured `needsBackup` flag
  // (A-15): whether removing it must back it up first — modified
  // and foreign content, and content no longer in the library
  // (A-14), are backed up; unmodified manifest-matching content
  // is not (it is identical to the library, so reinstalling
  // restores it). The flag is set here, at classification time,
  // and survives the action changes in the resolve loop below —
  // it is never derived from reason text, so a wording edit
  // cannot silently disable backups.
  const inLibrary = (kind, name) => {
    const byKind =
      kind === 'skill' ? ctx.library.skills : kind === 'agent' ? ctx.library.agents : ctx.library.workflows;
    return byKind.has(name);
  };
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
      planned.push({ ...t, destAbs, action: 'absent', reason: 'not installed', needsBackup: false });
      continue;
    }
    if (!t.entry) {
      planned.push({ ...t, destAbs, action: 'foreign', reason: 'not recorded in the manifest (installed by another tool?)', needsBackup: true });
      continue;
    }
    if (t.entry.method === 'link') {
      // A5-02: a link entry must actually BE a link. If the
      // destination is real content — the user replaced the link
      // with their own directory, or a crafted git-traveled
      // manifest claims 'link' for a path holding user content —
      // removing it without a backup would silently delete user
      // data. Classify it as modified with a backup instead, like
      // any other unexpected content. Doctor already flags this
      // shape as a failure; uninstall must not ignore its own
      // diagnostic. (On Windows a junction reports as a symlink
      // via lstat, so junction installs still take the fast path.)
      if (!st.isSymbolicLink()) {
        planned.push({
          ...t,
          destAbs,
          action: 'modified',
          reason: 'recorded as a symlink install but is a real file/directory on disk (may contain your content)',
          needsBackup: true,
        });
        continue;
      }
      planned.push({ ...t, destAbs, action: 'remove', reason: 'symlink recorded in the manifest', needsBackup: !inLibrary(t.kind, t.name) });
      continue;
    }
    const current = await hashInstalled({ kind: t.kind, name: t.name, destAbs, destName: t.entry.destName });
    const recorded = new Map(Object.entries(t.entry.files || {}));
    if (current && mapsEqual(current, recorded)) {
      // An item no longer in the library is backed up before
      // removal (A-14): the installed copy may be the only one
      // left, and without a backup it would be gone for good.
      const gone = !inLibrary(t.kind, t.name);
      planned.push({
        ...t,
        destAbs,
        action: 'remove',
        reason: gone ? 'matches the manifest; no longer in the library (a backup is made first)' : 'matches the manifest',
        needsBackup: gone,
      });
    } else {
      planned.push({ ...t, destAbs, action: 'modified', reason: 'installed content differs from the manifest (may contain your edits)', needsBackup: true });
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

  await cleanAllStaleStaging(ctx, locations);

  const results = { removed: [], skipped: [], refused: [], failed: [], installed: [], updated: [], already: [] };
  const toRemove = planned.filter((p) => p.action === 'remove');
  // Backup selection reads the structured classification flag
  // (A-15), not reason text: the resolve loop above rewrites
  // actions and appends to reasons, but needsBackup was fixed at
  // classification time.
  const needBackup = planned.filter((p) => p.action === 'remove' && p.needsBackup);
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
      await rm(p.destAbs, rmRecursiveOptions());
      delete manifestObj.items[entryKey(p.kind, p.name)];
      manifestDirty = true;
      results.removed.push(label(p.kind, p.name));
      ctx.out(`removed ${label(p.kind, p.name)}`);
    } catch (err) {
      const hinted = withLockHint(err, `removing ${label(p.kind, p.name)}`);
      results.failed.push({ label: label(p.kind, p.name), error: hinted.message });
      ctx.err(`failed: ${label(p.kind, p.name)} — ${hinted.message}`);
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
  return withInstallLock(ctx, locations, 'restore', () => runRestore(ctx, locations));
}

async function runRestore(ctx, locations) {
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
        ctx.out(`  ${b.id}  (corrupt backup directory — backup.json unreadable; restore will attempt recovery from items/)`);
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
  } catch (err) {
    // Invalid input (a traversal id or a crafted backup.json) gets
    // its own message; anything else means "no such backup".
    if (err instanceof InvalidBackupError) throw new UsageError(err.message);
    if (err instanceof CorruptBackupError) {
      // backup.json is corrupt or missing, but the items/ content
      // may still be intact: reconstruct the record from the
      // items/ directory names (A-16c).
      record = await recoverBackupRecord(locations.skillsDir, id);
      if (!record || !record.items.length) {
        throw new UsageError(
          `Backup '${id}' is corrupt (${err.message}) and nothing could be recovered from its items/ directory.`,
        );
      }
      // Fill in restore destinations for the recovered items:
      // skills go to the skills dir; agents/workflows to the
      // target's locations — unknown without --target, so those
      // items are skipped with a warning.
      const unplaced = [];
      for (const item of record.items) {
        if (item.kind === 'skill') {
          item.root = '.';
          item.destName = item.name;
        } else if (item.kind === 'agent' && locations.agentsDir) {
          item.root = relativeRoot(locations.skillsDir, locations.agentsDir);
          item.destName = item.fileName || `${item.name}.md`;
        } else if (item.kind === 'workflow' && locations.workflowsDir) {
          item.root = relativeRoot(locations.skillsDir, locations.workflowsDir);
          item.destName = item.fileName || `${item.name}.md`;
        } else {
          unplaced.push(item);
        }
      }
      record.items = record.items.filter((i) => !unplaced.includes(i));
      if (!record.items.length) {
        throw new UsageError(
          `Backup '${id}' is corrupt (${err.message}); its items could be recovered from items/ but none can be placed ` +
            '(agents/workflows need --target to locate their directories).',
        );
      }
      ctx.err(
        `warning: backup '${id}' is corrupt (${err.message}); recovered ${record.items.length} item(s) from its items/ directory` +
          (unplaced.length
            ? `; skipped ${unplaced.map((i) => label(i.kind, i.name)).join(', ')} (no location known without --target).`
            : '.'),
      );
    } else {
      const available = backups.map((b) => b.id);
      throw new UsageError(
        `No backup '${id}' in ${backupsDir(locations.skillsDir)}.` +
          (available.length ? ` Available: ${available.join(', ')}` : ' There are no backups here.'),
      );
    }
  }

  let items = record.items;
  if (hasSelectors(ctx)) {
    const skillNames = new Set(splitList(ctx.skills));
    const agentNames = new Set(splitList(ctx.agents));
    const workflowNames = new Set(splitList(ctx.workflows));
    // A2-09: --category used to be silently ignored here (the
    // filter matched names only, yet hasSelectors counts
    // categories), so `restore <id> --category seo` always
    // reported "No items match". Categories now resolve to skill
    // names through the library, as in runUpdate; an unknown
    // category is a usage error, not a silent no-op.
    const categories = splitList(ctx.categories);
    for (const cat of categories) {
      if (cat !== 'all' && !ctx.library.categories.has(cat)) {
        throw new UsageError(`unknown category '${cat}' (known: ${[...ctx.library.categories].sort().join(', ')})`);
      }
    }
    const categorySet = new Set(categories);
    items = items.filter((i) => {
      if (i.kind === 'skill') {
        if (skillNames.has(i.name)) return true;
        if (categorySet.has('all')) return true;
        const rec = ctx.library.skills.get(i.name);
        return rec && categorySet.has(rec.category);
      }
      if (i.kind === 'agent') return agentNames.has(i.name);
      return workflowNames.has(i.name);
    });
    if (!items.length) {
      ctx.out('No items in this backup match the selection.');
      return 0;
    }
  }

  // Classify: missing on disk | identical | replace.
  // The entry was validated by readBackup; entryRoot re-checks it
  // defensively, so a crafted backup.json can never steer the
  // restore destination outside the install locations.
  const planned = [];
  for (const item of items) {
    const entry = item.entry || {
      kind: item.kind,
      name: item.name,
      root: item.root || '.',
      destName: item.destName || item.name,
    };
    const rootDir = entryRoot(locations.skillsDir, entry);
    const destAbs = path.join(rootDir, entry.destName);
    const paths = backupItemPaths(record, item);
    const storedHash = await hashBackupContent(item, paths);
    const liveHash = await hashLiveContent(item, destAbs);
    if (liveHash === null) planned.push({ item, entry, destAbs, paths, storedHash, action: 'restore', reason: 'not present' });
    else if (storedHash !== null && storedHash === liveHash) planned.push({ item, entry, destAbs, paths, storedHash, action: 'already', reason: 'already matches the backup' });
    else planned.push({ item, entry, destAbs, paths, storedHash, action: 'replace', reason: 'current content differs from the backup' });
  }

  // Agentic-SEO detection for a planned restore item (S-08/S-09):
  // the backup entry carries the library `source` when the backup
  // was taken from a manifest; recovered backups carry no entry,
  // so fall back to the library record by name (the same lookup
  // the manifest repair below uses).
  const isAgenticSeoRestore = (p) => {
    if (isAgenticSeoSource(p.entry?.source)) return true;
    const byKind =
      p.item.kind === 'skill' ? ctx.library.skills : p.item.kind === 'agent' ? ctx.library.agents : ctx.library.workflows;
    const libItem = byKind.get(p.item.name);
    return !!libItem && isAgenticSeoSource(libItem.source);
  };

  if (ctx.dryRun) {
    ctx.out(`Dry run — nothing will change. Backup: ${record.id} (${record.created || 'date unknown'})`);
    for (const p of planned) {
      if (p.action === 'restore') ctx.out(`would restore ${label(p.item.kind, p.item.name)} → ${p.destAbs}`);
      else if (p.action === 'replace') ctx.out(`would restore ${label(p.item.kind, p.item.name)} → ${p.destAbs} (current content is backed up first)`);
      else ctx.out(`already matches the backup: ${label(p.item.kind, p.item.name)}`);
    }
    // Agentic-SEO warnings (S-08/S-09): a restore re-installs the
    // seo skill's unsafe upstream docs and TLS-blind link checker,
    // so restore warns like install/update do — on dry-run and on
    // the real run, once per run. Before this fix, restore warned
    // about nothing on either path.
    if (planned.some((p) => ['restore', 'replace', 'already'].includes(p.action) && isAgenticSeoRestore(p))) {
      for (const w of AGENTIC_SEO_WARNINGS) ctx.err(w);
    }
    return 0;
  }

  await cleanAllStaleStaging(ctx, locations);

  const results = { restored: [], already: [], skipped: [], refused: [], failed: [], installed: [], updated: [], removed: [] };
  // Agentic-SEO warnings (S-08/S-09): emitted once per run, when
  // the first agentic-seo item is restored — or found already
  // matching the backup (below). Same once-per-run flag as the
  // install/update warning; a failed restore warns about nothing
  // (nothing was (re)installed by this run).
  let warnedAgenticSeo = false;
  const toReplace = planned.filter((p) => p.action === 'replace');
  let preBackup = null;
  if (toReplace.length) {
    // Restoring over current content backs the current content up
    // first, so a restore is always reversible — and so a failed
    // post-swap verification can roll back to it (A-16a).
    try {
      preBackup = await createBackup(locations.skillsDir, {
        target: locations.targetDef ? locations.targetDef.id : null,
        scope: locations.scope,
        reason: 'pre-restore',
        command: 'restore',
        items: toReplace.map((p) => ({ kind: p.item.kind, name: p.item.name, destAbs: p.destAbs, entry: p.entry })),
      });
      if (preBackup) ctx.out(`Current content backed up as ${preBackup.id} before restoring.`);
    } catch (err) {
      ctx.err(`Backup failed (${err.message}); refusing to restore over current content.`);
      for (const p of toReplace) {
        p.action = 'failed';
        results.failed.push({ label: label(p.item.kind, p.item.name), error: `backup failed: ${err.message}` });
      }
    }
  }

  // Create/repair the manifest (A-16b): restored items must not
  // become orphans. A quarantined manifest must be replaced even
  // if the loop below adds nothing, so a repaired manifest starts
  // dirty. If the manifest cannot be repaired (quarantine failed),
  // restore the content anyway and leave the items unrecorded —
  // doctor reports them as orphans.
  let manifest = null;
  let manifestDirty = false;
  try {
    const loaded = await loadManifestForWrite(locations, ctx);
    manifest = loaded.manifest;
    manifestDirty = loaded.wasCorrupt;
  } catch (err) {
    ctx.err(`warning: could not repair the manifest (${err.message}); restored items will not be recorded in it.`);
  }
  for (const p of planned) {
    if (p.action === 'already') {
      if (!warnedAgenticSeo && isAgenticSeoRestore(p)) {
        warnedAgenticSeo = true;
        for (const w of AGENTIC_SEO_WARNINGS) ctx.err(w);
      }
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
      await stageBackupItem(record, p.item, staged);
      await swapIn(staged, p.destAbs);
      // Post-swap verification (A-16a): the restored content must
      // match the backup's stored hash. On mismatch, roll back
      // from the pre-restore backup (or remove a fresh restore)
      // and report failed — never leave bad content live.
      const liveHash = await hashLiveContent(p.item, p.destAbs);
      if (p.storedHash !== null && liveHash !== p.storedHash) {
        let rollbackNote;
        try {
          rollbackNote = await rollbackFromBackup(
            { kind: p.item.kind, name: p.item.name, destAbs: p.destAbs },
            preBackup,
          );
        } catch (rollbackErr) {
          throw new InstallerError(
            `restored content does not match the backup (verification failed); rollback also failed (${rollbackErr.message})` +
              (preBackup ? `; restore backup ${preBackup.id} manually` : ''),
          );
        }
        throw new InstallerError(
          `restored content does not match the backup (verification failed); ${rollbackNote}`,
        );
      }
      // Refresh the manifest entry from the backup's record, or
      // build one from the library when the backup has none
      // (e.g. a recovered backup).
      if (manifest) {
        if (p.item.entry) {
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
        } else {
          const byKind =
            p.item.kind === 'skill' ? ctx.library.skills : p.item.kind === 'agent' ? ctx.library.agents : ctx.library.workflows;
          const libItem = byKind.get(p.item.name);
          if (!libItem) {
            ctx.err(
              `warning: ${label(p.item.kind, p.item.name)} is not in the library and its backup has no manifest entry; ` +
                'it is restored but not recorded in the manifest',
            );
          } else {
            try {
              const plannedEntry = await computePlannedFromEntry(
                ctx.library,
                libItem,
                p.entry,
                locations.skillsDir,
                manifest?.target || locations.targetDef?.id || null,
              );
              if (p.item.isSymlink) plannedEntry.method = 'link';
              const restored = plannedEntry.method === 'link' ? new Map() : await hashInstalled(plannedEntry);
              manifest.items[entryKey(p.item.kind, p.item.name)] = await buildEntry(plannedEntry, {
                files: restored || new Map(),
              });
              manifestDirty = true;
            } catch (entryErr) {
              ctx.err(
                `warning: could not record ${label(p.item.kind, p.item.name)} in the manifest (${entryErr.message}); ` +
                  'it is restored but unrecorded',
              );
            }
          }
        }
      }
      results.restored.push(label(p.item.kind, p.item.name));
      if (!warnedAgenticSeo && isAgenticSeoRestore(p)) {
        warnedAgenticSeo = true;
        for (const w of AGENTIC_SEO_WARNINGS) ctx.err(w);
      }
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
