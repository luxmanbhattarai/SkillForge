# Upstream Change Monitoring

How SkillForge detects new upstream commits, turns detections into
review work, and keeps the weekly check from re-announcing the same
upstream state every week.

## What the checker does

`scripts/check-upstream.mjs` (run as `npm run check:upstream`, and
weekly in CI via `.github/workflows/scheduled-maintenance.yml`)
compares each upstream vendor repo's default-branch HEAD against the
pin in `sources/imported-skills.md` and reports drift. It is
monitoring, not gating: it exits 0 even when upstreams have moved.
It exits 1 only when the pins file cannot be read or a vendor comes
back UNKNOWN — a monitoring failure, not drift.

When a vendor has drifted, the checker analyzes the compare payload
GitHub already returns (no extra API calls) and produces a **review
queue**:

- **New commits** — the commits between the pin and the upstream
  HEAD (first 20 listed in full; the count always covers everything
  the API returned).
- **Changes affecting imported skills** — each changed upstream
  path is matched against the imported skill names from the pins
  file: a path affects a skill when one of its path segments is the
  skill name. Two special cases are mapped in
  `VENDOR_EXTRA_PATHS` in the checker: the Marketing Skills tool
  files imported at `skills/upstream/tools/` (a change to one
  affects `link-building`), and Agentic SEO (a single-skill repo —
  any changed path affects the `seo` import).
- **Deleted or renamed files** — reported explicitly, with the old
  path for renames. A rename affects the skill under its old name
  too: the import still lives at the old path until re-imported.
