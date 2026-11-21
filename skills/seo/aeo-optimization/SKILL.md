---
name: aeo-optimization
description: >
  Optimizes content so search engines and AI answer engines can surface it as
  a direct answer, featured snippet, or cited source. Use when writing or
  improving question-answering pages, FAQ content, how-to guides, definitions,
  or comparison pages, and when targeting featured snippets, People Also Ask,
  voice search, or AI Overviews. Trigger keywords: AEO, answer engine
  optimization, featured snippet, AI Overview, People Also Ask, voice search,
  direct answer, FAQ schema.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# AEO Optimization

## Purpose

This skill makes content easy for search engines and AI answer engines to
extract, quote, and cite as a direct answer. It produces pages structured
around real questions, with concise answers up front, supporting detail
below, and structured data that machines can parse. It does not promise
featured snippets, AI Overview inclusion, or citations; those decisions
belong to the search and AI systems, and this skill only improves the
conditions under which a page can be selected.

## When to Use

- Writing or revising a page that answers a specific question (what, how,
  why, when, how much, which).
- Targeting featured snippets, People Also Ask boxes, or AI Overviews for
  a query the page already ranks for or could rank for.
- Adding FAQ, HowTo, or Q&A content to a page, help center, or product
  support section.
- Optimizing content for voice search or conversational queries.
- Auditing why a competitor's page is shown as the direct answer instead
  of yours.

## When Not to Use

- For pages whose goal is brand storytelling, opinion, or entertainment
  rather than answering a question — use `article-writing` instead.
- For general on-page ranking work (titles, headings, internal links)
  with no answer target — use `on-page-seo` instead.
- For structured data implementation in general — use `schema-jsonld`
  instead; this skill covers only answer-oriented schema choices.
- For measuring which queries already trigger answer features — use
  `search-console` and `serp-analysis` first.

## Prerequisites

- The target query or question, and evidence it is asked (Search Console
  queries, People Also Ask results, support tickets, or community posts).
- Access to edit the page content and, where needed, its structured data.
- A page that already covers the topic in depth, or a plan to write one;
  AEO structuring cannot rescue thin or inaccurate content.
- Knowledge of the current answer format shown for the query (paragraph,
  list, table, or video), observed from a live search result page.

