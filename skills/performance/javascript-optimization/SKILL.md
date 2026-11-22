---
name: javascript-optimization
description: >
  Reduce JavaScript cost on the main thread: cut unused code, defer
  non-critical scripts, break up long tasks, and load third-party
  scripts responsibly. Use when a page has poor INP or Total Blocking
  Time, Lighthouse flags unused JavaScript or long tasks, or
  interactions feel sluggish. Covers code splitting, defer/async,
  scheduling, and third-party script control.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# JavaScript Optimization

## Purpose

This skill helps an agent reduce the JavaScript a page ships and the
time it blocks the main thread, so interactions respond quickly. The
outcome is a page where the JavaScript that remains is necessary, loads
at the right time, and never holds the main thread long enough for a
user to notice.

## When to Use

- INP or Total Blocking Time is poor, or interactions feel sluggish.
- Lighthouse flags unused JavaScript, long main-thread tasks, or
  render-blocking scripts.
- A page ships a large amount of JavaScript for features most
  visitors never use.
- A third-party script (analytics, chat, ads) is slowing the page.
- Before a launch, as part of a performance pass on key templates.

## When Not to Use

- When the bottleneck is images or server response time — use
  `image-optimization` or `caching-strategy` instead.
- When the problem is bundle size at build time specifically — use
  `bundle-optimization` for tree-shaking and bundle analysis.
- When the page has almost no JavaScript and the problem is layout
  or rendering — use `core-web-vitals` to find the real cause.
- When the task is choosing a framework — that is an architecture
  decision, not an optimization task.

## Prerequisites

- Access to the site's source code and build configuration.
- A baseline measurement: INP or Total Blocking Time, and the
  JavaScript bytes shipped per page.
- A way to profile: Chrome DevTools Performance panel, or Lighthouse.
- A list of third-party scripts on the page and what each one does.

## Official Documentation

