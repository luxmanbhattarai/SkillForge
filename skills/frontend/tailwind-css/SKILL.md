---
name: tailwind-css
description: >
  Style interfaces with Tailwind CSS v4 using utility classes, the
  @theme directive, variants, and the CSS-first configuration. Use when
  styling with Tailwind, setting up Tailwind in a project, building
  responsive or dark-mode variants, customizing the design system, or
  refactoring utility-heavy markup into components.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS and a Tailwind CSS v4 project with the Tailwind CLI, PostCSS plugin, or Vite plugin.
---

# Tailwind CSS

## Purpose

This skill styles interfaces with Tailwind CSS v4: utility classes in
markup, a CSS-first configuration through `@theme`, variants for
responsive, dark-mode, and state-based styling, and a design system
expressed as tokens rather than one-off values. It covers setup,
day-to-day utility usage, customization, and the patterns that keep
utility-heavy markup maintainable.

## When to Use

- Styling a page or component in a Tailwind project.
- Setting up Tailwind CSS v4 in a new or existing project.
- Building responsive, dark-mode, or state-based variants.
- Customizing the design system (colors, spacing, fonts) with `@theme`.
- Refactoring repeated utility combinations into components.

## When Not to Use

- Hand-written CSS without a utility framework: use `css` or `modern-css`.
- Component primitives with built-in behavior: use `shadcn-ui` (which is
  built on Tailwind).
- A project that has not adopted Tailwind and does not want the utility
  approach: use `css`.
- Markup structure or semantics: use `html` or `semantic-html`.

## Prerequisites

- Node.js 24 LTS or 26 LTS installed (26 is the newest LTS line as
  of 2026-11-20; 24 and 22 remain in LTS).
- A Tailwind CSS v4 project (current major line as of 2026-11-20); do not
  assume a minor version. Tailwind v4 is CSS-first: configuration lives
  in CSS with `@theme`, not in a JavaScript config file.
- A build integration: the Vite plugin, the PostCSS plugin, or the
  standalone CLI, as documented on tailwindcss.com.
- Familiarity with `css` fundamentals: the utility names map directly to
  CSS properties.

## Official Documentation

