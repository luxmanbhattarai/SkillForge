// audit-fixes-c4.test.mjs — Phase C workstream C4 (workflows + CI)
// regression tests.
//
// A5-11: junction removal on real Windows. The Stage D analysis
// (ai/remediation/stage-d/windows-link-analysis.md) flagged `fs.rm`
// on a junction as the one assumption with a catastrophic failure
// mode if wrong — a recursive rm that followed a junction into the
// library would delete library source. The existing --link tests
// only ever created real junctions by accident (the GitHub Windows
// runner may permit symlinks via Developer Mode, so the junction
// fallback may never trigger in CI), and the A-11 tests in
// installer.test.mjs are fault-injected simulations that create no
// junction at all.
//
// This test runs ONLY on Windows: a junction is a Windows-only
// object, and only a real junction on a real Windows runner proves
// the uninstall path removes the junction without following it.
// On every other platform it skips cleanly. The Windows CI leg
// runs the full suite, so this executes there in Phase E.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import {
  exists,
  makeFixtureLibrary,
  makeSandbox,
  readJson,
  runCli,
} from '../test-support/helpers.mjs';

// Snapshot a directory tree as relative path -> sha256 of content,
// so "the library source survives intact" means byte-identical,
// not merely "still exists".
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

test('A5-11 (junction): uninstalling a real Windows junction removes only the junction; the library source survives intact', async () => {
  // A junction is a Windows-only object: this can only prove
  // junction behavior on Windows, so it skips everywhere else.
  if (process.platform !== 'win32') {
    test.skip('junctions exist only on Windows; the Windows CI leg runs this test');
    return;
  }
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');

  // Install with --link through the real CLI so the manifest
  // records method 'link' for the skill.
  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  const linkPath = path.join(proj, 'out', 'fixture-one');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.equal(manifest.items['skill:fixture-one'].method, 'link');

  // The runner may permit symlinks (Developer Mode), in which case
  // --link created a symlink, not a junction — and the finding is
  // precisely that junction *removal* was never demonstrably
  // exercised. Force the junction case: replace whatever link
  // createLink made with a REAL junction created directly,
  // pointing at the same library source.
  const before = await snapshotTree(sourceDir);
  assert.ok(before.size > 0, 'fixture skill must have files to protect');
  await rm(linkPath);
  await symlink(sourceDir, linkPath, 'junction');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);

  // Uninstall through the real CLI: this is the code path that
  // removes link entries with rm(..., rmRecursiveOptions()) —
  // the call the Stage D analysis flagged as catastrophic if it
  // followed a junction into the library.
  const ru = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(ru.code, 0, ru.stderr);
  assert.equal(await exists(linkPath), false);

  // The library source tree survives byte-identical.
  const after = await snapshotTree(sourceDir);
  assert.deepEqual([...after.entries()], [...before.entries()]);
});
