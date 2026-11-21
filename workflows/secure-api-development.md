# Secure API Development

Build an API that is correct and secure from the first endpoint:
contract, authentication, validation, and tests — not security
bolted on afterwards.

## Inputs

- The API's purpose, consumers, and data sensitivity.
- Authentication requirements (who calls it, how they prove it).
- The framework and hosting in use, if already chosen.

## Steps

1. **Define the contract** (`api-design`, `advanced-api-architecture`).
   Define resources, versioning, pagination, and error shapes before
   writing code. Record the contract in OpenAPI (`openapi`) when the
   API is public or has multiple consumers.
2. **Choose the framework** (`express`, `fastify`, or `nestjs`) and
   set up the project with typed inputs and outputs.
3. **Design authentication and authorization** (`authentication`,
   `auth-security`). Decide who can call each endpoint and how
   permissions are checked. Never design auth per endpoint as an
   afterthought.
4. **Implement input validation.** Validate every input at the
   boundary; reject what does not match the contract. Use
   parameterized queries only (`sql-injection-prevention`).
5. **Add security headers and CSRF protection** (`secure-headers`,
   `csrf-protection`) for browser-facing endpoints. Set CORS
   deliberately, never as a wildcard for credentialed requests.
6. **Add rate limiting and request limits.** Protect expensive
   endpoints and login paths; return standard rate-limit headers.
7. **Handle secrets properly** (`secrets-management`). Secrets come
   from the secret manager or environment, never from code or logs.
8. **Generate clients from the contract** (`api-client-generation`)
   when consumers need a typed client, instead of hand-writing one.
9. **Write tests** (`unit-testing`, `integration-testing`). Cover the
   happy path, auth failures, validation failures, and rate limiting.
10. **Review against OWASP** (`owasp`). Check the finished API for the
    common weaknesses: broken access control, injection, auth
    failures, and sensitive-data exposure. Fix findings before
    shipping; do not ship around them.

## Outputs

- Working API matching the agreed contract.
- OpenAPI contract (when applicable) and generated clients.
- Tests covering auth, validation, and failure cases.
- A note of security decisions and any accepted risks.

## Checks

- [ ] Every endpoint validates input and enforces authorization.
- [ ] Queries are parameterized; no string-built SQL.
- [ ] No secrets in code, logs, or responses.
- [ ] Rate limiting covers login and expensive endpoints.
- [ ] Tests pass, including auth-failure and validation-failure cases.
- [ ] OWASP review done; findings fixed or explicitly accepted.
