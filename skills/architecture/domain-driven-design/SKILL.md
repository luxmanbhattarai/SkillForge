---
name: domain-driven-design
description: >
  Apply domain-driven design: ubiquitous language, bounded contexts,
  aggregates, entities, value objects, domain events, and repositories.
  Use when the task mentions domain-driven design, DDD, bounded context,
  aggregate, ubiquitous language, domain model, or modeling complex business
  rules in code.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Domain-Driven Design

## Purpose

Domain-driven design (DDD) aligns code with the business domain: the
language experts use becomes the language of the code, and business rules
live in a domain model instead of scattered through handlers. This skill
covers the strategic patterns (bounded contexts, ubiquitous language) and
the tactical patterns (aggregates, entities, value objects, domain events,
repositories) needed to model a complex domain well.

## When to Use

- Modeling a domain with complex business rules and invariants.
- The task mentions domain-driven design, DDD, bounded context, aggregate, ubiquitous language, or domain model.
- Untangling a codebase where business logic is scattered through controllers and services.
- Drawing module or service boundaries from the domain.

## When Not to Use

- A simple CRUD app with few business rules — DDD's patterns add ceremony without benefit.
- The task is only about service deployment and operations — use `microservices`.
- The task is only about code layout — use `modular-monolith` or `package-boundaries`.

## Prerequisites

- Access to domain experts (or written domain knowledge) to learn the real language and rules.
- Version range: none — this is a conceptual skill; it does not depend on a versioned tool or API.
- The core subdomain is identified: where the complexity and business value actually live.
- The team agrees to use the ubiquitous language in code, tests, and conversation.
- A persistence layer exists or is planned, so repositories can be defined against it.

## Official Documentation

