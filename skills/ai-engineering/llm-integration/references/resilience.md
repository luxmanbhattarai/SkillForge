# Resilience: retries, timeouts, cost controls, errors

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
