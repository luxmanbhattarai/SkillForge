---
name: system-design
description: >
  Design software systems end to end: requirements, capacity estimation,
  data modeling, API design, scaling, availability, consistency, and
  trade-off documentation. Use when the task mentions system design,
  architecture design, designing a system, scalability, high availability,
  capacity planning, load balancing, caching strategy, or choosing between
  architectural approaches for a new system.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# System Design

## Purpose

System design turns requirements into an architecture: the components, the
data model, the APIs, and the trade-offs, documented well enough that a
team can build it. This skill covers a repeatable design process — clarify
requirements, estimate scale, design the data and API, then design for
scale, availability, and failure — and records decisions so they can be
revisited.

## When to Use

- Designing a new system or a major new part of one.
- The task mentions system design, architecture, scalability, high availability, capacity planning, or caching strategy.
- Choosing between architectural approaches (monolith vs services, SQL vs NoSQL, sync vs async).
- Reviewing an existing system for scaling or reliability risks.

## When Not to Use

- The task is only about code layout within one app — use `modular-monolith` or `package-boundaries`.
- The task is only about service boundaries and operations — use `microservices`.
- The task is only about domain modeling — use `domain-driven-design`.
- The system is a small single-app project — a full design document is overkill; a short README section is enough.

## Prerequisites

- The problem is stated: what the system does and for whom.
- Version range: none — this is a conceptual skill; it does not depend on a versioned tool or API.
- The scale is roughly known or can be estimated: users, requests, data volume, growth.
- The constraints are known: budget, team size, compliance, latency requirements, existing systems to integrate with.
- The decision-makers are available to confirm requirements and trade-offs.

## Official Documentation

