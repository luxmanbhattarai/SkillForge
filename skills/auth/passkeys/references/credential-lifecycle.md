# Credential lifecycle

- Request discoverable credentials (`residentKey: "required"` in
  `authenticatorSelection`) for passkey sign-in, so the user does not
  have to type an identifier first. Request `userVerification: "preferred"`
  so platform biometrics are used when available without excluding
  authenticators that cannot verify the user.
- Attestation conveyance defaults to `"none"` for consumer apps: the
  server does not need to know which authenticator model created the
  credential. Verify attestation only when the product genuinely needs
  authenticator provenance (for example enterprise device policy), and
  then against a maintained trust store — never invent attestation
  checks.
- Store the signature counter and update it on each authentication. Treat
  a counter that goes backwards as a cloning signal to investigate, not
  as an automatic lockout: synced (multi-device) passkeys do not
  increment counters reliably, so the counter is a weak signal for them
  and a strong one only for single-device credentials.
- Keep credential records small and queryable by credential ID (indexed)
  and by user. Store public keys only; the private key never leaves the
  authenticator, and the server must never ask for it.
- Related Origin Requests (Level 3) let one passkey work across a small
  set of related origins (for example `example.com` and `app.example.com`
  when they are genuinely the same RP). Use them only for origins the
  product actually controls, and verify the current browser support
  before relying on them.
- Sessions after a passkey ceremony follow `session-management`:
  httpOnly, secure, sameSite cookies, server-side sessions when
  revocation matters.
