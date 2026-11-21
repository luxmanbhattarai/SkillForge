# Behavioral Evaluation System

Static validation (`npm run validate`, `npm run score`) checks that
skill files are well-formed. It cannot say whether an agent will
**use** the skills correctly. This directory is the behavioral layer:
it runs an agent against task prompts and scores what the agent
actually does — which skills it selects, what its grounded answer
contains, whether it refuses unsafe requests, and whether its code
compiles and behaves.

## Honest scope

The default provider is a **deterministic mock agent** (no network, no
API keys, no LLM). It implements the AGENTS.md discovery rules:
registry search → skill selection → load SKILL.md → ground the answer
in the loaded text → refuse unsafe input. It evaluates the **library**
— discoverability, trigger discrimination, content completeness, and
safety guidance — not an LLM's reasoning ability. A real model can
behave differently from the mock; this suite is a regression net for
the library, not proof that any particular model will use the skills
correctly. See `ai/decisions/2026-11-20-eval-mock-agent.md`.

Model-based evaluation is supported through a provider interface
(`runners/providers.mjs`): an OpenAI-compatible endpoint configured
via `EVAL_PROVIDER_*` env vars. It is optional and never required for
`npm run evals`. The provider layer is unit-tested against a local
stub endpoint, but **no real-model run has ever been executed** — see
[`docs/REAL-MODEL-EVALUATION.md`](../docs/REAL-MODEL-EVALUATION.md)
for the plan. Model runs write to `evals/reports/model/`, are never
compared to the mock baseline, and cannot save a baseline.

## Layout

```text
evals/
  README.md            this file
  cases/               hand-written cases, JSON, grouped by theme
  datasets/            generated cases + shared datasets
    generate-discovery-cases.mjs   one discovery case per registry skill
    discovery-generated.json       generated output (committed)
  fixtures/            executable code fixtures for code-generation cases
  runners/
    run-evals.mjs      CLI runner (npm run evals)
    mock-agent.mjs     deterministic simulated agent
    providers.mjs      provider interface (mock + OpenAI-compatible model)
  scorers/
    selection.mjs      recall / precision / top-N / forbidden skills
    content.mjs        must-include / must-exclude / tool plan
    refusal.mjs        refused vs over-refused
    code.mjs           compile checks + fixture execution
  reports/             latest run output (latest.json, latest.md; gitignored;
                       model-provider runs go to reports/model/)
  baselines/           committed baseline snapshots (current.json, slim results)
  regression/          latest baseline-comparison output (gitignored)
```

## Running

```bash
npm run evals                        # full suite, mock provider, exit 1 on failure
npm run evals -- --cases nextjs      # only cases matching "nextjs" (id, category, or skill)
npm run evals -- --cases-file <path> # only the case ids listed in a JSON file
npm run evals -- --out <dir>         # write reports to <dir> instead of evals/reports/
npm run evals -- --report-only       # always exit 0 (reporting mode)
npm run evals -- --provider model    # model provider (needs EVAL_PROVIDER_* env vars)
npm run evals -- --save-baseline     # save this run as the new baseline (mock only)
node evals/datasets/generate-discovery-cases.mjs   # regenerate generated cases
```

The runner validates every case before running (unknown category,
unknown skill name, duplicate id, missing fixture all fail fast with
exit code 2). Results go to `evals/reports/latest.json` (machine
readable) and `evals/reports/latest.md` (human readable). When a
baseline exists, the runner also writes a regression comparison to
`evals/regression/latest.json` listing regressions, fixes, new, and
removed cases. Model-provider runs write to `evals/reports/model/`
instead and are never compared to the baseline. `--out` redirects
both reports (and the regression comparison, as `regression.json`)
to the given directory — use it for throwaway runs so a partial run
never clobbers the full report.

## Case schema

Cases are JSON objects in `evals/cases/*.json` (an array, or
`{"cases": [...]}`). Every field except `notes` is validated.

```json
{
  "id": "SEL-nextjs-001",
  "category": "skill-selection",
  "skill": "nextjs",
  "type": "positive",
  "input": "In my Next.js 15 app, are fetch() calls in Server Components cached by default?",
  "expected": {
    "skills": ["nextjs"],
    "notSkills": ["astro"],
    "mustInclude": ["NOT cached by default"],
    "mustExclude": ["cached unless opted out"],
    "refuse": false
  },
  "notes": "Regression case for H-04 (Phase 3 fix)."
}
```

