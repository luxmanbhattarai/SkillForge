// registry.test.mjs — tests for the registry schema validator, the
// registry validator CLI, the registry generator, and the query CLI.
//
// Negative validator tests copy the real repo tree to a temp dir
// (minus .git), break one thing, and run the validator with --root.
// Nothing here touches the real registry files except the
// determinism test, which regenerates them and asserts zero diff
// (the same property CI checks).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { validateAgainstSchema } from '../scripts/lib/schema-validate.mjs';
import { REPO_ROOT } from './helpers.mjs';

const VALIDATE_REGISTRY = path.join(REPO_ROOT, 'scripts', 'validate-registry.mjs');
const QUERY = path.join(REPO_ROOT, 'scripts', 'query-skills.mjs');
const GENERATOR = path.join(REPO_ROOT, 'scripts', 'generate-registry.mjs');

function runNode(script, args = [], { cwd = REPO_ROOT } = {}) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { cwd, timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function copyRepo() {
  const dest = await mkdtemp(path.join(os.tmpdir(), 'skillforge-registry-test-'));
  await cp(REPO_ROOT, dest, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}.git`),
  });
  return dest;
}

async function mutateJson(file, fn) {
  const doc = JSON.parse(await readFile(file, 'utf8'));
  fn(doc);
  await writeFile(file, JSON.stringify(doc, null, 2) + '\n');
}

async function hashRegistryFiles(root) {
  const files = ['skills.json', 'categories.json', 'sources.json', 'compatibility.json', 'versions.json', 'agents.json', 'workflows.json'];
  const hash = createHash('sha256');
  for (const f of files) hash.update(await readFile(path.join(root, 'registry', f)));
  return hash.digest('hex');
}

// --- schema validator unit tests ---

test('schema validator: type, required, enum, additionalProperties', () => {
  const schema = {
    type: 'object',
    required: ['name', 'status'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      status: { type: 'string', enum: ['verified', 'unverified'] },
      count: { type: 'integer' },
      note: { type: ['string', 'null'] },
    },
  };
  assert.deepEqual(validateAgainstSchema({ name: 'x', status: 'verified' }, schema), []);
  assert.deepEqual(validateAgainstSchema({ name: 'x', status: 'verified', note: null, count: 3 }, schema), []);
  const missing = validateAgainstSchema({ name: 'x' }, schema);
  assert.equal(missing.length, 1);
  assert.match(missing[0], /missing required property 'status'/);
  const badEnum = validateAgainstSchema({ name: 'x', status: 'bogus' }, schema);
  assert.equal(badEnum.length, 1);
  assert.match(badEnum[0], /not one of/);
  const extra = validateAgainstSchema({ name: 'x', status: 'verified', nope: 1 }, schema);
  assert.equal(extra.length, 1);
  assert.match(extra[0], /additional property 'nope'/);
  const badType = validateAgainstSchema({ name: 5, status: 'verified' }, schema);
  assert.equal(badType.length, 1);
  assert.match(badType[0], /expected type string, got integer/);
  const badInt = validateAgainstSchema({ name: 'x', status: 'verified', count: 1.5 }, schema);
  assert.equal(badInt.length, 1);
  assert.match(badInt[0], /expected type integer, got number/);
});

test('schema validator: arrays, items, minItems, nested paths', () => {
  const schema = {
    type: 'object',
    required: ['tags'],
    properties: {
      tags: { type: 'array', minItems: 1, items: { type: 'string' } },
    },
  };
  assert.deepEqual(validateAgainstSchema({ tags: ['a'] }, schema), []);
  const empty = validateAgainstSchema({ tags: [] }, schema);
  assert.equal(empty.length, 1);
  assert.match(empty[0], /minimum is 1/);
  const badItem = validateAgainstSchema({ tags: ['a', 7] }, schema);
  assert.equal(badItem.length, 1);
  assert.match(badItem[0], /^\$\.tags\[1\]:/);
});

test('schema validator: additionalProperties as a schema', () => {
  const schema = {
    type: 'object',
    additionalProperties: { type: 'string' },
  };
  assert.deepEqual(validateAgainstSchema({ a: 'x', b: 'y' }, schema), []);
  const bad = validateAgainstSchema({ a: 'x', b: 2 }, schema);
  assert.equal(bad.length, 1);
  assert.match(bad[0], /^\$\.b:/);
});

test('schema validator: unsupported keyword fails loudly', () => {
  const schema = { type: 'object', properties: { a: { type: 'string', pattern: '^x' } } };
  const errs = validateAgainstSchema({ a: 'xyz' }, schema);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /unsupported schema keyword 'pattern'/);
});

test('schema validator: $schema/$id metadata is ignored', () => {
  const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://example.com/x', type: 'string' };
  assert.deepEqual(validateAgainstSchema('ok', schema), []);
});

// --- validator CLI on the real repo ---

test('validate-registry passes on the real registry', async () => {
  const r = await runNode(VALIDATE_REGISTRY);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Checked 277 skills, 24 agents, 16 workflows/);
  assert.match(r.stdout, /PASS/);
});

// --- validator CLI negatives (temp copies) ---

test('validate-registry fails on a missing verification-status entry', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'sources', 'verification-status.json'), (doc) => {
      delete doc.statuses.nextjs;
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /no entry for skill 'nextjs'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate-registry fails when the sidecar disagrees with the audit table', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'sources', 'verification-status.json'), (doc) => {
      doc.statuses.nextjs.status = 'unverified';
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /Phase 3 audit says 'Verified'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate-registry fails on an invalid status value (schema)', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'skills.json'), (doc) => {
      doc.skills.find((s) => s.name === 'nextjs').status = 'bogus';
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /not one of/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate-registry fails on a related skill that does not exist', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'skills.json'), (doc) => {
      doc.skills.find((s) => s.name === 'nextjs').related.push('no-such-skill');
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /unknown related skill 'no-such-skill'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate-registry fails when an agent references an unknown skill', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'agents.json'), (doc) => {
      doc.agents[0].discover.push('no-such-skill');
    });
    const r = await runNode(VALIDATE_REGISTRY, ['--root', root]);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /references unknown skill 'no-such-skill'/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// --- generator determinism ---

test('registry generation is deterministic (regenerate = zero diff)', async () => {
  const before = await hashRegistryFiles(REPO_ROOT);
  const r = await runNode(GENERATOR);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const after = await hashRegistryFiles(REPO_ROOT);
  assert.equal(after, before);
});

// --- query CLI smoke tests ---

test('query CLI: search, show, status, categories, stale', async () => {
  let r = await runNode(QUERY, ['search', 'nextjs']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /nextjs \[frontend\] \(verified\)/);

  r = await runNode(QUERY, ['search', 'zzzz-no-match']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /No skills match/);

  r = await runNode(QUERY, ['show', 'nextjs']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /nextjs \[frontend\] — verified/);
  assert.match(r.stdout, /Related:/);

  r = await runNode(QUERY, ['show', 'no-such-skill']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Unknown skill/);

  r = await runNode(QUERY, ['status', '--json']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const status = JSON.parse(r.stdout);
  assert.equal(status.total, 277);
  assert.equal(status.counts.verified, 204);
  assert.equal(status.counts.unverified, 51);
  assert.equal(status.counts['verified-with-limitations'], 16);
  assert.equal(status.counts['needs-correction'], 6);

  r = await runNode(QUERY, ['categories']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /277 skills in 18 categories/);

  r = await runNode(QUERY, ['stale', '--days', '180']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /No skills are stale/);
});

test('query CLI: stale exits 1 when a skill is stale', async () => {
  const root = await copyRepo();
  try {
    await mutateJson(path.join(root, 'registry', 'skills.json'), (doc) => {
      doc.skills.find((s) => s.name === 'nextjs').last_verified = '2020-01-01';
    });
    const r = await runNode(QUERY, ['--root', root, 'stale', '--days', '180']);
    assert.equal(r.code, 1, r.stdout);
    assert.match(r.stdout, /nextjs.*last verified 2020-01-01/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('query CLI: deps, related, compat, agents, workflows', async () => {
  let r = await runNode(QUERY, ['deps', 'nextjs']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /no skill in this library declares a hard dependency/);
  assert.match(r.stdout, /Agents \(2\): frontend-specialist, vercel-specialist/);

  r = await runNode(QUERY, ['related', 'nextjs']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /astro \[frontend\]/);

  r = await runNode(QUERY, ['compat', 'nextjs']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Requires Node\.js 24 LTS/);

  r = await runNode(QUERY, ['agents']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /24 agents/);

  r = await runNode(QUERY, ['workflows']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /16 workflows/);

  r = await runNode(QUERY, ['bogus-command']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Unknown command/);
});
