// scorer-rules.test.mjs — tests for the scorer-rule fixes from the
// production-hardening mission: the version-info rule (Finding 6)
// and the progressive-disclosure bonus (Finding 1).
//
// Pure helpers are unit-tested directly. End-to-end behavior is
// tested by copying the scorer plus scripts/lib/ into a temp tree
// (the makeScriptTree pattern from audit-fixes-c3.test.mjs — the
// scorer derives its root from its own path, so it scores the
// fixture tree instead of the real library).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { disclosureBonus, hasVersionInfo, isA11yApplicable } from '../scripts/score-skills.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], (err, stdout, stderr) => {
      if (err && typeof err.code !== 'number') return reject(err);
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

async function makeScorerTree(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-scorer-rules-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await cp(path.join(REPO, 'scripts', 'score-skills.mjs'), path.join(root, 'scripts', 'score-skills.mjs'));
  await cp(path.join(REPO, 'scripts', 'lib'), path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

async function scoreTree(t, files) {
  const root = await makeScorerTree(t, files);
  const r = await runNode(path.join(root, 'scripts', 'score-skills.mjs'), ['--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  return JSON.parse(r.stdout);
}

// --- A valid original skill (all 15 sections, 2000+ chars) --------
const SECTIONS = [
  'Purpose', 'When to Use', 'When Not to Use', 'Prerequisites',
  'Official Documentation', 'Required Workflow', 'Implementation Standards',
  'Best Practices', 'Security Considerations', 'Performance Considerations',
  'Common Mistakes', 'Examples', 'Validation Checklist',
  'Expected Deliverables', 'References',
];

function skillMd({ name = 'fixture-skill', category = 'backend', prereq = '', extra = '', padLines = 0 } = {}) {
  const filler = 'Guidance text that makes the body long enough to clear the '
    + 'suspiciously-short check. '.repeat(4);
  let body = '';
  for (const s of SECTIONS) {
    const content = s === 'Prerequisites' && prereq ? prereq : `${filler}\n${filler}`;
    body += `## ${s}\n\n${content}\n\n`;
  }
  if (extra) body += `${extra}\n`;
  if (padLines > 0) body += '\n'.repeat(padLines);
  return `---\nname: ${name}\ndescription: A fixture skill for scorer-rule tests with a description long enough to be valid.\nlicense: MIT\nmetadata:\n  version: "1.0.0"\n  category: ${category}\n  maintainer: skills-library\n  source: original\n  last_verified: "2026-11-20"\n---\n\n# Fixture Skill\n\n${body}`;
}

const byPath = (out, name) =>
  out.results.find((r) => r.path === `skills/backend/${name}/SKILL.md`);
const byRelPath = (out, rel) => out.results.find((r) => r.path === rel);

// --- hasVersionInfo: forms the old rule missed ---------------------

test('hasVersionInfo accepts dotted versions', () => {
  assert.equal(hasVersionInfo('Requires Python 3.12.7 or newer.'), true);
  assert.equal(hasVersionInfo('Tested with v3.1 of the API.'), true);
});

test('hasVersionInfo accepts major-line ranges (N.x)', () => {
  // package-boundaries ("ESLint 10.x") and jwt ("6.x/5.x") were
  // wrongly flagged because the old rule needed a digit after the dot.
  assert.equal(hasVersionInfo('Requires ESLint 10.x.'), true);
  assert.equal(hasVersionInfo('Use jose 6.x or 5.x.'), true);
});

test('hasVersionInfo accepts v-prefixed bare majors', () => {
  // tailwind-css ("Tailwind v4"), pagespeed-insights ("v5").
  assert.equal(hasVersionInfo('Requires Tailwind v4.'), true);
  assert.equal(hasVersionInfo('Uses the v5 API.'), true);
});

test('hasVersionInfo accepts bare majors on dotted products', () => {
  // javascript, cloudflare-workers and others say "Node.js 24".
  assert.equal(hasVersionInfo('Requires Node.js 24 or 26.'), true);
});

test('hasVersionInfo accepts standards IDs', () => {
  // content-localization (BCP 47, ISO 639), authentication (SP 800).
  assert.equal(hasVersionInfo('Language tags follow BCP 47.'), true);
  assert.equal(hasVersionInfo('Codes per ISO 639-1.'), true);
  assert.equal(hasVersionInfo('Guidance from NIST SP 800-63.'), true);
  // 4-digit standards IDs: RFC numbers (caching, rate-limiting,
  // caching-strategy, technical-seo) and ISO 8601 (schema-jsonld,
  // sitemap-robots, structured-data). The old \d{1,3} pattern could
  // not match any of these.
  assert.equal(hasVersionInfo('Cache-Control per RFC 9111.'), true);
  assert.equal(hasVersionInfo('Dates use ISO 8601 format.'), true);
  assert.equal(hasVersionInfo('Robots rules per RFC 9309.'), true);
});

test('hasVersionInfo keeps the version-range and requires forms', () => {
  assert.equal(hasVersionInfo('Supports the version range 2.x - 3.x.'), true);
  assert.equal(hasVersionInfo('Requires Wrangler 4.'), true);
});

test('hasVersionInfo accepts an explicit "version range: none" declaration', () => {
  // Finding 6 integration (2026-11-22), reversing the earlier
  // deliberate choice: the flag surfaces skills that have NOT
  // addressed versioning, and a skill that honestly declares it
  // has no versionable dependency (a conceptual skill, or a
  // managed platform with no pinned version) has addressed it.
  // Flagging it forever is noise that hides the real gaps. The
  // bare words "version range" alone still do not count.
  assert.equal(hasVersionInfo('Conceptual skill; version range: none — applies to the latest release.'), true);
  assert.equal(hasVersionInfo('Version range: none — Fly.io is a managed platform with no pinned version.'), true);
  assert.equal(hasVersionInfo('Version range: not applicable to this skill.'), true);
  assert.equal(hasVersionInfo('See the version range in the release notes.'), false);
});

test('hasVersionInfo rejects the bare "current stable as of" phrase', () => {
  // Finding 4 bans the dated form from bodies; without a date the
  // phrase states no version, so it must not clear the flag.
  assert.equal(hasVersionInfo('Node.js installed (current stable as of the latest release).'), false);
});

test('hasVersionInfo rejects dates and ranked lists', () => {
  // A generic bare-major pattern would false-positive on these:
  // faq-generation's "May 7" and the OWASP "Top 10".
  assert.equal(hasVersionInfo('Released on May 7, 2026.'), false);
  assert.equal(hasVersionInfo('See the OWASP Top 10 list.'), false);
  assert.equal(hasVersionInfo('No version information here.'), false);
  assert.equal(hasVersionInfo(''), false);
});

// --- isA11yApplicable: per-skill classification + category fallback --

test('isA11yApplicable follows the per-skill classification where it covers a skill', () => {
  // Real classification entries (sources/accessibility-classification.json):
  // fact-checking and image-compression are not-applicable even though
  // their categories are in the Phase 5 rule; react is applicable.
  assert.equal(isA11yApplicable('content', 'fact-checking'), false);
  assert.equal(isA11yApplicable('media', 'image-compression'), false);
  assert.equal(isA11yApplicable('frontend', 'react'), true);
  // Desktop is not in the category rule at all, but electron is
  // applicable per the classification — the file extends coverage.
  assert.equal(isA11yApplicable('desktop', 'electron'), true);
  assert.equal(isA11yApplicable('desktop', 'rust'), false);
});

test('isA11yApplicable falls back to the category rule for unlisted skills', () => {
  // Historical worktrees predate the classification file; unknown
  // skills must still get the Phase 5 category answer.
  assert.equal(isA11yApplicable('frontend', 'no-such-skill'), true);
  assert.equal(isA11yApplicable('content', 'no-such-skill'), true);
  assert.equal(isA11yApplicable('backend', 'no-such-skill'), false);
  assert.equal(isA11yApplicable('database', 'no-such-skill'), false);
});

// --- disclosureBonus -------------------------------------------------

test('disclosureBonus is 0 for a skill with no disclosure folders', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-bonus-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  assert.deepEqual(disclosureBonus(dir), { bonus: 0, folders: [] });
});

test('disclosureBonus is 0 for empty folders and counts non-empty ones', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-bonus-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'references'), { recursive: true });
  assert.deepEqual(disclosureBonus(dir), { bonus: 0, folders: [] });
  await writeFile(path.join(dir, 'references', 'guide.md'), '# Guide\n');
  assert.deepEqual(disclosureBonus(dir), { bonus: 10, folders: ['references'] });
  await mkdir(path.join(dir, 'scripts'), { recursive: true });
  await writeFile(path.join(dir, 'scripts', 'run.mjs'), '// helper\n');
  await mkdir(path.join(dir, 'examples'), { recursive: true });
  await writeFile(path.join(dir, 'examples', 'demo.md'), '# Demo\n');
  assert.deepEqual(disclosureBonus(dir), {
    bonus: 20,
    folders: ['references', 'scripts', 'examples'],
  });
});

