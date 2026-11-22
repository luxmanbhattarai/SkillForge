---
name: dependency-management
description: >
  Manage project dependencies deliberately: choosing, adding, updating,
  auditing, and removing packages, keeping versions consistent across a
  monorepo, and handling security advisories. Use when the task mentions
  dependencies, dependency updates, package versions, audits, vulnerabilities,
  lockfiles, Renovate, Dependabot, or adding or removing a package.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Dependency Management

## Purpose

Every dependency is code the project trusts but does not own. This skill
covers managing that trust deliberately: evaluating a package before
adding it, keeping versions consistent and current, auditing for
vulnerabilities, and removing what is no longer needed.

## When to Use

- Adding, updating, or removing a dependency.
- The task mentions dependencies, package versions, audits, vulnerabilities, lockfiles, Renovate, or Dependabot.
- Fixing version conflicts, duplicate packages, or a drifted lockfile.
- Setting up automated dependency updates for a repository.

## When Not to Use

- The task is only about workspace layout — use `pnpm-workspaces` or `monorepo`.
- The task is only about package boundaries — use `package-boundaries`.
- The task is a security review of application code rather than dependencies — use `auth-security` or the app's security review process.

## Prerequisites

- The package manager and lockfile are in place (pnpm with `pnpm-lock.yaml` is the recommended default).
- Supported versions: pnpm 12.x is current
  (stable August 2026; a Rust rewrite that keeps pnpm 11's commands,
  flags, settings, and lockfile format). pnpm 11 is supported until
  2027-04-30; pnpm 10 and earlier are unsupported. The npm CLI's
  current major is npm 12 (July 2026); note that the npm bundled with
  Node.js is still 11.x (Node.js 26 ships npm 11.20.0), so npm 12 must
  be installed explicitly (`npm install -g npm@12`).
- CI runs installs from the lockfile (`--frozen-lockfile` for pnpm).
- The team has a way to receive security advisories (GitHub Dependabot alerts, Renovate, or `pnpm audit` in CI).

## Official Documentation

