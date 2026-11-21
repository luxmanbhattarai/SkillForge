---
name: clerk
description: >
  Implement authentication and user management with Clerk: hosted sign-in and
  sign-up components, session tokens, Organizations with roles and permissions,
  social connections, Svix-signed webhooks, middleware/route protection with
  auth.protect(), and user management. Use when the task mentions Clerk, hosted
  auth, SignIn/SignUp components, Organizations, org roles, Clerk webhooks, or
  clerkMiddleware.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Clerk

## Purpose

Clerk is a hosted authentication and user-management platform: it owns the
sign-in and sign-up UI, sessions, user storage, social connections, MFA and
passkeys, Organizations, and webhooks, so the app integrates auth with a
small SDK instead of building it. Clerk proves identity (authentication) and
carries organization roles and permissions in the session token; the app
still decides what a user may do (authorization) by checking those claims
at each resource — see `authorization` and `rbac` for the concepts.

## When to Use

- Adding sign-in, sign-up, and user management to a Next.js, React, Expo,
  or other supported app with the least custom auth code.
- The product needs Organizations (teams/workspaces) with roles and
  permissions out of the box.
- Syncing user and organization changes into the app's own database via
  webhooks.
- The task mentions Clerk, `clerkMiddleware`, `auth.protect()`, `SignIn`,
  `SignUp`, `UserButton`, Organizations, or Clerk webhooks.

## When Not to Use

- The project must own all user data or run fully self-hosted — use
  `better-auth`, `authjs`, or `supabase-auth` (self-hosted) instead.
- The app is a simple single-tenant tool where a maintained library is
  cheaper than a hosted dependency — use `authentication` with a library.
- The task is only about the OAuth/OIDC protocol — use `oauth`.
- The task is only about session cookies and expiry in a custom stack —
  use `session-management`.

## Prerequisites

- A Clerk account and application (the Clerk CLI can provision a
  claimable application without signing in first; claim it in the
  Dashboard before going to production).
- Current line: Clerk Core 3 (`@clerk/nextjs` v7). Core 2 (`@clerk/nextjs`
  v6) is the previous major; the Core 3 upgrade guide covers the breaking
  changes. Do not mix Core 2 and Core 3 patterns.
- Node.js 20.9.0+; for `@clerk/nextjs`, Next.js 15.2.8+ or 16.0.10+ on
  Next.js 16.
- The pricing tier the product needs, confirmed on clerk.com before
  designing around a limit: Clerk's paid plans are priced by monthly
  active users, and tiers differ in included features (for example
  Organizations and SAML SSO availability). Never quote a price from
  memory — check the current pricing page.

## Official Documentation

