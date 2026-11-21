---
name: mcp-development
description: >
  Build Model Context Protocol (MCP) servers that give AI assistants tools,
  resources, and prompts: server setup with the TypeScript SDK, tool design,
  transports, and client testing. Use when creating an MCP server, exposing an
  API or data source to AI agents, or adding tools to an existing MCP server.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js 24 LTS or later, TypeScript 7.x, and the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`); network access for remote servers.
---

# MCP Development

## Purpose

This skill covers building Model Context Protocol (MCP) servers with the
TypeScript SDK: defining tools, resources, and prompts; choosing a
transport; handling errors; and testing with an MCP client. The outcome
is an MCP server that AI assistants can discover and use safely, with
tools that do one thing well and fail with clear messages.

## When to Use

- Creating a new MCP server to expose an API, database, or file system
  to AI assistants.
- Adding tools, resources, or prompts to an existing MCP server.
- Choosing between the stdio and Streamable HTTP transports.
- Testing an MCP server with a client or the MCP Inspector.
- Reviewing an MCP server for security, error handling, or tool design.

## When Not to Use

- Building a general REST API with no AI client in mind — use
  `rest-api` instead.
- Building an agent that *calls* MCP servers — this skill builds the
  server side; the client side is the assistant's job.
- Exposing a simple command-line tool with no structured protocol —
  use `nodejs` and a plain CLI.
- Designing the underlying API — use `api-design` first; MCP wraps an
  existing capability, it does not design one.

## Prerequisites

- Node.js 24 LTS or later (26 is the current LTS line) and
  TypeScript 7.x.
- The MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, 2.4.x)
  installed. The v1 package `@modelcontextprotocol/sdk` is legacy:
  it receives only bug fixes and security updates until early 2027
  (six months after the v2 release on 2026-07-27), and new servers
  must use v2.
- A clear list of the capabilities to expose: what the tools do, what
  data the resources provide, and who may use them.
- An MCP client or the MCP Inspector for testing.

## Official Documentation

- [Model Context Protocol documentation](https://modelcontextprotocol.io/docs)
  — the official guides, concepts, and SDK references.
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
  — the official TypeScript SDK repository. SDK v2 is the stable
  release line (released 2026-07-27, implementing the 2026-07-28 MCP
  specification) with split packages: `@modelcontextprotocol/server`
  for servers, `@modelcontextprotocol/client` for clients, plus
  thin middleware packages (`@modelcontextprotocol/node`,
  `/express`, `/fastify`, `/hono`) for Streamable HTTP. Tool and
  prompt schemas use Standard Schema, so Zod v4, Valibot, or ArkType
  all work.
- [Node.js documentation](https://nodejs.org/docs/) — the runtime
  reference.

## Required Workflow

1. List the capabilities to expose and classify each one: a *tool*
   (an action the model can call), a *resource* (data the model can
   read), or a *prompt* (a reusable template).
2. Design each tool with a clear name, a plain-language description,
   and a minimal input schema. The description is the model's only
   guide to when and how to use the tool.
3. Scaffold the server with the TypeScript SDK and register the tools,
   resources, and prompts.
4. Choose the transport: stdio for local servers run by the client,
   Streamable HTTP for remote servers shared by many clients. Do not
   use the HTTP+SSE transport for new servers — it is deprecated and
   kept only for backwards compatibility.
5. Implement each tool handler as a thin wrapper over a service
   function, with input validation and a clear success or error result.
6. Add authentication and authorization for remote servers; local
   stdio servers inherit the user's own permissions.
7. Test with the MCP Inspector and at least one real client: list
   tools, call each tool with valid and invalid input, and read each
   resource.
8. Document the server: installation, configuration, transport, and
   the tool list with examples.

## Implementation Standards

- Tool names use lowercase snake_case and describe the action
  (`search_documents`, `create_issue`). Keep names short and
  unambiguous.
- Every tool has a description that says what it does, what it needs,
  and what it returns — written for a model that has never seen the
  tool before. Vague descriptions produce wrong tool calls.
- Input schemas are minimal: only the fields the tool needs, with
  required fields marked and sensible defaults. In SDK v2 the input
  schema is a single Standard Schema object (for example a Zod v4
  `z.object({...})`), not a shape of per-field schemas as in v1.
  Validate input with the SDK's schema support before acting.
- Tool results are structured content: return JSON the model can use,
  plus a short human-readable text summary. Keep results small;
  paginate or truncate large outputs.
- Errors are returned as tool errors with a clear message, not as
  thrown exceptions that crash the server. A tool that fails must say
  why and what the caller can do about it.
- Tools are idempotent where the underlying operation allows it, and
  destructive tools (delete, send, charge) require an explicit
  confirmation parameter or are gated behind a configuration flag.
- Resources use stable URIs (`file:///path`, or a custom scheme such
  as `docs://guide/intro`) and declare a MIME type.
