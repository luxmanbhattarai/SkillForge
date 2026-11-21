// validators.test.mjs — regression tests for the offline validators that
// had no test coverage (Stage E, mission brief §11 areas 2, 3, 4).
// validate-skills, validate-registry, the security scanner, the link
// checker's machinery, and the agents/workflows validator already have
// tests; these four did not:
//
//   check-frontmatter  (area 2 — skill metadata)
//   check-duplicates   (area 4 — skill uniqueness; near-duplicate
//                       descriptions are unique to this script,
//                       validate-skills only catches exact duplicates)
//   check-sources      (area 3 — skill references / provenance)
//   check-agents       (areas 5, 6 — agent/workflow metadata; the
//                       checkContent library is tested in
//                       agents-workflows.test.mjs, but the script's own
//                       wiring — registry load, tree walk — was not)
//
// Each script gets a real-repo run (it must pass on the current tree)
// and, where the script can fail, a fixture-repo run proving it does
// fail on bad input. Fixture repos copy the real script (fresh from
// the repo at test time) plus its local lib imports into a temp dir;
// the scripts resolve their root from their own location, so the
// layout scripts/<script>.mjs + scripts/lib/*.mjs reproduces the
// real invocation. Nothing here touches the real repo tree.
//
// Deliberately NOT covered here: check-upstream (network-dependent,
// monitoring-only, exits 0 even on drift), score-skills and
// generate-report (not among the 14 acceptance areas; CI runs both).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT } from '../test-support/helpers.mjs';

function runNode(script, args = []) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function countSkillFiles(dir) {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countSkillFiles(path.join(dir, e.name));
    else if (e.name === 'SKILL.md') n++;
  }
  return n;
}

// Minimal fake repo root: copies the named script (and its local lib
// imports) out of the real repo so the script under test is the
// current code, then lets the caller add fixture content.
async function makeFixtureRepo(scriptRel, libRels = []) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-validators-test-'));
  await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await cp(path.join(REPO_ROOT, 'scripts', scriptRel), path.join(root, 'scripts', scriptRel));
  for (const lib of libRels) {
    await cp(path.join(REPO_ROOT, 'scripts', 'lib', lib), path.join(root, 'scripts', 'lib', lib));
  }
  return root;
}

