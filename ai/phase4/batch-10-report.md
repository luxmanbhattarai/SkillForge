# Phase 4 — Batch 10 Report: AI Engineering

- **Date:** 2026-11-20
- **Batch:** 10 (new category `skills/ai-engineering/`)
- **Branch:** `feat/skillforge-production-upgrade` (no commits, no pushes —
  coordinator commits)

## Skills written

| Skill | Path | Lines | Status |
| --- | --- | --- | --- |
| `llm-integration` | `skills/ai-engineering/llm-integration/SKILL.md` | 357 | PASS |
| `rag` | `skills/ai-engineering/rag/SKILL.md` | 335 | PASS |
| `ai-agents` | `skills/ai-engineering/ai-agents/SKILL.md` | 362 | PASS |
| `mcp-security` | `skills/ai-engineering/mcp-security/SKILL.md` | 429 | PASS |
| `agent-evaluation` | `skills/ai-engineering/agent-evaluation/SKILL.md` | 350 | PASS |

All five are new original skills with the standard frontmatter
(`license: MIT`, metadata `version: "1.0.0"`,
`category: ai-engineering`, `maintainer: skills-library`,
`source: original`, `last_verified: "2026-11-20"`), all 15 template
sections in order, and no `references/` subdirectories (each
SKILL.md is under 500 lines, so none was needed).

## Official sources consulted

Every link in the skills was verified to exist via `browser.open`
or `browser.search` on 2026-11-20. Sources shared across skills:

- Model Context Protocol docs — https://modelcontextprotocol.io/docs
- MCP security best practices (spec revision 2026-07-28) —
  https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices
  (read in full; source of the confused-deputy, token-passthrough,
  and SSRF material in `mcp-security`)
- MCP TypeScript SDK — https://github.com/modelcontextprotocol/typescript-sdk
- OWASP GenAI Security Project — https://genai.owasp.org/
  (note: the old `/llmrisk/` URL returns 404; the project home is
  the verified link, and the homepage announces a 2026 Top 10 for
  LLM Applications, so skills point readers to the project site
  for the current edition rather than pinning the 2025 list)

Per skill:

- `llm-integration`: OpenAI function calling
  (https://developers.openai.com/api/docs/guides/function-calling),
  OpenAI structured outputs
  (https://developers.openai.com/api/docs/guides/structured-outputs),
  Claude Platform Docs tool use
  (https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview),
  OpenAI evals
  (https://developers.openai.com/api/docs/guides/evals),
  LangSmith (https://docs.smith.langchain.com/).
- `rag`: LlamaIndex (https://docs.llamaindex.ai/en/stable/),
  Pinecone (https://docs.pinecone.io/), Weaviate
  (https://weaviate.io/developers/weaviate), Qdrant
  (https://qdrant.tech/documentation/), Chroma
  (https://docs.trychroma.com/), LangChain agents
  (https://docs.langchain.com/oss/python/langchain/agents).
- `ai-agents`: LangChain agents (as above), LlamaIndex, Claude
  tool use, OpenAI function calling, MCP docs, OWASP GenAI.
- `mcp-security`: MCP security best practices, MCP docs, MCP
  TypeScript SDK, OWASP GenAI. Also read
  `skills/backend/mcp-development/SKILL.md` first, as instructed,
  so this skill complements it (security half) without repeating
  the build material.
- `agent-evaluation`: OpenAI evals, LangSmith, LangChain agents,
  LlamaIndex, OWASP GenAI.

## Validation output

Each skill validated individually (registry regeneration is the
coordinator's job; unfiltered validate was not run):

```
== llm-integration ==     Checked 1 skills (1 original, 0 upstream). PASS: all skills valid.
== rag ==                 Checked 1 skills (1 original, 0 upstream). PASS: all skills valid.
== ai-agents ==           Checked 1 skills (1 original, 0 upstream). PASS: all skills valid.
== mcp-security ==        Checked 1 skills (1 original, 0 upstream). PASS: all skills valid.
== agent-evaluation ==    Checked 1 skills (1 original, 0 upstream). PASS: all skills valid.
```

No errors, no warnings. No fixes were needed after the first run.

## Decisions and notes

- **Current model names.** Verified against the official docs
  read this session: OpenAI's current API is the Responses API
  (Chat Completions still supported); the docs' examples use
  `gpt-6.2-astra`, and the structured-outputs guide says "for new
  projects, start with `gpt-6.2-astra`". Claude's current lineup
  per the tool-use page is Opus 5.5 / Sonnet 5.5 / Haiku 5.5.
  Skills name these only where verified and always tell the
  reader to check the provider's current model page; model ids
  are kept in configuration, never hardcoded as the standard.
- **Docs moved.** OpenAI docs now live at `developers.openai.com`
  and Anthropic's developer docs at `platform.claude.com/docs`
  (`docs.anthropic.com` redirects). All links use the current
  addresses.
- **OpenAI Evals deprecation.** The official evals guide states
  the Evals platform becomes read-only 2026-10-31 and shuts down
  2026-11-30, pointing new users to Datasets. Both
  `llm-integration` and `agent-evaluation` carry this warning and
  recommend an in-repo harness / LangSmith instead of building on
  the retiring platform.
- **LangChain 1.x.** The current agent entry point is
  `create_agent` from `langchain.agents` (middleware-based,
  `AgentState`); legacy `AgentExecutor` / `initialize_agent`
  moved to `langchain-classic`. `ai-agents` uses the current API
  and notes the very high default recursion limit must be lowered
  for production.
- **MCP spec revision.** Current revision is 2026-07-28
  (consistent with `mcp-development`); `mcp-security` covers the
  OAuth 2.1 profile, token passthrough ban, audience validation
  (RFC 8707), Protected Resource Metadata (RFC 9728), issuer
  validation (RFC 9207), DCR deprecation in favor of Client ID
  Metadata Documents, per-client consent for proxies, SSRF
  hardening for OAuth metadata fetching, and the full required
  topic list (tool authorization, least privilege, input
  validation, output sanitization, trust boundaries, secret
  handling, untrusted content handling, tool poisoning, direct
  and indirect prompt injection, audit logging, server
  verification, transport security, per-tool permission scoping,
  user confirmation for consequential actions).
- **Not verified (rate-limited).** Four additional URLs could not
  be verified because `browser.open` hit a rate limit (HTTP 429)
  mid-session: RAGAS docs, Google Gemini API docs, the pgvector
  GitHub repo, and the Vercel AI SDK docs. Those products are
  mentioned by name only (pgvector, RAGAS) or not at all in the
  skills — no unverified URL was linked. A later pass may verify
  and add links for RAGAS (RAG metrics) and the Gemini API docs
  if desired.
- **No references/ directories.** All five skills fit under 500
  lines with the required content inline, so no supporting files
  were created.
- **Scope discipline.** Only `skills/ai-engineering/` (new) and
  this report were touched. No commits, pushes, merges, PRs, or
  branch switches; `skills/upstream/` untouched; no unfiltered
  validate and no registry run.
