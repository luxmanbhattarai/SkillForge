# Stage A — Issue Register: Final Production Readiness Audit

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (HEAD `0c8bd48`)
- **Sources:** the 16-claim verification matrix (four parallel batches + coordinator
  checks), the report's own §18/§19 limitations, and the Phase 7 security audit
  (S-01–S-15) carried forward for Stage B re-review.
- **Severity scale:** Critical = exploitable now / live credential / data loss in the
  main flow; High = release-blocking or exploitable with a realistic path; Medium = a
  real weakness with bounded blast radius or a materially overstated claim; Low =
  hygiene, test gaps, doc precision; Informational = noted, no fix required.
- **ID prefixes:** `A-` = new Stage A findings; `S-` = Phase 7 security findings
  carried forward; `L-` = report §18 limitations carried forward.
- **Stage B (2026-11-20):** all 21 Stage B issues were addressed — see `ai/remediation/STAGE-B-RESULTS.md`. Each Stage B issue below carries a Stage B status line.

## Summary by severity

| Severity | Count | IDs |
| --- | --- | --- |
| Critical | 0 | — |
| High | 3 | A-01, A-02, S-08 |
| Medium | 15 | A-03–A-10, S-07, S-09, S-10, S-11, S-14, L-51, L-CI |
| Low | 26 | A-11–A-28, S-12, S-13, L-Node, L-Scan, L-Settings, L-Win, L-Model, L-Prisma |
| Informational | 8 | A-29–A-35, L-02/L-03 |
| **Total** | **52** | |

## Summary by stage

| Stage | Count | IDs |
| --- | --- | --- |
| B (high-risk fixes) | 21 | A-01–A-09, A-14, A-16, A-20, A-30, S-07–S-14 |
| C (quality) | 12 | A-10, A-12, A-13, A-15, A-17, A-19, A-31, A-33, A-34, L-51, L-Model, L-Prisma |
| D (platform & CI) | 8 | A-11, A-23, A-27, A-29, L-CI, L-Node, L-Scan, L-Win |
| E (final verification) | 11 | A-18, A-21, A-22, A-24–A-26, A-28, A-32, A-35, L-Settings, L-02/L-03 |

Note: A-23 (link-checker hardening) and A-27 (Vercel re-import decision) are listed
under D with E involvement. Counts sum to 52 (21 + 12 + 8 + 11).

---

## New findings (Stage A)

### A-01 — High — Security scan FAILS at HEAD; report's "green battery" claim is false (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — 8 narrow per-file/per-pattern exceptions (each with a reason); scan passes, exit 0. See STAGE-B-RESULTS.md. Commit `c5d2be6`.
- **Evidence:** `npm run check:security` at `0c8bd48` exits 1: `MEDIUM
  ai/PROJECT-STATUS.md:49 [CODE-14] TLS verification disabled`. `git blame` puts line
  49 in fix-up commit `2f1460b` — the commit that excepted the final report's CODE-14
  quote itself added a new unexcepted quote of ``rejectUnauthorized: false``. The
  scanner is unchanged since, so the scan already failed at the report's final commit.
  The finding is a quoted-documentation false positive, not a live vulnerability — but
  the release gate is red: the `security-audit` CI workflow would fail on the first PR.
- **Affected files:** `ai/PROJECT-STATUS.md:49`, `scripts/security-scan.mjs`
  (EXCEPTIONS), report §9/§13.
- **Fix:** add an EXCEPTIONS entry for `['ai/PROJECT-STATUS.md', 'CODE-14', <reason>]`
  or reword line 49; then re-run the FULL battery including `check:security` and
  correct the report. Add a regression test proving the exception doesn't suppress
  genuine TLS findings.

### A-02 — High — Installer manifest path traversal / arbitrary delete+write (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — entry validation on read (fail-closed: invalid entry = corrupt manifest) + defensive guards in entryRoot/entryDest; two-tier root rule (exact vs shape). Hardening: skill entries must have root `.`; tier-2 terminal dir must match the kind. Residual: tier-2 agent/workflow roots can point at an arbitrary agents/workflows-named dir (bounded; recorded in STAGE-B-RESULTS.md). Commits `19e4f53`, `19a57e8`.
- **Evidence:** `entry.root`/`entry.destName` are used unsanitized: `entryRoot`
  accepts absolute roots (`scripts/install/manifest.mjs:108-113`), `entryDest` joins
  without containment (`:115-117`), and `readManifest` (`:69-94`) validates only the
  `items` object and `format` — never entries. `uninstall` runs
  `rm(destAbs, recursive)` on the result; `update`/`restore` write there. A
  project-scope manifest travels via git, so a crafted manifest in a cloned repo makes
  another user's `update`/`uninstall`/`restore` delete or overwrite arbitrary paths.
  No test covers this (`test/security.test.mjs` has no installer-traversal test).
- **Affected files:** `scripts/install/manifest.mjs:69-117`,
  `scripts/install/commands.mjs` (uninstall `rm` ~:1010-1022, `entryDest` uses).
- **Fix:** validate manifest entries on read (relative `root`/`destName`, containment
  within the skills dir, reject `..`/absolute); add traversal regression tests for
  uninstall/update/restore.

### A-03 — Medium — `restore` id + `backup.json` traversal (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — restore id validated as a single segment matching an existing backup directory (planted symlinks rejected); whole backup record validated before use. Hardening: effective entry destName must match the backup item name. Commits `19e4f53`, `19a57e8`.
- **Evidence:** `readBackup` (`scripts/install/backups.mjs:130-135`) does
  `path.join(backupsDir, id)` with the user-supplied positional id — `restore ../../x`
  reads any `backup.json` on disk. `backupItemPaths` (`commands.mjs:1048-1050`) joins
  unsanitized `item.storedAs` from that JSON, and restore writes to unsanitized
  `entry.root`/`destName`. A crafted backup.json (e.g. inside a cloned repo's
  `.skillforge-backups/`) yields arbitrary file write via `cp` + `swapIn`.
