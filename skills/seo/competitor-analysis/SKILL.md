---
name: competitor-analysis
description: >
  Analyze competing websites' SEO: their keywords, content, backlinks,
  technical setup, and strengths and weaknesses, to find opportunities
  to outperform them. Use when entering a niche, losing rankings to a
  rival, or planning content that must beat specific competitors.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Competitor Analysis

## Purpose

Competitor analysis finds out who a site actually competes with in search
results, what those competitors do well, and where they are weak — so the
site can invest in winnable opportunities instead of copying rivals blindly.
This skill produces a structured comparison with concrete, actionable gaps.
It uses only public data and third-party estimates, which must always be
labeled as estimates.

## When to Use

- Entering a new niche and mapping the competitive landscape.
- A rival is outranking the site on important queries.
- Planning content that must beat specific competing pages.
- A quarterly review of the competitive position.
- Before a site launch, to set realistic expectations about the market.

## When Not to Use

- To analyze a single query's results page — use `serp-analysis` instead.
- To find content topics the site is missing — use `content-gap-analysis`
  (which builds on competitor data).
- To audit the site's own SEO — use `seo-audit` instead.
- To copy a competitor's content or design — that is plagiarism, not
  analysis, and is never the goal.

## Prerequisites

- The site's own domain and its most important queries or topics.
- A list of 3-5 search competitors (sites that rank for the same queries,
  which may differ from business competitors).
- Access to a backlink and keyword data source (Search Console for the
  site's own data; a third-party index for competitors).
- Knowledge of the site's own strengths, so gaps are judged against what
  the site can realistically do.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  the policies all analyzed sites are measured against.
- [Google Search Console](https://search.google.com/search-console/about) —
  the site's own performance data for comparison.

All competitor traffic, keyword,
and link figures are third-party estimates, not Google data; label
them as estimates with a named source.

## Required Workflow

1. Identify true search competitors: the domains that appear most often
   in the top 10 for the site's target queries, not just business rivals.
2. Pick 3-5 competitors to analyze in depth; more than five dilutes the
   analysis.
3. Compare keyword overlap: which queries do competitors rank for that
   the site does not, and which does the site already win?
4. Compare content: the competitors' top pages, their depth and freshness,
   content formats used, and topics they cover that the site does not.
5. Compare backlink profiles: referring-domain counts, the quality and
   relevance of top linking sites, and link growth over time (all as
   estimates from the data source used).
6. Compare technical health at a high level: site speed, mobile
   experience, and obvious crawl or indexation issues visible publicly.
7. Compare SERP presence: which competitors win featured snippets,
   "People also ask", local packs, or other features for shared queries.
8. Identify each competitor's strengths (what they do well that the site
   should match) and weaknesses (thin content, outdated pages, slow site,
   weak links) that the site can exploit.
9. Prioritize opportunities by winnability and value: a weak competitor
   page on a valuable query is the best target.
10. Deliver a comparison table and an opportunity list, with evidence for
    every claim (URL, observed value, date).

## Implementation Standards

- All competitor traffic, keyword, and link figures are estimates from a
  named third-party source; never present them as exact or as Google data.
- Every claim about a competitor cites a public URL or a dated data
  export; no claims from memory or assumption.
- Competitors are judged on search evidence (rankings, content, links),
  not on brand reputation or anecdote.
- The analysis covers both strengths and weaknesses; a report that only
  finds weaknesses is not credible.
- Do not use non-public data: no scraped analytics, no leaked data, no
  access to a competitor's accounts or tools.
- Record the date of the analysis; competitive positions change quickly.

## Best Practices

- Separate search competitors from business competitors: a forum or a
  publisher may be the real rival for a query even if it is not a
  business competitor.
- Focus on the overlap: queries where both the site and a competitor
  appear reveal the battleground; queries only one side wins reveal gaps.
- Study the competitor's best page for a shared query, not their average
  page; the best page is what must be beaten.
- Look for patterns across competitors: if every rival has a calculator,
  a comparison table, or original data, that format is the price of entry.
- Re-run the analysis after major algorithm updates or when a new
  competitor appears in the top 10.

## Security Considerations

- Use only public data and authorized tools; never attempt to access a
  competitor's private systems, accounts, or internal data.
- Do not scrape a competitor's site aggressively; respect robots.txt and
  rate limits, and prefer their sitemap and public pages.
- Competitor data in the report is for internal planning; do not publish
  claims about a competitor's business (revenue, traffic, headcount)
  based on estimates.
- Do not include a competitor's private contact details or internal URLs
  in the report.

## Performance Considerations

- Competitor analysis is research work; the cost is time, so cap the
  competitor list at five and the query set at the most important topics.
- Reuse data exports across analyses (keyword overlap, backlink exports)
  rather than re-pulling them for each report.
- Automate the data collection where a tool supports exports, and spend
  judgment on interpretation.

## Common Mistakes

- Analyzing business competitors instead of search competitors — the
  site ranking above you for your best query may not be a company you
  know.
- Treating third-party traffic estimates as facts — they can be far off,
  especially for small sites; use them to compare, not to quote.
- Copying a competitor's strategy wholesale — their strengths may come
  from resources the site does not have.
- Ignoring weak competitors — a small, focused site can outrank a large
  one on specific queries, and it is often the most beatable rival.
- Analyzing once and never updating — a competitor that was weak last
  year may have invested heavily since.

## Examples

Example competitor comparison table:

```text
| Factor | Our site | Competitor A | Competitor B |
|--------|----------|--------------|--------------|
| Referring domains (est.) | 120 | 850 | 310 |
| Top content format | guides | guides + tools | video |
| Avg. page speed (mobile) | good | poor | good |
| Featured snippets won | 3 | 18 | 6 |
| Weakness | thin product pages | slow mobile site | outdated 2023 guides |
```

Example opportunity entry:

```text
Opportunity: "best bread flour for sourdough"
Competitor A ranks #2 with a 2023 article that has not been updated and
lacks testing data. Our site could publish an updated comparison with
hands-on test results. Winnability: moderate. Value: high (commercial).
```

## Validation Checklist

- [ ] Search competitors were identified from actual SERPs, not assumed.
- [ ] 3-5 competitors were analyzed across keywords, content, links, and
      technical health.
- [ ] All competitor figures are labeled as estimates with a named source.
- [ ] Every claim cites a public URL or a dated data export.
- [ ] Strengths and weaknesses are recorded for each competitor.
- [ ] Opportunities are prioritized by winnability and value.
- [ ] The analysis date is recorded.

## Expected Deliverables

- A competitor comparison table covering keywords, content, links,
  technical health, and SERP features.
- A prioritized opportunity list with the evidence and the recommended
  action for each.
- A summary of each competitor's strengths and weaknesses.
- Recommendations for content, links, or technical work the site should
  do next.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  policies all sites are measured against.
- [Google Search Console](https://search.google.com/search-console/about) —
  the site's own performance data.
- Related skills in this repository: `serp-analysis`, `content-gap-analysis`,
  `keyword-research`, `off-page-seo`, `seo-audit`.
