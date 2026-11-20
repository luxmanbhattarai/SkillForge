---
name: sqlite
description: >
  Use SQLite effectively: single-file embedded databases, data types,
  indexes, queries, transactions, and pragmas such as WAL mode and foreign
  keys. Use when building an application with an embedded or local database,
  a CLI tool, a mobile or desktop app, tests, or a small web app backed by
  SQLite. Trigger keywords: SQLite, embedded database, WAL mode, sqlite3,
  local database, single-file database.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SQLite

## Purpose

This skill covers practical SQLite use: getting the most from a single-file embedded database, choosing the pragmas and types that make it safe and fast, and knowing where SQLite stops being the right tool. SQLite is a full SQL database in a library, not a toy — but it has different trade-offs from a client-server database.

## When to Use

- Building a CLI tool, desktop app, mobile app, or edge function that needs local structured storage.
- Using SQLite as the database for a small web application or a prototype.
- Using SQLite for tests, fixtures, or local development against a real SQL engine.
- Choosing pragmas (WAL mode, foreign keys, journal mode) or debugging locking and corruption issues.
- Migrating data into or out of a SQLite file.

## When Not to Use

- When many concurrent writers need to write at once — use `postgresql` or `mysql` (SQLite allows one writer at a time).
- When the database must be shared over a network by several application servers — use a client-server database.
- When the task is engine-agnostic schema design — use `database-design`.
- When the data is document-shaped with no stable relations — use `mongodb`.
- When the task is only about backups — use `backup-recovery`.

## Prerequisites

- A SQLite library or driver for the project's language, and the `sqlite3` command-line shell for inspection.
- A decision about where the database file lives (a writable directory, backed up with the application data).
- Basic SQL knowledge: `SELECT`, `JOIN`, `GROUP BY`, and transactions.
- Awareness of the deployment model: one process, one file, one writer at a time.
- Current release as of 2026-11-20: SQLite 3.51.3 (13 March 2026), which fixes a WAL-reset corruption bug — use 3.51.3 or later. Check the version actually in use with `SELECT sqlite_version();`, because the version bundled with a language runtime or operating system is often older than the latest release. `STRICT` tables need SQLite 3.37.0 or later.

## Official Documentation