test('disclosureBonus counts assets and examples as one shared slot', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-bonus-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'assets'), { recursive: true });
  await writeFile(path.join(dir, 'assets', 'diagram.svg'), '<svg/>\n');
  await mkdir(path.join(dir, 'examples'), { recursive: true });
  await writeFile(path.join(dir, 'examples', 'demo.md'), '# Demo\n');
  assert.deepEqual(disclosureBonus(dir), { bonus: 5, folders: ['assets', 'examples'] });
});

// --- End-to-end: versioning flag -------------------------------------

test('scorer clears the versioning flag for a skill with N.x versions', async (t) => {
  const out = await scoreTree(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      prereq: 'Requires ESLint 10.x and Node.js 24.',
    }),
  });
  const r = byPath(out, 'fixture-skill');
  assert.equal(r.dimensions.versioning, 100);
  assert.ok(!r.flags.some((f) => f.startsWith('versioning:')));
});

test('scorer flags a skill whose Prerequisites carry no version info', async (t) => {
  const out = await scoreTree(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      prereq: 'Node.js installed (current stable as of the latest release).',
    }),
  });
  const r = byPath(out, 'fixture-skill');
  assert.equal(r.dimensions.versioning, 50);
  assert.ok(r.flags.includes('versioning: no version info in Prerequisites'));
});

