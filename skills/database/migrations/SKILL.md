---
name: migrations
description: >
  Manage database schema migrations safely: versioned migration files,
  reversible changes, zero-downtime deploys, and backfills. Use when
  changing a database schema, adding or removing columns or tables,
  renaming fields, backfilling data, or setting up migration tooling.
  Trigger keywords: migration, schema migration, migrate, rollback,
  zero-downtime migration, backfill, schema change, Prisma Migrate.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Migrations

## Purpose

This skill covers safe database schema evolution: writing versioned, reviewable, reversible migrations, deploying them without downtime, and backfilling data without locking the database. A good migration is boring — small, tested, and reversible — because a bad one can take down production or lose data.

## When to Use

- Adding, removing, or changing tables, columns, indexes, or constraints.
- Renaming a column or table that application code depends on.
- Backfilling a new column from existing data.
- Changing a column type or a constraint on a live table.
- Setting up migration tooling for a project (Prisma Migrate, drizzle-kit, or a standalone runner).
- Rolling back a schema change that caused a problem.

## When Not to Use

- When designing the initial schema from scratch — use `database-design` first, then express the result as migrations.
- When the change is only an index — use `indexing` for the index design, and still ship it as a migration.
- When the task is only about query speed — use `sql-optimization`.
- When the task is restoring data after a failure — use `backup-recovery`.

## Prerequisites

- A migration tool chosen for the project (Prisma Migrate, drizzle-kit, or a standalone migration runner) with its configuration committed.
- A copy of production-like data to test migrations against, or at least a staging database with realistic row counts.
- Knowledge of which database engine is in use and which DDL operations lock or rewrite tables on that engine.
- A deployment process that runs migrations in order, exactly once, before or alongside the application deploy.
- Supported versions as of 2026-11-20: PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51, Prisma ORM 7, Drizzle ORM 0.45. Version-specific DDL behaviour matters: PostgreSQL 11 and later add a column with a constant default without rewriting the table, and MySQL 8.0.12 and later support instant `ADD COLUMN` in most cases — but the add-nullable, backfill, constrain sequence is still the safe default on large tables.

## Official Documentation

