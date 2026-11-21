# Phase 10 — CI/CD and automation: notes

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Addresses audit findings M-03, M-04, L-11, L-12
(`ai/audits/INITIAL-AUDIT.md`) and the Phase 7 security-audit
recommendations (`ai/audits/SECURITY-AUDIT.md`).

## What changed per workflow

### `.github/workflows/validate-skills.yml` (rewritten)

PR validation, now covering every local check:

- `validate` job — Node matrix **18 / 20 / 22** (L-12: engines claims
  `>= 18`, CI previously ran only 20). Runs `validate`,
  `check:frontmatter`, `check:duplicates`, `check:sources`,
  `check:agents`, `score`, and `npm test` (regression tests).
  `check:duplicates` and `check:sources` previously ran in no
  workflow (M-03).
- `registry` job (Node 24) — `npm run check:registry` (Phase 9
  contract script, see below), then regenerate + diff. The diff step
  prints the fix: run `npm run registry` and commit.
- `evals` job (Node 24) — `npm run evals` with the default mock
  provider (deterministic, no LLM APIs, no keys, no network).
- `permissions: contents: read`. All actions pinned to SHAs.

### `.github/workflows/lint.yml` (rewritten)

Same checks as before — frontmatter, offline links, trailing
whitespace in Markdown (upstream skills still excluded) — plus
`permissions: contents: read` and pinned SHAs. No markdownlint:
the repo has zero dependencies, so no linter is installed; the
existing checks are the lint layer.

### `.github/workflows/security-audit.yml` (rewritten)

Keeps the push/PR triggers and the weekly Monday 06:00 UTC schedule.
Still runs `npm run check:security`, plus a dependency-audit step
that runs `npm audit --omit=dev` only if a lockfile exists and
otherwise explains why it skips: zero dependencies, no lockfile,
plain `npm audit` fails with ENOLOCK. `permissions: contents: read`,
pinned SHAs.

### `.github/workflows/codeql.yml` (new)

Minimal standard CodeQL workflow: push/PR to `main` plus a weekly
run (Thursday 06:30 UTC, staggered from the Monday jobs).
`init` + `analyze` for `javascript-typescript`; no autobuild step
because JavaScript/TypeScript analysis needs no build.
Permissions: `contents: read`, `security-events: write`,
`actions: read` (the standard CodeQL set). See
`ai/decisions/2026-11-20-codeql-advanced-setup.md` for why this
repo uses the workflow (advanced setup) instead of CodeQL default
setup — the two conflict, so do not enable both.

### `.github/workflows/scheduled-maintenance.yml` (new)

Weekly (Monday 07:00 UTC, after the security audit) plus
`workflow_dispatch`. Three independent jobs:

- `online-links` — `node scripts/check-links.mjs --online`.
  Re-verifies every external URL, including the documented
  exception entries, which the script prints as `SKIPPED` lines so
  a dead exception is visible in the log (L-11).
- `stale-verification` — `npm run query -- stale --days 180`
  (Phase 9 contract script). Lists skills not re-verified in 180
  days; a failing run means re-verification is due.
- `upstream` — `npm run check:upstream` (new script, see below).
  Monitoring, not gating: exits 0 even when upstreams moved.

### `.github/workflows/release.yml` (new)

Release validation on version tags (`v*.*.*`): strict validation
plus every check in the PR suite (frontmatter, offline links,
duplicates, sources, agents, security, score, tests, registry
schema + regenerate/diff). Validation only — the package is
private and there are no build or publish artifacts, so this
workflow creates no release and publishes nothing.

### `.github/dependabot.yml` (new)

Weekly updates for the `github-actions` ecosystem, so pinned
action SHAs stay current via PR. No `npm` ecosystem entry: zero
dependencies and no lockfile means there is nothing to update.

### `scripts/check-upstream.mjs` (new)

