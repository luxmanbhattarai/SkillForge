---
name: security
description: >
  Build and review software securely: threat modelling, input
  validation, authentication, secrets handling, and dependency safety.
  Use when handling user input, auth, payments, personal data, or any
  code that faces the internet. Covers OWASP Top 10, secure defaults,
  and the checks to run before shipping.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Security

## Purpose

This skill makes security a default part of building software, not an
afterthought. It provides a practical checklist — threat model, input
handling, authentication, secrets, dependencies — so that the code you
ship does not expose users, data, or infrastructure to preventable harm.

## When to Use

- Any code that handles user input, authentication, authorisation,
  payments, or personal data.
- Any feature exposed to the internet or to untrusted users.
- Reviewing a change that touches auth, sessions, file uploads, or
  third-party integrations.
- Choosing or adding a dependency, library, or service.
- Responding to a reported vulnerability or suspicious behaviour.

## When Not to Use

- For general code quality without a security angle — use `clean-code`
  or `code-review`.
- For performance work — use `performance`.
- For recording an architecture decision — use
  `technical-decision-records`.

## Prerequisites

- Knowledge of what data the system stores and who may access it.
- Access to the dependency list and the ability to run a vulnerability
  scan.
- A secret manager (or at minimum environment variables outside the
  repository) for all credentials.

## Official Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the ten
  most critical web application security risks.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  concise, actionable guidance per topic.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) —
  the standard for verifying application security controls.
- [CWE Top 25](https://cwe.mitre.org/top25/) — the most dangerous
  software weaknesses.

## Required Workflow

1. Threat-model the feature briefly: what assets exist, who the
   attackers are, and what the trust boundaries are.
2. List the data the feature handles and classify it: public, internal,
   sensitive, or regulated. Sensitive data gets the strictest handling.
3. Validate all input at the boundary: type, length, format, and range.
   Reject what does not match; never trust client-supplied data.
4. Enforce authorisation on every operation, server-side, for every
   request — not only in the UI.
5. Use parameterised queries and framework escaping for all database,
   command, and HTML output. Never build queries or markup by string
   concatenation with untrusted input.
6. Store secrets only in a secret manager or environment variables;
   never in code, config files, logs, or version control.
7. Use a maintained auth library or framework feature; do not roll
   custom authentication, password hashing, or cryptography.
8. Scan dependencies for known vulnerabilities before adding them and
   on a regular schedule.
9. Log security-relevant events (logins, failures, permission denials)
   without logging secrets or personal data.
10. Run the Validation Checklist before shipping.

## Implementation Standards

- Default deny: access is refused unless explicitly granted.
- Least privilege: every component, service, and account has only the
  permissions it needs.
- Defence in depth: do not rely on a single control; validate at the
  boundary and enforce at the data layer too.
- Passwords are hashed with a maintained, purpose-built password
  hashing function (such as Argon2 or bcrypt via a maintained library),
  never with a general-purpose hash and never in plain text.
- Sessions use server-side state or signed tokens from a maintained
  library, with secure, HttpOnly cookies and a sensible expiry.
- All traffic uses HTTPS; insecure transport is never acceptable for
  authenticated or sensitive data.
- Error messages reveal nothing about internals: no stack traces, no
  database details, no confirmation of whether an account exists.
- File uploads are validated by type and size, stored outside the web
  root, and never executed.

## Best Practices

- Keep the security surface small: fewer endpoints, fewer dependencies,
  fewer permissions.
- Update dependencies promptly when a vulnerability is disclosed.
- Use security headers provided by the framework (content security
  policy, frame options, strict transport security) and verify them.
- Separate secrets per environment; a development secret must never
  work in production.
- Treat internal services as untrusted too — insider and lateral-movement
  risks are real.
- Document security assumptions in the code or an ADR so the next
  developer does not silently remove a control.

## Security Considerations

- This skill is itself the security guidance; apply it to every other
  skill's work.
- The highest-risk areas are authentication, authorisation, input
  handling, and secrets — review these first and most carefully.
- When in doubt about a control, consult the OWASP Cheat Sheet for that
  topic rather than guessing.

## Performance Considerations

- Security controls have a cost (hashing, encryption, validation), but
  it is small compared with the cost of a breach. Do not weaken controls
  for speed without a measured justification.
- Rate limiting protects availability as well as security: limit login
  attempts, password resets, and expensive endpoints.
- Password hashing is deliberately slow; run it asynchronously and do
  not block the request path on it more than necessary.

## Common Mistakes

- Trusting client-side validation alone — the client is fully under
  the attacker's control.
- Building queries or commands by concatenating user input — the root
  cause of injection attacks.
- Rolling custom authentication or cryptography — maintained libraries
  exist because this is hard to get right.
- Committing secrets to version control, even "temporarily" — they are
  compromised the moment they are committed.
- Showing different errors for "wrong password" and "no such user" —
  this leaks which accounts exist.
- Forgetting authorisation on one endpoint — attackers find the one
  endpoint you missed.
- Logging sensitive data "for debugging" and forgetting to remove it.

## Examples

Parameterised query instead of string concatenation:

```ts
// Unsafe: user input interpolated into the query.
const rows = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// Safe: the value is a parameter, never part of the query text.
const rows = await db.query("SELECT * FROM users WHERE email = $1", [email]);
```

Secret handling with environment variables:

```ts
// The secret comes from the environment, never from source code.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not set");
}
```

Authorisation check on every request:

```ts
// Check ownership server-side before returning the resource.
const order = await db.orders.findById(orderId);
if (!order || order.userId !== currentUser.id) {
  return new Response("Not found", { status: 404 });
}
```

## Validation Checklist

- [ ] All input is validated at the boundary (type, length, format, range).
- [ ] Authorisation is enforced server-side on every operation.
- [ ] No queries, commands, or markup are built by concatenating
      untrusted input.
- [ ] No secrets appear in code, config, logs, or version control.
- [ ] Authentication uses a maintained library, not custom code.
- [ ] Dependencies have been scanned for known vulnerabilities.
- [ ] Error messages reveal no internals or account existence.
- [ ] Security-relevant events are logged without sensitive data.

## Expected Deliverables

- The feature or fix, with the security controls above in place.
- A short threat-model note for the feature: assets, boundaries, and
  the controls applied.
- Dependency scan results, with any vulnerabilities addressed or
  documented.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — critical web
  risks.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  actionable guidance per topic.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) —
  verification standard.
- Related skills in this repository: `code-review`, `tdd`,
  `software-architecture`, `engineering-standards`.
