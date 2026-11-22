---
name: twitter-cards
description: >
  Add Twitter (X) Card meta tags so links shared on X render rich
  previews with the right image, title, and description. Use when a
  link's preview on X is missing, wrong, or cropped; when choosing
  between summary and summary_large_image cards; or when setting up
  sharing for a new site. Covers twitter:card, twitter:image, and
  testing cards with the post composer.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Twitter Cards

## Purpose

This skill helps an agent add Twitter Card tags so links shared on X
(formerly Twitter) render as rich previews. The outcome is a card
that shows the intended image on X — with the right card type for
the content — instead of a bare link or a badly cropped image.

## When to Use

- Setting up sharing for a new site where X is a traffic source.
- Fixing a link preview on X that shows the wrong image, no image,
  or a cropped image.
- Choosing between a summary card and a large-image card for a page.
- Adding a site or creator handle to cards.
- Debugging why a card does not update after a change.

## When Not to Use

- When the task is previews on Facebook, LinkedIn, or Slack — use
  `open-graph` instead (X also reads Open Graph as a fallback, but
  its own tags give more control on X).
- When the task is search-engine metadata — use `seo-metadata`.
- When the task is validating metadata across a site — use
  `metadata-validation`.
- When the task is the overall sharing strategy — use
  `social-sharing`.

## Prerequisites

- Access to the site's source code or CMS where meta tags are set.
- A preview image for each page or template (1200x600 for a large
  card).
- Knowledge of the page's canonical URL.
- The site's X handle, if cards should attribute the site or creator.
- Version range: none — X Cards has no versioned specification,
  and X removed its Cards documentation from developer.x.com; the
  tag limits in this skill are verified against the archived May
  2025 reference (see Official Documentation).

## Official Documentation

