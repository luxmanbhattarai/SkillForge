# Decision: verification status lives in a sidecar JSON file, not frontmatter

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 9
- **Context:** Audit finding M-01 (`ai/audits/INITIAL-AUDIT.md`).
  `scripts/generate-registry.mjs` hardcoded `status: 'verified'` for
  every skill, including 49 upstream imports never technically
  reviewed. Phase 3 produced real per-skill verification state (204
  Verified, 16 Verified with limitations, 6 Needs correction — see
  `ai/audits/TECHNICAL-ACCURACY-AUDIT.md`), but it lives in a Markdown
  table the generator cannot read. The 51 skills added in Phase 4
  were never through a formal accuracy audit.

## Options considered

1. **New frontmatter field** (e.g. `metadata.verification_status`).
   Machine-readable at the skill, but requires editing all 277
   SKILL.md files — including the 49 upstream skills, which the
   verbatim-import policy forbids editing. Rejected.
2. **Parse the audit Markdown table at generation time.** No new
   file, but couples the generator to a prose document's table
   format; a reworded heading breaks the build. Rejected.
3. **Sidecar JSON (chosen).** `sources/verification-status.json`
   maps every skill name to `{status, date, note?}`. The generator
   reads it; the audit doc remains the human-readable evidence.

## Decision

Option 3. Status values (kebab-case, validated by
`scripts/validate-registry.mjs`):

| Registry status | Meaning |
| --- | --- |
| `verified` | Passed the Phase 3 technical accuracy audit |
| `verified-with-limitations` | Passed with documented limitations (see `note`) |
| `needs-correction` | Audit found errors; fix venue is the upstream repo (all 6 are upstream) |
| `unverified` | No formal accuracy audit yet (the 51 Phase 4 skills) |

Rules:

- The generator defaults a skill missing from the file to
  `unverified` with a warning — never to `verified`. The validator
  errors on incomplete coverage, so the default is a safety net,
  not a silent path.
- `note` is present only where it carries limitation/correction
  evidence (the 22 non-verified audited skills) or explains the
  unverified state (Phase 4 skills). Full evidence stays in the
  audit doc.
- `date` is the date of the verification outcome, or `null` when
  there is none. It is distinct from frontmatter `last_verified`
  (the date a skill was last checked/written); for audited skills
  both are 2026-11-20.
- The validator cross-checks the sidecar against the audit table
  for the 226 audited skills, so the two records cannot drift
  silently.

## Consequences

- Registry `status` is now honest: 204 verified, 16
  verified-with-limitations, 6 needs-correction, 51 unverified.
- Re-auditing a skill means updating one JSON entry (plus the
  audit doc); no SKILL.md edit required.
- A new skill added without a sidecar entry is `unverified` and
  fails `npm run check:registry` until an entry is added.
