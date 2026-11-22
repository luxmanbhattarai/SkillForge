---
name: open-graph
description: >
  Add Open Graph meta tags so pages render rich link previews when
  shared on Facebook, LinkedIn, Slack, Discord, and other platforms.
  Use when a page's shared preview is missing, wrong, or ugly; when
  setting up sharing for a new site; or when choosing preview images
  and titles. Covers og:title, og:description, og:image, og:type,
  and og:url.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Open Graph

## Purpose

This skill helps an agent add Open Graph tags so that when someone
shares a page, the preview shows the right title, description, and
image. The outcome is a link preview that looks deliberate on every
platform that reads Open Graph — not a blank card, a wrong image, or
a cropped title.

## When to Use

- Setting up social sharing for a new site or page template.
- Fixing a shared preview that shows the wrong title, description,
  or image — or no preview at all.
- Choosing or creating preview images for articles and landing pages.
- Adding Open Graph tags to pages generated from a CMS or data
  (with `dynamic-metadata` for the generation pattern).
- Debugging why a preview does not update after a change.

## When Not to Use

- When the task is Twitter/X-specific cards — use `twitter-cards`
  (Twitter reads Open Graph as a fallback, but its own tags give
  more control).
- When the task is search-engine metadata — use `seo-metadata`.
- When the task is validating metadata across a site — use
  `metadata-validation`.
- When the task is the overall sharing strategy (which platforms,
  what to share) — use `social-sharing`.

## Prerequisites

- Access to the site's source code or CMS where meta tags are set.
- A preview image for each page or template (see Implementation
  Standards for size).
- Knowledge of the page's canonical URL.
- A way to test the preview: a sharing debugger or a test post on
  the target platform.
- Version range: none — the Open Graph protocol is an unversioned
  specification; see the protocol page in Official Documentation
  for the current property list.

## Official Documentation

