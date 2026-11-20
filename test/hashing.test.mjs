// hashing.test.mjs — unit tests for file/tree hashing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { hashFile, hashTree, treeFingerprint, diffFileMaps, sha256Hex } from '../scripts/install/hashing.mjs';
import { makeSandbox } from './helpers.mjs';

test('hashFile is stable and prefixed', async () => {
  const { base } = await makeSandbox();
  const f = path.join(base, 'a.txt');
  await writeFile(f, 'hello');
  const h1 = await hashFile(f);
  const h2 = await hashFile(f);
  assert.equal(h1, h2);
  assert.equal(h1, `sha256:${sha256Hex('hello')}`);
});

test('hashTree hashes recursively with posix paths and records symlinks', async () => {
  const { base } = await makeSandbox();
  const dir = path.join(base, 'tree');
  await mkdir(path.join(dir, 'sub'), { recursive: true });
  await writeFile(path.join(dir, 'a.txt'), 'a');
  await writeFile(path.join(dir, 'sub', 'b.txt'), 'b');
  await symlink('a.txt', path.join(dir, 'link.txt'));
  const tree = await hashTree(dir);
  assert.equal(tree.size, 3);
  assert.ok(tree.get('a.txt').startsWith('sha256:'));
  assert.ok(tree.get('sub/b.txt').startsWith('sha256:'));
  assert.equal(tree.get('link.txt'), 'link:a.txt');
});

test('treeFingerprint is order-independent and content-sensitive', async () => {
  const a = new Map([['a.txt', 'sha256:1'], ['b.txt', 'sha256:2']]);
  const b = new Map([['b.txt', 'sha256:2'], ['a.txt', 'sha256:1']]);
  assert.equal(treeFingerprint(a), treeFingerprint(b));
  const c = new Map([['a.txt', 'sha256:1'], ['b.txt', 'sha256:3']]);
  assert.notEqual(treeFingerprint(a), treeFingerprint(c));
});

test('diffFileMaps reports added, removed, and changed files', () => {
  const a = new Map([['same', 'h1'], ['changed', 'h1'], ['removed', 'h1']]);
  const b = new Map([['same', 'h1'], ['changed', 'h2'], ['added', 'h1']]);
  const d = diffFileMaps(a, b);
  assert.equal(d.same, false);
  assert.deepEqual(d.added, ['added']);
  assert.deepEqual(d.removed, ['removed']);
  assert.deepEqual(d.changed, ['changed']);
  assert.equal(diffFileMaps(a, a).same, true);
});
