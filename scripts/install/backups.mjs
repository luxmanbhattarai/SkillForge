// backups.mjs — backup-before-replacement and restore.
//
// Before the installer replaces or removes ANY existing content, it
// copies that content into a timestamped backup directory. Backups
// live in a SIBLING of the skills directory —
// `<parent>/.skillforge-backups/<timestamp>-<id>/` — deliberately NOT
// inside the skills directory: some agents (Cursor) walk the skills
// root recursively and would pick up the SKILL.md files inside a
// backup as live skills. A sibling directory is never scanned.
//
// Each backup directory holds:
//   backup.json   metadata (id, date, target, scope, reason, and one
//                 record per backed-up item, including the full
//                 manifest-entry data needed to restore it and to
//                 repair the manifest afterwards)
//   items/<n>-<kind>-<name>/   the backed-up content (a skill
//                 directory, or a single agent/workflow file stored
//                 as a one-file directory for uniform handling)
//
// Restores are themselves safe: restoring over existing content
// first backs the current content up (reason 'pre-restore'), so a
// restore can always be undone by restoring the newer backup.

import { cp, mkdir, readdir, readFile, readlink, writeFile, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import { validateEntryPaths, validatePathSegment } from './manifest.mjs';
import { createLink, rmRecursiveOptions } from './links.mjs';

export const BACKUPS_DIR_NAME = '.skillforge-backups';

/** Thrown when a backup id or backup.json fails validation (A-03). */
export class InvalidBackupError extends Error {}

/**
 * Thrown when backup.json is missing or unparseable (A-16c). This
 * is corruption, not a crafted record: the backup's items/ content
 * may still be recoverable (see recoverBackupRecord). A record
 * that parses but fails validation is an InvalidBackupError, never
 * this — crafted records are rejected, not recovered.
 */
export class CorruptBackupError extends Error {}

/** Backups live next to the skills directory, never inside it. */
export function backupsDir(skillsDir) {
  return path.join(path.dirname(skillsDir), BACKUPS_DIR_NAME);
}

export function backupId(date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}`;
}

/**
 * Create a backup of existing items.
 * `items` is an array of { kind, name, destAbs, entry } where destAbs
 * is the absolute path of the existing content and entry (optional)
 * is its manifest entry. Returns the backup record, or null when
 * there was nothing to back up.
 * `fsOps` ({ symlink, platform }) is passed through to link
 * creation so tests can fault-inject the Windows junction fallback.
 */
export async function createBackup(skillsDir, { target, scope, reason, command, items }, fsOps = {}) {
  const existing = [];
  for (const item of items) {
    try {
      await lstat(item.destAbs);
      existing.push(item);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      // Already gone: nothing to back up for this item.
    }
  }
  if (!existing.length) return null;

  // fsOps.cp injects the copy function (same seam as fsOps.symlink):
  // tests fail a copy mid-backup through it. The previous failure
  // injection — a Unix socket file cp cannot copy — cannot be
  // created on Windows (first real Windows CI run).
  const copy = fsOps.cp ?? cp;
  const id = backupId();
  const dir = path.join(backupsDir(skillsDir), id);
  const itemsDir = path.join(dir, 'items');
  try {
    await mkdir(itemsDir, { recursive: true });
    const records = [];
    for (let i = 0; i < existing.length; i++) {
      const item = existing[i];
      const storedAs = `${i}-${item.kind}-${item.name}`;
      const dst = path.join(itemsDir, storedAs);
      const st = await lstat(item.destAbs);
      if (st.isSymbolicLink()) {
        // Back up a symlink by recreating it (a copy would resolve it).
        // The link type comes from the item kind — skills are
        // directories, agents/workflows are files. Passing no type
        // would make Node guess from the target, which defaults to
        // a file link when the target is missing or unreadable (a
        // broken directory link would be backed up as a broken file
        // link) and can never produce a junction; createLink also
        // retries a denied directory link as a junction on Windows
        // (A-11), so backing up a link install works without
        // symlink privilege.
        await createLink(await readlink(item.destAbs), dst, {
          kind: item.kind,
          platform: fsOps.platform,
          symlinkFn: fsOps.symlink,
        });
      } else if (st.isDirectory()) {
        await copy(item.destAbs, dst, { recursive: true });
      } else {
        await mkdir(dst, { recursive: true });
        await copy(item.destAbs, path.join(dst, path.basename(item.destAbs)));
      }
      records.push({
        kind: item.kind,
        name: item.name,
        storedAs,
        isSymlink: st.isSymbolicLink(),
        isDirectory: st.isDirectory(),
        fileName: st.isFile() ? path.basename(item.destAbs) : null,
        root: item.entry ? item.entry.root : '.',
        destName: item.entry ? item.entry.destName : item.name,
        entry: item.entry || null,
      });
    }
    const record = {
      id,
      created: new Date().toISOString(),
      tool: 'skillforge-installer',
      target: target || null,
      scope: scope || null,
      reason: reason || 'replacement',
      command: command || null,
      items: records,
    };
    await writeFile(path.join(dir, 'backup.json'), JSON.stringify(record, null, 2) + '\n', 'utf8');
    return { ...record, dir };
  } catch (err) {
    // A failed backup must not leave a partial directory behind
    // (A-16d): it would linger as a "corrupt" backup entry. The
    // directory is freshly created with a unique id, so removing
    // it can never touch another backup.
    await rm(dir, rmRecursiveOptions()).catch(() => {});
    throw err;
  }
}

/** List backups newest first. Corrupt backup dirs are reported, not hidden. */
export async function listBackups(skillsDir) {
  const base = backupsDir(skillsDir);
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return [];
    throw err;
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(base, entry.name);
    try {
      const record = JSON.parse(await readFile(path.join(dir, 'backup.json'), 'utf8'));
      // A2-05: a record that parses but has no items array (e.g.
      // `{}`) is corrupt too — the old code pushed it as-is and
      // the human `restore --list` path crashed on b.items.map().
      // Report it in the same corrupt shape as the catch branch.
      if (!record || typeof record !== 'object' || Array.isArray(record) || !Array.isArray(record.items)) {
        out.push({ id: entry.name, dir, corrupt: true, created: null, items: [] });
      } else {
        out.push({ ...record, dir });
      }
    } catch {
      out.push({ id: entry.name, dir, corrupt: true, created: null, items: [] });
    }
  }
  out.sort((a, b) => (a.created || '') < (b.created || '') ? 1 : -1);
  return out;
}

/**
 * Validate a parsed backup.json record. Backup directories travel
 * via git like manifests, so every path-forming field is untrusted:
 * storedAs/fileName must be single segments (they are joined under
 * the backup dir) and each item's restore destination (root /
 * destName, from the embedded manifest entry when present) must
 * pass the same entry validation as a manifest entry. The
 * effective entry must also name the backup item itself: its
 * destName must match the item's name (skill → name,
 * agent/workflow → name.md/.toml) and an embedded entry's
 * kind/name must match the item's kind/name — otherwise a crafted
 * backup.json could steer a restore to overwrite a DIFFERENT
 * item's location. Returns null when valid, else a human-readable
 * problem.
 */
export function validateBackupRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return 'backup record is not an object';
  }
  if (!Array.isArray(record.items)) return 'backup record has no items array';
  for (const item of record.items) {
    if (!item || typeof item !== 'object') return 'backup item is not an object';
    const what = `backup item '${item.name || '?'}'`;
    if (!['skill', 'agent', 'workflow'].includes(item.kind)) {
      return `${what}: unknown kind ${JSON.stringify(item.kind)}`;
    }
    const nameProblem = validatePathSegment(item.name, 'name');
    if (nameProblem) return `${what}: ${nameProblem}`;
    const storedProblem = validatePathSegment(item.storedAs, 'storedAs');
    if (storedProblem) return `${what}: ${storedProblem}`;
    if (item.fileName !== null && item.fileName !== undefined) {
      const fileProblem = validatePathSegment(item.fileName, 'fileName');
      if (fileProblem) return `${what}: ${fileProblem}`;
    }
    if (item.entry !== null && item.entry !== undefined) {
      if (!item.entry || typeof item.entry !== 'object' || Array.isArray(item.entry)) {
        return `${what}: embedded entry is not an object`;
      }
      if (item.entry.kind !== item.kind || item.entry.name !== item.name) {
        return `${what}: embedded entry is for ${item.entry.kind}:${item.entry.name}, not ${item.kind}:${item.name}`;
      }
    }
    const entry = item.entry || { kind: item.kind, root: item.root || '.', destName: item.destName || item.name };
    const entryProblem = validateEntryPaths(entry);
    if (entryProblem) return `${what}: ${entryProblem}`;
    // The effective entry must name this item itself, not another.
    const expected =
      item.kind === 'skill'
        ? [item.name]
        : [`${item.name}.md`, `${item.name}.toml`];
    if (!expected.includes(entry.destName)) {
      return `${what}: destName ${JSON.stringify(entry.destName)} does not match ${item.kind} name ${JSON.stringify(item.name)}`;
    }
  }
  return null;
}

/**
 * Read one backup by id. The id is user-supplied, so it is
 * validated as a single path segment and must match an existing
 * backup DIRECTORY (lstat, so a planted symlink is rejected) —
 * `restore ../../x` must never read a backup.json outside the
 * backups dir. The record itself is validated before it is
 * returned. Throws InvalidBackupError on invalid input and a
 * plain Error when the backup does not exist.
 */
export async function readBackup(skillsDir, id) {
  const idProblem = validatePathSegment(id, 'backup id');
  if (idProblem) throw new InvalidBackupError(`Invalid backup id ${JSON.stringify(id)}: ${idProblem}.`);
  const dir = path.join(backupsDir(skillsDir), id);
  let st;
  try {
    st = await lstat(dir);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      throw new Error(`No backup '${id}' in ${backupsDir(skillsDir)}.`);
    }
    throw err;
  }
  if (!st.isDirectory()) {
    throw new InvalidBackupError(`Backup '${id}' is not a directory.`);
  }
  let raw;
  try {
    raw = await readFile(path.join(dir, 'backup.json'), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR' || err.code === 'EISDIR') {
      throw new CorruptBackupError(`Backup '${id}' has no readable backup.json (${err.message}).`);
    }
    throw err;
  }
  let record;
  try {
    record = JSON.parse(raw);
  } catch (err) {
    throw new CorruptBackupError(`Backup '${id}' has a corrupt backup.json (${err.message}).`);
  }
  const problem = validateBackupRecord(record);
  if (problem) throw new InvalidBackupError(`Backup '${id}' is invalid: ${problem}.`);
  return { ...record, dir };
}

/**
 * Reconstruct a backup record from the items/ directory when
 * backup.json is corrupt or missing (A-16c). Item directories are
 * named `<n>-<kind>-<name>`; the kind/name come from the name and
 * the shape (symlink / directory / single-file directory) from
 * lstat. Roots and destNames are placeholders ('.', the item name)
 * — the caller fills in the real destinations, since only it knows
 * the target locations (agents/workflows cannot be placed without
 * --target). Items that cannot be reconstructed reliably are
 * skipped. Returns null when nothing is recoverable.
 */
export async function recoverBackupRecord(skillsDir, id) {
  const idProblem = validatePathSegment(id, 'backup id');
  if (idProblem) throw new InvalidBackupError(`Invalid backup id ${JSON.stringify(id)}: ${idProblem}.`);
  const dir = path.join(backupsDir(skillsDir), id);
  let st;
  try {
    st = await lstat(dir);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    throw err;
  }
  if (!st.isDirectory()) return null;
  let entries;
  try {
    entries = await readdir(path.join(dir, 'items'), { withFileTypes: true });
  } catch {
    return null;
  }
  const items = [];
  for (const entry of entries) {
    const m = entry.name.match(/^(\d+)-(skill|agent|workflow)-(.+)$/);
    if (!m) continue;
    const [, , kind, name] = m;
    if (validatePathSegment(name, 'name')) continue;
    const storedDir = path.join(dir, 'items', entry.name);
    let itemSt;
    try {
      itemSt = await lstat(storedDir);
    } catch {
      continue;
    }
    const isSymlink = itemSt.isSymbolicLink();
    const isDirectory = itemSt.isDirectory();
    if (!isSymlink && !isDirectory) continue; // not a shape createBackup produces
    let fileName = null;
    if (!isSymlink && kind !== 'skill') {
      // Agent/workflow content is a single file inside a one-file
      // directory; the file name is the installed destName.
      let children;
      try {
        children = await readdir(storedDir, { withFileTypes: true });
      } catch {
        continue;
      }
      const files = children.filter((c) => c.isFile());
      if (files.length !== 1 || validatePathSegment(files[0].name, 'fileName')) continue;
      // A5-03: the recovered file name must name the item itself
      // (`<name>.md`/`.toml`) — the normal path (validateBackupRecord)
      // enforces destName-must-match-name, but the recovery path
      // used to skip that check, so a crafted `items/0-agent-foo/
      // bar.md` would restore over a DIFFERENT agent's file. A
      // mismatched item is skipped, never recovered.
      if (files[0].name !== `${name}.md` && files[0].name !== `${name}.toml`) continue;
      fileName = files[0].name;
    }
    items.push({
      kind,
      name,
      storedAs: entry.name,
      isSymlink,
      isDirectory,
      fileName,
      root: '.',
      destName: name,
      entry: null,
    });
  }
  if (!items.length) return null;
  items.sort((a, b) => {
    const na = Number(a.storedAs.split('-')[0]);
    const nb = Number(b.storedAs.split('-')[0]);
    return na - nb;
  });
  return {
    id,
    created: null,
    tool: 'skillforge-installer',
    target: null,
    scope: null,
    reason: 'recovered',
    command: null,
    items,
    dir,
    recovered: true,
  };
}