- **Affected files:** `scripts/install/backups.mjs:130-135`,
  `scripts/install/commands.mjs:1048-1050, ~1125`.
- **Fix:** validate the restore id (basename only, must match an existing backup dir)
  and `storedAs`/`entry` paths (containment); regression tests.

### A-04 — Medium — No concurrency control in the installer (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — lockfile `.skillforge-lock` (atomic create, pid + timestamp + token); fail-fast on contention; stale takeover only when pid is dead AND lock is older than 10 min. Commit `19e4f53`.
- **Evidence:** no lockfile/mutex anywhere (grep: none). Two concurrent runs:
  `cleanStaleStaging` (`installer.mjs:359-379`) deletes **all** `.skillforge-tmp-*`
  entries including another live run's staging/trash (names carry pid+rand but cleanup
  ignores pid); manifest read-modify-write is last-writer-wins (entries silently
  lost); `swapIn`'s exists-check→rename is a TOCTOU.
- **Affected files:** `scripts/install/installer.mjs:359-379`,
  `scripts/install/commands.mjs:189, 272-275`.
- **Fix:** lockfile (or equivalent) around install/update/uninstall/restore runs;
  stale-cleanup must respect live pids; test concurrent runs.

### A-05 — Medium — "Atomic swap" is two renames, not atomic; rollback unguarded and untested (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — rollback rename guarded (both errors reported, neither copy deleted on double failure); swapIn takes injectable fs ops for fault-injection tests; docs now say "two-rename swap (not atomic)". Commit `19e4f53`. (`install-skills.mjs` header wording remains A-31, Stage C.)
- **Evidence:** `swapIn` (`installer.mjs:382-401`) renames dest→trash then staged→dest;
  a kill between them leaves the destination missing (old content only in
  `.skillforge-tmp-old-*`, deleted by the next run's cleanup; recoverable only via
  backup). The rollback rename itself is unguarded (`:395`); trash `rm` is
  fire-and-forget (`:400`). **No test exercises `swapIn` or rollback** (zero matches
  in `test/`). Docs ("swapped in with renames", "previous content is put back") and
  report §7 ("Atomic installs with rollback") overstate this.
- **Affected files:** `scripts/install/installer.mjs:382-401`,
  `scripts/install-skills.mjs:11-14`, `docs/INSTALLATION.md`, report §7.
- **Fix:** guard the rollback rename; add swap-failure/rollback tests (fault-injected
  rename); document the two-rename window honestly.

### A-06 — Medium — Post-swap verification failure leaves replaced content live, no rollback (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — pre-swap verification (staged content hash-checked before it can reach the destination); post-swap check kept as a second layer with rollback from the pre-replacement backup (or removal of a fresh bad install). Post-swap branch covered at unit level only (unreachable via CLI after a passing pre-swap check). Commit `19a57e8`.
- **Evidence:** `executeInstallRun` swaps in, then hash-verifies
  (`commands.mjs:218-231`); on mismatch the item reports `failed` but new content is
  installed and the manifest still records old hashes, so the next run sees a conflict.
- **Affected files:** `scripts/install/commands.mjs:218-231`.
- **Fix:** verify staged content before the swap, or roll back on post-swap mismatch;
  test the mismatch path.

