---
name: css
description: >
  Write maintainable CSS for layout, typography, color, and components
  using the cascade, specificity, and the box model. Use when styling a
  page or component, building layouts with flexbox or grid, writing
  stylesheets, fixing specificity or cascade bugs, or organizing CSS in a
  project. Covers selectors, cascade, layout, and maintainable structure.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# CSS

## Purpose

This skill produces CSS that is predictable, maintainable, and easy to
change: selectors with the lowest specificity that works, a clear cascade
order, layouts built on flexbox and grid, and a file structure that scales
from a single page to a large codebase. It is the foundation every other
frontend styling skill builds on.

## When to Use

- Writing or editing stylesheets for a page, component, or design system.
- Building layouts with flexbox, grid, or positioning.
- Fixing styling bugs caused by specificity, inheritance, or cascade order.
- Organizing CSS files, naming classes, or setting up a stylesheet
  architecture.
- Styling typography, color, spacing, borders, and backgrounds.

## When Not to Use

- Cutting-edge CSS features (container queries, cascade layers, nesting,
  `:has()`): use `modern-css`.
- Utility-first styling with Tailwind: use `tailwind-css`.
- Responsive breakpoints and adaptive layouts as the primary goal: use
  `responsive-design`.
- Component libraries built on Radix primitives: use `shadcn-ui`.

## Prerequisites

- Version range: none — CSS has no version numbers; it is a set of
  modules that advance independently (see Official Documentation below).
- Valid HTML to style (see `html`); CSS cannot fix broken markup.
- Knowledge of the design intent: layout, spacing scale, colors, and type
  scale the stylesheet must implement.
- A browser with developer tools for inspecting computed styles.

## Official Documentation

- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) —
  the practical reference for properties, selectors, and guides.
