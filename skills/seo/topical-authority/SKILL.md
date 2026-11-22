---
name: topical-authority
description: >
  Build deep, organized coverage of a topic so a site becomes a
  comprehensive resource for it: topic boundaries, pillar and cluster
  architecture, semantic coverage mapping, internal linking strategy,
  depth versus breadth decisions, and measuring coverage over time.
  Use when planning a content program around a topic, expanding into
  adjacent subtopics, or auditing whether a site covers a topic
  thoroughly. Trigger keywords: topical authority, topic cluster,
  pillar page, semantic coverage, content depth, topic map, hub and
  spoke, subject matter coverage.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Topical Authority

## Purpose

Topical authority is the idea that a site known for covering one
subject thoroughly is treated as a useful source for searches on
that subject. This skill turns that idea into a plan: define the
topic, map its subtopics, build a pillar-and-cluster structure with
deliberate internal links, and measure coverage over time. It is a
content-strategy skill, not a ranking promise — no outcome in
positions or traffic is guaranteed.

## When to Use

- Planning a content program around a topic the site wants to own.
- Expanding a site into adjacent subtopics without losing focus.
- Auditing whether a site's coverage of a topic has gaps.
- Restructuring scattered articles into a coherent cluster.
- Deciding whether to go deeper on a topic or broaden into a new one.

## When Not to Use

- To discover the keywords for a topic — use `keyword-research`
  first, then bring the list here.
- To group keywords mechanically into clusters — use
  `keyword-clustering` for the grouping step.
- To fix the links between existing pages — use `internal-linking`.
- To write or optimize a single page — use `on-page-seo`.
- To decide whether an old page in the cluster should be kept —
  use `content-decay` for the diagnosis.
- To establish who the site's entities are — use `entity-seo`.

## Prerequisites

- A defined topic (or a shortlist of candidate topics) and the
  audience the site serves.
- Keyword research for the topic, or the willingness to do it as
  part of the workflow (see `keyword-research`).
- A content inventory: what the site already publishes on the
  topic, with URLs and last-updated dates.
- Access to Search Console for the queries the site already gets
  impressions for on the topic.
- An honest assessment of the site's expertise: a site should
  build authority on topics it genuinely knows, not topics it
  merely wants traffic from.
- Conceptual skill; version range: none — applies to the
  current Google Search guidance; Google publishes no
  topical-authority score or versioned metric; the official sources
  are linked in Official Documentation.

## Official Documentation

