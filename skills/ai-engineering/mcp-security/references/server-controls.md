# Server-side controls

- Server verification. Maintain an allowlist of approved servers
  with pinned versions and a named owner per server. Verify the
  publisher and the distribution channel; a lookalike server
  name is a real attack (name squatting). Review the tool list
  on every update — a server update that adds a broad tool is a
  security event. For local servers, one-click install flows
  must show the exact command, untruncated, and get explicit
  approval before running it.
- Tool authorization. Every tool invocation is authorized
  against the caller's identity and the tool's required scope.
  Authorization is checked at call time, not only at connect
  time, so a revoked permission takes effect immediately. A tool
  that the caller is not authorized for must not appear in the
  tool list at all — do not advertise capabilities the caller
  cannot use.
- Permission scoping per tool. Each tool declares the minimum
  scope it needs, and scopes are narrow (a single directory, a
  single repository, read-only where possible). Avoid broad
  scopes such as full filesystem or admin access. Start with the
  smallest scope that works and expand only on a documented need.
- Least privilege. Servers run with the minimum OS, network, and
  API permissions their tools require. A file tool reaches only
  its configured directories (resolve symlinks and reject path
  traversal); a network tool reaches only its allowlisted hosts.
  Credentials held by a server are scoped to that server's job,
  one credential per server, never shared across servers.
- Input validation. The server validates every tool argument
  against its schema before acting: types, ranges, formats, and
  allowlists. Reject unknown fields. Apply business rules the
  schema cannot express (for example, "this user may only touch
  their own records"). Rate-limit tool calls per client so a
  runaway agent cannot flood the server or its upstream systems.
- Output sanitization. Tool results are capped in size and
  scrubbed of secrets, tokens, and credentials before they are
  returned. Error messages describe what went wrong without
  leaking internal paths, stack traces, or upstream credentials.
  Large results are paginated; a tool that returns megabytes
  wastes the model's context and widens the injection surface.
- Secret handling. Stdio servers obtain credentials from the
  environment, not from the authorization flow (the
  specification says stdio implementations should not use the
  OAuth profile). Remote servers accept only tokens issued for
  them: validate the audience (RFC 8707 resource indicators),
  issuer, expiry, and scope on every request. Token passthrough
  — accepting a token issued for another service and forwarding
  it downstream — is forbidden by the specification: it breaks
  the audience boundary and turns the server into a confused
  deputy. Never return secrets in tool results, resources, or
  logs. See `secrets-management`.
- Transport security. Remote servers use TLS (Streamable HTTP
  over HTTPS) with no plaintext fallback. OAuth metadata URLs
  must be HTTPS in production (loopback `http://` only for local
  development). Clients fetching OAuth metadata from
  server-supplied URLs must defend against SSRF: validate URLs,
  block private and link-local addresses (including cloud
  metadata endpoints), resolve DNS safely, and do not follow
  redirects to internal addresses.
- Authorization (remote servers). Follow the specification's
  OAuth 2.1 profile: the protected server acts as an OAuth 2.1
  resource server, publishes Protected Resource Metadata
  (RFC 9728), and clients discover the authorization server from
  it. Use the authorization code flow with PKCE and validate the
  issuer (RFC 9207) to prevent mix-up attacks. Prefer Client ID
  Metadata Documents for client registration; Dynamic Client
  Registration is deprecated in the current revision. Proxy
  servers that front third-party APIs must implement per-client
  consent before forwarding to the third-party authorization
  server, with exact redirect-URI matching, single-use short-lived
  `state` values, and CSRF-protected consent pages — otherwise a
  malicious client can steal authorization codes through the
  proxy's static client id (the confused deputy attack the
  official security guide documents).
