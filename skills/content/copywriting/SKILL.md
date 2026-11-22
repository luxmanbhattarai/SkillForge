---
name: copywriting
description: >
  Write persuasive copy that moves readers to act: headlines, landing pages,
  emails, ads, and calls to action grounded in benefits and proof. Use when
  writing sales pages, product descriptions, email campaigns, or any copy
  whose job is conversion. Trigger keywords: copywriting, sales copy,
  landing page copy, headlines, email copy, ad copy, call to action,
  conversion copy.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Copywriting

## Purpose

This skill produces copy that persuades honestly: it names the reader's
problem, shows the benefit of the offer, backs claims with proof, and asks
for one clear action. It covers headlines, landing pages, product
descriptions, emails, and ads — any text whose job is to convert a reader
into a customer, subscriber, or user.

## When to Use

- Writing a landing page, sales page, or product description.
- Drafting email campaigns, newsletters with a conversion goal, or ad copy.
- Writing headlines, taglines, and calls to action.
- Rewriting copy that gets traffic but does not convert.

## When Not to Use

- Informational articles or guides — use `article-writing` instead.
- Blog posts written for engagement rather than conversion — use `blog-writing` instead.
- Technical documentation — use `technical-writing` instead.
- Content planned around a keyword — use `seo-content-writing` instead.

## Prerequisites

- The offer: what is being sold or promoted, and its price or commitment.
- The audience: who they are, what problem they have, and what they have already tried.
- The proof: testimonials, data, guarantees, or credentials that support the claims.
- The single action the reader should take (buy, sign up, book, download).
- Brand voice rules and any claims that must be avoided for legal reasons.

## Official Documentation

- [FTC](https://www.ftc.gov/) — U.S. advertising rules, including endorsement and testimonial guides.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines for clear copy.
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/) — accessibility requirements for web copy and CTAs. WCAG 2.2 (W3C Recommendation, October 2023) is the current version; Level AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (success criterion 1.4.3). WCAG 3.0 is still a Working Draft and must not be cited as a requirement.

## Required Workflow

1. State the offer in one sentence and the single action the reader should take.
2. Write the audience's problem in their own words, using their language from reviews, support tickets, or surveys where available.
3. List the benefits (what the reader gets), not just features (what the product has), and rank them by what the audience cares about most.
4. Gather proof for each major claim: testimonials, numbers, guarantees, or credentials. Do not write a claim you cannot prove.
5. Draft the headline first: it must name the benefit or the problem, and make the reader want the next line.
6. Draft the body in the reader's voice: short sentences, short paragraphs, benefits before features, proof near claims.
7. Write the call to action as a specific verb phrase ("Start your free trial", not "Click here") and place it where the reader has enough information to act.
8. Add risk reversal near the CTA: guarantee, free trial, or refund policy, stated accurately.
9. Read the copy aloud, cut every word that does not earn its place, and check that every claim is true and provable.
10. Hand the copy to `editorial-review` before publishing.

## Implementation Standards

- One offer, one audience, one action per piece of copy. Copy that asks for two things gets neither.
- Benefits lead; features support. Every feature mentioned must be tied to a benefit the reader cares about.
- Every claim must be true and provable. No invented testimonials, statistics, ratings, or "best" claims without evidence.
- Headlines name the benefit or the problem in the reader's language; no clever wordplay that hides the meaning.
- Calls to action use a specific verb and state what happens next.
- Sentences are short (under 20 words on average) and paragraphs are 1-3 sentences.
- Disclosures required by law (affiliate relationships, paid endorsements, material terms) appear clearly, near the claim they relate to.
- Copy must be accessible: sufficient color contrast for CTA buttons, real text (not images of text) for key claims, and descriptive link text.

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

- Write to one person, not a crowd: "you" beats "users" or "customers."
- Lead with the reader's problem, not the product's history.
- Use the audience's own words for their problem — copy from reviews and surveys beats invented phrasing.
- Specific beats vague: "saves 20 minutes a day" beats "saves you time" (when the number is real and sourced).
- Test one change at a time when optimizing: headline, CTA, or proof, not all three at once.
- Keep a swipe file of copy that worked, with the results, so the next piece starts from evidence.

## Security Considerations

- Never include credentials, API keys, or private data in copy or examples.
- Do not collect personal data in a form without a privacy notice and a lawful basis.
- Never use deceptive patterns (hidden costs, fake urgency, misleading countdowns) — they violate advertising rules in many jurisdictions and destroy trust.

## Performance Considerations

- Short copy converts better when the offer is simple; long copy is justified only when the decision is expensive or complex.
- Landing pages should load fast: compress images and avoid heavy scripts that delay the CTA.
- One CTA per screen on long pages, repeated at natural decision points, beats a single CTA at the bottom.

## Common Mistakes

- Leading with features ("We use advanced AI") instead of benefits ("You get a finished draft in minutes").
- Making claims without proof, or inventing testimonials and statistics.
- Asking for two actions at once (buy and subscribe, sign up and share).
- Writing headlines that are clever but say nothing about the offer.
- Hiding the price, the terms, or the catch — readers who feel tricked do not come back.

## Examples

Example landing page structure:

```md
# Keep your sourdough starter alive with five minutes a day

The Starter Keeper tracks feedings, reminds you when your starter is
hungry, and tells you exactly what to do — so you never lose a starter
to a forgotten weekend again.

- Daily reminders, timed to your schedule
- Feeding ratios for any flour, worked out for you
- A log of every feeding, so you can see what works

[Start your free 14-day trial]

No card required. Cancel anytime.
```

Example headline rewrite:

```text
Before: "Introducing Our Revolutionary Baking Platform"
After:  "Never lose a sourdough starter again"
```

## Validation Checklist

- [ ] The copy has one offer, one audience, and one action.
- [ ] The headline names the benefit or the problem in the reader's language.
- [ ] Every claim is true and backed by proof.
- [ ] Benefits lead; every feature is tied to a benefit.
- [ ] The CTA is a specific verb phrase and appears where the reader can act.
- [ ] Required disclosures are present and near the claims they relate to.
- [ ] The copy passes the `editorial-review` checklist.
- [ ] Accessibility: heading outline valid; alt text present; link text descriptive.

## Expected Deliverables

- Complete copy in the format requested (landing page, email, ad, product description).
- Headline options (2-3) where the brief asks for them.
- A list of proof sources used for claims.

## References

- [FTC](https://www.ftc.gov/) — advertising rules, endorsements, and testimonials.
- [plainlanguage.gov](https://www.plainlanguage.gov/) — plain-language guidelines.
- Related skills in this repository: `blog-writing`, `seo-content-writing`, `editorial-review`, `fact-checking`.
