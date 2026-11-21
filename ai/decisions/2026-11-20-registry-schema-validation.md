# Decision: JSON Schema files + a zero-dependency subset validator

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 9
- **Context:** Finding M-10 (`ai/audits/INITIAL-AUDIT.md`): no schema
  validation exists for any registry file. The repository policy is
  zero npm dependencies, so an off-the-shelf JSON Schema validator
  (ajv) is not available.

## Options considered

1. **Hand-rolled checks only, no schema files.** Works, but the
   schema lives only in code; consumers cannot read the contract.
2. **JSON Schema files + a subset validator (chosen).** Schema
   documents in `registry/schemas/` are the readable contract;
   `scripts/validate-registry.mjs` implements the JSON Schema
   subset those files use (type, required, properties, items,
   enum, additionalProperties, minItems) and validates every
   registry file against its schema, then runs semantic checks
   schemas cannot express (references resolve, paths exist on
   disk, names unique, coverage complete).
3. **Adopt ajv.** Full JSON Schema support, but breaks the
   zero-dependency policy for a problem the subset covers.

## Decision

Option 2. Rules for schema authors: use only the supported subset
(listed in the validator's header comment); the validator fails
loudly on an unsupported keyword so a schema can never silently
outgrow the validator.

The same phase also externalizes hardcoded generator data
(findings L-06, L-07):

- `KNOWN_SOURCES` → `scripts/lib/registry-sources.json`
- `CATEGORY_DESCRIPTIONS` → `scripts/lib/category-descriptions.json`
  (also fixes the empty descriptions for the `ai-engineering` and
  `desktop` categories added in Phase 4)
- `TARGET_TREE` (report generator) →
  `scripts/lib/target-tree.json`, extended from the 177-skill v1
  plan to all 228 original skills (v1 plan + the 51 Phase 4
  additions), so report coverage stays meaningful.

## Consequences

- `npm run check:registry` is the single registry gate: schema +
  semantics + verification-status coverage + audit-table
  cross-check.
- Adding a vendor, category, or planned skill is now a data-file
  edit, not a generator edit.
