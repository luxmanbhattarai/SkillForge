---
name: editorial-workflow
description: >
  Run a piece of content end to end through the editorial pipeline:
  ideation, brief, draft, review, edit, approval, publish, and update,
  with named roles, approval gates, and an editorial calendar. Use when
  setting up or running a publishing process, assigning editorial work,
  or deciding what happens to a draft next. Trigger keywords: editorial
  workflow, publishing pipeline, editorial calendar, content workflow,
  approval gate, editorial process, content production, publish process.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Editorial Workflow

## Purpose

This skill runs content through the full editorial pipeline, from idea to
published page and later update, with a named owner at every stage and a
human approval gate before anything goes live. It is the process skill
that connects the craft skills: it decides what happens next, who decides
it, and what "done" means at each step, so no draft stalls, ships
unreviewed, or gets published twice by accident.

## When to Use

- Setting up a publishing process for a blog, docs site, or content program.
- Taking a piece from idea to published page and tracking its stage.
- Assigning roles (writer, editor, reviewer, publisher) to a piece.
- Planning what to publish and when, with an editorial calendar.
- Deciding whether a draft is ready to publish or needs another round.
- Scheduling updates to published content.

## When Not to Use

- Reviewing a single finished draft — use `editorial-review` instead
  (this skill calls it as one stage of the pipeline).
- Checking facts in a draft — use `fact-checking` instead.
- Writing the brief for one piece — use `content-brief` instead.
- Editing for voice and style — use `human-editing` instead.
- Planning the overall content program — use `content-strategy` instead.
- Refreshing an old published page — use `content-refresh` instead.

## Prerequisites

- The piece's topic, goal, and target audience (or the decision to
  define them at the ideation stage).
- A named owner for the piece and access to the people who fill the
  roles below (one person may fill several roles, but the approver must
  not be the writer).
- A publishing destination (CMS, site, or docs repo) and the ability
  to schedule or publish there.
- The team's quality bar: which checks are mandatory before publish.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on what published content must do; the standard the pipeline enforces.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines the edit stage applies.

## Required Workflow

1. **Ideation.** Capture the idea with its audience, goal, and why now.
   Check it against `content-strategy` (does it fit a cluster?) and
   against existing pages (does it duplicate one?). Reject or defer
   ideas that fail either check.
2. **Brief.** Write the brief with `content-brief`: goal, audience,
   intent, outline, sources, tone, length, acceptance criteria,
   deadline, owner, reviewer. The brief is approved before drafting
   starts — approval gate 1.
3. **Draft.** The writer produces the draft against the brief. The
   writer self-checks it against the brief's acceptance criteria
   before handing it over; a draft that ignores the brief goes back
   without a review.
4. **Source verification and fact-checking.** Verify the draft's
   sources with `source-verification`, then check its claims with
   `fact-checking`. Both reports are attached to the draft.
5. **Editorial review.** Review the draft with `editorial-review`
   and record the verdict: publish, publish with fixes, or revise.
   A "revise" verdict returns the draft to step 3 with specific fixes.
6. **Edit.** Apply the fixes, then edit for voice, flow, and
   readability with `human-editing`. Re-check only the points that
   failed or needed fixes.
7. **Approval.** A human editor (not the writer) gives the final
   sign-off. This gate is mandatory: no piece publishes without a
   named human approver and a recorded approval date. AI-assisted
   drafts get the same gate as human drafts.
8. **Publish.** Publish on the calendar date, with correct metadata,
   images, and internal links. Verify the live page renders correctly
   and its link preview is right (`social-preview`).
9. **Update.** Record the publish date and a review date. When the
   review date arrives, or when the facts change, send the page to
   `content-refresh`.

## Implementation Standards

- Every piece has one owner, one writer, one reviewer, and one
  approver, named before drafting starts. The approver is never the
  writer.
- Every stage has a defined exit condition: a brief is done when it
  is complete and approved; a draft is done when it passes
  `editorial-review`; a piece is done when a human approves it.
- The pipeline stages are, in order: ideation, brief, draft,
  source verification, fact-checking, editorial review, edit,
  approval, publish, update. A piece may skip a stage only with the
  approver's explicit agreement, recorded in the piece's log.
- Human editorial approval is mandatory before publishing. No
  automation, AI draft, or deadline pressure removes this gate.
