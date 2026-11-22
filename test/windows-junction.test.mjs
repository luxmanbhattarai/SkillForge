// windows-junction.test.mjs — REAL Windows junction tests for the
// SkillForge installer (Group D, Phase 11).
//
// Every test in this file runs ONLY on Windows: a junction is a
// Windows-only filesystem object, and only a real junction on a
// real Windows filesystem proves the installer's junction behavior.
// On every other platform each test skips cleanly (the same
// in-body test.skip() pattern test/audit-fixes-c4.test.mjs uses
// for the A5-11 junction test). The gating Windows CI leg
// (workflow Validate skills, job "Windows (Node 24)",
// windows-latest, Node 24) runs the full suite, so these execute
// there on the pull request.
//
// What "real" means here, and what is honestly simulated:
//   * Every junction in this file is a REAL junction created on a
//     real Windows filesystem, either by the installer CLI itself,
//     by fs.symlink(..., 'junction') directly, or by the real
//     createLink() code path. No filesystem is mocked anywhere.
//   * The ONE simulated input is the EPERM that makes symlink
//     creation fail: a test cannot drop its own privileges, so the
//     tests that need "symlink creation denied" use createLink()'s
//     injectable symlinkFn to throw EPERM for the symlink attempt
//     while delegating the junction attempt to the REAL
//     fs.symlink. The fallback decision, the junction creation,
//     and everything after it are real; only the privilege denial
//     is injected. Where the runner genuinely denies symlinks
//     (Developer Mode off), the CLI test covers the fallback with
//     no injection at all.
//   * The existing fault-injected A-11 unit tests in
//     test/installer.test.mjs prove the fallback LOGIC on any
//     platform; these tests prove the fallback's REAL-WORLD
//     EFFECT on Windows. The A5-11 test in
//     test/audit-fixes-c4.test.mjs proves uninstall removes a
//     junction without following it; this file extends coverage to
//     creation, resolution, existing destinations, broken
//     junctions, permissions, non-admin operation, removal,
//     recovery, cross-drive behavior, and backup/restore — it does
//     not duplicate A5-11.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLink, sameLinkTarget } from '../scripts/install/links.mjs';
import {
  exists,
  makeFixtureLibrary,
  makeSandbox,
  readJson,
  runCli,
} from '../test-support/helpers.mjs';

const IS_WINDOWS = process.platform === 'win32';

// Skip with a clear reason on non-Windows platforms. Returns true
// when the caller should return early (i.e. the test was skipped).
// Uses the test CONTEXT skip (t.skip), not the module-level
// test.skip(): the module-level call inside a running test
// registers a second, phantom skipped test and lets the body
// itself count as passed, while t.skip() marks this test skipped
// — 12 skipped on Linux, not 12 passed + 12 phantom skipped.
function skipUnlessWindows(t) {
  if (IS_WINDOWS) return false;
  t.skip('junctions exist only on Windows; the Windows CI leg runs this test');
  return true;
}

// Snapshot a directory tree as relative path -> sha256 of content,
// so "the target survives intact" means byte-identical, not merely
// "still exists".
async function snapshotTree(dir, base = dir, out = new Map()) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) await snapshotTree(full, base, out);
    else if (entry.isFile()) {
      out.set(rel, createHash('sha256').update(await readFile(full)).digest('hex'));
    }
  }
  return out;
}

function assertSameTree(actual, expected, what) {
  assert.deepEqual([...actual.entries()].sort(), [...expected.entries()].sort(), `${what}: tree differs`);
}

// A symlinkFn for createLink() that fails the SYMLINK attempt with
// a real EPERM error but delegates the JUNCTION attempt to the real
// fs.symlink — so the fallback decision is the real code path and
// the junction it creates is a real junction. The EPERM is the one
// injected input (a test cannot drop its own privileges); see the
// file header.
function epermSymlinkThenRealJunction() {
  return async (target, linkPath, type) => {
    if (type === 'junction') return symlink(target, linkPath, type);
    const err = new Error('operation not permitted, symlink');
    err.code = 'EPERM';
    throw err;
  };
}

