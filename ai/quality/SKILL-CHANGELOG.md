# Skill Changelog & Version History

How SkillForge tracks what changed in each skill, and why the history
lives in git — not in the skill files.

- Tool: `scripts/skill-history.mjs` (tests: `test/skill-history.test.mjs`)
- Generated: 2026-11-21, on `feat/production-hardening` @ b86b469
- Skill applied: `changelog-management` (Keep a Changelog groups,
  semver, breaking changes called out with migration notes)

## Decision: centralized changelog derived from git history

**Decision: centralized, git-derived. No per-skill version metadata.**

Two architectures were evaluated:

| | Per-skill version metadata (frontmatter `version:`) | Centralized changelog derived from git log |
| --- | --- | --- |
| Source of truth | A field a human must remember to bump | The commit history itself |
| Drift risk | High: the field says 1.0.0 while the content changed five times (today, every skill's frontmatter says `1.0.0` regardless of its history) | None: the changelog is computed from what happened |
| Upstream skills | Requires editing verbatim imports, which the verbatim policy forbids | Untouched: history is read from git, attribution intact |
| Rename handling | The field moves with the file; old history is lost | `git log --follow` follows the file across renames |
| Cost | 277 files to touch, plus a bump discipline nobody enforces | One script; zero skill-file edits |

The per-skill option was rejected on the drift argument alone: a
version field that is wrong is worse than no version field, because it
looks authoritative. The centralized option also respects the hard
constraint of this mission — skill files are never edited for
versioning — and it keeps upstream skills verbatim.

The cost of the centralized option is that versions are *derived*,
not *declared*: a skill's version number is computed from its history
(see "Version derivation" below), so it changes if history is
rewritten. That is acceptable: this repository never rewrites
published history (branch protection blocks force pushes on main),
and the derivation rules are deterministic and documented here.

## What the tool records

`scripts/skill-history.mjs` reconstructs, for one skill or all
skills, every commit that touched the skill:

- commit hash, date, author, full message (subject + body)
- files changed, with per-file status (A/M/D/R), diffstat
  (lines added/deleted), and the whitespace-insensitive (`-w`)
  diffstat used for formatting detection
- classification (see below)
- whether the change is formatting-only, and whether it counts as
  a meaningful version change

Merge commits are excluded: a merge's diff is the sum of its branch
commits, which `git log` already lists, so including merges would
double-count every change. The revert / re-apply pair around PR #1
(`06100e3`, `c0f4717`) are ordinary commits, so they *are* included —
they genuinely removed and re-added skills (see "Known artifacts").

### Output format (machine-readable)

`--json` (or `--out <file>`) emits:

```json
{
  "generated": "2026-11-21T…",
  "repo": "/…/SkillForge-upgrade",
  "head": "b86b469…",
  "mode": "single",
  "skills": [
    {
      "name": "api-client-generation",
      "path": "skills/backend/api-client-generation",
      "sourceType": "original",
      "vendor": null,
      "derivedVersion": "1.1.0",
      "totalChanges": 6,
      "meaningfulChanges": 6,
      "formattingOnlyChanges": 0,
      "firstSeen": "2026-11-20",
      "lastChange": "2026-11-21",
      "lastMeaningfulChange": "2026-11-21",
      "removed": false,
      "entries": [
        {
          "hash": "c0f4717433dee357a9dc6aefb10b52609bf2f842",
          "short": "c0f4717",
          "date": "2026-11-21T15:50:02-07:00",
          "author": "Luxman Bhattarai",
          "subject": "Reapply \"Merge pull request #1 …\"",
          "body": "Reapply \"Merge pull request #1 …\"\n\nThis reverts commit 06100e3…",
          "classes": ["added", "revert"],
          "meaningful": true,
          "formattingOnly": false,
          "files": [
            { "path": "skills/backend/api-client-generation/SKILL.md",
              "status": "A", "added": 373, "deleted": 0,
              "binary": false, "wAdded": 373, "wDeleted": 0 }
          ],
          "added": 373,
          "deleted": 0
        }
      ]
    }
  ]
}
```

Notes on the fields:

- `added` / `deleted` are `null` (not 0) when git records no numstat
  row for a file — that happens for pure renames and mode-only
  changes, where there are no line changes at all.
- `wAdded` / `wDeleted` are the `-w --ignore-cr-at-eol` diffstat:
  the line counts after ignoring whitespace and CR-at-EOL.
- `removed` is true when the skill's *latest* entry removes its
  `SKILL.md` — i.e. the skill is currently gone from the tree.
- `--all` mode adds an `unattributed` section for commits that
  touched `skills/` files outside any skill directory (vendor-level
  `ATTRIBUTION.md` files, `skills/upstream/tools/README.md`).

## Classification rules

An entry can carry several classes. The rules, in the order the
classifier applies them (`classifyChange` in
`scripts/skill-history.mjs`):

| Class | Rule |
| --- | --- |
| `added` | The skill's `SKILL.md` was added in this commit |
| `removed` | The skill's `SKILL.md` was deleted in this commit |
| `renamed` | The skill's `SKILL.md` was renamed (`git log --name-status` `R` status). A rename is also `breaking`: the skill's name/path is its identity and installers reference it by path |
| `upstream-reimport` | The skill is under `skills/upstream/` and the message mentions import/re-import/upstream — or the skill is being added for the first time (its first import) |
| `security` | The message matches security wording (`security`, `CVE-…`, `vulnerab…`, `secret`, `gitleaks`, `semgrep`, `hardening`, `injection`, `traversal`) |
| `breaking` | The message contains a `BREAKING CHANGE` footer or `breaking:` wording, or the change is a rename |
| `compatibility` | The message matches platform wording (`compatib…`, `windows`, `macos`, `linux`, `node 2x`, `platform`, `junction`) |
| `fix` | The message matches fix wording (`fix`, `fixed`, `correct…`, `patch`, `repair`) |
| `revert` | The subject starts with `Revert "` or `Reapply "` |
| `content` | Fallback: a meaningful change with no more specific class |
| `formatting-only` | The diff is whitespace-only or line-ending-only (see below). Never combined with a version bump |

Two subtleties:

- **Classification is per commit message, not per skill.** A bulk
  commit ("Phase 3: technical accuracy audit of all 226 skills")
  gives all 226 touched skills the same classes, even though the
  audit fixed different things in each skill. The classes describe
  *the commit that changed the skill*, and the doc sample below
  shows this: `cabb9cf` classifies as `security, compatibility,
  fix` for `accessibility` because the commit body mentions
  security-audit results, Node 26, and corrections — not because
  all three apply to the accessibility skill specifically.
- **A rename supersedes an add.** The directory pass (no `--follow`)
  sees a rename as a plain add, because the old path is outside its
  pathspec. When the passes merge, `renamed` wins and `added` /
  `removed` are dropped for that entry.

### Formatting-only detection

A change is formatting-only when its normal diffstat is non-empty
but its `-w --ignore-cr-at-eol` diffstat is all zeros — i.e. the
only differences are whitespace or CR/LF line endings. The check is
per file set, so a commit that reformats one skill and rewrites
another is formatting-only for the first and content for the second.
Binary files are never formatting-only, and a missing `-w` row fails
closed (treated as content).

Formatting-only changes are **recorded but never presented as
meaningful version changes**: they do not bump the derived version,
do not update `lastMeaningfulChange`, and are counted separately
(`formattingOnlyChanges`).

## Version derivation

Derived versions are semver-style, computed oldest-first from a
skill's entries:

| Entry | Effect |
| --- | --- |
| First `added` | `1.0.0` (or the first meaningful entry, when history is truncated by `--since` and no add is visible) |
| Re-add after a removal | Minor bump (a restore, not a new skill — the version does *not* reset) |
| `breaking` | Major bump, minor/patch reset |
| `content` / `compatibility` / `security` / `upstream-reimport` / `revert` | Minor bump, patch reset |
| `fix` only | Patch bump |
| `removed` | No change |
| `formatting-only` | No change |

Derived versions are **not published versions**: no skill file, no
registry entry, and no release carries them. They exist to answer
"how much has this skill changed, and how disruptively?" from the
history alone. Do not quote a derived version as the skill's version
without saying it is derived.

## How to query history

```bash
# One skill, human-readable
node scripts/skill-history.mjs accessibility

# One skill, by path
node scripts/skill-history.mjs skills/frontend/accessibility

# One skill, machine-readable JSON
node scripts/skill-history.mjs accessibility --json --out /tmp/a11y-history.json

# All 277 skills (bulk pass over skills/, ~18s)
node scripts/skill-history.mjs --all --json --out /tmp/history-all.json

# Changes since a date, or the latest N entries per skill
node scripts/skill-history.mjs --all --since 2026-11-21
node scripts/skill-history.mjs nextjs --limit 5

# Another checkout
node scripts/skill-history.mjs accessibility --repo /tmp/some-clone
```

Suggested npm scripts (for the coordinator to add to `package.json`):

```json
"history": "node scripts/skill-history.mjs",
"history:all": "node scripts/skill-history.mjs --all"
```

### Single-skill mode vs `--all` mode

- **Single-skill mode** runs `git log --follow` on the skill's
  `SKILL.md` (follows renames) plus a directory pass for its
  `references/`, `examples/`, and `scripts/`. It gives a skill's
  full history, including pre-rename commits.
- **`--all` mode** runs one bulk pass over `skills/` and partitions
  commits per skill directory. It cannot follow a rename: a renamed
  skill's pre-rename history sits under its old path and is not
  attributed to the current path. Use single-skill mode when a
  skill's full history matters. (No skill has been renamed in this
  repository's history so far, so the two modes agree today —
  verified on `api-client-generation`: 6 entries, v1.1.0, both
  modes.)

