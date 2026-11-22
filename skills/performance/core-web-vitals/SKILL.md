---
name: core-web-vitals
description: >
  Measure, diagnose, and improve Core Web Vitals (LCP, INP, CLS) for a
  website using field data from real users and lab data from controlled
  tests. Use when a page is slow to load, responds sluggishly to input,
  or shifts layout unexpectedly; when setting performance budgets or
  baselines; or when search visibility or user experience depends on
  page speed. Covers CrUX field data, Chrome DevTools, and the
  web-vitals library.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Core Web Vitals

## Purpose

This skill helps an agent measure the three Core Web Vitals — Largest
Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative
Layout Shift (CLS) — diagnose why a page scores poorly, and apply fixes
that improve real-user experience. The outcome is a page that meets
Google's published "good" thresholds for real users, verified with field
data rather than a single lab run.

## When to Use

- A page feels slow to load, sluggish to interact with, or visually
  unstable, and you need to find the cause.
- Setting or enforcing a performance budget for a site or template.
- Before and after a redesign, framework migration, or third-party
  script change, to compare real-user metrics.
- Preparing a page for a traffic spike (launch, campaign, seasonal peak).
- Investigating a drop in search visibility where page experience may
  be a contributing factor.

## When Not to Use

- When you only need a one-off lab audit of a single page — use
  `lighthouse` instead, which runs a broader checklist.
- When the problem is a specific asset class (oversized images, a huge
  bundle) — use `image-optimization` or `bundle-optimization` directly.
- When the task is a full-site performance review across many pages —
  use `web-performance-audit` to scope and organize the work.
- When the bottleneck is server response time alone — start with
  `caching-strategy` and the hosting setup instead.

## Prerequisites

- The URL(s) to measure, and access to the site's source code.
- A Chromium-based browser with DevTools, or Node.js 24 LTS for
  command-line tooling. Node.js 24 LTS is supported through April
  2028; Node.js 26 became the newer LTS in October 2026.
- For field data: the site must have real traffic; Chrome UX Report
  (CrUX) data only exists for URLs and origins with enough visitors.
- A baseline measurement taken before changes, so improvements can be
  proven rather than assumed.
- Version range: web-vitals 6.x; Node.js 24 LTS or 26 LTS for CLI tooling.

## Official Documentation

