# Implementation notes

- Store secrets with `safeStorage` (OS keychain-backed encryption),
  never in `localStorage`, plain files, or renderer-accessible
  state. Use the asynchronous methods (`isAsyncEncryptionAvailable()`,
  `encryptStringAsync()`, `decryptStringAsync()`): the synchronous
  methods are deprecated in Electron 45 and removed in Electron 46.
  See `secrets-management`.
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
