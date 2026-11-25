// library.mjs — reading the SkillForge library (registry, agents,
// workflows) and resolving install selections against it.
//
// Skills are authoritative in registry/skills.json; agents and
// workflows in registry/agents.json and registry/workflows.json
// (Phase 9, finding M-10). When an agents/workflows registry file
// is absent (e.g. a fixture library), loadLibrary falls back to
// scanning agents/ and workflows/ for *.md files.
//
// This module also owns the format transforms applied when an agent
// or workflow is installed for a target whose native format differs
// from the library's plain Markdown:
//   * Markdown agents/workflows (Claude Code, Cursor, Antigravity):
//     the library files have no frontmatter, but Claude Code requires
//     name+description frontmatter on subagents and the other targets
//     read it when present, so the installer prepends a minimal
//     frontmatter block with the name and a description derived from
//     the file's own opening paragraph. Files that already carry
//     frontmatter are installed verbatim.
//   * TOML agents (Codex): Codex custom agents are TOML files with
//     required name, description, and developer_instructions fields,
//     so the installer renders a .toml file embedding the Markdown
//     body as developer_instructions.
// The transforms are deterministic: installing the same library file
// twice produces byte-identical output, which is what makes
// idempotency and update detection work for transformed items.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { splitFrontmatter, parseFrontmatter } from '../lib/frontmatter.mjs';

export class LibraryError extends Error {}

/**
 * Validate one registry entry's name and source path (A5-04). The
 * registry is generated and repo-controlled, so a tampered registry
 * needs repo write access — but the installer joins `source`
 * straight onto the library root and hashes/copies whatever it
 * finds there, so a `../` path or a separator-containing name must
 * never survive loading. Throws a LibraryError naming the problem.
 */
function validateRegistryEntry(entry, kind, root, where) {
  const what = `${where} entry ${JSON.stringify(entry?.name ?? '?')}`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new LibraryError(`${where}: registry entry is not an object`);
  }
  if (typeof entry.name !== 'string' || entry.name === '' || entry.name.includes('/')
    || entry.name.includes('\\') || entry.name.includes('\0')
    || entry.name === '.' || entry.name === '..') {
    throw new LibraryError(`${what}: name must be a single path segment`);
  }
  if (typeof entry.path !== 'string' || entry.path === '') {
    throw new LibraryError(`${what}: path must be a non-empty string`);
  }
  const resolved = path.resolve(root, entry.path);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new LibraryError(`${what}: path ${JSON.stringify(entry.path)} escapes the library root`);
  }
}

