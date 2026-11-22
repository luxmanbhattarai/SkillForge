---
name: background-jobs
description: >
  Design and run background jobs reliably: job definition, retries with
  backoff, idempotency, scheduling, dead-letter handling, and observability.
  Use when moving slow work out of request handlers, adding email sending,
  webhooks, report generation, or scheduled tasks, or fixing flaky jobs.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires a job runner or queue (such as BullMQ, Inngest, or Trigger.dev) and a backing store such as Redis or Postgres.
---

# Background Jobs

## Purpose

This skill covers moving work out of the request-response cycle into
background jobs: sending email, calling webhooks, generating reports,
processing uploads, and running scheduled tasks. The outcome is a job
system where work is durable, retried sensibly, observable, and safe to
run more than once.

## When to Use

- Moving slow work (email, webhooks, file processing, report
  generation) out of request handlers.
- Adding scheduled or recurring tasks such as nightly cleanup or
  digest emails.
- Fixing flaky jobs, duplicate executions, or silent job failures.
- Choosing a job runner or designing a job's retry and failure policy.
- Building a webhook delivery or notification pipeline.

## When Not to Use

- Work that must complete before responding to the user — keep it in
  the request handler or return a job status the client can poll.
- Real-time event streaming between services — use `queues` and an
  event-driven design instead.
- Simple delayed execution inside a single process with no durability
  requirement — a `setTimeout` is fine; do not add infrastructure.
- Long-running batch data processing over millions of rows — design a
  batch pipeline with checkpoints, not a single job.

## Prerequisites

- A job runner or queue chosen for the project (BullMQ 6.x on Redis,
  Inngest, Trigger.dev, or a Postgres-backed runner). BullMQ 6 is
  current (6.7.8, November 2026): legacy repeatable jobs were removed
  in v6, so scheduled work must use Job Schedulers
  (`queue.upsertJobScheduler`); `ioredis` is now an optional peer
  dependency you install separately; and `Job#discard()` was removed
  — throw `UnrecoverableError` to stop retries.
- A backing store for job state (Redis, Postgres, or the runner's
  managed store).
- A way to observe jobs: logs, metrics, and alerts for failures.

## Official Documentation

