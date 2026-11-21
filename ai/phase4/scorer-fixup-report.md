# Phase 5 — Scorer Fix-up Report

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (no push, merge, PR, or
  commit by this agent; no branch switch)
- **Scope:** the 51 new Phase 4 skills, limited to the files listed in the
  task. `skills/upstream/` untouched. Frontmatter untouched everywhere.
- **Standard:** `docs/SKILL-STANDARDS.md` (22 elements); subsection order
  follows `templates/SKILL-TEMPLATE.md` (Testing Strategy, then
  Accessibility, inside `## Implementation Standards`).

## What was done

31 skills edited (525 insertions, 2 deletions across those files):

- **Task 1 — Testing Strategy:** added a `### Testing Strategy`
  subsection (4–5 bullets of skill-specific guidance) to all 28 listed
  skills. Verified first: none of the 28 already had one. For non-code
  skills the subsection is validation/QA guidance, not forced unit-test
  advice (e.g. `serp-monitoring`: back-test alert thresholds, cross-check
  the tracker against Search Console; `editorial-workflow`: pilot the
  pipeline, audit a sample of published pieces, test the gates).
- **Task 2 — Version info in Prerequisites:** added a version line to 12
  of the 14 listed skills, and rephrased an existing line in place for
  the other 2 (`llm-integration`, `electron`), where version info already
  existed. No new version claims were invented: the lines either
  duplicate a claim already verified in the skill body (LangChain 1.x,
  `@supabase/supabase-js` v2, Electron 45.x) or use the standard's honest
  phrasing for conceptual skills ("Conceptual skill; current stable as
  of 2026-11-20 — ...", with a pointer to the release notes / official
  docs linked in Official Documentation). No web verification was needed
  because no new version-specific claim was introduced.
- **Task 3 — Accessibility:** added a `### Accessibility` subsection
  (4 bullets) to all 4 listed skills: `editorial-workflow` (alt text,
  heading outline, plain language, descriptive links),
  `source-verification` (accessible source formats, transcripts,
  checkable charts), `platform-social-images` (`og:image:alt` /
  `twitter:image:alt`, information out of the image, WCAG AA contrast),
  `resvg` (SVG `<title>`/`<desc>` in the source, alt text for rasterized
  PNG output).

Style notes: additions match each file's wrapping (72-column wrapped
files stay wrapped; `release-management`, `clickhouse`, `redis`, and
`aws` keep single-line bullets). Two cleanups made along the way: 4 code
spans that the line-wrapper had split across lines (e.g.
`` `agent-evaluation` ``) were reworded so no backticked span breaks
mid-name, and curly apostrophes introduced by the first pass were
normalized to straight apostrophes to match the rest of the repository.

## Per-skill changes

Lines are `wc -l` before → after. T = Testing Strategy subsection,
V = Prerequisites version line (R = rephrased existing line, no new
content), A = Accessibility subsection.

