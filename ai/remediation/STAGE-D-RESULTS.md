# Stage D (Platform & CI) — Results

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; nothing pushed, merged, or PR'd)
- **Scope:** Windows `--link`, cross-platform tests, GitHub workflow validation, dependency/supply-chain audit, and the 8 Stage D issues in `ai/remediation/ISSUE-REGISTER.md` (A-11, A-23, A-27, A-29, L-CI, L-Node, L-Scan, L-Win).
- **Method:** three parallel agents (Windows/link, CI/workflows, supply-chain/link-checker) on disjoint file areas, no commits by agents; the coordinator verified every claim (re-ran suites, read diffs, re-checked pins and hashes), did the final pass (W-1/W-2/W-3, test hygiene, doc corrections) personally, and serialized all commits. No upstream file was hand-edited (the Vercel change is a verbatim re-import, §7).

## Outcome summary

| Work | Result |
| --- | --- |
| Windows `--link` (A-11, L-Win) | Junction fallback implemented + 17 tests; real Windows execution still Blocked |
| Cross-platform tests (A-29) | Spaces/Unicode/long-path CLI tests added; all pass |
| GitHub workflows (L-CI) | All 6 + dependabot validated locally (123 checks, 0 fail); remote execution still UNVERIFIED |
| Windows CI leg | Added, advisory (`continue-on-error`); promotion needs a green real PR run |
| Node matrix (L-Node) | Node 18.20.8 + 22.23.5 both run the suite 196/196 green |
| External scanners (L-Scan) | Gitleaks, TruffleHog, Semgrep ran clean; CodeQL + `act` Blocked |
| Supply chain | Zero deps verified; 4 binaries identified + hashed; no blockers |
| Link checker (A-23) | Code stripping + retry/backoff + delay; 14 tests pass |
| Vercel re-import (A-27) | Done, verbatim, byte-identical at new pin `5a37a632` |
| L-Prisma | Headline still holds (Prisma 8 RC, no GA date); stance already in user docs |
| Unit tests | **232/232 pass** (196 Stage C baseline + 17 Windows + 14 links + 5 paths) |
| Stage D issues | 8 owned: 4 fixed (A-11, A-23, A-27, A-29), 1 exercised locally (L-Node), 2 partially closed (L-Scan, L-Win), 1 open by environment (L-CI) |

## 0. Validated vs executed — read this first

Nothing in this stage rests on real Windows execution or on a remote CI run, and nothing below claims otherwise.

| Kind of evidence | What it covers |
| --- | --- |
| **Static inspection** (code read, docs researched) | Junction semantics, EBUSY paths, all 6 workflows, all pins, the supply-chain inventory, the `npx skills` exposure |
| **Simulated tests** (POSIX execution of Windows-shaped inputs) | Junction fallback via fault-injected `symlinkFn` (platform `win32`), `path.win32`-constructed manifest roots, `toPosixPath` on backslash inputs, spaces/Unicode/long paths on POSIX |
| **Real execution, local** | Full unit suite (232/232), all validators, Node 18/22 tarballs (196/196 each), Gitleaks/TruffleHog/Semgrep, the Vercel hash verification |
| **Blocked (needs Windows / a push)** | Real junction creation, `lstat`/`readlink`/`rm` behavior on junctions, Developer Mode behavior, the Windows CI leg's first run, all 6 workflows' first remote runs, CodeQL locally, `act` locally |

## 1. Windows `--link` (A-11 — fixed; L-Win — partially closed)

Source fragment: `ai/remediation/stage-d/windows-link-analysis.md` (behavior matrix, junction research with Proven/Assumed/Blocked labels, rollback/restore trace, EBUSY review, node-pty decision, first-real-Windows-run checklist).

### What was built

