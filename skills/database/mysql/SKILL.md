---
name: mysql
description: >
  Use MySQL effectively: InnoDB tables, data types, indexes, queries,
  transactions, and administration. Use when building or maintaining an
  application backed by MySQL or MariaDB-compatible MySQL, writing
  MySQL-specific SQL, choosing storage engines or character sets, or
  debugging MySQL behaviour and slow queries. Trigger keywords: MySQL,
  MariaDB, InnoDB, MySQL query, MySQL schema, mysql CLI.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# MySQL

## Purpose

This skill covers practical MySQL use for application developers: writing correct SQL for the InnoDB engine, choosing types and indexes that suit MySQL's behaviour, using MySQL-specific features where they earn their place, and avoiding the defaults and silent behaviours that cause the most production surprises.

## When to Use

- Building or maintaining an application that uses MySQL as its primary database.
- Writing or reviewing MySQL-specific SQL, including `INSERT ... ON DUPLICATE KEY UPDATE` and JSON functions.
- Choosing storage engines, character sets, collations, or auto-increment behaviour.
- Debugging slow queries, locking, deadlocks, or unexpected results on MySQL.
- Setting up a local MySQL instance for development or tests.
- Writing migrations against a MySQL database.

## When Not to Use

- When the target engine is PostgreSQL — use `postgresql`; for SQLite, use `sqlite`; for MongoDB, use `mongodb`.
- When the task is engine-agnostic schema design — use `database-design`.
- When the task is only about ORM mapping — use `prisma` or `drizzle`.
- When the task is only about backups — use `backup-recovery`; for access control and encryption, use `database-security`.

## Prerequisites

- A MySQL server reachable from the project, or a plan to run one locally (a package install, Docker, or a managed service).
- The `mysql` command-line client or an equivalent client for inspecting the database directly.
- The connection string stored as an environment variable such as `$DATABASE_URL`, never committed to the repository.
- Basic SQL knowledge: `SELECT`, `JOIN`, `GROUP BY`, and transactions.

## Official Documentation

