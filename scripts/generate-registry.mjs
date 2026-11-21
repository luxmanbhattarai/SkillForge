#!/usr/bin/env node
// generate-registry.mjs — rebuilds registry/*.json from the content on disk.
// The registry is always generated, never hand-edited. Run after adding,
// removing, or renaming any skill, agent, or workflow.
//
// Outputs: skills.json, categories.json, sources.json,
// compatibility.json, versions.json, agents.json, workflows.json.
//
// Determinism: output depends only on the content on disk. The `generated`
// date is the newest last_verified across all skills — NOT the wall-clock
// date — so regenerating on a different day produces no diff. (CI fails
// the build if regeneration differs; a wall-clock date broke that.)
//
// Verification status (M-01): each skill's `status` comes from
// sources/verification-status.json, derived from the Phase 3 technical
// accuracy audit (ai/audits/TECHNICAL-ACCURACY-AUDIT.md). A skill with
// no entry defaults to `unverified` with a warning — never to
// `verified`. See ai/decisions/2026-11-20-verification-status-sidecar.md.
//
// Related skills: derived from agent/workflow co-occurrence — two skills
// are related when the same agent discovers both or the same workflow
// references both (min. 2 shared contexts, top 5, deterministic order).
// See ai/decisions/2026-11-20-related-skills-derivation.md.
//
// Usage: node scripts/generate-registry.mjs

import { readdir, readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter } from './lib/frontmatter.mjs';
import { toPosixPath } from './lib/paths.mjs';
import { extractSection, extractSkillTokens, extractTitle, extractDescription, classifyToken } from './lib/agents-workflows.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_DIR = path.join(ROOT, 'registry');
const VERSION = '1.0.0';

// Date the upstream imports were verified (see sources/research-log.md).
// Used as last_verified for upstream skills, whose frontmatter carries none.
const UPSTREAM_VERIFIED_DATE = '2026-11-20';

// Static registry data lives in data files, not in this generator (L-07).
const KNOWN_SOURCES = JSON.parse(await readFile(path.join(ROOT, 'scripts/lib/registry-sources.json'), 'utf8'));
const CATEGORY_DESCRIPTIONS = JSON.parse(await readFile(path.join(ROOT, 'scripts/lib/category-descriptions.json'), 'utf8'));

// Verification status per skill (M-01). Missing entries default to
// `unverified` below; `npm run check:registry` errors on the gap.
const VERIFICATION = JSON.parse(await readFile(path.join(ROOT, 'sources/verification-status.json'), 'utf8')).statuses;

async function findSkillFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findSkillFiles(full));
    else if (e.name === 'SKILL.md') out.push(full);
  }
  return out;
}

const skills = [];
for (const file of (await findSkillFiles(path.join(ROOT, 'skills'))).sort()) {
  // Normalized to POSIX separators: registry paths are stored
  // POSIX-style, and a Windows regeneration must produce the same
  // output (Stage D, W-3). No-op on POSIX.
  const relDir = toPosixPath(path.relative(ROOT, path.dirname(file))); // skills/<cat>/<name> or skills/upstream/<vendor>/<name>
  const parts = relDir.split('/');
  const text = await readFile(file, 'utf8');
  const { raw } = splitFrontmatter(text);
  const { data } = parseFrontmatter(raw || '');
  if (!data?.name) { console.warn(`WARN: skipping ${relDir} (no frontmatter name)`); continue; }
  const isUpstream = parts[1] === 'upstream';
  const vendor = isUpstream ? parts[2] : null;
  const md = (data.metadata && typeof data.metadata === 'object') ? data.metadata : {};
  const verification = VERIFICATION[data.name];
  if (!verification) console.warn(`WARN: ${data.name} has no verification-status entry (defaulting to unverified)`);
  skills.push({
    name: data.name,
    description: (data.description || '').slice(0, 1024),
    path: relDir,
    category: isUpstream ? 'upstream' : parts[1],
    vendor: vendor || null,
    source_type: isUpstream ? 'upstream' : 'original',
    source: isUpstream ? vendor : 'original',
    status: verification?.status || 'unverified',
    version: md.version || '1.0.0',
    license: data.license || (KNOWN_SOURCES[vendor]?.license ?? 'MIT'),
    maintainer: md.maintainer || md.author || (isUpstream ? vendor : 'skills-library'),
    compatibility: data.compatibility || null,
    last_verified: md.last_verified || (isUpstream ? UPSTREAM_VERIFIED_DATE : null),
  });
}

skills.sort((a, b) => a.name.localeCompare(b.name));
const skillNames = new Set(skills.map((s) => s.name));

// --- agents and workflows (M-10) ---
const agentFiles = (await readdir(path.join(ROOT, 'agents'))).filter((f) => f.endsWith('.md')).sort();
const workflowFiles = (await readdir(path.join(ROOT, 'workflows'))).filter((f) => f.endsWith('.md')).sort();
const index = {
  skills: skillNames,
  agents: new Set(agentFiles.map((f) => f.slice(0, -3))),
  workflows: new Set(workflowFiles.map((f) => f.slice(0, -3))),
};
const fileExists = () => false; // registry generation only classifies name tokens, not paths

