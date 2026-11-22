// check-references.test.mjs — tests for the reference-integrity
// checker (Phase 9).
//
// Every test builds a small synthetic repo tree in a temp dir
// (registry + skills + agents + workflows + package.json) and runs
// runCheck against it. No test touches the real repo tree.
//
// The fixture builder takes overrides so each test changes exactly
// one thing from the clean baseline.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  extractLinksWithLines,
  findCycles,
  findJsonEntryLine,
  isSemver,
  runCheck,
} from '../scripts/check-references.mjs';

function skillEntry(name, overrides = {}) {
  return {
    name,
    description: `${name} skill`,
    path: `skills/core/${name}`,
    category: 'core',
    vendor: null,
    source_type: 'original',
    source: 'original',
    status: 'verified',
    version: '1.0.0',
    license: 'MIT',
    maintainer: 'skills-library',
    compatibility: null,
    last_verified: '2026-11-20',
    related: [],
    ...overrides,
  };
}

function agentEntry(name, overrides = {}) {
  return {
    name,
    title: name,
    description: `${name} agent`,
    path: `agents/${name}.md`,
    discover: [],
    use: [],
    references: { agents: [], workflows: [] },
    ...overrides,
  };
}

function workflowEntry(name, overrides = {}) {
  return {
    name,
    title: name,
    description: `${name} workflow`,
    path: `workflows/${name}.md`,
    skills: [],
    references: { agents: [], workflows: [] },
    ...overrides,
  };
}

// Clean baseline: two skills (alpha referenced by the agent and the
// workflow, beta related from alpha), one agent, one workflow, one
// package.json script reference to a real script file.
async function buildFixture(overrides = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-references-test-'));
  const skills = overrides.skills ?? [
    skillEntry('alpha', { related: ['beta'] }),
    skillEntry('beta'),
  ];
  const agents = overrides.agents ?? [
    agentEntry('builder', { discover: ['alpha', 'beta'], use: ['alpha'], references: { agents: [], workflows: ['build-flow'] } }),
  ];
  const workflows = overrides.workflows ?? [
    workflowEntry('build-flow', { skills: ['alpha'], references: { agents: ['builder'], workflows: [] } }),
  ];
  const skillFiles = overrides.skillFiles ?? {
    alpha: '# Alpha\n\nSee [beta](../beta/SKILL.md) and [guide](./reference/guide.md).\n',
    beta: '# Beta\n',
  };
  const extraFiles = overrides.extraFiles ?? {};
  const packageJson = overrides.packageJson ?? {
    scripts: { validate: 'node scripts/validate-skills.mjs' },
  };

  await mkdir(path.join(root, 'registry'), { recursive: true });
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  await mkdir(path.join(root, 'agents'), { recursive: true });
  await mkdir(path.join(root, 'workflows'), { recursive: true });
  await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify({ skills }, null, 2));
  await writeFile(path.join(root, 'registry', 'agents.json'), JSON.stringify({ agents }, null, 2));
  await writeFile(path.join(root, 'registry', 'workflows.json'), JSON.stringify({ workflows }, null, 2));
  await writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2));
  await writeFile(path.join(root, 'scripts', 'validate-skills.mjs'), '// stub\n');
  for (const [name, text] of Object.entries(skillFiles)) {
    const dir = path.join(root, 'skills', 'core', name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'SKILL.md'), text);
    await mkdir(path.join(dir, 'reference'), { recursive: true });
    await writeFile(path.join(dir, 'reference', 'guide.md'), '# Guide\n');
  }
  for (const a of agents) {
    await writeFile(path.join(root, 'agents', `${a.name}.md`), `# ${a.title}\n`);
  }
  for (const w of workflows) {
    await writeFile(path.join(root, 'workflows', `${w.name}.md`), `# ${w.title}\n`);
  }
  for (const [relPath, text] of Object.entries(extraFiles)) {
    const full = path.join(root, relPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, text);
  }
  return root;
}

async function run(root, opts = {}) {
  const lines = [];
  const result = await runCheck({
    root,
    log: (m) => lines.push(m),
    error: (m) => lines.push(m),
    ...opts,
  });
  return { ...result, lines };
}

