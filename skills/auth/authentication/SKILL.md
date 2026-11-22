---
name: authentication
description: >
  Design and implement user authentication for a web application: choosing an
  auth approach, sign-up and sign-in flows, password handling, email
  verification, and password reset. Use when adding login, sign-up, sign-out,
  password reset, or email verification, or when the task asks how users
  should authenticate, which auth library to pick, or how to secure a login
  flow.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Authentication

## Purpose

Authentication answers "who is this user?" This skill covers choosing an
auth approach for a web app and implementing the core flows — sign-up,
sign-in, sign-out, email verification, and password reset — using a
maintained library, with secure password handling and sensible defaults.

## When to Use

- Adding login, sign-up, sign-out, password reset, or email verification to an app.
- Choosing between auth libraries, hosted auth providers, and social login.
- Reviewing or fixing an existing login flow.
- The task mentions authentication, login, sign-in, sign-up, passwords, or user accounts.

## When Not to Use

- The task is only about what a signed-in user may do — use `authorization` or `rbac`.
- The task is specifically OAuth/OIDC protocol work — use `oauth`.
- The task is specifically session cookies, expiry, or revocation — use `session-management`.
- The task is specifically tokens (issuing, verifying JWTs) — use `jwt`.

## Prerequisites

- The app's stack and framework are known, so the auth approach can match them.
- A user store exists or is planned (database with a users table, or a hosted auth provider).
- Email sending is available if verification or password reset emails are needed.
- HTTPS is available on every environment handling real credentials.

