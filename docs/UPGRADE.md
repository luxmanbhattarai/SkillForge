# Upgrade Guide

How to upgrade SkillForge — installed skills day to day, and the
library itself from v1.0.0 to the production-upgrade branch.

## Upgrading installed skills

The mechanics live in [`INSTALLATION.md`](INSTALLATION.md#updating);
this page adds the decision-making around them.

1. **Pull the latest library** (`git pull`, or
   `git submodule update --remote` if you use a submodule).
2. **Read `CHANGELOG.md`** for breaking changes to skills you rely on
   — skill renames, removals, and recommendation changes are called
   out there.
3. **Run `update` for each target and scope you use.** It re-installs
   only what changed, with the same safety rules as `install`
   (conflict detection, backups, atomic swaps):
   ```bash
   node scripts/install-skills.mjs update --target claude-code --scope project
   ```
4. **Check health afterwards** with `doctor`. It reports stale
   installs (in the manifest but missing on disk), orphan directories,
   and skills left in legacy locations.

Notes by install method:

- **Installed with `--link`:** pulling the library is enough — the
  links pick up changes immediately. `update` reports linked items as
  up to date and repairs broken links.
- **Installed by the Skills CLI (`npx skills`):** re-run the add
  command per the Skills CLI docs. Skills installed that way are not
  in the install script's manifest, and `doctor` reports them as
  orphans — that is expected when mixing the two tools.
- **Installed with `--dest`:** `update` needs the same `--dest` to
  find the install.

## Upgrading from v1.0.0

The production-upgrade branch (unreleased) changes install paths,
installer behavior, and the registry. Nothing here requires
reinstalling from scratch — `update` and `doctor` handle the
migration — but know what changed.

### Install paths changed (Codex, Antigravity)

| Target | v1.0.0 | Now |
| --- | --- | --- |
| Codex, project | `.codex/skills` | `.agents/skills` |
| Codex, user | `~/.codex/skills` | `~/.agents/skills` |
| Antigravity, project | `.agent/skills` | `.agents/skills` |
| Antigravity, user | `~/.agent/skills` (never a documented path) | `~/.gemini/config/skills` |

Claude Code and Cursor paths are unchanged. The old Codex and
Antigravity project paths are still read by those agents for backward
compatibility, so existing installs keep working — but the installer
now writes to the documented locations, and `doctor` reports skills
left in the legacy locations. Re-running `install` migrates them.
Codex and Antigravity share `.agents/skills` by vendor design.

### Installer behavior changed

- The v1.0.0 installer **deleted** an existing skill directory before
  installing, with no backup and no warning. The current installer
  detects conflicts by hash, asks or refuses instead of overwriting,
  backs up before any replacement, and installs atomically. If you
  have local edits to installed skills, the first `update` after
  upgrading will surface them as conflicts instead of destroying
  them — that is the intended behavior; see
  [`INSTALLATION.md`](INSTALLATION.md#safety).
- New commands: `update`, `list`, `doctor`, `validate`, `uninstall`,
  `restore`. The legacy invocation (no command word, `--skills`)
  still works exactly as before.
- Installs are now tracked in `.skillforge-manifest.json` inside the
  target skills directory. A pre-upgrade install has no manifest:
  `list` falls back to a disk scan, and re-running `install` adopts
  identical content into a fresh manifest.
- Agents and workflows can now be installed (`--agent`, `--workflow`)
  where targets document a location. Antigravity workflows are
  deprecated by Google; the installer warns on every install.

### Registry and tooling changed

- The registry gained `agents.json` and `workflows.json`, JSON
  Schemas (`scripts/schemas/`), and `npm run check:registry`.
- Skill `status` now derives from `sources/verification-status.json`
  (the Phase 3 audit): 204 verified, 16 verified-with-limitations,
  6 needs-correction (all upstream), 51 unverified (Phase 4 skills).
  Do not read v1.0.0-era claims that all skills are verified — the
  per-skill status in the registry is the truth.
- New tools: the query CLI (`npm run query`), the quality scorer
  (`npm run score`), the agents/workflows validator
  (`npm run check:agents`), upstream drift monitoring
  (`npm run check:upstream`), and the behavioral eval suite
  (`npm run evals`). See [`ARCHITECTURE.md`](ARCHITECTURE.md).
- Registry generation is deterministic: `generated` is the newest
  `last_verified` across skills, not the build date.

### Library content changed

- 277 skills (was 226): 51 new skills, 2 new categories
  (`ai-engineering`, `desktop`). 24 agents (was 20), 16 workflows
  (was 9).
- 145 original skills were corrected against official docs; if you
  relied on specific guidance (notably Next.js fetch caching, rate
  limiting, Helmet, Prisma 7/8, MySQL, Turborepo defaults), re-read
  the updated skills after upgrading.

## Upgrading the library checkout itself

```bash
# Plain clone
git pull

# Submodule
git submodule update --remote

# Then, if you install from the checkout, re-run update for your targets
node scripts/install-skills.mjs update --target claude-code --scope project
```

After pulling, regenerate nothing by hand: the registry is committed
in the repository. Only regenerate (`npm run registry`) when you
change skills, agents, or workflows yourself.
