# Decision: one canonical home per documentation topic

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 11
- **Context:** The production upgrade added new tooling (query CLI,
  scorer, evals, upstream monitoring, CI workflows) and new counts
  everywhere. Without a rule, every guide would restate install
  commands, counts, and safety rules, and the copies would drift —
  the stale "226 skills" and v1.0.0 path notes fixed in Phase 11 are
  exactly that failure mode.

## Decision

Each topic has exactly one canonical home. Other pages cross-link to
it and state at most one sentence of summary:

| Topic | Canonical home |
| --- | --- |
| Install/update/uninstall mechanics + safety rules | `docs/INSTALLATION.md` |
| Upgrading from v1.0.0 | `docs/UPGRADE.md` |
| Agent paths and compatibility | `docs/AGENT-COMPATIBILITY.md` |
| Skill format, quality standard, scoring | `docs/SKILL-STANDARDS.md` |
| Behavioral evals | `evals/README.md` (summarized in `docs/EVALUATION.md`) |
| Security scanner | `docs/SECURITY-SCANNING.md` |
| Threat model | `docs/THREAT-MODEL.md` |
| Vulnerability reporting | `SECURITY.md` |
| Update/re-verify/versioning process | `docs/UPDATE-PROCESS.md` |
| Architecture, registry, validation pipeline, CI | `docs/ARCHITECTURE.md` |
| Troubleshooting | `docs/TROUBLESHOOTING.md` (installer detail stays in `docs/INSTALLATION.md`) |
| Contributing | `CONTRIBUTING.md` |
| Counts (skills, categories, agents, workflows, status split) | `registry/*.json`, surfaced by `npm run query` |

`docs/README.md` is the index of canonical homes. The root `README.md`
is an overview: it states counts and links to the guides, and does not
restate procedures.

## Consequences

- New documentation must pick a canonical home first; a second copy
  of a procedure is a review failure, not a convenience.
- Counts are stated in `README.md` and `docs/ARCHITECTURE.md` only,
  and both must be re-verified against the registry on any change.
  Other pages say "277 skills" only where the number is load-bearing
  (e.g. the installer example) and otherwise link to the registry.
- `docs/CONTRIBUTING.md` and `docs/SECURITY.md` remain thin pointers
  to the root files, per the existing pattern; `docs/EVALUATION.md`
  follows the same pattern for `evals/README.md`.
