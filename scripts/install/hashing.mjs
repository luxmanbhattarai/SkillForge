// hashing.mjs — sha256 file and tree hashing for the installer.
//
// Hashes are how the installer tells the difference between "the user
// edited this", "the library changed this", and "nothing changed":
//   * manifest.files records the hash of every installed file.
//   * manifest.sourceHash is a fingerprint of the library source an
//     item was installed from.
// Comparing installed files against the manifest detects user edits;
// comparing the current library fingerprint against the recorded one
// detects library updates. Both comparisons are needed to decide
// whether an install is a no-op, a clean update, or a conflict.

import { createHash } from 'node:crypto';
import { readdir, readFile, lstat, readlink } from 'node:fs/promises';
import path from 'node:path';

export function sha256Hex(bufferOrString) {
  return createHash('sha256').update(bufferOrString).digest('hex');
}

export function hashPrefix(hex) {
  return `sha256:${hex}`;
}

export async function hashFile(absPath) {
  const data = await readFile(absPath);
  return hashPrefix(sha256Hex(data));
}

/**
 * Hash every file under `dir` recursively. Returns a Map of
 * posix-style relative paths to `sha256:<hex>` hashes. Symlinked
 * files are recorded as `link:<target>` instead of being followed,
 * so a dangling symlink is visible rather than a crash.
 */
export async function hashTree(dir) {
  const out = new Map();
  async function walk(current, rel) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const abs = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        out.set(relPath, `link:${await readlink(abs)}`);
      } else if (entry.isDirectory()) {
        await walk(abs, relPath);
      } else if (entry.isFile()) {
        out.set(relPath, await hashFile(abs));
      }
      // Anything else (sockets, fifos, devices) is ignored: skills
      // never contain them, and hashing them could block.
    }
  }
  await walk(dir, '');
  return out;
}

/**
 * A single fingerprint for a whole tree: the sha256 of the sorted
 * `path:hash` lines. Two trees with the same files and contents
 * produce the same fingerprint.
 */
export function treeFingerprint(treeMap) {
  const lines = [...treeMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([p, h]) => `${p}:${h}`);
  return hashPrefix(sha256Hex(lines.join('\n')));
}

/** Compare two file-hash maps. Returns { same, added, removed, changed }. */
export function diffFileMaps(a, b) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const [p, h] of a) {
    if (!b.has(p)) removed.push(p);
    else if (b.get(p) !== h) changed.push(p);
  }
  for (const p of b.keys()) {
    if (!a.has(p)) added.push(p);
  }
  return { same: added.length === 0 && removed.length === 0 && changed.length === 0, added, removed, changed };
}
