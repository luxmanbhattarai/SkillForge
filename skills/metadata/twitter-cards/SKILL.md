---
name: twitter-cards
description: >
  Add Twitter (X) Card meta tags so links shared on X render rich
  previews with the right image, title, and description. Use when a
  link's preview on X is missing, wrong, or cropped; when choosing
  between summary and summary_large_image cards; or when setting up
  sharing for a new site. Covers twitter:card, twitter:image, and
  the X card validator.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Twitter Cards

## Purpose

This skill helps an agent add Twitter Card tags so links shared on X
(formerly Twitter) render as rich previews. The outcome is a card that
shows the intended image, title, and description on X — with the right
card type for the content — instead of a bare link or a badly cropped
image.

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
- A preview image for each page or template (1200x630 for a large
  card).
- Knowledge of the page's canonical URL.
- The site's X handle, if cards should attribute the site or creator.

## Official Documentation

- [X Developer Platform](https://developer.x.com/) — the official
  documentation home for X, including Cards documentation.
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
3. Prepare the image: 1200x630 pixels for a large card, with
   important content centered so cropping does not remove it.
4. Add the tags to the page's `<head>`: `twitter:card`,
   `twitter:title`, `twitter:description`, and `twitter:image`.
   Use absolute URLs for `twitter:image`.
5. Add `twitter:site` (the site's handle) and `twitter:creator`
   (the author's handle) where known, using the `@handle` form.
6. Keep Open Graph tags in place as well: X falls back to them when
   a Twitter-specific tag is missing, and other platforms need them.
7. Test the card with the X card validator (linked from the X
   developer documentation) and fix what it reports.
8. After changing tags on an existing URL, re-validate to refresh
   X's cache — X caches card data and will not re-fetch on its own
   schedule.

## Implementation Standards

- Every public page that may be shared on X must have
  `twitter:card`, `twitter:title`, `twitter:description`, and
  `twitter:image`.
- Use absolute URLs for `twitter:image`. Relative URLs are a common
  cause of missing card images.
- The default large-card image size is 1200x630 pixels. Do not use
  an image smaller than 600x315 for a large card.
- `twitter:title` and `twitter:description` must accurately
  describe the page; they may match the Open Graph values or be
  tailored for X, but they must not misrepresent the page.
- `twitter:card` must be one of the supported card types. Do not
  invent a card type.
- Handles in `twitter:site` and `twitter:creator` must be real
  handles in the `@handle` form. Do not include a handle you do not
  control or have permission to use.
- Do not assume X renders previews the same way as other platforms.
  Test on X specifically, and design the image to survive cropping.
- Twitter Card tags must be in the server-rendered HTML. X's crawler
  does not reliably execute JavaScript, so tags injected
  client-side may not be seen.

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
- When a card changes, re-validate the URL to refresh X's cache
  rather than waiting for it to expire.

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
  X caches card data; re-validate to refresh it.
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
- [ ] Large-card images are 1200x630 (or at least 600x315).
- [ ] The card type fits the page (large image for articles and
      landing pages, summary where the image is secondary).
- [ ] Handles in `twitter:site` and `twitter:creator` are real and
      authorized.
- [ ] Tags appear in the server-rendered HTML.
- [ ] The card was tested with the X card validator.
- [ ] Open Graph tags are also present as a fallback.

## Expected Deliverables

- Twitter Card tags for each page or template.
- Card images at 1200x630 for large cards, with a fallback image.
- Validator test results for at least one page per template.
- Notes on any card that renders differently than expected and why.

## References

- [X Developer Platform](https://developer.x.com/) — official
  documentation, including Cards.
- [The Open Graph protocol](https://ogp.me/) — fallback tags X
  reads when Twitter-specific tags are missing.
- Related skills in this repository: `open-graph`, `seo-metadata`,
  `dynamic-metadata`, `metadata-validation`, `social-sharing`.
