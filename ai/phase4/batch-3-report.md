# Phase 4 — Batch 3 Report: Frontend Frameworks

- **Date:** 2026-11-20
- **Batch:** 3 (react-native, expo, sveltekit, vue, nuxt)
- **Branch:** `feat/skillforge-production-upgrade`
- **Status:** Complete — 5 new skills written, all passing filtered validation.

## Skills written

| Skill | Directory | Lines | Description |
| --- | --- | --- | --- |
| `react-native` | `skills/frontend/react-native/` | 359 | Bare React Native 0.88 (Community CLI): navigation, state, data fetching, native modules, performance, accessibility, testing, store releases. |
| `expo` | `skills/frontend/expo/` | 370 | Expo SDK 58: managed workflow, Expo Router, EAS Build/Update/Submit, config plugins, dev builds vs Expo Go, push notifications, deployment. |
| `sveltekit` | `skills/frontend/sveltekit/` | 367 | SvelteKit 3 on Svelte 5: routing, load functions, form actions, SSR/prerendering, runes, adapters, deployment. |
| `vue` | `skills/frontend/vue/` | 369 | Vue 3.5: Composition API, reactivity, components, Vue Router 5, Pinia 4, data fetching, SSR concepts, testing, build/deployment. |
| `nuxt` | `skills/frontend/nuxt/` | 353 | Nuxt 4.6: file-based routing, server routes, `useFetch`/`useAsyncData`, SSR/SSG/hybrid rendering, modules, state, deployment with Nitro. |

All five follow `templates/SKILL-TEMPLATE.md` exactly (15 sections in
order), use the standard frontmatter (name = directory name,
`license: MIT`, metadata version `1.0.0`, category `frontend`,
maintainer `skills-library`, source `original`, `last_verified:
"2026-11-20"`), keep version info in the body only, and cross-reference
related skills by backticked name, never file paths. Each SKILL.md is
under 500 lines; no `references/` subdirectories were needed.

## Official sources consulted per skill

Research used the official-docs hierarchy. Verification was done via
`browser.search` against official domains; `browser.open` was
rate-limited (HTTP 429 from the browser service) during this batch, so
page fetches could not be completed — every URL below was returned
verbatim by search results from the official domain and its content
confirmed in the returned snippets. The coordinator may re-verify with
`browser.open` if desired.

### react-native

- React Native 0.88 release notes (reactnative.dev blog, 2026-10-19):
  0.88 is the current stable release; ships React 19.3 and Metro 0.87;
  0.85.x unsupported.
- React Native 0.84/0.85/0.86 release notes (reactnative.dev blog):
  0.84 requires Node.js v22.11+; Hermes V1 is the default engine.
- Get Started Without a Framework (reactnative.dev/docs/
  getting-started-without-a-framework): Community CLI init command;
  framework recommendation.
- Environment setup (reactnative.dev/docs/environment-setup/).
- React Navigation 7.x getting started
  (reactnavigation.org/docs/7.x/getting-started/): static
  configuration is the recommended API; native stack navigator.

### expo

- Expo SDK 58 changelog (expo.dev/changelog/sdk-58): SDK 58 released
  2026-10-15, built for iOS 27, ships React Native 0.88.
- Expo SDK 57 changelog (expo.dev/changelog/sdk-57): SDK 57 ships
  React Native 0.86; SDK release cadence and lifetime notes.
- How to upgrade to SDK 58 (expo.dev/blog/how-to-upgrade-to-sdk-58):
  `npx expo install expo@^58.0.0 --fix`, `npx expo-doctor@latest`,
  SDK 58 includes the React Native 0.87 and 0.88 changes.
- Create a project (docs.expo.dev/get-started/create-a-project/) and
  tutorial (docs.expo.dev/tutorial/create-your-first-app/):
  `npx create-expo-app@latest`, SDK version prompt, Node.js LTS.
