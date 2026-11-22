---
name: xss-prevention
description: >
  Prevent cross-site scripting (XSS) by encoding output, sanitizing
  HTML, and using safe rendering APIs. Use when rendering user content,
  reviewing code that injects HTML or JavaScript, fixing an XSS finding,
  setting a Content Security Policy, or choosing a sanitizer library.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# XSS Prevention

## Purpose

Cross-site scripting (XSS) lets an attacker run JavaScript in another
user's browser by injecting markup or script through content the
application renders. The consequences range from session theft to full
account takeover. This skill covers the defenses that stop XSS:
context-aware output encoding, safe rendering defaults, HTML
sanitization where markup is genuinely needed, and Content Security
Policy as a safety net.

## When to Use

- Rendering any user-supplied or third-party content in a page.
- Reviewing code that sets HTML, uses `innerHTML`, or renders raw
  markup.
- Fixing an XSS finding from an audit, a bug report, or `owasp`
  review.
- Building features that accept rich text or Markdown from users.
- Setting or tightening a Content Security Policy.
- Choosing or configuring an HTML sanitizer.

## When Not to Use

- Server-side injection into databases — use
  `sql-injection-prevention`.
- Forged requests from another site — use `csrf-protection`.
- General security posture review — use `owasp` or
  `security-auditing`.
- Sanitizing content for non-HTML contexts (CSV, email headers);
  those need their own encoding rules.

## Prerequisites

- Knowledge of the framework's rendering behavior (React escapes
  interpolated values by default; template engines vary).
- Access to the code that renders user content and to the HTTP
  response headers configuration.
- A test environment where an XSS payload can be submitted safely.

## Official Documentation

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) —
  the canonical defensive guidance.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Injection
  (A05 in the current 2025 edition) category context.
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) —
  CSP directives and examples.
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitizer
  for the browser.
