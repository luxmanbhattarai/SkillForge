---
name: redis
description: >
  Use Redis as an in-memory data structure store: data modeling with strings,
  hashes, lists, sets, sorted sets, streams, JSON, and vector sets; commands,
  pipelining, transactions (MULTI/EXEC, WATCH), Lua scripts and Functions;
  pub/sub and streams; persistence (RDB/AOF), replication, Sentinel, and
  Cluster; eviction and caching patterns; AUTH/ACL/TLS security; monitoring
  and production deployment. Trigger keywords: redis, cache, sorted set,
  stream, pub/sub, sentinel, cluster, eviction, lua script, redis functions.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Redis

## Purpose

This skill guides the design, implementation, and operation of Redis as an in-memory data structure store: choosing the right data structure for each access pattern, writing correct atomic operations, and running a deployment that survives restarts, failovers, and traffic spikes. It produces Redis usage that is fast by design, safe under concurrency, and recoverable after failure.

## When to Use

- Adding a cache, session store, rate limiter, leaderboard, or job queue backed by Redis.
- Modeling data with Redis data structures (strings, hashes, lists, sets, sorted sets, streams, JSON, vector sets).
- Writing atomic multi-step operations with transactions, Lua scripts, or Redis Functions.
- Building event or message flows with pub/sub or streams and consumer groups.
- Setting up persistence (RDB/AOF), replication, Sentinel failover, or Cluster sharding.
- Choosing eviction policies, TTLs, and memory limits for a cache.
- Hardening a Redis deployment (AUTH, ACLs, TLS) or diagnosing latency and memory problems.

## When Not to Use

- When the data needs relational queries, joins, or complex ad-hoc filtering — use `postgresql` or `mysql`, and model the schema with `database-design`.
- When the workload is analytics over large historical datasets — use `clickhouse`.
- When full-text search is the primary need — use `elasticsearch` or `opensearch` (Redis Query Engine covers secondary-index search on Redis data, not a dedicated search engine).
- When the task is only about general caching strategy (cache-aside vs write-through, invalidation) — use `caching` first, then this skill for the Redis mechanics.
- When durability of every write is non-negotiable and the dataset exceeds RAM — Redis is the wrong primary store; use a disk-based database and Redis only as a cache.

## Prerequisites

- A running Redis server or a managed Redis service, plus `redis-cli` and a client library for the application language (redis-py, node-redis, Jedis/Lettuce, go-redis).
- Knowledge of the access patterns the workload needs: which keys are read, written, and scanned, and how often.
- An estimate of dataset size and growth, so memory limits and the persistence strategy can be set honestly.
- Supported versions: Redis 8.10 is the current stable line (8.10.3, released 2026-10-26); 8.8 and 8.6 also receive patches. Redis 8.0 reaches end of support on 2026-12-01 — do not start new deployments on 8.0. Redis 7.2 and earlier are BSD-licensed; 7.4 is available only under RSALv2/SSPLv1; Redis 8 and later are tri-licensed (RSALv2, SSPLv1, or AGPLv3, your choice).
- Redis 8 folds the former Redis Stack modules into the server: JSON, Time Series, probabilistic data types, the Query Engine, and Vector Sets are built in. The Array data structure and the `INCREX` rate limiter arrived in 8.8; compact hashes and the `BACKUP` command arrived in 8.10.

## Official Documentation

