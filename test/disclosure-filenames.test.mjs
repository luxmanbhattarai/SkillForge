// disclosure-filenames.test.mjs — regression test for the
// fastify inject-test.ts incident (Finding 1 integration,
// 2026-11-22): `npm test` is bare `node --test`, and Node 24's
// test runner discovers `*-test.*`, `*.test.*`, and `test-*.*`
// files anywhere in the tree (verified by probe on Node
// v24.22.1: foo-test.{js,mjs,ts}, foo.test.ts, test-foo.ts are
// all discovered). The disclosure migration created
// skills/backend/fastify/examples/inject-test.ts — a real test
// file importing ./app.js, which does not exist as a runnable
// module — and the full suite failed on it. Disclosure files
// must never use a name the runner would discover.
//
// Scope: the four disclosure folders of original skills
// (references/, scripts/, assets/, examples/). Upstream skills
// are excluded: they are imported verbatim and never edited, so
// a test-named file there would be an import problem, not a
// naming violation — and none exists today.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const DISCLOSURE_FOLDERS = new Set(['references', 'scripts', 'assets', 'examples']);
// Extensions the Node test runner executes (Node 24: JS + TS
// via type stripping). A .rs or .md file named *-test is harmless.
const RUNNABLE_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']);

// Basenames the runner discovers: *-test.<ext>, *.test.<ext>,
// test-*.<ext>. (Verified by probe; see the header comment.)
function isTestDiscoverable(basename) {
  const ext = path.extname(basename);
  if (!RUNNABLE_EXT.has(ext)) return false;
  const stem = basename.slice(0, -ext.length);
  return stem.endsWith('-test') || stem.endsWith('.test') || stem.startsWith('test-');
}

async function walkDisclosureFiles(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDisclosureFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

test('no disclosure file uses a name the Node test runner would discover', async () => {
  const offenders = [];
  const categories = await readdir(SKILLS_DIR, { withFileTypes: true });
  for (const category of categories) {
    if (!category.isDirectory() || category.name === 'upstream') continue;
    const catDir = path.join(SKILLS_DIR, category.name);
    const skills = await readdir(catDir, { withFileTypes: true });
    for (const skill of skills) {
      if (!skill.isDirectory()) continue;
      const skillDir = path.join(catDir, skill.name);
      const entries = await readdir(skillDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !DISCLOSURE_FOLDERS.has(entry.name)) continue;
        const files = [];
        await walkDisclosureFiles(path.join(skillDir, entry.name), files);
        for (const file of files) {
          if (isTestDiscoverable(path.basename(file))) {
            offenders.push(path.relative(REPO_ROOT, file));
          }
        }
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `disclosure files matching Node test discovery (rename them; see docs/PROGRESSIVE-DISCLOSURE.md): ${offenders.join(', ')}`,
  );
});

test('isTestDiscoverable matches the probed runner patterns', () => {
  // Positive: every form the probe showed the runner discovering.
  assert.equal(isTestDiscoverable('inject-test.ts'), true);
  assert.equal(isTestDiscoverable('foo.test.ts'), true);
  assert.equal(isTestDiscoverable('test-foo.ts'), true);
  assert.equal(isTestDiscoverable('foo-test.js'), true);
  assert.equal(isTestDiscoverable('foo-test.mjs'), true);
  // Negative: near-misses the probe showed are NOT discovered,
  // and non-runnable extensions never are.
  assert.equal(isTestDiscoverable('footest.ts'), false);
  assert.equal(isTestDiscoverable('inject-example.ts'), false);
  assert.equal(isTestDiscoverable('unit-and-doc-test.rs'), false);
  assert.equal(isTestDiscoverable('test-notes.md'), false);
});
