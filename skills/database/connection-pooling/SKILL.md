---
name: connection-pooling
description: >
  Manage database connection pools: pool sizing, timeouts, lifecycle, and
  diagnosing connection exhaustion. Use when an application opens too many
  database connections, when requests fail with connection errors, when
  choosing pool settings, or when deploying with serverless or many
  replicas. Trigger keywords: connection pool, pool size, connection
  exhaustion, too many connections, PgBouncer, pool timeout, database
  connections.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Connection Pooling

## Purpose

This skill covers database connection pooling: keeping a bounded, healthy set of reusable connections between the application and the database, sizing the pool for the workload, and diagnosing the "too many connections" failures that appear when the pool is misconfigured or the application leaks connections.

## When to Use

- An application fails with connection errors ("too many connections", timeouts waiting for a connection).
- Choosing pool size, timeout, and idle settings for a new or growing application.
- Deploying with many replicas, serverless functions, or background workers that each open connections.
- Diagnosing slow requests caused by waiting for a pooled connection.
- Deciding whether an external pooler (such as PgBouncer for PostgreSQL) is needed.
- Reviewing connection lifecycle in application code (acquire, use, release).

## When Not to Use

- When the problem is a slow query rather than connection availability — use `sql-optimization`.
- When the problem is lock contention inside transactions — use `transactions`.
- When the database is SQLite (a single file, no network connections) — use `sqlite`.
- When the task is only about schema design — use `database-design`.

## Prerequisites

