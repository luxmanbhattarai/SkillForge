#!/usr/bin/env node
// run-evals.mjs — behavioral evaluation runner for SkillForge.
//
// Runs eval cases through an agent provider (default: deterministic
// mock agent — no network, no API keys) and scores the observed
// behavior. Writes a machine-readable report and a Markdown summary.
//
// Reports never present a single percentage as proof of quality: they
// report pass rate, failure rate, critical failures, regression count,
// and coverage per category, plus limitations.
//
// Usage:
//   npm run evals [-- --provider mock|model] [--cases <filter>]
//                 [--cases-file <path>] [--out <dir>]
//                 [--save-baseline] [--no-compare] [--report-only] [--json]
// Exit code 1 if any case fails (unless --report-only), 0 otherwise.
// Exit code 2 on a framework error (bad case file, unknown skill, ...).
//
// Report locations (never mixed):
//   mock  (default) -> evals/reports/latest.json + latest.md
//   model           -> evals/reports/model/latest.json + latest.md
//   --out <dir>     -> <dir>/latest.json + latest.md (both providers;
//                      use this for throwaway runs, e.g. the npm test
//                      smoke test, so the committed report is never
//                      clobbered by a partial run)
// Baselines are mock-only: --save-baseline with --provider model is
// refused, and model runs are never compared against the mock
// baseline. A model run and a mock run answer different questions;
// comparing them as regressions would be meaningless.

import { mkdir, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWriteFile } from '../../scripts/lib/atomic-write.mjs';
import { createProvider } from './providers.mjs';
import { scoreSelection } from '../scorers/selection.mjs';
import { scoreContent } from '../scorers/content.mjs';
import { scoreRefusal } from '../scorers/refusal.mjs';
import { scoreCode } from '../scorers/code.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVALS_DIR = path.join(ROOT, 'evals');
const CASES_DIR = path.join(EVALS_DIR, 'cases');
const GENERATED_FILE = path.join(EVALS_DIR, 'datasets', 'discovery-generated.json');
const REPORTS_DIR = path.join(EVALS_DIR, 'reports');
const BASELINES_DIR = path.join(EVALS_DIR, 'baselines');
const CURRENT_BASELINE = path.join(BASELINES_DIR, 'current.json');

export const CATEGORIES = [
  'skill-discovery', 'skill-selection', 'trigger-accuracy',
  'instruction-following', 'technical-correctness', 'code-generation',
  'security-compliance', 'error-handling', 'negative-case-handling',
  'hallucination-resistance', 'tool-use-correctness', 'output-quality',
];
const TYPES = ['positive', 'negative', 'ambiguous', 'edge', 'regression', 'security'];

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const PROVIDER_NAME = flagValue('--provider') || 'mock';
const CASE_FILTER = flagValue('--cases');
const CASES_FILE = flagValue('--cases-file');
const OUT_DIR = flagValue('--out');
const SAVE_BASELINE = args.includes('--save-baseline');
const NO_COMPARE = args.includes('--no-compare');
const REPORT_ONLY = args.includes('--report-only');
const JSON_OUT = args.includes('--json');

async function loadCases() {
  const cases = [];
  const files = (await readdir(CASES_DIR).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = JSON.parse(await readFile(path.join(CASES_DIR, f), 'utf8'));
    const list = Array.isArray(data) ? data : (data.cases || []);
    for (const c of list) cases.push({ ...c, _file: `cases/${f}` });
  }
  if (existsSync(GENERATED_FILE)) {
    const data = JSON.parse(await readFile(GENERATED_FILE, 'utf8'));
    const list = Array.isArray(data) ? data : (data.cases || []);
    for (const c of list) cases.push({ ...c, source: 'generated', _file: 'datasets/discovery-generated.json' });
  }
  return cases;
}

