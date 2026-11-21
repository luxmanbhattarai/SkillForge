---
name: nuxt
description: >
  Build full-stack Vue applications with Nuxt 4 using file-based
  routing, server routes, useFetch and useAsyncData, SSR, SSG, and
  hybrid rendering. Use when creating or editing a Nuxt app, adding
  pages, layouts, server API routes, or modules, fetching data,
  configuring route rules and rendering modes, or deploying with
  Nitro.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js ^22.22.3, ^24.15.0, or >=26.0.0 and a Nuxt 4 project.
---

# Nuxt

## Purpose

This skill builds full-stack Vue applications with Nuxt 4: file-based
routing, server-side rendering by default, server API routes powered
by Nitro, SSR-safe data fetching with `useFetch` and `useAsyncData`,
and hybrid rendering controlled per route. It covers the full loop
from scaffolding with `npm create nuxt` to a production deployment.

## When to Use

- Creating a new Nuxt app or adding pages, layouts, and routes.
- Fetching data with `useFetch`, `useAsyncData`, or `$fetch`.
- Building server API routes, server middleware, or server utilities.
- Choosing rendering per route: SSR, prerendering, SWR/ISR, or SPA.
- Adding modules, middleware, plugins, or composables.
- Managing SEO metadata, state, or authentication in a Nuxt app.
- Deploying a Nuxt app to Node, Vercel, Netlify, Cloudflare, or
  static hosting.
- Migrating an app from Nuxt 3 to Nuxt 4.

## When Not to Use

- A client-only Vue SPA with no SSR, server routes, or prerendering:
  use `vue` with Vite.
- A React app: use `react` or `nextjs`.
- A content-only site with no server needs: use `astro` or `hugo`.
- Styling: use `css`, `tailwind-css`, or `shadcn-ui`.

## Prerequisites

- Node.js ^22.22.3, ^24.15.0, or >=26.0.0 (the `nuxt` package
  engines range; the Nuxt CLI v4 floor of v22.21/v24.11 is lower, so
  do not rely on it). Do not assume a minor version.
- A Nuxt 4 project (current major line as of 2026-11-20; latest
  release 4.6.4, a security release from 2026-11-02 — upgrade
  promptly if the project is behind it). Nuxt 4 runs on Vite 8 and
  Vue Router 5. Nuxt 3 reached end of life on 2026-07-31 and
  receives no further fixes; do not start new work on it. New
  projects are created with `npm create nuxt@latest` (`nuxt init`
  was dropped in CLI v4).
- Familiarity with `vue` and `typescript`; Nuxt auto-imports
  composables and components, and generates types for them.
- The deployment target decided (Node server, serverless, edge, or
  static hosting) because it selects the Nitro preset.

## Official Documentation

