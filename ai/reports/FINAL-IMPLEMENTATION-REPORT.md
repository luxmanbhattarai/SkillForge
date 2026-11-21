# SkillForge — Final Implementation Report: 12-Phase Production Upgrade

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (from `main` @ `bc304a2`, v1.0.0)
- **Rule throughout:** local commits only on this branch; nothing pushed, merged, or PR'd.
- **Head at report time:** Phase 11 commit `6b0a79e`; this report ships with the Phase 12 commit (plus small fix-ups correcting numbers in this report itself — a commit count cited here would go stale with every fix-up, so see git log for the head hash and count).
- **Machine-readable results:** `ai/test-results/phase12-final-results.json`
- **Status tracker:** `ai/PROJECT-STATUS.md` (all 12 phases Verified)

## 1. Executive summary

SkillForge v1.0.0 (2026-11-20) was a working 226-skill library with
no test suite, an installer that silently deleted user-modified
skills, a non-deterministic registry, and unverified technical
claims. This 12-phase upgrade, executed in four waves on a single
branch, turned it into a production-grade ecosystem:

| | v1.0.0 (main @ bc304a2) | After upgrade |
| --- | --- | --- |
| Skills | 226 (177 original + 49 upstream) | **277 (228 original + 49 upstream)** |
| Categories | 16 | **18** |
| Agents / workflows | 20 / 9 | **24 / 16** |
| Tracked files | 844 | **1,069** |
| Unit tests | 0 | **129, all passing** |
| Behavioral eval cases | 0 | **449, all passing** |
| Technical accuracy | unaudited | **all 226 v1 skills audited; 145 corrected** |
| Installer | destructive, no manifest | **safe CLI: backups, atomic installs, rollback** |
| Registry status | hardcoded `verified` | **evidence-based per-skill status** |
| CI | 3 workflows, unpinned actions | **6 workflows, SHA-pinned, least-privilege** |
| Security scanner | 7 patterns | **29 patterns + binary byte-scan** |

Every phase was implemented and tested before being marked
Verified. Two defects were found and fixed during final
verification itself (Phase 12): `validate:strict` could never
pass because it failed on unfixable upstream warnings, and the
`graphql` skill was invisible to the Skills CLI because its
frontmatter contained an unquoted `: ` that strict YAML rejects.
Both are fixed, tested, and documented below.

Nothing in this report is claimed without evidence: every number
comes from a command run on 2026-11-20 and recorded in
`ai/test-results/`. Where something could not be verified, it is
listed as a limitation, not claimed.

## 2. Initial audit findings

Phase 1 (`ai/audits/INITIAL-AUDIT.md`) found **27 findings: 0
Critical, 5 High, 10 Medium, 12 Low.**

**High (all fixed):**

- **H-01** — Installer silently deleted existing skill
  directories. Fixed in Phase 2 (conflict detection, backups).
- **H-02** — Registry generation was non-deterministic (`generated`
  used the wall-clock date); CI would fail from 2026-11-21. Fixed
  in Wave 1: `generated` derives from the newest `last_verified`.
- **H-03** — No test suite existed anywhere. Fixed in Phases 2/6/9/12:
  129 unit tests now exist.
- **H-04** — Next.js skill stated an outdated fetch-caching default
  (fetch is NOT cached by default since Next.js 15). Fixed in
  Phase 3.
- **H-05** — Agents and workflows had no validation at all. Fixed in
  Phase 8 (validator + `npm run check:agents`).

**Medium (all addressed):**

- **M-01** — Registry hardcoded `status: "verified"` for every
  skill. Fixed in Phase 9 (evidence-based status from the Phase 3
  audit).
- **M-02** — Security scanner was regex-only (7 patterns). Fixed in
  Phase 7 (29 patterns + multi-line + binary scan).
- **M-03** — CI did not run all available checks. Fixed in Phase 10.
- **M-04** — CI actions unpinned; no least-privilege permissions.
  Fixed in Phase 10.
- **M-05** — Installer lacked all safety and lifecycle features.
  Fixed in Phase 2.
- **M-06** — Install target paths asserted without vendor-doc
  references. Fixed in Phase 2 (Codex/Antigravity corrected to
  `.agents/skills` against current vendor docs).
- **M-07** — Agents/workflows referenced skills by names that do not
  exist (shorthand refs). Fixed in Phase 8.
- **M-08** — 11 upstream-only validator warnings were permanent
  as-is. Triaged in Phase 3; reduced to 4 by Phase 12 (L-01 fix
  removed the ai-seo false warning; the rest are genuine upstream
  issues, unfixable by policy, now labeled informational).
- **M-09** — `npx skills add` install path advertised but untested.
  Verified in Phase 2 (226 skills) and re-verified in Phase 12
  (277 skills).
- **M-10** — No registries for agents/workflows; no registry schema
  validation. Fixed in Phase 9.

**Low (all resolved except L-02/L-03, see below):**

- **L-01** — Validator line count off by one (trailing newline
  counted as a line). Fixed in Phase 12, in the validator and the
  scorer.
- **L-02** — Two upstream Prisma skills are 14-line pointer stubs.
  Informational; no action required (correct verbatim imports).
- **L-03** — Progressive disclosure (`references/`, `examples/`,
  `scripts/`, `assets/`) specified but unused by original skills.
  Deliberately not done: extracting reference material from 228
  skills for its own sake was rejected; the standard still
  describes the layout for new skills that need it.
- **L-04** — Research snapshot contained a parse error
  (`prisma/skills | PARSE ERROR`) and had no update process.
  Fixed in Phase 12 (line filled from the live GitHub API; header
  documents purpose and refresh).
- **L-05** — Hand-rolled frontmatter parser covers a strict subset.
  Documented in Phase 11; the subset was additionally tightened in
  Phase 12 (unquoted `: ` now rejected — see §6/§16).
