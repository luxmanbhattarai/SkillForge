---
name: cloudflare-queues
description: >
  Use this skill when building asynchronous background processing with
  Cloudflare Queues: creating queues, binding queues to Workers, sending
  messages from a producer Worker, writing a consumer Worker, handling
  retries and dead-letter queues, and choosing Queues over synchronous
  processing. Trigger keywords: Cloudflare Queues, queue, message queue,
  background job, async processing, producer, consumer, dead-letter queue,
  wrangler queues.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js, the Wrangler CLI, a Cloudflare account, and network access to Cloudflare.
---

# Cloudflare Queues

## Purpose

This skill covers Cloudflare Queues, the message queue service for
Workers. It produces reliable producer and consumer Workers that move slow
or bursty work off the request path, handle failures with retries, and
park unprocessable messages in a dead-letter queue.

## When to Use

- Moving slow work (sending email, generating files, calling slow APIs)
  off the HTTP request path.
- Smoothing bursty traffic so a downstream service is not overwhelmed.
- Creating a queue and wiring a producer Worker and a consumer Worker.
- Adding retries and a dead-letter queue for failed messages.
- Deciding whether a task should be asynchronous rather than synchronous.

## When Not to Use

- Work that must complete before the HTTP response is sent — keep it
  synchronous in the Worker; see `cloudflare-workers`.
- Scheduled work that runs on a timer with no incoming message — use a
  Worker with a scheduled trigger instead.
- Storing data for later querying — use `cloudflare-d1` or
  `cloudflare-r2`.
- Real-time coordination between requests — use `durable-objects`.
- A queue hosted outside Cloudflare — use that provider's own tooling.

## Prerequisites

- A Cloudflare account and Wrangler installed and authenticated.
- A Worker project with a `wrangler.toml` that will declare the queue
  binding and consumer configuration.
- An understanding of at-least-once delivery: a message may be delivered
  more than once, so consumers must be idempotent.
- A plan for failure: how many retries, and where failed messages go.
- Consumer defaults in `wrangler.toml` (per the Queues docs):
  `max_batch_size` 10, `max_batch_timeout` 5 seconds, `max_retries` 3.
  `max_concurrency` and `retry_delay` are also available for tuning.
  Wrangler 4.x is the current major version.
- Version range: Wrangler 4.x.

## Official Documentation

