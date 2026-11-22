---
name: image-optimization
description: >
  Optimize images for the web: choose modern formats, resize to the
  displayed size, compress without visible loss, lazy-load below the
  fold, and serve responsive variants. Use when pages are heavy with
  images, hero or product images load slowly, Lighthouse flags
  oversized or offscreen images, or layout shift comes from images.
  Covers AVIF, WebP, responsive images, and CDN image pipelines.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Image Optimization

## Purpose

This skill helps an agent make images fast without making them look
worse: pick the right format, serve the right size for each screen,
compress sensibly, and load images only when needed. The outcome is a
page where images no longer dominate the byte count or block the
largest contentful paint, and where no image causes layout shift.

## When to Use

- Lighthouse or PageSpeed Insights flags oversized, uncompressed, or
  offscreen images.
- A page's images dominate its total weight or delay the LCP element.
- Adding hero, product, gallery, or article images to a site.
- Setting up an image pipeline for a content-heavy site or blog.
- Fixing layout shift caused by images loading without reserved space.

## When Not to Use

- When images are not the bottleneck — confirm with a measurement
  first (see `lighthouse` or `pagespeed-insights`).
- When the problem is JavaScript weight — use `javascript-optimization`
  or `bundle-optimization` instead.
- When the task is choosing or editing the image content itself
  (photography, illustration) — that is a design task, not an
  optimization task.
- When the images are user avatars or icons that are already tiny —
  the savings are rarely worth the effort.

## Prerequisites

- The images to optimize, in source form (original files, not
  already-downscaled copies).
- Knowledge of where each image is displayed and at what size.
- A way to process images: a build plugin, an image CDN, or a local
  tool such as Sharp.
- A baseline measurement of page weight and LCP before changes.

## Official Documentation

