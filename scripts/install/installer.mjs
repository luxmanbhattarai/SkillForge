// installer.mjs — core install engine: locations, planning, atomic
// execution, and the safety rules that every command shares.
//
// Safety rules (see also docs/INSTALLATION.md):
//   * NEVER silently delete user modifications. An install that
//     would replace content differing from both the library and the
//     manifest is a CONFLICT: interactive runs ask, non-interactive
//     runs refuse with instructions, --force/--backup overwrite
//     after a backup.
//   * Backup before ANY replacement or removal of content that is
//     not byte-identical to what the manifest records.
//   * Never leave a half-copied item: stage in a temp directory next
//     to the destination, then swap it in with two renames. Each
//     rename is atomic on the same filesystem, but the pair is
//     NOT atomic: a kill between the two renames leaves the
//     destination missing (the old content survives in the trash
//     directory and in the backup). If the second rename fails,
//     the old content is put back; if that rollback fails too,
//     both errors are reported and neither copy is deleted.
//   * Idempotent: re-running an install with no changes is a no-op
//     reporting "already installed".
//   * Partial failure: one bad item never aborts the run; results
//     are tracked per item and summarized at the end.

import { cp, lstat, mkdir, readFile, readlink, rename, rm, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { resolveTarget } from './targets.mjs';
import { hashFile, hashTree, treeFingerprint, sha256Hex, hashPrefix } from './hashing.mjs';
import { entryKey, entryRoot } from './manifest.mjs';
import { createBackup, stageBackupItem } from './backups.mjs';
import { installedFileName, renderInstallable, toMarkdownAgent, toMuseSkill, toTomlAgent } from './library.mjs';
import {
  LinkError,
  createLink,
  isWindowsLockError,
  lockErrorMessage,
  rmRecursiveOptions,
  sameLinkTarget,
} from './links.mjs';

export class UsageError extends Error {}
export class InstallerError extends Error {}

/**
 * Attach a Windows file-lock explanation to an error when it is
 * one (EBUSY/EPERM on rename/rm — another program holds a file
 * open). Returns the error unchanged otherwise, so POSIX behavior
 * and non-lock errors are untouched. `platform` is injectable so
 * the Windows wording is unit-testable on any platform.
 */
export function withLockHint(err, action, platform = process.platform) {
  if (!isWindowsLockError(err, platform)) return err;
  return new InstallerError(lockErrorMessage(err, action), { cause: err });
}

export const STALE_PREFIX = '.skillforge-tmp-';

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

export async function lstatOrNull(p) {
  try {
    return await lstat(p);
  } catch (err) {
    // ENOENT: the path does not exist. ENOTDIR: a parent component
    // is not a directory, so the path cannot exist either.
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    throw err;
  }
}

export function mapsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (b.get(k) !== v) return false;
  }
  return true;
}

export function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------- locations

/**
 * Resolve target/scope/dest flags to absolute directories.
 * ctx: { target, scope, dest, home, cwd }.
 * Returns { targetDef, scope, skillsDir, agentsDir, workflowsDir,
 * legacySkillsDir }. Throws UsageError on bad input.
 */
export function resolveLocations(ctx) {
  const scope = ctx.scope || 'project';
  if (!['project', 'user'].includes(scope)) {
    throw new UsageError(`Unknown scope '${ctx.scope}'. Use project or user.`);
  }
  let targetDef = null;
  if (ctx.target) {
    targetDef = resolveTarget(ctx.target);
    if (!targetDef) {
      throw new UsageError(
        `Unknown target '${ctx.target}'. Known: claude-code (claude), cursor, codex, antigravity, muse.`,
      );
    }
  }
  let skillsDir;
  if (ctx.dest) {
    skillsDir = path.resolve(ctx.cwd, ctx.dest);
  } else if (targetDef) {
    const rel = scope === 'user' ? targetDef.skills.user : targetDef.skills.project;
    if (!rel) {
      throw new UsageError(
        `${targetDef.label} has no documented ${scope}-level skills location. ` +
          'Use --scope user or --dest <path> instead.',
      );
    }
    skillsDir = scope === 'user' ? path.join(ctx.home, rel) : path.resolve(ctx.cwd, rel);
  } else {
    throw new UsageError('No install location: pass --target <name> or --dest <path>.');
  }
  const pick = (def) => {
    if (!def) return null;
    const rel = scope === 'user' ? def.user : def.project;
    if (!rel) return null;
    return scope === 'user' ? path.join(ctx.home, rel) : path.resolve(ctx.cwd, rel);
  };
  return {
    targetDef,
    scope,
    skillsDir,
    agentsDir: targetDef ? pick(targetDef.agents) : null,
    workflowsDir: targetDef ? pick(targetDef.workflows) : null,
    legacySkillsDir: targetDef ? pick(targetDef.legacySkills) : null,
  };
}

