# SkillForge

A universal, production-grade **AI Agent Skills library** for software
engineering, SEO, content, and media work — built on the
[Agent Skills specification](https://agentskills.io/specification).

SkillForge gives coding agents (Claude Code, Cursor, Codex, Antigravity, and
any agent implementing the Agent Skills standard) reusable skills they can
discover and apply across projects — instead of reinventing instructions in
every repo.

> **Status:** v1.0.0 released 2026-11-20. The production upgrade (branch
> `feat/skillforge-production-upgrade`, unreleased) brings the library to
> **277 skills** — **228 original** and **49 upstream** — across
> **18 categories**, plus **24 agents** and **16 workflows**. Counts on
> this page are verified against `registry/`; run
> `npm run query -- status` for the live numbers.

## What's inside

```text
skills/
├── ai-engineering/  # LLM integration, RAG, AI agents, MCP security, evals
├── architecture/    # monorepos, Turborepo, DDD, microservices
├── auth/            # Better Auth, OAuth, sessions, JWT, RBAC, MFA
├── backend/         # Node.js, APIs, queues, caching, SDKs, MCP
├── content/         # strategy, article writing, editorial review
├── core/            # architecture, clean code, debugging, review, TDD
├── database/        # design, PostgreSQL, MySQL, SQLite, MongoDB, Prisma, Drizzle
├── desktop/         # Tauri 2, Electron, Rust, native APIs, packaging
├── documentation/   # technical docs, API docs, changelogs
├── frontend/        # HTML, CSS, JS/TS, React, Next.js, Astro, Hugo
├── infrastructure/  # Cloudflare, Vercel, Docker, CI/CD, observability
├── media/           # AI images, OG images, thumbnails
├── metadata/        # SEO metadata, Open Graph, Twitter Cards
├── performance/     # Core Web Vitals, Lighthouse, optimization
├── security/        # OWASP, XSS/CSRF/SQLi, secrets, headers
├── seo/             # technical SEO, schema, GEO/AEO, keyword research
├── testing/         # unit, integration, E2E, Vitest, Playwright
└── upstream/        # imported official skills (never edited)
agents/              # 24 specialized agent definitions
workflows/           # 16 end-to-end workflows (feature dev, SEO audit, publishing…)
registry/            # machine-readable index (generated — never hand-edit)
scripts/             # validation, registry generation, install tooling
evals/               # behavioral evaluation suite (mock agent, 463 cases)
sources/             # research log, licenses, attribution, verification status
```

Every skill is a directory with a `SKILL.md` following the Agent Skills
spec: `name` + `description` frontmatter, then Purpose, When to Use,
Required Workflow, Examples, Validation Checklist, and References. Full
format and quality rules: [`docs/SKILL-STANDARDS.md`](docs/SKILL-STANDARDS.md).

## Verification status

Not every skill carries the same assurance. Each skill's status comes from
`sources/verification-status.json` (Phase 3 technical-accuracy audit plus
the Stage C audit of the 51 Phase 4 skills) and is surfaced in the
registry — a skill with no audit entry is `unverified`, never silently
`verified`.

| Status | Skills | Meaning |
| --- | --- | --- |
| `verified` | 255 | Audited against official docs; guidance confirmed. |
| `verified-with-limitations` | 16 | Audited; known limits recorded (e.g. docs unavailable, RC software). |
| `needs-correction` | 6 | Known errors — all upstream; fixes belong upstream, never edited here. |
| `unverified` | 0 | No unaudited skills remain; the 51 Phase 4 skills were audited in Stage C (2026-11-20). |

Check a skill before relying on version-specific claims:
`npm run query -- show <skill>` prints its status and `last_verified`
date. See [`docs/UPDATE-PROCESS.md`](docs/UPDATE-PROCESS.md) for how
skills are re-verified.

## How agents use it

Read [`AGENTS.md`](AGENTS.md) — it defines discovery rules: start from the
task, read the registry, load only the skills the task needs, follow each
skill's Required Workflow, and run its Validation Checklist before finishing.
The query CLI is the fastest way to explore the library:

```bash
npm run query -- search nextjs      # find skills by name, description, category
npm run query -- categories         # categories with skill counts
npm run query -- show nextjs        # full details for one skill
npm run query -- deps nextjs        # agents/workflows using it, plus related skills
npm run query -- status             # verification-status summary
npm run query -- agents             # list agent definitions
npm run query -- workflows          # list workflows
```

Task-based examples:

| Task | Skills activated |
| --- | --- |
| Build a Next.js dashboard | `react`, `nextjs`, `typescript`, `tailwind-css`, `authentication`, `unit-testing` |
| Write a blog article | `keyword-research`, `serp-analysis`, `article-writing`, `on-page-seo`, `schema-jsonld` |
| Deploy to Cloudflare | `cloudflare-workers`, `cloudflare-d1`, `deployment`, `observability` |
| Create a monorepo | `monorepo`, `pnpm-workspaces`, `turborepo`, `package-boundaries` |

## Installation

**Option 1 — install script (recommended)**

```bash
git clone https://github.com/luxmanbhattarai/SkillForge.git
cd SkillForge
# Project-local, Claude Code
node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro,seo-audit
# User-level, everything
node scripts/install-skills.mjs install --target claude-code --scope user --skills all
```

Targets: `claude-code`, `cursor`, `codex`, `antigravity` (see
[`docs/INSTALLATION.md`](docs/INSTALLATION.md) for paths, commands, and
safety rules). The installer never silently deletes your modifications:
conflicts are detected by hash, backups are made before replacement,
installs are atomic with rollback, and every install is tracked in a
manifest. Commands: `install`, `update`, `list`, `doctor`, `validate`,
`uninstall`, `restore`.

**Option 2 — Skills CLI**

```bash
npx skills add luxmanbhattarai/SkillForge
```

Installs skills only (not agents or workflows). See
[`docs/INSTALLATION.md`](docs/INSTALLATION.md#option-2--skills-cli).

**Option 3 — Git submodule** (keeps projects in sync with the library)

```bash
git submodule add https://github.com/luxmanbhattarai/SkillForge.git skills-library
```

Do not copy the whole repository into a project. Install the skills the
project needs.

## Updating and uninstalling

```bash
# Re-install installed items from the current library (pull the repo first)
node scripts/install-skills.mjs update --target claude-code --scope project

# Check install health (paths, manifest, stale installs, legacy locations)
node scripts/install-skills.mjs doctor

# Remove one skill, or everything
node scripts/install-skills.mjs uninstall --target claude-code --scope project --skill nextjs
node scripts/install-skills.mjs uninstall --target claude-code --scope project --all --force

# Restore a backup made before a replacement
node scripts/install-skills.mjs restore --list --target claude-code --scope project
```

Upgrading from v1.0.0: Codex and Antigravity install paths changed (see
[`docs/UPGRADE.md`](docs/UPGRADE.md)); `doctor` reports skills left in
the legacy locations.

## Upstream skills

49 skills are imported verbatim from official and reputable sources, with
attribution and licenses preserved (see [`sources/imported-skills.md`](sources/imported-skills.md)):

| Source | Skills | License |
| --- | --- | --- |
| Anthropic | 8 | Apache-2.0 |
| Vercel | 8 | MIT |
| Superpowers | 13 | MIT |
| Prisma | 11 | MIT |
| Marketing Skills | 8 | MIT |
| Agentic SEO | 1 | MIT |

Upstream skills live under `skills/upstream/<vendor>/` and are never edited.
Fixes belong upstream; drift is monitored with `npm run check:upstream`
(weekly in CI). Third-party skills that were deliberately *not* imported
(too large, name collisions, out of scope) are listed in
[`sources/third-party-skills.md`](sources/third-party-skills.md).

## Validation, scoring, and evaluation

```bash
npm run validate        # frontmatter, sections, links, duplicates, registry
npm run check:frontmatter   # name/description rules, required metadata
npm run check:duplicates    # no duplicate skill names
npm run check:sources       # provenance + verification-date freshness
npm run check:agents        # agent/workflow structure and references
npm run check:registry      # registry schemas + semantic + verification coverage
npm run check:links         # internal link check (add --online for external URLs)
npm run check:security      # credential / prompt-injection scan
npm run check:upstream      # upstream drift vs pinned commits
npm run score               # quality score for every original skill (0–100)
npm run test                # unit tests (326 tests, node:test, zero dependencies)
npm run evals               # behavioral evals: 463 cases, deterministic mock agent
npm run registry            # regenerate registry/ from disk (never hand-edit it)
npm run report              # coverage + audit report
```

CI runs the same checks on every pull request (`.github/workflows/`):
validation on Node 24, registry regeneration diff, evals, lint,
security audit, CodeQL, and weekly scheduled maintenance (online links,
stale verification, upstream monitoring). See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#validation-and-ci) for the
full pipeline.

The eval suite (`evals/`) runs a deterministic mock agent — no LLM APIs,
no keys, no network — against 186 hand-written cases (skill selection,
content grounding, refusal, code generation) plus 277 generated discovery
cases, one per skill. It evaluates the library, not a real model: see
[`docs/EVALUATION.md`](docs/EVALUATION.md).

## Security model

Security is layered; no single check is the whole story. See
[`SECURITY.md`](SECURITY.md) for reporting, [`docs/SECURITY-SCANNING.md`](docs/SECURITY-SCANNING.md)
for the scanner, and [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) for
what is and is not defended against.

- **Pattern scan** (`npm run check:security`, also in CI): 29 patterns
  over every text file plus a byte-level secret scan over binaries —
  secrets, prompt-injection markers, dangerous commands (including
  multi-line curl-pipe), and code-vulnerability shapes.
- **Shared pattern library** (`scripts/lib/security-patterns.mjs`): one
  source of truth for the scanner, the quality scorer, and the eval
  mock agent.
- **Behavioral evals**: refusal cases test that the library's guidance
  leads an agent to refuse injection, exfiltration, and destructive
  requests.
- **Supply chain**: every upstream import pins an exact commit and
  license, re-verified against the public GitHub API on 2026-11-20.
- **Zero dependencies, no lockfile**: there is no dependency tree to
  poison and nothing for `npm audit` to audit.
- **Upstream is untrusted input until reviewed**: follow imported skills
  only when they agree with official documentation, and never execute
  an imported script without reading it first.

Known limits: the custom security scanner is a pattern-based smoke
screen, not SAST (see `docs/SECURITY-SCANNING.md`); real SAST runs
in CI via the Semgrep job in the security-audit workflow
(`p/javascript` over `scripts/`, `test/`, `evals/`), 0 findings on
GitHub (draft PR #4, run 44946197886) and locally (68 rules), and
Gitleaks/TruffleHog ran clean once in Stage D (2026-11-20) but are
not in CI. GitHub secret scanning (with push protection) and
Dependabot security updates are enabled; branch protection is not
yet enabled (see `ai/phase10/NOTES.md` for the recommended checks).
All 9 CI checks pass on draft PR #4 (2026-11-21), including the
Windows leg (330 tests, 325 pass, 0 fail, 5 POSIX-only skipped)
and the first gating Windows runs.
`scheduled-maintenance` and `release` have never run on GitHub.

## Documentation

| Guide | What it covers |
| --- | --- |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Install, update, uninstall, safety rules, all targets |
| [`docs/UPGRADE.md`](docs/UPGRADE.md) | Upgrading installed skills and from v1.0.0 |
| [`docs/AGENT-COMPATIBILITY.md`](docs/AGENT-COMPATIBILITY.md) | Supported agents, install paths, caveats |
| [`docs/SKILL-STANDARDS.md`](docs/SKILL-STANDARDS.md) | Skill format, 22-element quality standard, scoring |
| [`docs/EVALUATION.md`](docs/EVALUATION.md) | Behavioral evals (canonical guide: `evals/README.md`) |
| [`docs/SECURITY-SCANNING.md`](docs/SECURITY-SCANNING.md) | Scanner, exceptions, guards, limits |
| [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) | Threats, mitigations, trust boundaries |
| [`docs/UPDATE-PROCESS.md`](docs/UPDATE-PROCESS.md) | Re-importing upstream, re-verifying skills, versioning |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Common errors and fixes |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Repository layout, registry, validation, installer |
| [`docs/OFFICIAL-SOURCES.md`](docs/OFFICIAL-SOURCES.md) | Where skills and their citations come from |

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`docs/SKILL-STANDARDS.md`](docs/SKILL-STANDARDS.md). In short: copy
`templates/SKILL-TEMPLATE.md`, write original content verified against
official docs, run `npm run validate`, score with `npm run score`,
regenerate the registry, and open a pull request.

## License

Original content: MIT (see `LICENSE`). Upstream skills keep their own
licenses — see [`sources/licenses.md`](sources/licenses.md).
