// installer-warnings.test.mjs — regression tests for the S-08/S-09
// agentic-seo warnings on installer paths the main warning test in
// test/installer.test.mjs does not cover: restore (dry-run, real,
// already-matching, and recovered-corrupt-backup) and --force
// overwrite. Every test runs the real CLI as a child process in its
// own temp sandbox (fake HOME + fake project dir) and never touches
// the real home directory or real agent directories.
//
// Background: the installer warns (stderr) whenever a run leaves
// the upstream 'seo' skill installed, because its README and
// install.sh document an unsafe curl-piped-to-shell install
// (finding S-08) and its broken_links.py disables TLS verification
// (finding S-09). Install, update (incl. dry-run and
// already-installed), and doctor were covered in 9fdc0d0; restore
// warned about nothing on either path until the Group A fix in
// scripts/install/commands.mjs (runRestore).

import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFile, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { makeSandbox, runCli } from '../test-support/helpers.mjs';

const CLAUDE = ['--target', 'claude-code', '--scope', 'project'];
// The seo skill is needs-correction, so explicit installs of it
// need the Finding 3 opt-in flag (test/installer-status-filter
// covers the refusal itself; these tests cover the S-08/S-09
// warnings on paths that leave seo installed).
const ALLOW = '--allow-needs-correction';

function countWarnings(stderr, finding) {
  return (stderr.match(new RegExp(`finding ${finding}`, 'g')) || []).length;
}

function assertWarnsOnce(r) {
  assert.match(r.stderr, /documents an unsafe install method/);
  assert.match(r.stderr, /disables TLS certificate verification/);
  assert.match(r.stderr, /finding S-08/);
  assert.match(r.stderr, /finding S-09/);
  assert.equal(countWarnings(r.stderr, 'S-08'), 1, `expected S-08 once, stderr was:\n${r.stderr}`);
  assert.equal(countWarnings(r.stderr, 'S-09'), 1, `expected S-09 once, stderr was:\n${r.stderr}`);
}

function assertWarnsNothing(r) {
  assert.doesNotMatch(r.stderr, /finding S-08/);
  assert.doesNotMatch(r.stderr, /finding S-09/);
}

// Install the seo skill, modify it, then force-replace it so a
// backup exists holding the modified copy. Returns the backup id.
async function makeSeoBackup(home, proj) {
  const install = await runCli(['install', ...CLAUDE, '--skill', 'seo', ALLOW], { home, proj });
  assert.equal(install.code, 0, install.stderr);
  await appendFile(path.join(proj, '.claude', 'skills', 'seo', 'SKILL.md'), '\nMY EDIT\n');
  const forced = await runCli(['install', ...CLAUDE, '--skill', 'seo', '--force', ALLOW], { home, proj });
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(forced.stdout, /Backup created: (\S+)/);
  return forced.stdout.match(/Backup created: (\S+)/)[1];
}

test('S-08/S-09: restore dry-run of a seo backup warns (before the fix, restore warned about nothing)', async () => {
  const { home, proj } = await makeSandbox();
  const backupId = await makeSeoBackup(home, proj);
  // Remove the installed copy so the restore action is 'restore'.
  await rm(path.join(proj, '.claude', 'skills', 'seo'), { recursive: true, force: true });
  const dry = await runCli(['restore', backupId, ...CLAUDE, '--dry-run'], { home, proj });
  assert.equal(dry.code, 0, dry.stderr);
  assert.match(dry.stdout, /would restore seo/);
  assertWarnsOnce(dry);
});

test('S-08/S-09: restoring a seo backup warns once; re-restoring when it already matches warns too', async () => {
  const { home, proj } = await makeSandbox();
  const backupId = await makeSeoBackup(home, proj);
  await rm(path.join(proj, '.claude', 'skills', 'seo'), { recursive: true, force: true });
  const restored = await runCli(['restore', backupId, ...CLAUDE], { home, proj });
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stdout, /restored seo/);
  assertWarnsOnce(restored);
  // The restored content is the modified copy from the backup.
  assert.match(await readFile(path.join(proj, '.claude', 'skills', 'seo', 'SKILL.md'), 'utf8'), /MY EDIT/);

  // A second restore finds the content already matching the backup
  // and still warns: the run leaves the seo skill installed.
  const again = await runCli(['restore', backupId, ...CLAUDE], { home, proj });
  assert.equal(again.code, 0, again.stderr);
  assert.match(again.stdout, /already matches the backup: seo/);
  assertWarnsOnce(again);
});

test('S-08/S-09: restoring a recovered (corrupt) seo backup warns via the library fallback', async () => {
  const { home, proj } = await makeSandbox();
  const backupId = await makeSeoBackup(home, proj);
  // Corrupt backup.json: the restore recovers the record from the
  // items/ directory, which carries no manifest entry — so the
  // warning must come from the library lookup by skill name.
  const backupJson = path.join(proj, '.claude', '.skillforge-backups', backupId, 'backup.json');
  await writeFile(backupJson, 'this is not json');
  await rm(path.join(proj, '.claude', 'skills', 'seo'), { recursive: true, force: true });
  const restored = await runCli(['restore', backupId, ...CLAUDE], { home, proj });
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stdout, /restored seo/);
  assertWarnsOnce(restored);
});

test('S-08/S-09: restoring a non-agentic backup warns about nothing', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  const forced = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--force'], { home, proj });
  assert.equal(forced.code, 0, forced.stderr);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  await rm(path.join(proj, '.claude', 'skills', 'nextjs'), { recursive: true, force: true });
  const dry = await runCli(['restore', backupId, ...CLAUDE, '--dry-run'], { home, proj });
  assert.equal(dry.code, 0, dry.stderr);
  assertWarnsNothing(dry);
  const restored = await runCli(['restore', backupId, ...CLAUDE], { home, proj });
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stdout, /restored nextjs/);
  assertWarnsNothing(restored);
});

test('S-08/S-09: --force overwrite of the seo skill still warns (no flag suppresses the warnings)', async () => {
  const { home, proj } = await makeSandbox();
  const install = await runCli(['install', ...CLAUDE, '--skill', 'seo', ALLOW], { home, proj });
  assert.equal(install.code, 0, install.stderr);
  assertWarnsOnce(install);
  // --force skips the overwrite prompt; it must not skip the
  // warnings. There is no --quiet/--silent flag in the CLI.
  await appendFile(path.join(proj, '.claude', 'skills', 'seo', 'SKILL.md'), '\nMY EDIT\n');
  const forced = await runCli(['install', ...CLAUDE, '--skill', 'seo', '--force', ALLOW], { home, proj });
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(forced.stdout, /updated seo/);
  assertWarnsOnce(forced);
});