- [web.dev — Web Vitals](https://web.dev/articles/vitals) — Google's
  canonical guidance on LCP, INP, and CLS, including thresholds and
  debugging guides. Start here for any metric definition.
- [PageSpeed Insights — About](https://developers.google.com/speed/docs/insights/v5/about)
  — how Chrome UX Report field data is collected, the 28-day
  collection period, and what the 75th-percentile (p75) values mean.
- [web-vitals on GitHub](https://github.com/GoogleChrome/web-vitals)
  — the RUM library for measuring the metrics in JavaScript;
  version 6.x is current. `onFID()` was removed in v5 (May 2025):
  do not measure FID — INP replaced it as the responsiveness
  metric on 12 March 2024.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — browser-neutral reference for the underlying APIs and concepts.

## Required Workflow

1. Establish the baseline. Record the p75 field values for LCP, INP,
   and CLS for the target URL and origin from PageSpeed Insights or
   Search Console, and note whether field data exists at all.
2. Reproduce in the lab. Run a lab measurement (Lighthouse or DevTools
   Performance panel) on the same page to get a repeatable diagnosis
   environment, and record the conditions (device emulation, network
   throttling, cache state).
3. Attribute the problem. For each failing metric, identify the
   specific element or cause: the LCP element, the interaction with the
   worst INP, and the layout-shift sources with their shift scores.
4. Fix the largest contributor first. Apply one fix at a time per
   metric so the effect of each change is measurable.
5. Re-measure in the lab after each fix and confirm the metric moved
   in the right direction without regressing the other two.
6. Ship, wait for field data to accumulate, and confirm the p75 field
   values improved. Lab improvements alone do not prove a real-user
   improvement.
7. Record the before/after field values and the changes made, so the
   next audit starts from a known state.

## Implementation Standards

- Judge success on field data (p75 across real users), not on a single
  lab score. A good Lighthouse score does not guarantee good field
  metrics, and vice versa.
- Google's published "good" thresholds:
  LCP 2.5 seconds or less, INP 200 milliseconds or less, CLS 0.1 or
  less, measured at p75. Re-check these thresholds against web.dev
  before quoting them in a report.
- Do not measure or report First Input Delay (FID): it stopped
  being a Core Web Vital on 12 March 2024, when INP replaced it,
  and the `web-vitals` library removed `onFID()` in v5.
- LCP fixes, in order of typical impact: speed up the server response,
  preload the LCP resource (hero image or web font), remove render-
  blocking resources from the critical path, and avoid lazy-loading
  the LCP element.
- INP fixes: break up long tasks (over 50 ms) on the main thread,
  defer or yield during heavy JavaScript work, avoid unnecessary
  re-renders after an interaction, and reduce third-party script load.
- CLS fixes: reserve space for images, ads, embeds, and dynamically
  injected content with explicit width/height or aspect-ratio; avoid
  inserting content above existing content; use `font-display: swap`
  with fallback fonts sized to match.
- Every fix must be measurable: state which metric it targets and the
  expected direction of change before implementing it.

### Accessibility

- Layout stability is an accessibility issue: CLS disorients
  screen-magnifier users and causes mis-taps; treat a CLS failure as
  excluding people, not just a score.
- INP measures responsiveness for every input — keyboard and
  assistive-technology input included; test with keyboard, not just a
  mouse.
- Optimizations must not break accessibility: lazy loading, deferred
  scripts, and font swaps keep content keyboard-reachable and
  announced.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Measure the pages users actually visit most, not just the homepage.
  Template-level fixes on high-traffic templates pay off fastest.
- Test on a mid-range mobile device profile (throttled CPU and
  network), because that is where most real users experience the site.
- Track metrics over time in a simple log or dashboard; a single
  measurement is noise, a trend is evidence.
- Prefer removing work over optimizing it: fewer scripts, fewer
  images, less JavaScript beats clever optimization of things the page
  does not need.
- When a third-party script is the bottleneck, document its cost in
  milliseconds and escalate the decision to keep or remove it.

## Security Considerations

- Do not collect or log personally identifiable information alongside
  performance telemetry. The `web-vitals` library reports timings,
  not identities; keep it that way.
- Performance measurement tools run with broad page access; run
  Lighthouse and DevTools only against URLs you are authorized to
  test, and never against a site you do not own or manage without
  permission.
- Third-party performance scripts (RUM beacons) add a supply-chain
  dependency; load them from a trusted origin and review what data
  they send.

## Performance Considerations

- The act of measuring has a cost: RUM libraries add JavaScript to
  every page. Keep the measurement snippet small and load it after
  the page's critical work.
- Avoid fixing one metric by harming another — for example, inlining
  a large image to help LCP can hurt INP if it blocks the main thread
  during decode.
- Field data lags changes by days to weeks (CrUX aggregates over a
  28-day window); do not declare victory from lab data alone.

## Common Mistakes

- Treating a Lighthouse score as a substitute for real-user metrics —
  lab runs use simulated conditions and a single page load; field
  data is what users actually experience.
- Optimizing the homepage while the worst pages are deep product or
  article pages — measure the pages with the most traffic and the
  worst metrics.
- Lazy-loading the hero image — the LCP element should load eagerly
  and be preloaded when it is an image.
- Chasing a perfect CLS of 0 at the expense of content — a CLS under
  0.1 is good; reserve space for dynamic content instead of removing
  the content.
- Running lab tests with a warm cache and a fast network, then
  reporting the results as representative — always record and report
  the test conditions.

## Examples

Install and use the `web-vitals` library to collect real-user metrics
in the browser:

```js
// Report Core Web Vitals to an analytics endpoint you control.
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
  navigator.sendBeacon('/analytics/vitals', body);
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

Reserve space for an image so it cannot cause layout shift:

```html
<!-- Explicit width and height let the browser reserve the box before
     the image loads. CSS can still scale it responsively. -->
<img src="/hero.jpg" width="1200" height="630" alt="Product hero image">
```

## Validation Checklist

- [ ] Baseline p75 field values for LCP, INP, and CLS are recorded
      before changes, with the data source noted.
- [ ] Each failing metric has an identified root cause (LCP element,
      worst interaction, or shift source).
- [ ] Lab re-measurement after each fix shows improvement with no
      regression in the other metrics.
- [ ] Test conditions (device, network, cache state) are documented
      alongside every lab result.
- [ ] Post-ship field data confirms the improvement, or a date is set
      to check it once enough data has accumulated.
- [ ] No fix introduced a regression in another metric or in
      accessibility.
- [ ] Accessibility: CLS treated as excluding users; INP tested with keyboard input.

## Expected Deliverables

- A baseline report: p75 field values per URL, data source, and date.
- A diagnosis: root cause per failing metric, with the specific
  element or script responsible.
- The implemented fixes, each mapped to the metric it targets.
- Before/after measurements (lab immediately, field once available)
  with test conditions recorded.
- A short list of remaining opportunities and their estimated impact.

## References

- [web.dev — Web Vitals](https://web.dev/articles/vitals) — Core Web
  Vitals guides, thresholds, and debugging walkthroughs.
- [PageSpeed Insights](https://pagespeed.web.dev/) — field and lab
  data for any public URL.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — reference for the underlying web platform APIs.
- Related skills in this repository: `lighthouse`,
  `pagespeed-insights`, `web-performance-audit`, `image-optimization`,
  `javascript-optimization`, `caching-strategy`, `bundle-optimization`.
