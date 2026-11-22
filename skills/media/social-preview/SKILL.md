---
name: social-preview
description: >
  Verify how a shared link looks on social platforms and messaging apps
  before publishing. Use when a task asks to check, test, debug, or fix
  a link preview, social preview, share preview, or unfurl, or when a
  shared link shows the wrong image, title, or description.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Social Preview

## Purpose

This skill verifies that a shared URL produces the intended preview —
image, title, and description — on each platform where it will be
shared. It covers reading the page's meta tags, using official
debuggers, clearing stale caches, and diagnosing the common reasons a
preview is wrong. Platforms do not render previews identically, so each
target platform is checked on its own.

## When to Use

- A page is about to be published and its link preview must be checked.
- A shared link shows the wrong image, title, description, or no image.
- Open Graph or X card tags were changed and the new preview must be
  confirmed.
- A redesign, migration, or domain change may have broken previews.
- A launch checklist requires a preview check for every key page.

## When Not to Use

- The task is creating the OG image itself — use `og-image-generation`
  instead.
- The task is creating the X card image itself — use
  `twitter-card-images` instead.
- The task is the blog hero image — use `blog-featured-images` instead.
- The task is fixing the page's search-engine snippet rather than its
  social preview — that is a search metadata task, not a preview task.

## Prerequisites

- The public URL of the page to check; preview debuggers cannot fetch
  localhost or password-protected pages.
- The list of platforms to verify (at minimum the ones the audience
  actually uses).
- Access to the page template or CMS, in case tags need fixing.
- The expected title, description, and image for the page.
- Knowledge of which image file each tag points to and its dimensions.

## Official Documentation

- [Open Graph protocol](https://ogp.me/) — the tag specification that
  most preview systems read.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) — Meta's official tool: shows what its crawler reads from a page and forces a re-scrape ("Scrape Again").