- [MySQL reference manual](https://dev.mysql.com/doc/) — the authoritative reference for SQL, types, functions, and administration.
- [MySQL downloads](https://dev.mysql.com/downloads/) — supported versions and installers.

## Required Workflow

1. Confirm the server version with `SELECT VERSION();` and check the docs for that version before relying on a feature.
2. Connect with the `mysql` client using the environment-provided credentials, and verify the target database and current user.
3. Create tables with `ENGINE=InnoDB`, `utf8mb4` character set, and an explicit collation such as `utf8mb4_0900_ai_ci` (or the version-appropriate default).
4. Write DDL with explicit types, `NOT NULL` where absence is invalid, primary keys on every table, and foreign keys with an explicit `ON DELETE` action.
5. Write queries with parameterized placeholders (the driver's style, usually `?`), never string interpolation.
6. Check any query that touches a large table with `EXPLAIN` (and `EXPLAIN ANALYZE` where the server supports it) on representative data before shipping it.
7. Wrap multi-statement writes that must succeed or fail together in a transaction (`START TRANSACTION` / `COMMIT` / `ROLLBACK`).
8. Add indexes deliberately: one index per proven access pattern, named clearly, and verified with `EXPLAIN`.
9. Enable strict SQL mode expectations in the application: never rely on MySQL silently truncating or coercing bad values.
10. Run schema changes as versioned migrations, never as ad-hoc `ALTER TABLE` commands against a shared database.

## Implementation Standards

- Always use InnoDB; it is the only MySQL engine with transactions, foreign keys, and row-level locking suitable for application data.
- Always use `utf8mb4`, never the legacy `utf8` (three-byte) character set, so emoji and full Unicode are stored correctly.
- Use `DECIMAL` for money, `BIGINT AUTO_INCREMENT` (or `BIGINT UNSIGNED`) for surrogate keys, and `DATETIME` or `TIMESTAMP` deliberately: `TIMESTAMP` stores UTC and converts per session timezone, `DATETIME` stores the value as given.
- Use `JSON` for semi-structured data only when the fields are not filtered or joined often; prefer real columns for hot fields.
- Prefer `VARCHAR` with a realistic length over `TEXT` for short strings; `TEXT` columns cannot have a default value in older versions and behave differently in indexes.
- Name constraints explicitly so error messages and migrations are readable.
- Use `INSERT ... ON DUPLICATE KEY UPDATE` for idempotent inserts instead of a read-then-write race.
- Keep the default storage and character-set settings in the migration or schema definition, not only in server configuration, so a fresh database is created correctly.
- Use `ENUM` sparingly: adding a value requires a schema change, and ordering surprises are common; a reference table or a `CHECK` constraint is often clearer.
- Set `sql_mode` to include strict mode (`STRICT_TRANS_TABLES`) so invalid values error instead of being silently coerced.

## Best Practices

- Use `EXPLAIN` on every query that filters or joins a large table, and read the `type`, `key`, and `rows` columns: `ALL` on a large table means a full scan.
- Prefer covering indexes (index includes every column the query needs) for hot read queries.
- Keep transactions short; InnoDB row locks are held until commit, and long transactions increase deadlock risk.
- Use `SELECT ... FOR UPDATE` deliberately when a read must reserve a row for an update.
- Batch bulk inserts (`INSERT` with many value rows, in chunks) instead of one statement per row.
- Monitor the slow query log and the InnoDB status output when investigating lock waits or deadlocks.
- Test migrations against a copy of production-like data, not only against an empty database.

## Security Considerations

- Never interpolate user input into SQL; always use parameterized queries.
- Connect with a least-privilege account: the application account should not have `GRANT`, `DROP`, or administrative privileges.
- Store credentials in an environment variable or a secret manager, and use TLS for any connection over a network.
- Do not expose the MySQL port to the public internet; bind to localhost or a private network.
- Review accounts regularly: remove anonymous and test accounts, and give each application its own credentials.
- Keep the server patched; MySQL security fixes ship in minor releases.

## Performance Considerations

- Index the columns used in `WHERE`, `JOIN`, and `ORDER BY` for the hot queries; verify with `EXPLAIN`.
- Avoid `SELECT *` on wide tables in hot paths; fetch only the columns the caller needs.
- Remember that InnoDB's primary key is clustered: the primary key is stored in every secondary index, so keep primary keys narrow.
- Avoid leading-wildcard `LIKE '%term%'` on large tables; it cannot use a B-tree index. Use full-text indexes where the engine supports them for the use case.
- Avoid functions on indexed columns in `WHERE` (for example `YEAR(created_at) = 2026`); rewrite as a range so the index can be used.
- Use connection pooling (`connection-pooling`); opening a new MySQL connection per request is expensive.
- Size the InnoDB buffer pool to hold the working set where the deployment allows it; a buffer pool far smaller than the hot data causes constant disk reads.

## Common Mistakes

- Using the `utf8` character set — it cannot store four-byte characters such as emoji; use `utf8mb4`.
- Using the MyISAM engine — no transactions, no foreign keys, table-level locking; use InnoDB.
- Relying on silent truncation or coercion — with strict mode off, MySQL stores a wrong value instead of erroring; enable strict mode.
- Using floating-point types for money — rounding errors accumulate silently; use `DECIMAL`.
- Forgetting that `TIMESTAMP` converts with the session timezone — store instants deliberately and document the choice.
- Adding an index for every column "just in case" — each index slows writes; index proven patterns.
- Running `ALTER TABLE` on a huge table without checking whether it rebuilds the table — some alters lock or copy the table; test on a copy first.

## Examples

```sql
-- Example: table with InnoDB, utf8mb4, and explicit constraints.
CREATE TABLE books (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```sql
-- Example: idempotent insert using the duplicate-key clause.
INSERT INTO users (email, name) VALUES (?, ?)
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

```sql
-- Example: inspect a query plan before shipping a hot query.
EXPLAIN SELECT id, title FROM books WHERE author_id = ? ORDER BY created_at DESC LIMIT 20;
```

## Validation Checklist

- [ ] The server version is known and the features used exist in that version.
- [ ] All tables use InnoDB and `utf8mb4`.
- [ ] All queries use parameters; no user input is interpolated into SQL.
- [ ] Every table has a primary key; foreign keys declare an `ON DELETE` action.
- [ ] Money uses `DECIMAL`; strict SQL mode is enabled.
- [ ] Hot queries were checked with `EXPLAIN` on representative data.
- [ ] Multi-statement writes that must be atomic run inside a transaction.
- [ ] The application connects with a least-privilege account, over TLS where the connection leaves the host.

## Expected Deliverables

- SQL or migration files implementing the change, with parameters and explicit constraints.
- `EXPLAIN` output for any new or changed hot query, with a one-line reading of the plan.
- Notes on any MySQL-specific feature used and why it was chosen over a portable alternative.

## References

- [MySQL reference manual](https://dev.mysql.com/doc/) — SQL, types, functions, administration.
- [MySQL downloads](https://dev.mysql.com/downloads/) — supported versions.
- Related skills in this repository: `database-design`, `sql-optimization`, `indexing`, `transactions`, `connection-pooling`, `migrations`, `prisma`, `drizzle`.