- **Change summaries** — one human-readable line per drifted vendor
  ("N new commit(s); M file(s) changed; affects imported skills:
  …; D deleted file(s); R renamed file(s); S security flag(s)").
- **Security-sensitive flags** — see below. The human summary
  shows at most 10 flagged files per vendor (with a count of the
  rest); the full list is in the JSON report — a large upstream
  diff can flag dozens of files, and a 90-line dump would hide the
  summary.

The output is a review queue. **Nothing is auto-merged or
auto-applied.** Upstream content is untrusted until reviewed; the
checker only tells a maintainer where to look.

## The security heuristic

Changed files are scanned for potentially security-sensitive
changes. The scan applies to the **added lines** of each file's
diff — removed lines cannot introduce new behavior. When a file's
patch is unavailable (binary file, or a diff too large for the API
to include), only path-based rules apply, and the report records
`patchAvailable: false` for that file.

Two rule sources:

1. **The repository's own scanner patterns**
   (`scripts/lib/security-patterns.mjs`), reused rather than
   duplicated — the subset whose meaning survives the move from
   "scan this repo" to "scan an upstream diff":
   - `shell-pipe` (high) — a download piped into a shell.
   - `dynamic-code` (high) — dynamic code execution.
   - `command-exec` / `command-exec-py` (high) — shell execution
     (`exec`/`spawn` with a shell, `os.system`, `os.popen`).
   - `hardcoded-secret` / `hardcoded-credential` (high) —
     possible hardcoded secret or credential.
   - `tls-disabled` (high) — TLS verification disabled.
2. **Path and patch rules defined in the checker:**
   - `install-script` (medium) — an install/setup script file
     changed.
   - `executable-added` (medium) — a new executable script file
     added.
   - `install-hook` (medium) — a `postinstall`/`preinstall` hook
     in a `package.json` diff.
   - `credential-handling` (medium) — credential-related
     identifiers (key/token/secret names) in added lines.
   - `url-added` (info) — a new URL in added lines. Reported but
     **not counted** in the security-flag total: documentation
     diffs add URLs constantly, so counting them would drown the
     signal.

Every flag is a heuristic: it means "a human should read this
diff", not "this change is malicious". A flag on a file that does
not affect an imported skill is still reported — the maintainer
decides whether the change matters at the next re-import.

## Output modes

| Command | Output |
| --- | --- |
| `node scripts/check-upstream.mjs` | Human summary on stdout |
| `node scripts/check-upstream.mjs --json` | Full report as JSON on stdout, nothing else |
| `node scripts/check-upstream.mjs --out <file>` | JSON report written to `<file>`; human summary on stdout as usual |
| `node scripts/check-upstream.mjs --record-state` | As the human run, plus writes the notification state file (see below) |
| `node scripts/check-upstream.mjs --state <file>` | Use a different state file |
| `node scripts/check-upstream.mjs --no-state` | Disable duplicate suppression |

The JSON report has this shape:

```json
{
  "generated": "2026-11-22T00:00:00.000Z",
  "pinsFile": "sources/imported-skills.md",
  "stateFile": "ai/maintenance/upstream-state.json",
  "stateWarning": null,
  "vendors": [
    {
      "vendor": "Anthropic",
      "repo": "anthropics/skills",
      "pinned": "e4bb5d96…",
      "skills": ["brand-guidelines", "…"],
      "status": "BEHIND",
      "detail": "3 commit(s) behind main head (2026-11-21)",
      "head": "…",
      "headDate": "2026-11-21",
      "detection": {
        "newCommits": [{ "sha": "…", "message": "…", "date": "…", "author": "…" }],
        "newCommitCount": 3,
        "filesChanged": 5,
        "files": [{ "path": "…", "status": "modified", "affectsImports": true,
                    "affectedSkills": ["brand-guidelines"], "securityFlags": [] }],
        "affectedSkills": ["brand-guidelines"],
        "deletedFiles": [],
        "renamedFiles": [],
        "securityFlags": [],
        "securityFlagCount": 0,
        "affectsImports": true,
        "detailAvailable": true,
        "summary": "3 new commit(s); 5 file(s) changed; affects imported skills: brand-guidelines"
      },
      "notification": "new",
      "live": null
    }
  ],
  "notifications": [
    { "vendor": "Anthropic", "repo": "anthropics/skills", "live": false,
      "head": "…", "status": "BEHIND", "summary": "…",
      "affectedSkills": ["brand-guidelines"], "securityFlagCount": 0 }
  ],
  "summary": {
    "counts": { "UP-TO-DATE": 5, "BEHIND": 1, "AHEAD": 0, "DIVERGED": 0, "UNKNOWN": 0 },
    "liveDrift": 0,
    "liveUnknown": 0,
    "reviewQueue": 1,
    "newNotifications": 1,
    "duplicatesSuppressed": 0,
    "securityFlags": 0
  }
}
```

## Duplicate-notification prevention

The state file `ai/maintenance/upstream-state.json` records, per
repo, the upstream HEAD a notification was last recorded for:

```json
{
  "version": 1,
  "updated": "2026-11-22T00:00:00.000Z",
  "vendors": {
    "anthropics/skills": {
      "head": "…",
      "status": "BEHIND",
      "notifiedAt": "2026-11-22T00:00:00.000Z",
      "affectedSkills": ["brand-guidelines"],
      "securityFlagCount": 0
    }
  }
}
```

Mechanics:

- A drifted repo whose current HEAD matches the recorded HEAD is
  reported as `duplicate` and suppressed from the `notifications`
  list, so a weekly scheduled run does not re-announce the same
  upstream state every week.
- A new HEAD is a `new` notification. Only drift notifies;
  UP-TO-DATE and UNKNOWN never do.
- Suppression stops re-announcement; it does **not** close the
  item. The `reviewQueue` count still includes duplicates awaiting
  action.
- The state file is advisory: a missing or unreadable file means
  "nothing recorded yet", never a failure (a corrupt file produces
  a warning and is treated as empty).
- `--record-state` writes the current HEADs into the state file.
  **Run it after reviewing a notification, not before** — recording
  state for an unreviewed drift would suppress its notification
  before anyone looked at it. In CI the weekly job runs in report
  mode and does not record state (the checkout is fresh each run
  and the job has read-only permissions); recording is a maintainer
  step after review.

## From detection to re-import PR

When a notification names skills worth taking, the maintainer turns
it into a re-import following `docs/UPDATE-PROCESS.md` ("Updating
upstream imports"):

1. **Read the diff.** Open the upstream compare URL
   (`https://github.com/<repo>/compare/<pinned>...<head>`) and read
   every changed file the detection names — especially any file
   with a security flag, and any script. Upstream content is
   untrusted until reviewed; confirm it agrees with official
   documentation and this repository's security rules.
2. **Decide scope.** Re-import by commit: copy the skill from the
   new upstream commit into `skills/upstream/<vendor>/<skill-name>/`,
   replacing the old files entirely. Do not merge or hand-edit
   imported content. If the updated skill's name now collides with
   an original skill, do not import it — record it in
   `sources/third-party-skills.md` instead.
3. **Check the license.** Confirm the license still permits
   redistribution; update `sources/licenses.md` if it changed.
4. **Handle deletions and renames.** A deleted upstream file means
   the import is removed with it (re-import, do not hand-delete
   single files). A renamed file means the import moves: the old
   directory goes away and the new one appears, in the same commit.
   Check whether anything in this repo references the old path
   (registry, skill cross-references, docs).
5. **Preserve local customizations.** Imported content is verbatim
   and never edited, so there are no local content customizations
   to preserve inside a skill directory — but the project-maintained
   files around the import must survive the re-import:
   - The vendor `ATTRIBUTION.md` (update the commit and date; keep
     the project-maintained notes, e.g. the tools-import and
     unimported-sibling sections).
   - `sources/imported-skills.md` (update the commit, date, and
     skill list).
   - `skills/upstream/tools/` for Marketing Skills: re-import the
     same 11 tool files from the new commit; do not import the rest
     of upstream `tools/`.
   - The `link-building` skill's relative links resolve against
     `skills/upstream/tools/` — verify they still resolve after
     the re-import.
6. **Verify binary hashes.** If the re-import touched any binary
   asset, recompute its SHA-256 and update
   `sources/binary-hashes.json` in the same commit.
7. **Regenerate and validate.** Run `npm run registry` and
   `npm run validate`.
8. **Update the changelog.** Add an entry under `Unreleased` in
   `CHANGELOG.md` naming the vendor and the new upstream commit.
9. **Open the PR and record the state.** The re-import goes through
   normal review (branch protection requires the checks). After the
   PR merges and the pin moves, run the checker with
   `--record-state` so the notification is recorded against the new
   HEAD and the next weekly run starts clean.

## Live-upstream drift (S-14)

The agentic-seo import pins a dormant fork
(`pwg-projects/agentic-seo-skill`) while the author's repo
(`Bhanunamikaze/Agentic-SEO-Skill`) keeps moving. The checker
compares the pin against the live repo's HEAD too and reports that
drift alongside the primary status, with its own detection and its
own notification entry (`"live": true`). The live comparison never
changes the primary status: the fork remains the import source
until a re-import decision re-points it. A live-upstream
notification therefore means "the author's repo moved", and the
maintainer decision is whether to re-point the import at the live
repo (a bigger decision than a routine re-import — it changes the
import source) or to keep watching the fork.
