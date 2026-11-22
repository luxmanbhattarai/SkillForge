---
name: ai-agents
description: >
  Design, build, and operate AI agents: agent architectures (ReAct,
  plan-and-execute, multi-agent), tool design, memory and state,
  orchestration, guardrails, human-in-the-loop approval, evaluation, and
  production deployment. Covers failure modes including loops, tool misuse,
  context overflow, and prompt injection. Use when building a system where
  a model calls tools in a loop to complete multi-step tasks, or when
  reviewing or debugging an existing agent.
license: MIT
metadata:
  version: "1.0.0"
  category: ai-engineering
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# AI Agents

## Purpose

This skill covers building agents: systems where a language model
reasons, calls tools, observes results, and repeats until a task is
done. It covers choosing an architecture, designing tools the model
can use correctly, managing memory and state, enforcing guardrails,
putting humans in the loop for consequential actions, evaluating
behavior, and running agents in production without runaway loops,
cost, or damage. The outcome is an agent that completes real tasks
reliably and fails safely when it cannot.

## When to Use

- Building a system that completes multi-step tasks: research,
  triage, data gathering, code changes, or workflow automation.
- Giving a model tools (search, APIs, file access, code execution)
  and letting it decide when to use them.
- Coordinating several agents or subagents on one task.
- Adding human approval, guardrails, or audit logging to an
  existing agent.
- Debugging an agent that loops, calls the wrong tool, or produces
  wrong results.

## When Not to Use

- A single model call answers the task — use `llm-integration`
  instead of building an agent loop.
- The task is answering from your documents with no actions — use
  `rag`; an agent is overkill.
- The workflow is fully deterministic (fixed steps, no judgment) —
  write ordinary code, or use `background-jobs` and `queues`.
  Agents are for tasks where the next step genuinely depends on
  what the model observes.
- Building the MCP server the agent calls — use `mcp-development`;
  securing it — use `mcp-security`.

## Prerequisites

- A working LLM integration (see `llm-integration`) with a model
  that supports tool calling.
- A clear task definition: what success looks like, which tools the
  agent may use, and which actions are off-limits or need approval.
- The tools themselves, implemented and tested independently of the
  agent — an agent cannot fix a broken tool.
- An evaluation set of representative tasks with success criteria
  (see `agent-evaluation`) before the agent ships.
- A framework decision: a harness such as LangChain's `create_agent`
  (LangChain 1.x) or LlamaIndex agents, or a hand-rolled loop. A
  hand-rolled loop is fine for one agent with a few tools; a
  framework pays off for memory, middleware, and multi-agent work.
- Version range: LangChain 1.x is the
  current stable major line for the agent harness; check the LangChain
  release notes linked in Official Documentation for the newest minor
  before starting.

## Official Documentation

