---
name: vitest
description: >
  Set up and use Vitest as the test runner for Vite and modern
  TypeScript projects. Use when creating a Vitest config, writing tests
  with describe/it/expect, mocking modules with vi.mock, using fake
  timers, adding coverage, or migrating a suite from Jest to Vitest.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js and a Vite-based or ESM TypeScript project.
---

# Vitest

## Purpose

Vitest is a fast, Vite-native test runner with a Jest-compatible API.
It gives TypeScript projects instant feedback through native ESM, watch
mode, and parallel workers, without a separate transform pipeline. This
skill covers setting up Vitest, writing tests in its API, mocking,
coverage, and the configuration choices that keep a suite fast and
reliable.

## When to Use

- Starting a test suite in a Vite, Astro, or modern TypeScript project.
- Writing unit or integration tests with `describe`, `it`, and `expect`.
- Mocking modules, functions, timers, or the DOM in tests.
- Adding coverage reporting to a project.
- Migrating an existing Jest suite to Vitest.
- Debugging a slow or flaky Vitest run.

## When Not to Use

- Testing a full user journey in a real browser — use `playwright` or
  `e2e-testing`.
- Testing a project with no Vite or ESM setup where Node's built-in
  test runner is simpler — see `unit-testing`.
- Load or performance testing — use `performance-testing`.
- Snapshot-heavy component suites that rely on Jest-specific tooling
  with no Vitest equivalent; check compatibility first.

## Prerequisites

- Node.js installed (Node.js 24 is the current LTS line as of
  2026-11-20) and a project using ESM or Vite.
- Vitest installed as a development dependency.
- For DOM component tests, a DOM environment package such as
  `happy-dom` or `jsdom` installed as a development dependency.
- For coverage, the matching coverage provider package installed
  (Vitest supports V8 and Istanbul providers).

## Official Documentation

