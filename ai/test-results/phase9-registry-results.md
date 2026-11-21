# Phase 9 — Registry and architecture: test results

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.

## What changed

- M-01 fixed: registry `status` now derives from
  `sources/verification-status.json` (Phase 3 audit outcomes):
  204 verified, 16 verified-with-limitations, 6 needs-correction,
  51 unverified (Phase 4 skills, no formal audit yet).
- M-10 fixed: `registry/agents.json` (24 agents) and
  `registry/workflows.json` (16 workflows) generated from disk;
  JSON Schemas in `scripts/schemas/` + `scripts/validate-registry.mjs`
  (`npm run check:registry`); `related` skills derived from
  agent/workflow co-occurrence (126 of 277 skills have related).
- L-06 fixed: target tree externalized to
  `scripts/lib/target-tree.json`, extended to all 228 original skills;
  report now 228/228 (100%).
- L-07 fixed: `KNOWN_SOURCES` → `scripts/lib/registry-sources.json`,
  `CATEGORY_DESCRIPTIONS` →
  `scripts/lib/category-descriptions.json`; empty descriptions for
  `ai-engineering` and `desktop` filled in.
- Registry query CLI: `scripts/query-skills.mjs` (`npm run query`):
  search, categories, show, deps, related, compat, stale (exits 1
  when stale skills exist), status, agents, workflows, --json.
- Installer `loadLibrary` now reads the agents/workflows registries
  (with disk-scan fallback for fixture libraries).

## Commands run (all 2026-11-20, Node v24.22.1)

| Command | Result |
| --- | --- |
| `npm run registry` | 277 skills, 18 categories, 7 sources, 24 agents, 16 workflows; deterministic (double regeneration, zero diff) |
| `npm run check:registry` | PASS (277 skills, 24 agents, 16 workflows; schema + references + verification coverage + audit cross-check) |
| `npm run report` | 228/228 planned original skills (100%), 277 total |
| `npm run validate` | PASS with 5 warning(s) (all upstream-only) |
| `npm run check:frontmatter` | PASS |
| `npm run check:links` | PASS |
| `npm run check:duplicates` | PASS |
| `npm run check:sources` | PASS with 0 warning(s) |
| `npm run check:security` | PASS: no findings |
| `npm run check:agents` | PASS |
| `npm run score` | 0 CRITICAL, 115 skills with non-critical flags (unchanged behavior) |
| `npm test` | 124/124 pass (108 before + 15 registry tests + 1 library fallback test) |
| `npm run evals` | 449/449 passed, 0 failed, 0 critical; coverage 277/277; vs baseline: 0 regressions, 0 fixes, 0 new, 0 removed |

## Notes

- The registry `status` change (73 skills no longer `verified`) did
  not change any eval outcome: no consumer reads `status`, and the
  mock agent keys on names/descriptions/categories, which are
  unchanged. Baseline comparison confirms 0 regressions.
- `sources/verification-status.json` was generated from the Phase 3
  audit table (226 rows parsed, counts match the audit exactly) plus
  the 51 Phase 4 skills as `unverified`. The validator cross-checks
  the sidecar against the audit table on every run.
