# Decision: deterministic mock agent as the default eval provider

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 6)
- **Context:** The mission requires a behavioral evaluation system that
  tests whether an AI agent can correctly use each skill, with no paid
  LLM APIs and no API keys for basic validation. A behavioral eval needs
  an agent under test; without an LLM, that agent must be simulated.

## Options considered

1. **LLM-only evaluation (rejected).** Requires API keys and paid calls
   for every run, fails the mission's no-keys requirement, and is
   non-deterministic (results vary run to run, so baselines and
   regressions are meaningless).
2. **Pure static checks rebranded as evals (rejected).** Checking that
   a skill file contains a string is what the validators already do.
   It tests nothing about agent behavior and would mislabel the suite.
3. **Deterministic mock agent implementing AGENTS.md discovery rules
   (chosen).** The mock agent performs the observable behavior the
   library is designed for: it searches the registry for a task,
   selects skills, loads their SKILL.md bodies, grounds its answer in
   the loaded text, and refuses inputs matching unsafe patterns. Cases
   assert on that behavior (which skills were selected, which facts
   the grounded answer contains or omits, whether unsafe input was
   refused, whether extracted code is syntactically valid and passes
   fixture assertions).

## Decision

Option 3, with an honest scope statement carried in `evals/README.md`
and in every report: the mock agent evaluates the LIBRARY — skill
discoverability, trigger discrimination, content completeness, and
safety-relevant guidance — not an LLM's reasoning ability. A real
model can behave differently from the mock; the mock suite is a
regression net for the library, not a proof that any particular model
will use the skills correctly.

Model-based evaluation is supported through a provider interface
(`evals/runners/providers.mjs`): an OpenAI-compatible provider driven
by `EVAL_PROVIDER_URL` / `EVAL_PROVIDER_KEY` / `EVAL_PROVIDER_MODEL`.
It is optional, never required for `npm run evals`, and is recorded as
untested-without-credentials until someone runs it with a real
endpoint. The mock provider is always the default.

## Scoring consequences

- Selection cases score recall/precision against expected skill sets
  plus hard failure on forbidden (distractor) skills. The mock
  retriever is IDF-weighted keyword overlap over registry
  name+description, deterministic (score, then name) — so a selection
  failure is a statement about the registry descriptions, and fixing
  it means improving a description, not tuning the mock.
- Content cases score must-include / must-exclude substrings in the
  grounded answer. The mock grounds only in loaded skill text, so a
  content failure means the skill does not contain the guidance.
- Code cases syntax-check extracted code and execute pure-function
  fixtures in `node:vm`. They do not claim the code is correct beyond
  the fixture assertions.
- Reports never present a single percentage as proof of quality: they
  report pass rate, failure rate, critical failures, regression count,
  and coverage per category, plus limitations.
