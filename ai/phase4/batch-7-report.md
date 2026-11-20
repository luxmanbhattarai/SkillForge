# Phase 4 — Batch 7 Report: Authentication + Identity

- **Date:** 2026-11-20
- **Batch:** 7 (authjs, clerk, supabase-auth, passkeys)
- **Branch:** `feat/skillforge-production-upgrade` (no commits, no pushes — coordinator commits)

## Skills written

| Skill | Directory | Lines | Validation |
| --- | --- | --- | --- |
| Auth.js | `skills/auth/authjs/` | 303 | PASS |
| Clerk | `skills/auth/clerk/` | 296 | PASS |
| Supabase Auth | `skills/auth/supabase-auth/` | 319 | PASS |
| Passkeys | `skills/auth/passkeys/` | 369 | PASS |

Each is a single `SKILL.md` following `templates/SKILL-TEMPLATE.md`
exactly (frontmatter + 15 sections in order, all under 500 lines, no
`references/` needed). Every skill distinguishes authentication (proving
identity) from authorization (permissions) in its Purpose and defers
authorization design to `authorization` / `rbac`. Cross-references use
backticked skill names only, never file paths.

## Official sources consulted per skill

### authjs

- Auth.js installation guide (authjs.dev, opened 2026-11-20): `next-auth@beta`,
  `AUTH_SECRET`, `npx auth secret`, `auth.ts`, catch-all route handler,
  `proxy.ts` on Next.js 16 / `middleware.ts` on 15 and below. Page footer
  reads "Auth.js © Better Auth Inc. - 2026" and links a "Migrate to Better
  Auth" guide.
- Better Auth announcement, "Auth.js is now part of Better Auth"
  (better-auth.com/blog/authjs-joins-better-auth, 22 September 2025):
  maintenance transferred to the Better Auth team; the team recommends
  Better Auth for new projects.
- Secondary sources checked November 2026 (startwithidentity.com review
  evaluated 2026-11-05; course.ethicscomputer.in versions checked
  2026-11-16; teasertrack.cc checked 2026-10-30): v5 is
  5.0.0-beta.32, latest stable `next-auth` is 4.24.15, and Better Auth
  was acquired by Vercel in July 2026. The skill states the beta/stable
  versions and the Better Auth recommendation; the Vercel acquisition is
  noted here, not in the skill.
- Auth.js session-strategy docs (mirror of the official docs content):
  JWT vs database strategies, adapter-driven default, Credentials
  requiring the JWT strategy, cookie chunking above ~4 KB.

### clerk

- Clerk Next.js Quickstart (clerk.com/docs, updated 2026-11-19, opened
  2026-11-20): `npx -y clerk@latest init` as the setup path,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`,
  `<ClerkProvider>` inside `<body>`, `proxy.ts` vs `middleware.ts` by
  Next.js version, `Show` component with `<Suspense>`, `auth()` async,
  `@clerk/testing` for Playwright.
- `auth()` reference (clerk.com/docs, opened 2026-11-20): `protect()`
  with `role` / `permission` / `has`, `acceptsToken` machine-token
  options, `treatPendingAsSignedOut`, 404-on-unauthorized behavior.
- Upgrading to Clerk Core 3 (clerk.com/docs, updated 2026-11-19, opened
  2026-11-20): Core 3 / `@clerk/nextjs` v7 is current; Node 20.9+,
  Next.js 15.2.8+ or 16.0.10+; `Show` replaces `SignedIn`/`SignedOut`/
  `Protect`; `@clerk/clerk-react` → `@clerk/react`.
- Sync Clerk data with webhooks (clerk.com/docs, search-verified):
  `user.created`/`updated`/`deleted`/`merged`, at-least-once and
  out-of-order delivery, the ~1.2 KB metadata-in-token guidance.
- Organizations overview URL taken verbatim from the official quickstart
  page text (clerk.com/docs/guides/organizations/overview). The direct
  open of that URL was blocked by a browser-service rate limit (429),
  not a 404 — see Gaps.

### supabase-auth

- Supabase Auth overview (supabase.com/docs, updated 2026-11-11, opened
  2026-11-20): methods, JWT model, auth vs authorization split, social
  and phone provider lists.
- Creating a Supabase client for SSR (supabase.com/docs, opened
  2026-11-20): `@supabase/ssr`, browser/server clients, proxy refresh
  via `getClaims()`, `sb-<project_ref>-auth-token` cookie,
  single-use refresh tokens with reuse detection revoking the session,
  `getClaims` vs `getUser` vs `getSession` guidance.
- Supabase Auth MFA (supabase.com/docs, updated 2026-11-18, opened
  2026-11-20): TOTP + phone factors, `mfa.enroll`/`challenge`/`verify`/
  `listFactors`/`unenroll`/`getAuthenticatorAssuranceLevel`, `aal1`/
  `aal2` claims, `amr` claim, restrictive RLS enforcement.
- Passkey authentication (supabase.com/docs, updated 2026-09-22, opened
  2026-11-20): experimental passkeys, `registerPasskey()` /
  `signInWithPasskey()` / `auth.passkey` namespace, RP ID = bare domain,
  up to 5 origins, HTTPS except loopback, registration requires a
  confirmed non-anonymous user.
- Integrating with Supabase Auth / Edge Functions (supabase.com/docs,
  search-verified): auth context via the `Authorization` header, RLS in
  Edge Functions.

### passkeys

- Web Authentication Level 3 (w3.org/TR/webauthn-3/, opened 2026-11-20):
  spec text for the registration/authentication ceremonies, RP
  operations, and attestation.
- FIDO Alliance, "WebAuthn Level 3 Is Now a W3C Recommendation"
  (fidoalliance.org): Level 3 became a W3C Recommendation on
  25 August 2026 (`REC-webauthn-3-20260825`), superseding Level 2
  (8 April 2021). Corroborated by multiple independent sources. Note:
  the batch brief said Level 2 was the current Recommendation; that is
  out of date — Level 3 is current, and the skill (and the existing
  `mfa` skill) state this correctly.
- SimpleWebAuthn server/browser docs (simplewebauthn.dev, search-verified):
  `generateRegistrationOptions`, `verifyRegistrationResponse`,
  `generateAuthenticationOptions`, `verifyAuthenticationResponse`,
  `startRegistration`, `startAuthentication`, `browserSupportsWebAuthn`.
- passkeys.dev (already referenced by the `mfa` skill).

## Validation output

Run from the repo root, one filtered command per skill (no unfiltered
validate, no registry run, per plan):

```text
=== authjs ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== clerk ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== supabase-auth ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

