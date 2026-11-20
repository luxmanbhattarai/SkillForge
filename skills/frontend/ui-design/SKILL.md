---
name: ui-design
description: >
  Design clear, consistent, usable interfaces using layout, typography,
  color, spacing, and hierarchy. Use when designing a page or component,
  choosing a type scale or color palette, improving visual hierarchy,
  building a design system, or reviewing an interface for usability and
  consistency.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# UI Design

## Purpose

This skill turns a functional interface into a usable one: clear visual
hierarchy so users see what matters first, consistent spacing and
typography so the interface feels coherent, and affordances that make
interactive elements obvious. It covers layout, type, color, spacing, and
feedback — the decisions that determine whether users understand an
interface at a glance or have to work to use it.

## When to Use

- Designing a new page, screen, or component.
- Choosing a type scale, color palette, or spacing system.
- Improving visual hierarchy, readability, or scanability.
- Building or extending a design system or component library.
- Reviewing an interface for consistency and usability problems.

## When Not to Use

- Implementing the design in code: use `css`, `tailwind-css`, or
  `shadcn-ui`.
- Markup structure and semantics: use `html` or `semantic-html`.
- Accessibility conformance testing: use `accessibility`.
- Performance optimization: use `frontend-performance`.

## Prerequisites

- Knowledge of the content, the user, and the task the interface must
  support; design without a user task is decoration.
- The brand constraints that exist (logo, brand colors, tone), if any.
- A way to preview the design: a browser, a design tool, or a prototype.
- Familiarity with `css` so design decisions map to implementable styles.

## Official Documentation

- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) —
  the implementation reference for the design decisions here.
