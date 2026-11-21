---
name: international-seo
description: >
  Plans and implements search optimization for multilingual and
  multi-regional websites, covering URL structure, hreflang strategy,
  localization, and geo-targeting. Use when expanding a site into new
  languages or countries, choosing between subdirectories, subdomains, and
  country domains, localizing content, or fixing international targeting
  problems. Trigger keywords: international SEO, multilingual SEO,
  multi-regional, geo-targeting, ccTLD, subdirectories vs subdomains,
  localization, global SEO, language versions.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# International SEO

## Purpose

This skill plans how a website serves audiences in multiple languages
and countries so each audience finds the version written for them. It
covers choosing the URL structure, localizing content beyond literal
translation, wiring up hreflang and geo-targeting, and measuring each
market separately. Good international SEO is a product decision as much
as a technical one: a market gets a version only when the site can serve
that market well, with real localized content and support.

## When to Use

- Expanding a site into a new language or country.
- Choosing between subdirectories, subdomains, and country-code
  domains for international versions.
- Localizing existing content for a new market (currency, units,
  dates, spelling, local rules, cultural references).
- Fixing international targeting problems: wrong version ranking,
  missing versions, or traffic going to the wrong locale.
- Planning the rollout order for several new markets.

## When Not to Use

- For hreflang implementation details alone — use `hreflang`
  instead; this skill decides the strategy hreflang implements.
- For canonical questions on international pages — use
  `canonical-management` instead.
- For a single-language site with international visitors but no
  localized content — there is no international version to optimize;
  use `on-page-seo` and `technical-seo` instead.
- For translating a single page as a one-off — that is a content
  task, not an international SEO project.

## Prerequisites

- A list of target markets, each defined by language and, where
  relevant, region (for example German for Germany, French for
  Canada).
- Evidence of demand in each market: search interest, existing
  traffic from that market, or business presence there.
- A decision on resourcing: who translates, localizes, and maintains
  each version, and how updates propagate.
- Access to the site's hosting, DNS, and URL routing, since the
  chosen structure may need new subdomains or domains.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's guidance on managing multi-regional and multilingual sites.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline quality and technical requirements for all versions.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for international URL sets.

## Required Workflow

1. Define the markets. For each market, record the language, the
   region (if it changes content), and the evidence for targeting it.
2. Choose the URL structure. Pick one approach per market (see
   Implementation Standards) and apply it consistently.
3. Plan the content scope. Decide which pages each market gets: a
   full translation, a subset of key pages, or a localized homepage
   plus core guides. Do not promise a full site per market without
   resourcing.
4. Localize, do not just translate. Adapt currency, units, dates,
   addresses, spelling, imagery, legal text, and examples for each
   market.
5. Implement the technical layer: hreflang clusters (`hreflang`),
   self-referencing canonicals per version, localized metadata, and
   language attributes on the HTML element.
6. Set up measurement per market. Create separate Search Console
   properties or segments per version, and track rankings, traffic,
   and conversions by market.
7. Add a language switcher and sensible defaults. Detect language
   from the Accept-Language header or let users choose; never
   force-redirect by IP without an override.
8. Launch one market at a time, verify it (see Validation Checklist),
   then proceed to the next.

## Implementation Standards

- URL structure options, in the usual order of preference for most
  sites: subdirectories (`example.com/de/`), then subdomains
  (`de.example.com`), then country-code domains (`example.de`).
  Subdirectories consolidate signals on one domain and are simplest
  to maintain; country domains send the strongest geo signal but
  cost the most to run and split authority.
- One structure per market, applied consistently. Do not mix
  subdirectories for one language and subdomains for another without
  a documented reason.
- Every localized page declares its language with the `lang`
  attribute on the `<html>` element, matching the page's hreflang
  language code.
- Metadata is localized, not copied: titles, descriptions, headings,
  alt text, and structured data in each version use that version's
  language.
- Currency, units, date formats, and number formats follow the
  market's conventions; prices in the wrong currency are a trust
  failure, not a cosmetic issue.
- Do not auto-redirect users based on IP geolocation without giving
  them a visible way to switch to another version; IP detection is
  often wrong and can trap users and crawlers in the wrong version.
