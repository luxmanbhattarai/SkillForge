# Reliability: idempotency, validation, jobs, timeouts, sagas

- Every mutating endpoint that a client may retry accepts an
  `Idempotency-Key` header. The server stores the key with the
  request fingerprint and the response, returns the stored response
  for a replayed key, and rejects a key reused with a different
  request body. Keys expire after a documented window.
- Validation happens at the boundary, before any business logic,
  and rejects unknown fields. A validation failure returns `400`
  (or `422`) with the problem detail and the failing fields; it
  never returns `500`.

- Background jobs are idempotent, retryable with backoff, and
  observable (queue depth, failure rate, dead-letter handling).
  A job that cannot be retried safely is a design bug. See
  `queues` and `background-jobs`.
- Every outbound call has a timeout, a retry policy with backoff
  and jitter, and a circuit breaker. Retries apply only to
  idempotent operations or to requests with an idempotency key.
- Timeouts are set end to end: the client timeout exceeds the
  server timeout, which exceeds the sum of downstream timeouts,
  so failures surface as controlled errors instead of hung
  requests.
- Distributed transactions are avoided: prefer sagas (compensating
  actions) or an outbox pattern over two-phase commit, and design
  each step to be retryable and idempotent.
