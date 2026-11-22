// benchmark-report.test.mjs — tests for the benchmark dashboard
// generator (scripts/generate-benchmark-report.mjs).
//
// The generator renders known fixture input and must never invent a
// score: a mock run present and a real-model run absent means the
// real-model section shows UNAVAILABLE, not zero and not an
// estimate. All fixtures live in temp directories; the committed
// reports are never read or written by these tests.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {
  computeMetrics, loadHistory, regressionIndicators,
  discoverModelReport,
  renderHtml, renderMarkdown, generateReport,
  REAL_MODEL_BLOCKER,
} from '../scripts/generate-benchmark-report.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const GENERATED = '2026-11-22T00:00:00.000Z';

function check(name, pass) {
  return { name, pass, detail: '' };
}

// A small fixture report: 3 cases, mixed check outcomes.
function fixtureReport(overrides = {}) {
  return {
    generated: '2026-11-21T21:13:30.553Z',
    provider: 'mock',
    providerKind: 'mock',
    providerMeta: { kind: 'mock', model: null },
    usage: null,
    summary: {
      total: 3, passed: 2, failed: 1, passRate: 0.667, criticalFailures: 0,
      byCategory: {
        'skill-selection': { total: 2, passed: 2, failed: 0, critical: 0 },
        'instruction-following': { total: 1, passed: 0, failed: 1, critical: 0 },
      },
      coverage: { skillsCovered: 2, skillsTotal: 277, coverageRate: 0.007 },
    },
    comparison: {
      regressions: ['CASE-003'], fixes: [], added: [], removed: [],
      baselineGenerated: '2026-11-21T00:41:38.522Z',
    },
    results: [
      {
        id: 'CASE-001', category: 'skill-selection', type: 'positive', pass: true,
        checks: [check('recall', true), check('precision', true), check('not-refused', true), check('grounded-in: alpha-skill', true)],
      },
      {
        id: 'CASE-002', category: 'skill-selection', type: 'positive', pass: true,
        checks: [check('recall', true), check('precision', false), check('not-refused', true), check('grounded-in: beta-skill', false)],
      },
      {
        id: 'CASE-003', category: 'instruction-following', type: 'positive', pass: false,
        checks: [check('must-include: widgets', false), check('code-block-1-compiles', false)],
      },
    ],
    ...overrides,
  };
}

function tmpTree() {
  const base = mkdtempSync(path.join(os.tmpdir(), 'skillforge-benchmark-test-'));
  return base;
}

function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// ---- computeMetrics ---------------------------------------------------

test('computeMetrics derives each metric from the right checks', () => {
  const m = computeMetrics(fixtureReport());
  // Selection: recall x2 pass, precision 1/2 → 3/4.
  assert.deepEqual(m.metrics.selection, { pass: 3, total: 4, rate: 0.75 });
  // Instruction-following: the two checks on CASE-003, both failed.
  assert.deepEqual(m.metrics.instructionFollowing, { pass: 0, total: 2, rate: 0 });
  // Refusal: not-refused x2 pass.
  assert.deepEqual(m.metrics.refusal, { pass: 2, total: 2, rate: 1 });
  // Grounding: 1/2.
  assert.deepEqual(m.metrics.grounding, { pass: 1, total: 2, rate: 0.5 });
  // Code: one compiles check, failed — a real zero, not unavailable.
  assert.deepEqual(m.metrics.code, { pass: 0, total: 1, rate: 0 });
  assert.equal(m.total, 3);
  assert.equal(m.passed, 2);
  assert.equal(m.passRate, 0.667);
  assert.deepEqual(m.byCategory['skill-selection'], { total: 2, passed: 2, failed: 0, critical: 0, rate: 1 });
});

