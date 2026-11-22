---
name: cloudflare-d1
description: >
  Use this skill when designing, creating, and querying Cloudflare D1
  serverless SQLite databases: creating databases with Wrangler, writing
  migrations, binding D1 to Workers, running queries from Worker code,
  and choosing D1 over other Cloudflare storage. Trigger keywords: D1,
  Cloudflare D1, SQLite, serverless database, wrangler d1, migration,
  D1Database, D1 binding.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js, the Wrangler CLI, a Cloudflare account, and network access to Cloudflare.
---

# Cloudflare D1

## Purpose

This skill covers Cloudflare D1, the serverless SQLite database built for
Workers. It produces well-designed D1 schemas, safe migrations, and
correct query code that runs inside Workers through the D1 binding.

## When to Use

- Creating a new D1 database for a Workers application.
- Designing tables, indexes, and migrations for D1.
- Querying D1 from Worker code using the D1 binding.
- Running ad-hoc queries or applying migrations with `wrangler d1`.
- Deciding whether relational data belongs in D1 rather than KV or R2.

## When Not to Use

- Storing large files, images, or binary blobs — use `cloudflare-r2`.
- Small, frequently-read key-value data with loose consistency needs —
  use `cloudflare-kv`.
- Background job processing — use `cloudflare-queues`.
- Strongly consistent, single-instance stateful coordination — use
  `durable-objects`.
- Writing the Worker itself — use `cloudflare-workers`.
- A traditional hosted Postgres or MySQL database — that is outside the
  Cloudflare platform; use the project's database tooling instead.

## Prerequisites

- A Cloudflare account and Wrangler installed and authenticated.
  Wrangler 4.x is the current major version. In Wrangler 4, D1
  commands default to local mode: add `--remote` to run a command
  against the live database (without it, `wrangler d1 execute` reads
  the local database, not production).
- A Worker project with a `wrangler.toml` that will declare the D1 binding.
- Basic SQL knowledge: tables, indexes, transactions, and parameterized
  queries.
- Awareness that D1 is SQLite: it is relational and SQL-based, but it is
  not Postgres or MySQL, and some features differ.
- Version range: Wrangler 4.x.

## Official Documentation

- [Cloudflare D1 docs](https://developers.cloudflare.com/d1/) — concepts,
  limits, and API reference.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  how bindings reach Worker code.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference including `wrangler d1` commands.

## Required Workflow

1. Create the database with Wrangler and record the database ID it returns.
2. Add the `[[d1_databases]]` binding to `wrangler.toml` with the binding
   name, database name, and database ID.
3. Write the schema as versioned migration files in a migrations directory,
   one file per change, in chronological order.
4. Apply migrations locally first with `wrangler d1 migrations apply`,
   then apply them to the remote database.
5. Write query code that uses parameterized statements; never interpolate
   user input into SQL strings.
6. Test the queries locally with `wrangler dev` before deploying.
7. Deploy the Worker and verify the database-backed endpoints with `curl`.
8. Keep migrations in source control and never edit an applied migration
   in place; add a new migration instead.

## Implementation Standards

- Use parameterized queries (`?` markers with bound values) for every
  statement that includes variable data.
- Keep migrations small, additive, and reversible where practical; each
  migration file should do one thing.
- Define primary keys on every table and add indexes for columns used in
  `WHERE`, `JOIN`, and `ORDER BY` clauses.
- Use transactions (`batch`) for multi-statement writes that must succeed
  or fail together.
- Name the binding consistently across environments and document the
  database name and ID in the project.
- Store timestamps as ISO 8601 text or Unix integers, and be consistent
  across the schema.
- Avoid storing large blobs in D1; store the file in R2 and keep only a
  reference (key or URL) in D1.

## Best Practices

- Design the schema for the queries the application actually runs; D1
  rewards simple, well-indexed queries.
- Use `wrangler d1 execute --remote` for safe, read-only inspection of
  production data; avoid ad-hoc writes against production. (Without
  `--remote`, Wrangler 4 targets the local database.)
- Keep migration files numbered and ordered so every environment applies
  the same history.
- Test migrations against a copy of realistic data before applying them to
  production.
- Use `.first()` for single-row reads and `.all()` for lists; check for
  null results instead of assuming a row exists.
- Prefer one D1 database per application rather than one database per
  feature, unless isolation is a real requirement.

## Security Considerations

- Never build SQL by concatenating user input; parameterized queries are
  the only safe pattern.
- Do not expose the database ID or internal schema details in API
  responses or error messages.
- Restrict who can run `wrangler d1 execute` against production; it can
  read and modify live data.
- Apply the principle of least privilege to Cloudflare API tokens used in
  CI for D1 operations.
- Sanitize and validate data before writing it, even when it comes from a
  trusted internal source.

## Performance Considerations

- D1 reads are fast for indexed lookups; add indexes before the table
  grows, not after queries slow down.
- Batch independent writes with a single `batch` call instead of issuing
  many separate statements.
- Avoid `SELECT *` on wide tables; select only the columns the endpoint
  needs.
- Keep result sets bounded with `LIMIT` and paginate lists. D1
  enforces a maximum query result size (50 MB, enforced since 2026-11-04), so an
  unbounded query over a large table fails instead of returning
  partial data.
- Remember that D1 is a serverless SQLite database replicated for reads;
  design for read-heavy workloads and keep write transactions short.

## Common Mistakes

- Interpolating user input into SQL strings — this is SQL injection; use
  bound parameters.
- Editing an applied migration file — environments that already applied it
  will diverge; add a new migration instead.
- Forgetting to apply migrations to the remote database — the local
  database works but production fails.
- Storing files or large blobs in D1 — use R2 and store a reference.
- Assuming D1 behaves exactly like Postgres — it is SQLite; check the D1
  docs for supported SQL features and limits.
- Using the wrong database ID in `wrangler.toml` — the binding points at
  a different database than intended.

## Examples

Create a database and bind it in `wrangler.toml`:

```bash
wrangler d1 create my-database
```

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "00000000-0000-0000-0000-000000000000"
```

Migration file (`migrations/0001_create_posts.sql`):

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_posts_slug ON posts (slug);
```

Query from a Worker with a bound parameter:

```ts
export interface Env {
  DB: D1Database;
}

const post = await env.DB.prepare(
  "SELECT id, slug, title FROM posts WHERE slug = ?"
).bind(slug).first();
```

Apply migrations:

```bash
wrangler d1 migrations apply my-database --local
wrangler d1 migrations apply my-database --remote
```

## Validation Checklist

- [ ] The database exists and the binding in `wrangler.toml` uses the
      correct database name and ID.
- [ ] All migrations apply cleanly locally and remotely.
- [ ] Every query uses bound parameters; no SQL string interpolation.
- [ ] Tables have primary keys and indexes on queried columns.
- [ ] The Worker reads and writes correctly in local dev and after deploy.
- [ ] Migration files are committed and no applied migration was edited.

## Expected Deliverables

- The D1 database created and bound in `wrangler.toml`.
- Versioned migration files committed to the project.
- Worker code that queries D1 safely with bound parameters.
- Verification that migrations apply and the endpoints work after deploy.

## References

- [Cloudflare D1 docs](https://developers.cloudflare.com/d1/) — concepts,
  limits, and query reference.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference.
- Related skills in this repository: `cloudflare`, `cloudflare-workers`,
  `cloudflare-r2`, `cloudflare-kv`, `durable-objects`, `deployment`.
