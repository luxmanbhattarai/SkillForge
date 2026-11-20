---
name: api-design
description: >
  Design clean, consistent, versioned APIs that clients can rely on: resource
  modeling, naming, versioning, pagination, filtering, error formats, and
  idempotency. Use when planning a new API, reviewing an existing API's
  design, or deciding between REST, GraphQL, and RPC styles before building.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# API Design

## Purpose

This skill defines how to design an API before writing implementation code:
how resources are modeled, how endpoints are named, how the API evolves
without breaking clients, and how errors and pagination behave. The outcome
is a written API contract that implementers and client developers can both
build against without guessing.

## When to Use

- Planning a new public or internal API from scratch.
- Reviewing an existing API for consistency, usability, or breaking
  changes.
- Deciding between REST, GraphQL, and RPC for a new service.
- Defining versioning, pagination, filtering, and error conventions for
  a team.
- Writing an OpenAPI specification or API documentation for an existing
  service.

## When Not to Use

- Implementing a REST API once the design is settled — use `rest-api`.
- Implementing a GraphQL API — use `graphql`.
- Building a type-safe RPC API for a TypeScript monorepo — use `trpc`.
- Designing a client library around an existing API — use
  `sdk-development`.
- Documenting an API that already exists and will not change — write the
  docs from the implementation instead of redesigning it.

## Prerequisites

- A clear picture of the domain: the resources, their relationships, and
  the operations clients need.
- Knowledge of the client types (web app, mobile app, third-party
  integrators) and their constraints.
- Familiarity with HTTP semantics: methods, status codes, headers, and
  content negotiation.

## Official Documentation

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
  — the authoritative definition of methods, status codes, and headers.
- [RFC 9457 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
  — the standard error response format.
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0) — the
  standard machine-readable API description format.
- [Stripe API reference](https://docs.stripe.com/api) — a widely regarded
  example of consistent, well-documented API design.

## Required Workflow

1. List the resources the API exposes and the operations each supports.
   Name them with domain nouns, not verbs.
2. Choose the API style: REST for resource-oriented public APIs, GraphQL
   for flexible client-driven queries, RPC for internal type-safe calls.
   Record the decision and the reason.
3. Define the naming and URL conventions, the versioning strategy, and
   the error format before writing any endpoint.
4. Define pagination, filtering, sorting, and field selection once, and
   apply the same conventions to every collection endpoint.
5. Write the contract first as an OpenAPI document (for REST) or a schema
   (for GraphQL), and review it with the client developers before
   implementing.
6. Define the authentication and authorization model, and the rate
   limits, alongside the endpoints — not after launch.
7. Implement against the contract, then validate that the implementation
   matches it with contract tests or generated clients.
8. Publish documentation generated from the contract, with examples for
   every endpoint.

## Implementation Standards

- Resources are nouns in plural form (`/orders`, `/users`); actions are
  expressed with HTTP methods, not verbs in the path. Use a sub-resource
  for an action that does not map to a method, e.g.
  `POST /orders/{id}/cancel`.
- Version the API explicitly. Use a path version (`/v1/orders`) for
  public REST APIs; never change the meaning of a released endpoint
  without a new version.
- Every response uses a consistent envelope. Errors follow RFC 9457
  Problem Details: `type`, `title`, `status`, `detail`, and
  `instance` where useful.
- Use the correct status codes: `200` for successful reads, `201` for
  creation with a `Location` header, `204` for successful deletion with
  no body, `400` for invalid input, `401` for missing or invalid
  credentials, `403` for insufficient permission, `404` for a missing
  resource, `409` for a state conflict, `422` for validation failures
  when the request is well-formed but semantically wrong, and `429`
  when rate-limited.
- Paginate every collection endpoint. Prefer cursor-based pagination for
  large or frequently changing collections; offset pagination is
  acceptable for small, stable lists. Always document the default and
  maximum page size.
- Support idempotency for any operation that creates or charges
  something: accept an `Idempotency-Key` header and return the original
  result for a repeated key.
- Filter with query parameters (`?status=active`), sort with a `sort`
  parameter, and never expose internal database identifiers or column
  names in the public contract.
- Timestamps use ISO 8601 in UTC. Money uses integer minor units with an
  explicit currency field. Identifiers are opaque strings.
- Deprecate, never silently change: announce a deprecation with a
  `Deprecation` header and a sunset date, and keep the old behavior
  working until that date.

## Best Practices

- Design for the client, not the database: an endpoint should answer a
  client use case, not mirror a table.
- Keep responses small and predictable: return only the fields the
  client needs, and never return fields that change type between calls.
- Make list responses deterministic: define a default sort order so
  pagination is stable.
- Use `ETag` and `If-None-Match` for cacheable reads, and
  `If-Match` for optimistic concurrency on updates.
- Return a request identifier in every response header (for example
  `X-Request-Id`) so clients can report failures precisely.
- Write examples in the documentation for the success case, the common
  error case, and the edge case (empty list, missing field).
- Keep the number of endpoints small: prefer one flexible endpoint with
  filters over many narrow endpoints.

## Security Considerations

- Authenticate every endpoint by default; make an endpoint public only
  by an explicit decision, documented in the contract.
- Authorize per resource, not per endpoint: a valid token for one user
  must not grant access to another user's resources (see
  `authorization` if available in this library).
