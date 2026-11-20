// library.mjs — reading the SkillForge library (registry, agents,
// workflows) and resolving install selections against it.
//
// Skills are authoritative in registry/skills.json. Agents and
// workflows have no registry yet (see M-10 in ai/audits), so they are
// discovered by scanning agents/ and workflows/ for *.md files.
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

export class LibraryError extends Error {}

/** Load the library rooted at `root` (the repository root). */
export async function loadLibrary(root) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const reg = JSON.parse(await readFile(path.join(root, 'registry', 'skills.json'), 'utf8'));
  const skills = new Map();
  for (const s of reg.skills || []) {
    skills.set(s.name, {
      kind: 'skill',
      name: s.name,
      category: s.category || null,
      version: s.version || pkg.version || '0.0.0',
      source: s.path, // repo-relative, e.g. skills/frontend/nextjs
      description: s.description || '',
    });
  }
  const categories = new Set([...skills.values()].map((s) => s.category).filter(Boolean));

  const agents = new Map();
  for (const name of await listMarkdownNames(path.join(root, 'agents'))) {
    agents.set(name, {
      kind: 'agent',
      name,
      category: null,
      version: pkg.version || '0.0.0',
      source: `agents/${name}.md`,
      description: '',
    });
  }
  const workflows = new Map();
  for (const name of await listMarkdownNames(path.join(root, 'workflows'))) {
    workflows.set(name, {
      kind: 'workflow',
      name,
      category: null,
      version: pkg.version || '0.0.0',
      source: `workflows/${name}.md`,
      description: '',
    });
  }
  return { root, version: pkg.version || '0.0.0', skills, categories, agents, workflows };
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
