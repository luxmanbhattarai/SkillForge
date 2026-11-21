# Release Acceptance — SkillForge production readiness mission

- **Date:** 2026-11-21
- **Branch:** `feat/skillforge-production-upgrade`
- **Evidence heads:** battery `9fdc0d0`, CI validation `d010069`
  (see `ai/audits/CI-VALIDATION-REPORT.md`)
- **Validation PR:** [#4](https://github.com/luxmanbhattarai/SkillForge/pull/4)
  (draft, CI validation only — never merged)

## Final status: READY FOR STAGING

This verdict was first delivered by the production-readiness
mission (Phases A–G) at `be03f2c` and is **re-affirmed by the
Final Staging Validation mission (Phases 1–11)** after closing
every gap that could be closed without owner action or a
re-merge. The branch is in strong shape — full CI green, zero
failing tests, zero security findings, zero unverified skills,
the release workflow's defects fixed and its steps simulated,
the S-08 mitigation hardened and a disposition recommended —
but it is not production ready yet, for five named reasons
(below), three of which are owner decisions and one of which is
structurally impossible before the re-merge. Declaring
PRODUCTION READY now would repeat the overstatement pattern
this work was commissioned to end.

## §15 acceptance criteria — judged one by one

| Criterion | Result | Evidence |
| --- | --- | --- |
| No Critical findings unresolved | PASS | 0 Critical in Phase A and in this mission's re-audit |
| No High findings unresolved | **NOT MET** | S-08 (High) is mitigated with an explicit recommended disposition (keep + mandatory warnings + safe-install guidance, Phase 3), but the owner has not accepted it; A4-02 (High) is partially addressed — branch protection still off (owner decision) |
| S-08 has an explicit, defensible disposition | **PARTIAL** | Recommendation made and documented (`ai/audits/SECURITY-AUDIT-UPDATED.md` Phase 3 addendum); owner acceptance still pending |
| S-09 / S-11 documented, verified mitigations | PASS | S-09: SkillForge never executes `broken_links.py`; first-party TLS intact; FIXED upstream at live head. S-11: no TLS-disable in first-party code; exceptions per-file + A5-07 ignore gate |
| S-14 monitoring checks the live upstream | PASS | Live compare verified (`npm run check:upstream`: fork UP-TO-DATE, live upstream BEHIND by 50); D1 fixed (UNKNOWN now exits non-zero) |
| Canonical status matches the current commit | PASS | `ai/PROJECT-STATUS.json` synced to the battery head `9fdc0d0`; `check:status` 0 failures (HEAD-moved warning by design for docs-only commits since) |
| PR #4 description accurate | PASS | Rewritten for the final state (final commit, counts, CI results, limitations, unverified workflows) |
| Full test suite green | PASS | `npm test`: 326 tests, 325 pass, 0 fail, 1 skipped (Linux); Windows CI: 330 tests, 325 pass, 0 fail, 5 skipped |
| Behavioral evals green | PASS | 463/463, 0 failed, 0 critical, 277/277 coverage, 0 regressions (mock provider, local + CI) |
| Security scan clean | PASS | `npm run check:security`: 0 findings (1,128 text + 4 binary files); Semgrep 0 findings (68 rules, 43 files, CI + local); CodeQL 0 open alerts |
| CI green on the current HEAD | PASS | PR #4: 9/9 checks pass on `d010069` (Windows job passed on re-run after the first attempt timed out on a degraded runner; A2-22 flake fixed) and on `be03f2c`, `b3a6f34`, `85a44ca` before it |
| Skills verified, none unverified | PASS | Split 255 verified / 16 with limitations / 6 needs-correction / 0 unverified (`ai/audits/SKILL-VERIFICATION-REPORT.md`) |
| Docs synced to verified evidence | PASS | `ai/PROJECT-STATUS.json` canonical; `check:status` drift guard green in CI (0 failures); README/CHANGELOG/SECURITY.md synced; RME-01 pricing bug fixed |
| Release workflow validated | **PARTIAL** | Inspected in full, 3 defects fixed (`41bba4a`), all 14 steps locally simulated and passing — but never executed on GitHub (needs a tag push + version bump, owner approval) |
| Scheduled maintenance workflow tested | **NOT MET** | Inspected (no defect) but **cannot** be tested before re-merge: `workflow_dispatch` resolves against `main`, where the file does not exist (HTTP 404) |
| Windows installation verified as claimed | PASS | CI evidence strong (3/3 green, junction removal proven); limits stated explicitly (fallback creation, ACL, AV unproven; real-machine staging pending) |
| No unresolved installer data-loss issue | PASS | Junction removal proven on a real runner; backups, guarded rollback, modified-file protection all verified |
| Branch protection enabled OR formally accepted | **NOT MET** | Still off (owner decision); no formal acceptance with risk statement recorded yet |
| Real-model eval run | **NOT MET** | No real-model run has ever executed — needs owner credentials (`EVAL_PROVIDER_URL` / `KEY` / `MODEL`); provider layer verified and an 89-case subset is ready (`ai/audits/REAL-MODEL-EVALUATION.md`) |
| Remaining limitations documented | PASS | See below and `ai/PROJECT-STATUS.json` `knownLimitations` |

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

**Final Staging Validation mission — new findings (2026-11-21):**
D1 (drift check UNKNOWN exits 0 — **fixed** in `9fdc0d0`, regression
tested); S-08 warning coverage holes on dry-run and already-installed
(**fixed** in `9fdc0d0`, regression tested); 3 release.yml defects
(no tag↔version gate, no CHANGELOG gate, evals omitted — **fixed**
in `41bba4a`, all 14 steps locally simulated); RME-01 (real-model
eval plan pricing 1000× inconsistent — **fixed**); stale
`PROJECT-STATUS.json` refs and PR #4 description (**fixed**);
scheduled-maintenance dispatch blocked by a GitHub platform
limitation (**documented**, unfixable before re-merge); S-09 FIXED
upstream at live head (vendored copy still mitigated).
`sha_pinning_required` (A4-09) is **not a real API field** — not
verifiable; all 24 `uses:` entries on the branch are SHA-pinned.

## Why not PRODUCTION READY — the five named reasons

1. **S-08 has a recommendation, not an owner acceptance.** Phase 3
   recommends keeping the skill with mandatory warnings + the
   safe-install guide, and hardened the warning coverage (dry-run
   and already-installed paths now warn). The unsafe curl-pipe
   text still ships upstream-verbatim and the residual risk is
   HIGH (upstream). Accepting that residual for production — or
   dropping the agentic-seo skill instead — is the owner's call,
   and it has not been made.
2. **Branch protection is off, so CI is advisory.** The user
   previously decided against it (it would block direct pushes to
   `main`). That decision stands, but until it is either reversed
   or recorded as a formal acceptance with the risk stated, the
   release gate is convention, not enforcement. The recommended
   configuration is in `ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md`.
3. **The release workflow has never executed on GitHub.**
   `release.yml` is tag-only; its 3 defects are fixed and all 14
   steps pass locally, but the first real run needs a tag push
   (owner approval) preceded by the `package.json` + CHANGELOG
   bump to `1.1.0-rc.1`.
4. **The scheduled-maintenance workflow cannot be tested before
   the re-merge.** Dispatch resolves against `main`, where the
   file does not exist (HTTP 404). Its first real run is only
   possible after the file reaches `main`.
5. **No real-model eval run.** The provider layer is verified and
   an 89-case subset is ready, but no real-model run has ever
   executed — it needs owner credentials.

Secondary items that do not block staging but belong on the
promotion list: S-14 re-point decision (the import trails live
upstream by 50 commits; a re-import would also fix S-09),
Dependabot PRs #2/#3 conflicted on pre-revert main (leave open;
`@dependabot recreate` after re-merge — closing prevents
recreation), junction-fallback *creation* unproven on a real
unprivileged Windows machine, real-machine Windows staging
pending, action pins two majors behind v5 (staleness only — SHAs
verified safe).

