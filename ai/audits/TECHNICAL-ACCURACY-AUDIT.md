# Technical Accuracy Audit — SkillForge

- **Audit date:** 2026-11-20 (all skills verified on this date; `last_verified` on every skill already read `2026-11-20`, so no date edits were needed)
- **Scope:** all 226 skills — 177 original + 49 upstream (Anthropic 8, Vercel 8, Superpowers 13, Prisma 11, MarketingSkills 8, Agentic SEO 1)
- **Method:** 10 parallel batches by category with disjoint directories; each skill read in full and every versioned claim, API signature, CLI command, config format, code example, and link checked against authoritative sources. Batch reports: `ai/phase3/batch-N-report.md`.
- **Evidence hierarchy:** official product docs > official API references > official GitHub repos / release notes > official migration guides > recognized standards (NIST, OWASP, W3C, IETF) > reputable secondary sources. AI content, blogs, and old tutorials were never treated as authoritative.
- **Fix policy:** verifiable errors in original skills were fixed in place. Upstream skills are imported verbatim and were audited only — their errors are recorded here with the upstream fix venue (see `ai/decisions/2026-11-20-upstream-verbatim.md`). Version information was added to skill bodies, not new frontmatter fields (see `ai/decisions/2026-11-20-phase3-version-metadata.md`).
- **Result:** 145 of 177 original skill files corrected (+1715/−507 lines across 147 files including the regenerated registry). Zero files under `skills/upstream/` modified.

## Summary counts

| Status | Count | Share |
|---|---|---|
| Verified | 204 | 90.3% |
| Verified with limitations | 16 | 7.1% |
| Needs correction | 6 | 2.7% |
| Unverified | 0 | 0% |
| Blocked | 0 | 0% |
| **Total** | **226** | **100%** |

| Source | Verified | With limitations | Needs correction | Total |
|---|---|---|---|---|
| original | 174 | 3 | 0 | 177 |
| anthropic | 7 | 0 | 1 | 8 |
| vercel | 3 | 2 | 3 | 8 |
| superpowers | 10 | 3 | 0 | 13 |
| prisma | 7 | 3 | 1 | 11 |
| marketingskills | 3 | 5 | 0 | 8 |
| agentic-seo | 0 | 0 | 1 | 1 |

| Category | Verified | With limitations | Needs correction | Total |
|---|---|---|---|---|
| core | 11 | 0 | 0 | 11 |
| architecture | 9 | 0 | 0 | 9 |
| frontend | 16 | 0 | 0 | 16 |
| backend | 13 | 0 | 0 | 13 |
| database | 14 | 0 | 0 | 14 |
| auth | 10 | 0 | 0 | 10 |
| security | 8 | 0 | 0 | 8 |
| infrastructure | 13 | 0 | 0 | 13 |
| testing | 8 | 0 | 0 | 8 |
| seo | 27 | 0 | 0 | 27 |
| content | 17 | 0 | 0 | 17 |
| media | 10 | 2 | 0 | 12 |
| metadata | 5 | 1 | 0 | 6 |
| performance | 8 | 0 | 0 | 8 |
| documentation | 5 | 0 | 0 | 5 |
| upstream | 30 | 13 | 6 | 49 |

"Verified" means the skill's technical claims were checked against authoritative sources and any errors found were fixed (originals) or none were found. No skill was marked Verified merely because its links work.

## Resolution of Phase 1 finding H-04

H-04 (High): the Next.js skill stated the outdated fetch-caching default ("cached unless opted out"). **Fixed in Phase 3 (batch 2):** `skills/frontend/nextjs/SKILL.md` now states fetch is NOT cached by default since Next.js 15, with the 14-vs-15 boundary, the opt-ins (`force-cache`, `next: { revalidate }`, `fetchCache`), and a Common Mistakes entry. Verified against current official Next.js docs.

## Major corrections to original skills

### Wrong defaults and removed features

- **nextjs** — fetch caching default corrected (H-04, above).
- **rate-limiting** — response-header section rewritten: the old header names are superseded; the current IETF draft (rev. 11) defines `RateLimit-Policy` / `RateLimit`.
- **mcp-development** — rewritten for MCP SDK v2 (stable since 2026-07-27).
- **helmet / security-headers** — Helmet's `hsts:` option was renamed `strictTransportSecurity`; the old name is silently ignored.
- **otplib / totp** — otplib v12→v13 API rewrite.
- **eslint / package-boundaries** — ESLint 10 removed eslintrc entirely (Feb 2026; v9 EOL Aug 2026); flat config only. Also fixed the wrong "deep imports defeat tree-shaking" claim.
- **faq-generation, seo-content-writing, keyword-to-content, faq-schema** — FAQ rich results retired for all sites (May 2026); HowTo deprecated (Sept 2023). Rules rewritten, not just dated.
- **hreflang, international-seo** — Search Console's International Targeting report was deprecated (Nov 2022); replaced with URL Inspection + crawler/dedicated-tool validation.
- **sitelinks / schema-jsonld** — sitelinks search box retired (Nov 2024); template and references removed.
- **twitter-cards, twitter-card-images, social-preview** — X Card Validator removed (2 Aug 2022); X card images are 2:1 (1200×600, not 1200×675); X intent URL is now `x.com/intent/post`.
- **fid / web-vitals** — FID retired (12 Mar 2024); replaced by INP in budgets and thresholds.

### Wrong code examples and config

- **docker** — broken multi-stage example: the runtime stage set `USER node` before `COPY` and `RUN npm ci`, but `/app` is root-owned, so the copies and install fail. Reordered (install as root, `COPY --chown=node:node`, then `USER node`).
- **jsonb / postgres-indexing** — wrong JSONB/GIN index example fixed.
- **mysql-upsert** — deprecated upsert syntax replaced with the row-alias form.
- **turborepo** — default concurrency is 10, not CPU count (official `turbo run` reference).
- **vercel-composition-patterns** — see Needs correction (upstream).
- **shadcn / tailwind** — Tailwind v4 theme fix (`@theme inline`).
- **astro** — `z` now imported from `astro/zod`.
- **react** — `useFormState` → `useActionState`.
- **hugo** — LibSass removed in v0.170.0.
- **github-actions** — actions @v4 → @v7 (Node 20 EOL Mar 2026).

### Wrong version claims (cross-cutting)

