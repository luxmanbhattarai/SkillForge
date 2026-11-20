---
name: keyword-research
description: >
  Discover, evaluate, and prioritize the search queries a site should
  target, using search volume estimates, difficulty signals, and business
  value. Use when planning content, choosing target keywords, building a
  content calendar, or finding what an audience actually searches for.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Keyword Research

## Purpose

Keyword research finds the queries real people type into search engines
and ranks them by value so content effort goes where it can win. This
skill produces a prioritized keyword list with intent, difficulty
signals, and a recommended target page for each query. Search volume and
difficulty figures from third-party tools are estimates, not Google data,
and must always be labeled as estimates.

## When to Use

- Planning a new site, section, or content calendar.
- Choosing the target query for a page or article.
- Finding long-tail queries a smaller site can realistically compete for.
- Expanding an existing site into adjacent topics.
- A content audit shows pages targeting queries nobody searches for.

## When Not to Use

- To group already-chosen keywords into topic clusters — use
  `keyword-clustering` instead.
- To classify a query's intent in depth — use `search-intent` instead.
- To analyze what currently ranks for a query — use `serp-analysis`.
- To write the content itself — use `on-page-seo` after research is done.

## Prerequisites

- Knowledge of the site's niche, audience, and business goals (what a
  visit or conversion is worth).
- Access to at least one keyword data source: Google Search Console
  (queries the site already gets impressions for), a keyword tool, or
  Google's own suggestions and "People also ask" results.
- A list of seed topics (5-20 broad topics the site covers or wants to
  cover).
- The site's current authority level, honestly assessed: a new site
  cannot target the same queries as an established authority.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on understanding what users search for.
- [Google Search Console](https://search.google.com/search-console/about) —
  the Performance report shows real queries the site already appears for.

Guidance current as of 2026-11-20. Volume and difficulty figures from
keyword tools are third-party estimates, not Google data; treat every
such number as an estimate with a named source.

## Required Workflow

1. Start with seed topics: list the core topics the site covers, in the
   audience's own words, not internal jargon.
2. Expand each seed into candidate queries using Search Console data,
   autocomplete suggestions, "People also ask", related searches, and a
   keyword tool where available.
3. Record for each candidate: the query, an estimated monthly volume
   (labeled as an estimate, with the source), a difficulty signal, and
   the apparent intent.
4. Check the SERP for the top candidates (see `serp-analysis`): note the
   content types ranking, the strength of the competing domains, and
   whether the results match the site's capabilities.
5. Score each query for business value: how closely it matches what the
   site offers, and what a visitor from that query is likely to do.
6. Prioritize: favor queries where intent matches the site's content,
   competition is beatable, and business value is real. Long-tail,
   specific queries usually win for new or small sites.
7. Assign each prioritized query to exactly one target page (existing or
   planned). Two pages targeting the same query create cannibalization.
8. Group related queries into clusters for content planning (see
   `keyword-clustering`).
9. Deliver the keyword list as a table with query, intent, volume
   estimate and source, difficulty signal, priority, and target page.
10. Revisit quarterly: search behavior changes, and Search Console data
    shows which queries are actually gaining traction.

## Implementation Standards

- Volume and difficulty numbers are always estimates from a named source;
  never present them as exact Google data, and never invent them.
- Every keyword gets an intent label (informational, navigational,
  commercial, or transactional) before it is prioritized.
- Every prioritized keyword maps to exactly one target page.
- Prioritization must weigh all three factors — intent fit, beatable
  competition, business value — not volume alone.
- Record the date of the research and the tools used; keyword data goes
  stale and the next researcher needs to know its age.
- Do not target trademarked terms of competitors as primary keywords in
  a way that misleads users; comparison content must be honest and fair.

## Best Practices

- Mine Search Console first: queries the site already gets impressions
  for are proven demand, and moving from position 12 to position 5 is
  often easier than ranking a new query from scratch.
- Prefer specific long-tail queries for new sites: "how to fix sourdough
  that won't rise" is winnable where "sourdough" is not.
- Look for questions: question queries reveal the exact problems the
  audience needs solved and make strong article topics.
- Check seasonality where it matters: a query's demand may peak in one
  season and be near zero in another.
- Keep a "parking lot" of good keywords the site is not ready for yet,
  with a note on what would make them winnable (more authority, a new
  section, a product).

## Security Considerations

- Do not scrape search engines or keyword tools in violation of their
  terms of service; use official APIs or the tool's interface.
- Keyword data from a client's account is confidential; do not share it
  with third parties or include it in public documents.
- Do not use keyword research to build deceptive content that targets a
  competitor's brand or a trademarked term to mislead searchers.

## Performance Considerations

- Keyword research is a time cost, not a server cost: cap the candidate
  list (a few hundred queries) and triage quickly so effort goes to
  scoring the best candidates, not collecting thousands.
- Automate the mechanical parts (exports, deduplication, clustering
  inputs) and spend human judgment on intent and prioritization.
- Re-run only the changed portions on a refresh; full re-research every
  quarter wastes effort.

## Common Mistakes

- Chasing volume alone — a high-volume query with the wrong intent or
  unbeatable competition is a dead end.
- Treating tool estimates as facts — two tools can report very different
  volumes for the same query; use estimates to compare, not to promise.
- Targeting the same query on multiple pages — the pages compete with
  each other and neither ranks as well as one focused page would.
- Ignoring Search Console — the site's own data is the most reliable
  source of what its audience searches for.
- Researching once and never revisiting — demand shifts, competitors
  move, and yesterday's opportunity may be gone.

## Examples

Example keyword table row (estimates labeled, source named):

```text
| Keyword | Intent | Volume (est.) | Difficulty | Priority | Target page |
|---------|--------|---------------|------------|----------|-------------|
| how to fix sourdough that won't rise | informational | 800/mo (Tool X est.) | low | 1 | /sourdough-wont-rise |
| best bread flour for sourdough | commercial | 1,200/mo (Tool X est.) | medium | 2 | /best-bread-flour |
| sourdough starter ratio | informational | 500/mo (Tool X est.) | low | 3 | /sourdough-starter-ratio |
```

Example prioritization rule of thumb for a new site:

```text
Priority 1: long-tail, low difficulty, high intent fit, clear business value.
Priority 2: medium difficulty, strong intent fit, winnable within 6-12 months.
Priority 3: high volume or high difficulty — revisit after authority grows.
```

## Validation Checklist

- [ ] Every keyword has an intent label and a target page assignment.
- [ ] Volume and difficulty figures are labeled as estimates with a
      named source.
- [ ] No two pages target the same primary query.
- [ ] Top candidates were checked against the live SERP.
- [ ] Prioritization weighs intent, competition, and business value.
- [ ] The research date and tools used are recorded.

## Expected Deliverables

- A prioritized keyword list (spreadsheet or markdown table) with query,
  intent, volume estimate and source, difficulty signal, priority, and
  target page.
- A short summary of the top 10 opportunities and why they were chosen.
- A parking-lot list of deferred keywords with the reason for deferring.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on understanding searchers.
- [Google Search Console](https://search.google.com/search-console/about) —
  real query data from the Performance report.
- Related skills in this repository: `keyword-clustering`, `search-intent`,
  `serp-analysis`, `content-gap-analysis`, `on-page-seo`.
