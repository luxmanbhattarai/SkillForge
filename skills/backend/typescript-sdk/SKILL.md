---
name: typescript-sdk
description: >
  Build and publish a TypeScript SDK for an API: package layout, dual
  CJS/ESM builds with tsdown or tsup, declaration files, publint and
  Are The Types Wrong checks, typed client design, authentication,
  retries, timeouts, pagination, error models, streaming, testing with
  Vitest, semantic versioning, npm publishing with provenance, and
  backward compatibility. Use when creating or maintaining a TypeScript
  client library for an API.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# TypeScript SDK

## Purpose

This skill covers the TypeScript-specific engineering of an API client
SDK: the package layout, dual CJS/ESM builds, declaration files, and
publish-time checks that make a package work for every consumer, plus
the client patterns (auth, retries, pagination, streaming) implemented
in idiomatic TypeScript. The outcome is an SDK that installs cleanly,
type-checks under every module-resolution mode, and behaves reliably
at runtime. It complements `sdk-development`, which covers
language-agnostic client design; this skill covers the TypeScript
tooling and packaging depth.

## When to Use

- Creating a new TypeScript SDK for an API.
- Adding dual CJS/ESM output, declaration files, or publish checks to
  an existing TypeScript package.
- Fixing a package that breaks consumers under `moduleResolution:
  node16` / `nodenext`, bundlers, or `require()`.
- Choosing a build tool (tsdown vs tsup) or setting up a release
  pipeline for a TypeScript SDK.
- Adding streaming, pagination helpers, or typed errors to a
  TypeScript client.

## When Not to Use

- Designing the API itself — use `api-design` first.
- Building a Python SDK — use `python-sdk`.
- Generating a client from an OpenAPI document instead of hand-writing
  one — use `api-client-generation`.
- Publishing a general-purpose npm package that is not an API client
  — use `package-development`.
- Language-agnostic SDK design decisions — use `sdk-development`.

## Prerequisites

- A documented, stable API (an OpenAPI document or equivalent) to
  build against.
- Node.js 26 LTS (Active LTS since 28 October 2026, supported until
  30 April 2029) for development and CI. Node.js 24 is Maintenance
  LTS until 30 April 2028; Node.js 22 is Maintenance LTS until
  30 April 2027; Node.js 20 reached end of life on 30 April 2026.
- TypeScript 7.0.x (7.0.2 is the current stable release; 7.0 went
  stable on 8 July 2026 as a native Go port of the compiler).
  TypeScript 7.0 ships no stable programmatic compiler API — tools
  that need the compiler API (for example typescript-eslint) still
  need TypeScript 6, available side by side as
  `@typescript/typescript6`, until TypeScript 7.1 ships the new API.
- An npm account with two-factor authentication enabled for
  publishing, and a decision on the SDK's public surface (resources,
  methods, error model) following `sdk-development`.

## Official Documentation

- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  TypeScript 7.x reference and handbook.
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases) —
  which Node.js lines are Active LTS, Maintenance LTS, or end of life.
