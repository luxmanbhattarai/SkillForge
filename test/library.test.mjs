// library.test.mjs — unit tests for library loading, selection
// resolution, and the agent/workflow format transforms.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadLibrary, resolveSelection, deriveDescription, toMarkdownAgent, toTomlAgent, splitList, installedFileName } from '../scripts/install/library.mjs';
import { TARGETS } from '../scripts/install/targets.mjs';
import { REPO_ROOT, makeFixtureLibrary, makeSandbox } from '../test-support/helpers.mjs';

// Expected counts are derived from disk, not hardcoded: the registry must
// match the skills/agents/workflows actually present, and hardcoded counts
// break every time the library grows (Phase 4 grew skills 226 -> 277).
async function countFiles(dir, name) {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countFiles(path.join(dir, e.name), name);
    else if (e.name === name) n++;
  }
  return n;
}

async function diskCounts() {
  const skills = await countFiles(path.join(REPO_ROOT, 'skills'), 'SKILL.md');
  const agents = (await readdir(path.join(REPO_ROOT, 'agents'))).filter((f) => f.endsWith('.md')).length;
  const workflows = (await readdir(path.join(REPO_ROOT, 'workflows'))).filter((f) => f.endsWith('.md')).length;
  return { skills, agents, workflows };
}

test('loadLibrary reads the real registries (skills, agents, workflows)', async () => {
  const lib = await loadLibrary(REPO_ROOT);
  const expected = await diskCounts();
  assert.equal(lib.skills.size, expected.skills);
  assert.equal(lib.agents.size, expected.agents);
  assert.equal(lib.workflows.size, expected.workflows);
  assert.equal(lib.skills.get('nextjs').category, 'frontend');
  assert.equal(lib.skills.get('nextjs').source, 'skills/frontend/nextjs');
  assert.equal(lib.agents.get('frontend-specialist').source, 'agents/frontend-specialist.md');
  assert.equal(lib.workflows.get('seo-audit').source, 'workflows/seo-audit.md');
  // Descriptions come from the agents/workflows registries (M-10), not ''.
  assert.ok(lib.agents.get('frontend-specialist').description.length > 0);
  assert.ok(lib.workflows.get('seo-audit').description.length > 0);
  assert.equal(lib.categories.has('frontend'), true);
  assert.equal(lib.categories.has('upstream'), true);
});

test('loadLibrary falls back to scanning when agents/workflows registries are absent', async () => {
  const { base } = await makeSandbox();
  const fixture = await makeFixtureLibrary(base); // no agents.json/workflows.json
  const lib = await loadLibrary(fixture.root);
  assert.equal(lib.agents.size, 1);
  assert.equal(lib.agents.get('fixture-agent').source, 'agents/fixture-agent.md');
  assert.equal(lib.workflows.size, 1);
  assert.equal(lib.workflows.get('fixture-workflow').source, 'workflows/fixture-workflow.md');
});

test('splitList handles repeats, commas, and whitespace', () => {
  assert.deepEqual(splitList(['a,b', ' c ', 'd']), ['a', 'b', 'c', 'd']);
  assert.deepEqual(splitList(['', ' , ']), []);
  assert.deepEqual(splitList(undefined), []);
});

test('resolveSelection: all, categories, dedup, unknown names', async () => {
  const lib = await loadLibrary(REPO_ROOT);
  const expected = await diskCounts();
  const all = resolveSelection(lib, { skills: ['all'] });
  assert.equal(all.items.length, expected.skills);
  assert.deepEqual(all.errors, []);
  const cat = resolveSelection(lib, { categories: ['metadata'] });
  assert.equal(cat.items.length, 6);
  assert.ok(cat.items.every((i) => i.category === 'metadata'));
  const mixed = resolveSelection(lib, { skills: ['nextjs', 'nextjs'], categories: ['metadata'], agents: ['all'] });
  const names = mixed.items.map((i) => `${i.kind}:${i.name}`);
  assert.equal(new Set(names).size, names.length); // no duplicates
  assert.equal(mixed.items.filter((i) => i.kind === 'agent').length, expected.agents);
  const bad = resolveSelection(lib, { skills: ['nope'], categories: ['nope'], agents: ['nope'], workflows: ['nope'] });
  assert.equal(bad.errors.length, 4);
  assert.match(bad.errors[0], /unknown skill 'nope'/);
  assert.match(bad.errors[1], /unknown category 'nope'/);
});

test('deriveDescription folds the opening paragraph and truncates long ones', () => {
  const md = '# Title\n\nFirst line of the intro\nsecond line here.\n\n## Role\n\nMore text.\n';
  assert.equal(deriveDescription(md, 'x'), 'First line of the intro second line here.');
  const long = `# T\n\n${'word '.repeat(100)}\n`;
  const desc = deriveDescription(long, 'x');
  assert.ok(desc.length <= 245);
  assert.ok(desc.endsWith('…'));
  assert.equal(deriveDescription('# Only a title\n', 'fallback-name'), 'SkillForge fallback-name agent.');
});

test('toMarkdownAgent prepends frontmatter, escapes quotes, leaves frontmatter alone', () => {
  const md = "# Fixture\n\nDoes a thing, and it's quick.\n";
  const out = toMarkdownAgent('fixture', md);
  assert.ok(out.startsWith("---\nname: fixture\ndescription: 'Does a thing, and it''s quick.'\n---\n\n"));
  assert.ok(out.endsWith(md));
  const withFm = '---\nname: custom\ndescription: kept\n---\n\n# Body\n';
  assert.equal(toMarkdownAgent('custom', withFm), withFm);
});

test('toTomlAgent renders a Codex agent file and rejects triple quotes', () => {
  const md = '# Agent\n\nDoes things.\n\n## Role\n\nRole text.\n';
  const toml = toTomlAgent('my-agent', md);
  assert.match(toml, /^name = "my-agent"$/m);
  assert.match(toml, /^description = "Does things\."$/m);
  assert.match(toml, /^developer_instructions = """\n# Agent\n\nDoes things\./m);
  assert.ok(toml.endsWith('"""\n'));
  assert.throws(() => toTomlAgent('bad', '# T\n\nHas """ in it.\n'), /cannot be converted to Codex TOML/);
  // Backslashes are escaped so the TOML stays valid.
  const withSlash = toTomlAgent('s', '# T\n\nPath C:\\temp\\x.\n');
  assert.match(withSlash, /C:\\\\temp\\\\x/);
});

test('installedFileName follows the target format', () => {
  const agent = { kind: 'agent', name: 'a' };
  const workflow = { kind: 'workflow', name: 'w' };
  assert.equal(installedFileName(agent, TARGETS['claude-code']), 'a.md');
  assert.equal(installedFileName(agent, TARGETS.codex), 'a.toml');
  assert.equal(installedFileName(agent, TARGETS.antigravity), 'a.md');
  assert.equal(installedFileName(workflow, TARGETS.antigravity), 'w.md');
  assert.equal(installedFileName(workflow, TARGETS['claude-code']), null);
});
