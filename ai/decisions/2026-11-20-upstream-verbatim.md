# Decision: upstream skills stay verbatim during the Phase 3 audit

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 3)
- **Context:** Phase 3 audits all 226 skills for technical accuracy,
  including the 49 imported upstream skills. The repository rule
  (`CONTRIBUTING.md`, `docs/SKILL-STANDARDS.md`) is that files under
  `skills/upstream/` are imported verbatim and never edited; fixes
  belong upstream.

## Decision

Reaffirmed for Phase 3: the upstream batch (batch 10) is audit-only.
It verifies upstream skills against official documentation and
reports per-skill status, but makes no edits to upstream files.
Verifiable errors found in upstream skills are recorded in the
batch report and in `ai/audits/TECHNICAL-ACCURACY-AUDIT.md`, with
the upstream repository as the fix venue. Where an upstream skill is
wrong in a way that could mislead agents, the audit notes it
explicitly rather than silently leaving a "Verified" status.

This also means the 11 upstream validator warnings (finding M-08)
cannot be fixed in place; their triage (expand the marketingskills
import vs accept as documented) is a Phase 4/7 decision, recorded
separately.
