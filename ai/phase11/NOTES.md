# Phase 11 — Documentation and developer experience: notes

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`
(head 75ef701 at start). Addresses audit findings L-05, L-08, L-09
(`ai/audits/INITIAL-AUDIT.md`). No commits made — all changes left
uncommitted for the coordinator to review and commit.

## What changed per file

### Root docs (rewritten or heavily updated)

- `README.md` — rewritten. Headline counts now 277 skills (228
  original + 49 upstream), 18 categories, 24 agents, 16 workflows;
  new verification-status table (204 / 16 / 6 / 51) with honest
  wording; query CLI examples; updating/uninstalling section; full
  validation/scoring/eval command list; security-model summary;
  docs table. Tree updated with `ai-engineering` and `desktop`.
- `AGENTS.md` — discovery rules kept intact; added rule 7 (check
  per-skill verification status), query CLI commands in rule 2,
  registry files (`agents.json`, `workflows.json`,
  `categories.json`) and `sources/verification-status.json` in the
  layout block, counts (277 / 18 / 24 / 16), and a note that 6
  upstream skills are `needs-correction`.
- `CONTRIBUTING.md` — added a worked end-to-end example (adding a
  fictional `acme` skill: template, frontmatter, validate, score,
  security scan, eval coverage, registry regen, query check, tests);
  added score + eval steps to the numbered flow; agents/workflows
  section now documents `npm run check:agents` and the no-frontmatter
  rule; PR process now lists the full pre-PR check command and the
  real CI suite. Every example command was verified to exist
  (`--filter` on validate/score, `npm run evals:generate`,
  `npm run query -- show`).
- `CHANGELOG.md` — new `Unreleased (feat/skillforge-production-upgrade)`
  entry summarizing Waves 1–4 from `ai/PROJECT-STATUS.md` (Added /
  Changed / Fixed / Known limitations). No version number invented.
- `SECURITY.md` — small touch-up only: upstream drift monitoring
  bullet + CI/CodeQL bullet noting the manual repo settings still to
  enable and that no workflow has run on GitHub yet.

### docs/ (updated)

- `docs/ARCHITECTURE.md` — rewritten/expanded: layout with new
  counts, 18-category table with per-category counts, registry file
  table (7 files) with determinism / status semantics / related
  derivation / schemas, full validation-layer table (14 commands),
  installer module table, evals and scanner architecture, CI
  workflow table.
- `docs/SKILL-STANDARDS.md` — added "Frontmatter parser subset"
  section (L-05), stated exactly from `scripts/lib/frontmatter.mjs`.
- `docs/INSTALLATION.md` — L-09: four "226 skills" → 277. The
  Skills CLI sandbox paragraph now says the verification ran when
  the library held 226 skills and flags re-verification as open.
  Removed the stale note claiming `AGENT-COMPATIBILITY.md` still
  lists v1.0.0 paths (it does not — it was already updated).
- `docs/SECURITY-SCANNING.md` — "Tools not available locally"
  updated: CodeQL now runs via workflow; secret scanning /
  Dependabot alerts are manual settings still to enable; no workflow
  has run yet.
- `docs/THREAT-MODEL.md` — three small updates: secret scanning is
  a manual setting still to enable (was "recommended for Phase 10");
  upstream drift is monitored weekly by CI (was "not monitored
  continuously"); supply-chain mitigations mention drift monitoring.
- `docs/UPDATE-PROCESS.md` — step 1 of upstream updates now names
  `npm run check:upstream`; stale-skill step now names
  `npm run query -- stale --days 180`.
- `docs/AGENT-COMPATIBILITY.md` — added "Compatibility data" section
  (`registry/compatibility.json`, `npm run query -- compat`).
  Paths were already current; no changes needed there.

### docs/ (new)

- `docs/README.md` — index of canonical homes (see the
  canonical-homes decision).
- `docs/UPGRADE.md` — upgrade guide: upgrading installed skills,
  v1.0.0 migration (path changes, installer behavior, registry,
  content), upgrading the checkout itself.
- `docs/TROUBLESHOOTING.md` — troubleshooting: skill not appearing,
  validate/registry/links/security/score/evals/query/upstream
  failures. Installer detail stays in `INSTALLATION.md`.
- `docs/EVALUATION.md` — short summary + pointer; canonical guide
  remains `evals/README.md` (same pattern as `docs/CONTRIBUTING.md`
  and `docs/SECURITY.md`).

### ai/ (new)

- `ai/decisions/2026-11-20-docs-canonical-homes.md` — one canonical
  home per topic, cross-link the rest.
- `ai/decisions/2026-11-20-frontmatter-parser-subset.md` — L-05:
  document the subset, keep the hand-rolled parser (zero-dep policy).
- `ai/decisions/2026-11-20-claude-settings-empty.md` — L-08:
  investigation + recommendation to remove (coordinator decides).
- `ai/decisions/2026-11-20-category-count-wording.md` — L-09:
  wording rule + open Skills CLI re-verification item.
- `ai/decisions/2026-11-20-verification-status-wording.md` — honest
  verification wording; never claim all 277 skills are verified.
- `ai/phase11/NOTES.md` — this file.

## Counts verified (how)

All verified 2026-11-20 during this phase, not from memory:

- 277 skills (228 original + 49 upstream), 18 categories:
  `registry/skills.json` (`total_skills`, `categories` length,
  `source_type` count) + `npm run query -- categories` (per-category
  counts sum to 277).
- Verification split 204 / 16 / 6 / 51: `npm run query -- status`
  (re-run at end of phase) + `sources/verification-status.json`
  status counter.
- 24 agents, 16 workflows: `registry/agents.json` /
  `registry/workflows.json` + `ls agents/ workflows/`.
- 449 eval cases (172 hand-written + 277 generated): counted JSON
  case files in `evals/cases/` (172 across 14 files) and
  `evals/datasets/discovery-generated.json` (277). 449/449 passing
  is from `ai/PROJECT-STATUS.md` (Phases 6/9) — `npm run evals` was
  NOT re-run in this phase (out of scope for a docs phase).
- 124 unit tests, all passing: `npm test` run 2026-11-20
  (124 pass, 0 fail).
- Quality score mean 87/100, testing dimension mean 37:
  `npm run score` output (read-only run).
- npm scripts: read from `package.json` (18 scripts, matches the
  brief).
- 6 CI workflows: `ls .github/workflows/` (validate-skills, lint,
  security-audit, codeql, scheduled-maintenance, release).
- 8 JSON Schemas: `ls scripts/schemas/`.
- Upstream vendors 8/8/13/11/8/1: `README.md` table (v1.0.0,
  unchanged by the upgrade) cross-checked against
  `registry/skills.json` upstream count (49).

## Audit findings in scope

- **L-05 (fixed):** frontmatter parser subset documented in
  `docs/SKILL-STANDARDS.md`, derived from reading
  `scripts/lib/frontmatter.mjs` (not guessed). Decision file
  records why the parser stays hand-rolled.
- **L-08 (investigated, not modified):** `.claude/settings.json`
  is exactly `{"permissions":{}}` (18 bytes), added in commit
  `525eeaa` (v1.0.0 snapshot), referenced nowhere in the repo
  (repo-wide grep), written by no script, and a functional no-op.
  Recommendation: delete it. Phase 11 did not touch `.claude/`
  (out of scope) — coordinator decides. Full investigation in
  `ai/decisions/2026-11-20-claude-settings-empty.md`.
- **L-09 (fixed):** README, ARCHITECTURE, INSTALLATION updated to
  277 skills / 18 categories. Remaining "226"/"15 categories"
  occurrences are intentional historical references: the
  CHANGELOG v1.0.0 entry, `docs/UPGRADE.md` "was" notes, the
  INSTALLATION Skills CLI sandbox note, and older `ai/decisions/`
  files (historical records, untouched).

## Checks run

- `npm run check:links` (offline): **PASS** — 73 internal links
  checked, 0 broken; 609 unique external URLs listed (not fetched).
  No broken links introduced.
- `npm run check:frontmatter`: not run — no `SKILL.md` touched.
- `npm run registry` / `npm run report` / `npm run evals`: NOT run
  (per task instructions; generated files untouched).
- `npm test`: 124/124 pass (run to verify the count cited in docs).
- Anchor links (`#...`) are not validated by check-links (it strips
  fragments); all anchors used were hand-checked against their
  target headings.

