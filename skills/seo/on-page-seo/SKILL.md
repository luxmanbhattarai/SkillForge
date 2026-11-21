---
name: on-page-seo
description: >
  Optimize the on-page elements of a single page or template: title tags,
  meta descriptions, headings, body content, images, and internal links.
  Use when writing or improving a page, fixing titles or headings, or
  optimizing content for a target keyword.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# On-Page SEO

## Purpose

On-page SEO makes a page's topic, relevance, and structure clear to both
search engines and readers. This skill covers the elements an agent can
control on the page itself — titles, headings, copy, images, and links —
and how to optimize them for a target query without keyword stuffing or
misleading markup. It improves a page's chance of ranking and earning
clicks; it never guarantees a position.

## When to Use

- Writing or revising a page, article, or product page for a target keyword.
- Fixing title tags, meta descriptions, or heading structure on existing pages.
- A page ranks on page two or three and needs relevance improvements.
- Building or updating a page template (article, product, category, landing).
- A content audit flags thin, duplicated, or poorly structured pages.

## When Not to Use

- To choose which keywords to target — use `keyword-research` and
  `search-intent` first.
- To fix crawl or indexation problems — use `technical-seo` instead.
- To add structured data — use `schema-jsonld` instead.
- To plan internal link architecture site-wide — use `internal-linking`.

## Prerequisites

- A target query (or small set of related queries) for the page, chosen
  with `keyword-research`, plus its search intent from `search-intent`.
- Access to edit the page or its template (CMS, codebase, or markdown files).
- Knowledge of the page's current title, headings, and body copy.
- The site's brand name and naming conventions for titles.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's official guidance on titles, headings, and content.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  content and technical policies the page must meet.

Guidance current as of 2026-11-20. Title length, meta description
length, and the one-H1 convention in this skill are display and
clarity heuristics, not Google requirements: Google publishes no
character limits for titles or descriptions and does not require a
single H1.

## Required Workflow

1. Confirm the target query and its intent; check what currently ranks for
   it with `serp-analysis` to understand the expected content type.
2. Write the title tag: primary keyword near the front, unique to the page,
   readable as a headline, and short enough not to be truncated in
   results. Google truncates titles by pixel width, not by a character
   count — "under roughly 60 characters" is an industry rule of thumb,
   not a Google limit.
3. Write the meta description: a summary of around 150-160 characters
   that includes the query naturally and gives a reason to click. The
   150-160 character range is a display heuristic, not a Google limit,
   and Google often rewrites descriptions. It does not directly
   affect rankings, but it affects click-through.
4. Structure headings: one H1 that matches the page's topic (usually the
   page title), H2s for the main sections, H3s for subsections. Never skip
   levels for styling, and never use headings for bold text.
5. Optimize the body: answer the query early, cover the topic thoroughly,
   use the target query and its natural variants where they fit the
   meaning, and break long text into scannable sections.
6. Optimize images: descriptive file names, concise alt text that describes
   the image, appropriate dimensions, and modern formats where supported.
7. Add internal links to and from related pages with descriptive anchor
   text (see `internal-linking`).
8. Check the URL: short, lowercase, hyphenated, containing the primary
   keyword where sensible, and stable — do not change a ranking URL
   without a redirect plan.
9. Verify the rendered page: title, description, headings, and canonical
   tag all present in the rendered DOM, not just the source.
10. Re-check with Search Console after publication: confirm the page is
    indexed and the title shown in results matches the intended title.

## Implementation Standards

- One primary query per page. Supporting queries must be genuine variants
  of the same intent, not unrelated keywords forced onto the page.
- Title tags: unique across the site, accurate to the page content, no
  keyword repetition, no ALL CAPS, no clickbait that the page does not
  deliver.
- Meta descriptions: unique, written as a summary for humans, no keyword
  stuffing, no quoted claims the page does not support.
- Headings: one H1 per page as a house convention; H2/H3 order follows
  the document outline; headings describe the section that follows
  them. (Google does not require a single H1 and does not penalize
  multiple H1s — one H1 is a clarity convention, not a Google rule.)
