---
name: programmatic-seo
description: >
  Builds large numbers of useful, data-driven pages from structured data
  using templates, such as location pages, comparison pages, or directory
  listings. Use when planning programmatic SEO, designing page templates,
  validating data quality, avoiding thin or duplicate templated content, or
  scaling a site to hundreds or thousands of pages. Trigger keywords:
  programmatic SEO, pSEO, templated pages, data-driven pages, location
  pages, directory pages, scaled content, template SEO.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Programmatic SEO

## Purpose

This skill designs and builds programmatic SEO pages: many pages
generated from structured data through a shared template, each
targeting a distinct query with genuinely useful, specific content.
Examples include city guides built from location data, product
comparisons built from a catalog, and glossary or directory pages built
from a dataset. The line between programmatic SEO and spam is data
quality and page usefulness: every generated page must answer its query
better than a generic page could, or it should not exist.

## When to Use

- Planning a programmatic SEO program: choosing the data, the
  template, and the page count.
- Designing a page template that turns structured data into useful,
  differentiated pages.
- Auditing existing templated pages for thin content, duplication, or
  indexing problems.
- Deciding which combinations of data deserve a page and which do
  not (pruning the matrix).
- Scaling a site from dozens to hundreds or thousands of pages
  without losing quality control.

## When Not to Use

- For a small site with a handful of hand-written pages — use
  `article-writing` and `on-page-seo` instead.
- For content that needs human judgment, opinion, or original
  research on every page — templates cannot supply that.
- For fixing an existing thin-content problem caused by
  low-quality generation — the fix is pruning and improving pages,
  covered in the workflow below, but start with an audit using
  `seo-audit`.
- When there is no structured data source — programmatic SEO without
  real data produces interchangeable pages. Build the dataset first.

## Prerequisites

- A structured dataset with one row per page (or per entity), with
  fields that genuinely differ between pages.
- Evidence of search demand for the page patterns, from keyword
  research or Search Console data — not assumed demand.
- A rendering pipeline that can generate pages from the template and
  data at build or request time.
- A quality bar agreed in advance: what makes a generated page good
  enough to publish, and who reviews samples.
- Access to Search Console to monitor indexing and traffic per page
  pattern.

