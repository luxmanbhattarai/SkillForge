---
name: content-brief
description: >
  Write a complete content brief that a writer or agent can execute without
  follow-up questions: audience, intent, outline, sources, tone, length, and
  acceptance criteria. Use when commissioning an article, blog post, or page
  and you need the assignment fully specified first. Trigger keywords:
  content brief, writing brief, article brief, creative brief, brief template,
  commission content.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Content Brief

## Purpose

This skill turns a topic into a complete assignment: everything a writer or
agent needs to produce the right piece on the first draft. A good brief
removes ambiguity about audience, angle, structure, sources, and success
criteria, so the draft comes back close to publishable instead of close to
the wrong thing.

## When to Use

- Commissioning an article, blog post, or landing page from a writer or agent.
- Handing off a topic from a strategist to a writer.
- Defining the scope of a piece before drafting begins.
- Aligning a team on what a piece should and should not cover.
- Generating briefs at scale from keyword lists and SERP data — see
  the brief-automation section below.

## When Not to Use

- Writing the piece itself — use `article-writing`, `blog-writing`, or `seo-content-writing` instead.
- Planning a whole content program — use `content-strategy` instead.
- Researching facts for a draft — use `content-research` instead.
- Reviewing a finished draft — use `editorial-review` instead.

## Prerequisites

- The topic and the reason the piece exists (business goal or audience need).
- The target audience, or enough information to define it.
- The target keyword and intent, when the piece is meant to rank.
- Any sources, data, or subject-matter experts the writer should use.
- Deadline and target length, or the freedom to propose them.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on what good content must do.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines to reference in the brief's tone section.

## Required Workflow

1. Write the one-sentence goal: what the piece must achieve for the reader and for the site.
2. Define the audience: who they are, what they already know, and what they need from this piece.
3. State the search intent and target keyword, when applicable, and the page type.
4. Draft the outline: H1, H2s in logical order, and the key points each section must cover.
5. List the sources the writer must consult, with URLs, and name any claims that need verification.
6. Specify tone and voice (formal, conversational, expert), the point of view, and any style rules.
7. Specify length as a range, plus the format (article, list, how-to, comparison) and any required elements (images, tables, FAQ, call to action).
8. List internal links the piece must include and the pages it must not duplicate.
9. State the acceptance criteria: what "done" looks like, including the `editorial-review` checklist.
10. Add the deadline, the owner, and the reviewer, then hand the brief to the writer.

## Implementation Standards

- Every brief contains: goal, audience, intent, outline, sources, tone, length, format, internal links, acceptance criteria, deadline, owner, and reviewer. A brief missing any of these is incomplete.
- The outline must be specific: each H2 lists the 2-4 points it must cover, not just a heading.
- Sources must be real URLs to primary sources where possible. Never list a source you have not checked.
- Acceptance criteria must be checkable ("covers all five H2 points", "every claim cited"), not vague ("high quality").
- Length is a range with a reason (e.g. "1,200-1,800 words: the topic needs full coverage but not a reference manual").
- The brief must state what the piece should NOT cover, to prevent scope creep.
- Never promise rankings or traffic in the brief.

### Brief automation

Briefs can be generated programmatically from keyword lists and SERP
data, but a generated brief is a draft brief, not an approved one —
it goes through the same human approval as a hand-written brief
before any writer sees it.

- **Schema first.** Define the brief as a structured record (JSON or
  YAML) with the same required fields as a hand-written brief: goal,
  audience, intent, outline, sources, tone, length, format, internal
  links, acceptance criteria, deadline, owner, reviewer. A generator
  that cannot fill a field leaves it empty and flags it; it never
  invents a value.
- **SERP-derived fields.** Derive the outline, the length range, and
  the "must cover" points from the SERP for the target keyword (see
  `serp-analysis`): the headings of the top-ranking pages, the
  questions people ask, and the depth the ranking pages reach. Record
  which SERP snapshot the brief was derived from and its date, so a
  stale brief can be spotted.
- **Programmatic pipelines.** A brief pipeline runs: keyword list in
  (see `keyword-research`, `keyword-clustering`) → SERP fetch →
  outline synthesis → schema validation (every required field
  present, sources reachable) → human review and approval → brief
  out. The pipeline stops at the human gate; it never commissions a
  draft on its own.
- **Source handling.** Generated briefs list sources the generator
  actually fetched and checked. A source the generator could not
  open is listed as unchecked, never as verified.
- **Batch with care.** Generate briefs in small batches and review
  the first batch closely before scaling: a systematic generator
  error repeated across fifty briefs is worse than fifty slow
  hand-written ones.

## Best Practices

