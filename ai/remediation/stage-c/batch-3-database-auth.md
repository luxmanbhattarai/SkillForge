# Stage C — Batch 3: Database + Auth Skills Audit

**Audited:** 2026-11-20 · **Branch:** `feat/skillforge-production-upgrade` (local only, no commit)
**Scope:** 8 Phase 4 (new) skills — 4 database, 4 auth
**Method:** Phase 3 rigor per `ai/audits/TECHNICAL-ACCURACY-AUDIT.md`; 22-element
standard per `docs/SKILL-STANDARDS.md`. Evidence hierarchy: official product
docs > official API references > official GitHub repos/release notes > official
migration guides > recognized standards (NIST, OWASP, W3C, IETF) > reputable
secondary sources. Version claims checked against current official docs on
2026-11-20. All 8 `SKILL.md` files read in full. Extra attention to the auth
skills: credential handling, session/secret examples, and unsafe defaults.

## Cross-cutting checks (all 8 skills)

- **Structure:** each skill directory contains only `SKILL.md` — no
  `references/`, `examples/`, or `scripts/` subdirectories, so no
  missing-referenced-file risk. All files under the 500-line limit
  (230–385 lines after fixes). All 8 contain the 15 template sections
  (Purpose … References); `opensearch` adds one extra comparison section
  ("How OpenSearch differs from Elasticsearch").
- **Frontmatter:** `name` matches the directory in all 8; descriptions
  within limits; `last_verified: "2026-11-20"` already present in metadata.
  `npm run check:frontmatter` passes (277 skills).
- **Related skills:** every sibling skill referenced across the batch
  (`postgresql`, `mysql`, `sql-optimization`, `indexing`,
  `database-design`, `backup-recovery`, `observability`,
  `database-security`, `authentication`, `oauth`, `session-management`,
  `jwt`, `mfa`, `rbac`, `authorization`, `multi-tenancy`,
  `auth-security`, `csrf-protection`, `better-auth`, and the batch's own
  skills) exists in the `skills/` tree.
- **Internal links:** no relative file links; no broken internal links.
  Key external URLs re-opened and resolving during this audit (see
  findings for URLs).
- **Security:** no unsafe shell commands, no prompt-injection vectors.
  The one credential-handling defect (inline S3 keys in a ClickHouse
  example, B3-03) is fixed below. Auth skills checked against current
  official docs: no unsafe defaults found beyond the findings listed.
- **Duplication/overlap:** none needing consolidation. Delineations hold:
  `elasticsearch` vs `opensearch` is a deliberate pair covering two
  diverged engines, and both skills address the divergence (OpenSearch
  has a dedicated comparison section); `clickhouse` (OLAP) vs `redis`
  (in-memory) vs the search pair are distinct workloads; `clerk`
  (hosted) vs `supabase-auth` (Supabase backend) vs `authjs` (library)
  vs `passkeys` (WebAuthn ceremonies) are distinct auth approaches, each
  pointing at the others in When-Not-to-Use.

## Matrix

| Skill | Category | Status | Findings (C/H/M/L/I) | Fixes applied | Recommended verification status |
| --- | --- | --- | --- | --- | --- |
| clickhouse | database | FIXED | 0/0/1/2/2 | 3 | verified |
| elasticsearch | database | PASS | 0/0/0/0/1 | 0 | verified |
| opensearch | database | FIXED | 0/0/1/0/0 | 1 | verified |
| redis | database | PASS | 0/0/0/0/0 | 0 | verified |
| authjs | auth | PASS | 0/0/0/0/1 | 0 | verified |
| clerk | auth | FIXED | 0/2/0/2/0 | 4 | verified |
| passkeys | auth | FIXED | 0/0/0/1/0 | 1 | verified |
| supabase-auth | auth | FIXED | 0/0/0/1/0 | 1 | verified |

## Findings

### B3-01 — clerk — High — FIXED

**`auth.protect()` example uses the wrong (Core 2) call form.** The
`protect()` example called `protect()` on the result of `auth()`:
`await (await auth()).protect()`. In Clerk Core 3 (`@clerk/nextjs` v7),
`protect` moved to the `auth` helper itself; the correct form is
`await auth.protect()`. The Required Workflow step 5 had the same wrong
sequencing ("starts with `await auth()` and calls `auth.protect()`").

- **Evidence:** `skills/auth/clerk/SKILL.md:269` (example), `:94-98`
  (workflow step 5), `:118-122` (Implementation Standards), pre-fix.
  Official Clerk `auth()` reference describes `auth.protect()` as a
  property of the `auth` helper, with the behavior table (signed in +
  authorized → returns Auth object; signed in but not authorized → 404;
  signed out → redirect): https://clerk.com/docs/reference/nextjs/app-router/auth