/** Remove a whole backup directory (used to roll back a failed restore). */
export async function removeBackupDir(dir) {
  await rm(dir, rmRecursiveOptions());
}

/**
 * Resolve the stored paths of one backup item. Defensive guard
 * (readBackup already validated the record): storedAs/fileName
 * come from backup.json, so they must be single segments before
 * being joined under the backup dir.
 */
export function backupItemPaths(record, item) {
  const storedProblem = validatePathSegment(item.storedAs, 'storedAs');
  if (storedProblem) throw new InvalidBackupError(`Backup item '${item.name}': ${storedProblem}.`);
  const storedDir = path.join(record.dir, 'items', item.storedAs);
  if (item.fileName) {
    const fileProblem = validatePathSegment(item.fileName, 'fileName');
    if (fileProblem) throw new InvalidBackupError(`Backup item '${item.name}': ${fileProblem}.`);
  }
  return { storedDir, storedFile: item.fileName ? path.join(storedDir, item.fileName) : storedDir };
}

/**
 * Stage one backup item's content at `stagedAbs` (a path that does
 * not exist yet, next to the restore destination). Symlinks are
 * recreated, directories copied, single files copied. Used by
 * restore and by rollback-from-backup. On failure the partial
 * staging path is removed and the error propagates.
 * `fsOps` ({ symlink, platform }) is passed through to link
 * creation so tests can fault-inject the Windows junction fallback.
 */
export async function stageBackupItem(record, item, stagedAbs, fsOps = {}) {
  const { storedDir, storedFile } = backupItemPaths(record, item);
  try {
    if (item.isSymlink) {
      await createLink(await readlink(storedDir), stagedAbs, {
        kind: item.kind,
        platform: fsOps.platform,
        symlinkFn: fsOps.symlink,
      });
    } else if (item.isDirectory) {
      await cp(storedDir, stagedAbs, { recursive: true });
    } else {
      await cp(storedFile, stagedAbs);
    }
  } catch (err) {
    await rm(stagedAbs, rmRecursiveOptions()).catch(() => {});
    throw err;
  }
}
