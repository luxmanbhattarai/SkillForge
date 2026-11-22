---
name: satori
description: >
  Render HTML and CSS (as JSX) to SVG with Satori, Vercel's library for
  programmatic Open Graph images and social cards. Covers the supported
  CSS subset, fonts, JSX usage, the standalone WASM build, and the
  limits of Satori rendering versus a browser. Use when generating OG
  images or social cards from markup, or debugging a Satori layout.
  Trigger keywords: satori, HTML to SVG, JSX to SVG, OG image
  generation, @vercel/og, next/og, ImageResponse, social card
  generation, dynamic OG image.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Satori

## Purpose

Satori converts HTML and CSS, written as JSX, into SVG. It is the
engine behind dynamic Open Graph images and social cards: describe the
card as markup, render it to SVG, then rasterize it to PNG with
`resvg` or `sharp`. It runs without a browser, so it works in
serverless and edge functions where a headless browser cannot.

## When to Use

- Generating Open Graph images or social cards from HTML/CSS markup.
- Building a dynamic OG image endpoint (per-article cards).
- Rendering a design to SVG without a headless browser.
- Debugging why a Satori layout differs from the browser's rendering.
- Choosing between Satori, `@vercel/og`, and a browser-based renderer.

## When Not to Use

- Rasterizing an existing SVG to PNG — use `resvg` or `sharp` instead.
- General image resizing or conversion — use `sharp` instead.
- Designing a static OG image by hand — use `og-image-generation`
  instead.
- Rendering arbitrary web pages — Satori supports a CSS subset, not
  the full web; use a headless browser for that.

## Prerequisites

- Node.js 16 or newer, a browser, or a Web Worker runtime.
- The `satori` package (current stable: 0.63.2, verified November
  2026) and, for JSX, React or Satori's experimental builtin JSX
  runtime (`satori/jsx`).
- Font files for every font the design uses: Satori has no system
  fonts and renders nothing without an explicit `fonts` option.
- A rasterizer (`resvg` or `sharp`) if the output must be PNG,
  since Satori itself only produces SVG.

## Official Documentation

