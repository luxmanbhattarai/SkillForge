---
name: tauri
description: >
  Build cross-platform desktop apps with Tauri 2: a Rust core with a webview
  frontend, type-safe IPC commands and events, the capabilities and
  permissions system, official plugins (filesystem, dialog, shell, updater),
  window management, code signing, auto-updates, and per-OS packaging. Use
  when creating or extending a Tauri v2 app, writing Rust commands called
  from the frontend, fixing "not allowed" permission errors, adding a
  plugin, or shipping signed, auto-updating desktop builds.
license: MIT
metadata:
  version: "1.0.0"
  category: desktop
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Tauri

## Purpose

This skill covers building production desktop applications with Tauri 2:
scaffolding a project, writing a Rust backend exposed to the frontend
through commands and events, locking down native access with capabilities
and permissions, adding official plugins, and shipping signed,
auto-updating installers for macOS, Windows, and Linux. The outcome is a
small, fast desktop app whose webview frontend can only reach the native
APIs it was explicitly granted.

## When to Use

- Creating a new desktop app with a web frontend (any framework) and a
  Rust backend.
- Adding Tauri to an existing web frontend project.
- Writing Rust commands and calling them from the frontend with `invoke`,
  or pushing data to the frontend with events and channels.
- Adding native capability through an official plugin: filesystem,
  dialog, shell, notification, updater, clipboard, global shortcut.
- Fixing a Tauri command or plugin call that fails with a permission
  error or silently does nothing.
- Setting up code signing, notarization, packaging, or auto-updates for
  a Tauri app.
- Migrating a Tauri v1 app to Tauri 2.

## When Not to Use

- Building an app that needs the Node.js ecosystem in the backend
  process (npm packages, Node-only libraries) — use `electron` instead.
- Building a web-only application with no desktop distribution — use
  `astro`, `nextjs`, or `react` instead.
- Writing Rust that is not tied to a Tauri app (a CLI, library, or
  server) — use `rust` instead.
- A mobile-only app: Tauri 2 supports iOS and Android, but this skill
  covers the desktop flow; mobile targets need the Android/iOS
  toolchains and store distribution on top.

## Prerequisites

- Rust 1.90 or newer installed via rustup (the minimum supported Rust
  version for Tauri 2.12). Tauri 2.12.x is the current stable line as
  of 2026-11-20; Tauri 2.0 went stable on 2024-10-02. Check the
  official release notes for the newest patch before starting.
- Platform toolchain: macOS needs Xcode Command Line Tools; Windows
  needs MSVC Build Tools and WebView2; Linux needs the WebKitGTK 4.1
  development packages and a C toolchain. See the official
  prerequisites guide for the exact package list per distribution.
- Node.js LTS and a package manager if the frontend is JavaScript or
  TypeScript (not needed for a Rust frontend such as Yew or Leptos).
- A bundle identifier in reverse-domain form (for example
  `com.example.notes`) — it decides where user data lives and must not
  change after release.
- Tauri 1.x knowledge does not transfer directly: v1's `allowlist` in
  `tauri.conf.json` and the `@tauri-apps/api/tauri` import are gone in
  v2. This skill covers v2 conventions only.

## Official Documentation

