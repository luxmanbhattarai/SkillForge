// audit-fixes-c2.test.mjs — regression tests for the Phase C
// workstream C2 fixes (installer + registry + check scripts):
// A2-02, A2-03, A2-05, A2-09, A2-14, A2-17, A2-18, A2-20, A2-21,
// A2-22 (atomic-write retry), A3-01 (audit override), A5-02,
// A5-03, A5-04, A5-10, A5-12. Evals/provider/upstream/link tests
// live in test/audit-fixes-c2-evals.test.mjs.
//
// Every test verifies real behavior (a command's exit code and
// output, a function's return value, a file's bytes) — never file
// existence alone. CLI tests run the real installer in temp
// sandboxes with a fixture library, like test/installer.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import {
  cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { atomicWriteFile } from '../scripts/lib/atomic-write.mjs';
import {
  findSkillFiles, REQUIRED_SECTIONS, PLACEHOLDER_ACRONYM_RE, PLACEHOLDER_PHRASE_RE,
} from '../scripts/lib/skill-files.mjs';
import { listBackups, recoverBackupRecord } from '../scripts/install/backups.mjs';
import { loadLibrary, LibraryError } from '../scripts/install/library.mjs';
import { validateEntry, MAX_ROOT_CLIMB } from '../scripts/install/manifest.mjs';
import { matchesFilter } from '../scripts/validate-skills.mjs';
import { lastVerifiedWarning } from '../scripts/check-sources.mjs';
import {
  REPO_ROOT, exists, makeFixtureLibrary, makeSandbox, runCli,
} from '../test-support/helpers.mjs';

const VALIDATE_REGISTRY = path.join(REPO_ROOT, 'scripts', 'validate-registry.mjs');
const QUERY = path.join(REPO_ROOT, 'scripts', 'query-skills.mjs');

