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
//                 [--save-baseline] [--no-compare] [--report-only] [--json]
// Exit code 1 if any case fails (unless --report-only), 0 otherwise.
// Exit code 2 on a framework error (bad case file, unknown skill, ...).

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

function validateCases(cases, registry) {
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
    if (r.skill) covered.add(r.skill);
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
  const lines = [];
  lines.push('# Eval Report');
  lines.push('');
  lines.push(`- Generated: ${report.generated}`);
  lines.push(`- Provider: ${report.provider}`);
  lines.push(`- Cases: ${s.total} total, ${s.passed} passed, ${s.failed} failed (pass rate ${(s.passRate * 100).toFixed(1)}%)`);
  lines.push(`- Critical failures: ${s.criticalFailures}`);
  lines.push(`- Coverage: ${s.coverage.skillsCovered}/${s.coverage.skillsTotal} skills touched (${(s.coverage.coverageRate * 100).toFixed(1)}%)`);
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
  lines.push('- The mock provider evaluates the library (discoverability, content, trigger discrimination), not an LLM\'s reasoning. Model-provider runs are needed to say anything about a specific model.');
  lines.push('- Content checks are substring matches on grounded answers; they prove the guidance is present, not that it is complete or that a model would apply it.');
  lines.push('- Code checks prove compilation (and fixture behavior where fixtures exist), not general correctness.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const registry = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));
  let cases = await loadCases();
  if (CASE_FILTER) {
    cases = cases.filter((c) => c.id.includes(CASE_FILTER) || c.category.includes(CASE_FILTER) || (c.skill || '').includes(CASE_FILTER));
  }
  cases.sort((a, b) => a.id.localeCompare(b.id));
  if (cases.length === 0) {
    console.error('No cases found' + (CASE_FILTER ? ` for filter "${CASE_FILTER}"` : '') + '.');
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
    result.critical = isCritical(c, result);
    results.push(result);
  }

  const summary = summarize(results, cases, registry);
  let comparison = null;
  if (!NO_COMPARE && existsSync(CURRENT_BASELINE) && !SAVE_BASELINE) {
    const baseline = JSON.parse(await readFile(CURRENT_BASELINE, 'utf8'));
    comparison = compareToBaseline(results, baseline);
  }
  const report = { generated: timestamp, provider: provider.name, summary, comparison, results };

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(path.join(REPORTS_DIR, 'latest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(path.join(REPORTS_DIR, 'latest.md'), toMarkdown(report), 'utf8');
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
    await writeFile(path.join(BASELINES_DIR, `baseline-${stamp}.json`), JSON.stringify(slim, null, 2) + '\n', 'utf8');
    await writeFile(CURRENT_BASELINE, JSON.stringify(slim, null, 2) + '\n', 'utf8');
    console.log(`Baseline saved to evals/baselines/current.json (snapshot baseline-${stamp}.json).`);
  }
  if (comparison && !NO_COMPARE) {
    await mkdir(path.join(EVALS_DIR, 'regression'), { recursive: true });
    await writeFile(path.join(EVALS_DIR, 'regression', 'latest.json'), JSON.stringify({ generated: timestamp, ...comparison }, null, 2) + '\n', 'utf8');
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ generated: timestamp, provider: provider.name, summary, comparison }, null, 2));
  } else {
    console.log(`Evals (${provider.name}): ${summary.passed}/${summary.total} passed (${(summary.passRate * 100).toFixed(1)}%), ${summary.failed} failed, ${summary.criticalFailures} critical.`);
    console.log(`Coverage: ${summary.coverage.skillsCovered}/${summary.coverage.skillsTotal} skills.`);
    if (comparison) console.log(`vs baseline: ${comparison.regressions.length} regression(s), ${comparison.fixes.length} fix(es), ${comparison.added.length} new, ${comparison.removed.length} removed.`);
    const failures = results.filter((r) => !r.pass);
    for (const f of failures.slice(0, 30)) {
      console.log(`  FAIL ${f.id} [${f.category}]${f.critical ? ' CRITICAL' : ''}: ${f.failureReason}`);
    }
    if (failures.length > 30) console.log(`  ... and ${failures.length - 30} more (see evals/reports/latest.md)`);
    console.log('Report: evals/reports/latest.json, evals/reports/latest.md');
  }

  process.exit(summary.failed > 0 && !REPORT_ONLY ? 1 : 0);
}

main().catch((e) => {
  console.error(`Eval runner failed: ${e.message}`);
  process.exit(2);
});
