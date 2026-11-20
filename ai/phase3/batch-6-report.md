# Phase 3 Batch 6 Report — infrastructure + testing

- **Batch:** 6 (infrastructure: 13 skills, testing: 8 skills, 21 total)
- **Auditor:** Phase 3 batch 6 technical-accuracy audit
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted, per plan)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/infrastructure` → PASS (13 skills); `--filter skills/testing` → PASS (8 skills). No validation errors introduced.
- **Registry:** not regenerated (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 21 |
| Verified with limitations | 0 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

All 21 skills were checked against authoritative sources and are correct
after the fixes below. Every skill already carried
`metadata.last_verified: "2026-11-20"`, which is the date this audit
actually verified them, so no frontmatter date changes were needed.

## Per-skill table

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| infrastructure/ci-cd | Verified | Pipeline design guidance, branch-protection rules, environment/approval model, links to GitHub Actions / Vercel / Workers docs | None — no errors found; no versioned claims in this skill | GitHub Actions docs, Vercel docs, Cloudflare Workers docs |
| infrastructure/cloudflare | Verified | SSL/TLS modes (Full Strict vs Flexible), Always Use HTTPS, DNS/proxy guidance, API token scoping, Page Rules status | Page Rules are deprecated: frontmatter description now says "redirect, cache, and configuration rules" instead of "page rules"; added a deprecation note + migration-guide link in Prerequisites / Official Documentation; reworded the Security and Performance bullets that recommended page rules | Cloudflare Page Rules migration guide (developers.cloudflare.com/rules/reference/page-rules-migration/), Cloudflare blog "The future of Page Rules" |
| infrastructure/cloudflare-d1 | Verified | `wrangler d1 create` / `migrations apply --local --remote` / `execute`, D1 API (`prepare`, `bind`, `.first()`, `.all()`, `batch`), migration conventions, SQL example | Wrangler 4 defaults D1 commands to local mode: `wrangler d1 execute` for production inspection now reads `wrangler d1 execute --remote`, with a Prerequisites note explaining the v4 default; added the 50 MB maximum query-result-size enforcement note | Cloudflare Wrangler v3→v4 migration guide, Wrangler commands reference, D1 changelog (Oct 30, 2026 entry) |
| infrastructure/cloudflare-kv | Verified | `wrangler kv namespace create`, `[[kv_namespaces]]` binding incl. `preview_id`, `get`/`put`/`expirationTtl` API, null handling, eventual-consistency guidance | Added Wrangler 4 note: `wrangler kv` commands default to local in v4 (remote in v3); `--remote` is required for the live namespace | Cloudflare Wrangler v3→v4 migration guide, KV docs, Wrangler configuration reference |
| infrastructure/cloudflare-queues | Verified | `[[queues.producers]]` / `[[queues.consumers]]` config, `Queue.send`, `MessageBatch`, `message.ack()` / `message.retry()`, at-least-once delivery, DLQ behavior | Fixed a wrong claim: without a dead-letter queue, failed messages do **not** "retry forever" — after `max_retries` (default 3) they are discarded. Reworded the Common Mistakes bullet accordingly. Added consumer defaults (`max_batch_size` 10, `max_batch_timeout` 5s, `max_retries` 3) and `max_concurrency` / `retry_delay` to Prerequisites | Cloudflare Queues configuration docs (developers.cloudflare.com/queues/configuration/configure-queues/), Wrangler configuration reference |
| infrastructure/cloudflare-r2 | Verified | `wrangler r2 bucket create`, `[[r2_buckets]]` binding, `put` with `httpMetadata.contentType`, `get` returning null, presigned-URL and public-access guidance, no-egress-fees claim | Added Wrangler 4 note: `wrangler r2 object` commands default to local in v4; `--remote` is required for the live bucket | Cloudflare R2 docs, Wrangler v3→v4 migration guide |
| infrastructure/cloudflare-workers | Verified | Module worker format, `wrangler.toml` bindings, `compatibility_date`, `wrangler dev` / `deploy` / `tail` / `secret put` / `types`, `ctx.waitUntil()`, D1 binding example, Node.js LTS claim | Updated the stale "Node.js 24 is current" claim: 22, 24, and 26 are the active LTS lines as of 2026-11-20, 26 ("Lithium") is the newest, 20 is EOL (Mar 2026). Added Wrangler 4.x as the current major with the local-by-default note; config formats now list `wrangler.jsonc` too | Node.js releases page (nodejs.org/en/about/previous-releases), Cloudflare Workers docs, Wrangler v3→v4 migration guide |
| infrastructure/deployment | Verified | Deploy/verify/rollback workflow, health-endpoint and smoke-test guidance, Workers rollback example | The rollback example only showed redeploying an old commit, contradicting the skill's own "prefer the platform's rollback feature" rule. Rewrote it to lead with `wrangler rollback` (optionally with a version ID), noting the 100-most-recent-versions limit and that bound data is not rolled back; git-checkout redeploy kept as fallback | Cloudflare Workers Rollbacks docs (developers.cloudflare.com/workers/versions-and-deployments/rollbacks/), Cloudflare blog "Introducing Rollbacks for Workers Deployments" |
| infrastructure/docker | Verified | Multi-stage Dockerfile, `docker build` / `run` / `compose` commands, Compose file syntax, `node:24-alpine` and `postgres:17-alpine` tags, `.dockerignore`, non-root guidance | **Fixed a broken example:** the runtime stage set `USER node` before `COPY` and `RUN npm ci`, but `/app` is root-owned, so the copies and the install fail as user `node`. Reordered to install as root, `COPY --chown=node:node`, then `USER node` before `CMD`; added a matching Common Mistakes bullet. Added a version note: Compose v2 (`docker compose`; v1 is EOL), Node 22/24/26 LTS lines, Node 20 EOL, Alpine musl caveat | Docker Hub official `node` image tags page, Node.js releases page, Docker Docs |
| infrastructure/durable-objects | Verified | `DurableObject` base class from `cloudflare:workers`, `idFromName` / `idFromString`, `[[durable_objects.bindings]]`, `[[migrations]]`, `ctx.storage` API, WebSocket hibernation, alarms | Fixed API drift: workflow/standards/checklist said the constructor takes `state` and state lives in `state.storage` (the pre-base-class API) while the example uses the `DurableObject` base class — now consistently `ctx`/`env` with `super(ctx, env)` and `this.ctx.storage` / `this.ctx.blockConcurrencyWhile`. Migration example changed from `new_classes` (legacy KV backend) to `new_sqlite_classes` (recommended SQLite backend, required for the SQL API); added a Prerequisites note that the backend is fixed at class creation | Cloudflare Durable Objects docs ("Access Durable Objects Storage", "Rules of Durable Objects") |
| infrastructure/github-actions | Verified | Workflow YAML syntax, triggers, `permissions`, concurrency groups, `actions/checkout`, `actions/setup-node`, `node-version` / `cache: npm`, `environment`, deploy gating, script-injection guidance | Examples used `actions/checkout@v4` / `actions/setup-node@v4`, which run on Node.js 20 (EOL Mar 2026). Bumped all three uses to `@v7` (current: setup-node v7.1.0) and the "such as `v4`" text to `v7`. Added a version note: v5 = Node.js 24 runtime (self-hosted runners ≥ v2.327.1), v6 = checkout credential-storage change / setup-node npm-only auto-caching, v7 = ESM; Node 22/24/26 LTS lines for `node-version` | actions/setup-node releases (v7.1.0, github.com), actions/checkout releases, setup-node README (V5/V6/V7 breaking changes), Node.js releases page |
| infrastructure/observability | Verified | Structured-logging guidance, four golden signals, health-endpoint example (D1 `SELECT 1`), `wrangler tail`, OpenTelemetry / Prometheus links | None — no errors found; no versioned claims in this skill | OpenTelemetry docs, Prometheus docs, Cloudflare Workers docs |
| infrastructure/vercel | Verified | `vercel login` / `vercel --prod` / `vercel env add`, `vercel.json` redirects/headers format, Git integration, preview deployments, env-var scoping | Added a version note: Node.js 26.x is the default for new projects (GA 2026-10-29); 24.x/22.x also available; Node.js 20 deprecated 2026-10-01 (new deployments targeting it fail); pin via `engines.node` in `package.json` (overrides dashboard); Edge runtime deprecated — use the default Node.js runtime | Vercel supported Node.js versions docs, Vercel changelog (Node.js 26 LTS GA, Oct 29, 2026) |
| testing/accessibility-testing | Verified | WCAG AA contrast ratios (4.5:1 / 3:1), 200% zoom, keyboard/screen-reader workflow, `@axe-core/playwright` `AxeBuilder({ page }).analyze()` API, axe/ pa11y / WAI-ARIA links | Added a version note: WCAG 2.2 is the current version of the guidelines; WCAG 3.0 remains a draft, not a conformance target | W3C WCAG standards page, axe-core GitHub repo, MDN accessibility guides |
| testing/e2e-testing | Verified | Journey selection, Playwright example (role/label locators, web-first assertions), selector-preference order, CI/artifacts guidance, Cypress link | None — no errors found | Playwright docs, Cypress docs |
| testing/integration-testing | Verified | Testcontainers / MSW / Prisma links, transaction-rollback and per-test cleanup guidance, Fastify-style `app.inject` example, cross-references to `secrets-management` (exists in `skills/security/`) | None — no errors found; no versioned claims in this skill | Testcontainers docs, MSW docs, Prisma docs |
| testing/performance-testing | Verified | k6 script syntax (`stages`, `thresholds`, `http_req_failed: ["rate<0.01"]`, `http_req_duration: ["p(95)<500"]`, `check`, `sleep`), percentile reporting guidance, k6 / Artillery / JMeter / WebPageTest links | None — no errors found | k6 docs (k6.io/docs), web.dev performance guides |
| testing/playwright | Verified | `playwright.config.ts` (`testDir`, `baseURL`, `fullyParallel`, `retries`, `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, `webServer`, `reuseExistingServer`, `devices[...]` projects), locator guidance, `storageState`, example test | Updated the stale "Node.js 24 is current LTS" claim: use Node.js 22, 24, or 26; Playwright 1.65.x is current (1.65.1, 2026-11-13) and no longer tests on Node.js 20. Added version differences: Chrome for Testing replaced raw Chromium in 1.57 and `Page#accessibility` was removed; 1.65 follows `useDefineForClassFields` (page-object field initializers can break), actions wait for non-inert elements, cookie matching follows RFC 6265 | Playwright 1.65 release notes (playwright.dev/docs/next/release-notes), Node.js releases page |
| testing/regression-testing | Verified | Regression-test workflow, blast-radius guidance, cross-references to `vitest`, `playwright`, `security-auditing` (exists in `skills/security/`) | None — no errors found; no versioned claims in this skill | Vitest docs, Playwright docs, GitHub Actions docs |
| testing/unit-testing | Verified | Vitest examples (`describe`/`it`/`expect`, `vi.useFakeTimers`, `vi.setSystemTime`), arrange-act-assert, mocking guidance, cross-reference to `secrets-management` (exists) | Added a version pointer in Prerequisites: Vitest 5.x is the current major (Node.js >= 22.12, Vite >= 6.4); see the `vitest` skill for details | Vitest docs (vitest.dev), Node.js test runner API docs |
| testing/vitest | Verified | `vitest.config.ts` (`defineConfig` from `vitest/config`, `environment`, `include`, `clearMocks`, `coverage.provider: "v8"`), `vi.mock` / `vi.mocked` / `vi.fn` / `vi.spyOn` example, `test.each`, `--sequence.shuffle`, package.json scripts, Node.js LTS claim | Updated the stale Node.js claim and added full version support: Vitest 5.x current (5.0 released 2026-09-03; requires Node.js >= 22.12, Vite >= 6.4; Vite is a peer dependency in v5, Yarn users must install it explicitly); Vitest 4.x requires Node.js >= 20, Vite >= 6. Corrected the mock-reset standard: in Vitest 5 `clearMocks` defaults to `true`, so explicit `clearMocks: true` is redundant (kept in the example as harmless/explicit) and `vi.clearAllMocks()` is only needed on v4 and earlier. Added v5 behaviors: unawaited async assertions fail (new Common Mistakes bullet), `vi.mock()` must be top-level; v4 changes: `vitest.workspace.*` → `projects`, `poolOptions` → `maxWorkers`. Coverage provider package names added (`@vitest/coverage-v8`, `@vitest/coverage-istanbul`, same major as Vitest) | Vitest 5.0 announcement (vitest.dev/blog/vitest-5), Vitest migration guides (v4/v5), Vitest getting-started guide, Node.js releases page |

