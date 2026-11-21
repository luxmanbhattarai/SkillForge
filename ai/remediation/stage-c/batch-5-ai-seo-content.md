# Stage C — Batch 5: ai-engineering / seo / content (11 Phase 4 skills)

- **Audit date:** 2026-11-20
- **Scope:** `agent-evaluation`, `ai-agents`, `llm-integration`, `mcp-security`,
  `rag` (ai-engineering); `content-decay`, `entity-seo`, `serp-monitoring`,
  `topical-authority` (seo); `editorial-workflow`, `source-verification` (content)
- **Method:** Phase 3 method (`ai/audits/TECHNICAL-ACCURACY-AUDIT.md`): every
  skill read in full; every versioned claim, API signature, CLI command, code
  example, and load-bearing link checked against current official docs.
  Evidence hierarchy: official product docs > official API references >
  official GitHub repos/release notes > recognized standards (NIST, OWASP,
  W3C, IETF) > reputable secondary sources. Blogs and AI content were never
  treated as authoritative.
- **Working copy:** branch `feat/skillforge-production-upgrade`, local edits
  only, nothing committed. No files under `skills/upstream/` touched. No
  changes to `sources/verification-status.json`, `registry/`,
  `ai/PROJECT-STATUS.md`, or `ai/remediation/ISSUE-REGISTER.md`.

## Batch matrix

| Skill | Category | Status | Findings (by severity) | Fixes applied | Recommended verification status |
|---|---|---|---|---|---|
| `agent-evaluation` | ai-engineering | PASS | 0 | — | verified |
| `ai-agents` | ai-engineering | PASS | 0 | — | verified |
| `llm-integration` | ai-engineering | PASS | 1 Informational | none needed | verified |
| `mcp-security` | ai-engineering | PASS | 0 | — | verified |
| `rag` | ai-engineering | PASS | 0 | — | verified |
| `content-decay` | seo | FIXED | 1 Low | example table row repaired | verified |
| `entity-seo` | seo | FIXED | 1 Low | KG API status note added | verified |
| `serp-monitoring` | seo | FIXED | 1 Medium, 1 Informational | large-drop example corrected to Google's numbers | verified |
| `topical-authority` | seo | PASS | 0 | — | verified |
| `editorial-workflow` | content | PASS | 0 | — | verified |
| `source-verification` | content | PASS | 0 | — | verified |

## Findings

### B5-01 — serp-monitoring: misquoted Google large-drop example (Medium, FIXED)

- **Location:** `skills/seo/serp-monitoring/SKILL.md:152` (Required Workflow,
  step 6).
- **Evidence:** The skill said "Large move (for example, out of the top 10
  to position 29…)", presented as "following Google's framing in its
  core-updates guidance". Google's core-updates page says the large-drop
  example is "dropping from position 4 to 29" (small drop: "position 2 to
  4", which the skill quoted correctly).
  Source: <https://developers.google.com/search/docs/appearance/core-updates>
  (read 2026-11-20).
- **Fix applied:** Changed the example to "position 4 to 29", matching
  Google's documented example.

### B5-02 — content-decay: garbled example table row (Low, FIXED)

- **Location:** `skills/seo/content-decay/SKILL.md:305-308` (Examples, decay
  diagnosis table).
- **Evidence:** The `/starter-ratio/` row's diagnosis continuation contained
  a stray `/starter-ratio/ vs.` in the Page column, so the table read as if
  a second page existed and the diagnosis was split across columns.
- **Fix applied:** Removed the stray text; the diagnosis now reads
  "Cannibalization: /sourdough-starter/ also ranks for 'starter ratio'."
  entirely in the Diagnosis column, matching the other rows.

### B5-03 — entity-seo: Knowledge Graph Search API status note missing (Low, FIXED)

- **Location:** `skills/seo/entity-seo/SKILL.md:94-95` (Official
  Documentation, Knowledge Graph Search API entry).
- **Evidence:** The skill presents the kgsearch API as the entity-lookup
  method with no status note. Google's Cloud docs for the API state: "If
  you're planning a new project, build your application with Cloud
  Knowledge Graph Advanced edition… The Basic edition remains available,
  but doesn't support new features, high QPS, or additional security and
  compliance standards."
  Source: <https://cloud.google.com/enterprise-knowledge-graph/docs/search-api>.
  The endpoint, parameters, and response fields in the skill's example were
  verified correct against
  <https://developers.google.com/knowledge-graph> (sample request, `kg:/m/…`
  ids, `resultScore`).
