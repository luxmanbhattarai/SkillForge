---
name: changesets
description: >
  Manage package versioning and changelogs with Changesets: the changeset
  workflow, semver bumps (major, minor, patch), changelog generation,
  snapshot releases, prereleases, CI release automation with the
  changesets/action Version Packages pull request, and monorepo
  publishing. Use when the task mentions changesets, .changeset,
  changeset version, changeset publish, Version Packages PR, snapshot
  release, or releasing packages from a monorepo.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Changesets

## Purpose

Changesets manages versioning and changelogs for JavaScript monorepos
(and single-package repositories) by letting contributors declare, in
the same pull request as their code, how each change should be released.
The tool then turns the accumulated changeset files into version bumps,
changelog entries, and published packages. This skill covers the
changeset workflow, versioning rules, changelog generation, snapshot
and prereleases, and CI release automation.

## When to Use

- Setting up versioning and releases for a monorepo or a publishable package.
- The task mentions changesets, `.changeset/`, `changeset version`, `changeset publish`, the Version Packages pull request, or snapshot releases.
- Contributors need a reviewable way to declare semver bumps alongside their code.
- Automating releases in CI so merging a pull request publishes packages.
- Publishing a prerelease or a snapshot build for testing before a stable release.

## When Not to Use

- The release process is the question, not the tooling — versioning policy, release trains, and rollback planning belong to `release-management`.
- The task is only about writing changelog prose — use `changelog-management`.
- The task is only about authoring and publishing a single package (exports, builds, registry setup) — use `package-development`.
- The repository has no published packages and no versions (an app deployed continuously) — changesets add little; use release notes instead.
- The team prefers commit-message-driven releases (for example semantic-release) — Changesets deliberately does not infer bumps from commits.

## Prerequisites

- A JavaScript/TypeScript repository with workspaces configured (pnpm, npm, or Yarn workspaces) for a monorepo; a single-package repository needs no workspace setup.
- The packages to be released are identified; private packages (apps, internal tooling) are marked `"private": true` so Changesets skips them.
- Supported versions (verified 2026-11-20): Changesets v3 is current
  (`@changesets/cli` 3.0.3; v3 released August 2026). CLI v2 is on a
  maintenance branch; new projects must use v3. CLI v3 pairs with
  `changesets/action` v2; CLI v2 pairs with `changesets/action` v1 —
  the majors must match, and the v2 action inputs were renamed in v2
  (`version-script`, `publish-script`, `commit-message`,
  `github-token`), so a half-upgraded workflow silently runs with no
  publish script.
- Node.js `^22.11 || ^24 || >=26` and pnpm 10+, npm 10.9+, or Yarn
  4.5.2+ (per the official getting-started guide). Yarn Classic is
  not supported. The maintainers recommend pnpm for its security
  defaults and monorepo support.
- An npm account and a publish token stored in CI secrets (for
  publishing); a GitHub token with pull-request write access (for the
  Version Packages pull request).

## Official Documentation

