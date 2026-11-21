---
name: sitemap-robots
description: >
  Creates and maintains XML sitemaps and robots.txt files that guide search
  engine crawlers to the right pages and keep them away from the wrong ones.
  Use when building or auditing a sitemap, writing robots.txt rules,
  submitting sitemaps to Search Console, fixing crawl coverage, or
  controlling which crawlers may access a site. Trigger keywords: XML
  sitemap, sitemap.xml, robots.txt, crawl budget, sitemap index, crawl
  control, disallow, Googlebot, Bingbot.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Sitemap & Robots

## Purpose

This skill produces correct XML sitemaps and robots.txt files so search
engines discover the pages that matter, crawl efficiently, and stay out
of pages that should not be crawled. A sitemap lists the canonical,
indexable URLs a site wants crawled; robots.txt tells crawlers which
paths to avoid. Neither file controls indexing directly — that is the
job of meta robots tags and canonicals — and this skill keeps those
responsibilities separate.

## When to Use

- Creating an XML sitemap for a new or existing site.
- Writing or revising robots.txt rules for search crawlers, AI
  crawlers, or aggressive bots.
- Submitting or updating a sitemap in Google Search Console or Bing
  Webmaster Tools.
- Diagnosing crawl coverage problems: pages not discovered, crawl
  budget wasted on junk URLs, or important pages blocked.
- Splitting a large sitemap into a sitemap index with child sitemaps.

## When Not to Use

- For controlling whether a page appears in search results — use
  meta robots `noindex` and `canonical-management` instead; robots.txt
  does not remove a URL from the index.
- For hreflang or canonical signals — use `hreflang` and
  `canonical-management`; sitemaps can carry those signals but are
  not the primary place to fix them.
- For AI crawler strategy in general — use `llm-seo` for the policy
  decision; this skill implements the robots.txt rules.
- For the llms.txt file — use `llms-txt` instead.

## Prerequisites

- A complete list of the site's canonical, indexable URLs, or access
  to the system that can generate one (CMS, static site generator,
  or database).
- Access to deploy files at the site root (`/sitemap.xml`,
  `/robots.txt`).
- Knowledge of which paths must not be crawled (admin, cart,
  checkout, internal search results, staging paths, API endpoints).
- Access to Google Search Console (or Bing Webmaster Tools) to submit
  the sitemap and check coverage.

## Official Documentation

