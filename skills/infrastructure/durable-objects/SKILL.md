---
name: durable-objects
description: >
  Use this skill when building stateful, strongly consistent features on
  Cloudflare Durable Objects: designing Durable Object classes, binding
  them to Workers, using storage and alarms, choosing Durable Objects over
  KV or D1 for coordination, counters, and real-time collaboration.
  Trigger keywords: Durable Objects, DurableObject, stateful, strongly
  consistent, WebSocket, coordination, counter, rate limiting, alarm,
  Durable Object storage.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js, the Wrangler CLI, a Cloudflare account, and network access to Cloudflare.
---

# Durable Objects

## Purpose

This skill covers Cloudflare Durable Objects, the stateful building block
that gives a Worker a single, strongly consistent instance per unique ID.
It produces Durable Object classes for coordination, counters, rate
limiting, and real-time collaboration that KV and D1 cannot do correctly.

## When to Use

- Building a feature that needs a single source of truth per entity, such
  as a chat room, a game session, or a collaborative document.
- Implementing counters, rate limiters, or distributed locks that must
  not lose updates.
- Holding WebSocket connections that need to share state across clients.
- Scheduling work with alarms that fire reliably per object.
- Choosing the right storage when strong consistency matters more than
  global read speed.

## When Not to Use

- Simple key-value reads that tolerate eventual consistency — use
  `cloudflare-kv`.
- Relational queries, joins, and reporting — use `cloudflare-d1`.
- File storage — use `cloudflare-r2`.
- Background job processing — use `cloudflare-queues`.
- Stateless request handling with no shared state — a plain Worker is
  enough; see `cloudflare-workers`.
- Storing large amounts of data per entity — Durable Object storage is
  for coordination state, not a database.

## Prerequisites

- A Cloudflare account and Wrangler installed and authenticated.
- A Worker project with a `wrangler.toml` that will declare the Durable
  Object binding and class.
- An understanding of the Durable Object model: one object instance per
  unique ID, single-threaded execution per object, and persistent storage
  attached to the object.
- New classes should use the SQLite storage backend, declared with
  `new_sqlite_classes` in the migration; the older KV backend
  (`new_classes`) is legacy and cannot use the SQL API
  (`ctx.storage.sql`). The backend is fixed when the class is created.
  Wrangler 4.x is the current major version.
- Familiarity with the Workers runtime and the `cloudflare-workers` skill.
- Version range: Wrangler 4.x.

## Official Documentation

- [Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/) —
  concepts, API reference, and examples.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  runtime and binding reference.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference.

## Required Workflow

1. Decide the object granularity before writing code: one Durable Object
   per room, per user, per counter, or per document — the ID is the unit
   of consistency.
2. Write the Durable Object class extending the `DurableObject` base
   class from `cloudflare:workers`; its constructor takes `ctx` and
   `env` and must call `super(ctx, env)`. Add a `fetch` method that
   handles requests.
3. Add the `[[durable_objects.bindings]]` entry and the
   `[[migrations]]` entry (with a `new_sqlite_classes` list and a
   unique tag) to `wrangler.toml`.
4. In the Worker, derive the object ID with `env.BINDING.idFromName` or
   `idFromString`, get the stub, and forward the request.
5. Store persistent state with `this.ctx.storage` and keep in-memory
   state only as a cache that can be rebuilt from storage.
6. Test locally with `wrangler dev`, including the case where the object
   is created for the first time.
7. Deploy with `wrangler deploy` and verify the flow against the live
   Worker.
8. Never reuse a migration tag; every class change needs a new migration
   entry.

## Implementation Standards

- One Durable Object class per concern; do not build a single object
  that handles unrelated features.
- Keep the constructor light: do not do I/O in the constructor; load
  state lazily in `fetch` or in a dedicated method.
- Use `this.ctx.storage` for all durable state; in-memory fields are a
  cache and are lost when the object is evicted.
- Use `this.ctx.blockConcurrencyWhile` when initialization must complete
  before any request is handled.
