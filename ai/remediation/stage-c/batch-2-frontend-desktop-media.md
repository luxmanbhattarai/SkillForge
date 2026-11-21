# Stage C — Batch 2: Frontend / Desktop / Media Audit

**Batch:** 2 of the Stage C audit of the 51 Phase 4 (new) skills.
**Skills:** 12 — frontend: `expo`, `nuxt`, `react-native`, `sveltekit`, `vue`;
desktop: `electron`, `rust`, `tauri`; media: `platform-social-images`,
`resvg`, `satori`, `sharp`.
**Audited:** 2026-11-20, against current official docs (pages crawled
2026-11-20/21). Method: Phase 3 rigor per
`ai/audits/TECHNICAL-ACCURACY-AUDIT.md`; 22-element standard per
`docs/SKILL-STANDARDS.md`. Evidence hierarchy: official product docs >
official API refs > official GitHub repos/release notes > official
migration guides > recognized standards > reputable secondary sources.
**Branch:** `feat/skillforge-production-upgrade`, local working-tree edits
only, uncommitted. No files outside the 12 skill directories were
modified except this fragment.

## Matrix

| Skill | Category | Status | Findings (by severity) | Fixes applied | Recommended verification status |
| --- | --- | --- | --- | --- | --- |
| expo | frontend | FIXED | 0 Critical, 0 High, 0 Medium, 2 Low, 1 Informational | Node.js requirement corrected to SDK 58 ranges; "Expo Services" wording; Accessibility subsection added | verified |
| nuxt | frontend | FIXED | 0 Critical, 0 High, 2 Medium, 2 Low, 0 Informational | Node.js engines range corrected; `createError` example fixed to `status`/`statusText`; route-params prose fixed; Accessibility bullet expanded into subsection | verified |
| react-native | frontend | FIXED | 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational | Accessibility subsection added | verified |
| sveltekit | frontend | FIXED | 0 Critical, 0 High, 0 Medium, 3 Low, 0 Informational | Svelte minimum corrected to 5.56.4; `#lib` file-extension requirement noted; Accessibility subsection added | verified |
| vue | frontend | FIXED | 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational | Accessibility subsection added | verified |
| electron | desktop | FIXED | 0 Critical, 0 High, 0 Medium, 2 Low, 0 Informational | Async `safeStorage` methods recommended (sync deprecated in 45, removed in 46); Accessibility subsection added | verified |
| rust | desktop | FIXED | 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational | Accessibility N/A statement added (with reason) | verified |
| tauri | desktop | FIXED | 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational | Accessibility subsection added | verified |
| platform-social-images | media | FIXED | 0 Critical, 0 High, 0 Medium, 0 Low, 1 Informational | Discord figures now verified directly against official docs; Discord Link Previews / Embed Debugger link added | verified-with-limitations — Meta's sharing documentation returned 403 during verification, so the Facebook figures rest on the `og-image-generation` skill plus secondary corroboration; X's figures come from its last published card specification (archived January 2026) after the Card Validator was retired |
| resvg | media | PASS | none | none | verified |
| satori | media | FIXED | 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational | Accessibility subsection added | verified |
| sharp | media | FIXED | 0 Critical, 0 High, 0 Medium, 1 Low, 0 Informational | Accessibility subsection added | verified |

## Findings detail

Line numbers are post-edit locations in the working copy.

### expo — FIXED (2 Low, 1 Informational)

- **Low — Node.js requirement imprecise.**
  Evidence: `skills/frontend/expo/SKILL.md:56` said "Node.js 22 LTS or
  newer", which admits Node 22.0–22.12 and odd releases 23/25. The
  official SDK 58 changelog states: "Expo tooling now requires Node.js
  22.13 or newer on the 22 line, 24.3 or newer on the 24 line, or
  Node.js 26 and later. Odd-numbered releases such as 23 and 25 are not
  supported" (https://expo.dev/changelog/sdk-58).
  Fix: Prerequisites and `compatibility` (L17) now state the exact
  ranges and the odd-release exclusion.
