# Phase 4 Batch 2 — Report (SDK + API contracts)

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade`
- **Scope:** 4 new original skills under `skills/backend/`. No commits
  (coordinator commits). No files outside the batch's directories were
  touched.

## Skills written

| Skill | Path | Lines | Description |
| --- | --- | --- | --- |
| `typescript-sdk` | `skills/backend/typescript-sdk/SKILL.md` | 373 | TypeScript SDK engineering: package layout, dual CJS/ESM builds (tsdown/tsup), publint/attw, typed client, auth, retries, pagination, streaming, Vitest, npm publishing with provenance. |
| `python-sdk` | `skills/backend/python-sdk/SKILL.md` | 438 | Python SDK engineering: src layout, hatchling/PDM, `py.typed`, mypy/Pyright, httpx sync+async clients, retries, pagination, streaming, pytest, PyPI trusted publishing. |
| `api-client-generation` | `skills/backend/api-client-generation/SKILL.md` | 351 | Generating API clients from OpenAPI: OpenAPI Generator, orval, hey-api, openapi-typescript; generator selection, pinning, generated-code hygiene, CI drift checks. |
| `openapi` | `skills/backend/openapi/SKILL.md` | 434 | OpenAPI 3.x authoring: operations, schemas/components, security schemes, versioning, Spectral/Redocly linting, bundling, docs, Prism mocking, Schemathesis/oasdiff contract testing. |

All four follow `templates/SKILL-TEMPLATE.md` section order, keep
`SKILL.md` under 500 lines, use the standard frontmatter
(`version: "1.0.0"`, `category: backend`, `maintainer:
skills-library`, `source: original`, `last_verified: "2026-11-20"`),
and cross-reference related skills by backticked name only (no file
paths, no relative links). Descriptions are 386–443 chars (limit
1024). Examples were machine-checked where feasible: the Python
client example parses (`ast.parse`), the `pyproject.toml` example
parses (`tomllib`), the OpenAPI YAML examples parse (`yaml.safe_load`),
and the `package.json` example parses as JSON.

## Official sources consulted

### typescript-sdk

- TypeScript 7.0 announcement (devblogs.microsoft.com): 7.0 stable
  8 July 2026, native Go port; no stable programmatic compiler API
  until 7.1; `@typescript/typescript6` side-by-side package.
  Current stable is 7.0.2; 7.1 beta published 20 October 2026.
- Node.js release status (nodejs/Release schedule via endoflife.date
  and release notes): 26.13.x Active LTS since 28 October 2026
  ("Lithium", EOL 30 April 2029); 24 Maintenance LTS to 30 April
  2028; 22 Maintenance LTS to 30 April 2027; 20 EOL 30 April 2026.
- tsup repository / release notes: 8.5.1 latest, but the README
  states the project is no longer actively maintained and points to
  tsdown.
- tsdown docs (tsdown.dev) and migration guide
  (tsdown.dev/guide/migrate-from-tsup): Rolldown-based successor;
  staged migration via v0.22.14, then ^0.23.0.
- publint (publint.dev, verified live) — 0.3.25, 1 October 2026.
- Are The Types Wrong (arethetypeswrong.github.io, verified live) —
  `@arethetypeswrong/cli` 0.18.5, 9 July 2026.
- semver.org, docs.npmjs.com (already used elsewhere in the repo).

### python-sdk

- Python 3.15 release (blog.python.org, peps.python.org PEP 790,
  docs.python.org): 3.15.0 released 9 October 2026; 3.15.2 current
  (25 October 2026). 3.10 reached end of life in October 2026, so
  3.11 is the oldest supported version.
- Python Packaging User Guide (packaging.python.org): build-backend
  declarations — hatchling >= 1.26, pdm-backend >= 2.4.0,
  setuptools >= 77.0.3, flit_core >= 3.12.0, uv_build >= 0.13.
- Hatch (hatch.pypa.io), PDM (pdm-project.org), uv
  (docs.astral.sh/uv) — uv 0.13.x current; `uv_build` default in
  `uv init` since 0.8.0/0.12.0, with a documented library caveat
  (Rust toolchain required to build from sdist).
- PyPI trusted publishing (docs.pypi.org/trusted-publishers/).
- httpx (python-httpx.org) 0.28.1; pytest (docs.pytest.org) 9.2.0
  (27 October 2026); pytest-httpx 0.36.2.
- Type checkers: mypy 2.4.0 (1 October 2026), Pyright 1.1.414
  (9 September 2026), Pyrefly 1.4.0 stable (15 October 2026;
  1.0 May 2026), ty beta (docs.astral.sh/ty); pytype archived
  3 September 2026.

### api-client-generation

- OpenAPI Generator (openapi-generator.tech; GitHub
  OpenAPITools/openapi-generator): 7.27.0 latest stable
  (2 November 2026); Java 11+ runtime; npm wrapper
  `@openapitools/openapi-generator-cli`.
- Orval (orval.dev, verified live; GitHub orval-labs/orval):
  8.48.0 current (14 November 2026); `--outdated` flag added in
  8.46.0. September 2026 code-injection CVEs (CVE-2026-96754,
  CVE-2026-96755, CVE-2026-96759, CVSS 9.8) fixed in 8.28.0–8.30.0;
  the skill requires >= 8.30.0.
- Hey API (heyapi.dev/docs/openapi/typescript/get-started):
  `@hey-api/openapi-ts` 0.99.x; plugin-based config; ESM-only
  since 0.91.0; Node.js 22.13+ since 0.96.0; docs recommend
  pinning an exact version (pre-1.0).
- openapi-typescript (openapi-ts.pages.dev) 7.13.x + openapi-fetch
  0.17 (types-only approach).

### openapi

- OpenAPI Specification (spec.openapis.org/oas/v3.2.0.html — URL
  already used in `sdk-development`): 3.2.1 latest published
  version (10 September 2026, editorial patch of 3.2.0);
  3.1.2 latest 3.1 patch; 3.2 adds the QUERY method (RFC 10008),
  streaming descriptions, hierarchical tags, and the OAuth 2.0
  device authorization flow.
- Spectral (GitHub stoplightio/spectral; meta.stoplight.io docs):
  `@stoplight/spectral-cli` 6.17.1 (6 November 2026); lints
  OpenAPI 2/3.0/3.1/3.2; `spectral:oas` recommended ruleset;
  OWASP ruleset package `@stoplight/spectral-owasp-ruleset`.
- Redocly CLI (redocly.com/docs/cli, verified live): 2.x current
  (2.71 in October 2026), ESM-only, Node.js 22.12+.
- Prism (GitHub stoplightio/prism): `@stoplight/prism-cli` 5.x
  mock server and validating proxy.
- Schemathesis (schemathesis.readthedocs.io): property-based
  contract testing; v4 uses `--url` for the base URL.
- oasdiff (GitHub oasdiff/oasdiff): breaking-change detection.
- vacuum 0.41.0 (14 November 2026) noted as a fast Go linter
  alternative in research; mentioned only briefly in the skill
  via the Spectral comparison context (not linked).

## Validation output

Each skill validated with the filtered validator (registry check
skipped, per plan — the coordinator regenerates the registry):

```
$ node scripts/validate-skills.mjs --filter skills/backend/typescript-sdk
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/backend/python-sdk
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/backend/api-client-generation
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/backend/openapi
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

