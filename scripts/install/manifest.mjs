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
//
// A project-scope manifest travels via git, so its entries are
// untrusted input: every entry's root/destName is validated on
// read (see validateEntry), and a manifest with an invalid entry
// counts as corrupt.

import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { TARGETS } from './targets.mjs';

export const MANIFEST_NAME = '.skillforge-manifest.json';
export const MANIFEST_FORMAT = 1;

// Directory names a manifest entry root may legitimately resolve
// to (see targets.mjs): the installer only ever writes skills into
// the skills dir itself ('.') and agents/workflows into a sibling
// agents/workflows directory.
const INSTALL_ROOT_NAMES = new Set(['agents', 'workflows', 'global_workflows']);

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

// ---------------------------------------------------------------- validation
//
// Project-scope manifests travel via git, so a manifest is
// UNTRUSTED INPUT: a crafted entry must never steer uninstall's
// recursive rm or update/restore's writes outside the install
// locations. Every entry is validated on read (readManifest
// treats a manifest with an invalid entry as corrupt) and
// defensively re-checked by entryRoot/entryDest, which throw on
// an invalid entry. Validators return null when valid, else a
// human-readable problem.

/** A value must be a single path segment: no separators, no `..`, no NUL. */
export function validatePathSegment(value, what = 'path') {
  if (typeof value !== 'string' || value === '') return `${what} must be a non-empty string`;
  if (value.includes('\0')) return `${what} must not contain a NUL byte`;
  if (value === '.' || value === '..') return `${what} must not be '${value}'`;
  if (value.includes('/') || value.includes('\\')) {
    return `${what} ${JSON.stringify(value)} must be a single path segment`;
  }
  if (path.isAbsolute(value)) return `${what} ${JSON.stringify(value)} must be relative`;
  return null;
}

/**
 * Tier 1 (exact): the absolute install roots for a manifest whose
 * target/scope are known and whose skills dir is that target's
 * documented skills dir — the skills dir itself plus the target's
 * agents/workflows dirs. Returns null when the tier-1 check does
 * not apply (unknown target/scope, or a custom --dest skills dir).
 */
function allowedRootsFor(target, scope, skillsDir) {
  const def = TARGETS[target];
  if (!def) return null;
  if (scope !== 'project' && scope !== 'user') return null;
  const skillsRel = def.skills[scope];
  if (!skillsRel) return null;
  const skillsSegs = skillsRel.split('/');
  const dirSegs = skillsDir.split(path.sep);
  if (dirSegs.length <= skillsSegs.length) return null;
  for (let i = 0; i < skillsSegs.length; i++) {
    if (dirSegs[dirSegs.length - 1 - i] !== skillsSegs[skillsSegs.length - 1 - i]) return null;
  }
  const base = dirSegs.slice(0, dirSegs.length - skillsSegs.length).join(path.sep) || path.sep;
  const out = [skillsDir];
  for (const key of ['agents', 'workflows']) {
    const rel = def[key] && def[key][scope];
    if (rel) out.push(path.join(base, ...rel.split('/')));
  }
  return out;
}

/**
 * Tier 2 (shape): for manifests the tier-1 check cannot cover
 * (custom --dest installs, unknown target). A legitimate root is
 * '.' or a relative path that climbs with '..' segments and then
 * descends to a directory named agents, workflows, or
 * global_workflows — the shape relativeRoot() produces for a
 * target's agents/workflows dir from any --dest skills dir
 * (e.g. '../agents', '../../.codex/agents', '../.claude/agents').
 * Anything else — including a root that merely climbs ('..',
 * '../..') or lands on any other directory name — is rejected,
 * so the worst a crafted root can do is point at an
 * agents/workflows directory, a location the installer legitimately
 * writes to anyway.
 */
function validateRootShape(root) {
  const segs = root.split(/[\\/]+/);
  let i = 0;
  while (i < segs.length && segs[i] === '..') i++;
  if (i === 0) return `root ${JSON.stringify(root)} must be '.' or start with '..'`;
  const down = segs.slice(i);
  if (!down.length) return `root ${JSON.stringify(root)} must name an install location`;
  if (down.some((s) => s === '' || s === '.' || s === '..')) {
    return `root ${JSON.stringify(root)} has an empty, '.' or '..' segment after the leading '..' segments`;
  }
  const last = down[down.length - 1];
  if (!INSTALL_ROOT_NAMES.has(last)) {
    return `root ${JSON.stringify(root)} does not resolve to an agents/workflows directory`;
  }
  return null;
}

