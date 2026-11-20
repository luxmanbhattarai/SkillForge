# Stage A — Verification Matrix: Final Implementation Report vs Repository

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (base `main` @ `bc304a2`)
- **HEAD at verification:** `0c8bd48` (38 commits ahead of main; report era ended at `2f1460b`)
- **Working tree:** clean at start of Stage A (only `ai/remediation/` files added by this stage)
- **Report under verification:** `ai/reports/FINAL-IMPLEMENTATION-REPORT.md` (repo source of
  truth) **and** `FINAL-IMPLEMENTATION-REPORT.pdf` (user-supplied upload — see §0.1)
- **Method:** every claim re-checked with independent commands against the repository.
  Repository code, tests, workflows, and reproducible evidence are the source of truth;
  the report's numbers were never copied without re-derivation.
- **Node:** v24.22.1. Verification ran in four parallel batches plus coordinator checks.

## Result summary

| Status | Count | Claims |
| --- | --- | --- |
| VERIFIED | 11 | 2, 3, 4, 6, 7, 10, 11, 12, 13, 15, 16 |
| PARTIALLY VERIFIED | 5 | 1, 5, 8, 9, 14 |
| NOT VERIFIED | 0 | — |

Notes: claims 12, 13, 16 are VERIFIED with recorded caveats (metric construction, test
counting, skipped-URL wording). Claim 14 splits: the 29-pattern count is VERIFIED, but the
report's associated "scan passes, no findings" result is NOT VERIFIED — the scan fails at
HEAD (see claim 14 and issue A-01).

## 0.1 PDF vs Markdown comparison

The user supplied `FINAL-IMPLEMENTATION-REPORT.pdf` as an upload at
`~/workspace/user/files/FINAL-IMPLEMENTATION-REPORT.pdf` (574,349 bytes, 2026-11-20).
**It is NOT in the repository** — the only PDF in the repo is the upstream
`skills/upstream/anthropic/theme-factory/theme-showcase.pdf`, and no PDF-generation
process exists in the repo (no pandoc/wkhtmltopdf/puppeteer tooling, no `pdf` script in
`package.json`, no PDF step in any workflow). Markdown remains the repo's source of truth
(per mission brief §13.5); the PDF is treated here as a second copy of the same report.

**Comparison result: content-equivalent.** The PDF was read in full (all 20 sections) and
compared against `ai/reports/FINAL-IMPLEMENTATION-REPORT.md`. Same 20 sections, same
headline numbers (277 skills, 51 new, 145 corrected, 129/129 tests, 449/449 evals,
609 URLs, 29 patterns, +70,236/−1,165). **No substantive differences found.** The only
differences are PDF-text-extraction artifacts (hyphenation across line breaks, table
reflow, interleaved two-column text in §1/§12/§13) — artifacts of extraction, not of
content. All 16 claims below were verified against the repository, and apply equally to
both copies.

## 0.2 Diff-stat reconciliation (report §3/§20 vs PLAN.md)

- The **+70,236** figure in report §3 and §20 is the **total diff vs `main` at the
  Phase 12 commit** — it is NOT a Phase 3 figure. The Phase 3 corrections are
  **+1,715/−507** (report §5; see claim 5 for the registry-inclusion nuance).
- Reconciliation stands (PLAN.md): `bc304a2..d58d6b4` = +70,236 (report's figure, correct
  at that commit); `bc304a2..2f1460b` = +70,240 (fix-up commit `2f1460b` added exactly 4
  lines); `bc304a2..0c8bd48` (current HEAD) = **430 files, +70,304/−1,165** (the +64 is
  the Stage A audit-plan commit `0c8bd48` itself). Verified: `git diff --shortstat
  main...HEAD`.
- The report's figure is therefore stale-by-4-lines at `2f1460b` and stale-by-68 at
  current HEAD — expected, since the report predates the fix-ups. Stage E recalculates
  all metrics from the final HEAD.

## 0.3 Security-scan file-count reconciliation (report §9/§13: "1,032 text files")

The report says the final scan covered "1,032 text files + 4 binary files", but a re-run
at `2f1460b` scanned 1,034 text files. **Explanation confirmed by reproduction** — the
scanner itself was run in throwaway worktrees (removed afterwards):

| Tree | Text files scanned | Result |
| --- | --- | --- |
| `6b0a79e` (Phase 11 commit) | 1,029 | PASS, no findings |
| `01a7173` (Phase 12 commit) | 1,034 | FAIL — CODE-14 self-hit in the report (see below) |
| `0c8bd48` (current HEAD) | 1,035 | FAIL — CODE-14 in `ai/PROJECT-STATUS.md:49` (issue A-01) |

