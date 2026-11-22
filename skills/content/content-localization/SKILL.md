---
name: content-localization
description: >
  Adapt content for a new language, region, or culture: translate accurately,
  localize examples, units, dates, and references, and keep SEO signals
  correct across locales. Use when publishing existing content for a new
  market or language audience. Trigger keywords: localization, localize
  content, translate content, multilingual content, hreflang, international
  SEO, transcreation.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Content Localization

## Purpose

This skill adapts content for a new language or market so it reads as if it
were written for that audience — not translated word for word, but rebuilt
around their language, conventions, examples, and expectations. It covers
translation quality, cultural adaptation, and the technical signals
(hreflang, language tags) that tell search engines which version serves
which audience.

## When to Use

- Publishing an existing article, guide, or site in another language.
- Adapting content for a different region that shares a language (e.g. US vs. UK English).
- Localizing marketing pages, docs, or help content for a new market.
- Setting up multilingual SEO signals (hreflang, language tags) for localized pages.

## When Not to Use

- Writing new content from scratch in another language — use `article-writing` or `blog-writing` with a native writer instead.
- Translating a single word or phrase with no context — a dictionary or translation tool is faster.
- Repurposing content into a different format in the same language — use `content-repurposing` instead.
- Reviewing a localized draft for accuracy — use `editorial-review` and a native speaker.

## Prerequisites

- The source content, finalized and stable (localizing a draft that keeps changing wastes the work).
- The target language and region (e.g. Spanish for Mexico, not just "Spanish").
- A glossary of key terms and their approved translations, or the freedom to create one.
- The site's URL structure for locales (subdirectory, subdomain, or separate domain) and its hreflang setup.
- A native speaker of the target language available for review, ideally.

## Official Documentation