- [X Developer Platform](https://developer.x.com/) — the official
  documentation home for X. Note: X retired the Card Validator
  preview in August 2022 and has not replaced it, and the Cards
  pages are no longer in X's live developer docs. The tag behavior
  in this skill follows X's published Cards markup reference
  (archived May 2025) and current platform behavior.
- [The Open Graph protocol](https://ogp.me/) — X falls back to Open
  Graph tags when Twitter-specific tags are missing.
- [web.dev](https://web.dev/) — general guidance on social sharing
  metadata.

## Required Workflow

1. Inventory the pages or templates that need Twitter Card tags,
   and record the current tags (if any).
2. Choose the card type per page:
   - `summary_large_image` for articles, landing pages, and any
     page where the image carries the message.
   - `summary` for pages where the image is secondary (a small
     thumbnail is enough).
3. Prepare the image: 1200x600 pixels (2:1) for a large card, with
   important content centered so cropping does not remove it.
4. Add the tags to the page's `<head>`: `twitter:card`,
   `twitter:title`, `twitter:description`, and `twitter:image`.
   Use absolute URLs for `twitter:image`.
5. Add `twitter:site` (the site's handle) and `twitter:creator`
   (the author's handle) where known, using the `@handle` form.
6. Keep Open Graph tags in place as well: X falls back to them when
   a Twitter-specific tag is missing, and other platforms need them.
7. Test the card by pasting the URL into an X post composer
   (without publishing) and checking the preview it renders —
   that is X's recommended check since the Card Validator lost
   its preview in August 2022. Also fetch the page as X's crawler
   (`curl -A Twitterbot <url>`) to confirm the tags are in the
   served HTML.
8. After changing tags on an existing URL, expect X's cached card
   to persist for up to about 7 days: there is no re-scrape button
   or manual refresh. Sharing the URL with a harmless query
   parameter (for example, `?v=2`) makes X treat it as a new URL
   and fetch fresh card data.

## Implementation Standards

- Every public page that may be shared on X must have
  `twitter:card`, `twitter:title`, `twitter:description`, and
  `twitter:image`.
- Use absolute URLs for `twitter:image`. Relative URLs are a common
  cause of missing card images.
- The recommended large-card image size is 1200x600 pixels (2:1,
  per X's documented card specification). A 1200x628 (1.91:1) or
  1200x630 image is also acceptable, losing only about 14–15 px top
  and bottom to the 2:1 crop. A large-card image must be at least
  300x157, at most 4096x4096, and under 5 MB; smaller images fall
  back to a small card. A summary-card image must be at least
  144x144.
- `twitter:card` must be one of the supported card types. Do not
  invent a card type. Do not use the `app` card type: app cards
  have rendered as plain summary cards since early 2022. The
  supported types in practice are `summary`,
  `summary_large_image`, and `player`.
- Since late 2023, X's large-image cards show the image with the
  domain overlaid and no longer display the title and description
  as text below the image in most clients. The title and
  description tags are still worth setting (other clients and
  fallbacks use them), but the image now carries the card.
- `twitter:title` and `twitter:description` must accurately
  describe the page; they may match the Open Graph values or be
  tailored for X, but they must not misrepresent the page.
- Handles in `twitter:site` and `twitter:creator` must be real
  handles in the `@handle` form. Do not include a handle you do not
  control or have permission to use.
- Do not assume X renders previews the same way as other platforms.
  Test on X specifically, and design the image to survive cropping.
- Twitter Card tags must be in the server-rendered HTML. X's crawler
  does not reliably execute JavaScript, so tags injected
  client-side may not be seen.

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

- Use `summary_large_image` for articles and landing pages: the
  large image earns more attention in the feed.
- Keep the title short enough to display in full on the card, and
  put the most important words first.
- Design card images as a template (consistent branding, large
  title text) so every page gets a good card without one-off design
  work.
- Keep the most important image content in the center; X crops
  images to its own aspect ratio.
- Use a fallback image for pages without a specific image, so no
  page shares without a card image.
- When a card changes, expect X's cache to hold the old card for
  up to about 7 days; share the URL with a new query parameter
  to force a fresh fetch rather than waiting for it to expire.

## Security Considerations

- Card tags are public metadata. Never include sensitive
  information in a title, description, or image.
- The `twitter:image` URL is fetched by X's crawler; host images on
  your own domain or a trusted CDN.
- Escape user-generated content in card tags to prevent HTML
  injection, and do not let a user control the image URL without
  validation.
- Only attribute handles you control or have permission to use.

## Performance Considerations

- X's crawler fetches the page and the image when a link is shared
  or validated. A slow page or a huge image can cause the card to
  fail or render without an image.
- Keep card images under a few hundred kilobytes and serve them
  from a fast origin or CDN.
- The card tags themselves add negligible weight to the page.

## Common Mistakes

- Using a relative URL for `twitter:image`, so X cannot find the
  image.
- An image that is too small for a large card, so X shows a small
  card or no image.
- Putting important text at the edges of the image, where X crops
  it away.
- Injecting card tags with client-side JavaScript, which X's
  crawler may not execute.
- Changing the tags and expecting the card to update immediately —
  X caches card data for up to about 7 days and offers no manual
  refresh; use a new URL parameter to force a fresh fetch.
- Assuming the X preview matches the Facebook or LinkedIn preview.
  Test on X specifically.

## Examples

Twitter Card tags for an article page:

```html
<head>
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@examplebakery">
  <meta name="twitter:creator" content="@examplebaker">
  <meta name="twitter:title" content="How to Fix Dense Sourdough Crumb">
  <meta name="twitter:description" content="Dense crumb is usually under-fermentation or weak gluten development. Three concrete adjustments fix it.">
  <meta name="twitter:image" content="https://example.com/images/og/sourdough-crumb.jpg">
</head>
```

Twitter Card tags for a general page with a small summary card:

```html
<head>
  <meta name="twitter:card" content="summary">
  <meta name="twitter:site" content="@examplebakery">
  <meta name="twitter:title" content="Example Bakery Blog">
  <meta name="twitter:description" content="Practical baking guides, tested recipes, and troubleshooting for home bakers.">
  <meta name="twitter:image" content="https://example.com/images/og/site-default.jpg">
</head>
```

## Validation Checklist

- [ ] Every public page has `twitter:card`, `twitter:title`,
      `twitter:description`, and `twitter:image`.
- [ ] `twitter:image` is an absolute URL.
- [ ] Large-card images are 1200x600 (2:1; at least 300x157, under
      5 MB).
- [ ] The card type fits the page (large image for articles and
      landing pages, summary where the image is secondary).
- [ ] Handles in `twitter:site` and `twitter:creator` are real and
      authorized.
- [ ] Tags appear in the server-rendered HTML.
- [ ] The card was tested in the X post composer (or a
      third-party preview tool).
- [ ] Open Graph tags are also present as a fallback.
- [ ] Accessibility: titles unique and descriptive; preview images carry alt text.

## Expected Deliverables

- Twitter Card tags for each page or template.
- Card images at 1200x600 for large cards, with a fallback image.
- Composer preview test results for at least one page per template.
- Notes on any card that renders differently than expected and why.

## References

- [X Developer Platform](https://developer.x.com/) — official
  documentation. The Card Validator preview was retired in August
  2022 and the Cards pages are no longer in the live docs; test
  cards in the post composer.
- [The Open Graph protocol](https://ogp.me/) — fallback tags X
  reads when Twitter-specific tags are missing.
- Related skills in this repository: `open-graph`, `seo-metadata`,
  `dynamic-metadata`, `metadata-validation`, `social-sharing`.