- [pnpm documentation](https://pnpm.io/) — install, update, audit, and outdated commands.
- [Renovate documentation](https://docs.renovatebot.com/) — automated dependency updates.
- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot) — GitHub's automated updates and alerts.
- [npm audit documentation](https://docs.npmjs.com/cli/v12/commands/npm-audit) — the npm audit command reference.

## Required Workflow

1. Before adding a dependency, justify it: what it does, why the standard library or existing dependencies cannot do it, and what its maintenance state is.
2. Evaluate the candidate: maintained recently, reasonable size, no known critical vulnerabilities, a license the project can use, and a download and issue history that suggests real usage.
3. Add it with the package manager from the right location (root for tooling, the owning package for library code) and commit the lockfile change in the same commit.
4. Pin the version range deliberately: a caret range for libraries that follow semantic versioning, an exact version only when a specific release is required.
5. In a monorepo, put shared dependencies in the catalog (`pnpm-workspace.yaml`) so every package uses the same version.
6. Run the audit regularly (`pnpm audit`) and fix critical and high vulnerabilities promptly; record any accepted risk with a reason and an expiry.
7. Update dependencies on a schedule (weekly or per sprint) with automated pull requests from Renovate or Dependabot; group minor and patch updates, review major updates individually.
8. Test after every update: run the full test suite and typecheck before merging an update.
9. Remove unused dependencies: check with the package manager's tooling and remove the package and its lockfile entries.
10. Run the Validation Checklist.

## Implementation Standards

- The lockfile is committed and is the source of truth; CI installs with `--frozen-lockfile`.
- One version of a shared dependency across the repository (via the catalog in a monorepo); duplicate major versions are resolved, not tolerated.
- Dependencies are declared in the package that uses them; never rely on a transitive or hoisted dependency.
- `dependencies` vs `devDependencies` is respected: build and test tooling never ships in production bundles.
- Major version updates are reviewed individually: read the changelog, check for breaking changes, and update code in the same change.
- Security advisories are triaged by severity and exploitability; a vulnerability in a dev-only dependency is lower priority than one in production code.
- Overrides (forced resolutions) are a last resort, documented with a comment explaining why, and revisited on each update cycle.
- No dependency is added without a lockfile update in the same commit.

## Workspace Dependency Governance

In a monorepo, dependency decisions are repository-wide: one package's
choice becomes every package's problem. This section governs
dependencies across workspace packages. The workspace layout itself is
covered by `pnpm-workspaces` and `monorepo`; import direction and
boundaries by `package-boundaries`; the task graph that consumes the
dependency graph by `turborepo` and `nx`.

- **Workspace protocol.** Internal dependencies always use
  `workspace:*` (or a `workspace:` range when a package genuinely
  needs a published version). Never depend on a sibling by a published
  version number: changes stop being atomic and the lockfile can
  resolve the sibling to a stale release. `workspace:*` also keeps
  `changeset version` and the release tooling able to rewrite internal
  ranges at publish time.
- **Dependency constraints.** Declare which dependencies a package may
  use, not just which it does use: a shared UI package must not depend
  on a server-only database client, and a published library must not
  depend on an internal-only package. Enforce with boundary rules (see
  `package-boundaries`) and, where the tooling supports it, with
  workspace-level allowlists reviewed in code review.
- **Hoisting vs isolated node_modules.** pnpm's default layout is
  isolated: a package can only import what it declares, and there is
  no hoisted flat `node_modules` to paper over a missing declaration.
  Do not weaken this with hoisting settings (`node-linker=hoisted`,
  `public-hoist-pattern`) to fix a phantom dependency — declare the
  dependency instead. Hoisting is a compatibility escape hatch for a
  tool that genuinely requires it, not a default; document each use
  with the reason.
- **Deduplication.** One version of each shared dependency across the
  repository. Use the catalog (`pnpm-workspace.yaml`) for versions
  shared by more than one package so a bump is one change. Diagnose
  duplicates with `pnpm why <dep>` and `pnpm list`; resolve duplicate
  majors deliberately (upgrade the straggler, or record a time-boxed
  exception with a reason). Duplicates bloat bundles, double memory,
  and — for singleton libraries such as React — break at runtime.
- **Version alignment across packages.** Shared peer dependencies
  (React, TypeScript, ESLint) must resolve to one version range in
  every package; misaligned peers produce duplicate installs and
  confusing build errors. The catalog is the alignment mechanism; a
  scheduled check (`pnpm outdated` across the workspace, or a CI job
  that fails on catalog drift) keeps it honest.
- **Lockfile discipline.** One lockfile at the root, committed, and
  the source of truth. CI installs with `--frozen-lockfile` so a
  drifted lockfile fails loudly. Never commit a per-package lockfile,
  never let a `package.json` change land without its lockfile update,
  and regenerate the lockfile only with the pinned package-manager
  version so the format does not churn.
- **Governance automation.** Automate what humans forget: Renovate or
  Dependabot grouped updates for shared dependencies, a CI check that
  fails on a new duplicate major version, `pnpm audit` in CI on a
  schedule, and a dependency dashboard (or a monthly review) for
  packages that fall behind. Automation proposes; a human still
  reviews major updates and security exceptions.

## Best Practices

- Prefer the standard library and small, focused packages over large frameworks for narrow needs.
- Prefer well-maintained packages with a single clear purpose; a package that does everything is harder to replace.
- Keep the dependency count low: each dependency is a supply-chain risk and a maintenance cost.
- Automate updates but keep a human in the loop for major versions.
- Use `pnpm outdated` regularly to see what is behind, and schedule the work to catch up.
- Document why a non-obvious dependency exists (a comment in `package.json` is not possible, so note it in the README or a decision record).

## Security Considerations

- Supply-chain attacks target dependencies: a compromised package update can inject code. Prefer packages with a track record, and review major updates.
- On pnpm 11 and later, installs are safer by default: newly published
  releases are held for 24 hours (`minimumReleaseAge: 1440`), exotic
  (non-registry) subdependencies are blocked, and dependency build
  scripts need explicit approval (`allowBuilds`, `pnpm approve-builds`).
  Do not disable these defaults to silence an install failure. Use
  `pnpm audit signatures` (11.1+) to verify package signatures and
  `pnpm sbom` (11.0+) to generate a software bill of materials.
- On npm 12, dependency install scripts are blocked by default unless
  allowed by the root package's `allowScripts` policy; on the npm 11
  bundled with Node.js they still run (with a warning), so upgrade to
  npm 12 or set `strict-allow-scripts` for equivalent protection.
- Audit on a schedule and on every advisory; a known vulnerability with a fix available should not linger.
- Lockfiles pin exact versions and hashes; never install without one, and never let CI rewrite it.
- Avoid installing packages from untrusted sources or arbitrary URLs; use the configured registry.
- A dependency's transitive dependencies count too: check the full tree, not just the direct list.
- Remove unused dependencies promptly; unused code is still attack surface.

## Performance Considerations

- Large dependencies slow installs, CI, and (for client bundles) page loads; check bundle impact before adding a client-side package.
- Duplicate versions of the same package bloat bundles and memory; the catalog and lockfile prevent most duplicates.
- `pnpm`'s content-addressable store keeps installs fast; keep the store healthy and do not disable it.
- Audit and outdated checks are cheap; run them in CI on a schedule, not only when something breaks.

## Common Mistakes

- Adding a dependency for a one-line function the standard library already provides.
- Committing a `package.json` change without the lockfile — CI and teammates install different versions.
- Ignoring major updates for a year and then facing a painful multi-major jump.
- Merging an automated update without running the tests — the update is the change; test it.
- Using `*` or `latest` as a version — the install is not reproducible.
- Keeping unused dependencies "in case" — they are still audited, still bundled, and still at risk.
- Resolving a peer conflict by disabling peer checks globally instead of fixing the range.

## Examples

Evaluating a candidate dependency (checklist):

```text
- Maintained: a release or commit in the last year, and open issues get responses.
- Used: real adoption (downloads, dependents) rather than a single author's experiment.
- Sized right: the package and its transitive dependencies are proportionate to the need.
- Licensed: a license the project can use (MIT, Apache-2.0, BSD, ISC are common).
- Secure: no open critical advisories; the package has no install scripts that run arbitrary code.
- Replaceable: the API surface used is small, so swapping it later is feasible.
```

Update workflow commands (pnpm):

```bash
pnpm outdated            # what is behind
pnpm audit               # known vulnerabilities
pnpm update              # update within declared ranges
pnpm update <pkg>@latest # one package to its latest release
pnpm install --frozen-lockfile  # CI install: verifies the lockfile
```

## Validation Checklist

- [ ] Every dependency justified and evaluated before adding.
- [ ] Lockfile committed and in sync; CI installs with `--frozen-lockfile`.
- [ ] Shared versions consistent via the catalog (monorepo) or a single root.
- [ ] No unused dependencies; no reliance on transitive or hoisted packages.
- [ ] Audit clean of critical and high vulnerabilities, or accepted risks recorded.
- [ ] Automated updates configured (Renovate or Dependabot).
- [ ] Major updates reviewed individually with tests passing.

## Expected Deliverables

- The dependency change (add, update, or removal) with the lockfile updated.
- The evaluation note for any new dependency.
- Audit results and the disposition of each finding.
- Automated update configuration where newly set up.

## References

- [pnpm documentation](https://pnpm.io/)
- [Renovate documentation](https://docs.renovatebot.com/)
- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot)
- Related skills in this repository: `pnpm-workspaces`, `monorepo`, `package-boundaries`, `turborepo`, `nx`.
