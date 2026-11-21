#!/usr/bin/env node
// query-skills.mjs — query the SkillForge registry from the command line.
//
// Reads the generated registry files (registry/*.json); it never
// duplicates generator logic. Run `npm run registry` first if the
// registry may be stale.
//
// Usage:
//   node scripts/query-skills.mjs search <query> [--json]
//   node scripts/query-skills.mjs categories [--json]
//   node scripts/query-skills.mjs show <skill> [--json]
//   node scripts/query-skills.mjs deps <skill>
//   node scripts/query-skills.mjs related <skill>
//   node scripts/query-skills.mjs compat [skill]
//   node scripts/query-skills.mjs stale [--days N] [--json]
//   node scripts/query-skills.mjs status [--json]
//   node scripts/query-skills.mjs agents
//   node scripts/query-skills.mjs workflows
//   npm run query -- <command> [args]
//
// `stale` compares last_verified against today's date; it is a query,
// not a generated artifact, so a wall-clock read is correct here.
// `stale` exits 1 when stale skills are found (so CI can alert on it)
// and 0 when nothing is stale.
//
// --root <dir> is for tests; it defaults to the repository root.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW_ARGS = process.argv.slice(2);
const rootIdx = RAW_ARGS.indexOf('--root');
if (rootIdx !== -1 && !RAW_ARGS[rootIdx + 1]) {
  console.error('--root requires a directory argument');
  process.exit(1);
}
const ROOT = rootIdx === -1
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  : path.resolve(RAW_ARGS[rootIdx + 1]);

const USAGE = `SkillForge registry query

Usage: node scripts/query-skills.mjs <command> [args]

Commands:
  search <query>        Search skills by name, description, or category
  categories            List categories with skill counts
  show <skill>          Show full details for one skill
  deps <skill>          Show what uses a skill (agents, workflows) and its related skills
  related <skill>       Show skills related to a skill
  compat [skill]        Show compatibility info (one skill, or all groups)
  stale [--days N]      Skills not verified in the last N days (default 180);
                        exits 1 when any are stale, 0 when none are
  status                Verification-status summary
  agents                List agents
  workflows             List workflows

Options:
  --json                Machine-readable output (search, categories, show, stale, status)
`;

async function loadJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
}

const registry = await loadJson('registry/skills.json');
const categoriesDoc = await loadJson('registry/categories.json');
const agentsDoc = await loadJson('registry/agents.json');
const workflowsDoc = await loadJson('registry/workflows.json');
const verification = await loadJson('sources/verification-status.json');
const byName = new Map(registry.skills.map((s) => [s.name, s]));

// Agents/workflows referencing each skill.
const usedBy = new Map(); // skill -> { agents: [], workflows: [] }
for (const a of agentsDoc.agents) {
  for (const s of new Set([...a.discover, ...a.use])) {
    if (!usedBy.has(s)) usedBy.set(s, { agents: [], workflows: [] });
    usedBy.get(s).agents.push(a.name);
  }
}
for (const w of workflowsDoc.workflows) {
  for (const s of w.skills) {
    if (!usedBy.has(s)) usedBy.set(s, { agents: [], workflows: [] });
    usedBy.get(s).workflows.push(w.name);
  }
}

function out(obj, asJson, human) {
  if (asJson) console.log(JSON.stringify(obj, null, 2));
  else human();
}

// Code-point comparison (A2-07): localeCompare depends on the
// runtime's ICU default locale; query output must sort the same
// on every machine.
function codePointCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function needSkill(name) {
  const s = byName.get(name);
  if (!s) {
    console.error(`Unknown skill '${name}'. Try: node scripts/query-skills.mjs search ${name}`);
    process.exit(1);
  }
  return s;
}

function cmdSearch(query, asJson) {
  const q = query.toLowerCase();
  const scored = [];
  for (const s of registry.skills) {
    const inName = s.name.toLowerCase().includes(q);
    const inDesc = s.description.toLowerCase().includes(q);
    const inCat = s.category.toLowerCase().includes(q);
    if (!inName && !inDesc && !inCat) continue;
    // Rank: name match first, then category, then description-only.
    const score = inName ? 0 : inCat ? 1 : 2;
    scored.push({ score, skill: s });
  }
  scored.sort((a, b) => (a.score - b.score) || codePointCompare(a.skill.name, b.skill.name));
  const results = scored.map(({ skill: s }) => ({
    name: s.name,
    category: s.category,
    status: s.status,
    description: s.description,
  }));
  out(results, asJson, () => {
    if (results.length === 0) {
      console.log(`No skills match '${query}'.`);
      return;
    }
    console.log(`${results.length} skill(s) matching '${query}':\n`);
    for (const s of results) {
      console.log(`  ${s.name} [${s.category}] (${s.status})`);
      console.log(`    ${s.description.slice(0, 160)}${s.description.length > 160 ? '…' : ''}`);
    }
  });
}

