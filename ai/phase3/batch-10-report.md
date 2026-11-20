# Phase 3 — Batch 10 Audit Report: Upstream Skills (AUDIT-ONLY)

- **Auditor:** Phase 3 batch 10 (upstream) subagent
- **Date:** 2026-11-20
- **Working copy:** `/home/hatch/workspace/SkillForge-upgrade`, branch `feat/skillforge-production-upgrade`
- **Scope:** `skills/upstream/` only — 49 skills, 6 vendors (anthropic 8, vercel 8, superpowers 13, prisma 11, marketingskills 8, agentic-seo 1). 588 files; 10,399 lines across the 49 SKILL.md files.
- **Method:** Every SKILL.md read in full. Internal-link audit over all `skills/upstream/**/*.md`. File-existence checks for prose-referenced files, scripts, and reference directories. Version-specific, API, CLI, and config claims verified against official docs / release notes / official repos via web search and page fetch. `npm run validate` run twice (before and after verification) — same 11 warnings both times.
- **Rules observed:** No file under `skills/upstream/` was modified, created, or deleted. No commit, push, merge, PR, or branch switch. `npm run registry` was not run. Nothing outside `skills/upstream/` was touched. This report file is the only write.

## Status counts

| Status | Count |
|---|---|
| Verified | 30 |
| Verified with limitations | 13 |
| Needs correction | 6 |
| Unverified | 0 |
| Blocked | 0 |
| **Total** | **49** |

"Needs correction" covers one substantive version error (prisma-upgrade-v7), one substantively outdated skill (agentic-seo/seo), and four minor content errors (stale React version claim, one bad code example, broken links inside compiled AGENTS.md files). All fixes belong upstream — upstream skills are imported verbatim and are never edited in SkillForge.

## Per-skill table

