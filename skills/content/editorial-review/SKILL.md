---
name: editorial-review
description: >
  Review a finished draft before publishing with a structured 10-point
  editorial checklist: accuracy, search intent, supported claims, trustworthy
  references, logical headings, originality, usefulness, relevant internal
  links, correct metadata, and publish-readiness. Use when a draft is done
  and needs a final quality gate before it goes live. Trigger keywords:
  editorial review, review draft, pre-publish review, quality check,
  editor review, publish checklist, content review.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Editorial Review

## Purpose

This skill is the final quality gate between a finished draft and a
published page. It applies a structured 10-point checklist covering
accuracy, intent, evidence, structure, originality, usefulness, links,
metadata, and readiness — and produces a clear verdict: publish, publish
with fixes, or send back for revision. Nothing ships until it passes.

## When to Use

- Reviewing any article, blog post, guide, or page before publishing.
- Doing a final quality check on a draft that has already been fact-checked and edited.
- Auditing a published page against editorial standards.
- Training new writers or reviewers on what "good" looks like.

## When Not to Use

- Checking facts in isolation — use `fact-checking` instead (this skill assumes fact-checking has happened or triggers it).
- Editing for voice and style — use `human-editing` instead.
- Writing the draft — use `article-writing`, `blog-writing`, or `seo-content-writing` instead.
- Planning what to write — use `content-strategy` or `content-brief` instead.

## Prerequisites

- The finished draft, with its title, metadata, and links.
- The brief or outline the draft was written against, so the review can check it against the assignment.
- The target keyword and intent, when the piece is meant to rank.
- Access to the sources the draft cites, so references can be checked.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality, including self-assessment questions.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines for readability checks.

## Required Workflow

1. Read the brief first, then the draft, checking whether the draft delivers what the brief asked for.
2. Run the 10-point editorial checklist (see Implementation Standards), scoring each point as pass, fix, or fail, with a note for anything that is not a pass.
3. Check every link: it must resolve, point to the source it claims to point to, and support the claim it is attached to.
4. Check the metadata: title under 60 characters, meta description under 160 characters, one H1, and correct publication information.
5. Check the structure: headings form a logical outline, the query is answered early, and the piece has a conclusion or next step.
6. Check originality: the piece adds something beyond what already ranks — an original angle, example, or insight — and contains no copied text.
7. If any factual claim is in doubt, send the draft to `fact-checking` before giving a verdict.
8. Write the review report: the checklist scores, the fixes required, and the verdict (publish, publish with fixes, or revise).
9. After fixes are applied, re-check only the points that failed or needed fixes, and confirm the verdict.
10. Record the review: date, reviewer, verdict, and any issues deferred to a future update.

## Implementation Standards

The 10-point editorial checklist. Every point must be scored on every review:

1. **Accuracy** — Every factual claim is correct, current, and consistent with the cited sources. Dates, numbers, and names are right.
2. **Search intent** — The piece matches the intent of its target keyword or query, and the page type fits that intent.
3. **Supported claims** — Every non-obvious claim is backed by evidence: a cited source, a worked example, or first-hand experience. No unsupported assertions.
4. **Trustworthy references** — References are real, resolve, and point to primary or authoritative sources. No broken links, no sources that do not support the claim.
5. **Logical headings** — Headings form a clear outline in a sensible order, with one H1 and no orphan H3s. A reader scanning the headings understands the piece.
6. **Originality** — The piece adds value beyond existing content: an original angle, example, data point, or insight. No copied text, no reworded competitor content.
7. **Usefulness** — The piece helps the reader do something or understand something better. It answers the question it promises to answer, completely.
8. **Relevant internal links** — Internal links point to genuinely relevant pages with descriptive anchor text, including the pillar page and siblings where applicable.
9. **Correct metadata** — Title under 60 characters, meta description under 160 characters, correct author and dates, and accurate structured data where used.
10. **Publish-readiness** — The draft is complete, proofread, and formatted correctly, with no leftover notes, broken markup, or missing images.

Verdict rules:

- **Publish**: all 10 points pass.
- **Publish with fixes**: points 1-4 (accuracy, intent, claims, references) all pass, and the remaining fixes are minor (metadata, links, formatting).
- **Revise**: any of points 1-4 fails, or three or more points need fixes.

### Accessibility

- Put accessibility requirements in the brief, the review checklist,
  and the program standards: alt text, heading structure, link text,
  plain language.
- Every workflow stage owns a check: drafting (structure), editing
  (plain language), publishing (alt text, links, tables).
- Templates carry the requirements so they do not depend on memory.
- Audit published content periodically: missing alt text, skipped
  heading levels, and "click here" links regress silently.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Review against the brief, not against personal taste: a draft that meets the brief and the checklist passes, even if the reviewer would have written it differently.
- Be specific in feedback: name the sentence, the claim, or the heading that fails, and say what would fix it.
- Review in one focused pass, not in fragments: context matters, and a checklist scored across interruptions misses connections.
- Keep a review log: recurring failures across drafts reveal a process problem (a weak brief, missing research) that one review cannot fix.
- Praise what works: a review that only lists faults teaches the writer nothing about what to repeat.

## Security Considerations

- Do not approve a draft that includes credentials, API keys, private data, or internal URLs.
- Check that any personal data in the draft (names, photos, quotes) has consent behind it.
- Verify that third-party material (quotes, images) is used within its license and attributed.

## Performance Considerations

- A thorough editorial review takes 20-45 minutes for a typical article; budget for it in the publishing schedule.
- Review the final draft, not an early version: reviewing a draft that will change wastes the review.
- Batch reviews by cluster so related pieces are checked for consistency (links, terminology, claims) in one pass.

## Common Mistakes

- Skimming the draft and scoring the checklist from memory instead of checking each point.
- Approving a draft with a failing accuracy or references score because the deadline is near.
- Giving vague feedback ("make it better") instead of naming the failing point and the fix.
- Reviewing the body but skipping the title, metadata, and links.
- Treating the checklist as a formality: scoring everything "pass" without reading.

## Examples

Example review report:

```md
## Editorial review — "How to Feed a Sourdough Starter"

Reviewer: J. Park · Date: 2026-11-20 · Brief: content-brief 2026-11-14

| # | Check | Result | Note |
|---|-------|--------|------|
| 1 | Accuracy | Pass | All claims verified (see fact-check report) |
| 2 | Search intent | Pass | How-to guide matches informational intent |
| 3 | Supported claims | Pass | Ratios and schedules cited |
| 4 | Trustworthy references | Fix | One link points to a moved page; update URL |
| 5 | Logical headings | Pass | Outline is clear and ordered |
| 6 | Originality | Pass | Original feeding-schedule table |
| 7 | Usefulness | Pass | Answers the question completely |
| 8 | Relevant internal links | Fix | Add link to pillar "Sourdough starter guide" |
| 9 | Correct metadata | Pass | Title 54 chars, meta 148 chars |
| 10 | Publish-readiness | Pass | Proofread, images in place |

Verdict: Publish with fixes (points 4 and 8).
```

## Validation Checklist

- [ ] The draft was reviewed against its brief.
- [ ] All 10 checklist points were scored with notes.
- [ ] Every link was checked: resolves, correct target, supports its claim.
- [ ] Metadata was checked: title, meta description, H1, author, dates.
- [ ] Originality was checked: no copied text, an original angle present.
- [ ] Any doubtful factual claim was sent to `fact-checking`.
- [ ] The review report states the verdict and the required fixes.
- [ ] Fixes were applied and re-checked before publishing.
- [ ] The review is recorded with date, reviewer, and verdict.
- [ ] Accessibility: brief/checklist/standards include alt text, headings, link text, plain language.

## Expected Deliverables

- An editorial review report with the 10-point checklist scores and a verdict.
- A list of required fixes, specific enough to apply without further discussion.
- A review log entry (date, reviewer, verdict).

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance and self-assessment questions.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- Related skills in this repository: `fact-checking`, `human-editing`, `article-writing`, `seo-content-writing`, `content-brief`.
