# Stage B — High-Risk Fixes: Results

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (Stage A head `71d1d72` →
  Stage B head `65133f6`)
- **Scope:** the 21 Stage B issues from `ai/remediation/ISSUE-REGISTER.md`:
  A-01–A-09, A-14, A-16, A-20, A-30, S-07–S-14.
- **Method:** two specialist agents (scanner/security; installer in two
  sequential parts — the first installer attempt failed with a model
  output-token cap before writing anything and was re-dispatched in
  smaller slices), all work verified by the coordinator with independent
  test runs and diff review before committing. Commits were serialized
  through the coordinator.
- **Rules honored:** local commits only; no push/merge/PR; `main`
  untouched; no file under `skills/upstream/` edited; no security check
  weakened; every fix has a regression test.

## Outcome summary

| Issue | Severity | Status after Stage B |
| --- | --- | --- |
| A-01 — security scan fails at HEAD | High | **Fixed** — scan passes, exit 0 |
| A-02 — manifest path traversal | High | **Fixed** (+ hardening follow-ups) |
| A-03 — restore id / backup.json traversal | Medium | **Fixed** (+ hardening follow-up) |
| A-04 — no concurrency control | Medium | **Fixed** — lockfile |
| A-05 — two-rename swap, unguarded rollback | Medium | **Fixed** — guarded rollback + honest docs |
| A-06 — post-swap verification failure leaves bad content live | Medium | **Fixed** — pre-swap verify + rollback |
| A-07 — update silently repoints a diverged symlink | Medium | **Fixed** — now a conflict |
| A-08 — dry-run mutates state with a corrupt manifest | Medium | **Fixed** — dry-run is read-only |
| A-09 — manifest repair partial, can lose the corrupt original | Medium | **Fixed** — fail-closed + rebuild from disk |
| A-14 — uninstall removes library-removed content with no backup | Low | **Fixed** — backed up first |
| A-16 — restore gaps | Low | **Fixed** — verify, manifest repair, recovery |
| A-20 — pattern count not pinned by tests | Low | **Fixed** — exact counts asserted |
| A-30 — stale-staging cleanup is narrow | Informational | **Fixed** — widened; trash never auto-deleted |
| S-07 — unpinned pip installs (upstream) | Medium | **Confirmed ACCEPTED** |
| S-08 — curl-pipe install (upstream) | High | **Mitigated, still OPEN upstream** |
| S-09 — TLS verification disabled in link checker (upstream) | Medium | **Mitigated, still OPEN upstream** |
| S-10 — shell execution in test-server script (upstream) | Medium | **Confirmed ACCEPTED** (trust-boundary wording corrected) |
| S-11 — insecure TLS workaround in Prisma guide (upstream) | Medium | **Mitigated** — exceptions proven narrow by tests; upstream text unchanged |
| S-12 — guarded recursive delete in install script (upstream) | Low | **Confirmed ACCEPTED** |
| S-13 — SSRF-guard DNS-rebinding window (upstream) | Low | **Confirmed ACCEPTED** |
| S-14 — agentic-seo import points at a dormant fork | Medium | **Confirmed, MONITOR stands** (+ monitoring gap documented) |

Fixed findings S-01–S-06 and S-15 were re-verified still fixed (spot-checks;
see below). Secret scan of the working tree and full git history: clean.

## A-01 — Security scan fails at HEAD (High) — FIXED

- **Root cause:** the 8 findings were all documentation quotes of flagged
  constructs as evidence (the final report, the status log, and the Stage A
  matrix/register quoting the insecure TLS workaround, the curl-pipe
  command, and the Python shell-execution call). Each flagged line was read
  in context; none was a live vulnerability. The gate was red because the
  `2f1460b` fix-up added an exception for the report while adding a new
  unexcepted quote in the status log — and the battery was not re-run after
  that edit.
