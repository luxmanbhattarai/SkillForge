---
name: performance
description: >
  Measure, diagnose, and improve software performance: profiling,
  bottleneck analysis, caching, and load testing. Use when pages are
  slow, APIs time out, costs spike, or a system must meet a latency or
  throughput target. Covers measurement before optimisation, Core Web
  Vitals, database and network performance, and regression prevention.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Performance

## Purpose

This skill makes performance work evidence-based: measure first, find the
real bottleneck, fix it, and verify the improvement. Optimisation without
measurement wastes effort on code that was never slow, so every change
here is driven by data and checked against a target.

## When to Use

- Pages, APIs, or jobs are slower than the target or than users accept.
- Latency, throughput, memory, or cost must meet a stated budget.
- A system needs to handle more load than it does today.
- Investigating a sudden slowdown or a resource that grows without bound.
- Before shipping a feature that adds significant work to a hot path.

## When Not to Use

- For a functional bug with no performance angle — use `debugging`.
- For code readability — use `clean-code`.
- For architecture choices — use `software-architecture`.
- When there is no stated target and no user complaint — measure first,
  and do not optimise on speculation.

## Prerequisites

- A measurable target: a latency budget, throughput goal, or resource
  limit, agreed before work starts.
- A reproducible workload or benchmark that represents real usage.
- Access to profiling and monitoring tools for the stack in use.
- A baseline measurement taken before any change.
- Conceptual skill; version range: none — applies to any stack; the
  Core Web Vitals thresholds it cites are the current Google thresholds
  (see Official Documentation).

## Official Documentation

- [web.dev Performance](https://web.dev/performance/) — Google's guides
  on web performance, including Core Web Vitals.
- [MDN Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance) —
  concepts, APIs, and measurement for web performance.
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance) —
  profiling pages in the browser.
- [Node.js: tracing garbage collection](https://nodejs.org/en/learn/diagnostics/memory/using-gc-traces) —
  GC traces for diagnosing memory issues in Node.js.

## Required Workflow

1. Define the target in numbers: for example, "p95 API latency under
   200 ms" or "Largest Contentful Paint under 2.5 seconds (p75, real
   users) on a mid-range phone".
2. Measure the baseline with a realistic workload and record it.
3. Profile to find the bottleneck: CPU, memory, network, database, or
   rendering. Do not guess.
4. Rank the findings by impact and fix the largest bottleneck first.
5. Change one thing at a time and re-measure after each change.
6. Verify the improvement against the target and confirm no regression
   elsewhere (correctness, memory, cost).
7. Add a regression guard where it matters: a performance budget, a
   benchmark in CI, or an alert on the metric.
8. Document the before-and-after numbers in the pull request.

## Implementation Standards

- Measure before and after every optimisation; an unmeasured change is
  not an optimisation.
- Optimise the bottleneck, not the code that looks slow. Profile data
  decides what is slow.
- Set budgets, not vibes: every page, endpoint, and job gets a numeric
  target that can be checked.
- Prefer algorithmic and structural fixes (fewer queries, less data,
  less work) over micro-optimisations.
- Cache deliberately: name what is cached, where, for how long, and how
  it is invalidated. Accidental caching is a correctness bug.
- Paginate every list endpoint and cap every unbounded collection.
- Database queries on hot paths are reviewed for indexes and for the
  N+1 pattern (one query per item in a loop).

## Best Practices

- Front-end: ship less JavaScript, lazy-load below-the-fold work, and
  optimise images (modern formats, responsive sizes, lazy loading).
- Back-end: keep hot paths free of unnecessary I/O; batch and parallelise
  independent calls where the API allows it.
- Database: select only the columns you need; add indexes for the
  queries you actually run; avoid `SELECT *` on wide tables.
- Use compression and HTTP caching headers for static assets.
- Monitor in production, not only in the lab: real-user metrics catch
  what synthetic tests miss.
- Record performance decisions (budgets, caching strategy) where the
  team can find them — see `technical-decision-records`.

## Security Considerations

- Performance work must not weaken security: do not cache authenticated
  or personalised responses for other users, and do not skip validation
  to save time.
- Rate limiting and timeouts protect performance as well as security;
  keep them in place.
- Profiling data and traces can contain sensitive values; handle them
  as carefully as logs.
- See `security` for the full checklist.

## Performance Considerations

- This skill is itself the performance guidance; apply its workflow to
  every optimisation.
- The most common wins are: fewer network requests, less data
  transferred, fewer database queries, and less JavaScript shipped.
- Always re-measure after a change; optimisations sometimes make things
  slower, and only measurement reveals that.

## Common Mistakes

- Optimising without measuring — the classic waste of effort.
- Premature optimisation — complicating code for a bottleneck that
  does not exist.
- Optimising the wrong layer — tuning JavaScript when the database is
  the bottleneck.
- Caching without an invalidation plan — stale data is a correctness bug.
- Testing only on fast hardware and fast networks — real users are on
  slower devices and connections.
- Chasing a single metric while ignoring others — a faster page that
  uses twice the memory is not a clear win.
- One-off fixes with no regression guard — the same slowdown returns
  in the next release.

## Examples

Finding the N+1 pattern and fixing it with a single query:

```ts
// Slow: one query per order (N+1).
for (const order of orders) {
  order.items = await db.items.findByOrderId(order.id);
}

// Faster: one query for all items, grouped in memory.
const items = await db.items.findByOrderIds(orders.map((o) => o.id));
const byOrder = groupBy(items, (i) => i.orderId);
for (const order of orders) {
  order.items = byOrder[order.id] ?? [];
}
```

A performance budget stated as a checkable target:

```text
Homepage budget:
  - Largest Contentful Paint under 2.5 s (p75, real users)
  - Interaction to Next Paint under 200 ms (p75, real users)
  - Total JavaScript under 200 KB compressed
  - No more than 3 render-blocking requests

Interaction to Next Paint (INP) replaced First Input Delay (FID) as a
Core Web Vital in March 2024; do not set budgets against FID.
```

Measuring with a simple timing wrapper:

```ts
const start = performance.now();
await runExpensiveStep();
const elapsedMs = performance.now() - start;
console.log(`runExpensiveStep took ${elapsedMs.toFixed(1)} ms`);
```

## Validation Checklist

- [ ] A numeric target was set before optimisation began.
- [ ] A baseline measurement was recorded.
- [ ] The bottleneck was found by profiling, not by guessing.
- [ ] Each change was re-measured and the improvement verified.
- [ ] No correctness, memory, or cost regression was introduced.
- [ ] A regression guard (budget, benchmark, or alert) is in place.
- [ ] Before-and-after numbers are documented.

## Expected Deliverables

- The optimisation, with before-and-after measurements.
- A documented performance budget or regression guard.
- A note on what was tried and did not help, so the team does not
  repeat the experiment.

## References

- [web.dev Performance](https://web.dev/performance/) — web performance
  guides and Core Web Vitals.
- [MDN Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance) —
  measurement concepts and APIs.
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance) —
  browser profiling.
- Related skills in this repository: `debugging`, `software-architecture`,
  `code-review`, `tdd`.
