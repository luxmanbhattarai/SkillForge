# Production Deployment

Deploy an application to production infrastructure: provision the
target, roll out the release, verify health, and be ready to roll
back. This workflow covers the deployment mechanics; the release
event itself (versioning, changelog, go/no-go) follows
`workflows/production-release.md`.

## Inputs

- The release artifact or version to deploy.
- The deployment target and its infrastructure (host, region, scale).
- The rollback requirement and the maintenance window, if any.

## Steps

1. **Confirm the target** (`deployment`). Decide where the release
   goes: `cloudflare-workers`, `vercel`, `aws`, `gcp`,
   `kubernetes`, `fly-io`, `railway`, `render`, or
   `self-hosted-vps`. Confirm the environment matches what was
   tested.
2. **Provision or confirm infrastructure.** Infrastructure changes go
   through code (`terraform` or `pulumi`) and review — never by hand
   in a console. Confirm the target can run the new version.
3. **Check configuration and secrets.** Confirm environment variables
   and secrets are set in the target environment. Never deploy with
   placeholder or missing secrets.
4. **Deploy to staging or preview first.** Verify the release there
   before production. If staging does not exist, say so — do not
   treat production as the test environment.
5. **Choose the rollout.** Rolling, blue-green, or canary, as the
   platform supports. For risky changes, roll out to a fraction of
   traffic first and watch it.
6. **Deploy to production.** Run the deployment and confirm the new
   version is serving traffic.
7. **Verify health** (`observability`). Check health endpoints, logs,
   metrics, and error rates. Compare against the pre-deploy baseline.
8. **Confirm the rollback.** If the deployment fails verification,
   roll back immediately using the tested rollback path — do not
   debug in production while users are affected. Record what failed
   for a post-mortem.
9. **Watch after deploy.** Monitor error rates and latency for the
   agreed watch window before calling the deployment done.

## Outputs

- Deployed version, verified healthy in production.
- Rollout and rollback record.
- Health and error-rate comparison against the pre-deploy baseline.
- A note of any infrastructure changes made.

## Checks

- [ ] Staging or preview verified before production.
- [ ] Secrets and configuration confirmed in the target environment.
- [ ] Rollback path known and tested before deploying.
- [ ] Health checks, logs, and metrics verified after deploy.
- [ ] Failed deploys roll back instead of being debugged live.
- [ ] Infrastructure changes are in code and reviewed.
