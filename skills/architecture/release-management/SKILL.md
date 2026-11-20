---
name: release-management
description: >
  Run a release process end to end: versioning policy with semantic
  versioning, release trains versus continuous release, release planning
  and freeze, changelog and release notes coordination, publishing
  pipelines, rollbacks, release automation, and coordinating releases
  across packages in a monorepo. Use when the task mentions release
  management, release process, release train, release cadence, release
  notes, rollback, release checklist, or shipping a new version.
license: MIT
metadata:
  version: "1.0.0"
  category: architecture
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Release Management

## Purpose

Release management turns merged code into a version users can install,
upgrade to, and roll back from — predictably and without heroics. It
covers the decisions a release needs (what version, what cadence, what
goes in, how it ships, how it is undone) and the process that makes
those decisions repeatable. This skill is the process layer: the
mechanics of versioning and changelog tooling live in `changesets`,
changelog prose in `changelog-management`, and package publishing
mechanics in `package-development`.

## When to Use

- Defining or fixing how a project or monorepo ships versions.
- The task mentions release management, release process, release train, release cadence, release notes, rollback, release checklist, or shipping a version.
- Coordinating a release across several packages, apps, or teams.
- Deciding between release trains, continuous release, and ad-hoc releases.
- Planning a major release with breaking changes, a migration guide, and a communication plan.
- A release went wrong and the team needs a rollback or a hotfix process.

## When Not to Use

- The task is only about the versioning tool in a monorepo — use `changesets`.
- The task is only about writing changelog entries or release notes prose — use `changelog-management`.
- The task is only about authoring or publishing one npm package (exports, builds, registry setup) — use `package-development`.
- The task is only about deployment of an app to infrastructure — use `deployment` or the platform skill.
- The project ships continuously with no versions at all — a release process adds ceremony without value; use commit messages and deployment notes instead.

## Prerequisites

- The thing being released is identified: a package, a set of packages, an app, or a platform — and its consumers are known.
- A versioning scheme is chosen: semantic versioning for libraries and packages (see below); calendar versioning or build numbers are alternatives for apps and services, and the choice is documented.
- The release tooling exists or is being set up: `changesets` for monorepo package releases, or the equivalent for the stack.
- The publishing destination is known (a public or private registry, an app store, an artifact store) and the credentials are held in CI secrets, not in the repository.
- The team agrees who can cut a release and who approves it; a release with no owner drifts.

## Official Documentation

