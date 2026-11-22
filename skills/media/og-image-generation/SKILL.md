---
name: og-image-generation
description: >
  Create Open Graph images and tags so shared links show a correct,
  attractive preview. Use when a task asks for an OG image, Open Graph
  image, link preview image, og:image tag, or social sharing image for a
  page, article, or site, at the standard 1200x630 size.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# OG Image Generation

## Purpose

This skill produces Open Graph images and the matching `og:` meta tags
so that when a page link is shared, platforms show the intended title,
description, and image. It covers the 1200x630 standard, safe areas,
text rules, per-page images, and preview verification.

## When to Use

- A page, article, or site needs an Open Graph image for link sharing.
- Shared links show the wrong image, no image, or a cropped image.
- A new article needs a per-page `og:image` distinct from the site default.
- A site needs a default fallback OG image for pages without their own.
- A redesign changes branding and existing OG images need updating.

## When Not to Use

- The task is an X (Twitter) card only — use `twitter-card-images`
  instead, since X has its own card tags and image size.
- The task is only checking how a link preview looks — use
  `social-preview` instead.
- The task is the blog hero image with no sharing role — use
  `blog-featured-images` instead.
- The task is a video thumbnail — use `youtube-thumbnails` instead.

## Prerequisites

- The page URL, title, and description the preview should show.
- The site's brand assets: logo, palette, and fonts.
- The Open Graph image size: 1200x630 pixels.
- Access to the page template or CMS where meta tags are set.
- The image file's public URL, since `og:image` must be an absolute URL.

## Official Documentation

- [Open Graph protocol](https://ogp.me/) — the `og:` tag specification,
  including `og:image`, `og:title`, and `og:description`.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) — Meta's official tool for checking what its crawler reads from a page and forcing a re-scrape.