async function withFixture(overrides, fn) {
  const root = await buildFixture(overrides);
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// --- Pure helpers -----------------------------------------------------------

test('isSemver accepts valid versions and rejects malformed ones', () => {
  assert.equal(isSemver('1.0.0'), true);
  assert.equal(isSemver('2.12.7'), true);
  assert.equal(isSemver('1.0.0-rc.1+build.5'), true);
  assert.equal(isSemver('1.0'), false);
  assert.equal(isSemver('v1.0.0'), false);
  assert.equal(isSemver('1.0.0.0'), false);
  assert.equal(isSemver('latest'), false);
  assert.equal(isSemver(null), false);
  assert.equal(isSemver(1), false);
});

test('extractLinksWithLines finds links with line numbers and ignores code', () => {
  const text = [
    '[real](./guide.md)',
    'See `[fake](./missing.md)` in a code span.',
    '```md',
    '[fenced](./also-missing.md)',
    '```',
    '[anchored](./guide.md#section)',
    '[external](https://example.com/page)',
  ].join('\n');
  const links = extractLinksWithLines(text);
  assert.deepEqual(links, [
    { href: './guide.md', line: 1 },
    { href: './guide.md#section', line: 6 },
    { href: 'https://example.com/page', line: 7 },
  ]);
});

test('extractLinksWithLines handles tilde fences and double-backtick spans', () => {
  const text = [
    '~~~md',
    '[tilde](./missing.md)',
    '~~~',
    'Example: `` `[inner](./missing.md)` `` is not a link.',
    '[real](./guide.md)',
  ].join('\n');
  assert.deepEqual(extractLinksWithLines(text), [{ href: './guide.md', line: 5 }]);
});

test('findCycles finds a cycle and reports it as a closed path', () => {
  const adjacency = new Map([
    ['skill:a', ['skill:b']],
    ['skill:b', ['skill:c']],
    ['skill:c', ['skill:a']],
    ['skill:d', []],
  ]);
  const cycles = findCycles(adjacency);
  assert.equal(cycles.length, 1);
  assert.deepEqual(cycles[0], ['skill:a', 'skill:b', 'skill:c', 'skill:a']);
});

test('findCycles reports no cycles for a DAG', () => {
  const adjacency = new Map([
    ['agent:x', ['skill:a', 'skill:b']],
    ['workflow:y', ['skill:a']],
    ['skill:a', []],
    ['skill:b', []],
  ]);
  assert.deepEqual(findCycles(adjacency), []);
});

test('findJsonEntryLine locates a target inside its source entry', () => {
  const text = JSON.stringify({
    agents: [
      { name: 'builder', use: ['alpha', 'missing-skill'] },
      { name: 'other', use: ['alpha'] },
    ],
  }, null, 2);
  const line = findJsonEntryLine(text, 'builder', 'missing-skill');
  assert.ok(line !== null, 'expected a line number');
  assert.match(text.split('\n')[line - 1], /missing-skill/);
  assert.equal(findJsonEntryLine(text, 'nobody', 'missing-skill'), null);
});

// --- End-to-end: clean tree --------------------------------------------------

test('clean fixture tree passes with no errors and no warnings', async () => {
  await withFixture({}, async (root) => {
    const { exitCode, errors, warnings, summary } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    assert.equal(summary.skills, 2);
    assert.equal(summary.linksChecked, 2); // alpha's two relative links
  });
});

// --- Missing references ------------------------------------------------------

test('missing reference: agent use of a nonexistent skill fails with file and fix', async () => {
  await withFixture({
    agents: [agentEntry('builder', { use: ['ghost-skill'] })],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, 'registry/agents.json');
    assert.ok(errors[0].line !== null, 'expected a line number');
    assert.match(errors[0].message, /builder.*depends on missing skill "ghost-skill"/);
    assert.match(errors[0].fix, /Fix the name/);
  });
});

test('missing reference: dangling related entry fails (optional does not mean unresolvable)', async () => {
  await withFixture({
    skills: [skillEntry('alpha', { related: ['ghost'] }), skillEntry('beta')],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /references missing skill "ghost"/);
  });
});

test('missing reference: registry path with no SKILL.md on disk fails', async () => {
  await withFixture({
    skills: [
      skillEntry('alpha', { related: ['beta'] }),
      skillEntry('beta'),
      skillEntry('removed', { path: 'skills/core/removed' }),
    ],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('references a removed file')));
  });
});

test('missing reference: missing script referenced by package.json fails', async () => {
  await withFixture({
    packageJson: { scripts: { validate: 'node scripts/does-not-exist.mjs' } },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('missing script') && e.message.includes('does-not-exist.mjs')));
    assert.ok(errors.some((e) => e.file === 'package.json'));
  });
});

// --- Cycles -------------------------------------------------------------------

