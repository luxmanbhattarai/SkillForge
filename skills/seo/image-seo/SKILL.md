---
name: image-seo
description: >
  Optimizes images for search visibility, Google Images, accessibility, and
  page speed through descriptive filenames, alt text, responsive sizing,
  modern formats, and image structured data. Use when adding or auditing
  images, improving Google Images traffic, fixing missing alt text, or
  reducing image weight. Trigger keywords: image SEO, alt text, Google
  Images, image optimization, responsive images, WebP, AVIF, image sitemap,
  lazy loading, image filenames.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Image SEO

## Purpose

This skill makes a site's images findable in image search, accessible
to screen readers, and fast to load. It covers descriptive filenames,
alt text, responsive images, modern formats, lazy loading, and image
sitemaps. Good image SEO serves three audiences at once: search
engines that index the image, assistive technology that describes it,
and users on slow connections who need it small.

## When to Use

- Adding images to a page, article, product listing, or gallery.
- Auditing a site for missing, empty, or keyword-stuffed alt text.
- Improving traffic from Google Images or image-heavy search results.
- Reducing page weight caused by oversized or uncompressed images.
- Adding images to a sitemap or structured data for products,
  recipes, or articles.

## When Not to Use

- For general page speed work beyond images — use
  `core-web-vitals` and `frontend-performance` for the full picture.
- For video optimization — video has its own metadata and sitemap
  needs; this skill covers still images only.
- For choosing or creating the images themselves (photography,
  illustration) — this skill optimizes images, it does not produce
  them.
- For logo or icon implementation details — use the site's design
  system; this skill's rules still apply to their alt text and
  sizing.

## Prerequisites

- Access to the image files and the pages or templates that embed
  them.
- Knowledge of the image's subject and purpose on the page, so alt
  text can be accurate.
- A build or CMS pipeline that can resize, convert, and compress
  images, or a CDN that does so.
- The rights to use each image; do not optimize images the site has
  no license to publish.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's image SEO guidance, including Google Images best practices.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for indexable pages and media.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for image entries.
