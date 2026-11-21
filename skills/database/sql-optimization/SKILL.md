---
name: sql-optimization
description: >
  Diagnose and fix slow SQL queries: reading execution plans, rewriting
  queries, removing N+1 patterns, and reducing I/O. Use when a query is
  slow, a page or endpoint times out, a report takes too long, or a query
  needs review before shipping. Trigger keywords: slow query, query
  optimization, EXPLAIN, execution plan, N+1, query performance, query tuning.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SQL Optimization

## Purpose

This skill is a systematic method for making slow SQL fast: reproduce the slowness on representative data, read the execution plan to find the real cost, fix the query or the access path, and verify the improvement with measurements — not guesses. It covers query rewrites; index design itself is covered by `indexing`.

## When to Use

- A query, endpoint, or report is slow and the database is the bottleneck.
- Reviewing a new or changed query before it ships.
- A query that was fast on small data became slow as the table grew.
- Diagnosing N+1 query patterns in application code.
- Reducing database load, I/O, or connection time on a busy system.
- Choosing between equivalent ways to write a query.

## When Not to Use

- When the bottleneck is not the database (application code, network, rendering) — profile the application first.
- When the fix is purely an index change with no query rewrite — use `indexing`.
- When the schema itself is the problem (wrong types, missing constraints, bad modeling) — use `database-design`.
- When the task is connection exhaustion rather than query speed — use `connection-pooling`.
- When the database is MongoDB — use `mongodb` for its query and pipeline guidance.

## Prerequisites

