---
name: railway
description: >
  Use this skill when deploying and running applications on Railway:
  creating projects and services, deploying from GitHub or the Railway
  CLI, managing environment variables, adding custom domains, attaching
  persistent volumes, provisioning managed PostgreSQL and Redis,
  monitoring logs and metrics, scaling services, and rolling back
  deployments. Trigger keywords: Railway, railway CLI, railway up,
  deploy, service, project, environment, variables, domain, volume,
  Postgres, Redis, rollback, scaling, Railpack.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a Railway account, a Git repository or a local project directory, and network access to Railway.
---

# Railway

## Purpose

This skill covers deploying and operating applications on Railway: projects,
services, and environments; GitHub and CLI deployments; environment
variables; domains; persistent volumes; managed databases; monitoring;
scaling; and rollbacks. It produces a Railway deployment that is
reproducible, observable, and reversible.

## When to Use

- Creating a Railway project and deploying a web service, API, or worker.
- Connecting a GitHub repository for automatic deploys on push.
- Deploying from a local directory with the Railway CLI.
- Setting environment variables or referencing another service's variables.
- Adding a managed PostgreSQL, MySQL, Redis, or MongoDB database.
- Attaching a persistent volume to a service.
- Generating a Railway domain or adding a custom domain with TLS.
- Debugging a failed build or a crashing service with logs.
- Scaling a service or rolling back a bad deployment.

## When Not to Use

- Deploying to Vercel, Render, or Fly.io — use `vercel`, `render`, or
  `fly-io` instead.
- Self-hosting on your own server — use `self-hosted-vps`.
- Container image authoring in depth — use `docker`.
- General deployment strategy (blue-green, canary) — use `deployment`.
- Designing the CI pipeline that deploys — use `github-actions` or `ci-cd`.
- Monitoring strategy beyond Railway's built-in logs and metrics — use
  `observability`.

## Prerequisites

- A Railway account and a project (create one in the dashboard or with
  `railway init`).
- A Git repository (GitHub or GitLab) for automatic deploys, or a local
  project directory for CLI deploys.
- The application builds and runs locally, and listens on the port in the
  `PORT` environment variable that Railway injects at runtime.
- For CLI work: the Railway CLI installed (`npm install -g @railway/cli`)
  and authenticated with `railway login`.
- A Dockerfile only when the default builder cannot detect the project;
  Railway's Railpack builder auto-detects most frameworks, and a
  `Dockerfile` at the service root is used automatically when present.
- Current stable as of 2026-11-20. Railway's `railway.json` and
  `railway.toml` config-as-code files are deprecated in favor of
  Infrastructure as Code (a `.railway/railway.ts` file managed with
  `railway config plan` and `railway config apply`); do not start a new
  service on the old files. Confirm current status in the official docs.

## Official Documentation

