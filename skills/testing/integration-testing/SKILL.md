---
name: integration-testing
description: >
  Verify that modules, services, databases, and APIs work correctly
  together. Use when testing API endpoints against a real database, service
  wiring, message flows, or third-party integrations; when a unit test
  cannot catch a wiring bug; or when setting up test databases, containers,
  and service doubles for a project.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Integration Testing

## Purpose

Integration tests prove that parts of a system work together: an HTTP
handler with its real database, a service with its real queue, or a
client with a real (or faithfully simulated) third-party API. They catch
the wiring bugs unit tests cannot see — wrong SQL, mismatched schemas,
misconfigured clients, broken serialization — while staying faster and
more focused than full end-to-end tests.

## When to Use

- Testing an API endpoint against a real database (create, read, update,
  delete, and error paths).
- Verifying ORM queries, migrations, transactions, and constraints.
- Testing service-to-service calls, webhooks, and message consumers.
- Checking that configuration, dependency injection, and startup wiring
  produce a working application.
- Testing file uploads, background jobs, and scheduled tasks against
  real infrastructure.
- Reproducing a bug that only appears when components interact.

## When Not to Use

- Testing pure logic or a single function in isolation — use
  `unit-testing` instead.
- Testing the full user journey through a real browser — use
  `e2e-testing` or `playwright`.
- Measuring performance under load — use `performance-testing`.
- Verifying third-party behavior you do not control; contract-test the
  boundary or use a recorded double instead of hitting the live service.

## Prerequisites

- A way to run real dependencies locally: containers (Docker or
  Testcontainers), a local database, or an in-memory equivalent that
  matches production behavior.
- A disposable test database or namespace that tests may create, migrate,
  and wipe freely. Never point integration tests at production data.
- A test runner configured to run integration tests separately from unit
  tests (different directory, tag, or command).
- Migrations and seed scripts checked into the repository so the test
  environment is reproducible.

## Official Documentation

