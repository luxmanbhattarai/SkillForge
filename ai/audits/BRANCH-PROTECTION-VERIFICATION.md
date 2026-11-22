# Branch Protection Verification — SkillForge `main`

- **Repo:** `luxmanbhattarai/SkillForge` (public)
- **Date verified:** 2026-11-22
- **Branch:** `main` @ `b86b469`
  (`b86b4696e518a87edded3f0f55ef0643fd08c3cd`)
- **Method:** read-only `gh api` calls only. **No setting was
  changed.** Every change in §6 requires explicit owner approval
  before execution.
- **Mission:** production-hardening, Group A Phase 2.
- **Supersedes:** `ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md`
  §1.2 ("Branch protection on `main`: Not enabled", verified
  2026-11-21). That finding is now historical; see the addendum
  appended to that document.

## 1. Verdict

Branch protection **is enabled** on `main`, via the **legacy
branch-protection API** (not a ruleset — no rulesets exist).
The core of the recommended configuration is in place: 10
required status checks, strict, with force pushes and deletions
blocked. Two recommended controls were **not** adopted —
requiring pull requests before merging, and requiring
conversation resolution — and admins (the owner) bypass the
rule entirely (`enforce_admins=false`). Those are owner
decisions, documented in §5; they mean the CI gate binds
nobody in practice today, since the owner pushes directly to
`main` and no PR is required.

## 2. Actual configuration (live, 2026-11-22)

Source: `GET /repos/luxmanbhattarai/SkillForge/branches/main/protection`
(full JSON in §7). `GET .../rulesets` returns `[]`.

