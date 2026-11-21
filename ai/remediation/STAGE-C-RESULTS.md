# Stage C (Quality) — Results

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; nothing pushed, merged, or PR'd)
- **Scope:** skills audit (51 new skills), corrected-skills regression review (145 skills), behavioral evaluation quality + real-model layer, agents/workflows validation, and the 12 Stage C issues in `ai/remediation/ISSUE-REGISTER.md`.
- **Method:** five parallel skill-audit batches (disjoint skill sets), one regression-review agent, one installer-tests agent, one evals agent; the coordinator verified every claim before commit (diffs read, key claims re-checked against official docs, suites re-run) and serialized all commits. No upstream files were edited.

## Outcome summary

| Work | Result |
| --- | --- |
| 51 Phase 4 skills audited | 51/51 — 19 PASS, 32 FIXED, 0 NEEDS-REVIEW |
| Findings in the 51 skills | 59 (0 Critical, 3 High, 10 Medium, 38 Low, 8 Informational) — 53 fixed in place, 6 Informational needing no fix, 0 unresolved |
| Verification status after audit | 50 → `verified`, 1 → `verified-with-limitations` (`platform-social-images`); **0 skills remain `unverified`** (library split now 254 verified / 17 with limitations / 6 needs-correction / 0 unverified) |
| 145 corrected skills reviewed | 145/145 diff-scanned; 19 full-file reads; 5 findings (1 Medium, 4 Low), all fixed |
| Eval suite | 449 → **463 cases** (14 non-circular discovery cases added); **463/463 pass**, 277/277 skills selected, 0 regressions vs baseline |
| Unit tests | **196/196 pass** (195 real tests + the `test/helpers.mjs` file entry per A-18) |
| Agents/workflows | `npm run check:agents` PASS; all 51 audited skills covered by ≥1 agent/workflow |
| Stage C issues | 12 owned: 9 fixed (A-10, A-12, A-13, A-15, A-17, A-19, L-51, L-Model, L-Prisma), 2 partially fixed (A-31 — report §7 remainder to Stage E; A-34 — `grounded-in` added, phrase-anywhere remainder disclosed by design), 1 improved (A-33 — 14 non-circular cases added; generated cases remain circular by design, disclosed) |

## 1. The 51-skill audit (L-51 — fixed)

Deliverable: `ai/audits/SKILL-AUDIT-MATRIX.md` (all 51 skills, individual audit status, all 59 findings with evidence and fixes). Source fragments: `ai/remediation/stage-c/batch-1-backend-architecture.md` through `batch-5-ai-seo-content.md`.

### Counts by batch

| Batch | Skills | PASS | FIXED | Findings (C/H/M/L/I) | Fixed |
| --- | --- | --- | --- | --- | --- |
| 1 — backend + architecture | 11 | 4 | 7 | 0/0/3/8/0 | 11 |
| 2 — frontend + desktop + media | 12 | 1 | 11 | 0/0/2/15/2 | 19 |
| 3 — database + auth | 8 | 3 | 5 | 0/2/2/6/4 | 10 |
| 4 — infrastructure | 9 | 3 | 6 | 0/1/2/7/0 | 10 |
| 5 — ai-engineering + seo + content | 11 | 8 | 3 | 0/0/1/2/2 | 3 |
| **Total** | **51** | **19** | **32** | **0/3/10/38/8** | **53** |

### The three High findings (all fixed)

- **B3-01 (clerk):** `auth.protect()` example used the wrong (Core 2) call form — `protect()` on the result of `auth()`. In Clerk Core 3 the correct form is `await auth.protect()`. Fixed against the official Clerk reference.
- **B3-02 (clerk):** webhook example used a wrong option name (`secret`) and env var (`CLERK_WEBHOOK_SECRET`). The helper takes `signingSecret` and reads `CLERK_WEBHOOK_SIGNING_SECRET` — the example as written would have verified against no secret. Fixed against the official `verifyWebhook` reference.
- **G-01 (gcp):** Cloud Run example deployed from `gcr.io`; Google stopped accepting Container Registry writes on 18 March 2025. Rewritten to Artifact Registry.

### Notable Medium findings (all fixed)