test('circular dependency: declared skill dependencies forming a cycle fail', async () => {
  await withFixture({
    skills: [
      skillEntry('alpha', { related: ['beta'], dependencies: ['beta'] }),
      skillEntry('beta', { dependencies: ['alpha'] }),
    ],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('circular dependency')));
    assert.ok(errors.some((e) => e.message.includes('skill:alpha → skill:beta → skill:alpha')));
  });
});

test('optional references never create cycles: mutual related pair passes', async () => {
  await withFixture({
    skills: [
      skillEntry('alpha', { related: ['beta'] }),
      skillEntry('beta', { related: ['alpha'] }),
    ],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
  });
});

test('optional references never create cycles: mutual agent references pass', async () => {
  await withFixture({
    agents: [
      agentEntry('one', { references: { agents: ['two'], workflows: [] } }),
      agentEntry('two', { references: { agents: ['one'], workflows: [] } }),
    ],
    workflows: [workflowEntry('build-flow', { skills: ['alpha'], references: { agents: [], workflows: [] } })],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
  });
});

// --- Orphans -------------------------------------------------------------------

test('orphaned skill: SKILL.md on disk but not in the registry fails', async () => {
  await withFixture({
    extraFiles: { 'skills/core/stray/SKILL.md': '# Stray\n' },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.file === 'skills/core/stray/SKILL.md' && e.message.includes('orphaned skill')));
  });
});

test('unreferenced skill: in the registry but pointed at by nothing warns, does not fail', async () => {
  await withFixture({
    skills: [
      skillEntry('alpha', { related: [] }),
      skillEntry('beta'),
      skillEntry('lonely'),
    ],
    agents: [agentEntry('builder', { discover: ['alpha'], use: ['alpha'] })],
    workflows: [workflowEntry('build-flow', { skills: ['alpha'] })],
    skillFiles: {
      alpha: '# Alpha\n',
      beta: '# Beta\n',
      lonely: '# Lonely\n',
    },
  }, async (root) => {
    const { exitCode, errors, warnings } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /2 skill\(s\) are referenced by nothing/);
    assert.match(warnings[0].message, /beta/);
    assert.match(warnings[0].message, /lonely/);
  });
});

// --- Duplicates, self-references, versions -------------------------------------

test('duplicate identifier: two registry entries with the same skill name fail', async () => {
  await withFixture({
    skills: [skillEntry('alpha'), skillEntry('alpha', { path: 'skills/core/alpha' }), skillEntry('beta')],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('duplicate skill identifier "alpha"')));
  });
});

test('duplicate entry inside a reference list fails', async () => {
  await withFixture({
    agents: [agentEntry('builder', { use: ['alpha', 'alpha'] })],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('lists "alpha" twice in use')));
  });
});

test('self-reference: a skill related to itself fails', async () => {
  await withFixture({
    skills: [skillEntry('alpha', { related: ['alpha', 'beta'] }), skillEntry('beta')],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('references itself')));
  });
});

test('non-semver registry version fails', async () => {
  await withFixture({
    skills: [skillEntry('alpha', { version: 'latest' }), skillEntry('beta')],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.ok(errors.some((e) => e.message.includes('non-semver version')));
  });
});

test('cross-namespace name collision warns but does not fail', async () => {
  await withFixture({
    agents: [agentEntry('builder', { discover: ['alpha', 'beta'], use: ['alpha'], references: { agents: [], workflows: ['alpha'] } })],
    workflows: [workflowEntry('alpha', { skills: ['alpha'], references: { agents: ['builder'], workflows: [] } })],
  }, async (root) => {
    const { exitCode, errors, warnings } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
    assert.ok(warnings.some((w) => w.message.includes('both a skill and a workflow')));
  });
});

// --- Broken internal links ------------------------------------------------------

test('broken internal link in a SKILL.md fails with file, line, and fix', async () => {
  await withFixture({
    skillFiles: {
      alpha: '# Alpha\n\nSee [guide](./reference/guide.md).\n\nSee [gone](./reference/gone.md).\n',
      beta: '# Beta\n',
    },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, 'skills/core/alpha/SKILL.md');
    assert.equal(errors[0].line, 5);
    assert.match(errors[0].message, /broken internal link: \.\/reference\/gone\.md/);
    assert.match(errors[0].fix, /Fix the path/);
  });
});

// --- Progressive disclosure layout (Finding 1) -------------------------------