- **Fix:** 8 narrowly scoped `EXCEPTIONS` entries in
  `scripts/security-scan.mjs` (per-file + per-pattern, each with a reason
  naming the finding it documents), following the `SECURITY-AUDIT.md`
  precedent. No directory exclusion, no pattern weakened.
- **Tests:** the 10 new `test/scanner.test.mjs` integration tests prove the
  exceptions are per-file and pattern-scoped (see S-11).
- **Verification (coordinator):** `npm run check:security` — PASS, exit 0.

## A-02 — Manifest path traversal (High) — FIXED

- **Root cause:** `entry.root`/`entry.destName` were used unsanitized;
  `entryRoot` accepted absolute roots; `readManifest` never validated
  entries; `uninstall` ran a recursive delete on the result. A
  project-scope manifest travels via git, so a crafted manifest in a
  cloned repo could make another user's update/uninstall/restore delete
  or overwrite arbitrary paths.
- **Fix (`scripts/install/manifest.mjs`):** entry validation on read —
  kind must be skill/agent/workflow; name/destName must be single path
  segments; the manifest key must match `kind:name`; destName must name
  the entry (skill → its name; agent/workflow → `name.md`/`.toml`). Root
  validation is two-tier: Tier 1 (exact) when the manifest's target/scope
  are known and the skills dir matches that target's documented skills
  path — the resolved root must equal exactly the skills dir or that
  target's agents/workflows dir; Tier 2 (shape) otherwise — root must be
  `.` or climb with `..` segments and descend to a directory named
  `agents`, `workflows`, or `global_workflows`. A manifest with an
  invalid entry counts as corrupt (update/uninstall refuse, install
  quarantines). `entryRoot`/`entryDest` re-check defensively and throw.
  Note: the naive "containment within the skills dir's parent tree"
  shorthand in the brief would have been wrong — Codex legitimately
  produces `../../.codex/agents` (skills in `.agents/skills`, agents in
  `.codex/agents`); the two-tier design was verified against
  `scripts/install/targets.mjs`.
- **Hardening follow-ups (coordinator review):** skill entries must have
  root `.` (skills always install into the skills dir); in Tier 2 the
  terminal directory must match the entry kind (agent → `agents`,
  workflow → `workflows`/`global_workflows`).
- **Tests:** 3 CLI tests in part 1 (absolute root; 7-case traversal loop;
  positive controls for Codex/Claude/`--dest` agent roots) + 1 CLI test
  in part 2 (kind/root mismatch). All use sentinel files outside the
  install root and verify them byte-intact.
- **Remaining risk:** Tier 2 still allows an agent/workflow entry to point
  at an *arbitrary* directory named `agents`/`workflows`/
  `global_workflows` (e.g. via a deep `..` climb) — the blast radius is
  bounded to single files/dirs in such directories with names matching
  library items, and the installer legitimately writes to
  agents/workflows directories by design. Skill entries can no longer
  escape at all (root must be `.`). Recorded as a known limitation, not
  silently closed.

## A-03 — Restore id / backup.json traversal (Medium) — FIXED

- **Root cause:** `readBackup` joined the user-supplied id unsanitized;
  `backupItemPaths` joined unsanitized `storedAs`; restore wrote to
  unsanitized entry root/destName. A crafted backup inside a cloned
  repo's backup dir could steer restore's writes.
- **Fix (`scripts/install/backups.mjs`, `commands.mjs`):** the restore id
  must be a single segment matching an existing backup *directory*
  (checked with `lstat`, so a planted symlink is rejected);
  `validateBackupRecord` validates the whole record before use
  (`storedAs`/`fileName` single segments; each item's effective entry
  via the A-02 validation); `backupItemPaths` re-validates defensively.
  Invalid input raises `InvalidBackupError`, converted to a usage error
  (exit 2) with the validation message.
- **Hardening follow-up:** the effective entry's destName must match the
  backup item's name, and an embedded entry's kind/name must match the
  item's — otherwise a crafted backup could steer a restore to overwrite
  a *different* item's location.
