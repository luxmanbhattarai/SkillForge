---
name: trpc
description: >
  Build end-to-end type-safe APIs with tRPC: routers, procedures, input
  validation, context, middleware, and React Query integration. Use when
  building a TypeScript API consumed by a TypeScript client, adding tRPC
  procedures to a monorepo, or replacing REST endpoints with type-safe RPC.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS or later, TypeScript 7.x, and a TypeScript client; works best in a monorepo.
---

# tRPC

## Purpose

This skill covers building APIs with tRPC: defining routers and
procedures, validating input, composing middleware, and consuming the
API from a TypeScript client with full end-to-end type safety. The
outcome is an API where the client and server share types, so a change
to a procedure is a compile error on the client instead of a runtime
surprise.

## When to Use

- Building a TypeScript API consumed by a TypeScript client (web app,
  mobile app, or another service).
- Adding procedures to an existing tRPC router.
- Replacing hand-written REST endpoints with type-safe RPC in a
  monorepo.
- Wiring authentication, authorization, or logging into API procedures
  with middleware.
- Integrating tRPC with React Query for data fetching in a React app.

## When Not to Use

- Building a public API for third-party clients in other languages —
  use `rest-api` or `graphql`, which any HTTP client can call.
- Building an API consumed by non-TypeScript clients — tRPC's main
  benefit is TypeScript type sharing.
- Needing a documented, discoverable contract for external integrators
  — use `rest-api` with OpenAPI instead.
- Designing the API contract from scratch — use `api-design` first.

## Prerequisites

