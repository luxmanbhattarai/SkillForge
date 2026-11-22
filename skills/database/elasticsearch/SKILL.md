---
name: elasticsearch
description: >
  Build and operate Elasticsearch search and analytics: index design and
  mappings, Query DSL and ES|QL queries, aggregations, analyzers and
  relevance tuning, cluster architecture with sharding and replication,
  snapshots and restore, security (TLS, API keys, role-based access),
  monitoring, performance tuning, and production deployment. Trigger
  keywords: elasticsearch, elastic, query DSL, ES|QL, mapping, analyzer,
  aggregation, shard, snapshot, relevance, full-text search, kibana.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Elasticsearch

## Purpose

This skill guides the design, implementation, and operation of Elasticsearch for full-text search, analytics, and vector retrieval: modeling indices and mappings for the queries that will run, writing queries that rank well, and running a cluster that stays green under load and recovers from failure. It produces search that returns the right results fast, on a cluster an operator can reason about.

## When to Use

- Adding full-text search, faceted search, or analytics over documents, logs, or metrics.
- Designing index mappings, analyzers, and index templates for a new dataset.
- Writing Query DSL or ES|QL queries, aggregations, or relevance tuning.
- Sizing shards, planning a cluster topology, or setting up index lifecycle management.
- Setting up snapshots and restore, or planning a restore drill.
- Securing a cluster (TLS, users, roles, API keys) or diagnosing slow queries and red cluster health.
- Adding vector or hybrid search (dense vectors, semantic fields) to an application.

## When Not to Use

- When the workload is relational with joins and transactions — use `postgresql` or `mysql`, and model the schema with `database-design`.
- When the workload is OLAP over large structured datasets with SQL-first access — use `clickhouse`.
- When the requirement is a permissively licensed (Apache 2.0) engine with no paid feature tier — use `opensearch`; the two engines share a lineage but have diverged since 2021, so do not assume API compatibility.
- When the data fits in memory and the access pattern is key lookup, ranking, or queues — use `redis`.
- When the task is only about choosing a database engine — decide the engine first, then use this skill for the Elasticsearch work.

## Prerequisites

- A running Elasticsearch cluster (self-managed or Elastic Cloud) with access to the REST API, plus Kibana or the API for inspection.
- Knowledge of the documents to be indexed, the queries they must answer, and the expected index size and growth.
- Supported versions: Elasticsearch 9.5 is the current stable line (9.5.6, released 2026-11-02); 9.4.9 is also maintained. Elasticsearch 8.19 (8.19.25) is the long-support 8.x line, supported until 2027-07-15. Version 9.6.0 is announced but not yet released — do not target it. Elasticsearch 9 requires a fresh look at the breaking changes from 8.x; check the release notes before upgrading.
- Licensing: since 2024 the source is available under a choice of AGPLv3, SSPL, or the Elastic License v2; the default distribution ships under the Elastic License. Confirm the license implications for your use case before adopting.
- Elasticsearch 9 ships with security on by default (TLS between nodes, authentication required) and a bundled JDK; do not disable the defaults to "simplify" a deployment.

## Official Documentation

