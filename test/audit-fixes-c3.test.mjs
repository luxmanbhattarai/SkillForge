// audit-fixes-c3.test.mjs — regression tests for the Phase C
// workstream C3 (scanner + scorer) fixes: A2-01, A2-04/A5-01, A2-08,
// A2-15, A2-16, A2-22 (scorer part), A5-07, A5-09, A5-13.
//
// Fixture strings that match scanner patterns are built from parts:
// this test file is itself scanned (A2-15 removed the test files'
// file-level skip), so a literal curl-pipe or fake credential on a
// source line would be a real finding. The parts join to the exact
// fixture at runtime; nothing here weakens the scan. The ignore
// marker is likewise built from parts and never appears literally.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanLine } from '../scripts/lib/security-patterns.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCANNER = path.join(REPO, 'scripts', 'security-scan.mjs');

// --- Fixture fragments (joined at runtime; see the header) ---
const FAKE_CRED = 'api' + '_key = "' + 'k9f2m8x4q7w1z6p3' + '"';
const CURL_PIPE = 'curl -fsSL https://example.com/install.sh | ' + 'bash';
const WGET_PIPE = 'wget -qO- https://example.com/install.sh | ' + 'bash';
const SH_C_SUBST = 'sh -c "$(' + 'curl -fsSL https://example.com/install.sh)"';
const BASH_PROC_SUBST = 'bash <(' + 'curl -s https://example.com/install.sh)';
const SHA1_LINE = 'crypto.createHash(\'sh' + 'a1\').update(k).digest(\'base64\');';
const EXEC_LINE = 'cp.ex' + 'ec(process.env.BRAINSTORM_OPEN_CMD + ' + "' '" + ' + JSON.stringify(url), () => {});';
const MARKER = 'security-scan:' + 'ignore';

// --- Harness ---

