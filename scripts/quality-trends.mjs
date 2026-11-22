#!/usr/bin/env node
// quality-trends.mjs — quality snapshots and trend comparison.
//
// Measures the library's quality at a commit, appends the snapshot to
// ai/quality/history/ (one JSON file per snapshot, named by
// date+commit), and compares two snapshots to find regressions and
// improvements.
//
// Every metric reuses an existing measurement source — nothing here
// invents a scoring definition:
//   scores         scripts/score-skills.mjs --json (22-element standard)
//   security       scripts/security-scan.mjs --json
//   links          scripts/check-links.mjs (offline: internal links)
//   validation     scripts/validate-skills.mjs
//   tests          node --test (TAP summary)
//   evals          evals/reports/latest.json (existing artifact; this
//                  script never runs evals)
//   verification   sources/verification-status.json
//   counts         registry/*.json (read, never regenerated)
//   freshness      registry last_verified vs the snapshot commit date
//   accessibility  scorer flags (loose-regex proxy) AND, when present,
//                  sources/accessibility-classification.json with the
//                  Phase 8 subsection rule (authoritative; see
//                  test/accessibility-coverage.test.mjs)
//   disclosure     ai/quality/disclosure-coverage.json when present
//                  (another worker's data file; never computed here)
//   flags          scorer per-skill flags: total flagged, count per
//                  flag type, per-category mean scores
//
// Anything that cannot be measured is recorded as unavailable, never
// estimated. Historical snapshots (e.g. v1.0.0, v1.1.0) are measured
// in a temp worktree with the CURRENT measurement scripts, so the
// definitions are identical across snapshots — the tree differs, the
// ruler does not. ONE exception: the test suite runs with the tree's
// OWN scripts, before staging. Tests assert the behavior of the code
// of their own era; running v1.1.0's tests against the current
// installer (which now refuses needs-correction skills) fails tests
// that passed in their era. Scores and checks, by contrast, are
// standards applied to content, so the current ruler is the right
// one for every tree — a v1.0.0 skill scored with the current scorer
// is the only way to compare it with a v1.1.0 skill.
//
// Usage:
//   node scripts/quality-trends.mjs snapshot [--root <dir>] [--out <file>]
//     [--test-results <tap-file>] [--skip-tests] [--commit <hash>]
//     [--test-timeout <ms>]
//   node scripts/quality-trends.mjs compare <snapshotA> <snapshotB> [--json]
//   node scripts/quality-trends.mjs list [--json]
//
// Snapshot (default --out): ai/quality/history/<YYYY-MM-DD>-<shortsha>.json
// Exit code 0 on success; `compare` exits 1 when any metric regressed.

