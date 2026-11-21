# Stage C — Regression Review of the 145 Corrected v1.0.0 Skills + L-Prisma Research

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; no push, merge, or PR)
- **Phase 3 commit reviewed:** `cabb9cf` ("Phase 3: technical accuracy audit of all 226 skills")
- **Scope:** the 145 corrected original (v1.0.0) skills only. The 51 new Phase 4 skills were NOT audited (other agents own them). Nothing under `skills/upstream/` was edited.
- **Result:** 5 regressions/imprecisions found, all fixed in place (9 files). No lost content, broken links, mangled examples, or over-corrections found beyond these.

## 1. Review method and coverage

### (a) Full diff scan — 145/145 files

- Baseline: `git show cabb9cf -- skills/` — the commit touched 145 original skill files, +1,693/−485 lines in `skills/` alone (0 upstream files). The +1,715/−507 figure in the audit includes the regenerated registry (+22/−22), matching issue A-21.
- Reviewed **all 398 hunks** (5,834 diff lines): every one of the **483 non-blank deleted lines** and all **1,650 non-blank added lines**.
- Automated checks on the diff: no file had a net line loss; no TODO/FIXME/placeholder text in added lines; apparent unbalanced-backtick hits were benign multi-line code spans/fences.
- Cross-skill consistency check on shared claims (Node 26 LTS dates, TypeScript 7.0, pnpm 12, OWASP 2025, Prisma 7.10.1, FAQ removal date, Wrangler 4, BullMQ 6, OpenAPI 3.2, etc.): all consistent except finding F1 (twitter-cards) and F5 (Node 20 EOL month).

### (b) Deep-checks against CURRENT official docs — 9 skills read in full, 2 verified via web

Read in full at HEAD and checked claim-by-claim against current official documentation:

| Skill | What was verified |
|---|---|
| `frontend/nextjs` | Fetch uncached by default since 15; opt-ins; Cache Components; `proxy` Node.js-only, edge not supported; Turbopack default in 16; async request APIs |
| `security/secure-headers` | Helmet 8.x current; HSTS option name; default `max-age` 31536000 |
| `backend/mcp-development` | MCP SDK v2 stable line; `server.registerTool`; split packages; Zod v4 |
| `auth/mfa` | otplib v13 API (`generateSecret`, `generateURI`, async `verify` returning a result object) |
| `database/prisma` | Prisma 7.10.1 stable; Prisma 8 RC; contract; driver adapter; `$use` removed in 7; Prisma 6 EOL |
| `backend/rate-limiting` | IETF draft rev. 11 `RateLimit-Policy`/`RateLimit` fields; `quota-exceeded` problem type and `violated-policies` extension defined by the same draft |
| `metadata/twitter-cards` | X large-card image size vs the documented 2:1 spec — **F1** |
| `media/twitter-card-images` | X 2:1 spec (1200x600), limits, formats — the correct canonical version |
| `media/social-preview` | Retired X Card Validator; per-platform cache handling |

Verified against official docs via web (Phase 3 claims only; files not read in full):

| Skill | What was verified |
|---|---|
| `media/youtube-thumbnails` | YouTube Help: 3840x2160 recommended, min width 640 px, size limits, verified account required — the Phase 3 change was correct, not an over-correction |
| `seo/llms-txt` | llms.txt v2 (10 Aug 2026): subpath files, most-specific-wins, `rel="alternate"`/`rel="describedby"`, `## Optional` convention-only |

Also verified via web during the diff scan (no regression): OWASP Top 10:2025 list (exact), FAQ rich-results removal timeline (7 May 2026; docs removed June 2026; Search Console API August 2026), Turborepo CVE-2026-45772 (fixed in 2.9.14; `--affected` equivalence).

### (c) Spot-check sample — 10/10 skills read in full

`infrastructure/docker`, `infrastructure/durable-objects`, `database/mysql`, `database/drizzle`, `frontend/typescript`, `testing/vitest`, `performance/lighthouse`, `frontend/hugo`, `infrastructure/github-actions`, `backend/api-design`. All verified clean except the F5 date error, which appears in three of them (docker, github-actions, vitest).

