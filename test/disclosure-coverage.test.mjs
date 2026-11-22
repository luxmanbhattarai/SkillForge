// disclosure-coverage.test.mjs — tests for scripts/disclosure-coverage.mjs
// (Finding 1): status taxonomy, line counting, folder detection,
// and the JSON summary over a fixture tree.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISCLOSURE_DIRS,
  LINE_BUDGET,
  countLines,
  disclosureStatus,
} from '../scripts/disclosure-coverage.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], (err, stdout, stderr) => {
      if (err && typeof err.code !== 'number') return reject(err);
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

async function makeCoverageTree(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-disclosure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await cp(path.join(REPO, 'scripts', 'disclosure-coverage.mjs'), path.join(root, 'scripts', 'disclosure-coverage.mjs'));
  await cp(path.join(REPO, 'scripts', 'lib'), path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

function skillMd(lines) {
  const fm = '---\nname: fixture\ndescription: Fixture skill.\n---\n\n';
  const body = Array.from({ length: lines }, (_, i) => `Line ${i + 1} of the body.`).join('\n') + '\n';
  return fm + body;
}

// --- Pure helpers ------------------------------------------------------

test('LINE_BUDGET is 300 and DISCLOSURE_DIRS lists the four folders', () => {
  assert.equal(LINE_BUDGET, 300);
  assert.deepEqual(DISCLOSURE_DIRS, ['references', 'scripts', 'assets', 'examples']);
});

test('countLines matches the validator count (trailing newline excluded)', () => {
  assert.equal(countLines('a\nb\nc\n'), 3);
  assert.equal(countLines('a\nb\nc'), 3);
  assert.equal(countLines('a\n\n\n'), 3);
  // An empty string counts as 1 line by this formula (same as the
  // validator's) — moot for real files, which are never empty.
  assert.equal(countLines(''), 1);
});

test('disclosureStatus classifies all four states, boundary at 300', () => {
  assert.equal(disclosureStatus(300, []), 'single-file');
  assert.equal(disclosureStatus(301, []), 'needs-disclosure');
  assert.equal(disclosureStatus(100, []), 'single-file');
  assert.equal(disclosureStatus(300, ['references']), 'disclosed');
  assert.equal(disclosureStatus(301, ['references']), 'disclosed-over-budget');
  assert.equal(disclosureStatus(100, ['scripts', 'examples']), 'disclosed');
});

// --- End to end ----------------------------------------------------------

test('coverage measures a fixture tree: statuses, folders, median, max', async (t) => {
  const root = await makeCoverageTree(t, {
    // 5 lines before the body + 100 body lines = 105 total: single-file.
    'skills/backend/small/SKILL.md': skillMd(100),
    // 5 + 400 = 405 total, no folders: needs-disclosure.
    'skills/backend/long/SKILL.md': skillMd(400),
    // 5 + 200 = 205 total, non-empty references/: disclosed.
    'skills/backend/factored/SKILL.md': skillMd(200),
    'skills/backend/factored/references/guide.md': '# Guide\n',
    // 5 + 350 = 355 total, non-empty scripts/: disclosed-over-budget.
    'skills/backend/long-factored/SKILL.md': skillMd(350),
    'skills/backend/long-factored/scripts/run.mjs': '// helper\n',
    // 5 + 50 = 55 total, EMPTY references/ dir: still single-file.
    'skills/backend/empty-folder/SKILL.md': skillMd(50),
    'skills/backend/empty-folder/references/.gitkeep': '',
    // Upstream skills are excluded from coverage entirely.
    'skills/upstream/vendor/imported/SKILL.md': skillMd(500),
  });
  // Remove the .gitkeep so the folder is genuinely empty: a .gitkeep
  // is a file, and a folder with a file in it is non-empty.
  await rm(path.join(root, 'skills', 'backend', 'empty-folder', 'references', '.gitkeep'));

  const r = await runNode(path.join(root, 'scripts', 'disclosure-coverage.mjs'), ['--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const report = JSON.parse(r.stdout);

  assert.equal(report.summary.total, 5);
  assert.equal(report.summary.medianLines, 205);
  assert.equal(report.summary.maxLines, 405);
  assert.equal(report.summary.minLines, 55);
  assert.equal(report.summary.overBudget, 2);
  assert.equal(report.summary.withFolders, 2);
  assert.deepEqual(report.summary.byFolder, { references: 1, scripts: 1, assets: 0, examples: 0 });
  assert.deepEqual(report.summary.byStatus, {
    'single-file': 2,
    'needs-disclosure': 1,
    disclosed: 1,
    'disclosed-over-budget': 1,
  });

  const byName = Object.fromEntries(report.skills.map((s) => [s.name, s]));
  assert.equal(byName.small.status, 'single-file');
  assert.equal(byName.small.bodyLines, 101); // 100 body lines + the blank line after ---
  assert.equal(byName.long.status, 'needs-disclosure');
  assert.deepEqual(byName.factored.folders, ['references']);
  assert.deepEqual(byName['long-factored'].folders, ['scripts']);
  assert.deepEqual(byName['empty-folder'].folders, []);
  assert.equal(byName['empty-folder'].status, 'single-file');
  assert.ok(!report.skills.some((s) => s.name === 'imported'));
});

test('coverage prints a human-readable summary without --json', async (t) => {
  const root = await makeCoverageTree(t, {
    'skills/backend/small/SKILL.md': skillMd(100),
  });
  const r = await runNode(path.join(root, 'scripts', 'disclosure-coverage.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Progressive-disclosure coverage: 1 original skills/);
  assert.match(r.stdout, /median 105/);
  assert.match(r.stdout, /single-file 1/);
});
