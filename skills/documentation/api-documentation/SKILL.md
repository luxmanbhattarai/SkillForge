---
name: api-documentation
description: >
  Write clear API documentation: endpoint references, request and
  response examples, authentication, error handling, and getting
  started guides. Use when documenting a REST or GraphQL API, adding
  docs for new endpoints, or fixing API docs that are incomplete or
  wrong. Covers OpenAPI, examples, versioning, and error catalogs.
license: MIT
metadata:
  version: "1.0.0"
  category: documentation
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# API Documentation

## Purpose

This skill helps an agent write API documentation that lets a
developer make their first successful call quickly and find every
detail when they need it. The outcome is docs with a working
getting-started path, a complete and accurate reference, and examples
that actually run — so developers do not have to guess or ask.

## When to Use

- Documenting a new REST or GraphQL API.
- Adding documentation for new endpoints or fields.
- Fixing API docs that are incomplete, outdated, or wrong.
- Writing an authentication or error-handling guide for an API.
- Setting up an OpenAPI specification for an API.

## When Not to Use

- When the task is general technical documentation (guides,
  concepts) — use `technical-documentation`.
- When the task is a README — use `readme-engineering`.
- When the task is a changelog — use `changelog-management`.
- When the task is designing the API itself (endpoints, schemas) —
  that is API design, not documentation.

## Prerequisites

- Access to the API itself (a running instance or a specification)
  so examples can be verified.
- Knowledge of the authentication method and how to obtain
  credentials for testing.
- The API's versioning scheme and base URL.
- A place for the docs to live (docs site, repository, or API
  portal).

## Official Documentation

