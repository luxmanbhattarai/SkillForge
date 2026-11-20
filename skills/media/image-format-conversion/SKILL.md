---
name: image-format-conversion
description: >
  Convert images between formats (JPEG, PNG, WebP, AVIF, SVG, GIF) and
  choose the right format for each use. Use when a task asks to convert
  an image format, change a PNG to WebP, export an AVIF, or pick the
  best image format for web, print, or social use.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Image Format Conversion

## Purpose

This skill converts images between formats and picks the right format
for each use, so every image is sharp where it must be sharp, small
where it must be small, and supported where it will be displayed. It
covers the strengths and limits of JPEG, PNG, WebP, AVIF, SVG, and GIF,
and the conversion workflow for single files and batches.

## When to Use

- A task asks to convert an image from one format to another.
- A site is moving photographs to WebP or AVIF for smaller files.
- A graphic needs transparency, animation, or scalability that its
  current format does not support.
- A platform rejects an image because of its format.
- An image pipeline needs format rules defined per image type.

## When Not to Use

- The task is only reducing file size within the same format — use
  `image-compression` instead.
- The task is choosing or creating the image — use
  `ai-image-generation` or `blog-featured-images` instead.
- The task needs a format the target platform does not support — check
  the platform's accepted formats first rather than converting blindly.
- The task is a video format conversion — this skill covers still
  images only.

## Prerequisites

- The source image files, with backups of the originals.
- The target format and the reason for choosing it.
- Knowledge of where the converted image will be displayed and which
  formats that platform supports.
- A conversion tool: Sharp, Squoosh, ImageMagick, or the site's build
  pipeline.
- Whether transparency, animation, or scalability is required.

## Official Documentation

- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  conversion between JPEG, PNG, WebP, AVIF, and more.
- [Squoosh](https://squoosh.app/) — a browser tool for converting
  formats and comparing the results side by side.
- [ImageMagick](https://imagemagick.org/) — command-line conversion
  between many image formats.
- [MDN: the img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
  — responsive images and the picture element.
- [Can I use](https://caniuse.com/) — browser support tables for
  WebP, AVIF, and other formats.
- Compatibility (verified November 2026): WebP is supported by all
  current browsers (Chrome 32+, Firefox 65+, Safari 14+, Edge 18+;
  about 97% of global usage) and needs no fallback for web audiences.
  AVIF reached Baseline in January 2024 (Chrome 85+, Firefox 93+,
  Safari 16+, Edge 121+; about 94-96% of global usage) — safe as the
  first `<source>` in a `<picture>` element with a WebP or JPEG
  fallback for older browsers. JPEG XL is newer: it decodes by default
  in Chrome 155+, Firefox 158+, and Safari 17+ (stills only, partial),
  but not in Edge — use it only as an optional first source, never as
  the sole format. Code examples in this skill use the Sharp 0.35.x
  API (current as of November 2026) and ImageMagick 7 (`magick`;
  ImageMagick 6's `convert` command is not available by default on
  ImageMagick 7 installs).

## Required Workflow

1. Identify the image type: photograph, graphic with text or flat
   color, logo, icon, or animation.
2. Choose the target format from the rules below, checking that the
   display platform supports it.
3. Back up the original before converting.
4. Convert a test image first and compare it against the original at
   the real display size, checking sharpness, color, transparency,
   and artifacts.
5. If the target format is not supported everywhere the image appears,
   provide a fallback in a widely supported format (JPEG or PNG)
   using the `picture` element or the platform's own fallback.
6. Apply the conversion to the full set, in a batch script where there
   are many files.
7. Verify every converted file: it opens, has the expected dimensions,
   keeps transparency where required, and shows no visible defects.
8. Record the before and after file sizes and formats.
9. Update references to the image (markup, CMS fields, tags) to point
   at the new file, and confirm the pages render correctly.
10. Document the format rules per image type so future images follow
    the same decisions.

## Implementation Standards

- Photographs: JPEG for maximum compatibility, WebP or AVIF for
  smaller files where the platform supports them. Photographs do not
  need transparency, so PNG is usually the wrong choice for a photo.
- Graphics with text, line art, logos, or flat color: PNG for
  lossless quality, WebP lossless where supported, or SVG when the
  graphic is vector-based (logos, icons, simple diagrams).
- Transparency: PNG, WebP, or AVIF. JPEG does not support transparency;
  converting a transparent PNG to JPEG fills the transparent areas.
- Animation: GIF for simple, widely supported animation; video
  formats are usually better than animated images for longer clips.
- Always convert from the original, never from an already converted
  lossy file; each lossy generation adds artifacts.
- Keep the filename extension in agreement with the actual format;
  a WebP file named `.jpg` confuses tools and browsers.
- When a platform requires a specific format (for example, JPEG or PNG
  for thumbnails or preview images), follow the platform's requirement
  rather than the general rule.

## Best Practices

- Use the `picture` element with a modern format first and a JPEG or
  PNG fallback, so older browsers still get an image.
- Compare formats in Squoosh before committing a whole library to a
  new format; the size and quality trade-offs vary by image.
- Prefer SVG for logos and icons: it stays sharp at any size and is
  usually smaller than a raster version.
- Convert in the build pipeline so source images stay in their
  original format and delivery formats are generated automatically.
- Keep one source of truth per image and generate delivery variants
  from it, rather than maintaining parallel libraries by hand.
- Re-check browser support for newer formats periodically; support
  changes over time.

## Security Considerations

- Strip location and camera metadata when converting photos for
  publication; conversion does not always remove it.
- Do not upload sensitive or private images to a third-party online
  converter; convert locally instead.
- Validate user-uploaded files before conversion: check the actual
  file type, not just the extension, and reject unexpected types.
- SVG files can contain scripts; never serve user-supplied SVG
  inline without sanitizing it, and prefer serving SVG as an image
  file rather than inline markup when the source is untrusted.
- Keep backups of originals in access-controlled storage, not in a
  public directory.

## Performance Considerations

- Modern formats (WebP, AVIF) usually produce smaller files than
  JPEG or PNG at the same visible quality, which reduces page weight.
- AVIF encodes more slowly than WebP or JPEG; convert at build time
  or upload time, not on request.
- Converting a PNG photograph to JPEG or WebP is often the single
  largest file-size win available for that image.
- Serve responsive sizes alongside the format change; the right
  format at the wrong size still wastes bytes.
- Measure the result: record total size before and after conversion.

## Common Mistakes

- Converting a transparent PNG to JPEG — JPEG has no transparency,
  so transparent areas become a solid fill.
- Using PNG for photographs — PNG files of photos are far larger
  than JPEG or WebP with no visible benefit.
- Converting from a lossy file instead of the original — each
  generation adds artifacts.
- Shipping AVIF or WebP with no fallback to browsers that do not
  support it — check support and provide a fallback.
- Renaming the extension without converting — changing `.png` to
  `.webp` in the filename does not change the file's contents.
- Forgetting to update references — the page still points at the old
  file after conversion.

## Examples

Example Sharp conversions (Node.js):

```js
const sharp = require("sharp");

// Photograph: JPEG source to WebP.
await sharp("photo.jpg").webp({ quality: 82 }).toFile("photo.webp");

// Photograph: JPEG source to AVIF.
await sharp("photo.jpg").avif({ quality: 60 }).toFile("photo.avif");

// Graphic with transparency: PNG stays PNG, compressed losslessly.
await sharp("logo.png").png({ compressionLevel: 9 }).toFile("logo-opt.png");
```

Example `picture` element with a WebP image and a JPEG fallback:

```html
<picture>
  <source srcset="/images/photo.webp" type="image/webp">
  <img src="/images/photo.jpg" width="1200" height="675"
       alt="Glass jar of bubbling sourdough starter on a wooden counter.">
</picture>
```

Example ImageMagick conversion:

```bash
magick input.png -quality 85 output.jpg
```

## Validation Checklist

- [ ] The target format fits the image type and the display platform.
- [ ] The platform supports the target format, or a fallback is
      provided.
- [ ] Originals are backed up before conversion.
- [ ] A test conversion was compared visually against the original.
- [ ] Transparency is preserved where required.
- [ ] Every converted file opens with the expected dimensions.
- [ ] Filenames and extensions match the actual format.
- [ ] Page and CMS references point at the new files and render.

## Expected Deliverables

- The converted image files, ready to publish.
- Fallback files where the target format is not universally supported.
- A before-and-after report of formats and file sizes.
- The format rules used, per image type, for reuse.
- Confirmation that the published pages display the new files.

## References

- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  conversion.
- [Squoosh](https://squoosh.app/) — visual format comparison.
- [ImageMagick](https://imagemagick.org/) — command-line conversion.
- [Can I use](https://caniuse.com/) — browser support tables.
- Related skills in this repository: `image-compression`,
  `blog-featured-images`, `og-image-generation`, `infographic-generation`.
