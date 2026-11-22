---
name: hono
description: >
  Build fast, lightweight web APIs and services with the Hono framework:
  routing, middleware, validation, JSX rendering, and deployment to Node.js,
  Cloudflare Workers, and other runtimes. Use when starting a new Hono app,
  adding routes or middleware to an existing Hono service, or choosing a
  framework for a small, fast API.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js 24 LTS or later or a supported edge runtime; TypeScript 7.x recommended.
---

# Hono

## Purpose

This skill covers building web applications and APIs with Hono, a small
and fast web framework that runs on Node.js, Cloudflare Workers, Deno,
and other runtimes. It covers routing, middleware, validation, error
handling, and deployment. The outcome is a Hono service that is easy to
reason about, easy to test, and portable across runtimes.

## When to Use

- Starting a new API or web service with Hono.
- Adding routes, middleware, or validation to an existing Hono app.
- Building an API that must run on multiple runtimes (Node.js and edge).
- Choosing a lightweight framework for a small-to-medium API.
- Migrating a simple Express or Fastify service to Hono.

## When Not to Use

- Building a full-stack framework app with server rendering and file
  routing — use `nextjs` or `astro` instead.
- Building a GraphQL API — use `graphql` (Hono can host the endpoint,
  but the GraphQL skill governs the schema and resolvers).
- Building a type-safe RPC API in a TypeScript monorepo — use `trpc`.
- Needing a large plugin ecosystem (for example a mature admin panel or
  ORM integration tied to a specific framework) — a bigger framework
  may fit better.

## Prerequisites

- Node.js 24 LTS or later installed (26 is the current LTS line),
  or a target edge runtime such as Cloudflare Workers.
- Familiarity with TypeScript 7.x and HTTP fundamentals.
- A project scaffolded with Hono (for example via the Hono starter
  templates) or an existing Hono app.
- Hono 4.13.x (4.13.20, November 2026). Validate with Zod 4.x via
  `@hono/zod-validator` 0.9.x, which supports Zod 4.

## Official Documentation