- [Elastic documentation](https://www.elastic.co/docs) — the documentation home for Elastic Stack 9.x and Elastic Cloud Serverless.
- [Elasticsearch release notes](https://www.elastic.co/docs/release-notes/elasticsearch) — what changed in each 9.x release, including breaking changes and security fixes.
- [Semantic field type reference](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-field-reference) — the `semantic` field type (GA in 9.5) for multimodal semantic search through the Inference API.
- [Elasticsearch 9.5 announcement](https://www.elastic.co/blog/whats-new-elastic-9-5-0) — Columnar Mode (technical preview), VectorDB index mode with auto-calibration, and native Prometheus/PromQL support.
- [Search API (8.19 guide)](https://www.elastic.co/guide/en/elasticsearch/reference/8.19/search-search.html) — the search API reference, still applicable to the 8.19 long-support line.

## Required Workflow

1. Define the search product first: which fields are searched, which are filtered, which are sorted or aggregated, and what "relevant" means for the top results.
2. Design the mapping explicitly before indexing: field types (`text` vs `keyword`, `date`, numeric, `dense_vector`, `semantic`), analyzers per text field, and `doc_values`/`index` settings per use. Do not rely on dynamic mapping for production indices.
3. Create an index template for time-series or multi-index data so every new index gets the same mapping, shard count, and lifecycle policy.
4. Choose the shard count from the expected index size and the official shard-sizing guidance (Elastic recommends keeping shards in the tens of gigabytes); start with few shards and grow by adding indices, not by oversharding on day one.
5. Set up the lifecycle policy (ILM) for time-based data: hot/warm/cold phases, rollover, and delete — before the first index fills up.
6. Register a snapshot repository and a snapshot lifecycle (SLM) policy before the cluster holds data you cannot rebuild; run a restore drill.
7. Write queries with `filter` context for exact matches (cacheable, no scoring) and `must`/`should` only where scoring matters; verify relevance with real queries and real data.
8. Enable security: TLS on HTTP and transport, least-privilege roles, and API keys for applications instead of shared passwords.
9. Set up monitoring (cluster health, node stats, index stats, slow logs) and alerting before launch.
10. Load-test with representative data volume and query mix, then tune: refresh interval, replica count, and query shapes — and re-verify with the Validation Checklist.

## Implementation Standards

- Mappings are explicit and versioned (index templates or index-creation requests in source control). Dynamic mapping is disabled or strictly controlled (`dynamic: strict` or `dynamic_templates`) on production indices.
- `text` fields are for full-text search; `keyword` fields are for exact match, sorting, and aggregations. Use multi-fields (`title` as `text` with a `title.keyword` sub-field) when a field needs both.
- Analyzers are chosen per field and tested with the `_analyze` API before indexing: a standard analyzer for general text, a language analyzer where stemming matters, and a custom analyzer (char filters, tokenizer, token filters) only when a test proves the built-in ones wrong.
- Every index has a purpose, a shard count justified by size, and at least one replica in production. A single-node cluster with zero replicas is a development setup, not a deployment.
- Use data streams for append-only time-series data (logs, metrics, events) so rollover and lifecycle management are automatic.
- Queries put exact-match and range filters in `filter` context; scoring queries (`match`, `multi_match`) go in `must`/`should`. Deep pagination uses `search_after`, never large `from` offsets; `scroll` is for bulk export, not for user-facing paging.
- Aggregations on high-cardinality fields are bounded (`size`, `composite` aggregations for pagination) and tested against production-sized data; unbounded `terms` aggregations on a high-cardinality field are a memory hazard.
- Index names, templates, and lifecycle policies follow a naming convention (`<dataset>-<yyyy.MM.dd>` for time-based indices) so retention and cleanup are mechanical.
- Reindex (via the `_reindex` API) is the way to change a mapping; mappings for existing fields cannot be changed in place. Plan a reindex path (alias swap) before launch.
- Version upgrades follow the official upgrade guide: read the breaking changes, run the Upgrade Assistant checks, snapshot first, and upgrade one minor at a time across majors.
- ES|QL (`POST /_query`) is the first-class query language for analytics and exploration in 9.x; Query DSL remains the primary language for search relevance work and for application queries. Use the one that fits the task, not both at once.

### Testing Strategy

- Test analyzers with the `_analyze` API before indexing: a query that tokenizes differently than expected is a relevance bug found in seconds, not after a reindex.
- Test queries against production-sized data: relevance (top results for known queries), aggregation bounds on high-cardinality fields, and `search_after` pagination across deep result sets.
- Test mappings in a disposable index: a mapping change is applied to a fresh index, documents are indexed, and queries run before the template is promoted to production.
- Test the reindex path end to end: reindex into a new index, swap the alias, and confirm reads and writes follow the alias with no downtime and no lost documents.
- Test failure modes on a staging cluster: a node loss with replicas in place, a snapshot restore, and an upgrade rehearsal following the official upgrade guide before the production upgrade.

## Best Practices

- Design relevance deliberately: use `multi_match` across fields with boosts (`title^3`), `function_score` or the retriever API for business rules, and a labelled set of test queries to judge changes — never tune by gut feel.
- Keep the mapping small: every indexed field costs disk, memory, and indexing time. Disable `_source` storage only when you are certain the original document is stored elsewhere and reindexing from source is never needed.
- Use index sorting (`index.sort.field`) for time-series indices that are always queried newest-first; it makes early termination effective.
- Bulk-index with the `_bulk` API in batches of a few MB, with retries on `429` (backpressure) — never index document-by-document in a loop.
- Refresh interval: the default (1s) suits near-real-time search; raise it (for example `30s`) or disable refresh during bulk loads, then restore it.
- Use aliases for every index an application reads: the alias lets you reindex, roll over, or swap indices without changing application code.
- Keep the cluster's dedicated master-eligible nodes to 3 (or 5 at large scale), separate from data nodes, and never let a data node be the only master-eligible node.
- Run a staging cluster with production-like data volume for relevance and performance testing; relevance tuned on 100 documents does not survive 100 million.
- Record the reasoning for shard counts, replica counts, and lifecycle phases in the runbook so the next operator does not "fix" a deliberate choice.

## Security Considerations

- Never expose Elasticsearch to the internet without authentication and TLS. Security is on by default in 8.x/9.x — keep it on. An open Elasticsearch cluster is routinely found and wiped by automated scanners.
- Use TLS on both the HTTP layer and the transport layer, with certificates from a trusted CA or the Elastic `elasticsearch-certutil` tooling; verify certificate expiry is monitored.
- Create least-privilege roles: applications get index privileges only for the indices they need (`read`, `create_index`, `index` as appropriate), and never the `superuser` role. Use API keys (`POST /_security/api_key`) for application access so a leaked key can be revoked without rotating a password.
- Enable audit logging for privileged actions and failed authentications, and ship those logs somewhere the cluster itself does not control.
- Do not store secrets, credentials, or personal data you do not need in indexed documents; indexed data is searchable by anyone with `read` on the index. Use field-level and document-level security where different users must see different subsets.
- Keep the cluster patched: apply patch releases promptly (for example, 9.5.6 and 8.19.25 shipped in November 2026 with security fixes), and watch Elastic's security announcements.
- Restrict scripting (Painless) to trusted users: stored scripts and scripted queries can be abused for denial of service or data exfiltration if an attacker gains write access to index mappings or search templates.

## Performance Considerations

- Shard count is the most common sizing mistake: too many small shards waste heap (each shard carries overhead) and slow the cluster; too few huge shards limit parallelism. Size shards per the official guidance and measure with production-like data.
- Heap sizing: keep the JVM heap at or below half of system RAM (and below the compressed-oops threshold) so the OS page cache can hold index segments; never set heap above 32 GB without understanding the compressed-oops trade-off.
- Slow queries are usually one of: a wildcard/regexp query with a leading wildcard, an unbounded aggregation, deep pagination with large `from`, or a query that scores every document. Profile with the Profile API and fix the query shape before adding hardware.
- Indexing throughput: bulk requests, a raised refresh interval during loads, and enough indexing threads matter more than node count. Watch `indexing_pressure` and merge times.
- Force-merge read-only indices to one segment (`POST /<index>/_forcemerge?max_num_segments=1`) only after they stop receiving writes; force-merging a live index wastes I/O.
- Disk watermarks matter: when a node passes the low watermark it stops allocating new shards, and past the flood-stage watermark indices go read-only. Monitor disk usage per node and plan retention accordingly.
- Vector search (kNN) is memory-sensitive: `dense_vector` fields with HNSW graphs consume heap and off-heap memory proportional to vector count and dimensions. Use quantization (BBQ, enabled by default in 9.1+) and the VectorDB index mode (9.5) to reduce the footprint, and test recall at production scale.
- Use the `_cat` APIs (`_cat/health`, `_cat/nodes`, `_cat/indices`, `_cat/shards`) and node stats for quick diagnosis; use Stack Monitoring for trends.

## Common Mistakes

- Relying on dynamic mapping — the first document decides the field type, and a wrong guess (a date parsed as text, a number as keyword) is painful to fix; define mappings explicitly.
- Oversharding — creating hundreds of shards for a small dataset wastes heap and slows every operation; start small and grow.
- Using `from`/`size` for deep pagination — `from: 100000` forces the cluster to sort and discard 100,000 hits; use `search_after`.
- Putting filter conditions in `must` — they get scored and are not cached; use `filter` context for exact matches.
- Running a single-node cluster in production — no replica means any node failure is data loss or downtime.
- Disabling security to "simplify" a deployment — the cluster becomes an open target; keep TLS and authentication on.
- Indexing document-by-document instead of bulk — an order of magnitude slower and a source of backpressure errors.
- Forgetting snapshots — replication is not a backup; a deleted index is deleted on every replica. Snapshots are the only recovery path for operator error.
- Leading-wildcard queries (`*foo`) — they scan the term dictionary and are slow on large indices; use n-grams or a dedicated field instead.

## Examples

```json
// Example: index with an explicit mapping (text + keyword multi-field,
// a date, and a keyword for filtering).
PUT /products
{
  "settings": { "number_of_shards": 2, "number_of_replicas": 1 },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } }
      },
      "category": { "type": "keyword" },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "created_at": { "type": "date" }
    }
  }
}
```

```json
// Example: bool query — scoring on title, filter (cacheable, unscored)
// on category and price.
GET /products/_search
{
  "query": {
    "bool": {
      "must": { "match": { "title": "wireless headphones" } },
      "filter": [
        { "term": { "category": "audio" } },
        { "range": { "price": { "lte": 200 } } }
      ]
    }
  },
  "aggs": {
    "by_category": { "terms": { "field": "category", "size": 10 } }
  }
}
```

```json
// Example: snapshot repository and a daily snapshot lifecycle policy.
PUT /_snapshot/nightly_backups
{
  "type": "fs",
  "settings": { "location": "/var/backups/elasticsearch" }
}

PUT /_slm/policy/nightly-snapshots
{
  "schedule": "0 30 2 * * ?",
  "name": "<nightly-{now/d}>",
  "repository": "nightly_backups",
  "config": { "indices": ["*"], "ignore_unavailable": true }
}
```

```json
// Example: index lifecycle policy for time-based log indices.
PUT /_ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": { "actions": { "rollover": { "max_age": "1d", "max_primary_shard_size": "50gb" } } },
      "delete": { "min_age": "30d", "actions": { "delete": {} } }
    }
  }
}
```

```text
# Example: ES|QL for analytics — top categories by document count.
POST /_query
{
  "query": "FROM products | STATS count = COUNT(*) BY category | SORT count DESC | LIMIT 10"
}
```

```text
# Example: cluster health and slow-query diagnosis.
GET /_cluster/health
GET /_cat/nodes?v&h=name,heap.percent,ram.percent,cpu,load_1m
GET /_nodes/hot_threads
```

## Validation Checklist

- [ ] Mappings are explicit and versioned; dynamic mapping is controlled on every production index.
- [ ] Queries use `filter` context for exact matches and `search_after` for deep pagination.
- [ ] Every production index has at least one replica; the cluster has 3 dedicated master-eligible nodes.
- [ ] A snapshot repository and SLM policy exist, and a restore drill has recovered an index successfully.
- [ ] ILM policies (or data streams) manage retention for time-based data.
- [ ] TLS is enabled on HTTP and transport; applications authenticate with least-privilege roles or API keys.
- [ ] Monitoring covers cluster health, node heap/disk, indexing pressure, and slow logs, with alerts configured.
- [ ] Load and relevance tests ran on production-like data volume, and the results are recorded.
- [ ] An alias fronts every index the application reads, and a reindex path exists for mapping changes.

## Expected Deliverables

- The index design: mappings, analyzers, templates, and the shard/replica reasoning per index.
- The query set the application relies on (Query DSL and/or ES|QL), with relevance test results.
- The cluster topology, lifecycle policies, snapshot/SLM configuration, and the restore drill result.
- The security setup: TLS, roles, and API keys, with the credentials stored in a secret manager.
- Monitoring and alerting configuration, plus the load-test results and tuning decisions.

## References

- [Elastic documentation](https://www.elastic.co/docs) — Elastic Stack 9.x documentation home.
- [Elasticsearch release notes](https://www.elastic.co/docs/release-notes/elasticsearch) — per-release changes, breaking changes, and security fixes.
- [Elasticsearch 9.5 announcement](https://www.elastic.co/blog/whats-new-elastic-9-5-0) — Columnar Mode, VectorDB index mode, and native Prometheus support.
- [Semantic field type reference](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-field-reference) — the `semantic` field type for semantic search.
- Related skills in this repository: `opensearch`, `indexing`, `backup-recovery`, `observability`, `database-security`.
