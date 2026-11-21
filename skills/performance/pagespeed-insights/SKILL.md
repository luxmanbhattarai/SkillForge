---
name: pagespeed-insights
description: >
  Use Google PageSpeed Insights to read field data from real users
  (Chrome UX Report) and lab data from Lighthouse for any public URL,
  and turn the results into a prioritized fix list. Use when you need
  to know how a page performs for real users, to compare mobile and
  desktop, or to check whether a change improved field metrics. Covers
  CrUX data, origin versus URL data, and the PageSpeed Insights API.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# PageSpeed Insights

## Purpose

This skill helps an agent use PageSpeed Insights (PSI) to answer one
question: how does this page perform for real users, and what should
change? PSI combines Chrome UX Report (CrUX) field data with a
Lighthouse lab run. The outcome is a clear read of both data sources,
a diagnosis that does not confuse them, and a prioritized fix list.

## When to Use

- Checking how a public page performs for real users before an
  optimization, launch, or redesign.
- Comparing mobile and desktop experience for the same URL.
- Verifying that a shipped change improved field metrics.
- Getting a quick lab-plus-field snapshot without installing tooling.
- Pulling CrUX field data programmatically through the PageSpeed
  Insights API for monitoring or reporting.

## When Not to Use

- When the page is not publicly reachable (localhost, staging behind
  auth, intranet) — PSI cannot fetch it; use `lighthouse` locally
  instead.
- When you need a deep, repeatable lab audit with custom conditions —
  use `lighthouse` with controlled throttling.
- When the task is a full-site review across many pages — use
  `web-performance-audit` to scope the work.
- When field data is unavailable for a low-traffic URL and you need
  real-user metrics anyway — instrument the site directly (see
  `core-web-vitals`).

## Prerequisites

- A public URL that PSI can fetch (no login wall, no bot blocking).
- For API use: an API key from Google Cloud, or accept the lower
  unauthenticated rate limits.
- Enough real traffic for CrUX field data to exist; low-traffic URLs
  show lab data only.
- A baseline reading taken before changes, so improvements can be
  proven.

## Official Documentation

- [PageSpeed Insights](https://pagespeed.web.dev/) — the tool itself.
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/about)
  — how to query PSI programmatically.
