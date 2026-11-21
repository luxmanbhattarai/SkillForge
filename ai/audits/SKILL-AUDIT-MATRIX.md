# Skill Audit Matrix — 51 Phase 4 Skills (Stage C)

- **Audit date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; nothing pushed)
  — superseded 2026-11-21: the branch was pushed, PR #1 opened, merged,
  and reverted (see `ai/PROJECT-STATUS.md`).
- **Scope:** the 51 skills added in Phase 4 of the production upgrade, all
  previously recorded as `unverified` in `sources/verification-status.json`
- **Method:** Phase 3 technical-accuracy method
  (`ai/audits/TECHNICAL-ACCURACY-AUDIT.md`) and the 22-element quality
  standard (`docs/SKILL-STANDARDS.md`). Every `SKILL.md` read in full;
  every versioned claim, API signature, CLI command, code example, and
  load-bearing link checked against current official documentation.
  Evidence hierarchy: official product docs > official API references >
  official GitHub repos/release notes > official migration guides >
  recognized standards (IETF, NIST, OWASP, W3C) > reputable secondary
  sources. Blogs and AI-generated content were never treated as
  authoritative. Version claims are dated as of 2026-11-20 and will drift
  on their normal release cadence.
- **Auditor:** Stage C, five parallel batch audits (disjoint skill sets),
  each verified by the Stage C coordinator (diffs read, key claims
  re-checked against official docs, validators re-run) before commit.
  Source fragments: `ai/remediation/stage-c/batch-1-backend-architecture.md`,
  `batch-2-frontend-desktop-media.md`, `batch-3-database-auth.md`,
  `batch-4-infrastructure.md`, `batch-5-ai-seo-content.md`.

## Summary

| | Count |
| --- | --- |
| Skills audited | 51 of 51 (100%) |
| PASS (no findings) | 19 |
| FIXED (findings fixed in place) | 32 |
| NEEDS-REVIEW | 0 |
| **Findings total** | **60** |
| Critical | 0 |
| High | 3 |
| Medium | 11 |
| Low | 38 |
| Informational | 8 |
| Findings fixed in place | 54 |
| Informational, no fix needed | 6 |
| Unresolved findings | 0 |
| Recommended status: `verified` | 50 |
| Recommended status: `verified-with-limitations` | 1 (`platform-social-images`) |
| Still `unverified` after audit | 0 |

**Correction (Stage E, 2026-11-20):** this summary originally read
59 findings (10 Medium, 53 fixed). A mechanical re-count of the
51 per-skill rows gives 60 findings (11 Medium, 54 fixed): the
Stage C batch table undercounted batch 4 (infrastructure) by one —
kubernetes, pulumi, and railway each carry one Medium finding
(K-01, P-01, R-01), i.e. 3 Mediums in the batch, not 2. The row
data and the detailed findings sections were always consistent
at 60/54; only the summary totals and the Stage C batch table
were wrong. No finding was added or removed.

No fabricated capabilities, no unsafe shell commands, no credential
leakage, no prompt-injection vectors, and no duplicated skills were
found in any of the 51 skills. The three High findings were all
incorrect examples or guidance (a dead registry, two wrong Clerk API
forms), all fixed against official documentation.

## Matrix — all 51 skills

Status: PASS = no findings; FIXED = findings found and fixed in place.
Findings shown as Critical / High / Medium / Low / Informational.

