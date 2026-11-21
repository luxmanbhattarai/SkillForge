# Stage C — Batch 1: Backend + Architecture Skills Audit

**Audited:** 2026-11-20 · **Branch:** `feat/skillforge-production-upgrade` (local only, no commit)
**Scope:** 11 Phase 4 (new) skills — 8 backend, 3 architecture
**Method:** Phase 3 rigor per `ai/audits/TECHNICAL-ACCURACY-AUDIT.md`; 22-element
standard per `docs/SKILL-STANDARDS.md`. Evidence hierarchy: official product
docs > official API references > official GitHub repos/release notes > official
migration guides > recognized standards (IETF, OWASP) > reputable secondary
sources. Version claims checked against current official docs and the npm/PyPI
registries on 2026-11-20. All 11 `SKILL.md` files read in full.

## Cross-cutting checks (all 11 skills)

- **Structure:** each skill directory contains only `SKILL.md` — no
  `references/`, `examples/`, or `scripts/` subdirectories, so no
  missing-referenced-file risk. All files under the 500-line limit
  (199–468 lines after fixes).
- **Frontmatter:** `name` matches the directory in all 11; descriptions
  within limits; `last_verified: "2026-11-20"` already present in metadata.
- **Related skills:** all 30 backticked skill names referenced across the
  batch resolve to entries in `registry/skills.json`.
- **Internal links:** no relative file links; no broken internal links.
- **Security:** no unsafe shell commands, no credential leakage (the
  changesets workflow uses `${{ secrets.* }}` correctly), no prompt-injection
  vectors found.
- **Duplication/overlap:** none needing consolidation. Delineations hold:
  `api-client-generation` (generated clients) vs `typescript-sdk` /
  `python-sdk` (hand-written SDKs); `advanced-api-architecture` (patterns)
  vs `api-design` / `rest-api` (basics); `openapi` (contract) vs
  `api-documentation` (prose docs); `changesets` (tool) vs
  `release-management` (process) vs `changelog-management` (prose);
  `nx` vs `turborepo` / `monorepo` (alternatives, cross-referenced);
  `express` / `fastify` / `nestjs` vs `hono` (framework alternatives,
  each points at the others in When-Not-to-Use).

## Matrix

| Skill | Category | Status | Findings (C/H/M/L/I) | Fixes applied | Recommended verification status |
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

## Findings

### B1-01 — advanced-api-architecture — Medium — FIXED

**Wrong idempotency status code.** The idempotent retry flow said a retry
with the same key but a different body returns `409` Conflict.

- **Evidence:** `skills/backend/advanced-api-architecture/SKILL.md:357-358`
  (pre-fix). Per draft-ietf-httpapi-idempotency-key-header-08, a key reused
  with a different payload returns **422**; `409` is for a retry while the
  original request is still in progress.
  <https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/>
- **Fix:** step 4 now returns `422` Unprocessable Content for the
  different-body case and notes the `409` in-progress case
  (`SKILL.md:357-360`).

### B1-02 — nestjs — Medium — FIXED

**Adapter guidance contradicts official docs.** The skill said to prefer the
default Express adapter unless there is a measured reason to switch.

- **Evidence:** `skills/backend/nestjs/SKILL.md:146-148` (pre-fix). The
  official NestJS HTTP adapters page recommends the `NodeAdapter`
  (`@nestjs/platform-node`) starting with v12.3 — fastest of the three
  adapters, becoming the default in v13.
  <https://docs.nestjs.com/http/performance>
- **Fix:** guidance now prefers `NodeAdapter` for new projects, reserves
  `FastifyAdapter` for Fastify-specific plugins/hooks, and the Express
  adapter for unmovable Express middleware (`SKILL.md:146-153`).

### B1-03 — nestjs — Medium — FIXED

**Missing CLI/generator Node.js floor.** Prerequisites stated only the
runtime floor (20.19+/22.12+). The CLI's generators and schematics need
Node 22.22.3+, 24.15+, or 26+ — a user on Node 20.19 following the skill
would fail at `nest new`.

