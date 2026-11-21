---
name: keyword-to-content
description: >
  Turn one keyword or search query into a complete content plan: search intent,
  page type, outline, headings, and on-page requirements. Use when you have a
  target keyword and need to decide what page to build and what it must cover.
  Trigger keywords: keyword to content, keyword mapping, search intent,
  content outline, target keyword, SERP intent.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Keyword to Content

## Purpose

This skill converts a single keyword into a buildable page plan. It classifies
the search intent behind the query, picks the right page type, and produces a
heading outline plus the on-page elements the page needs. The output is a
brief an agent or writer can execute without further research into intent.

## When to Use

- You have a target keyword and need to decide what kind of page to create.
- Mapping a keyword list to pages so two pages do not target the same query.
- Building an outline from a keyword before drafting with `article-writing`.
- Checking whether an existing page matches the intent of the keyword it targets.
- Planning FAQ or supporting pages around a pillar keyword.

## When Not to Use

- Finding keywords in the first place — that is keyword research, not keyword mapping.
- Writing the full article — use `article-writing` or `blog-writing` after this skill produces the outline.
- Planning a whole site's topic architecture — use `content-strategy` instead.
- Refreshing a page that already ranks — use `content-refresh` instead.

## Prerequisites

- The exact target keyword or query, as a user would type it.
- Knowledge of the site's existing pages, so the keyword is not mapped to a page that already targets it.
- Access to search results for the keyword (to read intent from what ranks) or a clear description of the audience.
- The site's topic cluster map, if one exists, so the new page lands in the right cluster.

## Official Documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — how Google defines content that satisfies searchers.
- [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — Google's guidance on titles, headings, and page structure.

## Required Workflow

1. Record the exact keyword and any close variants the page should also answer (different phrasings of the same question).
2. Classify the intent: informational (learn), navigational (find a specific site), commercial (compare before buying), or transactional (buy or sign up). If the intent is mixed, name the dominant one.
3. Read the current search results for the keyword and note the dominant page types (guides, product pages, listicles, videos, forums) and the angles they take.
4. Choose the page type that matches the dominant intent: guide, how-to, comparison, product or landing page, FAQ, or list.
5. Check for cannibalization: if an existing page already targets this keyword, decide whether to update it (`content-refresh`) instead of creating a new page.
6. Draft the heading outline (H1 plus H2s, with H3s where a section needs substructure) so the page answers the query in the first screen and covers every subtopic the top results cover.
7. Write the title and meta description requirements: title under 60 characters, meta description under 160 characters, keyword in the title naturally, no clickbait.
8. List the on-page requirements: internal links (pillar and siblings), images or diagrams needed, schema type if applicable, and the call to action that matches the intent.
9. Hand the plan to `content-brief` or directly to drafting, with the intent classification attached so the writer does not drift.

## Implementation Standards

- One keyword maps to one primary page. If two keywords need the same page, merge them into a single brief.
- The H1 must match the search intent and read like a natural answer to the query, not a keyword string.
- The first 100 words must answer the query directly or state clearly what the page delivers.
- Headings must form a logical outline: reading the H2s alone should tell the reader what the page covers.
- Keyword use must be natural: use the exact keyword in the title, H1, and first paragraph, then use natural variants. Never repeat a keyword to hit a density target.
- Never promise a ranking, traffic number, or result in the brief. Estimates must be labeled as estimates.
- Every outline must include at least one section that adds value beyond what the top results already say (an original angle, example, or data point).
- Do not plan a page around a rich-result type Google no longer shows: HowTo rich results were fully removed from Google Search on September 13, 2023 (Google Search Central Blog, "Changes to HowTo and FAQ rich results"), and FAQ rich results were fully removed on May 7, 2026. The schema.org types still exist and are harmless, but they earn no visible Google feature — never list them in a plan as a visibility tactic. Google states there is no need to proactively remove existing markup of these types.

## Best Practices

- Let the search results settle intent disputes: what ranks is stronger evidence than what the keyword "sounds like."
- Answer the query before elaborating: searchers who bounce in the first seconds never see the rest.
- Keep outlines tight: a page that tries to answer three intents answers none of them well.
- Note the questions people ask around the keyword (from forums, support tickets, and "People also ask") and cover the best ones as H2s or FAQ entries.
- Revisit intent quarterly; a keyword's dominant intent can shift as products and trends change.

## Security Considerations

- Do not scrape search results with automated tools in ways that violate the search engine's terms of service; use official APIs or manual review.
- Do not include private keyword-tool exports or competitor data in briefs shared outside the team.

## Performance Considerations

- Map keywords in batches by cluster so related pages are planned together and link to each other from the start.
- A single keyword-to-content pass should take minutes, not hours: if intent is unclear after reading the top results, pick the dominant intent and note the uncertainty rather than researching indefinitely.

## Common Mistakes

- Targeting a keyword with the wrong page type, such as a product page for an informational query.
- Creating two pages for near-identical keywords and splitting the site's authority between them.
- Stuffing the keyword into every heading, which reads badly and helps no one.
- Writing an outline from imagination instead of reading what currently ranks.
- Promising a ranking or traffic outcome in the brief.

## Examples

Example mapping for the keyword "how to feed a sourdough starter":

```text
Keyword: how to feed a sourdough starter
Intent: informational (how-to)
Page type: how-to guide
H1: How to Feed a Sourdough Starter
H2s:
  - What you need
  - Feeding ratios explained
  - Step-by-step feeding
  - How often to feed (counter vs. fridge)
  - Signs your starter is hungry
  - Troubleshooting
Internal links: pillar "Sourdough starter guide", sibling "Sourdough starter feeding schedule"
Schema: HowTo (valid schema.org type, but note it no longer produces a
rich result in Google Search — see Implementation Standards)
```

## Validation Checklist

- [ ] The keyword and its intent classification are recorded.
- [ ] The chosen page type matches the dominant intent in the search results.
- [ ] No existing page already targets the same keyword.
- [ ] The outline answers the query in the first 100 words.
- [ ] H2s form a logical outline that covers the top results' subtopics.
- [ ] Title and meta description requirements are specified with character limits.
- [ ] Internal links, media needs, and schema type are listed.
- [ ] No ranking or traffic promise appears in the plan.

## Expected Deliverables

- A keyword-to-content plan: keyword, intent, page type, heading outline, and on-page requirements.
- A cannibalization check result (new page vs. update of an existing page).
- Title and meta description requirements.

## References

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) — titles, headings, and page structure.
- Related skills in this repository: `content-strategy`, `content-brief`, `article-writing`, `content-refresh`.