| Skill | Category | Status | Findings (C/H/M/L/I) | Fixes | Audit status |
| --- | --- | --- | --- | --- | --- |
| advanced-api-architecture | backend | FIXED | 0/0/1/0/0 | 1 | verified |
| api-client-generation | backend | FIXED | 0/0/0/1/0 | 1 | verified |
| express | backend | FIXED | 0/0/0/1/0 | 1 | verified |
| fastify | backend | PASS | 0/0/0/0/0 | 0 | verified |
| nestjs | backend | FIXED | 0/0/2/0/0 | 2 | verified |
| openapi | backend | PASS | 0/0/0/0/0 | 0 | verified |
| python-sdk | backend | FIXED | 0/0/0/3/0 | 3 | verified |
| typescript-sdk | backend | FIXED | 0/0/0/1/0 | 1 | verified |
| changesets | architecture | FIXED | 0/0/0/2/0 | 2 | verified |
| nx | architecture | PASS | 0/0/0/0/0 | 0 | verified |
| release-management | architecture | PASS | 0/0/0/0/0 | 0 | verified |
| expo | frontend | FIXED | 0/0/0/2/1 | 3 | verified |
| nuxt | frontend | FIXED | 0/0/2/2/0 | 4 | verified |
| react-native | frontend | FIXED | 0/0/0/1/0 | 1 | verified |
| sveltekit | frontend | FIXED | 0/0/0/3/0 | 3 | verified |
| vue | frontend | FIXED | 0/0/0/1/0 | 1 | verified |
| electron | desktop | FIXED | 0/0/0/2/0 | 2 | verified |
| rust | desktop | FIXED | 0/0/0/1/0 | 1 | verified |
| tauri | desktop | FIXED | 0/0/0/1/0 | 1 | verified |
| platform-social-images | media | FIXED | 0/0/0/0/1 | 1 | verified-with-limitations |
| resvg | media | PASS | 0/0/0/0/0 | 0 | verified |
| satori | media | FIXED | 0/0/0/1/0 | 1 | verified |
| sharp | media | FIXED | 0/0/0/1/0 | 1 | verified |
| clickhouse | database | FIXED | 0/0/1/2/2 | 3 | verified |
| elasticsearch | database | PASS | 0/0/0/0/1 | 0 | verified |
| opensearch | database | FIXED | 0/0/1/0/0 | 1 | verified |
| redis | database | PASS | 0/0/0/0/0 | 0 | verified |
| authjs | auth | PASS | 0/0/0/0/1 | 0 | verified |
| clerk | auth | FIXED | 0/2/0/2/0 | 4 | verified |
| passkeys | auth | FIXED | 0/0/0/1/0 | 1 | verified |
| supabase-auth | auth | FIXED | 0/0/0/1/0 | 1 | verified |
| aws | infrastructure | PASS | 0/0/0/0/0 | 0 | verified |
| fly-io | infrastructure | PASS | 0/0/0/0/0 | 0 | verified |
| gcp | infrastructure | FIXED | 0/1/0/2/0 | 3 | verified |
| kubernetes | infrastructure | FIXED | 0/0/1/0/0 | 1 | verified |
| pulumi | infrastructure | FIXED | 0/0/1/1/0 | 2 | verified |
| railway | infrastructure | FIXED | 0/0/1/2/0 | 3 | verified |
| render | infrastructure | PASS | 0/0/0/0/0 | 0 | verified |
| self-hosted-vps | infrastructure | FIXED | 0/0/0/1/0 | 1 | verified |
| terraform | infrastructure | FIXED | 0/0/0/1/0 | 1 | verified |
| agent-evaluation | ai-engineering | PASS | 0/0/0/0/0 | 0 | verified |
| ai-agents | ai-engineering | PASS | 0/0/0/0/0 | 0 | verified |
| llm-integration | ai-engineering | PASS | 0/0/0/0/1 | 0 | verified |
| mcp-security | ai-engineering | PASS | 0/0/0/0/0 | 0 | verified |
| rag | ai-engineering | PASS | 0/0/0/0/0 | 0 | verified |
| content-decay | seo | FIXED | 0/0/0/1/0 | 1 | verified |
| entity-seo | seo | FIXED | 0/0/0/1/0 | 1 | verified |
| serp-monitoring | seo | FIXED | 0/0/1/0/1 | 1 | verified |
| topical-authority | seo | PASS | 0/0/0/0/0 | 0 | verified |
| editorial-workflow | content | PASS | 0/0/0/0/0 | 0 | verified |
| source-verification | content | PASS | 0/0/0/0/0 | 0 | verified |

## Findings — High (3, all fixed)

### B3-01 — clerk — High — FIXED

