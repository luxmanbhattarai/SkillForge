---
name: rbac
description: >
  Design and implement role-based access control: roles, permissions, role
  assignment, and permission checks in code and data. Use when the task
  mentions roles, permissions, admin vs member, RBAC, role assignment, access
  levels, or "only admins can" do something, or when an app needs more than
  one level of user access.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# RBAC

## Purpose

Role-based access control (RBAC) grants permissions through roles: a user
gets a role, the role carries permissions, and code checks permissions
rather than individual users. This skill covers designing a small, clear
role model, storing roles and assignments, and enforcing permission checks
on the server.

## When to Use

- An app needs more than one access level (admin, member, viewer, billing).
- The task mentions roles, permissions, RBAC, role assignment, or "only admins can".
- Replacing scattered `if (role === "admin")` checks with a permission system.
- Adding a new role or permission to an existing app.

## When Not to Use

- The app has one kind of user and ownership checks are enough — use `authorization` instead.
- Permissions depend on the resource itself (this document, that project) rather than the user's role — resource-level checks in `authorization` fit better, possibly combined with roles.
- Tenant isolation is the real need — use `multi-tenancy`.

## Prerequisites

- Authentication is in place; the server knows the current user.
- The roles and what each may do are agreed with the product owner before coding.
- A user store that can hold role assignments (a roles table, or a role column for very small models).

## Official Documentation

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — access control patterns including RBAC. Note the cheat sheet prefers attribute-based (ABAC) or relationship-based (ReBAC) access control when decisions need attributes or relationships beyond roles; RBAC fits when roles alone decide access.
- [NIST Role-Based Access Control project](https://csrc.nist.gov/projects/role-based-access-control) — the reference model for role-based access control (ANSI/INCITS 359-2012). The NIST project page itself is archived and no longer updated; the standard it describes is stable.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — verification standard, including authorization sections; ASVS 5.0.0 (May 2025) is current.

## Required Workflow

1. List the roles the product actually needs, starting from the smallest set (often admin, member, viewer); do not invent roles for hypothetical futures.
2. List the permissions as verb-resource pairs (`project:create`, `project:delete`, `billing:read`) — one list, in one file.
3. Map roles to permissions in one table or configuration file; a role is a named set of permissions.
4. Store the mapping in code for a fixed role set, or in the database when admins must edit roles at runtime.
5. Store user role assignments in the database (a user-roles join table, or a role column when each user has exactly one role).
6. Write one permission check helper, for example `hasPermission(user, "project:delete")`, and use it everywhere; never compare role strings in handlers.
7. Enforce checks on the server for every route, API endpoint, and server action; the UI hides controls only as a courtesy.
8. Add an admin flow for assigning and removing roles, restricted to users who hold the role-management permission.
9. Seed the initial roles and an initial admin account through a documented setup step, not through code that runs on every boot.
10. Test the matrix: each role against each protected action, including the deny cases.

## Implementation Standards

- Check permissions, not roles, in application code; roles are an assignment mechanism, not a check.
- Permission names are stable strings in one module; never spell a permission inline in a handler.
- Deny by default: a missing permission means no access.
- Role assignment changes take effect promptly; do not cache permissions across requests for longer than a few minutes.
- The admin role is a role like any other: it holds a set of permissions, not a bypass flag. Avoid a hard-coded "admin can do everything" shortcut in the check helper unless the product explicitly requires it and it is documented.
- Role assignment is itself a permission (`roles:assign`); only users with it may grant or revoke roles.
- Never let a user assign roles to themselves or escalate their own role.
- Keep the role count small: more than about eight roles usually means the model needs permissions on resources instead.

## Best Practices

- Name roles after jobs people do (billing admin, content editor) rather than technical tiers (level 3).
- Document the role-permission matrix in the repository so reviewers can audit it without reading code.
- Log role grants and revocations with who did it, to whom, and when.
- When roles change, review the matrix: adding a permission to a role affects every user with that role.
- Combine RBAC with ownership checks where needed: a member may edit their own project; an admin may edit any project.
- Provide a read-only viewer role early; products almost always need one.

## Security Considerations

- Role claims in tokens or sessions must come from the server's database, never from client input; a forged role claim is privilege escalation.
- Re-fetch roles from the database on sensitive actions rather than trusting a cached copy from login time.
- Protect the role-assignment endpoint as carefully as the most privileged action in the app.
- A user with many roles accumulates permissions; review assignments periodically and remove stale ones.
- Default new users to the least-privileged role; never default to admin.
- Removing a role must revoke its permissions immediately, including for active sessions where feasible.

## Performance Considerations

- Load the user's roles once per request and pass them down; do not query per permission check.
- Permission checks themselves are in-memory set lookups once roles are loaded; keep them that way.
- For list views, prefer one query that filters by the user's effective permissions over per-row checks.
- If roles live in the database, index the user-roles join table on user ID.

## Common Mistakes

- Comparing role strings in handlers (`if (role === "admin")`) — checks should be on permissions, in one helper.
- Inventing a role per user or per feature — roles multiply and the matrix becomes unmaintainable.
- Caching roles in a long-lived JWT and discovering a revoked role still works — keep tokens short-lived and re-check on sensitive actions.
- Forgetting the deny tests — every permission needs a test where a user without it is refused.
- Letting the client send its own role in a request — roles come from the server only.
- No audit trail for role changes — when something goes wrong, nobody knows who granted what.

## Examples

A permission list and role mapping in one module:

```ts
export const PERMISSIONS = {
  PROJECT_CREATE: "project:create",
  PROJECT_DELETE: "project:delete",
  PROJECT_READ: "project:read",
  BILLING_READ: "billing:read",
  ROLES_ASSIGN: "roles:assign",
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  viewer: [PERMISSIONS.PROJECT_READ],
  member: [PERMISSIONS.PROJECT_READ, PERMISSIONS.PROJECT_CREATE],
  billing: [PERMISSIONS.PROJECT_READ, PERMISSIONS.BILLING_READ],
  admin: Object.values(PERMISSIONS),
};
```

One permission check helper used everywhere:

```ts
function hasPermission(user: { roles: string[] }, permission: string): boolean {
  return user.roles.some((role) =>
    (ROLE_PERMISSIONS[role] ?? []).includes(permission),
  );
}

// In a handler:
if (!hasPermission(currentUser, PERMISSIONS.PROJECT_DELETE)) {
  throw new ForbiddenError("Deleting projects requires the project:delete permission.");
}
```

## Validation Checklist

- [ ] Roles and permissions listed in one module; roles map to permission sets.
- [ ] All checks use the permission helper, never inline role comparisons.
- [ ] Role assignment restricted to users with the role-management permission.
- [ ] New users default to the least-privileged role.
- [ ] Deny cases tested for every protected action.
- [ ] Role grants and revocations logged.
- [ ] Role-permission matrix documented in the repository.

## Expected Deliverables

- The permission list, role mapping, and check helper.
- Role assignment storage and the admin flow for managing assignments.
- Tests covering the role-permission matrix, including deny cases.
- The documented role-permission matrix.

## References

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NIST SP 800-162 — Guide to Attribute Based Access Control (ABAC)](https://csrc.nist.gov/pubs/sp/800/162/final)
- Related skills in this repository: `authorization`, `multi-tenancy`, `auth-security`.
