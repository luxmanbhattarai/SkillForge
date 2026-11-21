// check-status.mjs — verify ai/PROJECT-STATUS.json against live sources
// and verify the docs carry the canonical numbers.
//
// Usage:
//   node scripts/check-status.mjs                      # static + doc checks
//   node scripts/check-status.mjs --verify-tests FILE  # also compare FILE
//     (npm test spec output) against the recorded runner counts
//
// This is the drift guard for the canonical status file: every count in
// PROJECT-STATUS.json that can be re-derived cheaply is re-derived here,
// and the living docs (README, ARCHITECTURE, CHANGELOG) must contain the
// canonical numbers. If a count changes, update PROJECT-STATUS.json (after
// re-verifying it with the real command) and the docs together — this check
// fails until both agree.
//
// The test-runner count cannot be re-derived statically (loop-generated
// tests and in-body test.skip() calls make a regex count differ from the
// runner total), so it is verified from real `npm test` output via
// --verify-tests, which CI runs in the validate job after the suite.
// The static call-site count is checked as a tripwire: any change means
// a test was added/removed and the runner numbers must be re-verified.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_PATH = path.join(ROOT, 'ai', 'PROJECT-STATUS.json');

const failures = [];
const warnings = [];
const ok = (msg) => console.log(`  ok   ${msg}`);
const fail = (msg) => { failures.push(msg); console.log(`  FAIL ${msg}`); };
const warn = (msg) => { warnings.push(msg); console.log(`  warn ${msg}`); };

function eq(label, actual, expected, hint = '') {
  if (actual === expected) ok(`${label}: ${actual}`);
  else fail(`${label}: expected ${expected}, got ${actual}${hint ? ` (${hint})` : ''}`);
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
}

