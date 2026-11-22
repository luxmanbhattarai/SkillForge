---
name: playwright
description: >
  Automate browsers with Playwright for end-to-end, visual, and
  cross-browser testing. Use when setting up Playwright, writing browser
  tests, debugging flaky selectors, capturing traces and screenshots,
  testing across Chromium, Firefox, and WebKit, or running browser tests
  in CI.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js and downloads browser binaries on install.
---

# Playwright

## Purpose

Playwright drives real browsers — Chromium, Firefox, and WebKit — with
a single API, auto-waiting assertions, and first-class debugging tools
(traces, screenshots, videos, and an inspector). This skill covers
setting up Playwright, writing resilient browser tests, and running
them reliably in CI. It is the recommended tool behind the
`e2e-testing` skill.

## When to Use

- Setting up browser automation or E2E tests in a project.
- Writing tests that click, type, and navigate through the real UI.
- Testing across multiple browsers or device viewports.
- Debugging a failing or flaky browser test with traces and the
  inspector.
- Capturing screenshots or testing visual regressions.
- Running browser tests in CI with artifacts on failure.

## When Not to Use

- Testing pure logic or a single function — use `unit-testing` with
  `vitest`.
- Testing an API without a UI — use `integration-testing`.
- Load testing — use `performance-testing`.
- Scraping websites at scale or automating third-party sites without
  permission; Playwright is for testing your own application.

## Prerequisites

- Node.js installed: use Node.js 22, 24, or 26. Playwright 1.65
  (current; 1.65.1 released 2026-11-13) no longer
  tests on Node.js 20, which reached end-of-life on 30 April 2026.
- Playwright installed, plus its browser binaries (installed with the
  Playwright install command).
- Version-specific differences to know: since 1.57 the bundled
  browser is Chrome for Testing rather than raw Chromium, and
  `Page#accessibility` was removed. In 1.65, TypeScript class fields
  follow `useDefineForClassFields` from `tsconfig.json` (page-object
  field initializers that read constructor parameters can break),
  actions wait for elements to stop being inert, and cookie matching
  follows RFC 6265; review those areas when upgrading.
- A runnable build of the application under test, or a development
  server Playwright can start via `webServer` config.
- A test environment with disposable data and test accounts.

## Official Documentation

