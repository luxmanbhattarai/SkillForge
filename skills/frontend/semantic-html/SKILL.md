---
name: semantic-html
description: >
  Choose meaningful HTML elements and landmarks so a page has a correct
  outline, accessible structure, and machine-readable meaning. Use when
  structuring a page or template, picking sectioning and landmark elements,
  fixing a flat div-only layout, improving SEO structure, or making content
  understandable to screen readers and search engines.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Semantic HTML

## Purpose

This skill turns a flat pile of `div` elements into a page whose structure
communicates meaning: landmarks for navigation, sectioning elements for the
outline, and text-level elements that describe what the content is rather
than how it looks. The result is a document that screen readers can
navigate, search engines can understand, and future maintainers can read.

## When to Use

- Structuring a new page, layout, or template.
- Replacing generic `div` and `span` wrappers with meaningful elements.
- Fixing a page whose screen-reader landmark or heading outline is wrong.
- Improving how search engines parse a page's structure and hierarchy.
- Reviewing markup for semantic correctness before launch.

## When Not to Use

- Writing basic valid markup (doctype, attributes, forms): use `html`.
- Styling the page: use `css` or `modern-css`.
- Full accessibility conformance testing: use `accessibility`.
- Framework-specific component structure: use `react`, `nextjs`, or
  `astro` and apply this skill's element choices inside components.

## Prerequisites

- The page content and its logical structure (what is a header, a section,
  an aside, a navigation block).
- Familiarity with the base rules in `html` (valid markup, headings,
  labels).
- A browser with developer tools to inspect the accessibility tree and
  document outline.

## Official Documentation

