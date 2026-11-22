# SkillForge — Production Hardening: Final Report (18-Phase Mission)

**Mission:** 18-phase production hardening (Groups A–F) plus six
user-reported findings, commissioned 2026-11-21.
**Base:** `main` @ `b86b469` ("CI: add Gitleaks secret scanning;
branch protection enabled").
**Head at report time:** `main` @ `4ea561c` (this report itself
lands in the following commit — see the Git-status addendum).
**Work:** 21 commits, 463 files changed (+47,125/−3,483) from
`b86b469` to `4ea561c`.
**Landing:** directly on `main` per the owner's explicit override
("usi ni main branch pe he kr lo sb kuch") — see the Git-status
addendum. No feature branch, no PR.
**Date:** 2026-11-22.

## 1. Executive summary

The hardening mission is complete. Of the 18 phases: **16 PASS,
1 PARTIAL (Phase 3, S-08 — owner disposition still pending),
1 BLOCKED (Phase 4, real-model eval — free-tier quota exhausted)**.
Of the six user-reported findings: **all six addressed with measured
before/after numbers** (§2, §5).

Headline results, all measured:

| Area | Before (main @ `b86b469`) | After (main @ `278343c`) |
| --- | --- | --- |
| Tests (Linux CI) | 326 (325 pass, 0 fail, 1 skipped) | **663 (650 pass, 0 fail, 13 skipped)** |
| Tests (Windows CI) | 330 (325 pass, 0 fail, 5 skipped) | **667 (658 pass, 0 fail, 9 skipped)** |
| Behavioral evals (mock) | 463/463 | 463/463, 0 regressions |
| Skills flagged (scorer) | 115 of 228 | **82 of 228** |
| Scorer mean overall | 87 | **88** |
| Content category mean | 76.7 (lowest 71) | **77.7 (lowest 72)** |
| Accessibility documentation coverage | 61.3% (14/228 classified) | **100% (95/95 applicable)** |
| Progressive disclosure | 0/228 skills | **44/44 needing it migrated** |
| Longest SKILL.md body | 489 lines | **400 lines** |
| Hardcoded "as of 2026-11-20" in skill bodies | 116 in 95 files | **0 (36 genuine-history occurrences kept)** |
| Install profiles | none | **12 profiles** (620–6,770 description tokens vs 25,066 for all) |
| Needs-correction installs | unfiltered (6 install silently) | **refused by default; `--allow-needs-correction` opt-in** |
| Freshness | unscored | **266 FRESH / 5 AGING / 6 STALE / 0 CRITICAL, mean 88.3** |
| Skill history | none | **277/277 skills, 927 entries** |
| Main CI | green | **green on `14ec4e7` (all 4 workflows) after 3 rounds** |

**Phase states:**

| Phase | Title | State | Evidence |
| --- | --- | --- | --- |
| 1 | Canonical docs / evidence reconciliation | PASS | Addendums on 4 audit reports; `ai/PROJECT-STATUS.json` restructured; 9 docs-consistency tests |
| 2 | Branch-protection verification | PASS | `ai/audits/BRANCH-PROTECTION-VERIFICATION.md`; 10 strict checks verified; gaps documented as owner decisions, no settings changed |
| 3 | S-08 remediation | PARTIAL | Restore-path warning gap fixed; risk-acceptance doc has an EMPTY decision table — owner disposition still pending, nothing fabricated |
| 4 | Real-model evaluation | BLOCKED | Framework complete, Gemini adapter verified live; run blocked on the free-tier quota (20/day, exhausted; smoke 0/3 on HTTP 429s) |
| 5 | Scheduled-maintenance execution | PASS | First run 44970737145 FAILED (MW-01, 3 bot-blocked 403s); exceptions added; re-run 44980101979 SUCCESS 4/4 jobs. Run 2 also exposed MW-05 (freshness shallow checkout), fixed in `f40efb5` and re-verified in run 3 (44980945385, SUCCESS — freshness reports 266/5/6) |
| 6 | Distribution architecture | PASS | `ai/architecture/DISTRIBUTION-ARCHITECTURE.md`; `publish-npm.yml` (dispatch-only, dry-run default); SBOM generator. npm name `skillforge` is TAKEN |
| 7 | Freshness scoring | PASS | `scripts/freshness.mjs` (32 tests); freshness job in scheduled-maintenance.yml |
| 8 | Accessibility coverage | PASS | 95/95 applicable skills documented; per-skill classification (228 entries); validation coverage honestly 0% |
| 9 | Dependency integrity | PASS | `scripts/check-references.mjs` (30 tests); real run 0 errors, 3 warnings |
| 10 | Installer integration tests | PASS | 24 tests (23 pass, 1 skipped as root by design); real CLI, temp sandboxes, byte-identical verification |
| 11 | Windows junction validation | PASS | 12 real junction tests on the gating Windows leg: 9 pass, 3 skip with environment reasons; A5-11 passes |
| 12 | Skill changelog | PASS | `scripts/skill-history.mjs` (28 tests); 277/277 skills, 927 entries |
| 13 | Quality trends | PASS | `scripts/quality-trends.mjs` (28 tests); 4 snapshots; b86b469→HEAD: 24 improved, 2 regressed |
| 14 | Multi-model eval infrastructure | PASS | 4 provider adapters + registry (29 tests); Gemini verified live |
| 15 | Upstream PR detection | PASS | Checker extended (18 tests); live dry run: all 6 vendors UP-TO-DATE |
| 16 | Benchmark dashboard | PASS | Generator + first report from mock data (463/463); real-model metrics UNAVAILABLE (honest) |
| 17 | Final audit | PASS | 12-check local battery all green at `14ec4e7`; main CI green on `14ec4e7` |
| 18 | Final report | PASS | This document |

**Production-readiness assessment:** the library is **READY FOR
STAGING** (unchanged verdict, now on much stronger evidence).
It is not PRODUCTION READY: no real-model eval has ever run
(Phase 4 blocked), S-08 awaits owner disposition, and no
real-machine Windows staging exists (CI-only evidence). What
changed is the depth of verification behind the verdict: the
test suite doubled, Windows junction behavior is proven on a
real runner, the installer refuses known-bad skills by default,
and every phase has measured evidence rather than a claim.

## 2. Initial audit findings

The mission's starting point was the verified state at
`b86b469` (2026-11-21/22): 277 skills (228 original + 49
upstream), 18 categories, 24 agents, 16 workflows; verification
split 255 verified / 16 with limitations / 6 needs-correction /
0 unverified; 326 tests; evals 463/463 on mock; security scan
clean; Semgrep 0 findings; CodeQL 0 open alerts; branch
protection on with 10 required checks. Verdict then: READY FOR
STAGING.

The mission addressed three kinds of input:

**(a) The 18-phase master prompt** (Groups A–F): canonical
docs/evidence reconciliation, branch-protection verification,
S-08 remediation, real-model eval, scheduled-maintenance
execution, distribution architecture, freshness scoring,
accessibility coverage, dependency integrity, installer
integration tests, Windows junction validation, skill changelog,
quality trends, multi-model eval infrastructure, upstream PR
detection, benchmark dashboard, final audit, final report.

**(b) Six user-reported findings** (verified by the parent agent
against the worktree before handoff; re-verified during
implementation):

1. **Progressive disclosure is zero.** 228 original skills,
   median 247 lines, max 488; 0 with `references/`/`scripts/`/
   `assets/`/`examples/` folders. Every activation loads the
   whole file.
2. **Description bulk.** All 277 descriptions total 100,263
   chars (~25k tokens); `--skills all` preloads all of it.
3. **Needs-correction skills install unfiltered.** The installer
   had NO status check; all 6 needs-correction skills installed
   silently: prisma-upgrade-v7, seo,
   vercel-composition-patterns, vercel-react-best-practices,
   vercel-react-view-transitions, web-artifacts-builder.
4. **Date hardcodes.** "as of 2026-11-20" appeared 116 times in
   97 files; the "verified" label would stay while the date went
   stale.
5. **Astro skill errors (unverified by the user).**
   `skills/frontend/astro/SKILL.md` line 130 "Astro has no
   router component" (suspect — Astro has `<ClientRouter />`)
   and line 164 "Prefer getStaticPaths() with prerender for
   dynamic routes in static..." (confusing — prerender is mostly
   a server-mode concept). To be confirmed against official
   Astro 7 docs first.
