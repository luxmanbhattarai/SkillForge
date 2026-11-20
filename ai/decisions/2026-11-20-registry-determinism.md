# Decision: deterministic registry/report generation dates

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Wave 1
- **Context:** Audit finding H-02 (`ai/audits/INITIAL-AUDIT.md`).
  `generate-registry.mjs` and `generate-report.mjs` embedded the
  wall-clock date (`new Date().toISOString().slice(0, 10)`) in
  `generated`. CI regenerates the registry and fails on any diff, so
  the first push or PR on any date after 2026-11-20 would fail CI
  even with no skill changes.

## Options considered

1. **Remove the `generated` field.** Cleanest determinism, but a
   breaking schema change for anything reading the registry.
2. **Derive `generated` from disk content (chosen).** Newest
   `last_verified` across all skills. Deterministic, still a date,
   and arguably more meaningful than a build timestamp.
3. **Fix CI instead** (regenerate-and-commit in CI, or exclude the
   date from the diff check). Treats the symptom; the generated
   artifacts would still be non-reproducible.

## Decision

Option 2. `generate-registry.mjs` computes
`GENERATED = max(last_verified)` over all skills, with a pinned
`'2026-11-20'` fallback that is unreachable in practice (the validator
requires `last_verified` on every original skill). The same value is
used for `skills.json` and `versions.json`. `generate-report.mjs`
inherits `reg.generated`, with fallbacks that derive the same value
from the registry skills — no wall-clock read remains in either
generator.

## Consequences

- `generated` now means "newest skill verification date reflected in
  this registry", not "wall-clock build time". Documented in both
  generators' header comments.
- Registry/report output changes only when skills (or their
  verification dates) change. The CI diff check is now meaningful.
- Verified: two consecutive regenerations produce zero diff;
  `generated` stays `2026-11-20`; `grep "new Date"` finds no
  remaining wall-clock reads in either generator.
