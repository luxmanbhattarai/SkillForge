#!/usr/bin/env node
// validate-registry.mjs — validates every registry file against its
// JSON Schema (scripts/schemas/) and runs the semantic checks schemas
// cannot express: references resolve, paths exist on disk, names are
// unique, totals match, verification coverage is complete, and the
// verification sidecar agrees with the Phase 3 audit table.
//
// Usage: node scripts/validate-registry.mjs [--root <dir>]
//   npm run check:registry
// --root is for tests; it defaults to the repository root.
// Exit code 1 on any error; warnings do not fail the run.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema } from './lib/schema-validate.mjs';
import { toPosixPath } from './lib/paths.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const args = process.argv.slice(2);
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx === -1 ? DEFAULT_ROOT : path.resolve(args[rootIdx + 1] || DEFAULT_ROOT);

const STATUSES = ['verified', 'verified-with-limitations', 'needs-correction', 'unverified'];
const AUDIT_STATUS_MAP = {
  Verified: 'verified',
  'Verified with limitations': 'verified-with-limitations',
  'Needs correction': 'needs-correction',
};

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

async function loadJson(rel) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    err(`${rel}: cannot load (${e.code === 'ENOENT' ? 'missing file' : e.message})`);
    return null;
  }
}

async function loadSchema(name) {
  return JSON.parse(await readFile(path.join(SCRIPT_DIR, 'schemas', `${name}.schema.json`), 'utf8'));
}

async function findSkillFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findSkillFiles(full));
    // Normalized to POSIX separators so disk paths compare equal
    // to the POSIX paths stored in the registry on Windows too
    // (Stage D, W-3). No-op on POSIX.
    else if (e.name === 'SKILL.md') out.push(toPosixPath(path.relative(ROOT, path.dirname(full))));
  }
  return out;
}

function checkDuplicates(names, what) {
  const seen = new Set();
  for (const n of names) {
    if (seen.has(n)) err(`${what}: duplicate name '${n}'`);
    seen.add(n);
  }
}

// --- load + schema-validate every registry file ---
const FILES = [
  ['registry/skills.json', 'skills'],
  ['registry/categories.json', 'categories'],
  ['registry/sources.json', 'sources'],
  ['registry/compatibility.json', 'compatibility'],
  ['registry/versions.json', 'versions'],
  ['registry/agents.json', 'agents'],
  ['registry/workflows.json', 'workflows'],
  ['sources/verification-status.json', 'verification-status'],
];
const data = {};
for (const [rel, schemaName] of FILES) {
  const doc = await loadJson(rel);
  if (!doc) continue;
  data[schemaName] = doc;
  const schema = await loadSchema(schemaName);
  for (const e of validateAgainstSchema(doc, schema)) err(`${rel}: ${e}`);
}

// --- semantic checks (only for files that loaded) ---
const skillsDoc = data.skills;
const skillNames = new Set();
const skillByName = new Map();
if (skillsDoc) {
  checkDuplicates(skillsDoc.skills.map((s) => s.name), 'registry/skills.json');
  for (const s of skillsDoc.skills) {
    skillNames.add(s.name);
    skillByName.set(s.name, s);
  }
  if (skillsDoc.total_skills !== skillsDoc.skills.length) {
    err(`registry/skills.json: total_skills is ${skillsDoc.total_skills} but ${skillsDoc.skills.length} skills are listed`);
  }
  const diskPaths = new Set(await findSkillFiles(path.join(ROOT, 'skills')));
  const regPaths = new Set(skillsDoc.skills.map((s) => s.path));
  for (const p of regPaths) if (!diskPaths.has(p)) err(`registry/skills.json: lists missing skill path '${p}'`);
  for (const p of diskPaths) if (!regPaths.has(p)) err(`registry/skills.json: skill on disk missing from registry: '${p}'`);
  for (const s of skillsDoc.skills) {
    if (!STATUSES.includes(s.status)) err(`registry/skills.json: skill '${s.name}' has unknown status '${s.status}'`);
    for (const r of s.related || []) {
      if (r === s.name) err(`registry/skills.json: skill '${s.name}' lists itself in related`);
      else if (!skillNames.has(r)) err(`registry/skills.json: skill '${s.name}' lists unknown related skill '${r}'`);
    }
  }
}

