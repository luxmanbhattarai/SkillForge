# Decision: install target paths follow current vendor docs (Codex and Antigravity move)

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 2
- **Context:** Audit finding M-06 (`ai/audits/INITIAL-AUDIT.md`).
  The v1.0.0 install paths were asserted without vendor-doc
  references. Phase 2 re-verified all four targets against current
  official documentation (sources and date recorded in
  `scripts/install/targets.mjs`).

## What verification found

| Target | v1.0.0 paths | Verified 2026-11-20 | Change |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills` / `~/.claude/skills` | same | none |
| Cursor | `.cursor/skills` / `~/.cursor/skills` | same | none |
| Codex | `.codex/skills` / `~/.codex/skills` | `.agents/skills` / `~/.agents/skills` | **moved** |
| Antigravity | `.agent/skills` / `~/.agent/skills` | `.agents/skills` / `~/.gemini/config/skills` | **moved** |

- Codex moved to `.agents/skills` in early 2026; the current docs
  (developers.openai.com/codex/skills) list only `.agents/skills`,
  `~/.agents/skills`, and `/etc/codex/skills`. `.codex/skills` is
  still read for backward compatibility (openai/codex#10437) but
  is undocumented.
- Antigravity's workspace path is `.agents/skills` (plural;
  `.agent/skills` still read for backward compatibility) and its
  global path for the App is `~/.gemini/config/skills`
  (antigravity.google/docs/skills/). The v1.0.0 user path
  `~/.agent/skills` was never a documented Antigravity path.
  Antigravity surfaces disagree on the global path (App:
  `~/.gemini/config/skills`, IDE: `~/.gemini/antigravity/skills`,
  CLI: `~/.gemini/antigravity-cli/skills`).

## Options considered

1. **Keep the v1.0.0 paths.** Zero behavior change, but installs
   to undocumented locations — the exact defect M-06 describes.
2. **Move to the documented paths (chosen).** Correct for new
   installs; the CLI invocations are unchanged (same flags), only
   the default destinations change for Codex and Antigravity.
3. **Install to both old and new paths.** Duplicates skills and
   confuses the manifest; rejected.

## Decision

Option 2. The installer defaults to the documented paths. For
Antigravity user scope it defaults to the App path
(`~/.gemini/config/skills`); `--dest` overrides it for the IDE
or CLI surfaces. `doctor` detects installs left in the legacy
locations (`.codex/skills`, `.agent/skills`) and reports them
with the current location, so v1.0.0 users can migrate by
re-running install.

## Consequences

- Same command lines, different destinations for Codex and
  Antigravity. Called out in `docs/INSTALLATION.md` and in the
  installer header comment.
- `README.md` and `docs/AGENT-COMPATIBILITY.md` still list the
  v1.0.0 paths; they are outside the Phase 2 file list and need
  a follow-up edit (flagged to the coordinator).
- Codex and Antigravity project installs now share
  `.agents/skills` by vendor design; both agents read it.
- `test/targets.test.mjs` pins the verified paths so a future
  vendor move shows up as a test failure, not a silent drift.
