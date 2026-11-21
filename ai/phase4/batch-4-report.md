# Phase 4 Batch 4 Report — Desktop Engineering

- **Date:** 2026-11-20
- **Batch:** 4 (tauri, rust, electron)
- **Branch:** `feat/skillforge-production-upgrade`
- **New category:** `skills/desktop/`

## Skills written

| Skill | File | Lines | Status |
| --- | --- | --- | --- |
| `tauri` | `skills/desktop/tauri/SKILL.md` | 407 | PASS |
| `rust` | `skills/desktop/rust/SKILL.md` | 418 | PASS |
| `electron` | `skills/desktop/electron/SKILL.md` | 462 | PASS |

All three follow `templates/SKILL-TEMPLATE.md` exactly (15 sections in
order), use the standard frontmatter (name = directory, `license: MIT`,
metadata `version: "1.0.0"`, `category: desktop`, `maintainer:
skills-library`, `source: original`, `last_verified: "2026-11-20"`),
and keep version information in the body per
`ai/decisions/2026-11-20-phase3-version-metadata.md`. No `references/`
directories were needed — each SKILL.md is self-contained under 500
lines. No files outside `skills/desktop/` and this report were touched;
no commits were made.

## Official sources consulted per skill

### `tauri` (Tauri 2 only)

- Tauri v2 docs (v2.tauri.app): guides, prerequisites
  (`/start/prerequisites/`), create-project, CLI reference
  (`/reference/cli/`), capability ACL reference
  (`/reference/acl/capability/`), release notes (`/release/`).
- Tauri 2.12 release announcement (`/blog/tauri-2.12/`): current
  stable 2.12.7 (2026-11-18), MSRV raised to Rust 1.90, Windows 7
  support dropped, `on_permission_request` handler.
- Tauri plugins workspace (github.com/tauri-apps/plugins-workspace)
  and create-tauri-app (github.com/tauri-apps/create-tauri-app).
- Verified v2 conventions against v1 anti-patterns: v1 `allowlist`
  removed, `@tauri-apps/api/tauri` import gone, `shell:allow-open`
  deprecated since 2.1 in favor of the opener plugin
  (`opener:allow-open`); capabilities live in
  `src-tauri/capabilities/`; updater plugin uses minisign-style
  signatures that cannot be disabled (`tauri signer generate`,
  `plugins.updater.endpoints` + `pubkey`).

### `rust` (modern Rust, Edition 2024)

- The Rust Programming Language (doc.rust-lang.org/stable/book/),
  The Rust Reference (doc.rust-lang.org/reference/), The Cargo Book
  (doc.rust-lang.org/cargo/), The Rust Edition Guide
  (doc.rust-lang.org/edition-guide/), Rust release notes
  (dev-doc.rust-lang.org/stable/releases.html).
- Version facts verified: current stable Rust 1.100.0 (released
  2026-11-12); Edition 2024 current, stable since 1.85.0
  (2025-02-20); six-week release cadence; only the latest stable is
  supported.
- Tokio tutorial (tokio.rs/tokio/tutorial/hello-tokio) and Tokio API
  docs (docs.rs/tokio): Tokio 1.x, `#[tokio::main]`, `spawn_blocking`,
  feature flags.
- RustSec Advisory Database (rustsec.org/advisories/),
  cargo-audit (github.com/rustsec/cargo-audit), cargo-deny
  (github.com/EmbarkStudios/cargo-deny): `cargo audit`,
  `cargo deny check`, `deny.toml` policy sections.

### `electron`

- Electron official docs (electronjs.org/docs/latest): security
  tutorial (`/tutorial/security`), process model
  (`/tutorial/process-model`), ipcMain / ipcRenderer / contextBridge
  API references, WebPreferences structure, autoUpdater API,
  code-signing tutorial, publishing-and-updating tutorial, release
  timelines.
- Verified security facts: context isolation default since 12.0,
  `nodeIntegration: false` default since 5.0, disabling context
  isolation also disables process sandboxing, `ipcRenderer` can no
  longer be sent over `contextBridge`, built-in autoUpdater is
  macOS/Windows only, macOS updates require a signed app
  (Squirrel.Mac).
- electron-builder docs (electron.build): configuration reference
  and Windows code-signing page (v27 config keys, `win.sign`
  backends, `forceCodeSigning`).
- Version facts: 8-week major cycle, latest three stable majors
  supported; current stable line 45.x (released 2026-10-20), per the
  Electron release history; Node.js 26 is the current LTS line (per
  this repo's `nodejs` skill).

## Validation output

Run from the repo root, one filtered invocation per skill (no
unfiltered validate, no registry regeneration, per plan):

```
$ node scripts/validate-skills.mjs --filter skills/desktop/tauri
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/desktop/rust
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/desktop/electron
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

All three passed on the first run; no fixes were needed. Line counts
(407 / 418 / 462) are all under the 500-line recommendation.

## Decisions and notes

- **Tauri 2 only, no v1 mixing.** The `tauri` skill states the v2-only
  scope in Prerequisites and Implementation Standards, names the v1
  patterns that do not carry over (`allowlist`,
  `@tauri-apps/api/tauri`), and points v1 upgrades at
  `tauri migrate`. The deprecated `shell:allow-open` is called out
  with its opener-plugin replacement.
- **Security sections are substantive.** `tauri` covers the
  capabilities model as the security boundary, scoped filesystem
  permissions, shell allowlisting, remote-origin risk, CSP, and the
  two distinct signing layers (updater vs OS code signing).
  `electron` covers context isolation, sandboxing, the preload-only
  bridge, IPC validation, CSP, update-feed integrity, and the
  official security checklist.
- **Version claims are dated and sourced.** Every version in the
  skills (Tauri 2.12.7 / MSRV 1.90, Rust 1.100.0 / Edition 2024,
  Electron 45.x, Node.js 26 LTS) was verified against official docs
  or release notes on 2026-11-20 and is phrased as "current stable
  as of 2026-11-20" with a link to the official release notes /
  timeline, so a future reader can re-check.
- **Cross-references use backticked skill names only**, and only to
  skills confirmed to exist in the repo at write time (`typescript`,
  `nodejs`, `javascript`, `sqlite`, `unit-testing`,
  `integration-testing`, `e2e-testing`, `playwright`,
  `secrets-management`, `dependency-security`, `code-review`,
  `clean-code`) plus the two sibling skills in this batch. No
  references to skills other Phase 4 batches are creating.
- **Database integration** is covered in all three skills as
  "database behind the native side (Rust commands / main-process IPC
  handlers), never in the renderer/webview", cross-referencing
  `sqlite` rather than duplicating schema guidance.
- **No external link was invented.** Every URL in the three skills
  was returned verbatim by an official-docs search result or stated
  in official page content fetched during research.
- **Coordinator follow-ups:** registry regeneration and the full
  validation suite are the coordinator's job once all batches land;
  the new `desktop` category will need a category README if the
  registry step expects one (other categories were not inspected —
  out of this batch's scope).
