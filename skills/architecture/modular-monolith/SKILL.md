---
name: modular-monolith
description: >
  Design and build a modular monolith: one deployable application split into
  well-bounded modules with explicit public interfaces, so it stays
  maintainable and can split into services later if needed. Use when the task
  mentions modular monolith, modules, module boundaries, monolith structure,
  or organizing a large single application without microservices.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Modular Monolith

## Purpose

A modular monolith is a single deployable application organized into
independent modules, each with its own domain logic, data access, and a
small public interface. It keeps the operational simplicity of a monolith
while preventing the tangled coupling that makes monoliths hard to change —
and it leaves the door open to extracting a service later.

## When to Use

- Building an application that is too big for one unstructured codebase but does not need microservices.
- The task mentions modular monolith, modules, module boundaries, or organizing a large app.
- Refactoring a tangled monolith into clear modules.
- The team is small and the domain boundaries are still being discovered.

## When Not to Use

- The system genuinely needs independent scaling or deployment per service — use `microservices`.
- The app is small (a handful of routes) — plain layering is enough; modules add ceremony.
- The task is about organizing code across repositories — use `monorepo`.
- The task is about domain modeling itself — use `domain-driven-design`.

## Prerequisites

- The domain areas (modules) are roughly known: billing, catalog, users, orders, and so on.
- One database is acceptable for the whole application (modules share the database but not each other's tables).
- The team agrees on the module rules before coding; boundaries only work when everyone enforces them.
- A language and framework that supports the chosen module structure (packages, namespaces, or folders).

## Official Documentation

- [Martin Fowler — MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) — why starting with a monolith is usually right.
- [Martin Fowler — Microservices](https://martinfowler.com/articles/microservices.html) — the alternative, and its costs.

## Required Workflow

1. Identify the modules from the domain: each module owns one business capability and its data.
2. Define each module's public interface: the functions or events other modules may use. Everything else is internal.
3. Lay out the code so modules are physically separate (one folder or package per module) with no shared "common" dumping ground.
4. Give each module its own data access: a module reads and writes only its own tables; it never queries another module's tables directly.
5. Connect modules through their public interfaces (function calls) or domain events (in-process events for side effects), never through shared internals.
6. Enforce boundaries mechanically: lint rules or import checks that fail the build when a module reaches into another's internals — see `package-boundaries`.
7. Keep cross-module data needs explicit: if module A needs data owned by module B, B exposes a query function or publishes an event; A does not join B's tables.
8. Decide the database story: one database, one schema per module or a shared schema with table ownership documented per module.
9. Document the module map: modules, their responsibilities, their public interfaces, and their dependencies.
10. Run the Validation Checklist.

## Implementation Standards

- A module's public interface is small and explicit: a single entry module (for example `index.ts`) exporting what other modules may use.
- Internal code is never imported across modules; the boundary is enforced by tooling, not by convention alone.
- Each module owns its tables; no module reads or writes another module's tables.
- Cross-module communication goes through the public interface or domain events; no shared mutable state between modules.
- Modules do not share a database transaction across boundaries unless the operation genuinely requires it; prefer eventual consistency via events.
- Shared infrastructure (logging, configuration, HTTP server setup) lives in a clearly marked infrastructure layer, not inside a domain module.
- A module's dependencies point one way: the dependency graph between modules must be acyclic.
- New features land in exactly one module; if a feature spans modules, define the interface change first.

## Best Practices

- Start with the modules the domain makes obvious; do not design ten modules for a three-feature app.
- Use domain events for side effects ("order placed" notifies billing and inventory) so modules stay loosely coupled.
- Keep the public interface stable: changing it is a deliberate, reviewed change, not a drive-by edit.
- Test modules in isolation with their public interface; integration tests cover the seams between modules.
- Review the module dependency graph regularly; a new dependency between modules should be a conscious decision.
- Resist the urge to extract a service early: a module that is cleanly bounded can be extracted later, when the need is proven.

## Security Considerations

- Authorization checks belong in the module that owns the resource; do not centralize them in a way that lets one module bypass another's checks.
- A module's internal data (its tables, its secrets) is not visible to other modules; treat cross-module access as a trust boundary.
- Shared infrastructure (authentication middleware, logging) must not leak one module's data into another's logs.
- A vulnerability in one module can affect the whole deployment since it is one process; keep dependencies updated across all modules.

## Performance Considerations

- In-process calls between modules are function calls: fast, with no network overhead — this is the monolith's main performance advantage.
- Domain events are in-process by default; keep event handlers fast and move slow work to background jobs.
- Database access stays efficient because modules share one database: transactions and joins work normally within a module.
- Avoid turning every cross-module call into an event; synchronous calls are fine for data a request needs immediately.

## Common Mistakes

- Modules that import each other's internals — the boundary is fiction; enforce it with tooling.
- A shared database accessed freely by all modules — each module owns its tables.
- One giant `shared` or `common` module that everything depends on — shared code should be minimal infrastructure, not domain logic.
- Circular module dependencies — the graph must be acyclic; a cycle means the boundary is wrong.
- Over-engineering the event system — an in-process event emitter is enough to start; a message broker comes later, if ever.
- Extracting services before the module boundaries are proven — a bad boundary becomes a bad service boundary.

## Examples

Module layout for an e-commerce app:

```text
src/
├── modules/
│   ├── catalog/        # products, categories
│   │   ├── index.ts    # public interface: listProducts, getProduct
│   │   ├── domain/     # internal: product rules
│   │   └── data/       # internal: product tables
│   ├── orders/         # orders, checkout
│   │   ├── index.ts    # public interface: placeOrder, getOrder
│   │   ├── domain/
│   │   └── data/
│   ├── billing/        # invoices, payments
│   │   └── index.ts
│   └── users/          # accounts, profiles
│       └── index.ts
├── events.ts           # in-process domain event bus
└── infra/              # logging, config, HTTP setup
```

A public interface (only `index.ts` is importable from other modules):

```ts
// modules/orders/index.ts — the module's public interface.
export { placeOrder } from "./domain/place-order";
export { getOrder } from "./domain/get-order";
export type { Order } from "./domain/order";
```

## Validation Checklist

- [ ] Modules identified from the domain, each owning one capability and its data.
- [ ] Each module exposes a small public interface; internals are not importable.
- [ ] Boundary enforcement is mechanical (lint or import checks) and fails the build.
- [ ] No module reads or writes another module's tables.
- [ ] Cross-module communication uses public interfaces or domain events only.
- [ ] Module dependency graph is acyclic.
- [ ] Module map documented: responsibilities, interfaces, dependencies.

## Expected Deliverables

- The module layout with public interfaces and enforced boundaries.
- The module map documentation.
- Boundary enforcement configuration (lint or import rules).
- Tests for modules in isolation and for the seams between them.

## References

- [Martin Fowler — MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
- Related skills in this repository: `domain-driven-design`, `package-boundaries`, `microservices`, `monorepo`.