- [Vitest](https://vitest.dev/) — getting started, guide, and API.
- [Vitest guide](https://vitest.dev/guide/) — configuration and
  features.
- [Vitest API reference](https://vitest.dev/api/) — `describe`, `it`,
  `expect`, `vi`, and assertion reference.

## Required Workflow

1. Install Vitest and the environment packages the suite needs.
2. Create `vitest.config.ts` (or extend the Vite config with the test
   section) with the environment, include patterns, and globals choice.
3. Decide the globals policy: importing from `vitest` explicitly is
   preferred over globals, because it keeps tests explicit and portable.
4. Write a first test file (`*.test.ts`) and run it with
   `npx vitest run` to confirm the setup works.
5. Configure coverage with the chosen provider and sensible thresholds,
   and run `npx vitest run --coverage` to verify the report.
6. Add `test`, `test:watch`, and `test:coverage` scripts to
   `package.json`.
7. Run the suite in CI with `npx vitest run` (never watch mode) and
   confirm it passes on a fresh checkout.

## Implementation Standards

- Use `vitest.config.ts` separate from the app config when the test
  setup is non-trivial; keep the Vite app config clean.
- Import test APIs explicitly (`import { describe, it, expect } from
  "vitest"`) rather than relying on globals.
- Test files use the `*.test.ts` (or `*.spec.ts`) suffix consistently
  across the project; do not mix suffixes.
- Mock at the module boundary with `vi.mock()` for external modules
  and `vi.fn()` / `vi.spyOn()` for individual functions. Never mock the
  module under test.
- Reset mocks between tests with `vi.clearAllMocks()` in a
  `beforeEach` hook, or set `clearMocks: true` in config.
- Use `vi.useFakeTimers()` for time-dependent tests and always restore
  real timers afterwards (`vi.useRealTimers()`).
- Keep tests in `node` environment by default; use a DOM environment
  only for files that render components, configured per file with a
  docblock comment or a separate project configuration.
- Coverage thresholds should be set per project and enforced in CI;
  do not chase 100% coverage at the expense of meaningful assertions.
- Snapshot tests must be small and intentional; review every snapshot
  update as carefully as a code change.

## Best Practices

- Run `vitest` in watch mode during development for instant feedback;
  run `vitest run` once in CI.
- Use `test.each` (or `it.each`) for parameterized cases over pure
  functions instead of copying test bodies.
- Structure suites with `describe` blocks per unit and `it` blocks per
  behavior; keep nesting shallow (two levels at most).
- Prefer `expect(...).toEqual(...)` for object comparison and
  `toBe(...)` for primitives and identity.
- Use `await expect(promise).rejects.toThrow(...)` for async error
  cases instead of try/catch in tests.
- Isolate slow suites (integration tests) from fast unit tests with
  separate configs or projects so the fast loop stays fast.
- When a test is flaky, run it repeatedly with `--sequence.shuffle`
  and `--run` to find order dependence before assuming the code is at
  fault.

## Security Considerations

- Never commit real credentials or tokens in test files, fixtures, or
  snapshots; use obviously fake values.
- Do not run tests against production services; Vitest suites should
  use fakes, local containers, or doubles.
- Coverage and snapshot files can leak implementation details; keep
  them out of published packages.
- Be careful with `vi.mock()` of security-sensitive modules (auth,
  crypto): mocking them can hide real vulnerabilities, so cover the
  real behavior in `integration-testing`.

## Performance Considerations

- Vitest runs test files in parallel workers by default; keep test
  files independent so parallelism stays safe.
- Avoid a global setup that starts heavy services for every file; use
  per-project setup for integration suites.
- DOM environments are slower than `node`; only use them where the DOM
  is actually needed.
- Coverage collection slows runs; collect coverage in CI or on demand,
  not in the default watch loop.

## Common Mistakes

- Forgetting `vi.clearAllMocks()` — mock call history leaks between
  tests and creates order-dependent failures.
- Mocking the module under test — the test then verifies the mock, not
  the code.
- Using globals without declaring them — tests fail under strict
  TypeScript or in other runners.
- Mixing `jsdom` and `node` environments in one file — the environment
  is per file, so split DOM tests out.
- Asserting on `toBe` for objects — `toBe` checks identity, so use
  `toEqual` for structural comparison.
- Running watch mode in CI — CI must use `vitest run` so the process
  exits.
- Snapshot tests for large objects — they become unreadable and get
  updated blindly.

## Examples

```ts
// vitest.config.ts — minimal, explicit setup.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
    },
  },
});
```

```ts
// user-service.test.ts — mocking a module boundary.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDisplayName } from "./user-service";
import { fetchUser } from "./user-api";

vi.mock("./user-api", () => ({
  fetchUser: vi.fn(),
}));

describe("getDisplayName", () => {
  beforeEach(() => {
    vi.mocked(fetchUser).mockResolvedValue({ name: "Ada", id: "u-1" });
  });

  it("returns the user's name", async () => {
    await expect(getDisplayName("u-1")).resolves.toBe("Ada");
  });
});
```

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Validation Checklist

- [ ] `npx vitest run` passes on a fresh checkout.
- [ ] Watch mode works for local development.
- [ ] Coverage report generates and thresholds (if set) are met.
- [ ] Mocks are cleared between tests; no order-dependent failures.
- [ ] DOM tests run in a DOM environment; all other tests run in
      `node`.
- [ ] CI runs `vitest run` (not watch mode) and fails the build on
      test failure.
- [ ] No real credentials or production URLs appear in tests.

## Expected Deliverables

- `vitest.config.ts` (or test section in the Vite config) and the
  `package.json` test scripts.
- Test files following the project's naming convention.
- A coverage report (or the command to produce one) for the touched
  code.
- CI configuration running the suite.

## References

- [Vitest documentation](https://vitest.dev/) — guide and API.
- [Vitest API reference](https://vitest.dev/api/) — assertions,
  mocking, and timers.
- Related skills in this repository: `unit-testing`,
  `integration-testing`, `playwright`, `regression-testing`.
