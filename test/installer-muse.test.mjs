// installer-muse.test.mjs — end-to-end tests for the Muse target.
// Every test runs the real CLI as a child process in its own temp
// sandbox (fake HOME + fake project dir) and never touches the
// real home directory or real agent directories.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  exists,
  listNames,
  makeFixtureLibrary,
  makeSandbox,
  readJson,
  runCli,
} from '../test-support/helpers.mjs';

const MUSE = ['--target', 'muse', '--scope', 'user'];
const museSkillsDir = (home) => path.join(home, 'workspace', 'custom-skills');

test('muse install converts a skill to SKILL.md + skill.yaml', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const r = await runCli(['install', ...MUSE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /installed fixture-one/);
  const dir = path.join(museSkillsDir(home), 'fixture-one');
  // SKILL.md is the body with the frontmatter stripped.
  assert.equal(await readFile(path.join(dir, 'SKILL.md'), 'utf8'), '# fixture-one\n\nVersion one body.\n');
  const yaml = await readFile(path.join(dir, 'skill.yaml'), 'utf8');
  assert.match(yaml, /^name: 'fixture-one'$/m);
  assert.match(yaml, /^title: 'fixture-one'$/m);
  assert.match(yaml, /^description: 'Fixture skill one\.'$/m);
  assert.match(yaml, /^category: 'alpha'$/m);
  assert.match(yaml, /^include_in_prompt: false$/m);
  const manifest = await readJson(path.join(museSkillsDir(home), '.skillforge-manifest.json'));
  assert.equal(manifest.target, 'muse');
  const entry = manifest.items['skill:fixture-one'];
  assert.equal(entry.method, 'copy');
  assert.equal(entry.source, 'skills/alpha/fixture-one');
  assert.ok(entry.files['fixture-one/skill.yaml'].startsWith('sha256:'));
  assert.ok(entry.files['fixture-one/SKILL.md'].startsWith('sha256:'));
  // list sees the install.
  const list = await runCli(['list', ...MUSE, '--json'], { home, proj, env });
  assert.equal(list.code, 0, list.stderr);
  const listed = JSON.parse(list.stdout);
  assert.equal(listed.directory, museSkillsDir(home));
  assert.deepEqual(listed.items.map((i) => i.name), ['fixture-one']);
});

test('muse install with --link still copies (and says so)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const r = await runCli(['install', ...MUSE, '--skill', 'fixture-one', '--link'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /--link does not apply to Muse installs/);
  const st = await lstat(path.join(museSkillsDir(home), 'fixture-one'));
  assert.equal(st.isSymbolicLink(), false);
  assert.ok(await exists(path.join(museSkillsDir(home), 'fixture-one', 'skill.yaml')));
});

test('muse project scope is a clear usage error', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const r = await runCli(['install', '--target', 'muse', '--scope', 'project', '--skill', 'fixture-one'], {
    home,
    proj,
    env: { SKILLFORGE_ROOT: fixture.root },
  });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Muse has no documented project-level skills location/);
  assert.match(r.stderr, /--scope user/);
});

test('muse agent install fails loudly (no agents location)', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const r = await runCli(['install', ...MUSE, '--agent', 'fixture-agent'], {
    home,
    proj,
    env: { SKILLFORGE_ROOT: fixture.root },
  });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /Muse has no documented agents directory/);
});

test('muse install with --dest still converts', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const r = await runCli(['install', '--target', 'muse', '--dest', 'muse-out', '--skill', 'fixture-two'], {
    home,
    proj,
    env: { SKILLFORGE_ROOT: fixture.root },
  });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, 'muse-out', 'fixture-two', 'skill.yaml')), true);
  assert.equal(await exists(path.join(proj, 'muse-out', 'fixture-two', 'SKILL.md')), true);
});

test('muse update re-renders after the library changes', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const r = await runCli(['install', ...MUSE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const u = await runCli(['update', ...MUSE], { home, proj, env });
  assert.equal(u.code, 0, u.stderr);
  assert.match(u.stdout, /updated fixture-one/);
  assert.equal(
    await readFile(path.join(museSkillsDir(home), 'fixture-one', 'SKILL.md'), 'utf8'),
    '# fixture-one\n\nVersion two body.\n',
  );
  // The conversion survives the update: skill.yaml is still there.
  assert.ok(await exists(path.join(museSkillsDir(home), 'fixture-one', 'skill.yaml')));
  const u2 = await runCli(['update', ...MUSE], { home, proj, env });
  assert.equal(u2.code, 0, u2.stderr);
  assert.match(u2.stdout, /already installed: fixture-one/);
});

test('muse validate passes, and fails on a mismatched skill.yaml name', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const r = await runCli(['install', ...MUSE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  const v = await runCli(['validate', ...MUSE], { home, proj, env });
  assert.equal(v.code, 0, v.stderr);
  assert.match(v.stdout, /1 passed, 0 failed/);
  const yamlPath = path.join(museSkillsDir(home), 'fixture-one', 'skill.yaml');
  const yaml = await readFile(yamlPath, 'utf8');
  await writeFile(yamlPath, yaml.replace("name: 'fixture-one'", "name: 'other-name'"));
  const v2 = await runCli(['validate', ...MUSE], { home, proj, env });
  assert.equal(v2.code, 1);
  assert.match(v2.stdout, /does not match directory 'fixture-one'/);
});

test('muse doctor and uninstall work', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const r = await runCli(['install', ...MUSE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  // doctor without --scope sweeps only the scopes Muse supports.
  const d = await runCli(['doctor', '--target', 'muse'], { home, proj, env });
  assert.equal(d.code, 0, d.stderr);
  assert.match(d.stdout, /OK — no problems found/);
  const u = await runCli(['uninstall', ...MUSE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(u.code, 0, u.stderr);
  assert.match(u.stdout, /removed fixture-one/);
  assert.equal(await exists(path.join(museSkillsDir(home), 'fixture-one')), false);
});

test('muse profile install: skills install, agents/workflows skip with a warning', async () => {
  const { home, proj } = await makeSandbox();
  // Real library: the writing profile bundles 24 skills plus 3
  // agents and 1 workflow, which Muse has no location for.
  const r = await runCli(['install', ...MUSE, '--profile', 'writing'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /skipping agent 'article-writer' \(profile member\): Muse has no documented agents location/);
  assert.match(r.stderr, /skipping workflow 'article-publishing' \(profile member\): Muse has no documented workflow location/);
  const names = await listNames(museSkillsDir(home));
  assert.equal(names.filter((n) => n !== '.skillforge-manifest.json').length, 24);
  assert.ok(await exists(path.join(museSkillsDir(home), 'article-writing', 'skill.yaml')));
  assert.ok(await exists(path.join(museSkillsDir(home), 'article-writing', 'SKILL.md')));
  assert.match(r.stdout, /installed 24/);
});