- **Tests:** 2 CLI tests in part 1 (traversal ids; 5 crafted-backup cases)
  + 1 CLI test in part 2 (5 mismatch cases). Sentinels verified intact.

## A-04 — No concurrency control (Medium) — FIXED

- **Root cause:** no lockfile anywhere; two concurrent runs raced the
  manifest read-modify-write (last-writer-wins, entries silently lost)
  and `cleanStaleStaging` deleted all staging dirs including another
  live run's.
- **Fix (new `scripts/install/lock.mjs`):** `.skillforge-lock` in the
  skills dir, created atomically (`open` with `wx`), holding pid, start
  time, command, and a random token. A second run fails fast with a clear
  message naming the holder pid/age and the removal path. Stale takeover
  only when the recorded pid is dead *and* the lock is older than 10
  minutes (guards against pid reuse; the caveat is documented in the
  code). Release happens in a `finally` and only removes the lock if the
  token still matches. A lock path that is a directory is never deleted.
  All four mutating commands (install, update, uninstall, restore) run
  under the lock; dry runs and `restore --list` take none. If the lock
  file cannot be created at all (read-only/blocked dir), the run
  proceeds unheld with a warning and skips stale-staging cleanup — such
  a run cannot write the manifest anyway.
- **Tests:** 2 CLI tests (two concurrent full installs → exactly one exit
  0, manifest complete with all 277 entries, lock released; lock-state
  matrix: live pid blocks, dead pid + fresh lock refused, dead pid +
  hour-old lock taken over).
- **Behavior changes:** a run killed mid-flight leaves a lock that blocks
  the next run for up to 10 minutes (the error message gives the removal
  path); `doctor` now reports a lingering lock file. `update`/`uninstall`
  on a nonexistent skills dir now create the (empty) dir as a side
  effect of lock acquisition.

## A-05 — Two-rename swap, unguarded rollback (Medium) — FIXED

- **Root cause:** `swapIn` was two renames with an unguarded rollback
  rename and fire-and-forget trash deletion; no test exercised it; docs
  and the report called it "atomic".
- **Fix (`scripts/install/installer.mjs`):** the rollback rename is now
  guarded — if it fails too, the error reports *both* errors with the
  trash and staged paths, and neither copy is deleted. `swapIn` takes
  injectable filesystem operations (defaulting to the real ones) so
  tests can fault-inject rename failures. The header comment, the
  `swapIn` doc comment, and `docs/INSTALLATION.md` now describe the
  two-rename window honestly (a kill between the renames leaves the
  destination missing; the old content survives in the trash directory
  and in the backup).
- **Tests:** 3 unit tests (happy path; fault-injected second-rename
  failure → old content restored; fault-injected swap + rollback
  failure → both errors and both paths in the message, both copies
  survive).
- **Not in this fix:** `scripts/install-skills.mjs` header still says
  "swapped in atomically" — that file is Stage C's A-31.

## A-06 — Post-swap verification failure leaves bad content live (Medium) — FIXED

- **Root cause:** `executeInstallRun` swapped in, then hash-verified; on
  mismatch the item reported `failed` but the new content stayed
  installed while the manifest kept the old hashes.
- **Fix:** new exported `verifyStaged(planned, absPath)` in
  `installer.mjs` (link-target check; skill tree-hash vs planned
  files; agent/workflow file hash), called *before* the swap — a copy
  that differs from the library never reaches the destination. The
  post-swap check stays as a second layer; on mismatch,
  `rollbackFromBackup` restores the previous content from the
  pre-replacement backup, or removes a fresh install, and the item
  reports failed with the manifest untouched.
- **Tests:** `verifyStaged` unit test (match/tamper/missing/extra file,
  agent file, link good/diverged/non-link); `rollbackFromBackup` unit
  test (with and without a backup). Honest limit: the post-swap
  mismatch branch has no CLI end-to-end test — no CLI input can make
  content differ from its own hash after a passing pre-swap check, so
  the branch is covered at the helper level only.