import { execFileSync } from 'node:child_process';
import { cp, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HISTORY_DIR = path.join(ROOT, 'ai', 'quality', 'history');

// Categories where accessibility content is applicable — the same set
// the scorer uses (scripts/score-skills.mjs A11Y_CATEGORIES). Kept in
// sync by definition: the a11y metric below counts scorer flags, so a
// drift here would only change which skills are in the denominator.
export const A11Y_CATEGORIES = new Set(['frontend', 'media', 'content', 'metadata']);

// ---------------------------------------------------------------------------
// Metric definitions: direction decides what a comparison calls a
// regression. 'neutral' metrics (counts) report change, never
// regression/improvement.
// ---------------------------------------------------------------------------

export const METRIC_DEFS = {
  'counts.totalSkills': { label: 'Total skills', direction: 'neutral', unit: 'skills' },
  'counts.originalSkills': { label: 'Original skills', direction: 'neutral', unit: 'skills' },
  'counts.upstreamSkills': { label: 'Upstream skills', direction: 'neutral', unit: 'skills' },
  'counts.categories': { label: 'Categories', direction: 'neutral', unit: 'categories' },
  'counts.agents': { label: 'Agents', direction: 'neutral', unit: 'agents' },
  'counts.workflows': { label: 'Workflows', direction: 'neutral', unit: 'workflows' },
  'score.meanOverall': { label: 'Mean overall score', direction: 'higher', unit: '/100' },
  'score.accuracy': { label: 'Mean accuracy-proxy score', direction: 'higher', unit: '/100' },
  'score.completeness': { label: 'Mean completeness score', direction: 'higher', unit: '/100' },
  'score.actionability': { label: 'Mean actionability score', direction: 'higher', unit: '/100' },
  'score.security': { label: 'Mean security score', direction: 'higher', unit: '/100' },
  'score.testing': { label: 'Mean testing score', direction: 'higher', unit: '/100' },
  'score.documentation': { label: 'Mean documentation score', direction: 'higher', unit: '/100' },
  'score.versioning': { label: 'Mean versioning score', direction: 'higher', unit: '/100' },
  'score.maintainability': { label: 'Mean maintainability score', direction: 'higher', unit: '/100' },
  'score.critical': { label: 'CRITICAL skills (security pattern hit)', direction: 'lower', unit: 'skills' },
  'score.below70': { label: 'Skills scoring below 70', direction: 'lower', unit: 'skills' },
  'score.scored': { label: 'Skills scored', direction: 'neutral', unit: 'skills' },
  'verification.verifiedPct': { label: 'Skills verified', direction: 'higher', unit: '%' },
  'verification.needsCorrection': { label: 'Skills needing correction', direction: 'lower', unit: 'skills' },
  'verification.withLimitations': { label: 'Skills verified with limitations', direction: 'lower', unit: 'skills' },
  'verification.unverified': { label: 'Unverified skills', direction: 'lower', unit: 'skills' },
  'security.findings': { label: 'Security scan findings', direction: 'lower', unit: 'findings' },
  'security.scannedTextFiles': { label: 'Files security-scanned', direction: 'neutral', unit: 'files' },
  'links.brokenInternal': { label: 'Broken internal links', direction: 'lower', unit: 'links' },
  'links.internalChecked': { label: 'Internal links checked', direction: 'neutral', unit: 'links' },
  'links.externalListed': { label: 'External URLs listed', direction: 'neutral', unit: 'urls' },
  'validation.errors': { label: 'Validation errors', direction: 'lower', unit: 'errors' },
  'validation.warnings': { label: 'Validation warnings', direction: 'lower', unit: 'warnings' },
  'validation.skillsChecked': { label: 'Skills validated', direction: 'neutral', unit: 'skills' },
  'a11y.coveragePct': { label: 'Accessibility coverage (applicable categories)', direction: 'higher', unit: '%' },
  'a11y.docCoveragePct': { label: 'Accessibility documentation coverage (classification + subsection rule)', direction: 'higher', unit: '%' },
  'a11y.applicableSkills': { label: 'Skills accessibility applies to', direction: 'neutral', unit: 'skills' },
  'a11y.withGuidance': { label: 'Applicable skills carrying guidance', direction: 'higher', unit: 'skills' },
  'disclosure.coveragePct': { label: 'Progressive-disclosure coverage (skills with subdirectories)', direction: 'higher', unit: '%' },
  'disclosure.medianBodyLines': { label: 'Median SKILL.md lines (total, frontmatter included)', direction: 'neutral', unit: 'lines' },
  'disclosure.maxBodyLines': { label: 'Max SKILL.md lines (total, frontmatter included)', direction: 'neutral', unit: 'lines' },
  'disclosure.skillsWithSubdirs': { label: 'Skills with references/scripts/assets/examples subdirectories', direction: 'higher', unit: 'skills' },
  'flags.totalFlagged': { label: 'Skills carrying scorer flags', direction: 'lower', unit: 'skills' },
  'flags.flaggedPct': { label: 'Scored skills carrying flags', direction: 'lower', unit: '%' },
  'freshness.verifiedWithin365dPct': { label: 'Skills verified within 365 days', direction: 'higher', unit: '%' },
  'freshness.missingLastVerified': { label: 'Skills without last_verified', direction: 'lower', unit: 'skills' },
  'tests.passed': { label: 'Tests passed', direction: 'higher', unit: 'tests' },
  'tests.failed': { label: 'Tests failed', direction: 'lower', unit: 'tests' },
  'tests.passRate': { label: 'Test pass rate', direction: 'higher', unit: '%' },
  'tests.skipped': { label: 'Tests skipped', direction: 'neutral', unit: 'tests' },
  'evals.passRate': { label: 'Eval pass rate', direction: 'higher', unit: '%' },
  'evals.total': { label: 'Eval cases', direction: 'neutral', unit: 'cases' },
  'evals.failed': { label: 'Eval cases failed', direction: 'lower', unit: 'cases' },
};

// Dynamic metric ids not listed above, with their directions:
//   flags.<type>         one per scorer flag type (e.g. flags.versioning,
//                        flags.accessibility) — lower is better
//   categoryMean.<cat>   mean overall score per category — higher is better
// classifyDelta resolves these by prefix (see below), so comparisons
// cover flag counts and per-category means, not just the headline means.

export function metricDirection(id) {
  if (METRIC_DEFS[id]) return METRIC_DEFS[id].direction;
  if (id.startsWith('flags.')) return 'lower';
  if (id.startsWith('categoryMean.')) return 'higher';
  return 'neutral';
}

/**
 * Parse a `node --test` summary, in either of the two formats the
 * runner produces: TAP (`# pass 342`, from --test-reporter=tap) or
 * the default spec reporter (`ℹ pass 342`). Returns null when
 * neither format yields pass/fail counts.
 */
export function parseTestSummary(text) {
  const get = (key) => {
    const m = text.match(new RegExp(`^(?:#|ℹ) ${key} (\\d+)`, 'm'));
    return m ? Number(m[1]) : null;
  };
  const pass = get('pass');
  const fail = get('fail');
  if (pass === null || fail === null) return null;
  return {
    tests: get('tests'),
    pass,
    fail,
    skipped: get('skipped') ?? 0,
    cancelled: get('cancelled') ?? 0,
  };
}

/** Parse `node scripts/validate-skills.mjs` output. */
export function parseValidateOutput(text) {
  const checked = text.match(/Checked (\d+) skills \((\d+) original, (\d+) upstream\)/);
  const errors = (text.match(/^  ERROR /gm) || []).length;
  const warnings = (text.match(/^  WARN  /gm) || []).length;
  const upstreamWarnings = (text.match(/^  WARN \(upstream\)  /gm) || []).length;
  const failed = /^FAIL:/m.test(text);
  return {
    skillsChecked: checked ? Number(checked[1]) : null,
    original: checked ? Number(checked[2]) : null,
    upstream: checked ? Number(checked[3]) : null,
    errors,
    warnings: warnings + upstreamWarnings,
    upstreamWarnings,
    passed: !failed,
  };
}

/** Parse `node scripts/check-links.mjs` (offline) output. */
export function parseLinksOutput(text) {
  const checked = text.match(/Checked (\d+) internal links; (\d+) unique external URLs/);
  const fail = text.match(/^FAIL: (\d+) error\(s\)\./m);
  return {
    internalChecked: checked ? Number(checked[1]) : null,
    externalListed: checked ? Number(checked[2]) : null,
    errors: fail ? Number(fail[1]) : 0,
    passed: !fail,
  };
}

/**
 * Flag type: the text before the first ':' of a scorer flag,
 * slugified. 'versioning: no version info…' -> 'versioning';
 * 'CRITICAL: security pattern hit…' -> 'critical';
 * 'accuracy-proxy: 2 broken relative link(s)' -> 'accuracy-proxy'.
 */
export function flagType(flag) {
  const head = String(flag).split(':')[0].trim().toLowerCase();
  return head.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';
}

// ---------------------------------------------------------------------------
// Accessibility documentation coverage (Phase 8 rule — the exact rule
// from test/accessibility-coverage.test.mjs, which is the source of
// truth; this copy must stay in sync with it).
// ---------------------------------------------------------------------------

// A whole-skill entry must still show substantive accessibility content.
// Word boundaries keep "variable" / "library" from counting as "aria".
const WHOLE_SKILL_CONTENT_RE = /\baccessib|\bwcag\b|\baria\b|screen reader|keyboard/i;
const MIN_SUBSECTION_LINES = 4; // non-empty lines under the subsection heading

/** Lines under the `### Accessibility` heading, or null when absent. */
export function accessibilitySubsection(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === '### Accessibility');
  if (start < 0) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,3}\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