- [X Developer Platform](https://developer.x.com/) — official X
  developer documentation, including cards.
- [MDN: the meta element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
  — how meta tags are written in HTML.
- Compatibility: X's standalone Card Validator has been retired, and
  X's developer site no longer publishes its Cards documentation pages
  (both confirmed via secondary reporting, November 2026; X's domains
  could not be checked directly). To preview an X card, paste the URL
  into a post composer draft instead of using a validator tool.
  LinkedIn's debugger is the LinkedIn Post Inspector. Each platform
  caches previews separately, and Facebook caches images by URL — a
  changed image under the same filename may keep showing the old
  preview until re-scraped.

## Required Workflow

1. List the target platforms for this page, and check each one
   separately. A correct preview on one platform does not prove the
   others are correct.
2. Fetch the page's HTML and read the `og:` and `twitter:` tags
   directly: title, description, image URL, image dimensions, URL,
   and type.
3. Confirm every image URL is absolute, uses HTTPS, and returns the
   image when fetched, with the expected dimensions.
4. Check the preview with each platform's official debugger or card
   validator where one exists (Meta Sharing Debugger, LinkedIn Post
   Inspector; for X, paste the URL into a post composer draft, since
   X's standalone Card Validator has been retired), and record what
   each one shows.
5. Compare each preview against the expected title, description, and
   image. Note every mismatch per platform.
6. When a platform shows stale content, use its official cache-refresh
   mechanism (usually re-scraping the URL in its debugger) and check
   again.
7. When a tag is missing or wrong, fix the tag in the template or CMS,
   then re-check; do not edit the preview, since previews are generated
   from the tags.
8. When the image is wrong, check the image itself: dimensions, file
   size, format, and whether the server returns it quickly enough for
   the crawler.
9. Re-check after every fix until each target platform shows the
   intended preview.
10. Record the result per platform: what was shown, what was fixed,
    and the date checked.

## Implementation Standards

- Check the tags in the served HTML, not only in the source template.
  Server-side rendering, caching, and CMS plugins can change what the
  crawler actually receives.
- The page must be publicly reachable over HTTPS with no login wall,
  bot block, or redirect loop; crawlers will not log in or solve
  challenges to read tags.
- Every image URL in the tags must be absolute and fetchable. A
  relative URL or a URL behind authentication produces no image.
- The `og:url` value must be the page's canonical URL, and the
  `og:image` value must point at the intended image file.
- Treat each platform's cache as separate: refreshing one platform's
  cache does not refresh another's.
- Record checks with dates. A preview verified months ago may be stale
  after a redesign or migration.

### Accessibility

- Preview images carry their text alternative: `og:image:alt` (and
  `twitter:image:alt`) describe the image for screen readers and
  text-only clients.
- Text in the preview is legible at the displayed size with 4.5:1
  contrast; keep it short — previews render small.
- The preview message does not depend on color alone.
- Verify the preview before publishing: title, description, image, and
  alt text all present and correct.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Check previews before publishing, not after sharing the link
  publicly; the first share is often the one that gets cached.
- Check the pages that get shared most first: the home page, key
  landing pages, and new articles.
- Keep a short checklist of target platforms per site so no launch
  forgets a platform the audience uses.
- When a preview is wrong, diagnose from the tags first; most preview
  failures are tag errors, not platform bugs.
- After a domain or hosting migration, re-check previews for the top
  pages, since image URLs and redirects often change.
- Screenshot each verified preview and keep it with the launch notes
  so later regressions are easy to spot.

## Security Considerations

- Preview debuggers fetch the page as a crawler; do not use them on
  URLs containing secrets, tokens, or private query parameters.
- Do not put sensitive information in preview tags or images: preview
  content is fetched, cached, and displayed by third-party platforms.
- Confirm the image host is a domain the site controls; a preview
  that loads from an untrusted host can be swapped.
- Be cautious with URL shorteners in shared links: the preview is
  generated from the final destination, and a shortener the site does
  not control adds a dependency and a trust risk.
- If a crawler is blocked by the site's bot rules, allow the official
  preview crawlers rather than disabling bot protection entirely.

## Performance Considerations

- Keep preview images compressed; a slow or oversized image may be
  skipped by a crawler and the preview shows no image.
- The page's HTML head should be served quickly; a slow first response
  can cause a crawler to time out before reading the tags.
- Avoid redirect chains on shared URLs; each redirect adds latency
  and some crawlers stop following after a few hops.
- Set long-lived cache headers on preview image files, since many
  crawlers and shares fetch the same URL.

## Common Mistakes

- Checking one platform and assuming the rest match — platforms crop,
  cache, and fall back differently; check each target.
- Testing against localhost or a staging URL behind a login — public
  debuggers cannot reach it, so the check proves nothing.
- Editing the image file but not refreshing the platform cache — the
  old preview persists until the cache is cleared.
- Using relative image URLs in tags — crawlers cannot resolve them.
- Assuming the template's tags are what the crawler sees — check the
  served HTML, which caching and plugins can change.
- Blaming the platform for a tag error — read the tags first; the
  cause is usually a missing, misspelled, or duplicated tag.

## Examples

Example tag check with a command-line fetch of the served HTML:

```bash
curl -s https://example.com/blog/sourdough-starter-smell/ | grep -E 'og:|twitter:'
```

Example of what a correct tag set looks like in the served HTML:

```html
<meta property="og:title" content="Why Your Sourdough Starter Smells Like Nail Polish Remover">
<meta property="og:description" content="That sharp smell usually means your starter is hungry. Here is what it is telling you and how to fix it.">
<meta property="og:image" content="https://example.com/images/og/sourdough-starter-smell.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/images/cards/sourdough-starter-smell.jpg">
<meta name="twitter:image:alt" content="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
```

Example check record:

```text
Page: https://example.com/blog/sourdough-starter-smell/
Checked: 2026-11-20
Platform A: correct image, title, description.
Platform B: stale image; cache refreshed, re-checked, now correct.
Fixes: updated og:image URL after the image was re-exported.
```

## Validation Checklist

- [ ] The target platforms were listed and each was checked separately.
- [ ] The `og:` and `twitter:` tags were read from the served HTML.
- [ ] Every image URL in the tags is absolute, HTTPS, and fetchable.
- [ ] Each platform's preview shows the intended image, title, and
      description.
- [ ] Stale caches were refreshed where a platform showed old content.
- [ ] Tag or image fixes were followed by a re-check.
- [ ] The result per platform was recorded with the check date.
- [ ] Accessibility: og:image:alt / twitter:image:alt present; preview text legible.

## Expected Deliverables

- A per-platform report: what each preview shows, and whether it is
  correct.
- A list of tag or image fixes made, with the files or CMS fields
  changed.
- Re-check results confirming each fix.
- Screenshots of the verified previews, when available.
- The check record with dates for the launch notes.

## References

- [Open Graph protocol](https://ogp.me/) — the tag specification.
- [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/) — check what Meta's crawler reads and force a re-scrape.
- [X Developer Platform](https://developer.x.com/) — official X
  developer documentation, including cards.
- [MDN: the meta element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
  — meta tag syntax.
- Related skills in this repository: `og-image-generation`,
  `twitter-card-images`, `blog-featured-images`, `image-compression`.