6. **115 skills with non-critical flags**
   (`ai/test-results/phase5-quality-scores.json`): 110×
   "versioning: no version info in Prerequisites"; 24×
   "accessibility: no accessibility content (applicable
   category)". Content category lowest: 19 skills, mean 76.7,
   range 71–96 (lowest: content-brief 71, fact-checking 71,
   faq-generation 72, keyword-to-content 72).

**(c) Known blockers carried in:** real-model eval needed
credentials (lifted mid-mission — the owner connected a Gemini
API key and approved it for the 89-case eval; the run then hit
the free-tier quota — Phase 4); Windows validation only via the
gating CI leg; branch-protection gaps (no PR requirement, no
conversation resolution) are owner decisions, not to be silently
changed.

## 3. Work completed

Work was executed by 7 worker subagents (disjoint file
ownership; coordinator owned integration, git, and this report)
plus coordinator integration fixes, across 21 commits on `main`
(`b86b469` → `4ea561c`; the full commit list is in the
Git-status addendum). Summary by group:

- **Group A (Phases 1–3 + Findings 2/3/4):** addendums on 4
  audit reports; `ai/PROJECT-STATUS.json` restructured
  (canonical/evidence/pending); `ai/PROJECT-STATUS.md`;
  9 docs-consistency tests; branch-protection verification doc;
  S-08 restore-path warning fix; risk-acceptance doc with an
  EMPTY decision table; 12 install profiles + installer
  `--profile`/`--bundle`; needs-correction status filter
  (per-item refusal); 110/110 targeted tests.
- **Group B (Phases 4–6):** real-model runner
  (`evals/run-real-model.mjs`, 1,043 lines, per-case
  checkpointing + resume, 32/32 tests); maintenance-workflow
  verification (first run FAILED — MW-01); distribution
  architecture doc + `publish-npm.yml` + SBOM generator.
- **Group C1 (Phases 7/9 + tooling):** freshness scoring
  (32 tests); reference-integrity checker (30 tests); disclosure
  standard + coverage tooling; validator date-hardcode rule
  (19 tests); scorer-rule fixes (16 tests); Phase 15 upstream
  steps in scheduled-maintenance.yml.
- **Group C2 (Phase 8 + Findings 1/4/5/6):** the skill-content
  work — 44-skill disclosure migration (172 SKILL.md files
  edited, 182 disclosure files), 79 skills with accessibility
  content, 116 date hardcodes removed, Astro fixes, Finding 6
  skill fixes.
- **Group D (Phases 10–11):** 24 installer integration tests;
  12 real Windows junction tests; Windows validation doc.
- **Group E1 (Phases 12–13):** skill-history CLI (28 tests);
  quality-trends CLI (28 tests); 4 quality snapshots.
- **Group E2 (Phases 14–16):** 4 provider adapters + registry
  (29 tests); Gemini adapter verified live; upstream checker
  extension (18 tests); benchmark dashboard generator + first
  report.
- **Coordinator integration:** 14 new npm scripts; MW-01 link
  exceptions; scorer fixes (version-range-none, 4-digit
  standards IDs, per-skill a11y classification); SKILL-STANDARDS
  elements 7/14; the inject-test discovery fix; the trends
  normalizer fix; HEAD snapshot regeneration; status syncs; and
  the 6 defects found by main CI across 3 rounds (§16).

## 4. New skills added

**None.** This mission added no skills. The library remains at
**277 skills (228 original + 49 upstream)** in 18 categories,
24 agents, 16 workflows — verified by `npm run validate` and
`npm run check:registry` at every battery. The mission's skill
work was improvement and migration of existing skills (§5), not
expansion.

## 5. Existing skills improved

### Finding 1 — Progressive disclosure (44/44 migrated)

- **Before:** 0/228 skills disclosed; median 247 lines, max 489
  (electron); 44 skills over the disclosure threshold.
