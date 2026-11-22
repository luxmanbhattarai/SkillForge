// generate-sbom.test.mjs — tests for the SBOM generator
// (scripts/generate-sbom.mjs).
//
// Most tests run against a small synthetic repo in a temp dir (no
// git, so the filesystem-walk path is exercised). One test runs
// against the real repo and checks the inventory matches
// `git ls-files` exactly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  generateSbom, collectFiles, parseWorkflowActions, hashFile,
  SBOM_TOOL_VERSION, SBOM_SPEC_VERSION,
} from '../scripts/generate-sbom.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

function tmpdir() {
  return mkdtempSync(path.join(os.tmpdir(), 'skillforge-sbom-test-'));
}

function fixtureRepo() {
  const root = tmpdir();
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: 'fixture-pkg', version: '2.0.0', description: 'A fixture.',
    license: 'MIT', homepage: 'https://example.invalid/fixture',
  }, null, 2));
  mkdirSync(path.join(root, 'skills', 'core', 'demo'), { recursive: true });
  writeFileSync(path.join(root, 'skills', 'core', 'demo', 'SKILL.md'), '# Demo skill\n');
  writeFileSync(path.join(root, 'README.md'), '# Fixture\n');
  mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  writeFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), [
    'name: CI',
    'jobs:',
    '  test:',
    '    steps:',
    '      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
    '      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0',
    '',
  ].join('\n'));
  return root;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

