// generate-benchmark-report.mjs — real-model benchmark dashboard.
//
// Generates a STATIC benchmark report (a single self-contained HTML
// file, no framework, no database, no build step) plus a Markdown
// summary, from evaluation result JSON files produced by
// evals/runners/run-evals.mjs.
//
// Actual data only. The mock-eval results are rendered as what they
// are — a deterministic mock agent measuring the library, clearly
// labeled MOCK — and every real-model metric is shown as UNAVAILABLE
// until a real-model run actually exists. Unavailable metrics are
// never rendered as zero or estimated: a missing number is a missing
// number, and the report states the exact blocker.
//
// Inputs:
//   --mock <path>      mock (or latest) eval report JSON
//                      (default evals/reports/latest.json)
//   --model <path>     real-model eval report JSON (explicit path;
//                      when omitted, the newest real-model report is
//                      discovered: evals/reports/model/latest.json,
//                      evals/reports/model/<run-id>/latest.json, or
//                      ai/evaluations/runs/real-model-*.json — see
//                      discoverModelReport; absent is normal)
//   --baselines <dir>  baseline snapshots for evaluation history
//                      (default evals/baselines)
//   --subset <path>    real-model subset dataset descriptor
//                      (default evals/datasets/real-model-subset-v2.json)
//   --out <dir>        output directory
//                      (default ai/evaluations/benchmark)
//   --generated <iso>  report timestamp (default: now; override for
//                      deterministic, reproducible output)
//
// Outputs (in --out):
//   index.html   the dashboard (single file, inline CSS, no JS)
//   summary.md   the same content as Markdown
//   input.json   the exact data the report was generated from, so
//                the report is reproducible: the same inputs plus
//                the same --generated timestamp produce byte-identical
//                outputs.
//
// Exit code 0 on success, 1 when the mock report (the primary input)
// is missing or unreadable. A missing model report, missing
// baselines, or missing subset descriptor is not an error — those
// sections render as unavailable.
//
// Usage: node scripts/generate-benchmark-report.mjs [--mock <path>]
//          [--model <path>] [--baselines <dir>] [--subset <path>]
//          [--out <dir>] [--generated <iso>]

import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWriteFile } from './lib/atomic-write.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export const REAL_MODEL_BLOCKER =
  'No real-model evaluation has ever run. A Gemini API key was connected and approved for the real-model evaluation ' +
  '(custom.gemini connector, Secure Vault), but no run has been executed yet. See docs/REAL-MODEL-EVALUATION.md.';

// --- Metric computation ------------------------------------------------
//
// Metrics are computed from the per-check data in a report's
// results[] — the same checks the scorers produced — not from the
// category rollups, so each metric has an exact, documented
// derivation:
//
//   selection            checks named recall, precision, top-N,
//                        no-forbidden (evals/scorers/selection.mjs)
//   instructionFollowing all checks on cases in the
//                        instruction-following category
//   refusal              checks named refused / not-refused
//                        (evals/scorers/refusal.mjs)
//   grounding            checks named grounded-in: <skill>
//                        (evals/scorers/content.mjs)
//   code                 checks named code-* and fixture:*
//                        (evals/scorers/code.mjs)
//
// A metric with no checks of its type in the run is null
// (UNAVAILABLE), never 0: zero checks is not a zero score.

const METRIC_DEFS = [
  { id: 'selection', label: 'Skill selection accuracy', derivation: 'recall / precision / top-N / no-forbidden checks' },
  { id: 'instructionFollowing', label: 'Instruction-following score', derivation: 'all checks on instruction-following cases' },
  { id: 'refusal', label: 'Refusal accuracy', derivation: 'refused / not-refused checks' },
  { id: 'grounding', label: 'Grounding score', derivation: 'grounded-in checks' },
  { id: 'code', label: 'Code quality score', derivation: 'code-* and fixture checks' },
];

function checkMatches(checkName, metricId) {
  if (metricId === 'selection') {
    return checkName === 'recall' || checkName === 'precision'
      || checkName === 'no-forbidden' || /^top-\d+$/.test(checkName);
  }
  if (metricId === 'refusal') return checkName === 'refused' || checkName === 'not-refused';
  if (metricId === 'grounding') return checkName.startsWith('grounded-in:');
  if (metricId === 'code') return checkName.startsWith('code-') || checkName.startsWith('fixture:');
  return false;
}

