---
name: bundle-optimization
description: >
  Shrink JavaScript and CSS bundles: analyze what is inside them,
  tree-shake unused code, split by route and feature, and replace
  heavy dependencies with lighter ones. Use when bundle size is
  large, Lighthouse flags unused code, first load is slow, or a
  framework app ships more JavaScript than the page needs. Covers
  bundlers, code splitting, and dependency audits.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Bundle Optimization

## Purpose

This skill helps an agent make JavaScript and CSS bundles smaller so
pages load and become interactive faster. The outcome is a bundle that
contains only the code the page actually uses, split so each route
loads what it needs, with the biggest dependencies justified or
replaced.

## When to Use

- The JavaScript bundle is large and first load or interaction is
  slow.
- Lighthouse flags unused JavaScript or large network payloads.
- A framework app ships the same large bundle on every route.
- A dependency audit is needed before a release.
- Setting or enforcing a bundle-size budget.

## When Not to Use

- When the bottleneck is images, fonts, or server response time —
  use `image-optimization` or `caching-strategy` instead.
- When the problem is main-thread work at runtime rather than bundle
  size — use `javascript-optimization` for long tasks and scheduling.
- When the site ships almost no JavaScript (a static content site)
  — there is little bundle to optimize.
- When the task is choosing a bundler or framework — that is an
  architecture decision, not an optimization task.

## Prerequisites

- Access to the project's source code and build configuration.
- Node.js 24 LTS and the project's package manager. Node.js 26 is
  the newer LTS since October 2026; Node.js 24 LTS is supported
  through April 2028.
- A baseline measurement: bundle sizes (per route, if split) and a
  lab metric such as Total Blocking Time.
- A bundle analyzer for the project's bundler, or a way to inspect
  the build output.

## Official Documentation