### A-07 — Medium — `update` silently repoints a diverged symlink, no backup/prompt (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — diverged link-method symlink is now a conflict (matching classifyInstall); goes through refuse/prompt/force-with-backup. Commit `19a57e8`.
- **Evidence:** `classifyUpdate` (`installer.mjs:339`) returns action `install` ("link
  is broken or points elsewhere") for a link-method item whose symlink points
  elsewhere. `install` actions are excluded from backups (`commands.mjs:196`), so a
  user's deliberate repoint (e.g. to their own fork) is destroyed without backup or
  prompt — the link target survives, but the user's link choice is lost. Inconsistent
  with `classifyInstall` (`installer.mjs:295-300`), which treats the same situation as
  a **conflict**.
- **Affected files:** `scripts/install/installer.mjs:339` vs `:295-300`,
  `scripts/install/commands.mjs:196`.
- **Fix:** treat diverged-link repoint as a conflict (refuse/prompt/force-with-backup);
  test it.

### A-08 — Medium — `install --dry-run` mutates state with a corrupt manifest (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — dry-run classifies against a read-only manifest read; a corrupt manifest is noted, not quarantined. Other dry-run paths verified read-only. Commit `19a57e8`.
- **Evidence:** `loadManifestForWrite` runs at `commands.mjs:314`, before the dry-run
  check at `:322`, and quarantines (renames) a corrupt manifest. Contradicts "change
  nothing" in `docs/INSTALLATION.md` and `install-skills.mjs:107`.
- **Affected files:** `scripts/install/commands.mjs:57-94, 314, 322-325`.
- **Fix:** move the dry-run check before any manifest mutation (or make manifest load
  read-only in dry-run mode); add a dry-run-with-corrupt-manifest test.

### A-09 — Medium — Manifest repair is partial and can lose the corrupt original (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — quarantine failure fails closed (never overwrites the corrupt original); entries for library-identical items rebuilt from a disk scan; incremental manifest writes after each item. Commit `19a57e8`.
- **Evidence:** `loadManifestForWrite` (`commands.mjs:57-94`) quarantines a corrupt
  manifest and starts fresh — only items in that run regain entries. Other installed
  items lose entries and become orphans; modified ones then classify as "unrelated
  content" conflicts on next install. Docs don't mention the entry loss. If the
  quarantine rename fails (`:79-82`), the fresh manifest later **overwrites the
  corrupt one in place** — the "never deleted" guarantee fails exactly when the
  filesystem is already unhappy. Manifest is also only written at run end, so a kill
  mid-run leaves installed items unrecorded (adoptable later by re-running install).
- **Affected files:** `scripts/install/commands.mjs:57-94, 272-275`,
  `docs/INSTALLATION.md`.
- **Fix:** preserve/recover entries for items not in the run (e.g. rebuild from disk
  scan); never overwrite the corrupt original in place; document repair semantics.

### A-10 — Medium — `npm test` clobbers the eval report (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — `--out <dir>` flag added to the runner (redirects `latest.json`/`latest.md` and the regression comparison); the smoke test now uses a temp dir and asserts `evals/reports/latest.json` is byte-identical afterwards. Commit `cee083e`. (Note: `evals/reports/` is gitignored, so the clobbering was a local-artifact issue, not a committed-file issue.)
- **Evidence:** the smoke test `test/evals.test.mjs:99-105` spawns the real runner with
  `--cases SEC-inject-001`, overwriting `evals/reports/latest.json/.md` with a 1-case
  report. Observed: after `npm test`, `latest.json` showed total 1, passed 1. The
  runner has no `--out` flag to redirect.
- **Affected files:** `test/evals.test.mjs:99-105`, `evals/runners/run-evals.mjs`.
- **Fix:** add a `--out` flag to the runner (or make the smoke test use a temp output
  dir); restore the 449-case report after `npm test` in CI if needed.

### A-11 — Low — Windows `--link`: no junction fallback (Stage D)

- **Evidence:** `stageItem` (`installer.mjs:403-434`) uses symlink type `'dir'`; the
  only Windows handling is an EPERM→clear-error branch (`:420`). Node `'junction'`
  symlinks need no privilege on Windows and are not tried, so `--link` fails outright
  without Developer Mode/admin instead of degrading. No EPERM/EBUSY handling for
  Windows file-locking on rename/rm either. Untestable statically on Linux — needs the
  Stage D Windows run.
- **Affected files:** `scripts/install/installer.mjs:403-434`.
- **Fix:** try junction fallback on Windows EPERM; add Windows CI leg; document
  Developer Mode behavior. Never claim real Windows execution without it.

### A-12 — Low — `--backup` flag entirely untested (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — 1 test: `--backup` backs up a modified conflict and a foreign-content conflict and overwrites without prompting; the backup holds the pre-conflict content byte-identical. Commit `4705e0c`.
- **Evidence:** zero occurrences in `test/`. The flag is parsed
  (`install-skills.mjs:78,203`) and treated identically to `--force` in
  `resolveConflicts` (`commands.mjs:110`) but never executed by any test.
- **Affected files:** `test/installer.test.mjs`, `scripts/install/commands.mjs:110`.
- **Fix:** add a `--backup` test (conflict → backup → overwrite).

### A-13 — Low — Rollback, stale-cleanup, and several prompt paths untested (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — 6 tests: 3 dry-run (update/uninstall/restore, byte-identical state asserted) and 3 PTY (abort; uninstall `--all` prompt; modified-content uninstall prompt). SwapIn failure/rollback and stale-cleanup were already covered by Stage B (A-05/A-30) — verified, not duplicated. `runCliPty` now looks `script` up on PATH and returns a skip reason. PTY tests still skip on systems without `script` (notably Windows) — a `node-pty` dependency decision for Stage D. Commit `4705e0c`.
- **Evidence:** no test for `swapIn` failure/rollback; no test creates
  `.skillforge-tmp-*` leftovers to exercise `cleanStaleStaging`; no restore/uninstall/
  update dry-run test; PTY test never sends abort (`a`) and never covers the uninstall
  prompt; PTY test skips without `/usr/bin/script`.
- **Affected files:** `test/installer.test.mjs`, `test/helpers.mjs`.
- **Fix:** add the missing tests (see also A-05, A-08).

### A-14 — Low — Uninstall removes manifest-matching content with no backup (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — items no longer in the library are backed up before uninstall. Commit `19a57e8`.
- **Evidence:** `commands.mjs:991-992` — `needBackup` only covers modified/foreign
  items. If the skill was since removed from the library, the only copy is gone
  (recoverable only from git history). By design, but undocumented.
- **Affected files:** `scripts/install/commands.mjs:991-992, 924`,
  `docs/INSTALLATION.md`.
- **Fix:** document the behavior; consider backing up when the item no longer exists
  in the library.

### A-15 — Low — `needBackup` detection string-matches reason text (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — structured boolean `needsBackup` set at classification time in `runUninstall`; the filter reads the flag instead of reason text; `notInLibrary` removed. 1 test pins all three classifications in a single run; the A-14 test passes unchanged. Verified: no `reason.includes` or `notInLibrary` remains in `scripts/` or `test/`. Commit `4705e0c`.
- **Evidence:** `commands.mjs:991-992` (`reason.includes('differs')`) — a reason-text
  edit silently disables backup for modified/foreign uninstalls.
- **Affected files:** `scripts/install/commands.mjs:991-992`.
- **Fix:** use a structured classification field instead of string matching.

### A-16 — Low — Restore gaps (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — post-swap verification on restore with rollback; manifest created/repaired on restore; corrupt backup.json recovered from items/ (crafted records still rejected); partial backup dirs cleaned up on failure. Commit `19a57e8`.
- **Evidence:** no post-swap verification (unlike install, `commands.mjs:225-231`);
  manifest repair only happens if a manifest exists **and** the backup item has an
  entry (`:1211`) — if the manifest is missing/corrupt, restored items become
  orphans and no manifest is created; a backup with corrupt/unreadable `backup.json`
  is unrecoverable even if `items/` content is intact (`backups.mjs:106-135`;
  `readBackup` throws → UsageError); partial backup dirs from mid-copy failures linger
  as "corrupt" entries (`backup.json` written last, `backups.mjs:47-104`).
- **Affected files:** `scripts/install/commands.mjs:1209-1222`,
  `scripts/install/backups.mjs:47-135`.
- **Fix:** post-swap verification on restore; create/repair the manifest on restore;
  recover `items/` content when `backup.json` is corrupt; clean up partial backup dirs.

### A-17 — Low — Eval coverage metric is partly tautological (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — coverage computed from `selectedSkills` only; the full run still reports 277/277, confirming the number holds from real selection. Commit `cee083e`.
- **Evidence:** `summarize()` adds the case's own declared `skill` field to the
  covered set (`if (r.skill) covered.add(r.skill)`, `run-evals.mjs` ~line 156), so
  277/277 follows from case authorship even if the agent selected nothing. The
  underlying selection behavior was independently verified as real (all 277 generated
  cases genuinely selected), so this is a metric-construction issue, not a false
  coverage claim.
- **Affected files:** `evals/runners/run-evals.mjs`.
- **Fix:** compute coverage from `selectedSkills` only.

### A-18 — Low — Test count: 129 printed vs 128 real tests (Stage E)

- **Evidence:** per-file `test()` counts sum to 128; the 129th "test" is
  `test/helpers.mjs` itself, executed as a test file with 0 tests because it lives
  under `test/` (visible as `✔ test/helpers.mjs` in `npm test` output).
- **Affected files:** `package.json` (test script), `test/helpers.mjs`, report §13/§15.
- **Fix:** scope the test script (e.g. `node --test test/*.test.mjs`) or move helpers
  out of `test/`; correct the headline to 128 real tests.

### A-19 — Low — Misnamed test; unknown-skill rejection path untested (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — test renamed to "runner exits 2 when the --cases filter matches nothing"; real `validateCases` tests added (unknown skill / expected skill / notSkill, plus duplicate-id, unknown-category, no-expectations); `validateCases` exported with a main-guard. Commit `cee083e`.
- **Evidence:** `test/evals.test.mjs:107` "runner rejects an unknown skill in a case
  file" actually tests a bad `--cases` filter (its own comment admits this); the
  `validateCases` unknown-skill rejection path is untested despite the name — a test
  that would pass even if that validation were removed.
- **Affected files:** `test/evals.test.mjs:107`.
- **Fix:** rename the test to what it tests; add a real unknown-skill rejection test.

### A-20 — Low — Pattern count not pinned by tests (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — exact counts asserted: 34 total, 29 scan, 11 score, 9 input. Commit `c5d2be6`.
- **Evidence:** `test/security.test.mjs:29` asserts only `PATTERNS.length >= 25`; line
  46 asserts a relational invariant, not == 29/34. Count drift wouldn't fail tests.
- **Affected files:** `test/security.test.mjs:29,46`.
- **Fix:** assert exact scan/score/input scope counts (29/11/9) and total (34).

### A-21 — Low — Phase 3 line-count figure includes registry JSON (Stage E)

- **Evidence:** report §5 and PROJECT-STATUS Phase 3 row present +1,715/−507 as the
  skill-correction figure; skill files alone are +1,693/−485 (commit `cabb9cf`
  numstat). The +22/−22 delta is registry regeneration in the same commit.
- **Affected files:** `ai/reports/FINAL-IMPLEMENTATION-REPORT.md` §5,
  `ai/PROJECT-STATUS.md`.
- **Fix:** clarify wording (see matrix claim 5).

### A-22 — Low — Thin per-phase evidence packaging (Stage E)

- **Evidence:** 8 of 12 `ai/phaseN/` directories are empty (0 tracked files:
  phase1, 2, 5, 6, 7, 8, 9, 12); `ai/test-results/` has no `phase4-*` or `phase8-*`
  results file. The work itself is traceable in git commits and `ai/audits/`.
- **Affected files:** `ai/phase*/`, `ai/test-results/`.
- **Fix:** backfill per-phase notes and missing results files, or repoint evidence
  references (see matrix claim 1).

### A-23 — Low — Link checker has no retry, delay, or concurrency control (Stage D/E)

- **Evidence:** `scripts/check-links.mjs` runs a strictly sequential HEAD burst, single
  GET fallback only on 405/403/429, no backoff, no retry on timeouts/network errors.
  This is the mechanism behind the report's transient `cursor.com` 403 and makes
  weekly CI runs flaky-prone. The report's own §20 already suggests this hardening.
- **Affected files:** `scripts/check-links.mjs`.
- **Fix:** retry with backoff on 403/429, small inter-request delay.

### A-24 — Low — "609 verified" counts 51 skipped URLs (Stage E)

- **Evidence:** only 558 URLs were HTTP-checked; 43 exception + 8 example-domain URLs
  were never fetched in the run, but the script's summary line (mirrored verbatim by
  the report) counts all 609 enumerated URLs as "verified".
