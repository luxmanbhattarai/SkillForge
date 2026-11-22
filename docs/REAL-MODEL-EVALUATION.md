# Real-Model Evaluation Plan

> **Status: NOT EXECUTED — BLOCKED ON QUOTA.** No real-model
> evaluation has completed for SkillForge. The credential blocker
> is lifted — the owner connected a Gemini API key (custom.gemini
> connector, Secure Vault) and approved it for this evaluation —
> and the runner (`evals/run-real-model.mjs`) plus the Gemini
> adapter (`evals/providers/gemini.mjs`) are built and tested.
> The run itself is blocked: the key is on the **free tier (20
> requests/day)**, the quota was already exhausted when the smoke
> test ran (2026-11-22 ~01:58 UTC, 0/3 cases, all HTTP 429), and
> it resets at midnight Pacific Time (~08:00 UTC). The run may
> proceed as a multi-day run (20/day, resuming from the
> checkpoint each day) or on a paid tier — an owner/coordinator
> decision. Nothing in this document is a result — it is a plan
> for running one. **Do not claim any real-model validation until
> a run has actually happened and its report is on file.** The
> run record lives in
> `ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md` (Group B,
> Phase 4) — that report is the source of truth for run state;
> this document is the plan.

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

### The Gemini adapter (current run path)