**`auth.protect()` example used the wrong (Core 2) call form.** The
example called `protect()` on the result of `auth()`. In Clerk Core 3
(`@clerk/nextjs` v7), `protect` is a property of the `auth` helper
itself; the correct form is `await auth.protect()`. The Required
Workflow step 5 had the same wrong sequencing. Evidence: official Clerk
`auth()` reference (clerk.com/docs/reference/nextjs/app-router/auth).
Fix: example, workflow step, and Implementation Standards corrected; a
Common Mistakes entry warns against the Core 2 form.

### B3-02 — clerk — High — FIXED

**Webhook example used a wrong option name and env var.** The example
passed a `secret` option and referenced a `CLERK_WEBHOOK_SECRET` env
var. The helper's documented signature takes a `signingSecret` option
and reads `CLERK_WEBHOOK_SIGNING_SECRET` from the environment when
called with no options — so the example as written would have verified
against no secret. Evidence: official Clerk `verifyWebhook` reference
(last updated 2026-11-20). Fix: example now calls the helper with no
options inside try/catch (returning 400 on failure, matching the
official example), with a comment naming the correct env var.

### G-01 — gcp — High — FIXED

**Cloud Run example deployed from a dead registry.** The example used a
`gcr.io` image. Google stopped accepting Container Registry writes on
18 March 2025; new projects must use Artifact Registry
(`LOCATION-docker.pkg.dev`). Evidence: Google Cloud Container Registry
deprecation/shutdown docs. Fix: example now creates the Artifact
Registry repository first and deploys from it, with a note recording
the shutdown date.

## Findings — Medium (11, all fixed)

### B1-01 — advanced-api-architecture — Medium — FIXED

**Wrong idempotency status code.** The idempotent retry flow said a
retry with the same key but a different body returns `409` Conflict.
Per draft-ietf-httpapi-idempotency-key-header-08, a key reused with a
different payload returns **422**; `409` is for a retry while the
original request is still in progress. Fix: step 4 now returns `422`
for the different-body case and notes the `409` in-progress case.

### B1-02 — nestjs — Medium — FIXED

**Adapter guidance contradicted official docs.** The skill said to
prefer the default Express adapter unless there is a measured reason to
switch. The official NestJS HTTP adapters page recommends the
`NodeAdapter` (`@nestjs/platform-node`) starting with v12.3 — fastest
of the three adapters, becoming the default in v13. Fix: guidance now
prefers `NodeAdapter` for new projects, reserves `FastifyAdapter` for
Fastify-specific plugins/hooks, and the Express adapter for unmovable
Express middleware.

### B1-03 — nestjs — Medium — FIXED

**Missing CLI/generator Node.js floor.** Prerequisites stated only the
runtime floor (20.19+/22.12+). The CLI's generators and schematics need
Node 22.22.3+, 24.15+, or 26+ — a user on Node 20.19 following the skill
would fail at `nest new`. Fix: CLI floor added to Prerequisites and to
the frontmatter `compatibility` line. (The TypeScript 6.x pin was
re-confirmed still required: `nest build` still refuses TypeScript 7.)

### B3-03 — clickhouse — Medium — FIXED

**BACKUP example contradicted the skill's own security rule.** The
Security Considerations section states credentials for external storage
must live in named collections or server config, never inline in
queries — but the BACKUP/RESTORE example showed inline S3 credentials,
with only a comment excusing it. An example that violates the skill's
own rule teaches the wrong pattern. Evidence: official ClickHouse backup
overview (backups "use named collections" to avoid credential exposure
in query logs). Fix: example rewritten to the `Disk('s3_backups', …)`
form, with a comment explaining the disk is configured in server config.

### B3-04 — opensearch — Medium — FIXED

**1-bit quantization "default in 3.6+" claim was wrong as stated.**
1-bit scalar quantization (`compression_level: 32x`) was *introduced*
in 3.6 and is opt-in for Faiss/Lucene HNSW; the default `in_memory`
mode applies no quantization. 1-bit is the default only for the `flat`
exact-search method (also introduced in 3.6). Fix: reworded to state
availability since 3.6 and the `flat` default precisely.

