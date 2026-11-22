---
name: hugo
description: >
  Build fast static websites with Hugo using Go templates, content
  sections, taxonomies, and shortcodes. Use when creating or editing a Hugo
  site, writing templates and layouts, organizing Markdown content, adding
  taxonomies or menus, or building and deploying a Hugo site.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires the Hugo binary installed on the machine building the site; Sass/SCSS support needs a separate Dart Sass install (see Prerequisites).
---

# Hugo

## Purpose

This skill builds static websites with Hugo: content in Markdown files,
layouts in Go templates, and a single fast binary that builds the whole
site. Hugo suits documentation, blogs, and marketing sites where the
content is files, the build must be quick, and no Node.js runtime is
wanted in the toolchain.

## When to Use

- Creating a new Hugo site (blog, documentation, marketing site).
- Writing or editing layouts, partials, and shortcodes.
- Organizing content into sections, taxonomies, and menus.
- Adding pagination, related content, or image processing.
- Building and deploying a Hugo site.

## When Not to Use

- A site that needs React islands or a JavaScript framework: use `astro`.
- A full-stack app with server rendering and mutations: use `nextjs`.
- Content that must be managed through a CMS with a visual editor: Hugo
  is file-based; a CMS-backed stack fits better.
- Styling: use `css`, `modern-css`, or `tailwind-css`.

## Prerequisites

- The Hugo binary installed (current line 0.170.x).
  Check the installed version with `hugo version`. There is only one
  Hugo binary: the extended edition was removed in Hugo v0.170.0
  (2026-11-13) along with LibSass, which had been deprecated since
  v0.153.0. Do not install or request an "extended" build, and do not
  set `transpiler: "libsass"` — it now returns an error.
  `hugo.IsExtended` always returns `false` and the module setting
  `hugoVersion.extended` is deprecated and has no effect.
- For Sass/SCSS: install Dart Sass separately — it is now the default
  and only transpiler for `css.Sass` (`toCSS` is the old alias for
  `css.Sass`). The Snap package and the official Docker image bundle
  Dart Sass; release archives and most package-manager installs do
  not. WebP encoding has not needed the extended edition since
  v0.153.0.
- Content as Markdown files with front matter, or a plan to write it.
- Basic familiarity with Go template syntax (`{{ }}`, `range`, `if`,
  `with`) and with `html` and `css`.
- A deployment target for static files (any static host or object
  storage).

## Official Documentation

