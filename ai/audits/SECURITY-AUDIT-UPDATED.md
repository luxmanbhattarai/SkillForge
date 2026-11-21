# Security Audit — Updated

- **Date:** 2026-11-21
- **Branch:** `feat/skillforge-production-upgrade`
- **HEAD audited:** `85a44ca775d6c065798c23d8f5af025af00c3dfc`
- **Repository:** `github.com/luxmanbhattarai/SkillForge`
- **Phase:** G (production-readiness mission)
- **Prior records:** `ai/audits/SECURITY-AUDIT.md` (Phase 7),
  `ai/audits/SECURITY-STATUS.md` (remediation Stage E),
  `ai/audits/PRODUCTION-READINESS-AUDIT.md` §6 (Phase A, 2026-11-21).
  Finding IDs are reused from those records; nothing is renumbered.
- **Method:** every claim below was re-derived from the repository or
  from a command run for this audit. Prior statuses were not assumed.
  Where this audit disagrees with a prior record, the disagreement is
  stated explicitly.

## 1. Executive summary

The branch is in strong security shape: the repository scanner passed
with no findings at audit time, Semgrep SAST ran clean in CI and locally, all five
CodeQL alerts are triaged and dismissed with 0 open, no secrets were
found anywhere, the supply chain is dependency-free with pinned binary
hashes and SHA-pinned actions, and the installer hardening from the
remediation stages is real code, re-read for this audit — including the
fixes for the uninstall data-loss finding (A5-02) and the manifest
root-climb residual (A5-12), both now closed. One caveat on the
scanner: two sibling Phase G reports landed in the working tree after
the audit-time scan, and one of them quotes a flagged construct
literally, so the current working tree reports 1 MEDIUM finding in
that sibling file (see §2) — this report itself contributes zero
findings. The one High item, S-08,
remains mitigated but open upstream by design: the unsafe install text
lives in a verbatim upstream import that this repository cannot edit,
and the local mitigation (safe-install guide, install/doctor warnings,
per-file scanner exceptions) is verified working. S-14's monitoring gap
is fixed — the drift check now reports the live-upstream lag — but the
import itself still trails the author's repo by 50 commits, so the
finding is mitigated, not fixed. No Critical findings. No release
verdict is made here; the S-08 disposition options are listed in §3.5
without a choice.

| ID | Severity | Status | One-line evidence |
| --- | --- | --- | --- |
| S-08 | High | mitigated | Unsafe install text still present upstream-verbatim; local mitigation verified working |
| S-09 | Medium | mitigated | TLS-disable still present in vendored script; doc + warnings verified |
| S-11 | Medium | mitigated | TLS-disable guidance upstream-only; local handling hardened |
| S-14 | Medium | mitigated | Live-upstream compare implemented and reporting; import still 50 commits behind |
| S-01–S-06, S-15 | Low–Med | fixed | Carried from Stage E (see §4) |
| S-07, S-10, S-12, S-13 | Low–Med | accepted | Carried from Stage E; exception entries re-read (see §4) |
| A4-03 (CodeQL) | Medium | fixed | 0 open alerts; 5 dismissed 2026-11-21 with reasons |
| A4-06 (Semgrep supply chain) | Low | accepted | Documented residual; first CI run has now landed, follow-up unblocked |
| E-01, E-02 | — | fixed | Exit-code fix and status-JSON rewording verified in place |
| A4-02 (branch protection) | High | unresolved | Owner decision; still not enabled (API 404) |
| A4-09, A4-10 (repo settings) | Low | unresolved | Owner actions; verified still disabled |

## 2. Scope and method

### Commands run for this audit (all 2026-11-21, HEAD 85a44ca)

| Command | Result |
| --- | --- |
| `npm run check:security` | PASS: 1,121 text files + 4 binary files, 29 patterns, 4 binary hashes verified |
| `npm run check:upstream` | 6 up-to-date (pin vs fork head); live-upstream drift line reports agentic-seo 50 commits behind the author's repo |
| `gh api .../code-scanning/alerts` | 5 alerts, all dismissed 2026-11-21, 0 open |
| `gh api repos/luxmanbhattarai/SkillForge` | Secret scanning enabled, push protection enabled, Dependabot security updates enabled; validity checks and non-provider patterns disabled |
| `gh api .../secret-scanning/alerts` | 0 alerts, 0 open |
| `gh api .../branches/main/protection` | HTTP 404 — branch not protected |
| `gh api .../actions/runs/44944634176` + job log | Security audit run success; Semgrep job log: "Ran 68 rules on 43 files: 0 findings." |
| Semgrep 1.186.0 locally (`/tmp/semgrep-venv`, pre-existing) | 68 rules on 43 files: 0 findings, 0 errors — matches CI |
| `sha256sum` recomputation of the 4 binary assets | All 4 match `sources/binary-hashes.json` |
| `git hash-object` vs GitHub blob SHAs at pin `67775741…` | install.sh and README.md byte-identical to the pinned upstream commit |
| `git ls-remote` tag checks | checkout and setup-node pins equal the current v5 tag tips; codeql-action pin is a real v4.39.4-era commit (2026-11-20) |
| PR #4 Windows job log (job 136969176768) | A5-11 junction test passed on a real runner; job conclusion success |

### Files read in full

`scripts/security-scan.mjs`, `scripts/lib/security-patterns.mjs`,
`scripts/check-upstream.mjs`, `scripts/install/manifest.mjs`, plus
targeted reads of `scripts/install/commands.mjs` (warnings, uninstall,
doctor, dry-run), `scripts/install/backups.mjs` (restore validation),
`scripts/install/installer.mjs` (swap/rollback),
`scripts/install/lock.mjs`, `scripts/lib/atomic-write.mjs`,
`.github/workflows/security-audit.yml`, `docs/AGENTIC-SEO-SAFE-INSTALL.md`,
`ai/audits/SECURITY-STATUS.md`,
`ai/audits/PRODUCTION-READINESS-AUDIT.md`, `sources/binary-hashes.json`,
`package.json`, `ai/PROJECT-STATUS.json`.

### Boundaries

No commit, push, merge, or PR was made; no file other than this report
was modified. Nothing under `skills/upstream/` was edited (verbatim
policy). `gh` was used read-only (`gh api GET`). No credential was read
or printed.

### Tree state changed during this audit — read this before the counts

