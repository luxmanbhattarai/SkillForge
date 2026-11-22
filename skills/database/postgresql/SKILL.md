---
name: postgresql
description: >
  Use PostgreSQL effectively: schema design, data types, indexes, queries,
  transactions, extensions, and administration. Use when building or
  maintaining an application backed by PostgreSQL, writing Postgres-specific
  SQL, choosing Postgres features such as JSONB, full-text search, or
  partitioning, or debugging Postgres behaviour. Trigger keywords: Postgres,
  PostgreSQL, psql, JSONB, plpgsql, Postgres query, Postgres schema.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# PostgreSQL

## Purpose

This skill covers practical PostgreSQL use for application developers: writing correct SQL, choosing the right types and indexes, using Postgres-specific features where they earn their place, and avoiding the configuration and query mistakes that cause the most production incidents.

## When to Use

- Building or maintaining an application that uses PostgreSQL as its primary database.
- Writing or reviewing Postgres-specific SQL, including JSONB queries, window functions, and common table expressions.
- Choosing Postgres features such as full-text search, array types, range types, or table partitioning.
- Debugging slow queries, locking, connection exhaustion, or unexpected query plans on Postgres.
- Setting up a local Postgres instance for development or tests.
- Writing migrations against a Postgres database.

## When Not to Use

- When the target engine is MySQL — use `mysql`; for SQLite, use `sqlite`; for MongoDB, use `mongodb`.
- When the task is engine-agnostic schema design — use `database-design`.
- When the task is only about ORM mapping — use `prisma` or `drizzle`.
- When the task is only about backups — use `backup-recovery`; for access control and encryption, use `database-security`.

## Prerequisites

