---
name: owasp
description: >
  Apply OWASP guidance to design, build, and review secure web
  applications. Use when assessing a project's security posture, working
  through the OWASP Top 10, using the Cheat Sheet Series or ASVS, or
  reviewing code for the most common web vulnerabilities.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# OWASP

## Purpose

OWASP (the Open Worldwide Application Security Project) publishes the
most widely used open guidance for web application security: the Top
10 list of most critical risks, the Cheat Sheet Series of defensive
patterns, and the Application Security Verification Standard (ASVS).
This skill teaches an agent to use those resources as the baseline for
building and reviewing secure applications, and to map findings to the
specific defensive skill that fixes them.

## When to Use

- Assessing the security posture of a web application or API.
- Reviewing code or a design for common vulnerabilities.
- Planning security work: deciding what to fix first.
- Writing or reviewing authentication, session, input handling, or
  cryptography code.
- Preparing for a security audit or penetration test.
- Learning which defensive pattern applies to a given risk.

## When Not to Use

- Fixing one specific vulnerability class in depth — use the focused
  skill instead: `xss-prevention`, `sql-injection-prevention`,
  `csrf-protection`, `secrets-management`, or `dependency-security`.
- Running a full audit engagement — use `security-auditing`.
- Non-web security domains (mobile, cloud infrastructure, network),
  where OWASP has separate projects not covered here.
- Treating OWASP guidance as a compliance certificate; it is a
  baseline, not a guarantee.

## Prerequisites

- A basic understanding of how web applications handle requests,
  sessions, and data.
- Access to the application code and its dependency list for review
  work.
- Familiarity with HTTP, cookies, and authentication concepts.

## Official Documentation

- [OWASP](https://owasp.org/) — the project home and index of all
  projects.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the most
  critical web application security risks.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  concise defensive guidance per topic.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) —
  the Application Security Verification Standard.
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) —
  testing methodology.

## Required Workflow

1. Identify the scope: the application, its entry points (pages, APIs,
   webhooks), its data (what is sensitive), and its trust boundaries.
2. Walk the OWASP Top 10 against the application, one category at a
   time, and note where each risk could apply.
3. For each applicable risk, check the corresponding Cheat Sheet for
   the recommended defense and verify whether the application
   implements it.
4. Rank findings by impact and exploitability, not by category order;
   a critical instance of a lower-ranked risk outranks a theoretical
   instance of a higher-ranked one.
5. Fix findings using the focused skill for that vulnerability class,
   or record the finding with its OWASP reference for the team.
6. Verify each fix with a test that demonstrates the attack no longer
   works (see `regression-testing`).
7. Re-check after significant changes: new endpoints, new
   dependencies, and new data handling all reopen the Top 10 review.

## Implementation Standards

- Defense in depth: never rely on a single control. Validate input,
  encode output, and enforce authorization at the server, even when
  the client also checks.
- Deny by default: endpoints, routes, and data access require
  explicit authorization; nothing is public unless deliberately so.
- Validate all input on the server, using allowlists (what is
  permitted) rather than denylists (what is forbidden).
- Encode output for its context (HTML, JavaScript, URL, SQL) instead
  of relying on input filtering alone.
- Use parameterized queries for all database access; never build SQL
  from string concatenation.
- Use established libraries for authentication, cryptography, and
  session handling; never implement custom cryptography or custom
  auth when a maintained option exists.
- Keep dependencies current and monitor for known vulnerabilities;
  see `dependency-security`.
- Log security-relevant events (logins, failures, privilege changes)
  without logging secrets or sensitive personal data.

## Best Practices

- Use the Cheat Sheet Series as the first stop for any defensive
  pattern; it is kept current by practitioners.
- Map each finding to its OWASP Top 10 category and its Cheat Sheet
  so the team shares one vocabulary.
- Apply ASVS Level 1 as a minimum baseline for any internet-facing
  application; higher levels apply where the data or exposure
  warrants it.
- Review new dependencies against the Top 10 before adopting them,
  not after an incident.
- Treat the Top 10 as a starting point: application-specific risks
  (business logic flaws, abuse of legitimate features) need threat
  modeling beyond the list.
- Revisit the Top 10 when a new version is published; the list
  changes as the threat landscape changes.

## Security Considerations

- OWASP guidance is a baseline, not a complete security program.
  Threat modeling, code review, and testing complement it.
- Do not test defenses against production systems or systems you do
  not own; use test environments.
- When reporting findings, describe the risk and the fix; do not
  include working exploit code against a live system.
- Keep the guidance version in mind: check the date and version of
  the Top 10 or Cheat Sheet you are citing.

## Performance Considerations

- Security controls have a cost: input validation, encoding, and
  logging add overhead. Measure it; the cost is almost always small
  compared with the risk of skipping the control.
- Prefer efficient, well-tested libraries over hand-rolled checks;
  they are both faster and more correct.
- Rate limiting and request-size limits protect availability as well
  as security.

## Common Mistakes

- Treating the Top 10 as a checklist to tick once — it is a lens for
  continuous review, not a one-time audit.
- Fixing the symptom (blocking one payload) instead of the cause
  (missing output encoding or parameterization).
- Validating input only on the client — client checks are a user
  experience feature, not a security control.
- Rolling custom authentication or cryptography instead of using
  maintained libraries.
- Ignoring the "boring" categories (logging, configuration, outdated
  components) in favor of dramatic injection flaws.
- Assuming a framework default is safe without verifying it for the
  project's configuration.

## Examples

```text
Top 10 review pass for a small web app (excerpt):
- Broken Access Control: /api/admin/* has no role check on two
  endpoints. Fix: enforce role authorization server-side on every
  admin route.
- Injection: search query is concatenated into SQL. Fix: parameterize
  the query (see `sql-injection-prevention`).
- Security Misconfiguration: verbose error pages leak stack traces.
  Fix: generic error responses in production; detailed logs
  server-side only.
- Vulnerable Components: one dependency has a known critical issue.
  Fix: upgrade (see `dependency-security`).
```

```text
Mapping a finding to its fix:
- Finding: user-supplied HTML rendered unescaped.
- Top 10 category: Injection (Cross-Site Scripting).
- Cheat Sheet: Cross-Site Scripting Prevention.
- Fix skill: `xss-prevention`.
- Verification: regression test asserting the payload renders as
  inert text.
```

## Validation Checklist

- [ ] Each OWASP Top 10 category was considered against the
      application's actual entry points and data.
- [ ] Findings are recorded with category, affected location, impact,
      and the recommended fix.
- [ ] Fixes follow the relevant Cheat Sheet guidance and the focused
      skill for that vulnerability class.
- [ ] Each fix has a regression test demonstrating the attack no
      longer works.
- [ ] Dependencies were checked for known vulnerabilities.
- [ ] No finding was dismissed without a written reason.

## Expected Deliverables

- A Top 10 review report: findings with category, location, impact,
  and fix, plus items checked and found clean.
- Fixed code following the focused skills, with regression tests.
- A list of residual risks that need threat modeling beyond the
  Top 10.
- References to the OWASP sources used, with their versions or dates.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the
  critical risks list.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  defensive patterns per topic.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) —
  verification standard.
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) —
  testing methodology.
- Related skills in this repository: `xss-prevention`,
  `sql-injection-prevention`, `csrf-protection`,
  `secrets-management`, `dependency-security`, `secure-headers`,
  `security-auditing`.
