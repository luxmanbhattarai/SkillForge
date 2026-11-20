---
name: resvg
description: >
  Render SVG to raster images (PNG) with resvg, the fast, portable
  Rust SVG renderer. Covers the CLI, the Rust library, the Node.js
  bindings (@resvg/resvg-js and @resvg/resvg-wasm), font handling,
  scaling, and the Satori-to-PNG pipeline. Use when converting SVG to
  PNG, rasterizing Satori output, or rendering SVG without a browser.
  Trigger keywords: resvg, SVG to PNG, rasterize SVG, svg renderer,
  @resvg/resvg-js, resvg-wasm, Satori PNG, SVG rendering.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Resvg

## Purpose

Resvg renders static SVG files to raster images, usually PNG. It is a
pure-Rust renderer with no system dependencies, so it produces
identical pixels on every platform and runs anywhere Rust compiles,
including WebAssembly. It is the standard second half of the
Satori pipeline (`satori` lays out the card as SVG; resvg bakes it
into a PNG) and the renderer behind `@vercel/og` / `next/og`.

## When to Use

- Converting an SVG file or string to PNG.
- Rasterizing `satori` output into an OG image or social card.
- Rendering SVG in a server, CLI tool, or build step without a browser.
- Rendering SVG in an edge or browser context via WebAssembly.
- Needing reproducible, pixel-identical SVG rendering across platforms.

## When Not to Use

- Creating SVG from HTML/CSS — use `satori` instead.
- General image resizing, conversion, or optimization — use `sharp`
  instead (sharp also rasterizes SVG, via librsvg, when that is
  already in the pipeline).
- Rendering animated or scripted SVG — resvg supports only the
  static SVG subset; use a browser for dynamic SVG.
- Vector output: resvg renders to raster, not to another vector format.

## Prerequisites

- For the CLI or Rust library: Rust 1.85.0 or newer, or a prebuilt
  `resvg` binary. Current stable: resvg 0.50.0 (verified November
  2026); the repository is now `linebender/resvg`.
- For Node.js: the `@resvg/resvg-js` package (current stable:
  2.6.2, March 2024) for native rendering, or
  `@resvg/resvg-wasm` (2.6.2) for browsers and edge runtimes.
- The SVG input as a file, string, or buffer.
- Font files, if the SVG contains `<text>` elements — resvg has no
  built-in fonts and only renders text with fonts it is given
  (Satori output usually needs none, since Satori embeds text as
  paths by default).

## Official Documentation

