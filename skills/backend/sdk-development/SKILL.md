---
name: sdk-development
description: >
  Build client SDKs for an API in TypeScript: client design, authentication,
  retries, pagination helpers, error types, and documentation. Use when
  creating or maintaining an SDK for an API, wrapping a REST or GraphQL API
  for developers, or improving an existing SDK's ergonomics and reliability.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS and TypeScript 5.x; the target API must be documented.
---

# SDK Development

## Purpose

This skill covers building a client SDK that makes an API pleasant and
safe to use: a typed client, authentication handling, retries, pagination
helpers, typed errors, and documentation. The outcome is an SDK that
developers can install and use correctly on the first try, with mistakes
caught by the type checker instead of at runtime.

## When to Use

- Creating a new SDK for an existing API.
- Maintaining or improving an existing SDK's ergonomics, errors, or
  reliability.
- Wrapping a REST or GraphQL API for developers in a specific language.
- Adding retries, pagination helpers, or typed errors to a client
  library.
- Deciding whether to hand-write an SDK or generate it from OpenAPI.

## When Not to Use

- Publishing a general-purpose npm package that is not an API client —
  use `package-development`.
- Designing the API itself — use `api-design` first; an SDK cannot fix
  a bad API.
- Building a server-side API — use `rest-api`, `graphql`, or `trpc`.
- Generating a client from an OpenAPI document as a one-off — generate
  it and check it in; this skill governs a maintained SDK.

## Prerequisites

- A documented, stable API (OpenAPI document or equivalent) to build
  against.
- A decision on hand-written versus generated code: hand-written for
  ergonomics and small APIs, generated for large APIs that change
  often.
- Node.js 24 LTS and TypeScript 5.x for a TypeScript SDK.

## Official Documentation

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0) — the
  contract SDKs are built from.