- Commit `01a7173` added exactly **5** text files to the `6b0a79e` tree: 3 decision files
  (`ai/decisions/2026-11-20-{frontmatter-strict-yaml-colons,npx-skills-verification,
  validate-strict-upstream-warnings}.md`), the report itself, and
  `ai/test-results/phase12-final-results.json`. 1,029 + 5 = 1,034. ✓
- The Phase 12 battery's 1,032 = the 1,029-file tree **+ the 3 decision files**, with the
  report and results JSON **not yet written**. This is proven, not assumed: both the
  report and the results JSON *record the scan's own output* ("1032 text files…"), so
  they necessarily postdate the scan; the decision files document fixes the battery then
  verified, so they predate it. 1,029 + 3 = 1,032. ✓
- **Consequence:** the Phase 12 scan ran against a pre-report working tree, which is
  exactly why the report's own CODE-14 self-hit (`rejectUnauthorized: false` quoted as
  evidence for S-11) was not caught in Phase 12 — the file containing it did not exist
  when the scan ran. At the committed `01a7173` tree the scan already fails. The
  report's "check:security PASS" was true for the tree at scan time, not for any
  committed tree containing the report. Stage B must re-run the full battery after every
  fix (see issue A-01).

---

## Claim 1 — 12 phases implemented: PARTIALLY VERIFIED

- **Reported:** All 12 phases implemented and Verified (report §1/§20, `ai/PROJECT-STATUS.md`).
- **Evidence:** `ai/PROJECT-STATUS.md` phase table: all 12 rows "Verified". `git log
  main..HEAD` shows a commit for every phase (P1 `9e8fdfd`, P2 `5229430`, P3 `cabb9cf`,
  P4 ×16 commits, P5 `870ad3c`+`fab49de`, P6 `2a4ebc9`+`cefffab`+`28dca8e`, P7 `2160b8e`,
  P8 `85999fa`, P9 `e6a6b01`, P10 `75ef701`, P11 `6b0a79e`, P12 `01a7173`). Audits exist
  in `ai/audits/`, 26 decision records in `ai/decisions/`.
- **Verification commands:** `grep` of `ai/PROJECT-STATUS.md` phase table;
  `git log --oneline main..HEAD`; `find ai/phaseN -type f | wc -l` per phase;
  `ls ai/test-results/`.
- **Actual result:** the work exists (commits + audits + results), but the per-phase
  evidence packaging is thin: **8 of 12 phase directories are empty on disk with zero
  tracked files** (`ai/phase1, phase2, phase5, phase6, phase7, phase8, phase9, phase12`).
  Only phase3 (11 files), phase4 (14), phase10 (2), phase11 (1) hold content.
  `ai/test-results/` has 14 files covering phases 1, 2, 3, 5, 6, 7, 9, 10, 11, 12 —
  **no `phase4-*` and no `phase8-*` results file exists**.
- **Status: PARTIALLY VERIFIED** — implementation is real and traceable in git, but the
  "phase directory holds the evidence" structure the mission brief expects is mostly
  absent.
- **Corrective action (Stage E):** backfill `ai/phase{1,2,5,6,7,8,9,12}/` with per-phase
  notes and add phase 4/8 results files, or amend the report/PROJECT-STATUS to point at
  the actual evidence locations (git commits, `ai/audits/`, `ai/decisions/`).

## Claim 2 — 277 skills available: VERIFIED

- **Reported:** 277 skills (228 original + 49 upstream).
- **Evidence:** disk, registry, query CLI, and verification sidecar all agree.
- **Verification commands:** `find skills -name SKILL.md | wc -l` (277; 228 excluding
  `skills/upstream/`; 49 under it); `registry/skills.json` (`total_skills: 277`, array
  length 277, 49 upstream); `npm run query -- status` (277 skills: 204 verified, 16
  with limitations, 6 needs-correction, 51 unverified); `sources/verification-status.json`
  (277 entries, identical counts); Node reconciliation of disk paths vs registry paths.
- **Actual result:** 277/277 on disk; disk↔registry diff 0 in both directions; no
  duplicate registry names; no skill missing a category; no name-vs-directory mismatch.
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 3 — 18 skill categories: VERIFIED

- **Reported:** 18 categories.
- **Evidence:** category directories, `registry/categories.json`, per-category counts.
- **Verification commands:** `ls skills/ | wc -l` (18 directories: 17 original +
  `upstream`); `registry/categories.json` (18 entries, names identical to disk).