// Exported for unit tests (test/evals.test.mjs exercises the
// unknown-skill rejection path directly; importing this module does
// not run the suite — main() only runs when invoked as a script).
export function validateCases(cases, registry) {
  const errors = [];
  const seen = new Set();
  const skillNames = new Set(registry.skills.map((s) => s.name));
  for (const c of cases) {
    const where = `${c._file} (${c.id || 'no id'})`;
    if (!c.id || typeof c.id !== 'string') errors.push(`${where}: missing id`);
    else if (seen.has(c.id)) errors.push(`${where}: duplicate id ${c.id}`);
    else seen.add(c.id);
    if (!CATEGORIES.includes(c.category)) errors.push(`${where}: unknown category "${c.category}"`);
    if (!TYPES.includes(c.type)) errors.push(`${where}: unknown type "${c.type}"`);
    if (!c.input || typeof c.input !== 'string') errors.push(`${where}: missing input`);
    if (c.skill && !skillNames.has(c.skill)) errors.push(`${where}: unknown skill "${c.skill}"`);
    const expected = c.expected || {};
    for (const s of expected.skills || []) {
      if (!skillNames.has(s)) errors.push(`${where}: unknown expected skill "${s}"`);
    }
    for (const s of expected.notSkills || []) {
      if (!skillNames.has(s)) errors.push(`${where}: unknown notSkill "${s}"`);
    }
    if (expected.fixture && !existsSync(path.join(EVALS_DIR, 'fixtures', expected.fixture + '.mjs'))) {
      errors.push(`${where}: missing fixture "${expected.fixture}"`);
    }
    if (expected.topN !== undefined && (!Number.isInteger(expected.topN) || expected.topN < 1)) {
      errors.push(`${where}: topN must be a positive integer`);
    }
    if (!expected.skills && !expected.notSkills && !expected.mustInclude && !expected.mustExclude
      && !expected.tools && !expected.forbiddenTools && !expected.code && !expected.fixture
      && expected.refuse === undefined) {
      errors.push(`${where}: no expectations (nothing to score)`);
    }
  }
  return errors;
}

function isCritical(evalCase, result) {
  if (result.pass) return false;
  if (evalCase.category === 'security-compliance') return true;
  if (evalCase.expected && evalCase.expected.refuse === true) return true;
  return false;
}

async function scoreCase(evalCase, observation) {
  const expected = evalCase.expected || {};
  let checks = [];
  if (expected.skills || expected.notSkills) checks.push(...scoreSelection(evalCase, observation));
  if (expected.mustInclude || expected.mustExclude || expected.tools || expected.forbiddenTools) {
    checks.push(...scoreContent(evalCase, observation));
  }
  if (evalCase.category === 'code-generation' || expected.code || expected.fixture) {
    checks.push(...await scoreCode(evalCase, observation));
  }
  checks.push(...scoreRefusal(evalCase, observation));
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  return {
    checks,
    score: checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0,
    pass: failed.length === 0,
    failureReason: failed.length > 0 ? failed.map((c) => `${c.name}: ${c.detail}`).join(' | ') : null,
  };
}

function summarize(results, cases, registry) {
  const byCategory = {};
  for (const cat of CATEGORIES) byCategory[cat] = { total: 0, passed: 0, failed: 0, critical: 0 };
  const byType = {};
  for (const t of TYPES) byType[t] = { total: 0, passed: 0, failed: 0 };
  const bySource = { 'hand-written': { total: 0, passed: 0 }, generated: { total: 0, passed: 0 } };
  const covered = new Set();
  let criticalFailures = 0;
  for (const r of results) {
    const cat = byCategory[r.category];
    cat.total++;
    if (r.pass) cat.passed++; else { cat.failed++; if (r.critical) { cat.critical++; criticalFailures++; } }
    const type = byType[r.type];
    type.total++;
    if (r.pass) type.passed++; else type.failed++;
    const src = bySource[r.source] || bySource['hand-written'];
    src.total++;
    if (r.pass) src.passed++;
    // Coverage counts skills the agent actually selected, not the
    // case's declared skill field: adding r.skill here made 277/277
    // follow from case authorship even if the agent selected nothing
    // (A-17). A skill counts as covered only when some run selected it.
    for (const s of r.selectedSkills || []) covered.add(s);
  }
  const passed = results.filter((r) => r.pass).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length > 0 ? +(passed / results.length).toFixed(3) : 0,
    criticalFailures,
    byCategory,
    byType,
    bySource,
    coverage: {
      skillsCovered: covered.size,
      skillsTotal: registry.skills.length,
      coverageRate: +(covered.size / registry.skills.length).toFixed(3),
    },
  };
}

function compareToBaseline(results, baseline) {
  const before = new Map((baseline.results || []).map((r) => [r.id, r.pass]));
  const regressions = [];
  const fixes = [];
  const added = [];
  const seen = new Set();
  for (const r of results) {
    seen.add(r.id);
    if (!before.has(r.id)) { added.push(r.id); continue; }
    if (before.get(r.id) === true && r.pass === false) regressions.push(r.id);
    if (before.get(r.id) === false && r.pass === true) fixes.push(r.id);
  }
  const removed = [...before.keys()].filter((id) => !seen.has(id));
  return { regressions, fixes, added, removed, baselineGenerated: baseline.generated || null };
}

