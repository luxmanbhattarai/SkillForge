---
name: opensearch
description: >
  Build and operate OpenSearch search and analytics: index design and
  mappings, Query DSL, SQL, and PPL queries, aggregations, analyzers and
  relevance tuning, cluster architecture with sharding and replication,
  snapshots and restore, the Security plugin (roles, tenants, audit),
  Index State Management, monitoring, performance tuning, and production
  deployment. Trigger keywords: opensearch, dashboards, query DSL, PPL,
  mapping, analyzer, aggregation, shard, snapshot, ISM, k-NN, hybrid search.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# OpenSearch

## Purpose

This skill guides the design, implementation, and operation of OpenSearch for full-text search, log analytics, and vector retrieval: modeling indices and mappings for the queries that will run, writing queries that rank well, and running a cluster that stays green under load and recovers from failure. It treats OpenSearch as its own system — not as a copy of Elasticsearch — with its own plugins, lifecycle tooling, and API surface.

## When to Use

- Adding full-text search, faceted search, or analytics over documents, logs, or metrics on an Apache 2.0 engine.
- Designing index mappings, analyzers, and index templates for a new dataset.
- Writing Query DSL, SQL, or PPL queries, aggregations, or relevance tuning.
- Sizing shards, planning a cluster topology, or setting up Index State Management (ISM).
- Setting up snapshots and restore, or planning a restore drill.
- Securing a cluster with the Security plugin (roles, tenants, audit logging, TLS).
- Adding vector, hybrid, or neural search with the k-NN plugin.
- Running on AWS (Amazon OpenSearch Service) or where vendor-neutral Linux Foundation governance matters.

## When Not to Use

