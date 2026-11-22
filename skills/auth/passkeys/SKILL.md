---
name: passkeys
description: >
  Implement passkeys and WebAuthn: registration and authentication ceremonies,
  attestation, relying party configuration, discoverable credentials, cross-device
  sign-in, conditional mediation (autofill), fallback and recovery, and migration
  from passwords. Use when the task mentions passkeys, WebAuthn, FIDO2,
  security keys, biometric sign-in, navigator.credentials, or passwordless
  authentication.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Passkeys

## Purpose

Passkeys are phishing-resistant, passwordless credentials built on WebAuthn:
a private key stays on the user's device or security key (unlocked by
biometrics, a PIN, or a button press) and the server stores only the public
key. This skill covers implementing the two WebAuthn ceremonies —
registration and authentication — with a maintained library, plus
discoverable credentials, cross-device flows, recovery, and migration from
passwords. Passkeys prove identity (authentication); what the signed-in
user may do (authorization) is still the app's own checks — see
`authorization` and `rbac`. For the broader MFA picture (TOTP, backup
codes, MFA policy), see `mfa`.

## When to Use

- Adding passkey sign-in or passkeys as a second factor to a web app.
- Replacing passwords with passwordless authentication.
- The task mentions passkeys, WebAuthn, FIDO2, security keys, biometric
  sign-in, `navigator.credentials.create()` / `.get()`, discoverable
  credentials, or conditional mediation.
- Reviewing or fixing an existing WebAuthn integration.

## When Not to Use

- The app uses a hosted auth provider with built-in passkeys — use
  `clerk` or `supabase-auth` and let the provider run the ceremonies.
- The task is only about TOTP or backup codes — use `mfa`.
- The task is only about sessions after sign-in — use `session-management`.
- The audience is on devices without any platform authenticator or
  passkey support and no security keys — passwords plus TOTP (`mfa`) may
  be the pragmatic choice for now.

## Prerequisites

- The standard: Web Authentication Level 3 is the current W3C
  Recommendation (25 August 2026, `REC-webauthn-3-20260825`), superseding
  Level 2 (8 April 2021). Level 3 formalizes the passkey behavior browsers
  already shipped: discoverable credentials, conditional mediation,
  cross-origin creation, the `hybrid` transport, signal methods for
  credential lifecycle management, and Related Origin Requests.
- HTTPS on every environment (WebAuthn requires a secure context;
  `localhost` is exempt for development).
- A maintained WebAuthn library for the stack — for TypeScript,
  `@simplewebauthn/server` and `@simplewebauthn/browser` (v13 current
 ; v13 requires Node 22+). Never implement
  the ceremonies by hand: challenge handling, CBOR parsing, and signature
  verification have subtle failure modes.
- A server that can hold short-lived challenges (database row or cache
  with a TTL) and a credential store (credential ID, public key, user
  link, counter, transports, device metadata).
- The Relying Party (RP) ID decided up front: the bare domain
  (for example `example.com`). Credentials are cryptographically bound to
  it, and changing it later orphans registered passkeys.
- Authentication and sessions already working if passkeys are being added
  as a second factor or as an alternative sign-in; registration of a
  passkey happens inside an authenticated session.

## Official Documentation

