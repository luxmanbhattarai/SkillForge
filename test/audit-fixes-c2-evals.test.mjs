// audit-fixes-c2-evals.test.mjs — regression tests for the Phase C
// workstream C2 fixes in the eval runners, the model provider, the
// upstream checker, and the online link/source checkers:
// A2-06, A2-07, A2-10, A2-12, A2-13, A2-22 (discovery generator),
// A5-04 (mock-agent loadSkill), A5-05, A5-06, A5-08, S-14.
// Installer/registry/check-script tests live in
// test/audit-fixes-c2.test.mjs.
//
// Online tests run against local HTTP stub servers on 127.0.0.1 or
// stub fetch functions — no real network is used. Every test
// verifies real behavior (a returned value, a thrown error, a
// server's hit count, a file's bytes).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fetchWithRetry, unsafeRedirectReason } from '../scripts/check-links.mjs';
import { api, checkVendor, parsePins } from '../scripts/check-upstream.mjs';
import { MockAgent } from '../evals/runners/mock-agent.mjs';
import { createModelProvider, parseModelConfig, parseRetryAfter } from '../evals/runners/providers.mjs';
import { scoreCode } from '../evals/scorers/code.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

const FAST = { timeoutMs: 500, backoffMs: 10, maxAttempts: 2, sleepFn: () => Promise.resolve() };

function runNode(script, args = [], { cwd = REPO_ROOT } = {}) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { cwd, timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function startStub(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        base: `http://127.0.0.1:${server.address().port}`,
        close: async () => {
          if (server.closeAllConnections) server.closeAllConnections();
          await new Promise((r) => server.close(r));
        },
      });
    });
  });
}

function chatCompletion(content, usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }) {
  return JSON.stringify({
    choices: [{ message: { role: 'assistant', content } }],
    usage,
  });
}

const STUB_ANSWER = JSON.stringify({
  skills: ['alpha-skill'],
  answer: 'Use alpha widgets for this task.',
  refused: false,
  refusalReason: null,
  tools: ['load alpha-skill'],
  code: [],
});

// --- A5-06: redirect-target SSRF guard ---