- [Hugo documentation](https://gohugo.io/documentation/) — the official
  docs for content, templates, functions, and configuration.
- [Hugo quick start](https://gohugo.io/getting-started/quick-start/) —
  the official guide to creating a first site.
- [Hugo functions reference](https://gohugo.io/functions/) — every
  template function.

## Required Workflow

1. Confirm the Hugo version with `hugo version` and the project layout
   (`content/`, `layouts/`, `static/`, `assets/`, config file).
2. Define the content model: sections under `content/` (for example
   `content/posts/`), front matter fields, taxonomies, and menus.
3. Write layouts in `layouts/`: `baseof.html` for the page shell,
   `single.html` for individual pages, `list.html` for section listings,
   and partials in `layouts/partials/` for shared pieces.
4. Keep logic in templates minimal: use Hugo functions and partials for
   repeated work, and keep presentation in CSS.
5. Run `hugo server -D` during development to preview with drafts, and
   `hugo --minify` for the production build.
6. Check the built site in `public/`: confirm pages, feeds, sitemap, and
   assets are all present and correct.
7. Deploy the `public/` directory to the static host.

## Implementation Standards

- Configuration: use `hugo.toml` (or `hugo.yaml` / `hugo.json`) at the
  project root; set `baseURL`, `languageCode`, and `title`. Keep
  environment-specific settings in the config, not in templates.
- Content: Markdown files with front matter (TOML, YAML, or JSON).
  `draft: true` keeps a page out of production builds; `date` controls
  ordering and publication.
- Sections: top-level folders under `content/` are sections; each section
  can have its own `_index.md` and its own list template.
- Templates: Go template syntax. Use `{{ .Title }}`, `{{ .Content }}`,
  `{{ range }}`, `{{ if }}`, and `{{ with }}`. Escape user-controlled
  values; Hugo escapes HTML by default in most contexts, but `safeHTML`
  bypasses it and must only be used on trusted content.
- Partials: shared markup (header, footer, head) lives in
  `layouts/partials/` and is included with `{{ partial "name.html" . }}`.
- Taxonomies: define in config (for example `tags` and `categories`);
  list pages are generated automatically.
- Menus: define in config or in front matter; render with
  `.Site.Menus.main`.
- Images: use Hugo's image processing (`.Resize`, `.Fit`) on page-bundle
  images for responsive sizes; always include `alt` text.
- Pagination: use Hugo's built-in `.Paginate` on list templates; do not
  hand-roll pagination.
- Shortcodes: use for repeated content patterns inside Markdown (callouts,
  figures, embeds). Keep shortcodes small and documented.
- Assets: put processed assets (CSS, JS, images) in `assets/` so Hugo
  pipelines can fingerprint, minify, and bundle them; put files that need
  no processing in `static/`. Compile Sass/SCSS with `css.Sass` using
  the Dart Sass transpiler (the only transpiler since v0.170.0);
  LibSass is removed.
- Output formats: enable RSS and sitemap by default; Hugo generates both
  automatically when configured.

### Accessibility

- Rendered HTML carries the semantics: real landmarks, one `h1`,
  headings in order — check the shipped HTML, not just the source.
- Route changes move focus to the new page heading or announce the
  change via a live region; never leave focus on a removed link.
- Client-side enhancements (search, menus, theme toggles) must not
  break keyboard or screen-reader behavior: the page works without
  JavaScript, and enhanced behavior matches the static HTML.
- Forms, dialogs, and menus use native elements or accessible
  primitives; custom widgets follow the ARIA Authoring Practices Guide.
- Images get `alt` (empty when decorative); loading states announce
  via `role="status"`.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Use page bundles (a folder with `index.md` and its images) for content
  that owns its media; it keeps images next to the content that uses them.
- Keep templates readable: short partials, clear variable names, and
  comments for non-obvious logic.
- Use `.Site.Params` for site-wide settings (social links, analytics IDs)
  so templates stay generic.
- Use `hugo --minify` for production builds to minify HTML, CSS, and JS.
- Fingerprint processed assets (`resources.Fingerprint`) for cache
  busting.
- Use `hugo server` with `--disableFastRender` when template changes do
  not appear, rather than guessing at caching behavior.
- Version-pin Hugo in CI (a specific release) so builds are reproducible.
- Keep the theme as a Hugo module or a vendored directory; do not edit a
  theme's files in place if the theme is shared or updated upstream.

## Security Considerations

- Hugo escapes HTML in templates by default; do not use `safeHTML`,
  `safeJS`, or `safeURL` on content that comes from untrusted authors.
- Do not put secrets in config files committed to the repository; use
  environment variables for tokens and keys.
- Shortcodes that embed third-party content (videos, social posts) load
  external resources; only embed hosts the site owner trusts.
- Review theme and module code before adding it; a theme runs arbitrary
  template code at build time.

## Performance Considerations

- Hugo builds are fast; the performance work is in the output: minify
  HTML/CSS/JS, fingerprint assets, and process images to appropriate
  sizes.
- Use responsive images with `srcset` generated from Hugo image
  processing so small screens do not download large files.
- Keep client JavaScript minimal: Hugo sites are static, so most
  interactivity should be plain HTML/CSS or small scripts.
- Avoid loading web fonts from third-party hosts at runtime; self-host
  fonts in `static/` or `assets/` when possible.
- Use `hugo --minify` and enable compression at the hosting layer.

## Common Mistakes

- Forgetting `draft: false` (or removing `draft: true`) — draft pages do
  not appear in production builds.
- Putting content in the wrong folder — a file's location under
  `content/` decides its section and URL.
- Editing a theme's files directly — updates overwrite the changes. Use
  layout overrides in the project's own `layouts/` directory.
- Using `safeHTML` on untrusted content — bypasses escaping and opens XSS
  in the built site.
- Hard-coding the base URL in templates — breaks staging and domain
  changes. Use `.Site.BaseURL` or relative URLs.
- Missing `_index.md` for a section — the section list page may not
  render as expected.
- Confusing `static/` and `assets/` — files in `static/` are copied as-is
  with no processing; files in `assets/` go through Hugo pipes.
- Not pinning the Hugo version in CI — a new Hugo release can change
  build behavior and break the site.
- Installing the "extended" edition or relying on LibSass — both were
  removed in v0.170.0. Use the single Hugo binary with a separate
  Dart Sass install for Sass/SCSS.

## Examples

Base layout with blocks:

```html
<!doctype html>
<html lang="{{ .Site.LanguageCode }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ block "title" . }}{{ .Site.Title }}{{ end }}</title>
</head>
<body>
  {{ partial "header.html" . }}
  <main>
    {{ block "main" . }}{{ end }}
  </main>
  {{ partial "footer.html" . }}
</body>
</html>
```

List template with pagination:

```html
{{ define "main" }}
  <h1>{{ .Title }}</h1>
  {{ range .Paginator.Pages }}
    <article>
      <h2><a href="{{ .RelPermalink }}">{{ .Title }}</a></h2>
      <time datetime="{{ .Date.Format "2006-01-02" }}">
        {{ .Date.Format "2 January 2006" }}
      </time>
      <p>{{ .Summary }}</p>
    </article>
  {{ end }}
  {{ template "_internal/pagination.html" . }}
{{ end }}
```

Responsive image from a page bundle:

```html
{{ with .Resources.GetMatch "hero.*" }}
  {{ $small := .Resize "800x" }}
  {{ $large := .Resize "1600x" }}
  <img src="{{ $small.RelPermalink }}"
       srcset="{{ $small.RelPermalink }} 800w, {{ $large.RelPermalink }} 1600w"
       sizes="(max-width: 48rem) 100vw, 50vw"
       alt="A sourdough loaf cooling on a rack"
       width="{{ $small.Width }}" height="{{ $small.Height }}">
{{ end }}
```

## Validation Checklist

- [ ] `hugo --minify` builds with zero errors.
- [ ] No draft pages are missing from the build unexpectedly, and no
      draft page leaks into production.
- [ ] Section list pages, single pages, taxonomies, and menus all render.
- [ ] RSS feed and sitemap are generated and valid.
- [ ] Images are processed to appropriate sizes with `alt` attributes.
- [ ] No `safeHTML` is used on untrusted content.
- [ ] The built site in `public/` matches the intended URL structure.
- [ ] Accessibility: route changes move focus or announce; shipped HTML has landmarks and one h1.

## Expected Deliverables

- A Hugo site or layout/content changes following the standards above.
- A passing production build (`hugo --minify`) with the `public/`
  output verified.
- A short note on the content model (sections, taxonomies, front matter
  fields) for the site.

## References

- [Hugo documentation](https://gohugo.io/documentation/) — official docs.
- [Hugo quick start](https://gohugo.io/getting-started/quick-start/) —
  creating a first site.
- [Hugo functions reference](https://gohugo.io/functions/) — template
  functions.
- Related skills in this repository: `astro`, `html`, `css`,
  `frontend-performance`.
