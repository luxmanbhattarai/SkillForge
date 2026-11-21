---
name: search-console
description: >
  Uses Google Search Console to monitor search performance, indexing, and
  technical health: verifying ownership, submitting sitemaps, reading
  coverage and performance reports, inspecting URLs, and fixing manual
  actions and crawl errors. Use when setting up Search Console, diagnosing
  indexing or ranking problems, auditing search traffic, or validating a
  migration or launch. Trigger keywords: Google Search Console, GSC,
  coverage report, URL inspection, performance report, indexing, manual
  action, sitemap submission, Core Web Vitals report, search traffic.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Search Console

## Purpose

This skill uses Google Search Console (GSC) to see how Google crawls,
indexes, and serves a website in search results. It covers property
verification, sitemap submission, the performance and coverage reports,
URL inspection, and fixing indexing problems and manual actions. Search
Console shows what Google reports about the site; it does not show
other search engines, and its data lags by a day or more, so this skill
treats it as the authoritative source for Google-specific facts and
pairs it with analytics for the full traffic picture.

## When to Use

- Setting up Search Console for a new site or a new domain version.
- Diagnosing why pages are not indexed or not appearing in search
  results.
- Auditing search performance: which queries, pages, and countries
  drive impressions and clicks.
- Submitting sitemaps and checking sitemap processing status.
- Inspecting a specific URL to see its index status, canonical, and
  last crawl date.
- Investigating a traffic drop, a manual action, or a security issue
  flagged by Google.
- Validating a migration, redesign, or launch (see `seo-migration`).

## When Not to Use

- For Bing or other search engines — use Bing Webmaster Tools for
  those; Search Console covers Google only.
- For keyword research from scratch — use `keyword-research`; Search
  Console shows queries the site already appears for, not the full
  market.
- For fixing the underlying technical problems Search Console
  reveals — use `technical-seo`, `sitemap-robots`, or
  `canonical-management` for the fix, and Search Console to verify it.
- For analytics beyond search — use the site's analytics platform
  for overall traffic, conversions, and user behavior.

## Prerequisites

- Access to the site's DNS, hosting, or HTML so ownership can be
  verified (DNS TXT record, HTML file upload, or HTML tag).
- A Google account with owner or full-user access to the property.
- The site's canonical domain decided (www or non-www, HTTPS), so
  the right property is verified.
- A sitemap URL ready to submit, if the site has one.

## Official Documentation

