# GitHub Security Recommendations — SkillForge

**Repo:** `luxmanbhattarai/SkillForge` (public)
**Date verified:** 2026-11-21
**Branch:** `feat/skillforge-production-upgrade` @ `be03f2c`
**Scope:** Phase 4 (security settings inspection + recommendations) and
Phase 10 (main-branch reconciliation plan) of the Final Staging
Validation mission.
**Status:** INSPECTION + DOCUMENTATION ONLY. No setting was changed, no PR
was closed or merged, nothing was pushed to `main`. Every change in this
document requires explicit owner approval before execution.

---

## 1. Current state (verified via API, 2026-11-21)

All values below were read with GET-only `gh api` calls on 2026-11-21.
Nothing in this section is carried over from prior reports without
re-verification.

### 1.1 Code security (`security_and_analysis`)

Source: `GET /repos/luxmanbhattarai/SkillForge` → `security_and_analysis`
block. Note: the dedicated endpoint
`GET /repos/{owner}/{repo}/security-and-analysis` returned HTTP 404 on
2026-11-21 (unexpected; the same data is embedded in the repo object, so
the values below are authoritative regardless).

| Setting | Status | Notes |
|---|---|---|
| Secret scanning | **enabled** | |
| Secret scanning push protection | **enabled** | Blocks pushes containing known secret formats |
| Dependabot security updates | **enabled** | Implies Dependabot alerts are on (security updates require alerts) |
| Secret scanning validity checks | **disabled** | ⚠️ Recommended: enable (§2.1) |
| Secret scanning non-provider patterns | **disabled** | ⚠️ Recommended: enable (§2.1) |
| Secret scanning generic secrets | **not reported** | The API response carries no `secret_scanning_generic_secrets` field; verify in the Settings UI and enable if off (§2.1) |
| Private vulnerability reporting | **not enabled** (`null`) | ⚠️ Recommended: enable (§2.1) |

### 1.2 Branch protection on `main`

**Not enabled.** `GET /repos/luxmanbhattarai/SkillForge/branches/main/protection`
returns HTTP 404 `Branch not protected` (verified 2026-11-21).

No rulesets exist either: `GET /repos/luxmanbhattarai/SkillForge/rulesets`
returns `[]`.

Consequences today: anyone with push access (currently just the owner)
can push directly to `main`, force-push, and delete the branch. There is
no required CI gate on merges.

### 1.3 Code scanning

- CodeQL **advanced setup** via `.github/workflows/codeql.yml` (pinned
  action SHAs, weekly schedule). This is the intended configuration —
  see `ai/decisions/2026-11-20-codeql-advanced-setup.md`.
- CodeQL **default setup is NOT configured** (`state: "not-configured"`).
  Correct: do not enable it; default setup and the workflow conflict.
- Open code-scanning alerts: **0** (all 5 earlier alerts triaged and
  dismissed).
- Open secret-scanning alerts: **0**. Open Dependabot alerts: **0**.

### 1.4 Merge settings

From `GET /repos/luxmanbhattarai/SkillForge`:

| Setting | Value |
|---|---|
| `allow_merge_commit` | true |
| `allow_squash_merge` | true |
| `allow_rebase_merge` | true |
| `allow_auto_merge` | false |
| `delete_branch_on_merge` | false |
| `allow_update_branch` | false |
| `web_commit_signoff_required` | false |

No change recommended to merge methods: PR #1 was merged with a merge
commit, and the reconciliation plan (§5) keeps that convention.

### 1.5 Action pinning (repo convention, not a GitHub setting)

- Prior reports mention "`sha_pinning_required` is false". There is **no
  such field** in the repo REST API response; it is not a verifiable
  GitHub setting for this repo (it may refer to a code-security
  configuration concept). What is verifiable is the repo's own
  convention: **all 24 `uses:` entries in the branch's 6 workflow files
  are pinned to full 40-hex commit SHAs** (12× `actions/checkout`, 10×
  `actions/setup-node`, 2× `github/codeql-action`), verified by grep on
  2026-11-21. `main` still uses unpinned `v4` tags — fixed by the
  re-merge (§5).
