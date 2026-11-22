// validator-rules.test.mjs — tests for the validator rules added by
// the production-hardening mission: hardcoded "as of YYYY-MM-DD"
// version dates (Finding 4) and progressive-disclosure structure
// (Finding 1).
//
// Pure helpers are unit-tested directly. End-to-end behavior is
// tested by copying the validator plus scripts/lib/ into a temp
// tree (the makeScriptTree pattern from audit-fixes-c3.test.mjs —
// the validator derives its root from its own path, so it scores
// the fixture tree instead of the real library).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISCLOSURE_DIRS,
  extractDisclosureMentions,
  findHardcodedAsOfDates,
} from '../scripts/validate-skills.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], (err, stdout, stderr) => {
      if (err && typeof err.code !== 'number') return reject(err);
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

async function makeValidatorTree(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-validator-rules-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await cp(path.join(REPO, 'scripts', 'validate-skills.mjs'), path.join(root, 'scripts', 'validate-skills.mjs'));
  await cp(path.join(REPO, 'scripts', 'lib'), path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

async function runValidator(t, files, args = []) {
  const root = await makeValidatorTree(t, files);
  return runNode(path.join(root, 'scripts', 'validate-skills.mjs'), args);
}

// --- A minimal VALID original skill (all 15 sections, 2000+ chars) --------
const SECTIONS = [
  'Purpose', 'When to Use', 'When Not to Use', 'Prerequisites',
  'Official Documentation', 'Required Workflow', 'Implementation Standards',
  'Best Practices', 'Security Considerations', 'Performance Considerations',
  'Common Mistakes', 'Examples', 'Validation Checklist',
  'Expected Deliverables', 'References',
];

function skillMd({ name = 'fixture-skill', prereq = '', extra = '', padLines = 0 } = {}) {
  const filler = 'Guidance text that makes the body long enough to clear the '
    + 'suspiciously-short check. '.repeat(4);
  let body = '';
  for (const s of SECTIONS) {
    const content = s === 'Prerequisites' && prereq ? prereq : `${filler}\n${filler}`;
    body += `## ${s}\n\n${content}\n\n`;
  }
  if (extra) body += `${extra}\n`;
  if (padLines > 0) body += '\n'.repeat(padLines);
  return `---\nname: ${name}\ndescription: A fixture skill for validator-rule tests with a description long enough to be valid.\nlicense: MIT\nmetadata:\n  version: "1.0.0"\n  category: backend\n  maintainer: skills-library\n  source: original\n  last_verified: "2026-11-20"\n---\n\n# Fixture Skill\n\n${body}`;
}

// --- findHardcodedAsOfDates -------------------------------------------------

test('findHardcodedAsOfDates finds a single-line hardcoded date with its line', () => {
  const body = 'Intro.\n\nCurrent stable as of 2026-11-20 — see the docs.\n';
  assert.deepEqual(findHardcodedAsOfDates(body), [{ line: 3, date: '2026-11-20' }]);
});

test('findHardcodedAsOfDates catches a phrase wrapped across lines', () => {
  // Prose wrapping splits "as" and "of" across lines (16 of the 110
  // occurrences in the library are wrapped); a single-line grep
  // misses them, so the regex allows whitespace between the words.
  const body = 'The newest LTS line as\n  of 2026-11-20; older lines remain.\n';
  assert.deepEqual(findHardcodedAsOfDates(body), [{ line: 2, date: '2026-11-20' }]);
});

test('findHardcodedAsOfDates finds several dates and other years', () => {
  const body = 'A as of 2026-10-28.\nB as of 2026-11-13.\nC as of 2025-01-01.\n';
  assert.deepEqual(findHardcodedAsOfDates(body), [
    { line: 1, date: '2026-10-28' },
    { line: 2, date: '2026-11-13' },
    { line: 3, date: '2025-01-01' },
  ]);
});

test('findHardcodedAsOfDates ignores dateless "as of" and applies the line offset', () => {
  const body = 'Current stable as of the latest release.\nAs of now, this works.\n';
  assert.deepEqual(findHardcodedAsOfDates(body), []);
  assert.deepEqual(
    findHardcodedAsOfDates('x as of 2026-11-20.\n', 18),
    [{ line: 19, date: '2026-11-20' }],
  );
});

// --- extractDisclosureMentions -----------------------------------------------

test('extractDisclosureMentions finds prose and backticked path mentions', () => {
  const body = [
    'See references/guide.md for the full detail.',
    'Run the helper at `scripts/migrate.mjs` when ready.',
    'The template lives in assets/template.yaml.',
  ].join('\n');
  assert.deepEqual(extractDisclosureMentions(body), [
    { target: 'references/guide.md', line: 1 },
    { target: 'scripts/migrate.mjs', line: 2 },
    { target: 'assets/template.yaml', line: 3 },
  ]);
});

test('extractDisclosureMentions ignores URLs and fenced code blocks', () => {
  const body = [
    'Fetch https://example.com/assets/app.js for the bundle.',
    '```js',
    '// scripts/check-boundaries.mjs — example only.',
    '```',
    'But references/real.md here counts.',
  ].join('\n');
  assert.deepEqual(extractDisclosureMentions(body), [
    { target: 'references/real.md', line: 5 },
  ]);
});

test('extractDisclosureMentions strips trailing punctuation', () => {
  const body = 'See references/guide.md, references/other.md; and (scripts/run.sh).';
  assert.deepEqual(extractDisclosureMentions(body), [
    { target: 'references/guide.md', line: 1 },
    { target: 'references/other.md', line: 1 },
    { target: 'scripts/run.sh', line: 1 },
  ]);
});

// --- End-to-end: hardcoded dates (Finding 4) ----------------------------------

test('validator fails a skill body with a hardcoded "as of" date', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      prereq: 'Node.js 24 installed (current stable as of 2026-11-20).',
    }),
  });
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /hardcoded version date "as of 2026-11-20"/);
  assert.match(r.stdout, /FAIL: 1 error/);
});