- **Affected files:** `scripts/check-links.mjs` (summary line),
  `ai/reports/FINAL-IMPLEMENTATION-REPORT.md` §15.
- **Fix:** report "609 unique external URLs (558 checked live, 51 skipped)".

### A-25 — Low — No LICENSE file preserved in 3 of 6 upstream imports (Stage E)

- **Evidence:** superpowers, prisma, marketingskills ship no license file in the
  imported copy (only ATTRIBUTION.md records holder + license); Vercel has no LICENSE
  upstream at all (README-only MIT). MIT redistribution requires preserving the
  copyright notice; ATTRIBUTION.md arguably satisfies this, but the license text
  itself is absent. (`find skills/upstream -iname "*license*"` returns only
  agentic-seo + anthropic files.)
- **Affected files:** `skills/upstream/{superpowers,prisma,marketingskills}/`,
  `sources/licenses.md`.
- **Fix:** consider preserving upstream LICENSE files at the next re-import; record
  the decision.

### A-26 — Low — Agentic-seo second copyright holder unrecorded (Stage E)

- **Evidence:** upstream `LICENSE` (byte-identical to the local copy) lists
  `Copyright (c) 2026 Bhanu Namikaze` **and** `Copyright (c) 2026 agricidaniel`;
  `sources/licenses.md` and ATTRIBUTION.md name only Bhanu Namikaze.
