# SDK Development

Build a client SDK for an API: design the surface, generate or write
the client, document it, version it, and publish it.

## Inputs

- The API the SDK wraps (OpenAPI contract or equivalent).
- Target language(s) and the audience (internal or public).
- Versioning and release expectations.

## Steps

1. **Define the API surface** (`sdk-development`, `api-design`).
   Decide what the SDK exposes and what it hides. The SDK is a
   product: its surface is a design decision, not a mirror of the
   HTTP API.
2. **Define the contract** (`openapi`). The SDK is built from the
   OpenAPI contract; if the contract is missing or wrong, fix it
   first — do not build an SDK on a guessed API.
3. **Generate the client** (`api-client-generation`) where generation
   fits, or write it by hand with the language SDK skill
   (`typescript-sdk`, `python-sdk`). Generated code is reviewed, not
   trusted blindly.
4. **Design errors and retries.** Every failure mode the API can
   produce gets a typed error in the SDK. Retries are bounded, with
   backoff, and never retry non-idempotent calls.
5. **Write tests** (`unit-testing`, `integration-testing`). Cover the
   public surface, error handling, and retries against a mock or
   staging API.
6. **Write documentation** (`technical-documentation`,
   `api-documentation`). Quickstart, authentication, every public
   method, and a migration guide for breaking changes.
7. **Version and changelog** (`release-management`, `changesets`,
   `changelog-management`). Follow semantic versioning; breaking
   changes get a major bump and migration notes.
8. **Package and publish** (`package-development`). Publish a
   prerelease first and verify installation from a clean project
   before the stable release.

## Outputs

- Published SDK with a typed public surface.
- Documentation: quickstart, reference, and migration guide.
- Changelog entry for the release.
- Tests covering the public surface and error handling.

## Checks

- [ ] The SDK is built from the real API contract, not a guess.
- [ ] Every API failure mode has a typed SDK error.
- [ ] Retries are bounded and never retry non-idempotent calls.
- [ ] Documentation covers quickstart, auth, and every public method.
- [ ] Versioning follows semver; breaking changes have migration notes.
- [ ] Prerelease verified from a clean install before stable publish.
