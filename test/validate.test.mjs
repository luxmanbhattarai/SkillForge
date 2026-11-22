// validate.test.mjs — tests for scripts/validate-skills.mjs,
// focused on the strict-mode contract: --strict fails on warnings
// on original skills, never on upstream warnings (upstream files
// are never edited, so upstream warnings are informational by
// policy — see ai/decisions/2026-11-20-validate-strict-upstream-warnings.md).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { appendFile, cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
import { findRegistryMismatches } from '../scripts/validate-skills.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const VALIDATOR = path.join(REPO_ROOT, 'scripts', 'validate-skills.mjs');

function runValidator(script, args = []) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function copyRepo() {
  const dest = await mkdtemp(path.join(os.tmpdir(), 'skillforge-validate-test-'));
  await cp(REPO_ROOT, dest, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git`),
  });
  return dest;
}

test('frontmatter parser: plain scalars must not contain ": " (strict YAML)', () => {
  // Unquoted ': ' is a nested mapping in strict YAML; spec-compliant
  // tools reject the whole frontmatter (graphql was invisible to
  // `npx skills add --list` for this reason).
  const bad = parseFrontmatter('name: x\ncompatibility: Needs A: B.\n');
  assert.ok(bad.error);
  assert.match(bad.error, /contains ': '|quote the value/);
  const badNested = parseFrontmatter('name: x\nmetadata:\n  source: a: b\n');
  assert.ok(badNested.error);
  // Quoted values with ': ' are fine; block scalars are literal.
  const good = parseFrontmatter('name: x\ncompatibility: "Needs A: B."\n');
  assert.equal(good.error, undefined);
  assert.equal(good.data.compatibility, 'Needs A: B.');
  const block = parseFrontmatter('name: x\ndescription: >\n  Has a colon: inside.\n');
  assert.equal(block.error, undefined);
  assert.match(block.data.description, /colon: inside/);
  // A colon not followed by a space is fine in a plain scalar.
  const url = parseFrontmatter('name: x\ncompatibility: See https://example.com/docs.\n');
  assert.equal(url.error, undefined);
});

test('registry consistency: Windows backslash disk paths match POSIX registry paths', () => {
  // PR #1: on Windows, path.relative returns backslashes while the
  // registry stores forward slashes, so the un-normalized comparison
  // reported all 277 skills missing. path.win32 builds Windows-shaped
  // paths on any platform, so this test reproduces the bug on POSIX.
  const reg = ['skills/frontend/astro', 'skills/upstream/vercel/deploy-to-vercel'];
  const diskWin = reg.map((p) => path.win32.join(...p.split('/')));
  assert.deepEqual(diskWin, ['skills\\frontend\\astro', 'skills\\upstream\\vercel\\deploy-to-vercel']);
  assert.deepEqual(findRegistryMismatches(reg, diskWin), []);
  // Genuine mismatches must still error in both directions.
  assert.deepEqual(
    findRegistryMismatches([...reg, 'skills/core/missing'], diskWin),
    ['registry lists missing skill: skills/core/missing'],
  );
  assert.deepEqual(
    findRegistryMismatches(reg, [...diskWin, path.win32.join('skills', 'core', 'orphan')]),
    ['skill on disk missing from registry: skills/core/orphan'],
  );
});

test('validate passes on the real repo; every warning is upstream-only', async () => {
  const r = await runValidator(VALIDATOR);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Checked 277 skills \(228 original, 49 upstream\)\./);
  const warnLines = r.stdout.split('\n').filter((l) => l.includes('WARN'));
  assert.ok(warnLines.length > 0, 'expected at least one warning line');
  for (const line of warnLines) {
    assert.match(line, /WARN \(upstream\)/, `non-upstream warning found: ${line}`);
  }
});

test('validate --strict passes when all warnings are upstream-only', async () => {
  const r = await runValidator(VALIDATOR, ['--strict']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  // 5 upstream warnings remain (L-01 fixed the ai-seo off-by-one:
  // it is exactly 500 lines, not 501; the fifth is the genuine
  // dangling disclosure pointer in prisma-postgres-upgrade, which
  // references a references/deploy-existing-app.md that was never
  // imported — upstream files are never edited, so it warns).
  assert.match(r.stdout, /PASS with 5 warning\(s\) \(5 upstream, informational\)\./);
});

test('validate --strict fails on a warning on an original skill', async () => {
  const root = await copyRepo();
  try {
    // Pad an original SKILL.md past the 500-line recommended max.
    // Blank lines change no other check: no headings, no
    // placeholders, no links. The padding is computed from the
    // file, not hardcoded: a hardcoded 200 broke when the
    // progressive-disclosure migration shrank nextjs from 330 to
    // 296 lines (the padded total became 496, under the threshold).
    const skillPath = path.join(root, 'skills', 'frontend', 'nextjs', 'SKILL.md');
    const before = await readFile(skillPath, 'utf8');
    const baseLines = before.split('\n').length - (before.endsWith('\n') ? 1 : 0);
    const pad = Math.max(10, 501 - baseLines + 10); // 10 lines past the threshold
    await appendFile(skillPath, '\n'.repeat(pad));
    const copiedValidator = path.join(root, 'scripts', 'validate-skills.mjs');
    const strict = await runValidator(copiedValidator, ['--strict']);
    assert.equal(strict.code, 1, strict.stdout);
    assert.match(strict.stdout, /FAIL: 0 error\(s\), 6 warning\(s\)\./);
    // The validator prints platform-native paths (backslashes on
    // Windows); normalize before matching the POSIX form.
    assert.match(
      strict.stdout.replace(/\\/g, '/'),
      new RegExp(`WARN  skills/frontend/nextjs/SKILL\\.md: SKILL\\.md is ${baseLines + pad} lines`),
    );
    // Non-strict mode still passes: a warning is not an error.
    const plain = await runValidator(copiedValidator);
    assert.equal(plain.code, 0, plain.stdout);
    assert.match(plain.stdout, /PASS with 6 warning\(s\) \(5 upstream, informational\)\./);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