- Expo Services (docs.expo.dev/eas/) and EAS CLI reference
  (docs.expo.dev/eas/cli/): services renamed Expo Build/Submit/
  Update; CLI still `eas`, config still `eas.json`.
- Expo Router introduction (expo.github.io/router/docs/intro/) and
  navigation guide (docs.expo.dev/develop/app-navigation/).
- Push notifications: `expo-notifications` reference
  (docs.expo.dev/versions/latest/sdk/notifications/) — remote push
  unavailable in Expo Go on Android from SDK 53, dev build required;
  sending guide (docs.expo.dev/push-notifications/
  sending-notifications/); services guide
  (docs.expo.dev/guides/using-push-notifications-services/).
- Environment variables usage (docs.expo.dev/eas/environment-
  variables/usage/): `--environment` flag required for `eas update`
  since SDK 55; `EXPO_PUBLIC_` inlining.
- Publishing websites (docs.expo.dev/guides/publishing-websites/):
  `web.output` targets (`single`/`static`/`server`), `apiRoutes`
  plugin option in SDK 58+.

### sveltekit

- SvelteKit 3 announcement (svelte.dev/blog/sveltekit-3-is-here):
  SvelteKit 3 released 2026-10-01; config in `vite.config.ts`;
  `$lib` → `#lib`; `sv create`; `sv migrate`.
- Migrating to SvelteKit 3
  (svelte.dev/docs/kit/migrating-to-sveltekit-3): minimums Node
  v22.17, TypeScript v6, Svelte v5.57.1, Vite v8.0.12,
  `@sveltejs/vite-plugin-svelte` v7; `svelte.config.js` no longer
  supported; `#lib` via `package.json` `imports`; `$app/environment`
  renamed `$app/env`; `npx sv migrate sveltekit-3`.
- Routing (svelte.dev/docs/kit/routing): filesystem router, `+page`,
  `+page.server`, layouts, `load` functions.
- Project types (svelte.dev/docs/kit/project-types): SSR default,
  SSG, SPA, serverless.
- Adapters (svelte.dev/docs/kit/adapters) and the `sv` adapter
  add-on docs (svelte.dev/docs/cli/sveltekit-adapter): official
  adapters (auto, node, static, vercel, netlify, cloudflare, bun);
  adapter configured in the `sveltekit()` Vite plugin.
- What's new in Svelte, October 2026
  (svelte.dev/blog/whats-new-in-svelte-october-2026): `sv` 1.0,
  SvelteKit 3 launch context.

### vue

- Vue quick start (vuejs.org/guide/quick-start): Node.js
  `^22.18.0 || >=24.12.0`; `npm create vue@latest` (create-vue);
  Vite-based scaffolding; TypeScript, Router, Pinia, Vitest options.
- Vue documentation (vuejs.org): official guide and API reference.
- Vue Router guide (router.vuejs.org/guide/): official router docs.
- Pinia state (pinia.vuejs.org/core-concepts/state.html) and Pinia
  API reference (pinia.vuejs.org/api/pinia/): `defineStore`,
  `createPinia`, store APIs.
- Version status (secondary, corroborated across several sources):
  Vue 3.5 is the stable line (3.5.46 published 2026-11-20 per npm
  registry data via endoflife.date and deps.dev); Vue 3.6 with
  opt-in Vapor Mode is in release candidate (3.6.0-rc.16 as of
  2026-11-20); Vue Router 5 released January 2026 (5.5.1 as of
  2026-11-13) with file-based routing merged from
  `unplugin-vue-router` and experimental data loaders; Pinia 4
  released July 2026 (4.1.x), ESM-only, requires
  `@vue/devtools-api` alongside.

### nuxt

- Introduction to Nuxt 4
  (nuxt.com/docs/4.x/getting-started/introduction): conventions,
  `app/` directory, SSR by default, `nuxt generate`, `routeRules`.
- useFetch (nuxt.com/docs/4.x/api/composables/use-fetch): wrapper
  around `useAsyncData` and `$fetch`, auto-generated keys, payload
  transfer, `createUseFetch`, `lazy` behavior.