| Skill | Vendor | Status | What was checked | Errors found (evidence + upstream fix venue) | Sources used |
|---|---|---|---|---|---|
| brand-guidelines | anthropic | Verified | Full read; palette hex values and typography claims checked against the official skill content and secondary mirrors of the official repo. | None. Note: Anthropic publishes no separate public brand guide; the first-party skill in github.com/anthropics/skills is itself the authoritative source. | anthropics/skills (official repo); open-design.ai, freetoolsforweb.com mirrors |
| doc-coauthoring | anthropic | Verified | Full read; workflow guidance; internal links; validator 'placeholder text' warning context (SKILL.md:132,139,148,188 — legitimate instruction to draft placeholder text). | None (validator warning is a false positive — see §Validator warnings). | Skill files |
| frontend-design | anthropic | Verified | Full read; design guidance; internal links; referenced files exist. No falsifiable technical claims found to be wrong. | None. | Skill files |
| mcp-builder | anthropic | Verified | Full read; `reference/node_mcp_server_v2.md` checked line-by-line against the official MCP TS SDK v2 API: `@modelcontextprotocol/server`, `serveStdio`, `registerTool`, `createMcpHandler`, `zod/v4`, Zod 4, Node 20+. v1→v2 migration table and codemod claim checked. | None. | Official typescript-sdk README / ts.sdk.modelcontextprotocol.io/v2; MCP 2026-07-28 spec |
| skill-creator | anthropic | Verified | Full read; referenced scripts/, eval-viewer, agents/, assets/, references/ all exist; internal links resolve. | None. | Skill files |
| theme-factory | anthropic | Verified | Full read; themes/ directory and referenced PDF exist; internal links resolve. | None. | Skill files |
| web-artifacts-builder | anthropic | **Needs correction** (minor) | Full read; `scripts/init-artifact.sh` inspected; shadcn tarball contents counted (43 `.tsx` files). Tailwind 3.4.1 pin confirmed in script. | **Stale React version:** SKILL.md:16 says "Stack: React 18 + …" but the init script runs unpinned `pnpm create vite --template react-ts`, which installs React 19 today (current create-vite). Fix venue: github.com/anthropics/skills. | init-artifact.sh; create-vite current behavior |
| webapp-testing | anthropic | Verified | Full read; testing guidance; internal links. | None technical. Trivial typo only: "abslutely" (SKILL.md, "…is abslutely necessary"). Fix venue: github.com/anthropics/skills. | Skill files |
| deploy-to-vercel | vercel | Verified | Full read; CLI commands checked against official Vercel docs/changelog, incl. `vercel deploy --temporary`. | None. | vercel.com changelog 2026-10-22; Vercel CLI docs |
| vercel-cli-with-tokens | vercel | Verified with limitations | Full read; every CLI command checked: `vercel inspect --logs` (v35+ requirement confirmed exactly by official Vercel changelog), `vercel ls`, `vercel logs`, `vercel deploy`, `vercel env`. Pro plan figures checked against pricing page and docs. | No errors. **Limitation / documented discrepancy:** the skill's Pro-plan 10M CDN/Edge-requests figure matches Vercel's pricing page, but Vercel's Flat Rate CDN docs describe the included tier as 1M requests (reported Nov 2026). Treat the 10M figure as pricing-page-accurate with a docs discrepancy noted. | vercel.com changelog; Vercel pricing page; Vercel Flat Rate CDN docs; stork.ai, software-lifecycle.com (Nov 2026) |
| vercel-composition-patterns | vercel | **Needs correction** (minor) | Full read of SKILL.md; AGENTS.md headings read + examples grepped. Composition API usage checked. | **Bad code example in AGENTS.md §2.3:** the "Correct" example calls `use(Composer.Context)` but the `Composer` object defined in the examples (line 224) exports no `Context` member — the example does not run as written. Also `use(ComposerContext)` destructures a possibly-null context value without a null check (example sloppiness). Fix venue: github.com/vercel-labs/agent-skills. | AGENTS.md:187, 224, 681 |
| vercel-optimize | vercel | Verified with limitations | Full read; all 15 scripts/ and lib/ inspected; CLI commands checked: `vercel metrics`, `vercel usage`, `vercel contract`, `vercel api` all real. `references/docs-library.json` inspected (99 URLs, 13 rule refs). | No errors. **Limitations:** (1) `vercel usage` is now grouped under `vercel billing usage` (Vercel changelog, ~2026-11-19); the old name still works as an alias, so the skill's usage remains valid but is no longer the canonical name. (2) docs-library.json `lastVerified` is 2026-05-26 — ~6 months old; the citation allow-list is aging. | vercel.com changelog (Billing CLI, Nov 2026; billing/usage API, 2026-02-19); docs-library.json |
| vercel-react-best-practices | vercel | **Needs correction** (minor) | Full read; "70 rules" claim counted: rules/ has 72 files incl. `_sections.md` and `_template.md` = 70 rule files — claim checks out. AGENTS.md link-checked. | **3 broken links in AGENTS.md:** `./async-defer-await.md`, `./async-cheap-condition-before-await.md`, `./server-hoist-static-io.md` — the files live in `rules/`, so the links are wrong (SKILL.md links correctly to `rules/...`). Fix venue: github.com/vercel-labs/agent-skills. | Link audit; AGENTS.md; rules/ listing |
| vercel-react-view-transitions | vercel | **Needs correction** (minor) | Full read; React 19.3 `<ViewTransition>`/`addTransitionType` (stable 2026-09-09), Next.js 16.2 `transitionTypes` on `<Link>`, Next.js 16.3 deletion of `experimental.viewTransition`, Next.js 16.4 shipping React 19.3 all confirmed against official docs/release notes. AGENTS.md link-checked. | **~29 broken links in AGENTS.md** to bare `css-recipes.md`, `patterns.md`, `troubleshooting.md`, `nextjs.md`, `implementation.md`, `../SKILL.md` — the files live in `references/`, so the links are wrong (SKILL.md links correctly). **Stale framing (minor):** "the App Router already bundles React canary internally" — Next.js 16.4 ships stable React 19.3; the operative advice (do not install react@canary) remains correct. Fix venue: github.com/vercel-labs/agent-skills. | Link audit; react.dev blog 2026/09/09; react/react PR #31975; nextjs.org Link docs (updated 2026-11-18) |
| web-design-guidelines | vercel | Verified | Full read; design guidance; internal links; no incorrect technical claims found. | None. | Skill files |
| writing-guidelines | vercel | Verified | Full read; style guidance; internal links; no incorrect technical claims found. | None. | Skill files |
| brainstorming | superpowers | Verified | Full read; process skill; internal links resolve; no technical claims to dispute. | None. | Skill files |
| diagnosing-superpowers | superpowers | Verified | Full read; referenced files exist (references/session-discovery.md, templates/, prompts/ — 19 supporting files). | None. | Skill files |
| dispatching-parallel-agents | superpowers | Verified | Full read; process skill; internal links resolve. | None. | Skill files |
| executing-plans | superpowers | Verified with limitations | Full read; workflow guidance correct as written. | No content errors. **Limitation (import-scope gap):** names `superpowers:test-driven-development` as a REQUIRED sub-skill/background and references `superpowers:systematic-debugging`; neither skill is among the 13 imported superpowers skills, so the required workflow step has no local target. Fix venue (import scope): SkillForge import decision, not the upstream repo. | Skill files; skills/upstream/superpowers/ listing |
| finishing-a-development-branch | superpowers | Verified | Full read; git workflow guidance; internal links resolve. | None. | Skill files |
| receiving-code-review | superpowers | Verified | Full read; process skill; internal links resolve. | None. | Skill files |
| requesting-code-review | superpowers | Verified | Full read; process skill; internal links resolve. | None. | Skill files |
| subagent-driven-development | superpowers | Verified | Full read; process skill; internal links resolve. | None. | Skill files |
| using-git-worktrees | superpowers | Verified | Full read; git worktree commands checked against git conventions; internal links resolve. | None. | Skill files; git docs (conventions) |
| using-superpowers | superpowers | Verified with limitations | Full read; index/orientation skill; internal links resolve. | No content errors. **Limitation (import-scope gap):** references `superpowers:systematic-debugging`, which was not imported. | Skill files; skills/upstream/superpowers/ listing |
| verification-before-completion | superpowers | Verified | Full read; process skill; internal links resolve. | None. | Skill files |
| writing-plans | superpowers | Verified | Full read; validator 'TBD' warning context checked (SKILL.md:159 — "TBD" appears in prose as an example of a line that decides nothing). | None (validator warning is a false positive — see §Validator warnings). | Skill files |
| writing-skills | superpowers | Verified with limitations | Full read; skill-authoring guidance correct. Referenced scripts/ and references/ inspected. | No errors in SKILL.md. **Limitations:** (1) names `superpowers:test-driven-development` as REQUIRED background; not imported. (2) `references/anthropic-best-practices.md` has **16 broken relative links** (FORMS.md, REFERENCE.md, EXAMPLES.md, reference/finance.md, reference/sales.md, reference/product.md, reference/marketing.md, DOCX-JS.md, REDLINING.md, OOXML.md, advanced.md, details.md, reference.md, examples.md) to Anthropic example-skill files not present in this import. Fix venue: upstream superpowers repo (vendor the files or fix the links). | Link audit; skill files |
| prisma-cli | prisma | Verified | Full read; `prisma dev`, `prisma mcp`, `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` (consent check since 6.15.0), `--accept-data-loss` (since 7.9.0) all confirmed real. Prisma 8 CLI gaps (no `generate`/`migrate dev`/`db push`, CLI.UNKNOWN_COMMAND) confirmed. | None. | Official Prisma docs; Prisma release-status page |
| prisma-client-api | prisma | Verified | Full read; client API surface checked against official Prisma 7/8 docs. | None. | Official Prisma docs |
| prisma-compute | prisma | Verified with limitations | Full read; version pins checked against official release-status page (2026-11-16). | No errors. **Limitation:** verified against Prisma 8 RC pins (rc.21/rc.23, Composer 0.30.0); official page now lists newer RCs (prisma 8.0.0-rc.34). Skill frames versions as time-sensitive and tells readers to check installed versions, so this is drift, not error. | Prisma release-status page (2026-11-16) |
| prisma-database-setup | prisma | Verified | Full read; setup commands checked against official Prisma docs. | None. | Official Prisma docs |
| prisma-driver-adapter-implementation | prisma | Verified | Full read; adapter API checked against official Prisma docs. | None. | Official Prisma docs |
| prisma-mongodb-upgrade | prisma | Verified with limitations | Full read; claims checked against the official Prisma MongoDB guide: `prisma orm init` exists (`npx prisma@latest orm init --yes --target mongodb --authoring psl`); Prisma 7 has no MongoDB connector; Prisma 8 MongoDB has no `$transaction` yet. | No errors. **Limitation:** verified against `@prisma/orm-mongo` 8.0.0-rc.13; official page now lists rc.24. Prisma 8 is still an RC (GA was "expected in October 2026" but not reached as of 2026-11-16). | Official Prisma MongoDB guide; Prisma release-status page |
| prisma-orm-setup | prisma | Verified | Full read; setup commands checked against official Prisma docs. | None. | Official Prisma docs |
| prisma-postgres | prisma | Verified | Full read; Prisma Postgres claims checked against official docs. | None. | Official Prisma docs |
| prisma-postgres-setup | prisma | Verified | Full read; setup commands checked against official Prisma docs. | None. | Official Prisma docs |
| prisma-postgres-upgrade | prisma | Verified with limitations | Full read; version pins checked against official release-status page. | No errors. **Limitations:** pins `prisma 8.0.0-rc.27` / `@prisma/orm-postgres 8.0.0-rc.20` "today"; current RCs are rc.34 / rc.24. The claim that "the latest pair does not work with the Composer version the Console's setup installs" may also be stale — Prisma docs now say "Install both at latest; any two latest versions work together." | Prisma release-status page (2026-11-16); official Prisma docs |
| prisma-upgrade-v7 | prisma | **Needs correction** | Full read; every version/requirement claim checked against official Prisma docs and the release-status page. Node 20.19.0+ / TS 5.4.0+ requirements confirmed correct (official To-v7 guide). ESM, `prisma-client` generator, `prisma.config.ts`, driver-adapter requirements confirmed. | **Stale version claim:** "Latest stable Prisma ORM version: 7.6.0" is wrong — the official release-status page lists `@prisma/client` latest at 7.10.1 (checked 2026-11-16); 7.10.0/7.10.1 exist. Frontmatter metadata version "7.6.0" is also stale. **Possible further staleness (secondary source, flag for upstream):** Neon docs state Prisma 7.10+ creates `prisma7.config.ts` instead of `prisma.config.ts`. Fix venue: github.com/prisma/skills. | Prisma release-status page; docs.prisma.io To-v7 guide; neon.com docs (secondary) |
| ai-seo | marketingskills | Verified with limitations | Full read; all 16 reference files exist and links resolve. Brave/Claude claim, GPT-5.6 dating, OKF claim, submit-url tool, and citation-shift figures investigated. | No flat errors. **Limitations:** (1) Brave Search is on Anthropic's subprocessor list as "Web Search" since 2025-03-19 (confirmed), but the pipeline is composite, not Brave-only: as of 2026-10-24 the list also names Parallel Web Systems and turbopuffer for web search, and image results come from Bing. (2) GPT-5.6 launched 2026-07-09 (GA); the skill's "ChatGPT 5.6 (Aug 2026)" framing is roughly right, but the citation-shift percentages (−50.5% listicles, −32.1% comparisons) are vendor data not independently verified. (3) At the 500-line limit — see §Validator warnings. **Confirmed correct:** OKF June 2026 claim (Google Cloud blog, 2026-06-12, "introducing the Open Knowledge Format (OKF)"); `search.brave.com/submit-url` re-fetch tool exists (confirmed via multiple secondary sources; direct fetch failed — see §Blockers). | Anthropic subprocessor list; Google Cloud blog 2026-06-12; discoverability.co, naughtonandbird.com, toponseek.com; OpenAI GPT-5.6 launch coverage |
| analytics | marketingskills | Verified | Full read; GA4 claims checked: default channel grouping (mediums newsletter/creator/podcast/community → Unassigned; only affiliate and email map to a default channel) consistent with GA4 docs; `sign_up` is a GA4 recommended event; UTM case-sensitivity correct. | None. | GA4 docs (as understood); skill files |
| competitor-profiling | marketingskills | Verified with limitations | Full read; profiling methodology; internal links resolve. | No content errors. **Limitation (import-scope gap):** Related Skills sections reference unimported marketingskills siblings (e.g. competitors, content-strategy). Only 8 marketingskills skills were imported. | Skill files; skills/upstream/marketingskills/ listing |
| copy-editing | marketingskills | Verified | Full read; editing guidance; internal links resolve. | None. | Skill files |
| cro | marketingskills | Verified with limitations | Full read; CRO guidance; internal links resolve. | No content errors. **Limitation (import-scope gap):** Related Skills reference unimported siblings (ab-testing, conversion-tracking, attribution, etc.). | Skill files |
| link-building | marketingskills | Verified with limitations | Full read; link-building guidance; internal links audited. | No content errors. **Limitation (import-scope gap, real):** 6 broken relative links to `../../tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}.md` — the `tools/` directory was not imported. Validator warnings 4–9 confirmed genuine. | Link audit; validator output |
| schema | marketingskills | Verified | Full read; schema guidance checked against Google Search Central history: FAQ rich results stopped 2026-05-07, docs removed 2026-06-15 — stated correctly; HowTo rich results retired Sept 2023 and sitelinks search box retired Nov 2024 — stated correctly. | None. (This skill is correct where agentic-seo/seo contradicts it on FAQ — see below.) | Google Search Central changelog (via secondary coverage); skill files |
| site-architecture | marketingskills | Verified with limitations | Full read; architecture guidance; internal links audited. | No content errors. **Limitation:** broken link `/features/analytics` (validator warning 10) — an illustrative example anchor in the Internal Linking Strategy table, not a repo file. Accurate observation, low severity. | Link audit; validator output |
| seo | agentic-seo | **Needs correction** | Full read of SKILL.md plus resources/: 15 sub-skill files, reference files, `resources/schema/templates.json`, `scripts/pagespeed.py`. CWV thresholds verified correct (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; FID removed 2024-09-09). PageSpeed Insights API v5 usage verified (keyless works, rate-limited; script handles it). | **Multiple errors:** (1) **Outdated FAQ rule (Critical Rule 2 + `resources/references/schema-types.md:50-52`):** "FAQPage schema is limited to government and healthcare authority sites only (August 2023)" — Google stopped showing FAQ rich results for ALL sites on 2026-05-07 and removed the docs 2026-06-15. Directly contradicts marketingskills/schema, which states the removal correctly. (2) **Count inconsistency:** intro says "12 specialized sub-skills" but the command table lists 15 and `resources/skills/` contains 15 files. (3) **Placeholder links in `resources/skills/seo-geo.md:152-153`:** literal placeholder links (link text `Page title` / `Another page`, target `url`). (4) **Retired-feature template:** `resources/schema/templates.json:363-370` ships a WebSite+SearchAction template "for sitelinks search box in Google" — the sitelinks search box was retired Nov 2024. (5) **Self-freshness rule violated (Rule 13):** only 3 of 19 reference/sub-skill files carry the required `<!-- Updated: -->` comment, all dated 2026-02-07 — over 90 days old as of this audit, and the skill's own rule says files older than 90 days should be flagged. (6) **E-E-A-T overstatement (Rule 5):** "As of December 2025, E-E-A-T applies to ALL competitive queries, not just YMYL" — Google's own guidance still frames the extra E-E-A-T weight as YMYL-focused and E-E-A-T as not a specific ranking factor; secondary analysis describes heightened expectations beyond YMYL, but the skill states a vendor interpretation as a Google fact. Fix venue: upstream agentic-seo repo. | Google Search Central changelog (via multiple secondary sources); schema-types.md; templates.json; seo-geo.md; cwv-thresholds.md; pagespeed.py |

