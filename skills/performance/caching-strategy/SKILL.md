---
name: caching-strategy
description: >
  Design and implement HTTP caching for a website: cache headers for
  static assets and HTML, cache busting with content hashes, CDN
  caching, and revalidation rules. Use when repeat visits are slow,
  time to first byte is high, assets re-download on every visit, or
  you need to cut origin load. Covers Cache-Control, ETag, service
  workers, and stale-while-revalidate.
license: MIT
metadata:
  version: "1.0.0"
  category: performance
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Caching Strategy

## Purpose

This skill helps an agent set up caching so repeat visits are fast and
the origin server does less work: the right headers for each resource
type, cache busting that never serves stale assets, and a CDN layer
where it pays off. The outcome is a site where static assets are cached
aggressively and safely, and HTML is fresh when it needs to be.

## When to Use

- Repeat visits are slow, or assets re-download on every page view.
- Time to first byte is high for users far from the origin server.
- Deploying a site and needing a cache policy for assets and HTML.
- Origin load or bandwidth costs are higher than they should be.
- Setting up a CDN in front of a site or API.

## When Not to Use

- When the problem is first-visit performance for a single page —
  caching helps repeat visits; use `core-web-vitals` or
  `image-optimization` for first-visit issues.
- When the content is personalized per user and must never be cached
  — caching is the wrong tool; focus on server response time.
- When the task is database or application-level caching (query
  caches, in-memory stores) — that is a backend concern outside this
  skill.
- When the site has almost no repeat traffic — the benefit is small
  and the staleness risk is real.

## Prerequisites

- Access to the server, framework, or CDN configuration that sets
  HTTP headers.
- A list of the resource types the site serves (HTML, JS, CSS,
  images, fonts, API responses).
- Knowledge of which content changes on deploy and which changes
  independently (for example, user uploads).
- A way to inspect response headers (browser DevTools Network panel
  or `curl`).

## Official Documentation

