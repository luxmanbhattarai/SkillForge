# Phase 4 Batch 1 Report — Backend Frameworks

- **Date:** 2026-11-20
- **Batch:** 1 (nestjs, fastify, express, advanced-api-architecture)
- **Branch:** feat/skillforge-production-upgrade
- **Status:** Complete — 4 new skills written, all validated.

## Skills written

| Skill | Directory | Lines | Description |
| --- | --- | --- | --- |
| `nestjs` | `skills/backend/nestjs/` | 356 | NestJS 12: modules/controllers/providers, DI, middleware/guards/interceptors/pipes, validation, testing, configuration, deployment |
| `fastify` | `skills/backend/fastify/` | 375 | Fastify 5: routing, plugins/encapsulation, schema validation, hooks, logging, performance, testing, deployment |
| `express` | `skills/backend/express/` | 382 | Express 5: routing, middleware, error handling, security hardening, async patterns, testing, production setup |
| `advanced-api-architecture` | `skills/backend/advanced-api-architecture/` | 403 | Capstone: REST/GraphQL architecture, versioning, pagination, rate limiting, idempotency, validation, errors, auth/authz, security, caching, background jobs, webhooks, observability, distributed systems, documentation |

All four are single `SKILL.md` files (no `references/` needed; all under
the 500-line recommendation). Frontmatter follows the template exactly:
`name` = directory name, `description` ≤ 1024 chars with trigger
keywords, `license: MIT`, metadata `version: "1.0.0"`,
`category: backend`, `maintainer: skills-library`, `source: original`,
`last_verified: "2026-11-20"`. Version info lives in the body
(Prerequisites / Official Documentation), per the Phase 3 decision
`ai/decisions/2026-11-20-phase3-version-metadata.md`.

## Official sources consulted

### Versions (verified against the npm registry, 2026-11-20)

| Package | Version verified |
| --- | --- |
| `@nestjs/core` | 12.6.0 (engines: node >= 20) |
| `@nestjs/cli` | 12.0.15 |
| `@nestjs/config` | 12.1.1 |
| `@nestjs/testing` | 12.6.0 |
| `fastify` | 5.12.8 |
| `express` | 5.3.0 (engines: node >= 18) |
| `@fastify/swagger` | 9.9.5 |
| `@fastify/helmet` | 13.2.0 |
| `@fastify/cors` | 11.4.3 |
| `@fastify/rate-limit` | 11.3.0 |
| `@fastify/jwt` | 10.2.8 |
| `helmet` | 8.3.0 |
| `express-rate-limit` | 8.7.5 |
| `class-validator` | 0.15.1 |
| `class-transformer` | 0.5.1 |

### NestJS (`nestjs`)

- NestJS documentation — https://docs.nestjs.com (fetched; confirms
  Express default adapter, optional Fastify/`node:http` adapters, CLI
  scaffolding, `--minimal` flag, first-party packages).