- **L-06** — Report generator hardcoded the 177-skill target tree.
  Fixed in Phase 9 (externalized; report now 228/228).
- **L-07** — Vendor/category tables hardcoded in the registry
  generator. Fixed in Phase 9 (externalized to JSON).
- **L-08** — `.claude/settings.json` was an empty permissions
  object. Fixed in Phase 11 (file deleted; it was a no-op).
- **L-09** — Category-count wording differed between README and
  registry. Fixed in Phase 11.
- **L-10** — Agentic SEO upstream source is low-activity. Resolved
  in Phase 7: MONITOR, re-verify source before next re-import
  (S-14).
- **L-11** — Link-check exception list had no scheduled
  re-verification. Fixed in Phase 10 (weekly online link check).
- **L-12** — Runtime version spread untested (engines claims
  `>= 18`, CI ran only Node 20). Fixed in Phase 10 (Node 18/20/22
  matrix).

## 3. Work completed

Work ran in four waves, phase by phase, each committed separately
on `feat/skillforge-production-upgrade`:

| Wave | Phases | Headline outcome |
| --- | --- | --- |
| 1 | 1–3 | Audit (27 findings); safe installer rebuilt; all 226 skills audited, 145 corrected |
| 2 | 4–5 | 51 new skills (277 total); 22-element quality standard + scorer |
| 3 | 6–8 | 449-case behavioral eval suite; security scanner 7→29 patterns + audit; 4 agents + 7 workflows |
| 4 | 9–12 | Registry semantics + schemas + query CLI; CI/CD overhaul; documentation overhaul; full verification + this report |

Phase commits (Wave 4): Phase 9 `e6a6b01`, Phase 10 `75ef701`,
Phase 11 `6b0a79e`, Phase 12 (this commit). Earlier phase work is
recorded in `ai/PROJECT-STATUS.md` and `ai/test-results/`.
Total: 429 files changed vs `main`
(+70,236/−1,165 lines).

## 4. New skills added

**51 new original skills** in Phase 4, taking the library from
226 to 277 skills and adding 2 categories (`ai-engineering`,
`desktop`). All 51 were written against official documentation
and are marked `unverified` in `sources/verification-status.json`
— they have not had a formal technical-accuracy audit yet (see
§6). Two existing skills were also extended. The 51:

advanced-api-architecture, agent-evaluation, ai-agents,
api-client-generation, authjs, aws, changesets, clerk,
clickhouse, content-decay, editorial-workflow, elasticsearch,
electron, entity-seo, expo, express, fastify, fly-io, gcp,
kubernetes, llm-integration, mcp-security, nestjs, nuxt, nx,
openapi, opensearch, passkeys, platform-social-images, pulumi,
python-sdk, rag, railway, react-native, redis,
release-management, render, resvg, rust, satori,
self-hosted-vps, serp-monitoring, sharp, source-verification,
supabase-auth, sveltekit, tauri, terraform, topical-authority,
typescript-sdk, vue.

All 51 are covered by at least one agent or workflow (Phase 8),
have a generated discovery eval case each (Phase 6), and passed
the Phase 4 online link check (609 URLs verified, 0 errors after
4 link fixes).

## 5. Existing skills improved

**145 original skill files corrected in Phase 3** (+1,715/−507
lines) after auditing all 226 v1.0.0 skills against official
documentation. Notable corrections:

- Next.js fetch caching: fetch is NOT cached by default since
  Next.js 15 (H-04).
- Wrong defaults in rate limiting, Helmet, Prisma 7/8, MySQL,
  and Turborepo guidance.
- Retired Google/X features removed or corrected (e.g. X Card
  Validator retired 2022-08-02; Google features retired).
- `twitter-cards`, `twitter-card-images`, `social-preview`:
  dimension and testing-workflow corrections.

**Later fixes (Phases 6–12):**

- Changesets GitHub Action v4 → v7; Prisma/Drizzle stale Node
  24/TS 5.x prerequisites → Node 26 LTS/TS 7.x; NestJS frontmatter
  TS 5.x → 6.x (nest build lacks TS 7 support) — found while
  writing eval cases (Phase 6 follow-up).
- `graphql`: frontmatter `compatibility` value quoted — it
  contained an unquoted `: `, which strict YAML rejects and which
  made the skill invisible to the Skills CLI (Phase 12).

No upstream skill was edited at any point (verbatim-import
policy). The 6 upstream skills with known errors are recorded as
`needs-correction` with fixes belonging upstream (§6).

## 6. Skills not verified

Honest status, from `sources/verification-status.json` (Phase 3
audit outcomes + Phase 4 additions). **Not all 277 skills are
technically verified**, and no document in this repository claims
otherwise.

| Status | Skills | Meaning |
| --- | --- | --- |
| `verified` | 204 | Audited against official docs; guidance confirmed. |
| `verified-with-limitations` | 16 | Audited; known limits recorded (below). |
| `needs-correction` | 6 | Known errors — all upstream; fixes belong upstream. |
| `unverified` | 51 | The Phase 4 skills; written against official docs, no formal audit yet. |

**Needs correction (all upstream):** prisma-upgrade-v7, seo,
vercel-composition-patterns, vercel-react-best-practices,
vercel-react-view-transitions, web-artifacts-builder. Details in
`ai/audits/TECHNICAL-ACCURACY-AUDIT.md`.

**Verified with limitations (16):** limitation types are
import-scope gaps (upstream skills referencing unimported
siblings: ai-seo, competitor-profiling, cro, executing-plans,
link-building, using-superpowers, writing-skills); Prisma 8 RC
pins that have since moved (prisma-compute,
prisma-mongodb-upgrade, prisma-postgres-upgrade — Prisma 8 is
still RC); X/Twitter documentation limits (social-preview,
twitter-card-images, twitter-cards); one broken illustrative
link (site-architecture); and Vercel CLI/pricing discrepancies
(vercel-cli-with-tokens, vercel-optimize). Full notes are in
`sources/verification-status.json`.

