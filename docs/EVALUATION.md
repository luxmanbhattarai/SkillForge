# Evaluation

Static validation (`npm run validate`, `npm run score`) checks that
skill files are well-formed. It cannot say whether an agent will
**use** the skills correctly. The behavioral evaluation suite in
`evals/` is that layer: it runs an agent against task prompts and
scores what the agent actually does.

**The canonical guide is [`evals/README.md`](../evals/README.md).**
This page summarizes it; if the two disagree, `evals/README.md` wins.

## Honest scope

The default provider is a **deterministic mock agent** (no network, no
API keys, no LLM). It implements the `AGENTS.md` discovery rules:
registry search → skill selection → load `SKILL.md` → ground the
answer in the loaded text → refuse unsafe input. It evaluates the
**library** — discoverability, trigger discrimination, content
completeness, and safety guidance — not an LLM's reasoning ability.
A real model can behave differently from the mock; this suite is a
regression net for the library, not proof that any particular model
will use the skills correctly.

Model-based evaluation is supported through a provider interface
(`evals/runners/providers.mjs`): an OpenAI-compatible endpoint
configured via `EVAL_PROVIDER_URL`, `EVAL_PROVIDER_KEY`, and
`EVAL_PROVIDER_MODEL`. It is optional, never required for
`npm run evals`, and untested without credentials.

## The suite

449 cases, all passing (verified 2026-11-20):

| Cases | Count | What they test |
| --- | --- | --- |
| Hand-written (`evals/cases/`) | 172 | Skill selection, content grounding, refusal of unsafe requests, code generation — 12 categories, 4 scorers |
| Generated discovery (`evals/datasets/discovery-generated.json`) | 277 | One discovery case per skill in the registry |

277/277 skills are covered. Results go to `evals/reports/latest.json`
and `latest.md`; when a baseline exists, the runner also writes a
regression comparison to `evals/regression/latest.json`.

## Running

```bash
npm run evals                        # full suite, mock provider, exit 1 on failure
npm run evals -- --cases nextjs      # only cases matching "nextjs" (id, category, or skill)
npm run evals -- --report-only       # always exit 0 (reporting mode)
npm run evals -- --provider model    # model provider (needs EVAL_PROVIDER_* env vars)
npm run evals -- --save-baseline     # save this run as the new baseline
npm run evals:generate               # regenerate the generated discovery cases
```

The runner validates every case before running (unknown category,
unknown skill name, duplicate id, missing fixture all fail fast with
exit code 2).

## When to run it

- After adding or changing a skill: regenerate discovery cases
  (`npm run evals:generate`) and run the suite. The mock agent's
  selection behavior is sensitive to frontmatter descriptions, so a
  description change can move cases.
- After changing the registry, agents, or workflows: discovery and
  selection cases depend on them.
- CI runs the full suite on every PR (mock provider, deterministic).

## Adding cases

Hand-written cases are JSON in `evals/cases/`, grouped by theme.
Follow the case schema in `evals/README.md` and ground every
expectation in actual skill text — cases assert on what the library
says, not on what you wish it said. New skills normally need no
hand-written case: the generated discovery case covers them. Add one
when the skill needs selection discrimination (easily confused with
another skill), refusal behavior, or code-generation checks.
