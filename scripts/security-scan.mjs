#!/usr/bin/env node
// security-scan.mjs — static security scan over the repository.
//
// Layers (see docs/SECURITY-SCANNING.md for the full picture):
//   1. Pattern scan: shared patterns from scripts/lib/security-patterns.mjs
//      (secrets, prompt-injection markers, dangerous commands, code
//      vulnerability shapes) over text files, plus a byte-level secret
//      scan over binary files.
//   2. Multi-line curl-pipe detection (the line-based pattern misses
//      `curl ... | \` followed by `bash` on the next line).
//   3. Binary-asset hash verification: every binary file's SHA-256
//      must match sources/binary-hashes.json (audit A5-09).
//
// Text-file scope (audit A2-04/A5-01): the TEXT_EXT extensions below,
// plus any file whose content sniffs as text — extensionless
// executables (shebang) and plain-text files without a recognized
// extension (LICENSE, .gitignore, .dot). A file is text when its
// first 8 KiB has no NUL byte and decodes as UTF-8.
//
// This is a smoke screen, not SAST: patterns are line regexes and
// anything flagged needs human review. Intentional examples (skills
// documenting an attack, eval fixtures containing injection prompts)
// are handled by the EXCEPTIONS map below and by line-level
// `security-scan:ignore` comments — never by deleting a pattern to
// silence a finding. Every exception needs a reason.
//
// Line-level ignores are GATED (audit A5-07): an ignore is effective
// only when its (file, pattern) pair is in IGNORE_ALLOWLIST below.
// Any other use is itself a finding (IGNORE-01) and suppresses
// nothing — a bare (unscoped) marker needs a '*' allowlist entry.
// Mentions of the marker inside backticks are documentation, not
// directives, and are ignored by the parser.
//
// The pattern library itself (scripts/lib/security-patterns.mjs) is
// excluded: its regexes are definitions, and several match their own
// source lines. It is covered by code review and test/security.test.mjs.
//
// Usage: node scripts/security-scan.mjs [--json]
//   npm run check:security
// Exit code 1 if any finding remains after exceptions/ignores.
//
// Root override (for tests only): SECURITY_SCAN_ROOT=<dir> or
// --root <dir> scans a different tree instead of the repo root
// (--root wins over the env var). Paths in findings and in the
// EXCEPTIONS / SKIP_FILES / SKIP_PREFIXES tables are always relative
// to the scanned root, so a temp tree can mirror repo paths to test
// exception behavior. See test/scanner.test.mjs.

import { readdir, readFile, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patternsFor } from './lib/security-patterns.mjs';
import { toPosixPath } from './lib/paths.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootFlagIdx = process.argv.indexOf('--root');
const ROOT = path.resolve(
  rootFlagIdx !== -1 && process.argv[rootFlagIdx + 1]
    ? process.argv[rootFlagIdx + 1]
    : (process.env.SECURITY_SCAN_ROOT || DEFAULT_ROOT),
);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
// Audit A2-04/A5-01: cjs, html, xml, txt joined the original ten.
// Files with no recognized extension are content-sniffed instead
// (see looksLikeText below) — extensionless executables and plain
// text files must not escape the scan.
const TEXT_EXT = /\.(md|mjs|js|ts|cjs|sh|py|json|yml|yaml|toml|html|xml|txt)$/;
const BINARY_EXT = /\.(png|jpg|jpeg|gif|pdf|gz|tar|zip)$/;
// The pattern library matches its own definitions; reviewed separately.
// (The security tests used to be skipped the same way; audit A2-15
// removed them from this list — their fixture lines now carry
// allowlisted line-level ignores instead, so a real secret planted
// anywhere else in those files IS flagged.)
const SKIP_FILES = new Set([
  'scripts/lib/security-patterns.mjs',
]);
// Generated run outputs: they embed eval case inputs verbatim (the
// cases themselves are the source of truth and are excepted above).
const SKIP_PREFIXES = ['evals/reports/', 'evals/regression/'];

