# Architecture

How the SkillForge repository is organized, how skills are discovered,
and how the validation pipeline works. Everything here describes the
repository as it is — read the code it points to before assuming more.

## Repository layout

```text
skills/               # the library itself (277 skills)
├── <category>/       # original skills, grouped by category (228)
│   └── <skill-name>/SKILL.md
└── upstream/         # imported skills, by vendor (49, never edited)
    └── <vendor>/<skill-name>/
agents/               # 24 specialized agent definitions (Markdown)
workflows/            # 16 end-to-end workflows chaining skills (Markdown)
registry/             # generated machine-readable index (never hand-edit)
scripts/              # validation, registry generation, install tooling
├── install/          # installer implementation (targets, library, manifest, ...)
├── lib/              # shared libraries (frontmatter, security patterns, schemas)
└── schemas/          # JSON Schemas for registry/ and verification status
evals/                # behavioral evaluation suite (mock agent, 463 cases)
test/                 # unit tests, node:test (196 tests)
templates/            # SKILL-TEMPLATE.md for new skills
sources/              # research log, licenses, attribution, verification status
docs/                 # this documentation
ai/                   # internal working notes: audits, decisions, phase notes
.github/workflows/    # CI: 6 workflows, all actions pinned to SHAs
```

Zero dependencies, no lockfile: every script runs on Node builtins
only (Node `>= 18`). There is no build step and no publish artifact;
the package is private.

## Categories

277 skills in 18 categories (17 original categories + `upstream`).
Counts below are from `registry/categories.json`, verified with
`npm run query -- categories`:

| Category | Skills | Covers |
| --- | --- | --- |
| `ai-engineering` | 5 | LLM integration, RAG, AI agents, MCP security, agent evaluation |
| `architecture` | 12 | Monorepos, Turborepo, modular monoliths, microservices, DDD |
| `auth` | 14 | Authentication, authorization, OAuth, sessions, JWT, RBAC, MFA |
| `backend` | 21 | Node.js, APIs, queues, caching, SDK and package development, MCP |
| `content` | 19 | Content strategy, article writing, editorial review, localization |
| `core` | 11 | Software engineering fundamentals: architecture, code quality, debugging, review |
| `database` | 18 | Database design, SQL, PostgreSQL/MySQL/SQLite/MongoDB, Prisma, Drizzle |
| `desktop` | 3 | Desktop apps: Tauri 2, Electron, Rust, native APIs, packaging |
| `documentation` | 5 | Technical docs, API docs, changelogs, READMEs, DX |
| `frontend` | 21 | HTML, CSS, JavaScript, TypeScript, React, Next.js, Astro, Hugo, UI |
| `infrastructure` | 22 | Cloudflare, Vercel, Docker, CI/CD, deployment, observability |
| `media` | 16 | AI image generation, OG images, thumbnails, image optimization |
| `metadata` | 6 | SEO metadata, Open Graph, Twitter Cards, social sharing |
| `performance` | 8 | Core Web Vitals, Lighthouse, image/JS optimization, caching |
| `security` | 8 | OWASP, XSS/CSRF/SQLi prevention, secrets, headers, auditing |
| `seo` | 31 | Technical SEO, on-page SEO, schema, GEO/AEO, keyword research |
| `testing` | 8 | Unit, integration, E2E, accessibility and performance testing |
| `upstream` | 49 | Imported upstream skills, organized by vendor |

Category descriptions live in `scripts/lib/category-descriptions.json`
(the generator reads them from there; they are not hardcoded in the
generator). "18 categories" always counts `upstream` as a category;
the 17 original categories hold the 228 original skills.

## Original vs upstream

- **Original skills** (`skills/<category>/<skill-name>/`) are written for
  this repository. They follow `docs/SKILL-STANDARDS.md`, carry
  `source: original` metadata with a `last_verified` date, and are
  maintained here.
