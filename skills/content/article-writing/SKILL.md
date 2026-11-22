---
name: article-writing
description: >
  Write long-form articles that are accurate, well-structured, and genuinely
  useful: research-backed drafts with clear headings, evidence, and a strong
  opening. Use when drafting an in-depth article, guide, or explainer from a
  brief or outline. Trigger keywords: article writing, long-form article,
  write an article, guide writing, explainer, draft article.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Article Writing

## Purpose

This skill produces long-form articles that a reader can trust and finish:
a clear promise in the opening, a logical heading structure, claims backed by
sources, and a conclusion that tells the reader what to do next. It covers
the full draft, from outline to final copy, and is built for articles that
need to stand up to scrutiny — not quick opinion posts.

## When to Use

- Drafting a long-form article, guide, explainer, or tutorial from a brief.
- Turning an outline from `keyword-to-content` or `content-brief` into full copy.
- Writing reference content, how-to guides, or in-depth explainers.
- Producing articles that need citations, examples, and structured sections.

## When Not to Use

- Short, conversational blog posts — use `blog-writing` instead.
- Pure marketing or sales copy — use `copywriting` instead.
- Technical documentation for developers — use `technical-writing` instead.
- Localizing an existing article — use `content-localization` instead.
- Checking a finished draft — use `editorial-review` instead.

## Prerequisites

- A brief or outline: topic, audience, intent, target length, and key points to cover.
- Research material or access to sources (`content-research` can supply this).
- The site's voice and style rules, if any exist.
- Target keyword and intent, when the article is meant to rank for a query.
- Conceptual skill; version range: none — no versioned tool, package, or platform dependency.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines for clear writing.
- [Google developer documentation style guide](https://developers.google.com/style) — practical style rules for clear technical and explanatory prose.

## Required Workflow

1. Confirm the brief: topic, audience, intent, length, and the one question the article must answer.
2. Gather or review research: facts, figures, quotes, and sources, with a link or citation for every non-obvious claim.
3. Build or confirm the outline: H1, H2s in logical order, H3s where needed. The outline must answer the core question early.
4. Draft the introduction last in spirit but first in order: state the promise, who the article is for, and what the reader will be able to do after reading. Keep it under 150 words.
5. Draft section by section, one idea per paragraph, with a topic sentence that carries the point.
6. Add evidence where claims need it: cite the source inline, link to the primary source, and quote sparingly.
7. Add examples, steps, or tables where they make an abstract point concrete. Prefer a short worked example over a long explanation.
8. Write the conclusion: summarize the key takeaways and give the reader a clear next step.
9. Self-edit: read the draft aloud in your head, cut filler, check every heading, and verify every link and fact.
10. Run the `editorial-review` checklist (or hand the draft to it) before calling the article done.

## Implementation Standards

- One H1 per article, matching the brief's topic and intent.
- Headings form a logical outline: H2s in an order a reader can follow, no orphan H3s without a parent H2.
- Paragraphs are short: 2-4 sentences each, one idea per paragraph.
- Sentences average under 25 words; no sentence should need re-reading to parse.
- Every factual claim that is not common knowledge carries a source, linked to the primary source where possible.
- No invented statistics, quotes, case studies, or expert endorsements. If a number cannot be sourced, remove it or label it clearly as an estimate.
- No keyword stuffing: the target keyword appears in the title, H1, and first paragraph, then only where natural.
- Length serves the topic: cover the subject fully, then stop. Padding to hit a word count is a defect.
- Use the active voice by default and address the reader directly ("you") unless the brief says otherwise.

### Accessibility

- Structure is an outline: one `h1`, headings in order, no skipped
  levels — screen readers navigate by headings.
- Every image gets alt text that conveys its meaning in context;
  decorative images are marked decorative.
- Link text describes its destination ("the 2026 Search Console
  guide", not "click here").
- Plain language: short sentences, defined terms, no jargon without an
  explanation — readability is cognitive accessibility.
- Color is never the only way information is conveyed in charts,
  callouts, or emphasis.
- Data in charts also appears as text or a table a screen reader can
  follow.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Lead with the answer, then explain: readers decide in seconds whether to stay.
- Use lists and tables for comparisons, steps, and multi-item information — they scan better than prose.
- Vary sentence length to keep rhythm, but keep the average short.
- Show, don't assert: a concrete example beats a paragraph of adjectives.
- Name the limits of what you know: "this works for X, not for Y" builds more trust than universal claims.
- End sections with a transition or takeaway so the reader always knows where they are.

## Security Considerations

- Never include credentials, API keys, tokens, or private URLs in an article or its examples.
- Do not publish personal data (names, emails, photos) of real people without their consent.
- When quoting or screenshotting third-party material, keep quotes short and link to the original; respect copyright.

## Performance Considerations

- Long articles should be skimmable: headings, short paragraphs, and lists let readers find what they need fast.
- Keep images and embeds lean: compress images and avoid heavy embeds that slow the page.
- One article should answer one question well; splitting an overlong article into a pillar plus supporting pages is better than a single 10,000-word page.

## Common Mistakes

- Burying the answer three sections deep behind throat-clearing.
- Padding with repetition and filler to reach a word count.
- Making claims without sources, or linking to secondary sources when the primary source exists.
- Writing headings that are clever instead of descriptive.
- Ending without a conclusion or next step, leaving the reader unsure what to do.

## Examples

Example opening for a how-to article:

```md
# How to Feed a Sourdough Starter

Feed your starter once a day at room temperature, or once a week in the
fridge, using equal weights of flour and water. This guide shows the exact
ratios, the step-by-step process, and how to tell when your starter is
hungry — so you can keep it alive with five minutes of work a day.
```

Example section structure:

```md
## Feeding ratios explained

A 1:1:1 ratio means equal weights of starter, flour, and water...

### When to use a higher ratio

...
```

## Validation Checklist

- [ ] The introduction states the promise and the reader's takeaway in under 150 words.
- [ ] Headings form a logical outline with one H1 and no orphan H3s.
- [ ] Every non-obvious claim has a source linked to the primary source.
- [ ] No invented statistics, quotes, or case studies appear.
- [ ] Paragraphs are short and each carries one idea.
- [ ] The conclusion summarizes takeaways and gives a next step.
- [ ] The draft passes the `editorial-review` checklist.
- [ ] Accessibility: heading outline valid; alt text present; link text descriptive.

## Expected Deliverables

- A complete article draft in Markdown (or the site's format) with headings, links, and citations.
- A list of sources used, with URLs.
- Notes on any claims that could not be verified, flagged for the reviewer.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- [Google developer documentation style guide](https://developers.google.com/style) — style rules for clear prose.
- Related skills in this repository: `content-brief`, `content-research`, `blog-writing`, `editorial-review`, `fact-checking`.
