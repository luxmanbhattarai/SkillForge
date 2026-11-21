# Stage D — Windows `--link` analysis, junction fallback, and the node-pty decision

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; nothing pushed)
- **Scope:** A-11 (Windows `--link`: no junction fallback), A-29 (paths with
  spaces/Unicode untested), L-Win (Windows `--link` EPERM path untested), and
  the node-pty decision left open by Stage C (STAGE-C-RESULTS.md §4/§9).
- **Method:** static inspection of `scripts/install/` + simulated tests only.
  No Windows runner is available locally, so **no claim in this document rests
  on real Windows execution**. Every behavior is labeled with what proves it:
  **Proven** (official docs and/or a passing test), **Assumed** (reasoned from
  docs/source behavior, needs a real Windows run to confirm), or **Blocked**
  (unverifiable without real Windows execution).

## 0. What changed (summary)

| Area | Change |
| --- | --- |
| `scripts/install/links.mjs` (new) | `createLink()` (symlink with junction fallback), `sameLinkTarget()` (NT-prefix/case-tolerant link comparison), `isWindowsLockError()` / `lockErrorMessage()`, `rmRecursiveOptions()` (Windows rm retries) |
| `scripts/install/installer.mjs` | `stageItem()` uses `createLink()` (injectable `fsOps`); `linkPointsAtSource()` / `verifyStaged()` compare via `sameLinkTarget()`; `cleanStaleStaging()` returns `{ removed, skipped }` and skips Windows-locked leftovers instead of aborting; `swapIn()` / `rollbackFromBackup()` wrap Windows lock errors and use retrying rm options; `relativeRoot()` stores `/`-separated roots |
| `scripts/install/backups.mjs` | `createBackup()` / `stageBackupItem()` recreate links via `createLink()` with the kind-correct type and junction fallback (previously typeless `symlink()`, see §5); rm options with Windows retries |
| `scripts/install/commands.mjs` | Junction noted in the run log (`(junction)` vs `(symlink)`); doctor's link comparison via `sameLinkTarget()`; uninstall rm uses retrying options + lock note; stale-cleanup handles `skipped`; quarantine-rename failure gets a lock note |
| `scripts/install/manifest.mjs` | `writeManifest()` rename failure gets a Windows lock note |
| `scripts/install/prompt.mjs` | `setPromptStreams()` / `resetPromptStreams()` — injected prompt streams (node-pty decision, option c; see §6) |
| `test/installer.test.mjs` | 17 new tests (80 → 97 in the installer suite); `test/helpers.mjs` `runCliPty` comment updated to the decision |
| `docs/INSTALLATION.md` | `--link` bullet and Windows troubleshooting rewritten for the junction fallback |

POSIX behavior is unchanged by construction: every Windows branch is gated on
`process.platform === 'win32'` (or an injected platform in tests), and the
full installer suite passes on Linux (97/97).

## 1. Junction semantics — what the research established

Sources: Node.js `fs` documentation (`fs.symlink`, `fs.rm`), Microsoft
documentation on NTFS links and `mklink`, the NTFS reparse-point reference,
libuv's filesystem documentation, and Node issue #62653 (a `fs.cp` bug that
demonstrates the typeless-symlink hazard on Windows — see §5).

### 1.1 Proven (official documentation)

- **Junctions need no privilege.** Creating a directory junction requires no
  administrator rights and no Developer Mode. Creating a symlink requires the
  `SeCreateSymbolicLinkPrivilege` privilege, which a normal user has only with
  Developer Mode enabled (Windows 10 1703+) or an elevated process.
- **Junctions are directories-only, absolute-target-only, local-volumes-only.**
  They cannot point at a file, cannot store a relative target, and cannot point
  at a network (UNC) path. They *can* point at a directory on another local
  drive.
- **Node's `fs.symlink(target, path, 'junction')`** creates a junction; the
  target is automatically normalized to an absolute path. The `type` argument
  is Windows-only and ignored on other platforms. When `type` is omitted, Node
  auto-detects `dir`/`file` by stat-ing the target and defaults to `file` when
  the target does not exist.
