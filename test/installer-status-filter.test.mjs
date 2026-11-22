// installer-status-filter.test.mjs — regression tests for the
// Finding 3 needs-correction status filter in the installer.
//
// Semantics (see docs/INSTALLATION.md):
//   * explicit install (--skill/--skills naming a needs-correction
//     skill) → REFUSED per item: the refusal is recorded with a
//     clear stderr error naming the skill, its status, and the
//     opt-in flag; the rest of the run installs normally (A2-03:
//     one bad item never aborts the run), and the run exits 1 at
//     the end (the summary reports `refused N`);
//   * bulk install (--skills all, --category, --profile) →
//     needs-correction skills are warned about on stderr and
//     skipped, exit 0, the rest install;
//   * --allow-needs-correction → installs them, with a one-line
//     stderr note naming them;
//   * update → warns and skips by default (no refusal: the
//     content is already installed), updates with the flag.
// The filter reads `status` from registry/skills.json (which
// derives it from sources/verification-status.json) and the audit
// note from verification-status.json directly.
//
// Every test runs the real CLI as a child process in its own temp
// sandbox (fake HOME + fake project dir) and never touches the
// real home directory or real agent directories.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { exists, makeSandbox, readJson, REPO_ROOT, runCli } from '../test-support/helpers.mjs';

const CLAUDE = ['--target', 'claude-code', '--scope', 'project'];
const ALLOW = '--allow-needs-correction';

// The six needs-correction skills, re-derived from the registry at
// run time in the first test (so registry drift fails loudly
// instead of silently changing what is covered).
const KNOWN_SIX = [
  'prisma-upgrade-v7',
  'seo',
  'vercel-composition-patterns',
  'vercel-react-best-practices',
  'vercel-react-view-transitions',
  'web-artifacts-builder',
];

async function registrySkills() {
  return (await readJson(path.join(REPO_ROOT, 'registry', 'skills.json'))).skills;
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

test('status filter: all six needs-correction skills are refused on explicit install (exit 1, nothing installed)', async () => {
  const skills = await registrySkills();
  const needsCorrection = skills
    .filter((s) => s.status === 'needs-correction')
    .map((s) => s.name)
    .sort();
  assert.deepEqual(needsCorrection, [...KNOWN_SIX].sort());

  const { home, proj } = await makeSandbox();
  for (const name of needsCorrection) {
    const r = await runCli(['install', '--dest', 'out', '--skill', name], { home, proj });
    assert.equal(r.code, 1, `${name}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, new RegExp(`refused: ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — needs-correction`));
    assert.match(r.stderr, /--allow-needs-correction/);
    assert.match(r.stdout, /Summary: refused 1\./);
    assert.equal(await exists(path.join(proj, 'out', name)), false);
  }
});

test('status filter: refusal is per item (A2-03) — the rest of an explicit list still installs, exit 1 at the end', async () => {
  const { home, proj } = await makeSandbox();
  // nextjs installs; seo is refused; the run reports both.
  const r = await runCli(['install', '--dest', 'out', '--skill', 'nextjs,seo'], { home, proj });
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.equal(await exists(path.join(proj, 'out', 'nextjs', 'SKILL.md')), true);
  assert.equal(await exists(path.join(proj, 'out', 'seo')), false);
  assert.match(r.stderr, /refused: seo — needs-correction/);
  assert.match(r.stdout, /Summary: installed 1, refused 1\./);
});

test('status filter: explicit refusal happens on dry-run too (the filter runs at selection time)', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'out', '--skill', 'seo', '--dry-run'], { home, proj });
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /refused: seo — needs-correction/);
  assert.match(r.stderr, /--allow-needs-correction/);
  assert.match(r.stdout, /Summary: refused 1\./);
  assert.equal(await exists(path.join(proj, 'out', 'seo')), false);
});

test('status filter: the opt-in flag installs a needs-correction skill, and the S-08 warnings still fire', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'seo', ALLOW], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'seo', 'SKILL.md')), true);
  assert.match(r.stderr, /note: installing 1 needs-correction skill \(--allow-needs-correction\): seo/);
  // The opt-in is about the verification status, not the S-08/S-09
  // findings: the agentic-seo warnings must still fire.
  assert.match(r.stderr, /finding S-08/);
  assert.match(r.stderr, /finding S-09/);
});

test('status filter: bulk --skills all warns and skips all six, installs the rest', async () => {
  const skills = await registrySkills();
  const expectedInstalled = skills.filter((s) => s.status !== 'needs-correction').length;
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'out', '--skills', 'all', '--dry-run'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(countMatches(r.stderr, /warning: skipping skill/g), 6, r.stderr);
  for (const name of KNOWN_SIX) {
    assert.match(r.stderr, new RegExp(`skipping skill '${name}' \\(needs-correction`));
  }
  assert.equal(countMatches(r.stdout, /would install /g), expectedInstalled, r.stdout);
});

test('status filter: --category upstream bulk-skips the six, installs the other 43', async () => {
  const skills = await registrySkills();
  const upstream = skills.filter((s) => s.category === 'upstream');
  const expectedInstalled = upstream.filter((s) => s.status !== 'needs-correction').length;
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', '--dest', 'out', '--category', 'upstream', '--dry-run'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(countMatches(r.stderr, /warning: skipping skill/g), 6, r.stderr);
  assert.equal(countMatches(r.stdout, /would install /g), expectedInstalled, r.stdout);
});

test('status filter: verified skills install unaffected (no warning, no refusal)', async () => {
  const { home, proj } = await makeSandbox();
  const r = await runCli(['install', ...CLAUDE, '--skill', 'nextjs'], { home, proj });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(await exists(path.join(proj, '.claude', 'skills', 'nextjs', 'SKILL.md')), true);
  assert.doesNotMatch(r.stderr, /needs-correction/);
  assert.doesNotMatch(r.stderr, /skipping/);
});

test('status filter: update skips a needs-correction skill by default, updates it with the flag', async () => {
  const { home, proj } = await makeSandbox();
  const installed = await runCli(['install', ...CLAUDE, '--skill', 'seo', ALLOW], { home, proj });
  assert.equal(installed.code, 0, installed.stderr);

  // Default update: warn + skip, exit 0.
  const skipped = await runCli(['update', ...CLAUDE], { home, proj });
  assert.equal(skipped.code, 0, skipped.stderr);
  assert.match(skipped.stderr, /warning: skipping update of skill 'seo' \(needs-correction/);
  assert.match(skipped.stdout, /skipped: seo \(needs-correction/);

  // With the flag: the update proceeds, with a one-line note.
  const updated = await runCli(['update', ...CLAUDE, ALLOW], { home, proj });
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stderr, /note: updating 1 needs-correction skill \(--allow-needs-correction\): seo/);
  assert.doesNotMatch(updated.stderr, /skipping update/);
});
