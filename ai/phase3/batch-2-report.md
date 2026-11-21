# Phase 3 Batch 2 Report — Frontend Technical-Accuracy Audit

- **Batch:** Phase 3 batch 2 (frontend)
- **Directory:** `skills/frontend/` (16 skills)
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted, per
  instructions; no push, merge, PR, commit, or branch switch performed)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/frontend`
  → **PASS** (16 skills checked, 16 original, 0 upstream, all valid).
  All files remain under 500 lines (longest: `typescript`, 299 lines).
  `npm run registry` was not run (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 16 |
| Verified with limitations | 0 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

Every skill was checked against authoritative sources (official product docs,
official API references, official release notes / upgrade guides, W3C
standards) and is correct as of 2026-11-20 after the fixes below. All 16
skills already carried `metadata.last_verified: "2026-11-20"`, which is the
date this verification was actually performed, so no date changes were needed.
No skill was restructured, renamed, deleted, or rescoped; the 15-section
structure and frontmatter `name`/`description` fields are unchanged throughout.
One frontmatter `compatibility` line was corrected (hugo — it stated something
factually wrong; see below).

## Per-skill results

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| nextjs | Verified | H-04 fetch-caching claim; Next.js 16 requirements, Turbopack default, middleware→proxy rename, async request APIs, Cache Components; `next: { revalidate }` example; `create-next-app`, `revalidatePath`/`revalidateTag`, `generateStaticParams`, `next/image`, `next/font`, `NEXT_PUBLIC_` guidance | **H-04 FIXED:** the skill claimed "`fetch` requests in server components are cached unless opted out" — the Next.js 14 behavior. Since Next.js 15, `fetch` is **not** cached by default; caching is opt-in (`cache: 'force-cache'`, `next: { revalidate }`, `fetchCache = 'default-cache'`; with Cache Components in 16, `'use cache'` + `cacheLife`). Version boundary (14 vs 15+) documented in Implementation Standards, with two new Common Mistakes. Also fixed: "middleware" → `proxy.ts` (deprecated in 16, Node runtime only); `cookies()`/`headers()`/`params` must be awaited (sync access removed in 16); Prerequisites now state Node 20.9+ minimum, 16 Active LTS / 15 Maintenance LTS, Turbopack default; added official v15/v16 upgrade-guide links | nextjs.org/docs (v15 + v16 upgrade guides, caching guides, Proxy page, fetching-data guide, support policy) |
| typescript | Verified | Current major version; `tsconfig` defaults; `moduleResolution` values; `strict`, `types`, `target` defaults; `tsc` command; utility types, `satisfies`, discriminated unions | **Major-version fix:** skill said "TypeScript 5.x (current major line)" — the current major is **7.x** (7.0 released 2026-07-08, native Go port, same `typescript` package and `tsc` binary, ~10x faster builds). Prerequisites now cover 7.0 and the 6.0 bridge release (2026-03-23) whose defaults 7.0 inherits (`strict: true`, `module: esnext`, `target: es2025`, `types: []`, `rootDir: "."`). **Fixed:** `moduleResolution: "node"` for Node-first projects → `"nodenext"` (`node`/node10 deprecated in 6.0, removed in 7.0); added the 6.0 deprecation list (`target: es5`, `baseUrl`, `outFile`, `amd`/`umd`/`systemjs`, `classic`); noted 7.0 ships no programmatic API until 7.1 (`@typescript/typescript6` / `tsc6` side-by-side); tsconfig example target updated ES2022 → ES2025; added `types: []` common mistake | devblogs.microsoft.com (Announcing TypeScript 7.0, 7.0 RC/Beta, 6.0), typescriptlang.org docs, JavaScript Weekly #778, Visual Studio Magazine / SD Times (6.0 defaults corroboration) |
| astro | Verified | Astro 7 currency; content layer API (`src/content.config.ts`, `glob()` loader, `getCollection`/`getEntry`); Zod import; Node minimum; hydration directives; `Image` from `astro:assets`; `PUBLIC_` env vars; `getStaticPaths()` | **Fixed:** example imported `z` from `astro:content` — deprecated in Astro 6.0; now imports `z` from `astro/zod` per official docs, with a new Implementation Standards bullet and Common Mistake. Prerequisites now state Node 22.12+ minimum (22.23.4+ from Astro 7.4.2), Vite 8 / Zod 4, release 2026-06-22, and `npx @astrojs/upgrade`; noted legacy content-collections support was removed in Astro 6 (`legacy.collections` flag gone); added official v6/v7 upgrade-guide links | docs.astro.build (content collections guide + API reference, v6 + v7 upgrade guides), astro.build/blog/astro-740 (Node floor), astro.build/blog/astro-720 |
| hugo | Verified | Binary editions; LibSass/Dart Sass; `hugo.toml`; Go template functions (`.Paginate`, `.Resize`, `partial`); page bundles; `hugo server -D`; `hugo --minify`; RSS/sitemap | **Fixed:** skill required "the extended edition for Sass/SCSS support" — the **extended edition was removed in Hugo v0.170.0** (2026-11-13) along with LibSass (deprecated since v0.153.0). Corrected the frontmatter `compatibility` line and Prerequisites: single Hugo binary (current 0.170.x); Sass now needs a separate Dart Sass install (default and only `css.Sass` transpiler; `transpiler: "libsass"` now errors; Snap/Docker bundle Dart Sass, archives do not); `hugo.IsExtended` always `false`, `hugoVersion.extended` deprecated; WebP needs no extended edition since 0.153.0. Added a Common Mistake | gohugo.io/news (v0.170.0 2026-11-13, v0.170.1 2026-11-17), discourse.gohugo.io (v0.170.0 release thread, LibSass deprecation thread, maintainer answers), pkg.go.dev (hugoVersion.extended deprecation) |
| react | Verified | React 19 currency; hooks (`useState`, `useEffect`, `useActionState`, `use`); rules of hooks; keys; controlled forms; `dangerouslySetInnerHTML`; `Suspense`/`lazy`; server components | Added version notes: React 19.2 (Oct 2025) added `<Activity>` and `useEffectEvent` (with rules: only called inside effects, never passed as props); `useActionState` is the React 19 name imported from `react` (canary-era `useFormState` from `react-dom` deprecated). **Fixed:** Common Mistake referenced "set-state-after-unmount warnings" — React removed that warning in 18; reworded to state updates after unmount. Node line updated (see below) | react.dev (React 19 release post), LogRocket / Certificates.dev / Scrimba (19.2 corroboration: `<Activity>`, `useEffectEvent`, 19.3.1 latest patch), nextjs.org v15 upgrade guide (`useFormState` deprecation) |
| shadcn-ui | Verified | CLI commands (`init`/`add`); `components.json`; `cn` utility; Radix primitives; `class-variance-authority`; theme variables; `asChild`; `sonner` | **Fixed broken Tailwind v4 theme example:** the skill defined bare `:root` variables with no `@theme inline` mapping — in Tailwind v4 that generates **no** `bg-background`/`text-foreground` utilities. Example now includes `@theme inline` mapping, `@custom-variant dark (&:where(.dark, .dark *))` for the class-based dark toggle, and OKLCH values matching the current CLI scaffold. Added an Implementation Standards bullet and a Common Mistake for the missing mapping. Softened the `init` prompt description (prompts vary by CLI version; added `--help` pointer). Added the official CLI reference link. Node line updated | ui.shadcn.com/docs/cli (official CLI reference), v3.shadcn.com/docs/tailwind-v4 (official Tailwind v4 migration: `@theme inline`, OKLCH), tailwindcss.com/docs/dark-mode (`@custom-variant`) |
| tailwind-css | Verified | v4 CSS-first config (`@theme`, `@import "tailwindcss"`); dark-mode default; `@custom-variant`; important-modifier syntax; `not-*`/`group`/`peer` variants; scanner behavior; `@apply` | No technical errors found. Dark-mode default (`prefers-color-scheme`, `@custom-variant dark (&:where(.dark, .dark *))` for a class toggle), trailing-`!` important modifier, and v3-config-ignored guidance all confirmed against official docs. Only change: Node line updated (see below) | tailwindcss.com/docs (dark mode, installation, upgrade guide) |
| javascript | Verified | ES modules, async/await, `fetch`/`response.ok`, `AbortController`, `structuredClone`, `Map`/`Set`, event delegation, `postMessage` origin checks, SRI, `localStorage` secret guidance, debounce example | No technical errors found. Only change: Node line updated (see below) | developer.mozilla.org (JavaScript reference), tc39.es/ecma262, nodejs.org/en/docs |
| html | Verified | Doctype/charset/viewport/lang; single-`h1` and heading-order guidance; void elements; labels/`name`; `alt`; `scope`/`caption`; `rel="noopener"`; `loading="lazy"`; `sandbox`; escaping rules | No technical errors found. Added a short note to Official Documentation: HTML is a living standard with no version numbers (no "HTML6"); newer elements/attributes are a browser-support question | html.spec.whatwg.org, developer.mozilla.org (HTML), validator.w3.org |
| css | Verified | Cascade/specificity, box-sizing reset, flexbox/grid, custom properties, logical properties, `gap`, `:focus-visible`, `rem`/`em`, animation guidance, `expression()`/`behavior` warning | No technical errors found. Added a short note to Official Documentation: CSS has no version numbers — modules advance independently, so readiness is a browser-support question | developer.mozilla.org (CSS), w3.org/Style/CSS, caniuse.com |
| modern-css | Verified | Cascade layers (`@layer`, unlayered-beats-layered), container queries (`container-type: inline-size`), nesting, `:has()`, logical properties, `oklch()`/`color-mix()`, `clamp()`, `@scope`, `light-dark()`, `@supports (selector(:has(*)))` | No technical errors found. All claims are correctly stated with support caveats (`@scope` "where supported", `light-dark()` fallback required, Can I Use checks in the workflow). No changes made | developer.mozilla.org (CSS), caniuse.com, w3.org/Style/CSS |
| semantic-html | Verified | Landmarks (`header`/`nav`/`main`/`aside`/`footer`), `article` vs `section`, `figure`/`figcaption`, `time`/`datetime`, `address`, `dl`/`dt`/`dd`, `details`/`summary`, implicit ARIA roles | No technical errors found. No changes made | html.spec.whatwg.org/multipage/sections.html, developer.mozilla.org (HTML elements), w3.org/TR/html-aria |
| accessibility | Verified | WCAG 2.2 AA target (contrast 4.5:1 / 3:1, target size, 200% zoom, 320px width); ARIA rules; focus management; live regions; `prefers-reduced-motion`; skip link example | No errors found. Strengthened one bullet with the verified criterion number: touch-target minimum is WCAG 2.2 AA success criterion 2.5.8 (24×24 CSS px, with a spacing exception); 44×44 remains the practical target | w3.org/WAI/WCAG22/quickref, w3.org/TR/WCAG22/#target-size-minimum (SC 2.5.8 AA 24×24; SC 2.5.5 AAA 44×44), w3.org/WAI/ARIA/apg, developer.mozilla.org (Accessibility) |
| responsive-design | Verified | Mobile-first/`min-width` queries; content-driven breakpoints; `clamp()`; `srcset`/`sizes`; viewport meta; 200% zoom; `auto-fit`/`minmax()` grid | **Fixed attribution:** the skill said 44×44 CSS px touch targets were "(WCAG guidance)". The WCAG 2.2 **AA** minimum is 24×24 (SC 2.5.8); 44×44 is the **AAA** enhanced target (SC 2.5.5) and the iOS/Android platform guideline. 44×44 is kept as the practical target, now correctly attributed | developer.mozilla.org (media queries, responsive design), web.dev/learn/design, w3.org/TR/WCAG22 (SC 2.5.5 / 2.5.8) |
| frontend-performance | Verified | Core Web Vitals thresholds (LCP/INP/CLS); TTFB; `fetchpriority`; lazy loading; `font-display: swap`; `content-visibility`; code splitting; preconnect/preload | No errors found. Added the verified assessment basis to the CWV bullet: thresholds are assessed at the 75th percentile of real-user field data (CrUX) over a 28-day window | web.dev (Core Web Vitals), developer.mozilla.org (Web Performance), pagespeed.web.dev |
| ui-design | Verified | Hierarchy/spacing/type-scale/color guidance; WCAG AA contrast values; 44×44 touch targets; form, button, navigation, feedback patterns; dark-pattern and error-message guidance | No technical errors found (design guidance, no version-specific claims; the WCAG AA contrast values it cites were verified under `accessibility`). No changes made | lawsofux.com, nngroup.com/articles, m3.material.io, developer.mozilla.org (CSS) |

## Cross-cutting fix: Node.js LTS line

Seven skills stated "Node.js 24 LTS installed (current LTS line as of
2026-11-20)". Per the official Node.js release schedule (nodejs.org,
checked 2026-11-20), **Node.js 26 is the newest LTS line** (LTS since
October 2026); 24 and 22 remain in LTS and 25 is EOL. The claim was
corrected in the Prerequisites of `nextjs`, `react`, `astro`,
`tailwind-css`, `shadcn-ui`, `typescript`, and `javascript` to
"Node.js 24 LTS or 26 LTS (26 is the newest LTS line as of 2026-11-20;
24 and 22 remain in LTS)". Frontmatter `compatibility` lines saying
"Requires Node.js 24 LTS" were left as-is: 24 is still a supported LTS
line, so the requirement is not false.

## H-04 — Next.js fetch-caching finding (detail)

- **Claim in skill (before):** "`fetch` requests in server components are
  cached unless opted out" (`skills/frontend/nextjs/SKILL.md`, ~line 101).
- **What the official docs say:** Next.js 15 reversed the default. The
  official v15 upgrade guide states: "`fetch` requests are no longer
  cached by default. To opt specific `fetch` requests into caching, you
  can pass the `cache: 'force-cache'` option. To opt all `fetch` requests
  in a layout or page into caching, you can use the
  `export const fetchCache = 'default-cache'` segment config option."
  The caching guide confirms: "By default, `fetch` requests are not
  cached. You can cache individual requests by setting the `cache`
  option to `'force-cache'`." `GET` route handlers are likewise uncached
  by default since 15. In Next.js 14 the old statement was true; since
  15 it is false, and the skill targets Next.js 16.
- **What was changed:** the caching bullet now states the correct default,
  the 14-vs-15+ version boundary, and the correct opt-in mechanisms
  (`cache: 'force-cache'`, `next: { revalidate }`, `fetchCache =
  'default-cache'`, plus `'use cache'`/`cacheLife` under Cache Components
  in 16). The worked example's `next: { revalidate: 3600 }` was annotated
  to explain it is an explicit opt-in, and two Common Mistakes were added
  (assuming cached-by-default; calling request APIs synchronously).

## Files changed (13)

- `skills/frontend/nextjs/SKILL.md` (+64/−, H-04 fix + proxy + async APIs)
- `skills/frontend/shadcn-ui/SKILL.md` (Tailwind v4 `@theme inline` fix)
- `skills/frontend/typescript/SKILL.md` (TS 5.x → 7.x, deprecated options)
- `skills/frontend/astro/SKILL.md` (`astro/zod` import, Node floor)
- `skills/frontend/hugo/SKILL.md` (extended edition / LibSass removed)
- `skills/frontend/react/SKILL.md` (19.2 APIs, `useFormState` rename)
- `skills/frontend/accessibility/SKILL.md` (SC 2.5.8 citation)
- `skills/frontend/css/SKILL.md` (no-version note)
- `skills/frontend/frontend-performance/SKILL.md` (75th-percentile basis)
- `skills/frontend/html/SKILL.md` (living-standard note)
- `skills/frontend/javascript/SKILL.md` (Node LTS line)
- `skills/frontend/responsive-design/SKILL.md` (44×44 attribution)
- `skills/frontend/tailwind-css/SKILL.md` (Node LTS line)

Unchanged (verified correct, no fixes needed): `modern-css`,
`semantic-html`, `ui-design`.

## Blockers

None. All official documentation needed for verification was reachable.
Two items were deliberately left unasserted because they rest only on
secondary sources and were not needed for any fix: the exact React
Compiler 1.0 stable status, and the shadcn/ui CLI v4 prompt details
beyond the softened "prompts vary by CLI version" wording.