| Setting | Value | Notes |
| --- | --- | --- |
| Protection mechanism | Legacy branch protection | No rulesets exist |
| Required status checks | **10 contexts, strict (`strict: true`)** | §3 — all 10 match real job names |
| Required pull request reviews | **NOT CONFIGURED** | No `required_pull_request_reviews` key in the response at all — pull requests are not required before merging |
| Required conversation resolution | **false** | `required_conversation_resolution.enabled: false` |
| Enforce admins | **false** | `enforce_admins.enabled: false` — admins bypass every rule below |
| Required linear history | false | Correct for this repo: merges use merge commits (PR #1, #5) |
| Allow force pushes | **false** (blocked) | `allow_force_pushes.enabled: false` |
| Allow deletions | **false** (blocked) | `allow_deletions.enabled: false` |
| Required signatures | false | Commit signing not required |
| Block creations | false | Branch creation not blocked |
| Lock branch | false | Branch is not read-only |
| Allow fork syncing | false | — |
| Push restrictions | none | No `restrictions` key — anyone with push access (currently just the owner) can push |
| Bypass actors | n/a (legacy API) | Bypass is via `enforce_admins=false` only; the legacy API has no bypass-actor list |

Required status-check contexts, exactly as configured:

1. `Validate (Node 24)`
2. `Registry`
3. `Behavioral evals`
4. `Windows (Node 24)`
5. `lint`
6. `security-audit`
7. `Semgrep (SAST)`
8. `Gitleaks`
9. `CodeQL`
10. `Analyze (javascript-typescript)`

## 3. Required checks vs actual workflow jobs (10/10 match)

Each required context was cross-checked against
`.github/workflows/*.yml` on `main` @ `b86b469`. All 10 match
a real job (or, for `CodeQL`, the workflow-level check run).

| Required context | Workflow file | Job id | Job display name / matrix |
| --- | --- | --- | --- |
| `Validate (Node 24)` | `validate-skills.yml` | `validate` | `Validate (Node ${{ matrix.node-version }})`, matrix `node-version: ["24"]` |
| `Registry` | `validate-skills.yml` | `registry` | `Registry` |
| `Behavioral evals` | `validate-skills.yml` | `evals` | `Behavioral evals` |
| `Windows (Node 24)` | `validate-skills.yml` | `windows` | `Windows (Node 24)` |
| `lint` | `lint.yml` | `lint` | (no display name — job id is the check name) |
| `security-audit` | `security-audit.yml` | `security-audit` | (no display name — job id is the check name) |
| `Semgrep (SAST)` | `security-audit.yml` | `semgrep` | `Semgrep (SAST)` |
| `Gitleaks` | `security-audit.yml` | `gitleaks` | `Gitleaks` (added in `b86b469`) |
| `CodeQL` | `codeql.yml` | — | Workflow-level check run (workflow `name: CodeQL`); see §4 |
| `Analyze (javascript-typescript)` | `codeql.yml` | `analyze` | `Analyze (${{ matrix.language }})`, matrix `language: [javascript-typescript]` |

No required context names a job that does not exist, and no
gating job is missing from the required list. (The
`scheduled-maintenance.yml` jobs — `Verify links online`,
`Detect stale skill verification`, `Monitor upstream sources`
— are schedule/dispatch-only and correctly not required: they
do not run on PRs.)

## 4. Evidence that each check reports

A required check that never reports blocks every merge. All 10
have reported at least once:

- **PR #5 head `b3dbfb6`:** 9/9 check-runs `success` —
  Validate (Node 24), Registry, Behavioral evals, Windows
  (Node 24), lint, security-audit, Semgrep (SAST), CodeQL,
  Analyze (javascript-typescript). (`GET
  .../commits/b3dbfb6.../check-runs`, `total_count: 9`.)
  Gitleaks did not exist yet (job added in `b86b469`).
- **`main` @ `b86b469`:** 9 required contexts report `success`
  — Validate (Node 24), Registry, Behavioral evals, Windows
  (Node 24), lint, security-audit, Semgrep (SAST), Gitleaks,
  Analyze (javascript-typescript). Gitleaks reported for the
  first time here (its job was added in this commit). Main CI
  runs: Validate skills 44969762985, Lint 44969763106,
  Security audit 44969763003, CodeQL 44969762981 — all
  `success`.
- **One reporting gap (informational):** the workflow-level
  `CodeQL` check reported on the PR #5 head but did **not**
  appear among the 12 check-runs on the push-to-`main` commit
  `b86b469`. It reports on pull-request commits, not on direct
  pushes to `main`. Consequence today: none — no PR is
  required, so nothing waits on it. Consequence if PRs become
  required: none either, since it does report on PR commits.
  Recorded here so the absence on `main` is not misread as a
  missing check.

## 5. Expected configuration vs actual, and the gaps

The recommended configuration is
`ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md` §2.2 (ruleset,
8 required checks, PR required with 0 approvals, conversation
resolution required, force pushes and deletions blocked, no
bypass actors). Actual differs in five ways:

| # | Recommended | Actual | Assessment |
| --- | --- | --- | --- |
| 1 | Ruleset ("Protect main") | Legacy branch protection; rulesets `[]` | Functionally equivalent for what is configured. The ruleset form matters only if the owner wants a PR requirement with 0 approvals — the legacy API cannot express that (it requires ≥1 approving review when PR reviews are enabled, which would block a solo maintainer from merging their own PRs). |
| 2 | 8 required checks | 10 required checks (the 8 + `Gitleaks` + workflow-level `CodeQL`) | Improvement on the recommendation: the new Gitleaks job is gated, and the CodeQL workflow check is required alongside its Analyze job (redundant but harmless — both report `success` on PRs). |
| 3 | Require a pull request before merging (0 approvals) | **Not enabled** | **Gap (owner decision).** Direct pushes to `main` still work and are the owner's normal flow (e.g. `b86b469` itself was a direct push). With no PR requirement, the required checks gate nothing in practice. |
| 4 | Require conversation resolution | **Not enabled** (`false`) | **Gap (owner decision).** Review threads can be merged over. Low impact in a single-maintainer repo with no required reviews. |
| 5 | No bypass actors; `enforce_admins: true` | `enforce_admins: false` | **Gap by design (owner decision).** The owner bypasses every rule, including the CI gate — this is what keeps direct pushes working. Enabling it would block the owner's own pushes until a PR + green CI exists. |

Additional observations (not gaps against the recommendation,
but recorded):

- **Required reviews are not enabled.** Consistent with a
  single-maintainer repo; the §2.2 recommendation was 0
  approvals with the PR itself as the control, so the missing
  piece is the PR requirement, not the review count.
- **No stale-approval dismissal** is configured — there are no
  approvals to dismiss, since reviews are not required.
- **Code-security items from §2.1 are still pending:**
  re-verified 2026-11-22, secret scanning validity checks and
  non-provider patterns are still `disabled`, and the API
  reports no `secret_scanning_generic_secrets` /
  `private_vulnerability_reporting` field. Secret scanning,
  push protection, and Dependabot security updates remain
  enabled. See §6.

## 6. Settings needing owner intervention

Nothing here was changed. Each item needs the owner's explicit
word; the recommended sequencing from §2.4 of the
recommendations document still applies (enable after the
re-merge — which has now happened).

1. **Require pull requests before merging (recommended).**
   Use a **ruleset**, not the legacy API, so the required
   approving-review count can be 0 (solo maintainer). Payload
   is in `GITHUB-SECURITY-RECOMMENDATIONS.md` §2.2; add
   `Gitleaks` and `CodeQL` to its 8 required checks to match
   the 10 now configured. Cost: every change to `main`,
   including one-line doc fixes, needs a branch + PR + CI run;
   direct `git push origin main` stops working.
2. **Require conversation resolution.** One ruleset rule
   (`required_review_thread_resolution: true`) or, in the
   legacy API, `required_conversation_resolution: true`.
   Only meaningful together with item 1.
3. **Decide on `enforce_admins`.** Keeping it `false` preserves
   the owner's direct-push flow and emergency bypass; setting
   it `true` makes the gate real but blocks the owner the same
   way it blocks everyone else. The current `false` is a
   deliberate owner decision, not an oversight — record it as
   such if it stands.
4. **Enable the §2.1 code-security items:** secret scanning
   validity checks, non-provider patterns, generic secrets (if
   the Settings UI shows it off), and private vulnerability
   reporting. Zero-cost, no workflow changes. API + UI paths
   are in `GITHUB-SECURITY-RECOMMENDATIONS.md` §2.1.
5. **No action needed:** force-push/deletion blocks,
   required-checks list, strict mode, and linear-history-off
   are all as recommended.

## 7. Verification evidence (read-only commands)

```bash
# Live protection config (full JSON; summarized in §2).
gh api repos/luxmanbhattarai/SkillForge/branches/main/protection
# → required_status_checks.strict: true, 10 contexts (listed in §2);
#   enforce_admins.enabled: false; required_linear_history.enabled: false;
#   allow_force_pushes.enabled: false; allow_deletions.enabled: false;
#   required_conversation_resolution.enabled: false;
#   required_signatures.enabled: false; block_creations.enabled: false;
#   lock_branch.enabled: false; allow_fork_syncing.enabled: false;
#   NO required_pull_request_reviews key; NO restrictions key.

# Rulesets: none.
gh api repos/luxmanbhattarai/SkillForge/rulesets   # → []

# Check-runs proving each context reports (§4).
gh api repos/luxmanbhattarai/SkillForge/commits/b3dbfb64c0f645ca47d5de48dc5fba3cb43dee13/check-runs --jq '.check_runs[] | [.name, .conclusion] | @tsv'
# → 9 check-runs, all success (incl. CodeQL; no Gitleaks yet).
gh api repos/luxmanbhattarai/SkillForge/commits/b86b4696e518a87edded3f0f55ef0643fd08c3cd/check-runs --jq '.check_runs[] | [.name, .conclusion] | @tsv'
# → 12 check-runs: 9 required contexts success (incl. Gitleaks, first
#   report) + 3 scheduled-maintenance jobs; no workflow-level CodeQL
#   check on this push-to-main commit (see §4).

# Code-security settings (§5).
gh api repos/luxmanbhattarai/SkillForge --jq '.security_and_analysis'
# → secret_scanning enabled, push protection enabled,
#   dependabot_security_updates enabled, validity checks disabled,
#   non-provider patterns disabled; no generic_secrets /
#   private_vulnerability_reporting field reported.

# Job-name cross-check (§3): grep of .github/workflows/*.yml on
# main @ b86b469 — job ids and display names listed in the table.
```
