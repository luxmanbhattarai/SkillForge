---
name: unit-testing
description: >
  Write and maintain fast, isolated unit tests for individual functions,
  modules, and components. Use when adding tests for business logic, pure
  functions, utilities, or React components; when setting up a test suite;
  or when a bug fix needs a failing-then-passing test. Covers test design,
  mocking, coverage targets, and the arrange-act-assert pattern.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Unit Testing

## Purpose

Unit testing verifies the smallest pieces of a codebase — one function,
one module, one component — in isolation from databases, networks, and
other services. This skill produces tests that run in milliseconds, fail
for exactly one reason, and document the intended behavior of the code
they cover. A good unit suite makes refactoring safe and turns bug
reports into regression tests.

## When to Use

- Adding tests for a new function, utility, hook, or component.
- Fixing a bug: write a failing test that reproduces it first.
- Refactoring code that already has behavior worth preserving.
- Defining the contract of a module before implementing it.
- Verifying edge cases: empty inputs, nulls, boundary values, error paths.
- Setting up or improving a project's test suite and coverage setup.

## When Not to Use

- Testing how several services interact end to end — use `e2e-testing`
  or `integration-testing` instead.
- Verifying a deployed UI in a real browser — use `playwright`.
- Measuring response times or load behavior — use `performance-testing`.
- Checking accessibility of rendered pages — use `accessibility-testing`.
- Testing framework-specific behavior already covered by the framework's
  own suite (for example, that a router matches a route).

## Prerequisites

