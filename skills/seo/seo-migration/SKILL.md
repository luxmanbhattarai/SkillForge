---
name: seo-migration
description: >
  Plans and executes SEO-safe website migrations: domain changes, URL
  restructuring, platform moves, HTTPS changes, and redesigns, aiming
  to preserve as much search visibility as possible. Use when changing
  domains, restructuring URLs, moving platforms or CMSs, redesigning a
  site, or merging sites, and when auditing a migration that already
  happened. Trigger keywords: SEO migration, site migration, domain
  change, URL redirect, 301 redirect map, platform migration, redesign
  SEO, site move, redirect chains.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SEO Migration

## Purpose

This skill moves a website — to a new domain, new URL structure, new
platform, or new design — while preserving the search visibility the
site has earned. It covers the pre-migration audit, the redirect map,
the launch checklist, and post-migration monitoring. Migrations are
among the highest-risk SEO events: a missed redirect or a blocked
crawl can cost months of traffic, so this skill treats the migration
as a controlled, reversible operation with verification at each step.

## When to Use

- Changing domains (including www to non-www or HTTP to HTTPS).
- Restructuring URLs (new slugs, new information architecture, or
  merging sections).
- Moving to a new platform, CMS, or hosting setup.
- Redesigning a site where templates, rendering, or content
  structure changes.
- Merging two sites into one, or splitting one site into two.
- Auditing a migration that already happened and traffic dropped.

## When Not to Use

- For a single URL change — set up one 301 redirect and update
  internal links; the full migration process is unnecessary.
- For canonical-only duplicate fixes — use `canonical-management`
  instead.
- For content refreshes with no URL or platform change — use
  `on-page-seo` and `content-research` instead.
- For international expansion that adds new versions without moving
  existing URLs — use `international-seo` instead.

## Prerequisites

- A full inventory of current URLs, with traffic, rankings, and
  backlink data for the important ones, from analytics and Search
  Console.
- Access to the old and new hosting, DNS, server configuration, and
  the new platform.
- A rollback plan: how to revert the change if the launch fails.
- A freeze on unrelated changes during the migration window, so
  problems can be attributed to the migration.
- Access to Google Search Console for both the old and new
  properties (for domain changes).

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's guidance on site moves and redirects.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for the migrated site.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for the new URL set.

Guidance current as of 2026-11-20. Since June 2026, Google's site move
guide covers using the Change of Address tool for all subdomain variants
(including www and non-www) during a domain migration; file the change
for every variant, not just the canonical one.

## Required Workflow

1. Audit before the move. Crawl the current site and record every
   URL, its status code, traffic, rankings, and inbound links.
   Identify the top pages that must not break.
2. Build the redirect map. Map every old URL that has traffic, links,
   or indexation to its new equivalent, one to one. Pages with no
   equivalent go to the closest relevant page, never all to the
   homepage.
3. Prepare the new site. Confirm the new URLs, templates, metadata,
   canonicals, hreflang, structured data, and internal links are
   correct on staging before launch.
4. Test redirects on staging. Verify each redirect returns HTTP 301
   to the right target, with no chains and no redirect loops.
5. Launch in a low-traffic window. Deploy the new site and the
   redirects together, then verify immediately: homepage, top pages,
   redirect samples, robots.txt, and sitemap.
6. Update external references. Submit the new sitemap in Search
   Console, use the change of address tool for domain changes (file it
   for all subdomain variants, including www and non-www), and
   update the most valuable external links where possible.
7. Monitor daily for two weeks, then weekly for two months. Watch
   Search Console coverage, crawl errors, indexed pages, traffic,
   and rankings; fix 404s and redirect problems as they appear.
8. Keep redirects live. Old-URL redirects stay in place for at least
   a year (longer for high-authority URLs); removing them too soon
   strands links and bookmarks.

## Implementation Standards

- Redirects are HTTP 301 (permanent) for moved content. Do not use
  302 for a permanent move, meta refreshes, or JavaScript redirects.
- One redirect hop per old URL: the old URL redirects directly to
  the final new URL. No chains (A to B to C) and no loops.
- Redirect targets are the closest equivalent page. Redirecting
  everything to the homepage is a soft 404 in practice and loses
  the old page's relevance.
- The new site's robots.txt must allow crawling; staging robots.txt
  (`Disallow: /`) must never reach production.
- Internal links are updated to point directly at new URLs, not at
  old URLs that redirect.
