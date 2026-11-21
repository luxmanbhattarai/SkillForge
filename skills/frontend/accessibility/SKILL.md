---
name: accessibility
description: >
  Make web interfaces usable by everyone, including people using screen
  readers, keyboards, and other assistive technology, following WCAG 2.2.
  Use when auditing a page for accessibility, fixing keyboard navigation,
  adding ARIA correctly, improving color contrast, writing alt text, or
  making forms, dialogs, and custom widgets accessible.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Accessibility

## Purpose

This skill makes a web interface usable by everyone: people who navigate
by keyboard, people who use screen readers, people with low vision, and
people with motor or cognitive differences. It applies WCAG 2.2 at level
AA as the working target, prefers native HTML semantics over ARIA, and
treats automated checks as a starting point — never as proof that a page
is accessible.

## When to Use

- Auditing a page, component, or flow for accessibility.
- Fixing keyboard navigation, focus order, or focus visibility.
- Adding ARIA attributes, roles, or live regions to custom widgets.
- Checking color contrast, text sizing, and motion sensitivity.
- Writing alt text, labels, and error messages.
- Making forms, dialogs, menus, tabs, and other interactive patterns
  accessible.

## When Not to Use

- Basic valid markup without the accessibility focus: use `html`.
- Choosing semantic elements as the primary task: use `semantic-html`.
- Styling and layout: use `css` or `responsive-design`.
- Framework component patterns: use `react`, `nextjs`, or `shadcn-ui`
  and apply this skill's checks to the result.

## Prerequisites

- The page or component to audit, running in a browser.
- A keyboard for testing navigation, and a screen reader for verification
  (NVDA or VoiceOver are the common choices).
- An automated checker (axe DevTools, Lighthouse, or the WAVE extension)
  for the first pass — with the understanding that it catches only a
  fraction of issues.
- Knowledge of the page's purpose and user flows, so testing follows real
  tasks rather than random clicking.

## Official Documentation

- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) —
  the success criteria, filterable by level.
- [WAI tutorials](https://www.w3.org/WAI/tutorials/) — practical
  guidance for pages, forms, images, and navigation.
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) —
  patterns for accessible widgets (dialog, menu, tabs, accordion).
- [MDN: Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) —
  practical guides and reference.

## Required Workflow

1. Run an automated check (axe DevTools or Lighthouse) and fix every
   issue it reports — but treat this as the floor, not the ceiling.
2. Test with keyboard only: Tab through the page in order, activate every
   control, open and close every dialog and menu, and confirm focus is
   always visible and never trapped unexpectedly.
3. Test with a screen reader: navigate by headings and landmarks, fill in
   forms, and confirm every control announces its name, role, and state.
4. Check contrast: text against its background meets 4.5:1 for normal
   text and 3:1 for large text and UI components (WCAG AA).
5. Check the page at 200% zoom and at a 320px width: content must remain
   usable with no loss of function.
6. Check motion: non-essential animation respects
   `prefers-reduced-motion`, and nothing flashes more than three times
   per second.
7. Fix issues at the source: prefer native elements over ARIA, fix the
   markup before adding attributes, and re-test after each fix.

## Implementation Standards

- Target WCAG 2.2 level AA. Level AAA is aspirational; do not claim it
  without a full audit.
- Native first: use `button`, `a`, `input`, `select`, `details`, and
  semantic landmarks before reaching for ARIA. The first rule of ARIA is
  not to use ARIA when a native element works.
- Keyboard: every interactive element is reachable and operable by
  keyboard, in a logical order that matches the visual order. Focus is
  always visible (`:focus-visible` styles on all interactive elements).
- Focus management: opening a dialog moves focus into it and traps focus
  until it closes; closing returns focus to the trigger. Skip links let
  keyboard users bypass repeated navigation.
- Names and labels: every control has an accessible name (visible label,
  `aria-label`, or `aria-labelledby`). Every image has `alt`: descriptive
  for meaningful images, empty for decorative ones.
- Landmarks and headings: one `main`, a logical heading order with no
  skipped levels, and distinct labels for repeated landmarks (see
  `semantic-html`).
- Forms: labels are visible and associated with `for`/`id`; errors are
  announced with `aria-describedby` or `aria-live`, identify the field,
  and explain how to fix the problem; required fields are marked in text,
  not by color alone.
- Color: information is never conveyed by color alone; contrast meets
  4.5:1 for normal text and 3:1 for large text and UI components.
- Live regions: status updates use `role="status"` (polite) or
  `role="alert"` (assertive) so screen readers announce them without a
  page reload.
- ARIA: use roles, states, and properties only where the ARIA
  specification allows them for the element; never put a role on an
  element whose implicit role conflicts with it.
- Motion: honor `prefers-reduced-motion` for animation, parallax, and
  auto-playing motion; provide a way to pause, stop, or hide any moving
  content that lasts more than five seconds.
