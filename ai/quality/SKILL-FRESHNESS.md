# Skill Freshness Scoring

Phase 7 — automated freshness scoring for every SkillForge skill.
Implementation: `scripts/freshness.mjs`. Tests: `test/freshness.test.mjs`.
First snapshot: `ai/quality/freshness-report.json` (generated 2026-11-22
at commit `b86b469`).

## What "fresh" means here

A skill is fresh when its content was recently verified against current
official documentation **and** nothing has changed since that
verification. Freshness is a property of the *evidence* (the audit),
not of the content's age alone: a skill nobody touched for a year is
not fresh, it is stale — its verification is a year old. Conversely, a
skill edited yesterday is not automatically stale — but its old
verification no longer covers the current content, so it loses the
stability component until it is re-verified.

Two bands exist precisely to keep those cases apart:

- **STALE** — verified long ago (or with known errors). The audit
  happened; its conclusions have expired.
- **UNVERIFIED** — never formally audited, or no parseable verification
  date exists. No audit conclusions exist at all. An unverified skill
  is never marked valid merely because nothing changed: its recency
  and status components score 0 and the band is forced to UNVERIFIED
  regardless of the other signals.

## Signals and weights

Every signal is read from real repo data. No signal is estimated,
inferred from prose, or fetched from the network.

| # | Signal | Weight | Source | What it measures |
| --- | --- | --- | --- | --- |
| 1 | Verification recency | 35 | `sources/verification-status.json` `date` (fallback: registry `last_verified`) | How old the audit is: linear decay from full points at age 0 to 0 at the critical threshold |
| 2 | Verification status | 25 | `sources/verification-status.json` `status` | `verified` 25, `verified-with-limitations` 15, `needs-correction` 0, `unverified` 0 |
| 3 | Content stability | 15 | `git log` over the skill directory (author date, merges excluded, revert/re-apply commits skipped) | 15 when the directory has not changed since verification, 0 when it changed after verification |
| 4 | Internal links | 10 | Relative links in `SKILL.md`, resolved on disk | 10 − 2 per broken link, floor 0 |
| 5 | Documentation completeness | 10 | Required sections present in `SKILL.md` (15 in `scripts/lib/skill-files.mjs`) | 10 × present / 15 |
| 6 | External links | 5 | Optional `--links-report` JSON (see below) | 5 × (1 − broken / total) |

### Why these weights

- **Recency (35) + status (25) = 60 of 100.** Freshness is mostly
  about the audit: how recently it happened and what it concluded.
  These two are the only signals that speak to whether the skill's
  *claims* are current, so together they are the majority.
- **Stability (15).** A post-verification edit invalidates the audit's
  coverage of the current content, but it does not invalidate the
  audit entirely — most edits are small — so it is a real penalty,
  not a disqualification.
- **Internal links (10) + completeness (10).** Hygiene signals: a
  skill with broken links or missing sections is decaying, but a
  complete skill with working links can still be technically stale,
  so neither can dominate.
- **External links (5).** The weakest signal, deliberately: external
  link health says more about the linked sites than about the skill,
  and the input is optional (see below).

### Signals that do NOT apply

A component that does not apply to a skill is **excluded** and the
score is renormalized over the remaining weight — the skill is
neither penalised nor credited for a signal it cannot have:

- **Upstream skills** are exempt from internal links and completeness
  (same policy as `check-links.mjs` and the section standard:
  upstream content is imported verbatim and legitimately references
  files outside the imported subset). Their available weight is 75.
- **External links** are excluded for every skill unless a links
  report is supplied. An unchecked link is neither broken nor
  healthy, so it must not move the score.
- **Stability** is excluded when git history is unavailable or the
  skill has no history (e.g. a fixture tree). The report records
  `gitAvailable` so the exclusion is visible.

## Bands

Score cutoffs: **FRESH ≥ 80**, **AGING 60–79**, **STALE < 60**. Hard
rules can only push a band *down* from the score band, never up.
Precedence: UNVERIFIED > CRITICAL > STALE > AGING > FRESH.

| Band | Rule |
| --- | --- |
| UNVERIFIED | Status is `unverified`/unknown, or no parseable `last_verified` date |
| CRITICAL | Verification age > `criticalDays` |
| STALE | Score < 60, **or** status is `needs-correction` (known errors cap the band even when the score is high) |
| AGING | Score 60–79, **or** verification age > `warnDays`, **or** `last_verified` is in the future (bad data cannot be trusted as fresh) |
| FRESH | Score ≥ 80 and no rule above applies |

