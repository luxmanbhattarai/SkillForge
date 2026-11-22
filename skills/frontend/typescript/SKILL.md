---
name: typescript
description: >
  Write type-safe TypeScript with strict mode, sound types, and idiomatic
  patterns for frontend and Node.js code. Use when adding TypeScript to a
  project, writing typed code, defining interfaces and generics, fixing
  type errors, configuring tsconfig, or migrating JavaScript to TypeScript.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS and the TypeScript compiler (tsc) for type checking and builds.
---

# TypeScript

## Purpose

This skill produces TypeScript that earns its keep: strict mode on, types
that describe reality instead of papering over it, and generics and
utility types used where they remove duplication rather than add cleverness.
The result is code where the compiler catches the bugs that tests and code
review miss — wrong shapes, missing cases, and null dereferences — before
the code ever runs.

## When to Use

- Writing new TypeScript in a frontend or Node.js project.
- Adding TypeScript to an existing JavaScript project.
- Defining data models, API response types, and component props.
- Fixing type errors, unsafe `any` usage, or incorrect type assertions.
- Configuring `tsconfig.json` or setting up type checking in a build.

## When Not to Use

- Plain JavaScript without types: use `javascript`.
- Framework-specific patterns (React props, Next.js types): use `react`
  or `nextjs` and apply this skill's typing rules inside them.
- Runtime validation of external data: TypeScript types disappear at
  runtime; use a validation library for untrusted input.
- Styling or markup: use `css` or `html`.

## Prerequisites

- Node.js 24 LTS or 26 LTS installed (26 is the newest LTS line;
  24 and 22 remain in LTS).
- TypeScript 7.x installed in the project (current major line;
  7.0 released 2026-07-08 as a native Go port of the
  compiler, same `typescript` package and `tsc` command, roughly 10x
  faster builds). Do not assume a minor version. TypeScript 6.0
  (2026-03-23) was the bridge release from the JavaScript compiler:
  it changed defaults that 7.0 inherits — `strict` defaults to
  `true`, `module` to `esnext`, `target` to the current-year ES
  version, `types` to `[]` (no automatic `@types` inclusion), and
  `rootDir` to `.`. TypeScript 5.x is superseded; do not write new
  guidance against its defaults.
- A `tsconfig.json` in the project, or willingness to create one with
  strict mode enabled (explicit `strict: true` is still recommended
  even though it is the default in 6.0+).
- Familiarity with the `javascript` skill; TypeScript builds on it.

## Official Documentation

- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  handbook, reference, and guides.
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) —
  the guided introduction to the type system.
- [TypeScript release notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html) —
  what changed in each version.
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) —
  the native Go compiler, side-by-side use with TypeScript 6.0, and
  the missing programmatic API (expected in 7.1).
- [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) —
  the new defaults and the deprecation sweep that 7.0 inherits.

## Required Workflow

1. Confirm the project has a `tsconfig.json` with `strict: true`; if not,
   create one with strict mode and the module settings that match the
   project's runtime.
2. Define types at the boundary: API responses, component props, and
   function inputs get explicit types first.
3. Let inference do the rest: annotate function parameters and return
   types, but let the compiler infer local variable types.
4. Model data with `interface` for object shapes and `type` for unions,
   intersections, and aliases. Prefer `interface` for shapes that may be
   extended.
5. Handle `null` and `undefined` explicitly: strict mode makes them
   visible, so narrow with checks instead of using non-null assertions.
