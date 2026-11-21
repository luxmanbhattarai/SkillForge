// installer.test.mjs — end-to-end tests for the SkillForge
// installer CLI. Every test runs the real CLI as a child process in
// its own temp sandbox (fake HOME + fake project dir) and never
// touches the real home directory or real agent directories.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { access, appendFile, chmod, cp, lstat, mkdir, readFile, readlink, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  INSTALLER,
  REPO_ROOT,
  exists,
  listNames,
  makeFixtureLibrary,
  makeSandbox,
  readJson,
  runCli,
  runCliPty,
} from './helpers.mjs';

const CLAUDE = ['--target', 'claude-code', '--scope', 'project'];

test('fresh install: skill dir, SKILL.md, and manifest', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /installed nextjs/);
  const skillDir = path.join(proj, '.claude', 'skills', 'nextjs');
  assert.equal(await exists(path.join(skillDir, 'SKILL.md')), true);
  const installed = await readFile(path.join(skillDir, 'SKILL.md'), 'utf8');
  const library = await readFile(path.join(REPO_ROOT, 'skills', 'frontend', 'nextjs', 'SKILL.md'), 'utf8');
  assert.equal(installed, library);
  const manifest = await readJson(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json'));
  assert.equal(manifest.format, 1);
  assert.equal(manifest.target, 'claude-code');
  const entry = manifest.items['skill:nextjs'];
  assert.equal(entry.kind, 'skill');
  assert.equal(entry.method, 'copy');
  assert.equal(entry.source, 'skills/frontend/nextjs');
  assert.ok(entry.sourceHash.startsWith('sha256:'));
  assert.ok(entry.files['nextjs/SKILL.md'].startsWith('sha256:'));
});

test('legacy invocation (no command + --skills) still works', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['--target', 'claude-code', '--scope', 'project', '--skills', 'astro,nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md')), true);
});

test('selective install installs only the named skills', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'skills-out', '--skill', 'astro', '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(await listNames(path.join(proj, 'skills-out')), ['.skillforge-manifest.json', 'astro', 'nextjs']);
});

test('category install installs exactly that category', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'out', '--category', 'metadata'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(await listNames(path.join(proj, 'out')), [
    '.skillforge-manifest.json',
    'dynamic-metadata',
    'metadata-validation',
    'open-graph',
    'seo-metadata',
    'social-sharing',
    'twitter-cards',
  ]);
});

test('bare install installs all skills (fixture library)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const r = await runCli(['install', '--dest', 'out'], {
    home,
    proj,
    env: { SKILLFORGE_ROOT: fixture.root },
  });
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(await listNames(path.join(proj, 'out')), ['.skillforge-manifest.json', 'fixture-one', 'fixture-two']);
});

test('user-scope install lands under the (sandboxed) home directory', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--target', 'claude-code', '--scope', 'user', '--skill', 'astro'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(home, '.claude', 'skills', 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.claude')), false);
});

test('codex installs to the current documented path .agents/skills', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--target', 'codex', '--scope', 'project', '--skill', 'astro'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, '.agents', 'skills', 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.codex', 'skills')), false);
  const ru = await runCli(['install', '--target', 'codex', '--scope', 'user', '--skill', 'astro'], { home, proj });
  assert.equal(ru.code, 0, ru.stderr);
  assert.equal(await exists(path.join(home, '.agents', 'skills', 'astro', 'SKILL.md')), true);
});

test('antigravity installs to .agents/skills and ~/.gemini/config/skills', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--target', 'antigravity', '--scope', 'project', '--skill', 'astro'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, '.agents', 'skills', 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.agent', 'skills')), false);
  const ru = await runCli(['install', '--target', 'antigravity', '--scope', 'user', '--skill', 'astro'], { home, proj });
  assert.equal(ru.code, 0, ru.stderr);
  assert.equal(await exists(path.join(home, '.gemini', 'config', 'skills', 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(home, '.agent', 'skills')), false);
});

test('target alias --target claude works', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--target', 'claude', '--scope', 'project', '--skill', 'astro'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'astro', 'SKILL.md')), true);
});

test('dry-run changes nothing', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--dry-run'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /would install nextjs/);
  assert.equal(await exists(path.join(proj, '.claude')), false);
  // Dry-run also refuses nothing: it only reports.
  const r2 = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  const r3 = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--dry-run'], { home, proj });
  assert.equal(r3.code, 0, r3.stderr);
  assert.match(r3.stdout, /would refuse nextjs/);
  assert.match(await readFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
});

test('repeated install is an idempotent no-op', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  const before = await readFile(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json'), 'utf8');
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /already installed: nextjs/);
  assert.match(r.stdout, /already installed 1/);
  const after = await readFile(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json'), 'utf8');
  assert.equal(after, before);
});

test('conflicting files are refused without --force, and user content survives', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /refused: nextjs/);
  assert.match(r.stderr, /--force/);
  assert.match(await readFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
  // Foreign content (never installed by this tool) is refused too.
  const r2 = await runCli(['install', ...CLAUDE, '--skill', 'astro'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  await rm(path.join(proj, '.claude', 'skills', 'astro'), { recursive: true });
  await mkdir(path.join(proj, '.claude', 'skills', 'astro'), { recursive: true });
  await writeFile(path.join(proj, '.claude', 'skills', 'astro', 'mine.txt'), 'not yours');
  const r3 = await runCli(['install', ...CLAUDE, '--skill', 'astro', '--force'], { home, proj });
  assert.equal(r3.code, 0, r3.stderr);
  // The foreign content was backed up, not destroyed.
  const backups = await listNames(path.join(proj, '.claude', '.skillforge-backups'));
  assert.equal(backups.length, 1);
  const backup = await readJson(path.join(proj, '.claude', '.skillforge-backups', backups[0], 'backup.json'));
  assert.equal(backup.items[0].name, 'astro');
});

test('force replacement backs up first; restore brings the old content back', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--force'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Backup created: (\S+)/);
  const backupId = r.stdout.match(/Backup created: (\S+)/)[1];
  assert.doesNotMatch(await readFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);

  const list = await runCli(['restore', '--list', ...CLAUDE], { home, proj });
  assert.equal(list.code, 0, list.stderr);
  assert.match(list.stdout, new RegExp(backupId));

  const restored = await runCli(['restore', backupId, ...CLAUDE], { home, proj });
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stdout, /restored nextjs/);
  assert.match(await readFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
  // The restore itself was reversible: a pre-restore backup exists now.
  const list2 = await runCli(['restore', '--list', ...CLAUDE], { home, proj });
  assert.match(list2.stdout, /pre-restore/);
});

test('backup location is a sibling of the skills dir, never inside it', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--force'], { home, proj });
  // No backup directory inside the skills dir (agents scan it).
  assert.equal(await exists(path.join(proj, '.claude', 'skills', '.skillforge-backups')), false);
  assert.equal((await listNames(path.join(proj, '.claude', '.skillforge-backups'))).length, 1);
});

test('uninstall removes the skill and its manifest entry', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs,astro'], { home, proj });
  const r = await runCli(['uninstall', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /removed nextjs/);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs')), false);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'astro', 'SKILL.md')), true);
  const manifest = await readJson(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json'));
  assert.equal(manifest.items['skill:nextjs'], undefined);
  assert.ok(manifest.items['skill:astro']);
  const r2 = await runCli(['uninstall', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /not installed: nextjs/);
});

test('uninstall refuses modified content without --force', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  const r = await runCli(['uninstall', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /refused: nextjs/);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md')), true);
  const r2 = await runCli(['uninstall', ...CLAUDE, '--skill', 'nextjs', '--force'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs')), false);
  assert.equal((await listNames(path.join(proj, '.claude', '.skillforge-backups'))).length, 1);
});

test('uninstall --all needs --force non-interactively', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs,astro'], { home, proj });
  const r = await runCli(['uninstall', ...CLAUDE, '--all'], { home, proj });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /--force/);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs')), true);
  const r2 = await runCli(['uninstall', ...CLAUDE, '--all', '--force'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs')), false);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'astro')), false);
});

test('update reinstalls from the current library (fixture)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const r = await runCli(['update', ...dest], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /updated fixture-one/);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /Version two body/);
  // Second update is a no-op.
  const r2 = await runCli(['update', ...dest], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /already installed: fixture-one/);
});

test('update refuses user-modified installs without --force (fixture)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  await appendFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), '\nMY EDIT\n');
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const r = await runCli(['update', ...dest], { home, proj, env });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /refused: fixture-one/);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /MY EDIT/);
  const r2 = await runCli(['update', ...dest, '--force'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /Version two body/);
});

test('update with no manifest explains itself', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['update', ...CLAUDE], { home, proj });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /No manifest/);
  assert.match(r.stderr, /install/);
});

test('manifest corruption: list falls back to a scan, doctor fails, install repairs', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  const manifestPath = path.join(proj, '.claude', 'skills', '.skillforge-manifest.json');
  await writeFile(manifestPath, '{ this is not json');
  const list = await runCli(['list', ...CLAUDE], { home, proj });
  assert.equal(list.code, 0, list.stderr);
  assert.match(list.stdout, /nextjs/);
  assert.match(list.stdout, /corrupt/);
  const doctor = await runCli(['doctor', ...CLAUDE], { home, proj });
  assert.equal(doctor.code, 1);
  assert.match(doctor.stdout, /FAIL.*manifest is corrupt/);
  const reinstall = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(reinstall.code, 0, reinstall.stderr);
  assert.match(reinstall.stderr, /manifest.*corrupt/);
  const manifest = await readJson(manifestPath);
  assert.ok(manifest.items['skill:nextjs']);
  const quarantined = (await listNames(path.join(proj, '.claude', 'skills'))).filter((n) => n.startsWith('.skillforge-manifest.json.corrupt-'));
  assert.equal(quarantined.length, 1);
});