- [Web Authentication Level 3 (W3C)](https://www.w3.org/TR/webauthn-3/) — the current Recommendation; §7 (Relying Party operations), §13.4 (RP security), and §14.6 (RP privacy) are the sections implementers need most.
- [passkeys.dev](https://passkeys.dev) — practical passkey guidance for implementers, including device support and UX patterns.
- [SimpleWebAuthn server docs](https://simplewebauthn.dev/docs/packages/server) — `generateRegistrationOptions`, `verifyRegistrationResponse`, `generateAuthenticationOptions`, `verifyAuthenticationResponse`.
- [SimpleWebAuthn browser docs](https://simplewebauthn.dev/docs/packages/browser) — `startRegistration`, `startAuthentication`, `browserSupportsWebAuthn`.
- [WebAuthn Level 3 is now a W3C Recommendation (FIDO Alliance)](https://fidoalliance.org/webauthn-level-3-is-now-a-w3c-recommendation/) — what the Recommendation status means and what changed from Level 2.
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) — authenticator strength guidance; final July 2025.

## Required Workflow

1. Decide the role of passkeys: primary passwordless sign-in, a second
   factor alongside passwords, or both. Decide the fallback before
   writing code (password, email link, or support-assisted recovery).
2. Configure the Relying Party: RP name (shown in the browser prompt),
   RP ID (the bare domain), and the expected origin
   (`https://` + RP ID, plus any additional allowed origins). Record these
   as configuration, not hard-coded strings scattered through handlers.
3. Install the WebAuthn library and create the credential store: one row
   per credential with the credential ID, public key, user link,
   counter, transports, device type (single-device vs multi-device),
   backup eligibility/state, and a user-editable friendly name.
4. Implement registration (two endpoints): generate options with a fresh
   random challenge and the user's opaque ID, then verify the
   authenticator's response (challenge, origin, RP ID) and store the
   credential. Registration requires an authenticated session.
5. Implement authentication (two endpoints): generate options with a
   fresh challenge and — for discoverable credentials — an empty
   `allowCredentials` list so the authenticator offers the user's
   passkeys; then verify the assertion signature against the stored
   public key and create a session.
6. Add conditional mediation (autofill): on the sign-in form, offer
   passkeys in the browser's autofill dropdown when
   `PublicKeyCredential.isConditionalMediationAvailable()` reports
   support, so users can sign in without a modal.
7. Add cross-device sign-in: the browser handles it (QR code / Bluetooth
   via the `hybrid` transport) when the user's passkey is on another
   device; the server side is the same authentication ceremony. Test it
   on a real phone and laptop pair.
8. Build credential management UI: list the user's passkeys (friendly
   name, device type, last used), rename, and delete. Deleting a passkey
   server-side should also signal the authenticator where the platform
   supports it (Level 3 signal methods).
9. Implement recovery: a verified path for users who lost all passkeys
   (password, email verification, or support-assisted identity checks) —
   never a self-serve bypass that reduces passkey security to email
   security without the product deliberately accepting that trade-off.
10. Test the full matrix — registration, authentication, wrong origin,
    replayed challenge, deleted credential, cross-device, autofill, and
    recovery — then run the Validation Checklist.

## Implementation Standards

- Use a maintained library for both ceremonies; never hand-roll CBOR
  parsing, attestation verification, or signature checks.
- Challenges are cryptographically random (at least 16 bytes; 32 is the
  usual choice), single-use, bound to the session that requested them,
  and short-lived (minutes). A challenge that has been answered is
  consumed and never accepted again.
- Verification always checks: the challenge matches the stored one, the
  origin matches an expected origin, the RP ID hash matches, the
  signature verifies against the stored public key, and (for
  registration) the credential ID is not already registered to another
  user. The library does this — but only if it is given the right
  expected values, so configure `rpID` and `origin` explicitly.
- `user.id` is an opaque, random, per-user value (not an email, username,
  or sequential ID). The human-readable `user.name` and `user.displayName`
  are what the authenticator shows.
- Credential lifecycle — discoverable credentials, attestation,
  signature counter, credential storage, Related Origin Requests,
  and post-ceremony sessions: see
  [references/credential-lifecycle.md](./references/credential-lifecycle.md).

### Testing Strategy

- Test both ceremonies end to end with a virtual authenticator (the
  WebDriver virtual authenticator or a browser automation harness) so
  registration and authentication run in CI without real hardware.
- Test rejection paths: a replayed challenge, a wrong origin, a
  mismatched RP ID hash, and a credential ID already registered to
  another user must all fail closed.
- Test the counter behavior: a counter that goes backwards is flagged
  for investigation, not treated as an automatic lockout, since synced
  passkeys do not increment counters reliably.
- Test the fallback: a device or browser without a platform
  authenticator still reaches a working sign-in path instead of a dead
  end.

### Accessibility

- Registration and sign-in prompts are explained in plain text before
  the browser dialog appears, so users know what to expect.
- Always offer a fallback sign-in method; not every device or user can
  use passkeys.
- Errors (no passkey found, ceremony cancelled, device unsupported)
  are explained in text with a next step.
- Manage-passkey screens list credentials with human-readable names
  (device, date added) and labeled remove buttons.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Offer passkeys alongside existing sign-in first, and let users add a
  passkey from settings or right after sign-up — adoption grows when the
  prompt appears at a moment of trust, not as a blocker.
- Prefer synced (multi-device) passkeys for consumer apps: they survive
  device loss through the platform's credential manager. Single-device
  (device-bound) passkeys fit workforce scenarios with managed hardware.
- Use conditional mediation on the sign-in form: passkeys in autofill
  feel like a password manager and need no modal, which is the
  lowest-friction sign-in available.
- Name passkeys by device ("iPhone 15", "1Password") and show last-used
  time, so users can tell their credentials apart and revoke the right one.
- When a user deletes a passkey, remove it server-side and signal the
  authenticator (Level 3 signal methods) so the platform can clean up
  its copy; do not leave orphaned credentials the user thinks are gone.
- During migration from passwords, keep the password path until passkey
  adoption is high enough to measure, then make passwords optional —
  removing them outright strands users who never enrolled a passkey.
- Test on real devices and real browsers: passkey behavior varies by
  platform authenticator, and emulators do not reproduce the prompts,
  the cross-device flow, or the failure modes.

## Security Considerations

- Phishing resistance is the point: a passkey is bound to the RP ID and
  origin, so a lookalike domain cannot use it. Do not undermine this by
  accepting assertions for unexpected origins or by skipping origin
  verification.
- The recovery flow is the weakest link. A self-serve reset that only
  needs email access reduces a passkey account to email security. Make
  the trade-off explicit, require a waiting period or a second check for
  high-value accounts, and notify the user on every recovery event.
- Enrollment must happen in an authenticated session: an attacker who
  finds an unenrolled account must not be able to register their own
  passkey on it.
- Never accept a registration or authentication response without a
  matching stored challenge. A missing challenge check turns the ceremony
  into a replayable assertion.
- Rate-limit ceremony endpoints per account and per IP; a challenge is
  cheap to request and expensive to verify, which invites abuse.
- Do not require attestation for consumer sign-in: it excludes legitimate
  authenticators, adds privacy-sensitive data handling, and does not
  improve security for the common case. When attestation is required,
  validate it properly or not at all — partial validation is worse than
  none because it creates false confidence.
- Revoke promptly: when a device is lost or an account is compromised,
  delete the affected credentials server-side and invalidate sessions.
  A deleted credential must not authenticate, even if the authenticator
  still holds it.
- Passkeys do not protect against a compromised device or a coerced user;
  they protect the credential exchange. Device security and account
  recovery remain the app's responsibility.

## Performance Considerations

- Ceremonies are fast: one challenge generation, one signature
  verification, and one or two indexed lookups. The user interaction
  (biometric prompt) dominates the latency, not the server.
- Challenge storage must support TTL expiry and single-use consumption;
  a cache (Redis) or a database table with a cleanup job both work.
- Credential lookups by credential ID must be indexed; authentication
  does a lookup per attempt.
- Conditional mediation availability checks are cheap client-side calls;
  run them at page load and degrade gracefully when unavailable.
- Attestation verification (when used) involves certificate chain
  validation and metadata lookups; cache the metadata and keep it off
  the registration hot path where possible.

## Common Mistakes

- Setting the RP ID to a subdomain (`app.example.com`) when the product
  lives on the apex, or vice versa — credentials are bound to the RP ID
  and will not work on the other.
- Using the email address as `user.id` — it is not opaque, it changes,
  and it leaks identity into the credential.
- Skipping challenge verification or reusing challenges — the ceremony
  becomes replayable.
- Requesting `residentKey: "discouraged"` (or omitting it) and then
  wondering why users must type their email before the passkey prompt —
  discoverable credentials are what make passwordless sign-in work.
- Treating the signature counter as a hard security control for synced
  passkeys — they do not increment it reliably; investigate regressions,
  do not auto-lock.
- No fallback or recovery path — users who lose their only device are
  locked out, and support invents an insecure workaround.
- Testing only in one browser on one OS — passkey prompts, cross-device
  flows, and conditional mediation differ across platforms.
- Hand-rolling the ceremony "because it is just a signature check" —
  attestation parsing, COSE key handling, and counter management are
  where hand-rolled implementations fail.

## Examples

Server: registration options and verification with SimpleWebAuthn
(TypeScript; challenge storage and the credential store are the app's):

  [examples/server-ceremonies.ts](./examples/server-ceremonies.ts).

Browser: registration and authentication with SimpleWebAuthn:

  [examples/browser-webauthn.ts](./examples/browser-webauthn.ts).

## Validation Checklist

- [ ] RP ID is the bare production domain; origin list matches the deployed origins.
- [ ] Registration and authentication ceremonies verified end to end with a maintained library.
- [ ] Challenges are random, single-use, short-lived, and verified on every response.
- [ ] Discoverable credentials requested; sign-in works without typing an identifier first.
- [ ] Conditional mediation offered on the sign-in form where supported.
- [ ] Cross-device sign-in tested on a real phone and laptop pair.
- [ ] Credential management UI lists, renames, and deletes passkeys.
- [ ] Recovery path defined and tested; it cannot silently bypass passkey security.
- [ ] `user.id` is opaque; no private key material is ever stored or requested.
- [ ] Sessions after the ceremony follow `session-management`.
- [ ] Accessibility: fallback sign-in offered; errors explained with a next step.

## Expected Deliverables

- Registration and authentication ceremonies with a maintained WebAuthn library.
- The credential store schema and RP configuration.
- Credential management UI and the recovery flow.
- Tests covering registration, authentication, replayed challenges,
  deleted credentials, cross-device sign-in, and recovery.

## References

- [Web Authentication Level 3 (W3C)](https://www.w3.org/TR/webauthn-3/) — W3C Recommendation, 25 August 2026.
- [passkeys.dev](https://passkeys.dev)
- [SimpleWebAuthn server docs](https://simplewebauthn.dev/docs/packages/server)
- [SimpleWebAuthn browser docs](https://simplewebauthn.dev/docs/packages/browser)
- [WebAuthn Level 3 is now a W3C Recommendation (FIDO Alliance)](https://fidoalliance.org/webauthn-level-3-is-now-a-w3c-recommendation/)
- Related skills in this repository: `authentication`, `mfa`, `session-management`, `jwt`, `oauth`, `auth-security`, `clerk`, `supabase-auth`.