- **New `scripts/install/links.mjs`:** `createLink()` creates a symlink and, on Windows only, retries a *directory* link as a **junction** when the symlink fails with EPERM. Junctions need no privilege (no Developer Mode, no admin); symlinks need Developer Mode or elevation. Symlink-first is deliberate: a symlink is the better link where creatable (relative/network targets), and the fallback only changes behavior for users who would otherwise get an error. Only EPERM is retried; file links never retry (junctions cannot point at files) and keep the clear privilege error. Relative targets are resolved against the link's parent before the junction retry (Node would resolve against the process cwd — the wrong base). `platform` and `symlinkFn` are injectable for fault-injection tests.
- **Same-target comparison:** `sameLinkTarget()` strips NT namespace prefixes, normalizes separators, and compares case-insensitively on Windows. `linkPointsAtSource()` / `verifyStaged()` / doctor's link check use it.
- **File-lock handling:** `isWindowsLockError()` / `lockErrorMessage()` / `rmRecursiveOptions()` — EBUSY/EPERM on Windows rename/rm get a human-readable explanation (a program holding a file open, or a permission problem) and recursive removes retry (`maxRetries: 3`, Node's documented mechanism for transient antivirus/indexer locks). `swapIn` renames are wrapped with lock hints; `cleanStaleStaging` skips Windows-locked leftovers (return shape now `{ removed, skipped }`) instead of aborting the run. POSIX behavior is unchanged everywhere (all branches win32-gated).
- **Two genuine bugs fixed along the way:** (1) backup/restore called typeless `symlink()`, so a broken *directory* link was recreated as a *file* link (Node auto-detects by stat-ing the target and defaults to `file` when it is missing) — now kind-correct via `createLink`, which also gives backup/restore the junction fallback. (2) `relativeRoot()` stored Windows backslash manifest roots, which resolve on POSIX as a single literal directory name — now normalized to `/` (manifests travel via git; Windows path functions accept forward slashes).

### What is still unproven (Blocked — the first real Windows run)

In priority order (full 8-item checklist in the fragment §9): (1) Node's `lstat()` reports junctions as symlinks — every classify/verify/doctor path rests on this; (2) recursive `rm` on a junction removes only the junction — **if wrong, uninstall/rollback would delete the library** (catastrophic; no pure-Node defense exists since Node exposes no reparse-tag API); (3) real junction creation + the `(junction)` log line; (4) Developer Mode on → real symlink; (5) EBUSY lock-note paths; (6) Windows long-path support; (7) tier-1 validation with real Windows paths; (8) no-PTY prompt tests executing on Windows.

### W-1/W-2/W-3 — found by the CI audit, fixed in Stage D

The workflow audit found three Windows blockers outside `.github/`; the coordinator fixed all three in the final pass:

- **W-1 (test helper):** `runCli`/`runCliPty` sandboxed home by setting `HOME` only, but the installer resolves home via `os.homedir()`, which reads `USERPROFILE` on Windows — user-scope tests would install into the real runner profile. Fixed: `sandboxEnv()` also sets `USERPROFILE` on win32.
- **W-2 (security scanner):** relative paths were compared against POSIX exception/skip prefixes, so no exception would match on Windows. Fixed: `toPosixPath()` normalization where the relative path is computed.
- **W-3 (registry):** the generator stored native-separated paths and the validator compared native disk paths against POSIX registry paths. Fixed: same normalization in both scripts (and the `split(path.sep)` in the generator became `split('/')` to match).
- **Same class, same fix:** the link checker's upstream exclusion (a POSIX-prefix match) and the scorer's category fallback (`split('/')[1]`) got the same treatment.
- **Shared helper:** `scripts/lib/paths.mjs` (`toPosixPath`, splits on both separators so Windows-style input normalizes on any platform — which also makes it unit-testable on POSIX) + `test/paths.test.mjs` (5 tests). All five normalizations are no-ops on POSIX; the registry regenerates with zero diff.

### node-pty decision — option (c), implemented, no dependency added

Stage C left the decision; Stage D took it with written justification (fragment §7, concurred by the supply-chain audit §8):

- **(a) node-pty rejected:** a native C++/node-gyp module whose prebuilds fall back to a local compile (Python + VS Build Tools on Windows — the exact platform missing coverage), and it would be the repo's **first dependency of any kind**, ending the deliberate zero-dependency policy for 3 tests.
- **(b) Accepting the skip rejected:** leaves prompt paths permanently untested on Windows.
- **(c) Chosen:** `prompt.mjs` streams are injectable (`setPromptStreams`/`resetPromptStreams`); the same 3 prompt paths (conflict abort, uninstall `--all`, modified-content uninstall) plus `askChoice` parsing now run in-process without a PTY on every platform. Production behavior is unchanged (production never calls it; defaults are the process streams). PTY tests remain as the real-TTY integration layer on Unix CI.

## 2. Cross-platform tests (A-29 — fixed)

3 new CLI tests in `test/installer.test.mjs`: install to a >260-character `--dest`, install with a spaced project dir and spaced `--dest`, install with Unicode paths. All pass. The installer does no shelling (pure `fs` ops via `execFile`), so spaces/Unicode are inert by construction; the tests prove it rather than assume it. Windows-specific long-path behavior (OS/Node long-path configuration) remains Blocked.

## 3. GitHub workflows (L-CI — open; validation done)

Source fragment: `ai/remediation/stage-d/ci-validation.md`.

### Validation (local only — 123 checks, 0 failures)

A Python validator (PyYAML + assertions) checked all 6 workflows + `dependabot.yml`: YAML parses; triggers confirmed (including all 3 cron expressions, valid 5-field); `contents: read` everywhere (CodeQL adds only the standard `security-events: write` + `actions: read`); **no `pull_request_target`, no `contents: write`**; the only `secrets.*` reference is the default `GITHUB_TOKEN` in the upstream job (the script works without it); **all 4 action SHAs re-verified against upstream via `git ls-remote`** (checkout v5, setup-node v5, codeql-action v4 dereferenced commit — all match current tags, no newer major exists; the coordinator spot-checked checkout/setup-node independently); every referenced npm script exists; no install/cache steps needed or present (zero deps, correct); failure propagation reviewed step by step (all correct).

### Concurrency (added)

| Workflow | Concurrency |
| --- | --- |
| validate-skills, lint, security-audit, codeql | Group per workflow+ref, `cancel-in-progress` unless on `main` (a new push to a PR cancels the stale run; `main` runs always complete) |
| scheduled-maintenance | Serialize, never cancel (two overlapping 600+ URL link-check bursts would double rate-limit pressure) |
| release | None by design (comment in file — immutable tags, read-only validation) |

### Windows CI leg (added, advisory)

New `windows` job in `validate-skills.yml`: Node 20, `windows-latest`, 20-min timeout, `shell: bash`, `core.autocrlf false` before checkout, runs `npm run validate` + `npm run check:frontmatter` + full `npm test`. It is **advisory (`continue-on-error: true`)**, not gating: the suite was not yet Windows-green when the leg was written (W-1–W-3, now fixed in §1, plus unproven junction behavior). Promotion criteria (remove `continue-on-error`, add `Windows (Node 20)` to required checks): the leg is green on a real PR. Deliberately not run in the leg, each with a documented reason: `check:security`, `check:links`, `score`, `check:registry` + registry diff, `evals` (all covered by the Ubuntu jobs; several exclusions predate the W-2/W-3 fixes and can be revisited once the leg is green). A repo-level `.gitattributes` pinning LF was added as the durable fix for the CRLF concern (it changes no checked-out content — the tree is already LF).

### Branch-protection correction

`ai/phase10/NOTES.md` told the user to require checks named `validate`/`registry`/`evals` — those are job ids, not check names, so protection would wait forever. Fixed in Stage D: the correct required checks are `Validate (Node 18)`, `Validate (Node 20)`, `Validate (Node 22)`, `Registry`, `Behavioral evals`, `lint`, `security-audit` (plus `Analyze (javascript-typescript)` for CodeQL, recommended). Do NOT require `Windows (Node 20)` until the leg is promoted.

### L-CI stays open

**No workflow has ever run on GitHub.** Remote execution cannot be verified from here (pushing is forbidden). The first push/PR after merge is the real test for all six workflows. `act` local execution is Blocked (Docker not installed).

## 4. Node matrix (L-Node — exercised locally)

Official Node 18 LTS (`v18.20.8`) and Node 22 LTS (`v22.23.5`) Linux x64 tarballs from nodejs.org, run against a clean `git archive` copy of HEAD (outside the repo): **`npm test` 196/196 on both, `npm run validate` exit 0 on both** (suite as of HEAD, before Stage D's 36 new tests). The one initial Node 18 failure was environmental (the `nobody`-user permission test could not execute the Node binary under the scratch dir — home-directory traversal permissions); re-run after fixing traversal: 80/80 installer tests. `engines >= 18` is now evidence-backed. The CI matrix legs still need their first remote run (L-CI).

## 5. External scanners (L-Scan — partially closed)

| Tool | Version | Result |
| --- | --- | --- |
| Gitleaks | 8.30.1 (release binary) | 66 commits scanned, 5 findings, **0 real** (test fixtures, a public doc-example token, a UUID example key) |
| TruffleHog | 3.100.0 (release binary) | 4 unverified / **0 verified** (placeholder connection strings in upstream Prisma docs + 1 historical blob) |
| Semgrep | 1.186.0 (`p/javascript` over scripts/test/evals) | **0 findings, 0 errors** |
| CodeQL | not installed | **Blocked** (multi-hundred-MB bundle + DB build; covered by `codeql.yml` in CI) |

No credential values were reproduced anywhere. The external scanners agree with the repo's own scanner (`npm run check:security`: PASS, no findings): no real leaked credentials in the tree or its history.

## 6. Supply-chain audit — no release blockers

Source fragment: `ai/remediation/stage-d/supply-chain-audit.md`.

- **Zero deps verified:** no `dependencies`/`devDependencies`/etc. in `package.json`, no lockfile of any kind; all tooling is Node built-ins. `npm audit` ENOLOCK is already handled by the security workflow.
- **Actions:** 3 first-party actions, all SHA-pinned (checkout v5, setup-node v5, codeql-action v4); Dependabot is github-actions-only, weekly. Update policy: one action at a time, on green CI; no update needed for this release.
- **4 binaries, all upstream and load-bearing**, SHA-256 hashes recorded for the first time (none were documented anywhere before): 2 agentic-seo PNG screenshots, the Anthropic theme-showcase PDF, and `shadcn-components.tar.gz` (49 entries, all `.tsx` shadcn components, listing-inspected — no executables, no scripts, no absolute paths, no symlinks).
- **Upstream:** 6 vendors, pins + licenses as recorded. **Post-install scripts: none. Unnecessary dependencies: none.**
- **Dependency confusion:** minimal surface (zero deps, private package, `bin` only reachable from a clone; never run `npx skillforge`). One documentation-level note: `npx skills add luxmanbhattarai/SkillForge` fetches Vercel's `skills` CLI unpinned — recommend pinning a verified CLI version at the next docs pass (no change made: a pin must come from a verified install, and the docs wording is out of Stage D scope).
- **Recommendations with impact/tests** are in the fragment: no Prisma 8 upgrade (RC); Dependabot bumps one at a time; **do not add `node-pty`** this cycle (concurs with §1).

## 7. Link checker (A-23 — fixed)

`scripts/check-links.mjs` hardened; validation rules for real links unchanged (what counts as broken/verified/skipped is the same — only the fetching is more patient and code examples are no longer mistaken for links):

- **Code stripping:** extraction strips fenced code blocks (triple-backtick and tilde) and inline code spans (single- and double-backtick) before matching links — the Stage B lesson. Offline external count went 610 → 604; the 6 dropped are all `example.com` placeholders inside one fenced block in `skills/seo/llms-txt/SKILL.md`. Internal links unchanged at 75.
- **Retry with backoff (online path):** 403/429 responses and network errors/timeouts retry up to 3 attempts (500ms, then 1000ms); non-retryable statuses return immediately. The HEAD-then-GET-fallback rule is preserved (GET fallback also retries).
- **Inter-request delay (online path):** 200ms between requests (not before the first, not for skipped URLs).
- **Testability:** helpers exported behind a main-guard (same pattern as the eval runner). **14 regression tests pass** (`test/links.test.mjs`, hermetic against a local stub server): extraction ignores code; 429→200, 403→200, timeout→200 each verify with exactly 2 hits; persistent 429 exhausts retries; 404 never retried; delay asserted loosely.

## 8. Vercel re-import (A-27 — fixed)

**Re-imported, verbatim, verified.** Baseline first: all 259 vendored Vercel files hash-compared against upstream at old pin `1a2c79d4` — **259/259 byte-identical**. Upstream diff confined to `web-design-guidelines` as expected (4 commits; SKILL.md 1.0.0 → 1.1.0 now reads bundled rules instead of fetching from `main`; new 191-line `references/command.md`; the zip changed but was not imported per original scope). Full diff read — pure guideline prose, no scripts; the change *removes* a network fetch. Imported files verified byte-identical to upstream at new pin **`5a37a6329fbad3666c3207392a6a7c0110e92efb`**; `command.md`'s SHA-256 matches the hash stated in the new SKILL.md (coordinator re-verified the hash and the diff scope independently). Records updated (`ATTRIBUTION.md`, `sources/imported-skills.md`); registry regen diff is the version bump only; CHANGELOG `Unreleased` entry added (UPDATE-PROCESS step 7). No eval case references this skill.

**Drift-check note:** `check:upstream` was re-run twice in Stage D. The first run (before the re-import) succeeded: 5 up-to-date, 1 behind (Vercel), 0 unknown. The second run (after the re-import, to confirm 6/0/0) hit the GitHub API rate limit (HTTP 403, 0 remaining) and returned 6 unknown — **recorded as Blocked, no further attempts made**. The re-import itself does not depend on that check: it was verified by git-protocol hash comparison against upstream at the new pin, which is stronger evidence than the drift summary. Stage E may re-run the drift check after the rate limit resets (hourly).

## 9. L-Prisma — headline still holds (consolidated, not redone)

Spot-checked against the official release-status page: **unchanged since Stage C** (same `2026-11-20T15:18:16Z` timestamp) — Prisma 8 still an RC with no GA date, `prisma` 8.0.0-rc.34, libraries rc.24, `@prisma/client` at 7.10.1, Prisma 6 EOL 19 Nov 2026. No docs edit needed: the pin-`prisma@7` / `npx prisma@7` stance is already in user-facing `skills/database/prisma/SKILL.md`, not only in the Stage C fragment. The GA upgrade path stays in `ai/remediation/stage-c/regression-145-review.md` §4. No upgrade to an RC is recommended.

## 10. Incidental fixes (coordinator's final pass)

- **Stale installer-test temp dirs:** `/tmp` (512 MB tmpfs) held 2,891 stale `skillforge-installer-test-*` directories (443 MB) because `makeSandbox()` never cleaned up — it broke a Node extraction and a Semgrep install during this stage. Fixed: an `after()` hook in `test/helpers.mjs` removes every sandbox when the importing test file finishes (verified: installer-suite run leaves the count unchanged). Stale dirs from earlier runs were removed.
- **NOTES.md check names:** corrected (see §3).
- **`.gitattributes`:** pins LF line endings on checkout (durable fix for the Windows leg's CRLF concern; changes no checked-out content).
- **CHANGELOG:** Vercel re-import entry under `Unreleased` (see §8).
- **`/home/hatch` setgid bit:** the CI agent's scratch work changed the home directory mode from 2770 to 0770 (the setgid bit does not stick on this overlay mount; chmod exits 0 but the bit does not persist). Permission bits are otherwise identical; no repo files affected. Noted here for the record.

## 11. Tests executed (coordinator's runs at the final HEAD, after the last edit)

| Command | Result |
| --- | --- |
| `npm test` | **232/232 pass, 0 fail, 0 skip** (196 Stage C baseline + 17 Windows + 14 links + 5 paths; per A-18 one counted entry is `test/helpers.mjs` with 0 tests → 231 real tests) |
| `node --test test/installer.test.mjs` | 97/97 pass |
| `node --test test/links.test.mjs` | 14/14 pass |
| `node --test test/paths.test.mjs` | 5/5 pass |
| `npm run evals` | 463/463 pass, 277/277 skills covered, 0 regressions vs baseline |
| `npm run validate` / `validate:strict` | PASS, 4 warnings (all pre-existing upstream, informational) |
| `npm run check:frontmatter` / `check:duplicates` / `check:sources` / `check:agents` / `check:registry` | all PASS |
| `npm run check:security` | PASS, no findings (1,062 text + 4 binary files, 29 patterns) |
| `npm run check:links` (offline) | PASS (75 internal, 604 external listed) |
| `npm run score` | Mean 87/100, 0 CRITICAL |
| `npm run registry` + hash check | Deterministic (zero diff on re-run) |
| `npm run check:upstream` | First run: 5 up-to-date, 1 behind, 0 unknown. Second run: **Blocked** (API rate limit, 6 unknown) — see §8 |
| Node 18.20.8 / 22.23.5 tarballs | `npm test` 196/196 + `npm run validate` exit 0 on both (CI agent, clean archive copy of HEAD) |
| Gitleaks 8.30.1 / TruffleHog 3.100.0 / Semgrep 1.186.0 | 0 real credentials / 0 verified / 0 findings (CI agent) |
| Workflow YAML + pins + script refs | 123 checks, 0 fail (CI agent's validator; coordinator spot-checked YAML parse + 2 pins) |

No failures, no skipped tests in the final battery (other than the pre-existing PTY skip where `script` is absent, which does not trigger on this machine).

## 12. Remaining risks and handoff notes for Stage E

1. **No real Windows execution has happened.** The junction fallback, the W-1/W-2/W-3 normalizations, and the Windows leg are all unproven on a real runner. The first PR run is the test; the fragment §9 checklist (junction classification first, junction removal safety second — the catastrophic case) is the acceptance list. Do not promote the leg to gating until it is green for real.
2. **No workflow has run on GitHub (L-CI).** All CI validation is local. The first push/PR after merge is the real test for all six workflows + the Windows leg.
3. **`check:upstream` needs a re-run** after the API rate limit resets, to confirm 6/0/0 post-re-import (see §8). The re-import evidence does not depend on it.
4. **CodeQL local run and `act` remain Blocked** (bundle size; Docker absent). CodeQL runs only via `codeql.yml` on GitHub.
5. **S-08/S-09 stay open upstream** (mitigated in docs); S-14 monitoring gap (weekly drift check watches the dormant fork); Tier-2 manifest-root residual (bounded); stale-lock window up to 10 min — all carried forward from Stages B/C, unchanged by Stage D.
6. **`npx skills add` fetches Vercel's CLI unpinned** (see §6) — recommend pinning a verified CLI version at the next docs pass.
7. **Test-count nuance (A-18, Stage E):** `npm test` prints 232; 231 are real tests (`test/helpers.mjs` counts as a 0-test file entry). Stage E should re-baseline headline numbers and resolve A-18.
8. **Pre-existing Windows-written manifests** keep backslash roots (§1); the broken-link `already` quirk predates Stage D; rename retries in `swapIn` were deliberately not added (would widen the two-rename window).
9. **Element-14 (Accessibility) enforcement** is still inconsistent across the library (Stage C note, unchanged).

## 13. Commits (Stage D, all on `feat/skillforge-production-upgrade`)

| SHA | Content |
| --- | --- |
| `e1fc528` | CI validation — concurrency controls + advisory Windows leg (L-CI, L-Win) |
| `103dcc1` | Windows `--link` junction fallback + prompt streams injection (A-11, A-29, L-Win) |
| `0c64a2c` | Link-checker hardening + Vercel re-import (A-23, A-27) |
| `43f3c99` | Windows path normalization + test hygiene (W-1/W-2/W-3) |
| `74c9ced` | This results file, issue-register updates, execution-log entry |
| `92c6d19` | Record closing commit SHA in results file |

Stage D started at head `ccfb4d1` (Stage C done). All 36 new tests (17 installer + 14 links + 5 paths) pass; the full battery is green at the final HEAD, run after the last edit.
