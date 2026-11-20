---
name: technical-seo
description: >
  Fix and maintain the technical foundations of search visibility:
  crawlability, indexation, site speed, mobile rendering, HTTPS, redirects,
  canonicals, and JavaScript rendering. Use when diagnosing crawl or
  indexation problems, improving Core Web Vitals, or auditing site
  architecture.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Technical SEO

## Purpose

Technical SEO makes a site crawlable, indexable, fast, and correctly
rendered so search engines can discover and understand every page worth
ranking. This skill covers the infrastructure layer of SEO — the part
invisible to readers but decisive for whether content is found at all.
It does not promise rankings; it removes the technical barriers that
prevent a site from competing.

## When to Use

- Pages are not appearing in search results or Search Console reports
  indexation errors.
- A crawl finds redirect chains, broken links, duplicate URLs, or
  orphan pages.
- Core Web Vitals or PageSpeed scores are poor.
- The site is JavaScript-rendered and content may not be visible to crawlers.
- Before or after a migration, redesign, or platform change.
- A site is launching and its technical setup needs verification.

## When Not to Use

- To optimize a single page's titles or copy — use `on-page-seo` instead.
- To write or restructure sitemaps and robots.txt in depth — use
  `sitemap-robots` instead.
- To manage canonical tags as a standalone task — use
  `canonical-management` instead.
- To add structured data — use `schema-jsonld` instead.

## Prerequisites

- Access to the site's hosting, codebase, or CMS, and to Search Console.
- A current crawl of the site or a sitemap listing the URLs that should
  be indexed.
- Knowledge of the rendering approach (static, server-rendered, or
  client-side JavaScript) and the deployment pipeline.
