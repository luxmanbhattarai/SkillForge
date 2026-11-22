#!/usr/bin/env node
// score-skills.mjs — quality scores for original skills.
//
// Scores every original skill (skills/upstream/ is excluded: upstream
// skills are imported verbatim and exempt from this repository's
// standard) on eight dimensions, 0-100 each:
//
//   accuracy       checkable proxies ONLY (see below — not real verification)
//   completeness   required sections present and non-empty
//   actionability  workflow steps, checklist items, code blocks, counter-examples
//   security       substantive Security section, no security-scan pattern hits
//   testing        testing-strategy signals in the body
//   documentation  official-doc links, references with related skills
//   versioning     last_verified freshness + version info in the body
//   maintainability SKILL.md length, progressive disclosure
//
// Hard caps (a high score must not hide a critical failure):
//   - any security-scan pattern hit  -> overall capped at 40, flagged CRITICAL
//   - a missing required section     -> overall capped at 50
//   - a placeholder marker           -> overall capped at 60
//
// ACCURACY IS A PROXY. This script cannot verify technical accuracy —
// that requires reading official documentation, which only a human
// audit (Phase 3 style) does. The accuracy dimension scores checkable
// proxies (no placeholders, no broken relative links, https doc links)
// and is labeled as such in the output. Never present a scorer result
// as proof that a skill's technical content is correct.
//
// Usage:
//   node scripts/score-skills.mjs [--filter <path-prefix>] [--json]
//   npm run score
// Exit code 1 if any skill is CRITICAL (security pattern hit), else 0.
//
// Output format is stable (see the --json shape at the bottom):
// rule changes move scores, never the shape, so before/after runs
// stay comparable. Rule changes are recorded here:
//   - Finding 6 (2026-11-22): the version-info rule used to miss
//     "N.x" ranges (10.x, 6.x), v-prefixed majors (v4), bare majors
//     on dotted products (Node.js 24), and standards IDs (BCP 47) —
//     20 of the 110 flagged skills had version info the rule could
//     not see. It also rewarded the bare phrase "current stable as
//     of", which Finding 4 bans from bodies (with its date) and
//     which says nothing without one; that reward is removed.
//   - Finding 1 (2026-11-22): the disclosure bonus now covers all
//     four disclosure folders (references 10, scripts 5, assets or
//     examples 5; capped at 20), still only when the body is over
//     350 lines. Small single-file skills still score 100 without
//     any folder — disclosure is a reward for long skills, never a
//     tax on short ones.
//   - Finding 6 integration (2026-11-22): (a) the standards-ID
//     pattern now accepts 4-digit numbers (RFC 9111, ISO 8601 —
//     the old \d{1,3} could not match any RFC number); (b) an
//     explicit "version range: none" declaration now counts as a
//     version statement — the flag surfaces skills that have not
//     addressed versioning, and a skill that honestly declares it
//     has no versionable dependency has addressed it (this
//     reverses the earlier deliberate choice; see hasVersionInfo);
//     (c) the accessibility flag now reads the per-skill
//     classification in sources/accessibility-classification.json
//     (Phase 8), falling back to the category rule when the file
//     is absent — e.g. on historical worktrees.

import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter } from './lib/frontmatter.mjs';
import { toPosixPath } from './lib/paths.mjs';
// Shared skill discovery + standard constants (A2-18): one copy of
// findSkillFiles, REQUIRED_SECTIONS, and the placeholder regexes
// for every check script, so a fix in one place reaches all of them.
import { findSkillFiles, REQUIRED_SECTIONS, PLACEHOLDER_ACRONYM_RE, PLACEHOLDER_PHRASE_RE } from './lib/skill-files.mjs';
// Security patterns come from the shared library (score scope: secrets
// + injection only — command/code patterns need context triage and live
// in the scanner, not in a score cap).
import { scanLine } from './lib/security-patterns.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

