---
name: pnpm-workspaces
description: >
  Configure and use pnpm workspaces: workspace files, workspace protocol
  dependencies, shared catalog versions, filtering commands, and managing
  dependencies across packages. Use when the task mentions pnpm, pnpm
  workspaces, pnpm-workspace.yaml, workspace protocol, catalog, or running
  pnpm commands across packages in a monorepo.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# pnpm Workspaces

## Purpose

pnpm workspaces let one repository hold many packages with a single
lockfile, linked local dependencies, and a shared content-addressable
store. This skill covers configuring a pnpm workspace, linking packages
with the workspace protocol, keeping dependency versions consistent, and
running commands across packages.

## When to Use

- Setting up or maintaining a pnpm-based monorepo.
- The task mentions pnpm, pnpm workspaces, `pnpm-workspace.yaml`, workspace protocol, or catalogs.
- Adding a package to a pnpm workspace or linking packages together.
- Fixing pnpm workspace issues: phantom dependencies, hoisting, or version drift.

## When Not to Use

- The repository uses npm or Yarn workspaces — use their docs and the `monorepo` skill instead.
- The task is only about task running and caching — use `turborepo`.
- The task is only about dependency policy (updates, audits) — use `dependency-management`.

## Prerequisites

- pnpm installed and the version pinned (`packageManager` in the root `package.json`).
- The monorepo layout decided: which directories hold apps and packages.
- Supported versions: pnpm 12.x is current
  (stable August 2026; a Rust rewrite that keeps pnpm 11's commands,
  flags, settings, and lockfile format, so upgrading needs no
  migration). pnpm 11 is supported until 2027-04-30; pnpm 10 and
  earlier are unsupported. pnpm 11 requires Node.js 22 or later.
  Version differences to know: in pnpm 12, `--frozen-lockfile false`
  is no longer accepted (use `--no-frozen-lockfile`); an unrecognized
  key in `pnpm-workspace.yaml` is reported instead of silently
  ignored; git dependencies resolve through the host's canonical HTTPS
  URL, never SSH; and CI installs default to frozen-lockfile mode when
  a non-empty lockfile exists (pass `--frozen-lockfile` explicitly
  anyway so the intent is visible).
- Node.js 26 LTS is the current line (Active LTS since 2026-10-28,
  supported to 2029-04-30); Node.js 24 is in maintenance until
  2028-04-30. Node.js 20 and 25 are end-of-life.

## Official Documentation