function runNode(script, args = [], { cwd = REPO_ROOT } = {}) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { cwd, timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function copyRepo() {
  const dest = await mkdtemp(path.join(os.tmpdir(), 'skillforge-audit-c2-test-'));
  await cp(REPO_ROOT, dest, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git`),
  });
  return dest;
}

async function mutateJson(file, fn) {
  const doc = JSON.parse(await readFile(file, 'utf8'));
  fn(doc);
  await writeFile(file, JSON.stringify(doc, null, 2) + '\n');
}

// --- A2-02: validate-registry fails cleanly on malformed registries ---

test('A2-02: missing compatibility key is a clean FAIL, not a TypeError crash', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'compatibility.json'), (doc) => {
      delete doc.compatibility;
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /FAIL: \d+ error\(s\)/);
    assert.match(r.stdout, /compatibility/);
    assert.doesNotMatch(r.stdout + r.stderr, /TypeError/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A2-02: missing skills array is a clean FAIL, not a TypeError crash', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'skills.json'), (doc) => {
      delete doc.skills;
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /FAIL: \d+ error\(s\)/);
    assert.doesNotMatch(r.stdout + r.stderr, /TypeError/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A2-02: missing verification statuses map is a clean FAIL, not a TypeError crash', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'sources', 'verification-status.json'), (doc) => {
      delete doc.statuses;
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /FAIL: \d+ error\(s\)/);
    assert.doesNotMatch(r.stdout + r.stderr, /TypeError/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- E-01: the FAIL summary must survive a slow-draining pipe ---
//
// PR #4 run 44942929343: the "missing skills array" test failed on the
// GitHub runner because validate-registry printed 706 errors (~70 KiB)
// and then called process.exit(1) — which discards pending piped stdout.
// The FAIL summary, the last write, was lost (output truncated at the
// 64 KiB pipe buffer). The fix sets process.exitCode and lets the
// process exit naturally, which flushes stdout first. This test pins
// that behavior: stdout stays paused until the child either exits or
// 5 s pass, so a hard exit truncates the summary (fail) while a natural
// exit waits for the drain (pass).
//
// The error list is deliberately inflated (agents.json duplicated 30x,
// ~2 MB of output): with only the 706-error list the parent's single
// pre-pause read drains enough of the 64 KiB pipe buffer for the tail
// to survive even a hard exit, so the test would pass on broken code.

test('E-01: validate-registry FAIL summary survives a slow-draining pipe', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'skills.json'), (doc) => {
      delete doc.skills;
    });
    await mutateJson(path.join(root, 'registry', 'agents.json'), (doc) => {
      const base = doc.agents;
      const inflated = [...base];
      for (let i = 0; i < 30; i++) {
        for (const a of base) inflated.push({ ...a, name: `${a.name}-dup-${i}` });
      }
      doc.agents = inflated;
    });
    const child = spawn(process.execPath, [VALIDATE_REGISTRY, '--root', root], { cwd: REPO_ROOT });
    // Pause stdout: the child fills the 64 KiB pipe buffer and then
    // must wait for the reader. Attach the 'data' listener BEFORE
    // pausing — adding a 'data' handler switches the stream to flowing
    // mode and would undo an earlier pause(). stderr is small; drain
    // it so it can never block the child.
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.stdout.pause();
    let stderr = '';
    child.stderr.on('data', (c) => { stderr += c; });
    const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
    const ended = new Promise((resolve) => child.stdout.on('end', resolve));
    const timedOut = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000));
    const first = await Promise.race([exited, timedOut]);
    // A hard-exit build exits before the timeout with truncated output;
    // a natural-exit build is still alive, blocked on the flush.
    child.stdout.resume();
    const code = first === 'timeout' ? await exited : first;
    await ended;
    const stdout = Buffer.concat(chunks).toString('utf8');
    assert.equal(code, 1, stdout + stderr);
    assert.match(stdout, /FAIL: \d+ error\(s\)/);
    assert.doesNotMatch(stdout + stderr, /TypeError/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- A3-01: post-audit override mechanism ---

test('A3-01: overridden link-building passes the audit cross-check', async () => {
  const root = await copyRepo();
  try {
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /link-building' status is 'verified' but the Phase 3 audit/);
    // The override stays visible: it is reported, never silent.
    assert.match(r.stdout, /post-audit override \(2026-11-21: A3-01/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A3-01: a disagreement WITHOUT an override still errors (no blanket skip)', async () => {
  const root = await copyRepo();
  try {
    // astro's audit row says Verified; re-label it without an
    // override entry and the cross-check must still fail.
    await mutateJson(path.join(root, 'sources', 'verification-status.json'), (doc) => {
      doc.statuses.astro.status = 'unverified';
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /'astro' status is 'unverified' but the Phase 3 audit says 'Verified'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('A3-01: a stale override (sidecar no longer matches it) errors', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'sources', 'verification-status.json'), (doc) => {
      doc.statuses['link-building'].status = 'needs-correction';
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /post-audit override \(2026-11-21\) says 'verified'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- A2-03: per-item fault isolation in install/update planning ---

test('A2-03: install with one missing skill source still installs the rest and reports the failure', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  // Delete one skill's source directory from the library: its
  // planning throws, but the other skill must still install.
  await rm(path.join(fixture.root, 'skills', 'beta', 'fixture-two'), { recursive: true, force: true });
  const r = await runCli(['install', '--dest', 'out'], { home, proj, env });
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /failed: fixture-two/);
  assert.match(r.stdout, /failed 1/);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-two')), false);
});

test('A2-03: a UsageError in planning still exits 2 (invocation error, not a per-item failure)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  // Agent install with --dest but no --target: computePlanned
  // throws UsageError, which must abort the run with exit 2 — the
  // per-item isolation must not swallow it into a planning
  // failure (exit 1). The full-suite run caught this: the
  // isolation originally caught every error, turning this case
  // from exit 2 into exit 1.
  const r = await runCli(['install', '--dest', 'out', '--agent', 'fixture-agent'], { home, proj, env });
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /agent install needs --target/);
  assert.doesNotMatch(r.stdout, /Summary: failed/);
});

test('A2-03: update with one unreadable library source still updates the rest', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const installed = await runCli(['install', '--dest', 'out'], { home, proj, env });
  assert.equal(installed.code, 0, installed.stderr);
  await rm(path.join(fixture.root, 'skills', 'beta', 'fixture-two'), { recursive: true, force: true });
  const r = await runCli(['update', '--dest', 'out'], { home, proj, env });
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /failed: fixture-two/);
  assert.match(r.stdout, /already installed: fixture-one/);
  assert.match(r.stdout, /failed 1/);
});

// --- A5-02: uninstall never silently deletes real content at a link entry ---

test('A5-02: uninstall refuses real content at a link-entry path; --force backs it up first', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  const installed = await runCli(['install', ...dest, '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(installed.code, 0, installed.stderr);
  const linkPath = path.join(proj, 'out', 'fixture-one');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);

  // The user replaces the symlink with their own directory.
  await rm(linkPath);
  await mkdir(linkPath, { recursive: true });
  await writeFile(path.join(linkPath, 'MY-NOTES.md'), 'my own content\n');

  // Non-interactive uninstall without --force must refuse and
  // preserve the content — never silently rm -rf it.
  const refused = await runCli(['uninstall', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(refused.code, 1, refused.stdout + refused.stderr);
  assert.match(refused.stderr, /refused: fixture-one/);
  assert.match(refused.stderr, /recorded as a symlink install but is a real file\/directory/);
  assert.equal(await readFile(path.join(linkPath, 'MY-NOTES.md'), 'utf8'), 'my own content\n');

  // With --force it removes the content — but only after a backup.
  const forced = await runCli(['uninstall', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stdout + forced.stderr);
  assert.match(forced.stdout, /Backup created: (\S+)/);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  assert.equal(await exists(linkPath), false);
  const backedUp = path.join(proj, '.skillforge-backups', backupId, 'items', '0-skill-fixture-one', 'MY-NOTES.md');
  assert.equal(await readFile(backedUp, 'utf8'), 'my own content\n');
});

// --- A2-05: restore --list survives a backup.json without an items array ---

test('A2-05: listBackups reports a parsed record without items as corrupt', async () => {
  const { base } = await makeSandbox();
  const skillsDir = path.join(base, 'skills');
  const badDir = path.join(base, '.skillforge-backups', '2026-11-21-badid');
  await mkdir(badDir, { recursive: true });
  await writeFile(path.join(badDir, 'backup.json'), '{}\n');
  const goodDir = path.join(base, '.skillforge-backups', '2026-11-21-goodid');
  await mkdir(goodDir, { recursive: true });
  await writeFile(path.join(goodDir, 'backup.json'), JSON.stringify({
    id: '2026-11-21-goodid', created: '2026-11-21T00:00:00.000Z', items: [],
  }));
  const backups = await listBackups(skillsDir);
  assert.equal(backups.length, 2);
  const bad = backups.find((b) => b.id === '2026-11-21-badid');
  assert.equal(bad.corrupt, true);
  assert.deepEqual(bad.items, []);
  assert.equal(backups.find((b) => b.id === '2026-11-21-goodid').corrupt, undefined);
});

test('A2-05: restore --list does not crash on a backup.json without items', async () => {
  const { home, proj } = await makeSandbox();
  const badDir = path.join(proj, '.skillforge-backups', '2026-11-21-badid');
  await mkdir(badDir, { recursive: true });
  await writeFile(path.join(badDir, 'backup.json'), '{}\n');
  const r = await runCli(['restore', '--list', '--dest', 'out'], { home, proj });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /2026-11-21-badid\s+\(corrupt backup directory/);
  assert.doesNotMatch(r.stdout + r.stderr, /TypeError/);
});

// --- A2-09: restore --category resolves through the library ---

test('A2-09: restore --category restores only that category', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  assert.equal((await runCli(['install', ...dest], { home, proj, env })).code, 0);
  // Modify both installed skills, then force-reinstall to create a
  // backup holding both (with their original content).
  await writeFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'MODIFIED ONE\n');
  await writeFile(path.join(proj, 'out', 'fixture-two', 'SKILL.md'), 'MODIFIED TWO\n');
  const forced = await runCli(['install', ...dest, '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stderr);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  assert.ok(backupId);
  // Delete the installed copies, then restore only category alpha.
  await rm(path.join(proj, 'out', 'fixture-one'), { recursive: true, force: true });
  await rm(path.join(proj, 'out', 'fixture-two'), { recursive: true, force: true });
  const r = await runCli(['restore', backupId, ...dest, '--category', 'alpha'], { home, proj, env });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /restored fixture-one/);
  assert.equal(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), 'MODIFIED ONE\n');
  assert.equal(await exists(path.join(proj, 'out', 'fixture-two')), false);
});

test('A2-09: restore with an unknown category is a usage error', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  assert.equal((await runCli(['install', ...dest], { home, proj, env })).code, 0);
  await writeFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'MODIFIED\n');
  const forced = await runCli(['install', ...dest, '--force'], { home, proj, env });
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  const r = await runCli(['restore', backupId, ...dest, '--category', 'nope'], { home, proj, env });
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /unknown category 'nope'/);
});

// --- A5-03: recovered backups must name the item itself ---

test('A5-03: recoverBackupRecord skips an agent file that does not match its item name', async () => {
  const { base } = await makeSandbox();
  const skillsDir = path.join(base, 'skills');
  const itemsDir = path.join(base, '.skillforge-backups', 'bad-id', 'items');
  // Crafted layout: the directory says agent 'foo' but the file
  // inside is bar.md — restoring it as foo would overwrite the
  // bar agent's file.
  await mkdir(path.join(itemsDir, '0-agent-foo'), { recursive: true });
  await writeFile(path.join(itemsDir, '0-agent-foo', 'bar.md'), '# Bar\n');
  const recovered = await recoverBackupRecord(skillsDir, 'bad-id');
  assert.equal(recovered, null);
});

test('A5-03: recoverBackupRecord recovers matching .md and .toml agent files', async () => {
  const { base } = await makeSandbox();
  const skillsDir = path.join(base, 'skills');
  const itemsDir = path.join(base, '.skillforge-backups', 'good-id', 'items');
  await mkdir(path.join(itemsDir, '0-agent-foo'), { recursive: true });
  await writeFile(path.join(itemsDir, '0-agent-foo', 'foo.md'), '# Foo\n');
  await mkdir(path.join(itemsDir, '1-agent-bar'), { recursive: true });
  await writeFile(path.join(itemsDir, '1-agent-bar', 'bar.toml'), 'name = "bar"\n');
  const recovered = await recoverBackupRecord(skillsDir, 'good-id');
  assert.ok(recovered);
  assert.deepEqual(
    recovered.items.map((i) => [i.name, i.fileName]),
    [['foo', 'foo.md'], ['bar', 'bar.toml']],
  );
});

// --- A5-12: tier-2 manifest root climb is capped ---

test('A5-12: a tier-2 root climbing past the cap is rejected; legitimate roots pass', () => {
  const entry = (root) => ({ kind: 'agent', name: 'foo', destName: 'foo.md', root });
  assert.equal(MAX_ROOT_CLIMB, 3);
  // 4 levels: beyond the cap.
  assert.match(
    validateEntry(entry('../../../../agents'), { key: 'agent:foo' }),
    /climbs 4 level\(s\) above the skills directory \(maximum 3\)/,
  );
  // Deep climb to another project's agents dir: rejected too.
  assert.match(
    validateEntry(entry('../../../../../other-project/agents'), { key: 'agent:foo' }),
    /climbs 5 level\(s\)/,
  );
  // At the cap: allowed.
  assert.equal(validateEntry(entry('../../../agents'), { key: 'agent:foo' }), null);
  // Documented targets: 1-2 levels, allowed.
  assert.equal(validateEntry(entry('../agents'), { key: 'agent:foo' }), null);
  assert.equal(validateEntry(entry('../../.codex/agents'), { key: 'agent:foo' }), null);
});

// --- A2-17: loadLibrary shape validation ---

test('A2-17: loadLibrary rejects a registry that parses to an array', async () => {
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  await writeFile(
    path.join(fixture.root, 'registry', 'skills.json'),
    JSON.stringify([]),
  );
  await assert.rejects(() => loadLibrary(fixture.root), (e) => {
    assert.ok(e instanceof LibraryError);
    assert.match(e.message, /registry\/skills\.json is malformed.*skills.*array/);
    return true;
  });
});

test('A2-17: loadLibrary rejects a registry object without a skills array', async () => {
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  await writeFile(
    path.join(fixture.root, 'registry', 'skills.json'),
    JSON.stringify({ name: 'skillforge', version: '9.9.9' }),
  );
  await assert.rejects(() => loadLibrary(fixture.root), /malformed: expected an object with a "skills" array/);
});

// --- A5-04: loadLibrary rejects traversal paths and separator names ---

test('A5-04: loadLibrary rejects a skill path escaping the library root', async () => {
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  await mutateJson(path.join(fixture.root, 'registry', 'skills.json'), (doc) => {
    doc.skills[0].path = '../../../etc';
  });
  await assert.rejects(() => loadLibrary(fixture.root), (e) => {
    assert.ok(e instanceof LibraryError);
    assert.match(e.message, /escapes the library root/);
    return true;
  });
});

test('A5-04: loadLibrary rejects a registry name containing a separator', async () => {
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  await mutateJson(path.join(fixture.root, 'registry', 'skills.json'), (doc) => {
    doc.skills[0].name = 'alpha/evil';
  });
  await assert.rejects(() => loadLibrary(fixture.root), /must be a single path segment/);
});

test('A5-04: loadLibrary rejects an agent registry path escaping the root', async () => {
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  await writeFile(
    path.join(fixture.root, 'registry', 'agents.json'),
    JSON.stringify({
      version: '9.9.9',
      agents: [{ name: 'evil-agent', path: '../../outside.md', description: 'evil' }],
    }),
  );
  await assert.rejects(() => loadLibrary(fixture.root), /escapes the library root/);
});

// --- A2-14: validate-skills --filter normalizes separators ---

test('A2-14: matchesFilter matches a POSIX filter against Windows-style paths', () => {
  assert.equal(matchesFilter('skills\\backend\\nestjs\\SKILL.md', 'skills/backend/nestjs'), true);
  assert.equal(matchesFilter('skills/backend/nestjs/SKILL.md', 'skills/backend/nestjs'), true);
  assert.equal(matchesFilter('skills/backend/nestjs/SKILL.md', './skills/backend/nestjs'), true);
  assert.equal(matchesFilter('skills/backend/nestjs/SKILL.md', 'skills\\backend\\nestjs'), true);
  assert.equal(matchesFilter('skills/frontend/nextjs/SKILL.md', 'skills/backend/nestjs'), false);
  assert.equal(matchesFilter('skills/frontend/nextjs/SKILL.md', null), true);
});

// --- A2-18: shared skill-file helpers ---

test('A2-18: findSkillFiles walks a tree and returns only SKILL.md files', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-skill-files-test-'));
  try {
    await mkdir(path.join(dir, 'a', 'one'), { recursive: true });
    await mkdir(path.join(dir, 'b', 'two'), { recursive: true });
    await writeFile(path.join(dir, 'a', 'one', 'SKILL.md'), '# One\n');
    await writeFile(path.join(dir, 'a', 'one', 'notes.md'), 'not a skill\n');
    await writeFile(path.join(dir, 'b', 'two', 'SKILL.md'), '# Two\n');
    await writeFile(path.join(dir, 'top.md'), 'not a skill\n');
    const found = (await findSkillFiles(dir)).sort();
    assert.deepEqual(found, [
      path.join(dir, 'a', 'one', 'SKILL.md'),
      path.join(dir, 'b', 'two', 'SKILL.md'),
    ]);
    assert.deepEqual(await findSkillFiles(path.join(dir, 'missing-dir')), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('A2-18: shared REQUIRED_SECTIONS and placeholder regexes match the standard', () => {
  assert.equal(REQUIRED_SECTIONS.length, 15);
  assert.ok(REQUIRED_SECTIONS.includes('Purpose'));
  assert.ok(REQUIRED_SECTIONS.includes('Validation Checklist'));
  assert.ok(REQUIRED_SECTIONS.includes('References'));
  assert.ok(PLACEHOLDER_ACRONYM_RE.test('TODO: finish this'));
  assert.equal(PLACEHOLDER_ACRONYM_RE.test('a todo list for the trip'), false);
  assert.ok(PLACEHOLDER_PHRASE_RE.test('Lorem Ipsum dolor'));
  assert.equal(PLACEHOLDER_PHRASE_RE.test('ordinary prose, no markers'), false);
});

// --- A2-20: query related survives a stale related reference ---

test('A2-20: query related flags a stale reference instead of crashing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-query-test-'));
  try {
    await mkdir(path.join(root, 'registry'), { recursive: true });
    await mkdir(path.join(root, 'sources'), { recursive: true });
    const skills = [
      {
        name: 'alpha', description: 'Alpha skill.', category: 'cat',
        status: 'verified', related: ['gone', 'beta'],
      },
      {
        name: 'beta', description: 'Beta skill.', category: 'cat',
        status: 'verified', related: [],
      },
    ];
    await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify({
      name: 'skillforge', version: '1.0.0', generated: '2026-11-20',
      categories: ['cat'], total_skills: 2, skills,
    }));
    await writeFile(path.join(root, 'registry', 'categories.json'), JSON.stringify({ version: '1.0.0', categories: [] }));
    await writeFile(path.join(root, 'registry', 'agents.json'), JSON.stringify({ version: '1.0.0', agents: [] }));
    await writeFile(path.join(root, 'registry', 'workflows.json'), JSON.stringify({ version: '1.0.0', workflows: [] }));
    await writeFile(path.join(root, 'sources', 'verification-status.json'), JSON.stringify({ statuses: {} }));
    const r = await runNode(QUERY, ['--root', root, 'related', 'alpha']);
    assert.equal(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /gone \[unknown\] \(stale related reference/);
    assert.match(r.stdout, /beta \[cat\] \(verified\)/);
    assert.doesNotMatch(r.stdout + r.stderr, /TypeError/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- A2-21: check-sources warns on an invalid last_verified date ---

test('A2-21: lastVerifiedWarning flags an invalid date, a missing date, and a stale date', () => {
  assert.match(
    lastVerifiedWarning({ name: 's', last_verified: 'not-a-date' }),
    /not a valid date/,
  );
  assert.match(lastVerifiedWarning({ name: 's' }), /no last_verified date/);
  assert.match(
    lastVerifiedWarning({ name: 's', last_verified: '2020-01-01' }, { nowMs: Date.parse('2026-11-21') }),
    /is \d+ days old \(stale\)/,
  );
  assert.equal(
    lastVerifiedWarning({ name: 's', last_verified: '2026-11-20' }, { nowMs: Date.parse('2026-11-21') }),
    null,
  );
});

// --- A5-10: atomicWriteFile uses O_EXCL ---

test('A5-10: atomicWriteFile refuses a pre-planted symlink at the temp path', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-atomic-test-'));
  try {
    const file = path.join(dir, 'out.json');
    const victim = path.join(dir, 'victim.txt');
    await writeFile(victim, 'precious\n');
    // Pin Math.random so the temp name is predictable: (0.5).toString(36)
    // is "0.i", so the suffix is "i".
    const realRandom = Math.random;
    Math.random = () => 0.5;
    try {
      const tmp = `${file}.tmp-${process.pid}-i`;
      await symlink(victim, tmp);
      await assert.rejects(() => atomicWriteFile(file, 'pwned\n'), (e) => {
        assert.equal(e.code, 'EEXIST');
        return true;
      });
      assert.equal(await readFile(victim, 'utf8'), 'precious\n');
      assert.equal(await exists(file), false);
    } finally {
      Math.random = realRandom;
    }
    // The normal path still works after the guard.
    await atomicWriteFile(file, 'hello\n');
    assert.equal(await readFile(file, 'utf8'), 'hello\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- A2-22: atomic-write retry is directly testable ---

test('A2-22: atomicWriteFile retries a transient rename failure and succeeds', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-atomic-test-'));
  try {
    const file = path.join(dir, 'out.json');
    let calls = 0;
    const flakyRename = async (from, to) => {
      calls++;
      if (calls <= 2) {
        const e = new Error('file is locked');
        e.code = 'EPERM';
        throw e;
      }
      const { rename } = await import('node:fs/promises');
      await rename(from, to);
    };
    await atomicWriteFile(file, 'content\n', { attempts: 5, delayMs: 1, renameFn: flakyRename });
    assert.equal(calls, 3);
    assert.equal(await readFile(file, 'utf8'), 'content\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('A2-22: atomicWriteFile gives up after the configured attempts', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-atomic-test-'));
  try {
    const file = path.join(dir, 'out.json');
    let calls = 0;
    const stuckRename = async () => {
      calls++;
      const e = new Error('file is locked');
      e.code = 'EBUSY';
      throw e;
    };
    await assert.rejects(
      () => atomicWriteFile(file, 'content\n', { attempts: 3, delayMs: 1, renameFn: stuckRename }),
      /file is locked/,
    );
    assert.equal(calls, 3);
    assert.equal(await exists(file), false);
    // The temp file is cleaned up on failure.
    assert.deepEqual(await readdir(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('A2-22: atomicWriteFile never exposes a partial file to a concurrent reader', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-atomic-test-'));
  try {
    const file = path.join(dir, 'data.json');
    await atomicWriteFile(file, JSON.stringify({ n: 0 }));
    let reads = 0;
    let parseErrors = 0;
    let stop = false;
    const reader = (async () => {
      while (!stop) {
        try {
          JSON.parse(await readFile(file, 'utf8'));
          reads++;
        } catch {
          parseErrors++;
        }
      }
    })();
    for (let i = 1; i <= 30; i++) {
      await atomicWriteFile(file, JSON.stringify({ n: i, pad: 'x'.repeat(5000) }));
    }
    stop = true;
    await reader;
    assert.ok(reads > 0, 'expected the reader to run');
    assert.equal(parseErrors, 0, 'a concurrent reader must never see a partial write');
    assert.equal(JSON.parse(await readFile(file, 'utf8')).n, 30);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
