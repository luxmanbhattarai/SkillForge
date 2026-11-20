// code.mjs — scores code-generation cases.
//
// Two levels, both honest about their limits:
//   1. Syntax: every extracted JavaScript block must compile, checked
//      with `node --check` on a temp .mjs file (handles ESM import
//      syntax; no execution). TypeScript blocks CANNOT be compile
//      checked this way — `node --check` does not type-strip, even on
//      Node 24 — so TS blocks get a structural check (balanced
//      delimiters) plus static API-string checks only, and the report
//      states TS compilation is unverified. Never reported as passed.
//   2. Fixtures: when a case names a fixture (evals/fixtures/<name>),
//      the fixture's pure-function code runs against its assertions.
//      This proves the example behaves as claimed — for the fixture's
//      assertions only, not in general.
//
// Code the scorer cannot compile or execute is reported as skipped,
// never as passed.

import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES_DIR = path.join(ROOT, 'evals', 'fixtures');

async function jsCompiles(code) {
  const dir = await mkdtemp(path.join(tmpdir(), 'skillforge-eval-'));
  try {
    const file = path.join(dir, 'snippet.mjs');
    await writeFile(file, code, 'utf8');
    const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 15000 });
    if (res.status === 0) return { ok: true };
    const out = ((res.stderr || '') + (res.stdout || '')).trim().split('\n').find((l) => l.includes('Error')) || 'unknown error';
    return { ok: false, error: out };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Structural check for TypeScript blocks (compile check unavailable —
// see header). Balanced delimiters, ignoring strings/comments loosely:
// good enough to catch truncation, not a syntax proof.
function tsStructure(code) {
  const stripped = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (const ch of stripped) {
    if (pairs[ch]) stack.push(ch);
    else if (Object.values(pairs).includes(ch)) {
      if (pairs[stack.pop()] !== ch) return { ok: false, error: `unbalanced delimiter: unexpected "${ch}"` };
    }
  }
  if (stack.length > 0) return { ok: false, error: `unbalanced delimiter: unclosed "${stack[stack.length - 1]}"` };
  return { ok: true };
}

async function runFixture(fixtureName) {
  const file = path.join(FIXTURES_DIR, fixtureName + '.mjs');
  let mod;
  try {
    mod = await import(file + '?t=' + Date.now());
  } catch (e) {
    return [{ name: `fixture: ${fixtureName}`, pass: false, detail: `fixture failed to load: ${e.message}` }];
  }
  const checks = [];
  const cases = mod.tests || [];
  if (typeof mod.run !== 'function' || cases.length === 0) {
    return [{ name: `fixture: ${fixtureName}`, pass: false, detail: 'fixture has no run() export or no tests' }];
  }
  for (const [i, t] of cases.entries()) {
    let actual;
    let error = null;
    try {
      actual = mod.run(t.input);
    } catch (e) {
      error = e.message;
    }
    const pass = error === null && JSON.stringify(actual) === JSON.stringify(t.expected);
    checks.push({
      name: `fixture: ${fixtureName}#${i + 1}`,
      pass,
      detail: pass
        ? `run(${JSON.stringify(t.input)}) === ${JSON.stringify(t.expected)}`
        : error
          ? `run(${JSON.stringify(t.input)}) threw: ${error}`
          : `run(${JSON.stringify(t.input)}) === ${JSON.stringify(actual)}, expected ${JSON.stringify(t.expected)}`,
    });
  }
  return checks;
}

export async function scoreCode(evalCase, observation) {
  const expected = evalCase.expected || {};
  const checks = [];
  const language = expected.codeLanguage || 'js';
  const blocks = observation.code || [];

  if (!expected.fixture && blocks.length === 0) {
    checks.push({
      name: 'code-present',
      pass: false,
      detail: `no ${language} code block found in the skill's Examples section`,
    });
    return checks;
  }

  for (const [i, code] of blocks.entries()) {
    if (language === 'ts') {
      const res = tsStructure(code);
      checks.push({
        name: `code-block-${i + 1}-structure`,
        pass: res.ok,
        detail: res.ok
          ? 'TypeScript block is structurally balanced (compile check unavailable: node --check does not type-strip)'
          : `TypeScript block is malformed: ${res.error}`,
      });
    } else {
      const res = await jsCompiles(code);
      checks.push({
        name: `code-block-${i + 1}-compiles`,
        pass: res.ok,
        detail: res.ok ? 'JavaScript block compiles (node --check)' : `JavaScript block does not compile: ${res.error}`,
      });
    }
    // Static API checks on the extracted code (when the case names them).
    for (const needle of expected.codeMustInclude || []) {
      checks.push({
        name: `code-must-include: ${needle}`,
        pass: code.includes(needle),
        detail: code.includes(needle)
          ? `code contains "${needle}"`
          : `code does not contain "${needle}"`,
      });
    }
    for (const needle of expected.codeMustExclude || []) {
      checks.push({
        name: `code-must-exclude: ${needle}`,
        pass: !code.includes(needle),
        detail: !code.includes(needle)
          ? `code avoids "${needle}"`
          : `code contains forbidden "${needle}"`,
      });
    }
  }

  if (expected.fixture) {
    checks.push(...await runFixture(expected.fixture));
  }

  return checks;
}
