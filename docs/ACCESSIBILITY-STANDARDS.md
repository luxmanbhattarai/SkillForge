# Accessibility Standards

Shared accessibility standard for SkillForge skills. This document holds
the guidance that would otherwise be repeated in every user-facing skill:
the WCAG 2.2 AA baseline, the validation process, and the tooling. Skills
with a user-facing surface carry a short `### Accessibility` subsection
that points here and adds only the guidance specific to that skill.

Target: **WCAG 2.2 level AA**. Level AAA is aspirational; no skill may
claim AAA conformance without a full audit. The authoritative source is
the [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/).

Related skills in this repository: `accessibility` (the full working
skill — audit and fix a web interface), `accessibility-testing` (test
procedures), `image-accessibility` (alt text and images),
`semantic-html` (landmarks and structure).

## The baseline (WCAG 2.2 AA)

Every user-facing deliverable must meet all of these. Each item names
the success criteria it satisfies; criterion numbers are WCAG 2.2.

### Perceivable

- **Text alternatives.** Every meaningful image, icon, chart, and
  media object has a text alternative that conveys its purpose
  (1.1.1). Decorative images are marked decorative (`alt=""`,
  `aria-hidden="true"`) so assistive technology skips them.
  A chart's alternative summarizes the trend or links to the
  underlying data table — never numbers that exist only as pixels.
- **Structure and relationships.** Information, structure, and
  relationships conveyed visually are also conveyed
  programmatically: real headings in order (one `h1`, no skipped
  levels), real lists, table headers (`th` with `scope`), and
  landmarks (`header`, `nav`, `main`, `footer`) (1.3.1).
  Reading order matches visual order (1.3.2).
- **No color-only meaning.** Color is never the only way
  information is conveyed (1.4.1). Status, errors, and chart
  series use text, icons, or patterns alongside color.
- **Contrast.** Text meets 4.5:1 against its background (3:1 for
  large text, 18pt / 14pt bold and above) (1.4.3). UI components
  and meaningful graphics meet 3:1 (1.4.11). Check the actual
  rendered colors, including disabled and placeholder states —
  placeholder text is not a label substitute.
- **Resize and reflow.** Text resizes to 200% without loss of
  content or function (1.4.4). Content reflows to a 320 CSS px
  width with no two-dimensional scrolling (1.4.10). Never disable
  zoom (`user-scalable=no`, `maximum-scale=1`).
- **Images of text.** Avoid text baked into images; use real text
  (1.4.5). When an image must contain text (a logo, a social
  preview), the text is legible at the displayed size and the
  image carries a text alternative.
- **Media.** Pre-recorded video has captions; audio has a
  transcript (1.2.1, 1.2.2). No audio auto-plays for more than
  three seconds without a control to stop it (1.4.2).
- **Orientation and motion.** Content works in portrait and
  landscape unless a specific orientation is essential (1.3.4).
  Non-essential animation and parallax honor
  `prefers-reduced-motion`; moving content that lasts more than
  five seconds can be paused, stopped, or hidden (2.2.2).

### Operable

- **Keyboard.** Every interactive element is reachable and
  operable by keyboard, in an order that matches the visual order
  (2.1.1, 2.4.3). No keyboard traps (2.1.2). Custom widgets
  implement the keyboard interaction of the pattern they imitate
  (see the ARIA Authoring Practices Guide).
- **Focus visible and unobscured.** Focus is always visible with
  a clear indicator (`:focus-visible` styles on all interactive
  elements) (2.4.7). When an element receives focus it is not
  fully hidden behind sticky headers, dialogs, or other content
  (2.4.11, new in WCAG 2.2).
- **Focus management.** Opening a dialog moves focus into it and
  traps focus until it closes; closing returns focus to the
  trigger. Route changes in single-page apps move focus to the
  new page's heading or announce the change. Skip links let
  keyboard users bypass repeated navigation (2.4.1).
- **Target size.** Interactive targets are at least 24 by 24 CSS
  pixels, with 44 by 44 as the practical target (2.5.8, new in
  WCAG 2.2). The criterion allows a spacing exception for smaller
  targets; prefer meeting the size outright.
- **Dragging and gestures.** Any function that uses a dragging
  movement has a single-pointer alternative (2.5.7, new in
  WCAG 2.2). Multi-point or path-based gestures have a
  single-pointer alternative (2.5.1). Actions complete on the
  up-event, not the down-event, and can be aborted (2.5.2).
- **Labels match names.** The visible label of a control is part
  of its accessible name, so voice-control users can activate it
  by speaking what they see (2.5.3).
- **Timing.** Users can turn off, adjust, or extend any time
  limit (2.2.1). Session timeouts warn before expiry and preserve
  the user's work across re-authentication. Nothing flashes more
  than three times per second (2.3.1).
- **Titles and links.** Every page has a unique, descriptive
  title (2.4.2). Link text describes its destination in context —
  never "click here" or a bare URL (2.4.4). Headings and labels
  describe their topic or purpose (2.4.6).

### Understandable