- [Hono documentation](https://hono.dev/docs) — guides, API reference,
  and middleware catalog. Hono 4.13.x is the current release line.
- [Hono website](https://hono.dev/) — overview and getting started.
- [Node.js documentation](https://nodejs.org/docs/) — for Node.js
  deployment targets.

## Required Workflow

1. Choose the runtime target (Node.js, Cloudflare Workers, or another
   supported runtime) and scaffold the app for it.
2. Define the app entry point and mount routers by domain area
   (`/v1/users`, `/v1/orders`), one module per resource.
3. Add middleware in the correct order: logging, CORS, authentication,
   then route handlers. Register global error handling with
   `app.onError`.
4. Add request validation at the route boundary with the Hono Zod
   validator (or another validator), so handlers only see valid data.
5. Implement handlers: keep them thin, delegate to service modules,
   and return JSON with the correct status code.
6. Add a health endpoint and, for production, graceful shutdown on the
   Node.js adapter.
7. Write tests using Hono's test client (`app.request`) so tests run
   without starting a real server.
8. Deploy with the adapter for the chosen runtime and verify the health
   endpoint in the deployed environment.

## Implementation Standards

- One `Hono` app per service; compose routers with `app.route()` so
  each resource module owns its paths.
- Use the context object (`c`) for everything in a handler: read input
  with `c.req.json()`, `c.req.param()`, and `c.req.query()`; respond
  with `c.json()`, `c.text()`, or `c.html()`.
- Validate with the validator middleware (`zValidator` from
  `@hono/zod-validator`) and a Zod 4.x schema for `json`, `query`,
  and `param` inputs. Return `400` or `422` with a problem detail on
  validation failure.
- Centralize errors with `app.onError`: map known error types to
  RFC 9457 problem details and return a generic `500` for anything
  unexpected. Never leak stack traces to clients.
- Return `201` with a `Location` header on creation, `200` on reads
  and updates, and `204` on deletion with no body.
- Use middleware for cross-cutting concerns: `logger()`, `cors()`,
  `jwt()` or a custom auth middleware, and `secureHeaders()`.
- Keep handlers free of business logic: parse, validate, call a
  service, map the result.
- Type the context with `Hono<{ Variables: ... }>` when middleware
  stores values (such as the authenticated user) with `c.set()`.
- Prefer the Web Standards APIs Hono is built on (`Request`,
  `Response`, `fetch`) so the code stays portable across runtimes.
- Avoid Node.js-only APIs in shared code when the app must also run on
  an edge runtime.

## Best Practices

- Mount versioned routers (`/v1/...`) so the API can evolve without
  breaking clients.
- Use `app.request()` in tests: it exercises routing, middleware, and
  handlers without binding a port.
- Order middleware deliberately: logging first, then CORS, then auth,
  then the handler. A misplaced auth middleware either blocks public
  routes or leaves protected routes open.
- Use `c.var` (typed via `Variables`) to pass the authenticated user
  and request-scoped data between middleware and handlers.
- Keep route files small: if a resource module grows past a few hundred
  lines, split it by operation.
- Enable the trailing-slash behavior you want explicitly and document
  it; inconsistent trailing slashes produce confusing 404s.
- Use Hono's built-in helpers (`c.req.valid()`) to read validated data
  instead of re-parsing the request body.

## Security Considerations

- Authenticate with middleware and authorize per resource inside
  handlers; a valid token is not permission to access any resource.
- Enable `secureHeaders()` to set sensible security headers.
- Configure CORS narrowly: allow only the origins the app actually
  serves, and only the methods and headers it needs.
- Validate and bound all input; reject oversized bodies and enforce a
  request timeout.
- Use parameterized queries or an ORM for database access; never
  interpolate user input into a query.
- Never log secrets, tokens, or full request bodies.

## Performance Considerations

- Hono's router is fast; the usual bottlenecks are database queries
  and unbatched data loading, not the framework. Profile those first.
- Paginate every collection endpoint and cap page sizes.
- Use streaming responses for large payloads instead of buffering them.
- Cache cacheable `GET` responses with `Cache-Control` and `ETag`
  (see `caching`).
- On Node.js, run the app behind a process manager or cluster so a
  single process crash does not take the service down.
- Keep middleware lean: every middleware runs on every request it is
  registered for.

## Common Mistakes

- Forgetting `await` on `c.req.json()` — the body is a promise; using
  it unawaited produces confusing errors. Always await request reads.
- Registering auth middleware after the routes it should protect —
  middleware only applies to routes registered after it. Order matters.
- Returning `c.json()` with the wrong status code — the default is
  `200`; pass the status explicitly for creation (`201`) and errors.
- Putting business logic in handlers — it becomes untestable and hard
  to reuse. Delegate to service modules.
- Using Node.js-only APIs and then deploying to an edge runtime where
  they do not exist. Keep shared code on Web Standards APIs.
- Catching errors inside every handler instead of using `app.onError` —
  inconsistent error responses. Centralize error handling.

## Examples

A Hono app with a versioned router, validation, and centralized errors:

```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      type: "https://api.example.com/problems/internal-error",
      title: "Internal server error",
      status: 500,
    },
    500,
    { "content-type": "application/problem+json" },
  );
});

const orders = new Hono();
const createOrderSchema = z.object({
  totalMinor: z.number().int().positive(),
  currency: z.string().length(3),
});

orders.post("/", zValidator("json", createOrderSchema), (c) => {
  const input = c.req.valid("json");
  const order = { id: "ord_01", ...input, status: "created" };
  return c.json(order, 201, { Location: `/v1/orders/${order.id}` });
});

app.route("/v1/orders", orders);
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
```

## Validation Checklist

- [ ] Routes are organized by resource and mounted under a versioned
      prefix.
- [ ] Input is validated at the route boundary; invalid input returns
      `400` or `422` with a problem detail.
- [ ] `app.onError` maps errors to consistent responses; no stack
      traces leak to clients.
- [ ] Authentication middleware runs before protected routes.
- [ ] Tests use `app.request()` and cover success, validation failure,
      and unauthorized cases.
- [ ] The health endpoint responds in the deployed environment.
- [ ] No Node.js-only APIs are used in code that must run on an edge
      runtime.

## Expected Deliverables

- A Hono app with versioned routers, validation, and centralized error
  handling.
- Middleware for logging, CORS, security headers, and authentication.
- Tests exercising routes through `app.request()`.
- Deployment configuration for the chosen runtime and a verified
  health check.

## References

- [Hono documentation](https://hono.dev/docs)
- [Hono website](https://hono.dev/)
- [Node.js documentation](https://nodejs.org/docs/)
- Related skills in this repository: `rest-api`, `api-design`,
  `nodejs`, `trpc`, `cloudflare-workers`.
