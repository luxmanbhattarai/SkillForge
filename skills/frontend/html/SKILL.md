---
name: html
description: >
  Write valid, well-formed HTML documents and markup for web pages, forms,
  tables, and embedded media. Use when creating or editing HTML files,
  building page structure, adding forms, links, images, or tables, fixing
  invalid markup, or validating a document against the HTML standard.
  Covers document structure, elements, attributes, forms, and validation.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# HTML

## Purpose

This skill produces valid, well-formed HTML that browsers parse consistently
and that assistive technology, search engines, and styling layers can rely
on. It covers document structure, element and attribute choice, forms,
tables, embedded media, and validation, so every page starts from a solid
markup foundation.

## When to Use

- Creating a new HTML page, template, or partial from scratch.
- Adding or editing forms, tables, lists, links, images, audio, or video.
- Fixing invalid markup, broken nesting, or unclosed elements.
- Auditing a page for missing document metadata (title, charset, viewport).
- Writing markup that will be styled with CSS or enhanced with JavaScript.

## When Not to Use

- Choosing meaningful landmark and sectioning elements for a page outline:
  use `semantic-html` instead.
- Styling layout, color, or typography: use `css` or `modern-css`.
- Building components in a framework (React, Astro, Next.js): use `react`,
  `astro`, or `nextjs`, which layer on top of this skill.
- Meeting WCAG conformance in full: use `accessibility` for the complete
  audit, not just valid markup.

## Prerequisites

- Version range: none — HTML is a living standard with no version
  numbers (see Official Documentation below).
- A text editor and a way to open the page in a browser for inspection.
- Knowledge of the page's content and purpose before choosing elements.
- If the markup lives in a framework template, that framework's project
  must already be set up; this skill covers the HTML itself, not tooling.

## Official Documentation