- [W3C Internationalization](https://www.w3.org/International/) — guidance on language tags, text direction, and locale-aware web content.
- [Managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/localized-versions) — Google's guidance on hreflang and localized versions.
- [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry) — the authoritative registry of language subtags used in BCP 47 language tags (`lang` attributes and hreflang values).
- Compatibility: hreflang language codes use ISO 639-1 (two-letter, e.g. `en`, `es`), and region codes use ISO 3166-1 Alpha 2 (e.g. `US`, `MX`) — Google supports only codes from those two standards, so three-letter ISO 639-2 codes (e.g. `eng`) are not valid hreflang values. Do not use region-only codes such as `es-419`; Google does not support them.

## Required Workflow

1. Confirm the target locale (language plus region) and the URL structure the localized version will use.
2. Freeze the source content: localization starts from a final version, and any later source change is tracked for re-localization.
3. Build or confirm the glossary: key terms, product names (translate or keep), and brand voice notes for the target language.
4. Translate the content, adapting — not just converting — the text: idioms, humor, examples, and cultural references must work for the target audience.
5. Localize the details: units (metric vs. imperial), date and number formats, currency, addresses, phone formats, and legal references.
6. Adapt examples and images: replace examples that do not make sense in the target market, and check that images and icons are culturally appropriate.
7. Localize metadata: title, meta description, headings, alt text, and URL slug, following the target language's search conventions.
8. Set the technical signals: `lang` attribute, hreflang tags linking each language version to the others (including a self-referencing tag), and a locale-appropriate sitemap entry.
9. Have a native speaker review the localized content for accuracy, naturalness, and cultural fit.
10. Run `editorial-review` on the localized version and record the source version it was localized from, so future source changes can be tracked.

## Implementation Standards

- Translation is done by a fluent speaker of the target language, human or machine-assisted with human review. Raw machine translation without review is not acceptable for published content.
- The localized version must read naturally in the target language; a reader should not be able to tell it was translated.
- Units, dates, numbers, and currency use the target locale's conventions throughout, including in examples and tables.
- Product names, trademarks, and brand terms follow the glossary: translated or kept as-is consistently.
- Every localized page has a correct `lang` attribute and hreflang tags pointing to every language version, including itself.
- Hreflang links must be bidirectional: if two pages do not both point to each other, Google ignores the tags. Each page's hreflang set is identical across all versions of the page.
- Google does not use hreflang or the HTML `lang` attribute to detect a page's language; it determines language algorithmically. The tags exist to point users to the right version, not to declare the language.
- URL slugs are localized (translated) when the site's structure allows it; they are never left as untranslated source-language slugs without a reason.
- Legal and regulatory content (privacy, terms, health, finance) is reviewed by someone qualified in the target jurisdiction, not just translated.
- The localized version records which source version it was translated from, so drift can be detected.

### Accessibility

- Translated content keeps its structure: headings, lists, and alt text
  are translated too, not left in the source language.
- The page declares its language (`lang`) and passages in another
  language are marked, so screen readers pronounce them correctly.
- Right-to-left layouts mirror navigation and reading order; do not
  hardcode left / right positioning.
- Translated alt text conveys the image meaning in the target language
  and culture, not a literal word-for-word rendering.
- Dates, numbers, and currencies follow the locale and are marked up
  as text, not images, so screen readers announce them correctly.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Localize the pages that matter most to the new market first, not the whole site at once.
- Keep the glossary updated: every new term decided during localization goes into it.
- Involve the native reviewer early, not at the end — they will catch structural problems (examples, tone) that are expensive to fix late.
- Test the localized page in a browser: text expansion (some languages run 20-30% longer) can break layouts.
- Track source changes: when the source page is updated, the localized versions need a corresponding update.

## Security Considerations

- Do not include credentials or private data in localized content or in translation files shared with external translators.
- Translation tools and services receive the content: do not send confidential or unpublished material to a translation service without checking its data handling.
- Legal content localized without qualified review can create liability; always have a qualified reviewer for regulated topics.

## Performance Considerations

- Localize in batches by cluster so internal links between localized pages are consistent from the start.
- Reuse translation memory and the glossary across pages to keep terminology consistent and costs down.
- A localized page that is a thin translation of a thin source page is still thin; prioritize localizing strong pages.

## Common Mistakes

- Translating word for word, producing text that is grammatically correct but unnatural.
- Leaving units, dates, and currency in the source locale's format.
- Forgetting hreflang, so search engines show the wrong language version to users.
- Localizing a draft, then re-localizing it when the source changes.
- Using machine translation without human review and publishing the result.

## Examples

Example hreflang setup for an English and Spanish version of a page:

```html
<link rel="alternate" hreflang="en" href="https://example.com/sourdough-starter-guide/" />
<link rel="alternate" hreflang="es" href="https://example.com/es/guia-de-masa-madre/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/sourdough-starter-guide/" />
```

Example localization note:

```text
Source: "Feed your starter 1 cup of flour" (US)
Localized (es-MX): "Alimenta tu masa madre con 120 g de harina"
Note: cups converted to grams (metric is standard in Mexico); "sourdough
starter" localized as "masa madre" per glossary.
```

## Validation Checklist

- [ ] The target locale is specified (language plus region).
- [ ] A native speaker has reviewed the localized content.
- [ ] Units, dates, numbers, and currency use the target locale's conventions.
- [ ] Examples, images, and cultural references fit the target market.
- [ ] Metadata, headings, alt text, and URL slug are localized.
- [ ] `lang` attribute and hreflang tags are correct, including self-referencing tags.
- [ ] The glossary is updated with new terms.
- [ ] The source version the localization was based on is recorded.
- [ ] `editorial-review` has passed on the localized version.
- [ ] Accessibility: lang declared; alt text and structure translated; RTL mirrored.

## Expected Deliverables

- The localized content, ready to publish, with localized metadata.
- An updated glossary of translated terms.
- A record of the source version and the technical signals applied (hreflang, lang).

## References

- [W3C Internationalization](https://www.w3.org/International/) — language tags and locale-aware content.
- [Managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/localized-versions) — hreflang and localized versions.
- [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry) — authoritative language subtag list (BCP 47); hreflang uses ISO 639-1 language codes and ISO 3166-1 Alpha 2 region codes.
- Related skills in this repository: `article-writing`, `editorial-review`, `content-refresh`.