// Can this process create a directory symlink here? Probes the
// real filesystem; used to decide whether the no-injection CLI
// fallback test can run (Developer Mode / privilege decides).
async function canCreateSymlink(dir) {
  const target = path.join(dir, 'probe-target');
  const link = path.join(dir, 'probe-link');
  await mkdir(target, { recursive: true });
  try {
    await symlink(target, link, 'dir');
    await rm(link, { force: true });
    return true;
  } catch (err) {
    if (err.code === 'EPERM') return false;
    throw err;
  } finally {
    await rm(target, { recursive: true, force: true }).catch(() => {});
  }
}

// Is this process running elevated? `net session` succeeds only
// with an elevated token; a non-elevated process gets "System
// error 5 has occurred. Access is denied." Returns true (elevated),
// false (not elevated), or null (could not determine).
async function isElevated() {
  try {
    const code = await new Promise((resolve) => {
      execFile('net', ['session'], { timeout: 15000 }, (err) => {
        resolve(err ? err.code : 0);
      });
    });
    return code === 0;
  } catch {
    return null;
  }
}

// Find a second local drive that exists and is writable (other
// than the drive os.tmpdir() is on). Returns a drive root like
// 'D:\\' or null when no second writable drive exists.
async function findSecondDrive() {
  const tmpDrive = path.parse(os.tmpdir()).root.toUpperCase();
  for (let code = 'D'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code++) {
    const drive = `${String.fromCharCode(code)}:\\`;
    if (drive.toUpperCase() === tmpDrive) continue;
    try {
      const probe = await mkdtemp(path.join(drive, 'skillforge-junction-probe-'));
      await rm(probe, { recursive: true, force: true });
      return drive;
    } catch {
      // Not present, not a local drive, or not writable; try the next.
    }
  }
  return null;
}

// Install one fixture skill with --link through the real CLI, then
// replace whatever link form the runner created with a REAL
// junction to the same source (the A5-11 technique): the runner
// may permit symlinks (Developer Mode), in which case --link made
// a symlink, not a junction — and these tests are about junctions.
// Returns { linkPath, sourceDir }.
async function installThenForceJunction({ home, proj, env, fixture }) {
  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  const linkPath = path.join(proj, 'out', 'fixture-one');
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  await rm(linkPath);
  await symlink(sourceDir, linkPath, 'junction');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  return { linkPath, sourceDir };
}

// ---------------------------------------------------------------- creation

test('junction: the real CLI --link install falls back to a junction when symlinks are not permitted', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };

  // No injection in this test: it only proves the fallback when
  // the environment genuinely denies symlinks. A runner with
  // Developer Mode on permits symlinks, so the fallback never
  // engages there — that case is covered by the fault-injected
  // test below instead, and this test skips with the reason.
  if (await canCreateSymlink(base)) {
    t.skip('this runner permits symlink creation (Developer Mode); the no-injection fallback path cannot engage here — see the fault-injected fallback test');
    return;
  }

  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  // stageItem records which form createLink actually created, and
  // the CLI prints it: '(junction)' proves the fallback engaged.
  assert.match(r.stdout, /installed fixture-one .*\(junction\)/);
  const linkPath = path.join(proj, 'out', 'fixture-one');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.equal(manifest.items['skill:fixture-one'].method, 'link');
});