- **After:** **44/44 migrated** — 16 fully disclosed, 28
  disclosed-over-budget (honest floors: the remaining bulk is
  protected content — Required Workflow, Testing Strategy,
  Security — that must stay in the body). Max body **489 → 400**
  lines (electron); median unchanged at 247; **0 skills over
  500** (none ever were — the coordinator's earlier "530-line
  nextjs" steer was wrong; nextjs was 330 lines, and 530 was the
  validate test's padded copy). **2,878 lines moved**
  (16,698 → 13,820 across the 44 skills) into **182 new
  disclosure files** (references/ in 28 skills, scripts/ in 12,
  assets/ in 9, examples/ in 40). Over-350-line skills: 32 → 8;
  over-400: 9 → 0.
- **Method** (per `docs/PROGRESSIVE-DISCLOSURE.md`): code/config
  → `examples/`/`assets/`; runnable shell → `scripts/`; topic
  groups → `references/*.md`. Prerequisites, Required Workflow,
  Validation Checklist, Security, and Accessibility subsections
  always stayed in the body. A spec-driven migrator verified
  content preservation, every file linked, and `npm run
  validate` PASS after each batch.
- **Standard + tooling:** `docs/PROGRESSIVE-DISCLOSURE.md`
  (standard), `npm run disclosure` (coverage tooling),
  `ai/quality/PROGRESSIVE-DISCLOSURE-COVERAGE.md` (final
  numbers), validator disclosure-pointer check (it flags the
  prisma-postgres-upgrade dangling pointer — a genuine upstream
  issue, not a migration defect).
- **Trade-off (measured):** the scorer's actionability dimension
  fell 91 → 89 because code examples moved out of bodies and the
  scorer counts in-body code blocks. The disclosure gain (less
  context per activation) outweighs a 2-point scorer dip on a
  metric that counts the thing disclosure deliberately removes.

### Finding 4 — Date hardcodes

- **Skill bodies:** 152 "2026-11-20" occurrences in original
  skill bodies; **116 removed in 95 files**; **36 kept** as
  genuinely historical or example content (JSON timestamps,
  backup filenames, changelog examples, `<time>` examples, 1
  real release date). Frontmatter: 0 mismatches, 0 missing — all
  228 skills already had `last_verified` matching
  `sources/verification-status.json`.
- **Non-skill files:** 22 occurrences in 15 files intentionally
  kept as history (audit reports — never rewrite history inside
  `ai/audits/*`).
- **Plus:** 6 additional "as of \<other-date\>" fixes in 5
  infrastructure skills (aws, gcp, kubernetes ×2, pulumi,
  terraform).
- **Prevention:** validator date-hardcode rule (19 tests);
  SKILL-STANDARDS element 7 (version range or explicit
  "version range: none"; never hardcoded "as of DATE").

### Finding 5 — Astro skill (verified against docs first)

- Line 130 **CONTRADICTED**: `<ClientRouter />` exists since
  `astro@5.0.0`, from `astro:transitions` (sources:
  docs.astro.build/en/guides/view-transitions/ and
  /en/reference/modules/astro-transitions/).
- Lines 164–165 **CONFUSING, confirmed**: `prerender` defaults
  true in static mode, false with `output: 'server'`;
  `getStaticPaths()` is required for prerendered dynamic routes
  (source: /en/reference/routing-reference/).
- Docs describe Astro 7 as current
  (/en/guides/upgrade-to/v7/) — the skill's Astro 7 framing is
  supported. Fixed with 3 edits to
  `skills/frontend/astro/SKILL.md`, citing the docs.

### Finding 6 — Non-critical flags (before/after, current scorer)

| Metric | Before | After |
| --- | --- | --- |
| Skills flagged | 115 | **82** |
| Versioning flags | 110 | **82** |
| Accessibility flags | 24 | **0** |
| Mean overall | 87 | **88 (87.72)** |
| Content mean | 76.7 | **77.7 (77.68)** |
| Content lowest | 71 | **72** |
| Versioning dimension | 76 | **82** |
| Maintainability | 98 | **100** |
| Completeness | 99 | **100** |
| Actionability | 91 | **89** (disclosure trade-off, §5 Finding 1) |

- **Reconciliation (why the numbers moved in steps):** C2
  measured flagged 115 → 90 with the pre-C1 scorer; the
  coordinator's independent re-measurement with the current
  scorer showed 102 — the 12-skill gap was exactly C1's
  corrected versioning rule newly flagging 12 conceptual skills
  that honestly state "version range: none". The coordinator
  then fixed the scorer: explicit "version range: none" counts
  as a version statement (a skill that has addressed versioning
  must not be flagged forever — 12 cleared); the standards-ID
  pattern `\d{1,3}` → `\d{1,4}` (the old pattern matched NO RFC
  number — all 4 digits — and no ISO 8601; 4 cleared); the a11y
  flag now reads the per-skill classification (2 cleared); ISO
  8601 lines added to 3 seo skills' Prerequisites (verifiable
  from each skill's own body; 3 cleared). 101 → 82 = 12 + 4 + 3;
  flagged 102 → 82 = those 19 + 1 a11y-only skill.
- **Remaining 82 versioning flags** are the residual: skills
  with genuinely no verifiable version. They are honest flags,
  not a defect to chase to zero.

### Phase 8 — Accessibility

- Baseline 14/228 re-verified; classification of all 228
  (`sources/accessibility-classification.json`, 228 entries,
  every N/A entry reasoned ≥20 chars): **95 applicable / 133
  not-applicable**.
- **79 skills edited** (41 guidance variants); documentation
  coverage **95/95 = 100%**.
- **Validation coverage honestly 0%** — no automated/keyboard/
  screen-reader run exists; the process is documented in
  `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA). A3-03 is
  CLOSED for the documentation pass; validation remains open.
- Deliverables: standards doc, `test/accessibility-coverage.
  test.mjs` (6 tests), `ai/quality/ACCESSIBILITY-COVERAGE.md`
  (audit + 228-row appendix).

### Other skill-content changes

- SKILL-STANDARDS element 14: the per-skill classification is
  the authority for accessibility; quality rule 2 drops the
  banned "current stable as of DATE" phrasing.
- No upstream skill file was edited (verbatim imports; 0
  touched — verified).

## 6. Skills not verified

The verification split is unchanged: **255 verified / 16
verified-with-limitations / 6 needs-correction / 0 unverified**
(of 277). No skill moved between buckets in this mission — the
mission improved content and tooling but did not re-audit
verification status, and no status was changed without an audit.

The 6 needs-correction skills (all upstream, never edited):

| Skill | Known error |
| --- | --- |
| prisma-upgrade-v7 | stale version |
| seo | outdated FAQ rich-results rule |
| vercel-composition-patterns | bad code example |
| vercel-react-best-practices | 3 broken links |
| vercel-react-view-transitions | ~29 broken links |
| web-artifacts-builder | stale React version |

What changed for them is installer-side: they are now refused
by default (§7), and the 6 are the STALE set in freshness
scoring (§11). Fixes belong upstream; the upstream PR detection
work (Phase 15) now monitors for them.

The 16 verified-with-limitations skills keep their limitations
documented in `sources/verification-status.json`; the
link-building promotion (verified-with-limitations → verified)
from the earlier mission stands.

## 7. Installation improvements

### Finding 2 — Install profiles (bundles)

- **12 profiles** in `profiles/*.json`: ai, architecture,
  backend, desktop, devops, frontend, fullstack, media, quality,
  security, seo, writing. They cover every original skill, all
  24 agents, and all 16 workflows. The `upstream` category (49
  skills) is deliberately excluded from profiles — mixed
  verification status, installed explicitly only.
- **Measured description-token load** (registry descriptions,
  chars ÷ 4 ≈ tokens):

| Profile | Skills | ≈ Tokens | % of all-install |
| --- | ---: | ---: | ---: |
| ai | 5 | 620 | 2.5% |
| desktop | 3 | 409 | 1.6% |
| frontend | 21 | 1,761 | 7.0% |
| fullstack | 74 | 6,770 | 27.0% |
| **all skills** | **277** | **25,066** | **100%** |

  (Full table in `docs/PROFILES.md`.) The frontend profile loads
  ~1,761 tokens instead of ~25,066.
- **Installer support:** `--profile` / `--bundle` (alias,
  repeatable) on install, update, and uninstall; profiles
  combine with other selectors as a union (deduped). Unknown
  profile is a usage error (exit 2) listing the known profiles.
  Profiles need `--target` (they bundle agents, which cannot
  install to a bare `--dest`). Custom profiles are validated
  fail-closed (name must match filename, non-empty description,
  every member must exist in the registries).
- **`--skills all` still works unchanged** for anyone who wants
  the whole library.

### Finding 3 — Needs-correction status filter

- The installer now enforces verification status. **Default
  behavior: refuse.** A single needs-correction skill requested
  explicitly is refused with a clear error naming the skill and
  its known issue; a bulk install (`--skills all`, `--category`,
  `--profile`) warns on stderr, skips the 6, and installs the
  rest — bulk installs now install **271 skills and skip 6**.
- **Opt-in:** `--allow-needs-correction` installs them anyway
  (explicit, documented, tested).
- **Design decision (per-item refusal):** aborting a whole run
  on one bad item contradicts the installer's "one bad item
  never aborts the run" rule; the filter refuses/warns per item
  instead.
- No shipped profile lists a needs-correction skill (all six are
  in the excluded `upstream` category). A custom profile that
  does is subject to the bulk-install rule.
- Regression tests in `test/installer.test.mjs` + integration
  scenarios in `test/installer-integration.test.mjs` (profile +
  status-filter scenarios pass unweakened).

### S-08 installer warnings (Phase 3)

- The restore-path warning gap is fixed: `runRestore` now warns
  on dry-run AND real restore (previously the warning fired only
  on some paths). Combined with the earlier dry-run +
  already-installed coverage, S-08 warnings now fire on every
  path that can install the agentic-seo skill.
- The agentic-seo curl-pipe install itself is upstream content
  and was not edited. Mitigation is installer warnings + docs +
  tests only. Owner disposition (accept the mitigation vs drop
  the skill) is still pending — see §9 and §18.

### Windows `--link` (Phase 11)

- `createLink()` gains opt-in `requireTarget` (default false) +
  injectable `statFn`: with `requireTarget`, a missing target
  fails cleanly with a `LinkError` naming the target before any
  link attempt. Default false because backup/restore paths MUST
  recreate broken (dangling) links — a blanket check would break
  backing up a broken install. The install path (`stageItem`)
  passes `requireTarget: true`.
- The Stage D assumption "a junction's target must exist at
  creation time" was proven WRONG by CI (see §16): on Windows,
  junctions and directory symlinks both succeed and dangle for
  a missing target. The module comment and the Stage D analysis
  doc were corrected with dated notes.

## 8. Behavioral evaluation implementation

### Mock evals (unchanged, re-verified)

- **463/463 pass, 0 regressions**, re-verified in the Phase 17
  battery at `14ec4e7` and in CI (Behavioral evals job, green on
  every run). Coverage 277/277 skills selected; 277 generated +
  186 handwritten cases. Provider: deterministic mock agent (no
  LLM APIs).

### Real-model eval (Phase 4) — BLOCKED on quota

- **Framework complete.** `evals/run-real-model.mjs` (1,043
  lines): per-case checkpointing + resume (32/32 tests), dataset
  v2 verified (89 ids, 12 categories, 55 skills), mock baseline
  89/89 on the subset. Provider interface in
  `evals/runners/providers.mjs`: fails fast without credentials
  (exit 2, names the missing variables), Bearer token never
  logged or written to reports (report metadata carries the
  endpoint host only), retries on 429/5xx/timeout/network errors
  with exponential backoff capped at 30 s and `Retry-After`
  honored, temperature fixed at 0, per-case + aggregate
  token/cost tracking when the endpoint reports `usage`.
- **Gemini adapter verified live** (`evals/providers/gemini.mjs`,
  helper-based — shells out to the connector helper; the raw key
  is never read into an env var, file, or log). Model
  `gemini-3.8-flash` (`gemini-2.5-flash` returns HTTP 404 for
  this key). One verification call: ~164 s, finish `stop`,
  usage prompt 193 / completion 157 / total 1807 (total includes
  reasoning tokens). Thinking-model quirk recorded: small
  max_tokens ends with finish_reason `length` and EMPTY content —
  use max_tokens 2048. Latency warning: the 89-case run would
  take ~4–5 hours at ~3 min/call.
- **The blocker (measured, 2026-11-22 ~01:58 UTC):** the
  owner-connected Gemini key's project is on the FREE tier — 20
  generate-content requests/day for `gemini-3.8-flash`, already
  exhausted before the smoke test. Smoke test: **0/3 passed,
  all `provider-error` (HTTP 429 "Quota exceeded... limit: 20");
  3 requests, 6 attempts, 0 tokens, 0 cost.** The full 89-case
  run was deliberately NOT launched. Quota resets at midnight
  Pacific (~08:00 UTC 2026-11-22); limits are per Google Cloud
  project, not per key.
- **Likely cause of the exhaustion:** stray live calls from an
  earlier non-hermetic version of the eval test (a mid-session
  rewrite + other workers' full-suite runs of the old file).
  The test file is now hermetic; all workers were warned
  (targeted tests only, never invoke the Gemini helper).
- **Paths forward (OWNER DECISION needed, not yet made):**
  (1) paid tier — link billing, one ~4–5 h session; (2) multi-day
  free-tier run — 20/day × 5 days, checkpoint resume; (3)
  reduced scope (e.g. 20 cases).
- **No real-model results exist.** Nothing in this report or in
  `ai/PROJECT-STATUS.json` invents any: `evidence.realModelEval.
  hasRun` is false, with no commit, no run id, no result.
  Full detail: `ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md`,
  `ai/audits/REAL-MODEL-EVALUATION.md`.

### Multi-model infrastructure (Phase 14)

- **4 provider adapters + registry** (`evals/providers/`):
  OpenAI, Anthropic, Gemini (connector helper — no key, no
  direct HTTP), Local (OpenAI-compatible), plus `shared.mjs`
  (29/29 tests). One interface, one adapter per provider; a
  comparison run measures the models, not different harnesses.
  Gemini is the only adapter verified live; no other provider
  has credentials, and no paid calls were made.
- Known duplication: `MODEL_SYSTEM_PROMPT` is duplicated between
  `evals/runners/providers.mjs` and `evals/providers/shared.mjs`
  (recorded, not fixed — cosmetic).
- Doc: `ai/evaluations/MULTI-MODEL-EVALUATION.md`.

### Benchmark dashboard (Phase 16)

- Generator + first report from mock data (463/463, metrics
  100%); **real-model metrics shown as UNAVAILABLE** — mock
  results are never classified as real-model results. The
  generator auto-discovers real-model run files for regeneration
  when a real run exists. Outputs:
  `ai/evaluations/benchmark/{index.html,input.json,summary.md}`;
  doc: `ai/evaluations/BENCHMARK-DASHBOARD.md`.

## 9. Security improvements

- **Security scan:** `npm run check:security` — **1,389 text +
  4 binary files, 0 findings, PASS** (re-run at `14ec4e7`; up
  from 1,125 text files at `9fdc0d0` — 182 disclosure files plus
  new scripts, tests, and docs). 4 binary asset hashes verified
  against `sources/binary-hashes.json`.
- **Gitleaks:** full-history scan in CI (job in
  security-audit.yml, gitleaks-action v2 SHA-pinned, fetch-depth
  0); green on every run in this mission. Local triage at
  mission start: 13 findings, 0 real secrets.
- **Semgrep:** SAST job in CI (`p/javascript`); 0 findings.
- **CodeQL:** 0 open alerts (5 dismissed 2026-11-21 with reasons
  recorded).
- **S-08 (Phase 3) — PARTIAL.** The restore-path warning gap is
  fixed (§7). `ai/security/SECURITY-RISK-ACCEPTANCE.md` exists
  with an **EMPTY decision table** — no owner acceptance has
  been fabricated. The Phase 3 recommended disposition (keep the
  agentic-seo skill with mandatory warnings + safe-install
  guidance) still awaits the owner's decision; the alternative
  (drop the skill) would close S-08/S-09/S-14 together.
- **S-09/S-11/S-14:** unchanged (mitigated-still-open upstream /
  MONITOR). S-09 is FIXED upstream at live head (vendored copy
  still mitigated). S-14: agentic-seo import still 50 commits
  behind live upstream; the monitor now reports it correctly.
- **Scanner scope:** 34 patterns total (29 scan-scope, 11
  score-scope, 9 input-scope); no new patterns added in this
  mission.
- **Upstream change monitoring (Phase 15):** the checker is
  extended (18/18 tests) with a security heuristic (88 security
  flags in the live dry run), duplicate-notification prevention,
  and report steps in scheduled-maintenance.yml. Live dry run
  2026-11-22T01:33:40Z, exit 0: all 6 vendors UP-TO-DATE.
  Doc: `ai/maintenance/UPSTREAM-CHANGE-MONITORING.md`.

## 10. Agent/workflow improvements

**None in this mission.** The library remains at 24 agents and
16 workflows; no agent or workflow definition was added, removed,
or edited. Two integrity notes from Phase 9:

- **2 skill/workflow name collisions exist:** `sdk-development`
  and `seo-audit` are both skill names and workflow names. The
  reference-integrity checker reports them as warnings (not
  errors — the names resolve unambiguously in their own
  registries). A stale comment in
  `scripts/lib/agents-workflows.mjs` claiming "(none exists
  today)" was corrected.
- **104 unreferenced skills** (no agent or workflow references
  them) are reported as a warning by the same checker. This is
  coverage information, not a defect — skills are also installed
  directly.

## 11. Registry changes

- **Registry counts unchanged:** 277 skills, 24 agents, 16
  workflows, 18 categories. `npm run check:registry` passes
  (1 warning — the link-building override, documented).
- **New registries/data files:**
  - `profiles/*.json` — 12 install profiles (new selector
    layer; validated fail-closed by the installer).
  - `sources/accessibility-classification.json` — per-skill
    accessibility classification (228 entries).
  - `ai/quality/freshness-report.json` — freshness scoring
    output (**266 FRESH / 5 AGING / 6 STALE / 0 CRITICAL /
    0 UNVERIFIED, mean 88.3**, regenerated at `278343c`). The
    6 STALE are the needs-correction skills. The mean fell from
    95.9 (at `b86b469`) because the mission itself edited 175
    skills after their `last_verified` dates — the scorer
    correctly notes the verification no longer covers the current
    content. The 5 AGING: platform-social-images, social-preview,
    twitter-card-images, twitter-cards (73.5 each), and
    web-design-guidelines (79.7).
  - `ai/quality/disclosure-coverage.json` — disclosure coverage
    data (read by the trends tool).
  - `ai/quality/history/*.json` — 4 quality snapshots
    (v1.0.0, v1.1.0, b86b469, HEAD).
- **Frontmatter:** all 228 original skills carry `last_verified`
  matching `sources/verification-status.json` (0 mismatches,
  0 missing — verified during the Finding 4 cleanup).
- **Freshness scoring (Phase 7):** `scripts/freshness.mjs`
  (32 tests); freshness job added to
  scheduled-maintenance.yml. Doc: `ai/quality/SKILL-FRESHNESS.md`.
- **Reference integrity (Phase 9):**
  `scripts/check-references.mjs` (30 tests); real run PASS,
  0 errors, 3 warnings (2 name collisions; 104 unreferenced
  skills; 1 genuine upstream dangling pointer in
  prisma-postgres-upgrade). Doc:
  `ai/quality/DEPENDENCY-INTEGRITY.md`.

## 12. CI/CD changes

### Workflows changed

- **scheduled-maintenance.yml:** freshness job added (Phase 7,
  `npm run freshness`); Phase 15 upstream-report steps added
  (upload-artifact pinned to verified SHA `ea165f8d`, v4.6.2).
  The workflow now has 4 jobs (was 3).
- **publish-npm.yml (new, Phase 6):** dispatch-only, dry-run
  default, 27 steps. npm distribution is opt-in only; GitHub
  Releases remain the primary distribution channel. The workflow
  has never run (no npm publish is part of this mission).
- **No changes** to validate-skills.yml, lint.yml,
  security-audit.yml, codeql.yml, release.yml, or dependabot.yml
  in this mission. All actions remain SHA-pinned; Node 24
  everywhere.

### Distribution (Phase 6)

- `ai/architecture/DISTRIBUTION-ARCHITECTURE.md`: GitHub
  Releases primary, npm opt-in only.
- **Critical finding: the npm name `skillforge` is TAKEN**
  (`skillforge@0.1.0`, unrelated package). A scoped name is
  recommended if npm distribution proceeds. Open owner decisions:
  package name, `files` allowlist, `private` flip, NPM_TOKEN,
  environment reviewers.
- SBOM generator (`npm run sbom`): verified — 1,392 files,
  7 pinned actions, 0 npm dependencies. `sbom.json` is generated
  on demand, not committed.

### Main CI on the hardening work (3 rounds)

| Round | Run | Head | Result |
| --- | --- | --- | --- |
| 1 | 44977739625 | `6199f83` | Validate FAILED (Linux: check-status count mismatch; Windows: 3 test failures). Lint, Security audit, CodeQL green. |
| 2 | 44978450643 | `69c2107` | Validate FAILED on Linux (hardcoded-hash test); Windows leg stuck 20+ min on a degraded runner — cancelled by the coordinator. |
| 3 | 44979125717 | `14ec4e7` | **SUCCESS — all 4 jobs green.** Lint 44979125760, Security audit 44979125777, CodeQL 44979125757 also green on `14ec4e7`. |

Round-3 results: Linux 663 tests (650 pass, 0 fail, 13 skipped),
check-status 0 failures / 1 warning (accepted pointer-lag
warning); Windows 667 tests (658 pass, 0 fail, 9 skipped).
Details of every failure and fix: §16.

Follow-up commits after `14ec4e7` (docs, status, and the MW-05
workflow fix only — no code or test changes): Lint, Security
audit, and CodeQL green on both `278343c` and `4ea561c`; the
Validate Linux job green on `278343c`; the `278343c` Windows job
stuck 14+ minutes on a degraded runner and was cancelled as
superseded (§16 item 5).

### Scheduled maintenance (Phase 5)

- **First run 44970737145** (main @ `b86b469`, 2026-11-22
  01:17–01:21Z): **FAILED** — "Verify links online" failed on 3
  URLs returning HTTP 403 from the runner
  (domainlanguage.com/ddd, orval.dev, scholar.google.com) while
  returning 200 via curl (bot-protection false positives, same
  class as the 45 documented exceptions). Stale-skill and
  upstream-drift jobs passed. Findings MW-01–MW-04 recorded in
  `ai/audits/MAINTENANCE-WORKFLOW-VERIFICATION.md`.
- **MW-01 fix:** the 3 URLs added to EXCEPTIONS in
  `scripts/check-links.mjs` (all re-verified 200 via curl before
  excepting).
- **Second run 44980101979** (main @ `14ec4e7`, 2026-11-22
  03:19–03:24Z): **SUCCESS — 4/4 jobs green.** Links: 609 URLs,
  560 checked live, 49 skipped, 0 errors (MW-01 verified fixed).
  Stale-verification: none stale. Upstream: all 6 vendors
  UP-TO-DATE (+ first upstream-report artifact). Freshness job
  (first execution): passed, but reported inflated AGING
  (47 vs true 5) — MW-05, a shallow-checkout artifact (see §16
  item 9). **MW-01 is CLOSED; Phase 5 is PASS.**
- **MW-05 fix + third run.** `f40efb5` sets `fetch-depth: 0` on
  the freshness job's checkout. Run 44980945385 (main @
  `4ea561c`, 2026-11-22 03:30–03:34Z): **SUCCESS — 4/4 jobs**,
  and the freshness job reported **266 FRESH / 5 AGING / 6
  STALE** — exactly the full-history numbers. **MW-05 is
  CLOSED.** The maintenance loop is verified green twice in a
  row (runs 2 and 3) with all 4 jobs.

### New npm scripts (14)

`benchmark`, `check:references`, `check:upstream:json`,
`check:upstream:record`, `check:upstream:report`, `disclosure`,
`evals:real`, `freshness`, `history`, `history:all`, `sbom`,
`trends`, `trends:compare`, `trends:snapshot` — 33 scripts total
in package.json. All verified (syntax-checked; usage errors for
arg-requiring commands are expected).

## 13. Tests executed

### Full regression suite (`npm test` = bare `node --test`)

| Environment | Total | Pass | Fail | Skipped | Source |
| --- | ---: | ---: | ---: | ---: | --- |
| Linux CI (ubuntu-latest, Node 24) | 663 | 650 | 0 | 13 | Run 44979125717, job 137077521086, main @ `14ec4e7` |
| Windows CI (windows-latest, Node 24) | 667 | 658 | 0 | 9 | Run 44979125717, job 137077521338, main @ `14ec4e7` |
| Linux local (as root) | 663 | 649 | 0 | 14 | Battery at `14ec4e7` (and at `278343c` worktree) |

The 1-test Linux difference is the root-conditional permission
test (`test/installer-integration.test.mjs:953`): it skips when
run as root (root bypasses permission checks) and passes in CI.
Total (663) and failures (0) agree in both environments. The
suite grew 326 → 663 during this mission (+337 tests).

### Targeted batteries (worker-level, all passing)

| Battery | Tests | Result |
| --- | ---: | --- |
| Group A targeted (profiles, status filter, docs-consistency) | 110 | 110 pass |
| Real-model runner (checkpointing, resume, providers) | 32 | 32 pass |
| C1 targeted (freshness, references, validator, scorer) | 123 | 123 pass |
| Installer integration (real CLI, temp sandboxes) | 24 | 23 pass, 1 skipped as root by design |
| Skill history CLI | 28 | 28 pass |
| Quality trends CLI | 28 | 28 pass |
| Provider adapters + registry | 29 | 29 pass |
| Upstream checker extension | 18 | 18 pass |
| Scorer (after coordinator fixes) | 20 | 20 pass |
| Disclosure filenames (regression) | 2 | 2 pass |
| Accessibility coverage | 6 | 6 pass |
| Post-fix targeted re-run (installer, integration, trends, history, junction) | 189 | 176 pass, 0 fail, 13 skipped (12 junction on Linux + 1 root) |

### Phase 17 final audit battery (local, at `14ec4e7`) — 12/12 pass

`validate:strict` (5 upstream warnings), frontmatter (277),
links (262 internal / 609 external), duplicates, sources
(0 warnings), agents (40 files), security (0 findings), registry
(1 warning — link-building override), references (3 warnings),
freshness (AGING: twitter-cards 73.5, web-design-guidelines 79.7
— informational), disclosure, evals (0 regressions).

### Other verification runs

- Behavioral evals (mock): 463/463, 0 regressions.
- Real-model subset v2 on mock: 89/89.
- Real-model smoke test on Gemini: 0/3 (quota — §8, §16).
- Upstream checker live dry run: exit 0, all 6 vendors
  UP-TO-DATE (2026-11-22T01:33:40Z).
- Gemini adapter live verification: 1 call, finish `stop`
  (~164 s).
- SBOM generation: verified (1,392 files, 7 pinned actions,
  0 npm deps).
- Benchmark dashboard generation: verified from mock data.
- Link check (local): 262 internal / 609 external, PASS.
- Security scan: 1,389 text + 4 binary, 0 findings.
- `npm run check:status`: 0 failures, 0 warnings at `14ec4e7`
  worktree (1 accepted pointer-lag warning after the next commit
  moves HEAD — see §17).

## 14. Exact test commands

```bash
# Full regression suite (the CI command on both Linux and Windows)
npm test

# Canonical-status verification (Linux CI job, after npm test)
node scripts/check-status.mjs --verify-tests /tmp/test-output.txt

# Full status check (no test-output file)
npm run check:status

# Behavioral evals (mock provider)
npm run evals

# Real-model eval runner (needs a provider; BLOCKED on quota — §8)
npm run evals:real

# Validation, registry, security, links
npm run validate
npm run validate:strict
npm run check:registry
npm run check:security
npm run check:links
node scripts/check-links.mjs --online

# New tooling (this mission)
npm run freshness
npm run check:references
npm run disclosure
npm run history -- <skill> [--json]
npm run history:all
npm run trends -- snapshot
npm run trends:compare -- <old.json> <new.json>
npm run sbom
npm run benchmark
npm run check:upstream
npm run check:upstream:json

# Skill quality scoring
npm run score
npm run score -- --json

# Targeted suites (examples from this mission)
node --test test/installer.test.mjs test/installer-integration.test.mjs \
  test/quality-trends.test.mjs test/skill-history.test.mjs \
  test/windows-junction.test.mjs
node --test test/windows-junction.test.mjs   # 12/12 skip on Linux
```

## 15. Pass/fail results

| Check | Result |
| --- | --- |
| Full suite, Linux CI | PASS — 663/650/0/13 (run 44979125717) |
| Full suite, Windows CI | PASS — 667/658/0/9 (run 44979125717) |
| Full suite, Linux local (root) | PASS — 663/649/0/14 |
| Behavioral evals (mock) | PASS — 463/463, 0 regressions |
| Real-model subset v2 (mock) | PASS — 89/89 |
| Security scan | PASS — 0 findings |
| Gitleaks (CI, full history) | PASS — 0 findings |
| Semgrep (CI) | PASS — 0 findings |
| CodeQL | PASS — 0 open alerts |
| Lint (CI) | PASS |
| Registry check | PASS (1 documented warning) |
| Reference integrity | PASS — 0 errors, 3 warnings |
| Link check (local) | PASS |
| Freshness scoring | PASS — 268 FRESH / 3 AGING / 6 STALE / 0 CRITICAL |
| Disclosure coverage | PASS — 44/44 migrated, 0 need disclosure |
| Accessibility coverage test | PASS — 95/95 documented |
| Skill history | PASS — 277/277 skills, 927 entries |
| Quality trends | PASS — 4 snapshots; compare exits 1 on regression (verified) |
| Upstream checker (live dry run) | PASS — exit 0, all 6 UP-TO-DATE |
| Benchmark dashboard generation | PASS — from mock data |
| SBOM generation | PASS — 1,392 files, 7 actions, 0 npm deps |
| `check:status` | PASS — 0 failures (0–1 accepted warnings) |
| Main CI (all 4 workflows @ `14ec4e7`) | PASS — runs 44979125717/44979125760/44979125777/44979125757 |
| Scheduled maintenance, run 1 (44970737145) | FAIL — MW-01 (3 bot-blocked 403s); 2/3 jobs passed |
| Scheduled maintenance, run 2 (44980101979) | PASS — SUCCESS, 4/4 jobs; MW-01 verified fixed; MW-05 found (freshness AGING inflated 47 vs true 5) |
| Scheduled maintenance, run 3 (44980945385) | PASS — SUCCESS, 4/4 jobs; freshness 266/5/6 (MW-05 verified fixed) |
| Real-model smoke test (Gemini) | FAIL — 0/3, all HTTP 429 quota (not a code defect) |
| Windows junction tests (12) | 9 PASS, 3 SKIP (environment reasons), 0 FAIL |

## 16. Failed tests

Every failure encountered in this mission, with cause and fix.
Nothing was hidden, retried-away, or weakened to pass.

1. **`inject-test.ts` discovered by the test runner (local
   battery 1).** C2's migration created
   `skills/backend/fastify/examples/inject-test.ts` — a real
   test file (imports `node:test`, imports `./app.js`, which
   does not exist). `npm test` is bare `node --test`, and Node
   v24.22.1's runner discovers `*-test.*`, `*.test.*`,
   `test-*.*` files anywhere in the tree (verified by probe).
   Full suite failed 661 tests / 1 fail on it. **Fix**
   (`80e5894`): renamed to `inject-example.ts` + SKILL.md link
   updated; regression test
   `test/disclosure-filenames.test.mjs` (2 tests); hard naming
   rule added to `docs/PROGRESSIVE-DISCLOSURE.md` (runnable
   disclosure files must never match test-discovery patterns).

2. **Round-1 Windows failures (run 44977739625, 3 tests).**
   (a) `CLI compare exits 1 on a regression and 0 when clean`
   (quality-trends) — "Missing expected exception". (b) `CLI:
   --json output for one skill against a synthetic repo`
   (skill-history) — `SyntaxError: Unexpected end of JSON
   input` (empty stdout, exit 0). **Shared cause:** both E1
   CLIs guarded their main block with
   `import.meta.url === \`file://${process.argv[1]}\``, which
   can NEVER match on Windows (`argv[1]` has backslashes, the
   URL has forward slashes) — both CLIs silently did nothing.
   Only these 2 scripts used this form (grep-verified); the
   repo's idiom is `path.resolve(process.argv[1]) ===
   fileURLToPath(import.meta.url)`. **Fix** (`122b680`): both
   CLIs switched to the established guard. (c) `junction:
   creation fails cleanly for a missing target` — "Missing
   expected rejection". **Cause:** the Stage D assumption "a
   junction's target must exist at creation time" is WRONG —
   proven by the CI run: on Windows, neither
   `fs.symlink(..., 'junction')` nor a directory symlink
   validates the target; both succeed and dangle. **Fix**
   (`ebb5b0f`): test rewritten to assert the real behavior +
   the new opt-in `createLink` `requireTarget` check; module
   comment + Stage D doc corrected with dated notes.

3. **Round-1 Linux failure (run 44977739625).**
   `check-status --verify-tests` failed: recorded runner numbers
   649/14 were the LOCAL AS-ROOT counts; CI measured 650/13
   (the root-conditional permission test). **Fix** (`69c2107`):
   PROJECT-STATUS.json records CI-measured numbers with the root
   divergence documented.

4. **Round-2 Linux failure (run 44978450643).**
   `PROJECT-STATUS.json canonical section names main and its
   verified HEAD` failed — the test hardcoded
   `canonical.head === 'b86b469...'` (written by Group A when
   main was at b86b469); moving canonical.head to `6199f83`
   broke it. The coordinator's targeted re-run after the fixes
   had not covered `docs-consistency.test.mjs` — **lesson
   recorded: after ANY edit, re-run the FULL suite before
   pushing.** **Fix** (`14ec4e7`): the test now asserts shape
   (40-hex), headShort agreement, and ancestry of HEAD via `git
   merge-base --is-ancestor` (exit 128 = unknown revision on
   shallow checkouts → skip; exit 1 = not ancestor → fail; no
   git → skip). Strict HEAD equality is impossible (any commit
   moves HEAD — infinite regress). The merge commit stays
   hardcoded (immutable history).

5. **Round-2 Windows leg stuck (run 44978450643).** The Windows
   job ran 20+ minutes without completing — the 4th occurrence
   of the degraded/slow Windows runner pattern (previously: PR
   #4 re-run timed out at the 20-min job limit, PR #5 merge
   Windows cancelled after ~13 min, PR #3 Windows re-run
   cancelled). The run was already a failure on Linux, so the
   coordinator CANCELLED it; the new run on `14ec4e7` started
   immediately after and passed. **5th occurrence:** the
   docs-only follow-up run 44980371743 (main @ `278343c`) had
   its Windows job stuck 14+ minutes (Linux job, Behavioral
   evals, and Registry all green); cancelled as superseded by
   `4ea561c`, whose own Validate run was queued behind it.

6. **Trends normalizer key mismatch (integration, before any
   battery).** E1's trends normalizer did not recognize the
   disclosure tool's actual keys (`withFolders`/`medianLines`/
   `maxLines` vs expected `withSubdirs`/`medianBodyLines`/
   `maxBodyLines`) — all 4 disclosure metrics were unavailable
   in the first snapshot. **Fix** (`c6379bb`): normalizer fixed
   (with a comment documenting total-lines semantics) + 1 new
   test; HEAD snapshot regenerated (68 metrics, 0 unavailable).

7. **Real-model smoke test 0/3 (Phase 4).** Not a code failure:
   all 3 cases failed as `provider-error` on HTTP 429 (free-tier
   quota exhausted). The framework, retries, and error
   classification behaved as designed. See §8.

8. **Group D's full-suite run (pre-integration):** 4 failures in
   `test/installer.test.mjs` — Group A's status-filter fallout,
   fixed by Group A before integration. Not a mission-level
   failure.

9. **MW-05 — freshness job's shallow checkout inflated AGING
   (maintenance run 2).** The freshness job reported 224 FRESH /
   47 AGING / 6 STALE with "277 skill(s) changed after their last
   verification date", but a full-history run at the same tree
   reports 266/5/6 ("175 changed"). **Cause (verified by a local
   shallow-clone probe):** the job used the default checkout
   (`fetch-depth: 1`), so `git log` sees only HEAD — and HEAD as
   a root commit has no parent, so its diff lists EVERY file in
   the tree (1,011 skill files in the probe). The scorer's
   `collectLastChanges` then maps every skill to the HEAD date,
   after every `last_verified`, zeroing the 15-point stability
   component for all 277 skills. The job still PASSED (it fails
   only on CRITICAL; 0 CRITICAL), but its headline numbers were
   wrong. **Fix** (`f40efb5`): `fetch-depth: 0` on the freshness
   job's checkout (same precedent as the Gitleaks job), with a
   comment recording the mechanism. **Re-verified:** run 3
   (44980945385, main @ `4ea561c`) — the freshness job reported
   266 FRESH / 5 AGING / 6 STALE, exactly the full-history
   numbers. MW-05 CLOSED.

**Tests NOT weakened:** the unknown-profile test, the
permission tests, and the junction tests assert the same
behavior they were written to assert; where behavior was
corrected (test 4), the test was rewritten to assert the TRUE
behavior proven by the OS, not to skip the assertion.

## 17. Warnings

- **`check:status` pointer-lag warning (accepted convention).**
  After any commit, HEAD moves past the `canonical.head`
  "last verified at" pointer and check-status reports 1 warning
  (0 failures). This is expected: strict HEAD equality is
  impossible (see §16 item 4). The pointer is re-synced at each
  battery.
- **validate:strict — 5 upstream warnings.** The validator's new
  disclosure-pointer check flags the prisma-postgres-upgrade
  dangling pointer (genuine upstream issue; upstream files are
  never edited). The other 4 are pre-existing upstream warnings.
- **Registry check — 1 warning.** The link-building override
  (documented).
- **Reference integrity — 3 warnings.** 2 skill/workflow name
  collisions (`sdk-development`, `seo-audit`); 104 unreferenced
  skills; 1 upstream dangling pointer (prisma-postgres-upgrade).
- **Freshness — 5 AGING skills** (platform-social-images,
  social-preview, twitter-card-images, twitter-cards — all 73.5
  — and web-design-guidelines, 79.7) and 6 STALE (the
  needs-correction skills). Informational; the STALE set is by
  design. The mean fell 95.9 → 88.3 across the mission because
  175 skills were edited after their `last_verified` dates
  (§11) — the scores recover on re-verification, not on
  re-dating. Note MW-05 (§16 item 9): a shallow checkout
  inflates AGING to 47; the maintenance job now uses full
  history.
- **Windows junction skips (3).** Non-admin operation (runner
  elevated), permission restrictions (icacls deny ACE did not
  block writes), no-injection CLI fallback (Developer Mode
  permits symlinks). Environment signals, not passes — the
  corresponding behaviors remain unproven on CI (see §18).
- **Trends figure NOT cited.** The snapshot comparison's
  "Validation errors: 110 → 0" figure was not understood well
  enough to cite and is deliberately absent from this report.
  (It reflects the CURRENT validator applied to historical
  worktrees, not a real error count at either commit.)
- **Dependabot side effect.** The disclosure migration's example
  asset `skills/backend/python-sdk/assets/pyproject.toml`
  triggered a Dependabot dependency-graph update run ("Graph
  Update: pip in /skills/backend/python-sdk/assets", success) —
  it only indexed the file; NO PR was opened. The example's
  dependencies (httpx, pytest, mypy, hatchling) are now tracked;
  future Dependabot version PRs for the example file are
  possible but harmless.
- **Latency warning (Phase 4).** At ~3 min/call, the 89-case
  real-model run takes ~4–5 hours. Plan it as a long session,
  not a quick check.

## 18. Known limitations

- **No real-model eval has ever run** (Phase 4 BLOCKED on the
  free-tier quota). All eval numbers in this report are mock
  results. Owner decision needed on the path forward (§8).
- **S-08 awaits owner disposition.** The mitigation (warnings on
  every install/restore path + safe-install guidance) is in
  place and recommended; no owner acceptance is recorded, and
  none was fabricated. S-09/S-11 remain open upstream; S-14
  (agentic-seo 50 commits behind live upstream) is MONITOR.
- **Accessibility validation coverage is 0%.** Documentation
  coverage is 100% (95/95); no automated, keyboard, or
  screen-reader validation run exists. The process is documented
  (`docs/ACCESSIBILITY-STANDARDS.md`); the run is not.
- **Real-machine Windows staging does not exist.** Junction
  behavior is proven on the CI runner only; a human on a stock
  Windows PC (junction fallback, NTFS ACL, AV scenarios) is
  unproven. Three junction tests skip on the CI runner for
  environment reasons (§17).
- **Branch-protection gaps (owner decisions).** "Require pull
  requests before merging" and conversation resolution are NOT
  enabled; `enforce_admins=false`. Documented in
  `ai/audits/BRANCH-PROTECTION-VERIFICATION.md`; no settings
  were changed in this mission.
- **npm distribution is undecided.** Name `skillforge` is taken;
  scoped name, `files` allowlist, `private` flip, NPM_TOKEN,
  and environment reviewers all need owner decisions.
  `publish-npm.yml` has never run.
- **MW-02/MW-03 (maintenance workflow).** No artifacts are
  uploaded (results live only in 90-day job logs); no failure
  notification step exists. Both are design decisions needing
  owner input, not defects.
- **A3-04: Railway Config-as-Code hard cutoff 2026-12-01** —
  re-verify the railway skill shortly after.
- **Residuals carried forward:** Semgrep CI job uses a PyPI
  version pin (no `--require-hashes` lockfile) and a
  runtime-fetched ruleset (A4-06); stale-lock takeover window is
  10 minutes; post-swap verification branches are covered at
  unit level only; Tier-2 manifest roots may climb at most 3
  leading `..` segments; REQ-03 covers curl-pipe only;
  `MODEL_SYSTEM_PROMPT` is duplicated between two provider files
  (cosmetic); 82 residual versioning flags are honest flags for
  skills with no verifiable version (§5).

## 19. Remaining tasks

1. **Phase 4 owner decision** — paid tier vs multi-day free-tier
   run (20/day × 5 days, checkpoint resume) vs reduced scope.
   Quota resets ~08:00 UTC 2026-11-22; a multi-day run can start
   the next morning. Then: run the 89-case subset, regenerate
   the benchmark dashboard from real results.
2. **S-08 owner disposition** — accept the recommended mitigation
   (keep + mandatory warnings + safe-install guidance) or drop
   the agentic-seo skill (closes S-08/S-09/S-14). Record the
   decision in `ai/security/SECURITY-RISK-ACCEPTANCE.md`.
3. **Phase 5 confirmation** — DONE: runs 2 and 3 both green
   (MW-01 and MW-05 closed). The weekly schedule (Mondays 07:00
   UTC) runs unattended — watch the first scheduled run.
4. **npm distribution decisions** (if wanted) — scoped name,
   `files` allowlist, `private` flip, NPM_TOKEN, environment
   reviewers; then a dry-run publish.
5. **Real-machine Windows staging** — a human on a stock Windows
   PC, ideally without Developer Mode and non-elevated, to
   execute the 3 junction tests that skip on CI.
6. **Accessibility validation run** — automated + keyboard +
   screen-reader checks per `docs/ACCESSIBILITY-STANDARDS.md`,
   to move validation coverage off 0%.
7. **MW-02/MW-03 decisions** — summary artifacts per maintenance
   job; failure notification (issue-on-failure step or reliance
   on GitHub's scheduled-workflow failure emails).
8. **S-14 re-point decision** at the next re-import (live
   upstream 50 commits ahead; re-pointing would also fix S-09).
9. **A3-04** — re-verify the railway skill shortly after the
   2026-12-01 Config-as-Code cutoff.
10. **Branch-protection residuals** — owner decision on PR
    requirement, conversation resolution, `enforce_admins`.
11. **Release decision** — no version bump in this mission
    (version stays 1.1.0; CHANGELOG entry under [Unreleased]).
    A v1.2.0 release is a separate owner decision; release.yml
    gates (tag↔version, CHANGELOG entry) apply.

## 20. Recommended next steps

1. **Decide the Phase 4 path first** — it is the only BLOCKED
   phase and the largest evidence gap. The cheapest path is the
   multi-day free-tier run (20 cases/day, checkpoint resume,
   ~5 days, $0); the fastest is the paid tier (one ~4–5 h
   session). Either unblocks the benchmark dashboard's
   real-model section and the production-readiness verdict.
2. **Decide S-08** — one line in the risk-acceptance doc closes
   the mission's only PARTIAL phase.
3. **Let the weekly maintenance schedule run** — Mondays 07:00
   UTC, 4 jobs. Watch the first scheduled run; if it goes green,
   the maintenance loop is self-sustaining.
4. **Consider a v1.2.0 release** once (1) and (2) land — the
   CHANGELOG [Unreleased] entry is written; the release follows
   the documented process (`docs/UPDATE-PROCESS.md`, release.yml
   gates).
5. **Schedule the real-machine Windows staging and the
   accessibility validation run** — both are half-day human
   tasks that close the two "CI-only / documentation-only"
   evidence gaps.
6. **Keep the new tooling in the loop:** `npm run freshness`
   and `npm run trends:snapshot` on a cadence (the freshness job
   already runs weekly in maintenance); re-run the full battery
   before any release; keep `ai/PROJECT-STATUS.json` synced —
   `check:status` in CI enforces it.

## Addendum — Git status (direct-to-main override)

The master prompt required a dedicated branch
(`feat/production-hardening`) and a PR, never pushing to `main`.
**The owner explicitly overrode this** ("usi ni main branch pe
he kr lo sb kuch" — do everything on the main branch itself).
The feature-branch + PR plan was CANCELLED; direct pushes to
`main` were explicitly authorized by the owner for this mission.
Never force-push still stands — no force-push was used at any
point.

What happened, in order:

1. Work began on `feat/production-hardening` from `main` @
   `b86b469` (14 commits: `95d3175` … `6199f83`).
2. The override arrived while workers were mid-flight; the
   coordinator merged after workers completed and the
   integration battery passed (landing partial work risks red
   CI on `main`).
3. `origin/main` was still `b86b469` at merge time (verified by
   fetch). Fast-forward merge: `main` `b86b469` → `6199f83`;
   trees verified identical before push. Pushed directly to
   `main` (owner-authorized).
4. `feat/production-hardening` was deleted (local only — it was
   never pushed to remote; verified 0 remote heads matching).
   Only `main` remains.
5. All remaining work (CI fixes, evidence recording, this
   report) went directly to `main` in small logical commits,
   each verified by the full local suite before pushing and by
   main CI after pushing.

Commits on `main` for this mission (`b86b469` → `4ea561c`):

| SHA | Subject |
| --- | --- |
| `95d3175` | feat(hardening): canonical docs, branch-protection verification, S-08 + profiles + status filter |
| `ae647fe` | feat(hardening): real-model eval runner, maintenance verification, distribution architecture |
| `9b21a6f` | feat(hardening): freshness scoring, reference integrity, disclosure standard |
| `2bda329` | test(hardening): installer integration tests + Windows junction tests |
| `66b5d5b` | feat(hardening): skill changelog + quality trends |
| `91194c2` | feat(hardening): multi-model eval providers, upstream detection, benchmark dashboard |
| `48d677c` | chore(hardening): wire up new npm scripts, docs index, MW-01 link exceptions |
| `99b7a48` | feat(skills): progressive disclosure migration, accessibility content, date cleanup |
| `3c55207` | feat(a11y): accessibility standards, per-skill classification, coverage test |
| `df81808` | fix(scorer): version-range-none, 4-digit standards IDs, per-skill a11y |
| `31efe6a` | docs(standards): elements 7/14 align with Finding 4/6/8 rules; disclosure final |
| `80e5894` | fix(skills): rename inject-test.ts so the test runner ignores it |
| `c6379bb` | fix(trends): disclosure normalizer accepts the producer's keys; HEAD snapshot |
| `6199f83` | chore(status): sync PROJECT-STATUS.json and docs to the hardening battery |
| `122b680` | fix(windows): CLI main-module guards never matched on Windows |
| `ebb5b0f` | fix(installer): createLink requireTarget; junctions can dangle on Windows |
| `69c2107` | chore(status): runner numbers to CI-measured 650/13; canonical head to 6199f83 |
| `14ec4e7` | fix(tests): canonical-head assertion must not hardcode a hash |
| `278343c` | docs: record green main CI evidence — Windows junction results + status sync |
| `f40efb5` | fix(ci): freshness job checks out full history (MW-05) |
| `4ea561c` | docs: maintenance run 2 green (MW-01 closed, MW-05 found); status sync |

This report itself, plus the CHANGELOG [Unreleased] entry, the
README updates, the run-3 maintenance evidence, and the final
status sync, land in the commit immediately following `4ea561c`
(see `git log` for its SHA — it is also recorded in the
coordinator's final report to the parent agent).

**Branch protection was never bypassed or loosened** in this
mission (10 required status checks, strict; force pushes and
deletions blocked; `enforce_admins=false` so the owner's direct
pushes work — verified by every push in this mission). No
releases or tags were created, deleted, or moved. No repo
settings were changed.
