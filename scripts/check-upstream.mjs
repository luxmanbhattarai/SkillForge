// Upstream source update monitoring.
//
// Compares each upstream vendor repo's latest default-branch commit
// (via the public GitHub API) against the pin recorded in
// sources/imported-skills.md and reports drift.
//
// Monitoring, not gating: this script exits 0 even when upstreams have
// moved — drift is information for the next re-import cycle (see
// docs/UPDATE-PROCESS.md), not a failure. It exits 1 when the pins
// file itself cannot be read or yields no vendors — and when any
// vendor comes back UNKNOWN (D1): an UNKNOWN vendor means the
// monitoring itself failed (network outage, deleted or renamed repo),
// and a total monitoring failure used to exit 0, so a green
// scheduled-maintenance run could mean "nothing checked" rather
// than "nothing drifted". Drift (BEHIND/AHEAD/DIVERGED) stays
// informational; only the inability to check is a failure.
//
// Works without secrets: unauthenticated GitHub API calls (60/hour;
// this script makes at most 3 per vendor, 18 total for the current 6
// vendors, plus 3 more per vendor with a live-upstream reference).
// If GITHUB_TOKEN is set (e.g. the default token in CI), it is used
// for the higher rate limit.
//
// Live upstream (S-14): the agentic-seo import pins a dormant fork
// (pwg-projects/agentic-seo-skill, no pushes since 2026-03-03) while
// the author's repo (Bhanunamikaze/Agentic-SEO-Skill) keeps moving,
// so a fork-only check reported agentic-seo UP-TO-DATE while live
// upstream was 50 commits ahead. A vendor section may therefore
// carry a `Live upstream:` line naming the author's repo; this
// script compares the same pin against the live repo's HEAD too
// and reports the drift (monitoring-only, like everything here).
// The live comparison never changes the vendor's primary status —
// the import still comes from the pinned repo until a re-import
// decision re-points it.
//
// Usage: node scripts/check-upstream.mjs

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PINS_FILE = join(ROOT, 'sources', 'imported-skills.md');
const API = 'https://api.github.com';
// A2-10: the GitHub API call used to have no timeout and no retry,
// so a hung call hung the script (and the scheduled workflow)
// indefinitely and a transient 429 marked a vendor UNKNOWN.
export const UPSTREAM_TIMEOUT_MS = 15000;
export const UPSTREAM_RETRY_DELAY_MS = 1000;

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'skillforge-check-upstream',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse vendor entries out of sources/imported-skills.md. Each vendor
// section looks like:
//
//   ### Anthropic — 8 skills (Apache-2.0)
//   Source: https://github.com/anthropics/skills ·
//   Commit `e4bb5d96...` · Imported 2026-11-20
//
// A section may also carry a live-upstream reference (S-14):
//
//   Live upstream: https://github.com/author/repo
//
// Exported for testing (A2-22).
export function parsePins(text) {
  const vendors = [];
  let current = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^###\s+(.+?)\s+—/);
    if (heading) {
      current = { vendor: heading[1].trim(), repo: null, pinned: null, liveUpstream: null };
      vendors.push(current);
      continue;
    }
    if (!current) continue;
    const source = line.match(/^Source:\s*https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (source) current.repo = source[1];
    const commit = line.match(/^Commit\s+`([0-9a-f]{40})`/);
    if (commit) current.pinned = commit[1];
    const live = line.match(/^Live upstream:\s*https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (live) current.liveUpstream = live[1];
  }
  return vendors.filter((v) => v.repo && v.pinned);
}

// One GitHub API call: 15s timeout (AbortSignal.timeout) and one
// retry on 429/5xx responses and on network/timeout errors (A2-10),
// mirroring check-links.mjs. `opts` is injectable so tests can use
// small timeouts and delays against a stub fetch.
export async function api(path, { fetchFn = fetch, timeoutMs = UPSTREAM_TIMEOUT_MS, retryDelayMs = UPSTREAM_RETRY_DELAY_MS } = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchFn(`${API}${path}`, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res.json();
      const remaining = res.headers?.get?.('x-ratelimit-remaining') ?? null;
      const err = new Error(
        `GitHub API ${path} → HTTP ${res.status}` +
          (remaining !== null ? ` (rate-limit remaining: ${remaining})` : ''),
      );
      err.status = res.status;
      // One retry on 429/5xx; other statuses fail immediately.
      if ((res.status === 429 || res.status >= 500) && attempt === 0) {
        lastError = err;
        await sleep(retryDelayMs);
        continue;
      }
      throw err;
    } catch (e) {
      // A thrown error is a network failure or a timeout (or the
      // non-retryable throw above, re-caught): retry once only
      // when it has no HTTP status attached — a status-bearing
      // error already made its retry decision.
      if (e.status === undefined && attempt === 0) {
        lastError = e;
        await sleep(retryDelayMs);
        continue;
      }
      throw e;
    }
  }
  throw lastError; // Unreachable: the loop always returns or throws.
}