// Categories where accessibility content is applicable (Phase 5 standard).
// Fallback only: the per-skill classification in
// sources/accessibility-classification.json (Phase 8, 228 entries) is
// authoritative where it covers a skill — it is finer-grained than the
// category rule in both directions (applicable skills exist in auth,
// seo, testing and other categories the rule never covered; and a few
// skills in the four categories below are genuinely not applicable,
// e.g. content/fact-checking). The fallback matters for historical
// worktrees (quality-trends snapshots) that predate the file.
const A11Y_CATEGORIES = new Set(['frontend', 'media', 'content', 'metadata']);
const A11Y_CLASSIFICATION_PATH = path.join(ROOT, 'sources', 'accessibility-classification.json');
let a11yClassification = null; // null = not loaded yet; {} = unavailable
function loadA11yClassification() {
  if (a11yClassification !== null) return a11yClassification;
  try {
    a11yClassification = JSON.parse(readFileSync(A11Y_CLASSIFICATION_PATH, 'utf8')).skills || {};
  } catch {
    a11yClassification = {};
  }
  return a11yClassification;
}
// Is accessibility content applicable to this skill? Exported for
// testing. Classification entry wins when present; otherwise the
// Phase 5 category rule applies.
export function isA11yApplicable(category, name) {
  const entry = loadA11yClassification()[`${category}/${name}`];
  if (entry && typeof entry.applicability === 'string') {
    return entry.applicability === 'applicable';
  }
  return A11Y_CATEGORIES.has(category);
}

// (Security patterns live in scripts/lib/security-patterns.mjs;
// the security dimension uses its 'score' scope via scanLine.)

// (REQUIRED_SECTIONS and the placeholder regexes live in
// scripts/lib/skill-files.mjs — the shared copy, audit A2-18.)
const REL_LINK_RE = /\[[^\]]*\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;
const EXT_LINK_RE = /\[[^\]]*\]\((https?:[^)\s]+)\)/g;

const args = process.argv.slice(2);
const filterIdx = args.indexOf('--filter');
const FILTER = filterIdx >= 0 ? args[filterIdx + 1] : null;
const JSON_OUT = args.includes('--json');

// Split body into sections by ## heading. Returns Map<heading, text>.
function sections(body) {
  const map = new Map();
  let current = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { current = m[1].trim(); map.set(current, ''); }
    else if (current) map.set(current, map.get(current) + line + '\n');
  }
  return map;
}

const nonEmptyLines = (text) => text.split('\n').filter((l) => l.trim() !== '').length;

// Does the Prerequisites / Official Documentation text state version
// information? Exported for testing. Recognised forms (each verified
// against real skills that were wrongly flagged):
//   - dotted versions: 2.12.7, 1.37.2, v3.1
//   - major-line ranges: 10.x, 6.x (ESLint 10.x, jose 6.x)
//   - v-prefixed bare majors: v4, v2 (Tailwind v4, Compose v2)
//   - bare majors on dotted products: Node.js 24, Node.js 26
//   - standards IDs: BCP 47, ISO 639, SP 800, RFC 9111, ISO 8601
//     (all-caps acronym + number, up to 4 digits — RFC numbers are
//     4 digits, and the old \d{1,3} could not match any of them)
//   - "version range" phrasing and "requires <tool> <n>" forms
//   - an explicit "version range: none" (or "not applicable")
//     declaration: the flag surfaces skills that have NOT addressed
//     versioning, and a skill that honestly declares it has no
//     versionable dependency — a conceptual skill, or a managed
//     platform with no pinned version — has addressed it. This
//     reverses the earlier deliberate choice (which held that
//     counting "none" would hide the skills the flag is meant to
//     surface): flagging a skill forever for a version it cannot
//     have is noise that hides the real gaps. The bare words
//     "version range" alone still do not count — only the explicit
//     none / not-applicable declaration, or a digit after the phrase.
// Deliberately NOT recognised: the bare phrase "current stable as
// of" (Finding 4 bans it with a date from skill bodies, and without
// a date it states no version), bare "<Word> <n>" forms such as
// "May 7" (a calendar date) or "Top 10" (OWASP Top 10) — a generic
// bare-major pattern cannot tell those from versions, so bare
// majors only count in the dotted-product and v-prefixed forms.
export function hasVersionInfo(text) {
  return (
    /\bv?\d+\.\d+(\.\d+)?\b/.test(text) ||
    /\bv?\d+\.x\b/i.test(text) ||
    /\bv\d{1,2}\b/.test(text) ||
    /\b[A-Z][A-Za-z]*\.[a-z]+\s+\d{1,2}\b/.test(text) ||
    /\b[A-Z]{2,}\s+\d{1,4}\b/.test(text) ||
    /version range[^.\n]*\d/i.test(text) ||
    /version range\s*:\s*(none|n\/a|not applicable)\b/i.test(text) ||
    /requires?\s+\S+\s+\d/i.test(text)
  );
}