- Never expose internal error details, stack traces, or database errors
  in API responses; log them server-side and return a generic problem
  detail.
- Validate all input against the contract before processing it; reject
  unknown fields in strict mode for write endpoints.
- Rate-limit every public endpoint and document the limits (see
  `rate-limiting`).
- Do not put secrets, tokens, or personal data in URLs — URLs end up in
  logs.

## Performance Considerations

- Paginate and limit response sizes; a single response should rarely
  exceed a few hundred kilobytes.
- Offer field selection (`?fields=id,name`) for large resources so
  clients can request only what they need.
- Support conditional requests (`ETag`, `Last-Modified`) so clients can
  avoid re-downloading unchanged data.
- Prefer cursor pagination for large collections: offset pagination gets
  slower as the offset grows.
- Design bulk endpoints for clients that need many records; one request
  for 100 items beats 100 requests for one item each.
- Set explicit timeouts and document them so clients can distinguish a
  slow API from a broken one.

## Common Mistakes

- Versioning by accident — changing a field's meaning or type in place
  and breaking clients. Version explicitly and deprecate deliberately.
- Using `200` for every response, including errors — clients cannot
  distinguish success from failure without parsing the body. Use the
  correct status code.
- Returning a bare array at the top level — it cannot carry pagination
  metadata. Always wrap collections in an object.
- Inventing a custom error format — every client has to learn it. Use
  RFC 9457 Problem Details.
- Exposing database IDs and internal enums — they leak implementation
  details and make future refactors breaking changes. Use opaque IDs
  and documented enum values.
- Designing the API from the database schema — produces endpoints that
  match tables, not client needs. Start from the use cases.

## Examples

Cursor-paginated collection response with RFC 9457 error handling:

```json
{
  "data": [
    { "id": "ord_01", "status": "paid", "total_minor": 4999, "currency": "USD" }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6Im9yZF8wMSJ9",
    "has_more": true
  }
}
```

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "The 'email' field must be a valid email address.",
  "instance": "/v1/users"
}
```

Idempotency in a request:

```http
POST /v1/orders HTTP/1.1
Idempotency-Key: 7f3a9c2e-1b4d-4a8e-9c01-2d5f6a7b8c9d
Content-Type: application/json
```

## Validation Checklist

- [ ] Every endpoint is documented in the contract with request and
      response examples.
- [ ] The versioning strategy is written down and every endpoint carries
      a version.
- [ ] All collection endpoints paginate and document default and maximum
      page sizes.
- [ ] Errors follow RFC 9457 and use correct status codes.
- [ ] Mutating endpoints that create or charge accept an idempotency key.
- [ ] Authentication, authorization, and rate limits are defined for
      every endpoint.
- [ ] The contract has been reviewed by at least one client developer
      before implementation.

## Expected Deliverables

- A written API contract (OpenAPI document or schema) covering every
  endpoint, with examples.
- A conventions document covering naming, versioning, pagination,
  errors, and idempotency.
- A design decision record for the API style choice and any trade-offs.
- Documentation generated from the contract, ready to publish.

## References

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457 — Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [Stripe API reference](https://docs.stripe.com/api)
- Related skills in this repository: `rest-api`, `graphql`, `trpc`,
  `rate-limiting`, `sdk-development`.
