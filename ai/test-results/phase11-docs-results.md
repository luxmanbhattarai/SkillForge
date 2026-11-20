# Phase 11 — Documentation and DX: verification results

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Work by the Phase 11 delegate; reviewed and verified by the Wave 4
coordinator (this file records the coordinator's checks; the
delegate's own notes are in `ai/phase11/NOTES.md`).

## What changed

- README, AGENTS.md, CONTRIBUTING.md, CHANGELOG rewritten for the
  upgraded library (277 skills, 18 categories, 24 agents, 16
  workflows; honest verification-status wording — never claims all
  skills are verified).
- New: docs/UPGRADE.md, docs/TROUBLESHOOTING.md, docs/EVALUATION.md
  (summary; evals/README.md stays canonical), docs/README.md
  (canonical-home index).
- Rewritten: docs/ARCHITECTURE.md (categories, registry, validation
  layer, installer, CI). Updated: INSTALLATION, SECURITY-SCANNING,
  THREAT-MODEL, UPDATE-PROCESS, AGENT-COMPATIBILITY, SKILL-STANDARDS
  (L-05 parser subset), SECURITY.md (touch-up).
- L-05 fixed (frontmatter parser subset documented from
  scripts/lib/frontmatter.mjs). L-08 fixed by the coordinator
  (empty `.claude/settings.json` deleted — a no-op file, referenced
  nowhere). L-09 fixed (stale counts corrected; remaining "226"
  mentions are intentional history).
- No skill authoring guide or security guide file was created:
  SKILL-STANDARDS.md and SECURITY-SCANNING.md/THREAT-MODEL.md/
  SECURITY.md already own those topics (canonical-home rule).

## Coordinator verification (all 2026-11-20)

| Check | Result |
| --- | --- |
| Scope | All changes within allowed paths (root docs, docs/, ai/decisions/, ai/phase11/); no code/registry/skills touched |
| `npm run check:links` (offline, re-run by coordinator) | PASS — 73 internal links, 0 broken |
| Anchors (check-links strips fragments, so verified by hand) | All valid: `#validation-and-ci`, `#option-2--skills-cli` (em-dash slug), `#re-verifying-original-skills`, `#frontmatter-parser-subset`, `#handling-a-finding`, `#quality-scoring`, `#updating-upstream-imports`, `#safety`, `#updating`, `#troubleshooting` |
| Category counts in ARCHITECTURE.md | Match `npm run query -- categories` exactly (sum 277) |
| Verification split 204/16/6/51 | Matches `npm run query -- status` |
| L-05 parser-subset claims | Spot-checked against scripts/lib/frontmatter.mjs (key regex `[A-Za-z0-9_-]+`, nested-map pattern) — accurate |
| README "validate checks registry" | Confirmed in scripts/validate-skills.mjs (registry-consistency block) |
| CONTRIBUTING example commands | All exist (`--filter` on validate/score, `evals:generate`, `query -- show`); pre-PR chain references only real scripts |
| Evals runner flags in EVALUATION.md | Confirmed in evals/runners/run-evals.mjs (`--cases`, `--report-only`, `--provider`, `--save-baseline`) |
| `npm test` | 124/124 pass (run by the delegate to verify the cited count) |

## Finding handed to Phase 12 (real defect, not a docs issue)

While reviewing the ARCHITECTURE.md validation table, the
coordinator found that **`npm run validate:strict` fails** (exit 1)
because `--strict` fails on ALL warnings, and the 5 current warnings
are all upstream-only (unfixable by the verbatim-import policy).
Consequences:

- `release.yml` (Phase 10) runs `validate:strict`, so release
  validation can never pass as committed.
- `ai/test-results/phase10-ci-results.md` wrongly records
  validate:strict as "PASS, exit 0" — the coordinator measured the
  exit code of a `tail` pipeline, not of the validator. That file
  must be corrected in Phase 12.

Fix planned for Phase 12: make `--strict` fail only on
non-upstream warnings (consistent with the validator's two-profile
design), update the ARCHITECTURE.md and TROUBLESHOOTING.md strict
wording, correct the Phase 10 results file, and add a test.

## Not re-verified in this phase (open for Phase 12)

- Skills CLI sandbox verification (`npx skills add`) ran at 226
  skills; INSTALLATION.md notes re-verification is open at 277.
- Evals 449/449 cited from Phases 6/9 (verified there); not re-run
  in Phase 11 — Phase 12 re-runs the full battery.
- Vercel 4-behind drift cited from ai/phase10/NOTES.md (dated
  2026-11-20); `check:upstream` not re-run in Phase 11.
