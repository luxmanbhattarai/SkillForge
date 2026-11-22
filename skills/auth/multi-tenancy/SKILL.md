---
name: multi-tenancy
description: >
  Build multi-tenant applications where each tenant (organization, workspace,
  customer) sees only its own data: tenant isolation strategies, tenant
  resolution, row-level security, and cross-tenant access prevention. Use
  when the task mentions multi-tenancy, tenants, organizations, workspaces,
  teams, tenant isolation, row-level security, RLS, or per-customer data
  separation.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Multi-Tenancy

## Purpose

Multi-tenancy serves many customers from one application while keeping each
tenant's data strictly separate. This skill covers choosing an isolation
strategy, resolving the current tenant on every request, scoping every
query to that tenant, and proving with tests that no tenant can reach
another's data.

## When to Use

- Building a SaaS app with organizations, workspaces, teams, or customer accounts.
- The task mentions multi-tenancy, tenants, tenant isolation, row-level security, or per-customer data.
- Adding a second tenant to an app that was built single-tenant.
- Auditing an existing multi-tenant app for cross-tenant leaks.

## When Not to Use

- The app genuinely has one tenant and no plans for more — single-tenant design is simpler.
- The task is only about roles within one tenant — use `rbac`.
- The task is only about what a user may do with a resource — use `authorization`.

## Prerequisites

- Authentication is in place; the server knows the current user.
- The tenant model is decided: what a tenant is (organization, workspace) and how users belong to tenants.
- A database that supports the chosen isolation strategy (PostgreSQL row-level security needs PostgreSQL 9.5 or newer; it is a stable, long-standing feature in all supported PostgreSQL versions).
- The tenant resolution source is known: subdomain, path, header, or the user's membership.

## Official Documentation

- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — row-level security, the database-enforced isolation layer.
- [Supabase documentation](https://supabase.com/docs) — Postgres with row-level security as a hosted option.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — access control patterns that apply across tenants.

## Required Workflow

1. Choose the isolation strategy and record the decision: shared database with a `tenant_id` column (simplest, most common), separate schemas per tenant, or separate databases per tenant (strongest isolation, most operational cost).
2. Model tenants and memberships: a `tenants` table, a `tenant_members` join table with a role per membership, and a `tenant_id` column on every tenant-owned table.
3. Resolve the tenant on every request from exactly one source (the user's active membership, a subdomain, or a path segment); never let the client choose the tenant freely.
4. Scope every query to the current tenant: add the tenant filter at the data layer, ideally in one helper or ORM middleware, not by hand in each query.
5. Add database row-level security policies as a second layer when using PostgreSQL, so a missing application filter cannot leak data.
6. Verify membership on tenant switching: a user may only switch to tenants they belong to.
7. Enforce tenant scoping on writes, deletes, file uploads, background jobs, and search indexes — not just reads.
8. Add cross-tenant tests: user A of tenant 1 must get 404/403 for tenant 2's resources, including list, detail, update, and delete endpoints.
9. Audit background jobs, webhooks, and admin tools: each must carry and enforce a tenant context.
10. Run the Validation Checklist.

## Implementation Standards

- Every tenant-owned table has a non-nullable `tenant_id` column, indexed, with a foreign key to the tenants table.
- The tenant context comes from the server (session plus verified membership), never from a client-supplied ID alone.
- All queries go through a tenant-scoped data layer; raw unscoped queries are forbidden for tenant-owned tables.
- Row-level security policies are defense in depth: the application filter is the primary control, RLS is the backstop.
- Tenant IDs are unguessable (UUIDs); sequential tenant IDs make enumeration trivial.
- A user with memberships in several tenants has one active tenant per request, set explicitly when they switch.
- Tenant creation is a controlled flow: the creator becomes the tenant's first admin, and the tenant gets its own isolated data from the start.
- Deleting a tenant deletes or archives all of its data; define the retention behavior before launch.

## Best Practices

- Make the tenant filter impossible to forget: an ORM middleware or repository base class that always adds it beats discipline.
- Keep tenant-agnostic tables (global configuration, public content) clearly separate from tenant-owned tables, and document which are which.
- Use subdomains per tenant only when the product needs branded URLs; path or membership-based resolution is simpler to operate.
- Give each tenant its own API keys and webhooks, scoped to that tenant.
- Test with at least two tenants and a user who belongs to both; that combination catches most scoping bugs.
- Log tenant context on errors so a cross-tenant bug is diagnosable from logs alone.

## Security Considerations

- A missing tenant filter is a data breach affecting every tenant; treat unscoped queries as security bugs, not ordinary bugs.
- Never trust a `tenant_id` from the request body, query string, or headers without verifying membership.
- Row-level security only helps if the app connects with a role that has RLS enabled and sets the tenant context for the transaction.
- Admin and support tools that span tenants need their own authorization and audit logging; they are high-value targets.
- File storage must be tenant-scoped too: per-tenant prefixes or buckets, with signed URLs that expire.
- Search indexes and caches must include the tenant in the key; a shared cache key can serve one tenant's data to another.

## Performance Considerations

- Index `(tenant_id, ...)` on every tenant-owned table; the tenant filter is in nearly every query.
- Keep tenants' data sizes in mind: one very large tenant can dominate a shared table; monitor per-tenant row counts.
- Cache keys must include the tenant ID; cache invalidation is per tenant.
- Connection pooling with RLS needs care: the tenant context must be set per transaction and cleared afterwards, or one tenant's context leaks into another's query.

## Common Mistakes

- Adding `tenant_id` to some tables and forgetting others — audit every table.
- Filtering reads but not writes — an update without a tenant filter can modify another tenant's row.
- Letting the client send `tenant_id` in the request body — the server resolves the tenant from verified membership.
- Background jobs that run without a tenant context — a job that emails "all users" must scope to one tenant per run.
- Shared cache keys across tenants — always include the tenant in the key.
- Testing with one tenant only — cross-tenant bugs are invisible until a second tenant exists.

## Examples

Tenant-scoped query helper (framework-agnostic TypeScript):

```ts
// All tenant-owned queries go through helpers like this one.
// The tenant ID comes from the verified session, never from the request.
async function listProjects(db: Database, tenantId: string) {
  return db.projects.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

// Writes check ownership in the same statement: the update only affects
// a row that belongs to this tenant.
async function renameProject(db: Database, tenantId: string, id: string, name: string) {
  const updated = await db.projects.updateMany({
    where: { id, tenantId },
    data: { name },
  });
  if (updated.count === 0) throw new NotFoundError("Project not found");
}
```

PostgreSQL row-level security policy (defense in depth):

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- `missing_ok` (the second argument) makes a missing setting return NULL
-- instead of raising an error, so the comparison fails closed (no rows)
-- when the tenant context was never set for the transaction.
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

## Validation Checklist

- [ ] Isolation strategy chosen and documented.
- [ ] Every tenant-owned table has a `tenant_id` column, indexed, with a foreign key.
- [ ] Tenant resolved server-side from verified membership on every request.
- [ ] All reads, writes, deletes, jobs, and file access scoped to the tenant.
- [ ] Cross-tenant tests pass for list, detail, update, and delete endpoints.
- [ ] Row-level security policies in place where PostgreSQL is used.
- [ ] Cache keys and search indexes include the tenant ID.
- [ ] Tenant switching verifies membership; tenant deletion behavior defined.

## Expected Deliverables

- Tenant and membership models with `tenant_id` on all tenant-owned tables.
- The tenant-scoped data layer and tenant resolution logic.
- Row-level security policies where applicable.
- Cross-tenant tests covering reads, writes, and deletes.

## References

- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase documentation](https://supabase.com/docs)
- Related skills in this repository: `authorization`, `rbac`, `authentication`, `auth-security`.
