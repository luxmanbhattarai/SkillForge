---
name: express
description: >
  Build web APIs and services with Express: routing and routers,
  middleware, error handling, security hardening with helmet and rate
  limiting, async patterns, testing, and production setup. Use when
  starting a new Express app, adding routes or middleware to an existing
  Express service, migrating an Express 4 app to Express 5, or choosing
  the minimal, widely-known Node.js web framework.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 18 or later (Express 5.x).
---

# Express

## Purpose

This skill covers building web applications and APIs with Express,
the minimal and unopinionated Node.js web framework. It covers
routing, middleware, error handling, security hardening, async
patterns, testing, and production setup. The outcome is an Express
service that is small, explicit, hardened, and ready for production.

## When to Use

- Starting a new API or web service with Express.
- Adding routes, middleware, or error handling to an existing
  Express app.
- Migrating an Express 4 app to Express 5.
- Building a service where minimalism and the largest middleware
  ecosystem matter more than built-in structure.
- Adding an HTTP layer to an existing Node.js codebase with the
  least new abstraction.

## When Not to Use

- Building a full-stack app with server rendering and file routing —
  use `nextjs` or `astro` instead.
- Needing a prescribed architecture with dependency injection and
  built-in modules — use `nestjs` instead.
- Needing built-in schema validation and higher throughput — use
  `fastify` or `hono` instead.
- Building a GraphQL API — use `graphql` for schema and resolver
  design (Express can host the endpoint, but the GraphQL skill
  governs the schema).
- Needing to run outside Node.js — Express is Node-only.

## Prerequisites

- Node.js 18 or later installed (Express 5.x requires Node.js 18+).
- Familiarity with JavaScript or TypeScript and HTTP fundamentals.
- A project with `express` installed, or an existing Express app.
- Express 5.x (5.3.0, October 2026) is the current stable line and
  the npm `latest` tag since 5.1.0 (2025-03-31). Express 4.x
  (4.22.3) remains on the `latest-4` tag and receives security
  maintenance only; new projects start on 5.x.

## Official Documentation

