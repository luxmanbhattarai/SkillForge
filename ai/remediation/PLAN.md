# Final Production Readiness Audit & Remediation — Audit Plan

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade` (base `main` @ `bc304a2`,
HEAD `2f1460b` at plan time). Local commits only. Do NOT push, merge, publish, tag,
switch branches, or modify `main`.

## Baseline facts (verified 2026-11-20, before any remediation work)
- Branch, HEAD, clean working tree, and merge-base (`bc304a2`) confirmed via git.
- **No `FINAL-IMPLEMENTATION-REPORT.pdf` exists in the repository.** The only
  report is `ai/reports/FINAL-IMPLEMENTATION-REPORT.md`; the only PDF in the repo
  is the upstream `theme-factory/theme-showcase.pdf`. Per the mission brief §13.5,
  Markdown remains the source of truth unless a documented PDF-generation process
  is found (none is known; Stage A to confirm).
- **PDF supplied by the user as an upload** (`~/workspace/user/files/FINAL-IMPLEMENTATION-REPORT.pdf`,
  574,349 bytes, 2026-11-20) — it is NOT in the repository. Stage A read it and
  treats it as a second copy of the report under verification alongside the
  Markdown; see `ai/remediation/VERIFICATION-MATRIX.md` for the comparison
  (content-equivalent; Markdown remains the repo's source of truth).
- **Diff-stat discrepancy reconciled:** `bc304a2..d58d6b4` = +70,236 (the number in
  the final report, correct at that commit); `bc304a2..2f1460b` = +70,240. The +4
  difference is commit `2f1460b` itself (3 lines in `scripts/security-scan.mjs`,
  1 line in `ai/PROJECT-STATUS.md`). Both numbers were correct at their commits;
  the report's figure is stale by 4 lines because it predates the fix-up. Stage E
  recalculates all metrics from the final HEAD.

## Stages (report after each stage, then proceed)
| Stage | Scope | Exit criteria |
| --- | --- | --- |
| A. Discovery | Verify all 16 report claims with commands; build verification matrix; issue register | `ai/remediation/VERIFICATION-MATRIX.md` + `ai/remediation/ISSUE-REGISTER.md` committed; no implementation changes |
| B. High-risk fixes | Security S-01–S-15 (esp. S-08/S-09/S-11/S-14), installer recovery/data protection, path traversal/symlink safety | Fixes committed with tests; no weakened checks; no silent data loss |
| C. Quality | Audit all 51 new skills (matrix) + 145 corrected skills (regression review); eval quality + real-model layer; agents/workflows validation | `ai/audits/SKILL-AUDIT-MATRIX.md` committed; confirmed issues fixed |
| D. Platform & CI | Windows `--link`, cross-platform tests, workflow validation, supply chain/dependency audit | Platform limits stated honestly (static vs simulated vs real execution); no fake Windows verification |
| E. Final verification | Full suite, metrics recalculation, 4 deliverables, production verdict | `FINAL-REMEDIATION-REPORT.md`, `SECURITY-STATUS.md`, `PRODUCTION-ACCEPTANCE-CHECKLIST.md` committed; verdict chosen with evidence |

Deliverable locations: `ai/reports/FINAL-REMEDIATION-REPORT.md`,
`ai/audits/SKILL-AUDIT-MATRIX.md`, `ai/audits/SECURITY-STATUS.md`,
`ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md`. Working files under `ai/remediation/`.

## High-risk changes (identified before modifying anything)
1. **Installer backup/restore/rollback paths** — data-loss risk. All testing in
   temp sandboxes only, never against real user directories. Any behavior change
   needs a test proving user data survives.
2. **Security scanner exceptions** — must stay narrowly scoped with reasons and
   regression tests proving genuine vulnerabilities are still detected. Never
   weaken a pattern to silence a finding.
3. **Registry/schema changes** — must stay deterministic; breaking changes affect
   the installer, query CLI, and CI. Regenerate and diff after every change.
4. **CI workflow changes** — cannot execute on GitHub without pushing (forbidden).
   Local validation only (YAML parse, action SHAs, script references); report the
   remote-execution limitation honestly.
5. **Skill content fixes** — evidence-based only (official docs); fix confirmed
   issues, no mass stylistic rewrites. Never edit `skills/upstream/` (verbatim
   policy); upstream risks get local/docs mitigations only.
6. **Windows `--link`** — no Windows runner is available locally. Static
   inspection + simulated tests only, unless CI provides a Windows leg; never
   claim real Windows execution without it.
7. **Eval framework changes** — the 449-case baseline is the regression
   reference. Any behavior change must re-run the suite; baseline re-saves need
   a recorded reason.

## Evidence rules
- Every verified claim records: reported result, repository evidence, verification
  command, actual result, status (VERIFIED / PARTIALLY VERIFIED / NOT VERIFIED),
  corrective action.
- Never fabricate results, versions, dates, or verification claims. Where the
  environment prevents a test, mark it Blocked with the reason.
- Never use "100% production-ready" unless every acceptance criterion has evidence.
- Distinguish: Implemented / Unit tested / Integration tested / Real environment
  tested / Manually reviewed / Not tested / Accepted upstream risk / Known limitation.