- [Testcontainers](https://testcontainers.com/) — disposable containers
  for databases and services in tests.
- [MSW (Mock Service Worker)](https://mswjs.io/) — intercept HTTP at the
  network level for dependable API doubles.
- [Prisma documentation](https://www.prisma.io/docs) — ORM setup,
  migrations, and testing patterns for Prisma-based projects.
- [Vitest](https://vitest.dev/) — runner configuration for separating
  test suites.

## Required Workflow

1. Decide the boundary: which real components participate and which are
   doubled. Keep the boundary as small as the test allows.
2. Provision dependencies before the suite runs: start containers or a
   local database, run migrations, and confirm connectivity.
3. Seed only the data the test needs, in the test itself or a per-test
   setup hook. Prefer building data through the public API or factories
   over raw SQL inserts.
4. Exercise the system through its real entry point (HTTP request, queue
   message, CLI invocation), not by calling internals directly.
5. Assert on observable outcomes: response status and body, database
   rows, emitted messages, files written.
6. Clean up after each test: truncate tables, reset state, or roll back
   a transaction so tests stay independent.
7. Tear down containers or close connections when the suite finishes so
   the process exits cleanly.
8. Run the suite in CI against the same container images used locally.

## Implementation Standards

- Keep integration tests in their own directory (for example,
  `tests/integration/`) with their own run command, separate from unit
  tests.
- Each test owns its data: create what it needs, clean up what it made.
  Never rely on data left behind by another test or on a fixed seed
  database.
- Use the same database engine and major version in tests as in
  production; an in-memory stand-in that behaves differently hides real
  bugs.
- Prefer transactions that roll back over truncating tables between
  tests when the framework supports it; it is faster and more reliable.
- Double external HTTP services with a network-level interceptor or a
  recorded response, never with a live third-party call in CI.
- Timeouts must be explicit and generous enough for cold CI runners but
  short enough to fail fast on a hang (tens of seconds, not minutes).
- Tests must be runnable with a single documented command and must pass
  on a fresh checkout after dependency install.
- Do not share one database across parallel test workers unless each
  worker gets its own schema or database.

## Best Practices

- Test the unhappy paths at the boundary: invalid payloads, missing
  records, constraint violations, and upstream failures.
- Assert the full round trip (write then read back) rather than only
  the immediate response, to catch serialization and persistence bugs.
- Keep the number of integration tests modest: cover each endpoint and
  each integration once, and push detailed branching down to unit tests.
- Use stable, explicit waits for asynchronous side effects (poll for
  the expected state with a deadline) instead of fixed sleeps.
- Log the container and dependency versions used so a failure can be
  reproduced locally.
- Reuse one shared setup helper for provisioning; do not copy container
  startup code into every test file.

## Security Considerations

- Integration tests must never run against production systems or real
  user data. Use local or ephemeral environments only.
- Test credentials must be obviously fake and scoped to the test
  environment; see `secrets-management` for how real secrets are handled.
- Tests that exercise authentication should verify that unauthorized
  requests are rejected at the real boundary, not just in unit tests.
- Do not commit recorded HTTP fixtures containing real tokens or
  personal data; scrub fixtures before committing.

## Performance Considerations

- Container startup dominates suite time: start dependencies once per
  suite (or per worker), not once per test.
- Prefer lightweight images and tmpfs-backed databases where the engine
  allows it.
- Parallelize by giving each worker its own database; measure before
  assuming parallelism helps.
- Keep the integration suite fast enough to run on every pull request;
  if it exceeds a few minutes, split slow tests into a nightly job.

## Common Mistakes

- Testing against a shared development database — tests interfere with
  each other and with developers' work.
- Depending on test order — data created by one test leaking into the
  next makes failures unreproducible.
- Hitting live third-party APIs in tests — slow, flaky, and can mutate
  real external state.
- Sleeping instead of polling — fixed sleeps are either too short on
  slow CI or wasteful on fast machines.
- Asserting only the HTTP status — a 200 with the wrong body or no
  database row is still a bug.
- Skipping cleanup — leftover rows eventually break unrelated tests in
  confusing ways.

## Examples

```ts
// tests/integration/orders.test.ts — endpoint plus real database.
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

describe("POST /api/orders", () => {
  beforeAll(async () => {
    await startTestDatabase(); // Container or local test database.
    await runMigrations();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await truncateTables(["orders", "order_items"]);
  });

  it("creates an order and persists its items", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      payload: { items: [{ sku: "BOOK-1", qty: 2 }] },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    const rows = await db.query("SELECT * FROM order_items WHERE order_id = $1", [body.id]);
    expect(rows).toHaveLength(1);
  });

  it("rejects an order with no items", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/orders",
      payload: { items: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

## Validation Checklist

- [ ] Tests run against real dependencies, not mocks of the code under
      test, with external services doubled at the network boundary.
- [ ] Every test creates its own data and cleans up after itself.
- [ ] Tests pass in any order, in parallel, and on a fresh checkout.
- [ ] No test touches production systems, real credentials, or live
      third-party APIs.
- [ ] The suite runs in CI against the same dependency versions as local
      runs.
- [ ] Failures print enough context (request, response, database state)
      to reproduce them locally.

## Expected Deliverables

- Integration test files under the project's integration test directory,
  with shared setup/teardown helpers.
- Documentation of the command that provisions dependencies and runs
  the suite (for example, in the project README or a test README).
- CI configuration that runs the integration suite on pull requests.
- A note on any integration deliberately left untested and why.

## References

- [Testcontainers](https://testcontainers.com/) — disposable
  dependencies for tests.
- [MSW](https://mswjs.io/) — network-level API mocking.
- [Prisma documentation](https://www.prisma.io/docs) — database
  access and migrations.
- Related skills in this repository: `unit-testing`, `e2e-testing`,
  `vitest`, `regression-testing`.
