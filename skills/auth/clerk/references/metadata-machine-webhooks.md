# Metadata trust, machine access, webhooks

- Metadata has three buckets with different trust levels: `publicMetadata`
  (readable by the client, writable server-side only — the right place for
  roles), `privateMetadata` (server-side only), and `unsafeMetadata`
  (editable by the user from the client — never use it for authorization).
- Machine access (API keys, machine-to-machine tokens, OAuth tokens) is
  checked with the same `auth()` call using the `acceptsToken` option;
  do not build a parallel API-key system unless the product needs one.
- Webhook handlers verify the Svix signature on the raw body before doing
  anything else, using Clerk's documented `verifyWebhook` helper (from
  `@clerk/backend/webhooks`, which reads the signing secret from
  `CLERK_WEBHOOK_SIGNING_SECRET`) or the `svix` package. Unverified
  webhook requests are rejected.
