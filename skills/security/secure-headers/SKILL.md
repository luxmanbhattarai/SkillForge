---
name: secure-headers
description: >
  Configure HTTP security headers (CSP, HSTS, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, and frame controls) for web
  applications. Use when hardening response headers, setting a Content
  Security Policy, fixing a header finding from a scan, or reviewing a
  deployment's header configuration.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Secure Headers

## Purpose

HTTP security headers tell the browser how to treat a response: which
scripts may run, whether the page may be framed, how strictly to
enforce HTTPS, and what information to send elsewhere. They are cheap
to set, apply to every visitor, and blunt entire classes of attack —
XSS, clickjacking, MIME sniffing, and protocol downgrade — even when
another defense fails. This skill covers the headers that matter, safe
starting values, and how to verify them.

## When to Use

- Hardening a new or existing web application or API.
- Setting or tightening a Content Security Policy.
- Fixing a header finding from a scan or `security-auditing`.
- Reviewing headers after a framework upgrade or a deployment change.
- Preparing a site for a security review or compliance check.

## When Not to Use

- Fixing the underlying vulnerabilities headers mitigate — headers
  are defense in depth, not a replacement for `xss-prevention`,
  `csrf-protection`, or input validation.
- Non-HTTP services, where these headers do not apply.
- Client-side-only concerns such as cookie flags, which belong with
  session configuration (see `csrf-protection`).

## Prerequisites

- Access to the application's response header configuration
  (framework middleware, reverse proxy, or hosting platform).
- Knowledge of which third-party origins the site legitimately loads
  (scripts, styles, fonts, images, frames).
- A staging environment where a strict policy can be tested before
  production.

## Official Documentation

- [MDN HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) —
  reference for every header.
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) —
  CSP directives and examples.
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) —
  recommended header guidance.
