# Scheduled-Maintenance Workflow Verification

> **Run 1 conclusion: FAILURE** (2 of 3 jobs passed).
> **Run 2 conclusion: SUCCESS** (4 of 4 jobs passed — see §8).
> This document records the actual outcomes of the first two
> executions of `.github/workflows/scheduled-maintenance.yml` on
> GitHub. Run 1 failed on runner-IP bot-protection, not on dead
> links (see §3 and finding MW-01, now CLOSED). Run 2 went green
> end to end after the MW-01 fix — and exposed one new defect in
> the freshness job's checkout (MW-05, fixed; re-verification in
> run 3). Nothing here is smoothed over.

- **Phase:** 5 of the SkillForge production-hardening mission
  (Group B).
- **Date verified:** 2026-11-22.
- **Branch under test:** `main` (the workflow resolves
  `workflow_dispatch` against the default branch).
- **Workflow file:** `.github/workflows/scheduled-maintenance.yml`
  (read-only for this phase — not edited).

> **Note on the working tree:** this verification covers the
> workflow as committed at `b86b469` and as it ran in
> 44970737145 (three jobs). A fourth job (`freshness` — skill
> freshness scoring, Phase 7) was added to the file during the
> hardening mission and first executed in run 44980101979 (§8),
> along with the Phase 15 upstream-report steps (JSON report
> artifact, 30-day retention).

## 1. The run

| Field | Value |
| --- | --- |
| Run ID | `44970737145` |
| Workflow | Scheduled maintenance |
| Event | `workflow_dispatch` (manual dispatch by the coordinator) |
| Branch | `main` |
| Commit SHA | `b86b4696e518a87edded3f0f55ef0643fd08c3cd` (`b86b469`, "CI: add Gitleaks secret scanning; branch protection enabled") |
| Created | 2026-11-22T01:17:15Z |
| Completed | 2026-11-22T01:21:24Z (~4m 9s wall clock) |
| Conclusion | **failure** |
| URL | https://github.com/luxmanbhattarai/SkillForge/actions/runs/44970737145 |

This was the first execution of `scheduled-maintenance.yml` on
GitHub: the workflow only exists on `main` since the production
upgrade re-merge (2026-11-21), and `workflow_dispatch` resolves
against the default branch, so no earlier run was possible.

## 2. Job results

| Job | Job ID | Result | Duration | Command |
| --- | --- | --- | --- | --- |
| Verify links online (`online-links`) | `137049730564` | **FAILED** | 4m 6s | `node scripts/check-links.mjs --online` |
| Detect stale skill verification (`stale-verification`) | `137049730180` | passed | 9s | `npm run query -- stale --days 180` |
| Monitor upstream sources (`upstream`) | `137049729907` | passed | 10s | `npm run check:upstream` |

### 2.1 Verify links online — FAILED

Failed step: **Verify external links online** (`.github#54`,
"Process completed with exit code 1"). The setup steps (checkout,
Node 24) passed.

Checker output (from the job log):

```text
Checking 605 unique external URLs (HEAD requests)...
Checked 75 internal links; 605 unique external URLs (560 checked live, 45 skipped: example domains / documented exceptions).
  ERROR https://www.domainlanguage.com/ddd/: HTTP 403 (referenced from skills/architecture/domain-driven-design/SKILL.md)
  ERROR https://orval.dev: HTTP 403 (referenced from skills/backend/api-client-generation/SKILL.md)
  ERROR https://scholar.google.com/: HTTP 403 (referenced from skills/content/content-research/SKILL.md)
FAIL: 3 error(s).
```

560 URLs checked live, 45 skipped under documented exceptions
(example domains, bot-blocked hosts, login-required dashboards),
3 errors — all HTTP 403, all after the checker's built-in retries
(3 attempts, HEAD with GET fallback; see §4).

### 2.2 Detect stale skill verification — passed

```text
No skills are stale (all verified within the last 180 days, cutoff 2026-05-26).
```