/** Locations for one target across its supported scopes. */
export function targetLocations(ctx, id) {
  const out = [];
  for (const scope of ['project', 'user']) {
    try {
      out.push(resolveLocations({ ...ctx, target: id, scope, dest: null }));
    } catch (err) {
      // Muse documents no project-level skills location: that
      // pair is not a location, so the sweep skips it. Any
      // other error is real and still throws.
      if (!(err instanceof UsageError)) throw err;
    }
  }
  return out;
}

/** Locations for every target/scope pair (doctor's default sweep). */
export function allLocations(ctx) {
  const out = [];
  for (const id of ['claude-code', 'cursor', 'codex', 'antigravity', 'muse']) {
    out.push(...targetLocations(ctx, id));
  }
  return out;
}

/** True when the target converts skills to Muse format (SKILL.md + skill.yaml). */
export function isMuseTarget(targetDef) {
  return Boolean(targetDef && targetDef.skillFormat === 'muse');
}

/**
 * Fill in the Muse-format plan for a skill: rendered SKILL.md +
 * skill.yaml, and plannedFiles with the rendered hashes overlaid
 * on the library tree. `tree` is the hashTree of the source dir.
 * The install method is forced to 'copy': a conversion cannot
 * be represented by a symlink.
 */
async function planMuseSkill(planned, item, sourceAbs, tree) {
  planned.method = 'copy';
  const text = await readFile(path.join(sourceAbs, 'SKILL.md'), 'utf8');
  const rendered = toMuseSkill(item, text);
  planned.renderedFiles = new Map([
    ['SKILL.md', rendered.skillMd],
    ['skill.yaml', rendered.skillYaml],
  ]);
  planned.plannedFiles = new Map(
    [...tree.entries()].map(([p, h]) => [`${planned.name}/${p}`, h]),
  );
  planned.plannedFiles.set(`${planned.name}/SKILL.md`, hashPrefix(sha256Hex(rendered.skillMd)));
  planned.plannedFiles.set(`${planned.name}/skill.yaml`, hashPrefix(sha256Hex(rendered.skillYaml)));
}

/**
 * Root directory (relative to the skills dir) for a manifest entry.
 * Stored with forward slashes: path.relative uses the platform
 * separator (a backslash on Windows), but manifest roots travel
 * via git and must resolve on every platform — and Windows path
 * functions accept forward slashes, so '/' is the portable form
 * (Stage D). On POSIX this is a no-op.
 */
export function relativeRoot(skillsDir, rootDir) {
  if (rootDir === skillsDir) return '.';
  const rel = path.relative(skillsDir, rootDir);
  if (rel === '') return '.';
  return rel.split(path.sep).join('/');
}

// ---------------------------------------------------------------- planning

/**
 * Compute everything needed to install one library item: where it
 * goes, what bytes it should have, and the hashes to compare against.
 * Throws UsageError when the target has no location for the kind
 * (e.g. workflows for Claude Code) — installing an agent/workflow
 * as a skill-shaped directory is never acceptable.
 */
