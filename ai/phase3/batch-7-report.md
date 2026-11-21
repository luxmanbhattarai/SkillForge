# Phase 3 Batch 7 Report — seo

- **Batch:** 7 (seo: 27 skills)
- **Auditor:** Phase 3 batch 7 technical-accuracy audit
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted, per plan)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/seo` → PASS (27 skills). No validation errors introduced.
- **Registry:** not regenerated (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 27 |
| Verified with limitations | 0 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

All 27 skills were checked against authoritative sources and are correct
after the fixes below. Every skill already carried
`metadata.last_verified: "2026-11-20"`, which is the date this audit
actually verified them, so no frontmatter date changes were needed.
All files remain under 500 lines (largest is now `schema-jsonld` at
294 lines). Two frontmatter descriptions were changed because they
stated something wrong (see `schema-jsonld` and `seo-migration`); all
other frontmatter is untouched.

## Headline corrections (verified against official sources)

1. **FAQ and HowTo rich results are gone.** FAQ rich results stopped
   appearing in Google Search on 7 May 2026 and their documentation was
   removed in June 2026; HowTo rich results were deprecated in
   September 2023. `schema-jsonld`, `structured-data`, and
   `aeo-optimization` all presented FAQ/HowTo markup as a live rich
   result path. Fixed everywhere: the types remain valid schema.org
   vocabulary but earn no Google feature.
2. **Search Console's International Targeting report no longer exists.**
   `hreflang` told users to check it and to confirm "no hreflang errors"
   in Search Console. It was deprecated in November 2022. Fixed to use
   URL Inspection plus crawler/dedicated-tool validation; noted in
   `international-seo` and `search-console` too.
3. **llms.txt is now v2.** The skill said "do not place it in a
   subdirectory" (v2 allows `/docs/llms.txt` etc.), garbled the
   `Optional` section (it IS part of the format), and treated
   `llms-full.txt` as current (v1-era, not in the v2 spec). All fixed,
   plus the v2 additions (per-page `.md` versions,
   `rel="alternate"` / `rel="describedby"`) and Google's June 2026
   clarification that llms.txt is not needed for Google Search.
4. **Google's May 2026 generative-AI guide mythbusts AEO/GEO.**
   Google's official guide (linked now in `aeo-optimization`,
   `geo-optimization`, `llm-seo`, `llms-txt`) says foundational SEO and
   non-commodity content are what it documents for AI Overviews/AI Mode,
   and that special markup, chunking, and rewriting just for AI are not
   needed. The skills already avoided promising citations; they now cite
   the authoritative source for that framing.
5. **A ranking/traffic promise in a description.** `seo-migration`'s
   description promised migrations "without losing rankings or traffic".
   Reworded to "aiming to preserve as much search visibility as
   possible".
6. **Heuristics presented as rules.** Reframed as industry heuristics
   with their basis stated: title ~60 chars and meta description
   150-160 chars (Google truncates by pixels; no character limits),
   exactly-one-H1 (Google does not require or enforce it), three-click
   depth, 40-60 word direct answers, alt-text ~125 chars (a
   screen-reader convention, not a Google rule), and "single most
   important factor" for search intent.
7. **Other retired features recorded.** Sitelinks search box (removed
   November 2024 — `WebSite` `name` markup is still used for site
   names), and the course info, estimated salary, learning video,
   special announcement, and vehicle listing features (removed
   September 2025). Breadcrumb rich results are desktop-only since
   January 2025.

## Per-skill table

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| seo/aeo-optimization | Verified | Featured-snippet/AI Overview guidance, FAQPage/HowTo schema advice, 40-60 word answer rule, Google's AI guidance | 40-60 word answers reframed as an industry heuristic (workflow, standards, checklist); added FAQ (removed May 2026) and HowTo (deprecated Sep 2023) retirement notes; linked Google's May 2026 generative-AI optimization guide with its mythbusting; FAQPage example now notes no Google rich result | Google Search Central blog "Changes to HowTo and FAQ rich results" (Aug 2023), Google documentation updates changelog (May/Jun 2026 FAQ entries), Google's guide to optimizing for generative AI features (May 2026) |
| seo/canonical-management | Verified | Canonical rules, signal precedence claim, rel=prev/next, pagination, cross-domain canonicals | Fixed the "canonical tags take precedence in practice" claim: replaced with Google's documented signal-strength order (redirects strongest, then rel="canonical", then sitemap weak; signals stack). Added the canonicalization doc deep link, a re-evaluation-time note, and a guidance-as-of line | Google "How to specify a canonical with rel=\"canonical\" and other methods", Google documentation updates changelog (Jul 2026 canonicalization update) |
| seo/competitor-analysis | Verified | Estimates labeling, SERP-competitor method, public-data rules, no outcome promises | None — no errors found. Added a guidance-as-of line restating that competitor figures are third-party estimates | Google Search Central, Google Search Essentials |
| seo/content-gap-analysis | Verified | Gap method, estimates labeling, SERP validation requirement, no-copying rule | None — no errors found. Added a guidance-as-of line restating the estimates rule | Google Search Central, "Creating helpful content", SEO Starter Guide |
| seo/eeat | Verified | E-E-A-T framing (not a ranking factor/score), YMYL guidance, author/credential rules, Person schema example | None — no errors found; the "not a score" framing was already correct. Added the "Creating helpful content" deep link and a guidance-as-of line | Google Search Central, "Creating helpful content", Google Search Essentials |
| seo/geo-optimization | Verified | GEO claims, established-vs-experimental framing, 40-60 word rule, llms.txt framing | 40-60 word answers reframed as an industry heuristic; "AI engines favor current information" labeled as an industry observation; linked Google's May 2026 generative-AI guide (the authoritative source: foundational SEO + non-commodity content; GEO "hacks" mythbusted); added a guidance-as-of line | Google's guide to optimizing for generative AI features (May 2026), Google Search Central, llmstxt.org |
| seo/hreflang | Verified | Return-tag rule, code formats (ISO 639-1/3166-1), x-default, canonical interplay, Search Console monitoring | **Fixed a dead feature:** workflow step 8 told users to check Search Console's International Targeting report and the checklist expected "no hreflang errors" in Search Console — the report was deprecated in Nov 2022. Replaced with URL Inspection + crawler/dedicated-tool validation. Added the localized-versions deep link and the Search Console Help deprecation page; noted x-default is a Google recommendation (kept as house standard); noted Google detects page language from visible content, not hreflang/`lang` | Google "Localized versions of your pages", Search Console Help "The International Targeting report is deprecated", Google Search Essentials |
| seo/image-seo | Verified | Alt text rules, formats, responsive images, lazy loading, sitemap image entries, Search Console image reporting | Reframed the 125-character alt-text limit as a screen-reader convention, not a Google rule; fixed "Search Console's image reports" (no such report — image performance is a filter on the Performance report); added that Google does not index CSS background images and the supported-format list (BMP, GIF, JPEG, PNG, WebP, SVG, AVIF); added the image SEO deep link and a guidance-as-of line | Google "Image SEO best practices", Google Search Essentials, sitemaps.org |
| seo/internal-linking | Verified | Click-depth rule, orphan/hub guidance, nofollow-on-internal-links rule, anchor-text guidance | "Within three clicks" reframed as an industry rule of thumb (Google publishes no click-depth limit) in the workflow, standards, and docs note; the nofollow rule was already correct | Google Search Central, SEO Starter Guide |
| seo/international-seo | Verified | URL-structure preference order, lang attribute, IP redirects, hreflang/canonical interplay, per-market measurement | Added that Google states no URL structure is inherently better for ranking (the order reflects maintenance cost, not a ranking preference); noted Google detects language from visible content, not the `lang` attribute; added the deprecated International Targeting report / country-targeting note with the multi-regional-sites and localized-versions deep links and a guidance-as-of line | Google "Managing multi-regional and multilingual sites", Google "Localized versions of your pages", Search Console Help deprecation page |
| seo/keyword-clustering | Verified | Intent-first clustering, SERP-overlap test, one-cluster-one-page rule, cluster-size judgment | None — no errors found; judgment calls were already labeled as such. Added a guidance-as-of line noting SERP-overlap clustering is an industry method | Google Search Central, SEO Starter Guide |
| seo/keyword-research | Verified | Estimates labeling, intent labels, one-page-per-query rule, prioritization factors | None — no errors found; estimates were already labeled with sources. Added a guidance-as-of line restating the estimates rule | Google Search Central, SEO Starter Guide, Google Search Console |
| seo/llm-seo | Verified | AI-crawler robots.txt guidance (GPTBot/ClaudeBot/PerplexityBot), Google-Extended, citation claims, structured-data role | Added Google's AI optimization guide; added a Google-Extended note (robots.txt product token, not a crawler; controls Gemini training + grounding; does not affect Search inclusion/ranking; blocking it also opts out of Gemini grounding; AI Overviews/AI Mode are governed by Googlebot rules and the Search generative AI control in Search Console); labeled "AI tools prefer primary sources" and freshness claims as industry observations; added a guidance-as-of line | Google's guide to optimizing for generative AI features (May 2026), Google crawler documentation on Google-Extended (via Search Engine Journal and Google docs quotes), llmstxt.org |
| seo/llms-txt | Verified | File format, placement, Optional section, llms-full.txt, Google relationship | **Substantial v2 update:** fixed "do not place it in a subdirectory" (v2 allows subpaths, covering pages under that path); fixed the garbled Optional-section line (it IS part of the format, by convention for secondary links); llms-full.txt reframed as a v1-era convention not in the v2 spec; added per-page `.md` versions and `rel="alternate"` / `rel="describedby"` discovery; added Google's June 2026 statement that llms.txt is not needed for Google Search and does not affect visibility/rankings; linked Google's AI optimization guide | llmstxt.org (v2 proposal, read 2026-11-20), Google documentation updates changelog (Jun 2026 llms.txt clarification), Google's guide to optimizing for generative AI features |
| seo/local-seo | Verified | Google Business Profile rules (real name, categories, service-area businesses), NAP consistency, LocalBusiness schema example, review rules | None — no errors found; GBP and schema guidance checked out. Added a guidance-as-of line | Google Business Profile Help, Google Search Central, schema.org LocalBusiness |
| seo/off-page-seo | Verified | Link-scheme prohibitions, rel="sponsored"/rel="ugc" rules, disavow guidance, manual-action process | None — no errors found; rel attribute guidance matches Google's docs. Added a guidance-as-of line restating that third-party authority scores are private-index estimates | Google Search Essentials (spam policies), Google Search Console (Links report) |
| seo/on-page-seo | Verified | Title/description length rules, one-H1 rule, heading order, keyword-density stance, image/URL rules | Title "under roughly 60 characters" and meta description "150-160 characters" reframed as display heuristics (Google truncates by pixel width; no character limits; descriptions are often rewritten) in workflow, standards, and checklist; "exactly one H1" reframed as a house convention (Google does not require a single H1 or penalize multiple H1s); added a guidance-as-of line stating these are heuristics, not Google requirements | Google Search Central, SEO Starter Guide, Google Search Essentials |
| seo/programmatic-seo | Verified | Quality bar vs scaled-content spam, pruning, data accuracy, template rules | None — no errors found; the quality bar was already sound. Added the spam-policy name and date ("scaled content abuse", strengthened March 2024) and a guidance-as-of line | Google Search Essentials (spam policies), Google Search Central |
| seo/schema-jsonld | Verified | JSON-LD syntax in all three examples, required properties, FAQPage/HowTo guidance, validation tools, WebSite usage | **Description changed** (it implied FAQ markup earns rich results). Added a Purpose note on the FAQ (May 2026) and HowTo (Sep 2023) retirements; removed FAQ/how-to from When to Use; added a retired-features list to Prerequisites (also sitelinks search box Nov 2024; course info, estimated salary, learning video, special announcement, vehicle listing Sep 2025); added breadcrumb desktop-only note (Jan 2025) and a WebSite/SearchAction note (keep `name` for site names, SearchAction earns no Google feature); added the HowTo/FAQ blog, sitelinks blog, and changelog links | Google Search Central blog "Changes to HowTo and FAQ rich results", "Farewell, Sitelinks Search Box" (Oct 2024), Google documentation updates changelog (May/Jun 2026 FAQ entries, Sep 2025 removals, Jan 2025 breadcrumbs), schema.org, Rich Results Test |
| seo/search-console | Verified | Property verification, coverage reasons, 16-month retention, request-indexing guidance, Core Web Vitals report, manual actions | None — no errors found; retention, coverage labels, and verification guidance checked out. Added the Generative AI performance report and AI Mode counting toward Performance totals (Jun 2025) to the docs note and Best Practices, plus the International Targeting deprecation note | Google Search Console Help, Google documentation updates changelog (Jun 2025 AI Mode, May 2026 generative AI guide), Google's guide to optimizing for generative AI features |
| seo/search-intent | Verified | Intent taxonomy, SERP-as-ground-truth rule, content-type mapping, mixed-intent handling | Softened "matching it is the single most important factor in whether a page can rank" / "will not rank no matter how well optimized" to "one of the most important factors" / "rarely ranks well" — the original overstated an industry heuristic as a verified ranking fact. Added a guidance-as-of line noting the intent taxonomy is an industry classification, not Google-published categories | Google Search Central, "Creating helpful content", SEO Starter Guide |
| seo/seo-audit | Verified | Severity definitions, evidence requirements, sampling honesty, no-invented-numbers rule, example findings | None — no errors found. One example-table wording tweak: "Meta descriptions over 160 chars" now reads "over ~160 chars (display heuristic)". Added a guidance-as-of line | Google Search Central, Google Search Essentials, Google Search Console, schema.org |
| seo/seo-migration | Verified | Redirect map rules (301, one hop, closest equivalent), 410 handling, Change of Address tool, redirect retention, staging robots.txt | **Description changed:** it promised migrations "without losing rankings or traffic" — reworded to "aiming to preserve as much search visibility as possible". Added the June 2026 Change of Address update (file for all subdomain variants, including www and non-www) to the workflow and docs note, plus a guidance-as-of line | Google Search Central (site moves), Google documentation updates changelog (Jun 2026 site-move entry), sitemaps.org |
| seo/serp-analysis | Verified | SERP capture method, feature inventory, winnability judgment, no-promises rule | None — no errors found; difficulty-from-evidence (not tool scores) was already correct. Added a guidance-as-of line | Google Search Central, SEO Starter Guide, Google Search Essentials |
| seo/sitemap-robots | Verified | Sitemap limits (50,000 URLs / 50 MB), lastmod/changefreq/priority treatment, robots.txt rules, sitemap index format | Fixed "Google ignores them for ranking" to "Google ignores `<priority>` and `<changefreq>` entirely"; added that Google uses `<lastmod>` only when consistently and verifiably accurate; added UTF-8 encoding and Google's 500 KiB robots.txt size limit; added the build-a-sitemap and robots.txt-spec deep links and a guidance-as-of line | sitemaps.org, Google "Build and submit a sitemap", Google "How Google interprets the robots.txt specification", RFC 9309 |
| seo/structured-data | Verified | Strategy/governance guidance, schema-map example, site-wide entity rules, validation-at-scale advice | Added the retired-features list to Prerequisites and Best Practices (FAQ May 2026, HowTo Sep 2023, sitelinks search box Nov 2024, Sep 2025 batch) plus the breadcrumb desktop-only note; the schema-map FAQPage row now carries a note that it earns no Google rich result; added the HowTo/FAQ blog and changelog links | Google Search Central blog "Changes to HowTo and FAQ rich results", Google documentation updates changelog, schema.org, Rich Results Test |
| seo/technical-seo | Verified | HTTPS/redirect/canonical rules, rendering checks, mobile-first, sitemap limits, Core Web Vitals | Added the actual Core Web Vitals "good" thresholds to Implementation Standards (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, 75th percentile over 28 days of CrUX field data) and the note that INP replaced FID in March 2024 — lab scores and FID targets must not be used as the pass bar. Added a guidance-as-of line | web.dev Web Vitals, Google Search Essentials, sitemaps.org, RFC 9309 |

## Files changed

All 27 `skills/seo/*/SKILL.md` files (381 insertions, 76 deletions).
No other files touched. No commits, pushes, merges, or branch changes.
`npm run registry` not run (coordinator regenerates centrally).

## Verification notes

- Every `last_verified` was already `2026-11-20`, the date this audit
  verified the skills, so no frontmatter date changes were needed.
- All new links were taken verbatim from tool results or from files
  already in the repository (tracking query parameters on search-result
  URLs were dropped to the clean canonical path).
- No skill was left Unverified or Blocked: every claim checked had an
  authoritative source available (Google Search Central docs/blog/
  changelog, Search Console Help, schema.org, sitemaps.org, RFC 9309,
  web.dev, llmstxt.org).
- The one judgment call: FAQPage/HowTo examples were kept (with
  retirement notes) rather than deleted, because both types remain
  valid schema.org vocabulary that non-Google consumers may use, and
  Google's own 2023 guidance says there is no need to proactively
  remove unused structured data.

## Cross-batch flag (for the coordinator)

The FAQ/HowTo retirement also affects skills outside this batch that
recommend FAQ or HowTo schema — most likely `skills/content/faq-generation`
and `skills/content/seo-content-writing` (both show as modified in the
working tree, presumably by their own batch). Worth confirming those
batches caught the May 2026 FAQ removal; this batch did not touch them.
