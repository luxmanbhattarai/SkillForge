---
name: jwt
description: >
  Issue and verify JSON Web Tokens correctly: choosing a signing algorithm,
  setting claims and expiry, verifying signatures and claims, and rotating
  keys. Use when the task mentions JWT, JSON Web Token, bearer tokens, token
  signing or verification, access tokens, RS256, HS256, JWKS, or passing
  identity between services with a signed token.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# JWT

## Purpose

A JSON Web Token (JWT) is a compact, signed token that carries claims
between parties. This skill covers issuing JWTs with the right algorithm
and claims, verifying them strictly (signature, expiry, issuer, audience),
and rotating signing keys — using a maintained JWT library, never
hand-rolled crypto.

## When to Use

- Issuing or verifying access tokens, ID tokens, or service-to-service tokens.
- The task mentions JWT, JSON Web Token, bearer tokens, token signing, RS256, HS256, or JWKS.
- Passing identity or permissions between services that share a trust root.
- Debugging "invalid token" errors in an existing JWT integration.

## When Not to Use

- Browser session state for a single web app — server-side sessions are usually simpler and revocable; see `session-management`.
- The task is the OAuth exchange that produces the token — use `oauth`.
- Long-lived credentials for a user — use refresh tokens with short-lived JWTs instead; see `oauth` and `session-management`.

## Prerequisites

- A maintained JWT library for the stack (for example `jose` for JavaScript/TypeScript; the 6.x line is current as of November 2026, and the API shown here works on jose 5.x and 6.x).
- A signing key: an asymmetric key pair (RS256/ES256) for tokens verified by other parties, or a strong secret (HS256) only when issuer and verifier are the same service.
- Agreement on the claims the token carries and the issuer/audience values.
- HTTPS on every environment that transmits tokens.
- Version range: jose 6.x (the API shown also works on 5.x).

## Official Documentation

- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519) — the token format specification.
- [RFC 8725 — JSON Web Token Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725) — security guidance for implementers.
- [jwt.io](https://jwt.io/) — token decoder and library directory.
- [jose library (JavaScript)](https://github.com/panva/jose) — a maintained JWT/JWK library for JavaScript runtimes.

## Required Workflow

1. Decide the use: access token between services, ID token from an identity provider, or short-lived token for a specific action.
2. Choose the algorithm: RS256 or ES256 (asymmetric) when any other party verifies the token; HS256 only when one service both signs and verifies.
3. Generate the signing key properly (a real RSA/EC key pair from a key generator or the platform's key service), and store the private key in the secret manager.
4. Define the claims: `iss`, `aud`, `sub`, `iat`, `exp`, and only the application claims needed (user ID, roles); never sensitive data.
5. Issue tokens with a short expiry — 15 minutes is a good default for access tokens.
6. Verify strictly: signature with the expected algorithm and key, `exp`, `nbf` if present, `iss`, and `aud` — every claim, every time.
7. Publish the public keys as a JWKS endpoint when other parties verify tokens.
8. Plan rotation before launch: keys carry a `kid`, new keys are published alongside old ones, and old keys retire after the longest token lifetime.
9. Test the failure cases: expired token, wrong audience, wrong issuer, tampered payload, `alg: none`.
10. Run the Validation Checklist.

## Implementation Standards

- Use a maintained JWT library; never implement signing or verification by hand.
- Never accept `alg: none`, and never let the token's header choose the algorithm — the verifier pins the expected algorithm.
- Verify the signature before trusting any claim; an unverified payload is attacker input.
- Keep access tokens short-lived (minutes, not hours or days); use refresh tokens for long sessions.
- Put the minimum in claims: user ID and roles are fine; passwords, secrets, and personal data are not — JWT payloads are only base64-encoded, not encrypted.
- Include `kid` in the header so verifiers can select the right key during rotation.
- Reject tokens with an unexpected issuer or audience, even if the signature is valid.
- Store signing secrets and private keys in the secret manager, never in source control or client code.

## Best Practices

- Prefer asymmetric signing (RS256/ES256) so verifiers need only the public key.
- Use the library's built-in verification options (issuer, audience, clock tolerance) instead of checking claims manually.
- Allow a small clock-skew leeway (about a minute) when checking `exp` and `nbf`.
- Log verification failures with the reason (expired, bad signature, wrong audience) but never log the token itself.
- Keep token size small: large tokens bloat every request header.
- Document the claims contract (which claims exist, their types, and their meaning) next to the issuing code.

## Security Considerations

- Algorithm confusion (an attacker switching RS256 to HS256 and signing with the public key) is a classic JWT attack; pin the algorithm.
- A leaked signing key lets an attacker mint tokens for any user until the key is rotated and the old key retired.
- Tokens cannot be revoked individually: keep them short-lived and rely on refresh-token revocation for logout.
- Never put a JWT in a URL query string; URLs leak through logs, referers, and browser history.
- Validate `aud` and `iss` strictly; a token minted for another service must not work here.
- Weak HS256 secrets are brute-forceable; use a long random secret (at least 256 bits) from the secret manager.

## Performance Considerations

- Asymmetric verification (RS256) is slower than HS256 but fast enough for per-request use; do not skip verification to save time.
- Cache JWKS responses with their cache headers; fetching keys on every request adds latency and load.
- Keep tokens small so headers stay small; avoid stuffing permissions lists into every token.
- Verification is CPU-bound: in high-throughput services, verify once per request and pass the decoded claims down, never re-verify per component.

## Common Mistakes

- Trusting the payload without verifying the signature — the payload is trivially forgeable.
- Accepting any algorithm, including `none` — pin the expected algorithm.
- Long-lived access tokens (days) — a stolen token stays valid for days; use short expiry plus refresh.
- Putting sensitive data in claims — anyone can decode the payload.
- Using the same key for signing and encryption, or the same secret across environments — separate keys per purpose and environment.
- Forgetting `kid` — rotation becomes a breaking change instead of a gradual one.

## Examples

Signing and verifying with `jose` (TypeScript):

```ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Issue a short-lived access token (HS256; same service signs and verifies).
const token = await new SignJWT({ role: "member" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer("https://app.example")
  .setAudience("https://api.example")
  .setSubject("user_123")
  .setIssuedAt()
  .setExpirationTime("15m")
  .sign(secret);

// Verify strictly: the algorithm is pinned, and issuer and audience are checked.
const { payload } = await jwtVerify(token, secret, {
  algorithms: ["HS256"],
  issuer: "https://app.example",
  audience: "https://api.example",
});
```

## Validation Checklist

- [ ] Maintained JWT library in use; no hand-rolled signing or verification.
- [ ] Algorithm pinned by the verifier; `alg: none` rejected.
- [ ] Tokens short-lived with `iss`, `aud`, `sub`, `iat`, and `exp` set.
- [ ] Verification checks signature, expiry, issuer, and audience on every request.
- [ ] Signing keys in the secret manager; public keys published as JWKS where needed.
- [ ] Key rotation plan documented with `kid` support.
- [ ] Failure cases tested: expired, tampered, wrong audience, wrong issuer, `alg: none`.

## Expected Deliverables

- Token issuing and verification code using a maintained library.
- The claims contract documented (claims, types, meaning).
- Key generation and rotation notes, with keys stored in the secret manager.
- Tests covering the valid path and the main failure cases.

## References

- [RFC 7519 — JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725 — JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [jwt.io](https://jwt.io/)
- Related skills in this repository: `oauth`, `session-management`, `authentication`, `auth-security`.
