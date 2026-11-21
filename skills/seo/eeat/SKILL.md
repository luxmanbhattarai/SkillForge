---
name: eeat
description: >
  Strengthens Experience, Expertise, Authoritativeness, and Trustworthiness
  (E-E-A-T) signals on a website through author attribution, credentials,
  sourcing, transparency, and reputation. Use when improving content
  credibility, adding author pages and bios, auditing YMYL content, or
  building trust signals for health, finance, legal, or advice content.
  Trigger keywords: E-E-A-T, EEAT, expertise, authoritativeness, trust,
  author bio, YMYL, content credibility, credentials, sourcing, reputation.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# E-E-A-T

## Purpose

This skill strengthens the Experience, Expertise, Authoritativeness,
and Trustworthiness signals that Google's quality raters assess and
that readers use to judge whether content deserves their trust. It
covers author attribution, credentials, first-hand experience,
sourcing, transparency pages, and reputation. E-E-A-T is not a single
ranking factor or a score; it is a set of quality concepts, and this
skill improves the observable signals without promising any ranking
outcome.

## When to Use

- Adding or improving author pages, bios, and bylines on articles.
- Auditing content credibility for Your Money or Your Life (YMYL)
  topics: health, finance, legal, safety, and major life decisions.
- Building trust pages: About, contact, editorial policy, review
  methodology, and corrections policy.
- Showing first-hand experience in reviews, guides, and how-to
  content (photos, tests, results, original data).
- Reviewing sourcing: citations, outbound links to authoritative
  sources, and fact-checking.

## When Not to Use

- For general on-page optimization — use `on-page-seo` instead.
- For schema implementation details — use `schema-jsonld` instead;
  this skill decides what author and organization facts to publish.
- For link building — earning authoritative links is related but is
  a separate outreach effort.
- As a quick fix for a ranking drop — E-E-A-T improvements take
  time to be reflected; use `seo-audit` to diagnose the drop first.

## Prerequisites

- Real author information: names, roles, qualifications, and
  experience that can be verified. Never invent credentials.
- Access to edit author pages, article templates, and trust pages.
- Knowledge of which topics on the site are YMYL and need the
  highest standard of accuracy and review.
- A list of the site's sources and review processes, or a plan to
  create them.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's guidance on helpful content and quality.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — the quality baseline, including E-E-A-T concepts.
