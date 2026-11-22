# Operations: index versioning, failure handling

- Index versioning: every index build records the embedding model,
  chunking parameters, and source snapshot. A re-index is a
  deployment: build the new index, evaluate it, then switch reads.
- Failure handling: empty retrieval, low-score retrieval, and
  embedding-service outages are normal cases. Define the behavior
  for each (ask a clarifying question, fall back to keyword search,
  fail with a clear message) instead of generating from nothing.
