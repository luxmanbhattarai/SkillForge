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
// Change detection (Phase 15): when a vendor has drifted, the
// compare payload GitHub already returns is analyzed — no extra API
// calls — to produce a review queue: new commits, which changed
// files affect imported skills (diff paths matched against the
// imported skill names from the pins file), deleted or renamed
// files, a human change summary, and security-sensitive flags (see
// SECURITY_RULES below). The output is a review queue, never an
// auto-merge: nothing here applies upstream changes; see
// ai/maintenance/UPSTREAM-CHANGE-MONITORING.md for the manual
// review and re-import process.
//
// Machine-readable output: --json prints the full report (vendors,
// detection, notifications, summary) as JSON on stdout and nothing
// else; --out <file> writes the same JSON to a file and prints the
// human summary as usual.
//
// Duplicate-notification prevention: a state file (default
// ai/maintenance/upstream-state.json) records the upstream HEAD each
// vendor was last notified at. A vendor whose HEAD matches the
// recorded one is reported as already notified and suppressed from
// the notification list; a new HEAD produces a new notification.
// --record-state writes the current HEADs into the state file
// (run it after reviewing a notification, not before). --no-state
// disables the dedup entirely. The state file is advisory: a
// missing or unreadable file means "nothing recorded yet", never a
// failure.
//
// Usage: node scripts/check-upstream.mjs [--json] [--out <file>]
//          [--state <file>] [--no-state] [--record-state]

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWriteFile } from './lib/atomic-write.mjs';
import { PATTERNS } from './lib/security-patterns.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PINS_FILE = join(ROOT, 'sources', 'imported-skills.md');
const DEFAULT_STATE_FILE = join(ROOT, 'ai', 'maintenance', 'upstream-state.json');
const API = 'https://api.github.com';
// A2-10: the GitHub API call used to have no timeout and no retry,
// so a hung call hung the script (and the scheduled workflow)
// indefinitely and a transient 429 marked a vendor UNKNOWN.
export const UPSTREAM_TIMEOUT_MS = 15000;
export const UPSTREAM_RETRY_DELAY_MS = 1000;
// The compare API returns at most 300 files and 250 commits; the
// report lists at most this many commits in full (the counts always
// cover everything the API returned).
export const MAX_LISTED_COMMITS = 20;

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
//   `brand-guidelines`, `doc-coauthoring`, ...
//
// A section may also carry a live-upstream reference (S-14):
//
//   Live upstream: https://github.com/author/repo
//
// The skill names come from the backtick-quoted lists in the section
// (lines that start with a backtick, tokens matching a skill-name
// shape). They drive change detection: a changed upstream path
// affects an import when one of its path segments is an imported
// skill name. Exported for testing (A2-22).
export function parsePins(text) {
  const vendors = [];
  let current = null;
  // Skill-name collection state per section. The skill list is the
  // contiguous block of backtick-list lines after the Commit line
  // (possibly after a Live upstream line); it ends at the first
  // blank line or non-list line. Later prose in the section also
  // quotes names in backticks (unimported siblings, tool files) and
  // must NOT be collected — those skills are not imported.
  let collecting = false;
  let listDone = false;
  for (const line of text.split('\n')) {
    const heading = line.match(/^###\s+(.+?)\s+—/);
    if (heading) {
      current = { vendor: heading[1].trim(), repo: null, pinned: null, liveUpstream: null, skills: [] };
      vendors.push(current);
      collecting = false;
      listDone = false;
      continue;
    }
    if (!current) continue;
    const source = line.match(/^Source:\s*https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (source) current.repo = source[1];
    const commit = line.match(/^Commit\s+`([0-9a-f]{40})`/);
    if (commit) current.pinned = commit[1];
    const live = line.match(/^Live upstream:\s*https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/);
    if (live) current.liveUpstream = live[1];
    // Skill-name lists are lines of bare `name` tokens separated by
    // commas — and nothing else, except a parenthetical note after
    // a single name (the agentic-seo "`seo` (includes ...)" line).
    // A line with other prose ("`x` → original `y`", "`x`
    // excluded for ...") is not a list line.
    if (!listDone && line.startsWith('`')) {
      const remainder = line.replace(/`[a-z0-9][a-z0-9-]*`/g, '').replace(/[, ]/g, '');
      if (remainder === '' || remainder.startsWith('(')) {
        collecting = true;
        for (const [, name] of line.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)) {
          if (!current.skills.includes(name)) current.skills.push(name);
        }
        continue;
      }
    }
    if (collecting) listDone = true;
  }
  return vendors.filter((v) => v.repo && v.pinned);
}

// Imported paths that are NOT skill directories, keyed by vendor
// name as it appears in the pins file. Sourced from the vendor
// ATTRIBUTION.md files (see sources/imported-skills.md):
//
// - Marketing Skills: the 11 tool files the `link-building` skill
//   links to are imported verbatim at skills/upstream/tools/ from
//   upstream `tools/`. A change to one of them affects
//   `link-building`.
// - Agentic SEO: a single-skill repo — the whole repository is the
//   `seo` skill (skill content at the repo root, not under a `seo/`
//   directory), so any changed path affects the import.
export const VENDOR_EXTRA_PATHS = {
  'Marketing Skills': {
    extraImportedPaths: [
      ...['ahrefs', 'semrush', 'dataforseo', 'exa', 'firecrawl', 'hunter']
        .map((t) => ({ path: `tools/integrations/${t}.md`, skill: 'link-building' })),
      ...['semrush', 'dataforseo', 'exa', 'firecrawl', 'hunter']
        .map((t) => ({ path: `tools/clis/${t}.js`, skill: 'link-building' })),
    ],
  },
  'Agentic SEO': { wholeRepoIsSkill: true },
};

// Security-sensitive change heuristic. Two sources, applied to the
// ADDED lines of each changed file's patch (removed lines cannot
// introduce new behavior; the patch may be absent for binary or
// large files, in which case only path-based rules apply):
//
// 1. The repository's own scanner patterns
//    (scripts/lib/security-patterns.mjs), reused rather than
//    duplicated — a subset whose meaning survives the move from
//    "scan this repo" to "scan an upstream diff".
// 2. Path/patch rules defined here for install scripts, new
//    executables, credential handling, and new URLs.
//
// Each rule has a severity. `high`/`medium` count as security flags
// in the summary; `info` (a new URL in added lines) is reported but
// does not count — documentation diffs add URLs constantly, so
// counting them would drown the signal. Every flag is a heuristic:
// it means "a human should read this diff", not "this change is
// malicious".
export const SECURITY_RULES = [
  // Reused scanner patterns (matched against added patch lines).
  { id: 'shell-pipe', severity: 'high', label: 'download piped to a shell', scannerId: 'CMD-01' },
  { id: 'dynamic-code', severity: 'high', label: 'dynamic code execution (eval)', scannerId: 'CODE-01' },
  { id: 'command-exec', severity: 'high', label: 'shell execution (exec/spawn/os.system)', scannerId: 'CODE-07' },
  { id: 'command-exec-py', severity: 'high', label: 'shell execution (os.system/os.popen)', scannerId: 'CODE-08' },
  { id: 'hardcoded-secret', severity: 'high', label: 'possible hardcoded secret', scannerId: 'SEC-02' },
  { id: 'hardcoded-credential', severity: 'high', label: 'possible hardcoded credential', scannerId: 'SEC-05' },
  { id: 'tls-disabled', severity: 'high', label: 'TLS verification disabled', scannerId: 'CODE-14' },
  // Path rules (matched against the changed file's path).
  { id: 'install-script', severity: 'medium', label: 'install/setup script changed', pathRe: /(^|\/)(install|setup|postinstall|preinstall)\.(sh|js|mjs|cjs|py|rb|pl)$/i },
  { id: 'executable-added', severity: 'medium', label: 'new executable script added', pathRe: /\.(sh|bash|py|pl|rb)$/i, addedOnly: true },
  // Patch rules (matched against added patch lines).
  { id: 'install-hook', severity: 'medium', label: 'install hook (postinstall/preinstall) in package.json', patchRe: /"(postinstall|preinstall)"\s*:/, fileRe: /(^|\/)package\.json$/ },
  { id: 'credential-handling', severity: 'medium', label: 'credential handling (key/token/secret identifiers)', patchRe: /\b(api[_-]?key|access[_-]?token|client[_-]?secret|private[_-]?key)\b/i },
  { id: 'url-added', severity: 'info', label: 'new URL in added lines', patchRe: /https?:\/\// },
];

const SCANNER_PATTERNS = new Map(PATTERNS.map((p) => [p.id, p]));

// Added lines of a unified diff patch: lines starting with '+',
// excluding the '+++' file header.
function addedLines(patch) {
  if (typeof patch !== 'string') return [];
  return patch.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
}

// Security flags for one changed file: [{ id, severity, label }].
// A scanner pattern matches when its regex matches an added line
// and its guard (if any) does not clear the match — the same
// semantics as scripts/security-scan.mjs.
export function scanFileForSecurity(file) {
  const flags = [];
  const lines = addedLines(file.patch);
  const path = file.filename || '';
  for (const rule of SECURITY_RULES) {
    if (rule.pathRe) {
      if (rule.addedOnly && file.status !== 'added') continue;
      if (rule.pathRe.test(path)) flags.push({ id: rule.id, severity: rule.severity, label: rule.label });
      continue;
    }
    if (rule.fileRe && !rule.fileRe.test(path)) continue;
    if (rule.scannerId) {
      const pattern = SCANNER_PATTERNS.get(rule.scannerId);
      if (!pattern) continue;
      const hit = lines.some((line) => {
        const m = line.match(pattern.re);
        return m && (!pattern.guard || pattern.guard(m, line));
      });
      if (hit) flags.push({ id: rule.id, severity: rule.severity, label: rule.label });
      continue;
    }
    if (rule.patchRe && lines.some((line) => rule.patchRe.test(line))) {
      flags.push({ id: rule.id, severity: rule.severity, label: rule.label });
    }
  }
  return flags;
}

// Which imported skills (if any) a changed upstream path affects.
// A path affects a skill when one of its path segments is the skill
// name (upstream layouts vary — skills/<name>/, <name>/, docs for
// <name> — but the skill directory name is stable), when it is one
// of the vendor's extra imported paths, or — for a single-skill
// repo — when any path changes at all. Returns skill names.
export function affectedSkillsForPath(path, vendor) {
  const skills = vendor.skills || [];
  const found = new Set();
  const segments = String(path || '').split('/');
  for (const skill of skills) {
    if (segments.includes(skill)) found.add(skill);
  }
  const extra = VENDOR_EXTRA_PATHS[vendor.vendor];
  if (extra?.wholeRepoIsSkill) {
    for (const skill of skills) found.add(skill);
  }
  if (extra?.extraImportedPaths) {
    for (const entry of extra.extraImportedPaths) {
      if (entry.path === path) found.add(entry.skill);
    }
  }
  return [...found];
}

// Analyze a GitHub compare payload into a change-detection report.
// Pure function — no network — exported for testing. `vendor` is a
// parsePins entry (skills may be absent for hand-built fixtures).
// `compare` is the /compare response, or null when the compare was
// never fetched (UP-TO-DATE vendors). Missing files/commits arrays
// (a stubbed or truncated payload) mean "detail unavailable", not a
// crash.
export function analyzeChanges(vendor, compare) {
  const empty = {
    newCommits: [], newCommitCount: 0, filesChanged: 0,
    files: [], affectedSkills: [], deletedFiles: [], renamedFiles: [],
    securityFlags: [], securityFlagCount: 0, affectsImports: false,
    detailAvailable: false, summary: '',
  };
  if (!compare) return empty;
  const commits = Array.isArray(compare.commits) ? compare.commits : [];
  const files = Array.isArray(compare.files) ? compare.files : [];
  const detailAvailable = Array.isArray(compare.commits) || Array.isArray(compare.files);
  const newCommits = commits.slice(0, MAX_LISTED_COMMITS).map((c) => ({
    sha: c.sha,
    message: (c.commit?.message || '').split('\n')[0],
    date: c.commit?.committer?.date?.slice(0, 10) || c.commit?.author?.date?.slice(0, 10) || null,
    author: c.commit?.author?.name || c.author?.login || null,
  }));
  const analyzedFiles = [];
  const affectedSkills = new Set();
  const deletedFiles = [];
  const renamedFiles = [];
  const securityFlags = [];
  for (const file of files) {
    const affected = new Set([
      ...affectedSkillsForPath(file.filename, vendor),
      // A rename affects the skill under its old name too: the
      // import still lives at the old path until re-imported.
      ...(file.previous_filename ? affectedSkillsForPath(file.previous_filename, vendor) : []),
    ]);
    for (const s of affected) affectedSkills.add(s);
    if (file.status === 'removed') deletedFiles.push(file.filename);
    if (file.status === 'renamed') {
      renamedFiles.push({ from: file.previous_filename || null, to: file.filename });
    }
    const flags = scanFileForSecurity(file);
    if (flags.length > 0) securityFlags.push({ file: file.filename, flags });
    analyzedFiles.push({
      path: file.filename,
      status: file.status,
      previousFilename: file.previous_filename || null,
      additions: file.additions ?? null,
      deletions: file.deletions ?? null,
      patchAvailable: typeof file.patch === 'string',
      affectsImports: affected.size > 0,
      affectedSkills: [...affected].sort(),
      securityFlags: flags,
    });
  }
  const securityFlagCount = securityFlags.reduce(
    (n, f) => n + f.flags.filter((r) => r.severity !== 'info').length, 0,
  );
  const totalCommits = compare.total_commits ?? commits.length;
  const parts = [`${totalCommits} new commit(s)`, `${files.length} file(s) changed`];
  if (affectedSkills.size > 0) {
    parts.push(`affects imported skills: ${[...affectedSkills].sort().join(', ')}`);
  } else if (files.length > 0) {
    parts.push('no imported skill affected');
  }
  if (deletedFiles.length > 0) parts.push(`${deletedFiles.length} deleted file(s)`);
  if (renamedFiles.length > 0) parts.push(`${renamedFiles.length} renamed file(s)`);
  if (securityFlagCount > 0) parts.push(`${securityFlagCount} security flag(s)`);
  if (!detailAvailable) parts.push('change detail unavailable (compare payload has no file/commit list)');
  return {
    newCommits,
    newCommitCount: totalCommits,
    filesChanged: files.length,
    files: analyzedFiles,
    affectedSkills: [...affectedSkills].sort(),
    deletedFiles,
    renamedFiles,
    securityFlags,
    securityFlagCount,
    affectsImports: affectedSkills.size > 0,
    detailAvailable,
    summary: parts.join('; '),
  };
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
// Returns { status, detail, head, headDate, branch, compare } where
// status is UP-TO-DATE, BEHIND, AHEAD, or DIVERGED. `compare` is the
// raw compare payload when one was fetched (BEHIND/AHEAD/DIVERGED),
// null when the pin is the head (no compare needed). Shared by the
// primary (pinned-repo) check and the live-upstream check (S-14).
async function comparePin(repo, pinned, opts) {
  const repoInfo = await api(`/repos/${repo}`, opts);
  const branch = repoInfo.default_branch;
  const head = await api(`/repos/${repo}/commits/${branch}`, opts);
  const headDate = head.commit?.committer?.date?.slice(0, 10) ?? '?';
  if (head.sha === pinned) {
    return { status: 'UP-TO-DATE', detail: `pinned commit is the ${branch} head`, head: head.sha, headDate, branch, compare: null };
  }
  const cmp = await api(`/repos/${repo}/compare/${pinned}...${head.sha}`, opts);
  // Compare semantics (base = pinned, head = upstream head):
  // "ahead" means the HEAD is ahead of the base, i.e. the pin is
  // BEHIND upstream; "behind" means the head is behind the base,
  // i.e. the pin is AHEAD of upstream.
  if (cmp.status === 'ahead') {
    return { status: 'BEHIND', detail: `${cmp.ahead_by} commit(s) behind ${branch} head (${headDate})`, head: head.sha, headDate, branch, compare: cmp };
  }
  if (cmp.status === 'behind') {
    return { status: 'AHEAD', detail: `pinned commit is ${cmp.behind_by} commit(s) ahead of ${branch} head — upstream may have rewritten history`, head: head.sha, headDate, branch, compare: cmp };
  }
  return { status: 'DIVERGED', detail: `pinned commit and ${branch} head have diverged (${cmp.ahead_by} ahead, ${cmp.behind_by} behind)`, head: head.sha, headDate, branch, compare: cmp };
}

// Check one vendor: the pinned repo first, then — when the vendor
// section names a live upstream (S-14) — the same pin against the
// live repo's HEAD. The live result is reported alongside, never
// folded into the primary status. When a comparison drifted, the
// compare payload is analyzed into a `detection` report (new
// commits, affected imports, deleted/renamed files, security
// flags); UP-TO-DATE and UNKNOWN results carry detection: null.
// Exported for testing (a stub fetchFn makes the live-compare path
// testable with no network).
export async function checkVendor(vendor, opts = {}) {
  const result = { ...vendor, status: 'UNKNOWN', detail: '', detection: null };
  try {
    const primary = await comparePin(vendor.repo, vendor.pinned, opts);
    result.status = primary.status;
    result.detail = primary.detail;
    result.head = primary.head;
    result.headDate = primary.headDate;
    if (primary.compare) result.detection = analyzeChanges(vendor, primary.compare);
  } catch (e) {
    result.detail = e.message;
  }
  if (vendor.liveUpstream) {
    try {
      const live = await comparePin(vendor.liveUpstream, vendor.pinned, opts);
      result.live = { repo: vendor.liveUpstream, ...live, detection: null };
      if (live.compare) result.live.detection = analyzeChanges(vendor, live.compare);
      delete result.live.compare;
    } catch (e) {
      result.live = { repo: vendor.liveUpstream, status: 'UNKNOWN', detail: e.message, detection: null };
    }
  }
  return result;
}

// --- Notification state (duplicate prevention) -----------------------
//
// The state file records, per repo, the HEAD a notification was
// last sent (or recorded) for. A vendor whose current HEAD matches
// the recorded one was already reported — the run suppresses it
// from the notification list so a weekly scheduled run does not
// re-announce the same upstream state every week. A new HEAD is a
// new notification. The file is advisory: missing or unreadable
// means "nothing recorded yet", never a failure.

export function loadNotificationState(statePath) {
  if (!statePath || !existsSync(statePath)) return { state: { version: 1, vendors: {} }, warning: null };
  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !parsed.vendors || typeof parsed.vendors !== 'object') {
      return { state: { version: 1, vendors: {} }, warning: `state file ${statePath} has an unexpected shape — treating as empty` };
    }
    return { state: parsed, warning: null };
  } catch (e) {
    return { state: { version: 1, vendors: {} }, warning: `cannot read state file ${statePath}: ${e.message} — treating as empty` };
  }
}

export async function saveNotificationState(statePath, state) {
  await atomicWriteFile(statePath, JSON.stringify(state, null, 2) + '\n');
}

const DRIFT_STATUSES = new Set(['BEHIND', 'AHEAD', 'DIVERGED']);

// 'new' | 'duplicate' | 'none': whether this repo's current state
// is a notification the maintainer has not seen yet. Only drift
// notifies; UP-TO-DATE and UNKNOWN never do.
export function notificationStatus(repo, head, status, state) {
  if (!DRIFT_STATUSES.has(status) || !head) return 'none';
  const recorded = state.vendors?.[repo];
  if (recorded && recorded.head === head) return 'duplicate';
  return 'new';
}

// Run the upstream check end to end and return the process exit
// code (0 = every vendor checked, 1 = pins unreadable or any vendor
// UNKNOWN). Exported for testing (D1): `opts.fetchFn` stubs the
// GitHub API, `opts.pinsText` stubs the pins file, and `log`/`error`
// capture output — so the exit-code behavior is testable with no
// network. Defaults are the real fetch, the real pins file, and the
// console.
//
// Options beyond the original: `json` prints the full report as
// JSON on stdout (and nothing else there); `outPath` writes that
// JSON to a file and prints the human summary as usual; `statePath`
// is the notification-state file (default
// ai/maintenance/upstream-state.json; null disables dedup);
// `recordState` writes the current HEADs into the state file after
// the check; `generated` overrides the report timestamp (tests).
export async function runCheck({
  fetchFn = fetch,
  retryDelayMs = UPSTREAM_RETRY_DELAY_MS,
  pinsText = null,
  log = console.log,
  error = console.error,
  json = false,
  outPath = null,
  statePath = DEFAULT_STATE_FILE,
  recordState = false,
  generated = new Date().toISOString(),
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

  const { state, warning: stateWarning } = loadNotificationState(statePath);
  const results = [];
  for (const vendor of vendors) {
    results.push(await checkVendor(vendor, { fetchFn, retryDelayMs }));
  }

  // Notifications: one per drifted repo (primary or live) whose
  // HEAD is new since the last recorded notification. The review
  // queue is the notification list plus every duplicate still
  // awaiting action — suppression only stops re-announcement, it
  // does not close the item.
  const notifications = [];
  let duplicatesSuppressed = 0;
  let reviewQueue = 0;
  let securityFlagTotal = 0;
  const reportVendors = results.map((r) => {
    const entry = {
      vendor: r.vendor,
      repo: r.repo,
      pinned: r.pinned,
      skills: r.skills || [],
      status: r.status,
      detail: r.detail,
      head: r.head || null,
      headDate: r.headDate || null,
      detection: r.detection || null,
      notification: notificationStatus(r.repo, r.head, r.status, state),
      live: null,
    };
    if (r.live) {
      entry.live = {
        repo: r.live.repo,
        status: r.live.status,
        detail: r.live.detail,
        head: r.live.head || null,
        headDate: r.live.headDate || null,
        detection: r.live.detection || null,
        notification: notificationStatus(r.live.repo, r.live.head, r.live.status, state),
      };
    }
    for (const side of [entry, entry.live]) {
      if (!side) continue;
      if (DRIFT_STATUSES.has(side.status)) reviewQueue++;
      if (side.detection) securityFlagTotal += side.detection.securityFlagCount;
      if (side.notification === 'new') {
        notifications.push({
          vendor: entry.vendor,
          repo: side.repo,
          live: side !== entry,
          head: side.head,
          status: side.status,
          summary: side.detection?.summary || side.detail,
          affectedSkills: side.detection?.affectedSkills || [],
          securityFlagCount: side.detection?.securityFlagCount || 0,
        });
      }
      if (side.notification === 'duplicate') duplicatesSuppressed++;
    }
    return entry;
  });

  const counts = { 'UP-TO-DATE': 0, BEHIND: 0, AHEAD: 0, DIVERGED: 0, UNKNOWN: 0 };
  let liveDrift = 0;
  let liveUnknown = 0;
  for (const r of results) {
    counts[r.status]++;
    if (r.live) {
      if (r.live.status === 'UNKNOWN') liveUnknown++;
      if (DRIFT_STATUSES.has(r.live.status)) liveDrift++;
    }
  }

  // D1: drift is informational, but an UNKNOWN vendor means the
  // monitoring itself failed — the run must not report success
  // when it could not check a vendor. A live-upstream UNKNOWN
  // counts too: the S-14 drift signal is blind when the live
  // compare cannot run, so it fails the same way.
  const incomplete = counts.UNKNOWN > 0 || liveUnknown > 0;
  const exitCode = incomplete ? 1 : 0;

  const report = {
    generated,
    pinsFile: 'sources/imported-skills.md',
    stateFile: statePath ? statePath.replace(`${ROOT}/`, '') : null,
    stateWarning,
    vendors: reportVendors,
    notifications,
    summary: {
      counts,
      liveDrift,
      liveUnknown,
      reviewQueue,
      newNotifications: notifications.length,
      duplicatesSuppressed,
      securityFlags: securityFlagTotal,
    },
  };

  if (recordState && statePath) {
    const next = { version: 1, updated: generated, vendors: { ...state.vendors } };
    for (const v of reportVendors) {
      for (const side of [v, v.live]) {
        if (!side || !side.head) continue;
        next.vendors[side.repo] = {
          head: side.head,
          status: side.status,
          notifiedAt: generated,
          affectedSkills: side.detection?.affectedSkills || [],
          securityFlagCount: side.detection?.securityFlagCount || 0,
        };
      }
    }
    try {
      await saveNotificationState(statePath, next);
      report.stateRecorded = true;
    } catch (e) {
      report.stateRecorded = false;
      report.stateError = `could not write state file ${statePath}: ${e.message}`;
    }
  }

  if (outPath) {
    try {
      await atomicWriteFile(outPath, JSON.stringify(report, null, 2) + '\n');
    } catch (e) {
      error(`Cannot write report to ${outPath}: ${e.message}`);
      return 1;
    }
  }

  if (json) {
    log(JSON.stringify(report, null, 2));
    if (incomplete) {
      const parts = [];
      if (counts.UNKNOWN > 0) parts.push(`${counts.UNKNOWN} vendor(s) UNKNOWN`);
      if (liveUnknown > 0) parts.push(`${liveUnknown} live-upstream check(s) UNKNOWN`);
      error(
        `Upstream check incomplete: ${parts.join(', ')} — the check could not reach GitHub or the repo. ` +
          'Drift is informational, but a monitoring failure is not: this run exits non-zero.',
      );
    }
    return exitCode;
  }

  // Human summary. The per-vendor lines below preserve the
  // original format; detection lines are appended after them, only
  // when a drifted vendor has change detail to show. Security lines
  // are capped per vendor (the full list is in the JSON report): a
  // large upstream diff can flag dozens of files, and a 90-line
  // dump hides the summary.
  const MAX_SHOWN_SECURITY = 10;
  const printSecurity = (flags, prefix) => {
    for (const flag of flags.slice(0, MAX_SHOWN_SECURITY)) {
      const rules = flag.flags.map((f) => f.id).join(', ');
      log(`  ${prefix}security: ${flag.file} (${rules})`);
    }
    if (flags.length > MAX_SHOWN_SECURITY) {
      log(`  ${prefix}security: … and ${flags.length - MAX_SHOWN_SECURITY} more flagged file(s) (see JSON output with --json or --out)`);
    }
  };
  if (stateWarning) error(`Warning: ${stateWarning}`);
  log(`Upstream check: ${vendors.length} vendor repos pinned in sources/imported-skills.md\n`);
  for (const r of results) {
    log(`- ${r.vendor} (${r.repo})`);
    log(`  pinned: ${r.pinned.slice(0, 12)}${r.head ? `  head: ${r.head.slice(0, 12)} (${r.headDate})` : ''}`);
    log(`  ${r.status}: ${r.detail}`);
    if (r.detection) {
      log(`  changes: ${r.detection.summary}`);
      for (const del of r.detection.deletedFiles) log(`  deleted: ${del}`);
      for (const ren of r.detection.renamedFiles) log(`  renamed: ${ren.from} → ${ren.to}`);
      printSecurity(r.detection.securityFlags, '');
    }
    if (r.live) {
      const liveHead = r.live.head ? `  head: ${r.live.head.slice(0, 12)} (${r.live.headDate})` : '';
      log(`  live upstream (${r.live.repo}):${liveHead}`);
      log(`  ${r.live.status}: ${r.live.detail}`);
      if (r.live.detection) {
        log(`  live changes: ${r.live.detection.summary}`);
        printSecurity(r.live.detection.securityFlags, 'live ');
      }
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
  if (reviewQueue > 0) {
    log(
      `Review queue: ${reviewQueue} drifted import(s) need maintainer review ` +
        `(${notifications.length} new notification(s)` +
        (duplicatesSuppressed > 0 ? `, ${duplicatesSuppressed} already reported for the current upstream state` : '') +
        '). Nothing is auto-merged — see ai/maintenance/UPSTREAM-CHANGE-MONITORING.md.',
    );
  }
  if (securityFlagTotal > 0) {
    log(
      `Security: ${securityFlagTotal} security flag(s) in upstream diffs — read those diffs before any re-import.`,
    );
  }
  if (recordState) {
    log(report.stateRecorded
      ? `Notification state recorded in ${report.stateFile}.`
      : `Warning: ${report.stateError}`);
  }
  if (incomplete) {
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
  const args = process.argv.slice(2);
  const flagValue = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const outPath = flagValue('--out');
  const statePath = args.includes('--no-state')
    ? null
    : (flagValue('--state') || undefined);
  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout. Natural exit flushes it first (see validate-registry.mjs).
  process.exitCode = await runCheck({
    json: args.includes('--json'),
    outPath: outPath || null,
    ...(statePath !== undefined ? { statePath } : {}),
    recordState: args.includes('--record-state'),
  });
}

// Main guard (same idiom as check-links.mjs): importing this module
// for parsePins/checkVendor must not trigger a live GitHub check.
const invokedAsScript = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
