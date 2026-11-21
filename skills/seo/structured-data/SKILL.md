---
name: structured-data
description: >
  Plan and govern structured data across a whole site: which schema types
  each template needs, how markup stays accurate as content changes, and
  how to validate it at scale. Use when designing a site's schema
  strategy, auditing markup site-wide, or choosing types per template.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Structured Data

## Purpose

Structured data is the site-wide system for describing content to search
engines: which schema types each template carries, where the data comes
from, and how it stays accurate as content changes. This skill covers
the strategy and governance layer — type selection, data sourcing,
validation at scale, and maintenance. It does not promise rich results;
it makes pages eligible for them and keeps the markup trustworthy.

## When to Use

- Designing a new site's structured data strategy.
- Auditing structured data across many pages or templates.
- Choosing which schema types each template should carry.
- Fixing systematic markup errors reported in Search Console.
- Setting up automated validation for markup in the build pipeline.

## When Not to Use

- To write the JSON-LD for a single page — use `schema-jsonld` instead.
- To fix crawl or indexation problems — use `technical-seo` instead.
- To optimize the visible content itself — use `on-page-seo` instead.
- To mark up local business details — use `local-seo` for the
  business-profile side, then this skill for the markup.

## Prerequisites

- A list of the site's templates (article, product, category, homepage,
  FAQ, event, etc.) and what each displays.
- Access to the data sources the markup will draw from (CMS fields,
  product database, frontmatter).
- Access to Search Console's Enhancements reports and Google's Rich
  Results Test.
- Knowledge of which rich result features matter for the site's goals
  (articles, products, FAQs, breadcrumbs, videos).
- Guidance current as of 2026-11-20. Google retires rich result
  features regularly: FAQ rich results stopped appearing on
  7 May 2026, HowTo was deprecated in September 2023, the sitelinks
  search box was removed in November 2024, and the course info,
  estimated salary, learning video, special announcement, and vehicle
  listing features were removed in September 2025. A schema.org type
  staying valid does not mean Google still shows the feature — check
  the current search gallery before planning around any type.

## Official Documentation

