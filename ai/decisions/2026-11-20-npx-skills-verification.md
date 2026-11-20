# Decision: the `npx skills add` install path is verified and kept

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 2
- **Context:** Audit finding M-09 (`ai/audits/INITIAL-AUDIT.md`).
  `README.md` and `docs/INSTALLATION.md` advertised
  `npx skills add luxmanbhattarai/SkillForge` without anyone
  having verified it works against this repository's layout.

## Verification (sandbox, 2026-11-20)

Run in a temp directory with `HOME` pointed at a temp dir, so
no real agent directory was touched:

1. `npx skills add luxmanbhattarai/SkillForge --list` — cloned
   the repo and discovered all **226 skills**.
2. `npx skills add luxmanbhattarai/SkillForge -a claude-code
   -s nextjs -y --json` — installed `nextjs` to
   `./.claude/skills/nextjs` (project scope, copy mode) and wrote
   `skills-lock.json`. `diff -r` against the library skill:
   **content identical**.
3. `npx skills add luxmanbhattarai/SkillForge -y --json` (bare
   command + `-y`) — installed all 226 skills as symlinks from a
   shared `.agents/skills/` copy into every detected agent's
   directory; lockfile records all 226.

Notes from the runs:

- The bare command is interactive: it prompts for agents and
  skills. Non-interactive use needs `-y` (and usually `-a` /
  `-s` to narrow it — `-y` alone installs everything everywhere).
- The CLI's human-readable summary named `./.agents/skills/nextjs`
  while the JSON output and the filesystem agreed the file went
  to `./.claude/skills/nextjs` — a display quirk in the `skills`
  CLI, not an install error.
- The `skills` CLI installs skills only, not SkillForge agents
  or workflows, and its installs are not in this installer's
  manifest (and vice versa).

## Decision

Keep the claim, with honest documentation: `docs/INSTALLATION.md`
Option 2 now records the verification (date, what was run, what
it did) and the interactive/non-interactive behavior above,
instead of presenting the bare command with no context.

## Consequences

- M-09 is closed by evidence, not by removing the claim.
- The two install tools are independent; `doctor` reports
  Skills-CLI installs as orphans, which is expected when mixing
  them. This is documented.

## Phase 12 re-verification (2026-11-20)

Re-run against the expanded library (277 skills) from a local
path, since the upgrade branch is not pushed yet:

1. `npx skills add /home/hatch/workspace/SkillForge-upgrade
   --list -y` — first run discovered only **276** skills and
   printed `[SKILLS_SKILL_SKIPPED]` for `skills/backend/graphql`:
   its `compatibility` frontmatter line contained an unquoted
   `: `, which strict YAML rejects as a nested mapping. The value
   was quoted and the frontmatter parser now rejects unquoted
   `: ` in plain scalars (see
   `ai/decisions/2026-11-20-frontmatter-strict-yaml-colons.md`).
   Re-run after the fix: **277/277 discovered, 0 skipped**.
2. `npx skills add <local path> -a claude-code -s graphql -y
   --json` — installed `graphql` to `./.claude/skills/graphql`
   (project scope, copy mode); `diff -r` against the library
   skill: **content identical**.

Note: `--json` cannot be combined with `--list` in the current
CLI version, and `--json` requires `--yes`.
