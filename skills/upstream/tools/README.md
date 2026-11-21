# Upstream shared `tools/` directory

This directory holds tool reference files imported from the
Marketing Skills repository (https://github.com/coreyhaines31/marketingskills,
commit `5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1`, MIT), at the same
snapshot as the marketingskills skills import.

## Why it lives here (not under `marketingskills/`)

The imported `link-building` skill links relatively to
`../../tools/integrations/*.md`. Relative to its location at
`skills/upstream/marketingskills/link-building/SKILL.md`, that
resolves to `skills/upstream/tools/` — matching the upstream repo
layout, where `skills/<name>/` and `tools/` are siblings. Placing
the files anywhere else would leave the links broken.

## Selective scope (deliberate)

Only the 11 files referenced by imported skills are included:

- `integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}.md`
- `clis/{semrush,dataforseo,exa,firecrawl,hunter}.js`

The rest of upstream `tools/` (REGISTRY.md, SETUP.md, PARTNERS.md,
other integrations and CLIs, `aisa/`, `composio/`) is NOT imported;
imported skills reference it only via absolute GitHub URLs. See
`ai/decisions/2026-11-20-marketingskills-tools-import.md` for the
full rationale, including why the 70-file `clis/` directory was not
imported in full.

## Rules

- These files are imported verbatim and must not be edited.
- The `.js` files are API clients that read keys from environment
  variables. Never execute an imported script without reading it
  first (see AGENTS.md verification rules).
