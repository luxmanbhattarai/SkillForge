# Decision: backup location is a sibling of the skills directory

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 2
- **Context:** Audit findings H-01 and M-05 (`ai/audits/INITIAL-AUDIT.md`).
  The installer must back up existing content before any
  replacement. The Phase 2 brief suggested
  `<dest>/.skillforge-backups/<timestamp>/` — inside the skills
  directory.

## Options considered

1. **Inside the skills dir (brief's suggestion).** Simple to find,
   but wrong: Cursor walks the skills root recursively and picks
   up any `SKILL.md` it finds, so a backup containing
   `<skill>/SKILL.md` would be loaded as a live (duplicate) skill.
   Claude Code scans one level, so it would be safe there — but
   the installer must be safe for every target.
2. **Sibling of the skills dir (chosen).**
   `<parent>/.skillforge-backups/<timestamp>-<id>/`, e.g.
   `.claude/.skillforge-backups/` for a project Claude Code
   install, `~/.claude/.skillforge-backups/` for user scope.
   No agent scans the parent of a skills directory for skills.
3. **A central location (`~/.skillforge/backups/`).** Keeps
   projects clean, but splits project-scope backups from their
   project, and user-scope vs project-scope bookkeeping gets
   confusing.

## Decision

Option 2. Backups live next to the skills directory, never inside
it. Each backup directory holds a `backup.json` (id, date,
target, scope, reason, and one record per backed-up item,
including the full manifest-entry data needed to restore it and
repair the manifest) plus `items/<n>-<kind>-<name>/` holding the
backed-up content. Symlinks are backed up as symlinks (recreated,
not resolved). Restores back up the current content first
(reason `pre-restore`), so a restore is always reversible.

## Consequences

- Backups can never be mistaken for installed skills by any
  target, including Cursor's recursive scan.
- In a project, `.claude/.skillforge-backups/` (etc.) would be
  committed unless ignored; the docs suggest adding
  `**/.skillforge-backups/` to `.gitignore`. The installer never
  edits the user's `.gitignore`.
- `restore --list` / `restore <id>` resolve the backups dir from
  the same `--target`/`--scope`/`--dest` flags as the install
  commands, so no new flags are needed.