- **Node.js 26 LTS is the current line** (Active LTS 28 Oct 2026, supported to Apr 2029); Node 24 is in maintenance. Corrected in core, architecture, frontend, backend, infrastructure, and media skills that named Node 24 as current.
- **TypeScript 7.0 is current stable** (GA 8 Jul 2026, native Go compiler); 6.0 is the bridge release; 7.0 ships without a programmatic API until 7.1. "TypeScript 5.x" claims corrected.
- **pnpm 12 current, pnpm 10 unsupported** (12 stable Aug 2026; 11 supported to Apr 2027). Monorepo example pinned `pnpm@10` → `pnpm@12`; added pnpm 12 breaking changes and pnpm 11+ supply-chain defaults (`minimumReleaseAge`, `blockExoticSubdeps`, `allowBuilds`).
- **Corepack no longer bundled with Node 25+** — pnpm-workspaces advice to "use Corepack" would fail on current LTS; now says install it explicitly or install pnpm directly.
- **npm 12 is the current CLI** (blocks dependency install scripts by default) but Node still bundles npm 11.x.
- **OWASP Top 10:2025** (finalised Jan 2026) and **ASVS 5.0.0** (May 2025) supersede the 2021 / 4.0.3 editions.
- **NIST SP 800-63B-4:** 15-character minimum for single-factor passwords.
- **WebAuthn Level 3** (Recommendation 25 Aug 2026); **OAuth RFC 9700** (ROPC MUST NOT) and **RFC 10017**.
- **Prisma:** Prisma 8 is an RC, not the current default; Prisma 7 requires a driver adapter; `$use` removed; no MongoDB in Prisma 7; Prisma 6 support ended 2026-11-19.
- **MySQL/InnoDB default isolation is REPEATABLE READ**, not READ COMMITTED.
- **Vitest 5.x / Jest 30.x** current; **Playwright 1.65.1**; **Wrangler 4** (`--remote` for D1/KV/R2); **Durable Objects SQLite migration**; Cloudflare Page Rules deprecated; **OpenAPI 3.2**, **Zod 4.x**, **Apollo Server 5 / Yoga 6**, **tRPC 11.29**, **Hono 4.13**, **BullMQ 6.x**, **Sharp 0.35.x**.
- **YouTube thumbnails:** 3840×2160 now recommended (verified against YouTube Help 2026-11-20).
- **Responsive design:** 44×44 is WCAG AAA; AA minimum is 24×24.
- **Performance budgets:** vague "page interactive" target replaced with LCP 2.5s (p75) + INP <200ms.
- **SEO heuristics reframed as heuristics** (title ~60 chars, one H1, etc.); ranking promise removed from seo-migration; llms.txt v2; Google's May 2026 generative-AI guide.

## Needs correction — upstream skills (fix venue: upstream repo)

These 6 upstream skills contain errors SkillForge cannot fix in place (verbatim-import policy). Each should be reported upstream or fixed at the next import.

