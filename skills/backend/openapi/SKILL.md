---
name: openapi
description: >
  Write and maintain OpenAPI 3.x documents: operations, schemas and
  components, parameters, responses, security schemes, examples,
  versioning, linting with Spectral or Redocly, bundling multi-file
  specs, documentation generation, mocking with Prism, and contract
  testing with Schemathesis and oasdiff. Use when authoring,
  validating, or governing an OpenAPI specification for an HTTP API.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# OpenAPI

## Purpose

This skill covers authoring, validating, and governing OpenAPI
documents: the contract that describes an HTTP API's operations,
schemas, security, and examples in a machine-readable form. The
outcome is a spec that is valid, lint-clean, documented, and
executable — driving docs, mocks, generated clients, and contract
tests from a single source of truth.

## When to Use

- Writing a new OpenAPI document for an HTTP API.
- Adding operations, schemas, security schemes, or examples to an
  existing spec.
- Validating or linting a spec in CI (Spectral, Redocly).
- Splitting a spec into files and bundling it, or detecting breaking
  changes between spec versions.
- Generating API docs, a mock server, or contract tests from a spec.
- Governing API consistency across a team with a shared ruleset.

## When Not to Use

- Designing the API's resources, naming, and behavior — use
  `api-design` first; this skill covers describing the design, not
  choosing it.
- Implementing the server — use `rest-api` or the framework skill.
- Generating a client from the spec — use `api-client-generation`.
- Writing prose documentation around the API — use
  `api-documentation`.
- Describing an event-driven or message API — OpenAPI is for HTTP
  APIs; AsyncAPI covers message-based APIs.

## Prerequisites

- The API design decisions from `api-design`: resources, operations,
  authentication, error model, and versioning strategy.
- Familiarity with JSON Schema: OpenAPI 3.1 aligns its Schema
  Object with JSON Schema 2020-12, so `type` arrays, `prefixItems`,
  and standard JSON Schema keywords apply.
- Node.js 22 or newer for the linting and bundling tools
  (Spectral, Redocly CLI 2.x requires Node.js 22.12 or newer);
  Python 3.11 or newer for Schemathesis.
- A decision on the OpenAPI version: 3.1 for the broadest tool
  support, 3.2 only when every linter, generator, and docs tool in
  the chain supports it.

## Official Documentation

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) —
  the normative spec. OpenAPI 3.2.1 is the latest published
  version (10 September 2026, an editorial patch of 3.2.0);
  3.1.2 is the latest 3.1 patch and has the broadest tool support.
  Version 3.2 adds the QUERY method, streaming descriptions,
  hierarchical tags, and the OAuth 2.0 device authorization flow.