- [Railway Documentation](https://docs.railway.com/) — the docs home for
  projects, services, deployments, variables, and databases.
- [Railway CLI: railway add](https://docs.railway.com/cli/add) — adding
  services and databases from the CLI.
- [Railway CLI: railway postgres](https://docs.railway.com/cli/postgres) —
  PostgreSQL point-in-time recovery, high availability, and PgBouncer.
- [Volume backups](https://docs.railway.com/volumes/backups) — backing up
  and restoring service volumes.
- [Restart policy](https://docs.railway.com/deployments/restart-policy) —
  how Railway restarts services after they exit.
- [Plans and image retention](https://docs.railway.com/pricing/plans#image-retention-policy) —
  plan limits, including how long deployment images are kept for rollback.
- [Manage deployments with the public API](https://docs.railway.com/integrations/api/manage-deployments) —
  rollback and redeploy through the API, including `deploymentRollback`.

## Required Workflow

1. Confirm the application runs locally and listens on `$PORT` (Railway
   injects the listen port at runtime; never hardcode a port).
2. Create the project: in the dashboard choose **New Project**, or run
   `railway init` from the project directory for a CLI-created project.
3. Add the service from its source: a GitHub repository (automatic
   deploys on push to the connected branch), a Docker image, or the
   local directory with `railway up`.
4. Add a managed database when the app needs one (`railway add` and pick
   a database, or add it from the project canvas). Railway provisions it
   and injects the connection variables.
5. Set environment variables in the service's Variables tab or with
   `railway variables set KEY=value`. Reference another service's
   variable with `${{ServiceName.VARIABLE}}`, for example
   `${{Postgres.DATABASE_URL}}`.
6. Expose the service: **Settings → Networking → Generate Domain** for a
   `*.up.railway.app` domain with TLS, or add a custom domain and set
   the CNAME record at the DNS provider.
7. Deploy and verify: push to the connected branch, or run `railway up`
   and watch `railway logs`. Confirm the public URL responds over HTTPS.
8. Set up a staging environment (a second Railway environment in the
   same project) and verify deploys there before production changes.
9. Record the rollback path before the first production deploy: the
   Deployments tab offers Rollback within the plan's image retention
   window, and Redeploy rebuilds from the original source.

## Implementation Standards

- One service per deployable thing: web API, worker, and database are
  separate services in one project, not one service doing everything.
- Services in the same project and environment communicate over
  Railway's private network using
  `${{ServiceName.RAILWAY_PRIVATE_DOMAIN}}`; only services that users
  reach directly get a public domain.
- Never bake secrets into the image or commit them; set them as Railway
  variables, and use variable references for database connection
  strings instead of copying credentials.
- Keep the build and start commands explicit in the service settings
  when auto-detection guesses wrong, and keep them in version control
  through Infrastructure as Code where the project uses it.
- Treat the service filesystem as ephemeral: anything that must survive
  a redeploy lives on an attached volume or in a managed database.
- Make database migrations backward compatible: a rollback restores the
  old image and variables, not the old database schema.
- Use separate environments (production, staging, PR environments) with
  separate variables; never point a staging service at the production
  database.
- Check pricing on the official pricing page before sizing a service;
  Railway bills for usage, so an idle service with generous resources
  still costs money.

### Testing Strategy

- Test every change in a PR or staging environment before production,
  with its own variables and database — staging must never point at
  the production database.
- Test migrations as backward compatible: the new code must run
  against the old schema, because a rollback restores the old image,
  not the old schema.
- Test the rollback path itself: restoring a previous deployment must
  bring back the old image and variables and leave the service
  healthy.
- Test private-network connectivity between services in staging, and
  test that data on an attached volume survives a redeploy.

## Best Practices

- Use GitHub integration so every push deploys automatically and every
  deployment is traceable to a commit.
- Use `railway run <command>` to run one-off commands (migrations,
  seeds, shells) with the service's environment variables, instead of
  copying credentials to a local machine.
- Add a health check path in the service settings so Railway can tell a
  healthy deployment from a broken one.
- Keep `railway logs` open during a deploy; use `railway logs -b` for
  build logs, which are separate from runtime logs.
- Use `railway status` before running CLI commands that change state,
  so you know which project, environment, and service you are touching.
- Prefer the dashboard's Rollback over Redeploy when the image is still
  within the retention window; it restores the image without a rebuild.
- Pin the database to a major-version image tag (for example `:16`) when
  the service uses Railway's official Postgres images; minor tags and
  `:latest` are not supported for PITR and HA features.

## Security Considerations

- Never expose a database publicly unless there is a specific reason;
  services reach the database over the private network, and local
  access goes through `railway run` or the dashboard.
- Variable values are secrets: never paste `railway variables` output
  into chat, tickets, or logs, and never echo variables in build output.
- Restrict who can change production variables and trigger deploys;
  Railway project access controls who can see secrets.
- Use a generated, high-entropy value for session secrets and API keys;
  rotate a secret immediately if it was ever committed or shared.
- Validate and sanitize all input in the application, as with any
  public endpoint; Railway's TLS terminates at the edge, it does not
  validate requests.
- Keep the app's dependencies updated; a deployed service keeps running
  the image it was built with until the next deploy.

## Performance Considerations

- Railway bills for usage (CPU, memory, network, storage), so right-size
  each service: start small, watch the metrics in the dashboard, and
  scale up only when the metrics justify it.
- Cold starts do not apply the way they do on serverless platforms —
  Railway services stay running — but a service that crashes and
  restarts repeatedly burns usage and drops requests; fix the crash
  rather than raising the restart limit.
- Use the private network for service-to-service calls; public domains
  add a round trip through the edge.
- For connection-heavy workloads against Postgres, enable PgBouncer
  connection pooling (`railway postgres pgbouncer`) instead of opening
  a new connection per request.
- Keep build times down with a small build context and cached
  dependencies; every redeploy rebuilds unless the image is reused by
  a rollback.

## Common Mistakes

- Hardcoding a listen port — Railway injects `PORT` at runtime; read it
  from the environment or the service never receives traffic.
- Expecting a public URL by default — services get no external URL until
  a domain is generated or a custom domain is added.
- Writing files to the local filesystem and expecting them to persist —
  the filesystem is ephemeral; use a volume or a database.
- Copying a database password into the app's variables by hand — use a
  `${{ServiceName.VARIABLE}}` reference so rotation and re-provisioning
  keep working.
- Putting secrets in `railway.json` or a Dockerfile `ENV` — variables
  belong in Railway's variable store, never in version control or image
  layers.
- Rolling back after the image retention window has passed — Rollback
  disappears and only Redeploy (a rebuild from source) remains.
- Deploying straight to production — use a staging environment first.

## Examples

Install the CLI, authenticate, and deploy the current directory:

```bash
npm install -g @railway/cli
railway login
railway init        # or: railway link, for an existing project
railway up          # build and deploy the current directory
railway logs        # stream runtime logs
```

Add a managed PostgreSQL database and reference it from the app:

```bash
railway add --database postgres
railway variables set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
```

Set a variable and run a one-off command with the service's environment:

```bash
railway variables set NODE_ENV=production
railway run npm run db:migrate
```

Check what is linked, then redeploy the same code after a variable change:

```bash
railway status
railway redeploy
```

A minimal `Dockerfile` that respects Railway's injected port:

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
USER node
CMD ["node", "index.js"]
```

The application reads the port at runtime (never hardcode it):

```js
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0");
```

## Validation Checklist

- [ ] The application runs locally and listens on `$PORT`.
- [ ] The project, service, and environment are linked
      (`railway status` shows the expected targets).
- [ ] The deployment succeeds and the public URL responds over HTTPS.
- [ ] Environment variables are set in Railway, including the database
      reference; no secret is committed or baked into the image.
- [ ] Logs show the service healthy with no crash loop.
- [ ] The rollback path is known (Rollback within the retention window,
      Redeploy otherwise).
- [ ] Staging exists and is verified before production changes.

## Expected Deliverables

- The Railway project with the service deployed and verified over HTTPS.
- Environment variables set, including database references.
- The custom domain configured and verified, when one is used.
- Documentation of the deploy, rollback, and monitoring steps for the
  service.

## References

- [Railway Documentation](https://docs.railway.com/) — projects,
  services, deployments, variables, and databases.
- [Railway CLI: railway add](https://docs.railway.com/cli/add) — adding
  services and databases from the CLI.
- [Railway CLI: railway postgres](https://docs.railway.com/cli/postgres) —
  PostgreSQL backups, HA, and connection pooling.
- [Volume backups](https://docs.railway.com/volumes/backups) — volume
  backup and restore.
- Related skills in this repository: `deployment`, `docker`, `ci-cd`,
  `github-actions`, `observability`, `secrets-management`, `render`,
  `fly-io`, `self-hosted-vps`, `postgresql`.