test('A5-06: unsafeRedirectReason blocks localhost, loopback, private, and link-local targets', () => {
  // Localhost by name.
  assert.match(unsafeRedirectReason('http://localhost/x'), /localhost/);
  assert.match(unsafeRedirectReason('http://LOCALHOST./x'), /localhost/);
  assert.match(unsafeRedirectReason('http://app.localhost/x'), /localhost/);
  // IPv4 loopback / private / link-local / this-network.
  assert.match(unsafeRedirectReason('http://127.0.0.1/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://127.9.9.9/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://10.1.2.3/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://172.16.0.1/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://172.31.255.255/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://192.168.1.1/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://169.254.169.254/latest/meta-data/'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://0.0.0.0/x'), /loopback, private, or link-local/);
  // IPv6 loopback / link-local / unique-local / IPv4-mapped loopback.
  assert.match(unsafeRedirectReason('http://[::1]/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://[fe80::1]/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://[fd00::1]/x'), /loopback, private, or link-local/);
  assert.match(unsafeRedirectReason('http://[::ffff:127.0.0.1]/x'), /loopback, private, or link-local/);
  // Non-http(s) schemes.
  assert.match(unsafeRedirectReason('ftp://example.com/x'), /not http\(s\)/);
  assert.match(unsafeRedirectReason('file:///etc/passwd'), /not http\(s\)/);
  // Public targets are safe.
  assert.equal(unsafeRedirectReason('https://example.com/page'), null);
  assert.equal(unsafeRedirectReason('http://8.8.8.8/x'), null);
  assert.equal(unsafeRedirectReason('http://172.32.0.1/x'), null); // just outside 172.16/12
  assert.equal(unsafeRedirectReason('http://[2001:db8::1]/x'), null);
});

test('A5-06: fetchWithRetry refuses a redirect to loopback and never fetches it', async () => {
  const requested = [];
  const stubFetch = async (url) => {
    requested.push(url);
    if (url === 'https://example.com/start') {
      return {
        status: 302,
        headers: { get: (n) => (n.toLowerCase() === 'location' ? 'http://127.0.0.1:9999/evil' : null) },
        body: null,
      };
    }
    throw new Error(`unexpected fetch of ${url}`);
  };
  await assert.rejects(
    () => fetchWithRetry('https://example.com/start', { fetchFn: stubFetch, ...FAST }),
    (e) => {
      assert.equal(e.code, 'UNSAFE_REDIRECT');
      assert.match(e.message, /refusing redirect/);
      assert.match(e.message, /127\.0\.0\.1/);
      return true;
    },
  );
  assert.deepEqual(requested, ['https://example.com/start']);
});

test('A5-06: fetchWithRetry refuses a redirect to a non-http(s) scheme', async () => {
  const stubFetch = async () => ({
    status: 301,
    headers: { get: (n) => (n.toLowerCase() === 'location' ? 'ftp://example.com/x' : null) },
    body: null,
  });
  await assert.rejects(
    () => fetchWithRetry('https://example.com/start', { fetchFn: stubFetch, ...FAST }),
    /refusing redirect.*not http\(s\)/,
  );
});

test('A5-06: fetchWithRetry still follows a safe redirect to its final status', async () => {
  const stubFetch = async (url) => {
    if (url === 'https://example.com/start') {
      return {
        status: 302,
        headers: { get: (n) => (n.toLowerCase() === 'location' ? 'https://example.com/landing' : null) },
        body: null,
      };
    }
    assert.equal(url, 'https://example.com/landing');
    return { status: 200, headers: { get: () => null }, body: null };
  };
  const res = await fetchWithRetry('https://example.com/start', { fetchFn: stubFetch, ...FAST });
  assert.equal(res.status, 200);
});

test('A5-06: fetchWithRetry gives up after too many redirects', async () => {
  const stubFetch = async (url) => ({
    status: 302,
    headers: { get: (n) => (n.toLowerCase() === 'location' ? `${url}/hop` : null) },
    body: null,
  });
  await assert.rejects(
    () => fetchWithRetry('https://example.com/start', { fetchFn: stubFetch, ...FAST }),
    /too many redirects/,
  );
});

test('A5-06: a real stub server redirecting to loopback is refused, not fetched', async () => {
  const stub = await startStub((req, res) => {
    if (req.url === '/to-loopback') {
      res.writeHead(302, { Location: 'http://127.0.0.1:9/evil' });
      res.end();
    } else {
      res.writeHead(404).end();
    }
  });
  try {
    await assert.rejects(
      () => fetchWithRetry(`${stub.base}/to-loopback`, FAST),
      (e) => {
        assert.equal(e.code, 'UNSAFE_REDIRECT');
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

// --- S-14 + A2-22: parsePins export and the live-upstream reference ---

test('S-14: parsePins reads the live-upstream reference from the real pins file', async () => {
  const text = await readFile(path.join(REPO_ROOT, 'sources', 'imported-skills.md'), 'utf8');
  const vendors = parsePins(text);
  assert.equal(vendors.length, 6);
  const seo = vendors.find((v) => v.vendor === 'Agentic SEO');
  assert.equal(seo.repo, 'pwg-projects/agentic-seo-skill');
  assert.equal(seo.pinned, '67775741ce88e0a474513ac53d6f6e4558ff1a3b');
  assert.equal(seo.liveUpstream, 'Bhanunamikaze/Agentic-SEO-Skill');
  assert.equal(vendors.find((v) => v.vendor === 'Anthropic').liveUpstream, null);
});

test('S-14: parsePins parses a Live upstream line in fixture text', () => {
  const vendors = parsePins([
    '### Demo — 1 skill (MIT)',
    'Source: https://github.com/someone/fork ·',
    'Commit `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` · Imported 2026-11-20',
    '',
    'Live upstream: https://github.com/author/original',
    '',
  ].join('\n'));
  assert.equal(vendors.length, 1);
  assert.equal(vendors[0].repo, 'someone/fork');
  assert.equal(vendors[0].liveUpstream, 'author/original');
});

test('S-14: checkVendor reports live-upstream drift without changing the primary status', async () => {
  const PIN = 'a'.repeat(40);
  const FORK_HEAD = PIN; // fork head == pin: primary is UP-TO-DATE
  const LIVE_HEAD = 'b'.repeat(40);
  const calls = [];
  const stubFetch = async (url) => {
    calls.push(url);
    const json = (data) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => data });
    if (url.endsWith('/repos/someone/fork')) return json({ default_branch: 'main' });
    if (url.endsWith('/repos/author/original')) return json({ default_branch: 'main' });
    if (url.endsWith('/repos/someone/fork/commits/main')) {
      return json({ sha: FORK_HEAD, commit: { committer: { date: '2026-03-03T00:00:00Z' } } });
    }
    if (url.endsWith('/repos/author/original/commits/main')) {
      return json({ sha: LIVE_HEAD, commit: { committer: { date: '2026-10-14T00:00:00Z' } } });
    }
    if (url.includes('/compare/')) {
      return json({ status: 'ahead', ahead_by: 50, behind_by: 0 });
    }
    throw new Error(`unexpected API call ${url}`);
  };
  const result = await checkVendor(
    { vendor: 'Demo', repo: 'someone/fork', pinned: PIN, liveUpstream: 'author/original' },
    { fetchFn: stubFetch, retryDelayMs: 1 },
  );
  assert.equal(result.status, 'UP-TO-DATE');
  assert.equal(result.live.repo, 'author/original');
  assert.equal(result.live.status, 'BEHIND');
  assert.match(result.live.detail, /50 commit\(s\) behind main head/);
});

// --- A2-10: check-upstream timeout and retry ---

test('A2-10: api retries once on a 429 and then succeeds', async () => {
  let calls = 0;
  const stubFetch = async () => {
    calls++;
    if (calls === 1) {
      return { ok: false, status: 429, headers: { get: () => null }, json: async () => ({}) };
    }
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ default_branch: 'main' }) };
  };
  const data = await api('/repos/someone/fork', { fetchFn: stubFetch, retryDelayMs: 1 });
  assert.deepEqual(data, { default_branch: 'main' });
  assert.equal(calls, 2);
});

test('A2-10: api does not retry a non-retryable 404', async () => {
  let calls = 0;
  const stubFetch = async () => {
    calls++;
    return { ok: false, status: 404, headers: { get: () => null }, json: async () => ({}) };
  };
  await assert.rejects(
    () => api('/repos/nope/nope', { fetchFn: stubFetch, retryDelayMs: 1 }),
    /HTTP 404/,
  );
  assert.equal(calls, 1);
});

test('A2-10: api aborts a hung call at the timeout instead of hanging forever', async () => {
  // A fetch that never settles on its own, but rejects when its
  // signal aborts — exactly what real fetch does on timeout.
  const hangingFetch = (_url, opts) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => {
      const e = new Error('The operation timed out.');
      e.name = 'TimeoutError';
      reject(e);
    });
  });
  const start = Date.now();
  await assert.rejects(
    () => api('/repos/someone/fork', { fetchFn: hangingFetch, timeoutMs: 50, retryDelayMs: 1 }),
    /timed out/,
  );
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 5000, `a hung call must fail fast, took ${elapsed}ms`);
});