- [Playwright](https://playwright.dev/) — getting started and guides.
- [Playwright introduction](https://playwright.dev/docs/intro) —
  installation and first test.
- [Playwright test configuration](https://playwright.dev/docs/test-configuration) —
  projects, reporters, retries, and the web server option.

## Required Workflow

1. Install Playwright and its browsers, and confirm the install with
   the built-in example test.
2. Create `playwright.config.ts`: set `testDir`, `baseURL`, the
   projects (browsers) to run, retries for CI, and artifact collection
   (screenshot and trace on failure).
3. Configure `webServer` so Playwright starts the application itself
   (or point `baseURL` at an already-running test deployment).
4. Write tests with role- and label-based locators
   (`getByRole`, `getByLabel`, `getByTestId`) and web-first assertions
   (`await expect(locator).toBeVisible()`).
5. Run tests locally in headed mode once to watch them, then headless
   for the regular loop.
6. Debug failures with the HTML report, traces, and the inspector;
   fix flakiness before adding more tests.
7. Run the suite in CI with retries enabled, sharding if the suite is
   large, and artifacts uploaded on failure.

## Implementation Standards

- Locators must use, in order of preference: `getByRole`,
  `getByLabel`, `getByText` (for stable visible copy), `getByTestId`,
  and only as a last resort CSS selectors. Never locate by fragile
  class names or deep DOM paths.
- Always use web-first assertions (`await expect(locator)...`); they
  auto-wait. Never use fixed sleeps.
- Each test gets a fresh browser context, so tests are isolated by
  default; do not share page state between tests.
- Reuse authentication via stored auth state (`storageState`) instead
  of logging in through the UI in every test — but keep one test that
  exercises the real login form.
- Shared interactions (login, creating a record) go in fixtures or
  page-object helpers, not copied into tests.
- Tests must run against a production-like build where feasible, not
  only the development server.
- Configure retries in CI only (for example, 2 retries); zero retries
  locally so flakiness is visible during development.
- Keep the number of browser projects small: run the full matrix
  (Chromium, Firefox, WebKit) on release branches and Chromium-only on
  every pull request if the suite is slow.

### Accessibility

- Include keyboard-only journeys: the critical flows work without a
  mouse, with focus always visible.
- Run axe in the E2E suite (`@axe-core/playwright` for Playwright) on
  every critical page; fail the build on violations.
- Assert accessible names and roles, not just visible text: `getByRole`
  queries prove the page is operable by assistive technology.
- Test at 200% zoom and a 320px viewport for at least the critical
  flows.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Name tests after the user outcome, not the mechanics
  (`shopper can complete checkout`, not `clicks button`).
- Use `page.getByRole("button", { name: "Save" })` — accessible names
  double as an accessibility check.
- Seed data through the API or database in a global setup step, not
  through the UI.
- Capture a trace on first retry so the first failure is debuggable
  without rerunning the suite.
- Use the code generator (`codegen`) to draft locators, then clean up
  the generated test by hand before committing.
- Run tests in parallel with isolated users or data per worker.
- Keep the suite small and critical; see `e2e-testing` for journey
  selection.

## Security Considerations

- Run Playwright tests against test environments only, with test
  accounts and obviously fake credentials.
- Auth state files (`storageState`) contain session cookies: keep them
  out of version control and out of published artifacts.
- Never automate logins to third-party services or bypass
  authentication controls (CAPTCHAs, MFA prompts) in tests; test your
  own application's behavior with stubbed providers.
- Traces and videos can capture sensitive test data; treat CI
  artifacts as internal and set a short retention period.

## Performance Considerations

- Browser tests are slow: parallelize across workers and shard across
  CI machines as the suite grows.
- Reuse the browser and a warmed-up application server; avoid starting
  a fresh server per test file.
- Prefer API-based setup and auth over UI clicks to keep each test
  short.
- Limit video recording to failures; recording every run wastes time
  and disk.

## Common Mistakes

- Using `page.waitForTimeout` (fixed sleep) — use auto-waiting
  assertions instead.
- Selecting by CSS class or XPath tied to implementation — breaks on
  every redesign.
- Sharing one test account across parallel tests — tests interfere and
  flake.
- Testing in headed mode only — headless behavior can differ; verify
  headless runs pass.
- Ignoring the trace — the trace viewer usually shows the failure
  cause in seconds.
- Retrying locally — retries hide flakiness; fix the flake instead.
- Over-using `page.evaluate` to poke at internals — test what the user
  sees and does.

## Examples

```ts
// playwright.config.ts — base setup with artifacts on failure.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  baseURL: "http://localhost:3000",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

```ts
// e2e/login.spec.ts — resilient locators, web-first assertions.
import { test, expect } from "@playwright/test";

test("user can log in with valid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.test");
  await page.getByLabel("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

## Validation Checklist

- [ ] `npx playwright test` passes headless on a fresh checkout.
- [ ] No fixed sleeps; all waits use auto-waiting locators and
      assertions.
- [ ] Locators use roles, labels, or test ids.
- [ ] Tests are independent and pass in parallel.
- [ ] Traces and screenshots are captured on failure and viewable in
      the HTML report.
- [ ] CI runs the suite with retries and uploads failure artifacts.
- [ ] Auth state files and test credentials are not committed.
- [ ] Accessibility: keyboard-only journeys pass; axe runs on critical pages.

## Expected Deliverables

- `playwright.config.ts` and the E2E test files with shared fixtures
  or page objects.
- The HTML report or CI run link showing a green suite.
- CI configuration running the suite, with artifacts on failure.
- A note on browsers covered and why any browser was excluded.

## References

- [Playwright documentation](https://playwright.dev/) — guides,
  API, and debugging tools.
- [Playwright test configuration](https://playwright.dev/docs/test-configuration) —
  projects, retries, and web server setup.
- Related skills in this repository: `e2e-testing`,
  `accessibility-testing`, `regression-testing`, `vitest`.
