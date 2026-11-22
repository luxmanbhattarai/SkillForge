# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-11-21

Production upgrade of the v1.0.0 library, merged to `main` via PR #5
on 2026-11-21 (the revert of PR #1 was itself reverted first — see
`ai/audits/GITHUB-SECURITY-RECOMMENDATIONS.md` for the reconciliation
record). All 12 phases and the 5-stage remediation audit are complete
(2026-11-20), followed by a production-readiness audit (60 findings,
50 closed) and an 11-phase staging validation (2026-11-21). Work
covered (Waves 1–4, Phases 1–12, all 2026-11-20, plus the 2026-11-21
audit rounds, PR #1/#4/#5 CI runs, and staging fixes):

### Added

- 51 new original skills (277 total: 228 original + 49 upstream) across
  18 categories, including NestJS, SvelteKit, Tauri 2, Redis, Clerk,
  AWS, Kubernetes, RAG, and MCP Security; two new categories
  (`ai-engineering`, `desktop`). Two existing skills extended.
- 4 new agents (ai-engineer, desktop-engineer, devops-engineer,
  release-manager) and 7 new workflows (secure-api-development,
  database-migration, authentication-implementation,
  production-deployment, sdk-development, ai-rag-implementation,
  security-review): 24 agents, 16 workflows. All 51 new skills are
  covered by at least one agent or workflow.
- Query CLI (`npm run query`): search, categories, show, deps,
  related, compat, stale, status, agents, workflows.
- Registry additions: `registry/agents.json` and
  `registry/workflows.json`; 8 JSON Schemas in `scripts/schemas/` and
  `npm run check:registry` (schema + semantic + verification-coverage
  + audit cross-check). Skill `status` now derives from
  `sources/verification-status.json` (Phase 3 audit outcomes); skills
  with no audit entry are `unverified`, never silently `verified`.
  `related` skills are derived from agent/workflow co-occurrence.
- Behavioral evaluation system (`npm run evals`): deterministic mock
  agent (no LLM APIs), 12 categories, 4 scorers, baseline + regression
  comparison. 463 cases (186 hand-written + 277 generated discovery
  cases, one per skill), 463/463 passing, 277/277 skills covered.
  Model-based evaluation via an OpenAI-compatible provider interface
  (optional; untested without credentials).
- Quality scoring (`npm run score`): 22-element standard in
  `docs/SKILL-STANDARDS.md`, eight scored dimensions with hard caps
  (security hit → 40/CRITICAL, missing section → 50, placeholder →
  60). All-skills mean 87/100, 0 CRITICAL.
- Agents/workflows validator (`npm run check:agents`): required
  sections, reference resolution, should-use ⊆ discover.
- Upstream drift monitoring (`npm run check:upstream`): compares each
  vendor's live default-branch head against the pinned commit.
- CI/CD overhaul (6 workflows): validation on Node 24 only
  (`engines: >=24`; the earlier Node 18/20/22 matrix was dropped
  when the engines field moved to Node 24), covering every local
  check, registry regeneration diff, evals job, lint, security
  audit, CodeQL (advanced setup via workflow), weekly scheduled
  maintenance (online links, stale verification, upstream
  monitoring), and release validation on `v*.*.*` tags. All actions
  pinned to SHAs; least-privilege permissions; Dependabot for
  github-actions only.
- Security documentation: `docs/SECURITY-SCANNING.md`,
  `docs/THREAT-MODEL.md`, and the audit in
  `ai/audits/SECURITY-AUDIT.md` (S-01–S-15).
- Canonical project status (`ai/PROJECT-STATUS.json`) with a drift
  guard (`npm run check:status`) wired into CI, so documentation
  counts cannot silently drift from verified results.
- Semgrep SAST job in the security-audit workflow (pinned 1.186.0,
  `p/javascript` over `scripts/`, `test/`, `evals/`); the custom
  scanner stays honestly labeled a pattern-based smoke screen.
- Real-model evaluation subset v2 (89 cases, all 12 categories) and
  a provider layer (timeouts, retries, `Retry-After`, cost tracking);
  no real-model run has executed yet (needs credentials).
- Documentation overhaul: README, AGENTS.md, CONTRIBUTING.md, and
  CHANGELOG rewritten for the upgraded library (277 skills, honest
  verification-status wording); new `docs/UPGRADE.md`,
  `docs/TROUBLESHOOTING.md`, `docs/EVALUATION.md`, and
  `docs/README.md` (canonical-home index); `docs/ARCHITECTURE.md`
  rewritten (categories, registry, validation layer, installer,
  CI); frontmatter parser subset documented in
  `docs/SKILL-STANDARDS.md`.

### Changed

- Installer rebuilt as a safe CLI (`node scripts/install-skills.mjs`):
  install/update/list/doctor/validate/uninstall/restore, conflict
  detection by hash, backups before replacement, atomic installs with
  rollback, dry-run, manifest tracking. Agents and workflows install
  where targets document a location (Codex agents as TOML; Antigravity
  workflows deprecated by Google, warning on install).
- Codex and Antigravity install paths corrected per current vendor
  docs: both now use `.agents/skills` for project scope; Antigravity
  user scope is `~/.gemini/config/skills`. The installer detects
  installs left in the legacy locations.
- Registry and report generation are deterministic: `generated`
  derives from the newest `last_verified` across skills, not the
  wall-clock date.
- Security scanner expanded from 7 to 29 patterns, plus multi-line
  curl-pipe detection and a binary byte-scan; patterns live in a
  shared library (`scripts/lib/security-patterns.mjs`) used by the
  scanner, the scorer, and the eval mock agent.
- 145 original skills corrected after a technical-accuracy audit of
  all 226 v1.0.0 skills against official docs (204 verified, 16
  verified with limitations, 6 needs-correction — all upstream, fixes
  belong upstream). Corrections include the Next.js fetch caching fix
  and wrong defaults in rate limiting, Helmet, Prisma 7/8, MySQL,
  Turborepo, and retired Google/X features.
- Category descriptions, the report target tree, and registry source
  data externalized from code into `scripts/lib/*.json`.
- Vercel upstream re-imported (`vercel-labs/agent-skills`
  `1a2c79d4` → `5a37a632`): `web-design-guidelines` 1.0.0 → 1.1.0;
  the skill now reads bundled guidelines instead of fetching them
  from `main` at review time.
- GitHub Actions updated to latest (checkout v7.0.1, setup-node
  v7.1.0) via Dependabot PRs #2/#3; all actions remain SHA-pinned.

### Fixed

- Audit findings from `ai/audits/INITIAL-AUDIT.md`: H-01 (installer
  silently deleted user-modified skills), H-02 (non-deterministic
  registry generation), H-04 (outdated Next.js caching guidance),
  H-05 (agents/workflows unvalidated), M-01 (registry status
  semantics), M-02 (security scanner coverage), M-03/M-04 (CI
  coverage and unpinned actions), M-05/M-06/M-09 (installer safety),
  M-07 (shorthand skill references), M-10 (no agents/workflows
  registries), L-06/L-07 (hardcoded target tree and sources),
  L-10 (agentic-seo source: MONITOR, re-verify before next re-import),
  L-11 (weekly online link check), L-12 (Node matrix).
  L-05 (frontmatter parser subset documented), L-08 (empty
  `.claude/settings.json` removed — it was a no-op), L-09
  (stale category/skill counts corrected).
- 3 library defects found while writing eval cases (changesets
  actions v4 → v7; stale Node 24/TS 5.x prerequisites in
  prisma/drizzle → Node 26 LTS/TS 7.x; nestjs frontmatter TS 5.x →
  6.x — `nest build` lacks TS 7 support) and 2 eval framework defects
  (extractCode phantom/swallowed blocks; tsStructure false
  UNBALANCED on URLs in strings).
- Production-readiness audit and staging validation fixes
  (2026-11-21): E-01 stdout truncation on piped output, 3
  release-workflow defects (tag↔version gate, CHANGELOG gate, evals
  in the release gate), S-08 warning-coverage holes (warnings now
  fire on dry-run and already-installed paths), drift-check UNKNOWN
  exit, and a 1000× pricing-doc bug.

### Known limitations

- All PR workflows have run green on GitHub (Validate, Lint,
  Security audit, CodeQL, Semgrep — PR #5, 9/9 checks green;
  326 unit tests, 325 pass, 0 fail, 1 skipped on Linux).
  `scheduled-maintenance` has never run (its file reached `main`
  with this release; first run is scheduled or manually
  dispatched). Release validation runs on the `v1.1.0` tag.
  Secret scanning (with push protection) and Dependabot security
  updates are enabled; branch protection is still not enabled
  (user decision — it would block direct pushes to `main`).
  CodeQL uses the workflow (advanced setup) — default setup must
  NOT also be enabled.
- All 51 Phase 4 skills were formally audited in Stage C
  (2026-11-20); 0 skills are `unverified`. Verification split:
  255 verified / 16 verified-with-limitations / 6
  needs-correction (all upstream, fixes belong upstream).
- Prisma 8 still RC (3 skills); X/Twitter docs unavailable (3 skills).
- Windows `--link` junction fallback proven on a real Windows
  runner (PR #1, 2026-11-21; 250/255 tests pass, 0 fail) and the
  junction-removal safety test passes on the real runner (draft
  PR #4, 330 tests, 325 pass, 0 fail, 5 POSIX-only skipped);
  junction *creation* via the fallback on an unprivileged machine
  is still unproven (see `ai/audits/CI-VALIDATION-REPORT.md`).
- Model-based eval provider untested without credentials.
- NestJS pins TS 6.x (`nest build` lacks TS 7 support).
- Upstream drift (live 2026-11-21): all 6 vendors up-to-date
  against their pins; agentic-seo live upstream is 50 commits
  ahead of the pin (S-14 — re-point decision pending).
  Vercel was re-imported verbatim to `5a37a632` in Stage D.
  Re-import per `docs/UPDATE-PROCESS.md` when a new upstream
  commit is worth taking.

## [1.0.0] - 2026-11-20

Initial release of SkillForge, a universal AI Agent Skills library.

> Note: the v1.0.0 tag and GitHub Release were removed on
> 2026-11-21 at the owner's request; v1.1.0 supersedes this
> release. The v1.0.0 commit remains in history (see the link
> below).

### Added

- Repository foundation: README, AGENTS.md discovery rules, skill
  standards, templates, and the Agent Skills specification layout.
- 49 imported upstream skills from 6 vendors (Anthropic, Vercel,
  Superpowers, Prisma, Marketing Skills, Agentic SEO), with attribution
  and licenses preserved under `skills/upstream/`.
- Original skills across 15 categories: core, frontend, backend,
  database, auth, architecture, infrastructure, testing, security, SEO,
  performance, content, media, metadata, and documentation.
- 20 specialized agent definitions under `agents/`.
- 9 end-to-end workflows under `workflows/` (new project, architecture
  review, feature development, code audit, SEO audit, article
  publishing, image generation, performance audit, production release).
- Machine-readable registry (`registry/`) generated from the skills on
  disk.
- Validation and tooling scripts: frontmatter, section, link, duplicate,
  provenance, and security checks; registry generation; skill installer
  for Claude Code, Cursor, Codex, and Antigravity.
- Continuous integration: skill validation, Markdown lint, and weekly
  security audit.
- Documentation: architecture, installation, agent compatibility,
  official sources, and update process.

[Unreleased]: https://github.com/luxmanbhattarai/SkillForge/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/luxmanbhattarai/SkillForge/releases/tag/v1.1.0
[1.0.0]: https://github.com/luxmanbhattarai/SkillForge/commit/bc304a2b62d383855ff7445de3b4252b5a13a89a