- [Laws of UX](https://lawsofux.com/) — research-backed principles
  (Fitts, Hick, Miller) that inform layout and interaction decisions.
- [Nielsen Norman Group articles](https://www.nngroup.com/articles/) —
  usability research and guidelines.
- [Material Design guidelines](https://m3.material.io/) — a complete
  design system reference for patterns, type, and color.

## Required Workflow

1. Define the user's goal for the screen and the single most important
   action or piece of information. Everything else is secondary.
2. Establish hierarchy: one primary element, supporting elements, and
   background chrome — in that order of visual weight.
3. Choose the layout grid and spacing scale before placing elements; a
   consistent grid makes alignment decisions automatic.
4. Set the type scale: display, heading, body, and caption sizes with
   consistent line heights. Body text must be readable at its intended
   size.
5. Choose the color palette: a neutral scale, one primary accent, and
   semantic colors (success, warning, error, info). Check contrast for
   every text/background pair.
6. Design states, not just screens: empty, loading, error, success,
   hover, focus, and disabled states for every interactive element.
7. Review the result at the smallest and largest target widths, and with
   real content — long titles, long names, missing images.
8. Get feedback from someone who has not seen the design before; fresh
   eyes catch what familiarity hides.

## Implementation Standards

- Hierarchy: one clear primary action per screen; secondary actions are
  visually quieter; destructive actions are distinct and require
  confirmation.
- Spacing: use a single spacing scale (for example 4px base, 8px
  increments) throughout; related elements sit closer together than
  unrelated ones.
- Typography: a type scale with a consistent ratio (for example 1.25);
  body text at least 16px (1rem) on the web; line height 1.4-1.7 for
  body text, 1.1-1.3 for headings; line length 45-75 characters.
- Color: a neutral scale (5-9 steps), one primary accent, and semantic
  colors for status. Text contrast meets WCAG AA (4.5:1 normal, 3:1
  large). Never use color alone to convey meaning.
- Touch targets: at least 44 by 44 CSS pixels for interactive elements.
- Buttons: labels are verbs that say what happens ("Save changes", not
  "OK"); primary buttons are visually distinct from secondary ones.
- Forms: one column for most forms; labels above fields; inline
  validation with specific, constructive error messages; the submit
  button states the outcome.
- Navigation: consistent placement across pages; the current location is
  clearly indicated; no more than about seven top-level items.
- Feedback: every user action gets a visible response — a loading state,
  a success message, or an error — within a perceptible time.
- Icons: used with text labels for anything that is not universally
  understood; decorative icons are hidden from assistive technology.
- Density: match the audience — dense data tables for expert tools,
  generous spacing for consumer and content sites.
- Consistency: the same element looks and behaves the same everywhere;
  a new pattern needs a reason to exist.

## Best Practices

- Design for the content, not the container: a layout that only works
  with short titles will break on real data.
- Use whitespace deliberately: it groups related items, separates
  unrelated ones, and gives the eye a place to rest.
- Reduce choices: Hick's law — every extra option slows decisions. Show
  the common path first and hide the rest behind progressive disclosure.
- Make the interface forgiving: confirm destructive actions, allow undo
  where possible, and preserve user input when an error occurs.
- Prefer recognition over recall: show options, recent items, and
  context rather than making users remember them.
- Use real data in mockups and prototypes: placeholder-length content
  hides layout problems.
- Keep the visual language boring in a good way: consistency beats
  novelty for usability.
- Design the empty state as carefully as the full state: an empty list
  should explain what will appear and how to get there.

## Security Considerations

- Design must not hide security-relevant information: consent checkboxes,
  permission requests, and warnings must be prominent, not buried or
  styled to be overlooked.
- Destructive actions need clear labeling and confirmation; a design that
  makes deletion look like a routine action is a safety problem.
- Do not design patterns that trick users into actions they did not
  intend (dark patterns): pre-checked consent, hidden costs, or
  misleading button labels.
- Error messages must not leak internal details (stack traces, internal
  identifiers, database errors) to the user.

## Performance Considerations

- Design decisions have performance costs: every font weight, every
  image treatment, and every animation adds weight. Prefer system fonts
  or one to two web font weights.
- Avoid designs that require many large images above the fold; a hero
  image is one decision, a carousel of five is five downloads.
- Prefer CSS effects (shadows, gradients, transforms) over image assets
  for decoration.
- Animation should be subtle and purposeful; heavy motion costs frames
  and distracts from content. Respect `prefers-reduced-motion`.

## Common Mistakes

- No clear hierarchy — everything is bold, large, or colored, so nothing
  stands out. Pick one primary element per screen.
- Too many type sizes and weights — a page with eight font sizes looks
  chaotic. Use a scale with four or five steps.
- Low-contrast text — light gray on white fails WCAG and frustrates
  everyone, not just people with low vision.
- Mystery meat navigation — icon-only controls with no labels force users
  to guess. Add text labels.
- Designing only the happy path — empty, loading, and error states get
  no design and look broken in production.
- Inconsistent spacing — elements aligned by eye instead of by a grid
  look sloppy at a glance.
- Forms with placeholder-only labels — the hint disappears on input and
  the user forgets what the field was. Use visible labels.
- Carousels as a content strategy — users rarely advance past the first
  slide. Put the important content in the page instead.
- Copying a trendy pattern that does not fit the task — a design system
  from a different product solves a different problem.

## Examples

Type scale and spacing tokens (CSS custom properties):

```css
:root {
  /* Type scale, ratio 1.25 */
  --text-xs: 0.8rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.563rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;

  /* Spacing scale, 4px base */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
}
```

A card with clear hierarchy: title first, supporting text second, action
last, with generous spacing and a single accent:

```html
<article class="card">
  <h2 class="card-title">Sourdough starter troubleshooting</h2>
  <p class="card-summary">
    Why your starter is sluggish and what to change first.
  </p>
  <p class="card-meta">6 min read · 20 November 2026</p>
  <a href="/articles/starter-troubleshooting" class="card-link">
    Read the guide
  </a>
</article>
```

## Validation Checklist

- [ ] One primary action or piece of information is obvious at a glance.
- [ ] Spacing, type sizes, and colors come from the defined scales.
- [ ] Text contrast meets WCAG AA for every text/background pair.
- [ ] Empty, loading, error, and success states are designed.
- [ ] Touch targets are at least 44 by 44 CSS pixels.
- [ ] The design works at the smallest and largest target widths with
      real content.
- [ ] A fresh reviewer can complete the screen's main task without help.

## Expected Deliverables

- Design decisions documented as tokens (type scale, spacing scale,
  color palette) and component patterns.
- Page or component designs covering all states (empty, loading, error,
  success).
- A short rationale for hierarchy choices and any deviations from the
  existing design system.

## References

- [Laws of UX](https://lawsofux.com/) — research-backed design
  principles.
- [Nielsen Norman Group articles](https://www.nngroup.com/articles/) —
  usability research.
- [Material Design guidelines](https://m3.material.io/) — a complete
  design system reference.
- [MDN Web Docs: CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) —
  implementation reference.
- Related skills in this repository: `css`, `tailwind-css`, `shadcn-ui`,
  `accessibility`, `responsive-design`.
