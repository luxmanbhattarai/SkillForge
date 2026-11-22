---
name: indexing
description: >
  Design and maintain database indexes: B-tree, composite, partial,
  covering, and full-text indexes. Use when a query needs an index, when
  choosing index columns and order, when reviewing unused or redundant
  indexes, or when index maintenance is slowing writes. Trigger keywords:
  index, indexing, B-tree, composite index, covering index, partial index,
  slow query index, unused index.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Indexing

## Purpose

This skill covers index design for relational databases: choosing the right index type, column order, and coverage for the queries that actually run, and keeping the index set lean so writes stay fast. A good index set is built from measured access patterns, not from indexing every column.

## When to Use

- A query is slow because it scans a large table and needs an index.
- Designing indexes for a new schema or a new feature's queries.
- Choosing column order in a composite index.
- Reviewing an existing index set for unused, redundant, or overlapping indexes.
- Deciding between a partial, covering, unique, or full-text index.
- Investigating why an existing index is not being used.

## When Not to Use

- When the query itself is wrong (bad join, function on a column, N+1) — use `sql-optimization` first; an index cannot fix a bad query.
- When the schema needs redesign — use `database-design`.
- When the database is MongoDB — use `mongodb` for its index guidance (compound, text, and geospatial indexes differ in detail).
- When the task is only about query rewriting — use `sql-optimization`.

## Prerequisites

