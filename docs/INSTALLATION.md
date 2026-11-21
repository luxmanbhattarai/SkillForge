# Installation

How to install SkillForge skills — and agents and workflows — into a
project or a user account.

## Option 1 — install script (recommended)

Clone the repository and use the install script. It copies (or links)
only what you ask for into your agent's directories, and it never
silently deletes your modifications: see [Safety](#safety) below.

```bash
git clone https://github.com/luxmanbhattarai/SkillForge.git
cd SkillForge

# Project-local, Claude Code: two skills
node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro

# User-level, everything (all 277 skills)
node scripts/install-skills.mjs install --target claude-code --scope user --skills all

# A whole category, for Codex
node scripts/install-skills.mjs install --target codex --scope project --category seo

# An agent definition, for Cursor
node scripts/install-skills.mjs install --target cursor --scope project --agent frontend-specialist
```

The legacy invocation (no command word, `--skills`) keeps working
exactly as before. The command word is optional for `install` only;
every other command needs its name.

Do not copy the whole repository into a project. Install the skills
the project needs.

## Commands

All commands take `--target` (or `--dest`) and `--scope`. Run any
command with `--dry-run` to print exactly what would happen without
changing anything.

| Command | What it does |
| --- | --- |
| `install` | Install skills, agents, workflows (see [Selectors](#selectors)) |
| `update` | Re-install installed items from the current library |
| `list` | List installed items, from the manifest (or a disk scan when there is no manifest) |
| `doctor` | Check install paths, manifest integrity, stale installs, legacy locations |
| `validate` | Validate installed skills: `SKILL.md` present, frontmatter `name` matches the directory |
| `uninstall` | Remove installed items |
| `restore` | List backups (`restore --list`) or restore one (`restore <id>`) |
| `help` | Show the built-in help |

```bash
# Re-install everything this tool installed here, from the current library
node scripts/install-skills.mjs update --target claude-code --scope project

# What is installed here?
node scripts/install-skills.mjs list --target claude-code --scope project
node scripts/install-skills.mjs list --target claude-code --scope project --json

# Is the install healthy? (no --target checks all four targets, both scopes)
node scripts/install-skills.mjs doctor
node scripts/install-skills.mjs doctor --target codex --scope user

# Are the installed skills well-formed?
node scripts/install-skills.mjs validate --target claude-code --scope project

# Remove one skill, or everything (see uninstall safety below)
node scripts/install-skills.mjs uninstall --target claude-code --scope project --skill nextjs
node scripts/install-skills.mjs uninstall --target claude-code --scope project --all --force

# Backups
node scripts/install-skills.mjs restore --list --target claude-code --scope project
node scripts/install-skills.mjs restore 2026-11-20T13-00-00-123Z-a1b2c3 --target claude-code --scope project
```

Exit codes: `0` success, `1` operational failure (a conflict was
refused, an item failed, `doctor` found failures, `validate` found
bad skills), `2` usage error (unknown skill, target, or flag).

### Selectors

`install` accepts these selectors, combinable in one run:

- `--skill <name>` — one skill; repeatable, comma-separated, or
  `all`. `--skills` is the legacy alias. With no selector at all,
  `install` installs all skills.
- `--category <name>` — a whole category (repeatable); categories
  are listed in `registry/skills.json`.
- `--agent <name>` — one agent definition; repeatable, or `all`.
  Needs `--target` (see [Agents and workflows](#agents-and-workflows)).
- `--workflow <name>` — one workflow; repeatable, or `all`.
  Antigravity only.

`update` and `uninstall` accept the same selectors to narrow what
they touch; `update` with no selector updates everything in the
manifest, and `uninstall` needs `--all` (or a selector) to act.

### Options

- `--target <name>` — one of `claude-code` (or `claude`), `cursor`,
  `codex`, `antigravity`.
- `--scope <project|user>` — project installs into the current
  directory; user installs into your home directory for all projects.
  Default: `project`.
- `--dest <path>` — install to a custom directory instead of a
  target path. Skills only: agents and workflows need `--target`,
  because only the target defines where they go. `--dest` combined
  with `--target` sends skills to the custom directory and agents /
  workflows to the target's own directories.
- `--link` — symlink skills instead of copying, so library updates
  are reflected immediately. Agents and workflows are always copied:
  their installed form is a target-format conversion of the library
  file (see below), which a symlink cannot represent. On Windows,
  directory symlinks need Developer Mode or administrator
  privileges; if symlink creation fails, the installer reports it
  clearly and installs nothing — it never silently falls back to
  copying.
- `--dry-run` — print exactly what would happen; change nothing.
- `--force` — overwrite conflicts without prompting. A backup is
  still made first. Never the default.
- `--backup` — back up and overwrite conflicts without prompting
  (same effect as `--force` for conflicts).
- `--json` — machine-readable output (`list`, `doctor`, `validate`,
  `restore --list`).
- `--version` — show the installer version.

## Targets and install paths

Paths verified against each vendor's current official documentation
on 2026-11-20. Sources are recorded in
`scripts/install/targets.mjs`; re-verify them if a vendor moves a
path.

| Target | Project scope | User scope |
| --- | --- | --- |
| `claude-code` | `.claude/skills` | `~/.claude/skills` |
| `cursor` | `.cursor/skills` | `~/.cursor/skills` |
| `codex` | `.agents/skills` | `~/.agents/skills` |
| `antigravity` | `.agents/skills` | `~/.gemini/config/skills` |

Sources (all retrieved 2026-11-20):

- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Cursor skills](https://cursor.com/docs/skills)
- [Codex skills](https://developers.openai.com/codex/skills)
- [Antigravity skills](https://antigravity.google/docs/skills/)

### Paths that changed since v1.0.0

- **Codex** moved from `.codex/skills` / `~/.codex/skills` to
  `.agents/skills` / `~/.agents/skills` in early 2026. The old
  locations still work (Codex reads them for backward
  compatibility) but are no longer in the current Codex docs, so
  the installer now uses the documented locations. `doctor`
  reports skills left in the legacy locations.
- **Antigravity** moved its workspace path from `.agent/skills`
  (singular, still read for backward compatibility) to
  `.agents/skills`, and its global path is
  `~/.gemini/config/skills` for the Antigravity App. The v1.0.0
  user path `~/.agent/skills` was never a documented Antigravity
  path. Note the surfaces disagree on the global path (App:
  `~/.gemini/config/skills`, IDE: `~/.gemini/antigravity/skills`,
  CLI: `~/.gemini/antigravity-cli/skills`); the installer defaults
  to the App path — use `--dest` for another surface.
- **Codex and Antigravity share `.agents/skills`** by vendor
  design: installing skills for either target in the same project
  writes to the same directory, and both agents read it.

## Agents and workflows

Agents (`agents/`) and workflows (`workflows/`) install only where
the target documents a real location for them. They are never
installed as skill-shaped directories.

| Target | Agents | Workflows |
| --- | --- | --- |
| `claude-code` | `.claude/agents` / `~/.claude/agents` (Markdown) | — (no documented location) |
| `cursor` | `.cursor/agents` / `~/.cursor/agents` (Markdown) | — |
| `codex` | `.codex/agents` / `~/.codex/agents` (TOML) | — |
| `antigravity` | `.agents/agents` / `~/.gemini/config/agents` (Markdown) | `.agents/workflows` / `~/.gemini/config/global_workflows` (deprecated) |

Sources (all retrieved 2026-11-20):

- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Cursor subagents](https://cursor.com/docs/subagents)
- [Codex custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Antigravity custom agents](https://antigravity.google/docs/subagents)
- [Antigravity workflows migration](https://antigravity.google/docs/migration/workflows-to-skills/)

What the installer does to the files:

- **Markdown agents/workflows** (Claude Code, Cursor,
  Antigravity): the library files are plain Markdown with no
  frontmatter, but Claude Code requires `name` and `description`
  frontmatter on subagents, and the other targets read it when
  present. The installer prepends a minimal frontmatter block
  (`name` plus a description derived from the file's own opening
  paragraph). Files that already carry frontmatter are installed
  verbatim. The transform is deterministic, so update detection
  and idempotency still work.
- **Codex agents**: Codex custom agents are TOML files with
  required `name`, `description`, and `developer_instructions`
  fields. The installer renders a `.toml` file embedding the
  Markdown body as `developer_instructions`.
- **Antigravity workflows are deprecated by Google** (May 2026;
  "Workflows are deprecated, and a new workflows system is on the
  way"). The installer supports them only for Antigravity, with a
  warning on every install, because it is the only target with
  any documented workflow location. New work should be packaged
  as Agent Skills instead. Requesting `--workflow` for any other
  target is a clear error, not a silent fallback.

## Safety

The v1.0.0 installer deleted an existing skill directory before
installing, with no backup and no warning. That behavior is gone.
The current rules:

- **Conflicts are detected, not overwritten.** Before replacing
  anything, the installer compares the installed files against the
  library and against the manifest:
  - installed files identical to the library → already installed
    (no-op, and adopted into the manifest if missing from it);
  - installed files match the manifest but the library changed →
    a clean update;
  - installed files differ from both → a conflict: the installed
    copy was modified, or unrelated content is in the way.
- **Conflicts ask or refuse.** In an interactive terminal the
  installer asks per item (overwrite / skip / abort). In a
  non-interactive run it refuses the item, exits non-zero, and
  tells you to re-run with `--force` or `--backup`. `--force` is
  an explicit opt-in, never the default.
- **Backup before any replacement.** Every replacement or removal
  of content that is not byte-identical to the manifest is copied
  first into a timestamped backup directory:
  `<parent>/.skillforge-backups/<timestamp>-<id>/`, a *sibling* of
  the skills directory — deliberately not inside it, because some
  agents walk the skills root recursively and would pick up the
  `SKILL.md` files inside a backup as live skills. Each backup
  holds a `backup.json` describing what was backed up and where it
  came from. In a project, you may want to add
  `**/.skillforge-backups/` to `.gitignore`; the installer never
  edits your `.gitignore` for you.
- **Restore is reversible.** Restoring over current content backs
  the current content up first (reason `pre-restore`), so a
  restore can always be undone by restoring the newer backup.
- **Two-rename swap (not atomic).** Each item is staged in a
  temporary directory next to its destination and swapped in with
  two renames: the old content moves aside to a trash directory,
  then the staged content moves into place. Each rename is atomic,
  but the pair is not — a kill between the two renames leaves the
  destination missing. The old content survives in the
  `.skillforge-tmp-old-*` trash directory until the next run's
  cleanup, and every replacement is backed up first, so the item
  is recoverable via `restore`. If the second rename fails, the
  installer puts the old content back; if that rollback fails too,
  it reports both errors and deletes neither copy, leaving the
  trash and staged paths in the message for manual recovery. A
  failure mid-copy leaves no half-installed skill: the staging
  directory is removed and the previous content (if any) is
  untouched. Leftover staging directories from a killed run are
  named `.skillforge-tmp-*`; the installer cleans them up on the
  next run and `doctor` reports them.
- **Partial failure is reported, not hidden.** One bad item never
  aborts the run; the summary lists what was installed, updated,
  skipped, refused, and failed, and the exit code is non-zero
  when anything was refused or failed.
- **Idempotent.** Re-running `install` with no changes reports
  `already installed` for every item and changes nothing.
- **Uninstall is careful too.** It removes only what the manifest
  records (or, with `--force`, foreign content after a backup).
  Modified content is refused without `--force`, and
  `uninstall --all` needs an interactive confirmation or
  `--force` in non-interactive runs.

### The manifest

Installs are recorded in `.skillforge-manifest.json` inside the
target skills directory: name, kind (skill/agent/workflow),
version, library source path, install/update dates, method
(copy/link), and a sha256 hash of every installed file plus a
fingerprint of the library source it came from. `list`, `update`,
`uninstall`, and `doctor` read it; that is how the installer
tells your edits apart from library updates.

The manifest is a plain file, not a directory, so agents scanning
the skills directory for skill subdirectories (or for `SKILL.md`
files) ignore it; it cannot be mistaken for a skill. A missing
manifest means "nothing installed through this tool here":
`list` falls back to scanning directories, and `update` /
`uninstall` say so. A corrupt manifest is reported by `doctor`
and refused by `update` / `uninstall`; `install` quarantines the
corrupt file (renamed with a `.corrupt-<timestamp>` suffix, never
deleted) and writes a fresh one.

## Option 2 — Skills CLI

The `skills` CLI (vercel-labs/skills) also installs from this
repository. Verified working against this repo's layout in a
sandbox on 2026-11-20, twice: at 226 skills (Phase 2) and again
at 277 skills (Phase 12, against a local path, since the upgrade
branch is not pushed yet). In the Phase 12 run `--list`
discovered all 277 skills and installing `graphql` produced
content identical to the library. That run also caught a real
defect: the `graphql` skill's frontmatter contained an unquoted
`: `, which strict YAML rejects, so the CLI skipped it until the
value was quoted (see `ai/decisions/2026-11-20-frontmatter-strict-yaml-colons.md`).

```bash
# Interactive: prompts for agents and skills
npx skills add luxmanbhattarai/SkillForge

# Non-interactive: one skill, one agent, project scope
npx skills add luxmanbhattarai/SkillForge -a claude-code -s nextjs -y

# Non-interactive: everything, everywhere (all 277 skills, all detected agents)
npx skills add luxmanbhattarai/SkillForge -y
```

Notes:

- The bare command is interactive: it prompts for which agents
  and which skills. Non-interactive use needs `-y`, and usually
  `-a <agent>` and `-s <skill>` to narrow it down — with `-y`
  alone it installs all 277 skills to every agent it detects.
- It installs as symlinks into a shared `.agents/skills/`
  directory by default (use `--copy` for copies) and records the
  install in `skills-lock.json`.
- It installs skills only — not SkillForge agents or workflows.
- Skills installed this way are not in the install script's
  manifest, and vice versa. `doctor` reports them as orphans;
  that is expected when mixing the two tools.

## Option 3 — Git submodule

Keeps a project in sync with the library without copying it:

```bash
git submodule add https://github.com/luxmanbhattarai/SkillForge.git skills-library
```

Reference the skills from `skills-library/skills/` (or run the
install script from the submodule). Update with
`git submodule update --remote`.

## Updating

- **Installed by copy:** pull the latest library, then run
  `update` for the target and scope. It re-installs only what
  changed, with the same safety rules as `install`.
- **Installed with `--link`:** pull the latest library; the links
  pick up the changes immediately. `update` reports linked items
  as up to date (and repairs broken links).
- **Submodule:** `git submodule update --remote`, then run
  `update` if you installed from the submodule.
- **Skills CLI:** re-run the add command (per the Skills CLI docs).

After updating, check `CHANGELOG.md` for breaking changes to
skills you rely on.

## Verifying the install

```bash
# Everything healthy? Paths, manifest, stale installs, legacy locations
node scripts/install-skills.mjs doctor

# Are the installed skills well-formed?
node scripts/install-skills.mjs validate --target claude-code --scope project
```

If a skill does not appear in your agent, check that the
directory name matches the skill's frontmatter `name` and that you
installed into the path your agent version reads — see
`docs/AGENT-COMPATIBILITY.md`, which lists the same paths as this
page (both verified against vendor docs on 2026-11-20).

## Troubleshooting

- **"refused: … the installed copy was modified after install"** —
  you (or the agent) edited an installed skill. Re-run with
  `--force` to overwrite it (a backup is made first), or edit the
  library copy and re-install, or leave it alone.
- **"manifest is corrupt"** — `doctor` shows the detail. `install`
  quarantines the corrupt manifest and rebuilds it; `list` still
  works from a disk scan in the meantime.
- **"stale: … is in the manifest but missing on disk"** — the
  installed directory was deleted outside the installer. Run
  `update` to reinstall it, or `uninstall --skill <name>` to drop
  it from the manifest.
- **"orphan skill directory … (not in the manifest)"** — content
  the installer did not place (hand-copied, or installed by the
  Skills CLI). Harmless. Run `install` to adopt identical content
  into the manifest.
- **A skill installed but the agent does not see it** — restart
  the agent or reload the project; confirm the path with
  `doctor`; confirm the skill is well-formed with `validate`.
- **Symlink creation fails on Windows** — directory symlinks need
  Developer Mode or administrator privileges. Install without
  `--link` to copy instead.

## Developing the installer

The installer is zero-dependency Node (builtins only, Node
`>= 18`). The CLI entry is `scripts/install-skills.mjs`; the
implementation lives in `scripts/install/` (`targets.mjs` for
paths, `library.mjs` for the library and format transforms,
`manifest.mjs`, `backups.mjs`, `installer.mjs` for the engine,
`commands.mjs` for the subcommands). Tests live in `test/` and
run with `npm test` (`node:test` + `node:assert`, temp
directories only — they never touch the real home directory).

`SKILLFORGE_ROOT` overrides the library root the installer reads
from; it exists for the test suite (installing from a fixture
library) and is not needed for normal use.