- **Evidence:** `skills/backend/nestjs/SKILL.md:56-57` and frontmatter
  `compatibility` (line 17). Corroborated by the NestJS 12 migration
  guides and vendor docs, e.g. <https://neon.com/docs/guides/nestjs>.
- **Fix:** added the CLI floor to Prerequisites (`SKILL.md:56-58`) and to
  the frontmatter `compatibility` line (line 17).

### B1-04 — typescript-sdk — Low — FIXED

**Stale tsup version.** The Official Documentation section said "tsup 8.5.1
is the latest release".

- **Evidence:** `skills/backend/typescript-sdk/SKILL.md:86-89` (pre-fix).
  npm registry: latest is **9.0.0** (14 October 2026); 8.5.1 was
  12 November 2025. The "no longer actively maintained" part remains true
  (tsup README). <https://github.com/egoist/tsup>
- **Fix:** version corrected to 9.0.0 with release date
  (`SKILL.md:86-90`).

### B1-05 — python-sdk — Low — FIXED

**Stale mypy version.** The Official Documentation section said "mypy 2.4.0
is current".

- **Evidence:** `skills/backend/python-sdk/SKILL.md:94` (pre-fix). PyPI:
  latest is **2.4.1** (28 October 2026). <https://pypi.org/project/mypy/>
- **Fix:** corrected to 2.4.1.

### B1-06 — python-sdk — Low — FIXED

**Stale hatchling floor.** `hatchling >= 1.26` appeared in Implementation
Standards and in the example `pyproject.toml`.

- **Evidence:** `skills/backend/python-sdk/SKILL.md:146, 323` (pre-fix).
  1.26 is a November 2024 floor; 1.26.0–1.26.2 are yanked, and **1.33.0**
  (27 October 2026) is the first release with official Python 3.15 support.
  <https://hatch.pypa.io/dev/history/hatchling/>
- **Fix:** floor raised to `>= 1.33` in both places.

### B1-07 — python-sdk — Low — FIXED

**Paginator example skipped error handling.** `list_orders` called `.json()`
on the response without checking the status code, while `get_order` in the
same example raises the typed `OrdersError` on 4xx/5xx — inconsistent with
the skill's own typed-error model and its Validation Checklist ("Errors are
typed and carry status, code, and request ID").

- **Evidence:** `skills/backend/python-sdk/SKILL.md:400` (pre-fix);
  contrast `get_order` at `SKILL.md:382-391`.
- **Fix:** `list_orders` now checks `status_code >= 400` and raises the
  same typed `OrdersError` before parsing (`SKILL.md:400-408`).

### B1-08 — changesets — Low — FIXED

**Release workflow omitted the `permissions:` block.** The example GitHub
Actions workflow had no job permissions, so the Version Packages PR and
publishing steps can fail on repositories with restrictive default
`GITHUB_TOKEN` permissions.

- **Evidence:** `skills/architecture/changesets/SKILL.md:186-190`
  (pre-fix). The official changesets/action README lists job permissions
  `contents: write` and `pull-requests: write` as requirements.
  <https://github.com/changesets/action>
- **Fix:** added the `permissions:` block to the `release` job
  (`SKILL.md:190-192`).

### B1-09 — changesets — Low — FIXED

**Unverified mechanism claim.** The skill claimed "CLI 2.x misreads npm 12's
`npm info --json` output and can attempt to republish existing versions".
A targeted search found no confirmation of this specific mechanism in
official docs, release notes, or issue trackers.

- **Evidence:** `skills/architecture/changesets/SKILL.md:127` (pre-fix).
  The actionable recommendation (use v3) is correct and stands on its own:
  CLI v3.0.3 is current and pairs with `changesets/action@v2`.
  <https://changesets.dev/guide/cli>