**Total full-file reads: 19** (9 deep-checks + 10 sample). Plus 2 web-verified deep-checks and the full 145-file diff scan.

## 2. Findings and fixes applied

### F1 — Medium: twitter-cards recommends the wrong large-card image size

- **File:** `skills/metadata/twitter-cards/SKILL.md` (lines 51, 78, 106–107, 217, 231 at HEAD)
- **Problem:** The skill recommended 1200x628 (1.91:1) for large cards, contradicting `skills/media/twitter-card-images/SKILL.md` (1200x600, 2:1), `skills/media/og-image-generation/SKILL.md` (X large card is 2:1), and the Phase 3 audit summary itself ("X card images are 2:1 (1200×600, not 1200×675)"). Two batches picked different "correct" values in the same commit.
- **Evidence:** X's documented card specification is 2:1, minimum 300x157, maximum 4096x4096, under 5 MB (unanimous across sources; X's developer site no longer publishes its Cards documentation pages, confirmed November 2026, so the spec is from X's last published card specification as archived January 2026). 1200x628 is the Open Graph/Facebook convention that also works, losing ~14 px top/bottom to the 2:1 crop.
- **Root cause:** Batch inconsistency within Phase 3 — the twitter-cards batch applied the OG size while the twitter-card-images batch applied X's documented spec.
- **Fix applied:** All 5 occurrences aligned to 1200x600 (2:1) as recommended — Prerequisites, workflow step 3, Implementation Standards, Validation Checklist, Expected Deliverables — with a note that a 1200x628 (1.91:1) or 1200x630 image is also acceptable, losing only ~14 px top/bottom to the crop. The skill now agrees with twitter-card-images and og-image-generation.

### F2 — Low: secure-headers attributes the Helmet `hsts` removal to the wrong major version

- **File:** `skills/security/secure-headers/SKILL.md` (lines 67–71 at HEAD)
- **Problem:** "the old `hsts` option name was removed in Helmet 4 and is silently ignored if used." The version is wrong: `hsts` was live API in Helmet 4 and still present in Helmet 7.
- **Evidence chain:**
  - helmet@4.2.0 README (UNPKG) documents `helmet.hsts()` as live API — not removed in 4.
  - v7-era Helmet source still has `hsts` in `HelmetOptions` and `helmet.hsts = strictTransportSecurity`: https://raw.githubusercontent.com/spikebrehm/helmet/34401765eb826f08ad3bff572d923ab38c541a9a/index.ts
  - The current (v8) Helmet README uses only `strictTransportSecurity` (default `Strict-Transport-Security: max-age=31536000; includeSubDomains`, "It defaults to 365 days") and contains no `hsts` option: https://awesome.ecosyste.ms/projects/github.com%2Fhelmetjs%2Fhelmet (crawled 2026-11-19); canonical docs https://helmet.js.org/
  - NestJS docs list `hsts` as Helmet's legacy name for `strictTransportSecurity`.
- **Root cause:** Phase 3 misattributed the rename version. The actionable guidance (use `strictTransportSecurity`) was already correct, and "silently ignored" is accurate (Helmet validates no unknown options).
- **Fix applied:** "removed in Helmet 4" → "removed in Helmet 8".
- **Caveat:** an explicit Helmet 8.0.0 changelog entry naming the rename was not located; the version is established by the evidence chain above (present in v7 source, absent from the v8 README). See §5.

### F3 — Low: prisma skill names the pre-7.10 config file

- **File:** `skills/database/prisma/SKILL.md` (line 51 at HEAD)
- **Problem:** "define the connection in `prisma.config.ts`." The skill itself cites 7.10.1 as current, and on 7.10+ `prisma init` creates `prisma7.config.ts`. Telling users to edit `prisma.config.ts` could lead them to create a second config file.
- **Evidence:** Official Prisma docs, "From the CLI": "Prisma ORM 7.10 and later name this file `prisma7.config.ts` so that it does not clash with the Prisma 8 config format, which only accepts `prisma.config.ts`. The Prisma 7 CLI discovers either name, so a project that already has a `prisma.config.ts` keeps working." https://docs.prisma.io/docs/v7/prisma-postgres/from-the-cli (Neon docs confirm; Neon explicitly warns not to create a second config file.)
- **Root cause:** Phase 3 knew about the 7.10 rename (the audit flagged it for the upstream `prisma-upgrade-v7` skill) but the original prisma skill's new text still named the pre-7.10 file without qualification.
- **Fix applied:** "define the connection in the Prisma config file (`prisma7.config.ts` on 7.10+, `prisma.config.ts` on 7.0–7.9; the 7.10 CLI reads either name, so edit the file `prisma init` created — do not create a second one)."

