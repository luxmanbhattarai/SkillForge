# Accessibility Coverage — Phase 8

Production-hardening mission, Group C (part 2). Branch
`feat/production-hardening`. Completed 2026-11-21.

## Summary

| Metric | Baseline (HEAD, before Phase 8) | Final |
| --- | --- | --- |
| Original skills audited | 228 | 228 |
| Skills with a `### Accessibility` subsection | 14 | 93 |
| Applicable skills (see method) | 95 | 95 |
| Applicable skills with guidance | 16 | 95 |
| **Documentation coverage** (applicable with guidance / applicable) | **16.8%** | **100%** |
| **Validation coverage** (guidance validated against a real interface) | **0%** | **0%** |

The two coverage metrics are different things and are kept distinct
throughout this document:

- **Documentation coverage** — the skill *carries* accessibility
  guidance. This is what Phase 8 raised to 100% and what the
  regression test enforces.
- **Validation coverage** — the skill's guidance has been *verified*
  against a real interface (automated tool run, keyboard-only test,
  or screen-reader test). Skills are guidance documents; validating
  them means applying them to a real UI and testing it. No such
  validation was run in this phase, so validation coverage is
  honestly 0%. The validation process is documented in
  `docs/ACCESSIBILITY-STANDARDS.md` (§ Validation process) so a
  future phase can raise it with real evidence.

## Baseline verification

Prior audit finding A3-03 reported accessibility subsections in
14 of 228 original skills. Re-verified against the current files
before any edits: **exactly 14**, the same set —

`content/editorial-workflow`, `content/source-verification`,
`desktop/electron`, `desktop/rust`, `desktop/tauri`, `frontend/expo`,
`frontend/nuxt`, `frontend/react-native`, `frontend/sveltekit`,
`frontend/vue`, `media/platform-social-images`, `media/resvg`,
`media/satori`, `media/sharp`.

Of those 14, 13 are applicable skills and 1 (`desktop/rust`) is
not applicable — its subsection records that explicitly. Three
further skills are accessibility guidance in their entirety
(`frontend/accessibility`, `media/image-accessibility`,
`testing/accessibility-testing`), so the baseline for applicable
skills with guidance was 13 + 3 = **16 of 95 (16.8%)**.

Note on measurement: the scorer's accessibility regex
(`/accessib|wcag|aria|screen reader|keyboard navigat/i`) matches
107 files at baseline, but it is not a guidance count — it matches
"variable" (contains "aria") and generic uses of "accessible"
("accessible from anywhere"). Phase 8 detection uses the
`### Accessibility` subsection (or whole-skill status) instead;
see the test for the exact rule.

## Method

**Classification rule.** A skill is APPLICABLE when its deliverable
or workflow produces or shapes something a person perceives or
interacts with: UI, websites, apps, published content, media, or a
user-facing flow (sign-in forms, error messages, share buttons,
docs sites). A skill is NOT APPLICABLE when its deliverable is
purely machine-facing (APIs, database schemas, infrastructure,
CLI tooling, internal process documents) or when accessibility for
its subject is fully owned by another skill (e.g. `typescript` —
a language skill — defers to the UI skills that use TypeScript).

Classification was done per skill from its description and
subject, not by category alone: categories are mixed (e.g. `seo`
is 11 applicable / 20 not applicable; `security` is 1 / 7).
Borderline calls and their reasoning:

- `auth/session-management` — applicable: session expiry interrupts
  the user, and timeout warnings are a WCAG 2.2.1 concern.
- `auth/auth-security` — applicable: covers CAPTCHAs and challenge
  flows, which must have accessible alternatives (WCAG 3.3.8).
- `security/xss-prevention` — applicable: HTML sanitizers can strip
  `alt` and `aria-*` attributes.
- `core/code-review` — applicable: reviews include UI changes.
- `seo/local-seo` — not applicable: listings, citations, and
  LocalBusiness data; the landing pages it touches get guidance
  from the content and on-page skills.
- `seo/technical-seo` — applicable: covers viewport/zoom behavior
  and mobile usability (WCAG 1.4.4, 1.4.10).
- `performance/pagespeed-insights` — applicable: PSI reports
  include Lighthouse accessibility audits.
- `media/image-compression`, `media/image-format-conversion` — not
  applicable: file-size/format changes only; the visual content and
  its text alternative are unchanged.