- [Tauri v2 documentation](https://v2.tauri.app/) — guides, concepts,
  and tutorials for developing and distributing Tauri applications.
- [Prerequisites](https://v2.tauri.app/start/prerequisites/) — exact
  toolchain and system packages per platform.
- [Create a Project](https://v2.tauri.app/start/create-project/) —
  scaffolding with `create-tauri-app` and its framework templates.
- [CLI reference](https://v2.tauri.app/reference/cli/) — `dev`,
  `build`, `add`, `remove`, `migrate`, `info`, `signer`, and the
  capability and permission subcommands.
- [Capability reference](https://v2.tauri.app/reference/acl/capability/) —
  the capability file schema: identifier, windows, webviews,
  permissions, platforms, remote URLs.
- [Tauri releases](https://v2.tauri.app/release/) — release notes for
  the core crates, the CLI, and the plugins.
- [Tauri 2.12 release notes](https://v2.tauri.app/blog/tauri-2.12/) —
  MSRV 1.90, dropped Windows 7 support, webview permission handler.
- [Plugins workspace](https://github.com/tauri-apps/plugins-workspace) —
  source and documentation for the official plugins.
- [create-tauri-app](https://github.com/tauri-apps/create-tauri-app) —
  the official scaffolding tool.

## Required Workflow

1. Confirm the toolchain: run `rustc --version` (1.90 or newer),
   `cargo --version`, and the platform prerequisites from the official
   guide. Run `npx tauri info` (or `cargo tauri info`) in an existing
   project to see the detected environment.
2. Scaffold with `npm create tauri-app@latest` (or the equivalent for
   pnpm, yarn, bun, deno, or Cargo) and pick a frontend template, or
   add Tauri to an existing frontend with `npm install -D
   @tauri-apps/cli@latest` followed by `npx tauri init`.
3. Learn the layout: `src-tauri/` holds `Cargo.toml`, `build.rs`
   (`tauri_build::build()`), `tauri.conf.json`, `capabilities/`, and
   `src/lib.rs` (app code: commands, plugins, setup) plus `src/main.rs`
   (a thin desktop entry point that calls into `lib.rs`; leave it as
   is).
4. Design the IPC surface before writing code: list every command the
   frontend needs, what arguments it takes, and what native access it
   requires. The frontend is untrusted input; every command validates
   its arguments on the Rust side.
5. Implement commands in `src-tauri/src/lib.rs` with
   `#[tauri::command]`, register them with `.invoke_handler()`, and
   call them from the frontend with `invoke` from
   `@tauri-apps/api/core`. Use events (`app.emit` / `listen`) or
   channels for frontend-bound pushes and streaming results.
6. Grant access in `src-tauri/capabilities/`: one capability file per
   window group, listing exactly the permissions that group needs
   (`core:default`, plugin permissions such as `dialog:open`, scoped
   filesystem permissions). No capability means no IPC access at all.
7. Add plugins with the CLI (`npm run tauri add fs`), which updates
   `Cargo.toml`, registers the plugin in `lib.rs`, and adds the
   permissions — then verify all three agree before testing.
8. Hold shared state with `tauri::State` and a `Mutex` (or
   `RwLock`); register it with `.manage()`. Keep long-running or
   blocking work off the command thread with `async` commands or
   `tauri::async_runtime::spawn`.
9. Run `npm run tauri dev` and test each command from the frontend;
   check the DevTools console and the terminal (`RUST_LOG=tauri=debug`)
   for permission errors.
10. Configure `tauri.conf.json` for distribution: bundle identifier,
    product name, version, window defaults, bundle targets per OS,
    and updater endpoints plus public key if auto-updates are used.
11. Build with `npm run tauri build`, sign per platform (Developer ID
    + notarization on macOS, Authenticode on Windows), and publish
    through CI (the `tauri-apps/tauri-action` GitHub Action handles
    signing, notarization, and uploading to GitHub Releases).

## Implementation Standards

- Tauri 2 only. Never write v1 patterns: no `allowlist` block, no
  `@tauri-apps/api/tauri` import, no `tauri.conf.json` v1 schema. If a
  v1 project must be upgraded, use `npm run tauri migrate` and then
  hand-write capabilities for every API the app uses.
- App logic lives in `src-tauri/src/lib.rs`, not `main.rs`. The
  library-crate split exists because mobile targets need the app as a
  library; keep `main.rs` a thin entry point.
- Commands return `Result<T, E>` where `E: Serialize` (a `String` or a
  `serde`-serializable error type). Never `panic!` or `unwrap()` on
  frontend-supplied data; a panicking command kills the app.
- Commands are async by default in spirit: use `async fn` commands for
  I/O, and move CPU-heavy or blocking work to
  `tauri::async_runtime::spawn_blocking` so the webview IPC thread
  never stalls.
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
- Plugin setup order matters: add the crate to `Cargo.toml`, register
  the plugin in `lib.rs` (`.plugin(...)`), and grant its permissions
  in a capability file. A missing step produces a "not allowed"
  error, not a "plugin not registered" error.
- Store app data under the paths from the path API
  (`app_data_dir`, `app_config_dir`) rather than hand-built paths;
  they resolve per OS and per bundle identifier.
- Keep the frontend bundle self-contained. Remote URLs must never be
  granted capability access (`remote` in a capability file) unless
  the app genuinely embeds a trusted remote origin, and then only
  with the minimum permissions.
- Database access belongs in Rust: run SQLite (or another embedded
  store) behind commands, never from the webview. See `sqlite` for
  schema and query guidance.
- Pin the Rust toolchain for the team with a `rust-toolchain.toml`
  (see `rust`) so local builds and CI use the same compiler.

### Accessibility

- The webview UI follows web accessibility (see `accessibility`):
  semantic HTML, keyboard-operable controls, visible focus, and
  WCAG 2.2 AA contrast. Native menus and dialogs must be
  keyboard-operable.
- Respect OS settings the app renders against: high-contrast mode
  and reduced motion. Test with the platform screen reader
  (NVDA on Windows, VoiceOver on macOS).

### Testing Strategy

- Unit-test commands in Rust (`cargo test`), including malformed
  frontend input: a command must return a serializable error, never
  `panic!` or `unwrap()` on untrusted data.
- Test capability files directly: an API call without a granted
  permission must fail with a clear "not allowed" error in
  development, and a production build must not ship broad permissions.
- Test the frontend with mocked `invoke` calls (Vitest or the
  framework's runner) so UI logic is covered without a webview.
- Test on every target OS in CI (macOS, Windows, Linux runners):
  webview behavior, paths, and signing differ per platform and only
  fail on the real OS.
- Test the updater flow against a staging release before shipping it,
  and test deep links and file associations on each platform.

## Best Practices

- Start from the smallest capability set and add permissions one at a
  time as features land; audit the capability files before every
  release.
- Use typed command arguments and return values with `serde` structs
  so the frontend and backend agree on shape; generate TypeScript
  bindings from the Rust types where the project uses codegen.
- Prefer events over polling for backend-to-frontend updates, and
  channels (`tauri::ipc::Channel`) for streaming progress such as
  download or processing status.
- Keep windows few and purposeful: one main window plus dialogs or a
  settings window. Each extra window is a new capability surface to
  audit.
- Use the `log` plugin or `RUST_LOG` env filtering for diagnostics;
  never ship `console.log` of sensitive data in production builds.
- Build release artifacts in CI on all three target OS runners
  (macOS, Windows, Linux) rather than cross-compiling; Tauri bundling
  is platform-native.
- Version the app in one place (`tauri.conf.json` version, mirrored
  from `package.json` / `Cargo.toml` by the project tooling) so the
  updater's version comparison is reliable.

## Security Considerations

- The webview is untrusted by default. Capabilities are the security
  boundary: a window with no capability cannot call any command, and
  a capability grants only the listed permissions to the listed
  windows. Treat capability files as security policy and review them
  like code.
- Validate every command argument in Rust: paths must be canonicalized
  and checked to stay inside the intended directory (reject `..`
  traversal), shell arguments must never be built from raw frontend
  strings, and numeric inputs must be range-checked.
- Filesystem scope is the main blast radius. Grant read/write only to
  the directories the feature needs (app data, user-selected files
  via the dialog plugin). `fs:read-all` in a shipped app lets any
  frontend vulnerability read arbitrary files the OS user can read.
- Never grant `shell:allow-execute` with an open scope. Each allowed
  program gets an explicit argument allowlist; user input becomes a
  validated argument, never part of a shell string.
- Do not load remote content into a window that has capabilities, and
  do not grant `remote` capability access to origins you do not
  control. A compromised remote page with IPC access is a full native
  compromise.
- Set a Content Security Policy in `tauri.conf.json`
  (`app.security.csp`) that restricts sources to the app itself; the
  default Tauri CSP is a starting point, not a finished policy for
  apps that fetch remote data.
- Updater signatures are mandatory and cannot be disabled: every
  update artifact is verified against the public key in
  `tauri.conf.json` before install. Guard the private signing key
  like a production credential — store it in CI secrets, never in the
  repository. See `secrets-management`.
- OS code signing is separate from updater signing: sign the app
  bundle (Developer ID on macOS, Authenticode on Windows) and
  notarize macOS builds, or Gatekeeper and SmartScreen will block the
  app regardless of updater signatures.
- Run `cargo audit` and `cargo deny check` on the Rust side (see
  `rust` and `dependency-security`) and `npm audit` on the frontend
  side before every release.

## Performance Considerations

- Tauri apps are small because they use the OS webview (WebView2 on
  Windows, WebKit on macOS, WebKitGTK on Linux) instead of bundling
  Chromium; keep the frontend bundle lean so startup stays fast.
- IPC calls serialize through JSON: keep command payloads small, avoid
  round-tripping large blobs through `invoke`, and stream large
  results over a channel instead of returning one giant value.
- Never block a command on synchronous I/O or heavy computation; use
  `async` commands and `spawn_blocking`. A blocked command thread
  stalls all IPC from that webview.
- Prefer the Rust side for file and database work: reading a large
  file in Rust and sending parsed results is far cheaper than sending
  raw bytes to the frontend to parse.
- Build release binaries with the default release profile; check
  binary size and startup time on the slowest target OS before
  release, and profile the Rust side with standard Rust tooling (see
  `rust`).

## Common Mistakes

- Command silently does nothing — almost always a missing capability
  or permission. Check the DevTools console for the rejected promise,
  then the capability file, then whether the plugin is registered in
  `lib.rs`.
- Copying Tauri v1 examples — `allowlist`, `tauri.conf.json` v1
  fields, or `@tauri-apps/api/tauri` imports fail or silently do
  nothing in v2. Verify every example against the v2 docs.
- Using `shell:allow-open` — deprecated since 2.1; use the opener
  plugin (`opener:allow-open`) instead.
- Adding a plugin to `Cargo.toml` only — the plugin must also be
  registered in `lib.rs` and granted permissions in a capability
  file, or calls fail with "not allowed".
- `unwrap()` on frontend input in a command — a malformed argument
  panics the app. Return a `Result` and a serializable error.
- Shipping `fs:read-all` / `fs:write-all` — convenient in development,
  an over-broad grant in production. Scope filesystem access to the
  directories the app needs.
- Forgetting the updater public key or endpoint — the updater plugin
  validates its config at startup; a missing or placeholder endpoint
  can crash the app on launch. Register the updater only in release
  builds if dev builds have no endpoint.
- Changing the bundle identifier after release — user data lives
  under the identifier, so a change orphans existing data.

## Examples

A minimal command, its registration, and a frontend call:

```rust
// src-tauri/src/lib.rs
use tauri::{AppHandle, Manager};

#[tauri::command]
fn greet(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.len() > 100 {
        return Err("name must be 1-100 characters".to_string());
    }
    Ok(format!("Hello, {name}!"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```ts
// Frontend (TypeScript)
import { invoke } from "@tauri-apps/api/core";

const greeting = await invoke<string>("greet", { name: "Ada" });
```

A capability file granting the main window dialog access and scoped
app-data filesystem access:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Permissions for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:open",
    "fs:allow-app-data-read",
    "fs:allow-app-data-write"
  ]
}
```

Checking for updates with the updater plugin:

```ts
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const update = await check();
if (update) {
  await update.downloadAndInstall();
  await relaunch();
}
```

## Validation Checklist

- [ ] `npm run tauri dev` starts the app and every command works from
      the frontend with no permission errors in the console.
- [ ] Each capability file grants only the permissions its windows
      need; no `fs:read-all`, `fs:write-all`, or unscoped
      `shell:allow-execute` in a shipping build.
- [ ] Every command validates frontend-supplied arguments and returns
      a serializable `Result`, with no `unwrap()` on user input.
- [ ] `npm run tauri build` produces installers on each target OS,
      signed (and notarized on macOS).
- [ ] The updater is configured with a real endpoint and public key,
      and a signed update installs and relaunches cleanly.
- [ ] `cargo clippy`, `cargo fmt --check`, `cargo audit`, and
      `cargo deny check` pass on the Rust side.

## Expected Deliverables

- A Tauri 2 project that builds and runs on the target operating
  systems, with commands, capability files, and plugins wired
  correctly.
- Capability files that document exactly which windows may call which
  native APIs.
- Signed, packaged installers per OS, plus updater configuration when
  auto-updates are required.
- A short note on any v1 patterns found and replaced, and any
  permissions deliberately granted beyond the minimum with the reason.

## References

- [Tauri v2 documentation](https://v2.tauri.app/) — guides and
  concepts for developing and distributing Tauri applications.
- [Prerequisites](https://v2.tauri.app/start/prerequisites/) — per-platform
  toolchain and system packages.
- [CLI reference](https://v2.tauri.app/reference/cli/) — dev, build,
  add, migrate, signer, capability and permission commands.
- [Capability reference](https://v2.tauri.app/reference/acl/capability/) —
  capability file schema.
- [Tauri releases](https://v2.tauri.app/release/) — release notes for
  core crates, CLI, and plugins.
- Related skills in this repository: `rust`, `electron`,
  `typescript`, `sqlite`, `unit-testing`, `secrets-management`,
  `dependency-security`.
