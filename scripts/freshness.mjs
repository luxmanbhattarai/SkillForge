#!/usr/bin/env node
// freshness.mjs — automated skill freshness scoring (Phase 7).
//
// Scores every skill in registry/skills.json on measurable signals
// and bands it FRESH / AGING / STALE / CRITICAL / UNVERIFIED. The
// algorithm, every weight, and every threshold is documented and
// justified in ai/quality/SKILL-FRESHNESS.md — read that before
// changing a number here.
//
// Signals (all read from real repo data; nothing is invented):
//   - last_verified + verification status (sources/verification-status.json)
//   - last content change of the skill directory (git log, author
//     date, merges and mechanical revert/re-apply commits skipped)
//   - broken internal links in SKILL.md (original skills only;
//     upstream skills are exempt, same policy as check-links.mjs)
//   - required-section completeness (original skills only)
//   - external-link health, ONLY when a links report is supplied
//     via --links-report (no network is ever used by this script)
//   - upstream import date + pinned commit (sources/imported-skills.md,
//     informational only — live drift is check-upstream.mjs's job)
//
// STALE and UNVERIFIED are different bands on purpose: a skill
// verified long ago is stale; a skill never formally audited is
// unverified. Nothing here marks a skill valid merely because
// nothing changed — the recency component decays with age even
// when the content is untouched.
//
// Usage:
//   node scripts/freshness.mjs [--reference-date YYYY-MM-DD]
//     [--warn-days N] [--critical-days N] [--config <path>]
//     [--links-report <path>] [--out <path>] [--json]
//     [--fail-on-critical] [--fail-on-stale] [--root <dir>]
//   npm run freshness
//
// Threshold precedence: CLI flags > --config file > defaults
// (warn 180 days, critical 365 days). See SKILL-FRESHNESS.md.
// Exit code 0 unless --fail-on-critical (any CRITICAL skill) or
// --fail-on-stale (any STALE or CRITICAL skill) trips, or the run
// itself fails (exit 2: unreadable inputs, bad dates, bad config).

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { splitFrontmatter } from './lib/frontmatter.mjs';
import { findSkillFiles, REQUIRED_SECTIONS } from './lib/skill-files.mjs';
import { toPosixPath } from './lib/paths.mjs';
import { extractLinks } from './check-links.mjs';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Defaults. warnDays 180 matches the repo's existing stale
// definition (`query stale --days 180`, scheduled-maintenance.yml);
// criticalDays 365 is one full year without re-verification.
// Justification: ai/quality/SKILL-FRESHNESS.md § Thresholds.
export const DEFAULT_WARN_DAYS = 180;
export const DEFAULT_CRITICAL_DAYS = 365;

// Component weights (sum 100). A component that does not apply to a
// skill (upstream exemptions, missing optional inputs) is excluded
// and the score is renormalized over the available weight, so an
// exempt skill is never penalised for a signal it cannot have —
// and never credited for one either.
export const WEIGHTS = {
  recency: 35,
  status: 25,
  stability: 15,
  internalLinks: 10,
  completeness: 10,
  externalLinks: 5,
};

// Band cutoffs on the renormalized 0–100 score. Hard rules (see
// scoreSkill) can only push a band DOWN from the score band, never up.
export const FRESH_MIN_SCORE = 80;
export const AGING_MIN_SCORE = 60;