- [pnpm Workspaces](https://pnpm.io/workspaces) — workspace configuration and the workspace protocol.
- [pnpm Catalogs](https://pnpm.io/catalogs) — shared version definitions across packages.
- [pnpm Filtering](https://pnpm.io/filtering) — running commands against selected packages.
- [pnpm documentation](https://pnpm.io/) — the full pnpm reference.

## Required Workflow

1. Create `pnpm-workspace.yaml` at the repository root with `packages:` globs covering `apps/*` and `packages/*`.
2. Pin the pnpm version in the root `package.json` (`packageManager` field) so every contributor and CI uses the same version.
3. Add a `catalog:` section to `pnpm-workspace.yaml` for dependencies shared across packages, so versions stay consistent.
4. Create each package with its own `package.json`; reference sibling packages with the workspace protocol (`"@repo/ui": "workspace:*"`).
5. Install from the root with `pnpm install`; verify a single `pnpm-lock.yaml` exists at the root and none inside packages.
6. Add dependencies with filtering: `pnpm --filter <name> add <dep>` for one package, `pnpm add -w -D <dep>` for a root dev dependency.
7. Run scripts across packages with filters: `pnpm --filter <name> <script>`, `pnpm -r <script>` for all packages, or delegate to Turborepo for graph-aware runs.
8. Configure shared settings in `.npmrc` at the root (strict peer dependency behavior, engine checks) and keep it minimal.
9. Verify the workspace: `pnpm -r list --depth -1` shows all packages, and a clean install from a fresh checkout works.
10. Run the Validation Checklist.

## Implementation Standards

- One `pnpm-lock.yaml` at the root; never commit lockfiles inside packages.
- Internal dependencies always use the workspace protocol; never a published version number for a sibling package.
- Shared third-party versions go in the catalog; packages reference them as `catalog:` so a version bump is one change.
- Never use `file:` or relative-path dependencies for sibling packages; the workspace protocol is the mechanism.
- Root `package.json` is `private: true` and holds only repository tooling and scripts.
- Do not disable strict peer dependency checks globally to silence an error; fix the peer range or add an explicit override in one place.
- Keep `.npmrc` minimal and committed; machine-specific settings belong in the user's global config, not the repository.
- Use `pnpm dlx` for one-off tools instead of installing them globally or per package.

## Best Practices

- Use `--filter` with dependency selectors (`...<name>` for a package and its dependencies, `<name>...` for dependents) when running targeted tasks.
- Keep the catalog small: only dependencies used by more than one package belong there.
- Add a `preinstall` guard (for example the `only-allow` package) so contributors cannot accidentally install with npm or Yarn. Corepack is an alternative, but it is bundled with Node.js only through version 24; on Node.js 25 and later install it explicitly (`npm install -g corepack`) or install pnpm directly.
- Run `pnpm install --frozen-lockfile` in CI so a drifted lockfile fails loudly instead of silently changing.
- Use `pnpm why <dep>` and `pnpm list` to diagnose duplicate or unexpected versions.
- Document the common commands (install, add a dependency, run a package script) in the repository README.

## Security Considerations

- pnpm's strict default layout (no phantom dependencies) is a security feature: packages can only import what they declare. Do not weaken it with hoisting settings to paper over missing declarations.
- pnpm 11 and later are safer by default: newly published releases are held for 24 hours (`minimumReleaseAge: 1440`), exotic subdependencies are blocked, and dependency build scripts need explicit approval (`allowBuilds`, `pnpm approve-builds`). Do not disable these defaults.
- Audit dependencies centrally with `pnpm audit`; a vulnerability in a shared dependency affects every package.
- Only install from the configured registry; do not add untrusted registries to `.npmrc`.
- Lockfile integrity: `--frozen-lockfile` in CI prevents a tampered or drifted lockfile from changing what gets installed.

## Performance Considerations

- pnpm's content-addressable store means repeated installs across projects reuse downloaded packages; keep the store on fast local disk.
- A single lockfile and one install at the root is faster than per-package installs.
- Use `--filter` to run work on only the packages that changed; `-r` across everything is for full-repository tasks.
- Keep the dependency graph shallow: deep internal chains slow installs and make version resolution harder.

## Common Mistakes

- Installing inside a package directory and creating a nested lockfile — always install from the root.
- Forgetting the workspace protocol and depending on a published version of a sibling — changes stop being atomic.
- Adding a dependency to the wrong package because the command ran without `--filter` — check which `package.json` changed.
- Disabling strict peers globally to silence one warning — fix the peer range instead.
- Committing `node_modules` or a nested lockfile — both belong in `.gitignore` or not at all.
- Using `pnpm install` in CI instead of `--frozen-lockfile` — CI should verify the lockfile, not rewrite it.

## Examples

`pnpm-workspace.yaml` with packages and a catalog:

```yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  typescript: "^7"
  react: "^19"
```

Depending on a sibling package and a catalog version:

```json
{
  "name": "@repo/web",
  "dependencies": {
    "@repo/ui": "workspace:*",
    "react": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

Common filtered commands:

```bash
pnpm --filter @repo/web add react
pnpm --filter @repo/web... build
pnpm --filter "./packages/*" test
pnpm install --frozen-lockfile
```

## Validation Checklist

- [ ] `pnpm-workspace.yaml` lists all apps and packages; one lockfile at the root.
- [ ] pnpm version pinned in the root `package.json`.
- [ ] Internal dependencies use `workspace:*`; shared versions use the catalog.
- [ ] `pnpm -r list` shows every package.
- [ ] Clean install from a fresh checkout succeeds.
- [ ] CI uses `--frozen-lockfile`.
- [ ] Common commands documented in the README.

## Expected Deliverables

- The workspace configuration (`pnpm-workspace.yaml`, pinned versions, `.npmrc`).
- Packages linked with the workspace protocol and catalog versions where shared.
- CI using frozen-lockfile installs.
- README documentation of the workspace commands.

## References

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm Catalogs](https://pnpm.io/catalogs)
- [pnpm Filtering](https://pnpm.io/filtering)
- Related skills in this repository: `monorepo`, `turborepo`, `dependency-management`, `package-boundaries`.
