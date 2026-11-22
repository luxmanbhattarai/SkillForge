---
name: mcp-security
description: >
  Secure Model Context Protocol (MCP) servers and clients: tool
  authorization and least privilege, per-tool permission scoping, input
  validation, output sanitization, trust boundaries, secret handling,
  untrusted content handling, tool poisoning, prompt injection (direct and
  indirect), server verification, transport security, OAuth 2.1
  authorization, user confirmation for consequential actions, and audit
  logging. Use when hardening an MCP deployment, reviewing an MCP server
  or client for security, or connecting an agent to third-party MCP
  servers. Building a server is covered by mcp-development; this skill is
  the security half.
license: MIT
metadata:
  version: "1.0.0"
  category: ai-engineering
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# MCP Security

## Purpose

This skill covers securing Model Context Protocol deployments on
both sides of the connection: servers that expose tools, resources,
and prompts, and clients (and the agents behind them) that consume
them. It covers authorization, least privilege, validation,
sanitization, trust boundaries, secrets, untrusted content, tool
poisoning, prompt injection, transport security, confirmation for
consequential actions, and audit logging. The outcome is an MCP
deployment where a compromised, malicious, or merely confused
server or model cannot exceed the authority it was granted — and
where every consequential action is visible and attributable.

This skill is the security half of `mcp-development`, which covers
building servers. Read that skill for server construction; read
this one before the server (or client) touches production.

## When to Use

- Hardening an MCP server before production deployment, local
  (stdio) or remote (Streamable HTTP).
- Reviewing an MCP server or client for security gaps.
- Connecting an agent or assistant to a third-party MCP server.
- Designing authorization, approval flows, or audit logging for
  MCP tool calls.
- Investigating a suspicious MCP tool call, unexpected tool
  behavior, or a suspected prompt-injection incident.
- Writing a security policy for which MCP servers an organization
  may use.

## When Not to Use

- Building a new MCP server from scratch — use `mcp-development`
  for construction, then return here to harden it.
- General LLM application security with no MCP component — use
  `llm-integration` and `ai-agents`.
- General web API authorization design — use `oauth`,
  `authorization`, and `api-design`.

## Prerequisites

- Familiarity with MCP concepts (host, client, server; tools,
  resources, prompts; stdio and Streamable HTTP transports) — see
  `mcp-development`.
- A threat model for the deployment: who runs the servers, who
  connects to them, what the tools can reach, and what damage a
  malicious or misused tool could do.
- The current MCP specification. the current
  revision is dated 2026-07-28; the TypeScript SDK v2
  (`@modelcontextprotocol/server`) implements it. Check the
  official docs for the current revision before relying on
  specific requirements — details change between revisions.

## Official Documentation