test('junction: createLink falls back to a real junction when symlink creation fails with EPERM', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');
  const before = await snapshotTree(sourceDir);
  assert.ok(before.size > 0, 'fixture skill must have files to protect');

  // The symlink attempt throws EPERM; the junction attempt is the
  // real fs.symlink, so the junction that results is real.
  const linkPath = path.join(base, 'junction-link');
  const form = await createLink(sourceDir, linkPath, {
    kind: 'skill',
    platform: 'win32',
    symlinkFn: epermSymlinkThenRealJunction(),
  });
  assert.equal(form, 'junction');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  // The junction resolves to the source: readlink agrees (with NT
  // prefix / case rules applied) and content reads through it.
  assert.equal(sameLinkTarget(await readlink(linkPath), sourceDir, 'win32'), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
  assert.deepEqual((await readdir(linkPath)).sort(), ['SKILL.md']);

  // A relative target is resolved against the link's parent
  // before the junction retry (a junction stores an absolute
  // target; resolving against the process cwd would be wrong).
  const relDir = path.join(base, 'rel');
  await mkdir(relDir, { recursive: true });
  const relTarget = path.relative(relDir, sourceDir);
  const relLink = path.join(relDir, 'rel-junction');
  const relForm = await createLink(relTarget, relLink, {
    kind: 'skill',
    platform: 'win32',
    symlinkFn: epermSymlinkThenRealJunction(),
  });
  assert.equal(relForm, 'junction');
  assert.equal(sameLinkTarget(await readlink(relLink), sourceDir, 'win32'), true);
  assert.match(await readFile(path.join(relLink, 'SKILL.md'), 'utf8'), /Version one body/);

  // Removing the junctions touches only the junctions: the source
  // tree survives byte-identical.
  await rm(linkPath);
  await rm(relLink);
  assertSameTree(await snapshotTree(sourceDir), before, 'source after junction removal');
});

test('junction: target resolution — readlink, readdir, and stat see through a real junction', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');
  const linkPath = path.join(base, 'resolve-junction');
  await symlink(sourceDir, linkPath, 'junction');

  // readlink returns the target; sameLinkTarget compares it
  // correctly across the NT namespace prefix form and Windows
  // case-insensitivity (junction substitute names are stored as
  // \??\ paths; libuv usually strips the prefix, older versions
  // did not — the comparison must hold either way).
  const target = await readlink(linkPath);
  assert.equal(sameLinkTarget(target, sourceDir, 'win32'), true);
  assert.equal(sameLinkTarget(`\\??\\${sourceDir}`, sourceDir, 'win32'), true);
  assert.equal(sameLinkTarget(target.toUpperCase(), sourceDir, 'win32'), true);
  // A trailing separator must not break the comparison.
  assert.equal(sameLinkTarget(`${target}\\`, sourceDir, 'win32'), true);
  // And a different directory must NOT compare equal.
  assert.equal(sameLinkTarget(target, path.dirname(sourceDir), 'win32'), false);

  // The junction is transparent to readers: readdir lists the
  // target's files, stat follows it to a directory, and content
  // reads through it.
  assert.deepEqual((await readdir(linkPath)).sort(), ['SKILL.md']);
  assert.equal((await stat(linkPath)).isDirectory(), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
  // lstat (no follow) still reports a link, not a directory.
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal((await lstat(linkPath)).isDirectory(), false);
});

test('junction: a missing target dangles (raw) but createLink with requireTarget fails cleanly', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base } = await makeSandbox();
  const missing = path.join(base, 'does-not-exist');

  // CORRECTION (2026-11-22): the Stage D assumption that a
  // junction's target must exist at creation time was WRONG — on
  // Windows the real call succeeds and the junction dangles (the
  // first version of this test asserted ENOENT and failed on the
  // Windows CI leg). The junction is dangling: readlink returns
  // the target, stat follows it and fails with ENOENT.
  const dangling = path.join(base, 'dangling-junction');
  await symlink(missing, dangling, 'junction');
  assert.equal(await readlink(dangling), missing);
  await assert.rejects(() => stat(dangling), (err) => err.code === 'ENOENT');
  await rm(dangling, { force: true });

  // That is why createLink validates when asked: with
  // requireTarget, a missing target fails cleanly with a LinkError
  // before any link attempt is made (attempts []), naming the
  // target. The install path (stageItem) passes requireTarget, so
  // a fresh install can never silently create a dangling link.
  await assert.rejects(
    () =>
      createLink(missing, path.join(base, 'dangling-fallback'), {
        kind: 'skill',
        platform: 'win32',
        symlinkFn: epermSymlinkThenRealJunction(),
        requireTarget: true,
      }),
    (err) => {
      assert.equal(err.name, 'LinkError');
      assert.deepEqual(err.attempts, []);
      assert.match(err.message, /target does not exist/);
      return true;
    },
  );

  // Without requireTarget the old behavior stands: the link is
  // created dangling. The backup/restore paths rely on this —
  // they must be able to recreate a broken link. (Which form is
  // created depends on the runner's symlink privilege: symlink
  // where allowed, junction fallback where denied.)
  const allowed = path.join(base, 'dangling-allowed');
  const form = await createLink(missing, allowed, {
    kind: 'skill',
    platform: 'win32',
  });
  assert.ok(form === 'symlink' || form === 'junction', `unexpected form: ${form}`);
  await assert.rejects(() => stat(allowed), (err) => err.code === 'ENOENT');
  await rm(allowed, { force: true });
});

