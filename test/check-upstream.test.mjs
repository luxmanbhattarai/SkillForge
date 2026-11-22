// check-upstream.test.mjs — tests for upstream change detection
// (Phase 15): new commits, import-affecting changes, deleted and
// renamed files, security-sensitive flags, JSON output, and
// duplicate-notification prevention.
//
// All GitHub API responses are stubbed: no network, no rate limit.
// Fixture strings that must trip a security rule at runtime are
// built from parts (e.g. 'sk-' + 'abc…') so the repository's own
// security scanner — which scans this file — does not flag the
// literal fixture text. The scanner itself uses the same technique
// for its ignore marker (see scripts/security-scan.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parsePins, analyzeChanges, checkVendor, runCheck,
  affectedSkillsForPath, scanFileForSecurity,
  loadNotificationState, notificationStatus,
} from '../scripts/check-upstream.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const PIN = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);

const PINS_TEXT = [
  '### Demo — 2 skills (MIT)',
  'Source: https://github.com/someone/demo ·',
  `Commit \`${PIN}\` · Imported 2026-11-20`,
  '',
  '`alpha-skill`, `beta-skill`',
  '',
  'Unimported siblings (deliberate, not imported):',
  '`gamma-skill` → original `gamma`;',
  '',
].join('\n');

// A compare payload: 2 new commits, 4 changed files. One file is
// inside an imported skill, one is unrelated, one is deleted, one
// is renamed.
function comparePayload(overrides = {}) {
  return {
    status: 'ahead',
    ahead_by: 2,
    behind_by: 0,
    total_commits: 2,
    commits: [
      {
        sha: 'c1'.padEnd(40, '0'),
        commit: { message: 'Improve alpha-skill docs\n\nLonger body.', committer: { date: '2026-11-21T10:00:00Z' }, author: { name: 'Ada' } },
      },
      {
        sha: 'c2'.padEnd(40, '0'),
        commit: { message: 'Remove legacy helper', committer: { date: '2026-11-21T11:00:00Z' }, author: { name: 'Bo' } },
      },
    ],
    files: [
      { filename: 'skills/alpha-skill/SKILL.md', status: 'modified', additions: 10, deletions: 2, patch: '@@ -1,2 +1,10 @@\n context\n+new guidance\n' },
      { filename: 'README.md', status: 'modified', additions: 1, deletions: 1, patch: '@@ -1 +1 @@\n-old\n+new\n' },
      { filename: 'skills/alpha-skill/old-helper.md', status: 'removed', additions: 0, deletions: 40 },
      { filename: 'skills/beta-skill/renamed.md', status: 'renamed', previous_filename: 'skills/beta-skill/old-name.md', additions: 0, deletions: 0 },
    ],
    ...overrides,
  };
}

function stubFetchFor(compare) {
  const json = (data) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => data });
  return async (url) => {
    if (url.endsWith('/repos/someone/demo')) return json({ default_branch: 'main' });
    if (url.endsWith('/repos/someone/demo/commits/main')) {
      return json({ sha: HEAD, commit: { committer: { date: '2026-11-21T11:00:00Z' } } });
    }
    if (url.includes('/compare/')) return json(compare);
    throw new Error(`unexpected API call ${url}`);
  };
}

function capture() {
  const out = [];
  const err = [];
  return { out, err, log: (m) => out.push(m), error: (m) => err.push(m) };
}

// ---- parsePins: skill names -----------------------------------------

test('parsePins extracts the imported skill names, not unimported siblings', () => {
  const vendors = parsePins(PINS_TEXT);
  assert.equal(vendors.length, 1);
  assert.deepEqual(vendors[0].skills, ['alpha-skill', 'beta-skill']);
});

test('parsePins reads all 49 imported skills from the real pins file', async () => {
  const text = await readFileSync(path.join(REPO_ROOT, 'sources', 'imported-skills.md'), 'utf8');
  const vendors = parsePins(text);
  assert.equal(vendors.length, 6);
  const total = vendors.reduce((n, v) => n + v.skills.length, 0);
  assert.equal(total, 49);
  assert.deepEqual(vendors.find((v) => v.vendor === 'Agentic SEO').skills, ['seo']);
  assert.equal(vendors.find((v) => v.vendor === 'Superpowers').skills.length, 13);
});

// ---- analyzeChanges -------------------------------------------------

