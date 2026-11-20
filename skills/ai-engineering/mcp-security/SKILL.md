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
- The current MCP specification. As of 2026-11-20 the current
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
- User confirmation. Consequential actions (writes, deletes,
  sends, payments, permission changes) require explicit user
  confirmation in the client before the tool runs. The
  confirmation shows the tool name, the exact arguments, and the
  expected effect. A rejection ends that action; the agent must
  not route around it. The specification states there should
  always be a human able to deny tool invocations.
- Audit logging. Log every tool invocation: timestamp, caller
  identity, server, tool name, arguments (redacted where
  sensitive), duration, outcome, and approval decision. Logs go
  to a tamper-resistant store with a retention policy. Never log
  secrets or full payloads that may contain them. Alert on
  anomalies: unusual tools, unusual hours, high failure rates,
  or repeated authorization denials.
- Untrusted content handling. Tool results, resource contents,
  and prompt templates are data, not instructions. The client
  and the agent must never follow instructions found inside
  them, and must never let them expand permissions, exfiltrate
  data, or trigger further tool calls on their own. Delimit
  untrusted content when presenting it to the model, and strip
  or neutralize instruction-like text in high-risk flows.
- Tool poisoning. A malicious or compromised server can poison
  the agent through tool descriptions (instructions hidden in
  descriptions), through description changes after approval (the
  "rug pull": approve a benign tool, then update its description
  to add instructions), or through name shadowing (a malicious
  tool with the same name as a trusted one). Defenses: verify
  servers, pin versions, re-review tool descriptions on update,
  treat descriptions as untrusted, and never let a description
  alone grant authority.
- Prompt injection. Direct injection (the user types
  instructions) and indirect injection (instructions hidden in
  retrieved documents, web pages, tickets, or tool results) both
  target the agent through MCP. Controls: instruction hierarchy
  (system instructions outrank tool content), delimiting,
  output validation, approval gates for consequential actions,
  and least-privilege tools so a successful injection has little
  to reach. No single control stops injection; defense in depth
  does.

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

```ts
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import path from "node:path";

const ALLOWED_DIR = "/srv/docs"; // the only directory this tool may read

const server = new McpServer({ name: "docs-server", version: "1.0.0" });

server.registerTool(
  "read_doc",
  {
    description: "Reads a document from the docs directory.",
    inputSchema: z.object({
      name: z.string().min(1).max(128).describe("File name, no path separators"),
    }),
  },
  async ({ name }) => {
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      return { content: [{ type: "text", text: "Invalid file name." }], isError: true };
    }
    const resolved = path.resolve(ALLOWED_DIR, name);
    if (!resolved.startsWith(ALLOWED_DIR + path.sep)) {
      return { content: [{ type: "text", text: "Access denied." }], isError: true };
    }
    const text = await readFileWithinLimit(resolved); // capped size, errors as results
    return { content: [{ type: "text", text }] };
  },
);
```

An audit log record for a tool invocation (JSON, written to a
tamper-resistant store; arguments redacted where sensitive):

```json
{
  "timestamp": "2026-11-20T13:00:00Z",
  "run_id": "run-9f2c",
  "user_id": "user-42",
  "server": "docs-server@1.0.0",
  "tool": "read_doc",
  "arguments": { "name": "refunds.md" },
  "approved_by": "user-42",
  "outcome": "success",
  "duration_ms": 41
}
```

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