- **Fix:** reworded to the verifiable statement that CLI v3 is the
  supported line, pairs with `changesets/action@v2`, and v2-era setups
  should upgrade rather than mix majors. The unverified npm-12 mechanism
  claim is removed; it is recorded here rather than silently dropped.

### B1-10 — express — Low — FIXED

**Codemod recipe unnamed.** Best Practices said to "use the published
codemod recipe" without naming it, leaving the reader to guess.

- **Evidence:** `skills/backend/express/SKILL.md:179-182` (pre-fix). The
  recipe is `npx codemod@latest @expressjs/v5-migration-recipe` (the older
  `@expressjs/codemod` package is deprecated).
  <https://expressjs.com/en/guide/migrating-5.html>
- **Fix:** the exact command is now named in the bullet
  (`SKILL.md:179-183`).

### B1-11 — api-client-generation — Low — FIXED

**Imprecise Node.js floor for TypeScript generators.** Prerequisites said
"the TypeScript generators need Node.js 22.13 or newer" as a blanket
statement.

- **Evidence:** `skills/backend/api-client-generation/SKILL.md:60-62`
  (pre-fix). npm registry engines fields: orval requires
  `node >= 22.18.0` (a user on 22.13–22.17 would fail); hey-api requires
  22.13+ (since v0.96.0); openapi-typescript declares no engines floor.
  <https://heyapi.dev/openapi-ts/>
- **Fix:** per-generator floors stated (`SKILL.md:60-64`).

## Verified claims (spot-check record)

Key version and behavior claims confirmed against official sources on
2026-11-20 (no action needed):

- **advanced-api-architecture:** OWASP API Security Top 10 2023 still the
  current API edition (no 2024/2025/2026 API edition); Idempotency-Key
  still an Internet-Draft (rev -08, 22 Oct 2026), not an RFC.
- **api-client-generation:** OpenAPI Generator 7.27.0 (2 Nov 2026), Java 11
  minimum; orval 8.48.0 (14 Nov 2026); Orval CVEs CVE-2026-96754/96755/96759
  (CVSS 9.8, Sept 2026) real, fixed in 8.28.0/8.29.0/8.30.0, so the skill's
  "8.30.0 or later" advice is correct; Hey API 0.99.0; openapi-typescript
  7.13.0; OpenAPI 3.2.1 (10 Sept 2026) latest; `orval --outdated` flag real.
- **express:** 5.3.0 (9 Oct 2026) latest stable; CVE fixes in qs ^6.16.0,
  proxy-addr ^2.0.8 (CVE-2026-90711), body-parser ^2.3.0 (CVE-2026-12590);
  helmet 8.3.0, express-rate-limit 8.7.5 current.
- **fastify:** 5.12.8 current; CVE-2026-120216 / GHSA-3qgw-9275-xf8w
  confirmed exactly (5.8.0–5.12.7 affected, streaming response + nonzero
  `handlerTimeout`, fixed in 5.12.8); Fastify v4 EOL 2025-06-30.
- **nestjs:** TypeScript 6.x pin **confirmed still required** — `nest build`
  refuses TypeScript 7.0.2 and the 7.1 beta (no programmatic compiler API
  in 7.0; 7.1 beta's new `typescript/sync` / `typescript/async` API is not
  yet used by the Nest CLI); `nest upgrade` exists (CLI 12, alias
  `update`); `nest new --minimal` exists; Standard Schema validation
  supported; @nestjs/core 12.6.0 current.
- **openapi:** Spectral 6.17.1 (6 Nov 2026) current, lints OAS 2/3.0/3.1/3.2;
  Stoplight's standalone Spectral docs site defunct (meta.stoplight.io URL
  returns 404); Redocly CLI 2.x current, ESM-only (`"type": "module"`),
  Node 22.12+ or 20.19+; Prism CLI 5.16.0; OpenAPI 3.2 adds QUERY method,
  streaming, hierarchical tags, `deviceAuthorization` (RFC 8628).