### F4 — Low: prisma skill's Prisma 8 database-support list is stale (post-Phase-3 drift)

- **File:** `skills/database/prisma/SKILL.md` (line 46 at HEAD)
- **Problem:** "It supports PostgreSQL and MongoDB (early access) only, so far." MySQL early preview (migrations, reads, and writes) and MariaDB early preview (migrations only) and SQLite experimental are now documented.
- **Evidence:** Official Prisma supported-databases page: PostgreSQL RC, MongoDB early access, MySQL early preview (`@prisma/orm-mysql`), MariaDB early preview (migrations only), SQLite experimental (`@prisma/orm-sqlite`); SQL Server and CockroachDB coming soon. https://www.prisma.io/docs/orm/supported-databases — MySQL early preview appeared ~2026-11-19, i.e. after the Phase 3 write. This is drift, not a Phase 3 error; the recommendation (do not use Prisma 8 for production) is unchanged.
- **Fix applied:** Minimal precision edit: "Database support so far: PostgreSQL (release candidate) and MongoDB (early access); MySQL is an early preview (migrations, reads, and writes), MariaDB an early preview (migrations only), and SQLite experimental."

### F5 — Low: Node.js 20 end-of-life month wrong in 6 skills

- **Files (line at HEAD):** `skills/backend/nodejs/SKILL.md:54`, `skills/infrastructure/cloudflare-workers/SKILL.md:51`, `skills/infrastructure/docker/SKILL.md:57`, `skills/infrastructure/github-actions/SKILL.md:60`, `skills/testing/playwright/SKILL.md:53`, `skills/testing/vitest/SKILL.md:51`
- **Problem:** All six say "Node.js 20 reached end-of-life in March 2026." The official date is **30 April 2026**. The library was internally inconsistent: `skills/backend/typescript-sdk/SKILL.md:63` already had the correct "30 April 2026".
- **Evidence:** Node.js Release Working Group release schedule (nodejs/Release): 20.x end-of-life 2026-04-30. Corroborated by https://www.osseva.io/eol/nodejs-20 and https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20 ("Node.js 20 reached its official end of life on April 30, 2026").
- **Root cause:** Phase 3 confused the last release date with the EOL date — v20.20.2, the final 20.x release, shipped 24 March 2026. No guidance changes either way ("do not use Node.js 20" remains true).
- **Fix applied:** "in March 2026" → "on 30 April 2026" in all 6 files. Verified: no "in March 2026" remains in any original skill, and all Node 20 EOL statements now agree.

## 3. Deep-checks verified — no regression

