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
// Shared skill-file discovery (A2-18).
import { findSkillFiles } from './lib/skill-files.mjs';

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

// Post-audit overrides for the Phase 3 audit cross-check (A3-01).
// The Phase 3 audit table (ai/audits/TECHNICAL-ACCURACY-AUDIT.md)
// is a HISTORICAL record — it is never edited — but a later
// re-audit can legitimately re-label a skill when the evidence
// changes (e.g. the limitation the audit recorded is resolved).
// Such a re-label is recorded here, explicitly, one skill at a
// time: the overridden status, the date of the re-audit decision,
// and the reason. The cross-check accepts the overridden status
// in place of the audit table's and reports the override as a
// warning, so it stays visible in every run — never a silent or
// blanket skip. A skill with no override entry must still agree
// with the audit table exactly, and an override whose status no
// longer matches verification-status.json is itself an error (a
// stale override must not linger unnoticed).
const AUDIT_OVERRIDES = {
  'link-building': {
    status: 'verified',
    date: '2026-11-21',
    reason: 'A3-01: the 6 broken tools/ links were the only limitation; they were resolved by the Phase 4 tools/ import (all 6 targets verified on disk), so the skill is verified.',
  },
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
// A2-02: schema errors are collected into errors[] but execution
// used to continue into semantic checks that dereferenced the very
// keys the schema requires (e.g. compatibility.compatibility, a
// missing skills array), crashing with an uncaught TypeError and
// never printing the collected diagnostics. Every semantic block
// below is therefore guarded on the shape it needs: a file that
// failed schema validation still reports its schema errors, and
// the semantic checks for the missing keys are skipped, not
// crashed into.
const skillsDoc = data.skills;
const skillsValid = Boolean(skillsDoc) && Array.isArray(skillsDoc.skills);
const skillNames = new Set();
const skillByName = new Map();
if (skillsValid) {
  checkDuplicates(skillsDoc.skills.map((s) => s.name), 'registry/skills.json');
  for (const s of skillsDoc.skills) {
    skillNames.add(s.name);
    skillByName.set(s.name, s);
  }
  if (skillsDoc.total_skills !== skillsDoc.skills.length) {
    err(`registry/skills.json: total_skills is ${skillsDoc.total_skills} but ${skillsDoc.skills.length} skills are listed`);
  }
  // Disk paths normalized to POSIX separators so they compare
  // equal to the POSIX paths stored in the registry on Windows
  // too (Stage D, W-3). No-op on POSIX.
  const diskPaths = new Set(
    (await findSkillFiles(path.join(ROOT, 'skills')))
      .map((f) => toPosixPath(path.relative(ROOT, path.dirname(f)))),
  );
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

if (skillsValid && data.categories && Array.isArray(data.categories.categories) && Array.isArray(skillsDoc.categories)) {
  const catNames = new Set(data.categories.categories.map((c) => c.name));
  checkDuplicates(data.categories.categories.map((c) => c.name), 'registry/categories.json');
  const regCats = new Set(skillsDoc.categories);
  for (const c of catNames) if (!regCats.has(c)) err(`registry/categories.json: category '${c}' is not in skills.json categories`);
  for (const c of regCats) if (!catNames.has(c)) err(`registry/skills.json: category '${c}' has no entry in categories.json`);
  for (const c of data.categories.categories) {
    const actual = skillsDoc.skills.filter((s) => s.category === c.name).map((s) => s.name).sort();
    if (c.count !== actual.length) err(`registry/categories.json: category '${c.name}' count is ${c.count} but ${actual.length} skills have that category`);
    // A missing/non-array skill list is a schema error, already
    // recorded; skip the list comparison rather than crashing.
    if (Array.isArray(c.skills)) {
      const listed = [...c.skills].sort();
      if (JSON.stringify(actual) !== JSON.stringify(listed)) err(`registry/categories.json: category '${c.name}' skill list does not match skills.json`);
    }
  }
}

if (skillsValid && data.sources && Array.isArray(data.sources.sources)) {
  const srcById = new Map(data.sources.sources.map((s) => [s.id, s]));
  checkDuplicates(data.sources.sources.map((s) => s.id), 'registry/sources.json');
  for (const s of skillsDoc.skills) {
    if (!srcById.has(s.source)) err(`registry/sources.json: no source entry for '${s.source}' (used by skill '${s.name}')`);
  }
  for (const src of data.sources.sources) {
    const actual = skillsDoc.skills.filter((s) => s.source === src.id).map((s) => s.name).sort();
    if (Array.isArray(src.skills)) {
      const listed = [...src.skills].sort();
      if (JSON.stringify(actual) !== JSON.stringify(listed)) err(`registry/sources.json: source '${src.id}' skill list does not match skills.json`);
    }
  }
}

const compatGroups = data.compatibility?.compatibility;
if (skillsValid && compatGroups && typeof compatGroups === 'object' && !Array.isArray(compatGroups)) {
  const seen = new Map();
  for (const [group, names] of Object.entries(compatGroups)) {
    if (!Array.isArray(names)) continue; // schema error, already recorded
    for (const n of names) {
      if (!skillNames.has(n)) err(`registry/compatibility.json: group '${group}' lists unknown skill '${n}'`);
      if (seen.has(n)) err(`registry/compatibility.json: skill '${n}' appears in two groups ('${seen.get(n)}' and '${group}')`);
      seen.set(n, group);
    }
  }
  for (const n of skillNames) if (!seen.has(n)) err(`registry/compatibility.json: skill '${n}' appears in no group`);
}

const versionSkills = data.versions?.skills;
if (skillsValid && versionSkills && typeof versionSkills === 'object' && !Array.isArray(versionSkills)) {
  const versioned = new Set(Object.keys(versionSkills));
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
  // A missing/non-array list is a schema error, already recorded;
  // return no entries rather than crashing (A2-02).
  if (!Array.isArray(doc[listKey])) return [];
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
    // path.join throws on a non-string path; a missing path is a
    // schema error, already recorded (A2-02).
    if (typeof a.path === 'string' && !existsSync(path.join(ROOT, a.path))) err(`registry/agents.json: agent '${a.name}' path '${a.path}' does not exist`);
    const discoverList = Array.isArray(a.discover) ? a.discover : [];
    const useList = Array.isArray(a.use) ? a.use : [];
    for (const s of [...discoverList, ...useList]) {
      if (!skillNames.has(s)) err(`registry/agents.json: agent '${a.name}' references unknown skill '${s}'`);
    }
    const discover = new Set(discoverList);
    for (const s of useList) {
      if (!discover.has(s)) err(`registry/agents.json: agent '${a.name}' lists '${s}' in use but not in discover`);
    }
  }
}
if (data.workflows) {
  const workflows = await checkAgentWorkflowRegistry(data.workflows, 'workflow', 'workflows');
  workflowNames = new Set(workflows.map((w) => w.name));
  for (const w of workflows) {
    if (typeof w.path === 'string' && !existsSync(path.join(ROOT, w.path))) err(`registry/workflows.json: workflow '${w.name}' path '${w.path}' does not exist`);
    for (const s of Array.isArray(w.skills) ? w.skills : []) {
      if (!skillNames.has(s)) err(`registry/workflows.json: workflow '${w.name}' references unknown skill '${s}'`);
    }
  }
}
for (const [doc, listKey] of [[data.agents, 'agents'], [data.workflows, 'workflows']]) {
  if (!doc || !Array.isArray(doc[listKey])) continue;
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
const verificationStatuses = data['verification-status']?.statuses;
if (skillsValid && verificationStatuses && typeof verificationStatuses === 'object' && !Array.isArray(verificationStatuses)) {
  const vs = verificationStatuses;
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
      const override = AUDIT_OVERRIDES[name];
      if (override) {
        // A dated, reasoned post-audit re-label (see
        // AUDIT_OVERRIDES): the override replaces the audit
        // table's expectation for this skill only. A stale
        // override — one the sidecar no longer matches — is an
        // error, not a silent pass.
        if (entry.status !== override.status) {
          err(`sources/verification-status.json: '${name}' status is '${entry.status}' but the post-audit override (${override.date}) says '${override.status}' — the override is stale or the sidecar disagrees`);
        } else if (entry.status !== expected) {
          warn(`audit cross-check: '${name}' status '${entry.status}' accepted per post-audit override (${override.date}: ${override.reason})`);
        }
        continue;
      }
      if (entry.status !== expected) {
        err(`sources/verification-status.json: '${name}' status is '${entry.status}' but the Phase 3 audit says '${auditStatus}'`);
      }
    }
    // An override for a skill the audit table does not list is
    // stale (or mistyped) — flag it so it cannot linger.
    for (const name of Object.keys(AUDIT_OVERRIDES)) {
      if (!rows.has(name)) warn(`audit cross-check: override for '${name}' matches no Phase 3 audit table row (stale override?)`);
    }
  }
}

for (const e of errors) console.log(`  ERROR ${e}`);
for (const w of warnings) console.log(`  WARN  ${w}`);
const checked = skillsDoc ? `${skillNames.size} skills, ${agentNames.size} agents, ${workflowNames.size} workflows` : 'registry files';
console.log(`Checked ${checked} (schema + references + verification coverage).`);
if (errors.length > 0) {
  console.log(`FAIL: ${errors.length} error(s), ${warnings.length} warning(s).`);
  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout — with 706 errors the FAIL summary is the last write and
  // was lost on CI (PR #4 run 44942929343). Natural exit flushes first.
  process.exitCode = 1;
} else {
  console.log(warnings.length > 0 ? `PASS with ${warnings.length} warning(s).` : 'PASS.');
}