- Touch targets: at least 24 by 24 CSS pixels (WCAG 2.2 AA minimum),
  with 44 by 44 CSS pixels as the practical target.
- Text: users can resize text to 200% without loss of content or
  function; do not disable zoom with `user-scalable=no` or
  `maximum-scale=1`.

## Best Practices

- Write alt text that conveys the image's purpose in context, not a
  literal description of pixels. A chart's alt text summarizes the
  trend; a decorative image gets `alt=""`.
- Put the accessible name in visible text whenever possible: a button
  that says "Delete" is better than an icon button with `aria-label`.
- Announce dynamic changes: search results, form errors, and cart
  updates need live regions or focus moves, not silent DOM updates.
- Test with real assistive technology, not just automated tools:
  automated checks catch roughly a third of issues.
- Involve people with disabilities in testing when the stakes are high;
  no checklist replaces lived experience.
- Keep error messages specific and constructive: "Enter a date in the
  format DD/MM/YYYY" beats "Invalid input".
- Use the `lang` attribute correctly, including on passages in a
  different language, so screen readers pronounce content correctly.

## Security Considerations

- Accessibility features must not be used to hide content from sighted
  users while exposing it to assistive technology or crawlers in a
  deceptive way (cloaking).
- Visually hidden text (`.sr-only`) is for genuine accessibility
  context, not for stuffing keywords or hiding disclaimers.
- Do not use ARIA to mislabel a control's purpose: a button that says
  "Cancel" to a screen reader but "Confirm purchase" visually is a
  deception with real consequences.
- CAPTCHAs and bot checks must have accessible alternatives; a challenge
  that only sighted users can pass excludes people.

## Performance Considerations

- Accessibility and performance reinforce each other: semantic HTML,
  proper headings, and native controls are lighter than ARIA-heavy
  custom widgets.
- Screen-reader testing does not add runtime cost; the cost of
  accessibility work is in development and testing time, not in page
  weight.
- Avoid heavy JavaScript widgets when a native element does the job; a
  native `select` is faster and more accessible than a custom dropdown.
- Lazy-loaded content must still be reachable: content that loads on
  scroll should also load when a keyboard user tabs toward it.

## Common Mistakes

- `div` with `onClick` instead of `button` — no keyboard support, no
  role, no focus. Use the real element.
- Icon-only buttons with no accessible name — screen readers announce
  "button" with no purpose. Add `aria-label` or visible text.
- `aria-label` on an element that already has visible text — the two can
  conflict; use `aria-labelledby` to reference the visible text.
- Positive `tabindex` values (`tabindex="1"`) — hijack the tab order and
  confuse everyone. Use `tabindex="0"` to add an element to the order or
  `tabindex="-1"` to make it focusable programmatically.
- Color-only status indicators — a red/green dot means nothing to a
  color-blind user. Add text or an icon with a label.
- Removing focus outlines — keyboard users lose their place. Style focus
  visibly instead.
- `alt` that repeats the caption or says "image of" — redundant. Say what
  matters, or use `alt=""` for decorative images.
- Auto-playing video with sound — disorienting and a WCAG failure.
  Muted autoplay with controls is the minimum; no autoplay is better.
- Assuming automated tools prove accessibility — they catch a fraction of
  issues. Manual keyboard and screen-reader testing is mandatory.

## Examples

Accessible form field with error handling:

```html
<div>
  <label for="email">Email address</label>
  <input
    id="email"
    name="email"
    type="email"
    required
    aria-describedby="email-error"
    aria-invalid="true"
  >
  <p id="email-error" role="alert">
    Enter an email address in the format name@example.com.
  </p>
</div>
```

Skip link and visible focus styles:

```html
<a href="#main" class="skip-link">Skip to main content</a>
<main id="main">
  <!-- page content -->
</main>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  position: static;
  left: auto;
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #fff;
  outline: 2px solid #2563eb;
}

a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

## Validation Checklist

- [ ] Automated checks (axe or Lighthouse accessibility) report zero
      issues.
- [ ] The full flow works with keyboard only, with focus always visible.
- [ ] A screen reader announces every control's name, role, and state.
- [ ] Text contrast meets 4.5:1 (normal) and 3:1 (large text and UI).
- [ ] The page works at 200% zoom and at a 320px width.
- [ ] Dialogs trap focus while open and return focus to the trigger.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Forms announce errors and identify how to fix them.

## Expected Deliverables

- An accessibility audit report: issues found, WCAG criteria affected,
  and fixes applied.
- Fixed markup, styles, and behavior following the standards above.
- Test notes covering keyboard, screen reader, zoom, and contrast checks.

## References

- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) —
  success criteria.
- [WAI tutorials](https://www.w3.org/WAI/tutorials/) — practical
  guidance.
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) —
  widget patterns.
- [MDN: Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) —
  guides and reference.
- Related skills in this repository: `semantic-html`, `html`, `css`,
  `responsive-design`, `shadcn-ui`.