The audit-time scan (1,121 text files, PASS) ran before the two
sibling Phase G reports existed in the working tree. They landed
while this audit was running (`ai/audits/SKILL-VERIFICATION-REPORT.md`
20:12:49 UTC, `ai/audits/CI-VALIDATION-REPORT.md` 20:14:40 UTC), and
this report followed at 20:17:31 UTC. A post-write re-run counts
**1,124 text files** (1,121 + 2 siblings + this report) and reports
**1 MEDIUM finding**: `ai/audits/CI-VALIDATION-REPORT.md:81`
[CODE-14], where the sibling report quotes the TLS-disable construct
literally without a scanner exception — the same class as E-02. This
report contributes **zero** findings (verified with the scanner's
JSON output: the single finding is the sibling file's line). The
sibling finding is not this audit's to fix (one-file scope): before
that report is committed, it needs the same treatment as E-02
(reword to prose) or a documented per-file exception entry, or the
CI security-audit job will fail on it. All counts in this report
are the audit-time figures unless marked otherwise, and
`ai/PROJECT-STATUS.json` records 1,121 at commit `9a976a5`.

## 3. Prior findings re-investigated

### S-08 — High — Agentic SEO documents an unsafe install — MITIGATED

**Still present, confirmed upstream-verbatim.**

- `skills/upstream/agentic-seo/seo/README.md:109`: the README shows a
  curl-piped-to-shell install fetching `install.sh` from the author's
  live repo (`Bhanunamikaze/Agentic-SEO-Skill`, moving `main` branch),
  split across lines 109–110 (which is why a single-line grep misses
  it; the scanner's multi-line detection catches it).
- `skills/upstream/agentic-seo/seo/install.sh:57-58`: the same
  curl-piped-to-shell form in the usage text.
- `skills/upstream/agentic-seo/seo/install.sh:222`: remote mode does
  an unpinned `git clone --depth 1` of `main`
  (`REPO_URL` default at `:4` points at the author's repo).
- No checksums or signatures anywhere in the upstream install path;
  the fetched script is not pinned to any version.

**Local mitigation verified real (the maximum available under the
verbatim policy).**

- `docs/AGENTIC-SEO-SAFE-INSTALL.md` (188 lines): the verified path is
  SkillForge's own installer using the vendored copy (no network
  fetch, no remote code execution), and the safe standalone path is a
  pinned-commit download plus SHA-256 verification (`:80-84`,
  `sha256sum` check; `:92`, `git checkout` of the pinned commit).
  Line 45 states plainly that the upstream curl-pipe command must
  never be run.
- Pin byte-identity independently re-verified for this audit: local
  `git hash-object` of the vendored `install.sh` (`f0edb6a4…`) and
  `README.md` (`a78b92bd…`) matches the GitHub blob SHAs for those
  paths at pin `67775741ce88…` in the author's repo. The vendored
  copy is exactly the pinned commit's content.
- Install/update warnings: `scripts/install/commands.mjs:91-93`
  (warning strings, triggered by the
  `skills/upstream/agentic-seo/` source prefix, `:78-80`), fired at
  `:413-415` once per install/update run when the `seo` skill is
  among the planned items.
- Doctor warnings: `commands.mjs:840-841` — a level-`warn` problem per
  installed entry whose source is agentic-seo.
- Scanner: per-file CMD-01 exceptions for exactly the two upstream
  files (`README.md`, `install.sh`) — see §5. No directory-wide
  exception for the curl-pipe pattern.
- This repository's own docs never recommend curl-pipe installs
  (the only first-party occurrence is the warning string itself,
  allowlisted as the single production line-level ignore — §5).

**Remaining risk: HIGH (upstream).** Anyone who finds the upstream
repository directly may follow the unsafe install. Upstream follow-up
with the agentic-seo author is still owed. Status is **mitigated**,
not fixed: the unsafe text is unchanged upstream, and no local edit
can change it.

### S-09 — Medium — `broken_links.py` disables TLS verification — MITIGATED

**Still present, confirmed.**

- `skills/upstream/agentic-seo/seo/scripts/broken_links.py:71` (HEAD
  request) and `:76` (GET fallback): both per-link checks disable TLS
  certificate verification, silently.
- The oversight reading is confirmed: the same script's initial page
  fetch (`:131`, `requests.get(url, timeout=15, headers=HEADERS)`)
  carries no verification override, so verification stays on there;
  the sibling `fetch_page.py` contains no verification override at
  all (grep for `verify` returns nothing). Only the per-link checks
  are blind.

**Local mitigation verified.**

- `docs/AGENTIC-SEO-SAFE-INSTALL.md` § "S-09" (`:112-168`): impact
  (a "healthy" verdict does not prove the real host answered), the
  oversight evidence (`:130-133`), and user workarounds (`:152+`,
  including treating external-link results as advisory).
- Same install/doctor warnings as S-08 (`commands.mjs:93`, `:413-415`,
  `:840-841`).
- Scanner: per-file CODE-14 exception for this one script only (§5).
- Minor doc staleness found: the safe-install guide at `:142-144`
  still describes the doctor warning as "(planned; see the
  specification in the Stage B report …)". The doctor warning is
  implemented (`commands.mjs:840-841`); the parenthetical is out of
  date. Cosmetic; the warning itself works.

**Remaining risk: MEDIUM (upstream).** Every install of the `seo`
skill carries the flawed script until upstream fixes it or the skill
is re-imported from a fixed upstream commit. Upstream follow-up owed.
Status is **mitigated**, not fixed.

### S-11 — Medium — Prisma guide recommends disabling TLS verification — MITIGATED

**Confirmed upstream-only.**

- `skills/upstream/prisma/prisma-upgrade-v7/SKILL.md:244` and
  `references/driver-adapters.md:203`: the upstream guide presents the
  TLS-disable setting as a workaround ("preserve old behavior" /
  "accept self-signed certs"). The same doc also recommends proper CA
  configuration, and `driver-adapters.md:215` shows the verifying
  form — but the insecure workaround is presented first.
- Complete `git grep` for the TLS-disable constructs outside
  `skills/upstream/`: hits are only the pattern definition itself
  (`scripts/lib/security-patterns.mjs:205`, CODE-14), audit-doc
  quotes (each per-file excepted — §5), and test fixtures (allowlisted
  line-level ignores — §5). **No TLS-disable construct exists in any
  first-party code.** The eval model provider (`evals/runners/
  providers.mjs`) uses global `fetch` with default TLS validation
  (Phase A verified; the provider's plaintext-endpoint note is A5-08,
  a separate Low finding).

**Local handling hardened (re-verified).**

- Exceptions are per-file + per-pattern for exactly the two triaged
  Prisma files, with reasons (§5).
- The exception matcher (`scripts/security-scan.mjs:303-307`,
  `matchesPrefix`) requires an exact file match for any prefix not
  ending in `/`; a file merely sharing a prefix with an excepted file
  is not excepted.
- Line-level ignores are now gated (A5-07, §5): an ignore is effective
  only when its (file, pattern) pair is in `IGNORE_ALLOWLIST`; any
  other use is itself a HIGH finding (IGNORE-01) and suppresses
  nothing. This closes the caveat Phase A recorded against S-11.
- 10 scanner integration tests (`test/scanner.test.mjs`) prove
  genuine TLS-disable, curl-pipe, and shell-execution constructs in
  ordinary files are still reported.

**Remaining risk: MEDIUM (upstream).** Users reading the upstream
guide may follow the insecure workaround first. Upstream follow-up
owed. Status is **mitigated**: local handling is hardened, the
upstream text is unchanged.

### S-14 — Medium — Agentic-seo import tracks a dormant fork — MITIGATED

**The monitoring gap is fixed; the import still trails.**

- The pins file now carries a live-upstream reference:
  `sources/imported-skills.md:108` names
  `Bhanunamikaze/Agentic-SEO-Skill` as the live upstream for the
  agentic-seo vendor.
- `scripts/check-upstream.mjs` implements the live compare
  (`parsePins` `:68` parses the `Live upstream:` line; `comparePin`
  `:135` compares a pin against a repo's HEAD; `checkVendor` `:162`
  runs the primary fork check and then the same pin against the live
  repo; the live result is reported alongside, never folded into the
  primary status). The script also gained a 15-second timeout and one
  retry on 429/5xx (A2-10, `:42`, `:93`).
- Live run for this audit (`npm run check:upstream`, network
  available) outputs, verbatim in substance:

```text
- Agentic SEO (pwg-projects/agentic-seo-skill)
  pinned: 67775741ce88  head: 67775741ce88 (2026-03-03)
  UP-TO-DATE: pinned commit is the main head
  live upstream (Bhanunamikaze/Agentic-SEO-Skill):  head: 445c46c268d9 (2026-10-14)
  BEHIND: 50 commit(s) behind main head (2026-10-14)

Summary: 6 up-to-date, 0 behind, 0 ahead, 0 diverged, 0 unknown.
Live-upstream drift: 1 pinned import(s) trail their author's live repo (S-14)
— the fork pin is still the import source until a re-import decision re-points it.
```

  All 6 vendors are up-to-date against their pinned repos; the live
  drift line is the new signal. The check is monitoring-only (exit 0
  even when drift exists), by design.

**Status reasoning — mitigated, not fixed.** The Phase C tally and
`ai/PROJECT-STATUS.json` describe S-14 as "fixed (live-upstream
compare implemented)". This audit disagrees on the label, while
agreeing on the facts: the *monitoring gap* is fixed — the drift is
now visible on every run instead of silently reported as up-to-date —
but the finding's underlying condition is unchanged: the import still
comes from the dormant fork and still trails the author's live repo
by exactly 50 commits, and security fixes landing upstream are still
not in the vendored copy. The re-point decision at the next re-import
is still pending. That is the definition of **mitigated**: the risk
(invisible staleness) is reduced to visible, tracked drift with a
documented decision pending; the condition itself is not closed.

