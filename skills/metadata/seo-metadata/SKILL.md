---
name: seo-metadata
description: >
  Write and audit SEO metadata for web pages: titles, meta
  descriptions, canonical URLs, robots directives, and language
  tags. Use when creating or updating pages, fixing duplicate or
  missing titles, setting up a new site, or auditing metadata across
  many pages. Covers title and description writing, canonicalization,
  and robots meta tags.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# SEO Metadata

## Purpose

This skill helps an agent write metadata that helps search engines
understand and present a page correctly: a clear title, an honest
description, a canonical URL, and the right robots directives. The
outcome is pages whose metadata is unique, accurate, and consistent —
so search results show the page as intended and crawlers spend their
budget on the right URLs.

## When to Use

- Creating or updating a page's title, description, or canonical URL.
- Auditing metadata across a site (missing, duplicate, or truncated
  titles and descriptions).
- Setting up metadata for a new site or template.
- Fixing duplicate-content issues with canonical URLs.
- Controlling which pages search engines index (robots directives).

## When Not to Use

- When the task is social preview cards — use `open-graph` or
  `twitter-cards` instead.
- When the task is structured data (schema markup) — that is a
  separate concern from meta tags.
- When the task is validating metadata output across a site — use
  `metadata-validation` for the checking workflow.
- When the metadata must be generated from data at runtime — use
  `dynamic-metadata` for the generation pattern, and this skill for
  the content rules.

## Prerequisites

- Access to the site's source code or CMS where metadata is set.
- The page's content and its primary topic, so the title and
  description can be written accurately.
- Knowledge of the site's canonical URL structure (www or not,
  trailing slash or not, http or https).
- For audits: a list of the site's URLs (sitemap or crawl).
- Version range: none — the skill follows the search engines'
  published guidance, which is unversioned; see Official
  Documentation for the current rules.

## Official Documentation