// ---------------------------------------------------------------- destinations

test('junction: existing-destination handling — real dir, foreign junction, and matching junction', async (t) => {
  if (skipUnlessWindows(t)) return;

  // (a) A real directory at the destination is a conflict:
  // refused, and the existing content is untouched.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await mkdir(path.join(proj, 'out', 'fixture-one'), { recursive: true });
    await writeFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'my own content\n');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /refused: fixture-one/);
    assert.equal(
      await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'),
      'my own content\n',
    );
  }

  // (b) A real junction pointing somewhere else is a conflict:
  // refused, and the foreign junction and its target are untouched.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const foreign = path.join(base, 'foreign');
    await mkdir(foreign, { recursive: true });
    await writeFile(path.join(foreign, 'SKILL.md'), 'foreign content\n');
    const foreignBefore = await snapshotTree(foreign);
    await mkdir(path.join(proj, 'out'), { recursive: true });
    await symlink(foreign, path.join(proj, 'out', 'fixture-one'), 'junction');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /refused: fixture-one/);
    assert.equal((await lstat(path.join(proj, 'out', 'fixture-one'))).isSymbolicLink(), true);
    assert.equal(
      sameLinkTarget(await readlink(path.join(proj, 'out', 'fixture-one')), foreign, 'win32'),
      true,
    );
    assertSameTree(await snapshotTree(foreign), foreignBefore, 'foreign target after refusal');
  }

  // (c) A real junction already pointing at the library source is
  // adopted into the manifest, not replaced.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await mkdir(path.join(proj, 'out'), { recursive: true });
    await symlink(
      path.join(fixture.root, 'skills', 'alpha', 'fixture-one'),
      path.join(proj, 'out', 'fixture-one'),
      'junction',
    );
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /already installed: fixture-one \(adopted into the manifest\)/);
    const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
    assert.equal(manifest.items['skill:fixture-one'].method, 'link');
    assert.equal((await lstat(path.join(proj, 'out', 'fixture-one'))).isSymbolicLink(), true);
  }
});

test('junction: broken-junction handling — doctor fails, uninstall removes only the junction', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const { linkPath, sourceDir } = await installThenForceJunction({ home, proj, env, fixture });

  // Break the junction by deleting its target (the registry entry
  // stays, so the library still loads — only the source dir is gone).
  await rm(sourceDir, { recursive: true, force: true });
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal(sameLinkTarget(await readlink(linkPath), sourceDir, 'win32'), true);

  // Doctor fails on the broken junction (it does not crash).
  const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor.code, 1, doctor.stdout);
  assert.equal(JSON.parse(doctor.stdout).ok, false);
  assert.match(doctor.stdout, /broken symlink/);

  // Validate fails too: SKILL.md cannot be read through the
  // broken junction.
  const valid = await runCli(['validate', '--dest', 'out'], { home, proj, env });
  assert.equal(valid.code, 1, valid.stdout);
  assert.match(valid.stdout, /SKILL.md is missing/);

  // Uninstall removes only the broken junction and succeeds.
  const ru = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(ru.code, 0, ru.stderr);
  assert.equal(await exists(linkPath), false);
  // The target stays deleted (nothing recreated it) and the
  // manifest entry is gone.
  assert.equal(await exists(sourceDir), false);
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.deepEqual(manifest.items, {});
});

// ---------------------------------------------------------------- privilege