## A-07 — Update silently repoints a diverged symlink (Medium) — FIXED

- **Root cause:** `classifyUpdate` returned `install` for a link-method
  item whose symlink pointed elsewhere, and `install` actions are
  excluded from backups — a user's deliberate repoint (e.g. at their own
  fork) was destroyed without backup or prompt. `classifyInstall`
  treated the same situation as a conflict.
- **Fix:** `classifyUpdate` now returns `conflict` ("a symlink already
  exists here pointing somewhere else"), matching `classifyInstall`, so
  the case goes through `resolveConflicts` (refuse/prompt/force with
  backup). `docs/INSTALLATION.md` "Updating" section corrected (the old
  "repairs broken links" claim omitted the silent repoint).
- **Tests:** CLI test — link install, repoint to a fork, `update`
  refuses (exit 1, link untouched), `update --force` backs the old link
  up (verified as a symlink in the backup) and repoints.

## A-08 — Dry-run mutates state with a corrupt manifest (Medium) — FIXED

- **Root cause:** `loadManifestForWrite` ran before the dry-run check and
  quarantined (renamed) a corrupt manifest, contradicting the
  documented "change nothing" behavior.
- **Fix:** the install path uses a read-only `readManifest` for
  classification when `dryRun` is set (a corrupt manifest is noted, not
  quarantined); `loadManifestForWrite` runs only for real runs. The
  update/uninstall/restore dry-run paths were verified read-only (not
  assumed).
- **Tests:** CLI test — install/update/uninstall dry runs with a corrupt
  manifest leave the manifest byte-identical and create no quarantine
  file.

## A-09 — Manifest repair partial, can lose the corrupt original (Medium) — FIXED

- **Root cause:** `loadManifestForWrite` quarantined a corrupt manifest
  and started fresh — only items in that run regained entries, others
  became orphans; and if the quarantine rename failed, the fresh
  manifest later overwrote the corrupt one in place.
- **Fix (`scripts/install/commands.mjs`):** (a) quarantine failure now
  throws `InstallerError` — the run fails closed and never overwrites
  the corrupt original; (b) new `rebuildEntriesFromDisk` scans the disk
  and adopts library-identical items (skills including links, agents,
  workflows) into the fresh manifest — items that differ, are not in
  the library, or cannot be verified are skipped, never guessed;
  (c) repair semantics documented in `docs/INSTALLATION.md` (rebuilt
  entries lose their original install dates; modified items are
  reported as orphans by doctor). Incremental manifest writes were
  implemented (judged low-risk): the manifest is written after each
  successful install/adopt (best-effort, with a warning on failure)
  plus an authoritative final write, so a kill mid-run leaves the
  items installed so far recorded. This also fixed an exposed bug: a
  repaired manifest was never written when the run was a no-op —
  `executeInstallRun` now takes an initial dirty flag from
  `wasCorrupt`.
- **Tests:** quarantine-failure test (deterministic quarantine name via
  a Date pin, blocked by a non-empty directory — chmod-based failure
  is not testable running as root); rebuild test (both entries
  restored, doctor clean); modified-item test (not rebuilt, reported
  orphan).

## A-14 — Uninstall removes library-removed content with no backup (Low) — FIXED

- **Root cause:** `needBackup` covered only modified/foreign items. If a
  skill was since removed from the library, uninstall deleted the only
  copy.
- **Fix:** classification records `notInLibrary`; such items are backed
  up before removal (the reason text says so). Documented in
  `docs/INSTALLATION.md` (content matching the manifest is otherwise
  removed without a backup — it is identical to the library, so
  reinstalling restores it).
- **Tests:** CLI test — fixture skill removed from the library, uninstall
  creates a backup holding the content.

## A-16 — Restore gaps (Low) — FIXED

- **Root cause:** restore had no post-swap verification; manifest repair
  only happened when a manifest existed *and* the backup item had an
  entry; a backup with corrupt/unreadable `backup.json` was
  unrecoverable even with intact `items/` content; partial backup dirs
  lingered as "corrupt" entries.
- **Fix:** (a) post-swap verification against the backup's stored hash,
  with rollback via the shared `rollbackFromBackup` from the hoisted
  pre-restore backup; (b) restore now uses `loadManifestForWrite`
  (creates/repairs the manifest; fail-soft to content-only restore if
  quarantine fails; builds library-based entries for items with no
  embedded entry); (c) new `CorruptBackupError` (missing/unparseable
  `backup.json` — distinct from `InvalidBackupError`, so crafted
  records are still rejected, never recovered) plus
  `recoverBackupRecord`, which reconstructs from `items/<n>-<kind>-<name>`
  directories (agents/workflows need `--target` to be placed, otherwise
  skipped with a warning); (d) `createBackup` cleans up its partial
  directory on failure. Restore staging now uses the shared
  `stageBackupItem` helper.
- **Tests:** missing-manifest and corrupt-manifest restore (entry
  present, quarantine created); corrupt-JSON, missing-JSON, and
  unrecoverable-empty recovery cases; `createBackup` failure unit test
  (a socket file forces a deterministic mid-copy failure). The (a)
  mismatch branch is covered by the shared `rollbackFromBackup` unit
  test (same CLI-unreachability reason as A-06).

## A-20 — Pattern count not pinned by tests (Low) — FIXED

- **Root cause:** `test/security.test.mjs` asserted only
  `PATTERNS.length >= 25`; count drift would not fail tests.
- **Fix:** exact counts asserted — 34 patterns total, 29 in the `scan`
  scope, 11 in `score`, 9 in `input` (verified with node before
  pinning).

## A-30 — Stale-staging cleanup is narrow (Informational) — FIXED

- **Root cause:** cleanup ran only in `executeInstallRun` for roots of
  items being written; an all-`already` run left leftovers, and
  restore/uninstall never cleaned them. It also deleted trash dirs
  without checking a backup existed.
- **Fix:** new `cleanAllStaleStaging` (skills + agents + workflows
  roots) called by install/update, uninstall, and restore, even when
  there is nothing to write, lock-held only. `cleanStaleStaging` never
  deletes `.skillforge-tmp-old-*` trash dirs — a leftover trash dir
  may hold the only copy of old content after a kill between renames;
  it survives until the user removes it. `doctor` now distinguishes
  trash ("may hold the only copy… the installer never deletes it")
  from staging ("safe to delete"). `docs/INSTALLATION.md` updated.
- **Tests:** CLI test — staged leftovers cleaned on an all-`already`
  install and on uninstall; trash preserved with content and reported
  by doctor.

## S-07 — Unpinned pip installs (Medium, upstream) — CONFIRMED ACCEPTED

- Re-read the upstream code: 32 unpinned `pip install` occurrences
  across agentic-seo (the audit said ~30), mostly in error-message
  strings; none is pinned. The directory-wide CMD-04 exception for
  `skills/upstream/agentic-seo/` is deliberate and per-pattern, and is
  now regression-tested in `test/scanner.test.mjs`. No local code
  change is possible under the verbatim policy; the safe-install guide
  tells users to install dependencies themselves, pinned, in a virtual
  environment. Accepted status stands.

## S-08 — Curl-pipe install (High, upstream) — MITIGATED, STILL OPEN

- **Investigation (read-only):** the upstream README and `install.sh`
  usage text document a curl-piped-to-shell install fetched from the
  moving `main` branch — remote code executes without verification,
  the script is not pinned to any version, and there are no checksums
  or signatures anywhere. The installer itself, in remote mode, does
  an unpinned `git clone --depth 1` of the repo URL (again `main`, no
  commit pin, no verification). Confirmed as reported, High severity.
- **Safer mechanism implemented (docs + warnings):** new
  `docs/AGENTIC-SEO-SAFE-INSTALL.md` documents (1) the verified path —
  SkillForge's own installer installs the `seo` skill from the vendored
  copy, pinned to commit `67775741…`, with no network fetch and no
  remote code execution; (2) the safe standalone path — download from
  the pinned commit, verify the SHA-256, inspect, run locally. The
  coordinator independently verified the byte-identical claim: the
  pinned `install.sh` and `README.md` downloaded from the author's
  repository at the pinned commit hash-identical to the vendored
  copies.
- **Doctor/install warnings implemented** in `scripts/install/commands.mjs`:
  emitted once per install/update run when the first item from the
  agentic-seo vendor is installed/updated, and as level-`warn` doctor
  problems per installed matching entry. Detection is by the
  `skills/upstream/agentic-seo/` source prefix, not by the skill name
  alone. The S-08 warning text quotes the upstream command as the thing
  to avoid, so its line carries the scanner's sanctioned line-level
  ignore for that one pattern (the same treatment as the exception for
  the safe-install guide, which quotes the same command).
- **NOT fixed:** the upstream source still documents the unsafe install.
  Anyone who finds the upstream repository directly may follow it. This
  is recorded as residual risk, not closed.

## S-09 — TLS verification disabled in link checker (Medium, upstream) — MITIGATED, STILL OPEN

- **Investigation (read-only):** `broken_links.py` disables TLS
  verification on both per-link requests (the HEAD request and the GET
  fallback), silently. The oversight reading is now sharper: the same
  script's initial page fetch keeps verification on, and the sibling
  `fetch_page.py` keeps verification on with explicit error handling —
  only the per-link checks disable it.
- **Mitigation:** docs warning in `docs/AGENTIC-SEO-SAFE-INSTALL.md`
  (impact, why it looks like an oversight, user workarounds) plus the
  doctor/install warning (same trigger as S-08). A patched copy would
  diverge from upstream, which the verbatim-import policy forbids.
- **NOT fixed:** the vendored script still disables verification. Every
  install of the `seo` skill carries the flawed script until upstream
  fixes it or the skill is re-imported from a fixed upstream commit.

## S-10 — Shell execution in test-server script (Medium, upstream) — CONFIRMED ACCEPTED (wording corrected)

- Re-read `with_server.py`: it runs the invoking user's `--server`
  commands with shell execution enabled. **Correction:** the commands
  come from the invoking user's own command-line arguments (argparse,
  `--server` is required) — there is no config file read anywhere in
  the script. The audit's "user's own local config file" boundary was
  wrong in detail; the substance holds (an attacker would need to
  control the invoking user's command line, i.e. already have code
  execution). The scanner exception reason was corrected, and a dated
  correction note was added to `ai/audits/SECURITY-AUDIT.md`.
  ACCEPTED decision stands.

