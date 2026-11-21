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
// Redirects are followed manually with an SSRF guard (A5-06): a link
// redirecting to localhost, a loopback/private/link-local IP, or a
// non-http(s) scheme is refused, never fetched. The guard applies
// to redirect TARGETS only, not to the initial URL (tests and local
// tooling legitimately fetch http://127.0.0.1 stubs). DNS rebinding
// — a public hostname resolving to a private IP — is out of scope:
// Node's fetch resolves the hostname after this check, and closing
// that hole would need a custom lookup. Only the HTTP status is ever
// recorded, bodies are cancelled, and no credentials are sent, so a
// redirect can at most probe — never exfiltrate.
// The online path retries 403/429 responses and network errors with
// exponential backoff, and waits briefly between requests, so transient
// rate-limiting (e.g. the cursor.com 403 seen in the v1.0.0 run) does
// not fail the check. What counts as broken/verified/skipped is
// unchanged: only the fetching is more patient.
// Usage: node scripts/check-links.mjs [--online] [--include-upstream]

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { isIP } from 'node:net';
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
export const MAX_REDIRECTS = 5; // follows per fetch before giving up
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

// --- Redirect-target SSRF guard (A5-06) ------------------------------
// A redirect target is unsafe when its scheme is not http(s), its
// hostname is localhost, or its hostname is an IP literal in a
// loopback, private, or link-local range (IPv4 or IPv6, including
// IPv4-mapped IPv6 like ::ffff:127.0.0.1). Returns a human-readable
// reason, or null when the target is safe to fetch.

function parseIpv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const octets = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function isUnsafeIpv4([a, b]) {
  if (a === 0) return true; // 0.0.0.0/8 ("this network")
  if (a === 10) return true; // 10.0.0.0/8 (private)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (private)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (private)
  return false;
}

// Parse an IPv6 literal into 8 16-bit groups, or null when invalid.
// Handles '::' compression and an embedded IPv4 tail (::ffff:1.2.3.4).
function parseIpv6(host) {
  const halves = host.split('::');
  if (halves.length > 2) return null;
  const parseSide = (side) => {
    if (side === '') return [];
    const out = [];
    for (const seg of side.split(':')) {
      if (seg.includes('.')) {
        const v4 = parseIpv4(seg);
        if (!v4) return null;
        out.push(((v4[0] << 8) | v4[1]) >>> 0, ((v4[2] << 8) | v4[3]) >>> 0);
      } else {
        if (!/^[0-9a-fA-F]{1,4}$/.test(seg)) return null;
        out.push(parseInt(seg, 16));
      }
    }
    return out;
  };
  const left = parseSide(halves[0]);
  if (left === null) return null;
  if (halves.length === 1) return left.length === 8 ? left : null;
  const right = parseSide(halves[1]);
  if (right === null) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null; // '::' must compress at least one group
  return [...left, ...new Array(missing).fill(0), ...right];
}

function isUnsafeIpv6(groups) {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  // IPv4-mapped (::ffff:a.b.c.d): judge the embedded IPv4 address.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isUnsafeIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]);
  }
  if (groups.every((g) => g === 0)) return true; // :: (unspecified)
  if (g7 === 1 && groups.slice(0, 7).every((g) => g === 0)) return true; // ::1 (loopback)
  if (g0 >= 0xfe80 && g0 <= 0xfebf) return true; // fe80::/10 (link-local)
  if (g0 >= 0xfc00 && g0 <= 0xfdff) return true; // fc00::/7 (unique-local)
  return false;
}

/**
 * Why the redirect target `target` (a URL or URL string) must not
 * be fetched, or null when it is safe. Exported for testing.
 */
export function unsafeRedirectReason(target) {
  let url;
  try {
    url = target instanceof URL ? target : new URL(target);
  } catch {
    return 'not a valid URL';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `protocol '${url.protocol}' is not http(s)`;
  }
  // WHATWG URL keeps the brackets in hostname for IPv6 literals
  // ('[::1]'), and net.isIP does not accept brackets — strip them.
  const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[(.*)\]$/, '$1');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return `hostname '${host}' is localhost`;
  }
  const kind = isIP(host);
  if (kind === 4) {
    const octets = parseIpv4(host);
    if (octets && isUnsafeIpv4(octets)) return `IP literal '${host}' is loopback, private, or link-local`;
  } else if (kind === 6) {
    const groups = parseIpv6(host);
    if (groups && isUnsafeIpv6(groups)) return `IP literal '${host}' is loopback, private, or link-local`;
  }
  return null;
}

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

// Fetch one URL following redirects manually (fetch's
// redirect: 'follow' would fetch any Location unguarded). Each
// redirect target passes unsafeRedirectReason; an unsafe target,
// an invalid Location, or too many hops throws an Error with
// `noRetry: true`, so fetchWithRetry does not retry it. The
// request method is kept across redirects (only HEAD/GET are used
// here, so the 303 POST→GET rule never applies).
async function fetchWithRedirects(url, { method, fetchFn, timeoutMs }) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchFn(current, {
      method,
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!REDIRECT_STATUS.has(res.status)) return res;
    const location = res.headers?.get?.('location');
    if (!location) return res;
    let next;
    try {
      next = new URL(location, current);
    } catch {
      const err = new Error(`redirect to invalid URL ${JSON.stringify(location)} from ${current}`);
      err.noRetry = true;
      throw err;
    }
    const problem = unsafeRedirectReason(next);
    if (problem) {
      const err = new Error(`refusing redirect from ${current} to ${next.href}: ${problem}`);
      err.code = 'UNSAFE_REDIRECT';
      err.noRetry = true;
      throw err;
    }
    if (hop === MAX_REDIRECTS) {
      const err = new Error(`too many redirects (>${MAX_REDIRECTS}) starting at ${url}`);
      err.noRetry = true;
      throw err;
    }
    if (res.body) await res.body.cancel().catch(() => {});
    current = next.href;
  }
  throw new Error('unreachable: redirect loop always returns or throws');
}

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
 * Redirects are followed manually with the A5-06 SSRF guard (see
 * fetchWithRedirects); a refused redirect throws immediately and is
 * never retried.
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
      const res = await fetchWithRedirects(url, { method, fetchFn, timeoutMs });
      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) return res;
      // Retryable status: free the connection before backing off.
      if (res.body) await res.body.cancel().catch(() => {});
    } catch (e) {
      // Guard errors (unsafe redirect, invalid Location, too many
      // redirects) are deterministic — retrying cannot help.
      if (e && e.noRetry) throw e;
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
  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout. Natural exit flushes it first (see validate-registry.mjs).
  process.exitCode = errors.length ? 1 : 0;
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
