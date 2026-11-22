// skill-history.test.mjs — git-history reconstruction, classification,
// formatting-only detection, rename following, version derivation.
//
// Git-dependent tests build synthetic repos in temp dirs with known
// commits (fixed author/date, so the history is deterministic). Pure
// function tests (classification, version derivation, log parsing)
// run without git. If git is unavailable the git tests skip.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyChange,
  deriveVersion,
  getAllSkillHistory,
  getSkillHistory,
  isFormattingOnlyFileSet,
  isUpstreamSkill,
  parseMessagesLog,
  parseNameStatusLog,
  parseNumstatLog,
  skillDirOf,
} from '../scripts/skill-history.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'scripts', 'skill-history.mjs');

let GIT_AVAILABLE = true;
try {
  execFileSync('git', ['--version'], { stdio: 'ignore' });
} catch {
  GIT_AVAILABLE = false;
}

// ---------------------------------------------------------------------------
// Synthetic repo helpers
// ---------------------------------------------------------------------------

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test Author',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_CONFIG_NOSYSTEM: '1',
};

function git(cwd, args, env = {}) {
  return execFileSync('git', args, { cwd, env: { ...GIT_ENV, ...env }, encoding: 'utf8' });
}

async function makeRepo() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-history-test-'));
  git(dir, ['init', '-b', 'main', '-q']);
  git(dir, ['config', 'user.name', 'Test Author']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'core.autocrlf', 'false']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  return dir;
}

function commitAll(dir, message, date) {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', message], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
}

async function writeSkill(dir, skillPath, body) {
  const full = path.join(dir, skillPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body, 'utf8');
}

