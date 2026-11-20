# Phase 3 Batch 1 Report — core + architecture technical-accuracy audit

- **Batch:** 1 (skills/core, 11 skills; skills/architecture, 9 skills)
- **Auditor:** Phase 3 batch 1 subagent
- **Date verified:** 2026-11-20
- **Branch:** feat/skillforge-production-upgrade (changes left uncommitted)
- **Result:** 20 Verified, 0 Verified with limitations, 0 Needs correction,
  0 Unverified, 0 Blocked
- **Files changed:** 9 of 20 (122 insertions, 19 deletions)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/core`
  and `--filter skills/architecture` both PASS. Longest file in scope is
  224 lines (limit 500). `npm run registry` not run (coordinator-owned).
- **Links:** repo-wide online link check
  (`node scripts/check-links.mjs --online`) PASS — 320 unique external
  URLs verified, 0 errors. martinfowler.com and refactoring.com are
  documented exceptions in that script (hosts block automated checks);
  the Fowler pages this batch links to were spot-verified live via
  browser fetch (DDD Aggregate, Refactoring book page) and are correct
  and on-topic.
- **Cross-references:** every backticked skill reference in the 20 files
  resolves to an existing skill in the repo (231 skills total); no
  dangling references. `auth-security` and `multi-tenancy` both exist.
- **Frontmatter:** all 20 skills already carried
  `metadata.last_verified: "2026-11-20"`, which is the date they were
  verified in this audit, so no frontmatter changes were needed. No
  name/description changes were needed.

## Per-skill table

| skill | status | what was checked | what was fixed | sources used |
| --- | --- | --- | --- | --- |
| clean-code | Verified | TypeScript examples (guard clauses, named constants); links to Refactoring.com, Google TS Style Guide, MDN JS Guide | Nothing — no errors found | Repo online link check (PASS); code read against TS semantics |
| code-review | Verified | Links to Google Engineering Practices review guide and GitHub reviewing-changes docs; example review comments | Nothing — no errors found | Repo online link check (PASS) |
| debugging | Verified | `git bisect` command sequence; Node.js debugging guide, Chrome DevTools, MDN devtools links; regression-test example | Nothing — no errors found | Repo online link check (PASS); git CLI semantics |
| design-patterns | Verified | Strategy and Adapter TypeScript examples; links to Refactoring Guru, Refactoring.com, MDN | Nothing — no errors found | Repo online link check (PASS); code read against TS semantics |
| engineering-standards | Verified | Stack example versions (Node.js, TypeScript, pnpm); SemVer, Conventional Commits, Twelve-Factor, Google Eng Practices links | Prerequisites example updated: Node.js 24 LTS → 26 LTS, TypeScript 5.x → 7.x, pnpm → 12. Added supported-version note: Node 26 LTS current (Active LTS 2026-10-28, supported to 2029-04-30), Node 24 maintenance to 2028-04-30, Node 20/25 EOL; TS 7.x current with 6.x bridge note (compiler-API tooling stays on 6.x until 7.1); pnpm 12 current, 11 supported to 2027-04-30, 10 unsupported | nodejs.org releases page; devblogs.microsoft.com "Announcing TypeScript 6.0" and "Announcing TypeScript 7.0"; pnpm.io blog releases 11.0/12.0; endoflife.date/pnpm |
| performance | Verified | LCP 2.5 s (p75) Core Web Vitals threshold; N+1 example; `performance.now()` example; web.dev, MDN, Chrome DevTools, Node GC-traces links | Workflow target reworded from vague "page interactive in under 2.5 seconds" to "Largest Contentful Paint under 2.5 seconds (p75, real users)". Added INP under 200 ms to the budget example and a note that INP replaced FID as a Core Web Vital in March 2024 (do not target FID) | web.dev/performance (fetched); nodejs.org GC-traces guide (fetched); web.dev Core Web Vitals thresholds |
| refactoring | Verified | Extract-function and characterisation-test examples; links to Refactoring.com, Refactoring Guru, Fowler book page | Nothing — no errors found | Repo online link check (PASS); martinfowler.com/books/refactoring.html (fetched) |
| security | Verified | OWASP Top 10 / Cheat Sheets / ASVS / CWE Top 25 links and editions; Argon2/bcrypt, parameterised-query, session-secret, authorisation examples | Added edition notes to Official Documentation: OWASP Top 10:2025 is current (announced Nov 2025, finalised Jan 2026; replaces 2021) with new A03 Software Supply Chain Failures and A10 Mishandling of Exceptional Conditions, SSRF folded into A01, Security Misconfiguration up to A02; ASVS 5.0.0 current (30 May 2025; 4.0.3 superseded, requirement numbers changed); CWE Top 25 2025 current | devguide.owasp.org Top 10 page; asvs.owasp.org (ASVS 5.0.0, 30 May 2025); OWASP Top 10 2025 change summaries |
| software-architecture | Verified | Mermaid C4 diagram syntax (`C4Context`, `Person`, `System`, `System_Ext`, `Rel`); module dependency-direction example; C4 model, Twelve-Factor, Fowler architecture links | Nothing — no errors found | Repo online link check (PASS); Mermaid C4 syntax |
| tdd | Verified | Vitest import example (`import { test, expect } from "vitest"`); red-green-refactor example; Vitest/Jest/Testing Library/Fowler links | Added supported-version note to Prerequisites: Vitest 5.x current (5.1.x, Nov 2026; requires Node.js 22.12+, dropped Node 20), Jest 30.x current (30.5.x, Sep 2026; removed matcher aliases such as `toBeCalledWith`, requires TS 5.4+); noted `node:test` stable since Node.js 20 as a zero-dependency alternative | npm registry data via version trackers (Vitest 5.1.1, 17 Nov 2026; Jest 30.5.2, 18 Sep 2026); vitest.dev; jestjs.io |
| technical-decision-records | Verified | ADR format, status values, numbering convention, supersede workflow; adr.github.io, joelparkerhenderson repo, Nygard article links | Nothing — no errors found (the four-status limit is the skill's own stated convention, not a claim about the ADR standard) | Repo online link check (PASS) |
| dependency-management | Verified | pnpm commands (`outdated`, `audit`, `update`, `update <pkg>@latest`, `install --frozen-lockfile`); catalog guidance; Renovate/Dependabot/npm-audit links | npm audit link updated from `docs.npmjs.com/cli/v11/...` to `/cli/v12/...` (npm 12 is the current CLI). Added version note to Prerequisites (pnpm 12 current, 11 supported to 2027-04-30, 10 unsupported; npm 12 current but Node-bundled npm is still 11.x — Node 26 ships npm 11.20.0). Added pnpm 11+ supply-chain defaults to Security Considerations (`minimumReleaseAge: 1440`, `blockExoticSubdeps`, `allowBuilds`/`pnpm approve-builds`, `pnpm audit signatures`, `pnpm sbom`) and the npm 12 install-script blocking note | pnpm.io blog releases 11.0/12.0; docs.npmjs.com/cli/v12 (changelog, npm-audit page fetched); endoflife.date/pnpm; Node.js release index (bundled npm versions) |
| domain-driven-design | Verified | Aggregate (`Order`) and value-object (`Money`) TypeScript examples; bounded-context/aggregate/repository guidance; domainlanguage.com and Fowler bliki links | Nothing — no errors found | Repo online link check (PASS); martinfowler.com/bliki/DDD_Aggregate.html (fetched) |
| microservices | Verified | Service-boundary, resilience, observability guidance; Fowler microservices/prerequisites articles and Azure microservices guide links | Nothing — no errors found | Repo online link check (PASS) |
| modular-monolith | Verified | Module layout and public-interface examples; Fowler MonolithFirst/microservices links | Nothing — no errors found | Repo online link check (PASS) |
| monorepo | Verified | Root `package.json` example; workspace/task-runner guidance; pnpm/Turborepo/Nx/npm-workspaces links | Prerequisites: "Node.js 24 LTS is the current line" → Node.js 26 LTS note (Active LTS 2026-10-28, supported to 2029-04-30; Node 24 maintenance to 2028-04-30; Node 20/25 EOL). Root `package.json` example: `"packageManager": "pnpm@10"` → `"pnpm@12"` (pnpm 10 is unsupported). npm workspaces link: generic `docs.npmjs.com/` homepage → `docs.npmjs.com/cli/v12/using-npm/workspaces` (fetched, on-topic). Added pnpm 12 / Turborepo 2.x version ranges | nodejs.org releases page; pnpm.io blog 12.0; endoflife.date/pnpm; docs.npmjs.com/cli/v12/using-npm/workspaces (fetched) |
| package-boundaries | Verified | `exports` map example; `check-boundaries.mjs` script (`globSync` import from `node:fs`, deep-import regex); ESLint/TypeScript/Turborepo links; tree-shaking claim | Rephrased the incorrect "deep imports can defeat tree-shaking" claim — deep imports bypass the public contract and can pull in internal/unbundled modules. Added Node.js version comment to the script (`fs.globSync` added 22.0.0, stable 22.17.0/24.0.0; script requires Node.js 24+). Added ESLint version note to Prerequisites: ESLint 10.x current (Feb 2026), flat config only — eslintrc (`.eslintrc.*`, `.eslintignore`, `ESLINT_USE_FLAT_CONFIG`) removed in v10, ESLint 9 EOL Aug 2026; v10 config lookup starts from the linted file's directory | nodejs.org fs docs (globSync history); eslint.org blog "ESLint v10.0.0 released" and "Migrate to v10.x" |
| pnpm-workspaces | Verified | `pnpm-workspace.yaml` + catalog examples; filter commands (`--filter`, `...` selectors, `-r`); `pnpm add -w -D`, `pnpm dlx`, `pnpm why`, `pnpm -r list --depth -1`; Corepack advice; pnpm docs links | Prerequisites: "Node.js 24 LTS is the current line" → Node.js 26 LTS note; added pnpm version range (12.x current, 11 supported to 2027-04-30, 10 unsupported; pnpm 11 requires Node 22+) and pnpm 12 differences (`--frozen-lockfile false` rejected — use `--no-frozen-lockfile`; unknown `pnpm-workspace.yaml` keys now reported; git deps resolve via canonical HTTPS, never SSH; CI installs default to frozen-lockfile with a non-empty lockfile). Corepack advice corrected: bundled only through Node.js 24 — on Node.js 25+ install it explicitly (`npm install -g corepack`) or install pnpm directly; named `only-allow` as the preinstall-guard package. Catalog example: `typescript: "^5"` → `"^7"` (React `^19` confirmed current, unchanged). Removed redundant `-r` from `pnpm -r --filter "./packages/*" test`. Added pnpm 11+ security defaults to Security Considerations | nodejs.org Corepack docs ("will no longer be distributed starting with Node.js v25"); pnpm.io blog 12.0 and catalogs page (fetched); devblogs.microsoft.com TypeScript 7.0; react.dev/versions (React 19.3 current); pnpm list docs |
| system-design | Verified | Back-of-envelope math recomputed (100k DAU × 20 req = 2M/day ≈ 23 req/s avg, ~70 req/s peak at 3×; 1,000 records/day × 2 KB = 2 MB/day, <1 GB/year — all correct); AWS/Azure Architecture Center, dataintensive.net, Fowler links; `multi-tenancy` cross-reference exists | Nothing — no errors found | Repo online link check (PASS); arithmetic rechecked |
| turborepo | Verified | `turbo.json` example (`$schema`, `tasks`, `dependsOn: ["^build"]`, `outputs`, `persistent`, `cache: false`); `--filter=...[HEAD^1]`, `--dry-run` commands; concurrency claim; caching/config docs links | Fixed wrong claim "Parallelism defaults to the machine's CPU count" → defaults to 10 concurrent tasks (`--concurrency`; `100%` for all logical processors, or the `concurrency` key in `turbo.json`). Added `--affected` flag (Turborepo 2.10+, equivalent to `--filter=...[main...HEAD]`, composable with `--filter`) to the CI workflow step and command examples. Caching link updated to the canonical URL (`/docs/crafting-your-repository/caching`; old `/docs/core-concepts/caching` still serves but is no longer canonical). Added security floor: use 2.9.14+ (CVE-2026-45772, arbitrary code execution via malicious Yarn config in untrusted repos). Added version note to Prerequisites: 2.x current (2.11.x, Nov 2026), 1.x EOL, 3.0 in canary; `tasks` replaced `pipeline` in 2.0; `daemon` option deprecated, removed in 3.0. Prerequisites: Node.js 24 LTS → 26 LTS note | turborepo.dev/docs/reference/run (concurrency default 10; `--affected`); turborepo.dev caching page (fetched; canonical URL in frontmatter); turborepo.dev/blog (2.11 latest stable); CVE-2026-45772 / GHSA-3qcw-2rhx-2726 (fixed in 2.9.14); nodejs.org releases page |

## Notable corrections (cross-cutting)

1. **Node.js 24 LTS is no longer the current line.** Node.js 26
   "Lithium" became Active LTS on 28 October 2026 (supported to 30 April
   2029); Node.js 24 moved to maintenance (EOL 30 April 2028). Four
   skills stated "Node.js 24 LTS is the current line" and were corrected
   (engineering-standards, monorepo, pnpm-workspaces, turborepo).
2. **Corepack is no longer bundled with Node.js 25+.** The
   pnpm-workspaces advice to "use Corepack" would fail on the current
   LTS line; it now says to install Corepack explicitly on Node.js 25+
   or install pnpm directly (per official Node.js Corepack docs).
3. **TypeScript 7.0 is the current stable release** (GA 8 July 2026,
   native Go compiler, 8–12× faster builds); 6.0 (23 March 2026) is the
   bridge release, and 7.0 ships without a stable programmatic API until
   7.1. "TypeScript 5.x" (engineering-standards) and the `typescript:
   "^5"` catalog entry (pnpm-workspaces) were updated to 7.x.
4. **pnpm 12 is current, pnpm 10 is unsupported.** pnpm 12 shipped
   26 August 2026 (Rust rewrite, same commands/flags/lockfile format);
   pnpm 11 is supported until 30 April 2027. The monorepo example pinned
   `pnpm@10` and was corrected to `pnpm@12`.
5. **Turborepo's default concurrency is 10, not the CPU count.**
   Corrected against the official `turbo run` reference.
6. **OWASP Top 10:2025 supersedes the 2021 edition** (finalised January
   2026) and **ASVS 5.0.0 supersedes 4.0.3** (30 May 2025); the security
   skill now names the current editions and the category changes.
7. **ESLint 10 removed eslintrc entirely** (February 2026; ESLint 9 EOL
   August 2026); package-boundaries now states flat config is the only
   format.
8. **npm 12 is the current CLI** (July 2026) and blocks dependency
   install scripts by default, but Node.js still bundles npm 11.x;
   dependency-management and monorepo links moved from v11/generic npm
   docs URLs to v12 pages.

## Blockers

None. All authoritative sources needed were reachable. No skill required
"Needs correction", "Unverified", or "Blocked" status.

## Files changed (9)

- skills/core/engineering-standards/SKILL.md
- skills/core/performance/SKILL.md
- skills/core/security/SKILL.md
- skills/core/tdd/SKILL.md
- skills/architecture/dependency-management/SKILL.md
- skills/architecture/monorepo/SKILL.md
- skills/architecture/package-boundaries/SKILL.md
- skills/architecture/pnpm-workspaces/SKILL.md
- skills/architecture/turborepo/SKILL.md

## Files verified with no changes needed (11)

- skills/core/clean-code/SKILL.md
- skills/core/code-review/SKILL.md
- skills/core/debugging/SKILL.md
- skills/core/design-patterns/SKILL.md
- skills/core/refactoring/SKILL.md
- skills/core/software-architecture/SKILL.md
- skills/core/technical-decision-records/SKILL.md
- skills/architecture/domain-driven-design/SKILL.md
- skills/architecture/microservices/SKILL.md
- skills/architecture/modular-monolith/SKILL.md
- skills/architecture/system-design/SKILL.md