if (skillsDoc && data.categories) {
  const catNames = new Set(data.categories.categories.map((c) => c.name));
  checkDuplicates(data.categories.categories.map((c) => c.name), 'registry/categories.json');
  const regCats = new Set(skillsDoc.categories);
  for (const c of catNames) if (!regCats.has(c)) err(`registry/categories.json: category '${c}' is not in skills.json categories`);
  for (const c of regCats) if (!catNames.has(c)) err(`registry/skills.json: category '${c}' has no entry in categories.json`);
  for (const c of data.categories.categories) {
    const actual = skillsDoc.skills.filter((s) => s.category === c.name).map((s) => s.name).sort();
    const listed = [...c.skills].sort();
    if (c.count !== actual.length) err(`registry/categories.json: category '${c.name}' count is ${c.count} but ${actual.length} skills have that category`);
    if (JSON.stringify(actual) !== JSON.stringify(listed)) err(`registry/categories.json: category '${c.name}' skill list does not match skills.json`);
  }
}

if (skillsDoc && data.sources) {
  const srcById = new Map(data.sources.sources.map((s) => [s.id, s]));
  checkDuplicates(data.sources.sources.map((s) => s.id), 'registry/sources.json');
  for (const s of skillsDoc.skills) {
    if (!srcById.has(s.source)) err(`registry/sources.json: no source entry for '${s.source}' (used by skill '${s.name}')`);
  }
  for (const src of data.sources.sources) {
    const actual = skillsDoc.skills.filter((s) => s.source === src.id).map((s) => s.name).sort();
    const listed = [...src.skills].sort();
    if (JSON.stringify(actual) !== JSON.stringify(listed)) err(`registry/sources.json: source '${src.id}' skill list does not match skills.json`);
  }
}

if (skillsDoc && data.compatibility) {
  const seen = new Map();
  for (const [group, names] of Object.entries(data.compatibility.compatibility)) {
    for (const n of names) {
      if (!skillNames.has(n)) err(`registry/compatibility.json: group '${group}' lists unknown skill '${n}'`);
      if (seen.has(n)) err(`registry/compatibility.json: skill '${n}' appears in two groups ('${seen.get(n)}' and '${group}')`);
      seen.set(n, group);
    }
  }
  for (const n of skillNames) if (!seen.has(n)) err(`registry/compatibility.json: skill '${n}' appears in no group`);
}

if (skillsDoc && data.versions) {
  const versioned = new Set(Object.keys(data.versions.skills));
  for (const n of skillNames) if (!versioned.has(n)) err(`registry/versions.json: no version for skill '${n}'`);
  for (const n of versioned) if (!skillNames.has(n)) err(`registry/versions.json: version for unknown skill '${n}'`);
  for (const s of skillsDoc.skills) {
    if (data.versions.skills[s.name] !== undefined && data.versions.skills[s.name] !== s.version) {
      err(`registry/versions.json: version for '${s.name}' (${data.versions.skills[s.name]}) does not match skills.json (${s.version})`);
    }
  }
}

async function checkAgentWorkflowRegistry(doc, kind, dir) {
  const totalKey = kind === 'agent' ? 'total_agents' : 'total_workflows';
  const listKey = kind === 'agent' ? 'agents' : 'workflows';
  checkDuplicates(doc[listKey].map((x) => x.name), `registry/${listKey}.json`);
  if (doc[totalKey] !== doc[listKey].length) {
    err(`registry/${listKey}.json: ${totalKey} is ${doc[totalKey]} but ${doc[listKey].length} are listed`);
  }
  const diskNames = new Set(
    (await readdir(path.join(ROOT, dir)).catch(() => []))
      .filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)),
  );
  const regNames = new Set(doc[listKey].map((x) => x.name));
  for (const n of regNames) if (!diskNames.has(n)) err(`registry/${listKey}.json: lists missing ${kind} '${n}'`);
  for (const n of diskNames) if (!regNames.has(n)) err(`registry/${listKey}.json: ${kind} on disk missing from registry: '${n}'`);
  return doc[listKey];
}