- [Changesets documentation](https://changesets.dev/) — the official docs site.
- [Getting started](https://changesets.dev/guide/getting-started) — install requirements, setup, and the basic workflow.
- [Changesets repository](https://github.com/changesets/changesets) — source, docs, and release notes (main branch is v3; v2 lives on the `maintenance/v2` branch).
- [changesets/action](https://github.com/changesets/action) — the GitHub Action that automates Version Packages pull requests and publishing.
- [Semantic Versioning 2.0.0](https://semver.org/) — the versioning rules Changesets applies.

## Required Workflow

1. Install the CLI as a root dev dependency (`pnpm add -Dw @changesets/cli`) and run `changeset init` to create `.changeset/` with `config.json` and a README. Review the generated config: set `baseBranch` to the repository's default branch if it is not `main`, and choose the changelog generator (the default `@changesets/cli/changelog`, or `@changesets/changelog-github` for PR links and author thanks in open-source projects).
2. Add root scripts for the release commands the team and CI will use: `changeset` (add), `version` (`changeset version`), and `release` (`changeset publish`).
3. In every feature pull request that changes releasable code, create a changeset: run `changeset` (interactive: it lists changed packages, asks for the bump type per package, and asks for a summary) or, for scripts and agents, use the v3 non-interactive flags (`changeset add --minor <pkg> --message "<summary>"`). Commit the generated `.changeset/<name>.md` file with the pull request.
4. Review the changeset file as part of code review: the bump type is a decision (major for breaking changes, minor for new backward-compatible features, patch for bug fixes) and the summary is the future changelog entry, so both must be accurate.
5. Set up the release workflow in CI with `changesets/action@v2`: on pushes to the default branch it opens or updates a "Version Packages" pull request that applies pending changesets (bumps versions, writes changelogs, updates internal dependency ranges, deletes the consumed files). Merging that pull request triggers the publish step (`changeset publish`).
6. When a release is needed outside the automated flow, run `changeset version` to apply pending changesets, review the version bumps and changelog diff, commit it, then run `changeset publish` (which publishes to the registry and creates git tags).
7. For prereleases, enter prerelease mode (`changeset pre enter <tag>`, for example `alpha`), run the normal version and publish flow (versions gain the prerelease tag, for example `1.2.0-alpha.0`), and exit prerelease mode (`changeset pre exit`) when the stable release is ready.
8. For a one-off test build, use a snapshot release: `changeset version --snapshot` then `changeset publish --tag <tag>` publishes timestamped versions (for example `0.0.0-20261120120000`) without consuming the pending changesets or incrementing the stable version.
9. Check for missing changesets in CI on pull requests (the changeset bot, or `changeset status` failing the build) — but do not block contributions that genuinely need no release; the official docs recommend against requiring a changeset on every pull request.
10. Run the Validation Checklist.

## Implementation Standards

- One changeset file per pull request per logical change; a changeset may cover several packages with different bump types each.
- The bump type follows semver strictly: major for any backward-incompatible public API change, minor for backward-compatible additions, patch for backward-compatible fixes. When in doubt between minor and major, choose major — under-bumping breaks consumers silently.
- Changesets flatten bumps: if several changesets touch one package, the highest bump type wins for that package's release.
- Internal dependencies are updated automatically: when a released package depends on another released package, Changesets updates the dependency range as part of `changeset version`. Never hand-edit those ranges in the same commit.
- Private packages are never versioned or published; mark apps and internal tooling `"private": true` and keep them out of changesets.
- `fixed` groups (packages that always release together at one version) and `linked` groups (packages that share a version when any of them is bumped) are configured in `.changeset/config.json` only when the packages genuinely move together; the default — independent versioning per package — fits most monorepos.
- The Version Packages pull request is the release review: check its version bumps and changelog entries before merging, because merging publishes.
- `changeset publish` publishes only packages whose version is not already on the registry; it never republishes an existing version.
- Never edit a `CHANGELOG.md` by hand for a released version; the changelog is generated from changesets, and hand edits are overwritten or duplicated on the next release.

### Testing Strategy

- Test the release flow with a snapshot release before the first real release, so versioning, changelog generation, and publishing are proven end to end rather than assumed.
- Test `changeset status` in CI on every pull request: a PR that changes a releasable package without a changeset fails, so releases never ship unrecorded changes.
- Test bump behavior on a scratch branch: several changesets touching one package flatten to the highest bump type, and a major bump in a `fixed` or `linked` group moves the whole group as configured.
- Test the Version Packages pull request before merging: check its version bumps, changelog entries, and automatically updated internal dependency ranges, because merging publishes.
- Test that private packages stay private: an app or internal tool marked `"private": true` is never versioned or published, even when a changeset mentions it.

## Best Practices

- Write the changeset summary for the changelog reader, not the reviewer: say what changed and what the user must do, in plain language.
- Keep changesets small and specific: one change, one summary. A changeset that says "various fixes" produces a useless changelog entry.
- Add the changeset in the same pull request as the code, while the context is fresh; a changeset written at release time from memory is usually wrong.
- Use `changeset status` locally before pushing to confirm the pending changesets match what the pull request changed.
- For a breaking change, write the migration guidance in the changeset summary so it lands in the changelog where upgraders look.
- Keep the Version Packages pull request merged promptly; a stale one accumulates changes and its release becomes hard to review.
- Use snapshot releases for integration testing of a feature branch against real consumers instead of publishing ad-hoc versions by hand.
- Document the workflow in the contributing guide: when a changeset is required, how to write a good summary, and what the Version Packages pull request is.

## Security Considerations

- The npm publish token is the crown jewel of the release pipeline: store it as a CI secret with the minimum scope (a granular token limited to the packages it publishes), rotate it on a schedule, and never print it in logs. Prefer npm's trusted publishing (OIDC) over long-lived tokens where the registry supports it.
- The release workflow runs with write access to the repository and the registry; restrict who can approve and merge the Version Packages pull request, and require review on it like any other pull request.
- A malicious changeset file is a supply-chain vector: its summary lands in the changelog and its bump type drives a publish. Review changeset files in pull requests, especially from external contributors, and do not auto-merge the Version Packages pull request.
- `changeset publish` creates git tags; tags are part of the release's integrity story, so protect tags in the repository settings where the platform supports it.
- Snapshot releases publish real packages to the registry under a tag; use a clearly non-`latest` tag (for example `snapshot` or `next`) so a test build is never installed by default, and clean up stale snapshot versions.
- Keep the CLI and the action on matching, current majors: CLI 2.x misreads npm 12's `npm info --json` output and can attempt to republish existing versions; v3 is the supported line.

## Performance Considerations

- Changesets itself is fast: versioning and changelog generation are file operations over the workspace, and the cost of a release is dominated by the build and test steps around it, not by Changesets.
- The Version Packages pull request workflow adds one CI run per push to the default branch; keep the release workflow's install step cached (pnpm store, lockfile) so it stays cheap.
- `changeset status` on pull requests needs git history to compare against `baseBranch`; the CI checkout must fetch enough history (the action's default checkout depth is insufficient — use `fetch-depth: 0`), which costs a little clone time on large repositories.
- Publishing many packages is sequential per package by default; the publish step is network-bound, so the wall time grows with the number of released packages — batch releases into one Version Packages pull request rather than publishing package by package.
- Snapshot releases publish a full set of timestamped packages; use them for genuine integration testing, not as a substitute for local workspace linking.

## Common Mistakes

- Mixing CLI and action majors (CLI v3 with `changesets/action@v1`, or vice versa) — the action refuses or silently ignores renamed inputs; upgrade both sides in one commit.
- Forgetting the changeset in the pull request and writing it at release time — the bump type and summary are guesses by then.
- Choosing `patch` for a breaking change to avoid a major bump — consumers upgrade on the semver promise and break.
- Including private packages in a changeset — Changesets errors or ignores them; mark them private and leave them out.
- Hand-editing `CHANGELOG.md` entries for released versions — the next `changeset version` run overwrites or duplicates them.
- Merging the Version Packages pull request without reading it — merging is the publish trigger; a wrong bump type ships.
- Publishing a snapshot under the `latest` tag — test builds become the default install.
- Running `changeset version` on a feature branch and committing the result — versioning happens on the default branch through the Version Packages pull request, not in feature branches.
- Requiring a changeset on every pull request — docs-only and internal-only changes need no release, and a hard requirement trains contributors to write empty changesets.

## Examples

A changeset file (`.changeset/witty-cars-drink.md`):

```md
---
"@repo/ui": minor
"@repo/core": patch
---

Add a `size` prop to `Button` and fix the focus ring color on
`TextField`. The `size` prop defaults to `medium`; no migration needed.
```

Minimal `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Release workflow (GitHub Actions, `changesets/action@v2` with CLI v3):

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 26
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Create Release PR or Publish
        uses: changesets/action@v2
        with:
          version-script: pnpm run version
          publish-script: pnpm run release
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Common commands:

```bash
changeset init                          # create .changeset/ config
changeset                               # interactive: write a changeset
changeset add --minor @repo/ui --message "Add size prop to Button"
changeset status                        # show pending changesets and planned bumps
changeset version                       # apply changesets: bump versions, write changelogs
changeset version --snapshot            # snapshot versions without consuming changesets
changeset publish                       # publish unpublished versions to the registry
changeset publish --tag next            # publish under the `next` dist-tag
changeset pre enter alpha               # enter prerelease mode with the `alpha` tag
changeset pre exit                      # exit prerelease mode
```

## Validation Checklist

- [ ] `.changeset/config.json` exists with the correct `baseBranch` and changelog generator.
- [ ] Root scripts exist for `changeset`, `version`, and `release`.
- [ ] A test changeset produces the expected bump and changelog entry via `changeset version` on a scratch branch.
- [ ] The release workflow uses `changesets/action@v2` with CLI v3 (majors match).
- [ ] The Version Packages pull request flow was exercised end to end at least once (open, review, merge, publish).
- [ ] Private packages are marked `"private": true` and excluded from changesets.
- [ ] The npm token is a CI secret with minimum scope; the publish tag for snapshots is not `latest`.
- [ ] The contributing guide documents when a changeset is required and how to write one.

## Expected Deliverables

- The `.changeset/` configuration and root release scripts.
- The CI release workflow (Version Packages pull request + publish).
- A verified end-to-end release (or a dry run on a scratch branch) with correct versions and changelogs.
- Contributing-guide documentation of the changeset workflow.

## References

- [Changesets documentation](https://changesets.dev/)
- [Getting started](https://changesets.dev/guide/getting-started)
- [changesets/action](https://github.com/changesets/action)
- [Semantic Versioning 2.0.0](https://semver.org/)
- Related skills in this repository: `release-management`, `monorepo`, `pnpm-workspaces`, `package-development`, `changelog-management`, `dependency-management`.
