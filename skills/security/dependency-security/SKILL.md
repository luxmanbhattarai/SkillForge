---
name: dependency-security
description: >
  Keep third-party dependencies free of known vulnerabilities and
  supply-chain risk. Use when auditing dependencies, fixing a reported
  vulnerability, setting up Dependabot or audit tooling, reviewing a
  new package before adopting it, or updating a lockfile safely.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Dependency Security

## Purpose

Modern applications are mostly third-party code: a typical project
depends on hundreds of packages, each of which can carry a known
vulnerability or be compromised. Dependency security means knowing
what you depend on, watching for disclosed vulnerabilities, updating
promptly, and vetting new packages before they enter the tree. It is
one of the highest-leverage security practices for the effort it
takes.

## When to Use

- Auditing a project's dependencies for known vulnerabilities.
- Fixing a vulnerability reported by an audit tool or Dependabot.
- Setting up automated dependency scanning and updates.
- Reviewing a new package before adding it to the project.
- Updating dependencies or a lockfile after a security advisory.
- Preparing for a release or a security audit.

## When Not to Use

- Fixing a vulnerability in the project's own code — use `owasp`,
  `xss-prevention`, `sql-injection-prevention`, or the focused skill.
- Choosing an architecture or framework — dependency security vets
  the choice, it does not make it.
- License compliance review, which is a separate concern (though the
  inventory step overlaps).

## Prerequisites

- A package manager and lockfile in the project (npm, pnpm, or yarn).
- Access to run the audit tooling and to open pull requests.
- A test suite that can verify an upgrade did not break behavior
  (see `regression-testing`).

## Official Documentation

