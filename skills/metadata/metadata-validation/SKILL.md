---
name: metadata-validation
description: >
  Validate page metadata across a site: check titles, descriptions,
  canonical URLs, Open Graph, and Twitter Cards for missing,
  duplicate, or broken values, and verify previews with platform
  debuggers. Use when auditing a site's metadata, after a template
  change, before a launch, or when shared previews look wrong.
  Covers crawls, checks, and debugger testing.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Metadata Validation

## Purpose

This skill helps an agent check that a site's metadata is actually
correct — not just present in the template, but correct in the
rendered HTML of real pages. The outcome is a report of what is
missing, duplicated, or broken, with the specific pages affected, so
fixes can be targeted instead of guessed.

## When to Use

- Auditing metadata across a site (missing, duplicate, or truncated
  titles and descriptions).
- After a template or CMS change that touches metadata.
- Before a launch, as a pre-flight check on every page type.
- When a shared preview looks wrong and the cause is unknown.
- Periodically, to catch metadata regressions from new content.

## When Not to Use

- When the task is writing the metadata content — use `seo-metadata`
  for titles and descriptions, `open-graph` and `twitter-cards` for
  social tags.
- When the task is generating metadata from data — use
  `dynamic-metadata` for the generation pattern.
- When the task is a single page's preview — check that page with a
  sharing debugger directly instead of running a full audit.
- When the task is structured-data validation — that is a separate
  check from meta-tag validation.

## Prerequisites

- A list of the site's URLs (sitemap, crawl, or CMS export).
- Access to fetch the site's pages (public URLs, or staging access).
- A way to fetch and parse HTML: a script, a crawler, or browser
  DevTools.
- Knowledge of the expected metadata per page type (which tags each
  template should produce).

## Official Documentation