- Body copy: the primary query appears in the first 100 words only if it
  reads naturally; keyword density targets are not a real standard and
  must not be enforced.
- Images: every meaningful image has alt text; decorative images use an
  empty alt attribute (`alt=""`); no image carries the page's only copy
  of important text.
- URLs: lowercase, hyphens between words, no session IDs or tracking
  parameters in the canonical URL, no unnecessary nesting.

## Best Practices

- Match the format searchers expect: if the top results are listicles,
  a listicle structure serves the query better than an essay.
- Put the answer first for informational queries, then the supporting
  detail; readers and featured-result extraction both reward this.
- Write titles for humans first and search engines second; a title that
  earns clicks beats a keyword-perfect title nobody clicks.
- Keep the most important content above the fold and out of tabs or
  accordions that require interaction on mobile.
- Refresh pages that rank but are going stale: update facts, dates, and
  examples, and say what changed.

## Security Considerations

- Never inject user-supplied text into title or meta tags without escaping;
  unescaped input in the `<head>` is a cross-site scripting vector.
- Do not expose internal identifiers, staff names, or private data in meta
  tags or structured data.
- When optimizing user-generated content pages, strip or escape markup in
  titles and descriptions the same way as any other user input.

## Performance Considerations

- Images are usually the largest on-page cost: serve responsive sizes and
  modern formats, and lazy-load images below the fold.
- Avoid layout shift from images and embeds by reserving their dimensions
  in markup or CSS.
- Keep the number of above-the-fold render-blocking resources low; a slow
  first paint hurts both users and crawl efficiency.

## Common Mistakes

- Keyword stuffing — repeating the target query unnaturally. Write for the
  reader; search engines understand synonyms and context.
- Duplicate titles across pages — template defaults that produce the same
  title on every page confuse search engines about which page to show.
- Multiple H1s or H1s used as logo text — the H1 should name the page's
  topic, not the site. (Multiple H1s are not penalized by Google; one
  H1 per page is the house convention for clarity.)
- Optimizing for the wrong intent — a product page cannot rank for an
  informational query no matter how well its title is written.
- Changing a ranking URL without a redirect — the old URL's signals are
  lost and visitors hit 404s.

## Examples

Example title, description, and heading structure for an article page:

```html
<title>How to Fix Sourdough That Won't Rise — Example Baking Blog</title>
<meta name="description" content="Your sourdough won't rise? Learn the
  five most common causes — weak starter, cold dough, and more — and how
  to fix each one before your next bake.">
```

```html
<h1>How to Fix Sourdough That Won't Rise</h1>
<h2>Why Sourdough Fails to Rise</h2>
<h3>Your Starter Isn't Active Enough</h3>
<h3>Your Dough Is Too Cold</h3>
<h2>How to Fix Each Problem</h2>
```

Example image markup with descriptive alt text:

```html
<img src="/images/sourdough-starter-bubbles.jpg"
     alt="Active sourdough starter with bubbles on the surface"
     width="800" height="600" loading="lazy">
```

## Validation Checklist

- [ ] Title tag is unique, short enough to avoid truncation in
      results (roughly 60 characters is a rule of thumb, not a Google
      limit), and matches the page's content.
- [ ] Meta description is unique, around 150-160 characters (a
      display heuristic, not a Google limit), and written for humans.
- [ ] One H1 per page (house convention); heading order is logical
      with no skipped levels.
- [ ] The target query's intent matches the page's content type.
- [ ] All meaningful images have descriptive alt text.
- [ ] The canonical URL is short, lowercase, and free of tracking parameters.
- [ ] Title, description, and headings appear in the rendered DOM.

## Expected Deliverables

- The optimized page or template with updated title, description, headings,
  copy, images, and internal links.
- A short summary of what changed per page and the target query each page
  now serves.
- A list of any pages that need a redirect because a URL changed.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's official on-page guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  content and technical policies.
- Related skills in this repository: `keyword-research`, `search-intent`,
  `serp-analysis`, `internal-linking`, `schema-jsonld`, `image-seo`.