- Knowledge of the target engine (PostgreSQL, MySQL, or SQLite) and its index types.
- The queries the indexes must serve, with their filter, join, and sort columns.
- Representative data to verify index usage with `EXPLAIN`.
- Access to run `EXPLAIN` and, where available, index usage statistics.
- The examples use PostgreSQL syntax. Supported versions: PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51. Note the version-specific differences: `INCLUDE` columns need PostgreSQL 11 or later and have no MySQL equivalent; `CREATE INDEX CONCURRENTLY` is PostgreSQL-only (MySQL uses online DDL, SQLite has no concurrent form).

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — index types, including B-tree, GIN, GiST, and partial indexes.
- [MySQL reference manual](https://dev.mysql.com/doc/) — index types, composite indexes, and full-text indexes.
- [SQLite documentation](https://www.sqlite.org/docs.html) — indexes, including partial and expression indexes.

## Required Workflow

1. List the queries the index must serve, with their `WHERE`, `JOIN`, and `ORDER BY` columns, and how often each runs.
2. Check the current plan with `EXPLAIN` to confirm the query scans or sorts where an index would help.
3. Choose the index type: B-tree by default; GIN for JSONB and array containment on PostgreSQL; full-text for text search; GiST for geometric or range data where the engine supports it.
4. Order composite index columns: equality columns first, then sort columns, then range columns (the ESR guideline).
5. Consider a partial index when the query always filters on the same condition (for example only active rows), and a covering index when the query needs only a few columns.
6. Name the index clearly (`<table>_<columns>_idx`) and create it with the non-blocking form where the engine supports it (`CREATE INDEX CONCURRENTLY` on PostgreSQL; online DDL on MySQL).
7. Verify with `EXPLAIN` that the query now uses the index on representative data.
8. Measure the effect: before-and-after timing on the target query, and a check that write performance did not regress.
9. Review the index set periodically: drop indexes that usage statistics show are never used, and merge overlapping indexes.
10. Record the reason for each non-obvious index (which query it serves) in the migration or schema comment.

## Implementation Standards

- Every foreign key column that is joined or filtered on has an index, unless the table is tiny.
- Composite index column order follows ESR: equality, sort, range.
- A unique index backs every unique business rule; a plain index is not a uniqueness guarantee.
- Partial indexes include the predicate in their definition and only serve queries whose `WHERE` matches that predicate.
- Covering indexes include only the columns the query needs; a covering index that includes every column is a second copy of the table.
- Index names are unique within the schema and describe the table and columns.
- Indexes are created through versioned migrations, with the non-blocking form on production-sized tables.
- Do not index every column: each index costs write time, storage, and planner time.
- Expression indexes (indexing `lower(email)` or a JSONB path) are used only when the query uses exactly that expression.
- Multi-column indexes are preferred over several single-column indexes when queries filter on the same columns together.

## Best Practices

- Build indexes from the slow-query log and statement statistics, not from guessing which columns "might" be filtered.
- One composite index can serve several queries whose leading columns match; check overlap before adding another.
- Use partial indexes for skewed data: an index on the 5% of rows that are active is smaller and faster than an index on all rows.
- Use covering indexes for hot read queries that need only a few columns.
- On PostgreSQL, use `CREATE INDEX CONCURRENTLY` for production tables so writes are not blocked; note it cannot run inside a transaction block.
- Monitor index bloat and rebuild indexes that have grown far beyond their live size, during a maintenance window.
- Re-check index usage after application changes: a query that stopped running leaves its index behind as pure cost.

## Security Considerations

- Indexes do not change access control: an index on a sensitive column does not expose it, but do not rely on the absence of an index to hide data.
- Index definitions can reveal schema details in logs and error messages; treat migration files with the same care as other schema artifacts.
- Creating an index on a production table can lock writes (without the concurrent form); schedule it and confirm the non-blocking form is used.
- No additional security concerns are specific to indexing beyond the general database rules in `database-security`.

## Performance Considerations

- Every index slows inserts, updates, and deletes on the table, because each index must be maintained. The cost grows with the number of indexes.
- A composite index is larger than a single-column index; keep indexed columns narrow (prefer integer keys over long strings).
- Index-only scans (covering indexes) avoid heap fetches and are the fastest read path for eligible queries.
- Very wide indexes and indexes on low-cardinality columns (a boolean with two values) rarely pay for themselves.
- Index maintenance competes with queries for I/O; creating several large indexes at once on a busy table can degrade the whole database.
- The planner chooses based on statistics: keep statistics current (`ANALYZE`) so the planner picks the index when it should.

## Common Mistakes

- Indexing every column "just in case" — slows writes and wastes storage; index proven patterns.
- Wrong composite order — a range column first prevents the index from serving the equality columns after it; use ESR order.
- Creating a redundant index — an index on `(a, b)` already serves queries on `(a)`; a separate index on `(a)` is redundant.
- Forgetting the index on a foreign key — joins and deletes on the parent table scan the child table.
- Expecting an index to help a leading-wildcard `LIKE '%term%'` — B-tree indexes cannot serve it; use full-text or trigram indexes.
- Creating an index inside a transaction on PostgreSQL with `CONCURRENTLY` — it is not allowed; run it outside a transaction.
- Never reviewing index usage — unused indexes accumulate and silently tax every write.

## Examples

```sql
-- Example: composite index following ESR order — equality on author_id,
-- then sort on created_at.
CREATE INDEX CONCURRENTLY idx_books_author_created
  ON books (author_id, created_at DESC);
```

```sql
-- Example: partial index for the common case of active rows only.
CREATE INDEX CONCURRENTLY idx_orders_active_customer
  ON orders (customer_id)
  WHERE status = 'active';
```

```sql
-- Example: covering index — the query's columns are all in the index.
-- PostgreSQL syntax (INCLUDE needs PostgreSQL 11+); MySQL has no
-- INCLUDE clause — include extra columns in the index key list instead.
CREATE INDEX CONCURRENTLY idx_books_author_title
  ON books (author_id) INCLUDE (title, price_cents);

-- Verify the query uses it:
EXPLAIN (ANALYZE, BUFFERS)
SELECT title, price_cents FROM books WHERE author_id = $1;
```

```sql
-- Example: unique index enforcing a business rule.
CREATE UNIQUE INDEX idx_users_email ON users (email);
```

## Validation Checklist

- [ ] Each new index serves a named query, and the query's plan was checked before and after.
- [ ] Composite index columns follow ESR order (equality, sort, range).
- [ ] Foreign keys that are joined or filtered on are indexed.
- [ ] Unique business rules use unique indexes, not plain indexes.
- [ ] The index was created with the non-blocking form on production-sized tables.
- [ ] The query's timing improved on representative data, and write performance was considered.
- [ ] No redundant index was added that an existing composite index already covers.

## Expected Deliverables

- Migration files creating (or dropping) the indexes, with clear names.
- Before-and-after `EXPLAIN` output for the queries each index serves.
- A note naming the query each index serves, and any index removed as unused or redundant.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — index types and `CREATE INDEX`.
- [MySQL reference manual](https://dev.mysql.com/doc/) — index types and optimization.
- [SQLite documentation](https://www.sqlite.org/docs.html) — indexes and query planning.
- Related skills in this repository: `sql-optimization`, `database-design`, `postgresql`, `mysql`, `sqlite`, `migrations`.