- `desktop/rust` — not applicable: a systems language with no UI of
  its own (the skill already records this in its own subsection).
- `content/keyword-to-content` — not applicable: the plan is
  internal; accessibility requirements for the resulting pages live
  in `content-brief` and the writing skills.
- `content/source-verification` — applicable: it selects the sources
  readers consume, and prefers accessible formats.

**Guidance rule.** Applicable skills carry a `### Accessibility`
subsection in Implementation Standards with guidance tailored to
the skill's subject (41 variants across 79 edited skills — see
"Skills updated"), plus one checklist item in the Validation
Checklist. Shared content lives in the reusable standard
`docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA baseline, validation
process, tooling); each subsection points to it and adds only
skill-specific notes. The three whole-skill skills
(`accessibility`, `image-accessibility`, `accessibility-testing`)
carry no subsection — the whole skill is the guidance, and a
redundant subsection would be filler.

**Detection rule (enforced by the test).** A skill has guidance
when it carries a `### Accessibility` subsection with at least 4
non-empty lines, or is flagged `whole-skill` in the classification
and matches substantive accessibility content. A not-applicable
classification must carry a reason of at least 20 characters, so
the classification cannot be used to dodge the requirement without
justification.

The machine-readable classification is
`sources/accessibility-classification.json` (228 entries: key,
applicability, reason, guidance kind). The full per-skill table is
in the appendix below, generated from that file.

## Classification summary

| Category | Total | Applicable | Not applicable |
| --- | --- | --- | --- |
| ai-engineering | 5 | 0 | 5 |
| architecture | 12 | 0 | 12 |
| auth | 14 | 10 | 4 |
| backend | 21 | 0 | 21 |
| content | 19 | 16 | 3 |
| core | 11 | 1 | 10 |
| database | 18 | 0 | 18 |
| desktop | 3 | 2 | 1 |
| documentation | 5 | 5 | 0 |
| frontend | 21 | 20 | 1 |
| infrastructure | 22 | 0 | 22 |
| media | 16 | 14 | 2 |
| metadata | 6 | 6 | 0 |
| performance | 8 | 5 | 3 |
| security | 8 | 1 | 7 |
| seo | 31 | 11 | 20 |
| testing | 8 | 4 | 4 |
| **Total** | **228** | **95** | **133** |

## Skills updated (79)

Each received a tailored `### Accessibility` subsection in
Implementation Standards and one accessibility item in the
Validation Checklist. No other content was changed; no frontmatter
was touched.

- **auth** (10): `auth-security`, `authentication`, `authjs`, `better-auth`, `clerk`, `mfa`, `oauth`, `passkeys`, `session-management`, `supabase-auth`
- **content** (14): `article-writing`, `blog-writing`, `content-brief`, `content-localization`, `content-refresh`, `content-repurposing`, `content-strategy`, `copywriting`, `editorial-review`, `eeat-writing`, `faq-generation`, `human-editing`, `seo-content-writing`, `technical-writing`
- **core** (1): `code-review`
- **documentation** (5): `api-documentation`, `changelog-management`, `developer-experience`, `readme-engineering`, `technical-documentation`
- **frontend** (14): `astro`, `css`, `frontend-performance`, `html`, `hugo`, `javascript`, `modern-css`, `nextjs`, `react`, `responsive-design`, `semantic-html`, `shadcn-ui`, `tailwind-css`, `ui-design`
- **media** (9): `ai-image-generation`, `blog-featured-images`, `brand-visual-consistency`, `image-prompt-engineering`, `infographic-generation`, `og-image-generation`, `social-preview`, `twitter-card-images`, `youtube-thumbnails`
- **metadata** (6): `dynamic-metadata`, `metadata-validation`, `open-graph`, `seo-metadata`, `social-sharing`, `twitter-cards`
- **performance** (5): `core-web-vitals`, `image-optimization`, `lighthouse`, `pagespeed-insights`, `web-performance-audit`
- **security** (1): `xss-prevention`
- **seo** (11): `aeo-optimization`, `eeat`, `geo-optimization`, `image-seo`, `internal-linking`, `international-seo`, `llm-seo`, `on-page-seo`, `programmatic-seo`, `seo-audit`, `technical-seo`
- **testing** (3): `e2e-testing`, `playwright`, `unit-testing`

