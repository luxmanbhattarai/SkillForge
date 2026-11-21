# Real-Model Evaluation Plan

> **Status: NOT EXECUTED.** No real-model evaluation has been run for
> SkillForge. There are no API credentials in this environment, and no
> real-model run has ever been performed. Nothing in this document is
> a result — it is a plan for running one. **Do not claim any
> real-model validation until a run has actually happened and its
> report is on file.**

## Why this exists

The default eval provider is a deterministic mock agent
(`evals/runners/mock-agent.mjs`). It evaluates the **library** —
discoverability, trigger discrimination, content completeness, safety
guidance — not an LLM's reasoning. The mock's 463/463 says the library
is internally consistent and retrievable by keyword overlap. It says
nothing about whether a real model will select the right skills, ground
its answers in them, or refuse unsafe requests. This plan is how to
find out, for one model at a time, without mixing the answer into the
mock baseline.

## The provider layer

The model provider (`evals/runners/providers.mjs`) talks to any
OpenAI-compatible chat-completions endpoint. It is provider-independent
by design: OpenAI, Anthropic via a compatible proxy, Azure OpenAI,
Ollama, vLLM, or any local server that speaks the chat-completions
shape all work the same way. It sends temperature 0 and asks the model
to self-report, as JSON, the skills it would load, its grounded answer,
a refusal flag, a tool plan, and any code blocks.

No credentials are hardcoded. The key comes from the environment only,
is sent as a Bearer token, and is never logged or written into any
report. Provider metadata in reports carries the endpoint host (not
the full URL) and the model name.

### Configuration

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `EVAL_PROVIDER_URL` | yes | — | Chat-completions endpoint, e.g. `https://api.openai.com/v1/chat/completions` |
| `EVAL_PROVIDER_KEY` | yes | — | API key (Bearer token) |
| `EVAL_PROVIDER_MODEL` | yes | — | Model name, e.g. `gpt-5-mini` |
| `EVAL_PROVIDER_TIMEOUT_MS` | no | `60000` | Per-attempt request timeout |
| `EVAL_PROVIDER_MAX_RETRIES` | no | `2` | Retries after a retryable failure (429, 5xx, timeout, network error); `0` disables retries |
| `EVAL_PROVIDER_RETRY_DELAY_MS` | no | `1000` | Base retry delay; doubles per attempt, capped at 30s |
| `EVAL_PROVIDER_MAX_TOKENS` | no | — | `max_tokens` sent per request |
| `EVAL_PROVIDER_PRICE_INPUT_PER_1K` | no | — | USD per 1k input tokens (enables cost estimates) |
| `EVAL_PROVIDER_PRICE_OUTPUT_PER_1K` | no | — | USD per 1k output tokens (enables cost estimates) |

Missing or invalid configuration fails fast with exit code 2 and a
message naming the variable. The standard suite (`npm test`,
`npm run evals`) never needs any of this: the mock provider is the
default, and model runs are opt-in via `--provider model`.

Retries apply only to retryable failures. A 4xx other than 429, a
non-JSON response, or non-JSON model output fails the case immediately
— retrying those would only burn budget. A case whose provider calls
all fail is recorded as a failed case with `provider error: …` as the
failure reason, not silently skipped.

## What to run

### The representative subset (recommended first run)

`evals/datasets/real-model-subset.json` — **75 cases**, selected by a
fixed rule so the subset is reproducible and reviewable:

| Slice | Cases | Rationale |
| --- | --- | --- |
| All hand-written `security-compliance` | 25 | Refusal behavior is the highest-stakes thing a real model can get wrong, and the mock's refusal is pattern-based, not reasoned. Every one of these must hold on a real model. |
| All hand-written `code-generation` | 12 | Tests whether the model writes compilable code when asked, rather than the mock's extraction of the skill's own examples. |
| First 2 hand-written cases (sorted by id) from each of the other 10 categories | 20 | Stratified coverage of selection, discovery, trigger accuracy, instruction following, technical correctness, error handling, negative cases, hallucination resistance, tool use, and output quality. |
| One generated discovery case per registry category (alphabetically-first skill) | 18 | Checks real-model discoverability across all 18 skill categories without running all 277 generated cases. |

The subset passes 75/75 on the mock provider (verified 2026-11-20),
so it is a valid reference point: any real-model failure on it is a
model-behavior signal, not a broken case.

```bash
npm run evals -- --provider model --cases-file evals/datasets/real-model-subset.json
```

### The full suite (optional, after the subset looks sane)

```bash
npm run evals -- --provider model
```

463 cases, sequential. Only worth it once the subset run shows the
provider integration works and the failure modes are understood.

## How to run it

```bash
export EVAL_PROVIDER_URL="https://api.openai.com/v1/chat/completions"
export EVAL_PROVIDER_KEY="<key>"              # never commit this; never paste it into a report
export EVAL_PROVIDER_MODEL="gpt-5-mini"
export EVAL_PROVIDER_PRICE_INPUT_PER_1K="0.003"   # optional; enables cost estimates
export EVAL_PROVIDER_PRICE_OUTPUT_PER_1K="0.015" # optional; use the provider's actual prices

npm run evals -- --provider model --cases-file evals/datasets/real-model-subset.json
```

Notes:

- The runner is deliberately sequential (one request at a time) to
  stay inside provider rate limits. Do not parallelize it without a
  rate-limit strategy.