let agentNames = new Set();
let workflowNames = new Set();
if (data.agents) {
  const agents = await checkAgentWorkflowRegistry(data.agents, 'agent', 'agents');
  agentNames = new Set(agents.map((a) => a.name));
  for (const a of agents) {
    if (!existsSync(path.join(ROOT, a.path))) err(`registry/agents.json: agent '${a.name}' path '${a.path}' does not exist`);
    for (const s of [...a.discover, ...a.use]) {
      if (!skillNames.has(s)) err(`registry/agents.json: agent '${a.name}' references unknown skill '${s}'`);
    }
    const discover = new Set(a.discover);
    for (const s of a.use) {
      if (!discover.has(s)) err(`registry/agents.json: agent '${a.name}' lists '${s}' in use but not in discover`);
    }
  }
}
if (data.workflows) {
  const workflows = await checkAgentWorkflowRegistry(data.workflows, 'workflow', 'workflows');
  workflowNames = new Set(workflows.map((w) => w.name));
  for (const w of workflows) {
    if (!existsSync(path.join(ROOT, w.path))) err(`registry/workflows.json: workflow '${w.name}' path '${w.path}' does not exist`);
    for (const s of w.skills) {
      if (!skillNames.has(s)) err(`registry/workflows.json: workflow '${w.name}' references unknown skill '${s}'`);
    }
  }
}
for (const [doc, listKey] of [[data.agents, 'agents'], [data.workflows, 'workflows']]) {
  if (!doc) continue;
  for (const x of doc[listKey]) {
    for (const a of x.references?.agents || []) {
      if (!agentNames.has(a)) err(`registry/${listKey}.json: '${x.name}' references unknown agent '${a}'`);
    }
    for (const w of x.references?.workflows || []) {
      if (!workflowNames.has(w)) err(`registry/${listKey}.json: '${x.name}' references unknown workflow '${w}'`);
    }
  }
}

// Generated dates must agree across the registry.
const generated = new Set(
  [data.skills?.generated, data.versions?.generated, data.agents?.generated, data.workflows?.generated].filter(Boolean),
);
if (generated.size > 1) {
  err(`registry generated dates disagree: ${[...generated].join(', ')} (skills/versions/agents/workflows must share one)`);
}

// --- verification coverage + audit cross-check ---
if (skillsDoc && data['verification-status']) {
  const vs = data['verification-status'].statuses;
  for (const n of skillNames) {
    if (!vs[n]) err(`sources/verification-status.json: no entry for skill '${n}'`);
  }
  for (const n of Object.keys(vs)) {
    if (!skillNames.has(n)) err(`sources/verification-status.json: entry for unknown skill '${n}'`);
  }
  // Cross-check against the Phase 3 audit table (the evidence).
  const auditPath = path.join(ROOT, 'ai/audits/TECHNICAL-ACCURACY-AUDIT.md');
  let auditText = null;
  try {
    auditText = await readFile(auditPath, 'utf8');
  } catch {
    warn(`ai/audits/TECHNICAL-ACCURACY-AUDIT.md not found; skipping audit cross-check`);
  }
  if (auditText) {
    const rows = new Map();
    let inTable = false;
    for (const line of auditText.split('\n')) {
      if (line.startsWith('## Per-skill status table')) { inTable = true; continue; }
      if (inTable && line.startsWith('## ') && !line.includes('Per-skill')) break;
      if (!inTable) continue;
      const m = line.match(/^\| `([^`]+)` \| \S+ \| \S+ \| ([^|]+) \|/);
      if (m) rows.set(m[1], m[2].trim());
    }
    if (rows.size === 0) {
      warn('audit table parsed to 0 rows; cross-check skipped (table format may have changed)');
    }
    for (const [name, auditStatus] of rows) {
      const expected = AUDIT_STATUS_MAP[auditStatus];
      if (!expected) { warn(`audit table: unmapped status '${auditStatus}' for '${name}'`); continue; }
      const entry = vs[name];
      if (!entry) continue; // already reported above
      if (entry.status !== expected) {
        err(`sources/verification-status.json: '${name}' status is '${entry.status}' but the Phase 3 audit says '${auditStatus}'`);
      }
    }
  }
}

for (const e of errors) console.log(`  ERROR ${e}`);
for (const w of warnings) console.log(`  WARN  ${w}`);
const checked = skillsDoc ? `${skillNames.size} skills, ${agentNames.size} agents, ${workflowNames.size} workflows` : 'registry files';
console.log(`Checked ${checked} (schema + references + verification coverage).`);
if (errors.length > 0) {
  console.log(`FAIL: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(warnings.length > 0 ? `PASS with ${warnings.length} warning(s).` : 'PASS.');
