---
name: seo-audit
description: >
  Run a full SEO audit of a website: crawlability, indexation, on-page
  elements, technical health, content quality, and backlink profile, then
  produce a prioritized findings report. Use when asked to audit a site,
  diagnose a traffic drop, review SEO health, or find ranking issues.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SEO Audit

## Purpose

A systematic audit finds the issues that prevent a site from being crawled,
indexed, and ranked well, and ranks them by impact so the highest-value fixes
come first. This skill produces a prioritized, evidence-backed audit report
rather than a list of vague observations. It never promises ranking outcomes;
it identifies problems and the fixes that address them.

## When to Use

- A site is launching, relaunching, or being acquired and needs a health check.
- Organic traffic or indexed page counts have dropped and the cause is unknown.
- A periodic (quarterly or annual) SEO review is requested.
- Before a redesign or migration, to record the baseline state.
- A stakeholder asks "why is our site not ranking" and wants evidence, not guesses.

## When Not to Use

- To research keywords for new content — use `keyword-research` instead.
- To analyze one competitor in depth — use `competitor-analysis` instead.
- To fix a single known issue (a broken redirect, one missing title) — fix it
  directly; a full audit is overkill.
- To audit only structured data — use `structured-data` instead.

## Prerequisites

- The site's canonical domain and, if available, access to Google Search
  Console and the site's analytics.
- A way to crawl the site (a crawler tool, a sitemap, or direct access to
  the codebase and rendered HTML).
- Knowledge of the site's platform (CMS, framework, hosting) and recent
  changes (redesigns, migrations, deployments).
- A list of the site's most important pages (homepage, money pages, top
  traffic pages) from analytics or Search Console.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's
  official SEO documentation hub.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  the technical, spam, and content policies every audited site must meet.
