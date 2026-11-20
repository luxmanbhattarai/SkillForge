---
name: rust
description: >
  Write modern, production-quality Rust: ownership, borrowing, and
  lifetimes; error handling with Result, thiserror, and anyhow; async
  programming with Tokio; crates and workspaces; unit, integration, and
  doc testing; clippy and rustfmt; safe unsafe guidelines; FFI basics;
  performance profiling; and dependency security with cargo-audit and
  cargo-deny. Use when writing or reviewing Rust code, setting up a Rust
  project or workspace, debugging borrow checker or async errors, or
  auditing a Rust dependency tree. Desktop and Tauri emphasis, general
  enough to stand alone.
license: MIT
metadata:
  version: "1.0.0"
  category: desktop
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Rust

## Purpose

This skill covers modern Rust development for production code: the
ownership model, idiomatic error handling, async with Tokio, project
layout with crates and workspaces, testing, linting, safe use of
`unsafe`, FFI boundaries, performance work, and supply-chain security.
It is written with a desktop and Tauri emphasis — Rust as the backend
of a desktop app — but the practices apply to any Rust project. The
outcome is Rust code that compiles cleanly under strict lints, handles
errors explicitly, and ships with its dependency tree audited.

## When to Use

- Writing new Rust code: a binary, library, Tauri backend, CLI, or
  service.
- Setting up a Rust project, workspace, or CI pipeline.
- Designing error types, async APIs, or module structure.
- Debugging borrow checker, lifetime, trait, or async errors.
- Reviewing Rust code for correctness, idiom, or safety.
- Auditing a Rust dependency tree for vulnerabilities, licenses, or
  banned crates.
- Adding tests, benchmarks, or linting to a Rust project.
- Writing `unsafe` code or an FFI boundary and documenting its safety
  contract.

## When Not to Use

- Writing the frontend of a desktop app (HTML, CSS, JavaScript) — use
  the frontend skills such as `typescript` or `react`, and `tauri` or
  `electron` for the desktop shell.
- Choosing between desktop frameworks — see `tauri` and `electron`
  for the framework decision; this skill covers the Rust language and
  toolchain.
- A task that is purely about a specific Rust web framework or
  database driver — this skill covers the language and ecosystem
  practices; consult that crate's own documentation for its API.

## Prerequisites

- Rust installed via rustup. The current stable release as of
  2026-11-20 is Rust 1.100.0 (released 2026-11-12); Rust ships a new
  stable release every six weeks and only the latest stable is
  supported, so keep the toolchain current with `rustup update`.
- Edition 2024 is the current edition (stable since Rust 1.85.0,
  2025-02-20). New crates use `edition = "2024"` in `Cargo.toml`.
  Earlier editions are 2015, 2018, and 2021.
- Familiarity with a systems or application language; no prior Rust
  experience is assumed by the official Book, which this skill
  references for language fundamentals.
- For desktop work: the `tauri` skill for the framework side, and the
  platform toolchains Tauri requires.

## Official Documentation

