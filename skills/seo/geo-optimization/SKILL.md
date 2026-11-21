---
name: geo-optimization
description: >
  Optimize content so AI answer engines and generative search (ChatGPT,
  Perplexity, Google AI Overviews, and similar) can find, understand, and
  cite it. Use when adapting content for AI search, improving citation
  chances, or structuring pages for machine-readable answers.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# GEO Optimization

## Purpose

Generative Engine Optimization (GEO) adapts content for AI answer
engines — systems that synthesize answers from multiple sources instead
of listing links. The goal is to make a page easy for these systems to
retrieve, understand, and cite: clear structure, direct answers, cited
facts, and machine-readable markup. GEO is an emerging practice, not a
settled standard; this skill separates established techniques (clear
structure, structured data) from experimental ones, and it never
promises AI citations.

## When to Use

- Adapting existing content for AI answer engines and AI Overviews.
- Writing new content that should be citable by ChatGPT, Perplexity,
  Google AI Overviews, and similar systems.
- A site's traffic is shifting from clicks to AI-generated answers and
  the content strategy needs to adapt.
- Auditing whether a site's key pages are structured for machine
  readability.
- Planning content for question-based queries that AI engines answer
  directly.

## When Not to Use

- To optimize for classic search rankings alone — use `on-page-seo` and
  `technical-seo` for that; GEO builds on them, it does not replace them.
- To add structured data — use `schema-jsonld` and `structured-data`.
- To publish an llms.txt file — use `llms-txt` for that emerging
  convention.
- To optimize for a single AI platform's specific crawler rules — use
  `llm-seo` for platform-specific guidance.

## Prerequisites

- Solid traditional SEO foundations: the page must be crawlable,
  indexable, and well-structured before GEO work adds value.
- Knowledge of the target queries and the questions AI engines answer
  for them.
- Access to edit page content and templates.
- An honest assessment of the site's authority: AI engines cite sources
  they trust, and a new site must earn that trust with quality and
  corroboration, not tricks.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub, including AI Overviews guidance.