- [MDN: the meta element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
  — how meta tags are written in HTML.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion for OG images. Code examples in this skill use
  the Sharp 0.35.x API (current as of November 2026).
- Compatibility: the Open Graph protocol itself specifies no image
  dimensions — it only defines the tags. The 1200x630 size comes from
  Meta's sharing documentation for Facebook link previews: at least
  1200x630 pixels (about 1.91:1) is recommended for the best display on
  high-resolution screens, at least 600x315 is needed for a large
  preview, 200x200 is the absolute minimum, and files must be under
  8 MB. LinkedIn recommends 1200x627 (1.91:1) with a 5 MB limit, so a
  1200x630 file under 5 MB satisfies both. Keep on-image text inside a
  safe area away from the edges: X's large card is 2:1 and trims about
  15 px from the top and bottom of a 1200x630 image.

## Required Workflow

1. Confirm the page's title, description, and canonical URL for the tags.
2. Decide whether the page gets its own OG image or uses the site default.
   Articles and landing pages get their own; utility pages use the default.
3. Design the image at 1200x630: background, one focal visual, short
   title text, and brand mark.
4. Keep all essential text and the logo inside the central safe area,
   away from the edges, since platforms crop previews differently.
5. Keep the title on the image to a few words in large type; the full
   title belongs in the `og:title` tag, not baked into the image.
6. Export the image as a JPEG or PNG at 1200x630 and compress it.
7. Publish the image at a stable public URL and set the `og:image`,
   `og:title`, `og:description`, `og:url`, and `og:type` tags with
   absolute URLs.
8. Include `og:image:width` and `og:image:height` (1200 and 630) so
   crawlers do not have to fetch the image to learn its size, and add
   `og:image:alt` describing what the image shows.
9. Verify the preview with `social-preview`, including a cache refresh
   when a platform still shows an old image.
10. Record the image file, its source design, and the tags set, so the
    preview can be rebuilt after a redesign.

## Implementation Standards

- OG images are 1200x630 pixels (about 1.91:1). This is the size Meta's
  sharing documentation recommends for Facebook link previews and the de
  facto standard other platforms expect — not a requirement of the Open
  Graph protocol itself, which defines the tags but no dimensions. An
  image smaller than 600x315 shows only as a small thumbnail on
  Facebook, and one under 200x200 is ignored.
- `og:image` uses an absolute URL (`https://...`), never a relative path;
  crawlers fetch the image from the URL in the tag.
- Every page that can be shared has `og:title`, `og:description`,
  `og:image`, `og:url`, and `og:type`. A page with only some of these
  tags gets an inconsistent preview.
- `og:image:width` and `og:image:height` are set (1200 and 630), and
  `og:image:alt` describes the image: the Open Graph protocol says a
  page that specifies `og:image` should also specify `og:image:alt`.
- `og:title` and `og:description` match the page's real title and
  description; do not write preview-only text that contradicts the page.
- Text on the image is large, high-contrast, and limited to a short
  headline plus the site or brand name. Small body text is unreadable
  in a preview.
- The image file is compressed for fast crawler fetching; a slow or
  oversized image may be skipped by the crawler. Keep it under 5 MB so it
  also satisfies LinkedIn's and X's limits, and prefer JPEG or PNG:
  not every platform's scraper renders WebP or AVIF previews.
- A default OG image exists for the whole site so no shared page ever
  shows a random image or none at all.

### Accessibility

- Preview images carry their text alternative: `og:image:alt` (and
  `twitter:image:alt`) describe the image for screen readers and
  text-only clients.
- Text in the preview is legible at the displayed size with 4.5:1
  contrast; keep it short — previews render small.
- The preview message does not depend on color alone.
- Verify the preview before publishing: title, description, image, and
  alt text all present and correct.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Make per-page OG images for the pages that get shared most: articles,
  landing pages, and key product pages.
- Use the same layout system for all OG images (same logo position,
  same title treatment) so the brand is recognizable in any feed.
- Put the most important words at the start of the on-image headline;
  previews are often shown small.
- Test the image at small sizes: if the headline is unreadable at
  300 pixels wide, shorten it or enlarge the type.
- Refresh OG images when the article title changes, so the image and
  the tag text stay in agreement.
- Keep the source design file (or generation prompt) so the image can
  be updated without starting over.

## Security Considerations

- Serve OG images over HTTPS from a domain the site controls; a
  preview that loads from an untrusted host can be swapped or tracked.
- Do not put sensitive information in an OG image or in `og:description`:
  preview content is fetched by crawlers and cached by platforms.
- Do not hotlink an OG image from another site; the owner can change
  or remove it and the preview changes with it.
- Validate user-supplied titles and descriptions before they reach
  meta tags; unescaped quotes or markup can break the page's head.
- Keep the image URL stable. Changing it without updating the tag, or
  deleting the file, breaks every existing share of the page.

## Performance Considerations

- Compress OG images; crawlers may time out on very large files and
  fall back to no image.
- A single 1200x630 JPEG is usually enough; do not ship multiple
  resolutions of the same OG image.
- Set long-lived cache headers on OG image files, since the same URL
  is fetched by many crawlers and shares.
- Generate OG images at build time or on publish, not on every page
  request, so sharing never waits on image rendering.

## Common Mistakes

- Using a relative URL in `og:image` — crawlers cannot resolve it;
  always use an absolute `https://` URL.
- Using the wrong size, such as a square or portrait image — platforms
  crop it unpredictably; use 1200x630.
- Cramming a paragraph onto the image — previews render small; a few
  large words is the limit.
- No default OG image — pages without their own image show whatever
  the crawler guesses, often a logo or an ad.
- Forgetting to refresh the platform cache after changing an image —
  the old preview can persist until the cache is cleared.
- Putting the full article title on the image and in the tag — the
  duplication looks cluttered; the image carries the short headline.

## Examples

Example Open Graph tags for an article page:

```html
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/blog/sourdough-starter-smell/">
<meta property="og:title" content="Why Your Sourdough Starter Smells Like Nail Polish Remover">
<meta property="og:description" content="That sharp smell usually means your starter is hungry. Here is what it is telling you and how to fix it.">
<meta property="og:image" content="https://example.com/images/og/sourdough-starter-smell.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
<meta property="og:site_name" content="Example Baking Blog">
```

Example image layout at 1200x630:

```text
+----------------------------------------------------------+
|  Background: warm cream with a soft photo of bread       |
|                                                          |
|  Short headline, large bold type, top-left safe area     |
|  "Hungry Starter?"                                       |
|                                                          |
|  Small subline: "What that smell means — and the fix"    |
|                                                          |
|  Bottom-left: site name in small caps                    |
+----------------------------------------------------------+
```

Example resize step with Sharp (Node.js):

```js
import sharp from "sharp";

await sharp("og-source.png")
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 85 })
  .toFile("sourdough-starter-smell-og.jpg");
```

## Validation Checklist

- [ ] The image is exactly 1200x630 pixels.
- [ ] The image is compressed and served over HTTPS at a stable URL.
- [ ] `og:image` uses an absolute URL.
- [ ] `og:title`, `og:description`, `og:url`, `og:type`, and
      `og:image:width` / `og:image:height` are all set, with
      `og:image:alt` describing the image.
- [ ] On-image text is short, large, and inside the safe area.
- [ ] The preview was verified with `social-preview` and shows the
      intended image, title, and description.
- [ ] A site-wide default OG image exists for pages without their own.
- [ ] The image source or design is recorded for future updates.
- [ ] Accessibility: og:image:alt / twitter:image:alt present; preview text legible.

## Expected Deliverables

- The final OG image file at 1200x630.
- The `og:` meta tags to add to the page template or CMS.
- A default OG image for the site, if one did not exist.
- A screenshot or report of the verified link preview.
- Notes on the image source and where the design lives.

## References

- [Open Graph protocol](https://ogp.me/) — the tag specification.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) — check what Meta's crawler reads and force a re-scrape.
- [MDN: the meta element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
  — meta tag syntax.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion.
- Related skills in this repository: `twitter-card-images`,
  `social-preview`, `blog-featured-images`, `image-compression`,
  `brand-visual-consistency`.
