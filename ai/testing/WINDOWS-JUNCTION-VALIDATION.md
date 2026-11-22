# Windows Junction Validation

Group D, Phase 11 — real-junction tests for the SkillForge
installer (`test/windows-junction.test.mjs`).

## Status

**COMPLETE — Windows validation PASSED on the gating CI leg.**
Run **44979125717** (Validate skills, main @ `14ec4e7`,
2026-11-22T03:17Z), job **137077521338** ("Windows (Node 24)",
`windows-latest`, Node 24): job conclusion `success`. Full-suite
Windows totals: **667 tests, 658 pass, 0 fail, 9 skipped**.
Of the 12 junction tests: **9 passed, 3 skipped with honest
environment reasons** (see "Results from the CI run" below).
The A5-11 junction test also passed in the same job.

An earlier run on the same suite (44977739625, main @ `6199f83`)
failed one junction test and exposed a wrong assumption in the
test and in the Stage D analysis — see the note under test 4 and
in "Results from the CI run".

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
- That junctions span local volumes (cross-drive), that a
  junction to a missing target DANGLES (it does — see the test 4
  note below; the clean failure for a missing target comes from
  `createLink`'s opt-in `requireTarget` check on the install
  path, not from the OS), and that ACL-denied directories produce
  clean per-item failures rather than crashes or partial installs.
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
| 4 | a missing target dangles (raw) but createLink with requireTarget fails cleanly | **Corrected 2026-11-22 (commit `ebb5b0f`):** the original test assumed a junction's target must exist at creation time — that assumption was WRONG. Run 44977739625 proved it: on Windows, neither `fs.symlink(..., 'junction')` nor a directory symlink validates the target; both succeed and dangle (as on POSIX). The rewritten test asserts the real behavior: a raw junction to a missing target SUCCEEDS and dangles (`readlink` works, `stat` throws ENOENT); `createLink` with the opt-in `requireTarget: true` (used by the install path) rejects cleanly with a `LinkError` naming the target before any link attempt; without `requireTarget` the dangling link is still created (backup/restore must recreate broken links). The Stage D analysis doc (`ai/remediation/stage-d/windows-link-analysis.md` §1.2 item 5, §1.3) and the `links.mjs` module comment were corrected with dated notes in the same commit. |
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

### Non-privileged environment expectation — actual outcome

GitHub-hosted Windows runners run jobs as a non-elevated user
(the runner account is a local administrator, but processes run
with a filtered, non-elevated token under UAC, and Developer Mode
is enabled on the image so symlink creation usually SUCCEEDS).
Consequences for this suite on the CI run:

- Test 7 (non-admin operation) was expected to RUN — instead it
  SKIPPED on run 44979125717: `net session` reported the process
  ELEVATED on that runner, so non-admin operation could not be
  proven there. Junction creation itself is still verified by the
  other tests; the non-elevation property remains unproven on CI.
- Test 1 (no-injection CLI fallback) SKIPPED as expected, because
  Developer Mode lets symlink creation succeed and the fallback
  never engages. That skip is the honest outcome there; the
  fallback itself is proven by test 2 (real junction, injected
  EPERM) and by test 7's asymmetry check when Developer Mode is
  off.
- Test 8 (permission restrictions) SKIPPED: the `icacls` deny ACE
  did not block writes in that environment, so the permission
  failure could not be demonstrated. ACL-denied-directory behavior
  remains unproven on CI.
- Test 11 (cross-drive) RAN and PASSED: the `windows-latest`
  runner has a second local drive (D:), and a junction on the temp
  drive pointing at the second drive resolved, with a CLI
  `--link` install from a library on the second drive working
  end to end.

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

## Results from the CI run — PASSED

- **Workflow run:** 44979125717 ("Validate skills",
  `.github/workflows/validate-skills.yml`), main @ `14ec4e7`
  (`14ec4e7e03d4d711ef8814c61aebadc0aa48099f`), 2026-11-22T03:17Z.
- **Job:** 137077521338 ("Windows (Node 24)"), conclusion
  `success`. The other three jobs in the same run also passed
  (Validate (Node 24), Behavioral evals, Registry), and Lint,
  Security audit, and CodeQL were green on the same head.