test('analyzeChanges: new commits listed, affecting change detected', () => {
  const vendor = { vendor: 'Demo', skills: ['alpha-skill', 'beta-skill'] };
  const d = analyzeChanges(vendor, comparePayload());
  assert.equal(d.newCommitCount, 2);
  assert.equal(d.newCommits.length, 2);
  assert.equal(d.newCommits[0].message, 'Improve alpha-skill docs');
  assert.equal(d.newCommits[0].date, '2026-11-21');
  assert.equal(d.newCommits[0].author, 'Ada');
  assert.equal(d.filesChanged, 4);
  assert.equal(d.affectsImports, true);
  assert.deepEqual(d.affectedSkills, ['alpha-skill', 'beta-skill']);
  assert.match(d.summary, /2 new commit\(s\)/);
  assert.match(d.summary, /affects imported skills: alpha-skill, beta-skill/);
});

test('analyzeChanges: a change touching no import reports "no imported skill affected"', () => {
  const vendor = { vendor: 'Demo', skills: ['alpha-skill'] };
  const d = analyzeChanges(vendor, comparePayload({
    files: [
      { filename: 'README.md', status: 'modified', additions: 1, deletions: 1 },
      { filename: 'docs/CHANGELOG.md', status: 'modified', additions: 5, deletions: 0 },
    ],
  }));
  assert.equal(d.affectsImports, false);
  assert.deepEqual(d.affectedSkills, []);
  assert.match(d.summary, /no imported skill affected/);
});

test('analyzeChanges: deleted and renamed files are reported', () => {
  const vendor = { vendor: 'Demo', skills: ['alpha-skill', 'beta-skill'] };
  const d = analyzeChanges(vendor, comparePayload());
  assert.deepEqual(d.deletedFiles, ['skills/alpha-skill/old-helper.md']);
  assert.deepEqual(d.renamedFiles, [{ from: 'skills/beta-skill/old-name.md', to: 'skills/beta-skill/renamed.md' }]);
  assert.match(d.summary, /1 deleted file\(s\)/);
  assert.match(d.summary, /1 renamed file\(s\)/);
  // A rename affects the skill under its old name too.
  assert.ok(d.files.find((f) => f.path === 'skills/beta-skill/renamed.md').affectsImports);
});

test('analyzeChanges: missing files/commits arrays mean "detail unavailable", not a crash', () => {
  const vendor = { vendor: 'Demo', skills: ['alpha-skill'] };
  const d = analyzeChanges(vendor, { status: 'ahead', ahead_by: 50, behind_by: 0 });
  assert.equal(d.detailAvailable, false);
  assert.equal(d.filesChanged, 0);
  assert.match(d.summary, /change detail unavailable/);
  assert.deepEqual(analyzeChanges(vendor, null), {
    newCommits: [], newCommitCount: 0, filesChanged: 0,
    files: [], affectedSkills: [], deletedFiles: [], renamedFiles: [],
    securityFlags: [], securityFlagCount: 0, affectsImports: false,
    detailAvailable: false, summary: '',
  });
});

test('affectedSkillsForPath: skill segments, marketingskills tools, and the single-skill repo', () => {
  const demo = { vendor: 'Demo', skills: ['alpha-skill'] };
  assert.deepEqual(affectedSkillsForPath('skills/alpha-skill/SKILL.md', demo), ['alpha-skill']);
  assert.deepEqual(affectedSkillsForPath('skills/other/SKILL.md', demo), []);
  assert.deepEqual(affectedSkillsForPath('alpha-skill/docs/x.md', demo), ['alpha-skill']);
  // Marketing Skills: an imported tool file affects link-building;
  // an unimported tool file affects nothing.
  const mkt = { vendor: 'Marketing Skills', skills: ['link-building', 'ai-seo'] };
  assert.deepEqual(affectedSkillsForPath('tools/clis/semrush.js', mkt), ['link-building']);
  assert.deepEqual(affectedSkillsForPath('tools/clis/unimported.js', mkt), []);
  // Agentic SEO: the whole repo is the seo skill.
  const seo = { vendor: 'Agentic SEO', skills: ['seo'] };
  assert.deepEqual(affectedSkillsForPath('README.md', seo), ['seo']);
  assert.deepEqual(affectedSkillsForPath('scripts/audit.py', seo), ['seo']);
});

// ---- Security heuristic ---------------------------------------------