- The server advertises its capabilities (tools, resources, prompts)
  accurately; never advertise a capability the server does not
  implement.
- Log tool calls with name, duration, and outcome; never log secrets
  or full input payloads that may contain them.
- Version the server and its tool schemas; a breaking change to a
  tool's input or output is a major version bump.

## Best Practices

- Keep tools focused: one tool per action. A tool that does five
  things is five tools with a confusing description.
- Prefer tools over resources for anything that changes state; use
  resources for read-only data the model should browse.
- Return the smallest useful result: a list tool returns a page with
  a cursor, not the whole dataset.
- Make the server fail fast at startup when required configuration
  (API keys, paths) is missing, with a clear error message.
- Support both transports where it makes sense: stdio for local use,
  Streamable HTTP for remote use, sharing the same tool
  implementations.
- Test tools with the MCP Inspector before testing with a real
  client: it catches schema and transport problems quickly.
- Document the server's configuration (environment variables,
  required permissions) in the README.

## Security Considerations

- A tool is an action an AI model can trigger: treat every tool as
  untrusted input. Validate all arguments and authorize the operation
  before executing it.
- Never expose a tool that runs arbitrary commands, reads arbitrary
  files, or executes arbitrary code unless that is the server's
  explicit, documented purpose — and even then, sandbox it.
- Remote servers must authenticate clients and authorize per tool;
  never expose a remote MCP server without authentication.
- Never return secrets, tokens, or credentials in tool results or
  resource contents.
- Scope file and network access narrowly: a file tool should only
  reach the directories it is configured for, and a network tool
  should only reach the hosts it needs.
- Log tool invocations for audit, and consider approval flows for
  destructive tools in production deployments.

## Performance Considerations

- Keep tool handlers fast: a slow tool blocks the model's turn. Move
  long work to a background job (see `background-jobs`) and return a
  job handle the model can poll.
- Paginate list results and cap result sizes; a tool that returns
  megabytes of data wastes the model's context.
- Cache read-only resource contents where the data changes slowly
  (see `caching`).
- Set timeouts on outbound calls from tool handlers so a hung
  dependency does not hang the server.
- For remote servers, rate-limit tool calls per client (see
  `rate-limiting`).

## Common Mistakes

- Vague tool descriptions — the model calls the wrong tool or passes
  wrong arguments. Write descriptions as if explaining to a new
  colleague.
- Tools with too many parameters — the model guesses at optional
  fields. Keep schemas minimal and mark required fields clearly.
- Returning huge results — the model's context fills up and the
  useful part is lost. Paginate and truncate.
- Throwing exceptions instead of returning tool errors — the client
  sees a transport failure instead of a useful message. Return errors
  as results.
- No authentication on a remote server — anyone on the network can
  invoke every tool. Authenticate remote servers.
- Tools that are not idempotent — a retried call duplicates the
  effect. Design for safe retries.

## Examples

A minimal MCP server with one tool, using the TypeScript SDK v2
(matching the SDK repository's own getting-started example):

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const server = new McpServer({
  name: "greeter-server",
  version: "1.0.0",
});

server.registerTool(
  "greet",
  {
    description: "Returns a friendly greeting for the given name.",
    inputSchema: z.object({
      name: z.string().min(1).describe("The name to greet"),
    }),
  },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: `Hello, ${name}!` }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
```

Run and inspect it with the MCP Inspector (from the SDK repository's
documented tooling) before wiring it into a client. To serve the same
server over Streamable HTTP instead of stdio, use the
`@modelcontextprotocol/node` middleware package (or the Express,
Fastify, or Hono middleware package) rather than the deprecated
HTTP+SSE transport.

## Validation Checklist

- [ ] Every tool has a clear name, description, and minimal input
      schema.
- [ ] Input is validated before the tool acts.
- [ ] Tool errors are returned as results with clear messages.
- [ ] List tools paginate and cap result sizes.
- [ ] Destructive tools require confirmation or are gated by config.
- [ ] Remote servers authenticate clients; local servers scope file
      and network access.
- [ ] The server works with the MCP Inspector and at least one real
      client.
- [ ] No secrets appear in tool results, resources, or logs.

## Expected Deliverables

- A working MCP server with tools, resources, or prompts as designed.
- Tests covering each tool with valid and invalid input.
- A README documenting installation, configuration, transport, and
  the tool list.
- A verification report from the MCP Inspector and a real client.

## References

- [Model Context Protocol documentation](https://modelcontextprotocol.io/docs)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Node.js documentation](https://nodejs.org/docs/)
- Related skills in this repository: `nodejs`, `api-design`,
  `package-development`, `background-jobs`.
