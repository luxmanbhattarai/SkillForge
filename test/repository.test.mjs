// repository.test.mjs — acceptance tests for repository-level invariants
// (Stage E, mission brief §11 areas 1, 12, and part of 14):
// the top-level layout, registry-vs-disk agreement for the registries
// no other validator reads (agents, workflows, categories), the
// zero-dependency policy, and the LF line-ending policy.
//
// Counts are derived from disk and cross-checked against the registry,
// not hardcoded: hardcoded counts break every time the library grows
// (see test/library.test.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../test-support/helpers.mjs';

async function countFiles(dir, name) {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countFiles(path.join(dir, e.name), name);
    else if (e.name === name) n++;
  }
  return n;
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(REPO_ROOT, rel), 'utf8'));
}

async function isDirectory(rel) {
  return (await stat(path.join(REPO_ROOT, rel))).isDirectory();
}

async function isFile(rel) {
  return (await stat(path.join(REPO_ROOT, rel))).isFile();
}

// --- Area 1: repository structure ----------------------------------------

test('repository structure: expected top-level layout exists', async () => {
  // Deleting or renaming a top-level directory (or a root document)
  // breaks discovery, the installer, and CI — and nothing else in the
  // suite asserts the layout, so this test is the tripwire.
  const dirs = [
    'agents', 'ai', 'docs', 'evals', 'registry', 'research', 'scripts',
    'skills', 'sources', 'templates', 'test', 'test-support', 'workflows',
    '.github',
  ];
  for (const d of dirs) {
    assert.ok(await isDirectory(d), `expected top-level directory: ${d}`);
  }
  const files = [
    'package.json', 'README.md', 'LICENSE', 'AGENTS.md', 'CONTRIBUTING.md',
    'SECURITY.md', 'CHANGELOG.md',
  ];
  for (const f of files) {
    assert.ok(await isFile(f), `expected top-level file: ${f}`);
  }
  // skills/ holds category directories only — no stray files — and
  // each category holds skill directories only. A misplaced file here
  // is invisible to the validators (they walk for SKILL.md) but
  // breaks the documented layout.
  for (const e of await readdir(path.join(REPO_ROOT, 'skills'), { withFileTypes: true })) {
    assert.ok(e.isDirectory(), `skills/${e.name} is not a directory`);
    for (const s of await readdir(path.join(REPO_ROOT, 'skills', e.name), { withFileTypes: true })) {
      assert.ok(s.isDirectory(), `skills/${e.name}/${s.name} is not a directory`);
    }
  }
  // agents/ and workflows/ hold Markdown definitions only.
  for (const dir of ['agents', 'workflows']) {
    for (const f of await readdir(path.join(REPO_ROOT, dir))) {
      assert.ok(f.endsWith('.md'), `${dir}/${f} is not a Markdown file`);
    }
  }
});