- [W3C CSS home](https://www.w3.org/Style/CSS/) — links to the current
  CSS specifications.
- [Can I Use](https://caniuse.com/) — browser support data for CSS
  features before relying on them.

CSS has no version numbers: it is a set of modules (Selectors, Flexbox,
Grid, and so on) that advance independently. A feature's readiness is a
browser-support question, not a "CSS version" question — check Can I Use
or MDN before relying on anything newer than the fundamentals here.

## Required Workflow

1. Read the HTML structure and the design, and identify the layout model
   each region needs (flexbox for one-dimensional, grid for
   two-dimensional).
2. Define design tokens first: custom properties for colors, spacing,
   font sizes, and radii, scoped to `:root`.
3. Write base styles: box-sizing reset, body typography, link and heading
   defaults, and focus styles.
4. Style layout containers, then components, then small utilities — in
   that order, so the cascade works with you.
5. Use class selectors for almost everything; reserve ID selectors for
   JavaScript hooks and in-page anchors, not styling.
6. Check the result at several viewport widths and in at least two
   browsers.
7. Remove unused rules and confirm no `!important` remains except where
   explicitly justified in a comment.

## Implementation Standards

- Start every stylesheet with a box-sizing reset:
  `*, *::before, *::after { box-sizing: border-box; }`.
- Prefer class selectors; keep specificity low and flat. Avoid chaining
  more than two or three selectors, and avoid `!important` in author
  styles.
- Use custom properties for repeated values (colors, spacing, font
  stacks) and name them by purpose (`--color-text`) rather than value
  (`--dark-gray`).
- Layout: flexbox for rows and columns of items, grid for two-dimensional
  layouts and page regions. Avoid floats for layout.
- Spacing: use a consistent scale (for example multiples of 4px or 8px)
  expressed through custom properties.
- Typography: set a system font stack or a loaded web font on `body`,
  use relative units (`rem`) for font sizes, and keep line-height between
  1.4 and 1.7 for body text.
- Color: define colors once as custom properties; never scatter hex
  values through component rules.
- Interactive elements must have visible `:focus-visible` styles; never
  remove focus outlines without providing an alternative.
- Media: images and video get `max-width: 100%` so they never overflow
  their container.
- Organize stylesheets by layer: tokens, base, layout, components,
  utilities. Keep one concern per file in larger projects.

### Accessibility

- Color contrast: text 4.5:1, large text and UI components 3:1 —
  verify the actual rendered colors, not the palette swatches.
- Visible focus: style `:focus-visible` on every interactive element;
  never remove outlines without a replacement.
- Honor `prefers-reduced-motion`: disable non-essential animation,
  transitions, and parallax for users who ask for it.
- Never convey information by color alone; pair color with text,
  icon, or pattern.
- Layouts reflow to 320px and survive 200% text resize without
  clipping or overlap; never disable zoom.
- Do not hide needed content from assistive technology with
  `display: none`; use visually-hidden styles for screen-reader-only
  text.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Let the cascade do the work: set defaults once on a parent and let
  children inherit, instead of repeating declarations.
- Use logical properties (`margin-inline-start`, `padding-block`) so
  layouts work in right-to-left languages without extra rules.
- Prefer `gap` over margins for spacing items inside flex and grid
  containers; it avoids double-margin and last-child hacks.
- Use `rem` for font sizes and spacing, `em` for values that should scale
  with the element's own font size, and `px` only for hairlines and
  borders.
- Name classes by purpose, not appearance: `.btn-primary` survives a
  redesign; `.big-blue-button` does not.
- Keep selectors resilient: style by class, not by DOM position, so
  markup can change without breaking styles.
- Comment non-obvious rules (hacks, browser workarounds, magic numbers)
  with the reason, not just the effect.

## Security Considerations

- CSS itself has no direct code-execution risk, but untrusted CSS can
  exfiltrate data: never allow user-supplied stylesheets or `style`
  attributes containing `url()` values that point at attacker-controlled
  hosts.
- Do not embed secrets or internal URLs in stylesheets; CSS files are
  public assets served to every visitor.
- `expression()` and `behavior` properties are legacy attack vectors and
  must never be used.
- Be cautious with CSS that hides content: hidden form fields or
  visually-hidden text must not be used to deceive users or crawlers.

## Performance Considerations

- Keep stylesheets small and remove unused rules; unused CSS still
  downloads, parses, and competes with rendering.
- Inline critical above-the-fold CSS only when measurement shows a real
  benefit; otherwise a single cached external stylesheet is simpler.
- Avoid expensive selectors and properties in hot paths: deep descendant
  selectors, universal selectors in large documents, and animating
  layout properties (`width`, `top`, `left`) are costly.
- Prefer `transform` and `opacity` for animations; they avoid layout and
  paint work.
- Limit web font weights and subsets; each font file is a render-blocking
  download.

## Common Mistakes

- Specificity wars — piling on selectors and `!important` to override
  earlier rules. Fix the cascade order instead.
- Styling by tag name globally (`div { ... }`) — leaks styles into every
  component. Scope with classes.
- Using `px` for font sizes — breaks user font-size preferences. Use `rem`.
- Forgetting `box-sizing: border-box` — widths then exclude padding and
  borders, breaking layouts.
- Margin collapse surprises — vertical margins on adjacent blocks collapse;
  use `gap` in flex/grid containers or account for the collapse.
- `height: 100%` chains — percentage heights need an explicit height on
  every ancestor. Prefer flex/grid stretching or viewport units.
- Removing `:focus` outlines for aesthetics — keyboard users lose their
  place. Style focus visibly instead.
- Fixed pixel widths on containers — breaks small screens. Use `max-width`
  with fluid widths.

## Examples

Design tokens and base styles:

```css
:root {
  --color-text: #1a1a1a;
  --color-surface: #ffffff;
  --color-accent: #2563eb;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --radius: 0.375rem;
  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-body);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-surface);
}

img, video { max-width: 100%; height: auto; }

a:focus-visible, button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

Two-column layout with grid, single column on narrow screens:

```css
.layout {
  display: grid;
  gap: var(--space-4);
  max-width: 72rem;
  margin-inline: auto;
  padding-inline: var(--space-4);
}

@media (min-width: 48rem) {
  .layout { grid-template-columns: 1fr 18rem; }
}
```

## Validation Checklist

- [ ] Box-sizing reset is present and styles use class selectors with low
      specificity.
- [ ] No `!important` remains without a justifying comment.
- [ ] Colors, spacing, and font sizes come from custom properties.
- [ ] Focus styles are visible on all interactive elements.
- [ ] Layout works at 320px, 768px, and 1280px widths without horizontal
      overflow.
- [ ] The stylesheet has no unused rules a linter or coverage check flags.
- [ ] The page renders consistently in at least two browsers.
- [ ] Accessibility: contrast meets 4.5:1/3:1; focus is visible; reduced motion is honored.

## Expected Deliverables

- Stylesheets organized by layer (tokens, base, layout, components),
  using custom properties and low-specificity selectors.
- Layout implementations using flexbox or grid as appropriate.
- A short note on any browser workarounds used and why.

## References

- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) —
  property and selector reference.
- [W3C CSS home](https://www.w3.org/Style/CSS/) — current CSS
  specifications.
- [Can I Use](https://caniuse.com/) — browser support data.
- Related skills in this repository: `modern-css`, `responsive-design`,
  `tailwind-css`, `html`.
