---
name: python-sdk
description: >
  Build and publish a Python SDK for an API: src-layout packaging with
  hatchling or PDM, pyproject.toml metadata, typing with py.typed and
  mypy or Pyright, sync and async clients with httpx, authentication,
  retries, timeouts, pagination, error models, streaming, testing with
  pytest, semantic versioning, publishing to PyPI with trusted
  publishing, and backward compatibility. Use when creating or
  maintaining a Python client library for an API.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Python SDK

## Purpose

This skill covers the Python-specific engineering of an API client
SDK: the src layout, `pyproject.toml` packaging, typing with
`py.typed`, sync and async clients, and PyPI publishing. The outcome
is an SDK that installs cleanly from PyPI, type-checks for consumers,
and behaves reliably at runtime. It complements `sdk-development`,
which covers language-agnostic client design; this skill covers the
Python tooling and packaging depth.

## When to Use

- Creating a new Python SDK for an API.
- Packaging an existing Python client for PyPI (src layout, build
  backend, metadata, `py.typed`).
- Adding typing, an async client, streaming, or pagination helpers to
  a Python SDK.
- Setting up a release pipeline for a Python package (build, test,
  trusted publishing).
- Fixing a package that installs the wrong files, ships no types, or
  breaks on supported Python versions.

## When Not to Use

- Designing the API itself — use `api-design` first.
- Building a TypeScript SDK — use `typescript-sdk`.
- Generating a client from an OpenAPI document instead of hand-writing
  one — use `api-client-generation`.
- Language-agnostic SDK design decisions — use `sdk-development`.
- A one-off script that calls an API — a plain `httpx` script needs
  no SDK structure.

## Prerequisites

- A documented, stable API (an OpenAPI document or equivalent) to
  build against.
- Python 3.15.2 is the current stable release (3.15.0 released
  9 October 2026). Support the Python versions still receiving
  security fixes: as of November 2026 that is 3.11 and newer
  (3.10 reached end of life in October 2026). Declare the floor in
  `requires-python` and test every supported version in CI.
- A build frontend (`uv`, `pip` with `build`, or PDM) and a chosen
  PEP 517 build backend: hatchling is the safe default for a
  pure-Python library; `pdm-backend` if the project already uses
  PDM; `uv_build` is fine for applications but adds a Rust toolchain
  requirement for anyone building from the sdist.
- A PyPI account (with two-factor authentication) for publishing,
  or a GitHub repository configured for PyPI trusted publishing.
- A decision on the SDK's public surface (resources, methods, error
  model) following `sdk-development`.

## Official Documentation

- [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/) —
  the Python Packaging User Guide: build backends, the `[project]`
  table, and metadata.
