# Provider abstraction, prompts, structured outputs, tools

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
