# Code Audit

Audit a codebase for correctness, security, maintainability, and
dependency health, and produce a prioritized findings report.

## Inputs

- The codebase to audit.
- Audit scope: whole repo, a subsystem, or a specific concern.
- Known pain points or recent incidents, if any.

## Steps

1. **Define the scope.** Agree what is in scope and what the audit
   should answer. A whole-repo audit and a focused audit need different
   depth.
2. **Review code quality** (`code-review`, `clean-code`). Read the code
   for correctness, clarity, duplication, and dead code. Verify
   suspected issues against the actual code.
3. **Review security** (`owasp`, `secrets-management`). Check input
   handling, auth boundaries, secrets, and dependencies for known
   unsafe patterns. Never exploit a vulnerability beyond confirming it.
4. **Review dependencies** (`dependency-management`). Check for
   unmaintained, duplicated, or unnecessarily risky dependencies.
5. **Review tests** (`unit-testing`, `regression-testing`). Check
   whether critical behavior is covered and whether the suite is
   trustworthy (no skipped tests, no flaky tests ignored).
6. **Review configuration and deployment** (`deployment`,
   `observability`). Check that the app can be built, deployed, and
   observed, and that configuration is not leaking secrets.
7. **Rank findings.** Order by severity and impact. Each finding gets
   evidence (file and behavior), severity, and a recommended fix.
8. **Write the report.** Separate blocking findings from improvements.
   State what was checked and what was out of scope.

## Outputs

- Audit report with findings ranked by severity.
- Recommended fixes with owners.
- A list of what was checked and what was not.

## Checks

- [ ] Every finding is backed by evidence from the code.
- [ ] No finding without a concrete recommended fix.
- [ ] Secrets found during the audit are reported privately, never
      pasted into the report.
- [ ] Scope and limits are stated honestly.
- [ ] No invented issues: unproven concerns are flagged as needing
      verification.
