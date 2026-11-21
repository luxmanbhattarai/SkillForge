# Phase 2 — Installation system overhaul: notes

Backfilled 2026-11-20 (remediation Stage E, issue A-22). This
directory held no tracked files; this note points at where the
phase's evidence actually lives. Every fact below is traceable to
the cited sources; nothing here is a new claim.

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Status: Verified (`ai/PROJECT-STATUS.md`, Phase 2 row).
Scope: audit findings H-01, M-05, M-06, M-09
(`ai/audits/INITIAL-AUDIT.md`).

## What the phase did

Rebuilt the installer (`node scripts/install-skills.mjs`) from a
destructive copy script into a safe CLI: commands install, update,
list, doctor, validate, uninstall, restore (plus legacy no-command
invocation); conflict detection by hash; backups before
replacement; staging + swap installs; manifest tracking
(`.skillforge-manifest.json`); dry-run, `--force`, `--link`,
`--dest`. Codex and Antigravity install paths corrected to
`.agents/skills` against current vendor docs (M-06). The
`npx skills add` path was verified at 226 skills (M-09).

## Where the evidence lives

- **Commit:** `5229430` ("Phase 2: installation system overhaul
  (safe, reversible CLI)").
- **Test results:** `ai/test-results/phase2-installer-tests.txt` —
  `npm test`: 62 pass, 0 fail (61 real tests + the empty
  `test/helpers.mjs` file entry: 42 installer, 7 library,
  8 targets, 4 hashing). All tests run in temp sandboxes.
- **Decisions:** `ai/decisions/2026-11-20-installer-manifest-format.md`,
  `2026-11-20-installer-backup-location.md`,
  `2026-11-20-installer-target-paths.md`,
  `2026-11-20-installer-test-command.md`,
  `2026-11-20-installer-agent-workflow-support.md`,
  `2026-11-20-npx-skills-verification.md`.
- **Summary:** final report §7 and the Phase 2 row of
  `ai/PROJECT-STATUS.md`.

## Recorded outcome

Full safe CLI delivered; 62 tests passing; findings H-01, M-05,
M-06, M-09 fixed. Recorded limitation: the Windows `--link`
EPERM path was untested (no Windows runner) — see remediation
issues A-11 / L-Win.
