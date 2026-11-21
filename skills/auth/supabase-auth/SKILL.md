---
name: supabase-auth
description: >
  Implement authentication with Supabase Auth: email/password, magic link and
  OTP, OAuth social sign-in, phone auth, passkeys, MFA with TOTP, password
  recovery, JWT sessions, and Row Level Security (RLS) authorization. Use when
  the task mentions Supabase Auth, supabase-js, @supabase/ssr, getClaims,
  getUser, RLS policies, auth.uid(), MFA enrollment, or protecting Supabase
  tables and Edge Functions.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Supabase Auth

## Purpose

Supabase Auth is the authentication service in every Supabase project: it
creates users, signs them in (email/password, magic link, OTP, social
OAuth, phone, SSO, passkeys), and issues a signed JWT access token plus a
refresh token. Authentication (proving who the caller is) is Supabase
Auth's job; authorization (which rows the caller may touch) is enforced by
Postgres Row Level Security (RLS) policies that read the JWT. A signed-in
user is not automatically an authorized user — the RLS policies decide.

## When to Use

- Adding sign-in to an app already using Supabase (or choosing Supabase
  as the backend).
- Wiring Supabase Auth into SSR (Next.js, SvelteKit, Astro, Remix,
  Nuxt) with cookie-based sessions.
- Adding MFA, passkeys, phone auth, or social providers to a Supabase app.
- Writing or auditing RLS policies that use `auth.uid()` and JWT claims.
- The task mentions Supabase Auth, `supabase.auth`, `getClaims`,
  `getUser`, RLS, or `auth.uid()`.

## When Not to Use

- The app does not use Supabase as its backend — use `authentication`
  with a library (`better-auth`, `authjs`) or `clerk` for hosted auth.
- The task is only about the OAuth/OIDC protocol — use `oauth`.
- The task is only about passkey/WebAuthn ceremony details — use `passkeys`.
- The task is only about general MFA design — use `mfa`.

## Prerequisites

- A Supabase project (hosted, or self-hosted) with the Auth service enabled.
- `@supabase/supabase-js` v2 for the client; `@supabase/ssr` for
  server-side rendering with cookie-based sessions.
- The project's URL and publishable key (public, safe in client code) and
  secret key (server-only; bypasses RLS).
- Social provider console access for each OAuth provider to be enabled,
  and a phone provider (Twilio, MessageBird, or Vonage) for SMS auth.
- HTTPS on every environment handling real credentials.
- A custom SMTP provider configured before production: the built-in email
  service is rate-limited and not meant for production use.
- Version note: current stable as of 2026-11-20 — the v2 client
  (`@supabase/supabase-js`) is the current stable major line; check
  the Supabase docs linked in Official Documentation for the newest
  minor before starting.

## Official Documentation

