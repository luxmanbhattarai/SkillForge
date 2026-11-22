---
name: database-security
description: >
  Secure databases: authentication, least-privilege roles, encryption,
  SQL injection prevention, auditing, and sensitive-data handling. Use
  when setting up database access, reviewing database security, hardening
  a database, handling personal or payment data, or responding to a
  database security concern. Trigger keywords: database security, SQL
  injection, least privilege, database encryption, database roles,
  database audit, database hardening.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Database Security

## Purpose

This skill covers securing a database and the data in it: authenticating and authorizing access, encrypting data in transit and at rest, preventing SQL injection, auditing access, and handling sensitive data so that a breach of one layer does not become a breach of everything.

## When to Use

- Setting up database users, roles, and permissions for a new application.
- Reviewing or hardening an existing database's security.
- Storing personal data, payment data, health data, or other sensitive information.
- Preventing or fixing SQL injection vulnerabilities.
- Setting up encryption (TLS, at-rest encryption) or auditing.
- Responding to a suspected database compromise or unauthorized access.
- Deciding how to handle data retention, erasure, or anonymization.

## When Not to Use

- When the task is only about schema design — use `database-design`.
- When the task is only about query speed — use `sql-optimization`.
- When the task is only about backups — use `backup-recovery` (but apply this skill's encryption and access rules to the backups).
- When the task is application authentication (user login, sessions) rather than database access — use the project's authentication skill.
- When the task is only about ORM usage — use `prisma` or `drizzle`.

## Prerequisites

- Knowledge of the database engine's authentication and authorization model (roles, grants, row-level security where supported).
- A list of who and what needs database access: application services, background workers, analysts, administrators.
- Knowledge of what sensitive data the database holds and which regulations or policies apply to it.
- Access to the database server configuration and the deployment's secret management.
- Supported versions: PostgreSQL 15–19, MySQL 8.4/9.7 LTS, MongoDB 7.0/8.0/8.3/9.0, SQLite 3.51 (see the engine skills for version detail). The examples use PostgreSQL syntax.

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — roles, privileges, row-level security, and TLS.
- [MySQL reference manual](https://dev.mysql.com/doc/) — user accounts, privileges, and TLS.
- [MongoDB documentation](https://www.mongodb.com/docs/) — authentication, authorization, and encryption.
- [SQLite documentation](https://www.sqlite.org/docs.html) — file security and encryption extensions.

## Required Workflow

1. Inventory the data: list the sensitive fields (personal data, credentials, payment data, secrets) and where they live.
2. Inventory the access: list every user, role, service, and network path that can reach the database, and remove any that are no longer needed.
3. Create one least-privilege role per application or service, granting only the permissions it needs on only the tables it needs; never share one superuser account across services.
4. Enable TLS for every connection that leaves the host, and require it where the engine supports enforcement.
5. Enable encryption at rest for the database and its backups, using the platform's or engine's supported mechanism.
6. Confirm every query path uses parameterized queries; search the codebase for string concatenation into SQL and fix every occurrence.
7. Apply row-level security or application-level tenant filtering where different tenants or users share tables, and test it with the actual application role.
8. Turn on auditing for administrative actions and for access to sensitive tables, and send the logs somewhere they cannot be altered by the database administrator alone.
9. Set a password and credential policy: strong generated passwords, stored in a secret manager, rotated on a schedule, and never committed to the repository.
10. Review the whole setup on a schedule and after any incident: re-run this checklist, check for new accounts, and confirm backups are encrypted and access-controlled.

## Implementation Standards

- Every query uses parameterized values; string interpolation into SQL is a defect, not a style choice.
- Every application connects with its own least-privilege role; no application connects as a superuser or database owner.
- Administrative access uses individual accounts, not a shared admin login, so actions are attributable.
- TLS is required for any connection over a network; unencrypted connections are allowed only on localhost where the risk is accepted and documented.
- Passwords are stored as hashes using a maintained password-hashing function, never in plain text and never with a fast general-purpose hash alone.
- Secrets (API keys, tokens) are stored in a secret manager, not in the database, unless the database is the documented secret store and the values are encrypted.
- Sensitive columns are encrypted at the application level where the threat model requires it (so a database backup alone does not expose them).
- The database port is not exposed to the public internet; access is through a private network, a bastion, or a VPN.
- Default accounts and sample databases are removed; the server runs the latest patched version.
- Data retention and erasure are implemented in the schema and the application, so a deletion request can actually be honoured.

## Best Practices

- Apply defence in depth: network controls, authentication, authorization, encryption, and auditing — no single layer is the whole defence.
- Separate duties: the person who can change the schema is not the same role as the application that reads and writes data.
- Use read-only roles for analytics, reporting, and debugging; a read-only role cannot accidentally (or maliciously) modify data.
- Mask or tokenize sensitive data in non-production environments; developers and testers should not work with real personal data.
- Review grants regularly: roles accumulate permissions over time, and a quarterly review catches drift.
- Keep the database patched; security fixes ship in minor releases, and an unpatched database is a known target.
- Log failed login attempts and alert on unusual patterns; a brute-force attempt should be visible before it succeeds.

## Security Considerations

- SQL injection is the most common database attack: parameterized queries everywhere, input validation, and least-privilege roles together limit both the attack and its blast radius.
- A leaked connection string is a full compromise of that role's access: store credentials in a secret manager, rotate them, and scope them tightly.
- Backups are copies of the database: encrypt them, restrict access, and delete them on schedule.
- Row-level security and tenant filtering must be tested with the actual application role; a policy that is never tested is a policy that may not work.
- Insider risk is real: individual accounts, auditing, and least privilege make misuse visible and limited.
- A database exposed to the internet without authentication will be found and attacked quickly; never expose the port publicly.

## Performance Considerations

- Encryption at rest has a small overhead on most modern platforms; the security benefit outweighs it for any database holding sensitive data.
- TLS adds handshake and encryption overhead per connection; connection pooling (`connection-pooling`) amortizes it across reused connections.
- Row-level security adds a filter to every query on protected tables; keep policies simple and index the columns they filter on.
- Auditing adds write load; audit administrative actions and sensitive-table access, not every read on every table, unless the policy requires it.
- Application-level encryption of a column prevents the database from filtering or indexing that column's plaintext; encrypt only the columns the threat model requires.

## Common Mistakes

- Interpolating user input into SQL — the classic SQL injection; always use parameterized queries.
- One shared superuser account for every service — a compromise of one service compromises everything; use one least-privilege role per service.
- Storing passwords in plain text or with a fast hash — use a maintained password-hashing function.
- Exposing the database port to the public internet — it will be found and attacked; keep it private.
- Committing credentials to the repository — they are compromised the moment they are committed; use a secret manager and rotate any credential that was committed.
- Using production data in development or tests — a leak of a dev database is a leak of real personal data; mask or synthesize it.
- Assuming the application is the only client — analysts, BI tools, and scripts also connect; give each its own least-privilege role.
- Forgetting backups in the security review — an unencrypted backup in world-readable storage is a breach waiting to happen.

## Examples

```sql
-- Example: least-privilege role for an application (PostgreSQL).
CREATE ROLE app_readwrite LOGIN PASSWORD 'stored-in-secret-manager';
GRANT CONNECT ON DATABASE mydb TO app_readwrite;
GRANT USAGE ON SCHEMA public TO app_readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;
-- Cover tables created later, which the grant above does not reach:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_readwrite;
```

```sql
-- Example: row-level security so tenants see only their own rows (PostgreSQL).
-- current_setting(..., true) returns NULL instead of erroring when the
-- setting is unset, so the policy fails closed (no rows match) rather
-- than breaking the query.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id', true)::bigint);
```

```ts
// Example: parameterized query — values are never interpolated into SQL.
await db.query("SELECT id, name FROM users WHERE email = $1", [email]);
```

## Validation Checklist

- [ ] Sensitive data is inventoried and its storage, encryption, and retention are documented.
- [ ] Every application and service has its own least-privilege role; no application connects as a superuser.
- [ ] TLS is required for connections over a network; the database port is not publicly exposed.
- [ ] Encryption at rest is enabled for the database and its backups.
- [ ] Every query path uses parameterized queries; a codebase search found no SQL string concatenation.
- [ ] Passwords are hashed with a maintained password-hashing function; secrets live in a secret manager.
- [ ] Row-level security or tenant filtering is tested with the actual application role, where tenants share tables.
- [ ] Auditing is enabled for administrative actions and sensitive-table access.
- [ ] Non-production environments use masked or synthetic data, not real personal data.
- [ ] Credentials are stored in a secret manager, rotated on a schedule, and never committed.

## Expected Deliverables

- The role and grant definitions for each application and service.
- A note on the TLS, encryption-at-rest, and network controls in place.
- Evidence that queries are parameterized (a search result or a review note).
- The audit configuration and where the logs go.
- Any data-retention or erasure procedure that was implemented or confirmed.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — roles, privileges, RLS, TLS.
- [MySQL reference manual](https://dev.mysql.com/doc/) — accounts, privileges, TLS.
- [MongoDB documentation](https://www.mongodb.com/docs/) — authentication, authorization, encryption.
- [SQLite documentation](https://www.sqlite.org/docs.html) — file security.
- Related skills in this repository: `backup-recovery`, `database-design`, `postgresql`, `mysql`, `mongodb`, `sqlite`, `connection-pooling`.
