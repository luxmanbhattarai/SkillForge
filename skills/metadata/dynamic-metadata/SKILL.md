---
name: dynamic-metadata
description: >
  Generate page metadata (titles, descriptions, Open Graph, Twitter
  Cards, canonical URLs) from content data at build time or request
  time, with fallbacks for missing fields. Use when a site has many
  pages from a CMS, database, or markdown files; when hand-writing
  metadata per page does not scale; or when metadata must stay in
  sync with content. Covers metadata functions, fallbacks, and
  escaping.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Dynamic Metadata

## Purpose

This skill helps an agent generate metadata from content data instead
of hand-writing it per page: one function or template that turns a
page's title, summary, image, and slug into correct title,
description, Open Graph, Twitter Card, and canonical tags. The outcome
is metadata that stays in sync with content, never goes missing, and
degrades gracefully when a field is empty.

## When to Use

- A site has many pages generated from a CMS, database, or markdown
  files.
- Metadata must stay in sync with content that changes often.
- Hand-written metadata per page does not scale or keeps going stale.
- Adding metadata to a new template or content type.
- Centralizing metadata logic that is currently duplicated across
  templates.

## When Not to Use

- When the site has a handful of pages and hand-written metadata is
  simpler — use `seo-metadata`, `open-graph`, or `twitter-cards`
  directly.
- When the task is writing the content of titles and descriptions
  (the words, not the generation) — use `seo-metadata`.
- When the task is validating metadata output — use
  `metadata-validation`.
- When the content source has no structured fields to generate from
  — generation needs data; start by adding the fields.

## Prerequisites

- Access to the site's source code and its content source (CMS,
  database, or markdown files).
- Knowledge of the framework's metadata mechanism (for example, a
  metadata function or a head component).
- A list of the content fields available per page (title, summary,
  image, slug, published date).
- The site's base URL and canonical URL rules.

## Official Documentation