- **Actual result:** per-category counts match disk exactly (ai-engineering 5,
  architecture 12, auth 14, backend 21, content 19, core 11, database 18, desktop 3,
  documentation 5, frontend 21, infrastructure 22, media 16, metadata 6, performance 8,
  security 8, seo 31, testing 8, upstream 49; sum = 277).
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 4 — 51 newly added skills: VERIFIED

- **Reported:** 51 new original skills in Phase 4 (report §4 lists all 51 names).
- **Evidence:** git history, not the report's list.
- **Verification commands:** `git diff --diff-filter=A --name-only main...HEAD --
  'skills/*/SKILL.md' 'skills/*/*/SKILL.md'` (51 added, 0 under `skills/upstream/`);
  same diff restricted to the Phase 4 commit range `cabb9cf..fcd1c4a` (same 51; Phase 4 =
  16 commits, 12 batch commits matching the 12 batch reports in `ai/phase4/`);
  mechanical `diff` of git-added names vs report §4 names.
- **Actual result:** **51/51 names identical, zero mismatches.** No missing name, no
  extra skill, no extension counted as new. The 2 extensions are also confirmed in git
  (`content-brief` extended in `d670ee1`, `dependency-management` in `b1e5234`).
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 5 — 145 existing skills corrected: PARTIALLY VERIFIED

- **Reported:** 145 original skill files corrected in Phase 3 (+1,715/−507 lines).
- **Evidence:** git history of the Phase 3 commit.
- **Verification commands:** `git show --name-only cabb9cf | grep -E
  '^skills/[^/]+/[^/]+/SKILL\.md$'` (Phase 3 = single commit `cabb9cf`, 161 files,
  +3,470/−511 total; prep commit `7f03057` touched only `ai/` files);
  `git show --numstat cabb9cf` restricted to original SKILL.md files.
- **Actual result:** **exactly 145 distinct original SKILL.md files**; upstream SKILL.md
  touched: 0. Count verified. **But the line figure is not skill-files-only:**
  skill files alone are **+1,693/−485**. The delta (+22/−22) is exactly the registry
  regeneration in the same commit (`registry/compatibility.json` 8/8 +
  `registry/skills.json` 14/14). Report §5 and the PROJECT-STATUS Phase 3 row present
  +1,715/−507 as the skill-correction figure.
- **Status: PARTIALLY VERIFIED** — the substantive claim (145 files) is exact; the
  accompanying line count silently includes registry JSON.
- **Corrective action (Stage E):** clarify wording: "+1,693/−485 lines across 145 skill
  files (+1,715/−507 including registry regeneration)".

## Claim 6 — 24 agents: VERIFIED

- **Reported:** 24 agents.
- **Evidence:** disk count + registry.
- **Verification commands:** `find agents -type f | wc -l` (24 `.md` files);
  `registry/agents.json` (`total_agents: 24`, array length 24); disk↔registry diff 0/0.
- **Actual result:** 24 agents, including the 4 new Phase 8 agents (ai-engineer,
  desktop-engineer, devops-engineer, release-manager).
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 7 — 16 workflows: VERIFIED

- **Reported:** 16 workflows.
- **Evidence:** disk count + registry.
- **Verification commands:** `find workflows -type f | wc -l` (16 `.md` files);
  `registry/workflows.json` (`total_workflows: 16`, array length 16);
  disk↔registry diff 0/0.
- **Actual result:** 16 workflows, including all 7 new Phase 8 workflows.
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 8 — Installer supports dry-run, backups, rollback, restore, manifest: PARTIALLY VERIFIED

- **Reported:** safe CLI with dry-run, backups, atomic installs with rollback, restore,
  manifest generation (report §7).
- **Evidence:** installer code read in full (`scripts/install-skills.mjs` +
  `scripts/install/*.mjs`, 2,883 lines) and all 63 installer-area tests
  (43 installer + 8 library + 4 hashing + 8 targets — report §7 counts exact).
- **Verification commands:** code read (no `npm test` run by this batch — see claim 13);
  `grep` for `swapIn`/`rollback`/`--backup` in `test/`; empirical `/tmp` check that
  Node `fs.cp`/`fs.rm` do not follow symlinks.