- There is no GitHub setting that enforces SHA pinning; the enforcement
  is the repo's own CI/YAML review. Dependabot (`github-actions`
  ecosystem, weekly) keeps the pins current — see §3.

### 1.6 Plan availability

This is a **public** repository. On public repos, GitHub provides the
full code-security feature set free of charge, including everything
recommended in §2: secret scanning (with push protection, validity
checks, non-provider patterns, generic secrets), Dependabot alerts and
security updates, CodeQL code scanning, branch protection, and rulesets.
**No recommended setting requires GitHub Advanced Security, GitHub Team,
or any paid plan.** (The paid-plan gate applies to private repos only.)

---

## 2. Recommended configuration

### 2.1 Code security — enable the three disabled items

These are low-risk, zero-cost, and do not change any workflow:

1. **Secret scanning validity checks** — tells the owner whether a
   detected secret is still live, so triage is fast instead of
   guesswork.
2. **Secret scanning non-provider patterns** — catches secrets that do
   not match a known provider format (generic high-entropy strings,
   private keys, etc.).
3. **Secret scanning generic secrets** — same family as (2); enable if
   the UI shows it off (the API did not report its state).
4. **Private vulnerability reporting** — lets security researchers
   report vulnerabilities privately instead of filing public issues.
   Appropriate for a public library other people will install.

API (owner runs; PATCH is a settings change — owner approval required):

```bash
gh api repos/luxmanbhattarai/SkillForge -X PATCH \
  -f 'security_and_analysis[secret_scanning]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection]=enabled' \
  -f 'security_and_analysis[secret_scanning_validity_checks]=enabled' \
  -f 'security_and_analysis[secret_scanning_non_provider_patterns]=enabled' \
  -f 'security_and_analysis[secret_scanning_generic_secrets]=enabled' \
  -f 'security_and_analysis[private_vulnerability_reporting]=enabled' \
  -f 'security_and_analysis[dependabot_security_updates]=enabled'
```

UI path: repo → Settings → Code security → enable each item under
"Secret scanning" and "Private vulnerability reporting". Verify after:
`gh api repos/luxmanbhattarai/SkillForge --jq '.security_and_analysis'`.

Do NOT enable CodeQL default setup (see §1.3).

### 2.2 Branch protection on `main` — recommended, owner decision

Recommended rule for `main` (modern path: a **ruleset**, which is what
GitHub now recommends over legacy branch protection; legacy payload in
§2.3):

- Require a pull request before merging (0 required approvals — solo
  maintainer; the PR itself is the control, and required CI is the
  gate).
- Require status checks to pass, **strict** (branch must be up to date
  before merging). Exact check names, verified against the check runs
  on PR #4 head `be03f2c` on 2026-11-21 — all 9 reported `success`:
  - `Validate (Node 24)`
  - `Registry`
  - `Behavioral evals`
  - `lint`
  - `security-audit`
  - `Windows (Node 24)`
  - `Semgrep (SAST)`
  - `Analyze (javascript-typescript)` (CodeQL job)
  - (`CodeQL` also exists as a workflow-level check run; it is
    redundant with `Analyze (javascript-typescript)` — do not require
    both.)
- Require conversation resolution before merging.
- Block force pushes and branch deletion.
- No bypass actors in the default recommendation (see tradeoff §2.4).

All eight required checks have reported at least once (PR #4, run set
44946198036/44946197878/44946197886/44946197946, all green), including
`Semgrep (SAST)`, so requiring them will not block merges on a
never-reported check. (An earlier note in `ai/phase10/NOTES.md` warned
not to require Semgrep until it had run — that condition is now met.)

Ruleset API (owner runs; settings change — owner approval required):

