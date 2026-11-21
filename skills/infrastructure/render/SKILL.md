---
name: render
description: >
  Use this skill when deploying and running applications on Render:
  creating web services, static sites, background workers, and cron
  jobs, defining infrastructure as code with Blueprints (render.yaml),
  managing environment variables and environment groups, adding custom
  domains with managed TLS, attaching persistent disks, provisioning
  managed PostgreSQL and Key Value (Redis-compatible), monitoring logs
  and metrics, scaling services, and rolling back deployments. Trigger
  keywords: Render, render.yaml, Blueprint, web service, static site,
  background worker, cron job, environment group, custom domain,
  persistent disk, Postgres, Key Value, rollback, zero-downtime,
  autoscaling.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a Render account, a Git repository (GitHub, GitLab, or Bitbucket), and network access to Render.
---

# Render

## Purpose

This skill covers deploying and operating applications on Render: web
services, static sites, background workers, cron jobs, and private
services; Blueprints for infrastructure as code; environment groups;
custom domains and managed TLS; persistent disks; managed PostgreSQL
and Key Value; monitoring; scaling; and rollbacks. It produces a Render
setup that deploys with zero downtime and rolls back in one step.

## When to Use

- Creating a Render web service, static site, background worker, or
  cron job from a Git repository.
- Defining services, databases, and environment groups in a
  `render.yaml` Blueprint.
- Setting environment variables or sharing them with environment groups.
- Adding a custom domain with managed TLS.
- Attaching a persistent disk to a service.
- Provisioning managed Render Postgres or Key Value.
- Debugging a failed deploy or a crashing service.
- Scaling a service manually or with autoscaling.
- Rolling back a bad deploy.

## When Not to Use

- Deploying to Vercel, Railway, or Fly.io — use `vercel`, `railway`, or
  `fly-io` instead.
- Self-hosting on your own server — use `self-hosted-vps`.
- Container image authoring in depth — use `docker`.
- General deployment strategy — use `deployment`.
- Designing the CI pipeline that deploys — use `github-actions` or
  `ci-cd`.
- Monitoring strategy beyond Render's built-in logs and metrics — use
  `observability`.

## Prerequisites

- A Render account and a Git repository (GitHub, GitLab, or Bitbucket)
  containing the project.
- The application builds and runs locally, and the web service binds to
  host `0.0.0.0` on the port in the `PORT` environment variable that
  Render supplies at runtime.
- A build command and a start command for the service (or a Dockerfile
  when using the Docker runtime).
- For Blueprints: a `render.yaml` file at the repository root (or a
  custom path configured during Blueprint setup).
- For Blueprint validation: the Render CLI, version 2.7.0 or later.
- Current stable as of 2026-11-20. Plan-dependent features (persistent
  disks, pre-deploy commands, autoscaling, preview environments) are
  noted where they apply; confirm the current plan details on Render's
  pricing page before relying on them.

## Official Documentation