- [Prisma documentation](https://www.prisma.io/docs) — Prisma Migrate concepts and commands.
- [Drizzle ORM documentation](https://orm.drizzle.team/docs) — drizzle-kit migration generation and application.
- [PostgreSQL documentation](https://www.postgresql.org/docs/) — DDL locking and `ALTER TABLE` behaviour.
- [MySQL reference manual](https://dev.mysql.com/doc/) — online DDL and `ALTER TABLE` behaviour.

## Required Workflow

1. Make one logical change per migration, with a descriptive name and a timestamp or sequence that orders it.
2. Write the migration as DDL (or generate it from the schema diff and review the generated SQL line by line).
3. Write the rollback for the same change: the exact steps that return the schema to its previous state, and note where rollback is impossible (for example after dropping a column with data).
4. Check whether the change locks or rewrites the table on the target engine and data volume; if it does, use the expand-and-contract pattern (step 6) or the engine's online DDL.
5. Test the migration against a copy of production-like data: run it, measure how long it takes, and verify the application works against the new schema.
6. For breaking changes, use expand-and-contract: first add the new structure alongside the old (expand), deploy code that writes both and reads the new, backfill, then remove the old structure in a later release (contract).
7. Backfill in batches with pauses, inside short transactions, so the backfill does not lock the table or exhaust resources.
8. Run migrations in order, exactly once, as part of the deploy — never by hand against a shared database.
9. Verify after the deploy: the application starts, the new queries work, and the migration history table records the migration as applied.
10. If a migration fails in production, stop, assess, and either roll forward with a fix or roll back with the prepared rollback — never patch the migration file that already ran in a shared environment.

## Implementation Standards

- Migrations are versioned, ordered, and immutable once applied in a shared environment; a mistake is fixed by a new migration, never by editing history.
- Every migration is idempotent in intent: the migration runner tracks which migrations have run, and a migration never assumes it can run twice.
- Destructive changes (drop column, drop table, change type) are separate migrations from additive changes, so each can be reviewed and rolled back independently.
- Adding a column with a default on a large table is done carefully: on older engines it rewrites the table (PostgreSQL 11+ and MySQL 8.0.12+ avoid the rewrite for most constant defaults); add the column nullable, backfill, then add the constraint.
- Renames are expand-and-contract, never a single rename, when old application code may still be running during the deploy.
- Backfills run in batches (for example 1,000 rows per batch) with a pause between batches, and are resumable.
- Migration files are reviewed like code: the reviewer checks the DDL, the rollback, the lock behaviour, and the data impact.
- The migration history is stored in the database by the runner; do not track applied migrations by hand.
- Seed data and test fixtures are separate from migrations; migrations change schema and, where needed, the data the schema requires.
- A migration that fails partway must leave the database in a state the runner can recover from; prefer transactional migrations where the engine supports DDL transactions.

## Best Practices

- Keep migrations small: a migration that changes ten things is hard to review and hard to roll back.
- Deploy schema changes before the code that needs them when the change is additive, and remove old structures only after the code no longer uses them.
- Test migrations on production-like data volumes, not only on an empty database: a migration that takes a second on 100 rows can take an hour on 10 million.
- Measure the migration's lock time, not just its total time: a long migration that does not lock is safer than a short one that blocks all writes.
- Use the engine's concurrent index creation (`CREATE INDEX CONCURRENTLY` on PostgreSQL) for indexes on production tables.
- Communicate destructive migrations in advance: anyone with a long-running branch or a local database needs to know.
- Keep a staging environment whose schema is always migrated from the same files as production, so drift is caught early.

## Security Considerations

- Migration files can contain sensitive details (table names, data shapes); treat them with the same care as other schema artifacts.
- A migration that adds a column for sensitive data must consider encryption, access control, and retention from the start — see `database-security`.
- Backfills that read or write personal data must respect the same access rules as the application.
- Never put credentials or secrets in a migration file.
- Restrict who can run migrations against production; the deploy pipeline runs them, not individual developers by hand.

## Performance Considerations

- Table rewrites are the expensive case: adding a column with a default, changing a type, or adding a constraint that validates existing rows can rewrite a large table.
- Index creation on a large table takes time and I/O; use the non-blocking form and schedule it outside peak hours where possible.
- Backfills compete with live traffic for I/O and locks; batch them and pause between batches.
- A migration that adds a `NOT NULL` constraint without a default fails if any row has a null; backfill first, then add the constraint.
- Locking a table during a migration blocks the application; prefer online DDL and expand-and-contract over lock-and-rewrite.

## Common Mistakes

- Editing a migration that already ran in a shared environment — creates drift between environments; write a new migration instead.
- Renaming a column in one step while old code is still deployed — the old code breaks; use expand-and-contract.
- Adding a `NOT NULL` column with no default to a table with rows — the migration fails; add nullable, backfill, then constrain.
- Backfilling in a single transaction — locks the table for the whole backfill; batch it.
- Testing only on an empty database — a migration that is instant on empty tables can lock production for an hour.
- Skipping the rollback — when a migration fails in production, there is no time to invent one; write it before deploying.
- Running migrations by hand against production — no record, no ordering, no repeatability; use the runner in the deploy pipeline.

## Examples

```sql
-- Example: expand — add the new column alongside the old one.
ALTER TABLE users ADD COLUMN display_name TEXT;
```

```sql
-- Example: backfill in batches (run repeatedly until no rows remain).
UPDATE users SET display_name = name
WHERE display_name IS NULL AND id IN (
  SELECT id FROM users WHERE display_name IS NULL LIMIT 1000
);
```

```sql
-- Example: contract, in a later release, after the code no longer reads
-- the old column.
ALTER TABLE users DROP COLUMN name;
```

```sql
-- Example: add a constraint only after the data satisfies it.
ALTER TABLE books ADD CONSTRAINT books_price_non_negative CHECK (price_cents >= 0);
```

## Validation Checklist

- [ ] The migration does one logical change and has a descriptive name.
- [ ] The generated or written SQL was reviewed line by line.
- [ ] A rollback exists, or the reason rollback is impossible is documented.
- [ ] The migration was tested against production-like data and its runtime and lock behaviour are known.
- [ ] Breaking changes use expand-and-contract across releases.
- [ ] Backfills are batched, resumable, and run in short transactions.
- [ ] The migration ran in order, exactly once, through the deploy pipeline — not by hand.
- [ ] After the deploy, the application starts and the migration history records the migration as applied.

## Expected Deliverables

- The migration file(s) for the change, with a rollback for each.
- A note on lock behaviour, expected runtime, and whether the change is safe to run during traffic.
- For breaking changes, the expand-and-contract plan across releases.
- Confirmation that the migration ran cleanly against production-like data.

## References

- [Prisma documentation](https://www.prisma.io/docs) — Prisma Migrate.
- [Drizzle ORM documentation](https://orm.drizzle.team/docs) — drizzle-kit migrations.
- [PostgreSQL documentation](https://www.postgresql.org/docs/) — DDL and locking.
- [MySQL reference manual](https://dev.mysql.com/doc/) — online DDL.
- Related skills in this repository: `database-design`, `indexing`, `prisma`, `drizzle`, `transactions`, `backup-recovery`.
