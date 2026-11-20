---
name: package-development
description: >
  Author and publish npm packages: package structure, ESM and dual-module
  builds, exports maps, semantic versioning, changelogs, and publishing.
  Use when creating a new npm package, preparing a library for publication,
  or fixing build, exports, or versioning problems in an existing package.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS or later, npm, and an npm account for publishing.
---

# Package Development

## Purpose

This skill covers authoring an npm package that other developers can
install and use without friction: the right `package.json` fields, a
correct build, an exports map that works for ESM and CommonJS, semantic
versioning, and a safe publish process. The outcome is a package that
installs cleanly, types correctly, and can be updated without breaking
consumers.

## When to Use

- Creating a new npm package or library.
- Preparing an existing library for publication.
- Fixing exports, dual-module (ESM/CommonJS), or TypeScript type
  problems in a package.
- Setting up versioning, changelogs, and a publish workflow.
- Reviewing a package before its first public release.

## When Not to Use

- Building an API client SDK — use `sdk-development` for the client
  design, then this skill for packaging and publishing it.
- Building an application (not a reusable library) — use `nodejs` or
  the relevant framework skill.
- Publishing a private package inside a monorepo — the packaging rules
  still apply, but the publish step may be replaced by workspace
  linking (see `monorepo` if available in this library).

## Prerequisites

- Node.js 24 LTS or later (26 is the current LTS line) and npm
  installed.
- An npm account and, for a scoped package, a registered organization
  or user scope.
- A clear decision on the package's public API: what it exports and
  what it does not.

## Official Documentation

