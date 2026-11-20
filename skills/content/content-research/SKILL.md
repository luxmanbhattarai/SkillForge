---
name: content-research
description: >
  Research a topic thoroughly before writing: gather facts, primary sources,
  expert views, and real examples, and organize them into a research pack a
  writer can trust. Use when starting an article, guide, or report and you
  need verified facts and sources first. Trigger keywords: content research,
  research a topic, gather sources, research pack, source gathering,
  background research.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Content Research

## Purpose

This skill turns a topic into a verified research pack: the facts a writer
needs, each tied to a source the reader can check. It separates solid
evidence from rumor, surfaces the primary source behind every claim, and
flags what could not be verified. Good research is what makes the difference
between an article that informs and one that merely sounds informed.

## When to Use

- Starting research for an article, guide, report, or white paper.
- Verifying the facts behind a topic before drafting.
- Building a source list for a writer who will draft from your research.
- Checking whether a widely repeated claim is actually true.
- Gathering examples, case studies, and expert quotes for a piece.

## When Not to Use

- Writing the article itself — use `article-writing` after research is done.
- Checking facts in a finished draft — use `fact-checking` instead.
- Planning what topics to cover — use `content-strategy` instead.
- Quick, single-fact lookups that need no organized pack.

## Prerequisites

- The topic and the angle or question the research must answer.
- The audience's level, so research matches what they need (beginner vs. expert).
- Access to the web and, where relevant, to academic, government, or industry sources.
- The brief or outline, if one exists, so research covers the planned sections.

## Official Documentation

- [Google Scholar](https://scholar.google.com/) — search for academic papers and citations.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines for writing up findings.
- [Poynter](https://www.poynter.org/) — journalism research, verification, and media literacy resources.
- [U.S. Copyright Office](https://www.copyright.gov/) — rules on fair use of quoted material.

## Required Workflow

1. Write the research question in one sentence: what must this research establish?
2. List the sub-questions the article's outline raises, one per planned section.
3. Search for primary sources first: official documentation, original studies, government data, and the people or organizations directly involved.
4. For each fact, record the claim, the source, the URL, and the date the source was published or last updated.
5. Cross-check important claims against a second independent source. If two sources disagree, record both and flag the conflict.
6. Collect examples, quotes, and data points, noting exactly where each came from and whether it can be quoted publicly.
7. Identify gaps: questions the research could not answer, and claims that remain unverified. Label them clearly.
8. Organize the findings into a research pack grouped by the article's sections, with a source list at the end.
9. Hand the pack to the writer with a short note on the strongest sources and the gaps to avoid building on.

## Implementation Standards

- Every fact in the pack carries a source URL and a publication or update date.
- Primary sources are preferred over secondary ones; a press release about a study is not a substitute for the study.
- Quotes must be exact, with the speaker, context, and source recorded.
- Numbers must include their unit, scope, and date ("as of 2025" is part of the number, not decoration).
- Unverified claims are labeled "unverified" and kept out of the draft until confirmed.
- No invented facts, statistics, or quotes. If a fact cannot be found, the pack says so.
- Sources must be accessible: a source behind a paywall or a dead link is noted as such, with an accessible alternative where one exists.
- Research packs are dated, so a writer reusing one months later knows how fresh it is.

## Best Practices

- Start with the most authoritative sources (official docs, peer-reviewed work, government statistics) and use blogs and forums only for examples and color.
- Keep a running source list as you go; reconstructing sources at the end wastes time and loses links.
- Save the key passage, not just the link: pages change, and a saved quote preserves the evidence.
- Note the source's bias or interest: a vendor's study about its own product is evidence, but weighted differently.
- Research to the outline, not beyond it — a pack that covers ten extra topics slows the writer down.

## Security Considerations

- Do not include credentials, private API responses, or internal data in a research pack shared outside the team.
- Respect robots.txt and terms of service when gathering material; prefer official APIs and public pages.
- Treat interview notes and unpublished data as confidential unless the source agrees to publication.

## Performance Considerations

- Time-box research: a typical article needs 1-3 hours of research, not a week. Set the budget in the brief.
- Batch related topics so one research pass feeds several pieces in the same cluster.
- Reuse and refresh research packs instead of starting from zero for every update.

## Common Mistakes

- Citing a blog that cites a blog, instead of finding the original source.
- Recording a statistic without its date, so a 2015 number presents as current.
- Treating one source's claim as settled fact without a second check.
- Gathering research with no outline, ending up with a pile of facts and no structure.
- Including unverified claims in the pack without labeling them, so they slip into the draft as fact.

## Examples

Example research pack entry:

```md
## Feeding ratios

Claim: A 1:1:1 ratio (equal weights of starter, flour, water) is the
standard maintenance feeding for a room-temperature starter.
Source: King Arthur Baking, sourdough guide
URL: https://www.kingarthurbaking.com/
Accessed: 2026-11-20
Corroborated by: The Perfect Loaf, sourdough starter guide
(https://www.theperfectloaf.com/)
Gap: No authoritative source found for the ideal ratio for whole-grain-only
starters — flagged as unverified.
```

## Validation Checklist

- [ ] The research question and sub-questions are written down.
- [ ] Every fact has a source URL and a publication or update date.
- [ ] Key claims are cross-checked against a second independent source.
- [ ] Quotes are exact, with speaker, context, and source.
- [ ] Gaps and unverified claims are labeled as such.
- [ ] The pack is organized by the article's sections.
- [ ] The pack is dated.

## Expected Deliverables

- A research pack: facts, quotes, examples, and data grouped by section, each with a source.
- A source list with URLs and dates.
- A gaps list: questions the research could not answer.

## References

- [Google Scholar](https://scholar.google.com/) — academic papers and citations.
- [Poynter](https://www.poynter.org/) — verification and media literacy resources.
- [U.S. Copyright Office](https://www.copyright.gov/) — fair use rules.
- Related skills in this repository: `article-writing`, `fact-checking`, `content-brief`, `eeat-writing`.
