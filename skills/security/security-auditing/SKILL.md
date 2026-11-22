---
name: security-auditing
description: >
  Run a structured security audit of a web application: scope the
  review, test for common vulnerabilities, triage findings by risk,
  and produce a report with fixes. Use when auditing a codebase or a
  deployment, preparing for a penetration test, or following up on a
  security incident.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Security Auditing

## Purpose

A security audit is a structured review of an application for
vulnerabilities, misconfigurations, and unsafe practices — before an
attacker finds them. This skill covers scoping the audit, reviewing
code and configuration, testing the running application, triaging
findings by risk, and writing a report the team can act on. It
complements, but does not replace, a professional penetration test.

## When to Use

- Auditing a codebase, API, or deployment for security issues.
- Preparing for a penetration test or a compliance review.
- Following up on a security incident or a vulnerability report.
- Reviewing a significant change: new auth, new data handling, new
  integrations.
- Running a periodic security review of a production system.
- Triaging findings from automated scanners into actionable work.

## When Not to Use

- Fixing one specific vulnerability class in depth — use the focused
  skill: `xss-prevention`, `sql-injection-prevention`,
  `csrf-protection`, `secrets-management`, or `dependency-security`.
- Testing systems you do not own or have no authorization to test.
- Treating an audit as a guarantee; an audit finds what it looks for
  and can miss what it does not.

## Prerequisites

- Written authorization to audit the target systems.
- Access to the source code, dependency list, configuration, and a
  test or staging deployment.
- A test environment where attacks can be attempted safely; never
  audit against production with active testing.
- Familiarity with the OWASP Top 10 and the focused security skills
  in this repository.

