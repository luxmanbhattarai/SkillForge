# Capabilities and permissions

- Capability files live in `src-tauri/capabilities/` as JSON or TOML,
  with a `$schema` pointing at the generated desktop schema. Scope
  windows by label (`"windows": ["main"]`); avoid `"*"` unless every
  window genuinely needs the same access.
- Prefer scoped filesystem permissions (`fs:allow-app-data-read`,
  `fs:allow-app-data-write`, path-scoped `fs:scope-*`) over the
  broad `fs:read-all` / `fs:write-all`. Broad permissions are a
  development convenience, not a shipping configuration.
- Shell access is allowlisted per command: `shell:allow-execute`
  requires an explicit scope naming the binary and allowed arguments.
  Wildcards are blocked by default. Opening URLs and files uses the
  opener plugin (`opener:allow-open`); `shell:allow-open` is
  deprecated since Tauri 2.1.
