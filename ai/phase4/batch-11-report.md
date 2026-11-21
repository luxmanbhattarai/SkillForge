# Phase 4 Batch 11 Report — Advanced SEO

- **Date:** 2026-11-20
- **Branch:** feat/skillforge-production-upgrade
- **Batch:** 11 (entity-seo, topical-authority, content-decay, serp-monitoring)
- **Status:** Complete. All 4 skills written and validated. No commits made
  (coordinator commits).

## Skills written

| Skill | Directory | Lines | Validation |
| --- | --- | --- | --- |
| entity-seo | `skills/seo/entity-seo/` | 344 | PASS |
| topical-authority | `skills/seo/topical-authority/` | 316 | PASS |
| content-decay | `skills/seo/content-decay/` | 341 | PASS |
| serp-monitoring | `skills/seo/serp-monitoring/` | 361 | PASS |

All four follow `templates/SKILL-TEMPLATE.md` exactly (15 sections in
order), use the standard frontmatter (name = directory name,
license MIT, metadata version "1.0.0", category seo, maintainer
skills-library, source original, last_verified "2026-11-20"), and are
under the 500-line recommended maximum. No `references/` subdirectories
were needed; each SKILL.md is self-contained. No files outside the
batch's assignment were touched, and `skills/upstream/` was not touched.

## Validation output

Run from the repo root, one filtered run per skill:

