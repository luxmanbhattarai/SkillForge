# Phase 3 — Technical Accuracy Audit: batch plan

- **Scope:** all 226 skills (177 original + 49 upstream).
- **Method:** 10 parallel batches with disjoint directories. Batches do
  NOT commit; the coordinator validates, regenerates the registry, and
  commits centrally when all batches report.
- **Evidence hierarchy:** official product docs > official API refs >
  official GitHub repos/release notes > official migration guides >
  recognized standards > reputable secondary sources. Never treat AI
  content, blogs, or old tutorials as authoritative.
- **Dates:** `last_verified` is set only to the date the batch actually
  verified the skill. Never invent a date.
- **Version info:** supported version ranges go in the skill body
  (Prerequisites / Official Documentation sections), NOT in new
  frontmatter fields — see
  `ai/decisions/2026-11-20-phase3-version-metadata.md`.
- **Upstream:** audit-only, never edited (repo rule, reaffirmed in
  `ai/decisions/2026-11-20-upstream-verbatim.md`). Errors are recorded
  in the batch report and the audit, not fixed in place.
- **Status values (state AFTER the batch's work):** Verified /
  Verified with limitations / Needs correction / Unverified / Blocked.

## Batches

| # | Skills | Directories | Count |
| --- | --- | --- | --- |
| 1 | core + architecture | `skills/core/`, `skills/architecture/` | 20 |
| 2 | frontend | `skills/frontend/` | 16 |
| 3 | backend | `skills/backend/` | 13 |
| 4 | database | `skills/database/` | 14 |
| 5 | auth + security | `skills/auth/`, `skills/security/` | 18 |
| 6 | infrastructure + testing | `skills/infrastructure/`, `skills/testing/` | 21 |
| 7 | seo | `skills/seo/` | 27 |
| 8 | performance + metadata + documentation | `skills/performance/`, `skills/metadata/`, `skills/documentation/` | 19 |
| 9 | content + media | `skills/content/`, `skills/media/` | 29 |
| 10 | upstream (audit-only) | `skills/upstream/` | 49 |
| | **Total** | | **226** |

## Batch 2 special assignment

Batch 2 (frontend) owns audit finding H-04: verify the Next.js skill's
fetch-caching claim ("fetch requests in server components are cached
unless opted out") against current official Next.js documentation and
correct it, including the version boundary (Next.js 14 vs 15+) and the
correct opt-in mechanism.

## Per-batch deliverables

1. Fixes applied in the assigned skill directories (original skills
   only; upstream batch makes no edits).
2. `last_verified` updated to the actual verification date for every
   skill the batch verified.
3. Report file `ai/phase3/batch-N-report.md` with a per-skill table:
   skill, status, what was checked, what was fixed (or why not),
   sources used.
4. A report back to the coordinator with the same per-skill statuses.

## Coordinator close-out (after all batches report)

1. Run the full validation suite; fix any regression a batch
   introduced (do not weaken validators to pass).
2. Regenerate the registry (`npm run registry`) and report
   (`npm run report`).
3. Write `ai/audits/TECHNICAL-ACCURACY-AUDIT.md` with the full
   per-skill status table (226 rows) synthesized from batch reports.
4. Update `ai/PROJECT-STATUS.md`; commit audit + fixes.
