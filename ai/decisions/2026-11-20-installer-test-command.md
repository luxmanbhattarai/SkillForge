# Decision: `npm test` runs bare `node --test`, not `node --test test/`

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 2
- **Context:** The Phase 2 brief specified
  `"test": "node --test test/"` in `package.json`.

## What happened

On Node v24.22.1, `node --test test/` (and `node --test test`,
`node --test ./test/`) does not scan the directory: the runner
treats the directory path as a test file to execute and fails
with `Cannot find module '.../test'`. Bare `node --test` (no
arguments) scans the working directory recursively and runs all
four test files correctly, as does the glob form
`node --test "test/*.test.mjs"`.

## Decision

Use `"test": "node --test"`. It needs no shell glob expansion
(so it behaves the same on Windows) and picks up any future
`*.test.mjs` files anywhere in the repo, which matches how the
test suite is expected to grow (Phases 6 and 12 add more suites).

## Consequences

- `npm test` works on the Node versions this repo supports. If a
  future Node version restores directory scanning for
  `node --test test/`, switching back is a one-line change with
  no behavioral difference.
- Any `*.test.mjs` file added anywhere in the repo (outside
  `node_modules`, of which there are none) will run under
  `npm test`. That is the intended behavior for this repo's
  zero-dependency suite.
