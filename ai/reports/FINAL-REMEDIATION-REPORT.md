# Final Remediation Report — SkillForge Production Readiness Audit

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (from `main` @ `bc304a2`)
- **Head at remediation start:** `2f1460b` (implementation report head) /
  `0c8bd48` (remediation plan committed)
- **Head at remediation end:** {{FINAL:HEAD}} (74 commits
  ahead of `main`; 475 files changed, +89,111/−1,234)
- **Rule throughout:** local commits only; nothing pushed, merged, PR'd,
  or tagged. The user confirmed the branch currently cannot be pushed
  to the repo, so no remote CI run was possible at any point.
- **Companion documents:** `ai/remediation/VERIFICATION-MATRIX.md`
  (16-claim verification), `ai/remediation/ISSUE-REGISTER.md` (all 52
  issues with stage status lines), `ai/audits/SKILL-AUDIT-MATRIX.md`
  (51-skill audit), `ai/audits/SECURITY-STATUS.md` (S-01–S-15),
  `ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md` (acceptance
  criteria with evidence), `ai/remediation/STAGE-B-RESULTS.md`,
  `ai/remediation/STAGE-C-RESULTS.md`,
  `ai/remediation/STAGE-D-RESULTS.md`.

## Evidence levels used in this report

| Level | Meaning |
| --- | --- |
| Implemented | The change exists in the tree. |
| Unit tested | Covered by a unit test that fails on regression. |
| Integration tested | Covered by a CLI / end-to-end test on a temp tree or sandbox. |
| Real environment tested | Executed on real infrastructure (local Linux, Node 18/22 tarballs, external scanners, live GitHub API, live link fetches). |
| Manually reviewed | Read in full by a human-equivalent review pass (diffs, code, docs). |
| Not tested | No test or execution covers it; stated explicitly, never implied. |
| Accepted upstream risk | A known upstream defect, documented, with a local mitigation; the upstream source is unchanged. |
| Known limitation | A real gap, recorded with its blast radius and the condition that would close it. |

Nothing in this report is claimed without evidence. Where the
environment prevented a test, the item is marked Blocked with the
reason. The phrase "100% production-ready" is not used anywhere:
the verdict in §12 follows the evidence, including the open items.

## 1. Executive summary

The 12-phase production upgrade was independently audited in five
remediation stages (A–E). Stage A verified the implementation
report's 16 headline claims against the repository: **11 VERIFIED,
5 PARTIALLY VERIFIED, 0 NOT VERIFIED — nothing was fabricated.**
Every quantitative claim reproduced exactly or within an explained
delta. The audit then found **52 issues** (0 Critical, 3 High,
15 Medium, 26 Low, 8 Informational) and fixed or mitigated all of
them except the ones that can only be closed by an upstream
maintainer or by a push to GitHub:

- **All 3 High issues addressed.** A-01 (security scan failing at
  HEAD) fixed; A-02 (installer manifest path traversal) fixed with
  a bounded residual; S-08 (agentic-seo curl-pipe install)
  mitigated with a safe-install guide and install/doctor warnings
  but still open upstream — it is not marked fixed.
- **The 51 new skills are now formally audited** (the largest
  verification gap in the implementation report). 51/51 audited:
  19 PASS, 32 FIXED, 0 unresolved. 60 findings (0 Critical,
  3 High, 11 Medium, 38 Low, 8 Informational), 54 fixed in place.
  Library verification split is now **254 verified / 17 with
  limitations / 6 needs-correction / 0 unverified**.
- **The installer is now genuinely safe and tested:** path
  traversal closed, concurrency lockfile, guarded rollback,
  pre-swap verification, read-only dry-run, junction fallback
  for Windows `--link`, 97 installer tests (was 43 at report
  time).
- **The full battery is green at the final HEAD** (see §10):
  249 unit tests passing, 463/463 eval cases,
  all validators passing, security scan clean, online link check
  clean, `check:upstream` 6/0/0.
- **What is still not proven:** no CI workflow has ever run on
  GitHub (L-CI); no real Windows execution has happened (L-Win);
  no real-model eval run has been executed (L-Model); S-08/S-09
  stay open upstream; CodeQL has never run anywhere. These are
  the reasons the verdict is READY FOR PULL REQUEST REVIEW, not
  higher (see §12).

## 2. Verification of the implementation report (Stage A)

Stage A independently verified all 16 reported claims with its
own commands. Full evidence (reported result, repository
evidence, verification command, actual result, status,
corrective action) is in
`ai/remediation/VERIFICATION-MATRIX.md`.

| # | Claim | Status |
| --- | --- | --- |
| 1 | 12 phases implemented | PARTIALLY VERIFIED — work is real, but 8/12 `ai/phaseN/` dirs were empty and phase 4/8 test-results files were missing (fixed in Stage E, A-22) |
| 2 | 277 skills available | VERIFIED |
| 3 | 18 skill categories | VERIFIED |
| 4 | 51 newly added skills | VERIFIED — names match git history 51/51 |
| 5 | 145 existing skills corrected | PARTIALLY VERIFIED — 145 files exact, but +1,715/−507 includes +22/−22 of registry JSON; skill-only is +1,693/−485 (A-21, corrected in the report addendum) |
| 6 | 24 agents | VERIFIED |
| 7 | 16 workflows | VERIFIED |
| 8 | Installer: dry-run, backups, rollback, restore, manifest | PARTIALLY VERIFIED — dry-run/backups/restore/manifest real, but "rollback" was narrow and untested, the "atomic swap" is two renames, dry-run mutated on corrupt manifest (all fixed in Stage B) |
| 9 | Installer detects modified files, protects user changes | PARTIALLY VERIFIED — hash protection real and tested in main flows, but symlink-repoint hole, no concurrency control, manifest traversal (all fixed in Stage B) |
| 10 | 449 eval cases | VERIFIED (cases on disk; now 463 after Stage C) |
| 11 | All 449 eval cases pass | VERIFIED — 3 deterministic runs |
| 12 | 277/277 skills covered by evaluation | VERIFIED, with a Low metric-construction caveat (fixed in Stage C, A-17) |
| 13 | 129/129 unit tests pass | VERIFIED as printed, with a Low nuance: true count was 128 — `test/helpers.mjs` was counted as a test (fixed in Stage E, A-18) |
| 14 | Security scanner contains 29 patterns | PARTIALLY VERIFIED — 29-pattern count exact (29 scan / 34 total reconciled), but the scan itself FAILED at HEAD (fixed in Stage B, A-01) |
| 15 | Six upstream commits and licenses verified | VERIFIED — re-verified via the GitHub API; `check:upstream` reproduced exactly |
| 16 | 609 URLs passed online link validation | VERIFIED — re-run: 73 internal, 609 external, 51 skipped, 0 errors, exit 0; with a wording caveat: only 558 were HTTP-checked (fixed in Stage E, A-24) |

**Other Stage A findings (all recorded in the matrix):**

- **PDF ≡ Markdown.** The user-supplied
  `FINAL-IMPLEMENTATION-REPORT.pdf` matches the Markdown report
  in substance (same 20 sections, same headline numbers); only
  extraction artifacts differ. No PDF-generation process exists
  in the repo, so Markdown remains the source of truth (A-35).
- **Diff-stat discrepancy reconciled.** +70,236 was the total
  diff vs `main` at the Phase 12 commit `d58d6b4`; +70,240 at
  `2f1460b` — the +4 is fix-up commit `2f1460b` itself (3 lines
  in the security scanner, 1 in the status doc). Both numbers
  were correct at their commits.
- **1,032 vs 1,034 scan files explained and reproduced.** The
  Phase 12 battery's 1,032 = the 1,029-file tree at `6b0a79e`
  + 3 decision files, with the report and results JSON not yet
  written (both record the scan's own output, so they postdate
  it). This also proves why the CODE-14 self-hit wasn't caught
  in Phase 12 — the report didn't exist when the scan ran.
