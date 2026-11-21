# Authentication Implementation

Add sign-in to an application: choose the method, implement sessions,
add MFA or passkeys where they fit, and verify the result.

## Inputs

- Who signs in (users, admins, service accounts) and how (password,
  social, passkey, magic link).
- The framework and session store in use.
- Compliance or security requirements (MFA, session lifetime).

## Steps

1. **Choose the approach** (`authentication`). Prefer a maintained
   auth framework over custom auth: `better-auth`, `authjs`,
   `clerk`, or `supabase-auth`. Custom password handling is a last
   resort, not a starting point.
2. **Design the session model** (`session-management`). Decide
   session lifetime, refresh, revocation, and what is stored
   server-side vs in the token. Prefer server-side sessions for
   anything sensitive.
3. **Implement sign-in and sign-up.** Validate inputs, hash passwords
   with a current algorithm, and never reveal whether an account
   exists in error messages.
4. **Add MFA where required** (`mfa`). TOTP or passkeys; keep
   recovery codes secure and single-use.
5. **Add passkeys where they fit** (`passkeys`). Passwordless sign-in
   for users who want it; keep a fallback method.
6. **Add authorization** (`rbac`). Define roles and permissions;
   enforce them on the server for every protected action, not just
   in the UI.
7. **Protect the auth endpoints** (`auth-security`,
   `csrf-protection`). Rate-limit login, use CSRF tokens for
   cookie-based flows, and set secure cookie flags.
8. **Handle tokens safely** (`jwt`, `secrets-management`). Short
   lifetimes, verified signatures, and secrets from the secret
   manager — never from code.
9. **Write tests** (`unit-testing`, `integration-testing`). Cover
   sign-in success and failure, session expiry, revocation,
   privilege escalation attempts, and MFA flows.
10. **Review the implementation** (`owasp`). Check the finished auth
    against the common failures: broken authentication, session
    fixation, and missing authorization checks.

## Outputs

- Working sign-in, sign-up, sign-out, and session handling.
- MFA and/or passkeys where required.
- Tests covering auth success, failure, and escalation cases.
- A note of auth decisions and any accepted risks.

## Checks

- [ ] Auth uses a maintained framework, not custom password code.
- [ ] Sessions expire, refresh, and revoke correctly.
- [ ] Authorization is enforced server-side on every protected action.
- [ ] Login is rate-limited; error messages do not leak account existence.
- [ ] No secrets or tokens in code, logs, or client storage.
- [ ] Tests pass, including escalation-attempt cases.