/** Load the library rooted at `root` (the repository root). */
export async function loadLibrary(root) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const reg = JSON.parse(await readFile(path.join(root, 'registry', 'skills.json'), 'utf8'));
  // A2-17: shape validation. The old code did `reg.skills || []`,
  // so a registry parsing to `[]` (or any non-object) silently
  // produced an empty library — "Nothing to install" — and every
  // command failed or misled exactly when the repo was broken. A
  // malformed registry is now a clear LibraryError.
  if (!reg || typeof reg !== 'object' || Array.isArray(reg) || !Array.isArray(reg.skills)) {
    throw new LibraryError(
      'registry/skills.json is malformed: expected an object with a "skills" array. ' +
        'Regenerate it with `npm run registry`.',
    );
  }
  const skills = new Map();
  // Verification status (Finding 3): the registry carries each
  // skill's `status` (derived from sources/verification-status.json
  // by the registry generator, Phase 9 M-01), so the status is read
  // from the registry — the same source the installer already
  // trusts for names, paths, and categories. The human-readable
  // note behind a status lives only in verification-status.json
  // (the registry carries no note field), so it is read from there
  // directly, best-effort: a fixture library without the file
  // simply has no notes, and its skills carry no status.
  let statusNotes = new Map();
  try {
    const vs = JSON.parse(await readFile(path.join(root, 'sources', 'verification-status.json'), 'utf8'));
    if (vs && typeof vs === 'object' && vs.statuses && typeof vs.statuses === 'object') {
      for (const [name, entry] of Object.entries(vs.statuses)) {
        if (entry && typeof entry.note === 'string' && entry.note) statusNotes.set(name, entry.note);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  for (const s of reg.skills) {
    validateRegistryEntry(s, 'skill', root, 'registry/skills.json');
    skills.set(s.name, {
      kind: 'skill',
      name: s.name,
      category: s.category || null,
      version: s.version || pkg.version || '0.0.0',
      source: s.path, // repo-relative, e.g. skills/frontend/nextjs
      description: s.description || '',
      status: typeof s.status === 'string' ? s.status : null,
      statusNote: statusNotes.get(s.name) || null,
    });
  }
  const categories = new Set([...skills.values()].map((s) => s.category).filter(Boolean));

  const agents = await loadKind(root, 'agents', 'agent', pkg.version);
  const workflows = await loadKind(root, 'workflows', 'workflow', pkg.version);
  return { root, version: pkg.version || '0.0.0', skills, categories, agents, workflows };
}

// Load one kind (agents or workflows) from its registry file, falling
// back to a directory scan when the registry file is absent.
async function loadKind(root, dir, kind, pkgVersion) {
  const out = new Map();
  const registryFile = path.join(root, 'registry', `${dir}.json`);
  try {
    const doc = JSON.parse(await readFile(registryFile, 'utf8'));
    // Same shape discipline as skills (A2-17): a registry file
    // that parses to a non-object, or whose list is present but
    // not an array, is a clear error — not a silently empty kind.
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new LibraryError(
        `registry/${dir}.json is malformed: expected an object with a "${dir}" array. ` +
          'Regenerate it with `npm run registry`.',
      );
    }
    if (doc[dir] !== undefined && !Array.isArray(doc[dir])) {
      throw new LibraryError(
        `registry/${dir}.json is malformed: "${dir}" must be an array. ` +
          'Regenerate it with `npm run registry`.',
      );
    }
    for (const entry of doc[dir] || []) {
      // A5-04: validate the effective source path — the default
      // `${dir}/${name}.md` is safe by construction, an explicit
      // path is not.
      const effective = { name: entry?.name, path: entry?.path || `${dir}/${entry?.name}.md` };
      validateRegistryEntry(effective, kind, root, `registry/${dir}.json`);
      out.set(entry.name, {
        kind,
        name: entry.name,
        category: null,
        version: pkgVersion || '0.0.0',
        source: entry.path || `${dir}/${entry.name}.md`,
        description: entry.description || '',
      });
    }
    return out;
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // No registry file: fall back to scanning the directory.
  }
  for (const name of await listMarkdownNames(path.join(root, dir))) {
    out.set(name, {
      kind,
      name,
      category: null,
      version: pkgVersion || '0.0.0',
      source: `${dir}/${name}.md`,
      description: '',
    });
  }
  return out;
}

async function listMarkdownNames(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name.slice(0, -3))
    .sort();
}

