---
name: prisma
description: >
  Use Prisma ORM in TypeScript and JavaScript applications: schema modeling,
  Prisma Client queries, relations, migrations, and type-safe database
  access. Use when adding or maintaining Prisma in a project, modeling data
  with a Prisma schema, writing Prisma Client queries, or debugging Prisma
  behaviour. Trigger keywords: Prisma, Prisma Client, Prisma schema,
  prisma migrate, Prisma ORM, Prisma query.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Prisma

## Purpose

This skill covers Prisma ORM 7 usage in TypeScript and JavaScript applications: modeling data in the Prisma schema, writing type-safe queries with Prisma Client, managing relations and transactions, and keeping migrations and the generated client in sync. Prisma ORM 7 is the current stable line (7.10.1). Prisma ORM 8 is a release candidate with a rewritten API — see Prerequisites — so this skill's commands and code apply to Prisma ORM 7 projects only. It complements the upstream `prisma-orm-setup` skill in this repository (under `skills/upstream/prisma/`), which covers setup; this skill covers day-to-day usage.

## When to Use

- Adding Prisma ORM to a TypeScript or JavaScript project, or maintaining an existing Prisma setup.
- Modeling data with `schema.prisma`: models, relations, enums, and indexes.
- Writing Prisma Client queries, including filters, includes, selects, and aggregations.
- Managing relations (one-to-many, many-to-many, one-to-one) and cascading deletes.
- Running Prisma Migrate to evolve the schema.
- Debugging Prisma query behaviour, N+1 queries, or type errors.

## When Not to Use

- When the project uses a different ORM — use `drizzle` for Drizzle ORM.
- When the task is raw SQL performance tuning — use `sql-optimization` and `indexing`.
- When the task is engine-specific administration — use `postgresql`, `mysql`, `sqlite`, or `mongodb`.
- When the task is engine-agnostic schema design before any ORM is chosen — use `database-design`.
- When the task is only Prisma setup scaffolding — the upstream `prisma-orm-setup` skill covers that path.

## Prerequisites

- Node.js 26 LTS (24 and 22 remain supported LTS lines) and TypeScript 7.x (or JavaScript with the same runtime).
- This skill describes Prisma ORM 7, the current stable line (7.10.1). Prisma ORM 7 receives bug fixes and security updates for 18 months after Prisma ORM 8 reaches general availability.
- Prisma ORM 8 is a release candidate, not a stable release: as of 16 November 2026 the `latest` npm tag installs `prisma@8.0.0-rc.34` (CLI) with `@prisma/orm-postgres@8.0.0-rc.24` (library). It replaces `schema.prisma` with a contract, `prisma generate` with `prisma contract emit`, and `@prisma/client` with per-database libraries such as `@prisma/orm-postgres`, and it has no `generate`, `migrate dev`, or `db push` commands. Database support so far: PostgreSQL (release candidate) and MongoDB (early access); MySQL is an early preview (migrations, reads, and writes), MariaDB an early preview (migrations only), and SQLite experimental. Do not follow this skill's commands on a Prisma ORM 8 project.
- Pin the major version in `package.json` (`prisma@7` and `@prisma/client@7`): an unpinned `npm install prisma` now installs the Prisma ORM 8 release candidate. In CI or one-off commands use `npx prisma@7`.
- Prisma ORM 6 reached end of life on 19 November 2026 and receives no more updates; upgrade to Prisma ORM 7 (or to Prisma ORM 8 on PostgreSQL or MongoDB).
- A supported database reachable from the project. Prisma ORM 7 supports PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, and CockroachDB; it has no MongoDB support (MongoDB is available in Prisma ORM 8 only).
- The connection string stored as an environment variable such as `$DATABASE_URL`, never committed to the repository.
- Prisma ORM 7 does not load `.env` files by default: load them with `dotenv`, or define the connection in the Prisma config file (`prisma7.config.ts` on 7.10+, `prisma.config.ts` on 7.0–7.9; the 7.10 CLI reads either name, so edit the file `prisma init` created — do not create a second one).

