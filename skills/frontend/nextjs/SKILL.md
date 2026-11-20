---
name: nextjs
description: >
  Build full-stack React applications with Next.js 16 using the App Router,
  server components, routing, data fetching, and deployment. Use when
  creating or editing a Next.js app, adding routes, pages, layouts, server
  actions, or API routes, fetching data with server components, or fixing
  Next.js routing, rendering, or caching behavior.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS and a Next.js 16 project; deployment targets may need a hosting account.
---

# Next.js

## Purpose

This skill builds Next.js 16 applications with the App Router: file-based
routing, server components by default, layouts and loading states, server
actions for mutations, and the rendering and caching model that decides
when a page is static, dynamic, or revalidated. It covers the full loop
from project structure to a production build.

## When to Use

- Creating a new Next.js app or adding pages, layouts, and routes.
- Fetching data in server components or route handlers.
- Building forms with server actions.
- Adding API routes, middleware, or metadata for SEO.
- Fixing routing, caching, rendering, or build problems in a Next.js app.

## When Not to Use

- A content-only site with no interactivity or server needs: use `astro`
  or `hugo` for a lighter stack.
- A React component library or a plain React app without routing: use
  `react`.
- Static site generation where no server is involved at all: use `astro`.
- Styling: use `tailwind-css`, `css`, or `shadcn-ui`.

## Prerequisites

- Node.js 24 LTS installed (current LTS line as of 2026-11-20).
- A Next.js 16 project (current major line as of 2026-11-20); do not
  assume a minor version. New projects are created with
  `npx create-next-app@latest`.
- Familiarity with `react` and `typescript`; the App Router assumes both.
- The deployment target decided (a Node.js server, a hosting platform, or
  static export) because it affects which features are available.

## Official Documentation

