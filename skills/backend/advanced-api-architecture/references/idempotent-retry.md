# Idempotent retry flow

An idempotent retry flow, in words rather than code, since the
mechanics belong to the framework skill:

1. The client generates a unique `Idempotency-Key` (a UUID) and
   sends it with the `POST /v1/orders` request.
2. The server hashes the key with the request body, stores the pair
   before executing the operation, executes once, and stores the
   response against the key.
3. A retry with the same key and body returns the stored response
   with the original status code; the operation does not run again.
4. A retry with the same key but a different body returns `422`
   Unprocessable Content, because the key is already bound to
   another request. A retry that arrives while the original request
   is still in progress returns `409` Conflict instead.
5. Keys expire after a documented window (for example 24 hours),
   after which the same key may be reused for a new request.