- Canonicals, hreflang, sitemaps, and structured data on the new
  site reference new URLs only.
- HTTPS is enforced on the new site with redirects from HTTP to
  HTTPS, and the canonical host (www or non-www) is consistent.
- Pages deliberately removed return HTTP 410 (gone) or 404, not a
  redirect to an unrelated page.
- The old domain stays registered and its redirects stay live for at
  least a year after a domain change.

## Best Practices

- Migrate in stages when possible: move a section first, verify it,
  then move the rest. A staged migration limits the blast radius.
- Keep URL changes minimal. If the platform move does not require
  new URLs, keep the old ones; every changed URL is a risk.
- Benchmark before the move: record traffic, rankings, indexed
  pages, and crawl stats so post-migration changes are measurable.
- Communicate the migration window to the team and freeze content
  changes during it.
- After launch, crawl the old URL list and confirm every important
  old URL redirects correctly.
- Expect some fluctuation: rankings often dip briefly after a
  migration and recover over days to weeks. A sustained drop beyond
  a few weeks signals a problem to investigate.

## Security Considerations

- Keep the old domain registered and its DNS under control; a lapsed
  domain can be taken over and used to impersonate the site.
- Redirect rules must not be open redirects: validate that redirect
  targets stay on approved domains, and never build redirects from
  unvalidated user input.
- Certificates for the old domain must stay valid while redirects
  are live, or HTTPS old URLs will fail before the redirect runs.
- Staging environments must require authentication and must not be
  indexable; a leaked staging copy can be indexed as duplicate
  content.

## Performance Considerations

- Redirects add a round trip. Keep them to one hop, serve them from
  the edge or web server (not application code), and update internal
  links so users and crawlers rarely hit them.
- The new platform must be at least as fast as the old one; a slower
  site after migration compounds the ranking risk.
- Monitor server errors and crawl rate after launch; a new platform
  that errors under crawler load will lose indexation quickly.

## Common Mistakes

- No redirect map — old URLs 404 and their traffic and links are
  lost. Map every important URL before launch.
- Redirect chains — the new platform adds its own redirects on top
  of the migration redirects. Audit the final hop for every old URL.
- Deploying staging robots.txt — a `Disallow: /` in production
  blocks the whole new site. Verify robots.txt immediately after
  launch.
- Redirecting everything to the homepage — users and search engines
  treat it as a dead end. Redirect to the closest equivalent page.
- Removing redirects too soon — links and bookmarks still point at
  old URLs. Keep redirects for at least a year.
- Changing URLs and design at once without a freeze — when traffic
  drops, no one can tell which change caused it. Stage changes and
  freeze unrelated work.

## Examples

A redirect map excerpt (old URL, new URL, status):

```text
/old-guide/                  /guides/new-guide/        301
/blog/2025/hello/            /blog/hello/              301
/products/old-widget/        /products/widget/         301
/removed-page/               (no equivalent)           410
```

A server redirect rule for a single URL (Apache syntax):

```apache
Redirect 301 /old-guide/ https://example.com/guides/new-guide/
```

A post-launch spot check with curl:

```bash
curl -I https://example.com/old-guide/
# Expect: HTTP/2 301 with a location header pointing at the new URL.
```

## Validation Checklist

- [ ] Every old URL with traffic, links, or indexation has a 301 to
      its closest equivalent, with no chains or loops.
- [ ] Internal links, canonicals, hreflang, sitemaps, and structured
      data reference new URLs only.
- [ ] robots.txt on production allows crawling, and the staging
      block is gone.
- [ ] The new sitemap is submitted in Search Console, and the change
      of address is filed for domain changes.
- [ ] Top pages verified live: correct content, metadata, and
      HTTP 200.
- [ ] Old domain and certificates remain valid while redirects are
      live.
- [ ] Monitoring is scheduled: daily for two weeks, weekly for two
      months, with a rollback plan documented.

## Expected Deliverables

- The pre-migration audit: URL inventory with traffic, rankings, and
  link data for key pages.
- The redirect map, implemented and tested, with removed pages
  marked 410 or 404.
- The launch verification report: spot checks, robots.txt, sitemap,
  and Search Console submissions.
- The monitoring plan and the rollback plan.

## References

- [Google Search Central](https://developers.google.com/search) — site move and redirect guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for the migrated site.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for the new URL set.
- Related skills in this repository: `sitemap-robots`, `canonical-management`, `hreflang`, `technical-seo`, `search-console`, `seo-audit`.