export function hasA11yGuidance(entry, text) {
  if (entry.guidance === 'whole-skill') {
    return WHOLE_SKILL_CONTENT_RE.test(text);
  }
  const body = accessibilitySubsection(text);
  if (!body) return false;
  return body.filter((l) => l.trim() !== '').length >= MIN_SUBSECTION_LINES;
}

/**
 * Documentation coverage from a classification object (the parsed
 * sources/accessibility-classification.json) and the skill files
 * under `root`: applicable skills carrying guidance / applicable
 * skills. A skill whose SKILL.md cannot be read counts as lacking.
 */
export async function computeA11yDocCoverage(root, classification) {
  const skills = classification.skills || {};
  let applicable = 0;
  let withGuidance = 0;
  const lacking = [];
  for (const [key, entry] of Object.entries(skills)) {
    if (entry.applicability !== 'applicable') continue;
    applicable += 1;
    let text = null;
    try {
      text = await readFile(path.join(root, 'skills', key, 'SKILL.md'), 'utf8');
    } catch { /* unreadable file counts as lacking */ }
    if (text !== null && hasA11yGuidance(entry, text)) withGuidance += 1;
    else lacking.push(key);
  }
  return {
    applicable,
    withGuidance,
    coveragePct: applicable > 0 ? round1((withGuidance / applicable) * 100) : null,
    lacking,
  };
}

// ---------------------------------------------------------------------------
// Progressive-disclosure coverage (another worker's data file)
// ---------------------------------------------------------------------------

/**
 * Normalize ai/quality/disclosure-coverage.json into the snapshot's
 * disclosure input. Accepts the summary object or the top-level
 * fields; returns null when nothing usable is present. Expected
 * shape (see ai/quality/SKILL-QUALITY-TRENDS.md for the contract):
 *   { totalSkills, skillsWithSubdirs, coveragePct?,
 *     medianBodyLines, maxBodyLines }
 * coveragePct is derived from the counts when the file omits it.
 * Also accepts the keys scripts/disclosure-coverage.mjs actually
 * emits (withFolders, medianLines, maxLines) — the first
 * integration run found all four disclosure metrics unavailable
 * because the producer and this normalizer disagreed on names.
 * Note the semantics: the disclosure tool measures TOTAL SKILL.md
 * lines (frontmatter included), so medianBodyLines/maxBodyLines
 * carry total lines, not body-only lines; the metric labels say so.
 */
export function normalizeDisclosure(data) {
  const s = (data && data.summary) || data || {};
  const total = typeof s.totalSkills === 'number' ? s.totalSkills : (typeof s.total === 'number' ? s.total : null);
  const withSubdirs = typeof s.skillsWithSubdirs === 'number' ? s.skillsWithSubdirs
    : (typeof s.withSubdirs === 'number' ? s.withSubdirs
    : (typeof s.withFolders === 'number' ? s.withFolders : null));
  const coveragePct = typeof s.coveragePct === 'number'
    ? s.coveragePct
    : (total !== null && total > 0 && withSubdirs !== null ? round1((withSubdirs / total) * 100) : null);
  const medianBodyLines = typeof s.medianBodyLines === 'number' ? s.medianBodyLines
    : (typeof s.medianLines === 'number' ? s.medianLines : null);
  const maxBodyLines = typeof s.maxBodyLines === 'number' ? s.maxBodyLines
    : (typeof s.maxLines === 'number' ? s.maxLines : null);
  if (total === null && withSubdirs === null && medianBodyLines === null && maxBodyLines === null) return null;
  return { totalSkills: total, skillsWithSubdirs: withSubdirs, coveragePct, medianBodyLines, maxBodyLines };
}

// ---------------------------------------------------------------------------
// Snapshot assembly (pure: deterministic given fixed inputs)
// ---------------------------------------------------------------------------

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Build a snapshot from measured inputs. `inputs` carries one entry
 * per measurement source (each either the parsed result or null when
 * the source was absent/failed — the reason goes in `unavailable`).
 * Deterministic given fixed inputs (pass `generated` explicitly).
 */
