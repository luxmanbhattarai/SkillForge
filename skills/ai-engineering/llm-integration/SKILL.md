---
name: llm-integration
description: >
  Integrate large language models into production applications: multi-provider
  clients with a clean abstraction, prompt management and versioning,
  structured outputs (JSON Schema, strict mode), tool and function calling,
  context-window budgeting and truncation, streaming, retries, timeouts,
  error handling, cost and latency optimization, observability, and eval
  hooks. Use when adding chat, generation, extraction, classification, or
  summarization features powered by an LLM API.
license: MIT
metadata:
  version: "1.0.0"
  category: ai-engineering
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# LLM Integration

## Purpose

This skill covers integrating hosted large language model APIs into a
production application: choosing a provider and model by capability,
wrapping the provider behind an abstraction so the model can change
without rewriting call sites, managing prompts as versioned artifacts,
getting reliable structured output, calling tools, staying inside the
context window, and running the whole thing with retries, timeouts,
cost controls, and observability. The outcome is an LLM feature that
behaves predictably, fails gracefully, and can be measured and improved.

## When to Use

- Adding chat, generation, summarization, extraction, or classification
  to an application using a hosted LLM API.
- Wiring a second provider in for fallback, cost, or capability reasons.
- Moving from a prototype that calls one provider directly to a
  production integration with retries, timeouts, and cost controls.
- Debugging unreliable model output: malformed JSON, truncated replies,
  or runaway token usage.
- Reviewing an existing LLM integration for security, cost, or
  reliability gaps.

## When Not to Use

- Building retrieval over your own documents — use `rag` for the
  retrieval pipeline; this skill covers the generation call it feeds.
- Building an autonomous multi-step agent with tools, memory, and
  planning — use `ai-agents`; this skill covers single calls and
  single tool-calling turns.
- Evaluating model or agent quality systematically — use
  `agent-evaluation`.
- Building an MCP server — use `mcp-development`; securing one — use
  `mcp-security`.

## Prerequisites

- An account and API key with at least one LLM provider, stored in a
  secret manager (see `secrets-management`). Never hardcode keys.
- A defined use case with a known input shape, output shape, and
  quality bar — "call an LLM" is not a specification.
- The provider's current API surface. Current stable as of 2026-11-20: OpenAI's
  current API is the Responses API (Chat Completions remains
  supported); Anthropic's is the Claude Messages API with tool use;
  Google offers the Gemini API. Check the official model pages for
  the current model lineup before choosing — model names change
  frequently, and this skill does not pin them.
- A way to measure: token usage, latency, and cost per request, from
  day one.

## Official Documentation

