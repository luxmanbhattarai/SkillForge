# Update Process

How SkillForge stays current: updating upstream imports, re-verifying
original skills, and versioning the collection.

## Updating upstream imports

Upstream skills are imported verbatim and never edited. To update one:

1. **Check upstream.** Look at the source repository for new commits
   since the imported commit recorded in the vendor's `ATTRIBUTION.md`.
   `npm run check:upstream` does this mechanically for all six
   vendors (it also runs weekly in CI) and reports drift; it exits 0
   even when upstreams moved, because drift is informational until a
   maintainer decides to re-import.
2. **Re-import by commit.** Copy the skill from the new upstream commit
   into `skills/upstream/<vendor>/<skill-name>/`, replacing the old
   files entirely. Do not merge or hand-edit.
3. **Check for collisions.** If the updated skill's name now collides
   with an original skill, do not import it — record it in
   `sources/third-party-skills.md` instead.
4. **Check the license.** Confirm the license still permits
   redistribution; update `sources/licenses.md` if it changed.
5. **Update attribution.** Record the new commit and date in the
   vendor's `ATTRIBUTION.md` and in `sources/imported-skills.md`.
6. **Regenerate and validate.** Run `npm run registry` and
   `npm run validate`.
7. **Update the changelog.** Add an entry under `Unreleased` in
   `CHANGELOG.md` naming the vendor and the new upstream commit.
8. **Review before merging.** Upstream content is untrusted until
   reviewed. Read the diff — especially any scripts — and confirm it
   agrees with official documentation and this repository's security
   rules.

## Re-verifying original skills

Original skills carry a `last_verified` date in their frontmatter
metadata. A skill is stale when its guidance no longer matches official
documentation, not merely when the date is old — but the date is how
staleness is found.

1. **Find stale skills.** Run `npm run check:sources`, which reports
   provenance and verification-date freshness, or
   `npm run query -- stale --days 180`, which lists skills not
   re-verified in the last 180 days and exits 1 when any are stale
   (scheduled CI runs this weekly).
2. **Check official docs.** For each claim that matters — versions,
   APIs, flags, behavior — verify against the official documentation
   linked in the skill.
3. **Update the skill.** Fix what changed. Prefer "current stable as of
   DATE" with a link to official release notes over hardcoding a
   version that was not verified.
4. **Update metadata.** Set `last_verified` to the verification date.
   Bump `metadata.version` when the guidance changes materially.
5. **Validate and regenerate.** Run `npm run validate` and
   `npm run registry`.
6. **Update the changelog** when the change is user-visible.

## Versioning

- **The collection** follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
  in `package.json` and `CHANGELOG.md`. A major version means breaking
  changes to the collection (skill renames, removals, or format
  changes); a minor version adds skills or features; a patch version
  fixes content.
- **Each original skill** has its own `metadata.version` (semver).
  Bump the patch version for corrections, the minor version for new
  guidance, and the major version when the skill's recommendations
  change incompatibly (for example, a new recommended approach that
  replaces the old one).
- **Upstream skills** keep their own versions as imported; this
  repository tracks them by upstream commit in `ATTRIBUTION.md`, not by
  re-versioning them.

## Release checklist

1. All skills pass `npm run validate`.
2. The registry is regenerated and committed.
3. `CHANGELOG.md` has an entry for the release.
4. `package.json` version matches the release.
5. CI is green on `main`.