export async function computePlanned(library, item, locations, { link }) {
  const { targetDef } = locations;
  let rootDir;
  let destName;
  if (item.kind === 'skill') {
    rootDir = locations.skillsDir;
    destName = item.name;
  } else if (item.kind === 'agent') {
    if (!targetDef || !locations.agentsDir) {
      throw new UsageError(
        `Cannot install agent '${item.name}': ` +
          (targetDef
            ? `${targetDef.label} has no documented agents directory.`
            : 'agent install needs --target (a --dest on its own has no agents directory).') +
          ' Agents are installed only where the target documents a real agents location.',
      );
    }
    rootDir = locations.agentsDir;
    destName = installedFileName(item, targetDef);
  } else {
    if (!targetDef || !locations.workflowsDir) {
      throw new UsageError(
        `Cannot install workflow '${item.name}': ` +
          (targetDef
            ? `${targetDef.label} documents no workflow install location. Only Antigravity has one ` +
              `(.agents/workflows), and Google has deprecated it — see docs/INSTALLATION.md.`
            : 'workflow install needs --target (a --dest on its own has no workflows directory).') +
          ' Workflows are installed only where the target documents a real workflows location.',
      );
    }
    rootDir = locations.workflowsDir;
    destName = installedFileName(item, targetDef);
  }

  const sourceAbs = path.join(library.root, item.source);
  const planned = {
    item,
    kind: item.kind,
    name: item.name,
    skillsDir: locations.skillsDir,
    rootDir,
    destName,
    destAbs: path.join(rootDir, destName),
    sourceAbs,
    // Agents/workflows are always copied: their installed bytes are
    // a target-format transform of the library file, so a symlink
    // cannot represent them. Skills honour --link — except Muse
    // skills, whose installed bytes are a target-format conversion
    // (SKILL.md + skill.yaml), so they are always copied too (see
    // planMuseSkill).
    method: item.kind === 'skill' && link ? 'link' : 'copy',
    sourceHash: null,
    plannedFiles: null,
    rendered: null,
    manifestEntry: null,
    action: null,
    reason: null,
  };

  if (item.kind === 'skill') {
    const tree = await hashTree(sourceAbs);
    planned.sourceHash = treeFingerprint(tree);
    if (isMuseTarget(targetDef)) {
      await planMuseSkill(planned, item, sourceAbs, tree);
    } else if (planned.method === 'copy') {
      planned.plannedFiles = new Map(
        [...tree.entries()].map(([p, h]) => [`${item.name}/${p}`, h]),
      );
    }
  } else {
    const text = await readFile(sourceAbs, 'utf8');
    planned.sourceHash = await hashFile(sourceAbs);
    planned.rendered = renderInstallable(item, targetDef, text);
    planned.plannedFiles = new Map([[destName, hashPrefix(sha256Hex(planned.rendered))]]);
  }
  return planned;
}

/**
 * Compute a planned item from a manifest entry (used by `update`):
 * the install root and file name come from the entry itself, so
 * update works with --dest alone, without --target. The agent
 * format is inferred from the installed file name (.toml = Codex).
 * `targetId` (the manifest's recorded target, falling back to the
 * invocation's target) decides the skill format: a Muse install
 * re-renders SKILL.md + skill.yaml instead of copying verbatim.
 */
export async function computePlannedFromEntry(library, item, entry, skillsDir, targetId = null) {
  const rootDir = entryRoot(skillsDir, entry);
  const destName = entry.destName;
  const sourceAbs = path.join(library.root, item.source);
  const planned = {
    item,
    kind: item.kind,
    name: item.name,
    skillsDir,
    rootDir,
    destName,
    destAbs: path.join(rootDir, destName),
    sourceAbs,
    method: entry.method === 'link' ? 'link' : 'copy',
    sourceHash: null,
    plannedFiles: null,
    rendered: null,
    manifestEntry: entry,
    action: null,
    reason: null,
  };
  if (item.kind === 'skill') {
    const tree = await hashTree(sourceAbs);
    planned.sourceHash = treeFingerprint(tree);
    const targetDef = targetId ? resolveTarget(targetId) : null;
    if (isMuseTarget(targetDef)) {
      await planMuseSkill(planned, item, sourceAbs, tree);
    } else if (planned.method === 'copy') {
      planned.plannedFiles = new Map(
        [...tree.entries()].map(([p, h]) => [`${item.name}/${p}`, h]),
      );
    }
  } else {
    const text = await readFile(sourceAbs, 'utf8');
    planned.sourceHash = await hashFile(sourceAbs);
    planned.rendered = destName.endsWith('.toml')
      ? toTomlAgent(item.name, text)
      : toMarkdownAgent(item.name, text);
    planned.plannedFiles = new Map([[destName, hashPrefix(sha256Hex(planned.rendered))]]);
  }
  return planned;
}

