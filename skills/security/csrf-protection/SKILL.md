---
name: csrf-protection
description: >
  Prevent cross-site request forgery (CSRF) so malicious sites cannot
  make authenticated users perform unwanted actions. Use when adding
  CSRF tokens, configuring SameSite cookies, reviewing form and API
  endpoints for forged-request risk, or fixing a CSRF finding.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# CSRF Protection

## Purpose

Cross-site request forgery tricks a logged-in user's browser into
sending a request the user never intended — changing an email address,
transferring funds, or deleting data — because the browser attaches
the site's cookies to requests from any origin. This skill covers the
defenses that stop CSRF: anti-CSRF tokens, SameSite cookies, and
origin checks, applied to every state-changing request.

## When to Use

- Building or reviewing forms, mutations, and state-changing API
  endpoints.
- Adding anti-CSRF tokens to a web application.
- Configuring session cookies and their SameSite attribute.
- Fixing a CSRF finding from an audit or `owasp` review.
- Choosing between cookie-based and token-based authentication for an
  API.

## When Not to Use

- Preventing script injection in rendered pages — use
  `xss-prevention`.
- Preventing forged requests that carry no browser credentials (for
  example, API calls authenticated with an Authorization header are
  not CSRF-able in the classic sense, though they still need auth).
- General security review — use `owasp` or `security-auditing`.

## Prerequisites

- Knowledge of how the application authenticates requests (session
  cookie, bearer token, or both).
- Access to the session/cookie configuration and the form or API
  handling code.
- A test environment where a cross-origin request can be attempted
  safely.

## Official Documentation

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) —
  the canonical defensive guidance.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — context
  for request forgery risks.
- [MDN Set-Cookie SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) —
  cookie attributes including SameSite.

## Required Workflow

1. Inventory every state-changing endpoint: form submissions, API
   mutations (POST, PUT, PATCH, DELETE), and any GET request that
   changes state (these must be fixed to use a safe method).
2. Determine how each endpoint is authenticated. Cookie-authenticated
   endpoints need CSRF protection; bearer-token endpoints sent via
   Authorization headers are not vulnerable to classic CSRF.
3. Apply the synchronizer token pattern: the server generates an
   unpredictable token per session, embeds it in forms (or returns it
   to the client), and rejects state-changing requests whose token is
   missing or does not match.
4. Set session cookies with `SameSite=Lax` (or `Strict` where the
   user experience allows), `Secure`, and `HttpOnly`.
5. Verify the request origin for state-changing requests as defense
   in depth: check the `Origin` or `Referer` header against the
   expected host when the framework does not already do so.
6. Ensure safe methods (GET, HEAD, OPTIONS) never change state, so
   there is nothing for a forged GET to do.
7. Test: from a different origin, attempt a state-changing request
   with the victim's cookies but without a valid token, and confirm
   it is rejected.
8. Add a regression test asserting that a state-changing request
   without a valid token fails.

## Implementation Standards

- Every state-changing request requires a valid anti-CSRF token,
  validated on the server. No exceptions for "low-risk" mutations.
- Tokens must be unpredictable (generated with a cryptographic random
  source), tied to the user session, and compared in constant time
  where the framework supports it.
- Use the framework's built-in CSRF protection when it exists; do not
  hand-roll token handling unless no maintained option fits.
- Session cookies use `SameSite=Lax` at minimum, `Secure` (HTTPS
  only), and `HttpOnly`.
- GET requests must be side-effect free. Any state change reachable
  by GET is a CSRF vulnerability by construction.
- Token validation happens before any state change or side effect in
  the handler.
- Do not exempt endpoints from CSRF protection to make a third-party
  integration easier; use a scoped API key or webhook signature for
  server-to-server calls instead.
- Login forms also deserve CSRF protection (login CSRF), so an
  attacker cannot log a victim into the attacker's account.

## Best Practices

- Layer defenses: tokens plus SameSite cookies plus origin checks.
  Any one layer can fail; together they hold.
- Prefer `SameSite=Lax` as the default; use `Strict` for high-value
  sessions where the redirect behavior is acceptable.
- For single-page apps calling a same-site API, use the double-submit
  cookie pattern or the framework's token endpoint, and send the
  token in a custom header.
- Rotate the CSRF token when the session is re-established (login,
  privilege change).
- Keep the token out of URLs: tokens in query strings leak through
  logs, referrers, and browser history.
- Document the CSRF approach in the project so future endpoints
  follow it.

## Security Considerations

- CSRF protection does not help if XSS exists: an attacker who can
  run script on the page can read the token. Fix XSS too; see
  `xss-prevention`.
- SameSite cookies are a strong mitigation but not a complete fix on
  their own; older browsers and top-level navigation edge cases can
  bypass them.
- CORS configuration is not CSRF protection: a forged form post does
  not need CORS permission.
- Custom headers (for example, `X-Requested-With`) raise the bar for
  simple form-based forgery but are not a substitute for tokens.

## Performance Considerations

- Token generation and validation cost is negligible per request.
- Origin checks are a string comparison; they add no meaningful
  latency.
- Avoid per-request token rotation that forces extra round trips;
  per-session tokens are sufficient for most applications.

## Common Mistakes

- Protecting only "important" endpoints and leaving account settings
  or preferences unprotected.
- Validating the token after performing the state change.
- Using GET for deletions, toggles, or logouts.
- Putting the CSRF token in the URL query string.
- Disabling CSRF protection for API routes that still accept cookie
  authentication.
- Assuming SameSite alone is enough and skipping tokens.
- Checking only the Referer header, which browsers and privacy tools
  may omit.

## Examples

```ts
// Server: validate the token before any state change (framework
// pseudo-code following the synchronizer token pattern).
import { randomBytes, timingSafeEqual } from "node:crypto";

function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function tokensMatch(expected: string, received: string | undefined): boolean {
  if (!received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

// In the mutation handler, first thing:
// if (!tokensMatch(session.csrfToken, req.body.csrfToken)) {
//   return res.status(403).json({ error: "Invalid CSRF token" });
// }
```

```html
<!-- Form: the token travels in a hidden field, never in the URL. -->
<form method="post" action="/account/email">
  <input type="hidden" name="csrfToken" value="SERVER_RENDERED_TOKEN" />
  <label>New email <input type="email" name="email" /></label>
  <button type="submit">Update email</button>
</form>
```

```text
Manual CSRF test (test environment only):
1. Log in to the application in one browser profile.
2. From a page served on a different origin, submit a form that posts
   to the application's state-changing endpoint without a token.
3. Confirm the server rejects the request and no state changed.
```

## Validation Checklist

- [ ] Every state-changing endpoint requires and validates a token.
- [ ] No GET request changes state.
- [ ] Session cookies use `SameSite=Lax` or `Strict`, `Secure`, and
      `HttpOnly`.
- [ ] Tokens are unpredictable, session-bound, and validated before
      any state change.
- [ ] A cross-origin forged request without a token is rejected in
      testing.
- [ ] A regression test asserts that a mutation without a valid token
      fails.
- [ ] Login forms are also protected.

## Expected Deliverables

- CSRF protection enabled (framework middleware or token handling)
  with configuration changes documented.
- Cookie configuration changes (SameSite, Secure, HttpOnly).
- A list of protected endpoints and any deliberate exemptions with
  their justification.
- Regression tests for token validation and the manual test result.

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) —
  canonical guidance.
- [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) —
  cookie attributes.
- Related skills in this repository: `owasp`, `xss-prevention`,
  `secure-headers`, `security-auditing`.
