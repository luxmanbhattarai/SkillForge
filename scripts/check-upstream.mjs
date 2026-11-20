// Upstream source update monitoring.
//
// Compares each upstream vendor repo's latest default-branch commit
// (via the public GitHub API) against the pin recorded in
// sources/imported-skills.md and reports drift.
//
// Monitoring, not gating: this script exits 0 even when upstreams have
// moved — drift is information for the next re-import cycle (see
// docs/UPDATE-PROCESS.md), not a failure. It exits 1 only when the pins
// file itself cannot be read or yields no vendors.
//
// Works without secrets: unauthenticated GitHub API calls (60/hour;
// this script makes at most 3 per vendor, 18 total for the current 6
// vendors). If GITHUB_TOKEN is set (e.g. the default token in CI), it
// is used for the higher rate limit.
//
// Usage: node scripts/check-upstream.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PINS_FILE = join(ROOT, 'sources', 'imported-skills.md');
const API = 'https://api.github.com';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'skillforge-check-upstream',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

// Parse vendor entries out of sources/imported-skills.md. Each vendor
// section looks like:
//
//   ### Anthropic — 8 skills (Apache-2.0)
//   Source: https://github.com/anthropics/skills ·
//   Commit `e4bb5d96...` · Imported 2026-11-20
function parsePins(text) {
  const vendors = [];
  let current = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^###\s+(.+?)\s+—/);
    if (heading) {
      current = { vendor: heading[1].trim(), repo: null, pinned: null };
      vendors.push(current);
      continue;
    }
    if (!current) continue;
    const source = line.match(/^Source:\s*https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (source) current.repo = source[1];
    const commit = line.match(/^Commit\s+`([0-9a-f]{40})`/);
    if (commit) current.pinned = commit[1];
  }
  return vendors.filter((v) => v.repo && v.pinned);
}

async function api(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new Error(
      `GitHub API ${path} → HTTP ${res.status}` +
        (remaining !== null ? ` (rate-limit remaining: ${remaining})` : ''),
    );
  }
  return res.json();
}

async function checkVendor(vendor) {
  const result = { ...vendor, status: 'UNKNOWN', detail: '' };
  try {
    const repo = await api(`/repos/${vendor.repo}`);
    const branch = repo.default_branch;
    const head = await api(`/repos/${vendor.repo}/commits/${branch}`);
    result.head = head.sha;
    result.headDate = head.commit?.committer?.date?.slice(0, 10) ?? '?';
    if (head.sha === vendor.pinned) {
      result.status = 'UP-TO-DATE';
      result.detail = `pinned commit is the ${branch} head`;
      return result;
    }
    const cmp = await api(`/repos/${vendor.repo}/compare/${vendor.pinned}...${head.sha}`);
    // Compare semantics (base = pinned, head = upstream head):
    // "ahead" means the HEAD is ahead of the base, i.e. the pin is
    // BEHIND upstream; "behind" means the head is behind the base,
    // i.e. the pin is AHEAD of upstream.
    if (cmp.status === 'ahead') {
      result.status = 'BEHIND';
      result.detail = `${cmp.ahead_by} commit(s) behind ${branch} head (${result.headDate})`;
    } else if (cmp.status === 'behind') {
      result.status = 'AHEAD';
      result.detail = `pinned commit is ${cmp.behind_by} commit(s) ahead of ${branch} head — upstream may have rewritten history`;
    } else {
      result.status = 'DIVERGED';
      result.detail = `pinned commit and ${branch} head have diverged (${cmp.ahead_by} ahead, ${cmp.behind_by} behind)`;
    }
  } catch (e) {
    result.detail = e.message;
  }
  return result;
}

let text;
try {
  text = readFileSync(PINS_FILE, 'utf8');
} catch (e) {
  console.error(`Cannot read pins file ${PINS_FILE}: ${e.message}`);
  process.exit(1);
}
const vendors = parsePins(text);
if (vendors.length === 0) {
  console.error(`No vendor pins found in ${PINS_FILE} — has the format changed?`);
  process.exit(1);
}

console.log(`Upstream check: ${vendors.length} vendor repos pinned in sources/imported-skills.md\n`);
const results = [];
for (const vendor of vendors) {
  results.push(await checkVendor(vendor));
}

const counts = { 'UP-TO-DATE': 0, BEHIND: 0, AHEAD: 0, DIVERGED: 0, UNKNOWN: 0 };
for (const r of results) {
  counts[r.status]++;
  console.log(`- ${r.vendor} (${r.repo})`);
  console.log(`  pinned: ${r.pinned.slice(0, 12)}${r.head ? `  head: ${r.head.slice(0, 12)} (${r.headDate})` : ''}`);
  console.log(`  ${r.status}: ${r.detail}`);
}

console.log(
  `\nSummary: ${counts['UP-TO-DATE']} up-to-date, ${counts.BEHIND} behind, ` +
    `${counts.AHEAD} ahead, ${counts.DIVERGED} diverged, ${counts.UNKNOWN} unknown.`,
);
if (counts.BEHIND + counts.AHEAD + counts.DIVERGED > 0) {
  console.log(
    'Drift is informational: re-import per docs/UPDATE-PROCESS.md when a new ' +
      'upstream commit is worth taking; do not edit imported skills in place.',
  );
}
// Monitoring, not gating: exit 0 even when upstreams have moved.
process.exit(0);
