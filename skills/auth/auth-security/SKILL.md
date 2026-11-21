---
name: auth-security
description: >
  Harden authentication and authorization against attacks: threat modeling
  for auth, brute-force and credential-stuffing defenses, CSRF, secrets
  handling, security headers, and auth auditing. Use when reviewing auth
  security, hardening a login flow, adding rate limiting or account lockout,
  handling secrets and API keys, or when the task mentions auth security,
  CSRF, brute force, credential stuffing, account takeover, or security audit.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Auth Security

## Purpose

Authentication is the most attacked part of most applications. This skill
covers hardening auth end to end: threat modeling the auth surface,
rate-limiting and lockout, CSRF protection, secrets and API key handling,
security headers, and auditing auth code and logs for weaknesses.

## When to Use

- Reviewing or hardening an existing login, registration, or password-reset flow.
- Adding rate limiting, lockout, CAPTCHA-style friction, or breach detection to auth endpoints.
- Handling secrets, API keys, or service credentials.
- The task mentions auth security, CSRF, brute force, credential stuffing, account takeover, or a security audit.

## When Not to Use

- The task is building the auth flows themselves — use `authentication`, `better-auth`, or `oauth` first, then harden with this skill.
- The task is a specific auth mechanism (sessions, JWTs, MFA) — use `session-management`, `jwt`, or `mfa`.
- The task is general application security unrelated to auth (SQL injection, XSS in content pages) — use the app's general security review process.

## Prerequisites

- The auth flows exist or are being designed; hardening applies to real endpoints, not hypothetical ones.
- Access to the auth code, the framework's security features, and the deployment configuration.
- A secret manager is available for production secrets.
- Logging is in place or planned so auth events can be monitored.