- [Understanding news topic authority](https://developers.google.com/search/blog/2023/05/understanding-news-topic-authority) —
  Google's May 2023 post describing its topic authority system:
  it helps determine which expert sources are helpful for newsy
  queries in specialized areas (such as health, politics, or
  finance), weighing notability for a topic or location,
  influence and original reporting, and source reputation. It is
  explicitly about news queries, not about websites in general.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's quality guidance, including the self-assessment
  questions about depth, originality, and whether the site has a
  primary focus.
- [In-depth guide to how Google Search works](https://developers.google.com/search/docs/fundamentals/how-search-works) —
  how Google crawls, indexes, and serves results.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on organizing content and site structure.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  the policies that govern what can appear in results.

**Honesty note — read this
first:** Google publishes no topical-authority score, metric, or
general ranking factor. The only system Google has named "topic
authority" serves news queries, as linked above. Everything else
in this skill — pillar architecture, coverage mapping, depth
targets — is industry practice built on Google's broader guidance
about helpful, comprehensive, people-first content. Claims below
are labeled **(Verified)** when they come from the official
sources above and **(Heuristic)** when they are industry
interpretation. Third-party "topical authority" or "authority"
scores are estimates from private indexes, not Google data.

## Required Workflow

1. Define the topic's boundaries. Write one sentence for what the
   topic includes and one for what it excludes. A topic without
   boundaries becomes a site without focus.
2. Audit existing coverage. List every page the site already has
   on the topic, with its target query, last update, and Search
   Console impressions. Mark what is current, what is thin, and
   what overlaps (see `content-decay` for the diagnosis step).
3. Map the subtopics. From keyword research, Search Console
   queries, "People also ask", and the questions the audience
   actually asks, list the subtopics a thorough resource would
   cover. Group them into clusters (see `keyword-clustering`).
4. Build the coverage map: a table of subtopic, current status
   (covered / partial / missing), target page, and priority.
   Missing subtopics are the content backlog; partial ones are
   the refresh backlog.
5. Design the architecture. One pillar page per cluster that
   introduces the subject and links to every supporting page;
   supporting pages that link back to the pillar and to their
   closest siblings. See `internal-linking` for the linking
   mechanics.
6. Assign one page per subtopic. Two pages targeting the same
   subtopic split the coverage and create cannibalization; merge
   or redirect duplicates before building new pages.
7. Prioritize the build order: subtopics where the audience's
   questions are unanswered, where the site has genuine
   expertise, and where existing pages already get impressions
   but the coverage is thin.
8. Publish in cluster order, not at random: complete one cluster
   before starting the next, so each cluster is a coherent
   resource rather than a scatter of half-finished topics.
9. Link as you publish: every new page links to its pillar and to
   related siblings, and the pillar links to it. Do not leave
   linking as a later cleanup task.
10. Measure coverage quarterly: re-run the coverage map, check
    Search Console impressions by topic section, and record
    which subtopics moved from missing to covered. Adjust the
    backlog from the evidence, not from a score.

## Implementation Standards

- Verified authority principles — primary focus, substantial depth:
  see [references/authority-principles.md](./references/authority-principles.md).
- Cluster structure — one pillar per cluster, one page per subtopic,
  finish a cluster before starting the next: see
  [references/cluster-structure.md](./references/cluster-structure.md).
- Every page in the cluster must be genuinely useful on its own.
  A spoke that exists only to fill the map — thin, derivative, or
  padded — weakens the cluster instead of strengthening it.
- Coverage is measured from the site's own data (pages published,
  queries with impressions, subtopics covered), never from a
  third-party authority score presented as fact.
- Never promise that building a cluster will produce rankings or
  traffic. Coverage is a precondition for being a useful source,
  not a guarantee of visibility.

### Testing Strategy

- Validate coverage from the site's own data: the coverage map
  is re-measured on a schedule (pages published, subtopics
  covered, queries with impressions), and a cluster is only
  called complete when the map says so.
- Audit for cannibalization: when two pages compete for the same
  query, check which one Search Console shows for it, then
  consolidate or differentiate — one page per subtopic is the
  rule the audit enforces.
- Audit internal links per cluster: every spoke links back to
  its pillar, the pillar links out to every spoke, and no spoke
  is orphaned from the cluster it belongs to.
- Audit each new page against the quality bar before it counts
  toward coverage: genuinely useful on its own, first-hand
  expertise where the topic needs it, and no thin or derivative
  filler written only to fill the map.
- Re-measure after changes: a finished cluster is checked again
  after publication (impressions and clicks per query), and a
  cluster that underperforms is revised — coverage is a
  precondition for visibility, not a guarantee of it.

## Best Practices

- Start from the audience's questions, not from a keyword list:
  the questions reveal the subtopics that matter, and the
  keyword list fills in the wording.
- Depth beats breadth for a new or small site: one topic covered
  thoroughly is a stronger foundation than five topics covered
  thinly. Expand only when the first topic's map is mostly covered.
- Let Search Console guide the next cluster: queries the site
  already gets impressions for are proven demand, and the
  subtopics around them are the cheapest expansion.
- Keep the pillar page genuinely useful — an introduction and a
  map of the subject with real summaries — not a bare list of
  links. A pillar that is only a link list is a sitemap, not a
  resource.
- Revisit the map when the topic moves: new questions appear,
  old subtopics go stale, and intent shifts. A coverage map
  older than a quarter is a historical document.
- Original work counts more than coverage volume: first-hand
  experience, original data, and expert review are what Google's
  helpful-content guidance asks for. A cluster of rewritten
  sources is coverage without authority.

## Security Considerations

- Do not publish internal strategy documents (keyword lists,
  priority scores, competitor notes) as part of the site; the
  coverage map is an internal planning artifact.
- When a cluster covers a regulated or safety-sensitive topic
  (health, finance, legal), the content needs qualified review
  before publication; publishing confident advice without
  expertise is a reader-safety risk, not just an SEO problem.
- Treat Search Console data used for coverage measurement as
  confidential; do not share it outside the engagement.

## Performance Considerations

- A coverage program is a time cost, not a server cost: the
  bottleneck is writing good pages, so scope the map to what the
  team can actually publish and maintain.
- Pillar pages that link to many spokes should stay lean: link
  lists with short descriptions, not embedded copies of every
  spoke's content.
- Batch the quarterly coverage review with the content-decay
  review so the same Search Console export serves both.

## Common Mistakes

- Treating a third-party "topical authority" score as a Google
  metric — no such Google metric exists, and the scores are
  estimates from private indexes.
- Building clusters around keywords the site has no expertise in,
  producing thin content that fails Google's helpful-content
  self-assessment.
- Counting pages instead of coverage: fifty thin pages on a topic
  are not authority; ten thorough ones may be.
- Leaving the pillar page as a link list with no real content.
- Publishing spokes without linking them to the pillar or each
  other, so the cluster exists only in the plan.
- Expanding to a second topic while the first is half-covered,
  ending with two weak clusters instead of one strong one.
- Confusing Google's news topic authority system with a general
  ranking factor for all sites; it is documented only for newsy
  queries in specialized areas.

## Examples

Example coverage map for a sourdough topic (statuses are the
site's own assessment, not a tool score):

  [examples/coverage-map.txt](./examples/coverage-map.txt).

Example pillar-and-spoke structure for one cluster:

  [examples/pillar-spoke.txt](./examples/pillar-spoke.txt).

Example quarterly coverage check:

  [examples/quarterly-check.txt](./examples/quarterly-check.txt).

## Validation Checklist

- [ ] The topic's boundaries are written down (includes and excludes).
- [ ] A coverage map exists: every subtopic is covered, partial, or missing.
- [ ] Each cluster has one pillar page and one page per subtopic.
- [ ] No two pages target the same subtopic.
- [ ] Every spoke links to its pillar and the pillar links to every spoke.
- [ ] Coverage is measured from the site's own data, not a tool score.
- [ ] No ranking or traffic outcome is promised from the cluster work.
- [ ] The distinction between Google's news topic authority system
      and the industry concept of topical authority is stated where
      the work is described to others.

## Expected Deliverables

- A topic definition with boundaries.
- A coverage map: subtopics, statuses, target pages, priorities.
- A pillar-and-cluster architecture plan with the linking map.
- A publishing backlog in priority order.
- A quarterly coverage report: what moved from missing to covered,
  and what the site's own Search Console data shows by topic section.

## References

- [Understanding news topic authority](https://developers.google.com/search/blog/2023/05/understanding-news-topic-authority) —
  Google's topic authority system for news queries: notability,
  original reporting, source reputation.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's quality and depth guidance.
- [In-depth guide to how Google Search works](https://developers.google.com/search/docs/fundamentals/how-search-works) —
  crawling, indexing, serving.
- Related skills in this repository: `keyword-research`,
  `keyword-clustering`, `internal-linking`, `content-gap-analysis`,
  `on-page-seo`, `entity-seo`, `content-decay`, `search-console`.