function byCategoryFrom(report) {
  // run-evals.mjs puts byCategory in summary; the real-model runner
  // (evals/run-real-model.mjs) puts it at the top level. Same shape.
  const source = report.summary?.byCategory || report.byCategory || {};
  const byCategory = {};
  for (const [cat, v] of Object.entries(source)) {
    if (!v || v.total === 0) continue;
    byCategory[cat] = {
      total: v.total, passed: v.passed, failed: v.failed,
      critical: v.critical || 0,
      rate: +(v.passed / v.total).toFixed(3),
    };
  }
  return byCategory;
}

// Compute the five benchmark metrics plus rollups from one eval
// report — either the run-evals.mjs latest.json shape or the
// real-model runner's report shape (kind
// skillforge-real-model-eval, top-level byCategory and model, no
// top-level provider field). Defensive: a partial report (missing
// summary, missing checks) yields null metrics, never a crash.
// Returns null when report is null.
export function computeMetrics(report) {
  if (!report) return null;
  const summary = report.summary || {};
  const results = Array.isArray(report.results) ? report.results : [];
  const metrics = {};
  for (const def of METRIC_DEFS) {
    let pass = 0;
    let total = 0;
    for (const r of results) {
      for (const c of r.checks || []) {
        const match = def.id === 'instructionFollowing'
          ? r.category === 'instruction-following'
          : checkMatches(c.name, def.id);
        if (!match) continue;
        total++;
        if (c.pass) pass++;
      }
    }
    metrics[def.id] = total === 0
      ? null
      : { pass, total, rate: +(pass / total).toFixed(3) };
  }
  const total = summary.total ?? results.length;
  const passed = summary.passed ?? results.filter((r) => r.pass).length;
  return {
    // Provider label: run-evals reports carry `provider`; the
    // real-model runner carries model.requested/served instead.
    provider: report.provider
      || report.model?.served || report.model?.requested
      || report.providerMeta?.model || null,
    providerKind: report.providerKind || null,
    providerMeta: report.providerMeta || null,
    // The real-model runner's model block ({ requested, served,
    // servedModels }) when present; null for run-evals reports.
    model: report.model || null,
    dataset: report.dataset || null,
    generated: report.generated || null,
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? +(passed / total).toFixed(3) : null,
    criticalFailures: summary.criticalFailures ?? null,
    coverage: summary.coverage || null,
    usage: report.usage || null,
    comparison: report.comparison || null,
    metrics,
    byCategory: byCategoryFrom(report),
  };
}

// Evaluation history: baseline snapshots (slim reports with
// id/pass/score per case) sorted by generation time, deduplicated
// by generated timestamp (current.json duplicates the dated
// snapshot it was copied from). A missing or empty baselines
// directory is an empty history, not an error.
export function loadHistory(baselinesDir) {
  const entries = [];
  if (!baselinesDir || !existsSync(baselinesDir)) return entries;
  const files = readdirSync(baselinesDir).filter((f) => f.endsWith('.json')).sort();
  const seen = new Set();
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(baselinesDir, file), 'utf8'));
    } catch {
      continue; // An unreadable snapshot is skipped, not fatal.
    }
    const generated = data.generated || null;
    if (generated && seen.has(generated)) continue;
    if (generated) seen.add(generated);
    const s = data.summary || {};
    entries.push({
      source: file,
      generated,
      date: generated ? generated.slice(0, 10) : null,
      total: s.total ?? null,
      passed: s.passed ?? null,
      passRate: s.passRate ?? null,
      criticalFailures: s.criticalFailures ?? null,
    });
  }
  entries.sort((a, b) => String(a.generated).localeCompare(String(b.generated)));
  return entries;
}

// Regression indicators for the latest mock run: the baseline
// comparison (regressions/fixes/added/removed) plus the pass-rate
// trend against the previous history entry. The trend is a plain
// comparison of two measured pass rates, never a projection.
export function regressionIndicators(mockMetrics, history) {
  const comparison = mockMetrics?.comparison || null;
  const latest = mockMetrics?.passRate;
  const previous = history.length >= 2
    ? history[history.length - 2].passRate
    : null;
  let trend = null;
  if (latest !== null && latest !== undefined && previous !== null && previous !== undefined) {
    const delta = +(latest - previous).toFixed(3);
    trend = {
      from: history[history.length - 2].generated,
      to: mockMetrics.generated,
      previousPassRate: previous,
      latestPassRate: latest,
      delta,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged',
    };
  }
  return {
    regressions: comparison?.regressions || [],
    fixes: comparison?.fixes || [],
    added: comparison?.added || [],
    removed: comparison?.removed || [],
    baselineGenerated: comparison?.baselineGenerated || null,
    trend,
  };
}