- **Fix applied:** example now reads
  `const { userId } = await auth.protect();`; workflow step 5 now says
  each protected resource "starts with `await auth.protect()`"; the
  Implementation Standards bullet states explicitly that `protect` is
  called directly on the `auth` helper, not on the result of `auth()`;
  a Common Mistakes entry warns against the Core 2 form.

### B3-02 — clerk — High — FIXED

**Webhook example uses a wrong option name and env var.** The example
called `verifyWebhook(request, { secret: process.env.CLERK_WEBHOOK_SECRET ?? "" })`.
The helper's documented signature is
`verifyWebhook(request, options: { signingSecret?: string })`, and it
reads `CLERK_WEBHOOK_SIGNING_SECRET` from the environment when called
with no options. The skill's `secret` option would be ignored and
`CLERK_WEBHOOK_SECRET` is not the env var the helper reads — so the
example as written would verify against no secret.

- **Evidence:** `skills/auth/clerk/SKILL.md:282-284` (example),
  `:138-142` (Implementation Standards webhook bullet), pre-fix.
  Official Clerk `verifyWebhook` reference (last updated 2026-11-20):
  https://clerk.com/docs/reference/backend/verify-webhook
- **Fix applied:** example now calls `await verifyWebhook(request)` with
  no options inside try/catch (returning 400 on failure, matching the
  official example), with a comment naming `CLERK_WEBHOOK_SIGNING_SECRET`;
  the Implementation Standards bullet now names that env var.

### B3-03 — clickhouse — Medium — FIXED

**BACKUP example contradicts the skill's own security rule.** The
Security Considerations section states credentials for external storage
must be stored in named collections or server config, "never inline in
queries — inline credentials land in `system.query_log`", and Common
Mistakes repeats the rule — but the BACKUP/RESTORE example showed inline
`'YOUR_S3_ACCESS_KEY'` / `'YOUR_S3_SECRET_KEY'`, with only a comment
("shown inline here only for clarity of syntax") excusing it. An example
that violates the skill's own rule teaches the wrong pattern.

- **Evidence:** `skills/database/clickhouse/SKILL.md:214-220` (example),
  vs the security rule in the same file. Official backup overview
  confirms backups "use named collections" to "avoid credential exposure
  in query logs": https://clickhouse.com/docs/concepts/features/backup-restore/overview
  Official backup-to-disk docs confirm the `Disk('<disk_name>', '<path>/')`
  destination form and that S3-backed disks work the same as local disks:
  https://clickhouse.com/docs/concepts/features/backup-restore/local-disk
- **Fix applied:** example rewritten to `BACKUP TABLE ... TO Disk('s3_backups', 'events/')`
  and the matching `RESTORE ... FROM Disk(...)`, with a comment explaining
  the disk is configured in server config (credentials live there), that
  inline S3 keys would land in `system.query_log`, and that the S3-endpoint
  form accepts a named collection. No unverified syntax was written into
  the skill: the exact named-collection argument form inside
  `BACKUP ... TO S3(...)` could not be confirmed from extractable official
  docs text (see "Could not verify"), so the fully verified Disk form
  was used instead.

### B3-04 — opensearch — Medium — FIXED

**1-bit quantization "default in 3.6+" claim is wrong as stated.** The
Performance Considerations section said "1-bit scalar quantization, the
default in 3.6+". 1-bit quantization (`compression_level: 32x`) was
*introduced* in 3.6 and is opt-in for Faiss/Lucene HNSW; the default
`in_memory` mode applies no quantization. 1-bit is the default only for
the `flat` exact-search method (also introduced in 3.6).

- **Evidence:** `skills/database/opensearch/SKILL.md:139`, pre-fix.
  Official OpenSearch docs:
  https://docs.opensearch.org/latest/vector-search/optimizing-storage/faiss-scalar-quantization/
  and https://docs.opensearch.org/latest/vector-search/optimizing-storage/exact-search-scalar-quantization/
- **Fix applied:** reworded to "Use quantization to reduce the footprint
  (1-bit scalar quantization, `compression_level: 32x`, is available
  since 3.6 for Faiss/Lucene HNSW; the `flat` exact-search method
  defaults to 1-bit), and test recall at production scale."

### B3-05 — clickhouse — Low — FIXED