- **Fix applied:** Added a note to the Official Documentation entry:
  "Google's Cloud docs point new projects to Cloud Enterprise Knowledge
  Graph; the kgsearch API remains available for ad-hoc lookups."

### B5-04 — llm-integration: example field name differs from the official guide (Informational, no fix)

- **Location:** `skills/ai-engineering/llm-integration/SKILL.md` (Examples,
  `CalendarEvent` model).
- **Evidence:** The skill's structured-output example uses a `title: str`
  field; the official guide's `CalendarEvent` example uses `name: str`.
  Source: <https://developers.openai.com/api/docs/guides/structured-outputs>.
  The example is self-consistent, valid code, and the model identifier
  (`gpt-6.2-astra`) and the `client.responses.parse` / `text_format` /
  `output_parsed` API usage match the official guide exactly.

- **Fix applied:** none — cosmetic deviation from the cited guide, not an
  error. Recorded for completeness.

### B5-05 — serp-monitoring: example API query spans 7 days vs. the skill's own one-day guidance (Informational, no fix)

- **Location:** `skills/seo/serp-monitoring/SKILL.md` (Examples, Search
  Analytics API query body, `2026-11-13` to `2026-11-19`).
- **Evidence:** The skill correctly states Google's guidance to pull one
  day's data per daily query
  (<https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data>),
  but the example request body covers a 7-day range. Multi-day ranges are
  valid API requests and Google's own docs show them; the example
  demonstrates the request shape, not the pipeline cadence.
- **Fix applied:** none — the example is a valid request; no contradiction
  of substance.

## Per-skill verification notes