- [Cloudflare Queues docs](https://developers.cloudflare.com/queues/) —
  concepts, configuration, and API reference.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  runtime and binding reference.
- [Wrangler docs](https://developers.cloudflare.com/workers/wrangler/) —
  CLI reference.

## Required Workflow

1. Create the queue with Wrangler and record the queue name.
2. Create a dead-letter queue for messages that fail after all retries.
3. Configure the producer binding (`[[queues.producers]]`) in the
   producer Worker's `wrangler.toml`.
4. Configure the consumer (`[[queues.consumers]]`) in the consumer
   Worker's `wrangler.toml`, with the dead-letter queue and a retry limit.
5. Write the producer to send a small, self-contained JSON message with a
   unique idempotency key.
6. Write the consumer with a `queue` handler that processes each message,
   acknowledges success, and retries only transient failures.
7. Make the consumer idempotent: processing the same message twice must
   not produce a duplicate side effect.
8. Test locally with `wrangler dev`, then deploy and verify end to end by
   sending a real message and confirming the consumer processed it.

## Implementation Standards

- Keep messages small and self-contained: include the IDs and data the
  consumer needs, not just a pointer that requires another fetch.
- Include a unique message ID or idempotency key in every message.
- Make the consumer idempotent: check whether the work is already done
  (for example by recording processed message IDs in D1) before acting.
- Acknowledge a message only after its work has completed successfully.
- Retry only transient failures (network errors, temporary downstream
  outages); permanent failures (invalid data) should go to the dead-letter
  queue without retrying.
- Set a sensible batch size and retry limit in the consumer configuration.
- Log the message ID at the start and end of processing so failures can
  be traced.

## Best Practices

- Separate the producer and consumer into different Workers so they can
  scale and deploy independently.
- Keep the consumer fast: a slow consumer backs up the queue; move heavy
  work into smaller steps or parallelize within the batch.
- Monitor queue depth and dead-letter queue size; a growing dead-letter
  queue means a systematic failure, not bad luck.
- Use a dead-letter queue from day one; adding it after failures start is
  too late to recover the lost messages.
- Version the message schema so the consumer can handle old messages
  during a rollout.
- Alert on dead-letter queue growth rather than discovering it weeks
  later.

## Security Considerations

- Validate every message in the consumer as if it came from an untrusted
  source; a queue is not an authentication boundary.
- Do not put secrets or credentials in message bodies.
- Do not put sensitive personal data in messages unless the use case
  requires it; pass an ID and fetch the data in the consumer instead.
- Restrict who can create queues and bind producers in production.
- Sanitize data from messages before writing it to a database or passing
  it to another service.

## Performance Considerations

- Batch size trades latency against throughput: larger batches process
  more messages per invocation but delay individual messages.
- Keep the consumer's per-message work short; long-running processing
  blocks the batch.
- Avoid calling slow external services serially inside a batch; fetch in
  parallel where the calls are independent.
- Watch for poison messages: one message that always fails can block or
  repeatedly consume a batch; the dead-letter queue exists to remove them.
- Queue throughput scales with the plan; check the Queues docs for
  current limits before designing for high volume.

## Common Mistakes

- Assuming exactly-once delivery — Queues deliver at least once; a
  non-idempotent consumer creates duplicate side effects.
- Acknowledging a message before the work completes — a crash after
  acknowledgment loses the work.
- No dead-letter queue — after `max_retries` (default 3) a failed
  message is discarded, so the failure is silent; set a
  `dead_letter_queue` to keep failed messages for inspection.
- Putting large payloads in messages — keep messages small and store
  large data in R2 or D1.
- Retrying permanent failures — invalid data will never succeed; send it
  to the dead-letter queue.
- Coupling the producer to the consumer's implementation — the message
  schema is the contract; keep it stable and versioned.

## Examples

Producer binding and consumer configuration in `wrangler.toml`:

```toml
# Producer Worker
[[queues.producers]]
binding = "JOBS"
queue = "jobs"

# Consumer Worker
[[queues.consumers]]
queue = "jobs"
max_retries = 3
dead_letter_queue = "jobs-dlq"
```

Producer sending a message:

```ts
export interface Env {
  JOBS: Queue;
}

await env.JOBS.send({
  id: crypto.randomUUID(),
  type: "send-welcome-email",
  userId: "user_123",
});
```

Consumer handling a batch:

```ts
export default {
  async queue(batch: MessageBatch<{ id: string }>, env: Env) {
    for (const message of batch.messages) {
      try {
        await processJob(message.body);
        message.ack();
      } catch (error) {
        message.retry();
      }
    }
  },
};
```

## Validation Checklist

- [ ] The queue and dead-letter queue exist and are bound in
      `wrangler.toml`.
- [ ] The producer sends small, self-contained messages with a unique ID.
- [ ] The consumer is idempotent and acknowledges only after success.
- [ ] Retries are limited and permanent failures go to the dead-letter
      queue.
- [ ] No secret appears in a message body.
- [ ] A real message was sent and processed end to end after deployment.

## Expected Deliverables

- The queue and dead-letter queue created and configured in
  `wrangler.toml`.
- Producer and consumer Worker code committed to the project.
- Documentation of the message schema and retry behavior.
- Verification that a message flows from producer to consumer after
  deployment.

## References

- [Cloudflare Queues docs](https://developers.cloudflare.com/queues/) —
  concepts, configuration, and API reference.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  runtime reference.
- Related skills in this repository: `cloudflare`, `cloudflare-workers`,
  `cloudflare-d1`, `durable-objects`, `observability`.