// Backticked tokens in a file that resolve to agents/workflows (not self).
function referencedPeers(text, selfName) {
  const agents = new Set();
  const workflows = new Set();
  for (const m of text.matchAll(/`([^`]+)`/g)) {
    const found = classifyToken(m[1], index, fileExists);
    if (found.kind === 'agent' && found.target !== selfName) agents.add(found.target);
    if (found.kind === 'workflow' && found.target !== selfName) workflows.add(found.target);
  }
  return { agents: [...agents].sort(), workflows: [...workflows].sort() };
}

const agents = [];
for (const file of agentFiles) {
  const name = file.slice(0, -3);
  const text = await readFile(path.join(ROOT, 'agents', file), 'utf8');
  const discover = [...extractSkillTokens(extractSection(text, 'Skills it can discover'))]
    .filter((s) => skillNames.has(s)).sort();
  const use = [...extractSkillTokens(extractSection(text, 'Skills it should use'))]
    .filter((s) => skillNames.has(s)).sort();
  agents.push({
    name,
    title: extractTitle(text),
    description: extractDescription(text),
    path: `agents/${file}`,
    discover,
    use,
    references: referencedPeers(text, name),
  });
}

const workflows = [];
for (const file of workflowFiles) {
  const name = file.slice(0, -3);
  const text = await readFile(path.join(ROOT, 'workflows', file), 'utf8');
  const stepsSkills = [...extractSkillTokens(extractSection(text, 'Steps'))]
    .filter((s) => skillNames.has(s)).sort();
  workflows.push({
    name,
    title: extractTitle(text),
    description: extractDescription(text),
    path: `workflows/${file}`,
    skills: stepsSkills,
    references: referencedPeers(text, name),
  });
}

// --- related skills from co-occurrence ---
const cooccur = new Map(); // skill -> Map(other skill -> count)
function countSet(set) {
  const list = [...set];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]];
      if (!cooccur.has(a)) cooccur.set(a, new Map());
      if (!cooccur.has(b)) cooccur.set(b, new Map());
      cooccur.get(a).set(b, (cooccur.get(a).get(b) || 0) + 1);
      cooccur.get(b).set(a, (cooccur.get(b).get(a) || 0) + 1);
    }
  }
}
for (const a of agents) countSet(new Set(a.discover));
for (const w of workflows) countSet(new Set(w.skills));
for (const s of skills) {
  const counts = cooccur.get(s.name) || new Map();
  s.related = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((x, y) => (y[1] - x[1]) || x[0].localeCompare(y[0]))
    .slice(0, 5)
    .map(([name]) => name);
}

// Deterministic generation date: newest last_verified on disk. The
// fallback is unreachable in practice (the validator requires
// last_verified on every original skill) and is pinned so output stays
// deterministic even if it ever triggers.
const GENERATED = skills.map((s) => s.last_verified).filter(Boolean).sort().pop() || '2026-11-20';

// categories.json
const categories = {};
for (const s of skills) {
  categories[s.category] = categories[s.category] || { name: s.category, description: CATEGORY_DESCRIPTIONS[s.category] || '', count: 0, skills: [] };
  categories[s.category].count++;
  categories[s.category].skills.push(s.name);
}

// sources.json — only sources actually used
const usedSources = [...new Set(skills.map((s) => s.source))];
const sources = usedSources.map((id) => {
  const known = KNOWN_SOURCES[id];
  if (!known) return { id, type: 'unknown', name: id, url: '', license: '', skills: skills.filter((s) => s.source === id).map((s) => s.name) };
  return { ...known, skills: skills.filter((s) => s.source === id).map((s) => s.name) };
});

// compatibility.json — skills grouped by compatibility requirement
const compatibility = {};
for (const s of skills) {
  const key = s.compatibility || 'any agent implementing the Agent Skills standard';
  compatibility[key] = compatibility[key] || [];
  compatibility[key].push(s.name);
}

// versions.json
const versions = { registry_version: VERSION, generated: GENERATED, skills: {} };
for (const s of skills) versions.skills[s.name] = s.version;

await mkdir(REGISTRY_DIR, { recursive: true });
// A-37: writes are atomic (temp file in the same directory + rename).
// A plain writeFile leaves a partially-written file visible to any
// concurrent reader — the test suite runs the generator against the
// real repo while other test files read registry/skills.json, and a
// mid-write read parses as truncated JSON (proven: 20 partial reads
// in 30 generator runs under a concurrent reader). rename is atomic
// on POSIX and Windows (same volume), so readers always see the old
// or the new file, never a half-written one. The pid suffix keeps
// concurrent generator runs from sharing a temp name.
const write = async (name, obj) => {
  const target = path.join(REGISTRY_DIR, name);
  const tmp = `${target}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(obj, null, 2) + '\n');
  await rename(tmp, target);
};
await write('skills.json', {
  name: 'skillforge',
  version: VERSION,
  generated: GENERATED,
  categories: Object.keys(categories).sort(),
  total_skills: skills.length,
  skills,
});
await write('categories.json', { version: VERSION, categories: Object.values(categories).sort((a, b) => a.name.localeCompare(b.name)) });
await write('sources.json', { version: VERSION, sources });
await write('compatibility.json', { version: VERSION, compatibility });
await write('versions.json', versions);
await write('agents.json', { version: VERSION, generated: GENERATED, total_agents: agents.length, agents });
await write('workflows.json', { version: VERSION, generated: GENERATED, total_workflows: workflows.length, workflows });

console.log(`Registry generated: ${skills.length} skills, ${Object.keys(categories).length} categories, ${sources.length} sources, ${agents.length} agents, ${workflows.length} workflows.`);
for (const c of Object.values(categories).sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`  ${c.name}: ${c.count}`);
}
