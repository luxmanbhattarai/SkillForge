---
name: sharp
description: >
  Process images at high speed with Sharp, the Node.js library built
  on libvips: resize, crop, convert, and optimize JPEG, PNG, WebP,
  GIF, AVIF, and TIFF images, with correct color, metadata, and
  alpha handling. Use when resizing images, converting formats,
  optimizing images for the web, compositing, or building an image
  pipeline. Trigger keywords: sharp, resize image, image processing,
  convert image, optimize image, WebP, AVIF, libvips, image pipeline,
  crop image, compress image.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Sharp

## Purpose

Sharp is the standard way to process images in Node.js: resize, crop,
rotate, convert, composite, and optimize images at high speed, using
the libvips library under the hood. It handles color spaces, embedded
ICC profiles, and alpha channels correctly, streams input and output,
and needs no child processes. It is the workhorse behind image
optimization pipelines, responsive-image generation, and OG image
post-processing.

## When to Use

- Resizing, cropping, or rotating images for the web.
- Converting images between formats (JPEG, PNG, WebP, AVIF, GIF, TIFF).
- Optimizing images for file size without visible quality loss.
- Generating responsive image variants or thumbnails.
- Compositing images (overlays, watermarks, backgrounds).
- Reading image metadata (dimensions, format, EXIF, color space).
- Post-processing rendered images (for example, compressing a PNG
  from `resvg` or `satori` output).

## When Not to Use

- Rendering HTML/CSS to an image — use `satori` (plus `resvg`) instead.
- Rasterizing SVG with the highest SVG fidelity — use `resvg`
  instead (sharp rasterizes SVG through librsvg, which is a
  different renderer).
- Browser-side or edge-runtime image work — sharp is a native
  module and does not run where native addons cannot load.
- Simple one-off edits better done in a design tool.

## Prerequisites

- Node.js 20.9.0 or newer (sharp 0.35.x requires Node-API v9; it
  also runs on Deno and Bun). Current stable: sharp 0.35.5
  (October 2026), built on libvips 8.18 via sharp-libvips 1.3.4.
- A platform with a prebuilt sharp binary (most modern macOS,
  Windows, and Linux systems need no additional install or runtime
  dependencies). In Docker, build on the same platform the image
  runs on (glibc vs musl matters).
- The input images, as files, buffers, or streams.
- A target: output dimensions, formats, and quality for each use.

## Official Documentation

