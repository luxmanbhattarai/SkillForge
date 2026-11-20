---
name: microservices
description: >
  Design and build microservices: service boundaries, inter-service
  communication, data ownership, resilience, and observability. Use when the
  task mentions microservices, services, service boundaries, splitting a
  monolith into services, inter-service communication, service discovery, or
  independent deployment and scaling per service.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Microservices

## Purpose

Microservices split a system into small, independently deployable services
that own their data and communicate over the network. This skill covers
drawing service boundaries from the domain, choosing communication patterns,
keeping services resilient and observable, and knowing when the costs are
worth paying.

## When to Use

- The system needs independent scaling or deployment per capability.
- Separate teams own separate capabilities and need to release independently.
- The task mentions microservices, service boundaries, splitting a monolith, or inter-service communication.
- Fixing microservice problems: cascading failures, tangled service calls, or data inconsistency.

## When Not to Use

- The team is small and the domain is still being discovered — use `modular-monolith` first.
- The app is a single product with one team — a monolith is simpler to build, test, and operate.
- The task is only about code organization within one deployment — use `modular-monolith` or `package-boundaries`.
- The task is only about domain modeling — use `domain-driven-design`.

## Prerequisites

- The domain boundaries are understood well enough to draw service lines; see `domain-driven-design`.
- The operational baseline exists: CI/CD, containerization, logging, metrics, and tracing across services.
- The team accepts the costs: network calls, distributed debugging, eventual consistency, and per-service operations.
- A deployment platform that can run many small services (containers, serverless, or a platform service).

## Official Documentation

- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) — the defining article on the style and its trade-offs.
- [Martin Fowler — MicroservicePrerequisites](https://martinfowler.com/bliki/MicroservicePrerequisites.html) — what must be in place first.
- [Microsoft Azure Architecture — Microservices](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices) — architecture guidance and patterns.

## Required Workflow

1. Confirm microservices are justified: name the concrete need (independent scaling, team autonomy, different technology) that a modular monolith cannot meet.
2. Draw boundaries from the domain (bounded contexts), not from technical layers: one service per business capability.
3. Assign data ownership: each service owns its database; no service reads another service's database directly.
4. Choose communication per interaction: synchronous request/response (HTTP or gRPC) when the caller needs an immediate answer; asynchronous events when it does not.
5. Define each service's API contract (endpoints, messages, events) and version it; consumers depend on the contract, not the implementation.
6. Design for failure: timeouts on every call, retries with backoff for transient failures, circuit breakers for failing dependencies, and graceful degradation.
7. Add observability from the start: structured logs with a correlation ID, metrics per service, and distributed tracing across service calls.
8. Decide the consistency model per workflow: strong consistency within a service, eventual consistency across services, with sagas or outbox patterns for multi-service writes.
9. Set up independent deployment: each service has its own pipeline, and deploys do not require coordinating other services.
10. Run the Validation Checklist.

## Implementation Standards

- One service owns one business capability and its data; a service that is only a CRUD wrapper around a shared table is not a microservice.
- No shared databases between services; data sharing happens through APIs or events.
- Service APIs are versioned; breaking changes ship as a new version with a migration window.
- Every outbound call has a timeout, a retry policy for transient errors only, and a circuit breaker.
- Services are stateless where possible; state lives in the service's own store so instances can scale horizontally.
- Configuration comes from the environment; no hard-coded service URLs — use service discovery or configuration.
- Authentication between services uses signed tokens or mutual TLS, not shared secrets passed in plain headers.
- Each service has its own repository or its own package in a monorepo, its own pipeline, and its own owner.

## Best Practices

- Keep the service count small: start with the fewest services that meet the need, and split only when a boundary proves wrong.
- Prefer events over synchronous chains: a request that calls five services in sequence inherits all five failure modes.
- Make APIs idempotent where retries are possible, so a retried request does not double-charge or double-create.
- Use the outbox pattern for "write to my database and publish an event" so the two stay consistent.
- Document the service map: services, their owners, their APIs, and their dependencies.
- Test contracts, not just services: consumer-driven contract tests catch breaking API changes before deployment.

## Security Considerations

- Every service boundary is a trust boundary: authenticate and authorize each call, even inside the private network.
- Never pass a user's credentials between services; propagate a short-lived token scoped to the request.
- Secrets are per service and scoped to what that service needs; a compromised service must not yield the whole system's secrets.
- Validate input at every service boundary; a service must not trust data just because it came from another internal service.
- Log security events per service with the correlation ID so an attack can be traced across the call chain.

## Performance Considerations

- Network calls are the dominant cost: minimize the number of services in a request path and the chattiness of their APIs.
- Cache data a service needs frequently instead of calling another service on every request, and accept the staleness explicitly.
- Timeouts must be short and budgeted: the total timeout budget along a call chain must stay under the client's timeout.
- Asynchronous processing (queues, events) absorbs bursts that synchronous calls cannot.
- Monitor latency per service and per dependency; a slow downstream service becomes the system's latency.

## Common Mistakes

- Splitting by technical layer (a "database service", a "frontend service") instead of by business capability.
- Sharing a database between services — the services are coupled at the data layer and cannot evolve independently.
- Synchronous chains of many services — one slow service slows everything, and one failure cascades.
- No timeouts or retries — a hung dependency hangs the caller indefinitely.
- Distributed transactions across services — use sagas or eventual consistency instead.
- Splitting too early, before the domain boundaries are understood — wrong boundaries are expensive to fix across a network.
- No distributed tracing — debugging a failure across five services without a correlation ID is guesswork.

## Examples

Service boundary sketch for an e-commerce system:

```text
catalog-service   — products, categories, search        (owns product data)
orders-service    — orders, checkout                    (owns order data)
billing-service   — invoices, payments                  (owns billing data)
users-service     — accounts, profiles                  (owns user data)

orders-service calls catalog-service (HTTP) to validate items at checkout.
orders-service publishes OrderPlaced; billing-service consumes it to invoice.
No service reads another service's database.
```

Resilience checklist per outbound call:

```text
- Timeout set (short, budgeted against the client timeout).
- Retry with backoff, only for transient failures (timeouts, 5xx), with a cap.
- Circuit breaker: stop calling a failing dependency and fail fast.
- Fallback: degraded response (cached data, partial result) where the product allows it.
- Idempotency key on requests that mutate, so retries are safe.
```

## Validation Checklist

- [ ] Service boundaries drawn from business capabilities, with a written justification.
- [ ] Each service owns its data; no shared databases.
- [ ] API contracts defined and versioned per service.
- [ ] Every outbound call has a timeout, retry policy, and circuit breaker.
- [ ] Correlation IDs, structured logs, metrics, and tracing in place.
- [ ] Consistency model decided per workflow; sagas or outbox where needed.
- [ ] Independent deployment pipelines per service.
- [ ] Service-to-service authentication in place.

## Expected Deliverables

- The service map: services, owners, APIs, data ownership, and dependencies.
- Service contracts (API and event definitions) with versioning.
- Resilience configuration for inter-service calls.
- Observability setup: logging, metrics, and tracing across services.

## References

- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html)
- [Martin Fowler — MicroservicePrerequisites](https://martinfowler.com/bliki/MicroservicePrerequisites.html)
- [Microsoft Azure Architecture — Microservices](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
- Related skills in this repository: `domain-driven-design`, `modular-monolith`, `monorepo`, `system-design`.
