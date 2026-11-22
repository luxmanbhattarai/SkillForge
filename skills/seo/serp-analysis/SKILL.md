---
name: serp-analysis
description: >
  Analyze the search results page for a query: who ranks, what content
  types and SERP features appear, and how hard the query is to win.
  Use when evaluating a keyword, planning content to outrank competitors,
  or understanding what Google shows for a query.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SERP Analysis

## Purpose

SERP analysis reads the search results page as evidence: it shows what
content types rank, which sites dominate, what features (featured
snippets, "People also ask", shopping, local packs, AI Overviews) occupy
the page, and how realistic it is for a given site to compete. This
skill produces a structured SERP report for a query that feeds content
planning, keyword prioritization, and `search-intent` classification.

## When to Use

- Evaluating whether a keyword is worth targeting.
- Planning a page that must outrank specific competitors.
- Understanding why a page ranks where it does for a query.
- Checking which SERP features a query triggers before writing content.
- Comparing the same query across locations, devices, or time periods.

## When Not to Use

- To classify a single query's intent in depth — use `search-intent`
  (SERP analysis feeds it, but intent is its own skill).
- To analyze a competitor's whole site — use `competitor-analysis`.
- To discover new keywords — use `keyword-research`.
- To track rankings over time — that is rank tracking, which needs a
  dedicated tool and is not covered here.

## Prerequisites

- The query (or queries) to analyze, with the target location and
  language, since results vary by both.
- A way to view the SERP: a browser (ideally with location set to the
  target market) or a SERP data tool.
- Knowledge of the site's current authority and content capabilities,
  so the difficulty judgment is honest.
- The list of the site's own pages that already rank or could rank for
  the query.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on understanding search results.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  the policies that govern what can appear in results.

Third-party difficulty scores are
estimates from private indexes, not Google data; judge winnability
from the live SERP evidence.

## Required Workflow

1. Record the query, location, language, device, and date; SERPs are
   personal and time-sensitive, so context is part of the evidence.
2. Capture the top 10 organic results: URL, domain, page title, and
   content type (article, product page, category, video, forum, etc.).
3. Note every SERP feature on the page: featured snippet, "People also
   ask", AI Overview, shopping results, local pack, video carousel,
   knowledge panel, and ads — and how much of the first screen they occupy.
4. Note the dominant intent from the results (see `search-intent`):
   what do most of the top 10 offer?
5. Assess the competition: are the top results large established domains,
   niche specialists, forums, or a mix? Are any results weak or outdated?
6. Open the top 3-5 results and note their depth, freshness, structure,
   and what they cover that a new page would need to match or beat.
7. Identify gaps: questions in "People also ask" that no top result
   answers well, angles missing from the top results, or outdated
   information.
8. Judge winnability honestly: a new site can beat weak, thin, or
   outdated results; it cannot quickly displace strong authorities with
   deep, fresh content.
9. Record the findings in a SERP report with the date, location, and
   device, so a later re-check can be compared.
10. Hand the report to content planning: the winning content type, the
    depth required, the gaps to exploit, and the features to target
    (for example, a concise definition for a featured snippet).

## Implementation Standards

- Every SERP report records query, location, language, device, and date;
  a report without this context cannot be compared or trusted later.
- Difficulty judgments must cite evidence (who ranks, how strong they
  are, what the content looks like), not a single tool score.
- Do not treat third-party difficulty scores as Google data; they are
  estimates from private indexes and must be labeled as estimates.
- Record SERP features, not just organic results: a query whose first
  screen is ads and an AI Overview has far less organic opportunity
  than the organic list alone suggests.
- Re-check important queries before acting on an old report; SERPs
  change, and a report older than a few weeks may be stale.
- Never claim a page will rank in a specific position or within a
  specific time frame; SERP analysis estimates opportunity, not outcomes.

## Best Practices

- Check the SERP on mobile too: mobile results can differ from desktop,
  and most searches happen on mobile.
- Read the top results, don't just list them: the difference between
  the #1 and #5 result is usually visible in depth, freshness, or
  structure.
- Look for weak results in the top 10 — a forum thread, an outdated
  article, or an off-topic page signals an opening.
- Pay attention to "People also ask": it reveals the sub-questions the
  audience asks and the headings a strong page should cover.
- Compare the same query in different locations when the site serves
  more than one market; the winner in one country may not rank in another.

## Security Considerations

- Do not scrape search engines in violation of their terms of service;
  use manual checks or a SERP tool with an official data source.
- SERP data about a client's keywords is confidential; do not publish
  it or share it outside the engagement.
- Be careful with screenshots of personalized results: they can reveal
  the searcher's location or account details if shared carelessly.

## Performance Considerations

- SERP analysis is manual analysis work; the cost is time, so analyze
  the highest-priority queries first and batch checks by topic.
- Automate capture where a tool supports it, but always verify the top
  results by opening them — automated captures miss nuance.
- Keep reports short and structured so they stay useful; a 20-page
  report per query will not be read.

## Common Mistakes

- Analyzing the SERP once and treating it as permanent — results shift
  with algorithm updates, seasons, and new competitors.
- Ignoring SERP features — a featured snippet or AI Overview above the
  organic results changes the value of ranking #1.
- Judging difficulty from a single tool score instead of reading the
  actual results.
- Checking the SERP while logged in or in the target location's wrong
  region, and getting personalized results that do not match the audience.
- Copying the #1 result's structure exactly — the goal is to match its
  strengths and beat its weaknesses, not to clone it.

## Examples

Example SERP report for one query:

```text
Query: how to fix sourdough that won't rise
Location: United States, English, desktop, 2026-11-20

Top 10:
  1. example-baking.com/guide — step-by-step guide, updated 2026-09
  2. breadblog.example — article with troubleshooting table
  3. video.example — 8-minute video tutorial
  4. forum.example — discussion thread (2024)
  5. example-magazine.com — short article, thin content
  ...

SERP features: featured snippet (numbered list), People also ask
  (4 questions), video carousel.
Dominant intent: informational, how-to.
Winnability: moderate — the #4 and #5 results are weak; the top 3 are
  strong and fresh. A thorough guide with a troubleshooting table and
  original photos could compete for the top 5.
Gap: no top result covers cold-kitchen fixes in depth.
```

Example "People also ask" capture:

```text
- Why is my sourdough not rising?
- How do I know if my starter is active?
- Can I fix sourdough after baking?
- What temperature should sourdough rise at?
```

## Validation Checklist

- [ ] Query, location, language, device, and date are recorded.
- [ ] Top 10 organic results are listed with content types.
- [ ] SERP features on the page are noted.
- [ ] Dominant intent is identified from the results.
- [ ] Top results were opened and assessed for depth and freshness.
- [ ] Winnability is judged with evidence, not a single tool score.
- [ ] No ranking position or time frame is promised.

## Expected Deliverables

- A SERP report per query: top 10, features, intent, competition
  assessment, gaps, and winnability.
- A content brief derived from the report: required content type, depth,
  structure, and angles to cover.
- A list of "People also ask" questions to answer in the content.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on understanding search results.
- Related skills in this repository: `search-intent`, `keyword-research`,
  `competitor-analysis`, `content-gap-analysis`, `on-page-seo`.
