---
name: off-page-seo
description: >
  Build a site's authority and visibility beyond its own pages through
  earned backlinks, brand mentions, digital PR, and reputation signals.
  Use when planning link building, earning press coverage, auditing a
  backlink profile, or growing a site's off-site authority.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Off-Page SEO

## Purpose

Off-page SEO earns the external signals — links, mentions, and citations —
that show search engines a site is trusted by others. This skill covers
white-hat, earned approaches only: creating link-worthy assets, outreach,
digital PR, and reputation building. It never promises rankings, and it
never endorses buying links or participating in link schemes, which
violate Google's spam policies.

## When to Use

- A site has solid on-page and technical SEO but lacks authority in its
  niche.
- Launching a link-worthy asset (research, tool, guide, data study) and
  planning promotion.
- Auditing a backlink profile for toxic links or lost links.
- A brand wants press coverage, podcast appearances, or expert quotes.
- Recovering from a link-related manual action or a drop in referring
  domains.

## When Not to Use

- To fix on-page or technical issues — use `on-page-seo` or
  `technical-seo` instead.
- To build links for a single local business listing — use `local-seo`
  for citations and local profiles.
- To analyze a competitor's links — use `competitor-analysis` first,
  then return here to act on the findings.
- When the site has no content worth linking to — create the asset first
  (see `content-gap-analysis`).

## Prerequisites

- A site with at least some content worth linking to (guides, research,
  tools, or original data).
- Access to a backlink data source (Search Console's Links report at
  minimum; a third-party index for deeper analysis).
- A list of the site's current referring domains and top linked pages.
- Knowledge of the site's niche, its audience, and the publications and
  communities that audience reads.
- Conceptual skill; version range: none — applies to Google's
  spam policies and third-party link indexes, with no pinned version.

