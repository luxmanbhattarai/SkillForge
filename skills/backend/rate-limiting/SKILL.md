---
name: rate-limiting
description: >
  Protect APIs from abuse and overload with rate limiting: fixed and sliding
  windows, token buckets, per-user and per-IP limits, 429 responses, and
  Retry-After headers. Use when adding rate limits to an API, choosing a
  limiting algorithm, or fixing abuse, scraping, or overload incidents.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a shared store such as Redis for limits that work across multiple server instances.
---

# Rate Limiting

## Purpose

This skill covers protecting APIs from abuse, scraping, and overload
with rate limits: choosing an algorithm, scoping limits to the right
identity, returning clear `429` responses, and handling bursts fairly.
The outcome is an API that stays available under attack or runaway
clients, and that tells legitimate clients exactly when they can retry.

## When to Use

- Adding rate limits to a new or existing API.
- Choosing between fixed window, sliding window, and token bucket
  algorithms.
- Responding to abuse, scraping, or an overload incident.
- Designing tiered limits for different plans or client types.
- Adding `429` handling and `Retry-After` support to a client.

## When Not to Use

- Hardening authentication against brute force alone — rate limiting
  helps, but also use account lockout, CAPTCHA, and strong password
  policy (see `auth-security`).
- Protecting against distributed denial-of-service at the network
  layer — that needs edge and infrastructure mitigation, not
  application rate limiting.
- Throttling internal background work — use queue concurrency limits
  (see `queues`) instead.
- Billing and quota enforcement for a paid API — quotas are a
  business concern; rate limiting is a protection concern. They can
  share infrastructure but should be designed separately.

## Prerequisites

- A shared store for counters when the API runs on more than one
  instance (Redis is the standard choice).
- Agreement on the limit scope: per IP address, per API key, per user,
  or a combination.
- Knowledge of the API's normal traffic profile so limits are set
  above legitimate peaks.

## Official Documentation

- [RFC 6585 — Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585.html)
  — defines status code 429.
