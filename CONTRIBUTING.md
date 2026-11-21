# Contributing to SkillForge

SkillForge is a library of AI Agent Skills. Contributions are welcome:
new original skills, improvements to existing skills, agents, workflows,
documentation, and tooling.

## Ground rules

- **Original content only.** Write your own words and examples. Do not
  copy content from other skill libraries, blog posts, or documentation
  into an original skill.
- **No placeholders.** No TODO, "coming soon", or lorem ipsum. A skill
  is merged only when complete.
- **No invented facts.** Never fabricate versions, URLs, statistics,
  benchmarks, or API methods. If a fact is not verified against official
  documentation, leave it out or say so.
- **Upstream skills are never edited.** Files under `skills/upstream/`
  are imported verbatim. Fixes belong upstream; see
  [Updating upstream imports](#updating-upstream-imports).

## Adding or updating a skill

1. **Read the standards.** Every skill must follow
   [`docs/SKILL-STANDARDS.md`](docs/SKILL-STANDARDS.md) and the
   [Agent Skills specification](https://agentskills.io/specification).
2. **Copy the template.**
   `templates/SKILL-TEMPLATE.md` → `skills/<category>/<skill-name>/SKILL.md`.
   The directory name must match the frontmatter `name`, and the name
   must be unique across the whole library (original and upstream).
3. **Write the skill.** Follow the template's sections in order. Keep
   `SKILL.md` under 500 lines; move detailed reference material into
   `references/` files that load on demand. Set the frontmatter
   metadata, including `source: original` and a current
   `last_verified` date.
4. **Verify against official docs.** Check version-specific claims
   against the official documentation linked in the skill, and record
   the verification date.
5. **Validate.**
   ```bash
   npm run validate
   ```
   This runs frontmatter, section, link, duplicate, and registry
   checks. A skill that fails validation is not merged.
6. **Regenerate the registry.**
   ```bash
   npm run registry
   ```
   Never hand-edit `registry/` — it is generated from the skills on
   disk. Commit the regenerated files with your change.
7. **Update the changelog.** Add an entry under `Unreleased` in
   `CHANGELOG.md`.
8. **Open a pull request** (see [PR process](#pr-process)).

## Updating an existing skill

- Follow the same steps as adding one. Bump `metadata.version`
  (semver) when the guidance changes materially, and update
  `last_verified` to the date you re-verified it.
- If you find a skill disagreeing with official documentation, fix the
  skill and note the discrepancy in the PR description.

## Proposing upstream imports

Upstream skills are imported verbatim from other repositories. To propose
an import:

1. **Check the license.** The source must permit redistribution (MIT,
   Apache-2.0, or equivalent). Record the license in
   `sources/licenses.md`.
2. **Check for name collisions.** A skill whose name collides with an
   existing original skill is referenced, not imported (see
   `sources/third-party-skills.md`).
3. **Check the scope.** The skill must fit this library's scope
   (software engineering, SEO, content, media) and be genuinely useful
   as an agent skill.
4. **Open an issue** using the skill-request template, naming the source
   repository, the skills to import, and the license. Imports are
   recorded in `sources/imported-skills.md` with the source commit and
   import date, and each vendor directory gets an `ATTRIBUTION.md`.

### Updating upstream imports

Re-import from upstream by commit; never edit imported files. Record the
new commit and date in the vendor's `ATTRIBUTION.md` and in
`CHANGELOG.md`. See `docs/UPDATE-PROCESS.md`.

## Contributing agents and workflows

- Agents live in `agents/` and follow the section structure of the
  existing agent files (Role, Responsibilities, Skills it can discover,
  Skills it should use, Required workflow, Expected deliverables,
  Validation criteria, Escalation rules).
- Workflows live in `workflows/` and chain skills by backticked name
  with ordered steps, inputs/outputs, and checks.
- Agents and workflows must follow the discovery rules in `AGENTS.md`:
  task-based skill selection only — never load the whole library.

## PR process

1. Fork the repository and create a branch from `main`.
2. Make your change, run `npm run validate`, regenerate the registry,
   and update `CHANGELOG.md`.
3. Open a pull request using the PR template. Describe what changed and
   why, and list the official sources you verified against.
4. CI runs validation, link checks, and a security scan on every PR.
   All checks must pass before merge.
5. A maintainer reviews for accuracy, originality, and standards
   compliance. Address feedback and re-run validation after changes.

## Reporting problems

- **Skill content issues** (wrong guidance, outdated versions, broken
  links): open a bug report.
- **Security issues**: see `SECURITY.md` — do not report vulnerabilities
  in public issues.
- **New skill ideas**: open a skill request.

## Code of conduct

By contributing, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
