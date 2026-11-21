# Phase 4 Batch 5 Report — Monorepo + Release Engineering

- **Date:** 2026-11-20
- **Batch:** 5 (skills/architecture/)
- **Scope:** 3 new skills (`nx`, `changesets`, `release-management`) + 1 extension (`dependency-management`).

## Skills written

| Skill | Path | Lines | Status |
| --- | --- | --- | --- |
| `nx` | `skills/architecture/nx/SKILL.md` | 248 | New, validated |
| `changesets` | `skills/architecture/changesets/SKILL.md` | 241 | New, validated |
| `release-management` | `skills/architecture/release-management/SKILL.md` | 192 | New, validated |
| `dependency-management` | `skills/architecture/dependency-management/SKILL.md` | 231 (was 175) | Extended, validated |

All four are under the 500-line limit; no `references/` files were
needed. Frontmatter follows the template exactly (name = directory,
`license: MIT`, metadata `version: "1.0.0"`, `category: architecture`,
`maintainer: skills-library`, `source: original`,
`last_verified: "2026-11-20"`). Version info lives in the body per
`ai/decisions/2026-11-20-phase3-version-metadata.md`.

## Extension made

`dependency-management` gained a new `## Workspace Dependency
Governance` section (after Implementation Standards, before Best
Practices) covering: workspace protocol (`workspace:*`), dependency
constraints, hoisting vs isolated `node_modules` (pnpm), deduplication,
version alignment across packages, lockfile discipline, and governance
automation. It cross-references `package-boundaries`,
`pnpm-workspaces`, `turborepo`, and `nx`; the References list now
includes `turborepo` and `nx`. Its `last_verified` was already
`2026-11-20`, so no frontmatter change was needed. Existing structure
and style preserved; the section is 56 lines, keeping the file well
under 500.

## Official sources consulted

### `nx`
- https://nx.dev/docs — verified live (What is Nx?).
- https://nx.dev/docs/features/run-tasks — verified live (run-many, affected, task pipelines, `dependsOn`).
- https://nx.dev/docs/features/cache-task-results — verified live (hashing, inputs/outputs, Ultracache requires Nx 24.0.0+).
- https://nx.dev/docs/features/enforce-module-boundaries — verified live (tags, `@nx/enforce-module-boundaries`, depConstraints).
- https://nx.dev/docs/getting-started/start-with-existing-project — verified live (`npx nx@latest init`).
- https://nx.dev/docs/features/explore-graph — URL from official search results (the guessed `/explore-the-graph` path 404s; corrected).
- https://nx.dev/docs/kb/local-generators — URL from official search results.
- https://nx.dev/docs/reference/releases — supported versions: v24 Current (2026-10-21), v23/v22 LTS; majors every six months, 18 months total support.
- Release notes (via whatsnew.fyi / newreleases.io mirrors of the official repo): latest stable 24.0.6 (2026-11-10); 24.0.4 restricted the graph server to local same-origin requests; 24.0.3 bumped undici to patch security advisories.

### `changesets`
- https://changesets.dev/ and https://changesets.dev/guide/getting-started — verified live (v3 requirements: Node `^22.11 || ^24 || >=26`, pnpm 10+, npm 10.9+, Yarn 4.5.2+; Yarn Classic unsupported; pnpm recommended).
- https://github.com/changesets/changesets — verified live (main branch is v3; v2 on `maintenance/v2`).
- https://github.com/changesets/action — official action repo (linked from the official README).
- https://semver.org/ — verified live (SemVer 2.0.0 spec).
- Version facts corroborated by jsDelivr (`@changesets/cli` 3.0.3 latest; 3.0.0–3.0.3, then 2.31.1) and secondary guides: v3 released August 2026; CLI v3 pairs with `changesets/action` v2, CLI v2 with action v1; v2 action inputs renamed (`version-script`, `publish-script`, `commit-message`, `github-token`); v3 adds non-interactive `changeset add --major/--minor/--patch --message` flags; CLI 2.x misreads npm 12's `npm info --json` output.

### `release-management`
- https://semver.org/ — verified live (SemVer 2.0.0 spec, including 0.x and prerelease rules).
- https://keepachangelog.com/ — linked in-repo already by `changelog-management`; a live fetch of the `/en/1.1.0/` page was rate-limited (HTTP 429) during this session, so the root URL (already used in-repo) is linked instead.
- https://changesets.dev/ — verified live (tooling reference; process details deferred to `changesets`).
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases — verified live (GitHub releases, tags, release notes).
- https://docs.npmjs.com/ — npm docs root (already linked in-repo by `package-development`).

### `dependency-management` extension
- No new external sources; content is grounded in the already-verified sibling skills (`pnpm-workspaces`, `monorepo`, `package-boundaries`, `turborepo`) and the new `nx` skill, plus the pnpm behavior documented in `pnpm-workspaces` (isolated `node_modules`, catalog, `--frozen-lockfile`).

## Validation output

Run from the repo root, per skill (filtered, as instructed — no
unfiltered validate, no registry run):

```
=== nx ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== changesets ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== release-management ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== dependency-management ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

No errors to fix in any file. Line counts confirmed under 500 for all
four files.

## Decisions and notes

- **Complement, don't duplicate.** Read `monorepo`, `turborepo`,
  `pnpm-workspaces`, `package-boundaries`, and
  `dependency-management` first. `nx` defers workspace layout to
  `pnpm-workspaces`/`monorepo` and boundary design to
  `package-boundaries`; `changesets` defers changelog prose to
  `changelog-management` and package mechanics to
  `package-development`; `release-management` is the process layer
  only and names `changesets`, `changelog-management`, and
  `package-development` without repeating their content.
- **Nx version claims.** Nx 24.x current (24.0.6, Nov 2026); v23/v22
  LTS. The exact Node.js engine range for Nx 24 was not verified in
  session, so the skill says to confirm it in the official release
  notes rather than stating a number.
- **Changesets v3 is the line.** v3 (CLI 3.0.3, action v2) is current;
  the skill documents the v2/v3 action pairing and the renamed v2
  action inputs, since a mismatched upgrade silently drops the publish
  script.
- **URL correction.** The guessed Nx graph URL
  `/docs/features/explore-the-graph` returned 404; the correct URL is
  `/docs/features/explore-graph` (confirmed via official search
  results). No other guessed URLs were used.
- **Keep a Changelog fetch rate-limited.** One `browser.open` to
  keepachangelog.com hit an upstream 429 and was not retried; the
  root URL is used, matching the existing in-repo link.
- **No commits, no pushes, no branch changes.** Only the assigned
  directories were touched (`skills/architecture/nx/`,
  `skills/architecture/changesets/`,
  `skills/architecture/release-management/`,
  `skills/architecture/dependency-management/SKILL.md`, and this
  report). `skills/upstream/` untouched. Registry regeneration is
  left to the coordinator.
