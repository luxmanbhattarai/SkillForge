---
name: vue
description: >
  Build user interfaces with Vue 3.5 using the Composition API,
  single-file components, Vue Router 5, and Pinia 4. Use when
  creating or editing Vue components, managing reactivity and shared
  state, adding routing, fetching data, writing composables, testing
  with Vitest and Vue Test Utils, or building and deploying a Vue SPA.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js ^22.18.0 or >=24.12.0 and a Vite-based project created with create-vue.
---

# Vue

## Purpose

This skill builds user interfaces with Vue 3.5: single-file
components with `<script setup>`, the Composition API for reactivity
and reusable logic, Vue Router for client-side routing, and Pinia for
shared state. It covers the full loop from scaffolding with
`create-vue` to a production build of a single-page application.

## When to Use

- Creating a new Vue project or adding components to an existing one.
- Managing component state with `ref`, `reactive`, and `computed`.
- Writing composables for reusable logic.
- Adding routing with Vue Router, including lazy routes and guards.
- Managing shared state with Pinia stores.
- Fetching data in components or composables.
- Testing components with Vitest and Vue Test Utils.
- Building and deploying a Vue SPA.

## When Not to Use

- A full-stack app needing SSR, SSG, file-based routing, or server
  routes out of the box: use `nuxt`.
- A React app: use `react` or `nextjs`.
- A content-only site with no interactivity: use `astro` or `hugo`.
- Styling: use `css`, `tailwind-css`, or `shadcn-ui`.

## Prerequisites

- Node.js `^22.18.0 || >=24.12.0` installed (per the official quick
  start). Do not assume a minor version.
- A Vue 3.5 project (current stable line as of 2026-11-20; latest
  patch 3.5.46). Vue 3.6, with opt-in Vapor Mode, is in release
  candidate — do not use it for production work unless asked. Vue 2
  is end of life. New projects are created with
  `npm create vue@latest`, which scaffolds a Vite-based project.
- Vue Router 5 (current major, released January 2026; 5.5.x as of
  November 2026) for routing and Pinia 4 (released July 2026; 4.1.x)
  for state. Vuex is in maintenance mode; do not use it in new code.
- Familiarity with `typescript` for typed projects; the official
  tooling (Vue - Official extension, `vue-tsc`) assumes it.
- The deployment target decided (static hosting, or a server for
  history-mode routing fallbacks) because it affects the router
  history mode.

## Official Documentation