- [SQLite documentation](https://www.sqlite.org/docs.html) — the authoritative reference for SQL, pragmas, and limits.
- [SQLite WAL mode](https://www.sqlite.org/wal.html) — how write-ahead logging changes locking and durability.

## Required Workflow

1. Create the database file in its final location and confirm the application can read and write it.
2. Enable foreign keys on every connection with `PRAGMA foreign_keys = ON;` — SQLite leaves them off by default.
3. Enable WAL mode with `PRAGMA journal_mode = WAL;` when the application has concurrent readers and a writer.
4. Set a busy timeout (`PRAGMA busy_timeout = 5000;`) so a briefly locked database waits instead of erroring immediately.
5. Write DDL with explicit types, `NOT NULL` where absence is invalid, primary keys on every table, and foreign keys with an explicit `ON DELETE` action.
6. Write queries with parameterized placeholders (`?` or named parameters), never string interpolation.
7. Wrap multi-statement writes that must succeed or fail together in a transaction (`BEGIN` / `COMMIT` / `ROLLBACK`).
8. Add indexes deliberately: one index per proven access pattern, named clearly, and verified with `EXPLAIN QUERY PLAN`.
9. Check any query that touches a large table with `EXPLAIN QUERY PLAN` on representative data before shipping it.
10. Back up the file with the SQLite backup API or by copying it while no writer is active — never copy a live database file mid-write and assume it is consistent.

## Implementation Standards

- Enable `PRAGMA foreign_keys = ON;` on every connection; a connection that forgets it silently ignores foreign keys.
- Use `INTEGER PRIMARY KEY` for row-id tables where an auto-incrementing integer key is wanted; use `TEXT` for UUID keys.
- Remember SQLite type affinity: a column's declared type is a preference, not a strict rule. Enforce real constraints with `CHECK`, and validate types in the application where strictness matters.
- Store dates as ISO-8601 text (`TEXT`), Unix epoch integers, or Julian day numbers — pick one convention per project and document it.
- Store booleans as `INTEGER` with a `CHECK (value IN (0, 1))` constraint.
- Use `STRICT` tables (SQLite 3.37.0 or later) when strict typing is wanted.
- Use `WITHOUT ROWID` tables only for tables with a composite primary key that is always used for lookups; the default rowid table is right for most tables.
- Name constraints explicitly so error messages and migrations are readable.
- Use `INSERT ... ON CONFLICT` (upsert) for idempotent inserts instead of a read-then-write race.
- Keep the schema in versioned migrations or a schema file, even though the database is "just a file".

## Best Practices

- Use WAL mode for any application with concurrent readers; it lets readers proceed while a writer writes.
- Keep transactions short and batch bulk inserts inside a single transaction — inserting one row per transaction is dramatically slower.
- Use prepared statements and reuse them for repeated queries.
- Use `PRAGMA integrity_check` periodically on databases that matter, and after any crash or power loss.
- Use `VACUUM` after large deletes to reclaim file space, but not on a schedule — it rewrites the whole file.
- Use `ANALYZE` after bulk loads so the query planner has statistics.
- Keep the database file and its `-wal` and `-shm` sidecar files together; deleting the sidecars while the database is in use corrupts data.

## Security Considerations

- Never interpolate user input into SQL; always use parameterized queries.
- The database file is only as secure as the filesystem: set file permissions so only the application user can read it, and encrypt the volume or use an encryption extension when the data is sensitive.
- Do not place the database file under a web server's document root where it could be downloaded directly.
- Validate input before writing: SQLite's flexible typing means a wrong type can be stored silently.
- Treat a SQLite file received from an untrusted source as untrusted input: open it read-only first and validate its contents.

## Performance Considerations

- Batch writes in transactions; SQLite's per-transaction fsync cost dominates small-write workloads.
- Use WAL mode plus a busy timeout to reduce lock contention between readers and the single writer.
- Index the columns used in `WHERE`, `JOIN`, and `ORDER BY` for the hot queries; verify with `EXPLAIN QUERY PLAN`.
- Avoid `SELECT *` on wide tables in hot paths; fetch only the columns the caller needs.
- Use covering indexes for hot read queries where the index can serve the whole query.
- Remember the single-writer limit: if write concurrency becomes the bottleneck, the answer is a client-server database, not more tuning.
- Keep the page cache sensibly sized for the deployment; the default cache is small for large databases.

## Common Mistakes

- Forgetting `PRAGMA foreign_keys = ON;` — foreign keys are declared but silently unenforced.
- Copying a live database file as a backup — the copy can be inconsistent; use the backup API or stop writers first.
- Assuming declared types are enforced — SQLite affinity is flexible; add `CHECK` constraints where strictness matters.
- One transaction per row on bulk import — orders of magnitude slower than one transaction for the batch.
- Deleting the `-wal` file to "clean up" — it holds committed data not yet checkpointed into the main file.
- Using SQLite for a multi-server web application — one file cannot be shared safely across servers; use a client-server database.
- Storing dates in mixed formats — pick one convention (ISO-8601 text is the most portable) and enforce it.

## Examples

```sql
-- Example: pragmas every connection should set.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

```sql
-- Example: table with explicit constraints and a documented date convention.
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES authors (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  -- created_at is ISO-8601 text in UTC.
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1))
);
```

```sql
-- Example: inspect how SQLite plans to run a query.
EXPLAIN QUERY PLAN
SELECT id, title FROM books WHERE author_id = ? ORDER BY created_at DESC LIMIT 20;
```

## Validation Checklist

- [ ] Foreign keys are enabled on every connection and verified with `PRAGMA foreign_keys;`.
- [ ] WAL mode and a busy timeout are set where concurrent access is expected.
- [ ] All queries use parameters; no user input is interpolated into SQL.
- [ ] Every table has a primary key; foreign keys declare an `ON DELETE` action.
- [ ] Dates use one documented convention across the whole schema.
- [ ] Hot queries were checked with `EXPLAIN QUERY PLAN` on representative data.
- [ ] Multi-statement writes that must be atomic run inside a transaction.
- [ ] The backup method is safe for a live database, and the file is not web-accessible.

## Expected Deliverables

- SQL or migration files implementing the change, with parameters and explicit constraints.
- The list of pragmas the application sets on every connection, with reasons.
- `EXPLAIN QUERY PLAN` output for any new or changed hot query.
- Notes on the backup method and the file location.

## References

- [SQLite documentation](https://www.sqlite.org/docs.html) — SQL, pragmas, and limits.
- [SQLite WAL mode](https://www.sqlite.org/wal.html) — locking and durability under WAL.
- Related skills in this repository: `database-design`, `sql-optimization`, `indexing`, `transactions`, `migrations`, `drizzle`, `prisma`.