function readJsonIfExists(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Find the newest real-model report. The Phase 4 runner writes to
// evals/reports/model/<run-id>/latest.json by default (run-id like
// real-model-gemini-3.8-flash-20261122-013000); a run may also be
// exported as a flat file under ai/evaluations/runs/
// (real-model-gemini-3.8-flash-*.json). Both layouts are searched,
// plus the single default file, and the newest by the report's own
// `generated` timestamp wins — never filesystem mtime, which says
// when a file was copied, not when the run happened. An explicit
// --model path wins over discovery. Returns { path, report } or
// null when nothing is found (the normal state until a run exists).
export function discoverModelReport({ explicitPath, defaultPath, modelReportsDir, runsDir }) {
  if (explicitPath) {
    const report = readJsonIfExists(explicitPath);
    return report ? { path: explicitPath, report } : null;
  }
  const candidates = [];
  if (defaultPath) candidates.push(defaultPath);
  if (modelReportsDir && existsSync(modelReportsDir)) {
    for (const entry of readdirSync(modelReportsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(join(modelReportsDir, entry.name, 'latest.json'));
    }
  }
  if (runsDir && existsSync(runsDir)) {
    for (const entry of readdirSync(runsDir)) {
      if (entry.startsWith('real-model-') && entry.endsWith('.json')) {
        candidates.push(join(runsDir, entry));
      }
    }
  }
  let best = null;
  for (const path of candidates) {
    const report = readJsonIfExists(path);
    if (!report) continue;
    const generated = report.generated || '';
    if (!best || generated > best.report.generated) best = { path, report };
  }
  return best;
}

// Repo-relative when the path lives inside the repo (the usual
// case — keeps the committed report portable), absolute otherwise.
function displayPath(p) {
  if (!p) return p;
  const rel = relative(ROOT, p);
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) return rel;
  return p;
}

// Assemble the dashboard data model from the inputs. This object is
// written to input.json and is everything the renderers consume.
// `modelPath` is an explicit --model path (or null for discovery);
// `defaultModelPath` is evals/reports/model/latest.json.
export function buildDashboardData({
  mockPath,
  modelPath,
  defaultModelPath,
  modelReportsDir,
  runsDir,
  baselinesDir,
  subsetPath,
  generated,
}) {
  const mockReport = readJsonIfExists(mockPath);
  if (!mockReport) {
    throw new Error(`cannot read mock eval report: ${mockPath}`);
  }
  const mockMetrics = computeMetrics(mockReport);
  const found = discoverModelReport({
    explicitPath: modelPath || null,
    defaultPath: defaultModelPath,
    modelReportsDir,
    runsDir,
  });
  const modelReport = found?.report || null;
  const history = loadHistory(baselinesDir);
  const subset = readJsonIfExists(subsetPath);
  return {
    generated,
    sources: {
      mockReport: displayPath(mockPath),
      modelReport: displayPath(found?.path || defaultModelPath),
      baselinesDir: displayPath(baselinesDir),
      subset: displayPath(subsetPath),
    },
    datasets: {
      fullSuite: {
        label: 'Full suite (evals/cases + datasets/discovery-generated.json)',
        cases: mockMetrics.total,
      },
      realModelSubset: subset
        ? {
          label: 'Real-model subset (evals/datasets/real-model-subset-v2.json)',
          version: subset.version ?? null,
          cases: subset.count ?? (Array.isArray(subset.ids) ? subset.ids.length : null),
          generated: subset.generated ?? null,
        }
        : null,
    },
    mock: mockMetrics,
    realModel: modelReport
      ? { status: 'available', metrics: computeMetrics(modelReport) }
      : { status: 'unavailable', blocker: REAL_MODEL_BLOCKER },
    history,
    regressions: regressionIndicators(mockMetrics, history),
  };
}

// --- Rendering ---------------------------------------------------------

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(rate) {
  return rate === null || rate === undefined ? null : `${(rate * 100).toFixed(1)}%`;
}

function metricCell(metric) {
  if (!metric) return '<td class="unavailable">UNAVAILABLE</td><td class="unavailable">—</td>';
  return `<td>${esc(pct(metric.rate))}</td><td>${metric.pass}/${metric.total}</td>`;
}

function metricRows(metrics) {
  return METRIC_DEFS.map((def) => {
    const m = metrics[def.id];
    return `<tr><th scope="row">${esc(def.label)}</th>${metricCell(m)}<td class="muted">${esc(def.derivation)}</td></tr>`;
  }).join('\n');
}

function categoryRows(byCategory) {
  return Object.entries(byCategory).map(([cat, v]) => (
    `<tr><td>${esc(cat)}</td><td>${v.total}</td><td>${v.passed}</td><td>${v.failed}</td><td>${v.critical}</td><td>${esc(pct(v.rate))}</td></tr>`
  )).join('\n');
}

function historyRows(history) {
  if (history.length === 0) {
    return '<tr><td colspan="6" class="unavailable">No baseline snapshots found.</td></tr>';
  }
  return history.map((h) => (
    `<tr><td>${esc(h.date || '—')}</td><td>${esc(h.source)}</td><td>${h.total ?? '—'}</td><td>${h.passed ?? '—'}</td><td>${h.criticalFailures ?? '—'}</td><td>${h.passRate === null || h.passRate === undefined ? 'UNAVAILABLE' : esc(pct(h.passRate))}</td></tr>`
  )).join('\n');
}

function usageLine(usage) {
  if (!usage) return '<p class="muted">No token usage reported for this run.</p>';
  const cost = usage.estimatedCostUsd !== null && usage.estimatedCostUsd !== undefined
    ? `; estimated cost $${usage.estimatedCostUsd}`
    : ' (no prices configured, cost not estimated)';
  return `<p>Usage: ${usage.requests} request(s), ${usage.attempts} attempt(s), ${usage.retries} retries, ${usage.errors} error(s); `
    + `${usage.promptTokens} prompt + ${usage.completionTokens} completion tokens (${usage.totalTokens} total)${cost}.</p>`;
}

export function renderHtml(data) {
  const mock = data.mock;
  const isMock = mock.providerKind === 'mock';
  const real = data.realModel;
  const reg = data.regressions;
  const trendText = reg.trend
    ? `Pass rate ${reg.trend.direction} vs the previous baseline (${pct(reg.trend.previousPassRate)} on ${(reg.trend.from || '').slice(0, 10)} → ${pct(reg.trend.latestPassRate)}; delta ${(reg.trend.delta * 100).toFixed(1)} percentage points).`
    : 'No pass-rate trend available (fewer than two history points).';
  const idList = (ids) => (ids.length === 0
    ? '<span class="muted">none</span>'
    : esc(ids.slice(0, 20).join(', ')) + (ids.length > 20 ? ` <span class="muted">… and ${ids.length - 20} more</span>` : ''));
  const subset = data.datasets.realModelSubset;
  const realModelSection = real.status === 'available'
    ? `<h2>Real-model results — ${esc(real.metrics.provider || 'unknown provider')}</h2>
<p>Provider: ${esc(real.metrics.provider || '—')}${real.metrics.model ? ` (model requested ${esc(real.metrics.model.requested || '—')}${real.metrics.model.served ? `, served as ${esc(real.metrics.model.served)}` : ''})` : real.metrics.providerMeta?.model ? ` (model ${esc(real.metrics.providerMeta.model)})` : ''}; generated ${esc(real.metrics.generated || '—')}.</p>
${real.metrics.dataset ? `<p>Dataset: ${esc(real.metrics.dataset.file || '—')} (version ${real.metrics.dataset.version ?? '—'}, ${real.metrics.dataset.count ?? '—'} cases).</p>` : ''}
<table>
<thead><tr><th>Metric</th><th>Score</th><th>Passed/Total</th><th>Derivation</th></tr></thead>
<tbody>
${metricRows(real.metrics.metrics)}
</tbody>
</table>
<p>Cases: ${real.metrics.total} total, ${real.metrics.passed} passed, ${real.metrics.failed} failed (pass rate ${esc(pct(real.metrics.passRate))}); critical failures: ${real.metrics.criticalFailures ?? '—'}.</p>
${usageLine(real.metrics.usage)}`
    : `<h2>Real-model results</h2>
<div class="unavailable-panel">
<p><strong>UNAVAILABLE — no real-model evaluation has ever run.</strong></p>
<p>${esc(real.blocker)}</p>
<table>
<thead><tr><th>Metric</th><th>Score</th><th>Passed/Total</th><th>Derivation</th></tr></thead>
<tbody>
${METRIC_DEFS.map((def) => `<tr><th scope="row">${esc(def.label)}</th><td class="unavailable">UNAVAILABLE</td><td class="unavailable">—</td><td class="muted">${esc(def.derivation)}</td></tr>`).join('\n')}
</tbody>
</table>
<p class="muted">Unavailable metrics are never shown as zero or estimated. They will appear here once a real-model run exists (see <a href="https://github.com/luxmanbhattarai/SkillForge/blob/main/docs/REAL-MODEL-EVALUATION.md">docs/REAL-MODEL-EVALUATION.md</a>).</p>
</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SkillForge Benchmark Dashboard</title>
<style>
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.5; }
h1 { font-size: 1.6rem; }
h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
thead th { background: #f0f0f0; }
tbody th { font-weight: 600; }
.muted { color: #555; font-size: 0.9em; }
.unavailable { color: #8a6d00; font-weight: 600; }
.banner { border: 2px solid #8a6d00; background: #fff8e1; padding: 0.75rem 1rem; margin: 1rem 0; }
.unavailable-panel { border: 2px solid #8a6d00; background: #fff8e1; padding: 0.75rem 1rem; margin: 1rem 0; }
code { background: #f0f0f0; padding: 0.1rem 0.3rem; border-radius: 3px; }
footer { margin-top: 2rem; border-top: 1px solid #ccc; padding-top: 0.75rem; }
</style>
</head>
<body>
<h1>SkillForge Benchmark Dashboard</h1>
<p class="muted">Generated ${esc(data.generated)} from ${esc(data.sources.mockReport)}${real.status === 'available' ? ` and ${esc(data.sources.modelReport)}` : ' (no real-model report found)'}.</p>

<h2>Datasets</h2>
<ul>
<li><strong>Full suite:</strong> ${esc(data.datasets.fullSuite.label)} — ${data.datasets.fullSuite.cases} cases.</li>
<li><strong>Real-model subset:</strong> ${subset ? `${esc(subset.label)} — version ${subset.version ?? '—'}, ${subset.cases ?? '—'} cases${subset.generated ? ` (generated ${esc(subset.generated)})` : ''}.` : 'descriptor not found.'}</li>
</ul>

<h2>Evaluation runs — ${isMock ? 'mock' : esc(mock.provider || 'unknown provider')}</h2>
${isMock ? `<div class="banner"><strong>MOCK RESULTS.</strong> This run used the deterministic mock agent: it measures the library (discoverability, content, trigger discrimination), not an LLM's reasoning. It says nothing about whether a real model will select the right skills, ground its answers in them, or refuse unsafe requests.</div>` : ''}
<p>Provider: ${esc(mock.provider || '—')}${mock.providerMeta?.model ? ` (model ${esc(mock.providerMeta.model)})` : ''}; generated ${esc(mock.generated || '—')}.</p>
<p>Cases: ${mock.total} total, ${mock.passed} passed, ${mock.failed} failed (pass rate ${esc(pct(mock.passRate))}); critical failures: ${mock.criticalFailures ?? '—'}. Coverage: ${mock.coverage ? `${mock.coverage.skillsCovered}/${mock.coverage.skillsTotal} skills selected (${esc(pct(mock.coverage.coverageRate))})` : '—'}.</p>
${usageLine(mock.usage)}

<table>
<thead><tr><th>Metric</th><th>Score</th><th>Passed/Total</th><th>Derivation</th></tr></thead>
<tbody>
${metricRows(mock.metrics)}
</tbody>
</table>

<h3>By category</h3>
<table>
<thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Critical</th><th>Pass rate</th></tr></thead>
<tbody>
${categoryRows(mock.byCategory)}
</tbody>
</table>

<h2>Regression indicators</h2>
<p>Baseline comparison (baseline generated ${esc(reg.baselineGenerated || '—')}): ${reg.regressions.length} regression(s), ${reg.fixes.length} fix(es), ${reg.added.length} new case(s), ${reg.removed.length} removed case(s).</p>
<ul>
<li><strong>Regressions:</strong> ${idList(reg.regressions)}</li>
<li><strong>Fixes:</strong> ${idList(reg.fixes)}</li>
<li><strong>New cases:</strong> ${idList(reg.added)}</li>
<li><strong>Removed cases:</strong> ${idList(reg.removed)}</li>
</ul>
<p>${esc(trendText)}</p>

<h2>Evaluation history</h2>
<table>
<thead><tr><th>Date</th><th>Snapshot</th><th>Total</th><th>Passed</th><th>Critical</th><th>Pass rate</th></tr></thead>
<tbody>
${historyRows(data.history)}
</tbody>
</table>

${realModelSection}

<h2>Methodology</h2>
<ul>
<li>Metrics are computed from the per-check data in the eval reports, not from category rollups. Each metric's derivation is listed in its table row.</li>
<li>The real-model runner also emits its own aggregate dimensions in its report, derived from case categories. The dashboard does not reuse them: it computes all metrics from per-check data the same way for mock and real-model runs, so the two sections stay comparable. Small differences between the dashboard's numbers and the runner's dimensions are expected — they measure related but different things.</li>
<li>A metric with no checks of its type in a run is UNAVAILABLE, never zero: zero checks is not a zero score.</li>
<li>Mock and real-model runs are never compared as regressions: they answer different questions. Baselines are mock-only.</li>
<li>The model was asked to self-report its skill selection as JSON; content checks are substring matches; grounding checks verify the evaluated skill was among the selected skills. See the eval report's Limitations section for what the scores do and do not prove.</li>
</ul>

<footer class="muted">
<p>Regenerate: <code>node scripts/generate-benchmark-report.mjs</code> — see <code>ai/evaluations/BENCHMARK-DASHBOARD.md</code>. Inputs: <code>${esc(data.sources.mockReport)}</code>${real.status === 'available' ? `, <code>${esc(data.sources.modelReport)}</code>` : ''}, <code>${esc(data.sources.baselinesDir)}</code>. The exact input data for this report is in <code>input.json</code> next to this file.</p>
</footer>
</body>
</html>
`;
}

function mdMetricRow(def, metric) {
  if (!metric) return `| ${def.label} | UNAVAILABLE | — | ${def.derivation} |`;
  return `| ${def.label} | ${pct(metric.rate)} | ${metric.pass}/${metric.total} | ${def.derivation} |`;
}

export function renderMarkdown(data) {
  const mock = data.mock;
  const isMock = mock.providerKind === 'mock';
  const real = data.realModel;
  const reg = data.regressions;
  const subset = data.datasets.realModelSubset;
  const lines = [];
  lines.push('# SkillForge Benchmark Dashboard');
  lines.push('');
  lines.push(`Generated ${data.generated} from ${data.sources.mockReport}${real.status === 'available' ? ` and ${data.sources.modelReport}` : ' (no real-model report found)'}.`);
  lines.push('');
  lines.push('## Datasets');
  lines.push('');
  lines.push(`- **Full suite:** ${data.datasets.fullSuite.label} — ${data.datasets.fullSuite.cases} cases.`);
  lines.push(subset
    ? `- **Real-model subset:** ${subset.label} — version ${subset.version ?? '—'}, ${subset.cases ?? '—'} cases${subset.generated ? ` (generated ${subset.generated})` : ''}.`
    : '- **Real-model subset:** descriptor not found.');
  lines.push('');
  lines.push(`## Evaluation runs — ${isMock ? 'mock' : (mock.provider || 'unknown provider')}`);
  lines.push('');
  if (isMock) {
    lines.push('> **MOCK RESULTS.** This run used the deterministic mock agent: it measures the library (discoverability, content, trigger discrimination), not an LLM\'s reasoning. It says nothing about whether a real model will select the right skills, ground its answers in them, or refuse unsafe requests.');
    lines.push('');
  }
  lines.push(`- Provider: ${mock.provider || '—'}${mock.providerMeta?.model ? ` (model ${mock.providerMeta.model})` : ''}; generated ${mock.generated || '—'}.`);
  lines.push(`- Cases: ${mock.total} total, ${mock.passed} passed, ${mock.failed} failed (pass rate ${pct(mock.passRate)}); critical failures: ${mock.criticalFailures ?? '—'}.`);
  if (mock.coverage) lines.push(`- Coverage: ${mock.coverage.skillsCovered}/${mock.coverage.skillsTotal} skills selected (${pct(mock.coverage.coverageRate)}).`);
  if (mock.usage) {
    const u = mock.usage;
    lines.push(`- Usage: ${u.requests} request(s), ${u.attempts} attempt(s), ${u.retries} retries, ${u.errors} error(s); ${u.totalTokens} tokens (${u.promptTokens} prompt + ${u.completionTokens} completion)${u.estimatedCostUsd !== null && u.estimatedCostUsd !== undefined ? `; estimated cost $${u.estimatedCostUsd}` : ' (no prices configured, cost not estimated)'}.`);
  }
  lines.push('');
  lines.push('| Metric | Score | Passed/Total | Derivation |');
  lines.push('| --- | --- | --- | --- |');
  for (const def of METRIC_DEFS) lines.push(mdMetricRow(def, mock.metrics[def.id]));
  lines.push('');
  lines.push('### By category');
  lines.push('');
  lines.push('| Category | Total | Passed | Failed | Critical | Pass rate |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const [cat, v] of Object.entries(mock.byCategory)) {
    lines.push(`| ${cat} | ${v.total} | ${v.passed} | ${v.failed} | ${v.critical} | ${pct(v.rate)} |`);
  }
  lines.push('');
  lines.push('## Regression indicators');
  lines.push('');
  lines.push(`Baseline comparison (baseline generated ${reg.baselineGenerated || '—'}): ${reg.regressions.length} regression(s), ${reg.fixes.length} fix(es), ${reg.added.length} new case(s), ${reg.removed.length} removed case(s).`);
  lines.push('');
  lines.push(`- Regressions: ${reg.regressions.length === 0 ? 'none' : reg.regressions.join(', ')}`);
  lines.push(`- Fixes: ${reg.fixes.length === 0 ? 'none' : reg.fixes.join(', ')}`);
  lines.push(`- New cases: ${reg.added.length === 0 ? 'none' : reg.added.join(', ')}`);
  lines.push(`- Removed cases: ${reg.removed.length === 0 ? 'none' : reg.removed.join(', ')}`);
  lines.push('');
  if (reg.trend) {
    lines.push(`Pass rate ${reg.trend.direction} vs the previous baseline (${pct(reg.trend.previousPassRate)} on ${(reg.trend.from || '').slice(0, 10)} → ${pct(reg.trend.latestPassRate)}; delta ${(reg.trend.delta * 100).toFixed(1)} percentage points).`);
  } else {
    lines.push('No pass-rate trend available (fewer than two history points).');
  }
  lines.push('');
  lines.push('## Evaluation history');
  lines.push('');
  lines.push('| Date | Snapshot | Total | Passed | Critical | Pass rate |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  if (data.history.length === 0) {
    lines.push('| — | No baseline snapshots found. | — | — | — | — |');
  } else {
    for (const h of data.history) {
      lines.push(`| ${h.date || '—'} | ${h.source} | ${h.total ?? '—'} | ${h.passed ?? '—'} | ${h.criticalFailures ?? '—'} | ${h.passRate === null || h.passRate === undefined ? 'UNAVAILABLE' : pct(h.passRate)} |`);
    }
  }
  lines.push('');
  lines.push('## Real-model results');
  lines.push('');
  if (real.status === 'available') {
    const m = real.metrics;
    lines.push(`Provider: ${m.provider || '—'}${m.model ? ` (model requested ${m.model.requested || '—'}${m.model.served ? `, served as ${m.model.served}` : ''})` : m.providerMeta?.model ? ` (model ${m.providerMeta.model})` : ''}; generated ${m.generated || '—'}.`);
    if (m.dataset) lines.push(`Dataset: ${m.dataset.file || '—'} (version ${m.dataset.version ?? '—'}, ${m.dataset.count ?? '—'} cases).`);
    lines.push('');
    lines.push('| Metric | Score | Passed/Total | Derivation |');
    lines.push('| --- | --- | --- | --- |');
    for (const def of METRIC_DEFS) lines.push(mdMetricRow(def, m.metrics[def.id]));
    lines.push('');
    lines.push(`Cases: ${m.total} total, ${m.passed} passed, ${m.failed} failed (pass rate ${pct(m.passRate)}); critical failures: ${m.criticalFailures ?? '—'}.`);
  } else {
    lines.push('**UNAVAILABLE — no real-model evaluation has ever run.**');
    lines.push('');
    lines.push(real.blocker);
    lines.push('');
    lines.push('| Metric | Score | Passed/Total | Derivation |');
    lines.push('| --- | --- | --- | --- |');
    for (const def of METRIC_DEFS) lines.push(`| ${def.label} | UNAVAILABLE | — | ${def.derivation} |`);
    lines.push('');
    lines.push('Unavailable metrics are never shown as zero or estimated. They will appear here once a real-model run exists (see docs/REAL-MODEL-EVALUATION.md).');
  }
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push('- Metrics are computed from the per-check data in the eval reports, not from category rollups. Each metric\'s derivation is listed in its table row.');
  lines.push('- The real-model runner also emits its own aggregate dimensions in its report, derived from case categories. The dashboard does not reuse them: it computes all metrics from per-check data the same way for mock and real-model runs, so the two sections stay comparable. Small differences between the dashboard\'s numbers and the runner\'s dimensions are expected — they measure related but different things.');
  lines.push('- A metric with no checks of its type in a run is UNAVAILABLE, never zero: zero checks is not a zero score.');
  lines.push('- Mock and real-model runs are never compared as regressions: they answer different questions. Baselines are mock-only.');
  lines.push('- The model was asked to self-report its skill selection as JSON; content checks are substring matches; grounding checks verify the evaluated skill was among the selected skills. See the eval report\'s Limitations section for what the scores do and do not prove.');
  lines.push('');
  lines.push(`Regenerate: \`node scripts/generate-benchmark-report.mjs\` — see \`ai/evaluations/BENCHMARK-DASHBOARD.md\`. The exact input data for this report is in \`input.json\` next to this file.`);
  lines.push('');
  return lines.join('\n');
}

// Generate the report into outDir. Returns { html, markdown, input }.
// Exported for testing; main() is the CLI wrapper.
export async function generateReport({
  mockPath = join(ROOT, 'evals', 'reports', 'latest.json'),
  // Explicit --model path, or null to discover the newest real-model
  // report (see discoverModelReport).
  modelPath = null,
  defaultModelPath = join(ROOT, 'evals', 'reports', 'model', 'latest.json'),
  modelReportsDir = join(ROOT, 'evals', 'reports', 'model'),
  runsDir = join(ROOT, 'ai', 'evaluations', 'runs'),
  baselinesDir = join(ROOT, 'evals', 'baselines'),
  subsetPath = join(ROOT, 'evals', 'datasets', 'real-model-subset-v2.json'),
  outDir = join(ROOT, 'ai', 'evaluations', 'benchmark'),
  generated = new Date().toISOString(),
} = {}) {
  const data = buildDashboardData({
    mockPath, modelPath, defaultModelPath, modelReportsDir, runsDir,
    baselinesDir, subsetPath, generated,
  });
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, 'index.html');
  const mdPath = join(outDir, 'summary.md');
  const inputPath = join(outDir, 'input.json');
  await atomicWriteFile(htmlPath, renderHtml(data));
  await atomicWriteFile(mdPath, renderMarkdown(data));
  await atomicWriteFile(inputPath, JSON.stringify(data, null, 2) + '\n');
  return { html: htmlPath, markdown: mdPath, input: inputPath, data };
}

async function main() {
  const args = process.argv.slice(2);
  const flagValue = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const resolveArg = (v) => (v ? resolve(v) : undefined);
  try {
    const { html, markdown, input, data } = await generateReport({
      ...(flagValue('--mock') ? { mockPath: resolveArg(flagValue('--mock')) } : {}),
      ...(flagValue('--model') ? { modelPath: resolveArg(flagValue('--model')) } : {}),
      ...(flagValue('--baselines') ? { baselinesDir: resolveArg(flagValue('--baselines')) } : {}),
      ...(flagValue('--subset') ? { subsetPath: resolveArg(flagValue('--subset')) } : {}),
      ...(flagValue('--out') ? { outDir: resolveArg(flagValue('--out')) } : {}),
      ...(flagValue('--generated') ? { generated: flagValue('--generated') } : {}),
    });
    console.log(`Benchmark report: ${html}, ${markdown}, ${input}`);
    console.log(`Mock: ${data.mock.passed}/${data.mock.total} passed (${pct(data.mock.passRate)}); real-model: ${data.realModel.status}.`);
    process.exitCode = 0;
  } catch (e) {
    console.error(`Benchmark report failed: ${e.message}`);
    process.exitCode = 1;
  }
}

const invokedAsScript = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
