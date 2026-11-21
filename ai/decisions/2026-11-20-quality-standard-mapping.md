# Decision: 22-element quality standard maps onto the 15 template sections

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 5)
- **Context:** The mission's Phase 5 lists 22 elements each skill
  should include "where applicable". The repository already enforces
  15 template sections via `scripts/validate-skills.mjs`. The question
  is whether to add new required sections or map the 22 elements onto
  the existing 15.

## Options considered

1. **Add new required sections** (e.g. `Supported Versions`,
   `Accessibility Considerations`, `Testing Strategy`).
   Cleaner one-to-one mapping, but requires a validator change and a
   migration of all 228 original skills at once — a large, risky
   rewrite pass for what is mostly a reorganization of content that
   already exists in other sections.
2. **Map the 22 elements onto the 15 sections (chosen).**
   Elements that are not sections become required *content* inside
   existing sections, enforced by the quality scorer
   (`scripts/score-skills.mjs`) rather than the structural validator.
   No migration, no validator change, no disruption to the 228
   existing skills.

## Decision

Option 2. The mapping (documented in `docs/SKILL-STANDARDS.md`):

| # | Element | Where it lives |
| --- | --- | --- |
| 1 | Name | Frontmatter `name` |
| 2 | Description | Frontmatter `description` |
| 3 | Purpose | `Purpose` |
| 4 | When to use | `When to Use` |
| 5 | When not to use | `When Not to Use` |
| 6 | Prerequisites | `Prerequisites` |
| 7 | Supported versions | Required content in `Prerequisites` (version range or "current stable as of DATE" + release-notes link), per the Phase 3 version-metadata decision |
| 8 | Official documentation | `Official Documentation` |
| 9 | Required workflow | `Required Workflow` |
| 10 | Architecture guidance | `Implementation Standards` (subsection where applicable) |
| 11 | Implementation standards | `Implementation Standards` |
| 12 | Security requirements | `Security Considerations` |
| 13 | Performance requirements | `Performance Considerations` |
| 14 | Accessibility requirements | `Implementation Standards` subsection where applicable (frontend/media/content/metadata skills); other skills state N/A with a reason |
| 15 | Testing strategy | `Implementation Standards` subsection (how the work the skill produces is tested) |
| 16 | Common mistakes | `Common Mistakes` |
| 17 | Correct examples | `Examples` |
| 18 | Incorrect examples | `Examples` (counter-examples) and/or `Common Mistakes` (mistake → correction pairs) |
| 19 | Validation checklist | `Validation Checklist` |
| 20 | Expected deliverables | `Expected Deliverables` |
| 21 | References | `References` |
| 22 | Last verified date | Frontmatter `metadata.last_verified` |

The scorer checks the mappable elements mechanically (section
presence, version-info patterns, accessibility/testing mentions where
applicable, counter-example presence) and reports the rest as
human-review dimensions. If a future phase wants dedicated sections,
it can add them with a validator update and a migration — the scorer
makes the gap visible first.
