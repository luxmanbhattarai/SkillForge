---
name: twitter-card-images
description: >
  Create X (Twitter) card images and tags so shared links show a correct
  large-image preview on X. Use when a task asks for a Twitter card,
  X card, summary_large_image card, twitter:image tag, or a 1200x600
  social image for sharing a page on X.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Twitter Card Images

## Purpose

This skill produces X (formerly Twitter) card images and the matching
`twitter:` meta tags so shared links render a large-image card on X.
It covers the `summary_large_image` card type, the 1200x600 image size
(2:1 aspect ratio), how X cards relate to Open Graph tags, and preview
verification.

## When to Use

- A page needs an X card so links shared on X show a large image.
- Links shared on X show a small thumbnail, the wrong image, or no card.
- A page already has Open Graph tags and needs the X-specific tags added.
- A marketing push on X needs per-article card images.
- A site needs a default X card image for pages without their own.

## When Not to Use

- The task is a general link preview for many platforms — use
  `og-image-generation` instead, and add X tags alongside it.
- The task is only checking how a preview looks — use `social-preview`
  instead.
- The task is an image posted directly to X as a media attachment,
  not a link card — the card tags do not apply; size the attachment
  for the X timeline instead.
- The task is a video thumbnail — use `youtube-thumbnails` instead.

## Prerequisites

