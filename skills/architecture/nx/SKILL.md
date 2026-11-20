---
name: nx
description: >
  Set up and run an Nx monorepo workspace: project graph, affected builds,
  task orchestration with dependsOn pipelines, local and remote caching,
  generators, module boundaries with tags and dependency constraints, CI
  optimization with Nx Cloud, and migration from Turborepo or other
  monorepo tools. Use when the task mentions Nx, nx.json, nx graph,
  nx affected, nx run-many, Nx Cloud, or choosing a monorepo task runner.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Nx

## Purpose

Nx is a build system for JavaScript and TypeScript monorepos (with
plugins extending it to other languages) that runs tasks in dependency
order, caches results so unchanged work is never repeated, and enforces
architectural boundaries between projects. This skill covers setting up
an Nx workspace, using the project graph and affected commands, defining
task pipelines, configuring caching, scaffolding with generators,
enforcing module boundaries, optimizing CI, and migrating from another
monorepo tool.

## When to Use

- Adding Nx to a new or existing monorepo, or choosing between Nx and Turborepo.
- The task mentions Nx, `nx.json`, `nx graph`, `nx affected`, `nx run-many`, Nx Cloud, or module boundaries with tags.
- Monorepo builds or CI are slow and the team wants affected-only execution and caching.
- Scaffolding projects consistently with generators, or enforcing which projects may depend on which.
- Migrating a monorepo from Turborepo, Lerna, or plain package-manager workspaces to Nx.

## When Not to Use

- A single-package repository — Nx adds nothing without a project graph.
- The team has chosen Turborepo — use `turborepo`.
- The task is only about workspace layout or the package manager — use `monorepo` or `pnpm-workspaces`.
- The task is only about release versioning and changelogs — use `changesets` or `release-management`.

## Prerequisites

- A monorepo (or a project becoming one) with a workspace tool already configured; pnpm workspaces is the recommended default — see `pnpm-workspaces`.
- Each project has the scripts Nx will run (`build`, `lint`, `test`, `typecheck`, `dev`), or a plugin that infers them from tool configuration.
- Node.js 26 LTS is the current line (Active LTS since 2026-10-28,
  supported to 2029-04-30); Node.js 24 is in maintenance until
  2028-04-30. Node.js 20 and 25 are end-of-life.
- Supported versions (verified 2026-11-20): Nx 24.x is current
  (v24 released 2026-10-21; latest stable 24.0.6, November 2026). Nx
  23 and 22 are in LTS; earlier majors are unsupported. Nx releases a
  new major every six months (around April and October); each major
  gets 18 months of total support. Confirm the supported Node.js
  engine range for the Nx major in use in the official release notes
  before upgrading.

## Official Documentation