## S-11 — Insecure TLS workaround in Prisma guide (Medium, upstream) — MITIGATED

- **Exception scope verified:** the Prisma CODE-14 exceptions are
  per-file (the two triaged files only), not directory-wide.
- **Matcher hardened (`scripts/security-scan.mjs`):** the old bare
  prefix match would have excepted a file merely sharing a prefix with
  an excepted file (e.g. `SECURITY-AUDIT.md.bak` alongside the excepted
  `SECURITY-AUDIT.md`). New `matchesPrefix`: a prefix ending in `/`
  matches a directory; any other prefix must match the file path
  exactly. Applied to both the exceptions map and the skip prefixes.
- **Testability:** the scanner gained a root override (environment
  variable or `--root` flag; default stays the repo root), documented
  in the script header, so the real scanner can be tested against temp
  trees.
- **Tests:** new `test/scanner.test.mjs` (10 integration tests spawning
  the real scanner) proves genuine TLS-disable, curl-pipe, and Python
  shell-execution constructs in ordinary files are still reported
  (exit 1); the same constructs in excepted paths are suppressed;
  prefix-sharing files, same-directory siblings of excepted files, and
  non-excepted patterns in excepted files are all still reported.
- The upstream Prisma guidance itself is unchanged (verbatim policy);
  the finding stays open upstream.

