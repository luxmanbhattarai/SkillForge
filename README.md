# SkillForge

A universal, production-grade **AI Agent Skills library** for software
engineering, SEO, content, and media work — built on the
[Agent Skills specification](https://agentskills.io/specification).

SkillForge gives coding agents (Claude Code, Cursor, Codex, Antigravity, and
any agent implementing the Agent Skills standard) reusable, verified skills
they can discover and apply across projects — instead of reinventing
instructions in every repo.

> **Status:** Foundation complete. **49 upstream skills** imported and
> verified (Anthropic, Vercel, Superpowers, Prisma, Marketing Skills,
> Agentic SEO). Original skills across 15 categories are being written now;
> see `AUDIT-REPORT.md` for live coverage.

## What's inside

```text
skills/
├── core/            # architecture, clean code, debugging, review, TDD
├── frontend/        # HTML, CSS, JS/TS, React, Next.js, Astro, Hugo
├── backend/         # Node.js, APIs, queues, caching, SDKs, MCP
├── database/        # design, PostgreSQL, MySQL, SQLite, MongoDB, Prisma, Drizzle
├── auth/            # Better Auth, OAuth, sessions, JWT, RBAC, MFA
├── architecture/    # monorepos, Turborepo, DDD, microservices
├── infrastructure/  # Cloudflare, Vercel, Docker, CI/CD, observability
├── testing/         # unit, integration, E2E, Vitest, Playwright
├── security/        # OWASP, XSS/CSRF/SQLi, secrets, headers
├── seo/             # technical SEO, schema, GEO/AEO, keyword research
├── performance/     # Core Web Vitals, Lighthouse, optimization
├── content/         # strategy, article writing, editorial review
├── media/           # AI images, OG images, thumbnails
├── metadata/        # SEO metadata, Open Graph, Twitter Cards
├── documentation/   # technical docs, API docs, changelogs
└── upstream/        # imported official skills (never edited)
agents/              # 20 specialized agent definitions
workflows/           # end-to-end workflows (feature dev, SEO audit, publishing…)
registry/            # machine-readable index (generated — never hand-edit)
scripts/             # validation, registry generation, install tooling
sources/             # research log, licenses, attribution
```

Every skill is a directory with a `SKILL.md` following the Agent Skills
spec: `name` + `description` frontmatter, then Purpose, When to Use,
Required Workflow, Examples, Validation Checklist, and References.

## How agents use it

Read [`AGENTS.md`](AGENTS.md) — it defines discovery rules: start from the
task, read the registry, load only the skills the task needs, follow each
skill's Required Workflow, and run its Validation Checklist before finishing.

Task-based examples:

| Task | Skills activated |
| --- | --- |
| Build a Next.js dashboard | `react`, `nextjs`, `typescript`, `tailwind-css`, `authentication`, `unit-testing` |
| Write a blog article | `keyword-research`, `serp-analysis`, `article-writing`, `on-page-seo`, `schema-jsonld` |
| Deploy to Cloudflare | `cloudflare-workers`, `cloudflare-d1`, `deployment`, `observability` |
| Create a monorepo | `monorepo`, `pnpm-workspaces`, `turborepo`, `package-boundaries` |

## Installation

**Option 1 — install selected skills (recommended)**

```bash
git clone https://github.com/luxmanbhattarai/SkillForge.git
cd SkillForge
# Project-local, Claude Code
node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro,seo-audit
# User-level, everything
node scripts/install-skills.mjs --target claude-code --scope user --skills all
```

Targets: `claude-code`, `cursor`, `codex`, `antigravity` (see
[`docs/INSTALLATION.md`](docs/INSTALLATION.md) for paths and notes).

**Option 2 — Skills CLI**

```bash
npx skills add luxmanbhattarai/SkillForge
```

**Option 3 — Git submodule** (keeps projects in sync with the library)

```bash
git submodule add https://github.com/luxmanbhattarai/SkillForge.git skills-library
```

Do not copy the whole repository into a project. Install the skills the
project needs.

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
Third-party skills that were deliberately *not* imported (too large, name
collisions, out of scope) are listed in
[`sources/third-party-skills.md`](sources/third-party-skills.md).

## Validation

```bash
npm run validate        # frontmatter, sections, links, duplicates, registry
npm run check:links     # internal link check
npm run check:sources   # provenance + verification-date freshness
npm run check:security  # credential / prompt-injection scan
npm run registry        # regenerate registry/ from disk
npm run report          # coverage + audit report
```

CI runs the same checks on every pull request (`.github/workflows/`).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`docs/SKILL-STANDARDS.md`](docs/SKILL-STANDARDS.md). In short: copy
`templates/SKILL-TEMPLATE.md`, write original content, run
`npm run validate`, regenerate the registry.

## License

Original content: MIT (see `LICENSE`). Upstream skills keep their own
licenses — see [`sources/licenses.md`](sources/licenses.md).
