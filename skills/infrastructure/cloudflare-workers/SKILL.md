---
name: cloudflare-workers
description: >
  Use this skill when building, testing, and deploying serverless code on
  Cloudflare Workers: writing Worker handlers, configuring wrangler.toml,
  adding bindings for D1, R2, KV, Queues, and Durable Objects, managing
  secrets, setting compatibility dates, and deploying with Wrangler.
  Trigger keywords: Cloudflare Workers, Wrangler, wrangler.toml, Worker,
  edge function, serverless, fetch handler, binding, compatibility date.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js, the Wrangler CLI, a Cloudflare account, and network access to Cloudflare.
---

# Cloudflare Workers

## Purpose

This skill covers building and deploying serverless applications on
Cloudflare Workers using Wrangler. It produces Workers that follow the
Workers runtime model, use bindings correctly, keep secrets out of source
code, and deploy reliably to production.

## When to Use

- Creating a new Worker or adding an API endpoint that runs on Workers.
- Configuring `wrangler.toml`, bindings, routes, or environments.
- Adding secrets with Wrangler or reading environment variables in a Worker.
- Debugging a Worker with `wrangler dev` or `wrangler tail`.
- Migrating an existing Node.js server or Express-style handler to Workers.
- Serving a static site or an Astro site from Workers.

## When Not to Use

- Platform-level DNS, SSL, or zone configuration — use `cloudflare`.
- Database schema and query design — use `cloudflare-d1`.
- Object storage layout and uploads — use `cloudflare-r2`.
- Queue producer/consumer design — use `cloudflare-queues`.
- Stateful coordination across requests — use `durable-objects`.
- Deploying to Vercel or a container host — use `vercel` or `docker`.

## Prerequisites

- Node.js installed (22, 24, and 26 are the active LTS lines;
  Node.js 26 "Lithium" is the newest LTS. Node.js 20
  reached end-of-life on 30 April 2026).
- Wrangler 4.x installed, either globally or as a project dev
  dependency. Wrangler 4 is the current major version; in v4, commands
  that can run locally default to local mode and need `--remote` to
  reach the Cloudflare API.
- A Cloudflare account, authenticated with `wrangler login`.
- A `wrangler.toml` (or `wrangler.json` / `wrangler.jsonc`) in the
  project root for any non-trivial Worker.
- Understanding that Workers run on V8 isolates, not on Node.js: no
  filesystem access, no long-lived processes, no native Node.js modules
  unless the runtime provides a compatibility layer.
- Version range: Wrangler 4.x; Node.js 22, 24, or 26 LTS.

## Official Documentation

- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  runtime, APIs, and guides.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference and configuration.
- [Cloudflare Docs](https://developers.cloudflare.com/) — all Cloudflare
  products, including bindings reference pages.

## Required Workflow

1. Confirm the project layout and the existing `wrangler.toml` before
   writing code; do not create a second config file.
2. Set a `compatibility_date` in `wrangler.toml` to a recent date so the
   Worker opts into current runtime behavior.
3. Define bindings in `wrangler.toml` for every external resource the
   Worker needs (D1, R2, KV, Queues, Durable Objects, secrets).
4. Write the Worker using the module format with an exported `fetch`
   handler, typed with the generated `Env` interface where TypeScript is
   used.
5. Keep secrets out of code and config: use `wrangler secret put` and read
   them from `env`.
6. Test locally with `wrangler dev` and confirm the handler responds as
   expected, including error cases.
7. Deploy with `wrangler deploy` and verify the deployed URL with `curl`.
8. Observe the deployment with `wrangler tail` when debugging live issues.

## Implementation Standards

- Use the module worker format (`export default { async fetch(...) }`),
  not the legacy service-worker format.
- Declare every binding in `wrangler.toml` and access it only through the
  `env` argument; never hard-code resource names or IDs in handler code.
- Always set `compatibility_date`; without it, the Worker runs with old
  default behavior and may miss runtime fixes.
- Return a `Response` from every code path, including error paths, with an
  appropriate status code.
- Use `ctx.waitUntil()` for work that should continue after the response is
  sent, such as logging or cache writes.
- Keep the Worker entrypoint small: move business logic into modules and
  keep the handler thin.
- Use `wrangler types` to generate TypeScript types for bindings when the
  project uses TypeScript.
- Never use Node.js-only APIs (such as `fs` or `net`) in Worker code
  unless the docs confirm runtime support for them.

## Best Practices

- Separate environments (`dev`, `staging`, `production`) in
  `wrangler.toml` so local testing never touches production bindings.
- Use routes and custom domains for production Workers instead of sharing
  the default `workers.dev` subdomain for user-facing traffic.
- Handle upstream failures gracefully: catch fetch errors to external
  services and return a meaningful status instead of letting the Worker
  throw.
- Keep cold starts fast by keeping the bundle small and avoiding heavy
  dependencies at module load time.
- Log structured JSON so `wrangler tail` output is easy to filter.
- Version deployments by keeping `wrangler.toml` in source control and
  deploying from CI rather than from a developer machine for production.

## Security Considerations

- Secrets must be set with `wrangler secret put` and read from `env`;
  never commit secrets to source control or embed them in `wrangler.toml`.
- Validate and sanitize all input from requests, including headers, query
  parameters, and JSON bodies.
- Do not trust `request.cf` data or client-supplied headers for
  authorization decisions without additional verification.
- Restrict CORS to the origins the Worker is meant to serve; do not return
  `Access-Control-Allow-Origin: *` for endpoints that handle credentials.
- Rate-limit public endpoints or place them behind Cloudflare rate-limiting
  rules to prevent abuse.

## Performance Considerations

- Workers run at the edge close to the user; keep handler work CPU-light
  because CPU time per request is limited by plan.
- Use the Cache API or Cloudflare cache for repeated responses instead of
  recomputing them.
- Fetch external services in parallel with `Promise.all` instead of
  sequentially when the calls are independent.
- Avoid large dependencies: bundle size affects cold start and deployment
  time.
- Use streaming responses for large payloads rather than buffering the
  whole body in memory.

## Common Mistakes

- Forgetting `compatibility_date` — the Worker runs with legacy runtime
  behavior and newer APIs may be unavailable.
- Reading a secret from `process.env` — Workers have no `process.env`;
  secrets and vars live on `env`.
- Using Node.js APIs such as `fs` in a Worker — the runtime has no
  filesystem; use R2, KV, or D1 instead.
- Deploying from a developer machine with local-only config — production
  deploys should come from CI with the committed `wrangler.toml`.
- Binding a resource in code but not in `wrangler.toml` — the binding is
  `undefined` at runtime and the Worker fails.
- Swallowing errors and returning HTTP 200 — return the correct status so
  clients and monitors can detect failures.

## Examples

Minimal TypeScript Worker with a D1 binding and a secret:

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2026-11-20"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "00000000-0000-0000-0000-000000000000"
```

```ts
// src/index.ts
export interface Env {
  DB: D1Database;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }
    return Response.json({ ok: true });
  },
};
```

Deploy and check logs:

```bash
wrangler secret put API_KEY
wrangler deploy
wrangler tail
```

## Validation Checklist

- [ ] `wrangler.toml` exists, sets `compatibility_date`, and declares all
      bindings the code uses.
- [ ] `wrangler dev` serves the Worker locally and the happy path works.
- [ ] No secret appears in source code, config, or committed files.
- [ ] `wrangler deploy` succeeds and the deployed URL responds correctly.
- [ ] Error paths return appropriate HTTP status codes.
- [ ] `wrangler tail` shows no unhandled exceptions after deployment.

## Expected Deliverables

- The Worker source code and `wrangler.toml` committed to the project.
- A successful `wrangler deploy` and the deployed URL.
- Notes on any secrets that must be set with `wrangler secret put` and any
  bindings that must exist before deployment.

## References

- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  runtime reference and guides.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI and configuration reference.
- Related skills in this repository: `cloudflare`, `cloudflare-d1`,
  `cloudflare-r2`, `cloudflare-kv`, `cloudflare-queues`, `durable-objects`,
  `deployment`, `observability`.