```text
=== entity-seo ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== topical-authority ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== content-decay ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== serp-monitoring ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

No errors or warnings in any run. Unfiltered validation and
`npm run registry` were not run (coordinator regenerates the registry
once at the end).

## Official sources consulted (verified via web search this session)

Every URL cited in the skills was returned by search results from the
official domain this session (tracking parameters stripped to the clean
canonical path). No URL, version, or statistic was fabricated.

Shared across skills:

- Google Search Central hub — https://developers.google.com/search
- SEO Starter Guide —
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google Search Essentials —
  https://developers.google.com/search/docs/essentials
- Creating helpful, reliable, people-first content —
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
  (confirms E-E-A-T itself is not a specific ranking factor)
- In-depth guide to how Google Search works —
  https://developers.google.com/search/docs/fundamentals/how-search-works
- Google Search Status Dashboard — https://status.search.google.com/
- Bing Webmaster Tools — https://www.bing.com/webmasters

### entity-seo

- Introduction to structured data —
  https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
  (Google uses structured data to understand page content and gather
  information about people, books, companies; `sameAs` generally usable)
- Organization structured data —
  https://developers.google.com/search/docs/appearance/structured-data/organization
  (markup helps disambiguate the organization; `iso6523`/`naics` used
  behind the scenes; home page or single About page placement; most
  specific subtype)
- Profile page structured data —
  https://developers.google.com/search/docs/appearance/structured-data/profile-page
  (required `mainEntity`; primary focus a single affiliated person/org)
- Knowledge Graph Search API — https://developers.google.com/knowledge-graph
  (entity lookup; `kgsearch.googleapis.com/v1/entities:search`; API key
  required; returns JSON-LD with `resultScore`)
- Schema.org — https://schema.org/ (vocabulary reference)
- Wikidata — https://www.wikidata.org/ (open knowledge base; item
  identifiers for `sameAs`)
- Bing's Webmaster Guidelines (2026 rewrite) advise clear, consistent
  entity names with no ambiguous references — confirmed via Search
  Engine Journal's report of the official guidelines; see Notes.

### topical-authority

- Understanding news topic authority (Google Search Central Blog,
  2023-05-23) —
  https://developers.google.com/search/blog/2023/05/understanding-news-topic-authority
  (Google's only documented "topic authority" system; serves newsy
  queries in specialized areas; signals are notability for a topic or
  location, influence and original reporting, and source reputation)
- Creating helpful, reliable, people-first content (above) — depth,
  primary focus, and first-hand expertise self-assessment questions.

### content-decay

- Debugging drops in Google Search traffic —
  https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
  (causes: algorithmic, technical, security, spam, seasonality, site
  moves, reporting glitches; 16-month chart; Google Trends for demand)
- Google Search's core updates and your website —
  https://developers.google.com/search/docs/appearance/core-updates
  (broad changes, not targeted; wait at least a full week after rollout
  completes before analyzing; small drop 2→4 vs large drop 4→29;
  deleting content is a last resort)
- Performance report (Search results) —
  https://support.google.com/webmasters/answer/7576553
- Data anomalies in Search Console —
  https://support.google.com/webmasters/answer/6211453
- Redirects and Google Search —
  https://developers.google.com/search/docs/crawling-indexing/301-redirects
  (permanent 301/308 signals target as canonical; server-side preferred)
- Get started with Google Trends —
  https://developers.google.com/search/docs/monitor-debug/trends-start
  (sample of aggregated, anonymized searches; relative interest)

### serp-monitoring

- Performance report (above)
- Getting your performance data (Search Console API) —
  https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
  (query one day's data per day; data typically available after 2-3
  days; paginate with `startRow`)
- Search Analytics API reference —
  https://developers.google.com/webmaster-tools/v1/searchanalytics
  (`searchAnalytics.query`; 25,000-row limit; 50K rows/day per search
  type; `webmasters.readonly` scope; branded/non-branded classification
  added November 2026, data from 21 February 2026 for top-level
  properties with sufficient volume)
- Google Search Status Dashboard (above) — as of this writing lists a
  November 2026 core update that began 10 November 2026
- Core updates page and traffic-drop debugging guide (above)
- Data anomalies page (above)
- Latest Search Central documentation updates —
  https://developers.google.com/search/updates

## Decisions and notes

- **Honesty labeling is built into the skills, not just the report.**
  `entity-seo` and `topical-authority` label claims **(Verified)** vs
  **(Heuristic)** in the Official Documentation and Implementation
  Standards sections. `topical-authority` states up front that Google
  publishes no topical-authority score or general ranking factor and
  that its only named "topic authority" system serves news queries.
  `entity-seo` states Google publishes no "entity SEO" guide. No skill
  promises rankings, traffic outcomes, or AI citations, and no invented
  statistics or benchmarks appear anywhere.
- **content-decay is diagnostic only.** It detects, diagnoses, and
  prioritizes decay and decides refresh vs redirect vs remove vs
  monitor, then hands refresh work to `content-refresh` with the
  diagnosis attached. It does not repeat the rewrite workflow.
- **serp-monitoring vs serp-analysis.** `serp-analysis` is the
  point-in-time snapshot; `serp-monitoring` is the ongoing watch
  (cadence, alerts, reporting, volatility triage). The boundary is
  stated in both skills' When (Not) to Use sections.
- **Cross-references use backticked skill names only**, never file
  paths: `serp-analysis`, `internal-linking`, `keyword-research`,
  `content-refresh`, `search-console`, `structured-data`,
  `schema-jsonld`, `on-page-seo`, plus `eeat`, `keyword-clustering`,
  `content-gap-analysis`, `seo-audit`, `technical-seo`,
  `canonical-management`, `competitor-analysis`, `local-seo`,
  `topical-authority`, `entity-seo`, `content-decay`, `serp-monitoring`
  where relevant. House style was matched from the five skills skimmed
  (`serp-analysis`, `internal-linking`, `keyword-research`,
  `content-refresh`, `search-console`); the `eeat` and `structured-data`
  skills were also checked for the E-E-A-T boundary and the
  "markup describes only visible content" rule.
- **Bing Webmaster Guidelines deep URL not verified.** The current
  guidelines page URL (`bing.com/webmasters/help/...`) was not
  returned by search results this session, so the skills link to Bing
  Webmaster Tools (https://www.bing.com/webmasters, verified) and cite
  the guidelines by name. The claim about the guidelines advising
  clear, consistent entity names comes from Search Engine Journal's
  report of the official 2026 rewrite, and is attributed that way in
  this report.
- **browser.open was rate-limited (429) during research**, so URL
  verification relied on search-result URLs and snippets from the
  official domains rather than opening each page. Every cited URL was
  returned as a search result from its official domain.
- **Examples use fictional data on example domains** (example-baking.com,
  example.com) and illustrative trend tables labeled as format
  examples, not benchmarks. The Knowledge Graph API and Search Console
  API examples use real endpoints and parameters from the official
  documentation; the API key is passed via an environment variable,
  never hardcoded.