| Skill | Vendor | Error | Fix venue |
|---|---|---|---|
| `seo` | agentic-seo | Outdated FAQ rule contradicting marketingskills/schema (FAQ rich results retired for ALL sites 2026-05-07); "12 sub-skills" vs 15 present; literal placeholder links in `resources/skills/seo-geo.md`; retired sitelinks-search-box template in `resources/schema/templates.json`; only 3 of 19 files carry the required freshness comment (all 2026-02-07, >90 days old per the skill's own rule); E-E-A-T overstatement presented as a Google fact | agentic-seo repo |
| `web-artifacts-builder` | anthropic | Says "Stack: React 18" but the init script runs unpinned `pnpm create vite --template react-ts`, which installs React 19 today | github.com/anthropics/skills |
| `vercel-composition-patterns` | vercel | "Correct" example in AGENTS.md §2.3 calls `use(Composer.Context)` but the `Composer` object exports no `Context` member — the example does not run as written | github.com/vercel-labs/agent-skills |
| `vercel-react-best-practices` | vercel | 3 broken links in AGENTS.md (`./async-defer-await.md`, `./async-cheap-condition-before-await.md`, `./server-hoist-static-io.md`) — files live in `rules/` | github.com/vercel-labs/agent-skills |
| `vercel-react-view-transitions` | vercel | ~29 broken links in AGENTS.md to bare `css-recipes.md`, `patterns.md`, `troubleshooting.md`, `nextjs.md`, `implementation.md`, `../SKILL.md` — files live in `references/`; stale "React canary" framing (Next.js 16.4 ships stable React 19.3) | github.com/vercel-labs/agent-skills |
| `prisma-upgrade-v7` | prisma | "Latest stable Prisma ORM version: 7.6.0" is wrong — official release-status page lists 7.10.1; frontmatter metadata version also stale. Neon docs flag: Prisma 7.10+ creates `prisma7.config.ts` instead of `prisma.config.ts` | prisma repo |

## Verified with limitations — 16 skills

**Original (3) — all X/Twitter documentation gaps:**

| Skill | Limitation |
|---|---|
| `twitter-cards` | X removed its Cards docs; verified against an archived May 2025 reference. Re-check if X republishes Cards docs. |
| `twitter-card-images` | X docs unavailable; sizes verified against secondary sources and the archived reference. |
| `social-preview` | X docs unavailable; LinkedIn Post Inspector corroboration only. |

**Upstream (13):**

| Skill | Vendor | Limitation |
|---|---|---|
| `vercel-cli-with-tokens` | vercel | Pro-plan 10M CDN/Edge-requests figure matches Vercel's pricing page, but Vercel's Flat Rate CDN docs describe the included tier as 1M requests (reported Nov 2026) — docs discrepancy noted. |
| `vercel-optimize` | vercel | `vercel usage` is now grouped under `vercel billing usage` (changelog ~2026-11-19); old name still works as an alias. `docs-library.json` `lastVerified` is 2026-05-26 (~6 months old). |
| `executing-plans` | superpowers | Names `superpowers:test-driven-development` as a REQUIRED sub-skill and references `superpowers:systematic-debugging`; neither was imported. Import-scope gap (SkillForge decision, not an upstream error). |
| `using-superpowers` | superpowers | References unimported `superpowers:systematic-debugging`. Import-scope gap. |
| `writing-skills` | superpowers | Names unimported `superpowers:test-driven-development` as REQUIRED background; `references/anthropic-best-practices.md` has 16 broken relative links. |
| `prisma-compute` | prisma | Verified against Prisma 8 RC pins (rc.21/rc.23); official page now lists newer RCs (rc.34). Drift, not error — skill frames versions as time-sensitive. |
| `prisma-mongodb-upgrade` | prisma | Verified against `@prisma/orm-mongo` 8.0.0-rc.13; official page now lists rc.24. Prisma 8 still an RC. |
| `prisma-postgres-upgrade` | prisma | Pins `prisma 8.0.0-rc.27` / `@prisma/orm-postgres 8.0.0-rc.20`; current RCs are rc.34 / rc.24. The "latest pair does not work with the Composer version the Console's setup installs" claim may be stale — Prisma docs now say "Install both at latest; any two latest versions work together." |
| `ai-seo` | marketingskills | Brave Search confirmed on Anthropic's subprocessor list, but the pipeline is composite (Parallel Web Systems and turbopuffer also listed for web search as of 2026-10-24; image results from Bing). GPT-5.6 framing roughly right (GA 2026-07-09). |
| `competitor-profiling` | marketingskills | Related Skills reference unimported marketingskills siblings (e.g. competitors, content-strategy). Import-scope gap. |
| `cro` | marketingskills | Related Skills reference unimported siblings (ab-testing, conversion-tracking, attribution, etc.). Import-scope gap. |
| `link-building` | marketingskills | 6 broken relative links to `../../tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}.md` — the `tools/` directory was not imported. Validator warnings 4–9 confirmed genuine. Import-scope gap; the `tools/` import decision is a Phase 4/7 handoff. |
| `site-architecture` | marketingskills | Broken link `/features/analytics` (validator warning 10) — an illustrative example anchor, not a repo file. Low severity. |

## M-08 triage outcome (11 validator warnings)

The 11 pre-existing validator warnings (all upstream-only) were triaged during the batch-10 audit:

- **3 false positives** — legitimate prose (e.g. the word "TBD" in a superpowers skill).
- **1 borderline** — `ai-seo` at 500 vs 501 lines, a trailing-newline count artifact.
- **6 genuine** — the `link-building` `tools/` links (import-scope gap, see above).
- **1 trivial** — the `site-architecture` illustrative anchor.

M-08 is therefore **partially resolved**: the warnings are understood and classified; the 6 genuine ones disappear only if the marketingskills `tools/` directory is imported (decision deferred to Phase 4/7).

## Validation after Phase 3 fixes

All checks run by the coordinator on 2026-11-20 after all 10 batches completed:

| Check | Result |
|---|---|
| `npm test` (installer suite) | 62 pass, 0 fail |
| `npm run validate` | PASS with 11 warning(s) — the same 11 pre-existing upstream warnings, now triaged (M-08) |
| `npm run check:frontmatter` | PASS |
| `npm run check:links` (offline) | PASS — 347 unique external URLs listed (311 at v1.0.0 + 9 Phase 2 vendor docs + 27 added by Phase 3 batches) |
| `npm run check:links --online` | PASS — 347 unique external URLs verified (48 skipped: example domains / documented exceptions), 0 errors, ~4m30s |
| `npm run check:sources` | PASS |
| `npm run check:duplicates` | PASS |
| `npm run check:security` | PASS: no findings |
| `npm run registry` / `npm run report` | Regenerated; report: 177/177 planned original skills (100%), 226 total |

One regression found and fixed by the coordinator during close-out: `ai/phase3/batch-10-report.md` quoted the upstream skill's literal placeholder links, which the link checker parses as broken internal links (the checker does not skip inline code spans). The report was reworded to describe the placeholders instead of reproducing the link syntax. No skill files were affected.

## Per-skill status table

| Skill | Category | Source | Status | Notes |
|---|---|---|---|---|
| `dependency-management` | architecture | original | Verified | npm audit link updated from `docs.npmjs.com/cli/v11/...` to `/cli/v12/...` (npm 12 is the current CLI). Added version note to Prerequisites (pnpm 12 current,... |
| `domain-driven-design` | architecture | original | Verified | Nothing — no errors found |
| `microservices` | architecture | original | Verified | Nothing — no errors found |
| `modular-monolith` | architecture | original | Verified | Nothing — no errors found |
| `monorepo` | architecture | original | Verified | Prerequisites: "Node.js 24 LTS is the current line" → Node.js 26 LTS note (Active LTS 2026-10-28, supported to 2029-04-30; Node 24 maintenance to 2028-04-30;... |
| `package-boundaries` | architecture | original | Verified | Rephrased the incorrect "deep imports can defeat tree-shaking" claim — deep imports bypass the public contract and can pull in internal/unbundled modules. Ad... |
| `pnpm-workspaces` | architecture | original | Verified | Prerequisites: "Node.js 24 LTS is the current line" → Node.js 26 LTS note; added pnpm version range (12.x current, 11 supported to 2027-04-30, 10 unsupported... |
| `system-design` | architecture | original | Verified | Nothing — no errors found |
| `turborepo` | architecture | original | Verified | Fixed wrong claim "Parallelism defaults to the machine's CPU count" → defaults to 10 concurrent tasks (`--concurrency`; `100%` for all logical processors, or... |
| `auth-security` | auth | original | Verified | Added version notes: OWASP Top 10:2025 is current (Broken Access Control still A01); ASVS 5.0.0 (May 2025) is current, requirement numbering changed from 4.0.3 |
| `authentication` | auth | original | Verified | Password-length fix: "minimum 8 characters" corrected to 15 characters for single-factor passwords per NIST SP 800-63B-4 §3.1.1.2 (8 is the floor only for MF... |
| `authorization` | auth | original | Verified | Added version notes: Broken Access Control is A01 in the 2025 edition (SSRF folded in); ASVS 5.0.0 is current |
| `better-auth` | auth | original | Verified | Node fix: "Node.js 24 LTS is the current line" → Node.js 26 LTS is current (24 LTS also supported); CLI requires Node.js 22.12+. Version line: 1.7.x current ... |
| `jwt` | auth | original | Verified | Example hardened: `jwtVerify` call now passes `algorithms: ["HS256"]`, so the example actually pins the algorithm as the skill's own Implementation Standards... |
| `mfa` | auth | original | Verified | otplib example rewritten for v13: the v12 `authenticator` object API was removed in the v13 rewrite; example now uses `generateSecret()`, `generateURI({ issu... |
| `multi-tenancy` | auth | original | Verified | RLS example hardened: `current_setting('app.tenant_id')` → `current_setting('app.tenant_id', true)` so a missing tenant context fails closed (NULL → no rows)... |
| `oauth` | auth | original | Verified | Added RFC 9700 (BCP 240, Jan 2025) as the current security baseline in Official Documentation and References, and RFC 10017 (BCP, Aug 2026) for browser-based... |
| `rbac` | auth | original | Verified | Annotated NIST RBAC project link as archived (page states "ARCHIVED PROJECT… no longer being supported"); the reference standard is INCITS 359-2012 and is st... |
| `session-management` | auth | original | Verified | Added `__Host-` cookie-prefix guidance (binds the session cookie to one host; no Domain, Path=/, Secure required). Added NIST 800-63B-4 reauthentication boun... |
| `api-design` | backend | original | Verified | Fixed: OpenAPI link v3.1.0 → v3.2.0 (3.2.1 is the latest patch, September 2026, editorial only); added 3.2 feature note (streaming media types, QUERY method,... |
| `background-jobs` | backend | original | Verified | Fixed: added BullMQ 6.x version notes (6.7.8, November 19, 2026; 6.0.0 July 30, 2026): legacy repeatable jobs removed in v6 — scheduled work must use Job Sch... |
| `caching` | backend | original | Verified | No technical errors found. Added one clarification to Official Documentation: RFC 9111 obsoleted RFC 7234, so older tutorials citing RFC 7234 are out of date... |
| `graphql` | backend | original | Verified | Fixed: added versions — Apollo Server 5 (`@apollo/server`) is current and GA; Apollo Server 4 reached end-of-life on 2026-01-26 and the legacy `apollo-server... |
| `hono` | backend | original | Verified | Fixed: "TypeScript 5.x" → 7.x. Added version notes: Hono 4.13.x current (4.13.19, November 16, 2026); `@hono/zod-validator` 0.9.x supports Zod 4 (peer `zod ^... |
| `mcp-development` | backend | original | Verified | Major fix — SDK v1 → v2: the skill targeted the legacy v1 package `@modelcontextprotocol/sdk` (`@modelcontextprotocol/sdk/server/mcp.js`, `inputSchema` as a ... |
| `nodejs` | backend | original | Verified | Fixed: "Node.js 24 LTS (the current LTS line as of 2026-11-20)" — Node.js 26 is the current LTS line (LTS since October 2026); 24 and 22 remain supported LTS... |
| `package-development` | backend | original | Verified | Fixed: "TypeScript 5.x" → 7.x (Required Workflow). Added a TypeScript documentation link with a version note: 7.x current (7.0.2, August 2026); 6.0 last Java... |
| `queues` | backend | original | Verified | Fixed: added BullMQ 6.x version notes (same v6 breaking changes as `background-jobs`: repeatable jobs removed → Job Schedulers; `ioredis` optional peer depen... |
| `rate-limiting` | backend | original | Verified | Major fix — superseded header names: the skill presented `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` as "the standard `RateLimit-*` respons... |
| `rest-api` | backend | original | Verified | Fixed: OpenAPI link v3.1.0 → v3.2.0 with a 3.2 note. Fixed: "TypeScript 5.x" → 7.x in compatibility. Added version notes: Hono 4.13.x current; Zod 4.x (`zod@... |
| `sdk-development` | backend | original | Verified | Fixed: "TypeScript 5.x" → 7.x (compatibility, Prerequisites, docs, references); OpenAPI link v3.1.0 → v3.2.0 with a 3.2 note. Added a `Retry-After` bullet po... |
| `trpc` | backend | original | Verified | Fixed: "TypeScript 5.x" → 7.x (compatibility, Prerequisites, docs, references). Added version notes: tRPC 11.x current (11.29.0, November 17, 2026); the v11 ... |
| `article-writing` | content | original | Verified | None needed |
| `blog-writing` | content | original | Verified | Typo: "a ending" → "an ending" |
| `content-brief` | content | original | Verified | None needed |
| `content-localization` | content | original | Verified | ISO 639-2 → ISO 639-1 + ISO 3166-1 Alpha 2 (IANA registry link); added bidirectional hreflang requirement and note that Google does not use hreflang/lang for... |
| `content-refresh` | content | original | Verified | None needed |
| `content-repurposing` | content | original | Verified | None needed |
| `content-research` | content | original | Verified | None needed |
| `content-strategy` | content | original | Verified | None needed |
| `copywriting` | content | original | Verified | Added WCAG 2.2 version + Level AA contrast ratios (4.5:1 normal, 3:1 large) |
| `editorial-review` | content | original | Verified | None needed |
| `eeat-writing` | content | original | Verified | Added nuance: E-E-A-T itself is not a specific ranking factor; trust is the most important aspect |
| `fact-checking` | content | original | Verified | None needed |
| `faq-generation` | content | original | Verified | Added FAQ rich-result removal (May 7, 2026; docs removed June 2026) to Official Documentation, workflow step 8, Implementation Standards, Performance; noted ... |
| `human-editing` | content | original | Verified | None needed |
| `keyword-to-content` | content | original | Verified | Added HowTo/FAQ rich-result removal note (HowTo deprecated Sept 13, 2023; FAQ removed May 7, 2026; no need to proactively remove markup); annotated the "Sche... |
| `seo-content-writing` | content | original | Verified | Example title shortened to 52 chars to satisfy the under-60 rule; added FAQ schema caveat (no Google rich result since May 7, 2026) |
| `technical-writing` | content | original | Verified | "Node.js 24 (current LTS line)" → "Node.js 26 (current LTS line since 28 October 2026)"; added Node release-schedule compatibility note (24 Maintenance, 22 E... |
| `clean-code` | core | original | Verified | Nothing — no errors found |
| `code-review` | core | original | Verified | Nothing — no errors found |
| `debugging` | core | original | Verified | Nothing — no errors found |
| `design-patterns` | core | original | Verified | Nothing — no errors found |
| `engineering-standards` | core | original | Verified | Prerequisites example updated: Node.js 24 LTS → 26 LTS, TypeScript 5.x → 7.x, pnpm → 12. Added supported-version note: Node 26 LTS current (Active LTS 2026-1... |
| `performance` | core | original | Verified | Workflow target reworded from vague "page interactive in under 2.5 seconds" to "Largest Contentful Paint under 2.5 seconds (p75, real users)". Added INP unde... |
| `refactoring` | core | original | Verified | Nothing — no errors found |
| `security` | core | original | Verified | Added edition notes to Official Documentation: OWASP Top 10:2025 is current (announced Nov 2025, finalised Jan 2026; replaces 2021) with new A03 Software Sup... |
| `software-architecture` | core | original | Verified | Nothing — no errors found |
| `tdd` | core | original | Verified | Added supported-version note to Prerequisites: Vitest 5.x current (5.1.x, Nov 2026; requires Node.js 22.12+, dropped Node 20), Jest 30.x current (30.5.x, Sep... |
| `technical-decision-records` | core | original | Verified | Nothing — no errors found (the four-status limit is the skill's own stated convention, not a claim about the ADR standard) |
| `backup-recovery` | database | original | Verified | Added supported-version note (PostgreSQL 15–19, MySQL 8.4/9.7 LTS, MongoDB 7.0/8.0/8.3/9.0, SQLite 3.51) and a keep-the-backup-tool-at-the-server's-major-ver... |
| `connection-pooling` | database | original | Verified | Added supported-version note (PostgreSQL 15–19, MySQL 8.4/9.7 LTS). Added a PgBouncer pooling-mode caveat: in transaction pooling mode, session-level feature... |
| `database-design` | database | original | Verified | Added `CREATE EXTENSION IF NOT EXISTS citext;` to the schema example — `CITEXT` is not built in, so the example failed on an empty database, contradicting th... |
| `database-security` | database | original | Verified | (1) Fixed RLS example: `current_setting('app.tenant_id')` errors when the setting is unset; changed to `current_setting('app.tenant_id', true)` so the policy... |
| `drizzle` | database | original | Verified | (1) Qualified `db.batch`: it exists only on drivers that support batching (Cloudflare D1, libSQL, Neon HTTP, proxy drivers) and is not available on node-post... |
| `indexing` | database | original | Verified | Added version note and per-engine differences to Prerequisites: examples use PostgreSQL syntax; `INCLUDE` needs PostgreSQL 11+ and has no MySQL equivalent; `... |
| `migrations` | database | original | Verified | Added supported-version note (PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51, Prisma ORM 7, Drizzle ORM 0.45) and corrected the add-column-with-default gui... |
| `mongodb` | database | original | Verified | Added supported versions: 9.0 (current, to 31 Oct 2031), 8.3 and 8.0 (to 31 Oct 2029), 7.0 (to 31 Aug 2027); 8.2 EOL 31 Jul 2026, 6.0 EOL 31 Jul 2025. No err... |
| `mysql` | database | original | Verified | Fixed deprecated upsert example: `ON DUPLICATE KEY UPDATE name = VALUES(name)` uses the `VALUES()` function, deprecated since MySQL 8.0.20. Rewrote with the ... |
| `postgresql` | database | original | Verified | Fixed incorrect JSONB example: the old example put a GIN index on `(metadata -> 'customer_id')` and queried with `metadata ->> 'customer_id' = $1` — a GIN in... |
| `prisma` | database | original | Verified | Major corrections — the version claims were wrong. (1) "Prisma ORM 8 is the current default for new applications (Prisma 6/7 remain supported)" was false on ... |
| `sql-optimization` | database | original | Verified | Added supported-version note to Prerequisites (PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51). No errors found in the existing content. |
| `sqlite` | database | original | Verified | Added current release (3.51.3, 13 Mar 2026) with the WAL-reset corruption-bug fix and a `SELECT sqlite_version();` check; pinned `STRICT` tables to SQLite 3.... |
| `transactions` | database | original | Verified | Fixed incorrect default-isolation claim: workflow step 3 said the engine default is "usually read committed". MySQL/InnoDB defaults to REPEATABLE READ, not R... |
| `api-documentation` | documentation | original | Verified | Links verified live (GraphQL best-practices page read in full). Added: OpenAPI 3.2.1 is current (3.2.0, September 2025); 3.1.x/3.0.x remain in use; do not wr... |
| `changelog-management` | documentation | original | Verified | No errors found; format and rules match the specs. Added current spec versions: Keep a Changelog 1.1.0, Semantic Versioning 2.0.0, Conventional Commits 1.0.0 |
| `developer-experience` | documentation | original | Verified | No errors found and no changes needed. This is a process skill with no version-specific technical claims; all three linked docs (Diátaxis, Write the Docs, Go... |
| `readme-engineering` | documentation | original | Verified | Guidance confirmed correct against GitHub's docs. Added verified GitHub facts: a README is recognized from `.github/`, the repository root, or `docs/` (in th... |
| `technical-documentation` | documentation | original | Verified | No errors found and no changes needed. Process skill with no version-specific technical claims; the Diátaxis quadrant definitions match the official site and... |
| `accessibility` | frontend | original | Verified | No errors found. Strengthened one bullet with the verified criterion number: touch-target minimum is WCAG 2.2 AA success criterion 2.5.8 (24×24 CSS px, with ... |
| `astro` | frontend | original | Verified | Fixed: example imported `z` from `astro:content` — deprecated in Astro 6.0; now imports `z` from `astro/zod` per official docs, with a new Implementation Sta... |
| `css` | frontend | original | Verified | No technical errors found. Added a short note to Official Documentation: CSS has no version numbers — modules advance independently, so readiness is a browse... |
| `frontend-performance` | frontend | original | Verified | No errors found. Added the verified assessment basis to the CWV bullet: thresholds are assessed at the 75th percentile of real-user field data (CrUX) over a ... |
| `html` | frontend | original | Verified | No technical errors found. Added a short note to Official Documentation: HTML is a living standard with no version numbers (no "HTML6"); newer elements/attri... |
| `hugo` | frontend | original | Verified | Fixed: skill required "the extended edition for Sass/SCSS support" — the extended edition was removed in Hugo v0.170.0 (2026-11-13) along with LibSass (depre... |
| `javascript` | frontend | original | Verified | No technical errors found. Only change: Node line updated (see below) |
| `modern-css` | frontend | original | Verified | No technical errors found. All claims are correctly stated with support caveats (`@scope` "where supported", `light-dark()` fallback required, Can I Use chec... |
| `nextjs` | frontend | original | Verified | H-04 FIXED: the skill claimed "`fetch` requests in server components are cached unless opted out" — the Next.js 14 behavior. Since Next.js 15, `fetch` is not... |
| `react` | frontend | original | Verified | Added version notes: React 19.2 (Oct 2025) added `<Activity>` and `useEffectEvent` (with rules: only called inside effects, never passed as props); `useActio... |
| `responsive-design` | frontend | original | Verified | Fixed attribution: the skill said 44×44 CSS px touch targets were "(WCAG guidance)". The WCAG 2.2 AA minimum is 24×24 (SC 2.5.8); 44×44 is the AAA enhanced t... |
| `semantic-html` | frontend | original | Verified | No technical errors found. No changes made |
| `shadcn-ui` | frontend | original | Verified | Fixed broken Tailwind v4 theme example: the skill defined bare `:root` variables with no `@theme inline` mapping — in Tailwind v4 that generates no `bg-backg... |
| `tailwind-css` | frontend | original | Verified | No technical errors found. Dark-mode default (`prefers-color-scheme`, `@custom-variant dark (&:where(.dark, .dark *))` for a class toggle), trailing-`!` impo... |
| `typescript` | frontend | original | Verified | Major-version fix: skill said "TypeScript 5.x (current major line)" — the current major is 7.x (7.0 released 2026-07-08, native Go port, same `typescript` pa... |
| `ui-design` | frontend | original | Verified | No technical errors found (design guidance, no version-specific claims; the WCAG AA contrast values it cites were verified under `accessibility`). No changes... |
| `ci-cd` | infrastructure | original | Verified | None — no errors found; no versioned claims in this skill |
| `cloudflare` | infrastructure | original | Verified | Page Rules are deprecated: frontmatter description now says "redirect, cache, and configuration rules" instead of "page rules"; added a deprecation note + mi... |
| `cloudflare-d1` | infrastructure | original | Verified | Wrangler 4 defaults D1 commands to local mode: `wrangler d1 execute` for production inspection now reads `wrangler d1 execute --remote`, with a Prerequisites... |
| `cloudflare-kv` | infrastructure | original | Verified | Added Wrangler 4 note: `wrangler kv` commands default to local in v4 (remote in v3); `--remote` is required for the live namespace |
| `cloudflare-queues` | infrastructure | original | Verified | Fixed a wrong claim: without a dead-letter queue, failed messages do not "retry forever" — after `max_retries` (default 3) they are discarded. Reworded the C... |
| `cloudflare-r2` | infrastructure | original | Verified | Added Wrangler 4 note: `wrangler r2 object` commands default to local in v4; `--remote` is required for the live bucket |
| `cloudflare-workers` | infrastructure | original | Verified | Updated the stale "Node.js 24 is current" claim: 22, 24, and 26 are the active LTS lines as of 2026-11-20, 26 ("Lithium") is the newest, 20 is EOL (Mar 2026)... |
| `deployment` | infrastructure | original | Verified | The rollback example only showed redeploying an old commit, contradicting the skill's own "prefer the platform's rollback feature" rule. Rewrote it to lead w... |
| `docker` | infrastructure | original | Verified | Fixed a broken example: the runtime stage set `USER node` before `COPY` and `RUN npm ci`, but `/app` is root-owned, so the copies and the install fail as use... |
| `durable-objects` | infrastructure | original | Verified | Fixed API drift: workflow/standards/checklist said the constructor takes `state` and state lives in `state.storage` (the pre-base-class API) while the exampl... |
| `github-actions` | infrastructure | original | Verified | Examples used `actions/checkout@v4` / `actions/setup-node@v4`, which run on Node.js 20 (EOL Mar 2026). Bumped all three uses to `@v7` (current: setup-node v7... |
| `observability` | infrastructure | original | Verified | None — no errors found; no versioned claims in this skill |
| `vercel` | infrastructure | original | Verified | Added a version note: Node.js 26.x is the default for new projects (GA 2026-10-29); 24.x/22.x also available; Node.js 20 deprecated 2026-10-01 (new deploymen... |
| `ai-image-generation` | media | original | Verified | Added compatibility note: model names/capabilities change frequently; verify current model in linked docs, record exact tool+model version |
| `blog-featured-images` | media | original | Verified | Added Sharp 0.35.x API version note |
| `brand-visual-consistency` | media | original | Verified | Added WCAG 2.2 version + concrete AA ratios (4.5:1 normal, 3:1 large, incl. large-text px thresholds) |
| `image-accessibility` | media | original | Verified | Added WCAG 2.2 version + criteria (1.1.1, 1.4.3, 1.4.11) and ratios; noted WCAG 3.0 is still a draft; added contrast requirement for text in images |
| `image-compression` | media | original | Verified | Added Sharp 0.35.x + ImageMagick 7 (`magick`; v6 `convert` not available by default on v7) compatibility note |
| `image-format-conversion` | media | original | Verified | Added browser-support note: WebP ~97% (all current browsers, Safari 14+); AVIF Baseline Jan 2024 (Chrome 85+, Firefox 93+, Safari 16+, Edge 121+, ~94–96%); J... |
| `image-prompt-engineering` | media | original | Verified | Added model-version compatibility note (prompt handling changes per model release; record tool+version) |
| `infographic-generation` | media | original | Verified | None needed |
| `og-image-generation` | media | original | Verified | Fixed false attribution ("Open Graph protocol documents" → Meta's documented recommendation); added Meta limits (min 200x200, large preview 600x315, max 8 MB... |
| `social-preview` | media | original | Verified with limitations | Named official debuggers (Meta Sharing Debugger link, LinkedIn Post Inspector); added X Card Validator retirement note and post-composer preview method; adde... |
| `twitter-card-images` | media | original | Verified with limitations | Corrected 1200x675 (16:9) → 1200x600 (2:1) throughout incl. frontmatter description; fixed OG-reuse claim (1200x630 loses only ~15 px); added limits (min 300... |
| `youtube-thumbnails` | media | original | Verified | Corrected to YouTube's current recommendation: 3840x2160 videos, 2160x3840 Shorts, min 640 px, JPG/PNG, 2 MB mobile / 50 MB desktop (10 MB podcasts mobile), ... |
| `dynamic-metadata` | metadata | original | Verified | Framework versions confirmed current (Next.js 16.4.6, Astro 7.4.x as of November 2026). Added version-specific difference: `generateMetadata` is App Router o... |
| `metadata-validation` | metadata | original | Verified | Checks and examples confirmed correct. Added: Facebook/LinkedIn debuggers require a platform login; for X, use the post composer — X has no working card vali... |
| `open-graph` | metadata | original | Verified | Required-vs-recommended fixed: the skill listed all five tags as required; per ogp.me the four required properties are `og:title`, `og:type`, `og:image`, `og... |
| `seo-metadata` | metadata | original | Verified | Core guidance confirmed correct against Google's docs. Added: `X-Robots-Tag` header for non-HTML resources; retired directives `noarchive`, `nocache`, `nosit... |
| `social-sharing` | metadata | original | Verified | Facebook/LinkedIn/mailto intents confirmed correct. Fixed: X intent URL updated from `twitter.com/intent/tweet` to the current canonical `x.com/intent/post` ... |
| `twitter-cards` | metadata | original | Verified with limitations | Major corrections — the skill's testing workflow was outdated: (1) X removed the Card Validator preview on 2 August 2022; the URL now redirects to a login sc... |
| `bundle-optimization` | performance | original | Verified | esbuild commands confirmed correct. Added esbuild [Analyze](https://esbuild.github.io/analyze/) link and current-line note (0.28.x as of mid-2026), plus the ... |
| `caching-strategy` | performance | original | Verified | Headers and Express example confirmed correct. Added: RFC grounding (RFC 9111 obsoletes RFC 7234 — do not cite it; `immutable` is RFC 8246; `stale-while-reva... |
| `core-web-vitals` | performance | original | Verified | Thresholds confirmed correct. Replaced bare `web.dev/` links with the verified [Web Vitals article](https://web.dev/articles/vitals) and the PSI About page f... |
| `image-optimization` | performance | original | Verified | Sharp example and format guidance confirmed correct; MDN link verified live. Added browser-support notes (AVIF Chrome 85+/Firefox 93+/Safari 16+; WebP Safari... |
| `javascript-optimization` | performance | original | Verified | Yield API corrected: the skill presented `scheduler.postTask` as the yielding mechanism. `scheduler.yield()` is the dedicated yield API (Chrome 129+, Firefox... |
| `lighthouse` | performance | original | Verified | CLI bug fixed: the example passed `--output-path` twice (once per format). `--output-path` is a single string; with multiple outputs it is a base path and Li... |
| `pagespeed-insights` | performance | original | Verified | API endpoint and response parsing confirmed correct. Added: API is v5; Lighthouse score bands (90+ good, 50–89 needs improvement, below 50 poor) per PSI docs... |
| `web-performance-audit` | performance | original | Verified | No errors found. Added Node 24/26 LTS note and pointed the web.dev References link at the verified Web Vitals article |
| `csrf-protection` | security | original | Verified | Fixed stale MDN URL (2 places): `/docs/Web/HTTP/Headers/Set-Cookie` → current `/docs/Web/HTTP/Reference/Headers/Set-Cookie`. Token example and guidance other... |
| `dependency-security` | security | original | Verified | Added OWASP Top 10:2025 note: dependency risk is now A03 Software Supply Chain Failures, expanded from the 2021 "Vulnerable and Outdated Components" category... |
| `owasp` | security | original | Verified | Updated to Top 10:2025: full A01–A10 list added to Official Documentation (announced Nov 2025, finalized Jan 2026); fixed example "Vulnerable Components" → "... |
| `secrets-management` | security | original | Verified | Updated stale Top 10 terminology: "sensitive data exposure" (2017 name) → Cryptographic Failures (A04 in the 2025 edition). Vault link verified live |
| `secure-headers` | security | original | Verified | Fixed broken Helmet example: `hsts: { maxAge, includeSubDomains }` → `strictTransportSecurity: { ... }` — the `hsts` option name was removed in Helmet 4 and ... |
| `security-auditing` | security | original | Verified | Added Top 10:2025 currency note in Official Documentation and References |
| `sql-injection-prevention` | security | original | Verified | Added Top 10:2025 annotation: Injection is A05 in the current edition. No technical errors found; examples verified correct |
| `xss-prevention` | security | original | Verified | Added Top 10:2025 annotation: Injection (XSS) is A05 in the current edition. No technical errors found; DOMPurify example (`ALLOWED_TAGS`/`ALLOWED_ATTR`) and... |
| `aeo-optimization` | seo | original | Verified | 40-60 word answers reframed as an industry heuristic (workflow, standards, checklist); added FAQ (removed May 2026) and HowTo (deprecated Sep 2023) retiremen... |
| `canonical-management` | seo | original | Verified | Fixed the "canonical tags take precedence in practice" claim: replaced with Google's documented signal-strength order (redirects strongest, then rel="canonic... |
| `competitor-analysis` | seo | original | Verified | None — no errors found. Added a guidance-as-of line restating that competitor figures are third-party estimates |
| `content-gap-analysis` | seo | original | Verified | None — no errors found. Added a guidance-as-of line restating the estimates rule |
| `eeat` | seo | original | Verified | None — no errors found; the "not a score" framing was already correct. Added the "Creating helpful content" deep link and a guidance-as-of line |
| `geo-optimization` | seo | original | Verified | 40-60 word answers reframed as an industry heuristic; "AI engines favor current information" labeled as an industry observation; linked Google's May 2026 gen... |
| `hreflang` | seo | original | Verified | Fixed a dead feature: workflow step 8 told users to check Search Console's International Targeting report and the checklist expected "no hreflang errors" in ... |
| `image-seo` | seo | original | Verified | Reframed the 125-character alt-text limit as a screen-reader convention, not a Google rule; fixed "Search Console's image reports" (no such report — image pe... |
| `internal-linking` | seo | original | Verified | "Within three clicks" reframed as an industry rule of thumb (Google publishes no click-depth limit) in the workflow, standards, and docs note; the nofollow r... |
| `international-seo` | seo | original | Verified | Added that Google states no URL structure is inherently better for ranking (the order reflects maintenance cost, not a ranking preference); noted Google dete... |
| `keyword-clustering` | seo | original | Verified | None — no errors found; judgment calls were already labeled as such. Added a guidance-as-of line noting SERP-overlap clustering is an industry method |
| `keyword-research` | seo | original | Verified | None — no errors found; estimates were already labeled with sources. Added a guidance-as-of line restating the estimates rule |
| `llm-seo` | seo | original | Verified | Added Google's AI optimization guide; added a Google-Extended note (robots.txt product token, not a crawler; controls Gemini training + grounding; does not a... |
| `llms-txt` | seo | original | Verified | Substantial v2 update: fixed "do not place it in a subdirectory" (v2 allows subpaths, covering pages under that path); fixed the garbled Optional-section lin... |
| `local-seo` | seo | original | Verified | None — no errors found; GBP and schema guidance checked out. Added a guidance-as-of line |
| `off-page-seo` | seo | original | Verified | None — no errors found; rel attribute guidance matches Google's docs. Added a guidance-as-of line restating that third-party authority scores are private-ind... |
| `on-page-seo` | seo | original | Verified | Title "under roughly 60 characters" and meta description "150-160 characters" reframed as display heuristics (Google truncates by pixel width; no character l... |
| `programmatic-seo` | seo | original | Verified | None — no errors found; the quality bar was already sound. Added the spam-policy name and date ("scaled content abuse", strengthened March 2024) and a guidan... |
| `schema-jsonld` | seo | original | Verified | Description changed (it implied FAQ markup earns rich results). Added a Purpose note on the FAQ (May 2026) and HowTo (Sep 2023) retirements; removed FAQ/how-... |
| `search-console` | seo | original | Verified | None — no errors found; retention, coverage labels, and verification guidance checked out. Added the Generative AI performance report and AI Mode counting to... |
| `search-intent` | seo | original | Verified | Softened "matching it is the single most important factor in whether a page can rank" / "will not rank no matter how well optimized" to "one of the most impo... |
| `seo-audit` | seo | original | Verified | None — no errors found. One example-table wording tweak: "Meta descriptions over 160 chars" now reads "over ~160 chars (display heuristic)". Added a guidance... |
| `seo-migration` | seo | original | Verified | Description changed: it promised migrations "without losing rankings or traffic" — reworded to "aiming to preserve as much search visibility as possible". Ad... |
| `serp-analysis` | seo | original | Verified | None — no errors found; difficulty-from-evidence (not tool scores) was already correct. Added a guidance-as-of line |
| `sitemap-robots` | seo | original | Verified | Fixed "Google ignores them for ranking" to "Google ignores `<priority>` and `<changefreq>` entirely"; added that Google uses `<lastmod>` only when consistent... |
| `structured-data` | seo | original | Verified | Added the retired-features list to Prerequisites and Best Practices (FAQ May 2026, HowTo Sep 2023, sitelinks search box Nov 2024, Sep 2025 batch) plus the br... |
| `technical-seo` | seo | original | Verified | Added the actual Core Web Vitals "good" thresholds to Implementation Standards (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, 75th percentile over 28 days of CrUX fiel... |
| `accessibility-testing` | testing | original | Verified | Added a version note: WCAG 2.2 is the current version of the guidelines; WCAG 3.0 remains a draft, not a conformance target |
| `e2e-testing` | testing | original | Verified | None — no errors found |
| `integration-testing` | testing | original | Verified | None — no errors found; no versioned claims in this skill |
| `performance-testing` | testing | original | Verified | None — no errors found |
| `playwright` | testing | original | Verified | Updated the stale "Node.js 24 is current LTS" claim: use Node.js 22, 24, or 26; Playwright 1.65.x is current (1.65.1, 2026-11-13) and no longer tests on Node... |
| `regression-testing` | testing | original | Verified | None — no errors found; no versioned claims in this skill |
| `unit-testing` | testing | original | Verified | Added a version pointer in Prerequisites: Vitest 5.x is the current major (Node.js >= 22.12, Vite >= 6.4); see the `vitest` skill for details |
| `vitest` | testing | original | Verified | Updated the stale Node.js claim and added full version support: Vitest 5.x current (5.0 released 2026-09-03; requires Node.js >= 22.12, Vite >= 6.4; Vite is ... |
| `ai-seo` | upstream | marketingskills | Verified with limitations | No flat errors. Limitations: (1) Brave Search is on Anthropic's subprocessor list as "Web Search" since 2025-03-19 (confirmed), but the pipeline is composite... |
| `analytics` | upstream | marketingskills | Verified | None. |
| `brainstorming` | upstream | superpowers | Verified | None. |
| `brand-guidelines` | upstream | anthropic | Verified | None. Note: Anthropic publishes no separate public brand guide; the first-party skill in github.com/anthropics/skills is itself the authoritative source. |
| `competitor-profiling` | upstream | marketingskills | Verified with limitations | No content errors. Limitation (import-scope gap): Related Skills sections reference unimported marketingskills siblings (e.g. competitors, content-strategy).... |
| `copy-editing` | upstream | marketingskills | Verified | None. |
| `cro` | upstream | marketingskills | Verified with limitations | No content errors. Limitation (import-scope gap): Related Skills reference unimported siblings (ab-testing, conversion-tracking, attribution, etc.). |
| `deploy-to-vercel` | upstream | vercel | Verified | None. |
| `diagnosing-superpowers` | upstream | superpowers | Verified | None. |
| `dispatching-parallel-agents` | upstream | superpowers | Verified | None. |
| `doc-coauthoring` | upstream | anthropic | Verified | None (validator warning is a false positive — see §Validator warnings). |
| `executing-plans` | upstream | superpowers | Verified with limitations | No content errors. Limitation (import-scope gap): names `superpowers:test-driven-development` as a REQUIRED sub-skill/background and references `superpowers:... |
| `finishing-a-development-branch` | upstream | superpowers | Verified | None. |
| `frontend-design` | upstream | anthropic | Verified | None. |
| `link-building` | upstream | marketingskills | Verified with limitations | No content errors. Limitation (import-scope gap, real): 6 broken relative links to `../../tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}... |
| `mcp-builder` | upstream | anthropic | Verified | None. |
| `prisma-cli` | upstream | prisma | Verified | None. |
| `prisma-client-api` | upstream | prisma | Verified | None. |
| `prisma-compute` | upstream | prisma | Verified with limitations | No errors. Limitation: verified against Prisma 8 RC pins (rc.21/rc.23, Composer 0.30.0); official page now lists newer RCs (prisma 8.0.0-rc.34). Skill frames... |
| `prisma-database-setup` | upstream | prisma | Verified | None. |
| `prisma-driver-adapter-implementation` | upstream | prisma | Verified | None. |
| `prisma-mongodb-upgrade` | upstream | prisma | Verified with limitations | No errors. Limitation: verified against `@prisma/orm-mongo` 8.0.0-rc.13; official page now lists rc.24. Prisma 8 is still an RC (GA was "expected in October ... |
| `prisma-orm-setup` | upstream | prisma | Verified | None. |
| `prisma-postgres` | upstream | prisma | Verified | None. |
| `prisma-postgres-setup` | upstream | prisma | Verified | None. |
| `prisma-postgres-upgrade` | upstream | prisma | Verified with limitations | No errors. Limitations: pins `prisma 8.0.0-rc.27` / `@prisma/orm-postgres 8.0.0-rc.20` "today"; current RCs are rc.34 / rc.24. The claim that "the latest pai... |
| `prisma-upgrade-v7` | upstream | prisma | Needs correction | Stale version claim: "Latest stable Prisma ORM version: 7.6.0" is wrong — the official release-status page lists `@prisma/client` latest at 7.10.1 (checked 2... |
| `receiving-code-review` | upstream | superpowers | Verified | None. |
| `requesting-code-review` | upstream | superpowers | Verified | None. |
| `schema` | upstream | marketingskills | Verified | None. (This skill is correct where agentic-seo/seo contradicts it on FAQ — see below.) |
| `seo` | upstream | agentic-seo | Needs correction | Multiple errors: (1) Outdated FAQ rule (Critical Rule 2 + `resources/references/schema-types.md:50-52`): "FAQPage schema is limited to government and healthc... |
| `site-architecture` | upstream | marketingskills | Verified with limitations | No content errors. Limitation: broken link `/features/analytics` (validator warning 10) — an illustrative example anchor in the Internal Linking Strategy tab... |
| `skill-creator` | upstream | anthropic | Verified | None. |
| `subagent-driven-development` | upstream | superpowers | Verified | None. |
| `theme-factory` | upstream | anthropic | Verified | None. |
| `using-git-worktrees` | upstream | superpowers | Verified | None. |
| `using-superpowers` | upstream | superpowers | Verified with limitations | No content errors. Limitation (import-scope gap): references `superpowers:systematic-debugging`, which was not imported. |
| `vercel-cli-with-tokens` | upstream | vercel | Verified with limitations | No errors. Limitation / documented discrepancy: the skill's Pro-plan 10M CDN/Edge-requests figure matches Vercel's pricing page, but Vercel's Flat Rate CDN d... |
| `vercel-composition-patterns` | upstream | vercel | Needs correction | Bad code example in AGENTS.md §2.3: the "Correct" example calls `use(Composer.Context)` but the `Composer` object defined in the examples (line 224) exports ... |
| `vercel-optimize` | upstream | vercel | Verified with limitations | No errors. Limitations: (1) `vercel usage` is now grouped under `vercel billing usage` (Vercel changelog, ~2026-11-19); the old name still works as an alias,... |
| `vercel-react-best-practices` | upstream | vercel | Needs correction | 3 broken links in AGENTS.md: `./async-defer-await.md`, `./async-cheap-condition-before-await.md`, `./server-hoist-static-io.md` — the files live in `rules/`,... |
| `vercel-react-view-transitions` | upstream | vercel | Needs correction | ~29 broken links in AGENTS.md to bare `css-recipes.md`, `patterns.md`, `troubleshooting.md`, `nextjs.md`, `implementation.md`, `../SKILL.md` — the files live... |
| `verification-before-completion` | upstream | superpowers | Verified | None. |
| `web-artifacts-builder` | upstream | anthropic | Needs correction | Stale React version: SKILL.md:16 says "Stack: React 18 + …" but the init script runs unpinned `pnpm create vite --template react-ts`, which installs React 19... |
| `web-design-guidelines` | upstream | vercel | Verified | None. |
| `webapp-testing` | upstream | anthropic | Verified | None technical. Trivial typo only: "abslutely" (SKILL.md, "…is abslutely necessary"). Fix venue: github.com/anthropics/skills. |
| `writing-guidelines` | upstream | vercel | Verified | None. |
| `writing-plans` | upstream | superpowers | Verified | None (validator warning is a false positive — see M-08 triage above). |
| `writing-skills` | upstream | superpowers | Verified with limitations | No errors in SKILL.md. Limitations: (1) names `superpowers:test-driven-development` as REQUIRED background; not imported. (2) `references/anthropic-best-prac... |

## Audit limitations

- **X/Twitter documentation is unavailable.** X removed its Cards developer docs; the three affected original skills (`twitter-cards`, `twitter-card-images`, `social-preview`) were verified against an archived May 2025 reference and secondary sources. If X republishes Cards docs, re-check these skills directly.
- **Prisma 8 is a moving target.** Prisma 8 was still an RC on 2026-11-20 (GA was "expected in October 2026" but not reached). The three upstream Prisma upgrade skills pin RC versions that drift within days; they are marked Verified with limitations for that reason. When Prisma 8 reaches GA, the Prisma skills need a fresh pass.
- **Version claims are a snapshot.** Every version number in this audit was correct on 2026-11-20. Frameworks and CLIs move fast; skills record `last_verified` precisely so future audits can tell what is stale.
- **Upstream skills were audited, not fixed.** Their 6 Needs-correction items and 13 limitations stay open until the upstream repos fix them or SkillForge re-imports corrected versions.
- **Import-scope gaps are SkillForge decisions, not upstream errors.** The missing superpowers skills (test-driven-development, systematic-debugging), the unimported marketingskills siblings, and the marketingskills `tools/` directory are import decisions recorded for Phase 4/7.
- **Code examples were checked against docs, not executed.** Examples were verified for API correctness against official references; the audit did not run every example in a live environment.

## Batch reports

| Batch | Scope | Skills | Report |
|---|---|---|---|
| 1 | core + architecture | 20 | `ai/phase3/batch-1-report.md` |
| 2 | frontend | 16 | `ai/phase3/batch-2-report.md` |
| 3 | backend | 13 | `ai/phase3/batch-3-report.md` |
| 4 | database | 14 | `ai/phase3/batch-4-report.md` |
| 5 | auth + security | 18 | `ai/phase3/batch-5-report.md` |
| 6 | infrastructure + testing | 21 | `ai/phase3/batch-6-report.md` |
| 7 | seo | 27 | `ai/phase3/batch-7-report.md` |
| 8 | performance + metadata + documentation | 19 | `ai/phase3/batch-8-report.md` |
| 9 | content + media | 29 | `ai/phase3/batch-9-report.md` |
| 10 | upstream (audit-only) | 49 | `ai/phase3/batch-10-report.md` |

## Sign-off

- **Phase 3 status:** Verified. All 226 skills audited; 145 original skill files corrected; full validation suite passing; results recorded in `ai/test-results/`; limitations documented above.
- **Phase 1 findings closed by this phase:** H-04 (fixed); M-08 (triaged — partially resolved, import-scope gap remains); M-01 (audit data now exists; registry `status` semantics change deferred to Phase 9).