/** Split a comma list, drop empties. Accepts repeatable flags. */
export function splitList(values) {
  const out = [];
  for (const v of values || []) {
    for (const part of String(v).split(',')) {
      const t = part.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/**
 * Load install profiles (Finding 2): `profiles/*.json`, each
 * `{ name, description, skills[], agents[], workflows[] }` — a
 * named bundle of skills (plus agents/workflows) that installs
 * as one unit, so a user installs the 21 frontend skills instead
 * of all 277 descriptions (~25k tokens) at once. See
 * docs/PROFILES.md for the catalog and the file format.
 *
 * Validates shape and that every named item exists in the
 * library; a bad profile is a LibraryError naming the file (a
 * repo problem, like a malformed registry). A missing
 * profiles/ directory means no profiles (fixture libraries).
 * Loaded lazily — only when --profile/--bundle is given — so a
 * malformed profile cannot break unrelated commands.
 * Returns a Map of profile name → definition.
 */
export async function loadProfiles(library) {
  const dir = path.join(library.root, 'profiles');
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  } catch (err) {
    if (err.code === 'ENOENT') return new Map();
    throw err;
  }
  const out = new Map();
  for (const file of files) {
    const where = `profiles/${file}`;
    let doc;
    try {
      doc = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
    } catch (err) {
      throw new LibraryError(`${where}: invalid JSON (${err.message})`);
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      throw new LibraryError(`${where}: expected an object with "name", "description", "skills", "agents", "workflows"`);
    }
    const expectedName = file.slice(0, -'.json'.length);
    if (doc.name !== expectedName) {
      throw new LibraryError(`${where}: "name" must be ${JSON.stringify(expectedName)} (the file name)`);
    }
    if (typeof doc.description !== 'string' || !doc.description.trim()) {
      throw new LibraryError(`${where}: "description" must be a non-empty string`);
    }
    const members = {};
    for (const kind of ['skills', 'agents', 'workflows']) {
      const list = doc[kind] === undefined ? [] : doc[kind];
      if (!Array.isArray(list) || list.some((n) => typeof n !== 'string' || !n.trim())) {
        throw new LibraryError(`${where}: "${kind}" must be an array of names`);
      }
      members[kind] = [...new Set(list.map((n) => n.trim()))];
    }
    const byKind = { skills: library.skills, agents: library.agents, workflows: library.workflows };
    for (const kind of ['skills', 'agents', 'workflows']) {
      for (const name of members[kind]) {
        const singular = kind.slice(0, -1);
        if (!byKind[kind].has(name)) {
          throw new LibraryError(`${where}: unknown ${singular} '${name}'`);
        }
      }
    }
    out.set(doc.name, { name: doc.name, description: doc.description, ...members });
  }
  return out;
}

/**
 * Expand profile names into selection arrays, to be merged with
 * the caller's --skill/--agent/--workflow selectors (union —
 * resolveSelection deduplicates). Returns { expanded, errors }:
 * errors lists unknown profiles (with the known names), in the
 * same shape as resolveSelection's errors, so callers report
 * them as usage errors.
 */
export function expandProfiles(profiles, names) {
  const expanded = { skills: [], agents: [], workflows: [] };
  const errors = [];
  const known = [...profiles.keys()].sort().join(', ') || 'none';
  for (const name of names) {
    const p = profiles.get(name);
    if (!p) {
      errors.push(`unknown profile '${name}' (known profiles: ${known})`);
      continue;
    }
    expanded.skills.push(...p.skills);
    expanded.agents.push(...p.agents);
    expanded.workflows.push(...p.workflows);
  }
  return { expanded, errors };
}

/**
 * Resolve a selection ({ skills, categories, agents, workflows } —
 * each an array of raw flag values) against the library.
 * Returns { items, errors }: items are library records in a stable
 * order (skills by name, then agents, then workflows), deduplicated;
 * errors lists unknown names. 'all' selects every item of that kind.
 */
export function resolveSelection(library, selection) {
  const items = [];
  const seen = new Set();
  const errors = [];
  const add = (rec) => {
    const key = `${rec.kind}:${rec.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(rec);
    }
  };

  const skillNames = splitList(selection.skills);
  if (skillNames.includes('all')) {
    for (const rec of [...library.skills.values()].sort((a, b) => (a.name < b.name ? -1 : 1))) add(rec);
  } else {
    for (const name of skillNames) {
      const rec = library.skills.get(name);
      if (!rec) errors.push(`unknown skill '${name}'`);
      else add(rec);
    }
  }

  for (const cat of splitList(selection.categories)) {
    if (cat === 'all') {
      for (const rec of [...library.skills.values()].sort((a, b) => (a.name < b.name ? -1 : 1))) add(rec);
      continue;
    }
    if (!library.categories.has(cat)) {
      errors.push(`unknown category '${cat}' (known: ${[...library.categories].sort().join(', ')})`);
      continue;
    }
    for (const rec of [...library.skills.values()].filter((s) => s.category === cat).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      add(rec);
    }
  }

  const agentNames = splitList(selection.agents);
  if (agentNames.includes('all')) {
    for (const rec of [...library.agents.values()].sort((a, b) => (a.name < b.name ? -1 : 1))) add(rec);
  } else {
    for (const name of agentNames) {
      const rec = library.agents.get(name);
      if (!rec) errors.push(`unknown agent '${name}'`);
      else add(rec);
    }
  }

  const workflowNames = splitList(selection.workflows);
  if (workflowNames.includes('all')) {
    for (const rec of [...library.workflows.values()].sort((a, b) => (a.name < b.name ? -1 : 1))) add(rec);
  } else {
    for (const name of workflowNames) {
      const rec = library.workflows.get(name);
      if (!rec) errors.push(`unknown workflow '${name}'`);
      else add(rec);
    }
  }

  return { items, errors };
}

/**
 * Derive a one-line description from a Markdown agent/workflow file:
 * the first paragraph after the leading H1 title, folded to one line.
 * Falls back to a generic description when no paragraph is found.
 */
export function deriveDescription(markdown, name) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  // Skip a leading H1 title.
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && lines[i].startsWith('# ')) i++;
  // Collect the first non-empty paragraph.
  const para = [];
  while (i < lines.length && lines[i].trim() === '') i++;
  while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#')) {
    para.push(lines[i].trim());
    i++;
  }
  let desc = para.join(' ').replace(/\s+/g, ' ').trim();
  if (!desc) desc = `SkillForge ${name} agent.`;
  const MAX = 240;
  if (desc.length > MAX) {
    desc = desc.slice(0, MAX);
    const lastSpace = desc.lastIndexOf(' ');
    if (lastSpace > MAX * 0.5) desc = desc.slice(0, lastSpace);
    desc += '…';
  }
  return desc;
}

function hasFrontmatter(markdown) {
  return markdown.startsWith('---\n') || markdown.startsWith('---\r\n');
}

function yamlSingleQuoted(value) {
  // Single-quoted YAML scalar: only ' needs escaping (doubled).
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Render a library agent/workflow Markdown file for a target that
 * reads Markdown agent files (Claude Code, Cursor, Antigravity):
 * prepend minimal frontmatter (name + description) when the file
 * has none. Returns the exact bytes to install.
 */
export function toMarkdownAgent(name, markdown) {
  if (hasFrontmatter(markdown)) return markdown;
  const description = deriveDescription(markdown, name);
  const frontmatter = `---\nname: ${name}\ndescription: ${yamlSingleQuoted(description)}\n---\n\n`;
  return frontmatter + markdown;
}

function tomlBasicString(value) {
  // TOML basic string: escape backslash, quote, and control chars.
  return `"${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;
}

/**
 * Render a library agent Markdown file as a Codex custom agent TOML
 * file (name, description, developer_instructions). Throws a
 * LibraryError if the body cannot be embedded safely (it contains a
 * triple-quote sequence).
 */
export function toTomlAgent(name, markdown) {
  if (markdown.includes('"""')) {
    throw new LibraryError(
      `agent '${name}' cannot be converted to Codex TOML: its body contains a '"""' sequence`,
    );
  }
  const description = deriveDescription(markdown, name);
  // Multi-line basic string: backslashes must be escaped; the body
  // is otherwise embedded verbatim.
  const body = markdown.replace(/\\/g, '\\\\');
  return (
    `# Generated by the SkillForge installer from agents/${name}.md.\n` +
    `# Re-install from the library to update; edits here are overwritten on update.\n` +
    `name = ${tomlBasicString(name)}\n` +
    `description = ${tomlBasicString(description)}\n` +
    `developer_instructions = """\n${body}"""\n`
  );
}

/** The installed file name for an agent/workflow item on a target. */
export function installedFileName(item, targetDef) {
  const dirDef = targetDef[item.kind === 'agent' ? 'agents' : 'workflows'];
  if (!dirDef) return null;
  if (item.kind === 'agent' && dirDef.format === 'toml') return `${item.name}.toml`;
  return `${item.name}.md`;
}

// ---------------------------------------------------------------- Muse skills
//
// Muse reads a custom skill as a directory with SKILL.md (the
// instructions alone, NO frontmatter) beside a skill.yaml carrying
// the name, title, description, category, and prompt-inclusion
// choice. The library's skills are Agent Skills spec files (name +
// description frontmatter, then the body), so the installer
// converts them on install for the muse target:
//   * SKILL.md — the body with the frontmatter stripped (leading
//     blank lines removed; the rest is verbatim, so the skill's
//     content is unchanged).
//   * skill.yaml — name (the folder name, exactly), title (the
//     body's first H1, or the name humanized), description (the
//     frontmatter description, or the body's opening paragraph),
//     category (the registry category, or 'General'),
//     include_in_prompt: false.
// include_in_prompt is false deliberately: true would list the
// skill in EVERY conversation, and a 277-skill library would
// flood the prompt — the same preloading problem profiles solve
// (Finding 2). With false, Muse finds the skill via search when
// a task needs it, which is this library's discovery model.
// The transform is deterministic: installing the same library
// file twice produces byte-identical output, which is what makes
// idempotency and update detection work for converted items.

function museTitleFromBody(body) {
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('# ')) return line.slice(2).trim();
  }
  return null;
}

function humanizeName(name) {
  return name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Render a library skill for the Muse target. Returns
 * { skillMd, skillYaml }: the exact bytes to install as
 * SKILL.md and skill.yaml. Throws a LibraryError when the
 * skill's frontmatter is present but unparseable (a missing
 * frontmatter block is tolerated: the whole file is the body
 * and the description falls back to the opening paragraph).
 */
export function toMuseSkill(item, skillMarkdown) {
  let body = skillMarkdown;
  let description = typeof item.description === 'string' ? item.description.trim() : '';
  const { raw, body: stripped, error } = splitFrontmatter(skillMarkdown);
  if (!error) {
    const parsed = parseFrontmatter(raw);
    if (parsed.error) {
      throw new LibraryError(`skill '${item.name}' has invalid frontmatter: ${parsed.error}`);
    }
    if (typeof parsed.data.description === 'string' && parsed.data.description.trim()) {
      description = parsed.data.description.trim();
    }
    body = stripped.replace(/^(\r?\n)+/, '');
  } else if (!error.startsWith('missing frontmatter')) {
    // An unclosed frontmatter block is a real defect, not an
    // absent one: refuse rather than install a half-parsed file.
    throw new LibraryError(`skill '${item.name}' has invalid frontmatter: ${error}`);
  }
  if (!description) description = deriveDescription(body, item.name);
  const title = museTitleFromBody(body) || humanizeName(item.name);
  const skillYaml =
    `# Generated by the SkillForge installer from ${item.source}/SKILL.md.\n` +
    `# Re-install from the library to update; edits here are overwritten on update.\n` +
    `name: ${yamlSingleQuoted(item.name)}\n` +
    `title: ${yamlSingleQuoted(title)}\n` +
    `description: ${yamlSingleQuoted(description)}\n` +
    `category: ${yamlSingleQuoted(item.category || 'General')}\n` +
    `include_in_prompt: false\n`;
  return { skillMd: body, skillYaml };
}

/**
 * Render the exact bytes to install for an agent/workflow item on a
 * target. Returns null when the target has no location for that kind.
 */
export function renderInstallable(item, targetDef, markdown) {
  const dirDef = targetDef[item.kind === 'agent' ? 'agents' : 'workflows'];
  if (!dirDef) return null;
  if (item.kind === 'agent' && dirDef.format === 'toml') return toTomlAgent(item.name, markdown);
  return toMarkdownAgent(item.name, markdown);
}
