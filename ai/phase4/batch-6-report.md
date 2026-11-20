# Phase 4 Batch 6 Report — Database Engineering

- **Date:** 2026-11-20
- **Batch:** 6 (database: redis, elasticsearch, opensearch, clickhouse)
- **Branch:** `feat/skillforge-production-upgrade` (no commits, no pushes, no merges — coordinator commits)

## Skills written

| Skill | Path | Lines | Description |
| --- | --- | --- | --- |
| `redis` | `skills/database/redis/SKILL.md` | 223 | Redis 8.10: data structures, commands, pipelining/transactions/Lua/Functions, pub/sub + streams, RDB/AOF, Sentinel/Cluster, eviction, caching patterns, ACL/TLS security, monitoring, production deployment. |
| `elasticsearch` | `skills/database/elasticsearch/SKILL.md` | 245 | Elasticsearch 9.5: mappings, Query DSL + ES\|QL, aggregations, analyzers, relevance, sharding/replication, snapshots/SLM, ILM, security, monitoring, performance. |
| `opensearch` | `skills/database/opensearch/SKILL.md` | 267 | OpenSearch 3.10: same coverage as Elasticsearch as its own system (ISM, Security plugin, k-NN, PPL/SQL), plus a verified fork/divergence section. |
| `clickhouse` | `skills/database/clickhouse/SKILL.md` | 267 | ClickHouse 26.10: MergeTree family, partitioning/ordering keys, skipping indexes, projections, materialized views, ReplicatedMergeTree + Keeper, Distributed sharding, backups, security, monitoring. |

All four follow `templates/SKILL-TEMPLATE.md` section order, keep version info in the body (per `ai/decisions/2026-11-20-phase3-version-metadata.md`), use frontmatter `last_verified: "2026-11-20"`, and cross-reference siblings by backticked name only. No `references/` subdirectories were needed — each SKILL.md is self-contained and under 500 lines.

## Official sources consulted

### redis
- Redis 8.10 release notes — `https://raw.githubusercontent.com/redis/redis/8.10/00-RELEASENOTES` (8.10 GA 2026-07-29; 8.10.3 security release 2026-10-26; compact hashes). 8.8 (`00-RELEASENOTES` on branch 8.8, 8.8.4) and 8.6 (8.6.8) branches checked for patch status.
- Redis Software release notes — `https://redis.io/docs/latest/operate/rs/release-notes/rs-8-2-releases/` (Redis 8.0 EOL 2026-12-01, 8.4 EOL 2027-01-01; Redis Software default 8.6).
- What's new in Redis docs — `https://redis.io/docs/latest/develop/whats-new/` (8.10: compact hashes, incremental backup/restore, LMOVEM/BLMOVEM, TS.NRANGE/TS.READ; 8.8: Array type, INCREX; 8.6: stream idempotency, least-recently-modified eviction, TLS cert auth).
- Command reference — `https://redis.io/docs/latest/commands/` (opened; confirms 8.10 reference and BACKUP command family).
- Programmability — `https://redis.io/docs/latest/develop/programmability/` (Lua vs Functions, atomicity).
- Licenses — `https://redis.io/legal/licenses/` (7.2 and earlier BSD; 7.4 RSALv2/SSPLv1; 8+ tri-license RSALv2/SSPLv1/AGPLv3; Stack modules folded into core in 8.0).

### elasticsearch
- Release notes — `https://www.elastic.co/docs/release-notes/elasticsearch` (opened; current 9.x line).
- Elastic docs home — `https://www.elastic.co/docs` (opened; Elastic Stack 9.x docs).
- Elastic 9.5 announcement — `https://www.elastic.co/blog/whats-new-elastic-9-5-0` (9.5 GA 2026-08-04; Columnar Mode technical preview; VectorDB index mode + auto-calibration; native Prometheus/PromQL).
- Elastic 9.1 announcement — `https://www.elastic.co/blog/whats-new-elastic-9-1-0` (BBQ on by default in 9.1).
- Semantic field reference — `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-field-reference` (`semantic` field type, GA in 9.5).
- Version status cross-checked against endoflife.date (9.5.6 released 2026-11-02; 9.4.9; 8.19.25 supported until 2027-07-15) and Elastic's Java4Shell advisory (discuss.elastic.co, 2026-11-18: 9.6.0 announced as an upcoming release, not yet shipped).
- Licensing FAQ — `https://www.elastic.co/pricing/faq/licensing` (2021 move to SSPL/ELv2 at 7.11; AGPLv3 added as a third option in 2024; default distribution under the Elastic License).