- **Affected files:** `sources/licenses.md`,
  `skills/upstream/agentic-seo/ATTRIBUTION.md`.
- **Fix:** record both copyright holders.

### A-27 — Low — Vercel upstream 4 commits behind (Stage D/E)

- **Evidence:** `npm run check:upstream` + GitHub compare API: pinned `1a2c79d4…`,
  head `5a37a632…` (2026-11-20). All 4 commits are `web-design-guidelines` changes,
  including a fix to bundle guidelines instead of fetching from `main` — a genuine
  behavior change worth taking.
- **Affected files:** `skills/upstream/vercel/`, `sources/imported-skills.md`.
- **Fix:** re-import decision at the next update cycle (per `docs/UPDATE-PROCESS.md`).

### A-28 — Low — Report §9/§13 file count (1,032) is stale (Stage E)

- **Evidence:** 1,032 was accurate for the working tree at scan time (see matrix
  §0.3), but no committed tree scans 1,032 (1,029 at `6b0a79e`, 1,034 at `01a7173`,
  1,035 at HEAD). The report doesn't state the scan ran before the report/results
  files existed.
- **Affected files:** `ai/reports/FINAL-IMPLEMENTATION-REPORT.md` §9/§13.
- **Fix:** annotate the report (or the remediation report) with the timing explanation.

### A-29 — Informational — Paths with spaces/unicode untested (Stage D)

- **Evidence:** the installer does no shelling (pure `fs` ops), so spaces/unicode
  should work, but no test exercises them. (Test-only note: the permission test builds
  a single-quoted shell command, `test/installer.test.mjs` ~:560.)
- **Affected files:** `test/installer.test.mjs`.
- **Fix:** add space/unicode path tests in Stage D.

### A-30 — Informational — Stale-staging cleanup is narrow (Stage B)

- **Stage B status (2026-11-20):** **Fixed** — cleanup widened (all roots, install/update/uninstall/restore, even when everything is already); trash dirs never auto-deleted; doctor distinguishes trash from staging. Commit `19a57e8`.
- **Evidence:** only runs in `executeInstallRun` for roots of items being written
  (`commands.mjs:187-192`); a run where everything is `already` leaves leftovers, and
  `restore`/`uninstall` never clean them (`doctor` only reports). Also deletes
  `.skillforge-tmp-old-*` trash without checking a backup exists.
- **Affected files:** `scripts/install/commands.mjs:187-192`,
  `scripts/install/installer.mjs:359-379`.
- **Fix:** widen cleanup coverage; check for a backup before deleting trash.

### A-31 — Informational — Doc claims contradicting code (Stage C)

- **Stage C status (2026-11-20):** **Partially fixed** — (1) the "update repairs broken links" sub-claim is moot: Stage B's A-07 fix made diverged links a conflict, and the doc no longer makes the claim; (2) the uninstall-doc sub-claim was resolved by Stage B's A-14 doc update (the doc now states unmodified manifest-matching content is removed without a backup); (3) the `install-skills.mjs` header "swapped in atomically" was fixed in Stage C (commit `1c8e657` — now two renames, each atomic, the pair not); (4) the report §7 remainder ("Atomic installs with rollback … tested, including interrupted installs") goes to Stage E's report-reconciliation pass — the report is a historical record, the "atomic" wording is now outdated, and a kill mid-swap is still not testable at CLI level.
- **Evidence:** `docs/INSTALLATION.md` "update … repairs broken links" omits that it
  also silently repoints diverged links (A-07); "Uninstall … removes only what the
  manifest records (or, with --force, foreign content after a backup)" omits that
  unmodified content is removed **without** backup (A-14); `install-skills.mjs`
  header "swapped in atomically" overstates A-05; report §7 "tested, including
  interrupted installs" — the tests cover pre-swap failures only, not swap failure or
  a kill mid-swap (A-13).
- **Affected files:** `docs/INSTALLATION.md`, `scripts/install-skills.mjs:11-14`,
  report §7.
- **Fix:** align docs with actual behavior (after the underlying fixes land).

### A-32 — Informational — Two upstream ATTRIBUTION.md files modified (Stage E)

- **Evidence:** report §5 says "No upstream skill was edited at any point" — true for
  skill *content* (0 upstream SKILL.md files modified in `main...HEAD`), but 2
  upstream files were modified: `skills/upstream/marketingskills/ATTRIBUTION.md` and
  `skills/upstream/superpowers/ATTRIBUTION.md`, both in `caf1f32` (purely additive
  sections documenting the tools import and unimported siblings). Benign and
  documented, but a nuance to the verbatim policy if it is meant to cover the whole
  `skills/upstream/` tree.
- **Affected files:** `skills/upstream/marketingskills/ATTRIBUTION.md`,
  `skills/upstream/superpowers/ATTRIBUTION.md`.
