# Deploy checks: release migrations and health checks

- Run database migrations as a release command (`[deploy]
  release_command`) so they run in a temporary Machine before the new
  release starts serving traffic; keep migrations backward compatible,
  because a rollback redeploys the old image, not the old schema.
- Define real health checks (`[[http_service.checks]]`) that reflect
  readiness, including the database connection where the app depends
  on one; a deploy that fails its health checks stops the rollout
  instead of replacing every Machine with a broken version.