- Knowledge of the database engine's connection limit and how it counts connections.
- Knowledge of the deployment shape: number of application processes, replicas, workers, and serverless concurrency.
- Access to the database's connection statistics (active, idle, waiting) and the application's pool metrics if available.
- The driver or ORM's pool configuration for the project.

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — connections, `max_connections`, and server configuration.
- [MySQL reference manual](https://dev.mysql.com/doc/) — connection limits and thread handling.
- [PgBouncer documentation](https://pgbouncer.github.io/usage.html) — the standard external pooler for PostgreSQL.

## Required Workflow

1. Count the total connections the deployment can open: pool size per process multiplied by the number of processes, replicas, and workers. Compare it with the database's connection limit.
2. Set the pool size per process from that total, leaving headroom for administrative connections and for the database's own use.
3. Set timeouts: a maximum wait for a connection from the pool, an idle timeout, and a maximum connection lifetime, so a stuck or leaked connection does not hold a slot forever.
4. Ensure every code path releases its connection: acquire, use, release in a `try`/`finally` pattern (or use the driver's managed form that releases automatically).
5. Create one pool (or one ORM client) per process and share it; never create a pool per request.
6. Measure the pool under load: active connections, idle connections, and wait time for a connection. Tune from those numbers, not from guesses.
7. If the total connection count cannot fit within the database limit (many replicas or serverless functions), put an external pooler such as PgBouncer between the application and the database.
8. For serverless deployments, keep the pool small per function instance and prefer a pooler or a driver that supports the platform's connection model.
9. Monitor connection count continuously and alert before the limit is reached, not after requests start failing.
10. After any change to pool settings, re-measure under load and confirm both the error rate and the wait time improved.

## Implementation Standards

- One pool per process, shared by all code in that process; creating a pool per request is a defect.
- Every acquired connection is released on every code path, including errors — use `try`/`finally` or the driver's managed checkout.
- Pool size is derived from the deployment shape and the database limit, and the derivation is written down (pool size times process count must stay under the limit with headroom).
- Timeouts are set explicitly: connection wait timeout, idle timeout, and maximum lifetime. No pool runs with unbounded waits.
- The pool is sized for the steady-state concurrent demand, not for the peak burst; bursts queue briefly rather than opening unbounded connections.
- Health checks use a cheap query (such as `SELECT 1`) and do not hold a connection longer than needed.
- The application never opens a direct connection outside the pool except for a documented administrative reason.
- In serverless environments, the pool is created outside the request handler so it can be reused across invocations on a warm instance.

## Best Practices

- Start small: a pool that is too large is worse than one that is slightly too small, because each connection costs the database memory and scheduling time.
- Prefer fewer, busier connections over many idle ones; idle connections still consume database resources.
- Queue briefly rather than failing immediately when the pool is exhausted, but bound the queue with a timeout so a slow database does not hang requests forever.
- Use an external pooler (PgBouncer) when the number of application processes is large or varies (autoscaling, serverless); it multiplexes many client connections onto few server connections.
- Separate pools for different workloads where the driver supports it: a small pool for background jobs keeps a runaway job from starving interactive requests.
- Log pool wait time and exhaustion events; a pool that is always full is a signal to fix the queries or the workload, not just to raise the size.
- Test the pool under realistic concurrency, including a burst, before relying on it in production.

## Security Considerations

- The pool connects with the application's least-privilege credentials; a pooler must not widen access.
- Connection strings for the pool live in environment variables or a secret manager, never in code or configuration files committed to the repository.
- A pooler is a network hop: secure it with TLS and network controls like any other database component.
- Do not share a pool across tenants with different credentials; each tenant's connections must use that tenant's credentials.
- Log pool errors without including credentials or connection strings.

## Performance Considerations

- Each connection costs the database a backend process or thread plus memory; on PostgreSQL a connection is a full backend process, so hundreds of direct connections are expensive.
- Opening a new connection per request is expensive (handshake, authentication, session setup); the pool exists to avoid exactly that.
- A pool that is too small makes requests queue; a pool that is too large makes the database spend its time scheduling connections instead of running queries. The right size is found by measuring.
- Long transactions hold pooled connections for their whole duration; shortening transactions frees the pool faster.
- Idle connections still consume resources; an idle timeout returns them to the database.
- Connection churn (open, use once, close) defeats the pool; reuse is the point.

## Common Mistakes

- Creating a pool or client per request — exhausts connections and defeats pooling; share one per process.
- Forgetting to release a connection on an error path — the pool drains one connection at a time until requests fail; use `try`/`finally`.
- Sizing the pool per process without multiplying by the number of processes — ten replicas with a pool of 20 is 200 connections.
- Raising the pool size to fix slow queries — more connections running slow queries makes the database slower, not faster; fix the queries.
- No timeout on waiting for a connection — requests hang indefinitely when the pool is exhausted.
- Using a large pool in serverless — each function instance opens its own pool, and the total explodes; use a small pool plus a pooler.
- Ignoring pool metrics — the pool is full long before requests fail; monitor wait time and queue depth.

## Examples

```ts
// Example: one shared pool per process, with explicit timeouts.
// (Driver options vary; these are the settings to set, by whatever names
// the project's driver uses.)
const pool = createPool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                    // per-process pool size
  idleTimeoutMillis: 30000,   // release idle connections
  connectionTimeoutMillis: 5000, // fail fast instead of hanging
});
```

```ts
// Example: always release the connection, including on errors.
const client = await pool.connect();
try {
  await client.query("SELECT id FROM books WHERE author_id = $1", [authorId]);
} finally {
  client.release();
}
```

```sql
-- Example: count connections by state on PostgreSQL.
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

## Validation Checklist

- [ ] One pool (or ORM client) exists per process and is shared by all code.
- [ ] Total possible connections (pool size times process count) is under the database limit with headroom.
- [ ] Timeouts are set for connection wait, idle, and maximum lifetime.
- [ ] Every acquisition releases the connection on all paths, including errors.
- [ ] Pool metrics (active, idle, wait time) are visible and were checked under load.
- [ ] Serverless or multi-replica deployments use a small per-instance pool, a pooler, or both.
- [ ] No code path opens a direct connection outside the pool without a documented reason.

## Expected Deliverables

- The pool configuration with the sizing derivation (pool size times process count versus the database limit).
- Evidence from load or production metrics showing active, idle, and wait-time behaviour.
- Notes on whether an external pooler is needed and why.
- Any code change that fixes a connection leak, with the affected code path named.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — connections and server configuration.
- [MySQL reference manual](https://dev.mysql.com/doc/) — connection limits and threads.
- [PgBouncer documentation](https://pgbouncer.github.io/usage.html) — external pooling for PostgreSQL.
- Related skills in this repository: `postgresql`, `mysql`, `transactions`, `sql-optimization`, `prisma`, `drizzle`.
