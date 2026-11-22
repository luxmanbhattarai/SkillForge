---
name: rest-api
description: >
  Build REST APIs with HTTP methods, resource routes, validation, pagination,
  and OpenAPI documentation. Use when implementing a REST endpoint or service,
  adding CRUD operations, wiring request validation and error responses, or
  documenting an existing REST API.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires a Node.js HTTP framework such as Hono or Express and TypeScript 7.x.
---

# REST API

## Purpose

This skill covers implementing a REST API on top of a Node.js HTTP
framework: resource routing, request validation, response shaping,
pagination, error handling, and OpenAPI documentation. The outcome is a
REST service whose behavior matches its documented contract and whose
errors clients can handle programmatically.

## When to Use

- Implementing REST endpoints for a new or existing service.
- Adding CRUD operations, filtering, sorting, or pagination to an API.
- Wiring request validation and consistent error responses.
- Generating or maintaining OpenAPI documentation for a REST API.
- Reviewing a REST API for correctness against HTTP semantics.

## When Not to Use

- Designing the API contract from scratch — use `api-design` first.
- Building a GraphQL API — use `graphql`.
- Building a type-safe RPC API for a TypeScript monorepo — use `trpc`.
- Choosing the HTTP framework — see `hono` or `nodejs` for framework
  selection.

## Prerequisites

- An agreed API contract (see `api-design`) or a clear list of resources
  and operations.
- A Node.js project with an HTTP framework installed (Hono is the
  recommended default in this library; see `hono`).
- Familiarity with HTTP methods, status codes, and JSON.

## Official Documentation

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
  — methods, status codes, and headers.
- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
  — the standard error response format.
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) —
  machine-readable API documentation. OpenAPI 3.2 is current (3.2.1
  is the latest patch, September 2026, editorial only); new contracts
  should target 3.2.