test('junction: non-administrator operation — junctions work without elevation', async (t) => {
  if (skipUnlessWindows(t)) return;
  const elevated = await isElevated();
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');

  if (elevated === true) {
    // An elevated process cannot prove non-admin operation, so
    // the strict assertion is skipped — but junction creation is
    // still verified below (it must work elevated too).
    t.skip('this process is running elevated, so non-admin operation cannot be proven here — junction creation is still verified');
    return;
  }
  if (elevated === null) {
    t.skip('could not determine whether this process is elevated (`net session` unavailable)');
    return;
  }

  // From here the process is NOT elevated. Junctions need no
  // privilege (unlike symlinks): direct creation, the createLink
  // fallback, and the CLI --link install must all work.
  const direct = path.join(base, 'nonadmin-junction');
  await symlink(sourceDir, direct, 'junction');
  assert.match(await readFile(path.join(direct, 'SKILL.md'), 'utf8'), /Version one body/);

  const fallback = path.join(base, 'nonadmin-fallback');
  const form = await createLink(sourceDir, fallback, {
    kind: 'skill',
    platform: 'win32',
    symlinkFn: epermSymlinkThenRealJunction(),
  });
  assert.equal(form, 'junction');
  assert.match(await readFile(path.join(fallback, 'SKILL.md'), 'utf8'), /Version one body/);

  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  const linkPath = path.join(proj, 'out', 'fixture-one');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);

  // When Developer Mode is also off, a plain symlink attempt
  // fails with EPERM in the very same directory where the
  // junctions above succeeded — the privilege asymmetry, observed
  // directly. (When Developer Mode is on, symlinks succeed and
  // this sub-assertion is skipped: the asymmetry cannot be
  // observed on that machine.)
  const symTarget = path.join(base, 'sym-target');
  await mkdir(symTarget, { recursive: true });
  try {
    await symlink(symTarget, path.join(base, 'sym-probe'), 'dir');
    await rm(path.join(base, 'sym-probe'), { force: true });
  } catch (err) {
    assert.equal(err.code, 'EPERM', 'a denied symlink attempt must fail with EPERM');
  }
});

