---
name: clickhouse
description: >
  Build and operate ClickHouse for real-time analytics: MergeTree table
  engines, data modeling with partitioning and ordering keys, data skipping
  indexes and projections, queries and aggregations, materialized views,
  replication with ReplicatedMergeTree and Keeper, sharding with Distributed
  tables, backups, security (users, roles, quotas, row policies), monitoring,
  performance tuning, and production deployment. Trigger keywords:
  clickhouse, mergetree, olap, analytics, columnar, distributed table,
  materialized view, keeper, partition, order by key, skipping index.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# ClickHouse

## Purpose

This skill guides the design, implementation, and operation of ClickHouse for online analytical processing (OLAP): modeling tables so queries read only the data they need, writing aggregations that exploit the columnar engine, and running a replicated, sharded deployment that stays fast as data grows. It produces analytics that answer in seconds over billions of rows, on a cluster an operator can reason about.

## When to Use

- Building real-time analytics, product metrics, log analytics, or observability storage over large append-mostly datasets.
- Designing ClickHouse tables: choosing a MergeTree engine, partitioning, ordering keys, and skipping indexes.
- Writing and tuning analytical SQL: aggregations, window functions, joins, and time-series queries.
- Creating materialized views and projections for pre-aggregated query paths.
- Setting up replication (ReplicatedMergeTree + Keeper), sharding (Distributed tables), or backups.
- Securing a deployment (users, roles, quotas, row policies, TLS) or diagnosing slow queries and merge pressure.
- Migrating an analytical workload from a row store or a data warehouse to ClickHouse.

## When Not to Use

- When the workload is transactional with row-level updates, deletes, and ACID guarantees — use `postgresql` or `mysql`, and model the schema with `database-design`. (ClickHouse supports standard SQL `UPDATE` at scale since 25.7 via a patch-part mechanism, but it is still an analytical engine, not an OLTP store.)
- When the workload is full-text search with relevance ranking — use `elasticsearch` or `opensearch`.
- When the data fits in memory and the access pattern is key lookup, ranking, or queues — use `redis`.
- When the dataset is small (under ~100 million rows) and a single PostgreSQL instance answers queries fast enough — the operational cost of a ClickHouse cluster is not justified.
- When the task is only about general SQL query tuning on a relational engine — use `sql-optimization`.

## Prerequisites

- A running ClickHouse server (self-managed or ClickHouse Cloud) with `clickhouse-client` or HTTP access, and Keeper (or ZooKeeper) for any replicated deployment.
- Knowledge of the analytical questions the data must answer, the expected ingest rate, and the retention period.
- Supported versions: ClickHouse 26.10 is the current stable release (26.10.8.34, released 2026-11-20). ClickHouse ships monthly releases with calendar versioning (`YY.M.Patch.Build`); the long-term support (LTS) lines are 26.8 (supported until 2027-08-27) and 26.3 (supported until 2027-03-26). New production deployments should use the latest stable or the latest LTS; do not stay on an expired monthly line.
- The native protocol ports are 9000 (plain) and 9440 (TLS); the HTTP interface listens on 8123 (plain) and 8443 (TLS) by default. Confirm the ports in the server configuration before connecting.
- ClickHouse is Apache 2.0 licensed open source; ClickHouse Cloud is the vendor-managed offering.

## Official Documentation