### K-01 — kubernetes — Medium — FIXED

**Helm example claimed a version pin that does nothing.** The example
showed `helm upgrade --install my-app ./charts/my-app … --version
1.4.2` under the heading "pinned to a chart version". `--version`
selects a version only for chart-repository and OCI references; for a
local chart directory the version comes from the chart's own
`Chart.yaml`, so the flag has no effect there. Fix: example now installs
from an OCI reference with `--version 1.4.2`, with a note explaining
`--version` does not apply to local chart directories.

### P-01 — pulumi — Medium — FIXED

**S3 examples used deprecated inline `Bucket` arguments.** The examples
used `versioning`, `serverSideEncryptionConfiguration`, and `acl`
inline on `aws.s3.Bucket`. In the current provider (@pulumi/aws
v7.55.0), all three are deprecated in favor of separate resources
(`BucketVersioning`, `BucketServerSideEncryptionConfiguration`,
`BucketAcl`). Fix: examples rewritten to the separate-resource forms,
with a note that the inline arguments are deprecated.

### R-01 — railway — Medium — FIXED

**Config-as-Code deprecation omitted the hard cutoff date.** The skill
said `railway.json`/`railway.toml` are deprecated and to "confirm
current status in the official docs", but did not state that existing
Config as Code files stop being read on **2026-12-01** — 11 days after
this audit — which is load-bearing for migration planning. Evidence:
Railway docs, Infrastructure as Code. Fix: cutoff date added, with the
migration command (`railway config migrate`).

### B5-01 — serp-monitoring — Medium — FIXED

**Misquoted Google large-drop example.** The skill said "Large move (for
example, out of the top 10 to position 29…)", presented as following
Google's framing. Google's core-updates page says the large-drop example
is "dropping from position 4 to 29" (small drop: "position 2 to 4",
which the skill quoted correctly). Fix: example corrected to "position
4 to 29".

### Nuxt — Medium × 2 — FIXED (batch 2, unnumbered)

- **Node.js requirement understated.** Prerequisites and `compatibility`
  said Node.js v22.21+, v24.11+, or v26+ (the Nuxt CLI v4 floor). The
  `nuxt@4.6.4` package manifest itself declares `engines.node:
  ^22.22.3 || ^24.15.0 || >=26.0.0` — a user on Node 22.21/24.11 per
  the skill would fail the framework's own engines check. Fix: both
  locations now state the manifest range, noting the CLI floor is
  lower.
- **`createError` example used wrong option names.** The example called
  `createError({ statusCode: 400, statusMessage: … })` — the h3 v1
  shape. The official Nuxt 4.6 blog states `nuxt/server`'s
  `createError` takes `status` and `statusText`. Fix: example now uses
  `{ status: 400, statusText: 'Invalid article id.' }`.

## Findings — Low (38, all fixed)

