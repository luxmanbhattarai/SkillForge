# Agent architectures: ReAct, plan-and-execute, multi-agent

- Architectures:
  - *ReAct (reason + act):* the model alternates brief reasoning
    with tool calls until it can answer. The default for most
    agents; simple, debuggable, and sufficient when the task fits
    in one context window.
  - *Plan-and-execute:* the model (or code) writes a plan, then
    executes steps, replanning when a step fails. Use when the
    task decomposes into dependent steps or needs an explicit plan
    a human can review before execution starts.
  - *Multi-agent:* a supervisor delegates to specialist subagents,
    each in its own context. Use only when one agent's context or
    tool set cannot hold the task — coordination overhead and
    failure modes multiply with each agent.