- [Spectral](https://github.com/stoplightio/spectral) — the
  OpenAPI linter from Stoplight. The `@stoplight/spectral-cli`
  package is at 6.17.1 (6 November 2026) and lints OpenAPI 2, 3.0,
  3.1, and 3.2. Documentation:
  [Spectral docs](https://meta.stoplight.io/docs/spectral/docs/getting-started/1-concepts.md).
- [Redocly CLI](https://redocly.com/docs/cli) — linting, bundling,
  and docs generation. Redocly CLI 2.x is current, ESM-only, and
  requires Node.js 22.12 or newer.
- [Prism](https://github.com/stoplightio/prism) — mock server and
  validating proxy from an OpenAPI document (`@stoplight/prism-cli`
  5.x).
- [Schemathesis](https://schemathesis.readthedocs.io) —
  property-based contract testing: generates requests from the
  spec and checks the implementation against it.
- [oasdiff](https://github.com/oasdiff/oasdiff) — detects breaking
  changes between two OpenAPI documents.

## Required Workflow

1. Confirm the API design with `api-design`, then choose the
   OpenAPI version (3.1 by default; 3.2 only with full toolchain
   support) and the file layout (single file for small APIs,
   split by resource with `$ref` for large ones).
2. Write the document: `openapi`, `info` (title, version,
   description, contact, license), `servers`, `paths` with one
   operation per endpoint, `components` for reusable schemas,
   parameters, responses, and security schemes.
3. Give every operation an `operationId`, a `summary`, and a
   `description`; every operation declares its parameters, request
   body, and all responses it can return, including errors.
4. Add `examples` (or named `components/examples`) for requests
   and responses, using obviously fake values — examples become
   mock data and documentation.
5. Validate the document against the OpenAPI schema and lint it
   with Spectral (`spectral:oas` recommended ruleset, plus your
   own rules) or Redocly CLI (`recommended` ruleset). Fix all
   errors before proceeding.
6. Bundle multi-file specs into one resolved document
   (`redocly bundle`) for consumers that need a single file:
   generators, mocks, and contract tests.
7. Run a mock server (Prism) from the bundled spec and exercise
   the documented operations; fix anything the mock cannot serve.
8. Contract-test the real implementation against the spec
   (Schemathesis, or response validation in the test environment)
   and fix drift on whichever side is wrong.
9. Check breaking changes against the previous published spec
   with `oasdiff breaking` before release, and bump the API
   version accordingly.
10. Publish documentation generated from the spec (Redoc, Scalar,
    or Stoplight Elements) and keep it regenerating on every spec
    change.

## Implementation Standards

- The `openapi` field names the exact minor version in use
  (`3.1.0`, `3.2.0`); tools key behavior off the minor version,
  and the patch number carries no feature meaning.
- `info.version` is the API's version, not the spec format
  version. It follows semantic versioning and changes on every
  release; the spec format version and the API version are
  independent.
- Every operation has a unique, stable `operationId` in
  camelCase (for example `listOrders`). Generated clients use it
  for method names, so renaming one is a breaking change for
  generated-code consumers.
- Paths use kebab-case resource names, plural nouns, and no verbs
  (`/orders/{orderId}`); path parameters are declared in
  `parameters` with `required: true`.
- Reuse through `components`: schemas, parameters, responses,
  request bodies, examples, and security schemes live in
  `components` and are referenced with `$ref`. Inline schemas are
  acceptable only for one-off shapes that will never be reused.
- Every schema declares `type` (and `format` where it adds
  meaning: `date-time`, `uuid`, `int64`). Use `required` for
  mandatory properties, `enum` for closed value sets, and
  `additionalProperties: false` on objects with a fixed shape
  when the API guarantees no extra fields.
- In OpenAPI 3.1, a nullable field is `type: ["string", "null"]`
  (JSON Schema style). The 3.0 `nullable: true` keyword does not
  exist in 3.1; do not mix the two styles.
- Every operation documents its error responses with the same
  schema as success responses: at minimum the errors the API can
  return (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`
  as applicable), each with a schema and an example.
- Security is declared, not implied: `components/securitySchemes`
  defines the schemes (API key, HTTP bearer, OAuth2 flows,
  OpenID Connect), and each operation declares its
  `security` requirement, or a top-level `security` applies to
  all operations. Operations that need no auth say so explicitly
  with `security: []`.
- Use `tags` to group operations by resource; tags drive the
  grouping of generated docs and per-tag client generation.
- Versioning: prefer a versioned path prefix (`/v1/orders`) for
  public APIs, declared in `servers`, and never change the
  meaning of an existing field in a minor version. Additive
  changes (new optional fields, new operations) are minor;
  removals, renames, type changes, and new required fields are
  breaking.
- Split large specs by resource (`paths/orders.yaml`,
  `components/schemas/Order.yaml`) and reference with relative
  `$ref`s; always bundle before publishing or generating.
- Keep the spec free of secrets: no real tokens, keys, or internal
  hostnames in `servers`, examples, or descriptions.

## Best Practices

- Design first, then write: the spec is the contract review
  artifact. Review the spec in the pull request before any server
  code exists.
- Write descriptions for humans: every operation, schema, and
  property gets a `description` that explains meaning, constraints,
  and edge cases. Generated docs are only as good as these.
- Use named examples for the important flows; a named example is
  deterministic mock data and a documentation snippet at once.
- Keep the spec DRY with `components`, but do not over-abstract:
  a shared schema that forces two different concepts into one
  shape is worse than duplication.
- Lint in CI on every pull request and fail on errors; treat
  warnings as errors once the ruleset is stable.
- Publish the bundled spec at a stable URL (for example
  `https://api.example.com/openapi.yaml`) so consumers, generators,
  and partners always fetch the current contract.
- Record API decisions that the spec cannot express (rate limits,
  pagination defaults, idempotency keys) in the operation
  descriptions or in `x-` extensions, and keep them consistent
  with `api-design`.

## Security Considerations

- Declare authentication and authorization precisely: every
  operation's `security` requirement and OAuth2 scopes must match
  what the server enforces. A spec that omits auth misleads
  consumers into calling protected endpoints unauthenticated.
- Use the Spectral OWASP ruleset
  (`@stoplight/spectral-owasp-ruleset`) or equivalent checks to
  catch missing auth, missing rate-limit headers, and unsafe
  patterns in the contract.
- Never include real credentials, tokens, or personally
  identifiable data in examples, descriptions, or server URLs.
  Examples ship into docs, mocks, and generated clients.
- Do not document internal or admin-only endpoints in a public
  spec. Maintain a separate internal spec, or strip internal
  paths when publishing.
- Specify `400`/`401`/`403` responses explicitly so consumers
  handle auth failures; an undocumented `401` is a support ticket
  waiting to happen.
- Mark sensitive fields in descriptions (for example "treat as
  secret, never log") so SDK authors and consumers handle them
  correctly.
- Validate the spec itself as untrusted input when it comes from a
  third party: a malicious spec can inject code through generators
  (see `api-client-generation`).

## Performance Considerations

- Keep the bundled spec reasonably sized: split authoring files,
  but publish one bundled file; consumers fetch it once and cache
  it. Avoid duplicating large schemas inline when a `$ref`
  suffices.
- Document pagination, filtering, and field selection on list
  operations so consumers fetch only what they need; a list
  endpoint without pagination in the spec invites unbounded
  responses.
- Document rate limits (`429` response, `Retry-After`, and any
  `RateLimit-*` headers) so clients back off instead of hammering
  the API.
- Document response caching (`Cache-Control`, `ETag`) on
  cacheable GET operations so consumers can avoid repeat calls.
- Keep examples small: a 200-line example response bloats the
  spec and the generated docs without teaching more than a
  focused one.
- Lint and bundle in CI are fast (seconds); contract tests
  against a running API are the slow step — run them on a
  schedule or on spec changes, not on every commit, if the suite
  is large.

## Common Mistakes

- Missing `operationId` — generated clients fall back to
  path-derived names that change when the path changes.
- No error responses — consumers discover `401` and `429` in
  production. Document every status the API can return.
- Inline schemas everywhere — the same shape defined five times
  drifts. Put shared shapes in `components/schemas`.
- Mixing 3.0 and 3.1 idioms — `nullable: true` in a 3.1 document
  is ignored; `type: ["string", "null"]` in a 3.0 document is
  invalid. Match the style to the declared version.
- Using 3.2 features before the toolchain supports them — the
  spec validates but generators, linters, or docs renderers
  ignore or reject the new keywords. Check the whole chain first.
- Real data in examples — secrets and personal data leak into
  docs, mocks, and generated code. Use obviously fake values.
- Forgetting `servers` — consumers guess the base URL, and
  generated clients point at the wrong host.
- Versioning by editing in place — changing a field's meaning
  without a version bump breaks consumers silently. Use
  `oasdiff` to catch breaking changes.
- A spec that no test enforces — the implementation drifts and
  the spec becomes fiction. Contract-test the server against it.

## Examples

A minimal valid OpenAPI 3.1 document:

```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.0.0
  description: Create and list customer orders.
servers:
  - url: https://api.example.com/v1
paths:
  /orders:
    get:
      operationId: listOrders
      summary: List orders
      tags: [orders]
      security:
        - bearerAuth: []
      parameters:
        - $ref: "#/components/parameters/CursorParam"
      responses:
        "200":
          description: A page of orders.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderPage"
              examples:
                oneOrder:
                  value:
                    data:
                      - id: ord_01
                        status: paid
                    next_cursor: null
        "401":
          $ref: "#/components/responses/Unauthorized"
components:
  parameters:
    CursorParam:
      name: cursor
      in: query
      schema:
        type: [string, "null"]
  schemas:
    OrderPage:
      type: object
      required: [data]
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Order"
        next_cursor:
          type: [string, "null"]
    Order:
      type: object
      required: [id, status]
      properties:
        id:
          type: string
        status:
          type: string
          enum: [paid, pending, cancelled]
    Error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
  responses:
    Unauthorized:
      description: Missing or invalid credentials.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

A Spectral ruleset extending the recommended OpenAPI rules:

```yaml
# .spectral.yaml
extends: [[spectral:oas, recommended]]
rules:
  operationId-camelcase:
    message: operationId must be camelCase
    given: $.paths[*][*].operationId
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^[a-z][a-zA-Z0-9]*$"
```

Lint, bundle, mock, and contract-test:

```bash
npx @stoplight/spectral-cli lint openapi.yaml
npx @redocly/cli bundle openapi.yaml -o dist/openapi.yaml
npx @stoplight/prism-cli mock dist/openapi.yaml --port 4010
schemathesis run dist/openapi.yaml --url http://localhost:8000
oasdiff breaking old-openapi.yaml dist/openapi.yaml
```

## Validation Checklist

- [ ] The document validates against the OpenAPI schema for its
      declared version.
- [ ] Spectral or Redocly lint passes with no errors.
- [ ] Every operation has a unique `operationId`, a summary, and
      all responses it can return, including errors.
- [ ] Shared schemas, parameters, and responses live in
      `components` and are referenced with `$ref`.
- [ ] Security schemes are declared and every operation states its
      security requirement (or explicitly none).
- [ ] Examples use obviously fake values; no secrets appear
      anywhere in the document.
- [ ] The bundled spec serves correctly from Prism and every
      documented operation returns schema-conformant responses.
- [ ] Contract tests pass against the real implementation.
- [ ] `oasdiff breaking` reports no unexpected breaking changes
      against the previous published spec.
- [ ] Generated documentation renders from the spec and is
      published at a stable URL.

## Expected Deliverables

- A valid, lint-clean OpenAPI document (source files plus the
  bundled output) with operations, components, security schemes,
  and examples.
- A lint ruleset (`.spectral.yaml` or `redocly.yaml`) and a CI
  job that lints, bundles, and checks breaking changes.
- A mock server configuration (Prism) and contract tests
  (Schemathesis) wired into CI.
- Documentation generated from the spec, published at a stable
  URL.
- A versioning note: the API version, what changed, and whether
  the change is breaking.

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html)
- [Spectral](https://github.com/stoplightio/spectral)
- [Spectral docs](https://meta.stoplight.io/docs/spectral/docs/getting-started/1-concepts.md)
- [Redocly CLI](https://redocly.com/docs/cli)
- [Prism](https://github.com/stoplightio/prism)
- [Schemathesis](https://schemathesis.readthedocs.io)
- [oasdiff](https://github.com/oasdiff/oasdiff)
- Related skills in this repository: `api-design`, `rest-api`,
  `api-documentation`, `api-client-generation`, `sdk-development`,
  `typescript-sdk`, `python-sdk`, `rate-limiting`.
