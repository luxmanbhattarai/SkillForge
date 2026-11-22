---
name: monorepo
description: >
  Design, create, and maintain a monorepo: one repository holding multiple
  apps and shared packages with a workspace tool, shared configuration, and
  consistent tooling. Use when the task mentions monorepo, monorepos, one
  repository for several apps, shared packages, workspaces, or consolidating
  separate repositories into one.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Monorepo

## Purpose

A monorepo holds multiple apps and shared packages in one repository with
one toolchain, one dependency graph, and atomic cross-package changes. This
skill covers setting up a monorepo, choosing the workspace tool, laying out
apps and packages, and keeping the repository fast and understandable as it
grows.

## When to Use

- Starting a project that will have more than one app or a shared package.
- Consolidating several repositories into one.
- The task mentions monorepo, workspaces, shared packages, or "one repo for everything".
- Fixing monorepo problems: slow installs, tangled imports, or unclear package ownership.

## When Not to Use

- A single app with no shared code — a plain repository is simpler.
- Teams need hard isolation (separate access control, separate release cadence, separate compliance) — separate repositories fit better.
- The task is only about the build pipeline — use `turborepo`.
- The task is only about package manager workspaces — use `pnpm-workspaces`.

## Prerequisites

- The package manager is chosen (pnpm is the recommended default for this repository's stack; npm and Yarn workspaces are alternatives).
- The apps and packages are known, at least roughly: what will live in `apps/` and `packages/`.
- Node.js 26 LTS is the current line (Active LTS since 2026-10-28,
  supported to 2029-04-30); Node.js 24 is in maintenance until
  2028-04-30. Node.js 20 and 25 are end-of-life. Pin the Node and
  package manager versions for the repository.
- Supported versions: pnpm 12.x is current
  (stable August 2026); pnpm 11 is supported until 2027-04-30; pnpm 10
  and earlier are unsupported. Turborepo 2.x is current (2.11.x,
  November 2026); Turborepo 1.x is end-of-life and 3.0 is in canary.
- A task runner is chosen (Turborepo is the recommended default) or deliberately deferred.

## Official Documentation

- [pnpm Workspaces](https://pnpm.io/workspaces) — workspace configuration for pnpm.
- [Turborepo documentation](https://turborepo.dev/docs) — task running and caching for monorepos.
- [Nx documentation](https://nx.dev/docs) — an alternative monorepo toolchain.
- [npm workspaces (npm docs)](https://docs.npmjs.com/cli/v12/using-npm/workspaces) — npm's workspace support.

## Required Workflow

1. Decide the layout before creating anything: `apps/` for deployable apps, `packages/` for shared libraries, and `tooling/` or `config/` for shared configuration.
2. Initialize the repository root with a workspace file (`pnpm-workspace.yaml` for pnpm) listing the `apps/*` and `packages/*` globs.
3. Pin the Node.js and package manager versions (for example with `packageManager` in the root `package.json` and a `.nvmrc` or equivalent).
4. Create the first app and the first shared package; wire the app to depend on the package by workspace reference.
5. Add shared configuration packages for TypeScript, linting, and formatting so every package inherits the same rules.
6. Add a task runner (Turborepo) with `build`, `dev`, `lint`, `test`, and `typecheck` tasks wired to the dependency graph.
7. Define package boundaries: what may import what, enforced by lint rules or the task graph — see `package-boundaries`.
8. Set up CI to run affected tasks only (changed packages and their dependents), not the whole repository on every push.
9. Document the layout, how to add a new app or package, and how to run tasks, in the repository README.
10. Run the Validation Checklist.

## Implementation Standards

- One lockfile at the root; never commit per-package lockfiles.
- Packages reference each other with workspace protocol versions (`workspace:*`), never with published version numbers for internal code.
- Every package has a name, a version, and a clear README stating what it is for and what may depend on it.
- Shared configuration lives in packages (`@repo/typescript-config`, `@repo/eslint-config`) that other packages extend; do not copy config files per package.
- The root `package.json` holds only repository-wide scripts and dev tooling, not application code.
- Apps depend on packages; packages never depend on apps.
- Keep the package count small at first: split a package only when two consumers need different parts of it.
- Use the task runner's dependency graph (`^build` style ordering) so builds run in the right order.

## Best Practices

- Start with the simplest layout that works (`apps/`, `packages/`) and grow it; do not design for ten apps on day one.
- Name packages with a shared scope (`@repo/ui`, `@repo/db`) so internal imports are recognizable at a glance.
- Keep shared packages small and single-purpose; a `utils` package that holds everything becomes a dumping ground.
- Version shared packages independently when they are published; use changesets to manage releases and changelogs.
- Run formatting and linting from the root so one command covers the repository.
- Measure install and CI times as the repository grows; a slow monorepo pushes people back toward separate repos.

## Security Considerations

- A single repository means a single access boundary: anyone with write access can change any package, including shared security-sensitive code. Use code ownership (CODEOWNERS) for sensitive packages.
- Shared dependencies mean a compromised dependency affects every app; audit dependencies centrally — see `dependency-management`.
- Secrets live in environment files per app, never in shared packages or the repository.
- Published packages need their own review: a package published to a registry is public by default unless scoped private.

## Performance Considerations

- Use the task runner's caching (local and remote) so unchanged packages are not rebuilt or retested.
- CI should run affected tasks only; running everything on every push does not scale past a handful of packages.
- Keep the dependency graph shallow: deep chains of packages slow installs and builds.
- The package manager's store (pnpm's content-addressable store) keeps installs fast and disk use low; prefer it over npm's duplicated `node_modules`.

## Common Mistakes

- No shared configuration — each package drifts its own TypeScript and lint rules until nothing is consistent.
- Apps importing from another app's source — apps are not libraries; shared code goes in a package.
- A `packages/utils` dumping ground — split by domain, not by "miscellaneous".
- Running every task for every package in CI — use affected-only execution.
- Versioning internal packages with published numbers instead of workspace references — updates stop being atomic.
- Growing the monorepo without documenting how to add a package — new contributors guess and the layout decays.

## Examples

Repository layout:

```text
.
├── apps/
│   ├── web/            # deployable app
│   └── api/            # deployable app
├── packages/
│   ├── ui/             # shared components
│   ├── db/             # database client and schema
│   ├── eslint-config/  # shared lint rules
│   └── typescript-config/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

Root `package.json` (scripts delegate to the task runner):

```json
{
  "name": "repo-root",
  "private": true,
  "packageManager": "pnpm@12",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  }
}
```

## Validation Checklist

- [ ] Workspace file lists `apps/*` and `packages/*`; one lockfile at the root.
- [ ] Node and package manager versions pinned.
- [ ] First app imports the first shared package via a workspace reference.
- [ ] Shared TypeScript, lint, and formatting configuration packages exist and are used.
- [ ] Task runner runs build, lint, test, and typecheck across the graph.
- [ ] Package boundaries documented and enforced.
- [ ] CI runs affected tasks only.
- [ ] README documents the layout and how to add an app or package.

## Expected Deliverables

- The monorepo layout with workspace configuration and pinned tool versions.
- At least one app and one shared package wired together.
- Shared configuration packages and task runner configuration.
- CI configuration running affected tasks, and README documentation.

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo documentation](https://turborepo.dev/docs)
- [Nx documentation](https://nx.dev/docs)
- Related skills in this repository: `pnpm-workspaces`, `turborepo`, `package-boundaries`, `dependency-management`.
