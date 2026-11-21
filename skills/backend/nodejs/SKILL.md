---
name: nodejs
description: >
  Build and run server-side JavaScript and TypeScript applications with Node.js:
  project setup with ESM and TypeScript, dependency management with npm, HTTP
  servers, async patterns, error handling, testing, and production deployment.
  Use when creating or maintaining a Node.js service, CLI, or backend, when
  choosing between CommonJS and ESM, or when debugging Node.js runtime behavior.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS or later and npm; network access for installing dependencies.
---

# Node.js

## Purpose

This skill covers building production-ready server-side applications with
Node.js: project scaffolding, module system choice, async code, error
handling, testing, and deployment. The outcome is a Node.js service that
starts reliably, fails loudly instead of silently, and is easy to operate
in production.

## When to Use

- Creating a new Node.js service, API server, worker, or command-line tool.
- Choosing between ESM and CommonJS for a Node.js project.
- Debugging Node.js runtime behavior: event loop stalls, unhandled
  rejections, memory growth, or startup failures.
- Adding TypeScript, testing, linting, or a build step to a Node.js project.
- Preparing a Node.js service for production deployment.

## When Not to Use

- Building for an edge runtime such as Cloudflare Workers, where the
  runtime is not Node.js — use `cloudflare-workers` instead.
- Writing browser-only JavaScript — use the frontend skills such as
  `javascript` or `react`.
- CPU-bound work such as video encoding or heavy numerical computation —
  prefer a worker thread, a native addon, or a service written in a
  language suited to that workload.
- Choosing an HTTP framework — see `hono`, `rest-api`, or `api-design`
  once the runtime choice is settled.

## Prerequisites

- Node.js 24 LTS installed (the current LTS line as of 2026-11-20).
- npm, the package manager bundled with Node.js.
- Familiarity with JavaScript or TypeScript and asynchronous programming.
- A version manager such as nvm or fnm is recommended so the whole team
  runs the same Node.js version.

## Official Documentation