async function main() {
  const args = process.argv.slice(2);
  const verifyTestsIdx = args.indexOf('--verify-tests');
  const testOutputFile = verifyTestsIdx >= 0 ? args[verifyTestsIdx + 1] : null;
  if (verifyTestsIdx >= 0 && !testOutputFile) {
    console.error('usage: check-status.mjs [--verify-tests <npm-test-output-file>]');
    process.exit(2);
  }

  const status = await readJson('ai/PROJECT-STATUS.json');
  console.log('check-status: verifying ai/PROJECT-STATUS.json against live sources');

  // 1. Registry counts.
  const skills = await readJson('registry/skills.json');
  const categories = await readJson('registry/categories.json');
  const agents = await readJson('registry/agents.json');
  const workflows = await readJson('registry/workflows.json');
  const skillList = skills.skills;
  eq('skills.total', skillList.length, status.skills.total);
  eq('skills.original', skillList.filter((s) => s.source_type !== 'upstream').length, status.skills.original);
  eq('skills.upstream', skillList.filter((s) => s.source_type === 'upstream').length, status.skills.upstream);
  eq('skills.categories', (categories.categories || categories).length, status.skills.categories);
  eq('agents', (agents.agents || agents).length, status.agents);
  eq('workflows', (workflows.workflows || workflows).length, status.workflows);

  // 2. Verification split.
  const vs = await readJson('sources/verification-status.json');
  const split = { verified: 0, 'verified-with-limitations': 0, 'needs-correction': 0, unverified: 0 };
  for (const entry of Object.values(vs.statuses)) {
    if (entry.status in split) split[entry.status]++;
  }
  eq('verification.verified', split.verified, status.skills.verification.verified);
  eq('verification.verifiedWithLimitations', split['verified-with-limitations'], status.skills.verification.verifiedWithLimitations);
  eq('verification.needsCorrection', split['needs-correction'], status.skills.verification.needsCorrection);
  eq('verification.unverified', split.unverified, status.skills.verification.unverified);

  // 3. Eval case counts.
  const caseFiles = (await readdir(path.join(ROOT, 'evals', 'cases'))).filter((f) => f.endsWith('.json'));
  let handwritten = 0;
  for (const f of caseFiles) {
    const data = await readJson(path.join('evals', 'cases', f));
    handwritten += Array.isArray(data) ? data.length : (data.cases ? data.cases.length : 0);
  }
  const generated = await readJson('evals/datasets/discovery-generated.json');
  eq('evals.handwritten', handwritten, status.evals.handwritten);
  eq('evals.generated', generated.cases.length, status.evals.generated);
  eq('evals.total', handwritten + generated.cases.length, status.evals.total);

  // 4. Security pattern counts.
  const { PATTERNS } = await import('./lib/security-patterns.mjs');
  const byScope = {};
  for (const p of PATTERNS) for (const s of p.scopes) byScope[s] = (byScope[s] || 0) + 1;
  eq('security.patterns.total', PATTERNS.length, status.security.patterns.total);
  eq('security.patterns.scanScope', byScope.scan || 0, status.security.patterns.scanScope);
  eq('security.patterns.scoreScope', byScope.score || 0, status.security.patterns.scoreScope);
  eq('security.patterns.inputScope', byScope.input || 0, status.security.patterns.inputScope);

  // 5. Binary hashes manifest entry count.
  const hashes = await readJson('sources/binary-hashes.json');
  eq('security.binaryHashes', Object.keys(hashes.files).length, status.security.scanner.binaryHashesVerified);

  // 6. Static test call-site tripwire (see header: NOT the runner count).
  const testFiles = (await readdir(path.join(ROOT, 'test'))).filter((f) => f.endsWith('.test.mjs'));
  const callSiteRe = /^\s*test(\.(skip|only))?\(/;
  let callSites = 0;
  for (const f of testFiles) {
    const text = await readFile(path.join(ROOT, 'test', f), 'utf8');
    for (const line of text.split('\n')) if (callSiteRe.test(line)) callSites++;
  }
  eq('tests.staticCallSites', callSites, status.tests.staticCallSites,
    'a test was added/removed — re-run npm test and update tests.runner in PROJECT-STATUS.json');

  // 7. Docs carry the canonical numbers.
  const docChecks = [
    ['README.md', `| \`verified\` | ${status.skills.verification.verified} |`, 'verification table row'],
    ['README.md', `${status.tests.runner.total} tests`, 'unit test count'],
    ['README.md', `${status.evals.total} cases`, 'eval case count'],
    ['README.md', `${status.skills.total} skills`, 'skill count'],
    ['docs/ARCHITECTURE.md', `${status.tests.runner.total} tests`, 'unit test count'],
    ['docs/ARCHITECTURE.md', `${status.evals.total} cases`, 'eval case count'],
  ];
  for (const [rel, needle, label] of docChecks) {
    const text = await readFile(path.join(ROOT, rel), 'utf8');
    if (text.includes(needle)) ok(`${rel} contains ${label} (${needle})`);
    else fail(`${rel} is missing ${label}: expected to contain ${JSON.stringify(needle)}`);
  }
  // CHANGELOG: the [Unreleased] section (before the v1.0.0 section) must
  // carry the current eval count; the historical v1.0.0 section is exempt.
  const changelog = await readFile(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const unreleased = changelog.split('## [1.0.0]')[0];
  if (unreleased.includes(`${status.evals.total} cases`)) ok('CHANGELOG [Unreleased] contains eval count');
  else fail(`CHANGELOG [Unreleased] is missing "${status.evals.total} cases"`);

  // 8. Verification commit: warn (do not fail) when HEAD has moved past the
  // commit the numbers were verified at. The counts above are the hard
  // signal; this is the reminder to re-verify after code changes.
  // Schema convention (see PROJECT-STATUS.json `note`): the top-level
  // `commit` and the per-section `commit` fields are current-state
  // "last verified at" pointers, not history — they move forward when
  // the battery re-runs at a newer commit; previous values live in git
  // history. Narrative fields (e.g. auditFindings.status) are
  // historical records and are never rewritten.
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: ROOT });
    const head = stdout.trim();
    if (head === status.commit) ok(`commit ${head.slice(0, 7)} matches the verified commit`);
    else warn(`HEAD ${head.slice(0, 7)} differs from verified commit ${String(status.commit).slice(0, 7)} — re-run the battery and update PROJECT-STATUS.json`);
  } catch {
    warn('git not available; skipping commit check');
  }

  // 9. Optional: verify recorded runner counts against real npm test output.
  if (testOutputFile) {
    const output = await readFile(testOutputFile, 'utf8');
    const grab = (label) => {
      const matches = [...output.matchAll(new RegExp(`\u2139\\s*${label}\\s+(\\d+)`, 'g'))];
      if (matches.length === 0) return null;
      return Number(matches[matches.length - 1][1]);
    };
    const r = status.tests.runner;
    const total = grab('tests');
    const passed = grab('pass');
    const failed = grab('fail');
    const skipped = grab('skipped');
    if (total === null || passed === null || failed === null || skipped === null) {
      fail(`--verify-tests: could not parse test summary lines from ${testOutputFile} (expected "ℹ tests/pass/fail/skipped" lines from the spec reporter)`);
    } else {
      eq('tests.runner.total', total, r.total);
      eq('tests.runner.passed', passed, r.passed);
      eq('tests.runner.failed', failed, r.failed);
      eq('tests.runner.skipped', skipped, r.skipped);
    }
  }

  console.log(`\ncheck-status: ${failures.length} failure(s), ${warnings.length} warning(s).`);
  if (failures.length > 0) {
    console.log('Fix: re-run the battery (npm test, npm run validate, npm run evals, npm run check:security), update ai/PROJECT-STATUS.json, and sync the docs.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`check-status: error: ${err.message}`);
  process.exit(1);
});
