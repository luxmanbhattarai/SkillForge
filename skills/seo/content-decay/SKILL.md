---
name: content-decay
description: >
  Diagnose why published content is losing search visibility: detect
  decay from traffic and impression curves, freshness signals,
  cannibalization, and outdated facts; identify the cause; prioritize
  decaying pages; and decide refresh vs redirect vs remove. This is
  the diagnostic skill — the rewrite workflow itself lives in
  content-refresh. Use when a page's clicks or impressions are
  declining, during a content audit, or after a ranking drop.
  Trigger keywords: content decay, declining traffic, traffic drop,
  outdated content, cannibalization, freshness, refresh or redirect
  or remove, decaying pages, content audit.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Content Decay

## Purpose

Content decay is the slow (or sudden) loss of search visibility by
a published page: fewer impressions, fewer clicks, a lower average
position. This skill diagnoses it: it finds decaying pages from
Search Console data, separates true decay from seasonality, updates,
and technical problems, identifies the cause for each page, and
decides what should happen to it — refresh, redirect, remove, or
leave alone. It diagnoses; it does not rewrite. The refresh itself
is `content-refresh`.

## When to Use

- A page's clicks or impressions are declining over weeks or months.
- A scheduled content audit needs a prioritized list of pages to act on.
- A ranking drop needs a per-page diagnosis (after ruling out
  site-wide causes).
- Two or more of the site's pages compete for the same query.
- Deciding whether an old page is worth updating, redirecting, or
  deleting.

## When Not to Use

- To rewrite or update the page itself — use `content-refresh`
  once this skill has decided the page should be refreshed.
- To diagnose a site-wide drop (all sections falling together) —
  use `seo-audit` and Google's traffic-drop debugging guide first;
  site-wide drops are usually technical, security, spam, or
  algorithmic causes, not page decay.
- To fix the technical problems this skill uncovers (crawl errors,
  broken redirects, indexation) — use `technical-seo`,
  `canonical-management`, or `search-console`.
- To plan new content — use `keyword-research` and
  `topical-authority`.
- To track rankings day to day — use `serp-monitoring`.

## Prerequisites

- Access to Google Search Console for the property, with at least
  several months of Performance data (the report keeps 16 months).
- A list of the site's pages with publication and last-updated dates.
- Access to the site's analytics for the traffic picture beyond search.
- The page's target query and intent, or a way to determine them.
- A change log for the site (redesigns, migrations, template
  changes) so decay is not confused with a site change.
- Conceptual skill; current stable as of 2026-11-20 — applies to the
  current Search Console reporting; Google publishes no versioned
  decay metric; the thresholds in this skill are working rules, and
  the official guidance is linked in Official Documentation.

## Official Documentation

- [Debugging drops in Google Search traffic](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops) —
  Google's guide to investigating traffic drops: the main causes
  (algorithmic updates, technical issues, security issues, spam
  issues, seasonality, site moves, reporting glitches) and how to
  read the Performance chart over 16 months.