- The site's canonical domain and whether the site is multilingual
  (see `hreflang`).

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  technical requirements every site must meet.
- [Sitemaps.org](https://www.sitemaps.org/) — the sitemap protocol
  specification.
- [RFC 9309 — Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309) —
  the standard for robots.txt.
- [Web Vitals](https://web.dev/vitals/) — definitions and thresholds for
  Core Web Vitals.

## Required Workflow

1. Verify the basics: the site serves over HTTPS, the canonical domain
   resolves, and there is exactly one canonical version of each URL
   (no http/https or www/non-www duplicates without redirects).
2. Check crawl access: fetch `robots.txt`, confirm it does not block
   important sections or resources (CSS, JavaScript) that rendering needs.
3. Check indexation: compare Search Console's indexed count with the
   sitemap count; investigate exclusions and errors page by page.
4. Audit status codes and redirects: every important URL returns 200;
   redirects are 301 for permanent moves, single-hop, and point at live
   pages; no redirect chains or loops.
5. Audit canonicals: every indexable page self-references its canonical
   URL; parameterized and duplicate URLs canonicalize to one version.
6. Verify rendering: fetch key pages as Googlebot would (Search Console's
   URL Inspection or a headless render) and confirm the rendered DOM
   contains the title, headings, body text, and links.
7. Check structured data with the Rich Results Test and fix errors on
   pages that carry markup.
8. Measure speed: run PageSpeed Insights on the main templates and record
   Largest Contentful Paint, Interaction to Next Paint, and Cumulative
   Layout Shift.
9. Check mobile: confirm the mobile version serves the same content,
   structured data, and metadata as desktop (Google indexes mobile-first).
10. Verify the sitemap: valid XML, only canonical 200 URLs, `lastmod`
    dates that reflect real changes, and submission in Search Console.
11. Re-check after fixes: re-crawl the changed URLs and request
    re-indexing in Search Console where the change is urgent.

## Implementation Standards

- HTTPS everywhere: no mixed content, no HTTP URLs served as canonical,
  and HSTS enabled where the hosting supports it.
- Redirects: 301 for permanent moves, 302 only for genuinely temporary
  moves; one hop maximum between the requested URL and the final URL.
- Canonical tags: absolute URLs, self-referencing on indexable pages,
  and consistent with the sitemap and internal links.
- Status codes: removed content returns 410 when intentionally gone or
  404 otherwise; never soft-404 (a 200 page that says "not found").
- Rendering: critical content and links must appear in the rendered DOM;
  content that only exists after user interaction is not reliably indexed.
- Core Web Vitals: aim for Google's published "good" thresholds for LCP,
  INP, and CLS on the main templates; treat failing templates as defects.
- Sitemaps: split at 50,000 URLs or 50 MB uncompressed per file, use a
  sitemap index for large sites, and list only indexable URLs.
- `robots.txt`: block only what must not be crawled (admin, search
  results, faceted filters); never block CSS or JavaScript resources.

## Best Practices

- Fix by template, not by page: a single template bug can affect
  thousands of URLs, and one fix resolves them all.
- Monitor Search Console weekly for new coverage errors; technical
  regressions usually appear there before traffic drops.
- Keep a redirect map during any URL change and test every redirect
  before launch, not after.
- Prefer server-side rendering or static generation for content pages;
  reserve client-side rendering for genuinely interactive sections.
- Log crawl errors from the server side too — a 500 that only appears
  under crawler load will not show up in a light crawl.

## Security Considerations

- Do not expose staging, admin, or internal tool URLs in the sitemap or
  allow them to be indexed; protect them with authentication, not just
  robots.txt (robots.txt does not prevent indexing).
- Never include credentials, tokens, or session IDs in URLs; they leak
  into logs, referrers, and search indexes.
- A redirect that accepts an arbitrary target URL is an open-redirect
  vulnerability; validate redirect targets against an allowlist.
- Keep the server and CMS patched; a compromised site can be demoted or
  removed from search results entirely.

## Performance Considerations

- Server response time is the foundation: a slow origin cannot be fixed
  by front-end optimization alone. Aim for fast time to first byte on
  the main templates.
- Reduce JavaScript shipped to content pages; heavy client-side rendering
  delays both users and crawlers.
- Cache static assets with long lifetimes and versioned filenames so
  repeat visits and crawls are cheap.
- Use a content delivery network for static assets when the audience is
  geographically spread.

## Common Mistakes

- Blocking JavaScript or CSS in robots.txt — Googlebot needs those
  resources to render the page as users see it.
- Using `noindex` on a page that is also blocked by robots.txt — the
  crawler can never see the `noindex` directive, so the URL may stay
  indexed.
- Redirect chains accumulated over years of migrations — each hop costs
  crawl budget and can lose signals.
- Treating a green PageSpeed score on the homepage as proof the whole
  site is fast — test every template, especially the slowest ones.
- Forgetting that a `noindex` page still consumes crawl budget; remove
  genuinely useless pages rather than only noindexing them.

## Examples

Example minimal robots.txt that blocks only what should not be crawled:

```text
User-agent: *
Disallow: /admin/
Disallow: /search?
Allow: /assets/

Sitemap: https://example.com/sitemap.xml
```

Example sitemap index for a site with more than one sitemap file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2026-11-20</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
    <lastmod>2026-11-20</lastmod>
  </sitemap>
</sitemapindex>
```

Example redirect rule (server config, Apache syntax) for a permanent move:

```apache
Redirect 301 /old-page https://example.com/new-page
```

## Validation Checklist

- [ ] Site serves HTTPS with no mixed content and one canonical domain.
- [ ] robots.txt does not block important pages or rendering resources.
- [ ] Sitemap is valid, lists only canonical 200 URLs, and is submitted
      in Search Console.
- [ ] No redirect chains, loops, or broken redirects on important URLs.
- [ ] Rendered DOM contains the title, headings, body, and links on key
      pages.
- [ ] Core Web Vitals meet Google's "good" thresholds on main templates.
- [ ] Mobile version serves the same content and metadata as desktop.

## Expected Deliverables

- A technical findings report with each issue, affected URLs, severity,
  and the exact fix.
- Updated robots.txt, sitemaps, redirect rules, and template code where
  fixes were applied.
- Before/after evidence: crawl excerpts, Search Console screenshots or
  exports, and PageSpeed results for the changed templates.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  technical requirements.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap protocol.
- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) — robots.txt standard.
- [Web Vitals](https://web.dev/vitals/) — Core Web Vitals definitions.
- Related skills in this repository: `seo-audit`, `sitemap-robots`,
  `canonical-management`, `search-console`, `seo-migration`.