**Remaining risk: MEDIUM.** Until a re-import re-points the source
(or the fork catches up), the vendored `seo` skill misses 50 commits
of upstream work, which may include security fixes.

### S-08 disposition options (no decision made here)

Per the Phase A plan (§7.3), the final disposition is the
coordinator's and owner's call. The options, without a
recommendation:

1. **Accept the verified mitigation** — record S-08 as mitigated with
   the safe-install path, install/doctor warnings, and per-file
   scanner exceptions as the disposition, with the upstream residual
   stated plainly.
2. **Drop the agentic-seo skill** from the library — closes S-08,
   S-09, and S-14 outright; loses a skill and is a product decision
   for the owner.
3. **Block release / READY FOR STAGING** — hold the production verdict
   with S-08 as the named blocker until the owner chooses option 1
   or 2 or upstream fixes the install text.

## 4. Carried findings — S-01–S-07, S-10, S-12, S-13, S-15

These were not individually re-investigated this round; their
statuses are carried from `ai/audits/SECURITY-STATUS.md` (Stage E).
What this audit did verify: the scanner configuration read in full
(§5) still carries the triaged exception entries for S-07, S-10,
S-12, and S-13 with the same reasons, and the scanner passes with no
findings, which is consistent with the carried statuses. Any future
audit that needs these re-proven should re-read the cited files
rather than rely on this carry.

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| S-01 | Medium | fixed | Example password in secrets-management skill replaced with a placeholder (Phase 7) |
| S-02 | Medium | fixed | Multi-line curl-pipe detection added to the scanner (Phase 7); extended to wget in Phase C (A5-13) |
| S-03 | Low | fixed | Scanner false positives fixed with guards and boundaries (Phase 7) |
| S-04 | Medium | fixed | Patterns consolidated into one shared library, counts pinned by tests (Phase 7) |
| S-05 | Medium | fixed | Security test coverage added and extended (Phase 7, Stage B) |
| S-06 | Low | fixed | Upstream commits and licenses re-verified; continuously re-checked by `check:upstream` |
| S-07 | Medium | accepted | Unpinned pip installs in agentic-seo docs (upstream); directory CMD-04 exception + safe-install guidance |
| S-10 | Medium | accepted | `with_server.py` runs invoking-user commands (trust boundary is the invoker); exception reason corrected Stage B |
| S-12 | Low | accepted | Guarded recursive deletes in `install.sh`; traversal only via the user's own arguments |
| S-13 | Low | accepted | SSRF guard in `fetch_page.py` has a theoretical DNS-rebinding window; naive case stopped |
| S-15 | — | fixed | (Per Stage E record; see `ai/audits/SECURITY-STATUS.md`) |

## 5. The repository scanner — `npm run check:security`

**Run output (2026-11-21, HEAD 85a44ca):**

```text
Scanned 1121 text files + 4 binary files (29 patterns).
Verified 4 binary asset hash(es) against sources/binary-hashes.json.
PASS: no findings.
```

**Pattern library** (`scripts/lib/security-patterns.mjs`, 34 patterns
total): scan scope 29, score scope 11, input scope 9 — verified by
importing the module and counting per scope. One pattern can carry
several scopes, so the scope counts sum to more than the total.

**Scan scope** (`scripts/security-scan.mjs:68-69`): text extensions
`md mjs js ts cjs sh py json yml yaml toml html xml txt`, plus
content-sniffing for extensionless files (`looksLikeText`, `:276` —
shebang, or no NUL byte and valid UTF-8 in the first 8 KiB). The
Phase A gap (A2-04/A5-01) is closed: `.cjs`, `.html`, `.xml`, `.txt`,
and extensionless executables are now scanned. Binary files get a
byte-level secret scan plus hash verification. Multi-line
curl-pipe detection covers curl and wget and the substitution forms
(A5-13, `:240`).

**Skips.** `SKIP_FILES` (`:75`) contains exactly one entry: the
pattern library itself (its regexes match their own source lines;
covered by code review and `test/security.test.mjs`). The two test
files formerly skipped are now scanned (A2-15); their fixture lines
carry allowlisted line-level ignores instead. `SKIP_PREFIXES` (`:80`)
covers generated eval outputs (`evals/reports/`,
`evals/regression/`), whose inputs are scanned at their source in
`evals/cases/`.

### Exception inventory — all 61 entries from `EXCEPTIONS` (`:84`)

Every entry is per-file + per-pattern with a reason, except 12
directory entries (11 under `evals/cases/`, 1 under
`skills/upstream/agentic-seo/`), each still per-pattern. No entry
excepts a whole directory for all patterns.

| Files | Patterns | Reason (summarized from the config) |
| --- | --- | --- |
| `evals/cases/` (directory) | INJ-01, INJ-02, INJ-03, INJ-04, REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, CMD-02, CMD-01 (11) | Eval fixtures contain injection/destructive prompts by design — they test refusal |
| `test/evals.test.mjs` | INJ-01, REQ-01, REQ-02, CMD-02 (4) | Test fixtures: strings under test |
| `skills/core/security/SKILL.md` | CODE-04 | Counter-example labeled Unsafe, followed by the parameterized fix |
| `skills/security/sql-injection-prevention/SKILL.md` | CODE-04 | Safe pattern: allowlist-validated sort column |
| `skills/security/xss-prevention/SKILL.md` | CODE-06 | Safe pattern: sanitizer allowlist |
| `skills/upstream/agentic-seo/` (directory) | CMD-04 (1) | Upstream scripts document unpinned installs; flagged for upstream follow-up (S-07) |
| `skills/upstream/agentic-seo/seo/README.md` | CMD-01 | Upstream curl-pipe install docs (S-08) |
| `skills/upstream/agentic-seo/seo/install.sh` | CMD-01, CMD-03 | Curl-pipe docs (S-08); guarded recursive deletes (S-12) |
| `skills/upstream/agentic-seo/seo/scripts/broken_links.py` | CODE-14 | TLS verification disabled (S-09) |
| `skills/upstream/agentic-seo/seo/scripts/duplicate_content.py` | CODE-11 | MD5 as non-cryptographic MinHash, not a credential hash |
| `skills/upstream/anthropic/mcp-builder/reference/evaluation.md` | CMD-04 | Upstream doc; unpinned install |
| `skills/upstream/anthropic/webapp-testing/scripts/with_server.py` | CODE-08 | Shell execution for invoking-user CLI commands (S-10) |
| `skills/upstream/marketingskills/schema/references/schema-examples.md` | CODE-06 | Safe pattern: escaped JSON-LD |
| `skills/upstream/prisma/prisma-client-api/references/raw-queries.md` | CODE-04 | Parameterized by design |
| `skills/upstream/prisma/prisma-upgrade-v7/SKILL.md` | CODE-14 | TLS-disable workaround documented (S-11) |
| `skills/upstream/prisma/prisma-upgrade-v7/references/driver-adapters.md` | CODE-14 | TLS-disable workaround documented (S-11) |
| `skills/upstream/superpowers/brainstorming/scripts/stop-server.sh` | CMD-03 | Recursive delete guarded to temp paths only |
| `skills/upstream/superpowers/writing-skills/references/anthropic-best-practices.md` | CMD-04 | Upstream doc; unpinned install |
| `skills/upstream/vercel/vercel-cli-with-tokens/SKILL.md` | SEC-05 | Upstream example token (10 chars; real tokens are 24) |
| `skills/upstream/vercel/vercel-react-best-practices/AGENTS.md` | CODE-06 | Static inline theme script; no user data |
| `skills/upstream/vercel/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md` | CODE-06 | Static inline theme script; no user data |
| `skills/upstream/superpowers/brainstorming/scripts/server.cjs` | CODE-11, CODE-07 | SHA-1 is the WebSocket accept-key hash mandated by RFC 6455; exec runs an operator-provided launcher, localhost only |
| `ai/audits/SECURITY-AUDIT.md` | CODE-01, CODE-08, CODE-14, CMD-01 (4) | Audit report quotes flagged constructs as evidence |
| `ai/reports/FINAL-IMPLEMENTATION-REPORT.md` | CODE-14 | Report quotes the construct as S-11 evidence |
| `ai/PROJECT-STATUS.md` | CODE-14 | Status log quotes the construct as S-11 evidence |
| `ai/remediation/ISSUE-REGISTER.md` | CODE-14, CMD-01, CODE-08 (3) | Issue register quotes constructs as evidence (S-08/S-09/S-10/S-11) |
| `ai/remediation/VERIFICATION-MATRIX.md` | CODE-14 | Matrix quotes the construct as S-11 evidence |
| `docs/AGENTIC-SEO-SAFE-INSTALL.md` | CMD-01, CODE-14 (2) | Guide quotes the constructs it warns about (S-08/S-09) |
| `ai/audits/SECURITY-STATUS.md` | CMD-01, CODE-14, CODE-08 (3) | Status doc quotes constructs as evidence |
| `ai/reports/FINAL-REMEDIATION-REPORT.md` | CMD-01, CODE-14, CODE-08 (3) | Remediation report quotes constructs as evidence |
| `ai/audits/PRODUCTION-READINESS-AUDIT.md` | CODE-11, CMD-04, CODE-14, CMD-02, CODE-01, CMD-01 (6) | Audit report quotes constructs as evidence |

