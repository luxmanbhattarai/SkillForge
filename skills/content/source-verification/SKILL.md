---
name: source-verification
description: >
  Vet the sources behind a piece before it is written or published:
  judge source quality and credibility, separate primary from secondary
  and tertiary sources, check citations, corroborate with independent
  sources, and spot unreliable, biased, or AI-generated sources. Use
  when choosing sources for a draft, auditing a draft's references, or
  deciding whether a source is trustworthy enough to cite. Trigger
  keywords: source verification, verify sources, source credibility,
  vet sources, primary source, citation check, unreliable source,
  biased source, AI-generated source, source quality, corroborate.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Source Verification

## Purpose

This skill decides whether a source is good enough to build on. It vets
each source for credibility, authority, and independence, traces
claims back to their original context, and produces a source log the
writer and the fact-checker can rely on. It answers "can I trust this
source?" — the question that comes before `fact-checking`'s "is this
claim true?" A true claim cited from a bad source is still a weak piece.

## When to Use

- Choosing sources for a new piece, before or during research.
- Auditing the references in a finished draft.
- Deciding whether a specific site, study, or article is citable.
- Checking a source that looks suspicious, biased, or AI-generated.
- Building the source list for a `content-brief`.
- Re-verifying sources on a page being refreshed.

## When Not to Use

- Checking the truth of individual claims in a draft — use
  `fact-checking` instead (this skill vets the sources; that skill
  checks the claims against them).
- Gathering research for a new piece — use `content-research`
  instead.
- The full pre-publish review — use `editorial-review` instead.
- Writing the piece — use `article-writing` or `seo-content-writing`.

## Prerequisites

- The list of sources to vet, with URLs, or the draft whose
  references need auditing.
- The topic and the stakes: health, finance, legal, and safety
  topics need stricter sourcing than a baking guide.
- Access to the web to check sources, authors, and publishers.
- The publication date or "as of" date the sources must be current for.
- Conceptual skill; version range: none — applies to
  current verification tools and standards; see the IFCN Code of
  Principles and the C2PA standard linked in Official Documentation.

## Official Documentation