## Official Documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — the quality baseline every generated page must meet, including the scaled content guidance.
- [Google Search Central](https://developers.google.com/search) — current guidance on helpful content and spam policies.
- [Schema.org](https://schema.org/) — structured data vocabulary for templated page types.

## Required Workflow

1. Define the page pattern. State the query pattern (for example
   "[service] in [city]"), the data behind it, and the user need it
   serves.
2. Validate the data. Check coverage, accuracy, and freshness of
   every field the template uses; a page is only as good as its row.
3. Prune the matrix. Generate the full combination list, then remove
   combinations with no demand, no data, or no meaningful difference
   from another page. Publish only the survivors.
4. Design the template. Build a page that is useful on its own: a
   clear answer or summary, the specific data for that entity,
   comparisons or context, and links to related pages. Avoid
   boilerplate that dominates the page.
5. Add differentiation. Every page must contain content unique to its
   entity: specific data, computed comparisons, local detail, or
   curated notes. Pages that differ only in the entity name are thin
   content.
6. Build a sample set. Generate 10-20 pages across the matrix,
   review them as a reader would, and fix template and data problems
   before scaling.
7. Launch in stages. Publish a first batch, submit it in the sitemap,
   and monitor indexing and engagement before generating the rest.
8. Monitor and prune. Track which patterns get indexed and visited;
   improve or remove patterns that consistently fail, and refresh
   data on a schedule.

## Implementation Standards

- One page per genuinely distinct entity or combination. If two rows
  produce pages a reader cannot tell apart, they are one page.
- Every generated page has unique, substantive content beyond the
  template shell: at least several sentences or data points specific
  to that entity, not just the entity name swapped into fixed text.
- Data shown on the page must be accurate and dated. Show the data's
  as-of date where freshness matters (prices, availability, rules).
- Titles and descriptions are generated from the entity's real
  attributes, not from a single fixed pattern with one word swapped
  where that produces awkward or misleading titles.
- Internal linking connects related generated pages (same category,
  nearby locations, comparable entities) and links up to the
  category or hub page.
- Each generated page has a self-referencing canonical, is listed in
  the sitemap only if it is indexable, and is excluded from the
  sitemap if it is thin or noindex.
- Templates must not generate pages for entities with missing
  critical data; a page with empty sections is worse than no page.
- Structured data on generated pages describes the specific entity
  on that page, using generic example values only in documentation,
  never fabricated ratings, reviews, or business details in
  production schema.

## Best Practices

- Start with the highest-value slice of the matrix and prove it
  works before generating thousands of pages.
- Mix templated content with human-written content on hub and
  high-traffic pages; templates scale breadth, humans supply depth.
- Add computed value: rankings, comparisons, aggregates, and
  "best for" groupings derived from the data give pages a reason to
  exist beyond the raw dataset.
- Keep the template maintainable: one template per page pattern,
  with data fields clearly mapped, so a fix improves every page.
- Version the dataset. When data changes, regenerate affected pages
  and update their modification dates.
- Watch for near-duplicates as the matrix grows; similarity checks
  between generated pages catch template problems early.

## Security Considerations

- Generated pages must escape all data values before rendering;
  dataset fields containing markup or scripts are an injection risk.
- Never render personal data from the dataset on public pages
  (private addresses, phone numbers, personal emails) unless the
  person has consented and the use is lawful.
- Validate dataset sources: scraped or third-party data may contain
  malicious content, inaccuracies, or data the site has no right to
  publish. Confirm licensing and provenance before publishing.

## Performance Considerations

- Generate pages at build time where possible; generating thousands
  of pages on demand strains the server and slows crawlers.
- Keep each generated page lean: the template shell should not
  outweigh the unique content in size or load time.
- Paginate or cap related-page lists; a page linking to hundreds of
  siblings is slow to render and hard to crawl.
- Sitemaps for large programmatic sets use a sitemap index with
  child sitemaps per pattern or section (see `sitemap-robots`).

## Common Mistakes

- Publishing the full matrix without pruning — thousands of pages
  with no demand or no data differences waste crawl budget and
  dilute the site. Prune first.
- Pages that differ only in the entity name — swapping "Austin" for
  "Dallas" in identical text is thin content. Add entity-specific
  data and detail.
- Stale data — prices, hours, or availability from an old dataset
  mislead users and erode trust. Refresh on a schedule and show
  as-of dates.
- Launching everything at once — a template bug then ships to every
  page. Launch in stages and review samples.
- Noindexing the wrong pages — blocking the pages that earn traffic
  while indexing the thin ones. Check Search Console before pruning.
- Treating programmatic pages as finished — datasets change, and
  unmaintained generated pages decay. Schedule refreshes.

## Examples

A dataset row and the page it generates (generic example values):

```json
{
  "city": "Austin",
  "state": "Texas",
  "bakeries_count": 42,
  "avg_loaf_price_usd": 9.5,
  "data_as_of": "2026-11-01"
}
```

A template outline for a city page:

```md
# Sourdough bakeries in {{city}}, {{state}}

{{city}} has {{bakeries_count}} bakeries that sell sourdough, with an
average loaf price of ${{avg_loaf_price_usd}} (data as of
{{data_as_of}}).

## Bakeries in {{city}}
... list generated from the bakery dataset ...

## How {{city}} compares
... computed comparison against nearby cities ...
```

## Validation Checklist

- [ ] The page pattern serves a real user need with evidence of
      demand.
- [ ] The matrix is pruned: every published page has data, demand,
      and meaningful differences from its siblings.
- [ ] Sample pages reviewed as a reader show unique, accurate,
      entity-specific content.
- [ ] Data values are escaped on render, and no personal or
      unlicensed data is published.
- [ ] Each page has a self-referencing canonical and correct
      sitemap inclusion.
- [ ] Structured data describes the real entity on the page, with no
      fabricated ratings or reviews.
- [ ] Staged launch is monitored in Search Console before the next
      batch ships.

## Expected Deliverables

- The page pattern definition: query pattern, dataset, template, and
  pruning rules.
- The template implementation and a reviewed sample set of pages.
- The staged launch plan with monitoring checkpoints.
- A data refresh schedule and ownership note.

## References

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — quality baseline and scaled content guidance.
- [Google Search Central](https://developers.google.com/search) — helpful content and spam policy guidance.
- [Schema.org](https://schema.org/) — structured data for templated page types.
- Related skills in this repository: `keyword-research`, `on-page-seo`, `sitemap-robots`, `canonical-management`, `search-console`, `seo-audit`.
