---
name: better-auth
description: >
  Set up and configure Better Auth for TypeScript applications: email and
  password sign-in, social OAuth providers, sessions, organizations, and
  two-factor authentication. Use when adding auth to a Next.js, Astro,
  Express, or other TypeScript app and the task mentions Better Auth,
  better-auth, email login, social login, magic links, or session cookies.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Better Auth

## Purpose

Better Auth is a framework-agnostic TypeScript authentication library that
ships email/password auth, social sign-in, sessions, and plugins behind one
typed API. This skill produces a working Better Auth setup wired to the
app's database and framework, with secure defaults, typed client helpers,
and database migrations applied.

## When to Use

- Adding authentication to a TypeScript app (Next.js, Astro, Express, Hono, or similar).
- The task mentions Better Auth, `better-auth`, email/password login, social login, or magic links.
- Replacing a hand-rolled auth implementation with a maintained library.
- Adding organizations, two-factor auth, or passkeys to an app that already uses Better Auth.

## When Not to Use

- The app is not TypeScript/JavaScript — use a maintained auth library for that stack instead, or the `oauth` skill for protocol-level work.
- Auth is delegated entirely to a hosted provider such as Clerk or Supabase Auth — use that provider's own docs and the `authentication` skill.
- The task only needs protocol details (token flows, PKCE) without a library — use `oauth`.

## Prerequisites

- A TypeScript project on a supported runtime (Node.js 26 LTS is the current LTS line as of November 2026; Node.js 24 LTS is also supported). The Better Auth CLI (`npx auth`) requires Node.js 22.12 or newer.
- Better Auth 1.7.x is the current stable line (1.7.27 as of November 2026). Current releases are ESM-only. Do not use the retired `npx @better-auth/cli` command — the CLI is now `npx auth@latest`.
- A database supported by a Better Auth adapter (PostgreSQL, MySQL, or SQLite via Drizzle or Prisma, or the built-in Kysely adapter).
- Environment variables available at runtime for the auth secret and base URL.
- The app's framework routing in place so auth handlers can be mounted.

## Official Documentation

