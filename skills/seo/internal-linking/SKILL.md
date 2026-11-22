---
name: internal-linking
description: >
  Design and maintain a site's internal link structure so important pages
  are discoverable, authority flows to priority pages, and readers can
  navigate by topic. Use when planning site architecture, fixing orphan
  pages, or improving how pages pass relevance to each other.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Internal Linking

## Purpose

Internal links do three jobs: they help crawlers discover and understand
pages, they pass relevance and authority from strong pages to priority
pages, and they help readers move between related topics. This skill
covers how to design a link structure — navigation, hub-and-spoke topic
clusters, contextual links, and breadcrumbs — and how to audit and fix it.
It does not promise rankings; it makes the site's structure work for the
content that already exists.

## When to Use

- Planning a new site's architecture or a new section.
- A crawl finds orphan pages (no internal links pointing to them).
- Important pages are buried deep in the site (many clicks from the
  homepage).
- Building a hub-and-spoke topic cluster from `keyword-clustering`.
- A site redesign or migration changes URLs or navigation.

## When Not to Use

- To earn links from other sites — use `off-page-seo` instead.
- To fix crawl or indexation problems caused by robots or redirects —
  use `technical-seo` instead.
- To choose which topics to cover — use `keyword-clustering` and
  `content-gap-analysis` first.
- To add breadcrumb structured data — use `schema-jsonld` for the markup.

## Prerequisites

- A crawl or sitemap of the site showing pages and their current links.
- The site's priority pages (from analytics, Search Console, or business
  goals).
- The topic cluster map from `keyword-clustering`, where one exists.
- Access to edit templates (navigation, footers, breadcrumbs) and page
  content.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on site structure and navigation.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  technical and content policies.

The three-click depth target in
this skill is an industry heuristic, not a Google requirement.

## Required Workflow

1. Audit the current structure: crawl the site and record click depth
   (clicks from the homepage) for every page, and identify orphan pages.
2. List the priority pages: the pages that must rank or convert, and
   confirm each is reachable within three clicks of the homepage.
   (Three clicks is an industry rule of thumb, not a Google-published
   limit; shallow depth helps crawlers and users alike.)
3. Design the hierarchy: homepage → sections → topic hubs → supporting
   pages, with navigation reflecting the main sections.
4. Define hub-and-spoke links for each topic cluster: the pillar page
   links to every spoke, and every spoke links back to the pillar.
5. Add contextual links inside body content: link from a page to related
   pages where the reference helps the reader, using descriptive anchor
   text.
6. Add breadcrumbs on deep pages so users and crawlers can see the
   page's place in the hierarchy.
7. Fix orphans: every indexable page needs at least one internal link
   from an indexed page, ideally from a contextually related page.
8. Remove or fix links to redirected, broken, or noindex pages in
   navigation and body content.
9. Check anchor text: descriptive and varied, matching the linked page's
   topic without repeating the same exact-match anchor everywhere.
10. Re-crawl after changes and verify: no orphans, priority pages within
    three clicks, and no broken internal links.

## Implementation Standards

- Every indexable page is reachable by links from the homepage within
  three clicks, and no indexable page is an orphan. (Three clicks is
  an industry rule of thumb, not a Google-published limit; Google
  publishes no click-depth threshold.)
- Links use real `<a href>` elements with absolute or root-relative URLs;
  links that depend on JavaScript to function are not reliable for
  crawlers.
- Anchor text describes the linked page's topic; generic anchors like
  "click here" or "read more" are avoided in body content.
- A page links to related pages, not to every page: relevance decides
  links, and link count per page stays reasonable for the content length.
- Navigation links reflect the site's main sections; footer links are
  for utility pages, not for stuffing keyword links.
- Links to a page use its canonical URL; never link to a redirected or
  parameterized version of a URL.
- `nofollow` is not used on internal links to control authority flow;
  it is reserved for untrusted or paid external links.

### Accessibility