- [Redis command reference](https://redis.io/docs/latest/commands/) — every command, with syntax, complexity, and the version it appeared in; the 8.10 reference is the current one.
- [Redis programmability](https://redis.io/docs/latest/develop/programmability/) — Lua scripts (EVAL) and Redis Functions, including atomicity and read-only script rules.
- [Redis client connection URLs](https://redis.io/docs/latest/develop/clients/connection-urls/) — the `redis://` / `rediss://` URL format and how each client interprets it.
- [Multi-key operations](https://redis.io/docs/latest/develop/using-commands/multi-key-operations/) — which commands work across slots in Cluster mode and which need hash tags.
- [Redis 8.10 release notes](https://raw.githubusercontent.com/redis/redis/8.10/00-RELEASENOTES) — what changed in the current stable line.
- [Redis licenses](https://redis.io/legal/licenses/) — the tri-license terms for Redis 8 and later.

## Required Workflow

1. List the access patterns first: what is read, written, incremented, ranked, or streamed, and at what rate. Pick the data structure from the pattern, not from habit.
2. Design keys with a namespace prefix and a stable separator (`<domain>:<entity>:<id>`, for example `session:usr:42`), and decide a TTL for every key class at design time.
3. Choose the persistence mode before going live: RDB snapshots, AOF, or both — and state the acceptable data-loss window in writing (see Implementation Standards).
4. Decide the availability topology: single instance with a replica, Sentinel-managed failover, or Cluster sharding. Do not run a production cache with no replica.
5. Write the hot-path operations as single commands, pipelined batches, or one Lua script / Function where atomicity is required; never read-modify-write across a network round trip.
6. Set `maxmemory` and a `maxmemory-policy` that matches the workload (see Implementation Standards), and set a memory alert threshold below `maxmemory`.
7. Enable authentication and, where the network is not fully trusted, TLS. Create one ACL user per application with the minimum commands and key patterns it needs.
8. Configure monitoring before launch: `INFO` stats, slow log, latency tracking, replication lag, and memory usage, with alerts on each.
9. Load-test with representative data and key counts, including a failover drill (kill the primary, confirm Sentinel or Cluster promotes a replica) and a restart drill (confirm the dataset reloads from RDB/AOF within the recovery target).
10. Document the runbook: backup schedule, failover procedure, eviction behaviour under memory pressure, and the key-namespace inventory.

## Implementation Standards

- Every key has a TTL unless there is a written reason it must live forever; keys without TTLs are how a cache becomes an unbounded store.
- Key names use a namespace prefix and `:` separators; never encode user-controlled input into a key without sanitizing or hashing it first.
- Never use `KEYS` in production: it blocks the server while it scans the whole keyspace. Use `SCAN` with a cursor and a `MATCH` pattern, in bounded batches.
- Treat `MULTI`/`EXEC` as atomic batching, not as a rollback mechanism: a command that fails inside `EXEC` does not roll back the others. Use `WATCH` for optimistic locking, or a Lua script / Function when the logic needs conditionals.
- In Cluster mode, multi-key commands and transactions only work when all keys hash to the same slot; use hash tags (`{user:42}:profile`, `{user:42}:sessions`) to co-locate keys that must be operated on together.
- Prefer pipelining over one round trip per command for bulk work, and prefer `MGET`/`MSET` over loops of `GET`/`SET`.
- Keep values small: a single huge value (multi-MB string, or a hash/list with millions of entries) blocks the event loop on read, write, and eviction. Split large collections into multiple keys.
- Streams are the durable message log; pub/sub is fire-and-forget with no persistence, no replay, and no back-pressure. Use streams with consumer groups for work queues; use pub/sub only for ephemeral notifications.
- Persistence: enable AOF (`appendonly yes`) with `appendfsync everysec` when losing more than a second of writes is unacceptable; use RDB snapshots (`BGSAVE`) for compact backups and fast restarts. With both enabled, Redis restores from the AOF. Redis 8.10 adds incremental backup and restore via the `BACKUP` command family.
- Replication is asynchronous by default: a write acknowledged by the primary can be lost if the primary dies before the replica receives it. Use `WAIT` when a specific write must reach at least one replica before the client proceeds.
- Sentinel requires at least 3 Sentinel instances and a quorum of 2; a single Sentinel is a single point of failure. Cluster requires at least 3 primary nodes; always run replicas alongside primaries.
- Set `maxmemory` to leave headroom for replication buffers, client output buffers, and AOF rewrite overhead — never size it to the full RAM of the host.
- Use `volatile-lru` or `volatile-lfu` when only TTL'd keys may be evicted, `allkeys-lru` / `allkeys-lfu` for a pure cache, and `noeviction` when evicting any key would be a correctness bug (writes then fail with OOM instead). Redis 8.6 adds least-recently-modified eviction policies for workloads where recency of write matters more than recency of read.

### Testing Strategy

- Test against a real Redis instance (an ephemeral test instance or testcontainers), not a mock: Lua scripts, transactions, `WATCH` optimistic locking, and Cluster slot behavior only fail against the real server.
- Test expiry and eviction under pressure: keys expire on schedule, and the chosen eviction policy evicts only what it is allowed to when `maxmemory` is reached.
- Test failover: killing a primary promotes a replica (Sentinel or Cluster) and the client reconnects; test that `WAIT` holds where a write must reach a replica.
- Test persistence by restarting: after a restart the data the application needs is restored from AOF or RDB, and the measured loss matches the chosen durability level.

## Best Practices

- Cache-aside is the default pattern: read from the cache, fall back to the source of truth on a miss, and populate the cache. Invalidate or update the cache on writes to the source; never let the cache be the only copy of data you cannot rebuild.
- Protect against cache stampedes: on a miss, let one client rebuild the value (a short-lived lock with `SET NX EX`) while others wait or serve a stale value.
- Use hashes to group related fields of one entity (`HSET user:42 name ...`), which saves memory over one key per field and keeps the entity's fields together for Cluster co-location.
- Use sorted sets for leaderboards, time-ordered feeds, and priority queues (`ZADD` with a score, `ZRANGE` / `ZREVRANGE` for reads, `ZREMRANGEBYSCORE` for trimming).
- Use streams with consumer groups (`XADD`, `XREADGROUP`, `XACK`, `XPENDING`) for reliable work distribution, and set a `MAXLEN ~` cap so a stream cannot grow without bound.
- Keep scripts short and deterministic: no random values, no wall-clock reads, no calls to other services. Long scripts block the event loop for every client.
- Prefer Redis Functions over ad-hoc `EVAL` for logic that must be versioned, reviewed, and deployed like code; keep `EVAL` for one-off administration and short atomic helpers.
- Monitor `used_memory_rss` vs `used_memory` (fragmentation), `evicted_keys`, `keyspace_hits`/`keyspace_misses` (hit ratio), and `connected_clients`; a falling hit ratio or a rising eviction count is an early warning, not background noise.
- Test failover regularly: an untested Sentinel or Cluster failover is a hope, not a plan.

## Security Considerations

- Never expose Redis to the internet or to an untrusted network. Bind to a private interface (`bind 127.0.0.1` or a private address), keep `protected-mode yes`, and firewall port 6379.
- Always set authentication: `requirepass` for a single shared password, or preferably ACL users (`ACL SETUSER`) with one user per application, each limited to the commands and key patterns it needs (`+get +set ~app:*`). The default user with no password is an open door.
- Use TLS (`tls-port`, `rediss://` URLs) whenever clients connect over a network you do not fully control. Redis 8.6 adds TLS certificate-based client authentication.
- Rename or disable dangerous commands in shared or exposed deployments (`CONFIG`, `FLUSHALL`, `FLUSHDB`, `DEBUG`, `EVAL` where functions are used instead) via `rename-command` in the configuration file.
- Store passwords and ACL credentials in a secret manager, never in source control or in a connection string committed to a repository.
- Lua scripts and Functions run with the caller's permissions; review them like application code, and do not let untrusted input reach `EVAL` unvalidated.
- Keep Redis patched: security fixes ship in patch releases (for example 8.10.3 in October 2026 fixed a cluster pub/sub heap overflow). Track the release notes and upgrade promptly.
- Audit access with `ACL LOG`, which records authentication failures and denied commands.

## Performance Considerations

- Redis is single-threaded for command execution: one slow command (a huge `SORT`, `KEYS`, `SMEMBERS` on a giant set, or a long Lua script) stalls every client. Keep commands O(1) or O(log N) on the hot path and move heavy scans to a replica.
- Use pipelining for bulk operations: batching tens to hundreds of commands per round trip removes network latency as the bottleneck.
- Watch memory: fragmentation (`mem_fragmentation_ratio` above ~1.5) wastes RAM; enable `activedefrag` on long-lived instances with churn. Small hashes, lists, and sets use compact encodings automatically; Redis 8.10 adds compact hashes that store shared field names once for same-schema hashes.
- Prefer `UNLINK` over `DEL` for large keys: `UNLINK` frees memory asynchronously instead of blocking the event loop.
- Set `hz` and `dynamic-hz` sensibly on busy instances so expired-key reaping keeps up; a backlog of expired keys inflates memory and slows eviction.
- Replication lag grows under heavy write load; monitor `master_repl_offset` vs replica offsets, and use `WAIT` sparingly — it trades latency for durability.
- Cluster resharding (`redis-cli --cluster reshard`) moves slots live but costs CPU and bandwidth; plan shard counts ahead of growth rather than resharding under load.
- Monitor latency with `LATENCY DOCTOR` and the slow log (`SLOWLOG GET`); investigate any command consistently above a few milliseconds on the hot path.

## Common Mistakes

- Using `KEYS` in production — blocks the server for the whole scan; use `SCAN`.
- Storing data with no TTL in a cache — the dataset grows until `maxmemory` is hit and eviction (or OOM errors) starts.
- Treating `MULTI`/`EXEC` as a transaction with rollback — a failed command does not undo the others; design for partial application or use a Lua script.
- Using pub/sub as a queue — messages published while no subscriber is connected are lost forever; use streams for anything that must be delivered.
- Running a single Redis instance with no replica and no persistence in production — a restart or crash loses everything.
- Putting all keys in one hash or one list — creates a hot key that cannot be split across Cluster shards and blocks the event loop on access.
- Ignoring `maxmemory` — without it, Redis grows until the host OOM-killer terminates it.
- Sharing one password (or no password) across applications — a compromised client can read and delete every key; use per-application ACL users.
- Forgetting hash tags in Cluster mode — multi-key commands fail with `CROSSSLOT` errors when keys land on different shards.

## Examples

```text
# Example: cache-aside read with a TTL, and a stampede-protection lock.
# SET with NX (only if absent) and EX (expiry) is atomic: exactly one
# client wins the lock.
SET user:42:profile "{\"name\":\"Ada\"}" EX 300
SET user:42:profile:lock 1 NX EX 10
GET user:42:profile
```

```text
# Example: leaderboard with a sorted set, and trimming to the top 100.
ZADD leaderboard:weekly 1500 "player:7" 1200 "player:9"
ZREVRANGE leaderboard:weekly 0 9 WITHSCORES
ZREMRANGEBYRANK leaderboard:weekly 0 -101
```

```text
# Example: a stream consumer group for reliable work distribution.
XGROUP CREATE orders:events workers $ MKSTREAM
XADD orders:events * order_id 1001 status paid
XREADGROUP GROUP workers consumer-1 BLOCK 5000 COUNT 10 STREAMS orders:events >
XACK orders:events workers 1690000000000-0
```

```lua
-- Example: fixed-window rate limiter as a Lua script (atomic: the
-- increment and the expiry are set in a single server-side step).
-- KEYS[1] = rate key, ARGV[1] = limit, ARGV[2] = window seconds.
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
end
return current <= tonumber(ARGV[1]) and 1 or 0
```

```text
# Example: optimistic locking with WATCH / MULTI / EXEC.
# If another client changes balance:7 between WATCH and EXEC, EXEC
# returns nil and the client retries.
WATCH balance:7
GET balance:7
MULTI
DECRBY balance:7 50
EXEC
```

```text
# Example: least-privilege ACL user for one application.
ACL SETUSER app-orders on >${ORDERS_REDIS_PASSWORD} ~orders:* +get +set +xadd +xreadgroup +xack -@dangerous
ACL LIST
```

```bash
# Example: create a 3-primary Cluster with one replica each.
redis-cli --cluster create 10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 --cluster-replicas 1
redis-cli --cluster check 10.0.0.1:6379
```

## Validation Checklist

- [ ] Every key class has a namespace prefix and a documented TTL (or a written reason for no TTL).
- [ ] No `KEYS` calls exist in application code; scans use `SCAN` with bounded batches.
- [ ] `maxmemory` and a `maxmemory-policy` matching the workload are set, with a memory alert below the limit.
- [ ] Persistence matches the stated data-loss window (AOF `everysec`, RDB snapshots, or both), and a restart drill has reloaded the dataset.
- [ ] A replica exists, failover has been drilled (Sentinel promotion or Cluster replica promotion), and replication lag is monitored.
- [ ] Authentication is enabled with per-application ACL users; no client connects as the default user without a password.
- [ ] Redis is bound to a private interface, firewalled, and (where the network is not fully trusted) served over TLS.
- [ ] Monitoring covers memory, hit ratio, evictions, slow log, latency, and replication lag, with alerts configured.
- [ ] Multi-key operations in Cluster mode use hash tags, and the hot path has been load-tested with representative data.

## Expected Deliverables

- The key-namespace design: prefixes, data structure per key class, TTLs, and eviction policy.
- The topology decision (single + replica, Sentinel, or Cluster) with node counts and the failover procedure.
- Configuration files or a managed-service setup summary: persistence, memory limits, ACL users, TLS, and dangerous-command handling.
- The atomic operations the application relies on (transactions, Lua scripts, or Functions) with their correctness reasoning.
- Monitoring and alerting setup, plus the results of the load test, failover drill, and restart drill.

## References

- [Redis command reference](https://redis.io/docs/latest/commands/) — commands by version, with complexity and syntax.
- [Redis programmability](https://redis.io/docs/latest/develop/programmability/) — Lua scripts and Redis Functions.
- [Redis 8.10 release notes](https://raw.githubusercontent.com/redis/redis/8.10/00-RELEASENOTES) — current stable line changes.
- [Redis licenses](https://redis.io/legal/licenses/) — tri-license terms for Redis 8 and later.
- Related skills in this repository: `caching`, `connection-pooling`, `backup-recovery`, `database-design`, `queues`, `background-jobs`.