- [Google Search Central — Titles and descriptions](https://developers.google.com/search/docs/appearance/title-link)
  — how Google uses titles and descriptions in search results.
- [Google Search Central — Canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
  — how canonical URLs work and when to use them.
- [Google Search Central — Robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
  — the robots directives and their effects.

## Required Workflow

1. Inventory the pages. For each page or template, record the
   current title, description, canonical URL, and robots directives.
2. Write or rewrite the title: one per page, unique across the site,
   describing the page's content accurately, with the most important
   words first. Keep it short enough to display in full in search
   results.
3. Write or rewrite the meta description: one per page, unique, an
   honest summary of the page that helps a searcher decide whether
   to click. Do not stuff it with keywords.
4. Set the canonical URL: the single preferred URL for the page's
   content, using the site's consistent URL form (same protocol,
   host, and trailing-slash convention everywhere).
5. Set robots directives only where needed: `noindex` for pages that
   should not appear in search results (thank-you pages, internal
   search results, staging), and leave indexable pages without a
   robots tag.
6. Add language and locale tags where the site serves multiple
   languages (`hreflang` links for alternate-language versions).
7. Verify the output: view the rendered HTML of each page type and
   confirm exactly one title, one description, and one canonical
   tag, with no duplicates or empty values.
8. Re-check after deploy: search engines take time to pick up
   changes, so record the date and verify in Search Console later.

## Implementation Standards

- One `<title>` per page, unique across the site. A duplicate title
  is a signal that two pages are competing for the same query.
- One meta description per page, unique, accurately summarizing the
  page. An empty or missing description means the search engine
  picks its own snippet.
- Titles and descriptions must describe the actual page content.
  Do not write a title that promises something the page does not
  deliver.
- Canonical URLs must be absolute, must use the site's consistent
  URL form, and must point to a page that returns a 200 status.
  A canonical that points to a redirect or an error page is broken.
- Use `noindex` for pages that should not be indexed, and do not
  block those same pages in robots.txt — a blocked page cannot be
  crawled to see the `noindex` directive.
- `index, follow` is the default behavior; an explicit robots tag
  is only needed when restricting something.
- Use the `X-Robots-Tag` HTTP header instead of a meta tag for
  non-HTML resources (PDFs, images, video) that should not be
  indexed.
- Do not use the retired robots directives `noarchive`, `nocache`,
  or `nositelinkssearchbox` — Google ignores them (the cached-link
  and sitelink-search-box features no longer exist).
- Do not use `noindex` on a page that is linked as canonical from
  other pages; the signals conflict.
- Keep metadata in the server-rendered HTML (or in the static
  output), not injected only by client-side JavaScript, so crawlers
  see it on first fetch.

### Accessibility

- Every page gets a unique, descriptive title — screen readers announce
  it first (WCAG 2.4.2).
- Preview images carry alt text: `og:image:alt` and `twitter:image:alt`.
- Descriptions are plain text that makes sense out of context; they are
  read aloud by assistive technology in link previews.
- Validation checks titles and alt text, not just lengths and formats:
  a present-but-empty title is a failure.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Write titles for people first: clear, specific, and honest.
  A title that reads well earns the click; a keyword-stuffed title
  does not.
- Front-load the most important words in the title, because search
  results truncate from the right.
- Make the description a reason to click: what the page covers and
  what the reader gets, in one or two sentences.
- Use a consistent title pattern for templates (for example,
  "Article Title | Site Name") and let the unique part come first.
- Audit metadata regularly: new pages and template changes
  reintroduce duplicates and empty values.
- For large sites, generate metadata from content fields (title,
  summary, slug) rather than hand-writing each page, and review the
  output (see `dynamic-metadata`).

## Security Considerations

- Metadata is public: never put internal identifiers, personal
  data, or anything sensitive in a title, description, or canonical
  URL.
- Canonical URLs and titles built from user input must be escaped
  to prevent HTML injection.
- A `noindex` tag is not access control. Pages that must stay
  private need authentication, not a robots directive.
- Be careful with `hreflang` and canonical URLs pointing to other
  domains: only link to domains you control or trust.

## Performance Considerations

- Metadata tags are tiny; their cost is negligible. The performance
  concern is indirect: metadata generated at request time by a slow
  database query can delay the HTML response. Cache generated
  metadata where possible.
- Avoid blocking the HTML response on metadata lookups that can be
  computed at build time.
- Keep the `<head>` lean: metadata tags, stylesheets, and scripts
  all compete for the same early bytes. Put the title and
  description early in the head.

## Common Mistakes

- The same title or description on every page, usually from a
  template default that was never overridden.
- A canonical URL that points to a different page than the one
  being served, or to a URL that redirects.
- Blocking a page in robots.txt and expecting `noindex` to work —
  the crawler cannot read the tag if it cannot fetch the page.
- Writing descriptions stuffed with keywords instead of a useful
  summary.
- Setting metadata with client-side JavaScript only, so crawlers
  that do not execute JavaScript see nothing.
- Truncating titles mid-word because the important words were put
  last.

## Examples

Complete SEO metadata for an article page:

```html
<head>
  <title>How to Fix Dense Sourdough Crumb | Example Bakery Blog</title>
  <meta name="description" content="Dense crumb is usually under-fermentation or weak gluten development. Learn how to diagnose it and fix it with three concrete adjustments.">
  <link rel="canonical" href="https://example.com/blog/fix-dense-sourdough-crumb">
  <meta name="robots" content="index, follow">
</head>
```

A page that should not be indexed:

```html
<head>
  <title>Thank You | Example Store</title>
  <meta name="robots" content="noindex, follow">
</head>
```

## Validation Checklist

- [ ] Every audited page has exactly one title, one description,
      and one canonical tag.
- [ ] Titles and descriptions are unique across the site.
- [ ] Titles and descriptions accurately describe their pages.
- [ ] Canonical URLs are absolute, use the site's consistent URL
      form, and return a 200 status.
- [ ] `noindex` is used only where intended, and no `noindex` page
      is blocked in robots.txt.
- [ ] Metadata appears in the server-rendered HTML, not only after
      JavaScript runs.
- [ ] A post-deploy check date is set to verify pickup in Search
      Console.
- [ ] Accessibility: titles unique and descriptive; preview images carry alt text.

## Expected Deliverables

- A metadata inventory: page, title, description, canonical URL,
  and robots directives.
- New or corrected metadata for each page or template.
- A list of duplicate or missing values found and fixed.
- Verification output showing the rendered `<head>` for each page
  type.
- Notes on any page intentionally excluded from indexing.

## References

- [Google Search Central — Titles and descriptions](https://developers.google.com/search/docs/appearance/title-link)
  — how Google uses titles and descriptions.
- [Google Search Central — Canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
  — canonical URL guidance.
- [Google Search Central — Robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
  — robots directives.
- Related skills in this repository: `open-graph`, `twitter-cards`,
  `dynamic-metadata`, `metadata-validation`, `social-sharing`.
