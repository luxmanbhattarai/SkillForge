---
name: mongodb
description: >
  Use MongoDB effectively: document modeling, collections, indexes,
  aggregation pipelines, and queries. Use when building or maintaining an
  application backed by MongoDB, modeling document data, embedding versus
  referencing, writing aggregation pipelines, or debugging MongoDB queries
  and performance. Trigger keywords: MongoDB, Mongoose, document database,
  NoSQL, aggregation pipeline, Mongo query, collection.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# MongoDB

## Purpose

This skill covers practical MongoDB use for application developers: modeling data as documents, deciding when to embed and when to reference, writing correct queries and aggregation pipelines, indexing for the real access patterns, and avoiding the modeling mistakes that are expensive to undo.

## When to Use

- Building or maintaining an application that uses MongoDB as its primary database.
- Modeling document data: embedding subdocuments, referencing other collections, and choosing `_id` types.
- Writing queries, updates, and aggregation pipelines.
- Designing indexes for MongoDB access patterns, including compound and text indexes.
- Debugging slow queries, unexpected update behaviour, or schema drift across documents.
- Deciding whether MongoDB fits a new workload.

## When Not to Use

- When the data is strongly relational with many joins and strict integrity rules — use `postgresql` or `mysql` with `database-design`.
- When the target is a relational engine — use `postgresql`, `mysql`, or `sqlite`.
- When the task is only about ORM mapping for relational databases — use `prisma` or `drizzle`.
- When the task is only about backups — use `backup-recovery`; for access control and encryption, use `database-security`.

## Prerequisites

- A MongoDB server or Atlas cluster reachable from the project, or a local instance for development.
- A driver for the project's language (or an ODM such as Mongoose) and a client such as `mongosh` for inspection.
- The connection string stored as an environment variable such as `$DATABASE_URL`, never committed to the repository.
- Basic familiarity with JSON documents and JavaScript-style query operators.

## Official Documentation

