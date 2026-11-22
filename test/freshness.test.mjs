// freshness.test.mjs — tests for the freshness scorer (Phase 7).
//
// Scoring tests are pure unit tests with a fixed reference date —
// never the live repo clock — so the age arithmetic is
// deterministic. The end-to-end test builds a small synthetic repo
// tree in a temp dir (no git: the stability signal is unknown there,
// which the test asserts is handled by exclusion, not by a crash).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_WARN_DAYS,
  DEFAULT_CRITICAL_DAYS,
  parseDate,
  dayDiff,
  scoreSkill,
  parseImportDates,
  countBrokenInternalLinks,
  countSections,
  resolveThresholds,
  runFreshness,
} from '../scripts/freshness.mjs';

// Fixed reference date for every scoring test: 2026-11-22.
const REF = Date.UTC(2026, 10, 22);
const OPTS = { referenceDate: REF, warnDays: DEFAULT_WARN_DAYS, criticalDays: DEFAULT_CRITICAL_DAYS };

function baseSkill(overrides = {}) {
  return {
    name: 'example-skill',
    category: 'testing',
    sourceType: 'original',
    status: 'verified',
    lastVerified: '2026-11-20',
    lastChange: '2026-11-20',
    brokenInternalLinks: 0,
    sectionsPresent: 15,
    sectionsTotal: 15,
    externalLinks: null,
    ...overrides,
  };
}

// --- Date helpers ----------------------------------------------------------

test('parseDate accepts valid dates and rejects malformed or impossible ones', () => {
  assert.equal(parseDate('2026-11-20'), Date.UTC(2026, 10, 20));
  assert.equal(parseDate('2026-02-30'), null); // impossible calendar date
  assert.equal(parseDate('2026-13-01'), null); // impossible month
  assert.equal(parseDate('20-11-2026'), null); // wrong shape
  assert.equal(parseDate('not a date'), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(20261120), null);
});

test('dayDiff counts whole days between UTC midnights', () => {
  assert.equal(dayDiff(Date.UTC(2026, 10, 20), REF), 2);
  assert.equal(dayDiff(Date.UTC(2025, 10, 22), REF), 365);
  assert.equal(dayDiff(REF, REF), 0);
});

// --- Scoring: the happy path and the bands ---------------------------------

test('recently verified skill with no issues scores FRESH', () => {
  const r = scoreSkill(baseSkill(), OPTS);
  assert.equal(r.band, 'FRESH');
  assert.ok(r.score >= 95, `expected a near-perfect score, got ${r.score}`);
  assert.equal(r.ageDays, 2);
  assert.deepEqual(r.reasons, []);
});

test('warn-threshold boundary: age == warnDays is not capped, age == warnDays + 1 is', () => {
  // Custom thresholds isolate the cap from the score decay: with
  // warnDays 30 the score at 30 days is still ~92 (FRESH on score),
  // so only the cap can move the band. The boundary is "older than
  // N days", matching `query stale`.
  const opts = { referenceDate: REF, warnDays: 30, criticalDays: 365 };
  const at = scoreSkill(baseSkill({ lastVerified: '2026-10-23', lastChange: '2026-10-23' }), opts);
  assert.equal(at.ageDays, 30);
  assert.equal(at.band, 'FRESH');
  const past = scoreSkill(baseSkill({ lastVerified: '2026-10-22', lastChange: '2026-10-22' }), opts);
  assert.equal(past.ageDays, 31);
  assert.equal(past.band, 'AGING');
  assert.ok(past.score >= 80, `score alone would be FRESH (${past.score}); only the cap ages it`);
});

test('critical-threshold boundary: age == criticalDays is not critical, age + 1 is', () => {
  // Custom criticalDays 60 isolates the rule the same way.
  const opts = { referenceDate: REF, warnDays: 30, criticalDays: 60 };
  const at = scoreSkill(baseSkill({ lastVerified: '2026-09-23', lastChange: '2026-09-23' }), opts);
  assert.equal(at.ageDays, 60);
  assert.notEqual(at.band, 'CRITICAL');
  const past = scoreSkill(baseSkill({ lastVerified: '2026-09-22', lastChange: '2026-09-22' }), opts);
  assert.equal(past.ageDays, 61);
  assert.equal(past.band, 'CRITICAL');
});