- **Eval/test quality is genuinely good** — the mock agent tests
  real behavior, no vacuous tests found.
- **S-14 refined:** the agentic-seo import source is literally
  a fork of the author's repo (not just a dormant copy); the
  author's repo is 50 commits ahead of the pin. MONITOR stands.

## 3. Stage B — High-risk fixes (21 issues)

Full detail: `ai/remediation/STAGE-B-RESULTS.md`. Head
`71d1d72` → `87b9fee` (5 commits).

| Issue | Sev. | Root cause | Fix | Evidence level |
| --- | --- | --- | --- | --- |
| A-01 — security scan fails at HEAD | High | 8 findings, all documentation quotes of flagged constructs as evidence; fix-up `2f1460b` added an exception for the report while adding a new unexcepted quote in the status log, and the battery wasn't re-run after that edit | 8 narrow per-file/per-pattern exceptions with reasons; no directory exclusion, no pattern weakened | Implemented, integration tested (10 scanner tests prove genuine findings still detected) |
| A-02 — manifest path traversal | High | `entry.root`/`entry.destName` used unsanitized; `entryRoot` accepted absolute roots; `readManifest` never validated entries; uninstall ran a recursive delete on the result | Entry validation on read (fail-closed: invalid entry = corrupt manifest) + defensive guards; two-tier root rule (exact vs shape); skill entries must have root `.`; tier-2 terminal dir must match the entry kind | Implemented, integration tested (4 CLI tests with sentinels outside the install root) |
| A-03 — restore id / backup.json traversal | Medium | `readBackup` joined the user-supplied id unsanitized; `backupItemPaths` joined unsanitized `storedAs` | Restore id must be a single segment matching an existing backup directory (lstat, planted symlinks rejected); whole backup record validated; effective entry destName must match the backup item name | Implemented, integration tested (3 CLI tests, sentinels intact) |
| A-04 — no concurrency control | Medium | No lockfile; concurrent runs raced the manifest read-modify-write and `cleanStaleStaging` deleted another live run's staging | New `scripts/install/lock.mjs`: `.skillforge-lock`, atomic `open('wx')`, pid + timestamp + token; fail-fast on contention; stale takeover only when pid is dead AND lock is older than 10 min | Implemented, integration tested (concurrent installs; lock-state matrix) |
| A-05 — two-rename swap, unguarded rollback | Medium | `swapIn` was two renames with an unguarded rollback rename and fire-and-forget trash deletion; no test exercised it; docs called it "atomic" | Rollback rename guarded (both errors reported, neither copy deleted on double failure); `swapIn` takes injectable fs ops for fault-injection tests; docs now say "two-rename swap (not atomic)" | Implemented, unit tested (3 fault-injection tests) |
| A-06 — post-swap failure left bad content live | Medium | `executeInstallRun` swapped in, then hash-verified; on mismatch the new content stayed installed with stale manifest hashes | New exported `verifyStaged` runs *before* the swap; post-swap check stays as a second layer with `rollbackFromBackup`; manifest untouched on failure | Implemented, unit tested (helper level; post-swap branch is CLI-unreachable after a passing pre-swap check — known limitation) |
| A-07 — update silently repointed diverged symlinks | Medium | `classifyUpdate` returned `install` for a diverged link; `install` actions are excluded from backups, so a user's deliberate repoint was destroyed without backup or prompt | `classifyUpdate` now returns `conflict`, matching `classifyInstall` — refuse/prompt/force-with-backup | Implemented, integration tested |
| A-08 — dry-run mutated state | Medium | `loadManifestForWrite` ran before the dry-run check and quarantined a corrupt manifest | Dry-run classifies against a read-only manifest read; corrupt manifest noted, not quarantined; other dry-run paths verified read-only | Implemented, integration tested |
| A-09 — manifest repair partial/lossy | Medium | Quarantine + fresh start orphaned items not in the run; quarantine-rename failure let the fresh manifest overwrite the corrupt original in place | Quarantine failure fails closed (throws, never overwrites); `rebuildEntriesFromDisk` adopts library-identical items; incremental manifest writes after each item; repaired-manifest no-op bug fixed | Implemented, integration tested |
| A-14 — uninstall deleted library-removed content without backup | Low | `needBackup` covered only modified/foreign items | Items no longer in the library are backed up before removal | Implemented, integration tested |
| A-16 — restore gaps | Low | No post-swap verification on restore; manifest repair only when a manifest existed and the item had an entry; corrupt `backup.json` unrecoverable; partial backup dirs lingered | Post-swap verification with rollback; manifest created/repaired on restore; corrupt `backup.json` recovered from `items/` (crafted records still rejected); partial backup dirs cleaned up on failure | Implemented, integration tested |
| A-20 — pattern count unpinned | Low | Tests asserted only `>= 25` patterns; count drift wouldn't fail | Exact counts asserted (34 total, 29 scan, 11 score, 9 input) | Implemented, unit tested |
| A-30 — stale-staging cleanup narrow | Info | Cleanup ran only in `executeInstallRun` for roots being written; trash dirs deleted without checking a backup existed | Cleanup widened to all roots on install/update/uninstall/restore even when everything is `already`; trash dirs never auto-deleted; doctor distinguishes trash from staging | Implemented, integration tested |
| S-07 — unpinned pip installs (upstream) | Medium | ~30 unpinned `pip install` occurrences in agentic-seo | Confirmed ACCEPTED; 32 occurrences re-verified; directory CMD-04 exception regression-tested; safe-install guide tells users to install pinned in a venv | Manually reviewed; accepted upstream risk |
| S-08 — curl-pipe install (upstream) | High | Upstream README + `install.sh` document `curl … \| bash` from moving `main`, no pin, no checksums, no signatures | MITIGATED, STILL OPEN: `docs/AGENTIC-SEO-SAFE-INSTALL.md` (verified path via SkillForge installer, pinned vendored copy byte-identical; safe standalone path with SHA-256 verification) + install/update/doctor warnings | Manually reviewed; accepted upstream risk |
| S-09 — TLS verification disabled (upstream) | Medium | `broken_links.py` uses `verify=False` on per-link HEAD and GET | MITIGATED, STILL OPEN: docs warning + install/doctor warnings; vendored script unchanged (verbatim policy) | Manually reviewed; accepted upstream risk |
| S-10 — shell execution in test-server script (upstream) | Medium | `with_server.py` runs `--server` commands with `shell=True` | Confirmed ACCEPTED; trust-boundary wording corrected (commands come from the invoking user's CLI args, not a config file — no config file is read); scanner reason corrected; dated note in the audit | Manually reviewed; accepted upstream risk |
| S-11 — insecure TLS workaround in Prisma guide (upstream) | Medium | Upstream guide recommends `rejectUnauthorized: false` first (safe CA path also present) | MITIGATED: exceptions confirmed per-file; matcher hardened (exact file match vs directory prefix); scanner gained a root override; 10 integration tests prove genuine findings still detected; upstream text unchanged | Implemented, integration tested; accepted upstream risk |
| S-12 — guarded recursive delete (upstream) | Low | `install.sh` `rm -rf` on TEMP_DIR and dest | Confirmed ACCEPTED; guards re-verified | Manually reviewed; accepted upstream risk |
| S-13 — SSRF-guard DNS-rebinding TOCTOU (upstream) | Low | Guard resolves DNS once; fetch resolves again | Confirmed ACCEPTED; guard and TOCTOU re-verified | Manually reviewed; accepted upstream risk |
| S-14 — agentic-seo import points at a dormant fork | Medium | Import source is a fork, head at the pin; author 50 commits ahead | Confirmed, MONITOR stands; monitoring gap documented (weekly drift check watches the dormant fork) | Real environment tested (GitHub API); known limitation |

Fixed findings S-01–S-06 and S-15 were re-verified still fixed.
Secret scan of the working tree and full git history: clean (the
only `AKIA` hit is AWS's documented example key ID in the
security tests).

**Stage B residuals (carried forward, see §11):** A-02 tier-2
residual (agent/workflow entries can still point at an arbitrary
`agents`/`workflows`-named dir via a deep `..` climb — bounded);
post-swap mismatch branches covered at unit level only; S-08/S-09
open upstream; S-14 monitoring gap; stale-lock window up to
10 min.

## 4. Stage C — Quality (12 issues)

Full detail: `ai/remediation/STAGE-C-RESULTS.md`. Head
`87b9fee` → `ccfb4d1` (12 commits).

### 4.1 The 51-skill audit (L-51 — fixed)

All 51 Phase 4 skills audited individually against official
documentation (Phase 3 method). Full matrix:
`ai/audits/SKILL-AUDIT-MATRIX.md`.

- **51/51 audited: 19 PASS, 32 FIXED, 0 NEEDS-REVIEW.**
- **60 findings: 0 Critical, 3 High, 11 Medium, 38 Low,
  8 Informational. 54 fixed in place, 6 Informational needing
  no fix, 0 unresolved.**
- **Correction (Stage E):** the Stage C summary originally read
  59 findings (10 Medium, 53 fixed). A mechanical re-count of
  the 51 per-skill rows gives 60 (11 Medium, 54 fixed): the
  batch table undercounted batch 4 (infrastructure) by one —
  kubernetes, pulumi, and railway each carry one Medium finding
  (K-01, P-01, R-01). The row data and detailed findings were
  always consistent at 60/54; only the summary totals were
  wrong. The matrix summary is corrected; a dated correction
  note is appended to `STAGE-C-RESULTS.md`. No finding was
  added or removed.
- **The three High findings (all fixed):** clerk `auth.protect()`
  wrong call form (Core 2 vs Core 3); clerk webhook example
  with a wrong option name and env var (would have verified
  against no secret); GCP Cloud Run example deploying from
  `gcr.io` (Container Registry stopped accepting writes
  2026-03-18 — rewritten to Artifact Registry).
- **Cross-cutting:** no fabricated capabilities, no unsafe shell
  commands, no credential leakage, no prompt-injection vectors,
  no duplicated skills, no missing referenced files, no broken
  internal links in any of the 51. The NestJS TypeScript 6.x
  pin was re-confirmed still required.
- **Verification status after audit:** 50 → `verified`, 1
  (`platform-social-images`) → `verified-with-limitations`
  (Meta sharing docs returned 403 during verification; X
  figures from the last published card spec). **0 skills remain
  `unverified`.** Library split: **254 verified / 17 with
  limitations / 6 needs-correction / 0 unverified.** Registry
  regenerated (51 status flips + 4 corrected compatibility
  strings); deterministic.

### 4.2 Regression review of the 145 corrected skills (all fixed)

Full diff scan of the Phase 3 commit `cabb9cf` (398 hunks;
all 483 non-blank deleted and 1,650 non-blank added lines
reviewed) + 9 deep-checks + 2 web-verified deep-checks + a
10-skill spot-check sample (19 full-file reads). 5 findings,
all fixed:

| ID | Sev. | Finding | Root cause |
| --- | --- | --- | --- |
| F1 | Medium | `twitter-cards` recommended 1200x628, contradicting `twitter-card-images` (1200x600, 2:1) | Two Phase 3 batches picked different "correct" values in the same commit |
| F2 | Low | `secure-headers` said the `hsts` option was "removed in Helmet 4" | Misattributed rename version (live in Helmet 4; corrected to Helmet 8 with an evidence-chain caveat) |
| F3 | Low | `prisma` named the pre-7.10 config file | Phase 3 knew of the 7.10 rename but the skill named the old file unqualified |
| F4 | Low | `prisma` said Prisma 8 supports "PostgreSQL and MongoDB only" | Post-Phase-3 drift (MySQL/MariaDB early preview, SQLite experimental) |
| F5 | Low | 6 skills said Node.js 20 reached EOL "in March 2026" | Confused the last release date (v20.20.2, 24 Mar 2026) with the EOL date (30 April 2026) |

No lost content, broken links, mangled examples, or
over-corrections beyond these. Deep-checks confirmed the
highest-risk Phase 3 corrections still hold (Next.js fetch
uncached by default since 15; rate-limiting IETF draft rev. 11;
OWASP Top 10:2025 list exact; FAQ rich-results removal
2026-05-07; otplib v13 API; MCP SDK v2; Turborepo
CVE-2026-45772). Unresolved: Next.js 16 "Active LTS since
2026-10-21" could not be confirmed either way (left unchanged).

### 4.3 Eval quality + real-model layer

| Issue | Sev. | Fix |
| --- | --- | --- |
| A-10 — `npm test` clobbered the eval report | Medium | `--out <dir>` flag on the runner; smoke test uses a temp dir and asserts `evals/reports/latest.json` is byte-identical afterwards (note: `evals/reports/` is gitignored, so this was a local-artifact issue) |
| A-17 — coverage metric partly tautological | Low | Coverage now counts only actually-selected skills; full run still reports 277/277 — the number holds from real selection |
| A-19 — misnamed test; unknown-skill path untested | Low | Test renamed; real `validateCases` tests added (unknown skill / expected skill / notSkill, duplicate-id, unknown-category, no-expectations) |
| A-33 — generated cases deliberately circular | Info | Improved: 14 non-circular discovery cases added (`DIS-real-*`), all passing; first drafts exposed 4 genuine discoverability gaps (recorded, not hidden by rewording) |
| A-34 — content checks prove presence, not surfacing | Info | Partially strengthened: `grounded-in` check added to the content scorer (evaluated skill must be among selected skills; all 86 content cases already satisfy it); the "phrase anywhere" half deliberately unfixed (would invalidate the baseline), disclosure precisely worded |
| L-Model — model-based provider untested | Low | Provider-independent real-model layer built (`evals/runners/providers.mjs`: env config, no hardcoded keys, retries/timeouts, usage/cost tracking, mock/model report separation, baseline protection) + representative 75-case subset + `docs/REAL-MODEL-EVALUATION.md` plan. **No real-model run has been executed** (no credentials) and must not be claimed. Standard suite needs no credentials. |

Eval suite: 449 → **463 cases** (14 non-circular discovery
cases), **463/463 passing**, 277/277 skills selected,
0 regressions vs the re-saved baseline (re-save reason
recorded: new cases + changed coverage metric + `grounded-in`
check; the old baseline remains in git history and as
`baseline-2026-11-20.json`).

### 4.4 Installer test gaps + agents/workflows + L-Prisma

- **A-12** (`--backup` untested): 1 test — backup holds
  pre-conflict content byte-identical.
- **A-13** (rollback/stale-cleanup/prompt paths): 6 tests — 3
  dry-run (update/uninstall/restore, byte-identical state
  asserted) + 3 PTY (abort; uninstall `--all`; modified-content
  uninstall). Installer suite 72 → 80/80.
- **A-15** (`needBackup` string-matching): structured boolean
  `needsBackup` set at classification time; no
  `reason.includes` or `notInLibrary` remains in `scripts/` or
  `test/`.
- **Agents/workflows:** `check:agents` PASS (40 files); all
  51/51 audited skills covered by ≥1 agent/workflow.
- **A-31:** `install-skills.mjs` header "swapped in atomically"
  fixed (two renames, each atomic, the pair not). Report §7
  remainder to Stage E (see §6).
- **L-Prisma:** current stable is Prisma ORM 7.10.1; Prisma 8
  still an RC with no GA date (October GA date removed from
  the release-status page 2026-11-13; latest `prisma`
  8.0.0-rc.34). GA upgrade path documented. No upgrade to an
  RC is recommended. The three upstream skills' RC pins are
  stale/drifting — documented only, not edited.

**Stage C residuals:** no real-model run executed; A-33
discoverability gaps unfixed (retriever/description work);
PTY tests skip on Windows (node-pty decision → Stage D);
element-14 (Accessibility) enforcement inconsistent across
the library (standard-clarity problem, library-wide pass
recommended as follow-up); 17 verification-status notes still
truncated at 160 chars (3 Prisma notes completed).

## 5. Stage D — Platform & CI (8 issues)

Full detail: `ai/remediation/STAGE-D-RESULTS.md` and fragments
`ai/remediation/stage-d/`. Head `ccfb4d1` → `52f54d1`
(6 commits).

### 5.1 Windows `--link` (A-11 fixed; L-Win partially closed)

- **Junction fallback implemented** (new
  `scripts/install/links.mjs`): `createLink()` creates a
  symlink and, on Windows only, retries a *directory* link as
  a **junction** when the symlink fails with EPERM. Junctions
  need no privilege (no Developer Mode, no admin); symlinks
  need Developer Mode or elevation. Symlink-first is
  deliberate: a symlink is the better link where creatable,
  and the fallback only changes behavior for users who would
  otherwise get an error. Only EPERM is retried; file links
  never retry (junctions cannot point at files). Relative
  targets are resolved against the link's parent before the
  junction retry.
- **Same-target comparison:** `sameLinkTarget()` strips NT
  namespace prefixes, normalizes separators, compares
  case-insensitively on Windows.
- **File-lock handling:** EBUSY/EPERM on Windows rename/rm get
  a human-readable explanation; recursive removes retry
  (`maxRetries: 3`); `cleanStaleStaging` skips Windows-locked
  leftovers instead of aborting. POSIX behavior unchanged
  (all branches win32-gated).
- **Two genuine bugs fixed:** (1) backup/restore called
  typeless `symlink()`, so a broken *directory* link was
  recreated as a *file* link — now kind-correct via
  `createLink`, which also gives backup/restore the junction
  fallback; (2) `relativeRoot()` stored Windows backslash
  manifest roots — now normalized to `/` (manifests travel via
  git; Windows path functions accept forward slashes).
- **W-1/W-2/W-3** (found by the CI audit, fixed in Stage D):
  test helper now sets `USERPROFILE` on win32 (W-1); scanner
  normalizes relative paths to POSIX before exception matching
  (W-2); registry generator/validator normalize paths (W-3);
  same treatment for the link checker and scorer. Shared
  helper `scripts/lib/paths.mjs` + `test/paths.test.mjs`
  (5 tests). All normalizations are no-ops on POSIX; the
  registry regenerates with zero diff.
- **node-pty decision — option (c), implemented, no dependency
  added:** `prompt.mjs` streams are injectable
  (`setPromptStreams`/`resetPromptStreams`); the 3 prompt paths
  plus `askChoice` parsing now run in-process without a PTY on
  every platform. node-pty (a native C++/node-gyp module, the
  repo's first dependency of any kind, needing a build
  toolchain on Windows) was rejected; accepting the skip was
  rejected. PTY tests remain as the real-TTY integration layer
  on Unix CI.
- **Still unproven (Blocked — the first real Windows run):**
  Node's `lstat()` reporting junctions as symlinks (every
  classify/verify/doctor path rests on this); recursive `rm`
  on a junction removing only the junction (**if wrong,
  uninstall/rollback would delete the library** — catastrophic;
  no pure-Node defense exists since Node exposes no reparse-tag
  API); real junction creation; Developer Mode behavior;
  EBUSY paths; Windows long paths; tier-1 validation with real
  Windows paths. Full 8-item checklist in the fragment §9.
  17 new installer tests (fault-injected fallback, simulated
  Windows paths); installer suite 80 → 97/97.

