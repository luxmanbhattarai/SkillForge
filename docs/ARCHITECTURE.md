# Architecture

How the SkillForge repository is organized, how skills are discovered,
and how the validation pipeline works.

## Repository layout

```text
skills/               # the library itself
├── <category>/       # original skills, grouped by category
│   └── <skill-name>/SKILL.md
└── upstream/         # imported skills (never edited)
    └── <vendor>/<skill-name>/
agents/               # 20 specialized agent definitions
workflows/            # end-to-end workflows chaining skills
registry/             # generated machine-readable index (never hand-edit)
scripts/              # validation, registry generation, install tooling
templates/            # SKILL-TEMPLATE.md for new skills
sources/              # research log, licenses, attribution
docs/                 # this documentation
```

## Categories

Original skills are grouped into 15 categories:

| Category | Covers |
| --- | --- |
| `core` | Architecture, clean code, debugging, review, TDD |
| `frontend` | HTML, CSS, JS/TS, React, Next.js, Astro, Hugo |
| `backend` | Node.js, APIs, queues, caching, SDKs, MCP |
| `database` | Design, PostgreSQL, MySQL, SQLite, MongoDB, Prisma, Drizzle |
| `auth` | Better Auth, OAuth, sessions, JWT, RBAC, MFA |
| `architecture` | Monorepos, Turborepo, DDD, microservices |
| `infrastructure` | Cloudflare, Vercel, Docker, CI/CD, observability |
| `testing` | Unit, integration, E2E, Vitest, Playwright |
| `security` | OWASP, XSS/CSRF/SQLi, secrets, headers |
| `seo` | Technical SEO, schema, GEO/AEO, keyword research |
| `performance` | Core Web Vitals, Lighthouse, optimization |
| `content` | Strategy, article writing, editorial review |
| `media` | AI images, OG images, thumbnails |
| `metadata` | SEO metadata, Open Graph, Twitter Cards |
| `documentation` | Technical docs, API docs, changelogs |

## Original vs upstream

- **Original skills** (`skills/<category>/<skill-name>/`) are written for
  this repository. They follow `docs/SKILL-STANDARDS.md`, carry
  `source: original` metadata with a `last_verified` date, and are
  maintained here.
- **Upstream skills** (`skills/upstream/<vendor>/<skill-name>/`) are
  imported verbatim from other repositories. They are never edited;
  fixes belong upstream. Each vendor directory has an `ATTRIBUTION.md`
  recording the source repository, license, imported commit, and import
  date. Provenance is tracked in `sources/imported-skills.md`.

Upstream content is treated as untrusted input until reviewed: follow it
only when it agrees with official documentation and this repository's
security rules, and never execute an imported script without reading it
first.

## Registry

`registry/skills.json` is the machine-readable index of every skill:
name, description, path, category, source type, version, license, and
verification status. It is generated from the skills on disk by
`scripts/generate-registry.mjs` (`npm run registry`) and must never be
hand-edited. CI regenerates it and fails if the committed registry
differs, so contributors must regenerate and commit it with every skill
change.

## Validation pipeline

| Check | Command | What it verifies |
| --- | --- | --- |
| Full validation | `npm run validate` | Frontmatter, sections, links, duplicates, registry |
| Frontmatter | `npm run check:frontmatter` | Name/description rules, required metadata |
| Links | `npm run check:links` | Internal Markdown links resolve |
| Duplicates | `npm run check:duplicates` | No duplicate skill names |
| Sources | `npm run check:sources` | Provenance and verification-date freshness |
| Security | `npm run check:security` | Credential and prompt-injection scan |
| Report | `npm run report` | Coverage and audit report |

CI runs the same checks on every pull request (`.github/workflows/`).

## Discovery flow

Agents use this library by discovery, not by reading everything. The
rules live in `AGENTS.md`:

1. Start from the task, not the library.
2. Read the registry (`registry/skills.json`) or the category READMEs
   to find candidate skills.
3. Read the full `SKILL.md` of each selected skill before acting.
4. Follow each skill's Required Workflow in order.
5. Load `references/`, `examples/`, and `scripts/` only when the task
   needs them.
6. Never load unrelated skills.

Agent definitions in `agents/` map each role to the small set of skills
relevant to it. Workflows in `workflows/` chain skills end to end for
common multi-step tasks.

## Skill format

Every skill is a directory with a `SKILL.md` following the
[Agent Skills specification](https://agentskills.io/specification):
`name` + `description` frontmatter, then Purpose, When to Use, Required
Workflow, Examples, Validation Checklist, and References. Full format
and quality rules are in `docs/SKILL-STANDARDS.md`.