- Link text describes its destination (WCAG 2.4.4): "the 2026 Search
  Console guide", not "click here" or a bare URL.
- Links in navigation and content are real anchors, keyboard-focusable,
  with visible focus.
- Do not overload pages with links to the same destination under
  different text — screen-reader users hear every one.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Link from high-traffic and high-authority pages to the pages that
  need a boost: a link from the homepage or a popular guide carries
  more weight than one from a deep page.
- Place contextual links early in the body where they fit naturally;
  links in the first sections are more likely to be followed and noticed.
- Use breadcrumbs as a second navigation layer, not a replacement for
  contextual links.
- When a page is deleted or moved, update the internal links that
  pointed to it — do not rely on redirects forever.
- Review internal links after every major content push: new pages need
  links in, and older pages may gain a relevant new page to link to.

## Security Considerations

- Never generate internal links from unescaped user input; a crafted
  link target can enable phishing or open-redirect attacks.
- Do not link to admin, staging, or internal-only URLs from public
  pages; those links leak internal structure and may get indexed.
- When linking to user-generated content, ensure the target pages are
  moderated; unmoderated pages can host spam or malicious links.

## Performance Considerations

- Internal links themselves cost nothing in performance, but the pages
  they point to must be fast; a link to a slow page is a poor user
  experience.
- Avoid link-heavy mega-menus that bloat every page's HTML; keep
  navigation markup lean, especially on mobile.
- Re-crawls after link changes should be scoped to the changed sections
  rather than the whole site on large sites.

## Common Mistakes

- Orphan pages — published content with no links pointing to it, which
  crawlers may never discover and readers cannot reach.
- Deep priority pages — a key page five clicks from the homepage signals
  low importance to crawlers and is hard for users to find.
- Exact-match anchor text everywhere — repeating the same keyword anchor
  looks manipulative and reads poorly; vary anchors naturally.
- Linking to redirected URLs — chains waste crawl budget and dilute the
  link's value; link to the final URL.
- Relying on a sitemap instead of links — a sitemap helps discovery but
  does not pass relevance the way a real link does.

## Examples

Example hub-and-spoke links for a sourdough section:

```text
/sourdough-guide (pillar)
  links to: /how-to-make-sourdough-starter
            /sourdough-wont-rise
            /sourdough-starter-ratio
            /best-bread-flour
  each spoke links back to /sourdough-guide and to 1-2 sibling spokes
  where relevant.
```

Example contextual link with descriptive anchor text:

```html
<p>If your dough is not rising, the problem is often an underfed starter.
See <a href="/how-to-make-sourdough-starter">how to make a sourdough
starter</a> for the feeding schedule that keeps it active.</p>
```

Example breadcrumb markup (visible navigation; structured data belongs
in `schema-jsonld`):

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/sourdough-guide">Sourdough Guide</a></li>
    <li aria-current="page">Fix Sourdough That Won't Rise</li>
  </ol>
</nav>
```

## Validation Checklist

- [ ] No indexable page is an orphan.
- [ ] Priority pages are within three clicks of the homepage.
- [ ] Hub pages link to their spokes and spokes link back.
- [ ] No internal links point to broken, redirected, or noindex pages.
- [ ] Anchor text is descriptive and varied, not generic or stuffed.
- [ ] Breadcrumbs exist on deep pages.
- [ ] A re-crawl after changes confirms the structure.
- [ ] Accessibility: link text describes its destination; links are real anchors.

## Expected Deliverables

- An internal link audit: orphan pages, deep pages, and broken links
  found, with fixes applied or listed.
- A link structure plan: hierarchy, hub-and-spoke maps, and the
  priority pages each section supports.
- Updated templates and content with the new links in place.
- A re-crawl report confirming orphans and depth issues are resolved.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on site structure.
- Related skills in this repository: `keyword-clustering`, `technical-seo`,
  `on-page-seo`, `schema-jsonld`, `seo-audit`.
