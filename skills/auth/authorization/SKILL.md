---
name: authorization
description: >
  Design and enforce authorization: deciding what an authenticated user may do
  and which resources they may touch, with server-side checks on every route
  and action. Use when the task mentions authorization, permissions, access
  control, "who can do what", protecting resources, ownership checks, or
  preventing users from seeing or changing other users' data.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Authorization

## Purpose

Authorization answers "what may this user do?" after authentication answers
"who are they?" This skill covers designing an authorization model —
ownership checks, role checks, and resource-level permissions — and
enforcing it on the server for every route, API endpoint, and data query.

## When to Use

- Deciding who can view, create, edit, or delete a resource.
- Adding permission checks to routes, API endpoints, or server actions.
- Fixing a bug where one user can see or change another user's data.
- The task mentions authorization, permissions, access control, or ownership.

## When Not to Use

- The task is only about signing users in — use `authentication`.
- The task needs a full role model with named roles and permission sets — use `rbac` (this skill covers the checks; `rbac` covers the role system).
- The task is about isolating tenants' data from each other — use `multi-tenancy`.
- The task is about API keys or service-to-service access — use `auth-security`.

## Prerequisites

- Authentication is already in place: the server knows who the current user is on every request.
- The resource model is known: what the entities are and which user or team owns each one.
- The permission rules are written down, even briefly, before enforcement code is written.

## Official Documentation

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) — access control patterns and pitfalls.
- [OWASP Top Ten — Broken Access Control](https://owasp.org/www-project-top-ten/) — why access control failures top the list.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — verification standard, including the authorization sections.

## Required Workflow

1. List the resources (posts, projects, invoices) and the actions on each (read, create, update, delete, share).
2. For each resource and action, write the rule in one sentence: "a user may edit a project if they own it or are an admin of its team."
3. Choose the enforcement point: a single authorization helper or middleware that every route and server action calls — never ad-hoc checks scattered through handlers.
4. Implement ownership checks first: load the resource, compare its owner/team to the current user, deny before any mutation.
5. Implement role checks where roles exist (see `rbac`); keep role names in one place.
6. Apply authorization at the data layer too: queries for list views must filter by what the user may see, not fetch everything and filter in the UI.
7. Return 403 (forbidden) when an authenticated user lacks permission and 404 when the resource must not be revealed to exist.
8. Add tests for the deny cases: another user's resource, a missing role, and an unauthenticated request.
9. Audit every existing route for missing checks; a route without an explicit check is a bug until proven otherwise.
10. Run the Validation Checklist.

## Implementation Standards

- Deny by default: a request is allowed only when a rule explicitly permits it.
- Enforce on the server for every request; client-side hiding of buttons is presentation, not security.
- Check authorization before any side effect: no database writes, emails, or file changes before the check passes.
- Use one authorization helper per app (for example `can(user, action, resource)`); do not duplicate rule logic in handlers.
- Never trust client-supplied ownership: the user ID comes from the session, never from the request body or query string.
- IDs in URLs are untrusted input: always verify the current user may access the resource that ID names (prevents insecure direct object references).
- Keep rules close to the data model so a new resource type gets its rules in the same change that adds it.

## Best Practices

- Prefer resource-level checks ("owns this project") over broad role checks where the data model supports it; roles are coarse.
- Centralize the rules in a policy module per resource so a reviewer can read all the rules for one resource in one file.
- Log denied access attempts with the user, resource, and action — repeated denials can signal probing.
- Make the 403 page helpful: say what is needed (a role, ownership) without revealing the resource's contents.
- Re-check authorization after loading fresh data in long-running flows; permissions may have changed since the page loaded.
- When in doubt whether a resource exists for this user, return 404 rather than 403 to avoid confirming its existence.

## Security Considerations

- Broken access control is the most common serious web vulnerability class; treat every missing check as a security bug.
- Never rely on obscurity: unguessable IDs (UUIDs) are not authorization.
- Batch and list endpoints need the same checks as single-resource endpoints; a list that leaks one field leaks the data.
- GraphQL resolvers and server actions need per-field and per-action checks, not just a check at the route.
- Admin endpoints deserve extra review: an admin check that can be bypassed by a forged role claim is a full compromise.
- Changing a user's roles must take effect promptly; cached permissions should expire quickly.

## Performance Considerations

- Authorization checks usually add one indexed lookup per request; keep the owner and membership columns indexed.
- Cache the current user's roles and memberships for the duration of a request, not across requests.
- For list views, filter in the database query (a `WHERE owner_id = ?` clause) instead of loading all rows and filtering in code.
- Avoid N+1 authorization checks in list rendering: load the needed permissions in one query.

## Common Mistakes

- Checking auth in the UI only and leaving the API open — any client can call the API directly.
- Taking the user ID from the request body ("userId": 42) instead of the session — trivially forged.
- Forgetting the check on one route (often delete, export, or an admin route) — audit every route.
- Using sequential IDs and no ownership check — incrementing the ID walks through other users' data.
- Returning 403 for resources the user should not know exist — use 404 there.
- Scattering `if (user.role === "admin")` through handlers — one helper, one source of truth.

## Examples

A single authorization helper (framework-agnostic TypeScript):

```ts
type Action = "read" | "update" | "delete";

interface Project {
  id: string;
  ownerId: string;
}

function can(user: { id: string; role: string }, action: Action, project: Project): boolean {
  if (user.role === "admin") return true;
  if (action === "read") return project.ownerId === user.id;
  return project.ownerId === user.id;
}

// In the handler, before any work:
if (!can(currentUser, "update", project)) {
  throw new ForbiddenError("You may only edit your own projects.");
}
```

Data-layer filtering for list views:

```ts
// Fetch only what the user may see; never fetch all rows and filter later.
const projects = await db.projects.findMany({
  where: { ownerId: currentUser.id },
});
```

## Validation Checklist

- [ ] Every resource/action pair has a written rule.
- [ ] One authorization helper is used by all routes and server actions.
- [ ] Ownership is verified from the session user, never from request input.
- [ ] Deny cases tested: other user's resource, missing role, unauthenticated request.
- [ ] List endpoints filter by permission in the database query.
- [ ] 403 vs 404 behavior decided per resource and applied consistently.
- [ ] All routes audited; no route lacks an explicit authorization decision.

## Expected Deliverables

- The authorization helper or policy module and its use across routes and actions.
- The written rule list for each resource and action.
- Tests covering the allow and deny cases.
- An audit note listing any route intentionally public and why.

## References

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- Related skills in this repository: `rbac`, `authentication`, `multi-tenancy`, `auth-security`.