- [Schema.org](https://schema.org/) — Person, Organization, and author properties for structured data.

## Required Workflow

1. Identify the trust-sensitive content. List YMYL pages and pages
   where wrong advice would cause harm; these get the highest
   standard.
2. Attribute every article. Each article names its author, links to
   the author's page, and shows publication and last-updated dates.
3. Build author pages. Each author gets a page with their real
   background, qualifications, areas of expertise, and links to
   their published work on the site.
4. Show experience. For guides and reviews, add evidence of
   first-hand experience: original photos, test results, process
   notes, and what actually happened — not generic claims.
5. Cite sources. Factual claims link to or name their source;
   statistics, dates, and requirements are verifiable.
6. Publish trust pages. About, contact, editorial and review
   policies, and a corrections policy, all accurate and current.
7. Add structured data. Person and Organization schema with the
   same facts shown on the visible pages.
8. Audit regularly. Review author pages, credentials, and YMYL
   content on a schedule, and correct errors promptly and visibly.

## Implementation Standards

- Author names are real people who wrote or reviewed the content.
  Never use a fake author, a stock-photo persona, or a generic
  byline on YMYL content.
- Credentials stated on the site must be true and verifiable. Never
  invent degrees, certifications, licenses, or affiliations.
- First-hand experience claims must be genuine: a review must be
  based on actual use, a guide on actual practice. Do not claim
  experience the author does not have.
- Dates are accurate: the publication date is when the article was
  first published, and the updated date changes only when the
  content actually changes.
- Outbound links go to authoritative, relevant sources. Do not link
  to low-quality sources to pad a reference list.
- The About page describes who runs the site, why it exists, and how
  to contact a real person. Anonymous sites with no contact route
  earn little trust.
- A corrections policy states how errors are reported and fixed, and
  corrections are noted on the corrected page.
- Structured data for authors and the organization matches the
  visible pages exactly; never add credentials or affiliations in
  schema that are not on the page.
- YMYL content is reviewed by someone qualified in the topic before
  publication, and the review is recorded (reviewer name and date
  where appropriate).

## Best Practices

- Let authors write in their own voice about their own experience;
  specific, personal detail is the clearest experience signal.
- Keep author pages current: new credentials, new roles, and new
  work should appear promptly.
- Show the review process, not just the result: "reviewed by" lines,
  methodology notes, and sourcing statements build trust.
- Earn independent mentions: citations, interviews, and links from
  reputable sites corroborate authority better than self-claims.
- Be transparent about commercial relationships: affiliate links,
  sponsorships, and paid placements are disclosed clearly.
- Fix errors fast and visibly; a prompt, honest correction builds
  more trust than a silent edit.

## Security Considerations

- Author pages publish personal information by design. Publish only
  professional details the author consents to share; never publish
  home addresses, personal phone numbers, or personal emails.
- Verify credentials before publishing them; publishing a false
  credential is both deceptive and a liability.
- Do not expose internal review notes, drafts, or reviewer personal
  data on public pages.
- Contact forms on trust pages must be protected against spam and
  must not expose the recipient's personal email address.

## Performance Considerations

- Author pages and trust pages are ordinary pages; keep them lean
  and fast like any other page.
- Author photos should be optimized like any image (see
  `image-seo`); a large uncompressed headshot on every article
  slows the site.
- Structured data for authors adds negligible weight; keep it in the
  page's JSON-LD block.

## Common Mistakes

- Fake authors and invented credentials — stock-photo authors with
  made-up degrees are deceptive and, when discovered, destroy trust.
  Use real people and real qualifications.
- Anonymous YMYL content — health, finance, or legal advice with no
  author and no sources asks readers to trust nothing. Attribute and
  source it, or do not publish it.
- Claiming experience without evidence — "we tested this for weeks"
  with no photos, data, or detail is an empty claim. Show the work.
- Stale dates — an article showing last year's date on
  fast-changing advice signals neglect. Review and update on a
  schedule.
- Hiding commercial relationships — undisclosed affiliate links or
  sponsorships breach trust and may breach advertising rules.
  Disclose clearly.
- Treating E-E-A-T as a checklist to game — adding a bio box while
  publishing unverified content misses the point. The content
  itself must be trustworthy.

## Examples

An author byline block on an article:

```md
By Jane Example, Certified Baking Instructor
Published 2026-10-12 · Updated 2026-11-15 · Reviewed by Sam Lee

Jane has taught sourdough baking for eight years and runs the test
kitchen behind this guide. Her author page is linked from the byline
(`authors/jane-example/` on the site).
```

Person structured data for an author page (generic example values;
use the real author's verified facts in production):

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Jane Example",
  "jobTitle": "Certified Baking Instructor",
  "description": "Baking instructor with eight years of experience teaching sourdough.",
  "url": "https://example.com/authors/jane-example/"
}
```

An editorial policy summary for an About page:

```md
## How we write

Every guide is written by a named author with hands-on experience of
the topic, reviewed by a second person, and updated when facts change.
We cite our sources, correct errors promptly, and disclose affiliate
links clearly.
```

## Validation Checklist

- [ ] Every article names a real author, links to their page, and
      shows accurate publication and update dates.
- [ ] Author pages list only true, verifiable credentials and
      experience.
- [ ] YMYL content is reviewed by a qualified person before
      publication.
- [ ] Factual claims are sourced, and outbound links go to
      authoritative sources.
- [ ] About, contact, editorial, and corrections pages exist and are
      current.
- [ ] Commercial relationships are disclosed where they exist.
- [ ] Person and Organization structured data matches the visible
      pages.
- [ ] No personal contact details are published without consent.

## Expected Deliverables

- Author pages and bylines in place, with verified credentials.
- Trust pages: About, contact, editorial and review policy, and
  corrections policy.
- Sourcing improvements on YMYL and high-traffic pages.
- Person and Organization structured data, validated.
- A review schedule for YMYL content and author pages.

## References

- [Google Search Central](https://developers.google.com/search) — helpful content and quality guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — E-E-A-T concepts and quality baseline.
- [Schema.org](https://schema.org/) — Person and Organization vocabulary.
- Related skills in this repository: `article-writing`, `schema-jsonld`, `on-page-seo`, `local-seo`, `seo-audit`.