- [web.dev — HTTP caching](https://web.dev/) — Google's guide to
  Cache-Control and caching strategies.
- [MDN — HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
  — the full reference for cache headers and validation.
- [MDN — Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
  — every directive and what it means.
- Cache-Control semantics are defined by RFC 9111 (which obsoletes
  the older RFC 7234 — do not cite that); `immutable` is defined
  by RFC 8246, and `stale-while-revalidate` and `stale-if-error`
  by RFC 5861.

## Required Workflow

1. Inventory the resources. For each type (HTML, JS, CSS, images,
   fonts, API responses), note how often it changes and whether it
   is the same for every user.
2. Inspect current headers. Use `curl -I` or DevTools to record the
   Cache-Control, ETag, and Last-Modified headers for a sample of
   each resource type.
3. Assign a policy per resource type:
   - Content-hashed static assets (JS, CSS, images, fonts): long
     cache lifetime, immutable.
   - HTML: short lifetime with revalidation, or no caching for
     pages that change frequently.
   - API responses: cache only when the data is public and the
     staleness window is acceptable; otherwise do not cache.
   - Personalized or authenticated responses: never cache in a
     shared cache.
4. Implement cache busting: ensure static asset filenames include a
   content hash so a new deploy produces new URLs and old cached
   copies are never served by mistake.
5. Configure the CDN (if used) to respect origin headers, and set
   cache purge rules for deploys.
6. Verify with headers: request each resource type and confirm the
   headers match the intended policy, and confirm a repeat request
   is served from cache.
7. Test a deploy: change an asset, deploy, and confirm the new
   version is served (new hash) while unchanged assets stay cached.

## Implementation Standards

- Static assets with content-hashed filenames: `Cache-Control:
  public, max-age=31536000, immutable`. The hash guarantees a
  changed file gets a new URL, so a long lifetime is safe.
- HTML documents: `Cache-Control: no-cache` (revalidate on every
  request) or a short `max-age` with `must-revalidate`, unless the
  page is genuinely static and a deploy purge covers it.
- Never use `max-age` without `immutable` for hashed assets that
  must not be revalidated, and never use `immutable` for a URL whose
  content can change.
- Use `stale-while-revalidate` for resources where slightly stale
  content is acceptable, so the cache serves instantly while
  refreshing in the background.
- Consider `stale-if-error` for resources where serving a stale
  copy beats an error page when the origin fails; do not combine
  it with `must-revalidate`, which forbids serving stale content
  once it has expired.
- Set `Vary` correctly when the response depends on request headers
  (for example, `Vary: Accept-Encoding`), or caches may serve the
  wrong variant.
- API responses that are public and slow-changing may use a short
  `max-age` plus `stale-while-revalidate`; private or personalized
  responses must use `private, no-store` or `no-cache`.
- Service workers are an additional layer, not a replacement for
  HTTP caching. Use them for offline support and precaching, and
  keep their cache versioning tied to deploys.

## Best Practices

- Cache at the edge (CDN) for global audiences; the origin should
  rarely serve a static asset directly.
- Prefer content-hash filenames over query-string versioning;
  some caches ignore query strings.
- Purge or version the CDN cache on every deploy that changes HTML
  or non-hashed assets.
- Monitor cache hit ratio at the CDN: a low hit ratio means the
  policy is not working as intended.
- Document the caching policy in the repository so the next deploy
  does not silently change it.
- Test caching with a cold cache and a warm cache, and report both.

## Security Considerations

- Never cache authenticated or personalized content in a shared
  cache. A cached response served to the wrong user is a data leak.
- Use `Cache-Control: no-store` for responses containing sensitive
  data (account pages, tokens, personal information).
- Be careful with `Vary` and cache keys: a cache that ignores a
  header the response depends on can serve one user's content to
  another.
- Service workers intercept all requests for their scope; a
  compromised or buggy service worker can serve stale or wrong
  content. Keep the service worker script small, reviewed, and
  versioned.
- CDN cache purge credentials are sensitive; store them in a secret
  manager and restrict who can purge.

## Performance Considerations

- A long `max-age` on a non-hashed asset means users can be stuck
  with a stale version for the full lifetime; only use long
  lifetimes with content hashes.
- Revalidation (`no-cache` with ETag) still costs a round trip; use
  it for HTML, not for assets that could be immutable.
- `stale-while-revalidate` trades freshness for speed; use it only
  where slightly stale content is harmless.
- CDN cache misses add latency; a cache policy that never hits is
  worse than no CDN at all.

## Common Mistakes

- Setting a long `max-age` on HTML, so users see an outdated page
  after a deploy.
- Forgetting cache busting, so a changed asset keeps its old URL
  and browsers serve the stale copy.
- Caching API responses that contain user-specific data.
- Using `no-cache` when `no-store` is meant — `no-cache` allows
  storage with revalidation; `no-store` forbids storage entirely.
- Assuming the CDN respects origin headers without verifying; many
  CDNs have their own default TTLs that override the origin.
- Testing caching only with a warm cache and reporting the warm
  numbers as representative.

## Examples

Cache headers for a content-hashed static asset (Node.js/Express).
The `express.static` options shown work in Express 4 and in
Express 5 (the current major, which requires Node.js 18+). In
Express, the `immutable` option only takes effect when `maxAge`
is greater than zero.

```js
// Hashed filenames are immutable: a changed file gets a new URL.
app.use('/assets', express.static('public/assets', {
  maxAge: '1y',
  immutable: true,
}));
```

Cache headers for an HTML document that must stay fresh:

```js
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile('public/index.html', { root: '.' });
});
```

Inspect the headers a server actually sends:

```bash
curl -I https://example.com/assets/app-9f3c2a1b.js
```

## Validation Checklist

- [ ] Each resource type has a documented cache policy.
- [ ] Hashed static assets return a long `max-age` with `immutable`.
- [ ] HTML returns `no-cache` or a short `max-age` with
      revalidation.
- [ ] No authenticated or personalized response is cacheable in a
      shared cache.
- [ ] A repeat request for a static asset is served from cache
      (verified in DevTools or with `curl`).
- [ ] After a deploy, changed assets are served fresh and unchanged
      assets stay cached.
- [ ] CDN purge or versioning is wired into the deploy process.

## Expected Deliverables

- A caching policy document: resource type, headers, and rationale.
- The server or CDN configuration implementing the policy.
- Header verification output for each resource type.
- A deploy test confirming fresh assets are served and stale ones
  are not.
- Notes on any resource that must never be cached and why.

## References

- [MDN — HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
  — cache headers and validation reference.
- [MDN — Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
  — every Cache-Control directive.
- [web.dev](https://web.dev/) — HTTP caching guides.
- Related skills in this repository: `core-web-vitals`,
  `web-performance-audit`, `image-optimization`, `bundle-optimization`.
