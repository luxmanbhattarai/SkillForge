---
name: faq-generation
description: >
  Create useful FAQ sections and pages from real audience questions: gather
  the questions people actually ask, answer them directly, and structure
  them for readers and search. Use when adding an FAQ section to a page,
  building a dedicated FAQ page, or answering common questions from support
  tickets and search queries. Trigger keywords: FAQ, frequently asked
  questions, FAQ page, FAQ section, common questions, Q&A, FAQ schema.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# FAQ Generation

## Purpose

This skill turns real audience questions into a FAQ that actually helps:
questions people ask, answered directly in plain language, organized so
readers find their answer fast. It covers gathering questions from genuine
sources (support tickets, search queries, forums), writing tight answers,
and structuring the result for both readers and search engines.

## When to Use

- Adding an FAQ section to an article, product page, or landing page.
- Building a dedicated FAQ or help page.
- Answering the common questions that come from support tickets or sales calls.
- Covering the related questions around a keyword that the main content does not answer.

## When Not to Use

- Writing the main article content — use `article-writing` instead.
- Building a full help center or knowledge base — use `technical-writing` for the guides, with FAQ as a complement.
- Answering questions nobody asks — an FAQ built from invented questions helps no one.
- Checking facts in existing answers — use `fact-checking` instead.

## Prerequisites

- A real source of questions: support tickets, search queries, forum threads, sales questions, or "People also ask" results.
- The topic and audience, so answers match their level.
- Accurate answers or access to the people and sources that can provide them.
- The page or site where the FAQ will live, and whether FAQ structured data applies.

## Official Documentation

- [FAQPage structured data](https://schema.org/FAQPage) — the Schema.org type for FAQ pages.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality.
- Compatibility: Google fully removed the FAQ rich result from Google Search on May 7, 2026, and removed the FAQ structured-data documentation in June 2026 (see the [Google Search documentation updates log](https://developers.google.com/search/updates) — entries of May 8 and June 15, 2026). FAQPage remains valid schema.org vocabulary and causes no penalty, but it no longer produces any visible rich result in Google Search — do not add FAQ markup expecting an expandable listing. Other search engines and consumers may still read it. Google also states there is no need to proactively remove existing FAQPage markup: unused structured data causes no problems in Search.

## Required Workflow

1. Gather real questions from genuine sources: support tickets, search queries, forum threads, and questions the team hears repeatedly. Record the source of each question.
2. Deduplicate: merge questions that ask the same thing in different words, keeping the phrasing closest to how people actually ask.
3. Rank the questions by frequency and importance: the most-asked and most consequential questions come first.
4. Check whether each question is already answered well on the site; if it is, link to that page instead of duplicating the answer.
5. Write the answer to each question directly: lead with the answer in the first sentence, then add the necessary detail. Keep answers to 40-80 words unless the question genuinely needs more.
6. Order the questions logically: by topic, or by the order a reader encounters them (before buying, while using, when something goes wrong).
7. Verify every answer's facts with `fact-checking` where the answer states a fact, number, or policy.
8. Add FAQ structured data (FAQPage) only when the questions and answers are visible on the page and the site controls the content. Never add FAQ markup for questions the page does not display. Expect no Google rich result from it: Google removed the FAQ rich result in May 2026, so the markup is for other consumers and for machine-readable page understanding only.
9. Review the FAQ with `editorial-review`, checking that each question is real and each answer is accurate and complete.
10. Plan maintenance: review the FAQ when the product, policy, or topic changes, and add new questions as they appear in support tickets.

## Implementation Standards

- Every question must come from a real source: support tickets, search data, forums, or direct audience questions. Invented questions are not allowed.
- Answers lead with the answer in the first sentence, then add detail.
- Answers are 40-80 words by default; longer answers link to a full guide instead of expanding in place.
- Questions are written in the reader's words, not the company's jargon.
- Answers are accurate and current; policy answers (pricing, shipping, returns) match the current published policy.
- FAQ structured data is used only for visible Q&A content the site controls, following the Schema.org FAQPage type.
- Do not promise or expect a Google rich result from FAQPage markup: Google stopped showing FAQ rich results on May 7, 2026. Existing FAQPage markup is harmless and does not need to be removed.
- The FAQ does not duplicate content that already exists on the site; it links to it.
- Questions are ordered by topic or reader journey, not randomly.

## Best Practices

- Keep the FAQ focused: 5-10 questions per page section, and a dedicated FAQ page for more.
- Use the exact phrasing people use in their questions; it helps readers recognize their question and helps search match it.
- Update the FAQ when the answer changes; an outdated FAQ answer is worse than no answer.
- Track which FAQ entries get read or clicked, and promote the popular ones.
- If the same question keeps arriving in support, the FAQ answer is not visible or clear enough — fix the visibility, not just the wording.

## Security Considerations

- Never include credentials, API keys, or private data in FAQ answers or examples.
- Do not answer questions that would reveal internal processes, security details, or other users' data.
- Policy answers (refunds, privacy, security) must match the published policy exactly; a wrong policy answer can create liability.

## Performance Considerations

- A FAQ section should load with the page, not behind a slow script; use native HTML details elements or simple markup.
- Keep FAQ pages focused: one topic per FAQ page, with links to related pages, rather than a single giant FAQ.
- FAQ structured data is optional; add it only when the content genuinely qualifies, and never for the sake of a Google rich result — that feature no longer exists.

## Common Mistakes

- Inventing questions nobody asks, to pad the page or target keywords.
- Writing answers that bury the answer under background.
- Duplicating answers that already exist elsewhere on the site, creating two versions that drift apart.
- Adding FAQ structured data for questions the page does not display.
- Letting FAQ answers go stale when policies or products change.

## Examples

Example FAQ section:

```md
## Frequently asked questions

### How often should I feed my sourdough starter?

Feed it once a day if it lives on the counter, or once a week if it lives
in the fridge. A starter on the counter at room temperature needs daily
feeding to stay active; refrigeration slows it down enough for weekly
feeding.

### Why does my starter smell like acetone?

An acetone smell means your starter is hungry. Feed it, and the smell
should fade within a day. If it persists after two feedings, switch to
twice-daily feedings for a few days.

### Can I freeze my sourdough starter?

Yes. Freeze a fed, active starter in an airtight container for up to
three months. Thaw it in the fridge, then feed it daily for 2-3 days
before baking.
```

Example FAQPage structured data (generic example values):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How often should I feed my sourdough starter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Feed it once a day on the counter, or once a week in the fridge."
      }
    }
  ]
}
```

## Validation Checklist

- [ ] Every question comes from a real source, recorded in the research notes.
- [ ] Duplicate questions are merged.
- [ ] Each answer leads with the answer in the first sentence.
- [ ] Answers are accurate, current, and verified where they state facts.
- [ ] Questions are ordered logically by topic or reader journey.
- [ ] Answers do not duplicate content that exists elsewhere on the site.
- [ ] FAQ structured data, if used, matches the visible Q&A exactly.
- [ ] The FAQ passes the `editorial-review` checklist.

## Expected Deliverables

- A complete FAQ section or page, ready to publish.
- A list of question sources (support tickets, search queries, forums).
- FAQ structured data (FAQPage JSON-LD), if applicable.

## References

- [FAQPage structured data](https://schema.org/FAQPage) — the Schema.org type for FAQ pages.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- Related skills in this repository: `article-writing`, `seo-content-writing`, `editorial-review`, `fact-checking`.