- A PostgreSQL server reachable from the project, or a plan to run one locally (a package install, Docker, or a managed service).
- `psql` or an equivalent client for inspecting the database directly.
- The connection string stored as an environment variable such as `$DATABASE_URL`, never committed to the repository.
- Basic SQL knowledge: `SELECT`, `JOIN`, `GROUP BY`, and transactions.
- Supported versions: PostgreSQL 15, 16, 17, 18, and 19 (19.0 released 19 November 2026). PostgreSQL 14 reached end of life on 12 November 2026 and receives no more fixes; 13 and older are likewise unsupported. Do not rely on a feature without checking it exists in the version actually running.

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — the authoritative reference for SQL, types, functions, and administration.
- [PostgreSQL downloads](https://www.postgresql.org/download/) — supported versions and installers.

## Required Workflow

1. Confirm the server version with `SELECT version();` and check the docs for that version before relying on a feature.
2. Connect with `psql` (or the project's client) using the environment-provided connection string, and verify the target database and role.
3. Write DDL with explicit types, `NOT NULL` where absence is invalid, primary keys on every table, and foreign keys with an explicit `ON DELETE` action.
4. Write queries with parameterized placeholders (`$1`, `$2` in raw SQL; the driver's placeholder style in code), never string interpolation.
5. Check any query that touches a large table with `EXPLAIN (ANALYZE, BUFFERS)` on representative data before shipping it.
6. Wrap multi-statement writes that must succeed or fail together in a transaction (`BEGIN` / `COMMIT` / `ROLLBACK`).
7. Add indexes deliberately: one index per proven access pattern, named clearly, and verified with `EXPLAIN`.
8. For JSON data, use `JSONB` (not `JSON`) when the data is queried or indexed: add a GIN index for containment (`@>`) and key-existence (`?`) queries, or a B-tree expression index on `(data ->> 'key')` for equality on one key — a GIN index does not serve `->>` text equality.
9. Run schema changes as versioned migrations, never as ad-hoc `ALTER TABLE` commands against a shared database.
10. Before a deploy, re-check the slow-query log or `pg_stat_statements` output for regressions on the changed queries.

## Implementation Standards

- Use `TIMESTAMPTZ` for instants; plain `TIMESTAMP` only for wall-clock values that genuinely have no timezone (such as a local opening time).
- Use `NUMERIC` for money, `BIGINT GENERATED ALWAYS AS IDENTITY` for surrogate keys, and `UUID` where globally unique identifiers are needed.
- Prefer `TEXT` over `VARCHAR(n)` unless a real business limit exists; enforce real limits with a `CHECK` constraint.
- Prefer `JSONB` over `JSON`; prefer real columns over JSONB when a field is filtered, joined, or constrained.
- Use `SERIAL` only in legacy code; new tables use identity columns.
- Name constraints explicitly (`CONSTRAINT books_price_non_negative CHECK (price >= 0)`) so error messages and migrations are readable.
- Use schemas to separate concerns (for example `app` versus `auth`) only when the separation is real; a single `public` schema is fine for most applications.
- Use `RETURNING` to fetch inserted or updated rows in the same statement instead of a second query.
- Use `ON CONFLICT` (upsert) for idempotent inserts instead of a read-then-write race.
- Keep functions and triggers small and well-tested; business logic generally belongs in the application, with the database enforcing integrity.

## Best Practices

- Enable `pg_stat_statements` on any non-trivial database so slow queries are visible instead of guessed at.
- Use `EXPLAIN (ANALYZE, BUFFERS)` rather than plain `EXPLAIN` when a query is actually slow; the plan alone does not show real row counts or I/O.
- Prefer `EXISTS` over `IN (SELECT ...)` when testing for the presence of related rows.
- Use common table expressions for readability on complex queries, but check the plan: a CTE acts as an optimization fence on PostgreSQL 11 and older; PostgreSQL 12 and later inline CTEs unless they are marked `MATERIALIZED`.
- Use `VACUUM` and `ANALYZE` awareness: long-running transactions block vacuuming and bloat tables, so keep transactions short.
- Use advisory locks or `SELECT ... FOR UPDATE` for explicit concurrency control instead of hoping two writers will not collide.
- Test migrations against a copy of production-like data, not only against an empty database.

## Security Considerations

- Never interpolate user input into SQL; always use parameterized queries.
- Connect with a least-privilege role: the application role should not own the schema or have superuser rights.
- Store the connection string in an environment variable or a secret manager, and use TLS (`sslmode=require` or stricter) for any connection over a network.
- Use row-level security (RLS) when different tenants or users must be isolated inside shared tables, and test RLS policies with the actual application role.
- Keep the server patched and do not expose the Postgres port to the public internet.
- Audit who can run `COPY`, create extensions, or execute functions with `SECURITY DEFINER`.

## Performance Considerations

- Index the columns used in `WHERE`, `JOIN`, and `ORDER BY` for the hot queries; verify with `EXPLAIN (ANALYZE, BUFFERS)`.
- Avoid `SELECT *` on wide tables in hot paths; fetch only the columns the caller needs.
- Watch for sequential scans on large tables, and for nested loops over large outer relations.
- Keep transactions short: an open transaction holds locks and prevents vacuuming, which degrades the whole database over time.
- Use connection pooling (`connection-pooling`) — Postgres forks a backend process per connection, so hundreds of direct connections are expensive.
- Use `UNLOGGED` tables only for data that can be lost (caches, scratch data); they are not crash-safe.
- Partition very large tables by time or key range when queries naturally filter on the partition key.

## Common Mistakes

- Using `TIMESTAMP` without timezone for instants — times shift with the session timezone; use `TIMESTAMPTZ`.
- Forgetting `ANALYZE` after bulk loads — the planner works from stale statistics and picks bad plans.
- Running `SELECT *` in application code — couples the code to every column and wastes I/O.
- Holding a transaction open across a network call or user input — blocks vacuum and other writers.
- Adding an index for every column "just in case" — each index slows writes and costs maintenance; index proven patterns.
- Using `LIKE '%term%'` for search on large tables — it cannot use a B-tree index; use full-text search or a trigram index.
- Assuming `COUNT(*)` is cheap on a huge table — it scans; cache counts or use estimates where exactness is not required.

## Examples

```sql
-- Example: parameterized upsert that is safe under concurrency.
INSERT INTO users (id, email, name)
VALUES ($1, $2, $3)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
```

```sql
-- Example: JSONB equality on one key, served by a B-tree expression index.
-- A GIN index serves containment (@>) and key-existence (?) queries, not
-- ->> text equality, so it would not help this query.
CREATE INDEX idx_orders_metadata_customer
  ON orders ((metadata ->> 'customer_id'));

SELECT id, total
FROM orders
WHERE metadata ->> 'customer_id' = $1;
```

```sql
-- Example: the same data queried by containment, which a GIN index serves.
CREATE INDEX idx_orders_metadata_gin ON orders USING GIN (metadata);

SELECT id, total
FROM orders
WHERE metadata @> '{"customer_id": "cust_42"}';
```

```sql
-- Example: inspect a slow query plan with real execution data.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM books WHERE author_id = $1 ORDER BY created_at DESC LIMIT 20;
```

## Validation Checklist

- [ ] The server version is known and the features used exist in that version.
- [ ] All queries use parameters; no user input is interpolated into SQL.
- [ ] Every table has a primary key; foreign keys declare an `ON DELETE` action.
- [ ] Money uses `NUMERIC`; instants use `TIMESTAMPTZ`.
- [ ] Hot queries were checked with `EXPLAIN (ANALYZE, BUFFERS)` on representative data.
- [ ] Multi-statement writes that must be atomic run inside a transaction.
- [ ] The application connects with a least-privilege role over TLS.
- [ ] Schema changes are versioned migrations, not ad-hoc commands.

## Expected Deliverables

- SQL or migration files implementing the change, with parameters and explicit constraints.
- `EXPLAIN (ANALYZE, BUFFERS)` output for any new or changed hot query, with a one-line reading of the plan.
- Notes on any Postgres-specific feature used and why it was chosen over a portable alternative.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — SQL, types, functions, administration.
- [PostgreSQL downloads](https://www.postgresql.org/download/) — supported versions.
- Related skills in this repository: `database-design`, `sql-optimization`, `indexing`, `transactions`, `connection-pooling`, `migrations`, `prisma`, `drizzle`.
