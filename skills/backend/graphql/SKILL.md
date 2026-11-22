---
name: graphql
description: >
  Design and build GraphQL APIs: schema-first development, queries, mutations,
  subscriptions, pagination with connections, DataLoader batching, and error
  handling. Use when creating or extending a GraphQL API, modeling a schema,
  fixing N+1 query problems, or deciding whether GraphQL fits a new service.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: "Requires Node.js 24 LTS or later and a GraphQL server library: GraphQL Yoga 6.x or Apollo Server 5.x."
---

# GraphQL

## Purpose

This skill covers building GraphQL APIs the schema-first way: designing a
typed schema, implementing resolvers, paginating with connections,
batching data access to avoid N+1 queries, and handling errors and
authentication. The outcome is a GraphQL API that clients can query
flexibly without over-fetching or under-fetching, and that stays
performant under real load.

## When to Use

- Creating a new GraphQL API or adding types and fields to an existing
  schema.
- Modeling a domain as a GraphQL schema with queries, mutations, and
  subscriptions.
- Fixing slow resolvers, N+1 queries, or over-fetching in an existing
  GraphQL service.
- Deciding whether GraphQL is the right API style for a new service.
- Adding authentication, authorization, or pagination to a GraphQL API.

## When Not to Use

- Building a simple resource API with fixed response shapes — `rest-api`
  is simpler and easier to cache.
- Building a type-safe RPC API inside a TypeScript monorepo — use
  `trpc`.
- Exposing a public API to third-party integrators who expect REST —
  use `rest-api` unless clients specifically ask for GraphQL.
- Designing the API contract in general — use `api-design` first.

## Prerequisites

- Familiarity with the GraphQL type system: object types, queries,
  mutations, input types, and the schema definition language.
- A Node.js project with a GraphQL server library installed: GraphQL
  Yoga 6.x (requires Node.js 22 or later and `graphql` 16 or later)
  or Apollo Server 5.x (`@apollo/server`) are the current choices.
  Apollo Server 4 reached end-of-life on 2026-01-26 — do not start
  new projects on it — and the legacy `apollo-server-express`
  package (v3) is long obsolete.
- A data layer (database, ORM, or service clients) that resolvers can
  call.

## Official Documentation