- Use `--out <dir>` to put a run's reports somewhere other than the
  default location, e.g. for per-model archives:
  `--out evals/reports/model-gpt-5-mini-2026-11-20` (note:
  `evals/reports/` is gitignored; copy a report you want to keep into
  `ai/test-results/` with a dated name).
- `--report-only` makes the run exit 0 even with failures (reporting
  mode). The default exit code is 1 when any case fails.
- `--save-baseline` is **refused** for model runs: baselines are
  mock-only. A model run measures a model, not the library's
  regression state.

## Where results go, and how they stay separate

| Run | Report location | Baseline comparison |
| --- | --- | --- |
| Mock (default) | `evals/reports/latest.json` + `latest.md` | Yes, vs `evals/baselines/current.json` |
| Model | `evals/reports/model/latest.json` + `latest.md` | **No** — model runs are never compared to the mock baseline |
| Either, with `--out <dir>` | `<dir>/latest.json` + `latest.md` | Mock only; the comparison file lands in `<dir>/regression.json` |

Model reports carry `providerKind: "model"`, `providerMeta`
(kind, model, endpoint host, timeout, retries), and a `usage` block
(requests, attempts, retries, errors, token counts, estimated cost
when prices are configured). Per-case token usage is recorded on each
result when the provider reports it. The Markdown report is headed
**REAL-MODEL RUN** with an explicit non-comparability banner.

## How to interpret results vs the mock baseline

- **Compare per category, not as a single percentage.** The interesting
  questions are: does the model refuse what the mock refuses
  (security-compliance)? Does it select the same skills (selection /
  trigger-accuracy)? Does it ground answers in skill text (content
  categories)? A model can score lower than the mock on selection and
  still be fine — the mock is keyword overlap, the model reasons.
  A model scoring lower on **refusal** is a real problem.
- **Selection differences are expected.** The mock selects by
  description keywords; a model may select a better skill the mock
  missed, or miss one the mock found. Read the failures: a "missing
  skill" failure where the model selected a reasonable alternative is
  a case-design signal, not necessarily a model failure.
- **Content failures need reading, not counting.** The model answers in
  its own words; a `mustInclude` substring miss can mean the model
  paraphrased correct guidance (fine) or omitted it (a gap). The
  `grounded-in` check (the evaluated skill must be among the selected
  skills) is the stronger signal: if the model answers well without
  selecting the skill, the guidance may be coming from its own
  weights, not the library.
- **Code failures are concrete.** A `code-block-N-compiles` failure
  means the model wrote code that does not compile — unambiguous.
  Fixture failures are provider-independent (fixtures execute the
  skill's example, not model output), so they should match the mock
  run exactly; if they don't, something is wrong with the run, not
  the model.
- **Provider errors are not model failures.** Cases failing with
  `provider error: …` (timeouts, 5xx, non-JSON output) say the run
  had infrastructure trouble. Re-run before drawing conclusions; if
  non-JSON output recurs, the model is not following the response
  format and the prompt or model choice needs work.
- **Never present model results as library results.** The mock
  baseline is the library's regression reference. A model run is
  evidence about one model, on one day, at temperature 0 — providers
  are not perfectly deterministic, so re-runs may differ slightly.

## Cost and time expectations

Estimates only — actuals depend on the provider, the model, and the
length of its answers. The report's `usage` block is the source of
truth for a completed run; these numbers are for planning.

- **Per case:** roughly 700–1,500 tokens total (system prompt
  ~200 tokens, short user input, a few hundred tokens of JSON output).
- **Subset (75 cases):** roughly 50k–110k tokens. At example prices
  of $3/1M input + $15/1M output, roughly **$0.50–$1.50**.
- **Full suite (463 cases):** roughly 300k–700k tokens, roughly
  **$3–$9** at the same example prices.
- **Time:** the runner is sequential at ~2–6 seconds per case
  (provider latency dominates). Subset: **~3–8 minutes**. Full suite:
  **~20–45 minutes**, plus retry delays if the provider throttles.
- **Budget guard:** there is no built-in spend cap. Start with the
  subset, check the `usage` block, and scale to the full suite only
  with the cost-per-case in hand. Set `EVAL_PROVIDER_MAX_TOKENS` to
  bound output length if the model rambles.

## After a run: what counts as "validated"

A real-model validation claim needs, at minimum:

1. The subset run (or full run) report on file — model name, date,
   provider, pass/fail per category, usage/cost — saved under
   `ai/test-results/` (the `evals/reports/model/` copy is gitignored
   and will be overwritten by the next model run).
2. Every failure read and classified: model gap, case-design issue,
   or provider/infrastructure error — not just counted.
3. The explicit scope statement: which model, which date, which cases.
   A result for one model says nothing about another.

Until those exist, the honest statement is: **real-model validation
has not been executed.**

## Limitations of the model-provider layer itself

- The model self-reports its skill selection as JSON. A model can
  select a skill and fail to report it, or report one it would not
  actually load. Selection scores measure reported selection.
- The model never sees the skill files — it answers from its own
  knowledge plus the task prompt. A "grounded" answer from a model run
  is therefore weaker evidence than the mock's text-grounded answer:
  the model may reproduce correct guidance from its weights. The
  `grounded-in` check only verifies the skill was named, not that its
  text was used. True grounded-model evaluation (retrieval-augmented,
  with skill text in the prompt) is future work, not this layer.
- Code evaluation checks what the model writes, not what it would do
  with tools. Tool-use is evaluated at the plan level only.
- Temperature is fixed at 0. Sampling behavior at higher temperatures
  is out of scope.
