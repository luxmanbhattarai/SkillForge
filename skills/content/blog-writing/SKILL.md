---
name: blog-writing
description: >
  Write engaging blog posts in a conversational voice: posts that hook the
  reader, hold attention, and end with a clear next step. Use when drafting
  blog posts, opinion pieces, personal stories, or news-style posts for a
  blog. Trigger keywords: blog post, blog writing, write a blog post,
  opinion piece, personal essay, newsletter post.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Blog Writing

## Purpose

This skill produces blog posts that read like a person talking to a reader,
not a report: a strong hook, a clear point of view, short scannable sections,
and an ending that invites the next step. It is built for posts where voice
and engagement matter as much as information — the kind of post a reader
finishes and shares.

## When to Use

- Drafting a blog post from a topic, brief, or outline.
- Writing opinion pieces, personal stories, lessons learned, or commentary.
- Turning a short idea into a full post with a hook, body, and close.
- Writing a post for a company blog that needs personality, not just facts.

## When Not to Use

- Long-form, heavily sourced articles — use `article-writing` instead.
- Content written primarily to rank for a keyword — use `seo-content-writing` instead.
- Developer documentation or API guides — use `technical-writing` instead.
- Sales pages or ad copy — use `copywriting` instead.
- Repurposing an existing post into other formats — use `content-repurposing` instead.

## Prerequisites

- The post's topic and the one point it should make.
- The target reader and the blog's voice (casual, expert, humorous, or a mix).
- Any facts, quotes, or links the post must include.
- The desired length and the call to action, if the post has one.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines for clear writing.
- [Google developer documentation style guide](https://developers.google.com/style) — practical style rules that also suit blog prose.

## Required Workflow

1. State the post's single point in one sentence. If you cannot, the topic is too broad — narrow it.
2. Choose the hook: a surprising fact, a question, a short story, or a bold claim you can back up. The hook is the first two sentences.
3. Outline 3-5 sections that build the point, each with a descriptive heading. Keep the outline short — a blog post is not a report.
4. Draft the opening: hook, then one or two sentences on why the reader should care, then a promise of what the post delivers.
5. Draft the body in the blog's voice: short paragraphs, direct address, concrete examples, and at least one personal observation or original angle.
6. Add subheadings, lists, or bolded takeaways so a skimmer can follow the argument without reading every word.
7. Write the close: restate the point in one sentence, then give the reader one clear next step (comment, share, read a related post, try something).
8. Self-edit: cut the first paragraph if the post still works without it (it usually does), remove filler phrases, and check that the voice is consistent.
9. Add the title, meta description, and internal links to related posts before handing off.

## Implementation Standards

- One H1 per post, under 60 characters when the post is meant to appear in search results.
- The first two sentences must hook the reader; no throat-clearing ("In today's fast-paced world...").
- Paragraphs are 1-3 sentences. Blog readers scan; long blocks get skipped.
- The post makes one point. Side points become separate posts or a single sentence, not a detour.
- Voice is consistent throughout: pick the register in the brief and hold it.
- Claims that are factual (dates, numbers, quotes) must be accurate and sourced; opinions must be clearly framed as opinions.
- No invented anecdotes, fake testimonials, or fabricated personal experiences.
- Every post ends with exactly one primary call to action.

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

- Write the headline last: it is easier to title a finished post than to write to a title.
- Open with something specific — a number, a scene, a quote — not a generality.
- Use "you" generously; blog posts are a conversation, not a lecture.
- Break up long posts with subheadings every 150-250 words.
- Link to your own related posts where they genuinely help the reader, not to inflate link counts.
- Read the post aloud before publishing: if a sentence sounds stiff spoken, rewrite it.

## Security Considerations

- Never include credentials, API keys, or private links in a post or its examples.
- Do not publish personal data about real people without their consent.
- When sharing a personal story involving others, anonymize them or get their permission.

## Performance Considerations

- Keep posts focused: a 600-1,200 word post that makes one point beats a rambling 3,000-word post.
- Compress images and avoid autoplay media that slow the page.
- Publish on a schedule the author can sustain; an irregular blog loses readers faster than a slow one.

## Common Mistakes

- Opening with background instead of the hook.
- Trying to cover three topics in one post.
- Writing in a stiff, corporate voice on a personal blog.
- Ending with a weak close ("Let me know what you think!") instead of a specific next step.
- Publishing without a title and meta description, leaving search results to guess.

## Examples

Example hook and opening:

```md
# I Deleted 200 Blog Posts and Traffic Went Up

Last spring I deleted half my blog. Not the drafts — the published posts,
the ones with years of work in them. Traffic went up anyway, and this post
explains why pruning weak content beats publishing more of it.
```

Example close:

```md
## Try it yourself

Pick your five weakest posts this week. Update the two worth saving and
delete the rest. Then watch what happens to the posts that remain.
```

## Validation Checklist

- [ ] The post makes one clear point, stated in the opening.
- [ ] The first two sentences hook the reader without throat-clearing.
- [ ] Paragraphs are short and the voice is consistent throughout.
- [ ] Factual claims are accurate and sourced; opinions are framed as opinions.
- [ ] The post ends with one clear call to action.
- [ ] Title, meta description, and internal links are in place.
- [ ] The post passes the `editorial-review` checklist.
- [ ] Accessibility: heading outline valid; alt text present; link text descriptive.

## Expected Deliverables

- A complete blog post draft in Markdown (or the site's format).
- Title and meta description.
- Internal links to related posts.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- Related skills in this repository: `article-writing`, `seo-content-writing`, `content-repurposing`, `editorial-review`.
