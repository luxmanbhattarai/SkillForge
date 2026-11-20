---
name: database-design
description: >
  Design relational database schemas: entities, relationships, normalization,
  primary and foreign keys, constraints, and data types. Use when creating a
  new schema, modeling domain data, choosing between normalization and
  denormalization, or reviewing a schema for correctness and maintainability.
  Trigger keywords: schema design, ERD, normalization, entity relationship,
  primary key, foreign key, data modeling.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Database Design

## Purpose

This skill guides the design of a correct, maintainable relational database schema from a set of domain requirements. It produces a schema where every table has a clear purpose, every relationship is explicit, integrity rules are enforced by the database itself, and future change is possible without a rewrite.

## When to Use

- Designing a schema for a new application or feature.
- Modeling entities, relationships, and cardinality (one-to-one, one-to-many, many-to-many).
- Deciding on primary keys, foreign keys, unique constraints, and check constraints.
- Reviewing an existing schema for normalization problems, missing constraints, or ambiguous columns.
- Choosing data types for columns such as money, timestamps, enums, and JSON.
- Planning how a schema will evolve before writing the first migration.

## When Not to Use

- When the data is genuinely document-shaped with no stable relations — use `mongodb` or a document store instead.
- When tuning slow queries on an existing schema — use `sql-optimization` and `indexing`.
- When changing a live schema safely — use `migrations`.
- When picking a specific database engine — use `postgresql`, `mysql`, or `sqlite` for engine guidance.
- When the task is only about access control or encryption — use `database-security`.

## Prerequisites

