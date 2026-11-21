---
name: package-boundaries
description: >
  Define and enforce boundaries between packages and modules: public
  interfaces, import rules, dependency direction, and automated checks that
  fail the build on violations. Use when the task mentions package
  boundaries, module boundaries, import rules, dependency direction, circular
  dependencies, encapsulation, or preventing one package from reaching into
  another's internals.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Package Boundaries

## Purpose

Boundaries turn a codebase's intended structure into enforced structure:
each package or module exposes a small public interface, and tooling fails
the build when code reaches past it. This skill covers defining boundaries,
choosing the enforcement mechanism, and keeping the dependency graph
acyclic and understandable.

## When to Use

- A monorepo or modular monolith needs import rules between packages or modules.
- The task mentions package boundaries, module boundaries, import rules, circular dependencies, or encapsulation.
- Fixing tangled imports, deep relative paths, or a package that reaches into another's internals.
- Defining what a package's public API is.

## When Not to Use

- A single-package app with no internal modules — there is nothing to bound.
- The task is only about domain modeling — use `domain-driven-design`.
- The task is only about the monorepo layout — use `monorepo`.
- The task is only about dependency versions — use `dependency-management`.

## Prerequisites

- The packages or modules exist (or are being created) and their responsibilities are roughly known.
- A lint or build tool is available to enforce rules (ESLint for JavaScript/TypeScript, or a small script).
- The team agrees on the dependency direction before enforcement starts; rules encode decisions, not guesses.

## Official Documentation

- [ESLint documentation](https://eslint.org/docs/latest/) — the lint tool most JavaScript monorepos use for import rules.
- [TypeScript documentation](https://www.typescriptlang.org/docs/) — path mapping and module resolution.
- [Turborepo documentation](https://turborepo.dev/docs) — task graphs that reflect package dependencies.

## Required Workflow

1. List the packages or modules and write down, for each, what it is for and what may depend on it.
2. Draw the intended dependency graph: arrows point from consumer to dependency; the graph must be acyclic.
3. Define each package's public interface: the entry point (for example `index.ts` or the `exports` field) and nothing else is importable from outside.
4. Choose the enforcement mechanism: ESLint import rules, TypeScript path restrictions, the package `exports` map, or a small import-check script in CI.
5. Write the rules: no deep imports into another package (only its entry point), no imports that reverse the dependency direction, no circular imports.
6. Run the checks and fix every violation; do not add the rules with a long list of exceptions.
7. Wire the checks into CI so a violation fails the build; a rule that is not enforced decays.
8. Document the boundaries: the dependency graph and the public interface of each package, in the repository.
9. Review the graph when a new package or module is added; the addition must fit the graph or the graph must be deliberately changed.
10. Run the Validation Checklist.

## Implementation Standards

- A package's public interface is its entry point only; all other files are internal.
- Deep imports into another package (`@repo/ui/src/button`) are forbidden; import from the package root (`@repo/ui`).
- The dependency graph is acyclic; a cycle means two packages are really one, or the boundary is wrong.
- Dependencies point one way: lower layers (utilities, domain) never import upper layers (apps, features).
- Shared code lives in a package of its own; packages never import from an app's source.
- The `exports` field in `package.json` defines what a published package exposes; use it for packages that are published or consumed across the repository.
- Boundary rules are enforced in CI, not just in the editor; editor warnings are easy to ignore.
- Exceptions are rare, documented, and time-boxed; an exception list that grows means the rules are wrong.

## Best Practices

- Keep public interfaces small: the fewer exports, the easier the package is to change.
- Use path aliases (`@repo/ui`) for cross-package imports so boundaries are visible in the import statement.
- Prefer the package `exports` map over lint rules where it works: the runtime enforces it, not just the linter.
- Visualize the dependency graph periodically; a picture of the graph makes cycles and hubs obvious.
- When two packages need each other's code, extract the shared part into a third package both depend on.
- Review boundary violations in code review: a violation is usually a sign the feature belongs in a different package.

## Security Considerations

- Boundaries limit blast radius: a compromised or buggy package can only reach what its interface allows.
- Sensitive code (authentication, cryptography, secrets handling) should live in packages with few dependents and strict review.
- A package that bypasses boundaries (deep imports, dynamic requires) can also bypass security checks placed at the interface; enforcement matters for security, not just tidiness.
- Keep the enforcement tooling itself trustworthy: lint rules and CI checks run on every change.

## Performance Considerations

- Boundary checks run in lint and CI; they add seconds, not minutes, and save far more in avoided rework.
- Small public interfaces encourage small bundles: an app imports what it needs, not a package's internals.
- Deep imports that bypass the entry point can defeat tree-shaking; importing through the entry point keeps bundlers effective.
- The dependency graph drives task ordering in Turborepo; a clean graph means more parallel work.

## Common Mistakes

- Rules that exist only in a document — without enforcement, the first deadline breaks them.
- A `utils` package that every package depends on — it becomes a hidden coupling hub; split it by domain.
- Allowing deep imports "just this once" — the exception becomes the pattern.
- Circular dependencies papered over with lazy imports — the cycle is still there and still hurts.
- Enforcing boundaries between packages but not between modules inside a package — internal modules need the same discipline.
- Changing a public interface without checking its consumers — the interface is a contract.

## Examples

A package `exports` map that exposes only the public entry point:

```json
{
  "name": "@repo/ui",
  "exports": {
    ".": "./dist/index.js",
    "./package.json": "./package.json"
  }
}
```

A small import check script (Node.js, no dependencies) run in CI:

```js
// scripts/check-boundaries.mjs — fails if any package deep-imports another.
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const violations = [];
for (const file of globSync("packages/*/src/**/*.ts")) {
  const owner = file.split("/")[1];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/from\s+["']@repo\/([\w-]+)\//);
    if (match && match[1] !== owner) {
      violations.push(`${file}: deep import into @repo/${match[1]}`);
    }
  }
}
if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}
```

## Validation Checklist

- [ ] Dependency graph drawn, acyclic, and documented.
- [ ] Each package exposes only its entry point; deep imports forbidden.
- [ ] Enforcement mechanism in place (lint rules, exports map, or check script).
- [ ] Checks run in CI and fail the build on violations.
- [ ] No circular dependencies between packages or modules.
- [ ] No package imports from an app's source.
- [ ] Public interfaces documented per package.

## Expected Deliverables

- The dependency graph documentation and per-package public interfaces.
- Boundary enforcement configuration wired into CI.
- A clean check run with zero violations (or documented, time-boxed exceptions).
- README notes on how to add a package without breaking the graph.

## References

- [ESLint documentation](https://eslint.org/docs/latest/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- Related skills in this repository: `monorepo`, `modular-monolith`, `turborepo`, `dependency-management`.
