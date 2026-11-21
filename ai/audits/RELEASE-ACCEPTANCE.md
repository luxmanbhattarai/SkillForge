# Release Acceptance — SkillForge production readiness mission

- **Date:** 2026-11-21
- **Branch:** `feat/skillforge-production-upgrade`
- **Evidence heads:** battery `9a976a5`, CI validation `b3a6f34`,
  confirmatory `85a44ca` (see `ai/audits/CI-VALIDATION-REPORT.md`)
- **Validation PR:** [#4](https://github.com/luxmanbhattarai/SkillForge/pull/4)
  (draft, CI validation only — never merged)

## Final status: READY FOR STAGING

This is the honest verdict under the mission's §15 acceptance criteria.
The branch is in strong shape — full CI green on two consecutive heads,
zero failing tests, zero security findings, zero unverified skills —
but it is not production ready yet, for three named reasons (below).
Declaring PRODUCTION READY now would repeat the overstatement pattern
this mission was commissioned to end: the release workflow itself has
never executed, a High finding (S-08) still awaits an owner disposition,
and branch protection is off, so all CI is advisory.

## §15 acceptance criteria — judged one by one

| Criterion | Result | Evidence |
| --- | --- | --- |
| No Critical findings unresolved | PASS | 0 Critical in Phase A (60 findings: 0 Critical, 4 High, 14 Medium, 42 Low); none found since |
| No High findings unresolved | **NOT MET** | S-08 (High) is mitigated, not closed — its final disposition (accept the mitigation vs drop the skill) is an owner decision that has not been made; A4-02 (High) is partially addressed — the false comment is fixed, but branch protection is still off (owner decision) |
| Full test suite green | PASS | `npm test`: 326 tests, 325 pass, 0 fail, 1 skipped (Linux); Windows CI: 330 tests, 325 pass, 0 fail, 5 skipped |
| Behavioral evals green | PASS | 463/463, 0 failed, 0 critical, 277/277 coverage, 0 regressions (mock provider, local + CI) |
| Security scan clean | PASS | `npm run check:security`: 0 findings (1,124 text + 4 binary files at last run); Semgrep 0 findings (68 rules, 43 files, CI + local); CodeQL 0 open alerts |
| CI green on the current HEAD | PASS | PR #4: 9/9 checks pass on `b3a6f34` and again on `85a44ca`, including the first-ever Semgrep (SAST) runs and the first gating Windows runs |
| Skills verified, none unverified | PASS | Split 255 verified / 16 with limitations / 6 needs-correction / 0 unverified (`ai/audits/SKILL-VERIFICATION-REPORT.md`) |
| Docs synced to verified evidence | PASS | `ai/PROJECT-STATUS.json` canonical; `check:status` drift guard green in CI (0 failures); README/CHANGELOG/SECURITY.md synced |
| Release workflow proven | **NOT MET** | `release.yml` is tag-only and has never executed on GitHub; the first real release run is still ahead |
| Real-model eval run | **NOT MET** | No real-model run has ever executed — needs owner credentials (`EVAL_PROVIDER_URL` / `KEY` / `MODEL`); provider layer is code-complete |

## Findings tally (final)

**Phase A audit — 60 new findings** (`ai/audits/PRODUCTION-READINESS-AUDIT.md`):

| Outcome | Count | IDs |
| --- | --- | --- |
| Fixed | 50 | 48 in Phase C + A4-01 (closed by PR #4 CI) + A5-11 (junction proof on real Windows) |
| Partially addressed | 2 | A3-03 (Accessibility standard narrowed to applicable skills; library-wide pass recorded as follow-up), A4-02 (false comment fixed; protection is an owner decision) |
| Documented residual | 1 | A4-06 (Semgrep supply chain: PyPI version pin, no `--require-hashes` lockfile, runtime-fetched ruleset; first CI runs have landed, so the lockfile follow-up is now unblocked) |
| Open | 7 | A4-04, A4-05, A4-07, A4-09, A4-10, A4-12 (all resolve on re-merge or by owner action), A3-04 (calendar re-check after 2026-12-01) |

**Phase E (CI-exposed) — 2 findings, both fixed:** E-01 (`process.exit`
stdout truncation — fixed in 11 scripts, regression test added, verified
failing on old code and passing on new) and E-02 (status JSON tripped
CODE-14 — reworded).

**Prior security items** (`ai/audits/SECURITY-AUDIT-UPDATED.md`):
S-08 High **mitigated** (unsafe install text still present upstream-verbatim;
local mitigation verified working; remaining risk HIGH upstream),
S-09 Medium **mitigated**, S-11 Medium **mitigated**, S-14 Medium
**mitigated** — re-labelled from "fixed" by the Phase G security audit:
the live-upstream compare is implemented and reporting (fork UP-TO-DATE,
live upstream BEHIND by 50 commits), but the import itself still trails
and the re-point decision is pending. S-01–S-07, S-10, S-12, S-13, S-15
carried from Stage E (7 fixed, 4 accepted upstream, 3 mitigated-still-open
upstream, 1 open MONITOR — see the security audit §4).

## Why not PRODUCTION READY — the three named reasons

1. **S-08 has no owner disposition.** The mitigation is verified and is
   the maximum available under the verbatim-import policy, but the
   unsafe curl-pipe install text still ships in the repo and the
   remaining risk is HIGH (upstream). Accepting that residual for
   production — or dropping the agentic-seo skill instead — is the
   owner's call. The coordinator does not make it unilaterally.
2. **The release workflow has never run.** `release.yml` executes only
   on tags; no tag has been pushed from this branch and v1.0.0 predates
   the file. A production release would be the first execution of the
   release pipeline. (Same for `scheduled-maintenance.yml`, which is
   schedule/dispatch-only.)
3. **Branch protection is off, so CI is advisory.** The user previously
   decided against it (it would block direct pushes to `main`). That
   decision stands, but until it is either reversed or recorded as a
   formal acceptance, the release gate is convention, not enforcement.
   (A4-09/A4-10 owner settings are Low-severity companions.)

Secondary items that do not block staging but belong on the promotion
list: no real-model eval run (credentials), S-14 re-point decision,
Dependabot PRs #2/#3 conflicted on pre-revert main, action pins two
majors behind v5 (staleness only — SHAs verified safe).

## Promotion checklist — what turns this into PRODUCTION READY

1. Owner disposition on S-08: accept the verified mitigation as
   production-sufficient (recorded), or drop the agentic-seo skill
   (closes S-08, S-09, S-14 outright). Upstream follow-up with the
   author remains owed either way.
2. First real `release.yml` execution: tag a release candidate
   (e.g. `v1.1.0-rc.1`) and verify the workflow runs clean. Do this
   from staging, not from a production tag.
3. Branch protection: owner either enables it on `main` or records
   the standing decline as a formal acceptance with the risk stated.
4. Real-model eval run (owner provides `EVAL_PROVIDER_*` credentials),
   or an explicit recorded decision to defer it.
5. First `scheduled-maintenance.yml` run (fires on schedule after
   re-merge, or dispatch it manually once).
6. S-14 re-point decision at the next re-import (re-point the pin to
   the live repo or accept the fork pin with the drift visible).

## Main-branch reconciliation recommendation

Do not merge PR #4 (it is CI validation only). To bring the upgrade to
`main` later:

1. **Revert the revert first, on `main`.** PR #1 was merged (`de6023d`)
   and reverted (`06100e3`); GitHub treats PR #1 as merged, so a fresh
   PR from the branch would otherwise show only the post-merge-base
   diff. Reverting `06100e3` on `main` restores the upgrade base.
   This step needs the owner's explicit go-ahead (it changes `main`).
2. **Then open a fresh PR** from `feat/skillforge-production-upgrade`.
   The branch already contains `main` as an ancestor via the `-s ours`
   merge (`d1e925e`, tree-identical to the branch head), so after step
   1 the merge-base is the revert commit and the PR diff is exactly
   the post-merge fixes — no conflicts expected.
3. **Close Dependabot PRs #2/#3** (conflicted, based on pre-revert
   `main`) and let Dependabot re-raise them after the re-merge.
4. After the re-merge, `main` regains the 3 stripped workflows
   (CodeQL, release, scheduled maintenance — A4-04), the stale
   Node-20 step labels go away (A4-12), and the weekly drift check
   starts firing.

Until the owner approves the re-merge, the upgrade lives only on this
branch, which is the current state and is fully validated as such.

## §14 deliverables — all present

- `ai/audits/PRODUCTION-READINESS-AUDIT.md` (Phase A, incl. Phase C
  resolution appendix)
- `ai/audits/SECURITY-AUDIT-UPDATED.md` (Phase G fresh audit)
- `ai/audits/SKILL-VERIFICATION-REPORT.md` (machine-readable summary +
  277-row audit trail)
- `ai/audits/CI-VALIDATION-REPORT.md` (PR #4 rounds 1–2 + confirmatory
  runs)
- `ai/audits/RELEASE-ACCEPTANCE.md` (this file)
- `ai/PROJECT-STATUS.json` (canonical status) + `scripts/check-status.mjs`
  (drift guard, run in CI)

## What staging means here

Deploy the branch as the staging candidate: install from it, run the
installer end-to-end (including `--link` on Windows), tag a release
candidate to exercise `release.yml`, and run the real-model eval subset
once credentials exist. Nothing in this verdict blocks that work — it
blocks only the claim that the work is already production-proven.
