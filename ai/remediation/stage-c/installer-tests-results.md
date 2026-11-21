# Stage C — Installer Test Gaps (A-12, A-13, A-15): Results

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local working-tree edits only; not committed)
- **Scope:** installer test gaps A-12, A-13 (remaining parts), A-15. No skill
  audits, no eval changes, no installer behavior change except the A-15
  refactor (behavior-preserving by construction and by test).
- **Files changed:** `scripts/install/commands.mjs` (A-15 only),
  `test/installer.test.mjs` (+8 tests), `test/helpers.mjs` (A-13c).

## Outcome summary

| Issue | Severity | Status after Stage C |
| --- | --- | --- |
| A-12 — `--backup` flag entirely untested | Low | **Fixed** — 1 test (modified + foreign conflict) |
| A-13 — rollback, stale-cleanup, prompt paths untested | Low | **Fixed (remaining gaps)** — 6 tests: 3 dry-run, 3 PTY; PTY skip improved (A-13c). SwapIn/stale-cleanup parts were already covered by Stage B and were verified, not duplicated |
| A-15 — `needBackup` string-matches reason text | Low | **Fixed** — structured `needsBackup` classification field; 1 test pinning all classifications |

## A-12 — `--backup` flag untested — FIXED

- **Root cause:** the flag was parsed and handled (`install-skills.mjs`,
  `resolveConflicts` in `commands.mjs`) but no test ever executed it, so a
  regression in the `--backup` path (e.g. treating it as refuse, or skipping
  the backup) would ship silently.
- **Test added** (`test/installer.test.mjs`):
  - `A-12: --backup backs up a conflict and overwrites without prompting` —
    install nextjs, append `MY EDIT`, run `install --skill nextjs --backup`
    non-interactively: exit 0, `Backup created: <id>`, `updated nextjs`, the
    edit is gone from the installed copy, and the backup's stored
    `SKILL.md` holds the pre-conflict content (`MY EDIT`). A re-run is an
    `already installed` no-op, proving the overwrite completed cleanly. A
    second half covers the foreign-content conflict: astro's directory is
    replaced with an unrelated file (`mine.txt`, `not yours`); `--backup`
    backs that file up byte-identical and installs the library skill.
- **Behavior confirmed:** `--backup` resolves conflicts exactly like
  `--force` (backup first, then overwrite), without prompting.

## A-13 — Remaining test gaps — FIXED

### Verified already covered by Stage B (not duplicated)

- `swapIn` failure/rollback: the three A-05 unit tests exist
  (`A-05: swapIn happy path…`, `…rolls back when the second rename fails
  (unit, fault-injected)`, `…with a failed rollback reports both errors and
  deletes neither copy (unit)`) and pass.
- Stale-cleanup: the A-30 CLI test exists (`A-30: install cleans staged
  leftovers when everything is already; trash survives and doctor reports
  it`) and passes.
- Dry-run with a corrupt manifest: the A-08 test exists and passes; the
  new dry-run tests below cover the *healthy-manifest with pending
  changes* case A-08 did not (and restore dry-run, which A-08 did not
  cover at all).

### (a) Dry-run tests — 3 added

All three use a shared `snapshotInstallState` / `assertStateUnchanged`
helper that snapshots the manifest bytes, the skills-dir listing, the
backups listing, the lock file's existence, and one installed file's
bytes, and asserts the snapshot is identical after the dry run — proving
read-only behavior, not just exit codes.

- `A-13: update dry-run changes nothing (pending update and conflict)` —
  fixture library: a pending library change reports `would update
  fixture-one`; with user edits on top it reports `would refuse
  fixture-one`. In both cases the manifest, backups, lock, and installed
  content are byte-identical afterwards.
- `A-13: uninstall dry-run changes nothing (single item, --force, and
  --all)` — modified content reports `would refuse` without `--force`
  and `would remove` with `--force`; `uninstall --all --dry-run` needs
  no `--force` confirmation and reports `would remove` /
  `would refuse` per item. Nothing is deleted, no backup is created,
  the manifest is untouched in all three runs.