- **agent-evaluation** — OpenAI Evals deprecation dates verified against
  the official guide: read-only 2026-10-31, shutdown 2026-11-30, and
  "consider trying Datasets instead" is verbatim from the guide
  (<https://developers.openai.com/api/docs/guides/evals>). Python harness
  example is valid. No findings.
- **ai-agents** — LangChain 1.x `create_agent` verified against the
  official agents page: `create_agent` sets the recursion limit to 9,999
  steps, so "defaults to a very high recursion limit" is accurate;
  `AgentState`, `ModelRetryMiddleware`, `ToolCallLimitMiddleware` /
  `ModelCallLimitMiddleware`, `PIIMiddleware`, `HumanInTheLoopMiddleware`,
  subagents, and streaming all confirmed
  (<https://docs.langchain.com/oss/python/langchain/agents>). "Fewer than 20
  functions… just a soft suggestion" is verbatim from OpenAI's
  function-calling guide
  (<https://developers.openai.com/api/docs/guides/function-calling>). OWASP
  LLM06 Excessive Agency confirmed for the 2025 edition (LLM01 Prompt
  Injection is #1). Claude tool-use page confirmed
  (<https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview>).
  The example (`create_agent`, `system_prompt`, `thread_id` in
  `configurable`) matches the official docs. Prompt-injection guidance is
  accurate and contains no injectable patterns. No findings.
- **llm-integration** — `gpt-6.2-astra` confirmed as the model identifier
  used in the official structured-outputs guide, with the same
  `CalendarEvent` / `client.responses.parse` / `text_format` example
  (<https://developers.openai.com/api/docs/guides/structured-outputs>).
  Responses API as the current API (Chat Completions remains supported)
  confirmed. Evals deprecation note confirmed (see agent-evaluation).
  TypeScript abstraction example is valid. One Informational (B5-04).
- **mcp-security** — Spec revision 2026-07-28 confirmed as current; DCR
  formally deprecated in favor of Client ID Metadata Documents, RFC 9207
  issuer validation, and the 12-month deprecation window confirmed against
  the authorization spec (via multiple spec-faithful sources). Token
  passthrough "explicitly forbidden in the authorization specification"
  confirmed verbatim from the official security guide, as are the confused
  deputy attack, per-client consent, exact redirect-URI matching,
  single-use short-lived `state`, and SSRF mitigations
  (<https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices>).
  "There SHOULD always be a human in the loop with the ability to deny
  tool invocations" confirmed verbatim from the MCP tools specification.
  "STDIO implementations SHOULD NOT follow this specification, and instead
  retrieve credentials from the environment" confirmed verbatim from the
  authorization spec. One-click install flows showing the exact command
  untruncated confirmed. The SDK v2 example (`McpServer` from
  `@modelcontextprotocol/server`, `registerTool`, `import * as z from
  "zod/v4"`, path-traversal guard) matches `mcp-development` exactly. No
  injectable patterns in the skill itself. No findings.
- **rag** — LlamaIndex example verified against current docs:
  `VectorStoreIndex.from_documents`, `index.as_query_engine()`,
  `Settings.embed_model` are the current API
  (<https://docs.llamaindex.ai/en/stable/>). Pinecone Documents API
  confirmed as a real, generally available API
  (<https://docs.pinecone.io/guides/get-started/documents-api>). The
  "ignore previous instructions and…" quote is clearly framed as an
  attack example in Security Considerations, not an instruction. No
  findings.
- **content-decay** — 16-month Search Console retention, "wait at least a
  full week after a core update completes", and "deleting content is a
  last resort" all confirmed against Google's docs
  (<https://developers.google.com/search/docs/appearance/core-updates>,
  <https://support.google.com/webmasters/answer/6211453> — the Data Anomalies
  page, which also confirms the FAQ rich-result removal of 2026-05-07).
  Google Trends page confirmed
  (<https://developers.google.com/search/docs/monitor-debug/trends-start>).
  One Low (B5-02, fixed).
- **entity-seo** — Organization guidance confirmed: "Some properties are
  used behind the scenes to disambiguate your organization from other
  organizations (like `iso6523` and `naics`)", home page or a single About
  page placement, most-specific-subtype recommendation
  (<https://developers.google.com/search/docs/appearance/structured-data/organization>).
  ProfilePage "otherwise, default to `Person`" confirmed verbatim
  (<https://developers.google.com/search/docs/appearance/structured-data/profile-page>).
  "Google can make general use of the `sameAs` property" confirmed verbatim
  from the structured-data introduction
  (<https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data>).
  Bing Webmaster Guidelines' "Entity names should be clear and
  consistent, with no ambiguous references" confirmed (GEO guidance added
  Feb 2026). KG Search API endpoint/params confirmed; one Low (B5-03,
  fixed).
- **serp-monitoring** — Branded/non-branded API classification confirmed:
  `brandedClassification` dimension added 2026-11-16, data from
  2026-02-21, top-level properties with sufficient volume
  (<https://developers.google.com/search/blog/2026/11/search-analytics-api-update>).
  November 2026 core update began 2026-11-10 confirmed via the Search
  Status Dashboard. 25,000 rows per response and 50,000 rows per day per
  search type confirmed
  (<https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data>).
  One Medium (B5-01, fixed) and one Informational (B5-05).
- **topical-authority** — Google's news topic authority system confirmed
  as documented only for newsy queries in specialized areas (health,
  politics, finance), weighing notability, influence/original reporting,
  and source reputation
  (<https://developers.google.com/search/blog/2023/05/understanding-news-topic-authority>).
  The skill's honesty note and (Verified)/(Heuristic) labeling are
  accurate. No findings.
- **editorial-workflow** — Process skill; no versioned technical claims.
  Links (helpful-content guidance, Search Essentials, plainlanguage.gov)
  resolve; pipeline stages and gates are internally consistent and the
  Accessibility subsection is present and correct. No findings.
- **source-verification** — IFCN Code of Principles, C2PA /
  contentcredentials.org/verify, Google Scholar, and Poynter links
  resolve; Fact Check Explorer confirmed live at
  <https://toolbox.google.com/factcheck/explorer>. SIFT check described
  accurately. No findings.

## Cross-cutting checks (all 11 skills)

- **Structure:** all 11 have a valid `SKILL.md` under 500 lines with all
  15 template sections in order (Purpose through References) and a Testing
  Strategy subsection; no `references/`, `examples/`, or `scripts/`
  directories exist, so there are no missing referenced files. No broken
  internal links (validator clean for this batch).
- **Frontmatter:** all valid — `name` matches the directory, `description`
  within limits, `license: MIT`, full `metadata` map with
  `last_verified: "2026-11-20"` (already today's date; no date edits
  needed). `npm run check:frontmatter` PASS.
- **Related-skill references:** every backticked skill name referenced in
  the 11 skills resolves to an existing skill directory (checked
  mechanically; the only unmatched backticked tokens are inline-code
  terms such as `h1`, `state`, `noindex`, `iso6523`, not skill names).
- **Duplicates / overlap:** no duplicated skills. Adjacent pairs are
  correctly scoped and cross-reference each other instead of repeating
  content: `content-decay` (diagnose) vs `content-refresh` (rewrite);
  `serp-monitoring` (ongoing watch) vs `serp-analysis` (snapshot);
  `entity-seo` (identity layer) vs `eeat` (trust signals);
  `editorial-workflow` (pipeline) vs `editorial-review` (single review);
  `source-verification` (vet sources) vs `fact-checking` (check claims);
  `mcp-security` (security half) vs `mcp-development` (construction);
  `ai-agents` vs `llm-integration` vs `rag` (agent loop vs single calls
  vs retrieval). No consolidation recommended.
- **Security:** no unsafe shell commands, no credential leakage, no
  unnecessary external dependencies, no fabricated capabilities. The
  injection-related text in `rag`, `ai-agents`, and `mcp-security` is
  defensive guidance and clearly framed attack examples, not injectable
  instructions. `npm run check:security` PASS (no findings).
- **Accessibility:** only `editorial-workflow` and `source-verification`
  carry an Accessibility subsection; this matches the library-wide
  convention (only 4 of 277 skills have one, all Phase 3-verified
  non-frontend skills omit it). Not a finding.
- **Honesty:** the SEO skills make no ranking or traffic promises; all
  Google claims are labeled or verified; `topical-authority` and
  `entity-seo` explicitly state what Google does not publish.

## Files changed

- `skills/seo/serp-monitoring/SKILL.md` — B5-01 fix (2 lines).
- `skills/seo/content-decay/SKILL.md` — B5-02 fix (1 line).
- `skills/seo/entity-seo/SKILL.md` — B5-03 fix (3 lines added).
- `ai/remediation/stage-c/batch-5-ai-seo-content.md` — this fragment.

No other files changed by this batch. (Other modified files in the
working tree belong to concurrent batches.)

## Validation after fixes

| Check | Result |
|---|---|
| `npm run validate` | PASS with 4 warning(s), all pre-existing upstream (agentic-seo, doc-coauthoring, site-architecture, writing-plans); none in this batch |
| `npm run check:frontmatter` | PASS (277 skills) |
| `npm run check:security` | PASS: no findings |
| Quality scores (edited skills) | `serp-monitoring` 91, `content-decay` 94, `entity-seo` 97; 0 CRITICAL |

## Not verified

- The secondary-source claim that Google's Knowledge Graph Search API
  page carries a bold "not suitable for use as a production-critical
  service" warning could not be confirmed from a direct fetch of
  <https://developers.google.com/knowledge-graph> (the fetched text does
  not include it; it may sit in a callout the text fetch omits). The
  B5-03 fix was therefore grounded on the Google Cloud docs statement
  (new projects → Cloud Enterprise Knowledge Graph) instead, which was
  confirmed.
- `llm-integration`'s parenthetical that the older `docs.anthropic.com`
  address redirects to `platform.claude.com` was not directly tested;
  the `platform.claude.com` tool-use URL itself was verified live.
- Individual doc links already covered by the Phase 4 online link check
  (609 URLs, 0 errors) were not all re-fetched; load-bearing links for
  this batch were spot-checked live as listed above.

## Batch totals

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 1 (fixed) |
| Low | 2 (fixed) |
| Informational | 2 (no fix needed) |
| **Total** | **5** |

- Skills audited: 11. PASS: 8. FIXED: 3. NEEDS-REVIEW: 0.
- Recommended verification status: all 11 **verified**.