```bash
gh api repos/luxmanbhattarai/SkillForge/rulesets -X POST --input - <<'EOF'
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
    } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "Validate (Node 24)" },
          { "context": "Registry" },
          { "context": "Behavioral evals" },
          { "context": "lint" },
          { "context": "security-audit" },
          { "context": "Windows (Node 24)" },
          { "context": "Semgrep (SAST)" },
          { "context": "Analyze (javascript-typescript)" }
        ]
    } }
  ]
}
EOF
```

UI path: repo → Settings → Rules → Rulesets → New ruleset → target
`main`, add the rules above. Verify after:
`gh api repos/luxmanbhattarai/SkillForge/rulesets`.

Do NOT add `required_linear_history`: the repo merges with merge
commits (PR #1, and the reconciliation plan in §5).

### 2.3 Legacy branch-protection equivalent

If the owner prefers the classic branch-protection API instead of a
ruleset, the equivalent payload is:

```bash
gh api repos/luxmanbhattarai/SkillForge/branches/main/protection -X PUT --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Validate (Node 24)", "Registry", "Behavioral evals", "lint",
      "security-audit", "Windows (Node 24)", "Semgrep (SAST)",
      "Analyze (javascript-typescript)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "block_creations": false
}
EOF
```

Note: the legacy API requires at least 1 approving review when
`required_pull_request_reviews` is set, which for a solo maintainer
means the owner cannot merge their own PRs without a second reviewer
(unless `enforce_admins` is false, which then lets admins bypass
everything, including the CI gate). The ruleset in §2.2 is the better
fit for this repo because it allows 0 required approvals. Prefer §2.2.

### 2.4 The branch-protection tradeoff (owner decision)

The user previously declined branch protection because it blocks direct
pushes to `main`, and the owner does push directly to `main`
(e.g. `454172e`, `5d36d02`, and the revert `06100e3` were all direct
pushes). That is a real cost, and it is the owner's call. The honest
tradeoff:

**What protection buys:**
- No more accidental direct pushes to `main` — every change goes
  through a PR with 8 green checks. The 2026-11-21 merge/revert cycle
  (PR #1 merged, then reverted ~2 minutes later) is exactly the kind
  of incident a PR + CI gate makes less likely.
- No force-push or branch-deletion accidents on `main`.
- Required conversation resolution keeps review threads from being
  merged over.

**What it costs:**
- Every change to `main`, including one-line doc fixes, needs a branch
  + PR + CI run (~minutes). Direct `git push origin main` stops
  working.
- With `enforce_admins: true` (recommended), the owner cannot bypass
  their own rule in an emergency without first disabling the ruleset.

**Middle-ground options if full protection is too much:**
1. Ruleset with the owner as a **bypass actor** (bypass mode
   `pull_request`): CI still runs and is visible, but the owner can
   merge without waiting. Protection then guards against accidents by
   others, not against the owner.
2. Protect `main` but keep a documented break-glass procedure: disable
   the ruleset, push, re-enable — with the disable/re-enable visible
   in the repo audit log.
3. Defer protection until after the re-merge (§5) is done, so the
   reconciliation itself is not fighting the new rule. (Recommended
   sequencing regardless: enable protection *after* the fresh PR
   merges.)

**Recommendation:** enable the §2.2 ruleset after the §5 re-merge, with
no bypass actors. Revisit if it slows the owner down in practice —
disabling a ruleset is one click and is itself auditable.

---

## 3. Dependabot PRs #2 and #3 — disposition

### 3.1 What they are (verified 2026-11-21)

| | PR #2 | PR #3 |
|---|---|---|
| Title | Bump actions/setup-node from 5.0.0 to 7.1.0 | Bump actions/checkout from 5.1.0 to 7.0.1 |
| Created | 2026-11-21T18:08:57Z | 2026-11-21T18:09:05Z |
| State | open, not merged | open, not merged |
| Mergeable | **false** (`mergeable_state: dirty` — conflicted) | **false** (`mergeable_state: dirty` — conflicted) |
| Head branch | `dependabot/github_actions/actions/setup-node-7.1.0` @ `5401dfd` | `dependabot/github_actions/actions/checkout-7.0.1` @ `f7c052b` |
| Files | 5 workflow files | 6 workflow files |
| Change | `setup-node@a0853c24…` (# v5) → `setup-node@949feb24…` (# v7.1.0) | `checkout@fbc6f399…` (# v5) → `checkout@3d3c42e5…` (# v7.0.1) |

### 3.2 Are the upgrades still relevant?

**Yes — the target versions are the current latest releases:**
- `actions/checkout` latest release: **v7.0.1** (published 2026-07-20).
- `actions/setup-node` latest release: **v7.1.0** (published 2026-10-08).
- The proposed SHAs match the tags exactly (`git ls-remote`):
  `v7.0.1` = `3d3c42e5aac5ba805825da76410c181273ba90b1`,
  `v7.1.0` = `949feb2413d6458794dcd2491c4babbbce0c15c1`.
- The branch's workflows still pin the v5 SHAs these PRs bump from
  (`checkout@fbc6f399…`, `setup-node@a0853c24…`), so after the re-merge
  the same bump is still needed. The v5→v7 jump is a major-version
  upgrade (both actions moved to Node 24-based runners in v6/v7); CI
  must run on the bumped PRs before merging, which is automatic once
  they are rebased onto post-re-merge `main`.

### 3.3 Why they are conflicted

Both PRs were raised at 18:08–18:09Z on 2026-11-21, in the ~2-minute
window when `main` contained the merged upgrade (merge `de6023d`).
Their base therefore had the v5 SHA-pinned workflows. The revert
`06100e3` (~2 minutes later) restored `main` to the pre-merge state,
whose workflows use unpinned `v4` tags — so the v5→v7 patches no longer
apply. Two compounding facts:

1. The PRs cannot be merged as-is (`mergeable: false`); merging them
   against current `main` would also be wrong — it would put v7 pins
   on the obsolete v4-era workflow files.
2. **Dependabot version updates are currently unconfigured on the
   default branch**: `.github/dependabot.yml` was added by the upgrade
   and removed by the revert, so `main` has no `dependabot.yml` today
   (verified: `git cat-file -e origin/main:.github/dependabot.yml`
   fails). That is why Dependabot has not auto-rebased these PRs.
   The file returns with the re-merge, and weekly scans resume.

### 3.4 Verdict: leave open; recreate after the re-merge

**Do NOT merge #2/#3 now** (impossible — conflicted — and wrong base).
**Do NOT close them and assume Dependabot will re-raise them**: per
GitHub's docs, closing a Dependabot PR (manually or via
`@dependabot close`) *prevents Dependabot from recreating that PR*.
The reliable path:

1. Leave #2 and #3 open through the re-merge (§5).
2. After the fresh PR merges (so `main` again has the v5 SHA-pinned
   workflows these PRs were built against), comment on each PR:
   `@dependabot recreate`
   This regenerates the PR against the new `main`. (`@dependabot rebase`
   is the lighter alternative; `recreate` is more robust because the
   workflow files changed between `de6023d` and the branch head — e.g.
   the Semgrep job added to `security-audit.yml` — so a plain rebase
   may conflict.)
3. Wait for CI on each recreated PR (all 8 required checks), review the
   diff (it should be SHA-only changes), then merge.
4. If the owner prefers a clean slate and closes them anyway, the
   recovery is to comment `@dependabot reopen` on each closed PR after
   the re-merge, then `@dependabot recreate`.

No action on #2/#3 was taken in this phase.

---

## 4. Other observations

- **Draft PR #4** (`[DRAFT] CI validation only`, head
  `feat/skillforge-production-upgrade` → `main`) is open and
  `mergeable_state: clean`. It must never merge. It also blocks the
  reconciliation: GitHub allows only **one open PR per head branch**,
  so the fresh PR in §5 cannot be created while #4 is open — #4 must
  be closed (or repurposed) first. See §5 step 4.
- **PR #1** is `merged: true`, `state: closed`. GitHub treats it as
  merged; it cannot be reopened, which is why the reconciliation needs
  a fresh PR (§5).
- **Dependabot PR limit note:** none — 2 open version-update PRs is
  well under the default limit of 5.
- **No secrets in scope:** the repo has zero dependencies, no lockfile,
  and no workflow uses any secret; the only token referenced is the
  default `GITHUB_TOKEN` (scoped `contents: read`).

---

## 5. Phase 10 — main-branch reconciliation plan (PLAN ONLY)

**Nothing in this section has been executed.** It requires explicit
owner approval before any step runs. All numbers were computed on
2026-11-21 at branch head `be03f2c`; **re-verify the head SHA and the
diff numbers at execution time** — other workers are still committing
to the branch.

### 5.1 Verified starting state

| Fact | Verified value |
|---|---|
| `main` head | `06100e3` — `Revert "Merge pull request #1 …"` |
| Revert's parent | `de6023d` — the PR #1 merge commit (2026-11-21 18:08:10Z) |
| Revert's tree | **Byte-identical to `5d36d02`** (pre-merge `main`): `git rev-parse 06100e3^{tree}` == `git rev-parse 5d36d02^{tree}` |
| Revert size | **479 files changed, +1,236 / −90,456** (note: an earlier "432-file" figure is wrong; the verified count is 479) |
| Merge-base(`main`, branch) | `06100e3` itself — `main` is a full ancestor of the branch |
| `-s ours` merge `d1e925e` | Parents `df1b1ad` + `06100e3`; tree **identical to first parent** `df1b1ad` (verified) — the merge imported `main`'s history without changing the branch tree |
| Branch head | `be03f2c` (origin and local agree; tree clean) |

### 5.2 Revert-of-revert simulation (disposable worktree, discarded)

`git revert --no-commit 06100e3` was run in a temporary worktree off
`origin/main` (no repo state changed; worktree removed afterwards):

- **Result: applies cleanly, 0 conflicts.**
- Resulting tree is **identical to `de6023d`'s tree** — reverting the
  revert restores exactly the merged state, nothing more, nothing less.

### 5.3 Exact diff the fresh PR will show

After the revert-of-revert lands on `main`, the merge-base of the new
`main` and the branch is still `06100e3` (the revert-of-revert is on
the base side), so the fresh PR's three-dot diff is
`06100e3...be03f2c`:

| Diff | Files | Insertions | Deletions |
|---|---|---|---|
| **Fresh PR diff** (`06100e3...be03f2c`) | **496** | **+96,782** | **−1,338** |
| Reverted content reintroduced (`de6023d...06100e3` reversed) | 479 | +90,456 | −1,236 |
| Incremental content since the merge (`de6023d...be03f2c`) | 69 | +6,724 | −500 |

Composition of the 496-file PR diff: **287 added, 208 modified,
1 deleted**. The single deletion is `.claude/settings.json`, which the
revert restored to `main` and which does not exist on the branch —
expected, not unwanted. Changed files by area: `skills/` 215, `ai/` 110,
`scripts/` 43, `evals/` 32, `agents/` 21, `test/` 18, `docs/` 13,
`workflows/` 11, `.github/` 8, `registry/` 7, `sources/` 4, plus root
docs and `package.json`. The 69-file incremental delta is confined to
`ai/`, `.github/workflows/`, `scripts/`, `evals/`, `test/`, and
`sources/` — the post-merge audit-fix and Phase G work.

**Yes, the reverted 479 files are reintroduced** — that is the point of
reverting the revert. **No unwanted changes are included**: the diff
contains only the production-upgrade tree plus the post-merge fixes.
The untracked local `evals/` directory is in no commit and cannot leak
into the PR. No secrets, `.env` files, or credentials appear in the
diff (the security scan at `be03f2c` is clean: 0 findings).

### 5.4 Exact command sequence

Prerequisites: owner approval; `gh` authenticated as
`luxmanbhattarai`; work in `~/workspace/SkillForge-upgrade` (or a fresh
clone). Re-verify the branch head before starting — if it moved past
`be03f2c`, recompute the §5.3 numbers.

**Step 0 — Approval gate (no commands).**
Owner explicitly approves the reconciliation. Without that, stop here.

**Step 1 — Verify starting state.**
```bash
cd ~/workspace/SkillForge-upgrade
git fetch origin
git rev-parse origin/main   # expect 06100e37444969a1a4ab35fbee2f4540ad7db09e
git rev-parse origin/feat/skillforge-production-upgrade  # expect be03f2c… (or newer; recompute §5.3)
git status                  # expect clean
```
Expected: SHAs match (or the branch head is newer and noted).
Abort/rollback: no changes made yet; just stop.

**Step 2 — Revert the revert on `main` and push.**
```bash
git checkout main
git pull --ff-only origin main
git revert --no-edit 06100e3
git rev-parse HEAD^{tree}   # expect == de6023d tree: verify with
git rev-parse de6023d^{tree} # the two hashes must match
git push origin main
```
Expected: one new commit on `main`; its tree is identical to
`de6023d`'s tree; `git log --oneline -2 origin/main` shows the
revert-of-revert on top of `06100e3`.
Abort (before push): `git revert --abort`, then `git checkout
feat/skillforge-production-upgrade` — nothing has left the machine.
Rollback (after push): `git revert --no-edit HEAD && git push origin
main` (forward revert; do NOT force-push `main`).

**Step 3 — Verify CI on the revert-of-revert commit.**
```bash
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status   # for the validate/lint/security runs
```
Expected: push-to-`main` workflows (validate, lint, security-audit,
CodeQL) run and pass on the new commit. `scheduled-maintenance` and
`release` do not trigger on push and are not expected here.
Abort/rollback: if CI fails, investigate before proceeding; rollback
is the Step 2 forward revert.

**Step 4 — Close draft PR #4 (required before a fresh PR can exist).**
GitHub allows only one open PR per head branch. PR #4 uses head
`feat/skillforge-production-upgrade` → `main`, so `gh pr create` with
the same head will fail while #4 is open.
```bash
gh pr close 4 --comment "Closing: CI validation served its purpose (all checks green on be03f2c). Reconciliation proceeds via a fresh PR; see the Phase 10 plan in ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md."
```
Expected: PR #4 `state: closed`, `merged: false`.
Abort/rollback: none needed — closing a draft PR is reversible
(`gh pr reopen 4`), and it changes no code. Alternative: instead of
closing #4, mark it ready for review and use it as the real PR — but
that reuses the "DO NOT MERGE" framing and history; a fresh PR is
cleaner.

**Step 5 — Open the fresh PR.**
```bash
git checkout feat/skillforge-production-upgrade
git pull --ff-only origin feat/skillforge-production-upgrade
gh pr create --base main --head feat/skillforge-production-upgrade \
  --title "SkillForge production upgrade: 12-phase overhaul + final readiness remediation (re-merge)" \
  --body "Re-merges the production upgrade after PR #1 was reverted (06100e3). The revert-of-revert restored main to the merged tree; this PR adds the post-merge audit fixes and Phase G work. Diff vs merge-base: 496 files, +96,782/−1,338 (recompute if the branch head moved). Closes the work tracked in ai/PROJECT-STATUS.json."
```
Expected: new PR number; `gh pr view <n> --json mergeable,mergeable_state`
shows `mergeable: true`, `mergeable_state: clean`; the PR diff shows
496 files, +96,782/−1,338 (or the recomputed numbers).
Abort/rollback: close the PR (`gh pr close <n>`); nothing has merged.

**Step 6 — Validate the fresh PR.**
```bash
gh pr checks <n> --watch   # wait for all checks
gh pr diff <n> --name-only | wc -l   # expect 496 (or recomputed count)
```
Expected: all 9 checks green (`Validate (Node 24)`, `Registry`,
`Behavioral evals`, `lint`, `security-audit`, `Windows (Node 24)`,
`Semgrep (SAST)`, `Analyze (javascript-typescript)`, `CodeQL`).
Abort/rollback: fix on the branch and push; or close the PR.

**Step 7 — Merge (owner action).**
```bash
gh pr merge <n> --merge   # merge commit, matching PR #1's convention
```
Expected: merge commit on `main`; `main` tree == branch head tree
(verify: `git rev-parse origin/main^{tree}` ==
`git rev-parse origin/feat/skillforge-production-upgrade^{tree}`).
Post-merge CI on `main` runs and passes.
Abort/rollback: before merging, close the PR. After merging, the
rollback is a revert of the merge commit (same pattern as `06100e3`).

**Step 8 — Dependabot PRs #2 and #3.**
```bash
gh pr comment 2 --body "@dependabot recreate"
gh pr comment 3 --body "@dependabot recreate"
# wait for Dependabot to regenerate both against the new main, then:
gh pr checks 2 --watch; gh pr checks 3 --watch
gh pr merge 2 --squash   # after review + green CI
gh pr merge 3 --squash
```
Expected: both PRs regenerate cleanly (the v5 SHA pins they bump from
are back on `main`), CI passes, and the v7 bumps land. If `recreate`
fails, fall back to closing #2/#3 and bumping the two SHAs manually
in a small PR (SHAs verified in §3.2).
Abort/rollback: leave #2/#3 open and unmerged — they are version bumps,
not blockers; revert a bad merge with `gh pr revert` if needed.

**Step 9 — Finish.**
- Confirm `main` CI is green post-merge.
- Confirm `ai/PROJECT-STATUS.json` reflects the merged state.
- Decide on branch protection (§2.2) — recommended now that the
  re-merge is done.
- Do NOT delete `feat/skillforge-production-upgrade` until the owner
  confirms the merged state (the branch is the fallback).

### 5.5 What this plan deliberately does not do

- No force-push anywhere; no rebase of the branch (its history
  includes the `-s ours` merge `d1e925e` and must be preserved).
- No merge of draft PR #4.
- No changes to repo settings (those are §2, separate owner decision).
- No release/tag creation (`release.yml` has still never run; the
  first version tag after the re-merge is a separate owner decision).

---

## Appendix: verification commands used (read-only)

```bash
gh api repos/luxmanbhattarai/SkillForge --jq '.security_and_analysis'
gh api repos/luxmanbhattarai/SkillForge/branches/main/protection   # 404 = not protected
gh api repos/luxmanbhattarai/SkillForge/rulesets                    # []
gh api repos/luxmanbhattarai/SkillForge/code-scanning/default-setup # not-configured
gh api "repos/luxmanbhattarai/SkillForge/code-scanning/alerts?state=open" --jq 'length'   # 0
gh api "repos/luxmanbhattarai/SkillForge/secret-scanning/alerts?state=open" --jq 'length' # 0
gh api "repos/luxmanbhattarai/SkillForge/dependabot/alerts?state=open" --jq 'length'      # 0
gh api repos/luxmanbhattarai/SkillForge/pulls/2 --jq '{mergeable, mergeable_state}'
gh api repos/luxmanbhattarai/SkillForge/pulls/3 --jq '{mergeable, mergeable_state}'
gh api repos/luxmanbhattarai/SkillForge/commits/be03f2c/check-runs --jq '.check_runs[] | .name'
git merge-base origin/main be03f2c                      # 06100e3
git diff --shortstat 06100e3 be03f2c                    # 496 files, +96782/−1338
git diff --shortstat de6023d be03f2c                    # 69 files, +6724/−500
git show --shortstat 06100e3                            # 479 files, +1236/−90456
```

---

## Addendum — canonical main reconciliation (2026-11-22)

This document is a **historical record** of the Phase 4 / Phase 10
inspection on branch `feat/skillforge-production-upgrade`
(@ `be03f2c`). Nothing above this addendum has been rewritten:
§1 describes the repo settings as verified on 2026-11-21, §5 is
the re-merge plan as written before execution. What follows
records what has changed since, so the document is not mistaken
for a statement about current `main`.

### Canonical state (verified 2026-11-22)

- **The upgrade reached `main`.** PR #5 was merged
  2026-11-21T23:13:44Z with merge commit `7b4f6eb`
  (`7b4f6eb7c109867cf9026ff835c9301e6fb3f71d`). The branch was
  deleted after the merge; the remote now has only `main`.
- **Current `main` HEAD is `b86b469`**
  (`b86b4696e518a87edded3f0f55ef0643fd08c3cd`, verified via
  `git log`).

### §1.2 — branch protection: was NOT enabled, NOW ENABLED

The 2026-11-21 finding ("`GET .../branches/main/protection`
returns HTTP 404") is superseded. Protection is on for `main`,
verified live 2026-11-22 via the same endpoint; full current
config, the job-name cross-check, and the remaining gaps are in
`ai/audits/BRANCH-PROTECTION-VERIFICATION.md`. Two points of
note against the §2.2 recommendation: the owner enabled the
**legacy branch-protection API** (not the recommended ruleset —
no rulesets exist, `GET .../rulesets` returns `[]`), and the
required-checks list is the recommended 8 **plus** `Gitleaks`
(new job, first run on `b86b469`) **plus** the workflow-level
`CodeQL` check, for 10 total. Pull requests before merging and
conversation resolution were **not** enabled — confirm and
document as owner decisions in the verification report.

### §2.1 — code-security items: STILL PENDING

Re-verified 2026-11-22 (`GET /repos/luxmanbhattarai/SkillForge`
→ `security_and_analysis`): secret scanning validity checks
still **disabled**, non-provider patterns still **disabled**,
and no `secret_scanning_generic_secrets` /
`private_vulnerability_reporting` field is reported. Secret
scanning, push protection, and Dependabot security updates
remain enabled. The §2.1 recommendations are unchanged and
still await owner action.

### §3 — Dependabot PRs #2/#3: MERGED

Both PRs were recreated after the re-merge and merged: #2
(setup-node 7.1.0) merged 2026-11-21T23:53:44Z (`97c7371`), #3
(checkout 7.0.1) merged 2026-11-22T00:07:35Z (`fd3fb82`).
`main` now pins checkout v7.0.1 + setup-node v7.1.0. The §3.4
"leave open; recreate after the re-merge" disposition was
followed exactly.

### §4 — draft PR #4: CLOSED, never merged

PR #4 is `state: closed`, `merged: false` (verified via API
2026-11-22), closed as superseded by PR #5.

### §5 — reconciliation plan: EXECUTED, with one wrong prediction

The plan was executed as written (revert-of-revert `c0f4717`,
fresh PR #5, merge `7b4f6eb`) except for Step 5's expectation:
the fresh PR was **conflicting (51 conflicts)**, not clean as
the plan predicted ("no conflicts expected"). The conflicts
were resolved by merging `main` into the branch (`b3dbfb6`,
all conflicts taking the branch version; merged tree verified
byte-identical to the branch head `5bbe682`). The plan's
diff-size numbers (§5.3, computed at `be03f2c`) are historical
estimates; the executed PR diff is recorded in the PR itself.
§5 is now executed history, not a pending plan.

### What is historical vs current evidence

- **Historical (preserved as written):** the §1 settings table
  (2026-11-21 values), the §2 recommended configuration, the
  §3 PR #2/#3 analysis, the §5 plan and its §5.3 numbers.
- **Current (supersedes this document):** the live protection
  config in `ai/audits/BRANCH-PROTECTION-VERIFICATION.md` and
  the canonical status in `ai/PROJECT-STATUS.json` /
  `ai/PROJECT-STATUS.md`.