test('unknown skill, category, and target errors are clear and exit 2', async () => {
  const { home, proj } = await makeSandbox();
  const r1 = await runCli(['install', ...CLAUDE, '--skill', 'no-such-skill'], { home, proj });
  assert.equal(r1.code, 2);
  assert.match(r1.stderr, /unknown skill 'no-such-skill'/);
  const r2 = await runCli(['install', ...CLAUDE, '--category', 'no-such-category'], { home, proj });
  assert.equal(r2.code, 2);
  assert.match(r2.stderr, /unknown category 'no-such-category'/);
  const r3 = await runCli(['install', '--target', 'no-such-target', '--skill', 'nextjs'], { home, proj });
  assert.equal(r3.code, 2);
  assert.match(r3.stderr, /Unknown target 'no-such-target'/);
  const r4 = await runCli(['install', ...CLAUDE, '--agent', 'no-such-agent'], { home, proj });
  assert.equal(r4.code, 2);
  assert.match(r4.stderr, /unknown agent 'no-such-agent'/);
  const r5 = await runCli(['frobnicate'], { home, proj });
  assert.equal(r5.code, 2);
});

test('--link creates a symlink, is idempotent, and uninstall removes only the link', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--link'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const linkPath = path.join(proj, '.claude', 'skills', 'nextjs');
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal(await readlink(linkPath), path.join(REPO_ROOT, 'skills', 'frontend', 'nextjs'));
  const manifest = await readJson(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json'));
  assert.equal(manifest.items['skill:nextjs'].method, 'link');
  const r2 = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--link'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /already installed: nextjs/);
  const r3 = await runCli(['uninstall', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r3.code, 0, r3.stderr);
  assert.equal(await exists(linkPath), false);
  // The library source is untouched.
  assert.equal(await exists(path.join(REPO_ROOT, 'skills', 'frontend', 'nextjs', 'SKILL.md')), true);
});

test('--link with an agent copies the agent (transformed) and says so', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--agent', 'frontend-specialist', '--link'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /always copied/);
  const agentPath = path.join(proj, '.claude', 'agents', 'frontend-specialist.md');
  assert.equal((await lstat(agentPath)).isSymbolicLink(), false);
});

test('agent install: Claude Code gets Markdown with frontmatter', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--agent', 'frontend-specialist'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const installed = await readFile(path.join(proj, '.claude', 'agents', 'frontend-specialist.md'), 'utf8');
  assert.match(installed, /^---\nname: frontend-specialist\ndescription: '/);
  assert.match(installed, /# Frontend Specialist/);
  const manifest = await readJson(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json'));
  const entry = manifest.items['agent:frontend-specialist'];
  assert.equal(entry.root, '../agents');
  assert.equal(entry.destName, 'frontend-specialist.md');
  const r2 = await runCli(['install', ...CLAUDE, '--agent', 'frontend-specialist'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /already installed: frontend-specialist \(agent\)/);
});

test('agent install: Codex gets a TOML file', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--target', 'codex', '--scope', 'project', '--agent', 'security-specialist'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const installed = await readFile(path.join(proj, '.codex', 'agents', 'security-specialist.toml'), 'utf8');
  assert.match(installed, /^name = "security-specialist"$/m);
  assert.match(installed, /^description = "Finds and fixes security weaknesses/m);
  assert.match(installed, /^developer_instructions = """\n# Security Specialist/m);
  assert.ok(installed.endsWith('"""\n'));
  // The Markdown body survived the conversion intact.
  const library = await readFile(path.join(REPO_ROOT, 'agents', 'security-specialist.md'), 'utf8');
  assert.ok(installed.includes(library));
});

test('agent install: Cursor and Antigravity locations', async () => {
  const { home, proj } = await makeSandbox();
  const r1 = await runCli(['install', '--target', 'cursor', '--scope', 'project', '--agent', 'seo-specialist'], { home, proj });
  assert.equal(r1.code, 0, r1.stderr);
  assert.equal(await exists(path.join(proj, '.cursor', 'agents', 'seo-specialist.md')), true);
  const r2 = await runCli(['install', '--target', 'antigravity', '--scope', 'user', '--agent', 'seo-specialist'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.equal(await exists(path.join(home, '.gemini', 'config', 'agents', 'seo-specialist.md')), true);
});

test('agent install without --target is a clear error', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'out', '--agent', 'seo-specialist'], { home, proj });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /needs --target/);
});

test('workflow install works only for Antigravity, with a deprecation warning', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--target', 'antigravity', '--scope', 'project', '--workflow', 'seo-audit'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /deprecated by Google/);
  const installed = await readFile(path.join(proj, '.agents', 'workflows', 'seo-audit.md'), 'utf8');
  assert.match(installed, /^---\nname: seo-audit\ndescription: '/);
  const bad = await runCli(['install', ...CLAUDE, '--workflow', 'seo-audit'], { home, proj });
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /no workflow install location/);
  const bad2 = await runCli(['install', '--target', 'cursor', '--scope', 'project', '--workflow', 'seo-audit'], { home, proj });
  assert.equal(bad2.code, 2);
  const bad3 = await runCli(['install', '--target', 'codex', '--scope', 'project', '--workflow', 'seo-audit'], { home, proj });
  assert.equal(bad3.code, 2);
});

test('doctor: healthy install passes; tampering warns; a missing skill fails', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs,astro'], { home, proj });
  const ok = await runCli(['doctor', ...CLAUDE], { home, proj });
  assert.equal(ok.code, 0, ok.stdout);
  assert.match(ok.stdout, /0 failures, 0 warnings/);

  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  const warned = await runCli(['doctor', ...CLAUDE], { home, proj });
  assert.equal(warned.code, 0); // user edits are warnings, not failures
  assert.match(warned.stdout, /WARN.*nextjs differs from the manifest/);

  await rm(path.join(proj, '.claude', 'skills', 'astro'), { recursive: true });
  const failed = await runCli(['doctor', ...CLAUDE], { home, proj });
  assert.equal(failed.code, 1);
  assert.match(failed.stdout, /FAIL.*stale: astro/);
});

test('doctor reports legacy-path installs', async () => {
  const { home, proj } = await makeSandbox();
  await mkdir(path.join(proj, '.codex', 'skills', 'nextjs'), { recursive: true });
  await writeFile(path.join(proj, '.codex', 'skills', 'nextjs', 'SKILL.md'), '# x\n');
  const r = await runCli(['doctor', '--target', 'codex', '--scope', 'project'], { home, proj });
  assert.equal(r.code, 0); // legacy installs warn, they do not fail
  assert.match(r.stdout, /legacy location/);
});

test('doctor --json is machine-readable', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  const r = await runCli(['doctor', ...CLAUDE, '--json'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.equal(data.ok, true);
  assert.equal(data.fails, 0);
  assert.equal(data.locations.length, 1);
});

test('validate passes on a good install and fails on a renamed skill', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  const ok = await runCli(['validate', ...CLAUDE], { home, proj });
  assert.equal(ok.code, 0, ok.stdout);
  assert.match(ok.stdout, /1 passed, 0 failed/);

  const skillMd = path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md');
  const text = await readFile(skillMd, 'utf8');
  await writeFile(skillMd, text.replace('name: nextjs', 'name: something-else'));
  const bad = await runCli(['validate', ...CLAUDE], { home, proj });
  assert.equal(bad.code, 1);
  assert.match(bad.stdout, /FAIL: nextjs — frontmatter name 'something-else' does not match directory 'nextjs'/);
});

test('validate fails when SKILL.md is missing', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await rm(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'));
  const r = await runCli(['validate', ...CLAUDE], { home, proj });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /SKILL.md is missing/);
});

test('list --json is machine-readable; empty list reports nothing installed', async () => {
  const { home, proj } = await makeSandbox();
  const empty = await runCli(['list', ...CLAUDE], { home, proj });
  assert.equal(empty.code, 0, empty.stderr);
  assert.match(empty.stdout, /nothing installed/);
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  const r = await runCli(['list', ...CLAUDE, '--json'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].name, 'nextjs');
  assert.equal(data.items[0].method, 'copy');
});

test('restore --list with no backups reports none; unknown id is a clear error', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['restore', '--list', ...CLAUDE], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /\(none\)/);
  const r2 = await runCli(['restore', 'no-such-backup', ...CLAUDE], { home, proj });
  assert.equal(r2.code, 2);
  assert.match(r2.stderr, /No backup 'no-such-backup'/);
});

test('interrupted install: a copy failure leaves no half-installed skill', async () => {
  // A destination whose parent is a file cannot be created: the
  // install must fail cleanly with no partial skill directory.
  const { home, proj } = await makeSandbox();
  await writeFile(path.join(proj, 'blocker'), 'a file, not a directory');
  const r = await runCli(['install', '--dest', 'blocker/skills', '--skill', 'nextjs'], { home, proj });
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /failed: nextjs/);
  assert.equal(await exists(path.join(proj, 'blocker', 'skills')), false);
});

test('interrupted install (unit): a staging failure cleans up after itself', async () => {
  // Copying a directory into itself fails; stageItem must reject
  // and leave no staging directory behind.
  const { stageItem } = await import('../scripts/install/installer.mjs');
  const { base } = await makeSandbox();
  const src = path.join(base, 'src');
  await mkdir(src, { recursive: true });
  await writeFile(path.join(src, 'SKILL.md'), '# test\n');
  const planned = {
    kind: 'skill',
    name: 'selfcopy',
    rootDir: path.join(src, 'nested'),
    destName: 'selfcopy',
    destAbs: path.join(src, 'nested', 'selfcopy'),
    sourceAbs: src,
    method: 'copy',
    rendered: null,
  };
  await assert.rejects(() => stageItem(planned));
  assert.deepEqual(await listNames(path.join(src, 'nested')), []);
  // The source tree is untouched.
  assert.equal(await readFile(path.join(src, 'SKILL.md'), 'utf8'), '# test\n');
});

