# Progressive Disclosure

How skills in this library split their content between a short
`SKILL.md` core and on-demand detail files — and when they should
not split at all.

This standard implements the layout already defined in
[`SKILL-STANDARDS.md`](SKILL-STANDARDS.md) (a skill directory may
contain `references/`, `examples/`, `scripts/`, and `assets/`
alongside `SKILL.md`) and the discovery rule in `AGENTS.md`
("Load references on demand"). It adds the budgets, the loading
contract, and the enforcement split.

## Why

Every skill activation loads the whole `SKILL.md`. At the
2026-11-22 baseline the 228 original skills had a median of 247
lines and a maximum of 489 — and **zero** had a disclosure folder,
so every activation paid the full file whether the task needed
the detail or not. Progressive disclosure keeps the core short
and moves detail behind links the agent follows only when the
task needs it. It is a context budget, not a filing exercise:
a split that no task follows is worse than no split.

## The layout

```text
skills/<category>/<skill-name>/
├── SKILL.md            # core: instructions + pointers (always loaded)
├── references/         # detailed guides, loaded on demand
├── scripts/            # reusable code the agent runs or reads
├── assets/             # templates, diagrams, static resources
└── examples/           # runnable examples
```

| Folder | Holds | Create it when |
| --- | --- | --- |
| `references/` | Detailed guides, long procedures, deep background, checklists too long for the body | A section of the body would run long, or a procedure is needed only by some tasks |
| `scripts/` | Reusable code: helpers, validators, generators the agent executes or adapts | The skill ships code the agent runs (not a snippet to read — snippets stay in the body or `examples/`) |
| `assets/` | Templates, diagrams, config files, static resources | The skill produces a standard artefact from a template, or a diagram carries meaning prose cannot |
| `examples/` | Runnable examples, sample inputs/outputs | An example is long enough to push the body over budget, or several variants exist |

Folders are created only when the skill genuinely needs them. An
empty folder discloses nothing and counts as no folder in every
measurement. Subdirectories inside a disclosure folder are fine;
links resolve relative to the file that carries them.

**Naming rule (hard):** a runnable file (`.js`, `.mjs`, `.cjs`,
`.ts`, `.mts`, `.cts`) in a disclosure folder must never use a
name the Node test runner discovers — `*-test.*`, `*.test.*`,
or `test-*.*`. `npm test` is bare `node --test`, and Node 24
discovers those patterns anywhere in the tree: the migration
once shipped `examples/inject-test.ts`, a real test importing a
module that does not exist, and the full suite failed on it.
Name the file for what it shows instead (`inject-example.ts`,
not `inject-test.ts`). Enforced by
`test/disclosure-filenames.test.mjs`.

## Line budgets

Measured on total `SKILL.md` lines (frontmatter included), by
`scripts/disclosure-coverage.mjs`.

| Size | Rule |
| --- | --- |
| ≤ 300 lines | Single file is fine. Do not split for its own sake. |
| 300–500 lines | SHOULD split: move detail into disclosure folders until the body is at or under 300, or shorten the body. |
| > 500 lines | MUST split: the validator warns, and the warning names progressive disclosure. 0 skills are over 500 today. |

Why 300: the median skill is 247 lines, so 300 gives ~30% headroom
over the median while catching the 44 skills (19%) that carry the
most weight; it aligns with the scorer, which gives full
maintainability marks up to 350 lines and penalises length above
it. Why 500: it is the validator's existing line-length warning
threshold, so the MUST-split line costs no new rule.

The 300-line budget is measured, not validator-enforced. The
validator never fails an unmigrated skill — migration is gradual,
and a long single-file skill remains valid. Coverage is measured
separately (`ai/quality/PROGRESSIVE-DISCLOSURE-COVERAGE.md`).

## The loading contract

1. The agent reads the frontmatter and `SKILL.md` first. The body
   must be sufficient for the common case: purpose, when to use,
   prerequisites, the required workflow, and the validation
   checklist all live in the body.
2. The agent loads a disclosure file only when the task needs it —
   when the body points at it for the step being executed, or the
   task explicitly asks for the detail it holds.
3. Every disclosure file must be reachable from `SKILL.md`:
   linked directly, or linked from another linked file
   (transitively). An unlinked file is invisible — nothing loads
   it — so the validator warns on orphaned disclosure files.
4. Links are relative (`./references/guide.md`), never absolute
   repo paths: skills are installed into other projects, where
   the repo root does not exist.
5. A disclosure file must not assume it was read in isolation: it
   may link to other disclosure files, and it may assume the
   agent has read `SKILL.md`.

## What stays in the body

The 15 required sections stay in `SKILL.md` — disclosure moves
detail *within* a section out, never the section itself. In
particular:

- **Prerequisites** stays whole: supported versions and required
  tools are needed before the agent starts, so they are never
  behind a link.
- **Required Workflow** stays whole as numbered steps; a step may
  link to a `references/` procedure for its detail.
- **Validation Checklist** stays whole: the agent verifies against
  it at the end, without loading anything else.
- **Security Considerations** stays whole for the threats that
  apply to every use; a deep threat analysis can live in
  `references/`.

Good candidates to move out: long procedures, exhaustive option
tables, deep background, long code listings, per-environment
variants, full worked examples.

## Linking rules

- Link from the body with a Markdown link:
  `[the migration guide](./references/migration.md)`. Bare path
  mentions (`` `references/migration.md` ``) in prose are also
  checked: when the folder exists, a mentioned file must exist.
- Link between disclosure files with paths relative to the
  linking file (`./deep.md` from inside `references/`,
  `../scripts/run.mjs` from `references/` to `scripts/`).
- Scripts the agent runs are referenced by path from the body or
  from a guide; the reference must resolve.
- Never link to a file that does not exist. Dangling pointers
  into disclosure folders are validation errors (original
  skills) and reference-integrity errors.
- Never link *out* of the skill directory to another skill's
  files: reference sibling skills by name, not by path.

## Enforcement split

| Tool | Role |
| --- | --- |
| Validator (`validate-skills.mjs`) | Warns on orphaned disclosure files; errors on dangling disclosure pointers (when the folder exists); warns on >500-line bodies without disclosure folders. Never fails an unmigrated skill. |
| Scorer (`score-skills.mjs`) | Rewards disclosure for long skills: +10 for `references/`, +5 for `scripts/`, +5 for `assets/` or `examples/` (cap +20) on maintainability, only above 350 lines. A short single-file skill scores 100 without any folder. |
| Reference checker (`check-references.mjs`) | Validates Markdown links inside disclosure `.md` files and links into disclosure folders. |
| Coverage (`disclosure-coverage.mjs`) | Measures per-skill disclosure status and library-wide coverage. Never fails — a measurement, not a gate. |

## Migration

Migration is gradual and owned by the skill-migration workstream.
Order: the 44 over-budget skills first, longest first
(`ai/quality/PROGRESSIVE-DISCLOSURE-COVERAGE.md` lists them);
ai-engineering (5/5 over budget) and desktop (3/3) are the two
fully over-budget categories. A migration is done when the body
is at or under 300 lines (or the detail genuinely cannot move)
and every disclosure file is linked. Re-run the coverage script
after each batch and update the coverage doc.

Do not migrate a skill by moving text without reading it: a
mechanical split produces orphaned files and broken links. Each
moved section gets a link from the body at the point the agent
would need it, and the body keeps a one-line summary of what
moved.