- **Informational — Stale "Expo Application Services (EAS)" branding.**
  Evidence: `skills/frontend/expo/SKILL.md:27`. Official Expo docs
  pages are now titled "Expo Services" (e.g.
  https://docs.expo.dev/eas/environment-variables); the `eas` CLI and
  `eas.json` are unchanged.
  Fix: reworded to "Expo Services (EAS)".
- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/frontend/expo/SKILL.md` had no Accessibility
  subsection in Implementation Standards; element 14 requires one
  where applicable.
  Fix: added `### Accessibility` (L165) covering accessible names and
  roles, system settings (reduced motion, font scaling), and 44x44pt
  touch targets with VoiceOver/TalkBack testing.
- Verified correct: SDK 58 released 2026-10-15, built for iOS 27, ships
  React Native 0.88; `apiRoutes: true` combines static rendering with
  API routes (SDK 58+); remote push unavailable in Expo Go on Android
  from SDK 53; `eas update --environment` required since SDK 55.

### nuxt — FIXED (2 Medium, 2 Low)

- **Medium — Node.js requirement understated.**
  Evidence: `skills/frontend/nuxt/SKILL.md:52` (Prerequisites) and
  `compatibility` (L17) said Node.js v22.21+, v24.11+, or v26+ "(the
  Nuxt CLI v4 requirement)". The official Nuxt 4.6 blog states that
  floor for the *CLI*, but the `nuxt@4.6.4` package manifest itself
  declares `engines.node: ^22.22.3 || ^24.15.0 || >=26.0.0` (package
  manifest via javascriptlibraries.com and the
  `@nuxt/vite-builder@4.6.3` manifest; also stated at vuejs.school).
  A user on Node 22.21/24.11 per the skill would fail the framework's
  own engines check.
  Fix: both locations now state `^22.22.3, ^24.15.0, or >=26.0.0`,
  noting the CLI floor is lower.
