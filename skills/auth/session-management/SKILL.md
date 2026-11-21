---
name: session-management
description: >
  Design and implement web sessions: session cookies, server-side session
  storage, expiry and sliding refresh, logout, and revocation. Use when the
  task mentions sessions, session cookies, "remember me", logout, session
  expiry or timeout, session fixation, concurrent sessions, or keeping a user
  signed in across requests.
license: MIT
metadata:
  version: "1.0.0"
  category: auth
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Session Management

## Purpose

A session keeps a user signed in across requests without re-entering
credentials. This skill covers designing sessions that are secure by
default: opaque session IDs in hardened cookies, server-side storage with
revocation, sensible expiry, and clean logout.

## When to Use

- Building or fixing the "stay signed in" behavior of a web app.
- The task mentions sessions, session cookies, logout, session expiry, timeout, or "remember me".
- Adding session revocation (sign out everywhere, revoke a device).
- Reviewing session security (fixation, hijacking, cookie flags).

## When Not to Use

- The task is about the sign-in flow itself — use `authentication`.
- The task is about stateless signed tokens between services — use `jwt`.
- The task is about the OAuth exchange that creates the session — use `oauth`.

## Prerequisites

- Authentication is in place: the app can verify a user's credentials and identify them.
- A session store is available: the app's database, Redis, or the auth library's built-in store.
- HTTPS is available on every environment handling real sessions.
- The product's session requirements are known: how long a user should stay signed in, and whether "remember me" is offered.

## Official Documentation

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — the reference for secure session design.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — session handling after login.
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) — cookie attributes and their behavior.

## Required Workflow

1. Choose the session model: server-side sessions (opaque ID in a cookie, state in the store) as the default; stateless JWT sessions only when revocation delay is acceptable.
2. Pick the store: the auth library's session table, or Redis for high-traffic apps; the store must support deletion by session ID and by user ID.
3. Generate session IDs with a cryptographically secure random generator (at least 128 bits of entropy) via the auth library or platform crypto.
4. Set the cookie with secure flags: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where cross-site navigation is not needed), `Path=/`, and a scoped domain.
5. On sign-in, create a fresh session and rotate the session ID (never keep a pre-login session ID).
6. On each request, load the session from the store, check expiry, and attach the user to the request; reject unknown or expired IDs.
7. Implement expiry: an idle timeout and an absolute maximum lifetime; refresh the idle timer on activity.
8. Implement logout: delete the server session and clear the cookie; offer "sign out everywhere" by deleting all of the user's sessions.
9. Invalidate all sessions on password change and on detection of compromise.
10. Run the Validation Checklist.

## Implementation Standards

- Session IDs are opaque random values; they must not encode the user ID or any data.
- Cookies are `HttpOnly`, `Secure`, and `SameSite=Lax` at minimum in production.
- Session IDs are never in URLs: no query parameters, no URL rewriting.
- Regenerate the session ID on privilege changes: sign-in, sign-out, password change, and role elevation.
- Idle timeout and absolute lifetime are both enforced; a session that is only idle-checked can live forever under continuous use.
- The store lookup is indexed on the session ID; expired sessions are cleaned up by a background job.
- "Remember me" uses a separate long-lived token with its own rotation and revocation, never a long-lived session cookie.
- Concurrent sessions are allowed by default; limit them only when the product requires it, and tell the user which devices are signed in.

## Best Practices

- Keep session payloads minimal: user ID and a few flags; fetch profile data from the database when needed.
- Show the user their active sessions (device, last active) and let them revoke individual sessions.
- Log session lifecycle events (created, expired, revoked) without logging session IDs.
- Prefer the auth library's session handling over custom cookie code; the library already handles rotation and expiry.
- Test the full lifecycle: sign in, idle expiry, absolute expiry, logout, and "sign out everywhere".
- When the app runs on multiple servers, the session store must be shared (database or Redis), not per-process memory.

## Security Considerations

- Session fixation: an attacker who sets a victim's session ID before login gains the victim's session — rotate the ID at login.
- Session hijacking: stolen cookies grant access — `Secure`, `HttpOnly`, and `SameSite` flags plus HTTPS reduce the risk; short idle timeouts limit the damage.
- XSS can bypass cookie flags if the app has script injection; session security depends on the app's overall XSS posture.
- Never accept a session ID from a query parameter or request body; cookies only.
- Invalidate sessions server-side on logout; clearing the cookie alone leaves a valid session an attacker could reuse.
- Rate-limit session creation to slow mass session creation attacks.

## Performance Considerations

- Every authenticated request does one session lookup; the lookup must be indexed and fast (Redis or an indexed database row).
- Avoid storing large objects in the session; the store is read on every request.
- Sliding expiry updates the session row on activity; batch or throttle the update (for example, refresh at most once a minute) to avoid a write per request.
- Clean up expired sessions regularly so the session table stays small and indexed lookups stay fast.

## Common Mistakes

- Keeping the pre-login session ID after sign-in — rotate it at login.
- Clearing the cookie on logout without deleting the server session — the session stays valid.
- Storing the session in process memory on a multi-server deployment — users get signed out when the load balancer moves them.
- Using a JWT as a session and discovering logout cannot revoke it — use server-side sessions when revocation matters.
- No absolute lifetime — a session refreshed forever never forces re-authentication.
- Putting the session ID in a URL — it leaks through logs, referers, and shared links.

## Examples

Secure session cookie settings (framework-agnostic):

```text
Set-Cookie: session=$SESSION_ID; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400
```

Session lifecycle in pseudocode-free outline form:

```ts
// Sign-in: create a fresh session, never reuse a pre-login ID.
const session = await sessionStore.create({
  userId: user.id,
  idleExpiresAt: minutesFromNow(30),
  absoluteExpiresAt: hoursFromNow(24),
});
setSessionCookie(response, session.id);

// Each request: load, check expiry, attach the user.
const session = await sessionStore.get(sessionIdFromCookie);
if (!session || session.isExpired()) {
  clearSessionCookie(response);
  throw new UnauthorizedError();
}

// Logout: delete server-side, then clear the cookie.
await sessionStore.delete(session.id);
clearSessionCookie(response);
```

## Validation Checklist

- [ ] Server-side sessions with opaque random IDs; no session data in the cookie.
- [ ] Cookie flags set: HttpOnly, Secure, SameSite=Lax or Strict.
- [ ] Session ID rotated at sign-in and on privilege changes.
- [ ] Idle timeout and absolute lifetime both enforced.
- [ ] Logout deletes the server session and clears the cookie.
- [ ] "Sign out everywhere" deletes all of the user's sessions.
- [ ] Sessions invalidated on password change.
- [ ] Expired sessions cleaned up by a background job.

## Expected Deliverables

- Session creation, validation, refresh, and revocation code wired to the auth flow.
- Cookie configuration with secure flags for production.
- The session store schema or configuration, with indexes on session ID and user ID.
- Tests for sign-in, expiry, logout, and revocation.

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- Related skills in this repository: `authentication`, `jwt`, `better-auth`, `auth-security`.
