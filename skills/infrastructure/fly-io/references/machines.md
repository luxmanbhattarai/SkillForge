# Machines: volumes, sizing, shutdown

- Treat a volume as a single-host disk: it lives on one host, attaches
  to one Machine, and is not replicated. Data that must survive a host
  failure needs an off-platform backup in addition to Fly.io's
  snapshots.
- Keep `[[vm]]` sizing in `fly.toml` when the app has explicit size
  requirements; each deploy applies those values and overrides
  `fly scale vm`.
- Handle shutdown gracefully: Fly.io sends `kill_signal` (default
  `SIGINT`) and waits `kill_timeout` (default 5 seconds, up to 300)
  before forcing the Machine down.
