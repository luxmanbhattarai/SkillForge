# Skill Standards

This document defines the format every skill in this repository must follow.
It implements the [Agent Skills specification](https://agentskills.io/specification)
(specification page updated 2026-08-04) plus this repository's own quality rules.

## Format

A skill is a directory containing at minimum a `SKILL.md` file:

```text
skills/<category>/<skill-name>/
├── SKILL.md
├── references/   # optional, loaded on demand
├── examples/     # optional
├── scripts/      # optional, executable helpers
└── assets/       # optional, templates / static resources
```

Supporting directories are created only when the skill genuinely needs them.

## Frontmatter

`SKILL.md` must start with YAML frontmatter. Fields follow the Agent Skills
specification:

| Field | Required | Constraints |
| --- | --- | --- |
| `name` | Yes | 1-64 chars; lowercase letters, digits, hyphens only; no leading/trailing/consecutive hyphens; must match the parent directory name. |
| `description` | Yes | 1-1024 chars; non-empty; describes what the skill does and when to use it, with trigger keywords. |
| `license` | No | Short license name (e.g. `MIT`) or reference to a bundled license file. This repository requires it on original skills. |
| `compatibility` | No | Max 500 chars; only when the skill has specific environment requirements. |
| `metadata` | No | Map of string keys to string values. |
| `allowed-tools` | No | Experimental; not used in this repository. |

Original skills in this repository use this metadata (all values strings):

```yaml
metadata:
  version: "1.0.0"
  category: <category directory>
  maintainer: skills-library
  source: original
  last_verified: "YYYY-MM-DD"
```

Upstream (imported) skills keep their original frontmatter untouched. Their
provenance is recorded in `sources/imported-skills.md` and in the registry,
not by editing the upstream files.

## Body

The body after the frontmatter holds the instructions. There are no format
restrictions in the spec; this repository standardizes on the sections in
`templates/SKILL-TEMPLATE.md`, in order:

Purpose, When to Use, When Not to Use, Prerequisites, Official Documentation,
Required Workflow, Implementation Standards, Best Practices, Security
Considerations, Performance Considerations, Common Mistakes, Examples,
Validation Checklist, Expected Deliverables, References.

Guidance from the spec, enforced by the validator:

- Keep `SKILL.md` under 500 lines. Move detailed reference material into
  `references/` files that agents load on demand.
- Reference other files with paths relative to the skill root, one level
  deep from `SKILL.md`. Avoid nested reference chains.
- The description is loaded for every skill at startup (~100 tokens); the
  body loads only when the skill activates. Keep descriptions sharp.

## Quality rules (all original skills)

1. **Accurate.** Prioritize official current documentation, then official
   maintainer repositories and migration guides, then standards specs,
   then reputable community resources.
2. **Current.** Record the verification date in metadata. Never hardcode an
   old version as the permanent standard; prefer "current stable as of
   DATE" with a link to official release notes when a version was not
   verified in-session.
3. **Practical.** Real, valid, minimal examples. No fake APIs, no invented
   package methods or CLI flags, no invented URLs.
4. **Secure by default.** Examples use secret-manager placeholders, never
   real secrets; auth skills recommend maintained frameworks over custom
   auth.
5. **Honest.** No invented statistics, search volumes, benchmarks, or
   guarantees. SEO skills never promise rankings or AI citations.
6. **Self-contained.** A skill must work on its own. Cross-reference sibling
   skills by backticked name, not by file path.
7. **No placeholders.** No TODO / "coming soon" / lorem ipsum. A skill is
   published only when complete.

## Upstream skills

Imported skills live under `skills/upstream/<vendor>/` and are never edited.
They must pass spec-level validation (valid name/description, name matches
directory) but are exempt from this repository's section requirements.
Each vendor directory contains an `ATTRIBUTION.md` recording the source
repository, license, imported commit, and import date. See
`sources/imported-skills.md`.

## Validation

```bash
npm run validate        # full validation (frontmatter, sections, links, duplicates, registry)
npm run check:links     # internal link check (excludes skills/upstream/ by default; see scripts/check-links.mjs)
npm run check:sources   # provenance + verification-date freshness
npm run registry        # regenerate registry/ from the skills on disk
npm run report          # coverage + audit report
```

CI runs the same commands on every pull request. A skill that fails
validation is not merged.
