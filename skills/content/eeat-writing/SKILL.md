---
name: eeat-writing
description: >
  Write content that demonstrates experience, expertise, authoritativeness,
  and trustworthiness (E-E-A-T): first-hand experience, credible authors,
  transparent sourcing, and honest scope. Use when writing YMYL topics
  (health, finance, legal, safety) or any content where trust decides
  whether readers and search engines take it seriously. Trigger keywords:
  E-E-A-T, EEAT, expertise, authoritativeness, trustworthiness, YMYL,
  credible content, first-hand experience.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# E-E-A-T Writing

## Purpose

This skill makes trust visible in content. E-E-A-T — experience, expertise,
authoritativeness, and trustworthiness — is how Google's quality raters
assess whether content deserves a reader's confidence, and it matters most
for topics that affect health, money, safety, or legal rights (YMYL). This
skill shows how to demonstrate each element honestly: real experience,
credible authors, transparent sources, and clear limits. Note that Google
states E-E-A-T itself is not a specific ranking factor; its systems use a
mix of factors that can identify content with good E-E-A-T, and trust is
the most important of the four aspects.

## When to Use

- Writing about health, finance, legal, safety, or other YMYL topics.
- Writing content where the author's credibility decides whether readers trust it.
- Improving a site's content so it demonstrates expertise and trust.
- Creating author bios, about pages, or credential displays that support content.
- Reviewing content for trust signals before publishing.

## When Not to Use

- Pure entertainment or opinion content where expertise is not the point — use `blog-writing` instead.
- Product or sales copy — use `copywriting` instead.
- Fact-checking a finished draft — use `fact-checking` instead (though the two pair well).
- General article drafting with no trust stakes — use `article-writing` instead.

## Prerequisites

- The topic and its stakes: is it YMYL, and what could go wrong if the content is wrong?
- The author's real credentials, experience, and first-hand involvement with the topic.
- Access to authoritative sources for the topic (official guidance, peer-reviewed work, primary data).
- The site's about page, author pages, and contact information, or a plan to create them.
- Conceptual skill; version range: none — Google Search is a managed platform with no pinned version, and the skill depends on no versioned tool or package.

## Official Documentation

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on helpful content and E-E-A-T.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- [Google Search Central Blog](https://developers.google.com/search/blog) — announcements and guidance from Google's Search team, including links to the Search Quality Rater Guidelines.

## Required Workflow

1. Classify the topic: is it YMYL (health, finance, legal, safety, major life decisions)? YMYL topics get the strictest treatment.
2. Identify the author and their real relationship to the topic: first-hand experience, professional credentials, or researched expertise. Record what is true, not what would be impressive.
3. Gather authoritative sources: official guidance, peer-reviewed research, and primary data. For YMYL topics, these are required, not optional.
4. Draft with experience visible: describe what the author actually did, saw, or tested, with specific details that only first-hand experience provides.
5. Cite sources transparently: link to the primary source, name the source in the text, and include dates for time-sensitive claims.
6. State the limits: what the content does not cover, when to consult a professional, and where the author's expertise ends.
7. Add author attribution: a byline linked to an author page with real credentials and a short bio.
8. Add trust signals to the page: publication and update dates, contact information, and a clear statement of who is behind the site.
9. Run `fact-checking` on every claim, with extra rigor for YMYL content.
10. Review with `editorial-review`, checking the E-E-A-T signals explicitly before publishing.

## Implementation Standards

- Experience must be real: describe actual first-hand involvement with specific details. Never fabricate experience, credentials, or case studies.
- Authors are named with real credentials and a link to an author page. Anonymous YMYL content is a trust defect.
- Every YMYL claim is sourced to an authoritative primary source, with a date.
- Content states its limits and, for health, legal, and financial topics, includes a clear statement that it is not a substitute for professional advice.
- Publication and last-updated dates are visible on the page and accurate.
- The site has an about page and contact information that a reader can find.
- No fake reviews, testimonials, credentials, or endorsements. No invented expert quotes.
- Content is reviewed by a qualified person for YMYL topics; the reviewer's name and role are shown where the site does so.

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

- Show experience through detail: the specific tool used, the exact mistake made, the result observed. Vague claims of experience convince no one.
- Keep author pages current: credentials, experience, and links to published work.
- Update YMYL content on a schedule and record the review date; stale health or finance advice is worse than no advice.
- Link out to authoritative sources generously: linking to the official guidance strengthens trust, it does not weaken it.
- When the site lacks expertise on a topic, say so and either bring in an expert or do not cover the topic.

## Security Considerations

- Never publish personal data (licenses, addresses, private contact details) in author bios without consent.
- Do not display credentials that cannot be verified; a false credential is worse than none.
- Health, finance, and legal content must not collect sensitive personal data from readers without clear consent and a privacy notice.

## Performance Considerations

- E-E-A-T signals are cumulative: one strong author page supports every article that author writes, so invest in author pages once and reuse them.
- Reviewing YMYL content takes longer; budget for expert review in the publishing schedule.
- Updating trust signals (dates, credentials, about pages) is cheap maintenance with outsized effect.

## Common Mistakes

- Fabricating experience or credentials to look authoritative.
- Writing YMYL content with no named author and no sources.
- Citing secondary sources when the official guidance is one search away.
- Hiding the limits of the content, so readers over-trust advice that has clear boundaries.
- Treating E-E-A-T as a checklist of signals to fake, instead of a standard of honesty to meet.

## Examples

Example author byline with trust signals:

```md
By Dr. Maya Chen, Registered Dietitian
Reviewed by Dr. Alan Ortiz, MD · Updated 2026-11-18

Maya is a registered dietitian with 12 years of clinical experience.
This article is educational and is not a substitute for medical advice.
```

Example experience paragraph (first-hand, specific):

```md
I tested three feeding schedules over six weeks with the same starter.
The 1:2:2 ratio kept the starter active for 12 hours at 22°C; the 1:1:1
ratio peaked in 6 hours and collapsed by hour 10. Your kitchen temperature
will change these numbers — measure yours before picking a schedule.
```

## Validation Checklist

- [ ] The topic is classified (YMYL or not) and treated accordingly.
- [ ] The author is named with real credentials and an author page.
- [ ] First-hand experience is shown with specific, verifiable details.
- [ ] Every YMYL claim is sourced to an authoritative primary source with a date.
- [ ] The content states its limits and includes a professional-advice disclaimer where needed.
- [ ] Publication and update dates are visible and accurate.
- [ ] The site has an about page and contact information.
- [ ] No fabricated experience, credentials, reviews, or quotes appear.
- [ ] `fact-checking` and `editorial-review` have both passed.
- [ ] Accessibility: heading outline valid; alt text present; link text descriptive.

## Expected Deliverables

- Content that demonstrates E-E-A-T, with author attribution and trust signals in place.
- An author page or bio, if one does not exist.
- A source list of authoritative references used.

## References

- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) — Google's guidance on helpful content and E-E-A-T.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline rules for content in Google Search.
- Related skills in this repository: `article-writing`, `fact-checking`, `content-research`, `editorial-review`.
