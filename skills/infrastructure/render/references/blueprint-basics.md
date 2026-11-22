# Blueprint basics: source of truth, ephemeral disk, internal URLs

- Keep the Blueprint as the source of truth when one exists: services,
  databases, and environment groups are declared in `render.yaml`, and
  dashboard-only drift is avoided.
- Treat the service filesystem as ephemeral: anything that must survive
  a deploy lives on a persistent disk or in a managed datastore.
- Use the internal database URL for services in the same region; the
  external URL traverses the public internet and is slower.