## Real-repo run (2026-11-21, @ b86b469)

`node scripts/skill-history.mjs --all --json` over all 277 skills:

- **277/277 skills have history; 0 without.** 37 distinct commits
  touch `skills/` (of 130 commits on the branch), producing 927
  per-skill entries.
- **927 meaningful, 0 formatting-only.** No commit in this
  repository's history is a pure reformat or line-ending change —
  the detector is proven by synthetic tests (see below), but real
  history contains no case for it yet.
- Class counts (entries carry several classes): `added` 328
  (277 first adds + 51 re-adds from the re-apply commit),
  `removed` 51, `revert` 396, `content` 295, `fix` 248,
  `security` 203, `compatibility` 157, `upstream-reimport` 53.
  No `renamed`, no `breaking` entries exist in real history.
- **Derived version distribution:** v1.0.0: 76 skills (31 original,
  45 upstream — added once, never touched again), v1.1.0: 50,
  v1.2.0: 4, v1.3.0: 142, v1.4.0: 5 (`dependency-management`,
  `drizzle`, `graphql`, `prisma`, `secrets-management`).
- **No skill is currently removed.** The 51 `removed` entries are
  all the `06100e3` revert, and all 51 skills were re-added by
  `c0f4717`.
- **Unattributed:** 1 commit (`baee775`, Stage E) touched only
  vendor-level files — 6 `ATTRIBUTION.md` files and
  `skills/upstream/tools/README.md` — which belong to no skill.