export const BANDS = ['FRESH', 'AGING', 'STALE', 'CRITICAL', 'UNVERIFIED'];
// Precedence: UNVERIFIED > CRITICAL > STALE > AGING > FRESH.
const BAND_RANK = { FRESH: 0, AGING: 1, STALE: 2, CRITICAL: 3, UNVERIFIED: 4 };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Strict YYYY-MM-DD parse: rejects malformed dates and impossible
// calendar dates (2026-02-30). Returns a UTC midnight timestamp or null.
export function parseDate(value) {
  if (typeof value !== 'string') return null;
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return t;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

// Whole days from `from` to `to` (UTC midnight to UTC midnight).
export function dayDiff(fromTimestamp, toTimestamp) {
  return Math.round((toTimestamp - fromTimestamp) / 86400000);
}

// Status points (of WEIGHTS.status = 25). A skill with known errors
// (needs-correction) earns nothing here AND is capped at STALE by
// the band rules — a recently verified skill with known errors is
// not fresh. verified-with-limitations earns partial credit: its
// limitations are documented, so the verification is usable with
// caveats, not worthless.
const STATUS_POINTS = {
  verified: 25,
  'verified-with-limitations': 15,
  'needs-correction': 0,
  unverified: 0,
};

// Score one skill. Pure function — every input is a value, so tests
// inject a fixed reference date and deterministic fixtures instead
// of the live repo clock.
//
// input: {
//   name, category, sourceType ('original' | 'upstream'),
//   status,                       // verification status string | null
//   lastVerified,                 // 'YYYY-MM-DD' | null
//   lastChange,                   // 'YYYY-MM-DD' | null (null = unknown: git
//                                 // unavailable or no history for the path)
//   brokenInternalLinks,          // number (original skills; null = not checked)
//   sectionsPresent, sectionsTotal, // number (original skills; null = n/a)
//   externalLinks,                // { total, broken } | null (null = no report)
//   upstreamImported, upstreamPin // upstream skills only, informational
// }
// opts: { referenceDate (UTC ms), warnDays, criticalDays }
//
// Returns { score, band, ageDays, components, reasons, warnings }.
// components maps each signal to { earned, available, detail }.
export function scoreSkill(input, { referenceDate, warnDays, criticalDays }) {
  const reasons = [];
  const warnings = [];
  const components = {};
  const isUpstream = input.sourceType === 'upstream';

  // --- Recency (35): linear decay from full points at age 0 to 0
  // at the critical threshold. A missing or malformed date earns 0
  // and forces UNVERIFIED — absence of a date is never freshness.
  const verifiedTs = parseDate(input.lastVerified);
  let ageDays = null;
  if (verifiedTs === null) {
    components.recency = { earned: 0, available: WEIGHTS.recency, detail: 'no parseable last_verified date' };
    reasons.push('no parseable last_verified date');
  } else {
    ageDays = dayDiff(verifiedTs, referenceDate);
    if (ageDays < 0) {
      // A future verification date is bad data, not freshness: age
      // is clamped to 0 for scoring, a warning is recorded, and the
      // band is capped at AGING below (the record cannot be trusted).
      warnings.push(`last_verified ${input.lastVerified} is in the future (reference ${formatDate(referenceDate)})`);
      ageDays = 0;
    }
    const earned = Math.round(WEIGHTS.recency * Math.max(0, 1 - ageDays / criticalDays) * 10) / 10;
    components.recency = { earned, available: WEIGHTS.recency, detail: `verified ${ageDays} day(s) ago` };
    if (ageDays > criticalDays) reasons.push(`verified ${ageDays} days ago, past the ${criticalDays}-day critical threshold`);
    else if (ageDays > warnDays) reasons.push(`verified ${ageDays} days ago, past the ${warnDays}-day warning threshold`);
  }

  // --- Status (25).
  const statusPoints = STATUS_POINTS[input.status] ?? 0;
  components.status = {
    earned: statusPoints,
    available: WEIGHTS.status,
    detail: `status: ${input.status ?? 'unknown'}`,
  };
  if (input.status === 'needs-correction') reasons.push('status needs-correction: known errors, capped at STALE');
  if (input.status === 'verified-with-limitations') reasons.push('status verified-with-limitations: documented caveats apply');
  if (input.status === 'unverified' || input.status == null) reasons.push('never formally audited');

  // --- Stability (15): full points when the skill directory has not
  // changed since verification; 0 when it changed after verification
  // (the verification no longer covers the current content). Unknown
  // (no git, no history) excludes the component — it neither rewards
  // nor punishes, and the report says so.
  if (input.lastChange == null) {
    components.stability = { earned: null, available: 0, detail: 'unknown: no git history for this skill' };
  } else if (verifiedTs === null) {
    // Without a verification date there is nothing to compare
    // against; the recency/status zeros already carry the signal.
    components.stability = { earned: null, available: 0, detail: 'not comparable: no verification date' };
  } else {
    const changeTs = parseDate(input.lastChange);
    if (changeTs === null) {
      components.stability = { earned: null, available: 0, detail: 'unknown: unparseable last-change date' };
    } else if (changeTs > verifiedTs) {
      components.stability = { earned: 0, available: WEIGHTS.stability, detail: `content changed ${input.lastChange}, after verification ${input.lastVerified}` };
      reasons.push(`content changed ${input.lastChange}, after verification on ${input.lastVerified}`);
    } else {
      components.stability = { earned: WEIGHTS.stability, available: WEIGHTS.stability, detail: `no content change since verification (last change ${input.lastChange})` };
    }
  }

  // --- Internal links (10): 2 points off per broken relative link,
  // floor 0. Upstream skills are exempt: their relative links
  // legitimately point outside the imported subset (same policy as
  // check-links.mjs).
  if (isUpstream) {
    components.internalLinks = { earned: null, available: 0, detail: 'not applicable: upstream skills are exempt' };
  } else if (typeof input.brokenInternalLinks !== 'number') {
    components.internalLinks = { earned: null, available: 0, detail: 'not checked' };
  } else {
    const earned = Math.max(0, WEIGHTS.internalLinks - 2 * input.brokenInternalLinks);
    components.internalLinks = { earned, available: WEIGHTS.internalLinks, detail: `${input.brokenInternalLinks} broken internal link(s)` };
    if (input.brokenInternalLinks > 0) reasons.push(`${input.brokenInternalLinks} broken internal link(s) in SKILL.md`);
  }

  // --- Completeness (10): share of the 15 required sections
  // present. Upstream skills are exempt from the section standard.
  if (isUpstream) {
    components.completeness = { earned: null, available: 0, detail: 'not applicable: upstream skills are exempt' };
  } else if (typeof input.sectionsPresent !== 'number' || !input.sectionsTotal) {
    components.completeness = { earned: null, available: 0, detail: 'not checked' };
  } else {
    const earned = Math.round((WEIGHTS.completeness * input.sectionsPresent / input.sectionsTotal) * 10) / 10;
    components.completeness = { earned, available: WEIGHTS.completeness, detail: `${input.sectionsPresent}/${input.sectionsTotal} required sections present` };
    if (input.sectionsPresent < input.sectionsTotal) reasons.push(`only ${input.sectionsPresent}/${input.sectionsTotal} required sections present`);
  }

  // --- External links (5): only when a links report was supplied.
  // Absent input excludes the component — an unchecked link is
  // neither broken nor healthy, so it must not move the score.
  if (!input.externalLinks || typeof input.externalLinks.total !== 'number' || input.externalLinks.total === 0) {
    components.externalLinks = { earned: null, available: 0, detail: 'not checked: no links report supplied (or skill has no external links)' };
  } else {
    const { total, broken } = input.externalLinks;
    const earned = Math.round((WEIGHTS.externalLinks * (1 - broken / total)) * 10) / 10;
    components.externalLinks = { earned, available: WEIGHTS.externalLinks, detail: `${broken}/${total} external link(s) broken` };
    if (broken > 0) reasons.push(`${broken}/${total} external link(s) broken`);
  }

  // Renormalized score over the available weight only.
  let earnedTotal = 0;
  let availableTotal = 0;
  for (const c of Object.values(components)) {
    if (c.earned !== null) { earnedTotal += c.earned; availableTotal += c.available; }
  }
  const score = availableTotal > 0 ? Math.round((100 * earnedTotal / availableTotal) * 10) / 10 : 0;

  // --- Bands. Hard rules only ever push the band down.
  let band;
  if (score >= FRESH_MIN_SCORE) band = 'FRESH';
  else if (score >= AGING_MIN_SCORE) band = 'AGING';
  else band = 'STALE';

  const futureDate = warnings.some((w) => w.startsWith('last_verified'));
  const caps = [];
  if (futureDate) caps.push('AGING'); // bad date: cannot be trusted as fresh
  if (ageDays !== null && ageDays > warnDays) caps.push('AGING');
  if (input.status === 'needs-correction') caps.push('STALE');
  if (ageDays !== null && ageDays > criticalDays) caps.push('CRITICAL');
  if (input.status === 'unverified' || input.status == null || verifiedTs === null) caps.push('UNVERIFIED');
  for (const cap of caps) {
    if (BAND_RANK[cap] > BAND_RANK[band]) band = cap;
  }

  return { score, band, ageDays, components, reasons, warnings };
}

// Parse sources/imported-skills.md into skill -> { imported, pin }.
// Each vendor section carries a `Commit <40-hex> · Imported
// YYYY-MM-DD` line followed by the skill-list paragraph: backticked
// names, one paragraph. Only the first backticked paragraph after
// the Commit line is read — later paragraphs name unimported
// siblings and tool files, which are NOT imported skills. Exported
// for testing.
export function parseImportDates(text) {
  const out = new Map();
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith('### ')) { i++; continue; }
    // Inside one vendor section: find the Commit line.
    let imported = null;
    let pin = null;
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('### ')) {
      const commit = lines[j].match(/^Commit\s+`([0-9a-f]{40})`\s+·\s+Imported\s+(\d{4}-\d{2}-\d{2})/);
      if (commit) {
        pin = commit[1];
        imported = commit[2];
        j++;
        break;
      }
      j++;
    }
    // The skill-list paragraph is the first paragraph after the
    // Commit line that contains backticked skill names. Paragraphs
    // before it (e.g. a `Live upstream:` line) carry no backticked
    // tokens and are skipped; paragraphs after it (unimported
    // siblings, tool files) are never read — they name skills that
    // were NOT imported.
    const skillToken = /`([a-z0-9][a-z0-9-]*)`/g;
    while (j < lines.length && !lines[j].startsWith('### ')) {
      // Skip blank lines to the next paragraph.
      while (j < lines.length && lines[j].trim() === '') j++;
      const paraStart = j;
      while (j < lines.length && lines[j].trim() !== '' && !lines[j].startsWith('### ')) j++;
      const paragraph = lines.slice(paraStart, j).join('\n');
      const tokens = [...paragraph.matchAll(skillToken)];
      if (tokens.length > 0) {
        for (const m of tokens) {
          if (imported) out.set(m[1], { imported, pin });
        }
        break;
      }
    }
    i = j;
  }
  return out;
}