### 5.2 Cross-platform tests (A-29 — fixed)

3 new CLI tests: install to a >260-character `--dest`, install
with a spaced project dir and spaced `--dest`, install with
Unicode paths. All pass. The installer does no shelling (pure
`fs` ops via `execFile`), so spaces/Unicode are inert by
construction; the tests prove it rather than assume it.
Windows-specific long-path behavior remains Blocked.

### 5.3 GitHub workflows (L-CI — open; validation done)

- **Local validation: 123 checks, 0 failures** (Python
  validator: YAML parses; triggers confirmed incl. all 3 cron
  expressions; `contents: read` everywhere, CodeQL adds only
  `security-events: write` + `actions: read`; **no
  `pull_request_target`, no `contents: write`**; the only
  `secrets.*` reference is the default `GITHUB_TOKEN` in the
  upstream job; **all 4 action SHAs re-verified against
  upstream via `git ls-remote`**; every referenced npm script
  exists; failure propagation reviewed step by step).
- **Concurrency added:** validate/lint/security-audit/codeql —
  group per workflow+ref, cancel-in-progress unless on `main`;
  scheduled-maintenance — serialize, never cancel;
  release — none by design (immutable tags, read-only).
- **Advisory Windows CI leg added** (`windows` job in
  `validate-skills.yml`: Node 20, `windows-latest`,
  `continue-on-error: true`, runs validate + frontmatter +
  full `npm test`). Promotion criteria: the leg is green on a
  real PR. A repo-level `.gitattributes` pins LF.