- [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/) — the International Fact-Checking Network's standards for nonpartisanship, transparency of sources, and corrections; the bar a trustworthy source meets.
- [Google Fact Check Explorer](https://toolbox.google.com/factcheck/explorer) — search fact checks from independent organizations worldwide, by keyword or image, to see whether a claim or source has already been checked.
- [C2PA](https://c2pa.org/) — the open standard for content provenance; use its verifier at [contentcredentials.org/verify](https://contentcredentials.org/verify) to check whether an image or video carries signed provenance (creator, edits, AI generation).
- [Google Scholar](https://scholar.google.com/) — find original studies and papers behind secondary coverage.
- [Poynter](https://www.poynter.org/) — fact-checking methods and media literacy resources.

## Required Workflow

1. List every source the piece relies on, with its URL, author,
   publisher, and publication date. A source with no URL or no date
   is flagged immediately.
2. Classify each source: **primary** (the original study, dataset,
   official document, or the person's own words), **secondary**
   (reporting or analysis of a primary source), or **tertiary**
   (a summary of secondary sources, such as an encyclopedia entry).
   Prefer primary sources for every load-bearing claim.
3. Apply the SIFT check to each unfamiliar source: **Stop** — do you
   know and trust this source? **Investigate** — who created it, and
   what is their expertise and agenda? **Find better coverage** — do
   independent, trusted sources say the same thing? **Trace** — can
   the claim be followed back to its original context?
4. Investigate the publisher: read its about page, check who funds
   or owns it, look for a corrections policy and named editors, and
   read laterally — search for what others say about the source
   instead of trusting its own self-description.
5. Check the author: real name, relevant expertise, a track record
   on the topic, and no undisclosed conflict of interest.
6. Check the date and the version: is the source current for the
   claim it supports, and is it the latest version? A statistic from
   five years ago does not support a claim about today.
7. Corroborate: for high-stakes claims, find a second independent
   source that does not trace back to the same origin. Two articles
   quoting the same press release are one source, not two.
8. Check media provenance: for images and video, check C2PA Content
   Credentials where present, and reverse-image-search anything
   that looks recycled or out of context.
9. Record the verdict per source — approved, approved with caveats,
   or rejected — with the reason, in the source log.
10. Hand the approved source list to the writer (or to
    `fact-checking` for a finished draft) and keep the log with the
    piece so the checks can be repeated.

## Implementation Standards

- Primary sources are required for load-bearing claims: numbers,
  dates, quotes, and causal claims must trace to the original study,
  document, dataset, or speaker.
- A source is judged on evidence, not reputation alone: a respected
  outlet can publish a weak piece, and an unknown outlet can publish
  a well-sourced one. Check the specific item, not just the brand.
- Every cited source must be real, reachable, and checked: open it,
  read the relevant passage, and confirm it says what the draft
  claims it says.
- Citations in the published piece link to the primary source where
  possible, name the author and publisher, and carry the
  publication date; a bare URL with no context is not a citation.
- Corroboration means independence: sources that share an origin
  (same press release, same wire story, same dataset) count as one.
- A rejected source is recorded with its reason, not silently
  dropped, so the team does not re-adopt it later.
- AI-generated or AI-assisted sources are flagged as such and never
  treated as primary evidence: an AI summary is a lead to the
  original, not a source.
- The source log is dated and lists every source consulted,
  including rejected ones.

### Testing Strategy

- Have a second verifier independently re-check a random sample of
  sources each month; disagreement between verifiers is a signal to
  tighten the criteria, not a tie to break by seniority.
- Link-check every citation before publish and on a schedule
  afterward: a cited source must still be real and reachable, and a
  dead link must be replaced or the claim re-sourced.
- Spot-check the claim-to-source match: open the cited passage and
  confirm it says what the draft claims, especially for numbers,
  dates, and quotes.
- Audit the rejected-source log periodically so a rejected source is
  not quietly re-adopted by a later piece.

### Accessibility

- Prefer sources in accessible formats: an HTML article over a scanned
  PDF, a page with real text over an image of text, and a video or
  podcast with a transcript or captions over one without.
- When the only source for a load-bearing claim is an inaccessible
  format, note that in the source log and cite an accessible
  corroborating source alongside it where one exists.
- Check that cited charts and figures carry alt text or a data table a
  reader using a screen reader can follow; a chart whose numbers exist
  only as pixels is not a checkable source for every reader.
- Link to the accessible version of a source when the publisher offers
  one (HTML full text, accessible PDF), and record which version was
  checked.

## Best Practices

- Read laterally: leave the source and check what independent
  sources say about it before deciding to trust it.
- Trace the chain: follow a claim upstream until you reach the
  original — the study, the transcript, the dataset — and cite that.
- Prefer sources that show their work: named authors, linked
  evidence, published methods, and a corrections policy.
- Treat a source's age as part of its quality: check whether newer
  evidence supersedes it, especially for statistics and guidance.
- Keep a team list of approved sources per topic (official docs,
  regulators, journals, established outlets) so vetting is not
  repeated from scratch each time.
- When two reliable sources disagree, record both and let the author
  present the disagreement honestly.

## Security Considerations

- Do not cite or link to sources that host malware, phishing pages,
  or scraped private data.
- Treat unpublished, embargoed, or leaked material as confidential;
  do not cite it in published work without permission.
- Verifying a claim about a real person must not involve publishing
  private details about them.
- Be careful with user-generated and anonymous sources: an anonymous
  post is not evidence, however confident it sounds.

## Performance Considerations

- Time-box vetting by source count: a typical article relies on
  5-15 sources and takes 20-45 minutes to vet.
- Batch checks by publisher: vet all sources from one outlet in one
  pass instead of re-investigating it repeatedly.
- Keep the source log concise: one line per source (verdict, type,
  reason) is enough for most sources.

## Common Mistakes

- Citing a secondary source that merely repeats the claim, instead
  of tracing to the primary source.
- Counting two articles that quote the same press release as
  independent corroboration.
- Judging a source by its design or domain name instead of its
  authorship, evidence, and corrections record.
- Accepting an AI-generated summary or a screenshot as a source.
- Checking the source's reputation but not the specific item's date
  and version.
- Dropping a rejected source without recording why, so it gets
  re-added by the next writer.

## Examples

Example source log entries:

```md
## Source log — "How to Feed a Sourdough Starter"

| Source | Type | Verdict | Note |
|---|---|---|---|
| King Arthur Baking sourdough guide | Secondary (brand) | Approved | Authoritative baking source; ratios match their published guide. |
| Original study on starter microbiology (journal) | Primary | Approved | Peer-reviewed; cited for the fermentation claim. |
| Anonymous blog post "90% of starters fail" | Tertiary | Rejected | No author, no data, no source cited. Claim removed. |
| AI-generated baking FAQ page | AI-generated | Rejected | No byline, no citations, invented ratios. |
```

Example SIFT check on an unfamiliar source:

```md
Source: example-health-blog.com/gut-health-myths
Stop: Unknown site; the claim is surprising. Do not cite yet.
Investigate: No author byline; "About" page is generic; the site
  sells the supplement the article recommends.
Find better coverage: No independent outlet repeats the claim.
Trace: The cited "study" link goes to a different paper's abstract.
Verdict: Rejected — commercial conflict of interest, mis-cited study.
```

## Validation Checklist

- [ ] Every source the piece relies on is listed with URL, author,
      publisher, and date.
- [ ] Each source is classified as primary, secondary, or tertiary.
- [ ] Load-bearing claims trace to a primary source.
- [ ] Unfamiliar sources passed the SIFT check.
- [ ] High-stakes claims are corroborated by a second independent source.
- [ ] Media provenance was checked where it matters (C2PA, reverse image search).
- [ ] AI-generated sources are flagged and not used as evidence.
- [ ] The source log records a verdict and reason for every source.

## Expected Deliverables

- A source log with a verdict and reason for every source consulted.
- The approved source list, ready for the writer or fact-checker.
- A list of rejected sources with reasons, so they are not re-adopted.

## References

- [IFCN Code of Principles](https://ifcncodeofprinciples.poynter.org/) — fact-checking standards.
- [Google Fact Check Explorer](https://toolbox.google.com/factcheck/explorer) — search existing fact checks.
- [C2PA](https://c2pa.org/) — content provenance standard.
- [Google Scholar](https://scholar.google.com/) — original studies and papers.
- Related skills in this repository: `fact-checking`,
  `content-research`, `content-brief`, `editorial-review`,
  `editorial-workflow`, `eeat-writing`.