- [Node.js documentation](https://nodejs.org/docs/) — guides and API
  reference for the current release.
- [Node.js API reference](https://nodejs.org/api/) — authoritative
  documentation for built-in modules such as `fs`, `http`, and `events`.
- [npm documentation](https://docs.npmjs.com/) — package installation,
  scripts, and publishing.
- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  TypeScript 5.x, the recommended language for new Node.js services.

## Required Workflow

1. Confirm the runtime: run `node --version` and `npm --version`, and make
   sure the project pins Node.js 24 LTS (see Implementation Standards).
2. Scaffold with `npm init` and set `"type": "module"` for ESM unless a
   dependency forces CommonJS.
3. Add TypeScript 5.x with strict mode enabled, plus a lint and format
   setup, before writing application code.
4. Structure the project by concern: entry point, routes or handlers,
   business logic, data access, and shared utilities in separate modules.
5. Write the happy path first, then add error handling, input validation,
   logging, and graceful shutdown.
6. Add automated tests for the critical paths and run them with
   `npm test` before every commit.
7. Verify the production path: build (if any), start with
   `NODE_ENV=production`, and confirm the service answers a health check.
8. Document how to run, test, and deploy the service in the README.

## Implementation Standards

- Use ESM (`"type": "module"`) for new projects. Use `import` and
  `export`; avoid `require` except when a dependency requires it.
- Pin the runtime in `package.json` with an `engines` field requiring
  Node.js 24 or later, and commit a `.nvmrc` or `.node-version` file
  with the same version.
- Commit `package-lock.json`. Never install dependencies without a
  lockfile in a shared project.
- Use TypeScript with `"strict": true`. Avoid `any`; prefer `unknown`
  with a type guard when the shape is genuinely unknowable.
- Keep the entry point thin: it wires modules together and starts the
  server. Put logic in testable modules.
- Use top-level `await` in ESM entry points only for startup work such as
  connecting to a database; never for request handling.
- Handle every promise rejection. Install a top-level handler for
  `unhandledRejection` that logs the error and exits the process with a
  non-zero code — a process in an unknown state must not keep serving.
- Implement graceful shutdown: on `SIGTERM` and `SIGINT`, stop accepting
  new work, finish in-flight requests, close connections, then exit.
- Read configuration from environment variables. Never hard-code secrets,
  ports, or hostnames; validate required variables at startup and fail
  fast with a clear message when one is missing.
- Log structured JSON in production (one JSON object per line) with a
  timestamp, level, and message. Never log secrets or full request bodies
  that may contain them.

## Best Practices

- Prefer the built-in Node.js modules (`node:http`, `node:fs/promises`,
  `node:test`, `node:assert`) before adding a dependency; the standard
  library covers more than most developers expect.
- Use `node:` prefixed imports (`node:fs`, `node:path`) so built-ins are
  unambiguous.
- Keep functions small and pure where possible; isolate side effects
  (network, disk, database) at the edges so the core logic is testable.
- Use `AbortSignal` with `setTimeout` and `fetch` so background work can
  be cancelled during shutdown.
- Prefer `async`/`await` over raw promise chains and callbacks; never mix
  callbacks and promises in the same module without a clear boundary.
- Run `npm audit` regularly and update dependencies on a schedule rather
  than only when something breaks.
- Ship a `/health` endpoint that reports whether the process is ready to
  serve, separate from a liveness check that only confirms the process
  is alive.

## Security Considerations

- Never commit secrets to version control. Load them from environment
  variables or a secret manager, and use a `.env.example` file listing
  the required variable names without values.
- Keep dependencies current: run `npm audit` and address high-severity
  findings promptly; prefer well-maintained packages with recent releases.
- Validate and sanitize all untrusted input (request bodies, query
  strings, headers, file paths) before use; never pass raw input to
  `child_process.exec` or to a SQL query.
- Set secure HTTP headers and use HTTPS in production; do not run a
  production service over plain HTTP.
- Run the process as a non-root user inside containers and grant only the
  filesystem permissions the service needs.
- Avoid `eval` and the `Function` constructor on untrusted input.

## Performance Considerations

- Never block the event loop: avoid synchronous filesystem calls,
  `JSON.parse` on very large payloads, and long CPU loops on the main
  thread. Move CPU-heavy work to worker threads or a background job
  (see `background-jobs`).
- Use streaming APIs (`fs.createReadStream`, response streams) for large
  files instead of buffering the whole file in memory.
- Reuse connections: use connection pooling for databases and keep-alive
  agents for outbound HTTP calls.
- Set sensible limits: request body size, request timeout, and
  concurrency, so one slow client cannot exhaust the process.
- Profile before optimizing: use the built-in `--cpu-prof` flag or the
  inspector to find hot spots instead of guessing.

## Common Mistakes

- Mixing CommonJS and ESM without understanding the boundary — results in
  confusing import errors. Pick ESM for new projects and keep it
  consistent.
- Forgetting to `await` a promise — the operation runs in the background
  and its errors become unhandled rejections. Await every promise or
  attach an explicit `.catch()`.
- Swallowing errors with an empty `catch` block — hides failures and makes
  debugging nearly impossible. Log the error and decide: retry, return an
  error response, or fail fast.
- Using synchronous APIs (`fs.readFileSync`) in request handlers — blocks
  the event loop for every concurrent request. Use the async variants.
- Omitting graceful shutdown — in-flight requests are dropped and
  database connections leak when the process is restarted.
- Storing state in module-level variables that grow without bound —
  memory leaks that only appear under sustained load. Bound every cache
  and queue.

## Examples

Minimal ESM HTTP server with graceful shutdown:

```js
// server.js — run with: node server.js
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection", err);
  process.exit(1);
});
```

## Validation Checklist

- [ ] `node --version` reports Node.js 24 LTS or later.
- [ ] `package.json` has `"type": "module"` and an `engines` field.
- [ ] `package-lock.json` is committed and `npm ci` succeeds from a clean
      checkout.
- [ ] `npm test` passes and `npm run build` (if present) succeeds.
- [ ] The service answers its health endpoint and shuts down cleanly on
      `SIGTERM`.
- [ ] No secrets appear in the repository; `.env.example` documents the
      required variables.
- [ ] `npm audit` shows no unresolved high-severity findings.

## Expected Deliverables

- A working Node.js project with `package.json`, lockfile, and entry
  point that starts with a single command.
- Tests covering the critical paths, runnable with `npm test`.
- A README documenting setup, scripts, environment variables, and
  deployment.
- A short report of any version or dependency decisions that deviate
  from this skill, with reasons.

## References

- [Node.js documentation](https://nodejs.org/docs/) — guides and API
  reference.
- [npm documentation](https://docs.npmjs.com/) — package management.
- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  TypeScript 5.x reference.
- Related skills in this repository: `rest-api`, `hono`, `api-design`,
  `package-development`, `background-jobs`, `testing`.