## Official Documentation

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — current best practice for login flows.
- [NIST SP 800-63B-4 — Authentication and Authenticator Management](https://pages.nist.gov/800-63-4/sp800-63b.html) — memorized-secret and authenticator guidance. Final July 2025; it supersedes SP 800-63B-3 (withdrawn 1 August 2025). Do not cite the 800-63-3 edition for new work.
- [Auth.js documentation](https://authjs.dev) — a maintained auth library for JavaScript frameworks.
- [Better Auth documentation](https://www.better-auth.com/docs) — a maintained auth library for TypeScript apps.

## Required Workflow

1. Decide the approach before writing code: maintained library (Better Auth, Auth.js), hosted provider (Clerk, Supabase Auth, Firebase Auth), or social-only login. Never build custom password auth when a maintained option fits.
2. Read the chosen library's or provider's getting-started guide for the project's framework.
3. Model the user record: unique identifier, email (unique, normalized to lowercase), password hash field (only if the library does not manage it), verification status, and timestamps.
4. Implement sign-up: validate input, hash the password with the library's hasher, create the user, and send a verification email.
5. Implement sign-in: look up by email, verify the password hash in constant time via the library, create a session, and rate-limit attempts.
6. Implement sign-out: destroy the server session and clear the cookie.
7. Implement password reset: generate a single-use, expiring token, email a reset link, verify the token, and require a new password.
8. Implement email verification: single-use, expiring token; mark the user verified only after the token checks out.
9. Protect routes server-side: every protected page and API route checks the session before doing work.
10. Verify all flows end to end and run the Validation Checklist.

## Implementation Standards

- Use a maintained auth library or hosted provider; never write custom password hashing, token generation, or session code.
- Passwords are hashed with a modern adaptive hasher (Argon2id or bcrypt) via the library — never MD5, SHA-1, or plain SHA-256, and never stored in clear text.
- Minimum password length is 15 characters when the password is the only factor (NIST SP 800-63B-4 §3.1.1.2); 8 characters is the floor only for passwords that are always used with a second factor. Support passwords of at least 64 characters so passphrases work, and do not impose composition rules (no required mix of character types).
- Check every new password against a blocklist of commonly used, expected, or compromised passwords and require a different choice on a match — this is a NIST SP 800-63B-4 requirement, not an optional extra.
- Never require periodic password rotation; force a password change only on evidence of compromise (NIST SP 800-63B-4). Allow password managers, autofill, and paste in password fields.
- Sign-in errors are generic ("invalid email or password") so they do not reveal which accounts exist.
- Verification and reset tokens are single-use, expire quickly (an hour or less for reset links), and are invalidated after use.
- Sessions follow the `session-management` skill: httpOnly, secure, sameSite cookies.
- Normalize emails to lowercase and trim whitespace before lookup and storage.

### Accessibility

- Labels are visible and associated (`for` / `id`); use `autocomplete`
  tokens (`email`, `current-password`, `new-password`).
- Errors identify the field in text, explain the fix, and are
  announced (`role="alert"` or `aria-describedby`); do not rely on
  color alone.
- Password fields offer a show / hide toggle that is itself a labeled
  button; do not block paste.
- Sign-in must not require a cognitive function test (WCAG 3.3.8): no
  memorizing codes across steps, no puzzle CAPTCHA without an
  accessible alternative.
- Keep the flow keyboard-only operable, including social sign-in
  buttons and any dialogs.
- On error, move focus to the error summary or the first invalid
  field.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Offer social sign-in alongside email/password to reduce password friction, using the `oauth` skill.
- Require email verification before the account can do anything sensitive; allow browsing first if the product allows it.
- Invalidate all sessions on password change so a stolen session stops working.
- Send a notification email when the password changes or a new device signs in.
- Keep auth logic in one module or service; route handlers call it rather than reimplementing checks.
- Make the sign-in form accessible: proper labels, autocomplete attributes (`email`, `current-password`), and clear error text.

## Security Considerations

- Rate-limit sign-in, sign-up, and reset endpoints per IP and per account to slow credential stuffing and enumeration.
- Lock or slow accounts only after repeated failures, and prefer CAPTCHA-style friction over hard lockouts that enable denial of service.
- Never log passwords, reset tokens, or verification tokens.
- Use HTTPS everywhere; reject authentication over plain HTTP.
- Guard against user enumeration: sign-up and password-reset responses should not reveal whether an email is registered.
- Review the chosen library's security advisories before adopting it and keep it updated.

## Performance Considerations

- Password hashing is intentionally slow; run it off the hot path where possible and do not hash more than once per request.
- Cache the authenticated user for the duration of a request instead of re-fetching per component.
- Email sending must be asynchronous: queue verification and reset emails so sign-up does not wait on SMTP.
- Session lookups should hit an indexed column (session token or user ID).

## Common Mistakes

- Rolling custom auth "because it is simple" — password handling, sessions, and reset flows have subtle failure modes; use a maintained library.
- Storing passwords with a fast hash (SHA-256) or in clear text — use Argon2id or bcrypt via the library.
- Revealing "no account with that email" on sign-in or reset — use generic messages.
- Checking auth only in the UI — every API route and server action must check the session too.
- Reset tokens that never expire or can be reused — single-use with a short expiry.
- Forgetting to invalidate sessions after a password change — a stolen session survives the reset.

## Examples

Choosing an approach (decision guide, not code):

```text
TypeScript app, full control wanted      -> better-auth or Auth.js
Need hosted auth with least code         -> Clerk, Supabase Auth, or Firebase Auth
Social login only, no passwords          -> OAuth/OIDC provider via the oauth skill
Non-JavaScript stack                     -> the maintained auth library for that stack
```

Sign-in handler shape (framework-agnostic; the library does the hashing):

```ts
// The auth library verifies the password hash and creates the session.
// The handler only validates input, calls the library, and returns a
// generic error on failure so account existence is not revealed.
async function signIn(email: string, password: string) {
  const user = await auth.signInWithPassword(email.trim().toLowerCase(), password);
  if (!user) throw new Error("Invalid email or password");
  return user;
}
```

## Validation Checklist

- [ ] Auth approach chosen and justified (library or hosted provider, not custom code).
- [ ] Sign-up, sign-in, sign-out, verification, and reset verified end to end.
- [ ] Passwords hashed with Argon2id or bcrypt via the library; none stored in clear text.
- [ ] Sign-in and reset errors are generic and do not reveal account existence.
- [ ] Protected routes and API endpoints reject unauthenticated requests server-side.
- [ ] Sessions invalidated on password change; reset and verification tokens single-use and expiring.
- [ ] Rate limiting in place on sign-in, sign-up, and reset endpoints.
- [ ] Accessibility: labels and autocomplete set; errors announced and identify the field.

## Expected Deliverables

- Working sign-up, sign-in, sign-out, verification, and password-reset flows.
- The auth approach decision recorded (library/provider chosen and why).
- Server-side protection on all protected routes and API endpoints.
- A short report of the flows verified and any provider or email setup still needed.

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — final July 2025; supersedes SP 800-63B-3.
- [Auth.js documentation](https://authjs.dev)
- [Better Auth documentation](https://www.better-auth.com/docs)
- Related skills in this repository: `better-auth`, `oauth`, `session-management`, `mfa`, `auth-security`, `authorization`.