## S-12 — Guarded recursive delete in install script (Low, upstream) — CONFIRMED ACCEPTED

- Re-read `install.sh`: the temp directory is mktemp-created and the
  cleanup guard checks non-empty *and* is-directory before deleting;
  the destination delete runs only with `--force` and the destination
  is built from allowlist-validated `--target` plus user-supplied
  `--project-dir` and `--skill-name`. `--skill-name` is not validated,
  so a `../` value could traverse — but only with the user's own
  arguments (self-inflicted, not an attack vector). Accepted status
  stands.

## S-13 — SSRF-guard DNS-rebinding window (Low, upstream) — CONFIRMED ACCEPTED

- Re-read `fetch_page.py`: the guard resolves the hostname and blocks
  private/loopback/reserved IPs, but the fetch resolves DNS again, so
  a rebinding attack could theoretically bypass it. Stops the naive
  SSRF case. Accepted status stands.

## S-14 — Agentic-seo import points at a dormant fork (Medium) — CONFIRMED, MONITOR STANDS

- **Re-verified via the public GitHub API (2026-11-20):**
  `pwg-projects/agentic-seo-skill` is a fork (`fork: true`) of
  `Bhanunamikaze/Agentic-SEO-Skill`, last push 2026-03-03, 0 stars,
  head exactly at the pinned commit. The author's repo is active (last
  push 2026-10-14, 1,075 stars, MIT) and exactly 50 commits ahead of
  the pin (compare: ahead by 50, behind by 0 — the pin is an ancestor
  of the author's head).
- **Monitoring gap found and documented:** `scripts/check-upstream.mjs`
  monitors the recorded pin source — the dormant fork — so the weekly
  drift check reports agentic-seo UP-TO-DATE while the live upstream is
  50 commits ahead. Documented in `docs/SECURITY-SCANNING.md`
  (supply-chain monitoring) and `docs/THREAT-MODEL.md`. This needs a
  re-point decision at the next re-import, not a code change now.
- **MONITOR decision stands.** Do not replace the import without
  verification; re-verify the source at the next re-import.

## S-01–S-06, S-15 — re-verified still FIXED

- S-01: placeholder values in both DATABASE_URL examples in the
  secrets-management skill. S-02: multi-line curl-pipe detection
  present and now regression-tested end-to-end. S-03: all guard
  regression tests pass. S-04: all three consumers import the shared
  pattern library (scanner, scorer, mock agent). S-05: security tests
  now 23 unit + 10 integration = 33. S-06: supply-chain verification
  re-verified by Stage A (claim 15); the agentic-seo leg was
  independently re-verified again in Stage B. S-15: `sources/licenses.md`
  says "7 of 8" with the doc-coauthoring exception noted.

## Secret scan

- Full `npm run check:security`: PASS, 0 findings.
- History sweep over all commits (`git log --all -p` greps): private-key
  headers — only the pattern definition and the test fixture (no key
  material); token prefixes (`ghp_`/`gho_`/`github_pat_`/`sk-`) — 0
  hits; `AKIA` — 1 hit, AWS's documented example key ID in the security
  tests (introduced in Phase 7), not a live credential. **No live
  credential found.** No credential values were printed or recorded
  anywhere.

## Incidental fix (not one of the 21)

- The offline link check failed at the Stage B code head with 1 error:
  `ai/remediation/VERIFICATION-MATRIX.md` contained a literal
  link-shaped example (`[text]` + `(url)`) in prose describing the
  checker's validation rules, which the checker (which does not strip
  inline code spans) treated as a broken internal link. The line was
  reworded to describe the shape without using link syntax. The
  checker's inline-code handling is a known limitation for Stage D's
  link-checker hardening (A-23); this fix only corrects the document.

