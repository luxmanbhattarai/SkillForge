---
name: content-gap-analysis
description: >
  Find the topics and queries competitors cover that a site does not, and
  prioritize the missing content worth creating. Use when planning a
  content calendar, expanding into new topics, or finding why competitors
  get traffic the site misses.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Content Gap Analysis

## Purpose

A content gap analysis compares what a site covers against what its
audience searches for and what competitors already cover, then identifies
the missing topics worth creating. This skill produces a prioritized list
of content gaps with the evidence for each — the queries, the competitors
ranking for them, and the value of closing the gap. It finds opportunities;
it does not promise traffic for any single piece.

## When to Use

- Planning a content calendar for the next quarter.
- Competitors get traffic from topics the site has never covered.
- A site's growth has stalled and new topics are needed.
- After a `competitor-analysis` reveals topics rivals cover.
- Auditing whether the site's content matches its keyword strategy.

## When Not to Use

- To analyze a competitor's whole SEO profile — use `competitor-analysis`
  instead.
- To discover keywords from scratch — use `keyword-research` first.
- To fix existing content that underperforms — use `on-page-seo` and
  `search-intent` to diagnose it.
- To decide site architecture — use `keyword-clustering` after gaps are
  found.

## Prerequisites

- A list of 3-5 search competitors (from `competitor-analysis`).
- The site's own content inventory: URLs, topics, and target queries.
- Access to a keyword data source that shows which queries competitors
  rank for.
- The site's keyword strategy or topic list, so gaps are judged against
  the site's focus rather than every topic in the niche.
- Conceptual skill; version range: none — applies to third-party
  keyword tools and Search Console, with no pinned version.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's guidance on people-first content.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on covering topics thoroughly.

Competitor keyword and traffic
figures are third-party estimates, not Google data; label them as
estimates with a named source.

## Required Workflow

1. Build the site's content inventory: every indexable page with its
   topic and primary query.
2. Pull the queries each competitor ranks for (from a keyword tool's
   estimates) and the pages that rank for them.
3. Subtract the site's covered queries: the remainder is the raw gap list.
4. Filter the raw list by relevance: keep only queries that fit the
   site's niche, audience, and business goals. A gap outside the site's
   focus is not an opportunity.
5. For each remaining query, check intent (`search-intent`) and the SERP
   (`serp-analysis`) to confirm the site could serve it and compete.
6. Cluster the surviving queries into topics with `keyword-clustering`;
   a gap is usually a topic, not a single keyword.
7. Score each topic gap by estimated demand, competition, business value,
   and fit with existing content (topics near existing strengths are
   cheaper to win).
8. Identify three gap types explicitly:
   - Missing topics: the site has no content at all.
   - Thin topics: the site has a page, but competitors cover the topic
     in far more depth.
   - Outdated topics: the site's page is stale while competitors have
     refreshed theirs.
9. Prioritize and assign: each gap gets a priority, a recommended content
   type, and a target page (new or existing).
10. Deliver the gap report with evidence per gap (queries, competitors
    ranking, estimated demand) and a recommended creation order.

## Implementation Standards

- All competitor keyword and traffic figures are estimates from a named
  source; never present them as exact.
- A gap must be validated against the SERP, not just a tool export: a
  query a competitor "ranks" for on page 5 is not a real gap.
- Gaps are judged by relevance first: a topic outside the site's niche
  is excluded even if its volume estimate is high.
- Every gap maps to exactly one recommended action: create, expand, or
  refresh — never a vague "consider covering".
- The report distinguishes missing, thin, and outdated gaps; each type
  needs a different action.
- Do not recommend copying a competitor's content; the goal is to cover
  the topic better, with original work.

## Best Practices

- Look for gap clusters, not single keywords: five related missing
  queries usually mean one missing section, which is a stronger
  opportunity than five isolated articles.
- Prefer gaps adjacent to existing strengths: a site that ranks for
  sourdough basics can win sourdough troubleshooting faster than an
  unrelated baking topic.
- Check the site's own Search Console data for queries where the site
  gets impressions but has no dedicated page — those are proven gaps.
- Include "People also ask" questions in gap analysis: they reveal
  sub-topics the audience wants that no competitor answers well.
- Re-run the analysis quarterly; competitors publish constantly, and
  gaps close and open over time.

## Security Considerations

- Use only public data and authorized keyword tools; never access a
  competitor's private analytics or accounts.
- Gap data about a client's keywords is confidential; do not share it
  outside the engagement.
- Do not scrape competitor sites aggressively to build the inventory;
  use their sitemap and public pages at a polite rate.

## Performance Considerations

- Gap analysis is research work; the cost is time, so cap the competitor
  list and filter the raw gap list early before deep SERP checks.
- Reuse exports from `competitor-analysis` and `keyword-research`
  rather than re-pulling the same data.
- Automate the subtraction step (covered vs. missing queries) with a
  spreadsheet or script, and spend judgment on scoring and prioritization.

## Common Mistakes

- Treating every missing keyword as a gap — most raw gaps are irrelevant,
  too competitive, or outside the site's focus.
- Ignoring thin and outdated gaps — expanding or refreshing an existing
  page is often faster and more effective than creating a new one.
- Chasing high-volume gaps without checking winnability — a gap owned by
  strong authorities is not an opportunity for a small site.
- Recommending a new page for every gap — many gaps are better served by
  expanding an existing page or adding a section.
- Never re-running the analysis — a gap report older than a quarter is
  likely stale.

## Examples

Example gap report entry:

```text
Gap: sourdough troubleshooting (thin topic)
Queries: why is my sourdough dense, sourdough not rising, sourdough
  too sour, sourdough flat after baking
Competitors ranking: Competitor A (guide), Competitor B (FAQ page)
Our coverage: one short paragraph on /sourdough-guide
Action: expand into a dedicated troubleshooting hub with one page per
  problem, linked from the guide.
Priority: 1 — adjacent to existing strength, moderate competition.
```

Example gap summary table:

```text
| Gap topic | Type | Queries | Priority | Action |
|-----------|------|---------|----------|--------|
| sourdough troubleshooting | thin | 12 | 1 | expand |
| bread flour comparison | missing | 8 | 2 | create |
| starter maintenance | outdated | 6 | 2 | refresh |
```

## Validation Checklist

- [ ] The site's content inventory is complete for indexable pages.
- [ ] Competitor keyword data is labeled as estimates with a named source.
- [ ] Gaps were filtered by relevance to the site's niche and goals.
- [ ] Top gaps were validated against the live SERP.
- [ ] Gaps are classified as missing, thin, or outdated.
- [ ] Every gap has one recommended action and a priority.
- [ ] No gap recommends copying a competitor's content.

## Expected Deliverables

- A gap report with each gap's topic, type, queries, competitors ranking,
  and recommended action.
- A prioritized content creation and refresh order.
- A list of existing pages to expand or refresh, with the queries each
  should newly cover.
- The filtered-out gaps with the reason for exclusion, so the reasoning
  is auditable.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's people-first content guidance.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on covering topics.
- Related skills in this repository: `competitor-analysis`,
  `keyword-research`, `keyword-clustering`, `serp-analysis`, `search-intent`.