- [Better Auth documentation](https://www.better-auth.com/docs) — installation, configuration, plugins, and framework guides.
- [Better Auth: create a database adapter](https://www.better-auth.com/docs/guides/create-a-db-adapter) — custom database adapters via `createAdapterFactory`.

## Required Workflow

1. Read the Better Auth installation guide for the project's framework before writing any code.
2. Install `better-auth` and the adapter package the project already uses (Drizzle or Prisma); do not introduce a second ORM just for auth.
3. Create the server auth instance in a single module (for example `src/lib/auth.ts`) with the database adapter, a secret from the environment, and the app's base URL.
4. Enable only the auth methods the product needs (email/password, chosen social providers, or magic link) — do not enable everything by default.
5. Generate and apply the database migration for the auth tables with the Better Auth CLI (`npx auth@latest generate` for an ORM schema, `npx auth@latest migrate` for the built-in Kysely adapter); verify the tables exist before starting the app.
6. Mount the auth handler on the framework's API route (`/api/auth/*`) following the framework guide.
7. Create the typed client (`createAuthClient`) in one shared module and use it for all client-side auth calls.
8. Add route protection: check the session on the server for every protected route or loader, never only in client components.
9. Verify the full flow end to end: sign up, sign in, sign out, session refresh, and password reset if enabled.
10. Run the Validation Checklist before reporting done.

## Implementation Standards

- Keep the auth instance in exactly one server module; never create a second instance with different options.
- Read the secret and base URL from environment variables; never hard-code them. `BETTER_AUTH_SECRET` must be at least 32 characters of high entropy (generate with `openssl rand -base64 32`); rotate it with `BETTER_AUTH_SECRETS` so existing sessions survive the rollover.
- Use the current stable `better-auth` release and record the installed version in the project lockfile only, not in prose.
- Configure cookie behavior explicitly for production: secure cookies, `httpOnly`, `sameSite: "lax"` at minimum, and a scoped path.
- Prefer database sessions for apps that need instant revocation; prefer stateless (JWT) sessions only when the app is read-heavy and revocation delay is acceptable.
- Use the adapter's migration tooling to create auth tables; do not hand-write the auth schema.
- Type the session payload: extend the user and session types through the library's documented inference instead of casting.
- Social providers need the provider's client ID and secret from the secret manager, plus the provider callback URL registered in the provider console.

## Best Practices

- Enable email verification for sign-up flows that send anything sensitive, and rate-limit verification requests.
- Turn on the two-factor plugin only after password auth works; add it as a second step, not in the same change.
- Use the organization plugin for team/multi-tenant apps instead of inventing a membership model.
- Keep auth-related redirects allow-listed: never redirect to a caller-supplied URL without checking it against an allow-list.
- Log auth events (sign-in, sign-out, failed attempts, password changes) without logging secrets or tokens.
- Test with a throwaway database: sign-up, sign-in, session expiry, and provider callback flows all need coverage.

## Security Considerations

- Never expose the auth secret, provider secrets, or database URL to the client bundle.
- Rotate the auth secret if it is ever committed or leaked; old sessions become invalid and users must sign in again.
- Use HTTPS in every environment that handles real credentials; secure cookies are ineffective over plain HTTP.
- Rate-limit sign-in and password-reset endpoints to slow credential stuffing; see `auth-security`.
- Validate the `origin`/`referer` on auth endpoints where the framework supports it, and keep CSRF protection enabled.
- Review the plugin list: each enabled plugin widens the auth surface, so disable unused plugins.
- Version-specific behavior (1.7.x): Better Auth ignores `x-forwarded-host` and `x-forwarded-proto` unless `advanced.trustedProxyHeaders` is set, so apps behind a proxy must configure trusted proxy headers explicitly or callbacks and cookies will use the wrong host and scheme.

## Performance Considerations

- Database sessions add one lookup per authenticated request; keep the session table indexed on the session token and user ID.
- Cache the session on the server for the duration of a single request instead of re-validating it in every component.
- Keep session payloads small; store profile details in the user table and fetch them only when needed.
- Choose a session expiry that matches the product: short-lived sessions with sliding refresh for sensitive apps, longer for low-risk ones.

## Common Mistakes

- Mounting the handler at the wrong route so `/api/auth/*` returns 404 — follow the framework guide's exact mount path.
- Creating the auth instance twice (once per route file) with diverging options — one module, imported everywhere.
- Forgetting the database migration and debugging "relation does not exist" errors — generate and apply migrations before running the app.
- Checking the session only on the client — client checks are UI hints; server checks enforce access.
- Committing `.env` values or pasting secrets into code — secrets live in the secret manager and environment only.
- Enabling social sign-in without registering the callback URL in the provider console — the provider rejects the flow.

## Examples

Minimal server instance with email/password auth (Drizzle adapter):

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
});
```

Typed client in a shared module:

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signOut, useSession } = authClient;
```

## Validation Checklist

- [ ] `better-auth` installed and the server instance created in one module.
- [ ] Database migration applied; auth tables exist in the database.
- [ ] Auth handler mounted and reachable at `/api/auth/*`.
- [ ] Sign-up, sign-in, and sign-out verified end to end.
- [ ] Protected routes reject unauthenticated requests on the server.
- [ ] Secrets come from the environment; none appear in source control.
- [ ] Cookie settings are secure in production (secure, httpOnly, sameSite).

## Expected Deliverables

- The auth server module and typed client module, wired to the app's database.
- Applied database migration for auth tables.
- Mounted auth handler route and server-side protection on protected routes.
- A short report of the flows verified end to end and any provider console steps still needed.

## References

- [Better Auth documentation](https://www.better-auth.com/docs) — installation, configuration, and plugins.
- [Better Auth GitHub repository](https://github.com/better-auth/better-auth) — source and releases.
- Related skills in this repository: `authentication`, `session-management`, `oauth`, `mfa`, `auth-security`.
