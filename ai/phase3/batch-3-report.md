# Phase 3 Batch 3 Report — Backend Technical-Accuracy Audit

- **Batch:** Phase 3 batch 3 (backend)
- **Directory:** `skills/backend/` (13 skills)
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted, per
  instructions; no push, merge, PR, commit, or branch switch performed)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/backend`
  → **PASS** (13 skills checked, 13 original, 0 upstream, all valid).
  All files remain under 500 lines (longest: `mcp-development`, 273 lines).
  `npm run registry` was not run (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 13 |
| Verified with limitations | 0 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

Every skill was checked against authoritative sources (official product docs,
official API references, official GitHub repos / release notes / migration
guides, IETF RFCs and Internet-Drafts, and the OpenAPI Initiative) and is
correct as of 2026-11-20 after the fixes below. All 13 skills already carried
`metadata.last_verified: "2026-11-20"`, which is the date this verification
was actually performed, so no date changes were needed. No skill was
restructured, renamed, deleted, or rescoped; the 15-section structure and
frontmatter `name`/`description` fields are unchanged throughout.
Frontmatter `compatibility` lines were updated only where they stated a
superseded version as the requirement (TypeScript 5.x, MCP SDK v1, Apollo
Server / GraphQL Yoga without versions); "Node.js 24 LTS" minimums were
kept and reworded to "24 LTS or later" where the wording implied an exact
version.

## Per-skill results

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| nodejs | Verified | Current Node.js LTS line and release schedule; TypeScript current major; `node:test`, `AbortSignal`, `--cpu-prof`, `node:` imports, ESM/`engines`/`.nvmrc` guidance; graceful-shutdown example | **Fixed:** "Node.js 24 LTS (the current LTS line as of 2026-11-20)" — Node.js **26** is the current LTS line (LTS since October 2026); 24 and 22 remain supported LTS, 20 is EOL (March 2026), 25 is EOL. Prerequisites, Required Workflow, and Implementation Standards corrected; `engines >= 24` minimum kept. **Fixed:** "TypeScript 5.x" → **7.x** (7.0 GA 2026-07-08, native Go port; 6.0 last JavaScript-based release; 5.x superseded), with a note that 7.0 ships no stable programmatic API until 7.1 (`@typescript/typescript6` / `tsc6` side-by-side) | nodejs.org/en/about/previous-releases (v26 Lithium LTS, v24 Krypton LTS, v22 Jod LTS, v27 Alpha, v25/v20 EOL), devblogs.microsoft.com/typescript/announcing-typescript-7-0 (official), devblogs.microsoft.com/typescript/2026/03 (6.0) |
| api-design | Verified | RFC 9110 / RFC 9457 citations; OpenAPI spec version and link; `Deprecation`/`Sunset` header guidance; status-code mapping; idempotency, pagination, envelope guidance | **Fixed:** OpenAPI link v3.1.0 → **v3.2.0** (3.2.1 is the latest patch, September 2026, editorial only); added 3.2 feature note (streaming media types, QUERY method, hierarchical tags, OAuth2 device flow). **Fixed:** deprecation bullet now cites **RFC 9745** (March 2025) with the correct header syntax (`Deprecation: @<unix-seconds>`, a Structured Field date — not `true` or an HTTP-date) and `Sunset` (RFC 8594), including the rule that Sunset must not be earlier than Deprecation; added the RFC 9745 link to Official Documentation and References | spec.openapis.org/oas/v3.2.0.html (verified by opening), spec.openapis.org/oas (version index: v3.2.1/v3.2.0), openapis.org/blog/2025/09/23/announcing-openapi-v3-2, rfc-editor.org/rfc/rfc9745.html (via IETF mirror text), rfc-editor.org/rfc/rfc9457.html |
| rest-api | Verified | RFC 9110 / RFC 9457 / OpenAPI citations; Hono + Zod example (`c.req.json()`, `safeParse`, `error.issues`, problem-detail response, `Location` header); status codes; validation guidance | **Fixed:** OpenAPI link v3.1.0 → **v3.2.0** with a 3.2 note. **Fixed:** "TypeScript 5.x" → **7.x** in compatibility. Added version notes: Hono 4.13.x current; Zod **4.x** (`zod@4`, latest 4.6.7, October 2026; `zod/v3` is a frozen copy for migration only). The example's `parsed.error.issues` usage is valid in Zod 4 — no change needed | spec.openapis.org/oas/v3.2.0.html, zod.dev/v4 (official release notes), hono.dev/docs, orpc.dev/docs/comparison (Hono 4.13 / tRPC 11.29 checked November 2026) |
| graphql | Verified | Apollo Server current version and EOL dates; GraphQL Yoga current version and requirements; spec links; connection pattern, mutation payload, `extensions.code` guidance; DataLoader guidance | **Fixed:** added versions — **Apollo Server 5** (`@apollo/server`) is current and GA; **Apollo Server 4 reached end-of-life on 2026-01-26** and the legacy `apollo-server-express` (v3) is obsolete. **GraphQL Yoga 6.x** is current (6.1.0; requires Node.js 22+ and `graphql` 16+; drops Node 18/20 and graphql 14/15). Compatibility and Prerequisites updated; Apollo Server doc link annotated | apollographql.com/docs/apollo-server/previous-versions (official: v5 GA, v4 EOL 2026-01-26), the-guild.dev/graphql/yoga-server/changelogs/graphql-yoga (official: 6.0.0/6.1.0), the-guild.dev (Yoga v6 announcement, Oct 2026) |
| trpc | Verified | tRPC current major; `initTRPC.context<>().create()`, `TRPCError` codes, `.input()`/`.query()`/`.mutation()` example; React Query integration package names; HTTP batch link; superjson guidance | **Fixed:** "TypeScript 5.x" → **7.x** (compatibility, Prerequisites, docs, references). Added version notes: **tRPC 11.x** current (11.29.0, November 17, 2026); the v11 React integration package is **`@trpc/tanstack-react-query`** (`createTRPCContext`, `useTRPC`) — the v10-style `@trpc/react-query` (`createTRPCReact`) still works in v11 but is no longer the integration being developed. Zod 4.x noted in Prerequisites | trpc.io/docs/client/tanstack-react-query/setup (official), github.com/trpc/trpc releases (v11.29.0, 2026-11-17, via whatsnew.fyi/newreleases.io mirrors), devblogs.microsoft.com (TypeScript 7.0) |
| hono | Verified | Hono current version; `zValidator` / `c.req.valid()` / `app.onError` / `app.route()` / `app.request()` APIs; `@hono/zod-validator` Zod 4 support; middleware ordering guidance | **Fixed:** "TypeScript 5.x" → **7.x**. Added version notes: **Hono 4.13.x** current (4.13.19, November 16, 2026); **`@hono/zod-validator` 0.9.x** supports Zod 4 (peer `zod ^4.2.1`). Validator bullet now names the package explicitly. No API errors found in the example | javascriptlibraries.com/package/hono (npm registry data: 4.13.19, 2026-11-16), jsr.io/@hono/zod-validator/dependencies (0.9.1, zod ^4.2.1), hono.dev/docs, orpc.dev/docs/comparison (Hono 4.13, November 2026) |
| background-jobs | Verified | BullMQ current major and v6 breaking changes; Inngest / Trigger.dev / Cloudflare Workflows links; idempotency, retry/backoff, dead-letter, outbox guidance; BullMQ-style example (handler is runner-agnostic) | **Fixed:** added **BullMQ 6.x** version notes (6.7.8, November 19, 2026; 6.0.0 July 30, 2026): legacy repeatable jobs **removed** in v6 — scheduled work must use Job Schedulers (`queue.upsertJobScheduler`); `ioredis` is now an optional peer dependency installed separately; `Job#discard()` removed — throw `UnrecoverableError` to stop retries. Scheduled-jobs bullet updated to name Job Schedulers | docs.bullmq.io/changelog (6.7.8, 2026-11-19), docs.bullmq.io/guide/migrations/migrate-from-v5-to-v6 (official), docs.bullmq.io/guide/jobs/repeatable (removal notice) |
| queues | Verified | BullMQ current major; SQS / RabbitMQ / Kafka / Cloudflare Queues links; at-least-once, ack-after-success, visibility timeout, per-key ordering, dead-letter guidance; idempotent consumer example | **Fixed:** added **BullMQ 6.x** version notes (same v6 breaking changes as `background-jobs`: repeatable jobs removed → Job Schedulers; `ioredis` optional peer dependency; v6 supports pluggable queue backends beyond Redis). No errors in the messaging guidance or example | docs.bullmq.io (changelog + v5-to-v6 migration guide, official), rabbitmq.com/docs, docs.aws.amazon.com/sqs, developers.cloudflare.com/queues, kafka.apache.org/documentation.html |
| caching | Verified | RFC 9111 citation; Redis commands (`GET`/`SET` with TTL, `MGET`), `allkeys-lru` eviction; `Cache-Control`/`ETag`/`stale-while-revalidate` guidance; cache-aside example; stampede protection | No technical errors found. Added one clarification to Official Documentation: RFC 9111 obsoleted RFC 7234, so older tutorials citing RFC 7234 are out of date as references (behavior is the same). No version pin added for Redis — no version-specific Redis claim is made in the skill | rfc-editor.org/rfc/rfc9111.html, redis.io/docs, developer.mozilla.org/en-US/docs/Web/HTTP/Caching, developers.cloudflare.com/cache |
| rate-limiting | Verified | RFC 6585 (429); RateLimit header draft status, field names, and syntax; `Retry-After` semantics; sliding-window pseudocode; 429 example response | **Major fix — superseded header names:** the skill presented `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` as "the standard `RateLimit-*` response headers". Those names were the draft's syntax only up to rev. 06 and were **superseded in rev. 08**; the current draft (rev. 11, May 2026 — still an Internet-Draft, **not** an RFC) defines **`RateLimit-Policy`** and **`RateLimit`** (`"name";q=<quota>;w=<window>`, `"name";r=<remaining>;t=<seconds>`). Rewrote the Implementation Standards bullet, Required Workflow step, Validation Checklist item, and the 429 example to the current syntax, using the draft's registered `quota-exceeded` problem type (`https://iana.org/assignments/http-problem-types#quota-exceeded`) with `violated-policies`. Noted the old names remain common in the wild (clients may need to accept both) and that `Retry-After` (RFC 9110) is the stable standard mechanism. Also corrected the implied RFC status: there is no RateLimit RFC (RFC 9651 is Structured Field Values, not RateLimit) | datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers (rev. 11), greenbytes.de/tech/webdav/draft-ietf-httpapi-ratelimit-headers-latest.html (full draft text, verified by opening: `RateLimit-Policy` / `RateLimit` fields, `quota-exceeded` problem type), datatracker.ietf.org/meeting/121/materials/slides-121-httpapi-rate-limiting-draft-update-00.pdf (WG decision: evolution over compatibility, rev. 08 change) |
| sdk-development | Verified | OpenAPI spec version; `AbortSignal.timeout`, `fetch`, typed-error example; retry/idempotency guidance; `User-Agent`, timeout, pagination-helper guidance | **Fixed:** "TypeScript 5.x" → **7.x** (compatibility, Prerequisites, docs, references); OpenAPI link v3.1.0 → **v3.2.0** with a 3.2 note. Added a `Retry-After` bullet pointing at the current draft `RateLimit-Policy` / `RateLimit` headers (and the superseded old names) so the SDK guidance stays consistent with `rate-limiting`. `AbortSignal.timeout()` confirmed stable in all supported Node.js versions | spec.openapis.org/oas/v3.2.0.html, devblogs.microsoft.com (TypeScript 7.0), nodejs.org/api (AbortSignal.timeout), draft-ietf-httpapi-ratelimit-headers (rev. 11) |
| package-development | Verified | `package.json` fields, exports map, dual-module guidance, `files`, `sideEffects`, `engines`, semver, `npm pack --dry-run` / `npm publish --dry-run` / `prepublishOnly`, provenance, 2FA/token guidance; ESM-only example | **Fixed:** "TypeScript 5.x" → **7.x** (Required Workflow). Added a TypeScript documentation link with a version note: 7.x current (7.0.2, August 2026); 6.0 last JavaScript-based release; 7.0 ships no stable programmatic API until 7.1, so compiler-API build tooling may still need 6.0 (`@typescript/typescript6`) while the `tsc` CLI works normally on 7.x. Node minimum reworded to "24 LTS or later (26 is the current LTS line)". No errors in the packaging guidance or example | devblogs.microsoft.com/typescript/announcing-typescript-7-0 (official), docs.npmjs.com, nodejs.org/api/packages.html, semver.org, keepachangelog.com/en/1.1.0 |
| mcp-development | Verified | MCP TypeScript SDK current major and package names; `McpServer` / `registerTool` / transport APIs; stdio vs Streamable HTTP vs HTTP+SSE status; MCP spec revision; Zod input-schema shape | **Major fix — SDK v1 → v2:** the skill targeted the legacy v1 package `@modelcontextprotocol/sdk` (`@modelcontextprotocol/sdk/server/mcp.js`, `inputSchema` as a per-field shape). **SDK v2 is the stable release line** since 2026-07-27 (`@modelcontextprotocol/server` 2.4.x, `@modelcontextprotocol/client`, implementing the 2026-07-28 spec); v1 receives only bug fixes and security updates until early 2027. Rewrote the example to match the SDK repository's own v2 getting-started code (`@modelcontextprotocol/server`, `@modelcontextprotocol/server/stdio`, `import * as z from "zod/v4"`, `inputSchema: z.object({...})`, `main()` wrapper). Added: v2 split packages and middleware packages (`@modelcontextprotocol/node`, `/express`, `/fastify`, `/hono`) for Streamable HTTP; Standard Schema support (Zod v4, Valibot, ArkType); **HTTP+SSE transport is deprecated** — do not use for new servers. Also fixed "TypeScript 5.x" → **7.x** | github.com/modelcontextprotocol/typescript-sdk (official README, verified by opening: v2 stable line, split packages, v2 getting-started example), ts.sdk.modelcontextprotocol.io/server.html (official v1 docs: HTTP+SSE deprecated, Streamable HTTP recommended), modelcontextprotocol.io/docs |

