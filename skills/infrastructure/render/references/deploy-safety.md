# Deploy safety: backward-compatible migrations, graceful shutdown

- Make database migrations backward compatible: a rollback reuses the
  target deploy's build artifact, start command, and environment
  variables, but it does not revert the database, the disk, or
  environment group values.
- Handle `SIGTERM` gracefully: after traffic switches to the new
  instance, the old instance has 60 seconds before Render sends
  `SIGTERM`, then a configurable shutdown delay (default 30 seconds,
  up to 300 seconds via `maxShutdownDelaySeconds`) before `SIGKILL`.
