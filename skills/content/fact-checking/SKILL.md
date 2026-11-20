---
name: fact-checking
description: >
  Verify every factual claim in a draft against primary sources: check
  numbers, dates, quotes, names, and attributions, and flag anything
  unverified or wrong. Use when a draft is written and its accuracy must be
  confirmed before publishing. Trigger keywords: fact-checking, verify facts,
  check claims, accuracy check, verify quotes, verify statistics, source check.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Fact-Checking

## Purpose

This skill verifies that what a draft says is true. It extracts every
checkable claim — numbers, dates, quotes, names, and attributions — checks
each against a primary source, and produces a report of what passed, what
failed, and what could not be verified. It is the last line of defense
between a draft and a published error.

## When to Use

- Checking a finished article, report, or guide before publishing.
- Verifying claims in a draft that cites statistics, studies, or quotes.
- Reviewing content that makes claims about people, companies, or products.
- Auditing an existing page whose facts may be outdated.

## When Not to Use

- Gathering research for a new piece — use `content-research` instead.
- Editing for style, voice, or flow — use `human-editing` instead.
- The full pre-publish review (structure, intent, metadata) — use `editorial-review` instead.
- Checking grammar and spelling — that is copyediting, not fact-checking.

## Prerequisites

- The draft to be checked, with its existing citations and links.
- Access to the web and to primary sources (official docs, original studies, government data).
- The publication date or "as of" date the draft's facts should be true for.
- Knowledge of which claims matter most (legal, medical, and financial claims need the strictest checks).

## Official Documentation

- [Poynter](https://www.poynter.org/) — fact-checking methods and media literacy resources.
- [Google Scholar](https://scholar.google.com/) — search for original studies and papers.
- [U.S. Copyright Office](https://www.copyright.gov/) — rules on quoting and fair use.

## Required Workflow

1. Read the draft once through to understand its claims and argument.
2. Extract every checkable claim into a list: numbers, dates, quotes, names, titles, attributions, and causal claims ("X causes Y").
3. For each claim, find the primary source: the original study, the official document, the person's own words, or the authoritative dataset.
4. Verify the claim against the source, checking the number, the unit, the date, and the context. A number that is right in the wrong year is still wrong.
5. Check every quote for exact wording and correct attribution, and confirm the quote is not taken out of context.
6. Check every link: it must resolve, point to the source it claims to point to, and support the claim it is attached to.
7. Cross-check high-stakes claims (health, finance, legal, safety) against a second independent source.
8. Mark each claim as verified, incorrect (with the correction), or unverified (with the reason it could not be checked).
9. Produce the fact-check report: the verdict for each claim, corrections to apply, and unverified claims to remove or re-source.
10. Re-check the draft after corrections are applied, confirming the fixes are accurate and the new wording is supported.

## Implementation Standards

- Every checkable claim is checked. "Checkable" means a reader could verify it: numbers, dates, names, quotes, and attributions.
- Primary sources are required for verification. A secondary source that cites the primary source is a lead, not a verification.
- Quotes must match the source exactly, including wording and punctuation that changes meaning.
- Numbers must be checked with their unit, scope, and date. A statistic without a date is treated as unverified.
- Corrections are specific: state the wrong value, the correct value, and the source.
- Unverified claims are reported, not silently dropped: the author decides whether to remove or re-source them.
- The fact-check report is dated and lists the sources consulted, so the check can be repeated.
- Never mark a claim verified on the basis of "it sounds right" or a single blog post.

## Best Practices

- Check the claims that matter most first: the headline claim, the opening, and any claim a reader would act on.
- Distinguish facts from opinions: opinions need framing ("critics argue"), not verification.
- Watch for common error patterns: transposed digits, outdated statistics, misattributed quotes, and claims that outrun their source.
- Keep a record of sources consulted, including ones that contradicted the claim — the record is part of the work.
- When two reliable sources disagree, report both and let the author decide how to present the disagreement.

## Security Considerations

- Do not include credentials or private data in the fact-check report.
- Treat unpublished sources and embargoed material as confidential; do not cite them in published work without permission.
- Be careful with personal data: verifying a claim about a real person must not involve publishing private details about them.

## Performance Considerations

- Time-box the check by claim count: a typical article has 10-30 checkable claims and takes 30-90 minutes to verify.
- Batch verification by source: check all claims from one source in one pass instead of returning to the same source repeatedly.
- Keep the report concise: one line per claim (verdict, correction, source) is enough for most claims.

## Common Mistakes

- Verifying against a secondary source that merely repeats the claim.
- Checking the number but not the date, so an old statistic passes as current.
- Approving a quote that is close but not exact, or stripped of its context.
- Treating "I could not find the source" as "the claim is false" — it is unverified, which is a different verdict.
- Fact-checking the body but not the headline, title, or captions, where errors are just as visible.

## Examples

Example fact-check report entries:

```md
## Fact-check report — "How to Feed a Sourdough Starter"

| # | Claim | Verdict | Note |
|---|-------|---------|------|
| 1 | "A 1:1:1 ratio is the standard maintenance feeding" | Verified | King Arthur Baking sourdough guide |
| 2 | "Starters double in 4-8 hours at 24°C" | Verified with correction | Source says 4-6 hours at 24°C; draft said 4-8. Correct to 4-6. |
| 3 | "90% of starters fail in the first month" | Unverified | No source found. Remove or re-source. |
```

## Validation Checklist

- [ ] Every checkable claim in the draft is listed.
- [ ] Each claim is checked against a primary source.
- [ ] Quotes are exact and correctly attributed.
- [ ] Numbers are checked with unit, scope, and date.
- [ ] Every link resolves and supports the claim it is attached to.
- [ ] High-stakes claims are cross-checked against a second source.
- [ ] The report lists verified, incorrect, and unverified claims with corrections.
- [ ] Corrections have been applied and re-checked.

## Expected Deliverables

- A fact-check report with a verdict for every checkable claim.
- Corrections to apply to the draft, with sources.
- A list of unverified claims to remove or re-source.

## References

- [Poynter](https://www.poynter.org/) — fact-checking methods and media literacy.
- [Google Scholar](https://scholar.google.com/) — original studies and papers.
- Related skills in this repository: `content-research`, `editorial-review`, `article-writing`, `eeat-writing`.
