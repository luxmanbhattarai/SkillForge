---
name: javascript
description: >
  Write modern, idiomatic JavaScript (ES modules, async/await, classes,
  and the standard library) for browser and Node.js code. Use when writing
  or refactoring JavaScript, adding interactivity to a page, fetching data,
  handling events, working with the DOM, or fixing JavaScript bugs. Covers
  language features, async patterns, DOM scripting, and error handling.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# JavaScript

## Purpose

This skill produces modern JavaScript that is readable, correct, and
maintainable: ES modules, `const` by default, async/await for asynchronous
work, and DOM scripting that respects accessibility. It covers the language
itself — syntax, data handling, async patterns, and browser APIs — so code
written under it behaves predictably in current browsers and in Node.js.

## When to Use

- Writing or refactoring JavaScript in the browser or in Node.js.
- Adding interactivity: event handling, DOM updates, forms, menus.
- Fetching data from APIs and handling responses and errors.
- Working with arrays, objects, dates, and the standard library.
- Debugging JavaScript behavior, async bugs, or scope issues.

## When Not to Use

- Type-safe JavaScript with static checking: use `typescript`.
- Building UIs with components and state: use `react`, `nextjs`, or
  `astro` as the framework dictates.
- Styling or layout: use `css` or `modern-css`.
- Server-side frameworks, databases, or APIs beyond the language itself:
  use the relevant backend skill.

## Prerequisites

- A current browser or Node.js 24 LTS or 26 LTS to run the code;
  Node.js 26 is the newest LTS line, and 24 and 22
  remain in LTS.
- The HTML the script operates on (see `html`); scripts should enhance
  working markup, not replace it.
- A module-aware setup (a bundler, or `<script type="module">` in the
  browser) when using ES modules.
- Version range: Node.js 24 LTS or 26 LTS; a current browser.

## Official Documentation

- [MDN Web Docs: JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) —
  the practical language reference and guides.
