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
//
// This is a smoke screen, not SAST: patterns are line regexes and
// anything flagged needs human review. Intentional examples (skills
// documenting an attack, eval fixtures containing injection prompts)
// are handled by the EXCEPTIONS map below and by line-level
// `security-scan:ignore` comments — never by deleting a pattern to
// silence a finding. Every exception needs a reason.
//
// The pattern library itself (scripts/lib/security-patterns.mjs) is
// excluded: its regexes are definitions, and several match their own
// source lines. It is covered by code review and test/security.test.mjs.
//
// Usage: node scripts/security-scan.mjs [--json]
//   npm run check:security
// Exit code 1 if any finding remains after exceptions/ignores.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { patternsFor } from './lib/security-patterns.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const TEXT_EXT = /\.(md|mjs|js|ts|sh|py|json|yml|yaml|toml)$/;
const BINARY_EXT = /\.(png|jpg|jpeg|gif|pdf|gz|tar|zip)$/;
// The pattern library matches its own definitions; reviewed separately.
// The security tests are excepted the same way: their fixtures ARE the
// patterns under test, fake by construction. The tests themselves are
// the coverage for that file.
const SKIP_FILES = new Set([
  'scripts/lib/security-patterns.mjs',
  'test/security.test.mjs',
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
  ['skills/upstream/anthropic/webapp-testing/scripts/with_server.py', 'CODE-08', 'shell execution enabled for user-provided local server config; documented design, trust boundary is the local config file (audit S-10)'],
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
];

const JSON_OUT = process.argv.includes('--json');
const PATTERNS = patternsFor('scan');
const SECRET_PATTERNS = PATTERNS.filter((p) => p.id.startsWith('SEC-'));
// Multi-line curl-pipe: `curl ... | \` + newline + shell on next line.
const MULTILINE_CURL_RE = /curl[^\n]*\|\s*\\\n\s*(sudo\s+)?(sh|bash)\b/g;

function isExcepted(relPath, patternId) {
  return EXCEPTIONS.some(([prefix, id]) => relPath.startsWith(prefix) && id === patternId);
}

// Line-level ignore: `security-scan:ignore` skips all patterns on the
// line; `security-scan:ignore SEC-01,CODE-03` skips only those.
function ignoredPatterns(line) {
  const m = line.match(/security-scan:ignore\s*([A-Z0-9-, ]*)?/);
  if (!m) return null;
  const ids = (m[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  return new Set(ids); // empty set = ignore all on this line
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

for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (SKIP_FILES.has(rel)) continue;
  if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) continue;
  if (TEXT_EXT.test(file)) {
    textFiles++;
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      const ignored = ignoredPatterns(line);
      for (const p of PATTERNS) {
        const m = line.match(p.re);
        if (!m) continue;
        if (p.guard && !p.guard(m, line)) continue;
        if (ignored && (ignored.size === 0 || ignored.has(p.id))) continue;
        if (isExcepted(rel, p.id)) continue;
        findings.push({ file: rel, line: idx + 1, id: p.id, severity: p.severity, label: p.label, match: m[0].slice(0, 80) });
      }
    });
    // Multi-line curl-pipe (reported once per occurrence).
    for (const m of text.matchAll(MULTILINE_CURL_RE)) {
      if (isExcepted(rel, 'CMD-01')) continue;
      const lineNo = text.slice(0, m.index).split('\n').length;
      findings.push({ file: rel, line: lineNo, id: 'CMD-01', severity: 'high', label: 'curl-piped-to-shell command (multi-line)', match: m[0].replace(/\s+/g, ' ').slice(0, 80) });
    }
  } else if (BINARY_EXT.test(file)) {
    binaryFiles++;
    const buf = await readFile(file);
    const text = buf.toString('latin1');
    for (const p of SECRET_PATTERNS) {
      const m = text.match(p.re);
      if (m && (!p.guard || p.guard(m, '')) && !isExcepted(rel, p.id)) {
        findings.push({ file: rel, line: 0, id: p.id, severity: p.severity, label: p.label + ' (binary byte scan)', match: m[0].slice(0, 80) });
      }
    }
  }
}

const bySeverity = { high: 0, medium: 0, low: 0 };
for (const f of findings) bySeverity[f.severity]++;

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: { textFiles, binaryFiles }, findings }, null, 2));
} else {
  console.log(`Scanned ${textFiles} text files + ${binaryFiles} binary files (${PATTERNS.length} patterns).`);
  for (const f of findings) {
    console.log(`  ${f.severity.toUpperCase()} ${f.file}:${f.line} [${f.id}] ${f.label}`);
  }
  if (findings.length > 0) {
    console.log(`REVIEW NEEDED: ${findings.length} finding(s) (high ${bySeverity.high}, medium ${bySeverity.medium}, low ${bySeverity.low}).`);
  } else {
    console.log('PASS: no findings.');
  }
}
process.exit(findings.length > 0 ? 1 : 0);