test('with default thresholds, a skill at the 365-day critical boundary scores 63.2 (AGING, not CRITICAL)', () => {
  const r = scoreSkill(baseSkill({ lastVerified: '2025-11-22', lastChange: '2025-11-22' }), OPTS);
  assert.equal(r.ageDays, 365);
  // Recency decayed to 0; everything else perfect: 60 earned over
  // 95 available (the 5-point external-links signal is excluded
  // without a links report) → 63.2.
  assert.equal(r.score, 63.2);
  assert.equal(r.band, 'AGING');
});

test('with default thresholds, one day past critical is CRITICAL', () => {
  const r = scoreSkill(baseSkill({ lastVerified: '2025-11-21', lastChange: '2025-11-21' }), OPTS);
  assert.equal(r.ageDays, 366);
  assert.equal(r.band, 'CRITICAL');
});

test('old verified skill decays to STALE on score even below the critical threshold', () => {
  // At 300 days: recency ≈ 6.2, total ≈ 71.2 → AGING on score, but
  // the warn-days cap also says AGING. At 340 days: recency ≈ 2.4,
  // total ≈ 67.4 — still AGING. A score-STALE needs a second defect:
  // combine age with a post-verification edit.
  const r = scoreSkill(baseSkill({
    lastVerified: '2025-12-20',
    lastChange: '2026-11-01', // edited long after verification
    sectionsPresent: 8,
    brokenInternalLinks: 3,
  }), OPTS);
  assert.equal(r.band, 'STALE');
  assert.ok(r.score < 60, `expected score < 60, got ${r.score}`);
});

// --- UNVERIFIED is never fresh ----------------------------------------------

test('missing last_verified means UNVERIFIED, never FRESH', () => {
  const r = scoreSkill(baseSkill({ lastVerified: null, status: 'unverified' }), OPTS);
  assert.equal(r.band, 'UNVERIFIED');
  // The score is not 0: the link and completeness signals still
  // earn (20/80 available) — the score ranks unverified skills
  // against each other, while the band carries the verdict. The
  // evidence-based components are both zero.
  assert.equal(r.components.recency.earned, 0);
  assert.equal(r.components.status.earned, 0);
  assert.equal(r.score, 25);
  assert.ok(r.reasons.some((x) => x.includes('no parseable last_verified')));
});

test('upstream skill with no local verification date is UNVERIFIED', () => {
  // Upstream skills are verified by import review, not by a local
  // audit date — but a missing date is still missing evidence: the
  // skill must not score as fresh on the strength of nothing.
  const r = scoreSkill(baseSkill({
    sourceType: 'upstream',
    status: 'unverified',
    lastVerified: null,
    lastChange: null,
    brokenInternalLinks: null,
    sectionsPresent: null,
    upstreamImported: '2026-11-20',
    upstreamPin: 'e4bb5d960d87',
  }), OPTS);
  assert.equal(r.band, 'UNVERIFIED');
  assert.equal(r.score, 0);
});

test('malformed last_verified date means UNVERIFIED', () => {
  const r = scoreSkill(baseSkill({ lastVerified: '2026-02-30' }), OPTS);
  assert.equal(r.band, 'UNVERIFIED');
  assert.equal(r.ageDays, null);
});

test('empty input scores UNVERIFIED without crashing', () => {
  const r = scoreSkill({}, OPTS);
  assert.equal(r.band, 'UNVERIFIED');
  assert.equal(r.score, 0);
  assert.equal(r.ageDays, null);
});

test('unverified status with a date is still UNVERIFIED', () => {
  const r = scoreSkill(baseSkill({ status: 'unverified' }), OPTS);
  assert.equal(r.band, 'UNVERIFIED');
});

// --- Future dates, needs-correction, stability ------------------------------

test('future last_verified date warns and caps the band at AGING', () => {
  const r = scoreSkill(baseSkill({ lastVerified: '2027-01-15' }), OPTS);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /in the future/);
  assert.equal(r.band, 'AGING'); // capped: bad data cannot be trusted as fresh
  assert.equal(r.ageDays, 0); // clamped for scoring
});

