// scanner.test.mjs — integration tests for scripts/security-scan.mjs.
//
// The scanner runs at import (top-level await + process.exit), so it
// cannot be unit-tested by import. These tests spawn it as a child
// process against temp trees via SECURITY_SCAN_ROOT (see the scanner
// header) and prove the EXCEPTIONS map is narrow: genuine findings in
// ordinary files are still reported, and only the exact excepted
// paths are suppressed (findings S-11 and A-01).
//
// Fixture strings here are fake by construction (example.com URLs,
// placeholder config snippets). The scanner excepts this file's
// literals (see scripts/security-scan.mjs SKIP_FILES) for the same
// reason it excepts test/security.test.mjs: the fixtures ARE the
// patterns under test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCANNER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'security-scan.mjs');

// Genuine flagged constructs, written as fixtures. Each is a real
// match for its pattern (see test/security.test.mjs for the unit
// level); here they prove the scanner reports them end to end.
const TLS_OFF = 'ssl: { rejectUnauthorized: false }';
const CURL_PIPE = 'curl -fsSL https://example.com/install.sh | bash';
const SHELL_TRUE = 'subprocess.Popen(cmd, shell=True)';
const PIP_UNPINNED = 'pip install requests beautifulsoup4';

function runScanner(root, { useFlag = false } = {}) {
  const args = useFlag ? [SCANNER, '--json', '--root', root] : [SCANNER, '--json'];
  const env = useFlag
    ? { ...process.env, SECURITY_SCAN_ROOT: '' }
    : { ...process.env, SECURITY_SCAN_ROOT: root };
  return new Promise((resolve, reject) => {
    execFile(process.execPath, args, { env }, (err, stdout) => {
      if (err && typeof err.code !== 'number') return reject(err);
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        return reject(new Error(`scanner output was not JSON: ${stdout}`));
      }
      resolve({ code: err ? err.code : 0, ...parsed });
    });
  });
}