## Official Documentation

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Top Ten](https://owasp.org/www-project-top-ten/) — the 2025 edition is current (finalized January 2026); Broken Access Control remains A01.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — ASVS 5.0.0 (May 2025) is the current version; requirement numbering changed from 4.0.3, so cite requirements with their version prefix.
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## Required Workflow

1. Map the auth attack surface: every endpoint that touches identity (sign-up, sign-in, reset, verify, OAuth callback, session refresh, API keys).
2. For each endpoint, name the threats: brute force, credential stuffing, enumeration, CSRF, session fixation, token leakage.
3. Add rate limiting to every auth endpoint, keyed by IP and by account, with stricter limits on sign-in and reset.
4. Verify CSRF protection on every state-changing auth endpoint (sign-in, sign-out, password change, settings) — use the framework's CSRF mechanism or SameSite cookies plus origin checks.
5. Audit secrets handling: no secrets in source, logs, error messages, or client bundles; all secrets in the secret manager with rotation.
6. Check security headers on auth pages: HTTPS enforced, HSTS, and a content security policy that does not allow inline scripts on login pages.
7. Review error messages and timing: auth errors must not reveal account existence, and responses should not leak whether an account exists through timing.
8. Verify logging: sign-ins, failures, password changes, and MFA events are logged without secrets; alerts exist for spikes in failures.
9. Review API keys and service credentials: scoped, expirable, revocable, and stored hashed where the app issues them.
10. Run the Validation Checklist and record any accepted risks with their reasons.

## Implementation Standards

- Rate limits are enforced server-side, per IP and per account, on every auth endpoint; client-side throttling is not a control.
- Use progressive friction (delays, CAPTCHA-style challenges) before hard account lockout; hard lockouts let attackers lock out victims.
- CSRF tokens are per-session, unpredictable, and checked on every state-changing request; GET requests never change state.
- Secrets are loaded from the environment or secret manager at startup; a missing secret fails the boot, never falls back to a default.
- API keys the app issues are random, shown once at creation, stored hashed, scoped to minimal permissions, and revocable.
- Auth endpoints return generic errors and constant-ish response timing; avoid branching that reveals account existence.
- HTTPS is mandatory; HSTS is enabled with a long max-age and includeSubDomains where the domain setup allows it.
- Dependencies that handle auth (the auth library, JWT library, crypto) are kept current and monitored for advisories.

## Best Practices

- Prefer the framework's or auth library's built-in protections over custom implementations.
- Monitor auth metrics: failed sign-in rate, reset request rate, and new-account rate; spikes are the earliest sign of an attack.
- Notify users of security-relevant events: new sign-in from an unknown device, password change, MFA change, API key creation.
- Keep an incident playbook for credential leaks: rotate secrets, invalidate sessions, force password resets, and notify affected users.
- Run a periodic auth review: re-read the auth code against this checklist after any auth change.
- Use breach-detection services or breached-password lists where the auth library supports them, to warn users reusing compromised passwords.

## Security Considerations

- Credential stuffing uses real username/password pairs from other breaches; rate limiting and breached-password checks are the main defenses, and MFA is the strongest one.
- Account enumeration through sign-up, reset, or timing leaks lets attackers build a target list; generic responses and uniform timing close it.
- CSRF on a password-change or email-change endpoint is account takeover; every state-changing auth endpoint needs protection.
- Secrets in logs are a common leak: scrub authorization headers, tokens, and passwords from logs and error reports.
- Third-party scripts on login pages can read keystrokes; keep the login page's script sources minimal and audited.
- Session and token handling failures (fixation, missing rotation, long-lived tokens) are covered by `session-management` and `jwt`; review those skills' checklists too.

## Performance Considerations

- Rate limiting must be cheap: in-memory or Redis counters, not a database write per request.
- Password hashing is intentionally slow; it happens once per sign-in attempt and must not be skipped for unknown accounts (hash a dummy value to keep timing uniform).
- CAPTCHA-style challenges add friction and latency; apply them progressively (after several failures) rather than on every attempt.
- Security headers add no meaningful latency; there is no performance reason to skip them.

## Common Mistakes

- Rate limiting by IP only — attackers rotate IPs; limit by account too.
- Hard lockout after a few failures — attackers lock out victims at will.
- CSRF protection on the main app but not on the auth endpoints — auth endpoints are the highest-value CSRF targets.
- Logging the full request including the password or token — scrub auth data from logs.
- A default or fallback secret in code "for development" that ships to production — fail the boot when a secret is missing.
- Issuing API keys and storing them in clear text — hash them like passwords and show them once.
- Assuming HTTPS alone is enough — headers, CSRF, rate limiting, and secrets hygiene all still matter.

## Examples

Rate limiting shape for auth endpoints (framework-agnostic):

```ts
// Key by both IP and account so neither rotation nor targeting bypasses it.
const limiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxByIp: 20, // sign-in attempts per IP per window
  maxByAccount: 5, // sign-in attempts per account per window
});

async function signInHandler(request: Request) {
  await limiter.check(request.ip, request.body.email);
  // ... verify credentials, generic error on failure
}
```

Secrets handling rules (checklist form):

```text
- Load from the environment or secret manager at startup; fail to boot if missing.
- Never commit to source control; never print in logs or error messages.
- Rotate on a schedule and immediately after any suspected exposure.
- Separate secrets per environment; production secrets never appear in development.
- Scope service credentials to the minimum permissions they need.
```

## Validation Checklist

- [ ] Every auth endpoint is rate-limited by IP and by account.
- [ ] CSRF protection verified on all state-changing auth endpoints.
- [ ] No secrets in source, logs, error messages, or client bundles.
- [ ] Auth errors are generic and do not reveal account existence.
- [ ] HTTPS enforced; HSTS and security headers set on auth pages.
- [ ] API keys scoped, hashed, expirable, and revocable.
- [ ] Auth events logged (without secrets) and monitored for spikes.
- [ ] Incident playbook exists for credential leaks.

## Expected Deliverables

- Hardening changes applied to the auth endpoints (rate limits, CSRF, headers).
- A secrets audit note: where each secret lives and how it rotates.
- The auth event logging and alerting configuration.
- A short risk register: threats addressed, and any accepted risks with reasons.

## References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- Related skills in this repository: `authentication`, `session-management`, `jwt`, `mfa`, `authorization`.
