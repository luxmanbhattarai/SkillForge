# Windows Junction Validation

Group D, Phase 11 — real-junction tests for the SkillForge
installer (`test/windows-junction.test.mjs`).

## Status

**PENDING — Windows validation has NOT run yet.** The tests in
`test/windows-junction.test.mjs` execute only on Windows. They
have been verified to skip cleanly on Linux (12 tests, 12 skipped,
0 failures — see "Linux results" below) and are syntactically valid
for Windows, but no Windows run has executed them yet. The results
section at the end of this document is reserved for the coordinator
to fill in from the actual CI run that executes these tests (the
coordinator designates the run — a PR run or a main-branch run,
per the branch decision). **Do not claim Windows validation passed
until that run is recorded here.**

## Why mocked-filesystem tests are insufficient

The installer already has junction unit tests
(`test/installer.test.mjs`, A-11): they drive `createLink()` with
an injected `symlinkFn` that throws EPERM, proving the fallback
LOGIC on any platform. Those tests cannot prove any of the
following, because none of it exists in a mock:

- That `fs.symlink(target, path, 'junction')` actually creates a
  working junction on a real Windows filesystem, and that the
  junction resolves to the target for readers (`readlink`,
  `readdir`, `stat`, `readFile` through the link).
- That a real junction's `readlink()` output compares equal to the
  computed source path under the NT namespace prefix (`\??\`) and
  case-insensitivity rules `sameLinkTarget()` implements. The
  prefix behavior depends on the Node/libuv version and the OS;
  only a real junction produces a real `readlink()` result.
- That `fs.rm()` on a junction removes only the junction and never
  follows it into the library — the catastrophic failure mode
  flagged by the Stage D analysis
  (`ai/remediation/stage-d/windows-link-analysis.md`). A mock
  `rm` proves nothing about this; only a real junction with a
  real, hashed target tree proves the target survives
  byte-identical.
- That junctions work without elevation (no Developer Mode, no
  administrator) on a real runner, while symlink creation in the
  same directory fails with EPERM — the privilege asymmetry the
  whole fallback exists for.
- That junctions span local volumes (cross-drive), that junction
  creation fails cleanly for a missing target (unlike a symlink,
  which may dangle), and that ACL-denied directories produce clean
  per-item failures rather than crashes or partial installs.
- That the backup/restore round-trip preserves a link install end
  to end through the real CLI.

The A5-11 test (`test/audit-fixes-c4.test.mjs`) proved one real
junction behavior — uninstall removes a junction without following
it — and it executed and passed on a real Windows runner (PR #4 /
PR #5 CI). This file extends that real-junction coverage to the
rest of the junction surface. It does not duplicate A5-11.

## What is real and what is honestly simulated

Every junction in the suite is a REAL junction on a real Windows
filesystem, created by the installer CLI itself, by
`fs.symlink(..., 'junction')` directly, or by the real
`createLink()` code path. No filesystem is mocked anywhere.

The ONE simulated input is the EPERM that makes symlink creation
fail: a test process cannot drop its own privileges, so the tests
that need "symlink creation denied" use `createLink()`'s injectable
`symlinkFn` to throw EPERM for the symlink attempt while delegating
the junction attempt to the REAL `fs.symlink`. The fallback
decision, the junction creation, and everything after it are real;
only the privilege denial is injected. Where the runner genuinely
denies symlinks (Developer Mode off), the CLI fallback test covers
the path with no injection at all — and skips with a clear reason
when the runner permits symlinks instead.

## Test coverage

`test/windows-junction.test.mjs` — 12 tests, all platform-guarded
(skip cleanly on non-Windows via the test-context `t.skip()`):

| # | Test | What it proves |
| --- | --- | --- |
| 1 | the real CLI --link install falls back to a junction when symlinks are not permitted | End-to-end fallback with NO injection, when the runner genuinely denies symlinks. Asserts the CLI prints `(junction)`, the link resolves, the manifest records method `link`. Skips (with reason) on runners that permit symlinks. |
| 2 | createLink falls back to a real junction when symlink creation fails with EPERM | The core fallback: injected EPERM on the symlink attempt, REAL junction creation. Asserts the return value is `'junction'`, the junction resolves to the source, and a RELATIVE target resolves against the link's parent. Junction removal leaves the source byte-identical. |
| 3 | target resolution — readlink, readdir, and stat see through a real junction | Real junction semantics: `readlink` + `sameLinkTarget` across NT prefixes (`\??\`), case differences, and trailing separators; `readdir`/`stat`/`readFile` see through the junction; `lstat` still reports a link. |
| 4 | creation fails cleanly for a missing target | Junctions require an existing target (unlike symlinks). Direct creation fails with ENOENT; through `createLink` the error reports BOTH attempts (`['symlink', 'junction']`). |
| 5 | existing-destination handling — real dir, foreign junction, and matching junction | A real dir at the destination is refused untouched; a junction pointing elsewhere is refused (junction + foreign target untouched); a junction already pointing at the source is ADOPTED into the manifest. |
| 6 | broken-junction handling — doctor fails, uninstall removes only the junction | After the target is deleted: doctor fails with `broken symlink` (no crash), validate fails (`SKILL.md is missing`), uninstall removes only the junction and succeeds. |
| 7 | non-administrator operation — junctions work without elevation | Elevation is detected with `net session`. When NOT elevated: direct junction creation, the `createLink` fallback, and the CLI `--link` install all work; when Developer Mode is also off, a plain symlink attempt fails with EPERM in the same directory. Skips the strict assertion when elevated or when elevation cannot be determined. |
| 8 | permission restrictions — creation inside a write-denied directory fails cleanly | An `icacls` deny ACE blocks writes to a directory (verified by a probe write first — the test SKIPS if the deny does not take effect). Direct junction creation fails with EPERM/EACCES; the CLI `--link` install fails cleanly with a per-item failure and installs nothing. ACLs are always restored in a `finally` block. |
| 9 | removal behavior — rm and rename affect only the junction, never its target | Direct recursive `rm` on a junction and direct `rename` of a junction (what `swapIn` does) touch only the junction; the target survives byte-identical. CLI `uninstall --all --force` removes two junctions; both sources survive byte-identical. |
| 10 | recovery from interrupted operations — stale staging junctions are cleaned, trash junctions survive | A planted staging junction is removed by the next install WITHOUT following it into the library; a planted trash junction survives and doctor warns about it. A manifest entry with a missing destination (kill between `swapIn`'s renames) is reinstalled by `update`. |
| 11 | cross-drive behavior — a junction can point at another local volume | When a second writable drive exists: a junction on the temp drive pointing at the second drive resolves, and a CLI `--link` install from a library on the second drive works end to end. Skips with a reason when no second drive exists. |
| 12 | backup and restore round-trip preserves a link install | Replacing a junction install with a copy install (`--force`) backs the junction up AS A LINK (`isSymlink: true` in `backup.json`); restoring the backup brings the link back pointing at the source, with manifest method `link`, and doctor passes. |

## How the gating Windows CI leg executes them

- **Workflow:** `.github/workflows/validate-skills.yml` (name:
  "Validate skills")
- **Job:** `windows` (display name: **"Windows (Node 24)"**)
- **Runner:** `windows-latest`
- **Node:** 24 (via `actions/setup-node` v7.1.0)
- **Command:** `npm test` (runs the full regression suite,
  including this file and the A5-11 junction test)
- **Gating:** "Windows (Node 24)" is a REQUIRED status check on
  `main` under branch protection (verified 2026-11-21 via the
  GitHub API: 10 required checks, strict, `enforce_admins: false`).
  A failure in this job fails the run and blocks the merge.
- **Job timeout:** 20 minutes. The junction tests add only
  seconds to the suite (each test is a handful of CLI runs plus
  direct filesystem calls).
- **Checkout:** `core.autocrlf false` is set before checkout, so
  test files keep LF endings.

### Non-privileged environment expectation

GitHub-hosted Windows runners run jobs as a non-elevated user
(the runner account is a local administrator, but processes run
with a filtered, non-elevated token under UAC, and Developer Mode
is enabled on the image so symlink creation usually SUCCEEDS).
Consequences for this suite on the CI run:

- Test 7 (non-admin operation) is expected to RUN (not skip):
  `net session` should report non-elevated, and junction creation
  must succeed. If the process reports elevated, the test skips
  its strict assertion with a reason — that is an environment
  signal, not a pass.
- Test 1 (no-injection CLI fallback) is expected to SKIP on the
  GitHub runner, because Developer Mode lets symlink creation
  succeed and the fallback never engages. That skip is the honest
  outcome there; the fallback itself is proven by test 2 (real
  junction, injected EPERM) and by test 7's asymmetry check when
  Developer Mode is off.
- Test 11 (cross-drive) is expected to RUN: `windows-latest`
  runners have a second local drive (D:). If it skips, the job log
  will say why (no second writable drive found).

## Linux results (verified locally)

```
node --test test/windows-junction.test.mjs
ℹ tests 12
ℹ pass 0
ℹ fail 0
ℹ skipped 12
```

All 12 tests skip cleanly on Linux with the message "junctions
exist only on Windows; the Windows CI leg runs this test". The
suite stays green on Linux. Syntax checked with
`node --check`. The test code uses only portable APIs on paths
that run on Windows (`path.join`, `fs.cp`-style calls via the
installer, `node:fs/promises`); the Windows-only calls
(`icacls`, `net session`) are guarded behind the platform check
and behind availability probes.

## Results from the CI run — PENDING

> **This section is intentionally empty.** The coordinator fills it
> in from the actual pull-request CI run. Do not fill it in from
> local runs, mocks, or expectations.

Evidence to collect from the CI run:

- [ ] Workflow run ID (the `validate-skills.yml` run on the
      hardening branch head, or on `main` if the work lands
      there directly) and the `windows` job ID.
- [ ] Job conclusion (must be `success` for the leg to gate).
- [ ] Per-test results from the job log for
      `test/windows-junction.test.mjs`: which of the 12 tests
      passed, and which skipped (with the skip reason shown in the
      log — expected: test 1 skips when Developer Mode permits
      symlinks; tests 7/8/11 skip only if their environment probes
      fail, and the reason must be recorded).
- [ ] The A5-11 junction test (`test/audit-fixes-c4.test.mjs`)
      result from the same job log (it must execute and pass, as
      on PR #4 / PR #5).
- [ ] Any failure output, verbatim, for follow-up.

## Known gaps

- The no-injection CLI fallback (test 1) can only execute on a
  Windows machine WITHOUT Developer Mode and without symlink
  privilege. The GitHub runner has Developer Mode on, so that
  exact path is proven there only by test 2's injected-EPERM
  variant. A locked-down Windows machine (or a runner image with
  Developer Mode off) would be needed to execute test 1 for real.
- Junction-to-UNC-target behavior (junctions cannot reference
  network paths) is NOT tested: no reliable UNC target exists on
  a CI runner, and a negative test against a nonexistent share
  would prove only that the target must exist (already covered by
  test 4).
- The suite does not distinguish a junction from a directory
  symlink by reparse-point tag (Node exposes no such API):
  tests that need a guaranteed junction create one directly with
  `fs.symlink(..., 'junction')` or through the injected-EPERM
  `createLink` path, where the form is known by construction.
  Tests that go through the CLI assert link-ness
  (`isSymbolicLink`) and target resolution, not the specific
  form, because the form depends on runner privilege.
