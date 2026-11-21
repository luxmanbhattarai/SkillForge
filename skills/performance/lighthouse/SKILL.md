---
name: lighthouse
description: >
  Run and interpret Google Lighthouse audits for performance,
  accessibility, best practices, and SEO on any web page, using the
  Chrome DevTools panel or the command-line tool. Use when you need a
  repeatable lab audit of a single page, a before/after comparison for
  an optimization, or a checklist of concrete fixes. Covers Lighthouse
  categories, scoring, throttling, and CI integration.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Lighthouse

## Purpose

This skill helps an agent run Google Lighthouse audits correctly,
interpret the results without over-reading the scores, and turn the
audit output into a prioritized fix list. The outcome is a repeatable
lab measurement with documented conditions, plus concrete actions
ranked by estimated impact — not a single number treated as a verdict.

## When to Use

- Auditing a single page in a controlled lab environment before or
  after an optimization.
- Comparing two implementations of the same page (for example, before
  and after a bundle or image optimization).
- Getting a structured checklist of accessibility, best-practice, and
  SEO issues alongside performance.
- Adding automated performance checks to continuous integration.
- Investigating a specific Lighthouse audit failure, such as
  render-blocking resources or unused JavaScript.

## When Not to Use

- When you need to know what real users experience — Lighthouse is a
  lab tool; use `core-web-vitals` and field data for that.
- When you need field data for a URL or origin — use
  `pagespeed-insights`, which combines lab and field data.
- When the task is a full-site review across many pages — use
  `web-performance-audit` to scope the work first.
- When the page requires login or complex interaction to reach a
  state — Lighthouse audits the loaded page as-is; scripted flows
  need a different tool.

## Prerequisites

- A Chromium-based browser (for the DevTools panel) or Node.js 24 LTS
  (for the CLI). Lighthouse requires Node.js 22 LTS or later;
  Node.js 26 is the newer LTS since October 2026.
- The URL to audit, reachable from the machine running the audit.
- For CLI use: the `lighthouse` package, runnable with `npx`.
- For meaningful comparisons: a quiet machine, a stable network, and
  the same audit conditions every run.

## Official Documentation

