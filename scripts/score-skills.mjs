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

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter } from './lib/frontmatter.mjs';
// Security patterns come from the shared library (score scope: secrets
// + injection only — command/code patterns need context triage and live
// in the scanner, not in a score cap).
import { scanLine } from './lib/security-patterns.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const REQUIRED_SECTIONS = [
  'Purpose', 'When to Use', 'When Not to Use', 'Prerequisites',
  'Official Documentation', 'Required Workflow', 'Implementation Standards',
  'Best Practices', 'Security Considerations', 'Performance Considerations',
  'Common Mistakes', 'Examples', 'Validation Checklist',
  'Expected Deliverables', 'References',
];

// Categories where accessibility content is applicable (Phase 5 standard).
const A11Y_CATEGORIES = new Set(['frontend', 'media', 'content', 'metadata']);

// (Security patterns live in scripts/lib/security-patterns.mjs;
// the security dimension uses its 'score' scope via scanLine.)

// Placeholder markers — same split as scripts/validate-skills.mjs.
const PLACEHOLDER_ACRONYM_RE = /\b(TODO|FIXME|XXX|TBD)\b/;
const PLACEHOLDER_PHRASE_RE = /lorem ipsum|coming soon|placeholder text/i;
const REL_LINK_RE = /\[[^\]]*\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;
const EXT_LINK_RE = /\[[^\]]*\]\((https?:[^)\s]+)\)/g;

const args = process.argv.slice(2);
const filterIdx = args.indexOf('--filter');
const FILTER = filterIdx >= 0 ? args[filterIdx + 1] : null;
const JSON_OUT = args.includes('--json');

async function findSkillFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findSkillFiles(full));
    else if (e.name === 'SKILL.md') out.push(full);
  }
  return out;
}

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

function scoreSkill(relPath, text) {
  const { raw, body, error } = splitFrontmatter(text);
  const flags = [];
  const dims = {};
  if (error) {
    return { path: relPath, overall: 0, dimensions: dims, flags: ['CRITICAL: ' + error], lines: text.split('\n').length };
  }
  const { data, error: parseErr } = parseFrontmatter(raw);
  if (parseErr) {
    return { path: relPath, overall: 0, dimensions: dims, flags: ['CRITICAL: ' + parseErr], lines: text.split('\n').length };
  }
  const name = data.name || path.basename(path.dirname(relPath));
  const category = (data.metadata && data.metadata.category) || relPath.split('/')[1] || '';
  const secs = sections(body);
  const lines = text.split('\n').length;
  const missing = REQUIRED_SECTIONS.filter((s) => !secs.has(s));

  // --- completeness (sections present + non-empty + description) ---
  let completeness = 0;
  completeness += (REQUIRED_SECTIONS.length - missing.length) / REQUIRED_SECTIONS.length * 70;
  const nonEmpty = REQUIRED_SECTIONS.filter((s) => secs.has(s) && nonEmptyLines(secs.get(s)) >= 2).length;
  completeness += nonEmpty / REQUIRED_SECTIONS.length * 20;
  const desc = (data.description || '').trim();
  if (desc.length >= 50 && desc.length <= 1024) completeness += 10;
  else if (desc.length > 0) completeness += 5;
  // Accessibility element: applicable categories must mention it.
  if (A11Y_CATEGORIES.has(category) && !/accessib|wcag|aria|screen reader|keyboard navigat/i.test(body)) {
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
  const versionInfo = /\bcurrent stable as of\b/i.test(prereq) || /\bv?\d+\.\d+(\.\d+)?\b/.test(prereq) || /version range|requires?\s+\S+\s+\d/i.test(prereq);
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
  let maintainability = lines <= 350 ? 100 : lines <= 500 ? Math.round(100 - (lines - 350) / 3) : 0;
  if (lines > 350 && existsSync(path.join(skillDir, 'references'))) maintainability = Math.min(100, maintainability + 10);
  dims.maintainability = maintainability;

  // --- overall + caps ---
  const values = Object.values(dims);
  let overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  if (secHits.length > 0) overall = Math.min(overall, 40);
  if (missing.length > 0) { overall = Math.min(overall, 50); flags.push(`completeness: missing sections: ${missing.join(', ')}`); }
  if (placeholder) overall = Math.min(overall, 60);

  return { path: relPath, name, category, lines, overall, dimensions: dims, flags };
}

const files = (await findSkillFiles(SKILLS_DIR))
  .filter((f) => !f.includes(`${path.sep}upstream${path.sep}`))
  .filter((f) => !FILTER || path.relative(ROOT, f).startsWith(FILTER))
  .sort();

const results = [];
for (const f of files) {
  const text = await readFile(f, 'utf8');
  results.push(scoreSkill(path.relative(ROOT, f), text));
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

process.exit(critical.length > 0 ? 1 : 0);
