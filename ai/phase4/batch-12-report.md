# Phase 4 — Batch 12 Report (content + media engineering)

- **Date:** 2026-11-20
- **Batch:** 12 — `editorial-workflow`, `source-verification`, `satori`,
  `resvg`, `sharp`, `platform-social-images` + content-brief-automation
  decision
- **Working copy:** `/home/hatch/workspace/SkillForge-upgrade`,
  branch `feat/skillforge-production-upgrade`
- **Rules observed:** no push/merge/PR/branch switch, no commits, no
  changes to `skills/upstream/` or outside this batch's assignment.

## Skills written (6 new)

| Skill | Lines | Validation |
| --- | --- | --- |
| `skills/content/editorial-workflow/SKILL.md` | 225 | PASS |
| `skills/content/source-verification/SKILL.md` | 232 | PASS |
| `skills/media/satori/SKILL.md` | 290 | PASS |
| `skills/media/resvg/SKILL.md` | 263 | PASS |
| `skills/media/sharp/SKILL.md` | 271 | PASS |
| `skills/media/platform-social-images/SKILL.md` | 296 | PASS |

All six follow `templates/SKILL-TEMPLATE.md` exactly (sections in
order, frontmatter with `version: "1.0.0"`, `last_verified:
"2026-11-20"`, `license: MIT`, `maintainer: skills-library`, `source:
original`), are under 500 lines, cross-reference related skills by
backticked name only, and contain no TODO/lorem-ipsum/placeholder
content (verified by grep).

## Content-brief-automation decision: EXTEND `content-brief` in place

**Decision:** extended `skills/content/content-brief/SKILL.md` (155 →
232 lines); no separate `content-brief-automation` skill was created.

**Reason:** brief automation (schemas, generators, SERP-derived
briefs, programmatic pipelines) is a *method of producing briefs*,
not a separate discipline. It shares the brief's content model
(goal, audience, outline, sources, acceptance criteria) and its
quality bar, and the existing skill had ample room (155 of 500
lines). A separate skill would have duplicated the brief structure
and the acceptance-criteria rules. The extension adds: a "When to
Use" bullet, a "Brief automation" subsection under Implementation
Standards (schema-first, SERP-derived fields, pipeline with a human
approval gate, source handling, batching), automation best
practices, a JSON brief-schema example, a validation-checklist item,
and `serp-analysis`, `keyword-research`, `keyword-clustering`,
`programmatic-seo` in the related skills. `last_verified` was already
"2026-11-20"; no change needed. Validation: PASS.

## Official sources consulted per skill

### `editorial-workflow` (process skill; no versioned technology)

- Google, "Creating helpful, reliable, people-first content"
  (developers.google.com) — quality standard the pipeline enforces.
- Google Search Essentials (developers.google.com).
- plainlanguage.gov.
- Complemented (not duplicated) the existing `editorial-review`
  (the review step), `content-brief`, and `fact-checking` skills,
  all read before writing.

### `source-verification` (process skill)