function cmdCategories(asJson) {
  const cats = categoriesDoc.categories.map((c) => ({ name: c.name, description: c.description, count: c.count }));
  out(cats, asJson, () => {
    for (const c of cats) console.log(`  ${c.name} (${c.count}) — ${c.description}`);
    console.log(`\n${registry.total_skills} skills in ${cats.length} categories.`);
  });
}

function skillDetail(name) {
  const s = needSkill(name);
  const v = verification.statuses[name] || {};
  const users = usedBy.get(name) || { agents: [], workflows: [] };
  return {
    ...s,
    verification_note: v.note || null,
    used_by_agents: users.agents,
    used_by_workflows: users.workflows,
  };
}

function cmdShow(name, asJson) {
  const d = skillDetail(name);
  out(d, asJson, () => {
    console.log(`${d.name} [${d.category}] — ${d.status}`);
    console.log(`  Path: ${d.path}`);
    console.log(`  Source: ${d.source} (${d.source_type})${d.vendor ? `, vendor: ${d.vendor}` : ''}`);
    console.log(`  Version: ${d.version} · License: ${d.license} · Maintainer: ${d.maintainer}`);
    console.log(`  Last verified: ${d.last_verified || 'never'}`);
    console.log(`  Compatibility: ${d.compatibility || 'any agent implementing the Agent Skills standard'}`);
    console.log(`\n  ${d.description}`);
    if (d.verification_note) console.log(`\n  Verification note: ${d.verification_note}`);
    if (d.related.length > 0) console.log(`\n  Related: ${d.related.join(', ')}`);
    if (d.used_by_agents.length > 0) console.log(`  Used by agents: ${d.used_by_agents.join(', ')}`);
    if (d.used_by_workflows.length > 0) console.log(`  Used by workflows: ${d.used_by_workflows.join(', ')}`);
  });
}

function cmdDeps(name) {
  const s = needSkill(name);
  const users = usedBy.get(name) || { agents: [], workflows: [] };
  console.log(`${name}: no skill in this library declares a hard dependency on another skill.`);
  console.log(`What uses it, and what it relates to:\n`);
  console.log(`  Agents (${users.agents.length}): ${users.agents.join(', ') || 'none'}`);
  console.log(`  Workflows (${users.workflows.length}): ${users.workflows.join(', ') || 'none'}`);
  console.log(`  Related (${s.related.length}): ${s.related.join(', ') || 'none'}`);
}

function cmdRelated(name) {
  const s = needSkill(name);
  if (s.related.length === 0) {
    console.log(`${name} has no related skills (no other skill shares 2+ agents/workflows with it).`);
    return;
  }
  console.log(`Skills related to ${name} (shared agents/workflows):\n`);
  for (const r of s.related) {
    const other = byName.get(r);
    // A2-20: a stale related reference (a skill removed from the
    // registry while another still lists it) used to crash with a
    // TypeError on other.category. Flag it and move on instead —
    // validate-registry normally guards this, but a read-only
    // query must not crash on an inconsistent registry.
    if (!other) {
      console.log(`  ${r} [unknown] (stale related reference — not in the registry)`);
      continue;
    }
    console.log(`  ${r} [${other.category}] (${other.status})`);
    console.log(`    ${other.description.slice(0, 140)}${other.description.length > 140 ? '…' : ''}`);
  }
}

function cmdCompat(name) {
  if (name) {
    const s = needSkill(name);
    console.log(`${name}: ${s.compatibility || 'any agent implementing the Agent Skills standard'}`);
    return;
  }
  const compat = {};
  for (const s of registry.skills) {
    const key = s.compatibility || 'any agent implementing the Agent Skills standard';
    compat[key] = (compat[key] || 0) + 1;
  }
  const groups = Object.entries(compat).sort((a, b) => b[1] - a[1]);
  console.log(`${groups.length} compatibility groups:\n`);
  for (const [group, count] of groups) console.log(`  ${count} skill(s): ${group}`);
}