// Compare one pinned commit against one repo's default-branch HEAD.
// Returns { status, detail, head, headDate, branch } where status is
// UP-TO-DATE, BEHIND, AHEAD, or DIVERGED. Shared by the primary
// (pinned-repo) check and the live-upstream check (S-14).
async function comparePin(repo, pinned, opts) {
  const repoInfo = await api(`/repos/${repo}`, opts);
  const branch = repoInfo.default_branch;
  const head = await api(`/repos/${repo}/commits/${branch}`, opts);
  const headDate = head.commit?.committer?.date?.slice(0, 10) ?? '?';
  if (head.sha === pinned) {
    return { status: 'UP-TO-DATE', detail: `pinned commit is the ${branch} head`, head: head.sha, headDate, branch };
  }
  const cmp = await api(`/repos/${repo}/compare/${pinned}...${head.sha}`, opts);
  // Compare semantics (base = pinned, head = upstream head):
  // "ahead" means the HEAD is ahead of the base, i.e. the pin is
  // BEHIND upstream; "behind" means the head is behind the base,
  // i.e. the pin is AHEAD of upstream.
  if (cmp.status === 'ahead') {
    return { status: 'BEHIND', detail: `${cmp.ahead_by} commit(s) behind ${branch} head (${headDate})`, head: head.sha, headDate, branch };
  }
  if (cmp.status === 'behind') {
    return { status: 'AHEAD', detail: `pinned commit is ${cmp.behind_by} commit(s) ahead of ${branch} head — upstream may have rewritten history`, head: head.sha, headDate, branch };
  }
  return { status: 'DIVERGED', detail: `pinned commit and ${branch} head have diverged (${cmp.ahead_by} ahead, ${cmp.behind_by} behind)`, head: head.sha, headDate, branch };
}

// Check one vendor: the pinned repo first, then — when the vendor
// section names a live upstream (S-14) — the same pin against the
// live repo's HEAD. The live result is reported alongside, never
// folded into the primary status. Exported for testing (a stub
// fetchFn makes the live-compare path testable with no network).
export async function checkVendor(vendor, opts = {}) {
  const result = { ...vendor, status: 'UNKNOWN', detail: '' };
  try {
    const primary = await comparePin(vendor.repo, vendor.pinned, opts);
    result.status = primary.status;
    result.detail = primary.detail;
    result.head = primary.head;
    result.headDate = primary.headDate;
  } catch (e) {
    result.detail = e.message;
  }
  if (vendor.liveUpstream) {
    try {
      const live = await comparePin(vendor.liveUpstream, vendor.pinned, opts);
      result.live = { repo: vendor.liveUpstream, ...live };
    } catch (e) {
      result.live = { repo: vendor.liveUpstream, status: 'UNKNOWN', detail: e.message };
    }
  }
  return result;
}

