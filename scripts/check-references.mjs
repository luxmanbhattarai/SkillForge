#!/usr/bin/env node
// check-references.mjs — skill dependency & reference integrity (Phase 9).
//
// Validates every reference between the library's entities — skills,
// agents, workflows, scripts, config, docs — against the schema in
// ai/quality/DEPENDENCY-INTEGRITY.md:
//
//   - registry cross-references resolve (skill.related, agent
//     discover/use, workflow.skills, agent/workflow references)
//   - registry paths exist on disk, and every skill/agent/workflow
//     on disk is in the registry (no orphaned files, no references
//     to removed files)
//   - no duplicate identifiers, no self-references, no duplicate
//     entries inside a reference list
//   - no cycles in the MANDATORY dependency graph (agent.use,
//     workflow.skills, skill.dependencies when declared)
//   - registry versions are valid semver
//   - internal Markdown links resolve (original skills, agents,
//     workflows; upstream exempt, same policy as check-links.mjs)
//   - scripts referenced by package.json and the CI workflows exist
//
// Severity: errors fail the run (exit 1); warnings do not. Two
// deliberate non-failures, both documented in DEPENDENCY-INTEGRITY.md:
//   - OPTIONAL references (related, discover, references) are never
//     required to exist — but when present they must resolve, and
//     they never participate in cycle detection: related edges are
//     bidirectional by design (152 mutual pairs in the live repo)
//     and agent references are mutual too (25 cycles today).
//   - A skill nothing points at (no inbound edge) is a WARNING, not
//     an error: it is still discoverable via the registry and the
//     query CLI. 104 such skills exist today; failing on them would
//     make the check unusable.
//
// This checker complements, not replaces, its neighbours:
// check-links.mjs is the repo-wide link checker (all Markdown,
// external URLs with --online); check-agents-workflows.mjs resolves
// backticked tokens in agents/workflows files; validate-registry.mjs
// enforces the registry schemas. check-references owns the
// cross-entity reference graph between those layers.
//
// Usage:
//   node scripts/check-references.mjs [--root <dir>] [--json] [--verbose]
//   npm run check:references
// Exit code 1 on any error, 0 otherwise (warnings do not fail).
// --root is for tests; it defaults to the repository root.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSkillFiles } from './lib/skill-files.mjs';
import { toPosixPath } from './lib/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// How many unreferenced-skill names to print without --verbose.
export const ORPHAN_LIST_LIMIT = 20;

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function isSemver(version) {
  return typeof version === 'string' && SEMVER_RE.test(version);
}

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// Extract Markdown links with their 1-based line numbers, ignoring
// fenced code blocks and inline code spans (link-shaped text in
// code is an example, not a link — same rule as check-links.mjs,
// but line-aware so errors can point at the exact line).
// Returns [{ href, line }].
export function extractLinksWithLines(text) {
  const out = [];
  const lines = text.split('\n');
  let fence = null; // the opening fence marker run (``` or ~~~)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    // Inline code spans: double-backtick first (their content may
    // hold single backticks), then single-backtick spans.
    const noCode = line
      .replace(/``(?:[^`\n]|`(?=[^`\n]))*``/g, '')
      .replace(/`[^`\n]+`/g, '');
    for (const m of noCode.matchAll(LINK_RE)) {
      out.push({ href: m[1], line: i + 1 });
    }
  }
  return out;
}

// Find the line number of `target` inside the JSON entry for
// `sourceName` in a pretty-printed registry file. Best effort:
// returns null when the shape is unexpected, and callers omit the
// line rather than print a wrong one. Entries are objects in a
// top-level array; an entry ends at a line matching `    },?`.
export function findJsonEntryLine(jsonText, sourceName, target) {
  const lines = jsonText.split('\n');
  const nameRe = new RegExp(`^\\s*"name":\\s*"${sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*,?\\s*$`);
  const start = lines.findIndex((l) => nameRe.test(l));
  if (start === -1) return null;
  for (let i = start; i < lines.length; i++) {
    if (i > start && /^\s{4}\},?$/.test(lines[i])) return null;
    if (lines[i].includes(`"${target}"`)) return i + 1;
  }
  return null;
}

// Cycle detection over a directed graph: adjacency is Map<node,
// string[]> with node ids like `skill:seo-audit`. Returns the
// cycles found, each as a list of node ids starting and ending at
// the same node. Exported so the algorithm is unit-testable on an
// abstract graph.
export function findCycles(adjacency) {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map();
  for (const node of adjacency.keys()) color.set(node, WHITE);
  const cycles = [];
  const visit = (node, stack) => {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!color.has(next)) continue; // unknown node: reported elsewhere
      if (color.get(next) === GRAY) {
        cycles.push([...stack.slice(stack.indexOf(next)), next]);
      } else if (color.get(next) === WHITE) {
        visit(next, stack);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  };
  for (const node of adjacency.keys()) {
    if (color.get(node) === WHITE) visit(node, []);
  }
  return cycles;
}

// A finding: { file, line?, message, fix }. `file` is a POSIX path
// relative to the repo root; `line` is 1-based when known.
function finding(file, message, fix, line = null) {
  return { file, line, message, fix };
}

async function readJsonFile(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

// Run the reference-integrity check end to end. Exported for
// testing (check-upstream.mjs pattern): `opts` injects the root and
// the output sinks, so tests run against fixture trees. Returns
// { exitCode, errors, warnings, summary }.
export async function runCheck({
  root = ROOT,
  json = false,
  verbose = false,
  log = console.log,
  error = console.error,
} = {}) {
  const errors = [];
  const warnings = [];
  const rel = (abs) => toPosixPath(path.relative(root, abs));

  // --- 1. Load the registries. -------------------------------------------
  let skillsJson;
  let agentsJson;
  let workflowsJson;
  let skillsText;
  let agentsText;
  let workflowsText;
  try {
    skillsText = await readFile(path.join(root, 'registry', 'skills.json'), 'utf8');
    agentsText = await readFile(path.join(root, 'registry', 'agents.json'), 'utf8');
    workflowsText = await readFile(path.join(root, 'registry', 'workflows.json'), 'utf8');
    skillsJson = JSON.parse(skillsText);
    agentsJson = JSON.parse(agentsText);
    workflowsJson = JSON.parse(workflowsText);
  } catch (e) {
    error(`check-references: cannot read the registry: ${e.message}`);
    return { exitCode: 2, errors, warnings, summary: null };
  }
  const skills = skillsJson.skills ?? [];
  const agents = agentsJson.agents ?? [];
  const workflows = workflowsJson.workflows ?? [];
  const skillNames = new Set(skills.map((s) => s.name));
  const agentNames = new Set(agents.map((a) => a.name));
  const workflowNames = new Set(workflows.map((w) => w.name));

  // --- 2. Duplicate identifiers. ------------------------------------------
  const checkDuplicates = (entries, kind, file) => {
    const seen = new Map();
    for (const e of entries) {
      if (seen.has(e.name)) {
        errors.push(finding(file,
          `duplicate ${kind} identifier "${e.name}" (first seen at entry ${seen.get(e.name)})`,
          `Rename one of the ${kind}s so every ${kind} name is unique; then run 'npm run registry' to regenerate.`));
      } else {
        seen.set(e.name, entries.indexOf(e));
      }
    }
  };
  checkDuplicates(skills, 'skill', 'registry/skills.json');
  checkDuplicates(agents, 'agent', 'registry/agents.json');
  checkDuplicates(workflows, 'workflow', 'registry/workflows.json');

  // Cross-namespace collisions are a WARNING, not an error: token
  // resolution is defined (skill wins — see lib/agents-workflows.mjs),
  // so nothing breaks, but the colliding agent/workflow can never be
  // reached by a backticked reference. Two exist today
  // (sdk-development, seo-audit: both a skill and a workflow).
  for (const name of skillNames) {
    if (agentNames.has(name)) {
      warnings.push(finding('registry/skills.json',
        `name collision: "${name}" is both a skill and an agent; backticked references resolve to the skill`,
        'Rename one of them so the name is unambiguous across skills, agents, and workflows.'));
    }
    if (workflowNames.has(name)) {
      warnings.push(finding('registry/skills.json',
        `name collision: "${name}" is both a skill and a workflow; backticked references resolve to the skill`,
        'Rename one of them so the name is unambiguous across skills, agents, and workflows.'));
    }
  }
  for (const name of agentNames) {
    if (workflowNames.has(name)) {
      warnings.push(finding('registry/agents.json',
        `name collision: "${name}" is both an agent and a workflow`,
        'Rename one of them so the name is unambiguous across skills, agents, and workflows.'));
    }
  }

  // --- 3. Registry paths exist; disk matches the registry. ----------------
  for (const s of skills) {
    const skillFile = path.join(root, toPosixPath(s.path ?? ''), 'SKILL.md');
    if (!s.path || !existsSync(skillFile)) {
      errors.push(finding('registry/skills.json',
        `skill "${s.name}" references a removed file: ${s.path ?? '(no path)'} has no SKILL.md on disk`,
        `Restore ${s.path}/SKILL.md, or remove the skill from the registry (run 'npm run registry' after fixing the source).`,
        findJsonEntryLine(skillsText, s.name, s.path)));
    }
  }
  for (const a of agents) {
    if (!a.path || !existsSync(path.join(root, toPosixPath(a.path)))) {
      errors.push(finding('registry/agents.json',
        `agent "${a.name}" references a removed file: ${a.path ?? '(no path)'} does not exist`,
        `Restore ${a.path}, or remove the agent from the registry (run 'npm run registry' after fixing the source).`,
        findJsonEntryLine(agentsText, a.name, a.path)));
    }
  }
  for (const w of workflows) {
    if (!w.path || !existsSync(path.join(root, toPosixPath(w.path)))) {
      errors.push(finding('registry/workflows.json',
        `workflow "${w.name}" references a removed file: ${w.path ?? '(no path)'} does not exist`,
        `Restore ${w.path}, or remove the workflow from the registry (run 'npm run registry' after fixing the source).`,
        findJsonEntryLine(workflowsText, w.name, w.path)));
    }
  }

  // On-disk skills/agents/workflows missing from the registry are
  // orphaned files: they exist but no index points at them, so
  // discovery (registry, query CLI, installer) cannot see them.
  const registrySkillPaths = new Set(skills.map((s) => toPosixPath(s.path)));
  for (const file of await findSkillFiles(path.join(root, 'skills'))) {
    const dir = toPosixPath(path.relative(root, path.dirname(file)));
    if (!registrySkillPaths.has(dir)) {
      errors.push(finding(`${dir}/SKILL.md`,
        `orphaned skill: ${dir} exists on disk but is not in registry/skills.json`,
        `Run 'npm run registry' to index it, or delete the directory if it was abandoned.`));
    }
  }
  const registryAgentPaths = new Set(agents.map((a) => toPosixPath(a.path)));
  const registryWorkflowPaths = new Set(workflows.map((w) => toPosixPath(w.path)));
  for (const [dir, paths, kind, file] of [
    ['agents', registryAgentPaths, 'agent', 'registry/agents.json'],
    ['workflows', registryWorkflowPaths, 'workflow', 'registry/workflows.json'],
  ]) {
    const names = await readdir(path.join(root, dir)).catch(() => []);
    for (const name of names.filter((f) => f.endsWith('.md')).sort()) {
      if (!paths.has(`${dir}/${name}`)) {
        errors.push(finding(`${dir}/${name}`,
          `orphaned ${kind}: ${dir}/${name} exists on disk but is not in ${file}`,
          `Run 'npm run registry' to index it, or delete the file if it was abandoned.`));
      }
    }
  }

  // --- 4. Reference resolution. -------------------------------------------
  // Inbound-edge counts for the orphan warning (§8).
  const inbound = new Map([...skillNames].map((n) => [n, 0]));
  const noteInbound = (name) => { if (inbound.has(name)) inbound.set(name, inbound.get(name) + 1); };

  // One reference list: resolves each target, reports duplicates
  // inside the list and self-references. `kind` names the target
  // namespace for the error message; `mandatory` only changes the
  // wording (a dangling pointer is an error either way — the
  // mandatory/optional distinction governs absence and cycles, not
  // resolution; see DEPENDENCY-INTEGRITY.md).
  // `source` is the decorated label for messages (`agent "builder"`);
  // `sourceName` is the plain entry name for the JSON line lookup.
  const checkList = ({ list, source, sourceName, field, file, jsonText, targetSet, kind, mandatory, selfName = null }) => {
    if (!Array.isArray(list)) return;
    const seen = new Set();
    for (const target of list) {
      if (seen.has(target)) {
        errors.push(finding(file,
          `${source} lists "${target}" twice in ${field}`,
          `Remove the duplicate entry from ${field}; then run 'npm run registry' if the list is generated.`,
          findJsonEntryLine(jsonText, sourceName, target)));
        continue;
      }
      seen.add(target);
      if (selfName !== null && target === selfName) {
        errors.push(finding(file,
          `${source} references itself in ${field}`,
          `Remove the self-reference from ${field}; a ${kind} cannot depend on itself.`,
          findJsonEntryLine(jsonText, sourceName, target)));
        continue;
      }
      if (!targetSet.has(target)) {
        errors.push(finding(file,
          `${source} ${mandatory ? 'depends on' : 'references'} missing ${kind} "${target}" in ${field}`,
          `Fix the name in ${field}, or add the missing ${kind}; then run 'npm run registry' if the list is generated.`,
          findJsonEntryLine(jsonText, sourceName, target)));
      }
    }
  };

  for (const s of skills) {
    // related is OPTIONAL and derived (co-occurrence) — but a
    // dangling entry is still a broken pointer.
    checkList({ list: s.related, source: `skill "${s.name}"`, sourceName: s.name, field: 'related', file: 'registry/skills.json', jsonText: skillsText, targetSet: skillNames, kind: 'skill', mandatory: false, selfName: s.name });
    for (const r of s.related ?? []) noteInbound(r);
    // Skill dependencies are the extension point for a declared
    // skill→skill dependency edge (see DEPENDENCY-INTEGRITY.md §5):
    // no registry entry declares one today, but when one does, it
    // is mandatory and participates in cycle detection.
    if (Array.isArray(s.dependencies)) {
      checkList({ list: s.dependencies, source: `skill "${s.name}"`, sourceName: s.name, field: 'dependencies', file: 'registry/skills.json', jsonText: skillsText, targetSet: skillNames, kind: 'skill', mandatory: true, selfName: s.name });
      for (const d of s.dependencies) noteInbound(d);
    }
  }
  for (const a of agents) {
    checkList({ list: a.use, source: `agent "${a.name}"`, sourceName: a.name, field: 'use', file: 'registry/agents.json', jsonText: agentsText, targetSet: skillNames, kind: 'skill', mandatory: true });
    checkList({ list: a.discover, source: `agent "${a.name}"`, sourceName: a.name, field: 'discover', file: 'registry/agents.json', jsonText: agentsText, targetSet: skillNames, kind: 'skill', mandatory: false });
    checkList({ list: a.references?.agents, source: `agent "${a.name}"`, sourceName: a.name, field: 'references.agents', file: 'registry/agents.json', jsonText: agentsText, targetSet: agentNames, kind: 'agent', mandatory: false, selfName: a.name });
    checkList({ list: a.references?.workflows, source: `agent "${a.name}"`, sourceName: a.name, field: 'references.workflows', file: 'registry/agents.json', jsonText: agentsText, targetSet: workflowNames, kind: 'workflow', mandatory: false });
    for (const d of [...(a.use ?? []), ...(a.discover ?? [])]) noteInbound(d);
  }
  for (const w of workflows) {
    checkList({ list: w.skills, source: `workflow "${w.name}"`, sourceName: w.name, field: 'skills', file: 'registry/workflows.json', jsonText: workflowsText, targetSet: skillNames, kind: 'skill', mandatory: true });
    checkList({ list: w.references?.agents, source: `workflow "${w.name}"`, sourceName: w.name, field: 'references.agents', file: 'registry/workflows.json', jsonText: workflowsText, targetSet: agentNames, kind: 'agent', mandatory: false });
    checkList({ list: w.references?.workflows, source: `workflow "${w.name}"`, sourceName: w.name, field: 'references.workflows', file: 'registry/workflows.json', jsonText: workflowsText, targetSet: workflowNames, kind: 'workflow', mandatory: false, selfName: w.name });
    for (const s of w.skills ?? []) noteInbound(s);
  }

  // --- 5. Version format. ---------------------------------------------------
  // No version *constraints* exist in this repo (nothing declares a
  // required range), so incompatibility checking is limited to
  // format: every registry version must be valid semver. A
  // malformed version breaks any future constraint check silently,
  // so it fails now.
  for (const s of skills) {
    if (!isSemver(s.version)) {
      errors.push(finding('registry/skills.json',
        `skill "${s.name}" has a non-semver version ${JSON.stringify(s.version)}`,
        `Set a valid semver version (MAJOR.MINOR.PATCH) in the skill frontmatter; then run 'npm run registry'.`,
        findJsonEntryLine(skillsText, s.name, s.version)));
    }
  }

  // --- 6. Cycles in the mandatory dependency graph. ------------------------
  // Edges: agent --use--> skill, workflow --skills--> skill,
  // skill --dependencies--> skill. OPTIONAL edges (related,
  // discover, references) are excluded by design: related pairs are
  // mutual (152 in the live repo) and agent references are mutual
  // too (25 cycles today) — treating them as dependencies would
  // report the library's own see-also structure as failures.
  const adjacency = new Map();
  const addNode = (id) => { if (!adjacency.has(id)) adjacency.set(id, []); };
  for (const s of skills) {
    addNode(`skill:${s.name}`);
    for (const d of s.dependencies ?? []) adjacency.get(`skill:${s.name}`).push(`skill:${d}`);
  }
  for (const a of agents) {
    addNode(`agent:${a.name}`);
    for (const u of a.use ?? []) adjacency.get(`agent:${a.name}`).push(`skill:${u}`);
  }
  for (const w of workflows) {
    addNode(`workflow:${w.name}`);
    for (const s of w.skills ?? []) adjacency.get(`workflow:${w.name}`).push(`skill:${s}`);
  }
  for (const cycle of findCycles(adjacency)) {
    const pretty = cycle.join(' → ');
    errors.push(finding('registry/skills.json',
      `circular dependency: ${pretty}`,
      `Break the cycle by removing one dependency edge along the path (a skill's dependencies list, an agent's use list, or a workflow's skills list).`));
  }

  // --- 7. Internal Markdown links. ------------------------------------------
  // Original skills (SKILL.md plus every .md file under the skill's
  // disclosure folders — references/, scripts/, assets/, examples/),
  // agents, workflows. Upstream exempt (their links legitimately
  // point outside the imported subset — check-links.mjs policy).
  // check-links.mjs remains the repo-wide checker (all Markdown,
  // external URLs with --online); this is the entity-scoped check
  // with file + line + fix. Links INTO a disclosure folder from
  // SKILL.md resolve by the same existence check — a disclosure
  // folder is a valid reference target, and a dangling pointer
  // into one is a failure (Finding 1).
  const mdFiles = [];
  for (const file of await findSkillFiles(path.join(root, 'skills'))) {
    if (toPosixPath(path.relative(root, file)).startsWith('skills/upstream/')) continue;
    mdFiles.push(file);
  }
  const DISCLOSURE_DIRS = ['references', 'scripts', 'assets', 'examples'];
  const collectDisclosureMd = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await collectDisclosureMd(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) mdFiles.push(full);
    }
  };
  for (const file of [...mdFiles]) {
    const skillDir = path.dirname(file);
    for (const d of DISCLOSURE_DIRS) await collectDisclosureMd(path.join(skillDir, d));
  }
  for (const dir of ['agents', 'workflows']) {
    const names = await readdir(path.join(root, dir)).catch(() => []);
    for (const name of names.filter((f) => f.endsWith('.md')).sort()) {
      mdFiles.push(path.join(root, dir, name));
    }
  }
  let linksChecked = 0;
  for (const file of mdFiles.sort()) {
    const text = await readFile(file, 'utf8');
    for (const { href, line } of extractLinksWithLines(text)) {
      if (/^(https?:|mailto:|#|data:)/.test(href)) continue;
      const target = href.split('#')[0].split('?')[0];
      if (!target) continue;
      linksChecked++;
      const resolved = href.startsWith('/')
        ? path.join(root, target.slice(1))
        : path.resolve(path.dirname(file), target);
      if (!existsSync(resolved)) {
        errors.push(finding(rel(file),
          `broken internal link: ${href}`,
          `Fix the path (relative to ${rel(path.dirname(file))}), or restore the missing file.`,
          line));
      }
    }
  }

  // --- 8. Referenced scripts exist. -----------------------------------------
  // package.json scripts and CI workflow run-lines that invoke a
  // repo script must point at a file that exists.
  const scriptRefs = new Map(); // abs path -> [referrer, ...]
  const collectScriptRefs = (text, referrer) => {
    for (const m of text.matchAll(/node\s+((?:scripts|evals|test-support)\/[A-Za-z0-9_./-]+\.(?:mjs|js|cjs))/g)) {
      const abs = path.join(root, m[1]);
      if (!scriptRefs.has(abs)) scriptRefs.set(abs, []);
      scriptRefs.get(abs).push(referrer);
    }
  };
  try {
    collectScriptRefs(await readFile(path.join(root, 'package.json'), 'utf8'), 'package.json');
  } catch {
    warnings.push(finding('package.json', 'package.json is unreadable; script references were not checked', 'Restore package.json.'));
  }
  const workflowDir = path.join(root, '.github', 'workflows');
  for (const name of (await readdir(workflowDir).catch(() => [])).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort()) {
    collectScriptRefs(await readFile(path.join(workflowDir, name), 'utf8'), `.github/workflows/${name}`);
  }
  for (const [abs, referrers] of [...scriptRefs.entries()].sort()) {
    if (!existsSync(abs)) {
      errors.push(finding(referrers[0],
        `missing script: ${toPosixPath(path.relative(root, abs))} is referenced but does not exist (also referenced by: ${[...new Set(referrers)].join(', ')})`,
        `Restore the script, or update the reference to the script's new location.`));
    }
  }

  // --- 9. Unreferenced skills (warning only). -------------------------------
  const orphans = [...inbound.entries()].filter(([, n]) => n === 0).map(([n]) => n).sort();
  if (orphans.length > 0) {
    const shown = verbose ? orphans : orphans.slice(0, ORPHAN_LIST_LIMIT);
    const more = orphans.length - shown.length;
    warnings.push(finding('registry/skills.json',
      `${orphans.length} skill(s) are referenced by nothing — no agent discovers or uses them, no workflow uses them, and no other skill relates to them: ${shown.join(', ')}${more > 0 ? ` (and ${more} more; rerun with --verbose for the full list)` : ''}`,
      'Consider adding the skill to an agent discover list or a workflow, or relating it from a neighbouring skill — or accept it: an unreferenced skill is still installable and searchable.'));
  }

  // --- Summary. ---------------------------------------------------------------
  const summary = {
    skills: skills.length,
    agents: agents.length,
    workflows: workflows.length,
    linksChecked,
    errors: errors.length,
    warnings: warnings.length,
    orphans: orphans.length,
  };

  if (json) {
    log(JSON.stringify({ errors, warnings, summary }, null, 2));
  } else {
    log(`Checked ${skills.length} skills, ${agents.length} agents, ${workflows.length} workflows, ${linksChecked} internal links.`);
    for (const e of errors) {
      log(`  ERROR ${e.file}${e.line ? `:${e.line}` : ''} ${e.message} Fix: ${e.fix}`);
    }
    for (const w of warnings) {
      log(`  WARN  ${w.file}${w.line ? `:${w.line}` : ''} ${w.message} Fix: ${w.fix}`);
    }
    if (errors.length > 0) {
      log(`FAIL: ${errors.length} error(s), ${warnings.length} warning(s).`);
    } else {
      log(warnings.length > 0 ? `PASS with ${warnings.length} warning(s).` : 'PASS.');
    }
  }
  return { exitCode: errors.length > 0 ? 1 : 0, errors, warnings, summary };
}

function parseArgs(argv) {
  const opts = { root: ROOT, json: false, verbose: false };
  const rootIdx = argv.indexOf('--root');
  if (rootIdx !== -1) {
    if (!argv[rootIdx + 1]) throw new Error('--root requires a directory argument');
    opts.root = argv[rootIdx + 1];
  }
  opts.json = argv.includes('--json');
  opts.verbose = argv.includes('--verbose');
  const unknown = argv.filter((a) => a.startsWith('--') && !['--root', '--json', '--verbose'].includes(a));
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(', ')}`);
  return opts;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`check-references: ${e.message}`);
    console.error('usage: node scripts/check-references.mjs [--root <dir>] [--json] [--verbose]');
    process.exitCode = 2;
    return;
  }
  try {
    const { exitCode } = await runCheck(opts);
    // exitCode, not process.exit(): a hard exit discards pending
    // piped stdout. Natural exit flushes it first.
    process.exitCode = exitCode;
  } catch (e) {
    console.error(`check-references: ${e.message}`);
    process.exitCode = 2;
  }
}

const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
