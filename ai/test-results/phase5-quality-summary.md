# Phase 5 — Quality standard and scorer: results

- **Date:** 2026-11-20
- **Scorer:** `scripts/score-skills.mjs` (`npm run score`)
- **Raw results:** `ai/test-results/phase5-quality-scores.json`
  (before fix-up: `phase5-quality-scores-before-fixup.json`)

## What was delivered

- **22-element quality standard** in `docs/SKILL-STANDARDS.md`, mapped
  onto the existing 15 template sections (decision:
  `ai/decisions/2026-11-20-quality-standard-mapping.md`). No new
  required sections were added, so no 228-skill migration was needed.
- **Template update** (`templates/SKILL-TEMPLATE.md`): supported-versions
  line in Prerequisites, Testing Strategy and Accessibility subsections
  in Implementation Standards, counter-example guidance in Examples.
- **Quality scorer** (`scripts/score-skills.mjs`, wired as
  `npm run score`): 8 dimensions (accuracy-proxy, completeness,
  actionability, security, testing, documentation, versioning,
  maintainability), hard caps (security hit → 40, missing section →
  50, placeholder → 60), upstream skills excluded. Exit code 1 only
  when a skill is CRITICAL (security pattern hit).

## Scores (final, after fix-up rounds 1–2)

| Scope | Overall | Testing | Versioning | Flags |
| --- | --- | --- | --- | --- |
| All 228 original skills | 87/100 | 37 | 76 | 0 CRITICAL |
| 51 new Phase 4 skills | 96.8/100 | 92.5 | 100 | 0 |
| 51 new skills, before fix-up | 86.1/100 | 35.3 | 86.3 | 14 versioning, 4 a11y |

Fix-up round 1 (31 skills, `ai/phase4/scorer-fixup-report.md`):
Testing Strategy subsections added to 28 new skills, Prerequisites
version lines to 14, accessibility content to 4. All 31 re-validated
(31/31 PASS). Genuine gain +6.7 overall after adjusting for the
maintainability-curve change noted below.

Fix-up round 2 (23 skills, same report): Testing Strategy
subsections for the remaining 23 new skills, including the four that
scored 44 on testing (`mcp-security`, `clerk`, `pulumi`,
`terraform`, all now 100). All 23 re-validated (23/23 PASS). New
skills overall 94.9 → 96.8, testing 75.2 → 92.5. All 51 new skills
now have a Testing Strategy subsection; the lowest new-skill overall
score is 91 (`serp-monitoring`). 17 round-1 skills remain below
testing 100 (lowest `editorial-workflow` 48) because their genuine
QA vocabulary is audit/validate/cross-check — deliberately not
padded with the word "test".

## Honest limitations of the scorer

- **Accuracy is a proxy.** The accuracy dimension (mean 100) scores
  checkable signals only: no placeholders, no broken relative links,
  https links. It does not verify technical accuracy — only a human
  audit against official docs does that. Never present a scorer result
  as proof a skill's content is correct.
- **Testing counts the literal word "test".** Skills whose genuine QA
  vocabulary is audit/validate/cross-check (e.g. `editorial-workflow`,
  48 despite a real Testing Strategy subsection) score lower than
  their content deserves. Deliberately not padded with the word
  "test" to game the metric.
- **Versioning flags conceptual skills.** Skills with no versioned
  dependency (architecture concepts, content workflows) score lower
  on versioning; the standard's honest phrasing is "current stable
  as of DATE" for those.
- **Maintainability curve changed mid-phase.** The first run used a
  curve that scored a 400-line skill 50/100; it was softened to match
  the documented standard (full marks ≤350 lines, 50 at the 500-line
  limit, 0 above). Before/after overall comparisons were recomputed
  on the final curve (see the fix-up report).

## Remaining gaps (older skills — recorded, not mass-rewritten)

- **Testing (all-skills mean 37)** is the weakest dimension library-wide.
  177 pre-Phase-4 skills mostly lack Testing Strategy subsections.
  Fixing them is a future wave's work, not a Phase 5 rewrite.
- **Versioning (all-skills mean 76):** ~116 older skills lack version
  info in Prerequisites. Conceptual skills explain part of this; the
  rest is genuine staleness to address as skills are next touched.
- **Accessibility:** 24 older skills in applicable categories
  (frontend/media/content/metadata) carry accessibility flags.
- **Lowest overall scores (71–74):** mostly older content skills
  (`content-brief`, `fact-checking`, `faq-generation`,
  `keyword-to-content`, `content-localization`, `editorial-review`,
  `seo-content-writing`, `article-writing`, `blog-writing`) and
  `modular-monolith` — driven by testing + versioning, not by
  missing sections or security issues. No skill is below 70; no
  skill is CRITICAL.