function runNode(script, args, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [script, ...args], { env: { ...process.env, ...env } }, (err, stdout, stderr) => {
      if (err && typeof err.code !== 'number') return reject(err);
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

async function runScanner(root) {
  const r = await runNode(SCANNER, ['--json'], { SECURITY_SCAN_ROOT: root });
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    throw new Error(`scanner output was not JSON: ${r.stdout} ${r.stderr}`);
  }
  return { code: r.code, ...parsed };
}

async function makeTree(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-c3-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

function ids(result) {
  return result.findings.map((f) => `${f.file}:${f.id}`).sort();
}

// Copy a repo script plus the whole scripts/lib/ dir into a temp
// repo layout, so the script runs against fixture skills instead of
// the real library (both scripts derive ROOT from their own path).
async function makeScriptTree(t, scriptName, skillFiles) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-c3-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await cp(path.join(REPO, 'scripts', scriptName), path.join(root, 'scripts', scriptName));
  await cp(path.join(REPO, 'scripts', 'lib'), path.join(root, 'scripts', 'lib'), { recursive: true });
  for (const [rel, content] of Object.entries(skillFiles)) {
    const full = path.join(root, rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

// --- Scorer fixtures (A2-01 / A2-22) ---

// A skill engineered to score 100 on every dimension when complete:
// all 15 sections with 2+ lines, 5 workflow steps, 4 checklist
// items, 2 code blocks, a counter-example, 6+ security lines, 8+
// testing signals plus a Testing Strategy subsection, 3 official
// links, 2 reference links + 3 related skills, fresh last_verified,
// version info, no placeholders, no relative links, <= 350 lines.
const SECTIONS = {
  Purpose: 'Do the thing well.\nDo it every time.',
  'When to Use': 'When the task needs it.\nWhen the alternative is worse.',
  'When Not to Use': 'When a simpler tool fits.\nWhen the cost outweighs the gain.',
  Prerequisites: 'Requires Node.js 24 (current stable as of 2026-11-21).\nA text editor and a terminal.',
  'Official Documentation': '- [Node.js docs](https://nodejs.org/en/docs/)\n- [MDN](https://developer.mozilla.org/)\n- [Spec](https://example.com/spec)',
  'Required Workflow': '1. Plan the work.\n2. Do the first step.\n3. Do the second step.\n4. Verify the result.\n5. Report the outcome.',
  'Implementation Standards': '### Testing Strategy\nWrite unit test cases with vitest; add integration tests and e2e coverage.\nUse pytest or playwright where they fit; testing is not optional.',
  'Best Practices': 'Keep it simple.\nKeep it explicit.',
  'Security Considerations': 'Never log secrets.\nValidate all input.\nUse parameterized queries.\nKeep dependencies current.\nEnforce least privilege.\nReview permissions regularly.',
  'Performance Considerations': 'Measure before optimizing.\nCache only what is stable.',
  'Common Mistakes': 'Skipping validation.\nDo not do this; use the validated helper instead.',
  Examples: 'Counter-example: do not do this.\n\n```js\nconst ok = true;\n```\n\n```js\nconst alsoOk = true;\n```',
  'Validation Checklist': '- [ ] Planned\n- [ ] Implemented\n- [ ] Tested\n- [ ] Reviewed',
  'Expected Deliverables': 'Working code.\nA short summary.',
  References: '- [Guide](https://example.com/guide)\n- [Tutorial](https://example.com/tutorial)\n- See `react`, `nextjs`, `typescript`.',
};

function skillMd({ omit = [], extraSections = {}, extraLine = '' } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  let body = '';
  for (const [heading, content] of Object.entries({ ...SECTIONS, ...extraSections })) {
    if (omit.includes(heading)) continue;
    body += `## ${heading}\n\n${content}\n\n`;
  }
  if (extraLine) body += `${extraLine}\n`;
  return `---\nname: fixture-skill\ndescription: A fixture skill for scorer tests with a description long enough to earn full completeness marks.\nlicense: MIT\nmetadata:\n  category: backend\n  last_verified: ${today}\n---\n\n# Fixture Skill\n\n${body}`;
}

async function runScorer(t, skillFiles) {
  const root = await makeScriptTree(t, 'score-skills.mjs', skillFiles);
  const r = await runNode(path.join(root, 'scripts', 'score-skills.mjs'), ['--json']);
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    throw new Error(`scorer output was not JSON: ${r.stdout} ${r.stderr}`);
  }
  return { code: r.code, ...parsed };
}

test('A2-01/A2-22 scorer: a complete clean skill scores 100 with no cap', async (t) => {
  const r = await runScorer(t, { 'skills/backend/fixture-skill/SKILL.md': skillMd() });
  assert.equal(r.code, 0, 'clean skill must not fail the scorer');
  assert.equal(r.results.length, 1);
  const s = r.results[0];
  assert.deepEqual(Object.keys(s.dimensions).sort(), ['accuracy', 'actionability', 'completeness', 'documentation', 'maintainability', 'security', 'testing', 'versioning']);
  assert.equal(s.dimensions.security, 100);
  assert.equal(s.dimensions.completeness, 100);
  assert.equal(s.dimensions.actionability, 100);
  assert.equal(s.overall, 100, 'a complete clean fixture scores 100 overall');
  assert.deepEqual(s.flags, []);
});

test('A2-01 scorer: a security-pattern hit caps overall at 40 and flags CRITICAL', async (t) => {
  // Regression for the dead cap (`secHits.length` on a Set): on the
  // old code this skill scored 88 overall despite the hit.
  const hit = skillMd({ extraSections: { Examples: `${SECTIONS.Examples}\n\n${FAKE_CRED}` } });
  const r = await runScorer(t, { 'skills/backend/fixture-skill/SKILL.md': hit });
  assert.equal(r.code, 1, 'a security hit must fail the scorer');
  const s = r.results[0];
  assert.equal(s.dimensions.security, 0, 'security dimension is 0 on a hit');
  assert.equal(s.overall, 40, 'overall is capped at 40 (uncapped mean would be 88)');
  assert.ok(s.flags.some((f) => f.startsWith('CRITICAL')), 'hit is flagged CRITICAL');
  assert.ok(s.flags.join(' ').includes('SEC-05'), 'flag names the pattern');
});

test('A2-22 scorer: a missing required section caps overall at 50', async (t) => {
  const r = await runScorer(t, { 'skills/backend/fixture-skill/SKILL.md': skillMd({ omit: ['Examples'] }) });
  assert.equal(r.code, 0, 'a missing section is not CRITICAL');
  assert.equal(r.results[0].overall, 50, 'overall is capped at 50 (uncapped mean would be 97)');
  assert.ok(r.results[0].flags.some((f) => f.includes('missing sections: Examples')));
});

test('A2-22 scorer: a placeholder marker caps overall at 60', async (t) => {
  const r = await runScorer(t, { 'skills/backend/fixture-skill/SKILL.md': skillMd({ extraLine: 'TODO: expand this section.' }) });
  assert.equal(r.results[0].dimensions.accuracy, 60, 'placeholder costs 40 accuracy points');
  assert.equal(r.results[0].overall, 60, 'overall is capped at 60 (uncapped mean would be 95)');
});

// --- Scanner scope (A2-04/A5-01) ---

test('A2-04 scanner: .cjs, .html, .xml, .txt files are scanned', async (t) => {
  const root = await makeTree(t, {
    'a/server.cjs': `module.exports = {};\nconst k = '${FAKE_CRED}';\n`,
    'b/page.html': `<html><body>${FAKE_CRED}</body></html>\n`,
    'c/data.xml': `<root>${FAKE_CRED}</root>\n`,
    'd/notes.txt': `notes\n${FAKE_CRED}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.equal(r.scanned.textFiles, 4, 'all four new extensions are counted as text');
  assert.deepEqual(ids(r), ['a/server.cjs:SEC-05', 'b/page.html:SEC-05', 'c/data.xml:SEC-05', 'd/notes.txt:SEC-05']);
});

test('A2-04 scanner: extensionless files with a shebang — and plain-text ones — are scanned', async (t) => {
  const root = await makeTree(t, {
    'scripts/task-start': `#!/usr/bin/env bash\n# ${FAKE_CRED}\n`,
    'LICENSE': `MIT License\n${FAKE_CRED}\n`,
    'notes.dot': `digraph { a -> b; }\n# ${FAKE_CRED}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.equal(r.scanned.textFiles, 3, 'shebang script, LICENSE, and .dot are all scanned as text');
  assert.deepEqual(ids(r), ['LICENSE:SEC-05', 'notes.dot:SEC-05', 'scripts/task-start:SEC-05']);
});

test('A2-04 scanner: an unrecognized BINARY file is not scanned as text', async (t) => {
  // Content-sniff boundary: NUL bytes mean binary, so the secret-like
  // bytes inside are not pattern-scanned (only BINARY_EXT files get
  // the byte-level secret scan).
  const buf = Buffer.concat([Buffer.from([0x00, 0x01, 0x02, 0xff]), Buffer.from(FAKE_CRED)]);
  const root = await makeTree(t, { 'assets/blob': buf });
  const r = await runScanner(root);
  assert.equal(r.code, 0, 'unknown binary content is skipped, not flagged');
  assert.equal(r.scanned.textFiles, 0);
  assert.deepEqual(r.findings, []);
});

test('A2-04 scanner: server.cjs shapes are detected at a non-excepted path, excepted at the real path', async (t) => {
  const content = `${SHA1_LINE}\n${EXEC_LINE}\n`;
  const root = await makeTree(t, {
    'elsewhere/server.cjs': content,
    // Mirrors the real excepted path (RFC 6455 SHA-1 + operator
    // launcher with a JSON-quoted URL — triaged, see EXCEPTIONS).
    'skills/upstream/superpowers/brainstorming/scripts/server.cjs': content,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['elsewhere/server.cjs:CODE-07', 'elsewhere/server.cjs:CODE-11']);
});

// --- Frontmatter alignment (A2-08) ---

function fmMd(name) {
  return `---\nname: ${name}\ndescription: A fixture skill for frontmatter tests.\n---\n\nBody text.\n`;
}

async function runFrontmatter(t, skillFiles) {
  const root = await makeScriptTree(t, 'check-frontmatter.mjs', skillFiles);
  return runNode(path.join(root, 'scripts', 'check-frontmatter.mjs'), []);
}

test('A2-08 frontmatter: upstream name mismatch warns and passes; original mismatch errors and fails', async (t) => {
  const upstreamOnly = await runFrontmatter(t, {
    'skills/upstream/vendor/some-skill/SKILL.md': fmMd('different-name'),
  });
  assert.equal(upstreamOnly.code, 0, 'upstream mismatch must not fail the check');
  assert.match(upstreamOnly.stdout, /WARN .*different-name.*some-skill/);
  assert.match(upstreamOnly.stdout, /PASS\./);

  const originalOnly = await runFrontmatter(t, {
    'skills/backend/some-skill/SKILL.md': fmMd('different-name'),
  });
  assert.equal(originalOnly.code, 1, 'original mismatch must still fail the check');
  assert.match(originalOnly.stdout, /ERROR .*different-name.*some-skill/);
  assert.match(originalOnly.stdout, /FAIL: 1 error/);
});

test('A2-08 frontmatter: matching names pass for both upstream and original', async (t) => {
  const r = await runFrontmatter(t, {
    'skills/upstream/vendor/some-skill/SKILL.md': fmMd('some-skill'),
    'skills/backend/other-skill/SKILL.md': fmMd('other-skill'),
  });
  assert.equal(r.code, 0);
  assert.match(r.stdout, /PASS\./);
  assert.doesNotMatch(r.stdout, /WARN|ERROR/);
});

// --- Test-file scanning (A2-15) ---

test('A2-15 scanner: the real test/security.test.mjs passes via its fixture ignores, but a planted token on a new line is flagged', async (t) => {
  const real = await readFile(path.join(REPO, 'test', 'security.test.mjs'), 'utf8');
  const root = await makeTree(t, { 'test/security.test.mjs': real });
  const clean = await runScanner(root);
  assert.equal(clean.code, 0, 'the real test file with its allowlisted fixture ignores must pass');
  assert.deepEqual(clean.findings, []);

  const plantedLine = `\nconst planted = 'api` + `_key = "k9f2m8x4q7w1z6p3"';\n`;
  await writeFile(path.join(root, 'test', 'security.test.mjs'), real + plantedLine);
  const planted = await runScanner(root);
  assert.equal(planted.code, 1, 'a token on a non-fixture line must fail the scan');
  assert.deepEqual(ids(planted), ['test/security.test.mjs:SEC-05']);
});

// --- Multi-line ignore (A2-16) + ignore gate (A5-07) ---

const MULTILINE_PIPE = 'curl -fsSL https://example.com/install.sh | \\' + '\n  bash -s -- --target codex\n';

test('A2-16 scanner: a multi-line curl-pipe is silenced by an allowlisted ignore on either spanned line', async (t) => {
  // scripts/install/commands.mjs is the allowlisted (file, CMD-01)
  // pair; mirroring that path in a temp root exercises the gate.
  // The first spanned line ends in the continuation backslash, so
  // the directive goes BEFORE the curl text on that line — a
  // trailing comment after the backslash would break the
  // continuation and the multi-line regex would not match at all.
  const curlLine = MULTILINE_PIPE.split('\n')[0];
  const bashLine = MULTILINE_PIPE.split('\n')[1];
  const firstLine = await makeTree(t, {
    'scripts/install/commands.mjs': `// ${MARKER} CMD-01 :: ${curlLine}\n${bashLine}\n`,
  });
  const r1 = await runScanner(firstLine);
  assert.equal(r1.code, 0, 'ignore on the first spanned line silences the multi-line match');
  assert.deepEqual(r1.findings, []);

  const secondLine = await makeTree(t, {
    'scripts/install/commands.mjs': `${curlLine}\n${bashLine} // ${MARKER} CMD-01\n`,
  });
  const r2 = await runScanner(secondLine);
  assert.equal(r2.code, 0, 'ignore on the second spanned line silences the multi-line match');
  assert.deepEqual(r2.findings, []);

  const noIgnore = await makeTree(t, {
    'scripts/install/commands.mjs': MULTILINE_PIPE,
  });
  const r3 = await runScanner(noIgnore);
  assert.equal(r3.code, 1, 'without an ignore the multi-line match is still reported');
  assert.deepEqual(ids(r3), ['scripts/install/commands.mjs:CMD-01']);
});

test('A5-07 scanner: an unauthorized ignore is itself a finding and suppresses nothing', async (t) => {
  const root = await makeTree(t, {
    'src/config.mjs': `export const k = '${FAKE_CRED}'; // ${MARKER} SEC-05\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['src/config.mjs:IGNORE-01', 'src/config.mjs:SEC-05'],
    'fail closed: the unauthorized ignore is reported AND the secret is still reported');
});

test('A5-07 scanner: a bare (unscoped) marker is rejected even with no pattern on the line', async (t) => {
  const root = await makeTree(t, {
    'src/plain.mjs': `export const x = 1; // ${MARKER}\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['src/plain.mjs:IGNORE-01']);
});

test('A5-07 scanner: a mention of the marker inside backticks is documentation, not a directive', async (t) => {
  const root = await makeTree(t, {
    'docs/guide.md': `# Guide\n\nAdd \`${MARKER}\` to the line to silence a finding.\n\nOr \`${MARKER} SEC-01,CODE-03\` for specific patterns.\n`,
  });
  const r = await runScanner(root);
  assert.equal(r.code, 0, 'backticked mentions must not be treated as directives');
  assert.deepEqual(r.findings, []);
});

// --- Binary hashes (A5-09) ---

const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);

function manifestFor(entries) {
  return JSON.stringify({ algorithm: 'sha256', files: entries }, null, 2) + '\n';
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

test('A5-09 scanner: matching binary hashes pass; a flipped byte fails with HASH-01', async (t) => {
  const root = await makeTree(t, {
    'assets/logo.png': FAKE_PNG,
    'sources/binary-hashes.json': manifestFor({ 'assets/logo.png': sha256(FAKE_PNG) }),
  });
  const ok = await runScanner(root);
  assert.equal(ok.code, 0, 'matching hashes must pass');
  assert.equal(ok.hashes.manifest, true);
  assert.equal(ok.hashes.checked, 1);

  const flipped = Buffer.from(FAKE_PNG);
  flipped[flipped.length - 1] ^= 0xff; // flip a byte in the copy
  await writeFile(path.join(root, 'assets', 'logo.png'), flipped);
  const bad = await runScanner(root);
  assert.equal(bad.code, 1, 'a flipped byte must fail the scan');
  assert.deepEqual(ids(bad), ['assets/logo.png:HASH-01']);
});

test('A5-09 scanner: a missing listed file (HASH-02), an unlisted binary (HASH-04), and a malformed manifest (HASH-03) all fail', async (t) => {
  const missing = await makeTree(t, {
    'sources/binary-hashes.json': manifestFor({ 'assets/gone.png': sha256(FAKE_PNG) }),
  });
  assert.deepEqual(ids(await runScanner(missing)), ['assets/gone.png:HASH-02']);

  const unlisted = await makeTree(t, {
    'assets/logo.png': FAKE_PNG,
    'assets/other.png': FAKE_PNG,
    'sources/binary-hashes.json': manifestFor({ 'assets/logo.png': sha256(FAKE_PNG) }),
  });
  assert.deepEqual(ids(await runScanner(unlisted)), ['assets/other.png:HASH-04']);

  const malformed = await makeTree(t, {
    'assets/logo.png': FAKE_PNG,
    'sources/binary-hashes.json': '{ not json\n',
  });
  assert.deepEqual(ids(await runScanner(malformed)), ['sources/binary-hashes.json:HASH-03']);
});

test('A5-09 scanner: with no manifest the hash check is skipped (temp roots)', async (t) => {
  const root = await makeTree(t, { 'src/plain.mjs': 'export const x = 1;\n' });
  const r = await runScanner(root);
  assert.equal(r.code, 0);
  assert.equal(r.hashes.manifest, false);
  assert.equal(r.hashes.checked, 0);
});

// --- wget / substitution forms (A5-13) ---

test('A5-13 patterns: wget-pipe, sh -c substitution, and process substitution match CMD-01; safe forms do not', () => {
  const hit = (line) => scanLine(line, 'scan').map((h) => h.pattern.id);
  assert.deepEqual(hit(WGET_PIPE), ['CMD-01']);
  assert.deepEqual(hit('wget -qO- https://example.com/i.sh | ' + 'sudo sh'), ['CMD-01']);
  assert.deepEqual(hit(SH_C_SUBST), ['CMD-01']);
  assert.deepEqual(hit(BASH_PROC_SUBST), ['CMD-01']);
  assert.deepEqual(hit('sh <(' + 'wget -qO- https://example.com/i.sh)'), ['CMD-01']);
  // Safe: plain download, output capture without shell execution,
  // and sh -c without a download.
  assert.deepEqual(hit('wget https://example.com/i.sh'), []);
  assert.deepEqual(hit('curl -fsSL https://example.com/i.sh -o i.sh'), []);
  assert.deepEqual(hit('echo "$(' + 'curl -s https://example.com/x)"'), []);
  assert.deepEqual(hit('sh -c "echo hi"'), []);
  // The original curl-pipe form still matches (no regression).
  assert.deepEqual(hit(CURL_PIPE), ['CMD-01']);
});

test('A5-13 scanner: wget-pipe and substitution forms are flagged end to end, including multi-line wget', async (t) => {
  const root = await makeTree(t, {
    'scripts/a.sh': `${WGET_PIPE}\n`,
    'scripts/b.sh': `${SH_C_SUBST}\n${BASH_PROC_SUBST}\n`,
    'scripts/c.sh': 'wget -qO- https://example.com/install.sh | \\' + '\n  bash\n',
  });
  const r = await runScanner(root);
  assert.equal(r.code, 1);
  assert.deepEqual(ids(r), ['scripts/a.sh:CMD-01', 'scripts/b.sh:CMD-01', 'scripts/b.sh:CMD-01', 'scripts/c.sh:CMD-01']);
  const multi = r.findings.find((f) => f.file === 'scripts/c.sh');
  assert.equal(multi.label, 'curl-piped-to-shell command (multi-line)');
});

// --- Sanity: the pattern library still pins its counts (A5-13
// extended CMD-01 in place instead of adding a pattern, so the
// counts in test/security.test.mjs are unchanged) ---

test('A5-13 patterns: no new pattern id was added (counts unchanged)', async (t) => {
  const { PATTERNS, patternsFor } = await import('../scripts/lib/security-patterns.mjs');
  assert.equal(PATTERNS.length, 34);
  assert.equal(patternsFor('scan').length, 29);
  assert.equal(patternsFor('score').length, 11);
  assert.equal(patternsFor('input').length, 9);
});