- **Fix:** record as a documented exception to the verbatim policy (or clarify the
  policy covers skill content, not project-maintained attribution files).

### A-33 — Informational — Generated eval cases are deliberately circular (Stage C)

- **Stage C status (2026-11-20):** **Improved** — 14 non-circular discovery cases added (`evals/cases/discovery-realistic.json`, `DIS-real-*`), all passing; first drafts exposed 4 genuine discoverability gaps (recorded in `ai/remediation/stage-c/evals-results.md`, not hidden). Generated cases and their disclosure untouched — circular by design. Commit `cee083e`.
- **Evidence:** input is the skill's own description verbatim
  (`evals/datasets/generate-discovery-cases.mjs`: `input: "I need help with this:
  ${s.description}"`). The generator header states this openly ("deliberately
  circular… never counted as behavioral proof") and the report separates 172/277.
  62% of cases are this smoke-test form. Disclosed; no fix required.
- **Affected files:** `evals/datasets/generate-discovery-cases.mjs`.
- **Fix:** none — keep the disclosure; Stage C may add non-circular discovery cases.

### A-34 — Informational — Content checks prove presence, not surfacing (Stage C)

- **Stage C status (2026-11-20):** **Partially strengthened** — a `grounded-in` check was added to the content scorer (evaluated skill must be among selected skills; all 86 content cases already satisfy it, 0 new failures). The "phrase anywhere in the file" half is deliberately unfixed — restricting the answer would invalidate the baseline — with the disclosure intact and now precisely worded. Commit `cee083e`.
- **Evidence:** the primary skill's full body is included in the grounded answer
  (`mock-agent.mjs` `answer()`), so `mustInclude` passes if the phrase appears
  anywhere in the file. The report's own limitations section says this. Disclosed; no
  fix required.
- **Affected files:** `evals/runners/mock-agent.mjs`, `evals/scorers/content.mjs`.
- **Fix:** none — keep the disclosure; Stage C may strengthen grounding checks.

### A-35 — Informational — PDF report not in repo; no PDF-generation process (Stage E)

- **Evidence:** the only PDF in the repo is the upstream
  `skills/upstream/anthropic/theme-factory/theme-showcase.pdf`. No pandoc/wkhtmltopdf/
  puppeteer tooling, no `pdf` script in `package.json`, no PDF step in any workflow.
  The user supplied the PDF as an upload at
  `~/workspace/user/files/FINAL-IMPLEMENTATION-REPORT.pdf`; it is content-equivalent
  to the Markdown (see matrix §0.1). Per mission brief §13.5, Markdown remains the
  source of truth; do not introduce a PDF dependency.
- **Affected files:** n/a (recorded limitation).
- **Fix:** none — record in the final remediation report.

---

## Security findings carried forward (Phase 7 audit S-01–S-15, for Stage B re-review)

Stage A re-read `ai/audits/SECURITY-AUDIT.md` in full. The fixed findings (S-01–S-06,
S-15) are recorded here as fixed — Stage B re-verifies them rather than re-discovering
them. The open/accepted findings below carry forward; S-14 was independently
re-confirmed during claim 15 verification.

### S-08 — High — Agentic SEO documents a curl-pipe-to-shell install (UNRESOLVED upstream; Stage B)

- **Stage B status (2026-11-20):** **Mitigated, still OPEN upstream** — safe-install guide (`docs/AGENTIC-SEO-SAFE-INSTALL.md`) + install/doctor warnings; upstream still documents the unsafe install. NOT marked fixed.
- **Evidence:** `skills/upstream/agentic-seo/seo/README.md` and `install.sh` usage text
  document `curl … | bash`. Directly conflicts with this repo's security guidance.
  Cannot edit upstream. Mitigation in place: this repo's own docs never recommend
  curl-pipe installs; finding recorded in the audit and scanner exceptions. Stage B
  must investigate whether a safer local install mechanism is technically possible and
  must not silently classify it as fixed while the upstream source remains unsafe.
- **Affected files:** `skills/upstream/agentic-seo/seo/README.md`,
  `skills/upstream/agentic-seo/seo/install.sh`, `docs/SECURITY-SCANNING.md`.

### S-09 — Medium — Agentic SEO `broken_links.py` disables TLS verification (UNRESOLVED upstream; Stage B)

- **Stage B status (2026-11-20):** **Mitigated, still OPEN upstream** — docs warning + install/doctor warnings; vendored script still disables verification. NOT marked fixed.
- **Evidence:** `skills/upstream/agentic-seo/seo/scripts/broken_links.py` uses
  `verify=False` on both HEAD and GET requests, silently. Sibling `fetch_page.py`
  keeps verification on — the inconsistency suggests an oversight. Cannot edit upstream.
- **Affected files:** `skills/upstream/agentic-seo/seo/scripts/broken_links.py`.
- **Fix:** determine whether a local mitigation is possible (e.g. a wrapper, a
  documented warning at install time, upstream follow-up).

### S-11 — Medium — Prisma upgrade guide recommends `rejectUnauthorized: false` (UNRESOLVED upstream; Stage B)

- **Stage B status (2026-11-20):** **Mitigated** — Prisma exceptions confirmed per-file; exception matcher hardened (exact file match vs directory prefix); 10 scanner integration tests prove genuine findings are still detected. Upstream text unchanged.
- **Evidence:** `skills/upstream/prisma/prisma-upgrade-v7/` recommends the insecure
  workaround first, though the same doc also recommends proper CA configuration
  (`NODE_EXTRA_CA_CERTS`). Scanner exceptions for the upstream files exist
  (`security-scan.mjs` EXCEPTIONS). Stage B must verify the exceptions are narrowly
  scoped, cannot hide unrelated insecure TLS usage, and have regression tests proving
  genuine TLS findings are still detected. Note the same construct is now quoted in
  two repo docs (final report, PROJECT-STATUS.md) — see A-01.
- **Affected files:** `skills/upstream/prisma/prisma-upgrade-v7/SKILL.md`,
  `skills/upstream/prisma/prisma-upgrade-v7/references/driver-adapters.md`,
  `scripts/security-scan.mjs`.

### S-14 — Medium — Agentic-seo import points at a dormant fork (OPEN; Stage B)

- **Stage B status (2026-11-20):** **Confirmed, MONITOR stands** — re-verified via GitHub API (fork of the author's repo, exactly 50 commits behind the pin). Monitoring gap documented: the weekly drift check watches the dormant fork.
- **Evidence (re-confirmed in Stage A via the GitHub API):** the import source
  `pwg-projects/agentic-seo-skill` is a fork of the author's repo, last push
  2026-03-03, head = pinned commit. The author's repo
  (`Bhanunamikaze/Agentic-SEO-Skill`) is active (last push 2026-10-14, 1,075 stars,
  MIT), contains the pinned commit, and is **50 commits ahead** of the pin.
  `install.sh` already points at the author's repo as its default source. Decision
  stands: MONITOR, do not replace without verification; re-point at the next re-import.
- **Affected files:** `sources/imported-skills.md`, `sources/licenses.md`,
  `skills/upstream/agentic-seo/ATTRIBUTION.md`, `scripts/check-upstream.mjs`.

### S-07 — Medium — Agentic SEO documents unpinned `pip install` commands (ACCEPTED upstream; Stage B)

- **Stage B status (2026-11-20):** **Confirmed ACCEPTED** — 32 unpinned occurrences re-verified; directory CMD-04 exception regression-tested.
- **Evidence:** ~30 occurrences across scripts, README, SKILL.md, `install.sh`.
  Unpinned installs can pull a compromised future release. Scanner exception documents
  it. Stage B confirms the accepted status and whether local mitigation is possible.

### S-10 — Medium — Anthropic `with_server.py` runs user commands with `shell=True` (ACCEPTED upstream; Stage B)

- **Stage B status (2026-11-20):** **Confirmed ACCEPTED (wording corrected)** — commands come from the invoking user's `--server` CLI args, not a config file (no config file is read); scanner reason corrected and a dated note added to `ai/audits/SECURITY-AUDIT.md`.
- **Evidence:** `skills/upstream/anthropic/webapp-testing/scripts/with_server.py`.
  Trust boundary is the user's own local config file (commands come from a file the
  user wrote, not untrusted input). Accepted as a deliberate design choice; scanner
  exception documents the boundary. Stage B confirms.

### S-12 — Low — Agentic SEO `install.sh` runs `rm -rf` on variable paths (ACCEPTED upstream; Stage B)

- **Stage B status (2026-11-20):** **Confirmed ACCEPTED** — temp-dir guard and destination guards re-verified in `install.sh`.
- **Evidence:** `TEMP_DIR` (mktemp-created, guarded by non-empty + is-directory check)
  and `dest` (built from validated `--target` + user `--project-dir`, only with
  `--force`). Both guarded. A `--skill-name` containing `../` could traverse — but the
  user runs the installer with their own arguments (self-inflicted, not an attack
  vector). Stage B confirms.

### S-13 — Low — Agentic SEO `fetch_page.py` SSRF guard has a DNS-rebinding TOCTOU (ACCEPTED upstream; Stage B)

- **Stage B status (2026-11-20):** **Confirmed ACCEPTED** — SSRF guard and DNS-rebinding TOCTOU re-verified in `fetch_page.py`.
- **Evidence:** the guard resolves DNS once for the check and `requests` resolves
  again for the fetch, so DNS rebinding could theoretically bypass it. Stops the naive
  SSRF case. Stage B confirms.

### Fixed in Phase 7 (Stage B to re-verify, not re-discover)

S-01 (realistic example password in secrets-management skill — fixed to placeholders),
S-02 (multi-line curl-pipe detection added), S-03 (5 pattern false positives fixed),
S-04 (patterns consolidated into the shared library), S-05 (22 security tests added),
S-06 (supply-chain verification), S-15 (`sources/licenses.md` Anthropic LICENSE.txt
count corrected to 7 of 8). Stage A spot-confirmations: the shared library exists with
34 patterns (claim 14); `test/security.test.mjs` has 22 tests (claim 13 breakdown);
supply-chain verification reproduced (claim 15).

---

## Limitations carried forward (report §18/§19)

### L-51 — Medium — 51 Phase 4 skills are `unverified` (Stage C)

- **Stage C status (2026-11-20):** **Fixed** — all 51 audited individually (see `ai/audits/SKILL-AUDIT-MATRIX.md`): 59 findings (0 Critical, 3 High, 10 Medium, 38 Low, 8 Informational), 53 fixed in place, 6 Informational needing no fix, 0 unresolved. 50 skills → `verified`, 1 (`platform-social-images`) → `verified-with-limitations`; 0 skills remain `unverified` (library split now 254/17/6/0). The 145 corrected skills were also regression-reviewed (5 findings, all fixed). Commits `3afb568`, `c8f6925`, `3504c26`, `7bdc7ca`, `a2309fd`, `8769a02`, `2a6af50`.
- **Evidence:** `sources/verification-status.json`: 51 skills `unverified` — written
  against official docs, no formal technical-accuracy audit yet. The largest remaining
  verification gap (report §18/§19, mission brief §3). Stage C audits all 51
  individually (skill audit matrix) and reviews the 145 corrected skills for regressions.

### L-CI — Medium — No CI workflow has run on GitHub yet (Stage D)

- **Evidence:** report §18. All 6 workflows + dependabot.yml were verified locally
  only (YAML parse, SHA pins, permissions, script references). The first push/PR after
  merge is the real test. Stage D validates locally (no push permitted) and reports the
  remote-execution limitation honestly.

### L-Node — Low — Node 18/22 matrix legs unexercised locally (Stage D)

- **Evidence:** local Node is v24.22.1; `engines` claims `>= 18`; the CI matrix
  (18/20/22) exists to exercise the spread. Stage D to test locally where feasible
  (e.g. via nvm/volta if available) or record as Blocked.

### L-Scan — Low — Semgrep/Gitleaks/TruffleHog/CodeQL never ran locally (Stage D)

- **Evidence:** report §18 / security audit "Tools checked — and honestly not run"
  table: all Blocked (not installed). CodeQL runs only via the GitHub workflow.
  Stage D to run what is installable locally and report the rest as Blocked.

### L-Settings — Low — Secret scanning, Dependabot alerts, branch protection are manual repo settings (Stage E / post-merge)

- **Evidence:** report §18/§19 and `ai/phase10/NOTES.md`. Cannot be enabled from this
  environment. Stage E documents the post-merge checklist; do NOT enable CodeQL
  default setup (conflicts with the workflow setup).

### L-Win — Low — Windows `--link` EPERM path untested (Stage D)

- **Evidence:** report §18; no Windows runner available locally. The permission-error
  test skips on Windows. Stage D: static inspection + simulated tests only unless CI
  provides a Windows leg; never claim real Windows execution without it. See also A-11.

### L-Model — Low — Model-based eval provider untested without credentials (Stage C)

- **Stage C status (2026-11-20):** **Done (layer built; no real-model run executed)** — provider-independent real-model layer built (`evals/runners/providers.mjs`: env config, no hardcoded keys, retries/timeouts, usage/cost tracking, mock/model report separation, baseline protection) + representative 75-case subset + `docs/REAL-MODEL-EVALUATION.md` plan. Unit-tested against a local stub endpoint only; no real-model run has been executed (no credentials) and must not be claimed. Standard suite needs no credentials. Commit `cee083e`.
- **Evidence:** report §8/§18. The provider interface exists
  (`evals/runners/providers.mjs`, OpenAI-compatible via `EVAL_PROVIDER_*` env vars)
  but is untested; all 449/449 results are from the deterministic mock agent, which
  evaluates the library, not a real LLM. Stage C builds the provider-independent
  evaluation layer and a real-model evaluation plan; no paid API access required for
  the standard local suite.

### L-Prisma — Low — Prisma 8 still an RC (Stage C)

- **Stage C status (2026-11-20):** **Resolved** — current stable is Prisma ORM 7.10.1; Prisma 8 is still an RC with no GA date announced (the October GA date was removed from the release-status page on 13 November 2026; latest `prisma` 8.0.0-rc.34). The three upstream skills' RC pins are stale/drifting — documented only, not edited; their verification-status notes (truncated mid-sentence at 160 chars) were completed with the full findings. GA upgrade path documented in `ai/remediation/stage-c/regression-145-review.md` §4. No upgrade to an RC is recommended. Commits `8769a02`, `2a6af50`.
- **Evidence:** report §18. Three skills pin RC versions (prisma-compute,
  prisma-mongodb-upgrade, prisma-postgres-upgrade). Do NOT upgrade production
  dependencies to Prisma 8 RC. Stage C verifies the currently supported stable version
  and documents the upgrade path for GA.

### L-02/L-03 — Informational — Open by decision (no action)

- **Evidence:** L-02: two upstream Prisma skills are 14-line pointer stubs
  (informational; correct verbatim imports). L-03: progressive disclosure
  (`references/`, `examples/`, `scripts/`, `assets/`) specified but unused by original
  skills (deliberately not churned). Recorded for completeness.

---

## High-risk list — confirmation / extension (PLAN.md §"High-risk changes")

Stage A confirms all 7 high-risk items in PLAN.md and extends them with two more:

1. **Installer backup/restore/rollback paths** — confirmed; extended by A-02/A-03
   (traversal), A-04 (concurrency), A-05/A-06 (swap/rollback). All testing in temp
   sandboxes only.
2. **Security scanner exceptions** — confirmed; extended by A-01 (the fix-up that
   added an exception also added a new unexcepted quote) and A-20 (counts unpinned).
   Every exception needs a reason AND a regression test.
3. **Registry/schema changes** — confirmed; no new evidence.
4. **CI workflow changes** — confirmed; extended by L-CI (no remote run possible
   without pushing, which is forbidden).
5. **Skill content fixes** — confirmed; extended by L-51 (51 unverified skills are
   Stage C's main scope) and A-32 (verbatim-policy nuance for ATTRIBUTION.md files).
6. **Windows `--link`** — confirmed; extended by A-11 (no junction fallback).
7. **Eval framework changes** — confirmed; extended by A-10 (`npm test` clobbers the
   eval report) and A-17 (coverage metric construction).
8. **NEW — Report/gate staleness:** the Phase 12 experience (scan ran before the
   report existed; fix-up commit re-broke the gate unnoticed) shows that "full battery
   after the last edit" must mean after the LAST edit, including docs and status
   files. Stage E must re-run the complete battery after the final commit, with no
   further edits afterwards except the battery results themselves.
9. **NEW — Manifest/backup trust boundary:** project-scope manifests and backup dirs
   travel via git and are consumed with `rm -rf`/write privileges (A-02/A-03). Treat
   them as untrusted input in every Stage B fix and test.