- A TypeScript 7.x project (a monorepo is ideal so the client can
  import the server's router type).
- Node.js 24 LTS or later (26 is the current LTS line) and a server
  framework that can host tRPC (for example a standalone HTTP server,
  Next.js, or Hono).
- Familiarity with Zod 4.x or another schema validator for input
  validation.
- tRPC 11.x (11.29.x as of November 2026). The React integration
  package for v11 is `@trpc/tanstack-react-query`
  (`createTRPCContext`, `useTRPC`); the v10-style
  `@trpc/react-query` (`createTRPCReact`) still works in v11 but is
  no longer the integration being developed.

## Official Documentation

- [tRPC documentation](https://trpc.io/docs) — the official guides,
  reference, and examples.
- [tRPC website](https://trpc.io/) — overview and quick start.
- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  TypeScript 7.x reference. TypeScript 7.0 (July 2026) is the current
  release; 6.0 was the last JavaScript-based release and 5.x is
  superseded.

## Required Workflow

1. Define the router structure: one router per domain area
   (`userRouter`, `orderRouter`), merged into a root `appRouter`.
2. Create the tRPC context: the request-scoped object carrying the
   authenticated user, database client, and request metadata.
3. Define procedures with `.input()` schemas validated by Zod and
   `.query()` for reads or `.mutation()` for writes.
4. Add middleware for cross-cutting concerns: authentication,
   authorization, logging, and rate limiting.
5. Export the router type (`AppRouter`) and share it with the client
   through the monorepo package or a generated type export.
6. Set up the client with the matching link (HTTP batch link for most
   apps) and, for React, the React Query integration.
7. Write tests for procedures through the router caller (server-side
   tests) and through HTTP for the transport layer.
8. Verify error handling: expected errors use `TRPCError` with a
   stable code; unexpected errors are logged server-side and surfaced
   as a generic internal error.

## Implementation Standards

- Validate every input with a Zod schema in `.input()`. Never trust
  client input that has not passed a schema.
- Use `.query()` for reads and `.mutation()` for writes. Queries must
  be side-effect free so they can be cached and retried safely.
- Keep procedures thin: validate input, call a service function, return
  the result. Business logic lives in service modules.
- Create reusable middleware: `publicProcedure` for unauthenticated
  endpoints and `protectedProcedure` for endpoints requiring a signed-in
  user. Default to protected; make a procedure public only by an
  explicit decision.
- Use `TRPCError` with the documented error codes (`UNAUTHORIZED`,
  `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`)
  for expected failures. Do not throw raw `Error` objects for client
  errors.
- Keep the router type as the single source of truth: the client
  imports `AppRouter` and never redeclares procedure signatures.
- Paginate list procedures with cursor-based input (`{ cursor, limit }`)
  and a `{ items, nextCursor }` return shape.
- Return plain serializable data from procedures: no `Date` objects
  unless a transformer is configured, no class instances, no functions.
- Version the API by evolving procedures: add new procedures rather
  than changing existing input or output shapes in a breaking way.

## Best Practices

- Split routers by domain and merge them; a single file with every
  procedure becomes unmaintainable quickly.
- Create a context that is cheap to build: avoid database queries in
  context creation unless every procedure needs the result.
- Use the HTTP batch link so multiple client queries in one tick share
  a single HTTP request.
- Prefer `superjson` as a transformer only when you genuinely need
  `Date`, `Map`, or `Set` serialization; plain JSON keeps the wire
  format simple and debuggable.
- Invalidate React Query caches by procedure key after mutations so the
  UI reflects the new state without a manual refetch.
- Keep input schemas small and explicit: a procedure should accept only
  the fields it needs.
- Log procedure name, duration, and error code for observability; do
  not log input payloads that may contain sensitive data.

## Security Considerations

- Authorize inside procedures, not just at the HTTP layer: check that
  the caller owns the resource they are reading or mutating.
- Validate all input with Zod schemas; never pass unvalidated input to
  a database query or a shell command.
- Rate-limit procedures that are expensive or public (see
  `rate-limiting`).
- Do not expose internal error details: configure the error formatter
  to hide stack traces and database errors in production.
- Keep the context minimal: do not put secrets or full session objects
  into the context where a careless log could expose them.
- Treat the client as untrusted even though it is type-safe: types
  prove the shape at compile time, not at runtime.

## Performance Considerations

- Use the batch link to reduce HTTP round trips from the client.
- Paginate every list procedure; never return an unbounded list.
- Avoid the N+1 problem: batch related data loads in the service layer
  (see `graphql` for the DataLoader pattern, which applies here too).
- Keep context creation fast; a slow context taxes every procedure.
- Cache query results on the client with React Query's stale time
  instead of refetching on every render.
- Set a request timeout on the client so a hung procedure fails fast.

## Common Mistakes

- Putting business logic in procedures — it becomes untestable and
  duplicated. Move it to service modules.
- Skipping `.input()` validation because "the client is type-safe" —
  types do not validate runtime data. Always validate.
- Returning non-serializable values (`Date`, class instances) without a
  transformer — the client receives garbage or an error. Return plain
  data or configure a transformer.
- Making every procedure public — authentication and authorization are
  easy to forget procedure by procedure. Default to protected.
- Throwing raw errors — the client sees an unhelpful internal error.
  Use `TRPCError` with a stable code.
- Importing server code into the client bundle — only the router
  *type* should cross the boundary, never server modules. Use
  `import type` for the router.

## Examples

A small router with validation, a protected procedure, and pagination:

```ts
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

type Context = { userId: string | null };

const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const orderRouter = t.router({
  list: protectedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) }))
    .query(({ input }) => {
      return { items: [] as { id: string }[], nextCursor: null as string | null };
    }),
  create: protectedProcedure
    .input(z.object({ totalMinor: z.number().int().positive(), currency: z.string().length(3) }))
    .mutation(({ input, ctx }) => {
      return { id: "ord_01", ...input, userId: ctx.userId, status: "created" };
    }),
});

export const appRouter = t.router({ order: orderRouter });
export type AppRouter = typeof appRouter;
```

## Validation Checklist

- [ ] Every procedure validates input with a Zod schema.
- [ ] Procedures default to protected; public procedures are an
      explicit, documented choice.
- [ ] List procedures paginate with cursor and limit.
- [ ] Expected errors use `TRPCError` with a stable code.
- [ ] The client imports only the router type, never server modules.
- [ ] Tests cover success, validation failure, and unauthorized cases.
- [ ] Production error responses hide stack traces and internal details.

## Expected Deliverables

- Routers organized by domain with validated, thin procedures.
- A shared `AppRouter` type consumable by the client.
- A configured client (HTTP batch link, React Query where applicable).
- Tests for procedures and a short note on any public procedures and
  why they are public.

## References

- [tRPC documentation](https://trpc.io/docs)
- [tRPC website](https://trpc.io/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- Related skills in this repository: `api-design`, `rest-api`,
  `graphql`, `hono`, `nodejs`.