## Official Documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — the quality and technical baseline every answer page must meet.
- [Google Search Central](https://developers.google.com/search) — current guidance on how Google surfaces content, including AI features.
- [Google's guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) —
  Google's official guide (May 2026): foundational SEO and
  non-commodity content are what Google documents for AI Overviews
  and AI Mode; it explicitly mythbusts AEO/GEO "hacks" such as
  special markup, content chunking, and rewriting just for AI.
- [Schema.org](https://schema.org/) — the vocabulary for FAQPage, HowTo, and QAPage structured data.

Guidance current as of 2026-11-20.

## Required Workflow

1. Identify the question. Record the exact query, its intent
   (informational, how-to, comparison, or definition), and the answer
   format currently shown for it.
2. Read the current top answer. Note its length, structure, and what it
   leaves out; your answer must be at least as complete and easier to
   extract.
3. Draft the direct answer first. Write a 40-60 word self-contained
   answer that stands alone without the rest of the page, using the
   question's key terms naturally. The 40-60 word range is an industry
   heuristic drawn from featured-snippet studies, not a Google
   requirement; completeness and clarity matter more than the count.
4. Place the answer immediately after the heading that restates the
   question. Do not bury it under introductions, anecdotes, or
   calls to action.
5. Support the answer below it. Add the detail, steps, table, or
   examples a reader needs after the short answer, in a logical order.
6. Structure the page for extraction. Use one clear H1, question-style
   H2 headings, short paragraphs, ordered steps for processes, and
   tables for comparisons.
7. Add matching structured data only where the visible content qualifies
   (see Implementation Standards). Validate it before publishing.
8. Publish, then verify. Confirm the page renders the answer in the
   HTML, the structured data validates, and the page is indexable.
9. Monitor and iterate. Check Search Console for the query's
   impressions and clicks over several weeks; revise the answer if a
   different page keeps winning the snippet.

## Implementation Standards

- One question per section. Each H2 asks one question and is followed
  immediately by its answer; do not stack several questions under one
  heading.
- Direct answers are 40-60 words, factual, and free of marketing
  language, first-person claims, and hedging that adds no information.
  (The word count is an industry heuristic, not a Google requirement.)
- Definitions start with the term and its category ("X is a ..."),
  then add the distinguishing detail in the same paragraph.
- How-to answers use a numbered list with one action per step, in
  execution order, with any prerequisite stated before step one.
- Comparison answers use a table with the compared items as rows or
  columns and the same criteria for each item.
- FAQPage structured data may only mark up questions and answers that
  are visible on the page. Never mark up hidden or generated FAQ text.
  Note: FAQ rich results no longer appear in Google Search (removed
  7 May 2026), and HowTo rich results were deprecated in September
  2023 — FAQPage and HowTo markup remain valid schema.org vocabulary
  but earn no Google rich result. Do not add them expecting one.
- HowTo structured data requires visible, ordered steps on the page.
  Do not apply it to narrative advice that has no real sequence.
- Every factual claim in a direct answer must be verifiable from a
  source the page cites or links to; do not state figures, dates, or
  requirements from memory.
- Never promise or imply a ranking, snippet, or citation outcome in
  the page copy or in reports to stakeholders.

## Best Practices

- Mirror the searcher's language in the heading, then answer in plain
  language; jargon in the question is fine, jargon in the answer is not.
- Keep the short answer stable. Editing it weekly resets whatever
  familiarity the answer engine has with the page.
- Answer follow-up questions on the same page. People Also Ask
  expansions for the main query are a good source of sub-questions.
- Use lists and tables generously; answer engines extract them more
  reliably than dense prose.
- Date-sensitive answers (prices, rules, versions) state the
  as-of date in the answer itself and are reviewed on a schedule.
- Link from the answer section to the deeper guide or source page so
  readers who want more can continue without searching again.

## Security Considerations

- FAQ and Q&A content must never include personal data from real
  users, support tickets, or reviews. Write generic example questions
  instead.
- Do not publish answers about security, health, finance, or legal
  topics unless the content was reviewed by someone qualified in that
  field; incorrect direct answers in these areas cause real harm.
- Structured data must describe only what is on the page. Fabricated
  ratings, reviews, or author credentials in schema are deceptive and
  can lead to a manual action.

## Performance Considerations

- Answer sections add little weight; keep them as plain HTML text
  rather than JavaScript-rendered widgets so crawlers read them
  without executing scripts.
- Keep structured data in a single JSON-LD block per page where
  practical, and keep it small; large inline blocks delay parsing.
- FAQ accordions are acceptable only if the answer text is present in
  the served HTML, not fetched on click.

## Common Mistakes

- Burying the answer — the direct answer sits below a long intro, so
  extraction picks a weaker paragraph. Put it directly under the
  question heading.
- Answering a different question than the heading asks — the mismatch
  confuses both readers and extraction. Restate the question, then
  answer that exact question.
- Marking up invisible FAQ content — hidden FAQ text with FAQPage
  schema violates Google's structured data guidelines. Only mark up
  visible content.
- Writing the answer as a teaser — "read on to find out" is not an
  answer and will never be selected. Give the answer, then the detail.
- Chasing every question on one page — a page that answers twenty
  unrelated questions answers none of them well. One topic, a few
  closely related questions.

## Examples

A question section with the direct answer placed first:

```md
## How long does sourdough starter take to double?

A healthy sourdough starter at room temperature (about 21-24 C) usually
doubles in 4 to 8 hours after feeding. Warmer kitchens shorten this time;
cooler kitchens lengthen it. A starter that has not doubled in 12 hours
may need a warmer spot or a different feeding ratio.

### Signs your starter has doubled
...
```

FAQPage JSON-LD for questions that are visible on the page (earns no
Google rich result since May 2026; still valid schema.org markup):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How long does sourdough starter take to double?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A healthy sourdough starter at room temperature (about 21-24 C) usually doubles in 4 to 8 hours after feeding."
      }
    }
  ]
}
```

## Validation Checklist

- [ ] Each target question has a question-style heading with a direct
      answer of about 40-60 words (an industry heuristic, not a Google
      requirement) immediately below it.
- [ ] The direct answer stands alone and contains no marketing language
      or unverified claims.
- [ ] Every factual claim in an answer is verifiable from a cited
      source.
- [ ] Structured data covers only visible content and passes validation.
- [ ] The answer text is present in the served HTML, not loaded by
      JavaScript on interaction.
- [ ] The page meets Google Search Essentials (indexable, no
      deceptive content, useful primary content).
- [ ] No copy on the page or in the report promises a snippet, AI
      Overview placement, or citation.

## Expected Deliverables

- The revised page(s) with question headings, direct answers, and
  supporting structure in place.
- Any FAQPage or HowTo JSON-LD added, with validation results noted.
- A short note per target query: the question, the answer format
  observed in search results, and what was changed.
- A monitoring note: which Search Console queries to watch and when
  to review (a few weeks after publishing).

## References

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — quality and technical baseline for answer pages.
- [Google Search Central](https://developers.google.com/search) — current guidance on search features and AI Overviews.
- [Schema.org](https://schema.org/) — FAQPage, HowTo, and QAPage vocabulary.
- Related skills in this repository: `llm-seo`, `schema-jsonld`, `on-page-seo`, `search-console`, `serp-analysis`.
