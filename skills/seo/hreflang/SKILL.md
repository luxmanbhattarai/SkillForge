---
name: hreflang
description: >
  Implements hreflang annotations so search engines show each language and
  regional version of a page to the right audience. Use when adding or
  auditing hreflang tags, fixing wrong-language results, setting up
  multilingual or multi-regional sites, or choosing between hreflang in
  HTML, sitemaps, and HTTP headers. Trigger keywords: hreflang, multilingual
  SEO, language targeting, regional targeting, x-default, language versions,
  wrong language in search results.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Hreflang

## Purpose

This skill implements `hreflang` annotations that tell search engines
which language and regional version of a page to show each user, so a
German speaker sees the German page and a US visitor sees the US page
instead of the wrong variant. It covers hreflang in HTML link tags,
XML sitemaps, and HTTP headers, plus the return-tag rule, x-default,
and auditing for common errors. Hreflang is a signal, not a guarantee:
search engines may still show another version when signals conflict or
a version is missing.

## When to Use

- Launching or auditing a multilingual or multi-regional site with
  translated or localized versions of the same pages.
- Fixing search results that show the wrong language or regional
  version of a page.
- Adding an x-default fallback page for users whose language has no
  dedicated version.
- Choosing how to deliver hreflang: HTML tags, sitemap entries, or
  HTTP headers (for non-HTML files such as PDFs).
- Auditing hreflang after a migration, redesign, or URL restructure.

## When Not to Use

- For a single-language, single-region site — hreflang adds nothing;
  use `canonical-management` and `on-page-seo` instead.
- For deciding the site's international structure (subdirectories,
  subdomains, or country domains) — use `international-seo` first;
  this skill implements hreflang within the chosen structure.
- For translating content — hreflang annotates translations, it does
  not create them.
- For geo-targeting by IP redirect — that is a separate mechanism
  with its own risks; see `international-seo`.

## Prerequisites

- A complete map of language and regional versions: every page that
  exists in more than one version, with its URL per version.
- A decision on the URL structure for each version (for example
  `/de/`, `/fr/`, `/en-us/` subdirectories).
- Valid language and region codes: ISO 639-1 language codes (such as
  `de`, `fr`, `en`) with optional ISO 3166-1 Alpha-2 region codes
  (such as `de-DE`, `en-US`, `fr-CA`).
- Access to the templates, sitemap generator, or server configuration
  that will emit the hreflang annotations.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's guidance on localized versions and hreflang.
- [Localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions) —
  Google's hreflang guide: the three equivalent methods, return-tag
  rules, and x-default.
- [The International Targeting report is deprecated](https://support.google.com/webmasters/answer/12474899) —
  Search Console Help: the International Targeting report and country
  targeting were deprecated; hreflang itself is still supported.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for indexable, localized pages.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for carrying hreflang in XML sitemaps.

## Required Workflow

1. Map the versions. Build a table of every page and its URL in each
   language or region. Note pages that exist in only some versions.
2. Choose the delivery method. HTML link tags for HTML pages are the
   usual choice; sitemap hreflang suits very large sites; HTTP
   headers are for non-HTML files. Use one method consistently per
   page set.
3. Assign codes. Use the correct language code for each version, and
   add a region code only when the content genuinely differs by
   region (currency, spelling, local rules). Do not invent codes.
4. Implement return tags. Every version of a page must link to every
   other version, including itself. If page A links to page B, page
   B must link back to page A.
5. Add x-default. Point `x-default` at the fallback page shown to
   users whose language has no version — usually the language
   selector or the global English page.
6. Keep canonicals consistent. Each version's canonical points to
   itself, not to another language version; hreflang handles the
   relationship between versions.
7. Validate. Check that every hreflang URL returns HTTP 200, that
   return tags are complete, and that codes are valid. Fix broken or
   one-way links before launch.
8. Monitor. Check hreflang with a crawler or a dedicated hreflang
   validation tool and spot-check search results for the wrong
   language over the following weeks. Note: Google deprecated Search
   Console's International Targeting report (and its country
   targeting setting) in November 2022, so there is no Search
   Console report that validates hreflang; use URL Inspection on
   individual pages plus a crawl-based check instead.

## Implementation Standards

- Language codes use ISO 639-1 (two letters, lowercase). Region codes
  use ISO 3166-1 Alpha-2 (two letters, uppercase), separated by a
  hyphen: `en-US`, `pt-BR`, `zh-Hant`.
- Use a language-only code (`de`) when one version serves all regions
  speaking that language; use a language-region code (`de-AT`) only
  when the content is genuinely region-specific.
- Never use a region code alone (`US`) or a made-up code. If the
  correct code is uncertain, check the ISO lists rather than guessing.
- Every hreflang cluster is fully bidirectional: each page lists all
  versions, including itself, and every listed URL lists it back.