test('needs-correction skill is capped at STALE even with a high score', () => {
  const r = scoreSkill(baseSkill({ status: 'needs-correction' }), OPTS);
  assert.ok(r.score >= 60, `expected score >= 60, got ${r.score}`);
  assert.equal(r.band, 'STALE');
  assert.ok(r.reasons.some((x) => x.includes('needs-correction')));
});

test('verified-with-limitations earns partial status credit', () => {
  const r = scoreSkill(baseSkill({ status: 'verified-with-limitations' }), OPTS);
  assert.equal(r.components.status.earned, 15);
  assert.equal(r.band, 'FRESH'); // 15/25 is still enough when everything else is perfect
});

test('content changed after verification zeroes the stability component', () => {
  const r = scoreSkill(baseSkill({ lastChange: '2026-11-21' }), OPTS);
  assert.equal(r.components.stability.earned, 0);
  assert.ok(r.reasons.some((x) => x.includes('content changed')));
});

test('unknown git history excludes stability instead of penalising it', () => {
  const r = scoreSkill(baseSkill({ lastChange: null }), OPTS);
  assert.equal(r.components.stability.earned, null);
  assert.equal(r.components.stability.available, 0);
  assert.equal(r.band, 'FRESH');
});

// --- Upstream exemptions and renormalization --------------------------------

test('upstream skill excludes link and completeness signals and renormalizes', () => {
  const r = scoreSkill(baseSkill({
    sourceType: 'upstream',
    brokenInternalLinks: null,
    sectionsPresent: null,
  }), OPTS);
  assert.equal(r.components.internalLinks.available, 0);
  assert.equal(r.components.completeness.available, 0);
  // Available weight is 35 + 25 + 15 = 75; a perfect upstream skill
  // still scores ~100 after renormalization.
  assert.ok(r.score >= 99, `expected renormalized ~100, got ${r.score}`);
  assert.equal(r.band, 'FRESH');
});

test('broken internal links deduct 2 points each, floored at 0', () => {
  const one = scoreSkill(baseSkill({ brokenInternalLinks: 1 }), OPTS);
  assert.equal(one.components.internalLinks.earned, 8);
  const many = scoreSkill(baseSkill({ brokenInternalLinks: 9 }), OPTS);
  assert.equal(many.components.internalLinks.earned, 0);
});

test('incomplete sections scale the completeness component', () => {
  const r = scoreSkill(baseSkill({ sectionsPresent: 9 }), OPTS);
  assert.equal(r.components.completeness.earned, 6);
});

test('external links only count when a links report is supplied', () => {
  const absent = scoreSkill(baseSkill(), OPTS);
  assert.equal(absent.components.externalLinks.available, 0);
  const present = scoreSkill(baseSkill({ externalLinks: { total: 10, broken: 2 } }), OPTS);
  assert.equal(present.components.externalLinks.earned, 4);
  assert.equal(present.components.externalLinks.available, 5);
  const empty = scoreSkill(baseSkill({ externalLinks: { total: 0, broken: 0 } }), OPTS);
  assert.equal(empty.components.externalLinks.available, 0); // no links: excluded, not penalised
});

// --- Threshold resolution ---------------------------------------------------