// [path prefix, pattern id, reason] — intentional content, reviewed.
// Add entries only with a reason; never to silence a real finding.
const EXCEPTIONS = [
  // Eval fixtures contain injection prompts BY DESIGN (they test refusal).
  ['evals/cases/', 'INJ-01', 'eval fixture: injection prompt under test'],
  ['evals/cases/', 'INJ-02', 'eval fixture: injection prompt under test'],
  ['evals/cases/', 'INJ-03', 'eval fixture: injection prompt under test'],
  ['evals/cases/', 'INJ-04', 'eval fixture: injection prompt under test'],
  ['evals/cases/', 'REQ-01', 'eval fixture: exfiltration prompt under test'],
  ['evals/cases/', 'REQ-02', 'eval fixture: destructive-command prompt under test'],
  ['evals/cases/', 'REQ-03', 'eval fixture: curl-pipe prompt under test'],
  ['evals/cases/', 'REQ-04', 'eval fixture: destructive-SQL prompt under test'],
  ['evals/cases/', 'REQ-05', 'eval fixture: auth-bypass prompt under test'],
  ['evals/cases/', 'CMD-02', 'eval fixture: destructive-command prompt under test'],
  ['evals/cases/', 'CMD-01', 'eval fixture: curl-pipe prompt under test'],
  // Framework tests assert on the patterns with fixture strings.
  ['test/evals.test.mjs', 'INJ-01', 'test fixture: injection string under test'],
  ['test/evals.test.mjs', 'REQ-01', 'test fixture: exfiltration string under test'],
  ['test/evals.test.mjs', 'REQ-02', 'test fixture: destructive-command string under test'],
  ['test/evals.test.mjs', 'CMD-02', 'test fixture: destructive-command string under test'],
  // --- Triaged 2026-11-20 (Phase 7). Each entry was read in context;
  // see ai/audits/SECURITY-AUDIT.md for the finding numbers. ---
  // Original skills: counter-examples and documented safe patterns.
  ['skills/core/security/SKILL.md', 'CODE-04', 'counter-example: labeled Unsafe, followed by the parameterized fix'],
  ['skills/security/sql-injection-prevention/SKILL.md', 'CODE-04', 'safe pattern: ORDER BY column is allowlist-validated by sortColumn()'],
  ['skills/security/xss-prevention/SKILL.md', 'CODE-06', 'safe pattern: DOMPurify-sanitized HTML with tag/attr allowlist'],
  // Upstream agentic-seo (verbatim; cannot edit): install docs and scripts.
  ['skills/upstream/agentic-seo/', 'CMD-04', 'upstream scripts document unpinned pip installs; flagged for upstream follow-up (audit S-07)'],
  ['skills/upstream/agentic-seo/seo/README.md', 'CMD-01', 'upstream documents curl-pipe install; conflicts with repo guidance; flagged (audit S-08)'],
  ['skills/upstream/agentic-seo/seo/install.sh', 'CMD-01', 'upstream documents curl-pipe install; conflicts with repo guidance; flagged (audit S-08)'],
  ['skills/upstream/agentic-seo/seo/install.sh', 'CMD-03', 'rm -rf guarded: TEMP_DIR is mktemp-created with a non-empty check; dest is a validated skill path'],
  ['skills/upstream/agentic-seo/seo/scripts/broken_links.py', 'CODE-14', 'upstream script disables TLS verification; genuine issue, cannot edit upstream (audit S-09)'],
  ['skills/upstream/agentic-seo/seo/scripts/duplicate_content.py', 'CODE-11', 'MD5 as non-cryptographic MinHash for duplicate detection, not a password/token hash'],
  // Upstream anthropic (verbatim).
  ['skills/upstream/anthropic/mcp-builder/reference/evaluation.md', 'CMD-04', 'upstream doc; unpinned pip install'],
  ['skills/upstream/anthropic/webapp-testing/scripts/with_server.py', 'CODE-08', 'shell execution for --server commands typed by the invoking user on the command line; trust boundary is the invoking user, not untrusted input (audit S-10; corrected 2026-11-20 — commands come from CLI args, not a config file)'],
  // Upstream marketingskills (verbatim).
  ['skills/upstream/marketingskills/schema/references/schema-examples.md', 'CODE-06', 'safe pattern: JSON-LD with < escaped to \\u003c'],
  // Upstream prisma (verbatim).
  ['skills/upstream/prisma/prisma-client-api/references/raw-queries.md', 'CODE-04', 'Prisma.sql/$queryRaw parameterize interpolated values by design'],
  ['skills/upstream/prisma/prisma-upgrade-v7/SKILL.md', 'CODE-14', 'upstream guidance documents disabling TLS verification as a workaround; doc also recommends proper CA config (audit S-11)'],
  ['skills/upstream/prisma/prisma-upgrade-v7/references/driver-adapters.md', 'CODE-14', 'upstream guidance documents disabling TLS verification as a workaround; doc also recommends proper CA config (audit S-11)'],
  // Upstream superpowers (verbatim).
  ['skills/upstream/superpowers/brainstorming/scripts/stop-server.sh', 'CMD-03', 'rm -rf guarded to /tmp/* paths only'],
  ['skills/upstream/superpowers/writing-skills/references/anthropic-best-practices.md', 'CMD-04', 'upstream doc; unpinned pip install'],
  // Upstream vercel (verbatim).
  ['skills/upstream/vercel/vercel-cli-with-tokens/SKILL.md', 'SEC-05', 'upstream example token (10 chars; real Vercel tokens are 24 chars)'],
  ['skills/upstream/vercel/vercel-react-best-practices/AGENTS.md', 'CODE-06', 'static inline theme script; no user data interpolated'],
  ['skills/upstream/vercel/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md', 'CODE-06', 'static inline theme script; no user data interpolated'],
  // The audit report quotes flagged constructs as evidence (its purpose).
  ['ai/audits/SECURITY-AUDIT.md', 'CODE-01', 'audit report quotes the flagged construct as evidence'],
  ['ai/audits/SECURITY-AUDIT.md', 'CODE-08', 'audit report quotes the flagged construct as evidence'],
  ['ai/audits/SECURITY-AUDIT.md', 'CODE-14', 'audit report quotes the flagged construct as evidence'],
  ['ai/audits/SECURITY-AUDIT.md', 'CMD-01', 'audit report quotes the flagged construct as evidence'],
  // The final implementation report quotes the flagged construct as
  // evidence for audit finding S-11 (upstream Prisma guidance).
  ['ai/reports/FINAL-IMPLEMENTATION-REPORT.md', 'CODE-14', 'final report quotes the flagged construct as evidence for audit S-11'],
  // --- Triaged 2026-11-20 (Stage B, finding A-01). Stage A remediation
  // docs quote flagged constructs as evidence, same treatment as the
  // audit report above. Each line was read in context; none is a live
  // vulnerability. Per-file, per-pattern — never a directory exclusion. ---
  // PROJECT-STATUS.md:49 quotes the TLS-disable construct (S-11 evidence).
  ['ai/PROJECT-STATUS.md', 'CODE-14', 'status log quotes the flagged construct as evidence for audit S-11 (finding A-01)'],
  // ISSUE-REGISTER.md quotes: S-08 curl-pipe (:430), S-09 TLS-disable
  // (:441), S-11 TLS-disable (:447), S-10 Python shell execution
  // (:478), and the A-01 evidence quote itself (:47).
  ['ai/remediation/ISSUE-REGISTER.md', 'CODE-14', 'issue register quotes the flagged construct as evidence for audit S-09/S-11 (finding A-01)'],
  ['ai/remediation/ISSUE-REGISTER.md', 'CMD-01', 'issue register quotes the flagged construct as evidence for audit S-08 (finding A-01)'],
  ['ai/remediation/ISSUE-REGISTER.md', 'CODE-08', 'issue register quotes the flagged construct as evidence for audit S-10 (finding A-01)'],
  // VERIFICATION-MATRIX.md:82,380 quote the TLS-disable construct as
  // evidence for S-11 / the A-01 root-cause analysis.
  ['ai/remediation/VERIFICATION-MATRIX.md', 'CODE-14', 'verification matrix quotes the flagged construct as evidence for audit S-11 (finding A-01)'],
  // The agentic-seo safe-install guide quotes the upstream curl-pipe
  // command (so users recognize and avoid it) and the TLS-disable
  // flaw (so users understand S-09). The quotes ARE the warning.
  ['docs/AGENTIC-SEO-SAFE-INSTALL.md', 'CMD-01', 'safe-install guide quotes the upstream curl-pipe command as the thing to avoid (audit S-08)'],
  ['docs/AGENTIC-SEO-SAFE-INSTALL.md', 'CODE-14', 'safe-install guide quotes the upstream TLS-disable flaw it warns about (audit S-09)'],
  // --- Triaged 2026-11-20 (Stage E). The Stage E security-status and
  // remediation-report docs quote the same flagged constructs as
  // evidence for S-08/S-09/S-10/S-11, same treatment as the audit
  // report above. Each line was read in context; none is a live
  // vulnerability. Per-file, per-pattern — never a directory
  // exclusion. ---
  ['ai/audits/SECURITY-STATUS.md', 'CMD-01', 'security-status doc quotes the flagged construct as evidence for audit S-08 (Stage E)'],
  ['ai/audits/SECURITY-STATUS.md', 'CODE-14', 'security-status doc quotes the flagged construct as evidence for audit S-09/S-11 (Stage E)'],
  ['ai/audits/SECURITY-STATUS.md', 'CODE-08', 'security-status doc quotes the flagged construct as evidence for audit S-10 (Stage E)'],
  ['ai/reports/FINAL-REMEDIATION-REPORT.md', 'CMD-01', 'remediation report quotes the flagged construct as evidence for audit S-08 (Stage E)'],
  ['ai/reports/FINAL-REMEDIATION-REPORT.md', 'CODE-14', 'remediation report quotes the flagged construct as evidence for audit S-09/S-11 (Stage E)'],
  ['ai/reports/FINAL-REMEDIATION-REPORT.md', 'CODE-08', 'remediation report quotes the flagged construct as evidence for audit S-10 (Stage E)'],
  // --- Triaged 2026-11-21 (production-readiness audit, Phase C).
  // The audit report itself quotes flagged constructs as evidence
  // (its purpose) — same treatment as SECURITY-AUDIT.md above.
  // Each line was read in context; none is a live vulnerability. ---
  ['ai/audits/PRODUCTION-READINESS-AUDIT.md', 'CODE-11', 'audit report quotes the SHA-1 hash call as evidence for A2-04 (server.cjs:13, RFC 6455)'],
  ['ai/audits/PRODUCTION-READINESS-AUDIT.md', 'CMD-04', 'audit report quotes the Semgrep install command as evidence for A4-06 (wrapped quote; the real command is version-pinned)'],
  ['ai/audits/PRODUCTION-READINESS-AUDIT.md', 'CODE-14', 'audit report quotes the TLS-disable constructs as evidence for S-09/S-11'],
  ['ai/audits/PRODUCTION-READINESS-AUDIT.md', 'CMD-02', 'audit report lists a destructive rm command among the constructs verified ABSENT from original skills'],
  ['ai/audits/PRODUCTION-READINESS-AUDIT.md', 'CODE-01', 'audit report lists dynamic code execution among the constructs verified ABSENT from original skills'],
  ['ai/audits/PRODUCTION-READINESS-AUDIT.md', 'CMD-01', 'audit report quotes the upstream curl-pipe text as evidence for S-08'],
  // --- Triaged 2026-11-21 (audit A2-04/A5-01). The extended scan
  // now covers server.cjs (previously unscanned .cjs). Both hits
  // were read in context; neither is a live vulnerability. ---
  ['skills/upstream/superpowers/brainstorming/scripts/server.cjs', 'CODE-11', 'SHA-1 is the WebSocket accept-key hash mandated by RFC 6455 (clientKey + the standard GUID), not a password/token hash'],
  ['skills/upstream/superpowers/brainstorming/scripts/server.cjs', 'CODE-07', 'exec runs an operator-provided launcher from BRAINSTORM_OPEN_CMD (trusted operator input, opt-in via BRAINSTORM_OPEN, localhost only) with a JSON.stringify-quoted URL; platform launchers use execFile without a shell'],
];

