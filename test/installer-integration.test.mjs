// installer-integration.test.mjs — end-to-end integration tests for
// the SkillForge installer CLI (Group D, Phase 10).
//
// Every test drives the REAL installer as a child process in an
// isolated temp sandbox (fake HOME + fake project dir) and never
// touches the real home directory or any real agent directory.
// Only the skill source trees are synthetic fixtures; the installer
// itself is never mocked. Each test cleans up its own sandbox via
// the shared helpers' after-hook, and every chmod is restored in a
// finally block.
//
// What this file adds over test/installer.test.mjs: multi-command
// lifecycles (install → list → doctor → validate → update →
// uninstall → restore), the full target × scope matrix, the real
// library as an install source, kill-mid-install recovery (with the
// lock behavior a real kill produces), and failure-path coverage
// for invalid sources, malformed metadata, missing library items,
// permission errors, path conflicts, symlinks, dry-run, and
// rollback. Unit-level coverage of the same engine lives in
// installer.test.mjs (A-02…A-16, A-30) and is referenced, not
// duplicated, where this file overlaps it.
//
// FINDING 2 / FINDING 3 SCENARIOS: the profile-install and
// status-filter tests at the end of this file were written
// against DESIRED behavior before those features existed (see
// ai/testing/INSTALLER-INTEGRATION-TESTS.md for the history).
// Both features have since landed in the tree, and the assumed
// interfaces matched the implementation exactly (profile JSON
// format, --profile flag, unknown-profile exit 2 + message,
// refuse-explicit / skip-bulk / --allow-needs-correction
// semantics) — all six tests pass against the implemented
// features. Each test's header comment states the interface it
// relies on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
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
} from '../test-support/helpers.mjs';

const CLAUDE = ['--target', 'claude-code', '--scope', 'project'];

// ---------------------------------------------------------------- helpers

// Snapshot a directory tree as relative path -> content hash (files)
// or `link:<target>` (symlinks), so "installed content matches the
// source" means byte-identical, verified independently of the
// installer's own hashing code.
async function snapshotTree(dir, base = dir, out = new Map()) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return out;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (entry.isSymbolicLink()) {
      out.set(rel, `link:${await readlink(full)}`);
    } else if (entry.isDirectory()) {
      await snapshotTree(full, base, out);
    } else if (entry.isFile()) {
      out.set(rel, `sha256:${createHash('sha256').update(await readFile(full)).digest('hex')}`);
    }
  }
  return out;
}

function assertSameTree(actual, expected, what) {
  assert.deepEqual(
    [...actual.entries()].sort(),
    [...expected.entries()].sort(),
    `${what}: installed tree differs from the expected tree`,
  );
}

async function readManifest(skillsDir) {
  return readJson(path.join(skillsDir, '.skillforge-manifest.json'));
}

// Run `restore --list --json` and return the parsed backup array.
async function listBackupsJson(args, { home, proj, env }) {
  const r = await runCli(['restore', '--list', '--json', ...args], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  return JSON.parse(r.stdout);
}

// Spawn the real CLI, wait until its lock file appears (proving the
// run has started and holds the lock), then SIGKILL it shortly
// after. Waiting for the lock — instead of killing after a fixed
// delay — makes the kill land mid-run deterministically: a fixed
// delay can fire during Node's module load, before the run has
// done anything at all. If the child exits before the lock ever
// appears, the completed outcome is returned instead (a finished
// install is a valid outcome; the caller asserts on it the same
// way). Resolves with { code, signal, stdout, stderr, lockSeen }.
// Works on Windows too (Node maps the signal to TerminateProcess
// there).
function spawnKillAfterLock(args, { home, proj, env = {}, lockFile, settleMs = 25, timeoutMs = 30000 }) {
  return new Promise((resolve) => {
    const childEnv = { ...process.env, HOME: home, ...env };
    if (process.platform === 'win32') childEnv.USERPROFILE = home;
    const child = spawn(process.execPath, [INSTALLER, ...args], { cwd: proj, env: childEnv });
    let stdout = '';
    let stderr = '';
    let lockSeen = false;
    let killTimer = null;
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code, signal) => {
      clearInterval(poller);
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      resolve({ code, signal, stdout, stderr, lockSeen });
    });
    const poller = setInterval(async () => {
      if (lockSeen || killTimer) return;
      if (!(await exists(lockFile))) return;
      lockSeen = true;
      clearInterval(poller);
      // The run holds the lock: give it a moment to get into the
      // hashing/copying phase, then kill it.
      killTimer = setTimeout(() => child.kill('SIGKILL'), settleMs);
    }, 10);
    const timer = setTimeout(() => {
      // The lock never appeared and the child is still running:
      // kill it anyway so the test cannot hang.
      clearInterval(poller);
      child.kill('SIGKILL');
    }, timeoutMs);
  });
}

// A fixture library with one LARGE skill (many files, tens of MB)
// so a kill mid-install has a real window to land in, plus one
// small control skill. Returns { root, bigSource, smallSource }.
async function makeBigFixtureLibrary(base) {
  const root = path.join(base, 'big-fixture-lib');
  const bigDir = path.join(root, 'skills', 'bulk', 'bigskill');
  const smallDir = path.join(root, 'skills', 'alpha', 'fixture-one');
  await mkdir(bigDir, { recursive: true });
  await mkdir(smallDir, { recursive: true });
  await mkdir(path.join(root, 'registry'), { recursive: true });
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'skillforge-fixture', version: '9.9.9', type: 'module' }, null, 2),
  );
  const registry = {
    name: 'skillforge',
    version: '9.9.9',
    generated: '2026-11-20',
    categories: ['bulk', 'alpha'],
    total_skills: 2,
    skills: [
      {
        name: 'bigskill',
        description: 'Large fixture skill.',
        path: 'skills/bulk/bigskill',
        category: 'bulk',
        vendor: null,
        source_type: 'original',
        source: 'original',
        status: 'verified',
        version: '9.9.9',
        license: 'MIT',
        maintainer: 'skills-library',
        compatibility: null,
        last_verified: '2026-11-20',
      },
      {
        name: 'fixture-one',
        description: 'Fixture skill one.',
        path: 'skills/alpha/fixture-one',
        category: 'alpha',
        vendor: null,
        source_type: 'original',
        source: 'original',
        status: 'verified',
        version: '9.9.9',
        license: 'MIT',
        maintainer: 'skills-library',
        compatibility: null,
        last_verified: '2026-11-20',
      },
    ],
  };
  await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify(registry, null, 2));
  await writeFile(
    path.join(bigDir, 'SKILL.md'),
    '---\nname: bigskill\ndescription: Large fixture skill.\n---\n\n# bigskill\n\nBulk content.\n',
  );
  await writeFile(
    path.join(smallDir, 'SKILL.md'),
    '---\nname: fixture-one\ndescription: Fixture skill one.\n---\n\n# fixture-one\n\nVersion one body.\n',
  );
  // 100 files x 32 KiB of deterministic content (~3 MiB): the
  // installer hashes the tree four times per install (planning,
  // pre-swap verify, post-swap verify, manifest) plus one copy,
  // so the work after lock acquisition lasts far longer than the
  // kill's settle delay (25 ms after the lock appears) — the kill
  // lands mid-run — while the recovery install stays fast enough
  // for runCli's 60 s timeout even on a throttled machine. (An
  // earlier 2,000-file / 32 MiB fixture made the recovery install
  // flirt with that timeout.) Few large files, not many small
  // ones: per-file overhead dominates the hashing passes on a
  // throttled machine. Written in batches so fixture setup stays
  // fast.
  const chunk = 'x'.repeat(32 * 1024 - 32);
  const files = [];
  for (let i = 0; i < 100; i++) {
    files.push(writeFile(path.join(bigDir, `bulk-${String(i).padStart(4, '0')}.txt`), `file ${i}\n${chunk}\n`));
    if (files.length >= 100) {
      await Promise.all(files.splice(0, files.length));
    }
  }
  await Promise.all(files);
  return { root, bigSource: bigDir, smallSource: smallDir };
}