const SKILL_V1 = [
  '---',
  'name: widget',
  'description: A test skill about widgets.',
  '---',
  '',
  '# Widget',
  '',
  '## Purpose',
  '',
  'Widgets do widget things.',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// Pure helpers: no git needed
// ---------------------------------------------------------------------------

test('skillDirOf maps files to skill directories', () => {
  assert.equal(skillDirOf('skills/frontend/accessibility/SKILL.md'), 'skills/frontend/accessibility');
  assert.equal(skillDirOf('skills/frontend/accessibility/references/x.md'), 'skills/frontend/accessibility');
  assert.equal(skillDirOf('skills/upstream/vercel/web-design-guidelines/SKILL.md'), 'skills/upstream/vercel/web-design-guidelines');
  assert.equal(skillDirOf('skills/upstream/vercel/ATTRIBUTION.md'), null);
  assert.equal(skillDirOf('skills/README.md'), null);
  assert.equal(skillDirOf('registry/skills.json'), null);
});

test('isUpstreamSkill detects upstream paths', () => {
  assert.equal(isUpstreamSkill('skills/upstream/vercel/web-design-guidelines'), true);
  assert.equal(isUpstreamSkill('skills/frontend/accessibility'), false);
});

test('isFormattingOnlyFileSet requires every file whitespace-only', () => {
  const ws = { path: 'a', added: 3, deleted: 3, wAdded: 0, wDeleted: 0, binary: false };
  const content = { path: 'b', added: 1, deleted: 0, wAdded: 1, wDeleted: 0, binary: false };
  const binary = { path: 'c', added: null, deleted: null, wAdded: null, wDeleted: null, binary: true };
  assert.equal(isFormattingOnlyFileSet([ws]), true);
  assert.equal(isFormattingOnlyFileSet([ws, ws]), true);
  assert.equal(isFormattingOnlyFileSet([ws, content]), false);
  assert.equal(isFormattingOnlyFileSet([binary]), false);
  assert.equal(isFormattingOnlyFileSet([]), false);
});

test('classifyChange: local content change', () => {
  const r = classifyChange({
    subject: 'Improve widget examples',
    files: [{ path: 'skills/frontend/widget/SKILL.md', status: 'M' }],
    skillPath: 'skills/frontend/widget',
  });
  assert.deepEqual(r.classes, ['content']);
  assert.equal(r.meaningful, true);
});

test('classifyChange: upstream re-import', () => {
  const r = classifyChange({
    subject: 'Re-import web-design-guidelines from upstream',
    files: [{ path: 'skills/upstream/vercel/web-design-guidelines/SKILL.md', status: 'M' }],
    skillPath: 'skills/upstream/vercel/web-design-guidelines',
  });
  assert.ok(r.classes.includes('upstream-reimport'));
  // 'content' is the fallback only: a re-import already has a
  // more specific class, so it is not also 'content'.
  assert.ok(!r.classes.includes('content'));
});

test('classifyChange: first add of an upstream skill is a re-import', () => {
  const r = classifyChange({
    subject: 'Add upstream skill',
    files: [{ path: 'skills/upstream/vercel/web-design-guidelines/SKILL.md', status: 'A' }],
    skillPath: 'skills/upstream/vercel/web-design-guidelines',
  });
  assert.ok(r.classes.includes('added'));
  assert.ok(r.classes.includes('upstream-reimport'));
});

test('classifyChange: breaking change from body footer', () => {
  const r = classifyChange({
    subject: 'Change widget output format',
    body: 'Change widget output format\n\nBREAKING CHANGE: output is now JSON, not YAML.',
    files: [{ path: 'skills/frontend/widget/SKILL.md', status: 'M' }],
    skillPath: 'skills/frontend/widget',
  });
  assert.ok(r.classes.includes('breaking'));
  // A breaking change already has a specific class; 'content' is
  // the fallback only.
  assert.deepEqual(r.classes, ['breaking']);
});

test('classifyChange: rename is breaking', () => {
  const r = classifyChange({
    subject: 'Rename widget skill to gadget',
    files: [{ path: 'skills/frontend/gadget/SKILL.md', status: 'R100', oldPath: 'skills/frontend/widget/SKILL.md' }],
    skillPath: 'skills/frontend/gadget',
  });
  assert.ok(r.classes.includes('renamed'));
  assert.ok(r.classes.includes('breaking'));
});

test('classifyChange: rename supersedes add (dir pass sees an add)', () => {
  // The directory pass (no --follow) reports a rename as a plain
  // add, because the old path is outside its pathspec. When the
  // passes merge, the rename classification must win.
  const r = classifyChange({
    subject: 'Rename widget skill to gadget',
    files: [
      // Order matters for this test: the plain-add entry first, so
      // the 'added' class is set before the rename rule clears it.
      { path: 'skills/frontend/gadget/SKILL.md', status: 'A' },
      { path: 'skills/frontend/gadget/SKILL.md', status: 'R100', oldPath: 'skills/frontend/widget/SKILL.md' },
    ],
    skillPath: 'skills/frontend/gadget',
  });
  assert.ok(r.classes.includes('renamed'));
  assert.ok(!r.classes.includes('added'));
});

test('classifyChange: Revert/Reapply messages get the revert class', () => {
  const r = classifyChange({
    subject: 'Revert "Merge pull request #1 from x/branch"',
    files: [{ path: 'skills/frontend/widget/SKILL.md', status: 'M' }],
    skillPath: 'skills/frontend/widget',
  });
  assert.ok(r.classes.includes('revert'));
  assert.ok(r.classes.includes('content'));
});

test('classifyChange: security + fix + compatibility wording', () => {
  const r = classifyChange({
    subject: 'Fix security issue in Windows installer path handling',
    files: [{ path: 'skills/frontend/widget/SKILL.md', status: 'M' }],
    skillPath: 'skills/frontend/widget',
  });
  assert.ok(r.classes.includes('security'));
  assert.ok(r.classes.includes('fix'));
  assert.ok(r.classes.includes('compatibility'));
});

test('classifyChange: formatting-only is never meaningful', () => {
  const r = classifyChange({
    subject: 'Reformat widget skill',
    files: [{ path: 'skills/frontend/widget/SKILL.md', status: 'M' }],
    skillPath: 'skills/frontend/widget',
    formattingOnly: true,
  });
  assert.deepEqual(r.classes, ['formatting-only']);
  assert.equal(r.meaningful, false);
});

test('deriveVersion: add, content, fix, breaking, formatting', () => {
  const entries = [
    { classes: ['added'], meaningful: true },
    { classes: ['content'], meaningful: true },
    { classes: ['fix'], meaningful: true },
    { classes: ['formatting-only'], meaningful: false },
    { classes: ['content', 'breaking'], meaningful: true },
    { classes: ['fix'], meaningful: true },
  ];
  // 1.0.0 -> 1.1.0 -> 1.1.1 -> (no bump) -> 2.0.0 -> 2.0.1
  assert.equal(deriveVersion(entries), '2.0.1');
});

test('deriveVersion: no entries is null; truncated history starts at 1.0.0', () => {
  assert.equal(deriveVersion([]), null);
  assert.equal(deriveVersion([{ classes: ['content'], meaningful: true }]), '1.0.0');
});

test('deriveVersion: fix+content bumps minor, not patch', () => {
  const entries = [
    { classes: ['added'], meaningful: true },
    { classes: ['fix', 'content'], meaningful: true },
  ];
  assert.equal(deriveVersion(entries), '1.1.0');
});

test('deriveVersion: re-add after removal bumps minor, does not reset', () => {
  // The Nov 2026 revert/re-apply pair removed and re-added skills;
  // the re-add must not erase the version earned before the removal.
  const entries = [
    { classes: ['added'], meaningful: true },
    { classes: ['content'], meaningful: true },
    { classes: ['removed'], meaningful: true },
    { classes: ['added'], meaningful: true },
  ];
  assert.equal(deriveVersion(entries), '1.2.0');
});

test('parseNameStatusLog parses commits, renames, and statuses', () => {
  const text = [
    '__SFH__abc123\x00Alice\x002026-11-20T10:00:00+00:00\x00First commit',
    '',
    'A\tskills/frontend/widget/SKILL.md',
    '__SFH__def456\x00Bob\x002026-11-21T10:00:00+00:00\x00Rename widget',
    '',
    'R100\tskills/frontend/widget/SKILL.md\tskills/frontend/gadget/SKILL.md',
    'M\tskills/frontend/other/SKILL.md',
    '',
  ].join('\n');
  const commits = parseNameStatusLog(text);
  assert.equal(commits.size, 2);
  assert.equal(commits.get('abc123').author, 'Alice');
  assert.equal(commits.get('abc123').files[0].status, 'A');
  const renamed = commits.get('def456').files[0];
  assert.equal(renamed.status, 'R100');
  assert.equal(renamed.oldPath, 'skills/frontend/widget/SKILL.md');
  assert.equal(renamed.path, 'skills/frontend/gadget/SKILL.md');
});

test('parseNumstatLog parses counts and binary files', () => {
  const text = [
    '__SFH__abc123',
    '',
    '10\t2\tskills/frontend/widget/SKILL.md',
    '-\t-\tskills/upstream/x/asset.zip',
    '__SFH__def456',
    '',
    '0\t5\tskills/frontend/widget/SKILL.md',
    '',
  ].join('\n');
  const out = parseNumstatLog(text);
  assert.deepEqual(out.get('abc123').get('skills/frontend/widget/SKILL.md'), { added: 10, deleted: 2, binary: false });
  assert.deepEqual(out.get('abc123').get('skills/upstream/x/asset.zip'), { added: null, deleted: null, binary: true });
  assert.equal(out.get('def456').get('skills/frontend/widget/SKILL.md').deleted, 5);
});

test('parseMessagesLog splits on record separator', () => {
  const text = `abc123\x00Subject one\n\nBody line.\x1edef456\x00Subject two\x1e`;
  const out = parseMessagesLog(text);
  assert.equal(out.get('abc123'), 'Subject one\n\nBody line.');
  assert.equal(out.get('def456'), 'Subject two');
});

// ---------------------------------------------------------------------------
// Git-dependent tests: synthetic repos
// ---------------------------------------------------------------------------

test('history reconstruction: add + two modifications, newest first', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const skill = { name: 'widget', path: 'skills/frontend/widget', sourceType: 'original', vendor: null };
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget skill', '2026-11-20T10:00:00+00:00');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1 + '\nMore content.\n');
  commitAll(dir, 'Expand widget examples', '2026-11-21T10:00:00+00:00');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1 + '\nMore content.\nEven more.\n');
  commitAll(dir, 'Fix widget typo', '2026-11-22T10:00:00+00:00');

  const record = getSkillHistory(dir, skill);
  assert.equal(record.totalChanges, 3);
  assert.equal(record.meaningfulChanges, 3);
  assert.equal(record.derivedVersion, '1.1.1');
  assert.equal(record.firstSeen, '2026-11-20');
  assert.equal(record.lastChange, '2026-11-22');
  assert.equal(record.entries[0].subject, 'Fix widget typo');
  assert.ok(record.entries[0].classes.includes('fix'));
  assert.equal(record.entries[2].subject, 'Add widget skill');
  assert.ok(record.entries[2].classes.includes('added'));
  assert.equal(record.entries[2].author, 'Test Author');
  assert.ok(record.entries[0].added >= 1);
});

