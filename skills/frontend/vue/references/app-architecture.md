# App architecture: routing, state, data fetching, SSR

- Routing (Vue Router 5): create the router with `createRouter`
  and `createWebHistory()` for clean URLs (the server must serve
  `index.html` for unknown paths); use `createWebHashHistory()`
  only when the server cannot do that. Lazy-load route components
  with dynamic `import()`. Use navigation guards
  (`beforeEnter`, global `beforeEach`) for auth checks, and
  `definePage` file-based routing (via the `vue-router/vite`
  plugin) when the project prefers routes from the file tree.
  Experimental data loaders (`vue-router/experimental`) fetch
  route data before render; treat them as experimental and check
  the docs before relying on them.
- State (Pinia 4): define stores with `defineStore`, preferring
  the setup syntax (a function returning refs, computeds, and
  functions) for consistency with the Composition API. Destructure
  state and getters with `storeToRefs()` to keep reactivity; take
  actions straight from the store. Keep stores focused per domain
  (auth, cart, settings). Pinia 4 is ESM-only and requires
  `@vue/devtools-api` installed alongside it.
- Data fetching: fetch through a typed API layer or composable,
  never ad-hoc in templates. Handle non-OK statuses, network
  failure, and cancellation. For cached server state with retries
  and background refetch, use TanStack Query's Vue adapter
  (`@tanstack/vue-query`).
- SSR concepts: Vue itself renders on the server with
  `@vue/server-renderer`, but hand-rolled SSR is rarely worth it —
  use `nuxt` when SSR, SSG, or hybrid rendering is required.
  Server-rendered apps must avoid browser-only APIs during render
  and keep per-request state out of module scope.
