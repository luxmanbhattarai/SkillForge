// quality-trends.test.mjs — snapshot assembly, comparison, parsers.
//
// buildSnapshot/compareSnapshots and the output parsers are pure and
// deterministic given fixed inputs; the tests below pin that behavior
// with fixtures. One integration test runs measureRoot against a
// synthetic (non-git) root to prove missing sources are recorded as
// unavailable, never estimated.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSnapshot,
  classifyDelta,
  compareSnapshots,
  computeA11yDocCoverage,
  flagType,
  measureRoot,
  metricDirection,
  normalizeDisclosure,
  parseLinksOutput,
  parseTestSummary,
  parseValidateOutput,
  snapshotFilename,
} from '../scripts/quality-trends.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'scripts', 'quality-trends.mjs');

const COMMIT_A = { hash: 'aaaaaaa0000000000000000000000000000000000', short: 'aaaaaaa', date: '2026-11-20T12:00:00-07:00', branch: 'main' };
const COMMIT_B = { hash: 'bbbbbbb0000000000000000000000000000000000', short: 'bbbbbbb', date: '2026-11-21T12:00:00-07:00', branch: 'main' };

function fullInputs() {
  return {
    unavailable: [],
    counts: { totalSkills: 277, originalSkills: 228, upstreamSkills: 49, categories: 18, agents: 24, workflows: 16 },
    scores: {
      summary: {
        scored: 228,
        meanOverall: 87,
        meanDimensions: { accuracy: 100, completeness: 99, actionability: 91, security: 95, testing: 37, documentation: 99, versioning: 76, maintainability: 98 },
        critical: 0,
      },
      results: [
        { path: 'skills/frontend/a/SKILL.md', category: 'frontend', overall: 90, flags: [] },
        { path: 'skills/frontend/b/SKILL.md', category: 'frontend', overall: 65, flags: ['accessibility: no accessibility content (applicable category)'] },
        { path: 'skills/backend/c/SKILL.md', category: 'backend', overall: 80, flags: [] },
      ],
    },
    verification: { verified: 255, withLimitations: 16, needsCorrection: 6, unverified: 0 },
    security: { findings: 0, scannedTextFiles: 1125 },
    links: { internalChecked: 500, externalListed: 600, errors: 0, passed: true },
    validation: { skillsChecked: 277, original: 228, upstream: 49, errors: 0, warnings: 5, upstreamWarnings: 4, passed: true },
    freshness: { within365dPct: 100, missing: 0, dated: 277, referenceDate: '2026-11-21' },
    tests: { tests: 344, pass: 342, fail: 1, skipped: 1, cancelled: 0 },
    evals: { total: 463, failed: 0, passRate: 1, provider: 'mock', generated: '2026-11-21T21:13:30.553Z' },
  };
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

test('parseTestSummary reads TAP format', () => {
  const text = ['TAP version 13', '# Subtest: x', 'ok 1 - x', '# tests 10', '# pass 9', '# fail 1', '# cancelled 0', '# skipped 0'].join('\n');
  assert.deepEqual(parseTestSummary(text), { tests: 10, pass: 9, fail: 1, skipped: 0, cancelled: 0 });
});

test('parseTestSummary reads the default spec reporter format', () => {
  const text = ['✔ some test (1ms)', 'ℹ tests 344', 'ℹ pass 342', 'ℹ fail 1', 'ℹ cancelled 0', 'ℹ skipped 1'].join('\n');
  assert.deepEqual(parseTestSummary(text), { tests: 344, pass: 342, fail: 1, skipped: 1, cancelled: 0 });
});

test('parseTestSummary returns null without a summary', () => {
  assert.equal(parseTestSummary('no summary here\n'), null);
  assert.equal(parseTestSummary('# pass 5\n'), null); // fail count missing
});

test('parseValidateOutput counts errors and warnings', () => {
  const text = [
    'Checked 277 skills (228 original, 49 upstream).',
    '  WARN  skills/frontend/nextjs/SKILL.md: SKILL.md is 530 lines (recommended max 500)',
    '  WARN (upstream)  skills/upstream/x/SKILL.md: placeholder marker found',
    '  ERROR skills/backend/y/SKILL.md: missing section',
    'FAIL: 1 error(s), 2 warning(s).',
  ].join('\n');
  const r = parseValidateOutput(text);
  assert.equal(r.skillsChecked, 277);
  assert.equal(r.original, 228);
  assert.equal(r.upstream, 49);
  assert.equal(r.errors, 1);
  assert.equal(r.warnings, 2);
  assert.equal(r.upstreamWarnings, 1);
  assert.equal(r.passed, false);
});

test('parseValidateOutput handles a clean PASS', () => {
  const text = 'Checked 277 skills (228 original, 49 upstream).\nPASS: all skills valid.\n';
  const r = parseValidateOutput(text);
  assert.equal(r.errors, 0);
  assert.equal(r.warnings, 0);
  assert.equal(r.passed, true);
});

test('parseLinksOutput reads PASS and FAIL summaries', () => {
  const pass = 'Checked 500 internal links; 600 unique external URLs listed (use --online to verify).\nPASS.\n';
  assert.deepEqual(parseLinksOutput(pass), { internalChecked: 500, externalListed: 600, errors: 0, passed: true });
  const fail = 'Checked 500 internal links; 600 unique external URLs listed (use --online to verify).\n  ERROR a: broken internal link: b\nFAIL: 1 error(s).\n';
  assert.deepEqual(parseLinksOutput(fail), { internalChecked: 500, externalListed: 600, errors: 1, passed: false });
});

test('flagType extracts the slug before the first colon', () => {
  assert.equal(flagType('versioning: no version info in Prerequisites'), 'versioning');
  assert.equal(flagType('accessibility: no accessibility content (applicable category)'), 'accessibility');
  assert.equal(flagType('accuracy-proxy: 2 broken relative link(s)'), 'accuracy-proxy');
  assert.equal(flagType('CRITICAL: security pattern hit: X'), 'critical');
  assert.equal(flagType('completeness: missing sections: Purpose'), 'completeness');
  assert.equal(flagType('no-colon-flag'), 'no-colon-flag');
});

test('metricDirection resolves dynamic flag and category ids', () => {
  assert.equal(metricDirection('flags.versioning'), 'lower');
  assert.equal(metricDirection('flags.totalFlagged'), 'lower');
  assert.equal(metricDirection('categoryMean.content'), 'higher');
  assert.equal(metricDirection('score.meanOverall'), 'higher');
  assert.equal(metricDirection('counts.totalSkills'), 'neutral');
  assert.equal(metricDirection('something.unknown'), 'neutral');
});

test('normalizeDisclosure accepts summary or top-level fields', () => {
  assert.deepEqual(
    normalizeDisclosure({ summary: { totalSkills: 228, skillsWithSubdirs: 0, medianBodyLines: 247, maxBodyLines: 488 } }),
    { totalSkills: 228, skillsWithSubdirs: 0, coveragePct: 0, medianBodyLines: 247, maxBodyLines: 488 },
  );
  assert.deepEqual(
    normalizeDisclosure({ total: 10, withSubdirs: 5, coveragePct: 50, medianBodyLines: 100, maxBodyLines: 200 }),
    { totalSkills: 10, skillsWithSubdirs: 5, coveragePct: 50, medianBodyLines: 100, maxBodyLines: 200 },
  );
  assert.equal(normalizeDisclosure({}), null);
  assert.equal(normalizeDisclosure(null), null);
});

test('normalizeDisclosure accepts the keys disclosure-coverage.mjs actually emits', () => {
  // Integration fix (2026-11-22): the first snapshot run found all
  // four disclosure metrics unavailable because the producer emits
  // withFolders/medianLines/maxLines, which the normalizer did not
  // recognize. Shape below mirrors the real --out JSON (summary
  // object, total-line semantics).
  assert.deepEqual(
    normalizeDisclosure({ summary: { total: 228, medianLines: 247, maxLines: 400, minLines: 142, withFolders: 44 } }),
    { totalSkills: 228, skillsWithSubdirs: 44, coveragePct: 19.3, medianBodyLines: 247, maxBodyLines: 400 },
  );
});

// ---------------------------------------------------------------------------
// buildSnapshot: determinism + unavailable handling
// ---------------------------------------------------------------------------

test('buildSnapshot is deterministic given fixed inputs', () => {
  const args = { generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() };
  const a = buildSnapshot(args);
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  assert.deepEqual(a, b);
  assert.equal(a.format, 'skillforge-quality-snapshot');
  assert.equal(a.version, 1);
});

test('buildSnapshot measures the documented metrics', () => {
  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  assert.equal(s.metrics['counts.totalSkills'].value, 277);
  assert.equal(s.metrics['score.meanOverall'].value, 87);
  assert.equal(s.metrics['score.testing'].value, 37);
  assert.equal(s.metrics['verification.verifiedPct'].value, 92.1);
  assert.equal(s.metrics['verification.needsCorrection'].value, 6);
  assert.equal(s.metrics['security.findings'].value, 0);
  assert.equal(s.metrics['links.brokenInternal'].value, 0);
  assert.equal(s.metrics['validation.warnings'].value, 5);
  assert.equal(s.metrics['tests.passRate'].value, 99.7);
  assert.equal(s.metrics['evals.passRate'].value, 100);
  assert.equal(s.metrics['freshness.verifiedWithin365dPct'].value, 100);
});

test('buildSnapshot derives below-70 and a11y coverage from scorer results', () => {
  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  // One of three results scores 65.
  assert.equal(s.metrics['score.below70'].value, 1);
  // Two applicable-category skills (frontend); one has the a11y flag.
  // The backend skill is not in the denominator.
  assert.equal(s.metrics['a11y.coveragePct'].value, 50);
  assert.deepEqual(s.metrics['a11y.coveragePct'].detail, { applicable: 2, withContent: 1 });
});

test('buildSnapshot captures flag counts and per-category means', () => {
  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  // One of three results carries a flag.
  assert.equal(s.metrics['flags.totalFlagged'].value, 1);
  assert.equal(s.metrics['flags.flaggedPct'].value, 33.3);
  assert.equal(s.metrics['flags.accessibility'].value, 1);
  assert.equal('flags.versioning' in s.metrics, false);
  // Per-category means: frontend (90+65)/2, backend 80.
  assert.equal(s.metrics['categoryMean.frontend'].value, 77.5);
  assert.equal(s.metrics['categoryMean.backend'].value, 80);
  // Details carry the exact histogram and per-category table.
  assert.deepEqual(s.details.flags.histogram, { 'accessibility: no accessibility content (applicable category)': 1 });
  assert.deepEqual(s.details.flags.byType, { accessibility: 1 });
  assert.deepEqual(s.details.categories.frontend, { n: 2, meanOverall: 77.5, flagged: 1 });
  assert.deepEqual(s.details.categories.backend, { n: 1, meanOverall: 80, flagged: 0 });
});

test('buildSnapshot records a11y doc coverage and disclosure when present', () => {
  const inputs = fullInputs();
  inputs.a11yDoc = { applicable: 95, withGuidance: 16, coveragePct: 16.8, lacking: ['content/a', 'content/b'] };
  inputs.disclosure = { totalSkills: 228, skillsWithSubdirs: 0, coveragePct: 0, medianBodyLines: 247, maxBodyLines: 488 };
  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs });
  assert.equal(s.metrics['a11y.docCoveragePct'].value, 16.8);
  assert.equal(s.metrics['a11y.applicableSkills'].value, 95);
  assert.equal(s.metrics['a11y.withGuidance'].value, 16);
  assert.equal(s.metrics['disclosure.coveragePct'].value, 0);
  assert.equal(s.metrics['disclosure.medianBodyLines'].value, 247);
  assert.equal(s.metrics['disclosure.maxBodyLines'].value, 488);
  assert.equal(s.metrics['disclosure.skillsWithSubdirs'].value, 0);
  assert.deepEqual(s.details.a11y.lacking, ['content/a', 'content/b']);
});