test('permission error: install into a read-only skills dir fails cleanly, no partial install', async () => {
  // The skills directory is read-only (mode 555), so staging/copying
  // fails with EACCES. The install must fail with a clear error and
  // leave no half-installed skill behind.
  //
  // Root bypasses permission checks, so when the suite runs as root
  // the CLI runs as `nobody` via su. The repo scripts are not
  // readable by nobody, so a byte-identical copy of scripts/ is
  // placed inside the fixture library (whose root the copied CLI
  // then uses as its library root) and the sandbox is chowned to
  // nobody. Skips on Windows (chmod does not produce EACCES there)
  // and when su is unavailable.
  if (process.platform === 'win32') {
    test.skip('chmod-based permission errors do not apply on Windows');
    return;
  }
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const skillsDir = path.join(proj, '.claude', 'skills');
  await mkdir(skillsDir, { recursive: true });
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  let r;
  try {
    if (isRoot) {
      try {
        await access('/usr/bin/su');
      } catch {
        test.skip('su not available');
        return;
      }
      await cp(path.join(REPO_ROOT, 'scripts'), path.join(fixture.root, 'scripts'), { recursive: true });
      await new Promise((resolve, reject) => {
        execFile('chown', ['-R', 'nobody:nogroup', base], (err) => (err ? reject(err) : resolve()));
      });
      await chmod(skillsDir, 0o555);
      const cmd = `HOME='${home}' ${process.execPath} '${path.join(fixture.root, 'scripts', 'install-skills.mjs')}' install --target claude-code --scope project --skill fixture-one`;
      r = await new Promise((resolve) => {
        execFile('/usr/bin/su', ['-s', '/bin/sh', 'nobody', '-c', cmd], { cwd: proj, timeout: 60000 }, (err, stdout, stderr) => {
          resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
        });
      });
    } else {
      await chmod(skillsDir, 0o555);
      r = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one'], {
        home,
        proj,
        env: { SKILLFORGE_ROOT: fixture.root },
      });
    }
    assert.notEqual(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /failed: fixture-one/, r.stderr);
    assert.match(r.stderr, /EACCES|permission denied/i, r.stderr);
    assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);
  } finally {
    await chmod(skillsDir, 0o755).catch(() => {});
  }
});

test('interactive conflict prompt: overwrite answers yes, skip answers no', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs,astro'], { home, proj });
  await appendFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  await appendFile(path.join(proj, '.claude', 'skills', 'astro', 'SKILL.md'), '\nMY EDIT\n');

  const r = await runCliPty(['install', ...CLAUDE, '--skill', 'nextjs,astro'], {
    home,
    proj,
    input: 'o\ns\n',
  });
  if (r.skipped) {
    test.skip(r.reason || 'no PTY available');
    return;
  }
  assert.equal(r.code, 0, r.output);
  assert.match(r.output, /Overwrite it/);
  // nextjs was overwritten (edit gone), astro was skipped (edit kept).
  assert.doesNotMatch(await readFile(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
  assert.match(await readFile(path.join(proj, '.claude', 'skills', 'astro', 'SKILL.md'), 'utf8'), /MY EDIT/);
});

test('--dest with --target: skills go to --dest, agents to the target agents dir', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(
    ['install', '--target', 'claude-code', '--scope', 'project', '--dest', 'custom-skills', '--skill', 'astro', '--agent', 'seo-specialist'],
    { home, proj },
  );
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, 'custom-skills', 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.claude', 'agents', 'seo-specialist.md')), true);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'astro')), false);
});

test('install adopts content identical to the library', async () => {
  const { home, proj } = await makeSandbox();
  // Simulate a hand-copied skill: identical bytes, no manifest.
  const { cp } = await import('node:fs/promises');
  await cp(path.join(REPO_ROOT, 'skills', 'frontend', 'astro'), path.join(proj, 'out', 'astro'), { recursive: true });
  const r = await runCli(['install', '--dest', 'out', '--skill', 'astro'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /already installed: astro \(adopted into the manifest\)/);
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.ok(manifest.items['skill:astro']);
});

test('help and version work', async () => {
  const { home, proj } = await makeSandbox();
  const h = await runCli(['--help'], { home, proj });
  assert.equal(h.code, 0);
  assert.match(h.stdout, /SkillForge installer/);
  assert.match(h.stdout, /restore/);
  const v = await runCli(['--version'], { home, proj });
  assert.equal(v.code, 0);
  assert.match(v.stdout, /skillforge-installer \d+\.\d+\.\d+/);
});

// ---------------------------------------------------------------- A-02: manifest traversal

/** Install fixture-one from a fixture library; returns its env + manifest path. */
async function installFixtureSkill(base, home, proj) {
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  return { env, manifestFile: path.join(proj, 'out', '.skillforge-manifest.json') };
}

test('A-02: manifest with an absolute root is corrupt; update/uninstall refuse, sentinel untouched', async () => {
  const { base, home, proj } = await makeSandbox();
  const { env, manifestFile } = await installFixtureSkill(base, home, proj);
  const sentinelDir = path.join(base, 'outside');
  await mkdir(sentinelDir, { recursive: true });
  const sentinel = path.join(sentinelDir, 'keep.txt');
  await writeFile(sentinel, 'KEEP\n');

  const manifest = await readJson(manifestFile);
  manifest.items['skill:fixture-one'].root = sentinelDir; // absolute root
  manifest.items['skill:fixture-one'].destName = 'keep.txt';
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));

  const dest = ['--dest', 'out'];
  const update = await runCli(['update', ...dest], { home, proj, env });
  assert.equal(update.code, 1);
  assert.match(update.stderr, /corrupt: invalid manifest entry/);
  const uninstall = await runCli(['uninstall', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(uninstall.code, 1);
  assert.match(uninstall.stderr, /corrupt: invalid manifest entry/);
  // Even --force uninstall must not follow the crafted entry: it
  // falls back to the skills dir and leaves the sentinel alone.
  const forced = await runCli(['uninstall', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stderr);
  assert.equal(await readFile(sentinel, 'utf8'), 'KEEP\n');

  // Install quarantines the malicious manifest instead of trusting it.
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  const reinstall = await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(reinstall.code, 0, reinstall.stderr);
  assert.match(reinstall.stderr, /corrupt: invalid manifest entry/);
  const quarantined = (await listNames(path.join(proj, 'out'))).filter((n) => n.startsWith('.skillforge-manifest.json.corrupt-'));
  assert.equal(quarantined.length, 1);
  assert.equal(await readFile(sentinel, 'utf8'), 'KEEP\n');
});

test('A-02: relative root escape and destName traversal are corrupt', async () => {
  const { base, home, proj } = await makeSandbox();
  const { env, manifestFile } = await installFixtureSkill(base, home, proj);
  // Sentinel 1: reachable via a root escape from proj/out.
  const outside = path.join(proj, 'outside');
  await mkdir(path.join(outside, 'fixture-one'), { recursive: true });
  const sentinel1 = path.join(outside, 'fixture-one', 'keep.txt');
  await writeFile(sentinel1, 'KEEP\n');
  // Sentinel 2: reachable via a destName escape from proj/out.
  const sentinel2 = path.join(proj, 'keep.txt');
  await writeFile(sentinel2, 'KEEP\n');

  const cases = [
    { root: '../outside', destName: 'fixture-one' }, // root escape (destName matches, so only the root check fires)
    { root: '.', destName: '../keep.txt' }, // destName escape
    { root: '.', destName: '../../keep.txt' },
    { root: '.', destName: '/etc/passwd' }, // absolute destName
    { root: '..', destName: 'fixture-one' }, // bare climb
    { root: '../../etc', destName: 'fixture-one' },
    { root: '.', destName: 'other-skill' }, // destName/name mismatch
  ];
  for (const c of cases) {
    const manifest = await readJson(manifestFile);
    manifest.items['skill:fixture-one'].root = c.root;
    manifest.items['skill:fixture-one'].destName = c.destName;
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
    const update = await runCli(['update', '--dest', 'out'], { home, proj, env });
    assert.equal(update.code, 1, JSON.stringify(c));
    assert.match(update.stderr, /corrupt: invalid manifest entry/, JSON.stringify(c));
    const uninstall = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(uninstall.code, 1, JSON.stringify(c));
    assert.match(uninstall.stderr, /corrupt: invalid manifest entry/, JSON.stringify(c));
  }
  assert.equal(await readFile(sentinel1, 'utf8'), 'KEEP\n');
  assert.equal(await readFile(sentinel2, 'utf8'), 'KEEP\n');
});

test('A-02: legitimate manifest roots validate (codex agent, claude agent, --dest agent)', async () => {
  const { home, proj } = await makeSandbox();
  // Codex agent: root '../../.codex/agents' — outside the skills
  // dir's parent tree, but a root the installer itself produces.
  const c = await runCli(['install', '--target', 'codex', '--scope', 'project', '--agent', 'security-specialist'], { home, proj });
  assert.equal(c.code, 0, c.stderr);
  const manifestC = await readJson(path.join(proj, '.agents', 'skills', '.skillforge-manifest.json'));
  assert.equal(manifestC.items['agent:security-specialist'].root, '../../.codex/agents');
  const cu = await runCli(['update', '--target', 'codex', '--scope', 'project'], { home, proj });
  assert.equal(cu.code, 0, cu.stderr);
  assert.match(cu.stdout, /already installed: security-specialist \(agent\)/);
  const cd = await runCli(['doctor', '--target', 'codex', '--scope', 'project'], { home, proj });
  assert.equal(cd.code, 0, cd.stdout);
  const cr = await runCli(['uninstall', '--target', 'codex', '--scope', 'project', '--agent', 'security-specialist'], { home, proj });
  assert.equal(cr.code, 0, cr.stderr);

  // Claude Code agent: root '../agents'.
  const a = await runCli(['install', ...CLAUDE, '--agent', 'frontend-specialist'], { home, proj });
  assert.equal(a.code, 0, a.stderr);
  const au = await runCli(['update', ...CLAUDE], { home, proj });
  assert.equal(au.code, 0, au.stderr);

  // --dest + --target agent: root '../.claude/agents' (tier-2 shape).
  const d = await runCli(['install', '--target', 'claude-code', '--scope', 'project', '--dest', 'custom-skills', '--agent', 'seo-specialist'], { home, proj });
  assert.equal(d.code, 0, d.stderr);
  const manifestD = await readJson(path.join(proj, 'custom-skills', '.skillforge-manifest.json'));
  assert.equal(manifestD.items['agent:seo-specialist'].root, '../.claude/agents');
  const du = await runCli(['update', '--dest', 'custom-skills'], { home, proj });
  assert.equal(du.code, 0, du.stderr);
  assert.match(du.stdout, /already installed: seo-specialist \(agent\)/);
});

// ---------------------------------------------------------------- A-03: restore traversal

test('A-03: restore rejects traversal backup ids', async () => {
  const { base, home, proj } = await makeSandbox();
  // A decoy backup.json outside the backups dir: a traversal id
  // must never reach it.
  const evilDir = path.join(base, 'evil');
  await mkdir(evilDir, { recursive: true });
  await writeFile(path.join(evilDir, 'backup.json'), JSON.stringify({
    id: 'evil', created: '2026-01-01T00:00:00.000Z', items: [],
  }));
  for (const id of ['../../evil', '..', '/tmp/evil', 'a/b']) {
    const r = await runCli(['restore', id, '--dest', 'out'], { home, proj });
    assert.equal(r.code, 2, `id=${JSON.stringify(id)}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /Invalid backup id/, `id=${JSON.stringify(id)}: ${r.stderr}`);
  }
});

test('A-03: restore rejects crafted backup.json (storedAs / root / destName / fileName traversal)', async () => {
  const { home, proj } = await makeSandbox();
  const skillsDir = path.join(proj, 'out');
  const backupsBase = path.join(proj, '.skillforge-backups');
  await mkdir(skillsDir, { recursive: true });
  // Sentinels a traversal would delete or overwrite.
  const outside = path.join(proj, 'outside');
  await mkdir(outside, { recursive: true });
  await writeFile(path.join(outside, 'keep.txt'), 'KEEP\n');
  await writeFile(path.join(proj, 'keep.txt'), 'KEEP\n');

  const baseItem = {
    kind: 'skill', name: 'victim', storedAs: '0-skill-victim',
    isSymlink: false, isDirectory: true, fileName: null,
    root: '.', destName: 'victim',
    entry: { kind: 'skill', name: 'victim', root: '.', destName: 'victim', method: 'copy' },
  };
  const cases = [
    { name: 'storedAs escape', patch: { storedAs: '../../outside' } },
    { name: 'storedAs absolute', patch: { storedAs: '/etc/passwd' } },
    {
      name: 'entry root escape',
      patch: {
        root: '../outside',
        destName: 'keep.txt',
        entry: { kind: 'skill', name: 'victim', root: '../outside', destName: 'keep.txt', method: 'copy' },
      },
    },
    {
      name: 'destName escape',
      patch: {
        destName: '../keep.txt',
        entry: { kind: 'skill', name: 'victim', root: '.', destName: '../keep.txt', method: 'copy' },
      },
    },
    { name: 'fileName escape', patch: { isDirectory: false, fileName: '../../keep.txt' } },
  ];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const id = `crafted-${i}`;
    const dir = path.join(backupsBase, id, 'items', '0-skill-victim');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'SKILL.md'), '# victim\n');
    const record = {
      id, created: '2026-01-01T00:00:00.000Z', tool: 'skillforge-installer',
      target: null, scope: 'project', reason: 'test', command: 'install',
      items: [{ ...baseItem, ...c.patch }],
    };
    await writeFile(path.join(backupsBase, id, 'backup.json'), JSON.stringify(record, null, 2));
    const r = await runCli(['restore', id, '--dest', 'out'], { home, proj });
    assert.equal(r.code, 2, `${c.name}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /is invalid: backup item/, `${c.name}: ${r.stderr}`);
  }
  assert.equal(await readFile(path.join(outside, 'keep.txt'), 'utf8'), 'KEEP\n');
  assert.equal(await readFile(path.join(proj, 'keep.txt'), 'utf8'), 'KEEP\n');
});

// ---------------------------------------------------------------- A-04: concurrency

test('A-04: two concurrent installs — one fails cleanly on the lock, manifest stays complete', async () => {
  const { home, proj } = await makeSandbox();
  const registry = await readJson(path.join(REPO_ROOT, 'registry', 'skills.json'));
  const [a, b] = await Promise.all([
    runCli(['install', '--dest', 'out'], { home, proj }),
    runCli(['install', '--dest', 'out'], { home, proj }),
  ]);
  const codes = [a.code, b.code].sort();
  assert.deepEqual(codes, [0, 1]);
  const loser = a.code === 1 ? a : b;
  assert.match(loser.stderr, /Another SkillForge installer run is already using/);
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.equal(Object.keys(manifest.items).length, registry.total_skills);
  // The lock is released when the winner exits.
  assert.equal(await exists(path.join(proj, 'out', '.skillforge-lock')), false);
});

test('A-04: live lock blocks, stale lock (dead pid + old) is taken over, fresh dead-pid lock is not', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const skillsDir = path.join(proj, 'out');
  await mkdir(skillsDir, { recursive: true });
  const lockFile = path.join(skillsDir, '.skillforge-lock');
  const writeLock = async (pid, ageMs) => {
    await writeFile(lockFile, JSON.stringify({
      pid, startedAt: new Date(Date.now() - ageMs).toISOString(), command: 'install', token: 'test-token',
    }) + '\n');
    const t = new Date(Date.now() - ageMs);
    await utimes(lockFile, t, t);
  };
  const install = () => runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });

  // Live pid (this test process): the run fails fast, installs nothing.
  await writeLock(process.pid, 0);
  const live = await install();
  assert.equal(live.code, 1);
  assert.match(live.stderr, /Another SkillForge installer run is already using/);
  assert.match(live.stderr, new RegExp(`pid ${process.pid}`));
  assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);

  // Dead pid, but the lock is fresh: still refused (takeover needs
  // a dead pid AND an old lock).
  const dead = spawnSync(process.execPath, ['--version']);
  assert.equal(dead.status, 0);
  await writeLock(dead.pid, 0);
  const fresh = await install();
  assert.equal(fresh.code, 1);
  assert.match(fresh.stderr, /Another SkillForge installer run is already using/);
  assert.match(fresh.stderr, /looks stale/);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);

  // Dead pid + old lock: taken over, install succeeds, lock released.
  await writeLock(dead.pid, 60 * 60 * 1000);
  const stale = await install();
  assert.equal(stale.code, 0, stale.stderr);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(lockFile), false);
});