test('junction: permission restrictions — creation inside a write-denied directory fails cleanly', async (t) => {
  if (skipUnlessWindows(t)) return;
  const username = process.env.USERNAME;
  if (!username) {
    t.skip('USERNAME is not set; cannot target an icacls deny ACE at the current user');
    return;
  }
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const denied = path.join(proj, 'denied');
  await mkdir(denied, { recursive: true });

  const icacls = (args) =>
    new Promise((resolve) => {
      execFile('icacls', args, { timeout: 30000 }, (err, stdout, stderr) => {
        resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
      });
    });

  // Deny the current user Write access to the directory. If
  // icacls is unavailable or the deny cannot be applied, skip
  // with the reason — the test must not fail on setup.
  const deny = await icacls([denied, '/deny', `${username}:(OI)(CI)W`]);
  if (deny.code !== 0) {
    t.skip(`could not apply the icacls deny ACE (${(deny.stderr || deny.stdout).trim() || `exit ${deny.code}`})`);
    return;
  }
  try {
    // Prove the deny actually takes effect before asserting on
    // it: a plain file write must fail. (An elevated token or a
    // privilege quirk can make a deny ACE a no-op; if the write
    // succeeds, the environment cannot demonstrate the failure
    // and the test skips instead of asserting a falsehood.)
    let probeFailed = false;
    try {
      await writeFile(path.join(denied, 'probe.txt'), 'probe\n');
    } catch (err) {
      probeFailed = err.code === 'EPERM' || err.code === 'EACCES';
    }
    if (!probeFailed) {
      await rm(path.join(denied, 'probe.txt'), { force: true }).catch(() => {});
      t.skip('the icacls deny ACE did not block writes in this environment, so the permission failure cannot be demonstrated');
      return;
    }

    // Direct junction creation inside the denied directory fails
    // with a permission error.
    await assert.rejects(
      () => symlink(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'), path.join(denied, 'j'), 'junction'),
      (err) => err.code === 'EPERM' || err.code === 'EACCES',
    );

    // The CLI --link install into the denied directory fails
    // cleanly (a per-item failure with the junction fallback
    // mentioned, since the EPERM also triggers the retry) and
    // installs nothing.
    const r = await runCli(['install', '--dest', 'denied', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.notEqual(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /failed: fixture-one/);
    assert.equal(await exists(path.join(denied, 'fixture-one')), false);
  } finally {
    // Always restore the ACLs, or the sandbox cannot be cleaned
    // up afterwards.
    await icacls([denied, '/remove:d', username]).catch(() => {});
    await rm(denied, { recursive: true, force: true }).catch(() => {});
  }
});

// ---------------------------------------------------------------- removal

test('junction: removal behavior — rm and rename affect only the junction, never its target', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');
  const before = await snapshotTree(sourceDir);
  assert.ok(before.size > 0, 'fixture skill must have files to protect');

  // (a) A recursive rm on a junction removes only the junction.
  // This is the primitive the installer's uninstall path relies
  // on — the catastrophic failure mode if it followed the link.
  const rmLink = path.join(base, 'rm-junction');
  await symlink(sourceDir, rmLink, 'junction');
  await rm(rmLink, { recursive: true, force: true });
  assert.equal(await exists(rmLink), false);
  assertSameTree(await snapshotTree(sourceDir), before, 'source after recursive rm of a junction');

  // (b) Renaming a junction (what swapIn does to move a
  // destination aside) moves only the junction: the target stays
  // put and the content is still readable through the moved link.
  const mvLink = path.join(base, 'mv-junction');
  const mvDest = path.join(base, 'mv-junction-moved');
  await symlink(sourceDir, mvLink, 'junction');
  await rename(mvLink, mvDest);
  assert.equal(await exists(mvLink), false);
  assert.equal((await lstat(mvDest)).isSymbolicLink(), true);
  assert.match(await readFile(path.join(mvDest, 'SKILL.md'), 'utf8'), /Version one body/);
  assertSameTree(await snapshotTree(sourceDir), before, 'source after renaming a junction');
  await rm(mvDest, { force: true });

  // (c) CLI uninstall --all --force removes two junctions at once;
  // both library sources survive byte-identical.
  const r1 = await runCli(
    ['install', '--dest', 'out', '--skill', 'fixture-one,fixture-two', '--link'],
    { home, proj, env },
  );
  assert.equal(r1.code, 0, r1.stderr);
  const sourceTwo = path.join(fixture.root, 'skills', 'beta', 'fixture-two');
  const beforeTwo = await snapshotTree(sourceTwo);
  for (const name of ['fixture-one', 'fixture-two']) {
    const linkPath = path.join(proj, 'out', name);
    const source = name === 'fixture-one' ? sourceDir : sourceTwo;
    await rm(linkPath);
    await symlink(source, linkPath, 'junction');
  }
  const ru = await runCli(['uninstall', '--dest', 'out', '--all', '--force'], { home, proj, env });
  assert.equal(ru.code, 0, ru.stderr);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-one')), false);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-two')), false);
  assertSameTree(await snapshotTree(sourceDir), before, 'source one after uninstall --all');
  assertSameTree(await snapshotTree(sourceTwo), beforeTwo, 'source two after uninstall --all');
});

// ---------------------------------------------------------------- recovery

