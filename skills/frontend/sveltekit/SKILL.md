---
name: sveltekit
description: >
  Build full-stack web apps with SvelteKit 3 and Svelte 5 runes,
  including file-based routing, load functions, form actions, SSR,
  prerendering, and adapters. Use when creating or editing a
  SvelteKit app, adding routes, layouts, server endpoints, or form
  actions, fetching data with load functions, choosing an adapter,
  or deploying to Node, Vercel, Netlify, or Cloudflare.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 22.17 or newer, Vite 8, and Svelte 5.56.4 or newer.
---

# SvelteKit

## Purpose

This skill builds full-stack web applications with SvelteKit 3 on
Svelte 5: file-based routing, `load` functions for data, form actions
for mutations, server endpoints, and per-route rendering choices
(SSR, prerendering, or client-only) deployed through an adapter. It
covers the full loop from scaffolding with the `sv` CLI to a
production deployment.

## When to Use

- Creating a new SvelteKit app or adding pages, layouts, and routes.
- Fetching data with universal or server-only `load` functions.
- Building forms with form actions and progressive enhancement.
- Adding API endpoints (`+server` files) or server middleware.
- Choosing rendering per route: SSR, prerendering, or CSR.
- Managing state with Svelte 5 runes (`$state`, `$derived`,
  `$effect`).
- Choosing and configuring an adapter for deployment.
- Migrating an app from SvelteKit 2 to SvelteKit 3.

## When Not to Use

- A component library or a plain Svelte app without routing or a
  server: use Svelte on its own (no dedicated skill in this
  library) or `astro` for content sites.
- A React app: use `react` or `nextjs`.
- A static content site with no server needs: use `astro` or `hugo`.
- Styling: use `css`, `tailwind-css`, or `shadcn-ui`.

## Prerequisites

- Node.js v22.17 or newer, Vite v8.0.12 or newer, Svelte v5.56.4
  or newer, and TypeScript v6 for typed projects (the minimums
  SvelteKit 3 requires). Do not assume a minor version.
- A SvelteKit 3 project (current major line as of 2026-11-20,
  released 2026-10-01). SvelteKit 2.x still receives patches but is
  not the target for new work; new projects are created with
  `npx sv create <name>`.
- Familiarity with Svelte 5 runes and `typescript`. SvelteKit 3
  moved all configuration into the `sveltekit()` Vite plugin in
  `vite.config.js` — `svelte.config.js` is no longer read — and
  replaced the `$lib` alias with `#lib` (a standard subpath import
  declared in `package.json`).
- The deployment target decided (Node server, serverless platform,
  edge, or static hosting) because it selects the adapter.

## Official Documentation

