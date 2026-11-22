# Multi-Model Evaluation

> **Status: infrastructure ready; one provider verified live.**
> The Gemini adapter is implemented and verified end-to-end with one
> live call (see "Verification" below). No other provider is
> configured and no other paid call has been made. The 89-case
> real-model run belongs to the Phase 4 worker.

## Why

The default eval provider is a deterministic mock agent
(`evals/runners/mock-agent.mjs`). It evaluates the **library** —
discoverability, trigger discrimination, content completeness, safety
guidance — not an LLM's reasoning. The mock's 463/463 says the library
is internally consistent and retrievable by keyword overlap. It says
nothing about whether a real model will select the right skills,
ground its answers in them, or refuse unsafe requests.

The legacy model provider (`evals/runners/providers.mjs`,
`EVAL_PROVIDER_*`) already talks to one OpenAI-compatible endpoint.
This layer adds provider-independent infrastructure around it: one
interface, one adapter per provider, and a registry that resolves a
provider name to its adapter and reports which providers are
configured. A comparison run across providers then measures the
models, not different harnesses — every adapter sends the same
system prompt, the same temperature (0), the same case input, and
returns the same observation shape to the same scorers.

## Architecture

```text
evals/runners/run-evals.mjs          runner + scorers (provider-independent)
evals/runners/providers.mjs          provider interface + mock + legacy generic model provider
evals/lib/provider-registry.mjs      resolves a name to an adapter; reports configured vs not
evals/providers/shared.mjs           retry/timeout/usage/JSON helpers shared by all adapters
evals/providers/openai.mjs           OpenAI chat-completions adapter
evals/providers/anthropic.mjs        Anthropic Messages API adapter
evals/providers/gemini.mjs           Google Gemini API adapter
evals/providers/local.mjs            OpenAI-compatible local inference adapter
```

### The provider interface

Every provider — mock, legacy model, and each adapter — is an object:

```js
{
  name: 'openai:gpt-5-mini',        // "<provider>:<exact model id>"
  meta: { kind: 'model', provider: 'openai', model: 'gpt-5-mini',
          endpoint: 'api.openai.com', timeoutMs: 60000, maxRetries: 2 },
  getUsage() { /* { requests, attempts, retries, errors,
                  promptTokens, completionTokens, totalTokens,
                  estimatedCostUsd } or null */ },
  async run(evalCase) { /* → observation */ },
}
```

`run()` returns the normalized observation, identical regardless of
provider:

```js
{
  selectedSkills: ['skill-name', ...],
  answer: 'grounded answer',
  refused: false,
  refusalReason: null,
  tools: ['step 1', ...],
  code: ['complete code block', ...],
  usage: { promptTokens, completionTokens, totalTokens } // only when reported
}
```

`meta` carries the endpoint **host** (never the full URL — it could
contain query parameters) and the exact model id. It never carries a
credential. `getUsage()` returns `null` for the mock provider.

### Adapters

Each adapter owns only what is provider-specific: endpoint, auth
scheme, request shape, and response parsing. Everything shared —
retries, timeouts, Retry-After handling, JSON extraction, observation
normalization, usage accounting — lives in
`evals/providers/shared.mjs` with semantics that mirror
`evals/runners/providers.mjs` deliberately (same defaults, same
backoff cap), so a comparison run measures the models, not different
retry behavior.

| Provider | Endpoint | Auth | Response shape |
| --- | --- | --- | --- |
| OpenAI | `{OPENAI_BASE_URL}/chat/completions` | `Authorization: Bearer` | `choices[0].message.content`, `usage.prompt_tokens` / `completion_tokens` |
| Anthropic | `{ANTHROPIC_BASE_URL}/v1/messages` | `x-api-key` + `anthropic-version` | `content[]` text blocks, `usage.input_tokens` / `output_tokens` |
| Gemini | via `gemini_chat.py` (see below) | Secure Vault credential, handled by the helper | OpenAI-compatible response JSON from the helper |
| Local | `EVAL_LOCAL_URL` as given | `Bearer` only when `EVAL_LOCAL_API_KEY` is set | OpenAI-compatible |

Notes:

- **Gemini is different from the other adapters by design.** It
  makes no HTTP call and takes no API key: it shells out to the
  `custom.gemini` connector helper
  (`~/workspace/custom-connectors/custom.gemini/bin/gemini_chat.py`),
  which sends one chat completion per invocation through the stored
  Secure Vault credential (surrogate exchange — the real key never
  appears in the adapter's arguments, environment, or logs). The
  eval harness's `EVAL_PROVIDER_URL`/`KEY`/`MODEL` path cannot take
  this credential; do not try to route Gemini through it. See
  `~/workspace/custom-connectors/custom.gemini/CONNECTOR.md`.
- **Gemini model is `gemini-3.5-flash` only.**
  `gemini-2.5-flash` returns HTTP 404 for this key. A `GEMINI_MODEL`
  set to anything else is a configuration error. (Switched from
  `gemini-3.8-flash` on 2026-11-22 per owner instruction — 3.5-flash
  has the higher per-minute limit on the same 20 req/day free-tier
  quota; probe verified the same day.)
- **Gemini timeout defaults to 300s**, not the 60s the other
  adapters use: `gemini-3.5-flash` reasons internally before
  replying (the 3.5-flash probe used 327 total tokens for a
  1-token visible reply). The first 3.8-flash verification call
  timed out at 60s; the second took ~164s for a tiny prompt.
  Budget ~3 minutes per eval case when planning a run (~4–5 hours
  for the 89-case subset).
- **Gemini empty-content quirk (verified):** a small `max_tokens`
  budget ends with `finish_reason=length` and empty content. The
  adapter defaults to `max_tokens` 2048 and records an empty reply
  as an empty response with its finish reason — never a crash,
  never a retry loop. `getUsage().emptyResponses` counts them.
- **Gemini usage totals include reasoning tokens:** the
  verification call reported prompt 193 + completion 157 but total
  1807. The adapter records the provider's `total_tokens` as
  reported; do not expect it to equal prompt + completion for this
  thinking model.
- Anthropic's `max_tokens` is required by its API and defaults to
  1024 when `ANTHROPIC_MAX_TOKENS` is unset.
- The local adapter has no default URL and no default model: the
  endpoint is whatever the user runs. No key is required; when
  `EVAL_LOCAL_API_KEY` is unset, no `Authorization` header is sent
  at all. Local inference has no per-token price, so
  `estimatedCostUsd` stays `null` (token counts are still tracked
  when the server reports them).

### Registry

`evals/lib/provider-registry.mjs` is the single resolution point:

- `resolveProvider(name, env?, fetchImpl?)` — async; returns the
  provider object for `name`. Throws for an unknown name (listing
  the known providers: `mock`, `model`, `openai`, `anthropic`,
  `gemini`, `local`) or for a known-but-unconfigured provider
  (naming the missing variables). It never falls back to another
  provider: a request for a model that is not configured fails
  loudly instead of silently running the mock.
- `listProviders(env?)` — status of every known provider:
  configured vs unconfigured, with missing variables named. Safe to
  print: no values, no keys.
- `getProviderSpec(name)` — the spec object, or `null` when unknown.

`mock` and the legacy `model` provider delegate to
`evals/runners/providers.mjs`; they are not re-implemented. Prefer
the named adapters for new runs — `model` exists for backward
compatibility with `docs/REAL-MODEL-EVALUATION.md`.

## Per-provider configuration

All configuration is environment variables only. No credential is
hardcoded anywhere, and no adapter logs or persists a key. A missing
required variable fails fast with an error naming the variable;
unconfigured providers report cleanly as unavailable and are never
required.

### OpenAI

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | yes | — | API key (Bearer token) |
| `OPENAI_MODEL` | yes | — | Model id, e.g. `gpt-5-mini` |
| `OPENAI_BASE_URL` | no | `https://api.openai.com/v1` | Base URL; any OpenAI-compatible endpoint |
| `OPENAI_TIMEOUT_MS` | no | `60000` | Per-attempt request timeout |
| `OPENAI_MAX_RETRIES` | no | `2` | Retries after a retryable failure; `0` disables |
| `OPENAI_RETRY_DELAY_MS` | no | `1000` | Base retry delay; doubles per attempt, capped at 30s |
| `OPENAI_MAX_TOKENS` | no | — | `max_tokens` sent per request |
| `OPENAI_PRICE_INPUT_PER_1K` | no | — | USD per 1k input tokens (enables cost estimates) |
| `OPENAI_PRICE_OUTPUT_PER_1K` | no | — | USD per 1k output tokens (enables cost estimates) |

### Anthropic

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | — | API key (`x-api-key` header) |
| `ANTHROPIC_MODEL` | yes | — | Model id, e.g. `claude-sonnet-4-5` |
| `ANTHROPIC_BASE_URL` | no | `https://api.anthropic.com` | Base URL |
| `ANTHROPIC_VERSION` | no | `2023-06-01` | `anthropic-version` header |
| `ANTHROPIC_TIMEOUT_MS` | no | `60000` | Per-attempt request timeout |
| `ANTHROPIC_MAX_RETRIES` | no | `2` | Retries after a retryable failure; `0` disables |
| `ANTHROPIC_RETRY_DELAY_MS` | no | `1000` | Base retry delay; doubles per attempt, capped at 30s |
| `ANTHROPIC_MAX_TOKENS` | no | `1024` | `max_tokens` sent per request (required by the API) |
| `ANTHROPIC_PRICE_INPUT_PER_1K` | no | — | USD per 1k input tokens |
| `ANTHROPIC_PRICE_OUTPUT_PER_1K` | no | — | USD per 1k output tokens |

### Gemini (connector helper — no key, no direct HTTP)

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `GEMINI_HELPER_PATH` | no | `~/workspace/custom-connectors/custom.gemini/bin/gemini_chat.py` | Path to the connector helper |
| `GEMINI_PYTHON` | no | `python3` | Python executable for the helper |
| `GEMINI_MODEL` | no | `gemini-3.5-flash` | Must be unset or `gemini-3.5-flash`; anything else is an error |
| `GEMINI_TIMEOUT_MS` | no | `300000` | Per-attempt timeout (child killed on fire); 300s for this thinking model |
| `GEMINI_MAX_TOKENS` | no | `2048` | `max_tokens` per call (eval cases use 2048) |
| `GEMINI_RETRY_DELAY_MS` | no | `5000` | Pause before the single 429 retry |

"Configured" for Gemini means the helper exists on disk — there is
no key to check. The adapter spawns
`python3 <helper> --model gemini-3.5-flash --max-tokens 2048
--temperature 0 --timeout <seconds>` and feeds the messages array
on stdin. The helper prints the raw OpenAI-compatible response
JSON; the adapter reads `choices[0].message.content`,
`choices[0].finish_reason`, `model` (exact served id), and `usage`.

Gemini retry policy differs from the HTTP adapters (per the
connector doc): **429 → back off and retry once**; **401/403 →
stop immediately, do not retry, report to the coordinator**;
timeouts and other failures are never retried (a completion may
have been billed even when the response was lost). The exact served
model id is recorded per case (`observation.model`) and aggregated
in `getUsage().servedModels`; `getUsage().emptyResponses` counts
empty replies.

### Local (OpenAI-compatible)

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `EVAL_LOCAL_URL` | yes | — | Full chat-completions endpoint, e.g. `http://localhost:11434/v1/chat/completions` |
| `EVAL_LOCAL_MODEL` | yes | — | Model id the server should run |
| `EVAL_LOCAL_API_KEY` | no | — | Bearer token, when the server wants one |
| `EVAL_LOCAL_TIMEOUT_MS` | no | `60000` | Per-attempt request timeout |
| `EVAL_LOCAL_MAX_RETRIES` | no | `2` | Retries after a retryable failure; `0` disables |
| `EVAL_LOCAL_RETRY_DELAY_MS` | no | `1000` | Base retry delay; doubles per attempt, capped at 30s |
| `EVAL_LOCAL_MAX_TOKENS` | no | — | `max_tokens` sent per request |

### Plaintext warning

When an adapter is about to send a key over plaintext `http://` to
a non-localhost host, it warns loudly on stderr (a typo'd URL, or a
provider without TLS). `http://localhost` stays silent — local-LLM
users legitimately run plaintext with no network exposure. This is a
warning, not a refusal: a local server on a LAN hostname is the
user's call. The local adapter warns only when a key is actually
configured; with no key there is nothing to intercept.

## Output format

Adapter runs produce the same report shape as any other model run
(see `evals/runners/run-evals.mjs`): `generated`, `provider`
(`openai:gpt-5-mini`), `providerKind: "model"`, `providerMeta`,
`usage`, `summary`, `comparison` (always `null` for model runs —
baselines are mock-only), and per-case `results`. Model reports live
in `evals/reports/model/` (or `--out <dir>`), never mixed into the
mock report or the mock baseline. A model run and a mock run answer
different questions; comparing them as regressions would be
meaningless.

## Cost tracking

Each adapter tracks per-case token counts when the endpoint reports
usage, and aggregates them in `getUsage()`: requests, attempts,
retries, errors, prompt/completion/total tokens. When both the input
and output prices are configured for a provider, `getUsage()` also
reports `estimatedCostUsd` (rounded to 6 decimals). When either
price is missing, the estimate is `null` — a cost estimate from a
single price would be wrong, not approximate. The local adapter
never estimates a cost.

Prices are user-supplied configuration, not looked up anywhere: set
them from the provider's current pricing page before a run, and
record which prices were used alongside the results.

## Retry and rate-limit policy

For the HTTP adapters (OpenAI, Anthropic, local — see
`evals/providers/shared.mjs`):

- Retried: HTTP 429, HTTP 5xx (including Anthropic 529
  "overloaded"), timeouts, network errors.
- Never retried: any other 4xx (401, 400, 404, ...), a non-JSON
  response, or non-JSON model output. Retrying those would only
  burn budget.
- Backoff: the server's `Retry-After` header is honored when
  present (delay-seconds or HTTP-date), capped at 30s — a
  Retry-After of an hour must not stall the run. Otherwise
  exponential backoff from the base delay (default 1s, doubling per
  attempt, capped at 30s).
- A case whose provider calls all fail is recorded as a failed case
  with `provider error: …` as the failure reason, not silently
  skipped.
- `maxRetries` counts retries *after* the first attempt; `0`
  disables retries entirely.

Gemini differs (connector doc rules): 429 → one retry after a
pause (default 5s); 401/403 → stop immediately, report to the
coordinator; timeouts and other failures are never retried. See
the Gemini section above.

## Verification

The Gemini adapter was verified end-to-end with live calls through
the finished adapter (resolved via the registry) on 2026-11-22:

- **Attempt 1:** timed out at the then-default 60s. The timeout was
  raised (see the 300s note above). The call may have been billed —
  the response was lost when the helper was killed.
- **Attempt 2 (tiny prompt, "What skill helps me write a blog
  post?"):** succeeded in ~164s. Model returned:
  `gemini-3.8-flash`; finish reason `stop`; usage prompt 193,
  completion 157, total 1807 tokens (total includes reasoning
  tokens). The normalized observation selected `blog-writing` with
  a grounded answer and a 4-step tool plan.

No other live calls were made from this work. The 89-case run
belongs to the Phase 4 worker.

## How to run a comparison across providers

1. **Configure the providers to compare.** Set the required
   variables for each (see above). Verify with the registry:
   `listProviders()` reports configured vs unconfigured; an
   unconfigured provider fails loudly at resolve time, so a
   comparison never silently drops a provider.
2. **Use the identical dataset for every provider.** The
   representative subset is
   `evals/datasets/real-model-subset-v2.json` (89 cases, v2); the
   full suite is 463 cases. Run each provider against the same
   dataset — different datasets make the numbers incomparable.
3. **Run one provider at a time, into separate output
   directories**, so no run overwrites another's report. (The
   real-model runner owns the exact CLI; the adapters expose the
   provider objects it resolves through the registry.)
4. **Keep temperature 0.** Every adapter sends temperature 0, but
   providers are not perfectly deterministic — re-running the same
   provider may give slightly different results. Record the model id
   exactly (`providerMeta.model`) and the run date with every
   result.
5. **Compare with the benchmark dashboard**
   (`ai/evaluations/BENCHMARK-DASHBOARD.md`): it renders per-provider
   metrics from the report JSON files and marks real-model metrics
   unavailable until a run actually exists.

## What is not done yet

- No provider credentials exist in this environment for OpenAI,
  Anthropic, or local inference, and no budget is approved for
  them — those adapters are unconfigured until credentials are
  supplied. Gemini is the exception: its key is approved and its
  adapter is verified (see above).
- No real-model eval run has happened yet. The real-model runner
  (`evals/run-real-model.mjs`, owned by another worker) currently
  hard-codes the legacy generic provider (`createModelProvider`,
  `EVAL_PROVIDER_*`); to run Gemini it must resolve `gemini`
  through `evals/lib/provider-registry.mjs` instead. The runner's
  version-capture fetch wrapper does not apply to the Gemini
  adapter (no fetch involved) — the adapter records the served
  model itself, per case (`observation.model`) and in aggregate
  (`getUsage().servedModels`).
- `MODEL_SYSTEM_PROMPT` is duplicated between
  `evals/runners/providers.mjs` and `evals/providers/shared.mjs`
  because the former does not export it. If it is ever exported,
  the adapters should import it instead of duplicating it, so the
  prompt cannot drift between the legacy provider and the adapters.