| Skill | Lines | Added |
| --- | --- | --- |
| `ai-engineering/agent-evaluation` | 350 → 354 | V (conceptual phrasing) |
| `ai-engineering/ai-agents` | 362 → 384 | T (tool isolation, eval set, guardrails, human-in-the-loop gate, budgets), V (LangChain 1.x, duplicated from body) |
| `ai-engineering/llm-integration` | 357 → 375 | T (golden set, mocked-provider adapter tests, retry/timeout fault injection, cost assertions), V (R: "As of 2026-11-20" → "Current stable as of 2026-11-20") |
| `ai-engineering/rag` | 335 → 356 | T (recall@k eval set, hybrid-vs-dense test, access-scope test, failure cases, citation checks), V (conceptual phrasing) |
| `architecture/release-management` | 192 → 199 | T (dry-run/prerelease pipeline test, install-as-consumer smoke test, rollback drill, semver check) |
| `auth/authjs` | 303 → 318 | T (per-provider sign-in, session-callback strategy test, generic-failure test, route-protection test) |
| `auth/passkeys` | 369 → 384 | T (virtual-authenticator ceremonies, rejection paths, counter behavior, no-authenticator fallback) |
| `auth/supabase-auth` | 319 → 338 | T (RLS per-role tests, concurrent-refresh test, AAL policy test, OAuth/PKCE + email-link staging tests), V (`@supabase/supabase-js` v2, duplicated from body) |
| `backend/advanced-api-architecture` | 403 → 425 | T (contract tests, idempotency replay, pagination stability, problem-details contract, rate-limit/webhook/load tests), V (conceptual phrasing) |
| `backend/express` | 382 → 396 | T (supertest route tests, middleware-order test, async-rejection forwarding, path-to-regexp v8 patterns) |
| `content/editorial-workflow` | 225 → 258 | T (pilot piece, monthly sample audit, gate tests, log measurement), V (conceptual phrasing), A |
| `content/source-verification` | 232 → 264 | T (second-verifier sample, citation link checks, claim-to-source spot checks, rejected-source audit), V (conceptual phrasing), A |
| `database/clickhouse` | 267 → 274 | T (EXPLAIN granule checks, ReplacingMergeTree dedup, insert-rate staging test, TTL/partition + distributed-query tests) |
| `database/redis` | 223 → 230 | T (real-instance tests, expiry/eviction under pressure, failover, restart/persistence test) |
| `desktop/electron` | 462 → 462 | V only (R: "current stable line as of" → "current stable as of"; 45.x claim unchanged) |
| `desktop/tauri` | 407 → 423 | T (cargo command tests, capability tests, mocked-invoke frontend tests, per-OS CI, updater test) |
| `frontend/sveltekit` | 367 → 385 | T (Vitest load/action tests, Playwright journeys, per-route rendering, hooks tests, real-adapter build) |
| `infrastructure/aws` | 303 → 310 | T (sandbox account first, IAM Policy Simulator, backup-restore rehearsal, Multi-AZ/alert tests) |
| `infrastructure/fly-io` | 368 → 384 | T (staging deploy + release command, broken-release health-check test, shutdown drain, rollback, volume-restore test) |
| `infrastructure/gcp` | 327 → 341 | T (sandbox project, Policy Simulator, Cloud Run traffic splitting, backup-restore rehearsal, budget-alert test) |
| `infrastructure/kubernetes` | 360 → 378 | T (dry-run + kubeconform, kind/minikube probes, rolling-update/PDB test, HPA load test, rotation/upgrade rehearsal) |
| `infrastructure/railway` | 300 → 314 | T (PR/staging environments, backward-compatible migration test, rollback test, private-network + volume tests) |
| `infrastructure/render` | 356 → 371 | T (preview environments, Render CLI Blueprint validation, backward-compatible migration test, shutdown + rollback tests) |
| `media/platform-social-images` | 296 → 332 | T (platform debuggers, 600 KB budget check, X 2:1 crop test, real-share test, tag checks), V (conceptual phrasing), A |
| `media/resvg` | 263 → 299 | T (golden SVG pixel diffs, font-failure test, fitTo size assertions, background test, CLI/WASM paths), A |
| `media/satori` | 290 → 306 | T (SVG snapshots, failure-mode tests, emoji/long-text tests, rasterized visual regression, embedded-image test) |
| `media/sharp` | 271 → 288 | T (output-file assertions, EXIF orientation test, metadata test, oversized-input test, visual spot checks) |
| `seo/content-decay` | 341 → 361 | T (known-case validation, dashboard-vs-API cross-check, redirect-target tests, re-measurement, log audit), V (conceptual phrasing) |
| `seo/entity-seo` | 344 → 363 | T (Rich Results / Schema validator, markup-matches-page test, sameAs resolution, post-template re-validation), V (conceptual phrasing) |
| `seo/serp-monitoring` | 361 → 382 | T (threshold back-testing, tracker-vs-Search-Console cross-check, snapshot pipeline test, branded split, alert audit), V (conceptual phrasing) |
| `seo/topical-authority` | 316 → 320 | V (conceptual phrasing) |

Longest edited file is `electron` at 462 lines (unchanged); all edited
files are under the 500-line limit.

## Validation

Filtered validation run for **every** edited skill (31/31):

```bash
node scripts/validate-skills.mjs --filter skills/<cat>/<name>
```