test('upstream-vs-local classification in a real repo', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const upstream = { name: 'web-design-guidelines', path: 'skills/upstream/vercel/web-design-guidelines', sourceType: 'upstream', vendor: 'vercel' };
  const local = { name: 'widget', path: 'skills/frontend/widget', sourceType: 'original', vendor: null };
  await writeSkill(dir, 'skills/upstream/vercel/web-design-guidelines/SKILL.md', SKILL_V1);
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Import web-design-guidelines from upstream; add widget skill', '2026-11-20T10:00:00+00:00');

  const up = getSkillHistory(dir, upstream);
  assert.ok(up.entries[0].classes.includes('upstream-reimport'));
  assert.ok(up.entries[0].classes.includes('added'));
  const loc = getSkillHistory(dir, local);
  assert.ok(!loc.entries[0].classes.includes('upstream-reimport'));
  assert.ok(loc.entries[0].classes.includes('added'));
});

test('breaking-change detection bumps major version', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const skill = { name: 'widget', path: 'skills/frontend/widget', sourceType: 'original', vendor: null };
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget skill', '2026-11-20T10:00:00+00:00');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1 + '\nChange.\n');
  commitAll(dir, 'Change widget output\n\nBREAKING CHANGE: output is now JSON.', '2026-11-21T10:00:00+00:00');

  const record = getSkillHistory(dir, skill);
  assert.ok(record.entries[0].classes.includes('breaking'));
  assert.equal(record.derivedVersion, '2.0.0');
});

