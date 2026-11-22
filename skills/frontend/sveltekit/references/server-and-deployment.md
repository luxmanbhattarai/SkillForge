# Server and deployment: environment, hooks, adapters

- Environment variables: private values via `$env/static/private`
  or `$env/dynamic/private` (server-only files only); public
  values via `$env/static/public` or `$env/dynamic/public` with a
  `PUBLIC_` prefix. Never import a private env module into client
  code — the build fails, and for good reason.
- Hooks: `src/hooks.server.js` (`handle`, `handleError`,
  `handleFetch`) and `src/hooks.client.js` for cross-cutting
  request behavior. Keep auth checks in hooks or server `load`,
  not in components.
- Adapters: pick one official adapter for the target —
  `@sveltejs/adapter-auto` for zero-config platforms,
  `adapter-node` for a Node server, `adapter-static` for SSG,
  `adapter-vercel`, `adapter-netlify`, `adapter-cloudflare`, or
  `adapter-bun`. Only one adapter is active at a time.