**Judgment: narrow and justified.** 49 of 61 entries are single-file
+ single-pattern with a stated reason; the 12 directory entries are
each still single-pattern (the eval-fixture directory is 11
per-pattern entries for prompts that are the test inputs by design;
the agentic-seo CMD-04 entry covers the vendored directory's
unpinned-install occurrences, documented in Stage B as 32, and
excepts only CMD-04 there — every other pattern still scans that
directory). The matcher is hardened against prefix-sharing files
(`matchesPrefix`, `:303`). The one structural note: this report
itself carries **no** exception entry — it was written to describe
flagged constructs without reproducing their literal forms, and the
post-write re-run (§2) confirms it contributes zero findings (the
re-run's single finding is in the sibling CI validation report,
not here).

**Line-level ignores — gated (A5-07).** `IGNORE_ALLOWLIST` (`:196`)
holds 32 (file, pattern) pairs: 1 production use
(`scripts/install/commands.mjs`, CMD-01 — the S-08 warning string
quoting the command users must not run), 26 in
`test/security.test.mjs`, 5 in `test/scanner.test.mjs`. No bare
(unscoped) marker is allowlisted anywhere. Any non-allowlisted use
is a HIGH finding (IGNORE-01) and suppresses nothing — fail-closed.

**Binary hash verification (A5-09).** Every binary file's SHA-256
must match `sources/binary-hashes.json`; a mismatch (HASH-01), an
unreadable listed file (HASH-02), a malformed manifest (HASH-03),
or an unlisted binary (HASH-04) fails the scan. All 4 hashes
verified in this run and independently recomputed (§9).

**Honest limit.** The scanner is a pattern-based smoke screen, not
SAST: line regexes over text, plus a byte-level secret scan over
binaries. It cannot find vulnerabilities that do not match a pattern
shape. Semgrep (§6) and CodeQL (§7) are the deeper layers.

## 6. Semgrep SAST — clean in CI and locally

