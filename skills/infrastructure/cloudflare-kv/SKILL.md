---
name: cloudflare-kv
description: >
  Use this skill when storing and reading small key-value data with
  Cloudflare KV: creating KV namespaces, binding KV to Workers, reading
  and writing values, choosing KV over D1 or R2, and handling KV's
  eventual consistency. Trigger keywords: KV, Cloudflare KV, key-value,
  namespace, wrangler kv, KVNamespace, edge cache, feature flag.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js, the Wrangler CLI, a Cloudflare account, and network access to Cloudflare.
---

# Cloudflare KV

## Purpose

This skill covers Cloudflare KV, the globally distributed key-value store
for Workers. It produces correct namespace setup, binding configuration,
and read/write code for small values that need fast, global, read-heavy
access.

## When to Use

- Storing configuration, feature flags, or small lookup data read by a
  Worker.
- Caching rendered pages, API responses, or computed results at the edge.
- Creating a KV namespace and binding it to a Worker.
- Storing user preferences or session-adjacent data that tolerates
  eventual consistency.
- Deciding whether a value belongs in KV rather than D1 or R2.

## When Not to Use

- Relational data with queries, joins, or transactions — use
  `cloudflare-d1`.
- Files, images, or binary blobs — use `cloudflare-r2`.
- Data that must be strongly consistent across reads and writes — use
  `cloudflare-d1` or `durable-objects`.
- Background job processing — use `cloudflare-queues`.
- Counters, rate limiting, or coordination that needs atomic updates —
  use `durable-objects`.
- Writing the Worker itself — use `cloudflare-workers`.

## Prerequisites

- A Cloudflare account and Wrangler installed and authenticated.
  Wrangler 4.x is the current major version. In Wrangler 4, `wrangler
  kv` commands default to local mode; add `--remote` to read or write
  the live namespace (in Wrangler 3 they defaulted to remote).
- A Worker project with a `wrangler.toml` that will declare the KV binding.
- An understanding of eventual consistency: a write may not be visible
  to every edge location immediately.
- An understanding of key design: keys are strings, values are small
  (check the KV docs for current size limits).
- Version range: Wrangler 4.x.

## Official Documentation

- [Cloudflare KV docs](https://developers.cloudflare.com/kv/) — concepts,
  limits, and API reference.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  how bindings reach Worker code.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference including `wrangler kv` commands.

## Required Workflow

1. Create the namespace with `wrangler kv namespace create` and record
   the namespace ID it returns.
2. Create a separate preview namespace for local development when the
   project needs one.
3. Add the `[[kv_namespaces]]` binding to `wrangler.toml` with the
   binding name and namespace ID.
4. Design keys before writing code: use a consistent prefix scheme such
   as `config:site-name` or `cache:article:<slug>`.
5. Write read code that handles a missing key (null) explicitly.
6. Write write code that sets an expiration TTL where the data is
   temporary.
7. Test reads and writes locally with `wrangler dev`.
8. Deploy and verify the behavior against the live namespace.

## Implementation Standards

- Use a consistent key prefix scheme and document it in the project.
- Always handle the null case on `get`; a missing key is a normal result,
  not an error.
- Store JSON as a string with `JSON.stringify` and parse it on read;
  validate the parsed shape before using it.
- Set an `expirationTtl` on cached values so stale data cannot live
  forever.
- Keep values small; KV is for small values, not documents or files.
- Use separate namespaces per environment (production vs preview) so
  local testing never writes to production data.
- Do not use KV as a primary database for data that needs queries,
  transactions, or strong consistency.

## Best Practices

- Cache expensive computations and API responses in KV with a TTL, and
  fall back to recomputing when the key is missing.
- Use `list` sparingly and with a prefix; listing is paginated and is
  not a query engine.
- Version cached values by including a version in the key when the shape
  changes, so old entries do not break new code.
- Prefer reading from KV in the Worker rather than fetching from origin
  on every request.
- Keep write volume low: KV is optimized for reads; frequent writes to
  the same key are an anti-pattern.
- Document the key scheme, TTLs, and which code owns each prefix.

## Security Considerations

- Do not store secrets in KV; use `wrangler secret put` for secrets.
- Do not store sensitive personal data in KV unless the application
  genuinely needs it at the edge; prefer D1 with access controls.
- Validate keys derived from user input: restrict the character set and
  length so a user cannot read or overwrite arbitrary keys.
- Treat cached data as untrusted on read: validate the shape before use,
  since a stale or corrupted entry could break the handler.
- Restrict who can run `wrangler kv` commands against production
  namespaces.

## Performance Considerations

- KV reads are fast and globally distributed; they are well suited to
  read-heavy workloads.
- Writes propagate globally with eventual consistency; do not read
  immediately after a write and expect the new value everywhere.
- Cache values in the Worker only for the lifetime of a single request;
  do not hold KV data in module-level state across requests.
- Avoid hot keys: many writes to the same key in a short window perform
  poorly.
- Use the Cache API for HTTP response caching and KV for application
  data; the two complement each other.

## Common Mistakes

- Reading immediately after a write and expecting the new value — KV is
  eventually consistent; design for that.
- Using KV for counters or rate limiting — concurrent writes can be
  lost; use Durable Objects instead.
- Storing large values or files in KV — use R2 for files and D1 for
  structured data.
- Forgetting the preview namespace — local development writes to the
  production namespace.
- Assuming `get` always returns a value — a missing key returns null and
  must be handled.
- Using user input directly as a key without validation — a crafted key
  can read or overwrite unrelated data.

## Examples

Create a namespace and bind it:

```bash
wrangler kv namespace create MY_CACHE
```

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "00000000-0000-0000-0000-000000000000"
preview_id = "11111111-1111-1111-1111-111111111111"
```

Read and write with a TTL:

```ts
export interface Env {
  CACHE: KVNamespace;
}

// Read; a missing key returns null.
const cached = await env.CACHE.get("cache:article:intro", "text");
if (cached !== null) {
  return new Response(cached, { headers: { "Content-Type": "text/html" } });
}

// Write with a one-hour TTL.
await env.CACHE.put("cache:article:intro", renderedHtml, {
  expirationTtl: 3600,
});
```

## Validation Checklist

- [ ] The namespace exists and the binding in `wrangler.toml` uses the
      correct namespace ID.
- [ ] A separate preview namespace is configured for local development.
- [ ] Read code handles a missing key (null) explicitly.
- [ ] Cached values have an expiration TTL.
- [ ] No secret or sensitive personal data is stored in KV.
- [ ] Reads and writes work locally and after deployment.

## Expected Deliverables

- The KV namespace created and bound in `wrangler.toml`.
- Worker code that reads and writes KV with null handling and TTLs.
- Documentation of the key scheme and TTLs.
- Verification that reads and writes work after deployment.

## References

- [Cloudflare KV docs](https://developers.cloudflare.com/kv/) — concepts,
  limits, and API reference.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference.
- Related skills in this repository: `cloudflare`, `cloudflare-workers`,
  `cloudflare-d1`, `cloudflare-r2`, `durable-objects`.
