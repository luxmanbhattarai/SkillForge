# Stage D — CI validation (ci-validation.md)

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`
(head `ccfb4d1` at audit time). Agent scope: `.github/workflows/`,
`.github/dependabot.yml`, this fragment. Nothing committed; all
changes below are uncommitted in the working tree for coordinator
review.

Audit baseline: HEAD `ccfb4d1`. Other Stage D agents were editing
the same tree concurrently (installer, link-checker work); where a
finding below was affected by uncommitted work, that is noted with
the time of observation. Test counts are as of HEAD (196 tests);
`test/links.test.mjs` appeared in the working tree during this
stage and is not in those counts.

## The headline: no workflow has ever run on GitHub

**No CI workflow has executed on GitHub.** Every result in this
document is local validation: YAML parsing, SHA-pin verification
against upstream, script-reference checks, and local execution of
the same commands the workflows run. Pushing is forbidden on this
branch, so remote execution stays **UNVERIFIED**. The first
push/PR after merge is the real test for all six workflows; watch
the Actions tab. This is issue L-CI, and it cannot be closed from
this environment.

## Changes made (all uncommitted)

| File | Change |
| --- | --- |
| `.github/workflows/validate-skills.yml` | Added `concurrency` block; added `windows` job (Windows leg, advisory) |
| `.github/workflows/lint.yml` | Added `concurrency` block |
| `.github/workflows/security-audit.yml` | Added `concurrency` block |
| `.github/workflows/codeql.yml` | Added `concurrency` block |
| `.github/workflows/scheduled-maintenance.yml` | Added `concurrency` block (serialize, never cancel) |
| `.github/workflows/release.yml` | Comment only: no `concurrency` by design (see below) |
| `.github/dependabot.yml` | No change (validated, no defect found) |

Diff: 6 files, +113 lines, 0 deletions (purely additive).

## 1. Per-workflow validation

Method: a Python validator (`/tmp/ci-validate.py`, kept outside the
repo) parsing every workflow and `dependabot.yml` with PyYAML and
asserting: YAML parses to a mapping; a top-level `permissions`
block exists with `contents: read`; no `pull_request_target`
trigger; no `contents: write`; no custom `secrets.*` references
(only the default token, see below); every `uses:` entry pinned to
a 40-hex SHA; every `npm run <script>` exists in `package.json`;
every direct `node scripts/...` path exists; triggers present;
cron expressions are 5-field; concurrency present where required.
Result: **123 checks pass, 0 fail.**

One validator gotcha worth recording: PyYAML parses the YAML 1.1
key `on:` as boolean `True`, so `doc.get('on')` is empty and a
trigger check written that way is vacuous. The validator reads
`doc.get(True) or doc.get('on')`. The trigger results below come
from the corrected check plus a raw grep.

### Triggers (verified from parsed YAML)

| Workflow | Triggers |
| --- | --- |
| validate-skills | push to `main`, PR to `main` |
| lint | push to `main`, PR to `main` |
| security-audit | push to `main`, PR to `main`, weekly Mon 06:00 UTC (`0 6 * * 1`) |
| codeql | push to `main`, PR to `main`, weekly Thu 06:30 UTC (`30 6 * * 4`) |
| scheduled-maintenance | weekly Mon 07:00 UTC (`0 7 * * 1`), `workflow_dispatch` |
| release | push of tags `v*.*.*` |

All three cron expressions are valid 5-field expressions. No
workflow uses `pull_request_target` (confirmed by raw grep over
`.github/`). Schedule staggering is as documented (Mon 06:00
security, Mon 07:00 maintenance, Thu 06:30 CodeQL).

### Permissions (least privilege)

- Every workflow declares a top-level `permissions:` block.
- Five workflows: `contents: read` only. No job in any workflow
  needs or has `contents: write` (confirmed by raw grep).
- `codeql.yml` additionally has `security-events: write` and
  `actions: read` — the standard CodeQL set, justified: results
  must be uploaded as code-scanning alerts.
- No workflow sets job-level permissions; the top-level block
  covers all jobs. No defect found.

### Secrets

- No workflow references any stored secret. The only
  `secrets.*` reference in the tree is the default token in
  `scheduled-maintenance.yml` (upstream job), used for the
  higher GitHub API rate limit; the script works without it
  (unauthenticated, ~18 requests of the 60/hour limit). Fork PRs
  are safe: no PR-triggered workflow touches a secret.

### Action pins (re-verified against upstream, 2026-11-20)

Every SHA was re-checked with `git ls-remote` (git protocol, not
the API). All four pins match the current moving tags:

| Action | Pinned SHA | Upstream tag check |
| --- | --- | --- |
| `actions/checkout` v5 | `fbc6f399…` | `refs/tags/v5` → same SHA |
| `actions/setup-node` v5 | `a0853c24…` | `refs/tags/v5` → same SHA |
| `github/codeql-action` v4 (init + analyze) | `1bd86f2f…` | `refs/tags/v4^{}` (dereferenced) → same SHA; tag object is `800a1d87…`, confirming the annotated-tag dereference |

No newer major exists for any of them (checkout/setup-node have
v3/v4/v5; codeql-action has v3/v4, no v5). Dependabot
(`github-actions`, weekly) will propose updates as PRs.

### Dependency installation and caching

- No workflow runs `npm install` or `npm ci`. Correct: the repo
  has zero dependencies and no lockfile, so there is nothing to
  install; `actions/setup-node` alone suffices.
- No workflow configures a cache. Correct for the same reason;
  each `setup-node` use carries a comment saying so.

### Script references

Every `npm run <script>` referenced by the workflows exists in
`package.json` (validate, validate:strict, check:frontmatter,
check:links, check:duplicates, check:sources, check:agents,
check:security, check:registry, registry, score, test, evals,
query, check:upstream), and the one direct invocation
(`node scripts/check-links.mjs --online`) names a file that
exists. No dangling references.

### Artifact handling

No workflow uploads or downloads artifacts. Nothing to persist:
all jobs are validation-only and their output is the log. (The
evals job's report is not uploaded; adding an artifact upload for
it would be a nice-to-have for PR review, not a defect. If added
later, pin the upload action to a SHA like the rest.)

### Failure propagation

GitHub Actions runs `run:` steps under `bash -e -o pipefail` on
Linux, so a failing command fails the step and the job. Reviewed
each multi-line step:

- `lint.yml` trailing-whitespace step: the search is the
  condition of an `if`, and a match exits 1 explicitly. Correct.
  (Edge: a failing `find` inside the `if` condition would be
  masked by the shell's exemption of conditions from `-e`. In
  practice `find` over a fresh checkout does not fail; not worth
  restructuring.)
- `security-audit.yml` dependency-audit step: `npm audit` runs
  only if a lockfile exists; a failing audit inside the `then`
  branch fails the step under `-e`. Correct.
- Registry-diff steps (validate-skills, release): explicit
  `exit 1` with a fix message. Correct.
- All single-command `npm run …` steps fail the job on a
  non-zero exit. Correct.

### Concurrency (added by this stage)

| Workflow | Concurrency | Justification |
| --- | --- | --- |
| validate-skills, lint, security-audit, codeql | group `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` | A new push to a PR cancels the stale run (fast feedback, no queue pile-up). Runs on `main` are never cancelled, so the main-branch signal always completes; scheduled runs also run on the default branch, so they are never cancelled either. Cancelling a stale CodeQL PR analysis is harmless (results upload only on completion). |
| scheduled-maintenance | group `scheduled-maintenance`, `cancel-in-progress: false` | Serializes runs without cancelling: the weekly online link check fires a 600+ URL burst, and two overlapping bursts would double rate-limit pressure on checked hosts (report §18 notes transient 403s from the burst already). A manual dispatch queues behind a running job instead of killing it. |
| release | none (comment in file) | Each run validates one immutable tag; tag validations are read-only and never interfere, so cancelling or serializing them would only delay a release signal. |

### Branch protection: which checks to require

When branch protection is enabled for `main` (a manual repo
setting, Stage E / post-merge), require these check names — the
names GitHub shows, which are the jobs' display `name:` values
with matrix values expanded, **not** the job ids:

- `Validate (Node 18)`, `Validate (Node 20)`, `Validate (Node 22)`
- `Registry`
- `Behavioral evals`
- `lint`
- `security-audit`
- `Analyze (javascript-typescript)` (recommended; CodeQL)

Do **not** require `Windows (Node 20)` until the Windows leg is
promoted from advisory (see §2).

Correction to record: `ai/phase10/NOTES.md` (§"Manual
repo-setting steps") says to require "the `validate`, `registry`,
`evals`, `lint`, and `security-audit` status checks". The first
three are job ids, not check names — requiring `validate` would
never match a check run, so protection would wait forever (or
the rule would be unsatisfiable). The list above is the correct
one. The NOTES.md file is outside this agent's scope; the
coordinator should fix it.

### dependabot.yml

Valid YAML, `version: 2`, one update entry: `github-actions`,
directory `/`, weekly. No `npm` entry — correct, zero
dependencies. No defect found; no change made.

## 2. Windows CI leg (L-Win)

### Design

A new `windows` job in `validate-skills.yml` (Node 20,
`windows-latest`, `timeout-minutes: 20`):

- `defaults.run.shell: bash` — Git Bash ships on
  `windows-latest` and keeps step behavior identical to the
  Ubuntu jobs.
- First step sets `core.autocrlf false` globally before
  checkout, so the tree is checked out with LF endings. (The
  frontmatter parser tolerates CRLF and the heading regex is
  carriage-return tolerant, but checking out LF removes the
  whole class of line-ending divergence. A repo-level
  `.gitattributes` pinning LF would be the durable fix; that
  file is outside this agent's scope — recommended to the
  coordinator.)
- Steps: `npm run validate`, `npm run check:frontmatter`,
  `npm test` (full suite, 196 tests at HEAD).
- Deliberately **not** run here, each for a documented reason:
  `check:security` (W-2), `check:links` (the upstream exclusion
  is a POSIX-prefix match that silently stops excluding on
  Windows), `score` (the category fallback splits a relative
  path on `/`, which yields an empty category on Windows and
  changes which scoring flags apply), `check:registry` and the
  registry diff (W-3), `evals` (covered on Ubuntu; the mock
  provider adds no Windows signal). All are covered by the
  Ubuntu jobs in the same workflow.

### Advisory, not gating — and why

The job carries `continue-on-error: true`. That is deliberate:
the suite is **not yet green on Windows**, and a gating leg
would turn the user's first PR red for known, fixable reasons.
The job still runs on every PR, so its failures are visible;
it just cannot block a merge. Promotion criteria (remove
`continue-on-error`, add `Windows (Node 20)` to required
checks): the gaps below are fixed and the leg is green on a
real PR.

### Gaps found by the audit (all outside `.github/`)

Audit method: read every test helper and test file plus the
scripts the Windows steps execute, looking for POSIX-only
assumptions (hard-coded Unix paths, shell commands, signals,
path-separator handling, home-directory resolution, symlink
types). Baseline HEAD `ccfb4d1`; working-tree state re-checked
at write time because the Stage D installer agent is editing
the same files concurrently.

- **W-1 — user-scope installer tests fail on Windows
  (BLOCKER, still open).** `test/helpers.mjs` `runCli` /
  `runCliPty` sandbox the home directory by setting the `HOME`
  environment variable only. The installer resolves home via
  `os.homedir()`, which on Windows reads `USERPROFILE`, not
  `HOME`. On Windows, user-scope tests (claude-code, codex,
  antigravity, at least 4 tests) would install into the real
  runner profile instead of the sandbox: the assertions fail
  and the runner home is polluted. No workflow-level workaround
  exists (each test creates its own sandbox home, so a static
  `USERPROFILE` cannot match). Fix (test area, not this agent):
  in `runCli`/`runCliPty`, also set `USERPROFILE` to the
  sandbox home when the platform is Windows; or have the
  installer honor a `HOME` override. Verified still unfixed in
  the working tree at write time.
- **W-2 — security scanner exceptions never match on Windows
  (BLOCKER, still open).** `scripts/security-scan.mjs` builds
  relative paths with `path.relative` (backslashes on Windows)
  and compares them against POSIX exception/skip prefixes
  (`matchesPrefix`, `SKIP_FILES`, `SKIP_PREFIXES`). On Windows
  no exception matches, so the 8 Stage B exceptions would not
  apply and `check:security` would fail; `scanner.test.mjs`
  (which runs the scanner against fixture trees keyed by POSIX
  paths) would fail the same way. Fix (scripts area): normalize
  the relative path to POSIX separators once, where it is
  computed, before any prefix comparison. Untouched in the
  working tree at write time.
- **W-3 — registry paths are native-separated (BLOCKER, still
  open).** `scripts/generate-registry.mjs` stores
  `path.relative(...)` output directly as the registry `path`
  (backslashes on Windows), so regeneration on Windows would
  differ from the committed POSIX registry and the determinism
  test would fail. `scripts/validate-registry.mjs` compares
  disk paths from `path.relative` against registry paths from
  JSON, so on Windows every skill would be reported missing in
  both directions. Fix (scripts area): normalize to POSIX
  separators when building/comparing registry paths.
  Untouched in the working tree at write time.
- **W-4 — Windows link creation (being fixed in the working
  tree).** At HEAD, `scripts/install/backups.mjs` recreated
  symlinks without a type argument, which Node's docs say must
  match the target on Windows, and there was no junction
  fallback (A-11). The concurrent Stage D installer work adds
  `scripts/install/links.mjs` (`createLink` with a Windows
  junction fallback, plus Windows file-lock handling) and
  rewires `stageItem` and the backup paths to use it
  (uncommitted at write time). If that work lands, W-4 is
  retired; the `--link` tests are the canary on the first run.
  Developer Mode status on the `windows-latest` runner image
  is **unverified from here** (a verification attempt via the
  runner-images repo was abandoned after an execution-risk
  flag on the clone; see §5) — with the junction fallback in
  place it should not matter for directory links.

Already handled (verified, no action): the PTY helper looks up
`script` on `PATH` and skips cleanly where it is absent
(Windows has none); the six interactive-prompt tests skip via
`test.skip`. The permission-error test skips on Windows
(`chmod` does not produce access errors there). All temp
directories use `os.tmpdir()` + `mkdtemp` (portable). All child
processes spawn via `process.execPath` (portable). The
frontmatter parser and heading checks tolerate CRLF. Symlink
creation in the installer passes an explicit directory/file
type. The concurrent installer work also made prompt streams
injectable so the prompt paths run without a PTY ("no PTY"
tests in `test/installer.test.mjs`).

### Residual risk, honestly

- Even after W-1–W-3 are fixed, the leg has never run on a real
  Windows runner. Unknown-unknowns remain (Windows file
  locking during rapid create/delete cycles, antivirus holds,
  path-length edge cases in deeply nested temp dirs). The
  20-minute timeout bounds a hung run.
- The leg runs the full suite including the evals tests (which
  spin up a local stub HTTP server); that is expected to work
  on Windows but is unproven.
- `continue-on-error` means a red Windows leg will not block
  merges — the trade-off is that it can be ignored. The
  promotion criteria above are the mitigation: do not leave
  the leg advisory indefinitely.

## 3. L-Node — Node 18/22 legs exercised locally

**Outcome: exercised, both green.** L-Node is closed as far as
local verification goes (the CI matrix still needs its first
remote run, per L-CI).

Method: official Node 18 LTS (`v18.20.8`) and Node 22 LTS
(`v22.23.5`, latest at the time) Linux x64 tarballs from
nodejs.org, extracted outside the repo, run against a clean
`git archive` copy of HEAD (no `.git`, so no hooks can run;
the copy keeps test side effects out of the shared working
tree). `nvm`/`volta` are not installed, as the task anticipated.

Results (suite as of HEAD: 196 tests):

| Runtime | `npm test` | `npm run validate` |
| --- | --- | --- |
| Node v18.20.8 | 195/196, then 196/196 on re-run (see note) | exit 0 (4 upstream warnings, informational) |
| Node v22.23.5 | 196/196 | exit 0 (4 upstream warnings, informational) |

The single Node 18 failure was environmental, not a Node 18
issue: the permission-error test runs the installer as the
unprivileged `nobody` user, and `nobody` could not execute the
Node binary under the scratch directory (the home directory
permissions blocked traversal). After opening traversal on the
scratch path, the installer suite re-ran 80/80 on Node 18,
including that test. Conclusion: the suite passes on both
matrix legs; `engines >= 18` is supported by evidence, not
just by claim.

Environment deviation to record: the task said to use `/tmp`
for the downloads, but `/tmp` here is a 512 MB tmpfs that was
100% full (see §5), so the first Node 22 extraction failed and
the Node 18 binary came out corrupt. The downloads and
extraction went to a hidden scratch directory on the home disk
instead (`~/.stage-d-scratch`, outside the repo), removed at
the end of this stage. The scratch directory's traversal
permission was opened for the `nobody` test and restored
afterwards, as was the home directory's.

## 4. L-Scan — external scanners

**Outcome: three of four ran; all clean of real credentials.
CodeQL and local workflow execution remain Blocked.**

| Tool | Version / install | Result |
| --- | --- | --- |
| Gitleaks | 8.30.1, release binary to scratch | Ran over git history (66 commits, ~9.5 MB) and the working tree. 5 findings, **0 real credentials**: 3 generic-key and 2 token-format matches, all in test fixtures (deliberately fake values used by the scanner's own unit tests), one public documentation example token, and one UUID-formatted example key in an API-design doc. |
| TruffleHog | 3.100.0, release binary to scratch | Ran over the filesystem (3,987 chunks, 26.4 MB). 4 unverified, **0 verified**: database connection-string detectors firing on placeholder example URLs in upstream Prisma reference docs (literal placeholder hosts, localhost, all-caps template values), plus the same content in one historical git blob. First invocation stalled on a runtime approval prompt (its default update check reaches the network); `--no-update` fixed it. |
| Semgrep | 1.186.0, installed via pip into a scratch target directory | Ran `p/javascript` over `scripts/`, `test/`, `evals/`. **0 findings, 0 errors.** Notes: the first install failed for lack of space (pip uses `/tmp`); retrying with `TMPDIR` pointed at scratch worked. `--config auto` refuses to run with metrics off; a named config (`p/javascript`) works with `--metrics=off`. The launcher needs its `bin/` on `PATH` (it shells out to its Python companion). |
| CodeQL | not installed | **Blocked.** The CLI bundle is a multi-hundred-megabyte download plus a database build and query run; not attempted within this stage's time-box. Covered by `codeql.yml` on GitHub on the first push/PR. |
| `act` (local workflow execution) | not installed | **Blocked.** `act` needs Docker; Docker is not installed here. No local workflow execution was possible. |

No credential values are reproduced anywhere in this fragment
or in the stage's reports — findings are characterized by rule,
file, and line only. The gitleaks/trufflehog/semgrep raw
reports live in the scratch directory, not in the repo, and
were deleted with it.

Net: the external scanners agree with the repo's own scanner
(`npm run check:security`: PASS, no findings): no real leaked
credentials in the tree or its history. L-Scan is closed except
for CodeQL, which only ever runs on GitHub.

## 5. Incidental findings and environment notes

- **Stale installer-test temp dirs fill `/tmp`.** At audit
  time `/tmp` held 2,744 `skillforge-installer-test-*`
  directories totalling 443 MB (the tmpfs is 512 MB).
  `test/helpers.mjs` `makeSandbox()` never removes its temp
  directories (unlike `scanner.test.mjs`, which cleans up
  after itself), so every installer test run leaks them. This
  filled `/tmp`, broke the first Node extraction in this stage,
  and broke the first semgrep install. Recommend the test
  owners add cleanup (a `t.after` removal in the sandbox
  helper). Not this agent's area; flagged here for the
  coordinator.
- **PyYAML `on:` gotcha** (see §1): a trigger check must read
  the boolean-`True` key, or it silently checks nothing.
- **Two execution-risk flags during this stage**, both handled
  by discarding the flagged material and using a clean
  alternative: (1) a `cp -a` copy of the repo (including
  `.git` hooks) was deleted unused; test runs used a
  `git archive` tree with no `.git` instead. (2) A sparse
  clone of the `actions/runner-images` repo (to verify
  Developer Mode on Windows runners) was deleted unused;
  Developer Mode status is therefore recorded as unverified
  (§2, W-4).
- `npm run check:security` after all edits in this stage:
  **PASS, no findings** (1,057 text files + 4 binary files, 29
  patterns). The workflow edits and this fragment contain no
  scanner-flagged constructs.

## 6. Blocked items (summary)

| Item | Reason | Unblocks when |
| --- | --- | --- |
| L-CI: remote workflow execution | Pushing is forbidden; no workflow has run on GitHub | First push/PR after merge |
| Windows leg promotion to gating | W-1, W-2, W-3 open (scripts/test fixes, other agents' areas) | Fixes land + leg green on a real PR |
| CodeQL local run | Bundle size + DB build; time-boxed out | N/A — runs in CI via `codeql.yml` |
| `act` local workflow runs | Docker not installed | Docker installed (environment change) |
| Developer Mode verification | Runner-image verification abandoned (see §5) | First Windows-leg run (canary tests) |

## Appendix — evidence commands

```sh
# YAML / pins / script-reference validation (123 checks, 0 fail)
python3 /tmp/ci-validate.py

# SHA pins re-verified (git protocol, not the API)
git ls-remote https://github.com/actions/checkout.git 'refs/tags/v[345]'
git ls-remote https://github.com/actions/setup-node.git 'refs/tags/v[345]'
git ls-remote https://github.com/github/codeql-action.git 'refs/tags/v[345]'
git ls-remote https://github.com/github/codeql-action.git 'refs/tags/v[345]^{}'

# Node matrix (clean git-archive copy of HEAD, outside the repo)
# Node v18.20.8: npm test 196/196 (after env fix), npm run validate exit 0
# Node v22.23.5: npm test 196/196, npm run validate exit 0

# Scanners (binaries in scratch, outside the repo)
gitleaks detect --source . [--no-git]   # 8.30.1, 5 findings, 0 real
trufflehog filesystem --directory . --no-verification --no-update  # 3.100.0, 0 verified
semgrep --config p/javascript --metrics=off scripts test evals     # 1.186.0, 0 findings

# Security gate after edits
npm run check:security   # PASS, no findings
```