// Last content-change date (YYYY-MM-DD, author date) per skill
// directory, from a single `git log` over skills/. Merges are
// excluded (--no-merges: a merge commit's date is when the branch
// landed, not when content changed), and commits whose subject is
// a revert or a re-apply of a revert are skipped: they are
// mechanical tree operations (delete/re-add), not content edits —
// without this, the 2026-11-21 revert pair would mark 205 skills
// "changed after verification" for a change that changed nothing.
// `skillPaths` is the set of registry skill paths (POSIX, relative
// to root); git paths are matched to the longest skill-path prefix,
// so vendor-level files (ATTRIBUTION.md) never create phantom
// skills. Returns Map<skillPath, date> or null when git is
// unavailable (signal unknown, not zero).
export async function collectLastChanges(root, skillPaths, { execFn = execFileAsync } = {}) {
  let stdout;
  try {
    ({ stdout } = await execFn(
      'git',
      ['log', '--no-merges', '--format=__C__ %aI %s', '--name-only', '--', 'skills'],
      { cwd: root, maxBuffer: 64 * 1024 * 1024 },
    ));
  } catch {
    return null;
  }
  const changes = new Map();
  const sorted = [...skillPaths].sort((a, b) => b.length - a.length); // longest prefix first
  let currentDate = null;
  let skipCommit = false;
  for (const line of stdout.split('\n')) {
    const header = line.match(/^__C__ (\d{4}-\d{2}-\d{2})T\S+ (.*)$/);
    if (header) {
      currentDate = header[1];
      skipCommit = /^Re(vert|apply) "/.test(header[2]);
      continue;
    }
    if (!line.trim() || !currentDate || skipCommit) continue;
    const skillPath = sorted.find((p) => line === p || line.startsWith(`${p}/`));
    if (skillPath && !changes.has(skillPath)) changes.set(skillPath, currentDate);
  }
  return changes;
}