export function buildSnapshot({ generated, commit, inputs }) {
  const metrics = {};
  const details = {};
  const unavailable = [...(inputs.unavailable || [])];
  const set = (id, value, source, detail) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      unavailable.push({ id, reason: `no value measured (source: ${source})` });
      return;
    }
    metrics[id] = { value, source, ...(detail ? { detail } : {}) };
  };

  // Counts (registry, read-only).
  if (inputs.counts) {
    const c = inputs.counts;
    set('counts.totalSkills', c.totalSkills, 'registry/skills.json');
    set('counts.originalSkills', c.originalSkills, 'registry/skills.json');
    set('counts.upstreamSkills', c.upstreamSkills, 'registry/skills.json');
    set('counts.categories', c.categories, 'registry/skills.json');
    set('counts.agents', c.agents, 'registry/agents.json');
    set('counts.workflows', c.workflows, 'registry/workflows.json');
  }

  // Scores (the scorer is the single source of truth for all eight
  // dimensions; the a11y and below-70 counts derive from its output).
  if (inputs.scores) {
    const s = inputs.scores.summary;
    set('score.meanOverall', s.meanOverall, 'scripts/score-skills.mjs --json');
    for (const d of Object.keys(s.meanDimensions)) set(`score.${d}`, s.meanDimensions[d], 'scripts/score-skills.mjs --json');
    set('score.critical', s.critical, 'scripts/score-skills.mjs --json');
    set('score.scored', s.scored, 'scripts/score-skills.mjs --json');
    const below70 = (inputs.scores.results || []).filter((r) => r.overall < 70).length;
    set('score.below70', below70, 'scripts/score-skills.mjs --json', { threshold: 70 });
    const applicable = (inputs.scores.results || []).filter((r) => A11Y_CATEGORIES.has(r.category));
    const withA11y = applicable.filter((r) => !(r.flags || []).some((f) => f.startsWith('accessibility:'))).length;
    if (applicable.length > 0) {
      set('a11y.coveragePct', round1((withA11y / applicable.length) * 100), 'scripts/score-skills.mjs --json (accessibility flags)', { applicable: applicable.length, withContent: withA11y });
    }

    // Flag trends (Finding 6): total flagged skills, count per flag
    // type, and per-category mean scores — so the before/after of
    // flag-fix work is measurable. Flag type is the text before the
    // first ':' (e.g. 'versioning', 'accessibility',
    // 'accuracy-proxy', 'CRITICAL' -> 'critical'); the full exact
    // flag strings go in details.flags.histogram.
    const results = inputs.scores.results || [];
    const flagged = results.filter((r) => (r.flags || []).length > 0);
    set('flags.totalFlagged', flagged.length, 'scripts/score-skills.mjs --json (per-skill flags)');
    if (results.length > 0) {
      set('flags.flaggedPct', round1((flagged.length / results.length) * 100), 'scripts/score-skills.mjs --json (per-skill flags)');
    }
    const histogram = {};
    const byType = {};
    for (const r of flagged) {
      for (const f of r.flags) {
        histogram[f] = (histogram[f] || 0) + 1;
        const type = flagType(f);
        byType[type] = (byType[type] || 0) + 1;
      }
    }
    for (const [type, count] of Object.entries(byType).sort()) {
      set(`flags.${type}`, count, 'scripts/score-skills.mjs --json (per-skill flags)');
    }
    const byCategory = {};
    for (const r of results) {
      const c = r.category || 'unknown';
      if (!byCategory[c]) byCategory[c] = { n: 0, sum: 0, flagged: 0 };
      byCategory[c].n += 1;
      byCategory[c].sum += r.overall ?? 0;
      if ((r.flags || []).length > 0) byCategory[c].flagged += 1;
    }
    details.categories = {};
    for (const [cat, v] of Object.entries(byCategory).sort()) {
      const mean = round1(v.sum / v.n);
      set(`categoryMean.${cat}`, mean, 'scripts/score-skills.mjs --json (per-skill overall)');
      details.categories[cat] = { n: v.n, meanOverall: mean, flagged: v.flagged };
    }
    details.flags = { histogram, byType, totalFlagged: flagged.length };
  }

  // Verification split.
  if (inputs.verification) {
    const v = inputs.verification;
    const total = v.verified + v.withLimitations + v.needsCorrection + v.unverified;
    set('verification.verifiedPct', total > 0 ? round1((v.verified / total) * 100) : null, 'sources/verification-status.json', { total, ...v });
    set('verification.needsCorrection', v.needsCorrection, 'sources/verification-status.json');
    set('verification.withLimitations', v.withLimitations, 'sources/verification-status.json');
    set('verification.unverified', v.unverified, 'sources/verification-status.json');
  }

  // Security scan.
  if (inputs.security) {
    set('security.findings', inputs.security.findings, 'scripts/security-scan.mjs --json');
    set('security.scannedTextFiles', inputs.security.scannedTextFiles, 'scripts/security-scan.mjs --json');
  }

  // Links.
  if (inputs.links) {
    set('links.brokenInternal', inputs.links.errors, 'scripts/check-links.mjs (offline)');
    set('links.internalChecked', inputs.links.internalChecked, 'scripts/check-links.mjs (offline)');
    set('links.externalListed', inputs.links.externalListed, 'scripts/check-links.mjs (offline)');
  }

  // Validation.
  if (inputs.validation) {
    set('validation.errors', inputs.validation.errors, 'scripts/validate-skills.mjs');
    set('validation.warnings', inputs.validation.warnings, 'scripts/validate-skills.mjs');
    set('validation.skillsChecked', inputs.validation.skillsChecked, 'scripts/validate-skills.mjs');
  }

  // Freshness (registry last_verified vs the snapshot commit date —
  // the commit date, not today, so historical snapshots compare
  // fairly).
  if (inputs.freshness) {
    set('freshness.verifiedWithin365dPct', inputs.freshness.within365dPct, 'registry/skills.json last_verified vs commit date', { referenceDate: inputs.freshness.referenceDate, dated: inputs.freshness.dated });
    set('freshness.missingLastVerified', inputs.freshness.missing, 'registry/skills.json last_verified');
  }

  // Tests.
  if (inputs.tests) {
    const t = inputs.tests;
    set('tests.passed', t.pass, 'node --test (TAP summary)');
    set('tests.failed', t.fail, 'node --test (TAP summary)');
    const denom = t.pass + t.fail;
    set('tests.passRate', denom > 0 ? round1((t.pass / denom) * 100) : null, 'node --test (TAP summary)');
    set('tests.skipped', t.skipped, 'node --test (TAP summary)');
  }

  // Evals (existing artifact only — never run by this script).
  if (inputs.evals) {
    const e = inputs.evals;
    set('evals.passRate', e.passRate !== null && e.passRate !== undefined ? round1(e.passRate * 100) : null, 'evals/reports/latest.json', { provider: e.provider, generated: e.generated });
    set('evals.total', e.total, 'evals/reports/latest.json');
    set('evals.failed', e.failed, 'evals/reports/latest.json');
  }

  // Dedicated freshness report (ai/quality/freshness-report.json):
  // recorded when present, unavailable when absent — never computed
  // here, so this snapshot does not duplicate another worker's file.
  if (inputs.freshnessReport) {
    metrics['freshness.report'] = { value: true, source: 'ai/quality/freshness-report.json', detail: inputs.freshnessReport };
  }

  // Accessibility documentation coverage (Phase 8 classification +
  // subsection rule). This is the authoritative a11y metric;
  // a11y.coveragePct above is the scorer's loose-regex proxy.
  if (inputs.a11yDoc) {
    const a = inputs.a11yDoc;
    set('a11y.docCoveragePct', a.coveragePct, 'sources/accessibility-classification.json + ### Accessibility subsection rule', { applicable: a.applicable, withGuidance: a.withGuidance });
    set('a11y.applicableSkills', a.applicable, 'sources/accessibility-classification.json');
    set('a11y.withGuidance', a.withGuidance, 'sources/accessibility-classification.json + ### Accessibility subsection rule');
    details.a11y = { applicable: a.applicable, withGuidance: a.withGuidance, lacking: a.lacking || [] };
  }

  // Progressive-disclosure coverage (another worker's data file).
  // Read when present, unavailable when absent — never computed here.
  if (inputs.disclosure) {
    const d = inputs.disclosure;
    set('disclosure.coveragePct', d.coveragePct, 'ai/quality/disclosure-coverage.json');
    set('disclosure.medianBodyLines', d.medianBodyLines, 'ai/quality/disclosure-coverage.json');
    set('disclosure.maxBodyLines', d.maxBodyLines, 'ai/quality/disclosure-coverage.json');
    set('disclosure.skillsWithSubdirs', d.skillsWithSubdirs, 'ai/quality/disclosure-coverage.json');
  }

  return {
    format: 'skillforge-quality-snapshot',
    version: 1,
    generated,
    commit,
    metrics,
    ...(Object.keys(details).length > 0 ? { details } : {}),
    unavailable,
  };
}