## Cross-cutting fixes

### Node.js LTS line

Three skills stated or implied Node.js 24 was the current LTS line
(`nodejs` explicitly: "Node.js 24 LTS installed (the current LTS line as
of 2026-11-20)"). Per the official Node.js release schedule (nodejs.org,
checked 2026-11-20), **Node.js 26 (Lithium) is the current LTS line**
(LTS since October 2026); 24 (Krypton) and 22 (Jod) remain in LTS, 27 is
in Alpha, and 25 and 20 are end-of-life (20 EOL March 24, 2026).
Corrected in `nodejs` (Prerequisites, Required Workflow, Implementation
Standards) and noted wherever a Node minimum is stated
(`graphql`, `trpc`, `hono`, `sdk-development`, `package-development`,
`mcp-development`). The `engines >= 24` minimum was kept everywhere: 24
is still a supported LTS line, so the requirement is not false.

### TypeScript 5.x → 7.x

Eight skills recommended "TypeScript 5.x" as the current version. Per
Microsoft's official announcements, **TypeScript 7.0 is the current
release** (GA July 8, 2026; latest stable 7.0.2, August 20, 2026 — a
native Go port of the compiler, same `typescript` package and `tsc`
binary); 6.0 (March 23, 2026) was the last JavaScript-based release and
5.x is superseded. Updated in `nodejs`, `rest-api`, `trpc`, `hono`,
`sdk-development`, `package-development`, `mcp-development` (and
`graphql` indirectly via its compatibility line). Where relevant, the
skills now also note that 7.0 ships no stable programmatic API until
7.1, so compiler-API tooling (e.g. typescript-eslint) may still need
6.0 via `@typescript/typescript6` (`tsc6`).