- [Google Search Console](https://search.google.com/search-console/about) — the product overview and entry point.
- [Google Search Central](https://developers.google.com/search) — guidance on Search Console reports and site management.
- [Search Console Help](https://support.google.com/webmasters/) — report definitions and troubleshooting.

Guidance current as of 2026-11-20. Two recent changes to know: AI Mode
traffic counts towards the totals in the Performance report (since
June 2025), and Search Console has a Generative AI performance report
for measuring how content performs in Google's generative AI features
(AI Overviews, AI Mode). The old International Targeting report was
deprecated in November 2022 and no longer exists.

## Required Workflow

1. Verify ownership. Add the property as a domain property (covers
   all subdomains and protocols) where DNS access allows; otherwise
   add the exact URL-prefix property for the canonical host.
2. Submit the sitemap. Add the sitemap URL and confirm it is read
   successfully; check the discovered URL count against expectations.
3. Establish the baseline. Record current impressions, clicks,
   average position, indexed pages, and any existing errors before
   making changes.
4. Review coverage weekly. Check the Pages report: valid indexed
   pages, and the reasons for excluded or error pages (404, redirect,
   noindex, duplicate, crawled but not indexed).
5. Review performance regularly. Check the Performance report for
   queries, pages, countries, and devices; note queries with high
   impressions and low clicks as optimization candidates.
6. Inspect problem URLs. Use URL Inspection on any page that should
   be indexed but is not, and read the index status, canonical
   selection, and last crawl information.
7. Fix and request validation. Fix the underlying problem first,
   then use "Validate fix" or "Request indexing" for the affected
   URLs; requesting indexing without fixing the cause wastes the
   request.
8. Check manual actions and security. Review the Manual Actions and
   Security Issues reports; any entry there needs immediate attention
   and a reconsideration request only after a genuine fix.

## Implementation Standards

- Verify the domain property when possible; it aggregates all
  subdomains and protocols into one view. Keep URL-prefix properties
  only where DNS verification is not possible.
- Keep all domain versions verified (www and non-www, HTTP and
  HTTPS) so a misdirected property does not hide data, but treat the
  canonical version as the source of truth.
- Submit only the canonical sitemap (or sitemap index) for the
  property; do not submit sitemaps from other domains or stale
  sitemap URLs.
- Read coverage reasons precisely: "Crawled — currently not
  indexed" and "Discovered — currently not indexed" are quality or
  crawl signals, not errors to fix with a button. Investigate the
  page before acting.
- Request indexing only for individual URLs that were fixed or newly
  published and genuinely need a prompt crawl; it is not a bulk
  submission tool.
- Do not compare Search Console clicks directly with analytics
  sessions; they measure different things and will differ.
- Data in Search Console is delayed (typically a day or more) and
  covers the last 16 months. Do not expect same-day data after a
  change.
- Record the date of every significant action (sitemap submission,
  fix validation, migration) so later changes in the reports can be
  attributed.

## Best Practices

- Check the Performance report with filters: compare the same period
  year over year, and segment by query, page, country, and device to
  find real patterns instead of averages.
- Export performance data regularly; the interface keeps 16 months,
  and an export preserves history beyond that.
- Watch the average position together with impressions: a position
  change with no impression change is usually noise.
- Treat "Discovered — currently not indexed" on a large scale as a
  quality or crawl-budget signal: review the affected pages for thin
  content or poor internal linking before requesting indexing.
- Use the Links report to spot the site's most-linked pages and any
  unexpected external links worth investigating.
- Check the Generative AI performance report to see how content
  performs in AI Overviews and AI Mode; AI Mode traffic also counts
  towards the Performance report totals, so a rise in impressions
  may come from AI surfaces rather than classic results.
- After a launch or migration, check coverage daily for two weeks;
  problems caught early are cheap to fix.

## Security Considerations

- Search Console access reveals the site's search data and allows
  actions such as removals and sitemap changes. Grant access only to
  people who need it, and remove access when they leave.
- The Removals tool can hide URLs from Google search results
  temporarily; never use it without a documented reason, and never
  grant removal access casually.
- Verification records (DNS TXT, HTML file) prove ownership; do not
  share verification tokens, and remove verification methods when
  access is revoked.
- A manual action or security issue (hacked site, malware) is a
  security incident, not just an SEO task: fix the underlying
  compromise before requesting review.

## Performance Considerations

- Search Console itself has no effect on site speed; the work it
  prompts (fixing crawl errors, reducing duplicate URLs) improves
  crawl efficiency.
- The Core Web Vitals report in Search Console groups URLs by
  performance; use it to find the page templates that need work,
  then fix the template rather than individual pages.
- Crawl stats show how much Google crawls the site and how often it
  hits errors; a rising error rate or falling crawl rate after a
  change deserves investigation.

## Common Mistakes

- Verifying the wrong property — a URL-prefix property for the
  non-canonical host shows partial data. Verify the domain property
  or the canonical URL prefix.
- Requesting indexing before fixing — the request does nothing if
  the page still returns an error or is still blocked. Fix first.
- Treating excluded pages as errors — many exclusions are correct
  (noindex pages, redirects, duplicates). Read the reason before
  acting.
- Comparing clicks to sessions — Search Console clicks and analytics
  sessions measure different things. Compare each tool against its
  own history.
- Ignoring the Pages report for months — indexing problems compound
  quietly. Review coverage at least weekly.
- Filing a reconsideration request before fixing a manual action —
  a request without a genuine fix is rejected and wastes time. Fix,
  verify, then request.

## Examples

A weekly coverage review checklist:

```md
## Weekly Search Console review

- Pages report: new errors or warnings since last week?
- Performance report: clicks and impressions vs. previous period?
- Top queries: any query with high impressions and low clicks?
- Sitemap: processed without errors, URL count as expected?
- Manual actions / security: any new entries?
```

URL Inspection outcomes and what each one means:

```md
- "URL is on Google" — indexed; check the canonical and last crawl date.
- "URL is not on Google: Crawled — currently not indexed" — Google
  crawled it and chose not to index it; review page quality and links.
- "URL is not on Google: Discovered — currently not indexed" — Google
  knows about it but has not crawled it; check internal links and
  crawl budget.
- "URL is not on Google: Not found (404)" — the URL returns 404;
  fix the link or restore the page.
```

## Validation Checklist

- [ ] The domain property (or canonical URL-prefix property) is
      verified and accessible to the right people.
- [ ] The sitemap is submitted, processed, and shows the expected
      discovered URL count.
- [ ] The Pages report has no unexpected errors; exclusions are
      understood and intended.
- [ ] Top pages are indexed, with the expected canonical selected.
- [ ] Performance baseline is recorded (clicks, impressions, average
      position) for comparison.
- [ ] No manual actions or security issues are outstanding.
- [ ] Access is limited to people who need it, and verification
      methods are documented.

## Expected Deliverables

- The verified Search Console property with the sitemap submitted.
- A baseline report: indexed pages, coverage issues, and performance
  summary.
- An issues list with the fix and verification status for each
  coverage or performance problem found.
- A monitoring schedule: weekly coverage and performance reviews,
  with an owner named.

## References

- [Google Search Console](https://search.google.com/search-console/about) — product overview and entry point.
- [Google Search Central](https://developers.google.com/search) — Search Console and site management guidance.
- [Search Console Help](https://support.google.com/webmasters/) — report definitions and troubleshooting.
- Related skills in this repository: `technical-seo`, `sitemap-robots`, `canonical-management`, `seo-migration`, `seo-audit`, `core-web-vitals`.
