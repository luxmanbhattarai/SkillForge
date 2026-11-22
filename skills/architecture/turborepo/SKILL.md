---
name: turborepo
description: >
  Configure and use Turborepo to run builds, tests, linting, and typechecking
  across a monorepo with dependency-aware ordering and caching. Use when the
  task mentions Turborepo, turbo.json, task pipelines, build caching, remote
  caching, or making monorepo builds and CI faster.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Turborepo

## Purpose

Turborepo runs tasks across monorepo packages in dependency order and
caches results so unchanged work is never repeated. This skill covers
configuring `turbo.json`, wiring the standard tasks, using affected-only
execution in CI, and enabling remote caching.

## When to Use

- Adding a task runner to a monorepo (pnpm, npm, or Yarn workspaces).
- The task mentions Turborepo, `turbo.json`, task pipelines, build caching, or remote caching.
- Monorepo builds or CI are slow because every task runs for every package.
- Debugging task ordering or cache misses in an existing Turborepo setup.

## When Not to Use

- A single-package repository — a task runner adds nothing without a package graph.
- The task is only about workspace configuration — use `pnpm-workspaces`.
- The team has chosen Nx — use the Nx docs and the `monorepo` skill instead.

## Prerequisites

- A monorepo with a workspace tool already configured (pnpm workspaces is the recommended default).
- Each package has the scripts Turborepo will run (`build`, `lint`, `test`, `typecheck`, `dev`).
- Turborepo installed (the `turbo` package) at the repository root.
- Supported versions: Turborepo 2.x is current
  (latest stable 2.11.x, November 2026). Turborepo 1.x is end-of-life
  and 3.0 is in canary. In 2.x the `turbo.json` top-level key is
  `tasks`; the 1.x `pipeline` key was renamed and must not be used.
  The `daemon` top-level option is deprecated and will be removed in
  3.0. Use Turborepo 2.9.14 or later (see Security Considerations).
- Node.js 26 LTS is the current line (Active LTS since 2026-10-28,
  supported to 2029-04-30); Node.js 24 is in maintenance until
  2028-04-30. Node.js 20 and 25 are end-of-life.

## Official Documentation