- Most-changed skill: `api-client-generation`, 6 entries.

### Sample output (genuine tool output)

Original skill, richest history:

```text
api-client-generation (skills/backend/api-client-generation) — v1.1.0 — 6 change(s), 6 meaningful, 0 formatting-only
  2026-11-21 c0f4717 [added, revert] +373/-0 Reapply "Merge pull request #1 from luxmanbhattarai/feat/skillforge-production-upgrade"
  2026-11-21 06100e3 [removed, revert] +0/-373 Revert "Merge pull request #1 from luxmanbhattarai/feat/skillforge-production-upgrade"
  2026-11-21 7bdc7ca [fix] +3/-1 Stage C: audit 11 backend/architecture skills (L-51 batch 1) — 11 findings fixed
  2026-11-20 fab49de [fix] +20/-0 Phase 5: scorer fix-ups for all 51 new skills (testing strategy, version info, accessibility)
  2026-11-20 fcd1c4a [fix] +2/-2 Phase 4: fix 4 broken links from online check (openapi-ts, Spectral, Vercel OG, Redis exception)
  2026-11-20 e2627c1 [added] +351/-0 Phase 4 (batch 2): add typescript-sdk, python-sdk, api-client-generation, openapi
```

Upstream skill, with a re-import:

```text
web-design-guidelines (skills/upstream/vercel/web-design-guidelines) — v1.3.0 — 4 change(s), 4 meaningful, 0 formatting-only
  2026-11-21 c0f4717 [revert, content] +213/-10 Reapply "Merge pull request #1 from luxmanbhattarai/feat/skillforge-production-upgrade"
  2026-11-21 06100e3 [revert, content] +10/-213 Revert "Merge pull request #1 from luxmanbhattarai/feat/skillforge-production-upgrade"
  2026-11-21 0c64a2c [upstream-reimport, security] +213/-10 Stage D: link-checker hardening + Vercel re-import (A-23, A-27)
  2026-11-20 220aea1 [added, upstream-reimport] +39/-0 Initial commit: SkillForge foundation + 49 verified upstream skills
```

