---
name: oauth
description: >
  Implement OAuth 2.0 and OpenID Connect flows: authorization code with PKCE,
  client credentials, token exchange, refresh, and revocation, as a client or
  a provider. Use when the task mentions OAuth, OIDC, social login, "sign in
  with" a provider, access tokens, refresh tokens, authorization code, PKCE,
  scopes, or connecting a third-party API on a user's behalf.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# OAuth

## Purpose

OAuth 2.0 is the standard for delegated authorization: letting an app act on
a user's behalf at another service without handling their password. OpenID
Connect (OIDC) adds identity on top of it. This skill produces a correct,
secure OAuth client or provider integration using the authorization code
flow with PKCE, with tokens stored and refreshed safely.

## When to Use

- Adding "sign in with Google/GitHub/Microsoft/Apple" or any social login.
- Calling a third-party API (Google, GitHub, Stripe, Slack) on behalf of a user.
- Building an app that other apps connect to as an OAuth provider.
- The task mentions access tokens, refresh tokens, scopes, authorization code, PKCE, or OIDC.

## When Not to Use

- The app only needs its own email/password login with no third-party identity — use `authentication` or `better-auth`.
- Service-to-service calls inside one organization with no user context — a simpler API-key or mutual-TLS scheme may fit better; see `auth-security`.
- The task is about session cookies or JWTs after login, not the OAuth exchange itself — use `session-management` or `jwt`.

## Prerequisites

- The identity provider's developer console access, to register the app and obtain a client ID and secret.
- A registered redirect URI that exactly matches the one the app will send.
- HTTPS on every environment that handles real tokens.
- A secure place to store the client secret and refresh tokens (secret manager for the secret, encrypted storage for user tokens).

## Official Documentation

- [OAuth 2.0 (oauth.net)](https://oauth.net/2/) — the standard's home, with flow explanations and guidance.
- [RFC 6749 — OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) — the normative specification; still the published standard. OAuth 2.1 (draft-ietf-oauth-v2-1-17, October 2026) is an Internet-Draft that consolidates RFC 6749 with the security BCPs below; it is not yet an RFC.
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700) — the current security baseline (January 2025, BCP 240). It requires PKCE for public clients, deprecates the implicit grant, and forbids the resource owner password credentials grant. Follow it today; it is the substance of the coming OAuth 2.1.
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) — the PKCE extension.
- [RFC 10017 — OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc10017) — BCP for SPAs and other browser-based OAuth clients (August 2026).
- [OpenID Connect](https://openid.net/connect/) — the identity layer on top of OAuth 2.0.
- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252) — rules for mobile and desktop clients.

## Required Workflow

1. Identify the role: is the app the OAuth client, the provider, or both? Most tasks are client-side.
2. Read the provider's own OAuth documentation for its endpoints, required parameters, and scope names.
3. Register the app in the provider console: name, redirect URI, and requested scopes. Record the client ID and secret in the secret manager.
4. Choose the flow: authorization code with PKCE for user-facing apps (web, mobile, SPA); client credentials for machine-to-machine.
5. Implement the authorization request: `response_type=code`, the client ID, redirect URI, scopes, a random `state` value, and the PKCE `code_challenge`.
6. Implement the callback: verify `state` matches the stored value, then exchange the code for tokens with the `code_verifier` at the token endpoint.
7. Validate the token response: check the token type, expiry, and — for OIDC — the ID token signature, issuer, audience, and expiry.
8. Store tokens server-side, encrypted at rest; never put access or refresh tokens in browser storage.
9. Implement refresh: exchange the refresh token before expiry, handle rotation, and treat refresh failure as a signed-out user.
10. Implement sign-out and revocation where the provider supports it, and run the Validation Checklist.

## Implementation Standards

- Always use authorization code with PKCE for user-facing flows, including confidential clients.
- Never use the implicit flow or the resource owner password credentials flow for new work: the implicit grant is deprecated by RFC 9700, and the password credentials grant MUST NOT be used (RFC 9700 §2.4).
- `state` must be a cryptographically random value bound to the user's session, checked on callback, and single-use.
- The redirect URI must match the registered value exactly; never build it from user input.
- Request the minimum scopes the feature needs; add scopes later only with a new consent step.
- Validate ID tokens: signature against the provider's JWKS, `iss`, `aud`, and `exp` claims.
- Token storage: server-side, encrypted at rest, scoped to the user and provider; access tokens in memory or short-lived cache only.
- Clock skew: allow a small leeway (a minute or two) when checking token expiry.

### Accessibility

- The consent screen is itself accessible: real buttons, labeled scopes
  in plain language, keyboard-operable approve / deny.
