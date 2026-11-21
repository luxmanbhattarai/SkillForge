---
name: tdd
description: >
  Test-driven development: write a failing test first, make it pass
  with the smallest change, then refactor. Use when building new
  features, fixing bugs, or designing an API from its behaviour. Covers
  the red-green-refactor cycle, test naming, test doubles, and what to
  test at unit, integration, and end-to-end levels.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# TDD

## Purpose

This skill builds software test-first so that every feature arrives with
proof it works and a safety net for future changes. Writing the test
before the code forces the design to be testable, the interface to be
usable, and the behaviour to be specified before it is implemented.

## When to Use

- Building a new feature, function, or module.
- Fixing a bug (write the failing regression test first).
- Designing an API or interface from the caller's point of view.
- Refactoring code that needs a safety net.
- Any work where "does it work?" should be answerable by running a
  command, not by manual checking.

## When Not to Use

- For exploratory spikes where the goal is learning, not a deliverable —
  spike first, then test-drive the real implementation.
- For purely visual or layout work that is better verified by inspection.
- For debugging an unknown failure — use `debugging` to isolate the cause,
  then add the regression test.

## Prerequisites

- A test runner configured for the project (for example, Vitest or Jest
  for TypeScript, pytest for Python).
- Supported versions (verified 2026-11-20): Vitest 5.x is current
  (5.1.x, November 2026; requires Node.js 22.12 or later — Node.js 20
  is no longer supported) and Jest 30.x is current (30.5.x, September
  2026; Jest 30 removed matcher aliases such as `toBeCalledWith` and
  requires TypeScript 5.4 or later). Node.js ships a built-in test
  runner (`node:test`, stable since Node.js 20) as a zero-dependency
  alternative for simple suites.
- The ability to run a single test file quickly from the command line.
- Agreement on where tests live and how they are named in the project.

## Official Documentation

- [Test-Driven Development (Martin Fowler)](https://martinfowler.com/bliki/TestDrivenDevelopment.html) —
  the canonical short explanation of the practice.
- [Vitest](https://vitest.dev/) — a fast test runner for TypeScript
  projects.
- [Jest](https://jestjs.io/) — a widely used test runner for JavaScript
  and TypeScript.
- [Testing Library](https://testing-library.com/) — testing user
  interfaces by behaviour, not implementation.

## Required Workflow

1. Red: write one small failing test that describes the next behaviour
   to add. Run it and confirm it fails for the right reason.
2. Green: write the smallest code that makes the test pass. Do not add
   behaviour the test does not require.
3. Refactor: clean up the code and the test while keeping the suite
   green. Remove duplication, improve names, simplify.
4. Repeat: pick the next behaviour, write the next failing test, and
   continue the cycle.
5. For bug fixes: write the regression test first, watch it fail, then
   fix the bug and watch it pass.
6. Run the full suite before committing; a single passing test is not
   enough if another test broke.

## Implementation Standards

- One behaviour per test. A test that checks five things fails for five
  reasons and tells you nothing specific.
- Test names describe behaviour in plain language: "returns zero for an
  empty order", not "test1".
- Tests are independent: each test sets up its own data and does not
  depend on the order tests run.
- Test the public interface, not the internals. Tests that reach into
  private state break on every refactor.
- Use real objects where cheap; use test doubles (stubs, mocks, fakes)
  only at boundaries: network, database, filesystem, time.
- Keep the suite fast: unit tests run in milliseconds. Slow tests get
  skipped, and skipped tests do not protect anything.
- Arrange-Act-Assert: set up, perform the action, check the outcome —
  in that order, with the three parts visible.

## Best Practices

- Start with the simplest behaviour (empty input, happy path) and add
  edge cases one test at a time.
- Let the test drive the design: if a function is hard to test, the
  design is the problem, not the test.
- Prefer a few meaningful tests over many trivial ones; coverage
  percentage is a weak proxy for confidence.
- Test error paths and boundary values, not only the happy path.
- Keep test data minimal and obvious; a reader should see what matters
  in the fixture at a glance.
- Delete obsolete tests when behaviour is removed; stale tests mislead.

## Security Considerations

- Test security behaviour explicitly: unauthorised access denied,
  invalid input rejected, sensitive fields never returned.
- Never use real secrets or production data in tests; use clearly fake
  values and fixtures.
- Tests that call real external services must not run against production
  systems.
- See `security` for the full checklist.

## Performance Considerations

- The test suite itself is a performance concern: keep it fast enough
  that developers run it constantly.
- Avoid sleeps and real timers in tests; control time with fakes or
  the test runner's timer controls.
- Integration tests that hit a real database belong in a separate,
  slower tier from unit tests.
- See `performance` for measurement guidance.

## Common Mistakes

- Writing the code first and the test after — the test then confirms
  what the code does, not what it should do.
- Testing implementation details — mocks of every internal call make
  refactoring painful and tests brittle.
- One giant test per module — failures do not localise, and the test
  is unreadable.
- Not watching the test fail first — a test that never failed may not
  test anything.
- Over-mocking — mocking so much that the test passes while the real
  system is broken.
- Flaky tests — tests that pass or fail depending on timing, order, or
  environment. Fix or delete them immediately; flakiness destroys trust
  in the whole suite.

## Examples

Red-green-refactor cycle for a discount rule:

```ts
// 1. Red — write the failing test first.
import { test, expect } from "vitest";
import { applyDiscount } from "./pricing";

test("applies 10% discount to orders over 100", () => {
  expect(applyDiscount(120)).toBe(108);
});

// 2. Green — smallest code that passes.
export function applyDiscount(total: number): number {
  return total > 100 ? total * 0.9 : total;
}

// 3. Refactor — name the constants, keep the test green.
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.9;

export function applyDiscount(total: number): number {
  return total > DISCOUNT_THRESHOLD ? total * DISCOUNT_RATE : total;
}
```

Regression test for a bug fix:

```ts
// Written before the fix. Fails on the buggy code, passes after.
test("empty order totals zero, not NaN", () => {
  expect(orderTotal([])).toBe(0);
});
```

## Validation Checklist

- [ ] Every new behaviour has a test written before its implementation.
- [ ] Each test was seen failing before the code that makes it pass.
- [ ] Tests are independent, fast, and named by behaviour.
- [ ] Error paths and boundary values are covered, not only happy paths.
- [ ] The full suite passes, including the new tests.
- [ ] No test depends on real secrets, production data, or wall-clock time.

## Expected Deliverables

- The feature or fix, with a test for each behaviour it adds.
- A test suite that stays green and fast.
- A note in the pull request for any behaviour deliberately left
  untested, with the reason.

## References

- [Test-Driven Development (Martin Fowler)](https://martinfowler.com/bliki/TestDrivenDevelopment.html) —
  the practice explained.
- [Vitest](https://vitest.dev/) — test runner for TypeScript.
- [Testing Library](https://testing-library.com/) — behaviour-first UI
  testing.
- Related skills in this repository: `debugging`, `refactoring`,
  `clean-code`, `code-review`.