- [Clerk documentation](https://clerk.com/docs) — guides and reference for every SDK.
- [Next.js Quickstart (App Router)](https://clerk.com/docs/nextjs/getting-started/quickstart) — the CLI setup path, provider, middleware file naming, and auth controls.
- [`auth()` reference](https://clerk.com/docs/reference/nextjs/app-router/auth) — `auth.protect()`, role/permission checks, and machine-token options.
- [Upgrading to Clerk Core 3](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3) — breaking changes from Core 2, including the `Show` component and package renames.
- [Sync Clerk data with webhooks](https://clerk.com/docs/guides/development/webhooks/syncing) — webhook setup, event types, and handling out-of-order and duplicate events.
- [Organizations overview](https://clerk.com/docs/guides/organizations/overview) — Organizations, memberships, roles, and permissions.
- [Clerk CLI](https://clerk.com/docs/cli) — `init`, `doctor`, user management, and config commands.

## Required Workflow

1. Set up with the Clerk CLI: `npx -y clerk@latest init`. It detects the
   framework and package manager, installs `@clerk/nextjs`, writes the
   publishable and secret keys to `.env.local`, and creates the middleware
   file and auth routes. Do not hand-install the SDK or hand-write setup
   unless `init` has run and failed.
2. Verify with `npx -y clerk@latest doctor`, start the app, and confirm
   sign-in, sign-up, and the signed-in user controls are visible.
3. Wrap the app in `<ClerkProvider>` inside `<body>` (not around `<html>`),
   and add sign-in/sign-up controls (`SignInButton`, `SignUpButton`,
   `Show`, `UserButton`) to the layout. `<Show>` reads the request, so wrap
   it in `<Suspense>`.
4. Name the middleware file by the Next.js version: `proxy.ts` on Next.js
   16+, `middleware.ts` on 15 and below. Its contents are the same: a call
   to `clerkMiddleware()` from `@clerk/nextjs/server`.
5. Protect resources, not just routes: every protected page, Route Handler,
   and Server Action starts with `await auth.protect()` — optionally with
   `role`, `permission`, or `has` — before doing work. Middleware alone is
   not sufficient protection, because Server Actions are called by ID, not
   by path.
6. Configure sign-in methods in the Dashboard (email/password, social
   connections, MFA, passkeys) and the session token's custom claims if the
   app needs role or plan data without an extra API call.
7. If Organizations are needed, enable them (the CLI supports
   `npx -y clerk@latest enable orgs`), add the `OrganizationSwitcher`, and
   check `orgId` / `orgRole` from `auth()` at each resource. Pick the
   membership mode deliberately: `Membership required` is the default
   (for instances created after 2025-08-22) and routes every signed-in
   user through organization selection, disabling Personal Accounts —
   choose `Membership optional` if the app also serves individuals.
8. If the app keeps its own user table, add a webhook endpoint that
   verifies the Svix signature, handles `user.created`, `user.updated`,
   and `user.deleted` (and organization events), and upserts idempotently.
9. Test sign-up, sign-in, sign-out, the organization flows, and webhook
   delivery (ngrok or a similar tunnel for local testing), then run the
   Validation Checklist.

## Implementation Standards

- `auth()` from `@clerk/nextjs/server` is async — always `await auth()`.
  It returns the lightweight auth state (`userId`, `sessionId`, `orgId`,
  `orgRole`, `has()`); use `currentUser()` only when the full user object
  is needed, because it makes an API call.
- `auth.protect()` is the protection primitive: call it directly on the
  `auth` helper (`await auth.protect()`), not on the result of `auth()`.
  With no arguments it requires a signed-in user (redirecting to sign-in
  otherwise); with `role`, `permission`, or `has` it additionally
  requires authorization (returning 404 when the user is signed in but
  not authorized). Call it at the top of every protected resource.
- Core 3 component model: a single `Show` component replaces `SignedIn`,
  `SignedOut`, and `Protect`. Package renames: `@clerk/clerk-react` is now
  `@clerk/react`, `@clerk/clerk-expo` is now `@clerk/expo`. Use
  `@clerk/nextjs`, not `@clerk/clerk-react`, in Next.js apps.
- Session tokens are JWTs verified locally; custom claims are configured
  in the Dashboard under Sessions. Prefer reading role, plan, and feature
  data from the session token over maintaining a synced user table when
  the data fits (Clerk's guidance: metadata up to roughly 1.2 KB belongs
  in the token; larger app data belongs in the app's own database).
- Metadata has three buckets with different trust levels: `publicMetadata`
  (readable by the client, writable server-side only — the right place for
  roles), `privateMetadata` (server-side only), and `unsafeMetadata`
  (editable by the user from the client — never use it for authorization).
- Machine access (API keys, machine-to-machine tokens, OAuth tokens) is
  checked with the same `auth()` call using the `acceptsToken` option;
  do not build a parallel API-key system unless the product needs one.
- Webhook handlers verify the Svix signature on the raw body before doing
  anything else, using Clerk's documented `verifyWebhook` helper (from
  `@clerk/backend/webhooks`, which reads the signing secret from
  `CLERK_WEBHOOK_SIGNING_SECRET`) or the `svix` package. Unverified
  webhook requests are rejected.

### Testing Strategy

- Test `auth.protect()` on every protected route: signed-out
  requests redirect to sign-in, signed-in users without the
  required role or permission get a 404, and authorized users
  pass.
- Test with real session tokens: custom claims configured in the
  Dashboard appear in the token, and expired or tampered tokens
  are rejected. Never skip `await` on `auth()` in tests — an
  unawaited call returns a promise, not auth state.
- Test metadata trust boundaries: roles read from
  `publicMetadata` authorize correctly, and values a user sets
  in `unsafeMetadata` never grant authorization.
- Test webhook handlers with signed and unsigned payloads: a
  valid Svix signature is accepted, and a missing or forged
  signature is rejected before any handler logic runs.
- Test sign-in flows end to end (Playwright against a
  development instance): each enabled method works, and machine
  access via `acceptsToken` accepts valid tokens and rejects
  tokens with insufficient scope.

## Best Practices

- Read authorization data from the session token claims where possible;
  sync a user table with webhooks only when the app needs to query other
  users (for example social features) or store more data than fits in
  metadata.
- Treat webhooks as at-least-once and out-of-order: dedupe on the Svix
  message ID and upsert by Clerk user ID so replays and reordering are
  harmless. Never assume `user.created` arrives before `user.updated`.
- Keep route protection and resource protection separate in your head:
  middleware establishes the session; `auth.protect()` at each resource
  enforces access. Both are needed.
- Use the Clerk Dashboard for auth configuration (sign-in methods, social
  connections, session token claims, redirect URLs) and keep that
  configuration under change control: a Dashboard change is a production
  change.
- Create test users with the CLI (`npx -y clerk@latest users create`)
  instead of signing up through automated browsers, where bot protection
  can block sign-ups. For Playwright, use `@clerk/testing`.
- When using shadcn/ui, install `@clerk/ui`, import the theme CSS in the
  global stylesheet (`@import '@clerk/ui/themes/shadcn.css';`), and apply
  the `shadcn` theme to `<ClerkProvider>` rather than restyling
  components by hand.

## Security Considerations

- `CLERK_SECRET_KEY` is server-only. Never expose it in client code, and
  never read or print env files into a chat or log.
- Never trust client-side auth state for access control: `<Show>` and
  `useAuth()` are UI conveniences. The server check (`auth.protect()`)
  is the enforcement point.
- Verify every webhook signature; an unverified webhook endpoint lets
  anyone forge `user.created` events and inject users into the app's
  database.
- `treatPendingAsSignedOut` defaults to `true` in `auth()`; keep it that
  way unless the product deliberately handles pending sessions.
- Social connections are OAuth grants: review the scopes each connection
  requests, and do not request scopes the app does not use. See `oauth`.
- Session lifetime and multi-session behavior are Dashboard settings;
  review them before launch, and revoke sessions from the Dashboard or
  Backend API when an account is compromised.
- Clerk's bot protection can block automated sign-ups; that is a feature,
  not a bug — do not disable abuse controls to make tests pass.

## Performance Considerations

- Session token verification is local (JWT verification against Clerk's
  JWKS), so `auth()` does not add a network round trip. `currentUser()`
  does — call it once per request and pass the result down.
- `getToken()` uses proactive background refresh in Core 3; do not work
  around token refresh with manual caching that can serve expired tokens.
- Webhook syncing adds latency and failure modes; if the app only needs
  the signed-in user's data, the session token is faster and more
  consistent than a synced table.
- Keep custom session-token claims small: they travel on every request.

## Common Mistakes

- Protecting routes only in middleware with a route matcher and leaving
  Server Actions unguarded — protect each resource with `auth.protect()`.
- Using Core 2 patterns in a Core 3 app — `SignedIn`/`SignedOut`,
  `@clerk/clerk-react`, or `createRouteMatcher` gating as the only check.
- Calling `protect()` on the result of `auth()` — in Core 3, `protect`
  lives on the `auth` helper itself: `await auth.protect()`, not
  `(await auth()).protect()`.
- Forgetting `await` on `auth()` — it returns a promise, and an un-awaited
  auth object is truthy even when the user is signed out.
- Reading request data (including `auth()`) outside `<Suspense>` in a
  Server Component when Cache Components is enabled — the build fails.
- Putting roles in `unsafeMetadata` — users can edit it from the client.
- Syncing the full user table when the session token already carries the
  needed claims — extra infrastructure for no benefit.
- Handling webhooks without signature verification or without dedupe —
  forged events and duplicate processing follow.
- Naming the middleware file wrong for the Next.js version (`middleware.ts`
  on Next.js 16 is ignored; use `proxy.ts`).

## Examples

Middleware (Next.js 16 — name the file `proxy.ts`; on Next.js 15 and below
use `middleware.ts` with identical contents):

```ts
// proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();
```

Protecting a page and checking an organization role:

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { orgId, orgRole } = await auth();
  if (!orgId) redirect("/select-org");
  if (orgRole !== "org:admin") redirect("/unauthorized");
  return <main>Organization admin area</main>;
}
```

Or, with the `protect()` primitive:

```ts
import { auth } from "@clerk/nextjs/server";

export default async function BillingPage() {
  const { userId } = await auth.protect();
  // userId is guaranteed present here; unauthenticated users are redirected.
  return <main>Billing for {userId}</main>;
}
```

Webhook handler with signature verification:

```ts
// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from "@clerk/backend/webhooks";

export async function POST(request: Request) {
  let event;
  try {
    // verifyWebhook reads the signing secret from
    // CLERK_WEBHOOK_SIGNING_SECRET; it throws on a bad signature.
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  // event.type is e.g. "user.created"; upsert by event.data.id and
  // dedupe on the Svix message id — deliveries are at-least-once.
  return new Response("ok");
}
```

## Validation Checklist

- [ ] Clerk CLI setup completed (`init`, then `doctor` clean) and the app claimed in the Dashboard.
- [ ] `<ClerkProvider>` wraps the app inside `<body>`; sign-in, sign-up, and user controls visible.
- [ ] Middleware file named for the Next.js version and calling `clerkMiddleware()`.
- [ ] Every protected page, Route Handler, and Server Action calls `auth.protect()` (with role/permission checks where needed).
- [ ] `CLERK_SECRET_KEY` server-only; no secrets in client code or committed files.
- [ ] Webhook endpoint verifies the Svix signature and upserts idempotently (if syncing).
- [ ] Sign-up, sign-in, sign-out, organization, and webhook flows verified end to end.
- [ ] Pricing tier confirmed on clerk.com for the features the app uses.

## Expected Deliverables

- Working sign-in, sign-up, and sign-out with Clerk components.
- Route and resource protection using `auth.protect()` at every protected entry point.
- Organization setup (if in scope) with role checks.
- Webhook sync (if in scope) with verified signatures and idempotent upserts.
- A short report of the flows verified and any Dashboard configuration still needed.

## References

- [Clerk documentation](https://clerk.com/docs)
- [Next.js Quickstart (App Router)](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [`auth()` reference](https://clerk.com/docs/reference/nextjs/app-router/auth)
- [Upgrading to Clerk Core 3](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3)
- [Sync Clerk data with webhooks](https://clerk.com/docs/guides/development/webhooks/syncing)
- Related skills in this repository: `authentication`, `oauth`, `session-management`, `jwt`, `mfa`, `passkeys`, `rbac`, `authorization`, `multi-tenancy`, `auth-security`, `csrf-protection`.