- [GraphQL Learn](https://graphql.org/learn/) — the official
  introduction to GraphQL concepts.
- [GraphQL Specification](https://spec.graphql.org/) — the authoritative
  definition of the language and execution model.
- [GraphQL Code](https://graphql.org/code/) — the official list of
  server and client libraries.
- [Apollo Server documentation](https://www.apollographql.com/docs/apollo-server)
  — a widely used GraphQL server implementation. Apollo Server 5 is
  the current, supported version; v4 is end-of-life.

## Required Workflow

1. Model the domain as a schema first: define types, queries, mutations,
   and input types in schema definition language before writing
   resolvers.
2. Review the schema for client needs: every query should answer a real
   client use case, and every field should be nullable only when the
   data can genuinely be absent.
3. Implement resolvers thinly: a resolver loads data and returns it;
   business logic lives in service modules.
4. Add DataLoader (or equivalent batching) for every resolver that loads
   a related entity by ID, so list queries do not become N+1 queries.
5. Add cursor-based pagination using the Relay connection pattern for
   every list field.
6. Add authentication to the request context and authorization checks
   inside resolvers (or a directive), per field where it matters.
7. Add query complexity limits and depth limits to prevent abusive
   queries.
8. Write tests for queries and mutations through the GraphQL endpoint,
   covering success, validation, and authorization failures.
9. Publish the schema and keep it versioned; evolve it by adding fields,
   never by changing or removing existing ones without deprecation.

## Implementation Standards

- Schema-first: the schema is the contract. Keep it in a `.graphql`
  file (or files) under version control and generate TypeScript types
  from it.
- Use `ID` for identifiers, `String` for opaque values, and custom
  scalars (such as `DateTime`) only when documented. Never expose
  internal database types.
- Mutations take a single `input` object and return a payload type
  carrying the affected object plus a `userErrors` or `errors` field,
  so clients can handle validation failures without exceptions.
- List fields use the connection pattern: `edges { node cursor }` and
  `pageInfo { hasNextPage endCursor }`, with `first` and `after`
  arguments.
- Make fields non-null (`String!`) when the data is always present;
  nullable fields signal genuine absence. Never make a field nullable
  just to avoid an error.
- Errors use the GraphQL `errors` array with a stable `extensions.code`
  (for example `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`,
  `NOT_FOUND`, `INTERNAL`) so clients can branch on them.
- Do not expose internal error messages in `extensions` for internal
  errors; log them server-side.
- Deprecate fields with the `@deprecated(reason: "...")` directive and
  keep them working until clients have migrated.
- Enforce a maximum query depth and a query complexity budget; reject
  queries that exceed them with a clear error.

## Best Practices

- Keep resolvers flat: a resolver should call one service function and
  return its result. Deep resolver chains hide the data flow.
- Batch and cache per request: create a fresh DataLoader per request so
  batching works without leaking data between requests.
- Design mutations around use cases (`updateOrderStatus`) rather than
  generic CRUD (`updateOrder` with twenty optional fields).
- Return the mutated object from mutations so clients can update their
  cache without a refetch.
- Use fragments on the client to share field selections; on the server,
  keep the schema DRY with shared input types.
- Monitor resolver-level performance: log slow resolvers and add
  indexes or batching where the data shows a bottleneck.
- Version the schema by evolution, not by URL: add fields, deprecate
  old ones, and remove them only after a documented sunset period.

## Security Considerations

- Authenticate at the request level and authorize inside resolvers:
  GraphQL has a single endpoint, so per-field authorization is the
  only real authorization.
- Limit query depth, complexity, and timeout: a deeply nested query
  can exhaust the server. Reject abusive queries before execution.
- Disable introspection in production unless clients genuinely need
  it; introspection reveals the whole schema.
- Validate all input arguments against the schema and business rules;
  never trust client-supplied IDs without an ownership check.
- Rate-limit by query cost, not just by request count: one expensive
  query can cost as much as hundreds of cheap ones.
- Never return internal errors, stack traces, or database details in
  the `errors` array.

## Performance Considerations

- Eliminate N+1 queries with DataLoader or equivalent batching on
  every relation resolver.
- Paginate every list field; never return an unbounded list.
- Use query complexity analysis to reject expensive queries before
  they run.
- Cache aggressively at the data layer: per-request caching via
  DataLoader, and shared caching (see `caching`) for hot, public data.
- Prefer a single batched database query over many small ones, and add
  indexes for the columns resolvers filter and sort on.
- Consider persisted queries for production clients: they reduce
  payload size and make the allowed query set explicit.

## Common Mistakes

- Writing resolvers that each run a database query — a list of 100
  items with a nested field becomes 101 queries. Batch with DataLoader.
- Making everything nullable — clients end up with defensive checks
  everywhere. Use non-null types where the data is guaranteed.
- Returning plain objects from mutations with no error channel —
  clients cannot distinguish validation failure from success. Return a
  payload type with an errors field.
- Changing or removing a field without deprecation — breaks clients
  silently. Deprecate first, remove later.
- Skipping query limits — a malicious or buggy client can send a
  deeply nested query and take the server down. Enforce depth and
  complexity limits.
- Putting authorization only at the HTTP layer — a valid token is not
  authorization for every field. Check ownership inside resolvers.

## Examples

Schema-first definition with a connection and a mutation payload:

```graphql
type Query {
  orders(first: Int = 20, after: String): OrderConnection!
}

type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
}

type OrderEdge {
  node: Order!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type Order {
  id: ID!
  status: String!
  totalMinor: Int!
  currency: String!
}

type Mutation {
  cancelOrder(input: CancelOrderInput!): CancelOrderPayload!
}

input CancelOrderInput {
  orderId: ID!
}

type CancelOrderPayload {
  order: Order
  errors: [UserError!]!
}

type UserError {
  field: String
  message: String!
}
```

## Validation Checklist

- [ ] The schema is in version control and TypeScript types are
      generated from it.
- [ ] Every list field paginates with the connection pattern.
- [ ] Relation resolvers batch with DataLoader (no N+1 queries in a
      list query).
- [ ] Mutations return a payload type with an errors field.
- [ ] Query depth and complexity limits are enforced.
- [ ] Authorization is checked inside resolvers, per field where it
      matters.
- [ ] Introspection is disabled in production (or explicitly justified).
- [ ] Tests cover success, validation, and authorization failures for
      each operation.

## Expected Deliverables

- A schema file (`.graphql`) with queries, mutations, and types.
- Implemented resolvers with batching and pagination.
- Tests exercising the API through the GraphQL endpoint.
- Documentation of the schema, deprecations, and any query limits.

## References

- [GraphQL Learn](https://graphql.org/learn/)
- [GraphQL Specification](https://spec.graphql.org/)
- [GraphQL Code](https://graphql.org/code/)
- [Apollo Server documentation](https://www.apollographql.com/docs/apollo-server)
  (Apollo Server 5 current; v4 end-of-life 2026-01-26)
- Related skills in this repository: `api-design`, `rest-api`, `trpc`,
  `caching`, `rate-limiting`.