// Progressive-disclosure bonus for the maintainability dimension
// (Finding 1). A folder counts only when it exists AND is non-empty:
// an empty references/ dir discloses nothing. Exported for testing.
// Returns { bonus, folders } with bonus capped at 20.
export function disclosureBonus(skillDir) {
  const nonEmpty = (dir) => {
    try {
      return readdirSync(path.join(skillDir, dir)).length > 0;
    } catch {
      return false;
    }
  };
  const folders = [];
  let bonus = 0;
  if (nonEmpty('references')) { folders.push('references'); bonus += 10; }
  if (nonEmpty('scripts')) { folders.push('scripts'); bonus += 5; }
  if (nonEmpty('assets') || nonEmpty('examples')) {
    if (nonEmpty('assets')) folders.push('assets');
    if (nonEmpty('examples')) folders.push('examples');
    bonus += 5;
  }
  return { bonus: Math.min(20, bonus), folders };
}

function scoreSkill(relPath, text) {
  // Line count that agrees with `wc -l`: split() counts a trailing
  // newline as an extra empty line (audit finding L-01; the same
  // fix as scripts/validate-skills.mjs).
  const lineCount = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  const { raw, body, error } = splitFrontmatter(text);
  const flags = [];
  const dims = {};
  if (error) {
    return { path: relPath, overall: 0, dimensions: dims, flags: ['CRITICAL: ' + error], lines: lineCount };
  }
  const { data, error: parseErr } = parseFrontmatter(raw);
  if (parseErr) {
    return { path: relPath, overall: 0, dimensions: dims, flags: ['CRITICAL: ' + parseErr], lines: lineCount };
  }
  const name = data.name || path.basename(path.dirname(relPath));
  const category = (data.metadata && data.metadata.category) || relPath.split('/')[1] || '';
  const secs = sections(body);
  const lines = lineCount;
  const missing = REQUIRED_SECTIONS.filter((s) => !secs.has(s));

  // --- completeness (sections present + non-empty + description) ---
  let completeness = 0;
  completeness += (REQUIRED_SECTIONS.length - missing.length) / REQUIRED_SECTIONS.length * 70;
  const nonEmpty = REQUIRED_SECTIONS.filter((s) => secs.has(s) && nonEmptyLines(secs.get(s)) >= 2).length;
  completeness += nonEmpty / REQUIRED_SECTIONS.length * 20;
  const desc = (data.description || '').trim();
  if (desc.length >= 50 && desc.length <= 1024) completeness += 10;
  else if (desc.length > 0) completeness += 5;
  // Accessibility element: applicable skills must mention it.
  // Applicability is per-skill (Phase 8 classification) with a
  // category-rule fallback — see isA11yApplicable.
  if (isA11yApplicable(category, name) && !/accessib|wcag|aria|screen reader|keyboard navigat/i.test(body)) {
    completeness = Math.max(0, completeness - 10);
    flags.push('accessibility: no accessibility content (applicable category)');
  }
  dims.completeness = Math.round(completeness);

  // --- actionability (workflow steps, checklist, code, counter-examples) ---
  const workflow = secs.get('Required Workflow') || '';
  const steps = (workflow.match(/^\s*\d+\.\s+/gm) || []).length;
  const checklist = secs.get('Validation Checklist') || '';
  const checks = (checklist.match(/^\s*-\s*\[[ x]\]/gim) || []).length;
  const codeBlocks = (body.match(/```/g) || []).length / 2;
  const counter = /counter-example|do not do this|wrong way|incorrect:|don't do this/i.test(secs.get('Examples') || '') ||
    /instead/i.test(secs.get('Common Mistakes') || '');
  dims.actionability = Math.round(
    Math.min(steps, 5) / 5 * 40 +
    Math.min(checks, 4) / 4 * 30 +
    Math.min(codeBlocks, 2) / 2 * 15 +
    (counter ? 15 : 0),
  );

  // --- security (section substance + no pattern hits) ---
  const secLines = nonEmptyLines(secs.get('Security Considerations') || '');
  const secHits = new Set();
  for (const line of text.split('\n')) {
    for (const { pattern } of scanLine(line, 'score')) secHits.add(`${pattern.id} ${pattern.label}`);
  }
  dims.security = secHits.size > 0 ? 0 : Math.round(Math.min(secLines, 6) / 6 * 100);
  if (secHits.size > 0) flags.push('CRITICAL: security pattern hit: ' + [...secHits].join(', '));

  // --- testing (testing-strategy signals) ---
  const impl = secs.get('Implementation Standards') || '';
  const testSignals = (body.match(/\b(test|testing|pytest|vitest|playwright|unit test|integration test|e2e|coverage)\b/gi) || []).length;
  const hasTestSubsection = /^###\s+Testing Strategy/m.test(impl);
  dims.testing = Math.round(Math.min(testSignals, 8) / 8 * 70 + (hasTestSubsection ? 30 : 0));

  // --- documentation (official links + references) ---
  const docLinks = [...(secs.get('Official Documentation') || '').matchAll(EXT_LINK_RE)].length;
  const refText = secs.get('References') || '';
  const refLinks = [...refText.matchAll(EXT_LINK_RE)].length;
  const relatedSkills = (refText.match(/`[a-z0-9][a-z0-9-]*`/g) || []).length;
  dims.documentation = Math.round(
    Math.min(docLinks, 3) / 3 * 50 +
    Math.min(refLinks, 2) / 2 * 25 +
    Math.min(relatedSkills, 3) / 3 * 25,
  );

  // --- versioning (last_verified freshness + version info in body) ---
  let freshness = 0;
  const lv = data.metadata && data.metadata.last_verified;
  if (lv && /^\d{4}-\d{2}-\d{2}$/.test(lv)) {
    const ageDays = (Date.now() - Date.parse(lv + 'T00:00:00Z')) / 86400000;
    freshness = ageDays <= 365 ? 100 : Math.max(0, 100 - Math.floor((ageDays - 365) / 3.65));
  }
  const prereq = (secs.get('Prerequisites') || '') + '\n' + (secs.get('Official Documentation') || '');
  // The flag names Prerequisites because that is where the template
  // requires supported versions; the check also accepts version info
  // in Official Documentation (a leniency, not a second requirement).
  const versionInfo = hasVersionInfo(prereq);
  dims.versioning = Math.round(freshness * 0.5 + (versionInfo ? 50 : 0));
  if (!versionInfo) flags.push('versioning: no version info in Prerequisites');

  // --- accuracy proxy (placeholders, broken relative links, http links) ---
  let accuracy = 100;
  const placeholder = PLACEHOLDER_ACRONYM_RE.test(body) || PLACEHOLDER_PHRASE_RE.test(body);
  if (placeholder) { accuracy -= 40; flags.push('accuracy-proxy: placeholder marker found'); }
  const skillDir = path.join(ROOT, path.dirname(relPath));
  let broken = 0;
  for (const m of body.matchAll(REL_LINK_RE)) {
    const target = m[1].split('#')[0];
    if (!target) continue;
    if (!existsSync(path.resolve(skillDir, target))) broken++;
  }
  if (broken > 0) { accuracy -= Math.min(40, broken * 10); flags.push(`accuracy-proxy: ${broken} broken relative link(s)`); }
  const httpLinks = [...body.matchAll(EXT_LINK_RE)].filter((m) => m[1].startsWith('http://')).length;
  if (httpLinks > 0) { accuracy -= Math.min(20, httpLinks * 5); flags.push(`accuracy-proxy: ${httpLinks} non-https link(s)`); }
  dims.accuracy = Math.max(0, accuracy);

  // --- maintainability (length + progressive disclosure) ---
  // Curve aligned to the standard: <500 lines is acceptable, shorter is
  // better. Full marks at <=350 lines, 50 at the 500-line limit, 0 above.
  // The disclosure bonus (references 10, scripts 5, assets/examples 5,
  // capped at 20) applies only above 350 lines: a short skill is
  // already at full marks with or without folders, so small
  // single-file skills are never punished — and a long skill that
  // factored its detail out earns some of the length penalty back.
  // A body over 500 lines still scores low even fully disclosed:
  // the split is supposed to shorten the body, not decorate it.
  let maintainability = lines <= 350 ? 100 : lines <= 500 ? Math.round(100 - (lines - 350) / 3) : 0;
  if (lines > 350) maintainability = Math.min(100, maintainability + disclosureBonus(skillDir).bonus);
  dims.maintainability = maintainability;

  // --- overall + caps ---
  const values = Object.values(dims);
  let overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  if (secHits.size > 0) overall = Math.min(overall, 40);
  if (missing.length > 0) { overall = Math.min(overall, 50); flags.push(`completeness: missing sections: ${missing.join(', ')}`); }
  if (placeholder) overall = Math.min(overall, 60);

  return { path: relPath, name, category, lines, overall, dimensions: dims, flags };
}

async function main() {
  const files = (await findSkillFiles(SKILLS_DIR))
    .filter((f) => !f.includes(`${path.sep}upstream${path.sep}`))
    // Normalized to POSIX separators: the FILTER prefix match and
    // scoreSkill's category fallback (split('/')[1]) both assume
    // forward slashes, which a Windows backslash path would break
    // (Stage D, same class as W-2). No-op on POSIX.
    .map((f) => toPosixPath(path.relative(ROOT, f)))
    .filter((rel) => !FILTER || rel.startsWith(FILTER))
    .sort();

  const results = [];
  for (const rel of files) {
    const text = await readFile(path.join(ROOT, rel), 'utf8');
    results.push(scoreSkill(rel, text));
  }

  const critical = results.filter((r) => r.flags.some((fl) => fl.startsWith('CRITICAL')));
  const mean = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const summary = {
    scored: results.length,
    meanOverall: mean(results.map((r) => r.overall)),
    meanDimensions: Object.fromEntries(
      ['accuracy', 'completeness', 'actionability', 'security', 'testing', 'documentation', 'versioning', 'maintainability']
        .map((d) => [d, mean(results.map((r) => r.dimensions[d] ?? 0))])),
    critical: critical.length,
    lowest: [...results].sort((a, b) => a.overall - b.overall).slice(0, 10).map((r) => ({ path: r.path, overall: r.overall })),
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ generated: new Date().toISOString().slice(0, 10), summary, results }, null, 2));
  } else {
    console.log(`Scored ${results.length} original skills (upstream excluded). Mean overall: ${summary.meanOverall}/100.`);
    console.log('Mean dimensions: ' + Object.entries(summary.meanDimensions).map(([k, v]) => `${k} ${v}`).join(', ') + '.');
    console.log(`CRITICAL (security pattern hit): ${critical.length}.`);
    if (critical.length > 0) for (const r of critical) console.log(`  CRITICAL ${r.path}: ${r.flags.filter((f) => f.startsWith('CRITICAL')).join('; ')}`);
    console.log('\nLowest 10 by overall score:');
    for (const r of summary.lowest) console.log(`  ${String(r.overall).padStart(3)}  ${r.path}`);
    const flagged = results.filter((r) => r.flags.length > 0 && !r.flags.some((f) => f.startsWith('CRITICAL')));
    if (flagged.length > 0) {
      console.log(`\n${flagged.length} skills with non-critical flags (first 20):`);
      for (const r of flagged.slice(0, 20)) console.log(`  ${r.path}: ${r.flags.join('; ')}`);
    }
    console.log('\nNote: the accuracy dimension scores checkable proxies only (no placeholders, no broken relative links, https links). It does not verify technical accuracy.');
  }

  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout. Natural exit flushes it first (see validate-registry.mjs).
  process.exitCode = critical.length > 0 ? 1 : 0;
}

// Main guard: importing this module for hasVersionInfo /
// disclosureBonus must not trigger a full scoring run.
const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
