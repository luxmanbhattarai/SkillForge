---
name: api-client-generation
description: >
  Generate API clients from an OpenAPI contract with OpenAPI Generator,
  orval, hey-api, or openapi-typescript: generator selection, pinned
  versions, configuration, generated-code hygiene (never hand-edit),
  versioning, CI drift checks, and testing generated clients. Use when
  creating or maintaining a client generated from an OpenAPI document,
  automating client regeneration in CI, or choosing between code
  generators.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# API Client Generation

## Purpose

This skill covers generating API clients from a machine-readable
contract (an OpenAPI document) instead of hand-writing them: choosing
a generator, configuring it, keeping generated code clean, and
wiring regeneration into CI so the client can never drift from the
contract. The outcome is a typed client that stays in sync with the
API by construction, regenerated on every contract change.

## When to Use

- Creating a client for an API that already has an OpenAPI document.
- Choosing between generators (OpenAPI Generator, orval, hey-api,
  openapi-typescript) for a new project.
- Automating regeneration in CI so a spec change produces a matching
  client change.
- Adding mocks, validation schemas, or framework hooks (React Query,
  SWR, Angular) generated from the same contract.
- Fixing a generated client that has drifted from the spec or that
  someone has hand-edited.

## When Not to Use

- Writing the OpenAPI document itself — use `openapi`.
- Hand-writing a curated SDK with ergonomic helpers and multi-step
  flows — use `sdk-development`, `typescript-sdk`, or `python-sdk`.
  Generation wins on coverage and freshness; hand-writing wins on
  ergonomics for small APIs.
- Designing the API — use `api-design` first; generation cannot fix
  a bad contract.
- A one-off throwaway client — generate it, use it, and do not build
  a pipeline around it.

## Prerequisites

- A valid OpenAPI 3.x document (see `openapi`), linted and bundled
  into a single resolved file before generation. Multi-file specs
  must be resolved first; most generators read one document.
- The generator's runtime: OpenAPI Generator needs Java 11 or newer
  (or the npm wrapper, which downloads the JAR); the TypeScript
  generators need Node.js 22.13 or newer.
- A decision on where generated code lives and whether it is
  committed to the repository (recommended for libraries and
  applications that ship it) or generated at build time.
- The target language and framework, because generator choice
  depends on it: OpenAPI Generator covers many languages, orval and
  hey-api are TypeScript-only.

## Official Documentation