- [BullMQ documentation](https://docs.bullmq.io/) — a Redis-based job
  queue for Node.js. BullMQ 6.x is current; see the v5-to-v6
  migration guide before upgrading an existing installation.
- [Inngest documentation](https://docs.inngest.com/) — a managed
  background job platform with durable functions.
- [Trigger.dev documentation](https://trigger.dev/docs) — a managed
  background job platform for TypeScript.
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/) —
  durable, step-based background work on Cloudflare.

## Required Workflow

1. Define the job's contract: its name, its input payload, and what
   "done" means. Keep payloads small — pass IDs, not full objects.
2. Make the job idempotent: running it twice with the same input must
   produce the same result. Use a unique job ID or a database
   constraint to enforce it.
3. Choose the retry policy: number of attempts, backoff strategy, and
   which errors are retryable (transient) versus permanent.
4. Define the failure path: after the final attempt, move the job to a
   dead-letter queue and alert an operator. Never silently drop a job.
5. Implement the job handler as a pure function of its payload plus
   injected services, so it can be tested without the runner.
6. Enqueue from the request handler or the triggering code, and return
   promptly; the request must not wait for the job.
7. Add observability: log job start, success, and failure with the job
   ID; expose metrics for queue depth, processing time, and failure
   rate.
8. Test the job handler directly, test retries with a simulated
   transient failure, and test that a duplicate enqueue does not
   duplicate the effect.

## Implementation Standards

- Payloads contain IDs and minimal data, not full domain objects: the
  job re-reads the current state when it runs, so stale payloads do
  not cause stale actions.
- Every job is idempotent. If the effect cannot be made idempotent
  (for example charging a card), guard it with a unique idempotency
  key stored in the database.
- Retries use exponential backoff with jitter, and a bounded number of
  attempts (a common default is 3-5 attempts). Unbounded retries
  amplify outages.
- Distinguish retryable errors (network timeout, 5xx from a dependency)
  from permanent errors (validation failure, 4xx). Permanent errors
  fail fast without retries.
- Jobs must be safe to run concurrently unless explicitly serialized:
  use a lock or a unique constraint when two instances must not overlap.
- Scheduled jobs (cron) must tolerate a missed run and a duplicate run;
  check for work already done before acting. In BullMQ 6, scheduled
  jobs use Job Schedulers; the old `repeat` option on `Queue.add`
  was removed in v6.
- Timeouts: every job has a maximum runtime, and long jobs checkpoint
  their progress so a retry resumes instead of restarting.
- Never enqueue a job inside a database transaction that has not
  committed yet — the job may run before the data exists. Enqueue
  after commit, or use the transactional outbox pattern.

## Best Practices

- Name jobs by what they do (`send-welcome-email`), not by what
  triggered them.
- Keep jobs small and single-purpose; a job that does five things is
  five jobs waiting to fail independently.
- Prefer the runner's built-in scheduling over a hand-rolled cron
  process; the runner handles retries, concurrency, and visibility.
- Delay retries with backoff rather than requeueing immediately:
  hammering a failing dependency makes the outage worse.
- Alert on dead-letter arrivals and on queue depth crossing a
  threshold, not just on individual failures.
- Version job payloads: when the shape changes, handle both the old
  and new shape until old jobs have drained.
- Run workers as separate processes from the web server so a slow job
  never starves request handling.

## Security Considerations

- Never put secrets, tokens, or passwords in a job payload — payloads
  are stored in the queue backend and may appear in logs and dashboards.
- Validate payloads in the job handler; a job enqueued by an attacker
  (or a stale producer) must not trigger arbitrary actions.
- Authorize the enqueueing action: the code that enqueues a job must
  have already checked that the caller may request that work.
- Sanitize any user-controlled data before it reaches an email, a
  webhook, or a shell command.
- Restrict access to the job dashboard: it can retry, delete, and
  inspect jobs.

## Performance Considerations

- Set worker concurrency per job type: CPU-bound jobs need fewer
  workers than I/O-bound jobs.
- Keep jobs short; split a long job into many small jobs so progress
  is visible and failures are cheap.
- Use bulk enqueueing when creating many jobs at once instead of one
  network round trip per job.
- Monitor queue depth and processing latency; a growing queue means
  workers are undersized or a dependency is slow.
- Avoid polling loops inside jobs; use the runner's delayed-job
  feature instead.

## Common Mistakes

- Enqueueing before the database transaction commits — the job runs
  and finds no data. Enqueue after commit.
- Non-idempotent jobs — a retry sends the email twice or charges twice.
  Design for at-least-once delivery.
- Infinite retries — a permanently failing job consumes workers
  forever. Bound attempts and dead-letter the rest.
- Putting full objects in the payload — the job acts on stale data.
  Pass IDs and re-read state.
- Doing the work in the request handler "just this once" — it becomes
  the slow path for every user. Move it to a job.
- No alerting on dead letters — failed jobs pile up unnoticed until a
  user reports the missing email.

## Examples

An idempotent email job with BullMQ-style structure (pseudocode for the
runner setup; the handler is the portable part):

```ts
// The handler: pure function of payload + services, easy to test.
type SendWelcomeEmailPayload = { userId: string };

async function sendWelcomeEmail(
  payload: SendWelcomeEmailPayload,
  deps: { db: Database; mailer: Mailer },
): Promise<void> {
  const user = await deps.db.users.findById(payload.userId);
  if (!user || user.welcomeEmailSentAt) {
    return; // Already sent (or user gone): idempotent no-op.
  }
  await deps.mailer.send({
    to: user.email,
    subject: "Welcome!",
    body: `Hello ${user.name}, welcome aboard.`,
  });
  await deps.db.users.markWelcomeEmailSent(payload.userId);
}
```

Enqueue after the transaction commits:

```ts
const user = await db.transaction(async (tx) => {
  return tx.users.create({ email, name });
});
// Enqueue only after the commit succeeds.
await jobs.enqueue("send-welcome-email", { userId: user.id });
```

## Validation Checklist

- [ ] The job payload contains IDs, not full objects, and no secrets.
- [ ] Running the job twice with the same input produces the same
      effect.
- [ ] Retry policy is defined: bounded attempts, exponential backoff
      with jitter, retryable vs permanent errors.
- [ ] Failed jobs land in a dead-letter queue and trigger an alert.
- [ ] Jobs are enqueued after the triggering transaction commits.
- [ ] Workers run separately from the web server.
- [ ] Tests cover the handler, a transient failure retry, and a
      duplicate enqueue.

## Expected Deliverables

- Job handlers with idempotent behavior and defined retry policies.
- Enqueueing code wired into the triggering flows.
- Worker process configuration and a dead-letter alert.
- Tests for handlers, retries, and duplicate execution.

## References

- [BullMQ documentation](https://docs.bullmq.io/) (BullMQ 6.x current)
- [Inngest documentation](https://docs.inngest.com/)
- [Trigger.dev documentation](https://trigger.dev/docs)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- Related skills in this repository: `queues`, `nodejs`, `rest-api`,
  `observability`.
