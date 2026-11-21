# Phase 8 — Agents and workflows expansion: notes

Backfilled 2026-11-20 (remediation Stage E, issue A-22). This
directory held no tracked files; this note points at where the
phase's evidence actually lives. Every fact below is traceable to
the cited sources; nothing here is a new claim.

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Status: Verified (`ai/PROJECT-STATUS.md`, Phase 8 row).
Scope: audit findings H-05, M-07 (`ai/audits/INITIAL-AUDIT.md`).

## What the phase did

Added the agents/workflows validator
(`scripts/check-agents-workflows.mjs`, `npm run check:agents`:
H1/title, required sections, reference resolution, should-use ⊆
discover) and fixed M-07 (5 shorthand refs, 10 occurrences).
Added 4 agents (`ai-engineer`, `desktop-engineer`,
`devops-engineer`, `release-manager`) and 7 workflows
(`secure-api-development`, `database-migration`,
`authentication-implementation`, `production-deployment`,
`sdk-development`, `ai-rag-implementation`, `security-review`),
taking the library to 24 agents and 16 workflows. Updated 17
existing agents (50 discover rows) so all 51 Wave 2 skills are
covered by at least one agent/workflow. Improved 3 workflows
instead of duplicating them (`production-release`,
`article-publishing`, `new-project`); no `principal-architect`
agent (would duplicate `engineering-architect`); no frontmatter
added to agents/workflows (validate structure instead).

## Where the evidence lives

- **Commit:** `85999fa` ("Phase 8: agents and workflows expansion").
- **Results:** `ai/test-results/phase8-agents-workflows-summary.md`
  (Stage E backfill — no dedicated Phase 8 results file was
  written at the time; see that file for what is and is not
  sourced).
- **Decision:** `ai/decisions/2026-11-20-phase8-agents-workflows-scope.md`.
- **Summary:** final report §10 and the Phase 8 row of
  `ai/PROJECT-STATUS.md`.

## Recorded outcome

Validator added with 8 tests; 40 files PASS (24 agents,
16 workflows); H-05 and M-07 fixed; all 51 Wave 2 skills covered
by ≥1 agent/workflow. Full unit suite passing at 104 tests at
phase close (`ai/PROJECT-STATUS.md`).
