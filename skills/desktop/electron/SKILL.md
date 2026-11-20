---
name: electron
description: >
  Build cross-platform desktop apps with Electron: main and renderer
  process architecture, secure IPC with ipcMain, ipcRenderer, and
  contextBridge, preload scripts, context isolation and process
  sandboxing, native APIs (menus, dialogs, tray, notifications),
  auto-updates with electron-updater and the built-in autoUpdater,
  code signing and notarization, and packaging with electron-builder
  or Electron Forge. Use when creating or extending an Electron app,
  wiring IPC between main and renderer, hardening an Electron app's
  security, or shipping signed, auto-updating desktop builds.
license: MIT
metadata:
  version: "1.0.0"
  category: desktop
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Electron

## Purpose

This skill covers building production desktop applications with
Electron: the main/renderer process model, secure inter-process
communication through preload scripts and `contextBridge`, native
desktop APIs, auto-updates, code signing and notarization, and
cross-platform packaging. The outcome is an Electron app that keeps
Node.js power in the main process, exposes only a minimal, validated
API to the renderer, and ships as signed, auto-updating installers
for macOS, Windows, and Linux.

## When to Use

- Creating a new desktop app with web technologies and a Node.js
  backend process.
- Adding Electron to an existing web app, or migrating an Electron
  app to a current major version.
- Wiring IPC between the main and renderer processes, including
  preload scripts and `contextBridge` APIs.
- Using native APIs: application menus, file dialogs, system tray,
  notifications, global shortcuts, or `safeStorage`.
- Setting up auto-updates, code signing, notarization, or packaging.
- Auditing or hardening an existing Electron app's security posture.
- Testing an Electron app (unit, integration, end-to-end).

## When Not to Use

- Building an app where a small binary and low memory use matter
  more than the Node.js ecosystem — use `tauri` instead (system
  webview, Rust backend, much smaller distributables).
- Building a web-only application with no desktop distribution — use
  `astro`, `nextjs`, or `react` instead.
- Writing Rust code for a desktop backend — use `rust` (and `tauri`
  for the framework).
- A task that is purely about the frontend framework inside the
  renderer — use the relevant frontend skill (`react`, `typescript`)
  and this skill for the Electron shell around it.

## Prerequisites

- Node.js LTS installed (26 is the current LTS line as of
  2026-11-20; see `nodejs`). npm or another Node package manager.
- Electron follows an eight-week major release cycle matching
  Chromium Extended Stable, and the Electron team supports the
  latest three stable major versions. The current stable as of
  2026-11-20 is 45.x (released 2026-10-20); check the official
  release timeline for the newest stable before starting, and never
  start a new app on an end-of-life major.
- For distribution: an Apple Developer account and a Developer ID
  Application certificate for macOS signing and notarization, and a
  code signing certificate (or Azure Trusted Signing) for Windows.
  Linux packages need no signing.
- Familiarity with JavaScript or TypeScript, Node.js, and Chromium
  developer tools.

## Official Documentation

