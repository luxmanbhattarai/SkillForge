# Dependency & Reference Integrity

Phase 9 — what counts as a reference between SkillForge entities, which
references are mandatory, and how `scripts/check-references.mjs`
validates them. Tests: `test/check-references.test.mjs`.

## Entities and reference types

| From | Field / form | To | Kind | Meaning |
| --- | --- | --- | --- | --- |
| Skill | registry `path` | `skills/<cat>/<name>/SKILL.md` | Mandatory | The skill's file. A missing file is a reference to a removed file. |
| Skill | registry `related[]` | Skill | **Optional** | See-also, derived from co-occurrence (same agent discovers both, or same workflow uses both; see `ai/decisions/2026-11-20-related-skills-derivation.md`). Bidirectional by design. |
| Skill | registry `dependencies[]` | Skill | Mandatory | Declared skill→skill dependency. **No registry entry declares one today** (see §5); when one does, it is mandatory and participates in cycle detection. |
| Skill | relative Markdown link in `SKILL.md` | File in the repo | Mandatory | A link that points nowhere is broken. Upstream skills are exempt (their links legitimately point outside the imported subset). |
| Agent | registry `path` | `agents/<name>.md` | Mandatory | The agent's file. |
| Agent | registry `use[]` | Skill | Mandatory | Skills the agent must be able to use. |
| Agent | registry `discover[]` | Skill | **Optional** | Skills the agent may discover. |
| Agent | registry `references.agents[]` / `references.workflows[]` | Agent / Workflow | **Optional** | Peer references, extracted from backticked tokens in the agent file. Mutual by design. |
| Agent | relative Markdown link in `agents/<name>.md` | File in the repo | Mandatory | Same rule as skill links. |
| Workflow | registry `path` | `workflows/<name>.md` | Mandatory | The workflow's file. |
| Workflow | registry `skills[]` | Skill | Mandatory | Skills the workflow executes. |
| Workflow | registry `references.agents[]` / `references.workflows[]` | Agent / Workflow | **Optional** | Peer references, as for agents. |
| Workflow | relative Markdown link in `workflows/<name>.md` | File in the repo | Mandatory | Same rule as skill links. |
| `package.json` / CI workflows | `node scripts/<file>.mjs` (and `evals/`, `test-support/` scripts) | Script file | Mandatory | A referenced script that does not exist breaks the command that invokes it. |
| Any registry entry | `version` | — | Mandatory format | Must be valid semver (see §6). |

External resources (URLs in skill content) are **not** references in
this schema: they are checked by `check-links.mjs --online` (the
`online-links` maintenance job). This checker never uses the network.

## Mandatory vs optional — the exact rule

The distinction governs **absence** and **cycles**, not resolution:

1. **Absence.** An optional reference may be absent entirely: a skill
   with no `related` entries, an agent with an empty `discover` list,
   an agent with no peer references — all pass. A missing *mandatory*
   target fails. (A mandatory list may still be empty; emptiness of
   the list is not the checker's business.)
2. **Resolution.** When an optional reference *is* present, its target
   must exist. A dangling `related` entry is a broken pointer, and a
   broken pointer is an error whether the edge is mandatory or not.
3. **Cycles.** Only mandatory edges form the dependency graph.
   Optional edges are excluded from cycle detection: `related` pairs
   are mutual by construction (152 mutual pairs in the live repo) and
   agent peer references are mutual too (25 reference cycles exist
   today). Treating them as dependencies would report the library's
   own see-also structure as failures.

## What the checker validates

`node scripts/check-references.mjs [--root <dir>] [--json] [--verbose]`
(`npm run check:references`). Exit 1 on any error; warnings never fail.

| # | Check | Severity | Error message carries |
| --- | --- | --- | --- |
| 1 | Duplicate identifiers (skill/agent/workflow names within a registry) | Error | File, duplicated name, fix |
| 2 | Cross-namespace name collisions (same name in two registries) | Warning | See §7 |
| 3 | Registry paths exist on disk (`SKILL.md`, agent/workflow files) | Error | File + JSON line, missing path, fix |
| 4 | On-disk skills/agents/workflows are in the registry (orphaned files) | Error | File, fix (`npm run registry` or delete) |
| 5 | Every reference target resolves (all fields in the table above) | Error | File + JSON line, source, field, missing target, fix |
| 6 | No duplicate entries inside a reference list; no self-references | Error | File + JSON line, fix |
| 7 | Registry versions are valid semver | Error | File + JSON line, fix |
| 8 | No cycles in the mandatory dependency graph | Error | The full cycle path, fix |
| 9 | Internal Markdown links resolve (original skills incl. their disclosure-folder `.md` files, agents, workflows) | Error | File + line, broken href, fix |
| 10 | Scripts referenced by `package.json` and CI workflows exist | Error | Referring file, missing script, fix |
| 11 | Skills referenced by nothing (no inbound edge of any kind) | Warning | See §7 |

JSON line numbers are best-effort (located inside the pretty-printed
registry entry); when the shape is unexpected the line is omitted
rather than guessed.

**Progressive disclosure (Finding 1).** A skill's disclosure
folders (`references/`, `scripts/`, `assets/`, `examples/` — see
`docs/PROGRESSIVE-DISCLOSURE.md`) are part of the skill's
reference surface. Check 9 scans every `.md` file under those
folders (recursively) in addition to `SKILL.md`, so links inside a
guide (guide → deep guide, guide → script) are validated like
links in the body. Links INTO a disclosure folder from `SKILL.md`
resolve by the same existence check: a disclosure folder is a
valid reference target, and a dangling pointer into one is a
failure. The validator (`validate-skills.mjs`) covers the
complementary side — orphaned disclosure files (warn) and
bare/prose disclosure mentions (error when the folder exists) —
while this checker covers Markdown links only. Upstream skills'
disclosure files are exempt, like their `SKILL.md` files.

## Real-repo run (2026-11-22, commit b86b469)

`node scripts/check-references.mjs` — **PASS with 3 warnings, 0 errors.**

- 277 skills, 24 agents, 16 workflows checked; 0 internal links in
  the entity files (original skills, agents, and workflows contain
  no relative Markdown links today — their links are all external;
  the link check is a tripwire for future content. Repo-wide
  internal links live in `docs/`, `README.md`, `ai/`, etc. and are
  covered by `check-links.mjs`: 75 internal links, PASS).
- 0 dangling references, 0 duplicate identifiers, 0 self-references,
  0 duplicate list entries, 0 missing registry paths, 0 orphaned
  files, 0 dependency cycles, 0 non-semver versions, 0 missing
  scripts.
- Warnings (in files this workstream does not own; see §7):
  1. `sdk-development` is both a skill and a workflow.
  2. `seo-audit` is both a skill and a workflow.
  3. 104 skills are referenced by nothing (no agent discovers or
     uses them, no workflow uses them, no other skill relates to
     them). Full list with `--verbose` or `--json`.

## §5. The `dependencies` extension point

No skill declares a dependency today: the registry has no
`dependencies` field, frontmatter has no dependency key (the parser
supports scalars and one-level string maps only), and the registry
schema would reject an undeclared field. The checker nonetheless
reads a `dependencies` array on a registry skill entry when present
— tolerantly — validates its targets, counts its edges as inbound
references, and includes them in cycle detection. The test suite
proves the cycle detector end-to-end with a synthetic `dependencies`
cycle.

Adopting real skill→skill dependencies therefore needs, in order:
(1) a frontmatter or generator change to declare them (registry
workstream), (2) a schema change to allow the field
(`scripts/schemas/skills.schema.json`), (3) generator support in
`generate-registry.mjs`. Until then, the mandatory dependency graph
is agent→skill and workflow→skill edges only, and cycles are
impossible by construction (skills are leaves) — the checker still
runs the detection and reports the (zero) result.

## §6. Version requirements

No version *constraints* exist in this repo: nothing declares a
required range for anything else, so there is nothing to check for
incompatibility. The checker enforces the precondition instead —
every registry `version` must be valid semver (all 277 are today;
upstream skills carry their upstream versions, e.g. `2.12.7`, and
originals carry `1.0.0`). A malformed version would break any future
constraint check silently, so it fails now. If constraint
declarations are ever added, the check to add is: every declared
range must admit at least one version that satisfies every other
range on the same target.

## §7. Warnings, and why they do not fail

**Cross-namespace collisions (2).** `sdk-development` and
`seo-audit` each exist as both a skill and a workflow. Token
resolution is defined — skill wins
(`scripts/lib/agents-workflows.mjs`: "Skill names win over
agent/workflow names on collision") — so nothing breaks, but the
workflow of the same name can never be reached by a backticked
reference: `referencedPeers` classifies `` `seo-audit` `` as the
skill, never the workflow. The lib's parenthetical "(none exists
today)" is out of date: two exist. Renaming either side is a
content decision for the coordinator, not a checker fix — so this
stays a warning.

**Unreferenced skills (104).** A skill with no inbound edge is still
discoverable via the registry and `npm run query -- search`, still
installable, and still valid. Agents and workflows are curated
groupings; most skills legitimately belong to none. Failing on
unreferenced skills would make the check unusable (104 failures on
day one), so it is a warning with a capped listing (20 names, full
list with `--verbose`). The count is a discoverability signal for
curators, not an integrity failure.

## Neighbouring checkers (scope boundaries)

| Checker | Owns | This checker does NOT duplicate it |
| --- | --- | --- |
| `check-links.mjs` | All Markdown links repo-wide, external URLs with `--online` | External URLs; links outside skills/agents/workflows |
| `check-agents-workflows.mjs` | Backticked token resolution in agents/workflows files; required sections; use ⊆ discover | Token resolution; section structure |
| `validate-registry.mjs` | Registry schema conformance | Schema validation |
| `validate-skills.mjs` | Skill frontmatter, sections, placeholders | Skill content validation |
| `check-duplicates.mjs` | Duplicate skill content/names at the file level | File-level duplication |
| `check-sources.mjs` | Source and license records | Sources and licenses |

Overlap is deliberate in exactly one place: internal links in entity
files are checked both here (file + line + fix, as references) and
by `check-links.mjs` (repo-wide). The two must agree; if they ever
disagree, `check-links.mjs` is the authority on link semantics.