- [Supabase Auth overview](https://supabase.com/docs/guides/auth) — methods, JWT model, and the auth/authorization split.
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr`, browser/server clients, the proxy refresh, and `getClaims` vs `getUser` vs `getSession`.
- [Supabase Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa) — TOTP and phone factors, enrollment, challenge/verify, and AAL enforcement in RLS.
- [Passkey authentication](https://supabase.com/docs/guides/auth/passkeys) — WebAuthn passkeys (experimental), RP configuration, and the `auth.passkey` APIs.
- [Integrating with Supabase Auth (Edge Functions)](https://supabase.com/docs/guides/functions/auth-legacy-jwt) — auth context and RLS in Edge Functions.

## Required Workflow

1. Decide the sign-in methods (email/password, magic link, OTP, social
   OAuth, phone, passkeys) and enable each in the Dashboard under
   Authentication, with the provider credentials where needed.
2. Set the project's Site URL and redirect URL allowlist to the real
   production origins; email links and OAuth callbacks only work for
   allowlisted URLs.
3. Install `@supabase/supabase-js` and, for SSR, `@supabase/ssr`. Create
   the two client utilities: a browser client (`createBrowserClient`) for
   components that run in the browser, and a server client
   (`createServerClient`) per request for Server Components, Server
   Actions, and Route Handlers.
4. Add the proxy (Next.js 16 `proxy.ts`; `middleware.ts` on older
   versions) that refreshes the session by calling
   `supabase.auth.getClaims()` on every request and writes the refreshed
   cookies. The proxy is what keeps users signed in across server renders.
5. Implement sign-up and sign-in with the `supabase.auth` methods
   (`signUp`, `signInWithPassword`, `signInWithOtp`,
   `signInWithOAuth`, `signInWithPasskey`), and password recovery with
   `resetPasswordForEmail`. Use the PKCE flow for OAuth.
6. Verify identity server-side with `getClaims()` (local JWT verification;
   refreshes the token when close to expiry) or `getUser()` (a network
   call to the Auth server for the freshest user record). Never trust
   `getSession()` server-side: it reads the session from storage without
   re-validating it.
7. Write RLS policies for every table exposed through the Data API: enable
   RLS (deny-all by default) and add explicit policies, usually comparing
   a column to `auth.uid()`.
8. If MFA is in scope, add enrollment, challenge, and unenrollment flows
   with `supabase.auth.mfa`, and enforce the `aal` claim (`aal1` vs
   `aal2`) in RLS policies and server checks.
9. If passkeys are in scope, enable them in the Dashboard, configure the
   Relying Party ID (the bare domain) and origins, and use
   `registerPasskey()` / `signInWithPasskey()`.
10. Test sign-up, sign-in, sign-out, recovery, OAuth callbacks, MFA, and
    the RLS policies (including as an anonymous caller and as a different
    user), then run the Validation Checklist.

## Implementation Standards

- A session is two tokens: an access token (a JWT, one hour by default)
  and a refresh token (an opaque, single-use string). Refresh tokens are
  rotated on use; reuse of an already-used refresh token revokes the
  whole session, with a short grace window for the normal SSR round trip.
  Refresh in exactly one place (the proxy) — refreshing in two places
  signs users out at random.
- Server-side identity checks use `getClaims()` to protect pages and data
  (it verifies the JWT signature locally against a cached JWKS when the
  project uses asymmetric signing keys, the default for new projects),
  and `getUser()` when the freshest user record is needed. `getSession()`
  is for forwarding the raw session to another service, not for proving
  identity.
- RLS is the authorization layer and it is not optional: anyone holding
  the publishable key can query the Data API, so a table without RLS (or
  with a policy of `true` for `authenticated`) is open to every account,
  and sign-up is open by default. Enable RLS on every table and write
  policies that compare row ownership to `auth.uid()`.
- Authorize on `app_metadata` (server-managed, settable only with the
  secret key) or on a role table the app owns — never on `user_metadata`,
  which the user can edit. The Security Advisor flags policies that read
  `user_metadata`.
- For policy performance, wrap `auth.uid()` in a scalar subquery —
  `(select auth.uid())` — so Postgres evaluates it once per query instead
  of once per row, and index every column a policy filters on.
- MFA enforcement reads the `aal` claim in the JWT: `aal1` after a
  conventional sign-in, `aal2` after a second factor. JWTs without an
  `aal` claim are `aal1`. Enforce MFA with restrictive RLS policies
  (`as restrictive`) and server-side checks, not only in the UI. The
  `amr` claim records which methods authenticated the session, most
  recent first.
- The secret (service role) key bypasses RLS and must only be used from a
  trusted server (admin operations, Edge Functions with care). It must
  never appear in client code, and the publishable key must never be
  treated as a secret.
- Passwords follow the `authentication` skill: check new passwords against
  a compromised-password blocklist (Supabase exposes leaked-password
  protection in the Dashboard), and do not impose composition rules.
- Passkeys are experimental in Supabase Auth: the JavaScript client
  requires opting in (`auth: { experimental: { passkey: true } }`) and
  registration requires an existing, confirmed, non-anonymous user.
  Passkeys are bound to the Relying Party ID (the bare domain), so choose
  the production domain before users register credentials.

### Testing Strategy

- Test RLS policies as each role, with real queries: anonymous,
  authenticated, and another user must each see exactly what the
  policy allows — a policy of `true` for `authenticated` is an open
  table.
- Test the refresh flow under concurrency: two simultaneous requests
  must not double-refresh and sign the user out, and refresh must
  happen in exactly one place.
- Test MFA enforcement at the policy level, not only in the UI: a
  request with an `aal1` JWT must fail where `aal2` is required.
- Test the OAuth callback and PKCE flow in staging, and test email
  links (confirmation, recovery, magic link) against the production
  SMTP provider before launch.

## Best Practices

- Disable open sign-up ("Allow new users to sign up") when the app is
  invite-only or internal; while it is on, anyone with the project URL
  and publishable key can create an account.
- Use the PKCE flow for all OAuth sign-ins; it is the default in
  `supabase-js` v2 and protects the code exchange. See `oauth`.
- Keep auth logic in the client utilities (`lib/supabase/client.ts` and
  `lib/supabase/server.ts`); route handlers and components call them
  rather than constructing clients inline.
- Handle the OAuth callback with a dedicated route that exchanges the
  code for a session server-side, then redirects — never parse tokens
  from the URL on the client.
- Show the user their MFA factors and passkeys in settings, with rename
  and revoke controls; notify by email when a factor is added or removed.
- Use the Security Advisor and the Auth logs in the Dashboard before
  launch to catch missing RLS policies and misconfiguration.
- For Edge Functions, pass the caller's `Authorization` header into the
  function client so RLS applies; use the secret key only when the
  function must act as an administrator.

## Security Considerations

- The publishable key is public by design. The security boundary is RLS
  plus the secret key's server-only use — not the key's secrecy.
- A policy for `authenticated` with condition `true` opens the table to
  any stranger who creates an account. Every policy must scope rows to
  the caller (usually `auth.uid() = user_id`) or to an explicit role.
- Never trust `getSession()` on the server, and never trust `user_metadata`
  for authorization. Both are client-influenced.
- Refresh-token reuse detection revokes sessions on reuse; treat
  unexpected sign-outs as a possible token-theft signal, not only as a bug.
- Rate-limit auth endpoints (sign-up, sign-in, OTP, recovery) in the
  Dashboard settings, and enable CAPTCHA protection for sign-up and
  sign-in if the project is publicly reachable.
- Email change and password recovery links are single-use and expiring;
  confirm the user's email before the account can do anything sensitive.
- Anonymous sign-ins create real sessions with the `anonymous` method in
  the `amr` claim; RLS policies must decide explicitly whether anonymous
  users may read or write, or they inherit whatever `authenticated` allows.
- Phone (SMS) factors are the weakest second factor (SIM swap,
  interception); prefer TOTP or passkeys, and see `mfa`.

## Performance Considerations

- Prefer `getClaims()` over `getUser()` in hot paths: claims are verified
  locally, while `getUser()` makes a network call to the Auth server on
  every invocation.
- RLS policies run per row; index policy columns and use the
  `(select auth.uid())` form so the JWT is parsed once per query.
- Creating a Supabase client is lightweight; create a fresh server client
  per request (it needs that request's cookies) and rely on
  `createBrowserClient`'s singleton on the client.
- Token refresh happens in the proxy on each request when the token is
  near expiry; the proxy's route matcher should skip static assets and
  public routes that do not need a session.

## Common Mistakes

- Shipping tables without RLS — the Data API is public to anyone with the
  publishable key, and the app "works" in development while leaking data.
- Authorizing on `user_metadata` — the user controls it; use
  `app_metadata` or a role table.
- Trusting `getSession()` server-side to decide who the user is — it does
  not verify the token.
- Refreshing the session in both the proxy and a Server Component —
  refresh-token reuse revokes the session and users get signed out.
- Forgetting the proxy entirely in SSR — server renders see an expired
  token and the user appears signed out after an hour.
- A policy of `true` for `authenticated` on a table that should be
  user-scoped — every signed-in user can read every row.
- Using the secret key in client code or in an Edge Function that does not
  need admin rights — it bypasses every RLS policy.
- Choosing the Relying Party ID carelessly for passkeys — credentials are
  bound to it, and changing it later orphans registered passkeys.

## Examples

Sign-in with email and password (browser):

```ts
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password, // from the sign-in form input — never a hardcoded literal
});
if (error) {
  // Show a generic message; do not reveal whether the email exists.
  throw new Error("Invalid email or password");
}
```

Server-side identity check (Server Component or Route Handler):

```ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const supabase = await createClient();
// getClaims() verifies the JWT; getSession() would not.
const { data, error } = await supabase.auth.getClaims();
if (error || !data?.claims) redirect("/login");
```

Row Level Security policy (user-scoped reads):

```sql
-- Enable RLS (deny-all until a policy exists), then allow owners to
-- read their own rows. (select auth.uid()) is evaluated once per query.
alter table public.notes enable row level security;