- **Actual result, per feature:**
  - **Dry-run — implemented, tested for `install` only.** `--dry-run` parsed at
    `install-skills.mjs:78,202`; `cmdInstall`/`cmdUpdate` print the plan and return
    before executing (`commands.mjs:298,336`); `uninstall`/`restore` have their own
    dry-run branches. **Gap:** `install --dry-run` is NOT side-effect-free with a
    corrupt manifest — `loadManifestForWrite` runs at `commands.mjs:314`, before the
    dry-run check at `:322`, and quarantines (renames) the corrupt manifest.
    Contradicts "change nothing" in `docs/INSTALLATION.md`. No dry-run test for
    `update`, `uninstall`, or `restore`.
  - **Backups — implemented and tested.** `createBackup` (`backups.mjs:47-104`) copies
    to sibling `<parent>/.skillforge-backups/<timestamp>-<id>/` with `backup.json`
    metadata; `backupReplacements` (`installer.mjs:436-456`) backs up all replacements
    before any swap; backup failure blocks replacement. Gaps: `backup.json` written
    last, so a mid-copy failure leaves a partial backup dir reported as "corrupt";
    uninstall's modified/foreign detection string-matches reason text
    (`commands.mjs:992`, `reason.includes('differs')`).
  - **Rollback — implemented NARROWLY, untested, claim overstated.** `swapIn`
    (`installer.mjs:382-401`) renames dest→trash then staged→dest; only a failure of
    the second rename triggers the rollback rename. **No test exercises `swapIn` or
    rollback** (zero matches in `test/`). The two "interrupted install" tests cover
    only pre-swap failures. The swap is **two renames, not atomic** — a kill between
    them leaves the destination missing (old content in `.skillforge-tmp-old-*`,
    deleted by the next run's `cleanStaleStaging`). Post-swap verification failure
    does NOT roll back (`commands.mjs:218-231`): new content stays live while the
    manifest keeps old hashes.
  - **Restore — implemented and tested, with limitations.** `cmdRestore`
    (`commands.mjs:1081-1236`): classifies items by hash, creates a `pre-restore`
    backup before overwriting live content, swaps via `swapIn`. Round-trip tested.
    Limitations: manifest not created/repaired when missing/corrupt; no post-swap
    verification; corrupt `backup.json` unrecoverable despite intact `items/`;
    selective restore and restore `--dry-run` untested.
  - **Manifest generation — implemented and tested, repair is partial.**
    `.skillforge-manifest.json`, atomic tmp+rename write (`manifest.mjs:96-106`),
    per-file hashes, idempotent no-op tested, corrupt-manifest quarantine tested.
    **Gap:** repair quarantines the corrupt manifest and starts fresh — only items in
    that run regain entries; other installed items become orphans. If the quarantine
    rename fails, the fresh manifest overwrites the corrupt one in place.
- **Status: PARTIALLY VERIFIED** — four of five features are real and largely tested;
  "rollback"/"atomic" wording overstates a narrow, untested mechanism, and dry-run
  purity and manifest repair have real gaps.
- **Corrective action (Stages B/C):** add rollback/swap-failure tests; fix dry-run
  ordering (no mutation before the dry-run check); document the two-rename window
  honestly; improve manifest repair (preserve entries for items not in the run);
  test `--backup`, selective restore, restore dry-run.

## Claim 9 — Installer detects modified files and protects user changes: PARTIALLY VERIFIED

- **Reported:** conflict detection by hash; user-modified installs refused (or prompted
  interactively) instead of overwritten (report §7).
- **Evidence:** hash/conflict code read in full; refusal/prompt/force tests read.
- **Verification commands:** code read of `scripts/install/hashing.mjs`,
  `installer.mjs` (`classifyInstall`/`classifyUpdate`), `commands.mjs`
  (`resolveConflicts`, uninstall classification), `prompt.mjs`; test read of
  `test/installer.test.mjs` refusal/prompt/force cases.
- **Actual result:** the core mechanism is sound and tested. Hashes are
  `sha256:<hex>` per file plus a tree fingerprint (`hashing.mjs:17-70`); symlinks are
  recorded as `link:<target>` and never followed. `classifyInstall`/`classifyUpdate`
  produce `install | already | update | conflict`; `resolveConflicts`
  (`commands.mjs:96-134`) refuses non-interactively (exit 1), prompts interactively
  (EOF/empty → skip, safe default), `--force` overwrites only after backup. Refusal
  tests assert exit 1 and user edits intact; the PTY prompt test covers overwrite/skip.
  **Gaps (see issue register):**
  - `update` **silently repoints a diverged symlink** with no backup/prompt
    (`installer.mjs:339` returns action `install` for a link pointing elsewhere, and
    `install` actions are excluded from backups at `commands.mjs:196`) — while
    `classifyInstall` treats the identical situation as a conflict (`:295-300`).
  - **No concurrency control** — no lockfile/mutex; `cleanStaleStaging` deletes all
    `.skillforge-tmp-*` entries including another live run's; manifest
    read-modify-write is last-writer-wins.
  - **Manifest path traversal (High):** `entry.root`/`entry.destName` used unsanitized
    (`manifest.mjs:108-117`); `readManifest` validates only `items`/`format`, never
    entries; `uninstall` runs `rm(destAbs, recursive)` on the result. A crafted
    project-scope manifest (travels via git) can delete/overwrite arbitrary paths.
  - **Restore traversal (Medium):** `restore <id>` joins the user-supplied id
    (`backups.mjs:130-135`) and unsanitized `item.storedAs` (`commands.mjs:1048-1050`).
  - `--backup` flag: **zero occurrences in `test/`**; PTY test never sends abort and
    never covers the uninstall prompt; PTY test skips without `/usr/bin/script`.
- **Status: PARTIALLY VERIFIED** — the main flows genuinely protect user changes, but
  the claim does not hold at the edges (symlink repoint, concurrency, traversal).
- **Corrective action (Stage B):** sanitize/validate manifest entry paths (containment
  check) and restore ids/`storedAs`; treat diverged-link repoint as a conflict;
  add concurrency control (lockfile); add traversal regression tests.

## Claim 10 — Behavioral evaluation contains 449 cases: VERIFIED

- **Reported:** 172 hand-written cases (14 files) + 277 generated discovery cases = 449.
- **Evidence:** case files counted on disk.
- **Verification commands:** Node script counting `.json` files under `evals/cases/`
  and cases in `evals/datasets/discovery-generated.json`.
- **Actual result:** exactly 172 + 277 = 449. Per-file hand-written counts:
  ambiguous-edge 14, content-selection 14, content-technical 15, engineering-code 10,
  engineering-edge 10, engineering-selection 17, engineering-technical 25,
  engineering-workflow 15, negative-hallucination 12, security-refusal 20, seed-code 2,
  seed-security 6, seed-selection 5, seed-technical 7. Generated file = 277 cases.
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 11 — All 449 eval cases pass: VERIFIED

- **Reported:** 449/449 passed, 0 failed, 0 critical.
- **Evidence:** `npm run evals` executed three times by the verifier.
- **Verification commands:** `npm run evals` (×3).
- **Actual result:** every run printed verbatim: `Evals (mock): 449/449 passed
  (100.0%), 0 failed, 0 critical.` / `Coverage: 277/277 skills.` /
  `vs baseline: 0 regression(s), 0 fix(es), 0 new, 0 removed.` — exit 0, no warnings.
  Runs 1–2 byte-identical except timestamps; bySource: hand-written 172/172, generated
  277/277; all 449 scored 100.
- **Status: VERIFIED**
- **Corrective action:** none.

## Claim 12 — 277/277 skills covered by evaluation: VERIFIED (Low caveat)

- **Reported:** 277/277 skills covered, computed against the real skill set.
- **Evidence:** runner code + generated-case/registry reconciliation + selection check.
- **Verification commands:** `npm run evals` output; read of
  `evals/runners/run-evals.mjs` (registry loaded live at :248; coverage =
  `covered.size / registry.skills.length` at :169); Node comparison of generated-case
  skill names vs `registry/skills.json`; verification that the mock agent genuinely
  selected the named skill in all 277 generated cases.
- **Actual result:** registry has 277 skills; generated file has 277 cases, 277 unique
  skills, exact 1:1 match — 0 missing, 0 extra, 0 duplicates; the mock agent genuinely
  selected the named skill in all 277. **Caveat (Low):** the metric is partly
  tautological — `summarize()` adds the case's own declared `skill` field to the
  covered set (`if (r.skill) covered.add(r.skill)`, ~line 156), so 277/277 follows
  from case authorship even if the agent selected nothing. The underlying selection
  behavior is real (verified above), but the metric itself doesn't prove it.
- **Status: VERIFIED** (metric-construction caveat recorded)
- **Corrective action (Stage C, optional):** compute coverage from `selectedSkills` only.

## Claim 13 — 129/129 unit tests pass: VERIFIED as stated (Low counting nuance)

- **Reported:** 129/129 pass, 0 fail, 0 skip.
- **Evidence:** `npm test` executed by the verifier.
- **Verification commands:** `npm test` (exit 0, ~22 s); per-file `test()` counts.
- **Actual result:** output `tests 129, pass 129, fail 0, cancelled 0, skipped 0,
  todo 0`. Per-file counts match the report's breakdown exactly (agents-workflows 8,
  evals 16, hashing 4, installer 43, library 8, registry 15, security 22, targets 8,
  validate 4). **Nuance:** those counts sum to **128**, not 129. The 129th "test" is
  `test/helpers.mjs` itself — a helper module with 0 `test()` calls that `node --test`
  executes as a test file because it lives under `test/` (visible as
  `✔ test/helpers.mjs`). The claim reproduces exactly what `npm test` prints, but the
  true assertion count is 128. Three conditional `test.skip` calls exist
  (`test/installer.test.mjs:560` Windows, `:574` su unavailable, `:616-617` no PTY) but
  none fired on this run.
