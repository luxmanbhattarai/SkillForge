// targets.test.mjs — unit tests for install target definitions.
// These pin the verified vendor paths: if a vendor moves a path,
// the test failure is the signal to re-verify, not to edit blindly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGETS, resolveTarget, targetIds, VERIFIED_DATE } from '../scripts/install/targets.mjs';

test('all four targets exist with skills paths', () => {
  assert.deepEqual(targetIds().sort(), ['antigravity', 'claude-code', 'codex', 'cursor']);
  for (const def of Object.values(TARGETS)) {
    assert.ok(def.skills.project);
    assert.ok(def.skills.user);
    assert.ok(def.docs.skills.startsWith('https://'));
  }
});

test('verification date is recorded', () => {
  assert.match(VERIFIED_DATE, /^\d{4}-\d{2}-\d{2}$/);
});

test('resolveTarget handles ids and aliases', () => {
  assert.equal(resolveTarget('claude-code').id, 'claude-code');
  assert.equal(resolveTarget('claude').id, 'claude-code');
  assert.equal(resolveTarget('CLAUDE').id, 'claude-code');
  assert.equal(resolveTarget('cursor').id, 'cursor');
  assert.equal(resolveTarget('codex').id, 'codex');
  assert.equal(resolveTarget('antigravity').id, 'antigravity');
  assert.equal(resolveTarget('nope'), null);
  assert.equal(resolveTarget(null), null);
});

test('Claude Code and Cursor paths are unchanged from v1.0.0', () => {
  assert.deepEqual(TARGETS['claude-code'].skills, { project: '.claude/skills', user: '.claude/skills' });
  assert.deepEqual(TARGETS.cursor.skills, { project: '.cursor/skills', user: '.cursor/skills' });
});

test('Codex uses the current .agents/skills paths; .codex/skills is legacy', () => {
  assert.deepEqual(TARGETS.codex.skills, { project: '.agents/skills', user: '.agents/skills' });
  assert.deepEqual(TARGETS.codex.legacySkills, { project: '.codex/skills', user: '.codex/skills' });
});

test('Antigravity uses .agents/skills and ~/.gemini/config/skills', () => {
  assert.deepEqual(TARGETS.antigravity.skills, { project: '.agents/skills', user: '.gemini/config/skills' });
  assert.deepEqual(TARGETS.antigravity.legacySkills, { project: '.agent/skills', user: '.agent/skills' });
});

test('agents locations and formats', () => {
  assert.deepEqual(TARGETS['claude-code'].agents, { project: '.claude/agents', user: '.claude/agents', format: 'markdown' });
  assert.deepEqual(TARGETS.cursor.agents, { project: '.cursor/agents', user: '.cursor/agents', format: 'markdown' });
  assert.deepEqual(TARGETS.codex.agents, { project: '.codex/agents', user: '.codex/agents', format: 'toml' });
  assert.deepEqual(TARGETS.antigravity.agents, { project: '.agents/agents', user: '.gemini/config/agents', format: 'markdown' });
});

test('only Antigravity has a workflows location, and it is deprecated', () => {
  assert.equal(TARGETS['claude-code'].workflows, null);
  assert.equal(TARGETS.cursor.workflows, null);
  assert.equal(TARGETS.codex.workflows, null);
  assert.equal(TARGETS.antigravity.workflows.project, '.agents/workflows');
  assert.equal(TARGETS.antigravity.workflows.user, '.gemini/config/global_workflows');
  assert.equal(TARGETS.antigravity.workflows.deprecated, true);
});