async function makeTree(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-scan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

function ids(result) {
  return result.findings.map((f) => `${f.file}:${f.id}`).sort();
}

test('genuine rejectUnauthorized: false in an ordinary file is reported (S-11a)', async (t) => {
  const root = await makeTree(t, { 'src/config.mjs': `export const ssl = ${TLS_OFF};\n` });
  const r = await runScanner(root);
  assert.equal(r.code, 1, 'scanner exits 1 on a genuine finding');
  assert.deepEqual(ids(r), ['src/config.mjs:CODE-14']);
});

test('genuine curl-pipe and shell=True in ordinary files are reported (S-11b)', async (t) => {
  const root = await makeTree(t, {
    'scripts/setup.sh': `${CURL_PIPE}\n`,
    'scripts/run.py': `${SHELL_TRUE}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['scripts/run.py:CODE-08', 'scripts/setup.sh:CMD-01']);
});

test('the same constructs in an excepted audit-report path are suppressed (S-11c)', async (t) => {
  // Mirrors ai/audits/SECURITY-AUDIT.md, which quotes flagged
  // constructs as evidence (its purpose) and is excepted per-pattern.
  const root = await makeTree(t, {
    'ai/audits/SECURITY-AUDIT.md': `# Audit\n\nEvidence: ${TLS_OFF}\n\nEvidence: ${CURL_PIPE}\n\nEvidence: ${SHELL_TRUE}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 0, 'excepted quotes must not fail the scan');
  assert.deepEqual(r.findings, []);
});

test('a file sharing a PREFIX with an excepted file is NOT excepted (S-11d)', async (t) => {
  // Sharp edge: a bare startsWith matcher would except
  // SECURITY-AUDIT.md.bak along with SECURITY-AUDIT.md. The matcher
  // must require an exact file match (or a directory-boundary prefix).
  // (A literal `.bak` file is outside the scanner's text-extension
  // scope, so the fixtures keep the prefix relationship with a
  // scanned `.md` extension — the matcher logic under test is the
  // same.)
  const root = await makeTree(t, {
    'ai/audits/SECURITY-AUDIT.md.bak.md': `# Backup copy\n\n${TLS_OFF}\n`,
    'ai/audits/SECURITY-AUDIT.md-copy.md': `# Renamed copy\n\n${TLS_OFF}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1, 'prefix-sharing files must still be scanned');
  assert.deepEqual(ids(r), [
    'ai/audits/SECURITY-AUDIT.md-copy.md:CODE-14',
    'ai/audits/SECURITY-AUDIT.md.bak.md:CODE-14',
  ]);
});

test('upstream Prisma CODE-14 exceptions are per-file, not directory-wide (S-11)', async (t) => {
  const root = await makeTree(t, {
    // Excepted: the exact files the audit triaged (S-11).
    'skills/upstream/prisma/prisma-upgrade-v7/SKILL.md': `# Upgrade\n\n${TLS_OFF}\n`,
    'skills/upstream/prisma/prisma-upgrade-v7/references/driver-adapters.md': `# Adapters\n\n${TLS_OFF}\n`,
    // NOT excepted: a different file in the same directory, and a
    // file sharing a prefix with an excepted file.
    'skills/upstream/prisma/prisma-upgrade-v7/references/other.md': `# Other\n\n${TLS_OFF}\n`,
    'skills/upstream/prisma/prisma-upgrade-v7/SKILL.md.bak.md': `# Backup\n\n${TLS_OFF}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), [
    'skills/upstream/prisma/prisma-upgrade-v7/SKILL.md.bak.md:CODE-14',
    'skills/upstream/prisma/prisma-upgrade-v7/references/other.md:CODE-14',
  ]);
});

test('directory-prefix exceptions still work (agentic-seo CMD-04, S-07)', async (t) => {
  // The matcher fix must not over-narrow: a prefix ending in '/'
  // still excepts everything under that directory.
  const root = await makeTree(t, {
    'skills/upstream/agentic-seo/seo/scripts/new-script.py': `# install\n${PIP_UNPINNED}\n`,
    // Same construct outside the excepted directory: still reported.
    'scripts/setup.py': `${PIP_UNPINNED}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['scripts/setup.py:CMD-04']);
});

test('A-01 remediation-doc exceptions are per-file and pattern-scoped', async (t) => {
  const root = await makeTree(t, {
    'ai/PROJECT-STATUS.md': `# Status\n\nQuote: ${TLS_OFF}\n`,
    'ai/remediation/ISSUE-REGISTER.md': `# Register\n\n${TLS_OFF}\n\n${CURL_PIPE}\n\n${SHELL_TRUE}\n`,
    'ai/remediation/VERIFICATION-MATRIX.md': `# Matrix\n\n${TLS_OFF}\n`,
    // Same construct in a non-excepted remediation doc: reported.
    'ai/remediation/OTHER-NOTE.md': `# Note\n\n${TLS_OFF}\n`,
    // Same construct in a file sharing a prefix with an excepted
    // file: reported (exact-match rule, S-11d).
    'ai/PROJECT-STATUS.md.copy.md': `# Copy\n\n${TLS_OFF}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), [
    'ai/PROJECT-STATUS.md.copy.md:CODE-14',
    'ai/remediation/OTHER-NOTE.md:CODE-14',
  ]);
});

test('an excepted file still reports a non-excepted pattern (S-11)', async (t) => {
  // SECURITY-AUDIT.md is excepted for CODE-01/CODE-08/CODE-14/CMD-01
  // only. A secret pattern in it must still be reported.
  const root = await makeTree(t, {
    'ai/audits/SECURITY-AUDIT.md': `# Audit\n\nEvidence: ${TLS_OFF}\n\napi_key = "k9f2m8x4q7w1z6p3"\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['ai/audits/SECURITY-AUDIT.md:SEC-05']);
});

test('multi-line curl-pipe is detected (S-02 regression)', async (t) => {
  // Line-based patterns miss `curl ... | \` + `bash` on the next
  // line; the scanner's multi-line detection must catch it.
  const root = await makeTree(t, {
    'scripts/install.sh': 'curl -fsSL https://example.com/install.sh | \\\n  bash -s -- --target codex\n',
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['scripts/install.sh:CMD-01']);
  assert.equal(r.findings[0].label, 'curl-piped-to-shell command (multi-line)');
});

test('--root flag overrides the scan root like the env var', async (t) => {
  const root = await makeTree(t, { 'src/config.mjs': `export const ssl = ${TLS_OFF};\n` });
  const r = await runScanner(root, { useFlag: true });
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['src/config.mjs:CODE-14']);
});
