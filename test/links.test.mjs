// links.test.mjs — regression tests for the link checker (A-23).
//
// Extraction tests are pure unit tests. Online tests run against a
// local HTTP stub server on 127.0.0.1 — no real network is used.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  extractLinks,
  stripCode,
  checkUrl,
  verifyExternalUrls,
} from '../scripts/check-links.mjs';
import { REPO_ROOT } from '../test-support/helpers.mjs';

// --- Extraction: code is not links ---------------------------------------

test('extraction ignores link-shaped text in inline code spans', () => {
  const text = [
    'See `[text](missing-file.md)` for the syntax,',
    'and `[other](also-missing.md)` in the same line.',
    'But [real](existing.md) is a genuine link.',
  ].join('\n');
  assert.deepEqual(extractLinks(text), ['existing.md']);
});

test('extraction ignores double-backtick spans containing a backtick', () => {
  const text = 'Example: `` `[text](missing.md)` `` is just an example.\n[real](existing.md) counts.';
  assert.deepEqual(extractLinks(text), ['existing.md']);
});

test('extraction ignores fenced code blocks', () => {
  const text = [
    '```md',
    '[fenced](missing.md)',
    '```',
    '',
    '~~~md',
    '[tilde-fenced](also-missing.md)',
    '~~~',
    '',
    '[real](existing.md)',
  ].join('\n');
  assert.deepEqual(extractLinks(text), ['existing.md']);
});

test('extraction still finds real internal and external links', () => {
  const text = [
    '[internal](docs/guide.md)',
    '[anchored](docs/guide.md#section)',
    '[external](https://example.com/page)',
    '[titled](https://example.org/a "A title")',
    '[hash](#local-anchor)',
    '[mail](mailto:someone@example.com)',
  ].join('\n');
  assert.deepEqual(extractLinks(text), [
    'docs/guide.md',
    'docs/guide.md#section',
    'https://example.com/page',
    'https://example.org/a',
    '#local-anchor',
    'mailto:someone@example.com',
  ]);
});

test('stripCode leaves ordinary prose untouched', () => {
  const text = 'Plain [link](file.md) and *emphasis* with no code at all.';
  assert.equal(stripCode(text), text);
});

// --- Online: retry, backoff, delay (local stub server) -------------------
// Scripted routes; each records how many times it was hit so tests can
// assert the retry count, not just the outcome.

function startStub() {
  const hits = new Map();
  const count = (path) => {
    hits.set(path, (hits.get(path) || 0) + 1);
    return hits.get(path);
  };
  const server = http.createServer((req, res) => {
    const n = count(req.url);
    const pathname = req.url.split('?')[0];
    if (pathname === '/ok') {
      res.writeHead(200).end('ok');
    } else if (pathname === '/flaky-429') {
      if (n === 1) res.writeHead(429).end('slow down');
      else res.writeHead(200).end('ok');
    } else if (pathname === '/flaky-403') {
      if (n === 1) res.writeHead(403).end('forbidden');
      else res.writeHead(200).end('ok');
    } else if (pathname === '/flaky-timeout') {
      // First request never answers (the client times out); the
      // second answers normally. The dangling socket is closed by
      // closeAllConnections() in teardown.
      if (n > 1) res.writeHead(200).end('ok');
    } else if (pathname === '/always-429') {
      res.writeHead(429).end('slow down');
    } else if (pathname === '/not-found') {
      res.writeHead(404).end('nope');
    } else if (pathname === '/head-blocked') {
      // HEAD is refused; GET works — the GET fallback must decide.
      if (req.method === 'HEAD') res.writeHead(405).end();
      else res.writeHead(200).end('ok');
    } else {
      res.writeHead(404).end('unknown route');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      resolve({
        base,
        hits,
        close: async () => {
          if (server.closeAllConnections) server.closeAllConnections();
          await new Promise((r) => server.close(r));
        },
      });
    });
  });
}

// Small timeouts/backoffs keep the suite fast; the production defaults
// (15s timeout, 500ms backoff) are unchanged.
const FAST = { timeoutMs: 500, backoffMs: 10, maxAttempts: 3 };

test('retry: 429 then 200 verifies', async () => {
  const stub = await startStub();
  try {
    const status = await checkUrl(`${stub.base}/flaky-429`, FAST);
    assert.equal(status, 200);
    assert.equal(stub.hits.get('/flaky-429'), 2);
  } finally {
    await stub.close();
  }
});

test('retry: 403 then 200 verifies', async () => {
  const stub = await startStub();
  try {
    const status = await checkUrl(`${stub.base}/flaky-403`, FAST);
    assert.equal(status, 200);
    assert.equal(stub.hits.get('/flaky-403'), 2);
  } finally {
    await stub.close();
  }
});

test('retry: timeout then 200 verifies', async () => {
  const stub = await startStub();
  try {
    const status = await checkUrl(`${stub.base}/flaky-timeout`, {
      ...FAST,
      timeoutMs: 100,
    });
    assert.equal(status, 200);
    assert.equal(stub.hits.get('/flaky-timeout'), 2);
  } finally {
    await stub.close();
  }
});

test('persistent 429 exhausts retries on HEAD and on the GET fallback', async () => {
  const stub = await startStub();
  try {
    const status = await checkUrl(`${stub.base}/always-429`, {
      ...FAST,
      maxAttempts: 2,
    });
    assert.equal(status, 429);
    // 2 HEAD attempts, then the GET fallback with 2 attempts.
    assert.equal(stub.hits.get('/always-429'), 4);
  } finally {
    await stub.close();
  }
});