- [React documentation](https://react.dev/) — safe rendering defaults
  and the risks of raw HTML insertion.

## Required Workflow

1. Inventory every place user-controlled data reaches the page:
   rendered text, attribute values, URLs, inline scripts, and JSON
   embedded in the page.
2. For each sink, confirm the framework encodes the value for its
   context. Plain text interpolation in React, Vue, and modern
   template engines is escaped by default — verify, do not assume.
3. Remove raw HTML insertion (`innerHTML`, `dangerouslySetInnerHTML`,
   unescaped template output) wherever it is not strictly necessary.
4. Where rich HTML is genuinely required, sanitize it with a
   maintained sanitizer (DOMPurify) configured with an allowlist of
   tags and attributes, and sanitize on the server as well as the
   client where feasible.
5. Validate URLs before rendering them in links: allow only safe
   schemes (`https`, `mailto`) and reject `javascript:` and `data:`
   URLs.
6. Set a Content Security Policy that disallows inline scripts and
   restricts script sources; see `secure-headers`.
7. Test with hostile input: submit markup, script tags, event-handler
   attributes, and `javascript:` URLs, and confirm they render as
   inert text or are stripped.
8. Add a regression test asserting that a representative payload is
   neutralized.

## Implementation Standards

- Never insert untrusted data into the DOM as HTML. Encode for the
  output context: HTML body, HTML attribute, JavaScript string, CSS,
  or URL — each needs different encoding.
- Prefer the framework's safe default (escaped interpolation) over
  any manual escaping.
- Raw HTML insertion APIs are forbidden unless the content is
  sanitized by a maintained library and the exception is documented
  with its reason.
- Sanitize on the server for stored content (defense in depth), not
  only in the browser.
- Never build JavaScript by concatenating user data into a script
  block; pass data through safe serialization or data attributes.
- Escape JSON embedded in HTML pages so a closing `</script>` inside
  the data cannot break out of the script block.
- Set `HttpOnly` on session cookies so a successful XSS cannot easily
  steal the session token; this is mitigation, not a fix.
- CSP is a safety net, not a substitute for encoding. Deploy both.

### Accessibility

- Sanitizer configuration must preserve accessibility attributes:
  `alt`, `aria-*`, `role`, `for` / `id`, and `lang` survive
  sanitization.
- Test the sanitizer against accessible markup: a policy that strips
  `aria-label` or `alt` breaks the page it protects.
- Encoding output must not double-encode alt text or labels into
  unreadable entities for assistive technology.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Treat all user input as untrusted, including content from other
  users, third-party APIs, and URL parameters.
- Keep a short allowlist for rich-text features (bold, italic, links,
  lists) rather than permitting broad HTML.
- Use `textContent` instead of `innerHTML` when setting text from
  JavaScript.
- Audit third-party scripts and widgets: they run with the page's
  privileges and can introduce XSS.
- Review stored content paths (comments, profiles, file names) as
  carefully as reflected ones; stored XSS affects every viewer.
- Re-check after framework or sanitizer upgrades: defaults can change.

## Security Considerations

- XSS is an injection flaw: the root fix is output encoding and
  sanitization, not blocking specific payloads.
- Denylist filtering of tags or keywords is bypassable and must not
  be the only defense.
- DOM-based XSS happens entirely in the browser (reading from the URL
  or storage into a dangerous sink); audit client-side code, not only
  server templates.
- A successful XSS can bypass CSRF tokens and perform actions as the
  victim, which is why XSS prevention and `csrf-protection` are
  complementary.

## Performance Considerations

- Sanitization adds CPU cost per render; sanitize stored content
  once at write time and cache the sanitized result rather than
  sanitizing on every read.
- CSP enforcement has negligible runtime cost; the cost is in
  writing and maintaining the policy.
- Prefer framework escaping (already in the render path) over extra
  manual encoding passes.

## Common Mistakes

- Using `dangerouslySetInnerHTML` or `innerHTML` for content that
  could be plain text.
- Filtering out `<script>` and assuming safety — event handlers,
  `javascript:` URLs, and SVG payloads bypass tag denylists.
- Sanitizing only on the client — an attacker can call the API
  directly and store unsanitized content.
- Trusting content because it came from the database — stored XSS is
  the most damaging form.
- Forgetting URL contexts — a `javascript:` link is XSS even with
  perfect HTML escaping.
- Embedding unescaped JSON in a script block — `</script>` inside
  data ends the block early.

## Examples

```tsx
// Safe by default: React escapes interpolated values.
export function Comment({ author, body }: { author: string; body: string }) {
  return (
    <article>
      <h3>{author}</h3>
      <p>{body}</p>
    </article>
  );
}
```

```tsx
// Rich text only: sanitize with DOMPurify, then render.
import DOMPurify from "dompurify";

export function RichText({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href"],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

```ts
// Validate link URLs before rendering them.
function isSafeLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "https://example.com");
    return parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}
```

## Validation Checklist

- [ ] Every user-content render path is inventoried and encoded for
      its context.
- [ ] No raw HTML insertion remains except documented, sanitized
      exceptions.
- [ ] Hostile payloads (script tags, event handlers, `javascript:`
      URLs) render as inert text or are stripped.
- [ ] Stored content is sanitized on the server, not only in the
      browser.
- [ ] A Content Security Policy is set and blocks inline scripts.
- [ ] Session cookies use the `HttpOnly` flag.
- [ ] A regression test asserts a representative payload is
      neutralized.
- [ ] Accessibility: sanitizer preserves alt, aria-*, role, for/id, and lang.

## Expected Deliverables

- Fixed rendering code with raw HTML insertion removed or sanitized.
- Sanitizer configuration (allowlisted tags and attributes) with its
  reasoning.
- CSP configuration changes (or a reference to the `secure-headers`
  work).
- Regression tests with representative hostile payloads and their
  results.

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) —
  canonical guidance.
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) —
  CSP reference.
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitizer.
- Related skills in this repository: `owasp`, `secure-headers`,
  `csrf-protection`, `security-auditing`.
