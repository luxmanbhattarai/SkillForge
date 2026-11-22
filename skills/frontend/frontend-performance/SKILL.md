---
name: frontend-performance
description: >
  Measure and improve web page speed using Core Web Vitals, Lighthouse,
  and browser profiling, covering loading, rendering, and interactivity.
  Use when a page is slow, optimizing load time, reducing bundle size,
  fixing layout shift or slow interactions, optimizing images and fonts,
  or auditing performance before launch.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Frontend Performance

## Purpose

This skill makes pages fast in the ways users actually feel: content
appears quickly, the page stays stable while it loads, and interactions
respond without delay. It works from measurement — Core Web Vitals,
Lighthouse, and browser profiling — rather than from guesses, and it
prioritizes the fixes with the largest user impact: images, JavaScript
weight, render-blocking resources, and layout stability.

## When to Use

- A page loads slowly or scores poorly on Lighthouse or PageSpeed
  Insights.
- Reducing JavaScript bundle size or render-blocking resources.
- Fixing layout shift, slow interactions, or janky animation.
- Optimizing images, fonts, or third-party scripts.
- Auditing performance before launch or after a major change.

## When Not to Use

- Server-side performance (database queries, API latency): use the
  relevant backend or observability skill.
- Styling and layout as the primary task: use `css` or `responsive-design`.
- Framework-specific rendering optimization: use `nextjs`, `react`, or
  `astro` for their built-in mechanisms.
- SEO ranking as the goal: performance supports SEO, but use the SEO
  skills for ranking work.

## Prerequisites

- Version range: none — this skill covers web standards and measurement
  tools (Core Web Vitals, Lighthouse), not a versioned package.
- The page running in a browser, ideally in production or a
  production-like environment; development builds are not representative.
- A measurement tool: Lighthouse (in Chrome DevTools), PageSpeed Insights,
  or the Web Vitals extension.
- Access to the build output and bundle analysis for the project.
- A baseline measurement before making changes, so improvements are
  verifiable.

## Official Documentation

