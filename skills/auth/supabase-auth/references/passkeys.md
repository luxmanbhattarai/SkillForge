# Passkeys (experimental in Supabase Auth)

- Passkeys are experimental in Supabase Auth: the JavaScript client
  requires opting in (`auth: { experimental: { passkey: true } }`) and
  registration requires an existing, confirmed, non-anonymous user.
  Passkeys are bound to the Relying Party ID (the bare domain), so choose
  the production domain before users register credentials.
