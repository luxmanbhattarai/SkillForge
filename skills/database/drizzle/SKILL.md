---
name: drizzle
description: >
  Use Drizzle ORM in TypeScript and JavaScript applications: schema
  definitions, relational queries, SQL-like query builder, relations, and
  migrations with drizzle-kit. Use when adding or maintaining Drizzle in a
  project, defining tables with Drizzle schema code, writing Drizzle
  queries, or debugging Drizzle behaviour. Trigger keywords: Drizzle,
  Drizzle ORM, drizzle-kit, drizzle schema, Drizzle query, relational query.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Drizzle

## Purpose

This skill covers general Drizzle ORM usage in TypeScript and JavaScript applications: defining tables in code, writing type-safe queries with the relational and SQL-like APIs, modeling relations, and managing migrations with drizzle-kit. Drizzle stays close to SQL, so this skill also covers when to drop to raw SQL and how to keep the schema and migrations in sync.

## When to Use

- Adding Drizzle ORM to a TypeScript or JavaScript project, or maintaining an existing Drizzle setup.
- Defining tables, columns, indexes, and relations in Drizzle schema files.
- Writing Drizzle queries: relational queries, the query builder, inserts, updates, and deletes.
- Managing relations (one-to-many, many-to-many, one-to-one) with `relations`.
- Generating and applying migrations with drizzle-kit.
- Debugging Drizzle query behaviour, N+1 queries, or type errors.

## When Not to Use

- When the project uses a different ORM — use `prisma` for Prisma ORM.
- When the task is raw SQL performance tuning — use `sql-optimization` and `indexing`.
- When the task is engine-specific administration — use `postgresql`, `mysql`, or `sqlite`.
- When the task is engine-agnostic schema design before any ORM is chosen — use `database-design`.
- When the data is document-shaped and MongoDB is the target — use `mongodb`.

## Prerequisites

- Node.js 26 LTS (24 and 22 remain supported LTS lines) and TypeScript 7.x.
- This skill describes the stable Drizzle ORM 0.45 line (0.45.4). Drizzle ORM 1.0 is a release candidate on the `@rc` npm tag (1.0.0-rc.5) with a new relations API and migration engine; its API differs from the stable line, so check the installed version before following 1.0 documentation, and keep `drizzle-orm` and `drizzle-kit` on matching lines.
- A supported database reachable from the project (PostgreSQL, MySQL, or SQLite).
- The connection string stored as an environment variable such as `$DATABASE_URL`, never committed to the repository.
- A driver for the chosen database, as documented by Drizzle for that database.

## Official Documentation

