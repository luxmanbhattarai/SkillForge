---
name: changelog-management
description: >
  Write and maintain a changelog that tells users what changed, why
  it matters, and what they need to do. Use when releasing a new
  version, setting up a CHANGELOG.md, documenting breaking changes,
  or fixing a changelog that is missing, vague, or out of date.
  Covers Keep a Changelog format, semantic versioning, and release
  notes.
license: MIT
metadata:
  version: "1.0.0"
  category: documentation
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Changelog Management

## Purpose

This skill helps an agent maintain a changelog that users and
developers can rely on: every release listed, every change described
in plain language, breaking changes called out clearly. The outcome is
a changelog that answers "what changed in this version, and do I need
to do anything?" without making the reader dig through commit history.

## When to Use

- Releasing a new version of a package, library, service, or app.
- Setting up a CHANGELOG.md for a project that does not have one.
- Documenting a breaking change and its migration path.
- Auditing a changelog that is missing releases or full of vague
  entries.
- Writing release notes for a version.

## When Not to Use

- When the task is API reference documentation — use
  `api-documentation` (the changelog can link to it).
- When the task is a README — use `readme-engineering`.
- When the task is general technical documentation — use
  `technical-documentation`.
- When the project has no versions or releases (a one-off script,
  an internal tool with continuous deploy) — a changelog adds
  little; use commit messages and release notes instead.

## Prerequisites

- Access to the repository and its commit history or pull requests.
- Knowledge of the versioning scheme (semantic versioning is the
  standard for libraries and packages).
- The list of changes since the last release.
- A CHANGELOG.md file, or permission to create one at the
  repository root.

## Official Documentation

- [Keep a Changelog](https://keepachangelog.com/) — the standard
  changelog format. Keep a Changelog 1.1.0 is the current version
  of the format.
- [Semantic Versioning](https://semver.org/) — the versioning
  scheme changelogs are built around. Semantic Versioning 2.0.0
  is current.
- [Conventional Commits](https://www.conventionalcommits.org/) —
  a commit message convention that makes changelog generation
  easier. Conventional Commits 1.0.0 is current.

## Required Workflow

1. Gather the changes since the last release: merged pull requests,
   commits, and any unreleased work. Group them by type.
2. Decide the version number for the release, following semantic
   versioning: a major bump for breaking changes, a minor bump for
   new features, a patch bump for fixes.
3. Write the changelog entry under an "Unreleased" section as work
   lands, and move it to a dated version section at release time.
   Do not write the whole changelog from memory at release time.
4. Categorize each change using the Keep a Changelog groups:
   Added, Changed, Deprecated, Removed, Fixed, and Security.
5. Describe each change from the user's point of view: what changed,
   and what the user needs to do (if anything). Link to the pull
   request or issue where it helps.
6. Call out breaking changes explicitly, with a migration path:
   what breaks, why, and exactly what the user must change.
7. Add the release date and the version number to the entry, and
   link the version to the release or tag where the project hosts
   releases.
8. Publish the changelog with the release, and announce the release
   where users expect to hear about it.

## Implementation Standards

- Follow the Keep a Changelog format: a header, an "Unreleased"
  section, then one section per version with a date, and changes
  grouped under Added, Changed, Deprecated, Removed, Fixed, and
  Security.
- Follow semantic versioning: MAJOR for incompatible API changes,
  MINOR for backwards-compatible new functionality, PATCH for
  backwards-compatible bug fixes.
- Write entries for users, not for the author: "Fixed a crash when
  opening a file larger than 2 GB" beats "Fixed #1234".
- Every breaking change must have a migration note: what breaks and
  what to change. A breaking change without a migration path is an
  incomplete entry.
- Keep the "Unreleased" section current as work merges. A changelog
  written entirely at release time will miss changes.
- Do not list internal-only changes that do not affect users
  (refactors, test changes, CI tweaks) unless they change behavior
  the user can observe.
- Dates must be in ISO format (YYYY-MM-DD).
- Never rewrite published history: if a past entry is wrong, add a
  correction in the next release rather than editing the old entry
  silently.

## Best Practices

- Update the changelog in the same pull request as the change, so
  it cannot be forgotten.
- Link each entry to its pull request or issue for traceability.
- Keep entries short: one line per change, with a link for detail.
- For large releases, add a short summary at the top of the entry
  highlighting the most important changes.
- If the project uses Conventional Commits, generate a draft
  changelog from commits and then edit it for readability — do not
  publish raw commit lists as a changelog.
- Review the changelog before release as part of the release
  checklist, the same way code is reviewed.
- Keep the changelog in the repository root as CHANGELOG.md so
  users can find it.

## Security Considerations

- Security fixes belong in the Security group, with enough detail
  for users to assess the risk — but do not publish exploit details
  before users have had time to upgrade.
- Do not include internal URLs, credentials, or personal data in
  changelog entries.
- When a security fix is released, the changelog should state the
  affected versions and the fixed version clearly.
- Be careful with vulnerability identifiers: only cite a CVE or
  advisory number that actually exists for the issue.

## Performance Considerations

- A changelog has no runtime cost. The performance concern is
  human: a changelog that is hard to scan wastes the reader's time.
  Keep entries short and grouped.
- For large projects, keep the changelog to user-facing changes;
  a changelog that lists every commit is unreadable.

## Common Mistakes

- Writing the changelog from memory at release time and missing
  changes.
- Vague entries ("Various fixes", "Improved performance") that tell
  the reader nothing.
- Breaking changes buried in a list with no migration guidance.
- Listing internal changes users cannot observe, drowning the
  entries that matter.
- Forgetting to move the "Unreleased" section to a dated version
  at release time.
- Publishing raw commit messages as a changelog.
- Editing a published entry silently instead of adding a correction.
- A version bump that does not match the changes (a breaking change
  released as a patch).

## Examples

A changelog entry following Keep a Changelog:

```md
## [Unreleased]

### Added

- Added support for importing data from CSV files.

### Fixed

- Fixed a crash when opening a file larger than 2 GB.

## [1.4.0] - 2026-11-20

### Added

- Added dark mode, following the system preference.

### Changed

- The default export format is now JSON instead of CSV. To keep
  exporting CSV, set `format: "csv"` in the configuration.
```

A breaking-change entry with a migration path:

```md
## [2.0.0] - 2026-11-20

### Removed

- Removed the `legacyAuth` option. It was deprecated in 1.8.0.
  Migrate by switching to `auth: "oauth"` before upgrading; see
  the migration guide in the documentation.
```

## Validation Checklist

- [ ] The changelog follows the Keep a Changelog format.
- [ ] Every release since the last entry is listed with a date.
- [ ] Changes are grouped (Added, Changed, Deprecated, Removed,
      Fixed, Security).
- [ ] Entries are written for users, not as raw commit messages.
- [ ] Every breaking change has a migration note.
- [ ] The version number follows semantic versioning and matches
      the changes.
- [ ] Dates are in ISO format (YYYY-MM-DD).
- [ ] The changelog was reviewed as part of the release.

## Expected Deliverables

- A CHANGELOG.md (new or updated) with the release entry.
- A list of changes gathered from pull requests and commits.
- Migration notes for any breaking change.
- Release notes, if the project publishes them separately.

## References

- [Keep a Changelog](https://keepachangelog.com/) — the changelog
  format.
- [Semantic Versioning](https://semver.org/) — versioning rules.
- [Conventional Commits](https://www.conventionalcommits.org/) —
  commit conventions that help changelog generation.
- Related skills in this repository: `technical-documentation`,
  `api-documentation`, `readme-engineering`, `developer-experience`.
