---
name: search-intent
description: >
  Classify what a searcher actually wants behind a query — informational,
  navigational, commercial, or transactional — and match the right content
  type to it. Use when choosing a keyword's target page, planning content,
  or diagnosing why a page does not rank for its keyword.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Search Intent

## Purpose

Search intent is the goal behind a query, and matching it is the single
most important factor in whether a page can rank. A page that answers
the wrong intent — a product page for a "how to" query, a blog post for
a "buy" query — will not rank no matter how well optimized it is. This
skill classifies intent from query language and SERP evidence, then maps
each intent to the content type that serves it.

## When to Use

- Classifying keywords during `keyword-research` before they are
  prioritized or assigned to pages.
- Diagnosing why a well-optimized page does not rank for its target query.
- Planning a content type: article, guide, product page, comparison, or
  landing page.
- Reviewing an existing page whose rankings slipped after the SERP's
  dominant intent shifted.
- Deciding whether one page can serve two queries or whether they need
  separate pages.

## When Not to Use

- To discover new keywords — use `keyword-research` instead.
- To analyze the full SERP landscape (competitors, features, difficulty) —
  use `serp-analysis` instead.
- To group keywords into clusters — use `keyword-clustering` after intent
  is classified.
- To write the content once intent is known — use `on-page-seo`.

## Prerequisites

- The query or keyword list to classify.
- Access to the live search results for the query (a browser or SERP
  tool), because the SERP is the ground truth for intent.
- Knowledge of what the site offers: informational content, products,
  services, or a mix.
- The site's existing pages, so mismatched pages can be identified.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's guidance on people-first content that satisfies intent.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on understanding what users want.

## Required Workflow

1. Read the query for intent signals: question words (how, why, what),
   commercial words (best, review, vs, top), transactional words (buy,
   price, discount, near me), and brand names.
2. Look at the live SERP: what content types dominate the top 10 —
   articles, product pages, category pages, videos, local results, or a
   mix? The SERP is the authoritative evidence of intent.
3. Classify the query into one of four intents:
   - Informational: the searcher wants to learn (how-to, what-is, why).
   - Navigational: the searcher wants a specific site or brand.
   - Commercial: the searcher is comparing options before deciding
     (best, review, vs, alternatives).
   - Transactional: the searcher wants to act now (buy, sign up, book,
     download).
4. Note mixed intent where it exists: some queries have two intents in
   the top 10, and the split shows which dominates.
5. Map the intent to a content type: informational → article or guide;
   navigational → the brand's own page; commercial → comparison or
   review; transactional → product, pricing, or signup page.
6. Compare the site's current page (if any) against the required content
   type; a mismatch is the diagnosis.
7. For a mismatched page, decide: rewrite the page to match the intent,
   create a new page for the intent, or drop the query.
8. Record the classification with the SERP evidence that supports it
   (date checked, dominant content types in the top 10).
9. Re-check intent for the site's most important queries at least
   quarterly; intent shifts as products, seasons, and search behavior
   change.

## Implementation Standards

- The SERP decides intent, not the query alone. A query that looks
  informational may be dominated by product pages, and the SERP wins.
- Every classified keyword gets one primary intent and, where relevant,
  a secondary intent with the observed split.
- Classifications record the date and the observed top-10 content types,
  so a later reviewer can see the evidence.
- Do not classify by gut feeling: if the SERP was not checked, the
  classification is a guess and must be labeled as one.
- Navigational queries for another brand are not a targeting opportunity;
  do not build pages to intercept another brand's navigational traffic.
- Intent classification must happen before content is written, not after.

## Best Practices

- Watch the SERP features, not just the organic results: a "People also
  ask" box, a shopping carousel, or a local pack each signal intent.
- Treat "best" queries as commercial, not informational: the searcher is
  comparing, and a plain explainer will not satisfy them.
- For mixed-intent queries, serve the dominant intent first and cover
  the secondary intent in a section, rather than splitting the page.
- When a query's intent is genuinely ambiguous, a comprehensive page
  that answers the question and offers the next step can serve both.
- Revisit intent after a rankings drop: a shifted SERP is a common cause
  of a page that used to rank and no longer does.

## Security Considerations

- Intent classification itself has no direct security risk.
- Do not scrape search engines to classify intent at scale; use manual
  checks or a tool with an official data source.
- Do not build pages that impersonate another brand to capture its
  navigational queries; that is deceptive and can create legal exposure.

## Performance Considerations

- Intent classification is analysis work with no server impact; the cost
  is time, so classify the highest-priority keywords first and batch
  SERP checks.
- Automate the mechanical parts (recording classifications in a table)
  and spend judgment on ambiguous queries.
- Re-checking intent quarterly for the top queries is cheap; re-checking
  every keyword is not necessary.

## Common Mistakes

- Classifying from the query alone — "sourdough" could be informational,
  commercial, or local; only the SERP shows which.
- Treating intent as permanent — a query that was informational last year
  may be commercial now as products enter the market.
- Matching intent with the wrong format — a long essay for a query whose
  SERP is dominated by short videos and calculators.
- Ignoring mixed intent — building a purely transactional page for a
  query where half the SERP is informational content.
- Targeting navigational queries for other brands — the searcher wants
  that brand, and the page will not satisfy them.

## Examples

Example intent classifications with SERP evidence:

```text
| Query | Intent | SERP evidence (top 10) |
|-------|--------|------------------------|
| how to fix sourdough that won't rise | informational | 9 guides, 1 video |
| best bread flour for sourdough | commercial | 6 comparisons, 3 product pages, 1 guide |
| buy sourdough starter | transactional | 8 product pages, 2 category pages |
| example baking blog | navigational | brand homepage and brand pages |
```

Example content-type mapping:

```text
Informational  -> how-to article, guide, FAQ page
Commercial     -> comparison, review roundup, "best of" list
Transactional  -> product page, pricing page, signup page
Navigational   -> brand homepage or the specific brand page
```

## Validation Checklist

- [ ] Every keyword has a primary intent label with SERP evidence.
- [ ] The SERP was checked for each classified query (or the
      classification is labeled as a guess).
- [ ] The content type assigned to each query matches its intent.
- [ ] Existing pages were checked for intent mismatches.
- [ ] Mixed-intent queries note the observed split.
- [ ] Classifications record the date they were made.

## Expected Deliverables

- An intent-classified keyword list with evidence per query.
- A list of intent mismatches on existing pages, with the recommended
  fix for each (rewrite, new page, or drop).
- A content-type plan: which queries need articles, comparisons, product
  pages, or landing pages.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's people-first content guidance.
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) —
  Google's guidance on understanding searchers.
- Related skills in this repository: `keyword-research`,
  `keyword-clustering`, `serp-analysis`, `on-page-seo`.