All 31 pass (`PASS: all skills valid`, exit 0). The 10 skills whose
version lines were reworded in the second pass (see below) were
re-validated after the rewording; all pass. No validation error was
introduced at any point.

## Scorer before / after (51 new skills)

Before: `ai/test-results/phase5-quality-scores.json` (new-skills means
computed from its per-skill results). After: fresh `npm run score` run
after all edits.

| New-skills mean (n=51) | Before | After |
| --- | --- | --- |
| Overall | 86.1 | **94.9** |
| Testing | 35.3 | **75.2** |
| Versioning | 86.3 | **100** |
| Completeness | 99.1 | 99.9 |
| Actionability | 91.5 | 91.5 |
| Security | 100 | 100 |
| Documentation | 99.7 | 99.7 |
| Accuracy (proxy) | 100 | 100 |
| Maintainability | 76.0 | 92.6 |

All-skills (n=228): overall 84 → 86, testing 24 → 33, versioning
73 → 76, 0 CRITICAL. **Zero flags remain among the 51 new skills**
(no versioning, accessibility, or other flags).

### Honesty note on the overall comparison

The overall before/after is not perfectly apples-to-apples: the
maintainability curve in `scripts/score-skills.mjs` changed between the
run that produced `phase5-quality-scores.json` and this run. Evidence:
17 skills I did not touch changed maintainability with identical line
counts (e.g. `nestjs`, 357 lines: 72 → 98; `electron`, 463 lines:
19 → 62), while their testing, versioning, and other dimensions are
unchanged — so only the maintainability formula moved. Recomputing the
before overall with the current curve applied to the before line counts
gives a before overall of **88.2** instead of 86.1, so the genuine gain
from this fix-up is **+6.7 overall** (88.2 → 94.9), not +8.8. The
testing (35.3 → 75.2) and versioning (86.3 → 100) comparisons are
unaffected — those formulas did not change. On the current curve,
maintainability actually fell slightly (94.2 → 92.6), as expected from
adding lines; the recorded 76.0 → 92.6 jump is the curve change, not
this work.

## Deliberately not fixed

- **23 new skills still have no `### Testing Strategy` subsection.**
  They were not in the task's Task 1 list (they scored 35–70 on testing
  from signal words alone). Listed so a follow-up can cover them:
  `nestjs`, `fastify`, `typescript-sdk`, `python-sdk`,
  `api-client-generation`, `openapi`, `react-native`, `expo`, `vue`,
  `nuxt`, `rust`, `electron`, `nx`, `changesets`, `elasticsearch`,
  `opensearch`, `clerk`, `terraform`, `pulumi`, `self-hosted-vps`,
  `mcp-security`, `agent-evaluation`, `topical-authority`.
- **Testing scores below 100 on some fixed skills, left as-is.**
  The scorer counts literal `test`/`testing`/etc. words (max 8 → 70
  points) plus 30 for the subsection. Non-code skills score lower
  because their genuine QA vocabulary is "audit", "validate",
  "cross-check", "pilot", "measure" (`editorial-workflow` 48,
  `content-decay` 56, `serp-monitoring` 56, `source-verification` 65;
  `sharp` 65 and `llm-integration` 74 for similar reasons). Padding
  those subsections with the word "test" would game the metric without
  improving the skill, so it was not done.
- **Older (pre-Phase-4) skills untouched.** 24 older skills still carry
  accessibility flags and many score low on testing; they are outside
  this task's new-skills scope.
- **No new version claims introduced**, so no official-docs version
  verification was performed. Every version line either duplicates a
  claim already verified in the skill body or uses the standard's
  "current stable as of 2026-11-20" phrasing for conceptual skills.

## Process note: version-line wording

The first pass wrote version lines as "applies to current stable X
frameworks as of 2026-11-20". That did not clear the scorer flag on 10
skills, because the scorer checks for the contiguous phrase "current
stable as of" (per `docs/SKILL-STANDARDS.md` element 7). The 10 lines
were reworded to the standard's exact phrasing ("Conceptual skill;
current stable as of 2026-11-20 — applies to ..."), after which all 14
Task 2 skills score versioning 100. The rewording changed phrasing only,
not meaning, and the 10 skills were re-validated after it.

---