- [Nx documentation](https://nx.dev/docs) — getting started, concepts, and guides.
- [Add Nx to an existing project](https://nx.dev/docs/getting-started/start-with-existing-project) — the `nx init` adoption path.
- [Run tasks](https://nx.dev/docs/features/run-tasks) — run-many, affected, task pipelines.
- [Cache task results](https://nx.dev/docs/features/cache-task-results) — local and remote caching, inputs and outputs.
- [Explore the project graph](https://nx.dev/docs/features/explore-graph) — `nx graph` and `nx show`.
- [Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) — tags and dependency constraints.
- [Local generators](https://nx.dev/docs/kb/local-generators) — creating workspace generators.
- [Nx release schedule and support policy](https://nx.dev/docs/reference/releases) — supported versions and LTS dates.

## Required Workflow

1. Add Nx to the workspace: run `npx nx@latest init` from the repository root and answer the prompts. This creates `nx.json` and adds `nx` as a dev dependency; it does not restructure the repository or rewrite scripts.
2. Verify the project graph: run `nx show projects` to list detected projects, then `nx graph` to inspect the dependency graph visually. Fix any missing or surprising edges (usually a missing import or a `package.json` dependency) before going further.
3. Run the standard tasks through Nx: `nx run-many -t build lint test typecheck` across the workspace, then run the same command a second time and confirm the second run is a cache hit.
4. Define the task pipeline in `nx.json` `targetDefaults`: `build` gets `dependsOn: ["^build"]` so a project builds after its dependencies; add same-project ordering (for example `test` depending on `build`) only where the task genuinely needs it.
5. Mark cacheable tasks in `targetDefaults` (`"cache": true` for `build` and `test`) and declare `inputs` and `outputs` for each — outputs are what Nx restores on a cache hit, so an incomplete list restores an incomplete result.
6. Wire affected-only execution for local work and CI: `nx affected -t build lint test typecheck` runs tasks only for projects affected by the change (Nx compares against the merge base by default).
7. Add module boundaries: tag projects by scope and layer in their `package.json` (`nx.tags`) or `project.json`, then enforce constraints with the `@nx/enforce-module-boundaries` lint rule — see `package-boundaries` for the boundary design.
8. Add generators for repeatable scaffolding: use plugin generators (`nx g @nx/js:lib`, `nx g @nx/react:app`) for new projects, and create a local generator for workspace-specific boilerplate (a new package with the team's tags, config, and README).
9. Connect Nx Cloud when the team is ready for remote caching, distributed task execution, and task splitting; keep local caching working first — remote caching is an addition, not a fix for a broken local setup.
10. Document the workspace: the common commands, how to add a project, the tag scheme, and the CI setup, in the repository README.
11. Run the Validation Checklist.

## Implementation Standards

- `nx.json` lives at the workspace root and holds `targetDefaults`, the plugin list, and workspace-wide settings; per-project overrides live in the project's `package.json` (`nx` key) or `project.json`.
- Task configuration merges from three sources, lowest to highest precedence: plugin-inferred configuration, `targetDefaults` in `nx.json`, then the project's own configuration. Put shared rules in `targetDefaults`, not per project.
- Every cacheable target declares `inputs` and `outputs`. Exclude files that do not affect output (for example `!{projectRoot}/**/*.md`) so unrelated edits do not invalidate the cache.
- `dependsOn: ["^build"]` means "run this target on project dependencies first"; a bare target name means "run that target on the same project first". Do not add ordering a task does not need — it serializes work that could run in parallel.
- Long-running tasks (`dev`, `serve`) are continuous tasks, not cacheable ones; never mark them cacheable.
- Projects are tagged at creation time; an untagged project cannot depend on any other project under the boundary rule, so tagging is part of creating a project, not a later cleanup.
- Pin the `nx` version (and plugin versions) in the root `package.json` so local and CI behavior match; upgrade with `nx migrate`, never by hand-editing version numbers.
- Keep `nx.json` free of secrets: tokens for Nx Cloud belong in environment variables or the CI secret store.

## Best Practices

- Start with the task runner and caching, then adopt plugins, generators, and boundaries incrementally — Nx is modular and the value arrives in that order.
- Use `nx show project <name>` to see every task Nx detected for a project and where each setting came from before debugging a task by reading config files.
- Use `nx build <project> --graph` to inspect the task graph for one command before committing a pipeline change.
- Keep the project graph shallow: deep dependency chains serialize builds and make affected ranges large.
- Name targets consistently across projects so one `nx run-many -t <target>` command covers the workspace.
- Use tags for more than boundaries: filter commands by tag (`nx run-many -t test --projects=tag:scope:client`) to run work for one team or layer.
- After a branch switch or a config edit, run `nx reset` if the graph or cache behaves unexpectedly — Nx caches graph state and the daemon keeps it in memory.
- Prefer inferred tasks from plugins over hand-written `project.json` targets; plugins keep inputs, outputs, and dependencies in sync with the underlying tool's config.

## Security Considerations

- The Nx daemon and the `nx graph` server run locally; the graph is served only to local same-origin requests (Nx 24.0.4+). Do not expose the graph server beyond localhost.
- Remote cache entries contain build outputs and terminal output; use a cache the team controls (Nx Cloud or a self-hosted cache) and protect its access token like any credential. Restrict cache-write access to trusted CI and developers.
- Cache keys hash task inputs including environment variables; never put secret values in task inputs — only their names, and only where the output genuinely depends on them.
- Nx runs project scripts and generator code with the developer's or CI's privileges; review generators and plugin code from untrusted sources before running them, and review scripts in new projects.
- `nx migrate` runs migration code from the packages being upgraded; run migrations in a branch, review the diff, and never migrate directly on the default branch.
- Keep Nx and its plugins current: Nx 24.0.3 bumped `undici` to patch security advisories, and patch releases regularly carry security fixes. Use the latest patch of the supported major.

## Performance Considerations

- Caching is the main win: a full cache hit skips the work entirely, so correct `inputs` and `outputs` matter more than any other tuning. A task that hashes the whole workspace invalidates on any change; scope inputs to the project.
- Remote caching turns CI builds into cache restores for unchanged projects; combined with `nx affected`, it is the single biggest CI speedup for most monorepos.
- Nx Cloud's Ultracache (Nx 24.0.0+) traces the files a task actually reads on Workers and hashes from those, so a change to a file the task never reads no longer causes a cache miss. It requires connecting the workspace to Nx Cloud and distributing tasks on Workers.
- Nx parallelizes tasks across the graph; control concurrency with `--parallel` (or the `parallel` option in `nx.json`) and cap it on memory-constrained CI runners.
- Distributed task execution (Nx Cloud) splits the task graph across machines; use it when a single runner is the bottleneck, not before affected-only execution and caching are in place.
- Investigate cache misses instead of disabling the cache: common causes are undeclared environment variables, timestamps in outputs, and overly broad inputs. `nx show project` and the Nx Cloud run view show what a task hashed.
- The daemon keeps the project graph in memory for fast commands; on very large workspaces it uses noticeable memory, which is the price of fast graph queries.

## Common Mistakes

- Forgetting `outputs` on the build target — Nx caches nothing and every run rebuilds.
- Declaring `dependsOn: ["^build"]` on `lint` or `test` when they work from source — they now wait for builds for no reason.
- Running `nx run-many` in CI without `affected` — the whole workspace builds on every push.
- Tagging projects after the fact — untagged projects fail boundary checks, so tag at creation via the generator.
- Hand-editing `nx` versions in `package.json` instead of using `nx migrate` — config migrations are skipped and the workspace breaks in subtle ways.
- Caching the `dev` task — it never finishes, so it must be a continuous task, not a cached one.
- Different `nx` versions locally and in CI — behavior and cache keys diverge.
- Adding a plugin per project instead of once in `nx.json` — plugin configuration is workspace-wide.

## Examples

Minimal `nx.json` with a task pipeline and caching:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist/**"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production"]
    },
    "lint": {
      "cache": true
    },
    "typecheck": {
      "cache": true,
      "dependsOn": ["^build"]
    }
  }
}
```

Tagging a project and constraining dependencies (ESLint flat config):

```json
// packages/ui/package.json (excerpt)
{
  "name": "@repo/ui",
  "nx": {
    "tags": ["scope:shared", "type:ui"]
  }
}
```

```js
// eslint.config.mjs (excerpt)
import nx from "@nx/eslint-plugin";

export default [
  ...nx.configs["flat/base"],
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          depConstraints: [
            {
              sourceTag: "scope:shared",
              onlyDependOnLibsWithTags: ["scope:shared"],
            },
            {
              sourceTag: "scope:client",
              onlyDependOnLibsWithTags: ["scope:shared", "scope:client"],
            },
          ],
        },
      ],
    },
  },
];
```

Common commands:

```bash
nx show projects                    # list all projects
nx graph                            # open the interactive project graph
nx run-many -t build lint test      # run tasks for all projects
nx affected -t build lint test      # run tasks only for affected projects
nx build my-app --graph             # inspect the task graph for one build
nx g @nx/js:lib packages/new-lib    # generate a library from a plugin
nx migrate latest                   # upgrade Nx and its plugins
nx reset                            # clear cached graph state and daemon
```

## Validation Checklist

- [ ] `nx.json` exists at the root with `targetDefaults` for build, lint, test, and typecheck.
- [ ] `nx show projects` lists every project; `nx graph` shows the expected dependency edges.
- [ ] Second run of `nx run-many -t build` reports full cache hits.
- [ ] Build target declares `dependsOn: ["^build"]` and correct `outputs`.
- [ ] CI runs `nx affected` (or an equivalent affected filter) rather than the whole workspace.
- [ ] Projects are tagged and the boundary rule runs in lint/CI with zero violations.
- [ ] Remote caching enabled or explicitly deferred with a reason.
- [ ] `nx` version pinned; generators used for new projects; README documents the commands.

## Expected Deliverables

- The `nx.json` configuration and root scripts delegating to Nx.
- A verified project graph and a cache verification note (second-run cache hits confirmed).
- Tag scheme and boundary enforcement wired into lint and CI.
- CI configuration using affected-only execution and (where enabled) remote caching.
- README documentation of the workspace commands and how to add a project.

## References

- [Nx documentation](https://nx.dev/docs)
- [Run tasks](https://nx.dev/docs/features/run-tasks)
- [Cache task results](https://nx.dev/docs/features/cache-task-results)
- [Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries)
- [Nx release schedule and support policy](https://nx.dev/docs/reference/releases)
- Related skills in this repository: `monorepo`, `turborepo`, `pnpm-workspaces`, `package-boundaries`, `dependency-management`.