// --- A2-13: Retry-After honoring ---

test('A2-13: parseRetryAfter handles delay-seconds, HTTP-dates, and garbage', () => {
  assert.equal(parseRetryAfter('5'), 5000);
  assert.equal(parseRetryAfter('0'), 0);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter(undefined), null);
  assert.equal(parseRetryAfter('garbage'), null);
  assert.equal(parseRetryAfter(''), null);
  const now = Date.parse('2026-11-21T12:00:00Z');
  assert.equal(parseRetryAfter('Sat, 21 Nov 2026 12:00:05 GMT', now), 5000);
  assert.equal(parseRetryAfter('Sat, 21 Nov 2026 11:59:00 GMT', now), 0); // past date: retry now
});

test('A2-13: the model provider waits out Retry-After instead of the fixed backoff', async (t) => {
  let calls = 0;
  const stub = await startStub((req, res) => {
    calls++;
    if (calls === 1) {
      res.writeHead(429, { 'Retry-After': '1' });
      res.end('slow down');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(chatCompletion(STUB_ANSWER));
  });
  t.after(() => stub.close());
  // Base retry delay is 10ms: if Retry-After were ignored, the
  // run would finish in ~10ms. Honoring it takes ~1000ms.
  const provider = createModelProvider({
    EVAL_PROVIDER_URL: `${stub.base}/v1/chat/completions`,
    EVAL_PROVIDER_KEY: 'test-key-not-a-real-credential',
    EVAL_PROVIDER_MODEL: 'stub-model',
    EVAL_PROVIDER_RETRY_DELAY_MS: '10',
  });
  const start = Date.now();
  const obs = await provider.run({ id: 'T-1', input: 'do alpha things' });
  const elapsed = Date.now() - start;
  assert.deepEqual(obs.selectedSkills, ['alpha-skill']);
  assert.equal(calls, 2);
  assert.equal(provider.getUsage().retries, 1);
  assert.ok(elapsed >= 900, `expected a ~1000ms Retry-After wait, took ${elapsed}ms`);
  assert.ok(elapsed < 5000, `Retry-After wait took suspiciously long: ${elapsed}ms`);
});

// --- A5-08: plaintext http:// warning for non-localhost endpoints ---

test('A5-08: parseModelConfig warns loudly for non-localhost http, stays silent for localhost/https', () => {
  const seen = [];
  const realError = console.error;
  console.error = (...args) => seen.push(args.join(' '));
  try {
    parseModelConfig({
      EVAL_PROVIDER_URL: 'http://example.com/v1/chat/completions',
      EVAL_PROVIDER_KEY: 'sk-test-not-a-real-key-12345', EVAL_PROVIDER_MODEL: 'm',
    });
    assert.equal(seen.length, 1);
    assert.match(seen[0], /WARNING: EVAL_PROVIDER_URL uses plaintext http:\/\//);
    assert.match(seen[0], /Bearer token over cleartext/);
    assert.ok(!seen[0].includes('sk-test-not-a-real-key-12345'), 'the key is never echoed');

    seen.length = 0;
    parseModelConfig({
      EVAL_PROVIDER_URL: 'http://localhost:11434/v1/chat/completions',
      EVAL_PROVIDER_KEY: 'k', EVAL_PROVIDER_MODEL: 'm',
    });
    parseModelConfig({
      EVAL_PROVIDER_URL: 'http://127.0.0.1:11434/v1/chat/completions',
      EVAL_PROVIDER_KEY: 'k', EVAL_PROVIDER_MODEL: 'm',
    });
    parseModelConfig({
      EVAL_PROVIDER_URL: 'https://example.com/v1/chat/completions',
      EVAL_PROVIDER_KEY: 'k', EVAL_PROVIDER_MODEL: 'm',
    });
    assert.deepEqual(seen, []);
  } finally {
    console.error = realError;
  }
});

// --- A5-05: eval fixture names are validated before dynamic import ---

test('A5-05: scoreCode rejects a traversal fixture name instead of importing it', async () => {
  const checks = await scoreCode(
    { id: 'T-1', expected: { fixture: '../../../scripts/check-links' } },
    {},
  );
  assert.equal(checks.length, 1);
  assert.equal(checks[0].pass, false);
  assert.match(checks[0].detail, /invalid fixture name/);
  assert.match(checks[0].detail, /must match/);
});

test('A5-05: scoreCode rejects other malformed fixture names, but loads a missing valid one normally', async () => {
  // (An empty-string fixture is falsy, so scoreCode treats it as
  // "no fixture" before the validator ever sees it.)
  for (const bad of ['bad name!', 'a/b', '.hidden', 'a.mjs']) {
    const checks = await scoreCode({ id: 'T-1', expected: { fixture: bad } }, {});
    assert.equal(checks[0].pass, false, bad);
    assert.match(checks[0].detail, /invalid fixture name/, bad);
  }
  // A well-formed name that names no fixture fails at load time —
  // the validator only rejects bad names, not missing fixtures.
  const checks = await scoreCode({ id: 'T-1', expected: { fixture: 'no-such-fixture' } }, {});
  assert.equal(checks[0].pass, false);
  assert.match(checks[0].detail, /fixture failed to load/);
  assert.doesNotMatch(checks[0].detail, /invalid fixture name/);
});

// --- A5-04: mock-agent loadSkill stays inside the skills directory ---

test('A5-04: MockAgent.loadSkill refuses a registry path outside skills/', async () => {
  const evilDir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-evil-skill-'));
  try {
    await writeFile(path.join(evilDir, 'SKILL.md'), 'EVIL MARKER — must never load\n');
    const agent = new MockAgent({
      skills: [
        { name: 'evil', description: 'Evil skill.', category: 'x', path: evilDir },
        { name: 'nextjs', description: 'Next.js skill.', category: 'frontend', path: 'skills/frontend/nextjs' },
      ],
    });
    assert.equal(await agent.loadSkill('evil'), '');
    // A legitimate skill still loads.
    const nextjs = await agent.loadSkill('nextjs');
    assert.ok(nextjs.length > 0);
    assert.doesNotMatch(nextjs, /EVIL MARKER/);
    // A relative traversal is refused too.
    const agent2 = new MockAgent({
      skills: [{ name: 'trav', description: 'Traversal.', category: 'x', path: '../../etc' }],
    });
    assert.equal(await agent2.loadSkill('trav'), '');
  } finally {
    await rm(evilDir, { recursive: true, force: true });
  }
});

// --- A2-07: code-point ordering, not locale ordering ---

test('A2-07: MockAgent.rank breaks ties by code point, not locale collation', () => {
  // 'apple' vs 'Banana': locale collation ranks apple first
  // (case-insensitive primary), code-point order ranks Banana
  // first ('B' < 'a'). Both score equally on the task 'fruit'.
  const agent = new MockAgent({
    skills: [
      { name: 'apple', description: 'fruit', category: 'x' },
      { name: 'Banana', description: 'fruit', category: 'x' },
    ],
  });
  const ranked = agent.rank('fruit');
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].score, ranked[1].score);
  assert.deepEqual(ranked.map((r) => r.name), ['Banana', 'apple']);
});