- **Junction substitute names are stored in NT namespace form** — a `\??\`
  prefix before the drive path (e.g. the stored form of `C:\lib\skill` is
  `\??\C:\lib\skill`). Any code comparing a `readlink()` result against a
  computed path must tolerate that prefix, or the comparison fails for
  junctions even when the link is correct.
- **Node's `fs.rm` retries EBUSY/EPERM** when `maxRetries` is set (linear
  backoff, `retryDelay` longer on each try; only in recursive mode). This is
  the documented mechanism for transient Windows file locks (antivirus,
  indexer, search).
- **Deleting a junction removes the junction, not its target** — at the OS
  level, removing a reparse point (via `rmdir` / directory removal) deletes
  only the link. The same holds for renaming one: the junction itself moves.

### 1.2 Assumed (reasoned, needs a real Windows run to confirm)

These are the load-bearing assumptions. Each is marked with why it is believed
and what breaks if it is wrong.

1. **Node reports a junction as a symbolic link from `lstat()` and from
   `readdir()` Dirents, and `readlink()` returns its target.** Basis: libuv
   maps the mount-point reparse tag (`IO_REPARSE_TAG_MOUNT_POINT`, the tag
   junctions share with volume mount points) to the symlink file type, the
   same as the symlink tag; and widely used tools (notably pnpm, whose Windows
   installs are junctions throughout) rely on Node detecting junctions via
   `lstat().isSymbolicLink()`. **If wrong:** every classify/verify/doctor path
   would misread a junction install — `classifyInstall` would call it a
   conflict ("a copied file or directory already exists here"), `doctor` would
   report "should be a symlink but is a real file/directory", and adoption
   would fail. This is the single most important item for the first real
   Windows run (§7, check 1).
2. **`readlink()` on a junction returns a usable target path.** Current libuv
   strips the `\??\` prefix; older versions reportedly did not. The code does
   not depend on which: `sameLinkTarget()` strips both `\??\` and `\\?\`
   prefixes and compares case-insensitively on Windows. **If wrong in some
   other way** (e.g. a different prefix form), `linkPointsAtSource()` returns
   false and a junction install classifies as a conflict on the next run —
   annoying, not destructive.
3. **`fs.rm(path, { recursive: true })` on a junction removes only the
   junction.** Follows from (1): Node's recursive remove lstats the top-level
   path first, sees a symlink, and unlinks it rather than recursing into it;
   and the OS removes only the reparse point. **If wrong, the failure mode is
   catastrophic:** a recursive remove that followed the junction would delete
   the *library* contents (uninstall, rollback, and stale-cleanup all call
   recursive rm on paths that can be links). This is the highest-risk
   assumption in this document and the second item for the first real Windows
   run (§7, check 2). Note there is no pure-Node defense against it: Node
   exposes no API to read a reparse tag, so every guard would rest on the same
   `lstat()` claim — the mitigation is the real-Windows check, not more code.
4. **`fs.rename()` on a junction renames the junction itself.** Follows from
   OS semantics (a rename moves the directory entry, and a junction is a
   directory entry with reparse data). `swapIn` depends on this for both the
   staged→dest rename and the dest→trash rename of an old junction install.
   **If wrong:** the swap would fail loudly (rename error), not silently —
   the failure mode is a failed install, not data loss.
5. **A junction's target must exist at creation time.** `mklink /J` does not
   check this, but the filesystem-level creation does in practice for the
   paths Node creates. The installer's junction target is always the library
   source, which exists (it was just hashed by `computePlanned`), so this only
   matters if the library disappears mid-run — in which case the junction
   attempt fails and the error is reported.

### 1.3 The symlink-first decision (A-11)

The fallback tries a real directory symlink first and retries as a junction
only when the symlink fails with EPERM on Windows. Junction-first was
considered and rejected:

- A symlink is the better link where it can be created: it supports relative
  targets and network targets, and it is the form every other platform uses,
  so Developer Mode / admin users see no behavior change at all.
- The fallback only changes behavior for users who would otherwise get an
  error — it turns a hard failure into a working install, with the run log
  saying which form was used (`(junction)` vs `(symlink)`).
- Junctions have quirks a symlink does not (absolute-only targets, no UNC,
  target must exist), so they are the degradation, not the default.

Only EPERM is retried. Any other failure (missing target, existing
destination, bad path) would fail identically as a junction, and retrying
would only hide the real error. File links are never retried: junctions cannot
point at files, so agents/workflows keep the clear privilege error (they are
always copied anyway — `computePlanned` forces `method: 'copy'` for them —
so the file-link branch is defensive only).

## 2. Behavior matrix

"Code does" is what the code does as read (statically verified).
"Sim-tested" means a test in `test/installer.test.mjs` proves it on POSIX.
**Blocked** means it needs real Windows execution; nothing here claims it.

| # | Behavior | What the code does | Statically verified | Sim-tested | Blocked (needs real Windows) |
| --- | --- | --- | --- | --- | --- |
| 1 | Symlinks (`--link`, privileged) | `stageItem` → `createLink` creates a `dir` symlink; manifest records `method: 'link'`; log says `(symlink)` | Yes | Call sequence (fault-injected `symlinkFn` returning success on `dir`) — implicitly, via the fallback tests' first call | Real `dir` symlink creation on Windows; Developer Mode / admin detection is not attempted (the code tries and handles the error) |
| 2 | Junctions (`--link`, unprivileged) | On EPERM, `createLink` retries with type `junction` (target resolved absolute against the link's parent); manifest still records `method: 'link'`; log says `(junction)` | Yes | Yes — EPERM→junction sequence, return value, relative-target resolution (fault-injected) | Real junction creation; `lstat`/`readlink` behavior on junctions (§1.2 assumptions 1–2); the `(junction)` log line on a real run |
| 3 | Permissions (symlink privilege) | No privilege probing: the code attempts the symlink and reacts to EPERM. The error names Developer Mode / admin as the fix | Yes | Yes — EPERM paths (both attempts failing; file-link EPERM) | That Windows reports the denial as EPERM (rather than EACCES) for unprivileged symlink creation |
| 4 | Developer Mode | No special-casing: with Developer Mode on, the first (symlink) attempt succeeds and no junction is ever created; with it off, the fallback applies | Yes | Logic only (the fallback triggers on EPERM, which is what Developer Mode off produces) | End-to-end: Developer Mode on → symlink; off → junction |
| 5 | Paths with spaces | Pure `fs` ops via `execFile` (no shelling anywhere in the installer), so spaces are inert | Yes | Yes — CLI install with a spaced project dir and a spaced `--dest` | Spaced paths on Windows specifically (same code path; the OS separator differs, the logic does not) |
| 6 | Long paths (>260 chars) | The installer imposes no length limit of its own | Yes | Yes — CLI install to a >260-char `--dest` on POSIX | Windows long-path support: whether the OS/Node long-path configuration allows >260-char paths (Node enables long paths when the Windows configuration permits; the installer cannot control that) |
| 7 | Existing destinations | Link method + existing symlink pointing at the source → `already`; pointing elsewhere → conflict; existing copy → conflict. Copy method + existing symlink → conflict. Junctions follow the symlink branches via `isSymbolicLink()` | Yes | Symlink cases covered by pre-existing tests; junction cases rest on assumption 1 | Junction at the destination classified as `already` / conflict correctly |
| 8 | Broken links | `linkPointsAtSource` compares the readlink *string*, not target existence: a link pointing at the (now missing) library source still classifies as `already` — for symlinks and junctions alike (pre-existing behavior, not junction-specific). `doctor` does check existence and reports `broken symlink` as a failure | Yes | No new test (pre-existing behavior, unchanged) | That a broken junction still yields its target string from `readlink()` |
| 9 | Rollback of linked installs | Post-swap verification failure → `rollbackFromBackup`: restores from the pre-replacement backup (link recreated via `createLink`, junction fallback applies) or removes a fresh bad install | Yes — traced, see §4 | Backup/restore link recreation is fault-injected (§4); the post-swap branch itself is unit-level only (pre-existing A-06 note: unreachable via CLI after a passing pre-swap check) | Real-junction rollback end to end |
| 10 | Restore behavior | Backed-up links are recreated (not copied) via `createLink` with the kind-correct type and junction fallback; the manifest entry keeps `method: 'link'`; post-swap hash compares `link:<readlink>` strings on both sides, so prefix behavior is consistent | Yes — traced, see §4 | Yes — `stageBackupItem` fault-injected junction fallback | Real-junction restore end to end; a restore that recreates a junction as a symlink on a privileged machine (or vice versa) — expected to work, unobserved |
| 11 | Path separators | All path building uses `path.join`/`resolve`/`relative` (platform-native). Manifest validation splits roots on both separators and rejects Windows absolute/UNC roots. `relativeRoot` now stores `/`-separated roots so manifests stay portable across platforms (see §3) | Yes | Yes — validation accepts `..\agents`, rejects `C:\…` and `\\server\…` roots; tier-1 degrades to tier-2 for Windows-style skills dirs on POSIX; `relativeRoot` forward-slash output | Real win32 resolution of `/`-separated manifest roots; tier-1 exact-root validation with real Windows paths |

## 3. Path handling notes (Stage D findings)

- **Manifest roots are now stored with forward slashes.** `relativeRoot()`
  previously returned `path.relative()` verbatim, which on Windows yields
  backslashes (`..\agents`). A project-scope manifest travels via git, so a
  Windows-written root would resolve on POSIX as a single literal directory
  name (`..\agents`) instead of the agents directory — silently wrong for
  agent/workflow entries (skill entries always have root `.`, so they were
  unaffected). `relativeRoot()` now normalizes to `/`; Windows path functions
  accept forward slashes, and the validators already split on both separators.
  Manifests written on Windows *before* this change keep their backslash roots
  (still valid on Windows, still non-portable to POSIX) — a known limitation,
  not worth a migration.
- **Tier-1 root validation cannot run on POSIX for Windows paths** (it splits
  the skills dir on the platform separator). It fails closed to the tier-2
  shape check, which is proven by test. Tier-1 with real Windows paths is
  Blocked.
- **`path.win32` is used in tests to *construct* Windows inputs** (absolute
  roots, UNC roots, skills dirs) for the platform-independent validators. The
  installer's own path helpers (`entryRoot`, `entryDest`, `resolveLocations`)
  are platform-native and cannot be meaningfully exercised with Windows paths
  on POSIX — that is a stated limitation, not an oversight.

## 4. Rollback / restore of links — code trace

Question: does `createBackup` copy link *targets* or the *link*?

**The link.** `createBackup` (`backups.mjs`) lstats each item: for a symlink
it calls `createLink(await readlink(destAbs), dst, { kind })` — the backup
holds a *new link with the same target string*, not a copy of the target
directory. The backup record marks it `isSymlink: true` and records the
manifest entry (root/destName) needed to restore it. Consequences:

- A backup of a link install is cheap (no content copied) and faithful (the
  restored link points at the same library source).
- A backup of a *broken* link still works: `readlink` does not need the
  target to exist. (Before Stage D, the typeless `symlink()` call would have
  recreated a broken *directory* link as a *file* link, because Node's
  auto-detect defaults to `file` when the target is missing — see §5.)
- `recoverBackupRecord` (corrupt `backup.json`) reconstructs `isSymlink` from
  lstat of the stored item, so a recovered backup also restores links as links.

**Restore path** (`runRestore` → `stageBackupItem` → `swapIn`):
`stageBackupItem` recreates the link at a staging path next to the
destination via `createLink` (junction fallback applies), then `swapIn`
renames it into place. Post-swap verification compares
`link:<readlink(dest)>` against `link:<readlink(stored)>` — both sides go
through `readlink` on the same machine, so any NT-prefix behavior is
identical on both sides and no normalization is needed there. The manifest
entry is refreshed from the backup's embedded entry (`method: 'link'`
preserved) or rebuilt from the library.

**Rollback path** (`rollbackFromBackup`, used by install/update/restore on
post-swap verification failure): if the run's pre-replacement backup holds
the item, its content is staged with `stageBackupItem` (link recreated via
`createLink`) and swapped back in; otherwise the bad install is removed with
recursive rm. For a link install, "removed" means the link is removed — which
rests on assumption 3 (§1.2).

**Uninstall of a link install:** recursive rm of the link path (assumption 3
again). Link-method items are backed up on uninstall only when they are no
longer in the library (A-14) — otherwise the library is the backup.

## 5. Two Windows bugs fixed along the way

1. **Typeless `symlink()` in backup/restore.** `createBackup` and
   `stageBackupItem` called `symlink(target, path)` with no `type`. On
   Windows, Node then auto-detects `dir`/`file` by stat-ing the target and
   defaults to `file` when the target is missing — so a broken directory link
   was backed up (and restored) as a *file* link, which Windows treats as
   broken even after the target returns. Node issue #62653 documents the same
   hazard in `fs.cp`. Both call sites now pass the kind-correct type via
   `createLink`, which also gives them the junction fallback: without it, any
   backup/restore of a link install on an unprivileged Windows machine would
   fail at link creation even though the install itself had succeeded via a
   junction.
2. **Backslash manifest roots** (§3): `relativeRoot` now stores `/`-separated
   roots.

## 6. EBUSY / file-locking review (rename/rm paths)

Windows fails a rename or remove with EBUSY (sharing violation) or EPERM
(access denied) when another program holds a file open — editors, the agent
itself, antivirus, indexer. The review covered every rename/rm in the
installer; what changed and what did not:

| Path | Before | After |
| --- | --- | --- |
| `swapIn` renames (3 sites) | Bare errno | Wrapped with `withLockHint`: names the likely cause (a program holding a file open, or a permission problem) and the remedy (close it, re-run). Non-lock errors and POSIX pass through untouched |
| `swapIn` trash/staged rm | `{ recursive: true, force: true }`, fire-and-forget | Same, plus Windows retries (`maxRetries: 3, retryDelay: 100` via `rmRecursiveOptions()`) |
| `cleanStaleStaging` rm | Any rm failure aborted the whole run | Windows lock errors skip that leftover (reported as a note, retried next run); other failures still throw. Return shape is now `{ removed, skipped }` |
| `rollbackFromBackup` rm | Bare errno | Windows retries; error surfaces through the existing rollback reporting |
| Uninstall rm | Bare errno | Windows retries + lock note on failure |
| `writeManifest` rename | Bare errno (surfaced as "could not write the manifest") | Lock note on Windows lock errors |
| `loadManifestForWrite` quarantine rename | Bare errno inside the fail-closed message | Lock note on Windows lock errors |
| Backup/restore staging cleanup rm | Fire-and-forget | Windows retries (same options helper) |
| Lock-file rm (`lock.mjs`) | Fire-and-forget | Unchanged — a stale lock is handled by the takeover logic, not by rm success |

Deliberately **not** done: retry loops around `rename` (Node offers no
built-in rename retry, and a hand-rolled sleep loop in `swapIn` would widen
the two-rename window — the failure is now clearly explained instead), and
any change to POSIX behavior (all retries and notes are win32-gated).

## 7. node-pty decision — option (c): injected input stream

**Decision: (c) — refactor the prompt path to accept an injected input stream.
No new dependency. node-pty is not added.**

### The problem

Stage C's PTY tests (`runCliPty` via the `script` binary) skip where `script`
is absent — notably Windows, which has no `script` at all. The prompt paths
(conflict abort, uninstall `--all`, modified-content uninstall) were therefore
untestable on Windows. Stage C left the fix as a dependency decision for
Stage D.

### The options

**(a) Add node-pty as a devDependency.** node-pty is a *native* module: C++
compiled with node-gyp (or downloaded prebuilds, falling back to a local
compile when no prebuild matches the Node ABI/arch). On Windows that means a
build toolchain (Python + Visual Studio Build Tools) whenever the prebuild
does not match — precisely the platform where the tests are missing. It would
also be the repo's first dependency of any kind: `package.json` has no
`dependencies` *and* no `devDependencies` at all, and the installer documents
itself as "zero-dependency Node (builtins only)". One devDependency for three
tests would end that policy, add install fragility on the exact platform it is
meant to cover, and need ongoing ABI upkeep across the Node 18/20/22 CI
matrix. Rejected.

**(b) Keep zero dependencies and accept the skip.** Keeps the policy, but
leaves the prompt paths permanently untested on Windows — the platform where
interactive use is most likely to differ (line endings, console behavior).
Rejected: the coverage gap is real and (c) closes it without the cost of (a).

**(c) Refactor the prompt path to accept an injected input stream.** The
prompt logic lives in one small module (`prompt.mjs`: a shared readline
interface + `askChoice`), and the commands already take the prompt function
from context (`ctx.ask`) with `ctx.interactive` as a flag. So the refactor is
small: `setPromptStreams({ input, output })` / `resetPromptStreams()` let
tests drive `askChoice` from `PassThrough` streams, and the command functions
can be called in-process with `interactive: true` and the real `askChoice`.
No production behavior changes (production never calls `setPromptStreams`;
defaults are the process streams), no new dependency, and the same three
prompt paths now run on every platform. **Chosen and implemented.**

### What (c) covers, and what it does not

Implemented (4 prompt tests among the 17 new installer tests):

- `askChoice` parsing from an injected stream: keys, full labels,
  case-insensitivity, empty/unrecognized answers → null, EOF → null, and no
  stale "stdin ended" state leaking between prompts.
- The three prompt paths through the real command functions in-process, with
  the real `askChoice` driven by output-triggered answers (readline drops
  lines written before the question is asked, so the test helper feeds each
  answer when the question text appears on the output stream): install
  conflict abort; uninstall `--all` no/yes; modified-content uninstall no/yes
  (with backup contents asserted).

What (c) does *not* prove: that a real terminal delivers the keystrokes the
same way (TTY line discipline, Ctrl-C/EOF handling, echo). That is what the
PTY tests are for, and they remain as the real-TTY integration layer on Unix
CI runners where `script` is standard. The two layers are complementary, not
duplicative: injected-stream tests prove the *logic* everywhere; PTY tests
prove the *terminal interaction* where a PTY exists.

### Residual note

`runCliPty`'s doc comment in `test/helpers.mjs` now points at this decision.
If a future Windows CI leg exists and the PTY tests still skip there, that is
expected and acceptable — the prompt logic is covered by the injected-stream
tests, and a Windows PTY would only add terminal-interaction coverage.

## 8. Verification performed

- `node --test test/installer.test.mjs`: **97/97 pass** (80 baseline + 17
  new: 6 A-11 junction/link tests, 1 manifest-validation test, 1
  `relativeRoot` test, 1 lock-hint/rm-options test, 1 stale-cleanup test,
  3 A-29 path tests, 1 `askChoice` unit test, 3 in-process prompt tests).
  Duration ~117s.
- `npm run check:security`: **PASS** (no findings). The new fragment and
  code quote no scanner-flagged constructs (the TLS-disable construct and
  pipe-to-shell commands are paraphrased, never written literally, anywhere
  in Stage D's additions).
- POSIX behavior checked by the unchanged pre-existing suite (all 80 original
  tests pass unmodified, including the A-05 swap/rollback fault-injection
  tests, the A-30 stale-cleanup test, and the three PTY tests).

## 9. Blocked — first real-Windows run checklist

When a Windows runner (or a Windows CI leg) is available, these are the
checks that close the assumptions in §1.2, in priority order. None is claimed
until then.

1. **Junction classification:** install `--link` on stock Windows (no
   Developer Mode, no admin); confirm the install succeeds, the log says
   `(junction)`, `list` shows `method: link`, `doctor` is clean, and a
   second install reports `already installed` (proves assumption 1 end to end).
2. **Junction removal safety:** uninstall a junction install and confirm the
   library directory is untouched (proves assumption 3 — the catastrophic
   case). Also confirm `update --force` over a junction install and a restore
   of a junction backup leave the library intact.
3. **Junction readlink:** confirm `linkPointsAtSource` accepts a junction
   whose target differs only by case or NT prefix (assumption 2; mostly
   defended by `sameLinkTarget`, but observe the real `readlink()` output).
4. **Developer Mode on:** confirm `--link` creates a real symlink (log says
   `(symlink)`) and everything in (1) holds for it.
5. **EBUSY paths:** hold a skill file open (e.g. in an editor) during
   uninstall/update and confirm the lock note appears (and that transient
   locks are retried rather than failing).
6. **Long paths:** install to a >260-char path on Windows and confirm success
   (or document the OS configuration required).
7. **Tier-1 manifest validation** with real Windows paths, and `/`-separated
   manifest roots resolving on Windows.
8. **Injected-stream prompt tests on Windows:** `node --test
   test/installer.test.mjs` on Windows should run the 4 no-PTY prompt tests
   (the 3 PTY tests will skip there — expected).

## 10. Open items / follow-ups (not Stage D scope)

- **Rename retries:** `swapIn` renames fail fast on a Windows lock with a
  clear message, but do not retry. A small retry loop (bounded, with a short
  sleep) would close the remaining transient-lock gap for renames; deferred
  because it widens the two-rename window and needs care.
- **Pre-existing Windows-written manifests** keep backslash roots (§3).
- **The broken-link `already` quirk** (§2, row 8) predates Stage D and applies
  to symlinks too; `doctor` is the detector. No change made.
- **A Windows CI leg** (L-CI / A-11's "add Windows CI leg" fix) is the
  structural fix for everything in §9; it belongs to the CI workstream, not
  this agent.