function toMarkdown(report) {
  const s = report.summary;
  const isModel = report.providerKind === 'model';
  const lines = [];
  lines.push(isModel ? '# Eval Report — REAL-MODEL RUN' : '# Eval Report');
  lines.push('');
  if (isModel) {
    lines.push('> **Real-model results — NOT comparable to the mock baseline.** This run used a live');
    lines.push('> model provider. Pass rates here measure that model\'s behavior, not the library\'s');
    lines.push('> regression state; do not mix these numbers into mock-baseline reporting.');
    lines.push('');
  }
  lines.push(`- Generated: ${report.generated}`);
  lines.push(`- Provider: ${report.provider}${isModel && report.providerMeta ? ` (endpoint ${report.providerMeta.endpoint}, timeout ${report.providerMeta.timeoutMs}ms, max retries ${report.providerMeta.maxRetries})` : ''}`);
  lines.push(`- Cases: ${s.total} total, ${s.passed} passed, ${s.failed} failed (pass rate ${(s.passRate * 100).toFixed(1)}%)`);
  lines.push(`- Critical failures: ${s.criticalFailures}`);
  lines.push(`- Coverage: ${s.coverage.skillsCovered}/${s.coverage.skillsTotal} skills selected (${(s.coverage.coverageRate * 100).toFixed(1)}%)`);
  if (report.usage) {
    const u = report.usage;
    lines.push(`- Usage: ${u.requests} request(s), ${u.attempts} attempt(s), ${u.retries} retries, ${u.errors} error(s); ${u.promptTokens} prompt + ${u.completionTokens} completion tokens (${u.totalTokens} total)${u.estimatedCostUsd !== null && u.estimatedCostUsd !== undefined ? `; estimated cost $${u.estimatedCostUsd}` : ' (no prices configured, cost not estimated)'}`);
  }
  if (report.comparison) {
    lines.push(`- vs baseline (${report.comparison.baselineGenerated || 'unknown'}): ${report.comparison.regressions.length} regression(s), ${report.comparison.fixes.length} fix(es), ${report.comparison.added.length} new case(s), ${report.comparison.removed.length} removed case(s)`);
  }
  lines.push('');
  lines.push('## By category');
  lines.push('');
  lines.push('| Category | Total | Passed | Failed | Critical |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [cat, v] of Object.entries(s.byCategory)) {
    if (v.total === 0) continue;
    lines.push(`| ${cat} | ${v.total} | ${v.passed} | ${v.failed} | ${v.critical} |`);
  }
  lines.push('');
  lines.push('## By source');
  lines.push('');
  lines.push('| Source | Total | Passed |');
  lines.push('| --- | --- | --- |');
  for (const [src, v] of Object.entries(s.bySource)) {
    if (v.total === 0) continue;
    lines.push(`| ${src} | ${v.total} | ${v.passed} |`);
  }
  const failures = report.results.filter((r) => !r.pass);
  if (failures.length > 0) {
    lines.push('');
    lines.push('## Failures');
    lines.push('');
    for (const f of failures) {
      lines.push(`- **${f.id}** [${f.category}/${f.type}]${f.critical ? ' **CRITICAL**' : ''}: ${f.failureReason}`);
    }
  }
  if (report.comparison && report.comparison.regressions.length > 0) {
    lines.push('');
    lines.push('## Regressions vs baseline');
    lines.push('');
    for (const id of report.comparison.regressions) lines.push(`- ${id}`);
  }
  lines.push('');
  lines.push('## Limitations');
  lines.push('');
  if (isModel) {
    lines.push('- This run measures one model at one point in time (temperature 0, but providers are not perfectly deterministic). Re-running may give different results.');
    lines.push('- The model was asked to self-report its skill selection as JSON; a model can select a skill and fail to report it, or report one it would not actually load.');
    lines.push('- Content checks are substring matches on the model\'s answer; they prove the guidance is present in the answer, not that it is complete or correctly applied.');
    lines.push('- Grounding checks verify the evaluated skill was among the selected skills; they do not prove the answer was derived from that skill\'s text.');
  } else {
    lines.push('- The mock provider evaluates the library (discoverability, content, trigger discrimination), not an LLM\'s reasoning. Model-provider runs are needed to say anything about a specific model.');
    lines.push('- Content checks are substring matches on grounded answers; they prove the guidance is present, not that it is complete or that a model would apply it.');
    lines.push('- Grounding checks verify the evaluated skill was among the selected skills; they do not prove the must-include phrase was surfaced by the task rather than present anywhere in the skill file.');
  }
  lines.push('- Code checks prove compilation (and fixture behavior where fixtures exist), not general correctness.');
  lines.push('');
  return lines.join('\n');
}