## Unverified items / deliberately left out

- **Skills CLI re-verification:** the sandbox verification
  (`npx skills add`, "discovers all skills") was run when the
  library held 226 skills. The docs now say 277 with a note that
  re-verification is open. Phase 12 should re-run it or drop the
  claim.
- **Eval suite passing:** 449/449 passing is cited from
  `ai/PROJECT-STATUS.md` (Phases 6 and 9 verified it); not re-run
  in Phase 11.
- **Upstream drift:** Vercel 4 commits behind (live 2026-11-20)
  is cited from `ai/phase10/NOTES.md`; `npm run check:upstream`
  was not re-run (network call, and the figure is dated in the
  docs).
- **No new "skill authoring guide" file:** `docs/SKILL-STANDARDS.md`
  already is the authoring guide; creating a parallel one would
  violate the canonical-home rule. Same for a security guide
  (`SECURITY-SCANNING.md` + `THREAT-MODEL.md` + `SECURITY.md`
  already cover it) and an evaluation guide (`evals/README.md` is
  canonical; `docs/EVALUATION.md` is a summary + pointer).
- **`.claude/settings.json`:** not modified (out of scope);
  recommendation recorded, coordinator decides.
- **No version number** for the upgrade branch was invented; the
  changelog entry is labeled
  "Unreleased (feat/skillforge-production-upgrade)".
