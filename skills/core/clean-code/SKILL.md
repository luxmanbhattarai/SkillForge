---
name: clean-code
description: >
  Write readable, maintainable code: clear naming, small focused
  functions, honest error handling, and minimal duplication. Use when
  writing new code, naming things, simplifying a tangled function, or
  judging whether code is clear enough for the next person to change
  safely. Covers naming, function design, comments, and code smells.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Clean Code

## Purpose

This skill produces code that a stranger can read, understand, and change
without fear. Readability is the primary goal: code is read far more often
than it is written, so every choice — names, structure, size — is judged
by how much effort it costs the next reader.

## When to Use

- Writing any new function, module, or class.
- Choosing names for variables, functions, types, and files.
- Simplifying a function that is hard to follow or test.
- Removing duplication or untangling a long conditional chain.
- Reviewing your own code before opening a pull request.

## When Not to Use

- For large-scale restructuring across modules — use `refactoring`.
- For judging overall design or architecture — use `software-architecture`.
- For test-first development workflow — use `tdd`.
- For formal peer review of someone else's change — use `code-review`.

## Prerequisites

- The project's language, formatter, and linter configured and running.
- A working test suite, or at least a way to verify behaviour after
  editing (see `tdd`).
- Familiarity with the codebase's existing naming conventions.

## Official Documentation

- [Refactoring.com](https://refactoring.com/) — Martin Fowler's
  catalogue of code smells and refactoring techniques.
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) —
  concrete naming and formatting rules for TypeScript projects.
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) —
  language reference for idiomatic JavaScript.

## Required Workflow

1. Before writing, state the single responsibility of the unit you are
   about to write, in one sentence.
2. Choose names that describe intent: a reader should know what a
   function does from its name and signature alone.
3. Write the smallest unit that does the job: one function, one level
   of abstraction, one reason to change.
4. Replace magic numbers and strings with named constants that explain
   their meaning.
5. Handle errors explicitly at the boundary where the failure is
   understood; never swallow an error silently.
6. Remove dead code, commented-out code, and unused parameters instead
   of leaving them for later.
7. Run the formatter and linter, then re-read the diff as if you were
   reviewing a stranger's code.
8. If a function still needs a long comment to be understood, restructure
   it until the code explains itself.

## Implementation Standards

- Functions do one thing. If you cannot describe a function without
  "and", split it.
- Keep functions short enough to read without scrolling; as a rule of
  thumb, under 30 lines, and under 50 only with good reason.
- Keep nesting shallow: at most two levels of nesting inside a function;
  use early returns and guard clauses instead of deep `if` blocks.
- Boolean parameters are a smell: a function that takes a flag usually
  does two things. Prefer two functions or an options object.
- Names are pronounceable, searchable, and specific. Avoid single-letter
  names except for short loop indices and well-known math.
- Comments explain *why*, never *what*. If a comment restates the code,
  delete it or rename the code.
- A file has one clear purpose; if a file needs a table of contents, it
  is doing too much.
- Duplication is fixed by extracting the shared concept, not by copying
  a fix into every copy.

## Best Practices

- Prefer pure functions with explicit inputs and outputs; they are the
  easiest to test and reuse.
- Return early for the invalid or empty case, then write the main path
  at the top level of the function.
- Use the language's idioms instead of fighting them; readers expect
  the standard patterns.
- Keep related code close together; distance between definition and use
  is a tax on every reader.
- When a condition is complex, extract it into a well-named boolean
  variable or predicate function.
- Delete code happily: version control remembers it, so the file does
  not have to.

## Security Considerations

- Never log sensitive data: passwords, tokens, personal data, or full
  request bodies. Log identifiers, not values.
- Validate and sanitise input at the boundary, then trust it inside;
  scattered validation is easy to miss.
- Avoid string-building for queries, commands, or HTML; use parameterised
  APIs and escaping functions provided by the framework.
- See `security` for the full checklist.

## Performance Considerations

- Favour clarity over micro-optimisation; measure before optimising,
  and only optimise hot paths.
- Avoid needless work in loops: hoist invariant computation out, and
  avoid repeated expensive calls (I/O, serialisation) inside iterations.
- Choose the right data structure for the access pattern (map lookup
  instead of linear search) — this is both cleaner and faster.
- See `performance` for measurement and profiling guidance.

## Common Mistakes

- Clever code — a one-liner that saves lines but costs every reader
  minutes is a net loss.
- Commenting the obvious while leaving the surprising uncommented —
  comment the *why* of the non-obvious decision.
- Long parameter lists — more than three parameters usually means the
  function needs an options object or a smaller scope.
- Naming by type instead of purpose (`data`, `manager`, `util`) — the
  name should say what the thing is for, not what it is.
- Leaving dead code "just in case" — it misleads readers and rots.
- Duplicating logic because extracting it felt like too much work —
  the second copy is where bugs hide.

## Examples

Guard clauses instead of deep nesting:

```ts
// Before: nested, hard to follow.
function getDiscount(order: Order): number {
  if (order) {
    if (order.items.length > 0) {
      if (order.customer.isLoyal) {
        return 0.1;
      }
    }
  }
  return 0;
}

// After: early returns, main path at the top level.
function getDiscount(order: Order): number {
  if (!order || order.items.length === 0) return 0;
  if (!order.customer.isLoyal) return 0;
  return 0.1;
}
```

Named constants instead of magic numbers:

```ts
// Before
if (retries > 3) throw new Error("too many retries");

// After
const MAX_RETRIES = 3;
if (retries > MAX_RETRIES) throw new Error("too many retries");
```

## Validation Checklist

- [ ] Every function name describes its intent without reading the body.
- [ ] No function exceeds the agreed size guideline without justification.
- [ ] No magic numbers or unexplained string literals remain.
- [ ] No commented-out code, dead code, or unused parameters remain.
- [ ] Comments explain *why*, and each one earns its place.
- [ ] The formatter and linter pass with no warnings.
- [ ] A colleague could change this code without asking the author.

## Expected Deliverables

- Code that follows the standards above, formatted and lint-clean.
- A short note in the pull request for any deliberate exception to a
  standard, with the reason.

## References

- [Refactoring.com](https://refactoring.com/) — code smells and
  refactoring catalogue.
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) —
  naming and formatting rules.
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) —
  idiomatic JavaScript.
- Related skills in this repository: `refactoring`, `code-review`, `tdd`,
  `design-patterns`.