// ---------------------------------------------------------------- A-05: swap/rollback

test('A-05: swapIn happy path replaces content and cleans up (unit)', async () => {
  const { swapIn } = await import('../scripts/install/installer.mjs');
  const { base } = await makeSandbox();
  const parent = path.join(base, 'skills');
  await mkdir(parent, { recursive: true });
  const destAbs = path.join(parent, 'item');
  const stagedAbs = path.join(parent, '.skillforge-tmp-item-test');
  await mkdir(destAbs, { recursive: true });
  await writeFile(path.join(destAbs, 'old.txt'), 'OLD\n');
  await mkdir(stagedAbs, { recursive: true });
  await writeFile(path.join(stagedAbs, 'new.txt'), 'NEW\n');
  await swapIn(stagedAbs, destAbs);
  assert.equal(await readFile(path.join(destAbs, 'new.txt'), 'utf8'), 'NEW\n');
  assert.equal(await exists(path.join(destAbs, 'old.txt')), false);
  assert.deepEqual(await listNames(parent), ['item']);
  // No existing destination: single rename.
  const dest2 = path.join(parent, 'item2');
  const staged2 = path.join(parent, '.skillforge-tmp-item2-test');
  await mkdir(staged2, { recursive: true });
  await writeFile(path.join(staged2, 'x.txt'), 'X\n');
  await swapIn(staged2, dest2);
  assert.equal(await readFile(path.join(dest2, 'x.txt'), 'utf8'), 'X\n');
});

test('A-05: swapIn rolls back when the second rename fails (unit, fault-injected)', async () => {
  const { swapIn } = await import('../scripts/install/installer.mjs');
  const { base } = await makeSandbox();
  const parent = path.join(base, 'skills');
  await mkdir(parent, { recursive: true });
  const destAbs = path.join(parent, 'item');
  const stagedAbs = path.join(parent, '.skillforge-tmp-item-test');
  await mkdir(destAbs, { recursive: true });
  await writeFile(path.join(destAbs, 'old.txt'), 'OLD\n');
  await mkdir(stagedAbs, { recursive: true });
  await writeFile(path.join(stagedAbs, 'new.txt'), 'NEW\n');
  const failingRename = async (from, to) => {
    if (from === stagedAbs) throw new Error('INJECTED-SWAP-FAIL');
    return rename(from, to);
  };
  await assert.rejects(() => swapIn(stagedAbs, destAbs, { rename: failingRename, rm }), /INJECTED-SWAP-FAIL/);
  // Old content restored, staged removed, no trash left behind.
  assert.equal(await readFile(path.join(destAbs, 'old.txt'), 'utf8'), 'OLD\n');
  assert.equal(await exists(stagedAbs), false);
  assert.deepEqual((await listNames(parent)).filter((n) => n.startsWith('.skillforge-tmp-')), []);
});

test('A-05: swapIn with a failed rollback reports both errors and deletes neither copy (unit)', async () => {
  const { swapIn } = await import('../scripts/install/installer.mjs');
  const { base } = await makeSandbox();
  const parent = path.join(base, 'skills');
  await mkdir(parent, { recursive: true });
  const destAbs = path.join(parent, 'item');
  const stagedAbs = path.join(parent, '.skillforge-tmp-item-test');
  await mkdir(destAbs, { recursive: true });
  await writeFile(path.join(destAbs, 'old.txt'), 'OLD\n');
  await mkdir(stagedAbs, { recursive: true });
  await writeFile(path.join(stagedAbs, 'new.txt'), 'NEW\n');
  const failingRename = async (from, to) => {
    if (from === stagedAbs) throw new Error('INJECTED-SWAP-FAIL');
    if (from.includes('.skillforge-tmp-old-')) throw new Error('INJECTED-ROLLBACK-FAIL');
    return rename(from, to);
  };
  let err;
  try {
    await swapIn(stagedAbs, destAbs, { rename: failingRename, rm });
  } catch (e) {
    err = e;
  }
  assert.ok(err, 'swapIn should throw');
  assert.match(err.message, /INJECTED-SWAP-FAIL/);
  assert.match(err.message, /INJECTED-ROLLBACK-FAIL/);
  assert.match(err.message, /neither was deleted/);
  // Both copies survive: old content in trash, new content staged.
  const leftovers = (await listNames(parent)).filter((n) => n.startsWith('.skillforge-tmp-old-'));
  assert.equal(leftovers.length, 1);
  const trash = path.join(parent, leftovers[0]);
  assert.ok(err.message.includes(trash), 'error names the trash path');
  assert.equal(await readFile(path.join(trash, 'old.txt'), 'utf8'), 'OLD\n');
  assert.ok(err.message.includes(stagedAbs), 'error names the staged path');
  assert.equal(await readFile(path.join(stagedAbs, 'new.txt'), 'utf8'), 'NEW\n');
  assert.equal(await exists(destAbs), false);
});