- [Render Docs](https://render.com/docs) — the docs home for services,
  datastores, and quickstarts.
- [Deploying on Render](https://render.com/docs/deploys) — auto-deploys,
  deploy steps, zero-downtime deploys, and restarts.
- [Rollbacks](https://render.com/docs/rollbacks) — rolling back to a
  previous deploy and what a rollback does and does not revert.
- [Render Blueprints (IaC)](https://render.com/docs/infrastructure-as-code) —
  defining services, databases, and environment groups in `render.yaml`.
- [Blueprint YAML Reference](https://render.com/docs/blueprint-spec) —
  every supported field in `render.yaml`.
- [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables) —
  service variables, secret files, and environment groups.
- [Persistent Disks](https://render.com/docs/disks) — attaching disks,
  mount paths, snapshots, and limitations.
- [Create and Connect to Render Postgres](https://render.com/docs/postgresql-creating-connecting) —
  creating and connecting to managed PostgreSQL.
- [Scaling Render Services](https://render.com/docs/scaling) — manual
  scaling and autoscaling.
- [Custom Domains on Render](https://render.com/docs/custom-domains) —
  adding domains, DNS records, and managed TLS.

## Required Workflow

1. Confirm the application builds locally and the web service binds to
   `0.0.0.0` on `$PORT`.
2. Create the service in the Render Dashboard from the Git repository,
   or define it in a `render.yaml` Blueprint and create the Blueprint.
   Prefer a Blueprint when the setup has more than one service, a
   database, or shared environment groups.
3. Set the build command and the start command. Add a pre-deploy
   command (paid web services, private services, and background
   workers) for database migrations; it runs after the build and
   before the new version takes traffic, in a separate temporary
   environment.
4. Set a health check path so Render verifies the new instance is ready
   before routing traffic to it; without one, Render only checks that
   the service is listening on its port.
5. Add environment variables in the dashboard or in the Blueprint.
   Never commit secret values to `render.yaml`; declare them with
   `sync: false` and fill them in from the dashboard, or use
   `generateValue: true` for generated secrets.
6. Add a managed Postgres database when the app needs one, in the same
   region as the services that connect to it, and connect with the
   internal URL. Use `fromDatabase` in a Blueprint to wire the
   connection string automatically.
7. Deploy and verify: push to the linked branch (auto-deploy) or
   trigger a manual deploy, then check the build and runtime logs and
   confirm the `onrender.com` URL responds over HTTPS.
8. Add the custom domain in the service settings, set the DNS records
   at the provider (CNAME for a subdomain, A record for an apex
   domain), remove any stale `AAAA` records, and click Verify. Render
   issues and renews the TLS certificate automatically.
9. Before the first production deploy, confirm the rollback path: the
   service's Deploys page offers Rollback to any recent deploy whose
   build artifact is still retained.

## Implementation Standards

- One service per deployable thing: web service, background worker,
  and cron job are separate services, sharing configuration through
  environment groups.
- Keep the Blueprint as the source of truth when one exists: services,
  databases, and environment groups are declared in `render.yaml`, and
  dashboard-only drift is avoided.
- Treat the service filesystem as ephemeral: anything that must survive
  a deploy lives on a persistent disk or in a managed datastore.
- Use the internal database URL for services in the same region; the
  external URL traverses the public internet and is slower.
- Make database migrations backward compatible: a rollback reuses the
  target deploy's build artifact, start command, and environment
  variables, but it does not revert the database, the disk, or
  environment group values.
- Handle `SIGTERM` gracefully: after traffic switches to the new
  instance, the old instance has 60 seconds before Render sends
  `SIGTERM`, then a configurable shutdown delay (default 30 seconds,
  up to 300 seconds via `maxShutdownDelaySeconds`) before `SIGKILL`.
- Keep secrets out of `render.yaml` and out of the repository; use
  `sync: false` for values filled in from the dashboard.
- Use preview environments for pull requests when the project uses
  Blueprints, so every PR gets a realistic test environment that is
  cleaned up when the PR closes.

### Testing Strategy

- Test every pull request in its preview environment, with the
  Blueprint applied: a `render.yaml` change that fails validation must
  fail the PR, not the production deploy.
- Validate the Blueprint with the Render CLI before merging, so a
  malformed Blueprint never reaches the dashboard.
- Test migrations as backward compatible: the new code must run
  against the old schema, because a rollback reuses the target
  deploy's artifact and variables but does not revert the database.
- Test graceful shutdown: in-flight requests complete within the
  shutdown delay instead of being cut off by `SIGKILL`.
- Test the rollback path: rolling back to a previous deploy restores
  service, and health checks pass on the restored version.

## Best Practices

- Use auto-deploy on the production branch so every merge deploys, and
  use build filters when a monorepo should only deploy on changes to
  specific paths.
- Put database migrations in the pre-deploy command, not in the start
  command, so a failed migration fails the deploy before traffic
  switches.
- Set an explicit health check path that exercises the app's real
  readiness (including the database connection) rather than relying on
  port binding.
- Use environment groups for variables shared by several services, and
  keep service-level variables for values that differ per service;
  service-level values override group values.
- Keep the build fast: cache dependencies, and use a Dockerfile only
  when a native runtime cannot express the setup.
- Monitor the Events timeline after a deploy: it shows deploys,
  restarts, and autoscaling events in one place.
- Validate a Blueprint before syncing it:
  `render blueprints validate render.yaml`.

## Security Considerations

- Never commit secret values to `render.yaml` or to the repository;
  generated Blueprint files set `sync: false` for every variable for
  exactly this reason.
- Render Postgres is reachable from any IP address by default when the
  caller has valid credentials; restrict access with the database's
  IP allowlist where the plan supports it, and prefer the internal URL
  from Render services.
- Do not expose a database's external URL or credentials in client-side
  code, logs, or error messages.
- Restrict who can change service settings and environment variables in
  the Render workspace.
- Render terminates TLS at the load balancer and forwards requests to
  the service over HTTP; the application must trust the forwarded
  protocol headers instead of redirecting to HTTPS itself, or
  redirect loops result.
- Validate and sanitize all input in the application, as with any
  public endpoint.
- Keep dependencies updated; a deployed service keeps running the image
  it was built with until the next deploy.

## Performance Considerations

- Choose the service region close to the users and in the same region
  as the database; cross-region database calls add latency to every
  request.
- Static sites are served from Render's CDN; web services are not, so
  serve large static assets from a static site or object storage
  rather than from the web service.
- Set autoscaling (Pro workspaces and higher) with minimum and maximum
  instance counts and CPU or memory targets; Render scales by average
  utilization and waits a few minutes before scaling down.
- A service with an attached persistent disk cannot scale to multiple
  instances and loses zero-downtime deploys; keep disk-backed services
  single-instance by design.
- Enable storage autoscaling on Postgres so a full disk does not take
  the database down; storage can only grow, never shrink.
- Watch for deploys that increase error rates or latency; roll back
  rather than waiting for the problem to resolve itself.

## Common Mistakes

- Binding to `localhost` instead of `0.0.0.0` — Render cannot reach a
  service that only listens on loopback.
- Hardcoding a port — Render supplies `PORT` at runtime; read it from
  the environment.
- Storing uploads or generated files on the service filesystem without
  a disk — the filesystem is ephemeral and the files vanish on the
  next deploy.
- Committing secret values to `render.yaml` — declare them with
  `sync: false` and set them in the dashboard.
- Running migrations in the start command — a failed migration then
  crashes the new instance instead of failing the deploy cleanly; use
  the pre-deploy command.
- Adding a custom domain without updating DNS, or leaving stale `AAAA`
  records in place — verification fails until DNS is correct.
- Expecting a rollback to undo a database migration or a disk change —
  rollbacks cover the build artifact and service configuration only.
- Scaling a disk-backed service to multiple instances — persistent
  disks support a single instance only.

## Examples

A minimal `render.yaml` Blueprint for a web service and a database:

```yaml
services:
  - type: web
    name: my-app
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    preDeployCommand: npm run db:migrate
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: my-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: STRIPE_API_KEY
        sync: false

databases:
  - name: my-db
    plan: starter
```

Validate the Blueprint before syncing:

```bash
render blueprints validate render.yaml
```

A cron job and a background worker in the same Blueprint:

```yaml
services:
  - type: worker
    name: my-worker
    runtime: node
    buildCommand: npm ci && npm run build
    startCommand: npm run worker
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: my-db
          property: connectionString
  - type: cron
    name: nightly-report
    runtime: node
    schedule: "0 2 * * *"
    buildCommand: npm ci
    startCommand: npm run report
```

Verify a deployment after it goes live:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://my-app.onrender.com/health
curl -s -o /dev/null -w "%{http_code}\n" https://my-app.onrender.com/
```

## Validation Checklist

- [ ] The application builds locally and the web service binds to
      `0.0.0.0` on `$PORT`.
- [ ] The service deploys successfully and the `onrender.com` URL
      responds over HTTPS.
- [ ] The health check path is set and passes on the new instance.
- [ ] Environment variables are set; no secret value is committed to
      `render.yaml` or the repository.
- [ ] The database is in the same region and the service uses the
      internal URL.
- [ ] The custom domain is added, DNS is set, and verification passed.
- [ ] The rollback path is known: Rollback on the Deploys page, with
      the caveat that it does not revert the database or the disk.
- [ ] The Blueprint validates (`render blueprints validate`) when one
      is used.

## Expected Deliverables

- The Render service (and database, worker, or cron job) deployed and
  verified over HTTPS.
- The `render.yaml` Blueprint committed, when one is used, with secrets
  declared as `sync: false` or `generateValue: true`.
- The custom domain configured and verified, when one is used.
- Documentation of the deploy, rollback, and scaling steps for the
  service.

## References

- [Render Docs](https://render.com/docs) — services, datastores, and
  quickstarts.
- [Deploying on Render](https://render.com/docs/deploys) — auto-deploys
  and zero-downtime deploys.
- [Rollbacks](https://render.com/docs/rollbacks) — what a rollback
  reverts and what it does not.
- [Render Blueprints (IaC)](https://render.com/docs/infrastructure-as-code) —
  infrastructure as code with `render.yaml`.
- [Blueprint YAML Reference](https://render.com/docs/blueprint-spec) —
  every supported `render.yaml` field.
- [Persistent Disks](https://render.com/docs/disks) — disks, snapshots,
  and limitations.
- [Scaling Render Services](https://render.com/docs/scaling) — manual
  scaling and autoscaling.
- Related skills in this repository: `deployment`, `docker`, `ci-cd`,
  `github-actions`, `observability`, `secrets-management`, `railway`,
  `fly-io`, `self-hosted-vps`, `postgresql`.