- [web.dev](https://web.dev/) — Google's performance guides, including
  Core Web Vitals and optimization patterns.
- [MDN: Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance) —
  guides on loading, rendering, and measurement.
- [PageSpeed Insights](https://pagespeed.web.dev/) — measure a live URL
  with lab and field data.

## Required Workflow

1. Measure first: run Lighthouse and PageSpeed Insights on the target
   page, and record the Core Web Vitals (Largest Contentful Paint,
   Interaction to Next Paint, Cumulative Layout Shift) and the
   opportunities list.
2. Identify the largest contributor: usually images, JavaScript, or
   render-blocking resources. Fix the biggest problem first.
3. Optimize images: correct sizes, modern formats, lazy loading for
   below-the-fold images, and `fetchpriority="high"` only on the hero
   image.
4. Reduce JavaScript: code-split routes, lazy-load heavy components, and
   remove unused dependencies. Check the bundle with an analyzer.
5. Remove render blocking: defer non-critical scripts, inline only
   genuinely critical CSS, and preload the single most critical resource.
6. Fix layout shift: reserve space for images, ads, and embeds; avoid
   inserting content above existing content after load.
7. Reduce third-party cost: audit every third-party script, defer or
   remove the ones that are not essential, and use facades for embeds.
8. Re-measure with the same tool and conditions, and compare against the
   baseline. Report the before-and-after numbers.

## Implementation Standards

- Core Web Vitals targets (Google's "good" thresholds): Largest
  Contentful Paint at or under 2.5 seconds, Interaction to Next Paint at
  or under 200 milliseconds, and Cumulative Layout Shift at or under 0.1.
  These are the thresholds published on web.dev, assessed at the 75th
  percentile of real-user field data (Chrome User Experience Report)
  over a 28-day window.
- Images: serve responsive images (`srcset` and `sizes`), modern formats
  (AVIF or WebP with a fallback where needed), explicit `width` and
  `height` (or `aspect-ratio`) to reserve space, `loading="lazy"` for
  below-the-fold images, and never lazy-load the LCP image.
- JavaScript: ship only what the page needs. Code-split by route, lazy
  load below-the-fold widgets with dynamic `import()`, and avoid
  importing whole libraries for one function.
- CSS: keep stylesheets small, remove unused rules, and avoid
  render-blocking CSS for below-the-fold content. Critical CSS inlining
  is an optimization to apply only when measurement justifies it.
- Fonts: self-host fonts, use `font-display: swap`, subset fonts to the
  characters needed, and limit the number of weights. Preload at most
  one or two font files.
- Third parties: every third-party script (analytics, chat, ads) must
  justify its cost. Load them with `defer` or `async`, or behind user
  interaction (facades for video embeds and maps).
- Caching: static assets get long-lived cache headers with content-hashed
  filenames; HTML gets a short cache or none.
- Server response: the HTML document should arrive fast (Time to First
  Byte under about 800ms is Google's "good" threshold for server
  response). Slow TTFB caps everything else.
- Animations: animate `transform` and `opacity` only; avoid animating
  layout properties.
- Measurement: use field data (real users) as the source of truth and lab
  data (Lighthouse) for diagnosis. A good lab score with bad field data
  means the lab conditions do not match the users.

### Accessibility

- Do not trade accessibility for speed: lazy-loaded content must still
  be keyboard-reachable and announced.
- Layout stability is an accessibility issue: CLS disorients
  screen-magnifier users and causes mis-taps; reserve space for
  late-loading content.
- Deferring scripts must not delay keyboard operability or leave
  controls inert without a visible state.
- Fonts: avoid invisible-text swaps that flash unstyled content; keep
  text readable during load.
- Reduced-motion users get the same content without the animation;
  do not gate content behind motion.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Optimize for the slowest realistic user: a mid-range phone on a slow
  connection, not a developer machine on fiber.
- Prioritize the LCP element: it is usually a hero image or a large text
  block. Make it load early and render fast.
- Use `content-visibility: auto` for long pages with many off-screen
  sections to skip rendering work for content the user has not reached.
- Use `fetchpriority="high"` on the LCP image and `fetchpriority="low"`
  on non-critical resources.
- Preconnect to origins that serve critical resources (`<link
  rel="preconnect">`), but only for origins actually used.
- Avoid layout shift from web fonts: use `font-display: swap` with a
  fallback font that has similar metrics, or `size-adjust` to match.
- Keep the DOM small: thousands of nodes slow rendering, style
  calculation, and interaction. Virtualize long lists.
- Monitor performance in CI: fail the build when Lighthouse scores or
  bundle size regress beyond an agreed budget.

## Security Considerations

- Performance tooling must not leak sensitive data: do not paste URLs
  with tokens, session ids, or personal data into public measurement
  tools.
- Third-party performance scripts (analytics, RUM) collect user data;
  ensure they comply with the site's privacy policy and consent
  requirements before adding them.
- Do not disable security headers (such as Content Security Policy) to
  improve a performance score; the trade is not worth it.
- Subresource Integrity hashes on third-party scripts cost nothing in
  performance and protect against compromised CDNs.

## Performance Considerations

- This skill is the performance skill; its own guidance is the content
  above. The meta-rule is: measure, change one thing, measure again.
  Optimizations without measurement are guesses, and guesses often make
  things worse.
- Performance budgets make the work durable: agree on a maximum JavaScript
  size, image weight, and LCP target, and enforce them in CI so the page
  does not quietly get slow again.

## Common Mistakes

- Optimizing without measuring — the fix targets the wrong bottleneck.
  Always measure first.
- Lazy-loading the hero image — delays the largest contentful paint.
  Lazy-load only below-the-fold images.
- Inlining all CSS — bloats the HTML and prevents caching. Inline only
  critical CSS, and only when measurement justifies it.
- Preloading everything — preloads compete with the document and each
  other. Preload one or two critical resources.
- Ignoring third-party scripts — a single chat widget can cost more than
  the entire first-party bundle. Audit them all.
- `width` and `height` missing on images — causes layout shift as images
  load. Always reserve space.
- Judging performance on a fast machine — the developer's laptop is not
  the user's phone. Test with throttled CPU and network.
- Chasing a perfect Lighthouse score — the score is a proxy for user
  experience, not the goal. Field data matters more than the lab number.
- Adding a performance library to fix performance — the library itself
  adds weight. Fix the cause instead.

## Examples

Optimized hero image and lazy-loaded content image:

```html
<!-- Hero image: the LCP element. High priority, never lazy-loaded. -->
<img
  src="hero-1600.avif"
  srcset="hero-800.avif 800w, hero-1600.avif 1600w"
  sizes="100vw"
  alt="A sourdough loaf cooling on a rack"
  width="1600" height="900"
  fetchpriority="high">

<!-- Below-the-fold image: lazy-loaded. -->
<img
  src="step-800.avif"
  alt="Shaping the dough"
  width="800" height="600"
  loading="lazy" decoding="async">
```

Preconnect and deferred scripts in `head`:

```html
<link rel="preconnect" href="https://fonts.example.com" crossorigin>
<link rel="preload" href="/fonts/body.woff2" as="font" type="font/woff2" crossorigin>
<script src="/analytics.js" defer></script>
```

Route-level code splitting with dynamic import:

```js
// Load the heavy chart component only when the user opens the dashboard.
const openDashboard = async () => {
  const { renderDashboard } = await import('./dashboard.js');
  renderDashboard(document.querySelector('#dashboard'));
};

document.querySelector('#dashboard-button')
  .addEventListener('click', openDashboard);
```

## Validation Checklist

- [ ] Lighthouse and PageSpeed Insights were run before and after the
      changes, and the numbers improved.
- [ ] LCP is at or under 2.5s, INP at or under 200ms, and CLS at or under
      0.1 in field data where available.
- [ ] Images are responsive, modern-format, sized, and lazy-loaded below
      the fold only.
- [ ] No render-blocking third-party scripts remain; all are deferred,
      async, or behind interaction.
- [ ] Fonts are self-hosted with `font-display: swap` and limited weights.
- [ ] The JavaScript bundle was analyzed and unused code removed.
- [ ] Performance budgets are documented or enforced in CI.
- [ ] Accessibility: lazy-loaded content stays keyboard-reachable; CLS does not disorient.

## Expected Deliverables

- Before-and-after measurements (Lighthouse scores, Core Web Vitals,
  bundle sizes) with the changes that produced them.
- Optimized assets and code: images, fonts, scripts, and stylesheets.
- A performance budget recommendation for the project.

## References

- [web.dev](https://web.dev/) — Core Web Vitals and optimization guides.
- [MDN: Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance) —
  loading, rendering, and measurement guides.
- [PageSpeed Insights](https://pagespeed.web.dev/) — live URL measurement.
- Related skills in this repository: `responsive-design`, `html`, `css`,
  `javascript`, `react`, `nextjs`, `astro`.