Compares each upstream vendor repo's latest default-branch commit
(via the public GitHub API) against the pin in
`sources/imported-skills.md` and reports drift. Works without
secrets (unauthenticated, ~18 requests of the 60/hour limit for
the current 6 vendors); uses `GITHUB_TOKEN` when set for the
higher rate limit. Exits 0 even on drift; exits 1 only if the
pins file cannot be read or yields no vendors.

Verified locally 2026-11-20 (exit 0): 5 of 6 vendors up-to-date;
**Vercel (`vercel-labs/agent-skills`) is 4 commits behind its
`main` head** (pinned `1a2c79d4`, head `5a37a632` dated
2026-11-20). Informational only — re-import per
`docs/UPDATE-PROCESS.md` when a new upstream commit is worth
taking. Note: the first version of this script inverted the
GitHub compare API's `ahead`/`behind` status; it was caught by
the live run and fixed (compare `base...head` reports the HEAD's
position relative to the base).

## Cross-cutting decisions

- **Pinning:** every third-party action pinned to a full commit
  SHA, verified with `git ls-remote` — see
  `ai/phase10/pinned-actions.md`. Note the CodeQL tags are
  annotated, so the pinned SHA is the dereferenced commit, not
  the tag object.
- **Permissions:** least privilege on every workflow —
  `contents: read` everywhere except CodeQL, which additionally
  needs `security-events: write` and `actions: read`. No job
  needs `contents: write`; none has it.
- **No secrets:** no workflow uses any secret. The only token
  referenced is the default `GITHUB_TOKEN` in the upstream job,
  scoped by the workflow's `contents: read` permissions, and the
  script works without it. Fork PRs are safe.
- **No caching:** `actions/setup-node` runs with no cache in every
  job — zero dependencies and no lockfile means there is nothing
  to cache. Each use says so in a comment.
- **Node versions:** matrix 24 on the main validation job
  only; every other job runs Node 24.

## Contract scripts (coordinator-owned, Phase 9)

Three scripts referenced by these workflows did not exist yet when
this file was first written. All three have since landed (see the
coordinator follow-up at the end of this file). For the record, the
three were:

1. `npm run check:registry` → `node scripts/validate-registry.mjs`
   (used by `validate-skills.yml` registry job and `release.yml`).
2. `npm run query` → `node scripts/query-skills.mjs`, invoked as
   `npm run query -- stale --days 180` (used by
   `scheduled-maintenance.yml` stale-verification job).
3. `npm run check:upstream` → `node scripts/check-upstream.mjs`
   — the script file is written by Phase 10; the coordinator adds
   the `package.json` entry (used by `scheduled-maintenance.yml`
   upstream job). Phase 10 did not edit `package.json`.

## YAML validation

Method: Python 3 + PyYAML (`python3 -c "import yaml"` confirmed
available), parsing every workflow file and `dependabot.yml`
with `yaml.safe_load`, plus assertions that every `uses:` entry
matches a 40-hex SHA pin and every workflow declares a
`permissions:` block.

Result: **all 6 workflow files and `dependabot.yml` parse and pass
all assertions.** Validation caught one real error before
finishing: an unquoted colon in a step name in
`security-audit.yml` (`Audit dependencies (skipped: zero
dependencies)`), fixed by quoting the name.

Verified separately: every `npm run <script>` referenced by the
workflows exists in `package.json` except the three contract
scripts above; the one direct `node scripts/...` invocation
(`check-links.mjs --online`) exists.

Also verified by running locally: `npm test` passes 108/108
(2026-11-20). `npm run evals`, `npm run registry`, and
`npm run report` were NOT run — they belong to the Phase 9 agent
working in the same tree.

## Manual repo-setting steps (user must do in GitHub Settings)

These cannot be enabled from a working copy; they are settings,
not files. Do them after this branch merges (or now, on `main` —
they are branch-independent):

1. **Secret scanning** — Settings → Code security → Secret
   scanning → Enable. (Phase 7 recommendation; the local scanner
   in `scripts/security-scan.mjs` is a different, complementary
   layer — it scans skill content for leaked secrets, while
   GitHub's scans the repo history and blocks pushes of known
   secret formats.)
