---
name: responsive-design
description: >
  Design and build layouts that adapt fluidly to any viewport, from small
  phones to wide desktops, using fluid grids, flexible media, and media
  queries. Use when making a page responsive, fixing layouts that break on
  mobile, choosing breakpoints, building mobile-first styles, or auditing a
  site across screen sizes and orientations.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Responsive Design

## Purpose

This skill makes a layout work on every screen: content reflows instead of
overflowing, touch targets stay usable, images scale to the device, and
navigation adapts without hiding essential function. The approach is
mobile-first — the narrow layout is the default, and wider layouts are
progressive enhancements — so the smallest device gets a complete,
working page.

## When to Use

- Building a new layout that must work on phones, tablets, and desktops.
- Fixing horizontal overflow, cramped text, or broken navigation on small
  screens.
- Choosing breakpoints and deciding what changes at each one.
- Making images, video, tables, and forms adapt to narrow viewports.
- Auditing an existing site across screen sizes before launch.

## When Not to Use

- Foundational CSS layout and selectors: use `css`.
- Container-aware components that adapt to their parent rather than the
  viewport: use `modern-css` for container queries.
- Framework-specific responsive utilities: use `tailwind-css` for
  Tailwind's breakpoint system.
- Performance optimization of responsive images in depth: use
  `frontend-performance`.

## Prerequisites

- Valid HTML (see `html`) and working base CSS (see `css`).
- The viewport meta tag in the document head; without it, mobile browsers
  render a desktop-width layout.
- A way to test at multiple widths: browser developer tools device mode
  plus at least one real small-screen device when possible.
- Knowledge of the site's content priorities: what must stay visible on a
  phone, and what can move or collapse.

## Official Documentation

- [MDN Web Docs: CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries) —
  media query syntax, features, and examples.
- [MDN Web Docs: responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) —
  guided introduction to fluid layouts and breakpoints.