- [OpenAI API: function calling](https://developers.openai.com/api/docs/guides/function-calling)
  — the tool-calling flow, function schemas, strict mode, and token
  accounting for the Responses API and Chat Completions.
- [OpenAI API: structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
  — JSON Schema-constrained output, strict mode, and the difference
  from plain JSON mode.
- [Claude Platform Docs: tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
  — Anthropic's tool-use model: client tools vs server tools,
  `tool_choice`, and the `tool_use` / `tool_result` round trip.
  (The older `docs.anthropic.com` address redirects here.)
- [OpenAI API: evals](https://developers.openai.com/api/docs/guides/evals)
  — OpenAI's hosted evals guide. Note: OpenAI is deprecating the
  Evals platform (read-only 2026-10-31, shutdown 2026-11-30); do not
  build new long-term evaluation infrastructure on it. See
  `agent-evaluation` for harness options.
- [LangSmith documentation](https://docs.smith.langchain.com/) —
  tracing, monitoring, and evaluation for LLM applications across
  providers and frameworks.

## Required Workflow

1. Define the contract first: input, expected output shape, latency
   budget, cost budget per request, and what "wrong" looks like.
2. Choose the provider and model by capability (reasoning depth,
   context window, tool support, structured-output support, latency,
   price), not by brand. Record the choice and why in a short
   decision note (see `technical-decision-records`).
3. Build a provider abstraction: one interface (`complete`,
   `completeStructured`, `stream`) with a per-provider adapter.
   Application code never imports a provider SDK directly.
4. Put prompts under version control as files or in a prompt registry,
   with a version identifier logged on every request. Never embed
   prompts as string literals scattered through call sites.
5. Use structured outputs (JSON Schema with strict mode where the
   provider supports it) for any output the code parses. Validate the
   parsed result against the schema in your own code as well.
6. Implement the tool-calling loop only if the feature needs tools:
   send tools, execute the model's calls, return results, cap the
   number of turns. See `ai-agents` if the loop grows beyond a few
   turns.
7. Budget the context window explicitly: reserve tokens for the
   system prompt, tools, history, retrieved context, and the
   response. Truncate or summarize history before the window fills.
8. Add retries (transient errors only, exponential backoff with
   jitter), per-request timeouts, and a circuit breaker or fallback
   provider for sustained outages.
9. Instrument every call: model, prompt version, input/output tokens,
   latency, cost estimate, and outcome. Alert on error rate and cost
   anomalies.
10. Add eval hooks from the start: log inputs and outputs (redacted)
    so golden datasets can be built from real traffic. See
    `agent-evaluation`.

## Implementation Standards

- Provider abstraction: the interface owns the request shape
  (messages, tools, schema, options) and returns a normalized result
  (text or parsed object, token usage, finish reason). Adapters
  translate provider-specific errors into a small set of typed
  errors: `RateLimited`, `Timeout`, `InvalidRequest`, `ProviderError`,
  `ContentFiltered`.
- Prompts are versioned artifacts: each prompt has an id, a version,
  and a changelog entry. A prompt change is a code change — reviewed,
  tested, and deployable independently of a model change where
  possible.
- Structured outputs: prefer strict JSON Schema mode over JSON mode.
  JSON mode only guarantees valid JSON, not the shape. Always validate
  parsed output in code; a schema guarantee is not a substitute for
  validation of business rules (ranges, enums, required relations).
- Tool calling: define tools with minimal, precise JSON schemas and
  plain-language descriptions. Validate every tool argument before
  executing. Cap tool turns (a small single-digit limit for simple
  features) and total tokens per request. Never let the model call a
  tool that performs an irreversible action without a confirmation
  step in the application.
- Context management: measure tokens with the provider's tokenizer
  or counting endpoint before sending, never by guessing. Keep a
  fixed reserve for the response. When history must shrink, summarize
  the oldest turns rather than dropping them silently, and keep the
  summary in the conversation.
- Streaming: stream to the user for interactive features, but still
  assemble and validate the full response server-side before acting
  on it. Never execute a tool call from a partial streamed chunk.
- Retries: retry only 429 and 5xx errors and timeouts, with
  exponential backoff, jitter, and a maximum of 3 attempts. Never
  retry 400-class errors or content-filter refusals. Make tool
  executions idempotent so a retried turn cannot double-apply an
  effect.
- Timeouts: set a per-request timeout (tuned to the model and use
  case) and a shorter timeout for the first token when streaming.
  A hung model call must never hang the request handler.
- Cost controls: per-request and per-user token budgets, daily spend
  alerts, and a kill switch. Log the cost estimate of every call.
- Error handling: a model failure is a normal failure mode, not an
  exception to crash on. Return a degraded response (cached answer,
  simpler model, clear error message) and log the failure with the
  request id.

### Testing Strategy

- Keep a golden set of representative prompts with graded expected
  outcomes and run it on every prompt or model change; grade outputs
  by rule or judge, never by exact string match.
- Unit-test the provider adapter with a mocked provider: error mapping
  (429 to RateLimited, 5xx to ProviderError), structured-output
  validation, and tool-argument validation must all hold without a
  network call.
- Test retries with a fault-injecting stub: 429 and 5xx errors retry
  with backoff and stop after 3 attempts; 400-class errors and
  content-filter refusals never retry.
- Test timeouts and fallbacks: a hung model call returns a degraded
  response within the request timeout instead of hanging the handler.
- Assert cost and latency budgets per request in tests, so a prompt or
  model change that doubles token usage fails loudly instead of
  silently doubling the bill.

## Best Practices

- Start with the smallest capable model and upgrade only when evals
  show the smaller one failing. Cost and latency scale with model
  size; quality often does not need the largest model.
- Keep the system prompt short and specific. Long system prompts cost
  tokens on every call and dilute the instructions that matter.
- Use the provider's prompt-caching feature (where offered) for
  long, stable prefixes such as system prompts and tool definitions.
- Separate the "reasoning" call from the "formatting" call when a
  task needs both: let the model reason in prose, then extract the
  structured result in a second, cheap call.
- Test with adversarial inputs: empty input, huge input, input that
  looks like instructions, non-English input, and input containing
  secrets. The model will see all of them in production.
- Pin the model identifier in configuration, not in code, and record
  it in logs and traces so a regression can be traced to a model or
  prompt change.
- Keep a human review sample of production traffic (see
  `agent-evaluation`) — automated metrics miss tone, usefulness, and
  subtle wrongness.

## Security Considerations

- API keys live in a secret manager and are loaded at runtime; they
  never appear in code, logs, client bundles, or error messages.
  Rotate keys on a schedule and after any suspected exposure.
- Never call a provider API directly from the browser or a mobile
  client with a secret key. Route through your backend, which
  enforces authentication, authorization, and rate limits.
- Treat user input as untrusted data, not instructions. Prompt
  injection (direct, from the user; indirect, from retrieved or
  third-party content) is the top LLM application risk in the OWASP
  Top 10 for LLM Applications — see the OWASP GenAI Security Project
  at <https://genai.owasp.org/> for the current list. Delimit
  untrusted content, instruct the model to treat it as data, and
  never let model output alone authorize a consequential action.
- Validate and sanitize model output before it reaches another
  system: a database query, a shell, a rendered page, or an API call.
  Model output is untrusted input to everything downstream.
- Do not send PII, secrets, or confidential business data to a
  provider unless the provider's data-handling terms allow it and
  the data is needed for the task. Redact or tokenize where possible,
  and check the provider's retention and training-use policies.
- Log prompts and outputs only with redaction of secrets and PII,
  and with a retention policy. Traces are a data store; treat them
  as one.
- Enforce per-user and per-tenant rate limits and spend caps (see
  `rate-limiting`); an unauthenticated LLM endpoint is an open
  invitation to run up your bill.

## Performance Considerations

- Latency is dominated by time-to-first-token plus output tokens.
  Prefer streaming for interactive UX, shorter outputs, and smaller
  models for latency-sensitive paths.
- Token cost is dominated by input tokens on long contexts. Cache
  stable prefixes, trim tool schemas, and summarize history
  aggressively — every token in the prompt is paid for on every call.
- Parallelize independent model calls; serialize dependent ones.
  Batch offline work (classification, extraction) through the
  provider's batch API where one exists, which is typically cheaper
  and not latency-sensitive.
- Cache deterministic responses (same input, same prompt version)
  with a short TTL where the content allows it (see `caching`).
  Never cache personalized or sensitive outputs in a shared cache.
- Set concurrency limits per provider so a traffic spike cannot
  exhaust rate limits or budget in minutes.

## Common Mistakes

- Calling the provider SDK directly from every feature — the model
  or provider can never change without a rewrite. Abstract once.
- Parsing free-form model text with regexes — use structured outputs
  and schema validation instead.
- No timeout on model calls — one slow provider response blocks a
  worker and cascades into a full outage.
- Retrying every error — 400-class errors and refusals will fail
  again; retry only transient failures.
- Sending the entire conversation history on every turn — token
  costs grow quadratically and the window eventually overflows.
  Budget and summarize.
- Trusting the model's tool arguments — validate them like any other
  untrusted input before executing.
- Logging raw prompts and completions — secrets and PII end up in
  the log store. Redact first.
- Evaluating by vibes — without evals, a prompt or model change is a
  blind change. See `agent-evaluation`.

## Examples

A provider abstraction in TypeScript — application code depends on
this interface, never on a provider SDK:

```ts
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface CompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: "stop" | "length" | "tool_calls" | "filtered";
}

export interface LlmClient {
  complete(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<CompletionResult>;
  completeJson<T>(messages: ChatMessage[], schema: object): Promise<T>;
}
```

Structured output with the OpenAI Responses API (Python), following
the official structured-outputs guide — the schema is defined in
code and the result comes back parsed:

```python
from openai import OpenAI
from pydantic import BaseModel

client = OpenAI()  # reads OPENAI_API_KEY from the environment


class CalendarEvent(BaseModel):
    title: str
    date: str
    participants: list[str]


response = client.responses.parse(
    model="gpt-6.2-astra",
    input=[
        {"role": "user", "content": "Lunch with Ana and Ben next Tuesday."},
    ],
    text_format=CalendarEvent,
)

event = response.output_parsed  # a validated CalendarEvent instance
```

The model identifier above is the one used in the official guide as
of 2026-11-20; check the provider's current model page before
copying it into production, and keep it in configuration.

## Validation Checklist

- [ ] Application code calls the provider only through the
      abstraction; no provider SDK import outside the adapters.
- [ ] Every prompt is versioned and the version is logged per request.
- [ ] Parsed outputs use structured outputs plus in-code validation.
- [ ] Tool arguments are validated before execution; tool turns and
      tokens per request are capped.
- [ ] Context budget is enforced: prompt tokens are measured before
      sending and history is summarized, not silently dropped.
- [ ] Retries cover only transient errors (max 3 attempts, backoff
      with jitter); timeouts are set on every call.
- [ ] Every call logs model, prompt version, tokens, latency, and
      cost estimate; spend alerts are configured.
- [ ] No API key or secret appears in code, logs, or client bundles.
- [ ] Model output is validated before reaching any downstream system.
- [ ] A smoke eval runs against the integration (see
      `agent-evaluation`).

## Expected Deliverables

- A provider abstraction with at least one adapter and typed errors.
- Versioned prompts with a changelog, and the model choice recorded.
- Retry, timeout, token-budget, and cost-control configuration.
- Instrumentation: traces and dashboards for tokens, latency, cost,
  and error rate.
- An eval smoke suite wired into CI (see `agent-evaluation`).
- A short operations note: how to rotate keys, change models, and
  respond to a provider outage.

## References

- [OpenAI API: function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI API: structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Claude Platform Docs: tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [OpenAI API: evals](https://developers.openai.com/api/docs/guides/evals)
- [LangSmith documentation](https://docs.smith.langchain.com/)
- [OWASP GenAI Security Project](https://genai.owasp.org/)
- Related skills in this repository: `rag`, `ai-agents`,
  `agent-evaluation`, `mcp-development`, `mcp-security`,
  `secrets-management`, `observability`, `rate-limiting`, `caching`.
