---
name: seo-content-writing
description: >
  Write content designed to rank and satisfy search intent: keyword-aware
  drafts with strong titles, heading structure, internal links, and metadata.
  Use when writing a page or article whose primary job is to appear in search
  results and answer the query well. Trigger keywords: SEO writing, SEO
  content, search-optimized content, on-page content, ranking content,
  search intent writing.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SEO Content Writing

## Purpose

This skill produces content that serves two readers at once: the person who
typed the query and the search engine deciding which pages deserve to rank.
It combines search-intent analysis with solid writing so the page answers the
query fast, covers the topic thoroughly, and is structured for both humans and
crawlers. It never sacrifices readability for optimization.

## When to Use

- Writing a page or article whose primary traffic source will be search.
- Rewriting a page so it matches the intent of its target keyword.
- Drafting landing pages, guides, or category pages built around a query.
- Optimizing a draft's titles, headings, and metadata for search.

## When Not to Use

- Writing for an existing audience where search is irrelevant — use `blog-writing` instead.
- Pure brand or sales copy — use `copywriting` instead.
- Technical documentation — use `technical-writing` instead.
- Turning a keyword into a plan before writing — use `keyword-to-content` first, then this skill to draft.
- Checking facts in a finished draft — use `fact-checking` instead.

## Prerequisites

- The target keyword and its search intent (`keyword-to-content` can supply this).
- A brief or outline, including the page type and the subtopics to cover.
- Knowledge of the site's existing pages, to avoid targeting a keyword another page already owns.
- The site's metadata and internal-linking conventions.

## Official Documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality.
- [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — Google's guidance on titles, headings, links, and images.
- [Search Console Help](https://support.google.com/webmasters/) — how to check whether pages are indexed and how they perform.

## Required Workflow

1. Confirm the target keyword, its intent, and the page type. If intent is unknown, run `keyword-to-content` first.
2. Read the top-ranking pages for the keyword and list the subtopics they cover and the angles they take.
3. Build an outline that covers every subtopic the top results cover, plus at least one original angle, example, or data point they lack.
4. Write a title under 60 characters with the keyword placed naturally near the front.
5. Write a meta description under 160 characters that states what the reader gets; include the keyword only if it fits naturally.
6. Draft the page so the first 100 words answer the query directly, then expand into the outline.
7. Use the keyword in the H1, the first paragraph, and one or two H2s where natural; use synonyms and variants elsewhere.
8. Add internal links to the pillar page and sibling pages, using descriptive anchor text that tells the reader what they will find.
9. Add images with descriptive file names and alt text that describes the image for readers who cannot see it.
10. Review against the `editorial-review` checklist and verify the page is not competing with another page on the same site for the same keyword.

## Implementation Standards

- One target keyword per page, with a clear primary intent.
- Title under 60 characters; meta description under 160 characters.
- H1 matches the title or is a close variant; exactly one H1 per page.
- The query is answered in the first 100 words.
- Keyword use is natural and sparse: never repeat a keyword to hit a density target, and never force it into a heading where it reads awkwardly.
- Headings are descriptive and form a logical outline; no heading exists only to hold a keyword.
- Internal links use descriptive anchor text, never "click here" or a bare URL.
- Images have descriptive alt text; decorative images get empty alt text.
- Never promise a ranking, position, or traffic outcome. Any estimate must be labeled as an estimate.
- Never invent search volume, difficulty, or competitor numbers. If a number is not from a real tool or source, do not state it.

## Best Practices

- Satisfy the searcher first: a page that answers the query well is the foundation; optimization is the polish.
- Cover the topic completely but concisely — length follows the topic, not a word-count target.
- Use FAQ sections for related questions the page answers, and consider FAQ schema where it genuinely applies.
- Update the publish date only when the content actually changes; a false "updated" date misleads readers.
- Keep URLs short, descriptive, and stable; changing a URL after publication requires a redirect.

## Security Considerations

- Never include credentials, API keys, or private data in page content, examples, or metadata.
- Do not use deceptive techniques (hidden text, cloaking, misleading schema) — they risk penalties and erode trust.
- When adding schema markup, use only true, verifiable values; never fabricate ratings, reviews, or business details.

## Performance Considerations

- Compress images and use modern formats; heavy pages rank worse and lose readers.
- Keep pages focused: a page that tries to rank for three intents usually ranks for none.
- Internal links should help readers navigate, not exist to pass ranking signals; a handful of relevant links beats a wall of them.

## Common Mistakes

- Keyword stuffing: repeating the target keyword until the copy reads like a machine wrote it.
- Writing a long page that never answers the query directly.
- Targeting the same keyword with two pages and splitting the site's authority.
- Using clickbait titles that the page does not deliver on.
- Promising rankings or traffic in the brief or the copy.

## Examples

Example title and meta description:

```text
Title: How to Feed a Sourdough Starter (Ratios, Schedule, Troubleshooting)
Meta: Learn how to feed a sourdough starter: exact ratios, a daily and
weekly schedule, and how to fix a sluggish starter. Five minutes a day.
```

Example heading structure for the same page:

```md
# How to Feed a Sourdough Starter
## What you need
## Feeding ratios explained
## Step-by-step feeding
## How often to feed (counter vs. fridge)
## Troubleshooting a sluggish starter
## Frequently asked questions
```

## Validation Checklist

- [ ] The target keyword and intent are recorded and the page type matches the intent.
- [ ] The query is answered in the first 100 words.
- [ ] Title is under 60 characters and the meta description under 160.
- [ ] Headings form a logical outline covering the top results' subtopics plus an original angle.
- [ ] Keyword use is natural, with no stuffing.
- [ ] Internal links use descriptive anchor text and point to relevant pages.
- [ ] Images have descriptive alt text.
- [ ] No ranking or traffic promise appears anywhere.
- [ ] The page passes the `editorial-review` checklist.

## Expected Deliverables

- A complete search-optimized page draft in Markdown (or the site's format).
- Title and meta description.
- Internal link list with anchor text.
- Notes on schema types that apply, if any.

## References

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — titles, headings, links, and images.
- Related skills in this repository: `keyword-to-content`, `article-writing`, `faq-generation`, `editorial-review`.