### opensearch
- Version history — `https://docs.opensearch.org/latest/version-history/` (opened; 3.10.0 released 2026-11-16; 3.9.0, 3.8.0, 3.7.0 incl. scoped API keys, 3.6.0, 3.5.0; 2.19.7 maintenance 2026-10-20).
- Docs home — `https://docs.opensearch.org/latest/about/` (version 3.10; Apache 2.0; OpenSearch Software Foundation).
- Search your data — `https://docs.opensearch.org/latest/getting-started/search-data/` (Query DSL, query string).
- Index maintenance — `https://docs.opensearch.org/latest/im-plugin/index-maintenance/` (refresh/flush/force merge/shrink/split).
- LTS program announcement — `https://opensearch.org/announcements/opensearch-software-foundation-strengthens-enterprise-readiness-with-new-long-term-support-versions/` (3.6 first LTS; 18-month minimum support; program starts with 2.19 and 3.6; announced 2026-04-16).
- Fork/licensing facts cross-checked against Wikipedia (`OpenSearch (software)`) and the Elastic licensing FAQ: fork of Elasticsearch/Kibana 7.10.2 announced 2021-04-12, 1.0 GA July 2021; governance moved to the OpenSearch Software Foundation (Linux Foundation) on 2024-09-16; 1-bit scalar quantization default in 3.6 confirmed via two secondary sources (Aiven, Eliatra).

### clickhouse
- 26.10 release notes — `https://clickhouse.com/blog/clickhouse-release-26-10` (26.10 released 2026-10-22; 104 features; function composition; flexible JOIN conditions; faster GROUP BY; disk spilling for IN subqueries; quota `written_rows` counter).
- 2025 changelog — `https://clickhouse.com/docs/whats-new/changelog/2025/` (opened; 25.12 DPsize join reordering; 25.7 lightweight UPDATE GA via patch parts; LTS cadence).
- 2026 changelog — `https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/CHANGELOG.md` (26.10: legacy analyzer removed, `enable_analyzer` obsolete).
- Version status cross-checked against endoflife.date (26.10.7.24 released 2026-11-19; LTS 26.8 until 2027-08-27; LTS 26.3 until 2027-03-26) and the 26.10 release call slides (presentations.clickhouse.com: Robin Hood hashing halves GROUP BY memory; `chdig` built into the binary).
- Client docs — `https://clickhouse.com/docs/concepts/features/interfaces/client` (native ports 9000/9440).
- INSERT INTO reference — `https://clickhouse.com/docs/reference/statements/insert-into`.
- Docs relaunch — `https://clickhouse.com/blog/clickhouse-docs-on-mintlify` (docs on Mintlify; docs MCP server at `https://clickhouse.com/mcp`).
- Docs index — `https://clickhouse.com/docs/llms.txt`.

## Validation output

Each skill validated individually with the filtered validator (registry check skipped by design — the coordinator regenerates the registry once at the end):

```text
=== redis ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== elasticsearch ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== opensearch ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== clickhouse ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

After a one-line factual fix in `clickhouse` (DPsize join reordering attributed to 25.12, not 26.10), re-validation passed again. Description lengths: redis 515, elasticsearch 480, opensearch 492, clickhouse 567 chars (all ≤ 1024). Line counts: 223 / 245 / 267 / 267 (all < 500). No unfiltered validate and no `npm run registry` were run.

## Decisions and notes

- **Version statements are dated, not permanent.** Each skill states the current stable line as of 2026-11-20 and points at the official release notes/changelog for what comes next, per the Phase 3 version-metadata decision.
- **Elasticsearch 9.6.0 is deliberately not targeted.** Elastic's 2026-11-18 Java4Shell advisory names 9.6.0 as an upcoming release; as of 2026-11-20 the latest stable is 9.5.6.
- **OpenSearch is written as its own system, not an Elasticsearch clone.** It has an extra section ("How OpenSearch differs from Elasticsearch") covering the fork (7.10.2, April 2021), licensing (Apache 2.0 vs Elastic's AGPLv3/SSPL/ELv2 tri-license), governance (OSSF/LF since 2024-09-16), and API drift (ISM vs ILM/SLM, PPL/SQL vs ES|QL, k-NN engines vs Elastic's vector stack). Every divergence claim was verified against official or reputable secondary sources; no benchmark claims are made.
- **Redis licensing is stated explicitly** because it affects adoption: BSD through 7.2, RSALv2/SSPLv1 only for 7.4, tri-license (including OSI-approved AGPLv3) from 8.0. Redis 8.0's end of support (2026-12-01) is flagged so new deployments do not start on it.
- **Link hygiene:** every URL in the four skills was returned verbatim by `browser.search`/`browser.open` against official domains, with one noted exception. Redis links the verified command reference, programmability, connection-URL, multi-key-operations, release-notes, and licenses pages (the `https://redis.io/docs/latest/` root itself is not linked). Elasticsearch links the verified `https://www.elastic.co/docs` home (opened successfully) and release notes. OpenSearch links the verified `https://docs.opensearch.org/latest/about/` docs home. The single exception is the ClickHouse docs home `https://clickhouse.com/docs/`: it was not opened directly, but its existence is confirmed by the Mintlify relaunch announcement ("refresh of clickhouse.com/docs") and by every verified `/docs/...` sub-path linked alongside it.
- **Examples use placeholder credentials only** (`${...}` / `YOUR_S3_*` style); no real secrets anywhere.
- **Cross-references verified against the registry:** `caching`, `observability`, `queues`, `background-jobs`, `backup-recovery`, `connection-pooling`, `database-security`, `transactions`, `migrations`, `mongodb`, `api-design` all exist in `registry/skills.json`.
- **Out of scope, left for the coordinator:** registry regeneration (`npm run registry`), full unfiltered validation, and any category README updates. `skills/upstream/` was not touched. No commits were made.
