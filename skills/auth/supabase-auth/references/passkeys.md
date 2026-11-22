# Passkeys in Supabase Auth

- Passkeys are enabled by default in the JavaScript client
  (`registerPasskey()`, `signInWithPasskey()`, `auth.passkey.*`): no
  opt-in flag is needed. The old opt-in (`auth: { experimental:
  { passkey: true } }`) is deprecated and ignored in current
  `@supabase/auth-js` — do not set it in new code. Enable passkeys
  for the project in the Dashboard (Authentication → Passkeys) and
  configure the Relying Party ID (the bare domain) and origins there.
- Registration requires an existing, confirmed, non-anonymous user.
  Passkeys are bound to the Relying Party ID (the bare domain), so
  choose the production domain before users register credentials.