## Official Documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  Google's spam policies, including the rules on link spam.
- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Console](https://search.google.com/search-console/about) —
  the Links report shows the links Google knows about.

Third-party authority scores are
estimates from private indexes, not Google's measure of a site; judge
links by relevance and the linking page's quality, not by a score.

## Required Workflow

1. Audit the current profile: referring domains, top linked pages, anchor
   text distribution, and links gained and lost over the last 90 days.
2. Identify link-worthy assets already on the site and gaps where a new
   asset would earn links (original research, a free tool, a definitive
   guide).
3. Build or improve one asset at a time; promotion without a good asset
   wastes outreach effort.
4. Build a prospect list: sites that link to similar assets, publications
   covering the topic, and journalists who write about it. Prioritize
   relevance over raw authority.
5. Outreach personally: short, specific messages that name the recipient's
   work and explain why the asset helps their audience. No templates
   blasted at scale.
6. Track every outreach attempt, reply, and link earned, with the linking
   URL and anchor text.
7. Monitor for new links and mentions weekly; thank linkers, and fix or
   reclaim broken links pointing at the site (ask for a corrected URL,
   or redirect the target).
8. Review the profile monthly for spam patterns (sudden spikes of
   low-quality links, exact-match anchor floods) and document them.
9. If a manual action for unnatural links exists, follow Google's
   documented reconsideration process: remove what can be removed,
   disavow the rest, and document the effort.
10. Report results honestly: links earned, referring domains gained, and
    pages that earned them — never claim a ranking effect for a single link.

## Implementation Standards

- Earned links only. Never buy links, exchange links at scale, use
  private blog networks, or place links in ways that violate Google's
  spam policies.
- Sponsored or paid placements must use `rel="sponsored"`, and
  user-generated links must use `rel="ugc"` where applicable. Do not
  mislabel paid links as editorial.
- Anchor text must be natural and varied: branded, plain-URL, and
  descriptive anchors, not repeated exact-match commercial anchors.
- Outreach must be honest about who is writing and why; never pose as a
  reader, customer, or unaffiliated fan.
- Do not promise a link in exchange for content, and do not pay for
  reviews or testimonials used to earn links.
- Disavow only when there is a real problem (manual action or a clear
  spam attack), not as routine maintenance; a wrongly disavowed good
  link is hard to recover.

## Best Practices

- Original data earns more links than opinions: surveys, benchmarks, and
  studies are the most linkable assets.
- Broken-link building works when the replacement is genuinely better
  than the dead resource, not merely similar.
- Build relationships before asking: comment on, share, and cite a
  publication's work before pitching it.
- Digital PR (expert quotes, data stories, timely commentary) earns
  links from outlets that never respond to cold link requests.
- Internal pages that earn links should link onward to the pages that
  need authority (see `internal-linking`).

## Security Considerations

- Never share login credentials or admin access with an outreach partner
  or link vendor.
- Verify the identity of anyone offering links or "guest post" placements;
  link-selling scams and hacked-site placements are common.
- Do not publish personal contact details of journalists or site owners
  in shared outreach lists.
- If the site is targeted by negative SEO (a flood of spammy links),
  document it and use the disavow tool only after confirming the pattern
  in Search Console data.

## Performance Considerations

- Outreach is a time cost, not a server cost: cap prospect lists so each
  message can be genuinely personalized, and batch follow-ups.
- Link monitoring tools can be expensive; Search Console's Links report
  is free and sufficient for small sites.
- A link from a page that is itself slow or broken still counts, but
  prioritize links from healthy, indexed pages.

## Common Mistakes

- Buying links or using link schemes — short-term gains risk a manual
  action that can remove the site from results.
- Chasing link quantity over relevance — one link from a respected niche
  publication beats dozens from unrelated directories.
- Sending identical outreach to hundreds of sites — low reply rates and
  a damaged reputation.
- Ignoring lost links — a changed URL can silently lose earned links;
  redirect the old URL or ask for an update.
- Judging links by third-party authority scores alone — those scores are
  estimates from private indexes, not Google's measure of a site.

## Examples

Example outreach email (short, specific, honest):

```text
Subject: Data on sourdough failure rates your readers may like

Hi Ana,

I read your piece on common sourdough mistakes and liked the section on
starter timing. We surveyed 400 home bakers and found that 6 in 10
failures trace back to an underfed starter — the full breakdown is here:
https://example.com/sourdough-survey

If you update the article, the data may be useful for your readers.
Happy to share the raw numbers if that helps.

Best,
Jordan — Example Baking Blog
```

(The survey figures above are illustrative placeholders for the
fictional example; a real message uses the site's real data.)

Example link-tracking row (spreadsheet or markdown table):

```text
| Date | Linking site | Linking URL | Target page | Anchor | Status |
|------|--------------|-------------|-------------|--------|--------|
| 2026-11-18 | example-news.com | /baking-trends | /sourdough-survey | sourdough survey | live |
```

## Validation Checklist

- [ ] The backlink profile was audited before new outreach began.
- [ ] At least one genuinely link-worthy asset exists before outreach.
- [ ] Every outreach message is personalized and honest about its purpose.
- [ ] No links were bought, exchanged at scale, or placed in violation of
      spam policies.
- [ ] Paid placements use rel="sponsored" where applicable.
- [ ] Earned links are tracked with URL, anchor, and date.
- [ ] Lost or broken inbound links were checked and reclaimed where possible.

## Expected Deliverables

- A backlink audit summary: referring domains, top linked pages, anchor
  distribution, and any spam patterns found.
- A prospect list with relevance notes and outreach status per prospect.
- A link-earning report: links earned, their sources, and the assets that
  earned them.
- Recommendations for the next link-worthy asset based on what earned
  links this round.

## References

- [Google Search Essentials](https://developers.google.com/search/docs/essentials) —
  spam policies, including link spam rules.
- [Google Search Central](https://developers.google.com/search) — official
  SEO documentation hub.
- [Google Search Console](https://search.google.com/search-console/about) —
  Links report.
- Related skills in this repository: `competitor-analysis`,
  `content-gap-analysis`, `internal-linking`, `local-seo`, `eeat`.