Structural validation (`npm run validate`, `check:frontmatter`,
etc.) passes for all 277 skills — but structural validity is not
technical verification, and this report does not conflate them.

## 7. Installation improvements

Phase 2 rebuilt the installer (`node scripts/install-skills.mjs`)
from a destructive copy script into a safe CLI:

- **Commands:** install, update, list, doctor, validate,
  uninstall, restore (plus legacy no-command invocation).
- **Conflict detection by hash:** user-modified installs are
  refused (or prompted interactively) instead of overwritten.
- **Backups before replacement:** every replacement backs up the
  old content first; `restore` brings it back. Backup location is
  a sibling of the skills dir, never inside it.
- **Atomic installs with rollback:** staging + swap; a failed
  install leaves no half-installed skill (tested, including
  interrupted installs).
- **Manifest tracking:** `.skillforge-manifest.json` records every
  installed item with source hashes; `list` falls back to a disk
  scan if the manifest is corrupt, `doctor` fails, `install`
  repairs.
- **Dry-run, `--force`, `--link`** (symlink installs; agents are
  copied transformed, with a notice), **`--dest`** overrides.
- **Targets:** Claude Code, Cursor, Codex, Antigravity; user and
  project scopes. Codex and Antigravity paths corrected to
  `.agents/skills` against current vendor docs; `doctor` reports
  installs left in legacy locations. Agents install where targets
  document a location (Codex agents as TOML); Antigravity
  workflows are deprecated by Google and install with a warning.
- **Installs are adopted:** content identical to the library is
  adopted into a fresh manifest (pre-upgrade installs have none).

**Installer test coverage (43 tests in `test/installer.test.mjs`
+ 8 in `test/library.test.mjs`, 4 in `test/hashing.test.mjs`,
8 in `test/targets.test.mjs`):** fresh install, existing install,
selective install, category install, user-scope install,
project-scope install, dry-run, force replacement, backup/restore,
uninstall (including refusal without `--force` and `--all`
requiring `--force`), conflicts (refusal + interactive prompt),
interrupted install (copy failure + staging failure), permission
errors (added Phase 12 — runs as `nobody` when the suite runs as
root), repeated install (idempotent no-op), path handling
(`--dest`, target aliases, legacy paths), agent/workflow install
formats, doctor/validate/list JSON output, manifest corruption.

**Skills CLI path (`npx skills add`):** verified in Phase 2
(226 skills) and re-verified in Phase 12 against the local
working copy (277/277 discovered, 0 skipped; `graphql` installed
with content identical to the library). That re-verification
caught the `graphql` frontmatter defect (§16).

## 8. Behavioral evaluation implementation

Phase 6 built `evals/` — a behavioral evaluation suite with a
**deterministic mock agent** (no LLM APIs, no keys, no network):

- **449 cases, all passing** (verified 2026-11-20, 0 failed,
  0 critical, 277/277 skills covered, 0 regressions vs baseline):
  172 hand-written cases across 14 files (skill selection,
  content grounding, refusal of unsafe requests, code generation;
  12 categories, 4 scorers) + 277 generated discovery cases, one
  per skill (`evals/datasets/discovery-generated.json`,
  regenerable with `npm run evals:generate`).
- **Baseline + regression comparison:** `evals/baselines/current.json`
  is the regression reference; the runner writes a comparison to
  `evals/regression/latest.json`. The baseline is re-saved only
  deliberately (`--save-baseline`) with a recorded reason.
- **Mock agent** implements the `AGENTS.md` discovery rules
  (registry search → selection → load → ground → refuse unsafe
  input) with deterministic ranking (score, then name) and a
  safety check that refuses injection and destructive input.
- **Model-based evaluation** is supported through a provider
  interface (`evals/runners/providers.mjs`, OpenAI-compatible
  endpoint via `EVAL_PROVIDER_*` env vars) but is **untested
  without credentials** — the mock provider is what CI runs and
  what the 449/449 result measures.
- **Honest scope:** the suite evaluates the *library*
  (discoverability, trigger discrimination, content completeness,
  safety guidance), not a real model's reasoning. A real model can
  behave differently from the mock.

The eval suite found real defects while cases were being written
(Phase 6 follow-up): 3 library defects (changesets action,
prisma/drizzle prerequisites, nestjs TS version) and 2 framework
defects (extractCode phantom/swallowed blocks; tsStructure false
UNBALANCED on URLs in strings) — all fixed, with 4 regression
tests added.

## 9. Security improvements

Phase 7 (`ai/audits/SECURITY-AUDIT.md`, findings S-01–S-15)
plus Phase 10 CI integration:

- **Scanner expanded 7 → 29 patterns** (`scripts/security-scan.mjs`,
  `npm run check:security`): secrets, prompt-injection markers,
  dangerous commands (including multi-line curl-pipe detection),
  code-vulnerability shapes — over every text file plus a
  **byte-level secret scan over binaries**. Final run: 1,032 text
  files + 4 binary files scanned, **no findings**.
- **Shared pattern library** (`scripts/lib/security-patterns.mjs`):
  one source of truth for the scanner, the quality scorer, and
  the eval mock agent.
- **Supply chain verified:** all 6 upstream import commits and
  licenses re-verified against the public GitHub API; upstream
  drift now monitored weekly in CI (`npm run check:upstream`).
- **Documentation:** `SECURITY.md` strengthened,
  `docs/SECURITY-SCANNING.md`, `docs/THREAT-MODEL.md`.
- **Audit outcome (S-01–S-15):** 7 fixed, 4 accepted upstream,
  3 unresolved upstream, 1 open. **No live credentials, no
  malicious code found.** No Critical findings.
