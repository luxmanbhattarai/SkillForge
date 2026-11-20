# SEO Audit

Audit a site's search visibility end to end: crawling, indexing,
on-page, structured data, performance, and measurement.

## Inputs

- The site URL and access to its Search Console data (when available).
- Audit scope: whole site, a section, or specific pages.
- Known issues or recent traffic changes, if any.

## Steps

1. **Define the scope.** Agree which pages and which dimensions the
   audit covers.
2. **Check crawlability and indexing** (`technical-seo`,
   `search-console`). Review robots, sitemaps, canonicals, redirects,
   and index coverage. Use Search Console data where available.
3. **Audit on-page SEO** (`on-page-seo`, `seo-audit`). Check titles,
   meta descriptions, headings, and internal links on the pages in
   scope.
4. **Audit structured data** (`schema-jsonld`, `schema` upstream).
   Check that markup exists where it should and validates without
   errors.
5. **Audit performance** (`core-web-vitals`). Check the metrics that
   affect search and user experience; hand off deep fixes to the
   performance workflow.
6. **Audit site structure** (`site-architecture` upstream). Check
   internal linking, depth of important pages, and orphaned content.
7. **Check AI-search readiness** (`geo-optimization`,
   `aeo-optimization`, `llm-seo`, `ai-seo` upstream) when the site's
   audience uses AI search. Note what can and cannot be measured.
8. **Prioritize findings.** Rank by likely impact and effort. Each
   finding gets evidence and a concrete fix.
9. **Write the report.** Include what was checked, what was found, and
   recommended next steps with owners.

## Outputs

- SEO audit report with findings ranked by impact.
- Recommended fixes with owners.
- Validated structured data for any pages fixed during the audit.

## Checks

- [ ] Every finding is backed by evidence from the site or Search
      Console.
- [ ] Structured data validates without errors.
- [ ] Redirects and canonicals point where they should.
- [ ] No promised rankings, traffic, or timelines.
- [ ] Missing data is reported as missing, not estimated.