test('computeMetrics: a metric with no checks is null (UNAVAILABLE), never 0', () => {
  const m = computeMetrics(fixtureReport({
    results: [{ id: 'X', category: 'skill-selection', pass: true, checks: [check('recall', true)] }],
    summary: { total: 1, passed: 1, failed: 0, passRate: 1, criticalFailures: 0, byCategory: {} },
  }));
  assert.deepEqual(m.metrics.selection, { pass: 1, total: 1, rate: 1 });
  assert.equal(m.metrics.grounding, null);
  assert.equal(m.metrics.code, null);
  assert.equal(m.metrics.refusal, null);
  assert.equal(m.metrics.instructionFollowing, null);
  assert.equal(computeMetrics(null), null);
});

test('computeMetrics tolerates a partial report (no summary, no checks)', () => {
  const m = computeMetrics({ provider: 'mock', providerKind: 'mock', results: [{ id: 'X', pass: true }] });
  assert.equal(m.total, 1);
  assert.equal(m.passRate, 1);
  assert.equal(m.metrics.selection, null);
  assert.deepEqual(m.byCategory, {});
});

// The real-model runner's report shape (evals/run-real-model.mjs):
// kind skillforge-real-model-eval, top-level byCategory and model,
// no top-level provider field.
function phase4Report(overrides = {}) {
  const base = fixtureReport();
  return {
    kind: 'skillforge-real-model-eval',
    version: 1,
    runId: 'real-model-gemini-3-8-flash-20261122-013000',
    generated: '2026-11-22T01:30:00.000Z',
    providerKind: 'model',
    model: { requested: 'gemini-3.8-flash', served: 'gemini-3.8-flash', servedModels: ['gemini-3.8-flash'] },
    providerMeta: { kind: 'model', provider: 'gemini', model: 'gemini-3.8-flash' },
    dataset: { file: 'evals/datasets/real-model-subset-v2.json', version: 2, count: 3 },
    summary: {
      total: 3, passed: 2, failed: 1, passRate: 0.667, criticalFailures: 0,
      coverage: { skillsCovered: 2, skillsTotal: 277, coverageRate: 0.007 },
    },
    byCategory: base.summary.byCategory,
    usage: { requests: 3, attempts: 3, retries: 0, errors: 0, promptTokens: 30, completionTokens: 15, totalTokens: 45, estimatedCostUsd: null },
    results: base.results,
    ...overrides,
  };
}

test('computeMetrics reads the real-model runner shape (model block, top-level byCategory)', () => {
  const m = computeMetrics(phase4Report());
  assert.equal(m.provider, 'gemini-3.8-flash', 'provider falls back to the served model id');
  assert.deepEqual(m.model, { requested: 'gemini-3.8-flash', served: 'gemini-3.8-flash', servedModels: ['gemini-3.8-flash'] });
  assert.equal(m.dataset.version, 2);
  assert.deepEqual(m.metrics.selection, { pass: 3, total: 4, rate: 0.75 });
  assert.deepEqual(m.byCategory['skill-selection'], { total: 2, passed: 2, failed: 0, critical: 0, rate: 1 });
});