// Current HEAD short hash + full hash, best effort (null when git
// is unavailable). The report records the commit it was generated at.
export async function currentCommit(root, { execFn = execFileAsync } = {}) {
  try {
    const { stdout } = await execFn('git', ['rev-parse', 'HEAD'], { cwd: root });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// Count broken relative links in one SKILL.md body. External links,
// anchors, and mailto: are not this signal's business; upstream
// skills never reach this function (exempt). Returns the count.
export function countBrokenInternalLinks(skillDirAbs, text, root = ROOT) {
  let broken = 0;
  for (const href of extractLinks(text)) {
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    const target = href.split('#')[0].split('?')[0];
    if (!target) continue;
    const resolved = href.startsWith('/')
      ? path.resolve(root, target.slice(1))
      : path.resolve(skillDirAbs, target);
    if (!existsSync(resolved)) broken++;
  }
  return broken;
}

// Count the required sections present in a SKILL.md body (after
// frontmatter). A section counts when its `## <name>` heading
// exists; emptiness is the validator's job, not freshness's.
export function countSections(text) {
  const { body } = splitFrontmatter(text);
  const scan = body ?? text;
  const headings = new Set(
    [...scan.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim()),
  );
  return REQUIRED_SECTIONS.filter((s) => headings.has(s)).length;
}

function parseArgs(argv) {
  const opts = {
    referenceDate: null,
    warnDays: null,
    criticalDays: null,
    config: null,
    linksReport: null,
    out: null,
    json: false,
    failOnCritical: false,
    failOnStale: false,
    root: ROOT,
  };
  const takeValue = (flag) => {
    const idx = argv.indexOf(flag);
    if (idx === -1) return null;
    const value = argv[idx + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`);
    }
    return value;
  };
  opts.referenceDate = takeValue('--reference-date');
  opts.config = takeValue('--config');
  opts.linksReport = takeValue('--links-report');
  opts.out = takeValue('--out');
  opts.root = takeValue('--root') || ROOT;
  const warn = takeValue('--warn-days');
  const critical = takeValue('--critical-days');
  if (warn !== null) opts.warnDays = Number(warn);
  if (critical !== null) opts.criticalDays = Number(critical);
  opts.json = argv.includes('--json');
  opts.failOnCritical = argv.includes('--fail-on-critical');
  opts.failOnStale = argv.includes('--fail-on-stale');
  const unknown = argv.filter((a) => a.startsWith('--') && ![
    '--reference-date', '--warn-days', '--critical-days', '--config',
    '--links-report', '--out', '--json', '--fail-on-critical',
    '--fail-on-stale', '--root',
  ].includes(a));
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(', ')}`);
  return opts;
}

// Resolve thresholds: CLI > config file > defaults. A config file
// is JSON: { "warnDays": 180, "criticalDays": 365 }. Exported so
// the precedence is testable without running the whole report.
export async function resolveThresholds({ warnDays, criticalDays, config, root }) {
  let fileCfg = {};
  if (config) {
    const raw = await readFile(path.isAbsolute(config) ? config : path.join(root, config), 'utf8');
    fileCfg = JSON.parse(raw);
  }
  const warn = warnDays ?? fileCfg.warnDays ?? DEFAULT_WARN_DAYS;
  const critical = criticalDays ?? fileCfg.criticalDays ?? DEFAULT_CRITICAL_DAYS;
  if (!Number.isInteger(warn) || warn <= 0) throw new Error(`warnDays must be a positive integer, got ${warn}`);
  if (!Number.isInteger(critical) || critical <= 0) throw new Error(`criticalDays must be a positive integer, got ${critical}`);
  if (warn >= critical) throw new Error(`warnDays (${warn}) must be smaller than criticalDays (${critical})`);
  return { warnDays: warn, criticalDays: critical };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

// Run the freshness report end to end. Exported for testing:
// `opts` injects root, reference date, thresholds, and output
// sinks, so tests run against fixture trees with a fixed clock.
// Returns { exitCode, report }.
export async function runFreshness({
  root = ROOT,
  referenceDate = null,
  warnDays = null,
  criticalDays = null,
  config = null,
  linksReport = null,
  out = null,
  json = false,
  failOnCritical = false,
  failOnStale = false,
  log = console.log,
  error = console.error,
} = {}) {
  const thresholds = await resolveThresholds({ warnDays, criticalDays, config, root });
  const refTs = referenceDate ? parseDate(referenceDate) : Date.now();
  if (refTs === null) {
    error(`freshness: --reference-date must be YYYY-MM-DD, got ${JSON.stringify(referenceDate)}`);
    return { exitCode: 2, report: null };
  }
  // A wall-clock default is correct here (like `query stale`): the
  // report is a point-in-time measurement, and the reference date
  // is recorded in the report itself.
  const refDayTs = Date.UTC(
    new Date(refTs).getUTCFullYear(),
    new Date(refTs).getUTCMonth(),
    new Date(refTs).getUTCDate(),
  );
  const refDay = formatDate(refDayTs);

  let registry;
  let verification;
  try {
    registry = await readJson(path.join(root, 'registry', 'skills.json'));
    verification = await readJson(path.join(root, 'sources', 'verification-status.json'));
  } catch (e) {
    error(`freshness: cannot read registry or verification status: ${e.message}`);
    return { exitCode: 2, report: null };
  }

  // Optional external-links input: { "<skill>": { "total": n, "broken": n } }.
  // No producer exists yet (check-links --online prints text); the
  // format is documented in SKILL-FRESHNESS.md for the day one does.
  let linksData = null;
  if (linksReport) {
    try {
      linksData = await readJson(path.isAbsolute(linksReport) ? linksReport : path.join(root, linksReport));
    } catch (e) {
      error(`freshness: cannot read links report ${linksReport}: ${e.message}`);
      return { exitCode: 2, report: null };
    }
  }

  // Upstream import dates + pins (informational).
  let importDates = new Map();
  try {
    const pinsText = await readFile(path.join(root, 'sources', 'imported-skills.md'), 'utf8');
    importDates = parseImportDates(pinsText);
  } catch {
    // A missing pins file only loses the informational upstream
    // fields; scoring does not depend on them.
  }

  const skills = [...(registry.skills ?? [])].sort((a, b) => (a.name < b.name ? -1 : 1));
  const skillPaths = new Set(skills.map((s) => toPosixPath(s.path)));
  const lastChanges = await collectLastChanges(root, skillPaths);
  const commit = await currentCommit(root);

  // Per-skill file signals (original skills only; upstream exempt).
  const fileSignals = new Map(); // name -> { brokenLinks, sectionsPresent }
  for (const skill of skills) {
    if (skill.source_type === 'upstream') continue;
    const skillFile = path.join(root, toPosixPath(skill.path), 'SKILL.md');
    try {
      const text = await readFile(skillFile, 'utf8');
      fileSignals.set(skill.name, {
        brokenLinks: countBrokenInternalLinks(path.dirname(skillFile), text, root),
        sectionsPresent: countSections(text),
      });
    } catch {
      // An unreadable SKILL.md is the validator's failure, not
      // freshness's: the file signals stay unknown for this skill.
    }
  }

  const entries = [];
  const byBand = { FRESH: 0, AGING: 0, STALE: 0, CRITICAL: 0, UNVERIFIED: 0 };
  let changedAfterVerification = 0;
  for (const skill of skills) {
    const vs = verification.statuses?.[skill.name] ?? {};
    const lastVerified = vs.date ?? skill.last_verified ?? null;
    const status = vs.status ?? skill.status ?? null;
    const lastChange = lastChanges?.get(toPosixPath(skill.path)) ?? null;
    const file = fileSignals.get(skill.name);
    const upstream = importDates.get(skill.name);
    const result = scoreSkill({
      name: skill.name,
      category: skill.category,
      sourceType: skill.source_type,
      status,
      lastVerified,
      lastChange,
      brokenInternalLinks: file?.brokenLinks ?? null,
      sectionsPresent: file?.sectionsPresent ?? null,
      sectionsTotal: REQUIRED_SECTIONS.length,
      externalLinks: linksData?.[skill.name] ?? null,
      upstreamImported: upstream?.imported ?? null,
      upstreamPin: upstream?.pin ?? null,
    }, { referenceDate: refDayTs, ...thresholds });
    byBand[result.band]++;
    const changeTs = parseDate(lastChange);
    const verifiedTs = parseDate(lastVerified);
    if (changeTs !== null && verifiedTs !== null && changeTs > verifiedTs) changedAfterVerification++;
    entries.push({
      name: skill.name,
      category: skill.category,
      sourceType: skill.source_type,
      vendor: skill.vendor ?? null,
      status,
      lastVerified,
      ageDays: result.ageDays,
      lastChange,
      upstreamImported: upstream?.imported ?? null,
      upstreamPin: upstream?.pin ? upstream.pin.slice(0, 12) : null,
      score: result.score,
      band: result.band,
      components: result.components,
      reasons: result.reasons,
      warnings: result.warnings,
    });
  }

  const report = {
    generated: refDay,
    referenceDate: refDay,
    commit,
    thresholds,
    weights: WEIGHTS,
    bands: { freshMinScore: FRESH_MIN_SCORE, agingMinScore: AGING_MIN_SCORE },
    summary: {
      total: entries.length,
      byBand,
      changedAfterVerification,
      gitAvailable: lastChanges !== null,
      linksReportUsed: linksData !== null,
      scores: {
        lowest: entries.length ? Math.min(...entries.map((e) => e.score)) : null,
        highest: entries.length ? Math.max(...entries.map((e) => e.score)) : null,
        mean: entries.length
          ? Math.round(entries.reduce((a, e) => a + e.score, 0) / entries.length * 10) / 10
          : null,
      },
    },
    skills: entries,
  };

  if (out) {
    await writeFile(path.isAbsolute(out) ? out : path.join(root, out), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  if (json) {
    log(JSON.stringify(report, null, 2));
  } else {
    log(`Freshness report — reference ${refDay}${commit ? `, commit ${commit.slice(0, 7)}` : ''} (warn ${thresholds.warnDays}d / critical ${thresholds.criticalDays}d)`);
    log(`Scored ${entries.length} skills: ${byBand.FRESH} FRESH, ${byBand.AGING} AGING, ${byBand.STALE} STALE, ${byBand.CRITICAL} CRITICAL, ${byBand.UNVERIFIED} UNVERIFIED.`);
    if (!lastChanges) log('Note: git history unavailable — the content-stability signal was excluded for every skill.');
    if (!linksData) log('Note: no --links-report supplied — the external-link signal was excluded for every skill.');
    if (changedAfterVerification > 0) log(`Note: ${changedAfterVerification} skill(s) changed after their last verification date.`);
    const nonFresh = entries.filter((e) => e.band !== 'FRESH')
      .sort((a, b) => BAND_RANK[b.band] - BAND_RANK[a.band] || a.score - b.score);
    for (const e of nonFresh) {
      log(`  ${e.band.padEnd(10)} ${e.name} (${e.score}) — ${e.reasons.join('; ') || 'below the FRESH score cutoff'}`);
      for (const w of e.warnings) log(`             warning: ${w}`);
    }
    if (out) log(`JSON report written to ${out}`);
  }

  let exitCode = 0;
  if (failOnCritical && byBand.CRITICAL > 0) {
    error(`freshness: FAIL — ${byBand.CRITICAL} skill(s) past the ${thresholds.criticalDays}-day critical staleness threshold.`);
    exitCode = 1;
  }
  if (failOnStale && (byBand.STALE > 0 || byBand.CRITICAL > 0)) {
    error(`freshness: FAIL — ${byBand.STALE + byBand.CRITICAL} skill(s) STALE or CRITICAL.`);
    exitCode = 1;
  }
  return { exitCode, report };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`freshness: ${e.message}`);
    console.error('usage: node scripts/freshness.mjs [--reference-date YYYY-MM-DD] [--warn-days N] [--critical-days N] [--config <path>] [--links-report <path>] [--out <path>] [--json] [--fail-on-critical] [--fail-on-stale] [--root <dir>]');
    process.exitCode = 2;
    return;
  }
  try {
    const { exitCode } = await runFreshness(opts);
    // exitCode, not process.exit(): a hard exit discards pending
    // piped stdout. Natural exit flushes it first.
    process.exitCode = exitCode;
  } catch (e) {
    console.error(`freshness: ${e.message}`);
    process.exitCode = 2;
  }
}

const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