- Write the brief from the reader's perspective: what question brings them here, and what will they do after reading?
- Include one or two example pieces the writer can use as a model for tone or structure.
- Keep the brief to one page where possible; a brief longer than the article is a sign the topic is too broad.
- Share the brief with the reviewer before drafting starts, so acceptance criteria are agreed in advance.
- Reuse a brief template across the team so writers always know where to find each element.
- When automating, review the first batch of generated briefs
  closely before scaling: fix the generator, not each brief, when a
  pattern is wrong.
- Keep generated briefs in version control alongside hand-written
  ones, so a bad batch can be rolled back and the generator's output
  can be audited.

## Security Considerations

- Do not include credentials, internal URLs, or private data in a brief shared with external writers.
- Share only the sources and context the writer needs; keep strategy documents and performance data internal.

## Performance Considerations

- A complete brief takes 15-30 minutes to write and saves hours of revision — it is the cheapest quality control in the content process.
- Reuse briefs for recurring formats (weekly posts, product updates) by keeping a template with the stable fields pre-filled.

## Common Mistakes

- Writing a brief that is only a topic and a word count, leaving everything else to guesswork.
- Listing sources without checking them, so the writer builds on broken or wrong links.
- Forgetting acceptance criteria, so "done" is decided by argument after the draft arrives.
- Letting the outline grow until the piece tries to cover three topics.
- Skipping the "do not cover" section, so the draft drifts into other pages' territory.

## Examples

Example brief (short form):

```md
# Brief: How to Feed a Sourdough Starter

Goal: Teach a first-time baker to keep a starter alive with five minutes a day.
Audience: Home bakers who just got or made their first starter.
Intent: Informational (how-to). Keyword: how to feed a sourdough starter.
Format: How-to guide, 1,200-1,800 words.
Tone: Warm, practical, second person.

Outline:
- H1: How to Feed a Sourdough Starter
- H2: What you need (flour, water, jar, scale)
- H2: Feeding ratios explained (1:1:1, when to change it)
- H2: Step-by-step feeding
- H2: How often to feed (counter vs. fridge)
- H2: Troubleshooting (smell, hooch, no rise)

Sources:
- https://www.kingarthurbaking.com/ (check the site's sourdough guide)

Do not cover: baking with the starter (separate article).
Internal links: pillar "Sourdough starter guide".
Acceptance: all H2 points covered, every claim sourced, passes editorial-review.
Deadline: 2026-12-14. Owner: A. Reyes. Reviewer: J. Park.
```

Example brief as a structured record (for automation pipelines):

```json
{
  "topic": "How to Feed a Sourdough Starter",
  "goal": "Teach a first-time baker to keep a starter alive with five minutes a day.",
  "audience": "Home bakers who just got or made their first starter.",
  "intent": "informational",
  "keyword": "how to feed a sourdough starter",
  "format": "how-to guide",
  "length": { "min": 1200, "max": 1800 },
  "tone": "warm, practical, second person",
  "outline": [
    { "h2": "What you need", "points": ["flour", "water", "jar", "scale"] },
    { "h2": "Feeding ratios explained", "points": ["1:1:1", "when to change it"] },
    { "h2": "Step-by-step feeding", "points": ["discard", "add flour and water", "stir"] },
    { "h2": "How often to feed", "points": ["counter", "fridge"] },
    { "h2": "Troubleshooting", "points": ["smell", "hooch", "no rise"] }
  ],
  "sources": [
    { "url": "https://www.kingarthurbaking.com/", "checked": true }
  ],
  "do_not_cover": ["baking with the starter"],
  "internal_links": ["Sourdough starter guide (pillar)"],
  "acceptance": ["all H2 points covered", "every claim sourced", "passes editorial-review"],
  "serp_snapshot": "2026-11-20",
  "deadline": "2026-12-14",
  "owner": "A. Reyes",
  "reviewer": "J. Park",
  "status": "draft — awaiting human approval"
}
```

## Validation Checklist

- [ ] The brief states the goal, audience, intent, and format.
- [ ] The outline lists H2s with the points each must cover.
- [ ] Sources are real, checked URLs to primary sources where possible.
- [ ] Tone, voice, length range, and required elements are specified.
- [ ] Internal links and topics to avoid are listed.
- [ ] Acceptance criteria are checkable.
- [ ] Deadline, owner, and reviewer are named.
- [ ] For generated briefs: every required field is filled or flagged
      empty (never invented), the SERP snapshot date is recorded, and
      a human approved the brief before handoff.

## Expected Deliverables

- A complete content brief document, ready to hand to a writer or agent.
- A reusable brief template, if the team does not already have one.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- Related skills in this repository: `content-strategy`, `keyword-to-content`, `article-writing`, `editorial-review`, `serp-analysis`, `keyword-research`, `keyword-clustering`, `programmatic-seo`.