// Line-level ignore allowlist (audit A5-07). An ignore directive is
// effective ONLY when its (file, pattern) pair is listed here; any
// other use is an IGNORE-01 finding and suppresses nothing. A '*'
// pattern would allowlist a bare (unscoped) marker in that file —
// no file has one: bare markers are never legitimate.
// The test fixtures below are fake by construction (see the test
// files' headers); each entry covers the fixture lines for that
// pattern in that file, and only those lines carry the directive.
const IGNORE_ALLOWLIST = new Set([
  // The one legitimate production use: a warning string that quotes
  // the upstream curl-pipe command users must NOT run (S-08).
  'scripts/install/commands.mjs|CMD-01',
  // test/security.test.mjs — pattern fixtures under test (A2-15).
  'test/security.test.mjs|SEC-01',
  'test/security.test.mjs|SEC-03',
  'test/security.test.mjs|SEC-04',
  'test/security.test.mjs|SEC-05',
  'test/security.test.mjs|SEC-06',
  'test/security.test.mjs|INJ-01',
  'test/security.test.mjs|INJ-02',
  'test/security.test.mjs|INJ-03',
  'test/security.test.mjs|INJ-04',
  'test/security.test.mjs|CMD-01',
  'test/security.test.mjs|CMD-02',
  'test/security.test.mjs|CMD-03',
  'test/security.test.mjs|CODE-01',
  'test/security.test.mjs|CODE-02',
  'test/security.test.mjs|CODE-03',
  'test/security.test.mjs|CODE-04',
  'test/security.test.mjs|CODE-05',
  'test/security.test.mjs|CODE-06',
  'test/security.test.mjs|CODE-07',
  'test/security.test.mjs|CODE-08',
  'test/security.test.mjs|CODE-09',
  'test/security.test.mjs|CODE-10',
  'test/security.test.mjs|CODE-11',
  'test/security.test.mjs|CODE-12',
  'test/security.test.mjs|CODE-13',
  'test/security.test.mjs|CODE-14',
  // test/scanner.test.mjs — scanner fixture strings (A2-15).
  'test/scanner.test.mjs|SEC-05',
  'test/scanner.test.mjs|CMD-01',
  'test/scanner.test.mjs|CMD-04',
  'test/scanner.test.mjs|CODE-08',
  'test/scanner.test.mjs|CODE-14',
]);