## Cross-cutting findings

### Internal-link audit (all `skills/upstream/**/*.md`)

54 missing relative links found in total. Breakdown:

- **vercel-react-view-transitions AGENTS.md:** ~29 broken links (files live in `references/`; links point at bare filenames). Upstream content error.
- **writing-skills `references/anthropic-best-practices.md`:** 16 broken links to Anthropic example-skill files not present in this import. Import-scope gap / upstream link error.
- **link-building SKILL.md:** 6 broken links to unimported `tools/integrations/*.md`. Import-scope gap (validator warnings 4–9).
- **vercel-react-best-practices AGENTS.md:** 3 broken links (files live in `rules/`). Upstream content error.
- **site-architecture SKILL.md:** 1 broken link `/features/analytics` (illustrative example). Low severity (validator warning 10).

All other SKILL.md files link cleanly; all prose-referenced supporting files checked exist (anthropic skill-creator scripts/eval-viewer/agents/assets/references, mcp-builder reference/, web-artifacts-builder scripts, theme-factory themes/ + PDF, superpowers scripts/references, marketingskills dirs, prisma references, vercel-optimize lib/).

### Import-scope gaps (not upstream content errors)

Cross-skill references point at skills that were not imported into SkillForge:

- **superpowers:** `executing-plans` and `writing-skills` name `superpowers:test-driven-development` as REQUIRED; `executing-plans` and `using-superpowers` reference `superpowers:systematic-debugging`. Neither is among the 13 imported superpowers skills.
- **marketingskills:** Related Skills sections reference many unimported siblings (seo-audit, content-strategy, competitors, programmatic-seo, copywriting, lead-magnets, ab-testing, conversion-tracking, attribution, revops, public-relations, directory-submissions, referrals, community-marketing, cold-email, marketing-loops, signup, onboarding, popups, free-tools, sales-enablement, prospecting, customer-research, reverse-engineer-marketing, ads, pricing, marketing-plan, launch, influencer-marketing, etc.). Only 8 were imported, and the `tools/` directory was not imported at all (hence the 6 broken link-building links).