// Run the upstream check end to end and return the process exit
// code (0 = every vendor checked, 1 = pins unreadable or any vendor
// UNKNOWN). Exported for testing (D1): `opts.fetchFn` stubs the
// GitHub API, `opts.pinsText` stubs the pins file, and `log`/`error`
// capture output — so the exit-code behavior is testable with no
// network. Defaults are the real fetch, the real pins file, and the
// console.
export async function runCheck({
  fetchFn = fetch,
  retryDelayMs = UPSTREAM_RETRY_DELAY_MS,
  pinsText = null,
  log = console.log,
  error = console.error,
} = {}) {
  let text = pinsText;
  if (text === null) {
    try {
      text = readFileSync(PINS_FILE, 'utf8');
    } catch (e) {
      error(`Cannot read pins file ${PINS_FILE}: ${e.message}`);
      return 1;
    }
  }
  const vendors = parsePins(text);
  if (vendors.length === 0) {
    error(`No vendor pins found in ${PINS_FILE} — has the format changed?`);
    return 1;
  }

  log(`Upstream check: ${vendors.length} vendor repos pinned in sources/imported-skills.md\n`);
  const results = [];
  for (const vendor of vendors) {
    results.push(await checkVendor(vendor, { fetchFn, retryDelayMs }));
  }

  const counts = { 'UP-TO-DATE': 0, BEHIND: 0, AHEAD: 0, DIVERGED: 0, UNKNOWN: 0 };
  let liveDrift = 0;
  let liveUnknown = 0;
  for (const r of results) {
    counts[r.status]++;
    log(`- ${r.vendor} (${r.repo})`);
    log(`  pinned: ${r.pinned.slice(0, 12)}${r.head ? `  head: ${r.head.slice(0, 12)} (${r.headDate})` : ''}`);
    log(`  ${r.status}: ${r.detail}`);
    if (r.live) {
      const liveHead = r.live.head ? `  head: ${r.live.head.slice(0, 12)} (${r.live.headDate})` : '';
      log(`  live upstream (${r.live.repo}):${liveHead}`);
      log(`  ${r.live.status}: ${r.live.detail}`);
      if (r.live.status === 'UNKNOWN') liveUnknown++;
      if (r.live.status === 'BEHIND' || r.live.status === 'AHEAD' || r.live.status === 'DIVERGED') liveDrift++;
    }
  }

  log(
    `\nSummary: ${counts['UP-TO-DATE']} up-to-date, ${counts.BEHIND} behind, ` +
      `${counts.AHEAD} ahead, ${counts.DIVERGED} diverged, ${counts.UNKNOWN} unknown.`,
  );
  if (liveDrift > 0) {
    log(
      `Live-upstream drift: ${liveDrift} pinned import(s) trail their author's live repo ` +
        '(S-14) — the fork pin is still the import source until a re-import decision re-points it.',
    );
  }
  if (counts.BEHIND + counts.AHEAD + counts.DIVERGED > 0) {
    log(
      'Drift is informational: re-import per docs/UPDATE-PROCESS.md when a new ' +
        'upstream commit is worth taking; do not edit imported skills in place.',
    );
  }
  // D1: drift is informational, but an UNKNOWN vendor means the
  // monitoring itself failed — the run must not report success
  // when it could not check a vendor. A live-upstream UNKNOWN
  // counts too: the S-14 drift signal is blind when the live
  // compare cannot run, so it fails the same way.
  if (counts.UNKNOWN > 0 || liveUnknown > 0) {
    const parts = [];
    if (counts.UNKNOWN > 0) parts.push(`${counts.UNKNOWN} vendor(s) UNKNOWN`);
    if (liveUnknown > 0) parts.push(`${liveUnknown} live-upstream check(s) UNKNOWN`);
    error(
      `Upstream check incomplete: ${parts.join(', ')} — the check could not reach GitHub or the repo ` +
        '(see details above). Drift is informational, but a monitoring failure is not: this run exits non-zero.',
    );
    return 1;
  }
  return 0;
}

async function main() {
  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout. Natural exit flushes it first (see validate-registry.mjs).
  process.exitCode = await runCheck();
}

// Main guard (same idiom as check-links.mjs): importing this module
// for parsePins/checkVendor must not trigger a live GitHub check.
const invokedAsScript = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
