---
name: schema-jsonld
description: >
  Add JSON-LD structured data to pages so search engines can understand
  entities, articles, products, and breadcrumbs and show rich
  results. Use when implementing schema markup, fixing rich result
  errors, or adding Article, Product, or BreadcrumbList markup.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Schema JSON-LD

## Purpose

JSON-LD is Google's recommended format for structured data: a script
block that describes a page's content in machine-readable form. This
skill covers writing valid, accurate JSON-LD for the common types —
Article, FAQPage, BreadcrumbList, Product, Organization, and WebSite —
and validating it with Google's testing tools. Structured data can make
a page eligible for rich results; it never guarantees them.

> Retired features (verified 2026-11-20): `HowTo` rich results were
> deprecated by Google in September 2023, and FAQ rich results stopped
> appearing in Google Search on 7 May 2026 (documentation removed
> June 2026). Both types remain valid schema.org vocabulary, but
> adding them earns no Google rich result. Do not add FAQPage or HowTo
> markup expecting a Google search feature.

## When to Use

- Adding structured data to a new page or template.
- Fixing rich result errors reported in Search Console.
- Adding article, product, or breadcrumb markup. (FAQ and HowTo
  markup no longer earn a Google rich result — see Purpose.)
- Auditing whether existing JSON-LD is valid and matches the visible
  page content.
- Planning which schema types a site should use per template.

## When Not to Use

- To decide the site's overall structured data strategy across many
  types — use `structured-data` for the strategy view.
- To fix crawl or indexation problems — use `technical-seo` instead.
- To optimize titles or body content — use `on-page-seo` instead.
- To mark up content the page does not actually show — that violates
  Google's guidelines and must not be done.

## Prerequisites

- Knowledge of the page's visible content: markup must describe what
  the page actually shows, not hidden or aspirational content.
- Access to edit the page template or HTML.
- The schema.org type reference and Google's structured data feature
  guides (linked below).