6. Run `tsc --noEmit` (or the project's typecheck script) and fix every
   error; never ship with type errors suppressed by `// @ts-ignore`.
7. Validate runtime data from outside the program (API responses, form
   input, storage) with a validation library or manual checks — types do
   not exist at runtime.

## Implementation Standards

- `strict: true` in `tsconfig.json`, always. Also enable
  `noUncheckedIndexedAccess` in new projects so indexed access returns
  `T | undefined`.
- Never use `any` in new code. Use `unknown` for values of genuinely
  unknown type and narrow them before use.
- Avoid `as` assertions on values you did not construct; an assertion is
  a claim the compiler cannot check. Prefer narrowing with type guards.
- Avoid the non-null assertion operator (`!`); check for `null` /
  `undefined` instead.
- Annotate exported function parameters and return types; inference is
  fine for internal locals.
- Use `readonly` for arrays and properties that must not be mutated.
- Use discriminated unions (a shared literal `type` or `kind` field) for
  state machines and variant data; the compiler then enforces exhaustive
  handling.
- Use utility types (`Partial`, `Pick`, `Omit`, `Record`, `ReturnType`,
  `Awaited`) instead of re-declaring shapes.
- Use generics with meaningful constraints (`T extends { id: string }`)
  rather than unconstrained `T` when the function needs a shape.
- Prefer `import type` / `export type` for type-only imports so bundlers
  can drop them.
- Use enums sparingly; string literal unions are usually simpler and
  serialize cleanly.
- Keep `tsconfig.json` paths and module resolution consistent with the
  bundler (`moduleResolution: "bundler"` for Vite-style projects,
  `"nodenext"` for Node.js-first projects). The legacy `"node"`
  (node10) and `"classic"` resolutions were deprecated in TypeScript
  6.0 — do not use them in new projects. Also avoid other options
  deprecated in 6.0 and removed in 7.0: `target: "es5"`,
  `--downlevelIteration`, `--baseUrl`, `--outFile`, and the `amd`,
  `umd`, and `systemjs` module values.
- TypeScript 7.0 ships no programmatic compiler API (one is expected
  in 7.1). Tooling that drives the compiler API (for example
  typescript-eslint) runs against TypeScript 6.0 via the
  `@typescript/typescript6` compatibility package (`tsc6` binary),
  which can sit side by side with 7.0's `tsc`.

## Best Practices

- Model the domain with types before writing logic: a good type often
  makes the implementation obvious.
- Make illegal states unrepresentable: use unions instead of boolean
  flags (for example `status: 'idle' | 'loading' | 'error'`).
- Use `satisfies` to check a value against a type without widening it.
- Write type guards (`value is Article`) for narrowing at runtime
  boundaries.
- Keep types close to the code that uses them; a central `types.ts` is
  fine for shared domain models, but component props live with the
  component.
- Use `as const` for literal values that must keep their literal type.
- Prefer `unknown` plus narrowing over `any` plus hope; the compiler is
  an ally, not an obstacle.
- When a library lacks types, write a minimal declaration file for the
  parts used rather than typing the whole library.

## Security Considerations

- TypeScript provides no runtime security: types are erased at compile
  time. Never treat a typed value from the network, storage, or user
  input as validated.
- Validate all external data at runtime before using it, even when a type
  claims its shape; a malicious payload can carry any shape.
- Do not use type assertions to bypass validation of untrusted data.
- Keep the TypeScript compiler and type packages up to date; outdated
  `@types` packages can misrepresent library behavior.

## Performance Considerations

- Types have zero runtime cost: they are erased during compilation.
- Prefer `import type` so type-only imports never end up in the bundle.
- Avoid deeply recursive conditional types in hot paths of a large
  codebase; they slow down the compiler and the editor.
- Use project references or incremental compilation (`incremental: true`)
  in large codebases to keep typecheck times acceptable.
- `skipLibCheck: true` is standard and safe for most projects; it skips
  type checking of declaration files and speeds up compilation.

## Common Mistakes

- `any` everywhere — defeats the purpose of TypeScript. Use `unknown`
  and narrow, or write the real type.
- Type assertions to silence errors (`data as Article`) — the compiler
  stops checking and the bug moves to runtime. Narrow or validate instead.
- Non-null assertions (`value!`) — a promise the compiler cannot verify.
  Check for null instead.
- Over-annotating locals (`const count: number = 0`) — inference handles
  it; annotations add noise.
- Under-annotating exported functions — callers lose documentation and
  the compiler cannot catch return-type mistakes.
- Using `Function` or `object` as types — too vague to be useful. Write
  the actual signature or shape.
- Forgetting that `JSON.parse` returns `any` — always validate parsed
  data before treating it as a typed value.
- Enums with numeric values serialized to an API — numeric enums are
  opaque over the wire. Use string literal unions.
- Relying on automatic `@types` inclusion — since TypeScript 6.0 the
  `types` option defaults to `[]`, so global type packages (for
  example `node`) must be listed explicitly in `tsconfig.json`.
- Turning off `strict` to make errors go away — strict mode is the point;
  fix the code instead.

## Examples

Discriminated union with exhaustive handling:

```ts
type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; articles: Article[] }
  | { status: 'error'; message: string };

function render(state: LoadState): string {
  switch (state.status) {
    case 'idle': return 'Nothing loaded yet.';
    case 'loading': return 'Loading…';
    case 'success': return `${state.articles.length} articles loaded.`;
    case 'error': return `Error: ${state.message}`;
  }
}
```

Typed fetch with runtime narrowing:

```ts
interface Article {
  id: string;
  title: string;
  publishedAt: string;
}

function isArticle(value: unknown): value is Article {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.title === 'string'
    && typeof record.publishedAt === 'string';
}

async function loadArticle(id: string): Promise<Article> {
  const response = await fetch(`/api/articles/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const data: unknown = await response.json();
  if (!isArticle(data)) throw new Error('Unexpected response shape');
  return data;
}
```

Strict `tsconfig.json` for a browser project (TypeScript 6.0+/7.0;
`strict`, `module`, and `target` are shown explicitly even though
the first two are now defaults):

```json
{
  "compilerOptions": {
    "target": "ES2025",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

## Validation Checklist

- [ ] `tsc --noEmit` passes with zero errors.
- [ ] `strict: true` is set in `tsconfig.json`.
- [ ] No `any` in new code; no `// @ts-ignore` or `// @ts-expect-error`
      without a comment explaining why.
- [ ] No non-null assertions (`!`) in new code.
- [ ] External data is validated at runtime before being treated as a
      typed value.
- [ ] Exported functions have annotated parameters and return types.

## Expected Deliverables

- Typed TypeScript modules following the standards above, with strict
  mode enabled.
- A `tsconfig.json` (new or updated) with strict settings appropriate to
  the project.
- Passing `tsc --noEmit` output, or a list of remaining errors with a
  plan to fix them.

## References

- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  handbook and reference.
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) —
  guided introduction to the type system.
- [TypeScript release notes](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html) —
  version history.
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) —
  the current major line and its Go compiler.
- Related skills in this repository: `javascript`, `react`, `nextjs`,
  `astro`.