- [AWS Architecture Center](https://aws.amazon.com/architecture/) — reference architectures and well-architected guidance.
- [Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/) — architecture guides and patterns.
- [Designing Data-Intensive Applications (book site)](https://dataintensive.net/) — the reference on data systems, reliability, and scale.
- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) — service architecture trade-offs.

## Required Workflow

1. Clarify requirements: functional (what the system does) and non-functional (scale, latency, availability, consistency, durability). Write them down and confirm them.
2. Estimate scale with back-of-envelope math: users, requests per second, reads vs writes, data volume, and growth. State every assumption.
3. Design the data model: entities, relationships, and access patterns first; choose the store (relational, document, key-value, search) from the access patterns, not the other way around.
4. Design the API: resources, operations, and contracts; decide synchronous vs asynchronous per interaction.
5. Draw the component diagram: clients, load balancer, services, stores, caches, queues, and external integrations, with the data flow between them.
6. Design for scale: identify the bottleneck (usually the database), and plan caching, read replicas, sharding, or queueing where the estimates say it is needed — not before.
7. Design for availability and failure: redundancy, health checks, timeouts, retries, circuit breakers, graceful degradation, and backups with tested restores.
8. Decide consistency per workflow: strong where the business requires it (payments), eventual where it can tolerate it (feeds, analytics).
9. Record the decisions and trade-offs in an architecture decision record (ADR) or design document, with the alternatives considered and why they were rejected.
10. Run the Validation Checklist.

## Implementation Standards

- Requirements and assumptions are written down before the design; a design without stated assumptions cannot be reviewed.
- The data model follows access patterns: design the queries first, then the schema.
- Every component has one owner and one responsibility; the diagram shows ownership.
- Single points of failure are named explicitly; each one is either removed or accepted with a reason.
- The design states its scaling limits: what breaks first, and at what scale.
- APIs are versioned and documented; internal contracts are as explicit as public ones.
- Backups exist for every store that holds data worth keeping, and restores are tested.
- The design document is a living artifact: update it when the system changes, or it becomes misleading.

## Best Practices

- Design for the scale you have plus the next order of magnitude, not for a scale you may never reach.
- Prefer boring, proven technology for the core; reserve novel choices for the part that genuinely needs them.
- Start with a modular monolith and extract services only when the design shows a concrete need — see `modular-monolith` and `microservices`.
- Use queues to decouple slow or bursty work from the request path.
- Cache deliberately: name what is cached, where, for how long, and how it is invalidated.
- Make the design reviewable: a diagram, a data model, an API sketch, and a trade-off list beat a long prose document.
- Revisit the design when the estimates change; a design is a hypothesis about scale.

## Security Considerations

- Security is part of the design, not a later phase: authentication, authorization, encryption in transit and at rest, and secret management are design decisions.
- Every external integration is a trust boundary: validate input, authenticate, and limit what the integration can do.
- Data classification drives storage decisions: sensitive data needs encryption, access controls, and retention rules from the start.
- Multi-tenant designs need isolation designed in, not added later — see `multi-tenancy`.
- Logging and audit trails are designed in: what is logged, where, and for how long.

## Performance Considerations

- Latency budgets are set per component and summed along the request path; the total must fit the product's requirement.
- The database is usually the bottleneck: index for the access patterns, cache hot reads, and avoid N+1 queries.
- Caching layers (CDN, application cache, database cache) each need an invalidation strategy; a cache without one serves stale data indefinitely.
- Asynchronous work (queues, background jobs) keeps the request path fast and absorbs bursts.
- Measure after building: the design's estimates are hypotheses until load testing confirms them.

## Common Mistakes

- Designing for a scale the system will never reach — premature distribution is the most expensive mistake.
- Choosing the database before the access patterns — the store should follow the queries.
- No written requirements or assumptions — the design cannot be reviewed or revisited.
- Ignoring failure modes — a design that only describes the happy path is incomplete.
- Strong consistency everywhere — it costs latency and availability; use it only where the business requires it.
- A design document that is never updated — it becomes fiction and misleads the next engineer.
- Overlooking the operational side — a design without a plan for deployment, monitoring, and incident response is half a design.

## Examples

Back-of-envelope estimation (worked example, assumptions stated):

```text
Assumptions: 100,000 daily active users; each makes 20 requests a day.
Requests: 100,000 x 20 = 2,000,000 per day, about 23 per second average.
Peak: assume 3x average, about 70 requests per second.
Reads vs writes: 90% reads, 10% writes.
Storage: 1,000 new records per day at 2 KB each = 2 MB per day, under 1 GB per year.
Conclusion: one application server and one database handle this comfortably;
caching and read replicas are not needed yet. Revisit at 10x this scale.
```

Design document outline:

```text
1. Requirements (functional and non-functional) and assumptions
2. Scale estimates (users, requests, storage, growth)
3. Data model (entities, access patterns, store choice)
4. API design (resources, operations, contracts)
5. Component diagram and data flow
6. Scaling plan (bottlenecks, caching, replication)
7. Availability and failure handling (redundancy, degradation, backups)
8. Consistency decisions per workflow
9. Security design (auth, encryption, secrets, audit)
10. Trade-offs and alternatives considered
```

## Validation Checklist

- [ ] Requirements and assumptions written and confirmed.
- [ ] Scale estimated with stated assumptions.
- [ ] Data model designed from access patterns; store choice justified.
- [ ] API contracts sketched; sync vs async decided per interaction.
- [ ] Component diagram drawn with data flow and ownership.
- [ ] Bottlenecks identified; scaling plan covers the first bottleneck.
- [ ] Failure modes named; redundancy, degradation, and backups planned.
- [ ] Consistency decided per workflow.
- [ ] Decisions and trade-offs recorded in a design document or ADR.

## Expected Deliverables

- The design document (requirements, estimates, data model, API, diagram, trade-offs).
- Architecture decision records for the significant choices.
- A scaling and failure-handling plan.
- Open questions listed with owners and due dates.

## References

- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [Microsoft Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)
- [Designing Data-Intensive Applications](https://dataintensive.net/)
- Related skills in this repository: `modular-monolith`, `microservices`, `domain-driven-design`, `monorepo`.
