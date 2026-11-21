# Phase 9 — Registry and architecture: notes

Backfilled 2026-11-20 (remediation Stage E, issue A-22). This
directory held no tracked files; this note points at where the
phase's evidence actually lives. Every fact below is traceable to
the cited sources; nothing here is a new claim.

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Status: Verified (`ai/PROJECT-STATUS.md`, Phase 9 row).
Scope: audit findings M-01, M-10, L-06, L-07
(`ai/audits/INITIAL-AUDIT.md`).

## What the phase did

Fixed registry status semantics (M-01): `registry/skills.json`
`status` now derives from `sources/verification-status.json`
(Phase 3 audit outcomes: 204 verified, 16
verified-with-limitations, 6 needs-correction, 51 unverified
Phase 4 skills — no relabeling). Generated
`registry/agents.json` (24) and `registry/workflows.json` (16)
from disk (M-10); added 8 JSON Schemas plus
`scripts/validate-registry.mjs` (`npm run check:registry`:
schema + semantic + verification-coverage + audit cross-check);
derived `related` skills from agent/workflow co-occurrence
(126/277 skills). Externalized the target tree, vendor sources,
and category descriptions from code into JSON (L-06/L-07; report
now 228/228). Added the query CLI (`scripts/query-skills.mjs`,
`npm run query`: search, categories, show, deps, related, compat,
stale, status, agents, workflows). Kept regeneration
deterministic (zero diff). The installer `loadLibrary` reads the
agents/workflows registries with a disk-scan fallback.

## Where the evidence lives

- **Commits:** `e6a6b01` ("Phase 9: registry semantics,
  agents/workflows registries, schema validation, query CLI")
  and `ea495ff` (registry regeneration for the NestJS
  compatibility fix).
- **Results:** `ai/test-results/phase9-registry-results.md` —
  full suite 124/124, evals 449/449 with 0 regressions vs
  baseline, deterministic regeneration verified.
- **Decisions:** `ai/decisions/2026-11-20-registry-schema-validation.md`,
  `2026-11-20-related-skills-derivation.md`,
  `2026-11-20-verification-status-sidecar.md`.
- **Summary:** final report §11 and the Phase 9 row of
  `ai/PROJECT-STATUS.md`.

## Recorded outcome

M-01, M-10, L-06, L-07 fixed; registry layer rebuilt with schema
validation and a query CLI; full suite 124/124 and evals 449/449
with 0 regressions.
