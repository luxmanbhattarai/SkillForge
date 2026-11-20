// installer.test.mjs — end-to-end tests for the SkillForge
// installer CLI. Every test runs the real CLI as a child process in
// its own temp sandbox (fake HOME + fake project dir) and never
// touches the real home directory or real agent directories.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, appendFile, chmod, cp, lstat, mkdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
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
    test.skip('no PTY available (script not found)');
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