test('scanFileForSecurity: install scripts, shell commands, URLs, credentials', () => {
  // A download piped to a shell in added lines (built from parts so
  // this file's own source contains no literal curl-pipe).
  const pipe = 'curl https://example.com/install.sh | ' + 'sh';
  const flags = scanFileForSecurity({
    filename: 'skills/alpha-skill/SKILL.md', status: 'modified',
    patch: `@@ -1 +1 @@\n context\n+${pipe}\n`,
  });
  assert.ok(flags.some((f) => f.id === 'shell-pipe' && f.severity === 'high'));
  assert.ok(flags.some((f) => f.id === 'url-added' && f.severity === 'info'));

  // Dynamic code execution in added lines.
  const evalCall = 'ev' + 'al(userInput)';
  const evalFlags = scanFileForSecurity({
    filename: 'scripts/helper.js', status: 'modified',
    patch: `@@ -1 +1 @@\n context\n+const out = ${evalCall};\n`,
  });
  assert.ok(evalFlags.some((f) => f.id === 'dynamic-code'));

  // A possible hardcoded secret in added lines (an obviously fake
  // sequential value, built from parts).
  const fakeSecret = 'sk-' + 'abcdefghij1234567890';
  const secretFlags = scanFileForSecurity({
    filename: 'config.js', status: 'modified',
    patch: `@@ -1 +1 @@\n context\n+const key = "${fakeSecret}";\n`,
  });
  assert.ok(secretFlags.some((f) => f.id === 'hardcoded-secret'));

  // An install script path, and an install hook in package.json.
  const installFlags = scanFileForSecurity({ filename: 'install.sh', status: 'modified', patch: '' });
  assert.ok(installFlags.some((f) => f.id === 'install-script'));
  const hookFlags = scanFileForSecurity({
    filename: 'package.json', status: 'modified',
    patch: '@@ -1 +1 @@\n context\n+  "postinstall": "node setup.js"\n',
  });
  assert.ok(hookFlags.some((f) => f.id === 'install-hook'));

  // A new executable script, and credential handling.
  const execFlags = scanFileForSecurity({ filename: 'scripts/run.sh', status: 'added', patch: '' });
  assert.ok(execFlags.some((f) => f.id === 'executable-added'));
  const credFlags = scanFileForSecurity({
    filename: 'lib/auth.js', status: 'modified',
    patch: '@@ -1 +1 @@\n context\n+const token = headers["api_key"];\n',
  });
  assert.ok(credFlags.some((f) => f.id === 'credential-handling'));

  // Removed lines cannot introduce new behavior: the same pipe in a
  // removed line flags nothing.
  const removedOnly = scanFileForSecurity({
    filename: 'skills/alpha-skill/SKILL.md', status: 'modified',
    patch: `@@ -1 +1 @@\n-${pipe}\n context\n`,
  });
  assert.deepEqual(removedOnly, []);
});

