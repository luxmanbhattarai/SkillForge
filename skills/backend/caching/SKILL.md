---
name: caching
description: >
  Design and implement caching at every layer: HTTP caching, CDN caching,
  application caches with Redis, and cache invalidation. Use when adding a
  cache to speed up reads, reducing database or API load, fixing stale data
  bugs, or choosing TTLs and invalidation strategies.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a cache store such as Redis or the HTTP cache layer being used.
---

# Caching

## Purpose

This skill covers caching as a performance and resilience tool: HTTP
caching with `Cache-Control` and `ETag`, CDN caching, and application
caching with a store such as Redis. It covers the hard part — choosing
what to cache, for how long, and how to invalidate it — so the outcome
is faster reads without stale-data bugs.

## When to Use

- Adding a cache to reduce database load or API latency.
- Setting HTTP cache headers for an API or static assets.
- Fixing stale data: users seeing old content after an update.
- Choosing TTLs, eviction policies, or an invalidation strategy.
- Protecting a slow dependency with a cache-aside or stale-while-
  revalidate pattern.

## When Not to Use

- Data that must always be fresh (account balances, inventory counts
  at checkout) — cache only with a very short TTL or not at all.
- Data that changes on every request — caching adds overhead without
  hits.
- Personalized responses shared across users — a shared cache must
  never serve one user's data to another.
- Solving a slow database query — fix the query and add an index
  first; caching a slow query hides the problem.

## Prerequisites

- A cache store chosen for the project (Redis is the default in this
  library; a CDN or HTTP cache may be enough for read-heavy public
  data).
- Knowledge of which data is read often, changes rarely, and is safe
  to share between users.
- A way to observe cache hit rate, evictions, and memory usage.

## Official Documentation