=== passkeys ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

All four passed on the first run; no fixes were needed. Line counts:
authjs 303, clerk 296, supabase-auth 319, passkeys 369 — all under the
500-line limit.

## Decisions and notes

- **Auth.js status is the headline of the `authjs` skill.** v5 has never
  shipped stable (still `5.0.0-beta.32` after four years in beta), the
  project joined Better Auth in September 2025, and the maintaining team
  recommends Better Auth for new projects. The skill says this plainly in
  Prerequisites and When Not to Use, and frames itself as the skill for
  existing Auth.js/NextAuth codebases and deliberate Auth.js choices.
  The repo already has a `better-auth` skill, so the two compose.
- **Clerk Core 3 is current.** The skill teaches the Core 3 / v7 patterns
  (`Show`, `auth.protect()` at each resource, `proxy.ts` on Next.js 16,
  CLI-first setup) and explicitly flags the Core 2 patterns as outdated.
  Pricing is handled without invented numbers: paid plans are per monthly
  active user, and the skill tells the agent to confirm the current
  pricing page on clerk.com before designing around a tier.
- **Supabase Auth centers the RLS boundary.** The skill stresses that
  sign-up is open by default, the publishable key is public, and RLS is
  the actual authorization layer — plus the `getClaims()` vs
  `getSession()` distinction the official SSR guide emphasizes.
- **WebAuthn Level 3 is the current Recommendation.** Verified against
  the FIDO Alliance announcement and the live W3C TR page; the brief's
  Level 2 statement is stale. The `passkeys` skill cites Level 3 with
  its Recommendation date and identifier.
- **No invented versions, URLs, flags, or prices.** Every linked URL was
  either opened successfully or taken verbatim from a search result on
  the official domain. Version numbers that could not be confirmed
  against an official source in-session are either omitted or attributed
  to a dated secondary check.

## Gaps

- Browser-service rate limiting (429) blocked direct opens of two URLs
  late in the session: the Supabase RLS guide
  (`supabase.com/docs/guides/database/postgres/row-level-security`) and
  the Clerk Organizations overview. The Organizations URL is used in the
  `clerk` skill because it appeared verbatim in the official quickstart
  page text that was opened successfully; the Supabase RLS URL is **not**
  linked in the `supabase-auth` skill (the skill links the Auth overview
  and SSR guide instead and describes RLS in prose). The coordinator may
  want to add the RLS link once it can be opened.
- The Auth.js session-strategies docs path on authjs.dev could not be
  confirmed: `/getting-started/session-management` returns 404, and the
  content was verified via a mirror of the official docs plus the
  nextauthjs/next-auth repository (DeepWiki). The `authjs` skill links
  only the verified installation page and docs home for Auth.js itself.