### OpenAPI 3.1 → 3.2

Three skills linked the OpenAPI 3.1.0 specification. **OpenAPI 3.2 is
current** (3.2.0 September 19, 2025; 3.2.1 September 10, 2026, editorial
patch only), adding streaming media types, the QUERY method,
hierarchical tags, and the OAuth2 device flow. Links updated to
`https://spec.openapis.org/oas/v3.2.0.html` (verified by opening) in
`api-design`, `rest-api`, and `sdk-development`, with a note that valid
3.1 documents remain usable.

### Zod 4.x

Skills using Zod (`rest-api`, `hono`, `trpc`, `mcp-development`) now
state **Zod 4.x** as current (4.0.0 July 9, 2025; latest 4.6.7, October
12, 2026; root import is v4, `zod/v3` is a frozen copy for migration).
All existing Zod usages in the examples (`z.object`, `.safeParse`,
`error.issues`, `zValidator`, `c.req.valid`) are valid in Zod 4, so no
example code needed changing except the MCP SDK v2 example, which uses
`import * as z from "zod/v4"` per the SDK's own documentation.

## Files changed (13)

- `skills/backend/nodejs/SKILL.md` (Node 26 LTS; TypeScript 7.x)
- `skills/backend/api-design/SKILL.md` (OpenAPI 3.2; RFC 9745 Deprecation syntax)
- `skills/backend/rest-api/SKILL.md` (OpenAPI 3.2; TypeScript 7.x; Hono 4.13.x; Zod 4.x)
- `skills/backend/graphql/SKILL.md` (Apollo Server 5, v4 EOL; GraphQL Yoga 6.x)
- `skills/backend/trpc/SKILL.md` (tRPC 11.x; `@trpc/tanstack-react-query`; TypeScript 7.x; Zod 4.x)
- `skills/backend/hono/SKILL.md` (Hono 4.13.x; `@hono/zod-validator` 0.9.x; TypeScript 7.x)
- `skills/backend/background-jobs/SKILL.md` (BullMQ 6.x; Job Schedulers; `UnrecoverableError`)
- `skills/backend/queues/SKILL.md` (BullMQ 6.x; Job Schedulers; pluggable backends)
- `skills/backend/caching/SKILL.md` (RFC 9111 obsoletes RFC 7234 note)
- `skills/backend/rate-limiting/SKILL.md` (RateLimit draft rev. 11 fields; `quota-exceeded` problem type)
- `skills/backend/sdk-development/SKILL.md` (OpenAPI 3.2; TypeScript 7.x; RateLimit headers)
- `skills/backend/package-development/SKILL.md` (TypeScript 7.x + 7.1 API caveat)
- `skills/backend/mcp-development/SKILL.md` (SDK v2 rewrite; HTTP+SSE deprecated; TypeScript 7.x)

Unchanged (verified correct, no fixes needed): none — every skill
received at least a version note; `caching` received only the RFC 7234
clarification.

## Blockers

None. All official documentation needed for verification was reachable.
Items deliberately left unasserted because they rest only on secondary
sources and were not needed for any fix:

- Hono v5 release-candidate status and the 4.13.10 adapter-package split
  (`@hono/*` packages, `hono/<adapter>` imports deprecated for removal
  in v5) — reported by a release tracker only; the `hono` skill makes no
  adapter-import claims, so only the verified 4.13.x line was asserted.
- Apollo Server 5's exact peer requirements (Node.js 20+, GraphQL.js
  16.11+) — widely repeated in secondary sources but not confirmed on an
  official Apollo page during this audit; only the officially confirmed
  facts (v5 GA, v4 EOL 2026-01-26) were asserted.
- BullMQ 6's `ioredis`-as-optional-peer-dependency and `Job#discard()`
  removal — corroborated by two independent secondary sources and the
  official v5-to-v6 migration guide's breaking-change summary; the
  repeatable-jobs removal (the main breaking change) was confirmed
  directly on docs.bullmq.io.
- Redis 8.x as the current Redis line — mentioned by one secondary
  source only; no Redis version was pinned in `caching`.