test('analyzeChanges counts high/medium flags, not informational URL flags', () => {
  const vendor = { vendor: 'Demo', skills: ['alpha-skill'] };
  const pipe = 'curl https://example.com/install.sh | ' + 'sh';
  const d = analyzeChanges(vendor, comparePayload({
    files: [
      { filename: 'skills/alpha-skill/SKILL.md', status: 'modified', additions: 1, deletions: 0, patch: `@@ -1 +1 @@\n+${pipe}\n` },
      { filename: 'README.md', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n+See https://example.com/docs\n' },
    ],
  }));
  // shell-pipe (high) counts; the two url-added (info) flags do not.
  assert.equal(d.securityFlagCount, 1);
  assert.equal(d.securityFlags.length, 2);
  assert.match(d.summary, /1 security flag\(s\)/);
});

// ---- checkVendor + runCheck end to end -------------------------------

test('checkVendor attaches detection to a drifted vendor', async () => {
  const result = await checkVendor(
    { vendor: 'Demo', repo: 'someone/demo', pinned: PIN, skills: ['alpha-skill', 'beta-skill'] },
    { fetchFn: stubFetchFor(comparePayload()), retryDelayMs: 1 },
  );
  assert.equal(result.status, 'BEHIND');
  assert.equal(result.detection.affectsImports, true);
  assert.deepEqual(result.detection.deletedFiles, ['skills/alpha-skill/old-helper.md']);
});

test('runCheck --json: machine-readable report with notifications; exit 0 on drift', async () => {
  const cap = capture();
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'skillforge-upstream-test-'));
  try {
    const code = await runCheck({
      fetchFn: stubFetchFor(comparePayload()),
      retryDelayMs: 1,
      pinsText: PINS_TEXT,
      log: cap.log,
      error: cap.error,
      json: true,
      statePath: path.join(tmp, 'state.json'),
      generated: '2026-11-22T00:00:00.000Z',
    });
    assert.equal(code, 0, 'drift stays informational');
    assert.equal(cap.out.length, 1, 'JSON mode prints only the JSON document');
    const report = JSON.parse(cap.out[0]);
    assert.equal(report.generated, '2026-11-22T00:00:00.000Z');
    assert.equal(report.vendors.length, 1);
    assert.equal(report.vendors[0].status, 'BEHIND');
    assert.equal(report.vendors[0].detection.affectsImports, true);
    assert.equal(report.notifications.length, 1);
    assert.equal(report.notifications[0].repo, 'someone/demo');
    assert.deepEqual(report.notifications[0].affectedSkills, ['alpha-skill', 'beta-skill']);
    assert.equal(report.summary.reviewQueue, 1);
    assert.equal(report.summary.newNotifications, 1);
    assert.equal(report.summary.duplicatesSuppressed, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('runCheck human mode: detection lines appear under the vendor', async () => {
  const cap = capture();
  const code = await runCheck({
    fetchFn: stubFetchFor(comparePayload()),
    retryDelayMs: 1,
    pinsText: PINS_TEXT,
    log: cap.log,
    error: cap.error,
    statePath: null,
  });
  assert.equal(code, 0);
  const text = cap.out.join('\n');
  assert.match(text, /changes: 2 new commit\(s\); 4 file\(s\) changed; affects imported skills: alpha-skill, beta-skill/);
  assert.match(text, /deleted: skills\/alpha-skill\/old-helper\.md/);
  assert.match(text, /renamed: skills\/beta-skill\/old-name\.md → skills\/beta-skill\/renamed\.md/);
  assert.match(text, /Review queue: 1 drifted import\(s\) need maintainer review \(1 new notification\(s\)\)/);
  // The original lines are preserved.
  assert.match(text, /0 up-to-date, 1 behind, 0 ahead, 0 diverged, 0 unknown/);
});

test('runCheck human mode: security lines are capped at 10 per vendor (JSON keeps all)', async () => {
  const files = Array.from({ length: 12 }, (_, i) => ({
    filename: `scripts/new-script-${i}.py`, status: 'added', additions: 5, deletions: 0,
  }));
  const cap = capture();
  const code = await runCheck({
    fetchFn: stubFetchFor(comparePayload({ files })),
    retryDelayMs: 1,
    pinsText: PINS_TEXT,
    log: cap.log,
    error: cap.error,
    statePath: null,
  });
  assert.equal(code, 0);
  const text = cap.out.join('\n');
  const shown = text.match(/security: scripts\/new-script-\d+\.py/g) || [];
  assert.equal(shown.length, 10);
  assert.match(text, /security: … and 2 more flagged file\(s\) \(see JSON output/);
  assert.match(text, /12 security flag\(s\)/, 'the summary count is not capped');
});

test('runCheck --out writes the JSON report to a file and still prints the human summary', async () => {
  const cap = capture();
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'skillforge-upstream-test-'));
  try {
    const outPath = path.join(tmp, 'report.json');
    const code = await runCheck({
      fetchFn: stubFetchFor(comparePayload()),
      retryDelayMs: 1,
      pinsText: PINS_TEXT,
      log: cap.log,
      error: cap.error,
      outPath,
      statePath: null,
    });
    assert.equal(code, 0);
    assert.ok(existsSync(outPath));
    const report = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(report.vendors[0].status, 'BEHIND');
    assert.match(cap.out.join('\n'), /Upstream check: 1 vendor repos pinned/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- Duplicate-notification prevention -------------------------------

test('notification state: same upstream state reported twice produces one notification', async () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'skillforge-upstream-test-'));
  try {
    const statePath = path.join(tmp, 'state.json');
    const opts = {
      fetchFn: stubFetchFor(comparePayload()),
      retryDelayMs: 1,
      pinsText: PINS_TEXT,
      json: true,
      statePath,
      generated: '2026-11-22T00:00:00.000Z',
    };
    // First run: new notification; --record-state writes the HEAD.
    const first = capture();
    const code1 = await runCheck({ ...opts, log: first.log, error: first.error, recordState: true });
    assert.equal(code1, 0);
    const report1 = JSON.parse(first.out[0]);
    assert.equal(report1.notifications.length, 1);
    assert.equal(report1.stateRecorded, true);
    assert.ok(existsSync(statePath));
    const saved = JSON.parse(readFileSync(statePath, 'utf8'));
    assert.equal(saved.vendors['someone/demo'].head, HEAD);

    // Second run, same upstream state: no new notification.
    const second = capture();
    const code2 = await runCheck({ ...opts, log: second.log, error: second.error });
    assert.equal(code2, 0);
    const report2 = JSON.parse(second.out[0]);
    assert.equal(report2.notifications.length, 0);
    assert.equal(report2.summary.duplicatesSuppressed, 1);
    assert.equal(report2.vendors[0].notification, 'duplicate');
    // The review queue still counts the item: suppression stops
    // re-announcement, it does not close the item.
    assert.equal(report2.summary.reviewQueue, 1);

    // A new upstream HEAD is a new notification again.
    const newHead = 'c'.repeat(40);
    const movedFetch = async (url) => {
      if (url.endsWith('/repos/someone/demo')) {
        return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ default_branch: 'main' }) };
      }
      if (url.endsWith('/repos/someone/demo/commits/main')) {
        return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ sha: newHead, commit: { committer: { date: '2026-11-22T00:00:00Z' } } }) };
      }
      if (url.includes('/compare/')) {
        return { ok: true, status: 200, headers: { get: () => null }, json: async () => comparePayload() };
      }
      throw new Error(`unexpected API call ${url}`);
    };
    const third = capture();
    await runCheck({ ...opts, fetchFn: movedFetch, log: third.log, error: third.error });
    const report3 = JSON.parse(third.out[0]);
    assert.equal(report3.notifications.length, 1);
    assert.equal(report3.vendors[0].notification, 'new');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('notificationStatus: only drift notifies; UP-TO-DATE and UNKNOWN never do', () => {
  const state = { vendors: { 'someone/demo': { head: HEAD } } };
  assert.equal(notificationStatus('someone/demo', HEAD, 'BEHIND', state), 'duplicate');
  assert.equal(notificationStatus('someone/demo', 'd'.repeat(40), 'BEHIND', state), 'new');
  assert.equal(notificationStatus('someone/other', HEAD, 'BEHIND', state), 'new');
  assert.equal(notificationStatus('someone/demo', HEAD, 'UP-TO-DATE', state), 'none');
  assert.equal(notificationStatus('someone/demo', HEAD, 'UNKNOWN', state), 'none');
  assert.equal(notificationStatus('someone/demo', null, 'BEHIND', state), 'none');
});