test('disclosed skill: links into and inside disclosure folders pass', async () => {
  await withFixture({
    skillFiles: {
      alpha: '# Alpha\n\nSee [the guide](./references/guide.md).\n',
      beta: '# Beta\n',
    },
    extraFiles: {
      'skills/core/alpha/references/guide.md': '# Guide\n\nSee [deep](./deep.md) and [the helper](../scripts/run.mjs).\n',
      'skills/core/alpha/references/deep.md': '# Deep\n',
      'skills/core/alpha/scripts/run.mjs': '// helper\n',
    },
  }, async (root) => {
    const { exitCode, errors, summary } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
    // SKILL.md -> guide (1) + guide -> deep (1) + guide -> script (1).
    assert.equal(summary.linksChecked, 3);
  });
});

test('broken internal link inside a disclosure file fails with file and line', async () => {
  await withFixture({
    skillFiles: {
      alpha: '# Alpha\n\nSee [the guide](./references/guide.md).\n',
      beta: '# Beta\n',
    },
    extraFiles: {
      'skills/core/alpha/references/guide.md': '# Guide\n\nSee [gone](./gone.md).\n',
    },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, 'skills/core/alpha/references/guide.md');
    assert.equal(errors[0].line, 3);
    assert.match(errors[0].message, /broken internal link: \.\/gone\.md/);
  });
});

test('dangling pointer from SKILL.md into references/ fails', async () => {
  await withFixture({
    skillFiles: {
      alpha: '# Alpha\n\nSee [the guide](./references/missing.md).\n',
      beta: '# Beta\n',
    },
    extraFiles: {
      'skills/core/alpha/references/guide.md': '# Guide\n',
    },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, 'skills/core/alpha/SKILL.md');
    assert.match(errors[0].message, /broken internal link: \.\/references\/missing\.md/);
  });
});

test('upstream disclosure files are exempt from the internal-link check', async () => {
  await withFixture({
    skills: [
      skillEntry('alpha', { related: ['beta'] }),
      skillEntry('beta'),
      skillEntry('upstream-one', {
        path: 'skills/upstream/vendor/upstream-one',
        source_type: 'upstream',
        vendor: 'vendor',
      }),
    ],
    extraFiles: {
      'skills/upstream/vendor/upstream-one/SKILL.md': '# Upstream\n',
      'skills/upstream/vendor/upstream-one/references/guide.md': '# Guide\n\n[outside](./gone.md)\n',
    },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
  });
});

test('link-shaped text in code is not a broken link', async () => {
  await withFixture({
    skillFiles: {
      alpha: '# Alpha\n\nExample: `[x](./missing.md)` in prose.\n\n```md\n[code](./also-missing.md)\n```\n',
      beta: '# Beta\n',
    },
  }, async (root) => {
    const { exitCode, errors, summary } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
    assert.equal(summary.linksChecked, 0);
  });
});

// --- Optional references must NOT fail -------------------------------------------

test('optional references may be absent: empty related/discover/references pass', async () => {
  await withFixture({
    skills: [skillEntry('alpha', { related: [] }), skillEntry('beta', { related: [] })],
    agents: [agentEntry('builder', { discover: [], use: ['alpha'], references: { agents: [], workflows: [] } })],
    workflows: [workflowEntry('build-flow', { skills: ['alpha'], references: { agents: [], workflows: [] } })],
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
  });
});

test('upstream skills are exempt from the internal-link check', async () => {
  await withFixture({
    skills: [
      skillEntry('alpha', { related: ['beta'] }),
      skillEntry('beta'),
      skillEntry('upstream-one', {
        path: 'skills/upstream/vendor/upstream-one',
        source_type: 'upstream',
        vendor: 'vendor',
      }),
    ],
    extraFiles: {
      'skills/upstream/vendor/upstream-one/SKILL.md': '# Upstream\n\n[outside](../../tools/not-imported.md)\n',
    },
  }, async (root) => {
    const { exitCode, errors } = await run(root);
    assert.equal(exitCode, 0);
    assert.deepEqual(errors, []);
  });
});

// --- JSON output ------------------------------------------------------------------

test('--json output carries the same errors in machine-readable form', async () => {
  await withFixture({
    agents: [agentEntry('builder', { use: ['ghost-skill'] })],
  }, async (root) => {
    const { exitCode, lines } = await run(root, { json: true });
    assert.equal(exitCode, 1);
    const parsed = JSON.parse(lines.join('\n'));
    assert.equal(parsed.summary.errors, 1);
    assert.match(parsed.errors[0].message, /ghost-skill/);
  });
});