- [ECMAScript specification](https://tc39.es/ecma262/) — the normative
  language definition.
- [Node.js documentation](https://nodejs.org/en/docs) — Node.js APIs and
  guides for server-side JavaScript.

## Required Workflow

1. Decide where the code runs (browser, Node.js, or both) and which APIs
   are available there; do not use browser-only APIs in shared modules.
2. Write in ES modules: one module per concern, named exports for
   functions and values, a default export only when a module has a single
   clear responsibility.
3. Prefer `const`, then `let`; never use `var`. Prefer arrow functions for
   callbacks and short functions, named function declarations for
   top-level logic.
4. Handle asynchrony with `async`/`await` and `try`/`catch`; never leave
   a promise floating without error handling.
5. Query the DOM once and cache references; attach event listeners with
   `addEventListener`, never inline handler attributes.
6. Update the DOM through `textContent` for text and `createElement` /
   `append` for structure; avoid `innerHTML` with untrusted data.
7. Test in the target environment: run the code, exercise the happy path
   and the failure path, and check the console for warnings.

## Implementation Standards

- Modules: use `import`/`export` syntax. Use explicit file extensions in
  browser module imports (`./utils.js`).
- Variables: `const` by default; `let` only when reassignment is needed.
  No `var`. No implicit globals.
- Functions: pure functions where practical; a function does one thing and
  its name says what it returns or does.
- Async: `async`/`await` for sequential async work; `Promise.all` for
  independent parallel work; `Promise.allSettled` when partial failure is
  acceptable. Always handle rejection.
- Fetch: check `response.ok` before parsing; a 404 or 500 does not reject
  the fetch promise. Parse JSON inside `try`/`catch`.
- DOM: use `querySelector`/`querySelectorAll` with specific selectors;
  use event delegation for lists of similar elements; remove listeners
  when elements are discarded.
- Data: use `Map` for keyed collections with non-string keys, `Set` for
  unique values, and `structuredClone` for deep copies. Avoid mutating
  function arguments.
- Dates: use `Date` with ISO strings or `Intl.DateTimeFormat` for display;
  never parse dates with string splitting by hand.
- Errors: throw `Error` objects with useful messages; catch at the
  boundary where the program can respond (show a message, retry, log).
- Numbers: use `Number.isFinite` / `Number.isInteger` for validation;
  use `Intl.NumberFormat` for display. Avoid floating-point equality
  checks.
- Strict mode is on by default in modules; do not rely on sloppy-mode
  behavior anywhere.

### Accessibility

- Every mouse interaction has a keyboard equivalent: `click` handlers
  on real buttons, `keydown` for custom widgets (Enter / Space to
  activate, arrows where the pattern needs them).
- Manage focus explicitly after DOM updates: move focus to new
  content, return it when dialogs close, never leave it on a removed
  element.
- Announce dynamic changes with live regions (`role="status"` /
  `role="alert"`); do not rely on silent DOM updates.
- Do not break native semantics with JavaScript: no `div` with
  `onClick` where a `button` works; no positive `tabindex`.
- Respect `prefers-reduced-motion` for JS-driven animation; provide
  pause controls for motion that lasts over five seconds.
- Validate with keyboard only and a screen reader, not just by
  watching the screen.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Write small, testable functions and keep side effects at the edges
  (fetching, DOM updates, storage).
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safe
  access, but do not chain through five levels — that signals a design
  problem.
- Destructure function parameters for options objects, with defaults.
- Prefer `Array.prototype.map`, `filter`, `find`, and `reduce` over
  manual loops when the intent is a transformation.
- Debounce or throttle high-frequency handlers (scroll, resize, input)
  instead of running heavy work on every event.
- Keep event handlers thin: read the event, delegate to a function, and
  update state or the DOM in one place.
- Use `AbortController` to cancel fetches that are no longer needed
  (for example when a user types a new search query).
- Log with context: include what was happening and the relevant
  identifier, not just the error object.

## Security Considerations

- Never insert untrusted strings with `innerHTML`; use `textContent` or
  build nodes with `createElement`. If HTML must be rendered from
  untrusted input, sanitize it with a maintained sanitizer library.
- Never use `eval` or the `Function` constructor with untrusted input.
- Do not store secrets, tokens, or passwords in `localStorage` or
  `sessionStorage`; they are readable by any script on the origin.
- Validate and encode data sent to the server; client-side validation is
  a convenience, never a security boundary.
- Be careful with `postMessage`: always check `event.origin` before
  acting on a message, and always pass an explicit target origin.
- Avoid loading third-party scripts without integrity checks; when a
  script must come from a CDN, use Subresource Integrity (`integrity`
  attribute) where the host supports it.

## Performance Considerations

- Avoid work in tight loops over the DOM: batch DOM reads and writes, and
  use `DocumentFragment` when inserting many nodes at once.
- Cache DOM lookups instead of querying on every event.
- Use `requestAnimationFrame` for visual updates tied to animation;
  never animate with `setInterval`.
- Lazy-load heavy modules with dynamic `import()` so the initial bundle
  stays small.
- Prefer `IntersectionObserver` and `ResizeObserver` over scroll and
  resize listeners for visibility and size reactions.
- Keep the main thread free: move heavy computation to a Web Worker when
  it would block interaction.

## Common Mistakes

- Forgetting that `fetch` does not reject on HTTP errors — always check
  `response.ok` before parsing.
- Using `==` instead of `===` — loose equality coerces types and hides
  bugs. Use strict equality.
- Mutating shared state from many places — leads to bugs that are hard to
  trace. Keep state in one place and update it through functions.
- `Array.prototype.forEach` with `async` callbacks — `forEach` does not
  await; use `for...of` or `Promise.all` with `map`.
- Attaching a listener inside a loop without delegation — creates many
  listeners and leaks memory when elements are removed. Delegate to a
  parent.
- Reading `event.target` when `event.currentTarget` is meant — `target`
  is the deepest element clicked, which may be a child.
- Blocking the main thread with synchronous work — long loops freeze the
  UI. Break work into chunks or move it to a worker.
- Swallowing errors with an empty `catch` — failures become invisible.
  Log or surface every caught error.

## Examples

Fetching data with proper error handling:

```js
async function loadArticles(signal) {
  const response = await fetch('/api/articles', { signal });
  if (!response.ok) {
    throw new Error(`Failed to load articles: ${response.status}`);
  }
  return response.json();
}

try {
  const articles = await loadArticles();
  renderArticles(articles);
} catch (error) {
  if (error.name !== 'AbortError') {
    console.error('Could not load articles', error);
    showError('Articles could not be loaded. Please try again.');
  }
}
```

Event delegation for a list:

```js
const list = document.querySelector('#article-list');

list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const id = button.dataset.id;
  deleteArticle(id);
});
```

Debounced input handler:

```js
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

searchInput.addEventListener('input', debounce((event) => {
  search(event.target.value);
}, 300));
```

## Validation Checklist

- [ ] No `var`, no `eval`, no inline event-handler attributes.
- [ ] Every `fetch` checks `response.ok` and every promise chain handles
      rejection.
- [ ] No untrusted data reaches `innerHTML`.
- [ ] Event listeners are delegated where a list of similar elements is
      involved.
- [ ] The code runs without console errors in the target browser or
      Node.js version.
- [ ] Heavy work is debounced, throttled, or moved off the main thread.
- [ ] Accessibility: full flow works keyboard-only; dynamic changes are announced.

## Expected Deliverables

- ES module JavaScript files following the standards above, with
  functions that are small, named, and testable.
- DOM scripting that enhances working HTML and keeps keyboard and
  screen-reader behavior intact.
- A short note on any browser or Node.js APIs used and their support
  requirements.

## References

- [MDN Web Docs: JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) —
  language reference and guides.
- [ECMAScript specification](https://tc39.es/ecma262/) — normative
  language definition.
- [Node.js documentation](https://nodejs.org/en/docs) — Node.js APIs.
- Related skills in this repository: `typescript`, `react`, `html`,
  `frontend-performance`.