- `A-13: restore dry-run changes nothing (replace and missing-item
  cases)` — restoring over current content reports `would restore …
  (current content is backed up first)` but creates no pre-restore
  backup and changes nothing; restoring a deleted item reports `would
  restore` and creates nothing on disk.

### (b) PTY prompt tests — 3 added

The pre-existing PTY test (`interactive conflict prompt: overwrite
answers yes, skip answers no`) was read first: it sends `o\ns\n` only —
it never sends abort and never covers uninstall. The new tests:

- `A-13: interactive conflict prompt: abort stops the run and changes
  nothing` — two modified skills, PTY input `a\n`: exit 0, the
  `Overwrite it` prompt appears exactly once (abort short-circuits the
  second item), both items report `skipped (run aborted)`, both edits
  survive, no backup is created, the manifest is byte-identical.
- `A-13: interactive uninstall --all prompt: no aborts, yes removes
  everything` — PTY input `n\n` to the `Remove all 2 installed item(s)?`
  prompt: `Aborted; nothing removed.`, everything intact, no backup,
  manifest untouched. Then PTY input `y\n`: both skills removed, no
  backup (both unmodified), manifest entries gone.
- `A-13: interactive uninstall prompt for modified content: no skips,
  yes removes with a backup` — PTY input `n\n` to `Remove it anyway?`:
  `skipped by user`, content intact, no backup. Then `y\n`: removed,
  and the backup holds the edited content (`MY EDIT`).

### (c) PTY skip without `/usr/bin/script` — IMPROVED

- **Change (`test/helpers.mjs`):** `runCliPty` now looks `script` up on
  `PATH` (new `findOnPath` helper, executable check) instead of
  hard-coding `/usr/bin/script` — `script` lives in `/bin` on some
  systems and elsewhere on others. It returns a clear skip reason
  (`{ skipped: true, reason }`), all PTY tests surface that reason in
  `test.skip(...)`, and a spawn-time `ENOENT` (script vanishing between
  lookup and spawn) is treated as unavailable, not as a failure.
- **Decision documented:** Node has no built-in PTY. The only portable
  alternatives would be a native dependency (`node-pty`) or a second
  runtime (`python3 -c 'pty…'`); neither is justified for a test
  helper. Skip-with-reason remains the honest fallback on systems
  without `script` (notably Windows, which has no `script` at all);
  the prompt paths are still covered on every Unix CI runner, where
  `script` is standard. No portable PTY was added; the improvement is
  the PATH lookup plus the explicit reason.

## A-15 — `needBackup` string-matches reason text — FIXED

- **Root cause:** `runUninstall` resolved modified/foreign items by
  rewriting their `action` to `remove`, discarding the classification —
  so the backup decision had to re-derive it by string-matching the
  human-readable reason (`reason.includes('differs')`,
  `reason.includes('not recorded')`). A reason-text edit (or a
  translation) would silently disable backups for modified/foreign
  uninstalls. The A-14 case already used a structured field
  (`notInLibrary`); only the modified/foreign cases were string-matched.
- **Refactor (`scripts/install/commands.mjs`, behavior-preserving):**
  each planned uninstall item now carries a structured boolean
  `needsBackup`, set at classification time in `runUninstall`:
  `false` for absent, `true` for foreign, `true` for modified,
  `!inLibrary(...)` for link-method removes, and `gone` (no longer in
  the library) for manifest-matching removes — the last two replacing
  the old `notInLibrary` field, which is removed (it was only consumed
  by the filter). The filter is now
  `planned.filter((p) => p.action === 'remove' && p.needsBackup)`.
  No reason text, no classification outcome, and no backup behavior
  changed: the old string conditions and the new flag are equivalent
  for every classification (`differs` ⇔ modified, `not recorded` ⇔
  foreign, `notInLibrary` ⇔ the A-14 flag). Verified: no
  `reason.includes` or `notInLibrary` remains in `scripts/` or
  `test/`, and the pre-existing A-14 test passes unchanged.