- **Next.js fetch caching:** fetch NOT cached by default since 15; opt-ins `cache: 'force-cache'`, `next: { revalidate }`, `export const fetchCache = 'default-cache'`; Cache Components via `cacheComponents: true` + `'use cache'` in 16; `proxy` Node.js-only (edge runtime not supported); Turbopack default in 16. Evidence: https://nextjs.org/docs/app/guides/upgrading/version-16, https://preview.nextjs.org/docs/app/guides/caching-without-cache-components
- **Rate limiting:** IETF draft `draft-ietf-httpapi-ratelimit-headers-11` (23 May 2026) defines `RateLimit-Policy` (`q`, `w`, `qu`, `pk`) and `RateLimit` (`r`, `t`); the draft itself defines the `quota-exceeded` problem type (`https://iana.org/assignments/http-problem-types#quota-exceeded`) with the `violated-policies` extension — the skill's example matches the draft's own example. Evidence: https://eu.mirror.ionos.com/documents/internet-drafts/draft-ietf-httpapi-ratelimit-headers-11.html
- **OWASP Top 10:2025:** verified exactly — A01 Broken Access Control (absorbs SSRF), A02 Security Misconfiguration, A03 Software Supply Chain Failures (new), A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging and Alerting Failures, A10 Mishandling of Exceptional Conditions (new). Announced November 2025, finalised January 2026.
- **FAQ rich results:** removed 7 May 2026; docs removed June 2026 (15 June changelog entry); Search Console API support removed August 2026. Matches the skills exactly.
- **YouTube thumbnails:** YouTube Help recommends 3840x2160, min width 640 px, 2 MB mobile / 50 MB desktop, Shorts 2160x3840, verified account required. Evidence: https://support.google.com/youtube/answer/72431
- **otplib v13 (mfa):** 13.6.0 current; `generateSecret()`, `generateURI({issuer, label, secret})`, async `verify({secret, token})` returning a result object with `.valid`. Evidence: https://otplib.yeojz.dev/guide/getting-started.html
- **MCP SDK v2 (mcp-development):** v2 is the stable line; `@modelcontextprotocol/server` 2.4.0 (23 October 2026); 2026-07-28 spec; split packages; Standard Schema; Zod v4. Skill uses `server.registerTool` (not the removed `server.tool()`), correct imports — matches the SDK README getting-started example.
- **llms.txt v2:** v2 published 10 August 2026; subpath files, most-specific-wins; `rel="alternate" type="text/markdown"` + `rel="describedby"`; `## Optional` convention-only; H1 the only required section.
- **Turborepo CVE-2026-45772:** verified exactly — arbitrary code execution via malicious Yarn config, affected 1.1.0 to before 2.9.14, fixed in 2.9.14, advisory GHSA-3qcw-2rhx-2726. Evidence: https://cvefeed.io/vuln/detail/CVE-2026-45772, https://github.com/vercel/turborepo/security/advisories/GHSA-3qcw-2rhx-2726
- **Prisma 7/8 (original prisma skill):** 7.10.1 stable; Prisma 8 RC on `latest`; contract replaces `schema.prisma`; no MongoDB in Prisma 7; Prisma 6 EOL 19 November 2026; 18-month support window after Prisma 8 GA; driver adapter required in 7; `$use` removed in 7.
- **Node 27 annual releases:** the technical-writing claim that Node.js moves to one major release a year starting with Node 27 (every major line becoming LTS after its Current phase) is corroborated by a secondary source (osseva.io, checked against the Node.js release schedule). Not a finding.

## 4. L-Prisma research (Task 2)

**Current stable version: Prisma ORM 7.10.1** (on the `prev` npm tag). **Prisma 8 has NOT reached general availability as of 2026-11-20, and no GA date is announced** — the October GA date was removed from the release-status page on 13 November 2026.

- **Evidence:** https://www.prisma.io/docs/orm/release-status (updated 2026-11-20T15:18:16Z): "Prisma ORM 8 is a release candidate… Prisma ORM 8 has not reached general availability yet: npm still installs a release candidate under `latest`." Latest on 16 November 2026: `prisma` 8.0.0-rc.34, `@prisma/orm-postgres` 8.0.0-rc.24, `@prisma/orm-mongo` 8.0.0-rc.24.
- **RC pins in the three upstream skills are stale/drifting** (documented only — upstream skills must NOT be edited): prisma-compute rc.21/rc.23; prisma-mongodb-upgrade rc.13; prisma-postgres-upgrade rc.27/rc.20 — vs current rc.34/rc.24.
- **Support windows:** Prisma 7 gets bug fixes + security updates for 18 months after Prisma 8 GA. Prisma 6 security patches ended 19 November 2026.
- **Prisma 8 requirements:** Node.js 22.18+ / 24.11+ / 26+, TypeScript 5.9+.
- **Missing in 8 vs 7:** `$extends`, JSON filtering, atomic `increment`, most nested writes, P2002-style error codes.
- **Upgrade guides:** https://docs.prisma.io/docs/guides/upgrade-prisma-orm (PostgreSQL all-at-once or route-by-route; MongoDB from Prisma 6).
- **Adjacent facts:** Prisma Compute runs only Prisma 8. Prisma Accelerate retires 1 December 2026. Prisma 8 database support: PostgreSQL (RC), MongoDB (early access), MySQL (early preview), MariaDB (early preview, migrations only), SQLite (experimental); SQL Server and CockroachDB coming soon — https://www.prisma.io/docs/orm/supported-databases