- [Google Search's core updates and your website](https://developers.google.com/search/docs/appearance/core-updates) —
  Google's guidance on core updates: they are broad changes that do
  not target specific sites; wait at least a full week after a
  rollout completes before analyzing; deleting content is a last
  resort, only if the content cannot be salvaged.
- [Performance report (Search results)](https://support.google.com/webmasters/answer/7576553) —
  Search Console Help: clicks, impressions, CTR, and average
  position, and the query, page, country, device, and search
  appearance dimensions.
- [Data anomalies in Search Console](https://support.google.com/webmasters/answer/6211453) —
  Google's record of known logging and aggregation issues that can
  look like traffic changes.
- [Google Search Status Dashboard](https://status.search.google.com/) —
  Google's log of ranking updates and incidents, with start and
  end dates.
- [Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects) —
  Google's guidance on permanent (301/308) and temporary redirects.
- [Get started with Google Trends](https://developers.google.com/search/docs/monitor-debug/trends-start) —
  Google's guide to checking whether search interest itself has
  changed, using a sample of aggregated, anonymized searches.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's quality guidance for judging whether a page still
  serves its readers.

Guidance current as of 2026-11-20. Google publishes no "content
decay" metric or threshold: what counts as decay is a judgment
from the site's own data, and the thresholds in this skill (such as
the comparison windows) are working rules, labeled as such. No
diagnosis here promises a recovery in rankings or traffic.

## Required Workflow

1. Pull the evidence. In Search Console, open the Performance
   report for the last 16 months, grouped by page, and export it.
   For each page, note clicks, impressions, and average position
   over time. Flag pages with a sustained decline — falling over
   at least two comparison periods, not a single bad week.
2. Rule out non-decay causes first, before touching any page:
   - Check the Data Anomalies page for logging issues in the
     period.
   - Check the Search Status Dashboard for ranking updates that
     overlap the decline; if an update is still rolling out, or
     finished less than a week ago, wait before judging (per
     Google's core-updates guidance).
   - Check seasonality: compare against the same period last
     year, and check the page's queries in Google Trends. A
     yearly dip is demand, not decay.
   - Check for site-wide causes: indexing errors, a migration,
     a template change, a manual action. If every section fell
     together, stop — this is not page decay (see `seo-audit`).
3. Read the shape of the decline for each flagged page:
   - Impressions and clicks both falling: the page is losing
     visibility — ranking loss, intent shift, or a stronger
     competitor set.
   - Impressions steady, clicks falling: the page still appears
     but is clicked less — check the SERP for new features
     (featured snippet, AI Overview, shopping, video) and check
     whether the title and description still match what the
     results show (see `serp-analysis`).
   - Impressions falling, clicks steady: fewer queries show the
     page — narrowing relevance, or queries the page used to
     match drifting away.
4. Check freshness signals on the page: last-updated date, facts
   and statistics that have moved on, screenshots or examples
   from an old version, broken or outdated outbound links, and
   references to events or versions that have passed.
5. Check intent shift. Re-run `serp-analysis` for the page's
   target query: do the current top results answer a different
   question than the page answers? Intent drift is decay even
   when every fact on the page is still true.
6. Check cannibalization. In the Performance report, filter to
   the page's target query and look at the Pages dimension: if
   two or more of the site's pages get impressions for the same
   query, the site is competing with itself. Note which page
   should own the query.
7. Check competition. Open the pages that now outrank the
   decaying page and note what they cover that it does not:
   depth, freshness, format (video, calculator, table), or
   first-hand experience.
8. Diagnose each page in one sentence: the cause (stale facts,
   intent shift, cannibalization, thin vs. current competition,
   SERP feature crowding, or demand decline) and the evidence
   for it. A page without a diagnosed cause gets no action yet.
9. Prioritize. Score each diagnosed page by traffic value (what
   it used to earn and what it still earns), business value (does
   it convert or support a converting page), and fixability (a
   facts update vs. a full rewrite vs. unsalvageable). Work the
   high-value, fixable pages first.
10. Decide per page — refresh, redirect, remove, or monitor —
    using the decision rules in Implementation Standards, record
    the decision and its reason in a decay log, and hand refresh
    decisions to `content-refresh` with the diagnosis attached.
11. Verify after action: re-check the page's Performance data
    after enough time has passed for recrawl and re-evaluation
    (weeks, not days), and record the outcome in the decay log.

## Implementation Standards

- A decline is only decay after the checks in step 2 rule out
  anomalies, updates, seasonality, and site-wide causes. Acting
  on an unexamined decline risks "fixing" a page that was never
  broken.
- **Refresh** when the topic is still relevant, the page has
  history (links, past traffic, an established URL), and the
  diagnosis is fixable: stale facts, thin coverage, or an intent
  shift the page can be updated to meet. The URL does not change.
- **Redirect** (permanent 301) when a better page already covers
  the same intent and the decaying page's value is mostly its
  links and history. Redirect to the closest matching page, never
  to the homepage. Keep the redirect in place; removing it
  strands the old URL.
- **Remove** (404, 410, or `noindex`) only as a last resort, when
  the content cannot be salvaged and no better page covers the
  topic — Google's core-updates guidance says the same. Remove
  only after checking the page has no meaningful links, traffic,
  or internal references; update the internal links that pointed
  to it.
- **Monitor** when the diagnosis is unclear, the decline is small,
  or an update is still rolling out. Monitoring is a decision,
  with a re-check date — not neglect.
- Never delete a page during or immediately after a core update
  rollout; wait until the rollout completes plus at least a full
  week, per Google's guidance, before judging the page.
- Never refresh a page by changing its last-updated date without
  changing its content.
- Cannibalization is fixed by choosing one owner page per query:
  refresh the owner, and redirect or re-target the others.
- Record every decision with its reason and date in the decay log;
  a decision without a recorded reason cannot be reviewed later.

### Testing Strategy

- Validate the diagnosis against known cases: re-run the decay check
  on a page known to be healthy (it must not flag) and one known to be
  decayed (it must flag) before trusting the method on a new site.
- Cross-check the numbers: Search Console dashboard figures and any
  API pull for the same page and date range must agree before a
  decision is based on them.
- Test every redirect target after a redirect decision: it resolves,
  it is the closest matching page, and it creates no chain or loop.
- Re-measure after the scheduled re-check date and compare against the
  recorded baseline: a refresh is judged by the data, not by the
  effort spent on it.
- Audit the decay log: every decision carries its reason and date, and
  a decision without a reason is a gap to close, not a detail to skip.

## Best Practices

- Review decay on a schedule (monthly for large sites, quarterly
  for small ones) instead of waiting for a visible traffic drop;
  decay caught early is a light refresh, decay caught late is a
  rebuild.
- Compare year over year, not just month over month: seasonality
  is the most common false alarm in decay work.
- Group decay by section or cluster: if a whole cluster is
  decaying together, the cause is usually topical (intent shift,
  a stronger competitor cluster) rather than page-level.
- Look at the page's queries, not just its totals: a page can
  lose its main query while gaining long-tail queries, which
  changes the diagnosis.
- When a page's demand has genuinely declined (Trends shows the
  topic fading), say so: not every decline is fixable, and
  refreshing a page nobody searches for wastes effort.
- Keep the decay log next to the refresh log from
  `content-refresh` so diagnosis and action stay linked.

## Security Considerations

- Search Console and analytics data used for diagnosis is
  confidential; do not include it in public documents or share it
  outside the engagement.
- When removing pages, check they do not carry legal, compliance,
  or archival content that must be retained (terms, disclosures,
  published corrections). Removal decisions need a second look
  for regulated content.
- Redirects must go to real, equivalent pages; redirecting a
  removed page to an unrelated page to preserve its links
  misleads users and search engines.

## Performance Considerations

- Decay diagnosis is analysis work; the cost is time. Automate
  the mechanical parts (exports, period comparisons, flagging
  declining pages) and spend judgment on diagnosis and decisions.
- Use the Search Console API for regular exports instead of
  manual downloads when the site has many pages; the interface
  keeps 16 months, and an export preserves history beyond that.
- Batch decisions by cluster so related pages are decided
  consistently and internal links stay coherent.

## Common Mistakes

- Calling a seasonal dip decay and rewriting a page that was fine.
- Diagnosing decay during a core update rollout, before the
  results have settled.
- Deleting pages as a first resort instead of a last one.
- Refreshing the facts but ignoring an intent shift, so the
  updated page still answers the wrong question.
- Redirecting a decaying page to the homepage instead of the
  closest matching page.
- Fixing cannibalization by deleting one of the competing pages
  without redirecting it or moving its best content to the owner.
- Treating an impressions-only decline as a content problem when
  the cause is demand (fewer searches) or a reporting change.
- Making refresh decisions without recording the diagnosis, so
  the refresh (in `content-refresh`) starts from scratch.

## Examples

Example decay diagnosis table (figures are illustrative of the
format, not benchmarks):

```text
Page                     Clicks     Impressions  Diagnosis
                         16-mo trend 16-mo trend
-----------------------  ----------- ------------ ----------------
/sourdough-wont-rise/    falling     falling      Stale facts; top
                                                 results now cover
                                                 cold-kitchen fixes
                                                 this page lacks.
/best-bread-flour/       falling     steady       SERP now shows a
                                                 shopping unit above
                                                 organic results.
/starter-ratio/          falling     falling      Cannibalization:
                                                 /sourdough-starter/
                                                 also ranks for
                                                 "starter ratio".
/bread-history/          falling     falling      Demand decline;
                                                 Trends shows the
                                                 topic fading.
```

Example decision record:

```text
Page: /sourdough-wont-rise/
Diagnosis: stale facts + missing subtopic (cold-kitchen fixes).
Evidence: clicks and impressions falling for 4 months; SERP check
  2026-11-20 shows top results covering cold-kitchen fixes.
Decision: refresh (medium scope) — hand to content-refresh with
  this diagnosis. Re-check 2026-12-18.
```

## Validation Checklist

- [ ] Declining pages were found from 16 months of Performance data.
- [ ] Data anomalies, updates, seasonality, and site-wide causes
      were ruled out before any page was diagnosed.
- [ ] Each flagged page has a one-sentence diagnosis with evidence.
- [ ] Cannibalization was checked for each flagged page's query.
- [ ] The SERP was re-checked for intent shift on decaying pages.
- [ ] Every page has a recorded decision: refresh, redirect,
      remove, or monitor — with a reason and a re-check date.
- [ ] No page was deleted during or immediately after an update rollout.
- [ ] Refresh decisions were handed to `content-refresh` with the diagnosis.

## Expected Deliverables

- A decay report: flagged pages, the shape of each decline, the
  diagnosis, and the evidence.
- A prioritized action list with a decision per page (refresh,
  redirect, remove, monitor) and the reason for each.
- A decay log recording decisions, dates, and later outcomes.
- Refresh briefs for `content-refresh`, each carrying its diagnosis.

## References

- [Debugging drops in Google Search traffic](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops) —
  Google's causes and investigation method for traffic drops.
- [Google Search's core updates and your website](https://developers.google.com/search/docs/appearance/core-updates) —
  waiting periods and deletion as a last resort.
- [Performance report (Search results)](https://support.google.com/webmasters/answer/7576553) —
  the metrics and dimensions behind decay detection.
- [Data anomalies in Search Console](https://support.google.com/webmasters/answer/6211453) —
  logging issues that mimic decay.
- [Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects) —
  permanent redirect guidance for the redirect decision.
- Related skills in this repository: `content-refresh`,
  `serp-analysis`, `search-console`, `seo-audit`, `technical-seo`,
  `canonical-management`, `serp-monitoring`, `topical-authority`.