- [Chrome DevTools — Lighthouse](https://developer.chrome.com/docs/lighthouse)
  — how to run Lighthouse in DevTools and from the command line.
- [web.dev — Lighthouse](https://web.dev/) — guides on interpreting
  scores and the audits behind them.
- [Lighthouse on GitHub](https://github.com/GoogleChrome/lighthouse)
  — source, configuration options, and release notes. Current
  versions run four categories (performance, accessibility,
  best-practices, seo); the PWA category and the `--budget-path`
  LightWallet workflow were removed in earlier majors, so do not
  use them. Check `lighthouse --help` for the flags your installed
  version accepts.

## Required Workflow

1. Decide the audit conditions before running anything: device
   emulation (mobile or desktop), network/CPU throttling (simulated
   or applied), and whether the page is tested cold (empty cache) or
   warm. Record them.
2. Run the audit. In DevTools, use the Lighthouse panel; from the
   CLI, run `npx lighthouse <url>` with the options you need and save
   the report.
3. Run at least three times under identical conditions and take the
   median result. Single Lighthouse runs vary by several points.
4. Read the opportunities and diagnostics sections first, not the
   headline score. Each opportunity lists an estimated saving; sort
   fixes by saving, not by category.
5. Map each opportunity to a concrete fix and the skill or change
   that implements it (for example, oversized images map to
   `image-optimization`).
6. Apply fixes one group at a time, then re-run under the same
   conditions and compare medians.
7. Archive the reports (HTML or JSON) with the conditions and date so
   future runs are comparable.

## Implementation Standards

- Always report the audit conditions alongside any score: device,
  throttling mode, Lighthouse version, and cache state. A score
  without conditions is not reproducible.
- Compare medians of at least three runs, never a single run. Report
  the spread if runs disagree by more than a few points.
- Treat the category scores as a summary, not a target. A page can
  score well while real users suffer, and a page can score poorly on
  an audit that does not affect its users.
- Prioritize by estimated savings in the opportunities list. Fix the
  largest saving first, and re-audit before moving to the next item.
- For CI, use the JSON report and assert on specific audits (for
  example, LCP under a threshold), not on the overall score alone.
- Use `--output=json --output-path=./report.json` for machine-readable
  results, and `--view` to open the HTML report locally.

## Best Practices

- Audit the pages users actually visit, starting with the highest-
  traffic templates, not only the homepage.
- Test mobile first: most real traffic is mobile, and mobile
  throttling exposes problems desktop runs hide.
- Keep the test machine quiet — close other tabs and background work
  — because Lighthouse is sensitive to CPU contention.
- Save the JSON report, not just the HTML: JSON lets you diff audits
  and track specific metrics over time.
- When an audit fails because of a third-party script, record the
  script, its cost, and whether it is removable before optimizing
  anything else.

## Security Considerations

- Lighthouse reports include the page's URLs, resource list, and
  sometimes response details. Do not publish reports for internal or
  staging URLs, and redact any sensitive query parameters before
  sharing a report.
- Run Lighthouse only against URLs you are authorized to test.
- The CLI fetches and executes the page's JavaScript in a headless
  browser; do not audit untrusted URLs on a machine with sensitive
  data.

## Performance Considerations

- Lighthouse itself is heavy: a full run takes tens of seconds and
  significant CPU. Do not run it in a loop against a production
  server at high frequency.
- Simulated throttling is faster and more stable than applied
  throttling, but applied throttling is closer to real conditions;
  pick one and keep it consistent within a comparison.
- In CI, run Lighthouse against a preview deployment, not production,
  and cap the number of audited URLs so the pipeline stays fast.

## Common Mistakes

- Reporting a single run as the result — Lighthouse scores vary run
  to run; always take a median of several runs.
- Comparing scores from different conditions (mobile vs. desktop,
  throttled vs. unthrottled) as if they were the same measurement.
- Chasing a score of 100 while ignoring field data — a perfect lab
  score does not guarantee good real-user metrics.
- Treating every audit as equally important — a failing audit with
  no estimated saving is lower priority than one saving seconds.
- Running Lighthouse on a local development build and treating the
  result as representative of production.

## Examples

Run a mobile audit from the command line and save JSON and HTML
reports. With multiple outputs, `--output-path` takes a single base
path and Lighthouse appends the report extension for each format
(`./lighthouse-report.report.json` and
`./lighthouse-report.report.html`); do not pass `--output-path`
twice.

```bash
npx lighthouse https://example.com/ \
  --output=json --output=html --output-path=./lighthouse-report \
  --only-categories=performance,accessibility
```

Run Lighthouse with desktop emulation instead of the mobile default:

```bash
npx lighthouse https://example.com/ \
  --preset=desktop \
  --output=json --output-path=./lighthouse-desktop.json
```

## Validation Checklist

- [ ] Audit conditions (device, throttling, cache state, Lighthouse
      version) are recorded with the results.
- [ ] At least three runs were taken under identical conditions and
      the median is reported.
- [ ] Opportunities are ranked by estimated saving, not by category.
- [ ] Each recommended fix is mapped to a concrete change or skill.
- [ ] Re-audit after fixes uses the same conditions as the baseline.
- [ ] Reports are archived (JSON at minimum) with date and conditions.

## Expected Deliverables

- The audit reports (HTML and/or JSON) with conditions documented.
- A prioritized fix list with estimated savings per item.
- Before/after medians when fixes were applied.
- Notes on any third-party or infrastructure issue outside the
  page's own code.

## References

- [Chrome DevTools — Lighthouse](https://developer.chrome.com/docs/lighthouse)
  — running Lighthouse in DevTools and from the CLI.
- [Lighthouse on GitHub](https://github.com/GoogleChrome/lighthouse)
  — source, configuration, and release notes.
- [web.dev](https://web.dev/) — guides on interpreting Lighthouse
  audits and scores.
- Related skills in this repository: `core-web-vitals`,
  `pagespeed-insights`, `web-performance-audit`, `image-optimization`,
  `javascript-optimization`, `bundle-optimization`.
