# Phase 7 — Security verification upgrade: notes

Backfilled 2026-11-20 (remediation Stage E, issue A-22). This
directory held no tracked files; this note points at where the
phase's evidence actually lives. Every fact below is traceable to
the cited sources; nothing here is a new claim.

Date: 2026-11-20. Branch: `feat/skillforge-production-upgrade`.
Status: Verified (`ai/PROJECT-STATUS.md`, Phase 7 row).
Scope: audit finding M-02 (`ai/audits/INITIAL-AUDIT.md`).

## What the phase did

Expanded the security scanner from 7 to 29 patterns
(`scripts/security-scan.mjs`, `npm run check:security`), adding
multi-line curl-pipe detection and a byte-level secret scan over
binaries; consolidated patterns into the shared library
(`scripts/lib/security-patterns.mjs`) used by the scanner, the
quality scorer, and the eval mock agent; added 22 security tests;
verified the supply chain (all 6 upstream import commits and
licenses re-checked against the public GitHub API); strengthened
`SECURITY.md` and added `docs/SECURITY-SCANNING.md` and
`docs/THREAT-MODEL.md`; wrote the security audit (findings
S-01–S-15).

## Where the evidence lives

- **Commit:** `2160b8e` ("Phase 7: security verification upgrade").
- **Audit:** `ai/audits/SECURITY-AUDIT.md` — S-01–S-15: 7 fixed,
  4 accepted upstream, 3 unresolved upstream, 1 open.
- **Results:** `ai/test-results/phase7-security-results.json` —
  scanner PASS (971 text files + 4 binary files, 0 findings after
  triage; first expanded run had 96 findings, reduced by pattern
  guards/fixes and triage), 22/22 security tests, full suite
  96/96, evals 449/449, full validation set PASS, supply-chain
  table for all 6 vendors.
- **Decision:** `ai/decisions/2026-11-20-security-patterns-shared-lib.md`.
- **Summary:** final report §9 and the Phase 7 row of
  `ai/PROJECT-STATUS.md`.

## Recorded outcome

No live credentials, no malicious code found. M-02 fixed; L-10
resolved (agentic-seo: MONITOR, re-verify source at next update
— S-14). Recorded limitations: Semgrep, Gitleaks, TruffleHog,
and CodeQL were not installed locally and never ran; S-08 (High),
S-09/S-11 (Medium) remain unresolved upstream; GitHub-side
scanning settings are manual repo settings.