- Access to the database with permission to run `EXPLAIN` (and `ANALYZE` variants) on the slow query.
- Representative data: a copy of production-like data, or at least the same order of magnitude of rows.
- The exact slow query text and the conditions under which it is slow (parameters, time of day, concurrent load).
- Knowledge of which database engine is in use, since plan output differs per engine. Supported versions as of 2026-11-20: PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51 (see the engine skills for version detail).

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — `EXPLAIN` reference and performance guidance.
- [MySQL reference manual](https://dev.mysql.com/doc/) — `EXPLAIN` output format and optimization guidance.
- [SQLite documentation](https://www.sqlite.org/docs.html) — `EXPLAIN QUERY PLAN` reference.

## Required Workflow

1. Reproduce the slowness: run the query with its real parameters against representative data and record the elapsed time.
2. Get the execution plan: `EXPLAIN (ANALYZE, BUFFERS)` on PostgreSQL, `EXPLAIN ANALYZE` on MySQL where supported, or `EXPLAIN QUERY PLAN` on SQLite.
3. Read the plan from the most expensive node down: find full scans on large tables, large row counts passed between nodes, sorts without an index, and nested loops over large outer relations.
4. Check the row estimates against reality: if the planner expects 10 rows and finds 100,000, the statistics are stale — refresh them (`ANALYZE` / `ANALYZE TABLE`) and re-check.
5. Rewrite the query to remove the expensive pattern (see Implementation Standards), keeping the result identical; verify identical results on a test dataset.
6. Re-run the plan and the timing; keep the rewrite only if it measurably improves the plan or the elapsed time on representative data.
7. If the query is fine but the access path is not, add or change an index — see `indexing` — and re-verify.
8. If the slowness comes from the application issuing many queries (N+1), fix the application to issue one query instead of rewriting the single query.
9. Check the fix under concurrency: a query that is fast alone can still be slow under lock contention.
10. Record the before-and-after timing and plan summary with the change, so the next person knows what was measured.

## Implementation Standards

- Never optimize from intuition: measure first, change one thing, measure again.
- Read plans with real execution data (`ANALYZE`) when a query is actually slow; a plan without execution is a prediction, not evidence.
- Keep result sets small: `LIMIT` every list query, paginate large results, and fetch only the columns the caller needs.
- Filter early: apply `WHERE` conditions before joins where the logic allows, so joins process fewer rows.
- Prefer `EXISTS` over `IN (SELECT ...)` when testing for the presence of related rows.
- Avoid `SELECT DISTINCT` as a fix for duplicate rows from a bad join; fix the join or the grouping instead.
- Avoid functions on indexed columns in `WHERE` (for example `YEAR(created_at) = 2026`); rewrite as a range so the index can be used.
- Avoid `OR` across different columns when each side could use a different index; consider `UNION` of two indexed queries.
- Avoid leading-wildcard `LIKE '%term%'` on large tables; use full-text search or a trigram index where the engine supports it.
- Prefer set-based operations over row-by-row processing: one `UPDATE` beats a loop of updates, and bulk inserts beat one insert per row.

## Best Practices

- Optimize the hot queries first: the queries that run most often or cost the most in total, not the slowest single query in isolation.
- Use the database's slow-query log or statement statistics (`pg_stat_statements` on PostgreSQL) to find the real hot queries instead of guessing.
- Keep queries readable: a clever rewrite that no one understands will be "fixed" back into a slow query.
- Test with production-like data volumes; a query that is fast on 100 rows can be unusable on 10 million.
- Watch for the cliff: many queries are fast until a table outgrows memory or an index, then degrade suddenly. Test at the next order of magnitude.
- Cache results that are expensive and change rarely, at the application or database level, instead of recomputing them on every request.
- Re-check optimized queries after major data growth or schema changes; an optimization is a claim about the data, and data changes.

## Security Considerations

- Optimizing a query must not weaken its filters: a rewrite that drops a tenant or authorization condition is a data leak, not an optimization.
- Keep queries parameterized during rewrites; do not inline values to "help the planner" when the values come from users.
- Do not grant broad access to production data for tuning; use a sanitized copy where possible.
- Avoid logging full query text with parameter values in production logs; parameter values can contain personal data.

## Performance Considerations

- The biggest wins usually come from reducing rows scanned, rows returned, and round trips — in that order.
- A single query that scans a million rows is often worse than ten queries that each use an index.
- Sorting is expensive on large result sets: an index that provides the order avoids the sort.
- Lock contention can make a fast query slow: check for long transactions and lock waits when timings vary wildly.
- Connection overhead matters for many small queries: batching and pooling reduce it; see `connection-pooling`.
- `COUNT(*)` without a filter on a huge table is a scan on most engines; cache counts or use estimates where exactness is not required.

## Common Mistakes

- Optimizing without measuring — the "slow" query is often not the bottleneck; measure first.
- Adding an index for every slow query — sometimes the query is wrong (a bad join, a function on a column) and no index can save it.
- Reading a plan without `ANALYZE` — predicted row counts can be wildly wrong; execution data shows reality.
- Testing only on small data — the plan the database picks for 100 rows is not the plan it picks for 10 million.
- Fixing N+1 by caching the loop — the loop still runs; fetch the data in one query.
- Using `SELECT *` in a hot query — fetches columns nobody needs and can prevent a covering index from serving the query.
- Rewriting a query so it returns different results — verify identical results on a test dataset before and after.

## Examples

```sql
-- Example: function on an indexed column prevents index use.
-- Slow:
SELECT id FROM orders WHERE YEAR(created_at) = 2026;
-- Fast: a range the index can serve.
SELECT id FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```

```sql
-- Example: EXISTS instead of IN with a subquery, for a presence test.
SELECT id, name FROM authors a
WHERE EXISTS (SELECT 1 FROM books b WHERE b.author_id = a.id);
```

```sql
-- Example: read the plan with real execution data (PostgreSQL).
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM books WHERE author_id = $1 ORDER BY created_at DESC LIMIT 20;
```

```sql
-- Example: N+1 fixed by fetching in one query instead of a loop.
-- One query for all authors' books, instead of one query per author:
SELECT author_id, id, title FROM books WHERE author_id IN (SELECT id FROM authors WHERE country = $1);
```

## Validation Checklist

- [ ] The slow query was reproduced on representative data with a recorded baseline time.
- [ ] The execution plan was read with real execution data, and the expensive node was identified.
- [ ] The rewrite returns identical results to the original on a test dataset.
- [ ] The optimized query was re-measured on representative data and is measurably faster.
- [ ] No authorization or tenant filter was dropped or weakened in the rewrite.
- [ ] The fix does not rely on data volume staying small; it was considered at the next order of magnitude.
- [ ] Before-and-after timings and the plan summary are recorded with the change.

## Expected Deliverables

- The rewritten query (or application change for N+1), with the original preserved in the change description for comparison.
- Before-and-after execution plans and timings on representative data.
- A one-paragraph explanation of what was slow and why the rewrite fixes it.
- Any index change made alongside the rewrite, with its own verification.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — `EXPLAIN` and performance guidance.
- [MySQL reference manual](https://dev.mysql.com/doc/) — `EXPLAIN` output and optimization.
- [SQLite documentation](https://www.sqlite.org/docs.html) — `EXPLAIN QUERY PLAN`.
- Related skills in this repository: `indexing`, `database-design`, `postgresql`, `mysql`, `sqlite`, `transactions`, `connection-pooling`.
