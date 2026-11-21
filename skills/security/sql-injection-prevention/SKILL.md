---
name: sql-injection-prevention
description: >
  Prevent SQL injection by parameterizing queries and using safe ORM
  patterns. Use when writing database queries, reviewing code that
  builds SQL from user input, fixing a SQL injection finding, or
  choosing how to handle dynamic sorting, filtering, and search.
license: MIT
metadata:
  version: "1.0.0"
  category: security
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# SQL Injection Prevention

## Purpose

SQL injection lets an attacker alter a database query by smuggling SQL
syntax through input the application concatenates into a query string.
It can expose, modify, or delete data, and in severe cases compromise
the database server. The fix is structural, not a filter: separate
code from data with parameterized queries, and use an ORM's safe APIs
for everything else.

## When to Use

- Writing any query that includes user-controlled or external data.
- Reviewing code that builds SQL strings, raw queries, or dynamic
  filters.
- Fixing a SQL injection finding from an audit or `owasp` review.
- Handling dynamic sorting, filtering, search, or pagination.
- Migrating raw SQL to an ORM or query builder.

## When Not to Use

- Injection into HTML or JavaScript — use `xss-prevention`.
- Injection into shell commands or LDAP — different encodings apply;
  use parameterized or escaped APIs for those systems.
- General security review — use `owasp` or `security-auditing`.

## Prerequisites

- Knowledge of the project's database access layer (ORM, query
  builder, or raw driver).
- Access to the data-access code and, for verification, a test
  database.
- Familiarity with the database engine's placeholder syntax
  (`$1` for PostgreSQL, `?` for MySQL and SQLite).

## Official Documentation

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) —
  the canonical defensive guidance.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Injection
  category context.
- [Prisma documentation](https://www.prisma.io/docs) — safe query
  APIs and raw query guidance for Prisma projects.

## Required Workflow

1. Inventory every query that incorporates data from outside the code:
   request parameters, user input, headers, file contents, and data
   from other services.
2. For each query, replace string concatenation or interpolation with
   a parameterized query: the SQL text is fixed, and values travel as
   bound parameters.
3. For dynamic identifiers (table names, column names, sort direction)
   that cannot be parameterized, validate against an allowlist of
   permitted values and reject anything else.
4. Where an ORM is used, prefer its typed query API over raw SQL. Use
   raw queries only when the ORM cannot express the query, and
   parameterize them the same way.
5. Remove any escaping-based "protection" that was the only defense;
   escaping is error-prone and must not replace parameterization.
6. Apply least privilege to the database account the application uses:
   it should have only the permissions the application needs.
7. Test with hostile input (quotes, comment markers, boolean logic,
   union keywords) and confirm the input is treated as data, never
   as SQL.
8. Add a regression test asserting that a representative injection
   payload returns no unexpected rows and causes no error that leaks
   schema details.

## Implementation Standards

- All values in SQL statements are bound parameters. String
  concatenation or template interpolation into SQL is forbidden.
- ORM raw-query APIs must use their parameterized form, never string
  interpolation of user data.
- Dynamic identifiers use an allowlist, validated server-side; user
  input never becomes a table or column name directly.
- Search and filter values are parameters; `LIKE` patterns escape
  their wildcard characters (`%`, `_`) when the pattern comes from
  user input.
- Database errors returned to clients are generic; detailed errors
  (which leak schema information) go to server logs only.
- The application database account has least privilege: no DROP,
  no admin rights, no access to other databases, unless the
  application genuinely requires it.
- Stored procedures are not a substitute for parameterization; a
  procedure that concatenates its arguments is still injectable.
- Input validation (types, lengths, allowlists) complements
  parameterization; it never replaces it.

## Best Practices

- Default to the ORM's typed API; it parameterizes by construction.
- Centralize query construction in a data-access layer so raw SQL is
  easy to find and review.
- Use static analysis or a query linter in CI to flag string-built
  SQL.
- Keep database credentials out of code; see `secrets-management`.
- Log suspicious query patterns (for example, inputs containing SQL
  keywords) for security monitoring, without logging the full query
  if it contains sensitive data.
- Review migrations and seed scripts too; they run with elevated
  privileges and can contain injected data.

## Security Considerations

- SQL injection is the highest-impact injection class: a single
  vulnerable query can expose an entire database.
- Second-order injection stores hostile data that becomes dangerous
  when a later query uses it unsafely; parameterize every query, not
  just the ones facing the user directly.
- Blind injection extracts data through timing or boolean responses;
  parameterization stops it regardless of how the attacker observes
  the result.
- Error-based probing relies on verbose errors; generic client-facing
  errors reduce the information available to an attacker.

## Performance Considerations

- Parameterized queries are usually faster: the database can cache
  the query plan and reuse it across parameter values.
- Allowlist validation of sort and filter fields is a cheap string
  comparison.
- Least-privilege database accounts have no performance cost.

## Common Mistakes

- Concatenating user input into SQL "just for this one query".
- Escaping quotes and calling it safe — escaping rules differ by
  context and engine, and one missed case is a vulnerability.
- Interpolating into raw ORM queries with template literals instead
  of using the parameterized raw API.
- Letting user input choose a column or sort direction without an
  allowlist.
- Trusting data because it came from the database (second-order
  injection).
- Returning detailed database errors to the client.
- Believing stored procedures or an ORM make injection impossible
  without checking how they are used.

## Examples

```ts
// Safe: values are bound parameters, never part of the SQL text.
import { db } from "./db";

async function findUserByEmail(email: string) {
  const rows = await db.query(
    "SELECT id, name, email FROM users WHERE email = $1",
    [email],
  );
  return rows[0] ?? null;
}
```

```ts
// Safe: dynamic sort column validated against an allowlist.
const SORTABLE_COLUMNS = ["name", "created_at", "email"] as const;

function sortColumn(requested: string): (typeof SORTABLE_COLUMNS)[number] {
  if ((SORTABLE_COLUMNS as readonly string[]).includes(requested)) {
    return requested as (typeof SORTABLE_COLUMNS)[number];
  }
  return "created_at";
}

// The column name is now a known-safe value; the value is a parameter.
async function listUsers(sort: string, limit: number) {
  const column = sortColumn(sort);
  return db.query(
    `SELECT id, name FROM users ORDER BY ${column} LIMIT $1`,
    [limit],
  );
}
```

```ts
// Unsafe pattern — never do this (shown only to recognize it):
// db.query("SELECT * FROM users WHERE email = '" + email + "'");
```

## Validation Checklist

- [ ] Every query incorporating external data uses bound parameters.
- [ ] No string concatenation or template interpolation of user data
      into SQL remains.
- [ ] Dynamic identifiers are validated against an allowlist.
- [ ] Hostile input is treated as data: no unexpected rows, no
      schema-leaking errors.
- [ ] Client-facing database errors are generic; details go to logs.
- [ ] The application database account has least privilege.
- [ ] A regression test covers a representative injection payload.

## Expected Deliverables

- Parameterized queries (or ORM equivalents) replacing all
  string-built SQL, with a list of files changed.
- Allowlist validation for any dynamic identifiers.
- Regression tests with representative injection payloads.
- A note on the database account's permissions and any tightening
  applied.

## References

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) —
  canonical guidance.
- [Prisma documentation](https://www.prisma.io/docs) — safe query
  APIs.
- Related skills in this repository: `owasp`, `xss-prevention`,
  `secrets-management`, `security-auditing`.
