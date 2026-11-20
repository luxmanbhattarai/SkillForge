---
name: queues
description: >
  Design and use message queues for reliable asynchronous communication
  between services: choosing a queue, delivery guarantees, ordering, retries,
  dead-letter queues, and backpressure. Use when decoupling services, building
  event-driven flows, or fixing lost, duplicated, or out-of-order messages.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a queue system such as Redis with BullMQ, RabbitMQ, Amazon SQS, or Cloudflare Queues.
---

# Queues

## Purpose

This skill covers message queues as the backbone of asynchronous,
decoupled systems: choosing the right queue, defining delivery
guarantees, handling retries and poison messages, and managing ordering
and backpressure. The outcome is a messaging layer where no message is
silently lost and consumers can be scaled, deployed, and debugged
independently of producers.

## When to Use

- Decoupling two services so the producer does not wait for the
  consumer.
- Building event-driven flows: order placed, payment received, email
  sent.
- Adding retries, dead-letter handling, or ordering to message
  processing.
- Choosing between a queue, a stream, and direct synchronous calls.
- Debugging lost, duplicated, delayed, or out-of-order messages.

## When Not to Use

- A request that needs an immediate answer — use a synchronous call
  (`rest-api`, `trpc`) instead of a queue.
- Simple in-process work with no durability requirement — a queue adds
  infrastructure for no benefit.
- Scheduled or recurring work with no message producer — see
  `background-jobs` for job scheduling.
- Broadcasting the same event to many subscribers with replay needs —
  consider a log-based stream such as Kafka instead of a plain queue.

## Prerequisites

- A queue system chosen for the project (BullMQ 6.x on Redis,
  RabbitMQ, Amazon SQS, Cloudflare Queues, or Kafka for log-based
  streams). BullMQ 6 is current (6.7.8, November 2026): legacy
  repeatable jobs were removed in v6 in favor of Job Schedulers, and
  `ioredis` is an optional peer dependency.
- Agreement on the message format (JSON with a schema and a version
  field is the default in this library).
- Observability: queue depth, consumer lag, and dead-letter metrics.

## Official Documentation

