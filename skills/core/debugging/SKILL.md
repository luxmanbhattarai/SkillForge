---
name: debugging
description: >
  Find and fix bugs systematically: reproduce, isolate, hypothesise,
  verify, and prevent regression. Use when something is broken,
  behaving unexpectedly, failing intermittently, or crashing in
  production. Covers reproduction, bisection, logging, debugger use,
  and writing regression tests so the bug stays fixed.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Debugging

## Purpose

This skill turns debugging from guessing into a repeatable process:
reproduce the failure, narrow it to the smallest possible cause, fix the
cause rather than the symptom, and lock the fix in with a regression test.
The outcome is a fix you can explain and a bug that cannot silently return.

## When to Use

- A feature behaves incorrectly or a test fails unexpectedly.
- A crash, error, or wrong output appears in development or production.
- A bug is intermittent, flaky, or only reproduces under certain conditions.
- Performance suddenly degrades or a resource (memory, disk) grows
  without bound.
- You need to understand unfamiliar code by observing its behaviour.

## When Not to Use

- For planned code improvement without a defect — use `refactoring`.
- For reviewing a change for quality — use `code-review`.
- For pure performance tuning of working code — use `performance`.
- For security investigation of a suspected breach — follow the
  incident response process and use `security`.

## Prerequisites

- Access to the failing environment (local, staging, or production logs).
- The ability to run the code and its tests locally.
- Version control history, so recent changes can be inspected and bisected.
- The error message, stack trace, or observed misbehaviour, quoted exactly.

## Official Documentation

- [Chrome DevTools](https://developer.chrome.com/docs/devtools) — browser
  debugging: breakpoints, network, performance, and console.
- [Node.js debugging guide](https://nodejs.org/en/learn/getting-started/debugging) —
  inspector, `--inspect`, and built-in debugging for Node.js.
- [MDN: Browser developer tools](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/What_are_browser_developer_tools) —
  browser debugger fundamentals.

## Required Workflow

1. Reproduce the failure. Write down the exact steps, inputs, and
   environment. If it cannot be reproduced, gather logs and narrow the
   conditions until it can.
2. Capture the evidence: the full error message, stack trace, relevant
   logs, and the expected versus actual behaviour.
3. Form one hypothesis at a time about the cause, starting with the
   simplest explanation.
4. Test each hypothesis with the smallest possible experiment: a
   breakpoint, a log line, a minimal reproduction, or a test.
5. Narrow the scope by bisection: halve the code path, the input, or the
   history (with `git bisect` for regressions) until the fault is isolated.
6. Identify the root cause, not the symptom. Ask "why" until the answer
   points at a specific line or decision.
7. Write a failing test that reproduces the bug before fixing it, so the
   fix is verifiable and the bug cannot return silently.
8. Fix the root cause with the smallest change that does so.
9. Run the new test plus the full affected test suite.
10. Clean up: remove temporary logs and breakpoints, then document the
    fix and the cause in the commit message or pull request.

## Implementation Standards

- Never fix by guessing and checking: every change must follow from a
  tested hypothesis.
- Reproduce first, always. A fix without a reproduction is unverified.
- One change at a time when testing hypotheses; changing two things at
  once hides which one mattered.
- Use the debugger over print statements for state inspection when the
  code path is complex; use logging for behaviour over time.
- Temporary debug output is removed before the change is submitted.
- A regression test accompanies every bug fix, unless the bug is in
  test-only or throwaway code.
- When the bug is a regression, identify the commit that introduced it
  and note it in the fix.

## Best Practices

- Read the error message fully before searching for it; most answers
  are in the message and the stack trace.
- Check the recent changes first: most bugs are regressions from the
  last few commits.
- Rubber-duck the code path: explain aloud what the code does, line by
  line, until the explanation diverges from the intent.
- Reduce the reproduction to the smallest input and the smallest code
  that still fails; the bug is usually obvious at that scale.
- When stuck, change the environment: a different input, a different
  order, or a clean checkout can reveal hidden assumptions.
- Keep notes during a long investigation so the next person (or future
  you) can follow the reasoning.

## Security Considerations

- Do not paste production secrets, tokens, or personal data into logs,
  bug reports, or chat while debugging. Redact them first.
- Reproduce production bugs with anonymised data in a non-production
  environment whenever possible.
- Debug endpoints, verbose error pages, and debug flags must never be
  enabled in production; they leak internals.
- See `security` for the full checklist.

## Performance Considerations

- A debugger slows execution and can mask race conditions; for timing
  bugs, prefer logging with timestamps over breakpoints.
- Excessive logging in a hot path changes timing and can hide or create
  the bug; log sparingly and remove temporary logs.
- Memory and CPU profilers are the right tool for leaks and slowness;
  guessing at hot spots wastes time (see `performance`).

## Common Mistakes

- Fixing the symptom — patching the crash site instead of the code that
  produced the bad state.
- Skipping reproduction — "fixing" code without ever seeing the failure.
- Changing several things at once and not knowing which one fixed it.
- Assuming the bug is in the library or framework — it almost never is;
  check your own code first.
- Leaving debug logging in production code.
- Closing a bug as "cannot reproduce" without recording the conditions
  tried and the evidence gathered.

## Examples

Bisection with git to find a regression:

```bash
# Start a bisect session between a known-good and known-bad commit.
git bisect start
git bisect bad HEAD
git bisect good v1.2.0
# At each step, run the failing test, then mark the commit:
#   git bisect good   (test passes)
#   git bisect bad    (test fails)
# Git reports the first bad commit when the search finishes.
git bisect reset
```

Minimal reproduction habit: before fixing, write the failing test.

```ts
// Regression test: order total must include the discount.
// Fails before the fix, passes after.
test("order total applies loyalty discount", () => {
  const order = makeOrder({ items: [item(100)], loyal: true });
  expect(orderTotal(order)).toBe(90);
});
```

## Validation Checklist

- [ ] The bug is reproduced with documented steps, or the conditions
      tried are recorded.
- [ ] The root cause is identified and explained, not just the symptom.
- [ ] A failing-then-passing regression test covers the fix.
- [ ] The full affected test suite passes.
- [ ] Temporary logs, breakpoints, and debug flags are removed.
- [ ] The commit or pull request explains the cause and the fix.

## Expected Deliverables

- The fix, with the smallest change that addresses the root cause.
- A regression test that fails before and passes after the fix.
- A commit message or pull request describing the cause, the fix, and
  how it was verified.

## References

- [Chrome DevTools](https://developer.chrome.com/docs/devtools) — browser
  debugging tools.
- [Node.js debugging guide](https://nodejs.org/en/learn/getting-started/debugging) —
  Node.js inspector and debugging.
- Related skills in this repository: `tdd`, `code-review`, `performance`,
  `clean-code`.