- [Domain Language — Domain-Driven Design](https://www.domainlanguage.com/ddd/) — Eric Evans' DDD reference and resources.
- [Martin Fowler — DomainDrivenDesign](https://martinfowler.com/bliki/DomainDrivenDesign.html) — an overview of the approach.
- [Martin Fowler — BoundedContext](https://martinfowler.com/bliki/BoundedContext.html) — the bounded context pattern.
- [Martin Fowler — Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) — the aggregate pattern.

## Required Workflow

1. Learn the domain language: interview experts or read domain material, and write down the terms the business actually uses.
2. Identify the bounded contexts: the areas where a term has one consistent meaning (a "customer" in billing is not the same as a "customer" in support).
3. Draw a context map: the contexts, their relationships, and how they communicate (shared kernel, published language, anticorruption layer).
4. Within one context, identify the aggregates: clusters of objects that change together under one consistency rule, with one aggregate root.
5. Model entities (identity matters, lifecycle matters) and value objects (defined by their attributes, immutable) inside each aggregate.
6. Put business rules in the domain model: invariants enforced by the aggregate root, domain logic in methods named in the ubiquitous language.
7. Define repositories per aggregate root: the only way the application loads and saves aggregates.
8. Publish domain events for state changes other contexts or modules care about.
9. Keep the domain layer free of infrastructure: no database, HTTP, or framework imports in domain code.
10. Run the Validation Checklist.

## Implementation Standards

- The ubiquitous language is used in code: class, method, and variable names match the business terms.
- Aggregates enforce their invariants: an aggregate can never be saved in an invalid state.
- All access to an aggregate goes through its root; no outside code reaches into an aggregate's internals.
- Aggregates are small: one root plus the objects it must keep consistent, nothing more.
- Value objects are immutable and compared by value; entities are compared by identity.
- Repositories exist per aggregate root, not per entity; the repository interface lives in the domain layer, its implementation in infrastructure.
- Domain events are named in past tense (`OrderPlaced`, `PaymentReceived`) and carry the data subscribers need.
- Application services orchestrate (load aggregate, call domain method, save, publish events); they contain no business rules.
- The domain layer has no dependencies on infrastructure or frameworks.

## Best Practices

- Start with one context and one aggregate; expand the model as understanding grows.
- Use event storming or a similar collaborative modeling session with domain experts before coding the model.
- Write the ubiquitous language glossary in the repository and keep it current; new terms go through the glossary.
- Prefer small aggregates with eventual consistency between them over large aggregates with complex transactions.
- Let the model evolve: a first model is a hypothesis, and the experts will correct it.
- Keep an anticorruption layer at context boundaries so one context's model never leaks into another's.

## Security Considerations

- Authorization rules that are business rules (who may approve an order) belong in the domain model, where they cannot be bypassed by a different caller.
- Aggregates must validate their inputs; a caller that constructs an invalid aggregate is a bug the model should make impossible.
- Domain events can carry sensitive data; subscribers and event logs must handle them with the same care as the source data.
- The anticorruption layer also validates data crossing a context boundary; never trust another context's data blindly.

## Performance Considerations

- Small aggregates load and save faster and reduce lock contention; large aggregates are a performance and concurrency problem.
- Repositories should load only the aggregate needed, not the whole object graph.
- Domain events are cheap in-process; if they become a bottleneck, batch or move them to a queue.
- Avoid N+1 loading inside aggregates: the repository loads the aggregate's data in as few queries as the store allows.

## Common Mistakes

- Anemic domain models: entities with only getters and setters while all logic lives in services — the rules belong in the model.
- Aggregates that are too large (an "order" aggregate holding every line, payment, and shipment) — split by consistency boundary.
- One giant bounded context for the whole system — contexts exist to resolve conflicting meanings of the same word.
- Repositories per entity instead of per aggregate root — the aggregate is the unit of persistence.
- Infrastructure leaking into the domain (ORM annotations, HTTP types in domain classes) — the domain stays pure.
- Modeling without the experts — a model built from guesses encodes the guesses, not the business.

## Examples

An aggregate with an enforced invariant (TypeScript):

```ts
// Ubiquitous language: an Order has lines; its total is the sum of its lines.
// The invariant: an order cannot be placed with no lines or a zero total.
// OrderLine, OrderPlaced, and Money are defined in the same module;
// this excerpt shows the aggregate root only.
export class Order {
  private readonly lines: OrderLine[] = [];
  private status: "draft" | "placed" = "draft";

  constructor(private readonly id: string) {}

  addLine(productId: string, quantity: number, price: Money): void {
    if (this.status !== "draft") throw new Error("Cannot change a placed order");
    if (quantity <= 0) throw new Error("Quantity must be positive");
    this.lines.push(new OrderLine(productId, quantity, price));
  }

  place(): OrderPlaced {
    if (this.lines.length === 0) throw new Error("Cannot place an empty order");
    this.status = "placed";
    return new OrderPlaced(this.id, this.total());
  }

  total(): Money {
    return this.lines.reduce((sum, line) => sum.add(line.total()), Money.zero());
  }
}
```

A value object (immutable, compared by value):

```ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {}

  static of(amount: number, currency: string): Money {
    if (amount < 0) throw new Error("Money cannot be negative");
    return new Money(amount, currency);
  }

  static zero(): Money {
    return new Money(0, "USD");
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

## Validation Checklist

- [ ] Ubiquitous language glossary written and used in code.
- [ ] Bounded contexts identified and mapped, with relationships documented.
- [ ] Aggregates defined with roots, invariants, and small boundaries.
- [ ] Business rules live in the domain model, not in services or handlers.
- [ ] Repositories exist per aggregate root; domain layer has no infrastructure imports.
- [ ] Domain events published for state changes other contexts care about.
- [ ] Application services orchestrate only; they contain no business rules.
- [ ] Domain model reviewed with a domain expert or against domain documentation.

## Expected Deliverables

- The context map and ubiquitous language glossary.
- The domain model: aggregates, entities, value objects, and repositories.
- Domain events and their subscribers.
- Tests proving the invariants hold, including the failure cases.

## References

- [Domain Language — Domain-Driven Design](https://www.domainlanguage.com/ddd/)
- [Martin Fowler — DomainDrivenDesign](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Martin Fowler — BoundedContext](https://martinfowler.com/bliki/BoundedContext.html)
- [Martin Fowler — Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html)
- Related skills in this repository: `modular-monolith`, `microservices`, `package-boundaries`.