## Verification battery (run by the coordinator, after the last code edit)

All commands run from the repository root at the Stage B code head
(`19a57e8`, plus the one-line matrix fix in `65133f6`):

| Command | Result |
| --- | --- |
| `npm test` | **169/169 pass, 0 fail** (was 129/129; +40 tests: 1 security unit, 10 scanner integration, 29 installer). Note per A-18: one counted entry is `test/helpers.mjs` itself (0 tests), so 168 real tests. |
| `npm run validate` / `validate:strict` | PASS, 4 warnings (all upstream, informational) |
| `npm run check:frontmatter` | PASS (277 skills) |
| `npm run check:duplicates` | PASS (277 skills) |
| `npm run check:sources` | PASS, 0 warnings |
| `npm run check:agents` | PASS (24 agents, 16 workflows) |
| `npm run check:registry` | PASS (277 skills, 24 agents, 16 workflows) |
| `npm run check:security` | PASS, no findings |
| `npm run check:links` (offline) | PASS (73 internal links, 0 broken) |
| `npm run score` | Mean 87/100, 0 CRITICAL |
| `npm run evals` | 449/449 passed, 277/277 skills covered, 0 regressions vs baseline |
| `node --test test/installer.test.mjs` | 72/72 pass |
| `node --test test/security.test.mjs test/scanner.test.mjs` | 33/33 pass |

