// paths.test.mjs — toPosixPath normalization (Stage D, W-2/W-3).
// The helper splits on both separators so Windows-style inputs
// normalize correctly on any platform, including POSIX.

import test from 'node:test';
import assert from 'node:assert/strict';
import { toPosixPath } from '../scripts/lib/paths.mjs';

test('toPosixPath leaves POSIX paths unchanged', () => {
  assert.equal(toPosixPath('skills/backend/nestjs'), 'skills/backend/nestjs');
  assert.equal(toPosixPath('skills/upstream/vercel/web-design-guidelines'), 'skills/upstream/vercel/web-design-guidelines');
  assert.equal(toPosixPath('registry/skills.json'), 'registry/skills.json');
});

test('toPosixPath converts Windows backslashes', () => {
  assert.equal(toPosixPath('skills\\backend\\nestjs'), 'skills/backend/nestjs');
  assert.equal(toPosixPath('skills\\upstream\\vercel\\web-design-guidelines'), 'skills/upstream/vercel/web-design-guidelines');
});

test('toPosixPath handles mixed separators', () => {
  assert.equal(toPosixPath('skills\\backend/nestjs'), 'skills/backend/nestjs');
});

test('toPosixPath converts absolute Windows paths', () => {
  assert.equal(toPosixPath('C:\\repo\\skills\\nestjs'), 'C:/repo/skills/nestjs');
});

test('normalized paths match POSIX prefixes (the W-2/W-3 case)', () => {
  const rel = toPosixPath('skills\\upstream\\agentic-seo\\seo\\scripts\\broken_links.py');
  assert.equal(rel.startsWith('skills/upstream/'), true);
  assert.equal(toPosixPath('evals\\reports\\latest.json').startsWith('evals/reports/'), true);
});
