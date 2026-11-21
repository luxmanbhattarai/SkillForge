# Phase 3 Batch 9 Report — content + media

- **Batch:** 9 (content: 17 skills, media: 12 skills; 29 total)
- **Auditor:** Phase 3 batch 9 technical-accuracy audit
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted, per plan)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/content` → PASS (17 skills); `--filter skills/media` → PASS (12 skills). No validation errors introduced.
- **Registry:** not regenerated (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 27 |
| Verified with limitations | 2 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

All 29 skills were checked against authoritative sources and are correct
after the fixes below. Every skill already carried
`metadata.last_verified: "2026-11-20"`, which is the date this audit
actually verified them, so no frontmatter date changes were needed.
All files remain under 500 lines (largest is now `twitter-card-images`
at 268 lines). Two frontmatter descriptions were changed because they
stated something wrong or outdated (see `twitter-card-images` and
`youtube-thumbnails`); all other frontmatter is untouched.

Purely editorial skills (`article-writing`, `blog-writing`,
`content-brief`, `content-refresh`, `content-repurposing`,
`content-research`, `content-strategy`, `editorial-review`,
`fact-checking`, `human-editing`, `infographic-generation`) are
tool-version-independent, so no version-range note was added to them;
their cited Google guidance links were spot-checked live and are current.

## Headline corrections (verified against official sources)

1. **X card images are 2:1, not 16:9.** `twitter-card-images` specified
   1200x675 throughout and warned against reusing a 1200x630 OG image.
   X's last published card specification (Summary Card with Large
   Image) requires a 2:1 aspect ratio, minimum 300x157, maximum
   4096x4096, under 5 MB, JPG/PNG/WEBP/GIF (no SVG) — so a 1200x675
   image is the one that gets cropped, and a 1200x630 OG image loses
   only ~15 px top and bottom. Corrected to 1200x600 everywhere
   (description, workflow, standards, examples, Sharp code, checklist),
   added `twitter:image:alt` (max 420 chars) and the `summary` card
   spec (1:1, min 144x144). Limitation: X's developer site no longer
   publishes the Cards pages, and X domains could not be fetched
   directly in this environment, so the spec is from the last published
   official docs as quoted in archived copies.
2. **YouTube now recommends 3840x2160 thumbnails.** `youtube-thumbnails`
   presented 1280x720 as "the size YouTube documents". YouTube Help
   (checked 2026-11-20) now recommends 3840x2160 for videos and
   2160x3840 for Shorts (min 640 px), JPG or PNG, 2 MB mobile / 50 MB
   desktop limits, and a verified account. 1280x720 is still accepted
   but is no longer the recommendation. Updated throughout, including
   the description and the Sharp example.
3. **OG 1200x630 is Meta's recommendation, not the protocol's.**
   `og-image-generation` claimed 1200x630 is "the size the Open Graph
   protocol documents". ogp.me (checked 2026-11-20) specifies no
   dimensions at all; 1200x630 (1.91:1) is Meta's documented
   recommendation for Facebook link previews (min 200x200, large
   preview from 600x315, max 8 MB). Fixed the attribution, added the
   Meta/LinkedIn limits, and added `og:image:alt`, which ogp.me says a
   page with `og:image` should specify.
4. **FAQ and HowTo rich results are gone (cross-batch flag from batch 7,
   independently re-verified against Google's own docs).** Google's
   documentation updates log (opened directly) records "Deprecating the
   FAQ rich result feature" on May 8, 2026 ("will no longer appear in
   Google Search starting May 7, 2026") and "Removing documentation for
   the FAQ rich result feature" on June 15, 2026. The Search Central
   Blog post "Changes to HowTo and FAQ rich results" (Aug 8, 2023,
   updated Sept 13, 2023) records HowTo fully deprecated September 13,
   2023, and states there is no need to proactively remove unused
   markup. `faq-generation`, `seo-content-writing`, and
   `keyword-to-content` now state this; the schema.org types remain
   valid vocabulary but earn no Google feature.
5. **hreflang uses ISO 639-1, not ISO 639-2.** `content-localization`
   cited the ISO 639-2 list as "the standard language code list used in
   hreflang". Google's localized-versions doc states hreflang language
   codes are ISO 639-1 and region codes ISO 3166-1 Alpha 2, and only
   those are supported. Replaced the link with the IANA Language
   Subtag Registry and added the bidirectional-link requirement (Google
   ignores non-reciprocal hreflang tags).
6. **Node.js 26 is the current LTS line.** `technical-writing`'s example
   said "Node.js 24 (current LTS line)". Node 26 "Lithium" became Active
   LTS on October 28, 2026; Node 24 moved to Maintenance LTS on October
   20, 2026. Fixed, with a compatibility note (Node 22 EOL April 2027;
   from Node 27 the release model becomes annual with every major
   version going LTS).
7. **SEO example title violated its own rule.** `seo-content-writing`'s
   example title was 67 characters while the skill requires titles
   under 60. Shortened to 52 characters ("How to Feed a Sourdough
   Starter: Ratios & Schedule").

## Per-skill table

### skills/content (17)

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| article-writing | Verified | Google helpful-content and Search Essentials links (live), editorial standards, no versioned tool claims | None needed | developers.google.com/search/docs/fundamentals/creating-helpful-content (opened, live), plainlanguage.gov, developers.google.com/style |
| blog-writing | Verified | Same Google links; H1/meta guidance; typo scan | Typo: "a ending" → "an ending" | Same Google docs as above |
| content-brief | Verified | Links, brief structure, example dates/URLs | None needed | Google helpful-content and Search Essentials docs |
| content-localization | Verified | hreflang syntax, example tags, language-code standards, cup→gram conversion (1 cup flour = 120 g, King Arthur) | ISO 639-2 → ISO 639-1 + ISO 3166-1 Alpha 2 (IANA registry link); added bidirectional hreflang requirement and note that Google does not use hreflang/lang for language detection | developers.google.com/search/docs/specialty/international/localized-versions (opened, live); iana.org language-subtag-registry |
| content-refresh | Verified | Last-updated-date guidance vs Google guidance on false freshness; Search Console link | None needed | Google helpful-content doc (freshness-date warning confirmed) |
| content-repurposing | Verified | Copyright/CC links, channel-adaptation guidance | None needed | copyright.gov, creativecommons.org |
| content-research | Verified | Source-hierarchy guidance, Google Scholar/Poynter links | None needed | scholar.google.com, poynter.org |
| content-strategy | Verified | Cluster/calendar methodology, Google and NNg links | None needed | Google Search Essentials, helpful-content doc, nngroup.com |
| copywriting | Verified | FTC/WCAG references, disclosure and accessibility claims | Added WCAG 2.2 version + Level AA contrast ratios (4.5:1 normal, 3:1 large) | w3.org/WAI/standards-guidelines/wcag/; WCAG 2.2 Rec (Oct 2023) |
| editorial-review | Verified | 10-point checklist, title <60 / meta <160 conventions (skill's own standards, not platform rules) | None needed | Google helpful-content and Search Essentials docs |
| eeat-writing | Verified | E-E-A-T/YMYL claims against Google's helpful-content page | Added nuance: E-E-A-T itself is not a specific ranking factor; trust is the most important aspect | Google helpful-content doc, "Get to know E-E-A-T" section (opened, live) |
| fact-checking | Verified | Verification methodology, Poynter/Scholar links | None needed | poynter.org, scholar.google.com |
| faq-generation | Verified | FAQPage JSON-LD example (valid schema.org), Google FAQ rich-result status | Added FAQ rich-result removal (May 7, 2026; docs removed June 2026) to Official Documentation, workflow step 8, Implementation Standards, Performance; noted existing markup is harmless and need not be removed | Google Search documentation updates log (opened, live: May 8 and June 15, 2026 entries); schema.org/FAQPage; Search Central Blog Aug 8, 2023 |
| human-editing | Verified | Style guidance, plain-language and Google style links | None needed | plainlanguage.gov, developers.google.com/style |
| keyword-to-content | Verified | Intent classification, title/meta limits, schema example | Added HowTo/FAQ rich-result removal note (HowTo deprecated Sept 13, 2023; FAQ removed May 7, 2026; no need to proactively remove markup); annotated the "Schema: HowTo" example line | Search Central Blog "Changes to HowTo and FAQ rich results" (Aug 8, 2023, updated Sept 13, 2023); Google documentation updates log |
| seo-content-writing | Verified | Title/meta limits, keyword and linking standards, FAQ schema mention; measured example title length (was 67 chars) | Example title shortened to 52 chars to satisfy the under-60 rule; added FAQ schema caveat (no Google rich result since May 7, 2026) | Google SEO starter guide; Google documentation updates log |
| technical-writing | Verified | Example commands (`npm install -g typescript`, `tsc --version`), Node.js version claim, style-guide links | "Node.js 24 (current LTS line)" → "Node.js 26 (current LTS line since 28 October 2026)"; added Node release-schedule compatibility note (24 Maintenance, 22 EOL Apr 2027, annual LTS model from 27) and WCAG 2.2 version note | nodejs.org/en/about/previous-releases (Node 26 Lithium LTS; Node 24 Maintenance); Node.js release schedule |

### skills/media (12)

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| ai-image-generation | Verified | Tool links (OpenAI/Midjourney/Gemini/Unsplash), disclosure and licensing guidance, format advice | Added compatibility note: model names/capabilities change frequently; verify current model in linked docs, record exact tool+model version | platform.openai.com/docs, docs.midjourney.com, ai.google.dev |
| blog-featured-images | Verified | Sharp example code (`.resize(1600,900,{fit:"cover"}).jpeg({quality:82})`), srcset/fetchpriority markup, OG reuse guidance | Added Sharp 0.35.x API version note | sharp.pixelplumbing.com (changelog v0.35.5, Sept 27, 2026); MDN img element; ogp.me |
| brand-visual-consistency | Verified | WCAG contrast references, palette/type/logo rules | Added WCAG 2.2 version + concrete AA ratios (4.5:1 normal, 3:1 large, incl. large-text px thresholds) | WCAG 2.2 Rec (Oct 2023); W3C WAI Images tutorial |
| image-accessibility | Verified | Alt-text rules vs W3C Images tutorial, decorative/complex-image handling, 125-char guidance | Added WCAG 2.2 version + criteria (1.1.1, 1.4.3, 1.4.11) and ratios; noted WCAG 3.0 is still a draft; added contrast requirement for text in images | w3.org/WAI/tutorials/images/; WCAG 2.2 Rec |
| image-compression | Verified | Sharp examples (JPEG q82, PNG compressionLevel 9), ImageMagick `magick -resize 1600x -quality 82` syntax, lossy/lossless guidance | Added Sharp 0.35.x + ImageMagick 7 (`magick`; v6 `convert` not available by default on v7) compatibility note | sharp.pixelplumbing.com; imagemagick.org |
| image-format-conversion | Verified | Format rules (JPEG no transparency, PNG for text graphics, SVG script risk), Sharp `.webp`/`.avif` calls, `picture` fallback example | Added browser-support note: WebP ~97% (all current browsers, Safari 14+); AVIF Baseline Jan 2024 (Chrome 85+, Firefox 93+, Safari 16+, Edge 121+, ~94–96%); JPEG XL in Chrome 155+/Firefox 158+/Safari 17+ (partial) but not Edge — optional first source only; Sharp 0.35.x + ImageMagick 7 note | caniuse.com (via multiple corroborating sources, Nov 2026); MDN; sharp.pixelplumbing.com |
| image-prompt-engineering | Verified | Prompt anatomy, tool-difference warnings, negative-prompt guidance | Added model-version compatibility note (prompt handling changes per model release; record tool+version) | docs.midjourney.com, platform.openai.com/docs, ai.google.dev |
| infographic-generation | Verified | Chart-type guidance, source-line and axis-zero rules, accessibility handling | None needed | W3C WAI Images tutorial; schema.org/ImageObject; sharp.pixelplumbing.com |
| og-image-generation | Verified | 1200x630 claim, tag set, Sharp example, safe-area guidance | Fixed false attribution ("Open Graph protocol documents" → Meta's documented recommendation); added Meta limits (min 200x200, large preview 600x315, max 8 MB) and LinkedIn 1200x627/5 MB; added `og:image:alt` to tags, workflow, and checklist; added Meta Sharing Debugger link; noted JPEG/PNG safest for scrapers; Sharp 0.35.x note | ogp.me (opened, live — no dimensions in spec; `og:image:alt` recommended); Meta for Developers "Images in Link Shares" (via corroborating secondary sources); developers.facebook.com/tools/debug/ |
| social-preview | Verified with limitations | Tag-check workflow, curl example, per-platform cache guidance | Named official debuggers (Meta Sharing Debugger link, LinkedIn Post Inspector); added X Card Validator retirement note and post-composer preview method; added `og:image:alt`/`twitter:image:alt` to example tag set | ogp.me; Meta Sharing Debugger; X validator retirement per secondary reporting (Nov 2026) — X domains could not be fetched directly (blocked), so this point is not confirmed against X's own docs |
| twitter-card-images | Verified with limitations | Card size, tag set, OG-reuse claim, Sharp example | Corrected 1200x675 (16:9) → 1200x600 (2:1) throughout incl. frontmatter description; fixed OG-reuse claim (1200x630 loses only ~15 px); added limits (min 300x157, max 4096x4096, <5 MB, JPG/PNG/WEBP/GIF, no SVG), `twitter:image:alt` (420 chars), `summary` card spec (1:1, min 144x144), Sharp 0.35.x note, and a note that X's Cards docs are no longer published | X's last published "Summary Card with Large Image" specification (archived Jan 2026), as quoted consistently across independent sources; X's current developer site no longer hosts the Cards pages (Nov 2026). X domains could not be fetched directly (blocked), so the spec could not be re-verified against a live X page — hence the limitation |
| youtube-thumbnails | Verified | 1280x720 claim, format and file-size guidance, duration-badge safe area | Corrected to YouTube's current recommendation: 3840x2160 videos, 2160x3840 Shorts, min 640 px, JPG/PNG, 2 MB mobile / 50 MB desktop (10 MB podcasts mobile), verified account required, podcast playlists 1:1; updated description, workflow, standards, Sharp example, checklist; 1280x720 retained as minimum acceptable | YouTube Help "Add custom thumbnails" (support.google.com/youtube/answer/72431, opened and crawled 2026-11-20) |

## Notes and open items for the coordinator

- **X/Twitter specs carry a residual limitation.** X's Cards
  documentation pages are no longer published on X's developer site,
  and X domains (developer.x.com, cards-dev.twitter.com) could not be
  fetched directly from this environment, so the card limits in
  `twitter-card-images` and the Card Validator retirement note in
  `social-preview` rest on X's last published specification as quoted
  in archived copies and corroborated by multiple independent sources
  (November 2026). If the coordinator has a route to X's docs, a
  direct re-check of the 2:1 large-card spec is the one remaining
  verification worth doing.
- **Meta's sharing-doc numbers** (1200x630 recommendation, 600x315 /
  200x200 minima, 8 MB cap) are corroborated by four independent
  secondary sources quoting Meta for Developers ("Images in Link
  Shares", updated June 30, 2026); the Meta doc page itself was not
  fetched directly. The ogp.me side of the correction was verified
  directly.
- **Two description changes** (`twitter-card-images`,
  `youtube-thumbnails`) will flow into the registry on regeneration;
  both were changed only because the old descriptions stated wrong or
  outdated sizes.
- **No blockers.** Nothing is left in "Needs correction" or
  "Unverified" status.
