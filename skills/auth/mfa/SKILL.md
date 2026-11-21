---
name: mfa
description: >
  Add multi-factor authentication: TOTP authenticator apps, passkeys and
  WebAuthn, backup codes, and recovery flows. Use when the task mentions MFA,
  two-factor authentication, 2FA, TOTP, authenticator app, passkeys, WebAuthn,
  security keys, backup codes, or requiring a second factor for sign-in or
  sensitive actions.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# MFA

## Purpose

Multi-factor authentication requires a second proof of identity beyond the
password, so a stolen password alone is not enough to take over an account.
This skill covers adding TOTP authenticator support and passkeys/WebAuthn,
plus backup codes and safe recovery flows, using maintained libraries.

## When to Use

- Adding two-factor authentication to sign-in.
- The task mentions MFA, 2FA, TOTP, authenticator app, passkeys, WebAuthn, security keys, or backup codes.
- Requiring a second factor for sensitive actions (changing a password, viewing billing, admin actions).
- Building account recovery for users who lost their second factor.

## When Not to Use

- The task is only about the first factor (passwords, social login) — use `authentication` or `oauth`.
- The task is about session handling after MFA succeeds — use `session-management`.
- The product needs only SMS codes — SMS is the weakest second factor; prefer TOTP or passkeys, and see the Security Considerations section.

## Prerequisites