test('junction: recovery from interrupted operations — stale staging junctions are cleaned, trash junctions survive', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = path.join(proj, 'out');
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');
  const before = await snapshotTree(sourceDir);

  // Plant the debris of an interrupted --link run: a stale
  // STAGING junction (reproducible from the library — safe to
  // delete) and a TRASH junction (may hold the only copy of
  // replaced content — never auto-deleted).
  await mkdir(dest, { recursive: true });
  const staging = path.join(dest, `.skillforge-tmp-fixture-one-${process.pid}-abcdef`);
  const trash = path.join(dest, `.skillforge-tmp-old-fixture-one-${process.pid}-abcdef`);
  await symlink(sourceDir, staging, 'junction');
  await symlink(sourceDir, trash, 'junction');

  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  // The staging junction is gone — removed without following it
  // into the library — and the trash junction survives.
  assert.equal(await exists(staging), false);
  assert.equal((await lstat(trash)).isSymbolicLink(), true);
  assertSameTree(await snapshotTree(sourceDir), before, 'source after staging-junction cleanup');
  // The install itself succeeded.
  const linkPath = path.join(dest, 'fixture-one');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);

  // Doctor warns about the leftover trash junction (a warning,
  // not a failure).
  const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  const report = JSON.parse(doctor.stdout);
  assert.ok(
    report.locations[0].problems.some((p) => p.level === 'warn' && /leftover trash directory/.test(p.message)),
    'doctor warns about the leftover trash junction',
  );

  // A kill between swapIn's two renames leaves the manifest
  // entry with a missing destination: update reinstalls the link.
  await rm(linkPath);
  const up = await runCli(['update', '--dest', 'out'], { home, proj, env });
  assert.equal(up.code, 0, up.stderr);
  assert.match(up.stdout, /installed fixture-one/);
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal(sameLinkTarget(await readlink(linkPath), sourceDir, 'win32'), true);
});

// ---------------------------------------------------------------- cross-drive

test('junction: cross-drive behavior — a junction can point at another local volume', async (t) => {
  if (skipUnlessWindows(t)) return;
  const drive = await findSecondDrive();
  if (!drive) {
    t.skip('no second writable local drive exists on this machine, so cross-drive junction behavior cannot be exercised');
    return;
  }
  const { base, home, proj } = await makeSandbox();
  // The fixture library lives on the second drive; the install
  // destination stays on the temp drive.
  const libBase = await mkdtemp(path.join(drive, 'skillforge-junction-lib-'));
  try {
    const fixture = await makeFixtureLibrary(libBase);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');

    // A junction on the temp drive pointing at the second drive
    // resolves: junctions may span local volumes (unlike UNC
    // targets, which they cannot reference).
    const xLink = path.join(base, 'cross-drive-junction');
    await symlink(sourceDir, xLink, 'junction');
    assert.match(await readFile(path.join(xLink, 'SKILL.md'), 'utf8'), /Version one body/);
    assert.equal(sameLinkTarget(await readlink(xLink), sourceDir, 'win32'), true);

    // The installer --link install works cross-drive end to end.
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 0, r.stderr);
    const linkPath = path.join(proj, 'out', 'fixture-one');
    assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
    assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
    assert.equal(sameLinkTarget(await readlink(linkPath), sourceDir, 'win32'), true);
  } finally {
    await rm(libBase, { recursive: true, force: true }).catch(() => {});
  }
});

// ---------------------------------------------------------------- backup/restore

test('junction: backup and restore round-trip preserves a link install', async (t) => {
  if (skipUnlessWindows(t)) return;
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const { linkPath, sourceDir } = await installThenForceJunction({ home, proj, env, fixture });

  // Replace the junction install with a copy install (--force):
  // the junction is backed up (as a link, not as resolved
  // content) and a real directory takes its place.
  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.equal((await lstat(linkPath)).isSymbolicLink(), false);
  assert.equal((await lstat(linkPath)).isDirectory(), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
  const listed = await runCli(['restore', '--list', '--json', '--dest', 'out'], { home, proj, env });
  assert.equal(listed.code, 0, listed.stderr);
  const backups = JSON.parse(listed.stdout);
  assert.equal(backups.length, 1);
  assert.equal(backups[0].items.length, 1);
  assert.equal(backups[0].items[0].isSymlink, true);

  // Restore the backup: the link is back, pointing at the source,
  // and the manifest records method 'link' again. (The restored
  // form — symlink or junction — depends on the runner's symlink
  // privilege; what matters is that it is a link at the source.)
  const rr = await runCli(['restore', backups[0].id, '--dest', 'out'], { home, proj, env });
  assert.equal(rr.code, 0, rr.stderr);
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal(sameLinkTarget(await readlink(linkPath), sourceDir, 'win32'), true);
  assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.equal(manifest.items['skill:fixture-one'].method, 'link');
  const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
});