- [Hono documentation](https://hono.dev/docs) — the recommended HTTP
  framework for new REST APIs in this library (Hono 4.13.x current).
  Validate with Zod 4.x (`zod@4`, latest 4.6.7, October 2026); the
  `zod/v3` subpath is a frozen copy of the old API for migration
  only.

## Required Workflow

1. Read the API contract. If none exists, follow `api-design` to write
   one before implementing.
2. Define the routes and their handlers, one resource per module, with
   the framework's router.
3. Add request validation at the boundary: validate path parameters,
   query strings, and JSON bodies against a schema before any business
   logic runs.
4. Implement the handler: load data, apply business rules, and return
   the response shape defined by the contract.
5. Add pagination to every collection endpoint and filtering and sorting
   where the contract requires them.
6. Centralize error handling: map thrown errors to RFC 9457 problem
   details with the correct status code.
7. Write tests for each endpoint: success, validation failure, not
   found, and unauthorized cases.
8. Generate or update the OpenAPI document from the implementation or
   the contract, and verify it matches the live behavior.
9. Verify authentication, authorization, and rate limiting on every
   route before shipping.

## Implementation Standards

- Use the standard method mapping: `GET` reads, `POST` creates,
  `PUT` replaces, `PATCH` partially updates, `DELETE` removes.
  `GET`, `PUT`, and `DELETE` must be idempotent; `POST` is not.
- Return `201 Created` with a `Location` header on creation,
  `200` on successful reads and updates, and `204 No Content` on
  successful deletion with no body.
- Validate with a schema validator (such as Zod) at the route boundary.
  Reject invalid requests with `400` (malformed) or `422` (well-formed
  but invalid), including a problem detail that names the offending
  field.
- Return errors as RFC 9457 Problem Details with
  `Content-Type: application/problem+json`. Never return a stack trace
  or internal error message to the client.
- Wrap collection responses in an object carrying `data` and
  pagination metadata (`next_cursor` / `has_more` or `page` /
  `total`). Never return a bare array.
- Enforce a maximum page size (for example 100 items) and a sensible
  default (for example 20 items); clamp out-of-range values instead of
  erroring where the contract allows.
- Use ISO 8601 UTC timestamps, integer minor units for money, and
  opaque string identifiers in every response.
- Keep handlers thin: parse and validate input, call a service
  function, map the result to the response shape. Business logic lives
  in service modules, not in route handlers.
- Version the API in the path (`/v1/...`) and keep the version in the
  OpenAPI document.

## Best Practices

- Return a `Location` header pointing at the created resource so
  clients do not have to construct URLs.
- Support `HEAD` and conditional requests (`ETag` / `If-None-Match`)
  for cacheable reads.
- Accept and return JSON only, unless the contract explicitly defines
  another media type; reject other content types with `415`.
- Log each request with method, path, status, duration, and a request
  ID; correlate errors with that ID.
- Keep response shapes stable: adding a field is safe, removing or
  renaming one is a breaking change.
- Test the API through HTTP (using the framework's test client or a
  real server), not by calling handler functions directly.
- Document every query parameter, including its type, default, and
  allowed values.

## Security Considerations

- Authenticate every route by default; mark public routes explicitly.
- Authorize per resource: verify the caller owns or may access the
  specific resource, not just that they hold a valid token.
- Validate and bound all input: string lengths, array sizes, numeric
  ranges, and page sizes. Reject oversized bodies with `413`.
- Use parameterized queries or an ORM for all database access; never
  interpolate user input into a query string.
- Set a global request timeout and body size limit so a slow or huge
  request cannot exhaust the server.
- Do not reflect user input into error messages or headers without
  escaping; do not leak whether a resource exists through different
  error messages for unauthorized access.

## Performance Considerations

- Paginate every collection; never return an unbounded list.
- Use cursor pagination for large collections and offset pagination
  only for small, stable lists.
- Add database indexes for the columns used in filters and sort orders.
- Cache cacheable `GET` responses with `Cache-Control` and `ETag`
  (see `caching`).
- Avoid the N+1 problem: fetch related data in bulk instead of one
  query per item.
- Return only the fields the client needs; support field selection
  for large resources.

## Common Mistakes

- Putting business logic in route handlers — it becomes untestable and
  duplicated. Move it to service modules.
- Returning `200` with an error body — clients check the status code
  first. Use the correct code.
- Validating only in the client — client validation is a convenience,
  server validation is the contract. Always validate server-side.
- Forgetting to paginate — a list endpoint that works with 100 rows
  breaks with 100,000. Paginate from day one.
- Leaking internal errors — a database error message in the response
  reveals schema details. Map errors to problem details.
- Using `POST` for everything — loses idempotency, caching, and
  semantics. Use the method that matches the operation.

## Examples

A Hono route with validation and a problem-detail error response:

```ts
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono();

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  totalMinor: z.number().int().positive(),
  currency: z.string().length(3),
});

app.post("/v1/orders", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        type: "https://api.example.com/problems/validation-error",
        title: "Validation failed",
        status: 422,
        detail: parsed.error.issues.map((i) => i.message).join("; "),
      },
      422,
      { "content-type": "application/problem+json" },
    );
  }
  const order = { id: "ord_01", ...parsed.data, status: "created" };
  return c.json(order, 201, { Location: `/v1/orders/${order.id}` });
});

export default app;
```

## Validation Checklist

- [ ] Every endpoint matches the contract: method, path, request shape,
      response shape, and status codes.
- [ ] Invalid input returns `400` or `422` with a problem detail naming
      the field.
- [ ] Missing resources return `404`; unauthorized access returns `401`
      or `403`.
- [ ] Every collection endpoint paginates with a documented default and
      maximum page size.
- [ ] Tests cover success, validation failure, not-found, and
      unauthorized cases for each endpoint.
- [ ] The OpenAPI document matches the live behavior.
- [ ] No internal error details, stack traces, or secrets appear in
      responses.

## Expected Deliverables

- Implemented routes with validation, error handling, and pagination.
- Tests for each endpoint covering the cases in the checklist.
- An updated OpenAPI document matching the implementation.
- A short summary of any deviations from the contract, with reasons.

## References

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457 — Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html)
- [Hono documentation](https://hono.dev/docs)
- Related skills in this repository: `api-design`, `hono`, `nodejs`,
  `rate-limiting`, `caching`, `authentication`.