## Already covered before Phase 8 (16)

13 applicable skills already carried a subsection (left untouched):
`content/editorial-workflow`, `content/source-verification`,
`desktop/electron`, `desktop/tauri`, `frontend/expo`,
`frontend/nuxt`, `frontend/react-native`, `frontend/sveltekit`,
`frontend/vue`, `media/platform-social-images`, `media/resvg`,
`media/satori`, `media/sharp`. 3 skills are whole-skill guidance:
`frontend/accessibility`, `media/image-accessibility`,
`testing/accessibility-testing`.

## WCAG 2.2 AA mapping

Target: WCAG 2.2 level AA throughout. The shared standard
(`docs/ACCESSIBILITY-STANDARDS.md`) holds the full baseline; this
table maps each guidance family in the skill subsections to the
criteria it addresses. Criteria marked "new" were introduced in
WCAG 2.2.

| Guidance family | WCAG 2.2 AA criteria |
| --- | --- |
| Semantic HTML, landmarks, headings | 1.3.1 Info and Relationships, 1.3.2 Meaningful Sequence, 2.4.6 Headings and Labels |
| Text alternatives (alt text, data tables) | 1.1.1 Non-text Content, 1.4.5 Images of Text |
| Keyboard navigation | 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order |
| Focus visibility and management | 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured (Minimum) — new, 2.4.1 Bypass Blocks |
| Screen-reader compatibility | 1.3.1, 4.1.2 Name, Role, Value, 4.1.3 Status Messages, 3.1.1/3.1.2 Language |
| Accessible forms | 1.3.5 Identify Input Purpose, 3.3.1 Error Identification, 3.3.2 Labels or Instructions, 3.3.3 Error Suggestion, 3.3.7 Redundant Entry — new |
| Color contrast, non-color meaning | 1.4.1 Use of Color, 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast |
| ARIA usage | 4.1.2 Name, Role, Value, 4.1.3 Status Messages |
| Accessible error messages | 3.3.1 Error Identification, 3.3.3 Error Suggestion |
| Reduced motion | 2.2.2 Pause, Stop, Hide, 2.3.1 Three Flashes |
| Responsive and zoom behavior | 1.4.4 Resize Text, 1.4.10 Reflow, 1.3.4 Orientation |
| Accessible component interactions | 2.5.3 Label in Name, 2.5.7 Dragging Movements — new, 2.5.8 Target Size (Minimum) — new |
| Authentication | 3.3.8 Accessible Authentication (Minimum) — new, 2.2.1 Timing Adjustable |
| Titles and links | 2.4.2 Page Titled, 2.4.4 Link Purpose (In Context) |
| Media (captions, transcripts) | 1.2.1 Audio-only and Video-only, 1.2.2 Captions, 1.4.2 Audio Control |

Notes: criterion 4.1.1 (Parsing) was removed in WCAG 2.2 and is not
claimed. Criterion 2.2.6 (Timeouts) is level AAA and is not claimed;
session-timeout guidance cites 2.2.1 (Timing Adjustable, level A)
instead.

## Validation coverage (honest report)

**0 of 95 applicable skills (0%).** No automated accessibility
tool run, keyboard-only test, or screen-reader test was performed
on any skill's deliverable in this phase, because skills are
guidance documents — validating them requires applying the skill
to a real interface and testing that interface. The process for
doing so is documented in `docs/ACCESSIBILITY-STANDARDS.md`
(§ Validation process): axe/Lighthouse first pass, keyboard-only
test, screen-reader test (NVDA/VoiceOver), 200% zoom and 320px
reflow test, contrast measurement, motion check, and manual review
of what tools cannot judge (alt-text quality, heading logic, link
purpose, error clarity). A future phase can raise validation
coverage by applying skills to sample interfaces and recording the
evidence per skill; until then the number stays 0 and must not be
presented as anything else.

## Remaining gaps

- **Validation coverage is 0%** (above). Documentation coverage at
  100% means every applicable skill tells the agent what to do; it
  does not mean any of it has been verified in practice.
- **Upstream skills (49) are out of scope.** They are verbatim
  imports and are never edited; their accessibility content is
  upstream's responsibility.
