# Phase 3 Batch 8 Report — Performance + Metadata + Documentation Technical-Accuracy Audit

- **Batch:** Phase 3 batch 8 (performance + metadata + documentation)
- **Directories:** `skills/performance/` (8 skills), `skills/metadata/` (6 skills),
  `skills/documentation/` (5 skills) — 19 total
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted, per
  instructions; no push, merge, PR, commit, or branch switch performed)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/performance`,
  `--filter skills/metadata`, and `--filter skills/documentation` → **PASS**
  (8 + 6 + 5 skills checked, all original, all valid).
  All files remain under 500 lines (longest: `api-documentation`, 260 lines).
  `npm run registry` was not run (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 18 |
| Verified with limitations | 1 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

Every skill was checked against authoritative sources (official product docs,
official API references, official GitHub repos, official migration guides,
recognized standards) and is correct as of 2026-11-20 after the fixes below.
All 19 skills already carried `metadata.last_verified: "2026-11-20"`, which is
the date this verification was actually performed, so no date changes were
needed. No skill was restructured, renamed, deleted, or rescoped; the
15-section structure is unchanged throughout. One frontmatter `description`
was corrected (`twitter-cards` — it referenced the retired X card validator;
see below). Version ranges, version-specific differences, and deprecated
approaches to avoid were added in the Prerequisites and/or Official
Documentation sections of the body, not as frontmatter fields.

## Per-skill results

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| core-web-vitals | Verified | CWV thresholds (LCP/INP/CLS, p75); FID retirement date; `web-vitals` library API (`onLCP`/`onINP`/`onCLS`) and current version; CrUX 28-day window; Node LTS status | Thresholds confirmed correct. Replaced bare `web.dev/` links with the verified [Web Vitals article](https://web.dev/articles/vitals) and the PSI About page for CrUX. Added: web-vitals 6.x is current, `onFID()` was removed in v5 (May 2025), FID stopped being a Core Web Vital on 12 March 2024 (new Implementation Standards bullet — do not measure or report FID). Added Node 24 LTS (through April 2028) / Node 26 LTS (since October 2026) note | web.dev/articles/vitals (official, read in full), developers.google.com/speed/docs/insights/v5/about, GoogleChrome/web-vitals release notes via npm.io, nodejs.org releases |
| lighthouse | Verified | CLI flags (`--preset`, `--only-categories`, `--output`, `--output-path`, `--view`); categories; Node requirement; multi-output behavior | **CLI bug fixed:** the example passed `--output-path` twice (once per format). `--output-path` is a single string; with multiple outputs it is a base path and Lighthouse appends `.report.json` / `.report.html`. Example rewritten to `--output=json --output=html --output-path=./lighthouse-report` with the resulting filenames explained. Added: Lighthouse requires Node 22 LTS or later; current versions run four categories (performance, accessibility, best-practices, seo) — the PWA category and `--budget-path` LightWallet workflow were removed, do not use them | GoogleChrome/lighthouse README `--help` output (official, read in full) |
| bundle-optimization | Verified | esbuild `--metafile` / `--analyze=verbose < meta.json` usage; tree-shaking conditions; `lodash-es` import; dynamic import syntax | esbuild commands confirmed correct. Added esbuild [Analyze](https://esbuild.github.io/analyze/) link and current-line note (0.28.x as of mid-2026), plus the Node 24/26 LTS note | esbuild.github.io/api, Debian esbuild manpage (upstream `--help`), esbuild.github.io/analyze |
| caching-strategy | Verified | Cache-Control header recipes (`max-age=31536000, immutable`, `no-cache` vs `no-store`, `stale-while-revalidate`, `Vary`); Express `express.static` options (`maxAge: '1y'`, `immutable: true`); `curl -I` | Headers and Express example confirmed correct. Added: RFC grounding (RFC 9111 obsoletes RFC 7234 — do not cite it; `immutable` is RFC 8246; `stale-while-revalidate`/`stale-if-error` are RFC 5861); `stale-if-error` bullet (do not combine with `must-revalidate`); Express 5 is the current major (Node 18+) and `immutable` only takes effect when `maxAge` > 0 | MDN HTTP Caching / Cache-Control (linked in skill), RFC 9111 / 8246 / 5861 (via MDN + standards summaries), expressjs serve-static docs via flaviocopes/irurueta (checked against official docs) |
| image-optimization | Verified | AVIF/WebP guidance; `fetchpriority`, `loading="lazy"`, `decoding="async"`; `srcset`/`sizes`; Sharp `.resize()` / `.avif({ quality })` / `.toFile()`; MDN Multimedia link | Sharp example and format guidance confirmed correct; MDN link verified live. Added browser-support notes (AVIF Chrome 85+/Firefox 93+/Safari 16+; WebP Safari 14+; `fetchpriority` Chrome 101+/Firefox 132/Safari 17.2; `loading="lazy"` Safari 15.4+; unsupported browsers ignore the attributes safely) and Sharp 0.35.x requires Node 20.9+. Added `<picture>` format-fallback bullet (AVIF source first, then WebP, JPEG/PNG `<img>` fallback) | MDN Learn Multimedia page (official, read in full), MDN browser-compat data via webperf-snippets, sharp.pixelplumbing.com docs |
| javascript-optimization | Verified | `defer`/`async` semantics; long-task 50 ms threshold; Scheduler API (`scheduler.postTask`, `scheduler.yield()`); `setTimeout` yield example | **Yield API corrected:** the skill presented `scheduler.postTask` as the yielding mechanism. `scheduler.yield()` is the dedicated yield API (Chrome 129+, Firefox 142, not Safari); `postTask` is for prioritized scheduling. Workflow step and example rewritten to feature-detect `scheduler.yield()` with a `setTimeout` fallback. Added Chrome `scheduler.yield()` guide link and a Common Mistake against relying on `requestIdleCallback` as the only yield | MDN Scheduler API page (official, read in full), developer.chrome.com/blog/use-scheduler-yield, developer.chrome.com long-tasks guide, MDN compat data |
| pagespeed-insights | Verified | PSI API v5 endpoint and `strategy` param; response structure (`loadingExperience.metrics.percentile`, `lighthouseResult.categories.performance.score`); 28-day CrUX window; URL vs origin data; mobile/desktop | API endpoint and response parsing confirmed correct. Added: API is v5; Lighthouse score bands (90+ good, 50–89 needs improvement, below 50 poor) per PSI docs; web.dev link pointed at the verified Web Vitals article | developers.google.com/speed/docs/insights/v5/about (official, read in full), web.dev/articles/vitals |
| web-performance-audit | Verified | Field/lab separation; median-of-three-runs guidance; CrUX lag; cross-references to sibling skills | No errors found. Added Node 24/26 LTS note and pointed the web.dev References link at the verified Web Vitals article | web.dev/articles/vitals, developers.google.com/speed/docs/insights/v5/about, nodejs.org releases |
| open-graph | Verified | ogp.me required vs optional properties; `og:image:width`/`height`/`alt`; `article:published_time` format; 1200x630 / 600x315 guidance; debugger links | **Required-vs-recommended fixed:** the skill listed all five tags as required; per ogp.me the four required properties are `og:title`, `og:type`, `og:image`, `og:url` — `og:description` is optional but recommended. Wording corrected. Added `og:image:alt` (spec recommends it when `og:image` is present) and `og:site_name`, with both added to the article example; `article:published_time` example upgraded from date-only to full ISO 8601 datetime (`2026-11-20T09:00:00Z`). Noted both debuggers require a platform login. LinkedIn Post Inspector could not be fetched directly (LinkedIn blocks scrapers) but was confirmed live at the same URL by multiple sources dated Oct–Nov 2026 | ogp.me (official spec, read in full), developers.facebook.com/tools/debug (verified live), LinkedIn Post Inspector corroborated by expandi.io / mashshare.net / postbase.so (Oct–Nov 2026 checks) |
| twitter-cards | Verified with limitations | Card types; image sizes; `twitter:site`/`twitter:creator` handle form; OG fallback; X Card Validator existence; X card rendering; cache behavior | **Major corrections — the skill's testing workflow was outdated:** (1) X removed the Card Validator preview on 2 August 2022; the URL now redirects to a login screen and X has shipped no replacement — workflow steps, checklist, and deliverables rewritten to test via the X post composer (paste the link without publishing) plus `curl -A Twitterbot`, and the frontmatter description was corrected to drop the validator reference. (2) "Re-validate to refresh the cache" is impossible — X caches card data for up to ~7 days with no manual refresh; the fix is a new query parameter (e.g. `?v=2`). (3) Image sizes corrected: recommended 1200x628 (1.91:1), minimum 300x157, max 4096x4096, under 5 MB; summary minimum 144x144 — the skill's 600x315 minimum is Facebook's, not X's. (4) Added: since late 2023 X's large-image cards show the image with the domain overlaid and no longer display title/description text in most clients. (5) Added: do not use the `app` card type (renders as a plain summary card since early 2022). **Limitation:** X removed the Cards pages from its live developer docs, so tag behavior was verified against X's published Cards markup reference (archived May 2025) corroborated by multiple current sources, not against live official docs | X developer forum announcement (2 Aug 2022, via mashshare.net / toolsriver.com / chottulink.com), X Cards markup reference (archived May 2025, via ayetab.com), developer.x.com (Cards docs confirmed absent from live index, Sep 2026 check via xautopilot.app), keywordseverywhere/devtools.tools validators (image specs), TechCrunch (Oct 2023 headline removal, via chottulink.com) |
| seo-metadata | Verified | Title/description guidance; canonical rules; `noindex` vs robots.txt interaction; robots directives; Google Search Central links | Core guidance confirmed correct against Google's docs. Added: `X-Robots-Tag` header for non-HTML resources; retired directives `noarchive`, `nocache`, `nositelinkssearchbox` are ignored by Google (do not use them); `index, follow` is the default, so an explicit robots tag is only needed to restrict something | developers.google.com/search/docs/crawling-indexing/robots-meta-tag (official, read in full), title-link and canonicalization docs (linked in skill) |
| dynamic-metadata | Verified | `generateMetadata` pattern; Next.js 16 / Astro 7 currency; fallback chain; escaping; absolute-URL rules | Framework versions confirmed current (Next.js 16.4.6, Astro 7.4.x as of November 2026). Added version-specific difference: `generateMetadata` is App Router only (Next.js 13.2+); the Pages Router uses `next/head`. Added current patch versions and Astro's plain-tags-in-layout pattern | nextjs.org/docs/app/api-reference/functions/generate-metadata (linked in skill), npm registry / GitHub releases via petercsipkay.com, temps.sh, oday-bakkour.com (Nov 2026) |
| metadata-validation | Verified | Check rules (exactly one title/description/canonical, absolute URLs, 200 status); regex extraction example; `curl` image check; debugger links | Checks and examples confirmed correct. Added: Facebook/LinkedIn debuggers require a platform login; for X, use the post composer — X has no working card validator (see `twitter-cards`) | ogp.me, developers.google.com/search/docs/appearance/title-link, developers.facebook.com/tools/debug, LinkedIn Post Inspector (corroborated as in open-graph) |
| social-sharing | Verified | Share-intent URLs (X, Facebook, LinkedIn, email); Web Share API usage; UTM guidance; clipboard API | Facebook/LinkedIn/mailto intents confirmed correct. **Fixed:** X intent URL updated from `twitter.com/intent/tweet` to the current canonical `x.com/intent/post` (old URL still redirects). **Gap filled:** the description promised WhatsApp but no WhatsApp example existed — added the official `wa.me/?text=` share link (pre-filled message, no number, reader picks the recipient). Added Web Share API constraints: HTTPS-only secure context, requires a user gesture, `navigator.canShare()` to check data first | developer.mozilla.org/en-US/docs/Web/API/Web_Share_API (official, read in full), faq.whatsapp.com click-to-chat (official), X web-intent docs via navid.me / twigor.com (Sep–Nov 2026) |
| api-documentation | Verified | OpenAPI/Swagger/GraphQL/MDN links; endpoint-reference structure; error-model guidance | Links verified live (GraphQL best-practices page read in full). Added: OpenAPI 3.2.1 is current (3.2.0, September 2025); 3.1.x/3.0.x remain in use; do not write new specs in Swagger 2.0 (legacy); check tooling supports 3.2 before adopting it. Added Implementation Standards bullet: in OpenAPI 3.1+, use JSON Schema `type: ["string", "null"]` instead of the 3.0-era `nullable: true` | spec.openapis.org/oas (official version list: v3.2.1, v3.1.2, v3.0.4, v2.0), en.wikipedia.org/wiki/OpenAPI_Specification, graphql.org/learn/best-practices (verified live) |
| changelog-management | Verified | Keep a Changelog groups (Added/Changed/Deprecated/Removed/Fixed/Security); semver rules; Unreleased-section workflow; ISO dates | No errors found; format and rules match the specs. Added current spec versions: Keep a Changelog 1.1.0, Semantic Versioning 2.0.0, Conventional Commits 1.0.0 | keepachangelog.com (verified live), semver.org, conventionalcommits.org |
| developer-experience | Verified | Diátaxis framing; error-message guidance; time-to-first-success metric; all three documentation links | No errors found and no changes needed. This is a process skill with no version-specific technical claims; all three linked docs (Diátaxis, Write the Docs, Google style guide) were verified live and the Diátaxis four-quadrant framing matches the official site | diataxis.fr (verified live), writethedocs.org (verified live), developers.google.com/style (verified live) |
| readme-engineering | Verified | README structure guidance; GitHub rendering behavior; license guidance; Choose a License link | Guidance confirmed correct against GitHub's docs. Added verified GitHub facts: a README is recognized from `.github/`, the repository root, or `docs/` (in that order when more than one exists — keep the canonical README at the root); GitHub truncates rendered README content beyond 500 KiB | docs.github.com About READMEs page (official, read in full), choosealicense.com |
| technical-documentation | Verified | Diátaxis four types (tutorials, how-to, explanation, reference); one-page-one-purpose rule; all three documentation links | No errors found and no changes needed. Process skill with no version-specific technical claims; the Diátaxis quadrant definitions match the official site and all links were verified live | diataxis.fr (verified live), writethedocs.org (verified live), developers.google.com/style (verified live) |

## Files changed

17 of 19 SKILL.md files edited (216 insertions, 69 deletions). Unchanged:
`developer-experience` and `technical-documentation` (verified, no errors
found — process skills with no version-specific claims to correct).

- `skills/performance/core-web-vitals/SKILL.md`
- `skills/performance/lighthouse/SKILL.md`
- `skills/performance/bundle-optimization/SKILL.md`
- `skills/performance/caching-strategy/SKILL.md`
- `skills/performance/image-optimization/SKILL.md`
- `skills/performance/javascript-optimization/SKILL.md`
- `skills/performance/pagespeed-insights/SKILL.md`
- `skills/performance/web-performance-audit/SKILL.md`
- `skills/metadata/open-graph/SKILL.md`
- `skills/metadata/twitter-cards/SKILL.md`
- `skills/metadata/seo-metadata/SKILL.md`
- `skills/metadata/dynamic-metadata/SKILL.md`
- `skills/metadata/metadata-validation/SKILL.md`
- `skills/metadata/social-sharing/SKILL.md`
- `skills/documentation/api-documentation/SKILL.md`
- `skills/documentation/changelog-management/SKILL.md`
- `skills/documentation/readme-engineering/SKILL.md`

No other directories were touched. Nothing was committed, pushed, merged, or
reset; no branch was switched. `npm run registry` was not run.

## Notable corrections

1. **twitter-cards — X Card Validator is gone.** The skill's entire testing
   workflow (steps 7–8, checklist, deliverables, frontmatter description)
   told agents to test with "the X card validator" and "re-validate to
   refresh X's cache". X removed the validator preview on 2 August 2022, the
   URL now redirects to a login screen, and there is no re-scrape mechanism —
   card data is cached for up to ~7 days. Rewritten around the post-composer
   test and the `?v=2` fresh-fetch workaround. Image sizes were also wrong
   (1200x630 / 600x315 minimum are Facebook's numbers; X wants 1200x628,
   minimum 300x157, under 5 MB), and the skill did not mention that X
   large-image cards no longer display title/description text (since late
   2023) or that `app` cards are dead.
2. **lighthouse — multi-output example was invalid.** `--output-path` is a
   single string; the example passed it twice. Fixed to the documented
   single-base-path form with the resulting filenames explained.
3. **javascript-optimization — wrong yield API.** The skill presented
   `scheduler.postTask` as the yielding mechanism; `scheduler.yield()` is
   the dedicated API (with a `setTimeout` fallback for Safari). Example
   rewritten with feature detection.
4. **open-graph — required vs recommended.** The skill listed five tags as
   required; per ogp.me only four are required (`og:description` is
   optional-but-recommended). Also added the spec-recommended `og:image:alt`.
5. **social-sharing — stale X intent URL and missing WhatsApp example.**
   Updated to `x.com/intent/post` and added the official `wa.me/?text=`
   share link the description already promised.
6. **core-web-vitals — FID.** Added the explicit do-not-use-FID guidance
   (retired 12 March 2024; `onFID()` removed from web-vitals v5).
7. **seo-metadata — retired robots directives.** Added `noarchive` /
   `nocache` / `nositelinkssearchbox` (ignored by Google) and the
   `X-Robots-Tag` header for non-HTML resources.

## Blockers / limitations

- **None blocking.** Every skill reached Verified or Verified with
  limitations.
- **twitter-cards (Verified with limitations):** X removed the Cards pages
  from its live developer docs, so the tag behavior could not be verified
  against live official docs; it was verified against X's published Cards
  markup reference (archived May 2025) corroborated by multiple independent
  sources checked September–November 2026. If X republishes Cards docs, this
  skill should be re-checked against them.
- **LinkedIn Post Inspector:** the tool page could not be fetched directly
  (LinkedIn blocks scrapers; one fetch attempt failed with no extractable
  content and was not retried). Its existence and URL were corroborated by
  three independent sources that checked it in October–November 2026, all
  agreeing it is live at `linkedin.com/post-inspector` and now requires a
  sign-in to run an inspection. The skills note the sign-in requirement.
- **Bare `web.dev/` links:** several skills linked the web.dev homepage as
  their "official documentation". Where a verified specific article existed
  (Web Vitals), the link was upgraded; the remaining generic web.dev links
  (lighthouse, bundle-optimization, javascript-optimization,
  image-optimization, caching-strategy, social-sharing) resolve correctly
  and were left as-is rather than guessing article URLs.