Exit 0. The query CLI exits 1 when stale skills exist, so a future
run with stale skills will fail this job loudly rather than
reporting success (verified in `scripts/query-skills.mjs`: the
`stale` command's documented contract is "exits 1 when any are
stale, 0 when none are").

### 2.3 Monitor upstream sources — passed

All 6 pinned vendor repos are up-to-date against their pins:

| Vendor | Repo | Pinned = head |
| --- | --- | --- |
| Anthropic | anthropics/skills | `e4bb5d96` (2026-11-16) |
| Vercel | vercel-labs/agent-skills | `5a37a632` (2026-11-20) |
| Superpowers | obra/superpowers | `22f0b463` (2026-11-03) |
| Prisma | prisma/skills | `a6f19295` (2026-11-09) |
| Marketing Skills | coreyhaines31/marketingskills | `5b2b400e` (2026-11-20) |
| Agentic SEO | pwg-projects/agentic-seo-skill | `67775741` (2026-03-03) |

Live-upstream drift (S-14, known and documented): the agentic-seo
import trails its author's live repo
(Bhanunamikaze/Agentic-SEO-Skill, head `445c46c2`, 2026-10-14) by
**50 commits**. The job reports this in its summary line and still
exits 0 — by design. The upstream job is monitoring, not gating:
the workflow comment and the script both state it exits 0 even when
upstreams have moved. The drift is visible in the log; it is not
silently ignored, and it is not a failure of this run.

## 3. Root cause of the link-job failure (verified, not assumed)

The three failing URLs were re-checked from this environment on
2026-11-22 (~01:25 UTC) with `curl`, both GET and HEAD, with the
default and a browser user agent:

| URL | GET (default UA) | GET (browser UA) | HEAD |
| --- | --- | --- | --- |
| https://www.domainlanguage.com/ddd/ | 200 | 200 | 200 |
| https://orval.dev | 200 | 200 | 200 |
| https://scholar.google.com/ | 200 | 200 | 200 |

All three are live. The 403s are specific to the GitHub Actions
runner environment: these hosts' bot protection blocks requests
from datacenter IP ranges (the same class as the 45 URLs already
carried as documented exceptions in `scripts/check-links.mjs` —
martinfowler.com, w3.org, support.google.com, and others, all
returning 403/404/timeouts to the checker while being real pages).
The checker already retried each URL 3 times with a GET fallback,
so this is not a transient flap — it is a stable per-environment
block that will recur on every weekly run until the three URLs are
handled the same way as the existing exceptions.

**What this means:** the workflow did its job — it surfaced three
URLs the checker cannot verify from a runner. The library's links
are not broken. But the run conclusion is `failure`, and left
unfixed the weekly schedule will fail every Monday on the same
three URLs, training everyone to ignore the workflow's red status
— which is exactly how a genuinely dead link would later slip
through unnoticed.

## 4. Workflow verification checklist

Read from `.github/workflows/scheduled-maintenance.yml` at
`b86b469` and cross-checked against the run and the scripts it
invokes.

| Check | Result | Evidence |
| --- | --- | --- |
| Permissions least-privilege | ✅ pass | Top-level `permissions: contents: read`. No job writes anything; the upstream job uses the default `GITHUB_TOKEN` read-only (and works unauthenticated). |
| Scheduled trigger | ✅ pass | `cron: "0 7 * * 1"` — weekly, Monday 07:00 UTC, after the 06:00 security audit. |
| Manual dispatch | ✅ pass | `workflow_dispatch` present; this run was dispatched manually and executed. |
| Concurrency controls | ✅ pass | `concurrency: { group: scheduled-maintenance, cancel-in-progress: false }` — runs serialize, never cancel, so overlapping 600-URL bursts cannot double rate-limit pressure. |
| Timeouts | ✅ pass | `timeout-minutes: 30` (links), `10` (stale, upstream). The link job took 4m 6s — well inside its budget. |
| Retry behavior | ✅ pass | No workflow-level retries (correct: re-running a whole 600-URL burst on failure would double host load). Retries live in the scripts where they belong: `check-links.mjs` retries 403/429 + network errors (3 attempts, HEAD with GET fallback), `check-upstream.mjs` retries 429/5xx + timeouts. |
| Error reporting | ✅ pass | Failures fail the job and the run: `bash -e` propagates the script's exit 1, GitHub annotated the run ("Process completed with exit code 1", `.github#54`). The link checker prints each failing URL with its referencing file. |
| Failures not silently ignored | ✅ pass | Online-links fails the run on any error (this run proves it). Stale-verification exits 1 when skills are stale. Upstream drift is printed in the log summary even though the job exits 0 by design (monitoring, documented). |
| Pinned actions | ✅ pass | `actions/checkout@3d3c42e…` (v7.0.1) and `actions/setup-node@949feb2…` (v7.1.0) — SHA-pinned, matching the repo's current pins. |
| Node version | ✅ pass | Node 24 everywhere, matching `engines`. |
| Artifact retention | ⚠️ finding MW-02 | No artifacts are uploaded (0 artifacts on this run). Results exist only in job logs (GitHub default retention: 90 days). |
| Failure notification | ⚠️ finding MW-03 | No notification step: a failed scheduled run is visible only in the Actions UI (and to repo watchers' email, if configured). Nothing files an issue or pings a channel. |

## 5. Findings

### MW-01 — Online link job fails on three bot-blocked (403) URLs (Medium) — CLOSED

`domainlanguage.com/ddd/`, `orval.dev`, `scholar.google.com`
return 403 to the GitHub runner's requests (after retries and GET
fallback) while returning 200 everywhere else. **Fixed** in
commit `48d677c`: the three URLs were added to EXCEPTIONS in
`scripts/check-links.mjs` (all re-verified 200 via curl GET +
HEAD, 2026-11-22, before excepting — the same treatment as the
existing exceptions). **Verified fixed** by run 44980101979 (§8):
the link job passed with 0 errors (609 URLs, 560 checked live,
49 skipped).

### MW-05 — Freshness job's shallow checkout inflates AGING (Medium) — CLOSED

Run 44980101979's freshness job reported **224 FRESH / 47 AGING /
6 STALE** with "277 skill(s) changed after their last
verification date" — but a full-history run at the same tree
reports **266 FRESH / 5 AGING / 6 STALE** ("175 changed after
verification"). **Cause (verified by a local shallow-clone
probe):** the job used the default checkout (`fetch-depth: 1`),
so `git log` sees only HEAD — and HEAD as a root commit has no
parent, so its diff lists EVERY file in the tree (1,011 skill
files in the probe). The scorer's `collectLastChanges` then maps
every skill to the HEAD date (2026-11-22), after every
`last_verified`, zeroing the 15-point stability component for all
277 skills. The job still PASSED (it fails only on CRITICAL, and
there are 0), but its headline numbers were wrong.
**Fix** (`f40efb5`): `fetch-depth: 0` on the freshness job's
checkout, with a comment recording the mechanism (same precedent
as the Gitleaks job in security-audit.yml). **Verified fixed**
by run 44980945385 (§9): the freshness job reported 266 FRESH /
5 AGING / 6 STALE — exactly the full-history numbers. Follow-up
idea (not implemented): a script-level guard — treat a shallow
repo (`.git/shallow` present) as unknown history and exclude the
stability signal, instead of trusting wrong dates.

### MW-02 — No artifacts: run results live only in logs (Low)

The workflow uploads no artifacts, so the link-check output, the
stale list, and the upstream drift report exist only in job logs
(90-day GitHub retention, not searchable, not diffable run to
run). Consider uploading a small summary artifact per job (or
accepting logs as the record — the current design choice, not a
defect). Any change is a workflow edit, which is outside this
phase's scope.

### MW-03 — No failure notification for scheduled runs (Low)

A failed weekly run notifies nobody except through the Actions UI
/ watcher email. If the owner does not watch the repo's Actions
tab, a failing maintenance run (like this one) can sit unnoticed
until the next Monday. Options: a workflow step that opens an
issue on failure, or relying on GitHub's scheduled-workflow
failure emails to the repo owner. Decision needed from the
coordinator/owner; no change made here.

### MW-04 — S-14 live-upstream drift still open (Info, known)

Agentic SEO remains 50 commits behind its author's live repo
(head `445c46c2`, 2026-10-14). Already tracked as S-14; the
monitor now reports it correctly (the earlier "reports
up-to-date while live upstream moves" defect is fixed). No action
in this phase.

## 6. Artifact references

- Run: https://github.com/luxmanbhattarai/SkillForge/actions/runs/44970737145
- Jobs: online-links `137049730564` (failed), stale-verification
  `137049730180` (passed), upstream `137049729907` (passed).
- Artifacts uploaded by the run: **0** (the workflow defines no
  `upload-artifact` steps). Job logs are the only record, retained
  per GitHub's default (90 days).
- Log excerpts quoted in §2 are verbatim from `gh run view --log`
  / `--log-failed` output for this run.

## 7. Verdict

**PASS (after run 2).** Run 1 was PARTIAL: the workflow itself
was sound (permissions, triggers, concurrency, timeouts, retries,
and error reporting all verify as designed, and the failure was
surfaced loudly rather than swallowed), but the run as a whole
failed on MW-01. Run 2 (§8) went green end to end — all 4 jobs,
including the first-ever freshness job and the Phase 15
upstream-report steps — after the MW-01 fix. Run 2 exposed MW-05
(freshness shallow checkout), fixed in `f40efb5` and verified
fixed by run 3 (§9). The weekly schedule (Mondays 07:00 UTC) can
now run unattended; the first scheduled run is still the real
proof of the unattended loop.

## 8. Second run — 44980101979 (SUCCESS, 4/4 jobs)

| Field | Value |
| --- | --- |
| Run ID | `44980101979` |
| Workflow | Scheduled maintenance |
| Event | `workflow_dispatch` (manual dispatch by the coordinator) |
| Branch | `main` |
| Commit SHA | `14ec4e7e03d4d711ef8814c61aebadc0aa48099f` (`14ec4e7`, "fix(tests): canonical-head assertion must not hardcode a hash") |
| Created | 2026-11-22T03:19:33Z |
| Completed | 2026-11-22T03:24:15Z (~4m 42s wall clock) |
| Conclusion | **success** |
| URL | https://github.com/luxmanbhattarai/SkillForge/actions/runs/44980101979 |

### Job results

| Job | Job ID | Result | Duration | Command |
| --- | --- | --- | --- | --- |
| Verify links online (`online-links`) | `137078531431` | **passed** | 4m 37s | `node scripts/check-links.mjs --online` |
| Detect stale skill verification (`stale-verification`) | `137078531373` | passed | 6s | `npm run query -- stale --days 180` |
| Monitor upstream sources (`upstream`) | `137078531329` | passed | 15s | `npm run check:upstream` (+ `--out` report step, artifact uploaded) |
| Score skill freshness (`freshness`) | `137078531148` | passed | 7s | `npm run freshness -- --fail-on-critical` |

### Link job — MW-01 verified fixed

```text
Checking 609 unique external URLs (HEAD requests)...
Checked 262 internal links; 609 unique external URLs (560 checked live, 49 skipped: example domains / documented exceptions).
PASS.
```

0 errors (run 1: 3 errors). The 3 MW-01 URLs are now among the
documented exceptions (49 skipped vs 45 in run 1); 4 new URLs
appeared since run 1 (609 vs 605 — new docs added links).

### Freshness job — first execution, passed, numbers wrong (MW-05)

```text
Freshness report — reference 2026-11-22, commit 14ec4e7 (warn 180d / critical 365d)
Scored 277 skills: 224 FRESH, 47 AGING, 6 STALE, 0 CRITICAL, 0 UNVERIFIED.
Note: no --links-report supplied — the external-link signal was excluded for every skill.
Note: 277 skill(s) changed after their last verification date.
```

Exit 0 (fails only on CRITICAL; 0 CRITICAL). But the 47 AGING
is a shallow-checkout artifact — see MW-05. True numbers at the
same tree (full history): 266 FRESH / 5 AGING / 6 STALE /
0 CRITICAL, mean 88.3. The 5 true AGING skills:
platform-social-images, social-preview, twitter-card-images,
twitter-cards (all 73.5, verified-with-limitations + changed
after verification) and web-design-guidelines (79.7). The mean
fell from 95.9 (at `b86b469`) to 88.3 because the hardening
mission itself edited 175 skills after their `last_verified`
dates (disclosure migration, accessibility content, date
cleanup) — the scorer correctly notes the verification no longer
covers the current content. Those skills' scores recover when
they are re-verified; bumping `last_verified` without
re-verification would fabricate verification and was not done.

### Upstream job — all 6 vendors UP-TO-DATE

All 6 pinned vendor repos report "UP-TO-DATE: pinned commit is
the main head". The Phase 15 report step also ran and uploaded
the `upstream-change-report` artifact (30-day retention).
S-14 drift (agentic-seo 50 commits behind live upstream) is
still reported, unchanged from run 1.

## 9. Third run — 44980945385 (SUCCESS, 4/4 jobs; MW-05 verified fixed)

| Field | Value |
| --- | --- |
| Run ID | `44980945385` |
| Workflow | Scheduled maintenance |
| Event | `workflow_dispatch` (manual dispatch by the coordinator) |
| Branch | `main` |
| Commit SHA | `4ea561c` (head at dispatch; includes the MW-05 `fetch-depth: 0` fix from `f40efb5`) |
| Created | 2026-11-22T03:30:28Z |
| Completed | 2026-11-22T03:34:51Z (~4m 23s wall clock) |
| Conclusion | **success** |
| URL | https://github.com/luxmanbhattarai/SkillForge/actions/runs/44980945385 |

| Job | Job ID | Result |
| --- | --- | --- |
| Verify links online (`online-links`) | `137081089569` | passed (609 URLs, 560 checked live, 49 skipped, 0 errors) |
| Detect stale skill verification (`stale-verification`) | `137081089633` | passed (none stale) |
| Monitor upstream sources (`upstream`) | `137081089397` | passed (all 6 UP-TO-DATE) |
| Score skill freshness (`freshness`) | `137081089662` | passed |

Freshness job output (verbatim):

```text
Freshness report — reference 2026-11-22, commit 4ea561c (warn 180d / critical 365d)
Scored 277 skills: 266 FRESH, 5 AGING, 6 STALE, 0 CRITICAL, 0 UNVERIFIED.
Note: 175 skill(s) changed after their last verification date.
```

Exactly the full-history numbers — MW-05 is CLOSED. The
maintenance loop is now verified green twice in a row (runs 2
and 3) with all 4 jobs.