- [HTML Living Standard](https://html.spec.whatwg.org/) — the authoritative
  definition of every element, attribute, and parsing rule.
- [MDN Web Docs: HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) —
  practical reference for elements, attributes, and guides.
- [W3C Markup Validation Service](https://validator.w3.org/) — validate a
  document or snippet against the standard.

HTML is a living standard with no version numbers: there is no "HTML6"
to upgrade to. Features are added to the WHATWG standard and ship in
browsers individually, so check MDN or Can I Use for the support status
of any newer element or attribute before relying on it.

## Required Workflow

1. Identify the content: headings, paragraphs, lists, media, forms, tables.
2. Write the document skeleton first: doctype, `html` with a `lang`
   attribute, `head` with charset, viewport, and title, then `body`.
3. Mark up content with the most specific element that fits (for example
   `button`, not a styled `div`, for an action).
4. Give every form control a `label`, every image an `alt` attribute, and
   every table a `caption` or `aria-label` when it needs a name.
5. Nest elements correctly: block content inside block containers, no
   interactive element inside another interactive element.
6. Validate the finished document with the W3C validator or an HTML
   linter, and fix every error it reports.
7. Open the page in a browser, inspect the rendered DOM, and confirm the
   structure matches what was written.

## Implementation Standards

- Every document starts with `<!doctype html>` and declares
  `<meta charset="utf-8">` as the first element inside `head`.
- Set the `lang` attribute on `html` (for example `lang="en"`); set `lang`
  on any span of content in a different language.
- Include `<meta name="viewport" content="width=device-width, initial-scale=1">`
  on every page intended for browsers.
- Use exactly one `h1` per document; heading levels must not skip
  (never jump from `h2` to `h4`).
- Attribute values are always quoted; boolean attributes are written bare
  (`required`, not `required="true"`).
- Void elements (`img`, `input`, `br`, `meta`, `link`, `hr`) take no
  closing tag and no children.
- Use `button` for actions and `a` for navigation; never use `div` or
  `span` with a click handler as a substitute.
- Form controls use explicit `label` elements with matching `for`/`id`,
  plus `name` attributes so submissions carry data.
- `img` always carries `alt`: descriptive text for meaningful images, an
  empty `alt=""` for decorative ones. Add `width` and `height` to reserve
  layout space.
- Tables use `th` with `scope` for headers, `caption` for a title, and
  `thead`/`tbody` when the table has header and body rows.
- External links that open a new tab use `rel="noopener"` (and `noreferrer`
  when the referrer must not leak).

### Accessibility

- Choose the element that matches the meaning: `button` for actions,
  `a` for navigation, `nav` / `main` / `header` / `footer` landmarks.
- One `h1` per page; headings in order with no skipped levels — the
  outline is the screen reader table of contents.
- Forms: visible `<label>` associated with `for` / `id`; group related
  controls with `fieldset` / `legend`.
- Tables: `th` with `scope`, `caption` where the table needs a title;
  never use tables for layout.
- Images: descriptive `alt` for meaningful images, empty `alt` for
  decorative ones; `figure` / `figcaption` for captioned figures.
- Set `lang` on the page and on passages in another language.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Keep the DOM shallow: deep nesting slows parsing, styling, and
  screen-reader navigation.
- Prefer native elements over ARIA: a real `button`, `select`, or
  `details` element is more robust than a `div` with roles.
- Put critical metadata (charset, title, description) early in `head` so
  browsers and crawlers see it first.
- Use `type` attributes on inputs (`email`, `url`, `tel`, `number`,
  `date`) to get free validation and mobile keyboards.
- Group related form controls with `fieldset` and `legend`.
- Use `figure` and `figcaption` for captioned images, diagrams, and code
  listings.
- Add `loading="lazy"` to below-the-fold images and iframes, and
  `decoding="async"` to images where decoding can be deferred.
- Declare `width` and `height` (or an aspect ratio) on media to prevent
  layout shift as resources load.

## Security Considerations

- Never insert untrusted data into markup without escaping: `<`, `>`, `&`,
  `"`, and `'` in user content must be escaped, or the content must be
  inserted via `textContent` rather than `innerHTML`.
- Do not use `javascript:` URLs in `href` attributes; they are an XSS
  vector. Use a `button` with a handler instead.
- Links with `target="_blank"` must include `rel="noopener"` to prevent
  the opened page from gaining access to `window.opener`.
- Avoid inline event-handler attributes (`onclick`, `onerror`) on content
  that includes user data; bind handlers from a script instead.
- Iframes embedding third-party content should carry a `sandbox` attribute
  with the narrowest permissions the embed needs.
- Treat `srcdoc` and `data:` URLs in iframes as untrusted content and
  sandbox them.

## Performance Considerations

- Keep total DOM size modest: pages with many thousands of nodes render
  and interact more slowly; prefer pagination or virtualization for long
  lists.
- Defer non-critical scripts with `defer` (or `async` when order does not
  matter) so parsing is not blocked.
- Preload only the single most critical resource (usually a font or hero
  image); over-preloading competes with the document itself.
- Use responsive images (`srcset` and `sizes`) so small screens do not
  download desktop-sized files.
- Lazy-load below-the-fold images and iframes; never lazy-load the hero
  image or the largest contentful paint element.

## Common Mistakes

- Missing `alt` on images — screen readers announce the file name instead,
  and the page fails basic accessibility checks. Always include `alt`.
- Multiple `h1` elements or skipped heading levels — breaks the document
  outline that screen readers and search engines use.
- `div` used as a button — loses keyboard support, focus, and semantics.
  Use `button` and style it.
- Unlabeled form inputs — users relying on assistive technology cannot tell
  what a field is for. Pair every control with a `label`.
- Forgetting `name` on form controls — the field's value is never submitted.
- Nesting `a` inside `a`, or `button` inside `a` — invalid HTML with
  unpredictable browser behavior. Restructure instead.
- Using `placeholder` as a label — the hint disappears on input and is not
  a substitute for a visible label.
- Copying `&nbsp;` and `<br>` chains to fake layout — use CSS for spacing
  and layout instead.

## Examples

Minimal valid document skeleton:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contact — Example Site</title>
  <meta name="description" content="Get in touch with the Example Site team.">
</head>
<body>
  <header>
    <h1>Contact us</h1>
  </header>
  <main>
    <form action="/contact" method="post">
      <label for="email">Email address</label>
      <input id="email" name="email" type="email" required autocomplete="email">
      <label for="message">Message</label>
      <textarea id="message" name="message" rows="5" required></textarea>
      <button type="submit">Send message</button>
    </form>
  </main>
</body>
</html>
```

Accessible table with headers and caption:

```html
<table>
  <caption>Monthly site visits</caption>
  <thead>
    <tr><th scope="col">Month</th><th scope="col">Visits</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">January</th><td>12,400</td></tr>
    <tr><th scope="row">February</th><td>13,150</td></tr>
  </tbody>
</table>
```

## Validation Checklist

- [ ] Document starts with `<!doctype html>` and declares charset and
      viewport in `head`.
- [ ] `html` has a `lang` attribute and the page has exactly one `h1`.
- [ ] Heading levels do not skip.
- [ ] Every `img` has an `alt` attribute; every form control has a `label`.
- [ ] No interactive element is nested inside another interactive element.
- [ ] The W3C validator reports zero errors for the document.
- [ ] External `target="_blank"` links carry `rel="noopener"`.
- [ ] Accessibility: one h1, headings in order, labels associated, alt text present.

## Expected Deliverables

- Valid HTML files or template changes, with a document skeleton that
  includes doctype, charset, viewport, title, and language.
- Forms with labeled, named controls and native input types.
- A validation report: validator output (zero errors) or a list of any
  remaining issues and why they are acceptable.

## References

- [HTML Living Standard](https://html.spec.whatwg.org/) — authoritative
  element and attribute reference.
- [MDN Web Docs: HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) —
  practical guides and element reference.
- [W3C Markup Validation Service](https://validator.w3.org/) — validate
  documents against the standard.
- Related skills in this repository: `semantic-html`, `css`, `accessibility`,
  `frontend-performance`.