- [OpenAPI Initiative](https://www.openapis.org/) — the OpenAPI
  specification for describing REST APIs. OpenAPI 3.2.1 is the
  current version (3.2.0, September 2025); 3.1.x and 3.0.x remain
  in wide use. Do not write new specs in Swagger 2.0 (OpenAPI
  2.0) — it is legacy. Check that your generator, linter, and
  docs renderer support OpenAPI 3.2 before adopting it; 3.1 is
  the safer choice where tooling lags.
- [Swagger Documentation](https://swagger.io/docs/) — tooling and
  guides for OpenAPI, including the editor and UI.
- [GraphQL — Best Practices](https://graphql.org/learn/best-practices/)
  — guidance on GraphQL API design and documentation.
- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
  — reference for status codes, methods, and headers.

## Required Workflow

1. Identify the audience: who calls the API, what they are building,
   and what their first task is.
2. Write the getting-started path first: how to get credentials, the
   base URL, and one complete working request with its response.
   Verify it by running it.
3. Document authentication: the method, how to obtain credentials,
   how to pass them, and how to handle expiry or refresh.
4. Document each endpoint: method, path, parameters (path, query,
   body), authentication required, request example, response
   example, and status codes.
5. Document the error model: the error response format, the error
   codes, and what the caller should do for each one.
6. Document limits: rate limits, pagination, payload size limits,
   and how the caller knows they have hit one.
7. If the API has an OpenAPI specification, keep it in sync with the
   docs: generate the reference from the spec, or update both in the
   same change.
8. Verify every example by running it against a real instance, and
   record the API version the docs describe.
9. Review with someone who has not used the API: they should be able
   to make a successful call following only the docs.

## Implementation Standards

- Every endpoint must show a complete, runnable request example and
  a complete response example, with real field names and realistic
  values.
- Every parameter must state its name, type, whether it is required,
  and what it does. Do not list a parameter without explaining it.
- Every status code the endpoint can return must be documented,
  including errors. An endpoint that can return 400, 401, 404, and
  429 must say so.
- Authentication must be documented before any endpoint: a developer
  who cannot authenticate cannot use the reference.
- Error responses must be documented with their exact shape
  (fields and example values) so callers can handle them
  programmatically.
- Use real values in examples, not invented ones: if the example
  shows a resource ID, it should look like a real ID from the
  system, and the example should be labeled as an example.
- State the API version the docs describe, and keep the docs in
  sync with the version. When the API changes, the docs change in
  the same release.
- When writing OpenAPI 3.1+ specs, use JSON Schema
  `type: ["string", "null"]` for nullable fields instead of the
  3.0-era `nullable: true` keyword.
- Do not document endpoints that do not exist, parameters that are
  not accepted, or behavior that is not implemented.

### Accessibility

- Docs are structured documents: one `h1`, headings in order, no
  skipped levels — readers navigate by headings.
- Diagrams and screenshots get alt text or a text description of what
  they show; code samples are real text, never screenshots of code.
- Link text describes its destination; tables use header cells.
- Plain language: define terms on first use, keep sentences short, put
  the outcome first.
- Examples work without color: do not mark required / optional or
  old / new by color alone.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Put the getting-started guide first and keep it short: a developer
  should make a successful call within minutes.
- Organize the reference by resource or task, not alphabetically.
- Show the most common use case first for each endpoint; edge cases
  come after.
- Include a complete end-to-end example (for example, create a
  resource, then read it, then update it) so developers see how
  calls fit together.
- Document idempotency, retries, and webhooks where they apply —
  these are the details developers ask about most.
- Keep a changelog for the API (see `changelog-management`) so
  developers can see what changed between versions.
- Test the docs with a new developer regularly; docs drift faster
  than code.

## Security Considerations

- Never include real API keys, tokens, or credentials in
  documentation. Use clearly fake values (for example,
  `sk_live_example`) and say they are examples.
- Do not show real user data in examples; use fictional data.
- Document how to store credentials safely (environment variables,
  secret managers) and never in source code.
- Document the scopes or permissions each endpoint requires, so
  callers request the minimum access they need.
- If the API has an authentication flow, document it exactly; do
  not invent a shortcut.

## Performance Considerations

- Document rate limits clearly, including the headers that report
  remaining quota, so callers can back off instead of hammering
  the API.
- Document pagination and recommend page sizes; a caller fetching
  one item at a time is a performance problem for both sides.
- Keep the docs site fast and searchable; developers leave slow
  docs.

## Common Mistakes

- A reference with no getting-started guide, so new developers do
  not know where to begin.
- Examples that were never run and contain wrong field names or
  outdated endpoints.
- Documenting only the happy path and omitting errors, rate limits,
  and pagination.
- Real credentials or real user data in examples.
- Docs that describe a different API version than the one deployed.
- An OpenAPI spec and handwritten docs that disagree with each
  other.
- Endpoints documented without stating whether they require
  authentication.

## Examples

An endpoint reference entry (shown as the markdown source a writer
would produce, with the code fences the entry itself contains):

````markdown
## Get a post

`GET /posts/{id}`

Returns a single post by ID.

**Authentication:** requires a bearer token with the `posts:read`
scope.

**Parameters:** `id` (path, string, required) — the post ID.

Example request:

```bash
curl https://api.example.com/posts/abc123 \
  -H "Authorization: Bearer $API_TOKEN"
```

Example response:

```json
{
  "id": "abc123",
  "title": "How to Fix Dense Sourdough Crumb",
  "published_at": "2026-11-20T09:00:00Z"
}
```

Status codes: `200` — the post was found. `401` — the token is
missing or invalid. `404` — no post exists with this ID.

An error response example:

```json
{
  "error": {
    "code": "not_found",
    "message": "No post exists with ID abc123."
  }
}
```
````

## Validation Checklist

- [ ] A getting-started guide exists and was verified by running
      the example request.
- [ ] Every endpoint has a request example, a response example, and
      documented status codes.
- [ ] Every parameter is documented with type, required status, and
      description.
- [ ] Authentication is documented before the reference.
- [ ] The error model and rate limits are documented.
- [ ] No real credentials or real user data appear in the docs.
- [ ] The API version the docs describe is stated.
- [ ] A reviewer who has not used the API made a successful call
      following only the docs.
- [ ] Accessibility: heading outline valid; diagrams have text descriptions; code is real text.

## Expected Deliverables

- A getting-started guide with a verified working example.
- An endpoint reference with request and response examples.
- An authentication guide and an error catalog.
- An OpenAPI specification, if the API uses one, in sync with the
  docs.
- Verification notes: which examples were run and their results.

## References

- [OpenAPI Initiative](https://www.openapis.org/) — the OpenAPI
  specification.
- [Swagger Documentation](https://swagger.io/docs/) — OpenAPI
  tooling and guides.
- [GraphQL — Best Practices](https://graphql.org/learn/best-practices/)
  — GraphQL guidance.
- [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
  — status codes, methods, and headers.
- Related skills in this repository: `technical-documentation`,
  `changelog-management`, `readme-engineering`,
  `developer-experience`.