test('non-retryable 404 is reported immediately, never retried', async () => {
  const stub = await startStub();
  try {
    const status = await checkUrl(`${stub.base}/not-found`, FAST);
    assert.equal(status, 404);
    assert.equal(stub.hits.get('/not-found'), 1);
  } finally {
    await stub.close();
  }
});

test('GET fallback still decides when HEAD is refused (405)', async () => {
  const stub = await startStub();
  try {
    const status = await checkUrl(`${stub.base}/head-blocked`, FAST);
    assert.equal(status, 200);
    assert.equal(stub.hits.get('/head-blocked'), 2);
  } finally {
    await stub.close();
  }
});

test('inter-request delay is applied between fetches', async () => {
  const stub = await startStub();
  try {
    const external = new Map([
      [`${stub.base}/ok?a=1`, ['a.md']],
      [`${stub.base}/ok?a=2`, ['b.md']],
      [`${stub.base}/ok?a=3`, ['c.md']],
    ]);
    const start = Date.now();
    const { errors, skipped } = await verifyExternalUrls(external, {
      ...FAST,
      delayMs: 120,
    });
    const elapsed = Date.now() - start;
    assert.deepEqual(errors, []);
    assert.equal(skipped, 0);
    // Two gaps of 120ms = 240ms expected; assert loosely (200ms) so
    // a busy CI machine cannot flake the test.
    assert.ok(elapsed >= 200, `expected >= 200ms of delay, got ${elapsed}ms`);
  } finally {
    await stub.close();
  }
});

test('verifyExternalUrls skips example domains and documented exceptions without fetching', async () => {
  const stub = await startStub();
  try {
    const external = new Map([
      ['https://example.com/placeholder', ['a.md']],
      ['https://www.npmjs.com/package/never-fetched', ['b.md']],
      [`${stub.base}/ok`, ['c.md']],
    ]);
    const { errors, skipped } = await verifyExternalUrls(external, FAST);
    assert.deepEqual(errors, []);
    assert.equal(skipped, 2);
    assert.equal(stub.hits.get('/ok'), 1);
  } finally {
    await stub.close();
  }
});

test('verifyExternalUrls reports fetched separately from skipped (A-24)', async () => {
  // A-24: the online summary used to count every enumerated URL as
  // "verified", including the ones never fetched (example domains and
  // documented exceptions). verifyExternalUrls now returns `fetched`,
  // and only requested URLs count toward it.
  const stub = await startStub();
  try {
    const external = new Map([
      ['https://example.com/placeholder', ['a.md']],
      ['https://www.npmjs.com/package/never-fetched', ['b.md']],
      [`${stub.base}/ok?a=1`, ['c.md']],
      [`${stub.base}/ok?a=2`, ['d.md']],
    ]);
    const { errors, skipped, fetched } = await verifyExternalUrls(external, FAST);
    assert.deepEqual(errors, []);
    assert.equal(skipped, 2);
    assert.equal(fetched, 2);
    assert.equal(fetched + skipped, external.size);
  } finally {
    await stub.close();
  }
});

test('verifyExternalUrls reports a broken URL with its referencing file', async () => {
  const stub = await startStub();
  try {
    const external = new Map([[`${stub.base}/not-found`, ['docs/guide.md']]]);
    const { errors, skipped } = await verifyExternalUrls(external, FAST);
    assert.equal(skipped, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /HTTP 404/);
    assert.match(errors[0], /docs\/guide\.md/);
  } finally {
    await stub.close();
  }
});

// --- Script-level acceptance (Stage E, area 13) ---------------------------
// The tests above cover the extraction and online-verification
// machinery. These two cover the script's offline run — the check CI
// runs (lint.yml) — which had no test: the real repo must pass, and
// a broken internal link in a fixture repo must fail.

function runNode(script, args = []) {
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { timeout: 120000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

test('check-links (offline) passes on the real repo', async () => {
  // Offline mode checks internal links only and lists external ones;
  // no network is used. The counts must be non-zero: a scan that
  // silently found nothing would also print PASS.
  const r = await runNode(path.join(REPO_ROOT, 'scripts', 'check-links.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const m = r.stdout.match(/Checked (\d+) internal links; (\d+) unique external URLs listed/);
  assert.ok(m, `unexpected summary line: ${r.stdout}`);
  assert.ok(Number(m[1]) > 0, 'expected at least one internal link to be checked');
  assert.ok(Number(m[2]) > 0, 'expected at least one external URL to be listed');
  assert.match(r.stdout, /^PASS\./m);
  assert.doesNotMatch(r.stdout, /ERROR/);
});

test('check-links flags a broken internal link (fixture)', async () => {
  // Fixture repo: the real script (fresh copy) plus its local lib
  // import, with one good link and one broken one.
  const root = await mkdtemp(path.join(os.tmpdir(), 'skillforge-links-test-'));
  try {
    await mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await cp(
      path.join(REPO_ROOT, 'scripts', 'check-links.mjs'),
      path.join(root, 'scripts', 'check-links.mjs'),
    );
    await cp(
      path.join(REPO_ROOT, 'scripts', 'lib', 'paths.mjs'),
      path.join(root, 'scripts', 'lib', 'paths.mjs'),
    );
    await writeFile(
      path.join(root, 'docs', 'guide.md'),
      '# Guide\n\nSee [other](other.md) and [missing](nope.md).\n',
    );
    await writeFile(path.join(root, 'docs', 'other.md'), '# Other\n');
    const r = await runNode(path.join(root, 'scripts', 'check-links.mjs'));
    assert.equal(r.code, 1, `a broken internal link must fail the check: ${r.stdout}`);
    assert.match(r.stdout, /docs\/guide\.md: broken internal link: nope\.md/);
    assert.doesNotMatch(r.stdout, /other\.md: broken|broken internal link: other\.md/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