## Promotion checklist — what turns this into PRODUCTION READY

1. Owner disposition on S-08: accept the Phase 3 recommendation
   (keep + mandatory warnings + safe-install guidance) as
   production-sufficient (recorded), or drop the agentic-seo
   skill (closes S-08, S-09, S-14 outright). Upstream follow-up
   with the author remains owed either way.
2. Branch protection: owner either enables it on `main` (exact
   configuration in `ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md`)
   or records the standing decline as a formal acceptance with
   the risk stated.
3. First real `release.yml` execution: bump `package.json` +
   CHANGELOG to `1.1.0-rc.1`, tag `v1.1.0-rc.1` from staging,
   verify the workflow runs clean. (The new gates fail the run
   if the bump is skipped — by design.)
4. Re-merge to `main` (see below), then the first real
   `scheduled-maintenance.yml` run (dispatch it manually once,
   or wait for the Monday schedule).
5. Real-model eval run (owner provides `EVAL_PROVIDER_*`
   credentials; the 89-case subset + exact commands are in
   `ai/audits/REAL-MODEL-EVALUATION.md`), or an explicit
   recorded decision to defer it.
6. S-14 re-point decision at the next re-import (re-point the pin
   to the live repo — which would also fix S-09 — or accept the
   fork pin with the drift visible).