/** Hash what is currently installed for a planned item (copy mode). */export async function hashInstalled(planned) {
  try {
    if (planned.kind === 'skill') {
      const st = await lstat(planned.destAbs);
      if (!st.isDirectory()) return null;
      const tree = await hashTree(planned.destAbs);
      return new Map([...tree.entries()].map(([p, h]) => [`${planned.name}/${p}`, h]));
    }
    const st = await lstat(planned.destAbs);
    if (!st.isFile()) return null;
    return new Map([[planned.destName, await hashFile(planned.destAbs)]]);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    throw err;
  }
}

/** Does an installed symlink point at the library source? */
export async function linkPointsAtSource(planned) {
  try {
    const target = await readlink(planned.destAbs);
    // sameLinkTarget, not ===: on Windows a junction's readlink
    // result can carry an NT namespace prefix or differ in case
    // from the computed source path (see links.mjs).
    return sameLinkTarget(path.resolve(path.dirname(planned.destAbs), target), planned.sourceAbs);
  } catch {
    return false;
  }
}

/**
 * Classify one item for `install`: install | already | update |
 * conflict. `manifest` may be null (no manifest yet).
 */
export async function classifyInstall(planned, manifest) {
  const entry = manifest ? manifest.items[entryKey(planned.kind, planned.name)] : null;
  planned.manifestEntry = entry || null;
  const st = await lstatOrNull(planned.destAbs);
  if (!st) return { action: 'install', reason: 'not present' };

  if (planned.method === 'link') {
    if (st.isSymbolicLink()) {
      if (await linkPointsAtSource(planned)) {
        return { action: 'already', reason: 'symlink already points at the library', adopt: !entry };
      }
      return { action: 'conflict', reason: 'a symlink already exists here pointing somewhere else' };
    }
    return { action: 'conflict', reason: 'a copied file or directory already exists here' };
  }

  if (st.isSymbolicLink()) {
    return { action: 'conflict', reason: 'a symlink already exists here' };
  }
  const current = await hashInstalled(planned);
  if (!current) {
    return { action: 'conflict', reason: 'existing content has an unexpected shape' };
  }
  if (mapsEqual(current, planned.plannedFiles)) {
    return entry
      ? { action: 'already', reason: 'identical to the library' }
      : { action: 'already', reason: 'identical to the library (not in manifest)', adopt: true };
  }
  if (entry && mapsEqual(current, new Map(Object.entries(entry.files || {})))) {
    return { action: 'update', reason: 'the library changed since this was installed' };
  }
  return {
    action: 'conflict',
    reason: entry
      ? 'the installed copy was modified after install'
      : 'unrelated content already exists here',
  };
}

/**
 * Classify one item for `update`. The manifest entry is required:
 * update only touches what the manifest records.
 */
export async function classifyUpdate(planned, entry) {
  planned.manifestEntry = entry;
  planned.method = entry.method === 'link' ? 'link' : 'copy';
  if (planned.method === 'link') planned.plannedFiles = null;
  const st = await lstatOrNull(planned.destAbs);
  if (!st) return { action: 'install', reason: 'recorded in the manifest but missing on disk' };
  if (planned.method === 'link') {
    if (st.isSymbolicLink() && (await linkPointsAtSource(planned))) {
      return { action: 'already', reason: 'linked; links track the library' };
    }
    if (st.isSymbolicLink()) {
      // A diverged link is a conflict, matching classifyInstall:
      // the user may have deliberately repointed it (e.g. at their
      // own fork), and silently repointing it would destroy that
      // choice. --force repoints it after backing the old link up.
      return { action: 'conflict', reason: 'a symlink already exists here pointing somewhere else' };
    }
    return { action: 'conflict', reason: 'a copied file or directory replaced the link' };
  }
  if (st.isSymbolicLink()) {
    return { action: 'conflict', reason: 'a symlink replaced the installed copy' };
  }
  const current = await hashInstalled(planned);
  if (!current) return { action: 'conflict', reason: 'existing content has an unexpected shape' };
  if (mapsEqual(current, new Map(Object.entries(entry.files || {})))) {
    if (planned.sourceHash !== entry.sourceHash) {
      return { action: 'update', reason: 'the library changed since this was installed' };
    }
    return { action: 'already', reason: 'up to date' };
  }
  return { action: 'conflict', reason: 'the installed copy was modified after install' };
}