- [MongoDB documentation](https://www.mongodb.com/docs/) — the authoritative reference for CRUD, aggregation, indexing, and administration.
- [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/) — managed clusters, networking, and backups.

## Required Workflow

1. List the application's access patterns first: which queries run, how often, and what they filter and sort by. Model for the queries, not for the entities in isolation.
2. Decide embed versus reference per relationship: embed data that is accessed together and does not grow without bound; reference data that is shared, large, or updated independently.
3. Define a schema for each collection (in code, with validation, or with JSON Schema validation) even though MongoDB does not require one — undocumented schemas drift.
4. Create indexes for the proven access patterns: equality fields first, then sort fields, then range fields, following the ESR guideline.
5. Write queries with the driver's parameterized form; never build a query by concatenating user input into operators or JSON.
6. Check slow queries with `explain("executionStats")` on representative data and look for `COLLSCAN` on large collections.
7. Use atomic update operators (`$set`, `$inc`, `$push`) instead of read-modify-write where the update must not race.
8. Use multi-document transactions only where atomicity across documents is genuinely required; prefer single-document atomicity by design.
9. Add schema validation to collections that hold critical data, starting in warn mode if the existing data is uncertain.
10. Test migrations (field renames, type changes, backfills) against a copy of production-like data before running them.

## Implementation Standards

- Every collection has a documented schema: field names, types, required fields, and the meaning of each field.
- `_id` is an `ObjectId` by default; use another type only when the domain supplies a stable, unique identifier.
- Embed when the child data is always fetched with the parent and is bounded in size; reference when it is shared or unbounded (comments, events, audit logs).
- Avoid unbounded arrays: an array that grows forever makes the document grow forever and eventually hits the document size limit.
- Store dates as BSON `Date`, money as integer minor units or `Decimal128`, and never as strings or floating point.
- Use consistent field naming (`snake_case` or `camelCase` by project convention) across all collections.
- Use update operators rather than replacing whole documents when only some fields change, so concurrent updates do not clobber each other.
- Create a unique index for every business identifier (email, slug, order number).
- Use `ObjectId` references (`authorId` holding an `ObjectId`) consistently, not a mix of string and `ObjectId` references to the same collection.
- Keep aggregation pipelines readable: one stage per concern, `$match` as early as possible, and `$project` to trim fields before expensive stages.

## Best Practices

- Model for the read path: the most frequent queries should be satisfiable from a single document or a single indexed query.
- Put `$match` and `$limit` early in aggregation pipelines so later stages process fewer documents.
- Use `explain("executionStats")` to confirm a query uses an index; a query that "works" on a small collection can scan millions of documents in production.
- Use change streams or application events for cross-collection consistency instead of assuming two writes always succeed together.
- Version documents (`schemaVersion` field) when the shape evolves, so readers can handle old and new shapes during a migration.
- Use bulk write operations for batch imports instead of one write per document.
- Monitor index usage and drop indexes that are never used; each index costs write performance and storage.

## Security Considerations

- Never build queries from unsanitized user input: an attacker who can inject operators (for example `{"$gt": ""}`) can bypass filters. Validate input types and use an allowlist of permitted operators.
- Connect with a least-privilege database user scoped to the application's database, and use TLS for any connection over a network.
- Store the connection string in an environment variable or a secret manager.
- Enable authentication and network allowlisting; never expose MongoDB to the public internet without authentication.
- Use field-level redaction or application-level filtering for sensitive fields; do not return whole documents to clients by default.
- Keep the server patched and review user roles regularly.

## Performance Considerations

- Index for the access patterns: equality, sort, range (ESR) order in compound indexes.
- Avoid `COLLSCAN` on large collections; a collection scan is acceptable only on small collections or for rare administrative queries.
- Keep documents reasonably small: large documents cost I/O on every read, even when only one field is needed. Use projection to fetch only needed fields.
- Avoid unbounded arrays and deeply nested structures that force the whole document to be rewritten on every update.
- Use the aggregation pipeline for server-side computation instead of fetching documents and processing them in the application.
- Use connection pooling with a bounded pool size; opening a connection per request is expensive.
- Shard only when a single replica set genuinely cannot hold the data or the write load; sharding adds operational complexity and limits some query patterns.

## Common Mistakes

- Treating "schemaless" as "no schema" — undocumented schemas drift until no one knows what a document contains; document and validate the schema.
- Embedding unbounded arrays — documents grow until updates slow down and the size limit is hit; reference instead.
- Storing dates as strings — string dates sort and compare incorrectly across formats; use BSON `Date`.
- Mixing `ObjectId` and string references to the same collection — joins and lookups silently miss.
- Forgetting that updates replace by default in some drivers — use `$set` for partial updates or a whole document is replaced.
- Building queries from raw user input — operator injection bypasses filters; validate and allowlist.
- Creating an index per query without checking overlap — compound indexes can serve several queries; redundant indexes slow writes.

## Examples

```js
// Example: embed bounded data (address), reference unbounded data (orders).
// A user document:
{
  _id: ObjectId("..."),
  email: "ada@example.com",
  address: { city: "Lisbon", country: "PT" },
  // Orders live in their own collection and reference the user.
}
```

```js
// Example: atomic update that cannot race with a concurrent writer.
await db.collection("books").updateOne(
  { _id: bookId },
  { $inc: { stock: -1 }, $set: { updatedAt: new Date() } }
);
```

```js
// Example: aggregation with $match early and projection before grouping.
await db.collection("orders").aggregate([
  { $match: { status: "paid", createdAt: { $gte: startDate } } },
  { $project: { customerId: 1, totalCents: 1 } },
  { $group: { _id: "$customerId", totalSpentCents: { $sum: "$totalCents" } } },
  { $sort: { totalSpentCents: -1 } },
  { $limit: 10 }
]).toArray();
```

```js
// Example: check whether a query uses an index.
await db.collection("orders")
  .find({ customerId: id })
  .explain("executionStats");
```

## Validation Checklist

- [ ] Every collection has a documented schema with field types and required fields.
- [ ] Embed-versus-reference decisions are recorded with the access pattern behind each one.
- [ ] No array is unbounded; large or growing child data lives in its own collection.
- [ ] Dates are BSON `Date`; money is integer minor units or `Decimal128`.
- [ ] Business identifiers have unique indexes.
- [ ] Hot queries were checked with `explain("executionStats")` and do not scan large collections.
- [ ] Queries are built from validated input; no raw user input reaches query operators.
- [ ] The application connects with a least-privilege user over TLS.

## Expected Deliverables

- The collection schemas with field definitions and the embed-versus-reference rationale.
- Index definitions for the proven access patterns.
- Query and pipeline code with `explain("executionStats")` output for hot queries.
- Notes on any schema validation rules added and how existing data was handled.

## References

- [MongoDB documentation](https://www.mongodb.com/docs/) — CRUD, aggregation, indexing, administration.
- [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/) — managed clusters and backups.
- Related skills in this repository: `database-design`, `indexing`, `sql-optimization`, `transactions`, `connection-pooling`, `backup-recovery`.