export function snapshotFilename(snapshot) {
  const date = (snapshot.commit.date || snapshot.generated).slice(0, 10);
  return `${date}-${snapshot.commit.short}.json`;
}

// ---------------------------------------------------------------------------
// Comparison (pure)
// ---------------------------------------------------------------------------

export function classifyDelta(id, oldValue, newValue) {
  if (oldValue === newValue) return 'unchanged';
  if (typeof oldValue !== 'number' || typeof newValue !== 'number') return 'changed';
  const direction = metricDirection(id);
  if (direction === 'neutral') return 'changed';
  const better = direction === 'higher' ? newValue > oldValue : newValue < oldValue;
  return better ? 'improved' : 'regressed';
}

/**
 * Compare two snapshots (a = older, b = newer). Metrics measured in
 * only one snapshot are reported, never estimated from the other.
 */
export function compareSnapshots(a, b) {
  const ids = [...new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)])].sort();
  const comparisons = [];
  const summary = { improved: 0, regressed: 0, unchanged: 0, changed: 0, onlyInOlder: 0, onlyInNewer: 0 };
  // Flag counts are zero-filled, not one-sided: a flag type with no
  // occurrences is simply not recorded, so a type fixed to zero must
  // compare as an improvement (1 -> 0), not as "only in older".
  // The zero-fill applies ONLY when both snapshots have scorer data;
  // when one side has no scores at all, its flag counts are genuinely
  // unmeasured and stay one-sided.
  const aHasScores = 'score.meanOverall' in a.metrics;
  const bHasScores = 'score.meanOverall' in b.metrics;
  const zeroFill = (id) => id.startsWith('flags.') && aHasScores && bHasScores;
  for (const id of ids) {
    const oldM = a.metrics[id];
    const newM = b.metrics[id];
    if (!oldM && !zeroFill(id)) { comparisons.push({ id, verdict: 'only-in-newer', oldValue: null, newValue: newM.value }); summary.onlyInNewer += 1; continue; }
    if (!newM && !zeroFill(id)) { comparisons.push({ id, verdict: 'only-in-older', oldValue: oldM.value, newValue: null }); summary.onlyInOlder += 1; continue; }
    const oldValue = oldM ? oldM.value : 0;
    const newValue = newM ? newM.value : 0;
    const verdict = classifyDelta(id, oldValue, newValue);
    summary[verdict] += 1;
    comparisons.push({
      id,
      verdict,
      oldValue,
      newValue,
      delta: typeof oldValue === 'number' && typeof newValue === 'number' ? round1(newValue - oldValue) : null,
    });
  }
  return {
    older: { commit: a.commit.short, date: (a.commit.date || '').slice(0, 10) },
    newer: { commit: b.commit.short, date: (b.commit.date || '').slice(0, 10) },
    summary,
    comparisons,
  };
}