- [npm documentation](https://docs.npmjs.com/) — package.json,
  publishing, and the npm CLI.
- [npm registry](https://www.npmjs.com/) — the public package
  registry.
- [Semantic Versioning](https://semver.org/) — versioning rules.
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — changelog
  format.
- [Node.js packages guide](https://nodejs.org/api/packages.html) —
  how Node.js resolves packages, exports, and dual modules.
- [TypeScript documentation](https://www.typescriptlang.org/docs/) —
  TypeScript 7.x is current (7.0.2, August 2026); 6.0 was the last
  JavaScript-based release and 5.x is superseded. Note that 7.0
  ships no stable programmatic API until 7.1, so build tooling that
  drives the compiler API may still need 6.0 (via the
  `@typescript/typescript6` compatibility package); the `tsc` CLI
  itself works normally on 7.x.

## Required Workflow

1. Define the public API first: the exports, their signatures, and
   what is internal. Everything not exported is an implementation
   detail.
2. Scaffold `package.json` with the fields in Implementation Standards:
   name, version, license, exports, types, files, and engines.
3. Write the source in TypeScript 7.x with strict mode, and keep the
   entry point small: it re-exports the public API and nothing else.
4. Configure the build to emit ESM (and CommonJS if dual-module
   support is required) plus TypeScript declaration files.
5. Add tests, linting, and a CI check that runs build, tests, and a
   pack-and-install smoke test.
6. Write the README: installation, quick start, API overview, and a
   link to the changelog. The README is the package's front page.
7. Choose a version and write the changelog entry. Start at `0.1.0`
   for a new package; reach `1.0.0` when the API is stable.
8. Publish with `npm publish` (use `--dry-run` first), then verify the
   published package by installing it in a clean directory and
   importing it.

## Implementation Standards

- `package.json` must declare: `name`, `version`, `description`,
  `license`, `author` or `maintainers`, `repository`, `type`,
  `main` (CommonJS entry, if dual), `module` (ESM entry, if dual),
  `types` (declaration entry), `exports`, `files`, and `engines`.
- Use an `exports` map as the single source of truth for what
  consumers can import. Do not rely on deep imports into internal
  files; export only the public paths.
- Prefer ESM-only (`"type": "module"`) for new packages. Ship dual
  ESM/CommonJS only when consumers genuinely need CommonJS, and use
  conditional exports so each loader gets the right file.
- Ship TypeScript declarations (`.d.ts`) for every export. If the
  package is written in TypeScript, generate them from the build;
  never hand-write declarations that can drift from the code.
- The `files` field lists exactly what ships (`dist` and the README,
  license, and changelog). Never publish tests, source maps for
  internal code, or development config.
- Version with semantic versioning: breaking change = major, new
  feature = minor, bug fix = patch. Never republish a version number.
- Keep dependencies minimal and declare them correctly: `dependencies`
  for runtime needs, `peerDependencies` for things the consumer
  provides (such as a framework), `devDependencies` for build and
  test tooling.
- Set `sideEffects: false` when the package has no side effects on
  import, so bundlers can tree-shake it.
- Include a `LICENSE` file (MIT in this library) and a `CHANGELOG.md`
  in the published package.
- Pin the Node.js requirement in `engines` (Node.js 24 or later for
  new packages in this library).

## Best Practices

- Keep the public API small: every export is a compatibility promise.
  It is easy to add an export later and hard to remove one.
- Test the package the way consumers use it: install the packed
  tarball in a clean directory and import it, in both ESM and
  CommonJS if dual.
- Automate releases: version bumps, changelog entries, and publishing
  from CI reduce human error. A manual publish step is acceptable for
  small packages if it is documented and repeatable.
- Document breaking changes prominently in the changelog with a
  migration note.
- Use a scoped name (`@scope/name`) for packages owned by an
  organization.
- Add `keywords` to `package.json` so the package is discoverable on
  npm.
- Keep the README example runnable: copy it into a test or a CI check
  so it cannot rot.

## Security Considerations

- Enable two-factor authentication on the npm account and require it
  for publishing.
- Use granular access tokens for CI publishing, scoped to the package,
  and rotate them if exposed.
- Never publish secrets, tokens, or private keys; check the packed
  tarball with `npm pack --dry-run` before publishing.
- Audit dependencies with `npm audit` and keep them current; a
  package's vulnerabilities become its consumers' vulnerabilities.
- Review every dependency before adding it: a package with a large
  dependency tree inherits the risk of each dependency.
- Use provenance (supply-chain attestations) when publishing from CI
  if the registry supports it.

## Performance Considerations

- Keep the package small: minimize dependencies and ship only the
  built output.
- Ship ESM so bundlers can tree-shake unused exports.
- Avoid heavy dependencies for trivial functionality; a small
  utility function is better than a large dependency.
- Keep the build output readable enough to debug: avoid aggressive
  minification for libraries, and ship source maps when useful.

## Common Mistakes

- No `exports` map — consumers deep-import internal files and break
  on the next refactor. Define exports explicitly.
- Dual-module packages with mismatched ESM and CommonJS — the two
  builds drift apart. Generate both from the same source and test
  both.
- Missing TypeScript declarations — TypeScript consumers get `any`
  and no autocomplete. Ship `.d.ts` files.
- Publishing the whole repository — tests, config, and source end up
  in the tarball. Use the `files` field.
- Breaking changes in a minor release — consumers upgrade and break.
  Follow semantic versioning strictly.
- Forgetting to verify the published package — a broken publish is
  discovered by the first consumer. Install and import it in a clean
  directory after every publish.

## Examples

A minimal `package.json` for an ESM-only TypeScript package:

```json
{
  "name": "@example/greeter",
  "version": "0.1.0",
  "description": "A tiny greeting library.",
  "type": "module",
  "license": "MIT",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "sideEffects": false,
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "build": "tsc",
    "test": "node --test",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

Publish verification in a clean directory:

```bash
npm pack --dry-run        # inspect what will ship
npm publish --dry-run     # verify the publish without sending it
npm publish               # publish for real
mkdir /tmp/smoke && cd /tmp/smoke
npm init -y
npm install @example/greeter
node -e "import('@example/greeter').then((m) => console.log(Object.keys(m)))"
```

## Validation Checklist

- [ ] `package.json` declares `exports`, `types`, `files`, `license`,
      and `engines`.
- [ ] The build emits ESM (and CommonJS if dual) plus `.d.ts` files.
- [ ] `npm pack --dry-run` shows only the intended files.
- [ ] The packed tarball installs and imports cleanly in a fresh
      directory (ESM and CommonJS if dual).
- [ ] Tests, lint, and build pass in CI.
- [ ] The README has installation, quick start, and API documentation.
- [ ] The changelog documents the release and any breaking changes.
- [ ] The published version follows semantic versioning.

## Expected Deliverables

- A publishable package with correct `package.json`, build output,
  and declarations.
- Tests and CI checks, including a pack-and-install smoke test.
- A README and changelog.
- A verified published release (or a dry-run report if publishing is
  out of scope for the task).

## References

- [npm documentation](https://docs.npmjs.com/)
- [npm registry](https://www.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- [Node.js packages guide](https://nodejs.org/api/packages.html)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
  (TypeScript 7.x current; 6.0 last JavaScript-based release)
- Related skills in this repository: `sdk-development`, `nodejs`,
  `changelog-management`.