- A test runner installed in the project (`vitest` for Vite-based
  projects; Node's built-in test runner also works). Vitest 5.x is
  the current major and requires Node.js >= 22.12 and Vite >= 6.4;
  see the `vitest` skill for version details.
- The module under test is importable without side effects at import time
  (no network calls or database connections on module load).
- Familiarity with the project's assertion style and test file layout
  (co-located `*.test.ts` files or a `tests/` directory).

## Official Documentation

- [Vitest](https://vitest.dev/) — the recommended runner for Vite and
  modern TypeScript projects; see also the `vitest` skill.
- [Node.js test runner](https://nodejs.org/api/test.html) — built-in
  `node:test` for projects without a bundler.
- [Testing Library](https://testing-library.com/) — component testing
  guided by how users interact with the UI.
- [Jest](https://jestjs.io/) — widely used alternative runner.

## Required Workflow

1. Identify the unit under test and its public contract: inputs, outputs,
   and error cases. Do not test private internals.
2. List the behaviors to cover: the happy path, each branch, each error
   path, and boundary values.
3. Write one test per behavior. Name it after the behavior, not the
   implementation (for example, `returns an empty list when no orders
   exist`).
4. Follow arrange-act-assert: set up inputs, call the unit once, assert
   the outcome. Keep each test to one assertion theme.
5. Mock only the unit's direct dependencies (network, clock, random
   values, file system). Never mock the unit itself.
6. Run the test and confirm it passes. Then briefly break the
   implementation (or trust a prior red run) to confirm the test can
   actually fail.
7. Run the full suite and confirm no other test broke. Report coverage
   for the touched files.

## Implementation Standards

- Test files live next to the code they test (`sum.ts` / `sum.test.ts`)
  unless the project already uses a separate `tests/` tree.
- One behavior per test; one unit per file. A test that needs a comment
  to explain what it checks is two tests.
- Use the project's assertion library consistently; do not mix
  assertion styles within a file.
- Prefer real objects over mocks. Mock only at the boundary (HTTP,
  database, timers, randomness, the file system).
- Tests must be deterministic: no real network calls, no reliance on
  wall-clock time (inject or fake the clock), no shared mutable state
  between tests.
- Tests must be independent: any test can run alone, in any order, and
  pass. No test depends on another test's side effects.
- Do not test implementation details (private methods, internal state);
  test observable behavior so refactoring does not break tests.
- Keep tests fast: a single unit test should run in well under one
  second; the whole unit suite should finish in under a minute for
  typical projects.
- Use factories or small builders for test data instead of copying large
  literal objects into every test.

### Accessibility

- For components, test the accessible contract: roles, names, and states
  via `getByRole` and accessible queries — not implementation details.
- Run `jest-axe` (or the framework axe integration) on component output
  where the stack supports it.
- Test keyboard interaction: Enter / Space activation, arrow-key
  navigation, Escape to close.
- Test error and empty states: they are announced and identify the
  problem.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Write the test before the fix when debugging: a failing test proves
  the bug is understood and the fix is real.
- Cover the sad paths first when time is short; happy paths are usually
  exercised by integration tests anyway.
- Use parameterized tests (one test body, many input rows) for pure
  functions with many input combinations.
- Assert on behavior, not on mock call counts, unless the call itself
  is the contract (for example, an analytics event must fire once).
- Keep test data minimal: only the fields the behavior needs. Extra
  fields hide what the test is actually about.
- Delete tests that no longer describe real behavior instead of
  patching them to pass against changed requirements.
- Run tests on every save during development when the runner supports
  watch mode; run the full suite before every commit.

## Security Considerations

- Never put real credentials, tokens, or production data in test files
  or fixtures. Use obviously fake values and see `secrets-management`.
- Do not test against production services or databases; use fakes,
  in-memory doubles, or disposable local instances.
- Tests that exercise auth logic should cover the deny path (expired
  token, wrong role, missing session), not only the allow path.
- Sanitized example payloads in tests should still resemble real
  hostile input (for example, strings containing markup) where the unit
  is responsible for escaping or validation.

## Performance Considerations

- Mock slow dependencies; a unit test that waits on a real timer or
  network call belongs in `integration-testing`.
- Avoid heavy setup per test: share expensive immutable fixtures at
  file scope and build cheap per-test state inside each test.
- Parallelize with the runner's default worker pool; avoid tests that
  fight over a shared port or temp directory.
- If the suite grows past a minute, split it: run affected tests on
  save and the full suite in CI.

## Common Mistakes

- Testing mocks instead of code — asserting a mock was called proves
  nothing about behavior unless the call is the contract.
- Over-mocking — mocking so much that the test passes even when the
  real code is broken. Prefer real collaborators within the unit.
- Brittle selectors and snapshots — snapshot tests that break on every
  cosmetic change train developers to update snapshots blindly.
- Shared mutable fixtures — one test mutating a shared object makes
  other tests order-dependent and flaky.
- Asserting too little — a test that only checks "does not throw"
  passes for a function that does nothing.
- Sleeping for real time — use fake timers instead of waiting on the
  real clock.
- One giant test per file — when it fails, nobody knows which behavior
  broke.

## Examples

```ts
// sum.test.ts — one behavior per test, arrange-act-assert.
import { describe, expect, it } from "vitest";
import { sum } from "./sum";

describe("sum", () => {
  it("adds two positive numbers", () => {
    expect(sum(2, 3)).toBe(5);
  });

  it("returns 0 for an empty list", () => {
    expect(sum()).toBe(0);
  });

  it("rejects non-finite input", () => {
    expect(() => sum(Number.NaN)).toThrow(TypeError);
  });
});
```

```ts
// Mock only the boundary: the clock, not the logic under test.
import { describe, expect, it, vi } from "vitest";
import { isExpired } from "./session";

describe("isExpired", () => {
  it("treats a past expiry as expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    expect(isExpired("2026-11-20T11:59:00Z")).toBe(true);
    vi.useRealTimers();
  });
});
```

## Validation Checklist

- [ ] Every new or changed behavior has at least one test.
- [ ] Each test fails when the implementation is deliberately broken.
- [ ] Tests pass when run alone, in any order, and in a fresh checkout.
- [ ] No test touches the network, a real database, or the real clock.
- [ ] No secrets, tokens, or production data appear in test files.
- [ ] The full unit suite runs in under a minute (or is split sensibly).
- [ ] Coverage of the touched files is reported; uncovered branches are
      intentional and noted.
- [ ] Accessibility: component tests assert roles/names; keyboard interaction tested.

## Expected Deliverables

- New or updated `*.test.ts` (or `*.test.js`) files covering the changed
  behavior, co-located with the code under test.
- The command used to run the suite and its result (pass count, failures).
- A short note on any behavior deliberately left untested and why.
- Coverage output for the touched files when the project tracks coverage.

## References

- [Vitest documentation](https://vitest.dev/) — runner, API, and
  mocking guides.
- [Testing Library guiding principles](https://testing-library.com/) —
  test behavior the way users experience it.
- [Node.js test runner API](https://nodejs.org/api/test.html) —
  built-in runner reference.
- Related skills in this repository: `vitest`, `integration-testing`,
  `e2e-testing`, `regression-testing`.