function validateEntryRoot(root, { skillsDir = null, target = null, scope = null } = {}) {
  // A missing root means '.' — entryRoot's long-standing default.
  if (root === undefined || root === null || root === '') return null;
  if (typeof root !== 'string') return `root must be a string, got ${typeof root}`;
  if (root.includes('\0')) return 'root must not contain a NUL byte';
  if (path.isAbsolute(root) || /^[A-Za-z]:/.test(root) || root.startsWith('\\\\')) {
    return `root ${JSON.stringify(root)} must be relative`;
  }
  if (root === '.') return null;
  if (skillsDir && target && scope) {
    const exact = allowedRootsFor(target, scope, skillsDir);
    if (exact) {
      const resolved = path.resolve(skillsDir, root);
      if (exact.some((d) => d === resolved)) return null;
      return `root ${JSON.stringify(root)} is not an install location for target '${target}' (${scope})`;
    }
  }
  return validateRootShape(root);
}

/**
 * Validate an entry's paths only (root + destName). Used by
 * entryRoot/entryDest as a defensive guard and by backup-item
 * validation, where the entry may be partial (restore builds an
 * effective entry from a backup record's root/destName fields).
 */
export function validateEntryPaths(entry, opts = {}) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'entry is not an object';
  const destProblem = validatePathSegment(entry.destName, 'destName');
  if (destProblem) return destProblem;
  if (entry.destName.startsWith('.')) {
    return `destName ${JSON.stringify(entry.destName)} must not start with '.'`;
  }
  return validateEntryRoot(entry.root, opts);
}

/**
 * Validate a full manifest entry: kind, name, manifest key, and
 * paths. `opts` carries the manifest key the entry was stored
 * under plus the skills dir and the manifest's own target/scope
 * (for the tier-1 root check).
 */
export function validateEntry(entry, { key = null, skillsDir = null, target = null, scope = null } = {}) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'entry is not an object';
  if (!['skill', 'agent', 'workflow'].includes(entry.kind)) {
    return `unknown kind ${JSON.stringify(entry.kind)}`;
  }
  const nameProblem = validatePathSegment(entry.name, 'name');
  if (nameProblem) return nameProblem;
  if (key !== null && key !== entryKey(entry.kind, entry.name)) {
    return `manifest key '${key}' does not match entry ${entry.kind}:${entry.name}`;
  }
  const pathsProblem = validateEntryPaths(entry, { skillsDir, target, scope });
  if (pathsProblem) return pathsProblem;
  // destName must name the entry itself: a skill installs as a
  // directory of its own name, an agent/workflow as '<name>.md'
  // (or '<name>.toml' for Codex agents). Without this, a crafted
  // entry could make uninstalling one item delete another.
  if (entry.kind === 'skill') {
    if (entry.destName !== entry.name) {
      return `destName ${JSON.stringify(entry.destName)} does not match skill name ${JSON.stringify(entry.name)}`;
    }
  } else if (entry.destName !== `${entry.name}.md` && entry.destName !== `${entry.name}.toml`) {
    return `destName ${JSON.stringify(entry.destName)} does not match ${entry.kind} name ${JSON.stringify(entry.name)}`;
  }
  return null;
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
  // Entries are untrusted input (project-scope manifests travel
  // via git): a manifest with an invalid entry is corrupt, so
  // update/uninstall refuse it and install quarantines it — the
  // same treatment as any other corrupt manifest.
  for (const [key, entry] of Object.entries(parsed.items)) {
    const problem = validateEntry(entry, {
      key,
      skillsDir,
      target: parsed.target,
      scope: parsed.scope,
    });
    if (problem) {
      return { manifest: null, error: `corrupt: invalid manifest entry '${key}' (${problem})` };
    }
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

/**
 * Resolve a manifest entry's install root to an absolute path.
 * Defensive guard: throws on an invalid entry, so callers that
 * construct entries from elsewhere (e.g. restore, from a backup
 * record) can never steer a path outside the install locations.
 * Absolute roots are rejected — the installer never writes them.
 */
export function entryRoot(skillsDir, entry) {
  const problem = validateEntryPaths(entry);
  if (problem) throw new Error(`Invalid manifest entry: ${problem}`);
  if (!entry.root || entry.root === '.') return skillsDir;
  return path.resolve(skillsDir, entry.root);
}

/** Absolute destination path of a manifest entry. Throws on an invalid entry. */
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