**Pinned patch version stale.** Prerequisites pinned "ClickHouse 26.10
… (26.10.7.24, released 2026-11-19)".

- **Evidence:** `skills/database/clickhouse/SKILL.md:49`, pre-fix.
  Official packages page lists latest Stable `26.10.8.34`, released
  2026-11-20 (LTS `26.8.42.13`, also 2026-11-20):
  https://packages.clickhouse.com/
- **Fix applied:** pin updated to 26.10.8.34, released 2026-11-20.

### B3-06 — clickhouse — Low — FIXED

**"Halves hash-table memory" for GROUP BY is overstated and unverified.**
The Performance Considerations section claimed "26.10 halves hash-table
memory for large GROUP BY operations." The official 26.10 release blog
does not mention hash-table memory at all; it says 26.10 brings "faster
GROUP BY queries" via dynamic filtering extended to GROUP BY with
granule skipping through the primary index. Release-presentation numbers
(GROUP BY 10M keys 24.7 GB → 16.3 GB, ~34%) could not be re-verified
from official docs text, and would contradict "halves" for GROUP BY in
any case.

- **Evidence:** `skills/database/clickhouse/SKILL.md:122`, pre-fix.
  Official 26.10 release blog: https://clickhouse.com/blog/clickhouse-release-26-10
- **Fix applied:** claim replaced with the blog-grounded wording: "26.10
  also speeds up GROUP BY queries (dynamic filtering extended to GROUP
  BY, with granule skipping through the primary index)." No specific
  memory number is asserted.

### B3-07 — clerk — Low — FIXED

**Organizations enablement warning missing.** Workflow step 7 told the
agent to enable Organizations via the CLI but did not mention the
membership mode. Enabling Organizations turns on `Membership required`
by default (for instances created after 2025-08-22), routing every
signed-in user through organization selection and disabling Personal
Accounts — wrong for any app that also serves individuals.

- **Evidence:** `skills/auth/clerk/SKILL.md:101-104` (workflow step 7),
  pre-fix. Official Clerk docs: "Membership required (default): Every
  user is required to belong to an Organization… prompted to create or
  join an Organization through the session tasks flow":
  https://clerk.com/docs/guides/organizations/configure ; changelog
  2025-08-22: https://clerk.com/changelog/2025-08-22-personal-accounts-disabled
- **Fix applied:** step 7 now says to pick the membership mode
  deliberately, explains the default, and says to choose `Membership
  optional` if the app also serves individuals.

### B3-08 — clerk — Low — FIXED

**shadcn theme guidance omits the required CSS import.** Best Practices
said to install `@clerk/ui` and apply the `shadcn` theme to
`<ClerkProvider>`, but omitted the global CSS import the theme needs.

- **Evidence:** `skills/auth/clerk/SKILL.md:184-185`, pre-fix. Official
  Clerk Next.js Quickstart:
  https://clerk.com/docs/nextjs/getting-started/quickstart
- **Fix applied:** bullet now includes importing the theme CSS in the
  global stylesheet (`@import '@clerk/ui/themes/shadcn.css';`).

### B3-09 — supabase-auth — Low — FIXED

**`getClaims()` example imprecise.** The server-side identity-check
example destructured `const { data: claims } = await supabase.auth.getClaims();`
and checked `if (!claims)`. `getClaims()` returns
`{ data: { claims }, error }` — the destructured `data` is the wrapper,
not the claims, and `error` was unchecked.

- **Evidence:** `skills/auth/supabase-auth/SKILL.md:276-277`, pre-fix.
  Documented form per official Supabase SSR docs:
  https://supabase.com/docs/guides/auth/server-side/nextjs
- **Fix applied:** example now reads
  `const { data, error } = await supabase.auth.getClaims();` and
  `if (error || !data?.claims) redirect("/login");`.

### B3-10 — passkeys — Low — FIXED

**No library version in Prerequisites.** The skill named
`@simplewebauthn/server` and `@simplewebauthn/browser` but gave no
version (the 22-element standard requires supported versions).

- **Evidence:** `skills/auth/passkeys/SKILL.md:63-66`, pre-fix.
  SimpleWebAuthn v13 is current (13.3.3 as of 13 Nov 2026; v13 requires
  Node 22+). Docs: https://simplewebauthn.dev/docs/packages/server
- **Fix applied:** Prerequisites now note "(v13 current as of 2026-11-20;
  v13 requires Node 22+)".

### B3-11 — elasticsearch — Informational — no fix