test('hashFile returns the SHA-256 of a file', async () => {
  const dir = tmpdir();
  try {
    const file = path.join(dir, 'a.txt');
    writeFileSync(file, 'hello');
    assert.equal(await hashFile(file), sha256('hello'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseWorkflowActions extracts pinned actions with tags', () => {
  const content = [
    'steps:',
    '  - name: Check out repository',
    '    uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
    '  - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0',
    '  - uses: docker://alpine:3.19',
    '  - uses: ./local-action',
    '  - uses: github/codeql-action/upload-sarif@3c182f74b3f6d1a58d8b2fc4f6f0c5e3b0c1a2b3',
  ].join('\n');
  const actions = parseWorkflowActions(content, '.github/workflows/ci.yml');
  assert.equal(actions.length, 3);
  assert.deepEqual(actions[0], {
    owner: 'actions', repo: 'checkout', subpath: '',
    ref: '3d3c42e5aac5ba805825da76410c181273ba90b1', tag: 'v7.0.1',
    workflow: '.github/workflows/ci.yml',
  });
  assert.equal(actions[1].tag, 'v7.1.0');
  assert.equal(actions[2].tag, null); // no trailing comment: tag is null, ref still recorded
  assert.equal(actions[2].owner, 'github');
  assert.equal(actions[2].repo, 'codeql-action');
  assert.equal(actions[2].subpath, '/upload-sarif');
});

test('collectFiles walks a non-git tree, skipping .git and node_modules', async () => {
  const root = fixtureRepo();
  try {
    mkdirSync(path.join(root, '.git', 'objects'), { recursive: true });
    writeFileSync(path.join(root, '.git', 'config'), 'x');
    mkdirSync(path.join(root, 'node_modules', 'dep'), { recursive: true });
    writeFileSync(path.join(root, 'node_modules', 'dep', 'index.js'), 'x');
    const files = await collectFiles(root);
    assert.deepEqual(files, [
      '.github/workflows/ci.yml',
      'README.md',
      'package.json',
      'skills/core/demo/SKILL.md',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collectFiles skips symlinks escaping the tree', async () => {
  const root = fixtureRepo();
  const outside = tmpdir();
  try {
    const secret = path.join(outside, 'secret.txt');
    writeFileSync(secret, 'outside');
    symlinkSync(secret, path.join(root, 'escape.txt'));
    symlinkSync(path.join(root, 'README.md'), path.join(root, 'inside-link.txt'));
    const files = await collectFiles(root);
    assert.ok(!files.includes('escape.txt'));
    assert.ok(files.includes('inside-link.txt'));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('generateSbom on a fixture repo: CycloneDX shape, file hashes, pinned actions', async () => {
  const root = fixtureRepo();
  try {
    const sbom = await generateSbom(root);
    assert.equal(sbom.bomFormat, 'CycloneDX');
    assert.equal(sbom.specVersion, SBOM_SPEC_VERSION);
    assert.equal(sbom.version, 1);
    assert.equal(sbom.metadata.tools[0].name, 'generate-sbom.mjs');
    assert.equal(sbom.metadata.tools[0].version, SBOM_TOOL_VERSION);
    assert.ok(sbom.metadata.timestamp);

    // Root component: the package itself.
    assert.equal(sbom.metadata.component.type, 'application');
    assert.equal(sbom.metadata.component['bom-ref'], 'fixture-pkg@2.0.0');
    assert.equal(sbom.metadata.component.name, 'fixture-pkg');
    assert.equal(sbom.metadata.component.version, '2.0.0');
    assert.deepEqual(sbom.metadata.component.licenses, [{ license: { id: 'MIT' } }]);

    // Zero npm dependencies is recorded explicitly.
    const props = new Map(sbom.metadata.properties.map((p) => [p.name, p.value]));
    assert.equal(props.get('skillforge:npm-dependencies'), '0');
    assert.equal(props.get('skillforge:files'), '4');
    assert.equal(props.get('skillforge:github-actions'), '2');
    assert.equal(props.get('skillforge:git-commit'), undefined); // no git checkout

    const byRef = new Map(sbom.components.map((c) => [c['bom-ref'], c]));
    const readme = byRef.get('file:README.md');
    assert.equal(readme.type, 'file');
    assert.equal(readme.hashes[0].alg, 'SHA-256');
    assert.equal(readme.hashes[0].content, sha256('# Fixture\n'));
    const skill = byRef.get('file:skills/core/demo/SKILL.md');
    assert.equal(skill.hashes[0].content, sha256('# Demo skill\n'));

    const checkout = byRef.get('github-actions:actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1');
    assert.equal(checkout.type, 'library');
    assert.equal(checkout.name, 'actions/checkout');
    assert.equal(checkout.version, '3d3c42e5aac5ba805825da76410c181273ba90b1');
    assert.equal(checkout.purl, 'pkg:github/actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1');
    const checkoutProps = new Map(checkout.properties.map((p) => [p.name, p.value]));
    assert.equal(checkoutProps.get('skillforge:tag'), 'v7.0.1');
    assert.match(checkoutProps.get('skillforge:used-by'), /ci\.yml/);

    // Components are deterministic: same tree, same components
    // (only the timestamp varies).
    const again = await generateSbom(root);
    assert.deepEqual(again.components, sbom.components);
    assert.deepEqual(again.metadata.component, sbom.metadata.component);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generateSbom on the real repo matches git ls-files exactly', async () => {
  const sbom = await generateSbom(REPO_ROOT);
  const tracked = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n').filter(Boolean).sort();
  // Untracked files I created for this mission are NOT in the SBOM:
  // the inventory is the tracked tree (the release content). The
  // comparison below uses only files that are tracked.
  const fileRefs = sbom.components
    .filter((c) => c.type === 'file')
    .map((c) => c.name)
    .sort();
  assert.deepEqual(fileRefs, tracked);
  const props = new Map(sbom.metadata.properties.map((p) => [p.name, p.value]));
  assert.equal(props.get('skillforge:npm-dependencies'), '0');
  assert.equal(Number(props.get('skillforge:files')), tracked.length);
  assert.match(props.get('skillforge:git-commit'), /^[0-9a-f]{40}$/);
  assert.equal(sbom.metadata.component['bom-ref'], 'skillforge@1.1.0');
  // Every pinned action in the real workflows is captured, with a
  // full 40-hex SHA as its version.
  const actions = sbom.components.filter((c) => c.type === 'library');
  assert.ok(actions.length >= 2);
  for (const a of actions) {
    assert.match(a.version, /^[0-9a-f]{40}$/);
    assert.ok(a.purl.startsWith('pkg:github/'));
  }
  const names = actions.map((a) => a.name);
  assert.ok(names.includes('actions/checkout'));
  assert.ok(names.includes('actions/setup-node'));
});

test('CLI writes sbom.json and reports counts; --help exits 0', () => {
  const root = fixtureRepo();
  try {
    const out = path.join(root, 'out-sbom.json');
    const res = spawnSync(
      process.execPath,
      [path.join(REPO_ROOT, 'scripts', 'generate-sbom.mjs'), '--root', root, '--out', out],
      { encoding: 'utf8' },
    );
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /4 files, 2 pinned GitHub Actions, 0 npm dependencies/);
    assert.ok(existsSync(out));
    const sbom = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(sbom.bomFormat, 'CycloneDX');
    assert.equal(sbom.components.length, 6); // 4 files + 2 actions

    const help = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'generate-sbom.mjs'), '--help'], { encoding: 'utf8' });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /--out/);

    const bad = spawnSync(
      process.execPath,
      [path.join(REPO_ROOT, 'scripts', 'generate-sbom.mjs'), '--root', path.join(root, 'does-not-exist'), '--out', path.join(root, 'x.json')],
      { encoding: 'utf8' },
    );
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /SBOM generation failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
