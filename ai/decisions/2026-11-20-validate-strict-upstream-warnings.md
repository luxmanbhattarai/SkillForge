# Decision: `--strict` fails only on non-upstream warnings

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 12)
- **Context:** `scripts/validate-skills.mjs` has two profiles by
  design: original skills get the full standard (issues are errors),
  upstream skills get spec compliance only (issues are warnings,
  because upstream files are never edited). But `--strict` failed
  on *all* warnings, including upstream ones — so strict mode could
  never pass while any upstream warning existed. The 5 current
  warnings are all upstream-only (placeholder markers, one 501-line
  file, one broken relative link), all unfixable by the
  verbatim-import policy. As a result `npm run validate:strict`
  exited 1, and the Phase 10 `release.yml` workflow (which runs
  `validate:strict`) could never pass on any tag.

## Decision

`--strict` now fails only on warnings on original skills. Upstream
warnings are tracked separately (`upstreamWarnings`), printed with
a `WARN (upstream)` prefix, counted in the summary as
informational, and never affect the exit code — in strict mode or
otherwise.

## Why not the alternatives

- **Change release.yml to plain `validate`:** leaves the strict
  gate meaningless and the root cause in place; anyone running
  `validate:strict` locally would still hit the same always-red
  behavior.
- **Suppress upstream warnings entirely:** hides real (if
  unfixable here) quality signal; the warnings are still worth
  reporting upstream.
- **Fix the 5 upstream warnings in place:** forbidden by the
  verbatim-import policy; fixes belong upstream.

## Consequences

- `npm run validate:strict` passes on the current tree (5 upstream
  warnings, informational) and still fails if an original skill
  gains a warning (e.g. a 501-line SKILL.md) — covered by a test in
  `test/validate.test.mjs`.
- `release.yml` can now pass; the strict gate keeps its meaning for
  everything the repository controls.
- The summary line changed shape (`PASS with N warning(s) (M
  upstream, informational).`); `scripts/generate-report.mjs` takes
  the last output line as the verdict, which is still the summary
  line, so the report is unaffected.