- A written list of the entities the application needs and the questions it must answer.
- Knowledge of which database engine will be used, or a shortlist to decide between.
- Understanding of the expected scale: rough row counts, read/write ratio, and growth.
- Access to the project repository and its existing schema or migration tooling, if any.
- Supported versions as of 2026-11-20: PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51. The examples use PostgreSQL syntax (identity columns need PostgreSQL 10+; `CITEXT` needs the `citext` extension).

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — data types, constraints, and DDL reference for the most common target engine.
- [MySQL reference manual](https://dev.mysql.com/doc/) — data types and constraint behaviour for MySQL targets.
- [SQLite documentation](https://www.sqlite.org/docs.html) — types and limits for embedded targets.

## Required Workflow

1. List the entities and the real-world facts each one represents; one table per entity, one row per instance.
2. For each entity, list its attributes and mark which ones identify a row, which are required, and which must be unique.
3. Draw the relationships: name each relationship, state its cardinality in both directions, and identify many-to-many pairs that need a join table.
4. Choose a primary key strategy per table: a surrogate key (generated identifier) or a natural key, and apply it consistently.
5. Normalize to third normal form (3NF) by default: remove repeating groups, partial dependencies, and transitive dependencies.
6. Add integrity rules as constraints, not as application code alone: `NOT NULL`, `UNIQUE`, `CHECK`, and foreign keys with an explicit `ON DELETE` / `ON UPDATE` action.
7. Choose precise data types: fixed-point decimal for money, `timestamptz`-style timezone-aware timestamps for instants, and bounded text lengths only where a real limit exists.
8. Denormalize only with a written reason: name the query it serves, the measured or expected read volume, and how the duplicated data stays consistent.
9. Name everything consistently: tables plural or singular by project convention, columns in `snake_case`, and foreign keys named after the table they reference (for example `author_id`).
10. Write the schema as versioned DDL or migrations, then review it against the Validation Checklist before any application code depends on it.

## Implementation Standards

- Every table has a primary key. Every foreign key references a primary key or a unique key, never a non-unique column.
- Use surrogate primary keys (UUID or auto-incrementing integer) unless a natural key is stable, short, and guaranteed unique by the domain.
- Store one fact per column: never store comma-separated lists, multiple values in one column, or a value whose meaning depends on another column.
- Money is stored as a fixed-point decimal (`NUMERIC` / `DECIMAL`), never as a floating-point type.
- Timestamps that represent real instants are timezone-aware; store UTC and convert at display time.
- Boolean state uses a real boolean column, not a string or an integer code.
- Enum-like values use a database enum type or a small reference table, not free text, when the set of values is closed.
- Nullable columns mean "unknown or not applicable", never "empty string" or a sentinel value such as `0` or `1900-01-01`.
- Every many-to-many relationship is a join table with a composite primary key (or a unique constraint) on the two foreign keys.
- Audit columns (`created_at`, `updated_at`) are added where the domain needs a history of change, and are set by the database or the data layer, not left to callers.

## Best Practices

- Model the domain first and the queries second; a schema that cannot represent the facts correctly cannot be saved by clever queries.
- Keep the schema boring: standard types, standard constraints, and naming a new team member can guess.
- Prefer narrow tables with clear names over one wide table that tries to hold several entities.
- Put a `UNIQUE` constraint on every business identifier (email, slug, order number) in addition to the surrogate primary key.
- Record decisions that look odd in a short comment or design note, so the next person does not "fix" a deliberate choice.
- Design for the delete path: decide for every foreign key whether deleting the parent should cascade, set null, restrict, or be blocked by the application.
- Keep lookup and reference data in tables rather than hard-coding it in application code, so new values do not need a deploy.

## Security Considerations

- Enforce integrity in the database, not only in the application: a constraint is the last line of defence when a bug or a second client writes bad data.
- Do not store secrets, tokens, or passwords in plain text; store only hashes for passwords and keep secrets in a secret manager.
- Design columns for least privilege: separate sensitive columns (for example payment details) so a role can be denied access to them without losing the whole table.
- Avoid storing personal data that the application does not need; every stored field is a field that can leak.
- Plan for data deletion: if a user can request erasure, the schema must make it possible to delete or anonymize their rows without breaking referential integrity.

## Performance Considerations

- Normalization favours write correctness; denormalization favours specific read patterns. Choose per query, with evidence, not by habit.
- Wide rows and very wide tables cost I/O on every scan; split rarely-used large columns (large text, JSON blobs) into a separate table when the hot columns are scanned often.
- Choose the smallest type that fits the data honestly: an integer key is cheaper to index and join than a long string key.
- Design the schema so the common queries can use an index: filter and join columns should be real columns, not expressions over columns or values buried in JSON.
- Anticipate growth: a table expected to reach millions of rows needs its access patterns and partitioning story decided at design time, not after it is slow.

## Common Mistakes

- Storing lists in a single column — breaks filtering, joining, and constraints; use a join table or a child table.
- Using floating-point types for money — rounding errors accumulate silently; use `NUMERIC` / `DECIMAL`.
- Skipping foreign keys "for performance" — trades a small, measurable cost for silent orphan rows; add the constraint and measure first.
- Making everything nullable — lets invalid states into the database; make columns `NOT NULL` unless absence is genuinely meaningful.
- Using a natural key that can change (email, username) as a primary key — forces cascading updates; use a surrogate key and a unique constraint on the natural key.
- Over-normalizing to the point where every read needs a dozen joins — normalize to 3NF by default, then denormalize deliberately for proven hot queries.
- Naming columns ambiguously (`status`, `type`, `value`) — a reader cannot tell what the values mean; name the domain concept (`order_status`, `account_type`).

## Examples

```sql
-- Example: normalized schema for authors and books, with a join table
-- for the many-to-many relationship between books and categories.
-- CITEXT is not built in: the citext extension must be enabled first.
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE authors (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email CITEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE books (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES authors (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  published_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE book_categories (
  book_id BIGINT NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, category_id)
);
```

```sql
-- Example: a deliberately denormalized counter, kept consistent by the
-- application, with the reason recorded in a comment.
COMMENT ON COLUMN books.review_count IS
  'Denormalized count of reviews, updated by the review write path, to avoid
  counting the reviews table on every book listing page.';
```

## Validation Checklist

- [ ] Every table has a primary key and a clear one-sentence purpose.
- [ ] Every relationship has explicit cardinality and a foreign key with an `ON DELETE` action.
- [ ] Every many-to-many relationship uses a join table.
- [ ] The schema is in third normal form except for denormalizations that are documented with a reason.
- [ ] Money uses a fixed-point decimal type; instants use timezone-aware timestamps.
- [ ] Business identifiers have `UNIQUE` constraints; required fields are `NOT NULL`.
- [ ] No column stores a list, a composite value, or a sentinel for "missing".
- [ ] The schema is expressed as versioned DDL or migrations, and it creates cleanly on an empty database.

## Expected Deliverables

- The schema as versioned DDL or migration files, ready to run on an empty database.
- A short entity-relationship summary: tables, keys, and relationships with cardinality.
- A list of deliberate denormalizations and the reason for each.
- Notes on any naming, typing, or delete-behaviour decisions that a reviewer might question.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — DDL, data types, and constraints.
- [MySQL reference manual](https://dev.mysql.com/doc/) — DDL, data types, and constraints.
- [SQLite documentation](https://www.sqlite.org/docs.html) — types and limits.
- Related skills in this repository: `postgresql`, `mysql`, `sqlite`, `migrations`, `indexing`, `prisma`, `drizzle`.
