# Routing, data fetching, server routes

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
  handler defined with `defineEventHandler` imported from `nuxt/server`
  (introduced in Nuxt 4.6; `defineHandler` is the newer name for the
  same helper, available from Nuxt 4.7).
  Handlers may return JSON, a `Promise`, or a `Response`. Suffix
  file names with the method (`.get.ts`, `.post.ts`) to restrict
  it. Dynamic parameters use `[name].ts` and are read with
  `getRouterParam` (or `getRouterParams` for all of them) imported
  from `nuxt/server`. Shared server helpers live in
  `server/utils/` and are auto-imported; import from anywhere in
  `server/` with the `#server` alias. `server/middleware/` runs
  on every request before routes.
