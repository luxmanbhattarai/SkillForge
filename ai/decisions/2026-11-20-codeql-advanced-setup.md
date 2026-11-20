# Decision: CodeQL advanced setup via workflow file

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 10
- **Context:** Phase 7 security audit
  (`ai/audits/SECURITY-AUDIT.md`) recommended adding CodeQL to CI.
  GitHub offers two ways to run CodeQL: "default setup" (a repo
  setting, no workflow file) and "advanced setup" (a workflow file
  using `github/codeql-action/*`). The two configurations conflict
  and must not both be enabled.

## Options considered

1. **Default setup (repo setting).** Zero files to maintain;
   GitHub manages the CodeQL version and schedule. Downsides: the
   configuration lives outside the repo (not version-controlled,
   not reviewable in a PR), the CodeQL action version is not
   pinnable, and the schedule cannot be staggered against the
   other weekly jobs.
2. **Advanced setup via `.github/workflows/codeql.yml` (chosen).**
   The workflow file pins `github/codeql-action` to a reviewed
   commit SHA (consistent with the M-04 pinning rule applied to
   every other action), keeps the language list and schedule in
   version control, and lets the weekly run be staggered
   (Thursday 06:30 UTC) from the Monday security/maintenance
   jobs.

## Decision

Option 2. `.github/workflows/codeql.yml` runs `init` + `analyze`
for `javascript-typescript` on push/PR to `main` and weekly. No
autobuild step: JavaScript/TypeScript analysis needs no build.
Permissions are the standard CodeQL least-privilege set
(`contents: read`, `security-events: write`, `actions: read`).

## Consequences

- **Do not enable CodeQL default setup** in repo settings while
  this workflow exists. If default setup is already on, turn it
  off when this workflow lands — or delete the workflow and keep
  default setup. Pick one; see `ai/phase10/NOTES.md` (manual
  repo-setting steps).
- Dependabot (`github-actions` ecosystem) will propose PRs when
  a new `codeql-action` release lands; review and merge to stay
  current.
- CodeQL runs only on GitHub; it is not installed locally and
  was not run during Phase 10.
