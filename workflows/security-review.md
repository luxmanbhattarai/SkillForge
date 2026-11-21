# Security Review

Review a system for security weaknesses — threat model, auth,
secrets, and vulnerability patterns — and produce prioritized
findings with fixes. This workflow is security-only and deeper than
the security step in `workflows/code-audit.md`; use the code audit
for general reviews.

## Inputs

- The system or change under review.
- The threat model or the assets worth protecting, if known.
- Previous findings or incidents, if any.

## Steps

1. **Define the scope and threat model** (`owasp`). Agree what is
   under review and what an attacker would target: user data,
   credentials, money movement, admin functions. A review without a
   threat model drifts into trivia.
2. **Map trust boundaries.** Find where untrusted input enters: HTTP
   requests, webhooks, file uploads, AI tool calls, third-party
   data. Every boundary needs validation.
3. **Review authentication and authorization** (`auth-security`,
   `authentication`). Check login, sessions, password handling, MFA,
   and — most importantly — whether authorization is enforced
   server-side on every protected action.
4. **Review input handling** (`xss-prevention`,
   `sql-injection-prevention`, `csrf-protection`). Check for
   injection, cross-site scripting, and CSRF at every boundary.
   Verify suspected issues against the actual code; never report a
   theoretical issue as confirmed.
5. **Review secrets** (`secrets-management`). Check for secrets in
   code, logs, responses, and configuration. Report any secret found
   privately — never paste it into the report.
6. **Review headers and transport** (`secure-headers`). Check TLS,
   HSTS, CSP, and cookie flags.
7. **Review AI and MCP surfaces** (`mcp-security`) when the system
   has them. Check prompt injection, tool poisoning, and secret
   exfiltration through tools.
8. **Review dependencies** (`dependency-management`). Check for known
   vulnerable or unmaintained dependencies.
9. **Rank findings.** Order by severity and exploitability. Each
   finding gets evidence (file and behavior), severity, and a
   concrete recommended fix. Unproven concerns are flagged as
   needing verification, not reported as findings.
10. **Verify fixes.** Re-check each fixed finding against the changed
    code. A fix is done when the evidence shows it, not when the
    author says so.

## Outputs

- Security review report with findings ranked by severity.
- Recommended fixes with owners.
- A list of what was checked and what was out of scope.

## Checks

- [ ] Every finding is backed by evidence from the code.
- [ ] No finding without a concrete recommended fix.
- [ ] Secrets found are reported privately, never pasted into the report.
- [ ] Authorization checked server-side, not just in the UI.
- [ ] Fixes verified against changed code, not taken on trust.
- [ ] Scope and limits are stated honestly.