Boundary semantics: a threshold trips only when the age is *older
than* N days — age exactly N does not trip it, matching
`query stale`. Both boundaries are covered by tests.

### How the score and the caps interact

With current weights, a perfect original skill's score crosses the
FRESH cutoff at ~198 days without a links report (~209 days with
one), so the 180-day cap is the binding rule for original skills.
A perfect upstream skill (75 available points) crosses it earlier,
at ~156 days, so the score binds first there. An otherwise perfect
original skill can never go score-STALE on age alone (its floor is
60/95 ≈ 63.2); it becomes CRITICAL only through the age hard rule.
These are consequences of the weights, not additional rules — if
the weights change, re-derive them.

## Thresholds

| Threshold | Default | Justification |
| --- | --- | --- |
| `warnDays` | 180 | The repo's existing stale definition: `query stale --days 180` and the `stale-verification` job in `scheduled-maintenance.yml` already use 180 days. Freshness reuses the convention instead of inventing a second one. |
| `criticalDays` | 365 | One full year without re-verification. A skill whose audit is over a year old has outlived every framework release cycle the library tracks; the weekly maintenance job fails on this (see below). |

Both are configurable (see Configuration). `warnDays` must be smaller
than `criticalDays`; anything else is a usage error.

## The git signal, precisely

`collectLastChanges` runs one `git log --no-merges
--format=%aI %s --name-only -- skills` and takes, per skill
directory, the newest commit date:

- **Author date (`%aI`)**, not committer date: the date the change
  was written, not the date it landed.
- **Merges excluded** (`--no-merges`): a merge commit's date is when
  the branch landed, not when content changed.
- **Revert / re-apply commits skipped** (subject matching
  `^Re(vert|apply) "`): they are mechanical tree operations. Without
  this rule, the 2026-11-21 revert pair (revert of PR #1, then
  re-apply) would mark 205 skills "changed after verification" for a
  change that changed nothing. With it, 42 skills genuinely changed
  after their verification date (see the first run below).
- **Day granularity.** Verification dates are dates, not timestamps:
  a change on the same day as the verification counts as covered.
  Same-day edits after the audit are a known blind spot of this
  granularity, not a bug to fix by guessing times.
- **Renames.** A renamed skill directory loses pre-rename history
  for its new path (no `--follow`). No skill has been renamed since
  the library's import; if one is, the stability signal for it will
  read "changed after verification" until its next audit — a safe
  direction to err in.

## Configuration

Thresholds resolve in this order: **CLI flags > config file >
defaults**.

```bash
# CLI flags
node scripts/freshness.mjs --warn-days 90 --critical-days 180

# Config file (JSON: warnDays, criticalDays)
node scripts/freshness.mjs --config ai/quality/freshness.config.json
```

Config file format (no config file is committed; create one only
when the defaults need overriding):

```json
{ "warnDays": 90, "criticalDays": 180 }
```

Other flags:

| Flag | Meaning |
| --- | --- |
| `--reference-date YYYY-MM-DD` | Score as of this date instead of today (UTC). The report records the reference date. Tests use this for determinism. |
| `--links-report <path>` | External-link health input: JSON mapping skill name → `{ "total": n, "broken": n }`. No producer exists yet — `check-links.mjs --online` prints text, not JSON — so the format is defined here for the day one does. Until then the signal stays excluded and the report says so. |
| `--out <path>` | Write the JSON report to this file (in addition to the human summary on stdout). |
| `--json` | Print the JSON report to stdout instead of the human summary. |
| `--fail-on-critical` | Exit 1 when any skill is CRITICAL. Used by the scheduled-maintenance job. |
| `--fail-on-stale` | Exit 1 when any skill is STALE or CRITICAL. |
| `--root <dir>` | Score a different repo root (tests). |

Exit codes: 0 = run completed (bands alone never fail the run);
1 = a `--fail-on-*` gate tripped; 2 = usage error or unreadable
inputs.

## Report format

`--out` writes JSON:

```json
{
  "generated": "2026-11-22",
  "referenceDate": "2026-11-22",
  "commit": "b86b4696e518a87edded3f0f55ef0643fd08c3cd",
  "thresholds": { "warnDays": 180, "criticalDays": 365 },
  "weights": { "recency": 35, "status": 25, "stability": 15, "internalLinks": 10, "completeness": 10, "externalLinks": 5 },
  "bands": { "freshMinScore": 80, "agingMinScore": 60 },
  "summary": {
    "total": 277,
    "byBand": { "FRESH": 268, "AGING": 3, "STALE": 6, "CRITICAL": 0, "UNVERIFIED": 0 },
    "changedAfterVerification": 42,
    "gitAvailable": true,
    "linksReportUsed": false,
    "scores": { "lowest": 66.4, "highest": 99.9, "mean": 95.9 }
  },
  "skills": [
    {
      "name": "accessibility",
      "category": "frontend",
      "sourceType": "original",
      "vendor": null,
      "status": "verified",
      "lastVerified": "2026-11-20",
      "ageDays": 2,
      "lastChange": "2026-11-20",
      "upstreamImported": null,
      "upstreamPin": null,
      "score": 99.8,
      "band": "FRESH",
      "components": { "recency": { "earned": 34.8, "available": 35, "detail": "verified 2 day(s) ago" } },
      "reasons": [],
      "warnings": []
    }
  ]
}
```

Upstream skills additionally carry `upstreamImported` (import date
from `sources/imported-skills.md`) and `upstreamPin` (short SHA of
the pinned upstream commit). These are **informational only**: live
upstream drift needs the network and is `check-upstream.mjs`'s job
(the `upstream` job in `scheduled-maintenance.yml`); freshness
never fetches, so it cannot score drift — and does not pretend to.

## CI integration

`scheduled-maintenance.yml` has a `freshness` job that runs
`npm run freshness -- --fail-on-critical` weekly. It fails only on
CRITICAL (a skill unverified for over a year), not on STALE: the 6
STALE skills today are the known `needs-correction` upstream skills,
whose fixes belong upstream — failing the weekly job on them would
be noise the maintainers cannot act on. STALE skills are still
listed in the job log for review.

## First run (2026-11-22, commit b86b469)

`node scripts/freshness.mjs --out ai/quality/freshness-report.json`
(reference date 2026-11-22, defaults 180/365):

- **277 skills: 268 FRESH, 3 AGING, 6 STALE, 0 CRITICAL, 0 UNVERIFIED.**
  Mean score 95.9; lowest 66.4, highest 99.9.
- The 6 STALE skills are exactly the 6 `needs-correction` skills
  (`prisma-upgrade-v7`, `seo`, `vercel-composition-patterns`,
  `vercel-react-best-practices`, `vercel-react-view-transitions`,
  `web-artifacts-builder`); each scores 66.4 on the numbers and is
  capped at STALE by the known-errors rule.
- The 3 AGING skills: `platform-social-images` and `twitter-cards`
  (verified-with-limitations, edited 2026-11-21 after verification
  on 2026-11-20) and `web-design-guidelines` (verified, re-imported
  from Vercel on 2026-11-21 after verification — score 79.7, just
  under the FRESH cutoff).
- **42 skills changed after their last verification date** (content
  edits on 2026-11-21, after the 2026-11-20 audit). They lost the
  15-point stability component; most remain FRESH on the strength of
  a 2-day-old verification, but their verification no longer covers
  their current content. Re-verification should prioritise these 42.
- No external-links input existed, so that signal was excluded for
  every skill (`linksReportUsed: false`).

## Known limitations (not scored — no machine-readable source)

- **Deprecated APIs / version drift.** No per-skill record of which
  API versions a skill's claims target, so this cannot be scored
  without reading the content. It is covered qualitatively by the
  verification audit itself (the `status`/`note` fields).
- **Known security issues.** The security scan is repo-wide, not
  per-skill; per-skill issues surface through the verification
  status (`needs-correction`) instead.
- **Last successful validation.** Validation (`npm run validate`)
  is repo-wide with no per-skill artifact, so there is no
  per-skill "last validated" signal. The freshness run itself is
  dated, and the report records its commit.
- **Compatibility with current agent environments.** The registry's
  `compatibility` field is free text (mostly null); there is no
  machine-readable per-skill environment matrix to score against.
- **Live upstream drift.** Deliberately out of scope (network);
  see `check-upstream.mjs`.