- **python-sdk:** Python 3.15.2 (25 Oct 2026) current stable; 3.10 EOL
  1 Oct 2026; pytest 9.2.0 (27 Oct 2026); `uv publish --dry-run` exists;
  PEP 639 `license = "MIT"` string form correct.
- **typescript-sdk:** tsdown staged migration confirmed exactly per
  official docs (migrate on v0.22.14, resolve deprecation warnings, then
  upgrade to v0.23+); tsup 9.0.0 declares Node >= 22.18; TypeScript 7.0.2
  current, `@typescript/typescript6` 6.0.2 available side by side.
- **changesets:** CLI 3.0.3 and `changesets/action@v2` current (action
  main branch is v2, compatible with Changesets v3; v1 on
  `maintenance/v1`); `changeset add --major/--minor/--patch`,
  `-m/--message`, `version --snapshot`, `publish --tag`, `pre enter/exit`,
  `status` exit code 1 all confirmed; Node `^22.11 || ^24 || >= 26`,
  pnpm 10+, npm 10.9+, Yarn 4.5.2+ confirmed; `pnpm/action-setup@v4`
  current. (Task note "action should be v7" resolves to the
  `actions/checkout@v7` / `actions/setup-node@v7` versions in the workflow
  example, which the skill already uses; `changesets/action` itself is
  correctly v2.)
- **nx:** 24.0.6 (10 Nov 2026) latest stable; v24 released 2026-10-21;
  v23/v22 in LTS; Ultracache (Nx 24.0.0+, Nx Cloud Workers only);
  "18 months total support" consistent with official policy (6 months
  current + 12 months LTS); 24.0.3 undici 7.30.1 bump confirmed
  (nrwl/nx#37685, #37331); 24.0.4 "only serve the graph to local
  same-origin requests" confirmed (nrwl/nx#37668).
- **release-management:** process skill, no version claims; all linked
  sources (semver.org, keepachangelog.com, changesets.dev, GitHub and npm
  docs) live and correctly characterized.

## Unverifiable items

None remaining. The single unverified claim found during the audit (the
changesets CLI 2.x / npm 12 mechanism, B1-09) was removed and replaced with
a verifiable statement; the fix is recorded above rather than treated as
confirmed.

## Batch totals

- **Skills audited:** 11 (8 backend, 3 architecture)
- **PASS:** 4 (fastify, openapi, nx, release-management)
- **FIXED:** 7 (advanced-api-architecture, api-client-generation, express,
  nestjs, python-sdk, typescript-sdk, changesets)
- **NEEDS-REVIEW:** 0
- **Findings:** 11 total — 0 Critical, 0 High, **3 Medium, 8 Low**,
  0 Informational
- **Fixes applied:** 11 (all findings fixed in place)
- **Files changed:** 7 `SKILL.md` files (see diff summary below)
- **Recommended verification status:** all 11 skills **verified**

### Files changed

| File | Change |
| --- | --- |
| `skills/backend/advanced-api-architecture/SKILL.md` | B1-01: 422/409 idempotency fix (+2 lines) |
| `skills/backend/api-client-generation/SKILL.md` | B1-11: per-generator Node floors (+2 lines) |
| `skills/backend/express/SKILL.md` | B1-10: codemod command named (+1 line) |
| `skills/backend/nestjs/SKILL.md` | B1-02, B1-03: adapter guidance + CLI Node floor (+5 lines) |
| `skills/backend/python-sdk/SKILL.md` | B1-05, B1-06, B1-07: mypy, hatchling, paginator (+8 lines) |
| `skills/backend/typescript-sdk/SKILL.md` | B1-04: tsup 9.0.0 (net 0 lines) |
| `skills/architecture/changesets/SKILL.md` | B1-08, B1-09: permissions block + claim reword (+3 lines) |

No commits made; no files outside the 11 skill directories touched except
this fragment. `sources/verification-status.json`, `registry/`,
`ai/PROJECT-STATUS.md`, and `ai/remediation/ISSUE-REGISTER.md` were not
modified — status updates are left to the coordinator.
