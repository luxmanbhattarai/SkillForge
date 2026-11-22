---
name: content-refresh
description: >
  Update and improve existing content: fix outdated facts, strengthen weak
  sections, add new coverage, and re-optimize for current search intent.
  Use when a published page is outdated, underperforming, or losing traffic
  and needs updating instead of rewriting from scratch. Trigger keywords:
  content refresh, update content, refresh article, update old post,
  content update, improve existing content, content audit update.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Content Refresh

## Purpose

This skill brings published content back to life: it identifies what is
outdated, thin, or misaligned with current intent, and updates it in place
so the page keeps its history, links, and ranking while becoming accurate
and useful again. Refreshing is usually cheaper and safer than rewriting,
because the page's existing authority is preserved.

## When to Use

- A published page has outdated facts, broken links, or old statistics.
- A page's traffic or rankings have declined and the content is the likely cause.
- Search intent for the page's keyword has shifted since it was written.
- A page is thin compared with what now ranks for its keyword.
- Doing a scheduled quarterly review of evergreen content.

## When Not to Use

- Creating a new page for a new keyword — use `keyword-to-content` and `article-writing` instead.
- A page so wrong or off-topic that no update can save it — rewrite it with `article-writing` or retire it.
- Fixing facts only, with no structural changes — use `fact-checking` instead.
- Planning which pages to refresh — use `content-strategy` instead.

## Prerequisites

- The URL and current content of the page to refresh.
- The page's target keyword and intent, or a way to determine them.
- Access to analytics or Search Console data showing how the page performs (helpful, not required).
- Current sources for the facts the page states.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on content quality.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Search Console Help](https://support.google.com/webmasters/) — how to check a page's performance and indexing.

## Required Workflow

1. Read the current page in full and note what is outdated, thin, wrong, or missing.
2. Check the page's target keyword and current search intent; read the top-ranking pages to see what the page must now cover.
3. Decide the refresh scope: light (facts, dates, links), medium (new sections, restructured headings), or heavy (substantial rewrite in place).
4. Update outdated facts with current, sourced information. Remove claims that can no longer be verified.
5. Add missing coverage: subtopics the top results cover that this page does not, plus any new developments since publication.
6. Strengthen weak sections: expand thin paragraphs, add examples or tables, and replace vague claims with specifics.
7. Fix the structure: headings that reflect the current outline, a direct answer near the top, and internal links to newer related pages.
8. Update the title and meta description if the intent or the page's coverage has changed.
9. Check every link on the page and replace broken or outdated ones.
10. Update the last-updated date to the refresh date, run `fact-checking` and `editorial-review`, and record what changed in a short changelog note.

## Implementation Standards

- The URL does not change during a refresh. Changing a URL requires a redirect and loses the page's history.
- The last-updated date changes only when the content actually changes. A cosmetic edit does not justify a new date.
- Every updated fact is sourced to a current primary source.
- Removed content is removed deliberately: if a section is cut, the reason is recorded in the changelog note.
- The refreshed page must still match its original intent unless the refresh explicitly re-targets it — in which case the title, headings, and metadata change together.
- Internal links are updated to point to current pages; links to retired pages are removed or retargeted.
- The refresh preserves what works: sections that are accurate and performing stay untouched.

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

- Refresh the pages that matter most first: high-traffic pages, pages that drive conversions, and pages whose facts go stale fastest.
- Keep a refresh log per page: date, scope, and what changed. It prevents re-doing the same work and shows what the update achieved.
- Compare before and after: note the page's traffic and ranking before the refresh so the effect can be judged.
- Refresh in clusters: when one page in a cluster is updated, check whether its siblings need the same update.
- Do not refresh for its own sake: a page that is accurate, complete, and performing does not need a new date.

## Security Considerations

- Do not introduce credentials, private data, or internal links while updating examples.
- When updating a page that embeds third-party content, verify the embed source is still trustworthy.
- Keep the changelog note internal if it contains performance data the team does not publish.

## Performance Considerations

- A light refresh should take under an hour; a heavy refresh is a writing task and should be scheduled like one.
- Batch refreshes by cluster so related pages are updated consistently and internal links stay coherent.
- After a significant refresh, check that the page is still indexed and rendering correctly.

## Common Mistakes

- Changing the last-updated date without changing the content.
- Rewriting a performing page from scratch and losing what made it work.
- Updating facts but leaving the structure and headings stuck in the old intent.
- Refreshing the body but forgetting the title, meta description, and internal links.
- Treating a refresh as a one-time fix instead of a recurring habit.

## Examples

Example refresh changelog note:

```md
## Refresh log — /sourdough-starter-guide/

- 2026-11-20 (medium): Updated feeding ratios section with current guidance
  from King Arthur Baking; added "Troubleshooting" H2; replaced 3 broken
  links; updated title and meta description. No URL change.
- 2026-08-10 (light): Updated statistics and fixed 2 links.
```

Example refresh decision:

```text
Page: /how-to-feed-a-sourdough-starter/
Traffic: declining for 3 months (Search Console)
Cause: top results now include video and a feeding calculator; page has
neither, and two sections cite 2021 guidance.
Scope: medium — update facts, add troubleshooting H2, add internal links
to the new feeding-schedule page, update meta description.
```

## Validation Checklist

- [ ] Outdated facts are updated with current, sourced information.
- [ ] Missing subtopics from the current top results are covered.
- [ ] Headings, title, and meta description match current intent.
- [ ] All links resolve and point to current sources.
- [ ] The last-updated date reflects the actual refresh.
- [ ] The URL is unchanged.
- [ ] The refresh is recorded in the changelog note.
- [ ] `fact-checking` and `editorial-review` have passed.
- [ ] Accessibility: heading outline valid; alt text present; link text descriptive.

## Expected Deliverables

- The refreshed page, updated in place.
- A changelog note recording what changed and why.
- A before-and-after note on the page's performance, where data is available.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's quality guidance.
- [Search Console Help](https://support.google.com/webmasters/) — performance and indexing checks.
- Related skills in this repository: `content-strategy`, `fact-checking`, `editorial-review`, `seo-content-writing`.
