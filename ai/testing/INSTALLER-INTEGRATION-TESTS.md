# Installer Integration Tests

Group D, Phase 10 — end-to-end integration tests for the
SkillForge installer (`test/installer-integration.test.mjs`).

## What is covered

Every test drives the REAL installer CLI as a child process
(`node scripts/install-skills.mjs`) in an isolated temp sandbox
(fake HOME + fake project dir) and never touches the real home
directory or any real agent directory. Only the skill source trees
are synthetic fixtures; the installer itself is never mocked.
Installed content is verified byte-identical to its source with an
INDEPENDENT hash (the test file's own `snapshotTree`, not the
installer's hashing code), and every test cleans up its sandbox
via the shared helpers' `after` hook.

24 tests:

| # | Test | Scenarios covered |
| --- | --- | --- |
| 1 | full lifecycle — install, list, doctor, validate, update, uninstall | install skill+agent → `list --json` → `doctor --json` → `validate` → no-op `update` → library change → `update` applies it → partial uninstall → `uninstall --all --force` empties the manifest |
| 2 | target x scope matrix — every target installs to its documented layout | All 4 targets (Claude Code, Cursor, Codex, Antigravity) x 2 scopes (project, user): exact install paths, byte-identical skills, agent format (TOML for Codex, Markdown + frontmatter elsewhere), Antigravity workflows |
| 3 | install from the real library — a real skill installs byte-identical | No `SKILLFORGE_ROOT`: installs real `nextjs` from the repository registry; installed tree == source tree; doctor passes |
| 4 | idempotency — install twice, update twice, same bytes and same manifest | Second install reports "already installed", tree identical, manifest `installed`/`updated` timestamps unchanged; no-op update |
| 5 | upgrade — install detects the library change, backs up v1, restore brings v1 back | Plain re-install updates on a library change (no `--force` needed), backs v1 up first; `restore` returns v1 content + v1 hashes; doctor passes |
| 6 | reinstallation — a manually deleted install is restored by install and by update | Deleted skill re-created by `install` and by `update` (manifest-recorded but missing on disk); doctor passes |
| 7 | uninstallation — partial then full removal leaves a clean, empty manifest | Partial uninstall leaves the rest; `--all --force` empties the manifest; `list --json` is empty |
| 8 | partial-installation recovery — pre-planted half state refuses, then --force recovers cleanly | Half-copied dest + stale staging dir + trash dir: refused without `--force` (junk untouched, staging cleaned, trash survives); `--force` recovers to a clean install; doctor warns about the trash |
| 9 | interrupted installation — a kill mid-install leaves no half-installed skill and recovery works | SIGKILL shortly after the lock file appears (deterministic: the test polls for the lock): no half-installed skill (dest absent or complete), manifest consistent, doctor warns about the lingering lock, immediate re-run is refused on the lock with the recovery instruction, manual lock removal + re-run recovers cleanly |
| 10 | invalid skill sources — missing source dir, escaping path, skill without SKILL.md | Registry → missing dir: per-item failure, other skill installs, exit 1. Registry path `../escape`: rejected at load, nothing installed. Skill without SKILL.md: installs, but `validate` and `doctor` fail on it |
| 11 | malformed metadata — bad registry JSON, wrong registry shape, bad package.json | Each fails with a clear error, exit 1, nothing installed |
| 12 | missing dependencies — a ghost agent, a removed skill, and a deleted source | Agents-registry entry with no file: per-item failure, skill in the same run installs. Skill removed from the library: `update` skips it, leaves it in place. Source deleted after install: that item's update fails, the other updates, v1 content untouched |
| 13 | permission errors — a read-only skills dir fails cleanly and dry-run still works | Read-only (0555) skills dir: install fails with EACCES, no partial install; dry-run still works (no writes, no lock). Skips on Windows (chmod does not produce EACCES there) and as root (root bypasses permissions; the su-based root variant lives in `installer.test.mjs`) |
| 14 | path conflicts — files in the way fail cleanly; shared-layout targets share one install | `--dest` is an existing file, and a file where the target dir should be: clean failures, files untouched. Codex + Antigravity share `.agents/skills` (and one manifest): the second install is a no-op, single manifest entry |
| 15 | symbolic links — link lifecycle, foreign links, adoption, and broken links | `--link` lifecycle (points at source, idempotent, uninstall removes only the link, source byte-identical); foreign symlink refused untouched; source symlink adopted into the manifest; copy install onto a symlink refused; broken symlink refused, then removed by `uninstall --force`. Skips when the environment forbids symlink creation (EPERM probe) |
| 16 | dry-run changes nothing — install, update, uninstall, and restore | Whole-sandbox hash snapshot is byte-identical after dry-run install/update/uninstall/restore; dry-run into a fresh destination creates nothing (no dir, no manifest) |
| 17 | rollback — a backup failure refuses to replace anything and the previous state survives | A file planted where `.skillforge-backups` should be makes backup creation fail: the update refuses, v1 stays live, the manifest is untouched; removing the blocker lets the update succeed with a backup |
| 18 | mixed run — one command installs skills, an agent, and a workflow for Antigravity | One command installs all three kinds to their layouts (workflow deprecation warning on stderr); uninstalling just the workflow leaves the skill and agent |
| 19 | profile install — --profile installs exactly the profile's skills | `--profile` installs exactly the profile's skills (byte-identical, manifest matches); nothing else is installed |
| 20 | profile install — an unknown profile errors clearly | Unknown profile: exit 2, message names the profile; nothing installed (no manifest, no skill dirs) |
| 21 | profile install regression — --skills all still installs everything | Guards the existing bulk path against the profile feature |
| 22 | status filter — explicit install of a needs-correction skill is refused by default | Explicit install refused (exit 1, message names skill + status + opt-in flag); `--allow-needs-correction` proceeds |
| 23 | status filter — bulk install skips needs-correction skills with a warning; verified skills install unaffected | Bulk install skips needs-correction with a warning (exit 0); verified + verified-with-limitations install; opt-in installs everything |
| 24 | status filter — the real needs-correction skills are refused by default | All six real needs-correction skills refused by default (list re-derived from the registry at run time); opt-in installs `seo` |

## How to run

```bash
# This suite only (from the repository root):
node --test test/installer-integration.test.mjs

# The full regression suite (this file runs as part of it):
npm test
```

No extra setup is needed. The suite uses only temp directories
(`os.tmpdir()` + the shared `test-support/helpers.mjs` sandboxes)
and the fixture libraries it builds itself, plus the real
repository as a read-only install source for tests 3 and 24.

## Test matrix (scenario x target x scope)

The target x scope matrix (test 2) covers every combination:

| Target | Project scope | User scope |
| --- | --- | --- |
| claude-code | `.claude/skills` + `.claude/agents` | `~/.claude/skills` + `~/.claude/agents` |
| cursor | `.cursor/skills` + `.cursor/agents` | `~/.cursor/skills` + `~/.cursor/agents` |
| codex | `.agents/skills` + `.codex/agents` (TOML) | `~/.agents/skills` + `~/.codex/agents` (TOML) |
| antigravity | `.agents/skills` + `.agents/agents` + `.agents/workflows` | `~/.gemini/config/skills` + `~/.gemini/config/agents` + `~/.gemini/config/global_workflows` |

All other scenario tests use `--dest` (custom directory) or the
Claude Code project layout, which keeps each scenario's assertions
about one behavior instead of re-verifying layouts. Lifecycle,
upgrade, rollback, dry-run, and symlink tests additionally
exercise the manifest, backups, and `restore` paths.

## Findings 2 and 3 — written before the features, verified after

Tests 19-20 (profile install) and 22-24 (status filter) were
written against DESIRED behavior before those features existed:
at that point there was no `profiles/` directory, no `--profile`
flag, and no status check in the installer (`loadLibrary` did not
even carry the registry `status` field). The tests failed
precisely as expected then — `--profile` was rejected as
`Unknown option '--profile'` (exit 2), and needs-correction
skills installed unfiltered (`installed fixture-risky ...`,
exit 0). Both features landed in the tree during this mission,
and the assumed interfaces matched the implementation exactly,
so all six tests now pass with no weakening. The one fix needed
was in a test, not the implementation: test 20 originally
asserted the destination directory does not exist after an
unknown-profile error, but lock acquisition creates the (empty)
directory before selection errors are raised — pre-existing
behavior for all post-lock usage errors. The test now asserts
nothing was installed (no manifest, no skill dirs) instead.

### Finding 2 — profile install (tests 19-21)

Implemented interface (verified against
`scripts/install-skills.mjs`, `scripts/install/commands.mjs`,
`scripts/install/library.mjs`, and the real profiles in
`profiles/`):

- Flag: `--profile <name>` (repeatable; `--bundle` is an alias).
- Profile definitions: `<library-root>/profiles/<name>.json`,
  JSON with `"name"`, `"description"`, `"skills"` (array of
  skill names), and optional `"agents"` / `"workflows"` arrays.
  The test writes `{"name": "alpha-only", "description": "...",
  "skills": ["fixture-one"]}` into the fixture library.
- Unknown profile: a usage error, exit 2, message
  `unknown profile '<name>' (known profiles: ...)` — consistent
  with unknown skill/category/target errors.
- `--skills all` keeps installing everything (test 21).

### Finding 3 — status filter (tests 22-24)

Implemented behavior (verified against
`scripts/install/commands.mjs`; the requirement allowed
refuse-or-warn, and the implementation matches the stricter
reading these tests pin):

- Explicit install of a needs-correction skill → REFUSED, exit 1,
  nothing installed; the message names the skill, its
  `needs-correction` status, and the opt-in flag.
- Bulk install (`--skill all`, `--category`, `--profile`) →
  needs-correction skills are SKIPPED with a warning, exit 0;
  verified skills install.
- Opt-in flag: `--allow-needs-correction` → proceeds, exit 0.
- Verified and verified-with-limitations skills install
  unaffected (only `needs-correction` is filtered).

The six real needs-correction skills (verified 2026-11-21 against
both `sources/verification-status.json` `statuses` and
`registry/skills.json` `status`; all six are upstream):

`prisma-upgrade-v7`, `seo`, `vercel-composition-patterns`,
`vercel-react-best-practices`, `vercel-react-view-transitions`,
`web-artifacts-builder`.

Test 24 re-derives this list from the registry at run time and
asserts it still equals the six names, so registry drift fails
the test instead of silently changing coverage. Tests 22-23 use a
fixture library whose registry entries mirror the real status
values (`verified`, `verified-with-limitations`,
`needs-correction`).

## Local run results

Command: `node --test test/installer-integration.test.mjs`
(run 2026-11-21, Node v24.22.1, Linux, as root — the permission
test skips as root by design):

```
ℹ tests 24
ℹ pass 23
ℹ fail 0
ℹ skipped 1
ℹ duration_ms 23304
```

- 23 pass: all tests except the permission test, including all
  six Finding 2 / Finding 3 tests (the profile and status filter
  features have landed; see above).
- 1 skipped: test 13 (permission errors), skipped because the
  run was as root; it runs on non-root Linux CI (and skips on
  Windows by design).
- Duration: ~23 s on this run (the suite has taken 23 s–2 m 51 s
  across runs on this shared, throttled VM, depending on other
  workers' load; the kill test and the multi-CLI-run lifecycle
  tests dominate). On a dedicated CI runner it is expected to be
  well under 2 minutes.

On non-root Linux CI the expected result is 24 pass, 0 fail,
0 skipped. On Windows CI the permission test skips (chmod does
not produce EACCES there), so the expected result is 23 pass,
0 fail, 1 skipped.

History: an earlier run of this file (before the profile and
status filter features landed) reported 18 pass, 5 fail, 1
skipped — the 5 failures were the Finding 2 / Finding 3 tests
failing precisely as designed against the unimplemented features
(`Unknown option '--profile'`; needs-correction skills installing
unfiltered). Those failures are resolved by the features landing,
not by weakening the tests.

## Known gaps

- The post-swap verification rollback path (`rollbackFromBackup`
  on a post-swap mismatch) cannot be triggered through the CLI
  alone — it needs content to change between the swap and the
  verify — so it is covered only at unit level (A-06/A-16a in
  `test/installer.test.mjs`). The integration suite covers the
  rollback paths that ARE reachable end to end: backup-failure
  fail-closed (test 17) and restore-after-upgrade (test 5).
- Interactive conflict prompts are covered in
  `test/installer.test.mjs` (PTY + injected-stream variants), not
  here; this suite runs non-interactively throughout.
- Concurrent-install locking is covered in
  `test/installer.test.mjs` (A-04), not here; the kill test (9)
  covers the lock behavior of a killed run instead.
- Profile membership for agents/workflows is implemented
  (`expandProfiles` returns skills/agents/workflows) but the
  profile tests cover skills only, per the Finding 2 requirement;
  extend test 19 if agent/workflow profile membership needs
  integration coverage.
- The permission test's root case is covered by the su-based
  variant in `test/installer.test.mjs`, not here.
