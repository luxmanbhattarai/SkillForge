---
name: content-strategy
description: >
  Plan and govern a website's content program: audience research, topic
  clusters, editorial calendars, content audits, and governance. Use when
  starting a new site, planning a content roadmap, auditing existing content,
  or deciding what to publish next. Trigger keywords: content strategy,
  editorial calendar, topic cluster, content audit, content roadmap,
  pillar page, content plan.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Content Strategy

## Purpose

This skill turns a vague "we need content" request into a concrete, prioritized
plan: who the audience is, which topics to cover, in what order, and how each
piece earns its place. It produces a topic-cluster map, an editorial calendar,
and governance rules so publishing stays consistent instead of ad hoc. The
output is a decision-making artifact, not a pile of article ideas.

## When to Use

- Launching a new site, blog, or documentation hub and deciding what to publish first.
- Planning a content roadmap for the next quarter or year.
- Auditing existing content to find gaps, overlaps, and underperforming pages.
- Choosing between competing topic ideas when publishing capacity is limited.
- Reorganizing a site's information architecture around topic clusters.
- Defining who owns, reviews, and updates content on a team.

## When Not to Use

- Writing a single article — use `article-writing` or `blog-writing` instead.
- Turning one keyword into one page — use `keyword-to-content` instead.
- Researching facts for a specific draft — use `content-research` instead.
- Updating an old page — use `content-refresh` instead.
- Checking a finished draft before publishing — use `editorial-review` instead.

## Prerequisites

- A defined audience (at minimum: who they are and what problem brings them to the site).
- The site's business goal (signups, sales, ad revenue, support deflection, authority).
- Access to existing content inventory, or an empty site and a blank slate.
- Analytics or Search Console access when auditing an existing site (helpful, not required).
- Publishing capacity: how many pieces per week or month the team can realistically ship.

## Official Documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — the baseline rules content must satisfy to appear in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality and self-assessment.
- [Nielsen Norman Group](https://www.nngroup.com/) — research on content usability and information architecture.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — federal plain-language guidelines that apply to any audience-facing writing.

## Required Workflow

1. Define the audience in one paragraph: who they are, what they are trying to do, and what they already know. Name the primary audience only; secondary audiences get a sentence each.
2. State the business goal and the single primary conversion or outcome each content type serves.
3. Inventory existing content (title, URL, topic, last updated, traffic if available) into a table. For a new site, record that the inventory is empty.
4. Map topics into clusters: one pillar topic per cluster, with supporting subtopics that link to the pillar. Keep clusters to 3-8 supporting pages each.
5. Score every candidate topic on three factors: audience demand (evidence from keyword research or support tickets), business value, and effort. Rank by demand times value divided by effort.
6. Sequence the calendar: publish pillar pages before their supporting pages, and front-load topics where the site has genuine expertise.
7. Assign ownership and cadence: one owner per piece, one review date per quarter for evergreen pages, and a publish frequency the team can sustain.
8. Define governance: who approves, what the review checklist is (`editorial-review`), and when a page is updated, merged, or retired.
9. Write the plan down as a single document with the cluster map, the calendar, and the governance rules, and review it quarterly.

## Implementation Standards

- Every topic in the plan must name its target audience and the search intent it serves (informational, navigational, commercial, or transactional).
- Topic clusters must be connected by internal links: every supporting page links to its pillar, and the pillar links back to each supporting page.
- Calendars must state publish dates, owners, and status; a calendar without dates is a wish list, not a plan.
- Prioritization scores must be recorded with their evidence (keyword data, ticket volume, or survey results), never asserted without a source.
- Content goals must be measurable (published pages, indexed pages, sessions, conversions) and reviewed on a fixed schedule.
- Plans must account for maintenance: budget at least 20% of publishing capacity for updates and refreshes.
- Never plan content around a topic the site cannot cover with genuine expertise or first-hand experience.

## Best Practices

- Start narrow: one cluster done well beats five clusters half-finished, especially on a new site.
- Build the calendar around the audience's seasonal needs, not the team's internal milestones.
- Reuse research across pieces: one strong research pass can feed a pillar page, three supporting articles, and a FAQ.
- Keep the inventory current; a stale inventory leads to duplicate topics and cannibalization.
- Involve the people who talk to customers (support, sales) when choosing topics — they know the real questions.
- Review the plan after every quarter of publishing and cut topics that no longer fit.

## Security Considerations

- Do not include internal credentials, API keys, or private analytics exports in strategy documents shared outside the team.
- Treat audience research data (survey responses, interview notes) as personal data: store it securely and do not publish identifiable details without consent.
- When sharing a content plan with external writers, share only the briefs they need, not the full strategy or performance data.

## Performance Considerations

- A content audit of a large site (thousands of URLs) should be batched: audit by section, not all at once, to keep the work reviewable.
- Publishing cadence should match indexing and review capacity; shipping faster than the team can review creates a backlog of unreviewed pages.
- Prefer updating a strong existing page over publishing a new thin one — fewer, better pages are cheaper to maintain and easier for readers to trust.

## Common Mistakes

- Planning topics without audience evidence — ideas that sound good but nobody searches for or asks about.
- Publishing pillars and supporting pages in random order, so internal links point to pages that do not exist yet.
- Treating the calendar as fixed: a plan that never changes ignores what the data says after launch.
- Ignoring maintenance: a site that only adds pages accumulates outdated content that erodes trust.
- Copying a competitor's topic list instead of building around the site's own expertise.

## Examples

Example cluster map for a home-baking site:

```text
Pillar: Sourdough starter guide
  - How to feed a sourdough starter
  - Why your starter smells like acetone
  - Sourdough starter feeding schedule
  - Can you freeze sourdough starter?
  - Sourdough starter vs. commercial yeast
```

Example calendar row:

```text
| Week | Topic | Owner | Status | Publish date |
| 1    | Sourdough starter guide (pillar) | A. Reyes | Draft | 2026-12-07 |
| 2    | How to feed a sourdough starter  | A. Reyes | Brief | 2026-12-14 |
```

## Validation Checklist

- [ ] The audience and business goal are written down in one paragraph each.
- [ ] Every topic names its audience and search intent.
- [ ] Clusters have one pillar and 3-8 supporting pages with a linking plan.
- [ ] Topics are scored and ranked with recorded evidence.
- [ ] The calendar has dates, owners, and a sustainable cadence.
- [ ] Governance rules cover approval, review, update, and retirement.
- [ ] At least 20% of capacity is reserved for maintenance.

## Expected Deliverables

- A content strategy document with audience, goals, cluster map, and governance rules.
- An editorial calendar with dates, owners, and status for the planning period.
- A content inventory table (for existing sites) with gap and overlap findings.
- A prioritized topic list with scores and evidence.

## References

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- Related skills in this repository: `content-brief`, `keyword-to-content`, `content-refresh`, `editorial-review`.
