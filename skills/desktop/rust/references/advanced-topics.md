# Advanced topics

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
