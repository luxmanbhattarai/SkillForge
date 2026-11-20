// manifest.mjs — the installed-skills manifest.
//
// The manifest lives in the target skills directory as
// `.skillforge-manifest.json`. It is a plain file, not a directory,
// so agents scanning the skills directory for skill subdirectories
// (or for SKILL.md files) ignore it; it cannot be mistaken for a
// skill. It records every item this installer placed — skills,
// agents, and workflows — with the hashes needed to tell user edits
// apart from library updates.
//
// Manifest entry (per item):
//   kind        'skill' | 'agent' | 'workflow'
//   name        item name
//   version     library version the item was installed from
//   source      repo-relative library path (skills/<cat>/<name> or
//               agents/<name>.md or workflows/<name>.md)
//   sourceHash  fingerprint of the library source at install time
//               (tree fingerprint for skills, file hash for single
//               files) — compared against the current library to
//               detect updates
//   installed   ISO timestamp of first install
//   updated     ISO timestamp of last install/update
//   method      'copy' | 'link'
//   root        install root, relative to the manifest's directory
//               ('.' for the skills dir itself; e.g. '../agents'
//               for a sibling agents dir). Relative so the manifest
//               survives the project or home directory moving.
//   destName    directory or file name within the root
//   files       { relpath: 'sha256:<hex>' } for installed content,
//               paths relative to the install root — compared
//               against disk to detect user edits
//
// A missing manifest means "nothing installed through this tool
// (or an install predating manifests)": commands fall back to
// scanning directories. A corrupt manifest is reported by doctor
// and refused by update/uninstall (which cannot know what is safe
// to touch); install still works and rewrites it.

import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_NAME = '.skillforge-manifest.json';
export const MANIFEST_FORMAT = 1;

export function newManifest({ target, scope, toolVersion }) {
  return {
    format: MANIFEST_FORMAT,
    tool: 'skillforge-installer',
    toolVersion: toolVersion || '0.0.0',
    target: target || null,
    scope: scope || null,
    items: {},
  };
}

export function manifestPath(skillsDir) {
  return path.join(skillsDir, MANIFEST_NAME);
}

export function entryKey(kind, name) {
  return `${kind}:${name}`;
}

/**
 * Read the manifest from a skills directory.
 * Returns { manifest } on success, { manifest: null, error } where
 * error is 'missing' or 'corrupt: <detail>'.
 */
export async function readManifest(skillsDir) {
  const file = manifestPath(skillsDir);
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    // ENOENT: no manifest. ENOTDIR: the skills path is blocked by a
    // file, so no manifest can exist there either.
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return { manifest: null, error: 'missing' };
    return { manifest: null, error: `unreadable: ${err.message}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { manifest: null, error: `corrupt: invalid JSON (${err.message})` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.items || typeof parsed.items !== 'object') {
    return { manifest: null, error: 'corrupt: not a SkillForge manifest (missing items object)' };
  }
  if (parsed.format !== MANIFEST_FORMAT) {
    return { manifest: null, error: `corrupt: unsupported manifest format ${parsed.format}` };
  }
  return { manifest: parsed, error: null };
}

/** Write the manifest atomically (temp file + rename). */
export async function writeManifest(skillsDir, manifest) {
  const file = manifestPath(skillsDir);
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await writeFile(tmp, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    await rename(tmp, file);
  } finally {
    await rm(tmp, { force: true }).catch(() => {});
  }
}

/** Resolve a manifest entry's install root to an absolute path. */
export function entryRoot(skillsDir, entry) {
  if (!entry.root || entry.root === '.') return skillsDir;
  if (path.isAbsolute(entry.root)) return entry.root;
  return path.resolve(skillsDir, entry.root);
}

/** Absolute destination path of a manifest entry. */
export function entryDest(skillsDir, entry) {
  return path.join(entryRoot(skillsDir, entry), entry.destName);
}

/** Sort manifest items for stable output: skills, agents, workflows; then name. */
export function sortedEntries(manifest) {
  const order = { skill: 0, agent: 1, workflow: 2 };
  return Object.values(manifest.items || {}).sort(
    (a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
}
