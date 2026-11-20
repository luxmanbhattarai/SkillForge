# Decision: selective marketingskills `tools/` import (11 files, not the full directory)

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 4)
- **Context:** Finding M-08 (INITIAL-AUDIT.md): 6 of the 11 validator
  warnings are genuine broken relative links in
  `skills/upstream/marketingskills/link-building/SKILL.md` to
  `../../tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}.md`.
  The marketingskills `tools/` directory was not imported. Phase 3
  deferred the fix to Phase 4/7.

## Options considered

1. **Import the full `tools/` directory (207 files, 1.9 MB).**
   Complete fidelity, but disproportionate: 70 executable API-client
   scripts (`tools/clis/*.js`) meaningfully expand the supply-chain
   surface, and `tools/REGISTRY.md` itself links to
   `../CONTRIBUTING.md`, which is not imported — a full import would
   create at least one new broken link.
2. **Import all of `tools/integrations/` (128 files) without `clis/`.**
   Rejected: 61 integration docs link relatively to `../clis/*.js`,
   so this would create ~61 new broken links.
3. **Import only the 11 files the imported skills reference (chosen).**
   The 6 integration docs plus the 5 CLI scripts they link to.
   Verified: the 6 docs' only relative links are to those 5 scripts
   (`ahrefs.md` has none); the 5 scripts have no local imports, no
   `eval`/`child_process`/file writes, and no hardcoded keys (API keys
   come from environment variables). Total ~74 KB, zero new broken
   links. Selective import is precedented: the original import took
   8 of 53 marketingskills skills.
4. **Do not import; accept the 6 warnings as documented.**
   Rejected: the warnings are genuine (real references to real files),
   and option 3 fixes them at minimal cost.

## Decision

Option 3. Import verbatim from the recorded import commit
`5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1` into
`skills/upstream/tools/`:

- `tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}.md`
- `tools/clis/{semrush,dataforseo,exa,firecrawl,hunter}.js`

Location note (corrected during implementation): the files must live
at `skills/upstream/tools/`, NOT `skills/upstream/marketingskills/tools/`.
The skill links `../../tools/...` relative to
`skills/upstream/marketingskills/link-building/SKILL.md`, which
resolves to `skills/upstream/tools/` — mirroring the upstream repo,
where `skills/<name>/` and `tools/` are siblings. An initial import
under `marketingskills/tools/` left all 6 warnings in place, which
confirmed the resolution; moving the files to `skills/upstream/tools/`
cleared them. A `README.md` in `skills/upstream/tools/` records the
provenance and the selective scope.

Update the marketingskills `ATTRIBUTION.md` and
`sources/imported-skills.md` to record the selective scope. Expected
result: validator warnings drop from 11 to 5 (3 false-positive prose
hits, 1 borderline 501-line file, 1 illustrative anchor).

The remaining `tools/` content (REGISTRY.md, SETUP.md, PARTNERS.md,
other integrations and CLIs, aisa/, composio/) stays unimported; the
imported skills reference it only via absolute GitHub URLs, which
resolve upstream.
