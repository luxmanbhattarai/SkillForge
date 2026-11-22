---
name: keyword-clustering
description: >
  Group related keywords into topic clusters that map to pages and site
  sections, so each cluster is served by one focused page or hub. Use
  when organizing a keyword list, planning site architecture, or fixing
  keyword cannibalization.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Keyword Clustering

## Purpose

Keyword clustering turns a flat list of keywords into a content plan:
queries that share an intent and a SERP belong together on one page,
while queries with different intents need separate pages. This skill
produces clusters with a primary keyword, supporting queries, a target
page, and the internal-link relationships between clusters. It prevents
cannibalization and makes site structure follow how people actually
search.

## When to Use

- A keyword list from `keyword-research` needs to become a content plan.
- A site has multiple pages competing for the same query.
- Planning a hub-and-spoke section (pillar page plus supporting articles).
- Restructuring a site's information architecture around topics.
- A content audit shows scattered, overlapping articles on one topic.

## When Not to Use

- To discover new keywords — use `keyword-research` first.
- To classify a single query's intent — use `search-intent` instead.
- To decide what currently ranks for a query — use `serp-analysis`.
- To build the internal links between clustered pages — use
  `internal-linking` after clustering.

## Prerequisites

- A keyword list with intent labels and volume estimates (from
  `keyword-research`).
- SERP overlap data for the main keywords where available: queries whose
  top results share most of the same URLs belong in one cluster.
- Knowledge of the site's existing pages and sections, so clusters can
  map to real URLs.
- The site's content capacity: how many pages can realistically be
  created or maintained.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on organizing content around topics.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  content policies that clustered pages must meet.

Clustering by SERP overlap and
shared intent is an industry method, not a Google-published procedure;
the SERP evidence is what makes a cluster defensible.

## Required Workflow

1. Take the keyword list and confirm every keyword has an intent label;
   cluster by intent first, because different intents need different pages.
2. For the highest-priority keywords, compare SERPs: if two queries share
   most of their top-10 results, they belong in the same cluster.
3. Group remaining keywords by semantic similarity and shared modifiers
   (questions, "best", "how to", locations) into candidate clusters.
4. Name each cluster after its primary keyword — the query with the best
   combination of volume estimate, intent fit, and business value.
5. Assign each cluster to one target page: an existing page, or a new
   page to be created. One cluster, one page.
6. Identify hub opportunities: a broad cluster that several narrower
   clusters support becomes a pillar page linking to the supporting pages.
7. Check for conflicts: any keyword appearing in two clusters, or any
   existing page whose target query now sits in a different cluster,
   must be resolved by merging, splitting, or redirecting.
8. Order clusters by priority so the content calendar follows the
   highest-value clusters first.
9. Hand the cluster map to `internal-linking` to define hub-to-spoke and
   spoke-to-spoke links.
10. Record the cluster map with primary keyword, supporting queries,
    target page, and priority, and revisit it when new keyword research
    is done.

## Implementation Standards

- A cluster is defined by shared intent and SERP overlap, not by shared
  words alone: "sourdough starter" (informational) and "buy sourdough
  starter" (transactional) are different clusters despite sharing words.
- One cluster maps to exactly one page. If a cluster's queries need two
  genuinely different pages, split the cluster.
- A primary keyword is the cluster's best query; supporting queries are
  genuine variants a single page can naturally cover.
- Clusters must be exhaustive for the prioritized keyword list: every
  prioritized keyword belongs to exactly one cluster.
- Cluster size is a judgment call, but a cluster with more than about
  20 supporting queries usually hides two clusters.
- Do not force a keyword into a cluster where it does not fit; an
  unassigned keyword is a signal for new research, not a rounding error.

## Best Practices

- Use SERP overlap as the deciding test when two queries look similar;
  if Google shows the same pages for both, one page serves both.
- Keep cluster names stable over time so the map stays comparable across
  research rounds.
- Build the pillar page first in a hub, then the supporting pages, so
  every new page has a hub to link to from day one.
- Re-cluster after major research updates; clusters drift as search
  behavior and the site's content change.
- When a cluster's primary keyword is too competitive, target a
  supporting long-tail query first and grow into the primary keyword.

## Security Considerations

- Keyword and cluster data from a client's account is confidential; do
  not share the cluster map outside the engagement.
- Do not scrape search engines to gather SERP overlap data; use a tool
  with an official data source or manual checks.
- Clustering itself has no direct security risk; the risk is in the data
  sources, so handle exports and credentials carefully.

## Performance Considerations

- Clustering is a planning activity with no server impact; the cost is
  analysis time, so cap the keyword list before clustering and triage
  low-value keywords out early.
- For lists over a few thousand keywords, use a clustering tool or
  spreadsheet grouping rather than manual grouping, then review the
  output by hand.
- Re-cluster incrementally: only new or changed keywords need fresh
  grouping when the map already exists.

## Common Mistakes

- Clustering by shared words instead of shared intent — "apple pie
  recipe" and "apple pie near me" are different clusters.
- Creating one page per keyword — this produces dozens of thin pages
  that cannibalize each other instead of one strong page.
- Ignoring SERP overlap — two queries that look different may be served
  by the same results, and one page covers both.
- Clusters with no owner page — a cluster that maps to "some future
  page" is a plan, not a result; assign a page or a creation date.
- Over-clustering — splitting a topic so finely that each page is too
  thin to rank on its own.

## Examples

Example cluster map (one cluster, one page):

```text
Cluster: sourdough starter
Primary keyword: how to make a sourdough starter
Supporting queries:
  - sourdough starter recipe
  - how to start a sourdough starter
  - sourdough starter from scratch
  - how long does a sourdough starter take
Target page: /how-to-make-sourdough-starter
Priority: 1
```

Example hub-and-spoke structure:

```text
Pillar (hub): /sourdough-guide
  Spoke: /how-to-make-sourdough-starter
  Spoke: /sourdough-wont-rise
  Spoke: /sourdough-starter-ratio
  Spoke: /best-bread-flour
```

## Validation Checklist

- [ ] Every prioritized keyword belongs to exactly one cluster.
- [ ] Every cluster has a primary keyword, supporting queries, and one
      target page.
- [ ] Clusters were tested by intent and, for top keywords, by SERP
      overlap.
- [ ] No keyword appears in two clusters and no two pages target the
      same cluster.
- [ ] Hub opportunities are identified with pillar and spoke pages named.
- [ ] The cluster map is recorded with priorities and creation status.

## Expected Deliverables

- A cluster map (spreadsheet or markdown) with cluster name, primary
  keyword, supporting queries, target page, and priority.
- A hub-and-spoke diagram or list for each pillar section.
- A list of conflicts found (duplicate targets, cannibalization) with
  the resolution for each.
- A prioritized content creation order derived from the clusters.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on organizing content.
- Related skills in this repository: `keyword-research`, `search-intent`,
  `serp-analysis`, `internal-linking`, `content-gap-analysis`.
