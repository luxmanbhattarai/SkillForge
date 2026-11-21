---
name: platform-social-images
description: >
  Choose the right social preview image per platform: Facebook,
  LinkedIn, X, WhatsApp, Slack, Discord, and other unfurlers each
  publish different dimensions, file-size limits, and rendering
  behavior. Use when a link preview must look right on more than one
  platform, when platforms disagree, or when deciding whether one
  image can serve them all. Trigger keywords: social image sizes,
  platform OG image, link preview sizes, per-platform social image,
  Facebook LinkedIn X image size, WhatsApp preview image, Discord
  embed image, Slack unfurl image, social image dimensions.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Platform Social Images

## Purpose

Every platform that unfurls a link reads the same `og:` and
`twitter:` tags but renders them by its own rules: different aspect
ratios, different minimum and maximum sizes, different file-size
limits, and different crops. This skill is the per-platform reference
for those rules, verified against each platform's own documentation
where it exists — and explicit about where a platform publishes no
spec at all. It tells you when one image can serve every platform
and when a platform needs its own export.

## When to Use

- A page will be shared on several platforms and the preview must
  look right on each.
- Platforms disagree about a preview (right on one, cropped or
  missing on another) and the cause is unclear.
- Deciding the export sizes for a social image set.
- Auditing the social images for a site or a launch.
- Writing the meta tags for a page with per-platform images.

## When Not to Use

- Creating a single OG image for general sharing — use
  `og-image-generation` instead.
- Creating an X card only — use `twitter-card-images` instead.
- Checking how a preview looks — use `social-preview` instead
  (this skill defines the targets; that skill runs the checks).
- Generating the image itself — use `satori`, `resvg`, or `sharp`.

## Prerequisites

- The list of platforms the audience actually shares on.
- The page URL, title, and description the preview should show.
- Brand assets (logo, palette, fonts) for the image design.
- Access to the page template or CMS where meta tags are set.
- Conceptual skill; current stable as of 2026-11-20 — applies to the
  current platform card specifications; platforms publish no versioned
  spec, so re-check the official validator tools linked in Official
  Documentation before relying on a dimension for an edge case.

## Official Documentation