- [SvelteKit 3 announcement](https://svelte.dev/blog/sveltekit-3-is-here) —
  what changed in the current major release.
- [Migrating to SvelteKit 3](https://svelte.dev/docs/kit/migrating-to-sveltekit-3) —
  the official migration guide, including `npx sv migrate sveltekit-3`.
- [Routing](https://svelte.dev/docs/kit/routing) — filesystem
  routing, route files, layouts, and `load` functions.
- [Project types](https://svelte.dev/docs/kit/project-types) —
  SSR, SSG, SPA, and serverless rendering modes.
- [Adapters](https://svelte.dev/docs/kit/adapters) — official
  adapters and how to configure them in `vite.config.js`.

## Required Workflow

1. Confirm the project uses SvelteKit 3 (check `@sveltejs/kit` in
   `package.json` and that configuration lives in `vite.config.js`).
   If it is on 2.x, migrate first with
   `npx sv migrate sveltekit-3` on a branch.
2. Map the URL structure to `src/routes`: each directory is a route
   segment, `+page.svelte` renders it, `+layout.svelte` wraps it,
   and `+error.svelte` bounds its errors.
3. Decide data flow per route before writing components: universal
   `load` (`+page.js`) for data that can run anywhere, server-only
   `load` (`+page.server.js`) for databases, secrets, or private
   APIs. Never fetch data inside a component when a `load`
   function can do it.
4. Keep pages as functions of their `data` prop: destructure with
   `let { data } = $props()` and render loading, empty, and error
   states.
5. Use form actions for mutations, with `enhance` from `$app/forms`
   for progressive enhancement; validate all input on the server.
6. Choose rendering per route with page options (`prerender`,
   `ssr`, `csr`) and pick the adapter that matches the deployment
   target; add it with `npx sv add sveltekit-adapter`.
7. Run `npm run build` and `npm run check` (or the project's
   typecheck script) and fix every error; then test the production
   build with `npm run preview`, including navigation, forms, and
   error pages.

## Implementation Standards

- SvelteKit 3 and Svelte 5 only for new work. Configuration lives
  in `vite.config.js`, passed to the `sveltekit()` plugin:
  `plugins: [sveltekit({ adapter: adapter() })]`. Do not create a
  `svelte.config.js`.
- Imports: `#lib` (declared in the `imports` field of
  `package.json`) replaces `$lib`. `#lib` imports require an
  explicit file extension (`#lib/foo.ts` or `#lib/foo/index.ts`);
  `#lib/foo` without one fails to resolve. `$app/env` replaces
  `$app/environment`. `$app/forms`, `$app/navigation`, and
  `$app/paths` keep their names.
- Routing: dynamic segments use `[param]` folders; optional
  parameters use `[[param]]`; rest parameters use `[...rest]`;
  route groups use `(group)` folders that do not affect the URL.
  Matchers (`[param=matcher]`) live in `src/params`.
- `load` functions: export `load` from `+page.js` (universal) or
  `+page.server.js` (server-only). Use the provided `fetch` (it
  inherits cookies and works during SSR), `params`, `url`, and
  `parent()` for layout data. Return serializable data only.
  Throw `error(status, message)` from `@sveltejs/kit` for missing
  resources and `redirect(status, location)` for redirects.
- Layouts: `+layout.svelte` renders children with
  `{@render children()}` and receives `data` from layout `load`
  functions. Layout `load` runs before page `load`.
- Form actions: export `actions` from `+page.server.js`. Use
  `fail(status, data)` to return validation errors with the
  submitted values; use `redirect` after a successful mutation
  where a fresh page state is wanted. Always validate and
  sanitize `request.formData()` on the server.
- Endpoints: `+server.js` files export HTTP method handlers
  (`GET`, `POST`, ...) returning a `Response`. Keep them thin and
  validate every request.
- Page options: export `prerender`, `ssr`, and `csr` from
  `+page.js` / `+layout.js` to control rendering per route. SSR is
  the default; prerender content pages; disable `ssr` only for
  pages that cannot render on the server.
- State: Svelte 5 runes — `$state` for reactive state, `$derived`
  for computed values, `$effect` for synchronization with external
  systems. Shared state lives in a `.svelte.js` / `.svelte.ts`
  module exporting rune-backed state. Do not use Svelte 4 stores
  (`writable`, `$app/stores`) in new code; `$app/stores` was
  removed in SvelteKit 3.
- Environment variables: private values via `$env/static/private`
  or `$env/dynamic/private` (server-only files only); public
  values via `$env/static/public` or `$env/dynamic/public` with a
  `PUBLIC_` prefix. Never import a private env module into client
  code — the build fails, and for good reason.
- Hooks: `src/hooks.server.js` (`handle`, `handleError`,
  `handleFetch`) and `src/hooks.client.js` for cross-cutting
  request behavior. Keep auth checks in hooks or server `load`,
  not in components.
- Adapters: pick one official adapter for the target —
  `@sveltejs/adapter-auto` for zero-config platforms,
  `adapter-node` for a Node server, `adapter-static` for SSG,
  `adapter-vercel`, `adapter-netlify`, `adapter-cloudflare`, or
  `adapter-bun`. Only one adapter is active at a time.

### Accessibility

- Use semantic HTML and native elements (`<button>`, `<a>`,
  `<dialog>`) over `<div>` elements with click handlers; custom
  controls must be keyboard-operable with visible focus.
- Manage focus on navigation: SvelteKit does not move focus
  automatically, so move it to the new page heading (or an
  `aria-live` region) after route changes. Announce dynamic
  updates with `aria-live`.
- Keep body-text contrast at WCAG 2.2 AA (4.5:1). Test with
  keyboard only and a screen reader.

### Testing Strategy

- Unit-test `load` functions and form actions with Vitest, mocking
  `fetch`, `params`, and `url`; test the `fail()` validation path, not
  only the success path.
- Cover key user journeys end to end with Playwright, including form
  submission, redirects, and error pages — a route that works in `dev`
  can fail under the production adapter.
- Test rendering per route: prerendered pages build as static output,
  SSR pages render on the server, and a page with `ssr: false` still
  works where it must.
- Test hooks directly: unauthenticated requests to protected routes
  redirect, and `handleError` returns a safe error page without
  leaking internals.
- Run the production build with the real adapter in CI; adapter-
  specific failures (missing Node APIs on edge, static-export errors)
  only appear in the built output.

## Best Practices

- Put data fetching in `load`, not in components: it runs on the
  server for the first request, is typed via generated `./$types`,
  and supports streaming with promises.
- Stream slow data: return a promise from `load` and await it in
  the component with `{#await}`, so the shell renders immediately.
- Use `invalidate` / `invalidateAll` from `$app/navigation` to
  refresh `load` data after a mutation instead of a full reload.
- Prefetch links the user is likely to follow with
  `data-sveltekit-preload-data="hover"` on navigation-heavy pages.
- Keep `+page.server.js` files free of client imports and
  `+page.svelte` files free of server imports; the
  `$lib/server` convention (now `#lib/server`) marks the boundary.
- Colocate route-specific components under the route directory;
  shared components live in `src/lib`.
- Use `svelte-check` in CI so type errors fail before deployment.
- Prefer `<a>` elements for navigation (SvelteKit enhances them)
  over programmatic `goto` except after actions such as form
  submission.

## Security Considerations

- SvelteKit checks the `Origin` header on form actions and
  `+server` requests by default (CSRF protection). Do not disable
  it; if a legitimate cross-origin form post is needed, allow the
  specific origin in configuration instead.
- Never import server-only modules (`#lib/server`, private env,
  database clients) into client code; the bundler blocks it, but
  the rule must be understood, not just relied upon.
- Validate and authorize in server `load` and actions: client-side
  checks are not a security boundary, and hidden routes are not
  access control.
- Configure a Content Security Policy through the `csp` option
  (now in the Vite plugin config) for apps handling user content;
  SvelteKit can generate nonces per request.
- Escape user content: Svelte escapes interpolated text by default.
  Never use `{@html}` on untrusted content; sanitize first with a
  maintained sanitizer.
- Keep SvelteKit and adapters current: 2026 fixed XSS bugs in
  Svelte's SSR output and a body-size-limit bypass in
  `adapter-node`. Patch releases are the security path.
- Cookies: set `httpOnly`, `secure`, and `sameSite` on session
  cookies via the `cookies` API in server code; never store session
  tokens in `localStorage`.

## Performance Considerations

- Prerender pages whose content does not change per request; it
  removes server work and serves from the edge or CDN.
- Stream slow `load` data with promises so the page shell renders
  immediately instead of blocking on the slowest query.
- Code-split by route automatically (SvelteKit does this); keep
  shared layout bundles small and lazy-load heavy components with
  dynamic `import()`.
- Use the `fetch` passed to `load` so server-side requests are
  direct and inherit the request context, avoiding a public
  round-trip.
- Images: serve correctly sized images with `width`/`height` and
  lazy loading for below-the-fold content (see
  `frontend-performance`).
- Invalidate narrowly: `invalidate(url)` re-runs only the `load`
  functions that depend on that URL; `invalidateAll` re-runs
  everything and should be rare.
- Adapter choice affects latency: edge adapters serve closer to
  users; a Node adapter on one region adds round-trips for distant
  visitors.

## Common Mistakes

- Editing `svelte.config.js` in a SvelteKit 3 project — it is no
  longer read. Configuration goes in `vite.config.js`.
- Importing `$lib` in a SvelteKit 3 project — the alias is `#lib`,
  declared in `package.json` `imports`.
- Fetching data inside a component instead of `load` — loses SSR,
  typing, and streaming. Fetch in `load`.
- Putting secrets or database access in a universal `+page.js` —
  it runs in the browser too. Use `+page.server.js`.
- Returning non-serializable data from `load` (class instances,
  functions, `Date` objects without care) — it must survive
  serialization to the client.
- Using Svelte 4 patterns in Svelte 5: `export let` props,
  `<slot>`, and `$app/stores` are legacy or removed. Use `$props()`,
  `{@render children()}`, and runes.
- Catching errors in `load` and returning empty data — loses the
  error page and the status code. Throw `error()` instead.
- Forgetting `fail()` in form actions and redirecting on
  validation errors — the user loses their input. Return `fail`
  with the submitted values.
- Prerendering a page that needs per-request data — the build
  bakes in one snapshot. Keep such pages dynamic.

## Examples

Server `load` with typed data and error handling:

```ts
// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const response = await fetch(`/api/posts/${params.slug}`);
  if (response.status === 404) error(404, 'Post not found');
  if (!response.ok) error(500, 'Failed to load post');
  const post = await response.json();
  return { post };
};
```

Page component with runes and a form action:

```svelte
<!-- src/routes/newsletter/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
  let subscribed = $state(false);
</script>

{#if form?.success}
  <p role="status">Subscribed — check your inbox.</p>
{:else}
  <form
    method="POST"
    use:enhance={() => {
      return async ({ update }) => {
        await update();
        subscribed = true;
      };
    }}
  >
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" required />
    {#if form?.error}
      <p role="alert">{form.error}</p>
    {/if}
    <button type="submit" disabled={subscribed}>Subscribe</button>
  </form>
{/if}
```

Form action with server-side validation:

```ts
// src/routes/newsletter/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    if (typeof email !== 'string' || !email.includes('@')) {
      return fail(400, { email: '', error: 'Enter a valid email address.' });
    }
    // Store the subscription on the server here.
    return { success: true };
  },
};
```

## Validation Checklist

- [ ] `npm run build` and the typecheck pass with zero errors.
- [ ] Configuration lives in `vite.config.js`; no `svelte.config.js`
      is read and no `$lib` import remains.
- [ ] Data flows through `load` functions; no component fetches its
      own data.
- [ ] Server-only code (database, secrets, private env) appears only
      in `.server` files and `#lib/server`.
- [ ] Forms use actions, validate on the server, and return `fail`
      with submitted values on validation errors.
- [ ] Loading, empty, and error states exist for data-driven routes.
- [ ] The correct adapter is configured and `npm run preview`
      renders the app as deployed.
- [ ] No secrets appear in client code or `PUBLIC_` variables.

## Expected Deliverables

- A SvelteKit 3 application or route changes following the standards
  above, with typed `load` functions and actions.
- A passing production build and preview, with the rendering mode
  per route noted.
- The adapter choice documented with the deployment target it
  serves.

## References

- [SvelteKit 3 announcement](https://svelte.dev/blog/sveltekit-3-is-here) —
  current major release highlights.
- [Migrating to SvelteKit 3](https://svelte.dev/docs/kit/migrating-to-sveltekit-3) —
  migration guide and `sv migrate`.
- [Routing](https://svelte.dev/docs/kit/routing) — routes, layouts,
  and `load` functions.
- [Project types](https://svelte.dev/docs/kit/project-types) —
  rendering modes.
- [Adapters](https://svelte.dev/docs/kit/adapters) — deployment
  targets and configuration.
- Related skills in this repository: `nextjs`, `typescript`,
  `accessibility`, `frontend-performance`, `vitest`, `playwright`.