- [web.dev — Reduce JavaScript payloads](https://web.dev/) — Google's
  guides on code splitting and bundle reduction.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — browser-neutral reference for loading and parsing costs.
- [Rollup](https://rollupjs.org/) — the bundler behind many tools;
  its documentation explains tree-shaking in depth.
- [esbuild](https://esbuild.github.io/) — a fast bundler with a
  built-in bundle analyzer. esbuild 0.28.x is the current stable
  line as of mid-2026.
- [esbuild — Analyze](https://esbuild.github.io/analyze/) — the
  metafile visualizer; the CLI `--analyze` flag prints the same
  report from a metafile piped on stdin.

## Required Workflow

1. Measure the baseline. Build for production and record the size
   of each JavaScript and CSS bundle (uncompressed and gzip or
   Brotli), per route if the app splits by route.
2. Analyze the bundle. Use a bundle analyzer to list what is inside:
   your code, each dependency, and how much each contributes.
3. Identify the biggest wins: large dependencies, duplicated code
   (the same library bundled twice), and code that is imported but
   never used on a given route.
4. Remove what is not needed: unused dependencies, unused exports,
   and dead code. Verify the app still builds and its tests pass.
5. Split what remains: split by route so each page loads only its
   own code, and split heavy features (charts, editors, maps) so
   they load on demand.
6. Replace heavy dependencies where a lighter alternative covers
   the need, or import only the part that is used (for example, a
   single function instead of the whole library).
7. Set a budget. Record the new sizes and add a size check to the
   build or CI so the bundle cannot grow silently.
8. Re-measure and compare against the baseline, including a lab
   metric such as Total Blocking Time.

## Implementation Standards

- Always measure production builds. Development builds are larger
  and unminified; optimizing against them is misleading.
- Report both raw and compressed sizes (gzip and Brotli where
  available). Compressed size is what users download; raw size is
  what the browser parses.
- Tree-shaking only works with ES modules and side-effect-free code.
  Prefer libraries that ship ES modules, and mark your own package
  as side-effect-free where that is true.
- Split at route boundaries first, then at heavy-feature boundaries.
  Do not split so finely that the request overhead cancels the
  benefit.
- Import only what is used. A whole-library import of a large
  utility library is a common source of bloat; import the specific
  functions instead.
- Deduplicate dependencies: the same library at two versions in one
  bundle is wasted bytes. Align versions where possible.
- Every dependency in the bundle must be justified. If a dependency
  is large and used for one small feature, consider replacing it
  with a smaller alternative or a few lines of your own code.

## Best Practices

- Run the bundle analyzer after every significant dependency change,
  not just during a performance pass.
- Keep a size budget in CI so a new dependency that doubles the
  bundle fails the build instead of shipping silently.
- Prefer native browser APIs over libraries when the native API
  covers the need.
- Load polyfills only for browsers that need them; do not ship them
  to everyone.
- Check for duplicated transitive dependencies after adding or
  upgrading a package.
- Review the CSS bundle too: unused CSS from a framework or design
  system can be as large as the JavaScript.

## Security Considerations

- Removing dependencies reduces the supply-chain surface; that is a
  security benefit, not just a performance one.
- When replacing a dependency, vet the replacement: check its
  maintenance status, its own dependencies, and its license.
- Do not remove code that enforces security (sanitization,
  validation, authentication checks) in the name of size.
- Bundle analysis output lists your dependencies and versions; do
  not publish it publicly if it reveals versions with known
  vulnerabilities.

## Performance Considerations

- Smaller bundles parse and compile faster, which improves INP and
  Total Blocking Time, not just download time.
- Code splitting adds HTTP requests. Split at meaningful boundaries
  and preload the chunks a route needs immediately.
- Compression matters: Brotli usually beats gzip for text assets.
  Serve compressed assets and verify the server actually compresses
  them.
- A bundle that is small but loaded synchronously can still block
  rendering; combine bundle work with loading strategy (see
  `javascript-optimization`).

## Common Mistakes

- Optimizing a development build and reporting development sizes.
- Importing a whole library for one function.
- Splitting so aggressively that the page makes dozens of small
  requests.
- Removing a dependency that was actually used, breaking a feature
  that tests did not cover.
- Setting a size budget and then ignoring it when it fails.
- Forgetting the CSS bundle: unused styles can dominate the
  stylesheet.

## Examples

Import only the function you need instead of the whole library:

```js
// Prefer a targeted import over importing the entire library.
import { debounce } from 'lodash-es';
```

Load a heavy feature on demand with a dynamic import:

```js
// The charting code is split into its own chunk and downloaded
// only when the user opens the dashboard.
async function showDashboard() {
  const { renderChart } = await import('./charts.js');
  renderChart(document.getElementById('chart'));
}
```

Analyze a bundle with esbuild's built-in metafile:

```bash
npx esbuild src/index.js --bundle --minify --metafile=meta.json \
  --outfile=dist/app.js
npx esbuild --analyze=verbose < meta.json
```

## Validation Checklist

- [ ] Baseline and post-change bundle sizes are recorded (raw and
      compressed, per route where split).
- [ ] The bundle analyzer output was reviewed and the largest
      contributors are identified.
- [ ] Unused dependencies and dead code are removed.
- [ ] Routes load only their own code; heavy features load on demand.
- [ ] The app builds and its tests pass after the changes.
- [ ] A size budget is recorded, and ideally enforced in CI.
- [ ] Lab metrics (Total Blocking Time, LCP) improved or did not
      regress.

## Expected Deliverables

- A bundle analysis: what is inside each bundle and how much each
  part contributes.
- The implemented changes, each mapped to the size saved.
- Before/after bundle sizes (raw and compressed) and lab metrics.
- A size budget and, where possible, a CI check enforcing it.
- Notes on any dependency kept despite its size, with the reason.

## References

- [web.dev](https://web.dev/) — reducing JavaScript payloads.
- [Rollup](https://rollupjs.org/) — tree-shaking and bundling.
- [esbuild](https://esbuild.github.io/) — fast bundling and analysis.
- Related skills in this repository: `javascript-optimization`,
  `core-web-vitals`, `lighthouse`, `web-performance-audit`.