| Field | Meaning |
| --- | --- |
| `id` | Unique. Convention: `AAA-skill-###` where AAA is a short category prefix (`DIS`, `SEL`, `TRG`, `INS`, `TEC`, `COD`, `SEC`, `ERR`, `NEG`, `HAL`, `TOO`, `OUT`), or `GEN-...` for generated cases. |
| `category` | One of the 12 categories below. |
| `skill` | Primary skill under evaluation (must exist in the registry). May be omitted for cross-cutting cases (e.g. injection refusal). |
| `type` | `positive` / `negative` / `ambiguous` / `edge` / `regression` / `security`. |
| `input` | The task prompt, as a user would write it. |
| `expected.skills` | Skills the agent must select. |
| `expected.notSkills` | Skills the agent must NOT select (distractors). |
| `expected.topN` | If set, expected skills must rank within the first N selected, and the precision check is skipped. Used by generated discovery cases. |
| `expected.mustInclude` | Strings the grounded answer must contain (case-insensitive substring). Ground every string in the actual skill text — never invent one. |
| `expected.mustExclude` | Strings the grounded answer must NOT contain (deprecated APIs, wrong defaults, hallucinated claims). |
| `expected.refuse` | `true` = the agent must refuse; `false`/absent = it must not (over-refusal fails). |
| `expected.tools` | Steps the tool plan must mention (tool-use cases). |
| `expected.forbiddenTools` | Steps the tool plan must not mention. |
| `expected.code` | `true` = extract code blocks from the skill's Examples section and compile-check them. |
| `expected.codeLanguage` | `js` (default) or `ts`. |
| `expected.codeMustInclude` / `codeMustExclude` | Strings the extracted code must contain / avoid. |
| `expected.fixture` | Fixture in `evals/fixtures/<name>.mjs` to execute (see below). |
| `notes` | Why the case exists; links to findings or audit items where relevant. |

## The 12 categories

| Category | What it tests | Main scorers |
| --- | --- | --- |
| `skill-discovery` | The right skill is findable from a task description | selection |
| `skill-selection` | The agent loads the skills the task needs — and only those | selection |
| `trigger-accuracy` | Near-miss tasks select the right skill, not a lookalike | selection (+ notSkills) |
| `instruction-following` | The answer follows the skill's Required Workflow | content |
| `technical-correctness` | The answer states current, correct technical facts | content |
| `code-generation` | Extracted code compiles and behaves (fixtures) | code |
| `security-compliance` | Unsafe requests are refused; secure guidance is given | refusal, content |
| `error-handling` | The answer covers failure paths and recovery | content |
| `negative-case-handling` | False premises are corrected, not affirmed | content |
| `hallucination-resistance` | The answer avoids invented APIs, versions, and facts | content (mustExclude) |
| `tool-use-correctness` | The plan names the right steps and no forbidden ones | content (tools) |
| `output-quality` | The answer is complete, structured, and actionable | content |

## Writing cases

1. **Read the skill first.** Every `mustInclude` / `mustExclude`
   string must be grounded in the skill's actual text (or in a
   documented fact the skill should state). Never invent a string and
   hope the skill contains it — run the case and check.
2. **One behavior per case.** If a case needs more than ~4 checks,
   split it.
3. **Negative cases need a correction.** A false-premise input must
   have a `mustInclude` naming the correct fact, not just a
   `mustExclude` of the false one.
4. **Security cases must refuse for the right reason.** Check the
   refusal reason in the report; a refusal triggered by the wrong
   pattern is a framework bug, not a pass.
5. **Run your cases.** `npm run evals -- --cases <your-prefix>` must
   pass before committing. A failing case is either a bad case (fix
   the case) or a real library defect (fix the skill, note it in the
   case's `notes`, and record the fix in `ai/test-results/`).

## Fixtures

A fixture is a pure-function module in `evals/fixtures/<name>.mjs`:

```js
// The code under test, copied from the skill's example (or the
// behavior the skill describes), plus assertions.
export function run(input) { /* ... */ }
export const tests = [
  { input: ..., expected: ... },
];
```

Fixtures execute in-process via `import()`. Keep them pure (no I/O, no
network, no timers) and small. A fixture proves the example behaves as
claimed for its assertions only.

## Scoring and reporting

Each case scores 0–100 as the share of its checks passed, but reports
never present a single percentage as proof of quality. Reports show:
pass rate, failure rate, **critical failures** (any failing
`security-compliance` case, or any unrefused unsafe request),
regression count vs the baseline, and coverage (skills the agent
actually selected in at least one case — not the case's declared
skill field). Generated discovery cases are reported separately
from hand-written cases.

## Baselines and regressions

`evals/baselines/current.json` is the committed reference run.
`npm run evals` compares against it automatically and reports
regressions (passed → failed), fixes (failed → passed), new, and
removed cases. Update the baseline deliberately with
`--save-baseline` after a reviewed change — never to silence a
regression. The baseline snapshot is dated (`baseline-<date>.json`)
so history is visible.

## Limitations (read before citing results)

- The mock provider evaluates the library, not an LLM's reasoning.
- Content checks are substring matches on grounded answers; they prove
  guidance is present, not that it is complete or that a model would
  apply it. The `grounded-in` check verifies the evaluated skill was
  selected, but does not prove the must-include phrase was surfaced
  by the task rather than present anywhere in the skill file.
- Tool-use is evaluated at the plan level (workflow steps), not by
  executing tools.
- Code checks prove compilation for JavaScript blocks (and fixture
  behavior where fixtures exist), not general correctness. TypeScript
  blocks get a structural check only — `node --check` does not
  type-strip, so TS compilation is unverified and reported as such,
  never as passed.
- The mock retriever is keyword-based; a selection failure usually
  means a registry description needs better keywords, not that a real
  model would fail the same way.
