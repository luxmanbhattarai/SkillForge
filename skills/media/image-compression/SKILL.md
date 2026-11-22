---
name: image-compression
description: >
  Reduce image file sizes without visible quality loss so pages load
  fast. Use when a task asks to compress, optimize, shrink, or reduce
  the size of images, lower page weight, or fix slow pages caused by
  oversized images.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Image Compression

## Purpose

This skill reduces image file sizes while keeping visible quality, so
pages load faster and cost less bandwidth. It covers choosing the right
compression approach per image type, setting quality levels, resizing
before compressing, batch processing, and verifying the result.

## When to Use

- Images need to be compressed, optimized, or reduced in file size.
- A page is slow because of oversized images.
- New images are being prepared for publication on the web.
- A site audit flags large images or excessive page weight.
- An image pipeline needs compression settings defined.

## When Not to Use

- The task is changing the image format (JPEG to WebP, PNG to AVIF) —
  use `image-format-conversion` instead, though the two often run
  together.
- The task is choosing or creating the image — use
  `ai-image-generation` or `blog-featured-images` instead.
- The task is a print image — print needs high resolution and minimal
  compression; web compression settings do not apply.
- The image is already compressed and the page is still slow — the
  bottleneck is elsewhere; check scripts, fonts, and server response.

## Prerequisites

- The image files to compress, with backups of the originals.
- The target display size for each image.
- The output format for each image (see `image-format-conversion`).
- A compression tool: Sharp, Squoosh, ImageMagick, or the site's
  build pipeline.
- A quality bar: what level of visible loss is acceptable for the use.

## Official Documentation

- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing, compression, and format conversion.
- [Squoosh](https://squoosh.app/) — a browser tool for compressing
  images and comparing quality side by side.
- [ImageMagick](https://imagemagick.org/) — command-line image
  processing, including resize and quality settings.
- [MDN: the img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
  — responsive images and delivery.
- Compatibility: code examples in this skill use the Sharp 0.35.x API
  (current as of November 2026; the `.resize()`, `.jpeg()`, and `.png()`
  calls shown are stable across Sharp 0.3x releases) and ImageMagick 7,
  whose command is `magick`. ImageMagick 6 used `convert` for the same
  operations — do not use `convert` on a system with ImageMagick 7
  installed, where it is not available by default.

## Required Workflow

1. Back up the originals. Compression is lossy for JPEG and WebP at
   quality settings below maximum; never overwrite the only copy.
2. Resize each image to its display size (plus a reasonable margin for
   high-density screens) before compressing. Compressing a 5000-pixel
   image that displays at 800 pixels wastes most of the effort.
3. Choose the compression approach by image type: photographs get lossy
   compression; graphics with text, logos, and flat color get lossless
   or near-lossless treatment.
4. Set a quality level and compress a test image first. Compare the
   result against the original at the real display size.
5. If the test shows visible artifacts (blockiness, banding, blurred
   text), raise the quality and re-test; if it looks identical, try a
   lower quality and compare again.
6. Apply the settled settings to the full set, in a batch script where
   there are many files.
7. Record the before and after file sizes for each image.
8. Verify every compressed image renders correctly and has the expected
   dimensions.
9. Replace the published files with the compressed versions and confirm
   the pages still display them correctly.
10. Document the chosen settings per image type so future images use
    the same pipeline.

## Implementation Standards

- Resize before compressing. Serving a larger image than the display
  size is the most common source of wasted bytes.
- Keep the original file. Compressed output is a delivery artifact;
  the original is the source of truth for future re-exports.
- Photographs: lossy JPEG or WebP at a quality setting that shows no
  visible difference at display size. A quality around 80 is a common
  starting point for JPEG; verify visually rather than trusting a
  number.
- Graphics with text, line art, or logos: lossless PNG or WebP, or
  high-quality lossy settings, since compression artifacts are most
  visible on sharp edges and text.
- Never compress the same lossy file repeatedly: each generation adds
  artifacts. Always compress from the original.
- Strip metadata that is not needed for display (camera data, location)
  unless the site deliberately publishes it; this also reduces size.
- Verify quality visually at the real display size, not only by file
  size. A smaller file that looks worse is not a win.

## Best Practices

- Use Squoosh's side-by-side comparison when setting quality for a
  new image type; it makes the visible difference easy to judge.
- Automate compression in the build or upload pipeline so no image
  reaches production uncompressed.
- Serve responsive sizes with `srcset` so small screens do not
  download desktop-sized files.
- Prefer modern formats (WebP, AVIF) where the pipeline supports
  them; they compress better than JPEG at the same visible quality.
- Compress OG and card images too; crawlers may skip oversized
  preview images.
- Re-check compression settings when the site's design changes the
  display sizes.

## Security Considerations

- Strip location and camera metadata from images before publishing;
  embedded metadata can reveal where and when a photo was taken.
- Do not upload sensitive or private images to a third-party online
  compressor; compress locally instead.
- Verify the output of any compression tool before publishing; a
  corrupted or truncated file can break a page.
- Keep backups of originals in access-controlled storage, not in a
  public directory.
- When compressing user-uploaded images, validate the file type and
  size before processing, and process in a sandboxed step that
  cannot execute embedded content.

## Performance Considerations

- Compression directly reduces page weight, which is usually the
  largest win available for image-heavy pages.
- Batch compression with a script is far faster than one-by-one
  manual work for large image sets.
- Compress at build time or upload time, not on every request; runtime
  compression adds latency to every page view.
- Combine compression with responsive sizing: a compressed image at
  the wrong size still wastes bytes.
- Measure the result: record total page weight before and after, and
  confirm the improvement.

## Common Mistakes

- Compressing without resizing — a 5000-pixel image compressed to a
  smaller file is still far larger than the 800-pixel version.
- Overwriting the original with the compressed file — future edits
  then start from a degraded source.
- Re-compressing an already compressed JPEG — each pass adds
  artifacts; always start from the original.
- Using lossy compression on text-heavy graphics — text and sharp
  edges show artifacts first; use lossless or high quality there.
- Judging quality by file size alone — always look at the image at
  display size.
- Forgetting metadata — location data in published photos is a
  privacy risk as well as wasted bytes.

## Examples

Example Sharp script compressing a photograph for the web:

```js
import sharp from "sharp";

await sharp("sourdough-starter-original.jpg")
  .resize(1600, 900, { fit: "cover" })
  .jpeg({ quality: 82 })
  .toFile("sourdough-starter-glass-jar-hero.jpg");
```

Example Sharp script for a lossless graphic:

```js
import sharp from "sharp";

await sharp("logo-source.png")
  .png({ compressionLevel: 9 })
  .toFile("logo.png");
```

Example ImageMagick command resizing and compressing a photo:

```bash
magick input.jpg -resize 1600x -quality 82 output.jpg
```

Example batch check of file sizes before and after:

```bash
ls -lh originals/ compressed/
```

## Validation Checklist

- [ ] Originals are backed up before any compression.
- [ ] Each image was resized to its display size before compressing.
- [ ] A test image was compared visually against the original at
      display size.
- [ ] Photographs and text graphics use different settings suited to
      each type.
- [ ] No file was compressed from an already compressed lossy source.
- [ ] Metadata such as location was stripped where appropriate.
- [ ] Before and after file sizes were recorded.
- [ ] Every compressed image renders correctly at its expected size.

## Expected Deliverables

- The compressed image files, ready to publish.
- A before-and-after size report per image.
- The compression settings used, per image type, for reuse.
- The backup location of the originals.
- Confirmation that the published pages display the new files.

## References

- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  compression and resizing.
- [Squoosh](https://squoosh.app/) — visual compression comparison.
- [ImageMagick](https://imagemagick.org/) — command-line processing.
- Related skills in this repository: `image-format-conversion`,
  `blog-featured-images`, `og-image-generation`, `twitter-card-images`,
  `youtube-thumbnails`.