create policy "Owners can read their own notes"
  on public.notes for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

MFA enrollment and verification (TOTP):

```ts
// Enroll: returns a QR code (totp.uri) and a secret; the user proves
// enrollment by entering a valid code before the factor is verified.
const { data: factor } = await supabase.auth.mfa.enroll({
  factorType: "totp",
  friendlyName: "Authenticator app",
});

// Sign-in challenge step: challenge, then verify the code from the app.
const { data: challenge } =
  await supabase.auth.mfa.challenge({ factorId: factor.id });
const { data } = await supabase.auth.mfa.verify({
  factorId: factor.id,
  challengeId: challenge.id,
  code: codeFromUser,
});
// A verified factor upgrades the session JWT to aal2.
```

## Validation Checklist

- [ ] Sign-up, sign-in, sign-out, password recovery, and OAuth callbacks verified end to end.
- [ ] SSR proxy refreshes the session; server renders stay signed in past the one-hour token expiry.
- [ ] Server-side checks use `getClaims()` or `getUser()`; no server code trusts `getSession()`.
- [ ] RLS enabled on every table, with policies scoped to `auth.uid()` or an explicit role; no `true` policies for `authenticated` on private data.
- [ ] Authorization reads `app_metadata` or a role table, never `user_metadata`.
- [ ] Secret key used only from trusted servers; never in client code.
- [ ] MFA (if in scope) enforced via the `aal` claim in RLS and server checks, not only in the UI.
- [ ] Custom SMTP configured; redirect URL allowlist set to real origins; open sign-up disabled if the app is private.

## Expected Deliverables

- Working sign-up, sign-in, sign-out, recovery, and (if in scope) OAuth, MFA, and passkey flows.
- Browser and server client utilities plus the session-refresh proxy.
- RLS policies for every exposed table, with a note of which policy protects which table.
- A short report of the flows verified and any Dashboard configuration still needed.

## References

- [Supabase Auth overview](https://supabase.com/docs/guides/auth)
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [Passkey authentication](https://supabase.com/docs/guides/auth/passkeys)
- Related skills in this repository: `authentication`, `oauth`, `session-management`, `jwt`, `mfa`, `passkeys`, `rbac`, `authorization`, `auth-security`, `csrf-protection`.