- Access to Google's Rich Results Test and Search Console for validation.
- Guidance current as of 2026-11-20. Google retires rich result
  features regularly: besides FAQ (May 2026) and HowTo (September
  2023), Google removed the sitelinks search box (November 2024) and,
  in September 2025, the course info, estimated salary, learning
  video, special announcement, and vehicle listing features. Always
  check the current search gallery before adding a type; the
  schema.org type staying valid does not mean Google still shows the
  feature.

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
- [Farewell, Sitelinks Search Box](https://developers.google.com/search/blog/2024/10/sitelinks-search-box) —
  Google's announcement retiring the sitelinks search box
  (November 2024).
- [Latest documentation updates](https://developers.google.com/search/updates) —
  Google's changelog, where feature retirements (including the FAQ
  removal in May 2026) are recorded.

## Required Workflow

1. Identify the page type and the schema types that match its visible
   content (an article page gets Article, a product page gets Product).
2. Check Google's search gallery for the type's required and recommended
   properties; only include properties the page genuinely has.
3. Write the JSON-LD as a single `<script type="application/ld+json">`
   block, or one block per entity, placed in the `<head>` or at the end
   of the `<body>`.
4. Use absolute URLs for `url` and `image` properties, and ISO 8601
   dates (`2026-11-20`) for date properties.
5. For pages with multiple entities (for example, an article with
   breadcrumbs), use `@graph` or separate script blocks, and link
   entities with `@id` where it clarifies the relationship.
6. Validate with the Rich Results Test and the Schema Markup Validator;
   fix every error, and fix warnings where the data exists on the page.
7. Confirm the markup matches the visible content: every property value
   must appear on the page or be directly supported by it.
8. Check Search Console's Enhancements reports after deployment for
   errors on the live pages.
9. Re-validate after any template change that touches the marked-up
   content.

## Implementation Standards

- JSON-LD must be valid JSON: no trailing commas, no comments, correct
  quoting, and no unescaped characters that break parsing.
- Markup describes only content visible on the page. Never mark up
  reviews, ratings, prices, or availability the page does not show.
- Never fabricate ratings, reviews, or business details in examples or
  in production markup; use only real, verifiable values.
- Required properties for a rich result type must all be present; a
  missing required property makes the page ineligible for that feature.
- Dates use ISO 8601 format; prices include a currency; images use
  absolute URLs that return a 200 status.
- One `@context` of `https://schema.org` per script block.
- Do not mark up the same entity twice with conflicting values on one
  page.
- FAQPage markup is only for pages with a genuine question-and-answer
  list where the questions and answers are visible on the page. Note
  it earns no Google rich result as of May 2026; it remains valid
  schema.org vocabulary that other consumers may use.
- Breadcrumb rich results appear on desktop search results only, not
  on mobile (Google, January 2025). BreadcrumbList markup is still
  worth adding for desktop results and for other consumers.
- Do not add `WebSite` + `SearchAction` markup expecting a sitelinks
  search box: Google retired that feature in November 2024. Keep
  `WebSite` `name` markup on the homepage — Google uses it for site
  names — and add `SearchAction` only if the site has real site
  search that other consumers can use.

## Best Practices

- Generate JSON-LD from the same data source as the page content (CMS
  fields, frontmatter) so markup and visible content cannot drift apart.
- Keep markup minimal: include the properties Google requires and the
  ones that add real information, not every property the type allows.
- Use `@id` to connect entities (an Article's author to a Person, a
  page to its BreadcrumbList) when the page carries more than one entity.
- Prefer one script block per entity for readability, or `@graph` when
  entities reference each other.
- Test markup on staging before deploying to production, and re-test
  after any CMS or template update.

## Security Considerations

- Never include secrets, API keys, internal identifiers, or personal
  data in JSON-LD; it is public by design.
- Escape user-supplied content (names, descriptions) when generating
  JSON-LD from a CMS; unescaped input can break the JSON or inject
  script content.
- Do not expose unpublished or draft content through markup on a public
  page.
- Be careful with `sameAs` links: only link to profiles the site or
  author actually controls.

## Performance Considerations

- JSON-LD blocks are small and have negligible performance cost; keep
  them concise and avoid duplicating large text bodies inside markup.
- Generate markup at build or render time from existing data; do not
  add a separate data fetch just for structured data.
- Do not inject JSON-LD with client-side JavaScript after load where it
  can be avoided; server-rendered markup is more reliably read.

## Common Mistakes

- Marking up content the page does not show — hidden FAQs, invented
  ratings, or prices not on the page violate Google's guidelines and
  can lead to a manual action.
- Invalid JSON — a single trailing comma or unescaped quote breaks the
  whole block and the page loses all its markup.
- Copying example markup with example values into production — example
  values are illustrative, not real data.
- Using relative URLs in `url` or `image` — Google requires absolute
  URLs for these properties.
- Adding every schema type to every page — irrelevant markup adds noise
  and can trigger errors; only mark up what the page actually is.

## Examples

Example Article JSON-LD (values are generic examples for illustration;
use the page's real values in production):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Fix Sourdough That Won't Rise",
  "author": {
    "@type": "Person",
    "name": "Example Author"
  },
  "datePublished": "2026-11-20",
  "dateModified": "2026-11-20",
  "image": "https://example.com/images/sourdough-starter-bubbles.jpg"
}
</script>
```

Example BreadcrumbList JSON-LD:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Sourdough Guide",
      "item": "https://example.com/sourdough-guide"
    }
  ]
}
</script>
```

Example FAQPage JSON-LD (only when the questions and answers are
visible on the page; earns no Google rich result since May 2026, but
remains valid schema.org markup):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why is my sourdough not rising?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The most common cause is an underfed starter. Feed it twice a day for three days and try again."
      }
    }
  ]
}
</script>
```

## Validation Checklist

- [ ] The JSON-LD is valid JSON with no trailing commas or syntax errors.
- [ ] The Rich Results Test reports no errors for the page.
- [ ] The Schema Markup Validator reports no errors.
- [ ] Every marked-up value matches content visible on the page.
- [ ] Required properties for the target rich result type are present.
- [ ] URLs are absolute and dates use ISO 8601 format.
- [ ] No fabricated ratings, reviews, or business details are present.
- [ ] Search Console shows no enhancement errors after deployment.

## Expected Deliverables

- Valid JSON-LD added to the page or template, with the Rich Results
  Test output confirming no errors.
- A list of the schema types applied per template and the properties used.
- A note of any rich result eligibility gained (eligibility, not a
  guarantee of display).

## References

- [Schema.org](https://schema.org/) — vocabulary reference.
- [Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) —
  Google's structured data guide.
- [Structured data search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) —
  supported rich result features.
- [Rich Results Test](https://search.google.com/test/rich-results) —
  validation tool.
- [Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes) —
  Google's FAQ/HowTo announcement.
- [Latest documentation updates](https://developers.google.com/search/updates) —
  Google's changelog for feature retirements.
- Related skills in this repository: `structured-data`, `on-page-seo`,
  `technical-seo`, `search-console`.
