// docs-consistency.test.mjs — regression tests that catch
// documentation drift: the canonical status file must agree with
// the registry and package.json, and canonical current-state docs
// must not present stale feature-branch references as current
// state. Historical reports are exempt — they preserve the branch
// name as history — but each of the four reconciled audit reports
// must carry the dated canonical-main addendum.
//
// This complements scripts/check-status.mjs (the CI drift guard,
// which re-derives counts and checks README/ARCHITECTURE/CHANGELOG
// needles). These tests cover what check-status does not: version
// agreement with package.json, stale-branch references in
// canonical docs, the addendum presence, the real-model-eval
// honesty guard (a claimed run must have a real run id and
// archive on disk — Day 1 ran 2026-11-22), and the Finding 4
// guard (no new hardcoded "as of YYYY-MM-DD" version-fact dates
// in living docs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STALE_BRANCH = 'feat/skillforge-production-upgrade';
const ADDENDUM_HEADING = 'Addendum — canonical main reconciliation (2026-11-22)';
const MERGE_COMMIT_SHORT = '7b4f6eb';
const MAIN_HEAD_SHORT = 'b86b469';

const RECONCILED_REPORTS = [
  'ai/audits/RELEASE-ACCEPTANCE.md',
  'ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md',
  'ai/audits/REAL-MODEL-EVALUATION.md',
  'ai/audits/CI-VALIDATION-REPORT.md',
];

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
}

async function readText(rel) {
  return readFile(path.join(ROOT, rel), 'utf8');
}

async function listFiles(relDir, ext) {
  const entries = await readdir(path.join(ROOT, relDir), { recursive: true });
  return entries.filter((e) => e.endsWith(ext)).map((e) => path.join(relDir, e));
}

test('PROJECT-STATUS.json parses and its version matches package.json', async () => {
  const status = await readJson('ai/PROJECT-STATUS.json');
  const pkg = await readJson('package.json');
  assert.equal(typeof status.version, 'string');
  assert.equal(status.version, pkg.version, `PROJECT-STATUS.json version ${status.version} != package.json version ${pkg.version}`);
});

test('PROJECT-STATUS.json skill/agent/workflow/category counts match the registries', async () => {
  const status = await readJson('ai/PROJECT-STATUS.json');
  const skills = await readJson('registry/skills.json');
  const categories = await readJson('registry/categories.json');
  const agents = await readJson('registry/agents.json');
  const workflows = await readJson('registry/workflows.json');
  const list = skills.skills;
  assert.equal(status.skills.total, list.length);
  assert.equal(status.skills.original, list.filter((s) => s.source_type !== 'upstream').length);
  assert.equal(status.skills.upstream, list.filter((s) => s.source_type === 'upstream').length);
  assert.equal(status.skills.categories, (categories.categories || categories).length);
  assert.equal(status.agents, (agents.agents || agents).length);
  assert.equal(status.workflows, (workflows.workflows || workflows).length);
});

test('PROJECT-STATUS.json verification split matches sources/verification-status.json', async () => {
  const status = await readJson('ai/PROJECT-STATUS.json');
  const vs = await readJson('sources/verification-status.json');
  const split = { verified: 0, 'verified-with-limitations': 0, 'needs-correction': 0, unverified: 0 };
  for (const entry of Object.values(vs.statuses)) {
    if (entry.status in split) split[entry.status]++;
  }
  assert.equal(status.skills.verification.verified, split.verified);
  assert.equal(status.skills.verification.verifiedWithLimitations, split['verified-with-limitations']);
  assert.equal(status.skills.verification.needsCorrection, split['needs-correction']);
  assert.equal(status.skills.verification.unverified, split.unverified);
});

test('canonical current-state docs contain no stale feature-branch references', async () => {
  // These files describe the CURRENT state; the upgrade branch is
  // merged and deleted, so any mention of it here is drift.
  // Historical reports under ai/ (phase notes, stage reports) are
  // exempt — they preserve the branch name as history.
  const canonicalDocs = ['README.md', 'CHANGELOG.md', 'docs/ARCHITECTURE.md', 'ai/PROJECT-STATUS.json'];
  for (const rel of canonicalDocs) {
    const text = await readText(rel);
    assert.ok(!text.includes(STALE_BRANCH), `${rel} still references the merged-and-deleted branch ${STALE_BRANCH} as current state`);
  }
});

test('PROJECT-STATUS.md: the canonical section has no stale branch references (the historical log may)', async () => {
  const text = await readText('ai/PROJECT-STATUS.md');
  const marker = '## Historical mission log';
  const idx = text.indexOf(marker);
  assert.ok(idx > 0, `ai/PROJECT-STATUS.md must mark its historical log with a '${marker}' heading`);
  const canonical = text.slice(0, idx);
  const historical = text.slice(idx);
  assert.ok(!canonical.includes(STALE_BRANCH), 'ai/PROJECT-STATUS.md canonical section references the merged-and-deleted branch as current state');
  assert.ok(historical.includes(STALE_BRANCH), 'ai/PROJECT-STATUS.md historical log should preserve the branch name as history');
});

test('each reconciled audit report carries the canonical-main addendum with the merge commit and main HEAD', async () => {
  for (const rel of RECONCILED_REPORTS) {
    const text = await readText(rel);
    assert.ok(text.includes(ADDENDUM_HEADING), `${rel} is missing the '${ADDENDUM_HEADING}' section`);
    const addendum = text.slice(text.indexOf(ADDENDUM_HEADING));
    assert.ok(addendum.includes(MERGE_COMMIT_SHORT), `${rel} addendum does not record the PR #5 merge commit ${MERGE_COMMIT_SHORT}`);
    assert.ok(addendum.includes(MAIN_HEAD_SHORT), `${rel} addendum does not record the current main HEAD ${MAIN_HEAD_SHORT}`);
  }
});

