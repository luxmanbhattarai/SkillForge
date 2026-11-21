# Production Acceptance Checklist — SkillForge Remediation

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade`
- **Head:** {{FINAL:HEAD}}
- **Rule:** every criterion carries its evidence (command + result).
  PASS means the evidence exists at the final HEAD. FAIL means the
  criterion is not met. OPEN means it cannot be satisfied from this
  environment (push / real Windows / credentials required) — the
  condition that would close it is named. Nothing is marked PASS on
  the basis of a claim alone.

## How to run the acceptance suite

```bash
npm test                  # unit suite (249 tests)
npm run validate          # skill validation (+ validate:strict)
npm run check:frontmatter # frontmatter for all 277 skills
npm run check:links       # internal links (offline)
npm run check:duplicates  # skill uniqueness
npm run check:sources     # skill provenance
npm run check:agents      # agent/workflow validation
npm run check:registry    # registry schema + semantics
npm run check:security    # security scan (29 patterns)
npm run check:upstream    # upstream drift (needs GitHub API)
npm run score             # quality scoring
npm run evals             # behavioral evaluation (463 cases)
npm run registry          # regenerate + diff (determinism)
npm run report            # report regeneration (228/228)
npm pack --dry-run        # package check
```

The final acceptance suite's coverage map (mission brief §11):

| Area | Covered by |
| --- | --- |
| Repository structure | `test/repository.test.mjs` (layout tripwire, category/registry agreement, registry totals vs disk, acceptance scripts) |
| Skill metadata | `npm run validate`, `check:frontmatter`, `test/validate.test.mjs` |
| Skill references | `npm run check:links` (internal), `check:sources`, `check:registry` (related/refs resolve) |
| Skill uniqueness | `npm run check:duplicates`, `test/validators.test.mjs` (negative fixture cases) |
| Agent metadata | `npm run check:agents`, `test/agents-workflows.test.mjs`, `test/repository.test.mjs` (agents.json vs disk) |
| Workflow metadata | `npm run check:agents`, `test/agents-workflows.test.mjs`, `test/repository.test.mjs` (workflows.json vs disk) |
| Installer integrity | `test/installer.test.mjs` (97 tests), `test/library.test.mjs`, `test/hashing.test.mjs`, `test/targets.test.mjs` |
| Manifest correctness | Installer tests (manifest corruption, repair, traversal, incremental writes) |
| Backup and restore | Installer tests (backup/restore, recovery from corrupt `backup.json`, traversal) |
| Security scanner | `npm run check:security`, `test/security.test.mjs` (23), `test/scanner.test.mjs` (10 integration) |
| Behavioral evaluation | `npm run evals` (463 cases), `test/evals.test.mjs` (35) |
| Dependency integrity | `test/repository.test.mjs` (zero deps, no lockfile, imports resolve to relative/`node:` only); supply-chain audit |
| Documentation links | `npm run check:links` (offline), `node scripts/check-links.mjs --online`, `test/links.test.mjs` (16) |
| Cross-platform | `test/paths.test.mjs` (5), installer path tests (spaces/Unicode/long paths), advisory Windows CI leg |

## Criteria

### Repository and content

| # | Criterion | Status | Evidence / command |
| --- | --- | --- | --- |
| R1 | 277 skills present, 18 categories, 24 agents, 16 workflows | PASS | `npm run query -- status`; disk counts (277 SKILL.md, 24 agents/*.md, 16 workflows/*.md, 18 skills/ dirs) |
| R2 | All skill frontmatter valid | PASS | `npm run check:frontmatter` — PASS (277 skills) |
| R3 | All skill references resolve (no missing files, no broken internal links) | PASS | `npm run check:links` (offline) — PASS (75 internal, 0 broken); `npm run check:sources` — PASS |
| R4 | No duplicate skills (names or near-duplicate descriptions) | PASS | `npm run check:duplicates` — PASS (277 skills); negative fixture tests in `test/validators.test.mjs` |
| R5 | Registry is deterministic and agrees with disk | PASS | `npm run registry` + diff — zero diff; `npm run check:registry` — PASS; `test/repository.test.mjs` (totals/names vs disk) |
| R6 | All 51 Phase 4 skills formally audited | PASS | `ai/audits/SKILL-AUDIT-MATRIX.md` — 51/51, 19 PASS, 32 FIXED, 60 findings (0/3/11/38/8), 54 fixed, 0 unresolved |
| R7 | Verification split is 254 / 17 / 6 / 0 (0 unverified) | PASS | `npm run query -- status` |
| R8 | 145 corrected skills regression-reviewed | PASS | `ai/remediation/stage-c/regression-145-review.md` — 5 findings, all fixed |
| R9 | No upstream skill content hand-edited | PASS | `git diff main...HEAD -- skills/upstream/` contains only the verbatim Vercel re-import (A-27), the marketingskills tools import (Phase 4, `caf1f32`), and project-maintained ATTRIBUTION.md additions (A-32, policy clarified in `sources/imported-skills.md`) |

### Installer

| # | Criterion | Status | Evidence / command |
| --- | --- | --- | --- |
| I1 | Fresh install, reinstall, selective/category/user/project installs work | PASS | `test/installer.test.mjs` (97 tests incl. these scenarios) |
| I2 | User-modified files are refused/prompted, never silently overwritten | PASS | Hash-conflict tests; A-07 diverged-link conflict test |
| I3 | Manifest entries validated on read; traversal refused (fail-closed) | PASS | A-02/A-03 CLI tests with sentinels outside the install root; tier-2 residual recorded as a known limitation |
| I4 | Backups before replacement; restore recovers content | PASS | Backup/restore tests incl. corrupt-`backup.json` recovery (A-16) |
| I5 | Rollback is guarded; pre-swap verification prevents bad content going live | PASS | A-05 fault-injection tests; A-06 `verifyStaged` unit tests (post-swap branch unit-level only — CLI-unreachable, recorded) |
| I6 | Dry-run changes nothing (including with a corrupt manifest) | PASS | A-08 test; Stage C dry-run tests for update/uninstall/restore (byte-identical state asserted) |
| I7 | Concurrent installs are serialized (lockfile) | PASS | A-04 tests (concurrent installs; lock-state matrix) |
| I8 | Paths with spaces / Unicode / >260 chars work | PARTIAL | A-29 CLI tests (POSIX); Windows long-path behavior Blocked (L-Win) |
| I9 | Windows `--link` degrades to a junction on EPERM (no privilege needed) | PARTIAL | Implemented + 17 fault-injection/simulated tests; **real Windows execution Blocked** — see the first-real-Windows-run checklist (`ai/remediation/stage-d/windows-link-analysis.md` §9) |

### Security

| # | Criterion | Status | Evidence / command |
| --- | --- | --- | --- |
| S1 | Security scan passes with no findings (29 patterns, text + binary) | PASS | `npm run check:security` — PASS (1,078 text + 4 binary) |
| S2 | Scanner exceptions are narrow (per-file + per-pattern, with reasons) and cannot hide genuine findings | PASS | `scripts/security-scan.mjs` EXCEPTIONS map; matcher hardened (Stage B, S-11); `test/scanner.test.mjs` (10 integration tests) |
| S3 | Pattern counts pinned by tests | PASS | `test/security.test.mjs` — 34 total, 29 scan, 11 score, 9 input (A-20) |
| S4 | No live credentials in tree or history | PASS | History sweep (Stage B) + Gitleaks 8.30.1 (0 real) + TruffleHog 3.100.0 (0 verified) + Semgrep 1.186.0 (0 findings) |
| S5 | S-01–S-06, S-15 fixed and re-verified | PASS | `ai/audits/SECURITY-STATUS.md` |
| S6 | S-07, S-10, S-12, S-13 accepted with documented rationale | PASS | `ai/audits/SECURITY-STATUS.md` |
| S7 | S-08, S-09, S-11 mitigated (docs + warnings); upstream still open | MITIGATED | `docs/AGENTIC-SEO-SAFE-INSTALL.md` + install/doctor warnings; upstream follow-up owed — NOT marked fixed |
| S8 | S-14 monitored; drift-check gap documented | OPEN (MONITOR) | Fork re-verified (author 50 commits ahead); weekly drift check watches the dormant fork — re-point decision at next re-import |
| S9 | CodeQL runs on the codebase | OPEN | Blocked locally (bundle size + DB build); `codeql.yml` exists but has never run on GitHub (L-CI) |
| S10 | Supply chain verified (zero deps, pinned actions, hashed binaries, licenses) | PASS | `ai/remediation/stage-d/supply-chain-audit.md`; `npm run check:upstream` — 6/0/0 (Stage E) |

### Evaluation and quality

| # | Criterion | Status | Evidence / command |
| --- | --- | --- | --- |
| Q1 | 463 eval cases, all passing, 277/277 skills covered, 0 regressions | PASS | `npm run evals` |
| Q2 | Coverage metric counts only actually-selected skills | PASS | A-17 fix (Stage C); full run still 277/277 from real selection |
| Q3 | Eval reports are not clobbered by `npm test` | PASS | A-10 fix (`--out` flag; smoke test asserts byte-identical report) |
| Q4 | Real-model evaluation layer exists (env config, no hardcoded keys, timeouts/retries, cost tracking, mock/model separation) | PASS | `evals/runners/providers.mjs` + 75-case subset + `docs/REAL-MODEL-EVALUATION.md`; unit-tested against a local stub |
| Q5 | A real-model eval run has been executed | OPEN | No credentials; must not be claimed until run (L-Model) |
| Q6 | Quality score mean ≥ 80/100, 0 CRITICAL | PASS | `npm run score` — mean 87/100, 0 CRITICAL |
| Q7 | Unit tests: printed count equals real count | PASS | A-18 fix (`test-support/helpers.mjs`); `npm test` — 249 pass |

### Documentation and links

| # | Criterion | Status | Evidence / command |
| --- | --- | --- | --- |
| D1 | Offline link check passes (internal links) | PASS | `npm run check:links` — PASS (75 internal, 0 broken) |
| D2 | Online link check passes; checked-live vs skipped reported separately | PASS | `node scripts/check-links.mjs --online` — PASS (confirming run) — 604 enumerated, 559 checked live, 45 skipped, 0 errors; run 1 had 1 transient Discord-docs timeout (verified real by an independent fetch) (A-24 fix) |
| D3 | Living docs state current counts (split, cases, tests) | PASS | README, `docs/ARCHITECTURE.md`, `docs/UPGRADE.md` updated (Stage C); `ai/phase10/NOTES.md` check names corrected (Stage D) |
| D4 | Implementation report reconciled via dated addendum (no silent rewrite) | PASS | Addendum appended to `ai/reports/FINAL-IMPLEMENTATION-REPORT.md` (Stage E) |
| D5 | PDF decision recorded (Markdown is the source of truth) | PASS | A-35; `ai/reports/FINAL-REMEDIATION-REPORT.md` §9 |

### CI/CD and platform

| # | Criterion | Status | Evidence / command |
| --- | --- | --- | --- |
| C1 | All 6 workflows + dependabot validate locally (YAML, pins, permissions, script refs, concurrency) | PASS | Stage D validation — 123 checks, 0 fail; SHAs re-verified via `git ls-remote` |
| C2 | Least-privilege permissions; no `pull_request_target`; no `contents: write` | PASS | Stage D validation (see C1) |
| C3 | Node 18/20/22 matrix legs exercised | PARTIAL | Node 18.20.8 + 22.23.5 exercised locally (196/196 each, Stage D); CI matrix legs need their first remote run (L-CI) |
| C4 | A workflow has run on GitHub | OPEN | No workflow has ever run on GitHub (L-CI); first push/PR is the real test |
| C5 | Windows CI leg exists (advisory) and the suite is Windows-ready by static inspection + simulation | PARTIAL | Advisory `windows` job added (`continue-on-error`); W-1/W-2/W-3 fixed; promotion needs a green real PR run |
| C6 | Branch protection configured with the correct check names | OPEN | Manual repo setting (post-merge); correct names in `ai/phase10/NOTES.md` |
| C7 | Secret scanning + Dependabot alerts enabled | OPEN | Manual repo settings (post-merge); do NOT enable CodeQL default setup |

### Post-merge checklist (manual, not verifiable from here)

- [ ] Open the PR from `feat/skillforge-production-upgrade`; watch the
      first runs of all 6 workflows + the advisory Windows leg.
- [ ] Enable secret scanning, Dependabot alerts, and branch protection
      on `main` (required checks per `ai/phase10/NOTES.md`).
- [ ] Do NOT enable CodeQL default setup (conflicts with `codeql.yml`).
- [ ] Promote the Windows leg to gating only after it is green on a
      real PR (remove `continue-on-error`, add `Windows (Node 20)` to
      required checks).
- [ ] Run the first-real-Windows-run checklist
      (`ai/remediation/stage-d/windows-link-analysis.md` §9).
- [ ] Raise S-08/S-09 with the agentic-seo author; raise S-11 with
      Prisma; re-verify the agentic-seo source (S-14) at the next
      re-import.
- [ ] Run the 75-case real-model eval subset when credentials are
      available (`docs/REAL-MODEL-EVALUATION.md`).
- [ ] Re-verify Prisma 8 skills when Prisma 8 reaches GA.
- [ ] Keep the weekly scheduled maintenance green (online links, stale
      verification, upstream monitoring).
