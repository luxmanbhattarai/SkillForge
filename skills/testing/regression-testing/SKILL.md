---
name: regression-testing
description: >
  Make sure previously working behavior still works after changes.
  Use when a bug fix needs a regression test, before a release or a
  dependency upgrade, after a refactor, or when deciding which existing
  tests to run and what new coverage a change requires.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Regression Testing

## Purpose

Regression testing verifies that a change did not break behavior that
used to work. Every bug fix gets a test that fails without the fix;
every release runs the suite that guards existing behavior; every
refactor is checked against the behavior it preserves. This skill turns
"it worked yesterday" from a hope into a checkable fact.

## When to Use

- After fixing a bug: add a test that reproduces it before the fix.
- Before a release, a dependency upgrade, or a framework migration.
- After refactoring, restructuring, or changing shared code.
- When a change touches code used by many features.
- When triaging a report that something "used to work".
- When deciding what to test after a change and what can be skipped.

## When Not to Use

- Testing brand-new behavior with no prior expectation — use
  `unit-testing`, `integration-testing`, or `e2e-testing` for the new
  feature itself.
- Exploring unknown behavior; regression testing guards known behavior.
- Performance validation after a change — use `performance-testing`.
- Security review of a change — use `security-auditing`.

## Prerequisites

- An existing test suite (unit, integration, or E2E) that covers the
  behavior to protect.
- Version control, so the change can be compared against the previous
  behavior.
- A reproducible way to run the affected tests locally and in CI.
- For bug fixes: a reproduction case or a clear description of the
  expected versus actual behavior.

## Official Documentation

- [Vitest](https://vitest.dev/) — running affected tests and
  watching for regressions.
- [Playwright](https://playwright.dev/) — E2E regression coverage
  for critical journeys.
- [GitHub Actions documentation](https://docs.github.com/en/actions) —
  running regression suites in CI.

## Required Workflow

1. Identify the blast radius of the change: which features, endpoints,
   and shared modules it touches, directly or through dependencies.
2. Select the tests that guard that area: unit tests for the changed
   modules, integration tests for the touched endpoints, E2E tests for
   the affected journeys.
3. For a bug fix, write a failing test that reproduces the bug first,
   and confirm it fails on the current code.
4. Apply the fix or change, then run the selected tests. All of them
   must pass.
5. Run the broader suite (or the full suite in CI) to catch effects
   outside the identified blast radius.
6. If a test fails, determine whether the change broke behavior or the
   test encodes outdated expectations; fix the code, and only update
   the test when the behavior change is intentional and approved.
7. Record what was run and the result. If the change was a bug fix,
   link the regression test to the bug report.

## Implementation Standards

- Every bug fix ships with a regression test that fails without the
  fix and passes with it. No fix without a test.
- Regression tests live with the suite that owns the behavior (unit,
  integration, or E2E), not in a separate graveyard directory.
- A regression test asserts the specific behavior that broke, with a
  name or comment referencing the bug report or issue number.
- When a regression test fails, the first assumption is that the code
  broke; updating a test to match new behavior requires explicit
  approval of the behavior change.
- The full suite must run in CI on every pull request and before
  every release; a red suite blocks the merge or release.
- Flaky regression tests are quarantined immediately and fixed or
  removed; a suite that cries wolf stops protecting anything.
- Dependency upgrades get a dedicated regression run covering the
  areas the dependency touches, plus a review of the dependency's
  changelog for breaking changes.

## Best Practices

- Keep the regression suite fast enough to run often; a suite nobody
  runs is decoration. Split slow tests into nightly runs.
- Prioritize tests by risk: critical journeys and recently changed
  areas first, stable peripheral areas after.
- Use test-impact analysis (run tests affected by changed files) for
  quick local feedback, and the full suite in CI.
- After an incident, add the regression test that would have caught
  it, and review whether neighboring behavior needs coverage too.
- Delete regression tests for behavior that no longer exists; stale
  tests create noise and false confidence.
- Track which tests fail most often; chronic failures point at
  flakiness or genuinely fragile areas worth fixing.

## Security Considerations

- Regression tests for security fixes must verify the vulnerability
  is closed (for example, an unauthorized request is rejected), not
  just that the feature works.
- Do not include exploit payloads with real credentials or production
  data; use synthetic values.
- Security regression tests belong in the suite permanently; a
  security fix that regresses silently is a reintroduced
  vulnerability.

## Performance Considerations

- The regression suite's runtime is a budget: if it grows past what
  the team will run, split it into a fast pull-request set and a
  slower nightly set.
- Prefer fast unit-level regression tests over slow E2E ones when the
  behavior can be checked at a lower level.
- Parallelize the suite and cache dependencies in CI to keep feedback
  times short.

## Common Mistakes

- Fixing a bug without a regression test — the same bug comes back
  with the next refactor.
- Updating a failing test to match broken behavior instead of fixing
  the code.
- Running only the tests near the change and missing a side effect
  elsewhere.
- Letting the suite go red and merging anyway — one tolerated failure
  becomes many.
- Treating a green suite as proof of correctness — it proves the
  covered behavior still works, nothing more.
- Keeping tests for removed features — they fail confusingly and
  erode trust in the suite.

## Examples

```ts
// orders.test.ts — a regression test tied to a bug report.
import { describe, expect, it } from "vitest";
import { calculateTotal } from "./orders";

describe("calculateTotal", () => {
  it("does not double-count a discount applied twice (issue #412)", () => {
    // Before the fix, applying the same discount code twice reduced
    // the total twice. The discount must apply at most once.
    const order = {
      items: [{ price: 100, qty: 1 }],
      discountCodes: ["SAVE10", "SAVE10"],
    };
    expect(calculateTotal(order)).toBe(90);
  });
});
```

```text
Release regression checklist:
- Full unit and integration suites green in CI.
- E2E smoke set (critical journeys) green against the release build.
- Areas touched since the last release re-tested manually if they
  lack automated coverage.
- Dependency changelog reviewed; breaking changes accounted for.
- Known issues from the previous release re-verified as fixed.
```

## Validation Checklist

- [ ] Every bug fix in the change has a regression test that fails
      without the fix.
- [ ] The tests guarding the change's blast radius all pass.
- [ ] The full suite passes in CI (or the failure is understood,
      quarantined, and tracked).
- [ ] No test was updated to match new behavior without explicit
      approval of that behavior change.
- [ ] Flaky tests encountered during the run are quarantined, not
      ignored.
- [ ] The run (what was executed, result, environment) is recorded.

## Expected Deliverables

- Regression tests added for each bug fixed, linked to the bug report.
- The list of tests run, their results, and the CI run reference.
- A note on any test updated for intentional behavior change, with
  the approval behind it.
- Any quarantined flaky tests, with a plan to fix them.

## References

- [Vitest](https://vitest.dev/) — running and selecting tests.
- [Playwright](https://playwright.dev/) — E2E regression coverage.
- [GitHub Actions](https://docs.github.com/en/actions) — CI for
  regression suites.
- Related skills in this repository: `unit-testing`,
  `integration-testing`, `e2e-testing`, `vitest`, `playwright`.