test('loadNotificationState: missing file is empty, corrupt file warns and is empty', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'skillforge-upstream-test-'));
  try {
    const missing = loadNotificationState(path.join(tmp, 'nope.json'));
    assert.deepEqual(missing.state.vendors, {});
    assert.equal(missing.warning, null);
    const corruptPath = path.join(tmp, 'corrupt.json');
    writeFileSync(corruptPath, '{not json');
    const corrupt = loadNotificationState(corruptPath);
    assert.deepEqual(corrupt.state.vendors, {});
    assert.match(corrupt.warning, /cannot read state file/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('runCheck still exits 1 when a vendor is UNKNOWN (D1 preserved in JSON mode)', async () => {
  const failingFetch = async () => {
    const e = new Error('connect ECONNREFUSED 127.0.0.1:443');
    e.code = 'ECONNREFUSED';
    throw e;
  };
  const cap = capture();
  const code = await runCheck({
    fetchFn: failingFetch,
    retryDelayMs: 1,
    pinsText: PINS_TEXT,
    log: cap.log,
    error: cap.error,
    json: true,
    statePath: null,
  });
  assert.equal(code, 1);
  const report = JSON.parse(cap.out[0]);
  assert.equal(report.vendors[0].status, 'UNKNOWN');
  assert.equal(report.notifications.length, 0);
  assert.match(cap.err.join('\n'), /Upstream check incomplete: 1 vendor\(s\) UNKNOWN/);
});