- **Status: VERIFIED as stated** (counting nuance recorded)
- **Corrective action (Stage E, optional):** scope the test script (e.g. `node --test
  test/*.test.mjs`) or move helpers out of `test/`; optionally correct the headline to
  128 real tests.

## Claim 14 — Security scanner contains 29 patterns: PARTIALLY VERIFIED

- **Reported:** scanner expanded 7 → 29 patterns; "Final run: 1,032 text files + 4
  binary files scanned, no findings" (report §9, §13).
- **Evidence:** pattern library counted by scope; scanner re-run at HEAD.
- **Verification commands:** count of pattern objects in
  `scripts/lib/security-patterns.mjs` by scope (`patternsFor('scan')`,
  `patternsFor('score')`, `patternsFor('input')`); `npm run check:security` at HEAD;
  `git blame` on the finding line; `git diff 2f1460b HEAD --
  scripts/security-scan.mjs`.
- **Actual result — two halves:**
  - **Pattern count VERIFIED and reconciled:** the shared library holds **34**
    patterns total; `patternsFor('scan')` = **29** (SEC-01–07, INJ-01–04, CMD-01–04,
    CODE-01–14); score scope 11, input scope 9 (11 patterns multi-scope).
    `scripts/security-scan.mjs:108` uses exactly `patternsFor('scan')`. The 5
    non-scan patterns are REQ-01–05 (input scope only). "34 in the library, 29 in
    the scanner" is correct.
  - **Scan result NOT VERIFIED — the scan FAILS at HEAD.** `npm run check:security`
    at `0c8bd48` prints: `Scanned 1035 text files + 4 binary files (29 patterns).`
    / `MEDIUM ai/PROJECT-STATUS.md:49 [CODE-14] TLS verification disabled` /
    `REVIEW NEEDED: 1 finding(s) (high 0, medium 1, low 0).` — **exit 1**.
    Root cause (verified, not speculated): fix-up commit `2f1460b` — the commit that
    excepted the final report's CODE-14 quote — itself added `ai/PROJECT-STATUS.md:49`,
    which quotes ``rejectUnauthorized: false`` (matching CODE-14's regex,
    `security-patterns.mjs:198-201`) and is **not** excepted. `git blame` puts line
    49 in `2f1460b`, and the scanner is unchanged since, so the scan already failed
    at the report's final commit. The report's "no findings" / "full battery re-run
    green" (a claim repeated on PROJECT-STATUS.md:49 itself) was already false at
    `2f1460b` — the battery evidently was not re-run after the PROJECT-STATUS.md edit
    was added to the fix-up commit. The finding itself is a quoted-documentation
    false positive, not a live vulnerability — the failure is in the "green battery"
    gate claim, not in repo safety. (File-count drift 1,032 → 1,035 is explained in
    §0.3 and by PLAN.md's addition.)
- **Status: PARTIALLY VERIFIED** — pattern count exact; the "passes with no findings"
  result does not reproduce at HEAD.
- **Corrective action (Stage B):** add an EXCEPTIONS entry for
  `['ai/PROJECT-STATUS.md', 'CODE-14', <reason>]` (same treatment as the final
  report) or reword line 49 to avoid quoting the construct; then re-run the FULL
  battery including `check:security` and correct report §9/§13. Also see issue A-01.
  Note for Stage B: `test/security.test.mjs:29` asserts only `PATTERNS.length >= 25`,
  so pattern-count drift would not fail tests — pin the count.

## Claim 15 — Six upstream commits and their licenses were verified: VERIFIED

- **Reported:** all 6 upstream import commits and licenses re-verified against the
  public GitHub API; `check:upstream` live run: 5 up-to-date, Vercel 4 commits behind
  (report §9/§13, `sources/imported-skills.md`, `sources/licenses.md`).
- **Evidence:** public GitHub API re-verification of every vendor (no rate-limiting
  encountered: 54–58/60 core requests remaining) + local license-file inspection.
- **Verification commands:** `npm run check:upstream`; unauthenticated `curl` to
  `api.github.com` (`/repos/{repo}/commits/{sha}`, `/license`, `/compare/…`, repo
  metadata) plus `raw.githubusercontent.com` fetches of license files at the pinned
  commits; inspection of `skills/upstream/*/ATTRIBUTION.md`,
  `sources/imported-skills.md`, `sources/licenses.md`, and license files in the imports.
- **Actual result:** vendor list confirmed (6 vendors; `skills/upstream/tools/` is NOT
  a 7th vendor — the 11-file marketingskills `tools/` selective import at the same
  commit `5b2b400e…`). All 6 ATTRIBUTION.md files match the pins in
  `sources/imported-skills.md` exactly.

  | Vendor | Source repo | Pinned commit | API: commit exists? Date / message | Drift | License (verified) |
  | --- | --- | --- | --- | --- | --- |
  | Anthropic | anthropics/skills | `e4bb5d96…` | Yes. 2026-11-16, "Update docx, pptx and xlsx skills…" (#2221) | UP-TO-DATE (pinned = head) | Apache-2.0 per-skill LICENSE.txt (7 of 8; `doc-coauthoring` has none upstream — confirmed, matches documented exception; no repo-root LICENSE, API `/license` 404s as expected) |
  | Vercel | vercel-labs/agent-skills | `1a2c79d4…` | Yes. 2026-10-27, "Merge pull request #350…" | **BEHIND by 4** (head `5a37a632…`, 2026-11-20) | MIT via README `## License` at pinned commit (no LICENSE file upstream) |
  | Superpowers | obra/superpowers | `22f0b463…` | Yes. 2026-11-03, "Release v7.0.2…" (#2657) | UP-TO-DATE | MIT (LICENSE, API) |
  | Prisma | prisma/skills | `a6f19295…` | Yes. 2026-11-09, "feat(prisma-postgres-upgrade)…" | UP-TO-DATE | MIT (LICENSE, API) |
  | MarketingSkills | coreyhaines31/marketingskills | `5b2b400e…` | Yes. 2026-11-20, "Merge pull request #1019…" | UP-TO-DATE | MIT (LICENSE, API) |
  | Agentic SEO | pwg-projects/agentic-seo-skill | `67775741…` | Yes. 2026-03-03, "feat: expand agent instructions…" | UP-TO-DATE vs its (dormant) source | MIT (LICENSE, API); local `seo/LICENSE` byte-identical to upstream |

  `npm run check:upstream` reproduced exactly: "5 up-to-date, 1 behind, 0 ahead,
  0 diverged, 0 unknown", exit 0. Vercel drift detail: all 4 commits are
  `web-design-guidelines` changes (`f766b64a` bundle pinned guidelines instead of
  fetching from main, `840f3b0035`, `53b6e3dd`, `5a37a632` merge PR #358) — the
  bundling fix is a genuine behavior change worth taking at the next re-import.
  **S-14 refinement:** the API confirms `pwg-projects/agentic-seo-skill` is **a fork
  of `Bhanunamikaze/Agentic-SEO-Skill`** (`parent`/`source` both = author's repo),
  `pushed_at: 2026-03-03`, head = pinned commit. The author's repo is active (last
  push 2026-10-14, 1,075 stars, MIT, not a fork), contains the pinned commit, and is
  **50 commits ahead** of the pin (`ahead_by: 50`, `behind_by: 0`). The report's
  wording ("author's active repo is a separate, non-fork repo") is accurate but
  understates it: the import source is literally a fork of the author's repo. The
  MONITOR decision stands; re-pointing at the next re-import remains the right action.
- **Status: VERIFIED**
- **Corrective action:** none blocking. Minor (Stage E): record the second agentic-seo
  copyright holder (`agricidaniel`, listed in the upstream LICENSE alongside Bhanu
  Namikaze but named nowhere in `sources/licenses.md`/ATTRIBUTION.md); consider
  preserving upstream LICENSE files in the three MIT imports that ship none
  (superpowers, prisma, marketingskills — only ATTRIBUTION.md records holder + license).

## Claim 16 — 609 URLs passed online link validation: VERIFIED (wording caveat)

- **Reported:** re-run PASS — 73 internal links, 609 unique external URLs verified,
  51 skipped (documented exceptions), 0 errors. First run had 1 transient error
  (`https://cursor.com/docs/skills` — HTTP 403, attributed to rate-limiting).
- **Evidence:** full online re-run by the verifier + code read of the checker.
- **Verification commands:** `node scripts/check-links.mjs --online` (background,
  completed in **~9 min / 542 s** vs the report's ~6 min; same outcome). Full log at
  `/tmp/sf-linkcheck-20261120.log` (ephemeral scratch, not a repo file). Read of
  `scripts/check-links.mjs` for the validation rules.
- **Actual result — exact reproduction of all four numbers:**
  `Checked 73 internal links; 609 unique external URLs verified (51 skipped: example
  domains / documented exceptions). PASS.` Exit 0. Internal 73 (0 broken); unique
  external 609; skipped 51 = **43 documented-exception URLs** (logged) + **8
  example-domain URLs** (silently skipped, not logged — confirmed exactly 8 unique
  `example.com*` URLs in non-upstream Markdown links); errors **0** — the
  `cursor.com/docs/skills` 403 did **not** recur (the URL is in scope at
  `docs/INSTALLATION.md:145` and passed this run).
  **Validation rules (read from code):** scope = all `*.md` except `.git`,
  `node_modules`, and (by default) `skills/upstream/`; only Markdown `[text](url)`
  links matched; `mailto:` and `#` anchors ignored; internal links checked by file
  existence only (fragment stripped, no anchor validation). "Verified" = sequential
  `HEAD` request per unique URL with a browser User-Agent, `redirect: 'follow'`, 15 s
  timeout; on 405/403/429 only, one `GET` retry (body cancelled). Any final status
  < 400 = pass; ≥ 400 or any fetch throw (timeout, DNS, connection) = error, exit 1.
  **No retry, no delay, no concurrency** — strictly sequential loop, no backoff, no
  second attempt on network errors/timeouts (confirmed from code; this is the mechanism
  behind the report's transient 403). **"Skipped"** = RFC 2606 example domains
  (silently) + 21 prefix entries in the `EXCEPTIONS` list (logged with reason; each
  claims independent verification by curl/browser on 2026-11-20).
  **Wording caveat:** skipped URLs are NOT HTTP-checked but ARE included in the "609
  verified" headline — the summary line counts total unique external URLs enumerated.
  Strictly, **558 URLs were HTTP-checked and 51 skipped**. The report's wording mirrors
  the script's own summary line verbatim, so the claim reproduces exactly as stated —
  but the headline overstates live verification by 51. Skipped breakdown by reason
  (43 logged): 403-blocking hosts 17 (w3.org 9, dev.mysql.com 2, webpagetest 1,
  poynter 1, npmjs 1, securityheaders 1, validator.w3.org 1, midjourney 1); Node-fetch
  timeouts 10 (martinfowler.com 9, refactoring.com 1); Node-fetch 404s 6
  (support.google.com) + 2 (csrc.nist.gov, curl+browser verified);
  unreachable-from-environment 2 (socket.dev, pgbouncer.github.io); login-required
  dashboards 2 (dash.cloudflare.com, vercel.com/dashboard); 401 (unsplash) 1; 400
  (developers.facebook.com) 1; Redis release-notes timeout 1; ftc.gov 1. The 43
  exception-skipped URLs' independent verification (curl/browser, 2026-11-20) was NOT
  re-checked here — that is the weekly CI job's remit (L-11 fix).
- **Status: VERIFIED** (wording caveat recorded)
- **Corrective action (Stage E):** report "609 unique external URLs (558 checked live,
  51 skipped)" instead of "609 verified". Consider the report's own §20 suggestion:
  link-checker hardening (retry with backoff on 403/429, small inter-request delay) to
  reduce weekly-CI flakiness (Stage D/E).

---

## Cross-cutting notes

- **No claim was found to be fabricated.** Every quantitative claim reproduced exactly
  or within an explained delta. The discrepancies found are: stale gate results (claim
  14), overstated installer wording (claims 8–9), thin evidence packaging (claim 1),
  and counting/wording nuances (claims 5, 12, 13, 16).
- **The most important Stage A finding is not a report error but a live gate failure:**
  `npm run check:security` exits 1 at HEAD (issue A-01). Any PR from this branch would
  fail the `security-audit` CI workflow on its first run.
- **The most important security finding is installer manifest path traversal**
  (issue A-02, High) — a crafted project-scope manifest can drive arbitrary
  delete/write. This was not in the report or the Phase 7 audit.
- **Eval/test quality is genuinely good:** the mock agent tests real behavior
  (retrieval, grounding, `node --check` on generated code); no vacuous tests were found
  in the eval path. The weaknesses are metric construction (claim 12 caveat), one
  misnamed test, and `npm test` clobbering the eval report (issue A-08).
- All issues found are recorded in `ai/remediation/ISSUE-REGISTER.md` with severity,
  evidence, affected files, and owning stage.
