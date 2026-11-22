---
name: observability
description: >
  Use this skill when adding logging, metrics, tracing, and alerting to a
  service: designing structured logs, choosing what to measure, setting up
  error tracking and uptime monitoring, defining alerts and on-call
  response, and debugging production issues with telemetry. Trigger
  keywords: observability, logging, metrics, tracing, monitoring,
  alerting, OpenTelemetry, error tracking, uptime, SLO, incident,
  structured logs.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Observability

## Purpose

This skill covers observability for production services: structured
logging, metrics, distributed tracing, error tracking, and alerting. It
produces services whose failures can be found quickly, understood from
telemetry, and fixed before users report them.

## When to Use

- Adding logging, metrics, or tracing to a new or existing service.
- Setting up error tracking or uptime monitoring.
- Defining alerts, thresholds, and on-call response for a service.
- Debugging a production issue using logs and metrics.
- Choosing an observability stack (OpenTelemetry, vendor tools, or
  platform-native logs).
- Writing a post-incident review.

## When Not to Use

- The deployment itself — use `deployment`, `vercel`, or
  `cloudflare-workers`.
- The CI pipeline — use `github-actions` or `ci-cd`.
- Fixing the bug once it is found — use the skill for the affected area,
  such as `cloudflare-workers` or `cloudflare-d1`.
- Analytics and product usage tracking — that is product analytics, not
  service observability.

## Prerequisites

- A deployed service with a way to emit logs (platform logs, a logging
  library, or an observability vendor).
- Agreement on what "healthy" means for the service: uptime, error rate,
  and latency targets.
- Access to the log and metrics store for the service.
- For tracing: an OpenTelemetry-compatible collector or vendor endpoint.
- Version range: none — this skill covers observability practice, not a versioned tool.

## Official Documentation

- [OpenTelemetry docs](https://opentelemetry.io/docs/) — the standard
  for traces, metrics, and logs.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  `wrangler tail` and Workers logs.
- [Vercel Documentation](https://vercel.com/docs) — deployment and
  function logs on Vercel.
- [Prometheus docs](https://prometheus.io/docs/) — metrics collection
  and alerting.

## Required Workflow

1. Identify the signals the service needs: logs for events, metrics for
   trends, traces for request flows, and error tracking for exceptions.
2. Add structured JSON logging at the boundaries: request received,
   request completed, external call made, error caught.
3. Add a health endpoint that reports the service and its dependencies.
4. Add metrics for the four golden signals: latency, traffic, errors, and
   saturation, at the level the platform supports.
5. Add error tracking so unhandled exceptions are captured with a stack
   trace and context.
6. Define alerts for the conditions that need a human: high error rate,
   high latency, and downtime.
7. Test the alerts by triggering them in a non-production environment.
8. Verify the telemetry after a deploy: confirm logs, metrics, and traces
   are flowing.

## Implementation Standards

- Log structured JSON with consistent fields: timestamp, level, message,
  request ID, and service name.
- Include a request ID (or trace ID) in every log line for a request so
  the full request can be reconstructed.
- Log at the right level: `error` for failures that need attention,
  `warn` for degraded behavior, `info` for normal operations, `debug`
  for development detail.
- Never log secrets, passwords, tokens, or full request bodies that may
  contain personal data.
- Emit metrics with labels that allow slicing by route, status code, and
  dependency.
- Keep log volume under control: log one line per request at `info`
  level, not one line per function call.
- Set log retention to match the team's needs and any legal requirements.

## Best Practices

- Start with logs and error tracking; add metrics and tracing as the
  service grows.
- Use the platform's native logs first (`wrangler tail` for Workers,
  Vercel logs for Vercel) before adding a vendor.
- Correlate logs, metrics, and traces with the same request or trace ID.
- Alert on symptoms (error rate, latency) rather than causes (CPU usage)
  so alerts match user impact.
- Write runbooks for every alert: what the alert means, how to confirm
  it, and what to do.
- Review alerts regularly and remove or retune alerts that fire without
  action.
- After an incident, write a short review: what happened, what the
  telemetry showed, and what will change.

## Security Considerations

- Never log secrets, API keys, tokens, or credentials.
- Redact personal data from logs or avoid logging it entirely.
- Restrict access to logs and metrics to the team that operates the
  service.
- Be careful with error messages returned to clients: return a generic
  message and a request ID, and keep the details in the logs.
- Secure the observability vendor account with the same care as the
  production account.

## Performance Considerations

- Logging is I/O: keep per-request logging to a small number of lines
  and avoid logging in hot loops.
- Sampling is acceptable for high-volume traces; tracing every request
  is usually unnecessary.
- Metrics cardinality matters: do not put user IDs or unbounded values
  in metric labels.
- Asynchronous log shipping avoids blocking the request path.
- Set sensible retention so storage costs do not grow without bound.

## Common Mistakes

- Logging unstructured text that cannot be searched or filtered —
  structured JSON logs are queryable.
- No request ID — a failure cannot be traced across services or log lines.
- Logging secrets or personal data — logs become a data leak.
- Alerting on everything — alert fatigue means real alerts get ignored.
- No runbook for an alert — the person on call does not know what to do.
- Observability added after the incident — add it before the service
  matters, not after it breaks.
- Measuring only uptime — a service can be up and still be broken for
  users; measure error rate and latency too.

## Examples

Structured log line for a completed request:

```json
{
  "timestamp": "2026-11-20T18:00:00.000Z",
  "level": "info",
  "service": "my-worker",
  "requestId": "01K9example",
  "method": "GET",
  "path": "/api/posts",
  "status": 200,
  "durationMs": 42
}
```

Minimal logging helper for a Worker:

```ts
function log(level: string, message: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields }));
}

// Usage in a handler:
log("info", "request completed", { requestId, method, path, status, durationMs });
```

Health endpoint that checks a dependency:

```ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }
    try {
      await env.DB.prepare("SELECT 1").first();
      return Response.json({ ok: true });
    } catch {
      return Response.json({ ok: false }, { status: 503 });
    }
  },
};
```

## Validation Checklist

- [ ] Logs are structured JSON with a request ID on every line.
- [ ] No secret or personal data appears in logs.
- [ ] A health endpoint exists and reflects dependency status.
- [ ] Error tracking captures unhandled exceptions with context.
- [ ] Alerts exist for error rate, latency, and downtime, with runbooks.
- [ ] Telemetry was verified flowing after the last deploy.

## Expected Deliverables

- Logging, metrics, and error tracking added to the service.
- A health endpoint and alert definitions with runbooks.
- Documentation of what is monitored and where to find it.
- Verification that telemetry flows after deployment.

## References

- [OpenTelemetry docs](https://opentelemetry.io/docs/) — traces,
  metrics, and logs.
- [Prometheus docs](https://prometheus.io/docs/) — metrics and alerting.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  Workers logs and `wrangler tail`.
- Related skills in this repository: `deployment`, `ci-cd`,
  `cloudflare-workers`, `vercel`, `cloudflare-queues`.
