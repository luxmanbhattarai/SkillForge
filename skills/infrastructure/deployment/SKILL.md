---
name: deployment
description: >
  Use this skill when planning and executing a deployment: choosing a
  deployment strategy, preparing a release, deploying to staging and
  production, verifying a deployment, rolling back a bad release, and
  managing environment configuration. Trigger keywords: deploy,
  deployment, release, production, staging, rollback, blue-green, canary,
  environment, deploy strategy, go live, launch.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Deployment

## Purpose

This skill covers the deployment process end to end: preparing a release,
deploying it safely, verifying it works, and rolling it back when it does
not. It produces deployments that are repeatable, verifiable, and
reversible.

## When to Use

- Planning how a project deploys to staging and production.
- Choosing a deployment strategy (direct, blue-green, canary, rolling).
- Preparing a release: versioning, changelog, and pre-deploy checks.
- Executing a deployment and verifying it afterward.
- Rolling back a bad deployment.
- Managing environment-specific configuration across environments.

## When Not to Use

- Platform-specific deploy commands — use `vercel` for Vercel,
  `cloudflare-workers` for Workers, or `docker` for containers.
- Writing the CI pipeline that performs the deploy — use `github-actions`
  or `ci-cd`.
- Monitoring a deployed service — use `observability`.
- Database migrations as part of a deploy — see `cloudflare-d1` for D1
  migrations.

## Prerequisites

- A deployment target and a working deploy command or pipeline.
- Separate staging and production environments for a user-facing service.
- Environment configuration and secrets set for each environment.
- A way to verify the deployment: smoke tests, health endpoints, or
  manual checks.
- A rollback path identified before the first production deploy.

## Official Documentation

- [Vercel Documentation](https://vercel.com/docs) — deployments, domains,
  and rollbacks on Vercel.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  deploying Workers with Wrangler.
- [Docker Docs](https://docs.docker.com/) — container builds and runs.

## Required Workflow

1. Confirm the release contents: the commit or version being deployed,
   and what changed since the last release.
2. Run the full check suite (lint, type check, tests, build) and confirm
   it passes.
3. Deploy to staging first and verify the staging deployment with smoke
   tests.
4. Confirm environment variables and secrets are set for production.
5. Deploy to production using the automated pipeline, not a manual
   command from a developer machine.
6. Verify the production deployment: check the health endpoint, the main
   pages or API routes, and the deployment logs.
7. Monitor error rates and logs for a period after the deploy.
8. If verification fails, roll back immediately using the pre-planned
   rollback path, then investigate.

## Implementation Standards

- Every deployment is traceable to a commit SHA and a pipeline run.
- Deploy to staging before production, every time, without exception.
- Keep deployments small and frequent rather than large and rare; small
  deploys are easier to verify and roll back.
- Make database changes backward compatible: deploy code that works with
  both the old and new schema, then migrate, then remove the old code.
- Never deploy on a Friday evening or before a holiday unless the team
  has agreed to it and someone is on call.
- Record the rollback commit or the platform rollback action before
  deploying.
- Verify after every deploy; a deploy is not done when the command
  finishes, it is done when verification passes.

## Best Practices

- Use a health endpoint (`/health` or similar) that checks the
  application's dependencies and returns a clear status.
- Automate smoke tests that run after every deploy and hit the critical
  paths.
- Keep a deployment log: date, version, who deployed, what changed, and
  the verification result.
- Use feature flags for risky changes so a feature can be turned off
  without a redeploy.
- Communicate the deploy to the team: what is going out, when, and who
  is watching.
- Prefer the platform's rollback feature over redeploying an old commit
  when both are available; it is usually faster.

## Security Considerations

- Production secrets must never appear in deployment logs or in the
  release notes.
- Restrict who can deploy to production; use environment approvals in
  the CI platform.
- Verify the deployment artifact: deploy the exact artifact that was
  tested in staging, not a rebuild.
- Check that the production deployment serves HTTPS and that the TLS
  certificate is valid.
- Review the release diff for accidental inclusion of debug code,
  test data, or secrets.

## Performance Considerations

- Deploy during low-traffic windows when the change is risky or the
  platform does not support zero-downtime deploys.
- Warm caches after a deploy that changes cached content, or accept a
  short period of slower responses.
- Watch for a deploy that increases error rates or latency; that is a
  signal to roll back, not to wait.
- Keep the deploy fast by caching dependencies and reusing build
  artifacts between staging and production.

## Common Mistakes

- Deploying straight to production without a staging check — staging
  exists to catch problems before users do.
- Treating "the deploy command succeeded" as "the deploy worked" —
  verify the live service afterward.
- Deploying a large, unreviewed change — small, frequent deploys are
  safer and easier to roll back.
- No rollback plan — a bad deploy becomes a long outage.
- Changing the database schema and the code in the same deploy without
  backward compatibility — a rollback then breaks the old code.
- Deploying and walking away — monitor the service after the deploy.

## Examples

Pre-deploy checklist for a production release:

```text
- [ ] All checks pass on the release commit.
- [ ] Changelog updated and version bumped.
- [ ] Staging deploy verified with smoke tests.
- [ ] Production environment variables confirmed.
- [ ] Rollback commit recorded.
- [ ] Team notified of the deploy window.
```

Post-deploy verification commands:

```bash
# Health endpoint
curl -s -o /dev/null -w "%{http_code}\n" https://example.com/health

# Main page
curl -s -o /dev/null -w "%{http_code}\n" https://example.com/

# API route
curl -s https://example.com/api/status
```

Rollback on Cloudflare Workers (redeploy the previous known-good commit):

```bash
git checkout <previous-commit-sha>
npx wrangler deploy
git checkout main
```

## Validation Checklist

- [ ] The release commit passed the full check suite.
- [ ] Staging was deployed and verified before production.
- [ ] Production environment variables and secrets are set.
- [ ] The production deployment was verified with smoke tests.
- [ ] The rollback path is documented and the rollback commit is recorded.
- [ ] Logs and error rates were checked after the deploy.

## Expected Deliverables

- The production deployment completed and verified.
- A deployment record: version, commit, environment, verification result.
- Documentation of the rollback path.
- Any issues found during verification, with follow-up actions.

## References

- [Vercel Documentation](https://vercel.com/docs) — deployments and
  rollbacks on Vercel.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  deploying Workers.
- Related skills in this repository: `ci-cd`, `github-actions`, `docker`,
  `vercel`, `cloudflare-workers`, `observability`.
