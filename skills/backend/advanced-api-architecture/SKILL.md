---
name: advanced-api-architecture
description: >
  Design production APIs at the architecture level: REST and GraphQL
  architecture decisions, API versioning, pagination and filtering,
  rate limiting strategy, idempotency, validation strategy, error
  handling, authentication and authorization, API security, caching,
  background jobs, webhooks, observability, and distributed-systems
  patterns. Use when designing a new API, evolving a public API,
  or reviewing an API's architecture before it ships.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Advanced API Architecture

## Purpose

This skill covers the architecture-level decisions behind a
production API: how it is versioned, paginated, secured, observed,
and evolved — and how it behaves under failure. It composes the
focused skills in this repository (`api-design`, `rest-api`,
`graphql`, `rate-limiting`, `queues`, `background-jobs`, `caching`,
`api-documentation`) and covers only the decisions that span them.
The outcome is an API whose contract is deliberate, whose failure
modes are designed, and whose evolution does not break clients.

## When to Use

- Designing a new public or partner-facing API from scratch.
- Choosing between REST, GraphQL, or both for a service.
- Deciding a versioning, pagination, or idempotency strategy.
- Reviewing an existing API's architecture before a launch or a
  major release.
- Designing webhooks, background processing, or cross-service
  communication for an API.
- Diagnosing systemic API problems: cascading failures, inconsistent
  errors, or clients breaking on every release.

## When Not to Use

- Designing the resource model and endpoints of a single REST API —
  use `rest-api` and `api-design` instead.
- Designing a GraphQL schema and resolvers — use `graphql` instead.
- Implementing rate limiting, queues, caching, or documentation —
  use `rate-limiting`, `queues`, `background-jobs`, `caching`, or
  `api-documentation` instead; this skill covers the strategy, not
  the implementation.
- Building the HTTP service itself — use `nestjs`, `fastify`,
  `express`, or `hono` for the framework.

## Prerequisites

- A defined product surface: who the API consumers are (first-party
  apps, partners, public developers) and what guarantees they need.
- Familiarity with HTTP semantics (methods, status codes, headers)
  and JSON.
- The focused skills for the parts being designed (`rest-api`,
  `graphql`, `rate-limiting`, `queues`, `background-jobs`,
  `caching`, `api-documentation`) — this skill assumes them and
  does not repeat them.
- Agreement on the deployment topology: one service or many, behind
  a gateway or direct, single region or multi-region.
- Conceptual skill; current stable as of 2026-11-20 — applies to
  current API frameworks; the standards it builds on (RFC 9110, RFC
  9111, RFC 9457, OpenAPI) are linked in Official Documentation; check
  the OpenAPI Specification changelog for the newest version before
  adopting a contract format.

## Official Documentation

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) —
  methods, status codes, and header semantics the API builds on.
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) —
  cache behavior, freshness, and validation.
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html) —
  the standard error response format (`application/problem+json`).
- [GraphQL specification](https://spec.graphql.org/) — the GraphQL
  type system, execution, and introspection rules.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) —
  the contract format for REST APIs.