// ---------------------------------------------------------------- A-02/A-03 hardening follow-ups

test("A-02 follow-up: a skill entry with a non-'.' root is corrupt", async () => {
  const { base, home, proj } = await makeSandbox();
  const { env, manifestFile } = await installFixtureSkill(base, home, proj);
  // These roots are shape-valid for agents/workflows — but skills
  // always install into the skills dir itself, so none of them is
  // ever legitimate for a skill entry.
  for (const root of ['../agents', '../workflows', '../../.codex/agents']) {
    const manifest = await readJson(manifestFile);
    manifest.items['skill:fixture-one'].root = root;
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
    const update = await runCli(['update', '--dest', 'out'], { home, proj, env });
    assert.equal(update.code, 1, 'root=' + root);
    assert.match(update.stderr, /corrupt: invalid manifest entry/, 'root=' + root);
    assert.match(update.stderr, /not '.' for a skill entry/, 'root=' + root);
  }
});

test('A-02 follow-up: agent/workflow roots must end in the matching directory (tier-2)', async () => {
  const { home, proj } = await makeSandbox();
  // Agent installed with --dest + --target: root '../.claude/agents'
  // (tier-2 shape — the skills dir is not the target's own path).
  const a = await runCli(['install', '--target', 'claude-code', '--scope', 'project', '--dest', 'custom-skills', '--agent', 'seo-specialist'], { home, proj });
  assert.equal(a.code, 0, a.stderr);
  const manifestFile = path.join(proj, 'custom-skills', '.skillforge-manifest.json');
  const manifest = await readJson(manifestFile);
  assert.equal(manifest.items['agent:seo-specialist'].root, '../.claude/agents');
  // A matching root validates (update is a no-op).
  const ok = await runCli(['update', '--dest', 'custom-skills'], { home, proj });
  assert.equal(ok.code, 0, ok.stderr);
  // An agent entry pointing at a workflows directory does not.
  manifest.items['agent:seo-specialist'].root = '../.claude/workflows';
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  const bad = await runCli(['update', '--dest', 'custom-skills'], { home, proj });
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /corrupt: invalid manifest entry/);
  assert.match(bad.stderr, /does not resolve to an agent directory/);

  // Workflow installed with --dest + --target: root '../.agents/workflows'.
  const w = await runCli(['install', '--target', 'antigravity', '--scope', 'project', '--dest', 'custom-skills-2', '--workflow', 'seo-audit'], { home, proj });
  assert.equal(w.code, 0, w.stderr);
  const manifestFile2 = path.join(proj, 'custom-skills-2', '.skillforge-manifest.json');
  const manifest2 = await readJson(manifestFile2);
  assert.equal(manifest2.items['workflow:seo-audit'].root, '../.agents/workflows');
  manifest2.items['workflow:seo-audit'].root = '../.agents/agents';
  await writeFile(manifestFile2, JSON.stringify(manifest2, null, 2));
  const bad2 = await runCli(['update', '--dest', 'custom-skills-2'], { home, proj });
  assert.equal(bad2.code, 1);
  assert.match(bad2.stderr, /corrupt: invalid manifest entry/);
  assert.match(bad2.stderr, /does not resolve to a workflow directory/);
});