- The page URL, title, and description the card should show.
- The site's brand assets: logo, palette, and fonts.
- The X card image size for a large-image card: 1200x600 pixels (2:1
  aspect ratio, per X's documented card specification).
- Access to the page template or CMS where meta tags are set.
- The image file's public URL, since `twitter:image` must be absolute.

## Official Documentation

- [Open Graph protocol](https://ogp.me/) — the Open Graph tags that X
  falls back to when X-specific tags are missing.
- [X Developer Platform](https://developer.x.com/) — official X
  developer documentation, including cards.
- [MDN: the meta element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
  — how meta tags are written in HTML.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion for card images. Code examples in this skill
  use the Sharp 0.35.x API (current as of November 2026).
- Compatibility: X's developer site no longer publishes its Cards
  documentation pages (confirmed November 2026), so the card limits
  below come from X's last published card specification (Summary Card
  with Large Image, as archived January 2026): images support a 2:1
  aspect ratio with minimum dimensions of 300x157 and a maximum of
  4096x4096 pixels, must be under 5 MB, and JPG, PNG, WEBP, and GIF
  formats are supported (only the first frame of an animated GIF is
  used; SVG is not supported). The plain `summary` card uses a 1:1
  image with a minimum of 144x144 pixels. Re-check X's current
  documentation before relying on these limits for an edge case.
  Deprecated approach to avoid: sizing the card image at 1200x675
  (16:9) — that is the size for images posted directly to the X
  timeline, not for link cards; a 16:9 image in a 2:1 card is cropped
  top and bottom. A 1200x628 (1.91:1) image is also acceptable, losing
  only about 14 px top and bottom to the 2:1 crop.

## Required Workflow

1. Confirm the page's title, description, and canonical URL for the tags.
2. Choose the card type. Use `summary_large_image` for articles and
   landing pages; use `summary` only when a small thumbnail is the
   deliberate choice.
3. Design the image at 1200x600 for a large-image card: background, one
   focal visual, short headline, and brand mark.
4. Keep essential text and the logo inside the central safe area, since
   X crops card images differently across clients and devices.
5. Keep the on-image headline to a few large words; the full title
   belongs in the `twitter:title` tag.
6. Export the image as a JPEG or PNG at 1200x600 and compress it to
   well under the 5 MB limit.
7. Publish the image at a stable public URL and set the `twitter:card`,
   `twitter:title`, `twitter:description`, and `twitter:image` tags,
   plus `twitter:image:alt` (maximum 420 characters) describing the
   image.
8. Keep the Open Graph tags in place as well: X falls back to `og:title`,
   `og:description`, and `og:image` when X-specific tags are absent, so
   the two sets should agree rather than contradict each other.
9. Verify the card with `social-preview`, and re-check after any change
   to the image or tags.
10. Record the image file, its source design, and the tags set, so the
    card can be rebuilt after a redesign.

## Implementation Standards

- Large-image card images are 1200x600 pixels (2:1), per X's documented
  card specification. A 1200x628 (1.91:1) image is also acceptable, with
  only a small center crop. Do not use a 1200x675 (16:9) timeline image
  as the card image: the 2:1 card crop cuts roughly 75 px from the top
  and bottom combined.
- A 1200x630 Open Graph image is close to 2:1 and works as an X card
  image with only about 15 px trimmed top and bottom; a dedicated
  1200x600 export is exact, but reusing the OG image is not the error
  it is often claimed to be.
- Card images must be at least 300x157 pixels, at most 4096x4096, and
  under 5 MB. Supported formats are JPG, PNG, WEBP, and GIF (first
  frame only for animated GIFs); SVG is not supported.
- `twitter:image` uses an absolute URL (`https://...`), never a
  relative path.
- Every shareable page has `twitter:card`, `twitter:title`,
  `twitter:description`, and `twitter:image`, alongside the Open Graph
  tags. Add `twitter:image:alt` (maximum 420 characters) describing the
  image.
- `twitter:title` and `twitter:description` match the page's real title
  and description, and agree with the `og:` values.
- Text on the image is large, high-contrast, and limited to a short
  headline plus the site or brand name.
- The image file is compressed for fast crawler fetching.
- A default X card image exists for the whole site so no shared page
  ever shows a missing or random card image.

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

- Design X card images and OG images as siblings from one layout
  system, with separate exports at 1200x600 and 1200x630, so the brand
  looks consistent across platforms without a bad crop.
- Use the same headline wording on the image as in the post copy when
  the post promotes the article, so readers connect the two.
- Test the card image at small sizes: if the headline is unreadable
  at 300 pixels wide, shorten it or enlarge the type.
- Refresh card images when the article title changes, so image and
  tag text stay in agreement.
- Keep the source design file (or generation prompt) so the image can
  be updated without starting over.
- Do not assume X renders previews the same way as other platforms;
  verify on X specifically rather than trusting another platform's
  preview.

## Security Considerations

- Serve card images over HTTPS from a domain the site controls; a
  card that loads from an untrusted host can be swapped or tracked.
- Do not put sensitive information in a card image or in
  `twitter:description`: card content is fetched by crawlers and
  cached by platforms.
- Do not hotlink a card image from another site; the owner can change
  or remove it and the card changes with it.
- Validate user-supplied titles and descriptions before they reach
  meta tags; unescaped quotes or markup can break the page's head.
- Keep the image URL stable. Changing it without updating the tag, or
  deleting the file, breaks every existing share of the page.

## Performance Considerations

- Compress card images; crawlers may time out on very large files and
  fall back to no image. The documented limit is under 5 MB; aim for
  well under 1 MB.
- One 1200x600 JPEG per page is enough; do not ship multiple
  resolutions of the same card image.
- Set long-lived cache headers on card image files, since the same URL
  is fetched by many crawlers and shares.
- Generate card images at build time or on publish, not on every page
  request, so sharing never waits on image rendering.

## Common Mistakes

- Using a 1200x675 (16:9) timeline image as the card image — the 2:1
  card crop cuts the top and bottom; export a dedicated 1200x600
  version.
- Using an SVG card image — X does not support SVG for cards; use JPG,
  PNG, WEBP, or GIF.
- Using a relative URL in `twitter:image` — crawlers cannot resolve
  it; always use an absolute `https://` URL.
- Setting only Open Graph tags and assuming X shows a large card —
  X may fall back to a small summary card; set the `twitter:card` tag.
- Cramming a paragraph onto the image — cards render small; a few
  large words is the limit.
- Contradicting titles between `twitter:` and `og:` tags — keep both
  sets in agreement.
- Forgetting to re-check the card after changing the image — the old
  card can persist in caches until it is refreshed.

## Examples

Example X card tags for an article page:

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Why Your Sourdough Starter Smells Like Nail Polish Remover">
<meta name="twitter:description" content="That sharp smell usually means your starter is hungry. Here is what it is telling you and how to fix it.">
<meta name="twitter:image" content="https://example.com/images/cards/sourdough-starter-smell.jpg">
<meta name="twitter:image:alt" content="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
```

Example image layout at 1200x600:

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

await sharp("card-source.png")
  .resize(1200, 600, { fit: "cover" })
  .jpeg({ quality: 85 })
  .toFile("sourdough-starter-smell-card.jpg");
```

## Validation Checklist

- [ ] The image is exactly 1200x600 pixels for a large-image card
      (2:1), under 5 MB, in a supported format (JPG, PNG, WEBP, or
      GIF — not SVG).
- [ ] The image is compressed and served over HTTPS at a stable URL.
- [ ] `twitter:image` uses an absolute URL.
- [ ] `twitter:card` is set to `summary_large_image`, with
      `twitter:title`, `twitter:description`, `twitter:image`, and
      `twitter:image:alt`.
- [ ] The `twitter:` values agree with the `og:` values.
- [ ] On-image text is short, large, and inside the safe area.
- [ ] The card was verified with `social-preview` and shows the
      intended image, title, and description.
- [ ] A site-wide default card image exists for pages without their own.
- [ ] Accessibility: og:image:alt / twitter:image:alt present; preview text legible.

## Expected Deliverables

- The final X card image file at 1200x600.
- The `twitter:` meta tags to add to the page template or CMS.
- A default card image for the site, if one did not exist.
- A screenshot or report of the verified card preview.
- Notes on the image source and where the design lives.

## References

- [X Developer Platform](https://developer.x.com/) — official X
  developer documentation, including cards.
- [Open Graph protocol](https://ogp.me/) — the fallback tags X reads.
- [MDN: the meta element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
  — meta tag syntax.
- Related skills in this repository: `og-image-generation`,
  `social-preview`, `blog-featured-images`, `image-compression`,
  `brand-visual-consistency`.