- [web.dev — CrUX](https://web.dev/) — how Chrome UX Report field
  data is collected and what the percentiles mean.

## Required Workflow

1. Open PageSpeed Insights and analyze the URL. Wait for both the
   field data section and the lab (Lighthouse) section to load.
2. Read field data first. Note the p75 values for LCP, INP, and CLS
   for the URL, and whether origin-level data is shown when URL data
   is missing. Record whether each metric passes the "good"
   threshold.
3. Read lab data second. Note the Lighthouse performance score, the
   lab values for the same metrics, and the opportunities list with
   estimated savings.
4. Compare field and lab. If they disagree, trust field data for
   "what users experience" and use lab data only to diagnose causes.
   Record the disagreement and its likely reason (different device
   mix, network, or page state).
5. Check both mobile and desktop tabs. Mobile is the default view
   and usually the worse one; do not report desktop numbers as if
   they were the whole story.
6. Prioritize fixes by field impact first, then by lab estimated
   savings. Map each fix to the skill or change that implements it.
7. After shipping fixes, re-run PSI and compare. Field data updates
   on a 28-day rolling window, so expect lab data to improve first
   and field data to follow over days to weeks.

## Implementation Standards

- Always report field and lab data as separate numbers with their
  source labeled. Never blend them into a single "speed" figure.
- State which level the field data covers: URL-level when available,
  origin-level otherwise. Origin data describes the whole site, not
  the specific page.
- If PSI shows "no field data", say so explicitly and do not infer
  real-user performance from the lab score.
- Use the same URL form every time (including or excluding trailing
  slash, www, and query strings) — CrUX treats different URL forms
  as different pages.
- For API use, request the strategy explicitly (`mobile` or
  `desktop`) and store the full JSON response with a timestamp.
- Do not quote a Lighthouse score from PSI without the date and
  strategy (mobile/desktop), because both affect the result.

## Best Practices

- Check the pages that matter most: highest-traffic templates and
  the pages linked from campaigns or search results.
- Re-run PSI at least twice for lab comparisons; lab runs vary, and
  PSI runs on shared infrastructure.
- Use the API for repeated checks and trend tracking; use the web UI
  for one-off reads and for sharing results with others.
- When field data is missing, treat the lab opportunities as a
  starting hypothesis and validate with real-user measurement after
  launch (see `core-web-vitals`).
- Keep a simple log of PSI readings (date, URL, strategy, field p75
  values, lab score) so trends are visible.

## Security Considerations

- PSI analyzes public URLs only. Do not paste URLs containing
  secrets, tokens, or session identifiers into PSI or any third-
  party analysis tool.
- API keys used with the PageSpeed Insights API should be restricted
  in Google Cloud to the PSI API and stored in a secret manager, not
  committed to the repository.
- PSI results are public data for a public URL; do not assume a PSI
  report is private.

## Performance Considerations

- Each PSI run triggers a fresh Lighthouse audit on Google's
  infrastructure; it is not free. Do not poll the API in a tight
  loop or check dozens of URLs every few minutes.
- Field data is a 28-day rolling aggregate — it cannot show the
  effect of a change made today. Plan verification accordingly.
- The API has rate limits; batch checks and cache responses rather
  than re-querying the same URL repeatedly.

## Common Mistakes

- Reporting the lab score as if it were real-user performance — the
  lab run is a single simulated load; field data is what users
  actually experience.
- Ignoring the field-data section because the lab score looks good.
- Comparing a mobile lab score with a desktop field value, or mixing
  URL-level and origin-level data.
- Re-running PSI an hour after a deploy and concluding the fix did
  not work — field data lags by days to weeks.
- Testing a redirect source URL instead of the final destination,
  which measures the redirect chain, not the page.

## Examples

Query the PageSpeed Insights API for a mobile analysis of a URL:

```bash
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com/&strategy=mobile&key=$PSI_API_KEY" \
  -o psi-mobile.json
```

Read the key numbers from the saved response with Node.js:

```js
// Print field (CrUX) p75 values and the lab performance score.
import { readFileSync } from 'node:fs';

const psi = JSON.parse(readFileSync('psi-mobile.json', 'utf8'));
const field = psi.loadingExperience?.metrics;
for (const [key, metric] of Object.entries(field ?? {})) {
  console.log(key, 'p75:', metric.percentile);
}
const score = psi.lighthouseResult?.categories?.performance?.score;
console.log('lab performance score:', score);
```

## Validation Checklist

- [ ] Field data (p75 LCP, INP, CLS) is recorded with its level
      (URL or origin) and date.
- [ ] Lab data is recorded separately, with strategy (mobile or
      desktop) and date.
- [ ] Field and lab disagreement, if any, is noted with a likely
      reason.
- [ ] Both mobile and desktop were checked, or the omission is
      justified.
- [ ] Fixes are prioritized by field impact, then lab savings.
- [ ] A follow-up check date is set to confirm field-data movement
      after the fix ships.

## Expected Deliverables

- A PSI reading: field p75 values, lab score and opportunities, with
  date, strategy, and data level labeled.
- A prioritized fix list mapped to implementing skills or changes.
- A follow-up plan with the date field data should be re-checked.
- Saved API responses or report links for future comparison.

## References

- [PageSpeed Insights](https://pagespeed.web.dev/) — the tool.
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/about)
  — programmatic access to PSI data.
- [web.dev](https://web.dev/) — Core Web Vitals and CrUX guidance.
- Related skills in this repository: `core-web-vitals`, `lighthouse`,
  `web-performance-audit`, `image-optimization`,
  `javascript-optimization`, `caching-strategy`.