- `x-default` is included in every cluster and points to the fallback
  page. Google recommends x-default for unmatched languages; it is a
  recommendation, not a requirement, but this skill treats it as a
  standard so no user gets an arbitrary version.
- Hreflang does not tell Google what language a page is in: Google
  determines page language from the visible content using its own
  algorithms, not from hreflang or the HTML `lang` attribute.
  Hreflang only says which version to show which audience.
- Hreflang URLs are absolute, canonical, HTTP 200 URLs. Never point
  hreflang at a redirect, a 404, or a noindex page.
- Do not combine methods for the same pages in conflicting ways; if
  hreflang is in both HTML and the sitemap, the two must agree
  exactly.
- Each language version is a full translation or localization, not a
  machine-translated stub; hreflang on thin translations does not
  create a good result for that audience.
- Pages that exist in only one language get no hreflang cluster; do
  not invent partner URLs for them.

## Best Practices

- Generate hreflang from the same page map the site uses for
  navigation and sitemaps, so annotations cannot drift from the real
  URL structure.
- Keep URL structures parallel across languages (`/de/guide/`,
  `/fr/guide/`) so the mapping is easy to generate and audit.
- Use sitemap hreflang for very large sites to keep HTML head
  sections small; keep HTML hreflang for smaller sites where it is
  easier to verify.
- After adding a new language, audit every cluster: a new version
  must be added to every existing page's hreflang set, not just its
  own pages.
- Let users override language detection with a visible language
  switcher; never force-redirect based on guessed location alone.

## Security Considerations

- Hreflang URLs must be generated from trusted site data, never from
  user input; an injected hreflang URL can point search engines and
  users at a malicious domain.
- Language switchers and locale parameters must validate the locale
  against an allowlist of supported codes; unvalidated locale input
  can enable open redirects or reflected content issues.
- Do not expose internal or staging language versions through
  hreflang; only production URLs belong in annotations.

## Performance Considerations

- HTML hreflang adds a link tag per version per page; for sites with
  many languages, prefer sitemap hreflang to keep page heads small.
- Generate hreflang at build time from the page map rather than
  computing clusters on every request.
- Hreflang does not add crawl load by itself, but each language
  version is a separate crawlable page; budget crawl capacity for the
  full set of versions.

## Common Mistakes

- Missing return tags — page A links to B but B does not link back,
  so Google may ignore the annotation. Every link must be returned.
- Wrong codes — using `uk` for English (it is Ukrainian), `en-UK`
  instead of `en-GB`, or a region code without a language. Use the
  ISO lists.
- Pointing hreflang at redirects or 404s — the annotation is ignored
  for that URL. Point at canonical HTTP 200 URLs only.
- Canonicalizing all versions to one language — each version must
  canonicalize to itself; the canonical and hreflang signals must
  not contradict each other.
- Forgetting x-default — users with no matching language get an
  arbitrary version instead of the intended fallback.
- Annotating machine-translated stubs — thin translations annotated
  with hreflang produce poor results and may be treated as low
  quality. Translate properly or do not ship the version.

## Examples

HTML hreflang for a page in English, German, and French, with an
x-default fallback:

```html
<link rel="alternate" hreflang="en" href="https://example.com/guide/" />
<link rel="alternate" hreflang="de" href="https://example.com/de/guide/" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/guide/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/guide/" />
```

The same cluster expressed in an XML sitemap entry:

```xml
<url>
  <loc>https://example.com/guide/</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/guide/" />
  <xhtml:link rel="alternate" hreflang="de" href="https://example.com/de/guide/" />
  <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/guide/" />
  <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/guide/" />
</url>
```

## Validation Checklist

- [ ] Every version of each page lists all versions, including
      itself, and every link is returned.
- [ ] All language and region codes are valid ISO codes, correctly
      cased.
- [ ] `x-default` is present in every cluster and points to the
      intended fallback page.
- [ ] Every hreflang URL is absolute, canonical, and returns HTTP 200.
- [ ] Each version's canonical points to itself, not to another
      version.
- [ ] HTML and sitemap hreflang agree where both are used.
- [ ] A hreflang validation check (crawler or dedicated tool) shows
      no errors for the site after the change has been live for
      several days, and URL Inspection confirms the expected
      canonical per version.

## Expected Deliverables

- Hreflang annotations implemented in HTML, sitemap, or headers as
  chosen, generated from the page map.
- The version map: every page with its URL per language and region.
- A validation report: clusters checked, return tags verified, and
  any broken or missing versions listed.
- A maintenance note: the process for adding a new language version
  to every existing cluster.

## References

- [Google Search Central](https://developers.google.com/search) — localized versions and hreflang guidance.
- [Localized versions of your pages](https://developers.google.com/search/docs/specialty/international/localized-versions) —
  Google's hreflang guide.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for localized pages.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for hreflang entries.
- Related skills in this repository: `international-seo`, `canonical-management`, `sitemap-robots`, `search-console`.