// ---------------------------------------------------------------- atomic writes

/**
 * Remove leftover STAGED dirs from interrupted runs.
 * Callers hold the install lock (see lock.mjs), so no other live
 * run has staging here: anything matching the prefix belongs to a
 * dead or interrupted run. Trash dirs (`.skillforge-tmp-old-*`)
 * are NEVER removed (A-30): after a kill between the two renames
 * of swapIn, the trash dir may hold the ONLY copy of the old
 * content — it survives until the user removes it (doctor reports
 * it). Only staged leftovers are deleted, and those are
 * reproducible from the library. Runs that could not acquire the
 * lock skip this cleanup (see commands.mjs).
 *
 * Returns { removed, skipped }: `skipped` holds leftovers whose
 * removal failed with a Windows file-lock error (EBUSY/EPERM) —
 * a locked leftover is harmless and the next run retries it, so
 * it must not abort the run (Stage D). Any other removal failure
 * still throws. On POSIX `skipped` is always empty.
 */
export async function cleanStaleStaging(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return { removed: [], skipped: [] };
    throw err;
  }
  const removed = [];
  const skipped = [];
  for (const entry of entries) {
    if (!entry.name.startsWith(STALE_PREFIX)) continue;
    if (entry.name.startsWith(`${STALE_PREFIX}old-`)) continue; // trash: never auto-deleted
    try {
      await rm(path.join(dir, entry.name), rmRecursiveOptions());
      removed.push(entry.name);
    } catch (err) {
      if (isWindowsLockError(err)) {
        skipped.push({ name: entry.name, error: err.message });
        continue;
      }
      throw err;
    }
  }
  return { removed, skipped };
}

/**
 * Swap staged content into place with two renames. `stagedAbs`
 * must be in the same directory as `destAbs` (same filesystem, so
 * each rename is atomic). This is NOT a single atomic operation:
 * a kill between the two renames leaves the destination missing
 * (the old content is in the trash directory, recoverable via
 * backup). If the second rename fails, the old content is put
 * back; if the rollback itself fails, both errors are reported
 * and NEITHER copy is deleted — the trash and staged paths are in
 * the message for manual recovery.
 *
 * `fsOps` (default: node:fs/promises rename/rm) exists so tests
 * can fault-inject rename failures.
 */
export async function swapIn(stagedAbs, destAbs, fsOps = { rename, rm }) {
  const parent = path.dirname(destAbs);
  const trash = path.join(parent, `${STALE_PREFIX}old-${path.basename(destAbs)}-${process.pid}-${rand()}`);
  const destExists = (await lstatOrNull(destAbs)) !== null;
  if (!destExists) {
    try {
      await fsOps.rename(stagedAbs, destAbs);
    } catch (err) {
      throw withLockHint(err, `moving the staged install into place at ${destAbs}`);
    }
    return;
  }
  try {
    await fsOps.rename(destAbs, trash);
  } catch (err) {
    throw withLockHint(err, `moving the existing install at ${destAbs} aside`);
  }
  try {
    await fsOps.rename(stagedAbs, destAbs);
  } catch (err) {
    // Roll back: put the old content back. The rollback rename is
    // guarded — if it fails too, the old content is in `trash`
    // and the new content is still in `stagedAbs`, and either
    // could be the only copy, so delete neither.
    try {
      await fsOps.rename(trash, destAbs);
    } catch (rollbackErr) {
      throw new InstallerError(
        `swap failed for ${destAbs} (${withLockHint(err, 'moving the staged install into place').message}) and the rollback also failed (${withLockHint(rollbackErr, 'moving the previous install back').message}); ` +
          `the previous content is still in ${trash} and the new content is still in ${stagedAbs} — ` +
          'neither was deleted, restore one of them manually (or restore from a backup)',
        { cause: err },
      );
    }
    await fsOps.rm(stagedAbs, rmRecursiveOptions()).catch(() => {});
    throw withLockHint(err, `moving the staged install into place at ${destAbs}`);
  }
  await fsOps.rm(trash, rmRecursiveOptions()).catch(() => {});
}

