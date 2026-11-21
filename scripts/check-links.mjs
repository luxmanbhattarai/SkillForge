#!/usr/bin/env node
// check-links.mjs — checks internal Markdown links across the repository.
// External links are listed, not fetched, unless --online is passed (then a
// HEAD request with a browser User-Agent verifies each unique external URL;
// slow and rate-limit prone, ~5 minutes for the full set).
// skills/upstream/ is excluded by default: upstream skills are imported
// verbatim and legitimately reference files outside the imported subsets
// (e.g. marketingskills tools/); those are reported as warnings by
// validate-skills.mjs instead. Pass --include-upstream to check them too.
// RFC 2606 example domains (example.com/org/net) are skipped: they are
// intentional placeholders in sample content, never meant to resolve.
// Hosts listed in EXCEPTIONS are real but unverifiable by automated checks
// from this environment; each entry was verified independently on the date
// noted. Add entries only with evidence, never to silence a real 404.
// Link extraction ignores fenced code blocks and inline code spans:
// link-shaped text in code is an example, not a link (A-23 — a prose
// example tripped the offline check in Stage B).
// The online path retries 403/429 responses and network errors with
// exponential backoff, and waits briefly between requests, so transient
// rate-limiting (e.g. the cursor.com 403 seen in the v1.0.0 run) does
// not fail the check. What counts as broken/verified/skipped is
// unchanged: only the fetching is more patient.
// Usage: node scripts/check-links.mjs [--online] [--include-upstream]

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPosixPath } from './lib/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = process.argv.includes('--online');
const INCLUDE_UPSTREAM = process.argv.includes('--include-upstream');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 SkillForge-link-check/1.0';
const EXAMPLE_RE = /^https?:\/\/([^/]*\.)?example\.(com|org|net)([/:?#]|$)/;
// Online fetching policy (A-23). Tunable via the options of checkUrl /
// verifyExternalUrls; tests pass small values against a local stub.
export const FETCH_TIMEOUT_MS = 15000;
export const MAX_ATTEMPTS = 3; // initial attempt + 2 retries
export const BACKOFF_BASE_MS = 500; // 500ms, then 1000ms (exponential)
export const REQUEST_DELAY_MS = 200; // pause between requests, not before the first
// Statuses worth retrying: rate-limiting and bot-gate responses that
// often clear on a second attempt. Other 4xx/5xx are reported as-is.
const RETRYABLE_STATUS = new Set([403, 429]);
// [url prefix, reason] — verified real, unverifiable by automated checks.
const EXCEPTIONS = [
  ['https://www.npmjs.com/', 'host blocks automated checks (403); verified real'],
  ['https://www.webpagetest.org/', 'host blocks automated checks (403); verified real'],
  ['https://dev.mysql.com/', 'host blocks automated checks (403); verified real'],
  ['https://docs.midjourney.com/', 'host blocks automated checks (403); verified real'],
  ['https://securityheaders.com/', 'host blocks automated checks (403); verified real'],
  ['https://unsplash.com/', 'host blocks automated checks (401); verified real'],
  ['https://dash.cloudflare.com/', 'login-required dashboard'],
  ['https://vercel.com/dashboard', 'login-required dashboard'],
  ['https://www.ftc.gov/', 'host blocks automated checks; verified via browser fetch 2026-11-20'],
  ['https://socket.dev/', 'unreachable from this environment; verified via browser fetch 2026-11-20'],
  ['https://raw.githubusercontent.com/redis/redis/8.10/00-RELEASENOTES', 'timed out from this environment; verified via browser fetch 2026-11-20 (Redis 8.10.3 release notes)'],
  ['https://pgbouncer.github.io/', 'unreachable from this environment; verified via browser fetch 2026-11-20'],
  ['https://www.pgbouncer.github.io/', 'unreachable from this environment; verified via browser fetch 2026-11-20'],
  ['https://www.w3.org/', 'host blocks automated checks (403); verified real'],
  ['https://validator.w3.org/', 'host blocks automated checks (403); verified real'],
  ['https://support.google.com/', 'host blocks Node fetch (404); verified via curl 2026-11-20'],
  ['https://martinfowler.com/', 'host blocks Node fetch (timeouts); verified via curl 2026-11-20'],
  ['https://refactoring.com/', 'host blocks Node fetch (timeouts); verified via curl 2026-11-20'],
  ['https://csrc.nist.gov/', 'host blocks Node fetch (404); verified via curl and browser fetch 2026-11-20'],
  ['https://www.poynter.org/', 'host blocks automated checks (403); verified real'],
  ['https://developers.facebook.com/', 'host blocks automated checks (400); verified real'],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findMd(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/**
 * Remove fenced code blocks (``` or ~~~, up to 3 spaces of indent) and
 * inline code spans from Markdown text, so link-shaped examples in code
 * are not mistaken for links. Best-effort CommonMark: an unclosed fence
 * is left in place, and a closing fence must use the same marker run
 * as the opening fence.
 */
export function stripCode(text) {
  // Fenced blocks first: a fence may itself contain backticks and
  // link-shaped lines.
  let stripped = text.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1\s*$/gm, '');
  // Double-backtick spans first: their content may contain single
  // backticks (a backtick is content when not followed by another
  // backtick), then single-backtick spans (no newline inside a span).
  stripped = stripped.replace(/``(?:[^`\n]|`(?=[^`\n]))*``/g, '');
  stripped = stripped.replace(/`[^`\n]+`/g, '');
  return stripped;
}

/** Extract link hrefs from Markdown text, ignoring code (see stripCode). */
export function extractLinks(text) {
  const hrefs = [];
  for (const m of stripCode(text).matchAll(LINK_RE)) hrefs.push(m[1]);
  return hrefs;
}

/**
 * Fetch once, retrying on 403/429 and on network errors/timeouts with
 * exponential backoff (BACKOFF_BASE_MS, doubling). Returns the final
 * Response; throws the last error when every attempt threw. A
 * non-retryable status is returned immediately, never retried.
 */
export async function fetchWithRetry(url, {
  method = 'HEAD',
  fetchFn = fetch,
  timeoutMs = FETCH_TIMEOUT_MS,
  maxAttempts = MAX_ATTEMPTS,
  backoffMs = BACKOFF_BASE_MS,
  sleepFn = sleep,
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchFn(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) return res;
      // Retryable status: free the connection before backing off.
      if (res.body) await res.body.cancel().catch(() => {});
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts) throw e;
    }
    await sleepFn(backoffMs * 2 ** (attempt - 1));
  }
  throw lastError; // Unreachable: the loop always returns or throws.
}

/**
 * Verify one URL: HEAD with retry; on 405/403/429 fall back to a
 * lightweight GET with retry (some hosts block HEAD or rate-limit it).
 * Returns the final HTTP status; throws when every attempt failed to
 * reach the host at all. The HEAD-then-GET decision rule is unchanged
 * from before the retry hardening (A-23).
 */
export async function checkUrl(url, opts = {}) {
  let res = await fetchWithRetry(url, { ...opts, method: 'HEAD' });
  if (res.status === 405 || res.status === 403 || res.status === 429) {
    res = await fetchWithRetry(url, { ...opts, method: 'GET' });
    if (res.body) await res.body.cancel().catch(() => {});
  }
  return res.status;
}

/**
 * Verify every unique external URL in `external` (a Map of url ->
 * [referencing files]), applying the example-domain and EXCEPTIONS
 * skips and pausing REQUEST_DELAY_MS between requests. Returns
 * { errors, skipped, fetched }; the error strings keep the historical
 * format. `fetched` counts URLs actually requested (A-24: the summary
 * line must not count skipped URLs as verified).
 */
export async function verifyExternalUrls(external, {
  log = () => {},
  delayMs = REQUEST_DELAY_MS,
  sleepFn = sleep,
  ...fetchOpts
} = {}) {
  const errors = [];
  let skipped = 0;
  let fetched = 0;
  for (const [url, files] of external) {
    if (EXAMPLE_RE.test(url)) { skipped++; continue; }
    const ex = EXCEPTIONS.find(([prefix]) => url.startsWith(prefix));
    if (ex) { log(`  SKIPPED ${url} (${ex[1]})`); skipped++; continue; }
    if (fetched > 0 && delayMs > 0) await sleepFn(delayMs);
    fetched++;
    try {
      const status = await checkUrl(url, fetchOpts);
      if (status >= 400) errors.push(`${url}: HTTP ${status} (referenced from ${files[0]})`);
    } catch (e) {
      errors.push(`${url}: unreachable (${e.cause?.code || e.message}) (referenced from ${files[0]})`);
    }
  }
  return { errors, skipped, fetched };
}

async function main() {
  const errors = [];
  const external = new Map(); // url -> [files]
  let checked = 0;

  for (const file of (await findMd(ROOT)).sort()) {
    // Normalized to POSIX separators so the upstream exclusion
    // (a POSIX prefix) still matches on Windows (Stage D, same
    // class as W-2). No-op on POSIX.
    const rel = toPosixPath(path.relative(ROOT, file));
    if (!INCLUDE_UPSTREAM && rel.startsWith('skills/upstream/')) continue;
    let text;
    try {
      text = await readFile(file, 'utf8');
    } catch (e) {
      // A-38: a file deleted between the directory listing and the
      // read (e.g. a concurrent process cleaning up a report) has no
      // links to check — skip it instead of failing the whole check
      // with exit 2. Any other read error still throws.
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    for (const href of extractLinks(text)) {
      if (href.startsWith('#') || href.startsWith('mailto:')) continue;
      if (/^https?:\/\//.test(href)) {
        if (!external.has(href)) external.set(href, []);
        external.get(href).push(rel);
        continue;
      }
      checked++;
      const target = href.split('#')[0];
      if (!target) continue;
      if (!existsSync(path.resolve(path.dirname(file), target))) {
        errors.push(`${rel}: broken internal link: ${href}`);
      }
    }
  }

  let skipped = 0;
  let fetched = 0;
  if (ONLINE) {
    console.log(`Checking ${external.size} unique external URLs (HEAD requests)...`);
    const result = await verifyExternalUrls(external, { log: (m) => console.log(m) });
    errors.push(...result.errors);
    skipped = result.skipped;
    fetched = result.fetched;
  }

  // A-24: only URLs actually requested count as checked live; skipped
  // URLs (example domains / documented exceptions) are enumerated, not
  // verified by this run. Previous wording counted all of them as
  // "verified".
  console.log(`Checked ${checked} internal links; ${external.size} unique external URLs ${ONLINE ? `(${fetched} checked live, ${skipped} skipped: example domains / documented exceptions)` : 'listed (use --online to verify)'}.`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  console.log(errors.length ? `FAIL: ${errors.length} error(s).` : 'PASS.');
  process.exit(errors.length ? 1 : 0);
}

// Only run when invoked as a script: unit tests import the helpers
// from this module and must not trigger a full link check.
const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`Link check failed: ${e.message}`);
    process.exit(2);
  });
}