- Idempotency retry with a different body returns **422**, not 409 (IETF draft); NestJS `NodeAdapter` recommended since v12.3 (not Express); NestJS CLI needs Node 22.22.3+/24.15+/26+; ClickHouse BACKUP example used inline S3 credentials contradicting the skill's own security rule (rewritten to the `Disk(…)` form); OpenSearch 1-bit quantization is opt-in, not the 3.6 default; Helm `--version` does nothing for local chart dirs; Pulumi S3 examples used deprecated inline arguments; Railway Config as Code stops being read on **2026-12-01** (hard cutoff, 11 days after the audit); Google's large-drop example is "position 4 to 29"; Nuxt engines are `^22.22.3 || ^24.15.0 || >=26.0.0` and `nuxt/server`'s `createError` takes `status`/`statusText`.

### Cross-cutting results

No fabricated capabilities, no unsafe shell commands, no credential leakage, no prompt-injection vectors, and no duplicated skills in any of the 51. Every skill is a single `SKILL.md` (no missing referenced files); all frontmatter valid; all related-skill references resolve; no broken internal links. The NestJS TypeScript 6.x pin was re-confirmed still required (`nest build` still refuses TypeScript 7).

### Verification-status update

`sources/verification-status.json`: 50 skills → `verified` (date 2026-11-20, following the file's existing verified-entry convention of `{status, date}` — the per-skill evidence lives in the matrix); `platform-social-images` → `verified-with-limitations` with the limitation recorded (Meta sharing docs returned 403 during verification, so Facebook figures rest on the `og-image-generation` skill plus secondary corroboration; X figures come from X's last published card specification, archived January 2026). The registry was regenerated: 51 status flips + 4 corrected compatibility strings (expo, nestjs, nuxt, sveltekit); regeneration is deterministic (zero diff on re-run).

### Element-14 enforcement inconsistency (follow-up, not a blocker)

