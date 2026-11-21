// validate.test.mjs — tests for scripts/validate-skills.mjs,
// focused on the strict-mode contract: --strict fails on warnings
// on original skills, never on upstream warnings (upstream files
// are never edited, so upstream warnings are informational by
// policy — see ai/decisions/2026-11-20-validate-strict-upstream-warnings.md).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { appendFile, cp, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs';
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
  // 4 upstream warnings remain (L-01 fixed the ai-seo off-by-one:
  // it is exactly 500 lines, not 501).
  assert.match(r.stdout, /PASS with 4 warning\(s\) \(4 upstream, informational\)\./);
});

test('validate --strict fails on a warning on an original skill', async () => {
  const root = await copyRepo();
  try {
    // Pad an original SKILL.md past the 500-line recommended max
    // (nextjs is 314 lines; 200 blank lines take it to ~514).
    // Blank lines change no other check: no headings, no
    // placeholders, no links.
    await appendFile(
      path.join(root, 'skills', 'frontend', 'nextjs', 'SKILL.md'),
      '\n'.repeat(200),
    );
    const copiedValidator = path.join(root, 'scripts', 'validate-skills.mjs');
    const strict = await runValidator(copiedValidator, ['--strict']);
    assert.equal(strict.code, 1, strict.stdout);
    assert.match(strict.stdout, /FAIL: 0 error\(s\), 5 warning\(s\)\./);
    assert.match(strict.stdout, /WARN  skills\/frontend\/nextjs\/SKILL\.md: SKILL\.md is 51\d lines/);
    // Non-strict mode still passes: a warning is not an error.
    const plain = await runValidator(copiedValidator);
    assert.equal(plain.code, 0, plain.stdout);
    assert.match(plain.stdout, /PASS with 5 warning\(s\) \(4 upstream, informational\)\./);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
