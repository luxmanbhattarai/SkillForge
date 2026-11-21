// agents-workflows.test.mjs — unit tests for the agents/workflows
// validator (scripts/lib/agents-workflows.mjs) plus a live check that
// the real agents/ and workflows/ trees pass it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyToken, checkContent, AGENT_SECTIONS, WORKFLOW_SECTIONS } from '../scripts/lib/agents-workflows.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = {
  skills: new Set(['nextjs', 'typescript', 'sql-injection-prevention']),
  agents: new Set(['backend-specialist', 'security-specialist']),
  workflows: new Set(['feature-development']),
};
const fileExists = (rel) => rel === 'workflows/feature-development.md';

test('classifyToken resolves skills, agents, workflows, paths', () => {
  assert.equal(classifyToken('nextjs', index, fileExists).kind, 'skill');
  assert.equal(classifyToken('backend-specialist', index, fileExists).kind, 'agent');
  assert.equal(classifyToken('feature-development', index, fileExists).kind, 'workflow');
  assert.equal(classifyToken('workflows/feature-development.md', index, fileExists).kind, 'path');
});

test('classifyToken reports unknown references', () => {
  assert.equal(classifyToken('ddd', index, fileExists).kind, 'unknown');
  assert.equal(classifyToken('xss', index, fileExists).kind, 'unknown');
  assert.equal(classifyToken('workflows/nope.md', index, fileExists).kind, 'unknown');
});

test('classifyToken ignores prose, commands, filenames', () => {
  assert.equal(classifyToken('npm run build', index, fileExists).kind, 'ignored');
  assert.equal(classifyToken('llms.txt', index, fileExists).kind, 'ignored');
  assert.equal(classifyToken('MyClass', index, fileExists).kind, 'ignored');
});

test('checkContent accepts a well-formed agent', () => {
  const sections = AGENT_SECTIONS.map((s) => `## ${s}\n\nText.\n`).join('\n');
  const text = `# Test Agent\n\nIntro.\n\n${sections}`.replace(
    '## Skills it can discover\n\nText.',
    '## Skills it can discover\n\n| `nextjs` | Web apps. |\n| `typescript` | Typing. |',
  ).replace(
    '## Skills it should use\n\nText.',
    '## Skills it should use\n\nAlways load `nextjs`.',
  );
  const { errors } = checkContent({ relPath: 'agents/test.md', text, kind: 'agent', index, fileExists });
  assert.deepEqual(errors, []);
});

test('checkContent flags a missing section and an unresolved reference', () => {
  const text = `# Test Agent\n\n## Role\n\nText.\n\nUse \`ddd\` for the domain.\n`;
  const { errors } = checkContent({ relPath: 'agents/test.md', text, kind: 'agent', index, fileExists });
  assert.ok(errors.some((e) => e.message.includes('missing required section: ## Responsibilities')));
  assert.ok(errors.some((e) => e.message.includes('unresolved reference `ddd`')));
});

test('checkContent flags should-use skills missing from can-discover', () => {
  const sections = AGENT_SECTIONS.map((s) => `## ${s}\n\nText.\n`).join('\n');
  const text = `# Test Agent\n\n${sections}`.replace(
    '## Skills it can discover\n\nText.',
    '## Skills it can discover\n\n| `nextjs` | Web apps. |',
  ).replace(
    '## Skills it should use\n\nText.',
    '## Skills it should use\n\nAlways load `typescript`.',
  );
  const { errors } = checkContent({ relPath: 'agents/test.md', text, kind: 'agent', index, fileExists });
  assert.ok(errors.some((e) => e.message.includes('`typescript`') && e.message.includes('not in "Skills it can discover"')));
});

test('checkContent accepts a well-formed workflow', () => {
  const sections = WORKFLOW_SECTIONS.map((s) => `## ${s}\n\nText.\n`).join('\n');
  const text = `# Test Workflow\n\nIntro.\n\n${sections}`;
  const { errors } = checkContent({ relPath: 'workflows/test.md', text, kind: 'workflow', index, fileExists });
  assert.deepEqual(errors, []);
});

test('the real agents/ and workflows/ trees pass validation', () => {
  const registry = JSON.parse(readFileSync(path.join(ROOT, 'registry/skills.json'), 'utf8'));
  const real = {
    skills: new Set(registry.skills.map((s) => s.name)),
    agents: new Set(readdirSync(path.join(ROOT, 'agents')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))),
    workflows: new Set(readdirSync(path.join(ROOT, 'workflows')).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))),
  };
  const realExists = (rel) => {
    try { readFileSync(path.join(ROOT, rel)); return true; } catch { return false; }
  };
  const allErrors = [];
  for (const [dir, kind] of [['agents', 'agent'], ['workflows', 'workflow']]) {
    for (const f of readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith('.md'))) {
      const text = readFileSync(path.join(ROOT, dir, f), 'utf8');
      const { errors } = checkContent({ relPath: `${dir}/${f}`, text, kind, index: real, fileExists: realExists });
      allErrors.push(...errors.map((e) => `${dir}/${f}: ${e.message}`));
    }
  }
  assert.deepEqual(allErrors, []);
});