test('buildSnapshot records missing metrics as unavailable, never estimated', () => {
  const inputs = fullInputs();
  delete inputs.scores;
  delete inputs.tests;
  inputs.unavailable = [{ id: 'score.*', reason: 'scorer not present at this commit' }];
  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs });
  assert.equal('score.meanOverall' in s.metrics, false);
  assert.equal('tests.passed' in s.metrics, false);
  // The measurer's group-level record passes through untouched.
  assert.ok(s.unavailable.some((u) => u.id === 'score.*'));
  // But the metrics that WERE measured are still present.
  assert.equal(s.metrics['counts.totalSkills'].value, 277);
});

test('buildSnapshot records a null measured value as unavailable', () => {
  const inputs = fullInputs();
  inputs.security = { findings: null, scannedTextFiles: null };
  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_A, inputs });
  assert.equal('security.findings' in s.metrics, false);
  assert.ok(s.unavailable.some((u) => u.id === 'security.findings'));
});

test('snapshotFilename uses the commit date and short hash', () => {
  const s = buildSnapshot({ generated: '2026-11-22T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  assert.equal(snapshotFilename(s), '2026-11-20-aaaaaaa.json');
});

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

test('classifyDelta respects metric direction', () => {
  assert.equal(classifyDelta('score.meanOverall', 87, 89), 'improved');
  assert.equal(classifyDelta('score.meanOverall', 87, 85), 'regressed');
  assert.equal(classifyDelta('score.meanOverall', 87, 87), 'unchanged');
  assert.equal(classifyDelta('security.findings', 0, 2), 'regressed');
  assert.equal(classifyDelta('security.findings', 2, 0), 'improved');
  // Counts are neutral: a change is a change, not a regression.
  assert.equal(classifyDelta('counts.totalSkills', 226, 277), 'changed');
  assert.equal(classifyDelta('counts.totalSkills', 277, 277), 'unchanged');
  // Dynamic ids: flag counts are lower-is-better, category means higher.
  assert.equal(classifyDelta('flags.versioning', 110, 90), 'improved');
  assert.equal(classifyDelta('flags.versioning', 110, 120), 'regressed');
  assert.equal(classifyDelta('categoryMean.content', 76.7, 80), 'improved');
  assert.equal(classifyDelta('categoryMean.content', 76.7, 70), 'regressed');
});

test('compareSnapshots detects a regression and an improvement', () => {
  const a = buildSnapshot({ generated: '2026-11-20T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  const inputsB = fullInputs();
  inputsB.scores.summary.meanOverall = 84; // regressed
  inputsB.scores.summary.meanDimensions.testing = 45; // improved
  inputsB.security.findings = 1; // regressed (lower is better)
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_B, inputs: inputsB });
  const r = compareSnapshots(a, b);
  const byId = Object.fromEntries(r.comparisons.map((c) => [c.id, c]));
  assert.equal(byId['score.meanOverall'].verdict, 'regressed');
  assert.equal(byId['score.meanOverall'].delta, -3);
  assert.equal(byId['score.testing'].verdict, 'improved');
  assert.equal(byId['score.testing'].delta, 8);
  assert.equal(byId['security.findings'].verdict, 'regressed');
  assert.equal(byId['score.accuracy'].verdict, 'unchanged');
  assert.equal(r.summary.regressed, 2);
  assert.equal(r.summary.improved, 1);
});

test('compareSnapshots: identical snapshots are all unchanged', () => {
  const a = buildSnapshot({ generated: '2026-11-20T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_B, inputs: fullInputs() });
  const r = compareSnapshots(a, b);
  assert.equal(r.summary.regressed, 0);
  assert.equal(r.summary.improved, 0);
  assert.equal(r.summary.changed, 0);
  assert.ok(r.comparisons.every((c) => c.verdict === 'unchanged'));
});

test('compareSnapshots reports metrics measured on one side only', () => {
  const a = buildSnapshot({ generated: '2026-11-20T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  const inputsB = fullInputs();
  delete inputsB.tests;
  delete inputsB.evals;
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_B, inputs: inputsB });
  const r = compareSnapshots(a, b);
  const byId = Object.fromEntries(r.comparisons.map((c) => [c.id, c]));
  assert.equal(byId['tests.passed'].verdict, 'only-in-older');
  assert.equal(byId['evals.passRate'].verdict, 'only-in-older');
  // A one-sided metric is reported, not counted as a regression.
  assert.equal(r.summary.regressed, 0);
  assert.ok(r.summary.onlyInOlder >= 2);
});

test('compareSnapshots covers flag counts, not just means', () => {
  const a = buildSnapshot({ generated: '2026-11-20T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  const inputsB = fullInputs();
  // The flag-fix work lands: the a11y flag is gone, but the backend
  // skill regresses to 60 (still flagged-free) and content mean falls.
  inputsB.scores.results = [
    { path: 'skills/frontend/a/SKILL.md', category: 'frontend', overall: 90, flags: [] },
    { path: 'skills/frontend/b/SKILL.md', category: 'frontend', overall: 66, flags: [] },
    { path: 'skills/backend/c/SKILL.md', category: 'backend', overall: 60, flags: ['versioning: no version info in Prerequisites'] },
  ];
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_B, inputs: inputsB });
  const r = compareSnapshots(a, b);
  const byId = Object.fromEntries(r.comparisons.map((c) => [c.id, c]));
  // Flag counts are compared with lower-is-better semantics, and a
  // flag type fixed to zero is an improvement — not "only in older":
  // absence of a flags.* metric means zero occurrences when both
  // snapshots have scorer data.
  assert.equal(byId['flags.accessibility'].verdict, 'improved');
  assert.equal(byId['flags.accessibility'].oldValue, 1);
  assert.equal(byId['flags.accessibility'].newValue, 0);
  assert.equal(byId['flags.accessibility'].delta, -1);
  assert.equal(byId['flags.versioning'].verdict, 'regressed');
  assert.equal(byId['flags.versioning'].oldValue, 0);
  assert.equal(byId['flags.versioning'].newValue, 1);
  assert.equal(byId['flags.totalFlagged'].verdict, 'unchanged');
  // Per-category means are compared too.
  assert.equal(byId['categoryMean.frontend'].verdict, 'improved');
  assert.equal(byId['categoryMean.backend'].verdict, 'regressed');
  // The backend skill dropping to 60 also raises below-70.
  assert.equal(byId['score.below70'].verdict, 'regressed');
  assert.equal(r.summary.regressed, 3);
});

test('compareSnapshots does not zero-fill flags when one side has no scores', () => {
  const a = buildSnapshot({ generated: '2026-11-20T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  const inputsB = fullInputs();
  delete inputsB.scores; // no scorer data at all in the newer snapshot
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_B, inputs: inputsB });
  const r = compareSnapshots(a, b);
  const byId = Object.fromEntries(r.comparisons.map((c) => [c.id, c]));
  // Without scorer data the flag counts are unmeasured, not zero.
  assert.equal(byId['flags.accessibility'].verdict, 'only-in-older');
  assert.equal(byId['flags.totalFlagged'].verdict, 'only-in-older');
  assert.equal(r.summary.regressed, 0);
});

// ---------------------------------------------------------------------------
// Accessibility documentation coverage (Phase 8 rule)
// ---------------------------------------------------------------------------

test('computeA11yDocCoverage applies the subsection rule', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-a11y-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const write = async (key, text) => {
    await mkdir(path.join(dir, 'skills', key), { recursive: true });
    await writeFile(path.join(dir, 'skills', key, 'SKILL.md'), text, 'utf8');
  };
  await write('frontend/with-sub', [
    '# Skill', '', '## Implementation Standards', '', '### Accessibility', '',
    'Line one.', 'Line two.', 'Line three.', 'Line four.', '',
    '## Best Practices', '',
  ].join('\n'));
  await write('frontend/stub', [
    '# Skill', '', '## Implementation Standards', '', '### Accessibility', '',
    'Line one.', 'Line two.', '',
  ].join('\n'));
  await write('frontend/none', '# Skill\n\n## Implementation Standards\n\nNo subsection.\n');
  await write('testing/whole', '# Accessibility Testing\n\nTest with a screen reader and keyboard.\n');
  const classification = {
    skills: {
      'frontend/with-sub': { applicability: 'applicable', guidance: 'subsection', reason: 'Produces UI people interact with.' },
      'frontend/stub': { applicability: 'applicable', guidance: 'subsection', reason: 'Produces UI people interact with.' },
      'frontend/none': { applicability: 'applicable', guidance: 'subsection', reason: 'Produces UI people interact with.' },
      'frontend/missing': { applicability: 'applicable', guidance: 'subsection', reason: 'Produces UI people interact with.' },
      'testing/whole': { applicability: 'applicable', guidance: 'whole-skill', reason: 'The skill itself is accessibility guidance.' },
      'backend/na': { applicability: 'not-applicable', guidance: 'none', reason: 'Purely machine-facing; no UI in its deliverable.' },
    },
  };
  const r = await computeA11yDocCoverage(dir, classification);
  assert.equal(r.applicable, 5);
  assert.equal(r.withGuidance, 2);
  assert.equal(r.coveragePct, 40);
  assert.deepEqual(r.lacking.sort(), ['frontend/missing', 'frontend/none', 'frontend/stub']);
});

// ---------------------------------------------------------------------------
// measureRoot integration: synthetic root, missing sources
// ---------------------------------------------------------------------------

test('measureRoot records absent sources as unavailable', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-trends-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'registry'), { recursive: true });
  await mkdir(path.join(dir, 'sources'), { recursive: true });
  await mkdir(path.join(dir, 'evals', 'reports'), { recursive: true });
  await writeFile(path.join(dir, 'registry', 'skills.json'), JSON.stringify({
    total_skills: 2,
    categories: ['frontend', 'backend'],
    skills: [
      { name: 'a', source_type: 'original', last_verified: '2026-11-20' },
      { name: 'b', source_type: 'upstream', last_verified: '2025-01-01' },
    ],
  }), 'utf8');
  await writeFile(path.join(dir, 'sources', 'verification-status.json'), JSON.stringify({
    statuses: { a: { status: 'verified' }, b: { status: 'needs-correction' } },
  }), 'utf8');
  await writeFile(path.join(dir, 'evals', 'reports', 'latest.json'), JSON.stringify({
    generated: '2026-11-21T00:00:00.000Z', provider: 'mock',
    summary: { total: 10, passed: 9, failed: 1, passRate: 0.9 },
  }), 'utf8');

  const inputs = await measureRoot(dir, { skipTests: true, commit: 'deadbeef00000000000000000000000000000000' });
  // Measured from the files present.
  assert.equal(inputs.counts.totalSkills, 2);
  assert.equal(inputs.counts.originalSkills, 1);
  assert.equal(inputs.counts.upstreamSkills, 1);
  assert.equal(inputs.verification.verified, 1);
  assert.equal(inputs.verification.needsCorrection, 1);
  assert.equal(inputs.evals.total, 10);
  assert.equal(inputs.evals.passRate, 0.9);
  // Absent sources recorded as unavailable, with reasons.
  const ids = inputs.unavailable.map((u) => u.id);
  assert.ok(ids.includes('score.*'));
  assert.ok(ids.includes('security.*'));
  assert.ok(ids.includes('links.*'));
  assert.ok(ids.includes('validation.*'));
  assert.ok(ids.includes('tests.*'));
  assert.ok(ids.includes('freshness.report'));
  assert.ok(ids.includes('a11y.docCoverage*'));
  assert.ok(ids.includes('disclosure.*'));
  // Freshness used the commit date fallback (no git history here, so
  // the reference is today): the stale skill is still counted.
  assert.equal(inputs.freshness.missing, 0);
  assert.equal(inputs.freshness.dated, 2);

  const s = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: inputs.commit, inputs });
  assert.equal(s.metrics['counts.totalSkills'].value, 2);
  assert.equal('score.meanOverall' in s.metrics, false);
});