- NestJS 12 release notes via the official announcement (Trilon,
  the framework author's company) and endoflife.date: v12.0.0 released
  2026-08-27; ESM core packages; Standard Schema support; rebuilt CLI
  with `nest upgrade`; `@nestjs/observe` SDK; requires Node.js
  v20.19+ or v22.12+; v11 in security support only. Latest 12.x per
  npm is 12.6.0 (newer than endoflife.date's 12.5.1 listing).
- Verified (HTTP 200): first-steps, custom-providers, validation,
  testing, configuration, CLI overview, authentication docs, and
  https://github.com/nestjs/nest/releases.

### Fastify (`fastify`)

- Fastify documentation — https://www.fastify.io/docs/latest/
  (Getting Started fetched; confirms plugin/encapsulation model,
  `register` load order, `fastify-plugin`, JSON Schema validation,
  `inject()` testing).
- Fastify 5.12.8 (2026-11-02) confirmed as current stable via npm
  registry and the GitHub release notes; security release fixing
  GHSA-3qgw-9275-xf8w / CVE-2026-120216 (DoS via `handlerTimeout`
  with streaming responses; affects 5.8.0–5.12.7). Fastify 6 is in
  alpha (6.0.0-alpha.6) — noted as not for production. Fastify 4
  reached end of life 2025-06-30. Fastify 5 requires Node.js 20+.
- Verified (HTTP 200): Plugins, Encapsulation, Validation and
  Serialization, Hooks, Logging, Testing, TypeScript reference pages,
  and https://github.com/fastify/fastify/releases.

### Express (`express`)

- Express 5.x API reference — https://expressjs.com/en/5x/api.html
  (fetched; confirms Node.js 18+ requirement).
- Express 5.3.0 (2026-10-09) confirmed as current stable via npm
  registry and Wikipedia; npm `latest` since 5.1.0 (2025-03-31);
  4.x line at 4.22.3 (2026-09-14) on the `latest-4` tag, security
  maintenance only. Express 5 changes used in the skill: async
  rejected promises auto-forwarded to error middleware,
  path-to-regexp v8 route syntax.
- Verified (HTTP 200): routing, using-middleware, error-handling,
  best-practice-security, best-practice-performance, migrating-5,
  https://github.com/expressjs/express/releases,
  https://helmetjs.github.io/,
  https://express-rate-limit.mintlify.app/,
  https://express-validator.github.io/docs/, https://zod.dev/.

### Advanced API Architecture (`advanced-api-architecture`)

- Standards, all verified (HTTP 200): RFC 9110 (HTTP Semantics),
  RFC 9111 (HTTP Caching), RFC 9457 (Problem Details),
  GraphQL specification (https://spec.graphql.org/),
  OpenAPI Specification (https://spec.openapis.org/oas/latest.html),
  OWASP API Security Top 10 (https://owasp.org/API-Security/),
  IETF Idempotency-Key header draft
  (https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/).
- Composes (by backticked name, no repetition): `api-design`,
  `rest-api`, `graphql`, `rate-limiting`, `queues`,
  `background-jobs`, `caching`, `api-documentation` — all confirmed
  present in `registry/skills.json`. Also cross-references
  `authentication`, `observability`, `nestjs`, `fastify`, `express`,
  `hono`, `trpc` (all confirmed present).

## Validation output

Run from the repo root, one filtered command per skill
(coordinator regenerates the registry at the end; no unfiltered
validate or `npm run registry` was run):

```text
=== nestjs ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== fastify ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== express ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== advanced-api-architecture ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

Line counts: nestjs 356, fastify 375, express 382,
advanced-api-architecture 403 — all under the 500-line
recommendation.

## Decisions and notes

- **NestJS version stated as 12.6.0** (npm `latest` on 2026-11-20),
  with the v12.0.0 release date (2026-08-27) and the Node.js
  v20.19+/v22.12+ requirement from the official v12 release notes.
  The `compatibility` frontmatter field carries the Node.js
  requirement, matching the existing `hono` skill's use of that
  field.
- **Fastify security content cites CVE-2026-120216** (fixed in
  5.12.8) with the affected range 5.8.0–5.12.7, sourced from the
  GitHub security release and CVE record.
- **Express 5 vs 4 differences are called out explicitly** (async
  error forwarding, path-to-regexp v8 wildcard syntax, the
  `latest-4` tag) because most existing Express code in the wild is
  still 4.x; the migration guide is linked rather than summarized
  in full.
- **The capstone composes rather than repeats**: the
  `advanced-api-architecture` skill states decision criteria and
  cross-cutting policies (versioning, idempotency, failure modes,
  webhook guarantees) and defers mechanics to the eight sibling
  skills. Its examples are a problem-details payload, an
  idempotency-key flow described in words, and a cursor-pagination
  payload — no framework-specific code, since the mechanics belong
  to the framework skills.
- **No `references/` directories were needed.** All four skills fit
  under 500 lines with substantive Security and Performance
  sections; longer material was kept out rather than split off.
- **No files outside the batch assignment were touched.**
  `skills/upstream/` untouched; no commits, pushes, merges, or
  branch switches.