## Official Documentation

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) —
  testing methodology.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the
  critical risks list; the 2025 edition is current (finalized
  January 2026).
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  defensive guidance per topic.
- [OWASP ZAP](https://www.zaproxy.org/) — dynamic application
  security testing.
- [Semgrep](https://semgrep.dev/) — static analysis for code.
- [CodeQL](https://codeql.github.com/) — static analysis for code.

## Required Workflow

1. Define the scope in writing: which applications, endpoints, and
   environments are in scope, what testing is permitted, and what is
   explicitly out of scope.
2. Gather context: architecture, data flows, trust boundaries,
   authentication model, third-party integrations, and prior audit
   findings.
3. Run automated checks first: dependency audit, static analysis,
   secret scanning, and header checks. Triage the output before
   manual work.
4. Review code manually in the highest-risk areas: authentication,
   authorization, input handling, database queries, file handling,
   and cryptography.
5. Test the running application in a test environment: attempt
   common attacks (injection, XSS, CSRF, broken access control,
   authentication bypass) against the areas the code review flagged.
6. Verify each suspected finding: confirm it is real, determine the
   impact, and reproduce it reliably before reporting it.
7. Triage findings by risk: impact times exploitability, with
   evidence for each rating. Separate confirmed findings from
   observations and hardening suggestions.
8. Write the report: one entry per finding with location, evidence,
   impact, and a concrete fix referencing the focused skill.
9. Verify fixes by re-testing after the team remediates, and record
   the re-test result.

## Implementation Standards

- Scope and authorization are agreed in writing before any active
  testing begins.
- Every finding has: a title, severity, affected location, evidence
  (request, response, or code excerpt), impact, and a concrete fix.
- Findings are verified by reproduction, not by scanner output alone;
  unconfirmed scanner output is reported as unconfirmed.
- Severity reflects impact and exploitability in this application's
  context, not a generic rating.
- No destructive testing (deleting data, denial of service, or
  resource exhaustion) without explicit agreement.
- Test accounts and test data only; no real user data is accessed or
  modified.
- Credentials discovered during the audit are reported through a
  secure channel and rotated; they are never included in the report.
- The report distinguishes confirmed vulnerabilities, hardening
  suggestions, and items checked and found clean.

## Best Practices

- Start with the highest-risk areas: auth, access control, and data
  handling, where the impact of a flaw is greatest.
- Use the OWASP Web Security Testing Guide as the checklist so
  coverage is systematic rather than ad hoc.
- Automate what can be automated (dependency, static, header, secret
  scans) and spend human time on logic flaws automation cannot see.
- Track findings to closure: an audit whose fixes are never verified
  is only half done.
- Keep the report factual and fixable; a finding without a clear fix
  is a burden, not a help.
- Re-audit after significant changes; security is a property of the
  current system, not a past achievement.

## Security Considerations

- Auditing without authorization is unlawful in many jurisdictions
  and can cause harm; always confirm scope and permission first.
- Handle findings as sensitive information: share the report only
  with the people who need to fix the issues.
- Do not include working exploit code for a live system in a
  broadly shared report; describe the attack and the fix.
- Clean up test data and test accounts created during the audit.
- Store audit evidence (requests, screenshots) securely and delete
  it when no longer needed.

## Performance Considerations

- Active scanning and fuzzing generate load; run them against test
  environments, and rate-limit scans against shared staging systems.
- Static analysis and dependency scans are cheap; run them in CI on
  every change.
- Keep the audit's own tooling out of the production artifact.

## Common Mistakes

- Reporting scanner output without verification — false positives
  waste the team's time and erode trust in the audit.
- Auditing only the code and never testing the running application,
  or vice versa.
- Rating severity by scanner default instead of by impact in context.
- Finding a vulnerability and stopping — the same pattern usually
  exists elsewhere in the codebase.
- Writing findings without a concrete fix.
- Auditing production with active tests and causing an outage.
- Treating a clean audit as proof of security.

## Examples

```text
Finding entry format:

Title: SQL injection in product search
Severity: Critical
Location: src/routes/products.ts, search handler
Evidence: request parameter q=...' OR '1'='1 returned all products.
Impact: an unauthenticated attacker can read arbitrary database
  content through the search endpoint.
Fix: parameterize the query; see `sql-injection-prevention`.
  Add a regression test with the reported payload.
Status: confirmed, awaiting fix.
```

```text
Audit scope statement (agree in writing before testing):

In scope: the web application at staging.example.com, its API, and
the repository at <repo>.
Out of scope: production systems, third-party services, social
engineering, physical security.
Permitted: authenticated and unauthenticated testing with test
accounts; automated scanning at moderate rate.
Not permitted: denial-of-service testing, data deletion, testing
outside the listed systems.
```

```text
Audit checklist (areas to cover):
- Authentication: login, sessions, password reset, MFA.
- Authorization: role checks on every protected route and API.
- Input handling: injection, XSS, file upload, SSRF.
- Data protection: secrets, encryption, logging of sensitive data.
- Configuration: headers, error handling, debug endpoints.
- Dependencies: known vulnerabilities in the tree.
- Third parties: webhooks, integrations, and their secrets.
```

## Validation Checklist

- [ ] Scope and authorization are agreed in writing before testing.
- [ ] Automated scans (dependencies, static analysis, secrets,
      headers) were run and triaged.
- [ ] Manual review covered auth, authorization, input handling,
      and data protection.
- [ ] The running application was tested in a test environment.
- [ ] Every finding is verified, with evidence, impact, and a
      concrete fix.
- [ ] Findings are triaged by risk with context-specific severity.
- [ ] The report separates confirmed findings from observations and
      clean checks.
- [ ] A re-test is planned or completed for fixed findings.

## Expected Deliverables

- A written audit scope statement.
- The audit report: findings with severity, location, evidence,
  impact, and fix, plus clean checks and observations.
- Re-test results for remediated findings.
- Recommendations for ongoing controls (scanning in CI, review
  cadence) to prevent recurrence.

## References

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) —
  testing methodology.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the
  critical risks list; the 2025 edition is current.
- [OWASP ZAP](https://www.zaproxy.org/) — dynamic testing.
- [Semgrep](https://semgrep.dev/) — static analysis.
- Related skills in this repository: `owasp`, `xss-prevention`,
  `sql-injection-prevention`, `csrf-protection`,
  `secrets-management`, `dependency-security`, `secure-headers`,
  `regression-testing`.
