---
name: modern-css
description: >
  Use current CSS features such as cascade layers, custom properties,
  container queries, nesting, :has(), logical properties, and modern
  selectors to write cleaner, more powerful stylesheets. Use when adopting
  newer CSS capabilities, refactoring legacy CSS, building container-aware
  components, or replacing JavaScript-driven styling with pure CSS.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Modern CSS

## Purpose

This skill applies current CSS capabilities — cascade layers, container
queries, nesting, relational selectors, scoped custom properties, and
modern color and layout features — so stylesheets need less JavaScript,
fewer overrides, and fewer hacks. The goal is components that adapt to
their container, themes that switch with a single property change, and a
cascade that is explicit rather than accidental.

## When to Use

- Refactoring legacy CSS that relies on specificity hacks or `!important`.
- Building components that must adapt to their container's size, not just
  the viewport.
- Theming (light/dark mode, brand variants) through custom properties.
- Replacing JavaScript-driven conditional styling with `:has()` or
  container queries.
- Adopting cascade layers to make stylesheet ordering explicit.

## When Not to Use

- Foundational styling, layout, and the cascade: use `css` first.
- Utility-first styling: use `tailwind-css`.
- Responsive design strategy and breakpoints as the main concern: use
  `responsive-design`.
- Supporting very old browsers is a hard requirement: stick to `css` and
  check support on Can I Use before adopting any feature here.

## Prerequisites

- Solid grounding in the `css` skill: selectors, specificity, flexbox,
  grid, and custom properties.
- Knowledge of the project's browser support target, so each feature can
  be checked against it.
- A build step or PostCSS setup only if the project must support browsers
  that lack a feature being used; otherwise write native CSS.

## Official Documentation

- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) —
  reference and guides for every feature covered here.