- **Medium — `createError` example uses wrong option names.**
  Evidence: `skills/frontend/nuxt/SKILL.md:326` called
  `createError({ statusCode: 400, statusMessage: ... })` — the h3 v1
  shape. The official Nuxt 4.6 blog states `nuxt/server`'s
  `createError` takes `status` and `statusText`
  (https://nuxt.com/blog/v4-6).
  Fix: example now uses `{ status: 400, statusText: 'Invalid article
  id.' }`.
- **Low — Prose contradicts its own example on route params.**
  Evidence: `skills/frontend/nuxt/SKILL.md:134` said dynamic
  parameters "are read via `event.context.params`" (h3-specific),
  while the skill's own example uses `getRouterParam(event, 'id')`.
  Official `nuxt/server` docs list `getRouterParam`/`getRouterParams`
  as the way to read dynamic segments
  (https://nuxt.com/docs/4.x/guide/going-further/server-imports).
  Fix: prose now says params are read with `getRouterParam` /
  `getRouterParams` from `nuxt/server`.
- **Low — Accessibility element (standard #14) incomplete.**
  Evidence: the skill had only an Accessibility bullet (about
  `useAnnouncer`/`NuxtAnnouncer`), not a subsection.
  Fix: bullet expanded into `### Accessibility` (L164) with the
  announcer guidance plus semantic HTML, focus management on route
  changes, and WCAG 2.2 AA contrast.
- Verified correct: 4.6.4 security release 2026-11-02 (8 Nuxt
  advisories + 3 Nitro via nitropack 2.13.6); Nuxt 3 EOL 2026-07-31;
  `nuxt init` dropped in CLI v4; `nuxt/server` ships from Nuxt 4.6
  with `defineHandler` (`defineEventHandler` alias) and
  `getRouterParam`; `useAnnouncer`/`<NuxtAnnouncer>` in Nuxt 4.4.2+;
  Vite 8 in Nuxt 4.5; Vue Router 5 in Nuxt 4.4.

### react-native — FIXED (1 Low)

- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/frontend/react-native/SKILL.md` had no
  Accessibility subsection in Implementation Standards.
  Fix: added `### Accessibility` (L154) covering accessibility props
  and grouping, Dynamic Type / reduced motion, and 44x44pt touch
  targets with VoiceOver/TalkBack testing.
- Verified correct: 0.88 released 2026-10-19, ships React 19.3.0 and
  Metro 0.87 (minimum 0.87.1), no user-facing breaking changes, 0.85.x
  now unsupported (https://reactnative.dev/blog/2026/10/19/react-native-0.88);
  "React Native 0.84 and later require Node.js v22.11 or newer"
  confirmed by the official 0.84 blog
  (https://reactnative.dev/blog/2026/02/11/react-native-0.84).

### sveltekit — FIXED (3 Low)

- **Low — Svelte minimum version wrong.**
  Evidence: `skills/frontend/sveltekit/SKILL.md:54` (Prerequisites)
  and `compatibility` (L17) said Svelte v5.57.1 / 5.57 or newer. The
  official SvelteKit 3 migration guide lists the minimum as Svelte
  v5.56.4 (https://svelte.dev/docs/kit/migrating-to-sveltekit-3).
  Fix: corrected to 5.56.4 in both locations.
- **Low — `#lib` file-extension gotcha omitted.**
  Evidence: `skills/frontend/sveltekit/SKILL.md:115` said `$lib` is
  replaced by `#lib` but never mentioned that `#lib` subpath imports
  require explicit file extensions (`#lib/foo.ts` or
  `#lib/foo/index.ts`); importing `#lib/foo` fails. Per the official
  migration guide (same URL as above).
  Fix: added the extension requirement to the Imports bullet (L117).
- **Low — Accessibility element (standard #14) missing.**
  Evidence: no Accessibility subsection in Implementation Standards.
  Fix: added `### Accessibility` (L167) covering semantic HTML and
  native elements, focus management on navigation, `aria-live`, and
  WCAG 2.2 AA contrast.
- Verified correct: SvelteKit 3.0 shipped 2026-10-01; config moved
  into the `sveltekit()` Vite plugin, `svelte.config.js` no longer
  read; `$lib` → `#lib`, `$app/environment` → `$app/env`,
  `$app/stores` removed; minimums Node 22.17, TypeScript 6, Vite
  8.0.12, `@sveltejs/vite-plugin-svelte` v7;
  `npx sv migrate sveltekit-3`.

### vue — FIXED (1 Low)

- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/frontend/vue/SKILL.md` had no Accessibility
  subsection in Implementation Standards.
  Fix: added `### Accessibility` (L157) covering semantic HTML and
  native elements, keyboard-operable custom controls, focus trapping
  in modals, `aria-*` state bindings, `aria-live`, and WCAG 2.2 AA
  contrast.
- Verified correct: Vue 3.5.46 latest stable patch (published
  2026-11-20); Vue 3.6 in release candidate with opt-in Vapor Mode;
  Pinia 4 released July 2026, latest 4.1.x, ESM-only,
  `@vue/devtools-api` ^8.1.5 a required non-optional peer; Vue Router
  5 released January 2026, current 5.5.x, merges unplugin-vue-router
  into core (`vue-router/vite` plugin, `definePage()`,
  `vue-router/auto-routes`, experimental data loaders in
  `vue-router/experimental`).

### electron — FIXED (2 Low)

- **Low — `safeStorage` recommendation omits the sync deprecation.**
  Evidence: `skills/desktop/electron/SKILL.md:191` recommended
  `safeStorage` generally. The official Electron breaking-changes
  docs state the synchronous methods (`isEncryptionAvailable()`,
  `encryptString()`, `decryptString()`) are deprecated in Electron 45
  and removed in Electron 46, following Chromium's removal of the
  synchronous OSCrypt backend
  (https://www.electronjs.org/docs/latest/breaking-changes).
  Fix: the bullet now recommends the async methods
  (`isAsyncEncryptionAvailable()`, `encryptStringAsync()`,
  `decryptStringAsync()`) and notes the deprecation/removal (L193-195).
- **Low — Accessibility element (standard #14) missing.**
  Evidence: no Accessibility subsection in Implementation Standards.
  Fix: added `### Accessibility` (L211) covering web accessibility for
  the renderer UI (see `accessibility`), keyboard-operable native
  menus/tray/dialogs, screen-reader-key-safe global shortcuts, OS
  high-contrast/reduced-motion settings, and NVDA/VoiceOver testing.
- Verified correct: 45.x current stable (stable 2026-10-20),
  Chromium 156.0.8078.48, Node v24.22.0, V8 15.6; latest 45.4.1
  (2026-11-19); supported majors 43/44/45; latest-three policy;
  8-week cadence. The `forceCodeSigning` claims were checked against
  electron-builder docs and are correct (it fails the build when
  signing is skipped and checks update manifests are signed).

### rust — FIXED (1 Low)

- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/desktop/rust/SKILL.md` had no Accessibility
  subsection; element 14 requires one where applicable, or an N/A
  statement with a reason otherwise.
  Fix: added `### Accessibility` (L196) stating N/A with the reason:
  Rust is a systems language with no UI of its own; accessibility is
  a property of the application built with it and is covered by the
  skill for that layer.
- Verified correct: Rust 1.100.0 released 2026-11-12, stabilizing the
  never type `!`, the core Allocator API, and `DropGuard`; Cargo gains
  unused-dependency warnings and `global-min-publish-age` cooldowns;
  six-week release cadence; only the latest stable is supported.

### tauri — FIXED (1 Low)

- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/desktop/tauri/SKILL.md` had no Accessibility
  subsection in Implementation Standards.
  Fix: added `### Accessibility` (L193) covering web accessibility for
  the webview UI (see `accessibility`), keyboard-operable native
  menus/dialogs, OS high-contrast/reduced-motion settings, and
  NVDA/VoiceOver testing.
- Verified correct: Tauri 2.12.0 released 2026-09-26; MSRV raised to
  Rust 1.90; Windows 7 support dropped; `on_permission_request`
  webview permission handler added; latest patch 2.12.7 (2026-11-18).

### platform-social-images — FIXED (1 Informational)

- **Informational — Discord figures note outdated; Embed Debugger
  unmentioned.**
  Evidence: `skills/media/platform-social-images/SKILL.md:78` said
  Discord's figures came "as reported by secondary sources". The
  figures have now been verified directly against Discord's official
  Link Previews documentation (updated 2026-11-19), which also links
  an official Embed Debugger the skill did not mention
  (https://docs.discord.com/developers/link-previews).
  Fix: added the Discord Link Previews link (with the Embed Debugger)
  to Official Documentation (L70) and updated the compatibility note
  to record direct verification (L80).
- Verified correct (all figures): Discord — `twitter:card`
  `summary_large_image` required for the large layout, title trimmed
  past 70 bytes, description past 350 bytes, 10-second fetch limit
  including image measurement, formats PNG/GIF/JPG/JPEG/WebP/AVIF
  (official Discord docs, same URL); LinkedIn — 1200x627 minimum,
  1.91:1, 5 MB max, under 401 px wide shows as a thumbnail (LinkedIn
  Help, corroborated by multiple secondary sources checked November
  2026); WhatsApp — image under 600 KB, at least 300 px wide, ratio
  4:1 or narrower, tags within the first 300 KB of HTML, ~10-second
  composer window (Meta WhatsApp Business link-previews docs, updated
  2025-11-05, as reported by multiple secondary sources). Remaining
  limitation (pre-existing): Meta's sharing documentation returned
  403 during verification, so Facebook figures rest on the
  `og-image-generation` skill plus secondary corroboration; X's
  figures come from its last published card specification (archived
  January 2026) after the Card Validator was retired.

### resvg — PASS (no findings)

- Verified correct: resvg 0.50.0 current (Arch package built
  2026-11-16; upstream github.com/linebender/resvg); Linebender
  stewardship since October 2024; CLI usage `resvg [OPTIONS]
  <in-svg> <out-png>`, `-c` prints PNG to stdout, `-` reads stdin,
  `-z` zoom (docs.rs resvg 0.50.0 source); `@resvg/resvg-js` 2.6.2
  still current (2024-03-26) and bundling resvg 0.34.0-era rendering
  (resvg-js CHANGELOG; corroborated by a November 2026 article using
  2.6.2 with Satori 0.63.2); resvg-js repo now under the `thx` org.
  Accessibility subsection already present.

### satori — FIXED (1 Low)

- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/media/satori/SKILL.md` had no Accessibility
  subsection in Implementation Standards.
  Fix: added `### Accessibility` (L140) covering alt text at the
  publication point (`alt`, `og:image:alt`), legible contrast at
  WCAG 2.2 AA, and not relying on color alone.
- Verified correct: 0.63.2 current stable; official README confirms
  "Satori uses Taffy to lay out Flexbox, Grid and block layouts",
  experimental `satori/jsx` builtin JSX runtime,
  `satori/experimental` WebGL canvas, and the `layout.wasm`
  standalone build; the Taffy rewrite landed in Satori 0.37.0 via
  PR #841 ("Replace Yoga with Taffy and support `display: block`
  and `display: grid`", merged 2026-10-08);
  `@vercel/og` 1.0.x bundles Satori 0.29.x (Flexbox-only, Yoga).

### sharp — FIXED (1 Low)

- **Low — Accessibility element (standard #14) missing.**
  Evidence: `skills/media/sharp/SKILL.md` had no Accessibility
  subsection in Implementation Standards.
  Fix: added `### Accessibility` (L131) covering alt text at the
  publication point (EXIF/IPTC metadata is not a substitute),
  not burning essential text into images, and WCAG 2.2 AA contrast.
- Verified correct: 0.35.5 current (October 2026), libvips 8.18.7,
  sharp-libvips 1.3.4, librsvg 2.63.2; GHSA-wq5f-xc86-pv6w /
  CVE-2026-96889 librsvg use-after-free fixed in 0.35.5; WebAssembly
  fallback exists in 0.35.x; libvips GIF/TIFF/VIPS decoder flaws in
  versions below 0.35.0; Node >=20.9.0 (Node-API v9).

## Structural checks (all 12 skills)

- All 12 skills have all 15 template sections in order; names match
  directories; frontmatter descriptions 324–580 chars (limit 1024).
- No internal links (none to break); no missing referenced files (each
  skill is a single `SKILL.md`; no `references/`, `examples/`, or
  `scripts/` subdirectories exist for any of them).
- No TODO/FIXME/TBD/lorem-ipsum/placeholders; no curl-pipe-to-shell,
  no `rm -rf /`, no leaked secrets/keys, no prompt-injection vectors
  found; no unnecessary external dependencies; no duplicated skills
  or overlap requiring consolidation in this batch.
- No contradictory instructions found apart from the nuxt route-params
  prose fixed above.

## Validation

Run from the repo root after all edits (2026-11-20):

- `npm run validate` — PASS. Checked 277 skills (228 original,
  49 upstream). 4 warnings, all pre-existing in upstream skills
  outside this batch's scope (placeholder markers in
  `agentic-seo/seo`, `anthropic/doc-coauthoring`,
  `superpowers/writing-plans`; a broken relative link in
  `marketingskills/site-architecture`). No warnings for any of the
  12 batch skills.
- `npm run check:frontmatter` — PASS. Checked frontmatter of
  277 skills.

## Batch totals

- Skills audited: 12
- Status: 11 FIXED, 1 PASS (`resvg`), 0 NEEDS-REVIEW
- Findings: **19 total** — 0 Critical, 0 High, 2 Medium, 15 Low,
  2 Informational
- Fixes applied: 19 (all findings fixed in place; nothing left open)
- Files changed: 11 skill files (all except `resvg`, which had no
  findings), plus this fragment
- Recommended verification status: 11 verified, 1
  verified-with-limitations (`platform-social-images`, Meta 403 /
  X archived spec — pre-existing limitations, unchanged by this audit)