- [web.dev: Learn Responsive Design](https://web.dev/learn/design/) —
  a full course on responsive patterns.

## Required Workflow

1. Confirm the viewport meta tag is present:
   `<meta name="viewport" content="width=device-width, initial-scale=1">`.
2. Write the base styles for the narrowest viewport first (mobile-first),
   with a single-column flow and full-width content.
3. Add `min-width` media queries only where the layout actually needs to
   change; let content, not device names, decide breakpoints.
4. Make media flexible: `max-width: 100%` on images and video, `srcset`
   and `sizes` for resolution-appropriate images.
5. Adapt navigation: collapse to a disclosure or menu button on narrow
   screens, keeping all links reachable by keyboard.
6. Handle wide content (tables, code blocks, embeds) with horizontal
   scrolling wrappers or restructured layouts.
7. Test at 320px, 375px, 768px, 1024px, and 1440px, plus landscape
   orientation, checking for overflow, overlap, and unreachable content.
8. Test with browser zoom at 200%: the layout must remain usable, which
   is also an accessibility requirement.

## Implementation Standards

- Mobile-first: base styles target small screens; `min-width` media
  queries add complexity as space grows. Avoid `max-width` queries as the
  primary mechanism.
- Breakpoints derive from content: add a breakpoint when the line length
  gets too long, a grid gets too cramped, or a component stops fitting —
  not at fixed device widths. Common content-driven ranges cluster around
  40rem, 48rem, 64rem, and 80rem, but the content decides.
- Fluid grids: use fractional units, `minmax()`, and `auto-fit` /
  `auto-fill` in grid so columns wrap naturally instead of needing a
  breakpoint for every change.
- Fluid type and spacing: use `clamp()` so text and gaps scale smoothly
  between breakpoints instead of jumping.
- Touch targets: interactive elements are at least 44 by 44 CSS pixels
  as the practical target (WCAG 2.2 AAA criterion 2.5.5, and the iOS /
  Android platform guideline), with adequate spacing between adjacent
  targets. The WCAG 2.2 AA minimum is 24 by 24 CSS pixels
  (criterion 2.5.8, with a spacing exception).
- No horizontal scrolling on the page itself at any width from 320px up;
  only deliberate inner containers (tables, code) may scroll horizontally.
- Line length: body text stays between roughly 45 and 75 characters per
  line; constrain text containers with `max-width` in `ch` units.
- Images: `srcset` with width descriptors plus `sizes` matching the
  layout, so each viewport downloads an appropriately sized file.
- Forms: inputs stack full-width on narrow screens; labels stay above
  fields; avoid multi-column forms below tablet widths.
- Use relative units (`rem`, `%`, `vw`, `cqw`) for layout dimensions;
  fixed pixel widths on containers are a last resort.

## Best Practices

- Design the narrow layout first in the mockup, not just in code: if the
  phone layout is an afterthought, it will be a compromise.
- Use `grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))` for
  card grids that reflow without any media query.
- Test with real content, not short dummy strings: long words, long URLs,
  and long titles are what break layouts.
- Keep navigation reachable: a hamburger menu must be a real `button`
  with `aria-expanded`, and the menu must close on Escape and on focus
  leaving it.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` alongside
  viewport queries; responsiveness includes user preferences.
- Check landscape phones (short height, wide width): fixed headers and
  tall heroes can consume the whole viewport.
- Use `overflow-wrap: break-word` on content that may contain long
  unbroken strings such as URLs.

## Security Considerations

- Responsive design has no direct security surface. Two cautions apply:
  do not hide security-relevant controls (logout, consent, warnings) at
  small widths — hiding is not the same as removing, and users must be
  able to reach them on every device.
- Do not use CSS to visually reorder content so that what a screen-reader
  or keyboard user encounters contradicts what a sighted user sees in a
  way that changes the meaning of an action (for example a submit button
  appearing before the terms it confirms).

## Performance Considerations

- Responsive images are the biggest win: `srcset` and `sizes` can cut
  mobile image weight dramatically. Never serve a 2000px image to a
  360px screen.
- Do not hide heavy content with `display: none` and call it responsive:
  hidden images and videos still download unless lazy-loaded. Use
  `loading="lazy"` or avoid rendering the element at all.
- Each media query adds negligible CSS cost; the cost comes from the
  assets the layout loads, not the queries themselves.
- Avoid layout shift when a breakpoint changes the layout: reserve space
  for images and ads, and do not swap font sizes so aggressively that
  content jumps.

## Common Mistakes

- Desktop-first media queries — starting wide and patching down leaves
  the phone layout as a degraded afterthought. Start narrow.
- Missing viewport meta tag — mobile browsers render at desktop width and
  shrink the page, making everything tiny.
- Fixed device breakpoints copied from a tutorial — breakpoints should
  follow the content; a layout that breaks at 900px needs a breakpoint
  at 900px, not at a "tablet" value.
- `display: none` as a responsive strategy — hidden content still
  downloads, and keyboard users may still reach it. Restructure or
  conditionally render instead.
- Tiny tap targets — links and buttons sized for a mouse are unusable on
  touch. Keep targets at least 44 by 44 CSS pixels.
- Tables that overflow — a wide table on a phone breaks the page. Wrap it
  in a scrollable container with a visible scroll cue, or restructure it.
- Text sized in `px` with no fluid scaling — either too small on phones
  or too large on desktops. Use `rem` with `clamp()` where scaling helps.
- Testing only in device mode — emulators miss real-device issues such as
  browser chrome height and touch behavior. Test on a real device before
  launch.

## Examples

Mobile-first card grid that reflows without breakpoints:

```css
.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}
```

Content-driven breakpoint and fluid heading:

```css
.article {
  max-width: 65ch;
  margin-inline: auto;
  padding-inline: 1rem;
}

.article h1 {
  font-size: clamp(1.75rem, 1.25rem + 2.5vw, 3rem);
  line-height: 1.1;
}

@media (min-width: 48rem) {
  .article { padding-inline: 2rem; }
}
```

Responsive image with `srcset`:

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1600.jpg 1600w"
  sizes="(max-width: 48rem) 100vw, 50vw"
  alt="A sourdough loaf cooling on a rack"
  width="1600" height="900">
```

## Validation Checklist

- [ ] The viewport meta tag is present and correct.
- [ ] No horizontal page scrolling at 320px, 375px, 768px, 1024px, or
      1440px widths.
- [ ] The layout remains usable at 200% browser zoom.
- [ ] All touch targets are at least 44 by 44 CSS pixels.
- [ ] Navigation is fully reachable by keyboard at the narrowest width.
- [ ] Images load at sizes appropriate to the viewport (checked in the
      network panel).
- [ ] Wide tables and code blocks scroll within their own containers.

## Expected Deliverables

- Mobile-first stylesheets with content-driven breakpoints and fluid
  grids, type, and spacing.
- Responsive images using `srcset` and `sizes` where images are part of
  the layout.
- A test summary listing the widths checked and any issues found and fixed.

## References

- [MDN: CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries) —
  media query syntax and features.
- [MDN: responsive design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) —
  fluid layout fundamentals.
- [web.dev: Learn Responsive Design](https://web.dev/learn/design/) —
  responsive patterns course.
- Related skills in this repository: `css`, `modern-css`, `frontend-performance`,
  `accessibility`.