test('validator passes a skill whose only date is frontmatter last_verified', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      prereq: 'Node.js 24 or 26 installed. Requires Node.js 24+.',
    }),
  });
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /PASS/);
  assert.doesNotMatch(r.stdout, /hardcoded version date/);
});

test('validator ignores a genuine historical date in CHANGELOG.md', async (t) => {
  // CHANGELOG.md is not a skill file: the validator only scans
  // skills/, so a historical "as of" date there is out of scope.
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd(),
    'CHANGELOG.md': '# Changelog\n\n## [1.1.0] - 2026-11-22\n\n- State as of 2026-11-20: 277 skills.\n',
  });
  assert.equal(r.code, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /hardcoded version date/);
});

test('validator fails a wrapped "as of" date with the date line number', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      prereq: 'Node.js 26 installed (newest LTS line as\n  of 2026-11-20; 24 remains in LTS).',
    }),
  });
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /hardcoded version date "as of 2026-11-20" \(line \d+\)/);
});

// --- End-to-end: progressive disclosure (Finding 1) ---------------------------

test('validator passes a disclosed skill whose references are linked', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      extra: 'Deep detail lives in [the guide](./references/guide.md).',
    }),
    'skills/backend/fixture-skill/references/guide.md': '# Guide\n\nDetail.\n',
    'skills/backend/fixture-skill/scripts/run.mjs': '// helper\n',
  });
  // The scripts/run.mjs file is NOT referenced, so it warns as
  // orphaned — but warnings do not fail a non-strict run.
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /disclosure file 'scripts\/run\.mjs' is not referenced/);
  assert.doesNotMatch(r.stdout, /disclosure file 'references\/guide\.md'/);
});

test('validator warns on an orphaned disclosure file but does not fail', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd(),
    'skills/backend/fixture-skill/references/forgotten.md': '# Forgotten\n',
  });
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /disclosure file 'references\/forgotten\.md' is not linked from SKILL\.md/);
});

test('validator counts transitive links: a file linked from a linked file is not orphaned', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      extra: 'Start with [the guide](./references/guide.md).',
    }),
    'skills/backend/fixture-skill/references/guide.md': '# Guide\n\nSee [deep](./deep.md).\n',
    'skills/backend/fixture-skill/references/deep.md': '# Deep\n',
  });
  assert.equal(r.code, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /disclosure file/);
});

test('validator fails a dangling mention into an existing disclosure folder', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      extra: 'See references/missing.md for the detail.',
    }),
    'skills/backend/fixture-skill/references/guide.md': '# Guide\n',
  });
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /dangling disclosure pointer.*references\/missing\.md does not exist/);
});

test('validator ignores a scripts/ mention when the skill has no scripts/ folder', async (t) => {
  // Without the folder the mention is illustrative ("invoke bundled
  // scripts via `bash scripts/tool.sh`"), not a pointer into the
  // skill's own layout — flagging it would be a false positive.
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({
      extra: 'Invoke bundled scripts through their interpreter (`bash scripts/tool.sh`).',
    }),
  });
  assert.equal(r.code, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /dangling disclosure pointer/);
});

test('validator does not fail an unmigrated single-file skill', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd(),
  });
  assert.equal(r.code, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /disclosure/);
});

test('validator warns (does not fail) a >500-line skill without disclosure folders', async (t) => {
  const r = await runValidator(t, {
    'skills/backend/fixture-skill/SKILL.md': skillMd({ padLines: 600 }),
  });
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /recommended max 500/);
  assert.match(r.stdout, /consider progressive disclosure/);
});

test('DISCLOSURE_DIRS lists exactly the four standard folders', () => {
  assert.deepEqual(DISCLOSURE_DIRS, ['references', 'scripts', 'assets', 'examples']);
});