## Main-branch reconciliation recommendation

Do not merge PR #4 (it is CI validation only). To bring the upgrade to
`main` later:

1. **Revert the revert first, on `main`.** PR #1 was merged (`de6023d`)
   and reverted (`06100e3`); GitHub treats PR #1 as merged, so a fresh
   PR from the branch would otherwise show only the post-merge-base
   diff. Reverting `06100e3` on `main` restores the upgrade base.
   The revert-of-revert was simulated in a disposable worktree:
   it applies cleanly, 0 conflicts, resulting tree identical to
   `de6023d`'s tree. This step needs the owner's explicit go-ahead
   (it changes `main`).
2. **Close PR #4 first.** GitHub allows only one open PR per head
   branch, and PR #4 already uses head
   `feat/skillforge-production-upgrade` → `main` — the fresh PR
   cannot be created until PR #4 is closed (or repurposed).
3. **Then open a fresh PR** from `feat/skillforge-production-upgrade`.
   The branch already contains `main` as an ancestor via the `-s ours`
   merge (`d1e925e`, tree-identical to the branch head), so after step
   1 the merge-base is the revert commit and the PR diff is exactly
   the post-merge fixes — no conflicts expected. (At `be03f2c` the
   diff was 496 files, +96,782/−1,338; re-verify at execution time.
   The reverted files — 479, +1,236/−90,456 — are reintroduced; no
   unwanted changes.)
4. **After the re-merge, `@dependabot recreate` on PRs #2/#3**
   (conflicted, based on pre-revert `main`) and let Dependabot
   re-raise them — do NOT close them (closing prevents recreation).
   Wait for CI, then merge.
5. After the re-merge, `main` regains the 3 stripped workflows
   (CodeQL, release, scheduled maintenance — A4-04), the stale
   Node-20 step labels go away (A4-12), and the weekly drift check
   starts firing.

Until the owner approves the re-merge, the upgrade lives only on this
branch, which is the current state and is fully validated as such.
The full plan with exact commands, expected outcomes, and abort
options is in `ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md` §5.

## §14 deliverables — all present

- `ai/audits/PRODUCTION-READINESS-AUDIT.md` (Phase A, incl. Phase C
  resolution appendix)
- `ai/audits/SECURITY-AUDIT-UPDATED.md` (Phase G fresh audit + Phase 3
  addendum re-verifying S-08/S-09/S-11/S-14 with the S-08
  recommendation)
- `ai/audits/SKILL-VERIFICATION-REPORT.md` (machine-readable summary +
  277-row audit trail)
- `ai/audits/CI-VALIDATION-REPORT.md` (PR #4 rounds 1–2 + confirmatory
  runs + Final Staging Validation addendum incl. Windows staging
  evidence)
- `ai/audits/RELEASE-ACCEPTANCE.md` (this file)
- `ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md` (repo settings
  verified via API + recommended configuration + Phase 10
  reconciliation plan)
- `ai/audits/REAL-MODEL-EVALUATION.md` (provider-layer verification
  + 89-case subset v2 + exact run instructions; validation pending)
- `ai/PROJECT-STATUS.json` (canonical status) + `scripts/check-status.mjs`
  (drift guard, run in CI)

## What staging means here

Deploy the branch as the staging candidate: install from it, run the
installer end-to-end (including `--link` on Windows), tag a release
candidate to exercise `release.yml`, and run the real-model eval subset
once credentials exist. Nothing in this verdict blocks that work — it
blocks only the claim that the work is already production-proven.
