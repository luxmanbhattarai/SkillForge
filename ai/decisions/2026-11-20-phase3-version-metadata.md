# Decision: where supported-version info lives in a skill

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 3)
- **Context:** The mission requires each skill to identify its
  supported version range. The question is where that information
  lives: new frontmatter metadata fields, or the skill body.

## Options considered

1. **New frontmatter fields** (e.g. `metadata.supported_versions`).
   Machine-readable, but changes the frontmatter standard mid-flight,
   requires validator updates, and frontmatter values are strings —
   version ranges would be free text anyway.
2. **Skill body (chosen).** Version ranges, version-specific
   differences, and deprecated approaches go in the Prerequisites
   and/or Official Documentation sections, where agents already look
   for them and where prose caveats fit naturally.

## Decision

Option 2 for Phase 3. Frontmatter keeps its current 5 metadata keys
(`version`, `category`, `maintainer`, `source`, `last_verified`);
`last_verified` is updated to the actual verification date when a
skill is verified. If Phase 9 (registry) later wants machine-readable
version ranges, it can add a field then, with a validator update and
a migration of all 177 original skills at once.
