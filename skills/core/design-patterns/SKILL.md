---
name: design-patterns
description: >
  Apply classic design patterns — creational, structural, and behavioural
  — to recurring design problems. Use when a design problem feels familiar
  (object creation, adapters, observers, strategies, factories), when
  choosing between patterns, or when reviewing code that reinvents a
  well-known solution. Covers pattern selection, trade-offs, and when
  not to use a pattern.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Design Patterns

## Purpose

This skill helps you recognise recurring design problems and solve them
with proven patterns instead of inventing a one-off solution. The goal is
shared vocabulary and predictable structure: when a reader sees a Strategy
or an Adapter, they already know how it behaves.

## When to Use

- A design problem recurs: interchangeable algorithms, object creation
  with varying types, event notification, or wrapping an incompatible API.
- Reviewing code that solves a known problem in an ad-hoc way.
- Choosing between two ways to structure a feature and wanting the
  trade-offs named.
- Onboarding onto a codebase that already uses named patterns.

## When Not to Use

- For the overall system structure — use `software-architecture`.
- For a simple problem a plain function solves — patterns add indirection,
  and indirection has a cost.
- For naming or readability issues — use `clean-code`.
- For restructuring existing code — use `refactoring`.

## Prerequisites

- A concrete design problem, not a pattern chosen in advance.
- Familiarity with the language's idioms; many patterns are built into
  modern languages (for example, iterators and callbacks) and should not
  be reimplemented.
- The codebase's existing conventions for where shared abstractions live.
- Conceptual skill; version range: none — patterns are
  language-independent; the catalogues linked in Official Documentation
  are versionless.

## Official Documentation

- [Refactoring Guru: Design Patterns](https://refactoring.guru/design-patterns) —
  the most accessible catalogue, with intent, structure, and trade-offs
  for each pattern.
- [Refactoring.com](https://refactoring.com/) — related catalogues of
  smells and refactorings that often lead to a pattern.
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) —
  language features (closures, classes, modules) that implement patterns
  idiomatically.

## Required Workflow

1. Name the problem precisely: what varies, what must stay stable, and
   who depends on whom.
2. Check whether the language or framework already solves it idiomatically.
   If it does, use that; do not build a pattern on top.
3. Shortlist at most two candidate patterns and compare them on the
   actual problem, not on familiarity.
4. Choose the simplest option that handles the variation you can
   demonstrate today — not the variation you imagine next year.
5. Implement the pattern in its standard shape so readers recognise it;
   do not invent a private variant.
6. Name the participants after the pattern's roles where it aids
   recognition (for example `PaymentStrategy`, `LegacyApiAdapter`).
7. Write tests that exercise the variation the pattern exists to support
   (see `tdd`).
8. Document the choice in a short comment or ADR if the reasoning is not
   obvious from the code (see `technical-decision-records`).

## Implementation Standards

- Creational: use a Factory when creation logic varies by type; use a
  Builder when an object has many optional parts; avoid Singleton unless
  the single instance is a genuine requirement — prefer dependency
  injection.
- Structural: use an Adapter to wrap an incompatible interface you do
  not control; use a Facade to simplify a complex subsystem's public
  surface; use a Decorator to add behaviour without subclassing.
- Behavioural: use Strategy for interchangeable algorithms; use Observer
  (or events) for one-to-many notification; use Command when an action
  must be queued, undone, or logged; use Template Method sparingly —
  composition usually beats inheritance.
- Prefer composition over inheritance: most patterns exist to replace
  inheritance hierarchies with composed objects.
- Keep the pattern's participants small and focused; a pattern with
  ten collaborators is usually a design smell.
- Never apply a pattern "in case" it is needed later. Patterns are
  responses to real variation, not insurance.

## Best Practices

- Learn the problem a pattern solves, not just its class diagram; the
  diagram without the problem leads to cargo-cult use.
- Introduce a pattern at the second occurrence of a problem, not the
  first — the first occurrence is usually fine as straightforward code.
- Keep pattern use visible: a reader should be able to find the
  Strategy implementations by searching for the interface name.
- Combine patterns deliberately (for example, Factory producing
  Strategies) rather than stacking them by accident.
- When a pattern makes the code harder to follow for the team, the
  pattern is wrong for that team, whatever the textbook says.

## Security Considerations

- Factory and Builder inputs must still be validated; a pattern does
  not sanitise data.
- Observer/event systems must not leak sensitive payloads to subscribers
  that should not see them; filter the event data at publication time.
- Proxy and Decorator layers are good places to add authorisation
  checks — but the check must also exist at the trust boundary, not only
  in the wrapper.
- See `security` for the full checklist.

## Performance Considerations

- Most patterns add a small indirection cost that is negligible; do not
  avoid a pattern for performance reasons without measuring.
- Observer chains can become expensive if many subscribers do heavy work
  synchronously; make slow subscribers asynchronous or debounced.
- Flyweight and object pooling help only when object creation is proven
  to be a bottleneck — profile first (see `performance`).

## Common Mistakes

- Pattern-first design — choosing the pattern before understanding the
  problem, then bending the problem to fit.
- Singleton abuse — global mutable state hidden behind a pattern name;
  it couples everything and resists testing.
- Over-engineering for imagined variation — building a Strategy
  hierarchy for one algorithm that will never change.
- God Object dressed as a Facade — a Facade should simplify, not hide a
  2,000-line class.
- Reimplementing what the language provides — hand-rolled Observer
  classes in a language with events, or hand-rolled iterators where the
  language has them built in.
- Inconsistent naming — calling the same role different names in
  different places so readers cannot recognise the pattern.

## Examples

Strategy: interchangeable pricing rules, selected at runtime.

```ts
interface PricingStrategy {
  price(base: number): number;
}

class StandardPricing implements PricingStrategy {
  price(base: number) {
    return base;
  }
}

class LoyaltyPricing implements PricingStrategy {
  price(base: number) {
    return base * 0.9;
  }
}

function checkoutTotal(base: number, strategy: PricingStrategy): number {
  return strategy.price(base);
}
```

Adapter: wrap an incompatible third-party client behind your interface.

```ts
interface Notifier {
  send(to: string, message: string): Promise<void>;
}

// Third-party client has a different method shape.
class LegacySmsAdapter implements Notifier {
  constructor(private client: LegacySmsClient) {}

  async send(to: string, message: string): Promise<void> {
    await this.client.sendMessage({ recipient: to, body: message });
  }
}
```

## Validation Checklist

- [ ] The problem the pattern solves is stated and demonstrable.
- [ ] The language or framework does not already solve it more simply.
- [ ] The pattern follows its standard shape and naming.
- [ ] Tests exercise the variation the pattern exists to support.
- [ ] No pattern was added speculatively for future needs.
- [ ] A reader can find all participants by searching for the shared
      interface or base name.

## Expected Deliverables

- The implemented pattern with standard naming and tests covering the
  variation it supports.
- A brief note (comment or ADR) explaining why this pattern was chosen
  over the alternatives.

## References

- [Refactoring Guru: Design Patterns](https://refactoring.guru/design-patterns) —
  pattern catalogue with intent and trade-offs.
- [Refactoring.com](https://refactoring.com/) — smells and refactorings.
- Related skills in this repository: `software-architecture`,
  `clean-code`, `refactoring`, `tdd`.