- **The scorer does not know about this classification.**
  `scripts/score-skills.mjs` enforces accessibility content only
  for its `A11Y_CATEGORIES` set (frontend, media, content,
  metadata) with a loose regex, and does not include desktop
  (already known from the SKILL-STANDARDS element-14 note). The
  per-skill classification in
  `sources/accessibility-classification.json` is more precise;
  aligning the scorer to it is follow-up work for the coordinator
  (the scorer is outside this phase's ownership).
- **SKILL-STANDARDS.md element 14** still carries the narrowed
  wording (accessibility content required for frontend, media,
  content, metadata, and desktop). Phase 8 went beyond it with a
  per-skill classification covering auth, documentation,
  performance, security, seo, and testing as well. Updating the
  standards doc to point at the classification file is a
  coordinator decision (that doc is outside this phase's
  ownership).
- **New skills fail closed.** The regression test requires every
  original skill on disk to have a classification entry, so a newly
  added skill fails the test until it is classified. That is
  intentional — the maintainer must classify each new skill rather
  than letting it slip through unexamined.
- **Pre-existing subsections were not re-audited in depth.** The 13
  applicable skills that already carried subsections were left
  untouched; the test verifies they are substantive (≥ 4 lines)
  but their content accuracy was not re-verified against WCAG 2.2
  in this phase.

## How to run the coverage test

```bash
node --test test/accessibility-coverage.test.mjs   # this phase's tests only
npm test                                            # full suite (includes them)
```

The test reads `sources/accessibility-classification.json`, scans
the real skill files, and fails if any applicable skill lacks
guidance, if any not-applicable skill lacks a recorded reason, if
a subsection is a stub, or if the classification does not cover
exactly the original skills on disk. It prints the computed
documentation coverage (currently 95/95, 100.0%).

## Verification performed

- `npm run validate` — PASS (277 skills; 5 upstream warnings only,
  informational). Re-run after the Finding 4/5/6 edits: the 6
  hardcoded-date errors the validator's new date rule flagged in
  infrastructure skills (`aws`, `gcp`, `kubernetes` x2, `pulumi`,
  `terraform`) were fixed in the same pass.
- `npm run check:frontmatter` — PASS (277 skills).
- `npm run check:links` — PASS (75 internal links; 609 unique
  external URLs listed).
- `node --test test/accessibility-coverage.test.mjs` — 6/6 pass.
- `npm test` (full suite, 2026-11-22) — 628 pass, 4 fail,
  14 skipped. All 4 failures are in `test/installer.test.mjs` and
  come from another worker's in-flight needs-correction install
  gate (the `seo` skill is now refused at install, so tests that
  install it fail in setup); none involves this phase's files.
  The known `nextjs` line-count failure from the earlier run is
  gone: `test/validate.test.mjs` now computes the expected count
  from the file instead of hardcoding it.
- Negative control: the detection logic was run against the HEAD
  versions of `frontend/react`, `auth/authentication`, and
  `seo/programmatic-seo` — all three correctly report "no
  guidance" at HEAD and "guidance present" in the worktree, so the
  test detects regressions rather than passing vacuously.
- Line counts: the longest edited skill is 399 lines
  (`auth/passkeys`); all edited skills remain under the 500-line
  limit.

## Appendix — full per-skill classification

Generated from `sources/accessibility-classification.json`. `A` =
applicable, `N` = not applicable; guidance `S` = subsection,
`W` = whole-skill, `—` = none required.

| Skill | Class | Guidance | Reason |
| --- | --- | --- | --- |
| `ai-engineering/agent-evaluation` | N | — | Evaluation harness for LLM and agent outputs; no UI in its deliverable. |
| `ai-engineering/ai-agents` | N | — | Agent architectures, tool design, and memory; any UI the agent drives is covered by the frontend skills. |
| `ai-engineering/llm-integration` | N | — | Multi-provider LLM client integration; server-side, no UI. |
| `ai-engineering/mcp-security` | N | — | Protocol-level MCP security; no user-facing surface. |
| `ai-engineering/rag` | N | — | Ingestion, chunking, embedding, and retrieval pipeline; backend only. |
| `architecture/changesets` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/dependency-management` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/domain-driven-design` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/microservices` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/modular-monolith` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/monorepo` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/nx` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/package-boundaries` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/pnpm-workspaces` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/release-management` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/system-design` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `architecture/turborepo` | N | — | Architecture and tooling skill; no user-facing UI in its deliverable. |
| `auth/auth-security` | A | S | Covers CAPTCHAs and challenge flows, which must have accessible alternatives (WCAG 3.3.8). |
| `auth/authentication` | A | S | Sign-up and sign-in flows are user-facing forms. |
| `auth/authjs` | A | S | Sign-in and sign-up UI flows are user-facing forms. |
| `auth/authorization` | N | — | Permission model and enforcement; policy logic, no UI. |
| `auth/better-auth` | A | S | Email/password and social sign-in UI flows are user-facing forms. |
| `auth/clerk` | A | S | Hosted sign-in and sign-up UI is user-facing. |
| `auth/jwt` | N | — | Token issuance and verification; protocol-level, no UI. |
| `auth/mfa` | A | S | MFA enrollment and code entry are user-facing flows with timing and input constraints. |
| `auth/multi-tenancy` | N | — | Tenant isolation architecture; backend, no UI. |
| `auth/oauth` | A | S | Consent screens and redirect flows are user-facing. |
| `auth/passkeys` | A | S | Registration and authentication ceremonies include user-facing prompts and fallbacks. |
| `auth/rbac` | N | — | Role and permission model; policy logic, no UI. |
| `auth/session-management` | A | S | Session expiry and re-authentication interrupt the user; timeout warnings are a WCAG concern (2.2.1). |
| `auth/supabase-auth` | A | S | Email, magic-link, OTP, and OAuth sign-in UI flows are user-facing forms. |
| `backend/advanced-api-architecture` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/api-client-generation` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/api-design` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/background-jobs` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/caching` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/express` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/fastify` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/graphql` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/hono` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/mcp-development` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/nestjs` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/nodejs` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/openapi` | N | — | API contract documents; machine-facing, and the rendered docs UI is covered by api-documentation. |
| `backend/package-development` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/python-sdk` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/queues` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/rate-limiting` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/rest-api` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/sdk-development` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/trpc` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `backend/typescript-sdk` | N | — | Server-side API/service skill; no user-facing UI in its deliverable. |
| `content/article-writing` | A | S | Published articles are consumed by readers, including screen-reader and keyboard users. |
| `content/blog-writing` | A | S | Published blog posts are consumed by readers, including screen-reader and keyboard users. |
| `content/content-brief` | A | S | The brief specifies the deliverable structure; accessibility requirements belong in it. |
| `content/content-localization` | A | S | Localized content is consumed by readers; lang attributes and translated alt text affect assistive technology. |
| `content/content-refresh` | A | S | Refreshed content is published and consumed by readers. |
| `content/content-repurposing` | A | S | Each repurposed format is consumed by people and needs its own text alternative. |
| `content/content-research` | N | — | Research process; notes are an internal working artifact, not published content. |
| `content/content-strategy` | A | S | Governs the content program, including the accessibility standards published content must meet. |
| `content/copywriting` | A | S | Landing pages, emails, and ads are user-facing copy. |
| `content/editorial-review` | A | S | The review checklist gates published content; accessibility checks belong in it. |
| `content/editorial-workflow` | A | S | Runs published content end to end; already carries an Accessibility subsection. |
| `content/eeat-writing` | A | S | Published content is consumed by readers, including screen-reader and keyboard users. |
| `content/fact-checking` | N | — | Verification process; findings are internal until the writing skills publish them. |
| `content/faq-generation` | A | S | FAQ pages and accordions are user-facing UI. |
| `content/human-editing` | A | S | Editing shapes published prose; plain language is cognitive accessibility. |
| `content/keyword-to-content` | N | — | Keyword-to-plan mapping; the plan is internal, and accessibility requirements for the resulting pages live in content-brief and the writing skills. |
| `content/seo-content-writing` | A | S | Published content is consumed by readers, including screen-reader and keyboard users. |
| `content/source-verification` | A | S | Selects the sources readers consume; already carries an Accessibility subsection (prefer accessible formats). |
| `content/technical-writing` | A | S | Technical documentation is consumed by readers. |
| `core/clean-code` | N | — | Code readability; no user-facing surface. |
| `core/code-review` | A | S | Reviews include UI changes; accessibility is a review dimension for them. |
| `core/debugging` | N | — | Bug-finding process; applies to any layer, no UI of its own. |
| `core/design-patterns` | N | — | Code patterns; no user-facing surface. |
| `core/engineering-standards` | N | — | Team process and code-style standards; product accessibility requirements live in the frontend skills and docs/ACCESSIBILITY-STANDARDS.md. |
| `core/performance` | N | — | General software performance (profiling, bottlenecks); the web-facing overlap lives in frontend-performance. |
| `core/refactoring` | N | — | Code restructuring without behavior change; no user-facing surface. |
| `core/security` | N | — | Secure coding practices; no user-facing surface. |
| `core/software-architecture` | N | — | Architecture evaluation; no user-facing surface. |
| `core/tdd` | N | — | Test-first development process; no UI of its own. |
| `core/technical-decision-records` | N | — | Decision records are internal engineering docs. |
| `database/backup-recovery` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/clickhouse` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/connection-pooling` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/database-design` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/database-security` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/drizzle` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/elasticsearch` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/indexing` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/migrations` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/mongodb` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/mysql` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/opensearch` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/postgresql` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/prisma` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/redis` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/sql-optimization` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/sqlite` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `database/transactions` | N | — | Database skill; schemas, queries, and operations are machine-facing. |
| `desktop/electron` | A | S | Desktop apps are user-facing UI; already carries an Accessibility subsection. |
| `desktop/rust` | N | — | Rust is a systems language with no UI of its own; accessibility is a property of the application built with it (the skill already records this in its Accessibility note). |
| `desktop/tauri` | A | S | Desktop apps with a webview frontend are user-facing UI; already carries an Accessibility subsection. |
| `documentation/api-documentation` | A | S | Published API docs are consumed by readers. |
| `documentation/changelog-management` | A | S | Changelogs are published documents consumed by users. |
| `documentation/developer-experience` | A | S | Error messages, docs, and CLI output are consumed by developers, including developers using assistive technology. |
| `documentation/readme-engineering` | A | S | READMEs are user-facing documents consumed by readers. |
| `documentation/technical-documentation` | A | S | Published documentation is consumed by readers. |
| `frontend/accessibility` | A | W | The skill itself is accessibility guidance. |
| `frontend/astro` | A | S | Builds content websites; the shipped HTML is user-facing UI. |
| `frontend/css` | A | S | Stylesheets determine contrast, focus visibility, motion, and reflow. |
| `frontend/expo` | A | S | Universal iOS, Android, and web apps are user-facing UI; already carries an Accessibility subsection. |
| `frontend/frontend-performance` | A | S | Performance choices (lazy loading, layout shift, deferred scripts) change what assistive technology encounters. |
| `frontend/html` | A | S | Markup is the accessibility layer: semantics, labels, tables, and alt text. |
| `frontend/hugo` | A | S | Builds static websites; the shipped HTML is user-facing UI. |
| `frontend/javascript` | A | S | DOM scripting drives interactivity: keyboard handling, focus management, and live regions. |
| `frontend/modern-css` | A | S | CSS features determine contrast, focus visibility, motion, and reflow. |
| `frontend/nextjs` | A | S | Full-stack React apps; the shipped UI is user-facing. |
| `frontend/nuxt` | A | S | Full-stack Vue apps; the shipped UI is user-facing; already carries an Accessibility subsection. |
| `frontend/react` | A | S | Builds user interfaces; components must expose name, role, and state. |
| `frontend/react-native` | A | S | Native iOS and Android apps are user-facing UI; already carries an Accessibility subsection. |
| `frontend/responsive-design` | A | S | Layouts determine reflow, zoom behavior, and touch targets. |
| `frontend/semantic-html` | A | S | Semantic elements and landmarks are the accessibility structure of a page. |
| `frontend/shadcn-ui` | A | S | Component library built on Radix primitives; composition must preserve their accessible behavior. |
| `frontend/sveltekit` | A | S | Full-stack web apps; the shipped UI is user-facing; already carries an Accessibility subsection. |
| `frontend/tailwind-css` | A | S | Utility styling determines contrast, focus visibility, motion, and reflow. |
| `frontend/typescript` | N | — | Language skill (types, strict mode); accessibility lives in the UI skills that use TypeScript. |
| `frontend/ui-design` | A | S | Interface design determines contrast, target size, focus states, and color-only meaning. |
| `frontend/vue` | A | S | Builds user interfaces; already carries an Accessibility subsection. |
| `infrastructure/aws` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/ci-cd` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/cloudflare` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/cloudflare-d1` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/cloudflare-kv` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/cloudflare-queues` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/cloudflare-r2` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/cloudflare-workers` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/deployment` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/docker` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/durable-objects` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/fly-io` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/gcp` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/github-actions` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/kubernetes` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/observability` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/pulumi` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/railway` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/render` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/self-hosted-vps` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/terraform` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `infrastructure/vercel` | N | — | Infrastructure/deployment skill; no user-facing UI in its deliverable. |
| `media/ai-image-generation` | A | S | Generated images are published visuals; they need alt text and legible text. |
| `media/blog-featured-images` | A | S | Featured images are published visuals; they need alt text and legible text. |
| `media/brand-visual-consistency` | A | S | Palette, typography, and imagery choices determine contrast and legibility. |
| `media/image-accessibility` | A | W | The skill itself is image-accessibility guidance. |
| `media/image-compression` | N | — | File-size optimization only; it does not change what the image communicates or its text alternative. |
| `media/image-format-conversion` | N | — | Format conversion only; the visual content and its text alternative are unchanged. |
| `media/image-prompt-engineering` | A | S | Prompts determine the generated image, including text legibility and contrast. |
| `media/infographic-generation` | A | S | Infographics present data visually; the data needs a non-visual alternative. |
| `media/og-image-generation` | A | S | Open Graph preview images are seen by users and need og:image:alt. |
| `media/platform-social-images` | A | S | Social preview images are seen by users; already carries an Accessibility subsection. |
| `media/resvg` | A | S | Renders SVG, which carries title/desc accessibility semantics; already carries an Accessibility subsection. |
| `media/satori` | A | S | Renders HTML/CSS to SVG for preview images; already carries an Accessibility subsection. |
| `media/sharp` | A | S | Processes published images; already carries an Accessibility subsection. |
| `media/social-preview` | A | S | Verifies shared-link previews, including their image alt text. |
| `media/twitter-card-images` | A | S | X card preview images are seen by users and need twitter:image:alt. |
| `media/youtube-thumbnails` | A | S | Thumbnails are seen by users and must stay readable at small sizes. |
| `metadata/dynamic-metadata` | A | S | Generated titles are announced by screen readers; preview images need alt text. |
| `metadata/metadata-validation` | A | S | Validates titles and preview metadata, which are announced to assistive technology. |
| `metadata/open-graph` | A | S | Open Graph tags render link previews seen by users; images need og:image:alt. |
| `metadata/seo-metadata` | A | S | Page titles are announced by screen readers (WCAG 2.4.2). |
| `metadata/social-sharing` | A | S | Share buttons are interactive UI; preview metadata needs alt text. |
| `metadata/twitter-cards` | A | S | X Card tags render link previews seen by users; images need twitter:image:alt. |
| `performance/bundle-optimization` | N | — | Bundle size and loading mechanics; no user-facing surface. |
| `performance/caching-strategy` | N | — | HTTP caching policy; no user-facing surface. |
| `performance/core-web-vitals` | A | S | Layout stability and responsiveness affect users with motor and cognitive impairments. |
| `performance/image-optimization` | A | S | Lazy loading and responsive images change what assistive technology encounters. |
| `performance/javascript-optimization` | N | — | Main-thread cost reduction; no user-facing surface. |
| `performance/lighthouse` | A | S | Lighthouse reports an accessibility category; the skill interprets audit output. |
| `performance/pagespeed-insights` | A | S | PageSpeed Insights reports include Lighthouse accessibility audits alongside performance. |
| `performance/web-performance-audit` | A | S | A full-site audit scopes which quality checks run, including accessibility. |
| `security/csrf-protection` | N | — | Token-based request-forgery defense; protocol-level, no UI. |
| `security/dependency-security` | N | — | Vulnerability auditing of dependencies; developer tooling. |
| `security/owasp` | N | — | Security guidance for web applications; no UI surface of its own. |
| `security/secrets-management` | N | — | Secret storage and rotation; operational, no UI. |
| `security/secure-headers` | N | — | HTTP response headers; no user-facing surface. |
| `security/security-auditing` | N | — | Security audit process; accessibility auditing lives in accessibility-testing. |
| `security/sql-injection-prevention` | N | — | Query parameterization; backend, no UI. |
| `security/xss-prevention` | A | S | HTML sanitization can strip alt and ARIA attributes; the sanitizer configuration affects accessibility. |
| `seo/aeo-optimization` | A | S | Restructures published content (headings, direct answers) that readers consume. |
| `seo/canonical-management` | N | — | Canonical URL management; search-facing metadata, not rendered to users. |
| `seo/competitor-analysis` | N | — | Competitive analysis; internal research artifact. |
| `seo/content-decay` | N | — | Traffic diagnosis; analysis, not published content. |
| `seo/content-gap-analysis` | N | — | Topic planning; internal analysis. |
| `seo/eeat` | A | S | Shapes author bios, trust pages, and review displays that users read. |
| `seo/entity-seo` | N | — | Entity disambiguation via structured data; machine-facing. |
| `seo/geo-optimization` | A | S | Restructures published content for answer engines that readers consume. |
| `seo/hreflang` | N | — | Search annotations for language versions; the lang attribute for assistive technology lives in content-localization. |
| `seo/image-seo` | A | S | Alt text is core to both image SEO and accessibility. |
| `seo/internal-linking` | A | S | Link text and structure determine navigability for screen-reader users (WCAG 2.4.4). |
| `seo/international-seo` | A | S | Multilingual sites need lang attributes and translated alt text for assistive technology. |
| `seo/keyword-clustering` | N | — | Keyword grouping; internal planning. |
| `seo/keyword-research` | N | — | Query research; internal planning. |
| `seo/llm-seo` | A | S | Restructures published content (headings, clear structure) that readers consume. |
| `seo/llms-txt` | N | — | Machine-facing llms.txt file for LLM crawlers. |
| `seo/local-seo` | N | — | Listings, citations, and LocalBusiness data; the landing pages it touches get accessibility guidance from the content and on-page skills. |
| `seo/off-page-seo` | N | — | Backlinks and brand mentions; off-site, no UI shaped by the skill. |
| `seo/on-page-seo` | A | S | Optimizes titles, headings, alt text, and link text — all accessibility-relevant. |
| `seo/programmatic-seo` | A | S | Generates pages from templates; template accessibility multiplies across every generated page. |
| `seo/schema-jsonld` | N | — | JSON-LD structured data; machine-facing, not rendered to users. |
| `seo/search-console` | N | — | Search Console monitoring; a third-party tool UI the skill does not shape. |
| `seo/search-intent` | N | — | Query classification; analysis, no user-facing surface. |
| `seo/seo-audit` | A | S | A full-site audit scopes which quality checks run, including accessibility checks. |
| `seo/seo-migration` | N | — | Migration planning (URLs, redirects); no content shaping. |
| `seo/serp-analysis` | N | — | SERP analysis; internal research artifact. |
| `seo/serp-monitoring` | N | — | Rank tracking; monitoring, no user-facing surface. |
| `seo/sitemap-robots` | N | — | Sitemap and robots.txt files; machine-facing. |
| `seo/structured-data` | N | — | Structured-data governance; machine-facing. |
| `seo/technical-seo` | A | S | Covers viewport/zoom behavior and mobile usability, which are accessibility criteria. |
| `seo/topical-authority` | N | — | Topic-coverage strategy; planning, no user-facing surface. |
| `testing/accessibility-testing` | A | W | The skill itself is accessibility-testing guidance. |
| `testing/e2e-testing` | A | S | User journeys run in a real browser; keyboard-only journeys are accessibility tests. |
| `testing/integration-testing` | N | — | Module, service, and API integration; no UI. |
| `testing/performance-testing` | N | — | Load and response-time testing; no UI. |
| `testing/playwright` | A | S | Browser automation can run axe and keyboard tests. |
| `testing/regression-testing` | N | — | Regression process; accessibility regression checks live in accessibility-testing and e2e-testing. |
| `testing/unit-testing` | A | S | Component tests can assert accessible roles, names, and keyboard interaction. |
| `testing/vitest` | N | — | Test runner configuration; developer tooling. |