- [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's people-first content guidance, which applies to AI surfaces too.
- [Schema.org](https://schema.org/) — the vocabulary reference for the
  structured data that helps machines understand content.
- [llms.txt](https://llmstxt.org/) — the emerging convention for
  LLM-friendly site files (not a Google requirement; see the note in
  Implementation Standards).

## Required Workflow

1. Confirm the foundations: the page is indexable, fast, and well
   structured (see `technical-seo` and `on-page-seo`); GEO cannot fix
   a page search engines cannot read.
2. Identify the questions the page answers, in the audience's own words,
   using Search Console queries, "People also ask", and `search-intent`.
3. Restructure the page for answer extraction: a direct, concise answer
   near the top, followed by supporting detail, with clear headings that
   mirror the questions.
4. Make facts citable: state claims plainly, attribute them to their
   source where the claim is not the site's own, and keep numbers and
   dates accurate and current.
5. Add structure machines can parse: headings, lists, tables for
   comparisons, FAQ sections for question clusters, and JSON-LD
   structured data (see `schema-jsonld`).
6. Strengthen entity clarity: name the people, organizations, products,
   and places the page is about consistently, and link to authoritative
   references where they add context.
7. Build corroboration: the same facts appearing on reputable third-party
   sources makes a page more likely to be cited; this is earned through
   `off-page-seo` and `eeat`, not manufactured.
8. Check machine readability: confirm the page's key content is in the
   rendered HTML, not locked behind interactions, images, or scripts
   that a crawler cannot execute.
9. Monitor AI visibility where tools support it: track which queries
   surface the site in AI answers and which competitors are cited instead.
10. Iterate: update pages whose facts changed, refresh stale content, and
    re-check that the direct answers still match the current best answer.

## Implementation Standards

- Distinguish established practice from experimental practice. Clear
  structure, direct answers, cited facts, and structured data are
  established. Techniques specific to one AI platform's current
  behavior are experimental and must be labeled as such.
- `llms.txt` is an emerging convention proposed by third parties, not a
  Google ranking requirement and not a standard any search engine has
  committed to; treat it as optional and experimental (see `llms-txt`).
- Never promise AI citations, AI Overview inclusion, or any specific AI
  surface outcome; these are controlled by the AI systems, not by the
  site.
- Never fabricate facts, statistics, quotes, or sources to make content
  look citable; AI engines that cite invented facts create liability
  for the site.
- Every factual claim that matters should be verifiable: accurate,
  current, and traceable to a source the reader can check.
- Do not stuff pages with question-shaped headings that the content does
  not actually answer; that is keyword stuffing in a new format.
- Content must remain written for humans first; a page optimized only
  for machines reads badly and fails both audiences.

## Best Practices

- Lead with the answer: a 40-60 word direct answer at the top of a
  section is easy for both readers and answer engines to use.
- Use tables for comparisons and lists for steps; structured formats
  are easier to extract than prose paragraphs.
- Keep the site's facts consistent across pages: conflicting dates,
  prices, or definitions on different pages confuse both readers and
  machines.
- Refresh high-value pages regularly; AI engines favor current
  information, and a stale page loses citation chances.
- Build topical authority with clusters of related, well-linked content
  (see `keyword-clustering` and `internal-linking`); a site that covers
  a topic thoroughly is more citable than one with a single page.

## Security Considerations

- Do not expose private data, internal documents, or credentials in
  content meant for AI crawlers; anything crawlable can be quoted.
- Review robots.txt and crawler access deliberately: blocking AI
  crawlers is a business decision, and allowing them means accepting
  that content may be quoted in answers.
- Be aware that content published to be cited can be quoted out of
  context; write claims that remain accurate when quoted alone.
- Do not publish personal data about third parties in an attempt to
  make content more "complete" for AI engines.

## Performance Considerations

- GEO work is content work; its cost is writing and maintenance time,
  not server load.
- Machine-readable structure (headings, lists, tables, JSON-LD) adds
  negligible page weight.
- Monitoring AI visibility may require third-party tools; start with
  free checks (asking the AI engines directly) before paying for a tool.

## Common Mistakes

- Treating GEO as a replacement for SEO — AI engines retrieve from the
  same indexed web, so traditional SEO foundations still decide what is
  findable.
- Promising citations — no technique guarantees an AI engine will cite
  a specific page.
- Chasing every new GEO tactic — the field is full of untested claims;
  prefer techniques with a clear mechanism (structure, clarity, facts)
  over tricks.
- Writing for machines instead of humans — content that reads like a
  database entry will not earn links, readers, or trust.
- Ignoring corroboration — a single site claiming a fact is less citable
  than a fact confirmed by multiple reputable sources.

## Examples

Example answer-first section structure for a question page:

```markdown
## Why is my sourdough not rising?

The most common cause is an underfed starter. A starter fed once a day
in a cool kitchen often lacks the yeast activity to lift a loaf. Feed
it twice a day for three days, keep it near 24°C (75°F), and try again.

### Other causes

- Dough temperature below 20°C (68°F) slows fermentation.
- Too much salt inhibits yeast activity.
- An old or weak starter needs several feedings to recover.
```

Example comparison table that machines can extract cleanly:

```markdown
| Flour | Protein (approx.) | Best for |
|-------|-------------------|----------|
| Bread flour | 12-13% | Chewy sourdough loaves |
| All-purpose flour | 10-12% | Softer breads and rolls |
| Whole wheat flour | 13-14% | Dense, hearty loaves |
```

Note: protein ranges above are approximate values commonly cited for
these flour types; verify against the specific product before publishing.

## Validation Checklist

- [ ] The page is crawlable, indexable, and fast before GEO work is judged.
- [ ] Each key question has a direct, concise answer near the top of its
      section.
- [ ] Facts are accurate, current, and traceable to a verifiable source.
- [ ] Headings, lists, tables, and JSON-LD make the content
      machine-readable.
- [ ] No AI citation or AI Overview outcome is promised anywhere.
- [ ] Experimental techniques are labeled as experimental, not presented
      as established.
- [ ] Key content is in the rendered HTML, not behind interactions or
      images.
- [ ] The page still reads well for a human reader.

## Expected Deliverables

- GEO-optimized pages with answer-first structure, citable facts, and
  machine-readable formatting.
- A list of the questions each page targets and the direct answers it
  provides.
- A note on what is established practice versus experimental in the
  changes made.
- A monitoring plan for AI visibility on the target queries.

## References

- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's people-first content guidance.
- [Schema.org](https://schema.org/) — structured data vocabulary.
- [llms.txt](https://llmstxt.org/) — the emerging llms.txt convention
  (not a Google requirement).
- Related skills in this repository: `on-page-seo`, `technical-seo`,
  `schema-jsonld`, `structured-data`, `llms-txt`, `llm-seo`, `eeat`,
  `aeo-optimization`.