- [Can I Use](https://caniuse.com/) — verify browser support for cascade
  layers, container queries, nesting, `:has()`, and other features.
- [W3C CSS home](https://www.w3.org/Style/CSS/) — current specifications
  for CSS Conditional, Cascade, and Scoping modules.

## Required Workflow

1. Confirm the browser support target, then check each planned feature on
   Can I Use; only use features supported by the target, or provide a
   fallback.
2. Declare cascade layers up front with `@layer` (for example `reset`,
   `base`, `components`, `utilities`) so layer order, not source order,
   decides conflicts.
3. Define design tokens as custom properties on `:root`, and override
   them per theme with a `[data-theme]` selector or `prefers-color-scheme`.
4. Write component styles with nesting only where it clarifies the
   relationship; keep nesting shallow (two levels at most).
5. For container-aware components, set `container-type` on the parent and
   write `@container` queries for the component's own breakpoints.
6. Use `:has()` for parent-conditional styling (for example a card that
   changes when it contains an image) instead of adding JavaScript classes.
7. Test in the project's target browsers, including a browser that lacks
   each feature, to confirm fallbacks degrade gracefully.

## Implementation Standards

- Cascade layers: declare the layer order first with
  `@layer reset, base, components, utilities;` and put every rule inside
  a layer. Unlayered styles beat layered styles, so do not mix them.
- Custom properties: define tokens at `:root`, scope component variables
  to the component class, and use fallback values in `var()` calls where
  a variable might be undefined (`var(--gap, 1rem)`).
- Nesting: use the `&` selector for pseudo-classes, pseudo-elements, and
  child selectors inside a rule. Keep nesting to two levels; deeper
  nesting recreates specificity problems.
- Container queries: set `container-type: inline-size` on the container
  element and write `@container (min-width: 30rem)` queries inside the
  component. Name containers with `container-name` when several containers
  are in scope.
- `:has()`: use for relational styling such as `figure:has(figcaption)` or
  `form:has(input:invalid)`; do not use it to replace semantics that
  belong in HTML.
- Logical properties: use `margin-inline`, `padding-block`,
  `inset-inline-start`, and `border-start-start-radius` so layouts work in
  right-to-left languages.
- Modern color: prefer `oklch()` or `hsl()` for perceptually uniform
  color manipulation; use `color-mix()` to derive tints and shades from
  tokens instead of hard-coding new hex values.
- Sizing: use `clamp()` for fluid type and spacing, `min()`/`max()` for
  bounded widths, and container query units (`cqw`) inside containers.
- Scope styles with `@scope` where supported to keep component styles
  from leaking, instead of relying on naming conventions alone.

## Best Practices

- Provide a plain-CSS fallback before a modern feature: write the simple
  rule first, then the enhanced rule inside `@supports` or a layer that
  only applies where the feature exists.
- Use `@supports (selector(:has(*)))` to gate `:has()` usage where the
  support target is uncertain.
- Keep custom properties semantic (`--surface-card`) rather than literal
  (`--white`), so themes can redefine them.
- Prefer `light-dark()` or `prefers-color-scheme` media queries for
  theming over maintaining two parallel stylesheets.
- Use `:is()` and `:where()` to group selectors; `:where()` contributes
  zero specificity, which is ideal for resets and defaults.
- Use `aspect-ratio` for media containers instead of padding hacks.
- Animate with `transform` and `opacity`; use `@media
  (prefers-reduced-motion: reduce)` to disable non-essential motion.

## Security Considerations

- The same cautions as `css` apply: never accept user-supplied stylesheets
  or `style` attributes with `url()` values pointing at untrusted hosts.
- Do not use CSS to hide security-relevant UI (for example concealing a
  consent checkbox or a warning). Hidden content must not change what a
  user believes they are agreeing to.
- Custom properties can carry URLs through `var()`; treat any custom
  property value that ends up in `url()` as untrusted if its source is
  user input.

## Performance Considerations

- Container queries are cheap, but `container-type: size` requires the
  container to have a definite size; prefer `inline-size` to avoid layout
  constraints.
- `:has()` can be expensive when applied to broad selectors on large
  documents; scope it to a specific component class.
- Deep nesting compiles to long selectors in older tooling; keep nesting
  shallow to keep the generated CSS small.
- Custom properties are fast, but animating a custom property registered
  with `@property` triggers style recalculation; animate `transform` and
  `opacity` instead.
- `@layer` ordering has no runtime cost; it is resolved at parse time.

## Common Mistakes

- Mixing layered and unlayered styles — unlayered rules always win over
  layered ones, which silently breaks the intended order. Put everything
  in layers.
- Forgetting `container-type` — a `@container` query does nothing until
  an ancestor declares itself a container.
- Using `container-type: size` by default — it forces the container's
  size and breaks content-driven height. Use `inline-size` unless both
  dimensions are genuinely needed.
- Nesting five levels deep — recreates the specificity and readability
  problems nesting was meant to solve. Two levels at most.
- `:has()` on `body` or `html` — forces the browser to re-evaluate the
  whole document on every DOM change. Scope it tightly.
- Custom properties without fallbacks — a missing variable makes the whole
  declaration invalid. Add `var(--x, fallback)` where a variable may be
  absent.
- `clamp()` with a preferred value outside the min/max range — the value
  is clamped, which can produce unexpected sizes. Check the middle value
  stays between the bounds at target viewports.
- Assuming `light-dark()` works everywhere — check support and provide a
  `prefers-color-scheme` fallback.

## Examples

Cascade layers with an explicit order:

```css
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }
}

@layer base {
  :root {
    --color-text: #1a1a1a;
    --color-surface: #ffffff;
  }
  body { color: var(--color-text); background: var(--color-surface); }
}

@layer components {
  .card { border: 1px solid #e5e5e5; border-radius: 0.5rem; padding: 1rem; }
  .card:has(img) { padding: 0; overflow: hidden; }
}
```

Container query for a card that adapts to its container:

```css
.card-list { container-type: inline-size; }

.card { display: grid; gap: 1rem; }

@container (min-width: 32rem) {
  .card { grid-template-columns: 12rem 1fr; }
}
```

Fluid type with `clamp()` and a theme switch:

```css
:root {
  --font-size-heading: clamp(1.75rem, 1.25rem + 2.5vw, 3rem);
  color-scheme: light dark;
}

[data-theme="dark"] {
  --color-text: #f5f5f5;
  --color-surface: #111111;
}
```

## Validation Checklist

- [ ] Every feature used is supported by the project's browser target, or
      has a tested fallback.
- [ ] All rules live inside declared cascade layers, with no unlayered
      author styles.
- [ ] Nesting is at most two levels deep.
- [ ] Container queries have a matching `container-type` on an ancestor.
- [ ] `:has()` selectors are scoped to specific components.
- [ ] The theme switch changes all token-driven colors with no hard-coded
      values left behind.
- [ ] Reduced-motion preferences disable non-essential animation.

## Expected Deliverables

- Stylesheets using cascade layers, container queries, or nesting as
  appropriate, with a note on the browser support target checked.
- Theme tokens defined as custom properties with a working light/dark
  switch where theming was requested.
- Fallback behavior documented for any feature outside the support target.

## References

- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) —
  reference for layers, container queries, nesting, and `:has()`.
- [Can I Use](https://caniuse.com/) — browser support data.
- [W3C CSS home](https://www.w3.org/Style/CSS/) — current CSS
  specifications.
- Related skills in this repository: `css`, `responsive-design`,
  `tailwind-css`, `accessibility`.