- [Semantic Versioning 2.0.0](https://semver.org/) — the versioning rules for libraries and packages.
- [Keep a Changelog](https://keepachangelog.com/) — the changelog format release notes follow.
- [Changesets documentation](https://changesets.dev/) — the versioning and changelog tooling for JavaScript monorepos.
- [GitHub Docs: About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) — GitHub releases, tags, and release notes.
- [npm documentation](https://docs.npmjs.com/) — publishing, dist-tags, and deprecation.

## Required Workflow

1. Choose the release model before the first release: a release train (fixed cadence, for example every two weeks; whatever is ready ships, whatever is not waits), continuous release (every merged change that passes checks ships), or ad-hoc releases (cut when the team decides). Record the choice and the reason; the model drives everything below.
2. Write the versioning policy: semver for libraries and packages — major for breaking changes, minor for backward-compatible features, patch for backward-compatible fixes; 0.x versions signal an unstable API and treat minor bumps as potentially breaking. State who decides the bump type and where it is recorded (a changeset, a release pull request, or the release checklist).
3. Define the release checklist: the gates a release must pass — tests and typecheck green, changelog and release notes written, breaking changes called out with migration guidance, documentation updated, and (for a major) the deprecation window honored.
4. Plan the release scope: list what is in, what is deferred, and what is a breaking change. In a monorepo, list every package and its bump; dependent packages that only consume a new internal version get a patch bump — see `changesets` for the mechanics.
5. Freeze scope at the cutoff: after the cutoff, only release-blocking fixes land. A fix that misses the train waits for the next one; the train does not wait for the fix.
6. Cut the release: apply the version bumps, generate the changelog, tag the release in version control, and publish through the pipeline — never by hand from a laptop. The pipeline is the only publisher.
7. Verify the published artifact: install it from the registry the way a consumer would, run its smoke checks, and confirm the version, the changelog entry, and the tag all agree.
8. Announce the release: publish the release notes where consumers look (the changelog, GitHub releases, the package page), call out breaking changes first, and link the migration guide for majors.
9. Watch the release: monitor error rates, install failures, and issue reports for the first hours and days. Know the rollback trigger in advance — what signal means "roll back" rather than "fix forward".
10. Retrospect the release briefly: what was late, what was manual that should be automated, and what the next release changes. File the improvements; do not carry them as memory.
11. Run the Validation Checklist.

## Implementation Standards

- Every release has a version, a tag, a changelog entry, and a published artifact that all agree; a release missing any one of them is incomplete.
- A published version is immutable: never republish, overwrite, or mutate a released version. A bad release is fixed by a new version, or by deprecating the bad one and publishing a fix.
- Breaking changes ship only in a major version (or a minor bump while in 0.x), with migration guidance in the release notes. A breaking change smuggled into a minor or patch is the most expensive mistake in release management.
- The release pipeline is the only publisher: no manual `npm publish`, no publishing from a developer machine. Manual publishes are unrepeatable and unauditable.
- The default branch is always releasable: every merge keeps tests green and the changelog current, so a release can be cut at any time. A release branch is for stabilizing a release, not for finishing features.
- Release notes lead with what the user must do (breaking changes, migrations, deprecations), then what is new, then fixes. Notes that bury the breaking change bury the information that matters.
- Prereleases (`1.2.0-alpha.0`, `1.2.0-rc.1`) are published under a non-default dist-tag (for example `next`) so they are never installed by default, and are tested by real consumers before the stable release.
- Hotfixes branch from the release tag, not from the default branch, and are released as a patch on the affected line; the fix is then merged forward.
- Support windows are stated: which major versions receive fixes and for how long. An unstated support window becomes an implicit promise to support everything forever.

## Best Practices

- Prefer small, frequent releases over rare big ones: a small release is easier to review, easier to verify, and easier to roll back.
- Prefer a release train for anything with more than one consumer or contributor: a predictable cadence removes the "when do we release?" negotiation from every change.
- Automate the mechanical parts (version bumps, changelog generation, tagging, publishing) and keep humans on the judgment parts (bump types, release notes, the go/no-go call).
- Keep a single release checklist in the repository and use it every time; a checklist that lives in someone's head is not a process.
- Version packages independently in a monorepo unless they genuinely move together; locking unrelated packages to one version forces meaningless major bumps.
- Deprecate before removing: mark an API deprecated in a minor release, announce the removal version, and remove it in the next major — never in the same release that deprecates it.
- Communicate early for majors: a migration guide and a prerelease published weeks before the stable release give consumers time to prepare.
- Coordinate across packages explicitly: in a monorepo, one release coordinator owns the release, the bump list, and the announcement, even when many people contributed changes.

## Security Considerations

- Publish credentials are the highest-value secret in the pipeline: use short-lived, scoped tokens (or registry trusted publishing via OIDC where supported), store them in the CI secret store, rotate them, and never print them in logs.
- The release pipeline runs with write access to the registry and the repository; restrict who can trigger it and require approval for production releases. A compromised release pipeline publishes malware to every consumer.
- A release artifact must be verifiable: publish provenance information (build attestations) where the registry supports it, and sign tags or artifacts where the team has a signing practice, so consumers can check what they install.
- Review the release contents, not just the code: the version bumps, the changelog, and the file list of the published package. A file that should not ship (a test fixture with credentials, an internal config) is a release-time failure.
- Rollback is a security control too: a release that ships a vulnerability must be deprecatable and replaceable quickly. Know the deprecation and yank mechanism for the registry before the incident.
- Prerelease and snapshot builds are real published artifacts: keep them under a non-default tag, and do not let a snapshot dependency leak into a stable release's dependency range.
- Dependency updates in a release are a supply-chain moment: audit the release's dependency tree before publishing, and do not publish a release whose dependencies include a known-critical vulnerability without a recorded decision.

## Performance Considerations

- Release cadence is a throughput decision: a train that is too slow batches too much change into each release (harder to review, harder to roll back); a train that is too fast spends more time on release overhead than on shipping. Two weeks is a common starting cadence for libraries; adjust from evidence, not from habit.
- Automate the slow parts: version bumps and changelog generation by hand take longer than the review of the release itself and are error-prone. Tooling (`changesets`) turns a release into a review of a pull request.
- Keep the verification step fast: a smoke check that installs the published artifact and runs the critical path should take minutes, not an hour, or it will be skipped under pressure.
- Monorepo releases scale with the number of packages released: batch related package releases into one release event instead of publishing packages one at a time through the week.
- Hotfix speed is a performance metric: measure the time from "release is broken" to "fixed version published" and drive it down; the rollback path should be rehearsed, not discovered during an incident.
- Release notes written at release time from memory are slow and wrong; notes written incrementally (a changeset per pull request) make the release itself fast.

## Common Mistakes

- Releasing from a laptop by hand — unrepeatable, unauditable, and the version on the registry may not match any commit.
- Burying a breaking change in a minor or patch release — consumers upgrade on the semver promise and break.
- Republishing or mutating a released version to "fix" it — consumers who already installed it now have a different artifact than the registry serves.
- No rollback plan — the team discovers during an incident that it does not know how to deprecate, yank, or revert.
- A release train with no cutoff — scope creeps until the train is late, and the cadence stops being predictable.
- Treating the changelog as an afterthought — release notes written at the end, from memory, miss changes and misstate impact.
- Locking all monorepo packages to one version — an unrelated package takes a major bump because another package broke its API.
- Skipping the install-from-registry verification — the package publishes but does not install, or ships the wrong files, and the team finds out from a consumer.
- Announcing a major release with no migration guide — consumers cannot upgrade and stay on the old version, splitting the user base.

## Examples

Release checklist (keep in the repository, for example `docs/RELEASE-CHECKLIST.md`):

```md
# Release Checklist

- [ ] Scope frozen: the release contents and per-package bumps are listed.
- [ ] Tests, typecheck, and lint green on the release commit.
- [ ] Changelog generated; breaking changes called out with migration guidance.
- [ ] Documentation updated for new and changed behavior.
- [ ] Prerelease published under the `next` tag and tested by at least one consumer (majors).
- [ ] Release cut through the pipeline (version bumps, tag, publish) — no manual publish.
- [ ] Published artifact installed from the registry and smoke-tested.
- [ ] Release notes published (changelog + GitHub release); breaking changes first.
- [ ] Announcement posted where consumers look.
- [ ] Rollback trigger agreed: what signal means roll back vs fix forward.
```

Rollback decision (record before the release, not during the incident):

```md
# Rollback plan for v2.0.0

- Trigger: error rate on the new version exceeds the previous version's
  baseline for 15 minutes, or a data-loss report is confirmed.
- Action: deprecate v2.0.0 on the registry with a message pointing to
  v1.9.4; publish v2.0.1 with the fix, or v1.9.5 with the fix
  backported, whichever is ready first.
- Owner: the release coordinator, not the on-call engineer alone.
- Communication: update the release notes and the announcement thread
  within one hour of the decision.
```

## Validation Checklist

- [ ] Release model chosen (train, continuous, or ad-hoc) and recorded.
- [ ] Versioning policy documented (semver rules, who decides bump types, 0.x handling).
- [ ] Release checklist exists in the repository and was used for the last release.
- [ ] Releases cut only through the pipeline; no manual publishes.
- [ ] Published version, tag, and changelog entry agree for the last release.
- [ ] Published artifact verified by installing from the registry.
- [ ] Rollback plan exists and the deprecation mechanism is known.
- [ ] Support window stated for the current major versions.

## Expected Deliverables

- The versioning policy and release model, documented in the repository.
- The release checklist and rollback plan.
- A completed release: versioned, tagged, published, verified, and announced.
- Release notes (changelog entry and GitHub release) with breaking changes first.

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Changesets documentation](https://changesets.dev/)
- [GitHub Docs: About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- Related skills in this repository: `changesets`, `changelog-management`, `package-development`, `monorepo`, `dependency-management`.
