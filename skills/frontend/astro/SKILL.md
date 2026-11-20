---
name: astro
description: >
  Build fast content-focused websites with Astro 7 using .astro components,
  content collections, islands of interactivity, and Markdown content. Use
  when creating or editing an Astro site, writing .astro components, working
  with content collections or Markdown/MDX, adding islands, or deploying an
  Astro site to static hosting or a server adapter.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS and an Astro 7 project; server adapters need a compatible hosting target.
---

# Astro

## Purpose

This skill builds websites with Astro 7: content-first pages rendered to
static HTML by default, `.astro` components for layout and structure,
content collections with typed frontmatter for Markdown content, and
islands of interactivity that ship JavaScript only where a component
actually needs it. The result is a site that is fast by default and easy
to write content for.

## When to Use

- Creating a new Astro site (blog, documentation, marketing site,
  portfolio).
- Writing `.astro` components, layouts, and pages.
- Working with content collections, Markdown, or MDX content.
- Adding interactive islands with React, Vue, Svelte, or another
  framework.
- Configuring routing, images, or deployment for an Astro site.

## When Not to Use

- A full-stack app with heavy server-side interactivity and sessions: use
  `nextjs`.
- A site that must be a single Go binary with no Node.js runtime: use
  `hugo`.
- A React-only single-page application: use `react`.
- Styling: use `tailwind-css`, `css`, or `modern-css`.

## Prerequisites

- Node.js 24 LTS installed (current LTS line as of 2026-11-20).
- An Astro 7 project (current major line as of 2026-11-20); do not assume
  a minor version. New projects are created with `npm create astro@latest`.
- Content ready as Markdown files (or MDX) for content-driven sites.
- Familiarity with `html`, `css`, and `javascript`; `.astro` files mix
  HTML-like markup with JavaScript frontmatter.

## Official Documentation