- [tsdown documentation](https://tsdown.dev) — the actively
  maintained TypeScript library bundler (Rolldown-based), and the
  recommended build tool for new SDKs.
- [Migrate from tsup](https://tsdown.dev/guide/migrate-from-tsup) —
  the staged migration path: migrate on tsdown v0.22.14 first, resolve
  every deprecation warning, then upgrade to v0.23 or later.
- [tsup repository](https://github.com/egoist/tsup) — tsup 9.0.0 is
  the latest release (14 October 2026), but the project README
  states it is no longer actively maintained and points to tsdown.
  Keep tsup only for existing builds that already work.
- [publint](https://publint.dev) — lints whether a package is
  published correctly (exports map, files, metadata).
- [Are The Types Wrong?](https://arethetypeswrong.github.io) —
  checks how TypeScript consumers resolve a package's types under
  each module-resolution mode.
- [Semantic Versioning](https://semver.org/) — versioning rules for
  SDK releases.
- [npm documentation](https://docs.npmjs.com/) — publishing,
  provenance statements, and access tokens.

## Required Workflow

1. Confirm the API contract and the SDK scope with
   `sdk-development`: which resources and operations to cover.
2. Scaffold the package: `src/` layout, `package.json` with an
   `exports` map, `tsconfig.json` with `strict` enabled, and a build
   tool. For a new SDK use tsdown; for an existing tsup build, keep
   tsup or migrate following the staged guide above.
3. Configure dual CJS/ESM output with declaration files, and set the
   `types` condition first in every export entry.
4. Implement the client following `sdk-development`: one client class
   constructed with credentials and options, resource namespaces,
   typed errors, retries, timeouts, and pagination helpers.
5. Add tests with Vitest: unit tests against a mocked `fetch`, plus
   contract tests against a test instance of the real API where
   available.
6. Wire the publish gates into CI: build, type check (`tsc --noEmit`
   is still required — bundlers transpile but do not type check),
   `npm pack`, `npx publint`, and
   `npx @arethetypeswrong/cli --pack`. All four must pass before a
   release.
7. Smoke-test the packed tarball from a fresh consumer project in
   both ESM (`import`) and CJS (`require`) before publishing.
8. Publish with `npm publish --provenance` from CI, with semantic
   versioning and a changelog entry per `changelog-management`.

## Implementation Standards

- Packaging — `package.json` contract, ESM/CJS build,
  `isolatedDeclarations`, `tsc --noEmit` in CI: see
  [references/packaging.md](./references/packaging.md).
- Every public method is typed end to end: parameters, options, and
  return values. Use generics for paginated responses
  (`Page<T>`) and discriminated unions for response variants.
  Avoid `any` in the public surface; use `unknown` and narrow it.
- The client is constructed once with credentials and options; every
  method uses that configuration. Never require credentials per call.
- Errors are typed: an `ApiError` base class carrying HTTP status,
  API error code, and request ID, with subclasses or a `code`
  discriminator for common cases. Never throw raw `Response`
  objects or plain strings.
- Retries apply only to idempotent requests and transient failures
  (network errors, `429`, `5xx`), with exponential backoff and
  jitter and a bounded number of attempts. Respect `Retry-After`
  on `429`. Never retry a `4xx` other than `429`.
- Every request has a configurable timeout (default 30 seconds is a
  good starting point), implemented with `AbortSignal.timeout()`,
  and accepts a caller-provided `AbortSignal` for cancellation.
- Pagination helpers are lazy (async iterators) or accept an
  explicit page limit; never fetch an unbounded list into memory
  without the caller's consent.
- Streaming uses the platform `ReadableStream` from
  `response.body`, exposed as an async iterator of parsed chunks;
  never buffer a whole stream into memory to return it.
- The SDK sends a `User-Agent` identifying the SDK name and version.
- Keep runtime dependencies to zero where possible. Use the
  platform `fetch` (Undici in Node.js) instead of an HTTP client
  library. Every runtime dependency is a supply-chain and
  bundle-size cost the consumer pays.
- Breaking changes require a major version bump; adding a method or
  an optional parameter is a minor change. Deprecate with
  `@deprecated` JSDoc and a removal version before removing anything.

### Testing Strategy

- Test the published package, not just the source: install the
  packed tarball in a scratch project and import it from both
  ESM and CJS, so a broken `exports` map or missing declaration
  file is caught before release.
- Test types with `tsc --noEmit` in CI and with type-level
  assertions where the public surface is generic: a green
  bundler build proves nothing about types.
- Test HTTP behavior with mocked fetch (Vitest plus a fetch
  mock): success, each typed error, Retry-After handling on
  429, and no retry on other 4xx responses.
- Test cancellation and timeouts: a caller-provided
  `AbortSignal` aborts the request, and the default 30-second
  timeout fires instead of hanging forever.
- Test pagination and streaming lazily: a paginated helper
  fetches pages only as the async iterator is consumed, and a
  streaming call yields parsed chunks without buffering the
  whole response into memory.

## Best Practices

- Design for the common case: the simplest call needs the fewest
  arguments, with an options object for the rest.
- Make the SDK work with zero configuration beyond credentials:
  sane defaults for base URL, timeout, and retries.
- Return typed domain objects, not raw HTTP responses, but expose
  the raw response (status, headers) for callers that need it, for
  example via a `response` property on the result or an
  `asResponse()` style accessor.
- Document every public method with a JSDoc comment and a short
  example so IDEs show it inline.
- Keep the package small: set `"sideEffects": false` when true so
  bundlers can tree-shake, and check the packed size with
  `npm pack --dry-run` before release.
- Test error paths as thoroughly as success paths: wrong
  credentials, not found, rate limited, and server error.
- Version the SDK independently of the API, and record which API
  version each SDK release targets in the README and changelog.

## Security Considerations

- Never log credentials, tokens, or full request and response
  bodies. Redact `Authorization` headers in any debug output.
- Store credentials only in memory; the SDK must not write them to
  disk, to a cache, or to `localStorage`.
- Use HTTPS only; refuse to send credentials over plain HTTP.
  Validate the base URL at construction and reject `http://`
  unless the caller explicitly opts into an insecure local
  endpoint for development.
- Validate inputs client-side (required fields, types) so mistakes
  fail fast, but never treat client-side validation as a substitute
  for server-side validation.
- Publish from CI with `npm publish --provenance` and granular
  access tokens (or OIDC trusted publishing where supported) so a
  leaked long-lived token cannot publish arbitrary versions.
- Audit dependencies regularly (`npm audit`) and keep the runtime
  dependency list minimal; each dependency is attack surface.
- Treat API error bodies as untrusted data: parse defensively and
  never interpolate raw error text into HTML or shell commands in
  examples or CLI wrappers.

## Performance Considerations

- Reuse HTTP connections: the platform `fetch` keeps connections
  alive by default in Node.js; do not create a new client per
  request, and share one client instance across the application.
- Support cancellation (`AbortSignal`) so a hung API call does not
  hang the caller, and always set a timeout.
- Stream large responses instead of buffering them; for file
  downloads expose the raw stream alongside a convenience method.
- Paginate lazily and let callers request specific fields where the
  API supports it, so the SDK never fetches more than asked for.
- Keep the install small: zero runtime dependencies and a small
  `dist` keep `npm install` fast and reduce cold-start time for
  serverless consumers. Measure with `npm pack --dry-run`.
- Avoid synchronous work in the request path (for example
  synchronous file reads for config); load configuration once at
  client construction.

## Common Mistakes

- Shipping only ESM or only CJS — consumers on the other module
  system cannot use the SDK. Ship both, with the `types` condition
  first, and verify with publint and Are The Types Wrong.
- Putting `types` after `default` in the exports map — TypeScript
  resolves the first matching condition and misses the types.
- Relying on the bundler to type check — esbuild and Rolldown
  transpile without checking. Run `tsc --noEmit` in CI.
- Forgetting `files` in `package.json` — the published tarball then
  includes test fixtures, source maps, or config, or omits `dist/`.
- Retrying non-idempotent requests — a retried payment or creation
  can duplicate the effect. Retry only idempotent operations.
- Swallowing the API's error details — a generic "request failed"
  hides the cause. Attach status, code, and request ID.
- No timeout — a hung request hangs the caller forever. Always set
  a default timeout.
- Breaking the API surface in a minor release — follow semantic
  versioning strictly; developers trust the version number.
- Migrating tsup to tsdown by renaming the config — tsdown's
  defaults differ (ESM-first, different output filenames) and
  newer versions remove deprecated tsup-compatible options. Follow
  the staged migration guide and compare the packed output.

## Examples

A dual-format `package.json` and a tsdown config: see
  [examples/package-config.md](./examples/package-config.md).

A lazy async-iterator paginator:

  [examples/lazy-paginator.ts](./examples/lazy-paginator.ts).

Publish gates in CI (run after the build):

```bash
npm pack --dry-run   # confirm exactly what ships
npx publint          # exports map, files, metadata
npx @arethetypeswrong/cli --pack   # consumer type resolution
```

## Validation Checklist

- [ ] `npm pack --dry-run` shows only `dist/`, `README.md`, and
      `LICENSE` (plus any intended extras).
- [ ] `npx publint` passes with no errors.
- [ ] `npx @arethetypeswrong/cli --pack` reports no resolution
      problems under any module-resolution mode.
- [ ] The packed tarball imports cleanly from a fresh ESM project
      (`import`) and a fresh CJS project (`require`).
- [ ] `tsc --noEmit` passes in CI.
- [ ] The client is constructed once with credentials and options;
      every method is typed end to end.
- [ ] Errors are typed and carry status, code, and request ID.
- [ ] Retries apply only to idempotent requests and transient
      failures; every request has a configurable timeout.
- [ ] Pagination helpers are lazy or bounded; streaming never
      buffers a whole response.
- [ ] Tests cover success, authentication failure, not found, rate
      limit, and server error.
- [ ] No credentials are logged or persisted; credentials are sent
      over HTTPS only.

## Expected Deliverables

- A typed TypeScript SDK with dual CJS/ESM output, declaration
  files, and a correct `exports` map.
- Tests against a mocked `fetch` layer (and a live test API where
  available), including error paths.
- CI with build, type check, publint, and Are The Types Wrong
  gates, plus a packed-tarball smoke test.
- Documentation: quick start, authentication, per-resource
  examples, the error model, and the supported Node.js and
  TypeScript versions.
- A published npm package with provenance, semantic versioning,
  and a changelog.

## References

- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [tsdown documentation](https://tsdown.dev)
- [Migrate from tsup](https://tsdown.dev/guide/migrate-from-tsup)
- [tsup repository](https://github.com/egoist/tsup)
- [publint](https://publint.dev)
- [Are The Types Wrong?](https://arethetypeswrong.github.io)
- [Semantic Versioning](https://semver.org/)
- [npm documentation](https://docs.npmjs.com/)
- Related skills in this repository: `sdk-development`,
  `api-design`, `rest-api`, `package-development`,
  `changelog-management`, `typescript`, `nodejs`, `vitest`,
  `unit-testing`, `rate-limiting`, `api-client-generation`.