function cmdStale(days, asJson) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const stale = registry.skills
    .filter((s) => !s.last_verified || s.last_verified < cutoffStr)
    .map((s) => ({ name: s.name, category: s.category, status: s.status, last_verified: s.last_verified }))
    .sort((a, b) => codePointCompare(a.last_verified || '', b.last_verified || '') || codePointCompare(a.name, b.name));
  out({ days, cutoff: cutoffStr, count: stale.length, skills: stale }, asJson, () => {
    if (stale.length === 0) {
      console.log(`No skills are stale (all verified within the last ${days} days, cutoff ${cutoffStr}).`);
      return;
    }
    console.log(`${stale.length} skill(s) not verified in the last ${days} days (cutoff ${cutoffStr}):\n`);
    for (const s of stale) console.log(`  ${s.name} [${s.category}] (${s.status}) — last verified ${s.last_verified || 'never'}`);
  });
  // Exit 1 when stale skills exist so scheduled CI can alert on it.
  if (stale.length > 0) process.exitCode = 1;
}

function cmdStatus(asJson) {
  // All four known statuses are always present (zero when absent), so the
  // --json output has a stable schema and "0 unverified" is explicit
  // rather than a missing key.
  const counts = { verified: 0, 'verified-with-limitations': 0, 'needs-correction': 0, unverified: 0 };
  for (const s of registry.skills) counts[s.status] = (counts[s.status] || 0) + 1;
  const needs = registry.skills.filter((s) => s.status === 'needs-correction').map((s) => s.name).sort();
  const result = { total: registry.total_skills, counts, needs_correction: needs };
  out(result, asJson, () => {
    console.log(`Verification status (${result.total} skills):`);
    for (const [status, n] of Object.entries(counts).sort()) console.log(`  ${status}: ${n}`);
    if (needs.length > 0) console.log(`\nNeeds correction (fix venue: upstream repo): ${needs.join(', ')}`);
  });
}

function cmdAgents() {
  for (const a of agentsDoc.agents) {
    console.log(`  ${a.name} — ${a.title}`);
    console.log(`    ${a.description}`);
  }
  console.log(`\n${agentsDoc.total_agents} agents.`);
}

function cmdWorkflows() {
  for (const w of workflowsDoc.workflows) {
    console.log(`  ${w.name} — ${w.title}`);
    console.log(`    ${w.description}`);
  }
  console.log(`\n${workflowsDoc.total_workflows} workflows.`);
}

const asJson = RAW_ARGS.includes('--json');
// Strip --root <dir> (handled above) and --json before parsing the command.
const args = RAW_ARGS.filter((a, i) => {
  if (a === '--json') return false;
  if (a === '--root' || (rootIdx !== -1 && i === rootIdx + 1)) return false;
  return true;
});
const [cmd, ...rest] = args;

switch (cmd) {
  case 'search':
    if (!rest[0]) { console.error('Usage: query search <query>'); process.exit(1); }
    cmdSearch(rest.join(' '), asJson);
    break;
  case 'categories':
    cmdCategories(asJson);
    break;
  case 'show':
    if (!rest[0]) { console.error('Usage: query show <skill>'); process.exit(1); }
    cmdShow(rest[0], asJson);
    break;
  case 'deps':
    if (!rest[0]) { console.error('Usage: query deps <skill>'); process.exit(1); }
    cmdDeps(rest[0]);
    break;
  case 'related':
    if (!rest[0]) { console.error('Usage: query related <skill>'); process.exit(1); }
    cmdRelated(rest[0]);
    break;
  case 'compat':
    cmdCompat(rest[0] || null);
    break;
  case 'stale': {
    let days = 180;
    const di = rest.indexOf('--days');
    if (di !== -1) {
      days = parseInt(rest[di + 1], 10);
      if (!Number.isInteger(days) || days < 0) { console.error('--days must be a non-negative integer'); process.exit(1); }
    }
    cmdStale(days, asJson);
    break;
  }
  case 'status':
    cmdStatus(asJson);
    break;
  case 'agents':
    cmdAgents();
    break;
  case 'workflows':
    cmdWorkflows();
    break;
  case 'help':
  case '--help':
  case undefined:
    console.log(USAGE);
    break;
  default:
    console.error(`Unknown command '${cmd}'.\n`);
    console.log(USAGE);
    process.exit(1);
}
