---
name: accessibility-testing
description: >
  Test web applications for accessibility so people using keyboards,
  screen readers, and other assistive technology can use them. Use when
  auditing a page against WCAG, adding automated axe checks, testing
  keyboard navigation and focus, verifying ARIA usage, or fixing an
  accessibility bug or audit finding.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Accessibility Testing

## Purpose

Accessibility testing verifies that a web application works for people
who navigate by keyboard, use screen readers, need high contrast, or
rely on other assistive technology. Automated checks catch roughly a
third of issues; manual keyboard and screen-reader testing catches the
rest. This skill combines both, grounded in the Web Content
Accessibility Guidelines (WCAG), so the product is usable by everyone
and meets legal and contractual accessibility requirements.

## When to Use

- Auditing a page or flow against WCAG before release.
- Adding automated accessibility checks to a test suite or CI.
- Testing keyboard navigation, focus order, and focus visibility.
- Verifying screen-reader announcements for dynamic content.
- Fixing an accessibility bug, audit finding, or user report.
- Reviewing a new component for correct semantics and ARIA use.

## When Not to Use

- Testing visual design quality or brand consistency — that is design
  review, not accessibility testing.
- General functional testing of a flow — use `e2e-testing` or
  `playwright`, and add accessibility checks inside those tests.
- Performance measurement — use `performance-testing`.
- Writing the accessible component itself; this skill verifies
  behavior, though its findings often drive the fix.

## Prerequisites

- A runnable build of the pages under test.
- An automated checker installed (axe-core, directly or through a
  Playwright integration) for the automated layer.
- A keyboard and a browser with developer tools for manual testing.
- A screen reader for verification when the flow is critical (NVDA on
  Windows, VoiceOver on macOS).
- Familiarity with WCAG 2.x success criteria at level AA, the usual
  conformance target.

## Official Documentation

- [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) — the
  Web Content Accessibility Guidelines.
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) —
  patterns for interactive components.
