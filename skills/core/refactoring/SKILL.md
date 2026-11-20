---
name: refactoring
description: >
  Improve existing code's structure without changing its behaviour:
  extract functions, rename, split modules, and remove duplication
  safely. Use when code is hard to change, duplicated, or tangled,
  when preparing code for a new feature, or when paying down technical
  debt. Covers safe refactoring steps, test coverage, and common
  refactorings.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Refactoring

## Purpose

This skill improves the internal structure of code without changing what
it does, so the code becomes easier to understand, test, and extend. Every
refactoring is a series of small, behaviour-preserving steps, each verified
by tests, so the code is never left in a broken intermediate state.

## When to Use

- Code is hard to change, duplicated, or hard to understand.
- A new feature is difficult to add because of the current structure.
- Tests are hard to write because the code is tightly coupled.
- Paying down known technical debt in a deliberate, scoped way.
- A code smell (long function, large class, duplicated logic) is found
  during review or debugging.

## When Not to Use

- When the code has a bug to fix first — fix the bug (see `debugging`),
  then refactor, in separate commits.
- When the goal is a new feature — build the feature; refactor only the
  code that blocks it.
- When there is no test coverage and no way to verify behaviour — add
  characterisation tests first (see `tdd`).
- For architecture-level restructuring — use `software-architecture`.

## Prerequisites

- A passing test suite covering the code to be refactored, or a plan to
  add characterisation tests first.
- Version control, with the work done in small, committable steps.
- A clear scope: which code is being refactored and what "done" means.

## Official Documentation

- [Refactoring.com](https://refactoring.com/) — Martin Fowler's
  catalogue of refactorings and code smells.
- [Refactoring Guru: Refactoring](https://refactoring.guru/refactoring) —
  technique-by-technique guides with before-and-after examples.
- [Martin Fowler on refactoring](https://martinfowler.com/books/refactoring.html) —
  the book's overview and key ideas.

## Required Workflow

1. Define the scope and the goal: what is hard today, and what will be
   easier after the refactoring.
2. Confirm test coverage over the affected code. If coverage is missing,
   write characterisation tests that capture current behaviour first.
3. Run the full test suite and confirm it is green before changing
   anything.
4. Make one small refactoring step at a time: extract a function, rename
   a variable, move a method — one change per step.
5. Run the affected tests after every step. If a test fails, the step
   changed behaviour: fix it or revert it immediately.
6. Commit after each green step so any step can be reverted alone.
7. Never mix behaviour changes with refactoring in the same commit. If a
   behaviour change is needed, do it as a separate, clearly labelled step.
8. When the goal is reached, run the full suite, review the diff, and
   stop — do not keep polishing unrelated code.

## Implementation Standards

- Behaviour is preserved at every step. A refactoring that changes
  output is a bug, not a refactoring.
- Steps are small and reversible. A step you cannot revert cleanly is
  too big.
- Names are updated to match the new structure; a renamed function keeps
  its callers readable.
- Duplication is removed by extracting the shared concept once, not by
  editing each copy.
- Dead code discovered during refactoring is deleted, not left behind.
- Public APIs change only deliberately, with callers updated in the same
  change and a note in the changelog if the API is published.

## Best Practices

- Refactor in the direction of the next feature: improve the code you
  are about to touch, not the whole codebase at once.
- Prefer automated refactoring tools (rename, extract, move) over
  hand-editing; the tooling updates references reliably.
- The boy-scout rule: leave code cleaner than you found it, but keep the
  cleanup in the area you are already changing.
- Time-box exploratory refactoring: if the structure resists after a
  reasonable effort, stop and reassess the approach.
- Keep the diff reviewable: a reviewer should be able to see that each
  step preserved behaviour.

## Security Considerations

- Refactoring must not weaken security checks: validation, authorisation,
  and sanitisation must survive the move intact.
- When moving code across trust boundaries, re-check which side is
  responsible for validation.
- Do not refactor secrets handling casually; keep secrets in the secret
  manager and reference them by name.
- See `security` for the full checklist.

## Performance Considerations

- Refactoring is not optimisation: do not change algorithms or data
  structures as part of a refactoring step unless that is the stated goal.
- If a refactoring accidentally changes performance characteristics
  (for example, moving work into a loop), measure and revert or adjust.
- See `performance` for measurement guidance.

## Common Mistakes

- Big-bang rewrites — replacing a module in one giant change with no
  way to verify intermediate states.
- Mixing behaviour changes with refactoring — the diff becomes
  unverifiable and regressions hide in it.
- Refactoring without tests — there is no way to know behaviour was
  preserved.
- Refactoring code nobody touches — the return on cleaning dead or
  stable code is near zero.
- Renaming without updating all references, leaving the codebase
  inconsistent.
- Stopping halfway — a half-extracted abstraction is worse than the
  original duplication.

## Examples

Extract function — before and after:

```ts
// Before: inline logic, duplicated in two places.
const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
const discounted = total > 100 ? total * 0.9 : total;

// After: the rule has a name and one home.
function applyBulkDiscount(total: number): number {
  const BULK_THRESHOLD = 100;
  const BULK_RATE = 0.9;
  return total > BULK_THRESHOLD ? total * BULK_RATE : total;
}

const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
const discounted = applyBulkDiscount(total);
```

Characterisation test before refactoring untested code:

```ts
// Capture current behaviour first; this test must pass before and
// after the refactoring, unchanged.
test("legacy pricing matches current behaviour", () => {
  expect(legacyPrice([{ price: 50, qty: 3 }])).toBe(135);
});
```

## Validation Checklist

- [ ] The full test suite was green before the refactoring started.
- [ ] Tests pass after every step; no step changed behaviour.
- [ ] Behaviour changes, if any, are in separate commits from refactoring.
- [ ] The code is measurably easier to read, test, or change.
- [ ] No dead code, stale comments, or half-finished extractions remain.
- [ ] The diff is reviewable step by step.

## Expected Deliverables

- The refactored code, in small commits, each with passing tests.
- Characterisation tests added where coverage was missing.
- A summary of what changed structurally and what was deliberately left
  alone.

## References

- [Refactoring.com](https://refactoring.com/) — refactoring catalogue
  and code smells.
- [Refactoring Guru: Refactoring](https://refactoring.guru/refactoring) —
  technique guides with examples.
- Related skills in this repository: `clean-code`, `tdd`, `code-review`,
  `design-patterns`, `debugging`.