- [BullMQ documentation](https://docs.bullmq.io/) — Redis-based queues
  for Node.js. BullMQ 6.x is current; v6 also supports pluggable
  queue backends beyond Redis.
- [RabbitMQ documentation](https://www.rabbitmq.com/docs) — a widely
  used message broker.
- [Amazon SQS documentation](https://docs.aws.amazon.com/sqs/) —
  managed queues on AWS.
- [Cloudflare Queues](https://developers.cloudflare.com/queues/) —
  managed queues on Cloudflare.
- [Apache Kafka documentation](https://kafka.apache.org/documentation.html)
  — log-based event streaming.

## Required Workflow

1. Define the message contract: name, schema, version, and the
   producer and consumer for each message type.
2. Choose the delivery guarantee the system needs (at-least-once is the
   default; exactly-once is a property of the consumer, not the queue)
   and design consumers to be idempotent.
3. Decide on ordering requirements: per-key ordering (all messages for
   one entity in order) or no ordering. Global ordering is expensive
   and rarely needed.
4. Configure retries with backoff and a dead-letter queue for messages
   that fail after the final attempt.
5. Implement the consumer: acknowledge a message only after its work
   has succeeded and been persisted.
6. Set visibility timeouts (or lock durations) longer than the longest
   expected processing time, and extend them for long-running work.
7. Add monitoring: queue depth, oldest message age, consumer lag, and
   dead-letter arrivals, with alerts.
8. Test the failure paths: a consumer crash mid-processing, a poison
   message, and a duplicate delivery.

## Implementation Standards

- Messages are JSON with a `type`, a `version`, a unique `id`, and a
  `payload`. The version field lets consumers handle schema evolution.
- Payloads carry IDs, not full objects; consumers re-read current
  state. Never put secrets in a message.
- Consumers are idempotent: processing the same message twice has the
  same effect as processing it once. Use the message ID as a
  deduplication key.
- Acknowledge only after success. A message acknowledged before its
  work is persisted is a message that can be lost.
- Use a dead-letter queue for poison messages: after a bounded number
  of attempts, move the message aside and alert, instead of blocking
  the queue or retrying forever.
- Retries use exponential backoff with jitter. Immediate retries
  amplify outages.
- Ordering, when required, is per key (for example per order ID) using
  the queue's ordering feature (message groups, partitions, or a
  single consumer). Do not assume global ordering.
- Producers must handle a queue outage: either fail the request
  visibly or buffer locally with a bounded retry, never silently drop
  the message.
- Version message schemas: consumers accept the current version and
  the previous one during a migration window.

## Best Practices

- Keep messages small and single-purpose; a message should describe
  one event, not a batch of unrelated changes.
- Name message types as past-tense events (`order.placed`,
  `payment.failed`) so the intent is clear.
- Prefer one queue per message type (or per consumer) over one shared
  queue: it isolates failures and makes scaling obvious.
- Monitor the oldest message age, not just queue depth: a small queue
  with a very old message means a consumer is stuck.
- Use batching where the queue supports it, but keep batches small
  enough that one poison message does not waste the whole batch.
- Document the producer, consumer, schema, and retry policy for every
  queue in the service's README.
- Test consumers with a real queue in integration tests, not only with
  mocks.

## Security Considerations

- Never put secrets, tokens, or passwords in messages; queue contents
  are stored and may appear in dashboards and logs.
- Authenticate producers and consumers to the broker with least
  privilege: a consumer needs read access to its own queues only.
- Validate message payloads against the schema before acting on them;
  a malformed or malicious message must not crash the consumer.
- Encrypt queue traffic in transit (TLS) and at rest where the broker
  supports it.
- Restrict access to the broker's management UI and dead-letter
  inspection tools.

## Performance Considerations

- Tune consumer concurrency: too few consumers and the queue grows;
  too many and the database or downstream service becomes the
  bottleneck.
- Use batch consumption and bulk database writes where the workload
  allows.
- Set visibility timeouts generously: a timeout shorter than
  processing time causes duplicate processing.
- Apply backpressure: when a downstream service is slow, slow the
  consumer rather than building an unbounded backlog in memory.
- Prefer short messages and small payloads; large payloads belong in
  object storage, referenced by ID in the message.

## Common Mistakes

- Acknowledging before processing — a crash loses the message.
  Acknowledge only after the work is durable.
- Assuming exactly-once delivery — queues deliver at-least-once.
  Design consumers to be idempotent.
- Assuming global ordering — most queues order only within a key or
  partition. Design for out-of-order delivery.
- No dead-letter queue — a poison message retries forever and blocks
  or starves the queue.
- Putting full objects in messages — consumers act on stale data.
  Pass IDs and re-read.
- Ignoring queue depth — a growing queue is the earliest sign of a
  downstream outage. Alert on it.

## Examples

A versioned event message and an idempotent consumer outline:

```json
{
  "id": "evt_01J9ZQ7K2M3N4P5Q6R7S8T9U0V",
  "type": "order.placed",
  "version": 1,
  "occurredAt": "2026-11-20T10:30:00.000Z",
  "payload": { "orderId": "ord_01" }
}
```

```ts
// Consumer outline: acknowledge only after durable work succeeds.
async function handleOrderPlaced(message: OrderPlacedMessage) {
  const alreadyProcessed = await db.processedMessages.exists(message.id);
  if (alreadyProcessed) return; // Duplicate delivery: safe no-op.

  const order = await db.orders.findById(message.payload.orderId);
  if (!order) return; // Referenced entity gone: nothing to do.

  await db.transaction(async (tx) => {
    await tx.notifications.create({ orderId: order.id, kind: "order_placed" });
    await tx.processedMessages.insert({ messageId: message.id });
  });
  // Only now, after the transaction commits, acknowledge the message.
}
```

## Validation Checklist

- [ ] Every message type has a documented schema with a version field.
- [ ] Consumers are idempotent and deduplicate by message ID.
- [ ] Messages are acknowledged only after durable work succeeds.
- [ ] A dead-letter queue exists and dead letters trigger an alert.
- [ ] Retries use bounded attempts with exponential backoff and jitter.
- [ ] Ordering requirements are documented and implemented per key
      where needed.
- [ ] Queue depth, oldest message age, and dead-letter metrics are
      monitored.
- [ ] No secrets appear in message payloads.

## Expected Deliverables

- Message contracts (schema, version, producer, consumer) for each
  queue.
- Producer and consumer implementations with idempotent handlers.
- Dead-letter configuration and alerts.
- Tests covering duplicate delivery, consumer crash, and poison
  messages.

## References

- [BullMQ documentation](https://docs.bullmq.io/) (BullMQ 6.x current)
- [RabbitMQ documentation](https://www.rabbitmq.com/docs)
- [Amazon SQS documentation](https://docs.aws.amazon.com/sqs/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
- [Apache Kafka documentation](https://kafka.apache.org/documentation.html)
- Related skills in this repository: `background-jobs`, `nodejs`,
  `api-design`.