- [The Open Graph protocol](https://ogp.me/) — the specification:
  required and optional properties.
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  — test and refresh how Facebook scrapes a URL. Requires a
  Facebook login.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  — test how LinkedIn renders a shared URL. Requires a LinkedIn
  sign-in to run an inspection.

## Required Workflow

1. Inventory the pages or templates that need Open Graph tags, and
   record the current tags (if any) for each.
2. For each page, decide the preview: the title, the one-to-two
   sentence description, and the image. The preview should match the
   page's content, not advertise something else.
3. Prepare the image: 1200x630 pixels is the standard size for a
   large preview card. Keep important text and faces away from the
   edges, because platforms crop differently.
4. Add the core tags to the page's `<head>`: `og:title`,
   `og:description`, `og:image`, `og:url`, and `og:type`. Use
   absolute URLs for `og:image` and `og:url`.
5. Add `og:image:width` and `og:image:height` so platforms can lay
   out the preview without fetching the image first.
6. Set `og:type` correctly: `website` for general pages, `article`
   for articles (with `article:published_time` and
   `article:author` where relevant).
7. Test the preview with a sharing debugger on at least one
   platform, and fix what the debugger reports (missing image, wrong
   URL, redirect).
8. After changing tags on an existing URL, refresh the platform's
   cache with its debugger — platforms cache scraped metadata and
   will not re-fetch on their own schedule.

## Implementation Standards

- Per the Open Graph protocol, the four required properties are
  `og:title`, `og:type`, `og:image`, and `og:url`; `og:description`
  is optional in the spec but recommended. Include all five on
  every public page that may be shared.
- Add `og:image:alt` (the spec recommends it whenever `og:image`
  is present) and `og:site_name` for the site's display name.
- Use absolute URLs for `og:image` and `og:url`. Relative URLs are
  a common cause of broken previews.
- The default preview image size is 1200x630 pixels. Do not use an
  image smaller than 600x315, or some platforms will not show a
  large card.
- `og:title` should match the page's purpose and may differ from
  the `<title>` tag, but it must not misrepresent the page.
- `og:description` should be one or two sentences that work
  standalone, because the preview is often seen without the page.
- `og:url` must be the canonical URL of the page, using the site's
  consistent URL form.
- Do not assume all platforms render previews identically. Test on
  the platforms that matter for the site, and design the image to
  survive cropping.
- Open Graph tags must be in the server-rendered HTML. Social
  crawlers generally do not execute JavaScript, so tags injected
  client-side will not be seen.

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

- Design preview images as a template: consistent branding, the
  article title in large text, and a clear visual. A template
  scales; a one-off image per page does not.
- Keep the most important image content in the center. Different
  platforms crop to different aspect ratios.
- Use a fallback image for pages without a specific image (for
  example, a branded site image), so no page shares without a
  preview.
- For articles, include `article:published_time` and update it
  when the article is substantially revised.
- When a page's preview changes, refresh the cache on each platform
  that matters; do not wait for the cache to expire on its own.
- Keep the image file size reasonable (under a few hundred
  kilobytes) so scrapers fetch it quickly.

## Security Considerations

- Open Graph tags are public metadata. Never include sensitive
  information in a title, description, or image.
- The `og:image` URL is fetched by platform crawlers; host images
  on your own domain or a trusted CDN, not on a URL you do not
  control.
- Be careful with user-generated content in Open Graph tags: escape
  it to prevent HTML injection, and do not let a user control the
  `og:image` URL without validation.
- Preview images can be scraped and reused by anyone; do not use
  images you do not have the right to publish.

## Performance Considerations

- Social crawlers fetch the page and the image when a link is
  shared. A slow page or a huge image delays the preview and can
  cause the platform to give up and show no card.
- Keep preview images under a few hundred kilobytes and serve them
  from a fast origin or CDN.
- The Open Graph tags themselves add negligible weight to the page.

## Common Mistakes

- Using a relative URL for `og:image`, so the platform cannot find
  the image.
- An image that is too small, so the platform shows a small card or
  no image at all.
- Putting important text at the edges of the image, where it gets
  cropped on some platforms.
- Injecting Open Graph tags with client-side JavaScript, which
  social crawlers do not execute.
- Changing the tags and expecting the preview to update immediately
  — platforms cache scraped data; use the debugger to refresh it.
- Assuming one platform's preview matches another's. Test each
  platform that matters.

## Examples

Open Graph tags for an article page:

```html
<head>
  <meta property="og:type" content="article">
  <meta property="og:title" content="How to Fix Dense Sourdough Crumb">
  <meta property="og:description" content="Dense crumb is usually under-fermentation or weak gluten development. Three concrete adjustments fix it.">
  <meta property="og:url" content="https://example.com/blog/fix-dense-sourdough-crumb">
  <meta property="og:image" content="https://example.com/images/og/sourdough-crumb.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="A loaf of sourdough with a dense, tight crumb">
  <meta property="og:site_name" content="Example Bakery Blog">
  <meta property="article:published_time" content="2026-11-20T09:00:00Z">
</head>
```

Open Graph tags for a general page with a fallback image:

```html
<head>
  <meta property="og:type" content="website">
  <meta property="og:title" content="Example Bakery Blog">
  <meta property="og:description" content="Practical baking guides, tested recipes, and troubleshooting for home bakers.">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:image" content="https://example.com/images/og/site-default.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
</head>
```

## Validation Checklist

- [ ] Every public page has `og:title`, `og:description`,
      `og:image`, `og:url`, and `og:type`.
- [ ] `og:image` and `og:url` are absolute URLs.
- [ ] Preview images are 1200x630 (or at least 600x315) and load
      quickly.
- [ ] `og:type` matches the page (`website` or `article`).
- [ ] Tags appear in the server-rendered HTML.
- [ ] The preview was tested with a sharing debugger on at least
      one platform.
- [ ] A fallback image exists for pages without a specific image.
- [ ] Accessibility: titles unique and descriptive; preview images carry alt text.

## Expected Deliverables

- Open Graph tags for each page or template.
- Preview images at 1200x630, with a fallback image for pages
  without one.
- Debugger test results for at least one platform.
- Notes on any platform where the preview differs and why.

## References

- [The Open Graph protocol](https://ogp.me/) — the specification.
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  — test and refresh Facebook previews.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  — test LinkedIn previews.
- Related skills in this repository: `twitter-cards`,
  `seo-metadata`, `dynamic-metadata`, `metadata-validation`,
  `social-sharing`.