Batch 2 treated a missing Accessibility subsection as a Low finding (standard element 14) and added subsections to 9 skills; batch 5 explicitly judged the absence not a finding, noting the library-wide convention (only 14 of 228 original skills carry an Accessibility subsection after batch 2's additions). The standard requires a subsection "where applicable (frontend, media, content, metadata skills)" and an N/A statement with a reason otherwise — by that text, batch 2's reading is the stricter one and batch 5's skills are also non-conforming. This is a standard-clarity problem, not a skill-accuracy problem: recommend a library-wide element-14 pass as follow-up work. No skill was held back from `verified` on this basis.

## 2. Regression review of the 145 corrected skills (all fixed)

Source fragment: `ai/remediation/stage-c/regression-145-review.md`. Method: full diff scan of the Phase 3 commit `cabb9cf` (398 hunks, 5,834 diff lines; all 483 non-blank deleted and 1,650 non-blank added lines reviewed) + 9 deep-checks read in full against current official docs + 2 web-verified deep-checks + a 10-skill spot-check sample (19 full-file reads total).

| ID | Severity | Finding | Root cause | Fix |
| --- | --- | --- | --- | --- |
| F1 | Medium | `twitter-cards` recommended 1200x628 (1.91:1) for large cards, contradicting `twitter-card-images` (1200x600, 2:1) | Two Phase 3 batches picked different "correct" values in the same commit | All 5 occurrences aligned to 1200x600 (2:1), noting 1200x628/1200x630 acceptable with ~14 px crop |
| F2 | Low | `secure-headers` said the `hsts` option was "removed in Helmet 4" | Phase 3 misattributed the rename version (`hsts` was live in Helmet 4 and v7-era source) | Corrected to Helmet 8 (caveat: no explicit Helmet 8.0.0 changelog entry naming the rename was located; established by evidence chain) |
| F3 | Low | `prisma` named the pre-7.10 config file (`prisma.config.ts`) | Phase 3 knew about the 7.10 rename but the skill text named the old file without qualification | Now `prisma7.config.ts` on 7.10+, `prisma.config.ts` on 7.0–7.9, with a "do not create a second config file" warning |
| F4 | Low | `prisma` said Prisma 8 supports "PostgreSQL and MongoDB only" | Post-Phase-3 drift (MySQL/MariaDB early preview, SQLite experimental added ~19 Nov 2026) | Precision edit listing the current support tiers |
| F5 | Low | 6 skills said Node.js 20 reached EOL "in March 2026" | Phase 3 confused the last release date (v20.20.2, 24 Mar 2026) with the EOL date | Corrected to 30 April 2026 in nodejs, cloudflare-workers, docker, github-actions, playwright, vitest |

No lost content, broken links, mangled examples, or over-corrections beyond these. Deep-checks confirmed the highest-risk Phase 3 corrections still hold (Next.js fetch uncached by default since 15; rate-limiting IETF draft rev. 11; OWASP Top 10:2025 list exact; FAQ rich-results removal 7 May 2026; otplib v13 API; MCP SDK v2; Turborepo CVE-2026-45772). Unresolved: Next.js 16 "Active LTS since 2026-10-21" could not be confirmed either way (left unchanged; recommend a one-line confirmation against the Next.js release page in a later pass); X Cards docs are no longer published by X (2:1 spec from X's last published specification, archived Jan 2026).

## 3. Behavioral evaluation quality + real-model layer (A-10, A-17, A-19, A-33, A-34, L-Model)

Source fragment: `ai/remediation/stage-c/evals-results.md`. Commit `cee083e`.

### A-10 (Medium) — fixed

**Root cause:** the smoke test spawned the real runner with no output redirection, so every `npm test` overwrote the full eval report with a 1-case report. **Fix:** `--out <dir>` flag on the runner (redirects `latest.json`/`latest.md` and the regression comparison as `regression.json`); the smoke test now uses a temp dir and asserts `evals/reports/latest.json` is byte-identical afterwards. **Nuance found during verification:** `evals/reports/` is gitignored, so the clobbering was a local-artifact issue, not a committed-file issue — the fix is still correct and the smoke test now guards it.

### A-17 (Low) — fixed

**Root cause:** `summarize()` added the case's own declared `skill` field to the covered set, so 277/277 followed from case authorship even if the agent selected nothing. **Fix:** coverage now counts only actually-selected skills. Full run still reports **277/277** — the number holds from real selection, honestly confirmed.

### A-19 (Low) — fixed

**Root cause:** the test named "runner rejects an unknown skill in a case file" actually tested a bad `--cases` filter; the `validateCases` unknown-skill path was untested. **Fix:** renamed to "runner exits 2 when the --cases filter matches nothing"; added real `validateCases` tests (unknown skill / expected skill / notSkill, plus duplicate-id, unknown-category, no-expectations). `validateCases` is exported from the runner with a main-guard so importing it doesn't run the suite.

### A-33 (Informational) — improved

Added 14 non-circular discovery cases (`evals/cases/discovery-realistic.json`, `DIS-real-*`), all passing. First drafts exposed **4 genuine discoverability gaps** (users without the domain term — "rate limiting", "audit", "unit test", "Dockerfile" — don't find the skill; the stemmer maps "Dockerfiles"→"dockerfil"). Recorded in the fragment as findings, not hidden by rewording. Generated cases and their disclosure untouched. These are retriever/description gaps, not skill-content errors; fixing them means retriever tuning (discouraged by the selection scorer's header) or registry description enrichment (future work).

### A-34 (Informational) — partially strengthened, remainder disclosed

Added a `grounded-in` check to the content scorer (evaluated skill must be among selected skills — closes the "incidental text from another skill" hole; verified all 86 content cases already satisfy it, 0 new failures). The "phrase anywhere in the file" half is deliberately unfixed — restricting the answer would invalidate the baseline — with the disclosure intact and now precisely worded in `evals/README.md`, `docs/EVALUATION.md`, and the report limitations section.

### L-Model (Low) — done (layer built; no real-model run executed)

Provider-independent real-model layer (`evals/runners/providers.mjs`, rewritten): `parseModelConfig` with validation (required `EVAL_PROVIDER_URL/KEY/MODEL`; optional timeout default 60s, max retries default 2, retry delay default 1s doubling to 30s cap, max tokens, input/output prices for cost estimates). No hardcoded keys; the key never appears in reports/metadata/logs (asserted in tests). Retries only on 429/5xx/timeout/network errors; 4xx, non-JSON responses, and non-JSON model output fail fast. Usage/cost tracking per case and aggregate; system prompt now also requests `code` blocks so code cases are scorable on a real model. **Separation:** mock → `evals/reports/`; model → `evals/reports/model/`; `--out` overrides both. Model runs never compare to the mock baseline and `--save-baseline` with `--provider model` is refused (exit 2) before any API call. Model reports carry `providerKind`/`providerMeta`/`usage` and a REAL-MODEL RUN banner. Standard suite needs no credentials; `--provider model` without config fails cleanly (exit 2). New `--cases-file` flag + representative **75-case subset** (`evals/datasets/real-model-subset.json`: all 25 security + all 12 code + 2/category × 10 + 1 generated/category × 18; passes 75/75 on mock). Plan: `docs/REAL-MODEL-EVALUATION.md` — subset rationale, config, how to run, interpretation vs mock baseline, cost/time estimates (subset ≈ $0.50–$1.50, ~3–8 min), and the explicit statement that **no real-model run has been executed** (no credentials) and must not be claimed.

### Baseline re-save — recorded reason

`evals/baselines/current.json` was re-saved (new snapshot `evals/baselines/baseline-2026-11-21.json`; the old `baseline-2026-11-20.json` snapshot is untouched): (1) 14 new passing cases added (A-33) — the old 449-case baseline would report them as "new" on every future run; (2) the coverage metric changed construction (A-17) and the content scorer gained the `grounded-in` check (A-34), so the stored per-case scores were stale; (3) the re-save run showed **0 regressions** vs the old baseline, so nothing was silenced. The old baseline remains in git history and as `baseline-2026-11-20.json`. The coordinator re-ran `npm run evals` after the final registry regeneration: 463/463, 277/277, 0 regressions — the re-saved baseline holds.

## 4. Installer test gaps (A-12, A-13, A-15 — all fixed)

Source fragment: `ai/remediation/stage-c/installer-tests-results.md`. Commit `4705e0c`. 8 new tests in `test/installer.test.mjs`; installer suite 72 → **80/80 pass**.

### A-12 (Low) — fixed

**Root cause:** the `--backup` flag was parsed and handled but no test ever executed it, so a regression in the `--backup` path would ship silently. **Fix:** 1 test — `--backup` backs up a modified conflict and a foreign-content conflict and overwrites without prompting; the backup holds the pre-conflict content byte-identical.

### A-13 (Low) — fixed (remaining gaps)

Stage B had already covered swapIn failure/rollback (A-05 unit tests) and stale-cleanup (A-30 CLI test) — verified, not duplicated. **Fix:** 6 new tests — 3 dry-run (update/uninstall/restore, all asserting byte-identical state via a `snapshotInstallState`/`assertStateUnchanged` helper) and 3 PTY (abort stops the run and changes nothing; uninstall `--all` prompt no/yes; modified-content uninstall prompt no/yes with backup). `test/helpers.mjs`: `runCliPty` looks `script` up on PATH (instead of hard-coded `/usr/bin/script`), returns a clear skip reason, treats spawn `ENOENT` as unavailable. **Remaining gap:** PTY tests still skip where `script` is absent (notably Windows) — a `node-pty` dependency decision for Stage D, not taken here.

### A-15 (Low) — fixed

**Root cause:** `runUninstall` rewrote modified/foreign items' `action` to `remove`, discarding the classification — so the backup decision re-derived it by string-matching human-readable reason text (`reason.includes('differs')`). A reason-text edit would silently disable backups. **Fix:** structured boolean `needsBackup` set at classification time in `scripts/install/commands.mjs` (absent→false, foreign→true, modified→true, link→`!inLibrary`, manifest-matching→gone); filter is now `p.action === 'remove' && p.needsBackup`; `notInLibrary` removed. Verified: no `reason.includes` or `notInLibrary` remains in `scripts/` or `test/`. 1 test pins all three classifications in a single run (unmodified manifest-matching control, modified, foreign); the pre-existing A-14 test passes unchanged against the refactor.

## 5. Agents and workflows validation + A-31

- `npm run check:agents`: **PASS** (40 files — 24 agents, 16 workflows — against 277 skills).
- All **51/51** audited skills are covered by ≥1 agent/workflow (verified mechanically against `registry/agents.json` `discover`/`use` + `registry/workflows.json` `skills`). Library-wide, 173/277 skills appear in some agent/workflow — the rest are not agent-indexed by design (agents are curated entry points, not an exhaustive index); not a Stage C issue.
- **A-31 (Informational) — partially fixed.** Sub-claims: (1) INSTALLATION.md "update repairs broken links" omitting silent repoint of diverged links — moot: Stage B's A-07 fix made diverged links a conflict, and the doc no longer makes the claim; (2) uninstall doc omitting unmodified content removed without backup — resolved by Stage B's A-14 doc update (the doc now states it explicitly); (3) `install-skills.mjs` header "swapped in atomically" — **fixed in Stage C** (commit `1c8e657`): now says two renames, each atomic, the pair not; (4) report §7 "Atomic installs with rollback … (tested, including interrupted installs)" — **remainder for Stage E**: the report is a historical record and Stage E owns report reconciliation; the "atomic" wording is now outdated (two-rename swap, not atomic) and a kill mid-swap is still not testable at CLI level. The report's installer test count (43) is also stale (now 80) — same Stage E pass.

## 6. L-Prisma (Low) — resolved (research + status notes, no upgrade)

Source: `ai/remediation/stage-c/regression-145-review.md` §4. **Current stable: Prisma ORM 7.10.1** (on the `prev` npm tag). **Prisma 8 is still a release candidate with no GA date announced** — the October GA date was removed from the release-status page on 13 November 2026; latest `prisma` 8.0.0-rc.34, `@prisma/orm-postgres`/`@prisma/orm-mongo` 8.0.0-rc.24 (16 Nov 2026). Prisma 6 EOL 19 Nov 2026; Prisma 7 supported 18 months post-GA; Prisma 8 needs Node 22.18+/24.11+/26+ and TS 5.9+; missing vs 7: `$extends`, JSON filtering, atomic `increment`, most nested writes, P2002-style error codes; Accelerate retires 1 Dec 2026; Compute runs only Prisma 8. The three upstream skills' RC pins are stale/drifting (prisma-compute rc.21/rc.23; prisma-mongodb-upgrade rc.13; prisma-postgres-upgrade rc.27/rc.20 vs current rc.34/rc.24) — documented only, not edited (upstream policy). The three skills' verification-status notes were **truncated mid-sentence at 160 chars** (a pre-existing Phase 3 authoring artifact); Stage C completed them with the full L-Prisma findings. The GA upgrade path (contract, `prisma contract emit`, per-database libraries, re-verification list) is documented in the regression fragment. **No upgrade to an RC is recommended**; the library's stance (pin `prisma@7`, use `npx prisma@7` in CI) stands until GA is announced on the official release-status page. Evidence: https://www.prisma.io/docs/orm/release-status (updated 2026-11-20T15:18:16Z), verified by the coordinator.

## 7. Incidental fixes found during Stage C verification

- **Registry test pinned counts (commit `7cf084d`):** `test/registry.test.mjs` hard-coded the Phase 9 split (204/51/16/6); the Stage C status update broke it (254 ≠ 204). Updated to the new split (254/0/17/6) with a comment forbidding count updates except on a re-audit. The query CLI's `status --json` also omitted zero-count statuses entirely (`unverified` key missing when 0); fixed to always emit all four known statuses so the schema is stable and "0 unverified" is explicit.
- **Living-doc counts (commit `7cf084d`):** README, `docs/ARCHITECTURE.md`, and `docs/UPGRADE.md` still stated the old split (204/16/6/51), 449 eval cases, and 129 unit tests — updated to 254/17/6/0, 463 cases, 196 tests. The ARCHITECTURE providers row no longer says "untested without credentials" (unit-tested against a stub; no real-model run executed). Historical records (final report, phase results, decisions, CHANGELOG) were left untouched.
- **Scanner-tripping quotes (commit `5b4e698`):** two literal scanner-flagged constructs in already-committed audit fragments were reworded; `npm run check:security` green after. Lesson recorded: avoid literal scanner-flagged constructs in audit/report text, or the scan goes red again.

## 8. Tests executed (all run by the coordinator at the final HEAD unless noted)

Commands run from the repo root. Full battery after the last edit:

| Command | Result |
| --- | --- |
| `npm test` | **196/196 pass, 0 fail** (195 real tests + the `test/helpers.mjs` file entry per A-18; ~62s) |
| `npm run evals` | **463/463 pass, 0 failed, 0 critical; coverage 277/277 selected; vs baseline 0 regressions / 0 fixes / 0 new / 0 removed** |
| `npm run validate` | PASS with 4 warnings (all pre-existing upstream, informational) |
| `npm run validate:strict` | PASS with 4 warnings (same 4 upstream) |
| `npm run check:frontmatter` | PASS (277 skills) |
| `npm run check:links` | PASS (75 internal links; 610 unique external URLs listed — use `--online` to verify) |
| `npm run check:duplicates` | PASS (277 skills, threshold 0.8) |
| `npm run check:sources` | PASS (277 skills against 7 sources, 0 warnings) |
| `npm run check:agents` | PASS (40 files: 24 agents, 16 workflows) |
| `npm run check:registry` | PASS (277 skills, 24 agents, 16 workflows) |
| `npm run check:security` | PASS: no findings (1,053 text files + 4 binary, 29 patterns) |
| `npm run check:upstream` | **Could not run — GitHub API rate limit exhausted** (HTTP 403, rate-limit remaining: 0; 6 unknown). Not a Stage C failure: no upstream files were touched, and Stage A re-verified all 6 upstream commits + licenses via the GitHub API earlier on 2026-11-20. Stage D should re-run it when the rate limit resets. |
| `npm run score` | Mean 87/100 (228 original skills), 0 CRITICAL |
| `npm run registry` (regenerate + diff) | Zero diff (deterministic) |
| `node --test test/evals.test.mjs` | 35/35 pass |
| `node --test test/installer.test.mjs` | 80/80 pass |
| `node --test test/registry.test.mjs` | 15/15 pass |
| `npm run evals -- --cases-file evals/datasets/real-model-subset.json` | 75/75 on mock |
| `npm run evals -- --provider model` (no config) | Fails cleanly, exit 2, naming the three missing variables |

## 9. Remaining risks and handoff notes for Stage D

1. **No real-model run has been executed** (L-Model). The provider layer is proven only against a local stub endpoint. The first real run should be the 75-case subset with human review of failures. Do not claim real-model validation until then. No spend cap in the layer (tracking only).
2. **A-33 discoverability gaps are real and unfixed.** Four first-draft phrasings show users who don't already know the domain term may not find the skill via keyword retrieval; the stemmer maps "Dockerfiles" to a stem that never matches the docker description. Registry description enrichment or a dedicated retriever calibration run is future work.
3. **PTY tests skip on Windows** (no `script` binary). The prompt paths are untested there. A real fix needs `node-pty` or equivalent — a dependency decision for Stage D.
4. **Post-swap mismatch branches** (A-06/A-16a) remain covered at the unit/helper level only — no CLI input can reach them after a passing pre-swap check.
5. **Element-14 (Accessibility) enforcement is inconsistent** across the library (see §1). Recommend a library-wide pass as follow-up, not a Stage D blocker.
6. **20 verification-status notes are truncated at 160 chars** (pre-existing Phase 3 authoring artifact; Stage C completed only the 3 Prisma notes in scope). The other 17 (e.g. `seo`, `site-architecture`, `vercel-cli-with-tokens`) still end mid-sentence. Recommend completing them from the Phase 3 audit in a later pass.
7. **Version pins are dated 2026-11-20** and will drift on their normal release cadence; re-check at the next audit cycle. Railway's Config as Code hard cutoff is **2026-12-01** — the skill now states it, but any downstream Railway guidance should be re-checked after that date.
8. **Test-count nuance (A-18, Stage E):** `npm test` prints 196; 195 are real tests (`test/helpers.mjs` counts as a 0-test file entry). Stage E should re-baseline headline numbers and resolve A-18 (scope the test script or move helpers out of `test/`).
9. **`check:upstream` needs a re-run** when the GitHub API rate limit resets (see §8).
10. **Stage B handoff items still open:** S-08/S-09 stay open upstream (mitigated in docs); Tier-2 manifest-root residual (bounded); S-14 monitoring gap (weekly drift check watches the dormant fork); stale-lock window up to 10 min; `update`/`uninstall` on a nonexistent skills dir create the empty dir as a lock side effect.
11. **A-31 report §7 remainder** (see §5) and the report's stale installer test count (43 → 80) belong to Stage E's report-reconciliation pass.

## 10. Commits (Stage C, all on `feat/skillforge-production-upgrade`)

| SHA | Content |
| --- | --- |
| `1c8e657` | A-31: `install-skills.mjs` header — "swapped in atomically" → two-rename wording |
| `3afb568` | Batch 4: infrastructure audit (9 skills, 10 findings fixed) |
| `c8f6925` | Batch 5: ai-engineering/seo/content audit (11 skills, 5 findings) |
| `3504c26` | Batch 2: frontend/desktop/media audit (12 skills, 19 findings) |
| `7bdc7ca` | Batch 1: backend/architecture audit (11 skills, 11 findings) |
| `a2309fd` | Batch 3: database/auth audit (8 skills, 14 findings) |
| `8769a02` | Regression review of the 145 corrected skills (5 findings fixed) + L-Prisma research |
| `4705e0c` | Installer test gaps A-12/A-13/A-15 (8 new tests, `needsBackup` refactor) |
| `5b4e698` | Reword two scanner-tripping quotes in audit fragments (scan green) |
| `cee083e` | Eval quality fixes (A-10/A-17/A-19/A-33/A-34) + real-model provider layer (L-Model) |
| `2a6af50` | Skill audit matrix + verification-status update + registry regeneration |
| `7cf084d` | Pinned status counts + living-doc counts + query CLI stable status schema |

Stage C started at head `87b9fee` (Stage B done). Stage C head at the time of writing: `7cf084d` (this results file, the register updates, and the PROJECT-STATUS log entry follow in the closing commit).