- [securityheaders.com](https://securityheaders.com/) — header
  scanner for a live site.
- [Helmet](https://helmetjs.github.io/) — header middleware for
  Express and Node.js.

## Required Workflow

1. Inspect the current headers on the live site (browser developer
   tools or a header scanner) and record what is missing or weak.
2. Inventory the origins the site needs: first-party and third-party
   scripts, styles, fonts, images, frames, and API endpoints.
3. Set the baseline headers (see Implementation Standards) in the
   framework middleware or reverse proxy so they apply to every
   response.
4. Build the Content Security Policy from the inventory: start with
   `default-src 'self'`, add only the origins the site actually
   needs, and avoid `unsafe-inline` and `unsafe-eval` for scripts.
5. Deploy the CSP in report-only mode first, watch the violation
   reports, and fix legitimate breakages before enforcing it.
6. Test the site thoroughly with the headers enforced: log in, submit
   forms, load third-party widgets, and check the browser console for
   blocked resources.
7. Verify with a header scanner and record the result.
8. Re-check headers after deployments that change the stack, add a
   third-party integration, or move hosting.

## Implementation Standards

- Set these headers on every response:
  - `Content-Security-Policy` — restricts where scripts, styles, and
    other resources may load from.
  - `Strict-Transport-Security` — `max-age` of at least one year,
    with `includeSubDomains`; add `preload` only when the team
    understands the commitment.
  - `X-Content-Type-Options: nosniff` — stops MIME-type sniffing.
  - `Referrer-Policy` — `strict-origin-when-cross-origin` or
    stricter, so full URLs do not leak to other sites.
  - `Permissions-Policy` — disables browser features the site does
    not use (camera, microphone, geolocation).
  - `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`) — stops
    clickjacking by preventing framing.
- CSP rules:
  - `default-src 'self'` as the baseline; add specific sources per
    directive rather than widening the default.
  - No `unsafe-inline` or `unsafe-eval` for scripts in new work; use
    nonces or hashes for the rare inline script that cannot be moved
    to a file.
  - `object-src 'none'` and `base-uri 'self'` to close common bypass
    paths.
  - `frame-ancestors 'none'` unless the site is intentionally
    embeddable, in which case list the exact allowed origins.
- Headers are set in one place (middleware or proxy), not scattered
  across handlers, so nothing is missed.
- API responses get the same baseline headers, not only HTML pages.
- Error pages and redirects carry the headers too.
- HSTS is only enabled once the site is fully HTTPS, including
  subdomains, because the header commits browsers to HTTPS.

## Best Practices

- Use framework or platform header middleware (for example, Helmet
  for Express) instead of hand-setting headers in every handler.
- Roll CSP out in report-only mode and read the reports; a CSP
  deployed blind breaks features.
- Keep the CSP as tight as the site allows; every added origin is
  trust granted to a third party.
- Review third-party origins periodically; remove ones the site no
  longer uses.
- Document the header set and the reason for each exception so future
  changes do not silently widen the policy.
- Check headers on staging and production separately; configuration
  can differ between environments.

## Security Considerations

- Headers mitigate attacks; they do not fix vulnerabilities. A strict
  CSP does not excuse unescaped output.
- A weak CSP (for example, `script-src *` or `unsafe-inline`) gives
  a false sense of security; if the policy cannot be strict, say so
  and prioritize fixing the underlying issues.
- HSTS with `preload` is effectively irreversible for months; enable
  it deliberately, not by copying a snippet.
- `X-Frame-Options` and CSP `frame-ancestors` should agree; when both
  are set, `frame-ancestors` takes precedence in modern browsers.

## Performance Considerations

- Headers add a few hundred bytes per response; the cost is
  negligible.
- CSP violation reporting can generate traffic; point reports at an
  endpoint that can absorb the volume, or sample them.
- Avoid overly long header values that bloat every response; keep
  the origin lists tight.

## Common Mistakes

- Setting headers only on the homepage or only on HTML responses.
- Copying a CSP from another site without matching it to this site's
  actual origins.
- Deploying an enforcing CSP without a report-only trial, then
  breaking the site.
- Using `unsafe-inline` to "make it work" instead of moving inline
  scripts to files or using nonces.
- Forgetting that headers set in the app can be stripped or
  overridden by a proxy or CDN; verify on the live response.
- Enabling HSTS preload without understanding that removal takes
  months.

## Examples

```text
Baseline response headers (values to aim for):

Content-Security-Policy: default-src 'self'; script-src 'self';
  style-src 'self'; img-src 'self' data:; font-src 'self';
  object-src 'none'; base-uri 'self'; frame-ancestors 'none';
  form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
```

```ts
// Express example using Helmet with a CSP tailored to the site.
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);
```

```bash
# Inspect the headers a live site actually sends.
curl -sI https://example.com | grep -i -E "content-security-policy|strict-transport|x-content-type|x-frame|referrer|permissions"
```

## Validation Checklist

- [ ] All baseline headers are present on HTML pages, API responses,
      error pages, and redirects.
- [ ] CSP is enforced (not only report-only) after a report-only
      trial with no unresolved violations.
- [ ] No `unsafe-inline` or `unsafe-eval` in `script-src` unless
      documented and justified.
- [ ] HSTS is set with a long max-age and `includeSubDomains` (and
      `preload` only if deliberately chosen).
- [ ] Framing is blocked unless the site is intentionally embeddable.
- [ ] A header scanner confirms the configuration on the live site.
- [ ] Third-party origins in the CSP are all still in use.

## Expected Deliverables

- Header configuration changes (middleware, proxy, or platform
  settings) with the reasoning for each value.
- CSP report-only trial results and the final enforced policy.
- Scanner output before and after the change.
- A note on any deliberate exceptions (for example, a third-party
  script that requires a wider directive).

## References

- [MDN HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) —
  header reference.
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) —
  CSP reference.
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) —
  recommended guidance.
- [Helmet](https://helmetjs.github.io/) — Node.js header middleware.
- Related skills in this repository: `owasp`, `xss-prevention`,
  `csrf-protection`, `security-auditing`.
