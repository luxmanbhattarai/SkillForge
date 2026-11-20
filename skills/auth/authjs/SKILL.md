---
name: authjs
description: >
  Implement authentication with Auth.js (formerly NextAuth.js) v5: OAuth and
  credentials providers, database vs JWT session strategies, adapters, callbacks,
  route protection with proxy/middleware, and deployment. Use when the task
  mentions Auth.js, NextAuth, next-auth, sign in with Google/GitHub, session
  strategy, Prisma/Drizzle adapter, or auth() in a Next.js or other
  JavaScript-framework app.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Auth.js

## Purpose

Auth.js (formerly NextAuth.js) is an open-source, runtime-agnostic
authentication library for JavaScript and TypeScript apps, with first-class
support for Next.js. It handles the sign-in side of auth — OAuth/OIDC
providers, email magic links, credentials, and sessions — so the app does
not hand-roll token exchanges, cookies, or CSRF protection. Auth.js proves
identity (authentication); what a signed-in user may do (authorization) is
the app's own code, covered by `authorization` and `rbac`.

## When to Use

- Adding sign-in to a Next.js (App Router), SvelteKit, SolidStart, Qwik, or Express app with Auth.js.
- Maintaining or upgrading an existing NextAuth.js / Auth.js integration.
- Choosing between database and JWT session strategies, or adding an adapter.
- The task mentions Auth.js, NextAuth, `next-auth`, `auth()`, providers, adapters, or session callbacks.

## When Not to Use

- Starting a brand-new TypeScript project from scratch — the team that
  maintains both libraries recommends `better-auth` for new projects (see
  Prerequisites). Use this skill when the project already uses Auth.js or
  has a specific reason to choose it.
- The project wants hosted auth with the least code — use `clerk` or `supabase-auth`.
- The task is only about the OAuth/OIDC protocol itself — use `oauth`.
- The task is only about what signed-in users may do — use `authorization` or `rbac`.

## Prerequisites

- **Project status (read before choosing Auth.js).** Auth.js v5 is still
  published under the `beta` tag (`next-auth@beta`; 5.0.0-beta.32 as of
  November 2026). The latest stable `next-auth` release is 4.24.15, which
  uses the older Pages Router API documented at next-auth.js.org. On
  22 September 2025 the Auth.js project joined Better Auth, and the
  maintaining team now recommends Better Auth for new projects while
  continuing security maintenance for Auth.js. Choose Auth.js v5 for
  existing Auth.js/NextAuth codebases and for App Router projects that
  specifically need it; for a genuinely new project, say so and point at
  `better-auth` unless the user has decided otherwise.
- Node.js and the target framework installed (Next.js App Router for the
  examples here; the same config shape applies to other supported
  frameworks with their own framework package).
- A database and adapter package if database sessions are wanted
  (for example `@auth/prisma-adapter` or `@auth/drizzle-adapter`).
- Provider console access (GitHub, Google, and so on) to register the app
  and obtain a client ID and secret.
- HTTPS on every environment handling real credentials.

## Official Documentation

