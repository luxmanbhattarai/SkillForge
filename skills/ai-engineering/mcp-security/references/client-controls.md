# Client-side and human controls

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
