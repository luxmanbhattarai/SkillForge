# SkillForge — Project Status (canonical)

**Canonical status document.** This file states the actual project
state without ambiguity. The machine-readable canonical source is
`ai/PROJECT-STATUS.json` (guarded by `scripts/check-status.mjs` in
CI); this document is its human-readable companion. If the two ever
disagree, the JSON governs and this file must be fixed.

Last reconciled: **2026-11-22** (production-hardening mission,
Group A). All facts below were verified against git history
(`git log`) and the GitHub API (`gh api`, `gh run list`) on that
date; each names its evidence.

## Current canonical state

- **Branch:** `main`. **HEAD:** `b86b469`
  (`b86b4696e518a87edded3f0f55ef0643fd08c3cd`, "CI: add Gitleaks
  secret scanning; branch protection enabled").
- **Version:** 1.1.0 (`package.json`). **Releases:** v1.1.0
  (Latest; tag on `9216cbb`) and v1.0.0 (restored; tag on
  `bc304a2`).
- **Library:** 277 skills (228 original + 49 upstream) in 18
  categories, 24 agents, 16 workflows. Verification split: 255
  verified / 16 with limitations / 6 needs-correction / 0
  unverified.
- **How `main` got here:** the production upgrade was merged via
  PR #5 (merge commit `7b4f6eb`, 2026-11-21T23:13:44Z). The
  feature branch was deleted after the merge; the remote now has
  only `main`.
- **CI on `main`:** green at `b86b469` (Validate skills, Lint,
  Security audit, CodeQL runs all `success`). All 6 workflows
  have now run on GitHub: `release.yml` ran green on the v1.1.0
  tag (run 44967209791); `scheduled-maintenance.yml` had its
  first run on 2026-11-22 (run 44970737145, `workflow_dispatch`)
  with conclusion `failure` — "Monitor upstream sources" and
  "Detect stale skill verification" passed, but "Verify links
  online" failed on 3 external links returning HTTP 403
  (bot-blocked hosts, not dead links; needs documented
  exceptions or link fixes, then a re-run).
- **Branch protection: ON** for `main` (10 required status
  checks, strict; force pushes and deletions blocked;
  `enforce_admins=false`, so the owner's direct pushes still
  work). Pull requests before merging and conversation
  resolution are **not** required — owner decisions. Full live
  config: `ai/audits/BRANCH-PROTECTION-VERIFICATION.md`.
- **Tests:** `npm test` 326 tests, 325 pass, 0 fail, 1 skipped
  (Linux; the skip is the Windows-only junction test) at the
  last clean committed battery (`9fdc0d0`). The hardening
  mission has since added test files on the shared
  `feat/production-hardening` tree (Group A: 31 tests — 9
  docs-consistency + 5 installer-warnings + 9
  installer-profiles + 8 installer-status-filter — all
  passing; the latest shared-tree full run, 2026-11-22, was
  646 total with 628 pass, 4 fail, 14 skipped — the 4 failures
  were all in `test/installer.test.mjs`, all caused by the
  Finding 3 status filter, and all fixed after the run); the
  runner numbers move when the coordinator re-runs the full
  battery at the merge commit. **Behavioral evals:** 463/463 pass, 0 failed, 0
  critical, 277/277 skills covered (mock provider, at
  `9fdc0d0`). **Security scan:** `npm run check:security` PASS,
  0 findings; Semgrep 0 findings (68 rules); CodeQL 0 open
  alerts; Gitleaks full-history scan 0 real secrets.

## What has NOT happened (stated plainly)

- **No real-model evaluation has ever run.** There are no
  results and no run has been performed. The credential
  blocker is lifted — the owner connected a Gemini API key
  (custom.gemini connector, Secure Vault) and approved it for
  the real-model evaluation (2026-11-21) — and the Phase 4 framework
  is complete (`evals/run-real-model.mjs` +
  `evals/providers/gemini.mjs`); the run itself is now blocked
  on the free-tier quota (20 requests/day, exhausted; reset
  ~08:00 UTC) after a 2026-11-22 smoke test went 0/3 on HTTP
  429s — it may proceed as a multi-day run (20/day, checkpoint
  resume) or on a paid tier (owner decision). An 89-case subset
  is ready (`evals/datasets/real-model-subset-v2.json`, 89/89
  on mock). See `ai/audits/REAL-MODEL-EVALUATION.md`,
  `ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md` (Group B,
  BLOCKED — free-tier quota exhausted), and
  `ai/PROJECT-STATUS.json` (`evidence.realModelEval`: `hasRun:
  false`, no commit — none is invented).
- **S-08 has no owner disposition.** The unsafe
  curl-pipe install text still ships verbatim in the
  upstream `seo` skill; the local mitigation (mandatory
  installer warnings on install, update, dry-run,
  already-installed, restore, and doctor paths + the
  safe-install guide) is verified working, but accepting the
  residual risk — or dropping the skill — is the owner's call
  and has not been recorded. See
  `ai/security/SECURITY-RISK-ACCEPTANCE.md` and
  `docs/AGENTIC-SEO-SAFE-INSTALL.md`.
- **No real-machine Windows staging.** All Windows evidence is
  GitHub CI (`windows-latest`); junction-creation fallback,
  NTFS ACL, and AV scenarios are unproven on a real machine.

## Pending validations

See `ai/PROJECT-STATUS.json` (`pendingValidations`): fix the
scheduled-maintenance first-run links failure (3× HTTP 403) and
re-run; S-08 owner disposition; real-model eval execution
(credentials available, framework complete, run pending);
branch-protection residuals; disabled code-security items
(validity checks, non-provider patterns); real-machine Windows
staging; full-battery re-run at the hardening-mission merge
commit; the S-14 re-point decision.

## Historical reports

The audit reports under `ai/audits/` are preserved as history.
The four reconciled reports (`RELEASE-ACCEPTANCE.md`,
`GITHUB-SECURITY-RECOMMENDATIONS.md`,
`REAL-MODEL-EVALUATION.md`, `CI-VALIDATION-REPORT.md`) each
carry a dated "Addendum — canonical main reconciliation
(2026-11-22)" section recording what has changed since they
were written. The mission log below is the 12-phase upgrade
log, preserved verbatim.

## Historical mission log (2026-11-20 – 2026-11-21, preserved as history)

The log below records the 12-phase production-upgrade mission
on its feature branch. It is history: the branch is merged and
deleted, the "local only / do not push" rule is superseded, and
the phase statuses describe that mission, not current `main`.
Do not edit it to match the present; append dated corrections
instead (as was done throughout).

### Production Upgrade: Project Status (original header, preserved)

Branch: `feat/skillforge-production-upgrade` (from `main` @ bc304a2, v1.0.0)
Started: 2026-11-20
Rule: local commits only on this branch. Do NOT push, merge, or open a PR.
(Superseded 2026-11-21: the branch was pushed, PR #1 opened, merged,
and reverted at the owner's request. The rule no longer applies; push /
merge / PR decisions are the owner's, per the production-readiness
audit A1-10.)

### Baseline (v1.0.0, main @ bc304a2)
- 226 skills (177 original + 49 upstream), 20 agents, 9 workflows, 844 files.
- All validations pass; online link check clean (311 URLs verified, 47 documented exceptions).
- Known: 11 upstream-only warnings; upstream files verbatim/unedited.

### Phase status
| Phase | Status | Notes |
| --- | --- | --- |
| 1. Full repository audit | Verified | 27 findings (0 Critical, 5 High, 10 Medium, 12 Low). All baseline checks re-run and passing; online link check clean. -> ai/audits/INITIAL-AUDIT.md |
| 2. Installation system overhaul | Verified | Full safe CLI (install/update/list/doctor/validate/uninstall/restore, manifest, backups, two-rename installs — not atomic, see remediation A-05/A-31); 62 tests pass; Codex/Antigravity paths corrected per current vendor docs. Limitation: Windows --link EPERM path untested (no Windows runner). Findings H-01, M-05, M-06, M-09 fixed. |
| 3. Technical accuracy audit | Verified | All 226 skills audited: 204 Verified, 16 Verified with limitations, 6 Needs correction (upstream), 0 Unverified, 0 Blocked. 145 original skill files corrected (+1715/−507 incl. +22/−22 registry JSON in the same commit; skill files alone +1693/−485 — see remediation A-21). Full validation suite passing; online link check clean (347 URLs). Limitations: X/Twitter docs unavailable (3 skills); Prisma 8 still RC (3 skills); upstream errors need upstream fixes. Findings H-04 fixed, M-08 triaged (partially resolved). -> ai/audits/TECHNICAL-ACCURACY-AUDIT.md |
| 4. Skills expansion | Verified | All 12 batches done: 51 new skills (277 total, 18 categories), 2 extensions. Registry regenerated; full suite passing (62 tests, validate PASS with 5 upstream-only warnings, security clean). Online link check PASS (609 URLs verified, 51 documented skips, 0 errors) after 4 link fixes. |
| 5. Skill quality standards | Verified | 22-element standard in docs/SKILL-STANDARDS.md + template update; scorer scripts/score-skills.mjs (npm run score) with hard caps. All-skills mean 87/100, 0 CRITICAL; new skills 96.8 mean, 0 flags. Results in ai/test-results/phase5-quality-summary.md. |
| 6. Behavioral evaluation system | Verified | Framework built and committed (2a4ebc9): deterministic mock agent (no LLM APIs), 12 categories, 4 scorers, baseline + regression comparison, `npm run evals`. 172 hand-written cases (20 seed + 152 new: 75 content/security + 77 engineering) + 277 generated discovery cases = 449 total; full suite 449/449 passing, 0 failed, 0 critical, 277/277 skills covered; baseline saved. 2 fixtures, both grounded in skill text. Results in ai/test-results/phase6-eval-results.json. Limitations: mock agent evaluates the library, not a real LLM; model-based provider untested without credentials. |
| 7. Security verification upgrade | Verified | Scanner expanded 7 → 29 patterns + multi-line curl-pipe + binary byte-scan; shared pattern library (scripts/lib/security-patterns.mjs) used by scanner, scorer, and eval mock agent; 22 security tests; supply chain verified (all 6 upstream commits + licenses via GitHub API); SECURITY.md strengthened; docs/SECURITY-SCANNING.md + docs/THREAT-MODEL.md added; audit ai/audits/SECURITY-AUDIT.md (S-01–S-15: 7 fixed, 4 accepted upstream, 3 unresolved upstream, 1 open). No live credentials, no malicious code. Full suite passing (96 tests, 0 fail). Limitations: Semgrep/Gitleaks/TruffleHog/CodeQL not installed locally (Blocked); GitHub-side scanning recommended for Phase 10; L-10 resolved (agentic-seo: MONITOR, re-verify source at next update). Results in ai/test-results/phase7-security-results.json. |
| 8. Agents and workflows expansion | Verified | Validator added (scripts/check-agents-workflows.mjs, `npm run check:agents`): H1, required sections, reference resolution, should-use ⊆ discover; 8 tests; 40 files PASS. M-07 fixed (5 shorthand refs, 10 occurrences). 4 new agents (ai-engineer, desktop-engineer, devops-engineer, release-manager) and 7 new workflows (secure-api-development, database-migration, authentication-implementation, production-deployment, sdk-development, ai-rag-implementation, security-review); 24 agents, 16 workflows. 17 existing agents updated (50 discover rows); all 51 Wave 2 skills covered by ≥1 agent/workflow. 3 workflows improved instead of duplicated (production-release, article-publishing, new-project). No principal-architect (would duplicate engineering-architect); no frontmatter added (validate structure instead). See ai/decisions/2026-11-20-phase8-agents-workflows-scope.md. Full suite passing (104 tests). |
| 9. Registry and architecture | Verified | M-01 fixed: registry `status` derives from sources/verification-status.json (Phase 3 audit outcomes: 204 verified, 16 with limitations, 6 needs-correction, 51 unverified Phase 4 skills — no relabeling). M-10 fixed: registry/agents.json (24) + registry/workflows.json (16) generated; 8 JSON Schemas + scripts/validate-registry.mjs (`npm run check:registry`, schema + semantic + verification-coverage + audit cross-check); `related` skills derived from agent/workflow co-occurrence (126/277 skills). L-06/L-07 fixed (target tree, sources, category descriptions externalized; report 228/228). Query CLI scripts/query-skills.mjs (`npm run query`): search, categories, show, deps, related, compat, stale (exits 1 when stale), status, agents, workflows. Deterministic regeneration (zero diff). Installer loadLibrary reads agents/workflows registries with disk-scan fallback. Full suite 124/124; evals 449/449, 0 regressions vs baseline. Results in ai/test-results/phase9-registry-results.md. |
| 10. CI/CD and automation | Verified | M-03 fixed: validate-skills.yml runs every local check (validate, frontmatter, duplicates, sources, agents, score, tests) + registry job (check:registry + regenerate/diff) + evals job; M-04 fixed: all actions pinned to SHAs verified via git ls-remote (checkout v5, setup-node v5, codeql-action v4), least-privilege permissions on all 6 workflows, no secrets. L-11: weekly online link check; L-12: Node 18/20/22 matrix. New: codeql.yml (advanced setup), scheduled-maintenance.yml (online links, stale verification, upstream monitoring via scripts/check-upstream.mjs), release.yml (strict validation on v*.*.* tags), .github/dependabot.yml (github-actions only). Coordinator independently re-verified SHAs, YAML, pins, permissions, script references, and check-upstream live (5 up-to-date, Vercel 4 commits behind — informational drift). Limitations: no workflow has run on GitHub yet; Node 18/22 legs unexercised locally; secret scanning/Dependabot alerts are manual repo settings (see ai/phase10/NOTES.md). Results in ai/test-results/phase10-ci-results.md. |
| 11. Documentation and DX | Verified | README/AGENTS.md/CONTRIBUTING.md/CHANGELOG rewritten for the upgraded library (277 skills, honest verification wording); new docs/UPGRADE.md, docs/TROUBLESHOOTING.md, docs/EVALUATION.md, docs/README.md; docs/ARCHITECTURE.md rewritten; L-05 fixed (parser subset documented), L-08 fixed (empty .claude/settings.json deleted), L-09 fixed (stale counts corrected). Coordinator verified: check:links PASS (73 links), all anchors valid, category counts match query CLI, L-05 claims match frontmatter.mjs, all example commands exist. Review found a real defect for Phase 12: validate:strict fails on upstream-only warnings, so release.yml can never pass (see ai/test-results/phase11-docs-results.md). Results in ai/test-results/phase11-docs-results.md. |
| 12. Full testing, verification, final report | Verified | Full battery after the last edit, all passing: 129/129 unit tests, 449/449 evals (0 regressions), all validators, online link check PASS on re-run (609 verified, 0 errors; first run had 1 transient 403), Skills CLI 277/277 discovered. Fixed 2 real defects found during verification (validate:strict failing on upstream-only warnings; graphql frontmatter unquoted ': ' invisible to strict YAML) + L-01 (line-count off-by-one) + L-04 (research snapshot parse error). Quality gates all pass (no unresolved critical security findings; S-08 High unresolved upstream, documented). Final report: ai/reports/FINAL-IMPLEMENTATION-REPORT.md. Machine-readable results: ai/test-results/phase12-final-results.json. **All 12 phases Verified. Branch ready for review/merge (user decision; nothing pushed).** |

Statuses: Not Started / In Progress / Implemented / Tested / Verified / Blocked.
A phase is Verified only when its implementation exists, its tests ran and passed,
results are recorded, and limitations are documented.

### Execution log
- 2026-11-20: Branch created from main @ bc304a2; ai/ workspace scaffolded.
- 2026-11-20: Phase 1 complete — full audit written (27 findings), all baseline validations re-run and passing, online link check clean (311 URLs, 0 errors).
- 2026-11-20: H-02 fixed in Wave 1 — registry/report generation is now deterministic (`generated` derives from newest `last_verified`); see ai/decisions/2026-11-20-registry-determinism.md.
- 2026-11-20: Phase 2 complete — installer overhauled (safe, reversible, manifest-based CLI; 62 tests pass). Codex/Antigravity install paths corrected per current vendor docs (coordinator re-verified). Findings H-01, M-05, M-06, M-09 fixed.
- 2026-11-20: Phase 3 fanned out — 10 batches auditing all 226 skills (see ai/phase3/plan.md).
- 2026-11-20: Phase 3 complete — all 226 skills audited (204 Verified, 16 with limitations, 6 Needs correction upstream). 145 original skill files corrected; H-04 fixed; M-08 triaged. Full suite passing; online link check clean (347 URLs, 0 errors). Wave 1 (Phases 1–3) complete.
- 2026-11-20: Wave 3 started (Phases 6–8). Phase 6 framework built and committed (2a4ebc9): deterministic mock agent, 12 categories, 297/297 seed cases passing, baseline saved.
- 2026-11-20: Phase 6 case authoring — 152 new cases (75 content/security + 77 engineering, 2 fixtures); full suite 449/449 passing, 0 critical. Baseline save pending.
- 2026-11-20: Phase 7 complete — security scanner expanded (7 → 29 patterns), shared pattern library, 22 security tests, supply chain verified, audit written (S-01–S-15). No live credentials, no malicious code. Full suite passing (96 tests). Findings M-02 fixed; L-10 resolved (monitor agentic-seo).
- 2026-11-20: Phase 8 complete — agents/workflows validator added (H-05), M-07 fixed, 4 new agents + 7 new workflows (24 agents, 16 workflows), 17 agents updated for the 51 Wave 2 skills (all covered). Full suite passing (104 tests).
- 2026-11-20: Phase 6 complete — 449/449 evals passing (172 hand-written + 277 generated), 0 critical, 277/277 skills covered, baseline saved. Phase 6 Verified. Wave 3 (Phases 6–8) complete.
- 2026-11-20: Phase 6 follow-up (from the engineering case author's report): fixed 3 library defects found while writing cases (changesets actions v4 → v7; prisma/drizzle stale Node 24/TS 5.x prerequisites → Node 26 LTS/TS 7.x; nestjs frontmatter TS 5.x → 6.x — TS 7 is not yet supported by nest build, verified against 4 independent sources) and 2 eval framework defects (extractCode phantom/swallowed blocks; tsStructure false UNBALANCED on URLs in strings). 4 regression tests added; full suite 449/449, 108 tests pass.
- 2026-11-20: Wave 4 started (Phases 9–12). Phase 9 complete — registry status semantics fixed (M-01), agents/workflows registries + schema validation built (M-10), query CLI added, L-06/L-07 externalized; full suite 124/124, evals 449/449 with 0 regressions vs baseline. Phase 9 Verified.
- 2026-11-20: Phase 10 complete — CI/CD rebuilt (6 workflows, pinned SHAs, least-privilege, Node matrix, CodeQL, scheduled maintenance, release validation, Dependabot); coordinator verified SHAs/YAML/script references independently and re-ran check-upstream live. Phase 10 Verified.
- 2026-11-20: Phase 11 complete — documentation overhaul (README/AGENTS/CONTRIBUTING/CHANGELOG, 4 new guides, ARCHITECTURE rewrite, L-05/L-08/L-09 fixed); coordinator verified links, anchors, counts, and example commands. Review caught a real defect: validate:strict fails on upstream-only warnings (release.yml can never pass) — fix queued for Phase 12. Phase 11 Verified.
- 2026-11-20: Phase 12 complete — full verification battery after the last edit (129/129 tests, 449/449 evals with 0 regressions, all validators, online links PASS on re-run, Skills CLI 277/277). Fixed validate:strict (upstream-aware), the graphql strict-YAML defect (Skills CLI discovery), L-01 (line-count off-by-one), and L-04 (research snapshot). Final report written (ai/reports/FINAL-IMPLEMENTATION-REPORT.md). All 12 phases Verified; upgrade complete, branch ready for review/merge.
- 2026-11-20: Final verification found `npm run check:security` failing on one MEDIUM finding — the final report itself quoting `rejectUnauthorized: false` as evidence for audit S-11. Fixed with a documented EXCEPTIONS entry in `scripts/security-scan.mjs` (same treatment as the security audit report); full battery re-run green.
- 2026-11-20: Remediation Stage A complete — independently verified the 12-phase report (11 of 16 claims VERIFIED, 5 PARTIALLY VERIFIED, 0 NOT VERIFIED) and recorded 52 issues (3 High, 15 Medium, 26 Low, 8 Informational) in ai/remediation/ISSUE-REGISTER.md. The scan was failing at the Stage A head (8 findings, all documentation quotes).
- 2026-11-20: Remediation Stage B complete — all 21 Stage B issues addressed (see ai/remediation/STAGE-B-RESULTS.md): security scan green (narrow exceptions, hardened matcher, 10 scanner integration tests); installer path-traversal validation for manifests/backups; install lockfile; guarded swap rollback; pre-swap verification; diverged-link conflicts; read-only dry-run; fail-closed manifest repair with rebuild from disk; restore verification/recovery; agentic-seo safe-install guide + install/doctor warnings (S-08/S-09 stay open upstream). Full suite 169/169 pass (168 real tests + the helpers.mjs file entry per A-18); evals 449/449, 0 regressions. S-14 re-verified (fork, 50 commits behind pin; MONITOR stands; drift check watches the dormant fork — gap documented).
- 2026-11-20: Remediation Stage C complete — all 12 Stage C issues addressed (see ai/remediation/STAGE-C-RESULTS.md): all 51 Phase 4 skills audited individually (ai/audits/SKILL-AUDIT-MATRIX.md; 59 findings — 0 Critical, 3 High, 10 Medium, 38 Low, 8 Informational — 53 fixed, 6 Informational needing no fix, 0 unresolved; 50 verified, 1 verified-with-limitations, 0 unverified remain — library split now 254/17/6/0); 145 corrected skills regression-reviewed (5 findings fixed, incl. the twitter-cards 1200x600 alignment and the Node 20 EOL date 30 April 2026); eval quality fixes (A-10 `--out` flag, A-17 honest coverage, A-19 real validateCases tests, A-33 14 non-circular discovery cases, A-34 `grounded-in` check) + provider-independent real-model layer with a 75-case subset and plan (no real-model run executed — no credentials); installer test gaps closed (A-12/A-13/A-15, 8 new tests, installer suite 80/80); A-31 header wording fixed (report §7 remainder to Stage E); L-Prisma resolved (7.10.1 stable, Prisma 8 still an RC, no GA date). Full suite 196/196 pass (195 real tests + the helpers.mjs file entry per A-18); evals 463/463, 277/277 skills selected, 0 regressions vs the re-saved baseline (reason recorded). Full battery green except `check:upstream`, which could not run (GitHub API rate limit exhausted; re-run in Stage D).
- 2026-11-20: Remediation Stage D complete — all 8 Stage D issues addressed (see ai/remediation/STAGE-D-RESULTS.md): Windows --link junction fallback (new scripts/install/links.mjs; EPERM directory symlinks retry as junctions, no privilege needed) + Windows lock hints/rm retries + kind-correct link backup/restore + forward-slash manifest roots; prompt streams injectable (node-pty decision: option c, no new dependency); W-1/W-2/W-3 fixed (USERPROFILE sandboxing, POSIX path normalization via scripts/lib/paths.mjs in the scanner, registry generator/validator, link checker, and scorer); CI validated locally (123 checks, 0 fail; SHA pins re-verified) + concurrency controls + advisory Windows leg (continue-on-error; promotion needs a green real PR run); Node 18.20.8 + 22.23.5 exercised locally (196/196 each); Gitleaks/TruffleHog/Semgrep ran clean (CodeQL + act Blocked); supply-chain audit clean (zero deps verified, 4 binaries hashed); link checker hardened (code stripping, retry/backoff, delay; 14 tests); Vercel re-imported verbatim to 5a37a632 (web-design-guidelines 1.1.0, byte-identical); L-Prisma headline still holds. Full suite 232/232 pass (231 real tests + the helpers.mjs file entry per A-18); evals 463/463, 0 regressions. No workflow has run on GitHub and no real Windows execution has happened — both stay UNVERIFIED until the first push/PR after merge. check:upstream re-ran 5/1/0 before the re-import; the post-re-import confirmation was Blocked by the API rate limit (re-run in Stage E).

- 2026-11-20: Remediation Stage E complete — final verification (see ai/reports/FINAL-REMEDIATION-REPORT.md and ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md): check:upstream re-run (6 up-to-date, 0 behind — Stage D's Blocked confirmation done); online link check re-run (604 enumerated, 559 checked live, 45 skipped, PASS on the confirming run after one transient Discord-docs timeout, verified real independently); A-18 fixed (helpers moved to test-support/, npm test prints the real count); A-24 fixed (fetched reported separately + regression test); A-22/A-25/A-26/A-32 evidence-packaging & licensing done; final acceptance suite added (repository/validators/links, 17 new tests) + A-37 registry atomic-write fix with regression test + A-38 intermittent-failure fix (evals test sandboxed, checker/scanner tolerate files deleted mid-scan; suite 249/249, printed == counted); skill-audit totals corrected (60 findings, 11 Medium, 54 fixed — Stage C undercounted batch 4 by one); report addendum appended (no silent rewrite); S-01–S-15 status recorded (ai/audits/SECURITY-STATUS.md). Verdict: READY FOR PULL REQUEST REVIEW. Still open: no workflow has run on GitHub (L-CI), no real Windows execution (L-Win), S-08/S-09/S-11 open upstream, CodeQL never run, no real-model eval run (L-Model). One new Low finding carried forward: A-36 (link checker never enumerates bare URLs).

- 2026-11-21: PR #1 first CI run — all Ubuntu jobs green (Validate 18/20/22, Registry, Behavioral evals, lint, security-audit, CodeQL), Windows (Node 20) leg FAILED: `npm run validate` reported all 277 skills missing from the registry. Root cause: scripts/validate-skills.mjs compared POSIX registry paths against raw `path.relative` disk paths (backslashes on Windows); Stage D's W-2/W-3 normalization missed this script. Fixed by extracting exported `findRegistryMismatches()` with `toPosixPath` normalization + main guard, with a regression test using `path.win32` shapes (250/250 tests pass).

- 2026-11-21: First real Windows execution (PR #1 run 44931780351, Node 24): validate now passes on Windows, but `npm test` failed 7/255 — all seven diagnosed from the job log and fixed. Real product fixes: (1) new scripts/lib/atomic-write.mjs — temp+rename with retry on transient Windows lock errors (EPERM/EBUSY/EACCES), used by the registry generator and manifest writer (A-37: bare rename failed under a concurrent reader); (2) createBackup accepts an injectable fsOps.cp (same seam as fsOps.symlink). Test-only fixes: A-09a --import now uses a file:// URL (bare C:\ paths are rejected by the ESM loader); A-16d failure injection via fsOps.cp instead of a Unix socket (cannot be created on Windows); A-11 and relativeRoot expectations computed with the platform-native path.resolve instead of hardcoded POSIX paths; validate --strict and check-duplicates assertions normalize backslashes before matching. Full suite 250/250 locally; Windows verification awaits the next CI run. Note: push 79a8a74 triggered no GitHub workflows at all (0 check-runs; triggers verified correct, no path filters) — treated as a dropped GitHub event; the next push is the test.

- 2026-11-21: PR #1 CI green, merge, revert — pushes 79a8a74/3e5b711 triggered zero PR workflows: main had moved and the PR was conflicting, so GitHub could not build the merge ref. Resolved by merging main into the branch (b5ad9a2; all 5 conflicts took the branch version, which subsumed main's changes). The A-37 retry budget (8x15ms) proved too short on real Windows (all attempts EPERM, likely AV/indexer); widened to exponential backoff (25ms start, x2, 400ms cap, 10 attempts, ~2.8s worst case, paid only on lock) in 508b044. Final PR run 44933250315: all 8 checks pass; Windows (Node 24) 250/255 pass, 0 fail, 5 POSIX-only skipped — L-CI and L-Win closed. PR #1 merged 18:08:10Z (de6023d), then reverted at the user's request (06100e3; tree verified identical to pre-merge 5d36d02, 226 skills, main CI green). The upgrade work remains on this branch.

- 2026-11-21: External audit round (5 findings) addressed on this branch — (1) README verification table corrected to the audited split 254/17/6/0 (Stage C had updated the eval counts but missed the table; README eval count was already 463, not 449 as the audit claimed); phase6-eval-results.json left as a dated 449-case snapshot. (2) Windows leg promoted from advisory to gating (continue-on-error removed; W-1/W-2/W-3 fixed in Stage D, W-4 proven on the real runner). (3) Stale "no workflow has run on GitHub" claims corrected in README, ai/phase10/NOTES.md, and the remediation report addendum (§8 item 10); dated log entries left untouched. (4) Semgrep added to CI (security-audit.yml, pinned 1.186.0, p/javascript over scripts/test/evals) — the custom scanner stays honestly labeled a smoke screen; secret scanning (with push protection) was already enabled on the repo, Dependabot security updates enabled in this round, branch protection still not enabled (blocks the user's direct pushes — user decision). S-08/S-09/S-11 still open upstream. (5) No real-model eval run — still needs EVAL_PROVIDER_* credentials from the user. Also fixed 9 stale "Set up Node.js 20" step labels across the workflows (version was already 24).

- 2026-11-21: Production-readiness audit (Phase A, ai/audits/PRODUCTION-READINESS-AUDIT.md, 60 findings) — Phase C workstream C1 (docs + status) fixes: (A1-01) "all 6 workflows ran" corrected to "4 of 6 ran on PR #1; scheduled-maintenance and release never ran" in README and ai/phase10/NOTES.md, plus a dated §8 item 11 correction in the remediation report (item 10 not rewritten). (A1-02) CHANGELOG [Unreleased] corrected on all 6 stale points. (A1-03) Eval breakdown fixed to 186 hand-written + 277 generated = 463; unit-test count updated to the live 250 (npm test 2026-11-21: 250 pass, 0 fail; Windows CI counts 255 with 5 POSIX-only skipped). (A1-04) SECURITY.md, docs/SECURITY-SCANNING.md, docs/THREAT-MODEL.md §1 updated to current settings (secret scanning + push protection + Dependabot enabled; branch protection still off). (A1-05) Dated addendum appended to the production acceptance checklist (superseded rows listed; ai/audits/RELEASE-ACCEPTANCE.md to supersede it). (A1-06) NOTES.md Node-matrix and "not verified" sections corrected with dated updates. (A1-07) Dated post-PR note appended to the implementation report's addendum. (A1-08) Remediation report §11 rows annotated (L-CI, L-Win, CodeQL, L-Settings, 17 truncated notes, Element-14). (A1-09) Semgrep-in-CI claim qualified as "added in b619388, awaiting its first run" (README, NOTES.md). (A1-10) "Local only / do not push" rules annotated as superseded 2026-11-21 (this file, SECURITY-STATUS.md, SKILL-AUDIT-MATRIX.md header). (A3-01) link-building promoted to `verified` — its only limitation (6 broken tools/ links) resolved by the Phase 4 tools/ import; split now 255/16/6/0, registry regenerated (one-line diff). (A3-02) All 17 truncated verification notes restored in full from the Phase 3 audit detail tables; no truncation code exists in the generator or query CLI (the truncation was a Phase 3 authoring artifact). (A3-03) SKILL-STANDARDS.md element 14 narrowed to accessibility content for the five user-facing categories; library-wide pass remains follow-up work. (A4-03) 5 open CodeQL alerts triaged and recorded in ai/audits/SECURITY-STATUS.md (no dismissals called). (A5-09) Binary-hash verification step added to the re-import checklist in docs/UPDATE-PROCESS.md (hashes in sources/binary-hashes.json, verified by `npm run check:security`). Known cross-workstream dependency: promoting link-building breaks the `check:registry` audit cross-check (validate-registry.mjs compares against the Phase 3 audit table, which still says "Verified with limitations") and the pinned counts in test/registry.test.mjs:285-287 — the coordinator/C2 must add a dated post-audit override before the split change can go green.

- 2026-11-21: Production-readiness mission (Phases A–G) — full re-audit at HEAD b619388 by 5 parallel workstreams (ai/audits/PRODUCTION-READINESS-AUDIT.md, 26f7dc9): 60 new findings (4 High, 14 Medium, 42 Low) + S-08/S-09/S-11/S-14 re-investigated. Headline correction: "all 6 workflows ran on GitHub" was false — only 4 ran (scheduled-maintenance and release never executed). Phase C fixed 48 findings in 4 workstreams: C1 docs/status (f790ecd — README/CHANGELOG/SECURITY.md corrected, link-building promoted to verified, split now 255/16/6/0, 17 truncated notes restored); C2 installer/registry/evals (33e43b9 — 24 findings incl. uninstall data-loss fix, manifest climb cap, S-14 live-upstream compare now reporting the author 50 commits ahead, AUDIT_OVERRIDES mechanism); C3 scanner/scorer (c63673b — dead score cap fixed, scanner extended to .cjs/.html/.xml/.txt + extensionless files, 1,119 text + 4 binary scanned, binary hashes machine-checked, ignore allowlist); C4 workflows (59736dd — timeouts on all 12 jobs, report sync gate, CODEOWNERS, junction-removal proof test). 5 CodeQL alerts triaged and dismissed (0 open). Full battery at 33e43b9: 325 tests (324 pass, 0 fail, 1 Windows-only skip), evals 463/463, validate PASS, registry PASS, security scan PASS, Semgrep 0 findings (68 rules). Phase F added ai/PROJECT-STATUS.json (canonical status) + scripts/check-status.mjs drift guard wired into CI. Still open: S-08/S-09/S-11 upstream, no real-model run (needs credentials), branch protection off (owner decision), fresh CI on the current HEAD (draft PR #2).

- 2026-11-21: Final Staging Validation mission (Phases 1–11) — built on the READY FOR STAGING verdict at be03f2c (9/9 green on draft PR #4). Phase 1 verified HEAD be03f2c = remote, no new commits, PR #4 open with all 9 checks green. Phase 2 synced ai/PROJECT-STATUS.json to be03f2c (b5956b8; schema convention documented: commit fields = "last verified at", historical records preserved; check:status 0 failures). Phase 3 re-verified S-08/S-09/S-11/S-14 from scratch (9fdc0d0): S-08 still MITIGATED — the installer never executes the unsafe install (no child-process execution in scripts/install/, install.sh non-executable), but the warning had two coverage holes (dry-run, already-installed) now fixed in scripts/install/commands.mjs with regression tests; recommended owner decision is (a) keep the skill with mandatory warnings + safe-install guidance; S-09 MITIGATED in the vendored copy, FIXED upstream at live head (SkillForge never executes broken_links.py; first-party TLS intact); S-11 MITIGATED (no TLS-disable in first-party code; exceptions per-file + A5-07 ignore gate); S-14 MITIGATED (live-upstream compare verified working, import 50 commits behind, re-point decision pending). D1 fixed in the same commit: check-upstream now exits non-zero when any vendor is UNKNOWN (a total monitoring failure previously exited 0 and looked green). Phase 4 produced ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md (b963122): secret scanning + push protection + Dependabot on, validity checks + non-provider patterns + private vulnerability reporting off (recommend enabling), branch protection off (404), sha_pinning_required not a real API field; Dependabot PRs #2/#3 verified current but conflicted — leave open, `@dependabot recreate` after re-merge (closing prevents recreation). Phase 5 verified Windows staging from CI logs: 3/3 green Windows runs (330/325/0/5), A5-11 junction-removal test passed on all three; junction *creation* via fallback unproven on a real unprivileged machine, NTFS ACL + AV scenarios untested, no uninstall→reinstall cycle test; real-machine staging PENDING. Phase 6 fixed 3 genuine release.yml defects (41bba4a: tag↔package.json version gate, CHANGELOG entry gate, evals step added) and locally simulated all 14 release steps (all PASS, ~187s); correct RC version confirmed v1.1.0-rc.1 (zero skill/agent/workflow deletions since v1.0.0 → minor bump); no tag pushed (owner approval needed, and package.json + CHANGELOG must be bumped to 1.1.0-rc.1 first or the new gates correctly fail). Scheduled-maintenance dispatch BLOCKED by a GitHub platform limitation: dispatch resolves against main, where the workflow file does not exist (HTTP 404) — first real run only possible after re-merge. Phase 7 produced ai/audits/REAL-MODEL-EVALUATION.md + 89-case subset v2 (c8214ce, 89/89 on mock); provider layer verified (timeouts, retries, Retry-After, cost tracking, credential safety); RME-01 pricing doc bug found (1000x) and fixed in Phase 11; no real-model run (no credentials). Phase 9 full battery at 9fdc0d0: npm test 325/326 pass (0 fail, 1 skipped), evals 463/463, validate PASS, check:registry PASS, check:security PASS (1,128 text + 4 binary, 0 findings), check:status 0 failures, check:links offline + online PASS (560 checked live, 45 skipped), check:upstream exit 0 (6 up-to-date, live 50 behind), registry regen zero diff, Semgrep 1.186.0 0 findings (68 rules, 43 files). Phase 11 synced README/CHANGELOG/SECURITY.md to the verified CI state and fixed RME-01 (d010069). Final verdict: READY FOR STAGING (see ai/audits/RELEASE-ACCEPTANCE.md) — remaining blockers are owner/re-merge gated: S-08 disposition acceptance, branch protection, release.yml first execution, scheduled-maintenance first execution (impossible before re-merge), real-model eval credentials.