The battery was re-run in full after the final documentation commit;
see the Stage B completion report for the final-HEAD confirmation.

## Commits (Stage B)

| Commit | Content |
| --- | --- |
| `c5d2be6` | Scanner fixes (A-01, A-20, S-11) + agentic-seo safe-install guidance (S-08/S-09, S-14) + S-10 audit correction |
| `19e4f53` | Installer path-traversal validation (A-02, A-03), lockfile (A-04), guarded swap rollback (A-05) |
| `19a57e8` | Installer recovery fixes (A-06–A-09, A-14, A-16, A-30) + agentic-seo doctor warnings (S-08/S-09) |
| `65133f6` | Incidental: link-shaped example in the verification matrix |

## Remaining risks and handoff notes for Stage C

1. **S-08 and S-09 stay open upstream.** Docs + install/doctor warnings
   are the local maximum under the verbatim policy. Upstream follow-up
   (raising both with the agentic-seo author) is still owed.
2. **Tier-2 root validation residual** (A-02): agent/workflow entries can
   still point at an arbitrary directory named `agents`/`workflows`/
   `global_workflows`. Bounded (single files/dirs, library-item names
   only); skill entries cannot escape at all.
3. **S-14 monitoring gap:** the weekly drift check watches the dormant
   fork. Re-point decision needed at the next re-import.
4. **Stale-lock window:** a killed run's lock blocks the next run for up
   to 10 minutes (message gives the removal path); `doctor` reports
   lingering locks.
5. **Post-swap mismatch branches** (A-06, A-16a) are covered at the
   unit/helper level, not end-to-end via CLI (unreachable through CLI
   input after a passing pre-swap check).
6. **`scripts/install-skills.mjs` header still says "swapped in
   atomically"** (A-31, Stage C scope).
7. **Test-count headline:** the suite is now 169 printed / 168 real
   tests (A-18's helpers-file nuance still applies; Stage E owns it).
8. **`update`/`uninstall` on a nonexistent skills dir** now create the
   empty dir as a lock-acquisition side effect (harmless, noted).
9. **No Windows execution** was performed in Stage B; the lockfile and
   path validation were tested on Linux only. Windows behavior of the
   lock (file locking semantics) and the `..` climb rules on Windows
   paths is Stage D's scope.