// --- A2-06 + A2-22: discovery generator is deterministic ---

test('A2-06/A2-22: the discovery generator is deterministic across runs', async () => {
  const generator = path.join(REPO_ROOT, 'evals', 'datasets', 'generate-discovery-cases.mjs');
  const outFile = path.join(REPO_ROOT, 'evals', 'datasets', 'discovery-generated.json');
  const registry = JSON.parse(await readFile(path.join(REPO_ROOT, 'registry', 'skills.json'), 'utf8'));
  const before = await readFile(outFile, 'utf8');
  const r1 = await runNode(generator);
  assert.equal(r1.code, 0, r1.stdout + r1.stderr);
  assert.match(r1.stdout, /Generated 277 discovery cases/);
  const afterFirst = await readFile(outFile, 'utf8');
  const r2 = await runNode(generator);
  assert.equal(r2.code, 0, r2.stdout + r2.stderr);
  const afterSecond = await readFile(outFile, 'utf8');
  assert.equal(afterFirst, afterSecond, 'two runs must produce byte-identical output');
  assert.equal(afterFirst, before, 'regenerating without a registry change must be a zero-diff');
  const parsed = JSON.parse(afterSecond);
  assert.equal(parsed.generated, registry.generated, 'generated date derives from the registry, not the wall clock');
  assert.equal(parsed.count, 277);
});

// --- A2-12: eval runner writes reports atomically ---

test('A2-12: a mock eval run writes a complete, parseable report to --out', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'skillforge-evals-test-'));
  try {
    const r = await runNode(
      path.join(REPO_ROOT, 'evals', 'runners', 'run-evals.mjs'),
      ['--cases', 'GEN-disc-astro', '--out', outDir, '--no-compare'],
    );
    assert.equal(r.code, 0, r.stdout + r.stderr);
    const report = JSON.parse(await readFile(path.join(outDir, 'latest.json'), 'utf8'));
    assert.equal(report.summary.total, 1);
    assert.equal(report.summary.passed, 1);
    assert.equal(report.results[0].id, 'GEN-disc-astro');
    const md = await readFile(path.join(outDir, 'latest.md'), 'utf8');
    assert.match(md, /# Eval Report/);
    assert.match(md, /Cases: 1 total, 1 passed, 0 failed/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