async function writeSkill(root, relDir, name, description) {
  const dir = path.join(root, 'skills', relDir);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nBody.\n`,
  );
}

// --- check-frontmatter (area 2) -------------------------------------------

test('check-frontmatter passes on the real repo', async () => {
  const expected = await countSkillFiles(path.join(REPO_ROOT, 'skills'));
  const r = await runNode(path.join(REPO_ROOT, 'scripts', 'check-frontmatter.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`Checked frontmatter of ${expected} skills\\.`));
  assert.match(r.stdout, /^PASS\./m);
  assert.doesNotMatch(r.stdout, /ERROR/);
});

// --- check-duplicates (area 4) --------------------------------------------

test('check-duplicates passes on the real repo', async () => {
  const expected = await countSkillFiles(path.join(REPO_ROOT, 'skills'));
  const r = await runNode(path.join(REPO_ROOT, 'scripts', 'check-duplicates.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`Compared ${expected} skills \\(threshold 0\\.8\\)\\.`));
  assert.match(r.stdout, /^PASS\./m);
  assert.doesNotMatch(r.stdout, /ERROR/);
});

test('check-duplicates flags a duplicate name and near-duplicate descriptions', async () => {
  const root = await makeFixtureRepo('check-duplicates.mjs', ['frontmatter.mjs', 'skill-files.mjs']);
  try {
    await writeSkill(root, 'cat-a/dup', 'dup', 'First duplicate skill.');
    await writeSkill(root, 'cat-b/dup', 'dup', 'Second duplicate skill.');
    // Near-duplicate descriptions: 12 shared tokens of 14 total
    // (Jaccard 0.86 >= 0.8 threshold); only 'fast' vs 'secure' differs.
    await writeSkill(root, 'cat-a/alpha-one', 'alpha-one',
      'Build fast reliable APIs with authentication caching and rate limiting for production services');
    await writeSkill(root, 'cat-a/alpha-two', 'alpha-two',
      'Build secure reliable APIs with authentication caching and rate limiting for production services');
    const r = await runNode(path.join(root, 'scripts', 'check-duplicates.mjs'));
    assert.match(r.stdout, /Compared 4 skills \(threshold 0\.8\)\./);
    assert.equal(r.code, 1, `duplicate names must fail the check: ${r.stdout}`);
    // The checker prints platform-native paths (backslashes on
    // Windows); normalize before matching the POSIX form.
    assert.match(r.stdout.replace(/\\/g, '/'), /ERROR duplicate name 'dup': skills\/cat-a\/dup\/SKILL\.md and skills\/cat-b\/dup\/SKILL\.md/);
    assert.match(r.stdout, /WARN  near-duplicate descriptions \(0\.86\): 'alpha-one' and 'alpha-two'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- check-sources (area 3) -----------------------------------------------

test('check-sources passes on the real repo', async () => {
  const expected = await countSkillFiles(path.join(REPO_ROOT, 'skills'));
  const sources = JSON.parse(await readFile(path.join(REPO_ROOT, 'registry', 'sources.json'), 'utf8'));
  const r = await runNode(path.join(REPO_ROOT, 'scripts', 'check-sources.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`Checked ${expected} skills against ${sources.sources.length} sources\\.`));
  // Warnings are not asserted: last_verified staleness warnings are
  // time-driven (a skill goes stale 180 days after verification),
  // so asserting zero warnings would make this test fail on a date,
  // not on a regression. Errors are the failure signal.
  assert.match(r.stdout, /^PASS with \d+ warning\(s\)\./m);
  assert.doesNotMatch(r.stdout, /ERROR/);
});

test('check-sources flags a skill with an unknown or missing source', async () => {
  const root = await makeFixtureRepo('check-sources.mjs');
  try {
    await mkdir(path.join(root, 'registry'), { recursive: true });
    await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify({
      skills: [
        { name: 'good-skill', source: 'original', last_verified: '2026-11-20' },
        { name: 'bad-skill', source: 'no-such-source' },
        { name: 'nosrc-skill' },
      ],
    }));
    await writeFile(path.join(root, 'registry', 'sources.json'), JSON.stringify({
      sources: [{ id: 'original', url: 'https://example.com', license: 'MIT' }],
    }));
    const r = await runNode(path.join(root, 'scripts', 'check-sources.mjs'));
    assert.match(r.stdout, /Checked 3 skills against 1 sources\./);
    assert.equal(r.code, 1, `unknown/missing sources must fail the check: ${r.stdout}`);
    assert.match(r.stdout, /ERROR bad-skill: unknown source id 'no-such-source'/);
    assert.match(r.stdout, /ERROR nosrc-skill: no source recorded/);
    assert.doesNotMatch(r.stdout, /good-skill: no source|good-skill: unknown source/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- check-agents (areas 5, 6) --------------------------------------------

test('check-agents passes on the real repo', async () => {
  const skills = await countSkillFiles(path.join(REPO_ROOT, 'skills'));
  const agents = (await readdir(path.join(REPO_ROOT, 'agents'))).filter((f) => f.endsWith('.md')).length;
  const workflows = (await readdir(path.join(REPO_ROOT, 'workflows'))).filter((f) => f.endsWith('.md')).length;
  const r = await runNode(path.join(REPO_ROOT, 'scripts', 'check-agents-workflows.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(
    r.stdout,
    new RegExp(`Checked ${agents + workflows} files \\(${agents} agents, ${workflows} workflows\\) against ${skills} skills\\.`),
  );
  assert.match(r.stdout, /^PASS\./m);
  assert.doesNotMatch(r.stdout, /ERROR/);
});
