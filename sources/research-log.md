# Research Log

Running log of source research for this repository. Every entry records what
was checked, when, and what was decided. Star counts are snapshots "as of"
the check date, not live data.

## 2026-11-20 — Initial source audit (Phase 1)

Method: GitHub REST API metadata checks for 27 repositories, shallow clones
of 6 skill repositories, frontmatter inspection of sample `SKILL.md` files,
license-file inspection, and a read of the Agent Skills specification at
https://agentskills.io/specification (spec page updated 2026-08-04).

### Agent Skills specification (agentskills.io)

- A skill is a directory with at minimum `SKILL.md` (YAML frontmatter +
  Markdown body).
- `name`: required, 1-64 chars, lowercase alphanumerics and hyphens, no
  leading/trailing/consecutive hyphens, must match the parent directory.
- `description`: required, 1-1024 chars, must say what the skill does and
  when to use it.
- `license`, `compatibility` (max 500 chars), `metadata` (string map),
  `allowed-tools` (experimental): optional.
- `SKILL.md` should stay under 500 lines; detail goes in `references/`,
  `scripts/`, `assets/`. File references are relative to the skill root,
  one level deep.
- This repository's template and validator implement exactly this.

### Skill repositories inspected (cloned, read, license checked)

| Repository | Maintainer | License (verified) | Skills | Last push (as of 2026-11-20) | Decision |
| --- | --- | --- | --- | --- | --- |
| anthropics/skills | Anthropic | Apache-2.0 (per-skill LICENSE.txt; no root LICENSE file) | 19 | 2026-11-16 | Import 8 relevant skills |
| vercel-labs/agent-skills | Vercel | MIT (README License section; no root LICENSE file) | 9 | 2026-11-12 | Import 8 (skip react-native-skills, out of scope) |
| obra/superpowers | Jesse Vincent | MIT | 15 | 2026-11-03 | Import 13 (skip test-driven-development, systematic-debugging — originals cover them; referenced instead) |
| prisma/skills | Prisma | MIT | 11 | 2026-11-20 (repo active) | Import all 11 |
| coreyhaines31/marketingskills | Corey Haines | MIT | 53 | 2026-11-20 | Import 8 non-colliding SEO/content skills; 4 colliding names referenced, not imported |
| pwg-projects/agentic-seo-skill | Bhanu Namikaze | MIT | 1 (+15 sub-skill refs) | 2026-03-03 | Import the 1 skill; note low activity (0 stars, last push Mar 2026) |
| github/awesome-copilot | GitHub | MIT | 464 skill dirs | 2026-11-20 | Reference only — too large to import; see third-party-skills.md |
| vercel-labs/skills (Skills CLI) | Vercel | MIT | CLI tool, not skills | 2026-11-17 | Reference; install method documented |

Notes:

- anthropics/skills has no repository-level license file; each skill ships
  its own `LICENSE.txt` (Apache-2.0). Imported skills keep that file.
- vercel-labs/agent-skills has no LICENSE file; its README states "MIT"
  under a License heading. Imports preserve that attribution.
- Prisma skills note: Prisma ORM 8 is the current default for new apps
  (per `prisma-orm-setup`); Prisma 6/7 remain supported paths.
- agentic-seo-skill has 0 stars and no pushes since 2026-03-03. It is MIT
  licensed and technically substantive, so it is imported, but it is
  flagged in `imported-skills.md` as low-activity upstream.

### Documentation repositories (references, not skills)

Verified to exist and be active as of 2026-11-20; these are documentation
or code repositories, NOT agent-skills repositories. They are cited as
official documentation inside original skills, not imported:

- withastro/astro (MIT-ish/NOASSERTION via API; Astro is MIT licensed —
  see its LICENSE file), vercel/next.js (MIT), gohugoio/hugo (Apache-2.0),
  tailwindlabs/tailwindcss (MIT), shadcn-ui/ui (MIT), honojs/hono (MIT),
  fastify/fastify (MIT), nestjs/nest (MIT), trpc/trpc (MIT),
  drizzle-team/drizzle-orm (Apache-2.0), better-auth/better-auth (MIT),
  nextauthjs/next-auth (ISC; last push 2026-07-22), vercel/turborepo (MIT),
  nodejs/node, microsoft/TypeScript (Apache-2.0), supabase/supabase
  (Apache-2.0), cloudflare/workers-sdk (Apache-2.0, home of Wrangler).

### SEO directories

- seoskills.sh — directory of 472 SEO agent skills (79 by seoskills.sh),
  installable via `npx skills add https://seoskills.sh`. Referenced only;
  per-skill repositories and licenses vary. Not imported wholesale.

### Name-collision decisions

Upstream skill names must not collide with original skill names (agents
discover by name). Colliding upstream skills are referenced from the
matching original skill instead of imported:

- marketingskills `seo-audit`, `content-strategy`, `programmatic-seo`,
  `copywriting` — originals exist in this repo; upstream versions linked
  in `sources/third-party-skills.md`.
- superpowers `test-driven-development`, `systematic-debugging` —
  conceptually covered by originals `tdd` and `debugging`; referenced.