- [Python documentation](https://docs.python.org/3/) — the standard
  library and language reference for the supported Python versions.
- [Hatch documentation](https://hatch.pypa.io/) — hatchling, the
  recommended build backend for a pure-Python library, and the
  `hatch-vcs` version plugin.
- [PDM documentation](https://pdm-project.org/) — PDM and the
  `pdm-backend` build backend.
- [uv documentation](https://docs.astral.sh/uv/) — `uv build` and
  `uv publish` as a fast build frontend and publisher.
- [PyPI trusted publishing](https://docs.pypi.org/trusted-publishers/) —
  publish from CI with short-lived OIDC tokens instead of API keys.
- [httpx documentation](https://www.python-httpx.org) — the sync and
  async HTTP client used for the transport layer.
- [pytest documentation](https://docs.pytest.org) — the test runner
  (pytest 9.2.0 is current).
- [mypy documentation](https://mypy.readthedocs.io/en/stable/) —
  the reference type checker (mypy 2.4.1 is current).
- [Pyright](https://github.com/microsoft/pyright) — Microsoft's type
  checker, also the engine behind Pylance in VS Code.
- [ty documentation](https://docs.astral.sh/ty/) — Astral's fast
  Rust type checker; still beta, so trial it rather than gating
  releases on it.
- [Semantic Versioning](https://semver.org/) — versioning rules for
  SDK releases.

## Required Workflow

1. Confirm the API contract and the SDK scope with
   `sdk-development`: which resources and operations to cover.
2. Scaffold the src layout: `pyproject.toml` with the `[build-system]`
   and `[project]` tables, `src/<package>/` with `__init__.py` and a
   `py.typed` marker, `tests/`, `README.md`, and `LICENSE`.
3. Implement the transport layer once: a sync client and an async
   client sharing configuration, error mapping, and retry logic.
   Build both on `httpx` (`httpx.Client` and `httpx.AsyncClient`).
4. Implement resource methods as thin wrappers: validate input, call
   the transport layer, map the response to typed objects.
5. Define the error model: one exception hierarchy rooted in a
   single SDK exception, carrying HTTP status, API error code, and
   request ID.
6. Add pagination helpers (generators and async generators) and
   streaming helpers that yield chunks without buffering.
7. Add type annotations to the whole public surface, ship
   `py.typed`, and run a type checker in strict mode in CI
   (mypy `--strict` or Pyright strict).
8. Write tests with pytest: unit tests against mocked HTTP
   (`pytest-httpx` or `respx`), plus contract tests against a test
   instance of the real API where available.
9. Wire the release gates into CI: build the wheel and sdist, run
   `twine check` (or the equivalent `uv publish --dry-run` check),
   install the built wheel into a clean environment, and import the
   package from outside the source tree.
10. Publish to PyPI from CI with trusted publishing, with semantic
    versioning and a changelog entry per `changelog-management`.

## Implementation Standards

- Packaging — src layout, `pyproject.toml` metadata, build backend,
  `requires-python`, and the `py.typed` marker: see
  [references/packaging.md](./references/packaging.md).
- Annotate the entire public surface: parameters, return values,
  and attributes. Prefer the standard-library generic syntax
  (`list[Order]`, `dict[str, str]`, `X | None`) over `typing`
  aliases on supported Python versions.
- Provide both a sync client and an async client, with the same
  method names and signatures, unless the API is used exclusively
  in one style. Share configuration, error mapping, and retry
  policy between them; do not let the two clients drift.
- The client is constructed once with credentials and options;
  every method uses that configuration. Never require credentials
  per call. Support use as a context manager (`with` /
  `async with`) so connections close cleanly.
- Errors are typed: a base `SdkError` (or a name matching the
  product) with `status_code`, `code`, and `request_id`
  attributes, and subclasses for authentication, validation, not
  found, rate limited, and server errors. Never raise bare
  `httpx.HTTPStatusError` to callers.
- Retries apply only to idempotent requests and transient failures
  (network errors, `429`, `5xx`), with exponential backoff and
  jitter and a bounded number of attempts. Respect `Retry-After`
  on `429`. Never retry a `4xx` other than `429`.
- Every request has a configurable timeout (default 30 seconds is a
  good starting point), set on the `httpx` client via
  `httpx.Timeout`, and the client accepts an overall deadline where
  the API supports long operations.
- Pagination helpers return generators (sync) or async generators
  (async) that fetch pages lazily, or accept an explicit page
  limit; never fetch an unbounded list into memory without the
  caller's consent.
- Streaming uses `httpx` streaming (`client.stream(...)`) and
  yields parsed chunks (for example server-sent events) as an
  iterator; never buffer a whole stream into memory to return it.
- The SDK sends a `User-Agent` identifying the SDK name and
  version.
- Keep runtime dependencies minimal: `httpx` is usually the only
  one. Avoid depending on a validation library at runtime unless
  the SDK's design requires it; every runtime dependency is a
  version-conflict risk for consumers.
- Source the version from exactly one place: a static `version` in
  `pyproject.toml`, or dynamic versioning from the VCS tag with
  `hatch-vcs` (or `setuptools-scm`). Never hardcode the version in
  two places.
- Breaking changes require a major version bump; adding a method or
  an optional parameter is a minor change. Deprecate with
  `warnings.warn(..., DeprecationWarning, stacklevel=2)` and a
  removal version before removing anything.

### Testing Strategy

- Test against the installed package, not the source tree: the
  src layout means tests import what consumers install, and a
  test run from the repository root must not accidentally import
  local source.
- Test HTTP behavior with mocked transports (respx or an
  `httpx.MockTransport`): success, each typed error subclass,
  Retry-After handling on 429, and no retry on other 4xx
  responses.
- Test both clients with the same cases: the sync and async
  clients share method names and behavior, so a behavior tested
  on one and not the other is a drift waiting to happen.
- Test pagination and streaming lazily: a paginated helper
  fetches pages only as the generator is consumed, and a
  streaming call yields chunks without buffering the whole
  response into memory.
- Test the published package: install the built wheel and sdist
  in a clean environment, import the package, and run the type
  checker against it to confirm `py.typed` ships and the
  annotations hold.

## Best Practices

- Design for the common case: the simplest call needs the fewest
  arguments, with keyword-only options for the rest.
- Make the SDK work with zero configuration beyond credentials:
  sane defaults for base URL, timeout, and retries.
- Return typed domain objects (dataclasses or `TypedDict`s), not
  raw `httpx.Response` objects, but expose the raw response
  (status, headers) for callers that need it, for example via a
  `response` attribute on the result or an `include_response`
  option.
- Define `__all__` in `__init__.py` and keep the top-level imports
  small; lazy-load heavy submodules so `import <package>` stays
  fast.
- Document every public method with a docstring and a short
  example; generate API reference docs from docstrings (MkDocs
  with mkdocstrings, or Sphinx) so docs cannot drift from code.
- Test error paths as thoroughly as success paths: wrong
  credentials, not found, rate limited, and server error.
- Version the SDK independently of the API, and record which API
  version each SDK release targets in the README and changelog.

## Security Considerations

- Never log credentials, tokens, or full request and response
  bodies. Redact `Authorization` headers in any debug output, and
  make sure `repr()` of client and error objects never includes a
  secret.
- Store credentials only in memory; the SDK must not write them to
  disk, to a cache, or to environment files.
- Use HTTPS only; refuse to send credentials over plain HTTP.
  Validate the base URL at construction and reject `http://`
  unless the caller explicitly opts into an insecure local
  endpoint for development.
- Validate inputs client-side (required fields, types) so mistakes
  fail fast, but never treat client-side validation as a substitute
  for server-side validation.
- Publish from CI with PyPI trusted publishing (OIDC) so no
  long-lived API token exists to leak. If a token is unavoidable,
  scope it to the one project and rotate it.
- Audit dependencies regularly (`pip-audit`) and keep the runtime
  dependency list minimal; each dependency is attack surface.
- Treat API error bodies as untrusted data: parse defensively and
  never interpolate raw error text into HTML or shell commands in
  examples or CLI wrappers.
- Never execute code from API responses, and never `eval` or
  `pickle.loads` anything the API returns.

## Performance Considerations

- Reuse one `httpx.Client` / `httpx.AsyncClient` per SDK client
  instance: connection pooling is the single biggest performance
  win, and creating a client per request defeats it.
- Support timeouts and cancellation (`asyncio.timeout` on the
  async path) so a hung API call does not hang the caller.
- Stream large responses instead of buffering them; for file
  downloads expose the raw stream alongside a convenience method.
- Paginate lazily and let callers request specific fields where the
  API supports it, so the SDK never fetches more than asked for.
- Keep imports light: `import <package>` should not pull in heavy
  optional dependencies. Import optional extras (for example a
  validation library) lazily inside the functions that need them.
- Avoid per-request overhead in the hot path: build headers once at
  client construction where possible, and do not re-parse
  configuration on every call.

## Common Mistakes

- Using a flat layout — tests import the source tree instead of the
  installed package and packaging bugs go unnoticed. Use the src
  layout and test the built wheel from a clean directory.
- Shipping no `py.typed` — consumers get no type information at
  all, however well annotated the source is.
- Supporting an end-of-life Python version — it blocks modern
  syntax and security fixes. Drop EOL versions on a major release.
- Shipping only a sync client — async applications cannot use it
  without blocking the event loop. Ship both, with matching
  surfaces.
- Creating a new `httpx.Client` per request — no connection reuse,
  slow, and leaks file descriptors. One client per SDK instance.
- Retrying non-idempotent requests — a retried payment or creation
  can duplicate the effect. Retry only idempotent operations.
- Swallowing the API's error details — a generic "request failed"
  hides the cause. Attach status, code, and request ID.
- No timeout — a hung request hangs the caller forever. Always set
  a default timeout.
- Version in two places — `pyproject.toml` and `__init__.py`
  drift. Single-source it, or read it at runtime with
  `importlib.metadata.version(__package__)`.
- Breaking the API surface in a minor release — follow semantic
  versioning strictly; developers trust the version number.

## Examples

A minimal `pyproject.toml` for a hatchling-based SDK:

  [assets/pyproject.toml](./assets/pyproject.toml).

A typed client with an error hierarchy and a lazy paginator:

  [examples/typed-client.py](./examples/typed-client.py).

## Validation Checklist

- [ ] The wheel and sdist build cleanly (`uv build` or
      `python -m build`) and `twine check` passes on both.
- [ ] The built wheel installs into a clean virtual environment
      and the package imports from outside the source tree.
- [ ] `py.typed` is present in the installed package.
- [ ] The type checker passes in strict mode (mypy `--strict` or
      Pyright strict) with no errors in the public surface.
- [ ] Tests pass on every Python version declared in
      `requires-python`.
- [ ] The client is constructed once with credentials and options;
      sync and async clients share method names and signatures.
- [ ] Errors are typed and carry status, code, and request ID.
- [ ] Retries apply only to idempotent requests and transient
      failures; every request has a configurable timeout.
- [ ] Pagination helpers are lazy or bounded; streaming never
      buffers a whole response.
- [ ] Tests cover success, authentication failure, not found, rate
      limit, and server error.
- [ ] No credentials are logged or persisted; credentials are sent
      over HTTPS only.

## Expected Deliverables

- A typed Python SDK in the src layout with `py.typed`, sync and
  async clients, and a typed error hierarchy.
- Tests with pytest against mocked HTTP (and a live test API where
  available), including error paths, on every supported Python
  version.
- CI with build, type check, test, and wheel-install gates.
- Documentation: quick start, authentication, per-resource
  examples, the error model, and the supported Python versions.
- A published PyPI package via trusted publishing, with semantic
  versioning and a changelog.

## References

- [Writing your pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [Python documentation](https://docs.python.org/3/)
- [Hatch documentation](https://hatch.pypa.io/)
- [PDM documentation](https://pdm-project.org/)
- [uv documentation](https://docs.astral.sh/uv/)
- [PyPI trusted publishing](https://docs.pypi.org/trusted-publishers/)
- [httpx documentation](https://www.python-httpx.org)
- [pytest documentation](https://docs.pytest.org)
- [mypy documentation](https://mypy.readthedocs.io/en/stable/)
- [Pyright](https://github.com/microsoft/pyright)
- [ty documentation](https://docs.astral.sh/ty/)
- [Semantic Versioning](https://semver.org/)
- Related skills in this repository: `sdk-development`,
  `api-design`, `rest-api`, `package-development`,
  `changelog-management`, `unit-testing`, `integration-testing`,
  `api-client-generation`.