## Follow-up round 2 — Testing Strategy for the remaining 23 new skills

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (no push, merge, PR, or
  commit by this agent; no branch switch)
- **Scope:** the 23 new Phase 4 skills listed as still missing a
  `### Testing Strategy` subsection in the round-1 report above.
  `skills/upstream/` untouched. Frontmatter untouched everywhere.
- **Path correction:** the task listed `security/mcp-security`, but
  the skill lives at `skills/ai-engineering/mcp-security` (per the
  registry and the Phase 4 plan); the edit went to the actual path.

## What was done (round 2)

Added a `### Testing Strategy` subsection (5 bullets of
skill-specific guidance; 4 short bullets for `electron`) at the end
of `## Implementation Standards` in all 23 listed skills — 409
insertions, 0 deletions. Verified first: none of the 23 already had
one, and none had any other `###` subsection, so each insert sits
directly before `## Best Practices`. For the two non-code skills the
subsection is validation/QA guidance, not forced unit-test advice
(`agent-evaluation`: harness golden sets, judge calibration,
adversarial cases; `topical-authority`: coverage measurement and
audit cadence). No new URLs, versions, or statistics were
introduced; tool names in the bullets (e.g. `terraform test`,
`pulumi preview`, `@nuxt/test-utils`, respx, Prism, MCP Inspector)
are ones the skills themselves already mention. Style notes:
additions match each file's wrapping (72-column wrapped files stay
wrapped; `changesets`, `nx`, `elasticsearch`, and `opensearch`
keep single-line bullets). No backticked span is split across a
line break, and no curly apostrophes were introduced.

## Per-skill changes (round 2)

Lines are `wc -l` before → after. Testing is the scorer's testing
dimension before → after (before from
`ai/test-results/phase5-quality-scores.json`, after from the fresh
run below). All 23 now score testing 100.

| Skill | Lines | Testing | Added |
| --- | --- | --- | --- |
| `ai-engineering/mcp-security` | 429 → 452 | 44 → 100 | T (call-time authorization, injection/poisoning defenses, validation/sanitization, confirmation + audit via MCP Inspector) |
| `auth/clerk` | 296 → 317 | 44 → 100 | T (`auth.protect()` per route, real session tokens, metadata trust boundaries, Svix webhook signatures, Playwright sign-in + `acceptsToken`) |
| `infrastructure/pulumi` | 367 → 388 | 44 → 100 | T (preview review, disposable dev stack, config/secrets validation, `protect: true`, recovery rebuild) |
| `infrastructure/terraform` | 322 → 340 | 44 → 100 | T (plan review, `terraform test` modules, state locking, validate/fmt/lockfile CI, sensitive handling) |
| `ai-engineering/agent-evaluation` | 354 → 373 | 70 → 100 | T (harness golden set, judge calibration, adversarial cases, regression-blocking proof, flakiness handling) |
| `architecture/changesets` | 241 → 249 | 70 → 100 | T (snapshot release, `changeset status` in CI, bump flattening/groups, Version Packages PR review, private packages) |
| `architecture/nx` | 248 → 256 | 70 → 100 | T (affected detection, cache correctness, boundary rules, task ordering, `nx migrate` upgrades) |
| `backend/api-client-generation` | 351 → 371 | 61 → 100 | T (regeneration drift check, mock-server client tests, type safety, `oasdiff breaking`, wrapper-only testing) |
| `backend/fastify` | 375 → 395 | 70 → 100 | T (`inject()` route tests, schema validation, encapsulation, error handling, `ready()`) |
| `backend/nestjs` | 356 → 376 | 70 → 100 | T (three levels, `ValidationPipe`, guards, module wiring, error mapping) |
| `backend/openapi` | 433 → 451 | 53 → 100 | T (Spectral/Redocly lint, real examples, `oasdiff breaking`, Prism mock, bundling) |
| `backend/python-sdk` | 438 → 460 | 70 → 100 | T (installed-package tests, respx/`MockTransport`, sync+async parity, lazy pagination/streaming, published-package install) |
| `backend/typescript-sdk` | 373 → 393 | 70 → 100 | T (packed-tarball ESM/CJS import, `tsc` type tests, mocked fetch, cancellation/timeouts, lazy pagination/streaming) |
| `database/elasticsearch` | 245 → 253 | 61 → 100 | T (`_analyze`, production-sized query tests, disposable-index mappings, reindex/alias swap, staging failure modes) |
| `database/opensearch` | 267 → 275 | 70 → 100 | T (disposable-index mapping/analyzer, ISM policy schedule, per-engine k-NN, reindex/alias swap, staging failure modes) |
| `desktop/electron` | 462 → 474 | 70 → 100 | T, 4 short bullets (preload bridge via Playwright, IPC security, packaged builds per OS, security defaults after upgrade) |
| `desktop/rust` | 418 → 439 | 70 → 100 | T (three levels incl. doc tests, table-driven errors, Tokio blocking, `unsafe` contracts, MSRV in CI) |
| `frontend/expo` | 370 → 390 | 53 → 100 | T (real-device dev builds, prebuild for plugins, OTA preview builds, typed routes, post-upgrade `expo-doctor`) |
| `frontend/nuxt` | 353 → 374 | 70 → 100 | T (`@nuxt/test-utils` server routes, mocked `$fetch`, per-route rendering, hydration, Playwright journeys) |
| `frontend/react-native` | 359 → 379 | 53 → 100 | T (Testing Library/Jest states, static-config navigation, mocked API layer, long lists, TurboModules both platforms) |
| `frontend/vue` | 369 → 387 | 70 → 100 | T (Vue Test Utils components, composables in isolation, Pinia stores, router guards, mocked fetching) |
| `infrastructure/self-hosted-vps` | 421 → 442 | 53 → 100 | T (backup restore, rebuild from version control, rollback rehearsal, external firewall scan, staging deploy) |
| `seo/topical-authority` | 320 → 342 | 70 → 100 | T (coverage re-measurement, cannibalization audit, internal-link audit, per-page quality audit, post-publication re-measurement) |