- IFCN Code of Principles — ifcncodeofprinciples.poynter.org
  (verified via search; Poynter's IFCN standards).
- Google Fact Check Explorer — toolbox.google.com/factcheck/explorer
  (verified via Google's own Fact Check Tools training page and
  about page).
- C2PA — c2pa.org (spec site) and the Content Credentials verifier
  at contentcredentials.org/verify (verified via multiple sources;
  C2PA spec 2.5 released October 2026).
- Google Scholar — scholar.google.com.
- Poynter — poynter.org.
- SIFT method (Caulfield/Wineburg, "Verified") — verified via
  multiple library guides (Carroll CC, SDSU, LibreTexts); the four
  moves are Stop / Investigate / Find better coverage / Trace.
- Distinct from `fact-checking` (claim checking): this skill vets
  the source; `fact-checking` checks the claim against it.

### `satori`

- Satori README (github.com/vercel/satori) — read in full (fetched
  2026-11-20): Taffy layout engine (Flexbox/Grid/block), full CSS
  property table, fonts (TTF/OTF/WOFF/WOFF2; variable fonts render
  as default instance), `embedFont` default true, `graphemeImages`,
  `loadAdditionalAsset`, `satori/standalone` + `layout.wasm`,
  `satori/experimental` (WebGL canvas, exact perspective),
  `onStyleError`, `pointScaleFactor`, `convertColors`, `debug`,
  Node >= 16 / browser / Web Workers.
- Current stable 0.63.2 (npm.io listing + a 2026-10-29 article
  running 0.63.2).
- Grid/block support landed with the Taffy rewrite in Satori 0.37.0
  (PR #841, merged 2026-10-08) — per iaman.kr, which checked the
  repo; the README's CSS table confirms Grid support in current
  Satori.
- `@vercel/og` 1.0.x (September 2026) bundles Satori 0.29.x, which
  predates Grid support — per the same source; the skill warns to
  check the installed version when using `next/og` / `@vercel/og`.
- Vercel OG Image Generation docs (examples.vercel.com/docs/og-image-generation)
  and Next.js `ImageResponse` reference
  (NextJs.org/docs/15/app/api-reference/functions/image-response)
  — verified via search results.

### `resvg`

- resvg README (github.com/linebender/resvg) — read in full: repo
  moved from RazrFalcon to Linebender, Rust 1.85.0+, CLI under
  5 MB, static SVG subset only, usvg preprocessing, tiny-skia,
  ~1600 regression tests.
- Current stable crate 0.50.0 (docs.rs latest + Arch Linux package
  built 2026-11-16).
- resvg-js README (github.com/yisibl/resvg-js, now under the `thx`
  org) — read in full: `Resvg` API, `fitTo`, `background`, `font`
  options (`fontFiles`, `loadSystemFonts`, `defaultFontFamily`,
  `fontBuffers`), `render().asPng()`, `cropByBBox`, WASM
  (`@resvg/resvg-wasm`, `initWasm`), support matrix.
- `@resvg/resvg-js` / `@resvg/resvg-wasm` latest 2.6.2 (2024-03-26,
  changelog); 2.6.x bundles resvg 0.34.0-era rendering — the skill
  flags this version lag explicitly.
- Note (not in the skill): a newer Node binding, `resvg-napi`,
  is under active development (0.13.0, November 2026); worth a
  look if the 2.6.x bindings' bundled resvg version becomes a
  problem.

### `sharp`

- Sharp homepage (sharp.pixelplumbing.com) — fetched 2026-11-20:
  Node.js >= 20.9.0, Node-API v9, Deno/Bun, libvips, formats
  (read JPEG/PNG/WebP/GIF/AVIF/TIFF/SVG; output JPEG/PNG/WebP/GIF/
  AVIF/TIFF/raw), 4-5x faster than ImageMagick.
- Current stable 0.35.5 (October 2026) — confirmed via Snyk
  (latest 0.35.5) and the official release notes quoted in a
  Dependabot PR (sharp-libvips v1.3.4; libvips 8.18.6 in 0.35.4).
- Security: 0.35.5 fixes the librsvg use-after-free
  (GHSA-wq5f-xc86-pv6w / CVE-2026-96889); versions below 0.35.0
  bundle libvips decoders with known GIF/TIFF/VIPS flaws
  (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591,
  CVE-2026-69242) — per Snyk and the Next.js GHSA-2464-fhr4-w9xw
  write-up. The skill requires >= 0.35.5.
- 0.35.5 release notes also mention a WebAssembly fallback and
  JXL output options; the skill mentions the WASM fallback only
  as a fallback, not a primary path.
- Caveat: the sharp changelog page (sharp.pixelplumbing.com/changelog)
  could not be fetched (browser service returned 429); the version
  was instead verified from Snyk and the GitHub release notes, and
  the skill links the docs home and the releases page, both verified.

### `platform-social-images`

Per-platform specs, each verified against that platform's own
documentation where it exists; where a platform publishes no spec,
the skill says so explicitly.

| Platform | Spec | Provenance |
| --- | --- | --- |
| Facebook/Meta | 1200x630 recommended; 600x315 min for large preview; 200x200 absolute min; 8 MB; ~1.91:1 | Meta's sharing guidance as recorded in this repo's `og-image-generation` skill, corroborated by multiple secondary sources Nov 2026. Meta's docs page itself returned 403 on fetch — see note below. |
| LinkedIn | min 1200x627; 1.91:1; 5 MB; <401 px wide shows as thumbnail | LinkedIn Help ("Make your website shareable on LinkedIn"), corroborated by multiple secondary sources Nov 2026. Post Inspector: linkedin.com/post-inspector/. |
| X | Large card 2:1 (1200x600 exact), min 300x157, max 4096x4096, <5 MB, JPG/PNG/WEBP/GIF (first frame), no SVG; summary 1:1 min 144x144; title 70 chars, description 200 chars, alt 420 chars | X's last published card specification (Summary Card with Large Image, archived January 2026). X's Cards docs pages now redirect to the docs overview and the Card Validator is retired (cards-dev.x.com/validator sends visitors to login). |
| WhatsApp | <600 KB; >=300 px wide; ratio <=4:1; tags in `<head>` within first 300 KB of HTML; ~80-char description; ~10 s preview window; no cache-clear tool | Meta's WhatsApp Business link-previews documentation (updated 2025-11-05), as reported by multiple secondary sources Nov 2026. |
| Slack | Reads OG + X Card tags; no published size/file-size rules | Slack's unfurling docs (api.slack.com) as reported by secondary sources; user agent Slackbot-LinkExpanding. |
| Discord | Reads og:/twitter: tags; large image needs `twitter:card: summary_large_image`; title trimmed past 70 bytes, description past 350 bytes; formats PNG/GIF/JPG/JPEG/WebP/AVIF; no published min pixel size (example 1200x630); 10 s fetch limit | Discord developer documentation (Link Previews page, November 2026) as reported by secondary sources. |
| Telegram, iMessage, others | Read `og:image`; no published image spec | No spec found in their public documentation as of 2026-11-20; the shared 1200x630 file is the practical default. |

Shared-image conclusion: one 1200x630 JPEG under 600 KB satisfies
every platform in the table; X gets a dedicated 1200x600 export
only when the ~15 px 2:1 trim is unacceptable.

## Validation output

Filtered validation run from the repo root, 2026-11-20 (all PASS,
no errors to fix):

```text
=== skills/content/editorial-workflow ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== skills/content/source-verification ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== skills/content/content-brief ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== skills/media/satori ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== skills/media/resvg ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== skills/media/sharp ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== skills/media/platform-social-images ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

Unfiltered validate and `npm run registry` were NOT run, per the
batch instructions (coordinator regenerates the registry once at
the end).

## Decisions and notes

- **No `references/` subdirectories were created.** Each skill's
  material fits in `SKILL.md` under 500 lines; no skill genuinely
  needed supporting files.
- **Meta docs fetch failure.** `developers.facebook.com/docs/sharing/webmasters/`
  returned HTTP 403 to the fetch tool, so the Facebook figures were
  not re-verified against the live page. They match the figures
  already recorded (and previously verified) in this repository's
  `og-image-generation` skill and were corroborated by multiple
  independent secondary sources in November 2026. The skill states
  this provenance in its Compatibility note rather than claiming a
  direct check.
- **Sharp changelog fetch failure.** The sharp changelog page hit a
  browser-service rate limit (429). The 0.35.5 version was verified
  instead from Snyk and the official GitHub release notes.
- **X Cards docs are gone.** X's Cards documentation pages now
  redirect to the general docs overview and the Card Validator is
  retired; the X figures in `platform-social-images` (and the
  existing `twitter-card-images`) rest on X's last published spec
  as archived. Both skills say so.
- **Resvg binding lag.** The JS bindings (`@resvg/resvg-js` 2.6.2,
  March 2024) bundle a much older resvg (0.34.0-era) than the
  current Rust crate (0.50.0). The `resvg` skill flags this; teams
  needing newer SVG features through JS should check the bundled
  version or use the Rust crate / CLI.
- **Satori bundled-version lag.** `@vercel/og` 1.0.x bundles Satori
  0.29.x, which predates Grid/block support (0.37.0). The `satori`
  skill warns to check the installed version before relying on Grid
  in `next/og`.
- **Cross-references verified to exist:** `editorial-review`,
  `fact-checking`, `content-brief`, `content-strategy`,
  `content-research`, `article-writing`, `human-editing`,
  `content-refresh`, `seo-content-writing`, `eeat-writing`,
  `og-image-generation`, `social-preview`, `twitter-card-images`,
  `image-compression`, `image-format-conversion`,
  `blog-featured-images`, `serp-analysis`, `keyword-research`,
  `keyword-clustering`, `programmatic-seo`, `nextjs`
  (all present in `skills/` or referenced by `AGENTS.md`).
- **Files changed:** 6 new `SKILL.md` files, 1 extended
  (`content-brief`), 1 report (this file). Nothing else touched.