- [web.dev — Image optimization](https://web.dev/) — Google's guides
  on formats, responsive images, and lazy loading.
- [MDN — Responsive images](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Multimedia)
  — `srcset`, `sizes`, and the `picture` element.
- [Sharp](https://sharp.pixelplumbing.com/) — the Node.js image
  processing library used by most frameworks. Sharp 0.35.x requires
  Node.js 20.9 or later.
- Browser support (MDN compatibility data): AVIF in Chrome 85+,
  Firefox 93+, Safari 16+; WebP in Safari 14+; `fetchpriority` in
  Chrome 101+, Firefox 132, Safari 17.2; `loading="lazy"` in Safari
  15.4+. Browsers that do not support the new attributes ignore
  them safely, so no polyfill is needed.

## Required Workflow

1. Inventory the images on the target pages: file, format, size in
   bytes, displayed dimensions, and whether each is above or below
   the fold.
2. Identify the LCP image (usually the hero). It gets priority
   treatment: eager loading, preload, and the best format.
3. For each image, choose a modern format: AVIF first where quality
   at small size matters, WebP as the broad fallback, and keep JPEG
   or PNG only where a specific need (for example, wide tooling
   support) requires it.
4. Resize each image to the largest size at which it is actually
   displayed, and generate responsive variants for common viewport
   widths.
5. Compress each variant to a quality level with no visible loss
   (check the result visually; do not compress blindly).
6. Serve responsive variants with `srcset` and `sizes`, or with an
   image CDN that generates them on demand.
7. Lazy-load below-the-fold images with `loading="lazy"` and never
   lazy-load the LCP image. Add `fetchpriority="high"` to the LCP
   image when the browser supports it.
8. Reserve space for every image with explicit `width` and `height`
   attributes (or an aspect-ratio in CSS) so images cannot shift
   layout.
9. Re-measure page weight, LCP, and CLS, and compare against the
   baseline.

## Implementation Standards

- Serve images at or near their displayed size. An image served at
  more than twice its displayed width is oversized.
- Prefer AVIF or WebP over JPEG and PNG for photographic content;
  use SVG for logos, icons, and simple graphics.
- When a format is not universal, use `<picture>` with a
  `<source type="image/avif">` first, then WebP, with a JPEG or
  PNG `<img>` fallback — browsers pick the first format they
  support.
- Always set `width` and `height` (or an aspect-ratio) on `<img>`
  elements so the browser can reserve space before the image loads.
- The LCP image must load eagerly, must not be lazy-loaded, and
  should be preloaded when it is discovered late (for example, a
  CSS background or a hero inside a component).
- Below-the-fold images must use `loading="lazy"` and
  `decoding="async"`.
- Use `srcset` with width descriptors and a `sizes` attribute that
  matches the actual layout, so browsers pick the right variant.
- Compress with a tool that preserves visual quality; verify the
  output by looking at it, especially for images with text or fine
  detail.
- Keep original source images in the repository or asset store;
  generate optimized variants at build time or on demand, never by
  overwriting the originals.

### Accessibility

- Lazy-loaded images keep their `alt` text and dimensions: reserve
  space to avoid layout shift, and do not lazy-load images above the
  fold.
- Responsive images serve the right size without hiding content from
  keyboard or screen-reader users.
- Compression must not make text in images illegible; check the
  smallest served size.
- Decorative images stay decorative after optimization: empty `alt`,
  no filename leaking as a name.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Automate the pipeline (build plugin or image CDN) instead of
  hand-optimizing each image; manual optimization does not survive
  the next content update.
- For a blog or content site, set a maximum display width and
  generate two or three variants per image rather than a dozen.
- Use an image CDN when images come from a CMS or user uploads,
  because the source sizes are unpredictable.
- Prefer CSS or SVG over raster images for decorative shapes,
  gradients, and icons.
- Audit images on a schedule: new content regularly reintroduces
  unoptimized images.

## Security Considerations

- Never serve user-uploaded images without validation: check the
  file type by content, not extension, strip metadata, and
  re-encode through a trusted library to remove embedded payloads.
- Strip EXIF metadata (including GPS coordinates) from images before
  publishing, especially for user-generated content.
- Serve images from the same origin or a trusted CDN; hotlinking
  third-party images leaks referrer data and depends on a host you
  do not control.
- Be careful with SVG uploads: SVG can contain scripts. Treat
  user-supplied SVG as untrusted and sanitize it or serve it with a
  restrictive content type.

## Performance Considerations

- Images are usually the largest contributor to page weight; a
  single unoptimized hero image can cost more than the entire
  JavaScript bundle.
- Responsive variants multiply storage and build time; keep the
  variant count small (two or three widths) unless the layout
  genuinely needs more.
- Preloading too many images hurts performance; preload only the
  LCP image.
- AVIF encodes slowly; if build time matters, generate AVIF at
  build time or on first request and cache the result.

## Common Mistakes

- Lazy-loading the hero or LCP image, which delays the metric that
  matters most.
- Serving a 4000 px original and letting CSS shrink it to 800 px.
- Omitting `width` and `height`, which causes layout shift as each
  image loads.
- Using PNG for photographs, which is far larger than WebP or AVIF
  at the same quality.
- Writing a `sizes` attribute that does not match the layout, so
  the browser downloads a variant that is too large or too small.
- Optimizing images once and never again — new uploads undo the work.

## Examples

A responsive hero image with reserved space and high priority:

```html
<img
  src="/images/hero-800.avif"
  srcset="/images/hero-800.avif 800w, /images/hero-1600.avif 1600w"
  sizes="(max-width: 800px) 100vw, 800px"
  width="1600"
  height="900"
  alt="Mountain trail at sunrise"
  fetchpriority="high">
```

A below-the-fold image, lazy-loaded with reserved space:

```html
<img
  src="/images/gallery-1-800.webp"
  srcset="/images/gallery-1-800.webp 800w, /images/gallery-1-1200.webp 1200w"
  sizes="(max-width: 800px) 100vw, 800px"
  width="1200"
  height="800"
  alt="Trail marker on a forest path"
  loading="lazy"
  decoding="async">
```

Generate responsive variants with Sharp:

```js
import sharp from 'sharp';

for (const width of [800, 1200, 1600]) {
  await sharp('src/hero.jpg')
    .resize(width)
    .avif({ quality: 75 })
    .toFile(`public/images/hero-${width}.avif`);
}
```

## Validation Checklist

- [ ] Every image is served at or near its displayed size.
- [ ] Photographic images use AVIF or WebP (with a fallback where
      needed); icons and logos use SVG.
- [ ] The LCP image loads eagerly, is preloaded if discovered late,
      and is never lazy-loaded.
- [ ] Below-the-fold images use `loading="lazy"`.
- [ ] Every `<img>` has `width` and `height` (or an aspect-ratio) so
      no image causes layout shift.
- [ ] Compressed output was visually checked for quality loss.
- [ ] Page weight and LCP improved against the baseline.
- [ ] Accessibility: lazy images keep alt text and reserved space; text stays legible.

## Expected Deliverables

- An image inventory: file, format, bytes, displayed size, and
  above/below the fold.
- Optimized images and responsive variants, with the pipeline or
  commands that produced them.
- Updated markup using `srcset`, `sizes`, lazy loading, and reserved
  space.
- Before/after measurements of page weight, LCP, and CLS.

## References

- [web.dev](https://web.dev/) — image optimization guides.
- [MDN — Responsive images](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Multimedia)
  — `srcset`, `sizes`, and the `picture` element.
- [Sharp](https://sharp.pixelplumbing.com/) — Node.js image
  processing.
- Related skills in this repository: `core-web-vitals`, `lighthouse`,
  `pagespeed-insights`, `caching-strategy`, `web-performance-audit`.