- [Drizzle ORM documentation](https://orm.drizzle.team/docs) — the authoritative reference for the schema, queries, relations, and drizzle-kit.
- [Drizzle ORM guides](https://orm.drizzle.team/docs/get-started) — getting-started guides per database.

## Required Workflow

1. Confirm the installed Drizzle version and the database driver in use before writing code.
2. Define tables in schema files with `pgTable`, `mysqlTable`, or `sqliteTable` as appropriate, with explicit column types, primary keys, and indexes.
3. Define relations with `relations` for every table that participates in a relation, so relational queries work.
4. Create one database client instance per process (a singleton module) and share it; do not create a client per request.
5. Write queries with the relational API (`db.query.books.findMany`) for reads with relations, and the SQL-like builder (`db.select().from(books)`) when precise control over the SQL is needed.
6. Use `columns` and `with` to fetch only the fields and relations the caller needs.
7. Use `db.transaction` for multi-statement writes that must succeed or fail together. Interactive transactions need a driver with transaction support; HTTP-only drivers (Neon HTTP, Cloudflare D1) do not support them — use `db.batch` on those drivers instead.
8. Generate migrations with drizzle-kit after schema changes, review the generated SQL, and apply migrations with the project's migrator — never hand-edit the database and leave the schema behind.
9. Use `sql` template literals only for expressions the builder cannot express, with parameterized values.
10. Check generated SQL for hot queries (Drizzle's logger) and confirm the database uses an index.

## Implementation Standards

- Schema files are the source of truth for the data model; the database is changed through migrations generated from them.
- Every table declares its primary key explicitly; every foreign key uses `.references()` with an explicit `onDelete` action.
- Column types match the database: `serial`/`bigserial` or identity columns for PostgreSQL keys, `int` with autoincrement for MySQL, `integer` for SQLite.
- Timestamps use the timezone-aware type for the target database where one exists; document the convention.
- Money uses a fixed-point decimal column or integer minor units, never a floating-point column.
- Indexes are declared in the table definition's third argument, with clear names, for the filter and sort columns of hot queries.
- Relations are declared on both sides with `relations` so `with` works in both directions.
- Use `.$dynamic()` or the query builder's conditional helpers for queries whose filters vary, instead of building SQL strings.
- Keep schema files organized by domain (one file per table or per domain area) rather than a single giant file.
- Keep drizzle-kit configuration (`drizzle.config.ts`) in the repository with the schema path, dialect, and migrations output directory.

## Best Practices

- Prefer the relational API for reads: it is concise, type-safe, and handles joins for you.
- Prefer the SQL-like builder when the query needs precise control (complex joins, window functions, specific ordering).
- Fetch with `columns` and `with` and shape the response in the query, not by fetching whole rows and deleting fields afterwards.
- Watch for N+1 queries: a loop that queries inside it is almost always a missing `with` or a missing `inArray` filter.
- Use a transaction for bulk writes instead of one round trip per row. `db.batch` exists only on drivers that support batching (Cloudflare D1, libSQL, Neon HTTP, and proxy drivers); it is not available on node-postgres, postgres-js, or mysql2.
- Log generated SQL in development; Drizzle stays close to SQL, so reading the SQL is the fastest way to spot a bad query.
- Review every generated migration before applying it: drizzle-kit generates SQL from the schema diff, and a rename can look like a drop-and-create.
- Seed the database with a repeatable seed script that can run against a fresh database.

## Security Considerations

- Drizzle parameterizes values in its query builders, which prevents SQL injection for builder queries; `sql` template literals must still use parameterized values, never interpolation of raw user input.
- Never expose whole rows to API clients: use `columns` to exclude sensitive fields such as password hashes.
- Store the connection string in an environment variable or a secret manager; never commit it.
- Use a least-privilege database role for the application; Drizzle does not need administrative rights at runtime.
- Validate input before it reaches Drizzle: the ORM checks types, not business rules.
- Keep Drizzle and its drivers updated; security fixes ship in new releases.

## Performance Considerations

- Use `columns` to fetch only needed fields; fetching whole rows with large text columns wastes I/O.
- Avoid N+1 queries; one query with `with` or an `inArray` filter beats a loop of queries.
- Use `limit` on every unbounded list query; a list endpoint without a limit is a future outage.
- Use cursor pagination for large lists so later pages stay fast.
- Add indexes for the filter and sort columns of hot queries, and verify with the database's `EXPLAIN`.
- Use a single shared database client so connection pooling works as intended.
- Use transactions or batch writes (where the driver supports `db.batch`) for bulk operations rather than many separate round trips.

## Common Mistakes

- Creating a new database client per request — exhausts connections; use one singleton per process.
- Looping over results and querying inside the loop — the classic N+1; use `with` or a single `inArray` query.
- Forgetting to declare `relations` — relational queries with `with` fail or silently omit the relation.
- Applying a generated migration without reading it — a renamed column can generate a drop-and-create that loses data; review the SQL.
- Interpolating user input into `sql` template literals — use parameterized values.
- Fetching whole rows and filtering fields in code — use `columns` to fetch only what is needed.
- Using offset pagination on a large, growing list — later pages get slower and rows can shift; use cursor pagination.

## Examples

```ts
// Example: schema with a foreign key, an index, and relations.
import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => authors.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  priceCents: integer("price_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("books_author_id_idx").on(table.authorId)]);

export const authorsRelations = relations(authors, ({ many }) => ({
  books: many(books),
}));

export const booksRelations = relations(books, ({ one }) => ({
  author: one(authors, { fields: [books.authorId], references: [authors.id] }),
}));
```

```ts
// Example: relational query fetching only the fields the caller needs.
const result = await db.query.books.findMany({
  where: eq(books.authorId, authorId),
  columns: { id: true, title: true, priceCents: true },
  with: { author: { columns: { name: true } } },
  orderBy: [desc(books.createdAt)],
  limit: 20,
});
```

```ts
// Example: atomic multi-statement write.
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({ customerId, totalCents }).returning();
  await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: order.id })));
});
```

## Validation Checklist

- [ ] The installed Drizzle version and driver are known and the code matches them.
- [ ] Schema files are the source of truth and migrations are generated from them.
- [ ] Every table has an explicit primary key; foreign keys declare an `onDelete` action.
- [ ] Relations are declared on both sides where relational queries use them.
- [ ] Queries use `columns`/`with` to fetch only needed fields and have a limit.
- [ ] No query runs inside a loop over results (no N+1).
- [ ] Multi-statement writes that must be atomic use `db.transaction`.
- [ ] Generated migrations were reviewed before being applied.

## Expected Deliverables

- Updated schema files and the drizzle-kit migration files for the change.
- Query code using the relational API or query builder, shaped for the caller.
- Notes on any raw SQL used and why the builder could not express the query.
- Confirmation that the migration ran cleanly against production-like data.

## References

- [Drizzle ORM documentation](https://orm.drizzle.team/docs) — schema, queries, relations, drizzle-kit.
- [Drizzle ORM guides](https://orm.drizzle.team/docs/get-started) — getting-started guides per database.
- Related skills in this repository: `database-design`, `postgresql`, `mysql`, `sqlite`, `migrations`, `transactions`, `prisma`.
