---
name: web-performance-audit
description: >
  Plan and run a full-site web performance audit: scope the pages to
  test, gather field and lab data, diagnose the biggest problems, and
  deliver a prioritized report with fixes. Use when a site is slow
  overall, before a launch or redesign, or when you need a structured
  performance review across many pages rather than a single-page check.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Web Performance Audit

## Purpose

This skill helps an agent run a structured performance audit across a
whole site: choose the pages that matter, measure them with both field
and lab data, find the problems that cost the most, and deliver a
report that ranks fixes by impact. The outcome is not a pile of scores
but a plan — what to fix first, why, and how to prove it worked.

## When to Use

- A site is slow overall and the cause is not yet known.
- Before a launch, redesign, or migration, to set a baseline.
- After a launch, to verify the new site performs as intended.
- When leadership or a client asks for a performance review with
  recommendations.
- Periodically (for example, quarterly) to catch regressions.

## When Not to Use

- When a single page is the problem — use `lighthouse` or
  `pagespeed-insights` on that page directly.
- When the problem is already known to be one metric — use
  `core-web-vitals` to diagnose it.
- When the problem is already known to be one asset class — use
  `image-optimization`, `javascript-optimization`, or
  `bundle-optimization` directly.
- When the task is ongoing monitoring rather than a one-off audit —
  set up real-user monitoring instead (see `core-web-vitals`).

## Prerequisites

- The site's URL and a list of its key page templates (homepage,
  article, product, listing, checkout, and similar).
- Access to analytics or traffic data to rank pages by visits.
- Access to the site's source code, or at least a channel to the
  team that owns it.
- Tools: a Chromium browser with DevTools, Node.js 24 LTS for CLI
  tooling, and access to PageSpeed Insights.

## Official Documentation

