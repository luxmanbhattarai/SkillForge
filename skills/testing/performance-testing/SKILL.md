---
name: performance-testing
description: >
  Measure and verify how fast an application responds under realistic
  and heavy load. Use when load testing an API, benchmarking page load
  and Core Web Vitals, profiling a slow endpoint, setting performance
  budgets, or validating that a change did not regress response times.
license: MIT
metadata:
  version: "1.0.0"
  category: testing
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Performance Testing

## Purpose

Performance testing answers two questions: how fast is the system for
one user, and how does it behave when many users arrive at once. It
covers page-load measurement, API benchmarking, load and stress
testing, and profiling, so slowdowns are found with data instead of
guessed at from complaints. The output is measurements against agreed
budgets, not opinions.

## When to Use

- Load testing an API or page before a launch or a traffic spike.
- Measuring page load and Core Web Vitals for a site or app.
- Profiling a slow endpoint, query, or render.
- Setting or enforcing performance budgets in CI.
- Validating that a change (new dependency, refactor, migration) did
  not slow the system down.
- Finding the breaking point of a service before users do.

## When Not to Use

- Verifying correctness of behavior — use `unit-testing`,
  `integration-testing`, or `e2e-testing`.
- Testing accessibility — use `accessibility-testing`.
- Testing against production without authorization; load tests can
  take a service down and may violate provider terms.
- Micro-optimizing code that has no measured problem; measure first.

## Prerequisites

- A test environment that mirrors production closely enough for the
  numbers to mean something (same instance sizes, same database).
- Agreed budgets or targets before measuring (for example, response
  time percentiles and throughput goals).
- A load-generation tool installed (k6, Artillery, or Apache JMeter).
- Access to application and infrastructure metrics (logs, APM, or
  database slow-query logs) for diagnosis.
- Authorization to run load tests against the target environment.

## Official Documentation

- [k6](https://k6.io/docs/) — scriptable load testing.
- [Artillery](https://www.artillery.io/) — load testing and
  performance measurement.
- [Apache JMeter](https://jmeter.apache.org/) — established load
  testing tool.
- [web.dev performance guides](https://web.dev/learn/performance) —
  web performance fundamentals.
- [WebPageTest](https://www.webpagetest.org/) — page-load measurement
  from real browsers.

## Required Workflow

1. Define what to measure and the target: which endpoints or pages,
   which metrics (response time percentiles, throughput, error rate,
   Core Web Vitals), and the budget each must meet.
2. Establish a baseline: measure the current system under the same
   conditions the test will use.
3. For page load: measure with a real browser (Lighthouse or
   WebPageTest) on a representative device and network profile, and
   record the Core Web Vitals.
4. For APIs: write a load script that reproduces realistic traffic
   (mix of endpoints, realistic payloads, think time between requests)
   and ramp load gradually.
5. Run the test against the test environment, watching error rates
   and resource use; stop if the environment is at risk.
6. Compare results to the baseline and the budget. Investigate any
   regression with profiling (slow queries, hot code paths, network
   waterfalls) before optimizing.
7. Record results with the environment, tool, script, and date so the
   run is reproducible.
8. Add the agreed budget checks to CI where they are stable enough
   (page-size and synthetic timing budgets work well; noisy load
   numbers belong in scheduled runs).

## Implementation Standards

- Always report percentiles (p50, p95, p99), not averages alone; an
  average hides the slow experience of the worst-served users.
- Load scripts must reproduce realistic traffic: a single endpoint
  hammered in a loop is not a load test.
- Measure with a warmed-up system: discard the first seconds of a run
  so cold caches do not distort results.
- Run each measurement at least three times and report the range; a
  single run is noise.
- Test against a production-like environment; numbers from a laptop
  do not predict production behavior.
- Keep load tests out of the default CI run; run them on schedule or
  on demand, and run only fast, stable budget checks per pull request.
- Record the exact tool version, script, environment, and dataset
  size with every result.
- Never load-test production or third-party services without explicit
  authorization.

## Best Practices

- Start with the user-facing metric (time to interactive, API latency
  at p95) and work backwards to the cause.
- Profile before optimizing: check the database, the network
  waterfall, and the render path before rewriting code.
- Test the endpoints users actually hit most, plus the heaviest ones.
- Include error-rate thresholds in load scripts; a fast service that
  returns errors is not performing.
- Watch resource saturation (CPU, memory, connections, event loop)
  during the run; the bottleneck is usually visible there first.
- Keep performance budgets in the repository and review them when
  they are exceeded instead of silently raising them.
- Compare against the previous release, not against an ideal number,
  to catch regressions early.

## Security Considerations

- Load tests can look like denial-of-service attacks: run them only
  against environments you own, with authorization, and warn anyone
  monitoring the target.
- Do not include real credentials or production data in load scripts
  or test payloads.
- Load-test traffic can trigger rate limits and abuse detection;
  coordinate with the team that operates the target.
- Performance data can reveal infrastructure details; share reports
  inside the team, not publicly.

## Performance Considerations

- The load generator itself can become the bottleneck: monitor its
  CPU and network, and distribute load if needed.
- Keep the measurement overhead low: sampling profilers over
  instrumenting profilers when measuring production-like behavior.
- Avoid testing with tiny datasets; a query that is fast on 100 rows
  can be slow on 10 million.
- Cache behavior matters: test both cold-cache and warm-cache
  scenarios where caching is part of the design.

## Common Mistakes

- Reporting averages only — p95 and p99 show what slow users feel.
- Testing on a laptop and extrapolating to production.
- One run, one number — variance makes a single measurement unreliable.
- Optimizing without profiling — guessing the bottleneck wastes effort
  and often makes things worse.
- Load-testing the wrong thing — a synthetic endpoint that no user
  calls.
- Ignoring error rates — throughput numbers are meaningless if a
  quarter of requests fail.
- Running load tests in CI on every commit — flaky and slow; use
  scheduled runs and fast budget checks instead.

## Examples

```js
// load-test.js — k6 script with a realistic ramp and thresholds.
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const res = http.get("https://staging.example.com/api/products");
  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(1);
}
```

```text
Result report format (record every run this way):
- Date, environment, tool and version, script path.
- Dataset size and traffic mix.
- p50 / p95 / p99 latency, throughput, error rate.
- Baseline comparison and whether each budget passed.
- Bottleneck found (if any) and the evidence for it.
```

## Validation Checklist

- [ ] Budgets or targets were agreed before measuring.
- [ ] Baseline measured under the same conditions as the test.
- [ ] Results report p50, p95, p99, throughput, and error rate.
- [ ] Each measurement repeated at least three times; range reported.
- [ ] Load script reproduces realistic traffic, not a single endpoint
      loop.
- [ ] Tests ran against an authorized test environment, never
      production without approval.
- [ ] Results recorded with environment, tool, script, and date.
- [ ] Regressions traced to a cause with profiling evidence before
      any optimization.

## Expected Deliverables

- The load or measurement scripts, checked into the repository.
- A results report with percentiles, throughput, error rate, baseline
  comparison, and budget verdicts.
- Profiling evidence for any bottleneck found, and the fix or
  recommendation that follows from it.
- Performance budget checks added to CI or scheduled runs where
  appropriate.

## References

- [k6 documentation](https://k6.io/docs/) — load testing scripts
  and thresholds.
- [web.dev performance](https://web.dev/learn/performance) — web
  performance fundamentals and Core Web Vitals.
- [WebPageTest](https://www.webpagetest.org/) — real-browser
  page-load measurement.
- Related skills in this repository: `unit-testing`,
  `integration-testing`, `e2e-testing`, `regression-testing`.