- [MCP security best practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
  — the official security guide for the current specification
  revision: confused deputy attacks, token passthrough, SSRF,
  consent flows, and mitigations. Read this first.
- [Model Context Protocol documentation](https://modelcontextprotocol.io/docs)
  — the official guides, concepts, and SDK references, including
  the authorization specification (OAuth 2.1 profile for HTTP
  transports).
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
  — the official TypeScript SDK repository (v2 is the stable
  line; v1 is legacy).
- [OWASP GenAI Security Project](https://genai.owasp.org/) — the
  current Top 10 for LLM Applications and the companion Top 10
  for Agentic Applications, for the wider AI threat model.

## Required Workflow

1. Map the trust boundaries: host, client, server, upstream APIs,
   and the model. Decide what each side may do to the others, and
   where authentication and authorization are enforced. Write it
   down — an undocumented trust boundary is an unenforced one.
2. Inventory every MCP server in the deployment: who provides it,
   what version, what tools it exposes, what systems those tools
   reach, and what credentials it holds. No server runs without
   an entry in the inventory.
3. Verify each server before connecting: approved allowlist,
   pinned version, known publisher, reviewed tool list. Never
   connect to an unverified server, and never auto-install a
   server from an untrusted source.
4. Classify every tool by consequence: read-only, state-changing,
   or destructive/irreversible (delete, send, charge, grant
   access). Consequential tools get authorization checks and
   user confirmation.
5. Authorize per tool: the server checks the caller's identity
   and permissions for each tool invocation, not just at
   connection time. Remote servers authenticate every client.
6. Validate all tool inputs server-side against the declared
   schema, with additional business checks (ranges, allowlists,
   path and host restrictions). Never trust client-side
   validation.
7. Sanitize all tool outputs: strip secrets and credentials, cap
   sizes, and treat outputs as untrusted data on the client side.
8. Handle secrets properly: stdio servers take credentials from
   the environment; remote servers use OAuth 2.1 tokens issued
   for that server, never tokens passed through from another
   service.
9. Require user confirmation for consequential actions: the
   client shows the exact tool, arguments, and effect, and the
   user approves before execution.
10. Log every tool invocation for audit: who, what, when, with
    what arguments (redacted), and with what outcome.
11. Test the security controls: invalid inputs, unauthorized
    callers, oversized outputs, malicious tool descriptions,
    injected instructions in tool results, and revoked
    credentials. Re-test on every server or SDK update.

## Implementation Standards

- Trust boundaries. The model is not a trust boundary: anything
  the model can say, a prompt injection can also make it say.
  Enforcement lives in code — in the server's authorization
  checks and the client's confirmation flows — never in prompt
  text. Tool descriptions, resource contents, and prompt
  templates from a server are untrusted input to the client
  until the server is verified; even then, treat their contents
  as data, not instructions.
- Server-side controls — server verification, tool authorization,
  permission scoping, least privilege, input validation, output
  sanitization, secret handling, transport security, and
  remote-server authorization: see
  [references/server-controls.md](./references/server-controls.md).
- Client-side and human controls — user confirmation, audit logging,
  untrusted content handling, tool poisoning, and prompt injection:
  see [references/client-controls.md](./references/client-controls.md).

### Testing Strategy

- Test authorization at call time: an unauthorized tool must be
  absent from the tool list and rejected when invoked directly,
  and a revoked permission must take effect without reconnecting.
- Test prompt-injection defenses with adversarial tool results
  and resource contents carrying embedded instructions: the agent
  must treat them as data, never follow them, and never let them
  expand permissions or trigger further tool calls.
- Test tool-poisoning defenses: a description change after
  approval (the rug pull) and a same-name tool from another
  server (name shadowing) must not grant authority the user did
  not approve.
- Test input validation and output sanitization: malformed or
  out-of-range tool arguments are rejected, tool results are
  size-capped and free of secrets, and error messages leak no
  internal paths or credentials.
- Test confirmation and audit flows with the MCP Inspector
  before connecting a real model: consequential actions are
  blocked without explicit approval, a rejection ends the
  action, and every invocation is logged with caller, tool, and
  decision.

## Best Practices

- Keep servers small and focused: one server per system or
  domain, so a compromise or a bad tool affects one area.
- Prefer read-only tools; make write tools explicit, scoped, and
  confirmation-gated.
- Run local servers sandboxed (restricted filesystem, no
  unnecessary network access) where the platform allows it.
- Re-verify servers on every update: version, publisher, tool
  list, and descriptions. Automate the diff where possible.
- Test with the MCP Inspector before connecting a real model,
  and test the security controls with adversarial inputs.
- Keep SDKs and servers patched; MCP SDKs and reference servers
  have had real vulnerabilities, and the protocol is evolving
  quickly.
- Document the security posture per server: trust level, scopes,
  credentials, and approval policy, in the inventory.

## Security Considerations

- This skill is the security guidance; the sections above are the
  substance. The highest-risk items, in order: unprotected
  remote servers (no authentication), token passthrough,
  unverified servers with broad tools, missing confirmation for
  destructive tools, and prompt injection through tool results.
- A local stdio server runs with the user's own permissions: it
  is effectively code execution on the user's machine. Treat
  installing one like installing software, not like adding a
  bookmark.
- A remote MCP server without authentication exposes every tool
  to anyone who can reach it. Never deploy one.
- The MCP ecosystem moves fast: re-check the official security
  guide and the specification on every major deployment change.
  See `security-auditing` for a review process and `owasp` for
  the wider application-security baseline.

## Performance Considerations

- Authorization checks, input validation, and audit logging add
  latency to every tool call; keep them fast (cached scope
  lookups, structured logging) and asynchronous where safe.
- Rate limits protect the server and its upstreams; set them per
  client and per tool, and return clear errors when they trip.
- Output caps and pagination protect the model's context window
  as well as the network; a tool that returns megabytes harms
  both.
- Token validation (audience, expiry, revocation) should use
  cached keys and short-lived tokens rather than a round trip
  per call where the authorization server supports it.

## Common Mistakes

- No authentication on a remote server — anyone on the network
  can invoke every tool.
- Accepting tokens issued for another service — token
  passthrough breaks the audience boundary and is forbidden by
  the specification.
- Trusting tool descriptions — descriptions are untrusted input;
  a poisoned description can steer the agent.
- Validating inputs only in the client — the server must validate
  every argument; clients can be bypassed or compromised.
- Skipping confirmation for destructive tools — the model will
  eventually call one at the wrong time.
- Logging full tool payloads — secrets end up in the log store.
  Redact first.
- Broad scopes by default — `admin` or full-filesystem scopes
  turn any injection into a full compromise.
- Never re-reviewing servers after updates — a description or
  tool change after approval is the rug pull.
- Treating MCP security as a prompt problem — enforcement lives
  in code, not in instructions to the model.

## Examples

A tool with a strict input schema and server-side validation, in
the SDK v2 style from `mcp-development` — the schema is the first
line of defense, and the handler enforces the business rule
(scoped directory) before acting:

  [examples/validated-tool.ts](./examples/validated-tool.ts).

An audit log record for a tool invocation (JSON, written to a
tamper-resistant store; arguments redacted where sensitive):

  [examples/audit-record.json](./examples/audit-record.json).

## Validation Checklist

- [ ] Every server is inventoried, allowlisted, version-pinned,
      and owned.
- [ ] Trust boundaries are documented; enforcement is in code,
      not in prompts.
- [ ] Remote servers authenticate clients and authorize per tool;
      no token passthrough; audience validated.
- [ ] Tool scopes are minimal per tool; no broad admin or
      full-filesystem scopes without documented justification.
- [ ] All tool inputs are validated server-side; outputs are
      sanitized and size-capped.
- [ ] Secrets come from the environment (stdio) or
      server-issued tokens (HTTP); none appear in results or logs.
- [ ] Transport is TLS for remote servers; OAuth metadata
      fetching is SSRF-hardened.
- [ ] Consequential tools require explicit user confirmation
      showing the exact action.
- [ ] Every tool invocation is audit-logged with caller, tool,
      arguments (redacted), and outcome.
- [ ] Tool descriptions are treated as untrusted and re-reviewed
      on every server update.
- [ ] Adversarial tests pass: invalid input, unauthorized caller,
      injected instructions in tool results, revoked credentials.

## Expected Deliverables

- A server inventory with trust level, scopes, credentials, and
  approval policy per server.
- Hardened server and client configuration: authorization,
  validation, sanitization, confirmation, and logging.
- An audit log pipeline with retention and alerting.
- Adversarial test results for the controls above.
- A security review note: residual risks, accepted exceptions,
  and the re-review schedule.

## References

- [MCP security best practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
- [Model Context Protocol documentation](https://modelcontextprotocol.io/docs)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [OWASP GenAI Security Project](https://genai.owasp.org/)
- Related skills in this repository: `mcp-development`,
  `ai-agents`, `llm-integration`, `oauth`, `authorization`,
  `rbac`, `secrets-management`, `security-auditing`, `owasp`.
