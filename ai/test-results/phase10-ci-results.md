# Phase 10 — CI/CD and automation: verification results

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Work by the Phase 10 delegate; verified independently by the Wave 4
coordinator (this file records the coordinator's checks; the
delegate's own notes are in `ai/phase10/NOTES.md`).

## What changed

- M-03 fixed: CI now runs `check:duplicates`, `check:sources`,
  `check:agents`, `score`, `npm test`, `npm run evals`,
  `check:registry`; scheduled online link check, stale-verification
  detection, and upstream monitoring added.
- M-04 fixed: all third-party actions pinned to SHAs; least-privilege
  `permissions:` on every workflow; no secrets used.
- L-11 addressed: weekly online link check re-verifies exceptions.
- L-12 addressed: validation job runs a Node 18/20/22 matrix.
- New: CodeQL workflow (advanced setup), release validation on
  `v*.*.*` tags, Dependabot config (github-actions only),
  `scripts/check-upstream.mjs` (upstream drift monitor).

## Coordinator verification (all 2026-11-20)

| Check | Result |
| --- | --- |
| Action SHAs vs `git ls-remote` | All match: checkout v5 `fbc6f399…`, setup-node v5 `a0853c24…`, codeql-action v4 dereferenced `1bd86f2f…` (tag object `800a1d87…`, correctly not used) |
| YAML syntax (PyYAML `safe_load`, all 6 workflows + dependabot.yml) | All parse |
| Every `uses:` is a 40-hex SHA pin | Pass |
| Every workflow declares `permissions:` | Pass |
| Every `npm run <script>` referenced exists in package.json | Pass after the coordinator adds `check:upstream` (the only missing entry; `check:registry` and `query` landed in Phase 9) |
| `node scripts/check-upstream.mjs` (live, unauthenticated) | Exit 0; 5 up-to-date, 1 behind (Vercel, 4 commits — informational drift, see NOTES.md) |
| `npm run validate:strict` (used by release.yml) | **CORRECTED in Phase 12 — see below** |
| `query stale` exit code (scheduled-maintenance expects non-zero = stale) | Confirmed: `query stale` exits 1 when stale skills exist, 0 otherwise (implemented in Phase 9) |

## Correction (Phase 12, 2026-11-20)

The original version of this file recorded `npm run
validate:strict` as "PASS with 5 warning(s), exit 0". That was
wrong: the exit code was measured on a `tail` pipeline, not on the
validator. The validator actually **failed** (exit 1) because
`--strict` failed on all warnings and the 5 warnings are all
upstream-only (unfixable by the verbatim-import policy). As
committed, `release.yml` could never pass on any tag.

Fixed in Phase 12: `--strict` now fails only on non-upstream
warnings (see
`ai/decisions/2026-11-20-validate-strict-upstream-warnings.md`),
`npm run validate:strict` passes on the current tree, and the
behavior is covered by `test/validate.test.mjs`. The correction is
recorded here rather than silently edited so the error stays
visible.

## Not verified (honest limits)

- No workflow has run on GitHub yet — the first push/PR after merge
  is the real test.
- Node 18/22 matrix legs not exercised locally (local Node v24.22.1).
- CodeQL/Semgrep/Gitleaks/TruffleHog not installed locally; none ran.
- Secret scanning and Dependabot alerts are repo settings the user
  must enable in GitHub Settings (see `ai/phase10/NOTES.md`).
