---
name: human-editing
description: >
  Edit AI-assisted or rough drafts into natural, human-sounding writing:
  remove robotic phrasing, filler, and repetition, and restore voice,
  rhythm, and specificity. Use when a draft reads like it was written by a
  machine and needs to sound like a person wrote it. Trigger keywords:
  humanize, human editing, edit AI draft, natural writing, remove AI
  phrasing, rewrite robotic text, voice editing.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Human Editing

## Purpose

This skill turns a draft that reads like machine output into writing that
sounds like a person: it cuts filler phrases, breaks up uniform sentence
patterns, replaces vague generalities with specifics, and restores a
consistent voice. The goal is not to hide that a tool helped, but to produce
writing a human reader trusts and enjoys — because it is clear, specific,
and honest.

## When to Use

- Editing an AI-assisted draft that reads robotic, repetitive, or generic.
- Polishing a rough draft for voice, rhythm, and readability.
- Removing filler, clichés, and empty phrases from any draft.
- Making a draft sound like a specific author or brand voice.

## When Not to Use

- Checking facts — use `fact-checking` instead.
- The full pre-publish review — use `editorial-review` instead.
- Writing a new draft from scratch — use `article-writing` or `blog-writing` instead.
- Fixing grammar and spelling only — that is copyediting; this skill covers voice and readability.

## Prerequisites

- The draft to edit.
- The target voice: the author's voice, the brand voice, or a sample of writing to match.
- The audience and purpose, so edits serve the reader, not just style.
- Any facts or claims in the draft that must not be altered in meaning during the edit.
- Conceptual skill; version range: none — no versioned tool, package, or platform dependency.

## Official Documentation

- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines for clear, human writing.
- [Google developer documentation style guide](https://developers.google.com/style) — practical rules for concise, direct prose.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content written for people.

## Required Workflow

1. Read the draft once without editing, noting where it feels robotic, vague, or repetitive.
2. Identify the voice target: read a sample of the author's or brand's writing and note its sentence length, vocabulary, and rhythm.
3. Cut filler: remove empty openers ("In today's world", "It is important to note"), throat-clearing, and sentences that say nothing.
4. Break uniformity: vary sentence length, mix short punchy sentences with longer ones, and break up paragraphs that all look the same.
5. Replace generalities with specifics: swap vague claims for concrete details, examples, and numbers that are real and sourced.
6. Fix the voice: replace stiff, formal phrasing with the target voice, use contractions where the voice allows them, and address the reader directly.
7. Remove repetition: cut repeated ideas, merge paragraphs that make the same point, and vary word choice where the same word appears too often.
8. Check transitions: each paragraph should connect to the next, and the reader should always know why the next section follows.
9. Read the edited draft aloud (or simulate it): any sentence that sounds awkward spoken gets rewritten.
10. Verify that the edit did not change any facts, and hand the draft to `fact-checking` if any claim's wording changed in a way that affects its meaning.

## Implementation Standards

- Every sentence must earn its place: if removing it changes nothing, remove it.
- Sentence length varies: no three consecutive sentences of similar length and structure.
- Filler phrases are removed, not replaced with synonyms: "delve", "leverage", "in conclusion", "it is worth noting", and "moreover" have no place in the final draft.
- Specifics replace generalities: "saves time" becomes a concrete example or a sourced number, or it is cut.
- Voice is consistent from the first paragraph to the last.
- The edit preserves the draft's meaning: facts, claims, and structure stay intact unless the author agrees to a change.
- No new claims are introduced during editing. If an edit needs a fact, it is flagged for `fact-checking`.
- Contractions, direct address, and short sentences are used where the voice allows them.

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

- Edit in passes: one pass for structure, one for sentences, one for voice. Trying to fix everything at once misses things.
- Read the draft backward, paragraph by paragraph, to catch repetition you would otherwise skim past.
- Keep a list of the author's banned phrases (their overused words) and search for them.
- When in doubt, cut: shorter is almost always better, and the reader will not miss what was filler.
- Preserve the author's quirks where they are intentional; the goal is the author's voice, not a generic "good" voice.

## Security Considerations

- Do not introduce personal data, credentials, or private details while rewriting examples or anecdotes.
- Do not fabricate personal experiences or anecdotes to make a draft sound more human — invented stories are worse than robotic prose.
- Treat the draft as confidential until published; do not share it outside the team.

## Performance Considerations

- Human editing is the slowest part of the content process; budget 30-60 minutes per 1,000 words for a thorough pass.
- Edit the final structure, not an early draft: editing a draft that will be restructured wastes the work.
- Batch similar edits: if the same filler phrase appears twenty times, fix the pattern once, then apply it everywhere.

## Common Mistakes

- Replacing one filler phrase with another instead of cutting it.
- Making the draft shorter but blander, removing voice along with the filler.
- Introducing new claims or statistics while rewriting a sentence.
- Editing for style while ignoring structure — a well-written paragraph in the wrong place is still wrong.
- Over-editing until the author's voice is gone and the draft sounds like everyone else's.

## Examples

Example edit, before and after:

```md
Before:
"In today's fast-paced digital landscape, it is important to note that
content quality matters more than ever. By leveraging best practices,
organizations can unlock the full potential of their content strategy."

After:
"Readers can tell the difference between content written to help them and
content written to rank. Write the first kind, and the second follows."
```

Example filler checklist to search for:

```text
- "in today's" / "in the modern world"
- "it is important to note" / "it is worth noting"
- "delve" / "leverage" / "unlock" / "landscape"
- "in conclusion" (at the start of a conclusion)
- "moreover" / "furthermore" / "additionally"
```

## Validation Checklist

- [ ] Filler phrases and empty openers are removed.
- [ ] Sentence length and structure vary throughout.
- [ ] Vague generalities are replaced with specifics or cut.
- [ ] The voice is consistent and matches the target sample.
- [ ] No new claims were introduced during editing.
- [ ] Facts and meaning are unchanged from the original draft.
- [ ] The draft reads naturally aloud.
- [ ] Accessibility: heading outline valid; alt text present; link text descriptive.

## Expected Deliverables

- The edited draft, ready for `editorial-review` or publication.
- A short edit summary: what was cut, what was restructured, and any claims flagged for `fact-checking`.

## References

- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- [Google developer documentation style guide](https://developers.google.com/style) — rules for concise prose.
- Related skills in this repository: `article-writing`, `blog-writing`, `editorial-review`, `fact-checking`.
