# Agent Compatibility

Which agents SkillForge works with, and how skills are installed for
each.

SkillForge skills follow the
[Agent Skills specification](https://agentskills.io/specification), so
they work with any agent implementing that standard. The install script
supports four targets directly; other agents can use the skills by
copying or linking them into the path the agent reads, per vendor docs.

## Supported targets

| Agent | Install command | Project path | User path |
| --- | --- | --- | --- |
| Claude Code | `--target claude-code` | `.claude/skills` | `~/.claude/skills` |
| Cursor | `--target cursor` | `.cursor/skills` | `~/.cursor/skills` |
| Codex | `--target codex` | `.agents/skills` | `~/.agents/skills` |
| Antigravity | `--target antigravity` | `.agents/skills` | `~/.gemini/config/skills` |

Paths verified against each vendor's current official documentation on
2026-11-20 (sources in `scripts/install/targets.mjs`). Codex and
Antigravity moved since v1.0.0: Codex from `.codex/skills`, Antigravity
from `.agent/skills` (its v1.0.0 user path `~/.agent/skills` was never a
documented path). The installer detects installs left in the legacy
locations — run `node scripts/install-skills.mjs doctor` — and
re-running install migrates them. See `docs/INSTALLATION.md` for the
full story, including agent and workflow locations.

These are the paths the install script (`scripts/install-skills.mjs`)
uses. Install with:

```bash
node scripts/install-skills.mjs --target <target> --scope <project|user> --skills <name,name|all>
```

See `docs/INSTALLATION.md` for full usage.

## Notes per agent

- **Claude Code** — skills are discovered from the project and user
  skills directories. Project skills apply to the current repository;
  user skills apply everywhere.
- **Cursor** — skills install into the Cursor skills directories. See
  the Cursor docs for how skills are surfaced in the agent.
- **Codex** — skills install into the Codex skills directories. See
  the Codex docs for how skills are loaded.
- **Antigravity** — skills install into the Antigravity skills
  directories. See the Antigravity docs for how skills are loaded.

## Compatibility data

Some skills declare environment requirements in their frontmatter
`compatibility` field. The registry groups those in
`registry/compatibility.json`; query them with the CLI:

```bash
npm run query -- compat            # all compatibility groups
npm run query -- compat <skill>    # one skill's compatibility info
```

For anything beyond install paths — how an agent discovers skills,
whether it supports skill `scripts/` or `references/`, and any
agent-specific configuration — follow the vendor docs for that agent.
This repository does not document vendor behavior it has not verified.

## Other agents

Any agent implementing the Agent Skills standard can use these skills by
placing the skill directories in the path the agent reads. The exact
path and any configuration are per vendor docs. If your agent does not
implement the standard, you can still read `SKILL.md` files directly
and follow them manually.

## Compatibility caveats

- Not all agents support identical paths or features. A skill that
  relies on `scripts/` or `references/` may behave differently across
  agents; the skill body always states what it needs.
- Skill frontmatter may include a `compatibility` field when a skill
  has specific environment requirements — check it before installing.
- If a skill does not appear in your agent after installing, verify the
  directory name matches the skill's frontmatter `name` and that you
  installed into the path your agent version reads.