test('formatting-only change is recorded but not a version change', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const skill = { name: 'widget', path: 'skills/frontend/widget', sourceType: 'original', vendor: null };
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget skill', '2026-11-20T10:00:00+00:00');
  // Whitespace-only: reindent every line with two extra spaces and
  // add trailing spaces — no word changes.
  const reformatted = SKILL_V1.split('\n').map((l) => (l ? `  ${l}  ` : l)).join('\n');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', reformatted);
  commitAll(dir, 'Reformat widget skill', '2026-11-21T10:00:00+00:00');

  const record = getSkillHistory(dir, skill);
  assert.equal(record.totalChanges, 2);
  assert.equal(record.meaningfulChanges, 1);
  assert.equal(record.formattingOnlyChanges, 1);
  assert.equal(record.entries[0].formattingOnly, true);
  assert.equal(record.entries[0].meaningful, false);
  assert.deepEqual(record.entries[0].classes, ['formatting-only']);
  assert.equal(record.derivedVersion, '1.0.0');
  assert.equal(record.lastMeaningfulChange, '2026-11-20');
});

test('line-ending-only change is formatting-only', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const skill = { name: 'widget', path: 'skills/frontend/widget', sourceType: 'original', vendor: null };
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget skill', '2026-11-20T10:00:00+00:00');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1.replaceAll('\n', '\r\n'));
  commitAll(dir, 'Convert widget skill to CRLF', '2026-11-21T10:00:00+00:00');

  const record = getSkillHistory(dir, skill);
  assert.equal(record.totalChanges, 2);
  assert.equal(record.entries[0].formattingOnly, true);
  assert.equal(record.derivedVersion, '1.0.0');
});

test('skill with no history: zero entries, null version', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const skill = { name: 'widget', path: 'skills/frontend/widget', sourceType: 'original', vendor: null };
  // An unrelated commit exists, but nothing touches the skill — and
  // the skill file itself is uncommitted (never in git log).
  await writeFile(path.join(dir, 'README.md'), '# repo\n', 'utf8');
  commitAll(dir, 'Initial commit', '2026-11-20T10:00:00+00:00');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);

  const record = getSkillHistory(dir, skill);
  assert.equal(record.totalChanges, 0);
  assert.equal(record.meaningfulChanges, 0);
  assert.equal(record.derivedVersion, null);
  assert.equal(record.firstSeen, null);
  assert.deepEqual(record.entries, []);
});