- [Tailwind CSS documentation](https://tailwindcss.com/docs) — the
  official docs for utilities, variants, and configuration.
- [Tailwind CSS installation](https://tailwindcss.com/docs/installation) —
  setup for Vite, PostCSS, and the CLI.
- [Tailwind CSS upgrade guide](https://tailwindcss.com/docs/upgrade-guide) —
  what changed from v3 to v4.

## Required Workflow

1. Confirm the project uses Tailwind CSS v4 and that the CSS entry file
   imports Tailwind (`@import "tailwindcss";`).
2. Define design tokens in `@theme` in the CSS entry file: brand colors,
   font families, spacing scale, and breakpoints. Do not hard-code
   arbitrary values in markup when a token exists.
3. Style mobile-first: base utilities apply to all sizes; add `sm:`,
   `md:`, `lg:`, and `xl:` variants for wider screens.
4. Group utilities logically in the class attribute (layout, then
   spacing, then typography, then color, then state) and keep the order
   consistent across the codebase.
5. Extract repeated utility combinations into a component (a React
   component, an Astro component, or a template partial) rather than
   repeating long class lists.
6. Use variants for state (`hover:`, `focus-visible:`, `disabled:`),
   dark mode (`dark:`), and conditional styling instead of writing
   custom CSS.
7. Run the build and check the generated CSS size; Tailwind only includes
   utilities that are used, so unused classes cost nothing, but arbitrary
   values and duplication still bloat the output.

## Implementation Standards

- Tailwind CSS v4 is the current major line as of 2026-11-20. Use the
  CSS-first configuration: `@import "tailwindcss";` plus `@theme` blocks.
  The JavaScript `tailwind.config.js` file is the v3 approach and is not
  needed in v4.
- Theme tokens live in `@theme`: `--color-brand-500`, `--font-display`,
  `--spacing`, and similar. Reference them by their utility names
  (`bg-brand-500`, `font-display`).
- Use the default spacing scale (multiples of `--spacing`, 0.25rem) and
  the default breakpoints unless the design system defines its own.
- Arbitrary values (`w-[37rem]`, `bg-[#1a2b3c]`) are a last resort; a
  value used twice belongs in `@theme` or a component.
- Responsive variants are mobile-first: `md:grid-cols-2` applies at the
  `md` breakpoint and above.
- Dark mode in v4 uses the `dark:` variant, which by default follows
  `prefers-color-scheme`; customize with the `@custom-variant` directive
  when a class-based toggle is needed.
- State variants: `hover:`, `focus-visible:`, `active:`, `disabled:`,
  `aria-expanded:`, `data-[state=open]:` for component states.
- Layout: `flex`, `grid`, `gap-*`, `container`, and `mx-auto` for page
  structure; avoid fixed pixel widths on containers.
- Typography: `text-*` size utilities with `leading-*` and `tracking-*`;
  define font families in `@theme` (`--font-sans`, `--font-display`).
- Keep class lists readable: if a class attribute exceeds roughly 15
  utilities, the markup is probably doing too much — split it into a
  component or use `@apply` sparingly in a CSS file for genuinely
  repeated patterns.
- `@apply` is available in v4 but should be used sparingly; prefer real
  components over CSS abstractions of utility lists.

## Best Practices

- Let the design system do the work: if a color, spacing, or radius is
  not in `@theme`, add it there instead of using an arbitrary value.
- Use `container` with `mx-auto` and `px-4` for centered page content.
- Use `space-y-*` or `gap` for vertical rhythm instead of margins on
  individual children.
- Use `sr-only` for visually hidden text that screen readers need (see
  `accessibility`).
- Use `truncate`, `line-clamp-*`, and `break-words` for text overflow
  instead of custom CSS.
- Prefer `grid` with `auto-fit`/`minmax` via arbitrary values only when
  the built-in grid utilities cannot express the layout.
- Use the `not-*` variant and `group`/`peer` for styling based on parent
  or sibling state instead of adding JavaScript classes.
- Keep the CSS entry file small: imports, `@theme`, and a few custom
  utilities. Component styles belong in components.

## Security Considerations

- Tailwind generates CSS from class names; it has no code-execution risk
  by itself. The cautions from `css` apply: never accept user-supplied
  stylesheets, and do not embed secrets in CSS.
- Do not build class names dynamically from user input in a way that
  injects arbitrary CSS: Tailwind only generates utilities it finds in
  source files, so dynamic class names from user input will not generate
  styles — but they can still produce confusing markup. Validate and
  allow-list any user-influenced class choices.
- Class names in markup are public; do not encode internal information
  (user ids, internal codes) in class names.

## Performance Considerations

- Tailwind v4 scans source files and generates only the utilities used,
  so the output CSS stays small even in large projects.
- Arbitrary values generate one-off rules; repeated arbitrary values
  bloat the output. Use tokens instead.
- Avoid `@apply` in hot paths of large stylesheets; it duplicates the
  utility declarations at each use site.
- The `content` scanning in v4 is automatic; ensure generated or
  dynamically-constructed class names are present in source files, or
  they will not be generated. Use full class names in source, not string
  concatenation that hides them from the scanner.
- Keep the number of custom variants small; each variant multiplies the
  utilities it applies to.

## Common Mistakes

- Using v3 configuration (`tailwind.config.js`) in a v4 project — v4 is
  CSS-first; the JavaScript config is ignored unless the compatibility
  package is installed.
- String-concatenated class names (`'text-' + color`) — the scanner
  cannot see them, so no CSS is generated. Write full class names.
- Arbitrary values everywhere — defeats the design system. Add tokens to
  `@theme`.
- `!important` utilities (`!text-red-500` in v3 syntax) — in v4 the
  important modifier is a trailing `!` (`text-red-500!`). Check the docs
  for the current syntax rather than guessing.
- Forgetting the `dark:` variant needs a strategy — by default it follows
  the operating system; a manual toggle needs `@custom-variant`.
- Repeating a 20-utility class list across ten files — extract a
  component.
- Using `w-screen` for full-width layouts — it includes the scrollbar
  width and causes horizontal overflow. Use `w-full` or `max-w-*`.
- Ignoring `focus-visible:` — keyboard users need visible focus; Tailwind
  makes it one utility, so there is no excuse to skip it.

## Examples

CSS entry file with a theme:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: #2563eb;
  --color-brand-700: #1d4ed8;
  --font-display: "Sora", system-ui, sans-serif;
  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

Responsive card grid with dark mode:

```html
<section class="mx-auto max-w-6xl px-4 py-8">
  <h1 class="font-display text-3xl font-bold text-neutral-900 dark:text-white">
    Articles
  </h1>
  <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <article class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 class="text-lg font-semibold">
        <a href="/articles/example" class="hover:text-brand-500 focus-visible:outline-2 focus-visible:outline-brand-500">
          Example article
        </a>
      </h2>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        A short summary of the article.
      </p>
    </article>
  </div>
</section>
```

## Validation Checklist

- [ ] The project builds and Tailwind v4 generates the expected CSS.
- [ ] Design tokens live in `@theme`; no repeated arbitrary values remain.
- [ ] Layouts are mobile-first with `min-width` breakpoint variants.
- [ ] Dark mode works (system preference or a class toggle, as designed).
- [ ] Interactive elements have `focus-visible:` styles.
- [ ] Repeated utility combinations are extracted into components.
- [ ] No dynamically constructed class names are hiding from the scanner.

## Expected Deliverables

- Tailwind-styled markup and a CSS entry file with `@theme` tokens.
- Components extracted from repeated utility combinations.
- A note on the dark-mode strategy and any custom variants added.

## References

- [Tailwind CSS documentation](https://tailwindcss.com/docs) — utilities,
  variants, and configuration.
- [Tailwind CSS installation](https://tailwindcss.com/docs/installation) —
  setup guides.
- [Tailwind CSS upgrade guide](https://tailwindcss.com/docs/upgrade-guide) —
  v3 to v4 changes.
- Related skills in this repository: `css`, `modern-css`, `shadcn-ui`,
  `responsive-design`, `accessibility`.