No unfiltered validate and no `npm run registry` were run.

## Decisions and notes

- **tsup is unmaintained; tsdown is the recommendation for new
  SDKs.** The batch brief said "dual CJS/ESM builds (tsup)", but
  research (tsup README, tsdown migration guide, multiple November
  2026 sources) establishes that tsup 8.5.1 is the latest release
  and the project states it is no longer actively maintained,
  pointing users to tsdown. The `typescript-sdk` skill therefore
  recommends tsdown for new SDKs, documents tsup for existing
  builds, and covers the staged tsdown migration (v0.22.14 first,
  resolve deprecation warnings, then ^0.23.0) and the filename
  differences that make a config rename insufficient.
- **`sdk-development` complement, not duplicate.** The existing
  skill is language-agnostic client design (it already contains a
  full typed-client example). The new TS/Python skills reference
  it for design decisions and focus on their language's packaging,
  typing, build, test, and publishing tooling. The TS example
  shows package config and a paginator rather than re-showing a
  full client.
- **OpenAPI 3.1 is the recommended default; 3.2.1 is latest.**
  3.2.1 (10 September 2026) is the current published spec, but
  tool support for 3.2 is still catching up, so both the `openapi`
  and `api-client-generation` skills recommend 3.1 unless the
  whole toolchain supports 3.2.
- **Orval security floor (>= 8.30.0).** The September 2026
  code-injection CVEs are called out in `api-client-generation`
  Security Considerations with the fixed versions, plus the
  general rule to treat specs as untrusted generator input.
- **Python version floor (3.11).** 3.10 reached end of life in
  October 2026; the skill sets the floor at the oldest
  security-supported version and names 3.15.2 as current.
- **Type checker guidance.** The skill recommends mypy `--strict`
  or Pyright strict as the CI gate, notes Pyrefly 1.x as a stable
  fast alternative, and flags ty as beta (trial, don't gate
  releases on it).
- **URL verification caveat.** Three `browser.open` verification
  attempts (openapi-generator.tech, schemathesis.readthedocs.io,
  docs.pypi.org/trusted-publishers/) hit a browser-service rate
  limit (429) and were not retried, per the rate-limit stop rule.
  Those three URLs were confirmed through search results instead
  (official docs/repo references and usage in official guides);
  orval.dev, publint.dev, arethetypeswrong.github.io, and
  redocly.com/docs/cli were verified live with `browser.open`.
  All other links are either repo-established
  (spec.openapis.org, typescriptlang.org, semver.org) or official
  documentation URLs returned verbatim by search results.
- **Cross-references verified.** Every backticked skill name used
  in the four skills exists in `skills/` (checked by directory
  listing), including the two new sibling skills of this batch
  (`typescript-sdk`, `python-sdk`) referenced from
  `api-client-generation` and `openapi`.
- **Parallel batches.** Other Phase 4 batches were landing during
  this work (untracked `skills/architecture/changesets`,
  `skills/architecture/nx`, `skills/desktop/`,
  `skills/infrastructure/aws/` observed in `git status`). Only the
  four batch-2 directories and this report were created or edited.
