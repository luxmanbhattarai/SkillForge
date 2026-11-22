---
name: e2e-testing
description: >
  Test complete user journeys through the real application in a real
  browser or client. Use when verifying critical flows like signup,
  checkout, or publishing; when a release needs a smoke test; or when
  choosing what to cover end to end versus at lower test levels. Covers
  flow selection, test data, selectors, flakiness, and CI setup.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# End-to-End Testing

## Purpose

End-to-end (E2E) tests exercise the whole system the way a user does:
open the real application, click through a real flow, and verify the
real outcome. They are the only tests that catch failures spanning the
UI, API, database, and third-party services together. Because they are
slow and comparatively brittle, they should cover a small number of
critical journeys — and cover those journeys well.

## When to Use

- Verifying critical user journeys: signup, login, checkout, payment,
  publishing, onboarding.
- Smoke-testing a release candidate or a staging deployment before
  shipping.
- Reproducing a bug that only appears in the assembled system.
- Guarding a flow whose failure would directly cost revenue or trust.
- Confirming that a migration, upgrade, or infrastructure change did
  not break the product.

## When Not to Use

- Testing detailed branching logic or edge cases — push those down to
  `unit-testing` or `integration-testing`.
- Testing API behavior without a UI — use `integration-testing`.
- Measuring speed or load — use `performance-testing`.
- Verifying visual design details — use screenshots sparingly and pair
  with `accessibility-testing` for structural checks.
- Covering every page and permutation; E2E suites that try to cover
  everything become slow, flaky, and ignored.

## Prerequisites

- A runnable build of the application (development server or preview
  build) plus its dependencies, in a dedicated test environment.
- A browser automation tool installed (Playwright is recommended; see
  the `playwright` skill).
- Test accounts and seed data that can be created and destroyed freely.
- A way to reset application state between tests (fresh database,
  seeded fixtures, or isolated user accounts).

## Official Documentation

- [Playwright](https://playwright.dev/) — recommended browser
  automation and E2E framework.
- [Cypress](https://www.cypress.io/) — alternative E2E framework.
- [Testing Library](https://testing-library.com/) — user-centric
  querying principles that apply to E2E selectors too.

## Required Workflow

1. Pick the journeys to cover: the smallest set that protects the
   business-critical flows. Write each journey as a user story with a
   clear start state and expected outcome.
2. For each journey, define the test data it needs and how state is
   reset before it runs.
3. Build the application and start it in the test environment with
   test configuration (test database, stubbed payments, stubbed email).
4. Write the test to act like a user: navigate, fill forms by label,
   click buttons by accessible name, and assert on visible outcomes.
5. Assert on what the user sees and on the resulting state (for
   example, the order appears in the account page), not on internal
   implementation details.
6. Run the test against the real build. Fix flakiness before adding
   more tests: a flaky E2E test is worse than no test.
7. Wire the suite into CI so it runs against every release candidate,
   with artifacts (screenshots, traces, videos) saved on failure.

## Implementation Standards

- Keep the E2E suite small: cover critical journeys only. A typical
  product needs a handful to a few dozen E2E tests, not hundreds.
- Use resilient selectors in this order of preference: accessible role
  and name, label text, test id, and only as a last resort CSS or text
  that may change with styling.
- Each test is independent: it sets up its own data and does not depend
  on another test having run.
- Use the framework's auto-waiting and assertions; never use fixed
  sleeps to wait for the UI.
- Never depend on the clock, randomness, or external services that can
  change: stub payments, email, and third-party APIs.
- Page interactions that repeat across tests belong in a small page
  object or helper, not copied into every test.
- Tests run against a build close to production (production build
  where feasible), not only against the development server.
- Failures must produce artifacts: a screenshot, a trace, or a video,
  and the console errors from the page.

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

- Test the journey, not the page: one test follows a user from intent
  to outcome (search, add to cart, check out), not one test per screen.
- Log in once per test via a fast path (API login or stored auth state)
  instead of clicking through the login form in every test — but keep
  one test that exercises the real login form.
- Seed data through the API or database, not through the UI, to keep
  tests fast and focused on the journey itself.
- Run the suite against a staging-like environment that mirrors
  production configuration.
- Quarantine a flaky test immediately, fix it, and only then return it
  to the suite; never let a red suite become normal.
- Review E2E coverage after every incident: if a production bug escaped,
  add the journey that would have caught it.

## Security Considerations

- E2E tests run against test environments only, with test accounts and
  obviously fake credentials; never against production.
- Stub payment providers in test mode; never submit real payment
  details through an E2E test.
- Test data must not contain real personal data. Generate synthetic
  users, emails, and addresses.
- Stored auth state and session files created by tests must be kept
  out of version control.

## Performance Considerations

- E2E tests are the slowest suite: keep the count low and the journeys
  short so the suite finishes in minutes, not hours.
- Parallelize across workers with isolated state per worker (separate
  users or databases).
- Reuse a warmed-up browser and a prebuilt application where the
  framework supports it.
- Run the full E2E suite on release candidates and nightly; run a
  small smoke subset on every pull request if the full suite is slow.

## Common Mistakes

- Covering everything end to end — the suite becomes slow, flaky, and
  eventually skipped. Push detail down the pyramid.
- Sleeping for fixed times — use auto-waiting assertions instead.
- Fragile selectors — selectors tied to CSS classes or DOM structure
  break on every redesign; prefer roles and accessible names.
- Shared test accounts — two tests using the same account interfere
  with each other and with parallel runs.
- Testing through the UI what could be set up via API — slow setup
  makes each test long and the failure harder to locate.
- Ignoring a red suite — once failures are tolerated, the suite stops
  protecting anything.

## Examples

```ts
// e2e/checkout.spec.ts — a critical journey, Playwright style.
import { test, expect } from "@playwright/test";

test("a shopper can complete checkout", async ({ page }) => {
  await page.goto("/products/widget");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();

  await page.getByLabel("Email").fill("shopper@example.test");
  await page.getByRole("button", { name: "Pay" }).click();

  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

```text
Journey selection checklist (write one line per journey):
- Signup with email -> lands on the welcome screen.
- Login with wrong password -> sees an error, stays on the login page.
- Add item to cart -> checkout -> order appears in account history.
- Publish an article -> it appears on the public listing page.
```

## Validation Checklist

- [ ] Each test covers one critical user journey from start to outcome.
- [ ] Tests pass reliably: three consecutive runs with no flakes.
- [ ] No fixed sleeps; all waits use the framework's auto-waiting.
- [ ] Selectors use roles, labels, or test ids — not styling hooks.
- [ ] Tests are independent and pass in parallel with isolated state.
- [ ] Failures produce a screenshot or trace and page console output.
- [ ] The suite runs in CI against a production-like build.
- [ ] Accessibility: keyboard-only journeys pass; axe runs on critical pages.

## Expected Deliverables

- E2E test files for the selected critical journeys, with shared
  helpers for login and setup.
- The list of journeys covered and the reasoning for what was excluded.
- CI configuration running the suite, with failure artifacts retained.
- A flake report: any test that failed intermittently during
  development and how it was fixed or quarantined.

## References

- [Playwright documentation](https://playwright.dev/) — E2E testing
  with auto-waiting, traces, and CI guides.
- [Cypress documentation](https://www.cypress.io/) — alternative
  E2E framework.
- Related skills in this repository: `playwright`, `unit-testing`,
  `integration-testing`, `regression-testing`, `accessibility-testing`.
