# Installation

How to install SkillForge skills into a project or a user account.

## Option 1 — install selected skills (recommended)

Clone the repository and use the install script to copy (or link) only
the skills you need into your agent's skills directory.

```bash
git clone https://github.com/luxmanbhattarai/SkillForge.git
cd SkillForge

# Project-local, Claude Code
node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro,seo-audit

# User-level, everything
node scripts/install-skills.mjs --target claude-code --scope user --skills all
```

### Targets and install paths

| Target | Project scope | User scope |
| --- | --- | --- |
| `claude-code` | `.claude/skills` | `~/.claude/skills` |
| `cursor` | `.cursor/skills` | `~/.cursor/skills` |
| `codex` | `.codex/skills` | `~/.codex/skills` |
| `antigravity` | `.agent/skills` | `~/.agent/skills` |

### Options

- `--target <name>` — one of `claude-code`, `cursor`, `codex`,
  `antigravity`.
- `--scope <project|user>` — project installs into the current
  repository; user installs into your home directory for all projects.
- `--skills <name,name|all>` — a comma-separated list of skill names,
  or `all` for the whole library.
- `--link` — symlink instead of copying, so library updates are
  reflected immediately.
- `--dest <path>` — install to a custom directory.

Do not copy the whole repository into a project. Install the skills the
project needs.

## Option 2 — Skills CLI

```bash
npx skills add luxmanbhattarai/SkillForge
```

## Option 3 — Git submodule

Keeps a project in sync with the library without copying it:

```bash
git submodule add https://github.com/luxmanbhattarai/SkillForge.git skills-library
```

Reference the skills from `skills-library/skills/` (or run the install
script from the submodule). Update with `git submodule update --remote`.

## Updating

- **Installed by copy:** re-run the install script after pulling the
  latest library. It overwrites the installed skills with the current
  versions.
- **Installed with `--link`:** pull the latest library; the links pick
  up the changes immediately.
- **Submodule:** `git submodule update --remote`, then re-run the
  install script if you installed from the submodule.
- **Skills CLI:** re-run the add command (per the Skills CLI docs).

After updating, check `CHANGELOG.md` for breaking changes to skills you
rely on.

## Verifying the install

After installing, confirm the skill directories exist at the target
path and each contains a `SKILL.md`. If a skill does not appear in your
agent, check that the directory name matches the skill's frontmatter
`name` and that you installed into the path your agent version reads —
see `docs/AGENT-COMPATIBILITY.md`.
