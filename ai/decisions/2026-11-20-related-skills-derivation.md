# Decision: `related` skills are derived from agent/workflow co-occurrence

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 9
- **Context:** Phase 9 requires dependency/relationship metadata in
  the registry and a CLI for discovering related skills. Skills
  declare no dependencies in frontmatter, and the Phase 3 decision
  keeps frontmatter to its 5 metadata keys. Hand-maintaining a
  relationships file would duplicate information and rot.

## Options considered

1. **Hand-maintained relationships file.** Curated, but a second
   source of truth that drifts from agents/workflows. Rejected.
2. **Parse "Related Skills" sections in SKILL.md bodies.** Only
   some upstream skills have them; original skills do not use a
   standard section for this. Coverage would be partial and the
   format is prose. Rejected.
3. **Co-occurrence in agents/workflows (chosen).** Two skills are
   related when the same agent lists both in "Skills it can
   discover" or the same workflow references both in its steps.
   Agents and workflows are the curated statements of which skills
   belong together, so their co-occurrence is a genuine signal.

## Decision

Option 3. The registry generator computes, per skill, up to 5
related skills:

- Count co-occurrences across all 24 agents (discover lists) and
  16 workflows (skills referenced in steps).
- Minimum co-occurrence count of 2 (a single shared mention is too
  weak to call a relationship).
- Rank by count descending, ties broken by skill name ascending
  (deterministic).
- Stored as `related: [<skill-name>, ...]` in `registry/skills.json`.

## Consequences

- `related` is derived data: it changes only when agents or
  workflows change, and regeneration is deterministic.
- Skills that appear in fewer than 2 shared contexts get an empty
  list — honest, not padded.
- This is a relatedness signal, not a dependency declaration: no
  skill in this library declares a hard dependency on another, and
  the registry does not claim otherwise.