2. **Dependabot alerts** — Settings → Code security → Dependabot
   alerts → Enable. This is separate from the `dependabot.yml`
   file: the file drives version-update PRs, alerts drive
   vulnerability notifications. Enable both. (With zero npm
   dependencies, alerts will be quiet; they matter if a
   dependency is ever added, and for the GitHub Actions updates.)
3. **CodeQL — do NOT enable default setup.** This repo uses
   CodeQL advanced setup via `.github/workflows/codeql.yml`
   (pinned action SHAs, explicit schedule, version-controlled).
   Enabling default setup as well would create a second,
   conflicting configuration. If default setup is already on,
   turn it off when the workflow lands, or delete the workflow
   and keep default setup instead — pick one. The workflow is
   the recommended choice: it is the only option that pins the
   CodeQL action version and keeps the configuration in the
   repo. See `ai/decisions/2026-11-20-codeql-advanced-setup.md`.
4. **Branch protection (recommended)** — Settings → Branches →
   add a rule for `main` requiring these status checks before
   merging (these are the check *names* GitHub shows — the jobs'
   display `name:` values with matrix values expanded, not the
   job ids; requiring `validate` would never match a check run):
   `Validate (Node 24)`, `Registry`, `Behavioral evals`, `lint`,
   `security-audit`, `Windows (Node 24)`, and `Semgrep (SAST)`
   (plus `Analyze (javascript-typescript)` for CodeQL,
   recommended). The Windows leg was promoted from advisory to
   gating on 2026-11-21 after going green on a real runner
   (PR #1, run 44933250315). The workflows exist; protection
   is what makes them gating.

## Coordinator follow-up (2026-11-20)

The three contract scripts above now exist in `package.json`:
`check:registry` and `query` landed with Phase 9 (commit
e6a6b01); `check:upstream` was added by the coordinator with the
Phase 10 commit. Verified 2026-11-20: every `npm run <script>`
referenced by the workflows now exists.

The exit-code behavior of `query stale` is now confirmed: it
exits 1 when stale skills exist and 0 when none are stale, so the
stale-verification job fails exactly when re-verification is due
(and a test in `test/registry.test.mjs` covers both branches).

The coordinator independently re-verified the Phase 10 work: all
three action SHAs against `git ls-remote` (all match), all YAML
files parse with permissions + SHA pins, `npm run
validate:strict` passes (exit 0, 5 upstream-only warnings), and
`check-upstream.mjs` re-run live (exit 0; 5 up-to-date, Vercel 4
commits behind, as reported above). Full results in
`ai/test-results/phase10-ci-results.md`.

## What was NOT verified / could not be verified

- **Workflows have never run on GitHub.** YAML syntax, pins,
  permissions, and script references were verified locally, but
  no workflow run exists yet. The first PR/push after merge is
  the real test; watch the Actions tab.
  Update (2026-11-21): superseded — all 6 workflows plus the
  Windows leg have run on PR #1 and pass (run 44933250315;
  Windows 250/255, 0 fail, 5 POSIX-only skipped).
- **The three contract scripts** (above) have now landed — see
  the coordinator follow-up above. The `registry`,
  `stale-verification`, and `upstream` jobs can pass once the
  workflows run on GitHub.
- **`npm run evals` was not run** (Phase 9 ownership). Last
  known result: 449/449 passed on 2026-11-20 (mock provider)
  per `ai/test-results/phase6-eval-results.json` and
  `ai/test-results/phase7-security-results.json`. If evals
  regress, the `evals` job will fail PRs — that is intended.
- **CodeQL, Semgrep, Gitleaks, TruffleHog are not installed
  locally** and none of them ran here. CodeQL runs only on
  GitHub via the new workflow; the others are not in CI at all
  (the Phase 7 audit recorded them as blocked/not installed).
- **Secret scanning and Dependabot alerts** cannot be verified
  from here — see the manual steps above.
- **Node 18/22 matrix legs** were not run locally (local Node
  is v24.22.1); the matrix exists precisely to exercise them in
  CI.