- Search engines must be able to crawl every version without being
  redirected; never redirect Googlebot to a different locale.
- Each version's sitemap lists only that version's URLs, with
  hreflang entries pointing at the other versions.

## Best Practices

- Start with one or two markets and prove the process before
  expanding; each market multiplies maintenance work.
- Localize the pages that matter most first: homepage, core product
  or guide pages, pricing, and support entry points.
- Use local reviewers, not only translators; a native speaker
  catches errors a translation service misses.
- Keep a translation memory and glossary per language so terminology
  stays consistent across the site.
- Earn local links and mentions per market; a translated page with
  no local signals competes weakly against local sites.
- Review each market's content on a schedule; a version that stops
  being updated becomes a liability.

## Security Considerations

- Locale handling must use an allowlist of supported language and
  region codes; unvalidated locale input in URLs or cookies can
  enable open redirects or content injection.
- Country-code domains and additional subdomains expand the attack
  surface; keep DNS, certificates, and renewals under the same
  management as the main domain.
- Localized legal pages (privacy, terms) must be reviewed for each
  jurisdiction; copying the home market's legal text into another
  language can misstate the site's obligations.
- Do not collect or store user location data for geo-targeting
  without a lawful basis and a privacy notice.

## Performance Considerations

- Serve each version from infrastructure close to its audience, or
  use a CDN, so localized pages are fast where they are read.
- Avoid redirect chains between locale versions; link directly to
  the correct version.
- Keep font and asset payloads reasonable per language; some scripts
  need larger font files, so subset fonts per language where the
  tooling supports it.
- Each additional version multiplies crawl load; keep sitemaps and
  internal linking clean so crawlers cover all versions efficiently.

## Common Mistakes

- Machine-translating the whole site and shipping it — unreviewed
  machine translation produces errors that damage trust and can be
  treated as low-quality content. Localize properly or ship fewer
  pages.
- Mixing structures without a reason — subdirectories for one market
  and a country domain for another confuses maintenance and
  measurement. Pick one approach per market deliberately.
- Forgetting hreflang on new versions — a new language version with
  no hreflang competes with the original instead of complementing it.
- IP-based forced redirects — they trap users and crawlers in the
  wrong version and hide other versions from search engines.
- Copying metadata across languages — English titles on German pages
  signal that the version is not genuinely localized.
- Launching markets with no maintenance plan — untranslated new
  content and stale prices erode the version's value within months.

## Examples

A subdirectory structure for English, German, and French versions:

```text
https://example.com/            (global English, x-default)
https://example.com/de/         (German)
https://example.com/fr/         (French)
https://example.com/de/guide/   (German version of /guide/)
```

The language attribute on a German page:

```html
<html lang="de">
```

A market scope decision recorded as a simple table in the project
notes:

```md
| Market | Language | Region | Scope at launch |
| ------ | -------- | ------ | --------------- |
| Germany | de | DE | Homepage, 10 core guides, pricing |
| France | fr | FR | Homepage, 5 core guides |
```

## Validation Checklist

- [ ] Each market has a defined language, region, scope, and owner.
- [ ] URL structure is consistent within each market and documented.
- [ ] Every localized page has the correct `lang` attribute and
      localized titles, descriptions, and headings.
- [ ] Hreflang clusters are complete and bidirectional, with
      x-default set (see `hreflang`).
- [ ] Each version canonicalizes to itself.
- [ ] Users can switch languages manually, and crawlers are never
      force-redirected between versions.
- [ ] Currency, units, and date formats match each market.
- [ ] Search Console properties or segments exist per market, and
      each version is being crawled and indexed.

## Expected Deliverables

- The market plan: markets, URL structure, content scope, and
  rollout order.
- Localized pages for the launch markets, with hreflang, canonicals,
  and localized metadata in place.
- Per-market sitemaps and Search Console setup.
- A maintenance plan: who updates each version and how new content
  flows into translations.

## References

- [Google Search Central](https://developers.google.com/search) — multi-regional and multilingual site guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline for all versions.
- [Sitemaps.org](https://www.sitemaps.org/) — sitemap format for international URL sets.
- Related skills in this repository: `hreflang`, `canonical-management`, `sitemap-robots`, `search-console`, `on-page-seo`.