- [Google Search Console](https://search.google.com/search-console/about) —
  the official tool for indexation, performance, and issue reporting.
- [Schema.org](https://schema.org/) — the vocabulary reference for
  structured data checks.

Guidance current as of 2026-11-20.

## Required Workflow

1. Confirm scope: domain(s) included, sample size for large sites, and
   whether the audit covers content and links or technical factors only.
2. Check indexation: compare the number of indexed URLs in Search Console
   against the sitemap and crawl totals; investigate large gaps.
3. Crawl the site (or a representative sample of at least 500 URLs on large
   sites) and record status codes, redirect chains, and orphan pages.
4. Check crawl controls: `robots.txt`, meta robots tags, canonical tags,
   sitemap validity, and `hreflang` where the site is multilingual.
5. Review on-page elements on the top pages: titles, meta descriptions,
   headings, internal links, images, and structured data.
6. Check performance and rendering: Core Web Vitals, JavaScript rendering,
   and mobile usability in Search Console and PageSpeed Insights.
7. Review content quality: thin or duplicated pages, keyword cannibalization,
   outdated content, and pages with no internal links pointing to them.
8. Review the backlink profile at a high level: referring-domain count,
   anchor-text distribution, and any obvious spam patterns.
9. Score every finding by severity (critical, high, medium, low) and by
   estimated effort, then sort the report by impact per unit of effort.
10. Deliver the report with evidence for each finding (URL, observed value,
    expected value) and a concrete fix for each item.

## Implementation Standards

- Every finding must cite at least one real URL and the observed value; a
  finding without evidence is an opinion, not an audit result.
- Severity definitions: critical = blocks crawling, indexing, or revenue
  pages; high = measurably hurts rankings or traffic; medium = hurts a
  subset of pages; low = best-practice improvement.
- Sample large sites honestly: state the sample size and method, and never
  claim full-site coverage from a sample.
- Distinguish confirmed issues (observed in crawl data or Search Console)
  from suspected issues (inferred, needing verification).
- Do not invent traffic, ranking, or revenue numbers. Use only data from
  the site's own analytics and Search Console; label any estimate as an
  estimate.
- Group duplicate findings by root cause (one template bug, not 500 page
  findings) and count affected pages.

## Best Practices

- Start with indexation and crawlability before content; content fixes are
  wasted on pages search engines cannot reach.
- Compare against the previous audit when one exists, so regressions are
  visible and fixed items are confirmed closed.
- Check the rendered DOM, not just the HTML source, on JavaScript-heavy
  sites; title tags and canonicals injected by scripts can be missed.
- Audit the mobile version first: Google indexes the mobile version of a
  site by default.
- Re-verify critical findings a second time before reporting them; a false
  critical finding destroys trust in the whole audit.

## Security Considerations

- Do not crawl a site you are not authorized to audit; confirm ownership or
  permission before running any crawler.
- Crawl politely: respect `robots.txt`, use a reasonable crawl rate, and do
  not hammer a small site with concurrent requests.
- Never include credentials, API keys, or internal URLs from staging
  environments in the audit report.
- If the audit surfaces exposed sensitive data (admin pages indexed, private
  files reachable), report it immediately and privately, not in a shared
  document.

## Performance Considerations

- Limit crawl concurrency on small or shared hosting to avoid degrading the
  live site; a crawl that takes the site down is worse than no audit.
- For sites over 100,000 URLs, audit a stratified sample (top pages, a
  random sample, and one sample per template) rather than crawling everything.
- Cache crawl results so re-checks during the audit do not re-request every
  URL.

## Common Mistakes

- Reporting counts without context — "2,000 pages have no meta description"
  is meaningless without knowing how many of those pages matter.
- Treating tool scores as findings — a crawler's severity rating is a hint;
  verify each issue against the actual page.
- Auditing only the homepage — template-level problems show up across
  sections, so check at least one page per template.
- Ignoring the sitemap — a sitemap that lists URLs the site no longer serves
  wastes crawl budget and signals poor maintenance.
- Recommending fixes without effort estimates — a report with 200
  unprioritized findings is rarely acted on.

## Examples

Example finding entry (evidence-based, with a concrete fix):

```text
Severity: High
Finding: 47 product pages return a 200 status with an empty <title>.
Evidence: /products/widget-a, /products/widget-b, /products/widget-c
  (full list in appendix). Sampled 2026-11-20.
Impact: Pages with empty titles are less likely to earn clicks and
  cannot target their intended query.
Fix: Populate the title from the product name and category in the
  product template, e.g. "Widget A — Widgets | Example Store".
  Estimated effort: 1 template change, affects 47 pages.
```

Example severity summary table:

```text
| Severity | Count | Example |
|----------|-------|---------|
| Critical | 2     | robots.txt blocks /blog/ |
| High     | 9     | 47 empty titles |
| Medium   | 14    | Missing alt text on 120 images |
| Low      | 21    | Meta descriptions over ~160 chars (display heuristic) |
```

## Validation Checklist

- [ ] Every finding cites at least one real URL and an observed value.
- [ ] Severity and effort are assigned to every finding.
- [ ] Indexation, crawlability, on-page, performance, content, and links
      were all checked or explicitly excluded from scope.
- [ ] Findings are grouped by root cause, not duplicated per page.
- [ ] The report states the crawl date, sample size, and method.
- [ ] No ranking outcome is promised anywhere in the report.

## Expected Deliverables

- A prioritized audit report (document or markdown file) with findings,
  evidence, impact, and fixes, sorted by severity and effort.
- An appendix listing affected URLs per finding (or a linked spreadsheet
  for large counts).
- A one-page executive summary with the top five issues and the recommended
  order of fixes.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  technical, spam, and content policies.
- [Google Search Console](https://search.google.com/search-console/about) —
  indexation and performance data.
- Related skills in this repository: `technical-seo`, `on-page-seo`,
  `search-console`, `content-gap-analysis`, `competitor-analysis`,
  `schema-jsonld`.