- [The Rust Programming Language (The Book)](https://doc.rust-lang.org/stable/book/) —
  the canonical introduction: ownership, structs, enums, traits,
  generics, lifetimes, testing, and async fundamentals.
- [The Rust Reference](https://doc.rust-lang.org/reference/) — the
  primary language reference for precise semantics.
- [The Cargo Book](https://doc.rust-lang.org/cargo/) — packages,
  workspaces, dependencies, profiles, and Cargo commands.
- [The Rust Edition Guide](https://doc.rust-lang.org/edition-guide/) —
  what changed in each edition and how to migrate.
- [Rust release notes](https://dev-doc.rust-lang.org/stable/releases.html) —
  what each stable release stabilized.
- [Tokio tutorial](https://tokio.rs/tokio/tutorial/hello-tokio) —
  the official async runtime guide.
- [Tokio API documentation](https://docs.rs/tokio) — `tokio::task`,
  `tokio::sync`, `tokio::time`, and runtime configuration.
- [RustSec Advisory Database](https://rustsec.org/advisories/) —
  human-readable security advisories for crates.
- [cargo-audit](https://github.com/rustsec/cargo-audit) — audit
  `Cargo.lock` against the RustSec database.
- [cargo-deny](https://github.com/EmbarkStudios/cargo-deny) — policy
  enforcement for advisories, licenses, bans, and sources.

## Required Workflow

1. Confirm the toolchain: `rustc --version` and `cargo --version`
   should report the current stable (1.100.0 as of 2026-11-20). Pin
   the toolchain for the team with a `rust-toolchain.toml` containing
   a `channel` (usually `"stable"` or an exact version for
   reproducible CI).
2. Create the crate with `cargo new <name>` (`--lib` for a library)
   and set `edition = "2024"` in `Cargo.toml`. For multi-crate work,
   create a workspace with a root `Cargo.toml` listing `[workspace]
   members` and shared settings under `[workspace.package]` and
   `[workspace.dependencies]`.
3. Add dependencies with `cargo add <crate>` so versions land in
   `Cargo.toml` in the standard format; prefer the smallest feature
   set that works (for example, Tokio with only the features the
   crate needs rather than `full` in a library).
4. Write the code following the Implementation Standards below:
   ownership-first design, explicit error types, async only where it
   pays, and tests alongside the code.
5. Format with `cargo fmt` and lint with `cargo clippy --all-targets
   -- -D warnings` (fix warnings; do not silence them without a
   documented reason).
6. Test with `cargo test` (unit tests in `#[cfg(test)]` modules,
   integration tests under `tests/`, doc tests in `///` comments) and
   run `cargo test --doc` where doc examples carry behavior.
7. Audit the dependency tree: `cargo audit` for known
   vulnerabilities and `cargo deny check` for advisories, licenses,
   bans, and sources, using a committed `deny.toml`. Run both in CI
   on every pull request and on a schedule.
8. Build the release artifact with `cargo build --release`, verify
   with the project's own checks, and record the Rust version and
   edition in the project README or contributing guide.

## Implementation Standards

- Edition 2024 for all new crates. In 2024, `extern` blocks must be
  written `unsafe extern`, async closures are available, and the
  `gen` keyword is reserved. Migrating an older crate uses `cargo
  fix --edition` plus the Edition Guide.
- Ownership first: prefer borrowing (`&T`, `&mut T`) over cloning;
  clone only when the data must outlive the borrow or cross a thread
  boundary. Use `Rc`/`Arc` for shared ownership and `RefCell`/`Mutex`
  for interior mutability, and keep the locked region as small as
  possible.
- Lifetimes are usually elided; write explicit lifetimes only when
  the compiler requires them or when they document a real constraint.
  Avoid `'static` bounds on data that is not genuinely static.
- Error handling: libraries define an error enum with `thiserror`
  (`#[derive(Error)]` with `#[error("...")]` messages); applications
  use `anyhow::Result` at the top level and attach context with
  `.context("...")`. Never discard errors with `let _ =` unless the
  discard is deliberate and commented. Never `unwrap()` or `expect()`
  on data from the network, the filesystem, or user input; reserve
  `expect()` for invariants with a message explaining why the
  invariant holds.
- Async with Tokio: use `#[tokio::main]` for binaries; libraries stay
  runtime-agnostic and expose `async fn` without depending on a
  runtime. Never call blocking code (`std::thread::sleep`, sync file
  I/O, CPU-heavy loops) inside an async task — use
  `tokio::task::spawn_blocking` or the async equivalents
  (`tokio::time::sleep`, `tokio::fs`). Keep futures `Send` unless
  there is a reason not to, and hold locks across `.await` points
  only with `tokio::sync::Mutex`, never `std::sync::Mutex`.
- Tauri backends: commands are `async fn` returning
  `Result<T, E: Serialize>`; shared state goes in `tauri::State`
  behind a `Mutex`; long work runs on `spawn_blocking` or
  `tauri::async_runtime::spawn`. See `tauri` for the framework side.
- Crates and workspaces: one responsibility per crate; shared
  configuration lives in `[workspace.package]` and shared dependency
  versions in `[workspace.dependencies]`. Commit `Cargo.lock` for
  binaries and applications; libraries also commit it when the
  project builds a desktop app from the workspace.
- Testing: every public function with non-trivial logic gets a unit
  test; public API behavior gets integration tests under `tests/`;
  doc examples must compile and pass (`cargo test --doc`). Prefer
  table-driven tests for input validation and error cases.
- Linting: `cargo fmt` on every change; `cargo clippy --all-targets
  -- -D warnings` in CI. Enable the pedantic clippy lints
  (`clippy::pedantic`) only if the team agrees to maintain them;
  otherwise the default lint set plus `-D warnings` is the standard.
- `unsafe` guidelines: minimize `unsafe` blocks, wrap each one in a
  safe abstraction, and document the safety contract in a
  `// SAFETY:` comment stating what the caller must guarantee and why
  the code upholds it. Audit `unsafe` in dependencies with
  `cargo-geiger` style review when the code handles untrusted input;
  prefer safe crates where one exists.
- FFI basics: declare foreign functions in `unsafe extern` blocks
  (Edition 2024), keep FFI types `#[repr(C)]`, never pass Rust
  references or `String` across the boundary (use raw pointers and
  lengths), and wrap every foreign call in a safe Rust function that
  validates inputs and translates error codes into `Result`.
- MSRV: if the project declares a minimum supported Rust version,
  record it in `Cargo.toml` (`rust-version`) and test it in CI; do
  not declare one by accident by using a newer feature without
  checking.

## Best Practices

- Let the type system carry invariants: newtypes for IDs and units,
  enums for states, `Option` instead of sentinel values, and
  `NonZeroU32`-style types where zero is invalid.
- Make illegal states unrepresentable rather than validating at
  runtime: parse and validate at the boundary, then pass typed values
  inward.
- Keep functions small and single-purpose; extract helpers instead of
  nesting `match` arms three levels deep.
- Use iterators over manual index loops; use `?` for error
  propagation instead of nested `match` on `Result`.
- Document public APIs with `///` comments including a short example
  that compiles as a doc test.
- Prefer `cargo add` and `cargo update` over hand-editing version
  requirements; run `cargo outdated` periodically to find stale
  dependencies.
- In desktop apps, keep the Rust side free of UI concerns: it exposes
  commands and events, and the frontend owns presentation. Heavy
  work (file parsing, database queries, crypto) belongs in Rust.

## Security Considerations

- Audit dependencies on every change: `cargo audit` catches known
  vulnerabilities in `Cargo.lock` against the RustSec database, and
  `cargo deny check` enforces advisories, licenses, bans, and
  allowed sources from `deny.toml`. Both belong in CI, and
  advisories must block the merge until fixed or explicitly
  exempted with a written reason and expiry.
- Treat every input from outside the process (files, network, IPC,
  environment, CLI arguments) as untrusted: validate lengths and
  ranges, canonicalize paths and reject traversal outside the
  intended directory, and never interpolate untrusted strings into
  shell commands — use `std::process::Command` with separate
  arguments.
- Never commit secrets: tokens and keys come from the environment or
  the OS keychain at runtime, never from source or `Cargo.toml`.
  See `secrets-management`.
- Keep `unsafe` code minimal and reviewed: memory safety is Rust's
  core guarantee, and every `unsafe` block is a place that guarantee
  is suspended. Document the safety contract, and do not accept
  `unsafe` in a dependency without understanding what it does.
- Avoid `panic!` on untrusted input: a panic in a desktop app kills
  the process, and in a library it can unwind across an FFI boundary
  (undefined behavior). Return `Result` from fallible operations.
- Pin dependency versions in `Cargo.lock` and review what `cargo
  update` changes; a supply-chain attack arrives as an unexpected
  version bump. Prefer crates with a maintenance history, a
  repository, and a license compatible with the project.

## Performance Considerations

- Measure before optimizing: use `cargo test --release` timings and
  the standard library's timing tools for coarse measurement, and a
  benchmarking harness for hot paths. Do not micro-optimize code
  that profiling has not shown to be hot.
- Release profile: the default `cargo build --release` enables
  optimizations (`opt-level = 3`). For size-sensitive desktop
  binaries, consider `opt-level = "s"` or `"z"`, `lto = true`,
  `codegen-units = 1`, and `strip = true` in `[profile.release]`,
  and measure the effect on both size and startup time — link-time
  optimization increases build time significantly.
- Avoid needless allocation in hot paths: reuse buffers, prefer
  `&str` and slices over owned `String`/`Vec` in function arguments,
  and use `Cow` where a value is usually borrowed and rarely owned.
- Prefer iterators and avoid intermediate collections; use
  `Vec::with_capacity` when the size is known.
- Concurrency: CPU-bound work parallelizes across threads (scoped
  threads via `std::thread::scope` or a work-stealing pool);
  I/O-bound work belongs on the async runtime. Do not spawn a thread
  per connection or per request.
- Startup time matters for desktop apps: defer heavy initialization
  (database opens, large file reads) until first use, and keep the
  dependency tree small — every crate adds compile time and binary
  size.

## Common Mistakes

- Fighting the borrow checker with `clone()` everywhere — clones
  hide ownership problems and cost performance. Restructure so data
  has one owner and borrows flow in one direction.
- `unwrap()` on fallible operations — panics in production. Use `?`
  and proper error types.
- Blocking inside async code — `std::thread::sleep` or sync I/O in
  an async task stalls the whole Tokio worker thread. Use
  `tokio::time::sleep`, `tokio::fs`, or `spawn_blocking`.
- Holding `std::sync::MutexGuard` across an `.await` — blocks the
  executor and can deadlock. Use `tokio::sync::Mutex` for locks held
  across await points.
- Ignoring clippy warnings — warnings accumulate into real bugs.
  Run clippy with `-D warnings` in CI.
- Committing `Cargo.lock` for a library and then wondering why
  downstream builds differ — libraries should not commit the lock
  file unless the project also builds an application from the same
  workspace.
- Adding a dependency for a one-line helper — each dependency is
  compile time, binary size, and supply-chain surface. Prefer the
  standard library.
- Writing `unsafe` to work around a borrow error — the borrow error
  is usually a design signal. Restructure first; reach for `unsafe`
  only with a documented safety contract.

## Examples

An error type with `thiserror` and a fallible function:

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum NoteError {
    #[error("note {0} not found")]
    NotFound(u64),
    #[error("storage error: {0}")]
    Storage(#[from] std::io::Error),
}

fn load_note(id: u64) -> Result<String, NoteError> {
    if id == 0 {
        return Err(NoteError::NotFound(id));
    }
    let path = format!("notes/{id}.md");
    Ok(std::fs::read_to_string(path)?)
}
```

Async work with Tokio, keeping blocking I/O off the runtime:

```rust
use tokio::task;

async fn hash_file(path: &std::path::Path) -> std::io::Result<u64> {
    let path = path.to_path_buf();
    task::spawn_blocking(move || {
        // Blocking file I/O runs on a dedicated thread pool.
        let bytes = std::fs::read(path)?;
        Ok(bytes.iter().fold(0u64, |acc, b| acc.wrapping_add(*b as u64)))
    })
    .await?
}
```

A workspace root `Cargo.toml` with shared configuration:

```toml
[workspace]
members = ["app", "core"]
resolver = "2"

[workspace.package]
edition = "2024"
license = "MIT"

[workspace.dependencies]
tokio = { version = "1", features = ["rt-multi-thread", "macros", "time"] }
thiserror = "2"
```

A unit test and a doc test:

```rust
/// Returns the file stem, or `None` for an empty name.
///
/// ```
/// assert_eq!(crate::stem("notes.md"), Some("notes"));
/// ```
pub fn stem(name: &str) -> Option<&str> {
    name.split('.').next().filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_name_has_no_stem() {
        assert_eq!(stem(""), None);
    }
}
```

## Validation Checklist

- [ ] `cargo build` and `cargo build --release` succeed on the
      current stable toolchain.
- [ ] `cargo fmt --check` and `cargo clippy --all-targets -- -D
      warnings` pass.
- [ ] `cargo test` passes, including doc tests.
- [ ] `cargo audit` reports no unaddressed vulnerabilities and
      `cargo deny check` passes.
- [ ] No `unwrap()` or `expect()` on untrusted input; every `unsafe`
      block has a `// SAFETY:` comment.
- [ ] `Cargo.toml` declares `edition = "2024"` and the README records
      the Rust version the project targets.

## Expected Deliverables

- Rust code that compiles warning-free under `clippy -D warnings`,
  with tests and documentation for public APIs.
- A `Cargo.toml` / workspace layout that follows the standards above,
  with a committed `Cargo.lock` for applications.
- A `deny.toml` and CI steps running `cargo audit` and `cargo deny
  check` for projects that ship to users.
- A short note on any `unsafe` code introduced, its safety contract,
  and why a safe alternative was not used.

## References

- [The Rust Programming Language](https://doc.rust-lang.org/stable/book/) —
  ownership, traits, generics, lifetimes, testing, async.
- [The Rust Reference](https://doc.rust-lang.org/reference/) —
  precise language semantics.
- [The Cargo Book](https://doc.rust-lang.org/cargo/) — packages,
  workspaces, profiles, commands.
- [The Rust Edition Guide](https://doc.rust-lang.org/edition-guide/) —
  edition changes and migration.
- [Tokio tutorial](https://tokio.rs/tokio/tutorial/hello-tokio) and
  [Tokio API docs](https://docs.rs/tokio) — async runtime.
- [RustSec Advisory Database](https://rustsec.org/advisories/) —
  crate vulnerability advisories.
- Related skills in this repository: `tauri`, `electron`,
  `dependency-security`, `unit-testing`, `integration-testing`,
  `code-review`, `clean-code`, `secrets-management`.