- [MDN accessibility guides](https://developer.mozilla.org/en-US/docs/Web/Accessibility) —
  practical web accessibility documentation.
- [axe-core](https://github.com/dequelabs/axe-core) — the automated
  accessibility engine.
- [pa11y](https://pa11y.org/) — command-line accessibility testing.

## Required Workflow

1. Define the scope: which pages and flows, and the target level
   (WCAG 2.x AA is the standard target).
2. Run automated checks on each page in scope and record every
   violation with its rule, element, and impact.
3. Test keyboard-only navigation through each flow: every interactive
   element reachable, focus order logical, focus always visible, no
   keyboard traps, and Escape closes dialogs and menus.
4. Test with a screen reader on the critical flows: headings and
   landmarks structure the page, images have useful alternative text,
   form fields have labels, and dynamic updates are announced.
5. Check visual basics: text contrast, text resizing to 200% without
   loss of content, no content conveyed by color alone, and no
   flashing content.
6. Fix findings in priority order (blockers first), re-running the
   automated checks after each fix.
7. Add automated checks to the test suite or CI for the pages in
   scope so regressions are caught automatically.
8. Report remaining issues that automation cannot verify, with manual
   test steps for a human reviewer.

## Implementation Standards

- Automated checks must run against the rendered page in a real
  browser, not against static HTML, so client-rendered content is
  included.
- Every violation is recorded with: the WCAG criterion, the affected
  element, the impact on users, and the fix.
- Use semantic HTML first (`button`, `nav`, `main`, headings, labels);
  ARIA is a supplement for what HTML cannot express, never a
  replacement for native semantics.
- Interactive elements must be keyboard-operable and have a visible
  focus indicator; do not remove focus outlines without providing an
  equivalent.
- All images that convey meaning need alternative text; decorative
  images must be hidden from assistive technology.
- Form inputs need associated labels; placeholder attributes are not
  labels.
- Dynamic content changes (toasts, errors, live results) must use
  appropriate live regions so screen readers announce them.
- Color contrast targets: 4.5:1 for normal text and 3:1 for large
  text under WCAG AA.
- Automated checks in CI must fail the build on violations above the
  agreed severity; warnings alone get ignored.

## Best Practices

- Test with the keyboard before reaching for tools: if you cannot
  complete the flow by keyboard, users cannot either.
- Run automated checks on every page template, not just the homepage —
  forms, dialogs, and error states hide the most issues.
- Check the page at 200% zoom and on a narrow viewport; responsive
  layouts can break focus order and hide content.
- Prefer fixing the underlying component over patching one page; a
  fixed dialog component fixes every dialog.
- Include real users of assistive technology in testing when the
  stakes are high; automated tools and simulated testing cannot
  replace lived experience.
- Keep a short accessibility checklist in the pull request template
  so every change gets a basic review.

## Security Considerations

- Accessibility testing does not introduce security risk on its own,
  but test pages must not expose real user data or credentials.
- Screen-reader testing of authentication flows should use test
  accounts; never read real credentials aloud or capture them in
  recordings.
- Alternative text and labels must not leak sensitive information
  (for example, an image description containing an internal identifier).

## Performance Considerations

- Automated axe scans add seconds per page; run them in CI on the
  pages that changed or on a nightly full sweep, not on every keystroke.
- Large pages with many elements slow down scans; scope scans to the
  main content when a full-page scan is too slow.
- Accessibility fixes (semantic HTML, fewer ARIA hacks) usually
  improve performance slightly by reducing DOM complexity.

## Common Mistakes

- Relying only on automated checks — they catch a minority of issues;
  keyboard and screen-reader testing are required.
- Using `div` elements with click handlers instead of `button` —
  loses keyboard support, focus, and semantics at once.
- Removing focus outlines for aesthetics without an alternative.
- Adding ARIA where native HTML works — ARIA can override correct
  native behavior and make things worse.
- Treating a zero-violation axe run as full WCAG conformance — it is
  a floor, not a certificate.
- Writing alternative text like "image" or repeating adjacent text.
- Testing only the happy path — error states, empty states, and
  dialogs are where accessibility most often breaks.

## Examples

```ts
// e2e/accessibility.spec.ts — axe scan inside a Playwright test.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

```text
Keyboard test script (run manually, no tools needed):
1. Press Tab from the top of the page. Is the focus indicator visible
   at every stop?
2. Can you reach every button, link, and form field? Can you operate
   each one with Enter, Space, or arrow keys as appropriate?
3. Open each dialog or menu, then press Escape. Does it close and
   return focus to the element that opened it?
4. Submit the form with an empty required field. Is the error announced
   and is focus moved to the error or the field?
```

## Validation Checklist

- [ ] Automated checks run on every page in scope with zero violations
      at the agreed severity.
- [ ] Every flow in scope is completable by keyboard alone, with
      visible focus at every step.
- [ ] Screen-reader pass completed on critical flows; headings,
      labels, and live regions verified.
- [ ] Contrast, zoom, and color-independence checks pass.
- [ ] Findings are recorded with WCAG criterion, element, impact, and
      fix.
- [ ] Automated checks are wired into CI and fail the build on
      violations.
- [ ] Remaining manual-only checks are documented for a human reviewer.

## Expected Deliverables

- An accessibility report listing each finding with its WCAG
  criterion, affected element, impact, and fix (or a clean bill for
  the pages in scope).
- Automated accessibility tests added to the suite and CI.
- Fixed components or pages, with re-test results.
- A list of manual checks that still need a human reviewer.

## References

- [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/) — the
  guidelines and success criteria.
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) —
  component patterns.
- [MDN accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) —
  practical guides.
- [axe-core](https://github.com/dequelabs/axe-core) — automated
  testing engine.
- Related skills in this repository: `playwright`, `e2e-testing`,
  `regression-testing`.