Original v1.0.0 skill (the Phase 3 audit entry shows the
commit-level classification caveat — see above):

```text
accessibility (skills/frontend/accessibility) — v1.3.0 — 4 change(s), 4 meaningful, 0 formatting-only
  2026-11-21 c0f4717 [revert, content] +3/-2 Reapply "Merge pull request #1 from luxmanbhattarai/feat/skillforge-production-upgrade"
  2026-11-21 06100e3 [revert, content] +2/-3 Revert "Merge pull request #1 from luxmanbhattarai/feat/skillforge-production-upgrade"
  2026-11-20 cabb9cf [security, compatibility, fix] +3/-2 Phase 3: technical accuracy audit of all 226 skills
  2026-11-20 d221871 [added] +277/-0 SkillForge v1.0.0 (3/4): database, documentation, frontend, infrastructure, media, metadata and performance skills
```

## Known artifacts and limitations

1. **The revert/re-apply pair inflates versions.** `06100e3` and
   `c0f4717` (2026-11-21) touched nearly every skill: v1.0.0 skills
   got two extra content bumps, and the 51 upgrade skills got a
   remove + re-add. That is why 142 skills sit at v1.3.0 rather
   than v1.1.0. The pair is genuine history, so it stays in the
   record; the `revert` class marks it, and the version rules keep
   a re-add from resetting the version.
2. **Classification is commit-level, not skill-level.** See the
   `cabb9cf` note above. A bulk commit's classes apply to every
   skill it touched.
3. **No renames or breaking changes exist yet.** The rename and
   breaking rules are implemented and tested on synthetic repos,
   but real history has no case for them — the first real rename
   will be the first live test of the `--follow` path.
4. **No formatting-only changes exist yet.** Same situation as (3):
   the detector is tested synthetically (whitespace-only and
   CRLF-only commits), but no real commit qualifies.
5. **`--all` mode does not follow renames.** See "Single-skill mode
   vs `--all` mode" above.
6. **Uncommitted changes are invisible.** History comes from git
   log; a skill edited but not committed has no new entry.

## Tests

`node --test test/skill-history.test.mjs` — 28 tests, all passing
(2026-11-21). Coverage: history reconstruction, upstream-vs-local
classification, breaking-change detection (incl. `BREAKING CHANGE`
footers), formatting-only detection (whitespace-only and CRLF-only),
a skill with no history, a renamed skill (history follows the
rename, rename counts as breaking), bulk `--all` partitioning (one
commit reformatting one skill and changing another), log parsers,
version derivation (incl. re-add-after-removal not resetting), and
the CLI (JSON output, unknown-skill exit code 2). Git-dependent
tests build synthetic repos in temp dirs with fixed authors/dates
and skip cleanly if git is unavailable.