- [Auth.js documentation](https://authjs.dev) — guides, providers, adapters, and reference for v5.
- [Auth.js installation guide](https://authjs.dev/getting-started/installation) — install, `AUTH_SECRET`, `auth.ts`, the route handler, and proxy setup.
- [Auth.js is now part of Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth) — the 22 September 2025 announcement and the maintainers' recommendation for new projects.
- [NextAuth.js v4 documentation](https://next-auth.js.org) — the stable 4.x line; consult it only when maintaining a v4 codebase. Do not mix v4 patterns (`getServerSession`, `authOptions`, `[...nextauth].ts`) into v5 code.

## Required Workflow

1. Confirm the choice: Auth.js v5 for an existing Auth.js/NextAuth codebase
   or a deliberate decision; otherwise recommend `better-auth` and stop.
2. Install the framework package: `npm install next-auth@beta` for Next.js.
   Do not install `@auth/core` directly; it is an internal dependency.
3. Generate the secret with the official CLI, `npx auth secret`, which
   writes `AUTH_SECRET` to the env file. `AUTH_SECRET` is the only
   mandatory environment variable; it encrypts tokens and email
   verification hashes.
4. Create the central config file (`auth.ts` at the project root) and
   export `handlers`, `signIn`, `signOut`, and `auth` from one `NextAuth()`
   call. There is no separate `authOptions` object in v5.
5. Add the catch-all Route Handler at `app/api/auth/[...nextauth]/route.ts`
   that re-exports `GET` and `POST` from `handlers`.
6. Add the optional proxy (`proxy.ts` on Next.js 16+, `middleware.ts` on
   Next.js 15 and below) that exports `auth` to keep the session alive on
   each request. The proxy refreshes session expiry; it is not by itself
   a complete authorization check.
7. Configure providers: OAuth providers with their client ID and secret
   (Auth.js auto-reads `AUTH_<PROVIDER>_ID` and `AUTH_<PROVIDER>_SECRET`
   from the environment), Credentials for email/password, or email magic
   links. Register the redirect URI in each provider console.
8. If database sessions are wanted, install an adapter, add its schema
   (users, accounts, sessions, verification tokens), and pass it to
   `NextAuth()`. The adapter's presence switches the default session
   strategy to `database`.
9. Add callbacks: `jwt` and `session` to shape the token and the session
   object (for example to expose the user ID or role), and `authorized`
   to gate routes in the proxy.
10. Protect routes server-side: check `auth()` in Server Components, Route
    Handlers, and Server Actions, not only in the proxy or the UI.
11. Verify sign-in, sign-out, session refresh, and the error paths end to
    end, then run the Validation Checklist.

## Implementation Standards

- One config file, one `NextAuth()` call. v5 has no `authOptions` and no
  `getServerSession`; the universal session read is `auth()`.
- Session strategy is chosen by configuration, not by accident: no adapter
  means the `jwt` strategy (an encrypted JWT in an httpOnly cookie, no
  database lookup, no instant server-side revocation); an adapter means the
  `database` strategy (an opaque session token in the cookie, session state
  in the database, revocable by deleting the row). Set `session.strategy`
  explicitly so the choice is visible.
- The Credentials provider does not create database sessions: with an
  adapter configured, Credentials sign-in requires an explicit
  `session: { strategy: "jwt" }`. Decide this up front — mixing OAuth with
  database sessions and Credentials with JWT sessions in one app is a
  common source of "signed in but no session" bugs.
- The `session` callback receives different inputs per strategy: with the
  JWT strategy it receives `{ session, token }`; with the database strategy
  it receives `{ session, user }`. Write the callback for the strategy in
  use; do not copy a callback written for the other strategy.
- Keep the session object minimal: user ID and the claims the UI needs
  (name, email, role). Do not put secrets, tokens, or large objects in it;
  JWT sessions live in a cookie, and Auth.js chunks cookies over the
  roughly 4 KB browser limit, which is a workaround, not a license to bloat.
- Authorization (roles, permissions, what a user may do) lives in the app's
  own checks, using the role or claims the `session` callback exposes. See
  `rbac` and `authorization`; Auth.js itself does not define roles.
- OAuth providers use the authorization code flow with PKCE where the
  provider supports it; Auth.js handles the exchange, `state`, and CSRF
  tokens internally. Never re-implement the exchange by hand. See `oauth`
  for the protocol background.
- Credentials `authorize()` must verify passwords with a maintained
  hasher (Argon2id or bcrypt) and return a generic failure for unknown
  users and wrong passwords alike. See `authentication` for password rules.
- Set `session.maxAge` and `session.updateAge` explicitly for the product's
  requirements instead of relying on defaults; document the chosen values.

## Best Practices

- Prefer OAuth providers over Credentials: fewer passwords to protect, no
  reset flow to maintain, and database sessions work without the JWT
  exception.
- Put provider credentials in the secret manager and rely on Auth.js's
  `AUTH_<PROVIDER>_ID` / `AUTH_<PROVIDER>_SECRET` auto-reading instead of
  passing secrets through code.
- Use the `authorized` callback for coarse route gating in the proxy, and
  re-check `auth()` inside every protected Server Component, Route Handler,
  and Server Action. The proxy is a convenience, not the security boundary.
- Expose the user ID on the session via the `session` callback; most apps
  need it for every data query, and it avoids a second lookup.
- Keep auth configuration in the one `auth.ts` file; route handlers and
  components import `auth`, `signIn`, and `signOut` from it rather than
  re-creating config.
- Test with a real provider in development (a dev OAuth app) rather than
  mocking the whole flow; the redirect and callback steps are where
  integrations break.

## Security Considerations

- `AUTH_SECRET` must be long, random, and unique per environment; rotating
  it invalidates all JWT sessions and email verification hashes, so rotate
  deliberately and expect signed-out users.
- Never expose `AUTH_SECRET` or provider secrets to client code; they live
  in server-only environment variables.
- Auth.js issues httpOnly cookies and has built-in CSRF protection for its
  own endpoints. The app's own forms and mutations still need CSRF
  protection where applicable — see `csrf-protection`.
- Database sessions are revocable; JWT sessions are not until they expire.
  If the product needs "sign out everywhere" or instant revocation after a
  password change, use database sessions.
- The proxy (`proxy.ts` / `middleware.ts`) runs before the route; it can
  redirect unauthenticated users, but it must not be the only check.
  Server Actions and Route Handlers are callable directly, so each one
  verifies the session itself.
- Rate-limit the sign-in endpoints Auth.js exposes and any custom
  Credentials form, to slow credential stuffing. Auth.js does not
  rate-limit for you.
- Keep `next-auth` updated: v5 beta releases include security fixes, and
  beta versions can change behavior between releases. Pin the exact beta
  version and read the release notes before upgrading.
- Email magic-link and verification tokens are single-use and expiring;
  never log them, and send them over the app's real mail provider, not a
  development stub, in production.

## Performance Considerations

- Database sessions cost one indexed lookup per authenticated request;
  JWT sessions cost a decryption instead. Both are fast; choose on
  revocation needs, not on micro-benchmarks.
- The proxy runs on every matched request; keep its matcher narrow so
  static assets and public routes skip it.
- Cache the `auth()` result for the duration of a request instead of
  calling it per component; in React Server Components, wrap it in
  React's `cache()` or read it once in a layout and pass it down.
- Keep the session payload small: large JWT sessions inflate every request
  and response through cookie chunking.

## Common Mistakes

- Copying v4 patterns into v5 — `getServerSession`, `authOptions`, or a
  `pages/api/auth/[...nextauth].ts` file — none of which exist in v5.
- Adding an adapter and then wondering why the `session` callback's `token`
  is undefined — the adapter switched the strategy to `database`, so the
  callback receives `user`, not `token`.
- Using the Credentials provider with an adapter and no explicit JWT
  strategy — sign-in succeeds but no session is stored.
- Protecting routes only in the proxy and leaving Server Actions and Route
  Handlers unchecked — every entry point verifies the session itself.
- Putting the role or permission check in the UI only — the server check is
  the one that counts; the UI check is cosmetic.
- Committing `AUTH_SECRET` or provider secrets to the repository — they
  belong in the secret manager and env files that are never committed.
- Forgetting the catch-all route handler — Auth.js's own endpoints
  (`/api/auth/signin`, `/api/auth/callback/...`, `/api/auth/session`)
  return 404 without it.

## Examples

Minimal v5 config with an OAuth provider and a database adapter:

```ts
// auth.ts — Auth.js v5. AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are read
// from the environment automatically; AUTH_SECRET is mandatory.
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [GitHub],
  callbacks: {
    // Database strategy: the callback receives { session, user }.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

Route handler and proxy (Next.js 16):

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

```ts
// proxy.ts — Next.js 16+. On Next.js 15 and below, use middleware.ts
// with `export { auth as middleware }` instead.
export { auth as proxy } from "@/auth";
```

Protecting a Server Component:

```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");
  return <main>Signed in as {session.user.email}</main>;
}
```

## Validation Checklist

- [ ] `next-auth@beta` installed and pinned; `AUTH_SECRET` set per environment via the secret manager.
- [ ] `auth.ts`, the catch-all route handler, and the proxy/middleware file all present and wired.
- [ ] Session strategy chosen deliberately and set explicitly; Credentials (if used) paired with the JWT strategy.
- [ ] OAuth providers registered with matching redirect URIs; secrets in the environment, not in code.
- [ ] `session` callback matches the strategy in use (`token` for JWT, `user` for database).
- [ ] Every protected page, Route Handler, and Server Action checks `auth()` server-side.
- [ ] Sign-in, sign-out, session refresh, and the main error paths verified end to end.
- [ ] Roles and permissions enforced by app code, not assumed from Auth.js.

## Expected Deliverables

- Working sign-in and sign-out with the chosen providers and session strategy.
- The `auth.ts` config, route handler, and proxy/middleware files.
- Server-side protection on all protected routes and API entry points.
- A short report of the flows verified, the session strategy chosen and
  why, and any provider console setup still needed.

## References

- [Auth.js documentation](https://authjs.dev)
- [Auth.js installation guide](https://authjs.dev/getting-started/installation)
- [Auth.js is now part of Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth)
- Related skills in this repository: `authentication`, `better-auth`, `oauth`, `session-management`, `jwt`, `mfa`, `rbac`, `authorization`, `auth-security`, `csrf-protection`.