- **Remaining risk (honest):** S-08 (High, unresolved upstream —
  Agentic SEO documents a curl-pipe-to-shell install),
  S-09 (Medium, unresolved upstream — Agentic SEO disables TLS
  verification in a link-check script), S-11 (Medium, unresolved
  upstream — Prisma upgrade guide recommends
  `rejectUnauthorized: false`), S-14 (Medium, open — agentic-seo
  import source MONITOR). All four are upstream content that
  cannot be edited here; all are documented with mitigations and
  flagged for upstream follow-up.
- **Scanner scope and limits:** the scanner is pattern-based; it
  does not prove the absence of vulnerabilities. Semgrep,
  Gitleaks, and TruffleHog are not installed locally and never
  ran; CodeQL runs only via the GitHub workflow (Phase 10), which
  has not run on GitHub yet. GitHub secret scanning, Dependabot
  alerts, and branch protection are manual repo settings still to
  be enabled (see `ai/phase10/NOTES.md`).

## 10. Agent/workflow improvements

Phase 8 (validator + expansion):

- **Validator** (`scripts/check-agents-workflows.mjs`,
  `npm run check:agents`): H1/title, required sections, reference
  resolution, should-use ⊆ discover. 40 files pass (24 agents,
  16 workflows). Fixes H-05 and M-07 (5 shorthand refs, 10
  occurrences).
- **4 new agents:** ai-engineer, desktop-engineer,
  devops-engineer, release-manager. **7 new workflows:**
  secure-api-development, database-migration,
  authentication-implementation, production-deployment,
  sdk-development, ai-rag-implementation, security-review.
  Totals: **24 agents, 16 workflows** (from 20/9).
- **17 existing agents updated** (50 discover rows); **all 51
  Wave 2 skills are covered by ≥1 agent/workflow**.
- **Deliberate non-duplication:** 3 workflows improved instead of
  duplicated (production-release, article-publishing,
  new-project); no `principal-architect` agent (would duplicate
  `engineering-architect`); no frontmatter added to
  agents/workflows (validate structure instead). See
  `ai/decisions/2026-11-20-phase8-agents-workflows-scope.md`.
- **Phase 9** added machine-readable indexes:
  `registry/agents.json` and `registry/workflows.json` (see §11);
  the installer now reads agent/workflow descriptions from them.

## 11. Registry changes

Phase 9 rebuilt the registry layer:

- **Status semantics fixed (M-01):** `registry/skills.json`
  `status` now derives from `sources/verification-status.json`
  (Phase 3 audit outcomes: 204 verified, 16
  verified-with-limitations, 6 needs-correction, 51 unverified).
  A skill with no audit entry is `unverified`, never silently
  `verified`. A sidecar file (not frontmatter) was chosen because
  upstream files cannot be edited.
- **Agents/workflows registries (M-10):**
  `registry/agents.json` (24 agents: name, title, description,
  path, discover/use skill sets) and `registry/workflows.json`
  (16 workflows: name, title, description, path, referenced
  skills), generated from disk by `scripts/generate-registry.mjs`.
- **JSON Schemas** (`scripts/schemas/`, 8 files) + a
  zero-dependency subset validator
  (`scripts/lib/schema-validate.mjs`) + `scripts/validate-registry.mjs`
  (`npm run check:registry`): schema validation, semantic checks
  (unique names, totals, category/source/compatibility/version
  consistency, paths exist on disk, disk↔registry completeness,
  related references real non-self skills, use ⊆ discover,
  references resolve, generated dates agree), verification
  coverage, and a cross-check of the sidecar against the Phase 3
  audit table.
- **Related skills** derived from agent/workflow co-occurrence
  (min count 2, top 5, deterministic); 126 of 277 skills have
  related skills.