- [RateLimit header fields (IETF draft, rev. 11, May 2026)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
  — the current draft defines two fields, `RateLimit-Policy` and
  `RateLimit`. It is still an Internet-Draft, not an RFC, and its
  syntax has changed before: the older `RateLimit-Limit`,
  `RateLimit-Remaining`, and `RateLimit-Reset` names were the draft's
  syntax up to rev. 06 and were superseded in rev. 08. `Retry-After`
  (RFC 9110) remains the stable, standardized mechanism for telling
  a client when to retry.
- [Redis documentation](https://redis.io/docs/) — the reference for
  the store most limiters use.
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
  — edge rate limiting rules and concepts.

## Required Workflow

1. Identify what to protect: public endpoints, login and signup,
   expensive operations, and any endpoint that has been abused.
2. Choose the identity for the limit: authenticated user or API key
   where available, IP address for anonymous traffic. Never rely on a
   client-supplied identifier alone.
3. Choose the algorithm: fixed window for simple cases, sliding window
   for smoother behavior at window boundaries, token bucket when
   bursts should be allowed up to a cap.
4. Set the limits from real traffic data: above the legitimate peak,
   below the point where the system degrades. Start permissive and
   tighten with evidence.
5. Implement the check before expensive work: the limiter runs before
   authentication-heavy or database-heavy processing where possible.
6. Return `429 Too Many Requests` with a `Retry-After` header and the
   draft `RateLimit-Policy` and `RateLimit` headers so clients know
   the limit and when to retry.
7. Add monitoring and alerts for limit hits: a sudden spike may be an
   attack or a misconfigured client.
8. Document the limits publicly for third-party clients, including how
   to request a higher tier.

## Implementation Standards

- Limits are enforced in a shared store (Redis) when the API runs on
  multiple instances; an in-memory limiter per instance lets a client
  multiply the limit by the instance count.
- The limiter key includes the scope and the resource, for example
  `ratelimit:user:{userId}:orders:create`.
- Use atomic operations (a Lua script or a single increment with an
  expiry) so concurrent requests cannot race past the limit.
- Return `429` with `Retry-After` (seconds until the client may retry)
  and the current draft headers: `RateLimit-Policy:
  "name";q=<quota>;w=<window-seconds>` for the policy and `RateLimit:
  "name";r=<remaining>;t=<seconds>` for the current state. Do not use
  the superseded `RateLimit-Limit` / `RateLimit-Remaining` /
  `RateLimit-Reset` names for new APIs — but note they are still
  common in the wild, so a client may need to accept both forms.
- Apply stricter limits to expensive or sensitive endpoints (login,
  password reset, payment) than to cheap reads.
- Fail open or closed deliberately: if the limiter store is down,
  decide in advance whether to allow requests (fail open, risking
  abuse) or reject them (fail closed, risking an outage). Document the
  choice; most public APIs fail open with an alert.
- Never rate-limit by a header the client controls (such as
  `User-Agent` or a custom ID header) without a server-verified
  identity behind it.
- Exempt health checks and internal monitoring endpoints from limits.

## Best Practices

- Layer limits: a coarse global limit per IP plus finer per-user and
  per-endpoint limits.
- Use sliding window or token bucket for user-facing limits: fixed
  windows allow twice the limit in a burst straddling a boundary.
- Return limit headers on every response, not only on `429`s, so
  clients can pace themselves.
- Give clients a way to check their usage and a clear path to a higher
  limit.
- Log limited requests with the identity and endpoint so abuse can be
  investigated.
- Test the limiter: verify that the N+1th request is rejected, that
  the limit resets, and that one user's limit does not affect another.
- Review limits periodically against real traffic; limits set once and
  forgotten drift out of date.

## Security Considerations

- Rate-limit authentication endpoints aggressively: login, signup,
  password reset, and token endpoints are the first targets for
  credential stuffing.
- Do not reveal whether an account exists through different rate-limit
  behavior on login attempts.
- Treat the `X-Forwarded-For` header as untrusted unless the proxy is
  configured to set it and the app trusts only that proxy; otherwise
  attackers can spoof their IP.
- Watch for distributed abuse: many IPs each staying under the limit
  can still overwhelm the system. Combine IP limits with global and
  per-endpoint limits.
- Do not use rate limiting as the only defense: combine it with
  authentication, input validation, and abuse detection.

## Performance Considerations

- The limiter check must be fast (a single Redis round trip) and must
  not add a database query per request.
- Use pipelining or a Lua script to keep the check to one round trip.
- Set a timeout on the limiter store call so a slow Redis does not
  slow every request; on timeout, apply the documented fail-open or
  fail-closed behavior.
- Keep the limiter in front of expensive work: a request rejected by
  the limiter should cost almost nothing.
- Avoid a separate limiter call per endpoint when one call can cover
  the request; batch the checks.

## Common Mistakes

- In-memory limiting on a multi-instance deployment — the effective
  limit is multiplied by the instance count. Use a shared store.
- Fixed window without understanding the boundary burst — a client
  can send twice the limit across a boundary. Use sliding window or
  token bucket for strict limits.
- No `Retry-After` header — clients guess when to retry and hammer
  the API. Always send `Retry-After` with `429`.
- Limiting by a spoofable header — attackers rotate the header value
  and bypass the limit. Limit by a server-verified identity or a
  trusted IP.
- Limits set from guesses — too low and legitimate users are blocked;
  too high and the limit is useless. Set limits from real traffic.
- No monitoring — an attack or a misconfigured client goes unnoticed.
  Alert on limit-hit spikes.

## Examples

A sliding-window limiter shape with Redis (pseudocode for the
algorithm; use a maintained library in production):

```ts
// Sliding window: count requests in the last N seconds, reject over
// the limit. Implemented atomically (Lua script or ZADD + ZREMRANGEBYSCORE
// + ZCARD in a transaction) in production code.
async function isAllowed(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  // Remove timestamps older than the window, count the rest, and add
  // the current request — atomically.
  const count = await redis.slidingWindowCount(key, windowStart, now);
  return count <= limit;
}
```

A `429` response with the current draft headers (rev. 11):

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
RateLimit-Policy: "default";q=100;w=60
RateLimit: "default";r=0;t=12
Content-Type: application/problem+json

{
  "type": "https://iana.org/assignments/http-problem-types#quota-exceeded",
  "title": "Too many requests",
  "status": 429,
  "detail": "Rate limit of 100 requests per minute exceeded. Retry after 12 seconds.",
  "violated-policies": ["default"]
}
```

The `quota-exceeded` problem type and the `violated-policies`
extension are defined by the same draft. The `type` URI above is the
draft's registered problem type; a custom problem type URI is also
acceptable if the API documents it.

## Validation Checklist

- [ ] Limits are enforced in a shared store across all instances.
- [ ] The limiter key includes the scope (user, key, or IP) and the
      resource.
- [ ] The check is atomic; concurrent requests cannot race past the
      limit.
- [ ] `429` responses include `Retry-After` and the `RateLimit-Policy`
      and `RateLimit` headers.
- [ ] Authentication endpoints have stricter limits than reads.
- [ ] Fail-open or fail-closed behavior is documented and tested.
- [ ] Limit-hit spikes trigger an alert.
- [ ] Limits are documented for third-party clients.

## Expected Deliverables

- Rate-limit configuration per endpoint and scope, with limits derived
  from real traffic.
- A limiter implementation (or library integration) with atomic
  checks and standard headers.
- Tests verifying rejection at the limit, reset behavior, and
  isolation between users.
- Public documentation of the limits and the retry behavior.

## References

- [RFC 6585 — Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585.html)
- [RateLimit header fields (IETF draft, rev. 11)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
- [Redis documentation](https://redis.io/docs/)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- Related skills in this repository: `rest-api`, `api-design`,
  `caching`, `authentication`.