// --- End-to-end: maintainability / disclosure bonus ------------------

test('scorer gives a small single-file skill full maintainability', async (t) => {
  const out = await scoreTree(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd(),
  });
  assert.equal(byPath(out, 'fixture-skill').dimensions.maintainability, 100);
});

test('scorer rewards a long disclosed skill and not a long undisclosed one', async (t) => {
  const files = {
    'skills/backend/long-plain/SKILL.md': skillMd({ name: 'long-plain', padLines: 400 }),
    'skills/backend/long-disclosed/SKILL.md': skillMd({ name: 'long-disclosed', padLines: 400 }),
    'skills/backend/long-disclosed/references/guide.md': '# Guide\n',
    'skills/backend/long-full/SKILL.md': skillMd({ name: 'long-full', padLines: 400 }),
    'skills/backend/long-full/references/guide.md': '# Guide\n',
    'skills/backend/long-full/scripts/run.mjs': '// helper\n',
    'skills/backend/long-full/examples/demo.md': '# Demo\n',
  };
  const out = await scoreTree(t, files);
  const plain = byPath(out, 'long-plain').dimensions.maintainability;
  const disclosed = byPath(out, 'long-disclosed').dimensions.maintainability;
  const full = byPath(out, 'long-full').dimensions.maintainability;
  assert.ok(plain < 100, `long undisclosed skill should lose points, got ${plain}`);
  assert.equal(disclosed - plain, 10, 'references/ is worth +10');
  assert.equal(full - plain, 20, 'all folders cap at +20');
});

// --- End-to-end: accessibility flag follows the classification ------

test('scorer honors a not-applicable classification over the category rule', async (t) => {
  // A content-category fixture with no accessibility content would be
  // flagged by the category rule alone; the classification file in the
  // fixture tree marks it not-applicable, so no flag and no -10.
  const classification = JSON.stringify({
    skills: {
      'content/fixture-na': { applicability: 'not-applicable', reason: 'Fixture.', guidance: 'none' },
      'content/fixture-yes': { applicability: 'applicable', reason: 'Fixture.', guidance: 'basic' },
    },
  });
  const out = await scoreTree(t, {
    'sources/accessibility-classification.json': classification,
    'skills/content/fixture-na/SKILL.md': skillMd({ name: 'fixture-na', category: 'content' }),
    'skills/content/fixture-yes/SKILL.md': skillMd({ name: 'fixture-yes', category: 'content' }),
  });
  const na = byRelPath(out, 'skills/content/fixture-na/SKILL.md');
  const yes = byRelPath(out, 'skills/content/fixture-yes/SKILL.md');
  assert.ok(!na.flags.some((f) => f.startsWith('accessibility:')), `N/A skill must not be flagged: ${na.flags}`);
  assert.ok(yes.flags.includes('accessibility: no accessibility content (applicable category)'));
  assert.ok(na.dimensions.completeness > yes.dimensions.completeness, 'N/A skill keeps its completeness points');
});

test('scorer falls back to the category rule without a classification file', async (t) => {
  // No sources/ file in the fixture tree (as on historical worktrees):
  // a content skill with no accessibility content is flagged.
  const out = await scoreTree(t, {
    'skills/content/fixture-old/SKILL.md': skillMd({ name: 'fixture-old', category: 'content' }),
  });
  const r = byRelPath(out, 'skills/content/fixture-old/SKILL.md');
  assert.ok(r.flags.includes('accessibility: no accessibility content (applicable category)'));
});