## Files changed (15 of 21)

- `skills/infrastructure/cloudflare/SKILL.md`
- `skills/infrastructure/cloudflare-d1/SKILL.md`
- `skills/infrastructure/cloudflare-kv/SKILL.md`
- `skills/infrastructure/cloudflare-queues/SKILL.md`
- `skills/infrastructure/cloudflare-r2/SKILL.md`
- `skills/infrastructure/cloudflare-workers/SKILL.md`
- `skills/infrastructure/deployment/SKILL.md`
- `skills/infrastructure/docker/SKILL.md`
- `skills/infrastructure/durable-objects/SKILL.md`
- `skills/infrastructure/github-actions/SKILL.md`
- `skills/infrastructure/vercel/SKILL.md`
- `skills/testing/accessibility-testing/SKILL.md`
- `skills/testing/playwright/SKILL.md`
- `skills/testing/unit-testing/SKILL.md`
- `skills/testing/vitest/SKILL.md`

Unchanged (verified, no errors found): `infrastructure/ci-cd`,
`infrastructure/observability`, `testing/e2e-testing`,
`testing/integration-testing`, `testing/performance-testing`,
`testing/regression-testing`. All files remain under 500 lines (max 262).

## Notable corrections

1. **Docker example was broken** — `USER node` before `COPY`/`npm ci`
   fails because `/app` is root-owned. Fixed ordering and added a
   Common Mistakes bullet.