- [Express 5.x API reference](https://expressjs.com/en/5x/api.html) —
  the application, request, response, and router APIs.
- [Routing](https://expressjs.com/en/guide/routing.html) — route
  methods, route paths, parameters, and routers.
- [Using middleware](https://expressjs.com/en/guide/using-middleware.html) —
  application, router, built-in, and third-party middleware.
- [Error handling](https://expressjs.com/en/guide/error-handling.html) —
  synchronous and asynchronous errors and error middleware.
- [Production best practices: security](https://expressjs.com/en/advanced/best-practice-security.html) —
  the official security hardening guide.
- [Production best practices: performance](https://expressjs.com/en/advanced/best-practice-performance.html) —
  the official performance guide.
- [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html) —
  breaking changes and the upgrade path from Express 4.
- [Express releases](https://github.com/expressjs/express/releases) —
  release notes and the current stable version.

## Required Workflow

1. Scaffold the app with a conventional layout: an entry point that
   creates the app and starts the server, a `routes/` directory with
   one `express.Router()` per resource, a `middleware/` directory,
   and a `services/` directory for business logic.
2. Configure the app before any routes: disable the
   `x-powered-by` header, set `trust proxy` only if behind a trusted
   proxy, add JSON body parsing with a size limit, then security
   middleware (helmet, CORS, rate limiting).
3. Mount versioned routers (`/v1/users`, `/v1/orders`), one module
   per resource, and keep route handlers thin: validate input, call
   a service, send the response.
4. Validate input at the route boundary with a validation library
   (Zod, or `express-validator`); handlers only see valid data.
5. Add a centralized error-handling middleware last, after all
   routes: map known errors to consistent JSON responses and return
   a generic 500 for anything unexpected. Never leak stack traces.
6. Add a health endpoint (`GET /health`) and graceful shutdown
   (close the server and database connections on `SIGTERM`).
7. Write tests with supertest against the app object (no live port
   needed), covering success, validation failure, and unauthorized
   cases.
8. Deploy with `NODE_ENV=production`, behind a reverse proxy or
   process manager, and verify the health endpoint in the deployed
   environment.

## Implementation Standards

- One `express.Router()` per resource, mounted under a versioned
  prefix (`app.use("/v1/orders", ordersRouter)`). Keep route files
  small; split by operation if a resource module grows large.
- In Express 5, rejected promises in async route handlers and
  middleware are forwarded automatically to the error-handling
  middleware — no `.catch(next)` wrapper is needed. (This is a
  change from Express 4; verify behavior against the 5.x docs when
  migrating.)
- Register middleware in the correct order: body parsing, security,
  logging, then routers, then the 404 handler, then the error
  handler last. Middleware only applies to routes registered after
  it.
- Error-handling middleware has four arguments
  `(err, req, res, next)`; Express only treats a function as an
  error handler when it has all four.
- Return `201` with a `Location` header on creation, `200` on reads
  and updates, and `204` on deletion with no body.
- Validate with a schema library at the route boundary. With Zod,
  parse `req.body`, `req.query`, and `req.params` explicitly and
  return `400` with the validation issues on failure; with
  `express-validator`, use `validationResult(req)` before the
  handler body.
- Use `express.json({ limit: "100kb" })` (or a limit that fits the
  API) so oversized bodies are rejected before they reach handlers.
- Keep handlers free of business logic: parse, validate, call a
  service, map the result to a response.
- Use `res.status(...).json(...)` explicitly; never rely on the
  default `200` for creation or error responses.
- Express 5 uses path-to-regexp v8: wildcard and regex route syntax
  changed from Express 4 (for example, unnamed `*` wildcards are no
  longer valid). Check the migration guide when porting route
  patterns.
- Never use `app.get()` with a route string that comes from user
  input, and never interpolate user input into a route pattern.

## Best Practices

- Separate app creation from server startup: export the `app` from
  one module and call `app.listen()` in another, so tests can import
  the app without binding a port.
- Use `router.param()` sparingly; prefer explicit validation of
  `req.params` in the handler or a validation middleware.
- Mount a 404 handler after all routers that returns JSON (not the
  default HTML error page) for unknown API paths.
- Use `morgan` or a structured logger (Pino) for request logging;
  include a request id so production issues are traceable.
- Use `cors` with an explicit origin allow-list rather than the
  permissive default.
- Use `compression` for text responses, and prefer streaming for
  large payloads instead of buffering them.
- Document the API with an OpenAPI spec generated from route
  definitions or maintained alongside them (see
  `api-documentation`).
- When migrating from Express 4, run the official migration guide
  end to end and use the published codemod recipe for mechanical
  changes; re-test every route, since path-to-regexp v8 changes
  route matching.

## Security Considerations

- Follow the official security best practices guide; the items
  below summarize it.
- Disable the `x-powered-by` header (`app.disable("x-powered-by")`)
  so the framework and version are not advertised.
- Use helmet (8.x) to set security headers, including a content
  security policy for any HTML responses.
- Rate-limit public and authentication endpoints with
  `express-rate-limit` (8.x); use a shared store (such as Redis)
  when running more than one instance (see `rate-limiting`).
- Set `trust proxy` only when the app genuinely sits behind a
  trusted proxy, and only to the proxies you control; a wrong
  setting lets clients spoof `req.ip` and bypass IP-based rate
  limiting.
- Validate and bound all input; reject oversized bodies, enforce a
  request timeout, and never trust `req.query` or `req.params`
  without validation.
- Use parameterized queries or an ORM for database access; never
  interpolate user input into a query.
- Set cookies with `httpOnly`, `secure`, and an appropriate
  `sameSite` attribute; use `express-session` with a server-side
  store in production, never the default in-memory store.
- Keep dependencies current: Express 5.3.0 ships dependency
  updates that close CVEs in `qs`, `proxy-addr`, and `body-parser`.
  Run `npm audit` regularly and upgrade promptly.
- Never log secrets, tokens, or full request bodies, and never
  return stack traces to clients.

## Performance Considerations

- Express is minimal, so the usual bottlenecks are database queries,
  unbatched data loading, and synchronous work on the event loop —
  not the framework. Profile those first.
- Run with `NODE_ENV=production`: Express caches view templates
  and serves less verbose errors in production mode, and several
  dependencies behave differently (and faster) under it.
- Run the app in cluster mode or behind a process manager so all
  CPU cores serve traffic and a single process crash does not take
  the service down.
- Paginate every collection endpoint and cap page sizes; never
  return unbounded lists.
- Cache cacheable `GET` responses with `Cache-Control` and `ETag`
  (see `caching`), and use a reverse proxy or CDN for static
  assets rather than serving them from Express in production.
- Avoid synchronous filesystem and crypto calls in request
  handlers; they block the event loop for every concurrent request.
- Keep middleware lean: every middleware runs on every request it
  is registered for.
- Offload slow or bursty work (email, image processing, webhooks)
  to a queue rather than blocking the request (see `queues` and
  `background-jobs`).

## Common Mistakes

- Registering auth middleware after the routes it should protect —
  middleware only applies to routes registered after it. Order
  matters.
- Forgetting the four-argument signature on error middleware —
  Express treats a three-argument function as regular middleware
  and errors fall through to the default HTML error page.
- Returning the default HTML error page for API errors — add a
  centralized error handler that always returns JSON.
- Wrapping every async handler in try/catch or `.catch(next)` in
  Express 5 — rejected promises are forwarded automatically. (In
  Express 4 the wrapper was required; that is a real 4-to-5
  difference.)
- Using Express 4 route patterns (unnamed `*` wildcards, old regex
  syntax) in Express 5 — path-to-regexp v8 rejects them. Check the
  migration guide.
- Putting business logic in handlers — it becomes untestable and
  hard to reuse. Delegate to services.
- Leaving `trust proxy` unset behind a proxy (rate limiting and
  logging see the proxy's IP) or setting it to `true` without a
  proxy (clients can spoof their IP).
- Using the default in-memory session store or the default CORS
  settings in production — both are development-only behavior.

## Examples

An Express 5 app with security middleware, validation, and
centralized JSON error handling:

```ts
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

const createOrderSchema = z.object({
  totalMinor: z.number().int().positive(),
  currency: z.string().length(3),
});

const orders = express.Router();

orders.post("/", (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      type: "https://api.example.com/problems/validation-error",
      title: "Validation failed",
      status: 400,
      errors: parsed.error.issues,
    });
  }
  const order = { id: "ord_01", ...parsed.data, status: "created" };
  return res
    .status(201)
    .location(`/v1/orders/${order.id}`)
    .json(order);
});

app.use("/v1/orders", orders);
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req, res) => {
  res.status(404).json({
    type: "https://api.example.com/problems/not-found",
    title: "Not found",
    status: 404,
  });
});

// Four arguments: Express only treats this as an error handler
// when all four are present.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    type: "https://api.example.com/problems/internal-error",
    title: "Internal server error",
    status: 500,
  });
});
```

Start the server in a separate module so tests can import the app:

```ts
import { app } from "./app.js";

const server = app.listen(process.env.PORT ?? 3000, () => {
  console.log(`listening on ${process.env.PORT ?? 3000}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
```

## Validation Checklist

- [ ] Routes are organized by resource with `express.Router()` and
      mounted under a versioned prefix.
- [ ] Input is validated at the route boundary; invalid input
      returns `400` with JSON.
- [ ] The error handler has four arguments, runs last, and returns
      JSON; no stack traces or HTML error pages leak to API clients.
- [ ] `x-powered-by` is disabled, helmet is enabled, and CORS and
      rate limiting are configured explicitly.
- [ ] `trust proxy` matches the actual deployment topology.
- [ ] Authentication middleware runs before protected routes.
- [ ] Tests use supertest against the exported app and cover
      success, validation failure, and unauthorized cases.
- [ ] The health endpoint responds and graceful shutdown works in
      the deployed environment.

## Expected Deliverables

- An Express app with versioned routers, validation, and
  centralized JSON error handling.
- Middleware for security headers, CORS, rate limiting, logging,
  and authentication.
- Tests exercising routes through supertest.
- Production configuration (`NODE_ENV=production`, graceful
  shutdown, process manager or reverse proxy) and a verified
  health check.

## References

- [Express 5.x API reference](https://expressjs.com/en/5x/api.html)
- [Routing](https://expressjs.com/en/guide/routing.html)
- [Using middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Error handling](https://expressjs.com/en/guide/error-handling.html)
- [Production best practices: security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Production best practices: performance](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html)
- [Express releases](https://github.com/expressjs/express/releases)
- [helmet](https://helmetjs.github.io/)
- [express-rate-limit](https://express-rate-limit.mintlify.app/)
- Related skills in this repository: `rest-api`, `api-design`,
  `nodejs`, `typescript`, `authentication`, `rate-limiting`,
  `caching`, `queues`, `background-jobs`, `observability`,
  `nestjs`, `fastify`, `hono`.