Longest edited file is `electron` at 474 lines (was 462); all edited
files are under the 500-line limit.

## Validation (round 2)

Filtered validation run for **every** edited skill (23/23):

```bash
node scripts/validate-skills.mjs --filter skills/<cat>/<name>
```

All 23 pass (exit 0). No validation error was introduced at any
point.

## Scorer before / after (51 new skills, round 2)

Before: `ai/test-results/phase5-quality-scores.json` (new-skills
means recomputed from its per-skill results: 94.9 / 75.2, matching
the round-1 report). After: fresh `npm run score` run after all
edits.

| New-skills mean (n=51) | Before | After |
| --- | --- | --- |
| Overall | 94.9 | **96.8** |
| Testing | 75.2 | **92.5** |
| Versioning | 100 | 100 |
| Completeness | 99.9 | 99.9 |
| Actionability | 91.5 | 91.5 |
| Security | 100 | 100 |
| Documentation | 99.7 | 99.7 |
| Accuracy (proxy) | 100 | 100 |
| Maintainability | 92.6 | 90.5 |

All-skills (n=228): overall 86 → 87, testing 33 → 37, 0 CRITICAL.
**Zero flags remain among the 51 new skills.** The maintainability
dip (92.6 → 90.5) is the expected effect of adding lines. Unlike
round 1, this comparison is apples-to-apples: every skill this
round did not touch scores byte-identical in the before file and
the fresh run, so no scorer formula changed between the two runs.

## Deliberately not fixed (round 2)

- **Testing scores below 100 on 17 round-1 skills, left as-is.**
  All 17 already have the subsection; their scores are unchanged
  from before this round (lowest: `editorial-workflow` 48,
  `content-decay` and `serp-monitoring` 56, `source-verification`
  and `sharp` 65, `llm-integration` 74; the other 11 sit at 83–91).
  They score lower because the scorer counts literal `test` words
  and their genuine QA vocabulary is "audit", "validate",
  "cross-check", "pilot", "measure". Padding those subsections
  with the word "test" would game the metric without improving
  the skills, so it was not done.
- **All 51 new skills now have a `### Testing Strategy`
  subsection.** No further Testing Strategy fix-up remains in the
  new-skills scope.
- **Older (pre-Phase-4) skills untouched**, as in round 1.