test('A-03 follow-up: backup record with a mismatched embedded entry or destName is rejected', async () => {
  const { home, proj } = await makeSandbox();
  const skillsDir = path.join(proj, 'out');
  const backupsBase = path.join(proj, '.skillforge-backups');
  await mkdir(skillsDir, { recursive: true });

  const baseItem = {
    kind: 'skill', name: 'victim', storedAs: '0-skill-victim',
    isSymlink: false, isDirectory: true, fileName: null,
    root: '.', destName: 'victim',
    entry: { kind: 'skill', name: 'victim', root: '.', destName: 'victim', method: 'copy' },
  };
  const cases = [
    { name: 'embedded entry for a different item', patch: { entry: { kind: 'skill', name: 'other', root: '.', destName: 'other', method: 'copy' } } },
    { name: 'embedded entry kind mismatch', patch: { entry: { kind: 'agent', name: 'victim', root: '.', destName: 'victim.md', method: 'copy' } } },
    { name: 'destName does not match the item name (no embedded entry)', patch: { destName: 'other', entry: null } },
    { name: 'skill item with an agents root', patch: { root: '../agents', entry: { kind: 'skill', name: 'victim', root: '../agents', destName: 'victim', method: 'copy' } } },
    {
      name: 'agent item with a skill-style destName',
      patch: {
        kind: 'agent', storedAs: '0-agent-victim', isDirectory: false, fileName: 'victim.md',
        destName: 'victim',
        entry: { kind: 'agent', name: 'victim', root: '.', destName: 'victim', method: 'copy' },
      },
    },
  ];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const id = `mismatch-${i}`;
    const item = { ...baseItem, ...c.patch };
    const dir = path.join(backupsBase, id, 'items', item.storedAs);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, item.fileName || 'SKILL.md'), '# victim\n');
    const record = {
      id, created: '2026-01-01T00:00:00.000Z', tool: 'skillforge-installer',
      target: null, scope: 'project', reason: 'test', command: 'install',
      items: [item],
    };
    await writeFile(path.join(backupsBase, id, 'backup.json'), JSON.stringify(record, null, 2));
    const r = await runCli(['restore', id, '--dest', 'out'], { home, proj });
    assert.equal(r.code, 2, `${c.name}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /is invalid: backup item/, `${c.name}: ${r.stderr}`);
  }
});

// ---------------------------------------------------------------- A-06: pre-swap verification + rollback

test('A-06: verifyStaged accepts matching content and rejects tampered, missing, or extra content (unit)', async () => {
  const { verifyStaged } = await import('../scripts/install/installer.mjs');
  const { hashFile, hashTree } = await import('../scripts/install/hashing.mjs');
  const { base } = await makeSandbox();
  const expectProblem = async (planned, absPath) => {
    const problem = await verifyStaged(planned, absPath);
    assert.ok(problem, `expected a verification problem for ${absPath}`);
    assert.match(problem, /does not match the library|points at .* not the library source|expected a symlink/);
  };

  // Skill (copy mode): the staged tree must match plannedFiles exactly.
  const src = path.join(base, 'src');
  await mkdir(path.join(src, 'references'), { recursive: true });
  await writeFile(path.join(src, 'SKILL.md'), '# Skill\n');
  await writeFile(path.join(src, 'references', 'a.md'), 'A\n');
  const tree = await hashTree(src);
  const plannedFiles = new Map([...tree.entries()].map(([p, h]) => [`myskill/${p}`, h]));
  const planned = { kind: 'skill', name: 'myskill', destName: 'myskill', method: 'copy', sourceAbs: src, plannedFiles };
  const staged = path.join(base, 'staged');
  await cp(src, staged, { recursive: true });
  assert.equal(await verifyStaged(planned, staged), null);
  await writeFile(path.join(staged, 'SKILL.md'), '# Tampered\n');
  await expectProblem(planned, staged);
  await writeFile(path.join(staged, 'SKILL.md'), '# Skill\n');
  await rm(path.join(staged, 'references', 'a.md'));
  await expectProblem(planned, staged);
  await writeFile(path.join(staged, 'references', 'a.md'), 'A\n');
  await writeFile(path.join(staged, 'extra.txt'), 'extra\n');
  await expectProblem(planned, staged);

  // Agent (single file): the staged file hash must match.
  const rendered = path.join(base, 'rendered.md');
  await writeFile(rendered, '# Agent\n');
  const agentPlanned = {
    kind: 'agent', name: 'myagent', destName: 'myagent.md', method: 'copy',
    sourceAbs: rendered,
    plannedFiles: new Map([['myagent.md', await hashFile(rendered)]]),
  };
  const stagedAgent = path.join(base, 'staged-agent.md');
  await writeFile(stagedAgent, '# Agent\n');
  assert.equal(await verifyStaged(agentPlanned, stagedAgent), null);
  await writeFile(stagedAgent, '# Different\n');
  await expectProblem(agentPlanned, stagedAgent);

  // Link mode: the staged symlink must point at the library source.
  const linkPlanned = { kind: 'skill', name: 'myskill', destName: 'myskill', method: 'link', sourceAbs: src, plannedFiles: null };
  const stagedLink = path.join(base, 'staged-link');
  await symlink(src, stagedLink, 'dir');
  assert.equal(await verifyStaged(linkPlanned, stagedLink), null);
  await rm(stagedLink);
  await symlink(path.join(base, 'elsewhere'), stagedLink, 'dir');
  await expectProblem(linkPlanned, stagedLink);
  await rm(stagedLink);
  await writeFile(stagedLink, 'not a link');
  await expectProblem(linkPlanned, stagedLink);
});

test('A-06/A-16a: rollbackFromBackup restores from the backup, or removes a fresh bad install (unit)', async () => {
  const { rollbackFromBackup } = await import('../scripts/install/installer.mjs');
  const { createBackup } = await import('../scripts/install/backups.mjs');
  const { base } = await makeSandbox();
  const skillsDir = path.join(base, 'skills');
  const itemDir = path.join(skillsDir, 'myitem');
  await mkdir(itemDir, { recursive: true });
  await writeFile(path.join(itemDir, 'SKILL.md'), 'OLD\n');
  const backup = await createBackup(skillsDir, {
    target: null, scope: 'project', reason: 'test', command: 'test',
    items: [{ kind: 'skill', name: 'myitem', destAbs: itemDir, entry: null }],
  });
  assert.ok(backup);

  // Bad content replaced the good: rollback restores the backup.
  await rm(itemDir, { recursive: true });
  await mkdir(itemDir, { recursive: true });
  await writeFile(path.join(itemDir, 'SKILL.md'), 'BAD\n');
  const note = await rollbackFromBackup({ kind: 'skill', name: 'myitem', destAbs: itemDir }, backup);
  assert.match(note, /restored from the backup/);
  assert.equal(await readFile(path.join(itemDir, 'SKILL.md'), 'utf8'), 'OLD\n');

  // No backup (a fresh install): rollback removes the bad install.
  await writeFile(path.join(itemDir, 'SKILL.md'), 'BAD2\n');
  const note2 = await rollbackFromBackup({ kind: 'skill', name: 'myitem', destAbs: itemDir }, null);
  assert.match(note2, /removed/);
  assert.equal(await exists(itemDir), false);
});

// ---------------------------------------------------------------- A-07: diverged link update

test('A-07: update refuses a diverged link without --force; --force backs up and repoints', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one', '--link'], { home, proj, env });
  const linkPath = path.join(proj, 'out', 'fixture-one');
  assert.equal(await readlink(linkPath), path.join(fixture.root, 'skills', 'alpha', 'fixture-one'));

  // The user deliberately repoints the link at their own fork.
  const fork = path.join(base, 'my-fork');
  await mkdir(fork, { recursive: true });
  await writeFile(path.join(fork, 'SKILL.md'), '# My fork\n');
  await rm(linkPath);
  await symlink(fork, linkPath, 'dir');

  const refused = await runCli(['update', ...dest], { home, proj, env });
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /refused: fixture-one/);
  assert.match(refused.stderr, /symlink already exists here pointing somewhere else/);
  assert.equal(await readlink(linkPath), fork);

  const forced = await runCli(['update', ...dest, '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(forced.stdout, /Backup created: (\S+)/);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  assert.equal(await readlink(linkPath), path.join(fixture.root, 'skills', 'alpha', 'fixture-one'));
  // The old link was backed up (as a link to the fork), not destroyed.
  const backupDir = path.join(proj, '.skillforge-backups', backupId, 'items', '0-skill-fixture-one');
  assert.equal((await lstat(backupDir)).isSymbolicLink(), true);
  assert.equal(await readlink(backupDir), fork);
});

// ---------------------------------------------------------------- A-08: dry-run purity

test('A-08: dry-run with a corrupt manifest changes nothing', async () => {
  const { base, home, proj } = await makeSandbox();
  const { env, manifestFile } = await installFixtureSkill(base, home, proj);
  const skillsDir = path.join(proj, 'out');
  const corrupt = '{ this is not json';
  await writeFile(manifestFile, corrupt);
  const namesBefore = await listNames(skillsDir);

  const install = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--dry-run'], { home, proj, env });
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stderr, /manifest.*corrupt/);
  assert.equal(await readFile(manifestFile, 'utf8'), corrupt);
  assert.deepEqual(await listNames(skillsDir), namesBefore);

  // update refuses a corrupt manifest, but changes nothing.
  const update = await runCli(['update', '--dest', 'out', '--dry-run'], { home, proj, env });
  assert.equal(update.code, 1);
  assert.equal(await readFile(manifestFile, 'utf8'), corrupt);

  const uninstall = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one', '--force', '--dry-run'], { home, proj, env });
  assert.equal(uninstall.code, 0, uninstall.stderr);
  assert.equal(await readFile(manifestFile, 'utf8'), corrupt);
  assert.deepEqual(await listNames(skillsDir), namesBefore);
  // No quarantine file was created by any of the dry runs.
  assert.equal((await listNames(skillsDir)).filter((n) => n.startsWith('.skillforge-manifest.json.corrupt-')).length, 0);
});

// ---------------------------------------------------------------- A-09: manifest repair

test('A-09a: quarantine failure fails closed — the corrupt manifest is never overwritten', async () => {
  const { base, home, proj } = await makeSandbox();
  const { env, manifestFile } = await installFixtureSkill(base, home, proj);
  // Pin Date.now in the child CLI so the quarantine name is
  // deterministic, then block it with a non-empty directory: the
  // quarantine rename fails and the run must refuse to overwrite
  // the corrupt original.
  const pinDate = path.join(base, 'pin-date.mjs');
  await writeFile(pinDate, 'Date.now = () => 1780000000000;\n');
  const blocked = path.join(proj, 'out', '.skillforge-manifest.json.corrupt-1780000000000');
  await mkdir(blocked, { recursive: true });
  await writeFile(path.join(blocked, 'keep.txt'), 'KEEP\n');
  const corrupt = '{ this is not json';
  await writeFile(manifestFile, corrupt);
  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], {
    home,
    proj,
    env: { ...env, NODE_OPTIONS: `--import ${pinDate}` },
  });
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /could not be moved aside/);
  assert.match(r.stderr, /refusing to overwrite it/);
  assert.equal(await readFile(manifestFile, 'utf8'), corrupt);
  assert.equal(await readFile(path.join(blocked, 'keep.txt'), 'utf8'), 'KEEP\n');
});

test('A-09b: repair rebuilds entries for installed items not in the run', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  const installed = await runCli(['install', ...dest, '--skill', 'fixture-one,fixture-two'], { home, proj, env });
  assert.equal(installed.code, 0, installed.stderr);
  const manifestFile = path.join(proj, 'out', '.skillforge-manifest.json');
  await writeFile(manifestFile, '{ this is not json');
  // Only fixture-one is in this run; fixture-two must be rebuilt
  // from the disk scan, not orphaned.
  const r = await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /rebuilt 2 entries/);
  const manifest = await readJson(manifestFile);
  assert.ok(manifest.items['skill:fixture-one']);
  assert.ok(manifest.items['skill:fixture-two']);
  assert.ok(manifest.items['skill:fixture-two'].files['fixture-two/SKILL.md'].startsWith('sha256:'));
  // And fixture-two is still a healthy install, not an orphan.
  const doctor = await runCli(['doctor', '--dest', 'out'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stdout);
  assert.doesNotMatch(doctor.stdout, /orphan/);
});

test('A-09b: repair does not rebuild modified items', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one,fixture-two'], { home, proj, env });
  await appendFile(path.join(proj, 'out', 'fixture-two', 'SKILL.md'), '\nMY EDIT\n');
  const manifestFile = path.join(proj, 'out', '.skillforge-manifest.json');
  await writeFile(manifestFile, '{ this is not json');
  const r = await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  const manifest = await readJson(manifestFile);
  assert.ok(manifest.items['skill:fixture-one']);
  assert.equal(manifest.items['skill:fixture-two'], undefined);
  // The modified content is still on disk, reported as an orphan.
  assert.match(await readFile(path.join(proj, 'out', 'fixture-two', 'SKILL.md'), 'utf8'), /MY EDIT/);
  const doctor = await runCli(['doctor', '--dest', 'out'], { home, proj, env });
  assert.match(doctor.stdout, /orphan skill directory fixture-two/);
});

// ---------------------------------------------------------------- A-14: uninstall backup

test('A-14: uninstall backs up an item no longer in the library', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  // Remove fixture-one from the library: the installed copy is now
  // the only one left.
  const registryFile = path.join(fixture.root, 'registry', 'skills.json');
  const registry = await readJson(registryFile);
  registry.skills = registry.skills.filter((s) => s.name !== 'fixture-one');
  registry.total_skills = registry.skills.length;
  await writeFile(registryFile, JSON.stringify(registry, null, 2));
  await rm(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'), { recursive: true });

  const r = await runCli(['uninstall', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Backup created: (\S+)/);
  assert.match(r.stdout, /removed fixture-one/);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-one')), false);
  const backupId = r.stdout.match(/Backup created: (\S+)/)[1];
  const backup = await readJson(path.join(proj, '.skillforge-backups', backupId, 'backup.json'));
  assert.equal(backup.items[0].name, 'fixture-one');
  assert.match(
    await readFile(path.join(proj, '.skillforge-backups', backupId, 'items', '0-skill-fixture-one', 'SKILL.md'), 'utf8'),
    /Version one body/,
  );
});

// ---------------------------------------------------------------- A-16: restore gaps

test('A-16b: restore creates the manifest when it is missing', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  await appendFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), '\nMY EDIT\n');
  const forced = await runCli(['install', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stderr);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  // The manifest is gone entirely (deleted outside the installer).
  await rm(path.join(proj, 'out', '.skillforge-manifest.json'));
  const restored = await runCli(['restore', backupId, ...dest], { home, proj, env });
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stdout, /restored fixture-one/);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /MY EDIT/);
  // The manifest was recreated with the restored item's entry.
  const manifest = await readJson(path.join(proj, 'out', '.skillforge-manifest.json'));
  assert.ok(manifest.items['skill:fixture-one']);
  const doctor = await runCli(['doctor', '--dest', 'out'], { home, proj, env });
  assert.doesNotMatch(doctor.stdout, /orphan/);
});

test('A-16b: restore repairs a corrupt manifest', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  await appendFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), '\nMY EDIT\n');
  const forced = await runCli(['install', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stderr);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  const manifestFile = path.join(proj, 'out', '.skillforge-manifest.json');
  await writeFile(manifestFile, '{ this is not json');
  const restored = await runCli(['restore', backupId, ...dest], { home, proj, env });
  assert.equal(restored.code, 0, restored.stderr);
  assert.match(restored.stderr, /manifest.*corrupt/);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /MY EDIT/);
  const quarantined = (await listNames(path.join(proj, 'out'))).filter((n) => n.startsWith('.skillforge-manifest.json.corrupt-'));
  assert.equal(quarantined.length, 1);
  const manifest = await readJson(manifestFile);
  assert.ok(manifest.items['skill:fixture-one']);
});

test('A-16c: restore recovers from a corrupt or missing backup.json', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  await appendFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), '\nEDIT ONE\n');
  const f1 = await runCli(['install', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  const backupOne = f1.stdout.match(/Backup created: (\S+)/)[1];
  await appendFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), '\nEDIT TWO\n');
  const f2 = await runCli(['install', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  const backupTwo = f2.stdout.match(/Backup created: (\S+)/)[1];
  const backupsBase = path.join(proj, '.skillforge-backups');

  // Corrupt backup.json (unparseable): recovery from items/.
  await writeFile(path.join(backupsBase, backupOne, 'backup.json'), '{ nope');
  const r1 = await runCli(['restore', backupOne, ...dest], { home, proj, env });
  assert.equal(r1.code, 0, r1.stderr);
  assert.match(r1.stderr, /is corrupt/);
  assert.match(r1.stderr, /recovered 1 item/);
  assert.match(r1.stdout, /restored fixture-one/);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /EDIT ONE/);

  // Missing backup.json: same recovery.
  await rm(path.join(backupsBase, backupTwo, 'backup.json'));
  const r2 = await runCli(['restore', backupTwo, ...dest], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stderr, /recovered 1 item/);
  assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /EDIT TWO/);

  // Corrupt backup.json with no recoverable items: a clear error.
  const emptyId = 'empty-corrupt';
  await mkdir(path.join(backupsBase, emptyId, 'items'), { recursive: true });
  await writeFile(path.join(backupsBase, emptyId, 'backup.json'), '{ nope');
  const r3 = await runCli(['restore', emptyId, ...dest], { home, proj, env });
  assert.equal(r3.code, 2);
  assert.match(r3.stderr, /is corrupt/);
  assert.match(r3.stderr, /nothing could be recovered/);
});

test('A-16d: a failed createBackup leaves no partial backup directory (unit)', async () => {
  const { createServer } = await import('node:net');
  const { createBackup } = await import('../scripts/install/backups.mjs');
  const { base } = await makeSandbox();
  const skillsDir = path.join(base, 'skills');
  const good = path.join(skillsDir, 'good');
  await mkdir(good, { recursive: true });
  await writeFile(path.join(good, 'SKILL.md'), '# good\n');
  // A directory containing a socket file: cp fails on it, after the
  // first item has already been copied.
  const bad = path.join(skillsDir, 'bad');
  await mkdir(bad, { recursive: true });
  await writeFile(path.join(bad, 'SKILL.md'), '# bad\n');
  const sockPath = path.join(bad, 's.sock');
  const server = createServer(() => {});
  await new Promise((resolve, reject) => server.listen(sockPath, (err) => (err ? reject(err) : resolve())));
  try {
    await assert.rejects(() => createBackup(skillsDir, {
      reason: 'test', command: 'test',
      items: [
        { kind: 'skill', name: 'good', destAbs: good, entry: null },
        { kind: 'skill', name: 'bad', destAbs: bad, entry: null },
      ],
    }));
    // No partial backup directory lingers.
    assert.deepEqual(await listNames(path.join(base, '.skillforge-backups')), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---------------------------------------------------------------- A-30: stale-staging cleanup

test('A-30: install cleans staged leftovers when everything is already; trash survives and doctor reports it', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one,fixture-two'], { home, proj, env });
  const skillsDir = path.join(proj, 'out');
  const staged = path.join(skillsDir, '.skillforge-tmp-stale-123');
  await mkdir(staged, { recursive: true });
  await writeFile(path.join(staged, 'junk.txt'), 'junk\n');
  const trash = path.join(skillsDir, '.skillforge-tmp-old-fixture-one-456');
  await mkdir(trash, { recursive: true });
  await writeFile(path.join(trash, 'SKILL.md'), '# Old content — the only copy\n');

  // Everything is already installed: cleanup still runs.
  const r = await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /removed leftover staging directory .skillforge-tmp-stale-123/);
  assert.equal(await exists(staged), false);
  assert.equal(await readFile(path.join(trash, 'SKILL.md'), 'utf8'), '# Old content — the only copy\n');

  // Uninstall cleans staged leftovers too, and still spares trash.
  const staged2 = path.join(skillsDir, '.skillforge-tmp-stale-789');
  await mkdir(staged2, { recursive: true });
  const u = await runCli(['uninstall', ...dest, '--skill', 'fixture-two'], { home, proj, env });
  assert.equal(u.code, 0, u.stderr);
  assert.equal(await exists(staged2), false);
  assert.equal(await exists(trash), true);

  // Doctor reports the surviving trash dir (as trash, not staging).
  const doctor = await runCli(['doctor', '--dest', 'out'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stdout);
  assert.match(doctor.stdout, /leftover trash directory .skillforge-tmp-old-fixture-one-456/);
  assert.match(doctor.stdout, /may hold the only copy/);
});

// ---------------------------------------------------------------- S-08/S-09: agentic-seo warnings

test('S-08/S-09: installing the seo skill warns about the upstream install docs and TLS-blind link checker', async () => {
  const { home, proj } = await makeSandbox();
  // A non-agentic skill warns about nothing.
  const control = await runCli(['install', ...CLAUDE, '--skill', 'astro'], { home, proj });
  assert.equal(control.code, 0, control.stderr);
  assert.doesNotMatch(control.stderr, /finding S-08/);
  assert.doesNotMatch(control.stderr, /finding S-09/);

  const r = await runCli(['install', ...CLAUDE, '--skill', 'seo'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /documents an unsafe install method/);
  assert.match(r.stderr, /disables TLS certificate verification/);
  assert.match(r.stderr, /finding S-08/);
  assert.match(r.stderr, /finding S-09/);
  // Once per run, not once per warning site.
  assert.equal((r.stderr.match(/finding S-08/g) || []).length, 1);
  assert.equal((r.stderr.match(/finding S-09/g) || []).length, 1);
});

test('S-08/S-09: doctor warns about an installed seo skill', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'seo'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const doctor = await runCli(['doctor', ...CLAUDE], { home, proj });
  assert.equal(doctor.code, 0, doctor.stdout); // warnings, not failures
  assert.match(doctor.stdout, /finding S-08/);
  assert.match(doctor.stdout, /finding S-09/);
  const json = await runCli(['doctor', ...CLAUDE, '--json'], { home, proj });
  const data = JSON.parse(json.stdout);
  assert.equal(data.ok, true);
  const warns = data.locations[0].problems.filter((p) => p.level === 'warn').map((p) => p.message);
  assert.ok(warns.some((m) => m.includes('(finding S-08)')));
  assert.ok(warns.some((m) => m.includes('(finding S-09)')));
});

// ---------------------------------------------------------------- doctor: stale lock

test('doctor reports a lingering lock file', async () => {
  const { base, home, proj } = await makeSandbox();
  const { env } = await installFixtureSkill(base, home, proj);
  const lockFile = path.join(proj, 'out', '.skillforge-lock');
  await writeFile(lockFile, JSON.stringify({ pid: 999999, startedAt: new Date().toISOString(), command: 'install', token: 'stale' }) + '\n');
  const doctor = await runCli(['doctor', '--dest', 'out'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stdout); // a warning, not a failure
  assert.match(doctor.stdout, /installer lock file .skillforge-lock is present/);
});

// ---------------------------------------------------------------- A-12: --backup flag

test('A-12: --backup backs up a conflict and overwrites without prompting', async () => {
  const { home, proj } = await makeSandbox();
  const skillsDir = path.join(proj, '.claude', 'skills');
  const backupsBase = path.join(proj, '.claude', '.skillforge-backups');
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  await appendFile(path.join(skillsDir, 'nextjs', 'SKILL.md'), '\nMY EDIT\n');

  // --backup resolves the conflict like --force, non-interactively:
  // a backup is made first, then the overwrite proceeds.
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs', '--backup'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Backup created: (\S+)/);
  assert.match(r.stdout, /updated nextjs/);
  assert.doesNotMatch(await readFile(path.join(skillsDir, 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
  // The backup holds the pre-conflict content.
  const backupId = r.stdout.match(/Backup created: (\S+)/)[1];
  const backup = await readJson(path.join(backupsBase, backupId, 'backup.json'));
  assert.equal(backup.items[0].name, 'nextjs');
  assert.match(
    await readFile(path.join(backupsBase, backupId, 'items', '0-skill-nextjs', 'SKILL.md'), 'utf8'),
    /MY EDIT/,
  );
  // The overwrite completed cleanly: a re-run is a no-op.
  const again = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(again.code, 0, again.stderr);
  assert.match(again.stdout, /already installed: nextjs/);

  // Foreign content (never installed by this tool) is backed up too.
  await runCli(['install', ...CLAUDE, '--skill', 'astro'], { home, proj });
  await rm(path.join(skillsDir, 'astro'), { recursive: true });
  await mkdir(path.join(skillsDir, 'astro'), { recursive: true });
  await writeFile(path.join(skillsDir, 'astro', 'mine.txt'), 'not yours');
  const r2 = await runCli(['install', ...CLAUDE, '--skill', 'astro', '--backup'], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  const backupId2 = r2.stdout.match(/Backup created: (\S+)/)[1];
  assert.equal(
    await readFile(path.join(backupsBase, backupId2, 'items', '0-skill-astro', 'mine.txt'), 'utf8'),
    'not yours',
  );
  assert.equal(await exists(path.join(skillsDir, 'astro', 'SKILL.md')), true);
});

// ---------------------------------------------------------------- A-13: dry-run purity (update/uninstall/restore)

// Snapshot everything a dry run must leave untouched: the manifest
// bytes, the skills-dir listing, the backups listing, the lock
// file, and one installed file's bytes.
async function snapshotInstallState(skillsDir, backupsBase, watchedFile) {
  return {
    manifest: await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8'),
    skillsListing: await listNames(skillsDir),
    backupsListing: await listNames(backupsBase),
    lockExists: await exists(path.join(skillsDir, '.skillforge-lock')),
    watched: await readFile(watchedFile, 'utf8'),
  };
}

async function assertStateUnchanged(before, skillsDir, backupsBase, watchedFile) {
  assert.deepEqual(await snapshotInstallState(skillsDir, backupsBase, watchedFile), before);
}

test('A-13: update dry-run changes nothing (pending update and conflict)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  const skillsDir = path.join(proj, 'out');
  const backupsBase = path.join(proj, '.skillforge-backups');
  const installedFile = path.join(skillsDir, 'fixture-one', 'SKILL.md');

  // A library change is pending: the dry run reports it and changes nothing.
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const before = await snapshotInstallState(skillsDir, backupsBase, installedFile);
  const r = await runCli(['update', ...dest, '--dry-run'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /would update fixture-one/);
  await assertStateUnchanged(before, skillsDir, backupsBase, installedFile);

  // With user edits on top, the dry run reports a refusal — still read-only.
  await appendFile(installedFile, '\nMY EDIT\n');
  const before2 = await snapshotInstallState(skillsDir, backupsBase, installedFile);
  const r2 = await runCli(['update', ...dest, '--dry-run'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /would refuse fixture-one/);
  await assertStateUnchanged(before2, skillsDir, backupsBase, installedFile);
});

test('A-13: uninstall dry-run changes nothing (single item, --force, and --all)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one,fixture-two'], { home, proj, env });
  const skillsDir = path.join(proj, 'out');
  const backupsBase = path.join(proj, '.skillforge-backups');
  const modifiedFile = path.join(skillsDir, 'fixture-two', 'SKILL.md');
  await appendFile(modifiedFile, '\nMY EDIT\n');

  // Modified content, no --force: the dry run reports a refusal.
  const before = await snapshotInstallState(skillsDir, backupsBase, modifiedFile);
  const r = await runCli(['uninstall', ...dest, '--skill', 'fixture-two', '--dry-run'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /would refuse fixture-two/);
  await assertStateUnchanged(before, skillsDir, backupsBase, modifiedFile);

  // With --force the dry run reports a removal — still no backup, no deletion.
  const r2 = await runCli(['uninstall', ...dest, '--skill', 'fixture-two', '--force', '--dry-run'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /would remove fixture-two/);
  await assertStateUnchanged(before, skillsDir, backupsBase, modifiedFile);

  // --all dry-run needs no --force confirmation and removes nothing.
  const r3 = await runCli(['uninstall', ...dest, '--all', '--dry-run'], { home, proj, env });
  assert.equal(r3.code, 0, r3.stderr);
  assert.match(r3.stdout, /would remove fixture-one/);
  assert.match(r3.stdout, /would refuse fixture-two/);
  await assertStateUnchanged(before, skillsDir, backupsBase, modifiedFile);
});

test('A-13: restore dry-run changes nothing (replace and missing-item cases)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'fixture-one'], { home, proj, env });
  await appendFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), '\nEDIT ONE\n');
  const forced = await runCli(['install', ...dest, '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(forced.code, 0, forced.stderr);
  const backupId = forced.stdout.match(/Backup created: (\S+)/)[1];
  const skillsDir = path.join(proj, 'out');
  const backupsBase = path.join(proj, '.skillforge-backups');
  const installedFile = path.join(skillsDir, 'fixture-one', 'SKILL.md');

  // Restoring over current content would create a pre-restore
  // backup in a real run; the dry run creates none and changes nothing.
  const before = await snapshotInstallState(skillsDir, backupsBase, installedFile);
  const r = await runCli(['restore', backupId, ...dest, '--dry-run'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /would restore fixture-one/);
  assert.match(r.stdout, /backed up first/);
  await assertStateUnchanged(before, skillsDir, backupsBase, installedFile);

  // Missing on disk: the dry run reports a restore and creates nothing.
  await rm(path.join(skillsDir, 'fixture-one'), { recursive: true });
  const manifestBefore = await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8');
  const backupsBefore = await listNames(backupsBase);
  const r2 = await runCli(['restore', backupId, ...dest, '--dry-run'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /would restore fixture-one/);
  assert.doesNotMatch(r2.stdout, /backed up first/);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);
  assert.equal(await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8'), manifestBefore);
  assert.deepEqual(await listNames(backupsBase), backupsBefore);
  assert.equal(await exists(path.join(skillsDir, '.skillforge-lock')), false);
});

// ---------------------------------------------------------------- A-13: PTY prompt paths

test('A-13: interactive conflict prompt: abort stops the run and changes nothing', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs,astro'], { home, proj });
  const skillsDir = path.join(proj, '.claude', 'skills');
  await appendFile(path.join(skillsDir, 'nextjs', 'SKILL.md'), '\nMY EDIT\n');
  await appendFile(path.join(skillsDir, 'astro', 'SKILL.md'), '\nMY EDIT\n');
  const manifestBefore = await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8');

  const r = await runCliPty(['install', ...CLAUDE, '--skill', 'nextjs,astro'], {
    home,
    proj,
    input: 'a\n',
  });
  if (r.skipped) {
    test.skip(r.reason || 'no PTY available');
    return;
  }
  assert.equal(r.code, 0, r.output);
  // Only the first item was ever asked about: abort short-circuits.
  assert.equal((r.output.match(/Overwrite it/g) || []).length, 1);
  assert.match(r.output, /skipped: nextjs \(skipped \(run aborted\)\)/);
  assert.match(r.output, /skipped: astro \(skipped \(run aborted\)\)/);
  // Nothing was written: both edits intact, no backup, manifest untouched.
  assert.match(await readFile(path.join(skillsDir, 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
  assert.match(await readFile(path.join(skillsDir, 'astro', 'SKILL.md'), 'utf8'), /MY EDIT/);
  assert.equal(await exists(path.join(proj, '.claude', '.skillforge-backups')), false);
  assert.equal(await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8'), manifestBefore);
});

test('A-13: interactive uninstall --all prompt: no aborts, yes removes everything', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs,astro'], { home, proj });
  const skillsDir = path.join(proj, '.claude', 'skills');

  // 'no' aborts: nothing removed, no backup, manifest untouched.
  const manifestBefore = await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8');
  const no = await runCliPty(['uninstall', ...CLAUDE, '--all'], { home, proj, input: 'n\n' });
  if (no.skipped) {
    test.skip(no.reason || 'no PTY available');
    return;
  }
  assert.equal(no.code, 0, no.output);
  assert.match(no.output, /Remove all 2 installed item\(s\)/);
  assert.match(no.output, /Aborted; nothing removed\./);
  assert.equal(await exists(path.join(skillsDir, 'nextjs', 'SKILL.md')), true);
  assert.equal(await exists(path.join(skillsDir, 'astro', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.claude', '.skillforge-backups')), false);
  assert.equal(await readFile(path.join(skillsDir, '.skillforge-manifest.json'), 'utf8'), manifestBefore);

  // 'yes' removes everything (both items are unmodified, so no
  // per-item prompt follows and no backup is made).
  const yes = await runCliPty(['uninstall', ...CLAUDE, '--all'], { home, proj, input: 'y\n' });
  assert.equal(yes.code, 0, yes.output);
  assert.match(yes.output, /removed nextjs/);
  assert.match(yes.output, /removed astro/);
  assert.equal(await exists(path.join(skillsDir, 'nextjs')), false);
  assert.equal(await exists(path.join(skillsDir, 'astro')), false);
  assert.equal(await exists(path.join(proj, '.claude', '.skillforge-backups')), false);
  const manifest = await readJson(path.join(skillsDir, '.skillforge-manifest.json'));
  assert.deepEqual(manifest.items, {});
});

test('A-13: interactive uninstall prompt for modified content: no skips, yes removes with a backup', async () => {
  const { home, proj } = await makeSandbox();
  await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  const skillsDir = path.join(proj, '.claude', 'skills');
  const backupsBase = path.join(proj, '.claude', '.skillforge-backups');
  await appendFile(path.join(skillsDir, 'nextjs', 'SKILL.md'), '\nMY EDIT\n');

  // 'no' skips: the content survives, no backup is made.
  const no = await runCliPty(['uninstall', ...CLAUDE, '--skill', 'nextjs'], { home, proj, input: 'n\n' });
  if (no.skipped) {
    test.skip(no.reason || 'no PTY available');
    return;
  }
  assert.equal(no.code, 0, no.output);
  assert.match(no.output, /Remove it anyway/);
  assert.match(no.output, /skipped: nextjs \(skipped by user\)/);
  assert.match(await readFile(path.join(skillsDir, 'nextjs', 'SKILL.md'), 'utf8'), /MY EDIT/);
  assert.equal(await exists(backupsBase), false);

  // 'yes' removes it — backed up first, with the edit in the backup.
  const yes = await runCliPty(['uninstall', ...CLAUDE, '--skill', 'nextjs'], { home, proj, input: 'y\n' });
  assert.equal(yes.code, 0, yes.output);
  assert.match(yes.output, /Backup created: (\S+)/);
  assert.match(yes.output, /removed nextjs/);
  assert.equal(await exists(path.join(skillsDir, 'nextjs')), false);
  const backupId = yes.output.match(/Backup created: (\S+)/)[1];
  assert.match(
    await readFile(path.join(backupsBase, backupId, 'items', '0-skill-nextjs', 'SKILL.md'), 'utf8'),
    /MY EDIT/,
  );
});

// ---------------------------------------------------------------- A-15: structured backup classification

test('A-15: uninstall backs up modified and foreign content, but not unmodified manifest-matching content', async () => {
  // needsBackup is a structured classification field (A-15), not a
  // string match on reason text: this test pins the behavior it
  // must produce for all three classifications in a single run.
  // (The fourth case — an unmodified item no longer in the library
  // — is covered by the A-14 test.)
  const { home, proj } = await makeSandbox();
  const dest = ['--dest', 'out'];
  await runCli(['install', ...dest, '--skill', 'nextjs,astro,seo'], { home, proj });
  const skillsDir = path.join(proj, 'out');
  const backupsBase = path.join(proj, '.skillforge-backups');
  // astro: modified (differs from the manifest).
  await appendFile(path.join(skillsDir, 'astro', 'SKILL.md'), '\nMY EDIT\n');
  // seo: foreign — installed content with no manifest entry.
  const manifestFile = path.join(skillsDir, '.skillforge-manifest.json');
  const manifest = await readJson(manifestFile);
  delete manifest.items['skill:seo'];
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  // nextjs: unmodified and manifest-matching — the control.

  const r = await runCli(['uninstall', ...dest, '--skill', 'nextjs,astro,seo', '--force'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Backup created: (\S+)/);
  assert.match(r.stdout, /removed nextjs/);
  assert.match(r.stdout, /removed astro/);
  assert.match(r.stdout, /removed seo/);
  assert.equal(await exists(path.join(skillsDir, 'nextjs')), false);
  assert.equal(await exists(path.join(skillsDir, 'astro')), false);
  assert.equal(await exists(path.join(skillsDir, 'seo')), false);

  // Exactly one backup, holding exactly the modified and foreign
  // items — the unmodified manifest-matching item was not backed up.
  const backupId = r.stdout.match(/Backup created: (\S+)/)[1];
  assert.deepEqual(await listNames(backupsBase), [backupId]);
  const backup = await readJson(path.join(backupsBase, backupId, 'backup.json'));
  assert.deepEqual(backup.items.map((i) => i.name).sort(), ['astro', 'seo']);
  // The backups hold the content that was removed.
  const byName = Object.fromEntries(backup.items.map((i) => [i.name, i]));
  assert.match(
    await readFile(path.join(backupsBase, backupId, 'items', byName.astro.storedAs, 'SKILL.md'), 'utf8'),
    /MY EDIT/,
  );
  const registry = await readJson(path.join(REPO_ROOT, 'registry', 'skills.json'));
  const seoPath = registry.skills.find((s) => s.name === 'seo').path;
  assert.equal(
    await readFile(path.join(backupsBase, backupId, 'items', byName.seo.storedAs, 'SKILL.md'), 'utf8'),
    await readFile(path.join(REPO_ROOT, seoPath, 'SKILL.md'), 'utf8'),
  );
});
