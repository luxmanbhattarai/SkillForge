# Official Sources

The canonical source list for this repository lives in
[`sources/official-sources.md`](../sources/official-sources.md). That
file is the single source of truth for where skills come from and which
documentation they cite. This page summarizes it.

## Upstream skill vendors

49 skills are imported verbatim from 6 vendors (all verified 2026-11-20):

| Vendor | Skills | License |
| --- | --- | --- |
| Anthropic | 8 | Apache-2.0 |
| Vercel | 8 | MIT |
| Superpowers | 13 | MIT |
| Prisma | 11 | MIT |
| Marketing Skills | 8 | MIT |
| Agentic SEO | 1 | MIT |

Import details — source repositories, imported commits, and import dates
— are in [`sources/imported-skills.md`](../sources/imported-skills.md),
with per-vendor attribution in each `skills/upstream/<vendor>/ATTRIBUTION.md`.

## Referenced-only sources

Some sources are referenced but not imported: Awesome Copilot, the SEO
Skills Directory, and the Skills CLI (`npx skills`) as an install
method. See `sources/official-sources.md` for the full list and
`sources/third-party-skills.md` for third-party skills that were
deliberately not imported.

## Specification

- Agent Skills specification: https://agentskills.io/specification

## Official documentation

Original skills cite official documentation for the technologies they
cover — framework docs (React, Next.js, Astro, Tailwind CSS), backend
and database docs (Node.js, PostgreSQL, Prisma, Drizzle), auth docs
(Better Auth, Auth.js), infrastructure docs (Cloudflare, Vercel,
Turborepo, Docker), SEO sources (Google Search Central, Schema.org,
web.dev), and media tooling (Sharp, Satori, ImageMagick). The full list
with URLs is in `sources/official-sources.md`.