- **Language.** The page declares its language (`lang`), and
  passages in another language are marked (3.1.1, 3.1.2), so
  screen readers pronounce content correctly.
- **Predictability.** Focus or input never triggers an unexpected
  change of context (3.2.1, 3.2.2). Navigation and component
  identification are consistent across the site (3.2.3, 3.2.4).
  Help (contact, FAQ, support) appears in the same relative place
  on every page that offers it (3.2.6, new in WCAG 2.2).
- **Forms.** Every input has a visible, associated label and
  instructions where needed (3.3.2). Input purpose is identified
  with `autocomplete` tokens so browsers and assistive technology
  can fill it (1.3.5). Errors identify the field in text, explain
  how to fix the problem, and are announced (3.3.1, 3.3.3).
  Users are not asked to re-enter information the site already
  has (3.3.7, new in WCAG 2.2). Submissions with legal, financial,
  or data consequences are reversible, verified, or confirmed
  (3.3.4).
- **Authentication.** Sign-in must not require a cognitive
  function test — no memorizing a password from another step,
  transcribing a code by hand without paste, or solving a puzzle
  (3.3.8, new in WCAG 2.2). Allow paste into code fields, offer
  `autocomplete="one-time-code"`, and provide an accessible
  alternative to any CAPTCHA or visual challenge. Object
  recognition and personal-content challenges are the permitted
  exceptions, not the default.

### Robust

- **Name, role, value.** Every UI component exposes its name,
  role, and state to assistive technology (4.1.2). Prefer native
  elements (`button`, `a`, `input`, `select`, `details`) — the
  first rule of ARIA is not to use ARIA when a native element
  works. When ARIA is needed, use only the roles, states, and
  properties the specification allows for the element.
- **Status messages.** Status updates use `role="status"`
  (polite) or `role="alert"` (assertive) so screen readers
  announce them without a page reload (4.1.3). Silent DOM
  updates that change what the user needs to know are failures.
- **Parsing.** WCAG 2.2 removed criterion 4.1.1 (Parsing) — valid
  markup is still required by the `html` skill, but it is no
  longer itself a WCAG criterion.

## Validation process

Automated checks catch roughly a third of accessibility issues.
A skill's guidance is only *validated* when a human has run the
manual steps below. Documentation coverage (a skill carries
guidance) and validation coverage (that guidance was verified
against a real interface) are different metrics — see
`ai/quality/ACCESSIBILITY-COVERAGE.md`.

1. **Automated first pass.** Run axe DevTools (or
   `@axe-core/playwright` / `axe-core` in CI) and the Lighthouse
   accessibility category. Fix every issue reported. Treat this
   as the floor, not the ceiling.
2. **Keyboard-only test.** Tab through the whole flow in order,
   activate every control, open and close every dialog and menu,
   and confirm focus is always visible, never trapped, and never
   fully obscured.
3. **Screen-reader test.** With NVDA (Windows) or VoiceOver
   (macOS/iOS), navigate by headings and landmarks, fill in
   forms, and confirm every control announces its name, role,
   and state, and that dynamic updates are announced.
4. **Zoom and reflow test.** 200% zoom and a 320px viewport:
   content remains usable with no loss of function and no
   two-dimensional scrolling.
5. **Contrast check.** Measure the actual rendered colors
   (including hover, focus, disabled, and error states) against
   the 4.5:1 / 3:1 thresholds.
6. **Motion check.** With reduced motion enabled, confirm
   non-essential animation is suppressed and nothing moves
   without a pause control.
7. **Manual verification for the rest.** Automated tools cannot
   judge alt-text quality, heading logic, link purpose, error
   clarity, or whether a custom widget behaves like the pattern
   it imitates. A human reviews those against this standard.

Record what was tested, with which tools and assistive
technology, and what remains untested. An untested claim is not
a passing claim.

## Tooling

- **axe DevTools** (browser extension) and **axe-core**
  (`@axe-core/playwright`, `@axe-core/react`, `jest-axe`) —
  the automated baseline; runnable in CI.
- **Lighthouse** accessibility category (Chrome DevTools,
  PageSpeed Insights, or the `lighthouse` CLI) — a quick
  lab audit; read it alongside the performance categories.
- **WAVE** (browser extension) — visual overlay of errors,
  alerts, and structural features; useful for a first look.
- **NVDA** (free, Windows) and **VoiceOver** (built into
  macOS/iOS) — the screen readers for manual verification.
- **Keyboard only** — no tool needed; the most reliable test
  there is.
- **Contrast checkers** — the WebAIM contrast checker or the
  contrast panel in browser DevTools.

No tool proves accessibility. A clean automated run plus an
untested manual checklist is not a pass.

## References

- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) —
  success criteria, filterable by level.
- [What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) —
  the nine new criteria and the removed parsing criterion.
- [WAI tutorials](https://www.w3.org/WAI/tutorials/) — practical
  guidance for pages, forms, images, and navigation.
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) —
  patterns for accessible widgets.
- [MDN: Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) —
  practical guides and reference.
- [axe-core rules](https://dequeuniversity.com/rules/axe/) — what
  the automated checks actually test, and their limits.