- [Sharp documentation](https://sharp.pixelplumbing.com/) — installation, API reference, and changelog.
- [Sharp releases](https://github.com/lovell/sharp/releases) — release notes for each version, including the libvips version bundled.
- Compatibility: sharp 0.35.x requires Node.js >= 20.9.0. Use
  sharp 0.35.5 or newer: earlier 0.35.x releases bundle a librsvg
  with a use-after-free flaw (GHSA-wq5f-xc86-pv6w, CVE-2026-96889),
  and versions below 0.35.0 bundle libvips decoders with known
  flaws in GIF, TIFF, and VIPS handling. A WebAssembly fallback
  exists in 0.35.x for environments where the native binary cannot
  load; treat it as a fallback, not the primary path.

## Required Workflow

1. Install sharp (`npm install sharp`) and confirm the installed
   version is 0.35.5 or newer.
2. Read the input with `sharp(input)` and call `.metadata()` to
   learn its format, dimensions, color space, and orientation
   before deciding the pipeline.
3. Build the pipeline in order: rotate to the correct orientation
   (`.rotate()`), then resize or crop, then composite if needed,
   then set the output format and quality last.
4. Choose the output format per use: JPEG for photos, PNG for
   graphics with sharp edges or transparency, WebP or AVIF for
   modern browsers where smaller files matter.
5. Write the output with `.toFile()` or `.toBuffer()`, and check
   the result: dimensions, file size, and visual quality.
6. Strip or preserve metadata deliberately: strip EXIF location
   data by default (sharp strips metadata unless `.withMetadata()`
   is called); preserve ICC profiles when color accuracy matters.
7. For responsive images, generate each size from the original in
   one pass (clone the pipeline per size) rather than resizing a
   resized image.

## Implementation Standards

- **One pipeline per output.** Build the chain
  `sharp(input).rotate().resize(...).jpeg(...).toFile(...)` and let
  libvips stream it; do not write intermediate files between steps.
- **Resize deliberately.** `.resize(width, height, { fit })` with
  `fit: "cover"` crops to fill, `fit: "inside"` (the default) fits
  within the box without cropping, and `fit: "contain"` letterboxes.
  Set `withoutEnlargement: true` when upscaling must be avoided.
- **Orientation first.** Call `.rotate()` before resizing so EXIF
  orientation is applied to the full-resolution image; resizing an
  unrotated image bakes in the wrong orientation.
- **Quality is a setting, not a guess.** Use explicit quality
  values (JPEG/WebP/AVIF `quality`, PNG `compressionLevel`) chosen
  per use, and verify the output visually at the target size.
- **Metadata is opt-in.** Sharp strips metadata by default. Call
  `.withMetadata()` only when the metadata is wanted (for example,
  preserving an ICC profile), and never to preserve location EXIF
  on published images.
- **Input limits are safety.** Sharp enforces a default maximum
  input pixel count; oversized inputs throw rather than exhausting
  memory. Raise it with `limitInputPixels` only for trusted inputs,
  and never for unvalidated user uploads.
- **SVG input is rasterized via librsvg.** Sharp can read SVG, but
  its SVG rendering differs from `resvg` and from browsers; for
  fidelity-critical SVG (such as Satori output), rasterize with
  `resvg` and use sharp for the post-processing steps.
- **Streams and buffers.** Prefer buffers or streams over temp
  files in servers; a single input stream can feed multiple output
  pipelines with `.clone()`.

### Accessibility

- Sharp produces pixels, not accessible documents: the accessible
  name must live where the image is published (`alt` text, or
  `og:image:alt` for social cards), not in the file. EXIF/IPTC
  metadata is not a substitute for alt text.
- Do not burn essential text into images that screen readers
  cannot reach; when text must be in the image, keep contrast at
  WCAG 2.2 AA and publish the same text alongside the image.

### Testing Strategy

- Assert on the output file, not the pipeline: dimensions, format,
  file size, and (for JPEG/WebP/AVIF) quality must match the target
  for each output, and a wrong `fit` shows up as a wrong size.
- Test EXIF orientation with a rotated input: the output must be
  correctly oriented, which only holds when `.rotate()` runs before
  resizing.
- Test metadata handling: published images carry no location EXIF, and
  an ICC profile is preserved only when `.withMetadata()` is wanted.
- Test oversized inputs: an image over the pixel limit throws instead
  of exhausting memory, and the limit is raised only for trusted
  inputs.
- Spot-check outputs visually at the target size on a sample of real
  images; a pipeline that passes numeric assertions can still produce
  a visibly bad crop.

## Best Practices

- Generate all variants from the original, never from a variant:
  each generation loses quality.
- Use AVIF or WebP for photographic content where the audience's
  browsers support them, with JPEG as the fallback — but check the
  consumer first: some social crawlers do not render WebP or AVIF
  previews, so OG images stay JPEG or PNG.
- Keep OG and social images as JPEG or PNG and compress them to
  their platform limits (for example, under 600 KB for WhatsApp).
- Set `mozjpeg: true` for smaller JPEGs when the extra encode time
  is acceptable, and use progressive JPEGs for large photos.
- Cache processed images by input hash plus settings, so the same
  request never re-processes.
- Tune concurrency for the host: `sharp.concurrency(n)` and
  `sharp.cache()` let a busy server bound libvips threads and
  memory instead of taking the defaults.

## Security Considerations

- Keep sharp at 0.35.5 or newer: older versions bundle vulnerable
  image decoders (librsvg use-after-free; libvips GIF/TIFF/VIPS
  decoder flaws). Check the resolved version in the lockfile, not
  just the range in `package.json`.
- Never process untrusted images without limits: validate the file
  type, enforce a maximum file size before sharp sees the bytes,
  and keep the default input pixel limit unless the input is
  trusted.
- Do not rasterize untrusted SVG through sharp's librsvg path
  without the same limits; SVG is a parsing-heavy format and a
  classic crafted-input target.
- Strip EXIF location and device metadata from user-uploaded images
  before publishing or storing them (sharp strips metadata by
  default — do not call `.withMetadata()` on untrusted uploads).
- Validate output paths: never build an output filename from
  untrusted input without sanitizing it.

## Performance Considerations

- Resizing with sharp is typically 4-5x faster than the quickest
  ImageMagick settings, because libvips processes images in small
  streaming regions and uses multiple cores.
- libvips holds only small regions of uncompressed image data in
  memory at a time, so sharp handles large images without loading
  them whole — but the output buffer still costs memory, so stream
  large outputs instead of buffering them.
- AVIF encoding is much slower than JPEG or WebP; encode AVIF at
  build time or in a background job, not on the request path.
- Reuse one sharp instance per input with `.clone()` for multiple
  outputs instead of decoding the input once per variant.
- In serverless deployments, keep the sharp binary in the bundle
  for the deployment platform (glibc vs musl) and cold-start cost
  in mind; a prebuilt binary is far cheaper than building from
  source at deploy time.

## Common Mistakes

- Running an old sharp version with known decoder vulnerabilities
  — check the lockfile, not the version range.
- Resizing before rotating, so EXIF orientation is applied to the
  wrong dimensions.
- Generating variants from variants instead of from the original.
- Calling `.withMetadata()` on user uploads and publishing their
  location EXIF.
- Using WebP or AVIF for OG images that social crawlers may not render.
- Installing sharp on one platform (macOS) and deploying to
  another (Alpine Linux) without rebuilding, so the native binary
  fails to load.
- Expecting sharp to run in an edge runtime: it needs Node-API,
  which edge runtimes do not provide.

## Examples

Resize and convert to WebP:

```js
const sharp = require("sharp");

await sharp("photo.jpg")
  .rotate()
  .resize(1200, 630, { fit: "cover" })
  .webp({ quality: 80 })
  .toFile("photo-1200.webp");
```

Generate JPEG and AVIF variants from one input:

```js
const sharp = require("sharp");

const pipeline = sharp("photo.jpg").rotate().resize(1600);

await pipeline.clone().jpeg({ quality: 82, mozjpeg: true }).toFile("photo-1600.jpg");
await pipeline.clone().avif({ quality: 60 }).toFile("photo-1600.avif");
```

Read metadata before processing:

```js
const sharp = require("sharp");

const metadata = await sharp("upload.jpg").metadata();
// { format: "jpeg", width: 4000, height: 3000, space: "srgb", ... }
```

Compress an OG image to a platform file-size limit:

```js
const sharp = require("sharp");

await sharp("og-source.png")
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("og.jpg");
```

## Validation Checklist

- [ ] The installed sharp version is 0.35.5 or newer (checked in the lockfile).
- [ ] Output dimensions, format, and file size match the target.
- [ ] Orientation is correct (`.rotate()` applied before resize).
- [ ] Variants were generated from the original, not from each other.
- [ ] Metadata handling is deliberate (stripped by default; preserved only when wanted).
- [ ] Untrusted inputs are size- and pixel-limited before processing.
- [ ] The output looks right at its display size (no visible artifacts).
- [ ] The native binary loads on the deployment platform.

## Expected Deliverables

- The processed image file(s) at the target sizes and formats.
- The processing script or pipeline code, with settings documented.
- A note of the sharp version used.

## References

- [Sharp documentation](https://sharp.pixelplumbing.com/) — installation, API, changelog.
- [Sharp releases](https://github.com/lovell/sharp/releases) — release notes and bundled libvips versions.
- Related skills in this repository: `image-compression`,
  `image-format-conversion`, `og-image-generation`,
  `platform-social-images`, `blog-featured-images`, `resvg`,
  `satori`.