- [Google Search Central — Titles and descriptions](https://developers.google.com/search/docs/appearance/title-link)
  — what good titles and descriptions look like.
- [The Open Graph protocol](https://ogp.me/) — the Open Graph
  properties to check.
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  — test and refresh how Facebook scrapes a URL.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  — test how LinkedIn renders a shared URL.

## Required Workflow

1. Build the URL list. Start from the sitemap, add pages the sitemap
   misses (key landing pages, paginated listings), and de-duplicate.
2. Define the expected metadata per page type: which tags each
   template must produce, and which values must be unique.
3. Fetch each page's rendered HTML and extract the metadata: title,
   description, canonical, robots, Open Graph, and Twitter Card tags.
4. Check each page against the rules:
   - Exactly one title, one description, one canonical.
   - Title and description present, non-empty, and unique across
     the site.
   - Canonical URL absolute, consistent in form, and returning a
     200 status.
   - Open Graph and Twitter Card tags present with absolute image
     URLs, and the image URL returning a 200 status.
   - No `noindex` on pages that should be indexed.
5. Check for duplicates across the site: identical titles,
   descriptions, or canonical URLs on different pages.
6. Test previews with a sharing debugger on at least one page per
   template, and record what each platform shows.
7. Write the report: issues grouped by type, with the affected
   pages, the severity, and the fix (which skill or template change
   applies).
8. After fixes, re-run the checks on the affected pages and confirm
   the issues are resolved.

## Implementation Standards

- Validate the rendered HTML that a crawler sees, not the template
  source. A tag in the template that never renders is not metadata.
- Check every page type, not just the homepage. Metadata bugs are
  usually template-specific.
- Treat duplicates as errors: two pages with the same title or
  canonical URL are competing or misconfigured.
- Verify that image URLs in Open Graph and Twitter Card tags return
  a 200 status and a reasonable size. A broken image URL is a
  broken preview.
- Verify canonical URLs resolve to a 200 status. A canonical that
  redirects or errors is broken.
- Do not assume all platforms render previews identically. Test
  each platform that matters for the site.
- Record the date and the tool used for every validation run, so
  results are comparable over time.
- Automate the checks where possible: a script that fetches pages
  and checks tags is repeatable; manual spot-checks are not.

## Best Practices

- Run validation before every launch and after every template change.
- Start with the highest-traffic pages; a metadata bug on a popular
  page costs more than one on a forgotten page.
- Keep the URL list fresh: a sitemap that is out of date will miss
  new pages and include deleted ones.
- Report issues with the page, the tag, the current value, and the
  expected value — enough detail that someone can fix it without
  re-investigating.
- Distinguish errors (missing title, broken canonical) from
  warnings (long description, missing optional tag) so the fix
  order is clear.
- Re-validate after fixes; a fix that was not verified is a guess.

## Security Considerations

- Validation fetches pages and reads their HTML. Only validate
  sites you are authorized to test.
- Do not include credentials or tokens in the URL list or in the
  report.
- The validation report can reveal the site's structure and
  internal pages; treat it as internal and do not publish it
  without review.
- When testing previews with a platform debugger, remember the
  debugger fetches the page from the platform's servers; do not
  submit URLs containing sensitive data.

## Performance Considerations

- Fetching many pages in parallel can load the origin server. Rate-
  limit the crawl and prefer staging or a sitemap-based list over
  brute-force crawling.
- Cache fetched pages during a run; do not fetch the same page
  twice for different checks.
- Keep the validation script fast enough to run regularly — a check
  that takes an hour will not be run.

## Common Mistakes

- Validating the template instead of the rendered HTML, and missing
  bugs that only appear at render time.
- Checking only the homepage and declaring the site valid.
- Ignoring duplicates because each page looks fine on its own.
- Not checking that image and canonical URLs actually resolve.
- Testing a preview on one platform and assuming the others match.
- Reporting issues without the affected pages, so nobody can fix
  them.
- Validating once and never again — new content reintroduces the
  same bugs.

## Examples

Fetch a page and extract its metadata with Node.js:

```js
// Fetch a page and print its title, description, and canonical URL.
const res = await fetch('https://example.com/blog/sourdough');
const html = await res.text();

const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '(missing)';
const description =
  html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '(missing)';
const canonical =
  html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '(missing)';

console.log({ title, description, canonical });
```

Check that an Open Graph image URL resolves:

```bash
curl -s -o /dev/null -w "%{http_code} %{size_download} bytes\n" \
  https://example.com/images/og/sourdough-crumb.jpg
```

A validation report entry:

```md
### Missing description — /blog/sourdough-starter

- Severity: error
- Found: no `<meta name="description">` in the rendered HTML.
- Expected: a unique description summarizing the article.
- Fix: add a summary field to the article, or a fallback in the
  metadata template (`dynamic-metadata`).
```

## Validation Checklist

- [ ] The URL list covers every page type and is de-duplicated.
- [ ] Each page was checked in its rendered HTML, not the template.
- [ ] Title, description, and canonical are present, unique, and
      non-empty on every page.
- [ ] Canonical and image URLs are absolute and return a 200 status.
- [ ] No page has duplicate titles, descriptions, or canonical URLs.
- [ ] `noindex` appears only where intended.
- [ ] Previews were tested with a debugger on at least one page per
      template.
- [ ] The report lists issues with page, tag, current value, and
      expected value.

## Expected Deliverables

- A validation report: issues grouped by type, with affected pages
  and severity.
- The URL list and the check results (or the script that produced
  them).
- Debugger test results for at least one page per template.
- A re-validation run confirming fixes, or a list of issues still
  open.

## References

- [Google Search Central — Titles and descriptions](https://developers.google.com/search/docs/appearance/title-link)
  — title and description guidance.
- [The Open Graph protocol](https://ogp.me/) — Open Graph
  properties.
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  — test Facebook previews.
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  — test LinkedIn previews.
- Related skills in this repository: `seo-metadata`, `open-graph`,
  `twitter-cards`, `dynamic-metadata`, `social-sharing`.