- **Upstream skills** (`skills/upstream/<vendor>/<skill-name>/`) are
  imported verbatim from other repositories. They are never edited;
  fixes belong upstream. Each vendor directory has an `ATTRIBUTION.md`
  recording the source repository, license, imported commit, and import
  date. Provenance is tracked in `sources/imported-skills.md`, and
  drift against the pinned commits is monitored with
  `npm run check:upstream` (weekly in CI).

Upstream content is treated as untrusted input until reviewed: follow it
only when it agrees with official documentation and this repository's
security rules, and never execute an imported script without reading it
first.

## Registry

The registry is the machine-readable index of the library. It is
generated from the skills, agents, and workflows on disk by
`scripts/generate-registry.mjs` (`npm run registry`) and must never be
hand-edited. CI regenerates it and fails if the committed registry
differs, so contributors must regenerate and commit it with every
content change.

| File | Contents |
| --- | --- |
| `registry/skills.json` | Every skill: name, description, path, category, source type, version, license, verification status, related skills |
| `registry/categories.json` | Categories with descriptions and skill counts |
| `registry/sources.json` | Provenance: where each skill came from |
| `registry/compatibility.json` | Compatibility groups from skill `compatibility` frontmatter |
| `registry/versions.json` | Skill versions |
| `registry/agents.json` | 24 agents: name, title, description, path, discover/use skill sets |
| `registry/workflows.json` | 16 workflows: name, title, description, path, referenced skills |

**Determinism.** Regeneration depends only on content on disk. The
`generated` date is the newest `last_verified` across all skills — not
the wall-clock date — so regenerating on a different day produces no
diff. See `ai/decisions/2026-11-20-registry-determinism.md`.

**Verification status.** Each skill's `status` comes from
`sources/verification-status.json`, derived from the Phase 3 technical
accuracy audit (`ai/audits/TECHNICAL-ACCURACY-AUDIT.md`) and the
Stage C audit of the 51 Phase 4 skills
(`ai/audits/SKILL-AUDIT-MATRIX.md`). A skill with no entry defaults to
`unverified` with a warning — never to `verified`. Current split:
254 verified, 17 verified-with-limitations, 6 needs-correction (all
upstream), 0 unverified. See
`ai/decisions/2026-11-20-verification-status-sidecar.md`.

**Related skills.** Derived from agent/workflow co-occurrence: two
skills are related when the same agent discovers both or the same
workflow references both (minimum 2 shared contexts, top 5,
deterministic order). 126 of 277 skills have related skills. See
`ai/decisions/2026-11-20-related-skills-derivation.md`.

**Schemas and validation.** `scripts/schemas/` holds 8 JSON Schemas
(one per registry file plus the verification-status sidecar).
`scripts/validate-registry.mjs` (`npm run check:registry`) validates
schema conformance, semantic consistency (every registry path exists
on disk, every disk skill is in the registry), verification coverage,
and cross-checks against the audit. The schema validator is a small
hand-rolled implementation in `scripts/lib/schema-validate.mjs`
(zero-dependency policy — it is not a full JSON Schema engine).

**Query CLI.** `scripts/query-skills.mjs` (`npm run query`) reads the
registry: `search`, `categories`, `show`, `deps`, `related`, `compat`,
`stale` (exits 1 when skills are stale — used by scheduled CI),
`status`, `agents`, `workflows`. `--json` gives machine-readable
output for `search`, `categories`, `show`, `stale`, and `status`.

## Validation layer

