// accessibility-coverage.test.mjs — regression tests for Phase 8
// (accessibility coverage). The classification in
// sources/accessibility-classification.json is the record of which
// original skills accessibility applies to and why; these tests compute
// coverage from the real skill files so it cannot silently regress.
//
// Detection is deliberately strict: an applicable skill has guidance
// only when it carries a `### Accessibility` subsection (with substantive
// content) or is flagged whole-skill in the classification. The scorer's
// loose regex (/accessib|wcag|aria|.../) is NOT used here — it matches
// "variable" (contains "aria") and generic uses of "accessible", and
// counted 107 files at baseline where only 14 had real guidance.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const CLASSIFICATION_PATH = path.join(REPO_ROOT, 'sources', 'accessibility-classification.json');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

// A whole-skill entry must still show substantive accessibility content.
// Word boundaries keep "variable" / "library" from counting as "aria".
const WHOLE_SKILL_CONTENT_RE = /\baccessib|\bwcag\b|\baria\b|screen reader|keyboard/i;
const MIN_SUBSECTION_LINES = 4; // non-empty lines under the subsection heading
const MIN_REASON_LENGTH = 20; // characters; a reason must actually say why

async function listOriginalSkills() {
  const out = [];
  const cats = (await readdir(SKILLS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && e.name !== 'upstream')
    .map((e) => e.name);
  for (const cat of cats) {
    const dir = path.join(SKILLS_DIR, cat);
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      try {
        await readFile(path.join(dir, e.name, 'SKILL.md'), 'utf8');
        out.push(`${cat}/${e.name}`);
      } catch { /* no SKILL.md in this directory */ }
    }
  }
  return out.sort();
}

async function loadClassification() {
  return JSON.parse(await readFile(CLASSIFICATION_PATH, 'utf8'));
}

// Extract the lines under the `### Accessibility` heading (up to the next
// heading of any level), or null when the skill has no such subsection.
function accessibilitySubsection(text) {
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

function hasGuidance(key, entry, text) {
  if (entry.guidance === 'whole-skill') {
    return WHOLE_SKILL_CONTENT_RE.test(text);
  }
  const body = accessibilitySubsection(text);
  if (!body) return false;
  return body.filter((l) => l.trim() !== '').length >= MIN_SUBSECTION_LINES;
}

test('classification covers exactly the original skills on disk', async () => {
  const disk = await listOriginalSkills();
  const { skills } = await loadClassification();
  const classified = Object.keys(skills).sort();
  const missing = disk.filter((k) => !(k in skills));
  const extra = classified.filter((k) => !disk.includes(k));
  assert.deepEqual(missing, [], `skills on disk with no classification: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `classified skills not on disk: ${extra.join(', ')}`);
  assert.equal(classified.length, disk.length);
});

test('classification entries are well-formed', async () => {
  const { skills } = await loadClassification();
  const bad = [];
  for (const [key, entry] of Object.entries(skills)) {
    if (!['applicable', 'not-applicable'].includes(entry.applicability)) {
      bad.push(`${key}: bad applicability ${JSON.stringify(entry.applicability)}`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < MIN_REASON_LENGTH) {
      bad.push(`${key}: reason missing or too short to justify the classification`);
    }
    if (!['subsection', 'whole-skill', 'none'].includes(entry.guidance)) {
      bad.push(`${key}: bad guidance ${JSON.stringify(entry.guidance)}`);
    }
    if (entry.applicability === 'applicable' && entry.guidance === 'none') {
      bad.push(`${key}: applicable but guidance is "none"`);
    }
    if (entry.applicability === 'not-applicable' && entry.guidance !== 'none') {
      bad.push(`${key}: not-applicable but guidance is ${JSON.stringify(entry.guidance)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('every applicable skill carries accessibility guidance', async () => {
  const { skills } = await loadClassification();
  const lacking = [];
  let applicable = 0;
  let covered = 0;
  for (const [key, entry] of Object.entries(skills)) {
    if (entry.applicability !== 'applicable') continue;
    applicable++;
    const text = await readFile(path.join(SKILLS_DIR, key, 'SKILL.md'), 'utf8');
    if (hasGuidance(key, entry, text)) covered++;
    else lacking.push(key);
  }
  const coverage = applicable === 0 ? 1 : covered / applicable;
  console.log(`documentation coverage: ${covered}/${applicable} applicable skills (${(coverage * 100).toFixed(1)}%)`);
  assert.deepEqual(lacking, [], 'applicable skills without accessibility guidance');
  assert.equal(coverage, 1);
});

test('no not-applicable classification dodges the requirement without a reason', async () => {
  const { skills } = await loadClassification();
  const dodges = Object.entries(skills)
    .filter(([_, e]) => e.applicability === 'not-applicable')
    .filter(([_, e]) => typeof e.reason !== 'string' || e.reason.trim().length < MIN_REASON_LENGTH)
    .map(([k]) => k);
  assert.deepEqual(dodges, [], 'not-applicable skills without a recorded reason');
  // A not-applicable skill may still carry a subsection (e.g. desktop/rust
  // records its own N/A note); that is extra content, not a failure.
});

test('accessibility subsections are substantive, not stubs', async () => {
  const { skills } = await loadClassification();
  const stubs = [];
  for (const [key, entry] of Object.entries(skills)) {
    if (entry.applicability !== 'applicable' || entry.guidance !== 'subsection') continue;
    const text = await readFile(path.join(SKILLS_DIR, key, 'SKILL.md'), 'utf8');
    const body = accessibilitySubsection(text);
    const nonEmpty = body ? body.filter((l) => l.trim() !== '').length : 0;
    if (nonEmpty < MIN_SUBSECTION_LINES) stubs.push(`${key} (${nonEmpty} lines)`);
  }
  assert.deepEqual(stubs, [], 'applicable skills with stub Accessibility subsections');
});

test('coverage metrics are computed from the files, not hardcoded', async () => {
  const { skills, counts } = await loadClassification();
  const disk = await listOriginalSkills();
  const applicable = Object.values(skills).filter((e) => e.applicability === 'applicable').length;
  const notApplicable = Object.values(skills).filter((e) => e.applicability === 'not-applicable').length;
  assert.equal(counts.total_original_skills, disk.length, 'recorded total must match disk');
  assert.equal(counts.applicable, applicable);
  assert.equal(counts.not_applicable, notApplicable);
  assert.equal(applicable + notApplicable, disk.length);
});