- [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
  — the authoritative HTTP caching specification.
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
  — a practical guide to cache headers and validation.
- [Redis documentation](https://redis.io/docs/) — the reference for
  Redis commands, data types, and eviction.
- [Cloudflare Cache documentation](https://developers.cloudflare.com/cache/)
  — CDN caching concepts and configuration.

## Required Workflow

1. Identify the cache candidates: read-heavy, rarely changing data
   with measurable latency or load cost. Measure before caching.
2. Choose the layer: HTTP cache headers for public, cacheable
   responses; CDN for static assets and public pages; application
   cache (Redis) for computed or database-backed data.
3. Design the cache key: it must include everything that affects the
   value (resource ID, version, user or tenant scope, query
   parameters). A key missing a dimension serves wrong data.
4. Choose a TTL per entry: short for changing data, longer for stable
   data. Every entry gets an explicit TTL — no entry lives forever.
5. Choose the invalidation strategy: TTL expiry, explicit invalidation
   on write, or versioned keys. Document which one applies to each
   cached value.
6. Implement the read path: check the cache, fall back to the source
   on a miss, and populate the cache on the way back (cache-aside).
7. Protect against stampedes: when a hot key expires, only one request
   should recompute it (lock, request coalescing, or
   stale-while-revalidate).
8. Add monitoring for hit rate, miss latency, evictions, and memory,
   and verify the cache actually improves the metric it was added for.

## Implementation Standards

- Every cached entry has an explicit TTL. Use short TTLs (seconds to
  minutes) for user-facing data that changes, longer TTLs (hours) for
  reference data.
- Cache keys are namespaced and versioned, for example
  `v1:product:123` or `v1:user:456:profile`. Bumping the version
  invalidates the whole namespace safely.
- Never cache a response that includes another user's data under a
  shared key. Include the user or tenant ID in the key, or mark the
  response `private`.
- HTTP responses that are cacheable set `Cache-Control` explicitly
  (`public, max-age=60` for shared caches, `private` for per-user
  data, `no-store` for sensitive data). Never rely on default
  caching behavior.
- Use `ETag` and `If-None-Match` for conditional requests so clients
  can revalidate cheaply.
- On write, invalidate the affected keys (or bump the version) in the
  same code path as the write — invalidation is part of the write, not
  an afterthought.
- Treat the cache as a performance layer, not a database: the system
  must work correctly (if slower) with an empty cache. Never store the
  only copy of data in a cache.
- Serialize values explicitly (JSON) and version the serialized shape;
  a code deploy must not misread old cached values.

## Best Practices

- Cache at the highest layer that is correct: a CDN or HTTP cache
  hit avoids the application entirely.
- Use `stale-while-revalidate` for data where slightly stale is
  acceptable: serve the stale value immediately and refresh in the
  background.
- Warm the cache for known hot keys after a deploy or a restart
  instead of letting the first requests pay the miss cost.
- Keep cached values small; cache the rendered or computed result,
  not the raw dataset.
- Set a maximum memory and an eviction policy (for example
  `allkeys-lru`) on the cache store so a full cache degrades
  gracefully instead of failing writes.
- Log cache misses for hot keys during development to catch key
  design mistakes early.
- Prefer one cache store per deployment over a cache per service,
  unless isolation is required.

## Security Considerations

- Never cache sensitive data (tokens, passwords, personal data) in a
  shared cache, and mark sensitive responses `Cache-Control: no-store`.
- Include the user or tenant scope in every key for per-user data;
  a missing scope is a data leak.
- Validate cached values on read where feasible: a poisoned cache
  entry must not crash the application or serve wrong data.
- Restrict network access to the cache store: it should not be
  reachable from the public internet, and it should require
  authentication.
- Do not log cache keys that contain user identifiers in shared logs
  without considering privacy.

## Performance Considerations

- Measure hit rate per key namespace: a cache with a low hit rate is
  overhead, not a speedup.
- Avoid the cache stampede: use a lock, request coalescing, or
  stale-while-revalidate for hot keys.
- Avoid caching large values: a few megabytes per entry exhausts
  memory quickly and slows eviction.
- Use pipelining or batch reads (for example Redis `MGET`) when
  loading many keys at once.
- Set connection pooling and timeouts for the cache client so a slow
  cache does not block the application; on a cache error, fall back
  to the source and log the failure.
- Remember that cache invalidation on write adds latency to writes;
  keep the invalidated key set small and precise.

## Common Mistakes

- Caching without a TTL — stale data lives forever until someone
  notices. Every entry needs an explicit TTL.
- A cache key missing a dimension (locale, user, tenant) — one user
  sees another user's data. Include every dimension in the key.
- Caching the only copy of data — a cache flush becomes data loss.
  The cache is a copy, never the source of truth.
- Invalidating on a different code path than the write — the two
  drift apart and stale data appears. Invalidate in the write path.
- No stampede protection — a hot key expires and a hundred requests
  recompute it at once. Coalesce or serve stale.
- Caching error responses with a long TTL — a transient failure
  becomes a persistent one. Cache errors briefly or not at all.

## Examples

Cache-aside read with a versioned key and a TTL (Redis-style):

```ts
async function getProduct(productId: string, cache: Cache, db: Database) {
  const key = `v1:product:${productId}`;
  const cached = await cache.get(key);
  if (cached) {
    return JSON.parse(cached) as Product;
  }
  const product = await db.products.findById(productId);
  if (!product) return null;
  // TTL of 300 seconds; invalidation on write bumps the version or
  // deletes this key.
  await cache.set(key, JSON.stringify(product), { ttlSeconds: 300 });
  return product;
}
```

HTTP cache headers for a public, cacheable response:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=60, stale-while-revalidate=30
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Content-Type: application/json
```

## Validation Checklist

- [ ] Every cached entry has an explicit TTL.
- [ ] Cache keys include all dimensions that affect the value (ID,
      version, user or tenant scope).
- [ ] Writes invalidate the affected keys in the same code path.
- [ ] The system works correctly with an empty cache.
- [ ] Hot keys have stampede protection.
- [ ] Sensitive responses use `Cache-Control: no-store`.
- [ ] Hit rate, evictions, and memory are monitored.

## Expected Deliverables

- Cache design for the affected reads: layer, key scheme, TTL, and
  invalidation strategy, documented.
- Implemented cache-aside reads and write-path invalidation.
- HTTP cache headers for cacheable responses.
- Monitoring for hit rate and memory, and a before/after measurement
  of the improvement.

## References

- [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Redis documentation](https://redis.io/docs/)
- [Cloudflare Cache documentation](https://developers.cloudflare.com/cache/)
- Related skills in this repository: `rest-api`, `rate-limiting`,
  `nodejs`, `frontend-performance`.