/**
 * Verify staged (or installed) content against what was planned
 * (A-06). Called BEFORE the swap, so a copy that differs from the
 * library never reaches the destination, and again after the swap
 * as a second layer. For link mode the symlink must point at the
 * library source; for copies the staged tree/file hashes must
 * match plannedFiles. `planned` needs { kind, name, destName,
 * method, sourceAbs, plannedFiles }. Returns null when the
 * content matches, else a human-readable problem. Exported so
 * tests can check it against crafted staged directories.
 */
export async function verifyStaged(planned, absPath) {
  if (planned.method === 'link') {
    let target;
    try {
      target = await readlink(absPath);
    } catch (err) {
      return `expected a symlink at ${absPath} (${err.message})`;
    }
    // sameLinkTarget, not === (see linkPointsAtSource): a
    // junction's readlink result can carry an NT namespace prefix
    // or differ in case from the computed source path on Windows.
    if (!sameLinkTarget(path.resolve(path.dirname(absPath), target), planned.sourceAbs)) {
      return `symlink at ${absPath} points at ${target}, not the library source`;
    }
    return null;
  }
  if (planned.kind === 'skill') {
    let tree;
    try {
      tree = await hashTree(absPath);
    } catch (err) {
      return `cannot hash staged content at ${absPath} (${err.message})`;
    }
    const staged = new Map([...tree.entries()].map(([p, h]) => [`${planned.name}/${p}`, h]));
    if (!mapsEqual(staged, planned.plannedFiles || new Map())) {
      return 'staged content does not match the library';
    }
    return null;
  }
  let hash;
  try {
    hash = await hashFile(absPath);
  } catch (err) {
    return `cannot hash staged file at ${absPath} (${err.message})`;
  }
  if (hash !== (planned.plannedFiles && planned.plannedFiles.get(planned.destName))) {
    return 'staged content does not match the library';
  }
  return null;
}

/**
 * Roll back a failed install/update/restore (A-06, A-16a): when a
 * post-swap verification fails, the bad content must not stay live
 * with stale manifest hashes. When the run's pre-replacement
 * backup holds this item, its content is staged and swapped back
 * in; otherwise (a fresh install, or a restore of a missing item)
 * the bad install is removed. Returns a note describing what
 * happened. Throws when the rollback itself fails — the caller
 * reports both errors and the backup id for manual recovery.
 * `item` needs { kind, name, destAbs }; `backupRecord` is a
 * createBackup record (or null).
 */
export async function rollbackFromBackup(item, backupRecord) {
  const backedUp = backupRecord
    ? backupRecord.items.find((i) => i.kind === item.kind && i.name === item.name)
    : null;
  if (!backedUp) {
    await rm(item.destAbs, rmRecursiveOptions());
    return 'the bad install was removed (there was no previous content to restore)';
  }
  const staged = path.join(
    path.dirname(item.destAbs),
    `${STALE_PREFIX}rollback-${path.basename(item.destAbs)}-${process.pid}-${rand()}`,
  );
  await stageBackupItem(backupRecord, backedUp, staged);
  await swapIn(staged, item.destAbs);
  return 'the previous content was restored from the backup';
}

/**
 * Stage an item's content next to its destination; returns the staged path.
 * `fsOps` (default: the real fs calls) exists so tests can
 * fault-inject the link creation (see swapIn's fsOps pattern):
 * `{ symlink, platform }` are passed through to createLink, so the
 * Windows junction fallback is drivable on any platform.
 * On success in link mode, `planned.linkType` records which form
 * was actually created ('symlink' | 'junction') for the run log.
 */