- [HTML Living Standard: sections](https://html.spec.whatwg.org/multipage/sections.html) —
  the normative definitions of sectioning and landmark elements.
- [MDN: HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) —
  each element's meaning, content model, and accessibility role.
- [W3C: ARIA in HTML](https://www.w3.org/TR/html-aria/) — which ARIA roles
  each HTML element maps to, and which roles are allowed on each element.

## Required Workflow

1. Sketch the page's logical structure before writing markup: page header,
   navigation, main content, complementary content, footer.
2. Assign one landmark per region: `header`, `nav`, `main`, `aside`,
   `footer`. Use exactly one `main` per page.
3. Divide the main content into `section` elements, each with a heading
   that names the section, or `article` elements for self-contained,
   syndicatable content.
4. Choose text-level elements by meaning: `em` for stress emphasis,
   `strong` for importance, `time` for dates, `code` for code, `mark` for
   highlighted text, `blockquote` with `cite` for quotations.
5. Check the heading outline: one `h1`, no skipped levels, headings that
   describe the section that follows them.
6. Inspect the accessibility tree in browser developer tools and confirm
   landmarks, headings, and roles appear as intended.
7. Remove redundant ARIA: if a native element already exposes the role
   (for example `nav` exposes `navigation`), do not add `role` as well.

## Implementation Standards

- Landmarks: `header` (page or section header), `nav` (major navigation
  blocks only), `main` (primary content, exactly one), `aside` (content
  complementary to its parent), `footer` (page or section footer).
- `article` is for self-contained content that makes sense on its own
  (a blog post, a product card, a comment); `section` groups thematically
  related content and should almost always have a heading.
- Do not use `section` as a generic wrapper: if the block has no heading
  and no thematic grouping, a `div` is the honest choice.
- `figure` with `figcaption` wraps illustrations, diagrams, photos, and
  code listings that are referenced from the main content.
- `time` carries a machine-readable `datetime` attribute
  (for example `<time datetime="2026-11-20">20 November 2026</time>`).
- `address` is for contact information for the page or article author,
  not for arbitrary postal addresses.
- Lists: `ul` for unordered items, `ol` where order matters, `dl` with
  `dt`/`dd` for name-value pairs such as glossaries or metadata.
- `abbr` marks abbreviations and can carry a `title` with the expansion.
- Interactive disclosure uses `details` and `summary` instead of a
  scripted `div` when no custom behavior is needed.
- Never change an element's implicit role with an ARIA role unless the
  HTML-ARIA specification explicitly allows it for that element.

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

- Write the outline first, then the markup: headings and landmarks should
  read as a table of contents for the page.
- Prefer native semantics over ARIA in every case: the first rule of ARIA
  is not to use ARIA when a native element does the job.
- Give repeated landmarks distinct accessible names: two `nav` elements
  need `aria-label` values such as "Primary" and "Footer".
- Keep `main` free of site-wide chrome: headers, footers, and sidebars
  belong outside it.
- Use `article` inside listings (search results, blog indexes) so each
  item is independently understandable.
- Pair `img` inside `figure` with `figcaption` when the caption adds
  information beyond the `alt` value.
- Let the outline drive the heading levels: a section nested inside
  another section takes the next heading level down.

## Security Considerations

- Semantic markup itself introduces no direct attack surface; the risk is
  misusing elements to hide content. Do not use semantic elements to
  conceal text from sighted users while exposing it to crawlers or screen
  readers (cloaking); it harms trust and can violate search guidelines.
- Content injected into semantic elements still needs escaping: semantic
  correctness does not replace output encoding. See `html` for escaping
  rules.

## Performance Considerations

- Semantic elements cost nothing extra to parse or render compared with
  `div` elements; choosing them has no performance penalty.
- A correct outline helps search engines index content accurately, which
  supports organic discovery without extra markup weight.
- Avoid wrapping content in extra semantic elements purely for styling
  hooks; each extra node adds to DOM size. Use CSS selectors on the
  elements that already exist.

## Common Mistakes

- `div` soup — every region is a `div`, so assistive technology sees no
  structure. Assign landmarks and sections.
- `section` without a heading — a section with no heading is usually a
  `div` in disguise. Add a heading or use `div`.
- Multiple `main` elements — only one `main` is allowed per document.
  Extra primary-content blocks are `section` or `article`.
- `nav` around every link list — `nav` is for major navigation blocks
  (primary menu, table of contents), not footers full of links or
  in-content link lists.
- `article` for any card — an `article` must be self-contained and
  independently distributable; a generic card is a `div` or `li`.
- `b` and `i` used for emphasis — they convey no meaning. Use `strong`
  for importance and `em` for stress emphasis.
- Heading used for visual size — a heading's level is about structure,
  not font size. Use CSS to size text, and pick the level that fits the
  outline.
- Redundant `role="navigation"` on `nav` — the element already exposes
  that role; the attribute adds noise.

## Examples

Page skeleton with landmarks:

```html
<body>
  <a href="#main">Skip to main content</a>
  <header>
    <nav aria-label="Primary">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/articles">Articles</a></li>
      </ul>
    </nav>
  </header>
  <main id="main">
    <article>
      <header>
        <h1>How to brew better coffee</h1>
        <p>Published <time datetime="2026-11-20">20 November 2026</time></p>
      </header>
      <section aria-labelledby="grind-heading">
        <h2 id="grind-heading">Grind size</h2>
        <p>Grind size controls extraction speed.</p>
      </section>
    </article>
    <aside aria-label="Related articles">
      <h2>Related</h2>
    </aside>
  </main>
  <footer>
    <p>Example Site, 2026</p>
  </footer>
</body>
```

Name-value metadata with a description list:

```html
<dl>
  <dt>Author</dt>
  <dd>Jordan Lee</dd>
  <dt>Reading time</dt>
  <dd>6 minutes</dd>
</dl>
```

## Validation Checklist

- [ ] The page has exactly one `main`, plus `header`, `nav`, and `footer`
      landmarks where appropriate.
- [ ] Every `section` has a heading; every `article` is self-contained.
- [ ] The heading outline reads as a coherent table of contents with no
      skipped levels.
- [ ] Repeated landmarks (multiple `nav` or `aside`) have distinct
      accessible names.
- [ ] The accessibility tree in developer tools shows the intended
      landmarks and roles.
- [ ] No redundant ARIA roles duplicate an element's implicit role.
- [ ] Accessibility: one h1, headings in order, labels associated, alt text present.

## Expected Deliverables

- Markup changes replacing generic wrappers with semantic elements,
  with a short note on the landmark and heading structure chosen.
- A document-outline summary (landmarks and heading hierarchy) for the
  pages changed.
- Confirmation that the accessibility tree reflects the intended
  structure, with screenshots or inspection notes where useful.

## References

- [HTML Living Standard: sections](https://html.spec.whatwg.org/multipage/sections.html) —
  normative element definitions.
- [MDN: HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element) —
  meaning and roles of every element.
- [W3C: ARIA in HTML](https://www.w3.org/TR/html-aria/) — implicit roles
  and allowed ARIA on each element.
- Related skills in this repository: `html`, `accessibility`, `css`.