- [Astro documentation](https://docs.astro.build/) — the official docs for
  components, routing, content collections, and deployment.
- [Astro tutorial](https://docs.astro.build/en/tutorial/0-introduction/) —
  the official guided tutorial for building a blog.
- [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/) —
  every `astro.config.mjs` option.

## Required Workflow

1. Confirm the project is Astro 7 and the output mode fits the goal:
   `static` (default) for content sites, `server` with an adapter only
   when server rendering is genuinely needed.
2. Structure pages under `src/pages/` (file-based routing) and shared
   layouts under `src/layouts/`; put reusable UI in `src/components/`.
3. Define content collections in `src/content.config.ts` with a schema
   (using the content layer API) so frontmatter is typed and validated.
4. Write pages as `.astro` components: frontmatter script at the top for
   data fetching and imports, HTML-like markup below, scoped `<style>`
   blocks for component CSS.
5. Keep JavaScript out of the client by default. Add interactivity only
   as islands with a hydration directive (`client:load`, `client:idle`,
   `client:visible`), choosing the least eager directive that works.
6. Use Astro's `Image` component (or the `Picture` component) for images
   so they are optimized at build time.
7. Run `npm run build` and fix every error; check the output for the
   pages generated and any warnings.
8. Preview the production build with `npm run preview` before deploying.

## Implementation Standards

- Astro 7 is the current major line as of 2026-11-20. Follow the docs at
  docs.astro.build for the current APIs; do not rely on pre-5.0 patterns
  such as the legacy content collections configuration file location.
- Pages live in `src/pages/`; a file `src/pages/blog/[slug].astro` is a
  dynamic route whose params come from `getStaticPaths()`.
- `.astro` frontmatter runs on the server at build time (or request time
  in server mode). It can import data, read files, and fetch APIs; it
  must not use browser-only APIs.
- Content collections: define each collection with a schema using the
  content layer API in `src/content.config.ts`; query with
  `getCollection` and `getEntry`. Frontmatter is validated against the
  schema at build time.
- Components: `.astro` components for static UI; framework components
  (React, Vue, Svelte) only as islands, with the framework integration
  installed and configured.
- Hydration directives: `client:visible` for below-the-fold widgets,
  `client:idle` for low-priority interactivity, `client:load` only when
  the component must work immediately. Never hydrate a component that
  has no interactivity.
- Styling: scoped `<style>` in `.astro` components for component CSS;
  global styles in `src/styles/` imported from a layout.
- Images: use the `Image` component from `astro:assets` for local images
  so they are resized and converted at build time; always provide `alt`.
- Links: use plain `a` tags with relative paths for internal navigation;
  Astro has no router component.
- Environment variables: server-only variables are accessed in
  frontmatter; `PUBLIC_` prefixed variables are exposed to client code
  and must never hold secrets.
- Configuration: `astro.config.mjs` holds integrations, the output mode,
  and the site URL; keep it minimal and commented.

## Best Practices

- Zero JavaScript by default is a feature: before adding an island, ask
  whether plain HTML and CSS can do the job (details/summary, CSS-only
  menus, anchor navigation).
- Put shared page structure (head, header, footer) in a layout component
  so pages stay focused on content.
- Use content collections for any repeated content (blog posts, docs,
  products); a schema catches frontmatter mistakes at build time.
- Keep frontmatter scripts small: move data logic into `src/lib/` modules
  and import them.
- Use `Astro.props` with a TypeScript interface for component props.
- Prefer `getStaticPaths()` with `prerender` for dynamic routes in static
  output so every page is built at build time.
- Add an RSS feed and a sitemap with the official `@astrojs/rss` and
  `@astrojs/sitemap` integrations for content sites.
- Set the `site` option in `astro.config.mjs` so canonical URLs, the
  sitemap, and RSS feeds use the real domain.

## Security Considerations

- Frontmatter runs on the server: never pass secrets, API keys, or
  database handles into client islands or `PUBLIC_` variables.
- Content from Markdown files is trusted only if the authors are trusted;
  if content comes from untrusted users, sanitize rendered HTML.
- Validate any data fetched at build time before rendering it into pages.
- Do not use `set:html` with untrusted content; it bypasses escaping.
- Keep integrations updated; outdated integrations can carry
  vulnerabilities.

## Performance Considerations

- Static output with zero JavaScript is the fastest option; every island
  adds JavaScript, so add them sparingly and with the least eager
  hydration directive.
- Use the `Image` component for automatic resizing and modern formats;
  never ship full-size source images.
- Keep layouts lean: the HTML Astro ships is the HTML the browser parses,
  so avoid deep nesting and unnecessary markup.
- Use `client:visible` for islands below the fold so their JavaScript
  loads only when scrolled into view.
- Prefer build-time data fetching (frontmatter) over client-side fetching
  for content that does not change per visitor.

## Common Mistakes

- Using browser APIs (`window`, `document`, `localStorage`) in
  frontmatter — frontmatter runs on the server and has no browser. Put
  browser code in an island or a client `<script>` tag.
- Hydrating everything — defeats Astro's main advantage. Only hydrate
  components with real interactivity.
- Forgetting `getStaticPaths()` on a dynamic route — the build fails or
  the route is not generated in static output.
- Putting secrets in `PUBLIC_` environment variables — they are exposed
  to the browser.
- Using `set:html` with untrusted content — bypasses escaping and opens
  XSS.
- Importing a framework component without the integration installed —
  the build fails. Install and configure the integration first.
- Writing content as loose Markdown files instead of a content collection
  — loses schema validation and typed queries.
- Skipping the `site` config — breaks canonical URLs, sitemaps, and RSS.

## Examples

A layout component with slots and props:

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Example Site' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <slot />
  </body>
</html>
```

A content collection schema and a listing page:

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const posts = (await getCollection('blog'))
  .filter((post) => !post.data.draft)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout title="Blog">
  <main>
    <h1>Blog</h1>
    <ul>
      {posts.map((post) => (
        <li>
          <a href={`/blog/${post.id}/`}>{post.data.title}</a>
        </li>
      ))}
    </ul>
  </main>
</BaseLayout>
```

## Validation Checklist

- [ ] `npm run build` passes with zero errors.
- [ ] The site renders with JavaScript disabled, except for islands that
      genuinely need it.
- [ ] Content collections validate frontmatter against a schema.
- [ ] Islands use the least eager hydration directive that works.
- [ ] Images use the `Image` component with `alt` attributes.
- [ ] The `site` URL is set in `astro.config.mjs`.
- [ ] No secrets appear in client code or `PUBLIC_` variables.

## Expected Deliverables

- An Astro 7 site or page/component changes following the standards above.
- Content collections with schemas for content-driven sections.
- A passing production build and a preview check before deployment.

## References

- [Astro documentation](https://docs.astro.build/) — official docs.
- [Astro tutorial](https://docs.astro.build/en/tutorial/0-introduction/) —
  guided blog tutorial.
- [Astro configuration reference](https://docs.astro.build/en/reference/configuration-reference/) —
  config options.
- Related skills in this repository: `html`, `css`, `tailwind-css`,
  `react`, `frontend-performance`.