- [Google Search Central — Titles and descriptions](https://developers.google.com/search/docs/appearance/title-link)
  — what good titles and descriptions look like.
- [The Open Graph protocol](https://ogp.me/) — the Open Graph
  properties to generate.
- [Next.js — Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
  — the `generateMetadata` pattern for Next.js 16 App Router.
  App Router only (`generateMetadata`, Next.js 13.2+); the Pages
  Router sets metadata with `next/head` instead. Next.js 16.4.x
  is current as of November 2026.
- [Astro — Docs](https://docs.astro.build/) — Astro 7 documentation,
  including head and layout patterns. Astro 7.4.x is current as of
  November 2026; metadata is set with plain tags in a layout's
  `<head>`.

## Required Workflow

1. Map the data. For each content type, list the fields available
   (title, summary, image, slug, dates) and which metadata each
   field feeds.
2. Define the fallback chain for each metadata value: the specific
   field first, then a content-type default, then a site-wide
   default. No metadata value should ever be empty.
3. Write one metadata function or template per content type that
   takes the page's data and returns the full set of tags: title,
   description, canonical URL, Open Graph, and Twitter Card.
4. Build absolute URLs from the site's base URL and the page's slug.
   Never generate a relative URL for `og:image`, `og:url`, or the
   canonical link.
5. Escape all values that come from content data before inserting
   them into HTML attributes, so quotes and markup in content
   cannot break the tags.
6. Render the metadata server-side (or at build time). Metadata
   injected only by client-side JavaScript is invisible to most
   crawlers.
7. Test with representative pages: one with all fields filled, one
   with the image missing, one with the summary missing, and one
   with a long title. Confirm the output is correct in each case.
8. Verify the rendered HTML for each content type and run the
   sharing debuggers on at least one page per type.

## Implementation Standards

- One source of truth per content type: a single function or
  template generates all metadata for that type. Do not duplicate
  metadata logic across templates.
- Every metadata value must have a fallback. A missing image falls
  back to a default image; a missing summary falls back to a
  site-wide description; a missing title falls back to the site
  name. Never emit an empty tag.
- Titles and descriptions must be trimmed to a sensible length
  before output. Truncate at a word boundary and do not cut a
  description mid-sentence if it can be avoided.
- Canonical URLs and Open Graph URLs must be absolute and must use
  the site's consistent URL form (same protocol, host, and
  trailing-slash convention).
- Escape content-derived values for HTML attributes. A title
  containing a double quote must not break the `content` attribute.
- Keep the metadata function pure and testable: it takes page data
  and returns metadata, with no hidden dependencies on request
  state.
- Do not generate metadata from fields that may contain HTML
  markup; strip markup before using a field in a title or
  description.

## Best Practices

- Store the site-wide defaults (site name, default description,
  default image, base URL) in one configuration file, not scattered
  through templates.
- Generate the preview image URL from the page's image field, and
  fall back to a branded default image when the page has none.
- Include the published and updated dates in the metadata for
  articles, and keep them in sync with the content.
- Log or warn when a page falls back to a default value, so content
  gaps are visible instead of silent.
- Test the fallback chain explicitly: the most common metadata bugs
  are missing-field cases, not happy-path cases.
- When content changes, the metadata must regenerate. Tie metadata
  generation to the same build or request that renders the page.

## Security Considerations

- Escape all content-derived values. Unescaped content in a meta
  tag is an HTML injection vector.
- Do not let content authors control arbitrary URLs in metadata
  (canonical, image) without validation; a malicious URL in
  `og:image` or canonical can be abused.
- Metadata is public. Do not include internal identifiers, draft
  status, or personal data in generated tags.
- Validate image URLs: only allow images from your own domain or
  trusted CDNs.

## Performance Considerations

- Metadata generation should be cheap: a few string operations per
  page. If it requires a database query, cache the result or
  compute it at build time.
- Do not block the HTML response on a slow metadata lookup. Compute
  metadata alongside the page data fetch, not as a separate
  round trip.
- For static sites, generate metadata at build time so there is no
  runtime cost at all.

## Common Mistakes

- No fallback chain, so a page with a missing image or summary gets
  an empty or broken tag.
- Relative URLs in `og:image` or canonical, because the base URL
  was not applied.
- Unescaped quotes in a title breaking the HTML attribute.
- Generating metadata client-side, so crawlers never see it.
- Duplicated metadata logic across templates that drifts out of
  sync.
- Forgetting to regenerate metadata when content changes, so the
  tags describe an old version of the page.
- Truncating a description mid-word or mid-sentence.

## Examples

A metadata function for an article page (framework-agnostic):

```js
// Build all metadata for an article from its content fields,
// with a fallback at every step.
const SITE = {
  name: 'Example Bakery Blog',
  baseUrl: 'https://example.com',
  description: 'Practical baking guides and troubleshooting.',
  defaultImage: 'https://example.com/images/og/site-default.jpg',
};

function articleMetadata(article) {
  const title = article.title ?? SITE.name;
  const description = article.summary ?? SITE.description;
  const url = `${SITE.baseUrl}/blog/${article.slug}`;
  const image = article.image
    ? `${SITE.baseUrl}${article.image}`
    : SITE.defaultImage;
  return { title, description, url, image };
}
```

Rendering the metadata in a server-side head component:

```html
<head>
  <title>{metadata.title} | Example Bakery Blog</title>
  <meta name="description" content={metadata.description}>
  <link rel="canonical" href={metadata.url}>
  <meta property="og:title" content={metadata.title}>
  <meta property="og:description" content={metadata.description}>
  <meta property="og:url" content={metadata.url}>
  <meta property="og:image" content={metadata.image}>
  <meta name="twitter:card" content="summary_large_image">
</head>
```

## Validation Checklist

- [ ] Every content type has a single metadata function or template.
- [ ] Every metadata value has a fallback; no tag is ever empty.
- [ ] Canonical, `og:url`, and `og:image` values are absolute URLs.
- [ ] Content-derived values are escaped for HTML attributes.
- [ ] Metadata is rendered server-side or at build time.
- [ ] Fallback cases were tested (missing image, missing summary,
      long title).
- [ ] Rendered HTML was verified for each content type.
- [ ] Sharing debuggers were run on at least one page per type.

## Expected Deliverables

- A metadata function or template per content type, with the
  fallback chain documented.
- A configuration file holding site-wide defaults.
- Test output for the happy path and the fallback cases.
- Verified rendered HTML for each content type.
- Notes on any content field that still needs to be added to the
  CMS or data source.

## References

- [The Open Graph protocol](https://ogp.me/) — Open Graph
  properties.
- [Next.js — Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
  — the `generateMetadata` pattern.
- [Astro — Docs](https://docs.astro.build/) — Astro 7 documentation.
- Related skills in this repository: `seo-metadata`, `open-graph`,
  `twitter-cards`, `metadata-validation`, `social-sharing`.