- [resvg repository](https://github.com/linebender/resvg) — README, features, limitations, and the supported-SVG table.
- [resvg on docs.rs](https://docs.rs/crate/resvg/latest) — Rust API documentation for the current release.
- [resvg-js repository](https://github.com/yisibl/resvg-js) — Node.js and WebAssembly bindings: installation, options, and examples (the repository now lives under the `thx` organization; the old `yisibl` URL redirects).
- Compatibility: the Rust crate (0.50.0) and the JavaScript
  bindings (2.6.2) are versioned independently, and the bindings
  lag the crate: `@resvg/resvg-js` 2.6.x bundles resvg 0.34.0-era
  rendering. Check the binding's changelog for the bundled resvg
  version before relying on newer SVG features through the JS API.
  Resvg supports only the static SVG subset — no `a`, `script`,
  `view`, or `cursor` elements, no events, no animations — and SVG 2
  support is in progress.

## Required Workflow

1. Choose the interface: the `resvg` CLI for one-off or build-step
   conversion, the Rust crate for Rust programs, `@resvg/resvg-js`
   for Node.js servers and CLIs, `@resvg/resvg-wasm` for browsers
   and edge runtimes.
2. Provide the SVG input (file, string, or buffer) and the target
   size. Resvg renders at the SVG's intrinsic size unless scaling
   options are given.
3. Supply fonts if the SVG contains `<text>`: pass font files or
   buffers explicitly, and disable system-font loading for
   deterministic, faster renders. Skip this step for Satori output
   with the default `embedFont: true`, where text is already paths.
4. Set the background explicitly when transparency is not wanted;
   the default output has a transparent background.
5. Render and write the PNG (or keep the raw pixels for further
   processing). Confirm the output dimensions and file size.
6. Compare the output against the intended design; if text is
   missing, the fonts were not loaded, and if the image is blank,
   the SVG likely uses unsupported dynamic features.

## Implementation Standards

- **Static SVG only.** Resvg parses with `usvg` and renders with
  `tiny-skia`. It ignores or drops dynamic features (scripts,
  animations, events, links) rather than executing them. Do not
  expect browser-identical rendering of dynamic SVG.
- **Fonts are explicit.** Load only the fonts the SVG needs, via
  `fontFiles` (Node.js) or `fontBuffers` (WASM), set
  `loadSystemFonts: false` for speed and reproducibility, and set
  `defaultFontFamily` when the SVG names a family that is not
  loaded. Without a matching font, text renders as missing glyphs.
- **Scaling is explicit.** Use `fitTo` with a width or height to
  scale the output (for example, fit a Satori SVG to 1200 px wide
  for an OG image). Rendering at the SVG's intrinsic size and
  resizing later loses quality; render at the final size.
- **Background is explicit.** Pass a `background` color when the
  PNG must be opaque; otherwise the output is transparent.
- **Reproducibility.** The same SVG, fonts, and options produce
  identical pixels on every platform, since resvg has no system
  dependencies. Pin versions and fonts to keep that guarantee.
- **WASM needs initialization.** With `@resvg/resvg-wasm`, call
  `initWasm` with the WASM binary before constructing `Resvg`.
- **CLI usage.** `resvg [OPTIONS] <in-svg> <out-png>` converts a
  file; `-` reads from stdin or writes to stdout with `-c`, and
  `-z` sets a zoom factor (for example `resvg -z 2 in.svg out.png`
  renders at twice the size).

## Best Practices

- Render at the final output size instead of rendering large and
  downscaling; resvg's scaling is high quality and one render is
  cheaper than two steps.
- For the Satori pipeline, keep Satori's default `embedFont: true`
  so the SVG carries text as paths and resvg needs no fonts at all
  — the simplest and most reproducible setup.
- Disable system fonts (`loadSystemFonts: false`) in servers and
  CI: system fonts vary by machine and slow down startup.
- Prefer the native binding (`@resvg/resvg-js`) on servers and the
  WASM binding (`@resvg/resvg-wasm`) only where native addons
  cannot run (browsers, edge runtimes); the native binding is
  faster.
- Cache rendered PNGs; rendering is fast but not free, and OG
  images are usually rendered once per page version.

## Security Considerations

- Resvg never executes scripts or loads external resources from
  SVG on its own, which makes it safer than a browser for
  untrusted SVG — but validate untrusted input anyway: cap the
  input size and the output dimensions before rendering.
- The JS bindings can load images from external links in `<image>`
  elements; do not render untrusted SVG that references remote
  URLs without an allowlist, or the render becomes a server-side
  request.
- Resvg has guards against endless loops and stack overflows from
  hostile SVG, but keep the library updated: rendering libraries
  are a classic target for crafted-input bugs.
- Do not render SVG from user input in a privileged process; treat
  it like any other untrusted file parsing.

## Performance Considerations

- The `resvg` CLI binary is under 5 MB with no external
  dependencies, so it is cheap to ship in containers and CI.
- Native rendering is fast (tens of milliseconds for a typical OG
  card); the WASM binding is slower, so prefer native where it can
  run.
- Loading system fonts is the slowest part of startup for the JS
  bindings; disable it when fonts are supplied explicitly.
- Rendering is synchronous in the JS bindings (there is no async
  API); run heavy or batched renders off the request path or in a
  worker so a slow render does not block the event loop.
- Output PNGs from resvg are unoptimized; run them through `sharp`
  or an optimizer when file size matters (for example, the 600 KB
  WhatsApp preview limit).

## Common Mistakes

- Expecting text to render with no fonts loaded — resvg has no
  built-in fonts; supply them or use Satori's path embedding.
- Using the JS bindings and assuming they match the latest Rust
  crate — `@resvg/resvg-js` 2.6.x bundles an older resvg; check
  the bundled version for newer SVG features.
- Forgetting `initWasm` with `@resvg/resvg-wasm`, so the first
  render throws.
- Rendering at intrinsic size and downscaling later, instead of
  fitting to the final size in one step.
- Leaving the background transparent when the consumer expects an
  opaque image (some preview renderers show transparency as black).
- Shipping the native binding to an edge runtime that cannot load
  native addons — use the WASM binding there.

## Examples

Node.js: render a Satori SVG to a 1200 px-wide PNG.

```js
const { Resvg } = require("@resvg/resvg-js");

const resvg = new Resvg(svg, {
  background: "#fff8ec",
  fitTo: { mode: "width", value: 1200 },
  font: { loadSystemFonts: false },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();
```

Node.js with custom fonts for SVG `<text>`:

```js
const { Resvg } = require("@resvg/resvg-js");

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontFiles: ["./fonts/Inter-Regular.ttf"],
    loadSystemFonts: false,
    defaultFontFamily: "Inter",
  },
});

const pngBuffer = resvg.render().asPng();
```

CLI: convert an SVG file to PNG at double size.

```bash
resvg -z 2 card.svg card@2x.png
```

WASM (browser or edge): initialize before rendering.

```js
import { initWasm, Resvg } from "@resvg/resvg-wasm";

await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"));

const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
const pngBuffer = resvg.render().asPng();
```

## Validation Checklist

- [ ] The interface matches the runtime (native for servers, WASM for edge/browser).
- [ ] The output PNG has the intended dimensions.
- [ ] Text renders correctly (fonts loaded, or Satori path embedding used).
- [ ] The background is opaque or transparent as intended.
- [ ] The same input renders identically on a second machine (reproducibility).
- [ ] Untrusted SVG inputs are size-capped before rendering.
- [ ] Rendered images are cached rather than re-rendered per request.

## Expected Deliverables

- The rendered PNG file(s) at the target size.
- The rendering code (script, route, or build step) with fonts configured.
- A note of the resvg and binding versions used.

## References

- [resvg repository](https://github.com/linebender/resvg) — features, limitations, supported SVG.
- [resvg on docs.rs](https://docs.rs/crate/resvg/latest) — Rust API docs.
- [resvg-js repository](https://github.com/yisibl/resvg-js) — Node.js and WASM bindings.
- Related skills in this repository: `satori`, `sharp`,
  `og-image-generation`, `platform-social-images`, `social-preview`.
