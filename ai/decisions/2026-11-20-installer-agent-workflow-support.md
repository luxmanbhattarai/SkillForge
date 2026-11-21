# Decision: agent and workflow install support matrix and format transforms

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 2
- **Context:** Audit finding M-05 (`ai/audits/INITIAL-AUDIT.md`).
  The v1.0.0 installer handled skills only. Phase 2 adds
  `--agent` and `--workflow`, with the rule that agents/workflows
  install only where the target documents a real location — never
  as skill-shaped directories.

## What verification found (official docs, 2026-11-20)

Agents:

| Target | Location | Format |
| --- | --- | --- |
| Claude Code | `.claude/agents` / `~/.claude/agents` | Markdown, `name`+`description` frontmatter required |
| Cursor | `.cursor/agents` / `~/.cursor/agents` | Markdown, frontmatter optional |
| Codex | `.codex/agents` / `~/.codex/agents` | TOML (`name`, `description`, `developer_instructions` required) |
| Antigravity | `.agents/agents` / `~/.gemini/config/agents` | Markdown with frontmatter |

Workflows: only Antigravity documents a location
(`.agents/workflows`, `~/.gemini/config/global_workflows`), and
Google deprecated workflows in May 2026 in favor of Agent Skills
("Workflows are deprecated, and a new workflows system is on the
way"). No other target documents any workflow location.

## Decision

- **Agents install for all four targets**, to the locations
  above. `--workflow` installs for Antigravity only, with a
  deprecation warning on every install; any other target is a
  clear error. `--dest` without `--target` cannot install agents
  or workflows (no target defines where they go) and errors.
- **Format transforms are applied at install time** because the
  library files do not match the targets' native formats:
  - SkillForge agent/workflow files are plain Markdown with no
    frontmatter. Markdown targets get a minimal frontmatter block
    prepended (`name` + a description derived from the file's own
    opening paragraph). Files that already carry frontmatter are
    installed verbatim. Without this, Claude Code would skip the
    files (required fields missing) and the install would look
    successful while doing nothing.
  - Codex gets a generated `.toml` file embedding the Markdown
    body as `developer_instructions`. A body containing `"""` is
    refused rather than embedded unsafely (no current agent file
    contains one; verified 2026-11-20).
  - The transforms are deterministic, so idempotency and update
    detection work on the installed bytes.
- **Agents/workflows are always copied**, even with `--link`: a
  symlink cannot represent transformed content. The installer
  says so when `--link` is combined with agents/workflows.

## Consequences

- `install --agent <name>` works for every target; `install
  --workflow <name>` works only for Antigravity. Anything else
  is an error naming the reason, not a silent fallback.
- Installed agent/workflow files differ from the library files
  by the transform; the manifest records hashes of the installed
  bytes and a fingerprint of the library source, so both user
  edits and library updates are still detectable.
- The description derivation (first paragraph after the H1,
  folded, truncated at 240 chars) depends on the current uniform
  shape of `agents/*.md` and `workflows/*.md` (H1 title, then an
  intro paragraph); a file without an intro paragraph gets a
  generic description.