**CI evidence (PR #4, run 44944634176).** The Security audit workflow
run completed with conclusion `success` (head `b3a6f34`, 2026-11-21).
Its Semgrep (SAST) job (job 136969124684) succeeded; the job log
records the run command `semgrep --config p/javascript --error
scripts/ test/ evals/` and the summary line:

```text
Ran 68 rules on 43 files: 0 findings.
```

The install step is `pip install semgrep==1.186.0` (version-pinned;
see the A4-06 residual in §9). This is the job's first-ever CI run —
it was added in `b619388`, after PR #1 merged, so no earlier run
exists.

**Local run (this audit).** The pre-existing venv at
`/tmp/semgrep-venv` was still present (Semgrep 1.186.0, verified with
`--version`); no reinstall was done. Running the same scope locally
produced an identical result: **68 rules on 43 files, 0 findings,
0 errors**. (Note: `ai/PROJECT-STATUS.json` says the local run
"matched at 42 files" — that refers to an earlier local run; the
current local and CI counts are both 43.)

**Scope limit.** Semgrep covers `scripts/`, `test/`, and `evals/`
only — first-party JavaScript. Vendored upstream JavaScript is not
in Semgrep's scope here; it is covered by CodeQL (§7) instead.

## 7. CodeQL — 0 open alerts

Verified via the GitHub API (`gh api
.../code-scanning/alerts`), not assumed from the triage record. All
5 alerts are **dismissed**; **0 open**.

| # | Rule | Severity | Location | Dismissed | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | `js/regex-injection` | error | `skills/upstream/vercel/vercel-optimize/lib/verify-claim.mjs:1211` | 2026-11-21T19:21:41Z | won't fix |
| 2 | `js/reflected-xss` | error | `skills/upstream/superpowers/brainstorming/scripts/server.cjs:405` | 2026-11-21T19:21:31Z | false positive |
| 3 | `js/incomplete-sanitization` | warning | `skills/upstream/vercel/vercel-optimize/lib/cost-coverage.mjs:142` | 2026-11-21T19:21:33Z | won't fix |
| 4 | `js/incomplete-sanitization` | warning | `skills/upstream/vercel/vercel-optimize/lib/render-report.mjs:915` | 2026-11-21T19:21:36Z | won't fix |
| 5 | `js/incomplete-sanitization` | warning | `skills/upstream/vercel/vercel-optimize/lib/workspace-resolver.mjs:162` | 2026-11-21T19:21:37Z | false positive |

All 5 are in `skills/upstream/` (verbatim imports; fixes belong
upstream). The dismissal reasons match the triage record in
`ai/audits/SECURITY-STATUS.md` ("CodeQL alerts — triage"), which
documents the per-alert reasoning (user-supplied pattern in a local
CLI; reflected value is the server's own token; cosmetic Markdown
escaping; local path resolution). The alerts were created
2026-11-21T17:11:11Z by the first CodeQL run (PR #1, run 44933250387)
and dismissed the same evening. The CodeQL workflow does not fail on
alerts. A4-03 is **fixed** (triaged, dismissed, recorded).

## 8. Installer security

Read from the code; all citations are to the current HEAD. No
child-process execution exists anywhere in `scripts/install/` (grep
for `child_process`, `execSync`, `spawnSync`, `execFile`: no hits) —
the installer is pure file operations.

### Manifest validation on read — fail-closed

`scripts/install/manifest.mjs`. A project-scope manifest travels via
git, so entries are treated as untrusted input. `readManifest`
(`:275`) returns `corrupt` — and update/uninstall refuse the
manifest — when any entry fails `validateEntry` (`:244`), which
checks kind, name (single segment), manifest-key consistency, and
paths. `validateEntryPaths` (`:228`) requires `destName` to be a
single path segment not starting with `.`, and requires
`destName` to match the entry name (`<name>` for a skill,
`<name>.md`/`<name>.toml` for agents/workflows), so a crafted entry
cannot make uninstalling one item delete another. `entryRoot` /
`entryDest` (`:337`, `:345`) defensively re-validate on every use
and throw on an invalid entry.

### Tier-2 manifest root climb — capped (A5-12, fixed)

`validateRootShape` (`:160`) requires a non-`.` root to climb with
leading `..` segments and then descend to a directory named
`agents`, `workflows`, or `global_workflows` (kind-matched: agent
entries must end in `agents`, workflow entries in `workflows` or
`global_workflows`). The climb is capped at `MAX_ROOT_CLIMB = 3`
(`:138`, enforced `:165-166`): the deepest legitimate root in any
documented target is two levels, so the cap leaves one level of
headroom while bounding a crafted manifest to at most three
directories above the skills dir — and still only into an
agents/workflows directory, a location the installer legitimately
writes to anyway. Skill entries cannot escape at all: any root other
than `.` is rejected for a skill (`:192` tier-1/tier-2 path, skill
branch). Tier-1 exact matching applies whenever target/scope are
known and the skills dir is the target's documented one.

### Restore-id rules

`scripts/install/backups.mjs`. `readBackup` (`:247`) and
`recoverBackupRecord` (`:294`) validate the id as a single path
segment, then require it to match an existing backup **directory**
(`lstat` + `isDirectory()`, `:260`, `:305` — a planted symlink is
rejected). The backup record itself is validated
(`validateBackupRecord`, `:196`) before it is returned.

### Uninstall backup behavior — A5-02 fixed

`scripts/install/commands.mjs:1170-1250`. Uninstall classifies each
target as `absent`, `remove`, `modified`, or `foreign`, with a
`needsBackup` flag: modified and foreign content is always backed up
before removal. The A5-02 gap is closed at `:1222`: a link-method
manifest entry whose destination is **not** a symlink (a real
directory — user-replaced content, or a crafted manifest claiming
`method: 'link'` over user content) is now classified `modified`
with `needsBackup: true` instead of being removed unbacked-up.
Doctor already flagged this shape as fail (`:844-846`); uninstall
now agrees with its own diagnostic. Backup failure refuses the
removal (`:1333`).

### Install lockfile

`scripts/install/lock.mjs`. `acquireLock` (`:99`) creates the lock
exclusively; a lock is taken over only when it is older than
`STALE_LOCK_MAX_AGE_MS = 10 * 60 * 1000` (`:36`) — the age
requirement guards the pid check, and a lock path that is a
directory is never stale. Lock removal only removes a lock that is
still ours (`:121`). The 10-minute stale window is a known residual
(see §13).

### Atomic writes with rollback

`scripts/lib/atomic-write.mjs:47` — `atomicWriteFile` writes a temp
file with `flag: 'wx'` (A5-10 fixed: exclusive creation, no
symlink-follow) and renames with exponential-backoff retries on
transient Windows lock errors (10 attempts, 25 ms → 400 ms).
`scripts/install/installer.mjs`: `swapIn` (`:459`) swaps staged
content in with two renames and rolls the old content back if the
second rename fails, reporting both errors if the rollback also
fails; `verifyStaged` (`:510`) verifies staged content against the
library **before** the swap, so a copy that differs never reaches
the destination; `rollbackFromBackup` (`:563`) restores from backup
when post-swap verification fails, so bad content does not stay
live. (Prior record notes the post-swap branches are covered at
unit level only — carried, not re-verified here.)

### Dry-run read-only-ness

`commands.mjs:533-560` (install): a dry run reads the manifest
read-only and never quarantines a corrupt one (quarantining renames
the file — a mutation); it prints the plan and returns before any
execute step. Uninstall dry-run (`:1302-1310`) prints what would be
removed/skipped/refused and returns 0 without touching disk. No
lock is taken for dry runs (`:108`, `:314`).

### Windows junction removal — proven (A5-11, fixed)

The PR #4 Windows job log (job 136969176768, conclusion success)
shows: "A5-11 (junction): uninstalling a real Windows junction
removes only the junction; the library source survives intact"
(passed, 175 ms). Junction creation and removal are now both proven
on a real runner, closing the last Stage D "no real Windows
execution" gap.

## 9. Supply chain

**Zero npm dependencies — verified.** `package.json` has no
`dependencies`, `devDependencies`, `peerDependencies`, or
`optionalDependencies`; `engines` is `node >= 24`; the package is
`private`. No lockfile of any kind exists (`package-lock.json`,
`yarn.lock`, `pnpm-lock.yaml` all absent). There is nothing for
`npm audit` to audit; the security workflow handles the ENOLOCK
case explicitly.

**Binary assets — SHA-256-pinned and independently recomputed.**
`source
...[truncated 12208 chars]
### Supply chain (continued)

**GitHub Actions — SHA-pinned, spot-checked.** All 22 `uses:` lines
across the 6 workflow files are 40-character SHA pins; zero
tag-pinned actions. Verified against upstream tags via
`git ls-remote`: the checkout pin (`fbc6f39…`) equals the current
`refs/tags/v5` tip, and the setup-node pin (`a0853c2…`) equals the
current v5 tip. The codeql-action pin (`1bd86f2…`) is a real commit
(2026-11-20, the v4.39.4 release merge) but the v4 tag has since
moved past it — pinned SHAs remain safe; this is staleness, not a
wrong pin, and Dependabot raises the bumps (A4-07, post-re-merge).
SHA-pinning is by convention, not enforced: repo Actions settings
have `sha_pinning_required: false` (A4-09, owner action).

**A4-06 residual — documented, not fixed.** The Semgrep CI job
(`.github/workflows/security-audit.yml:63-98`) installs with a PyPI
version pin only (`pip install semgrep==1.186.0`, `:95` —
transitive dependencies unpinned, no `--require-hashes` lockfile)
and resolves `--config p/javascript` from the Semgrep Registry at
runtime (`:98`). The workflow comment (`:70-88`) documents this
honestly as a residual, including the reason no lockfile was added
(it must be generated against the runner's Python version, which
was unconfirmed before the job's first run) and the bounding
argument (a compromised or withdrawn release breaks the run loudly
rather than passing silently). **Status update for this audit:**
the job's first run has now landed (PR #4, §6), so the documented
follow-up — generate the hash-pinned lockfile and pin the ruleset
version — is unblocked. One clause of the comment is now stale: it
still says the job "has never run in CI yet (A4-01)". The job also
has a 10-minute timeout (`:89`); all 12 jobs across the 6 workflows
now carry `timeout-minutes` (A4-08 fixed; Phase A found 1 of 12).

**Other supply-chain notes.** A `CODEOWNERS` file exists
(`.github/CODEOWNERS`, A4-11). The docs-level note that `npx skills
add` fetches Vercel's `skills` CLI unpinned is carried from Stage D
(not re-verified this round).

## 10. Secrets — none found

- The repository scanner (§5) applies the SEC-01–SEC-07 patterns
  over every text file plus a byte-level secret scan over the 4
  binary files: **PASS, no findings**.
- GitHub API, verified for this audit: secret scanning **enabled**,
  push protection **enabled**, Dependabot security updates
  **enabled**; secret-scanning validity checks **disabled** and
  non-provider patterns **disabled** (A4-10, owner action). Zero
  secret-scanning alerts (0 total, 0 open). No repo secrets were
  listed in the Phase A check (not re-queried here; the API does not
  expose secret values).
- No credential value appears anywhere in this report, and none was
  read during this audit.

## 11. Phase E items

### E-01 — process exit truncating piped stdout — FIXED

The fix (set `process.exitCode` and let the process exit naturally
instead of calling the hard exit) is present in
`scripts/validate-registry.mjs:345`, with the explanatory comment
at `:342`. Eleven scripts under `scripts/` now set
`process.exitCode` (counted, not assumed). **Residual:** the same
class survives in `scripts/check-upstream.mjs:236`, which still
calls the hard exit with code 0 after printing its full report to
stdout — a piped run can still lose the tail. Several other scripts
retain hard exits on usage-error paths only (stderr output, low
risk: `check-status.mjs`, `query-skills.mjs`, `check-links.mjs`,
`check-sources.mjs`). The `check-upstream.mjs:236` case is the one
worth fixing; it is a stdout-truncation bug, not a security issue.

### E-02 — status JSON tripping CODE-14 — FIXED

`ai/PROJECT-STATUS.json` contains **zero** occurrences of the
TLS-disable literal (`grep -c` returns 0). The S-09 wording was
reworded to prose ("TLS verification disabled"). The file scans
clean as part of the §5 run.

## 12. Phase C security fixes re-verified this round

Only items personally verified in this audit are listed. Other
Phase C fixes are covered by `ai/audits/RELEASE-ACCEPTANCE.md`.

| Finding | What was checked | Result |
| --- | --- | --- |
| A2-04/A5-01 | Scanner extension list + content-sniffing code | Fixed: `cjs/html/xml/txt` + extensionless files scanned |
| A5-13 | CMD-01 and multi-line regexes | Fixed: wget and substitution forms covered |
| A5-07 | Ignore allowlist + gate logic | Fixed: 32 allowlisted pairs; unauthorized use is a HIGH finding |
| A2-15 | `SKIP_FILES` contents | Fixed: only the pattern library is skipped; test files scanned |
| A5-09 | Hash verification code + manifest + recomputation | Fixed: 4/4 hashes verified, independently recomputed |
| A5-10 | `atomicWriteFile` temp-file creation | Fixed: exclusive creation flag |
| A5-11 | PR #4 Windows job log | Fixed: real-junction uninstall test passed on a real runner |
| A2-10 | Upstream-check fetch code | Fixed: 15 s timeout + one retry |
| A4-08 | `timeout-minutes` across workflows | Fixed: 12 of 12 jobs |
| A5-02 | Uninstall classification code | Fixed: non-symlink at a link-entry path is backed up, not deleted |
| A5-12 | `MAX_ROOT_CLIMB` | Fixed: tier-2 climb capped at 3 |
| A4-01 | CI on the branch HEAD | Fixed in substance: PR #4 ran the full pipeline (Security audit run 44944634176 success; Windows job success); the full 9/9 check list was not re-verified here |
| A4-03 | CodeQL alerts API | Fixed: 0 open, 5 dismissed with reasons |
| A4-11 | `.github/CODEOWNERS` | File exists (contents not reviewed) |

## 13. Residual risks

1. **S-08 (High, upstream).** The unsafe install text is unchanged
   upstream. Anyone reaching the agentic-seo repo directly can still
   follow it. Only upstream action or dropping the skill closes it.
2. **S-09 / S-11 (Medium, upstream).** The flawed script and the
   insecure TLS guidance persist in vendored upstream content.
   Upstream follow-up is owed for all three items.
3. **S-14 (Medium).** The import still trails the author's live repo
   by 50 commits; the drift is now visible, but the vendored copy
   still misses those commits until a re-import re-points the source.
4. **A4-06 (Low).** Semgrep's CI install is an unhashed PyPI pin
   with a runtime-fetched ruleset. The documented lockfile follow-up
   is now unblocked (first CI run landed).
5. **A4-02 (High, owner decision).** Branch protection is still not
   enabled on `main`: all CI is advisory, and any push to `main`
   bypasses every check. "Gating" currently means only "the job
   fails the run," not "the job blocks merging."
6. **A4-09 / A4-10 (Low, owner actions).** SHA-pinning is not
   enforced at the repo level; secret-scanning validity checks and
   non-provider patterns are disabled.
7. **Scanner limits (accepted).** The repo scanner is pattern-based,
   not SAST; Semgrep covers first-party JS only; CodeQL is the
   layer covering vendored upstream code.
8. **Stale-lock window (Low).** A lock is taken over after 10
   minutes; a genuinely long-running install on a slow machine could
   in theory have its lock taken. The pid check bounds this.
9. **Post-swap verification branches (Low, carried).** The rollback
   path exists in code (§8); the prior record notes its branches are
   covered at unit level only.
10. **E-01 residual (Low, not security).**
    `scripts/check-upstream.mjs:236` still hard-exits after printing
    to stdout.

## 14. Owner actions

1. **Decide the S-08 disposition** (§3.5, options 1–3). This is the
   only decision standing between the current state and a production
   verdict on security grounds.
2. **Upstream follow-up** for S-08, S-09, and S-11 with the
   agentic-seo author and Prisma — owed since Phase 7, still open.
3. **S-14 re-point decision** at the next re-import: re-import
   agentic-seo from the author's live repo (or confirm the fork
   deliberately), and update the pin source.
4. **Branch protection** (A4-02): enable on `main` with the required
   checks, when ready to give up direct pushes.
5. **Repo settings** (A4-09, A4-10): set `sha_pinning_required` to
   true; enable secret-scanning validity checks and non-provider
   patterns.
6. **Semgrep lockfile** (A4-06): generate the hash-pinned
   requirements file and pin the ruleset version, now that the
   job's first CI run has landed; fix the stale "never run in CI
   yet" clause in the workflow comment.
7. **Dependabot bumps** (A4-07): accept the checkout/setup-node
   major bumps after re-merge (their v7 releases postdate the
   current v5 pins).

## 15. What this audit did not verify

- S-01–S-07, S-10, S-12, S-13, S-15 individually (carried from
  Stage E; see §4).
- The full 9/9 PR #4 check list (the Security audit run and the
  Windows job were verified; the remaining checks were not
  individually re-queried).
- Whether the Semgrep ruleset version fetched at runtime in CI
  matches the local one (the ruleset is unpinned — that is A4-06).
- The contents of `.github/CODEOWNERS` (existence only).
- Any real-model evaluation run (no credentials; not part of this
  audit).
- The `npx skills add` unpinned-CLI note (carried from Stage D).

## Appendix A — Evidence index

- Scanner: `scripts/security-scan.mjs` (EXCEPTIONS `:84`,
  IGNORE_ALLOWLIST `:196`, TEXT_EXT `:68`, matcher `:303-307`,
  hash check `:437-483`, exit `:505`); patterns:
  `scripts/lib/security-patterns.mjs` (34 total; CODE-14 `:205`).
- Upstream check: `scripts/check-upstream.mjs` (live compare
  `:135-187`); pins: `sources/imported-skills.md:108`.
- Warnings: `scripts/install/commands.mjs:78-93, 413-415, 840-841`;
  safe-install guide: `docs/AGENTIC-SEO-SAFE-INSTALL.md`
  (S-08 path `:80-92`; S-09 § `:112-168`).
- Installer: `scripts/install/manifest.mjs` (validation `:138-345`,
  `MAX_ROOT_CLIMB` `:138`); `scripts/install/backups.mjs:196-305`;
  `scripts/install/commands.mjs:1170-1250` (uninstall),
  `:533-560` (dry-run); `scripts/install/installer.mjs:459-576`
  (swap/rollback); `scripts/install/lock.mjs:36-174`;
  `scripts/lib/atomic-write.mjs:47-63`.
- CI: `.github/workflows/security-audit.yml:63-98` (Semgrep job,
  A4-06 comment `:70-88`); run 44944634176, job 136969124684
  (Semgrep); job 136969176768 (Windows, A5-11).
- CodeQL: `gh api .../code-scanning/alerts` (5 dismissed,
  2026-11-21T19:21:31–41Z); triage:
  `ai/audits/SECURITY-STATUS.md` ("CodeQL alerts — triage").
- Supply chain: `package.json` (no dependencies, engines
  `>=24`); `sources/binary-hashes.json` (4 assets).
- Repo settings: `gh api repos/luxmanbhattarai/SkillForge`
  (secret scanning, push protection, Dependabot enabled;
  validity checks and non-provider patterns disabled);
  branch protection endpoint returns HTTP 404.
- Prior audits: `ai/audits/SECURITY-AUDIT.md`,
  `ai/audits/SECURITY-STATUS.md`,
  `ai/audits/PRODUCTION-READINESS-AUDIT.md` (§6 prior findings,
  §7.3 S-08 verdict question).

## Appendix B — Counts in this report and where each came from

| Count | Value | Source |
| --- | --- | --- |
| Text files scanned | 1,121 at audit time; 1,124 at post-write re-run (see §2) | `npm run check:security` output, this audit |
| Binary files scanned | 4 | Same |
| Scan-scope patterns | 29 | Same; module import count |
| Total patterns | 34 | Module import count (scan 29, score 11, input 9) |
| Scanner exceptions | 61 | Counted from `EXCEPTIONS` in `scripts/security-scan.mjs` |
| Ignore-allowlist pairs | 32 | Counted from `IGNORE_ALLOWLIST` |
| Binary hashes verified | 4 | Scanner output + independent recomputation |
| Semgrep rules / files / findings | 68 / 43 / 0 | CI job log + local run |
| CodeQL alerts open / dismissed | 0 / 5 | GitHub API |
| Secret-scanning alerts | 0 | GitHub API |
| Live-upstream lag (agentic-seo) | 50 commits | `npm run check:upstream` output |
| Workflow `uses:` lines, all SHA-pinned | 22 | Grep over `.github/workflows/` |
| Jobs with `timeout-minutes` | 12 of 12 | Counted per workflow file |
| Scripts setting `process.exitCode` | 11 | Grep over `scripts/` |
| `MAX_ROOT_CLIMB` | 3 | `scripts/install/manifest.mjs:138` |
| Stale-lock window | 10 minutes | `scripts/install/lock.mjs:36` |

## Addendum — 2026-11-21 (coordinator, same day)

Three items from §2/§3 were actioned after this audit was written; the
audit body above is left as the point-in-time record.

1. **Sibling finding fixed.** The `CI-VALIDATION-REPORT.md:81` [CODE-14]
   finding was fixed the same way as E-02: the literal TLS-disable
   construct was reworded to prose ("Python `verify` set to false").
   Re-run: `npm run check:security` **PASS, 0 findings, 1,124 text
   files** (before `RELEASE-ACCEPTANCE.md` was added).
2. **E-01 class closed in `check-upstream.mjs`.** The residual noted in
   this audit (`check-upstream.mjs:236` hard-exiting after printing)
   was converted to `process.exitCode` with the same comment as the
   other ten scripts; `npm run check:upstream` re-run exits 0 with
   full output. Files in `scripts/` setting `process.exitCode`: 12.
3. **Stale wordings fixed.** The A4-06 workflow comment's "never run
   in CI yet" clause now records the PR #4 runs and the unblocked
   lockfile follow-up; the safe-install guide's "(planned)" doctor
   warning now reads "(implemented)".

## Addendum — 2026-11-21 (Phase 3, Final Staging Validation)

Phase 3 re-verified S-08, S-09, S-11, and S-14 from scratch — every
prior claim re-derived by reading or by execution, none assumed —
plus D1, a genuine defect in the drift check routed from Phase 6+8.
Work started at HEAD `be03f2c`; sibling phases committed in the same
checkout while this work ran, so the verifications below ran at HEAD
`41bba4a` plus the uncommitted Phase 3 changes described here. The
audit body above is left as the point-in-time record; this addendum
is the Phase 3 record. Two small fixes were implemented (warning
coverage, D1), each with regression coverage inside existing tests —
no new test call sites, so the guarded test counts did not move
(326 tests, 332 static call sites; `check:status` 0 failures).
Nothing under `skills/upstream/` was edited; no upstream content was
imported. Like the audit body, this addendum describes flagged
constructs in prose and never reproduces their literal forms, so it
contributes zero scanner findings (verified: the post-edit scan
passes, 1,128 text files + 4 binary, 0 findings).

### What was verified by execution vs by reading

Executed: `npm run check:upstream` live, twice (before and after the
D1 fix); sandbox installer probes — dry-run, real install, re-run,
and update dry-run of the `seo` skill, before and after the warning
fix; `sha256sum` of the vendored `install.sh`; `node --test` on both
affected test files; `npm run check:security`; `npm run check:status`;
GitHub API reads of the live upstream head (compare + file contents)
— read-only, no import. Read in full: the installer warning and
execute paths (`scripts/install/commands.mjs`), `scripts/
check-upstream.mjs`, the vendored `broken_links.py` / `fetch_page.py`
/ `README.md` / `install.sh` / Prisma files, the safe-install guide,
the pins file, the scheduled-maintenance workflow, and the scanner
pattern library. Verified by reading only: the three-line `main()` →
`runCheck()` wiring in `check-upstream.mjs` (the exit-code behavior
itself was verified by execution through `runCheck` and the tests),
and the claim that no workflow other than scheduled-maintenance runs
the drift check (grep over `.github/workflows/`).

### S-08 — High — Agentic SEO documents an unsafe install — MITIGATED (unchanged)

**Unsafe text still present, re-confirmed.** `skills/upstream/
agentic-seo/seo/README.md:109-110` (curl-pipe install, split across
two lines), `seo/install.sh:57-58` (same form in the usage text),
`seo/install.sh:222` (remote mode does an unpinned `git clone
--depth 1` of `main`; `REPO_URL` defaults to the author's repo at
`:4`). No checksums or signatures anywhere in the upstream path.

**Enforcement analysis — the mitigation is advisory, not a gate,
and it had two coverage holes (now fixed).** The installer itself
never executes the unsafe install: there is no child-process
execution anywhere in `scripts/install/` (grep for the process-
spawning calls returns nothing there — the installer is pure file
operations), and the installed `install.sh` is non-executable
(vendored mode `-rw-rw----`, preserved on install — verified by
execution), so it takes an explicit `bash install.sh` or the
documented curl-pipe to run it. The warning mechanism, however, only
fired on a fresh install/update (`commands.mjs:431-433`, once per
run, stderr). Sandbox probes before the fix proved the holes: a
dry-run install of `seo` warned about nothing, a re-run that found
`seo` already installed warned about nothing, and an update dry-run
warned about nothing — so the careful path (preview first) and every
user who installed before the warnings existed never saw them. The
fix (this phase): the plan printer now warns on dry runs
(`printPlan`, `commands.mjs:296-304`) and the execute path warns for
already-installed items (`:455-457`), sharing the once-per-run flag
(`:383`); install/update (`:431-433`) and doctor (`:867-868`) sites
are unchanged. Post-fix probes: dry-run, install, re-run, and update
dry-run each warn exactly once per finding; a non-agentic control
skill stays silent in all four paths. The real exposure remains
use-time, not install-time: an agent (or user) reading the installed
README can still follow the documented install, and nothing warns at
that moment. The `seo` skill's own workflow does not invoke the
installer, but its README is on disk after every install.

**What was considered and rejected.** A confirmation gate before
installing `seo` would break non-interactive installs, and any bypass
flag reintroduces silent bypass. A hard installer block is removal by
another name — an owner decision, not an installer default. Stripping
`install.sh` / `README.md` from the installed copy would break the
installer's own staged-content verification, which compares staged
content against the library. The restore path still does not warn
(restores content the user already had installed — marginal, noted
here, not fixed). The warning can still be missed in the scrollback
of a full-library run; an end-of-run re-print is possible future
hardening, not done here (it would change the deliberate once-per-run
property the tests pin).

**Recommended owner decision: (a) keep the skill with mandatory
warnings + safe-install guidance.** This addendum makes the
recommendation §3.5 left open. (b) is not available as a small,
honest installer fix for the reasons above; (c) has no target — no
equivalent alternative skill exists in the library, and the vendored
install *is* the pinned, integrity-verified path (byte-identical to
pin `67775741…`, re-verified Phase G); (d) is disproportionate — it
removes a unique skill for a risk SkillForge never executes, and the
residual is bounded to users or agents who independently follow the
README. Upstream follow-up is still owed, and a re-import does not
close S-08: the live head still documents the curl-pipe install
(author's README `:152-161` at `445c46c2`) and its installer still
clones unpinned `main` (`:639`).

### S-09 — Medium — `broken_links.py` disables TLS verification — MITIGATED (unchanged for the vendored copy; FIXED upstream at live head)

**Still present in the vendored copy, re-confirmed.**
`skills/upstream/agentic-seo/seo/scripts/broken_links.py:71` (HEAD)
and `:76` (GET fallback) disable TLS certificate verification,
silently. The oversight reading holds: the same script's initial page
fetch (`:131`) keeps verification on, and the sibling `fetch_page.py`
has no verification override at all and handles `SSLError`
explicitly (`:110`).

**SkillForge never executes the script and its own network
validation is unaffected.** A repo-wide grep for references finds
only docs/audit mentions and a path fixture
(`test/paths.test.mjs:29`); no first-party code invokes the script.
`scripts/check-links.mjs` uses the global fetch with default TLS
validation (`fetchWithRetry`, `:284-286`, `fetchFn = fetch`;
`checkUrl`, `:318`), and the eval model provider likewise
(`evals/runners/providers.mjs:206`, `globalThis.fetch`). The
exposure is real but bounded and use-time: the skill's own workflow
prescribes running the script (`seo/SKILL.md:117`), so agents
following the skill *will* run it, and the warning is install-time
only — nothing warns at execution time. The data at stake is public
link statuses, so the blast radius stays as the safe-install guide
states it. There is no drop-in replacement script in the library;
the documented secure alternatives are the guide's re-check tools
(a verifying client or `fetch_page.py`) and the first-party link
checker for repo links. A patched vendored copy is forbidden by the
verbatim policy.

**New finding: S-09 is fixed upstream at live head `445c46c2`.**
Read via the GitHub API (no import performed): the live
`broken_links.py` routes its per-link checks through `safe_head` /
`safe_get` from `scripts/lib/safe_http.py`, which forces
verification on (`:149`). The vendored copy predates that refactor.
**Recommendation: keep mitigated for the vendored copy; close via
the S-14 reviewed re-import, not by patching the vendored copy.**
Upstream follow-up for the fix itself is moot — upstream already
fixed it; the follow-up now is the re-import decision.

### S-11 — Medium — TLS-disable guidance — MITIGATED (unchanged)

**Confirmed upstream-only, with a complete re-grep.**
Searching the whole repo outside `skills/upstream/` for the
TLS-disable constructs returns only the pattern definition itself
(`scripts/lib/security-patterns.mjs:205`), audit-doc quotes (each
per-file excepted), prose in `ai/PROJECT-STATUS.json`, and test
fixtures (allowlisted line-level ignores). **No first-party code or
guidance recommends disabling TLS certificate validation.** A second
grep for the wider family — the curl insecure flag,
`CURLOPT_SSL_VERIFYPEER`, `check_hostname`, unverified-context
constructors, `CERT_NONE`, `InsecureSkipVerify` — returns zero hits
outside `skills/upstream/`. The upstream-only inventory is exactly
four occurrences, matching the prior audit with no new ones:
`broken_links.py:71,76` (S-09) and `prisma-upgrade-v7/SKILL.md:244`
plus `references/driver-adapters.md:203` (S-11); the same Prisma
doc shows the verifying form at `driver-adapters.md:215`.
First-party TLS verification is enabled wherever this repository
fetches over the network (`check-links.mjs`, `:284-286`;
`providers.mjs:206`). No owner decision is needed beyond the
standing upstream follow-up for Prisma, still owed.

### S-14 — Medium — Agentic-seo import tracks a dormant fork — MITIGATED (unchanged label; monitoring re-verified working; D1 fixed)

**The drift check genuinely checks the live upstream — re-verified
live.** `sources/imported-skills.md:105-108` carries the fork source
plus the `Live upstream:` line; `parsePins` (`:68`) parses it,
`comparePin` (`:135`) compares a pin against a repo's head, and
`checkVendor` (`:162-187`) runs the primary fork check and then the
same pin against the live repo. A live run on 2026-11-21 (run twice,
before and after the D1 fix) reports all 6 vendors up-to-date
against their pinned repos, the agentic-seo fork head at
`67775741` (2026-03-03), the live head at `445c46c2` (2026-10-14),
and **BEHIND: 50 commits** — the gap is unchanged since Phase G. The
compare API confirms `ahead_by` 50, `behind_by` 0: the pin is a
strict ancestor of the live head, no divergence. The remaining fork
references are consistent pin-source records, not stale pointers —
`registry/sources.json:338`, `scripts/lib/registry-sources.json:6`,
`skills/upstream/agentic-seo/ATTRIBUTION.md:3` — and they are the
re-point touchpoints listed below.

**New findings from reading the live head (API reads only, no
import).** (1) S-09 is fixed upstream there (see S-09). (2) S-08 is
*not* fixed upstream: the live README still documents the curl-pipe
install (`:152-161`, now with an `--online` flag) and the live
installer still clones unpinned `main` (`:639`) and fetches the
latest release (`:561`, `:587`). (3) The live repo restructured —
files now sit at the repo root (`README.md`, `install.sh`,
`scripts/`) instead of under `seo/` — so a re-import is not a
fast-forward and the import mapping must change. (4) The 50 commits
add unreviewed features (a new GitHub-SEO skill area, `.env`
credentials support, `install.ps1`, and a PowerShell invocation
that bypasses the execution policy in the install docs) — a
re-import needs a full re-audit, not a blind update. (5)
`docs/SECURITY-SCANNING.md:102-110` still describes the pre-fix
behavior ("the weekly check reports agentic-seo UP-TO-DATE while the
author's live repository is 50 commits ahead") — stale since the
live-compare fix landed; flagged here for the coordinator, not
edited (file outside Phase 3 scope). (6) The weekly scheduled run
(`.github/workflows/scheduled-maintenance.yml:97`) has still never
executed on GitHub, so the live-drift signal currently surfaces only
from local runs.

**D1 — fixed this phase (routed from Phase 6+8).** When upstream
checks returned UNKNOWN — a monitoring failure, e.g. a network
outage or a deleted/renamed repo — the script exited 0, so a total
monitoring failure produced a green scheduled-maintenance run,
visible only in logs. The fix: `main()` is now a thin wrapper over
an exported `runCheck()` (`scripts/check-upstream.mjs:197`), which
returns 1 when any primary vendor is UNKNOWN *or* any live-upstream
check is UNKNOWN (`:263-271`) — the live compare counts because the
S-14 drift signal is blind when it cannot run — and 0 otherwise, so
drift (BEHIND/AHEAD/DIVERGED) stays informational. The header
comment now states the rule. Regression coverage extends the
existing S-14 test (`test/audit-fixes-c2-evals.test.mjs:215`): live
drift still exits 0, a stubbed refused connection exits 1 with the
UNKNOWN notice on stderr, and a live-only failure exits 1. The
affected file passes 21/21, and the live run after the fix still
exits 0 (6 up-to-date, live BEHIND 50). Two doc statements stay
true and needed no edit: `docs/ARCHITECTURE.md:157` ("exits 0 on
drift") and `docs/TROUBLESHOOTING.md:134` ("exits 0 even when
upstreams moved") — drift still exits 0; only the inability to
check now fails. The only caller is the scheduled-maintenance
workflow, which has no `continue-on-error`, so a monitoring failure
now fails that job visibly, as intended.

**Recommended owner decision — two steps.** (1) **Re-point the pin
source to the author's repo at the same commit `67775741`** — zero
content change (the vendored files are byte-identical to that commit
in the author's repo, re-verified Phase G), and the primary status
then honestly reports BEHIND 50 instead of UP-TO-DATE; touchpoints
are `sources/imported-skills.md`, `scripts/lib/registry-sources.
json`, `registry/sources.json` (generated), and `ATTRIBUTION.md`.
(2) **Schedule a reviewed re-import from live head `445c46c2`** — it
would close S-09, but it requires a full re-audit (layout change,
new features, S-08 still open). Do not re-import blindly, and do not
keep the fork pin as the long-term source: the fork is dormant and
the author's repo is the live upstream.

### Safe-install guide fact-check — no errors found, not updated

`docs/AGENTIC-SEO-SAFE-INSTALL.md` was fact-checked line by line
and every checkable claim held: the `install.sh` SHA-256 matches the
vendored file exactly, the file is 280 lines, all cited line
references are correct (README `:109-110`, `install.sh` `:57-58`
and `:220-230`, `broken_links.py` `:71` / `:76` / `:131`), the
50-commit gap is still current, and the doctor warning now reads
"(implemented)". Per the Phase 3 scope rule the guide was therefore
left untouched.

### Fix record (Phase 3)

| Fix | Files | Verification |
| --- | --- | --- |
| S-08/S-09 warning coverage: warn on dry runs and already-installed runs | `scripts/install/commands.mjs` (`printPlan` `:296-304`, already branch `:455-457`); test extended in `test/installer.test.mjs:1518` | `node --test test/installer.test.mjs`: 97/97 pass; 6-point sandbox probe post-fix (dry-run/install/re-run/update dry-run warn, controls silent) |
| D1: UNKNOWN exits non-zero, drift stays informational | `scripts/check-upstream.mjs` (`runCheck` `:197`, exit rule `:263-271`); test extended in `test/audit-fixes-c2-evals.test.mjs:215` | `node --test test/audit-fixes-c2-evals.test.mjs`: 21/21 pass; live `npm run check:upstream` still exits 0; stubbed-refusal execution returns 1 |

Both regressions extend existing tests, so no new test call sites
were added and the guarded counts are unchanged (326 tests, 332
static call sites; `npm run check:status` reports 0 failures).
`npm run check:security` passes after all edits (1,128 text files +
4 binary, 0 findings; the file count rose from the Phase G 1,125
because sibling phases added files).