2. **Queues DLQ claim was wrong** — without a dead-letter queue,
   messages are discarded after `max_retries` (default 3), not retried
   forever.
3. **GitHub Actions examples pinned Node 20-era actions** — `@v4` of
   checkout/setup-node runs on Node.js 20 (EOL); bumped to `@v7`.
4. **D1 production inspection missed `--remote`** — in Wrangler 4,
   `wrangler d1 execute` without `--remote` queries the local database,
   so the skill's "inspect production data" advice would silently read
   the wrong database. Same local-by-default note added to KV and R2.
5. **Durable Objects mixed two API generations** — prose used the old
   `state.storage` API while the example used the `DurableObject` base
   class (`this.ctx.storage`); also migrated the example from the
   legacy KV storage backend (`new_classes`) to SQLite
   (`new_sqlite_classes`).
6. **"Node.js 24 is current" was stale in three skills** — Node.js 26
   (Lithium) entered LTS on 2026-10-28 and is the newest LTS line;
   Node.js 20 is EOL.
7. **Cloudflare Page Rules are deprecated** — the skill still
   recommended them; now points at Redirect/Cache/Configuration Rules.
8. **Deployment rollback contradicted itself** — the skill said to
   prefer the platform rollback but only showed a git-checkout
   redeploy; `wrangler rollback` is now the primary example.
9. **Vitest 5 changes** — the skill predated the 5.0 release
   (2026-09-03): `clearMocks` now defaults to `true`, unawaited async
   assertions fail, Node >= 22.12 / Vite >= 6.4 required.
10. **Playwright 1.65** — Node 20 no longer tested; class-field and
    inert-element breaking changes noted.

## Blockers

None. All official documentation needed for verification was reachable.
No skill is Unverified or Blocked.
