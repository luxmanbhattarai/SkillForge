---
name: transactions
description: >
  Use database transactions correctly: ACID guarantees, isolation levels,
  atomic multi-statement writes, locking, and deadlocks. Use when several
  writes must succeed or fail together, when choosing an isolation level,
  when debugging lost updates or deadlocks, or when reasoning about
  concurrent access. Trigger keywords: transaction, ACID, isolation level,
  atomic, rollback, commit, deadlock, locking, concurrency.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Transactions

## Purpose

This skill covers correct transaction use: keeping multi-statement writes atomic, choosing the isolation level that matches the consistency the domain needs, and handling locking and deadlocks without turning the database into a bottleneck. Transactions are the database's guarantee that a group of changes happens as one unit — or not at all.

## When to Use

- Several writes must succeed or fail together (an order and its items, a transfer's debit and credit).
- Choosing an isolation level for a workload with concurrent readers and writers.
- Debugging lost updates, phantom reads, or inconsistent reports.
- Debugging deadlocks or lock waits.
- Deciding where a transaction boundary belongs in application code.
- Reviewing code that mixes database writes with external calls (HTTP, queues, files).

## When Not to Use

- When the task is only about schema design — use `database-design`.
- When the task is only about query speed — use `sql-optimization`.
- When the task is only about connection management — use `connection-pooling`.
- When the task is only about schema changes — use `migrations`.
- When the database is MongoDB and the question is MongoDB-specific multi-document transactions — use `mongodb` alongside this skill.

## Prerequisites

- Knowledge of the target engine's transaction syntax and default isolation level. The defaults differ by engine: PostgreSQL defaults to READ COMMITTED, MySQL/InnoDB defaults to REPEATABLE READ, and SQLite is effectively SERIALIZABLE (one writer at a time). Never assume the default is READ COMMITTED.
- Supported versions: PostgreSQL 15–19, MySQL 8.4/9.7 LTS, SQLite 3.51 (see the engine skills for version detail).
- The list of operations that must be atomic, and what "consistent" means for the domain (for example: an order is never created without its items).
- Access to run the workload against a test database with concurrent clients, to observe locking behaviour.
- Basic SQL knowledge: `BEGIN`, `COMMIT`, `ROLLBACK`, and `SELECT ... FOR UPDATE`.

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — transaction isolation, locking, and explicit locking.
- [MySQL reference manual](https://dev.mysql.com/doc/) — InnoDB locking and transaction isolation levels.
- [SQLite documentation](https://www.sqlite.org/docs.html) — transactions and locking.

## Required Workflow

1. Identify the unit of work: the exact set of statements that must succeed or fail together, and no more.
2. Draw the transaction boundary around that unit only: start the transaction as late as possible and commit as early as possible.
3. Choose the isolation level deliberately: the engine default is right for most work — PostgreSQL's default is READ COMMITTED, MySQL/InnoDB's is REPEATABLE READ, SQLite's is effectively SERIALIZABLE. Use a stricter level only for a named consistency requirement, and document why.
4. Inside the transaction, perform only database work: no HTTP calls, no file I/O, no waiting on user input, no sleeping.
5. Acquire locks in a consistent order across all code paths that touch the same tables, to avoid deadlocks.
6. Use `SELECT ... FOR UPDATE` when a read must reserve a row for an update in the same transaction.
7. On any error, roll back the whole transaction; never commit a partial unit of work.
8. Retry a transaction that fails with a serialization or deadlock error, with a bounded number of retries and a backoff — these failures are expected under concurrency and are safe to retry only if the unit of work is idempotent or has not yet committed.
9. Verify with a concurrency test: run the same unit of work from two clients at once and confirm the result is correct (no lost update, no double booking, no negative balance).
10. Keep the transaction short in production: measure its duration and investigate any transaction that routinely runs long.

## Implementation Standards

- Every multi-statement unit of work runs in an explicit transaction; implicit autocommit is for single statements only.
- Transactions contain database work only: no network calls, no file I/O, no user interaction inside the boundary.
- The isolation level is the engine default unless a documented reason requires otherwise; stricter levels are a deliberate, reviewed choice.
- Lock acquisition order is consistent across the codebase for any tables that are locked together.
- `SELECT ... FOR UPDATE` is used when a read-then-write must not race with another writer.
- Errors inside a transaction always roll back; a commit after an error is a bug.
- Retries on serialization or deadlock errors are bounded (a small fixed number) with backoff, and only for transactions that have not committed.
- Long-running transactions are treated as defects: investigate and shorten them.
- Savepoints are used only when part of a transaction genuinely needs independent rollback; they are not a substitute for a correct boundary.
- Application code never relies on uncommitted data from another transaction.

## Best Practices

- Make the unit of work as small as the domain allows: a smaller transaction holds fewer locks for less time.
- Prefer a single statement with a conditional update (for example `UPDATE ... WHERE stock >= 1`) over a read-then-write transaction when the logic fits — the database does the check atomically.
- Prefer optimistic concurrency (a version column checked on update) for low-contention updates, and pessimistic locking (`FOR UPDATE`) for high-contention ones.
- Use idempotency keys for operations that may be retried by a client, so a retried request does not create a duplicate.
- Log transaction failures with the error type so deadlocks and serialization failures are visible in aggregate, not just as user-facing errors.
- Design for retry: a transaction that cannot be safely retried (because it already sent an email, for example) must not contain the side effect — send it after commit.
- Test concurrency explicitly: single-threaded tests cannot catch lost updates or deadlocks.

## Security Considerations

- A transaction does not change authorization: every statement inside it must still respect tenant and permission filters.
- Do not hold a transaction open while waiting on an external service: it holds locks that block other users and can be exploited to deny service.
- Roll back on error, including authorization failures: a partial commit after a failed permission check can leak or corrupt data.
- Avoid logging the contents of a rolled-back transaction as if it happened; rolled-back data never existed.

## Performance Considerations

- Long transactions hold locks and, on PostgreSQL, block vacuuming — which degrades the whole database over time.
- Higher isolation levels cost more: serializable transactions retry more often and hold more locks; use them only where the consistency requirement justifies it.
- Lock contention grows with transaction length and with the number of rows locked; keep both small.
- Deadlocks are usually a symptom of inconsistent lock order or over-wide transactions; fix the order and the boundary rather than increasing timeouts.
- Row-level locks are cheaper than table locks; avoid statements that escalate to table locks (such as unindexed updates that scan) inside transactions.
- Batch work in short transactions rather than one giant transaction: a single transaction for a million-row backfill locks far more than batched transactions.

## Common Mistakes

- Holding a transaction open across a network call — blocks other writers and vacuum for the duration of the call.
- Read-then-write without locking — two concurrent readers both see the old value and both write, losing one update; use `FOR UPDATE` or a conditional update.
- Retrying a transaction that already committed — creates duplicates; retry only when the failure is known to be before commit.
- Using the strictest isolation level "to be safe" — costs performance and causes retries without a named requirement; use the default unless a reason exists.
- Catching an error inside a transaction and committing anyway — commits a partial unit of work; roll back on any error.
- Inconsistent lock order across code paths — the classic deadlock cause; always lock tables and rows in the same order.
- Putting side effects (email, queue messages) inside a transaction — they cannot be rolled back; perform them after commit.

## Examples

```sql
-- Example: atomic transfer — debit and credit succeed or fail together.
BEGIN;
UPDATE accounts SET balance_cents = balance_cents - 5000 WHERE id = $1 AND balance_cents >= 5000;
UPDATE accounts SET balance_cents = balance_cents + 5000 WHERE id = $2;
COMMIT;
```

```sql
-- Example: reserve a row for update so two writers cannot both book it.
BEGIN;
SELECT id, status FROM seats WHERE id = $1 FOR UPDATE;
-- Application checks status, then:
UPDATE seats SET status = 'booked' WHERE id = $1;
COMMIT;
```

```ts
// Example: retry only on a serialization or deadlock failure, bounded.
async function runWithRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt === attempts) throw error;
      await sleep(50 * attempt);
    }
  }
  throw new Error("unreachable");
}
```

## Validation Checklist

- [ ] The unit of work is identified and the transaction covers exactly that unit.
- [ ] The transaction contains database work only — no network calls, file I/O, or user input.
- [ ] The isolation level is a deliberate choice, documented if it is not the default.
- [ ] Lock acquisition order is consistent across code paths that touch the same tables.
- [ ] Errors roll back the whole transaction; no partial commit is possible.
- [ ] Retries are bounded and only retry failures known to be before commit.
- [ ] A concurrency test with two simultaneous clients confirms correct results.
- [ ] Side effects (email, queue messages) happen after commit, not inside the transaction.

## Expected Deliverables

- The transaction code with the boundary, isolation level, and error handling explicit.
- A note on the consistency requirement the transaction enforces and why the chosen isolation level satisfies it.
- A concurrency test or a description of the concurrent scenario that was verified.
- Notes on any retry logic and which errors are considered retryable.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — transaction isolation and locking.
- [MySQL reference manual](https://dev.mysql.com/doc/) — InnoDB locking and isolation levels.
- [SQLite documentation](https://www.sqlite.org/docs.html) — transactions and locking.
- Related skills in this repository: `database-design`, `postgresql`, `mysql`, `sqlite`, `mongodb`, `connection-pooling`, `prisma`, `drizzle`.