- [Schema.org](https://schema.org/) — ImageObject and product or article image properties.

## Required Workflow

1. Inventory the images. List the images on the target pages, noting
   file size, dimensions, format, filename, and current alt text.
2. Rename files descriptively. Use short, lowercase, hyphenated
   filenames that describe the image content.
3. Resize and convert. Serve each image at the largest size it is
   displayed, in a modern format (WebP or AVIF) with a fallback
   where needed, compressed without visible quality loss.
4. Write alt text. Every meaningful image gets concise, accurate alt
   text; decorative images get an empty alt attribute.
5. Make images responsive. Use `srcset` and `sizes` (or the
   framework's image component) so browsers download the right size
   for the viewport.
6. Add context. Put the image near relevant text, use a descriptive
   caption where it helps, and give the page a clear title and
   headings so the image's topic is unambiguous.
7. Lazy-load below-the-fold images with `loading="lazy"`, and never
   lazy-load the hero or largest contentful paint image.
8. Verify. Check the page in a browser and in Search Console's image
   reports, and confirm images are crawlable and indexed.

## Implementation Standards

- Filenames are descriptive, lowercase, and hyphenated:
  `sourdough-starter-day-5.jpg`, not `IMG_4821.jpg` or
  `image1.jpg`. No keyword stuffing in filenames.
- Alt text describes what the image shows and, where relevant, its
  function, in about 125 characters or fewer. It does not start
  with "image of" or "picture of", and it does not stuff keywords.
- Decorative images (backgrounds, dividers, purely visual flourishes)
  use an empty alt attribute (`alt=""`) so screen readers skip them.
- Every content image has explicit `width` and `height` attributes
  (or an aspect-ratio reservation) to prevent layout shift.
- Serve modern formats: WebP or AVIF for photographs, SVG for logos
  and simple graphics. Provide a JPEG or PNG fallback only where a
  target browser needs it.
- Images are sized to their display size; do not serve a 4000-pixel
  image in a 800-pixel slot.
- Images must be crawlable: served over HTTPS from a URL that
  robots.txt allows, not blocked by authentication or by a
  robots.txt disallow on the image directory.
- Do not embed important text in images. Text in an image is not
  readable as page text by search engines or screen readers; put
  the text in HTML and use the image to support it.
- Image structured data (ImageObject, or the `image` property on
  Article, Product, or Recipe) uses the same image URL that the page
  displays, with accurate metadata.

## Best Practices

- Put the most important image near the top of the page and near the
  text it illustrates; images buried at the bottom of unrelated
  content rank poorly.
- Use captions for images that need explanation; captions are read by
  users and help search engines understand the image.
- Keep original high-quality source files, and generate optimized
  derivatives at build time so the site never serves raw uploads.
- Name the file and write the alt text for the image's actual
  subject, not for the keyword the page targets, when the two differ.
- For product images, show the product clearly on a clean
  background, and include multiple angles where the product page
  supports them.
- Test images on a slow connection; if the page feels slow, the
  images are usually the cause.

## Security Considerations

- User-uploaded images must be validated by file type and content,
  not just by extension; an uploaded file with a fake extension can
  carry executable content.
- Serve user-uploaded images from a separate domain or path with a
  restrictive content security policy where the platform supports
  it, so a malicious upload cannot run scripts in the site's origin.
- Strip location and device metadata (EXIF) from uploaded images
  before publishing; it can reveal where and when a photo was taken.
- Do not hotlink images from other sites without permission; it
  exposes the site's visitors to the other host and can break
  without warning.

## Performance Considerations

- Images are usually the largest part of a page. Compress
  aggressively, use modern formats, and serve responsive sizes; a
  hero image should rarely exceed a few hundred kilobytes.
- Lazy-load images below the fold; eager-load only the hero or
  largest contentful paint image, and consider preloading it.
- Use a CDN for image delivery where the site has one, so images
  load from near the user.
- Avoid layout shift: reserve space for every image with dimensions
  or aspect ratio, since shifting content hurts Core Web Vitals.
- Limit the number of images per page to what the content needs;
  galleries should paginate or lazy-load rather than dumping dozens
  of images at once.

## Common Mistakes

- Missing alt text — the image is invisible to screen readers and
  harder for search engines to understand. Write alt text for every
  meaningful image.
- Keyword-stuffed alt text — "sourdough bread sourdough recipe best
  sourdough" is spam and unhelpful. Describe the image once, plainly.
- Serving huge originals — uploading a 6 MB camera file and letting
  the browser shrink it wastes bandwidth. Resize at build time.
- Blocking images in robots.txt — a disallow on the image directory
  hides images from Google Images. Allow image paths.
- Lazy-loading the hero image — the largest contentful paint image
  must load immediately; lazy-loading it delays the page's main
  metric.
- Text baked into images — headings, prices, or instructions inside
  an image are unreadable to search engines. Use HTML text.

## Examples

A responsive, accessible content image:

```html
<img
  src="/images/sourdough-starter-day-5-800.webp"
  srcset="/images/sourdough-starter-day-5-400.webp 400w,
          /images/sourdough-starter-day-5-800.webp 800w,
          /images/sourdough-starter-day-5-1200.webp 1200w"
  sizes="(max-width: 640px) 100vw, 800px"
  width="800"
  height="600"
  alt="Sourdough starter on day five, bubbly and doubled in a glass jar"
  loading="lazy"
/>
```

A decorative image correctly marked to be skipped by screen readers:

```html
<img src="/images/divider-flour.svg" alt="" width="120" height="24" />
```

An image entry in an XML sitemap:

```xml
<url>
  <loc>https://example.com/guides/sourdough-starter/</loc>
  <image:image>
    <image:loc>https://example.com/images/sourdough-starter-day-5-800.webp</image:loc>
    <image:title>Sourdough starter on day five</image:title>
  </image:image>
</url>
```

## Validation Checklist

- [ ] Every meaningful image has concise, accurate alt text; every
      decorative image has `alt=""`.
- [ ] Filenames are descriptive, lowercase, and hyphenated.
- [ ] Images are resized to display size, compressed, and served in
      a modern format with responsive sizes.
- [ ] Every image has width and height (or aspect ratio) reserved.
- [ ] Below-the-fold images lazy-load; the hero image does not.
- [ ] Images are crawlable: HTTPS URLs allowed by robots.txt.
- [ ] No important text is baked into images.
- [ ] Image structured data, where used, matches the displayed image.

## Expected Deliverables

- Optimized images in place with descriptive filenames, alt text,
  responsive markup, and lazy loading where appropriate.
- An audit note for existing pages: images fixed, alt text added,
  and any images removed or replaced.
- Image sitemap entries or structured data added, where agreed.
- A before-and-after note on page image weight for the audited pages.

## References

- [Google Search Central](https://developers.google.com/search) — image SEO and Google Images guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for indexable pages and media.
- [Sitemaps.org](https://www.sitemaps.org/) — image sitemap format.
- [Schema.org](https://schema.org/) — ImageObject vocabulary.
- Related skills in this repository: `core-web-vitals`, `on-page-seo`, `schema-jsonld`, `sitemap-robots`, `search-console`.
