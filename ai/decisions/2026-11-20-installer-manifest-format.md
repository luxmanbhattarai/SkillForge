# Decision: installed-skills manifest format and location

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 2
- **Context:** Audit findings H-01 and M-05 (`ai/audits/INITIAL-AUDIT.md`).
  The v1.0.0 installer kept no record of what it installed, so update
  and uninstall could not be reliable and conflicts could not be
  detected. Phase 2 adds a manifest.

## Options considered

1. **One manifest per install root** (skills dir, agents dir,
   workflows dir each get one). Clean separation, but `list` /
   `update` / `uninstall` / `doctor` would have to find and merge
   several manifests, and an agents-only install would still need a
   manifest somewhere.
2. **One manifest in the skills dir, recording all kinds (chosen).**
   The skills dir is the one install root every install has (agents
   and workflows are optional extras). Each entry records its own
   install root relative to the manifest's directory, so the
   manifest survives the project or home directory moving.
3. **No manifest; infer state by comparing with the library.**
   Works for detecting "identical to library" but cannot
   distinguish "user edited this" from "installed by another
   tool", and cannot record install dates or methods.

## Decision

Option 2. The manifest is `.skillforge-manifest.json` in the
target skills directory. The name starts with a dot so it sorts
out of the way, and it is a file, not a directory, so agents
scanning the skills directory for skill subdirectories (or for
`SKILL.md` files) ignore it; it cannot be mistaken for a skill.
Per-entry fields (see `scripts/install/manifest.mjs`):

- `kind`, `name`, `version`, `source` (repo-relative library path)
- `sourceHash` — fingerprint of the library source at install time
  (tree fingerprint for skills, file hash for single files);
  compared against the current library to detect updates
- `installed`, `updated` — ISO timestamps
- `method` — `copy` or `link`
- `root` — install root relative to the manifest's directory
  (`.` for the skills dir itself, e.g. `../agents` for a sibling
  agents dir; absolute only when no relative path exists)
- `destName` — directory or file name within the root
- `files` — `{ relpath: 'sha256:<hex>' }` for installed content,
  paths relative to the install root; compared against disk to
  detect user edits (empty for link installs, where the link
  target is the check)

## Consequences

- `update`/`uninstall`/`doctor`/`list` are reliable: they know
  what this tool installed, when, how, and what it should contain.
- The manifest is committed with project-scope installs (it lives
  in `.claude/skills/` etc.), which is desirable: it records what
  the project installed.
- A missing manifest means "nothing installed through this tool":
  `list` falls back to a disk scan, `update`/`uninstall` say so.
  A corrupt manifest is reported by `doctor`, refused by
  `update`/`uninstall`, and quarantined (renamed, never deleted)
  by `install`, which writes a fresh one.
- Codex and Antigravity project installs share `.agents/skills`
  and therefore one manifest; the manifest's `target` field
  records the first installer to write it and is informational
  only.