- [Next.js documentation](https://nextjs.org/docs) — the official docs
  for the App Router, routing, data fetching, and deployment.
- [Next.js Learn](https://nextjs.org/learn) — the official guided
  tutorial.
- [React documentation](https://react.dev/) — server and client component
  concepts that Next.js builds on.

## Required Workflow

1. Confirm the project uses the App Router (`app/` directory). New
   projects should use it; the Pages Router is legacy for new work.
2. Map the URL structure to routes: each folder under `app/` is a route
   segment, `page.js`/`page.tsx` renders it, `layout.js`/`layout.tsx`
   wraps it, and `loading.js`/`loading.tsx` provides its loading UI.
3. Keep components as server components by default. Add `'use client'`
   only to components that need browser APIs, event handlers, or hooks
   such as `useState` and `useEffect`.
4. Fetch data in server components or route handlers, close to where it
   is rendered; do not fetch in client components when a server component
   can do it.
5. Use server actions (`'use server'`) for mutations from forms; validate
   all input on the server, and revalidate affected paths after a
   mutation.
6. Add metadata with the `metadata` export (title, description, open
   graph) on pages and layouts that need it.
7. Run `npm run build` and fix every build error; check the build output
   to confirm which routes are static and which are dynamic.
8. Test the production build locally (`npm run start`) before deploying,
   including loading states, error states, and navigation.

## Implementation Standards

- App Router only for new work: `app/` directory, `page.tsx`,
  `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Server components by default; `'use client'` only where interactivity
  or browser APIs are required. Pass server-fetched data down as props
  rather than re-fetching in the client.
- Routing: dynamic segments use `[slug]` folders; catch-all routes use
  `[...slug]`; route groups use `(group)` folders that do not affect the
  URL.
- Data fetching: fetch in server components with `fetch` or a data
  layer; use `loading.tsx` for streaming loading UI and `error.tsx` for
  route-level error boundaries.
- Caching: understand the default — `fetch` requests in server
  components are cached unless opted out; use `revalidatePath` or
  `revalidateTag` after mutations, and `generateStaticParams` for
  static dynamic routes.
- Server actions: define with `'use server'`, validate input with a
  schema or manual checks, and return serializable results. Never trust
  client-sent data.
- Route handlers (`route.ts`) are for API endpoints and webhooks; keep
  them thin and validate every request.
- Images: use the `next/image` component with `width`/`height` or `fill`,
  and remote image patterns configured for external hosts.
- Fonts: use `next/font` to self-host fonts; do not load fonts from a
  third-party stylesheet at runtime.
- Metadata: export `metadata` from layouts and pages; use
  `generateMetadata` when metadata depends on fetched data.
- Environment variables: server-only variables stay unprefixed;
  `NEXT_PUBLIC_` variables are exposed to the browser and must never
  hold secrets.

## Best Practices

- Keep the client bundle small: move interactivity into small leaf
  components and leave the rest as server components.
- Use `loading.tsx` and `Suspense` boundaries so slow data does not block
  the whole page.
- Prefer colocated `page.tsx` data fetching over a global data layer when
  the data is only used on one page.
- Use `not-found.tsx` for missing resources and `error.tsx` for
  recoverable errors instead of ad-hoc error pages.
- Use the `Link` component for internal navigation so prefetching works;
  do not use plain `a` tags for internal links.
- Keep route handlers and server actions free of UI logic; they are the
  server boundary.
- Run `next build` in CI so type errors, missing imports, and invalid
  routes fail before deployment.
- Use `generateStaticParams` for dynamic routes whose parameters are
  known at build time (blog posts, product pages).

## Security Considerations

- Server components and server actions run on the server: never expose
  secrets, database clients, or admin logic through props or client
  components.
- Validate all input in server actions and route handlers; client-side
  validation is not a security boundary.
- Never put secrets in `NEXT_PUBLIC_` environment variables; they are
  embedded in the client bundle.
- Use the `headers()` and `cookies()` APIs on the server for auth state;
  do not trust client-sent identity claims.
- Rate-limit public route handlers and server actions that accept
  unauthenticated input.
- Keep dependencies updated; Next.js security advisories are published
  on the project's GitHub repository and release notes.

## Performance Considerations

- Server components reduce client JavaScript; audit the client bundle
  with the build output and keep `'use client'` boundaries small.
- Use `next/image` for automatic resizing, modern formats, and lazy
  loading; never serve full-size images to small screens.
- Use `next/font` to self-host fonts and avoid render-blocking
  third-party font requests.
- Prefer static rendering where possible; dynamic rendering on every
  request costs server time and latency.
- Use `loading.tsx` streaming so the shell renders immediately while
  slow data loads.
- Avoid fetching the same data twice: dedupe with React's `cache()` or
  by passing data through props.

## Common Mistakes

- Adding `'use client'` to a whole page — turns the entire page into
  client JavaScript. Push the boundary down to the interactive leaf.
- Fetching data in a client component with `useEffect` — loses server
  rendering, SEO, and caching. Fetch in a server component instead.
- Forgetting to revalidate after a mutation — the page keeps showing
  stale data. Call `revalidatePath` or `revalidateTag` in the action.
- Using plain `a` tags for internal links — bypasses prefetching and
  client-side navigation. Use `Link`.
- Putting secrets in `NEXT_PUBLIC_` variables — they ship to the browser.
- Ignoring the build output — it tells you which routes are static and
  which are dynamic; check it after every change.
- Catching errors in `page.tsx` instead of using `error.tsx` — loses the
  route-level error boundary and recovery UI.
- Dynamic route without `generateStaticParams` when the params are known
  — misses static generation and pays for dynamic rendering.

## Examples

Server component page with data fetching and metadata:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'All articles on Example Site.',
};

interface Article {
  id: string;
  title: string;
}

async function getArticles(): Promise<Article[]> {
  const response = await fetch('https://example.com/api/articles', {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error('Failed to load articles');
  return response.json();
}

export default async function ArticlesPage() {
  const articles = await getArticles();
  return (
    <main>
      <h1>Articles</h1>
      <ul>
        {articles.map((article) => (
          <li key={article.id}>{article.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

Server action for a form mutation:

```tsx
'use server';

import { revalidatePath } from 'next/cache';

export async function subscribe(formData: FormData) {
  const email = formData.get('email');
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  // Store the subscription on the server here.
  revalidatePath('/newsletter');
  return { ok: true };
}
```

## Validation Checklist

- [ ] `npm run build` passes with zero errors.
- [ ] The build output shows the expected static/dynamic split for routes.
- [ ] Client components are limited to interactive leaves; pages and
      layouts are server components.
- [ ] Loading, error, and not-found states exist for data-driven routes.
- [ ] Server actions validate input and revalidate affected paths.
- [ ] No secrets appear in client components or `NEXT_PUBLIC_` variables.
- [ ] Metadata is present on public pages.

## Expected Deliverables

- A Next.js 16 App Router application or route changes following the
  standards above.
- A passing production build, with the static/dynamic route summary
  noted.
- A short note on caching and revalidation decisions for data-driven
  routes.

## References

- [Next.js documentation](https://nextjs.org/docs) — App Router,
  routing, data fetching, deployment.
- [Next.js Learn](https://nextjs.org/learn) — official tutorial.
- [React documentation](https://react.dev/) — server and client
  components.
- Related skills in this repository: `react`, `typescript`, `tailwind-css`,
  `frontend-performance`, `accessibility`.