- [Vue quick start](https://vuejs.org/guide/quick-start) — scaffolding
  with `create-vue`, Node.js requirements, and the recommended setup.
- [Vue documentation](https://vuejs.org/) — the official guide and
  API reference for Vue 3.
- [Vue Router guide](https://router.vuejs.org/guide/) — routing,
  dynamic matching, guards, and navigation.
- [Pinia state](https://pinia.vuejs.org/core-concepts/state.html) —
  the official store library's core concepts.
- [Pinia API reference](https://pinia.vuejs.org/api/pinia/) —
  `defineStore`, `createPinia`, and store APIs.

## Required Workflow

1. Confirm the project is Vue 3.5 (check `vue` in `package.json`)
   and built with Vite. If it is a Nuxt app, use `nuxt` instead.
2. Scaffold new projects with `npm create vue@latest`, enabling
   TypeScript, Vue Router, Pinia, and Vitest when the app needs them.
3. Design the component tree before writing code: pages (route
   components), feature components, and shared UI components, with
   props flowing down and events flowing up.
4. Decide where each piece of state lives: local `ref`/`reactive`
   for component state, a composable for shared logic, a Pinia store
   only for state many parts of the app need.
5. Write components as single-file components with
   `<script setup lang="ts">`, a `<template>`, and scoped styles.
   Type props with `defineProps` and events with `defineEmits`.
6. Fetch data in `onMounted`, in a composable, or in a route guard
   / data loader — never during render — and handle loading, empty,
   and error states.
7. Test components with Vitest and Vue Test Utils, and run
   `npm run build` (which typechecks with `vue-tsc` in the default
   template) before calling the work done.

## Implementation Standards

- Vue 3.5 is the current stable line as of 2026-11-20. Use the
  Composition API with `<script setup>` for all new components;
  the Options API is for maintaining legacy code only.
- Reactivity: `ref` for single values (primitives and object
  references), `reactive` for objects whose properties are all
  tracked, `computed` for derived values. Unwrap refs in templates
  automatically; use `.value` in script. Destructuring props is
  reactive in 3.5, but destructuring a `reactive` object loses
  reactivity — use `toRefs` or keep the object intact.
- Components: one component per file, named in PascalCase
  (`ArticleCard.vue`). Props are readonly; communicate upward with
  `emit`. Use `defineModel` for two-way `v-model` bindings.
  Prefer slots and composition over deep prop drilling; use
  `provide`/`inject` for values many descendants need.
- Composables: functions named `use*` (for example `useArticles`)
  that encapsulate reactive state and lifecycle logic. Keep them
  focused, typed, and free of component-specific rendering.
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
- Templates: semantic HTML, `v-for` with a stable `:key` (an id
  from the data, never the index when the list can reorder),
  `v-if` for conditional rendering and `v-show` only when toggling
  frequently. Avoid complex expressions in templates — move them
  to `computed`.
- Environment variables: Vite inlines `VITE_`-prefixed variables
  into the client bundle at build time; they must never hold
  secrets. Server-side values stay on the server.

## Best Practices

- Keep components small and focused; a component over roughly 200
  lines is usually doing more than one thing.
- Derive values with `computed` instead of storing them in state;
  watchers are for side effects, not derived data.
- Use `watch` with `{ immediate: true }` sparingly; prefer
  `computed` or explicit function calls.
- Extract a composable when logic is reused or when a component's
  logic obscures its rendering.
- Handle the empty state, the loading state, and the error state
  for every data-driven component.
- Use `defineAsyncComponent` for heavy components (modals, charts,
  editors) so they load on demand.
- Keep route components thin: fetch and layout in the page, render
  in child components.
- Use the Vue DevTools to inspect component state, Pinia stores,
  and route state while debugging.
- Run `vue-tsc` typechecking in CI; template type errors are real
  bugs.

## Security Considerations

- Vue escapes interpolated text by default. Never use `v-html` on
  untrusted content; if HTML must be rendered, sanitize it first
  with a maintained sanitizer.
- Never put secrets, API keys, or tokens in client code or in
  `VITE_` environment variables; the bundle is public.
- Validate data from the network at runtime before rendering it,
  even when TypeScript types describe its shape.
- Be careful with URLs from user input in `href` and `src`: reject
  `javascript:` URLs and validate schemes.
- Route guards are UX, not authorization: every API endpoint must
  authorize requests server-side, since client-side guards are
  trivially bypassed.
- Store auth tokens in `httpOnly` cookies set by the server where
  possible; avoid `localStorage` for tokens (XSS-readable).
- Avoid `eval` and dynamic code execution in components.

## Performance Considerations

- Bundle size: lazy-load routes and heavy components, and audit
  dependencies — each one ships to every visitor.
- Lists: use stable `:key` values and keep list items light; for
  hundreds of rows, virtualize instead of rendering every row.
- Reactivity cost: avoid deeply nested `reactive` objects for
  large datasets; use `shallowRef`/`shallowReactive` for data
  that changes wholesale, and `markRaw` for objects that must
  never become reactive (library instances, large static data).
- `v-once` for content that never changes after first render, and
  `v-memo` for expensive subtrees that re-render only when their
  dependencies change.
- Images still need `width`, `height`, `loading`, and `srcset`
  discipline (see `frontend-performance`).
- Prefer `computed` over methods in templates: computed values are
  cached and only re-evaluate when their dependencies change.
- Vue 3.5's reactivity system is leaner than 3.4's; staying on the
  current stable line is itself a performance decision.

## Common Mistakes

- Destructuring a Pinia store's state directly — loses reactivity.
  Use `storeToRefs()` for state and getters.
- Mutating props — props are readonly. Emit an event and let the
  parent update, or use `defineModel`.
- Storing derivable values in state — creates sync bugs. Derive
  with `computed` instead.
- Fetching in render or without cleanup — duplicate requests and
  state updates after unmount. Fetch in `onMounted` or a
  composable with an `AbortController`.
- Using array index as `:key` — reordering or deleting items then
  corrupts component state. Use a stable id.
- Reaching for a Pinia store for state only one component uses —
  local state is simpler and easier to test.
- Using `createWebHistory` without a server fallback — refreshing
  a deep link returns a 404. Configure the server to serve
  `index.html` for unknown paths, or use hash history.
- Putting secrets in `VITE_` variables — they ship to the browser.
- `v-html` with unsanitized content — an XSS hole. Sanitize first,
  or avoid it entirely.
- Installing Vuex or Vue CLI in a new project — both are in
  maintenance mode. Use Pinia and `create-vue` with Vite.

## Examples

Component with state, a derived value, and data fetching:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface Article {
  id: string;
  title: string;
}

const articles = ref<Article[]>([]);
const error = ref<string | null>(null);
const loading = ref(true);

const count = computed(() => articles.value.length); // derived, not state

onMounted(async () => {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    articles.value = (await response.json()) as Article[];
  } catch (err: unknown) {
    if (err instanceof Error) error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section aria-label="Articles">
    <p v-if="loading">Loading articles…</p>
    <p v-else-if="error" role="alert">Could not load articles: {{ error }}</p>
    <template v-else>
      <p>{{ count }} articles</p>
      <ul>
        <li v-for="article in articles" :key="article.id">{{ article.title }}</li>
      </ul>
      <p v-if="articles.length === 0">No articles yet.</p>
    </template>
  </section>
</template>
```

Pinia setup store:

```ts
// stores/counter.ts
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);
  const doubled = computed(() => count.value * 2);
  function increment() {
    count.value++;
  }
  return { count, doubled, increment };
});
```

Lazy route with a guard:

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    {
      path: '/account',
      component: () => import('../views/AccountView.vue'),
      beforeEnter: (_to, _from, next) => {
        // Check auth state here; the API still authorizes every request.
        next();
      },
    },
  ],
});

export default router;
```

## Validation Checklist

- [ ] `npm run build` (including `vue-tsc` typecheck) passes with
      zero errors.
- [ ] Components use `<script setup lang="ts">` with typed props
      and emits.
- [ ] No derived value is stored in state; derivations use `computed`.
- [ ] Every list element has a stable, unique `:key`.
- [ ] Loading, empty, and error states are all rendered for
      data-driven components.
- [ ] Pinia state is destructured with `storeToRefs`, never
      directly.
- [ ] No `v-html` is used on unsanitized content and no secrets
      appear in client code or `VITE_` variables.
- [ ] The server serves `index.html` for unknown paths when using
      `createWebHistory`.

## Expected Deliverables

- Vue 3.5 single-file components and composables following the
  standards above.
- Components that render loading, empty, and error states.
- A passing production build, with the routing history mode and
  server fallback noted.
- A short note on where state lives (local, composable, Pinia)
  and why.

## References

- [Vue quick start](https://vuejs.org/guide/quick-start) —
  scaffolding and setup.
- [Vue documentation](https://vuejs.org/) — guide and API
  reference.
- [Vue Router guide](https://router.vuejs.org/guide/) — routing
  and navigation.
- [Pinia state](https://pinia.vuejs.org/core-concepts/state.html) —
  store concepts.
- [Pinia API reference](https://pinia.vuejs.org/api/pinia/) —
  store APIs.
- Related skills in this repository: `nuxt`, `typescript`,
  `javascript`, `semantic-html`, `tailwind-css`, `vitest`,
  `frontend-performance`, `accessibility`.