- [OWASP API Security Top 10](https://owasp.org/API-Security/) —
  the canonical list of API security risks.
- [Idempotency-Key header draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) —
  the IETF draft standardizing the `Idempotency-Key` header.

## Required Workflow

1. Define the consumers and the contract guarantees: who calls the
   API, what backward-compatibility promise it makes, and what
   service-level expectations exist (latency, availability).
2. Choose the API style per surface: REST for resource-oriented
   CRUD and public APIs, GraphQL where clients need flexible,
   aggregated reads — and decide deliberately if both are offered.
   See `api-design` for the design process.
3. Fix the cross-cutting contract before writing endpoints:
   versioning strategy, pagination and filtering conventions, error
   format (RFC 9457 problem details), authentication and
   authorization model, and rate-limit policy. See `rest-api`,
   `graphql`, and `rate-limiting` for the mechanics.
4. Design idempotency for every mutating operation that a client
   might retry: safe retries require idempotency keys and
   server-side deduplication, not client luck.
5. Design the failure surface: timeouts, retries with backoff,
   circuit breakers, and bulkheads for every downstream dependency;
   decide what degrades and what fails fast.
6. Design async work explicitly: anything slow, bursty, or
   non-transactional goes to a queue and a background job, with a
   polling or webhook completion path. See `queues` and
   `background-jobs`.
7. Design webhooks as a first-class API surface: signed payloads,
   retries with backoff, delivery ordering guarantees (or their
   documented absence), and a replay mechanism.
8. Design observability in: structured logs with request ids,
   metrics per endpoint (rate, errors, duration), and distributed
   tracing across services. See `observability`.
9. Document the contract with OpenAPI (REST) or the schema
   (GraphQL), generated from code, and publish a changelog for
   every contract change. See `api-documentation`.
10. Review against the Validation Checklist and the OWASP API
    Security Top 10 before launch; load-test the endpoints the
    rate limits and timeouts are designed around.

## Implementation Standards

- One versioning strategy, applied consistently. URI versioning
  (`/v1/orders`) is the simplest to operate and cache; header or
  media-type versioning hides the version from the URL but complicates
  routing, caching, and debugging. Never mix strategies in one API.
  Never remove a field or change a field's meaning in a released
  version: add, deprecate with a `Deprecation` header and a sunset
  date, then remove in a new major version.
- Pagination is mandatory on every collection endpoint. Prefer
  cursor-based pagination for large or frequently-changing
  collections (stable under inserts, no deep-offset cost); offset
  pagination is acceptable only for small, stable collections.
  Cap page sizes server-side and document the cap.
- Filtering, sorting, and field selection follow one convention
  across the API (query parameters for REST), and every filterable
  field is indexed or explicitly documented as unindexed.
- Errors use RFC 9457 problem details (`application/problem+json`)
  with `type`, `title`, `status`, and `detail`, plus an
  extension member for machine-readable error codes. The same
  error type always maps to the same status code. Never return
  stack traces, internal identifiers, or database errors.
- Every mutating endpoint that a client may retry accepts an
  `Idempotency-Key` header. The server stores the key with the
  request fingerprint and the response, returns the stored response
  for a replayed key, and rejects a key reused with a different
  request body. Keys expire after a documented window.
- Validation happens at the boundary, before any business logic,
  and rejects unknown fields. A validation failure returns `400`
  (or `422`) with the problem detail and the failing fields; it
  never returns `500`.
- Authentication is separate from authorization: authentication
  establishes identity (OAuth 2.0 / OpenID Connect tokens or API
  keys for machine clients), authorization checks scopes and
  resource ownership per operation. A valid token is never
  permission to access any resource. See `authentication`.
- Rate limits are per consumer (per key, per user, per IP for
  unauthenticated traffic), communicated with `RateLimit-*`
  headers, and enforced at the gateway or the service edge — not
  inside business logic. See `rate-limiting`.
- Caching is designed, not accidental: decide per endpoint whether
  it is cacheable, who may cache it (client, CDN, gateway), and
  how it is invalidated. Use `Cache-Control`, `ETag`, and
  conditional requests for HTTP caching; use an application cache
  only for data whose staleness is acceptable and bounded. See
  `caching`.
- Webhooks are signed (HMAC over the payload with a per-consumer
  secret), retried with exponential backoff, and idempotent on the
  receiver's side via event ids. Delivery is at-least-once unless
  the design proves otherwise; document the guarantee.
- Background jobs are idempotent, retryable with backoff, and
  observable (queue depth, failure rate, dead-letter handling).
  A job that cannot be retried safely is a design bug. See
  `queues` and `background-jobs`.
- Every outbound call has a timeout, a retry policy with backoff
  and jitter, and a circuit breaker. Retries apply only to
  idempotent operations or to requests with an idempotency key.
- Timeouts are set end to end: the client timeout exceeds the
  server timeout, which exceeds the sum of downstream timeouts,
  so failures surface as controlled errors instead of hung
  requests.
- Distributed transactions are avoided: prefer sagas (compensating
  actions) or an outbox pattern over two-phase commit, and design
  each step to be retryable and idempotent.
- The API contract is the source of truth for clients: breaking
  changes require a new version, a changelog entry, and advance
  notice to consumers.

### Testing Strategy

- Contract-test every endpoint against the OpenAPI contract: response
  shapes, status codes, and error bodies must match the spec, and a
  breaking change must fail the test before it ships.
- Test idempotency directly: replaying a request with the same
  `Idempotency-Key` and body returns the stored response, and reusing
  a key with a different body is rejected.
- Test pagination for stability: a cursor page must not skip or repeat
  items when rows are inserted between requests.
- Test error handling as a contract: validation failures return
  problem details with the failing fields and never a `500` or a stack
  trace.
- Test rate limits, webhook signatures, and retry behavior with a test
  consumer, and load-test timeouts and circuit breakers so a slow
  downstream fails fast instead of hanging callers.

## Best Practices

- Design the API from the consumer's job, not from the database
  schema: resources should match what clients do, not what tables
  exist.
- Keep the surface small: every endpoint is a maintenance and
  security commitment. Prefer a few well-designed endpoints over
  many narrow ones.
- Use `POST` for actions that are not resource CRUD (for example
  `/v1/orders/{id}/cancel`) rather than inventing new HTTP methods
  or overloading `PUT`.
- Return the resource representation after a mutation so clients
  do not need a follow-up read.
- Include a `request-id` in every response and log line; it is the
  cheapest debugging tool an API has.
- Publish an OpenAPI document and a machine-readable changelog;
  generate client SDKs from the contract rather than hand-writing
  them.
- Design for the clients you have: a mobile client needs batched
  reads and small payloads; a partner integration needs webhooks
  and idempotency; an internal service needs tracing and strict
  timeouts.
- Load-test the endpoints the rate limits protect, and test the
  failure paths (dependency down, queue full, slow downstream) as
  deliberately as the happy paths.
- Review the API against the OWASP API Security Top 10 on every
  major release, not only at launch.

## Security Considerations

- Apply the OWASP API Security Top 10 as the review checklist:
  broken object-level authorization (BOLA), broken authentication,
  broken object-property-level authorization, unrestricted resource
  consumption, broken function-level authorization, unrestricted
  access to sensitive business flows, server-side request forgery,
  security misconfiguration, improper inventory management, and
  unsafe consumption of APIs.
- Authorize every object access: check that the caller may access
  the specific resource id in the request, not just that they hold
  a valid token. BOLA is the most common API vulnerability.
- Never expose internal identifiers, stack traces, or database
  errors; use opaque, unguessable ids for resources where
  enumeration would leak data.
- Enforce authorization at the function level as well as the
  object level: an endpoint that exists for admins must reject
  non-admin callers even if they guess the URL.
- Limit resource consumption per consumer: rate limits, payload
  size limits, pagination caps, and query-complexity limits for
  GraphQL. See `rate-limiting` and `graphql`.
- Validate and sanitize everything that reaches another system:
  user input must never become a query, a shell command, a file
  path, or an outbound URL without validation (SSRF).
- Sign and verify webhooks; never trust an incoming webhook
  payload without signature verification.
- Keep an inventory of every deployed API version and endpoint;
  forgotten versions and shadow endpoints are unpatched attack
  surface. Remove deprecated versions on their sunset date.
- Rotate API keys and webhook secrets, and support revocation
  without a deploy.

## Performance Considerations

- Latency budgets are set per endpoint and measured per endpoint
  (p50/p95/p99), not as a single average; a slow 1% is where
  clients notice.
- The usual bottlenecks are database queries (N+1, missing
  indexes, unbounded scans), unbatched data loading, and slow
  downstream calls — not the framework. Profile those first.
- Batch and paginate: GraphQL resolvers use batching (DataLoader
  pattern) to avoid N+1; REST list endpoints paginate and cap page
  sizes.
- Cache at the right layer: HTTP caching for public, stable reads;
  application caching for expensive computations; no caching for
  data that must be fresh. Every cache entry has a TTL and an
  invalidation story. See `caching`.
- Move slow work off the request path: anything over a few hundred
  milliseconds of server work belongs in a background job with a
  completion signal (webhook or polling). See `background-jobs`.
- Use connection pooling, keep-alive, and HTTP/2 or HTTP/3 where
  the deployment supports them; opening a new connection per
  request is a measurable tax.
- Set timeouts so a slow downstream cannot consume the whole
  server: a hung dependency should fail fast and free the worker.
- Rate limits protect performance as well as security: they bound
  the load any one consumer can impose. See `rate-limiting`.

## Common Mistakes

- Breaking clients with "small" changes — renaming a field,
  changing a type, or removing an endpoint in a released version.
  Additive changes only; removals need a new version.
- Returning `200` with an error body, or `500` for client errors —
  status codes are part of the contract. Use the right code and
  the problem-details format.
- Letting clients retry non-idempotent operations — duplicate
  charges, duplicate orders, duplicate side effects. Idempotency
  keys are the fix, not client discipline.
- Paginating with offset on a large, changing collection — clients
  see duplicates and skips, and deep pages scan the table. Use
  cursors.
- Caching without an invalidation story — stale data served
  indefinitely. Every cache entry needs a TTL and an invalidation
  path.
- Retrying without backoff or jitter — a recovering dependency gets
  hammered by synchronized retries and falls over again.
- No timeouts on outbound calls — one slow dependency eventually
  exhausts every worker and takes the API down with it.
- Designing webhooks as fire-and-forget — undelivered events are
  lost silently. Webhooks need signing, retries, and a replay
  mechanism.
- Treating authentication as authorization — a valid token that
  can fetch any resource id is a BOLA vulnerability.
- Documenting the API by hand and letting the docs drift from the
  implementation — generate the contract from code.

## Examples

A problem-details error response (RFC 9457) returned consistently
by every endpoint:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "The request body failed validation.",
  "requestId": "req_01J8X7Q2K9",
  "errors": [
    { "field": "totalMinor", "message": "must be a positive integer" }
  ]
}
```

An idempotent retry flow, in words rather than code, since the
mechanics belong to the framework skill:

1. The client generates a unique `Idempotency-Key` (a UUID) and
   sends it with the `POST /v1/orders` request.
2. The server hashes the key with the request body, stores the pair
   before executing the operation, executes once, and stores the
   response against the key.
3. A retry with the same key and body returns the stored response
   with the original status code; the operation does not run again.
4. A retry with the same key but a different body returns `422`
   Unprocessable Content, because the key is already bound to
   another request. A retry that arrives while the original request
   is still in progress returns `409` Conflict instead.
5. Keys expire after a documented window (for example 24 hours),
   after which the same key may be reused for a new request.

A cursor-paginated collection response:

```json
{
  "data": [
    { "id": "ord_01", "totalMinor": 1299, "currency": "USD" }
  ],
  "page": {
    "nextCursor": "eyJpZCI6Im9yZF8wMSJ9",
    "hasMore": true,
    "pageSize": 50
  }
}
```

## Validation Checklist

- [ ] The versioning strategy is documented and applied
      consistently; no released version has breaking changes.
- [ ] Every collection endpoint paginates with a server-side cap.
- [ ] Every error response follows RFC 9457 with a stable
      `type`-to-status mapping.
- [ ] Every retryable mutation accepts an `Idempotency-Key` and
      deduplicates server-side.
- [ ] Authentication and per-resource authorization are enforced on
      every endpoint; BOLA is tested explicitly.
- [ ] Rate limits, payload limits, and timeouts are set and
      communicated to clients.
- [ ] Every outbound call has a timeout, a retry policy with
      backoff and jitter, and a circuit breaker.
- [ ] Slow work runs in background jobs; webhooks are signed,
      retried, and replayable.
- [ ] Logs, metrics, and traces cover every endpoint with request
      ids.
- [ ] The OpenAPI document (or GraphQL schema) is generated from
      code and matches the deployed API.
- [ ] The API passes a review against the OWASP API Security Top 10.

## Expected Deliverables

- An API architecture decision record: style, versioning,
  pagination, error format, auth model, and rate-limit policy.
- A contract (OpenAPI document or GraphQL schema) generated from
  code, with a changelog.
- Idempotency, retry, timeout, and circuit-breaker policies for
  every mutating endpoint and downstream dependency.
- A webhook design (signing, retries, replay) where events are
  delivered to consumers.
- An observability plan: logs, metrics, and traces per endpoint.
- A security review against the OWASP API Security Top 10.

## References

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [GraphQL specification](https://spec.graphql.org/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
- [Idempotency-Key header draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- Related skills in this repository: `api-design`, `rest-api`,
  `graphql`, `rate-limiting`, `queues`, `background-jobs`,
  `caching`, `api-documentation`, `authentication`,
  `observability`, `nestjs`, `fastify`, `express`, `hono`, `trpc`.