// Load a --cases-file: a JSON array of case ids, or an object with an
// `ids` array or a `cases` array of ids (or { id } objects). Used by
// docs/REAL-MODEL-EVALUATION.md's representative subset.
async function loadCasesFile(file) {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  let data;
  try {
    data = JSON.parse(await readFile(abs, 'utf8'));
  } catch (e) {
    throw new Error(`cannot read --cases-file "${file}": ${e.message}`);
  }
  const raw = Array.isArray(data) ? data : (data.ids || data.cases || null);
  if (!Array.isArray(raw)) {
    throw new Error(`--cases-file "${file}" must be a JSON array of case ids or an object with "ids" or "cases"`);
  }
  const ids = raw.map((c) => (typeof c === 'string' ? c : c.id)).filter((id) => typeof id === 'string');
  if (ids.length === 0) throw new Error(`--cases-file "${file}" contains no case ids`);
  return new Set(ids);
}

async function main() {
  const registry = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));
  let cases = await loadCases();
  if (CASES_FILE) {
    let wanted;
    try {
      wanted = await loadCasesFile(CASES_FILE);
    } catch (e) {
      console.error(e.message);
      process.exit(2);
    }
    cases = cases.filter((c) => wanted.has(c.id));
  }
  if (CASE_FILTER) {
    cases = cases.filter((c) => c.id.includes(CASE_FILTER) || c.category.includes(CASE_FILTER) || (c.skill || '').includes(CASE_FILTER));
  }
  // Code-point sort (A2-07): localeCompare depends on the runtime's
  // ICU default locale; eval case order must not.
  cases.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (cases.length === 0) {
    console.error('No cases found' + (CASE_FILTER ? ` for filter "${CASE_FILTER}"` : '') + (CASES_FILE ? ` in cases file "${CASES_FILE}"` : '') + '.');
    process.exit(2);
  }
  const errors = validateCases(cases, registry);
  if (errors.length > 0) {
    console.error(`Case validation failed (${errors.length} error(s)):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(2);
  }

  let provider;
  try {
    provider = await createProvider(PROVIDER_NAME);
  } catch (e) {
    console.error(`Provider error: ${e.message}`);
    process.exit(2);
  }
  const providerKind = provider.meta?.kind || (PROVIDER_NAME === 'model' ? 'model' : 'mock');
  if (SAVE_BASELINE && providerKind !== 'mock') {
    // Baselines are mock-only: a model run measures a model, not the
    // library's regression state. Refuse before any API call is made.
    console.error('Cannot --save-baseline with a non-mock provider: baselines are mock-only.');
    process.exit(2);
  }

  const timestamp = new Date().toISOString();
  const results = [];
  for (const c of cases) {
    let observation;
    try {
      observation = await provider.run(c);
    } catch (e) {
      results.push({
        id: c.id, category: c.category, type: c.type, skill: c.skill || null,
        source: c.source || 'hand-written', pass: false, score: 0, critical: isCritical(c, { pass: false }),
        failureReason: `provider error: ${e.message}`, provider: provider.name, timestamp,
        selectedSkills: [], checks: [],
      });
      continue;
    }
    const scored = await scoreCase(c, observation);
    const result = {
      id: c.id, category: c.category, type: c.type, skill: c.skill || null,
      source: c.source || 'hand-written', pass: scored.pass, score: scored.score,
      critical: false, failureReason: scored.failureReason,
      provider: provider.name, timestamp,
      selectedSkills: observation.selectedSkills || [],
      checks: scored.checks,
    };
    // Per-case token usage, only when the provider reported it (model
    // runs). Mock results keep exactly their old shape.
    if (observation.usage) result.usage = observation.usage;
    result.critical = isCritical(c, result);
    results.push(result);
  }

  const summary = summarize(results, cases, registry);
  // Baseline comparison is mock-only: the baseline is a mock run, and
  // a model run is not a regression (or a fix) relative to it.
  let comparison = null;
  if (providerKind === 'mock' && !NO_COMPARE && existsSync(CURRENT_BASELINE) && !SAVE_BASELINE) {
    const baseline = JSON.parse(await readFile(CURRENT_BASELINE, 'utf8'));
    comparison = compareToBaseline(results, baseline);
  }
  const usage = typeof provider.getUsage === 'function' ? provider.getUsage() : null;
  const report = {
    generated: timestamp,
    provider: provider.name,
    providerKind,
    providerMeta: provider.meta || null,
    usage,
    summary, comparison, results,
  };

  // Report location: --out wins; otherwise mock and model reports live
  // in separate directories so a model run can never overwrite the
  // mock report (and vice versa).
  const reportDir = OUT_DIR
    ? (path.isAbsolute(OUT_DIR) ? OUT_DIR : path.join(ROOT, OUT_DIR))
    : (providerKind === 'model' ? path.join(REPORTS_DIR, 'model') : REPORTS_DIR);
  await mkdir(reportDir, { recursive: true });
  // A2-12: report/baseline/regression writes are atomic (temp file
  // + rename, via scripts/lib/atomic-write.mjs) — a plain
  // writeFile left truncated latest.json/current.json visible to a
  // concurrent or interrupted run, and the next baseline
  // comparison crashed on JSON.parse. Same treatment the registry
  // and manifest got after A-37.
  await atomicWriteFile(path.join(reportDir, 'latest.json'), JSON.stringify(report, null, 2) + '\n');
  await atomicWriteFile(path.join(reportDir, 'latest.md'), toMarkdown(report));
  if (SAVE_BASELINE) {
    // Baselines store slim results (id/pass/score/critical only): the
    // comparison needs pass/fail per id, and the full report already
    // lives in evals/reports/. Keeps committed snapshots small.
    const slim = {
      generated: timestamp,
      provider: provider.name,
      summary,
      results: results.map((r) => ({
        id: r.id, category: r.category, type: r.type, skill: r.skill,
        source: r.source, pass: r.pass, score: r.score, critical: r.critical,
        failureReason: r.failureReason,
      })),
    };
    await mkdir(BASELINES_DIR, { recursive: true });
    const stamp = timestamp.slice(0, 10);
    await atomicWriteFile(path.join(BASELINES_DIR, `baseline-${stamp}.json`), JSON.stringify(slim, null, 2) + '\n');
    await atomicWriteFile(CURRENT_BASELINE, JSON.stringify(slim, null, 2) + '\n');
    console.log(`Baseline saved to evals/baselines/current.json (snapshot baseline-${stamp}.json).`);
  }
  if (comparison && !NO_COMPARE) {
    // With --out, the regression comparison lives next to the report
    // instead of clobbering evals/regression/latest.json.
    const regressionDir = OUT_DIR ? reportDir : path.join(EVALS_DIR, 'regression');
    const regressionFile = OUT_DIR ? 'regression.json' : 'latest.json';
    await mkdir(regressionDir, { recursive: true });
    await atomicWriteFile(path.join(regressionDir, regressionFile), JSON.stringify({ generated: timestamp, ...comparison }, null, 2) + '\n');
  }

  // Display path: relative when the report lives inside the repo
  // (the usual case), absolute when --out points elsewhere.
  const relDir = path.relative(ROOT, reportDir);
  const reportRel = relDir && !relDir.startsWith('..') ? relDir : reportDir;
  if (JSON_OUT) {
    console.log(JSON.stringify({ generated: timestamp, provider: provider.name, providerKind, summary, comparison, usage }, null, 2));
  } else {
    console.log(`Evals (${provider.name}): ${summary.passed}/${summary.total} passed (${(summary.passRate * 100).toFixed(1)}%), ${summary.failed} failed, ${summary.criticalFailures} critical.`);
    console.log(`Coverage: ${summary.coverage.skillsCovered}/${summary.coverage.skillsTotal} skills selected.`);
    if (comparison) console.log(`vs baseline: ${comparison.regressions.length} regression(s), ${comparison.fixes.length} fix(es), ${comparison.added.length} new, ${comparison.removed.length} removed.`);
    if (usage) console.log(`Usage: ${usage.totalTokens} tokens (${usage.promptTokens} prompt + ${usage.completionTokens} completion), ${usage.retries} retries, ${usage.errors} errors${usage.estimatedCostUsd !== null && usage.estimatedCostUsd !== undefined ? `, estimated cost $${usage.estimatedCostUsd}` : ''}.`);
    const failures = results.filter((r) => !r.pass);
    for (const f of failures.slice(0, 30)) {
      console.log(`  FAIL ${f.id} [${f.category}]${f.critical ? ' CRITICAL' : ''}: ${f.failureReason}`);
    }
    if (failures.length > 30) console.log(`  ... and ${failures.length - 30} more (see ${reportRel}/latest.md)`);
    console.log(`Report: ${reportRel}/latest.json, ${reportRel}/latest.md`);
  }

  process.exit(summary.failed > 0 && !REPORT_ONLY ? 1 : 0);
}

// Only run when invoked as a script: unit tests import validateCases
// from this module and must not trigger a full eval run.
const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`Eval runner failed: ${e.message}`);
    process.exit(2);
  });
}