test('measureRoot reads a11y classification and disclosure data when present', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-trends-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'registry'), { recursive: true });
  await mkdir(path.join(dir, 'sources'), { recursive: true });
  await mkdir(path.join(dir, 'ai', 'quality'), { recursive: true });
  await mkdir(path.join(dir, 'skills', 'frontend', 'a'), { recursive: true });
  await writeFile(path.join(dir, 'registry', 'skills.json'), JSON.stringify({
    total_skills: 1, categories: ['frontend'],
    skills: [{ name: 'a', source_type: 'original', last_verified: '2026-11-20' }],
  }), 'utf8');
  await writeFile(path.join(dir, 'sources', 'accessibility-classification.json'), JSON.stringify({
    counts: { total_original_skills: 1, applicable: 1, not_applicable: 0 },
    skills: {
      'frontend/a': { applicability: 'applicable', guidance: 'subsection', reason: 'Produces UI people interact with.' },
    },
  }), 'utf8');
  await writeFile(path.join(dir, 'skills', 'frontend', 'a', 'SKILL.md'), [
    '# A', '', '## Implementation Standards', '', '### Accessibility', '',
    'One.', 'Two.', 'Three.', 'Four.', '',
  ].join('\n'), 'utf8');
  await writeFile(path.join(dir, 'ai', 'quality', 'disclosure-coverage.json'), JSON.stringify({
    summary: { totalSkills: 228, skillsWithSubdirs: 0, medianBodyLines: 247, maxBodyLines: 488 },
  }), 'utf8');

  const inputs = await measureRoot(dir, { skipTests: true, commit: 'deadbeef00000000000000000000000000000000' });
  assert.deepEqual(inputs.a11yDoc, { applicable: 1, withGuidance: 1, coveragePct: 100, lacking: [] });
  assert.deepEqual(inputs.disclosure, { totalSkills: 228, skillsWithSubdirs: 0, coveragePct: 0, medianBodyLines: 247, maxBodyLines: 488 });
  const ids = inputs.unavailable.map((u) => u.id);
  assert.ok(!ids.includes('a11y.docCoverage*'));
  assert.ok(!ids.includes('disclosure.*'));
});

// ---------------------------------------------------------------------------
// CLI: compare exits 1 on regression, 0 otherwise
// ---------------------------------------------------------------------------

test('CLI compare exits 1 on a regression and 0 when clean', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-trends-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const a = buildSnapshot({ generated: '2026-11-20T00:00:00.000Z', commit: COMMIT_A, inputs: fullInputs() });
  const inputsB = fullInputs();
  inputsB.scores.summary.meanOverall = 80;
  const b = buildSnapshot({ generated: '2026-11-21T00:00:00.000Z', commit: COMMIT_B, inputs: inputsB });
  const fileA = path.join(dir, 'a.json');
  const fileB = path.join(dir, 'b.json');
  await writeFile(fileA, JSON.stringify(a), 'utf8');
  await writeFile(fileB, JSON.stringify(b), 'utf8');

  assert.throws(
    () => execFileSync(process.execPath, [SCRIPT, 'compare', fileA, fileB], { encoding: 'utf8' }),
    (e) => e.status === 1 && e.stdout.includes('regressed'),
  );
  const clean = execFileSync(process.execPath, [SCRIPT, 'compare', fileA, fileA], { encoding: 'utf8' });
  assert.ok(clean.includes('regressed: 0'));
});