test('repository structure: category directories match the registry', async () => {
  const categories = await readJson('registry/categories.json');
  const regNames = categories.categories.map((c) => c.name).sort();
  const diskNames = (await readdir(path.join(REPO_ROOT, 'skills'), { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  assert.deepEqual(diskNames, regNames, 'skills/ directories disagree with registry/categories.json');
  // Each category's count field must equal the skills actually on disk
  // in that category — a stale count misleads discovery and reporting.
  for (const c of categories.categories) {
    const onDisk = await countFiles(path.join(REPO_ROOT, 'skills', c.name), 'SKILL.md');
    assert.equal(c.count, onDisk, `category '${c.name}': registry count ${c.count} != ${onDisk} on disk`);
    assert.equal(c.skills.length, onDisk, `category '${c.name}': registry lists ${c.skills.length} skills, ${onDisk} on disk`);
  }
});

test('repository structure: registry totals and names agree with disk', async () => {
  // validate-skills.mjs checks the skills registry paths, but no
  // validator reads agents.json, workflows.json, or the total_* fields
  // at all — a registry that drifted from disk would ship silently.
  const skills = await readJson('registry/skills.json');
  const agents = await readJson('registry/agents.json');
  const workflows = await readJson('registry/workflows.json');
  const diskSkills = await countFiles(path.join(REPO_ROOT, 'skills'), 'SKILL.md');
  const diskAgents = (await readdir(path.join(REPO_ROOT, 'agents')))
    .filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
  const diskWorkflows = (await readdir(path.join(REPO_ROOT, 'workflows')))
    .filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();

  assert.equal(skills.total_skills, skills.skills.length, 'skills.json total_skills disagrees with its array');
  assert.equal(skills.skills.length, diskSkills, 'skills.json lists a different number of skills than exist on disk');
  assert.equal(agents.total_agents, agents.agents.length, 'agents.json total_agents disagrees with its array');
  assert.equal(agents.agents.length, diskAgents.length, 'agents.json lists a different number of agents than exist on disk');
  assert.deepEqual(
    agents.agents.map((a) => a.name).sort(),
    diskAgents,
    'agents.json names disagree with agents/*.md',
  );
  assert.equal(workflows.total_workflows, workflows.workflows.length, 'workflows.json total_workflows disagrees with its array');
  assert.equal(workflows.workflows.length, diskWorkflows.length, 'workflows.json lists a different number of workflows than exist on disk');
  assert.deepEqual(
    workflows.workflows.map((w) => w.name).sort(),
    diskWorkflows,
    'workflows.json names disagree with workflows/*.md',
  );
});

test('repository structure: package.json declares the acceptance scripts', async () => {
  const pkg = await readJson('package.json');
  assert.equal(pkg.name, 'skillforge');
  assert.equal(pkg.type, 'module', 'package.json must declare ESM (type: module)');
  assert.equal(pkg.engines?.node, '>=24', 'package.json must declare engines.node >= 24');
  const expected = [
    'test', 'validate', 'validate:strict',
    'check:frontmatter', 'check:links', 'check:duplicates', 'check:sources',
    'check:agents', 'check:registry', 'check:security', 'check:upstream',
    'score', 'evals', 'evals:generate', 'registry', 'report', 'query',
    'install-skills',
  ];
  for (const name of expected) {
    assert.ok(pkg.scripts?.[name], `package.json is missing npm script: ${name}`);
  }
  // Every script that invokes a .mjs file must point at a file that
  // exists: a renamed script with a stale package.json entry fails
  // here instead of failing in CI.
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    const m = cmd.match(/(\S+\.mjs)/);
    if (m) {
      assert.ok(
        existsSync(path.join(REPO_ROOT, m[1])),
        `npm script '${name}' references missing file: ${m[1]}`,
      );
    }
  }
});

// --- Area 12: dependency integrity ----------------------------------------
// This repository is zero-dependency by design (Node >= 18 builtins
// only). A stray `npm install <x>` must fail the suite, not ship.

test('dependency integrity: package.json declares zero dependencies', async () => {
  const pkg = await readJson('package.json');
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies']) {
    const value = pkg[key];
    assert.ok(
      value === undefined || (typeof value === 'object' && Object.keys(value).length === 0),
      `package.json must not declare ${key} (zero-dependency policy): ${JSON.stringify(value)}`,
    );
  }
  for (const key of ['overrides', 'resolutions']) {
    assert.equal(pkg[key], undefined, `package.json must not declare ${key} (zero-dependency policy)`);
  }
});

test('dependency integrity: no lockfile or installed dependencies in the repo', async () => {
  // A lockfile (or a node_modules directory) means something was
  // installed — the zero-dependency policy is broken even if
  // package.json itself looks clean.
  for (const artifact of ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'node_modules', '.yarn']) {
    assert.ok(!existsSync(path.join(REPO_ROOT, artifact)), `unexpected dependency artifact in repo: ${artifact}`);
  }
});

test('dependency integrity: every import resolves to a relative path or a node: builtin', async () => {
  // The manifest check above catches `npm install <x>`; this catches
  // the other half — code that imports a package that was never
  // declared (which would crash on a clean checkout). Scanned roots
  // are the runnable code only: skill example code under skills/ is
  // documentation, not repo code, and legitimately imports packages.
  const specifiers = [];
  let filesScanned = 0;
  const specRe = /(?:from\s+|import\(\s*|require\(\s*|import\s+)['"]([^'"]+)['"]/g;
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/\.(mjs|js|cjs)$/.test(e.name)) {
        filesScanned++;
        const text = await readFile(full, 'utf8');
        for (const m of text.matchAll(specRe)) {
          specifiers.push({ spec: m[1], file: path.relative(REPO_ROOT, full) });
        }
      }
    }
  }
  for (const dir of ['scripts', 'test', 'test-support', 'evals']) {
    await walk(path.join(REPO_ROOT, dir));
  }
  // Guards against a dead scan: the regex must actually find code.
  assert.ok(filesScanned > 0, 'import scan found no code files');
  assert.ok(specifiers.length > 0, 'import scan found no imports');
  const bare = specifiers.filter(
    ({ spec }) => !spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('node:'),
  );
  assert.deepEqual(
    bare,
    [],
    `bare (non-relative, non-node:) imports found — zero-dependency policy violated: ${JSON.stringify(bare)}`,
  );
});

// --- Area 14 (part): cross-platform ---------------------------------------
// Path normalization itself is covered by test/paths.test.mjs; this is
// the line-ending half of the same area.

test('cross-platform: .gitattributes normalizes line endings to LF', async () => {
  // Without eol=lf, Git for Windows checks out CRLF, and the
  // frontmatter parser / validators see different bytes per platform.
  // The file's own comment records this as the Windows CI leg's
  // protection — deleting the rule must fail the suite.
  const text = await readFile(path.join(REPO_ROOT, '.gitattributes'), 'utf8');
  assert.match(text, /^\*\s+text=auto\s+eol=lf/m, '.gitattributes must normalize line endings to LF (* text=auto eol=lf)');
});