- **Test added:**
  - `A-15: uninstall backs up modified and foreign content, but not
    unmodified manifest-matching content` — one `--force` uninstall of
    three skills pins all three classifications in a single run:
    nextjs (unmodified, manifest-matching — the control), astro
    (modified with `MY EDIT`), seo (foreign — its manifest entry was
    deleted). All three are removed; exactly one backup is created
    holding exactly astro + seo (nextjs is absent from `backup.json`);
    the astro backup holds `MY EDIT` and the seo backup is
    byte-identical to the library copy. (The fourth case — unmodified
    but no longer in the library — is covered by the existing A-14
    test, which passes unchanged against the refactor.)

## Test results

Commands run from the repository root:

| Command | Result |
| --- | --- |
| `node --test --test-name-pattern='A-12\|A-13: \|A-15:' test/installer.test.mjs` | **8/8 pass** (new tests only) |
| `node --test test/installer.test.mjs` | **80/80 pass** (was 72/72 at the Stage B head; +8) |
| `npm test` | **196/196 pass, 0 fail** (see the count note below) |
| `npm run check:security` | 2 findings, both in other Stage C agents' files (see below); **0 findings in this task's files** |

**Count note (A-18 nuance still applies):** the 196 printed includes
`test/helpers.mjs` itself as a 0-test entry, so 195 real tests. The
Stage B head was 169 printed / 168 real; this task adds 8 (72 → 80
installer tests). The remaining +19 over the Stage B head come from
parallel Stage C agents (evals test additions visible in the working
tree at run time) — the full-suite number will move as their work
lands; the installer count (80) is this task's stable figure.

**Transient failure observed (not mine):** the first `npm test` run
during this task showed failures in `test/registry.test.mjs`
(determinism + count assertions) because a concurrent Stage C agent
was mid-edit of `registry/skills.json` and skill files at that moment.
A re-run minutes later passed 196/196. No installer test failed in
either run.

**Security scan note (not mine):** `npm run check:security` currently
reports 2 findings, both in other Stage C agents' in-progress audit
notes (`ai/remediation/stage-c/batch-2-frontend-desktop-media.md`,
`batch-5-ai-seo-content.md`). No finding touches `commands.mjs`,
`helpers.mjs`, `installer.test.mjs`, or this fragment. Flagged for the
coordinator; out of this task's scope.

## Files changed

| File | Change |
| --- | --- |
| `scripts/install/commands.mjs` | A-15 refactor only: structured `needsBackup` flag at uninstall classification; filter reads the flag instead of reason text; `notInLibrary` removed (27 lines changed) |
| `test/installer.test.mjs` | +8 tests (A-12 ×1, A-13 ×6, A-15 ×1), `snapshotInstallState` / `assertStateUnchanged` helpers, existing PTY test surfaces the skip reason |
| `test/helpers.mjs` | A-13c: `runCliPty` looks `script` up on PATH, returns a skip reason, treats spawn `ENOENT` as unavailable |
| `ai/remediation/stage-c/installer-tests-results.md` | This fragment |

No other files were touched. Nothing was committed, pushed, merged,
or PR'd. All tests run in temp sandboxes only; no real user
directories were touched.

## Remaining gaps

1. **PTY tests still skip on systems without `script`** (notably
   Windows): the prompt paths are untested there. A real fix needs
   `node-pty` or equivalent — a dependency decision for Stage D, not
   taken here (see A-13c decision above).
2. **Post-swap mismatch branches** (A-06/A-16a) remain covered at the
   unit/helper level only — unchanged from Stage B; no CLI input can
   reach them after a passing pre-swap check.
3. **The full-suite test count is a moving target** while parallel
   Stage C agents land work; Stage E should re-baseline the headline
   numbers (and resolve A-18's helpers-file counting nuance).
4. **The security scan is currently red** due to other agents'
   Stage C audit notes (see above) — the coordinator should route
   those findings to their owners before the final gate.