test('discoverModelReport finds the newest run across both layouts', () => {
  const base = tmpTree();
  try {
    const modelDir = path.join(base, 'evals', 'reports', 'model');
    const runsDir = path.join(base, 'ai', 'evaluations', 'runs');
    // An older run in the runner's default layout (run-id dir).
    writeJson(
      path.join(modelDir, 'real-model-gemini-3-8-flash-20261121-100000', 'latest.json'),
      phase4Report({ generated: '2026-11-21T10:00:00.000Z' }),
    );
    // A newer run exported as a flat file under ai/evaluations/runs/.
    const newerPath = path.join(runsDir, 'real-model-gemini-3.8-flash-20261122.json');
    writeJson(newerPath, phase4Report({ generated: '2026-11-22T01:30:00.000Z' }));
    // An unrelated file in the runs dir is ignored.
    writeJson(path.join(runsDir, 'notes.json'), { generated: '2026-11-23T00:00:00.000Z' });
    const found = discoverModelReport({
      explicitPath: null,
      defaultPath: path.join(modelDir, 'latest.json'),
      modelReportsDir: modelDir,
      runsDir,
    });
    assert.equal(found.path, newerPath, 'newest by generated timestamp wins');
    assert.equal(found.report.generated, '2026-11-22T01:30:00.000Z');
    // An explicit path wins over discovery.
    const explicit = discoverModelReport({
      explicitPath: path.join(modelDir, 'real-model-gemini-3-8-flash-20261121-100000', 'latest.json'),
      defaultPath: path.join(modelDir, 'latest.json'),
      modelReportsDir: modelDir,
      runsDir,
    });
    assert.equal(explicit.report.generated, '2026-11-21T10:00:00.000Z');
    // Nothing found anywhere is null, not an error.
    assert.equal(discoverModelReport({
      explicitPath: null,
      defaultPath: path.join(base, 'nope', 'latest.json'),
      modelReportsDir: path.join(base, 'nope'),
      runsDir: path.join(base, 'nope2'),
    }), null);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('generateReport discovers a real-model run and renders its provider, model, and dataset', async () => {
  const base = tmpTree();
  try {
    const mockPath = path.join(base, 'mock.json');
    const modelDir = path.join(base, 'evals', 'reports', 'model');
    writeJson(mockPath, fixtureReport());
    writeJson(
      path.join(modelDir, 'real-model-gemini-3-8-flash-20261122-013000', 'latest.json'),
      phase4Report(),
    );
    const { data } = await generateReport({
      mockPath,
      modelPath: null,
      defaultModelPath: path.join(modelDir, 'latest.json'),
      modelReportsDir: modelDir,
      runsDir: path.join(base, 'ai', 'evaluations', 'runs'),
      baselinesDir: path.join(base, 'baselines'),
      subsetPath: path.join(base, 'subset.json'),
      outDir: path.join(base, 'out'),
      generated: GENERATED,
    });
    assert.equal(data.realModel.status, 'available');
    assert.equal(data.realModel.metrics.provider, 'gemini-3.8-flash');
    const htmlText = readFileSync(path.join(base, 'out', 'index.html'), 'utf8');
    assert.match(htmlText, /Real-model results — gemini-3\.8-flash/);
    assert.match(htmlText, /model requested gemini-3\.8-flash, served as gemini-3\.8-flash/);
    assert.match(htmlText, /Dataset: evals\/datasets\/real-model-subset-v2\.json \(version 2, 3 cases\)/);
    assert.ok(!htmlText.includes('UNAVAILABLE — no real-model evaluation has ever run'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ---- History and regressions ------------------------------------------

test('loadHistory sorts snapshots and dedupes current.json vs the dated copy', () => {
  const base = tmpTree();
  try {
    const dir = path.join(base, 'baselines');
    writeJson(path.join(dir, 'baseline-2026-11-20.json'), {
      generated: '2026-11-20T00:00:00.000Z',
      summary: { total: 463, passed: 460, passRate: 0.994, criticalFailures: 1 },
    });
    const snap21 = {
      generated: '2026-11-21T00:41:38.522Z',
      summary: { total: 463, passed: 463, passRate: 1, criticalFailures: 0 },
    };
    writeJson(path.join(dir, 'baseline-2026-11-21.json'), snap21);
    writeJson(path.join(dir, 'current.json'), snap21);
    const history = loadHistory(dir);
    assert.equal(history.length, 2, 'current.json duplicates the 2026-11-21 snapshot');
    assert.equal(history[0].date, '2026-11-20');
    assert.equal(history[1].date, '2026-11-21');
    assert.deepEqual(loadHistory(path.join(base, 'no-such-dir')), []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('regressionIndicators: comparison counts plus the pass-rate trend', () => {
  const mock = computeMetrics(fixtureReport());
  const history = [
    { generated: '2026-11-20T00:00:00.000Z', passRate: 0.6 },
    { generated: '2026-11-21T00:41:38.522Z', passRate: 0.667 },
  ];
  const reg = regressionIndicators(mock, history);
  assert.deepEqual(reg.regressions, ['CASE-003']);
  assert.deepEqual(reg.fixes, []);
  assert.equal(reg.baselineGenerated, '2026-11-21T00:41:38.522Z');
  assert.equal(reg.trend.direction, 'up');
  assert.equal(reg.trend.delta, 0.067);
  assert.equal(regressionIndicators(mock, []).trend, null);
});

// ---- End-to-end generation --------------------------------------------

test('generateReport: mock present, real-model absent → unavailable labels, no invented scores', async () => {
  const base = tmpTree();
  try {
    const mockPath = path.join(base, 'mock.json');
    const outDir = path.join(base, 'out');
    writeJson(mockPath, fixtureReport());
    const { html, markdown, input, data } = await generateReport({
      mockPath,
      modelPath: path.join(base, 'model', 'latest.json'),
      baselinesDir: path.join(base, 'baselines'),
      subsetPath: path.join(base, 'subset.json'),
      outDir,
      generated: GENERATED,
    });
    assert.ok(existsSync(html));
    assert.ok(existsSync(markdown));
    assert.ok(existsSync(input));
    assert.equal(data.realModel.status, 'unavailable');
    assert.equal(data.realModel.blocker, REAL_MODEL_BLOCKER);

    const htmlText = readFileSync(html, 'utf8');
    // Mock results are labeled MOCK and show their real numbers.
    assert.match(htmlText, /MOCK RESULTS/);
    assert.match(htmlText, /3 total, 2 passed, 1 failed \(pass rate 66\.7%\)/);
    assert.match(htmlText, /Skill selection accuracy<\/th><td>75\.0%<\/td><td>3\/4<\/td>/);
    // The real-model section shows UNAVAILABLE — and the blocker.
    assert.match(htmlText, /UNAVAILABLE — no real-model evaluation has ever run/);
    assert.match(htmlText, /A Gemini API key was connected and approved/);
    const realSection = htmlText.slice(
      htmlText.indexOf('Real-model results'),
      htmlText.indexOf('<h2>Methodology</h2>'),
    );
    assert.ok(!/\d+\.\d%/.test(realSection), 'no percentage may appear in the real-model section');
    assert.ok(!realSection.includes('75.0%'), 'mock scores must not leak into the real-model section');
    assert.equal((realSection.match(/UNAVAILABLE/g) || []).length, 6, 'one per metric plus the heading');
    // The input JSON is the exact data the report was generated from.
    const saved = JSON.parse(readFileSync(input, 'utf8'));
    assert.deepEqual(saved, data);
    assert.equal(saved.generated, GENERATED);

    const mdText = readFileSync(markdown, 'utf8');
    assert.match(mdText, /MOCK RESULTS/);
    assert.match(mdText, /\| Skill selection accuracy \| 75\.0% \| 3\/4 \|/);
    assert.match(mdText, /\| Refusal accuracy \| UNAVAILABLE \| — \|/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('generateReport: a real-model report renders its own metrics, labeled by provider', async () => {
  const base = tmpTree();
  try {
    const mockPath = path.join(base, 'mock.json');
    const modelPath = path.join(base, 'model.json');
    const outDir = path.join(base, 'out');
    writeJson(mockPath, fixtureReport());
    writeJson(modelPath, fixtureReport({
      provider: 'openai:gpt-5-mini',
      providerKind: 'model',
      providerMeta: { kind: 'model', provider: 'openai', model: 'gpt-5-mini', endpoint: 'api.openai.com' },
      generated: '2026-11-22T00:00:00.000Z',
      usage: { requests: 3, attempts: 3, retries: 0, errors: 0, promptTokens: 30, completionTokens: 15, totalTokens: 45, estimatedCostUsd: 0.001 },
      comparison: null,
    }));
    const { data } = await generateReport({
      mockPath, modelPath,
      baselinesDir: path.join(base, 'baselines'),
      subsetPath: path.join(base, 'subset.json'),
      outDir,
      generated: GENERATED,
    });
    assert.equal(data.realModel.status, 'available');
    const htmlText = readFileSync(path.join(outDir, 'index.html'), 'utf8');
    assert.match(htmlText, /Real-model results — openai:gpt-5-mini/);
    assert.match(htmlText, /model gpt-5-mini/);
    assert.ok(!htmlText.includes('UNAVAILABLE — no real-model evaluation has ever run'));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('generateReport: partial mock data renders UNAVAILABLE, missing mock fails', async () => {
  const base = tmpTree();
  try {
    const mockPath = path.join(base, 'mock.json');
    writeJson(mockPath, { provider: 'mock', providerKind: 'mock', results: [] });
    const { data } = await generateReport({
      mockPath,
      modelPath: path.join(base, 'model.json'),
      baselinesDir: path.join(base, 'baselines'),
      subsetPath: path.join(base, 'subset.json'),
      outDir: path.join(base, 'out'),
      generated: GENERATED,
    });
    assert.equal(data.mock.metrics.selection, null);
    const htmlText = readFileSync(path.join(base, 'out', 'index.html'), 'utf8');
    assert.match(htmlText, /Skill selection accuracy<\/th><td class="unavailable">UNAVAILABLE/);
    assert.match(htmlText, /No baseline snapshots found/);

    await assert.rejects(
      () => generateReport({
        mockPath: path.join(base, 'no-such.json'),
        modelPath: path.join(base, 'model.json'),
        baselinesDir: path.join(base, 'baselines'),
        subsetPath: path.join(base, 'subset.json'),
        outDir: path.join(base, 'out2'),
        generated: GENERATED,
      }),
      /cannot read mock eval report/,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('generateReport: deterministic output for identical input', async () => {
  const base = tmpTree();
  try {
    const mockPath = path.join(base, 'mock.json');
    writeJson(mockPath, fixtureReport());
    const opts = {
      mockPath,
      modelPath: path.join(base, 'model.json'),
      baselinesDir: path.join(base, 'baselines'),
      subsetPath: path.join(base, 'subset.json'),
      generated: GENERATED,
    };
    await generateReport({ ...opts, outDir: path.join(base, 'out1') });
    await generateReport({ ...opts, outDir: path.join(base, 'out2') });
    for (const file of ['index.html', 'summary.md', 'input.json']) {
      assert.equal(
        readFileSync(path.join(base, 'out1', file), 'utf8'),
        readFileSync(path.join(base, 'out2', file), 'utf8'),
        `${file} must be byte-identical across runs with the same inputs`,
      );
    }
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('renderHtml escapes dynamic content (direct data object)', () => {
  const mock = computeMetrics(fixtureReport({
    provider: 'mock<script>alert(1)</script>',
  }));
  const data = {
    generated: GENERATED,
    sources: { mockReport: 'mock.json', modelReport: 'model.json', baselinesDir: 'baselines', subset: 'subset.json' },
    datasets: { fullSuite: { label: 'Full suite', cases: 3 }, realModelSubset: null },
    mock,
    realModel: { status: 'unavailable', blocker: REAL_MODEL_BLOCKER },
    history: [],
    regressions: regressionIndicators(mock, []),
  };
  const html = renderHtml(data);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  const md = renderMarkdown(data);
  assert.ok(md.includes('mock<script>alert(1)</script>'), 'Markdown has no HTML context to escape for');
});

test('CLI exits 1 when the mock report is missing', () => {
  const res = spawnSync(process.execPath, [
    'scripts/generate-benchmark-report.mjs',
    '--mock', 'no-such-report.json',
    '--out', path.join(os.tmpdir(), 'skillforge-benchmark-cli-test'),
  ], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30000 });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /cannot read mock eval report/);
});