These are SkillForge import-scope decisions, not upstream defects; recorded here so the coordinator can decide whether to import more or accept the gaps.

### Version drift on Prisma 8 RC skills (limitations, not errors)

Prisma 8 is still a release candidate as of 2026-11-16 (GA was "expected in October 2026" but not reached); `prisma@latest` installs the 8 RC since August 2026. The RC skills pin versions that have since moved (prisma 8.0.0-rc.34, `@prisma/orm-postgres` rc.24, `@prisma/orm-mongo` rc.24 on the official release-status page, vs. rc.27/rc.20/rc.13/rc.21/rc.23 pinned in the skills). Each skill frames versions as time-sensitive and tells the reader to check installed versions, so these are recorded as limitations, not errors.

### Vercel platform drift notes (limitations, not errors)

- **Turbo build machines:** the 30 vCPUs / 60 GB spec is confirmed (Vercel changelog), but newer sources (Nov 2026) say new Pro accounts now default to **Elastic** build machines (4–30 vCPUs, 8–60 GB), which replaced Turbo as the default. Any skill stating Turbo is "default for new projects" is stale on the default, correct on the spec.
- **`vercel usage` → `vercel billing usage`:** Vercel grouped billing commands under `vercel billing` (~2026-11-19 changelog); old names continue as aliases, so existing usage still works.