**Java4Shell (CVE-2026-114938) advisory.** An OpenJDK flaw disclosed
17–18 Nov 2026 affects Elasticsearch 7.17.3+; fixes were pending in
8.19.26 / 9.4.10 / 9.5.7 / 9.6.0 as of 19 Nov 2026 (none shipped at that
point). The skill's existing guidance — "apply patch releases promptly,
watch security announcements" — already covers this; no skill change
needed. Noted here so the coordinator knows the skill was checked
against the current advisory state.

### B3-12 — clickhouse — Informational — no fix

**Lightweight UPDATE lifecycle refinement.** The skill says standard SQL
UPDATE at scale is supported "since 25.7 via a patch-part mechanism"
(confirmed by the official 25.7 release blog). A secondary source
(ch-ops.io) reports it was experimental in 25.7, Beta in 25.8, and GA in
26.10. The GA detail was not added: it rests on a secondary source only,
and the skill's existing wording ("verify its behaviour on your version
before relying on it") already hedges correctly.

### B3-13 — clickhouse — Informational — no fix

**DPsub-based CBO default version — sources conflict.** The skill's claim
that 25.12 added the DPsize join-reordering algorithm for INNER JOINs is
verified (official 2025 changelog, PR #91002). A newer DPsub-based
cost-based optimizer is reported as the current default — one secondary
summary says default from 26.10, the official blog says "upcoming 26.11".
Sources conflict, so no claim was added or changed.

### B3-14 — authjs — Informational — no fix

**Auth.js ecosystem context.** Verified as correct: Auth.js v5 is still
beta (5.0.0-beta.32, last published 20 Jul 2026), stable `next-auth` is
4.24.15, Auth.js joined Better Auth 22 Sep 2025, maintainers recommend
Better Auth for new projects, and security maintenance continues. Two
context items not in the skill: Better Auth joined Vercel 7 Jul 2026,
and the July 2026 advisory batch included two critical CVEs
(CVE-2026-73421 fail-open bypass in v5 beta only, CVE-2026-73420) fixed
in beta.32. The skill's guidance stands as written; no change needed.

## Verified correct (no fix) — highlights

- **clickhouse:** 26.10 release contents (104 features, function
  composition `|` operator, flexible JOIN conditions, faster GROUP BY,
  disk spilling for IN subqueries, experimental columns cache,
  `written_rows` quota counter); legacy analyzer removal in 26.10; 26.8
  LTS released 2026-08-27, 26.3 LTS 2026-03-26 (LTS support dates in the
  skill match); `clickhouse dig` / `chdig` built into the binary; DPsize
  join reordering in 25.12; docs relaunched on Mintlify with docs MCP
  server and llms.txt; lightweight UPDATE since 25.7.
- **elasticsearch:** 9.5 GA 4 Aug 2026; 9.5.6 released 2 Nov 2026; 8.19.25
  released 10 Nov 2026, supported until 15 Jul 2027 (Elastic's published
  EOL date); 9.6.0 announced but not released; `semantic` field GA in
  9.5 with multimodal support; Columnar Mode technical preview; VectorDB
  index mode + auto-calibration; native Prometheus/PromQL GA; BBQ default
  for float vectors ≥384 dims since 9.1 (DiskBBQ default on Enterprise
  licences from 9.4); licensing AGPLv3/SSPL/Elastic License v2 since 2024.
- **opensearch:** 3.10.0 current stable (2026-11-16 per official version
  history); LTS program announced 16 Apr 2026, min 18 months support,
  starting with 2.19 and 3.6, 3.6 first LTS in 3.x; 2.19.7 released 20 Oct
  2026; API keys in 3.7; Search Relevance Workbench introduced 3.1, GA in
  3.5; OpenSearch Software Foundation governance since 2024-09-16
  (Linux Foundation announcement); fork from ES 7.10.2, 1.0 GA July 2021.
- **redis:** 8.10.3 released 26 Oct 2026; compact hashes + `BACKUP`
  command family + `HIMPORT` in 8.10; Array data structure + `INCREX`
  window-counter rate limiter in 8.8 (GA 25 May 2026); LRM eviction
  policies and TLS certificate-based automatic client authentication in
  8.6; 8.10.3 fixed the cluster pub/sub heap overflow (also fixed in
  8.8.4/8.6.8); 8.0 security support to 1 Dec 2026; tri-license
  RSALv2/SSPLv1/AGPLv3 for Redis 8+, dual RSALv2/SSPLv1 for 7.4.
- **authjs:** v5 beta status, stable 4.24.15, Better Auth relationship
  (see B3-14); `npx auth secret` CLI; `proxy.ts` on Next.js 16+ /
  `middleware.ts` on 15 and below.
- **clerk:** Core 3 (`@clerk/nextjs` v7) released 3 Mar 2026; Node
  20.9.0+, Next.js 15.2.8+ or 16.0.10+; `Show` replaces
  `SignedIn`/`SignedOut`/`Protect`; package renames `@clerk/clerk-react`
  → `@clerk/react`, `@clerk/clerk-expo` → `@clerk/expo`;
  `createRouteMatcher()` deprecated in Core 3; `acceptsToken` option and
  `treatPendingAsSignedOut` default `true`; `clerkMiddleware()` in
  `proxy.ts` (Next.js 16); CLI `init` / `doctor`, accountless claimable
  app; `npx -y clerk@latest users create` (official CLI docs); 1.2 KB
  custom-claims budget (official docs); `getToken()` proactive
  background refresh in Core 3 (official Core 3 upgrade guide).
- **passkeys:** SimpleWebAuthn v13 current;
  `verifyRegistrationResponse` returns `registrationInfo` with
  `credential` (`id`, `publicKey`, `counter`, `transports`) plus
  `credentialDeviceType`/`credentialBackedUp`; WebAuthn L3 Recommendation
  25 Aug 2026 and NIST SP 800-63B-4 final July 2025 (verified in Phase 3).
- **supabase-auth:** `getClaims()` (local JWT verification via cached
  JWKS for asymmetric keys, default for new projects; refreshes near
  expiry) vs `getUser()` (network call) vs `getSession()` (unvalidated,
  never trust server-side); `proxy.ts` Next.js 16 / `middleware.ts`
  earlier; passkeys `registerPasskey()` / `signInWithPasskey()`, opt-in
  `auth: { experimental: { passkey: true } }`, registration requires an
  existing confirmed non-anonymous user, Beta announced 28 May 2026.

## Could not verify

- **Named-collection argument form inside `BACKUP ... TO S3(...)`:**
  official docs confirm named collections are supported for
  backup/restore, but the code examples on the named-collections page
  were not extractable via text fetch, and the S3 backup page shows only
  the inline-credentials form. The B3-03 fix therefore uses the fully
  verified `Disk(...)` form; no unverified syntax was written into the
  skill.
- **Exact 26.10 GROUP BY memory numbers from the release presentation**
  (GROUP BY 10M keys 24.7 GB → 16.3 GB): could not be re-verified from
  official docs text. The B3-06 fix replaces the claim with blog-grounded
  wording and asserts no number.
- **Clerk 401-vs-redirect nuance for Server Actions/Route Handlers:**
  two secondary sources say unauthenticated Server Actions/Route
  Handlers get 401 instead of a redirect from `auth.protect()`; not
  confirmed in official docs, so not added.
- **FIDO Alliance WebAuthn L3 announcement URL** (linked from
  `passkeys`): not re-opened this session. It passed the Phase 4 online
  link check (609 URLs), and the Recommendation date it supports was
  verified in Phase 3.

## Files changed

- `skills/database/clickhouse/SKILL.md` — 3 fixes (B3-03, B3-05, B3-06)
- `skills/database/opensearch/SKILL.md` — 1 fix (B3-04)
- `skills/auth/clerk/SKILL.md` — 4 fixes (B3-01, B3-02, B3-07, B3-08)
- `skills/auth/passkeys/SKILL.md` — 1 fix (B3-10)
- `skills/auth/supabase-auth/SKILL.md` — 1 fix (B3-09)
- `ai/remediation/stage-c/batch-3-database-auth.md` — this fragment

No files changed outside the 8 skill directories except this fragment.
No commit made (coordinator commits after verification).

## Validation

- `npm run validate` (from repo root, after edits): **PASS** with 4
  warnings, all upstream skills (`agentic-seo`, `doc-coauthoring`,
  `site-architecture`, `writing-plans`) — pre-existing, informational,
  outside this batch's scope. No warnings for any of the 8 batch skills.
- `npm run check:frontmatter` (from repo root, after edits): **PASS**
  (277 skills).

## Batch totals

- Skills audited: **8** (4 database, 4 auth)
- Status: **3 PASS** (elasticsearch, redis, authjs), **5 FIXED**
  (clickhouse, opensearch, clerk, passkeys, supabase-auth),
  **0 NEEDS-REVIEW**
- Findings: **14 total — 0 Critical, 2 High, 2 Medium, 6 Low,
  4 Informational**
- Fixes applied: **10** (all confirmed findings fixed in place)
- Recommended verification status: **verified for all 8 skills**