// Rewrite a fixture library's registry/skills.json in place.
async function rewriteRegistry(fixtureRoot, skills) {
  const regPath = path.join(fixtureRoot, 'registry', 'skills.json');
  const reg = await readJson(regPath);
  reg.skills = skills;
  reg.total_skills = skills.length;
  await writeFile(regPath, JSON.stringify(reg, null, 2));
}

// ---------------------------------------------------------------- pending-feature fixtures

// Write a profile definition into a fixture library.
//
// Profile format (Finding 2, verified against the implemented
// feature and the real profiles in profiles/): profiles live at
// <library-root>/profiles/<name>.json and are JSON objects with
// "name", "description", "skills" (array of skill names), and
// optional "agents" / "workflows" arrays. This helper writes the
// skills-only shape the profile tests use.
async function writeProfile(fixtureRoot, name, profile) {
  await mkdir(path.join(fixtureRoot, 'profiles'), { recursive: true });
  await writeFile(
    path.join(fixtureRoot, 'profiles', `${name}.json`),
    JSON.stringify({ name, ...profile }, null, 2),
  );
}

// A fixture library whose skills mirror the REAL verification
// statuses (sources/verification-status.json + registry
// status field, read 2026-11-21): one verified skill, one
// verified-with-limitations skill, and one needs-correction skill.
// The registry entries carry the status field exactly as the real
// registry does — the status filter reads it from there.
async function makeStatusFixtureLibrary(base) {
  const root = path.join(base, 'status-fixture-lib');
  const skillMd = (name, description, body) =>
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}\n`;
  const skills = [
    { name: 'fixture-one', category: 'alpha', status: 'verified', body: 'Version one body.' },
    { name: 'fixture-limited', category: 'alpha', status: 'verified-with-limitations', body: 'Limited body.' },
    { name: 'fixture-risky', category: 'beta', status: 'needs-correction', body: 'Risky body.' },
  ];
  for (const s of skills) {
    await mkdir(path.join(root, 'skills', s.category, s.name), { recursive: true });
    await writeFile(
      path.join(root, 'skills', s.category, s.name, 'SKILL.md'),
      skillMd(s.name, `Fixture skill ${s.name}.`, s.body),
    );
  }
  await mkdir(path.join(root, 'registry'), { recursive: true });
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'skillforge-fixture', version: '9.9.9', type: 'module' }, null, 2),
  );
  const registry = {
    name: 'skillforge',
    version: '9.9.9',
    generated: '2026-11-20',
    categories: ['alpha', 'beta'],
    total_skills: skills.length,
    skills: skills.map((s) => ({
      name: s.name,
      description: `Fixture skill ${s.name}.`,
      path: `skills/${s.category}/${s.name}`,
      category: s.category,
      vendor: null,
      source_type: 'original',
      source: 'original',
      status: s.status,
      version: '9.9.9',
      license: 'MIT',
      maintainer: 'skills-library',
      compatibility: null,
      last_verified: '2026-11-20',
    })),
  };
  await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify(registry, null, 2));
  return { root };
}

// The six real needs-correction skills (sources/
// verification-status.json `statuses` map + registry/skills.json
// status field, both read 2026-11-21; all six are upstream).
// The real-library status test re-derives this list from the
// registry at run time and asserts it still equals this set, so
// registry drift fails the test instead of silently changing what
// is covered.
const REAL_NEEDS_CORRECTION = [
  'prisma-upgrade-v7',
  'seo',
  'vercel-composition-patterns',
  'vercel-react-best-practices',
  'vercel-react-view-transitions',
  'web-artifacts-builder',
];

// The opt-in flag for the status filter (Finding 3, verified
// against the implemented feature): explicit installs of
// needs-correction skills proceed only with this flag.
const ALLOW_NEEDS_CORRECTION = '--allow-needs-correction';

// ---------------------------------------------------------------- lifecycle

test('integration: full lifecycle — install, list, doctor, validate, update, uninstall', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const skillsDir = path.join(proj, '.claude', 'skills');

  // Install a skill and an agent in one run.
  const r = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one', '--agent', 'fixture-agent'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.claude', 'agents', 'fixture-agent.md')), true);

  // list --json reports both items from the manifest.
  const list = await runCli(['list', ...CLAUDE, '--json'], { home, proj, env });
  assert.equal(list.code, 0, list.stderr);
  const listed = JSON.parse(list.stdout);
  assert.deepEqual(
    listed.items.map((i) => `${i.kind}:${i.name}`).sort(),
    ['agent:fixture-agent', 'skill:fixture-one'],
  );

  // doctor passes on the healthy install; validate passes too.
  const doctor = await runCli(['doctor', ...CLAUDE, '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
  const valid = await runCli(['validate', ...CLAUDE], { home, proj, env });
  assert.equal(valid.code, 0, valid.stderr);

  // update with no library change is a no-op.
  const up0 = await runCli(['update', ...CLAUDE], { home, proj, env });
  assert.equal(up0.code, 0, up0.stderr);
  assert.match(up0.stdout, /already installed 2/);

  // A library change is picked up by update.
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const up1 = await runCli(['update', ...CLAUDE], { home, proj, env });
  assert.equal(up1.code, 0, up1.stderr);
  assert.match(up1.stdout, /updated 1/);
  assert.match(await readFile(path.join(skillsDir, 'fixture-one', 'SKILL.md'), 'utf8'), /Version two body/);

  // Uninstall the skill; the agent stays.
  const un1 = await runCli(['uninstall', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(un1.code, 0, un1.stderr);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);
  assert.equal(await exists(path.join(proj, '.claude', 'agents', 'fixture-agent.md')), true);
  const list2 = JSON.parse((await runCli(['list', ...CLAUDE, '--json'], { home, proj, env })).stdout);
  assert.deepEqual(list2.items.map((i) => `${i.kind}:${i.name}`), ['agent:fixture-agent']);

  // Uninstall everything; the manifest empties.
  const unAll = await runCli(['uninstall', ...CLAUDE, '--all', '--force'], { home, proj, env });
  assert.equal(unAll.code, 0, unAll.stderr);
  const list3 = JSON.parse((await runCli(['list', ...CLAUDE, '--json'], { home, proj, env })).stdout);
  assert.deepEqual(list3.items, []);
  assert.deepEqual((await readManifest(skillsDir)).items, {});
});

test('integration: target x scope matrix — every target installs to its documented layout', async () => {
  // Layouts verified against scripts/install/targets.mjs
  // (documented paths, verified 2026-11-20). Codex agents are TOML;
  // every other agent format is Markdown; only Antigravity has a
  // workflow location.
  const matrix = [
    {
      target: 'claude-code', scope: 'project',
      skills: ['.claude', 'skills'], agents: ['.claude', 'agents'], agentFile: 'fixture-agent.md',
    },
    {
      target: 'claude-code', scope: 'user',
      skills: ['.claude', 'skills'], agents: ['.claude', 'agents'], agentFile: 'fixture-agent.md',
    },
    {
      target: 'cursor', scope: 'project',
      skills: ['.cursor', 'skills'], agents: ['.cursor', 'agents'], agentFile: 'fixture-agent.md',
    },
    {
      target: 'cursor', scope: 'user',
      skills: ['.cursor', 'skills'], agents: ['.cursor', 'agents'], agentFile: 'fixture-agent.md',
    },
    {
      target: 'codex', scope: 'project',
      skills: ['.agents', 'skills'], agents: ['.codex', 'agents'], agentFile: 'fixture-agent.toml',
    },
    {
      target: 'codex', scope: 'user',
      skills: ['.agents', 'skills'], agents: ['.codex', 'agents'], agentFile: 'fixture-agent.toml',
    },
    {
      target: 'antigravity', scope: 'project',
      skills: ['.agents', 'skills'], agents: ['.agents', 'agents'], agentFile: 'fixture-agent.md',
      workflows: ['.agents', 'workflows'], workflowFile: 'fixture-workflow.md',
    },
    {
      target: 'antigravity', scope: 'user',
      skills: ['.gemini', 'config', 'skills'], agents: ['.gemini', 'config', 'agents'], agentFile: 'fixture-agent.md',
      workflows: ['.gemini', 'config', 'global_workflows'], workflowFile: 'fixture-workflow.md',
    },
  ];
  for (const cell of matrix) {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const anchor = cell.scope === 'user' ? home : proj;
    const skillsDir = path.join(anchor, ...cell.skills);
    const agentsDir = path.join(anchor, ...cell.agents);
    const args = ['install', '--target', cell.target, '--scope', cell.scope, '--skill', 'fixture-one', '--agent', 'fixture-agent'];
    if (cell.workflows) args.push('--workflow', 'fixture-workflow');
    const r = await runCli(args, { home, proj, env });
    assert.equal(r.code, 0, `${cell.target}/${cell.scope}: ${r.stderr}`);

    // Installed skill is byte-identical to the fixture source.
    const sourceTree = await snapshotTree(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'));
    const installedTree = await snapshotTree(path.join(skillsDir, 'fixture-one'));
    assertSameTree(installedTree, sourceTree, `${cell.target}/${cell.scope} skill`);

    // Agent lands in the target's agents dir, in its native format.
    assert.equal(await exists(path.join(agentsDir, cell.agentFile)), true, `${cell.target}/${cell.scope} agent file`);
    if (cell.agentFile.endsWith('.toml')) {
      assert.match(
        await readFile(path.join(agentsDir, cell.agentFile), 'utf8'),
        /developer_instructions = """/,
        `${cell.target}/${cell.scope} agent is TOML`,
      );
    } else {
      assert.match(
        await readFile(path.join(agentsDir, cell.agentFile), 'utf8'),
        /^---\nname: fixture-agent\n/,
        `${cell.target}/${cell.scope} agent has frontmatter`,
      );
    }

    // Antigravity workflow lands in its (deprecated) location.
    if (cell.workflows) {
      assert.equal(
        await exists(path.join(anchor, ...cell.workflows, cell.workflowFile)),
        true,
        `${cell.target}/${cell.scope} workflow file`,
      );
    }

    // The manifest records every installed item.
    const manifest = await readManifest(skillsDir);
    const keys = Object.keys(manifest.items).sort();
    const expected = ['agent:fixture-agent', 'skill:fixture-one'];
    if (cell.workflows) expected.push('workflow:fixture-workflow');
    assert.deepEqual(keys, expected.sort(), `${cell.target}/${cell.scope} manifest`);
  }
});

test('integration: install from the real library — a real skill installs byte-identical', async () => {
  // No SKILLFORGE_ROOT: the installer resolves its library root
  // from its own location, i.e. this repository. The source path
  // comes from the real registry, not a hard-coded guess.
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  const registry = await readJson(path.join(REPO_ROOT, 'registry', 'skills.json'));
  const entry = registry.skills.find((s) => s.name === 'nextjs');
  assert.ok(entry, 'nextjs must exist in the real registry');
  const sourceTree = await snapshotTree(path.join(REPO_ROOT, entry.path));
  assert.ok(sourceTree.size > 0, 'the nextjs source tree must not be empty');
  const installedTree = await snapshotTree(path.join(proj, '.claude', 'skills', 'nextjs'));
  assertSameTree(installedTree, sourceTree, 'nextjs');
  const doctor = await runCli(['doctor', ...CLAUDE, '--json'], { home, proj });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
});

test('integration: idempotency — install twice, update twice, same bytes and same manifest', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const skillsDir = path.join(proj, '.claude', 'skills');

  const r1 = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r1.code, 0, r1.stderr);
  const tree1 = await snapshotTree(skillsDir);
  const manifest1 = await readManifest(skillsDir);

  const r2 = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /already installed: fixture-one/);
  assertSameTree(await snapshotTree(skillsDir), tree1, 'second install');
  const manifest2 = await readManifest(skillsDir);
  assert.equal(manifest2.items['skill:fixture-one'].installed, manifest1.items['skill:fixture-one'].installed);
  assert.equal(manifest2.items['skill:fixture-one'].updated, manifest1.items['skill:fixture-one'].updated);

  const r3 = await runCli(['update', ...CLAUDE], { home, proj, env });
  assert.equal(r3.code, 0, r3.stderr);
  assert.match(r3.stdout, /already installed 1/);
  assertSameTree(await snapshotTree(skillsDir), tree1, 'update no-op');
});

test('integration: upgrade — install detects the library change, backs up v1, restore brings v1 back', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = path.join(proj, 'out');
  const skillDir = path.join(dest, 'fixture-one');

  const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r1.code, 0, r1.stderr);
  assert.match(await readFile(path.join(skillDir, 'SKILL.md'), 'utf8'), /Version one body/);
  const manifest1 = await readManifest(dest);
  const hashV1 = manifest1.items['skill:fixture-one'].sourceHash;

  // A plain re-install (no --force) detects the library change and
  // updates, backing v1 up first.
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const r2 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /updated 1/);
  assert.match(await readFile(path.join(skillDir, 'SKILL.md'), 'utf8'), /Version two body/);
  const backups = await listBackupsJson(['--dest', 'out'], { home, proj, env });
  assert.equal(backups.length, 1);
  assert.equal(backups[0].reason, 'replacement');
  assert.deepEqual(backups[0].items.map((i) => `${i.kind}:${i.name}`), ['skill:fixture-one']);

  // Restore the backup: v1 content returns, with v1 hashes.
  const rr = await runCli(['restore', backups[0].id, '--dest', 'out'], { home, proj, env });
  assert.equal(rr.code, 0, rr.stderr);
  assert.match(await readFile(path.join(skillDir, 'SKILL.md'), 'utf8'), /Version one body/);
  const manifest2 = await readManifest(dest);
  assert.equal(manifest2.items['skill:fixture-one'].sourceHash, hashV1);
  const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
});

test('integration: reinstallation — a manually deleted install is restored by install and by update', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const skillsDir = path.join(proj, '.claude', 'skills');

  const r1 = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one,fixture-two'], { home, proj, env });
  assert.equal(r1.code, 0, r1.stderr);

  // install re-creates a deleted skill.
  await rm(path.join(skillsDir, 'fixture-one'), { recursive: true, force: true });
  const r2 = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /installed fixture-one/);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one', 'SKILL.md')), true);

  // update re-creates a manifest-recorded skill that is missing
  // on disk.
  await rm(path.join(skillsDir, 'fixture-two'), { recursive: true, force: true });
  const r3 = await runCli(['update', ...CLAUDE], { home, proj, env });
  assert.equal(r3.code, 0, r3.stderr);
  assert.match(r3.stdout, /installed fixture-two/);
  assert.equal(await exists(path.join(skillsDir, 'fixture-two', 'SKILL.md')), true);

  const doctor = await runCli(['doctor', ...CLAUDE, '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
});

test('integration: uninstallation — partial then full removal leaves a clean, empty manifest', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const skillsDir = path.join(proj, '.claude', 'skills');

  const r1 = await runCli(
    ['install', ...CLAUDE, '--skill', 'fixture-one,fixture-two', '--agent', 'fixture-agent'],
    { home, proj, env },
  );
  assert.equal(r1.code, 0, r1.stderr);

  const un1 = await runCli(['uninstall', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(un1.code, 0, un1.stderr);
  assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);
  assert.equal(await exists(path.join(skillsDir, 'fixture-two', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.claude', 'agents', 'fixture-agent.md')), true);
  assert.deepEqual(
    Object.keys((await readManifest(skillsDir)).items).sort(),
    ['agent:fixture-agent', 'skill:fixture-two'],
  );

  const unAll = await runCli(['uninstall', ...CLAUDE, '--all', '--force'], { home, proj, env });
  assert.equal(unAll.code, 0, unAll.stderr);
  assert.equal(await exists(path.join(skillsDir, 'fixture-two')), false);
  assert.equal(await exists(path.join(proj, '.claude', 'agents', 'fixture-agent.md')), false);
  assert.deepEqual((await readManifest(skillsDir)).items, {});
  const list = JSON.parse((await runCli(['list', ...CLAUDE, '--json'], { home, proj, env })).stdout);
  assert.deepEqual(list.items, []);
});

test('integration: partial-installation recovery — pre-planted half state refuses, then --force recovers cleanly', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = path.join(proj, 'out');

  // Plant the debris of an interrupted run: a half-copied skill
  // (the real SKILL.md plus a junk file the library does not have),
  // a stale staging dir, and a trash dir holding a sentinel.
  await mkdir(path.join(dest, 'fixture-one'), { recursive: true });
  await writeFile(
    path.join(dest, 'fixture-one', 'SKILL.md'),
    '---\nname: fixture-one\ndescription: Fixture skill one.\n---\n\n# fixture-one\n\nVersion one body.\n',
  );
  await writeFile(path.join(dest, 'fixture-one', 'junk.txt'), 'not from the library\n');
  await mkdir(path.join(dest, '.skillforge-tmp-fixture-one-1234-abcd'), { recursive: true });
  await writeFile(path.join(dest, '.skillforge-tmp-fixture-one-1234-abcd', 'partial.txt'), 'staged junk\n');
  await mkdir(path.join(dest, '.skillforge-tmp-old-fixture-one-1234-abcd'), { recursive: true });
  await writeFile(path.join(dest, '.skillforge-tmp-old-fixture-one-1234-abcd', 'sentinel.txt'), 'only copy\n');

  // Without --force the half state is a conflict: refused, and the
  // junk is untouched. The stale staging dir is cleaned even by a
  // refusing run; the trash dir survives.
  const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r1.code, 1, r1.stdout + r1.stderr);
  assert.match(r1.stderr, /refused: fixture-one/);
  assert.equal(await readFile(path.join(dest, 'fixture-one', 'junk.txt'), 'utf8'), 'not from the library\n');
  assert.equal(await exists(path.join(dest, '.skillforge-tmp-fixture-one-1234-abcd')), false);
  assert.equal(
    await readFile(path.join(dest, '.skillforge-tmp-old-fixture-one-1234-abcd', 'sentinel.txt'), 'utf8'),
    'only copy\n',
  );

  // --force recovers: the half state is backed up and replaced by
  // a clean install identical to the library.
  const r2 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--force'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  const sourceTree = await snapshotTree(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'));
  assertSameTree(await snapshotTree(path.join(dest, 'fixture-one')), sourceTree, 'recovered install');
  const backups = await listBackupsJson(['--dest', 'out'], { home, proj, env });
  assert.equal(backups.length, 1);
  // The trash dir still survives — the installer never deletes it.
  assert.equal(
    await readFile(path.join(dest, '.skillforge-tmp-old-fixture-one-1234-abcd', 'sentinel.txt'), 'utf8'),
    'only copy\n',
  );
  const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr); // trash is a warning, not a failure
  const report = JSON.parse(doctor.stdout);
  assert.ok(report.warns >= 1);
  assert.ok(
    report.locations[0].problems.some((p) => p.level === 'warn' && /leftover trash directory/.test(p.message)),
    'doctor warns about the leftover trash directory',
  );
});

test('integration: interrupted installation — a kill mid-install leaves no half-installed skill and recovery works', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeBigFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = path.join(proj, 'out');

  // Snapshot the sources once and reuse them: re-hashing the big
  // skill's tree for every assertion would multiply the test's
  // runtime for no extra signal.
  const bigSourceTree = await snapshotTree(fixture.bigSource);
  const smallSourceTree = await snapshotTree(fixture.smallSource);

  // Kill the run shortly after its lock file appears: the big
  // skill's hashing + copy takes far longer than the settle delay,
  // so the kill lands mid-run. If the run somehow finished first,
  // the assertions below still hold (a completed install is a
  // valid outcome) and recovery is a no-op.
  const killed = await spawnKillAfterLock(['install', '--dest', 'out', '--skill', 'bigskill,fixture-one'], {
    home, proj, env, lockFile: path.join(dest, '.skillforge-lock'),
  });
  const wasKilled = killed.signal === 'SIGKILL';
  assert.ok(
    wasKilled || killed.code === 0,
    `unexpected outcome: code=${killed.code} signal=${killed.signal} stderr=${killed.stderr}`,
  );
  if (wasKilled) {
    // The kill is aimed to land after lock acquisition; if the
    // lock never appeared within the timeout, the test setup is
    // broken (the run never started), not the installer.
    assert.equal(killed.lockSeen, true, 'the killed run never created its lock file within the timeout');
  }

  // No half-installed skill: each destination is either absent or
  // byte-identical to its source (staging + swap means a
  // destination only ever appears complete).
  for (const [name, sourceTree] of [['bigskill', bigSourceTree], ['fixture-one', smallSourceTree]]) {
    const installed = path.join(dest, name);
    if (await exists(installed)) {
      assertSameTree(await snapshotTree(installed), sourceTree, `${name} after kill`);
    }
  }
  // The manifest is consistent: every recorded entry has a
  // complete install on disk (the manifest is written
  // incrementally, only after each item completes).
  const manifestPath = path.join(dest, '.skillforge-manifest.json');
  if (await exists(manifestPath)) {
    const manifest = await readJson(manifestPath);
    for (const key of Object.keys(manifest.items)) {
      const entry = manifest.items[key];
      const sourceTree = entry.name === 'bigskill' ? bigSourceTree : smallSourceTree;
      assertSameTree(
        await snapshotTree(path.join(dest, entry.name)),
        sourceTree,
        `manifest entry ${key} after kill`,
      );
    }
  }

  if (wasKilled) {
    // The killed run left its lock behind. Doctor reports the
    // lingering lock as a warning, and an immediate re-run refuses
    // on the lock with the recovery instruction — a fresh lock
    // with a dead pid is NOT taken over (pid-reuse guard; the
    // takeover window is 10 minutes).
    const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
    assert.equal(doctor.code, 0, doctor.stderr); // a lingering lock is a warning, not a failure
    const report = JSON.parse(doctor.stdout);
    assert.ok(
      report.locations[0].problems.some((p) => p.level === 'warn' && /lock file/.test(p.message)),
      'doctor warns about the lingering lock file',
    );
    const blocked = await runCli(['install', '--dest', 'out', '--skill', 'bigskill,fixture-one'], { home, proj, env });
    assert.notEqual(blocked.code, 0);
    assert.match(blocked.stderr, /Another SkillForge installer run is already using/);
    assert.match(blocked.stderr, /remove the lock file/);

    // The documented operator recovery: remove the lock file by
    // hand (the error message names its path), then re-run.
    await rm(path.join(dest, '.skillforge-lock'), { force: true });
  }

  // Recovery: a re-run completes the install, cleans any stale
  // staging the killed run left, and leaves a healthy install.
  const r = await runCli(['install', '--dest', 'out', '--skill', 'bigskill,fixture-one'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assertSameTree(await snapshotTree(path.join(dest, 'bigskill')), bigSourceTree, 'bigskill recovered');
  assertSameTree(await snapshotTree(path.join(dest, 'fixture-one')), smallSourceTree, 'fixture-one recovered');
  const leftovers = (await readdir(dest)).filter((n) => n.startsWith('.skillforge-tmp-'));
  assert.deepEqual(leftovers, [], 'no staging or trash leftovers after recovery');
  const doctor2 = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor2.code, 0, doctor2.stderr);
  assert.equal(JSON.parse(doctor2.stdout).ok, true);
});

// ---------------------------------------------------------------- failure paths

test('integration: invalid skill sources — missing source dir, escaping path, skill without SKILL.md', async () => {
  // (a) A registry entry whose source directory does not exist is
  // a per-item failure: the other skill still installs, exit 1.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const reg = await readJson(path.join(fixture.root, 'registry', 'skills.json'));
    reg.skills.find((s) => s.name === 'fixture-one').path = 'skills/alpha/missing-dir';
    await rewriteRegistry(fixture.root, reg.skills);
    const r = await runCli(['install', '--dest', 'out', '--skill', 'all'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /failed: fixture-one/);
    assert.equal(await exists(path.join(proj, 'out', 'fixture-two', 'SKILL.md')), true);
    assert.equal(await exists(path.join(proj, 'out', 'fixture-one')), false);
  }

  // (b) A registry path escaping the library root is rejected at
  // load time, before anything is installed.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const reg = await readJson(path.join(fixture.root, 'registry', 'skills.json'));
    reg.skills.find((s) => s.name === 'fixture-one').path = '../escape';
    await rewriteRegistry(fixture.root, reg.skills);
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /escapes the library root/);
    assert.equal(await exists(path.join(proj, 'out')), false);
  }

  // (c) A skill directory without SKILL.md installs (install does
  // not gate on SKILL.md) but validate and doctor fail on it.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await rm(path.join(fixture.root, 'skills', 'alpha', 'fixture-one', 'SKILL.md'));
    await writeFile(path.join(fixture.root, 'skills', 'alpha', 'fixture-one', 'notes.txt'), 'no SKILL.md here\n');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r.code, 0, r.stderr);
    const valid = await runCli(['validate', '--dest', 'out'], { home, proj, env });
    assert.equal(valid.code, 1, valid.stdout);
    assert.match(valid.stdout, /SKILL.md is missing/);
    const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
    assert.equal(doctor.code, 1, doctor.stdout);
    assert.equal(JSON.parse(doctor.stdout).ok, false);
  }
});

test('integration: malformed metadata — bad registry JSON, wrong registry shape, bad package.json', async () => {
  // (a) Registry JSON that does not parse: a clear error, nothing
  // installed.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await writeFile(path.join(fixture.root, 'registry', 'skills.json'), '{not json\n');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /Error:/);
    assert.equal(await exists(path.join(proj, 'out')), false);
  }

  // (b) Registry that parses to the wrong shape (an array, not an
  // object with a "skills" array): a clear LibraryError.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await writeFile(path.join(fixture.root, 'registry', 'skills.json'), '[]\n');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /malformed: expected an object with a "skills" array/);
    assert.equal(await exists(path.join(proj, 'out')), false);
  }

  // (c) package.json that does not parse: a clear error, nothing
  // installed.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await writeFile(path.join(fixture.root, 'package.json'), '{bad json\n');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /Error:/);
    assert.equal(await exists(path.join(proj, 'out')), false);
  }
});

test('integration: missing dependencies — a ghost agent, a removed skill, and a deleted source', async () => {
  // (a) An agents-registry entry whose .md file is missing is a
  // per-item failure: the skill in the same run still installs.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await writeFile(
      path.join(fixture.root, 'registry', 'agents.json'),
      JSON.stringify({
        name: 'skillforge-agents',
        version: '9.9.9',
        agents: [
          { name: 'ghost-agent', description: 'No file behind this entry.', path: 'agents/ghost-agent.md' },
          { name: 'fixture-agent', description: 'Fixture agent.', path: 'agents/fixture-agent.md' },
        ],
      }, null, 2),
    );
    const r = await runCli(
      ['install', ...CLAUDE, '--skill', 'fixture-one', '--agent', 'ghost-agent'],
      { home, proj, env },
    );
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /failed: ghost-agent \(agent\)/);
    assert.equal(await exists(path.join(proj, '.claude', 'skills', 'fixture-one', 'SKILL.md')), true);
    assert.equal(await exists(path.join(proj, '.claude', 'agents', 'ghost-agent.md')), false);
  }

  // (b) A skill removed from the library after install is left in
  // place by update, with a clear "skipped" note.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one,fixture-two'], { home, proj, env });
    assert.equal(r1.code, 0, r1.stderr);
    const reg = await readJson(path.join(fixture.root, 'registry', 'skills.json'));
    await rewriteRegistry(fixture.root, reg.skills.filter((s) => s.name !== 'fixture-one'));
    await rm(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'), { recursive: true, force: true });
    const r2 = await runCli(['update', '--dest', 'out'], { home, proj, env });
    assert.equal(r2.code, 0, r2.stderr);
    assert.match(r2.stdout, /no longer in the library; left in place/);
    assert.equal(await exists(path.join(proj, 'out', 'fixture-one', 'SKILL.md')), true);
  }

  // (c) A library source deleted after install (registry entry
  // still present) fails that item's update only: the other item
  // updates and the failed item's v1 content is untouched.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one,fixture-two'], { home, proj, env });
    assert.equal(r1.code, 0, r1.stderr);
    await rm(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'), { recursive: true, force: true });
    await fixture.setSkillBody('fixture-two', 'Version two body.');
    const r2 = await runCli(['update', '--dest', 'out'], { home, proj, env });
    assert.equal(r2.code, 1, r2.stdout + r2.stderr);
    assert.match(r2.stderr, /failed: fixture-one/);
    assert.match(await readFile(path.join(proj, 'out', 'fixture-two', 'SKILL.md'), 'utf8'), /Version two body/);
    assert.match(await readFile(path.join(proj, 'out', 'fixture-one', 'SKILL.md'), 'utf8'), /Version one body/);
  }
});

test('integration: permission errors — a read-only skills dir fails cleanly and dry-run still works', async (t) => {
  // chmod-based permission errors do not apply on Windows (the
  // read-only attribute does not produce EACCES there), and root
  // bypasses permission checks entirely. The root case is covered
  // in installer.test.mjs via an su-nobody run; this test skips
  // there rather than duplicating that harness.
  if (process.platform === 'win32') {
    t.skip('chmod-based permission errors do not apply on Windows');
    return;
  }
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('running as root: permission checks are bypassed (see installer.test.mjs for the su-based variant)');
    return;
  }
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const skillsDir = path.join(proj, '.claude', 'skills');
  await mkdir(skillsDir, { recursive: true });
  try {
    await chmod(skillsDir, 0o555);
    // A real install fails cleanly with a permission error and
    // leaves no half-installed skill.
    const r = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
    assert.notEqual(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /failed: fixture-one/, r.stderr);
    assert.match(r.stderr, /EACCES|permission denied/i, r.stderr);
    assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);
    // A dry run needs no writes (and takes no lock), so it still
    // works against the same read-only directory.
    const dry = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one', '--dry-run'], { home, proj, env });
    assert.equal(dry.code, 0, dry.stderr);
    assert.match(dry.stdout, /would install fixture-one/);
    assert.equal(await exists(path.join(skillsDir, 'fixture-one')), false);
  } finally {
    await chmod(skillsDir, 0o755).catch(() => {});
  }
});

test('integration: path conflicts — files in the way fail cleanly; shared-layout targets share one install', async () => {
  // (a) --dest pointing at an existing file fails cleanly and the
  // file is untouched.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await writeFile(path.join(proj, 'blocker'), 'a file, not a directory\n');
    const r = await runCli(['install', '--dest', 'blocker', '--skill', 'fixture-one'], { home, proj, env });
    assert.notEqual(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stderr, /failed: fixture-one/);
    assert.equal(await readFile(path.join(proj, 'blocker'), 'utf8'), 'a file, not a directory\n');
  }

  // (b) A file where the target's skills parent should be fails
  // cleanly (the .claude directory cannot be created under it).
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await writeFile(path.join(proj, '.claude'), 'a file, not a directory\n');
    const r = await runCli(['install', ...CLAUDE, '--skill', 'fixture-one'], { home, proj, env });
    assert.notEqual(r.code, 0, r.stdout + r.stderr);
    assert.equal(await readFile(path.join(proj, '.claude'), 'utf8'), 'a file, not a directory\n');
  }

  // (c) Codex and Antigravity share the project skills layout
  // (.agents/skills) — and therefore one manifest. Installing the
  // same skill for both targets is a no-op the second time, not a
  // conflict, and leaves a single manifest entry.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const r1 = await runCli(['install', '--target', 'codex', '--scope', 'project', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r1.code, 0, r1.stderr);
    const r2 = await runCli(['install', '--target', 'antigravity', '--scope', 'project', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r2.code, 0, r2.stderr);
    assert.match(r2.stdout, /already installed: fixture-one/);
    const manifest = await readManifest(path.join(proj, '.agents', 'skills'));
    assert.deepEqual(Object.keys(manifest.items), ['skill:fixture-one']);
  }
});

test('integration: symbolic links — link lifecycle, foreign links, adoption, and broken links', async (t) => {
  // Creating symlinks directly needs privilege (or Developer Mode)
  // on Windows; probe first and skip the whole test when the
  // environment forbids it, rather than failing on setup.
  const probeBase = await makeSandbox();
  const probeTarget = path.join(probeBase.base, 'probe-target');
  const probeLink = path.join(probeBase.base, 'probe-link');
  await mkdir(probeTarget, { recursive: true });
  try {
    await symlink(probeTarget, probeLink, 'dir');
  } catch (err) {
    if (err.code === 'EPERM') {
      t.skip('symlink creation is not permitted in this environment (Windows without Developer Mode / admin)');
      return;
    }
    throw err;
  }
  await rm(probeLink, { force: true });

  // (a) --link lifecycle: the link points at the source, a
  // re-run is idempotent, and uninstall removes only the link —
  // the library source survives byte-identical.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const sourceDir = path.join(fixture.root, 'skills', 'alpha', 'fixture-one');
    const sourceBefore = await snapshotTree(sourceDir);
    const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r1.code, 0, r1.stderr);
    const linkPath = path.join(proj, 'out', 'fixture-one');
    assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
    assert.equal(
      path.resolve(path.dirname(linkPath), await readlink(linkPath)),
      sourceDir,
    );
    assert.match(await readFile(path.join(linkPath, 'SKILL.md'), 'utf8'), /Version one body/);
    assert.equal((await readManifest(path.join(proj, 'out'))).items['skill:fixture-one'].method, 'link');
    const r2 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r2.code, 0, r2.stderr);
    assert.match(r2.stdout, /already installed: fixture-one/);
    const ru = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(ru.code, 0, ru.stderr);
    assert.equal(await exists(linkPath), false);
    assertSameTree(await snapshotTree(sourceDir), sourceBefore, 'library source after link uninstall');
  }

  // (b) A pre-existing symlink pointing somewhere else is a
  // conflict: refused, and the foreign link is untouched.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const foreign = path.join(base, 'foreign');
    await mkdir(foreign, { recursive: true });
    await writeFile(path.join(foreign, 'SKILL.md'), 'foreign content\n');
    await mkdir(path.join(proj, 'out'), { recursive: true });
    await symlink(foreign, path.join(proj, 'out', 'fixture-one'), 'dir');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /refused: fixture-one/);
    assert.equal(
      path.resolve(path.dirname(path.join(proj, 'out', 'fixture-one')), await readlink(path.join(proj, 'out', 'fixture-one'))),
      foreign,
    );
  }

  // (c) A pre-existing symlink already pointing at the library
  // source is adopted into the manifest, not replaced.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await mkdir(path.join(proj, 'out'), { recursive: true });
    await symlink(
      path.join(fixture.root, 'skills', 'alpha', 'fixture-one'),
      path.join(proj, 'out', 'fixture-one'),
      'dir',
    );
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /already installed: fixture-one \(adopted into the manifest\)/);
    assert.equal((await readManifest(path.join(proj, 'out'))).items['skill:fixture-one'].method, 'link');
  }

  // (d) A copy install onto a symlink destination is a conflict:
  // refused, and the link is untouched.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    const foreign = path.join(base, 'foreign');
    await mkdir(foreign, { recursive: true });
    await mkdir(path.join(proj, 'out'), { recursive: true });
    await symlink(foreign, path.join(proj, 'out', 'fixture-one'), 'dir');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /refused: fixture-one/);
    assert.equal((await lstat(path.join(proj, 'out', 'fixture-one'))).isSymbolicLink(), true);
  }

  // (e) A broken symlink at the destination is a conflict for
  // install, and uninstall --force removes it cleanly.
  {
    const { base, home, proj } = await makeSandbox();
    const fixture = await makeFixtureLibrary(base);
    const env = { SKILLFORGE_ROOT: fixture.root };
    await mkdir(path.join(proj, 'out'), { recursive: true });
    await symlink(path.join(base, 'does-not-exist'), path.join(proj, 'out', 'fixture-one'), 'dir');
    const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--link'], { home, proj, env });
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /refused: fixture-one/);
    const ru = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one', '--force'], { home, proj, env });
    assert.equal(ru.code, 0, ru.stderr);
    assert.equal(await exists(path.join(proj, 'out', 'fixture-one')), false);
  }
});

test('integration: dry-run changes nothing — install, update, uninstall, and restore', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = path.join(proj, 'out');

  // A dry run against a fresh destination creates nothing — not
  // even the destination directory or a manifest.
  const dryFresh = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--dry-run'], { home, proj, env });
  assert.equal(dryFresh.code, 0, dryFresh.stderr);
  assert.match(dryFresh.stdout, /would install fixture-one/);
  assert.equal(await exists(dest), false);

  // Build a state with a pending update and an existing backup:
  // install v1, then force-update to v2 (which creates a backup).
  const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r1.code, 0, r1.stderr);
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  const r2 = await runCli(['update', '--dest', 'out', '--force'], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  await fixture.setSkillBody('fixture-one', 'Version three body.');
  const backups = await listBackupsJson(['--dest', 'out'], { home, proj, env });
  assert.equal(backups.length, 1);

  // Snapshot the whole sandbox, run every dry-run command, and
  // prove the snapshot is byte-identical afterwards.
  const before = await snapshotTree(base);
  const dryInstall = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one', '--dry-run'], { home, proj, env });
  assert.equal(dryInstall.code, 0, dryInstall.stderr);
  assert.match(dryInstall.stdout, /would update fixture-one/);
  const dryUpdate = await runCli(['update', '--dest', 'out', '--dry-run'], { home, proj, env });
  assert.equal(dryUpdate.code, 0, dryUpdate.stderr);
  assert.match(dryUpdate.stdout, /would update fixture-one/);
  const dryUninstall = await runCli(['uninstall', '--dest', 'out', '--skill', 'fixture-one', '--dry-run'], { home, proj, env });
  assert.equal(dryUninstall.code, 0, dryUninstall.stderr);
  const dryRestore = await runCli(['restore', backups[0].id, '--dest', 'out', '--dry-run'], { home, proj, env });
  assert.equal(dryRestore.code, 0, dryRestore.stderr);
  assertSameTree(await snapshotTree(base), before, 'sandbox after all dry runs');
});

test('integration: rollback — a backup failure refuses to replace anything and the previous state survives', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  const dest = path.join(proj, 'out');

  const r1 = await runCli(['install', '--dest', 'out', '--skill', 'fixture-one'], { home, proj, env });
  assert.equal(r1.code, 0, r1.stderr);
  const manifestBefore = await readManifest(dest);

  // Block backup creation: a FILE where the backups directory
  // should be, so createBackup's mkdir fails. The update must then
  // refuse to replace anything — v1 stays live and the manifest is
  // untouched.
  await fixture.setSkillBody('fixture-one', 'Version two body.');
  await writeFile(path.join(proj, '.skillforge-backups'), 'a file, not a directory\n');
  const r2 = await runCli(['update', '--dest', 'out', '--force'], { home, proj, env });
  assert.equal(r2.code, 1, r2.stdout + r2.stderr);
  assert.match(r2.stderr, /Backup failed/);
  assert.match(await readFile(path.join(dest, 'fixture-one', 'SKILL.md'), 'utf8'), /Version one body/);
  assert.deepEqual(await readManifest(dest), manifestBefore);

  // Remove the blocker: the same update now succeeds, v2 installs,
  // and a backup of v1 exists.
  await rm(path.join(proj, '.skillforge-backups'), { force: true });
  const r3 = await runCli(['update', '--dest', 'out', '--force'], { home, proj, env });
  assert.equal(r3.code, 0, r3.stderr);
  assert.match(await readFile(path.join(dest, 'fixture-one', 'SKILL.md'), 'utf8'), /Version two body/);
  const backups = await listBackupsJson(['--dest', 'out'], { home, proj, env });
  assert.equal(backups.length, 1);
  assert.equal(backups[0].reason, 'update');
});

test('integration: mixed run — one command installs skills, an agent, and a workflow for Antigravity', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };

  const r = await runCli(
    ['install', '--target', 'antigravity', '--scope', 'project',
      '--skill', 'fixture-one', '--agent', 'fixture-agent', '--workflow', 'fixture-workflow'],
    { home, proj, env },
  );
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stderr, /workflows are deprecated/);
  assert.equal(await exists(path.join(proj, '.agents', 'skills', 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.agents', 'agents', 'fixture-agent.md')), true);
  assert.equal(await exists(path.join(proj, '.agents', 'workflows', 'fixture-workflow.md')), true);
  const manifest = await readManifest(path.join(proj, '.agents', 'skills'));
  assert.deepEqual(
    Object.keys(manifest.items).sort(),
    ['agent:fixture-agent', 'skill:fixture-one', 'workflow:fixture-workflow'],
  );
  const doctor = await runCli(['doctor', '--target', 'antigravity', '--scope', 'project', '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);

  // Uninstalling just the workflow leaves the skill and agent.
  const ru = await runCli(
    ['uninstall', '--target', 'antigravity', '--scope', 'project', '--workflow', 'fixture-workflow'],
    { home, proj, env },
  );
  assert.equal(ru.code, 0, ru.stderr);
  assert.equal(await exists(path.join(proj, '.agents', 'workflows', 'fixture-workflow.md')), false);
  assert.equal(await exists(path.join(proj, '.agents', 'skills', 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, '.agents', 'agents', 'fixture-agent.md')), true);
});

// ---------------------------------------------------------------- Finding 2 — profile install
//
// Install bundles/profiles: profile definitions under profiles/
// + installer --profile support (with --bundle as an alias).
// These tests were written against the desired behavior before
// the feature existed; the feature has since landed and the
// assumed interface matched it exactly (see writeProfile above):
// profiles/<name>.json, JSON with a "skills" array; unknown
// profiles are a usage error (exit 2), like unknown skills.

test('integration: profile install — --profile installs exactly the profile\'s skills', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  await writeProfile(fixture.root, 'alpha-only', {
    description: 'Profile with only the alpha skill.',
    skills: ['fixture-one'],
  });

  const r = await runCli(['install', '--dest', 'out', '--profile', 'alpha-only'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  // Exactly the profile's skills are installed — byte-identical
  // to their sources — and nothing else.
  const sourceTree = await snapshotTree(path.join(fixture.root, 'skills', 'alpha', 'fixture-one'));
  assertSameTree(await snapshotTree(path.join(proj, 'out', 'fixture-one')), sourceTree, 'profile skill');
  assert.equal(await exists(path.join(proj, 'out', 'fixture-two')), false);
  const manifest = await readManifest(path.join(proj, 'out'));
  assert.deepEqual(Object.keys(manifest.items), ['skill:fixture-one']);
  const doctor = await runCli(['doctor', '--dest', 'out', '--json'], { home, proj, env });
  assert.equal(doctor.code, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
});

test('integration: profile install — an unknown profile errors clearly', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  await writeProfile(fixture.root, 'alpha-only', {
    description: 'Profile with only the alpha skill.',
    skills: ['fixture-one'],
  });

  const r = await runCli(['install', '--dest', 'out', '--profile', 'no-such-profile'], { home, proj, env });
  // An unknown profile is an invocation problem (like an unknown
  // skill): exit 2 with a clear message naming the profile.
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /unknown profile 'no-such-profile'/);
  // Nothing was installed: no manifest, no skill directories.
  // (The destination directory itself IS created — lock
  // acquisition mkdirs it before selection errors are raised.
  // That is pre-existing installer behavior for all post-lock
  // usage errors, e.g. unknown skills, not something the profile
  // error does specially.)
  assert.equal(await exists(path.join(proj, 'out', '.skillforge-manifest.json')), false);
  assert.deepEqual(await listNames(path.join(proj, 'out')), []);
});

test('integration: profile install regression — --skills all still installs everything', async () => {
  // The profile feature must not change the existing bulk path:
  // --skills all installs every skill in the library.
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };
  await writeProfile(fixture.root, 'alpha-only', {
    description: 'Profile with only the alpha skill.',
    skills: ['fixture-one'],
  });

  const r = await runCli(['install', '--dest', 'out', '--skill', 'all'], { home, proj, env });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-two', 'SKILL.md')), true);
  const manifest = await readManifest(path.join(proj, 'out'));
  assert.deepEqual(Object.keys(manifest.items).sort(), ['skill:fixture-one', 'skill:fixture-two']);
});

// ---------------------------------------------------------------- Finding 3 — status filter
//
// Installer status filter: needs-correction skills are refused
// or clearly warned on by default, with an explicit opt-in flag.
// These tests were written against the desired behavior before
// the filter existed; the filter has since landed and the assumed
// behavior matched it exactly. Implemented behavior (verified
// against scripts/install/commands.mjs):
//   * explicit install of a needs-correction skill → REFUSED,
//     exit 1, nothing installed; the message names the skill, its
//     needs-correction status, and the opt-in flag.
//   * bulk install (--skill all) → needs-correction skills are
//     SKIPPED with a warning, exit 0, verified skills install.
//   * the opt-in flag (--allow-needs-correction) → proceeds,
//     exit 0.
//   * verified and verified-with-limitations skills install
//     unaffected (only needs-correction is filtered).

test('integration: status filter — explicit install of a needs-correction skill is refused by default', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeStatusFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };

  const r = await runCli(['install', '--dest', 'out', '--skill', 'fixture-risky'], { home, proj, env });
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /fixture-risky/);
  assert.match(r.stderr, /needs-correction/);
  assert.match(r.stderr, /--allow-needs-correction/);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-risky')), false);

  // The opt-in flag proceeds: the skill installs normally.
  const r2 = await runCli(
    ['install', '--dest', 'out', '--skill', 'fixture-risky', ALLOW_NEEDS_CORRECTION],
    { home, proj, env },
  );
  assert.equal(r2.code, 0, r2.stderr);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-risky', 'SKILL.md')), true);
  const manifest = await readManifest(path.join(proj, 'out'));
  assert.deepEqual(Object.keys(manifest.items), ['skill:fixture-risky']);
});

test('integration: status filter — bulk install skips needs-correction skills with a warning; verified skills install unaffected', async () => {
  const { base, home, proj } = await makeSandbox();
  const fixture = await makeStatusFixtureLibrary(base);
  const env = { SKILLFORGE_ROOT: fixture.root };

  // Default bulk install: the needs-correction skill is skipped
  // with a warning; the verified and verified-with-limitations
  // skills install. Skipping is a warning, not a failure: exit 0.
  const r = await runCli(['install', '--dest', 'out', '--skill', 'all'], { home, proj, env });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stderr, /fixture-risky/);
  assert.match(r.stderr, /needs-correction/);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-one', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-limited', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-risky')), false);
  const manifest = await readManifest(path.join(proj, 'out'));
  assert.deepEqual(
    Object.keys(manifest.items).sort(),
    ['skill:fixture-limited', 'skill:fixture-one'],
  );

  // Bulk install with the opt-in flag installs everything,
  // including the needs-correction skill.
  const r2 = await runCli(['install', '--dest', 'out', '--skill', 'all', ALLOW_NEEDS_CORRECTION], { home, proj, env });
  assert.equal(r2.code, 0, r2.stderr);
  assert.equal(await exists(path.join(proj, 'out', 'fixture-risky', 'SKILL.md')), true);
});

test('integration: status filter — the real needs-correction skills are refused by default', async () => {
  // No SKILLFORGE_ROOT: the real repository library. The list of
  // needs-correction skills is re-derived from the real registry
  // at run time and must still equal the six known names — if the
  // registry changes, this test fails loudly instead of silently
  // covering a different set.
  const { home, proj } = await makeSandbox();
  const registry = await readJson(path.join(REPO_ROOT, 'registry', 'skills.json'));
  const needsCorrection = registry.skills
    .filter((s) => s.status === 'needs-correction')
    .map((s) => s.name)
    .sort();
  assert.deepEqual(needsCorrection, [...REAL_NEEDS_CORRECTION].sort());

  // Every one of the six is refused on explicit install.
  for (const name of needsCorrection) {
    const r = await runCli(['install', '--dest', 'out', '--skill', name], { home, proj });
    assert.equal(r.code, 1, `${name}: ${r.stdout + r.stderr}`);
    assert.match(r.stderr, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(r.stderr, /needs-correction/);
    assert.equal(await exists(path.join(proj, 'out', name)), false);
  }

  // The opt-in flag installs a real needs-correction skill.
  const r2 = await runCli(['install', '--dest', 'out', '--skill', 'seo', ALLOW_NEEDS_CORRECTION], { home, proj });
  assert.equal(r2.code, 0, r2.stderr);
  assert.equal(await exists(path.join(proj, 'out', 'seo', 'SKILL.md')), true);
});
