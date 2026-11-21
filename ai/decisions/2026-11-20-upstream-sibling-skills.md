# Decision: do not import missing upstream sibling skills

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 4)
- **Context:** Phase 3 batch 10 found import-scope gaps: imported
  upstream skills reference sibling skills that were not imported
  into SkillForge (see `ai/phase3/batch-10-report.md`, §Import-scope
  gaps). The Wave 2 brief asked for a decision: import them or accept
  the gaps with a recorded reason.

## Superpowers: `test-driven-development`, `systematic-debugging`

`executing-plans` and `writing-skills` name
`superpowers:test-driven-development` as REQUIRED background, and
`executing-plans` and `using-superpowers` reference
`superpowers:systematic-debugging`. Neither was imported — deliberately:
SkillForge originals `tdd` and `debugging` cover the same ground, and
importing the upstream versions would create duplicate skills (forbidden
by the mission rules and by the repository's own no-duplicate policy).

**Decision:** Do not import. Document the mapping instead, so an agent
following the upstream reference lands on the right local skill:

- `superpowers:test-driven-development` → original skill `tdd`
- `superpowers:systematic-debugging` → original skill `debugging`

Recorded in `sources/imported-skills.md` and in the superpowers
`ATTRIBUTION.md` (both SkillForge-authored files; no upstream file is
edited). The upstream references remain textually unresolvable, which
is accepted: the validator does not treat `superpowers:` names as file
links, so this produces no warnings.

## MarketingSkills: ~30 unimported siblings

Related Skills sections reference `seo-audit`, `content-strategy`,
`competitors`, `programmatic-seo`, `copywriting`, `ab-testing`,
`conversion-tracking`, `attribution`, `lead-magnets`, `revops`,
`public-relations`, and others. Four (`seo-audit`, `content-strategy`,
`programmatic-seo`, `copywriting`) were excluded for name collisions
with SkillForge originals, which are canonical here. The rest are
"Related Skills" pointers, not required workflow steps.

**Decision:** Do not import. Importing the remaining ~30 skills would
nearly double the upstream footprint for marginal value, and several
overlap originals (`competitor-profiling` vs `competitors`,
`fact-checking` vs research siblings). The gap is accepted and
recorded in `sources/imported-skills.md`. If a future phase wants
specific siblings (e.g. `ab-testing`), import them individually with
fresh review — do not bulk-import.
