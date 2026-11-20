# Decision: Phase 8 agents/workflows scope

**Date:** 2026-11-20 (Phase 8)
**Status:** Implemented

## Context

The brief asked for new specialist agents and workflows, with a list
of candidates. The existing 20 agents and 9 workflows were inspected
first; several candidates turned out to be already covered.

## Decisions

### No principal-architect agent

`engineering-architect` already owns system design,
domain-driven design, microservices, and architecture decisions. A
principal-architect would duplicate it with a seniority label and no
distinct skill map. Instead, `engineering-architect` was extended
with the new architecture skills (`nx`,
`advanced-api-architecture`).

### No frontmatter on agents/workflows

Agents and workflows are plain Markdown starting with an H1 title;
they have no frontmatter, and no consumer reads frontmatter from
them. Adding frontmatter to 40 files would churn the format for no
benefit. The new validator (`scripts/check-agents-workflows.mjs`)
validates what actually exists: H1 title, required sections, and
reference resolution — which is what finding H-05 asked for.

### New agents follow the existing 8-section format

The brief's agent outline mentions tools/permissions as a separate
element. Existing agents cover tools and permissions inside
Role/Responsibilities/Required workflow prose (e.g. "never log
secrets", "ask the user before destructive changes"). The 4 new
agents (ai-engineer, desktop-engineer, devops-engineer,
release-manager) follow the same 8 sections for uniformity; a
separate section would make new agents structurally different from
the 20 existing ones.

### Workflows added vs covered

Added (7): secure-api-development, database-migration,
authentication-implementation, production-deployment,
sdk-development, ai-rag-implementation, security-review.

Not added, with the covering artifact (improved instead of
duplicated):

- release-management — covered by `production-release.md`, which now
  references `release-management` and `changesets`.
- new project architecture — covered by `new-project.md` step 2,
  which now also references `nx`.
- existing project audit — covered by `architecture-review.md` and
  `code-audit.md`.
- SEO content production — covered by `article-publishing.md`, which
  now references `source-verification` and `editorial-workflow`.
- feature development — already exists as `feature-development.md`.

Two near-duplicates were judged genuinely distinct and added:
`production-deployment` covers infrastructure/rollout/rollback
mechanics that `production-release.md` treats as one step, and
`security-review` is a security-only deep review where `code-audit.md`
covers security as one step of a general audit. Both new workflows
name the existing one and state the boundary.

## Consequences

- 24 agents (was 20), 16 workflows (was 9). All 51 Wave 2 skills are
  referenced by at least one agent or workflow.
- 17 existing agents gained discover-table rows for the new skills
  (50 rows); no "should use" sections changed, so the validator's
  subset invariant holds.
- The 5 M-07 shorthand references are fixed; the validator now
  enforces resolution, so they cannot regress silently.
