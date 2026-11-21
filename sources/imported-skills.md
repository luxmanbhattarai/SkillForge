# Imported Skills

Upstream skills copied into `skills/upstream/<vendor>/`. All imports were
verified for license compatibility on 2026-11-20 (see `research-log.md`).
Total imported: **49 skills from 6 vendors**.

## Import policy

1. **License first.** A skill is imported only if its license permits
   redistribution (MIT, Apache-2.0, or equivalent). The license text or
   reference is preserved with the import.
2. **Verbatim.** Upstream skill *content* — `SKILL.md`, scripts,
   references, examples, and other imported files — is never edited.
   Fixes belong upstream. The only permitted change to imported
   content is renaming a directory to match its frontmatter `name`,
   as the Agent Skills specification requires (documented in the
   vendor's `ATTRIBUTION.md` when it happens). The vendor
   `ATTRIBUTION.md` files are project-maintained, not upstream
   content: they may carry additive project documentation (e.g. the
   tools-import and unimported-sibling sections added in commit
   `caf1f32`).
3. **Attribution.** Each vendor directory has an `ATTRIBUTION.md` with the
   source repository, license, imported commit, import date, and skill list.
4. **No collisions.** An upstream skill whose name collides with an
   original skill in this repository is referenced, not imported
   (see `third-party-skills.md`).
5. **Trust boundary.** Upstream content is untrusted until reviewed. Never
   execute an imported script without reading it. Upstream skills are
   validated at Agent Skills spec level only (name/description/directory
   match) and are exempt from this repository's section requirements.
6. **Updates.** Re-import from upstream by commit; record the new commit
   and date in `ATTRIBUTION.md` and `CHANGELOG.md`. See
   `docs/UPDATE-PROCESS.md`.

## Imported skills by vendor

### Anthropic — 8 skills (Apache-2.0)

Source: https://github.com/anthropics/skills ·
Commit `e4bb5d960d87126ff3b3a8af1a104b7db67560ba` · Imported 2026-11-20

`brand-guidelines`, `doc-coauthoring`, `frontend-design`, `mcp-builder`,
`skill-creator`, `theme-factory`, `web-artifacts-builder`, `webapp-testing`

### Vercel — 8 skills (MIT)

Source: https://github.com/vercel-labs/agent-skills ·
Commit `5a37a6329fbad3666c3207392a6a7c0110e92efb` · Imported 2026-11-20 (re-imported from `1a2c79d4` on 2026-11-20; `web-design-guidelines` 1.0.0 → 1.1.0)

`deploy-to-vercel`, `vercel-cli-with-tokens`,
`vercel-composition-patterns`, `vercel-optimize`,
`vercel-react-best-practices`, `vercel-react-view-transitions`,
`web-design-guidelines`, `writing-guidelines`

### Superpowers — 13 skills (MIT)

Source: https://github.com/obra/superpowers ·
Commit `22f0b463e7a5e579904dd6211a520321035526f7` · Imported 2026-11-20

`brainstorming`, `diagnosing-superpowers`, `dispatching-parallel-agents`,
`executing-plans`, `finishing-a-development-branch`,
`receiving-code-review`, `requesting-code-review`,
`subagent-driven-development`, `using-git-worktrees`, `using-superpowers`,
`verification-before-completion`, `writing-plans`, `writing-skills`

Unimported siblings (deliberate, mapped to originals):
`test-driven-development` → original `tdd`;
`systematic-debugging` → original `debugging`. Importing the upstream
versions would duplicate the originals. See
`ai/decisions/2026-11-20-upstream-sibling-skills.md`.

### Prisma — 11 skills (MIT)

Source: https://github.com/prisma/skills ·
Commit `a6f192959cf43b08aa330fe1ffca090267215812` · Imported 2026-11-20

`prisma-cli`, `prisma-client-api`, `prisma-compute`,
`prisma-database-setup`, `prisma-driver-adapter-implementation`,
`prisma-mongodb-upgrade`, `prisma-orm-setup`, `prisma-postgres`,
`prisma-postgres-setup`, `prisma-postgres-upgrade`, `prisma-upgrade-v7`

### Marketing Skills — 8 skills (MIT)

Source: https://github.com/coreyhaines31/marketingskills ·
Commit `5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1` · Imported 2026-11-20

`ai-seo`, `analytics`, `competitor-profiling`, `copy-editing`, `cro`,
`link-building`, `schema`, `site-architecture`

Referenced tool files (selective import, 2026-11-20): the 11 files
`link-building` links to are imported verbatim (same commit) at
`skills/upstream/tools/` — `integrations/{ahrefs,semrush,dataforseo,
exa,firecrawl,hunter}.md` and `clis/{semrush,dataforseo,exa,firecrawl,
hunter}.js`. The rest of upstream `tools/` is not imported; see
`ai/decisions/2026-11-20-marketingskills-tools-import.md`.

Unimported siblings: Related Skills sections reference ~30 upstream
skills that were not imported (`seo-audit`, `content-strategy`,
`programmatic-seo`, `copywriting` excluded for name collisions with
SkillForge originals; the rest accepted as an import-scope gap). See
`ai/decisions/2026-11-20-upstream-sibling-skills.md`.

### Agentic SEO — 1 skill (MIT)

Source: https://github.com/pwg-projects/agentic-seo-skill ·
Commit `67775741ce88e0a474513ac53d6f6e4558ff1a3b` · Imported 2026-11-20

`seo` (includes 15 sub-skill references and deterministic audit scripts)

Low-activity upstream: no pushes since 2026-03-03. Flagged for re-review
at the next update cycle.
