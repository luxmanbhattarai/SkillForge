---
name: content-repurposing
description: >
  Turn one strong piece of content into many formats: articles into social
  posts, videos, newsletters, infographics, and presentations without
  rewriting from scratch. Use when you have a good article, video, or report
  and want to reach more audiences by adapting it to new formats and
  channels. Trigger keywords: repurpose content, content repurposing,
  adapt content, article to video, content formats, multi-format content,
  distribute content.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Content Repurposing

## Purpose

This skill multiplies the return on content that already works. One strong
article contains a dozen social posts, a newsletter, a short video script,
and a presentation — but only if each format is adapted to its channel
rather than copied verbatim. This skill shows how to break a source piece
into its best ideas and rebuild each one for the format and audience it
will serve.

## When to Use

- Adapting a strong article into social posts, a newsletter, or a video script.
- Turning a webinar, talk, or podcast into written content.
- Creating a presentation, infographic, or checklist from a guide.
- Extending the life of evergreen content by publishing it in new formats.

## When Not to Use

- Translating content into another language — use `content-localization` instead.
- Updating the source piece itself — use `content-refresh` instead.
- Writing the original piece — use `article-writing` or `blog-writing` first.
- Creating a short summary only — a summary is one output, not repurposing.

## Prerequisites

- The source content, published and performing (repurposing weak content multiplies weak content).
- The target formats and channels, and who the audience is on each.
- The key ideas, data, and quotes in the source that are worth carrying over.
- Brand and voice rules for each channel, if they differ.
- Conceptual skill; version range: none — no versioned tool, package, or platform dependency.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality, which applies to every format.
- [U.S. Copyright Office](https://www.copyright.gov/) — rules on reusing quoted and third-party material.
- [Creative Commons](https://creativecommons.org/) — licenses for sharing and adapting content.

## Required Workflow

1. Choose the source: pick a piece that performed well (traffic, engagement, conversions) and is still accurate. Verify its facts are current before repurposing.
2. Break the source into its core ideas: list the 3-7 ideas, steps, or findings that carry the piece.
3. Map each idea to formats: which ideas work as a social post, a short video, a newsletter section, a checklist, or a slide?
4. Choose the target channels and their constraints: character limits, video length, image sizes, and audience expectations.
5. Adapt each piece for its format: rewrite the hook and structure for the channel, keep the facts and quotes intact, and add a call to action that fits the channel.
6. Link back to the source where the channel allows it, so interested readers can go deeper.
7. Check each adapted piece against the source for accuracy: facts, numbers, and quotes must match.
8. Publish on a schedule that spreads the pieces out, rather than posting everything at once.
9. Track which formats perform best, and use that to choose the next source piece to repurpose.

## Implementation Standards

- Every repurposed piece is adapted, not copied: the hook, structure, and length fit the target format and channel.
- Facts, numbers, and quotes in repurposed pieces match the source exactly. If the source is updated, the repurposed pieces are updated or removed.
- Each repurposed piece stands alone: a reader who never sees the source still gets value from it.
- Each repurposed piece has one call to action appropriate to its channel.
- Attribution is preserved: quotes and data keep their source, and third-party material is only reused within its license.
- The source piece is linked from repurposed pieces where the channel allows links.
- No piece is published on a channel whose audience would not care about it; repurposing is not spam.

### Accessibility

- Every target format carries its own accessibility: video gets
  captions and a transcript, audio gets a transcript, images get alt
  text.
- Repurposed charts and infographics include the underlying data as
  text or a table.
- Social posts do not rely on text baked into images; the post text
  carries the message.
- Links in repurposed content describe their destination in each
  format context.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Start with the best-performing source pieces; repurposing is leverage, and leverage works best on strength.
- Lead with the strongest idea in each format, not the source's introduction — channels reward hooks.
- Batch production: create all the pieces from one source in one session while the material is fresh.
- Keep a repurposing log: source, formats produced, channels, publish dates, and results.
- Refresh the source first if it is outdated; repurposing stale content spreads stale facts.

## Security Considerations

- Do not include credentials, private data, or internal links in repurposed pieces.
- When repurposing content that includes other people's quotes or images, confirm the license allows the new format and channel.
- Treat unpublished or embargoed source material as confidential until its release date.

## Performance Considerations

- Repurposing is cheaper than creating from scratch, but each format still needs real adaptation time — budget 15-30 minutes per short-form piece.
- Batch by source: one research and fact-check pass serves all formats from that source.
- Measure per format: a format that never performs should be dropped, not kept out of habit.

## Common Mistakes

- Copying the article verbatim into a social post or video script, ignoring the channel's format.
- Repurposing outdated content and spreading stale facts to new channels.
- Producing ten pieces from a weak source instead of three from a strong one.
- Forgetting the call to action, so the repurposed piece entertains but converts nothing.
- Reusing third-party images or quotes in a new format without checking the license.

## Examples

Example repurposing map for one article:

```text
Source: "How to Feed a Sourdough Starter" (article)

- Social post 1: the 1:1:1 ratio, explained in one paragraph
- Social post 2: "3 signs your starter is hungry" (list)
- Newsletter: the full feeding schedule, with a link to the article
- Short video script: the step-by-step feeding, 60 seconds
- Checklist: "Weekly starter care" (printable, one page)
- Slide deck: the troubleshooting section, for a baking workshop
```

Example adapted social post:

```text
Your starter is hungry if:
1. It smells like nail polish remover
2. There's dark liquid (hooch) on top
3. It hasn't risen since the last feeding

Feed it 1:1:1 (starter : flour : water) and it will recover in a day.
Full guide: [link to article]
```

## Validation Checklist

- [ ] The source piece is strong, current, and fact-checked.
- [ ] Core ideas are listed and mapped to formats.
- [ ] Each piece is adapted to its format and channel, not copied verbatim.
- [ ] Facts, numbers, and quotes match the source.
- [ ] Each piece stands alone and has one call to action.
- [ ] Attribution and licenses are respected for third-party material.
- [ ] The source is linked where the channel allows it.
- [ ] Publish dates are spread out, not all at once.
- [ ] Accessibility: each format carries its alternative (captions, transcript, alt text).

## Expected Deliverables

- The repurposed pieces, ready to publish in each target format.
- A repurposing map: source, ideas, formats, channels, and publish dates.
- A repurposing log entry for tracking results.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [Creative Commons](https://creativecommons.org/) — licenses for sharing and adapting content.
- Related skills in this repository: `article-writing`, `blog-writing`, `content-refresh`, `content-localization`.