- [web.dev — JavaScript performance](https://web.dev/learn/performance) — Google's
  guides on long tasks, code splitting, and third-party scripts.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — browser-neutral reference for scheduling and loading APIs.
- [MDN — Scheduler API](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler)
  — `scheduler.postTask` for prioritized scheduling and
  `scheduler.yield()` for yielding to the browser.
- [Chrome — Use scheduler.yield()](https://developer.chrome.com/blog/use-scheduler-yield)
  — the dedicated API for breaking up long tasks, with
  feature-detection and fallback guidance. `scheduler.yield()` is
  supported in Chrome 129+ and Firefox 142, but not in Safari, so
  always feature-detect it and fall back to `setTimeout`.

## Required Workflow

1. Measure first. Record INP (field, if available) and Total
   Blocking Time (lab), and list the scripts on the page with their
   transfer sizes.
2. Profile the main thread. Record a DevTools Performance trace of a
   page load and of a typical interaction, and identify long tasks
   (over 50 ms) and what code runs in them.
3. Classify the JavaScript: critical for first paint, needed for
   interaction, or nice-to-have (analytics, chat, embeds). Anything
   in the third group is a candidate for deferral or removal.
4. Remove what is not needed. Delete unused code and dependencies,
   and remove third-party scripts that no longer serve a purpose.
5. Defer what remains but is not critical: use `defer` or `async`
   for scripts that do not need to run before first paint, and load
   below-the-fold or on-interaction features on demand.
6. Break up long tasks. Split work over 50 ms into smaller chunks
   by yielding — prefer `scheduler.yield()` where it is supported,
   with `setTimeout` as the fallback — and move heavy computation
   off the main thread where it makes sense. `scheduler.postTask()`
   schedules prioritized tasks; it is not a yield.
7. Re-measure under the same conditions and compare INP, Total
   Blocking Time, and JavaScript bytes against the baseline.

## Implementation Standards

- No script that is not needed for first paint may block rendering.
  Use `defer` for scripts that need the DOM and must run in order;
  use `async` for independent scripts.
- Long tasks must be broken up: any task over 50 ms on the main
  thread is a candidate for splitting or deferral.
- Code that runs only after user interaction (modals, carousels,
  maps, video players) must be loaded on demand, not at page load.
- Third-party scripts must load asynchronously and must never be
  render-blocking. If a third-party script cannot load
  asynchronously, escalate the decision to keep it.
- Do not ship polyfills to browsers that do not need them. Serve
  modern JavaScript to modern browsers and polyfill only where the
  audience requires it.
- Prefer native browser features over libraries when the native
  feature covers the need (for example, `IntersectionObserver`
  instead of a scroll library).
- Every optimization must be verified with a profile, not assumed:
  state which long task or script it targets and what the trace
  shows after the change.

## Best Practices

- Ship less JavaScript before optimizing what remains: removal is
  the most reliable optimization.
- Hydration is a common hidden cost in frameworks: hydrate only the
  interactive parts of a page, and delay hydration of below-the-fold
  components.
- Keep event handlers light. An interaction handler should update
  state and return quickly; heavy work belongs in a deferred task.
- Avoid re-rendering large parts of the page on every keystroke or
  scroll event; debounce or throttle where appropriate.
- Audit third-party scripts quarterly: they grow quietly and each
  one adds main-thread work.
- Use the DevTools Coverage panel to find unused JavaScript before
  deciding what to split or remove.

## Security Considerations

- Third-party scripts run with the page's privileges. Only load
  scripts from origins you trust, and review what data they can
  access.
- Use Subresource Integrity (SRI) for third-party scripts loaded
  from a CDN when the script is version-pinned and the CDN supports
  it.
- Dynamically loaded code (on-demand imports) must come from your
  own origin or a trusted CDN; never load executable code from a
  user-controlled URL.
- Deferring security-critical scripts (for example, a consent or
  security script) can create a window where protections are absent;
  keep genuinely security-critical code in the critical path.

## Performance Considerations

- `defer` and `async` change execution timing: a deferred script
  that manipulates the DOM before first paint can cause layout
  shift. Test the visual result, not just the timings.
- Code splitting adds requests. Split at route and feature
  boundaries, not at every component, or the request overhead
  cancels the benefit.
- Yielding to the browser adds latency to the task itself; yield
  between chunks of work, not inside a tight loop that must finish
  quickly.
- Web workers move work off the main thread but add messaging
  overhead; use them for genuinely heavy computation, not for
  trivial work.

## Common Mistakes

- Adding `async` to a script that depends on another script's order
  — `async` scripts execute in whatever order they finish loading.
- Lazy-loading code the user needs immediately, which trades a fast
  load for a slow first interaction.
- Optimizing JavaScript when the real problem is a slow server or
  huge images — always measure before optimizing.
- Removing a polyfill that part of the audience still needs, which
  breaks the page for those users.
- Treating Total Blocking Time as the whole story — it is a lab
  metric; INP field data is what users experience.
- Relying on `requestIdleCallback` as the only way to yield —
  its browser support is incomplete, and on a busy page an idle
  callback can be postponed indefinitely.

## Examples

Load a non-critical script without blocking rendering:

```html
<script src="/js/analytics.js" defer></script>
<script src="/js/chat-widget.js" async></script>
```

Load a heavy feature only when the user asks for it:

```js
// The map code is only downloaded when the user opens the map.
document.getElementById('show-map').addEventListener('click', async () => {
  const { initMap } = await import('./map.js');
  initMap(document.getElementById('map'));
});
```

Break up a long task by yielding between chunks:

```js
// scheduler.yield() is the dedicated yield API; fall back to
// setTimeout where it is not supported (Safari).
async function yieldToMain() {
  if (typeof scheduler !== 'undefined' && scheduler.yield) {
    await scheduler.yield();
  } else {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// Process items in small batches so the browser can handle input
// between batches.
async function processItems(items) {
  for (let i = 0; i < items.length; i += 50) {
    items.slice(i, i + 50).forEach(processOne);
    await yieldToMain();
  }
}
```

## Validation Checklist

- [ ] Baseline and post-change INP (field, if available) and Total
      Blocking Time (lab) are recorded.
- [ ] No non-critical script blocks rendering; `defer` or `async`
      is used where appropriate.
- [ ] Long tasks over 50 ms are identified and broken up or removed.
- [ ] Interaction-only code loads on demand.
- [ ] Third-party scripts are inventoried, load asynchronously, and
      each one is justified.
- [ ] The page still works correctly with JavaScript deferred or
      split (no broken interactions, no layout shift).

## Expected Deliverables

- A script inventory: what each script does, its size, and whether
  it is critical, deferred, or removed.
- A Performance trace summary: long tasks found and how each was
  addressed.
- The implemented changes, each mapped to the metric it targets.
- Before/after measurements of INP, Total Blocking Time, and
  JavaScript bytes.

## References

- [web.dev](https://web.dev/learn/performance) — JavaScript performance guides.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — scheduling and loading APIs.
- [MDN — Scheduler API](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler)
  — yielding to the browser.
- Related skills in this repository: `core-web-vitals`,
  `bundle-optimization`, `lighthouse`, `pagespeed-insights`,
  `web-performance-audit`.
