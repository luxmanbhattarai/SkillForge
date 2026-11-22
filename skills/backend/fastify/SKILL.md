---
name: fastify
description: >
  Build fast, low-overhead web APIs with Fastify: routing, plugins and
  encapsulation, JSON Schema validation and serialization, lifecycle
  hooks, Pino logging, performance tuning, testing with inject(), and
  deployment. Use when starting a new Fastify service, adding routes or
  plugins to an existing Fastify app, or choosing a high-throughput
  Node.js framework with built-in schema validation.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 20 or later (Fastify 5.x).
---

# Fastify

## Purpose

This skill covers building web APIs with Fastify, a fast and
low-overhead Node.js framework built around plugins, encapsulation,
and JSON Schema validation. It covers routing, the plugin system,
schema-based validation and serialization, lifecycle hooks, logging,
performance, testing, and deployment. The outcome is a Fastify
service that is fast, well-structured, and easy to test.

## When to Use

- Starting a new API or backend service with Fastify.
- Adding routes, plugins, hooks, or schemas to an existing Fastify
  app.
- Building a high-throughput JSON API where routing and
  serialization speed matter.
- Building a service that benefits from strict schema validation at
  the route boundary.
- Migrating an Express service to a faster framework with built-in
  validation.

## When Not to Use

- Building a full-stack app with server rendering and file routing —
  use `nextjs` or `astro` instead.
- Needing a prescribed, opinionated architecture with dependency
  injection — use `nestjs` instead.
- Building a GraphQL API — use `graphql` for schema and resolver
  design (Fastify can host the endpoint, but the GraphQL skill
  governs the schema).
- Needing to run outside Node.js — Fastify is Node-only.

## Prerequisites

- Node.js 20 or later installed.
- Familiarity with JavaScript or TypeScript, JSON Schema, and HTTP
  fundamentals.
- A project with `fastify` installed, or an existing Fastify app.
- Fastify 5.x (5.12.8, November 2026) is the current stable line.
  Fastify 4 reached end of life on 2025-06-30; new projects start
  on 5.x. Fastify 6 is in alpha and must not be used in production.

## Official Documentation

