# Phase 3 Batch 5 Report — Auth + Security Technical-Accuracy Audit

- **Batch:** Phase 3 batch 5 (auth + security)
- **Directories:** `skills/auth/` (10 skills) and `skills/security/` (8 skills),
  18 skills total
- **Date verified:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (changes left uncommitted,
  per instructions; no push, merge, PR, commit, or branch switch performed)
- **Validation:** `node scripts/validate-skills.mjs --filter skills/auth` →
  **PASS** (10 skills checked, 10 original, 0 upstream, all valid).
  `node scripts/validate-skills.mjs --filter skills/security` → **PASS**
  (8 skills checked, 8 original, 0 upstream, all valid).
  All files remain under 500 lines (longest: `secure-headers`, ~253 lines).
  `npm run registry` was not run (coordinator regenerates centrally).

## Summary counts

| Status | Count |
| --- | --- |
| Verified | 18 |
| Verified with limitations | 0 |
| Needs correction | 0 |
| Unverified | 0 |
| Blocked | 0 |

Every skill was checked against authoritative sources (official product docs,
official API references, npm registry metadata, IETF RFCs, W3C
Recommendations, NIST publications, and OWASP project pages) and is correct
as of 2026-11-20 after the fixes below. All 18 skills already carried
`metadata.last_verified: "2026-11-20"`, which is the date this verification
was actually performed, so no date changes were needed. No skill was
restructured, renamed, deleted, or rescoped; the 15-section structure and
frontmatter `name`/`description` fields are unchanged throughout. No
dangerous security recommendation was found that could not be verified and
corrected — there are no "Needs correction" items.

Scope note on links: every version-sensitive claim, API signature, code
example, and security-critical recommendation was verified against a primary
source opened during this audit (listed per skill below). Stable canonical
homepage links that carry no version-sensitive claim (Snyk, Socket, ZAP,
Semgrep, CodeQL, securityheaders.com, passkeys.dev, jwt.io, Auth.js,
Supabase, Prisma) were not individually re-opened; they are unchanged from
the repo and make no factual claim beyond the link itself.

## Notable corrections (cross-cutting)

- **NIST SP 800-63B-4 supersedes 800-63B-3.** The Rev. 4 suite is final
  (31 July 2025) and Rev. 3 was withdrawn 1 August 2025. Two skills cited
  the withdrawn `pages.nist.gov/800-63-3/sp800-63b.html`; both now cite
  the `-4` edition. The password rule also changed substantively: Rev. 4
  requires single-factor passwords to be **at least 15 characters**
  (§3.1.1.2); 8 characters is the floor only for passwords always used
  with a second factor. The old "minimum 8 characters" rule in
  `authentication` was corrected, and the blocklist check and no-periodic-
  rotation rules were upgraded from optional to required, per Rev. 4.
- **OWASP Top 10:2025 is current** (announced November 2025, finalized
  January 2026) and **ASVS 5.0.0** (30 May 2025) is current. The 2021
  category names ("Vulnerable and Outdated Components") were updated to
  the 2025 names (A03 Software Supply Chain Failures) wherever they
  appeared; SSRF is now folded into A01 Broken Access Control.
- **otplib v13 broke the `mfa` example.** The v12 `authenticator` object
  API (`authenticator.generateSecret()`, `.keyuri()`, `.verify()`) was
  removed in the v13 rewrite; the example now uses the v13 async
  functional API (`generateSecret()`, `generateURI()`, `verify()` returning
  `{ valid }`).
- **Helmet `hsts:` option does not exist.** The `secure-headers` example
  passed `hsts: { ... }` to Helmet; the option was renamed to
  `strictTransportSecurity` in Helmet 4 and the old name is silently
  ignored. Fixed, and the Helmet link updated to the current canonical
  homepage (helmet.js.org, 8.x current).
- **OAuth security baseline is now RFC 9700** (BCP 240, January 2025) plus
  RFC 10017 for browser-based apps (August 2026); OAuth 2.1 remains an
  Internet-Draft (draft-ietf-oauth-v2-1-17, October 2026), not an RFC.
  The ROPC grant is not merely "deprecated" — RFC 9700 §2.4 says it
  MUST NOT be used.
- **WebAuthn Level 3 is a W3C Recommendation** (25 August 2026),
  superseding Level 2.
- **Node.js 26 LTS is the current LTS line** (Lithium); the `better-auth`
  claim that Node.js 24 LTS is "the current line" was stale. Better Auth
  itself is on the 1.7.x line (1.7.27 as of November 2026) with the CLI
  renamed to `npx auth@latest`.