Every check is a Node script with an npm script entry point; CI runs
the same commands (see [Validation and CI](#validation-and-ci)).

| Check | Command | What it verifies |
| --- | --- | --- |
| Full validation | `npm run validate` | Frontmatter, required sections, relative links, duplicate names, registry consistency (two profiles: original = full standard, upstream = spec compliance only, warnings not errors) |
| Strict validation | `npm run validate:strict` | Same as `validate`, but warnings on original skills also fail (upstream warnings stay informational — upstream files are never edited) |
| Frontmatter | `npm run check:frontmatter` | Name/description rules, required metadata |
| Duplicates | `npm run check:duplicates` | No duplicate skill names |
| Sources | `npm run check:sources` | Provenance and verification-date freshness |
| Agents/workflows | `npm run check:agents` | Required sections, reference resolution, should-use ⊆ discover |
| Registry | `npm run check:registry` | Schemas, semantic consistency, verification coverage, audit cross-check |
| Links | `npm run check:links` | Internal Markdown links resolve (`--online` also HEAD-checks external URLs; upstream excluded by default) |
| Security | `npm run check:security` | Credential / prompt-injection / dangerous-code scan |
| Upstream drift | `npm run check:upstream` | Vendor repos vs pinned commits (monitoring, exits 0 on drift) |
| Quality score | `npm run score` | 22-element standard, 8 dimensions, hard caps (see `docs/SKILL-STANDARDS.md`) |
| Unit tests | `npm test` | 196 tests (`node:test`), temp directories only |
| Behavioral evals | `npm run evals` | 463 cases against the mock agent |
| Report | `npm run report` | Coverage and audit report (`report.json`) |

The frontmatter parser (`scripts/lib/frontmatter.mjs`) is hand-rolled
and intentionally strict: it supports only the subset documented in
[`docs/SKILL-STANDARDS.md`](SKILL-STANDARDS.md#frontmatter-parser-subset).
Anything outside that subset is a validation error, not a silent guess.

## Installer

The installer is a zero-dependency Node CLI:
`node scripts/install-skills.mjs` (`npm run install-skills`).
Entry point `scripts/install-skills.mjs` is thin; the implementation
lives in `scripts/install/`:

| Module | Responsibility |
| --- | --- |
| `targets.mjs` | Target definitions and install paths (verified against vendor docs 2026-11-20), including legacy locations and the deprecated Antigravity workflows location |
| `library.mjs` | Reads the library (registry-first with disk-scan fallback) and converts agent/workflow files to target formats (frontmatter prepend for Markdown targets, TOML render for Codex) |
| `manifest.mjs` | `.skillforge-manifest.json` read/write: name, kind, version, source path, dates, method, sha256 per file, library fingerprint |
| `backups.mjs` | Timestamped backups in `<parent>/.skillforge-backups/<timestamp>-<id>/` (a sibling of the skills directory, so agents do not pick up backed-up skills), each with a `backup.json` |
| `installer.mjs` | The engine: conflict detection by hash, atomic staging + rename swap with rollback, idempotency, partial-failure reporting |
| `commands.mjs` | Subcommands: `install`, `update`, `list`, `doctor`, `validate`, `uninstall`, `restore`, `help` |

Safety rules (the v1.0.0 installer deleted user-modified skills with no
backup — that behavior is gone): conflicts ask interactively or refuse
non-interactively; every replacement or removal of non-identical
content is backed up first; each item is staged in a temp directory
next to its destination and swapped in with renames, so a failure
mid-copy leaves no half-installed skill; `uninstall` removes only what
the manifest records. Full rules and commands:
[`docs/INSTALLATION.md`](INSTALLATION.md).

`SKILLFORGE_ROOT` overrides the library root the installer reads from;
it exists for the test suite and is not needed for normal use.

## Behavioral evals

`evals/` is the behavioral layer on top of static validation: it runs
an agent against task prompts and scores what the agent actually does.
The default provider is a **deterministic mock agent** (no network, no
API keys, no LLM) implementing the `AGENTS.md` discovery rules:
registry search → skill selection → load `SKILL.md` → ground the
answer in the loaded text → refuse unsafe input. It evaluates the
**library** — discoverability, trigger discrimination, content
completeness, safety guidance — not an LLM's reasoning ability.

| Piece | What it is |
| --- | --- |
| `evals/cases/` | 172 hand-written JSON cases (selection, content, refusal, code) |
| `evals/datasets/discovery-generated.json` | 277 generated discovery cases, one per skill (`npm run evals:generate` regenerates them) |
| `evals/runners/run-evals.mjs` | CLI runner (`npm run evals`); validates every case before running, writes `evals/reports/latest.json` + `latest.md`, compares against the baseline in `evals/baselines/` |
| `evals/runners/mock-agent.mjs` | The deterministic simulated agent |
| `evals/runners/providers.mjs` | Provider interface: mock + OpenAI-compatible model provider (`EVAL_PROVIDER_URL` / `EVAL_PROVIDER_KEY` / `EVAL_PROVIDER_MODEL`; optional; unit-tested against a stub endpoint — no real-model run has been executed) |
| `evals/scorers/` | 4 scorers: selection, content, refusal, code |

Full suite: 463/463 passing, 0 critical, 277/277 skills covered.
Canonical guide: [`evals/README.md`](../evals/README.md), summarized
in [`docs/EVALUATION.md`](EVALUATION.md).

## Security scanner

`scripts/security-scan.mjs` (`npm run check:security`) runs 29 regex
patterns over every text file, plus a byte-level secret scan over
binary files, plus multi-line curl-pipe detection. All patterns live
in one place — `scripts/lib/security-patterns.mjs` — imported by the
scanner, the quality scorer, and the eval mock agent, so there is no
second copy to drift. Each pattern has a stable ID (`SEC-01`,
`INJ-03`, `CODE-04`, …), a severity, and a scope (`scan`, `score`,
`input`). Intentional findings are documented, never silenced by
deleting a pattern: an exceptions list in the scanner (for upstream
files and skill counter-examples) and line-level
`security-scan:ignore` markers (for files this repo owns). See
[`docs/SECURITY-SCANNING.md`](SECURITY-SCANNING.md) and
[`docs/THREAT-MODEL.md`](THREAT-MODEL.md).

## Validation and CI

Six GitHub Actions workflows in `.github/workflows/` (all actions
pinned to SHAs, least-privilege permissions, no secrets):

| Workflow | What it does |
| --- | --- |
| `validate-skills.yml` | PR validation: every local check on a Node 18/20/22 matrix, registry regeneration diff, evals job |
| `lint.yml` | Frontmatter, offline links, trailing whitespace in Markdown |
| `security-audit.yml` | `npm run check:security` on push/PR and weekly; dependency audit skipped with an explanation (zero dependencies, no lockfile) |
| `codeql.yml` | CodeQL advanced setup (workflow) for JavaScript/TypeScript, weekly; default setup must NOT also be enabled |
| `scheduled-maintenance.yml` | Weekly: online link check, stale-verification check (`npm run query -- stale --days 180`), upstream monitoring |
| `release.yml` | Strict validation on `v*.*.*` tags; validation only — no release is created and nothing is published |

Dependabot covers `github-actions` only (`.github/dependabot.yml`).
Secret scanning, Dependabot alerts, and branch protection are manual
repo settings, not files — see `ai/phase10/NOTES.md`. No workflow has
run on GitHub yet.

## Discovery flow

Agents use this library by discovery, not by reading everything. The
rules live in `AGENTS.md`:

1. Start from the task, not the library.
2. Read the registry (`registry/skills.json`) or the category READMEs
   to find candidate skills — or use `npm run query -- search`.
3. Read the full `SKILL.md` of each selected skill before acting.
4. Follow each skill's Required Workflow in order.
5. Load `references/`, `examples/`, and `scripts/` only when the task
   needs them.
6. Never load unrelated skills.
7. Check verification status before relying on version-specific claims
   (`sources/verification-status.json`, via `npm run query -- show`).

Agent definitions in `agents/` map each role to the small set of skills
relevant to it. Workflows in `workflows/` chain skills end to end for
common multi-step tasks.

## Skill format

Every skill is a directory with a `SKILL.md` following the
[Agent Skills specification](https://agentskills.io/specification):
`name` + `description` frontmatter, then Purpose, When to Use, Required
Workflow, Examples, Validation Checklist, and References. Full format
and quality rules are in `docs/SKILL-STANDARDS.md`.