export async function stageItem(planned, fsOps = {}) {
  await mkdir(planned.rootDir, { recursive: true });
  const staged = path.join(
    planned.rootDir,
    `${STALE_PREFIX}${planned.destName}-${process.pid}-${rand()}`,
  );
  try {
    if (planned.method === 'link') {
      // Junction fallback (A-11): on Windows, a directory symlink
      // needs Developer Mode or administrator privileges; when it
      // fails with EPERM, createLink retries as a junction, which
      // needs no privilege. File links cannot be junctions, so
      // they keep the clear privilege error.
      planned.linkType = await createLink(planned.sourceAbs, staged, {
        kind: planned.kind,
        platform: fsOps.platform,
        symlinkFn: fsOps.symlink,
        // A fresh install must never create a dangling link: on
        // Windows neither a symlink nor a junction validates the
        // target, so without this a missing source would install
        // "successfully" and fail only at verification time.
        requireTarget: true,
      });
    } else if (planned.kind === 'skill') {
      await cp(planned.sourceAbs, staged, { recursive: true });
      // Muse installs overlay the converted files on the verbatim
      // copy: SKILL.md without frontmatter, plus skill.yaml.
      // Any other files in the skill directory (references/,
      // scripts/, examples/) copy verbatim.
      if (planned.renderedFiles) {
        for (const [rel, content] of planned.renderedFiles) {
          const dest = path.join(staged, rel);
          await mkdir(path.dirname(dest), { recursive: true });
          await writeFile(dest, content, 'utf8');
        }
      }
    } else {
      await writeFile(staged, planned.rendered, 'utf8');
    }
  } catch (err) {
    await rm(staged, rmRecursiveOptions()).catch(() => {});
    if (err instanceof LinkError) {
      // The link error already explains what was tried and why it
      // failed; add the way out (copy instead of linking).
      throw new InstallerError(`${err.message}. Install without --link to copy instead.`, {
        cause: err,
      });
    }
    throw err;
  }
  return staged;
}

/**
 * Back up every item in `plannedItems` whose destination currently
 * exists. Returns the backup record or null. A backup failure is
 * fatal for those items: without a backup, nothing is replaced.
 */
export async function backupReplacements(skillsDir, plannedItems, meta) {
  const doomed = [];
  for (const planned of plannedItems) {
    if ((await lstatOrNull(planned.destAbs)) !== null) {
      doomed.push({
        kind: planned.kind,
        name: planned.name,
        destAbs: planned.destAbs,
        entry: planned.manifestEntry,
      });
    }
  }
  if (!doomed.length) return null;
  return createBackup(skillsDir, { ...meta, items: doomed });
}

/** Build the manifest entry for a successfully installed item. */
export async function buildEntry(planned, { files, method }) {
  const prev = planned.manifestEntry;
  const stamp = nowIso();
  return {
    kind: planned.kind,
    name: planned.name,
    version: planned.item.version,
    source: planned.item.source,
    sourceHash: planned.sourceHash,
    installed: prev ? prev.installed : stamp,
    updated: stamp,
    method: method || planned.method,
    root: relativeRoot(planned.skillsDir, planned.rootDir),
    destName: planned.destName,
    files: Object.fromEntries(files || []),
  };
}

// ---------------------------------------------------------------- scanning

/** Skill directories directly under a skills dir (one level only). */
export async function scanSkillDirs(skillsDir) {
  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return [];
    throw err;
  }
  const out = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = path.join(skillsDir, entry.name);
    const hasSkillMd = (await lstatOrNull(path.join(dir, 'SKILL.md'))) !== null;
    out.push({ name: entry.name, dir, hasSkillMd, isSymlink: entry.isSymbolicLink() });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : 1));
}

/** Files directly under a directory (agents/workflows roots). */
export async function scanFiles(dir) {
  if (!dir) return [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return [];
    throw err;
  }
  return entries
    .filter((e) => (e.isFile() || e.isSymbolicLink()) && !e.name.startsWith('.'))
    .map((e) => ({ name: e.name, file: path.join(dir, e.name), isSymlink: e.isSymbolicLink() }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}