- [Fastify documentation](https://www.fastify.io/docs/latest/) —
  guides and reference. Fastify 5.x is the current release line.
- [Getting Started](https://www.fastify.io/docs/latest/Guides/Getting-Started/) —
  first server, first plugin, and validation.
- [Plugins](https://www.fastify.io/docs/latest/Reference/Plugins/) —
  the plugin system, `register`, and plugin options.
- [Encapsulation](https://www.fastify.io/docs/latest/Reference/Encapsulation/) —
  scopes, contexts, and the encapsulation model.
- [Validation and Serialization](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/) —
  JSON Schema validation, Ajv, and response serialization.
- [Hooks](https://www.fastify.io/docs/latest/Reference/Hooks/) —
  the request lifecycle and hook points.
- [Logging](https://www.fastify.io/docs/latest/Reference/Logging/) —
  Pino logger configuration and request logging.
- [Testing](https://www.fastify.io/docs/latest/Guides/Testing/) —
  testing with `inject()` and `fastify.ready()`.
- [TypeScript](https://www.fastify.io/docs/latest/Reference/TypeScript/) —
  type providers and typed routes.
- [Fastify releases](https://github.com/fastify/fastify/releases) —
  release notes and the current stable version.

## Required Workflow

1. Scaffold the app with a conventional layout: an entry point that
   creates the Fastify instance, a `plugins/` directory for shared
   plugins (database, auth), and a `routes/` directory with one
   plugin per resource, registered with a URL prefix.
2. Register plugins in dependency order: ecosystem plugins first,
   then your own plugins, then decorators, then hooks, then routes.
   Fastify loads plugins in registration order and only loads the
   next one once the current one is ready.
3. Define a JSON Schema for every route's `body`, `querystring`,
   `params`, and `response`. Schemas validate input and serialize
   output; handlers only ever see valid data.
4. Add cross-cutting behavior with hooks in the right scope:
   `onRequest` for early checks, `preHandler` for authentication,
   `onError` for error logging, `onResponse` for metrics.
5. Centralize errors with `setErrorHandler` and
   `setNotFoundHandler`: map known errors to consistent JSON
   responses and return a generic 500 for anything unexpected.
6. Add a health route (`/health`) and graceful shutdown
   (`fastify.close()` on `SIGTERM`/`SIGINT`) before deploying.
7. Test with `fastify.inject()` (or `fastify.ready()` plus
   `app.inject()`), which exercises routing, hooks, and handlers
   without binding a port.
8. Deploy with the production logger settings and verify the health
   endpoint in the deployed environment.

## Implementation Standards

- Everything is a plugin: register routes, database connections,
  and shared services with `fastify.register()`. Never mutate a
  shared instance from outside a plugin.
- Respect encapsulation: decorators and hooks registered inside a
  plugin are visible only in that plugin and its children. Use
  `fastify-plugin` only when a decorator or hook must escape its
  scope (for example a database client used by every route).
- Use `fastify-plugin` deliberately and sparingly; breaking
  encapsulation by default defeats the isolation the framework
  provides.
- Validate with JSON Schema on every route. Use `ajv` defaults via
  the built-in validator; add custom keywords or a custom validator
  compiler only when a schema cannot express the rule. For
  TypeScript-first schemas, use a type provider (`@fastify/type-provider-typebox`
  or `@fastify/type-provider-zod`) so route types derive from the
  schema instead of being written twice.
- Define `response` schemas: they strip undeclared properties from
  output (no leaking internal fields) and let Fastify serialize
  with generated code instead of `JSON.stringify`.
- Return values from async handlers instead of calling
  `reply.send()`; Fastify sends the returned value. Use `reply`
  explicitly only when setting a status code, headers, or streaming.
- Use `reply.code(201)` with a `Location` header on creation,
  `200` on reads and updates, and `204` on deletion with no body.
- Keep handlers thin: parse (already validated), call a service,
  return the result. Business logic lives in services, not routes.
- Use the built-in Pino logger (`fastify.log`, `request.log`) for
  all logging; never `console.log` in production code.
- Use `fastify.decorate()` for shared services, `decorateRequest()`
  for per-request data, and `decorateReply()` for response helpers.
- Prefer `async/await` handlers; Fastify catches rejected promises
  and routes them to the error handler.

### Testing Strategy

- Test routes with `fastify.inject()` instead of starting a
  real server: tests run faster, cannot collide on ports, and
  cover success, validation-failure, 404, and error-handler
  paths for every route.
- Test schema validation explicitly: a request that fails the
  JSON Schema gets a 400, and a response schema strips
  undeclared properties from the output.
- Test plugin encapsulation: a decorator or hook registered
  inside a plugin is invisible outside it, and only the plugins
  deliberately wrapped with `fastify-plugin` escape their
  scope.
- Test error handling: a rejected promise in an async handler
  reaches the error handler instead of crashing the process,
  and errors are serialized without leaking internals.
- Test with `fastify.ready()` before asserting on plugins that
  register asynchronously: assertions that run before the app
  is ready test an incomplete server.

## Best Practices

- Use `@fastify/autoload` to load route and plugin directories
  automatically as the app grows, keeping the entry point small.
- Put one resource per route file and register it with a versioned
  prefix (`/v1/orders`) so the API can evolve without breaking
  clients.
- Share schemas with `$id` and `fastify.addSchema()` instead of
  duplicating object definitions across routes.
- Use `onRequest` hooks for cheap, early rejections (malformed
  requests, blocked IPs) and `preHandler` hooks for auth, which
  runs after routing and validation.
- Give every request an id (`requestIdHeader` /
  `requestIdLogLabel`) and log it, so production issues are
  traceable across services.
- Use `@fastify/swagger` with `@fastify/swagger-ui` to generate
  OpenAPI documentation from the route schemas; the schemas already
  describe the API, so the docs stay in sync for free.
- Use `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`,
  and `@fastify/jwt` from the official ecosystem instead of
  hand-rolling CORS, security headers, throttling, or JWT handling.
- Set `connectionTimeout`, `keepAliveTimeout`, and
  `requestTimeout` explicitly in production so slow clients cannot
  hold connections indefinitely.
- Prefer `fastify.inject()` in tests over starting a real server:
  tests run faster and cannot collide on ports.

## Security Considerations

- Keep Fastify current: 5.12.8 fixes CVE-2026-120216
  (GHSA-3qgw-9275-xf8w), a denial-of-service crash when a route
  returns a streaming response past `handlerTimeout`. Versions
  5.8.0 through 5.12.7 are affected.
- Validate and bound all input with route schemas; set
  `bodyLimit` to reject oversized bodies and enforce request
  timeouts.
- Authenticate in a `preHandler` hook and authorize per resource
  inside handlers; a valid token is not permission to access any
  resource.
- Enable `@fastify/helmet` for security headers and configure
  `@fastify/cors` with an explicit origin allow-list.
- Rate-limit public and authentication endpoints with
  `@fastify/rate-limit` (see `rate-limiting`).
- Use parameterized queries or an ORM for database access; never
  interpolate user input into a query.
- Never log secrets, tokens, or full request bodies. Use Pino
  redaction (`redact` option) for sensitive fields.
- Set `trustProxy` only when the app genuinely sits behind a
  trusted proxy, and only to the proxies you control; a wrong
  setting lets clients spoof `request.ip`.
- Do not expose the Fastify version or stack traces in error
  responses; the default error handler already hides internals,
  and custom handlers must do the same.

## Performance Considerations

- Fastify's router and JSON serialization are fast; the usual
  bottlenecks are database queries and unbatched data loading, not
  the framework. Profile those first.
- Always define `response` schemas: generated serialization is
  substantially faster than `JSON.stringify` and strips extra
  fields for free.
- Keep hooks lean: every hook runs on every request in its scope.
  Move expensive work out of `onRequest` and into the handler, or
  off the request path entirely.
- Paginate every collection endpoint and cap page sizes.
- Use streaming responses for large payloads instead of buffering
  them, and set `handlerTimeout` so a stalled stream cannot hang a
  connection forever.
- Run the app in cluster mode (or behind a process manager) so all
  CPU cores serve traffic and a single process crash does not take
  the service down.
- Use the built-in Pino logger with async transports in production;
  synchronous logging to a slow destination blocks the event loop.
- Cache cacheable `GET` responses with `Cache-Control` and `ETag`
  (see `caching`).

## Common Mistakes

- Registering plugins in the wrong order — a route that uses a
  decorator must be registered after the plugin that defines it.
  Registration order is load order.
- Wrapping every plugin in `fastify-plugin` — it breaks
  encapsulation. Use it only for shared infrastructure such as a
  database client.
- Forgetting a `response` schema — internal fields leak to clients
  and serialization falls back to `JSON.stringify`.
- Calling `reply.send()` and also returning a value from an async
  handler — Fastify sends the reply twice and logs a warning.
  Return a value or use `reply`, not both.
- Putting business logic in route handlers — it becomes untestable
  and hard to reuse. Delegate to services.
- Using `console.log` instead of the Pino logger — logs lose
  structure, request ids, and level control.
- Starting a real server in tests — slow and flaky. Use
  `fastify.inject()`.
- Catching errors inside every handler instead of using
  `setErrorHandler` — inconsistent error responses. Centralize
  error handling.

## Examples

A Fastify app with a versioned route plugin, schema validation, and
centralized errors:

  [examples/fastify-app.ts](./examples/fastify-app.ts).

Testing the same app without binding a port:

  [examples/inject-test.ts](./examples/inject-test.ts).

## Validation Checklist

- [ ] Routes are organized by resource, one plugin per resource,
      mounted under a versioned prefix.
- [ ] Every route has `body`, `querystring`, `params`, and
      `response` schemas where applicable; invalid input returns
      `400`.
- [ ] `setErrorHandler` maps errors to consistent JSON responses;
      no stack traces leak to clients.
- [ ] Authentication runs in a `preHandler` hook before protected
      routes.
- [ ] Plugins are registered in dependency order; encapsulation is
      broken only deliberately with `fastify-plugin`.
- [ ] Tests use `fastify.inject()` and cover success, validation
      failure, and unauthorized cases.
- [ ] The health endpoint responds and graceful shutdown works in
      the deployed environment.

## Expected Deliverables

- A Fastify app with route plugins, JSON Schema validation, and
  centralized error handling.
- Hooks for logging, authentication, and metrics; official plugins
  for CORS, security headers, rate limiting, and OpenAPI docs.
- Tests exercising routes through `fastify.inject()`.
- Deployment configuration with explicit timeouts, structured
  logging, and a verified health check.

## References

- [Fastify documentation](https://www.fastify.io/docs/latest/)
- [Getting Started](https://www.fastify.io/docs/latest/Guides/Getting-Started/)
- [Plugins](https://www.fastify.io/docs/latest/Reference/Plugins/)
- [Encapsulation](https://www.fastify.io/docs/latest/Reference/Encapsulation/)
- [Validation and Serialization](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/)
- [Hooks](https://www.fastify.io/docs/latest/Reference/Hooks/)
- [Logging](https://www.fastify.io/docs/latest/Reference/Logging/)
- [Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [TypeScript](https://www.fastify.io/docs/latest/Reference/TypeScript/)
- [Fastify releases](https://github.com/fastify/fastify/releases)
- Related skills in this repository: `rest-api`, `api-design`,
  `nodejs`, `typescript`, `authentication`, `rate-limiting`,
  `caching`, `queues`, `background-jobs`, `observability`,
  `nestjs`, `express`, `hono`.