- Authentication and sessions are already working; MFA is a second step after the first factor succeeds.
- A maintained MFA library for the stack (for example the auth library's own two-factor plugin, `otplib` for TOTP, or a WebAuthn library). `otplib` 13.x is the current line (13.6.0 as of November 2026); v13 is a complete rewrite with an async-first functional API — the v12 `authenticator` object API was removed, so do not use `authenticator.generateSecret()`, `authenticator.keyuri()`, or `authenticator.verify()` with v13.
- A way to show a QR code for TOTP setup (the app renders the otpauth URL as a QR code).
- HTTPS on every environment handling real credentials.

## Official Documentation

- [RFC 6238 — TOTP: Time-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc6238) — the TOTP specification.
- [RFC 4226 — HOTP: HMAC-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc4226) — the counter-based algorithm TOTP builds on.
- [WebAuthn Level 3 (W3C)](https://www.w3.org/TR/webauthn-3/) — the WebAuthn specification behind passkeys; a W3C Recommendation since 25 August 2026, superseding Level 2.
- [passkeys.dev](https://passkeys.dev) — practical passkey guidance for implementers.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — authenticator strength guidance; final July 2025, superseding SP 800-63B-3.

## Required Workflow

1. Decide which factors to offer: TOTP authenticator apps as the baseline, passkeys/WebAuthn as the stronger option, and backup codes for recovery.
2. Decide the policy: optional for users, required for admins, or required for everyone — and whether sensitive actions re-prompt for a factor.
3. Implement TOTP enrollment: generate a secret server-side, show it as a QR code, require the user to enter a valid code to confirm enrollment, then store the secret encrypted.
4. Implement TOTP verification: after the password checks out, ask for the current code and verify it with the library, allowing a small time-step window for clock drift.
5. Implement passkey enrollment and verification with a maintained WebAuthn library, following its guide for the platform's ceremony.
6. Generate backup codes at enrollment: single-use, hashed in storage, shown once, and regenerable.
7. Implement recovery: a verified recovery path (support-assisted with identity checks, or a verified email flow) for users who lost all factors — never a self-serve bypass.
8. Track MFA state per user: which factors are enrolled, when each was added, and whether MFA is required for the account.
9. Handle the unenrollment flow: removing a factor requires a currently valid factor or the recovery path.
10. Test the full matrix: enroll, verify, wrong code, expired code, backup code use, recovery, and removal — then run the Validation Checklist.

## Implementation Standards

- Use a maintained library for TOTP and WebAuthn; never implement the algorithms by hand.
- TOTP secrets are stored encrypted at rest and never returned to the client after enrollment.
- Verification codes are single-use within their time window: a code that has been accepted must not be accepted again.
- Allow a small verification window (one time step before and after) for clock drift, not a wide one.
- Backup codes are hashed like passwords, shown exactly once, and each usable once.
- The second-factor step runs after the first factor succeeds, in the same login attempt; do not create a full session before MFA passes.
- Rate-limit verification attempts (a small number per minute per account) to block guessing.
- Record which factor authenticated the session so sensitive actions can require a fresh factor.

## Best Practices

- Prefer passkeys where the audience can use them: they resist phishing in a way TOTP codes do not.
- Make enrollment friction visible: explain why MFA matters and what happens if the factor is lost, before the user enrolls.
- Offer more than one factor type so a user with a lost phone can still sign in with a passkey or backup code.
- Let admins require MFA for their organization or team, and report on who has not enrolled.
- Notify the user by email when a factor is added, removed, or used from a new device.
- Keep the verification screen simple: one field, clear errors, and a visible "use a backup code" path.

## Security Considerations

- SMS codes are vulnerable to SIM swapping and interception; treat SMS as a last resort, not a recommended factor.
- TOTP codes can be phished in real time; passkeys resist phishing because the credential is bound to the site's origin.
- Never let a user disable MFA without proving a current factor or completing the recovery flow.
- The recovery flow is the weakest link: a self-serve reset that only needs email access reduces MFA to email security.
- Enrollment must happen in an authenticated session; an attacker who finds an unenrolled account must not be able to enroll their own factor.
- Store TOTP secrets encrypted and keep them out of logs, error messages, and backups that are not equally protected.

## Performance Considerations

- TOTP verification is a fast local computation; it adds negligible latency to sign-in.
- WebAuthn ceremonies involve a browser round trip and user interaction; keep the ceremony code on the critical path short and asynchronous where possible.
- Rate-limiting state for verification attempts should live in fast storage (in-memory or Redis) so checks do not slow sign-in.
- Backup code verification is a hash comparison; hash with the same care as passwords.

## Common Mistakes

- Creating a full session after the password and asking for MFA later — the session must not exist until all factors pass.
- Accepting the same TOTP code twice within its window — track used codes.
- Storing backup codes in clear text — hash them like passwords.
- No recovery path — users who lose their factor are locked out forever, and support invents an insecure workaround.
- Letting enrollment happen without authentication — an attacker enrolls their own factor on a victim's account.
- A verification window so wide that codes stay valid for minutes — one step each way is enough.

## Examples

TOTP enrollment and verification with `otplib` v13 (TypeScript):

```ts
import { generateSecret, generateURI, verify } from "otplib";

// Enrollment: generate a secret, build the otpauth URL, render it as a QR code.
const secret = generateSecret();
const otpauthUrl = generateURI({
  issuer: "My App",
  label: user.email,
  secret,
});
// Show otpauthUrl as a QR code; store `secret` encrypted only after the
// user proves enrollment by entering a valid code.

// Verification: check the code the user entered against the stored secret.
// verify() is async and returns a result object; check `valid`.
const { valid } = await verify({
  secret: storedSecret,
  token: codeFromUser,
});
```

Backup code generation (standard library only):

```ts
import { randomBytes } from "node:crypto";

// Ten single-use codes, shown once to the user and stored hashed.
const backupCodes = Array.from({ length: 10 }, () =>
  randomBytes(4).toString("hex").toUpperCase(),
);
```

## Validation Checklist

- [ ] TOTP enrollment requires a valid code before the secret is stored.
- [ ] Sign-in does not create a session until all factors pass.
- [ ] Codes are single-use within their window; verification window is small.
- [ ] Backup codes generated, hashed, shown once, and usable once each.
- [ ] Recovery path defined and tested; it cannot be used to bypass MFA silently.
- [ ] Removing a factor requires a valid factor or the recovery path.
- [ ] Verification attempts rate-limited.
- [ ] Passkeys offered or explicitly deferred with a reason.

## Expected Deliverables

- TOTP enrollment and verification flows, and passkey flows where in scope.
- Backup code generation, storage, and use.
- The recovery flow and its documentation.
- Tests covering enrollment, verification, wrong codes, backup codes, and recovery.

## References

- [RFC 6238 — TOTP](https://datatracker.ietf.org/doc/html/rfc6238)
- [WebAuthn Level 3 (W3C)](https://www.w3.org/TR/webauthn-3/) — W3C Recommendation, 25 August 2026.
- [passkeys.dev](https://passkeys.dev)
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — final July 2025.
- Related skills in this repository: `authentication`, `session-management`, `auth-security`, `better-auth`.