- [Introduction to Nuxt 4](https://nuxt.com/docs/4.x/getting-started/introduction) —
  what Nuxt is, its conventions, and its rendering modes.
- [useFetch](https://nuxt.com/docs/4.x/api/composables/use-fetch) —
  the data-fetching composable and its options.
- [Nuxt 4.6 release notes](https://nuxt.com/blog/v4-6) — the current
  minor release, CLI v4, and the `nuxt/server` import surface.
- [Vue documentation](https://vuejs.org/) — the component model
  Nuxt builds on.

## Required Workflow

1. Confirm the project is Nuxt 4 (check `nuxt` in `package.json`)
   and on the latest 4.6.x patch; the 4.6.4 security release is the
   minimum to ship. If it is Nuxt 3, plan the migration — no patch
   is coming for Nuxt 3.
2. Map the URL structure to `app/pages/`: each `.vue` file is a
   route, `app/layouts/` wraps routes, and `app/middleware/` guards
   them.
3. Decide data flow per page before writing components: `useFetch`
   for API-backed data, `useAsyncData` for custom async logic,
   `$fetch` only inside event handlers or server code.
4. Build server routes under `server/api/` (prefixed with `/api`)
   or `server/routes/` (no prefix); validate input and authorize
   every request in the handler.
5. Choose rendering per route with `routeRules` in
   `nuxt.config.ts`: prerender content pages, SSR dynamic pages,
   and cache with SWR where stale-while-revalidate is acceptable.
6. Add SEO metadata with `useHead` / `useSeoMeta` on public pages.
7. Run `npm run build` and fix every error; check the build output
   and test the production output with `npm run preview`,
   including navigation, forms, and error pages.

## Implementation Standards

- Nuxt 4 only for new work. The default source directory is `app/`
  (`app/pages/`, `app/layouts/`, `app/components/`,
  `app/composables/`, `app/middleware/`, `app/plugins/`); server
  code lives in `server/`. Do not import Vue app code into
  `server/` or server-only code into the app.
- Routing: file-based, powered by Vue Router 5. Dynamic segments
  use `[id].vue`; optional parameters use `[[id]].vue`; catch-all
  routes use `[...slug].vue`. Nested routes render through
  `<NuxtPage />` in a parent page. Layouts are selected with
  `definePageMeta({ layout: 'name' })`; the default layout is
  `app/layouts/default.vue`. Route middleware (named in
  `app/middleware/`, or inline with `definePageMeta`) runs before
  navigation; global middleware must be registered in
  `nuxt.config.ts`.
- Data fetching: `useFetch(url, options)` wraps `useAsyncData`
  and `$fetch`, generates a request key, and transfers the server
  result to the client in the payload so hydration does not
  refetch. `useAsyncData(key, handler)` gives fine-grained control
  with an explicit key. `await` the call when navigation must wait
  for the data; omit it (or use `lazy: true`) and handle `status`
  and `error` yourself when it must not block. `data`, `status`,
  and `error` are refs. Use `createUseFetch` for a custom
  `useFetch` with preset defaults (base URL, auth headers).
  Never call `useFetch`/`useAsyncData` conditionally or outside
  `setup`, a plugin, or route middleware.
- Server routes: each file under `server/api/` exports a default
  handler defined with `defineHandler` imported from `nuxt/server`
  (introduced in Nuxt 4.6; `defineEventHandler` is an alias).
  Handlers may return JSON, a `Promise`, or a `Response`. Suffix
  file names with the method (`.get.ts`, `.post.ts`) to restrict
  it. Dynamic parameters use `[name].ts` and are read with
  `getRouterParam` (or `getRouterParams` for all of them) imported
  from `nuxt/server`. Shared server helpers live in
  `server/utils/` and are auto-imported; import from anywhere in
  `server/` with the `#server` alias. `server/middleware/` runs
  on every request before routes.
- Rendering: SSR is the default. Prerender with `routeRules` or
  `nuxt generate` for static output; disable SSR globally with
  `ssr: false` only for a pure SPA. Hybrid rendering via
  `routeRules` supports `prerender`, `swr`, `isr`, `cache`,
  `headers`, `redirect`, and `cors` per route pattern.
- State: `useState(key, init)` for SSR-safe shared state (the key
  is required so server and client agree). For larger shared
  state, use Pinia through the official `@pinia/nuxt` module.
  Never keep per-request state in module scope — it leaks between
  requests on the server.
- Modules: add functionality through Nuxt modules in the `modules`
  array of `nuxt.config.ts` (for example `@nuxt/image` for
  optimized images, `@nuxt/content` for file-based content,
  `@pinia/nuxt` for Pinia). Prefer maintained official modules
  over hand-rolled equivalents.
- Configuration: `runtimeConfig` holds secrets (server-only) and
  `runtimeConfig.public` holds values safe for the browser. Never
  put a secret under `public`. `appConfig` holds public,
  build-time configuration.
- SEO: `useHead` for titles and meta, `useSeoMeta` /
  `useServerSeoMeta` for Open Graph and Twitter cards.
- Types: Nuxt generates types for auto-imports, routes, and
  runtime config. Run the typecheck (`nuxt typecheck` or the
  project's typecheck script) in CI.

### Accessibility

- Nuxt 4.4+ ships `useAnnouncer` and the `<NuxtAnnouncer>`
  component for screen-reader announcements of dynamic changes
  (form submissions, search results) that do not trigger
  navigation.
- Use semantic HTML in templates, manage focus on route changes,
  and keep body-text contrast at WCAG 2.2 AA (4.5:1). Test with
  keyboard only and a screen reader.

### Testing Strategy

- Test server routes with `@nuxt/test-utils`: each handler
  under `server/api/` is exercised over HTTP, including its
  method suffix (`.get.ts`, `.post.ts`) and its error
  responses.
- Test data fetching with mocked `$fetch`: `useFetch` and
  `useAsyncData` handle loading, error, and empty states, and
  the server result transfers to the client without a refetch
  on hydration.
- Test rendering per route: SSR pages render on the server,
  prerendered routes are generated at build time, and
  `routeRules` (prerender, swr, isr) apply to the routes they
  name.
- Test hydration explicitly: a page rendered on the server
  hydrates without mismatch warnings, and no per-request state
  leaks between requests through module scope.
- Test journeys end to end with Playwright: navigation,
  middleware guards, and form submissions across the routes
  users actually take, plus the typecheck in CI.

## Best Practices

- Fetch in `setup` with `useFetch`/`useAsyncData` so the server
  renders the data and the client hydrates without refetching;
  reserve `$fetch` for event handlers and mutations.
- Give `useAsyncData` a descriptive key that includes every input
  (for example `['post', id]`); the key is the cache address.
- Use `refresh()` / `execute()` from the fetch result to reload
  after a mutation instead of a full page reload.
- Keep server routes thin: validate, authorize, do the work,
  return. Business logic shared by several routes lives in
  `server/utils/`.
- Prerender what can be prerendered and cache the rest with SWR;
  dynamic rendering on every request costs server time and latency.
- Colocate page-specific components under the page's directory;
  shared components live in `app/components/` and are
  auto-imported.
- Use `definePageMeta` for per-page layout, middleware, and
  `key` — do not reimplement routing behavior in components.
- Test with `@nuxt/test-utils` (Nuxt + Vitest for unit and
  integration tests, Playwright for end-to-end) and use Nuxt
  DevTools to inspect payload, routes, and runtime config.

## Security Considerations

- Keep Nuxt and Nitro current: the 4.6.4 release fixed eight
  advisories in Nuxt and three more in Nitro. Nuxt 3 is end of
  life and will not receive security fixes.
- Validate and authorize in every server route; route rules and
  server middleware are not an authorization boundary, and
  client-side route middleware is trivially bypassed.
- Never put secrets in `runtimeConfig.public`, in `appConfig`, or
  in client code; private `runtimeConfig` values are server-only.
- Sanitize user content before rendering it as HTML; Vue escapes
  interpolated text by default, and `v-html` on untrusted content
  is an XSS hole.
- Set `httpOnly`, `secure`, and `sameSite` on session cookies;
  read them server-side with `useCookie` or the h3 cookie helpers,
  and never store session tokens in `localStorage`.
- Validate `useFetch` responses at runtime before rendering them;
  a typed URL does not make the payload trustworthy.
- Rate-limit public server routes that accept unauthenticated
  input, and validate request bodies, query strings, and route
  parameters on the server.

## Performance Considerations

- Prerender content pages and cache dynamic routes with SWR/ISR
  via `routeRules`; static and cached responses avoid server work
  on every request.
- Avoid refetching on hydration: `useFetch`/`useAsyncData` forward
  server data in the payload, but plain `$fetch` in `setup` runs
  again in the browser.
- Use `@nuxt/image` for responsive, optimized images instead of
  raw `<img>` tags with full-size sources.
- Keep the client bundle small: code-split by route automatically,
  lazy-load heavy components, and avoid importing server-only
  libraries into the app.
- Payload size matters: `useFetch` serializes its result into the
  HTML payload. Use `pick` to transfer only the fields the page
  renders, and `transform` to shape data before serialization.
- Nitro presets affect latency: deploy close to users (edge
  presets) for latency-sensitive apps, and set cache headers on
  prerendered and SWR routes.

## Common Mistakes

- Fetching with plain `$fetch` in `setup` — runs on the server and
  again on the client during hydration. Use `useFetch` or
  `useAsyncData`.
- Calling `useFetch`/`useAsyncData` conditionally or in a nested
  function — they must run in `setup`, a plugin, or route
  middleware.
- Sharing `useFetch` state by calling it twice with the same URL —
  each call site gets its own auto-generated key and its own
  request. Share with an explicit key or a composable.
- Keeping per-request state in module scope — it leaks between
  requests on the server. Use `useState` with a key.
- Importing server code into the app (or app code into `server/`) —
  breaks the build boundary and can leak secrets into the bundle.
- Treating route rules or client middleware as authorization —
  authorize in the server handler.
- Putting secrets in `runtimeConfig.public` — they ship to the
  browser.
- Forgetting to revalidate after a mutation — the page keeps
  showing stale data. Call `refresh()` on the fetch result.
- Staying on Nuxt 3 — it is end of life and receives no security
  fixes, including for advisories already fixed in 4.6.4.
- Using `nuxt init` — it was dropped in CLI v4. Create projects
  with `npm create nuxt@latest`.

## Examples

Page with data fetching and SEO metadata:

```vue
<!-- app/pages/articles/[id].vue -->
<script setup lang="ts">
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: article, status, error } = await useFetch(
  () => `/api/articles/${id.value}`,
  { pick: ['title', 'body'] },
);

useSeoMeta({
  title: () => article.value?.title ?? 'Article',
  description: () => article.value?.body?.slice(0, 160) ?? '',
});
</script>

<template>
  <article v-if="status === 'success' && article">
    <h1>{{ article.title }}</h1>
    <p>{{ article.body }}</p>
  </article>
  <p v-else-if="status === 'pending'">Loading article…</p>
  <p v-else role="alert">Could not load this article.</p>
</template>
```

Server API route with validation:

```ts
// server/api/articles/[id].get.ts
import { defineHandler, getRouterParam, createError } from 'nuxt/server';

export default defineHandler((event) => {
  const id = getRouterParam(event, 'id');
  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    throw createError({ status: 400, statusText: 'Invalid article id.' });
  }
  // Load the article from the database here; 404 when missing.
  return { id, title: 'Example article', body: 'Example body.' };
});
```

Route rules for hybrid rendering:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/articles/**': { swr: 3600 },
    '/admin/**': { ssr: true, headers: { 'Cache-Control': 'private, no-store' } },
  },
});
```

## Validation Checklist

- [ ] `npm run build` passes with zero errors and the typecheck is clean.
- [ ] The project is on Nuxt 4.6.4 or newer.
- [ ] Data flows through `useFetch`/`useAsyncData` in `setup`; no
      page fetches with plain `$fetch` during render.
- [ ] Server routes validate input, authorize requests, and return
      typed responses.
- [ ] No secrets appear in `runtimeConfig.public`, `appConfig`, or
      client code.
- [ ] Loading, empty, and error states exist for data-driven pages.
- [ ] `routeRules` match the intended rendering mode per route, and
      `npm run preview` renders the app as deployed.
- [ ] SEO metadata is present on public pages.

## Expected Deliverables

- A Nuxt 4 application or route changes following the standards
  above, with typed data fetching and server routes.
- A passing production build, with the rendering mode per route
  noted.
- The Nitro preset and deployment target documented.
- A short note on caching and revalidation decisions for
  data-driven routes.

## References

- [Introduction to Nuxt 4](https://nuxt.com/docs/4.x/getting-started/introduction) —
  conventions and rendering modes.
- [useFetch](https://nuxt.com/docs/4.x/api/composables/use-fetch) —
  data fetching.
- [Nuxt 4.6 release notes](https://nuxt.com/blog/v4-6) — CLI v4
  and `nuxt/server`.
- [Vue documentation](https://vuejs.org/) — the component model.
- Related skills in this repository: `vue`, `typescript`,
  `tailwind-css`, `frontend-performance`, `accessibility`, `vitest`,
  `playwright`.
