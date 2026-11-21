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

import { cp, mkdir, readdir, readFile, readlink, symlink, writeFile, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import { validateEntryPaths, validatePathSegment } from './manifest.mjs';

export const BACKUPS_DIR_NAME = '.skillforge-backups';

/** Thrown when a backup id or backup.json fails validation (A-03). */
export class InvalidBackupError extends Error {}

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
 */
export async function createBackup(skillsDir, { target, scope, reason, command, items }) {
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

  const id = backupId();
  const dir = path.join(backupsDir(skillsDir), id);
  const itemsDir = path.join(dir, 'items');
  await mkdir(itemsDir, { recursive: true });
  const records = [];
  for (let i = 0; i < existing.length; i++) {
    const item = existing[i];
    const storedAs = `${i}-${item.kind}-${item.name}`;
    const dst = path.join(itemsDir, storedAs);
    const st = await lstat(item.destAbs);
    if (st.isSymbolicLink()) {
      // Back up a symlink by recreating it (a copy would resolve it).
      await symlink(await readlink(item.destAbs), dst);
    } else if (st.isDirectory()) {
      await cp(item.destAbs, dst, { recursive: true });
    } else {
      await mkdir(dst, { recursive: true });
      await cp(item.destAbs, path.join(dst, path.basename(item.destAbs)));
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
      out.push({ ...record, dir });
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
 * pass the same entry validation as a manifest entry. Returns null
 * when valid, else a human-readable problem.
 */
export function validateBackupRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return 'backup record is not an object';
  }
  if (!Array.isArray(record.items)) return 'backup record has no items array';
  for (const item of record.items) {
    if (!item || typeof item !== 'object') return 'backup item is not an object';
    const what = `backup item '${item.name || '?'}'`;
    const storedProblem = validatePathSegment(item.storedAs, 'storedAs');
    if (storedProblem) return `${what}: ${storedProblem}`;
    if (item.fileName !== null && item.fileName !== undefined) {
      const fileProblem = validatePathSegment(item.fileName, 'fileName');
      if (fileProblem) return `${what}: ${fileProblem}`;
    }
    const entry = item.entry || { root: item.root || '.', destName: item.destName || item.name };
    const entryProblem = validateEntryPaths(entry);
    if (entryProblem) return `${what}: ${entryProblem}`;
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
  const raw = await readFile(path.join(dir, 'backup.json'), 'utf8');
  const record = JSON.parse(raw);
  const problem = validateBackupRecord(record);
  if (problem) throw new InvalidBackupError(`Backup '${id}' is invalid: ${problem}.`);
  return { ...record, dir };
}

/** Remove a whole backup directory (used to roll back a failed restore). */
export async function removeBackupDir(dir) {
  await rm(dir, { recursive: true, force: true });
}