- [Satori repository and README](https://github.com/vercel/satori) — the full documentation: supported HTML elements, the CSS property table, fonts, runtime support, and examples. The CSS table reflects the latest release; compare it against the version installed.
- [Vercel OG Image Generation](https://vercel.com/docs/og-image-generation) — Vercel's docs for `@vercel/og`, the `ImageResponse` wrapper around Satori.
- [Next.js ImageResponse](https://NextJs.org/docs/15/app/api-reference/functions/image-response) — `ImageResponse` from `next/og`, the built-in Next.js route for OG images.
- Compatibility: Satori uses the Taffy layout engine for Flexbox,
  Grid, and block layout; Grid and block support arrived with the
  Taffy rewrite in Satori 0.37.0 (October 2026). Older Satori
  versions, including the one bundled inside `@vercel/og` 1.0.x
  (1.0.3 ships Satori 0.33.5; earlier 1.0.x shipped 0.29.x),
  support Flexbox only — check the installed Satori version before relying on Grid or block layout.
  `next/og` re-exports `@vercel/og`, so the same caveat applies
  there. Satori renders text as SVG `<path>` data by default
  (`embedFont: true`); set `embedFont: false` to emit `<text>`
  instead, and then the downstream renderer needs the fonts.

## Required Workflow

1. Decide the output size (for OG images, 1200x630) and the
   rendering path: standalone Satori plus `resvg`/`sharp`, or
   `ImageResponse` from `@vercel/og` / `next/og`.
2. Install Satori and load the fonts the design needs as
   `ArrayBuffer` (web) or `Buffer` (Node.js). Pass one entry per
   weight and style in the `fonts` option.
3. Write the card as JSX with inline styles only, using the CSS
   subset Satori supports (see Implementation Standards). Keep the
   tree pure and stateless: no hooks, no effects, no event handlers.
4. Call `satori(element, { width, height, fonts })` and confirm it
   returns an SVG string. Catch errors: an invalid inline style
   throws and fails the whole render.
5. Rasterize the SVG to PNG with `resvg` (preferred for fidelity)
   or `sharp`, or return the SVG directly if the consumer accepts it.
6. Compare the output against the intended design at the target
   size; use `debug: true` to draw bounding boxes when layout is off.
7. Cache the generated image (at build time, on publish, or with
   long-lived cache headers) so sharing never waits on rendering.

## Implementation Standards

- **JSX only, pure and stateless.** Satori accepts JSX elements or
  React-element-like objects (`{ type, props }`). React APIs such as
  `useState` and `useEffect` are not supported. `dangerouslySetInnerHTML`
  is supported only on `<style>` and `<script>`.
- **Inline styles or `<style>` elements.** Styles come from the
  `style` prop or from `<style>` elements, whose CSS applies to the
  whole tree with cascade, specificity, `@media`, `@layer`, and
  `@supports`. External resources via `<link>` or `<script>` are
  not loaded; `@import`, `@font-face`, and `@keyframes` are ignored.
- **Layout is Flexbox, Grid, and block (Taffy).** `display: flex`,
  `display: grid`, and `display: block` are supported. `display:
  table`, `ruby`, and their inner values are not supported and
  throw. `position: relative` and `absolute` are supported.
- **Supported CSS is a subset.** The README's CSS table is the
  authority: margins, padding, borders, border radius, backgrounds,
  transforms, shadows, filters, `objectFit`, `opacity`, `lineClamp`,
  and most text properties are supported, with documented
  differences from browsers. Properties not listed (for example
  `columns`, `writingMode`, `fontStretch`) are ignored.
- **Fonts are mandatory and explicit.** Satori supports TTF, OTF,
  WOFF, and WOFF2. Only the fonts passed in the `fonts` option are
  used; generic families like `serif` do not select a font. Variable
  fonts render as their default instance, so pass a separate font
  file per weight. Use `loadAdditionalAsset` to load fonts or emoji
  images on demand for text segments the loaded fonts do not cover.
- **Emojis need images.** Map graphemes to image URLs with
  `graphemeImages`, or use `loadAdditionalAsset` for the `emoji`
  code; Satori has no built-in emoji font.
- **Images need dimensions.** Set `width` and `height` on `<img>`.
  Prefer base64 or buffer image data as `src` when the SVG will be
  rasterized, so no extra fetch is needed at render time.
- **Invalid styles throw by default.** Pass `onStyleError` to ignore
  invalid declarations instead of failing the render; stylesheet
  declarations are always dropped like in browsers.
- **Colors are converted for SVG renderers.** Satori converts
  `lab()`, `oklch()`, `color()`, `color-mix()`, `hwb()`, and similar
  colors to `rgb()`/`rgba()` by default; set `convertColors: false`
  only when the downstream renderer supports them.
- **Output is SVG, not PNG.** Satori returns an SVG string. Use
  `resvg` or `sharp` for the PNG step, or serve the SVG where the
  consumer accepts it.

### Accessibility

- Satori output is an image: the accessible name lives where the
  image is published, not in the file. The page or post that
  embeds the rendered PNG must supply `alt` text (or
  `og:image:alt` for social cards); see `platform-social-images`.
- Keep text in the card legible: body-text contrast at WCAG 2.2 AA
  (4.5:1) at the rendered size, and do not rely on color alone to
  convey meaning.

### Testing Strategy

- Snapshot-test the SVG output for representative designs with pinned
  fonts: a layout or text change shows up as a snapshot diff for a
  human to approve or reject.
- Test the failure modes: unsupported CSS either throws or is dropped
  per `onStyleError`, and a missing font renders nothing instead of
  silently substituting.
- Test emoji rendering with the project's grapheme mapping, and test
  long text, overflow, and `lineClamp` at the real card size — text
  that fits in the design tool can overflow the generated image.
- Visually regression-test the rasterized output (via `resvg` or
  `sharp`): the SVG is an intermediate, and the PNG is what users see.
- Test images with explicit dimensions and embedded data so a render
  never depends on a network fetch at generation time.

## Best Practices

- Design inside the supported subset from the start: flexbox-first
  layouts, explicit sizes, and web-safe patterns render identically
  everywhere; exotic CSS is where Satori and the browser diverge.
- Define fonts once at module scope and reuse the `fonts` array
  across renders instead of rebuilding it per request.
- Subset fonts to the characters the cards actually use; full font
  files bloat edge bundles (the `ImageResponse` bundle limit is
  500 KB including fonts and images).
- Test with the longest real title and the shortest one; text
  overflow is the most common visual bug in generated cards.
- Use `pointScaleFactor: 2` for crisper text on high-DPI displays.
- Keep the design deterministic: no random values, no
  time-dependent content, so the same input always renders the same
  image and caches stay valid.

## Security Considerations

- Treat user-supplied text as untrusted: escape it before it reaches
  the JSX tree, and cap its length, so a long or hostile title
  cannot break the layout or blow up render time.
- Never fetch arbitrary remote URLs as images or fonts from
  user-supplied input; allowlist the hosts or embed assets locally.
  A remote fetch in a render path is a server-side request forgery
  vector.
- Do not embed secrets in the card markup or in fetched font URLs;
  generated images are cached and shared publicly.
- Limit input size and render concurrency on public OG endpoints;
  rendering is CPU work and an unbounded endpoint is a denial-of-
  service target.

## Performance Considerations

- Satori bundles its WASM dependencies as base64 strings and loads
  them at runtime. Where dynamic WASM loading is restricted (for
  example Cloudflare Workers), use the standalone build
  (`satori/standalone`) and load `layout.wasm` manually with `init`.
- Render at build time or on publish when the content is known;
  on-demand rendering belongs behind a cache with long-lived
  `Cache-Control` headers.
- Reuse font buffers across renders and prefer subset fonts to keep
  cold starts fast.
- The experimental `satori/experimental` build adds WebGL canvas
  and exact perspective rendering, but it is experimental and may
  change or be removed; do not depend on it in production without
  pinning the version.

## Common Mistakes

- Forgetting the `fonts` option — Satori renders no text at all
  without explicitly passed fonts.
- Using CSS Grid or block layout with the Satori version bundled in
  `@vercel/og`/`next/og`, which predates Grid support; check the
  installed version first.
- Assuming the output matches the browser pixel-for-pixel — Satori
  implements its own layout engine on the SVG 1.1 spec and does not
  guarantee a 100% match; verify the rendered image, not the markup.
- Using external stylesheets or `<link>` tags, which Satori never
  loads; styles must be inline or in `<style>` elements.
- Passing a variable font and expecting weights to vary — variable
  fonts render as their default instance; pass one file per weight.
- Rendering on every request with no cache, so every share pays the
  full render cost.

## Examples

Basic Satori render with fonts:

  [examples/basic-render.tsx](./examples/basic-render.tsx).

Rasterize the SVG to PNG with `resvg`:

  [examples/rasterize-png.mjs](./examples/rasterize-png.mjs).

Next.js route with `ImageResponse` (Satori + resvg built in):

  [examples/image-response-route.tsx](./examples/image-response-route.tsx).

## Validation Checklist

- [ ] The installed Satori version supports every CSS feature the design uses.
- [ ] All fonts are passed explicitly, one file per weight and style.
- [ ] The JSX tree is pure and stateless (no hooks, effects, or handlers).
- [ ] The render succeeds without `onStyleError` swallowing real errors.
- [ ] The rasterized PNG matches the intended design at 1200x630.
- [ ] Long and short titles both render without overflow.
- [ ] The image is cached so repeat shares do not re-render.
- [ ] User-supplied text is escaped and length-capped.

## Expected Deliverables

- The Satori rendering code (route, script, or component) with fonts loaded.
- The generated SVG and/or PNG output at the target size.
- A note of the Satori version used and any CSS features avoided for compatibility.
- Cache configuration for the generated images.

## References

- [Satori repository and README](https://github.com/vercel/satori) — supported elements, CSS table, fonts, runtime support.
- [Vercel OG Image Generation](https://vercel.com/docs/og-image-generation) — `@vercel/og` and `ImageResponse`.
- [Next.js ImageResponse](https://NextJs.org/docs/15/app/api-reference/functions/image-response) — `next/og` reference.
- Related skills in this repository: `resvg`, `sharp`,
  `og-image-generation`, `platform-social-images`, `social-preview`,
  `nextjs`.