- **Full-suite Windows totals:** 667 tests, 658 pass, 0 fail,
  9 skipped. (Linux on the same run: 663 tests, 650 pass, 0 fail,
  13 skipped; the totals differ because platform-guarded subtests
  execute only on one platform.)
- **The 9 skips:** 3 junction tests (below) + 1 integration
  permission test (chmod-based, does not apply on Windows) +
  1 chmod subtest + 4 PTY subtests (`script` not found on PATH).

### Per-test results (`test/windows-junction.test.mjs`)

| # | Test | Result |
| --- | --- | --- |
| 1 | the real CLI --link install falls back to a junction when symlinks are not permitted | SKIPPED — this runner permits symlink creation (Developer Mode); the no-injection fallback path cannot engage here — see the fault-injected fallback test |
| 2 | createLink falls back to a real junction when symlink creation fails with EPERM | PASS |
| 3 | target resolution — readlink, readdir, and stat see through a real junction | PASS |
| 4 | a missing target dangles (raw) but createLink with requireTarget fails cleanly | PASS (rewritten after the round-1 failure — see below) |
| 5 | existing-destination handling — real dir, foreign junction, and matching junction | PASS |
| 6 | broken-junction handling — doctor fails, uninstall removes only the junction | PASS |
| 7 | non-administrator operation — junctions work without elevation | SKIPPED — this process is running elevated, so non-admin operation cannot be proven here — junction creation is still verified |
| 8 | permission restrictions — creation inside a write-denied directory fails cleanly | SKIPPED — the icacls deny ACE did not block writes in this environment, so the permission failure cannot be demonstrated |
| 9 | removal behavior — rm and rename affect only the junction, never its target | PASS |
| 10 | recovery from interrupted operations — stale staging junctions are cleaned, trash junctions survive | PASS |
| 11 | cross-drive behavior — a junction can point at another local volume | PASS |
| 12 | backup and restore round-trip preserves a link install | PASS |

**9 passed, 3 skipped, 0 failed.**

### A5-11 junction test (same job)

`test/audit-fixes-c4.test.mjs` — **PASS**: "A5-11 (junction):
uninstalling a real Windows junction removes only the junction;
the library source survives intact" (182.8 ms). The A-11
fault-injected `createLink` unit tests also passed on Windows.

### Round 1 failure and fix (honest record)

The first CI run of this suite on main (44977739625, @ `6199f83`,
2026-11-22) failed test 4: "Missing expected rejection". The
test assumed `fs.symlink(..., 'junction')` rejects for a missing
target; on Windows it succeeds and dangles. The same run failed
two unrelated tests (`quality-trends` CLI compare and
`skill-history` `--json`) for a shared cause: both CLIs guarded
their main block with
`import.meta.url === \`file://${process.argv[1]}\``, which can
never match on Windows (backslashes in `argv[1]` vs forward
slashes in the URL), so both CLIs silently did nothing. Fixes
(commits `122b680`, `ebb5b0f`, on main): both CLIs now use the
repo's established `path.resolve`/`fileURLToPath` guard; test 4
was rewritten to assert the real dangling behavior plus the new
opt-in `createLink` `requireTarget` check. All three tests pass
on Windows in run 44979125717. The Linux job on the same first
run also failed (recorded runner counts were local as-root
numbers; fixed by recording CI-measured counts in `69c2107`).

## Known gaps

- The no-injection CLI fallback (test 1) can only execute on a
  Windows machine WITHOUT Developer Mode and without symlink
  privilege. The GitHub runner has Developer Mode on, so that
  exact path is proven there only by test 2's injected-EPERM
  variant. A locked-down Windows machine (or a runner image with
  Developer Mode off) would be needed to execute test 1 for real.
- Junction-to-UNC-target behavior (junctions cannot reference
  network paths) is NOT tested: no reliable UNC target exists on
  a CI runner. Note this is a different failure mode from a
  missing local target, which dangles rather than failing (see
  test 4).
- The suite does not distinguish a junction from a directory
  symlink by reparse-point tag (Node exposes no such API):
  tests that need a guaranteed junction create one directly with
  `fs.symlink(..., 'junction')` or through the injected-EPERM
  `createLink` path, where the form is known by construction.
  Tests that go through the CLI assert link-ness
  (`isSymbolicLink`) and target resolution, not the specific
  form, because the form depends on runner privilege.