- [LangChain agents documentation](https://docs.langchain.com/oss/python/langchain/agents)
  — the current LangChain 1.x agent harness: `create_agent`, tools,
  `AgentState`, middleware (retries, call limits, human-in-the-loop,
  PII handling), streaming, and subagents.
- [LlamaIndex documentation](https://docs.llamaindex.ai/en/stable/)
  — LlamaIndex agents and workflows: tool-based agents over your
  data, event-driven multi-step workflows with branching, retries,
  and human-in-the-loop review.
- [Claude Platform Docs: tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
  — Anthropic's tool-use model: client vs server tools, the
  `tool_use` / `tool_result` round trip, and `tool_choice`.
- [OpenAI API: function calling](https://developers.openai.com/api/docs/guides/function-calling)
  — OpenAI's tool-calling flow, function schemas, strict mode, and
  guidance on keeping the initial tool set small.
- [Model Context Protocol documentation](https://modelcontextprotocol.io/docs)
  — the protocol for connecting agents to external tools, resources,
  and prompts via MCP servers.
- [OWASP GenAI Security Project](https://genai.owasp.org/) — the
  current Top 10 for LLM Applications and the companion Top 10 for
  Agentic Applications, for the agent threat model.

## Required Workflow

1. Define the task narrowly: inputs, success criteria, tools
   allowed, actions forbidden, and the approval policy. An agent
   with a vague task and broad tools will find creative ways to
   fail.
2. Choose the architecture (see Implementation Standards): a
   single ReAct loop for most tasks; plan-and-execute when the
   task decomposes into dependent steps; multi-agent only when
   one context window or one skill set cannot hold the task.
3. Design the tools first, as an API: small, typed, idempotent,
   with clear descriptions and minimal schemas. Test each tool
   without the model.
4. Build the loop: model call, tool execution, observation, repeat
   — with hard limits on steps, tokens, time, and cost from the
   first version. No agent ships without a step limit.
5. Add memory deliberately: short-term conversation state in the
   loop, persistent memory only for facts the agent must carry
   across sessions, and retrieval (`rag`) for knowledge too large
   for context.
6. Add guardrails as code, not as prompt text: allowlists, input
   validation, output checks, and approval gates for consequential
   actions. The prompt suggests; the code enforces.
7. Add human-in-the-loop at the decision points that matter:
   before destructive writes, external sends, payments, and any
   action that cannot be undone. The agent pauses, the human
   approves, edits, or rejects, and execution continues.
8. Instrument everything: every model call, tool call, token count,
   latency, and cost, with a trace id per run (see
   `observability`).
9. Evaluate on the task set before shipping and on every change:
   task success rate, tool-use accuracy, steps per task, latency,
   and cost (see `agent-evaluation`).
10. Ship behind limits: per-run step and cost caps, per-user rate
    limits, a kill switch, and alerts on failure rate and spend.
    Roll out to a small audience first and review traces by hand.

## Implementation Standards

- Architectures — ReAct, plan-and-execute, multi-agent (when each
  fits): see [references/architectures.md](./references/architectures.md).
- Tool design: one tool per action, with a name, description, and
  schema a new colleague could use correctly. Tools are
  idempotent where the operation allows it. Tools return small,
  structured results; large results are summarized or paginated.
  Keep the number of tools available at the start of a turn small
  (OpenAI's guide suggests fewer than 20 as a soft rule); defer
  or discover rarely used tools instead of loading everything.
- State and memory: keep run state (messages, tool results,
  counters) in a typed state object scoped to the run. Persist
  only what the next session needs, with an owner and a retention
  policy. Never let one user's memory leak into another user's
  session. Summarize long histories before the context window
  fills; do not silently drop turns the agent still needs.
- Orchestration: every run has a step limit, a token budget, a
  wall-clock timeout, and a cost cap — enforced in code, not in
  the prompt. LangChain's `create_agent`, for example, defaults
  to a very high recursion limit; production agents must set a
  much lower one. Subagents get their own, smaller budgets.
- Guardrails: deterministic checks around the loop — validate
  tool arguments, check outputs against allowlists or schemas,
  scan for secrets and PII before tool results enter context,
  and block known-dangerous patterns (arbitrary shell commands,
  unscoped file access) regardless of what the model requests.
- Human-in-the-loop: approval gates are code paths, not prompt
  suggestions. The gate shows the human the exact action and its
  arguments, and the run resumes only on explicit approval.
  Rejected actions end the run or return to planning — never
  silently retry a different route around the rejection.
- Failure handling: a tool error is an observation, not a crash —
  the model sees the error and can retry or replan, within the
  step budget. Repeated identical tool calls (same tool, same
  arguments) are a loop signal: break the run after a small
  number of repeats.
- Traces and replay: log the full run (messages, tool calls,
  results, timings) under a run id so any failure can be replayed
  and any eval can be reproduced.

### Testing Strategy

- Test every tool in isolation, with the model stubbed out, before the
  agent ever calls it — an agent cannot fix a broken tool, and a tool
  bug looks like a model failure.
- Keep a fixed eval task set with success criteria and run it on every
  prompt, tool, or model change; a change that improves one task must
  not regress the set. See `agent-evaluation` for the eval method.
- Test the guardrails, not just the happy path: prompt-injection
  attempts in tool results, malformed tool arguments, and repeated
  identical tool calls must end the run safely instead of looping.
- Test the human-in-the-loop gate directly: a rejected action ends the
  run or returns to planning, and never retries a different route
  around the rejection.
- Test budgets as behavior: a runaway agent must hit the step limit,
  token budget, or timeout and stop, and every run must produce a
  replayable trace under its run id.

## Best Practices

- Give the agent the smallest tool set that completes the task.
  Every extra tool is an extra way to go wrong.
- Write tool descriptions for a model that has never seen the
  tool: what it does, when to use it, what it returns, and what
  can go wrong.
- Prefer deterministic code over model judgment for routing,
  validation, and formatting. Use the model where judgment is
  genuinely needed.
- Start with a single agent and a ReAct loop. Add planning,
  subagents, and memory only when evals show the simple version
  failing in a way those additions fix.
- Test the agent on the tasks it will actually do, including
  adversarial ones: ambiguous requests, missing information,
  contradictory instructions, and requests it should refuse.
- Review traces weekly in the early life of an agent. The failure
  modes you find in traces are the evals you should add.
- Version the agent like software: prompt version, tool versions,
  model id, and configuration all recorded per run.

## Security Considerations

- Least privilege per tool: each tool runs with the minimum
  permissions its job needs, and the agent only gets the tools
  the task requires. A compromised or confused agent should not
  hold the keys to everything (OWASP LLM06, excessive agency).
- Human approval for consequential actions: writes, deletes,
  external messages, payments, permission changes, and anything
  irreversible. No approval, no action — enforced in code.
- Prompt injection is the agent's core threat: instructions
  hidden in tool results, documents, web pages, or user input
  can steer the agent (indirect injection) or override its task
  (direct injection). Treat all tool output and retrieved content
  as untrusted data: delimit it, never follow instructions found
  inside it, and never let it expand the agent's permissions.
  See `mcp-security` for the same controls on the MCP side.
- Tool poisoning: a tool whose description or behavior changes
  (a compromised MCP server, a tampered tool registry) can
  misdirect the agent. Verify tool sources, pin versions, and
  review tool descriptions as untrusted input.
- Sandboxing: code execution and shell access run in an isolated
  sandbox with no network access beyond an allowlist, no secrets
  in the environment, and a timeout. Never give an agent raw
  shell access on a production host.
- Secrets: tools receive credentials through the server or the
  runtime, never through the model's context. The model must not
  see API keys, tokens, or passwords, and tool results must be
  scrubbed of secrets before entering context.
- Audit logging: every tool call is logged with run id, user,
  tool name, arguments, result summary, and approval decision.
  Logs support incident review; they must not contain secrets or
  full payloads that may hold them.
- Cost as a security control: per-run and per-user spend caps
  bound the damage from a looping or hijacked agent. An agent
  without a cost cap is an unbounded-spend vulnerability.
- Data boundaries: the agent's tools enforce the same access
  controls as the underlying systems. An agent acting for a user
  must not retrieve or modify data that user cannot access
  directly.

## Performance Considerations

- Steps are the cost driver: each step is a model call plus tool
  time. Reduce steps by giving the agent better tools (one call
  that does the whole lookup) rather than more reasoning.
- Context grows with every tool result. Truncate or summarize
  tool outputs, and keep only the observations the next step
  needs. A bloated context slows every subsequent call and raises
  its price.
- Use a smaller, faster model for routine steps and escalate to a
  stronger model only for planning or hard decisions, where the
  framework supports per-step model selection.
- Parallelize independent tool calls and subagents; serialize
  dependent ones. Cap total concurrency per run.
- Cache tool results that are stable (lookups, reference data)
  within a run; do not cache across users or across runs without
  a freshness policy.
- Set per-tool timeouts so one slow dependency cannot stall the
  run; a timed-out tool returns an error observation and the
  agent moves on.

## Common Mistakes

- No step limit — the agent loops until the budget or the context
  window dies. Always cap steps, tokens, time, and cost.
- Too many tools up front — the model picks the wrong one or
  hallucinates arguments. Keep the initial set small.
- Guardrails in the prompt only — a prompt suggestion is not a
  control. Enforce in code.
- Letting the agent retry a rejected action — if a human said no,
  the run stops or replans; it does not route around the refusal.
- Treating tool output as trusted — tool results are untrusted
  data and a prime injection vector.
- One shared memory across users — memory leaks are data breaches.
  Scope memory per user and per tenant.
- Skipping evals because the demo worked — demos use the happy
  path; production uses all of them. See `agent-evaluation`.
- Building multi-agent before single-agent works — coordination
  multiplies failure modes. Earn the complexity.

## Examples

A minimal agent with LangChain 1.x (`create_agent`), following the
official agents documentation. The model is configured per
deployment; the tool is an ordinary function:

  [examples/minimal-agent.py](./examples/minimal-agent.py).

Production additions, per the official docs: a low
`recursion_limit` in the invoke config (the default is far too high
for production), retry middleware for transient model errors, a
call-limit middleware, and human-in-the-loop middleware for
consequential tools.

## Validation Checklist

- [ ] The task, allowed tools, forbidden actions, and approval
      policy are written down.
- [ ] Step, token, time, and cost limits are enforced in code.
- [ ] Each tool is tested independently of the agent and returns
      small, structured results.
- [ ] Guardrails and approval gates are code paths, not prompt text.
- [ ] Consequential actions require explicit human approval.
- [ ] Tool results are treated as untrusted data; secrets are
      scrubbed before entering context.
- [ ] Code execution and shell access run in a sandbox.
- [ ] Every run is traced with a run id; tool calls are audit-logged.
- [ ] The agent passes its task eval set, including adversarial
      cases (see `agent-evaluation`).
- [ ] A kill switch and spend alerts are in place before rollout.

## Expected Deliverables

- An agent with a defined task, tool set, architecture, and limits.
- Tested tools with clear descriptions and minimal schemas.
- Guardrails and human-in-the-loop gates implemented in code.
- Tracing and audit logging for every run.
- An eval suite over representative and adversarial tasks, run in
  CI (see `agent-evaluation`).
- An operations note: limits, kill switch, rollout plan, and how
  to review traces.

## References

- [LangChain agents documentation](https://docs.langchain.com/oss/python/langchain/agents)
- [LlamaIndex documentation](https://docs.llamaindex.ai/en/stable/)
- [Claude Platform Docs: tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [OpenAI API: function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [Model Context Protocol documentation](https://modelcontextprotocol.io/docs)
- [OWASP GenAI Security Project](https://genai.owasp.org/)
- Related skills in this repository: `llm-integration`, `rag`,
  `mcp-development`, `mcp-security`, `agent-evaluation`,
  `observability`, `background-jobs`, `rate-limiting`.