- [Turborepo documentation](https://turborepo.dev/docs) — getting started, configuration, and caching.
- [Configuring turbo.json](https://turborepo.dev/docs/reference/configuration) — the task configuration reference.
- [Turborepo caching](https://turborepo.dev/docs/crafting-your-repository/caching) — how local and remote caching work.

## Required Workflow

1. Install `turbo` as a root dev dependency and add root scripts that delegate to it (`turbo run build`, `turbo run test`, and so on).
2. Create `turbo.json` at the repository root with the `$schema` key pointing at the Turborepo schema.
3. Define the `build` task with `dependsOn: ["^build"]` (a package builds after its dependencies) and `outputs` listing what the build produces (for example `dist/**`).
4. Define `lint`, `test`, and `typecheck` tasks; give `typecheck` and `test` a `dependsOn` of `["^build"]` only when they genuinely need built dependencies.
5. Define `dev` as a persistent task (`"persistent": true`) with no cache, since it runs a long-lived process.
6. Run `turbo run build` twice: the second run should report full cache hits, proving caching works.
7. Wire CI to run affected packages only: on Turborepo 2.10 and later
   use `turbo run build lint test typecheck --affected` (equivalent to
   `--filter=...[main...HEAD]` by default, and composable with
   `--filter`); on earlier 2.x versions use
   `turbo run build lint test typecheck --filter=...[HEAD^1]` or the
   equivalent for the CI provider, so unchanged packages are skipped.
8. Enable remote caching when the team is ready: connect the repository to a remote cache so CI and developers share cache entries.
9. Document the tasks and the common commands in the repository README.
10. Run the Validation Checklist.

## Implementation Standards

- Every task in `turbo.json` maps to a script of the same name in the packages that need it; packages without that script are skipped.
- `outputs` must list every file a task produces, or caching restores an incomplete result.
- `dependsOn: ["^build"]` goes on tasks that need built dependencies; do not add it to tasks that work from source.
- Environment variables that affect a task's output must be declared in that task's `env` list, or the cache serves stale results when they change.
- Persistent tasks (`dev`, `watch`) are marked `"persistent": true` and are never cached.
- Use `--filter` for targeted work (`turbo run build --filter=@repo/web...` builds a package and its dependencies).
- Keep `turbo.json` at the root only; per-package `turbo.json` files are for overrides and should be rare.
- Pin the `turbo` version in the root `package.json` so local and CI behavior match.

## Best Practices

- Start with the four standard tasks (build, lint, test, typecheck) plus dev; add more only when a real need appears.
- Verify cache behavior after every `turbo.json` change: run the task twice and confirm the second run is a full cache hit.
- Use `turbo run ... --dry-run` to inspect the task graph and see what will run before committing a change.
- Share the remote cache across the team and CI; a cache that only CI uses helps CI, not developers.
- Keep task inputs small: a task that reads the whole repository invalidates its cache on any change.
- Name tasks consistently across packages so one `turbo run` command covers the repository.

## Security Considerations

- Remote cache entries can contain build outputs; use a cache the team controls and authenticate access to it.
- Use Turborepo 2.9.14 or later: earlier versions can execute arbitrary
  code from a malicious Yarn configuration when run in an untrusted
  repository (CVE-2026-45772, fixed in 2.9.14).
- Environment variables listed in a task's `env` are hashed into the cache key; do not put secret values in `env` lists — only their names.
- Build outputs restored from cache are trusted; a compromised cache entry could inject code, so protect cache credentials like any other credential.
- Turborepo runs package scripts; a malicious script in any package runs with the developer's or CI's privileges — review scripts in new packages.

## Performance Considerations

- Caching is the main win: a full cache hit skips the work entirely, so correct `inputs` and `outputs` matter more than any other tuning.
- Remote caching turns CI builds into cache restores for unchanged packages; it is the single biggest CI speedup for most monorepos.
- Parallelism defaults to 10 concurrent tasks; raise it with
  `--concurrency` (for example `--concurrency=100%` to use all logical
  processors) or the `concurrency` key in `turbo.json`. On shared CI
  runners, cap it if builds compete for memory.
- Cache misses have causes: undeclared env vars, timestamps in outputs, or overly broad inputs. Investigate misses instead of disabling the cache.
- Keep the task graph shallow; deep dependency chains serialize work that could run in parallel.

## Common Mistakes

- Forgetting `outputs` on the build task — Turborepo caches nothing and every run rebuilds.
- Declaring `dependsOn: ["^build"]` on `lint` — lint works from source and now waits for builds for no reason.
- Not declaring `env` for variables that change output — the cache serves stale builds after a config change.
- Caching the `dev` task — it never finishes, so it must be persistent and uncached.
- Running `turbo run build` in CI without a filter — the whole repository builds on every push; use affected filters.
- Different `turbo` versions locally and in CI — behavior and cache keys diverge.

## Examples

Minimal `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Common commands:

```bash
turbo run build
turbo run build --filter=@repo/web...
turbo run build --affected
turbo run lint test --filter=...[HEAD^1]
turbo run build --dry-run
```

## Validation Checklist

- [ ] `turbo.json` exists at the root with build, lint, test, typecheck, and dev tasks.
- [ ] Build task declares `dependsOn: ["^build"]` and correct `outputs`.
- [ ] Second run of `turbo run build` reports full cache hits.
- [ ] Dev task is persistent and uncached.
- [ ] Environment variables affecting output are declared in task `env` lists.
- [ ] CI runs affected packages only.
- [ ] Remote caching enabled or explicitly deferred with a reason.
- [ ] `turbo` version pinned; root scripts delegate to `turbo run`.

## Expected Deliverables

- The `turbo.json` configuration and root scripts.
- CI configuration using affected filters and (where enabled) remote caching.
- A cache verification note: second-run cache hits confirmed.
- README documentation of the tasks and common commands.

## References

- [Turborepo documentation](https://turborepo.dev/docs)
- [Configuring turbo.json](https://turborepo.dev/docs/reference/configuration)
- [Turborepo caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- Related skills in this repository: `monorepo`, `pnpm-workspaces`, `package-boundaries`.