### GA upgrade path (for when Prisma 8 reaches GA)

1. **What changes:** `schema.prisma` → contract (`prisma contract emit` replaces `prisma generate`); `@prisma/client` → per-database libraries (`@prisma/orm-postgres`, `@prisma/orm-mongo`, `@prisma/orm-mysql`, `@prisma/orm-sqlite`); no `generate`, `migrate dev`, or `db push` commands; chained queries; config file is `prisma.config.ts` (Prisma 8 format only — distinct from the Prisma 7 `prisma7.config.ts`).
2. **What must be re-verified:** all Prisma skills (original `prisma`, `drizzle` comparisons, `migrations`) and the three upstream Prisma skills (RC pins replaced with the GA version); the `prisma` skill's 7.10.1 stable-version claim and the 18-month support statement; behavioural eval cases covering Prisma commands; the Prisma Compute / Accelerate guidance (Accelerate retired 1 December 2026).
3. **Do NOT recommend upgrading anything to an RC.** The library's current stance (pin `prisma@7`, use `npx prisma@7` in CI) stands until GA is announced on the official release-status page.

## 5. Files changed

| File | Change |
|---|---|
| `skills/metadata/twitter-cards/SKILL.md` | F1: 1200x628 → 1200x600 (2:1) in 5 places, with 1200x628/1200x630-acceptable note |
| `skills/security/secure-headers/SKILL.md` | F2: "removed in Helmet 4" → "removed in Helmet 8" |
| `skills/database/prisma/SKILL.md` | F3: config file `prisma7.config.ts` for 7.10+; F4: Prisma 8 database-support precision edit |
| `skills/backend/nodejs/SKILL.md` | F5: Node.js 20 EOL "March 2026" → "30 April 2026" |
| `skills/infrastructure/cloudflare-workers/SKILL.md` | F5: same |
| `skills/infrastructure/docker/SKILL.md` | F5: same |
| `skills/infrastructure/github-actions/SKILL.md` | F5: same |
| `skills/testing/playwright/SKILL.md` | F5: same |
| `skills/testing/vitest/SKILL.md` | F5: same |

No other files were touched. No commit was made (coordinator commits after verification). Note: the working tree contains other agents' concurrent in-flight changes (evals, registry, scripts/install, other skills, tests); the diff above is only this agent's 9 files.

## 6. Validation

- `npm run validate`: **PASS** — 277 skills checked (228 original, 49 upstream); 4 warnings, all upstream and informational (pre-existing placeholder/broken-link warnings in agentic-seo, doc-coauthoring, site-architecture, writing-plans).
- `npm run check:frontmatter`: **PASS** — 277 skills.

## 7. Not verifiable / left unchanged

- **Next.js 16 "Active LTS since 2026-10-21"** (`skills/frontend/nextjs/SKILL.md`): one secondary source gave 21 October 2025 as the 16.0.0 release date, leaving the LTS-date attribution ambiguous; it could not be confirmed either way against an official source in this pass. It changes no guidance (use Next.js 16; 15 is Maintenance LTS; 14 and earlier unsupported), so it was left unchanged. Recommend a one-line confirmation against the Next.js release/LTS page in a later pass.
- **Helmet 8.0.0 changelog entry:** no explicit changelog/release-notes entry naming the `hsts` → `strictTransportSecurity` rename was located; the Helmet 8 attribution rests on the evidence chain in F2 (live in v4 docs and v7-era source; absent from the current v8 README). The fix is the best-supported reading of the evidence.
- **X Cards documentation:** X no longer publishes its Cards documentation pages (confirmed November 2026); the 2:1 specification is from X's last published card specification (archived January 2026), corroborated by multiple secondary sources and by the library's own twitter-card-images skill. Re-check X's current documentation before relying on the limits for an edge case (as the twitter-card-images skill already advises).
- **Scope note:** youtube-thumbnails and llms-txt Phase 3 claims were verified against official docs via web, but their full files were not read in this pass; they are not counted in the 19 full-file reads.