test('resolveThresholds prefers CLI over config file over defaults', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-freshness-test-'));
  try {
    const cfg = path.join(dir, 'freshness.config.json');
    await writeFile(cfg, JSON.stringify({ warnDays: 90, criticalDays: 200 }));
    assert.deepEqual(
      await resolveThresholds({ warnDays: null, criticalDays: null, config: cfg, root: dir }),
      { warnDays: 90, criticalDays: 200 },
    );
    assert.deepEqual(
      await resolveThresholds({ warnDays: 30, criticalDays: null, config: cfg, root: dir }),
      { warnDays: 30, criticalDays: 200 },
    );
    assert.deepEqual(
      await resolveThresholds({ warnDays: null, criticalDays: null, config: null, root: dir }),
      { warnDays: DEFAULT_WARN_DAYS, criticalDays: DEFAULT_CRITICAL_DAYS },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resolveThresholds rejects warnDays >= criticalDays', async () => {
  await assert.rejects(
    resolveThresholds({ warnDays: 365, criticalDays: 365, config: null, root: os.tmpdir() }),
    /must be smaller/,
  );
  await assert.rejects(
    resolveThresholds({ warnDays: -5, criticalDays: 365, config: null, root: os.tmpdir() }),
    /positive integer/,
  );
});

// --- Import-date parsing ----------------------------------------------------

test('parseImportDates reads only the skill-list paragraph per vendor', () => {
  const text = [
    '### Vercel — 8 skills (MIT)',
    '',
    'Source: https://github.com/vercel-labs/agent-skills ·',
    'Commit `5a37a6329fbad3666c3207392a6a7c0110e92efb` · Imported 2026-11-20 (re-imported from `1a2c79d4` on 2026-11-20; `web-design-guidelines` 1.0.0 → 1.1.0)',
    '',
    '`deploy-to-vercel`, `vercel-cli-with-tokens`,',
    '`web-design-guidelines`',
    '',
    'Unimported siblings: `seo-audit` was not imported.',
    '',
    '### Agentic SEO — 1 skill (MIT)',
    '',
    'Commit `67775741ce88e0a474513ac53d6f6e4558ff1a3b` · Imported 2026-11-19',
    '',
    'Live upstream: https://github.com/Bhanunamikaze/Agentic-SEO-Skill',
    '',
    '`seo` (includes 15 sub-skill references)',
  ].join('\n');
  const out = parseImportDates(text);
  assert.equal(out.get('deploy-to-vercel').imported, '2026-11-20');
  assert.equal(out.get('deploy-to-vercel').pin, '5a37a6329fbad3666c3207392a6a7c0110e92efb');
  assert.equal(out.get('web-design-guidelines').imported, '2026-11-20');
  assert.equal(out.get('seo').imported, '2026-11-19');
  assert.equal(out.has('seo-audit'), false); // unimported sibling: not in the list paragraph
  assert.equal(out.has('1a2c79d4'), false); // short SHA on the Commit line: not a skill
});

// --- File signals -----------------------------------------------------------

test('countBrokenInternalLinks counts only resolvable relative links', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-freshness-test-'));
  try {
    await mkdir(path.join(dir, 'reference'), { recursive: true });
    await writeFile(path.join(dir, 'reference', 'guide.md'), '# Guide\n');
    const text = [
      '[ok](./reference/guide.md)',
      '[ok with anchor](./reference/guide.md#section)',
      '[broken](./reference/missing.md)',
      '[external](https://example.com/page)',
      '[anchor](#local)',
      '[mail](mailto:someone@example.com)',
      '```md',
      '[fenced](./reference/also-missing.md)',
      '```',
    ].join('\n');
    assert.equal(countBrokenInternalLinks(dir, text, dir), 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('countSections counts required section headings after frontmatter', () => {
  const text = [
    '---',
    'name: example-skill',
    '---',
    '',
    '# Example',
    '',
    '## Purpose',
    '',
    '## When to Use',
    '',
    '## References',
    '',
  ].join('\n');
  assert.equal(countSections(text), 3);
});

// --- End-to-end against a fixture repo --------------------------------------

async function buildFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-freshness-test-'));
  await mkdir(path.join(root, 'registry'), { recursive: true });
  await mkdir(path.join(root, 'sources'), { recursive: true });
  await mkdir(path.join(root, 'skills', 'core', 'fresh-one'), { recursive: true });
  await mkdir(path.join(root, 'skills', 'core', 'old-one'), { recursive: true });
  await mkdir(path.join(root, 'skills', 'core', 'never-checked'), { recursive: true });
  const fullSkill = [
    '---', 'name: fresh-one', '---', '',
    '# Fresh One', '',
    ...['Purpose', 'When to Use', 'When Not to Use', 'Prerequisites',
      'Official Documentation', 'Required Workflow', 'Implementation Standards',
      'Best Practices', 'Security Considerations', 'Performance Considerations',
      'Common Mistakes', 'Examples', 'Validation Checklist',
      'Expected Deliverables', 'References'].map((s) => `## ${s}\n`),
  ].join('\n');
  await writeFile(path.join(root, 'skills', 'core', 'fresh-one', 'SKILL.md'), fullSkill);
  await writeFile(path.join(root, 'skills', 'core', 'old-one', 'SKILL.md'), '# Old\n\n## Purpose\n');
  await writeFile(path.join(root, 'skills', 'core', 'never-checked', 'SKILL.md'), '# Never\n');
  await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify({
    skills: [
      { name: 'fresh-one', path: 'skills/core/fresh-one', category: 'core', source_type: 'original', vendor: null, status: 'verified', last_verified: '2026-11-20' },
      { name: 'old-one', path: 'skills/core/old-one', category: 'core', source_type: 'original', vendor: null, status: 'verified', last_verified: '2025-01-01' },
      { name: 'never-checked', path: 'skills/core/never-checked', category: 'core', source_type: 'original', vendor: null, status: 'unverified', last_verified: null },
    ],
  }));
  await writeFile(path.join(root, 'sources', 'verification-status.json'), JSON.stringify({
    statuses: {
      'fresh-one': { status: 'verified', date: '2026-11-20' },
      'old-one': { status: 'verified', date: '2025-01-01' },
      'never-checked': { status: 'unverified' },
    },
  }));
  await writeFile(path.join(root, 'sources', 'imported-skills.md'), '# Imported Skills\n');
  return root;
}

test('runFreshness scores a fixture repo end to end with a fixed reference date', async () => {
  const root = await buildFixture();
  try {
    const lines = [];
    const { exitCode, report } = await runFreshness({
      root,
      referenceDate: '2026-11-22',
      log: (m) => lines.push(m),
      error: (m) => lines.push(m),
    });
    assert.equal(exitCode, 0);
    assert.equal(report.summary.total, 3);
    assert.deepEqual(report.summary.byBand, { FRESH: 1, AGING: 0, STALE: 0, CRITICAL: 1, UNVERIFIED: 1 });
    assert.equal(report.summary.gitAvailable, false); // fixture is not a git repo
    assert.equal(report.commit, null);
    const byName = Object.fromEntries(report.skills.map((s) => [s.name, s]));
    assert.equal(byName['fresh-one'].band, 'FRESH');
    assert.equal(byName['old-one'].band, 'CRITICAL'); // verified 2025-01-01: 690 days old
    assert.equal(byName['never-checked'].band, 'UNVERIFIED');
    // Stability is excluded (no git), not scored as zero:
    assert.equal(byName['fresh-one'].components.stability.available, 0);
    assert.equal(byName['fresh-one'].components.completeness.earned, 10);
    assert.equal(byName['old-one'].components.completeness.earned, 0.7); // 1/15 sections
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runFreshness --fail-on-critical exits 1 when a skill is CRITICAL', async () => {
  const root = await buildFixture();
  try {
    const { exitCode } = await runFreshness({
      root, referenceDate: '2026-11-22', failOnCritical: true,
      log: () => {}, error: () => {},
    });
    assert.equal(exitCode, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runFreshness writes the JSON report to --out', async () => {
  const root = await buildFixture();
  try {
    const out = path.join(root, 'freshness-report.json');
    const { report } = await runFreshness({ root, referenceDate: '2026-11-22', out, log: () => {}, error: () => {} });
    const written = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(written.referenceDate, '2026-11-22');
    assert.equal(written.summary.total, 3);
    assert.equal(written.skills.length, report.skills.length);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runFreshness rejects a bad reference date with exit 2', async () => {
  const root = await buildFixture();
  try {
    const errors = [];
    const { exitCode, report } = await runFreshness({
      root, referenceDate: 'yesterday', log: () => {}, error: (m) => errors.push(m),
    });
    assert.equal(exitCode, 2);
    assert.equal(report, null);
    assert.match(errors.join('\n'), /must be YYYY-MM-DD/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('runFreshness handles an empty registry without crashing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-freshness-test-'));
  try {
    await mkdir(path.join(root, 'registry'), { recursive: true });
    await mkdir(path.join(root, 'sources'), { recursive: true });
    await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify({ skills: [] }));
    await writeFile(path.join(root, 'sources', 'verification-status.json'), JSON.stringify({ statuses: {} }));
    await writeFile(path.join(root, 'sources', 'imported-skills.md'), '# Imported Skills\n');
    const { exitCode, report } = await runFreshness({ root, referenceDate: '2026-11-22', log: () => {}, error: () => {} });
    assert.equal(exitCode, 0);
    assert.equal(report.summary.total, 0);
    assert.deepEqual(report.summary.byBand, { FRESH: 0, AGING: 0, STALE: 0, CRITICAL: 0, UNVERIFIED: 0 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