- [Electron security tutorial](https://www.electronjs.org/docs/latest/tutorial/security) —
  the official security checklist; the single most important Electron
  document. Read it before writing any window or IPC code.
- [Process model](https://www.electronjs.org/docs/latest/tutorial/process-model) —
  main process, renderer processes, and preload scripts.
- [ipcMain API](https://www.electronjs.org/docs/latest/api/ipc-main) —
  `ipcMain.handle`, `ipcMain.on`, and handler registration.
- [ipcRenderer API](https://www.electronjs.org/docs/latest/api/ipc-renderer) —
  `invoke`, `send`, `sendSync`, `postMessage`.
- [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge) —
  `exposeInMainWorld` and the isolated-world model.
- [WebPreferences](https://www.electronjs.org/docs/latest/api/structures/web-preferences) —
  `contextIsolation`, `sandbox`, `nodeIntegration`, `preload`, and
  every other window option.
- [autoUpdater API](https://www.electronjs.org/docs/latest/api/auto-updater) —
  the built-in updater (macOS and Windows only; Linux uses the
  distribution package manager).
- [Code signing tutorial](https://www.electronjs.org/docs/latest/tutorial/code-signing) —
  signing and notarizing macOS and Windows builds.
- [Publishing and updating tutorial](https://www.electronjs.org/docs/latest/tutorial/tutorial-publishing-updating) —
  GitHub Releases publishing with Electron Forge and
  `update.electronjs.org`.
- [Electron release timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines) —
  supported versions and end-of-life dates.
- [electron-builder configuration](https://www.electron.build/docs/configuration/) —
  packaging, targets, signing, and publishing options.
- [electron-builder Windows code signing](https://www.electron.build/docs/features/code-signing/code-signing-win/) —
  certificate file, HSM, PKCS#11, and Azure Trusted Signing backends.

## Required Workflow

1. Confirm the toolchain: `node --version` on a supported LTS line
   and `npm --version`. Choose the packaging tool first — Electron
   Forge (the official all-in-one tool, `npm init electron-app@latest`)
   or electron-builder (declarative config, one file driving
   installers, signing, and publishing) — and do not mix the two in
   one project.
2. Scaffold the project. With Forge, `npm init electron-app@latest
   my-app` creates a main process, preload script, and renderer.
   With electron-builder, start from a minimal main/preload/renderer
   layout and add the `build` configuration to `package.json` or an
   `electron-builder.yml`.
3. Create the main window with secure defaults (see Implementation
   Standards): `contextIsolation: true`, `nodeIntegration: false`,
   `sandbox: true`, a preload script, and no remote content in a
   privileged window.
4. Design the IPC surface before writing handlers: list every
   operation the renderer needs, give each a namespaced channel
   (for example `dialog:openFile`), and decide which are
   request/response (`invoke`/`handle`) and which are one-way
   (`send`/`on`).
5. Write the preload script to expose a minimal API through
   `contextBridge.exposeInMainWorld`, wrapping `ipcRenderer` calls
   per operation. Never expose `ipcRenderer` itself or the raw
   `event` object to the renderer.
6. Implement main-process handlers with `ipcMain.handle` /
   `ipcMain.on`. Validate every argument (types, ranges, paths),
   check `event.senderFrame` / the sender's origin where the app
   loads more than one origin, and return serializable results.
7. Add native features through the main process only: menus
   (`Menu`), dialogs (`dialog`), tray (`Tray`), notifications
   (`Notification`), and secrets (`safeStorage`). The renderer asks
   via IPC; it never touches these APIs directly.
8. Add a Content Security Policy to the renderer's HTML
   (`default-src 'self'` at minimum) and serve only local, packaged
   content in privileged windows.
9. Configure packaging: targets per OS (NSIS or MSI on Windows, DMG
   and ZIP on macOS, AppImage/DEB/RPM on Linux), icons, app ID, and
   `asar` packaging. Set `forceCodeSigning: true` in electron-builder
   release pipelines so a missing credential fails the build instead
   of shipping unsigned.
10. Configure signing and notarization per platform, then
    auto-updates: the built-in `autoUpdater` with a feed (or
    `update-electron-app` for `update.electronjs.org`), or
    `electron-updater` with electron-builder's publishing. Test an
    update end-to-end on each OS before release.
11. Test: unit tests for main-process logic, integration tests for
    IPC handlers, and end-to-end tests driving the packaged app
    (see `playwright` and `e2e-testing`).

## Implementation Standards

- Security defaults are not optional: `contextIsolation: true`
  (the default since Electron 12), `nodeIntegration: false` (the
  default since Electron 5), and `sandbox: true` on every
  `BrowserWindow` and `WebContentsView`. Disabling context isolation
  also disables process sandboxing for that renderer, regardless of
  the `sandbox` flag.
- Preload scripts are the only bridge. The renderer gets exactly
  the API the preload exposes via `contextBridge`; it never gets
  `require`, `process`, or `ipcRenderer`. Expose one function per
  operation, each validating its arguments before calling
  `ipcRenderer.invoke` or `ipcRenderer.send`.
- Prefer `ipcRenderer.invoke` / `ipcMain.handle` (async
  request/response) for operations that return a value, and
  `ipcRenderer.send` / `ipcMain.on` for fire-and-forget messages.
  Avoid `ipcRenderer.sendSync`: it blocks the whole renderer until
  the reply arrives.
- Validate IPC input in the main process as if it came from an
  attacker: check argument types and ranges, canonicalize file
  paths and reject traversal outside the intended directory, and
  never build shell commands from renderer strings — use
  `child_process.execFile` with an argument array.
- Never load remote code with Node.js integration, and never grant
  a window that displays remote content access to privileged IPC.
  Display remote content in a `<webview>` tag or a
  `WebContentsView` with `nodeIntegration` disabled and context
  isolation enabled.
- Use `ses.setPermissionRequestHandler()` in every session that
  loads remote content, denying permissions the app does not need.
- Store secrets with `safeStorage` (OS keychain-backed encryption),
  never in `localStorage`, plain files, or renderer-accessible
  state. See `secrets-management`.
- Keep the main process responsive: heavy work runs in a utility
  process, a worker thread, or a child process — never on the main
  process event loop, which also drives window management.
- Database access belongs in the main process: run SQLite (or
  another embedded store) behind IPC handlers, never from the
  renderer. See `sqlite` for schema and query guidance.
- TypeScript is the recommended language for new Electron apps;
  type the preload bridge API and share the types with the renderer
  so a missing or renamed channel is a compile error, not a runtime
  failure. See `typescript`.
- Pin the Electron version in `package.json` and upgrade majors
  deliberately: read the breaking-changes notes for each major
  crossed, and test the security defaults after every upgrade.

### Testing Strategy

- Test the preload bridge with Playwright: only the exposed API
  is reachable from the renderer, and invalid IPC arguments are
  rejected in the main process.
- Test IPC security: renderer input with path traversal or shell
  metacharacters is rejected, never executed.
- Test packaged builds on each target OS, not just in
  development, including the updater and `safeStorage`.
- Test security defaults after every Electron upgrade:
  `contextIsolation`, `nodeIntegration: false`, and `sandbox`.

## Best Practices

- One window, one purpose. Each window gets its own preload script
  and the minimal bridge it needs; a settings window does not get
  the main window's file-system API.
- Namespace IPC channels by domain (`file:read`, `file:write`,
  `window:minimize`) so handlers stay discoverable and auditable.
- Handle the app lifecycle correctly: quit on `window-all-closed`
  except on macOS, re-create the window on `activate`, and check for
  updates only after the app is ready — never during first-run
  installer hooks on Windows, where Squirrel holds a file lock.
- Keep the renderer a normal web app: bundle it with the project's
  web toolchain, and keep Electron-specific code behind the preload
  bridge so the UI stays testable in a browser.
- Ship `latest.yml` / update metadata alongside installers when
  using electron-builder publishing, and keep old releases
  available so users on older versions can still update.
- Log main-process errors to a file in the app's user-data
  directory (`app.getPath('userData')`) so field issues are
  diagnosable; never log secrets or full IPC payloads.
- Review the official security checklist before every release, and
  run an automated scanner such as Electronegativity over the
  codebase as part of the audit.

## Security Considerations

- The renderer is untrusted. Any cross-site scripting flaw in the
  renderer becomes remote code execution if the renderer can reach
  Node.js or a privileged IPC channel. Context isolation,
  sandboxing, and a minimal preload bridge exist to contain exactly
  this: an XSS in a properly isolated renderer can only call the
  narrow API the preload exposes, and every one of those calls is
  validated in the main process.
- Never set `nodeIntegration: true` on a window that loads remote
  content, and never set `contextIsolation: false` in a shipping
  app. Both are called out explicitly in the official security
  tutorial; disabling context isolation also disables process
  sandboxing.
- Never expose `ipcRenderer` through `contextBridge`. Exposing the
  whole module gives the renderer every channel, including ones
  intended for other windows. Expose named functions only.
- Never pass the IPC `event` object to the renderer, and never let
  renderer code choose the channel name: channels are fixed strings
  in the preload script, not renderer-supplied values.
- Validate `event.sender` / `event.senderFrame` when the app has
  more than one window or origin; a handler that assumes its caller
  is the main window can be invoked from any renderer that can reach
  the channel.
- Content Security Policy: ship a strict CSP (`default-src 'self'`,
  no `unsafe-inline` scripts) in every renderer HTML file. A CSP
  does not fix an XSS, but it limits what injected code can do.
- Only load secure content: `https:` for remote content, `file:`
  for packaged local content. Never load `http:` content into a
  privileged window.
- Auto-update integrity: updates must come over HTTPS from a feed
  you control, and macOS updates require a signed app (a
  Squirrel.Mac requirement). With electron-builder, keep update
  manifests signed (`forceCodeSigning: true` verifies this in the
  release pipeline). A compromised update feed is a full compromise
  of every installed user.
- Run `npm audit` and the repository's dependency checks before
  every release (see `dependency-security`), and keep Electron
  itself current: each major tracks a Chromium release, and running
  an end-of-life major means running an unpatched browser engine.
- Use the `ELECTRON_ENABLE_SECURITY_WARNINGS` / development warnings
  during development: Electron warns in the console when a window is
  created with insecure options. Treat those warnings as errors.

## Performance Considerations

- Electron apps bundle Chromium, so the distributable is large by
  nature (tens of megabytes at minimum). Keep the app's own bundle
  small: tree-shake the renderer bundle, lazy-load routes and heavy
  dependencies, and do not ship `devDependencies` in the packaged
  app.
- Startup time is user-visible: defer non-essential work until after
  the first window shows, lazy-require heavy main-process modules,
  and avoid synchronous file or network I/O during startup.
- Each `BrowserWindow` is a full renderer process with its own
  memory cost. Prefer one window plus views or in-page navigation
  over many windows, and destroy windows the user closed instead of
  hiding them.
- IPC is serialized (Structured Clone): keep messages small, avoid
  sending large objects or buffers through `invoke`, and stream
  large data in chunks or via files the main process writes.
- Avoid `sendSync` (blocks the renderer) and avoid chatty IPC in
  animation loops or per-keystroke handlers; debounce or batch.
- Profile with the Chromium DevTools in the renderer and Node.js
  profiling in the main process; use `app.getAppMetrics()` to
  inspect per-process memory and CPU in production diagnostics.

## Common Mistakes

- `nodeIntegration: true` to "make things easier" — it hands the
  renderer full Node.js access and turns any XSS into remote code
  execution. Use a preload script and `contextBridge` instead.
- Exposing all of `ipcRenderer` via `contextBridge` — the renderer
  can then call any channel. Expose named functions only.
- Using `sendSync` for convenience — it blocks the renderer
  process until the main process replies. Use `invoke`/`handle`.
- Loading a remote URL in the main window — remote content in a
  privileged window can attack the bridge. Use a separate,
  unprivileged view for remote content.
- Forgetting to validate IPC arguments — the main process must treat
  renderer input as untrusted; an unvalidated file path is a
  directory-traversal vulnerability.
- Skipping code signing on macOS — Gatekeeper blocks unsigned apps,
  and the built-in auto-updater requires a signed app on macOS.
- Storing tokens in `localStorage` — renderer-accessible storage is
  readable by any script running in the renderer, including injected
  ones. Use `safeStorage` in the main process.
- Shipping with `ELECTRON_DISABLE_SECURITY_WARNINGS` set or
  security warnings ignored — the warnings exist because the
  configuration is unsafe.
- Running an end-of-life Electron major — the bundled Chromium
  stops receiving security fixes. Track the release timeline and
  upgrade on the eight-week cadence.

## Examples

A secure main window, preload bridge, and IPC handler:

```js
// main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile("index.html");
}

ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
  });
  if (canceled) return null;
  return filePaths[0];
});

app.whenReady().then(createWindow);
```

```js
// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
});
```

```js
// renderer.js — the only Electron surface the page can see
const filePath = await window.electronAPI.openFile();
```

Minimal electron-builder configuration for all three platforms:

```yaml
# electron-builder.yml
appId: com.example.notes
productName: Notes
files:
  - dist/**
  - main.js
  - preload.js
mac:
  target:
    - dmg
    - zip
  hardenedRuntime: true
  entitlements: entitlements.mac.plist
win:
  target: nsis
linux:
  target:
    - AppImage
    - deb
```

Checking for updates with the built-in updater:

```js
// main.js
const { autoUpdater } = require("electron");

autoUpdater.setFeedURL({
  url: "https://update.example.com/darwin/1.0.0",
});
autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});
app.whenReady().then(() => autoUpdater.checkForUpdates());
```

## Validation Checklist

- [ ] Every window is created with `contextIsolation: true`,
      `nodeIntegration: false`, `sandbox: true`, and a preload
      script; no security warnings appear in the console.
- [ ] The preload script exposes named functions only — no raw
      `ipcRenderer`, no `event` object, no renderer-chosen channels.
- [ ] Every `ipcMain` handler validates its arguments; file paths
      are canonicalized and checked against the intended directory.
- [ ] A strict Content Security Policy ships in every renderer HTML
      file, and privileged windows load only packaged local content.
- [ ] Secrets are stored with `safeStorage`, never in renderer
      storage or plain files.
- [ ] The app is signed (and notarized on macOS) and an update
      installs cleanly on each target OS.
- [ ] `npm audit` reports no unaddressed high or critical
      vulnerabilities, and Electron is on a supported major.

## Expected Deliverables

- An Electron app with a secure main/preload/renderer split, a
  documented IPC channel list, and native features wired through the
  main process.
- Packaging configuration (electron-builder or Forge) producing
  signed installers for the target operating systems.
- Auto-update configuration tested end-to-end on each OS.
- A short security note: the window configuration used, the IPC
  surface exposed to each renderer, and any deliberate exceptions
  with reasons.

## References

- [Electron security tutorial](https://www.electronjs.org/docs/latest/tutorial/security) —
  the official security checklist.
- [Process model](https://www.electronjs.org/docs/latest/tutorial/process-model) —
  main, renderer, and preload processes.
- [ipcMain API](https://www.electronjs.org/docs/latest/api/ipc-main) and
  [ipcRenderer API](https://www.electronjs.org/docs/latest/api/ipc-renderer) —
  IPC methods.
- [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge) —
  exposing APIs to isolated renderers.
- [autoUpdater API](https://www.electronjs.org/docs/latest/api/auto-updater) —
  built-in updates (macOS and Windows).
- [Code signing tutorial](https://www.electronjs.org/docs/latest/tutorial/code-signing) —
  macOS and Windows signing and notarization.
- [electron-builder configuration](https://www.electron.build/docs/configuration/) —
  packaging, targets, signing, publishing.
- Related skills in this repository: `tauri`, `rust`, `typescript`,
  `nodejs`, `javascript`, `sqlite`, `unit-testing`, `e2e-testing`,
  `playwright`, `secrets-management`, `dependency-security`.