- [Schema.org](https://schema.org/) — the vocabulary reference for all
  types and properties.
- [Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) —
  Google's guide to structured data formats and features.
- [Structured data search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) —
  the rich result features Google supports and their requirements.
- [Rich Results Test](https://search.google.com/test/rich-results) —
  Google's tool for validating markup on a page.
- [Schema Markup Validator](https://validator.schema.org/) — the
  schema.org validator for general JSON-LD correctness.
- [Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes) —
  Google's announcement of the FAQ restriction and HowTo deprecation.
- [Latest documentation updates](https://developers.google.com/search/updates) —
  Google's changelog, where feature retirements are recorded.

## Required Workflow

1. Inventory the templates and the content each one displays; markup
   follows content, so a template inventory comes first.
2. For each template, choose the schema types that match its visible
   content and the rich result features the site wants to be eligible for.
3. Map every property to a real data source: a CMS field, a database
   column, or a computed value. A property with no source must not be
   marked up.
4. Define site-wide entities once: the Organization (or Person), the
   WebSite, and the shared author and publisher entities, with stable
   `@id` values so pages reference the same entity.
5. Implement markup in the templates, generated from the same data as
   the visible content so the two cannot drift apart.
6. Validate every template with the Rich Results Test and the Schema
   Markup Validator before deployment.
7. Deploy and monitor Search Console's Enhancements reports for errors
   and warnings across the site.
8. Add validation to the build or CI pipeline where possible: at minimum,
   a JSON syntax check on generated markup for each template.
9. Document the schema map: template, types used, properties, and data
   sources, so future changes stay consistent.
10. Re-audit after CMS changes, template redesigns, or new content types,
    and when Google adds or retires a rich result feature.

## Implementation Standards

- JSON-LD is the format for all new markup; it is Google's recommended
  format and the easiest to maintain.
- Markup describes only content visible on the page. Never mark up
  reviews, ratings, prices, or availability the page does not show.
- Never fabricate ratings, reviews, or business details; use only real,
  verifiable values from the site's own data.
- Site-wide entities (Organization, WebSite) use stable `@id` URLs and
  are defined once, then referenced by other pages.
- Every property maps to a named data source; properties without a
  source are omitted, not invented.
- Required properties for a target rich result type must all be present
  on every page using that type.
- Dates use ISO 8601; prices include a currency; URLs are absolute.
- Do not apply a schema type to a template whose content does not match
  it; irrelevant markup adds noise and error risk.

## Best Practices

- Start with the highest-value types for the site (Article and
  BreadcrumbList for a blog; Product and BreadcrumbList for a store)
  and expand only where a feature is genuinely useful.
- Generate markup from the same fields as the visible content; hand-
  written markup in a template that nobody updates will drift and
  eventually misrepresent the page.
- Keep a schema map document: without it, every new template risks
  reinventing or contradicting the existing markup.
- Watch Google's search gallery for feature changes; a retired feature
  means markup that no longer earns anything and can be simplified.
  Retired as of 2026-11-20: FAQ and HowTo rich results, the sitelinks
  search box, and the course info, estimated salary, learning video,
  special announcement, and vehicle listing features. Breadcrumb rich
  results appear on desktop search results only (since January 2025).
- Treat Search Console enhancement errors as defects with owners and
  deadlines, not as background noise.

## Security Considerations

- Never include secrets, API keys, internal identifiers, or personal
  data in structured data; it is public by design.
- Escape user-supplied content when generating markup from a CMS;
  unescaped input can break JSON or inject script content.
- Do not expose unpublished, draft, or internal-only content through
  markup on public pages.
- Only link `sameAs` to profiles the site or author actually controls.

## Performance Considerations

- Structured data blocks are small; the cost is in generation, not
  delivery. Generate markup at build or render time from data already
  loaded for the page.
- Do not add a separate data fetch for markup; if the data is not
  already available to the template, reconsider whether the property
  is needed.
- Validation in CI should check template samples, not every page on a
  large site; sample one page per template plus any page with custom
  markup.

## Common Mistakes

- Marking up every type on every page — a homepage does not need
  Product markup, and irrelevant types create errors.
- Markup that drifts from visible content — a price in the markup that
  no longer matches the page is a policy violation waiting to happen.
- Copying example values into production — example markup is illustrative;
  production markup uses the site's real data.
- Ignoring Search Console enhancement errors — errors can remove a
  page's rich result eligibility across the whole site.
- No schema map — without documentation, each new template adds markup
  inconsistently and the site's entities fragment.

## Examples

Example schema map for a blog (template → types → data source):

```text
| Template | Types | Key data sources |
|----------|-------|------------------|
| Article  | Article, BreadcrumbList | frontmatter: title, author, dates |
| Homepage | WebSite, Organization | site config: name, URL, logo |
| FAQ page | FAQPage, BreadcrumbList | page body: questions and answers |
| Category | BreadcrumbList, ItemList | section data: name, page list |
```

Note: FAQPage markup earns no Google rich result since May 2026; it
is listed here only because it remains valid schema.org vocabulary
that other consumers may use. Do not plan a template around a FAQ
rich result.

Example site-wide Organization entity (values are generic examples for
illustration; use the site's real details in production):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://example.com/#organization",
  "name": "Example Baking Blog",
  "url": "https://example.com/",
  "logo": "https://example.com/logo.png"
}
</script>
```

Example CI check (conceptual): for each template, render one sample
page, extract the JSON-LD blocks, parse them as JSON, and fail the build
on a syntax error or a missing required property.

## Validation Checklist

- [ ] A schema map exists: template, types, properties, and data sources.
- [ ] Every template's markup passes the Rich Results Test.
- [ ] The Schema Markup Validator reports no errors on sample pages.
- [ ] Every marked-up value matches content visible on the page.
- [ ] Site-wide entities use stable `@id` values and are defined once.
- [ ] No fabricated ratings, reviews, or business details are present.
- [ ] Search Console shows no enhancement errors after deployment.
- [ ] Markup is generated from the same data as the visible content.

## Expected Deliverables

- A schema map document covering every template.
- Valid JSON-LD implemented in the templates, with validation output.
- A Search Console enhancement report review with errors fixed.
- A maintenance note: who owns the schema map and when it is re-audited.

## References

- [Schema.org](https://schema.org/) — vocabulary reference.
- [Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) —
  Google's structured data guide.
- [Structured data search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) —
  supported rich result features.
- [Rich Results Test](https://search.google.com/test/rich-results) —
  validation tool.
- [Schema Markup Validator](https://validator.schema.org/) — general
  JSON-LD validation.
- Related skills in this repository: `schema-jsonld`, `technical-seo`,
  `on-page-seo`, `search-console`, `local-seo`.