- Nuxt 4.6 release notes (nuxt.com/blog/v4-6): Nuxt 4.6 (2026-10-05),
  CLI v4 (`@nuxt/cli` v4, Node v22.21+/v24.11+/v26+), `nuxt init`
  dropped in favor of `npm create nuxt@latest`, `nuxt/server`
  import surface, Nuxt 3 end of life 2026-07-31.
- Nuxt server directory docs (nuxt.com/docs/5.x/directory-structure/
  server, consulted for the `defineHandler` API also present in
  4.6 via `nuxt/server`): `server/api/` and `server/routes/`,
  `defineHandler` from `nuxt/server`, method suffixes, `#server`
  alias.
- Data fetching guide (nuxt.com/docs/5.x/getting-started/
  data-fetching): `useFetch`/`useAsyncData`/`$fetch` roles.
- Version status: Nuxt 4.6.4 (2026-11-02) is the latest stable, a
  security release fixing eight advisories plus three more via
  nitropack 2.13.6 (nuxt/nuxt GitHub release, corroborated by
  endoflife.date/nuxt); Nuxt 3.21.11 (2026-08-05) was the final 3.x
  release.

## Validation output

Each skill validated individually from the repo root (filtered
validation only, per batch rules; unfiltered validate and registry
regeneration are the coordinator's job):

```text
=== react-native ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== expo ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== sveltekit ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== vue ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== nuxt ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

No errors, no warnings. All five files are under 500 lines
(353–370 lines each). No commits, pushes, merges, PRs, or branch
switches were made; `skills/upstream/` and all directories outside
this batch's assignment were untouched.

## Decisions and notes

- **Current-stable versions (verified 2026-11-20):** React Native
  0.88, Expo SDK 58, SvelteKit 3 (on Svelte 5.57+), Vue 3.5 (3.6 is
  RC — skills say not to use it for production unless asked), Nuxt
  4.6.4. Where a minor/patch moves weekly, the skill names the
  verified version and says not to assume a minor version.
- **SvelteKit 3 is a real breaking major:** config moved from
  `svelte.config.js` to the `sveltekit()` Vite plugin, `$lib`
  became `#lib`, `$app/environment` became `$app/env`, and
  `$app/stores` was removed. The skill is written for SvelteKit 3
  only, with migration pointers for 2.x projects. One official
  Svelte doc page (`svelte.dev/llms-small.txt`) still shows the old
  `svelte.config.js`/`$lib` setup; the migration guide (authoritative
  and current) was followed instead.
- **Expo vs React Native split:** the `react-native` skill covers the
  bare Community CLI workflow and points new projects at `expo`
  (matching the React Native team's own recommendation); the `expo`
  skill covers the managed workflow, EAS, and Expo Router. Neither
  duplicates the other.
- **Expo Router / React Navigation:** Expo Router has been decoupled
  from React Navigation since SDK 56; the `expo` skill therefore
  does not teach React Navigation, while `react-native` teaches
  React Navigation 7 (static configuration API).
- **Nuxt 3 end of life:** the `nuxt` skill states plainly that Nuxt
  3 is end of life (2026-07-31) and receives no security fixes,
  including for advisories fixed in 4.6.4.
- **Verification caveat:** `browser.open` returned HTTP 429 (browser
  service rate limit) for the two release pages attempted, and was
  not retried per the rate-limit rule. All linked URLs were returned
  verbatim by `browser.search` from official domains with confirming
  content in the snippets; no URL was constructed from a domain.
  `https://vuejs.org/guide/quick-start` was returned as `http://`
  and is linked as `https://` (the canonical scheme; the site
  redirects).
- **Cross-references:** skills reference `react`, `nextjs`,
  `typescript`, `accessibility`, `frontend-performance`,
  `unit-testing`, `vitest`, and `playwright`, all of which exist in
  the repo (verified in `skills/`).