- **Determinism kept:** regeneration produces zero diff (verified
  by test and by CI's regenerate-and-diff job).
- **Externalization (L-06/L-07):** target tree, vendor sources,
  and category descriptions moved from code into
  `scripts/lib/*.json`; the report now reads 228/228 planned
  original skills (100%). Two empty category descriptions
  (ai-engineering, desktop) were filled in.
- **Query CLI** (`scripts/query-skills.mjs`, `npm run query`):
  search, categories, show, deps, related, compat, stale (exits 1
  when stale skills exist, for CI alerting), status, agents,
  workflows; `--json` on search/categories/show/stale/status.
- **Installer integration:** `loadLibrary` reads the
  agents/workflows registries (with a disk-scan fallback for
  fixture libraries).

## 12. CI/CD changes

Phase 10 rebuilt CI (`.github/workflows/`, 6 workflows;
`ai/phase10/NOTES.md`):

| Workflow | Triggers | Coverage |
| --- | --- | --- |
| validate-skills | push/PR to main | validate, frontmatter, duplicates, sources, agents, score, tests on Node 18/20/22 matrix; registry job (check:registry + regenerate/diff); evals job (mock provider) |
| lint | push/PR to main | frontmatter, offline links, trailing whitespace (upstream excluded) |
| security-audit | push/PR + weekly Mon 06:00 UTC | security scan; `npm audit` only if a lockfile exists (zero deps, no lockfile — skips with explanation) |
| codeql | push/PR + weekly Thu 06:30 UTC | CodeQL init + analyze (javascript-typescript, advanced setup via workflow) |
| scheduled-maintenance | weekly Mon 07:00 UTC + dispatch | online link check (incl. exception re-verification), stale-verification detection, upstream monitoring |
| release | `v*.*.*` tags | strict validation + every check + registry schema/diff (validation only; package is private) |

- **M-03 fixed:** duplicates, sources, agents, score, tests,
  evals, and registry checks now run in CI (several ran nowhere
  before).
- **M-04 fixed:** every third-party action pinned to a full commit
  SHA verified via `git ls-remote` (checkout v5, setup-node v5,
  codeql-action v4 dereferenced commit); least-privilege
  `permissions:` on every workflow (`contents: read` except
  CodeQL, which adds `security-events: write` + `actions: read`);
  no secrets used; no `contents: write` anywhere.
- **L-11/L-12:** weekly online link check; Node 18/20/22 matrix
  (engines claims `>= 18`).
- **Dependabot:** `github-actions` ecosystem only (weekly); no npm
  entry — zero dependencies, no lockfile.
- **Upstream monitoring:** `scripts/check-upstream.mjs`
  (`npm run check:upstream`) compares pinned upstream commits
  against vendor heads; monitoring, not gating (exit 0 on drift).
  Final run: 5 up-to-date, Vercel 4 commits behind (informational).
- **Not yet verified:** no workflow has run on GitHub — the first
  push/PR after merge is the real test. Secret scanning,
  Dependabot alerts, and branch protection are manual repo
  settings (see `ai/phase10/NOTES.md`); CodeQL default setup must
  NOT also be enabled (it conflicts with the workflow setup).

## 13. Tests executed

Phase 12 ran the full battery after the last edit (Node
v24.22.1, 2026-11-20). All commands and results are in §14–§15;
machine-readable results are in
`ai/test-results/phase12-final-results.json`.

- **Dependency installation:** `npm install` — zero dependencies,
  "up to date, audited 1 package, 0 vulnerabilities". Note: npm
  creates a `package-lock.json` even with zero dependencies; the
  file was removed again — the repo intentionally carries no
  lockfile.
- **Syntax validation:** `node --check` on all 47 `.mjs`/`.js`
  files under `scripts/`, `evals/`, `test/` — all pass.
- **Lint (the lint workflow's checks):** frontmatter, offline
  links, trailing-whitespace scan of all non-upstream Markdown —
  all pass.
- **Unit tests:** `npm test` — **129/129 pass, 0 fail, 0 skip**
  (agents-workflows 8, evals 16, hashing 4, installer 43,
  library 8, registry 15, security 22, targets 8, validate 4).
- **Installer tests:** included in `npm test` (see §7 for the
  scenario list); the permission-error scenario runs the CLI as
  `nobody` when the suite runs as root.
- **Registry tests:** included in `npm test` (schema-validator
  units, validator CLI pass + 5 negative cases on temp repo
  copies, generator determinism, query CLI smoke tests).
- **Skill validation:** `validate`, `validate:strict`,
  `check:frontmatter`, `check:links`, `check:duplicates`,
  `check:sources`, `check:agents`, `check:registry` — all pass.
- **Link checks:** offline PASS (73 internal links, 0 broken);
  online check — see §15 (first run: 1 transient error;
  re-run result recorded below).
- **Provenance:** `check:sources` PASS (277 skills, 7 sources,
  0 warnings); `check:upstream` live run: 5 up-to-date, Vercel 4
  commits behind (informational drift).
- **Security scans:** `check:security` PASS (1,032 text + 4 binary
  files, 29 patterns, no findings).
- **Behavioral evals:** `npm run evals` — 449/449 passed, 0
  failed, 0 critical, 277/277 skills covered, **0 regressions vs
  baseline**.
- **Quality scoring:** `npm run score` — 228 original skills,
  mean 87/100, 0 CRITICAL.
- **Regression:** full unit suite + eval baseline comparison —
  0 regressions.
- **Build/package checks:** `npm pack --dry-run` succeeds
  (1,065 files, 2.9 MB package / 9.1 MB unpacked). No build step
  exists (zero-dependency Node scripts); the package is private,
  so nothing is published.
- **Generated-file consistency:** `npm run registry` regenerates
  with zero diff; `npm run report` regenerates 228/228 (100%).
- **CI validation:** all 6 workflow YAML files + dependabot.yml
  parse; every `uses:` is a 40-hex SHA pin; every workflow
  declares `permissions:`; every `npm run` referenced exists.
- **Skills CLI:** `--list` discovers 277/277; `graphql` installs
  with content identical to the library (§7).
- **Node versions:** local Node is v24.22.1; engines claims
  `>= 18`. The Node 18/20/22 CI matrix legs were not exercised
  locally (see §18).

## 14. Exact test commands

All run from the repository root on 2026-11-20:

```bash
npm install
# syntax: for each .mjs/.js under scripts/ evals/ test/
node --check <file>
# trailing whitespace (as in .github/workflows/lint.yml)
find . -name '*.md' -not -path './skills/upstream/*' -print0 \
  | xargs -0 grep -n ' $'
npm run validate
npm run validate:strict
npm run check:frontmatter
npm run check:links
node scripts/check-links.mjs --online
npm run check:duplicates
npm run check:sources
npm run check:agents
npm run check:registry
npm run check:security
npm run check:upstream
npm run score
npm test
npm run registry            # then: git diff --exit-code --quiet registry/
npm run report
npm run evals
npm run query -- status
npm pack --dry-run
# YAML/pins/permissions: python3 + PyYAML over .github/workflows/*.yml
#   and .github/dependabot.yml (assert parse + 40-hex pins + permissions)
# Skills CLI (temp dir, sandboxed HOME):
npx skills add /home/hatch/workspace/SkillForge-upgrade --list -y
npx skills add /home/hatch/workspace/SkillForge-upgrade -a claude-code -s graphql -y --json
```

## 15. Pass/fail results

| Check | Result |
| --- | --- |
| `npm install` | PASS (0 deps, 0 vulnerabilities) |
| Syntax (`node --check`, 47 files) | PASS |
| Trailing whitespace | PASS (none) |
| `npm run validate` | PASS with 4 warning(s), all upstream/informational |
| `npm run validate:strict` | PASS with 4 warning(s), all upstream/informational |
| `npm run check:frontmatter` | PASS (277 skills) |
| `npm run check:links` (offline) | PASS (73 internal, 0 broken) |
| `node scripts/check-links.mjs --online` | **PASS on re-run** (609 verified, 51 skipped, 0 errors; first run had 1 transient 403 — see note) |
| `npm run check:duplicates` | PASS (277 skills) |
| `npm run check:sources` | PASS (0 warnings) |
| `npm run check:agents` | PASS (24 agents, 16 workflows) |
| `npm run check:registry` | PASS (277 skills, 24 agents, 16 workflows) |
| `npm run check:security` | PASS (no findings) |
| `npm run check:upstream` | PASS (5 up-to-date, 1 behind — informational) |
| `npm run score` | PASS (mean 87/100, 0 CRITICAL) |
| `npm test` | **129/129 PASS** |
| Registry regenerate + diff | PASS (zero diff) |
| `npm run report` | PASS (228/228, 100%) |
| `npm run evals` | **449/449 PASS, 0 regressions** |
| `npm pack --dry-run` | PASS |
| Workflow YAML/pins/permissions | PASS |
| Skills CLI `--list` / install | PASS (277/277, content identical) |

**Online link check — two runs.** First run (2026-11-20, ~7 min):
609 unique external URLs verified, 51 skipped (documented
exceptions), **1 error: `https://cursor.com/docs/skills` —
HTTP 403**. The URL is real: `curl` returns HTTP 200 with both
browser and default user agents, and a direct Node fetch minutes
later returned HEAD 200. The 403 was transient — most likely
rate-limiting during the 609-URL burst (the checker's other
`cursor.com` URL passed in the same run). It was NOT added to the
exceptions list (that list is for hosts that consistently block
automated checks, and this one does not). A full re-run was
started to confirm a clean result; its outcome is recorded here:

**Re-run (2026-11-20, ~6 min): PASS.** 73 internal links, 609
unique external URLs verified, 51 skipped (documented
exceptions), **0 errors**. The `cursor.com/docs/skills` 403 did
not recur, confirming it was transient.

## 16. Failed tests

**No test failed in the final battery.** Two failures occurred
*during* Phase 12 verification work and were fixed before the
final run; both are recorded here rather than hidden:

1. **`npm run validate:strict` failed (exit 1).** `--strict`
   failed on all warnings, and all 5 warnings were upstream-only
   (unfixable by policy) — so strict mode could never pass, and
   the Phase 10 `release.yml` workflow (which runs it) could
   never pass either. Fixed: `--strict` now fails only on
   non-upstream warnings (consistent with the validator's
   two-profile design); the summary line was also fixed to print
   FAIL (not PASS) when strict mode fails. Covered by
   `test/validate.test.mjs`. The Phase 10 results file had
   wrongly recorded strict as passing (the exit code was measured
   on a `tail` pipeline); it now carries a correction note.
   Decision: `ai/decisions/2026-11-20-validate-strict-upstream-warnings.md`.
2. **Skills CLI discovered only 276/277 skills.** `graphql` was
   skipped with a YAML parse error: its frontmatter
   `compatibility` line contained an unquoted `: `, which strict
   YAML rejects as a nested mapping. Fixed: the value is quoted,
   and the frontmatter parser now rejects unquoted `: ` in plain
   scalars (a scan confirmed it was the only occurrence in 277
   skills). Covered by unit tests in `test/validate.test.mjs`;
   documented in `docs/SKILL-STANDARDS.md`. Decision:
   `ai/decisions/2026-11-20-frontmatter-strict-yaml-colons.md`.

Also fixed during Phase 12 (audit findings, not test failures):
L-01 (validator/scorer line count off by one — the ai-seo
"501 lines" warning was false; it is exactly 500) and L-04
(research snapshot `prisma/skills | PARSE ERROR` line filled from
the live GitHub API, header documents the snapshot).

## 17. Warnings

Warnings that remain after the final battery — all understood,
none hidden:

- **Validator: 4 warnings, all upstream-only (informational).**
  Placeholder markers in agentic-seo/seo and
  anthropic/doc-coauthoring; a broken relative link
  (`/features/analytics`) in marketingskills/site-architecture;
  a `TBD` marker in superpowers/writing-plans. Upstream content
  cannot be edited here; fixes belong upstream. `--strict` does
  not fail on them (see §16).
- **Quality scorer: 115 skills with non-critical flags** (0
  CRITICAL). Lowest dimension is testing (mean 37/100) — most
  skills lack a test-strategy subsection. Lowest overall scores
  are content skills (71–74/100). These are quality signals, not
  failures.
- **Upstream drift (informational):** Vercel's
  `vercel-labs/agent-skills` is 4 commits behind its `main` head
  (pinned `1a2c79d4`, head `5a37a632`, 2026-11-20). Re-import per
  `docs/UPDATE-PROCESS.md` when a new upstream commit is worth
  taking.
- **Online link check: 51 documented skips** (example domains +
  exception-list hosts that block automated checks but were
  verified real independently). The exceptions are re-verified
  weekly by CI (L-11).

## 18. Known limitations

- **51 Phase 4 skills are `unverified`** (no formal
  technical-accuracy audit yet); **6 upstream skills are
  `needs-correction`** (fixes belong upstream); **16 skills carry
  recorded limitations** (§6).
- **No CI workflow has run on GitHub yet.** YAML, pins,
  permissions, and script references were verified locally; the
  first push/PR after merge is the real test.
- **Node 18/22 matrix legs unexercised locally** (local Node
  v24.22.1); the CI matrix exists to exercise them.
- **Semgrep, Gitleaks, TruffleHog, CodeQL not installed locally;**
  none ran here. CodeQL runs only via the GitHub workflow.
- **Secret scanning, Dependabot alerts, and branch protection**
  are manual repo settings still to be enabled.
- **Windows `--link` EPERM path untested** (no Windows runner).
  The permission-error test skips on Windows.
- **Model-based eval provider untested without credentials.**
  All eval results are from the deterministic mock agent, which
  evaluates the library, not a real LLM.
- **Prisma 8 still RC** (3 skills pin RC versions); **X/Twitter
  docs unavailable** (3 skills); **NestJS pins TS 6.x** (nest
  build lacks TS 7 support — re-check only if that changes).
- **Agentic-seo import source is MONITOR** (S-14): the import
  points at a dormant copy while the author's active repo is a
  separate, non-fork repo. Re-verify before the next re-import.
- **3 unresolved upstream security findings** (S-08 High, S-09/S-11
  Medium) + 1 open (S-14 Medium) — see §9.
- **L-02/L-03 open by decision:** two upstream Prisma pointer
  stubs (informational); progressive disclosure unused by
  original skills (deliberately not churned).
- **Frontmatter parser** still diverges from YAML on inline `#`
  comments (kept as part of the value here, stripped by YAML);
  documented in `docs/SKILL-STANDARDS.md`. No skill relies on it.
- **Link checker has no retry/delay:** the 609-URL burst can
  trigger transient 403s from rate-limited hosts (§15).

## 19. Remaining tasks

- **Merge this branch** (user decision — nothing here was pushed
  or merged). After merge: watch the first CI runs; enable secret
  scanning, Dependabot alerts, and branch protection (see
  `ai/phase10/NOTES.md`); do NOT enable CodeQL default setup.
- **Audit the 51 Phase 4 skills** (formal technical-accuracy
  audit, as Phase 3 did for the v1 skills) and update
  `sources/verification-status.json` + registry.
- **Upstream follow-up:** raise S-08/S-09 and the 6
  needs-correction items with their upstream repos; re-verify the
  agentic-seo source (S-14) and consider the Vercel re-import
  (4 commits behind).
- **Re-verify Prisma 8 skills when Prisma 8 reaches GA** (RC pins
  will be stale).
- **Exercise the Node 18/22 CI legs** (automatic on first PR) and
  the Windows `--link` path (needs a Windows runner).
- **Test the model-based eval provider** when credentials are
  available.
- **Re-run the online link check** on its weekly schedule (CI)
  and act on any newly dead exception.

## 20. Recommended next steps

1. **Review and merge** `feat/skillforge-production-upgrade`
   (429 files changed, +70,236/−1,165 lines vs `main`). Suggested: open the
   PR from the branch, let CI run (first real workflow runs),
   then merge.
2. **Enable the manual repo settings** immediately after merge:
   secret scanning, Dependabot alerts, branch protection on
   `main` requiring the validate/registry/evals/lint/
   security-audit checks.
3. **Tag a release** (e.g. v1.1.0 or v2.0.0 — a version decision
   for the user; the changelog entry is deliberately
   "Unreleased"). The `release.yml` workflow validates `v*.*.*`
   tags automatically.
4. **Schedule the Phase 4 audit** (51 skills) as the next
   content milestone; it is the largest remaining verification
   gap.
5. **Consider the link-checker hardening** (retry with backoff on
   403/429, small inter-request delay) to avoid transient
   failures like the one in §15.
6. **Keep the weekly scheduled maintenance green**: online links,
   stale verification (`query stale --days 180` fails when
   re-verification is due), upstream monitoring.

---

*End of report. All 12 phases Verified. Branch:
`feat/skillforge-production-upgrade`. Status tracker:
`ai/PROJECT-STATUS.md`. Machine-readable results:
`ai/test-results/phase12-final-results.json`.*
---

## Addendum — Final production readiness audit & remediation (Stage E, 2026-11-20)

This addendum is appended to the report; the body above is a
historical snapshot at its commit (`2f1460b`) and was NOT silently
rewritten. After the 12-phase upgrade, a 5-stage final production
readiness audit & remediation (Stages A–E) ran on the same branch,
local only — nothing pushed, merged, or PR'd. Full account:
`ai/reports/FINAL-REMEDIATION-REPORT.md`. Head at remediation
completion: ``4f909da`` (74 commits ahead of
`main`, 478 files changed, +90,377/−1,234).

### Reconciled figures at the remediation HEAD

| Metric | As reported (§2/§9/§13) | Reconciled |
| --- | --- | --- |
| Files changed vs `main` | 429 (+70,236/−1,165 at `d58d6b4`; +70,240 at `2f1460b`) | 478 files changed, +90,377/−1,234 |
| Tracked files | 1,069 | 1,115 |
| Unit tests | 129/129 pass | 128 real at report time (`test/helpers.mjs` was miscounted as a test — A-18); 249 real at the remediation HEAD, printed == counted after the helpers move to `test-support/` |
| Eval cases | 449/449 | 463/463 (+14 non-circular discovery cases, A-33) |
| Verification split | 204 / 16 / 6 / 51 | 254 / 17 / 6 / 0 — all 51 Phase 4 skills formally audited (Stage C); 0 unverified |
| Security scan files | 1,032 text + 4 binary | 1,078 text + 4 binary at the remediation HEAD (see A-28 below) |
| External URLs (online) | 609 verified | 604 enumerated; 559 checked live, 45 skipped (see A-24 below) |
| Installer tests | 43 | 97 |
| Upstream drift | Vercel 4 behind | 6 up-to-date, 0 behind (Vercel re-imported, A-27; confirmed in Stage E) |

### Corrections to specific report statements

- **A-21 (§5, Phase 3 line count).** The +1,715/−507 figure is the
  whole Phase 3 commit, including +22/−22 of registry JSON
  regenerated in the same commit. Skill files alone:
  **+1,693/−485**.
- **A-28 (§9/§13, scan file count 1,032).** 1,032 was accurate for
  the working tree at scan time, but no committed tree scans
  1,032 (1,029 at `6b0a79e`, 1,034 at `01a7173`): the scan ran
  while the tree was still changing. The count grows with the
  tree; it is a point-in-time figure, not a regression signal.
- **A-24 (§15, "609 verified").** Only 558 URLs were HTTP-checked
  in the Phase 12 online run; 43 documented-exception + 8
  example-domain URLs were enumerated but never fetched, and
  the script's summary line counted all of them as "verified".
  The script now reports checked-live and skipped separately
  (Stage E online re-run: 604 enumerated, 559 checked live,
  45 skipped, 0 errors on the confirming run; the first run
  had one transient Discord-docs timeout, verified real by an
  independent fetch).
- **A-31 remainder (§7, "Atomic installs with rollback").** The
  swap is two renames, each atomic, the pair not; a kill
  mid-swap is still not testable at CLI level, and the
  post-swap verification branches are covered at unit level
  only. The installer now verifies content before the swap
  (Stage B, A-06) and the rollback path is guarded (A-05).
  Installer tests: 43 → 97.
- **A-32 (§5, "No upstream skill was edited").** True for skill
  *content*. Two project-maintained vendor ATTRIBUTION.md
  files were extended additively in `caf1f32` (marketingskills
  tools import). The policy is clarified in
  `sources/imported-skills.md` rule 2: the verbatim policy
  covers upstream skill content; ATTRIBUTION.md files are
  project-maintained.
- **§20 item 2 (required checks).** The names listed
  (`validate`/`registry`/`evals`) are workflow job ids, not
  the check names GitHub shows. The correct required-check
  names are recorded in `ai/phase10/NOTES.md`: `Validate (Node
  18/20/22)`, `Registry`, `Behavioral evals`, `lint`,
  `security-audit`, plus `Analyze (javascript-typescript)`
  recommended. Do NOT require `Windows (Node 20)` until the
  advisory Windows leg is promoted after a green real PR run.
- **§2/§9 (test count 129/129).** The true count at report time
  was 128 (see the table above). The discrepancy is the
  helpers-file miscount (A-18), not a missing test.

### What changed since the report

- All 51 Phase 4 skills audited (Stage C): 19 PASS, 32 FIXED,
  60 findings (0 Critical, 3 High, 11 Medium, 38 Low, 8
  Informational), 54 fixed, 0 unresolved. The largest
  remaining gap named in §20 item 4 is closed.
- Installer hardened (Stage B): manifest path-traversal closed
  (A-02/A-03), lockfile concurrency control, guarded rollback,
  pre-swap verification, dry-run truly read-only, fail-closed
  manifest repair (Stage C: 145 corrected skills
  regression-reviewed, 5 findings fixed; Stage D: Windows
  `--link` junction fallback, POSIX path normalization).
- Security: S-01–S-06 and S-15 fixed and re-verified; S-07,
  S-10, S-12, S-13 accepted with documented rationale; S-08,
  S-09, S-11 mitigated in-repo (safe-install guide + warnings)
  but still open upstream; S-14 MONITOR stands. External
  scanners ran clean (Gitleaks 8.30.1, TruffleHog 3.100.0,
  Semgrep 1.186.0). Full status: `ai/audits/SECURITY-STATUS.md`.
- CI validated locally (123 checks, 0 fail; action SHAs
  re-verified; concurrency controls added; advisory Windows
  leg). Node 18.20.8 + 22.23.5 exercised locally.
- The link-checker hardening suggested in §20 item 5 was
  implemented (Stage D, A-23): code stripping, retry/backoff,
  inter-request delay.

### What is still open (see FINAL-REMEDIATION-REPORT.md §11)

No workflow has run on GitHub (L-CI); no real Windows execution
has happened (L-Win — junction removal safety unproven);
S-08/S-09/S-11 still open upstream; CodeQL never run anywhere;
no real-model eval run executed (L-Model); branch protection and
secret scanning are manual post-merge settings (L-Settings).

### Production verdict (Stage E)

**READY FOR PULL REQUEST REVIEW** — not higher, because the
open items above can only be closed by the first PR run, a real
Windows run, and upstream fixes. Evidence and acceptance
criteria: `ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md`.

### Post-PR update (2026-11-21, Phase C finding A1-07)

- **L-CI partially closed:** 4 of 6 workflows ran on PR #1 and
  pass (Validate, Lint, Security audit, CodeQL; run 44933250315).
  `scheduled-maintenance` and `release` have never run anywhere.
  (The remediation report's §8 item 10 overstated this as "all 6
  workflows"; see its §8 item 11 correction.)
- **L-Win closed:** the junction fallback is proven on a real
  Windows runner (PR #1, 250/255, 0 fail, 5 POSIX-only skipped);
  the Windows leg was promoted from advisory to gating.
- **CodeQL ran** on PR #1 (run 44933250387); 5 open alerts, all
  in upstream code, triaged in `ai/audits/SECURITY-STATUS.md`
  (A4-03). None has been dismissed.
- **L-Settings partially closed:** secret scanning (with push
  protection) and Dependabot security updates are enabled;
  branch protection is still not enabled (user decision).
- **Still open:** no real-model eval run (L-Model);
  S-08/S-09/S-11 still open upstream.
- **§20 item 2 check names (corrected):** `Validate (Node
  18/20/22)` is stale — the check is now `Validate (Node 24)`;
  the Windows check is `Windows (Node 24)`, not `Windows (Node
  20)`, and the leg is now gating. Current names are in
  `ai/phase10/NOTES.md`.
- **Verification split** is now 255 / 16 / 6 / 0
  (`link-building` promoted to `verified`, A3-01); evals are
  463 cases (186 hand-written + 277 generated); live unit-test
  count is 250 (`npm test` 2026-11-21: 250 pass, 0 fail).

This note corrects the addendum's "What is still open" section
above; it does not change the Stage E verdict. The
production-readiness verdict for the current HEAD comes in
`ai/audits/RELEASE-ACCEPTANCE.md` (Phase G).
