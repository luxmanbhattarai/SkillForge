# Decision: category-count wording (L-09)

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 11
- **Context:** Audit finding L-09 (`ai/audits/INITIAL-AUDIT.md`).
  The v1.0.0 README said "177 original skills across 15 categories"
  while the registry counted 16 categories (15 original + `upstream`).
  Both were true under different readings; the wording was easy to
  misread. Phase 4 added 2 categories (`ai-engineering`, `desktop`)
  and 51 skills, so every count in the docs went stale at once.

## Decision

One wording rule, applied everywhere:

- **"18 categories"** means the registry's category list, which
  counts `upstream` as a category: 17 original categories + `upstream`.
- **"277 skills (228 original + 49 upstream)"** is the full form.
  Where space is short, "277 skills" alone is acceptable only with
  the split nearby or linked.
- **"15 categories"** and **"226 skills"** are v1.0.0 numbers. They
  appear only in the CHANGELOG's v1.0.0 entry and in upgrade notes
  explicitly marked as "was".

Counts are verified against `registry/` (`npm run query --
categories`, `npm run query -- status`) before publication, never
written from memory. `docs/ARCHITECTURE.md` carries the per-category
table; `README.md` carries the headline counts; other pages link to
one of those rather than restating numbers.

## Changes made (Phase 11)

- `README.md`: 277 skills (228 original + 49 upstream), 18
  categories, 24 agents, 16 workflows; tree updated with
  `ai-engineering` and `desktop`.
- `docs/ARCHITECTURE.md`: per-category table with counts from
  `registry/categories.json` (verified via the query CLI).
- `docs/INSTALLATION.md`: four "226 skills" occurrences updated to
  277 (one is the Skills CLI sandbox verification — see below).
- `AGENTS.md`: counts added (277 / 18 / 24 / 16).

## Open item

The Skills CLI sandbox verification ("discovers all skills") was run
on 2026-11-20 when the library held 226 skills. The count in
`docs/INSTALLATION.md` now says 277, with a note that re-verification
against the expanded library is open. Phase 12 should re-run it or
drop the claim.