- Every piece keeps a log: stage, date, person, and decision at each
  step, plus the review verdict and the approval. The log is how the
  team learns where pieces stall.
- The editorial calendar lists every planned piece with its owner,
  stage, and dates (brief due, draft due, publish date). One calendar
  for the whole program; no side lists.
- Deadlines are set at the brief stage and changed only by the owner,
  with the new date recorded. A missed deadline moves the publish
  date; it never skips a quality gate.

## Best Practices

- Work in clusters: brief, draft, and review related pieces together
  so links, terminology, and claims stay consistent across the cluster.
- Keep the pipeline visible: a simple board (idea, briefed, drafting,
  in review, approved, published) beats a spreadsheet nobody opens.
- Limit work in progress: a writer with three drafts in flight
  finishes none of them. One draft in review at a time per writer.
- Review the calendar weekly: move dates early when a piece slips,
  and kill ideas that have sat in ideation for a month.
- Batch the boring steps: schedule several pieces' publish checks
  (metadata, previews, links) in one session.
- After publishing, watch the first week: broken links, wrong
  previews, and reader corrections surface fast and are cheap to fix.

## Security Considerations

- Do not publish drafts, internal notes, or embargoed material:
  keep staging and preview URLs unlisted and out of search indexes.
- Briefs and drafts shared with external writers must not contain
  credentials, internal URLs, or private data.
- Confirm consent for any personal data in a piece (names, photos,
  quotes) before the approval gate, not after publishing.
- Third-party material (quotes, images) must be used within its
  license and attributed; check this at the edit stage.

## Performance Considerations

- A typical article takes 3-10 working days from brief to publish
  across the pipeline; budget for review and approval time, not just
  writing time.
- The most common bottleneck is review: protect reviewer time and
  keep the review queue short, or drafts pile up.
- Reuse briefs and checklists for recurring formats so the pipeline
  starts fast instead of re-deciding the process each time.

## Common Mistakes

- Skipping the brief and drafting from a topic line — the draft
  comes back wrong and the review becomes a rewrite.
- Letting the writer approve their own work — the approval gate
  exists because writers cannot see their own blind spots.
- Publishing on the calendar date with a failing review — move the
  date instead; a late good piece beats an on-time bad one.
- Treating "publish" as the end — a published page with no review
  date quietly goes stale.
- Running the pipeline in chat threads instead of a shared calendar
  and log — stages get lost and nobody knows what is where.

## Examples

Example pipeline log for one piece:

```md
## "How to Feed a Sourdough Starter" — pipeline log

- 2026-11-14 Ideation: A. Reyes. Fits sourdough cluster; no duplicate.
- 2026-11-14 Brief: approved by J. Park (gate 1).
- 2026-11-18 Draft: delivered by A. Reyes, self-checked vs brief.
- 2026-11-19 Sources verified (source-verification); claims checked
  (fact-checking) — 1 correction applied.
- 2026-11-19 Editorial review: publish with fixes (2 link fixes).
- 2026-11-20 Edit: fixes applied, re-checked. Approved by J. Park.
- 2026-11-20 Published. Review date: 2027-02-20.
```

Example editorial calendar row:

```md
| Piece | Owner | Stage | Brief due | Draft due | Publish |
|---|---|---|---|---|---|
| Feed a sourdough starter | A. Reyes | Published | 2026-11-14 | 2026-11-18 | 2026-11-20 |
| Sourdough starter smell | A. Reyes | In review | 2026-11-18 | 2026-11-24 | 2026-11-27 |
```

## Validation Checklist

- [ ] The piece has a named owner, writer, reviewer, and approver.
- [ ] The brief was approved before drafting started.
- [ ] Sources were verified and claims fact-checked, with reports attached.
- [ ] The draft passed `editorial-review` (publish or publish with fixes).
- [ ] A human approver signed off, and the approval is recorded.
- [ ] The live page was checked after publishing (render, metadata, preview).
- [ ] A review date is recorded for the published page.
- [ ] The pipeline log records every stage, date, and decision.

## Expected Deliverables

- A pipeline log for the piece, recording each stage and decision.
- The editorial calendar entry, kept current through publishing.
- The approval record: approver name and date.
- The published page, with a scheduled review date.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- Related skills in this repository: `content-brief`,
  `content-strategy`, `source-verification`, `fact-checking`,
  `editorial-review`, `human-editing`, `content-refresh`,
  `social-preview`.
