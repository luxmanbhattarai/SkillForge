# Phase 6 — Behavioral evaluation system: notes

Backfilled 2026-11-20 (remediation Stage E, issue A-22). This
directory held no tracked files; this note points at where the
phase's evidence actually lives. Every fact below is traceable to
the cited sources; nothing here is a new claim.

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Status: Verified (`ai/PROJECT-STATUS.md`, Phase 6 row).

## What the phase did

Built `evals/`: a behavioral evaluation suite around a
deterministic mock agent (no LLM APIs, no keys, no network) with
12 categories, 4 scorers, a saved baseline plus regression
comparison, and `npm run evals`. Authored 172 hand-written cases
(20 seed + 152 new: 75 content/security + 77 engineering, with
2 fixtures grounded in skill text) plus 277 generated discovery
cases, one per skill — **449 cases total**. A follow-up fixed the
defects case authoring exposed: 3 library defects (changesets
action v4 → v7; Prisma/Drizzle stale prerequisites; NestJS
frontmatter TS version) and 2 framework defects (extractCode
phantom/swallowed blocks; tsStructure false UNBALANCED on URLs in
strings), with 4 regression tests added.

## Where the evidence lives

- **Commits:** `2a4ebc9` (framework + 20 seed cases + 277
  generated discovery cases), `cefffab` (152 new cases, baseline
  saved), `28dca8e` (follow-up defect fixes).
- **Results:** `ai/test-results/phase6-eval-results.json` —
  449/449 passed, 0 failed, 0 critical, 277/277 skills covered,
  per-category and per-file breakdowns.
- **Decision:** `ai/decisions/2026-11-20-eval-mock-agent.md`.
- **Summary:** final report §8 and the Phase 6 row of
  `ai/PROJECT-STATUS.md`.

## Recorded outcome

Full suite **449/449 passing**, 0 failed, 0 critical, 277/277
skills covered; baseline saved (`evals/baselines/current.json`).
Full unit suite stood at 108 tests after the follow-up
(`ai/PROJECT-STATUS.md` execution log). Recorded limitations:
the mock agent evaluates the library, not a real LLM's
reasoning; the model-based provider interface
(`evals/runners/providers.mjs`) is untested without credentials.
