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
- CI runs installs from the lockfile (`--frozen-lockfile` for pnpm).
- The team has a way to receive security advisories (GitHub Dependabot alerts, Renovate, or `pnpm audit` in CI).

## Official Documentation

- [pnpm documentation](https://pnpm.io/) — install, update, audit, and outdated commands.
- [Renovate documentation](https://docs.renovatebot.com/) — automated dependency updates.
- [Dependabot documentation](https://docs.github.com/en/code-security/dependabot) — GitHub's automated updates and alerts.
- [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit) — the npm audit command reference.

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

## Best Practices

- Prefer the standard library and small, focused packages over large frameworks for narrow needs.
- Prefer well-maintained packages with a single clear purpose; a package that does everything is harder to replace.
- Keep the dependency count low: each dependency is a supply-chain risk and a maintenance cost.
- Automate updates but keep a human in the loop for major versions.
- Use `pnpm outdated` regularly to see what is behind, and schedule the work to catch up.
- Document why a non-obvious dependency exists (a comment in `package.json` is not possible, so note it in the README or a decision record).

## Security Considerations

- Supply-chain attacks target dependencies: a compromised package update can inject code. Prefer packages with a track record, and review major updates.
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
- Related skills in this repository: `pnpm-workspaces`, `monorepo`, `package-boundaries`.