- Redirects preserve context: after returning from the provider, focus
  lands on a sensible place and the user is told what happened.
- Errors from the provider are surfaced in text with a next step, not
  a bare error code.
- Do not use popups that trap focus or break screen-reader context;
  prefer full-page redirects or properly managed dialogs.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Prefer a maintained OAuth client library for the stack over hand-rolling the exchange; hand-roll only the parts the library cannot do.
- Use the provider's discovery document (`.well-known/openid-configuration`) to find endpoints instead of hard-coding them.
- Handle the provider's error responses on the callback (`access_denied`, `invalid_scope`) with a clear user-facing message.
- Log OAuth failures (invalid state, failed exchange) without logging codes or tokens.
- Support account linking deliberately: decide what happens when the provider email already exists as a password account, and confirm with the user before merging.
- Keep provider configuration (endpoints, scopes) in one module per provider so adding a provider is a small change.

## Security Considerations

- The authorization code is single-use and short-lived; never log it or put it in a URL that can leak through referers.
- A missing or unchecked `state` enables CSRF login attacks; it is mandatory, not optional.
- PKCE protects public clients from code interception; use it even for confidential clients.
- Never accept tokens from the URL fragment in a server flow, and never trust an unverified ID token.
- Refresh tokens are long-lived credentials: encrypt them, scope them per user, and revoke them on sign-out and on password change.
- Reject tokens from unexpected issuers and audiences; a token minted for another app must not authenticate this one.
- When the client talks to more than one authorization server, validate the `iss` response parameter (RFC 9207) on the callback to prevent mix-up attacks; a distinct redirect URI per provider is the fallback when the provider does not send `iss`.

## Performance Considerations

- Cache the provider's JWKS and discovery document with their cache headers; do not fetch them on every request.
- Refresh access tokens proactively shortly before expiry instead of retrying failed API calls.
- Keep the number of provider round trips low: one token exchange per sign-in, one refresh per expiry window.
- Token introspection (for providers) adds latency; prefer locally verifiable JWT access tokens when the provider issues them.

## Common Mistakes

- Skipping `state` or PKCE because "the client is trusted" — both are required defenses, not optional extras.
- Storing access tokens in `localStorage` — any script on the page can read them; keep tokens server-side.
- Requesting every scope up front — users refuse, and a breach exposes more than needed.
- Hard-coding provider endpoints instead of discovery — endpoints change and the integration breaks silently.
- Treating a successful token exchange as identity proof without validating the ID token — the access token alone says nothing about who the user is.
- Ignoring refresh-token rotation — a rotated refresh token reused is a sign of theft; the provider may revoke the whole grant.

## Examples

Generating a PKCE challenge (Node.js, standard library only):

```ts
import { randomBytes, createHash } from "node:crypto";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

const codeVerifier = base64url(randomBytes(32));
const codeChallenge = base64url(
  createHash("sha256").update(codeVerifier).digest(),
);
// Send code_challenge (S256) with the authorization request;
// send code_verifier to the token endpoint when exchanging the code.
```

Authorization request shape (values come from configuration, never hard-coded):

```text
https://provider.example/authorize
  ?response_type=code
  &client_id=$OAUTH_CLIENT_ID
  &redirect_uri=https://app.example/auth/callback
  &scope=openid%20profile%20email
  &state=$RANDOM_STATE
  &code_challenge=$CODE_CHALLENGE
  &code_challenge_method=S256
```

## Validation Checklist

- [ ] App registered with the provider; client ID and secret in the secret manager.
- [ ] Authorization code flow with PKCE implemented; `state` generated, stored, and verified.
- [ ] Callback exchanges the code server-side and validates the ID token (OIDC).
- [ ] Tokens stored server-side and encrypted at rest; none in browser storage.
- [ ] Refresh flow handles expiry and rotation; refresh failure signs the user out cleanly.
- [ ] Error paths tested: user denies consent, invalid state, expired code.
- [ ] Minimum scopes requested and documented.
- [ ] Accessibility: consent screen keyboard-operable; redirects preserve context.

## Expected Deliverables

- The OAuth client or provider integration, with configuration in one module per provider.
- Provider console setup notes (redirect URI, scopes, client ID reference).
- End-to-end verification of sign-in, refresh, sign-out, and the main error paths.
- Documentation of which scopes are requested and why.

## References

- [RFC 6749 — OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc9700)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 10017 — OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc10017)
- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [OpenID Connect](https://openid.net/connect/)
- Related skills in this repository: `authentication`, `better-auth`, `jwt`, `session-management`, `auth-security`.