- [npm documentation](https://docs.npmjs.com/) — audit and update
  commands.
- [Dependabot](https://docs.github.com/en/code-security/dependabot) —
  automated dependency updates on GitHub.
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) —
  vulnerability scanning for dependencies.
- [Snyk](https://snyk.io/) — dependency vulnerability database and
  scanning.
- [Socket](https://socket.dev/) — supply-chain analysis for packages.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — in the
  current 2025 edition, dependency risk sits in A03 Software Supply
  Chain Failures, which expands the 2021 "Vulnerable and Outdated
  Components" category to cover compromised packages, build systems,
  and distribution infrastructure, not just known vulnerabilities.

## Required Workflow

1. Inventory dependencies: list direct dependencies and understand
   the major transitive ones. Remove anything unused.
2. Run the audit tool (`npm audit` or the project's equivalent) and
   record every finding with its severity, affected package, and the
   fixed version if one exists.
3. Triage: fix critical and high findings first. For each finding,
   decide whether the vulnerable code path is reachable in this
   project; unreachable findings are still worth fixing, but they can
   wait behind reachable ones.
4. Update the affected package to a fixed version. Prefer a minimal
   version bump that addresses the advisory over a major upgrade when
   one is available.
5. If no fixed version exists, evaluate alternatives: replace the
   package, remove the feature that uses it, or apply a documented
   mitigation and track the issue until a fix appears.
6. Run the test suite after every upgrade to catch breaking changes,
   and review the package changelog for behavior changes.
7. Commit the lockfile with the update so every install reproduces
   the fixed tree.
8. Enable automated scanning and update pull requests (Dependabot or
   equivalent) so the next advisory arrives as a pull request, not
   as an incident.

## Implementation Standards

- The lockfile is committed and kept in sync with the manifest; never
  install with a floating or missing lockfile in CI or production.
- Audit tooling runs in CI and fails the build on new critical or
  high findings.
- Automated dependency update pull requests are enabled and reviewed
  promptly; security updates are merged within days, not months.
- New dependencies are vetted before adoption: maintenance status,
  download health, known vulnerabilities, and whether a smaller or
  better-maintained alternative exists.
- Dependencies are pinned to a version range the team controls; do
  not depend on `latest` or on unversioned URLs.
- Unused dependencies are removed; every dependency is a liability
  that must justify itself.
- Install scripts and postinstall hooks are reviewed; packages that
  run arbitrary code on install get extra scrutiny.
- Major upgrades are done deliberately, one package at a time, with
  tests passing after each.

## Best Practices

- Prefer well-maintained, widely used packages with a clear owner
  and a recent release history.
- Favor small, focused packages over large bundles; a smaller tree
  means a smaller attack surface.
- Keep a short list of approved or preferred packages for common
  needs (HTTP client, validation, dates) to avoid five ways of doing
  the same thing.
- Review changelogs and diffs for major updates; a version bump can
  change behavior, add telemetry, or alter the license.
- Watch for dependency confusion and typosquatting: verify package
  names character by character and prefer scoped packages from known
  publishers.
- Record the reason a vulnerable dependency cannot yet be updated,
  with an owner and a review date, instead of leaving it silently
  unpatched.

## Security Considerations

- A compromised dependency can execute code with the application's
  privileges, including at install time; vetting and lockfiles are
  the main defenses.
- Transitive dependencies matter as much as direct ones; audit the
  whole tree, not just the manifest.
- A fix in a transitive dependency may require updating the direct
  dependency that pulls it in, or overriding the version explicitly.
- Never install packages from untrusted sources or unreviewed URLs.

## Performance Considerations

- Audit and update runs belong in CI and scheduled jobs, not in the
  developer's inner loop.
- Large dependency trees slow installs and increase bundle size;
  pruning unused packages helps both security and speed.
- Prefer dependency updates that do not add heavy transitive trees.

## Common Mistakes

- Ignoring audit output because "it is only a dev dependency" — dev
  dependencies run code on developer machines and in CI.
- Updating without running tests, then shipping a broken build.
- Pinning to an old vulnerable version to avoid a breaking change,
  without recording the risk.
- Adding a package for one trivial function instead of writing ten
  lines of code.
- Committing a manifest change without the lockfile update.
- Treating "no audit findings" as "secure" — audit tools only know
  disclosed vulnerabilities.
- Merging automated update pull requests without review.

## Examples

```bash
# Audit the tree and show only actionable findings.
npm audit

# Update a single package to its fixed version, then verify.
npm update lodash
npm audit
npm test
```

```text
Vetting a new package (check before adding):
- Maintained: recent releases, responsive maintainer, open issues
  being addressed.
- Healthy: reasonable download counts for its niche, no long-unfixed
  critical advisories.
- Minimal: does one thing, with a small dependency tree of its own.
- Transparent: source available, license acceptable, no install-time
  network or code execution surprises.
- Necessary: the project genuinely needs it, or a smaller alternative
  exists.
```

```text
Triage note format:
- Package and versions affected; fixed version if known.
- Severity and a one-line description of the vulnerability.
- Reachable in this project? (yes / no / unknown, with evidence)
- Action: update, replace, mitigate, or accept with owner and date.
```

## Validation Checklist

- [ ] Audit tooling runs and reports zero critical or high findings,
      or each remaining finding has a recorded owner and plan.
- [ ] The lockfile is committed and matches the manifest.
- [ ] Automated update pull requests are enabled.
- [ ] Every upgrade was verified with the test suite.
- [ ] Unused dependencies were removed.
- [ ] New dependencies added during the work were vetted.
- [ ] Findings are triaged with reachability and an action.

## Expected Deliverables

- The audit report: findings, severity, reachability, and action for
  each.
- Updated dependencies and lockfile, with passing tests.
- CI configuration for audit scanning and automated updates.
- A list of accepted risks (unfixable findings) with owner and
  review date.

## References

- [npm documentation](https://docs.npmjs.com/) — audit and update
  commands.
- [Dependabot](https://docs.github.com/en/code-security/dependabot) —
  automated updates.
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) —
  vulnerability scanning.
- Related skills in this repository: `owasp`, `secrets-management`,
  `security-auditing`, `regression-testing`.
