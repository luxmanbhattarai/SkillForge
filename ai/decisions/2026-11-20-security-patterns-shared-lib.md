# Decision: shared security-pattern library with per-consumer scopes

**Date:** 2026-11-20 (Phase 7)
**Status:** Implemented

## Context

Security detection patterns existed in three divergent copies:
`scripts/security-scan.mjs` (7 patterns), `scripts/score-skills.mjs`
(7 patterns, different set), and `evals/runners/mock-agent.mjs`
(10 patterns, different set again). They had already drifted — the
scorer's injection pattern did not match the mock agent's — and any
fix had to be applied three times. Phase 5's handoff explicitly
flagged this for Phase 7.

## Decision

One library, `scripts/lib/security-patterns.mjs`, holds all 34
patterns. Each pattern has a stable ID, a severity, a label, and a
`scopes` list naming which consumers use it:

- `scan` — the repo scanner (29 patterns; everything except the
  input-only request patterns).
- `score` — the quality scorer (11 patterns: secrets + injection
  only). Command and code-vulnerability patterns need context triage
  (skills document anti-patterns as counter-examples), so they must
  not cap a skill's score by themselves. The scanner covers them with
  human triage instead.
- `input` — the eval mock agent's unsafe-request checks (9 patterns:
  injection + unsafe-request). Secret patterns are deliberately
  excluded: asking *about* secrets ("How do I store API keys?") is
  legitimate and must not be refused.

Patterns may carry a `guard` function that vetoes a match (placeholder
values, the jwt.io example token). Guards encode triage decisions
that would otherwise be re-litigated on every scan run; the trade-off
(a real credential containing a placeholder word would be missed) is
documented in `docs/SECURITY-SCANNING.md`.

## Consequences

- The scanner grew from 7 to 29 patterns (secrets, injection,
  dangerous commands, code vulnerabilities) plus a multi-line
  curl-pipe check and a binary byte-scan.
- The scorer's security dimension now uses the shared `score` scope
  via `scanLine`, with guards applied — it previously had no guard,
  so placeholder credentials would have been flagged CRITICAL.
- The mock agent imports the `input` scope; the refactor changed no
  eval behavior (372/372 before and after).
- `test/security.test.mjs` (22 tests) pins pattern behavior,
  including regression tests for every guard added during triage.
- The library file itself is excluded from the scan: several patterns
  match their own regex definitions. It is covered by code review and
  the unit tests instead.
