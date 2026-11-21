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

### Frontmatter parser subset

The frontmatter parser (`scripts/lib/frontmatter.mjs`) is hand-rolled:
this repository has zero dependencies, so no YAML library is available.
It supports only the subset below, and it is intentionally strict —
anything outside it is a validation error, not a silent guess. (Audit
finding L-05; see `ai/decisions/2026-11-20-frontmatter-parser-subset.md`.)

**Supported:**

- **File shape.** The file must start with `---` on its own line,
  followed by the frontmatter block and a closing `---` on its own
  line. CRLF line endings are tolerated.
- **Top-level scalar keys.** One `key: value` per line. Keys match
  `[A-Za-z0-9_-]+`. Values are plain scalars; a value may contain
  colons after the first `key: ` separator, but **not** a colon
  followed by a space (`: `) — strict YAML reads that as a nested
  mapping, so spec-compliant tools reject the whole frontmatter.
  Quote any value that contains `: ` (found in Phase 12: the
  `graphql` skill was invisible to `npx skills add --list` for
  exactly this reason).
- **Quoted values.** Single- or double-quoted values have the quotes
  stripped. There is no escape processing: a backslash inside a quoted
  value stays a backslash, and a quote character cannot be escaped.
- **Block scalars.** Folded (`>` / `>-`) and literal (`|` / `|-`)
  block scalars, with continuation lines indented by exactly two
  spaces. Folded blocks join lines with single spaces and collapse
  runs of whitespace; literal blocks join lines with newlines.
  Trailing blank lines are trimmed. The `-` (strip) variants behave
  the same as the plain ones — chomping is not distinguished.
- **Plain multi-line scalars.** A key with an empty value followed by
  indented (two-space) continuation lines folds them with spaces,
  like a folded block scalar without the `>` marker.
- **One level of nested string maps.** A key with an empty value
  followed by two-space-indented `key: value` lines parses as a map
  of strings — this is how `metadata:` works. Nested values may be
  quoted (quotes stripped, no escape processing).
- **Blank lines and full-line comments.** Blank lines and lines whose
  first non-space character is `#` are skipped.

**Not supported (validation error or wrong result):**

- **Lists.** `- item` lines are unparseable and fail validation.
- **Deeper nesting.** A map inside a map (e.g. indented lines inside
  `metadata:` values) is not parsed; an indented line where none is
  expected is an error.
- **Inline comments.** `#` after a value is kept as part of the value.
- **Anchors, aliases, tags, multi-line quoted strings, flow style**
  (`{a: b}`, `[1, 2]`). None of these are parsed.
- **Duplicate keys.** The last occurrence silently wins; the parser
  does not warn.
- **A key with no value and no indented continuation** is an error
  (`key 'x' has no value`).

Practical consequences: write frontmatter exactly like
`templates/SKILL-TEMPLATE.md` does — plain scalars, `>` for the long
description, and a flat `metadata:` map. If validation reports
"unparseable frontmatter line" or "unexpected indented line", the
frontmatter almost certainly uses a YAML feature outside this subset.

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

## Quality standard — the 22 elements

Every original skill includes these elements, where applicable. The
15 template sections carry them; elements that are not sections live
as required content inside a section (see
`ai/decisions/2026-11-20-quality-standard-mapping.md` for why no new
required sections were added).

| # | Element | Where it lives |
| --- | --- | --- |
| 1 | Name | Frontmatter `name` (must match the directory) |
| 2 | Description | Frontmatter `description` (≤1024 chars, trigger keywords) |
| 3 | Purpose | `Purpose` |
| 4 | When to use | `When to Use` |
| 5 | When not to use | `When Not to Use` (name the alternative) |
| 6 | Prerequisites | `Prerequisites` |
| 7 | Supported versions | Required content in `Prerequisites`: version range, or "current stable as of DATE" + release-notes link |
| 8 | Official documentation | `Official Documentation` (real official URLs only) |
| 9 | Required workflow | `Required Workflow` (numbered, in order) |
| 10 | Architecture guidance | `Implementation Standards` (subsection where applicable) |
| 11 | Implementation standards | `Implementation Standards` |
| 12 | Security requirements | `Security Considerations` |
| 13 | Performance requirements | `Performance Considerations` |
| 14 | Accessibility requirements | `Implementation Standards` subsection where applicable (frontend, media, content, metadata skills); other skills state N/A with a reason |
| 15 | Testing strategy | `Implementation Standards` subsection (how the work is tested) |
| 16 | Common mistakes | `Common Mistakes` (mistake → correction pairs) |
| 17 | Correct examples | `Examples` |
| 18 | Incorrect examples | `Examples` (counter-examples) and/or `Common Mistakes` |
| 19 | Validation checklist | `Validation Checklist` (checkable outcomes) |
| 20 | Expected deliverables | `Expected Deliverables` |
| 21 | References | `References` (official sources + related skills) |
| 22 | Last verified date | Frontmatter `metadata.last_verified` (the real verification date) |

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
8. **Focused and composable.** One skill, one job. Reference sibling
   skills instead of repeating their content; never copy a section
   wholesale into another skill.
9. **Progressive disclosure.** Keep `SKILL.md` under 500 lines. Detailed
   reference material goes in `references/` files, loaded on demand.
10. **Mandatory vs recommended.** Use "must" only for requirements the
    Validation Checklist can check; use "should" / "consider" for
    recommendations. An agent must be able to tell them apart.
11. **Testable examples.** Examples are minimal and runnable where the
    medium allows; a claimed command, API call, or config snippet must
    be real. Counter-examples show the wrong way next to the right way.
12. **Anti-patterns and failure cases.** Every skill names the mistakes
    its users actually make and what happens when the workflow is
    skipped — not just the happy path.
13. **No filler.** No content added to meet a length target. A short
    skill that covers its topic is better than a long one padded with
    generic advice.

## Quality scoring

`scripts/score-skills.mjs` scores every original skill on eight
dimensions (0–100 each, plus an overall score):

technical accuracy (checkable proxies only — see below),
completeness, actionability, security, testing, documentation,
version awareness, maintainability.

```bash
npm run score                  # score all original skills
node scripts/score-skills.mjs --filter skills/backend/nestjs
node scripts/score-skills.mjs --json > scores.json
```

A high score must not hide a critical failure. Hard caps apply:

- Any security-scan pattern hit (hardcoded credential, private key,
  curl-piped-to-shell, destructive `rm -rf`, prompt-injection marker)
  caps the overall score at 40 and flags the skill CRITICAL.
- A missing required section caps the overall score at 50.
- A placeholder marker (TODO/FIXME/TBD/lorem ipsum/coming soon)
  caps the overall score at 60.

**What the scorer cannot do:** it cannot verify technical accuracy —
that requires reading official documentation, which only the Phase 3
style audit does. The accuracy dimension scores checkable proxies
(no placeholders, no broken relative links, real `https` doc links,
no obviously invented version claims it can detect) and is labeled
as a proxy in the output. Never present a scorer result as proof that
a skill's technical content is correct.

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