- [web.dev — Performance audits](https://web.dev/) — Google's
  guidance on measuring and improving web performance.
- [PageSpeed Insights](https://pagespeed.web.dev/) — field and lab
  data for public URLs.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — browser-neutral reference for the underlying concepts.

## Required Workflow

1. Scope the audit. List the page templates, rank them by traffic,
   and pick the pages to audit: the highest-traffic template of each
   type, plus any page known to be slow. Agree the scope before
   measuring.
2. Gather field data. For each audited URL, record the p75 field
   values for LCP, INP, and CLS from PageSpeed Insights, and note
   where field data is missing.
3. Gather lab data. Run Lighthouse on each audited URL under
   documented, identical conditions (mobile first), taking the
   median of at least three runs.
4. Diagnose. For each page, identify the top three problems by
   impact: the largest opportunities in the Lighthouse report, the
   heaviest resources, and the worst long tasks.
5. Group findings by root cause across pages. A problem that appears
   on every template (for example, a heavy shared script) is one
   fix, not ten.
6. Prioritize. Rank fixes by impact (how many users, how much time
   saved) and effort. High-impact, low-effort fixes go first.
7. Write the report: scope, method, findings per page, prioritized
   recommendations, and a verification plan.
8. Hand off the fixes to the relevant skills (`image-optimization`,
   `javascript-optimization`, `caching-strategy`, and similar) and
   schedule a re-audit to verify the results.

## Implementation Standards

- Always report field and lab data separately, with their sources
  and dates. Never present a Lighthouse score as real-user
  performance.
- Audit templates, not just the homepage. The homepage is rarely
  the worst page and rarely the most visited template.
- Use identical lab conditions for every page in the audit so the
  results are comparable, and record those conditions in the report.
- Rank recommendations by impact and effort, not by category. A
  single number per recommendation (for example, estimated seconds
  saved) beats a vague "high priority" label.
- Every recommendation must name the owner (which team or skill
  implements it) and how success will be measured.
- Do not invent numbers. If the impact of a fix is uncertain, say
  so and give a range or a method to measure it, not a fabricated
  figure.
- The report must include a verification plan: what to re-measure,
  when, and what counts as success.

## Best Practices

- Start with the pages users actually visit. Traffic data beats
  intuition about which pages matter.
- Look for shared root causes first: a slow template, a global
  script, or a CDN misconfiguration affects every page at once.
- Test on mobile first and on a throttled connection; that is where
  most users experience the site.
- Include third-party scripts in the audit: they are often the
  largest single cost and the easiest to challenge.
- Keep the report short and actionable. A ten-page report with
  three clear recommendations beats a fifty-page report nobody reads.
- Schedule the re-audit when the audit is delivered, not after the
  fixes are done.

## Security Considerations

- Audit only sites you are authorized to test. Running audits
  against a site you do not own or manage, without permission, is
  inappropriate.
- Audit reports can reveal infrastructure details (server headers,
  third-party services, resource URLs). Treat the report as
  internal and do not publish it without review.
- Do not include credentials, tokens, or session identifiers in
  audit URLs or reports.
- If the audit reveals a security issue (for example, an
  unencrypted resource or a leaked header), report it separately
  and promptly rather than burying it in the performance report.

## Performance Considerations

- The audit itself generates load: repeated Lighthouse runs against
  production add traffic. Space runs out and prefer staging or
  preview environments for heavy lab work.
- Field data lags changes by days to weeks (CrUX aggregates over a
  28-day window); plan the verification timeline accordingly.
- Do not let the audit become the bottleneck: timebox the work and
  deliver the top findings first if the full audit will take long.

## Common Mistakes

- Auditing only the homepage and declaring the site healthy.
- Reporting lab scores as if they were real-user metrics.
- Listing dozens of findings with no prioritization, so nothing
  gets fixed.
- Diagnosing the same root cause ten times instead of grouping it
  once.
- Delivering the report with no verification plan, so nobody knows
  whether the fixes worked.
- Comparing lab results taken under different conditions as if they
  were comparable.

## Examples

A minimal audit scope table, written before measuring:

```md
| Page | Template | Monthly visits | Why it matters |
| --- | --- | --- | --- |
| / | Homepage | 120,000 | Entry point |
| /blog/how-to-bake | Article | 45,000 | Top search landing page |
| /products/widget | Product | 30,000 | Conversion page |
```

A recommendation entry with impact, effort, and verification:

```md
### 1. Defer the chat widget script (all pages)

- Impact: removes ~200 ms of main-thread blocking on every page.
- Effort: small — one-line change to load on interaction.
- Owner: frontend team (`javascript-optimization`).
- Verify: re-run Lighthouse on / and /blog/how-to-bake; confirm
  Total Blocking Time drops and INP field data improves within
  28 days.
```

## Validation Checklist

- [ ] The audit scope (pages and templates) was agreed before
      measuring.
- [ ] Field data (p75 LCP, INP, CLS) is recorded for each audited
      URL, with missing data noted.
- [ ] Lab data is the median of at least three runs under identical,
      documented conditions.
- [ ] Findings are grouped by root cause across pages.
- [ ] Recommendations are ranked by impact and effort, each with an
      owner and a verification method.
- [ ] The report includes a verification plan and a re-audit date.
- [ ] No invented numbers appear in the report; uncertain impacts
      are labeled as estimates.

## Expected Deliverables

- An audit report: scope, method, per-page findings, and
  prioritized recommendations.
- The underlying data: field readings, Lighthouse reports, and test
  conditions.
- A verification plan with a re-audit date.
- Handoff notes mapping each recommendation to the skill or team
  that implements it.

## References

- [web.dev](https://web.dev/) — performance measurement and
  improvement guides.
- [PageSpeed Insights](https://pagespeed.web.dev/) — field and lab
  data for public URLs.
- [MDN — Web performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
  — reference for the underlying concepts.
- Related skills in this repository: `core-web-vitals`, `lighthouse`,
  `pagespeed-insights`, `image-optimization`,
  `javascript-optimization`, `caching-strategy`, `bundle-optimization`.