| ID | Skill | Finding | Fix |
| --- | --- | --- | --- |
| B1-04 | typescript-sdk | Stale tsup version (said 8.5.1 latest; 9.0.0 released 14 Oct 2026) | Version corrected to 9.0.0 with release date |
| B1-05 | python-sdk | Stale mypy version (said 2.4.0 current; 2.4.1 released 28 Oct 2026) | Corrected to 2.4.1 |
| B1-06 | python-sdk | Stale hatchling floor (`>= 1.26`; 1.26.0–1.26.2 yanked; 1.33.0 first with Python 3.15 support) | Floor raised to `>= 1.33` in both places |
| B1-07 | python-sdk | Paginator example skipped error handling (called `.json()` without a status check, unlike `get_order` in the same example) | Now raises the typed `OrdersError` on 4xx/5xx before parsing |
| B1-08 | changesets | Release workflow omitted the `permissions:` block (Version Packages PR / publishing can fail on restrictive token defaults) | Added `contents: write` / `pull-requests: write` per the official action README |
| B1-09 | changesets | Unverified mechanism claim (CLI 2.x misreading npm 12 output); no confirmation found in official docs, release notes, or trackers | Reworded to the verifiable statement that CLI v3 is the supported line; the unverified claim is recorded here, not silently dropped |
| B1-10 | express | Codemod recipe unnamed ("use the published codemod recipe") | Exact command named: `npx codemod@latest @expressjs/v5-migration-recipe` (the older `@expressjs/codemod` package is deprecated) |
| B1-11 | api-client-generation | Imprecise Node floor ("TypeScript generators need Node.js 22.13+") — orval requires `>= 22.18.0` | Per-generator floors stated (orval ≥ 22.18, hey-api 22.13+, openapi-typescript declares none) |
| — | expo | Node requirement imprecise ("Node.js 22 LTS or newer" admits 22.0–22.12 and odd releases 23/25) | Exact SDK 58 ranges: 22.13+ / 24.3+ / 26+, odd releases unsupported |
| — | expo | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | nuxt | Prose contradicted its own example on route params ("read via `event.context.params`" vs `getRouterParam` in the example) | Prose now says `getRouterParam` / `getRouterParams` from `nuxt/server` |
| — | nuxt | Accessibility element incomplete (one bullet only) | Bullet expanded into a subsection |
| — | react-native | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | sveltekit | Svelte minimum wrong (said 5.57.1; official SvelteKit 3 migration guide lists 5.56.4) | Corrected to 5.56.4 in Prerequisites and `compatibility` |
| — | sveltekit | `#lib` file-extension gotcha omitted (`#lib/foo` fails; `#lib/foo.ts` required) | Extension requirement added per the official migration guide |
| — | sveltekit | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | vue | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | electron | `safeStorage` recommendation omitted the sync deprecation (sync methods deprecated in 45, removed in 46) | Now recommends the async methods and notes the deprecation/removal |
| — | electron | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | rust | Accessibility element (standard 14) missing | `### Accessibility` subsection stating N/A with reason (systems language, no UI of its own) |
| — | tauri | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | satori | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| — | sharp | Accessibility element (standard 14) missing | `### Accessibility` subsection added |
| B3-05 | clickhouse | Pinned patch version stale (26.10.7.24, 19 Nov 2026; 26.10.8.34 released 20 Nov 2026) | Pin updated to 26.10.8.34 |
| B3-06 | clickhouse | "Halves hash-table memory" for GROUP BY overstated and unverified (official 26.10 blog does not mention hash-table memory) | Replaced with blog-grounded wording (dynamic filtering extended to GROUP BY); no number asserted |
| B3-07 | clerk | Organizations enablement warning missing (enabling Organizations turns on `Membership required` by default for instances created after 2025-08-22, disabling Personal Accounts) | Step 7 now says to pick the membership mode deliberately |
| B3-08 | clerk | shadcn theme guidance omitted the required CSS import | Import added (`@import '@clerk/ui/themes/shadcn.css';`) |
| B3-09 | supabase-auth | `getClaims()` example imprecise (destructured `data` as the claims; `error` unchecked) | Now destructures `{ data, error }` and checks `error \|\| !data?.claims` |
| B3-10 | passkeys | No library version in Prerequisites | Now notes SimpleWebAuthn v13 current (13.3.3, requires Node 22+) |
| G-02 | gcp | Sustained-use discounts mis-scoped (implied they cover Cloud SQL; they apply to Compute Engine only) | Reworded to state the Compute Engine-only scope |
| G-03 | gcp | `gcloud components update` stated unconditionally (only updates tarball installs) | Parenthetical added (package-manager installs update through the package manager) |
| P-02 | pulumi | CrossGuard policy example validated a deprecated property (`acl` on `Bucket`) | Policy retargeted to `BucketAcl` |
| R-02 | railway | PgBouncer command was the command group, not the enable command | Changed to `railway postgres pgbouncer add` |
| R-03 | railway | Dockerfile example pinned a maintenance-line Node (`node:24-alpine`) | Changed to `node:26-alpine` (current LTS line) |
| V-01 | self-hosted-vps | Compose example defaulted to the `latest` tag the skill itself forbids (unset `APP_VERSION` deploys `latest`) | Changed to a fail-fast form so a missing tag errors instead of silently deploying `latest` |
| T-01 | terraform | `-minimal-refresh` presented without its documented drift tradeoff (refreshes only resources the plan would change, hiding drift elsewhere) | Caveat added: fast inner-loop plans only; keep a scheduled full or `-refresh-only` plan |
| B5-02 | content-decay | Garbled example table row (stray text split the diagnosis across columns) | Row repaired |
| B5-03 | entity-seo | Knowledge Graph Search API status note missing (Google's Cloud docs point new projects to Cloud Enterprise Knowledge Graph; Basic edition remains available without new features) | Status note added to the Official Documentation entry |

## Findings — Informational (8; 2 fixed, 6 no fix needed)

| ID | Skill | Finding | Outcome |
| --- | --- | --- | --- |
| — | expo | Stale "Expo Application Services (EAS)" branding (official docs pages are now titled "Expo Services"; the `eas` CLI and `eas.json` are unchanged) | Fixed: reworded to "Expo Services (EAS)" |
| — | platform-social-images | Discord figures note outdated ("as reported by secondary sources"); official Embed Debugger unmentioned | Fixed: figures verified directly against Discord's official Link Previews docs (updated 2026-11-19); Embed Debugger link added |
| B3-11 | elasticsearch | Java4Shell (CVE-2026-114938) advisory: OpenJDK flaw disclosed 17–18 Nov 2026 affects Elasticsearch 7.17.3+; fixes pending in 8.19.26 / 9.4.10 / 9.5.7 / 9.6.0 as of 19 Nov 2026 | No fix: the skill's existing guidance ("apply patch releases promptly, watch security announcements") already covers this |
| B3-12 | clickhouse | Lightweight UPDATE lifecycle refinement (experimental in 25.7, Beta in 25.8, GA in 26.10 per a secondary source) | No fix: rests on a secondary source only; the skill's existing hedge ("verify its behaviour on your version") already covers it |
| B3-13 | clickhouse | DPsub-based cost-based optimizer default version — sources conflict (one secondary summary says default from 26.10; the official blog says "upcoming 26.11") | No fix: no claim added or changed while sources conflict |
| B3-14 | authjs | Ecosystem context: Better Auth joined Vercel 7 Jul 2026; the July 2026 advisory batch included two critical CVEs fixed in beta.32 | No fix: the skill's guidance stands as written |
| B5-04 | llm-integration | Example field name differs from the official guide (`title: str` vs the guide's `name: str` in the `CalendarEvent` example) | No fix: cosmetic deviation; the example is self-consistent, valid code, and the model identifier and API usage match the guide exactly |
| B5-05 | serp-monitoring | Example API query spans 7 days vs the skill's own one-day guidance | No fix: multi-day ranges are valid API requests and Google's own docs show them; the example demonstrates the request shape, not the pipeline cadence |

## Cross-cutting checks (all 51 skills)

- **Structure:** every skill is a single `SKILL.md` (no `references/`,
  `examples/`, or `scripts/` subdirectories), all under the 500-line
  limit, all with the 15 template sections in order. No missing
  referenced files possible.
- **Frontmatter:** `name` matches the directory in all 51; descriptions
  within limits; `last_verified: "2026-11-20"` already present in
  metadata. `npm run check:frontmatter` PASS (277 skills).
- **Related skills:** every backticked skill name referenced across the
  batch resolves to an existing skill in the registry/tree.
- **Internal links:** no relative file links in the 51 skills; no broken
  internal links. Load-bearing external URLs were spot-checked live.
- **Security:** no unsafe shell commands, no credential leakage, no
  prompt-injection vectors, no fabricated capabilities, no unnecessary
  external dependencies. The injection-related text in `rag`,
  `ai-agents`, and `mcp-security` is defensive guidance and clearly
  framed attack examples, not injectable instructions. The one
  credential-handling defect (inline S3 keys in a ClickHouse example,
  B3-03) is fixed above.
- **Duplication / overlap:** no duplicated skills; no overlap requiring
  consolidation. Adjacent pairs are correctly scoped and cross-reference
  each other instead of repeating content (e.g. `api-client-generation`
  vs `typescript-sdk` / `python-sdk`; `elasticsearch` vs `opensearch`;
  `clerk` vs `supabase-auth` vs `authjs` vs `passkeys`; `content-decay`
  vs `content-refresh`; `mcp-security` vs `mcp-development`).
- **Accessibility (standard element 14):** see the inconsistency note
  below.

## Limitations and follow-ups

- **`platform-social-images` — verified-with-limitations.** Meta's sharing
  documentation returned 403 during verification, so the Facebook figures
  rest on the `og-image-generation` skill plus secondary corroboration;
  X's figures come from its last published card specification (archived
  January 2026) after the Card Validator was retired. These are
  pre-existing limitations, unchanged by this audit. Discord's figures
  were verified directly against official docs during this audit.
- **Standard element 14 (Accessibility) was enforced inconsistently
  across batches.** Batch 2 treated a missing Accessibility subsection as
  a Low finding and added subsections to 9 skills (plus an N/A statement
  for `rust`); batch 5 explicitly judged the absence not a finding,
  noting the library-wide convention (only 14 of 228 original skills
  carry an Accessibility subsection after batch 2's additions). The
  standard (`docs/SKILL-STANDARDS.md`, element 14) requires a subsection
  "where applicable (frontend, media, content, metadata skills)" and an
  N/A statement with a reason otherwise — by that text, batch 2's reading
  is the stricter one and batch 5's skills are also non-conforming. This
  is a standard-clarity problem, not a skill-accuracy problem: recommend
  a library-wide element-14 pass as follow-up work, not a Stage C
  blocker. No skill was held back from `verified` on this basis.
- **Version pins are dated 2026-11-20.** Fast-moving pins (AWS CLI
  2.41.x, gcloud 594.0.0, Pulumi 3.277.0, Terraform 1.17.2, Helm 4.3.2,
  Kubernetes 1.37.2, ClickHouse 26.10.8.34, Nuxt 4.6.4, Expo SDK 58)
  will drift on their normal release cadence and should be re-checked at
  the next audit cycle.
- **Discoverability gaps (A-33, evals).** The Stage C eval work found
  four genuine keyword-retrieval gaps (users who don't already know the
  domain term — "rate limiting", "audit", "unit test", "Dockerfile" —
  may not find the skill via the mock retriever; the stemmer maps
  "Dockerfiles" to a stem that never matches the docker description).
  These are retriever/description gaps, not skill-content errors; they
  are recorded in `ai/remediation/stage-c/evals-results.md` and are not
  counted as findings against the audited skills.
- **Could not verify (recorded, not hidden):** the exact named-collection
  argument form inside `BACKUP … TO S3(…)` (official examples not
  extractable via text fetch — the B3-03 fix uses the fully verified
  `Disk(…)` form instead); exact 26.10 GROUP BY memory numbers from the
  release presentation (could not be re-verified from official docs
  text); the Clerk 401-vs-redirect nuance for Server Actions/Route
  Handlers (two secondary sources, not confirmed in official docs);
  the secondary-source claim that Google's Knowledge Graph Search API
  page carries a "not suitable for use as a production-critical service"
  warning (not confirmed from a direct fetch); the `llm-integration`
  parenthetical that the older `docs.anthropic.com` address redirects
  to `platform.claude.com` (not directly tested).

## Validation

Run from the repo root after all audit fixes were committed:

| Check | Result |
| --- | --- |
| `npm run validate` | PASS with 4 warnings, all pre-existing upstream (informational) |
| `npm run check:frontmatter` | PASS (277 skills) |
| `npm run check:security` | PASS (no findings) |
| `npm run evals` | 463/463 passed, 277/277 skills selected, 0 regressions vs baseline |
| `npm test` | 196/196 passed |

Full battery results are recorded in `ai/remediation/STAGE-C-RESULTS.md`.