const JSON_OUT = process.argv.includes('--json');
const PATTERNS = patternsFor('scan');
const SECRET_PATTERNS = PATTERNS.filter((p) => p.id.startsWith('SEC-'));
// Multi-line curl-pipe: `curl ... | \` + newline + shell on next line.
// (Audit A5-13: wget shares the form.)
const MULTILINE_CURL_RE = /(?:curl|wget)[^\n]*\|\s*\\\n\s*(sudo\s+)?(sh|bash)\b/g;

// The literal ignore-marker text must never appear unquoted in this
// file: the scanner scans itself, and a bare literal would read as
// an (unauthorized) ignore directive on its own line. It is built
// from parts here and interpolated into finding labels; prose
// mentions in comments stay inside backticks, which the parser
// strips (see parseIgnore).
const IGNORE_MARKER = 'security-scan:' + 'ignore';
const IGNORE_RE = new RegExp(`${IGNORE_MARKER}\\s*([A-Z0-9-, ]*)?`);
const CODE_SPAN_RE = /`[^`]*`/g;

// Parse a line-level ignore directive. Returns null (no directive),
// { bare: true } (unscoped: ignores all patterns on the line), or
// { bare: false, ids: [...] } (scoped to the listed patterns).
// Inline-code spans are stripped first: a mention inside backticks
// is documentation, not a directive (the docs and this file's own
// comments quote the marker that way).
function parseIgnore(line) {
  const m = line.replace(CODE_SPAN_RE, '').match(IGNORE_RE);
  if (!m) return null;
  const ids = (m[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return ids.length === 0 ? { bare: true, ids: [] } : { bare: false, ids };
}

function isIgnoreAllowed(relPath, patternId) {
  return IGNORE_ALLOWLIST.has(`${relPath}|${patternId}`);
}

// Content-sniff for files with no recognized extension (audit
// A2-04/A5-01). Text when the head starts with a shebang, or has no
// NUL byte and decodes as UTF-8. Only the first 8 KiB is read, so
// an unrecognized large binary is never loaded whole. (Caveat: a
// multi-byte UTF-8 character split exactly at the 8 KiB boundary
// fails the fatal decode and the file is treated as binary —
// vanishingly rare, and fail-closed for a scan.)
async function looksLikeText(file) {
  let handle;
  try {
    handle = await open(file, 'r');
    const { bytesRead, buffer } = await handle.read(Buffer.alloc(8192), 0, 8192, 0);
    if (bytesRead === 0) return true; // empty file: nothing to flag
    const head = buffer.subarray(0, bytesRead);
    if (head[0] === 0x23 && head[1] === 0x21) return true; // #! shebang
    if (head.includes(0)) return false;
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(head);
    } catch {
      return false;
    }
    return true;
  } finally {
    await handle?.close();
  }
}

// Path-prefix matching for exceptions and skips. A prefix ending in
// '/' is a directory: it matches anything under it. Any other prefix
// is a file path and must match exactly. A bare startsWith would
// except `ai/audits/SECURITY-AUDIT.md.bak` along with the excepted
// `ai/audits/SECURITY-AUDIT.md` — a file that merely shares a prefix
// with an excepted file must NOT be excepted (see
// test/scanner.test.mjs, finding S-11).
function matchesPrefix(relPath, prefix) {
  return prefix.endsWith('/') ? relPath.startsWith(prefix) : relPath === prefix;
}

function isExcepted(relPath, patternId) {
  return EXCEPTIONS.some(([prefix, id]) => matchesPrefix(relPath, prefix) && id === patternId);
}

async function findFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findFiles(full));
    else out.push(full);
  }
  return out;
}

const findings = [];
const files = (await findFiles(ROOT)).sort();
let textFiles = 0;
let binaryFiles = 0;
const binaryPaths = []; // POSIX rel paths, for the hash check below

for (const file of files) {
  // Normalized to POSIX separators: the exception/skip lists use
  // POSIX prefixes, which a Windows backslash path would never
  // match (Stage D, W-2). No-op on POSIX.
  const rel = toPosixPath(path.relative(ROOT, file));
  if (SKIP_FILES.has(rel)) continue;
  if (SKIP_PREFIXES.some((p) => matchesPrefix(rel, p))) continue;
  let text = null; // decoded text when this file is scanned as text
  if (TEXT_EXT.test(file)) {
    try {
      text = await readFile(file, 'utf8');
    } catch (e) {
      // A-38: same class as the link checker — a file deleted
      // between the listing and the read is gone; skip it rather
      // than failing the whole scan. The count only includes files
      // actually read.
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    textFiles++;
  } else if (BINARY_EXT.test(file)) {
    binaryPaths.push(rel);
    let buf;
    try {
      buf = await readFile(file);
    } catch (e) {
      // A-38: see the text branch above.
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    binaryFiles++;
    const latin = buf.toString('latin1');
    for (const p of SECRET_PATTERNS) {
      const m = latin.match(p.re);
      if (m && (!p.guard || p.guard(m, '')) && !isExcepted(rel, p.id)) {
        findings.push({ file: rel, line: 0, id: p.id, severity: p.severity, label: p.label + ' (binary byte scan)', match: m[0].slice(0, 80) });
      }
    }
  } else {
    // No recognized extension: sniff the content (A2-04/A5-01).
    // Extensionless executables and plain-text files without an
    // extension are scanned as text; anything else is skipped.
    let isText;
    try {
      isText = await looksLikeText(file);
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    if (!isText) continue;
    try {
      text = await readFile(file, 'utf8');
    } catch (e) {
      if (e.code === 'ENOENT') continue;
      throw e;
    }
    textFiles++;
  }
  if (text === null) continue;
  const lines = text.split('\n');
  // Inline-code spans are documentation, not directives — and a
  // span can wrap across lines (a doc quote split mid-span), so
  // blank them out at the FILE level before parsing markers.
  // Newlines are preserved, so line numbers stay aligned with
  // `lines`. Pattern matching still uses the original lines.
  const cleanLines = text.replace(CODE_SPAN_RE, (s) => s.replace(/[^\n]/g, ' ')).split('\n');
  // Per-line effective ignores (A5-07 gate; A2-16 reuses this for
  // the multi-line check). An ignore is effective only when its
  // (file, pattern) pair is allowlisted; anything else is an
  // IGNORE-01 finding and suppresses nothing (fail closed).
  const lineIgnores = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const parsed = parseIgnore(cleanLines[idx]);
    if (!parsed) { lineIgnores.push(null); continue; }
    const effective = new Set();
    if (parsed.bare) {
      if (isIgnoreAllowed(rel, '*')) effective.add('*');
      else findings.push({ file: rel, line: idx + 1, id: 'IGNORE-01', severity: 'high', label: `unauthorized ${IGNORE_MARKER} use (bare marker is not allowlisted)`, match: lines[idx].trim().slice(0, 80) });
    } else {
      for (const id of parsed.ids) {
        if (isIgnoreAllowed(rel, id)) effective.add(id);
        else findings.push({ file: rel, line: idx + 1, id: 'IGNORE-01', severity: 'high', label: `unauthorized ${IGNORE_MARKER} use for ${id} (not allowlisted)`, match: lines[idx].trim().slice(0, 80) });
      }
    }
    lineIgnores.push(effective);
  }
  lines.forEach((line, idx) => {
    const ignored = lineIgnores[idx];
    for (const p of PATTERNS) {
      const m = line.match(p.re);
      if (!m) continue;
      if (p.guard && !p.guard(m, line)) continue;
      if (ignored && (ignored.has('*') || ignored.has(p.id))) continue;
      if (isExcepted(rel, p.id)) continue;
      findings.push({ file: rel, line: idx + 1, id: p.id, severity: p.severity, label: p.label, match: m[0].slice(0, 80) });
    }
  });
  // Multi-line curl-pipe (reported once per occurrence).
  for (const m of text.matchAll(MULTILINE_CURL_RE)) {
    if (isExcepted(rel, 'CMD-01')) continue;
    const lineNo = text.slice(0, m.index).split('\n').length;
    // A2-16: a line-level ignore on either spanned line silences
    // the multi-line match, exactly like the single-line loop.
    const spanned = [lineIgnores[lineNo - 1], lineIgnores[lineNo]];
    if (spanned.some((ig) => ig && (ig.has('*') || ig.has('CMD-01')))) continue;
    findings.push({ file: rel, line: lineNo, id: 'CMD-01', severity: 'high', label: 'curl-piped-to-shell command (multi-line)', match: m[0].replace(/\s+/g, ' ').slice(0, 80) });
  }
}

// --- Binary-asset hash verification (A5-09) ---
// sources/binary-hashes.json pins the SHA-256 of every vendored
// binary asset. A mismatch, a missing listed file, a malformed
// manifest, or a binary file not listed at all fails the scan.
// The manifest is absent in temp test roots: the check is skipped
// there (scanner tests build their own manifest when they test it).
let hashesManifest = false;
let hashesChecked = 0;
const manifestPath = path.join(ROOT, 'sources', 'binary-hashes.json');
let manifestRaw;
try {
  manifestRaw = await readFile(manifestPath, 'utf8');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
if (manifestRaw !== undefined) {
  hashesManifest = true;
  let manifest = null;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    manifest = null;
  }
  if (!manifest || manifest.algorithm !== 'sha256' || typeof manifest.files !== 'object' || manifest.files === null || Array.isArray(manifest.files)) {
    findings.push({ file: 'sources/binary-hashes.json', line: 0, id: 'HASH-03', severity: 'high', label: 'binary-hashes manifest is malformed (expected { algorithm: "sha256", files: { path: hex } })', match: '' });
  } else {
    const listed = new Set(Object.keys(manifest.files));
    for (const [listedPath, expected] of Object.entries(manifest.files)) {
      let buf;
      try {
        buf = await readFile(path.join(ROOT, listedPath));
      } catch (e) {
        findings.push({ file: listedPath, line: 0, id: 'HASH-02', severity: 'high', label: `binary asset listed in sources/binary-hashes.json cannot be read (${e.code || 'error'})`, match: '' });
        continue;
      }
      hashesChecked++;
      const actual = createHash('sha256').update(buf).digest('hex');
      if (actual !== expected) {
        findings.push({ file: listedPath, line: 0, id: 'HASH-01', severity: 'high', label: 'binary asset hash mismatch — file changed since its hash was recorded (possible tampering; investigate before re-recording)', match: `sha256 ${actual.slice(0, 16)}…` });
      }
    }
    for (const binPath of binaryPaths) {
      if (!listed.has(binPath)) {
        findings.push({ file: binPath, line: 0, id: 'HASH-04', severity: 'high', label: 'binary file is not listed in sources/binary-hashes.json — record its SHA-256 hash there', match: '' });
      }
    }
  }
}

const bySeverity = { high: 0, medium: 0, low: 0 };
for (const f of findings) bySeverity[f.severity]++;

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: { textFiles, binaryFiles }, hashes: { manifest: hashesManifest, checked: hashesChecked }, findings }, null, 2));
} else {
  console.log(`Scanned ${textFiles} text files + ${binaryFiles} binary files (${PATTERNS.length} patterns).`);
  if (hashesManifest) console.log(`Verified ${hashesChecked} binary asset hash(es) against sources/binary-hashes.json.`);
  for (const f of findings) {
    console.log(`  ${f.severity.toUpperCase()} ${f.file}:${f.line} [${f.id}] ${f.label}`);
  }
  if (findings.length > 0) {
    console.log(`REVIEW NEEDED: ${findings.length} finding(s) (high ${bySeverity.high}, medium ${bySeverity.medium}, low ${bySeverity.low}).`);
  } else {
    console.log('PASS: no findings.');
  }
}
// exitCode, not process.exit(): a hard exit discards pending piped
// stdout. Natural exit flushes it first (see validate-registry.mjs).
process.exitCode = findings.length > 0 ? 1 : 0;