## Assessment of the 11 validator warnings

`npm run validate` was run twice on 2026-11-20 (before and after verification); output identical both times: **PASS with exactly these 11 warnings.** Each was individually confirmed:

| # | Warning | Assessment |
|---|---|---|
| 1 | `agentic-seo/seo/SKILL.md`: 'placeholder text' | **False positive.** The phrase appears legitimately in pre-commit checks: "Checks staged HTML files for: placeholder text in schema…" (SKILL.md:264) and "Validates JSON-LD blocks… placeholder text…" (:270). Not a placeholder in the skill itself. |
| 2 | `anthropic/doc-coauthoring/SKILL.md`: 'placeholder text' | **False positive.** Legitimate instruction to create placeholder text like "[To be written]" while drafting (SKILL.md:132, 139, 148, 188). |
| 3 | `marketingskills/ai-seo/SKILL.md`: 501 lines (max 500) | **Genuinely at/over the limit by the validator's count.** `wc -l`/`awk` count 500 lines; the file ends with a trailing newline, so a split-on-newline count yields 501. Either way the file is at the limit and cannot grow. |
| 4–9 | `marketingskills/link-building/SKILL.md`: 6 broken relative links to `../../tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}.md` | **Genuine — real import-scope gap.** The `tools/` directory was not imported. The links are real references to upstream sibling files. |
| 10 | `marketingskills/site-architecture/SKILL.md`: broken link `/features/analytics` | **Accurate observation, low severity.** An illustrative example anchor in the Internal Linking Strategy table, not a repo file. |
| 11 | `superpowers/writing-plans/SKILL.md`: 'TBD' | **False positive.** "TBD" appears in prose as an example of a line that decides nothing (SKILL.md:159). |