// ---------------------------------------------------------------------------
// Measurement (runs subprocesses; each source fails independently)
// ---------------------------------------------------------------------------

function run(cmd, args, { cwd, timeoutMs }) {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
    return { ok: true, stdout: out, status: 0 };
  } catch (e) {
    return { ok: false, stdout: e.stdout || '', stderr: e.stderr || '', status: e.status, timedOut: e.code === 'ETIMEDOUT' || /timed out/i.test(e.message || '') };
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Stage the CURRENT measurement scripts into a foreign root (a temp
 * worktree of an older commit) so historical snapshots use identical
 * scoring definitions. No-op when root is this repo. The worktree is
 * disposable, so overwriting its scripts/ is safe.
 */
export async function stageScripts(targetRoot) {
  if (path.resolve(targetRoot) === ROOT) return false;
  // Only stage into something that looks like a checkout of this repo
  // (a worktree has a .git FILE; a clone has a .git directory). A
  // synthetic directory without git history gets no scripts, so its
  // measurements correctly report the sources as absent.
  if (!existsSync(path.join(targetRoot, '.git'))) return false;
  await new Promise((resolve, reject) => {
    cp(path.join(ROOT, 'scripts'), path.join(targetRoot, 'scripts'), { recursive: true, force: true }, (e) => (e ? reject(e) : resolve()));
  });
  return true;
}

function gitInfo(root, commitOverride) {
  const hash = commitOverride || run('git', ['rev-parse', 'HEAD'], { cwd: root, timeoutMs: 30000 }).stdout.trim() || 'unknown';
  const dateOut = run('git', ['log', '-1', '--format=%cI', hash], { cwd: root, timeoutMs: 30000 });
  const branchOut = run('git', ['branch', '--show-current'], { cwd: root, timeoutMs: 30000 });
  return {
    hash,
    short: hash === 'unknown' ? 'unknown' : hash.slice(0, 7),
    date: dateOut.ok ? dateOut.stdout.trim() : null,
    branch: branchOut.ok && branchOut.stdout.trim() ? branchOut.stdout.trim() : 'detached',
  };
}

export async function measureRoot(root, opts = {}) {
  const testTimeoutMs = opts.testTimeoutMs ?? 900000;
  const inputs = { unavailable: [] };
  const unavailable = (id, reason) => inputs.unavailable.push({ id, reason });

  const commit = gitInfo(root, opts.commit);
  inputs.commit = commit;

  // Tests run FIRST, with the tree's own scripts — before staging
  // (see the header comment: tests are era-coupled, checks are not).
  // A pre-run results file (--test-results) is used as-is.
  if (opts.testResultsFile) {
    try {
      const tap = await readFile(opts.testResultsFile, 'utf8');
      const parsed = parseTestSummary(tap);
      if (parsed) inputs.tests = parsed;
      else unavailable('tests.*', `test-results file ${opts.testResultsFile} has no parseable summary`);
    } catch (e) {
      unavailable('tests.*', `cannot read test-results file ${opts.testResultsFile}: ${e.message}`);
    }
  } else if (!opts.skipTests) {
    if (existsSync(path.join(root, 'test'))) {
      // --test-reporter=tap: the default spec reporter also parses,
      // but TAP is the stable machine-readable format.
      const r = run(process.execPath, ['--test', '--test-reporter=tap'], { cwd: root, timeoutMs: testTimeoutMs });
      const parsed = parseTestSummary(r.stdout);
      if (parsed) inputs.tests = parsed;
      else unavailable('tests.*', r.timedOut ? `node --test timed out after ${testTimeoutMs}ms` : `node --test produced no parseable summary (exit ${r.status})`);
    } else {
      unavailable('tests.*', 'no test/ directory at this commit');
    }
  } else {
    unavailable('tests.*', 'skipped (--skip-tests)');
  }

  // Stage current scripts for a foreign root (identical definitions
  // for the scorer and the check scripts — after the test run above).
  if (path.resolve(root) !== ROOT) await stageScripts(root);

  // Counts + freshness from the registry (read-only).
  const skillsReg = await readJson(path.join(root, 'registry', 'skills.json'));
  if (skillsReg && Array.isArray(skillsReg.skills)) {
    const skills = skillsReg.skills;
    const agentsReg = await readJson(path.join(root, 'registry', 'agents.json'));
    const workflowsReg = await readJson(path.join(root, 'registry', 'workflows.json'));
    inputs.counts = {
      totalSkills: skillsReg.total_skills ?? skills.length,
      originalSkills: skills.filter((s) => s.source_type === 'original').length,
      upstreamSkills: skills.filter((s) => s.source_type === 'upstream').length,
      categories: Array.isArray(skillsReg.categories) ? skillsReg.categories.length : null,
      agents: agentsReg ? (agentsReg.total_agents ?? agentsReg.agents?.length ?? null) : null,
      workflows: workflowsReg ? (workflowsReg.total_workflows ?? workflowsReg.workflows?.length ?? null) : null,
    };
    // Freshness vs the COMMIT date, not today.
    const ref = commit.date ? Date.parse(commit.date) : Date.now();
    const dated = skills.filter((s) => s.last_verified && /^\d{4}-\d{2}-\d{2}$/.test(s.last_verified));
    const within = dated.filter((s) => (ref - Date.parse(s.last_verified + 'T00:00:00Z')) / 86400000 <= 365).length;
    inputs.freshness = {
      within365dPct: dated.length > 0 ? round1((within / dated.length) * 100) : null,
      missing: skills.length - dated.length,
      dated: dated.length,
      referenceDate: commit.date ? commit.date.slice(0, 10) : null,
    };
  } else {
    unavailable('counts.*', 'registry/skills.json missing or unreadable');
    unavailable('freshness.*', 'registry/skills.json missing or unreadable');
  }

  // Verification split.
  const ver = await readJson(path.join(root, 'sources', 'verification-status.json'));
  if (ver && ver.statuses) {
    const counts = { verified: 0, withLimitations: 0, needsCorrection: 0, unverified: 0 };
    for (const s of Object.values(ver.statuses)) {
      if (s.status === 'verified') counts.verified += 1;
      else if (s.status === 'verified-with-limitations') counts.withLimitations += 1;
      else if (s.status === 'needs-correction') counts.needsCorrection += 1;
      else counts.unverified += 1;
    }
    inputs.verification = counts;
  } else {
    unavailable('verification.*', 'sources/verification-status.json not present at this commit');
  }

  // Scorer.
  if (existsSync(path.join(root, 'scripts', 'score-skills.mjs'))) {
    const r = run(process.execPath, [path.join(root, 'scripts', 'score-skills.mjs'), '--json'], { cwd: root, timeoutMs: 180000 });
    try {
      const parsed = JSON.parse(r.stdout);
      if (parsed && parsed.summary) inputs.scores = parsed;
      else unavailable('score.*', `scorer output unparseable (exit ${r.status})`);
    } catch {
      unavailable('score.*', `scorer failed or produced no JSON (exit ${r.status}${r.timedOut ? ', timed out' : ''})`);
    }
  } else {
    unavailable('score.*', 'scripts/score-skills.mjs not present at this commit');
  }

  // Security scan.
  if (existsSync(path.join(root, 'scripts', 'security-scan.mjs'))) {
    const r = run(process.execPath, [path.join(root, 'scripts', 'security-scan.mjs'), '--json'], { cwd: root, timeoutMs: 240000 });
    try {
      const parsed = JSON.parse(r.stdout);
      inputs.security = {
        findings: Array.isArray(parsed.findings) ? parsed.findings.length : null,
        scannedTextFiles: parsed.scanned?.textFiles ?? null,
      };
    } catch {
      unavailable('security.*', `security scan failed or produced no JSON (exit ${r.status}${r.timedOut ? ', timed out' : ''})`);
    }
  } else {
    unavailable('security.*', 'scripts/security-scan.mjs not present at this commit');
  }

  // Links (offline: internal links only; --online would hit the
  // network and is out of scope for a snapshot).
  if (existsSync(path.join(root, 'scripts', 'check-links.mjs'))) {
    const r = run(process.execPath, [path.join(root, 'scripts', 'check-links.mjs')], { cwd: root, timeoutMs: 300000 });
    const parsed = parseLinksOutput(r.stdout);
    if (parsed.internalChecked !== null) inputs.links = parsed;
    else unavailable('links.*', `link check produced no parseable summary (exit ${r.status}${r.timedOut ? ', timed out' : ''})`);
  } else {
    unavailable('links.*', 'scripts/check-links.mjs not present at this commit');
  }

  // Validation (normal mode, not --strict: --strict fails on
  // warnings, which would conflate warnings with errors).
  if (existsSync(path.join(root, 'scripts', 'validate-skills.mjs'))) {
    const r = run(process.execPath, [path.join(root, 'scripts', 'validate-skills.mjs')], { cwd: root, timeoutMs: 180000 });
    const parsed = parseValidateOutput(r.stdout);
    if (parsed.skillsChecked !== null) inputs.validation = { ...parsed, exitCode: r.status };
    else unavailable('validation.*', `validation produced no parseable summary (exit ${r.status}${r.timedOut ? ', timed out' : ''})`);
  } else {
    unavailable('validation.*', 'scripts/validate-skills.mjs not present at this commit');
  }

  // Evals: existing artifact only. Never run here.
  const evalReport = await readJson(path.join(root, 'evals', 'reports', 'latest.json'));
  if (evalReport && evalReport.summary) {
    inputs.evals = {
      total: evalReport.summary.total,
      failed: evalReport.summary.failed,
      passRate: evalReport.summary.passRate,
      provider: evalReport.provider ?? evalReport.providerKind ?? null,
      generated: evalReport.generated ?? null,
    };
  } else {
    unavailable('evals.*', 'evals/reports/latest.json not present at this commit (evals are never run by this script)');
  }

  // Dedicated freshness report (another worker's file): read if
  // present, unavailable if absent. Never created here.
  const freshnessReport = await readJson(path.join(root, 'ai', 'quality', 'freshness-report.json'));
  if (freshnessReport) {
    inputs.freshnessReport = freshnessReport.summary ?? { present: true };
  } else {
    unavailable('freshness.report', 'ai/quality/freshness-report.json does not exist yet');
  }

  // Accessibility documentation coverage (Phase 8 classification):
  // read the classification when present and compute coverage from
  // the skill files with the Phase 8 subsection rule. Absent at
  // commits predating the classification file (it is not in git
  // history before the hardening mission) — recorded unavailable.
  const a11yClass = await readJson(path.join(root, 'sources', 'accessibility-classification.json'));
  if (a11yClass && a11yClass.skills) {
    inputs.a11yDoc = await computeA11yDocCoverage(root, a11yClass);
  } else {
    unavailable('a11y.docCoverage*', 'sources/accessibility-classification.json not present at this commit');
  }

  // Progressive-disclosure coverage (another worker's data file):
  // read when present, unavailable when absent. Never computed here.
  const disclosure = await readJson(path.join(root, 'ai', 'quality', 'disclosure-coverage.json'));
  if (disclosure) {
    const normalized = normalizeDisclosure(disclosure);
    if (normalized) inputs.disclosure = normalized;
    else unavailable('disclosure.*', 'ai/quality/disclosure-coverage.json present but has no usable fields');
  } else {
    unavailable('disclosure.*', 'ai/quality/disclosure-coverage.json does not exist yet');
  }

  return inputs;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function humanComparison(result) {
  const lines = [
    `Comparison: ${result.older.commit} (${result.older.date}) -> ${result.newer.commit} (${result.newer.date})`,
    `Improved: ${result.summary.improved}, regressed: ${result.summary.regressed}, unchanged: ${result.summary.unchanged}, changed (neutral): ${result.summary.changed}, only in older: ${result.summary.onlyInOlder}, only in newer: ${result.summary.onlyInNewer}.`,
    '',
  ];
  for (const c of result.comparisons) {
    const def = METRIC_DEFS[c.id];
    const label = def ? def.label : c.id;
    const unit = def ? def.unit : '';
    if (c.verdict === 'only-in-older') lines.push(`  ?  ${label}: ${c.oldValue}${unit} (not measured in newer snapshot)`);
    else if (c.verdict === 'only-in-newer') lines.push(`  ?  ${label}: not measured in older snapshot -> ${c.newValue}${unit}`);
    else if (c.verdict === 'unchanged') lines.push(`  =  ${label}: ${c.oldValue}${unit}`);
    else {
      const mark = c.verdict === 'improved' ? '↑' : c.verdict === 'regressed' ? '↓' : '~';
      const delta = c.delta !== null ? ` (${c.delta > 0 ? '+' : ''}${c.delta}${unit})` : '';
      lines.push(`  ${mark}  ${label}: ${c.oldValue} -> ${c.newValue}${unit}${delta} [${c.verdict}]`);
    }
  }
  return lines.join('\n');
}

function usage() {
  return [
    'Usage:',
    '  node scripts/quality-trends.mjs snapshot [--root <dir>] [--out <file>]',
    '    [--test-results <tap-file>] [--skip-tests] [--commit <hash>] [--test-timeout <ms>]',
    '  node scripts/quality-trends.mjs compare <snapshotA> <snapshotB> [--json]',
    '  node scripts/quality-trends.mjs list [--json]',
  ].join('\n');
}

// Only run as a script: tests import the helpers above.
// (path.resolve comparison, as in check-links.mjs — the
// `file://${argv[1]}` form never matches on Windows, where argv[1]
// has backslashes and the URL has forward slashes, so the CLI
// silently did nothing there. Found by the Windows CI leg.)
const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const args = process.argv.slice(2);
  const command = args[0];
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const jsonOut = args.includes('--json');

  if (command === 'snapshot') {
    const root = path.resolve(flag('--root') || ROOT);
    const inputs = await measureRoot(root, {
      commit: flag('--commit'),
      testResultsFile: flag('--test-results'),
      skipTests: args.includes('--skip-tests'),
      testTimeoutMs: flag('--test-timeout') ? Number(flag('--test-timeout')) : undefined,
    });
    const snapshot = buildSnapshot({ generated: new Date().toISOString(), commit: inputs.commit, inputs });
    const outFile = flag('--out') || path.join(HISTORY_DIR, snapshotFilename(snapshot));
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
    console.log(`Snapshot written: ${outFile}`);
    console.log(`Commit ${snapshot.commit.short} (${snapshot.commit.date ? snapshot.commit.date.slice(0, 10) : 'unknown date'}), ${Object.keys(snapshot.metrics).length} metrics measured, ${snapshot.unavailable.length} unavailable.`);
    for (const u of snapshot.unavailable) console.log(`  unavailable: ${u.id} — ${u.reason}`);
  } else if (command === 'compare') {
    const [fileA, fileB] = args.slice(1).filter((a) => !a.startsWith('--'));
    if (!fileA || !fileB) { console.error(usage()); process.exitCode = 1; }
    else {
      const a = JSON.parse(await readFile(fileA, 'utf8'));
      const b = JSON.parse(await readFile(fileB, 'utf8'));
      const result = compareSnapshots(a, b);
      if (jsonOut) console.log(JSON.stringify(result, null, 2));
      else console.log(humanComparison(result));
      // Exit 1 when any metric regressed, so CI/scheduled runs can
      // gate on it. Unavailable-in-one-side is not a regression.
      process.exitCode = result.summary.regressed > 0 ? 1 : 0;
    }
  } else if (command === 'list') {
    const files = existsSync(HISTORY_DIR) ? (await readdir(HISTORY_DIR)).filter((f) => f.endsWith('.json')).sort() : [];
    if (jsonOut) {
      console.log(JSON.stringify(files, null, 2));
    } else if (files.length === 0) {
      console.log('No snapshots yet. Run: node scripts/quality-trends.mjs snapshot');
    } else {
      for (const f of files) {
        const s = JSON.parse(await readFile(path.join(HISTORY_DIR, f), 'utf8'));
        const mean = s.metrics['score.meanOverall']?.value ?? '?';
        console.log(`${f}  commit ${s.commit.short} (${(s.commit.date || '').slice(0, 10)})  mean score ${mean}  ${Object.keys(s.metrics).length} metrics`);
      }
    }
  } else {
    console.error(usage());
    process.exitCode = 1;
  }
}