- [ClickHouse documentation](https://clickhouse.com/docs/) — the documentation home (relaunched on Mintlify in 2026, with a docs MCP server for agent access).
- [ClickHouse documentation index (llms.txt)](https://clickhouse.com/docs/llms.txt) — a machine-readable index of the full documentation, useful for looking up a specific page.
- [2025 changelog](https://clickhouse.com/docs/whats-new/changelog/2025/) — per-release changes, breaking changes, and new features, with links to the current changelog.
- [ClickHouse 26.10 release notes](https://clickhouse.com/blog/clickhouse-release-26-10) — the current stable release: function composition, flexible JOIN conditions, faster GROUP BY, disk spilling for IN subqueries.
- [ClickHouse client](https://clickhouse.com/docs/concepts/features/interfaces/client) — the native command-line client, connection options, and interactive mode.
- [INSERT INTO reference](https://clickhouse.com/docs/reference/statements/insert-into) — insert syntax, formats, and constraints.

## Required Workflow

1. Define the analytical questions first: which columns are filtered, grouped, and aggregated, and at what granularity results are read. The answers decide the ordering key.
2. Choose the table engine from the write pattern: `MergeTree` for append-mostly data, `ReplacingMergeTree` for upserts with a version column, `SummingMergeTree` / `AggregatingMergeTree` for pre-aggregation, `CollapsingMergeTree` for state that changes by sign.
3. Design the ordering key (`ORDER BY`) from the most common filters, most selective first, and the partition key (`PARTITION BY`) from the retention unit (usually month for time-series data). Record why each key was chosen.
4. Choose precise column types: `LowCardinality(String)` for low-cardinality strings, `DateTime64` where sub-second precision matters, `Decimal` for money, and the smallest integer that fits.
5. Create the table on one node, load a representative sample, and verify the plan with `EXPLAIN`: check that filters prune granules and partitions (rows read should be a small fraction of rows stored).
6. Add data skipping indexes only for proven slow filters (`minmax`, `set`, `bloom_filter`, `tokenbf_v1`), and verify each one reduces rows read.
7. For production, create the replicated form (`ReplicatedMergeTree`) with Keeper, and a `Distributed` table over the shards for cluster-wide queries.
8. Set up ingestion as large batches (thousands of rows per insert, or async inserts) — never row-by-row inserts in a loop.
9. Create materialized views for the aggregations the dashboards actually run, so the hot path reads pre-aggregated parts.
10. Configure users, roles, quotas, and TLS; set up backups (`BACKUP` to S3 or disk) and a restore drill; enable monitoring (`system.query_log`, merge/part metrics, the Prometheus endpoint) before launch.

## Implementation Standards

- Every MergeTree table has an explicit `ORDER BY` key chosen from the query patterns; the ordering key is the primary index, and a wrong one cannot be fixed without rewriting the table.
- Partition by a time unit that matches retention (`toYYYYMM(event_time)` for monthly retention drops), and keep the partition count modest — hundreds of partitions, not tens of thousands. Dropping a partition is the cheap way to expire data.
- Filter columns go in the ordering key; aggregation columns do not. A query that filters on a column absent from the ordering key scans every granule.
- Use `ReplacingMergeTree` with a version column for upserts, and remember that deduplication happens at merge time: a plain `SELECT` can return duplicates until a merge runs, so use `FINAL` or aggregate with `argMax` when exactness matters.
- Inserts are batched: thousands of rows per insert at minimum, or `async_insert` for high-frequency small writes. Each insert creates a part; thousands of tiny parts cause merge storms.
- `SELECT` queries that aggregate over the whole table use the ordering key and, where available, a projection or materialized view; a full scan of billions of rows for a dashboard tile is a design failure.
- Distributed tables query the local tables on every shard; the sharding key should distribute rows evenly and match the most common grouping so partial aggregation happens per shard.
- TTLs (`TTL event_time + INTERVAL 90 DAY`) expire old data automatically; prefer TTL or partition drops over `DELETE` statements, which are mutations.
- Mutations (`ALTER TABLE ... UPDATE/DELETE`) rewrite parts and are expensive; use them for rare corrections, not as a routine write path. Standard SQL `UPDATE` is supported at scale since 25.7 through a lightweight patch-part mechanism — verify its behaviour on your version before relying on it.
- DDL for replicated tables goes through the cluster (ON CLUSTER) or a migration tool that applies the same DDL to every replica; never hand-edit a schema on one replica.
- Configuration lives in files under version control (or in the operator/managed-service settings), never as ad-hoc `SET` statements that vanish on restart.

### Testing Strategy

- Test queries against a small representative dataset first, and use `EXPLAIN` to check granules read before running a new query pattern at full scale — a query that filters on a column outside the ordering key scans everything.
- Test `ReplacingMergeTree` behavior explicitly: a plain `SELECT` can return duplicates until a merge runs, so verify that `FINAL` or `argMax` gives the exact result the feature needs.
- Test inserts at production rate in staging: thousands of tiny parts cause merge storms, so verify batch sizes or `async_insert` keep part counts healthy.
- Test TTLs and partition drops on staging data before relying on them for retention, and test distributed queries on a multi-shard test cluster so sharding-key skew shows up before production.

## Best Practices

- Model wide, denormalized tables: joins are supported and improving (25.12 added the DPsize join-reordering algorithm for INNER JOINs; 26.10 adds JOINs with arbitrary `ON` conditions), but a single denormalized fact table is usually faster than joining at query time.
- Use `LowCardinality` for string columns with few distinct values (status, country, event type) — it cuts storage and speeds up filtering and grouping.
- Use codecs deliberately: `ZSTD(1)` is the default and a good balance; `Delta`/`DoubleDelta` suit monotonic series (timestamps, counters); `Gorilla` suits floating-point series.
- Add projections for the two or three query shapes that dominate the workload; a projection is a hidden pre-aggregated copy that the planner uses automatically. Verify with `EXPLAIN` that the planner picks it up.
- Use `PREWHERE` for the most selective filter when a query also filters on a second column: ClickHouse reads only the `PREWHERE` columns first, then the rest for matching rows.
- Use approximate aggregation where exactness is not required: `uniq` (HyperLogLog) instead of `uniqExact`, and `quantiles` instead of exact medians, for dashboard-scale queries.
- Monitor merges: `system.merges` and `system.parts` show merge pressure. A growing count of unmerged parts means inserts are too small or merges cannot keep up — fix the insert size first.
- Keep a staging ClickHouse with production-like data volume for query tuning; a query plan that is fast on 1 million rows can be catastrophic on 1 billion.
- Use `clickhouse dig` (`chdig`, built into the binary) for a live top-like view of queries, merges, and Keeper state during incidents.

## Security Considerations

- Never expose ClickHouse ports (8123/8443/9000/9440) to the internet. Bind to a private network, firewall the ports, and use TLS (`tcp_port_secure`, `https_port`) for any connection that crosses a trust boundary.
- The `default` user has no password in a fresh install: set a strong password or, better, create per-application users with `CREATE USER ... IDENTIFIED WITH sha256_password` and grant only what each needs. Disable the `default` user for remote access.
- Use roles and grants (`GRANT SELECT ON db.table TO analyst`) rather than sharing one privileged account; grant `SELECT` on specific tables, not `ALL ON *.*`.
- Use row policies (`CREATE ROW POLICY`) where different users must see different subsets of a table, and quotas (`CREATE QUOTA`) to cap queries, execution time, and (since 26.10) inserted rows per user.
- Store credentials for external storage (S3 keys, database passwords) in named collections or the server configuration, never inline in queries — inline credentials land in `system.query_log`.
- Enable access-control logging and review `system.query_log` for unusual access patterns; a query log that nobody reads is not a control.
- Keep the server patched: monthly releases include security fixes, and expired monthly lines stop receiving them. LTS lines receive fixes for their support window.

## Performance Considerations

- The ordering key decides everything: a query that filters on the first ordering-key column prunes granules and reads a fraction of the data; a query that filters on a non-key column scans the whole table. Design the key from the query log, not from the schema diagram.
- Partition pruning: a `WHERE` clause on the partition expression skips whole partitions. Queries that never filter on time should still filter on the partition column where possible.
- Memory: analytical queries can use a lot of RAM (hash tables for GROUP BY and JOIN). Set `max_memory_usage` per user or per query, and `max_bytes_before_external_group_by` / `max_bytes_before_external_sort` so large operations spill to disk instead of failing. 26.10 also speeds up GROUP BY queries (dynamic filtering extended to GROUP BY, with granule skipping through the primary index).
- Concurrency: ClickHouse parallelizes one query across cores; many concurrent heavy queries contend for CPU and memory. Use workload scheduling and quotas to protect interactive queries from batch jobs.
- Inserts: a single insert of 100k rows is far cheaper than 100k inserts of one row. Use `async_insert` (with `async_insert_busy_timeout_ms`) for streaming ingest, or a buffer table for bursty producers.
- Merges are background work that competes with queries: monitor `system.merges`, keep part counts low with large inserts, and avoid `OPTIMIZE TABLE ... FINAL` on large tables in production hours.
- Query cache: the query result cache (and, in 26.10, the experimental columns cache) helps repeated dashboard queries; enable it deliberately and measure the hit rate rather than assuming it helps.
- Use `EXPLAIN PLAN`, `EXPLAIN PIPELINE`, and `system.query_log` (columns `read_rows`, `read_bytes`, `memory_usage`, `query_duration_ms`) to find the real cost of a slow query before changing the schema.

## Common Mistakes

- Choosing the ordering key from the schema instead of the queries — a key on `(id, ...)` when every query filters on `event_time` means every query scans everything.
- Inserting row-by-row — each insert creates a part; thousands of tiny parts cause merge storms and slow queries.
- Over-partitioning — partitioning by day on a table kept for years creates thousands of partitions, each with its own parts and overhead; partition by month unless daily drops are required.
- Using `ReplacingMergeTree` without understanding merge-time deduplication — a plain `SELECT` can return duplicates; use `FINAL` or `argMax` for exact results.
- Running `SELECT` with `FINAL` everywhere — it forces on-the-fly deduplication and is slow on large tables; use it only where exactness requires it.
- Forgetting that `Nullable` columns cost performance — prefer a default value (`''`, `0`, a sentinel date) over `Nullable` unless absence is genuinely meaningful.
- Storing high-cardinality strings without `LowCardinality` — wastes storage and slows grouping.
- Treating a single node as production — no replica means any disk failure is data loss; use `ReplicatedMergeTree` with Keeper.
- Putting secrets in queries — S3 keys and passwords in `BACKUP` or table-function calls land in `system.query_log`; use named collections.
- Upgrading across many versions at once — read the changelog for each release in between; breaking changes (such as the removal of the legacy query analyzer in 26.10) can break mixed-version clusters.

## Examples

```sql
-- Example: events table with a monthly partition and an ordering key
-- chosen from the query patterns (tenant first, then time).
CREATE TABLE analytics.events
(
  event_time DateTime64(3),
  tenant_id UInt32,
  user_id UInt64,
  event_type LowCardinality(String),
  properties String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_time)
TTL event_time + INTERVAL 180 DAY;
```

```sql
-- Example: the same table replicated (Keeper coordinates the replicas;
-- {shard} and {replica} are macros defined per server).
CREATE TABLE analytics.events
(
  event_time DateTime64(3),
  tenant_id UInt32,
  user_id UInt64,
  event_type LowCardinality(String),
  properties String
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_time);
```

```sql
-- Example: Distributed table over the shards for cluster-wide queries.
CREATE TABLE analytics.events_dist
AS analytics.events
ENGINE = Distributed('analytics_cluster', 'analytics', 'events', tenant_id);
```

```sql
-- Example: materialized view pre-aggregating daily active users per tenant.
CREATE MATERIALIZED VIEW analytics.daily_active_users
ENGINE = MergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day)
AS
SELECT
  toDate(event_time) AS day,
  tenant_id,
  uniq(user_id) AS active_users
FROM analytics.events
GROUP BY day, tenant_id;
```

```sql
-- Example: data skipping index for a proven slow filter, plus a
-- projection for the dominant dashboard query shape.
ALTER TABLE analytics.events
  ADD INDEX idx_event_type event_type TYPE set(10) GRANULARITY 1;

ALTER TABLE analytics.events
  ADD PROJECTION by_tenant_day
  (
    SELECT tenant_id, toDate(event_time) AS day, count() AS c
    GROUP BY tenant_id, day
  );
```

```sql
-- Example: backup to an S3-backed disk and restore. The disk is configured
-- in server config (credentials live there), so no secrets appear in the
-- query — inline S3 keys would land in system.query_log. The S3-endpoint
-- form (BACKUP ... TO S3(...)) accepts a named collection for the same
-- reason; never put keys inline.
BACKUP TABLE analytics.events
  TO Disk('s3_backups', 'events/');

RESTORE TABLE analytics.events
  FROM Disk('s3_backups', 'events/');
```

```sql
-- Example: least-privilege user with a quota (26.10 adds a written_rows
-- counter so ingestion can be capped by row count).
CREATE USER analyst IDENTIFIED WITH sha256_password BY '${ANALYST_PASSWORD}';
GRANT SELECT ON analytics.* TO analyst;
CREATE QUOTA analyst_quota FOR INTERVAL 1 HOUR MAX queries = 1000 TO analyst;
```

```sql
-- Example: diagnose a slow query from the query log.
SELECT
  query,
  read_rows,
  read_bytes,
  memory_usage,
  query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## Validation Checklist

- [ ] The ordering key is chosen from the actual query patterns, and `EXPLAIN` shows granule/partition pruning on the hot queries.
- [ ] Partitioning matches the retention unit, and old data expires via TTL or partition drops.
- [ ] Column types are precise (`LowCardinality` for low-cardinality strings, `Decimal` for money, the smallest integer that fits).
- [ ] Ingestion is batched (thousands of rows per insert or async inserts); part counts stay low under load.
- [ ] Production tables use `ReplicatedMergeTree` with Keeper, and a `Distributed` table fronts cluster-wide queries.
- [ ] Skipping indexes and projections exist only where a measured slow query justified them, and `EXPLAIN` confirms they are used.
- [ ] Users, roles, quotas, and row policies follow least privilege; the `default` user is locked down and TLS is enabled.
- [ ] A backup exists (`BACKUP` to S3 or disk) and a restore drill has recovered a table successfully.
- [ ] Monitoring covers `system.query_log`, merge/part counts, disk usage, and replication lag, with alerts configured.
- [ ] Load tests ran on production-like data volume, and the tuning decisions are recorded.

## Expected Deliverables

- The table design: engine choice, ordering and partition keys with reasoning, column types, TTLs, and skipping indexes.
- The cluster topology: shards, replicas, Keeper ensemble, and the `Distributed` table layout.
- The ingestion design: batch sizes or async-insert settings, and the materialized views / projections for the hot query paths.
- The security setup: users, roles, quotas, row policies, and TLS, with credentials in a secret manager.
- Backup configuration and the restore drill result, plus monitoring setup and load-test results.

## References

- [ClickHouse documentation](https://clickhouse.com/docs/) — documentation home, with a docs MCP server for agent access.
- [ClickHouse documentation index (llms.txt)](https://clickhouse.com/docs/llms.txt) — machine-readable index of the full documentation.
- [ClickHouse 26.10 release notes](https://clickhouse.com/blog/clickhouse-release-26-10) — the current stable release.
- [2025 changelog](https://clickhouse.com/docs/whats-new/changelog/2025/) — per-release changes and breaking changes.
- [ClickHouse client](https://clickhouse.com/docs/concepts/features/interfaces/client) — the native command-line client.
- Related skills in this repository: `postgresql`, `sql-optimization`, `indexing`, `database-design`, `backup-recovery`, `observability`.
