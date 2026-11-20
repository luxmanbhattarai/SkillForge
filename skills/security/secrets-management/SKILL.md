---
name: secrets-management
description: >
  Store, rotate, and use secrets (API keys, tokens, passwords,
  certificates) safely. Use when adding a new secret to a project,
  moving secrets out of code into a secret manager or environment
  variables, setting up CI secrets, rotating a leaked credential, or
  auditing a codebase for committed secrets.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Secrets Management

## Purpose

Secrets — API keys, database passwords, tokens, private keys — are
the keys to a system. Hard-coded in source, they leak through version
control, logs, and screenshots; mishandled in deployment, they leak
through environments and error reports. This skill covers storing
secrets in a proper manager or environment, injecting them at runtime,
rotating them, and responding when one leaks.

## When to Use

- Adding a new API key, token, password, or certificate to a project.
- Moving secrets out of source code into environment variables or a
  secret manager.
- Setting up secrets for CI, staging, and production environments.
- Rotating a secret on schedule or after a suspected leak.
- Auditing a repository for committed secrets.
- Choosing between a secret manager, environment variables, and
  platform secret storage.

## When Not to Use

- Choosing how users authenticate — that is application auth design,
  not secret storage.
- Encrypting data at rest in the application — use the platform's
  encryption services and the guidance in `owasp`.
- Storing non-secret configuration; plain environment variables
  without secret handling are fine for those.

## Prerequisites

- Access to the project's deployment platform and its secret storage
  (environment variables, platform secrets, or a secret manager).
- A list of the secrets the project uses and where each is consumed.
- Version control history access for leak auditing.

## Official Documentation

- [HashiCorp Vault](https://www.vaultproject.io/) — secret
  management platform.
- [GitHub Actions secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) —
  storing secrets for CI workflows.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  secrets and key management guidance.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Cryptographic
  Failures (A04 in the current 2025 edition) context.

## Required Workflow

1. Inventory every secret the project uses: API keys, database
   credentials, tokens, webhook secrets, private keys, and
   certificates. Record where each is used and who owns it.
2. Remove secrets from source code, configuration files, and
   documentation. Replace each with an environment variable reference
   or a secret manager lookup.
3. Store each secret in the right place: a secret manager or the
   deployment platform's secret storage for production; environment
   variables loaded from a local `.env` file (never committed) for
   development.
4. Document the required variables in a committed `.env.example` file
   containing only variable names and example formats — never real
   values.
5. Verify the application starts and works with secrets injected from
   the environment, and fails clearly (not silently) when a required
   secret is missing.
6. Set up secret scanning in CI so a committed secret fails the build.
7. Define a rotation schedule and the procedure for rotating each
   secret without downtime.
8. If a secret is suspected leaked, revoke it immediately, issue a
   replacement, update every consumer, and check logs for misuse.

## Implementation Standards

- No secret ever appears in source code, configuration files checked
  into version control, documentation, tests, screenshots, or chat
  logs. Use references such as `$DATABASE_URL` or `$API_KEY`.
- Secrets are injected at runtime from the environment or a secret
  manager, never baked into build artifacts or container images.
- `.env` files are git-ignored. `.env.example` lists variable names
  with clearly fake example values only.
- Each environment (development, staging, production) has its own
  secrets; production secrets are never used in lower environments.
- Secrets are scoped to least privilege: a key that only needs to
  read should not be able to write; a key for one service should not
  work for another.
- Secrets are never logged, never returned in API responses, and
  never included in error messages or stack traces.
- Access to production secrets is limited to the people and systems
  that need it, and access is reviewed periodically.
- Rotation is supported by design: secrets are referenced by name,
  not embedded, so replacing a value does not require a code change.

## Best Practices

- Prefer short-lived, automatically rotated credentials (workload
  identity, temporary tokens) over long-lived static keys where the
  platform supports them.
- Use a secret manager with audit logging for production; plain
  environment variables are acceptable for small projects but offer
  no audit trail.
- Give each integration its own credential so a leak or rotation
  affects one integration, not all of them.
- Scan the repository history, not just the current files, when
  auditing for leaks; a secret removed last month is still in the
  history.
- Treat a leaked secret as compromised until proven otherwise:
  revoke first, investigate second.
- Keep a runbook for rotation so it happens on schedule instead of
  only after an incident.

## Security Considerations

- A secret in version control history is a leaked secret even after
  the file is deleted; revoke it and rewrite history if the
  repository is shared.
- Environment variables can leak through process listings, crash
  reports, and misconfigured error pages; prefer a secret manager
  with in-memory delivery for high-value secrets.
- Never send secrets to a third party (analytics, error tracking,
  logging) — scrub them from payloads first.
- Client-side code must never contain secrets: anything shipped to
  the browser is public. Browser-facing keys must be public keys
  designed for that purpose.

## Performance Considerations

- Fetching secrets from a manager at startup is a one-time cost;
  cache them in memory for the process lifetime.
- Avoid fetching a secret on every request; load once and reuse.
- Secret rotation should not require restarts where the platform
  supports live reload; otherwise schedule restarts with the
  rotation.

## Common Mistakes

- Committing a `.env` file "just this once" or committing a secret
  in a test fixture.
- Using the same API key across development, staging, and production.
- Logging the full environment or config object for debugging.
- Storing secrets in the container image or build artifact.
- Putting a secret in client-side JavaScript or a mobile app binary.
- Rotating a secret in one place and forgetting a second consumer.
- Treating a revoked secret as safe to leave in history "because it
  is revoked" — revoke it, and also remove it from history where
  feasible.

## Examples

```bash
# .env (local only, git-ignored) — real values live here, never in git.
DATABASE_URL=postgres://app-user:<password>@localhost:5432/app
API_KEY=your-development-key-here
```

```bash
# .env.example (committed) — names and formats only, no real values.
DATABASE_URL=postgres://user:<password>@host:5432/database
API_KEY=your-api-key-here
```

```ts
// Read secrets from the environment; fail fast when missing.
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("Missing required environment variable: API_KEY");
}
```

```text
Leak response checklist:
1. Revoke the exposed secret immediately at the provider.
2. Issue a replacement and update every consumer.
3. Check provider logs for use of the old secret.
4. Remove the secret from the repository history if the repo is shared.
5. Record the incident: what leaked, where, and what changed.
```

## Validation Checklist

- [ ] No secret appears in source code, config, tests, docs, or
      version control history for active secrets.
- [ ] `.env` is git-ignored; `.env.example` lists names only.
- [ ] Each environment has its own secrets; production secrets are
      not used elsewhere.
- [ ] The application fails clearly when a required secret is
      missing.
- [ ] Secret scanning runs in CI and fails the build on a match.
- [ ] Every secret has an owner, a scope, and a rotation plan.
- [ ] No secret is logged, returned by an API, or shipped to the
      browser.

## Expected Deliverables

- Secrets moved to environment variables or a secret manager, with
  code changes referencing them by name.
- A committed `.env.example` documenting required variables.
- CI secret scanning configuration.
- A rotation runbook: each secret, its owner, its scope, and how to
  rotate it.
- A leak audit result, or a leak response record if one was needed.

## References

- [HashiCorp Vault](https://www.vaultproject.io/) — secret
  management platform.
- [GitHub Actions secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) —
  CI secret storage.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) —
  secrets and key management guidance.
- Related skills in this repository: `owasp`, `dependency-security`,
  `security-auditing`.