- When the workload is relational with joins and transactions — use `postgresql` or `mysql`, and model the schema with `database-design`.
- When the workload is OLAP over large structured datasets with SQL-first access — use `clickhouse`.
- When the team specifically needs Elasticsearch-only capabilities (ES|QL, ILM/SLM, Elastic's inference and ML features) — use `elasticsearch`, and do not assume the two APIs are interchangeable.
- When the data fits in memory and the access pattern is key lookup, ranking, or queues — use `redis`.
- When the task is only about choosing a search engine — decide the engine first (see "How OpenSearch differs from Elasticsearch" below), then use this skill for the OpenSearch work.

## Prerequisites

- A running OpenSearch cluster (self-managed, Docker, or Amazon OpenSearch Service) with access to the REST API, plus OpenSearch Dashboards for inspection.
- Knowledge of the documents to be indexed, the queries they must answer, and the expected index size and growth.
- Supported versions as of 2026-11-20: OpenSearch 3.10.0 is the current stable release (2026-11-16). OpenSearch 3.6 is the first long-term support (LTS) release, with a minimum of 18 months of support under the OpenSearch Software Foundation's LTS program (announced 2026-04-16). The 2.19 line still receives maintenance patches (2.19.7, 2026-10-20), but new deployments should start on 3.x.
- Licensing and governance: OpenSearch is Apache 2.0 throughout, including its plugins, with no paid feature tier. Since 2024-09-16 it has been governed by the OpenSearch Software Foundation, a Linux Foundation project.
- The Security plugin is enabled by default in the standard distribution; the demo certificates it ships with are for local development only and must be replaced before any real deployment.

## How OpenSearch differs from Elasticsearch

OpenSearch began in 2021 as a fork of Elasticsearch 7.10.2 and Kibana 7.10.2, after Elastic moved Elasticsearch 7.11 to dual SSPL / Elastic License terms. OpenSearch 1.0 reached general availability in July 2021. The two projects have diverged for over five years; treat them as different engines that share concepts, not as drop-in replacements.

- **Licensing:** OpenSearch is Apache 2.0 for the engine and its plugins. Elasticsearch's source is available under a choice of AGPLv3, SSPL, or the Elastic License v2 (AGPLv3 added in 2024); its default distribution ships under the Elastic License, and some features are subscription-gated.
- **Governance:** OpenSearch is governed by the OpenSearch Software Foundation under the Linux Foundation. Elasticsearch is developed by Elastic N.V.
- **Lifecycle management:** OpenSearch uses Index State Management (ISM) policies; Elasticsearch uses Index Lifecycle Management (ILM) and Snapshot Lifecycle Management (SLM). The concepts match; the APIs do not.
- **Query languages:** both support Query DSL. OpenSearch additionally offers SQL and PPL (Piped Processing Language) queries; Elasticsearch offers ES|QL. A query written in one engine's extra language does not run on the other.
- **Vector and AI search:** OpenSearch's k-NN plugin supports Faiss, Lucene, and JVector engines, plus neural and hybrid search; Elasticsearch has its own vector stack (BBQ quantization, `semantic` fields, the Inference API). Field types, settings, and APIs differ — check the OpenSearch documentation for the OpenSearch form of any feature.
- **Compatibility:** clients, snapshots, and index formats are not interchangeable between the two engines. Migrating between them is a reindex and a rewrite of engine-specific features, not a version upgrade.

## Official Documentation

- [OpenSearch documentation](https://docs.opensearch.org/latest/about/) — the documentation home for OpenSearch and OpenSearch Dashboards (version 3.10).
- [OpenSearch version history](https://docs.opensearch.org/latest/version-history/) — what changed in each release, including the 3.10.0 and 3.6 LTS notes.
- [Search your data](https://docs.opensearch.org/latest/getting-started/search-data/) — Query DSL and query string search, with worked examples.
- [Index maintenance](https://docs.opensearch.org/latest/im-plugin/index-maintenance/) — refresh, flush, force merge, shrink, and split operations.
- [OpenSearch LTS program announcement](https://opensearch.org/announcements/opensearch-software-foundation-strengthens-enterprise-readiness-with-new-long-term-support-versions/) — the LTS program: 18-month support lifecycles, SBOM coverage, and accredited vendor support, starting with 2.19 and 3.6.

## Required Workflow

1. Define the search product first: which fields are searched, which are filtered, which are sorted or aggregated, and what "relevant" means for the top results.
2. Design the mapping explicitly before indexing: field types (`text` vs `keyword`, `date`, numeric, `knn_vector`), analyzers per text field, and `doc_values`/`index` settings per use. Do not rely on dynamic mapping for production indices.
3. Create an index template for time-series or multi-index data so every new index gets the same mapping, shard count, and ISM policy.
4. Choose the shard count from the expected index size and the official shard-sizing guidance (keep shards in the tens of gigabytes); start with few shards and grow by adding indices, not by oversharding on day one.
5. Attach an ISM policy for time-based data: rollover, move to warm storage, force merge, and delete — before the first index fills up.
6. Register a snapshot repository before the cluster holds data you cannot rebuild, and schedule regular snapshots; run a restore drill.
7. Write queries with `filter` context for exact matches (cacheable, no scoring) and `must`/`should` only where scoring matters; verify relevance with real queries and real data.
8. Configure the Security plugin: replace the demo certificates, define roles and users, and give applications least-privilege access (or API keys with scoped permissions).
9. Set up monitoring (cluster health, node stats, index stats, slow logs, Query Insights) and alerting before launch.
10. Load-test with representative data volume and query mix, then tune: refresh interval, replica count, and query shapes — and re-verify with the Validation Checklist.

## Implementation Standards

- Mappings are explicit and versioned (index templates or index-creation requests in source control). Dynamic mapping is disabled or strictly controlled (`dynamic: strict` or `dynamic_templates`) on production indices.
- `text` fields are for full-text search; `keyword` fields are for exact match, sorting, and aggregations. Use multi-fields (`title` as `text` with a `title.keyword` sub-field) when a field needs both.
- Analyzers are chosen per field and tested with the `_analyze` API before indexing: a standard analyzer for general text, a language analyzer where stemming matters, and a custom analyzer only when a test proves the built-in ones wrong.
- Every index has a purpose, a shard count justified by size, and at least one replica in production. A single-node cluster with zero replicas is a development setup, not a deployment.
- Use data streams for append-only time-series data (logs, metrics, events) so rollover and ISM management are automatic.
- Queries put exact-match and range filters in `filter` context; scoring queries (`match`, `multi_match`) go in `must`/`should`. Deep pagination uses `search_after`, never large `from` offsets; `scroll` is for bulk export, not for user-facing paging.
- Aggregations on high-cardinality fields are bounded (`size`, `composite` aggregations for pagination) and tested against production-sized data; unbounded `terms` aggregations on a high-cardinality field are a memory hazard.
- Index names, templates, and ISM policies follow a naming convention (`<dataset>-<yyyy.MM.dd>` for time-based indices) so retention and cleanup are mechanical.
- Reindex (via the `_reindex` API) is the way to change a mapping; mappings for existing fields cannot be changed in place. Plan a reindex path (alias swap) before launch.
- Version upgrades follow the official upgrade path: read the version history and breaking changes, snapshot first, and do not skip major versions.
- For vector search, choose the k-NN engine explicitly (Faiss, Lucene, or JVector) per index and record why; the engines differ in supported methods, quantization, and memory behaviour.

### Testing Strategy

- Test the mapping and analyzer choices on a disposable index first: index representative documents, run the `_analyze` API on real query terms, and confirm the top results match expectations before the template is promoted.
- Test ISM policies on a short-lived index: rollover, force merge, and deletion fire on schedule, so retention is proven instead of discovered months later when disk fills.
- Test vector search per engine: the chosen k-NN engine (Faiss, Lucene, or JVector) returns the expected nearest neighbors for known vectors, and recall and latency are measured against the recorded reason for the choice.
- Test the reindex path before a mapping change is needed: reindex into a new index, swap the alias, and confirm the application reads and writes through the alias without downtime.
- Test failure modes on a staging cluster: a node loss with replicas in place, a snapshot restore, and an upgrade rehearsal that reads the version history and breaking changes before the production upgrade.

## Best Practices

- Design relevance deliberately: use `multi_match` across fields with boosts (`title^3`), `function_score` for business rules, and hybrid search (lexical + vector, with score combination) where meaning matters as well as keywords. Judge changes against a labelled set of test queries.
- Use Search Relevance Workbench and Query Insights (both available in 3.x) to measure which queries are slow and which return poor results, instead of tuning blind.
- Keep the mapping small: every indexed field costs disk, memory, and indexing time. Disable `_source` storage only when you are certain the original document is stored elsewhere and reindexing from source is never needed.
- Use index sorting (`index.sort.field`) for time-series indices that are always queried newest-first; it makes early termination effective.
- Bulk-index with the `_bulk` API in batches of a few MB, with retries on `429` (backpressure) — never index document-by-document in a loop.
- Refresh interval: the default (1s) suits near-real-time search; raise it (for example `30s`) or disable refresh during bulk loads, then restore it.
- Use aliases for every index an application reads: the alias lets you reindex, roll over, or swap indices without changing application code.
- Keep the cluster's dedicated cluster-manager-eligible nodes to 3 (or 5 at large scale), separate from data nodes, and never let a data node be the only cluster-manager-eligible node.
- Run a staging cluster with production-like data volume for relevance and performance testing; relevance tuned on 100 documents does not survive 100 million.
- Record the reasoning for shard counts, replica counts, and ISM phases in the runbook so the next operator does not "fix" a deliberate choice.

## Security Considerations

- Never expose OpenSearch to the internet without authentication and TLS. The Security plugin is on by default in the standard distribution — keep it on. An open search cluster is routinely found and wiped by automated scanners.
- Replace the demo certificates before any real deployment: generate proper TLS certificates for the HTTP and transport layers, and monitor their expiry.
- Create least-privilege roles through the Security plugin: applications get index permissions only for the indices they need, and never the `admin` role. Use the built-in roles (`read`, `write`, `indices:admin/*`) as a starting point and narrow them. OpenSearch 3.7 added API keys with scoped permissions for application access.
- Use tenants in OpenSearch Dashboards to isolate saved objects (visualizations, dashboards) between teams where that separation matters.
- Enable audit logging for privileged actions and failed authentications, and ship those logs somewhere the cluster itself does not control.
- Do not store secrets, credentials, or personal data you do not need in indexed documents; indexed data is searchable by anyone with `read` on the index. Use field-level and document-level security where different users must see different subsets.
- Keep the cluster patched: apply maintenance releases promptly, and watch the project's security announcements.
- Restrict scripting (Painless) to trusted users: stored scripts and scripted queries can be abused for denial of service or data exfiltration if an attacker gains write access to index mappings or search templates.

## Performance Considerations

- Shard count is the most common sizing mistake: too many small shards waste heap (each shard carries overhead) and slow the cluster; too few huge shards limit parallelism. Size shards per the official guidance and measure with production-like data.
- Heap sizing: keep the JVM heap at or below half of system RAM so the OS page cache can hold index segments; never set heap above 32 GB without understanding the compressed-oops trade-off.
- Slow queries are usually one of: a wildcard/regexp query with a leading wildcard, an unbounded aggregation, deep pagination with large `from`, or a query that scores every document. Use Query Insights and the Profile API to find the real cost, and fix the query shape before adding hardware.
- Indexing throughput: bulk requests, a raised refresh interval during loads, and enough indexing threads matter more than node count. Watch indexing pressure and merge times.
- Force-merge read-only indices to one segment (`POST /<index>/_forcemerge?max_num_segments=1`) only after they stop receiving writes; force-merging a live index wastes I/O. ISM can force-merge as a lifecycle action.
- Disk watermarks matter: when a node passes the low watermark it stops allocating new shards, and past the flood-stage watermark indices go read-only. Monitor disk usage per node and plan retention accordingly.
- Vector search (k-NN) is memory-sensitive: `knn_vector` fields with HNSW graphs consume memory proportional to vector count and dimensions. Use quantization (including 1-bit scalar quantization, the default in 3.6+) to reduce the footprint, and test recall at production scale.
- Use the `_cat` APIs (`_cat/health`, `_cat/nodes`, `_cat/indices`, `_cat/shards`) and node stats for quick diagnosis; use the Performance Analyzer plugin and Dashboards for trends.

## Common Mistakes

- Relying on dynamic mapping — the first document decides the field type, and a wrong guess (a date parsed as text, a number as keyword) is painful to fix; define mappings explicitly.
- Oversharding — creating hundreds of shards for a small dataset wastes heap and slows every operation; start small and grow.
- Using `from`/`size` for deep pagination — `from: 100000` forces the cluster to sort and discard 100,000 hits; use `search_after`.
- Putting filter conditions in `must` — they get scored and are not cached; use `filter` context for exact matches.
- Running a single-node cluster in production — no replica means any node failure is data loss or downtime.
- Shipping the demo certificates and demo users to production — they are public, documented, and the first thing an attacker tries.
- Assuming Elasticsearch APIs work unchanged — ILM/SLM, ES|QL, and Elastic's ML APIs do not exist in OpenSearch; use ISM, PPL/SQL, and the OpenSearch ML plugins instead.
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
// Example: ISM policy — roll over daily indices, delete after 30 days.
PUT /_plugins/_ism/policies/logs-policy
{
  "policy": {
    "description": "Daily log rollover and 30-day retention.",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [{ "rollover": { "min_index_age": "1d" } }],
        "transitions": [{ "state_name": "delete", "conditions": { "min_index_age": "30d" } }]
      },
      { "name": "delete", "actions": [{ "delete": {} }] }
    ]
  }
}
```

```json
// Example: snapshot repository (shared filesystem) and a snapshot request.
PUT /_snapshot/nightly_backups
{
  "type": "fs",
  "settings": { "location": "/var/backups/opensearch" }
}

PUT /_snapshot/nightly_backups/snapshot-2026-11-20
{
  "indices": "products,logs-*",
  "ignore_unavailable": true
}
```

```json
// Example: PPL query — the same aggregation as the Query DSL example,
// in Piped Processing Language.
POST /_plugins/_ppl
{
  "query": "search source=products | where category='audio' | stats count() by category"
}
```

```text
# Example: cluster health and node diagnosis.
GET /_cluster/health
GET /_cat/nodes?v&h=name,heap.percent,ram.percent,cpu,load_1m
GET /_nodes/stats
```

## Validation Checklist

- [ ] Mappings are explicit and versioned; dynamic mapping is controlled on every production index.
- [ ] Queries use `filter` context for exact matches and `search_after` for deep pagination.
- [ ] Every production index has at least one replica; the cluster has 3 dedicated cluster-manager-eligible nodes.
- [ ] A snapshot repository and schedule exist, and a restore drill has recovered an index successfully.
- [ ] ISM policies (or data streams) manage retention for time-based data.
- [ ] Demo certificates and demo users are replaced; applications authenticate with least-privilege roles or scoped API keys.
- [ ] TLS is enabled on HTTP and transport; audit logging is on for privileged actions.
- [ ] Monitoring covers cluster health, node heap/disk, indexing pressure, and slow logs, with alerts configured.
- [ ] Load and relevance tests ran on production-like data volume, and the results are recorded.
- [ ] An alias fronts every index the application reads, and a reindex path exists for mapping changes.

## Expected Deliverables

- The index design: mappings, analyzers, templates, and the shard/replica reasoning per index.
- The query set the application relies on (Query DSL, SQL, and/or PPL), with relevance test results.
- The cluster topology, ISM policies, snapshot configuration, and the restore drill result.
- The security setup: TLS certificates, roles, users, and API keys, with the credentials stored in a secret manager.
- Monitoring and alerting configuration, plus the load-test results and tuning decisions.

## References

- [OpenSearch documentation](https://docs.opensearch.org/latest/about/) — OpenSearch and OpenSearch Dashboards documentation home.
- [OpenSearch version history](https://docs.opensearch.org/latest/version-history/) — per-release changes, including 3.10.0 and the 3.6 LTS notes.
- [OpenSearch LTS program announcement](https://opensearch.org/announcements/opensearch-software-foundation-strengthens-enterprise-readiness-with-new-long-term-support-versions/) — 18-month support lifecycles and accredited vendor support.
- [Search your data](https://docs.opensearch.org/latest/getting-started/search-data/) — Query DSL and query string search.
- [Index maintenance](https://docs.opensearch.org/latest/im-plugin/index-maintenance/) — refresh, flush, force merge, shrink, and split.
- Related skills in this repository: `elasticsearch`, `indexing`, `backup-recovery`, `observability`, `database-security`.