## Per-skill results

| Skill | Status | What was checked | What was fixed | Sources used |
| --- | --- | --- | --- | --- |
| auth-security | Verified | Rate-limit/lockout guidance, CSRF guidance, secrets handling, header advice, API-key guidance, OWASP Top 10 / ASVS link currency | Added version notes: OWASP Top 10:2025 is current (Broken Access Control still A01); ASVS 5.0.0 (May 2025) is current, requirement numbering changed from 4.0.3 | devguide.owasp.org (Top 10:2025), asvs.owasp.org (ASVS 5.0.0, 30 May 2025) |
| authentication | Verified | Password rules, hashing guidance, reset/verification token guidance, NIST citation, Auth.js / Better Auth links | **Password-length fix:** "minimum 8 characters" corrected to 15 characters for single-factor passwords per NIST SP 800-63B-4 §3.1.1.2 (8 is the floor only for MFA-paired passwords). **NIST link fix:** 800-63-3 (withdrawn 1 Aug 2025) → 800-63B-4 (final July 2025), in Official Documentation and References. Breached-password blocklist check upgraded from "where supported" to required; added no-periodic-rotation rule and allow-paste/password-manager rule, all per 800-63B-4 | pages.nist.gov/800-63-4/sp800-63b.html (opened; §3.1.1.2 read in full), csrc.nist.gov SP 800-63-4 final listing (31 July 2025; supersedes 800-63-3) |
| authorization | Verified | Deny-by-default, ownership checks, 403 vs 404, IDOR guidance, OWASP Authorization Cheat Sheet link, Top 10 / ASVS currency | Added version notes: Broken Access Control is A01 in the 2025 edition (SSRF folded in); ASVS 5.0.0 is current | cheatsheetseries.owasp.org Authorization Cheat Sheet (opened and read), devguide.owasp.org (Top 10:2025), asvs.owasp.org |
| better-auth | Verified | `betterAuth()` config, `drizzleAdapter(db, { provider: "pg" })`, `createAuthClient` from `better-auth/react`, `/api/auth/*` mount, env vars, Node runtime claim, CLI/migration guidance, `createAdapterFactory` guide link | **Node fix:** "Node.js 24 LTS is the current line" → Node.js 26 LTS is current (24 LTS also supported); CLI requires Node.js 22.12+. **Version line:** 1.7.x current (1.7.27 as of Nov 2026), ESM-only. **CLI fix:** migration step now names `npx auth@latest generate` / `migrate`; retired `npx @better-auth/cli` flagged as not to use. **Secret rule added:** `BETTER_AUTH_SECRET` must be ≥ 32 high-entropy chars (`openssl rand -base64 32`); rotate via `BETTER_AUTH_SECRETS`. **1.7 behavior note:** `x-forwarded-*` headers ignored unless `advanced.trustedProxyHeaders` is set | registry.npmjs.org/better-auth/latest (1.7.27, ESM-only, exports incl. `./adapters/drizzle`, `./react`), better-auth.com/docs/installation (opened; secret ≥ 32 chars, `npx auth@latest` CLI), better-auth.com/docs/guides/create-a-db-adapter (opened), nodejs.org releases table (v26 LTS, v24 LTS), better-auth.com 1.7 upgrade guide, labs.convex.dev Better Auth 1.7 upgrade notes |
| jwt | Verified | `jose` SignJWT/jwtVerify API, algorithm-pinning guidance, claims, expiry, JWKS/rotation guidance, RFC 7519 / RFC 8725 links | **Example hardened:** `jwtVerify` call now passes `algorithms: ["HS256"]`, so the example actually pins the algorithm as the skill's own Implementation Standards require (jose's `algorithms` option is optional with a library default, so the old example ran but did not demonstrate pinning). Added version note: jose 6.x current (6.2.18 as of Nov 2026); API shown works on jose 5.x and 6.x | panva/jose CHANGELOG (6.2.18, 2026-11-18), jose algorithm-allowlist analysis (Oct 2026; `algorithms` optional, defaults to key-applicable algorithms), RFC 8725 §3.1 |
| mfa | Verified | TOTP enrollment/verification flow, otplib API, backup-code generation/storage, WebAuthn level, NIST citation, SMS guidance | **otplib example rewritten for v13:** the v12 `authenticator` object API was removed in the v13 rewrite; example now uses `generateSecret()`, `generateURI({ issuer, label, secret })`, and async `verify()` returning `{ valid }`, with a Prerequisites note (13.6.0 current) warning against the removed v12 API. **WebAuthn link fix:** Level 2 → Level 3 (W3C Recommendation 25 Aug 2026). **NIST link fix:** 800-63B-3 → 800-63B-4 | github.com/yeojz/otplib README (opened; v13 rewrite, functional API), otplib.yeojz.dev getting-started guide (`generateURI` signature), npm.io otplib 13.6.0, fidoalliance.org (WebAuthn L3 Recommendation, 25 Aug 2026), w3.org/TR/webauthn-3, pages.nist.gov/800-63-4/sp800-63b.html |
| multi-tenancy | Verified | Isolation strategies, tenant resolution, tenant-scoped query helper, PostgreSQL RLS policy example, cache/key scoping | **RLS example hardened:** `current_setting('app.tenant_id')` → `current_setting('app.tenant_id', true)` so a missing tenant context fails closed (NULL → no rows) instead of raising an error; comment added. Added version note: RLS needs PostgreSQL 9.5+, stable in all supported versions | postgresql.org/docs/current/ddl-rowsecurity.html (linked in skill; `current_setting` `missing_ok` parameter per PostgreSQL docs) |
| oauth | Verified | Authorization code + PKCE flow, `state`, redirect matching, ID-token validation, token storage/refresh, PKCE code example, implicit/ROPC deprecation claims, RFC links | **Added RFC 9700** (BCP 240, Jan 2025) as the current security baseline in Official Documentation and References, and **RFC 10017** (BCP, Aug 2026) for browser-based apps. **ROPC wording strengthened:** not merely "deprecated" — RFC 9700 §2.4 says the password credentials grant MUST NOT be used. **Added OAuth 2.1 status note:** still an Internet-Draft (draft-ietf-oauth-v2-1-17, Oct 2026), not an RFC; RFC 6749 remains the published standard. **Added `iss` (RFC 9207) mix-up defense** for multi-AS clients | datatracker.ietf.org RFC 9700 (opened; §2 summary, §2.4 ROPC MUST NOT), RFC 10017 (opened; BCP, Aug 2026), IETF 127 OAuth slides (draft-ietf-oauth-v2-1-17, Oct 2026), RFC 9207 via RFC 9700 §2 |
| rbac | Verified | Permission-model guidance, role mapping example, role-assignment controls, NIST RBAC link, OWASP cheat sheet alignment | **Annotated NIST RBAC project link as archived** (page states "ARCHIVED PROJECT… no longer being supported"); the reference standard is INCITS 359-2012 and is stable. **Added OWASP nuance:** the Authorization Cheat Sheet prefers ABAC/ReBAC when decisions need attributes or relationships beyond roles. Added ASVS 5.0.0 note | csrc.nist.gov/projects/role-based-access-control (opened; archived banner, INCITS 359-2012), cheatsheetseries.owasp.org Authorization Cheat Sheet (opened; "Prefer Attribute and Relationship Based Access Control over RBAC"), asvs.owasp.org |
| session-management | Verified | Cookie flags, session rotation, idle + absolute expiry, logout/revocation, "remember me" guidance, MDN Set-Cookie link | **Added `__Host-` cookie-prefix guidance** (binds the session cookie to one host; no Domain, Path=/, Secure required). **Added NIST 800-63B-4 reauthentication bound:** overall timeout SHOULD be ≤ 30 days at AAL1. MDN Set-Cookie link verified on the current `/Reference/` path | developer.mozilla.org Set-Cookie (opened; cookie prefixes, SameSite semantics), pages.nist.gov/800-63-4/sp800-63b.html (§5.2 / AAL1 reauthentication, opened) |
| csrf-protection | Verified | Synchronizer-token pattern, SameSite guidance, origin checks, login CSRF, timing-safe compare example, MDN link | **Fixed stale MDN URL** (2 places): `/docs/Web/HTTP/Headers/Set-Cookie` → current `/docs/Web/HTTP/Reference/Headers/Set-Cookie`. Token example and guidance otherwise verified correct | developer.mozilla.org Set-Cookie (opened on the current path), OWASP CSRF Prevention Cheat Sheet (linked in skill) |
| dependency-security | Verified | `npm audit` / update workflow, Dependabot, lockfile discipline, vetting guidance, triage format | Added OWASP Top 10:2025 note: dependency risk is now A03 Software Supply Chain Failures, expanded from the 2021 "Vulnerable and Outdated Components" category to cover compromised packages, build systems, and distribution infrastructure | devguide.owasp.org (Top 10:2025 A03), owasp.org Top 10 project page |
| owasp | Verified | Top 10 review workflow, ASVS level guidance, cheat-sheet mapping, example review pass, category names | **Updated to Top 10:2025:** full A01–A10 list added to Official Documentation (announced Nov 2025, finalized Jan 2026); **fixed example** "Vulnerable Components" → "Software Supply Chain Failures (A03:2025)". **ASVS 5.0.0 note added:** 345 requirements in 17 chapters; numbering changed from 4.0.3, cite with version prefix (e.g. `v5.0.0-1.2.5`). Added "do not cite the 2021 list for new work" | devguide.owasp.org (Top 10:2025 list and changes), asvs.owasp.org (ASVS 5.0.0, 30 May 2025, stable release), OWASP ASVS 5.0.0 PDF via github.com/OWASP/ASVS |
| secrets-management | Verified | Secret inventory, `.env`/`.env.example` guidance, rotation, leak response, Vault link, GitHub Actions secrets link | **Updated stale Top 10 terminology:** "sensitive data exposure" (2017 name) → Cryptographic Failures (A04 in the 2025 edition). Vault link verified live | vaultproject.io (opened; live, HashiCorp Developer), devguide.owasp.org (Top 10:2025 A04) |
| secure-headers | Verified | Baseline header set, CSP directives, HSTS values, Permissions-Policy syntax, Helmet example, scanner guidance | **Fixed broken Helmet example:** `hsts: { maxAge, includeSubDomains }` → `strictTransportSecurity: { ... }` — the `hsts` option name was removed in Helmet 4 and is silently ignored. **Updated Helmet link** to the current canonical homepage helmet.js.org (8.x current, 8.3.0 as of Nov 2026, Node 18+). Added note that Helmet CSP directives merge into Helmet's defaults (`useDefaults: false` to start empty) | helmet.js.org (opened; `strictTransportSecurity` option, CSP `useDefaults`, defaults list), registry.npmjs.org/helmet/latest (8.3.0, homepage helmet.js.org, engines node ≥ 18), owasp.org Secure Headers Project page (opened) |
| security-auditing | Verified | Scope/authorization requirements, finding format, tool links (ZAP, Semgrep, CodeQL), WSTG/Top 10 references | Added Top 10:2025 currency note in Official Documentation and References | devguide.owasp.org (Top 10:2025), owasp.org WSTG project page (linked in skill) |
| sql-injection-prevention | Verified | Parameterization guidance, allowlist for dynamic identifiers, `LIKE` wildcard escaping, least-privilege guidance, code examples (PostgreSQL `$1` placeholders, allowlisted sort column) | Added Top 10:2025 annotation: Injection is A05 in the current edition. No technical errors found; examples verified correct | OWASP SQL Injection Prevention Cheat Sheet (linked in skill), devguide.owasp.org (Top 10:2025 A05) |
| xss-prevention | Verified | Output-encoding guidance, DOMPurify `sanitize` API usage, `dangerouslySetInnerHTML` handling, URL validation example, CSP guidance | Added Top 10:2025 annotation: Injection (XSS) is A05 in the current edition. No technical errors found; DOMPurify example (`ALLOWED_TAGS`/`ALLOWED_ATTR`) and URL validator verified correct | github.com/cure53/DOMPurify (linked in skill), OWASP XSS Prevention Cheat Sheet (linked in skill), devguide.owasp.org (Top 10:2025 A05) |

## Files changed (18, all within this batch's directories)

- `skills/auth/auth-security/SKILL.md`
- `skills/auth/authentication/SKILL.md`
- `skills/auth/authorization/SKILL.md`
- `skills/auth/better-auth/SKILL.md`
- `skills/auth/jwt/SKILL.md`
- `skills/auth/mfa/SKILL.md`
- `skills/auth/multi-tenancy/SKILL.md`
- `skills/auth/oauth/SKILL.md`
- `skills/auth/rbac/SKILL.md`
- `skills/auth/session-management/SKILL.md`
- `skills/security/csrf-protection/SKILL.md`
- `skills/security/dependency-security/SKILL.md`
- `skills/security/owasp/SKILL.md`
- `skills/security/secrets-management/SKILL.md`
- `skills/security/secure-headers/SKILL.md`
- `skills/security/security-auditing/SKILL.md`
- `skills/security/sql-injection-prevention/SKILL.md`
- `skills/security/xss-prevention/SKILL.md`

No other files were touched. No commits, pushes, merges, PRs, or branch
switches were made. `npm run registry` was not run.

## Blockers

None. All authoritative sources needed were reachable. No skill is
Unverified, Needs correction, or Blocked.