## Official Documentation

- [Prisma documentation](https://www.prisma.io/docs) — the authoritative reference for the schema, Prisma Client, and Prisma Migrate.
- [Prisma ORM reference](https://www.prisma.io/docs/orm) — ORM concepts, Client API, and Migrate guides.
- [Prisma ORM release status](https://www.prisma.io/docs/orm/release-status) — which major version is stable, which is a release candidate, and how long each is supported. Prisma ORM 7 documentation lives at `/orm/v7`.

## Required Workflow

1. Confirm the installed Prisma major version and the database provider in `schema.prisma` before writing code.
2. Model the data in `schema.prisma`: one model per entity, explicit relation fields with `fields` and `references`, and `@@index` or `@@unique` where the access patterns need them.
3. Generate the client after any schema change and keep the generated client out of version control unless the project deliberately commits it.
4. Write queries with Prisma Client's type-safe API (`findMany`, `findUnique`, `create`, `update`, `upsert`, `delete`); use `select` to fetch only the fields the caller needs.
5. Load relations deliberately: use `include` for the relations a response needs and `select` for nested field control; never loop over results issuing one query per row.
6. Use `prisma.$transaction` for multi-statement writes that must succeed or fail together.
7. Evolve the schema with Prisma Migrate (`migrate dev` in development, `migrate deploy` in production); never edit a migration that has already run in a shared environment.
8. Use raw SQL (`$queryRaw`, `$executeRaw`) only for queries the Client API cannot express, with parameterized values.
9. Check generated SQL for hot queries (Prisma's query logging) and confirm the database uses an index.
10. Before a deploy, run the migration against a copy of production-like data and verify the application starts and the new queries work.

## Implementation Standards

- The Prisma schema is the source of truth for the data model; do not hand-edit the database and leave the schema behind.
- Every relation declares both sides explicitly with `fields` and `references`; implicit relations hide the foreign key.
- Use `@id`, `@unique`, `@default`, and `@updatedAt` deliberately: every model has an `@id`, business identifiers are `@unique`, and timestamps use `@default(now())` and `@updatedAt` where the domain needs them.
- Use enums in the schema for closed value sets instead of free strings.
- Use `@@index` for the foreign keys and filter columns of hot queries; Prisma creates indexes for `@id` and `@unique` automatically.
- Use `select` by default in API responses; `include` only the relations the response needs.
- Use cursor-based pagination (`cursor`, `take`, `skip`) for large or growing lists; offset pagination (`skip`/`take` alone) is acceptable only for small, stable lists.
- Use `upsert` for idempotent writes instead of a read-then-write race.
- Keep one `PrismaClient` instance per process (a singleton module); creating a client per request exhausts the connection pool.
- Keep `schema.prisma` formatted and reviewed like code; run the Prisma formatter before committing.

## Best Practices

- Fetch with `select` and shape the response in the query, not by fetching whole models and deleting fields afterwards.
- Watch for N+1 queries: a loop that queries inside it is almost always a missing `include` or a missing `findMany` with `where: { id: { in: [...] } }`.
- Use `prisma.$transaction` with the array form for independent writes and the callback form when later writes depend on earlier results.
- Use Client Extensions (`$extends`) for cross-cutting concerns (soft delete, audit fields) rather than repeating logic in every query. The `$use` middleware API was removed in Prisma ORM 7; do not use it.
- Use Prisma's query log in development to see the SQL being generated; an ORM that hides SQL still runs SQL.
- Seed the database with a repeatable seed script that can run against a fresh database.
- Keep migrations small and reviewable: one logical change per migration, with a descriptive name.

## Security Considerations

- Prisma Client parameterizes values, which prevents SQL injection for Client queries; raw queries must still use parameterized values, never string interpolation.
- Never expose the full Prisma model to API clients: use `select` to exclude sensitive fields such as password hashes.
- Store the connection string in an environment variable or a secret manager; never commit it.
- Use a least-privilege database role for the application; Prisma does not need administrative rights at runtime.
- Validate input before it reaches Prisma: the ORM checks types, not business rules.
- Keep Prisma and its drivers updated; security fixes ship in new releases.

## Performance Considerations

- Use `select` to fetch only needed fields; fetching whole models with large text or JSON columns wastes I/O.
- Avoid N+1 queries; one query with `include` or an `in` filter beats a loop of queries.
- Use `take` limits on every unbounded `findMany`; a list endpoint without a limit is a future outage.
- Use cursor pagination for large lists so later pages stay fast.
- Add `@@index` entries for the filter and sort columns of hot queries, and verify with the database's `EXPLAIN`.
- Use a single shared `PrismaClient` instance so connection pooling works as intended.
- Use `$transaction` for batch writes rather than many separate round trips where atomicity or performance requires it.

## Common Mistakes

- Creating a new `PrismaClient` per request — exhausts connections; use one singleton per process.
- Looping over results and querying inside the loop — the classic N+1; use `include` or a single `in` query.
- Fetching whole models and filtering fields in code — use `select` to fetch only what is needed.
- Editing a migration that already ran in a shared environment — creates drift; write a new migration instead.
- Using `skip`/`take` offset pagination on a large, growing list — later pages get slower and rows can be skipped or duplicated; use cursor pagination.
- Interpolating values into `$queryRaw` — use parameterized raw queries.
- Forgetting to regenerate the client after a schema change — types and queries go stale; generate as part of the workflow.

## Examples

```prisma
// Example: schema with an explicit relation, unique email, and an index.
model Author {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  name      String
  books     Book[]
  createdAt DateTime @default(now())
}

model Book {
  id        Int      @id @default(autoincrement())
  authorId  Int
  author    Author   @relation(fields: [authorId], references: [id], onDelete: Restrict)
  title     String
  priceCents Int
  createdAt DateTime @default(now())

  @@index([authorId])
}
```

```ts
// Example: one query with select and include, plus a singleton client.
// Prisma ORM 7 needs a driver adapter: the client has no built-in driver.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

const books = await prisma.book.findMany({
  where: { authorId },
  select: { id: true, title: true, priceCents: true, author: { select: { name: true } } },
  orderBy: { createdAt: "desc" },
  take: 20,
});
```

```ts
// Example: atomic multi-statement write with the callback form.
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { customerId, totalCents } });
  await tx.orderItem.createMany({ data: items.map((item) => ({ ...item, orderId: order.id })) });
  return order;
});
```

## Validation Checklist

- [ ] The installed Prisma major version is known and the code matches it.
- [ ] The schema is the source of truth and the client is regenerated after changes.
- [ ] Every relation declares `fields` and `references`; every model has an `@id`.
- [ ] Queries use `select` to fetch only needed fields and have a `take` limit.
- [ ] No query runs inside a loop over results (no N+1).
- [ ] Multi-statement writes that must be atomic use `prisma.$transaction`.
- [ ] Migrations are versioned and unedited after running in a shared environment.
- [ ] Raw queries use parameters; no user input is interpolated into SQL.

## Expected Deliverables

- The updated `schema.prisma` and the migration files for the change.
- Query code using Prisma Client with `select`/`include` shaped for the caller.
- Notes on any raw SQL used and why the Client API could not express the query.
- Confirmation that the migration ran cleanly against production-like data.

## References

- [Prisma documentation](https://www.prisma.io/docs) — schema, Client, and Migrate.
- [Prisma ORM reference](https://www.prisma.io/docs/orm) — ORM concepts and API.
- [Prisma ORM release status](https://www.prisma.io/docs/orm/release-status) — stable vs release-candidate versions and support windows.
- Related skills in this repository: `database-design`, `postgresql`, `mysql`, `sqlite`, `mongodb`, `migrations`, `transactions`, `drizzle`.