test('PROJECT-STATUS.json records the real-model evaluation run honestly (run id + archive must exist)', async () => {
  const status = await readJson('ai/PROJECT-STATUS.json');
  assert.ok(status.evidence, 'PROJECT-STATUS.json must have an evidence section');
  const rme = status.evidence.realModelEval;
  assert.ok(rme, 'PROJECT-STATUS.json evidence must record the real-model evaluation state');
  // Day 1 ran 2026-11-22 (4/19, gemini-3.5-flash). The honesty guard
  // now works the other way: a claimed run must have a real artifact.
  // hasRun must be true, and the run id + archive it names must
  // resolve to a real file whose own run id and model agree.
  assert.equal(rme.hasRun, true, 'a real-model evaluation has run (Day 1, 2026-11-22); hasRun must be true');
  assert.equal(rme.model, 'gemini-3.5-flash', 'the recorded model must be the model that ran');
  assert.match(rme.runId, /^real-model-gemini-3\.5-flash-\d{8}-\d{6}$/, 'runId must be a real run id for the model that ran');
  assert.ok(typeof rme.archive === 'string' && rme.archive.length > 0, 'the status must name the run archive file');
  const archive = await readJson(rme.archive);
  assert.equal(archive.runId, rme.runId, 'the archive run id must match the status run id');
  assert.equal(archive.model.requested, 'gemini-3.5-flash', 'the archive must record the model that ran');
  assert.equal(archive.model.served, 'gemini-3.5-flash', 'the archive must record the model that served');
  // The archive's git commit is the code that ran: it must be a real
  // commit on main's history (skipped on shallow CI checkouts).
  const commit = archive.environment.gitCommit;
  assert.match(commit, /^[0-9a-f]{40}$/, 'the archive must record the full git commit that ran');
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
  } catch (e) {
    if (e && e.status === 1) assert.fail(`archive git commit ${commit} is not an ancestor of HEAD`);
    if (e && typeof e.status === 'number' && e.status !== 0 && e.status !== 128) throw e;
  }
});

test('PROJECT-STATUS.json canonical section names main and its verified HEAD', async () => {
  const status = await readJson('ai/PROJECT-STATUS.json');
  assert.ok(status.canonical, 'PROJECT-STATUS.json must have a canonical section');
  assert.equal(status.canonical.branch, 'main');
  // canonical.head is a "last verified at" pointer: it moves forward
  // when the battery re-runs at a newer commit, so it must NOT be a
  // hardcoded hash (the old assertion pinned b86b469 and broke on
  // the first main advance after the hardening merge). What is
  // asserted instead: it is a well-formed commit hash, its short
  // form agrees, and — where the commit resolves locally — it is
  // an ancestor of HEAD, i.e. a real commit on main's history.
  // The ancestry check is skipped when git cannot resolve the
  // commit (shallow CI checkouts carry only the tip commit).
  const head = status.canonical.head;
  assert.match(head, /^[0-9a-f]{40}$/, 'canonical.head must be a full commit hash');
  assert.equal(status.canonical.headShort, head.slice(0, 7), 'headShort must match head');
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', head, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
  } catch (e) {
    // Exit 128 = unknown revision (shallow checkout): skip.
    // Exit 1 = not an ancestor: fail — the pointer is wrong.
    // Spawn failure (no git): skip.
    if (e && e.status === 1) assert.fail(`canonical.head ${head} is not an ancestor of HEAD`);
    if (e && typeof e.status === 'number' && e.status !== 0 && e.status !== 128) throw e;
  }
  // The merge commit is history (PR #5, 2026-11-21): immutable.
  assert.equal(status.canonical.mergeCommit, '7b4f6eb7c109867cf9026ff835c9301e6fb3f71d');
  assert.equal(status.branch, 'main');
});

test('living docs carry no hardcoded "as of YYYY-MM-DD" version-fact dates (Finding 4)', async () => {
  // The "as of <date>" pattern pins a version fact to a date in
  // prose; dates belong in frontmatter last_verified, the
  // registry, or PROJECT-STATUS.json. 116 such occurrences were
  // measured 2026-11-21 (97 files); the non-skill ones in living
  // docs were 0, and this test keeps it that way.
  //
  // Scanned: docs/**/*.md, README.md, scripts/**/*.mjs, and the
  // ai/PROJECT-STATUS.md canonical section only (before the
  // historical-log marker). Explicitly NOT scanned (frozen
  // historical records, intentionally kept): ai/audits/*,
  // ai/phase*/, ai/remediation/, sources/research-log.md,
  // CHANGELOG.md (release history). Skill bodies are another
  // worker's scope and are not scanned here.
  const pattern = /as of \d{4}-\d{2}-\d{2}/;
  const offenders = [];
  const files = [
    'README.md',
    ...(await listFiles('docs', '.md')),
    ...(await listFiles('scripts', '.mjs')),
  ];
  for (const rel of files) {
    if (pattern.test(await readText(rel))) offenders.push(rel);
  }
  const statusMd = await readText('ai/PROJECT-STATUS.md');
  const marker = '## Historical mission log';
  const canonical = statusMd.slice(0, statusMd.indexOf(marker));
  if (pattern.test(canonical)) offenders.push('ai/PROJECT-STATUS.md (canonical section)');
  assert.deepEqual(
    offenders,
    [],
    `hardcoded "as of YYYY-MM-DD" version-fact date(s) in living docs — move the date to last_verified / the registry / PROJECT-STATUS.json: ${offenders.join(', ')}`,
  );
});