- [Open Graph protocol](https://ogp.me/) — the tag specification all of these platforms read. It defines the tags, not the dimensions.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) — Meta's tool for checking what its crawler reads and forcing a re-scrape.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) — LinkedIn's tool for checking a link preview and requesting a re-scrape.
- [Discord Link Previews](https://docs.discord.com/developers/link-previews) — Discord's official documentation of the tags it reads, its layouts, and its limits, including the Embed Debugger for checking how Discord reads a URL.
- [X Developer Platform](https://developer.x.com/) — official X developer documentation. X's Cards documentation pages now redirect to the general docs overview and its standalone Card Validator has been retired, so the X figures below come from X's last published card specification (Summary Card with Large Image, as archived January 2026); re-check X's current documentation before relying on them for an edge case.
- Compatibility: Meta's sharing documentation page could not be
  fetched directly during verification (its server returned 403);
  the Facebook figures below match Meta's published guidance as
  recorded in this repository's `og-image-generation` skill and
  corroborated by multiple secondary sources in November 2026.
  WhatsApp's figures come from Meta's WhatsApp Business
  link-previews documentation (updated November 5, 2025) as
  reported by multiple secondary sources. Discord's figures were
  verified directly against Discord's developer documentation
  (Link Previews page, updated 2026-11-19). Slack publishes
  no image size or file-size rules; Telegram and iMessage publish
  no link-preview image spec.

## Required Workflow

1. List the target platforms for the page. Do not assume one set of
   rules covers them all.
2. For each platform, read its row in the reference table below:
   recommended size, minimum, maximum file size, formats, and
   rendering behavior.
3. Decide the export set: the shared 1200x630 image (see the
   fallback strategy) plus a dedicated export for any platform
   whose rules the shared image cannot satisfy.
4. Design each export inside that platform's safe area, keeping
   essential text and the logo away from the edges (see
   Implementation Standards).
5. Export and compress each image to its platform's file-size
   limit, and check the actual file size — a heavy PNG can pass one
   platform's limit and fail another's.
6. Set the tags: one `og:image` set for all platforms, plus
   `twitter:image` when X gets its own export, and always
   `og:image:width`, `og:image:height`, and `og:image:alt`.
7. Verify each platform separately with `social-preview` and that
   platform's own tool (Sharing Debugger, Post Inspector, composer
   draft, or a test post). A correct preview on one platform proves
   nothing about the others.
8. Record the export set, the tags, and the check date, so the next
   redesign or platform change starts from facts.

## Implementation Standards

Per-platform reference. "Recommended" is the size to export; where a
platform publishes no size, the entry says so.

| Platform | Recommended | Minimum | Max file | Aspect | Notes |
|---|---|---|---|---|---|
| Facebook / Meta | 1200x630 | 600x315 for a large preview; 200x200 absolute minimum | 8 MB | ~1.91:1 | Keep close to 1.91:1 to avoid cropping. |
| LinkedIn | 1200x627 (minimum) | 1200x627 | 5 MB | 1.91:1 | Under 401 px wide shows as a thumbnail, not a full card. |
| X (large card) | 1200x600 | 300x157; max 4096x4096 | 5 MB | 2:1 | JPG, PNG, WEBP, GIF (first frame only); no SVG. |
| X (summary card) | Square, e.g. 600x600 | 144x144; max 4096x4096 | 5 MB | 1:1 | Small thumbnail beside the text. |
| WhatsApp | 1200x630 | 300 px wide; ratio 4:1 or narrower | 600 KB | 1.91:1 practical | Tags must sit in the `<head>` within the first 300 KB of HTML; description ~80 chars. |
| Slack | 1200x630 | None published | None published | 1.91:1 practical | Reads OG and X Card tags; no published size or file rules. |
| Discord | 1200x630 | None published | None published | 1.91:1 practical | Large image needs `twitter:card` set to `summary_large_image`; title trimmed past 70 bytes, description past 350 bytes. Formats: PNG, GIF, JPG, JPEG, WebP, AVIF. |
| Telegram, iMessage, others | 1200x630 | None published | None published | 1.91:1 practical | Read `og:image`; no published image spec. |

- **One shared image, when it fits.** A single 1200x630 JPEG
  compressed under 600 KB satisfies Facebook, LinkedIn, WhatsApp,
  Slack, Discord, Telegram, and iMessage, and works on X with
  about 15 px trimmed from the top and bottom by X's 2:1 crop.
  That is the default export set: one file, not seven.
- **A dedicated X export when exactness matters.** X's large card
  is exactly 2:1, so export a dedicated 1200x600 image as
  `twitter:image` when the design cannot afford the 15 px trim.
  Do not use a 1200x675 (16:9) timeline image as the card image.
- **Safe areas.** Keep essential text and the logo at least 60 px
  from the left and right edges and 40 px from the top and bottom
  of a 1200x630 canvas, and keep nothing important in the top or
  bottom 15 px (X's 2:1 crop). This is a design guideline, not a
  platform spec — no platform publishes a safe-area rule.
- **File size is the binding constraint.** The strictest published
  limit is WhatsApp's 600 KB; build the shared image to it and the
  other platforms' limits are satisfied automatically. Prefer JPEG
  for photographic cards (PNG at this size often exceeds 600 KB).
- **Formats.** JPEG and PNG work everywhere. WebP and AVIF are
  supported by some platforms (X supports WebP; Discord supports
  WebP and AVIF) but not all crawlers render them — do not use
  them for the shared image. SVG is not supported as a card image
  on X and is ignored by WhatsApp.
- **Dimensions tags.** Always set `og:image:width` and
  `og:image:height`: Meta uses them to render the image on the
  first share, and Discord fetches the image to measure it without
  them (that fetch counts against its 10-second limit).
- **Text limits differ.** X trims `twitter:title` at 70 characters
  and `twitter:description` at 200; Discord trims the title past
  70 bytes and the description past 350 bytes; WhatsApp shows about
  80 characters of description. Keep titles short and descriptions
  front-loaded.

### Testing Strategy

- Validate every new image with the platform debuggers (Meta Sharing
  Debugger, LinkedIn Post Inspector) before publish: the debugger
  shows what the crawler actually reads, which is what users see.
- Test the file-size budget: the shared image must stay under
  WhatsApp's 600 KB limit, and an automated check on dimensions and
  file size in CI catches regressions.
- Test the X 2:1 crop on the shared image: nothing essential sits in
  the top or bottom 15 px that X trims.
- Test a real share to a private or test account on each priority
  platform before launch, and re-scrape after any image change —
  platform caches serve the old image until forced to refresh.
- Test the tags themselves: `og:image:width` and `og:image:height`
  must match the actual file, and a missing or mistyped tag must fail
  the pre-publish check.

### Accessibility

- Every social image carries an alt text equivalent: set
  `og:image:alt` and `twitter:image:alt` to a short description of
  what the image shows, not the page title repeated.
- Keep essential information out of the image itself: card images are
  decorative in most clients, and a reader who cannot see the image
  must still get the point from the title and description.
- Text baked into the image must meet contrast against its background
  (aim for WCAG AA contrast, 4.5:1 for body text) so the card stays
  readable for low-vision readers and in compressed previews.
- Do not rely on color alone in the card design: labels and
  distinctions the image conveys must also differ in shape, position,
  or text.

## Best Practices

- Design one layout system and export per-platform sizes from it,
  rather than designing each platform's image separately.
- Export the shared image first, then the X export only when the
  shared image's crop is unacceptable.
- Test the image at small sizes: if the headline is unreadable at
  300 px wide, shorten it or enlarge the type.
- Keep the source design file (or generation prompt) so every
  export can be rebuilt after a redesign.
- Re-check platform specs when a preview breaks: platforms change
  their rules without announcement, and a spec verified a year ago
  may be stale.
- When a platform shows a stale preview, use its own refresh
  mechanism (Sharing Debugger re-scrape, Post Inspector inspect)
  and remember that caches are per-platform: refreshing one does
  not refresh another. WhatsApp and X have no cache-clear tool;
  changing the image URL is the reliable refresh.

## Security Considerations

- Serve social images over HTTPS from a domain the site controls;
  a preview that loads from an untrusted host can be swapped or
  tracked.
- Do not put sensitive information in a social image or its
  description: preview content is fetched by crawlers and cached
  by platforms.
- Do not hotlink a social image from another site; the owner can
  change or remove it and every preview changes with it.
- Validate user-supplied titles and descriptions before they reach
  meta tags; unescaped quotes or markup can break the page's head.
- Preview debuggers fetch the page as a crawler; do not run them
  on URLs containing secrets, tokens, or private query parameters.

## Performance Considerations

- Compress every export; crawlers may time out on very large files
  and fall back to no image. Aim well under each platform's limit,
  not just under it.
- Set long-lived cache headers on social image files, since the
  same URL is fetched by many crawlers and shares.
- Generate social images at build time or on publish, not on every
  page request, so sharing never waits on image rendering.
- Keep the page's `<head>` small and early: WhatsApp requires the
  tags within the first 300 KB of HTML, and every crawler reads the
  head first.

## Common Mistakes

- Assuming one size fits all platforms — X is 2:1, LinkedIn's
  minimum is 1200x627, and WhatsApp's file limit is 600 KB; the
  rules genuinely differ.
- Shipping a PNG that passes Facebook's 8 MB limit but fails
  WhatsApp's 600 KB limit — check the file size, not just the
  dimensions.
- Using a 1200x675 (16:9) timeline image as an X card image — the
  2:1 card crop cuts the top and bottom.
- Setting only Open Graph tags and expecting a large image on
  Discord — Discord needs `twitter:card` set to
  `summary_large_image` for the large layout.
- Checking one platform and assuming the rest match — platforms
  crop, cache, and fall back differently; check each target.
- Forgetting `og:image:width` and `og:image:height`, so the first
  share renders without the image or after a slow fetch.

## Examples

Example tag set serving all platforms with one shared image plus a
dedicated X export:

```html
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/blog/sourdough-starter-smell/">
<meta property="og:title" content="Why Your Sourdough Starter Smells Like Nail Polish Remover">
<meta property="og:description" content="That sharp smell usually means your starter is hungry. Here is what it is telling you and how to fix it.">
<meta property="og:image" content="https://example.com/images/og/sourdough-starter-smell.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/images/cards/sourdough-starter-smell.jpg">
<meta name="twitter:image:alt" content="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
```

Example export set from one design (with `sharp`):

```js
const sharp = require("sharp");

// Shared image: 1200x630 JPEG, compressed under WhatsApp's 600 KB limit.
await sharp("card-source.png")
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("sourdough-starter-smell-og.jpg");

// Dedicated X export: exact 2:1.
await sharp("card-source.png")
  .resize(1200, 600, { fit: "cover" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("sourdough-starter-smell-card.jpg");
```

Example per-platform check record:

```text
Page: https://example.com/blog/sourdough-starter-smell/
Checked: 2026-11-20
Facebook (Sharing Debugger): correct image, title, description.
LinkedIn (Post Inspector): correct; full-width card, not thumbnail.
X (composer draft): correct large card.
WhatsApp (composer draft): correct preview within 10 seconds.
Discord (test server): large image below text.
Slack (private channel): correct unfurl.
```

## Validation Checklist

- [ ] The target platforms were listed and each was checked against its own row in the reference table.
- [ ] The shared image is 1200x630, JPEG or PNG, and under 600 KB.
- [ ] A dedicated 1200x600 X export exists when the design needs it.
- [ ] Essential text and the logo are inside the safe area.
- [ ] `og:image`, `og:image:width`, `og:image:height`, and `og:image:alt` are set with absolute HTTPS URLs.
- [ ] `twitter:card` is set to `summary_large_image`.
- [ ] Each target platform's preview was verified separately with `social-preview`.
- [ ] The export set and check date are recorded.

## Expected Deliverables

- The export set: the shared 1200x630 image and any dedicated per-platform exports.
- The meta tags to add to the page template or CMS.
- A per-platform verification report with the check date.
- Notes on the image source and where the design lives.

## References

- [Open Graph protocol](https://ogp.me/) — the tag specification.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) — check Meta's crawl and force a re-scrape.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) — check LinkedIn's preview and request a re-scrape.
- [X Developer Platform](https://developer.x.com/) — official X developer documentation.
- Related skills in this repository: `og-image-generation`,
  `twitter-card-images`, `social-preview`, `satori`, `resvg`,
  `sharp`, `image-compression`, `blog-featured-images`.