- Derive IDs deterministically from the entity (for example
  `idFromName(roomId)`) so the same entity always maps to the same object.
- Keep request handlers short; a Durable Object processes requests one
  at a time per object, so a slow handler blocks other requests to that
  object.
- Version stored state: include a version field so a future class change
  can migrate old data.

## Best Practices

- Design the ID space first: the ID determines which requests share an
  object and therefore which requests are serialized.
- Use alarms for delayed or periodic work tied to an object, such as
  session cleanup, instead of polling from outside.
- Use WebSocket hibernation for long-lived connections so the object
  does not stay awake for idle sockets.
- Keep the object's storage small and focused; move large or queryable
  data to D1 or R2 and keep only coordination state in the object.
- Log the object ID with every log line so a problem can be traced to a
  specific object.
- Test the eviction path: an object can be evicted and recreated at any
  time, so all state must survive a fresh constructor.

## Security Considerations

- Validate the object ID input: a user-supplied name maps to an object,
  so restrict the character set and length.
- Authorize requests in the Worker before forwarding them to the object;
  do not rely on the object ID being secret.
- Do not store secrets in Durable Object storage; use `wrangler secret
  put` and read secrets from `env`.
- Rate-limit object creation so a user cannot create unlimited objects
  and exhaust resources.
- Sanitize data stored in the object before returning it to other
  clients.

## Performance Considerations

- A Durable Object handles one request at a time, so a slow handler
  serializes all traffic for that object; keep handlers fast.
- Choose a fine-grained ID (per room, per user) rather than one global
  object, so unrelated traffic does not serialize behind each other.
- Use `this.ctx.storage` transactions for multi-key updates that must be
  atomic.
- Avoid storing large values in object storage; large values slow down
  reads and increase costs.
- Prefer in-memory state with storage as the durable backing store, and
  rebuild the cache from storage when the object starts.

## Common Mistakes

- Using one global Durable Object for everything — all requests
  serialize through a single object; split by entity instead.
- Keeping state only in memory — the object can be evicted at any time
  and the state is lost; persist to `this.ctx.storage`.
- Reusing a migration tag — Wrangler rejects the deploy; every migration
  needs a unique tag.
- Doing heavy I/O in the constructor — the constructor runs on object
  creation and delays the first request.
- Assuming the object stays alive between requests — it does not; design
  for eviction and recreation.
- Using Durable Objects as a general database — they are for
  coordination state; use D1 for queryable data.

## Examples

Binding and migration in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ChatRoom"]
```

Durable Object class and Worker forwarding:

```ts
import { DurableObject } from "cloudflare:workers";

export class ChatRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const count = (await this.ctx.storage.get<number>("count")) ?? 0;
    await this.ctx.storage.put("count", count + 1);
    return Response.json({ count: count + 1 });
  }
}

export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("room") ?? "lobby";
    const id = env.CHAT_ROOM.idFromName(roomId);
    const stub = env.CHAT_ROOM.get(id);
    return stub.fetch(request);
  },
};
```

## Validation Checklist

- [ ] The class is declared in `wrangler.toml` with a binding and a
      migration with a unique tag.
- [ ] The object ID is derived deterministically from the entity.
- [ ] All durable state lives in `ctx.storage`, not only in memory.
- [ ] The Worker authorizes requests before forwarding them to the object.
- [ ] The flow works locally with `wrangler dev` and after deploy.
- [ ] No secret is stored in Durable Object storage.

## Expected Deliverables

- The Durable Object class and the forwarding Worker code committed to
  the project.
- `wrangler.toml` updated with the binding and migration.
- Documentation of the ID scheme and what state the object owns.
- Verification that the flow works after deployment.

## References

- [Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/) —
  concepts and API reference.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  runtime reference.
- Related skills in this repository: `cloudflare`, `cloudflare-workers`,
  `cloudflare-kv`, `cloudflare-d1`, `cloudflare-queues`, `observability`.