Summary: 3 false positives (#1, #2, #11), 1 borderline length hit (#3), 6 genuine broken links from an import-scope gap (#4–9), 1 accurate low-severity observation (#10). No warning indicates an upstream content error except insofar as #4–9 reflect the unimported `tools/` directory.

## Blockers

- **`browser.open` of `https://search.brave.com/submit-url` failed** ("Page not found… no extractable content", 2026-11-20); the runtime instructed not to repeat that request. The tool's existence was instead confirmed via multiple secondary sources (discoverability.co, naughtonandbird.com, toponseek.com). No retry attempted. This blocks only direct first-party confirmation of that one claim; the claim is treated as confirmed via secondary sources.
- **No other blockers.** Nothing else in scope was unverifiable; no skill is marked Unverified or Blocked.

## Sources used (authoritative, by topic)

- **Prisma:** official Prisma release-status page (checked 2026-11-16); docs.prisma.io (To-v7 upgrade guide; MongoDB guide); github.com/prisma/skills (upstream repo).
- **React/Next.js:** react.dev blog 2026/09/09 (React 19.3); react/react PR #31975 release notes; nextjs.org Link docs version history (updated 2026-11-18); Next.js 16.3/16.4 release notes.
- **Vercel:** vercel.com changelog (Billing CLI ~2026-11-19; `vercel deploy --temporary` 2026-10-22; CLI v35 logs; Turbo build machines); Vercel CLI overview docs; Vercel pricing page; Vercel Flat Rate CDN docs.
- **MCP:** official typescript-sdk README; ts.sdk.modelcontextprotocol.io/v2; MCP 2026-07-28 spec.
- **Google/SEO:** Google Search Central changelog (FAQ rich results stopped 2026-05-07, docs removed 2026-06-15; Search Console Generative AI report rollout by 2026-08-31; spam policies updated 2026-08-28) via multiple secondary sources citing it; Google Cloud blog 2026-06-12 (OKF).
- **Anthropic:** github.com/anthropics/skills (official repo); Anthropic subprocessor list (Brave Search "Web Search" since 2025-03-19; Parallel Web Systems and turbopuffer added by 2026-10-24).
- **GA4:** GA4 docs (default channel grouping; `sign_up` recommended event).
- **Stripe:** docs.stripe.com/projects (Stripe Projects CLI, launched 2026-03/2026-04-30; Vercel a launch partner).
- **GPT-5.6:** OpenAI launch coverage (GA 2026-07-09).

## Notes for the coordinator

1. The two substantive corrections (prisma-upgrade-v7 version, agentic-seo/seo FAQ + templates) both belong upstream; neither can be fixed in SkillForge under the verbatim-import rule. The agentic-seo/seo skill is the most stale artifact in the batch (reference files dated 2026-02-07, violating its own 90-day freshness rule).
2. The marketingskills `tools/` directory and the superpowers TDD/systematic-debugging skills are the largest import-scope gaps; if the coordinator wants the cross-references to resolve, those are import decisions, not upstream fixes.
3. marketingskills/schema and agentic-seo/seo directly contradict each other on FAQPage (schema is right, seo is wrong) — worth flagging to users until upstream fixes land.
4. No skill required a "Blocked" or "Unverified" status; the only failed fetch (Brave submit-url) was worked around with secondary sources.