`evals/providers/gemini.mjs` is the adapter for the approved
evaluation. It shells out per completion to the
`custom.gemini` connector helper
(`~/workspace/custom-connectors/custom.gemini/bin/gemini_chat.py`),
which authenticates via the Secure Vault surrogate — the adapter
takes no API key and nothing in the run path touches a raw key.
Model `gemini-3.5-flash`, max tokens `2048` by default (the
minimum that avoids empty content from this thinking model).
The model was verified live (2026-11-22 probe): a completion
via the helper returned model `gemini-3.5-flash` with finish
`stop`. (Switched from `gemini-3.8-flash` the same day per owner
instruction — 3.5-flash has the higher per-minute limit on the
same 20 req/day free-tier quota; the 3.8-flash verification and
its quota exhaustion are recorded in
`ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md`.) It
retries a 429 exactly once internally, reports auth failures as
"credential rejected (HTTP 401/403)" and a missing model as
"model unavailable (HTTP 404)". The dedicated runner is
`evals/run-real-model.mjs` (see [How to run it](#how-to-run-it)):
it resolves providers through
`evals/lib/provider-registry.mjs` (`--provider gemini` is the
default), checkpoints after every case, and resumes with
`--resume`. Provider resolution, checkpointing, the eight
aggregate dimensions, and failure classification are documented
in `ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md` §4.1.

### Retrieval (candidate skills)

Since Day 2 of the multi-day run (2026-11-22, owner decision), the
runner gives the model a candidate skill list with each case. Day 1
ran without one and the model invented plausible skill names
(`seo-content-strategy`, `node-js`, `k6`) instead of selecting from
the library — skill selection was 1/7 (14.3%). Retrieval is the
fix: for each case, the runner ranks the registry with the mock
agent's own IDF-weighted keyword retriever (`MockAgent.rank`, over
skill name + description) and appends the top 10 candidates
(name + description) to the user message; the system prompt tells
the model to select ONLY from that list (or return an empty list
if none apply). Retrieval uses ONLY the case input — never the
case's expected skill, which would leak the answer.

Measured baseline (2026-11-22, before Day 2): the expected skill is
in the top 10 for 44/44 (100%) of the subset cases that have
expected skills, and in the top 5 for 44/44 as well — so from Day 2
on, a selection failure is a model failure (the right skill was
listed and not picked), not a retrieval failure. Each result records
its `retrievedSkills` (names only) for that diagnosis, and the
report records the retrieval settings under `retrieval`
(`enabled`, `topK`, `method`). `--no-retrieval` runs the Day 1
condition for comparison. Day 1 and Days 2–5 are different
conditions and must be reported separately — see the Phase 4
report §9.

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

`evals/datasets/real-model-subset-v2.json` — **89 cases**, selected by a
fixed rule so the subset is reproducible and reviewable. It supersedes
the v1 subset (`evals/datasets/real-model-subset.json`, 75 cases,
2026-11-20), which predates the `DIS-real-*` cases:

| Slice | Cases | Rationale |
| --- | --- | --- |
| All hand-written `security-compliance` | 25 | Refusal behavior is the highest-stakes thing a real model can get wrong, and the mock's refusal is pattern-based, not reasoned. Every one of these must hold on a real model. |
| All hand-written `code-generation` | 12 | Tests whether the model writes compilable code when asked, rather than the mock's extraction of the skill's own examples. |
| First 2 hand-written cases (sorted by id) from each of the other 10 categories | 20 | Stratified coverage of selection, discovery, trigger accuracy, instruction following, technical correctness, error handling, negative cases, hallucination resistance, tool use, and output quality. |
| One generated discovery case per registry category (alphabetically-first skill) | 18 | Checks real-model discoverability across all 18 skill categories without running all 277 generated cases. |
| All 14 non-circular discovery cases (`DIS-real-*`) from `evals/cases/discovery-realistic.json` | 14 | Added in Stage C after v1 was frozen; realistic prompts that do not quote registry text, so they are the strongest discovery signal for a real model. |

Category breakdown (verified against the case files): skill-discovery
34 (16 hand-written + 18 generated), security-compliance 25,
code-generation 12, and 2 each from skill-selection,
trigger-accuracy, instruction-following, technical-correctness,
error-handling, negative-case-handling, hallucination-resistance,
tool-use-correctness, and output-quality. All 89 ids resolve to
real cases (71 hand-written in `evals/cases/*.json`, 18 generated
in `evals/datasets/discovery-generated.json`); 0 malformed.

The subset passes 89/89 on the mock provider (verified 2026-11-22),
so it is a valid reference point: any real-model failure on it is a
model-behavior signal, not a broken case.

```bash
# Sanity check on the mock (no credentials needed)
npm run evals -- --cases-file evals/datasets/real-model-subset-v2.json --out /tmp/rme-mock-check

# The real-model run (Gemini; background process, ~4-5 hours)
node evals/run-real-model.mjs \
  --archive ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json
```

### The full suite (optional, after the subset looks sane)

```bash
npm run evals -- --provider model
```

463 cases, sequential. Only worth it once the subset run shows the
provider integration works and the failure modes are understood.

## How to run it

### Gemini (current run path)

No environment variables are needed — the helper authenticates
via the Secure Vault surrogate. Model and max tokens default to
`gemini-3.5-flash` / `2048`. **Never paste the raw key into the
environment** — the approved credential lives in the Secure Vault
and is used only through the helper-based adapter.

```bash
# 1. Sanity check (no credentials needed): the subset is valid on the mock.
npm run evals -- --cases-file evals/datasets/real-model-subset-v2.json --out /tmp/rme-mock-check
#    Expected: "Evals (mock): 89/89 passed (100.0%), 0 failed, 0 critical."

# 2. Smoke test (2-3 real Gemini calls — counts as verification, not eval).
#    Build a small dataset file with 2-3 case ids, then:
node evals/run-real-model.mjs --dataset /tmp/rme-smoke.json --out /tmp/rme-smoke-out
#    Expect: exit 0 or 1 with per-case results and a usage block. Any
#    401/403 aborts the run immediately — STOP and report it; do not retry.

# 3. The real-model run (89 cases), as a background process.
node evals/run-real-model.mjs \
  --archive ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json
#    Writes evals/reports/model/<run-id>/latest.json + latest.md, plus the
#    archive copy the dashboard worker consumes. Expected duration: ~4-5
#    hours at ~3 min/call. Progress on stderr ([N/89] ...); checkpoint at
#    <out>/checkpoint.json after each case. Do not parallelize.

# 4. If the run is interrupted, resume it (do not restart from scratch):
node evals/run-real-model.mjs --resume evals/reports/model/<run-id>/checkpoint.json \
  --archive ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json
#    Validates the checkpoint against the dataset/provider/model, skips
#    completed cases, keeps the run id, merges checkpointed token totals.
```

**Quota discipline (free tier, 20 requests/day, reset at midnight
Pacific Time / ~08:00 UTC):** every live call counts against the
same daily budget — verification calls, smoke tests, and stray
test runs all eat into it. On the free tier the 89-case run is a
multi-day run: 20 calls/day × 5 days, resuming from the
checkpoint each day after the reset. Do not launch the full run
while the quota is exhausted — it would only produce a
misleading 0/89 "result" from 178 pointless attempts (each case
retries a 429 once). A paid tier (owner decision) removes the
daily cap and the run proceeds in one ~4–5 h session. Limits
apply per Google Cloud project, not per API key — a second key
in the same project shares the same 20/day.

Notes:

- The runner is deliberately sequential (one request at a time) to
  stay inside provider rate limits. Do not parallelize it without a
  rate-limit strategy.
- A fresh 429 retries the case once after a 10 s backoff (the
  adapter also retries a 429 once internally; the runner does not
  retry an already-exhausted 429). A 401/403 or a model 404 aborts
  the run with no report — the checkpoint survives for resume after
  the cause is fixed.
- `--report-only` makes the run exit 0 even with failures (reporting
  mode). The default exit code is 1 when any case fails; 2 means a
  configuration/dataset/validation error or an aborted run.
- `--save-baseline` is **refused** for model runs: baselines are
  mock-only. A model run measures a model, not the library's
  regression state.
- There is no spend cap: the approved scope is the 89 eval calls
  plus the 2–3 case smoke test — no other paid calls.

### Other providers (generic OpenAI-compatible endpoint)

The legacy path uses `EVAL_PROVIDER_*` environment variables with
the generic `model` provider (`npm run evals -- --provider model`
or `node evals/run-real-model.mjs --provider model`):

```bash
export EVAL_PROVIDER_URL="https://api.openai.com/v1/chat/completions"
export EVAL_PROVIDER_KEY="<key>"              # never commit this; never paste it into a report
export EVAL_PROVIDER_MODEL="gpt-5-mini"
export EVAL_PROVIDER_PRICE_INPUT_PER_1K="0.003"   # optional; enables cost estimates
export EVAL_PROVIDER_PRICE_OUTPUT_PER_1K="0.015" # optional; use the provider's actual prices

npm run evals -- --provider model --cases-file evals/datasets/real-model-subset-v2.json
```

Use `--out <dir>` to put a run's reports somewhere other than the
default location, e.g. for per-model archives:
`--out evals/reports/model-gpt-5-mini-2026-11-20` (note:
`evals/reports/` is gitignored; copy a report you want to keep into
`ai/test-results/` with a dated name).

## Where results go, and how they stay separate

| Run | Report location | Baseline comparison |
| --- | --- | --- |
| Mock (default) | `evals/reports/latest.json` + `latest.md` | Yes, vs `evals/baselines/current.json` |
| Model (`run-real-model.mjs`) | `evals/reports/model/<run-id>/latest.json` + `latest.md`, plus `--archive` copy | **No** — model runs are never compared to the mock baseline |
| Model (`npm run evals -- --provider model`) | `evals/reports/model/latest.json` + `latest.md` | **No** — model runs are never compared to the mock baseline |
| Either, with `--out <dir>` | `<dir>/latest.json` + `latest.md` | Mock only; the comparison file lands in `<dir>/regression.json` |

The Gemini run's durable record is the `--archive` copy:
`ai/evaluations/runs/real-model-gemini-3.5-flash-<YYYY-MM-DD>.json`
(the file the benchmark-dashboard worker consumes). The run's
human-readable record is
`ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md` §9.

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
- **Subset (89 cases):** roughly 60k–130k tokens. At example prices
  of $3/1M input + $15/1M output, roughly **$0.60–$1.80**.
- **Full suite (463 cases):** roughly 300k–700k tokens, roughly
  **$3–$9** at the same example prices.
- **Time (generic provider):** the runner is sequential at ~2–6
  seconds per case (provider latency dominates). Subset: **~3–9
  minutes**. Full suite: **~20–45 minutes**, plus retry delays if
  the provider throttles.
- **Time (Gemini, measured):** the verified live call took ~164
  seconds for a tiny prompt — roughly **3 minutes per case**, so
  the 89-case run takes **~4–5 hours**. That is why the runner
  checkpoints after every case: an interruption loses at most the
  case in flight. On the free tier (20 requests/day) the run
  spans 5 days via checkpoint resume.
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
