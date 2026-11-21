# CI Validation Report — SkillForge production readiness mission

- **Date:** 2026-11-21
- **Branch:** `feat/skillforge-production-upgrade`
- **Validation HEAD:** `b3a6f34` (`b3a6f348114ef37c85962f1bf0ea8a8a409fe3c0`)
- **Validation PR:** [#4](https://github.com/luxmanbhattarai/SkillForge/pull/4) (draft, CI validation only — **never to merge**)
- **Verdict:** full pipeline green on the validation HEAD. Two real defects were
  exposed by the first round and fixed; the second round passed 9/9 checks.

## Why a draft PR was needed

A push alone triggers no workflows: the push trigger is `main`-only, and
PR #1 is merged. The only mechanism for fresh CI on the branch is an open
pull request. PR #4 was opened as a draft with a DO NOT MERGE title and body
for exactly this purpose.

## The merge-ref problem (and the `-s ours` merge)

PR #4 was initially `CONFLICTING`, so GitHub started no workflows at all
(it cannot build a merge ref for a conflicting PR). The conflict is
structural: the merge-base of `main` and the branch is `508b044` (the PR #1
head, an ancestor of `main` via the merge commit `de6023d`), `main`'s side
is the revert `06100e3` (undo the upgrade), and the branch's side is the
upgrade plus fixes. A normal `git merge origin/main` was attempted and
**aborted**: it would have applied the revert across every file the branch
had not touched since `508b044` (432 files, −74,222 lines) — gutting the
branch.

The correct resolution was `git merge -s ours origin/main` (commit
`d1e925e`): it records `main` as merged — making the PR mergeable with
merge-base `06100e3` — while keeping the tree byte-identical to `df1b1ad`
(verified: `git diff df1b1ad --stat` empty). Nothing on `main` changed.
The merge commit message documents this. The same maneuver was used for
PR #1 (`b5ad9a2`).

## Round 1 — HEAD `d1e925e` (first CI on the post-fix branch)

| Workflow | Run | Result |
| --- | --- | --- |
| Validate skills | 44942929343 | **FAIL** (Validate job; Windows job never started — run cancelled when superseded) |
| Security audit | 44942929351 | **FAIL** (security-audit job; Semgrep job passed) |
| CodeQL | 44942929382 | pass |
| Lint | 44942929409 | pass |

Passing jobs in round 1: Behavioral evals, Registry, lint, Semgrep (SAST)
(first-ever CI run), Analyze (javascript-typescript), CodeQL. Two real
defects were exposed:

### E-01 — `process.exit()` truncates piped stdout (Validate job)

- **Symptom:** one test failed — `A2-02: missing skills array is a clean
  FAIL, not a TypeError crash`. Runner counts: 325 tests, 323 pass,
  1 fail, 1 skipped. The assertion `/FAIL: \d+ error\(s\)/` did not match
  stdout: the validator printed 706 ERROR lines (~70 KiB) but no summary.
- **Root cause:** `scripts/validate-registry.mjs` printed the errors and
  then called `process.exit(1)`, which discards pending piped stdout.
  With a slow-draining parent (the loaded CI runner), output stopped at
  the 64 KiB pipe buffer and the FAIL summary — the last write — was lost.
  Reproduced locally with a slow-draining reader: 64,956 bytes captured,
  FAIL line missing; fast drain showed `FAIL: 706 error(s)`.
- **Fix (`9a976a5`):** set `process.exitCode = 1` and exit naturally
  (Node flushes stdout before a natural exit) in `validate-registry.mjs`,
  and the same one-line fix in the other end-of-main exits that can print
  large output: `validate-skills`, `security-scan`, `score-skills`,
  `check-links`, `check-frontmatter`, `check-duplicates`,
  `check-sources`, `check-agents-workflows`, `run-evals`. Usage-error
  exits (single-line stderr) were left untouched.
- **Regression test:** `E-01` in `test/audit-fixes-c2.test.mjs` runs
  validate-registry on a skills-array-missing repo (agents inflated 30×,
  ~2 MB of output) with stdout paused 5 s. Verified both ways: it fails
  on the old code and passes on the new code. (A first draft with only
  the 706-error list passed on broken code — the parent's single
  pre-pause read drains enough of the 64 KiB buffer for a 70 KiB tail to
  survive — which is why the output is inflated.)

### E-02 — status JSON tripped the security scanner (security-audit job)

- **Symptom:** `MEDIUM ai/PROJECT-STATUS.json:1 [CODE-14] TLS verification
  disabled`, 1 finding, exit 1.
- **Root cause:** the S-09 note in `ai/PROJECT-STATUS.json` quoted the
  literal TLS-disable assignment (Python `verify` set to false), which
  matches the CODE-14 pattern.
- **Fix (`9a976a5`):** reworded to "TLS verification disabled" (no finding,
  no meaning lost). Scan passes on 1,121 text files.

## Round 2 — HEAD `b3a6f34` (validation round, all green)

| Check | Run / job | Result | Verified detail |
| --- | --- | --- | --- |
| Validate (Node 24) | 44944634228 / 136969176436 | pass (36 s) | 326 tests, 325 pass, 0 fail, 1 skipped; E-01 passed on the runner (6.3 s); `--verify-tests` step: 0 failures, 1 warning (HEAD moved past the 9a976a5 battery commit — by design) |
| Windows (Node 24) | 44944634228 / 136969176768 | pass (1 m 5 s) | 330 tests, 325 pass, 0 fail, 5 POSIX-only skipped; **A5-11 junction test executed and passed on real Windows** ("uninstalling a real Windows junction removes only the junction; the library source survives intact", 175 ms) |
| Behavioral evals | 44944634228 / 136969176644 | pass (17 s) | 463/463 passed, 0 failed, 0 critical; 277/277 coverage; 0 regressions |
| Registry | 44944634228 / 136969176755 | pass (12 s) | schema + regeneration zero-diff + report sync gate |
| lint | 44944634188 / 136969124300 | pass (8 s) | includes `check:status` drift guard |
| security-audit | 44944634176 / 136969124448 | pass (16 s) | 1,121 text + 4 binary files, 29 patterns, 4 hashes verified, 0 findings |
| Semgrep (SAST) | 44944634176 / 136969124684 | pass (23 s) | 68 rules on 43 files, 0 findings (p/javascript, pinned 1.186.0) |
| Analyze (javascript-typescript) | 44944634267 / 136969124696 | pass (1 m 19 s) | CodeQL analysis clean |
| CodeQL | 44944634267 | pass (4 s) | workflow summary job |

**9/9 checks pass.** This round closes A4-01 (zero CI on the branch HEAD —
the Semgrep job and the gating Windows leg had never executed) and A5-11
(junction-removal proof now exists from a real Windows runner, not just a
unit test with fault injection).

Counts were verified from the job logs, not just the green ticks. The
Windows total (330) differs from Linux (326): the junction test executes
on Windows and subtests are counted differently; both platforms report
325 passing and 0 failing. The Linux counts match `ai/PROJECT-STATUS.json`
exactly (326/325/0/1).

## Local battery (HEAD `9a976a5`, re-verified before round 2)

| Command | Result |
| --- | --- |
| `npm test` | 326 tests, 325 pass, 0 fail, 1 skipped (Windows-only junction test) |
| `npm run evals` | 463/463 passed, 0 failed, 0 critical; 277/277 coverage; 0 regressions |
| `npm run validate` | PASS (277 skills, 4 upstream-only warnings) |
| `npm run check:registry` | PASS with 1 warning (A3-01 override notice) |
| `npm run check:security` | PASS (1,121 text + 4 binary files, 4 hashes verified, 29 patterns) |
| `npm run check:status` | 0 failures, 0 warnings (at 9a976a5); `--verify-tests` mode: 0 failures |
| `npm run check:links` (offline) | PASS (75 internal, 604 external listed) |
| `node scripts/check-links.mjs --online` | PASS (75 internal; 604 external: 559 checked live, 45 skipped — example domains / documented exceptions) |
| `npm run registry` | zero-diff regeneration |
| Semgrep 1.186.0 (local) | 0 findings, 68 rules, 42 files (43 in CI — `check-status.mjs` postdates the local run) |

## What CI does not prove

- **`scheduled-maintenance.yml` and `release.yml` have still never run on
  GitHub.** They are schedule/dispatch-only and tag-only respectively; the
  workflows exist only on this branch (main has 3 reduced workflows after
  the revert). Their first real execution awaits the schedule (weekly
  drift check) and the first tag. Both were validated locally (workflow
  syntax + the scripts they call), but that is not a run.
- **No real-model eval run has ever executed.** The mock-provider evals
  (463/463) run in CI; the real-model layer (`evals/runners/providers.mjs`)
  needs `EVAL_PROVIDER_URL` / `EVAL_PROVIDER_KEY` / `EVAL_PROVIDER_MODEL`
  credentials from the owner. This is an open item, not a CI failure.
- **Branch protection is not enabled**, so all CI is advisory until the
  owner enables it (owner decision — it would block direct pushes to
  `main`). Nothing in this report changes that.
- **Dependabot PRs #2/#3** (setup-node 7.1.0, checkout 7.0.1) remain open
  and conflicted on pre-revert `main`; they need re-raising after re-merge
  and are unrelated to this validation.

## Later runs (confirmatory re-runs)

Every push to the PR branch triggers fresh `pull_request` runs. The
`85a44ca` push (canonical-status JSON only) triggered runs 44944906376
(Validate), 44944906351 (Lint), 44944906367 (Security audit), 44944906484
(CodeQL) — all 9 checks passed, reproducing the validation counts
exactly (Validate 326/325/0/1; Windows 330/325/0/5 with the A5-11
junction test passing again). Those are confirmatory re-runs of a
documentation-only change; the validation round recorded above
(`b3a6f34`) is the authoritative one. The final HEAD's runs are verified
separately before the release verdict is delivered (see
`ai/audits/RELEASE-ACCEPTANCE.md`).