- [OpenAPI Generator](https://openapi-generator.tech) — the
  multi-language generator. Version 7.27.0 is the latest stable
  release (2 November 2026); the CLI is distributed as a JAR on
  Maven Central and as the `@openapitools/openapi-generator-cli`
  npm wrapper.
- [OpenAPI Generator repository](https://github.com/OpenAPITools/openapi-generator) —
  generator list, configuration options, and release notes.
- [Orval](https://orval.dev) — TypeScript generator with fetch,
  axios, React Query, SWR, Angular, Vue, Svelte, MSW, and Zod
  outputs. Version 8.48.0 is current (14 November 2026). Use
  8.30.0 or later: earlier versions are affected by the September
  2026 code-injection CVEs (see Security Considerations).
- [Hey API](https://heyapi.dev/docs/openapi/typescript/get-started) —
  `@hey-api/openapi-ts`, a plugin-based TypeScript generator.
  Version 0.99.x is current; it is ESM-only, requires Node.js
  22.13 or newer, and is pre-1.0, so pin an exact version.
- [openapi-typescript](https://openapi-ts.pages.dev) — generates
  TypeScript types only (no runtime client); pair it with the
  `openapi-fetch` runtime client. Version 7.13.x is current.
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) —
  the contract format. OpenAPI 3.2.1 is the latest published
  version (10 September 2026); 3.1 has the broadest generator
  support.

## Required Workflow

1. Confirm the contract is valid and linted (see `openapi`), and
   bundle multi-file specs into one resolved document.
2. Choose a generator from the selection table in Implementation
   Standards, based on language, framework, and output needs.
3. Pin the generator's exact version in the lockfile (and in CI).
   Never float a generator version: patch releases change output
   formatting and break drift checks.
4. Write the generator configuration in the repository (a config
   file, not bare CLI flags), pointing at the bundled spec and a
   dedicated generated-output directory.
5. Generate into that directory and verify the output compiles and
   type-checks. Fix problems in the spec or the config, never by
   editing generated files.
6. Add a CI drift check: regenerate and fail the build if the
   output differs from what is committed (or, for orval, use
   `orval --outdated` to detect stale output without writing).
7. Add tests for the generated client: type-level smoke tests, a
   mock-server test run (for example against Prism), and, where
   available, contract tests against a test instance of the API.
8. Version the client with the contract: a breaking spec change
   (detected with `oasdiff`) means a major client version bump.
9. Regenerate on every spec change, in the same pull request as the
   spec change, so the diff shows the client impact of the contract
   change.

## Implementation Standards

- Generator selection:

  | Need | Generator |
  | --- | --- |
  | Many languages from one spec, or server stubs | OpenAPI Generator 7.x |
  | TypeScript with React Query / SWR / Angular / MSW / Zod | orval 8.x |
  | TypeScript with a plugin-based, tree-shakeable SDK | hey-api `@hey-api/openapi-ts` 0.99.x |
  | TypeScript types only, with a tiny runtime client | openapi-typescript 7.x + openapi-fetch |

- Pin the generator version exactly (no `^` or `~` ranges) in
  `package.json` / the lockfile, and record the version in the
  generated output's header comment where the generator supports
  it. Upgrades are deliberate, reviewed changes.
- Generated code lives in one dedicated directory (for example
  `src/generated/`), clearly marked as generated, and is never
  hand-edited. Custom behavior goes in a hand-written wrapper
  module that imports the generated code.
- Mark generated files as generated for tooling: add them to
  `.gitattributes` with `linguist-generated=true`, exclude them
  from linting and coverage, and do not review them line by line
  in pull requests — review the spec diff and the config instead.
- Generate from a pinned spec: a committed file, or a versioned
  URL with an exact version. Never generate from a floating
  "latest" URL in CI; a spec change then changes the client
  without a reviewable diff.
- Keep the generator configuration in the repository next to the
  spec, and generate with one command (`npm run generate` or
  equivalent) that any developer and CI can run identically.
- Treat the spec as the single source of truth: type names,
  operation IDs, and descriptions in generated code come from the
  spec. Improve naming in the spec (`operationId`, schema names),
  not with post-processing.
- When the API versions, version the generated client with it.
  Run a breaking-change check (`oasdiff breaking`) between the old
  and new spec before regenerating, and surface breaking changes
  in the pull request.
- If a generator cannot express something the API needs (custom
  auth flows, streaming, multipart edge cases), wrap the generated
  client in a hand-written layer rather than patching generated
  output or forking the generator's templates. Template forks are
  a maintenance liability; use them only as a last resort and
  document the fork.

## Best Practices

- Commit generated code for libraries and applications that ship
  it, so consumers and reviewers see exactly what runs. Generate
  at build time only when the output is large and purely internal.
- Regenerate in the same pull request as the spec change. A spec
  change without a regenerated client is an incomplete change.
- Keep generated output deterministic: same generator version,
  same config, same spec input must produce byte-identical output.
  Sort keys and avoid timestamps in generated headers where the
  generator allows it.
- Prefer the smallest client that covers the need: types-only
  generation plus a thin runtime client is easier to keep correct
  than a full generated SDK with framework hooks.
- Use the generator's mock output (orval's MSW mocks, or a Prism
  mock from the same spec) for frontend and consumer tests so the
  tests exercise the contract, not a hand-written fixture.
- Review generator upgrades like dependency upgrades: read the
  changelog, regenerate, and inspect the diff for behavioral
  changes before merging.

## Security Considerations

- Treat the OpenAPI document as untrusted input to the generator.
  In September 2026, orval disclosed code-injection CVEs
  (CVE-2026-96754, CVE-2026-96755, CVE-2026-96759, CVSS 9.8) in
  which attacker-controlled spec values were spliced into
  generated TypeScript without escaping. Use orval 8.30.0 or
  later, keep generators current, and never generate from a spec
  you have not reviewed if the generated code runs in production.
- Never put secrets, credentials, or real tokens in the spec or in
  generator config. Examples in the spec must use obviously fake
  values; generated code ships those examples.
- Run generation in CI with least privilege: the generation step
  needs no network access beyond fetching the pinned spec, and no
  write access beyond the generated directory.
- Review generated-code diffs for unexpected additions when the
  spec changes: a new endpoint in the spec becomes a new method in
  the client, and a renamed schema can silently change types.
- Generated clients still need the security rules of
  `sdk-development`: HTTPS only, credentials in memory only, no
  logging of tokens or bodies. Generation does not exempt the
  client from those rules.
- Pin the spec source. Generating from an unversioned URL lets a
  compromised or changed spec inject code into the next build.

## Performance Considerations

- Generation time is CI time: keep the spec bundled and the
  generator version pinned so regeneration is a single fast step.
  Cache the generator's dependencies (Java/Maven artifacts, npm
  packages) in CI.
- Generated clients vary in size: a full generated SDK with
  framework hooks is larger than types plus a thin fetch wrapper.
  Measure the shipped bundle and prefer the smaller shape when
  the extra features are unused.
- Prefer tree-shakeable output (flat functions over classes with
  every method attached) so bundlers can drop unused operations.
  hey-api's SDK plugin and openapi-fetch both produce
  tree-shakeable output.
- Generation output size grows with the spec: for very large APIs,
  generate per-tag or per-resource modules so consumers import
  only what they use.
- Do not regenerate on every build in development; regenerate on
  spec change and commit the result. Regeneration on every build
  slows the feedback loop and hides drift.

## Common Mistakes

- Hand-editing generated files — the next regeneration overwrites
  the fix. Fix the spec or the config, or wrap the generated code.
- Floating the generator version — a patch release changes output
  formatting and either breaks the drift check or silently changes
  behavior. Pin exactly.
- Generating from a floating "latest" spec URL — the client
  changes without a reviewable diff. Pin the spec version.
- Committing generated code without a drift check — the code and
  the spec drift apart silently. CI must regenerate and compare.
- Reviewing generated diffs line by line — noise. Review the spec
  diff and the config; trust the generator for the rest.
- Choosing a generator for one feature and ignoring its output
  shape — a React Query client is the wrong tool for a Node.js
  service, and a multi-language generator is overkill for a
  TypeScript-only frontend. Match the generator to the consumer.
- Ignoring breaking changes in the spec — regenerating over a
  breaking change ships a breaking client in a minor version. Run
  `oasdiff breaking` first.
- Forking generator templates for a cosmetic change — the fork
  must be maintained across every generator upgrade. Prefer
  config options and wrappers.

## Examples

An orval configuration (TypeScript, fetch client):

```ts
// orval.config.ts
export default {
  petstore: {
    input: "./openapi.bundled.yaml",
    output: {
      target: "./src/generated/petstore.ts",
      client: "fetch",
      mock: false,
    },
  },
};
```

A hey-api configuration (plugin-based):

```ts
// openapi-ts.config.ts
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.bundled.yaml",
  output: "./src/generated",
  plugins: ["@hey-api/client-fetch", "@hey-api/typescript"],
});
```

OpenAPI Generator via the npm wrapper (TypeScript fetch client):

```bash
npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.bundled.yaml \
  -g typescript-fetch \
  -o ./src/generated \
  --config ./openapi-generator-config.json
```

A CI drift check (regenerate and fail on differences):

```bash
npm run generate
git diff --exit-code -- src/generated/
```

## Validation Checklist

- [ ] The generator version is pinned exactly in the lockfile and
      in CI.
- [ ] The spec input is pinned (committed file or versioned URL).
- [ ] Generated code lives in one dedicated directory, marked as
      generated, excluded from linting and coverage.
- [ ] No generated file has been hand-edited; custom behavior is in
      a wrapper module.
- [ ] Regeneration is deterministic: running it twice produces no
      diff.
- [ ] CI regenerates and fails on drift (or `orval --outdated`
      reports no stale output).
- [ ] Generated output compiles and type-checks.
- [ ] Tests exercise the generated client against a mock or a test
      instance of the API.
- [ ] A breaking-change check ran against the previous spec before
      the client version was bumped.
- [ ] No secrets appear in the spec, the config, or the generated
      output.

## Expected Deliverables

- A generator configuration in the repository and a single
  `generate` command that reproduces the client.
- Generated client code in a dedicated directory, with the
  generator version recorded.
- A CI job that regenerates and fails on drift, plus a
  breaking-change check against the previous spec.
- Tests for the generated client (type smoke tests and mock or
  live contract tests).
- Documentation: how to regenerate, which generator version is
  pinned, and where custom behavior lives.

## References

- [OpenAPI Generator](https://openapi-generator.tech)
- [OpenAPI Generator repository](https://github.com/OpenAPITools/openapi-generator)
- [Orval](https://orval.dev)
- [Hey API](https://heyapi.dev/docs/openapi/typescript/get-started)
- [openapi-typescript](https://openapi-ts.pages.dev)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html)
- Related skills in this repository: `openapi`, `sdk-development`,
  `typescript-sdk`, `python-sdk`, `api-design`, `rest-api`,
  `ci-cd`, `integration-testing`.