- [Stripe API reference](https://docs.stripe.com/api) — an example of
  an API with well-designed SDKs.
- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  TypeScript 5.x reference.
- [Semantic Versioning](https://semver.org/) — versioning rules for
  SDK releases.

## Required Workflow

1. Read the API contract and list the resources and operations the SDK
   must cover. Decide the scope: full coverage or the most-used subset.
2. Design the client surface: one client class constructed with
   credentials and options, with resource namespaces (`client.orders.list()`).
3. Define the error model: one typed error class per failure category
   (authentication, validation, not found, rate limited, server error)
   with the API's error details attached.
4. Implement the HTTP layer: base URL, headers, authentication, timeouts,
   and retries for transient failures. Keep it in one module.
5. Implement resource methods as thin wrappers: validate input, call the
   HTTP layer, map the response to typed objects.
6. Add pagination helpers that hide cursor handling (async iterators or
   a `listAll` helper with a page limit).
7. Write tests against a mocked HTTP layer and, where possible, against
   a test instance of the real API.
8. Write documentation: installation, quick start, authentication, one
   example per resource, and the error model. Keep examples runnable.
9. Publish following `package-development`, with semantic versioning and
   a changelog.

## Implementation Standards

- The client is constructed once with credentials and options; every
  method uses that configuration. Never require credentials per call.
- Methods are typed end to end: input parameters, options, and return
  values all have TypeScript types generated from or matching the API
  contract.
- Errors are typed and informative: an `ApiError` base class carrying
  the HTTP status, the API error code, and the request ID, with
  subclasses (or a `code` discriminator) for common cases.
- Retries apply only to idempotent requests and transient failures
  (network errors, `429`, `5xx`), with exponential backoff and jitter
  and a bounded number of attempts. Never retry a `4xx` other than
  `429`.
- Respect `Retry-After` on `429` responses.
- Every request has a timeout; the default should be generous enough
  for normal operations (for example 30 seconds) and configurable.
- Pagination helpers return all pages lazily (async iterator) or
  accept an explicit page limit; never fetch an unbounded list into
  memory without the caller's consent.
- The SDK sends a `User-Agent` identifying the SDK name and version so
  API operators can see SDK usage.
- Authentication credentials are passed to the client constructor and
  never logged. Support API keys and OAuth tokens as the API requires.
- Breaking changes require a major version bump; adding a method or an
  optional parameter is a minor change.

## Best Practices

- Design for the common case: the simplest call should need the fewest
  arguments, with options objects for the rest.
- Make the SDK work with zero configuration beyond credentials: sane
  defaults for base URL, timeout, and retries.
- Return typed domain objects, not raw HTTP responses, but expose the
  raw response (status, headers) for callers that need it.
- Keep dependencies minimal: prefer the platform `fetch` over an HTTP
  client library so the SDK stays small and portable.
- Provide both callback-free `async`/`await` APIs and, where it helps,
  helpers for common multi-step flows (for example "create and wait
  for completion").
- Document every method with a short example in the code's doc comment
  so IDEs show it inline.
- Test error paths as thoroughly as success paths: wrong credentials,
  not found, rate limited, and server error.

## Security Considerations

- Never log credentials, tokens, or full request and response bodies.
- Store credentials only in memory; the SDK must not write them to
  disk or to a cache.
- Use HTTPS only; refuse to send credentials over plain HTTP.
- Validate inputs client-side (required fields, types) so mistakes
  fail fast, but never treat client-side validation as a substitute
  for server-side validation.
- Keep the SDK's dependencies minimal and current; audit them
  regularly.

## Performance Considerations

- Reuse HTTP connections with keep-alive; creating a new connection
  per request is wasteful.
- Support request timeouts and cancellation (`AbortSignal`) so a hung
  API call does not hang the caller.
- Avoid fetching more than the caller asked for: paginate lazily and
  let callers request specific fields where the API supports it.
- Keep the SDK bundle small: avoid heavy dependencies and ship ESM
  with tree-shaking in mind.

## Common Mistakes

- Returning raw HTTP responses — callers have to parse status codes
  and JSON themselves. Return typed objects and throw typed errors.
- Retrying non-idempotent requests — a retried payment or creation
  can duplicate the effect. Retry only idempotent operations.
- Swallowing the API's error details — a generic "request failed"
  message hides the cause. Attach the status, code, and request ID.
- Requiring credentials on every call — verbose and error-prone.
  Configure once at client construction.
- No timeout — a hung request hangs the caller forever. Always set a
  default timeout.
- Breaking the API surface in a minor release — follow semantic
  versioning strictly; developers trust the version number.

## Examples

A minimal typed client with typed errors and retries:

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public requestId: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
};

export class ExampleClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.example.com";
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async getOrder(orderId: string): Promise<{ id: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": "example-sdk/1.0.0",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new ApiError(
        response.status,
        "request_failed",
        response.headers.get("x-request-id"),
        `Request failed with status ${response.status}`,
      );
    }
    return response.json() as Promise<{ id: string; status: string }>;
  }
}
```

## Validation Checklist

- [ ] The client is constructed once with credentials and options.
- [ ] Every method is typed end to end and documented with an example.
- [ ] Errors are typed and carry status, code, and request ID.
- [ ] Retries apply only to idempotent requests and transient failures.
- [ ] Every request has a configurable timeout.
- [ ] Pagination helpers are lazy or bounded.
- [ ] Tests cover success, authentication failure, not found, rate
      limit, and server error.
- [ ] No credentials are logged or persisted.

## Expected Deliverables

- A typed SDK client with resource methods and typed errors.
- Tests against a mocked HTTP layer (and a live test API where
  available).
- Documentation: quick start, authentication, per-resource examples,
  and the error model.
- A published package following `package-development` with a
  changelog.

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [Stripe API reference](https://docs.stripe.com/api)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Semantic Versioning](https://semver.org/)
- Related skills in this repository: `package-development`,
  `api-design`, `rest-api`, `rate-limiting`.
