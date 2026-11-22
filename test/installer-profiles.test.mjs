// installer-profiles.test.mjs — regression tests for the Finding 2
// install bundles/profiles: profiles/*.json + installer
// --profile/--bundle support (see docs/PROFILES.md).
//
// A profile is a named bundle of skills (plus agents/workflows)
// that installs as one unit, so a user installs the 21 frontend
// skills instead of all 277 descriptions (~25k tokens) at once.
// --skills all is unchanged (it still installs everything except
// the six needs-correction skills, which the Finding 3 filter
// skips with a warning). Profile + --skill is a union.
//
// Every CLI test runs the real installer as a child process in its
// own temp sandbox (fake HOME + fake project dir) and never
// touches the real home directory or real agent directories.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadLibrary, loadProfiles } from '../scripts/install/library.mjs';
import { exists, makeSandbox, readJson, REPO_ROOT, runCli } from '../test-support/helpers.mjs';

const CLAUDE = ['--target', 'claude-code', '--scope', 'project'];

async function readProfile(name) {
  return readJson(path.join(REPO_ROOT, 'profiles', `${name}.json`));
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

test('profiles: all twelve shipped profiles load and validate', async () => {
  const library = await loadLibrary(REPO_ROOT);
  const profiles = await loadProfiles(library);
  // loadProfiles throws on a bad file (unknown member, wrong
  // shape), so reaching this line proves every profile is valid.
  assert.deepEqual(
    [...profiles.keys()].sort(),
    [
      'ai',
      'architecture',
      'backend',
      'desktop',
      'devops',
      'frontend',
      'fullstack',
      'media',
      'quality',
      'security',
      'seo',
      'writing',
    ],
  );
  for (const p of profiles.values()) {
    assert.ok(p.skills.length > 0, `${p.name}: expected at least one skill`);
    assert.ok(p.description.trim().length > 0, `${p.name}: expected a description`);
  }
  // The upstream category is deliberately not covered by any
  // profile (mixed vendor imports; install via --category upstream
  // or --skill). Every other skill is in at least one profile.
  const covered = new Set([...profiles.values()].flatMap((p) => p.skills));
  const uncovered = [...library.skills.values()].filter((s) => !covered.has(s.name));
  assert.ok(uncovered.length > 0);
  assert.ok(uncovered.every((s) => s.category === 'upstream'), 'only upstream skills may be uncovered');
});

test('profiles: --profile desktop installs exactly the profile\'s skills and agent', async () => {
  const profile = await readProfile('desktop');
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--profile', 'desktop'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  // The manifest lives in the skills dir; filter it (and any other
  // dotfile) out before comparing the installed skill set.
  const installed = (await readdir(path.join(proj, '.claude', 'skills')))
    .filter((n) => !n.startsWith('.'))
    .sort();
  assert.deepEqual(installed, [...profile.skills].sort());
  for (const agent of profile.agents) {
    assert.equal(await exists(path.join(proj, '.claude', 'agents', `${agent}.md`)), true);
  }
});

test('profiles: --profile frontend dry-run lists the profile\'s skills and agent', async () => {
  const profile = await readProfile('frontend');
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--profile', 'frontend', '--dry-run'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(
    countMatches(r.stdout, /would install /g),
    profile.skills.length + profile.agents.length + profile.workflows.length,
    r.stdout,
  );
  assert.match(r.stdout, /would install frontend-specialist \(agent\)/);
});

test('profiles: an unknown profile errors clearly (exit 2, lists known profiles)', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--profile', 'no-such-profile'], { home, proj });
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /unknown profile 'no-such-profile'/);
  assert.match(r.stderr, /known profiles: .*frontend/);
  // The run fails before installing anything: no skill lands and
  // no manifest is written. (The empty .claude/skills dir is
  // created when the run resolves locations, before the profile
  // error — that is pre-existing installer behavior, not an
  // install.)
  assert.equal(await exists(path.join(proj, '.claude', 'skills', '.skillforge-manifest.json')), false);
  const skillsDir = await readdir(path.join(proj, '.claude', 'skills')).catch(() => []);
  assert.deepEqual(skillsDir, []);
});

test('profiles: --bundle is an alias for --profile', async () => {
  const { home, proj } = await makeSandbox();
  const viaProfile = await runCli(['install', ...CLAUDE, '--profile', 'desktop', '--dry-run'], { home, proj });
  const viaBundle = await runCli(['install', ...CLAUDE, '--bundle', 'desktop', '--dry-run'], { home, proj });
  assert.equal(viaProfile.code, 0, viaProfile.stderr);
  assert.equal(viaBundle.code, 0, viaBundle.stderr);
  assert.equal(viaBundle.stdout, viaProfile.stdout);
});

test('profiles: --profile + --skill is a union (profile members plus the named skill)', async () => {
  const profile = await readProfile('desktop');
  const { home, proj } = await makeSandbox();
  // nextjs is a frontend skill, not in the desktop profile.
  assert.ok(!profile.skills.includes('nextjs'));
  const r = await runCli(['install', ...CLAUDE, '--profile', 'desktop', '--skill', 'nextjs', '--dry-run'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(
    countMatches(r.stdout, /would install /g),
    profile.skills.length + profile.agents.length + profile.workflows.length + 1,
    r.stdout,
  );
  assert.match(r.stdout, /would install nextjs /);
});

test('profiles: --skills all still works (installs everything except the six filtered needs-correction skills)', async () => {
  const skills = (await readJson(path.join(REPO_ROOT, 'registry', 'skills.json'))).skills;
  const expectedInstalled = skills.filter((s) => s.status !== 'needs-correction').length;
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'out', '--skills', 'all', '--dry-run'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(countMatches(r.stdout, /would install /g), expectedInstalled, r.stdout);
  assert.equal(countMatches(r.stderr, /warning: skipping skill/g), 6, r.stderr);
});

test('profiles: update and uninstall accept --profile', async () => {
  const profile = await readProfile('desktop');
  const { home, proj } = await makeSandbox();
  const installed = await runCli(['install', ...CLAUDE, '--profile', 'desktop'], { home, proj });
  assert.equal(installed.code, 0, installed.stderr);

  // Update with the profile: content is unchanged, so every member
  // reports already installed.
  const updated = await runCli(['update', ...CLAUDE, '--profile', 'desktop'], { home, proj });
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(
    updated.stdout,
    new RegExp(`already installed ${profile.skills.length + profile.agents.length + profile.workflows.length}`),
  );

  // Uninstall with the profile: members are removed.
  const removed = await runCli(['uninstall', ...CLAUDE, '--profile', 'desktop'], { home, proj });
  assert.equal(removed.code, 0, removed.stderr);
  for (const skill of profile.skills) {
    assert.equal(await exists(path.join(proj, '.claude', 'skills', skill)), false);
  }
  for (const agent of profile.agents) {
    assert.equal(await exists(path.join(proj, '.claude', 'agents', `${agent}.md`)), false);
  }
});

test('profiles: --dest + --profile errors because profiles include agents (agents need --target)', async () => {
  const { home, proj } = await makeSandbox();
  // Every shipped profile bundles at least one agent, and agents
  // cannot install to a bare --dest (no agents directory). This
  // is the same rule as --agent + --dest, documented in
  // docs/PROFILES.md; --dest users select skills directly.
  const r = await runCli(['install', '--dest', 'out', '--profile', 'desktop'], { home, proj });
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /needs --target/);
});