- **Branch-protection correction:** `ai/phase10/NOTES.md` told
  the user to require checks named `validate`/`registry`/
  `evals` — those are job ids, not check names, so protection
  would wait forever. Fixed: the correct required checks are
  `Validate (Node 18)`, `Validate (Node 20)`, `Validate
  (Node 22)`, `Registry`, `Behavioral evals`, `lint`,
  `security-audit` (plus `Analyze (javascript-typescript)` for
  CodeQL, recommended). Do NOT require `Windows (Node 20)`
  until the leg is promoted.
- **L-CI stays open: no workflow has ever run on GitHub.**
  Remote execution cannot be verified from here (pushing is
  forbidden). `act` local execution is Blocked (Docker not
  installed).

### 5.4 Node matrix (L-Node — exercised locally)

Official Node 18 LTS (`v18.20.8`) and Node 22 LTS (`v22.23.5`)
tarballs, run against a clean `git archive` copy of HEAD:
**`npm test` 196/196 on both, `npm run validate` exit 0 on
both** (suite as of that HEAD, before Stage D's 36 new tests).
The one initial Node 18 failure was environmental (the
`nobody`-user permission test could not execute the Node binary
under the scratch dir); re-run after fixing traversal: 80/80
installer tests. `engines >= 18` is now evidence-backed. The
CI matrix legs still need their first remote run (L-CI).

### 5.5 External scanners (L-Scan — partially closed)

| Tool | Version | Result |
| --- | --- | --- |
| Gitleaks | 8.30.1 (release binary) | 66 commits scanned, 5 findings, **0 real** (test fixtures, a public doc-example token, a UUID example key) |
| TruffleHog | 3.100.0 (release binary) | 4 unverified / **0 verified** (placeholder connection strings in upstream Prisma docs + 1 historical blob) |
| Semgrep | 1.186.0 (`p/javascript` over scripts/test/evals) | **0 findings, 0 errors** |
| CodeQL | not installed | **Blocked** (multi-hundred-MB bundle + DB build; covered by `codeql.yml` in CI) |

No credential values were reproduced anywhere. The external
scanners agree with the repo's own scanner: no real leaked
credentials in the tree or its history.

### 5.6 Supply chain — no release blockers

- **Zero deps verified:** no `dependencies`/`devDependencies`/
  etc. in `package.json`, no lockfile of any kind; all tooling
  is Node built-ins. `npm audit` ENOLOCK is handled by the
  security workflow.
- **Actions:** 3 first-party actions, all SHA-pinned;
  Dependabot is github-actions-only, weekly. Update policy:
  one action at a time, on green CI; no update needed for
  this release.
- **4 binaries, all upstream and load-bearing**, SHA-256 hashes
  recorded for the first time: 2 agentic-seo PNG screenshots,
  the Anthropic theme-showcase PDF, and
  `shadcn-components.tar.gz` (49 entries, all `.tsx` shadcn
  components, listing-inspected — no executables, no scripts,
  no absolute paths, no symlinks).
- **Post-install scripts: none. Unnecessary dependencies: none.**
- **Dependency confusion:** minimal surface (zero deps, private
  package, `bin` only reachable from a clone; never run
  `npx skillforge`). One documentation-level note: `npx skills
  add luxmanbhattarai/SkillForge` fetches Vercel's `skills` CLI
  unpinned — recommend pinning a verified CLI version at the
  next docs pass (no change made: a pin must come from a
  verified install).

### 5.7 Link checker (A-23 — fixed) + Vercel re-import (A-27 — fixed)

- **Link checker hardened:** extraction strips fenced code
  blocks and inline code spans; online path retries 403/429 +
  network errors with exponential backoff (3 attempts) and a
  200ms inter-request delay; validation rules unchanged.
  14 hermetic regression tests (`test/links.test.mjs`).
  Offline external count 610 → 604 (6 `example.com`
  placeholders in one fenced block in
  `skills/seo/llms-txt/SKILL.md` no longer counted as links).
  Internal links unchanged at 75.
- **Vercel re-imported, verbatim, verified.** Baseline: all 259
  vendored Vercel files hash-compared against upstream at old
  pin `1a2c79d4` — **259/259 byte-identical**. Imported files
  verified byte-identical at new pin
  **`5a37a6329fbad3666c3207392a6a7c0110e92efb`**;
  `command.md`'s SHA-256 matches the hash stated in the new
  SKILL.md. Records updated; registry regen diff is the version
  bump only; CHANGELOG `Unreleased` entry added. The change
  *removes* a network fetch from the skill's workflow.
  Post-re-import `check:upstream` confirmation was Blocked by
  the GitHub API rate limit in Stage D — re-run in Stage E
  (§7).

### 5.8 L-Prisma — headline still holds

Spot-checked against the official release-status page:
unchanged since Stage C — Prisma 8 still an RC with no GA
date, `prisma` 8.0.0-rc.34, `@prisma/client` at 7.10.1,
Prisma 6 EOL 19 Nov 2026. No upgrade to an RC is recommended.

## 6. Stage E — Final verification (11 issues)

Head `52f54d1` → {{FINAL:HEAD}} (9
commits).

| Issue | Sev. | Root cause | Fix | Evidence level |
| --- | --- | --- | --- | --- |
| A-18 — test count: printed vs real | Low | `test/helpers.mjs` lived under `test/`, so `node --test` executed it as a 0-test file and the printed count was one higher than the real count (232 printed / 231 real) | Moved to `test-support/helpers.mjs` (same directory depth, so `REPO_ROOT` still resolves); updated 6 imports + the workflow comment. A glob-scoped test script was rejected: it would break the Windows CI leg (Node 20 + cmd.exe cannot expand globs). `npm test` now prints exactly the real count | Implemented, unit tested (full suite re-run: printed == counted) |
| A-21 — Phase 3 line-count figure includes registry JSON | Low | Report §5 presents +1,715/−507 as the skill-correction figure; skill files alone are +1,693/−485; the +22/−22 delta is registry regeneration in the same commit | Clarified in the report addendum (§8) and in the PROJECT-STATUS Phase 3 row | Manually reviewed (git numstat) |
| A-22 — thin per-phase evidence packaging | Low | 8 of 12 `ai/phaseN/` directories were empty; no `phase4-*` or `phase8-*` results file | Backfilled with pointers, not invented numbers: NOTES.md in each empty phase dir (what the phase did, where the evidence lives — commit SHAs, audits, results files — recorded outcome) + `phase4-expansion-summary.md` and `phase8-agents-workflows-summary.md` (recorded results only, with explicit "Not sourced" sections for what no record covers). All 22 cited commit SHAs verified to exist with matching subjects | Manually reviewed |
| A-24 — "609 verified" counts 51 skipped URLs | Low | Only 558 URLs were HTTP-checked in the Phase 12 run; 43 exception + 8 example-domain URLs were never fetched, but the script's summary line counted all enumerated URLs as "verified" | `verifyExternalUrls` now returns `fetched`; the online summary line reports "(N checked live, M skipped: example domains / documented exceptions)". Regression test added (fetched counts only requested URLs) | Implemented, unit tested |
| A-25 — no LICENSE file preserved in 3 of 6 upstream imports | Low | superpowers, prisma, marketingskills ship no license file in the imported copy (only ATTRIBUTION.md records holder + license) | Decision recorded in `sources/licenses.md` (dated note): ATTRIBUTION.md + licenses.md arguably satisfy MIT's notice requirement; at the next re-import of each vendor, copy the upstream LICENSE verbatim into the vendor directory. Availability at the pinned commits verified 2026-11-20 (all three exist upstream; Vercel has none — README-only MIT). No file added under `skills/upstream/` in this stage | Real environment tested (upstream fetches at pins); known limitation (texts absent until next re-import) |
| A-26 — agentic-seo second copyright holder unrecorded | Low | Upstream LICENSE lists Bhanu Namikaze AND agricidaniel; repo files named only Bhanu Namikaze | Both holders now recorded in `sources/licenses.md` and `skills/upstream/agentic-seo/ATTRIBUTION.md` (one line each; the ATTRIBUTION.md edit is to a project-maintained file, see A-32). Upstream LICENSE verified byte-identical to the local copy (SHA-256 `aa3532d279e8…`) | Real environment tested (upstream fetch + hash) |
| A-28 — report §9/§13 file count (1,032) is stale | Low | 1,032 was accurate for the working tree at scan time, but no committed tree scans 1,032 (1,029 at `6b0a79e`, 1,034 at `01a7173`) | Timing explanation in the report addendum (§8) | Manually reviewed (worktree reproduction in Stage A) |
| A-31 remainder — report §7 "Atomic installs" wording outdated | Info | The swap is two renames, each atomic, the pair not; a kill mid-swap is still not testable at CLI level; the report's installer test count (43) is stale (now 97) | Dated correction note in the report addendum (§8); the report body is left as written (historical record) | Manually reviewed |
| A-32 — two upstream ATTRIBUTION.md files modified | Info | Report §5 says "No upstream skill was edited" — true for skill content, but 2 ATTRIBUTION.md files were extended in `caf1f32` (purely additive) | Policy clarified in `sources/imported-skills.md` rule 2: the verbatim policy covers upstream skill *content*; vendor ATTRIBUTION.md files are project-maintained and may carry additive project documentation (caf1f32 precedent named) | Manually reviewed |
| A-35 — PDF report not in repo; no PDF-generation process | Info | The only PDF in the repo is the upstream theme-showcase PDF; no pandoc/wkhtmltopdf/puppeteer tooling, no `pdf` script, no PDF step in any workflow | Recorded: Markdown remains the source of truth per mission brief §13.5; no PDF dependency introduced. The user-supplied PDF is content-equivalent to the Markdown (Stage A §0.1) | Manually reviewed |
| A-36 — link checker never enumerates bare URLs (new in Stage E) | Low | `LINK_RE` in `scripts/check-links.mjs` matches only Markdown-style `[text](url)` links; bare URLs in plain text are never enumerated or checked. 88 bare URLs exist in the tree (mostly evidence citations in `ai/` audit reports; the 3 license URLs in `sources/licenses.md` among them). Skill content is unaffected — skills use Markdown links | Not fixed in this stage (changing the extractor would change the enumerated count and require a fresh online run at the last stage). Recorded as a carry-forward: extend the extractor to bare URLs at the next link-checker pass; the 3 license URLs were verified manually via upstream fetch (A-25) | Manually reviewed (enumeration diff: the 604-URL set is identical at `ccfb4d1` and at the Stage E head) |
| A-37 — registry generator writes non-atomically (new in Stage E) | Low | `scripts/generate-registry.mjs` wrote registry files with a plain `writeFile`, so a concurrent reader could parse a half-written `skills.json` (241 KB). The suite runs the generator against the real repo (determinism test) while other test files read the registry in parallel. Proven with a race probe: 20 partial-read SyntaxErrors in 30 generator runs under a concurrent reader. Found while investigating the intermittent suite failure — but it is NOT the cause of the two observed failures; those were A-38 (below). Fixed on its own merits: a half-written registry is a real data-integrity hazard for any concurrent reader, in the suite or in CI | Writes are now temp-file + rename (atomic on POSIX and Windows), so readers always see the old or the new file. Regression test added (`test/registry.test.mjs`: 10 generator runs under a concurrent reader, 0 partial reads — fails pre-fix with 5 partial reads in 1,548 reads, passes post-fix; probe post-fix: 0 in 30 rounds, 4,930 reads). Same non-atomic pattern exists in `generate-report.mjs` and `run-evals.mjs`, but no concurrent readers exist there — follow-up, not a fix here | Implemented, unit tested (probe + regression test + post-fix suite runs) |
| A-38 — evals test deletes a real-tree directory mid-suite; link checker crashes on ENOENT (new in Stage E) | Low | The "model run without --out" evals test ran the runner against the REAL repo (no `--out`) and then `rm -rf`'d the `evals/reports/model/` directory it created. While the directory existed, the link checker's offline scan (parallel test file) could list `evals/reports/model/latest.md` and then fail to open it after the rm — ENOENT, exit 2. Identified from the saved log of a failing run (post-fix run 1): `Link check failed: ENOENT …/evals/reports/model/latest.md`, `2 !== 0`. This was the cause of both observed intermittent failures (2 in 18 runs), not A-37 | Three parts: (1) the evals test now runs against a temp copy of the repo (the runner resolves its root from its own location, so the default path is exercised identically); nothing in the real tree is created or deleted. (2) `check-links.mjs` skips files deleted between listing and read (ENOENT) instead of failing the whole check. (3) `security-scan.mjs` gets the same ENOENT tolerance (text + binary branches; counts only include files actually read). No deterministic regression test exists for the ENOENT tolerance (it guards a race); the root-cause fix is covered by the suite passing repeatedly and by inspection (no test writes to the real tree). Also in the same commit: 6 narrow per-file/per-pattern scan exceptions for the two Stage E docs, which quote flagged constructs as evidence for S-08/S-09/S-10/S-11 (A-01 precedent) | Implemented, unit tested (affected suites 85/85; full suite re-runs green) |
| L-Settings — secret scanning, Dependabot alerts, branch protection are manual repo settings | Low | Cannot be enabled from this environment | Post-merge checklist documented in `ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md` and `ai/phase10/NOTES.md` (with the corrected check names from Stage D); do NOT enable CodeQL default setup (conflicts with the workflow setup) | Not tested (manual repo settings; post-merge) |
| L-02/L-03 — open by decision | Info | Two upstream Prisma pointer stubs (correct verbatim imports); progressive disclosure unused by original skills (deliberately not churned) | No action; recorded for completeness | Manually reviewed |

**Stage E corrections found during verification:**

- **Skill-audit totals (see §4.1):** 59 → 60 findings, 10 → 11
  Medium, 53 → 54 fixed. Matrix summary corrected; dated
  correction note appended to `STAGE-C-RESULTS.md`.
- **Scanner-tripping quote in a new file:** the backfilled
  `ai/phase12/NOTES.md` quoted the insecure TLS workaround
  literally, turning the scan red again (the Stage C lesson,
  repeated). Fixed by rewording; scan green after. The lesson
  stands: audit/report text must not contain literal
  scanner-flagged constructs, or the gate goes red.
- **Online link check, first Stage E run lost:** the background
  run was killed (SIGTERM) at ~6 minutes and its `/tmp` log
  vanished with a `/tmp` wipe. Re-run detached with the log in
  persistent workspace storage; result in §10.

**Final acceptance test suite (brief §11):** assembled and
verified — see `ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md`
for the per-area coverage map. Genuine gaps filled with
non-vacuous tests (18 (8 repository + 6 validators + 3 links + 1 registry) new tests):
repository structure (layout tripwire, category/registry
agreement, registry totals vs disk, acceptance scripts),
dependency integrity (zero dependencies declared, no lockfile,
every import resolves to a relative path or a `node:`
builtin), validator script-level coverage (frontmatter /
duplicates / sources / agents on the real repo + negative
fixture cases), link-checker script-level coverage (offline
real-repo run + broken-link fixture), cross-platform
(`.gitattributes` LF pin). Every new test fails on a real
regression (counts derived from disk and cross-checked, never
hardcoded; negative cases assert the specific failure). No
vacuous "file exists" or bare exit-code assertions were added.

## 7. Metrics reconciliation (brief §12)

All figures below were recalculated from the actual repository
at the final HEAD {{FINAL:HEAD}} — none copied from earlier
reports. Commands: `git diff --shortstat main...HEAD`,
`git log --oneline main..HEAD | wc -l`, `git ls-files | wc -l`,
`npm run query -- status`, `npm test`, `npm run evals`,
`npm run check:security`, `npm run check:links`,
`node scripts/check-links.mjs --online`,
`npm run check:upstream`, `npm pack --dry-run`.

| Metric | Implementation report (Phase 12 head) | Remediation final HEAD | Notes |
| --- | --- | --- | --- |
| Commits ahead of `main` | 37 (at `2f1460b`) | 74 | Includes 5 remediation-stage waves |
| Files changed vs `main` | 429 (+70,236/−1,165 at `d58d6b4`; +70,240 at `2f1460b`) | 475 files changed, +89,111/−1,234 | The +70,236 vs +70,240 discrepancy is the 4-line fix-up commit `2f1460b` (see §2) |
| Tracked files | 1,069 | 1,115 | |
| Skills / categories | 277 / 18 | 277 / 18 | Unchanged by remediation |
| Agents / workflows | 24 / 16 | 24 / 16 | Unchanged by remediation |
| Verification split | 204 / 16 / 6 / 51 | 254 / 17 / 6 / 0 | Stage C audited all 51 (50 verified, 1 with limitations) |
| Unit tests (printed / real) | 129 printed / 128 real | 249 printed / 249 real | A-18 fixed: printed == real after the helpers move |
| Eval cases | 449 | 463 | +14 non-circular discovery cases (Stage C, A-33) |
| Security scan files | 1,032 text + 4 binary (at scan time; no committed tree scans 1,032) | 1,078 text + 4 binary | Count grows with the tree; see A-28 |
| Internal links (offline) | 73 | 75 | +2 from remediation docs |
| External URLs enumerated | 609 | 604 | 609 (Stage C online run) → 610 (Stage C head `ccfb4d1`, +1 URL from late Stage C docs) → 604 (A-23 fenced-code stripping removed 6 `example.com` placeholders). The enumerated set is identical at `ccfb4d1` and at the Stage E head — verified by diffing the two enumerations produced with the checker's own extractor. Note: the checker enumerates only Markdown-style `[text](url)` links; 88 bare URLs (mostly `ai/` audit citations) are never counted (A-36) |
| External URLs checked live (online) | 558 (of 609; 51 skipped) | 559 (of 604; 45 skipped) | A-24: the summary now reports checked-live separately |
| Upstream drift | 5 up-to-date, Vercel 4 behind | 6 up-to-date, 0 behind | Vercel re-imported (Stage D, A-27); confirmed in Stage E |
| Phase 3 correction lines | +1,715/−507 | +1,693/−485 skill files (+22/−22 registry JSON in the same commit) | A-21 |
| Skill-audit findings | n/a (51 skills unaudited) | 60 (0/3/11/38/8), 54 fixed | Stage C, corrected in Stage E (see §4.1) |
| Installer tests | 43 | 97 | +40 Stage B, +8 Stage C, +17 Stage D, +0 Stage E (Stage E added 18 tests elsewhere: 8 repository + 6 validators + 3 links + 1 registry, see §10) |
| `npm pack --dry-run` | 1,065 files, 2.9 MB / 9.1 MB unpacked | 1,114 files, 3.3 MB package / 10.1 MB unpacked (private; pack excludes only .gitignore from the 1,115 tracked files) | |

## 8. Report corrections (addendum, not a silent rewrite)

The implementation report (`ai/reports/FINAL-IMPLEMENTATION-REPORT.md`)
is a historical snapshot at its commit. Its body was NOT silently
rewritten. A clearly-dated correction addendum is appended to the
report itself, recording:

1. The reconciled diff statistics at the remediation HEAD
   (§7) and the +70,236 vs +70,240 explanation.
2. The corrected test/eval/verification figures (§7).
3. A-21: Phase 3 skill-only line count (+1,693/−485).
4. A-28: the 1,032-file scan-count timing explanation.
5. A-24: the "609 verified" wording (558 checked live).
6. A-31 remainder: §7 "Atomic installs with rollback" is
   outdated — the swap is two renames, each atomic, the pair
   not; a kill mid-swap is still not testable at CLI level;
   the installer test count is now 97.
7. A-32: "No upstream skill was edited" is true for skill
   content; two project-maintained ATTRIBUTION.md files were
   extended (caf1f32); the policy is clarified in
   `sources/imported-skills.md`.
8. What changed since the report: 51 skills audited (L-51
   closed); Vercel re-imported (A-27); Node 18/22 exercised
   locally (L-Node); Gitleaks/TruffleHog/Semgrep ran clean
   (L-Scan partial); Windows junction fallback implemented
   (A-11, real execution still Blocked); real-model eval
   layer built, no real-model run executed (L-Model); Prisma
   8 still an RC (L-Prisma).
9. What is still open (see §11).

## 9. Documentation and consistency

- Living docs updated where counts changed (Stage C: README,
  `docs/ARCHITECTURE.md`, `docs/UPGRADE.md` — split 254/17/6/0,
  463 cases; Stage D: `ai/phase10/NOTES.md` check names,
  `docs/INSTALLATION.md` junction fallback; Stage E: this
  report's addendum).
- Historical records (final report body, phase results,
  decisions, CHANGELOG entries) left untouched except by
  dated correction notes/addenda.
- Online link check re-run in Stage E (§10): run 1: 1 transient error (Discord docs timeout, verified real independently); confirming re-run: PASS (559 checked live, 45 skipped, 0 errors).
  Validation rules (unchanged by A-23/A-24 — only the
  fetching and the reporting changed): internal links must
  resolve on disk; external URLs are fetched (HEAD, GET
  fallback on 405/403/429) with retry/backoff and a 200ms
  delay; RFC 2606 example domains are skipped (intentional
  placeholders); EXCEPTIONS hosts are skipped (real but
  unverifiable by automated checks, each verified
  independently on the noted date); skipped URLs are
  enumerated, not counted as verified.
- PDF: no documented PDF-generation process exists in the
  repo — Markdown remains the source of truth; no PDF
  dependency was introduced (A-35).

## 10. Test results — final battery

All commands run from the repository root at the final HEAD
{{FINAL:HEAD}}, after the last edit, Node
v24.22.1. Full battery — no failures, no skipped
tests except as noted.

| Command | Result |
| --- | --- |
| `npm install` | PASS — up to date, 0 vulnerabilities (npm created a package-lock.json; removed again — the repo intentionally has no lockfile) |
| `node --check` (all 55 `.mjs`/`.js` under scripts/, evals/, test/, test-support/) | PASS — 55 files, 0 failures |
| Trailing-whitespace scan (lint workflow's check) | PASS — none found |
| `npm test` | PASS — 249 pass, 0 fail, 0 skipped (agents-workflows 8, evals 35, hashing 4, installer 97, library 8, links 17, paths 5, registry 16, repository 8, scanner 10, security 23, targets 8, validate 4, validators 6; 249 test() calls counted, 0 describe blocks) |
| `npm run validate` / `validate:strict` | PASS with 4 warnings (4 upstream, informational) — both `validate` and `validate:strict` |
| `npm run check:frontmatter` | PASS — 277 skills |
| `npm run check:links` (offline) | PASS — 75 internal, 0 broken; 604 external listed |
| `node scripts/check-links.mjs --online` | PASS (confirming run) — 604 enumerated, 559 checked live, 45 skipped, 0 errors; run 1 had 1 transient Discord-docs timeout (verified real by an independent fetch) |
| `npm run check:duplicates` | PASS — 277 compared (threshold 0.8) |
| `npm run check:sources` | PASS — 277 skills, 7 sources, 0 warnings |
| `npm run check:agents` | PASS — 40 files (24 agents, 16 workflows) |
| `npm run check:registry` | PASS — 277 skills, 24 agents, 16 workflows (schema + references + verification coverage) |
| `npm run check:security` | PASS — 1,078 text + 4 binary, 29 patterns, no findings |
| `npm run check:upstream` | PASS — 6 up-to-date, 0 behind, 0 ahead, 0 diverged, 0 unknown (Stage E re-run; the brief allows one run — not re-run in the battery) |
| `npm run score` | PASS — 228 original skills, mean 87/100, 0 CRITICAL (testing dimension mean 37, unchanged) |
| `npm run evals` | PASS — 463/463 passed (100.0%), 0 failed, 0 critical; coverage 277/277 skills selected; vs baseline 0 regressions |
| `npm run registry` + diff | PASS — zero diff after regeneration (deterministic) |
| `npm run report` | PASS — 228/228 planned original skills (100%), 277 total; validation PASS with 4 upstream warnings; no tree changes |
| `npm run query -- status` | 254 verified / 17 with limitations / 6 needs-correction / 0 unverified |
| `npm pack --dry-run` | PASS — 1,114 files, 3.3 MB package / 10.1 MB unpacked (private) |
| Workflow YAML/pins/permissions validation | PASS — all 6 workflows + dependabot.yml parse; all 23 `uses:` are 40-hex SHA pins; every workflow declares `permissions:` |
| Skills CLI `--list` / install | PASS — `npx skills add <local path> --list -y`: 277/277 discovered, 0 skipped; graphql install content-identical to the library (sandboxed HOME) |

**Skipped tests:** none — 0 skipped in `npm test`; no battery step skipped (check:upstream and the online link check were run once each earlier in Stage E per the brief, and their results are recorded above, not re-run).
**Failures:** none in the final battery. Two pre-fix intermittent `npm test` failures (2 in 18 runs) were found and fixed during Stage E — see the A-37/A-38 paragraph below..

**Intermittent failure found and fixed during Stage E (A-37, A-38).**
While verifying the acceptance suite, `npm test` failed twice in
18 runs (each time exactly one test; the first failure's
signature was `actual: 2, expected: 0`). The failing test's name
was not captured on either occasion (output was piped through
`tail`/`grep`). A 4-run repro after the first failure and an
8-run hunt after the second did not reproduce it (7 and 9
consecutive green runs respectively). Investigation then found
two real races. **A-37** (registry generator wrote files with a
plain `writeFile` while the suite runs it against the real repo
in parallel with registry readers; a race probe proved partial
reads — 20 SyntaxErrors in 30 generator runs) was fixed with
atomic temp-file + rename writes and a regression test (commit
`182bc15`; probe post-fix: 0 partial reads in 30 rounds) — but
a further failing run after that fix, this time with the full
log saved, showed the actual cause was **A-38**: an evals test
ran the runner against the real repo and `rm -rf`'d the
`evals/reports/model/` directory it created, while the link
checker's offline scan (parallel test file) had already listed
`latest.md` inside it — ENOENT, exit 2. Fixed in commit
`783392d` (test sandboxed to a temp repo copy; checker and
scanner tolerate ENOENT). The suite passed every run after the
A-38 fix (including the final battery above). The pre-fix
failures are recorded here rather than hidden: both were real
races, not test noise — and the A-37 commit message
over-attributes the observed failures to the registry race;
this section is the correction (A-38 was the cause).

## 11. Remaining risks

| ID | Sev. | Risk | Recommended action |
| --- | --- | --- | --- |
| L-CI | Medium | No CI workflow has ever run on GitHub. All workflow validation is local (123 checks, pins re-verified, script references checked). The first push/PR is the real test for all 6 workflows + the Windows leg. | Open the PR, watch the first runs, do not merge on a red leg. Promote the Windows leg to gating only after it is green on a real PR. |
| L-Win | Medium | No real Windows execution has happened. The junction fallback, W-1/W-2/W-3 normalizations, and the Windows leg are unproven on a real runner. The catastrophic case is recursive `rm` on a junction following the link and deleting the library (assumption 3, no pure-Node defense). | Run the first-real-Windows-run checklist (`ai/remediation/stage-d/windows-link-analysis.md` §9) in priority order: junction classification first, junction removal safety second. |
| S-08 | High | Agentic SEO still documents a curl-pipe install upstream (unpinned, unverified, no checksums). Mitigated in-repo (safe-install guide + warnings) but anyone finding upstream directly may follow it. | Raise with the agentic-seo author; re-verify at the next re-import. |
| S-09 | Medium | Agentic SEO `broken_links.py` still disables TLS verification. Mitigated in-repo (docs + warnings). | Raise with the author; re-import from a fixed upstream commit when available. |
| S-11 | Medium | Prisma upgrade guide still recommends the insecure TLS workaround first (safe CA path also present). Scanner exceptions are narrow and tested. | Raise with Prisma; re-verify at the next re-import. |
| S-14 | Medium | Agentic-seo import tracks a dormant fork; the author is 50 commits ahead; the weekly drift check watches the fork, so live-upstream drift is invisible. | Re-point decision at the next re-import; re-verify the source first. |
| L-Model | Low | No real-model eval run has been executed. The provider layer is proven only against a local stub endpoint. All 463/463 results are from the deterministic mock agent, which evaluates the library, not a real LLM. | Run the 75-case subset (`docs/REAL-MODEL-EVALUATION.md`) with human review of failures when credentials are available. No spend cap in the layer (tracking only). |
| CodeQL | Low | CodeQL has never run anywhere (Blocked locally; `codeql.yml` untested remotely). | First PR run; do NOT enable CodeQL default setup (conflicts with the workflow setup). |
| A-02 residual | Low | Tier-2 manifest-root validation still allows an agent/workflow entry to point at an arbitrary directory named `agents`/`workflows`/`global_workflows` via a deep `..` climb. Bounded (single files/dirs, library-item names only); skill entries cannot escape at all. | Consider tightening tier-2 to known target roots when the manifest's target/scope are unknown; needs care not to break legitimate Codex-style layouts. |
| A-33 | Info | Four genuine keyword-retrieval gaps: users who don't already know the domain term ("rate limiting", "audit", "unit test", "Dockerfile") may not find the skill via the mock retriever; the stemmer maps "Dockerfiles" to a stem that never matches. | Retriever tuning or registry description enrichment (future work). |
| Element-14 | Info | Accessibility-subsection enforcement is inconsistent across the library (standard-clarity problem, not skill-accuracy). | Library-wide element-14 pass as follow-up work. |
| 17 truncated notes | Info | 17 verification-status notes are truncated at 160 chars (pre-existing Phase 3 authoring artifact; 3 Prisma notes completed in Stage C). | Complete from the Phase 3 audit in a later pass. |
| `npx skills` unpinned | Info | `npx skills add` fetches Vercel's `skills` CLI unpinned (`latest` at run time). Documentation-level exposure, not a repo dependency. | Pin a verified CLI version at the next docs pass (the pin must come from a verified install). |
| Railway cutoff | Info | Railway Config as Code stops being read on 2026-12-01 (11 days after the audit). The skill states the cutoff. | Re-check downstream Railway guidance after that date. |
| Version drift | Info | Version pins are dated 2026-11-20 and will drift on their normal release cadence. | Re-check at the next audit cycle; `query stale --days 180` fails when re-verification is due. |
| L-Settings | Low | Secret scanning, Dependabot alerts, and branch protection are manual repo settings, still to be enabled (post-merge). | Enable immediately after merge per `ai/phase10/NOTES.md` (corrected check names). |
| Post-swap branches | Info | Post-swap mismatch branches (A-06/A-16a) are covered at unit/helper level only — no CLI input can reach them after a passing pre-swap check. | None (unreachable by construction); revisit if the installer flow changes. |
| Stale-lock window | Info | A killed run's lock blocks the next run for up to 10 minutes (message gives the removal path); `doctor` reports lingering locks. | None (documented behavior). |
| A-36 | Low | Link checker never enumerates bare URLs (88 in the tree, mostly `ai/` audit citations). A broken bare URL would not be caught by `check:links`. | Extend the extractor to bare URLs at the next link-checker pass; re-run the online check after the change. |

## 12. Production verdict

**READY FOR PULL REQUEST REVIEW**

Evidence supporting the verdict:

- **For:** all 12 implementation phases verified; all 52
  remediation issues addressed (fixed, mitigated with
  documented residual risk, or recorded as open-by-decision
  with a named owner); 0 Critical findings; the only High
  finding (S-08) is upstream content that cannot be edited
  here and is mitigated in-repo; the full battery is green at
  the final HEAD (249 unit tests,
  463/463 evals, all validators, security scan clean, online
  links clean, upstream 6/0/0); the 51 new skills are formally
  audited (0 unverified remain); the installer is safe,
  tested, and honest about its limits; supply chain verified
  (zero deps, pinned actions, hashed binaries, no live
  credentials by four independent scanners).
- **Against a higher verdict:** no CI workflow has ever run on
  GitHub (L-CI) — the first PR run is the real test of the
  workflows, the Node matrix legs, CodeQL, and the Windows
  leg; no real Windows execution has happened (L-Win) — the
  junction assumptions, including the catastrophic
  removal-safety case, are unproven; no real-model eval run
  has been executed (L-Model); S-08/S-09 stay open upstream.
  "PRODUCTION READY" would require the first green CI run and
  a real Windows run; "READY FOR STAGING VALIDATION" implies
  a staging environment this library (a skills repo, not a
  service) does not have. The honest next step is a pull
  request, whose CI runs are the evidence the higher verdicts
  need.

**What the PR reviewer should watch:** the first runs of all
6 workflows + the advisory Windows leg; the corrected
branch-protection check names (`ai/phase10/NOTES.md`); the
manual repo settings (secret scanning, Dependabot alerts,
branch protection) immediately after merge; do NOT enable
CodeQL default setup.

---

*End of remediation report. Branch:
`feat/skillforge-production-upgrade`. Status tracker:
`ai/PROJECT-STATUS.md`. Issue register:
`ai/remediation/ISSUE-REGISTER.md`. Acceptance checklist:
`ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md`.*