- [Sitemaps.org](https://www.sitemaps.org/) — the sitemap protocol: format, limits, and sitemap index files.
- [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) —
  Google's sitemap guide: formats, size limits, and how Google treats
  each field.
- [How Google interprets the robots.txt specification](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt) —
  Google's robots.txt interpretation, including the 500 KiB file size
  limit and error handling.
- [Google Search Central](https://developers.google.com/search) — Google's guidance on sitemaps and robots.txt.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — crawlability baseline.

Guidance current as of 2026-11-20.

## Required Workflow

1. Inventory URLs. Generate the full list of canonical, indexable
   URLs from the content source. Exclude redirect targets, 404s,
   noindex pages, parameter variants, and non-canonical duplicates.
2. Build the sitemap. Produce XML following the sitemaps.org
   protocol, with one `<url>` per canonical URL and an accurate
   `<lastmod>` per page.
3. Split if needed. If the URL count approaches 50,000 or the file
   approaches 50 MB uncompressed, split into child sitemaps under a
   sitemap index.
4. Write robots.txt. Allow crawling of public content, disallow
   paths that waste crawl budget or expose internals, and reference
   the sitemap with a `Sitemap:` line.
5. Validate both files. Parse the XML, fetch robots.txt, and confirm
   every sitemap URL returns HTTP 200.
6. Deploy to the site root. Confirm `/sitemap.xml` and
   `/robots.txt` return HTTP 200 with the correct content types.
7. Submit the sitemap in Search Console and Bing Webmaster Tools,
   then check the coverage report after a few days.
8. Automate regeneration. Make sitemap generation part of the build
   or publish flow so it cannot go stale; review robots.txt whenever
   URL structure changes.

## Implementation Standards

- Sitemap protocol limits: at most 50,000 URLs and 50 MB uncompressed
  per sitemap file. Exceeding either requires a sitemap index.
- Every URL in the sitemap must be a canonical URL that returns HTTP
  200. No redirects, no 404s, no noindex pages, no non-canonical
  duplicates, no session or tracking parameters.
- `<lastmod>` must reflect the real last modification date of the
  page, in `YYYY-MM-DD` or full ISO 8601 format. Do not set every
  `<lastmod>` to the build date. Google uses `<lastmod>` only when it
  is consistently and verifiably accurate, and may ignore values it
  considers unreliable.
- `<changefreq>` and `<priority>` are optional; Google ignores both
  values entirely, so omit them unless another consumer needs them.
- Sitemap files must be UTF-8 encoded. Google enforces a 500 KiB
  size limit on robots.txt files; keep robots.txt well under it.
- Sitemap URLs must use the site's canonical host and HTTPS scheme,
  matching the URLs the site actually serves.
- robots.txt rules are specific, not broad. `Disallow: /` blocks the
  whole site and must never appear in a production file except during
  a deliberate, temporary block that is documented and time-boxed.
- robots.txt is advisory: it asks compliant crawlers not to fetch a
  path, but it does not hide the path, does not remove it from the
  index, and does not stop non-compliant crawlers.
- Never use robots.txt to protect sensitive content. If a URL must
  stay private, require authentication; do not rely on robots.txt.
- The `Sitemap:` line in robots.txt uses the absolute sitemap URL.
- A sitemap index lists child sitemaps with their own `<lastmod>`
  values, and each child sitemap follows the same rules as a
  standalone sitemap.

## Best Practices

- Generate sitemaps from the same source of truth as the site
  (content files, CMS, database) so the sitemap and the site cannot
  disagree.
- Keep a single sitemap index at `/sitemap.xml` for large sites, with
  child sitemaps grouped by content type (posts, pages, products).
- Include image and video URLs in sitemaps only when those media are
  a meaningful part of the page's value; otherwise keep the sitemap
  to HTML pages.
- Test robots.txt changes against real URLs before deploying: confirm
  important pages are allowed and junk paths are disallowed.
- After a migration or restructure, submit the new sitemap promptly
  and keep the old URLs redirecting; do not leave stale URLs in the
  sitemap.
- Document any bot-specific rules (for example AI crawlers) with a
  comment in robots.txt stating the reason and the decision date.

## Security Considerations

- robots.txt is public. Listing a sensitive path in `Disallow:` tells
  the world that path exists. Do not list admin, staging, or private
  paths by name; protect them with authentication instead.
- Never put credentials, tokens, or internal hostnames in robots.txt
  or sitemap comments.
- Sitemaps can expose URL patterns an attacker could enumerate. That
  is acceptable for public content; it is not acceptable for private
  content, which must never appear in a sitemap.

## Performance Considerations

- Sitemaps and robots.txt are static files served from the root; they
  must not hit application code or a database per request.
- Large sitemaps should be generated at build or publish time, not on
  demand, and may be gzip-compressed (`.xml.gz`) for transfer.
- A bloated sitemap wastes crawl budget: every non-indexable URL in
  it is a crawl spent on a page that cannot rank. Keep the sitemap
  to indexable URLs only.
- Robots.txt disallow rules for faceted navigation, internal search,
  and infinite parameter combinations protect crawl budget on large
  sites.

## Common Mistakes

- Putting non-canonical or redirecting URLs in the sitemap — crawlers
  waste budget and the sitemap loses trust. List canonical 200 URLs
  only.
- Using robots.txt to de-index a page — a blocked URL can still be
  indexed if other pages link to it. Use `noindex` for de-indexing.
- Blocking CSS or JavaScript in robots.txt — search engines need
  those resources to render pages. Allow them.
- Setting every `<lastmod>` to today — crawlers learn to ignore
  meaningless dates. Use real modification dates.
- Forgetting the sitemap after a migration — stale sitemaps point
  crawlers at dead URLs. Regenerate and resubmit.
- Deploying a staging robots.txt (`Disallow: /`) to production —
  always verify the production file after deploy.

## Examples

A minimal sitemap for a small site:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-11-18</lastmod>
  </url>
  <url>
    <loc>https://example.com/guides/sourdough-starter/</loc>
    <lastmod>2026-11-15</lastmod>
  </url>
</urlset>
```

A robots.txt file that allows public crawling, blocks internal paths,
and declares the sitemap:

```text
User-agent: *
Disallow: /admin/
Disallow: /cart/
Disallow: /checkout/
Disallow: /search?
Allow: /

Sitemap: https://example.com/sitemap.xml
```

## Validation Checklist

- [ ] Every sitemap URL is canonical, returns HTTP 200, and is not
      noindex, redirected, or a duplicate.
- [ ] Sitemap XML parses cleanly and stays within the 50,000 URL /
      50 MB limits (or uses a sitemap index).
- [ ] `<lastmod>` values are real modification dates, not build dates.
- [ ] robots.txt allows all public content and CSS/JS, and disallows
      only intended paths.
- [ ] No sensitive path is named in robots.txt, and no private URL is
      in the sitemap.
- [ ] `/sitemap.xml` and `/robots.txt` return HTTP 200 from the site
      root.
- [ ] The sitemap is submitted in Search Console, and the coverage
      report shows no unexpected errors after a few days.

## Expected Deliverables

- `sitemap.xml` (or a sitemap index with child sitemaps) deployed at
  the site root.
- `robots.txt` deployed at the site root, with bot-specific rules
  documented.
- A validation note: sitemap URL count, sample HTTP checks, and
  Search Console submission status.
- The regeneration method documented (build step, CMS plugin, or
  scheduled job) so the sitemap stays current.

## References

- [Sitemaps.org](https://www.sitemaps.org/) — the sitemap protocol specification.
- [Google Search Central](https://developers.google.com/search) — sitemap and robots.txt guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — crawlability baseline.
- Related skills in this repository: `canonical-management`, `technical-seo`, `search-console`, `llms-txt`, `llm-seo`.