test('renamed skill: history follows the rename', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const skill = { name: 'gadget', path: 'skills/frontend/gadget', sourceType: 'original', vendor: null };
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget skill', '2026-11-20T10:00:00+00:00');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1 + '\nMore.\n');
  commitAll(dir, 'Expand widget skill', '2026-11-21T10:00:00+00:00');
  git(dir, ['mv', 'skills/frontend/widget', 'skills/frontend/gadget']);
  commitAll(dir, 'Rename widget skill to gadget', '2026-11-22T10:00:00+00:00');

  const record = getSkillHistory(dir, skill);
  assert.equal(record.totalChanges, 3);
  assert.equal(record.entries[0].subject, 'Rename widget skill to gadget');
  assert.ok(record.entries[0].classes.includes('renamed'));
  assert.ok(record.entries[0].classes.includes('breaking'));
  // Pre-rename history followed the file.
  assert.equal(record.entries[2].subject, 'Add widget skill');
  assert.ok(record.entries[2].classes.includes('added'));
  assert.equal(record.firstSeen, '2026-11-20');
  // Rename is breaking: 1.0.0 -> 1.1.0 -> 2.0.0.
  assert.equal(record.derivedVersion, '2.0.0');
});

test('bulk --all mode partitions one commit per skill', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  const registry = [
    { name: 'widget', path: 'skills/frontend/widget', source_type: 'original', vendor: null },
    { name: 'gadget', path: 'skills/frontend/gadget', source_type: 'original', vendor: null },
  ];
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  await writeSkill(dir, 'skills/frontend/gadget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget and gadget skills', '2026-11-20T10:00:00+00:00');
  // One commit: reformat widget (whitespace-only) AND add real
  // content to gadget. Per-skill formatting detection must differ.
  const reformatted = SKILL_V1.split('\n').map((l) => (l ? `  ${l}  ` : l)).join('\n');
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', reformatted);
  await writeSkill(dir, 'skills/frontend/gadget/SKILL.md', SKILL_V1 + '\nReal new content.\n');
  commitAll(dir, 'Reformat widget; expand gadget', '2026-11-21T10:00:00+00:00');

  const { skills, unattributed } = getAllSkillHistory(dir, registry);
  const widget = skills.find((s) => s.name === 'widget');
  const gadget = skills.find((s) => s.name === 'gadget');
  assert.equal(widget.totalChanges, 2);
  assert.equal(widget.entries[0].formattingOnly, true);
  assert.equal(widget.derivedVersion, '1.0.0');
  assert.equal(gadget.totalChanges, 2);
  assert.equal(gadget.entries[0].formattingOnly, false);
  assert.equal(gadget.derivedVersion, '1.1.0');
  assert.equal(unattributed.commits, 0);
});

test('CLI: --json output for one skill against a synthetic repo', { skip: !GIT_AVAILABLE }, async (t) => {
  const dir = await makeRepo();
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeSkill(dir, 'skills/frontend/widget/SKILL.md', SKILL_V1);
  commitAll(dir, 'Add widget skill', '2026-11-20T10:00:00+00:00');
  await mkdir(path.join(dir, 'registry'), { recursive: true });
  await writeFile(path.join(dir, 'registry', 'skills.json'), JSON.stringify({
    skills: [{ name: 'widget', path: 'skills/frontend/widget', source_type: 'original', vendor: null }],
  }), 'utf8');

  const out = execFileSync(process.execPath, [SCRIPT, 'widget', '--json', '--repo', dir], { encoding: 'utf8' });
  const result = JSON.parse(out);
  assert.equal(result.mode, 'single');
  assert.equal(result.skills[0].name, 'widget');
  assert.equal(result.skills[0].totalChanges, 1);
  assert.equal(result.skills[0].derivedVersion, '1.0.0');

  // Unknown skill exits 2.
  assert.throws(
    () => execFileSync(process.execPath, [SCRIPT, 'no-such-skill', '--repo', dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    (e) => e.status === 2,
  );
});
