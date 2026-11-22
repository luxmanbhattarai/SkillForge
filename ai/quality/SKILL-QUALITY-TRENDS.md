# Skill Quality Trends

How SkillForge measures library quality over time: one JSON snapshot
per commit, comparable across releases, with regressions detected by
comparison — never by estimation.

- Tool: `scripts/quality-trends.mjs` (tests: `test/quality-trends.test.mjs`)
- Snapshots: `ai/quality/history/<YYYY-MM-DD>-<shortsha>.json`
- Generated: 2026-11-21, on `feat/production-hardening` @ b86b469

## Scoring definitions

No metric here invents a definition. Every metric reuses an existing
measurement source:

| Metric family | Source | Definition (pointer) |
| --- | --- | --- |
| `score.*` (mean overall + 8 dimensions) | `scripts/score-skills.mjs --json` | 22-element standard; 8 dimensions 0–100 (accuracy-proxy, completeness, actionability, security, testing, documentation, versioning, maintainability), hard caps (security hit → ≤40, missing section → ≤50, placeholder → ≤60). See the header of `scripts/score-skills.mjs`. Accuracy is a **proxy** (no placeholders, no broken relative links, https links) — never proof of technical correctness |
| `score.critical`, `score.below70` | Same scorer output | Skills with a `CRITICAL` flag (security pattern hit); skills scoring below 70 |
| `flags.*`, `flags.totalFlagged`, `flags.flaggedPct` | Same scorer output, per-skill `flags` | Flag type = text before the first `:` (`versioning`, `accessibility`, `accuracy-proxy`, `completeness`, `critical`). See "Flag trends" below |
| `categoryMean.<cat>` | Same scorer output | Mean overall score per category |
| `verification.*` | `sources/verification-status.json` | Audit split: verified / verified-with-limitations / needs-correction / unverified |
| `security.*` | `scripts/security-scan.mjs --json` | Findings count + files scanned (29 patterns + hash manifest) |
| `links.*` | `scripts/check-links.mjs` (offline) | Broken internal (relative) links; internal links checked; external URLs listed (not fetched — `--online` is out of scope for a snapshot) |
| `validation.*` | `scripts/validate-skills.mjs` (normal mode, not `--strict`) | Error/warning counts + skills checked. `--strict` fails on warnings, which would conflate warnings with errors |
| `a11y.coveragePct` | Scorer flags, applicable categories (`frontend`, `media`, `content`, `metadata` — the scorer's set) | Share of applicable-category skills WITHOUT the `accessibility:` flag. **Loose-regex proxy**: the scorer's regex (`/accessib|wcag|aria|…/i`) matches "variable" and generic "accessible" — see `ai/quality/ACCESSIBILITY-COVERAGE.md` |
| `a11y.docCoveragePct`, `a11y.applicableSkills`, `a11y.withGuidance` | `sources/accessibility-classification.json` + skill files, Phase 8 rule | The authoritative a11y metric: applicable skills (95) carrying a `### Accessibility` subsection with ≥4 non-empty lines, or whole-skill guidance with substantive content. Exact rule copied from `test/accessibility-coverage.test.mjs` |
| `freshness.verifiedWithin365dPct`, `freshness.missingLastVerified` | `registry/skills.json` `last_verified` vs the snapshot **commit date** | Share of dated skills verified within 365 days of the commit (not of today — historical snapshots compare fairly). `freshness.report` records the dedicated `ai/quality/freshness-report.json` summary when that file exists |
| `disclosure.*` | `ai/quality/disclosure-coverage.json` when present (another worker's data file) | See "Progressive-disclosure coverage" below. Never computed here |
| `tests.*` | `node --test` summary (TAP or spec format) | Passed / failed / pass rate / skipped. Run with the tree's OWN scripts (see Methodology) |
| `evals.*` | `evals/reports/latest.json` (existing artifact) | Pass rate / total / failed, with provider recorded. **Never run by this script** — and the report is gitignored, so evals are measurable only from a working copy that has run evals (see Limitations) |
| `counts.*` | `registry/*.json` (read, never regenerated) | Total/original/upstream skills, categories, agents, workflows |

Metric directions (what a comparison calls a regression) live in
`METRIC_DEFS` in the script, with prefix rules for dynamic ids:
`flags.*` is lower-is-better, `categoryMean.*` is higher-is-better,
`counts.*` is neutral (a change is reported, never a regression).

## Snapshot format

One JSON file per snapshot, named `<commit-date>-<shortsha>.json`:

```json
{
  "format": "skillforge-quality-snapshot",
  "version": 1,
  "generated": "2026-11-21T…",
  "commit": { "hash": "…", "short": "b86b469", "date": "2026-11-21T18:05:07-07:00", "branch": "feat/production-hardening" },
  "metrics": {
    "score.meanOverall": { "value": 87, "source": "scripts/score-skills.mjs --json" },
    "flags.versioning": { "value": 110, "source": "scripts/score-skills.mjs --json (per-skill flags)" }
  },
  "details": {
    "flags": { "histogram": { "versioning: no version info in Prerequisites": 110 }, "byType": { "versioning": 110 }, "totalFlagged": 115 },
    "categories": { "content": { "n": 19, "meanOverall": 76.7, "flagged": 19 } },
    "a11y": { "applicable": 95, "withGuidance": 16, "lacking": ["…"] }
  },
  "unavailable": [
    { "id": "evals.*", "reason": "evals/reports/latest.json not present at this commit (evals are never run by this script)" }
  ]
}
```

- `metrics` holds only measured values. Anything unmeasurable is
  listed in `unavailable` with a reason — **never estimated, never
  silently zero**.
- `details` holds non-compared supporting data: the exact flag
  histogram, the per-category table, and the a11y lacking-list.
- Comparison (`compare A B`) iterates the union of metric ids. A
  metric measured on one side only is reported as `only-in-older` /
  `only-in-newer`, never estimated from the other side. One
  exception: `flags.*` counts are zero-filled when **both**
  snapshots have scorer data — a flag type fixed to zero is an
  improvement (1 → 0), not a disappearance. When one side has no
  scorer data at all, its flag counts stay one-sided.
- `compare` exits 1 when any metric regressed, 0 otherwise, so a
  scheduled run can gate on it.

## Methodology: one ruler, one exception

Historical snapshots are measured in a temp worktree (`git worktree`
in `/tmp`, removed afterwards) with the **current** measurement
scripts staged into it — the tree differs, the ruler does not. A
v1.0.0 skill scored with the current scorer is the only way to
compare it with a v1.1.0 skill.

**One exception: the test suite runs with the tree's own scripts,
before staging.** Tests assert the behavior of the code of their own
era. This was learned the hard way during this mission: an early
v1.1.0 snapshot ran its tests against staged current scripts and
reported 8 failures — all artifacts. The current installer refuses
needs-correction skills (finding #3's fix), so the v1.1.0-era S-08
installer tests failed (one install counted 271 skills instead of
277 — exactly the 6 refused skills), and the current validator's new
hardcoded-date rule failed the v1.1.0-era validate tests. With the
tree's own scripts, the HEAD suite measured 324/1/1 (see below).
Scores and checks, by contrast, are standards applied to content, so
the current ruler is right for every tree.

A second lesson from the same runs: parallel workers edit the
measurement scripts while snapshots run. The first snapshot round
caught a validator edit mid-run (the hardcoded-date check landed
between the HEAD and v1.1.0 snapshots), which made
`validation.errors` incomparable across that round (110 at v1.1.0
vs 0 at HEAD, same skill content). The snapshots in
`ai/quality/history/` are the regenerated round: after generating
them, the staged measurement scripts were diffed across the three
worktrees and verified identical, so every metric in the comparison
below was measured with one ruler.

`validation.errors` therefore means "violations of the CURRENT
rules", not "errors at the time" — the hardcoded-date rule did not
exist at v1.0.0/v1.1.0, but the pattern it flags did. Read the
19 → 110 rise that way: the pattern grew with the library, and the
rule now counts it.

## First snapshot results (HEAD, b86b469)

File: `ai/quality/history/2026-11-21-b86b469.json`
(commit `b86b469`, 2026-11-21, generated 2026-11-22T02:03:57Z from a
clean worktree). 58 metrics measured, 4 unavailable (`evals.*`,
`freshness.report`, `a11y.docCoverage*`, `disclosure.*` — see
Limitations).

| Area | Result |
| --- | --- |
| Library | 277 skills (228 original, 49 upstream), 18 categories, 24 agents, 16 workflows |
| Mean overall score | **87/100** (accuracy 100, completeness 99, actionability 91, security 95, testing 37, documentation 99, versioning 78, maintainability 98) |
| CRITICAL / below 70 | 0 / 0 |
| Flagged skills | 108 of 228 (47.4%): 102x versioning, 24x accessibility (see Flag trends — the versioning count uses the new scorer rule) |
| Verification | 92.1% verified (255 verified, 16 with limitations, 6 needs-correction, 0 unverified) |
| Security scan | 0 findings (1,137 files scanned) |
| Links | 0 broken internal (75 internal checked, 605 external listed) |
| Validation (current rules) | **110 errors**, 5 warnings — all 110 errors are the hardcoded version-date pattern ("as of 2026-11-20", Finding 4), counted by the new validator rule; see Methodology |
| Accessibility (scorer proxy) | 61.3% of applicable-category skills mention accessibility |
| Freshness | 100% verified within 365 days of the commit date; 0 missing `last_verified` |
| Tests (era-accurate) | **324 passed, 1 failed, 1 skipped (99.7%)** |
| Lowest category | content, mean 76.3 (19 skills) |

Two notes on the test result. First, the failing test was not
identified: the snapshot keeps counts only, and the suite cannot be
re-run to identify it — full-suite runs were suspended during this
mission (quota instruction: the suite includes the real-model eval
test, and the Gemini key is exhausted). Second, an earlier round
measured 325/0/1 on the same tree, so the result varies by one test
run to run under load — most likely a timing-sensitive installer
test (the machine was heavily loaded by parallel workers' suites at
the time). Neither run is "the" result; the snapshot records the
run it took, and the variance is stated here rather than hidden.

## v1.0.0 / v1.1.0 comparison (measured values only)

`compare 2026-11-20-bc304a2.json 2026-11-21-9216cbb.json`:
**28 improved, 2 regressed, 9 unchanged, 8 changed (neutral),
8 only in v1.1.0.** Exit code 1 (regressions present).

Headline improvements (all measured with one scorer version):

| Metric | v1.0.0 | v1.1.0 | Delta |
| --- | --- | --- | --- |
| Mean overall score | 83 | 87 | +4 |
| Mean versioning score | 61 | 78 | +17 |
| Mean testing score | 21 | 37 | +16 |
| Mean security score | 92 | 95 | +3 |
| Skills carrying flags | 139 (78.5%) | 108 (47.4%) | −31 |
| `flags.versioning` | 137 | 102 | −35 |
| CRITICAL skills | 1 | 0 | −1 |
| Skills below 70 | 1 | 0 | −1 |
| Security scan findings | 1 | 0 | −1 |
| Validation warnings | 11 | 5 | −6 |
| Accessibility proxy | 52.9% | 61.3% | +8.4pp |
| Total skills | 226 | 277 | +51 (neutral) |
| Categories | 16 | 18 | +2 (neutral: ai-engineering, desktop) |

Every category mean improved (largest: database +8.2, infrastructure
+7.2, media +7.1, security +6.8, auth +6.2); content improved least
(74.5 → 76.3, +1.8) and remains the lowest category. `flags.accessibility`
was unchanged at 24. The v1.0.0 CRITICAL skill was
`security/secrets-management` (SEC-06 connection string with embedded
password), fixed by v1.1.0 — the same fix accounts for the security
finding 1 → 0.

The two regressions:

1. **Mean maintainability 100 → 98.** Real but small: the 51 new
   skills are longer on average (several over the 350-line full-marks
   threshold), so the length curve costs 2 points.
2. **Validation errors 19 → 110.** A current-rule count, not a
   quality collapse (see Methodology): the new validator flags the
   hardcoded "as of 2026-11-20" pattern, which the upgrade's 51 new
   skills carried along with the existing ones. The pattern count
   grew with the library (19 → 110 occurrences); the fix is Finding
   4's work, and the trend will show it falling.

Only in v1.1.0 (not measurable at v1.0.0): agents (24), workflows
(16), the verification split (92.1% verified), and the two new
categories' means. Tests are unavailable for v1.0.0 (no `test/`
directory at that commit) and were skipped for v1.1.0 (see below),
so no test comparison is recorded in the snapshots.

**v1.1.0 → HEAD (b86b469): 0 improved, 0 regressed, 53 unchanged.**
No skill changed between the two commits (the diff is 6 files:
Gitleaks CI + config, CHANGELOG, README, PROJECT-STATUS,
SECURITY-SCANNING docs), and the comparison confirms it: every skill
metric identical, only `security.scannedTextFiles` +1 (the new
`.gitleaks.toml`). Tests appear as only-in-newer (324/1/1 at HEAD;
skipped at v1.1.0). Exit code 0.

**Test measurements outside the snapshots.** The v1.1.0 suite was
measured twice with staged current scripts — 317/8 and 318/7 — but
both runs are contaminated (see Methodology: the current installer
refuses needs-correction skills and the current validator errors on
hardcoded dates, failing era tests that passed in their era), so
neither number is in the v1.1.0 snapshot, which records `tests.*`
as skipped instead. An era-accurate v1.1.0 run was planned but not
completed: full-suite runs were suspended (quota instruction) before
it could run. The HEAD era-accurate run (324/1/1, above) is the only
clean test measurement in this round; the working-copy run from
earlier in the mission (342/1/1 over 344 tests, including parallel
workers' new test files) is recorded here for reference only — it
measures a moving working copy, not a commit.

## Flag trends (Finding 6)

Baseline, recorded in `ai/test-results/phase5-quality-scores.json`
(generated 2026-11-20; the file records no commit):

- **115 of 228 scored skills carry flags (50.4%).**
- Top flag: **110x** `versioning: no version info in Prerequisites`.
- Second: **24x** `accessibility: no accessibility content
  (applicable category)`.
- Lowest category: **content** — 19 skills, mean 76.7 (lowest 71).
- No other flag types occur at baseline: no `accuracy-proxy`,
  no `completeness`, no `CRITICAL` flags.

Re-verified by running the scorer on the working copy on
2026-11-22 (which includes uncommitted parallel-work edits):
111 flagged (110x versioning, **2x accessibility** — the Phase 8
subsection work already shows), content mean 77.3. The clean-tree
b86b469 snapshot (above) reproduces the Phase 5 baseline exactly
(115 / 110 / 24 / 76.7), confirming the baseline is the committed
state and the working-copy shift is uncommitted Phase 8 work.

**Scorer rule change (Finding 6 fix, 2026-11-22):** the
version-info rule used to miss "N.x" ranges (10.x, 6.x),
v-prefixed majors (v4), bare majors on dotted products (Node.js
24), and standards IDs (BCP 47) — 20 of the 110 flagged skills had
version info the old rule could not see. The current scorer counts
them, so snapshots taken with the new scorer show a lower
`flags.versioning` than the Phase 5 baseline **partly because the
ruler changed, not only because skills were fixed**. The comparison
in this document uses one scorer version for all snapshots, so the
v1.0.0 → v1.1.0 → HEAD deltas are real; the Phase 5 baseline
comparison is ruler-adjusted and noted as such wherever it appears.

The AFTER measurement happens at integration: the snapshot format
already supports it — `flags.*` counts (with zero-fill, so a fixed
flag type reads as an improvement), `flags.totalFlagged`,
`flags.flaggedPct`, and `categoryMean.*` are all compared by
`compare`, with lower-is-better semantics for flags and
higher-is-better for category means. Confirmed by test
(`compareSnapshots covers flag counts, not just means`).

## Progressive-disclosure coverage (Finding 1)

**Status: unavailable in all snapshots taken so far.** The
disclosure worker's data file (`ai/quality/disclosure-coverage.json`)
does not exist yet (checked 2026-11-21/22; neither the script
`scripts/disclosure-coverage.mjs` nor the doc
`ai/quality/PROGRESSIVE-DISCLOSURE-COVERAGE.md` has landed). Every
snapshot records `disclosure.*` as unavailable with that reason, per
the rule that unmeasured metrics are never estimated.

The snapshot contract for the data file, for the disclosure worker
(or the coordinator) to target — a JSON file with a `summary`
object (or top-level fields):

```json
{
  "summary": {
    "totalSkills": 228,
    "skillsWithSubdirs": 0,
    "coveragePct": 0,
    "medianBodyLines": 224.5,
    "maxBodyLines": 468
  }
}
```

- `totalSkills`: original skills counted (upstream excluded —
  disclosure is this repo's standard).
- `skillsWithSubdirs`: skills with at least one of `references/`,
  `scripts/`, `assets/`, `examples/`.
- `coveragePct`: `skillsWithSubdirs / totalSkills * 100` (derived
  from the counts when omitted).
- `medianBodyLines` / `maxBodyLines`: **body lines** — SKILL.md
  lines excluding the frontmatter block.

Reported baseline (user-reported finding #1, verified by direct
measurement for this document):

- **0 of 228 original skills have any disclosure subdirectory**
  (working copy and b86b469 alike).
- Body lines: working-copy median 231 / max 469; b86b469 median
  224.5 / max 468.
- The reported "median 247, max 488" are **total** SKILL.md lines
  including frontmatter (re-measured: working-copy median 247 /
  max 489 — one line added by parallel work since the report;
  b86b469 median 241 / max 488). Do not mix the two definitions
  when comparing.

Once the disclosure JSON lands, the next snapshot picks it up with
no script change, and the before/after of the disclosure migration
becomes a `disclosure.coveragePct` trend.

## Accessibility: two metrics, do not mix them

- `a11y.coveragePct` — the scorer's loose-regex proxy over its four
  applicable categories (62 skills). At b86b469: 61.3%. It counts
  any mention of accessibility, including false positives
  ("variable" contains "aria").
- `a11y.docCoveragePct` — the authoritative metric: 95 applicable
  skills per `sources/accessibility-classification.json`, carrying
  guidance iff they have a substantive `### Accessibility`
  subsection (or whole-skill status). Baseline at the start of
  Phase 8: **16/95 = 16.8%**. The classification file is not in
  git history before the hardening mission, so historical snapshots
  record this metric as unavailable; it is measurable from the
  working copy (and from any commit that includes the file).

## Freshness

- `freshness.verifiedWithin365dPct` is 100% at every snapshot so
  far: all skills carry `last_verified: 2026-11-20`, within 365
  days of every snapshot's commit date. The metric will start
  moving only as verifications age past a year — it is a slow
  metric by design.
- `freshness.report` embeds the dedicated freshness report's
  summary when `ai/quality/freshness-report.json` exists (it does
  in the working copy: 277 skills, 268 FRESH / 3 AGING / 6 STALE /
  0 CRITICAL, mean freshness score 95.9). The file is not in git
  history, so historical snapshots record it as unavailable.

## How to generate future snapshots

```bash
# Current commit (writes ai/quality/history/<date>-<shortsha>.json)
node scripts/quality-trends.mjs snapshot

# Skip the test suite (records tests.* as unavailable)
node scripts/quality-trends.mjs snapshot --skip-tests

# Reuse a pre-run test suite instead of running it
node --test --test-reporter=tap > /tmp/tests.log 2>&1
node scripts/quality-trends.mjs snapshot --test-results /tmp/tests.log

# A historical commit (temp worktree; remove it afterwards)
git worktree add /tmp/sf-wt-v110 v1.1.0
node scripts/quality-trends.mjs snapshot --root /tmp/sf-wt-v110
git worktree remove --force /tmp/sf-wt-v110

# Compare two snapshots (exit 1 if any metric regressed)
node scripts/quality-trends.mjs compare ai/quality/history/2026-11-20-bc304a2.json ai/quality/history/2026-11-21-b86b469.json

# List snapshots
node scripts/quality-trends.mjs list
```

Suggested npm scripts (for the coordinator to add to `package.json`):

```json
"trends": "node scripts/quality-trends.mjs",
"trends:snapshot": "node scripts/quality-trends.mjs snapshot",
"trends:compare": "node scripts/quality-trends.mjs compare"
```

A snapshot with the test suite takes ~5–10 minutes depending on
machine load, dominated by the test suite (~4 min) and the security
scan (~35 s). Without tests (`--skip-tests`) it takes under a
minute. The scorer, link check, and validation take seconds each.

## Limitations

- **Evals are working-copy-only.** `evals/reports/latest.json` is
  gitignored, so no worktree snapshot can measure evals. The HEAD
  snapshot's eval metrics are unavailable; a working-copy snapshot
  (like the one generated during this mission before the worktree
  round) records them from the live report (463/463 mock, 100%).
  If eval history matters, the report needs committing or the eval
  runner needs recording its summary somewhere tracked.
- **v1.0.0 predates several sources.** No verification file, no
  test directory, no agents/workflows registries, no scorer (the
  current scorer was staged in for comparability). Those metrics
  are unavailable for v1.0.0, recorded with reasons.
- **Validation errors are current-rule violations** (see
  Methodology). The hardcoded-date rule did not exist at v1.0.0.
- **The accuracy dimension is a proxy**, and the scorer's a11y
  regex is loose — see the definitions table. Neither is presented
  as proof of correctness or of real accessibility coverage.
- **Snapshots measure the tree, not the working copy** (when run
  with `--root` on a worktree). A snapshot run without `--root`
  measures the working copy including uncommitted changes — the
  first snapshot of this mission did that and showed 2 security
  findings from an uncommitted parallel-worker file, which the
  clean-tree snapshot correctly shows as 0. Prefer worktree
  snapshots for committed history.

## Tests

`node --test test/quality-trends.test.mjs` — 27 tests, all passing
(2026-11-21). Coverage: snapshot determinism given fixed inputs,
missing metrics recorded as unavailable (never estimated),
comparison (regression / improvement / no-change / one-sided /
flag-count zero-fill), TAP + spec test-summary parsing, validate
and link output parsing, the Phase 8 a11y subsection rule,
disclosure normalization, `measureRoot` against a synthetic root
(absent sources unavailable; present a11y/disclosure files read),
and the CLI (`compare` exits 1 on regression, 0 when clean).
