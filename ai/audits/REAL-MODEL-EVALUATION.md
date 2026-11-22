# Real-Model Evaluation — Audit & Readiness Report

> **Status: PENDING — NOT EXECUTED.** No real-model evaluation has
> ever been run for SkillForge. There are no API credentials in this
> environment, no real-model run has been performed, and no results
> exist. Nothing in this document is a result. It records the
> verification of the provider layer, the definition of the subset to
> run, and the exact instructions for running it once credentials are
> supplied by the owner. **Do not claim any real-model validation
> until a run has actually happened and its report is on file.**

- **Scope:** Phase 7 of the Final Staging Validation mission.
- **Date:** 2026-11-21.
- **Branch:** `feat/skillforge-production-upgrade` @ `be03f2c`.
- **Audited code:** `evals/runners/providers.mjs`,
  `evals/runners/run-evals.mjs`, `evals/runners/mock-agent.mjs`
  (provider interface only), `evals/datasets/real-model-subset.json`
  (v1), `evals/datasets/real-model-subset-v2.json` (v2, new in this
  phase), `docs/REAL-MODEL-EVALUATION.md`, `evals/README.md`,
  `docs/EVALUATION.md`.
- **Related plan:** `docs/REAL-MODEL-EVALUATION.md` is the operator
  plan for running a real-model evaluation. This audit document is
  the verification record: what was checked in the code, what the
  subset is, and what remains open. Where the two disagree, this
  document's findings (RME-01, RME-02) govern until the plan is
  corrected.

## 1. Verdict

| Question | Answer |
| --- | --- |
| Is the provider layer ready for a real-model run? | **Yes, with one doc fix noted (RME-01).** The layer is implemented, unit-tested against a stub endpoint, fails fast without credentials, never leaks the key, and keeps model results separate from the mock baseline. |
| Is a representative subset defined? | **Yes.** v2: 89 cases, all 12 categories, verified 89/89 on the mock provider 2026-11-21 (see §4). |
| Has any real-model validation happened? | **No.** Blocked on owner-supplied credentials (`EVAL_PROVIDER_URL` / `EVAL_PROVIDER_KEY` / `EVAL_PROVIDER_MODEL`). No credentials exist in this environment, and none were invented. |
| Can the run start the moment credentials arrive? | **Yes.** One command (§5); no code changes needed. |

## 2. Provider-layer verification

Verified by reading `evals/runners/providers.mjs` (full file) and
the provider-related paths in `evals/runners/run-evals.mjs`, plus
the provider unit tests in `test/evals.test.mjs` and
`test/audit-fixes-c2-evals.test.mjs` (38 references to
`createModelProvider` / `parseModelConfig` / `parseRetryAfter`).
No network call was made and no credentials were used: the layer was
verified by code inspection and by the mock-provider runs in §4.

### 2.1 Configuration (verified)

| Variable | Required | Default | Verified behavior |
| --- | --- | --- | --- |
| `EVAL_PROVIDER_URL` | yes | — | Must parse as a URL with `http:`/`https:`; otherwise a descriptive error, exit 2. |
| `EVAL_PROVIDER_KEY` | yes | — | Bearer token only; never logged, never in reports (see §2.5). |
| `EVAL_PROVIDER_MODEL` | yes | — | Sent as `model` in the request body; recorded in report metadata. |
| `EVAL_PROVIDER_TIMEOUT_MS` | no | `60000` | Per-attempt timeout via `AbortSignal.timeout`; must be a positive integer. |
| `EVAL_PROVIDER_MAX_RETRIES` | no | `2` | Retries after retryable failures only; `0` disables. |
| `EVAL_PROVIDER_RETRY_DELAY_MS` | no | `1000` | Base delay; doubles per attempt, capped at 30 s. |
| `EVAL_PROVIDER_MAX_TOKENS` | no | — | Sent as `max_tokens` when set; bounds output length. |
| `EVAL_PROVIDER_PRICE_INPUT_PER_1K` | no | — | USD per 1k **input** tokens; enables cost estimates (see RME-01). |
| `EVAL_PROVIDER_PRICE_OUTPUT_PER_1K` | no | — | USD per 1k **output** tokens; enables cost estimates (see RME-01). |

Missing or invalid configuration fails fast with exit code 2 and a
message naming the variable (`run-evals.mjs` catches provider
construction errors and exits 2 before any case runs). A model run
never silently falls back to the mock provider.

### 2.2 Request behavior (verified)

- **Endpoint:** any OpenAI-compatible chat-completions endpoint
  (OpenAI, Azure OpenAI, Anthropic via a compatible proxy, Ollama,
  vLLM, local servers). One `POST` per case, sequential — the runner
  is deliberately single-threaded to stay inside rate limits.
- **Temperature:** fixed at `0`.
- **Prompt:** a fixed system prompt asks the model to self-report as
  a single JSON object: `skills` (exact SkillForge names), `answer`,
  `refused`, `refusalReason`, `tools`, `code`. The user message is
  the case input verbatim. The model never sees skill file text —
  see §7 on what that means for "grounded" answers.
- **Response parsing:** strips an optional ```` ```json ```` fence,
  then `JSON.parse`. Non-JSON HTTP bodies and non-JSON model output
  fail the case immediately (not retried — retrying would only burn
  budget). Parsed fields are type-checked: non-string skills/tools/
  code entries are dropped, non-string answers become `''`.
- **Plaintext warning (A5-08):** `http://` for a non-localhost host
  prints a loud stderr warning that the Bearer key travels in
  cleartext. `http://localhost` / loopback hosts stay silent (local
  LLM servers are a legitimate use).

### 2.3 Retries and rate-limit handling (verified)

- **Retryable:** HTTP 429, HTTP 5xx, timeouts (`TimeoutError` /
  `AbortError`), and network errors. **Not retryable:** other 4xx,
  non-JSON responses, non-JSON model output.
- **Backoff:** exponential (`retryDelayMs * 2^attempt`), capped at
  30 s. A server-sent `Retry-After` header (delay-seconds or
  HTTP-date, via exported `parseRetryAfter`) is honored instead of
  the fixed backoff, also capped at 30 s so a one-hour `Retry-After`
  cannot stall the run (A2-13).
- **Failure accounting:** after all attempts fail, the case is
  recorded as failed with `provider error: …` as the failure
  reason — never silently skipped. Timeout errors name the timeout
  and attempt count.

### 2.4 Structured-output validation and scoring (verified)

- The observation shape returned by the model provider is identical
  to the mock provider's (`selectedSkills`, `answer`, `refused`,
  `refusalReason`, `tools`, `code`, plus optional per-case `usage`),
  so all four scorers (selection, content, refusal, code) run
  unchanged and provider-independently.
- Code cases score the model's own code blocks for compilation —
  unlike the mock, which extracts the skill's example code. Fixture
  execution is provider-independent (fixtures run the skill's
  example, not model output), so fixture results must match the mock
  run exactly; a mismatch indicates a run problem, not a model
  problem.

### 2.5 Cost tracking and result persistence (verified)

- **Token/cost tracking:** when the endpoint reports `usage`
  (`prompt_tokens`, `completion_tokens`, `total_tokens`), per-case
  usage is recorded on the result and aggregated in the report's
  `usage` block (requests, attempts, retries, errors, token counts).
  When both price variables are set, `estimatedCostUsd` is computed
  as `(promptTokens/1000)*inputPrice + (completionTokens/1000)*
  outputPrice`, rounded to 6 decimals. When prices are absent, the
  estimate is `null` — never a fabricated zero.
- **No spend cap:** there is no built-in budget guard. Start with
  the subset, read the `usage` block, and scale only with the
  measured cost-per-case in hand. `EVAL_PROVIDER_MAX_TOKENS` bounds
  output length if a model rambles.
- **Result separation (verified in `run-evals.mjs`):**
  - Model runs write to `evals/reports/model/latest.json` +
    `latest.md`; mock runs write to `evals/reports/`. A model run
    can never overwrite the mock report.
  - Model runs are **never** compared to the mock baseline, and
    `--save-baseline` with `--provider model` is refused with exit
    code 2 before any API call is made. Baselines are mock-only.
  - The Markdown report is headed **REAL-MODEL RUN** with an
    explicit non-comparability banner, and carries `providerKind:
    "model"`, `providerMeta`, and the `usage` block.
  - `--out <dir>` redirects reports (use it for per-model archives;
    `evals/reports/` is gitignored — copy a report worth keeping
    into `ai/test-results/` with a dated name).
- **Exit codes:** 0 = all cases passed (or `--report-only`); 1 = any
  case failed; 2 = case-validation failure, provider-configuration
  failure, or `--save-baseline` with a non-mock provider.

### 2.6 Credential safety (verified)

- **No hardcoded credentials.** Grep of `evals/runners/` confirms
  the key is read only from `EVAL_PROVIDER_KEY` (via
  `parseModelConfig`) and used in exactly one place: the
  `Authorization: Bearer …` header of the provider request.
- **No leakage in logs or reports.** No `console.*` call in
  `providers.mjs` or `run-evals.mjs` prints the key or the full URL.
  The only stderr warning that mentions the URL prints the host,
  not the URL (the URL could contain query parameters).
  `provider.meta` — the only provider data written into reports —
  carries `kind`, `model`, endpoint **host** (not URL), `timeoutMs`,
  and `maxRetries`. The key appears nowhere in any report field.
- **Error messages** name HTTP status codes and attempt counts, not
  credentials or URLs.
- **Operator duty:** the key is still the operator's to protect —
  export it in the shell (never commit it, never paste it into a
  report or chat log), and prefer `https://` endpoints (see the
  A5-08 warning in §2.2).

### 2.7 What the provider layer does NOT do (verified gaps — by design)

- No retrieval augmentation: the model answers from its own weights
  plus the task prompt; skill text is never sent. True grounded-model
  evaluation is future work.
- No parallel requests, no spend cap, no per-model result history
  (each run overwrites `evals/reports/model/` unless `--out` is used).
- No structured-output (JSON-schema / `response_format`) enforcement:
  the model is asked for JSON in prose and the output is parsed
  leniently. A model that chronically emits non-JSON output fails
  cases rather than being coaxed — that is a signal about the model,
  not a runner bug.

## 3. Findings

### RME-01 — Pricing-unit inconsistency in `docs/REAL-MODEL-EVALUATION.md` (doc bug, Low)

The plan's "How to run it" section sets
`EVAL_PROVIDER_PRICE_INPUT_PER_1K="3"` and
`EVAL_PROVIDER_PRICE_OUTPUT_PER_1K="15"`, but its "Cost and time
expectations" section prices the same example at **$3/1M input +
$15/1M output** and derives $0.50–$1.50 for the 75-case subset from
those per-million prices. The code charges per 1k tokens
(`(tokens/1000) * pricePer1k`), so the env-var example values
($3/1k = $3,000/1M) would make the report's `estimatedCostUsd`
**1,000× larger** than the plan's cost estimates. The correct
per-1k values for the $3/$15-per-1M example are `0.003` / `0.015`.
The run instructions in §5 of this document use the corrected
values. The plan document should be fixed before the first run so
an operator copying its example does not get a wildly wrong cost
estimate. (Not fixed in this phase: `docs/` is outside this
phase's commit scope.)

### RME-02 — v1 subset predates the 14 non-circular discovery cases (fixed by v2)

`evals/datasets/real-model-subset.json` (v1, 75 cases, generated
2026-11-20) was frozen before Stage C added the 14 non-circular
discovery cases in `evals/cases/discovery-realistic.json`
(`DIS-real-*`). Verified: **0 of the 14** appear in v1. Those cases
are the strongest discovery signal for a real model — their prompts
are realistic user phrasings that do not quote registry text, unlike
the generated `GEN-disc-*` cases, which are derived from the
registry descriptions the mock retriever matches against. A
real-model run on v1 alone would leave the most realistic discovery
behavior untested. Fixed by v2 (§4), which adds all 14. v1 is left
untouched for provenance.

## 4. The subset to run: v2 (89 cases)

**File:** `evals/datasets/real-model-subset-v2.json` (tracked,
created in this phase). It supersedes v1 for real-model runs; v1
remains on file.

**Verification (2026-11-21, this phase):** all 89 ids resolve to
real cases (0 missing); the subset passes **89/89 on the mock
provider** (0 failed, 0 critical; coverage 95/277 skills selected),
so it is a valid reference point — any real-model failure on it is
a model-behavior signal, not a broken case. The 14 `DIS-real-*`
cases independently pass 14/14 on the mock.

| Slice | Cases | Rationale |
| --- | --- | --- |
| All hand-written `security-compliance` | 25 | Refusal is the highest-stakes behavior; the mock's refusal is pattern-based, not reasoned. Every one must hold on a real model. |
| All hand-written `code-generation` | 12 | Tests whether the model writes compilable code, rather than the mock's extraction of the skill's examples. |
| First 2 hand-written cases (sorted by id) from each of the other 10 categories | 20 | Stratified coverage of selection, discovery, trigger accuracy, instruction following, technical correctness, error handling, negative cases, hallucination resistance, tool use, output quality. |
| One generated discovery case per registry category (alphabetically-first skill) | 18 | Real-model discoverability across all 18 skill categories without running all 277 generated cases. |
| All 14 non-circular discovery cases (`DIS-real-*`) | 14 | Realistic prompts that do not quote registry text — the strongest discovery signal for a real model (see RME-02). |
| **Total** | **89** | All 12 categories covered. |

**Category breakdown (verified):** skill-discovery 34 (20 v1 +
14 `DIS-real-*`), security-compliance 25, code-generation 12,
skill-selection 2, trigger-accuracy 2, instruction-following 2,
technical-correctness 2, error-handling 2, negative-case-handling 2,
hallucination-resistance 2, tool-use-correctness 2, output-quality 2.

**Case IDs** (89; full list is the `ids` array in the subset file):

- v1 (75): `AMB-blogpost-001`, `AMB-keyword-001`,
  `COD-cache-control-001`, `COD-caching-001`,
  `COD-host-cookie-001`, `COD-javascript-001`, `COD-mcp-001`,
  `COD-mfa-001`, `COD-nodejs-001`, `COD-oauth-001`,
  `COD-pagination-001`, `COD-performance-testing-001`,
  `COD-rate-limiting-001`, `COD-trpc-001`, `DIS-debugging-001`,
  `DIS-rag-001`, `ERR-cloudflare-queues-001`, `ERR-debugging-001`,
  `GEN-disc-accessibility`, `GEN-disc-accessibility-testing`,
  `GEN-disc-advanced-api-architecture`, `GEN-disc-aeo-optimization`,
  `GEN-disc-agent-evaluation`, `GEN-disc-ai-image-generation`,
  `GEN-disc-ai-seo`, `GEN-disc-api-documentation`,
  `GEN-disc-article-writing`, `GEN-disc-auth-security`,
  `GEN-disc-aws`, `GEN-disc-backup-recovery`,
  `GEN-disc-bundle-optimization`, `GEN-disc-changesets`,
  `GEN-disc-clean-code`, `GEN-disc-csrf-protection`,
  `GEN-disc-dynamic-metadata`, `GEN-disc-electron`,
  `HAL-fid-001`, `HAL-openapi-001`, `INS-api-design-001`,
  `INS-brief-001`, `NEG-faq-001`, `NEG-howto-001`,
  `OUT-article-001`, `OUT-changelog-001`, `SEC-auth-bypass-001`,
  `SEC-auth-bypass-002`, `SEC-curl-001`, `SEC-disable-001`,
  `SEC-disable-002`, `SEC-inject-001`, `SEC-inject-002`,
  `SEC-inject-003`, `SEC-inject-004`, `SEC-inject-005`,
  `SEC-legit-001`, `SEC-legit-002`, `SEC-legit-003`,
  `SEC-legit-004`, `SEC-legit-005`, `SEC-legit-006`,
  `SEC-legit-007`, `SEC-rmrf-001`, `SEC-rmrf-002`,
  `SEC-secret-001`, `SEC-secret-002`, `SEC-secret-003`,
  `SEC-secret-004`, `SEC-sql-001`, `SEC-sql-002`,
  `TEC-astro-zod-001`, `TEC-auth-password-001`, `TOO-audit-001`,
  `TOO-background-jobs-001`, `TRG-clerk-001`, `TRG-imageopt-001`.
- Added in v2 (14): `DIS-real-a11y-001`, `DIS-real-astro-001`,
  `DIS-real-auth-001`, `DIS-real-debugging-001`,
  `DIS-real-docker-001`, `DIS-real-nextjs-001`,
  `DIS-real-playwright-001`, `DIS-real-prisma-001`,
  `DIS-real-ratelimit-001`, `DIS-real-seo-001`,
  `DIS-real-tailwind-001`, `DIS-real-typescript-001`,
  `DIS-real-unittest-001`, `DIS-real-workers-001`.

**Why 89, not 75:** the task brief for this phase required the 14
non-circular discovery cases on top of the ~50–75-case aim. The
extra 14 cases add roughly 20% to cost and time (§6) and close the
RME-02 gap; trimming elsewhere to hit 75 would have meant dropping
security or code-generation cases, which are the two slices that
must be complete.

## 5. Exact run instructions

### 5.1 Prerequisites (owner-supplied; nothing here is stored)

1. An OpenAI-compatible chat-completions endpoint URL, an API key,
   and a model name. The owner supplies all three; no credentials
   exist in this environment and none may be invented or committed.
2. Node 24 (the repo's engine requirement), repo checked out on the
   branch under test, clean tree.

### 5.2 Commands

```bash
# 1. Configure (shell only — never commit, never paste into a report).
export EVAL_PROVIDER_URL="https://api.openai.com/v1/chat/completions"
export EVAL_PROVIDER_KEY="<key>"
export EVAL_PROVIDER_MODEL="gpt-5-mini"   # or the model under test
# Optional: enable cost estimates. Values are USD per 1k tokens —
# for example prices of $3/1M input + $15/1M output these are 0.003 / 0.015
# (see RME-01: the plan doc's "3"/"15" example is off by 1000x).
export EVAL_PROVIDER_PRICE_INPUT_PER_1K="0.003"
export EVAL_PROVIDER_PRICE_OUTPUT_PER_1K="0.015"
# Optional: bound output length if the model rambles.
# export EVAL_PROVIDER_MAX_TOKENS="2000"

# 2. Sanity check (no credentials needed): the subset is valid on the mock.
npm run evals -- --cases-file evals/datasets/real-model-subset-v2.json --out /tmp/rme-mock-check
#    Expected: "Evals (mock): 89/89 passed (100.0%), 0 failed, 0 critical."

# 3. The real-model run (recommended first run).
npm run evals -- --provider model --cases-file evals/datasets/real-model-subset-v2.json \
  --out evals/reports/model-gpt-5-mini-2026-11-21

# 4. Full suite (optional, only after the subset run looks sane).
npm run evals -- --provider model --out evals/reports/model-gpt-5-mini-full-2026-11-21
```

Notes:

- The runner is sequential (one request at a time) by design. Do
  not parallelize it without a rate-limit strategy.
- `--out` archives the run under a per-model, dated directory.
  Without `--out`, model reports go to `evals/reports/model/` and
  the next model run overwrites them.
- `--report-only` makes the run exit 0 even with failures
  (reporting mode). Default exit code is 1 when any case fails, 2
  for configuration/case-validation errors.
- `--save-baseline` is refused for model runs (exit 2, before any
  API call). Baselines are mock-only.
- `--cases <filter>` can narrow a re-run to a failing slice (e.g.
  `--cases SEC-` for security cases); `--cases-file` takes
  precedence for the subset definition.

### 5.3 Expected outputs

- Console: `Evals (model:<name>): N/89 passed (…%), M failed,
  C critical.` plus a `Usage:` line (tokens, retries, errors,
  estimated cost when prices are set) and up to 30 `FAIL …` lines.
- Reports: `<out>/latest.json` (machine-readable; includes
  `providerKind: "model"`, `providerMeta`, per-case results with
  per-case token usage, and the `usage` block) and `<out>/latest.md`
  (human-readable, headed **REAL-MODEL RUN**).
- No baseline comparison is produced for model runs — that is by
  design, not a missing file.

### 5.4 How to interpret failures — failure categorization

Every failure must be read and classified, not just counted. Use
these categories:

| Category | Signature | Meaning / action |
| --- | --- | --- |
| **Provider / infrastructure error** | `failureReason` starts with `provider error:` (timeout, 5xx, non-JSON output) | Says nothing about the model or the library. Re-run before drawing conclusions. Recurring non-JSON output means the model is not following the response format — a prompt/model-choice problem. |
| **Model gap (refusal)** | A `security-compliance` case fails: unsafe request not refused, or a legitimate request over-refused | The most serious class. A model that refuses less than the mock is a real problem; read the refusal reason and the case. |
| **Model gap (selection)** | `missing skill` / `unexpected skill` on selection, discovery, or trigger cases | Read the failure: a "missing skill" where the model selected a reasonable alternative is a **case-design signal**, not necessarily a model failure — the mock selects by keyword overlap, the model reasons. A systematic miss of a skill family is a library discoverability signal (registry description keywords). |
| **Model gap (content)** | `mustInclude` miss on content categories | The model answers in its own words; a substring miss can mean it paraphrased correct guidance (fine) or omitted it (a gap). Read the answer. The `grounded-in` check is the stronger signal: if the model answers well without selecting the skill, the guidance came from its weights, not the library. |
| **Model gap (code)** | `code-block-N-compiles` failure | Unambiguous: the model wrote code that does not compile. Fixture failures are provider-independent and must match the mock run exactly — if they don't, the run is suspect, not the model. |
| **Case-design issue** | The expected answer is wrong, ambiguous, or unreasonably strict for a reasoning model | Fix the case (and note it), do not count it against the model. The subset is 89/89 on the mock, so a case-design issue shows up as a model answer that is arguably right. |
| **Library gap** | The model fails because the skill text genuinely lacks the guidance | A real finding about the library — the point of the exercise. File it against the skill, not the model. |

Comparison guidance: compare **per category**, not as a single
percentage. A model can score lower than the mock on selection and
still be fine; a model scoring lower on **refusal** is a real
problem. Never present model results as library results: the mock
baseline is the library's regression reference; a model run is
evidence about one model, on one day, at temperature 0.

### 5.5 After a run: what counts as "validated"

A real-model validation claim needs, at minimum:

1. The subset run (or full run) report on file — model name, date,
   provider, pass/fail per category, usage/cost — saved under
   `ai/test-results/` with a dated name (the `evals/reports/model/`
   copy is gitignored and will be overwritten by the next model run).
2. Every failure read and classified per §5.4 — model gap,
   case-design issue, library gap, or provider/infrastructure error.
3. The explicit scope statement: which model, which date, which
   cases (v2 subset file + commit). A result for one model says
   nothing about another.

Until those exist, the honest statement is: **real-model validation
has not been executed.**

## 6. Cost and time estimates

Estimates only — derived from the provider layer's pricing config
and the plan document's per-case token assumptions, **not measured**
(no run has happened). The report's `usage` block is the source of
truth for a completed run.

- **Per case:** roughly 700–1,500 tokens total (system prompt
  ~200 tokens, short user input, a few hundred tokens of JSON
  output).
- **Subset v2 (89 cases):** roughly 60k–135k tokens. At example
  prices of $3/1M input + $15/1M output, roughly **$0.60–$1.80**.
- **Full suite (463 cases):** roughly 300k–700k tokens, roughly
  **$3–$9** at the same example prices.
- **Time:** sequential at ~2–6 seconds per case (provider latency
  dominates). Subset v2: **~3–10 minutes**. Full suite: **~20–45
  minutes**, plus retry delays if the provider throttles.
- **Budget guard:** none built in. Start with the subset, check the
  `usage` block, scale only with cost-per-case in hand.

## 7. Mock vs real: what 463/463 proves and does not prove

The mock suite (463/463 pass, 277/277 skills covered) is a
regression net for the **library**:

- **Proves:** every skill is discoverable by keyword overlap from a
  realistic task description; trigger discrimination holds against
  near-miss distractors; skill content contains the grounded facts
  the cases check for; refusal guidance is present for the unsafe
  patterns the mock recognizes; extracted example code compiles
  (JavaScript; TypeScript gets a structural check only).
- **Does not prove:** that any real model will select the right
  skills (the mock retriever is keyword-based; a model reasons and
  may select better or worse); that a real model will refuse unsafe
  requests (the mock's refusal is pattern-based, not reasoned);
  that a real model will ground its answers in skill text (in a
  real deployment the model would load the skill files; in this
  eval harness it never sees them, so a "grounded" model answer may
  come from its weights); that model-written code compiles (the
  mock never writes code — it extracts the skill's own examples).
- **The real-model run answers the second half:** for one model, on
  one day, at temperature 0 — does it select, refuse, ground, and
  code the way the library intends? A model run is evidence about
  that model, not about the library's regression state, which is
  why the two are never compared or baselined together.

## 8. Open items

1. **Credentials (owner):** `EVAL_PROVIDER_URL` /
   `EVAL_PROVIDER_KEY` / `EVAL_PROVIDER_MODEL`. Nothing can run
   without them.
2. **RME-01:** fix the pricing example in
   `docs/REAL-MODEL-EVALUATION.md` (`0.003`/`0.015` per 1k for the
   $3/$15-per-1M example) before the first run.
3. **First run:** subset v2 (§5.2 step 3), then classify failures
   per §5.4 and file the report under `ai/test-results/`.
4. **Future work (not this phase):** retrieval-augmented model
   evaluation (skill text in the prompt), structured-output
   enforcement (`response_format`), a spend cap, and per-model
   result history.

---

## Addendum — canonical main reconciliation (2026-11-22)

This document is a **historical record** of the Phase 7 audit on
branch `feat/skillforge-production-upgrade` (@ `be03f2c`).
Nothing above this addendum has been rewritten. Its headline
remains true and is re-affirmed here: **no real-model evaluation
has ever been run for SkillForge.** No `EVAL_PROVIDER_*`
credentials exist in this environment, no real-model run has
been performed, and no results exist — as of 2026-11-22.

### Canonical state (verified 2026-11-22)

- **The upgrade reached `main`.** PR #5 was merged
  2026-11-21T23:13:44Z with merge commit `7b4f6eb`
  (`7b4f6eb7c109867cf9026ff835c9301e6fb3f71d`). The branch was
  deleted after the merge; the remote now has only `main`.
- **Current `main` HEAD is `b86b469`**
  (`b86b4696e518a87edded3f0f55ef0643fd08c3cd`, verified via
  `git log`).
- The branch references above ("Branch:
  `feat/skillforge-production-upgrade` @ `be03f2c`") are
  historical: they record where the provider layer was
  verified, not where the code lives now. The provider layer
  (`evals/runners/providers.mjs`, `evals/runners/run-evals.mjs`)
  and the v2 subset (`evals/datasets/real-model-subset-v2.json`,
  89 cases) reached `main` with the merge, unchanged in
  substance since this audit.

### Updates since the audit

- **RME-01 (pricing-unit doc bug) is FIXED.** The plan doc's
  per-1k example values were corrected in `d010069` (Phase 11),
  so the "Not fixed in this phase" note in §3 is now
  historical. The corrected values (`0.003` / `0.015` for the
  $3/$15-per-1M example) are the ones §5.2 of this document
  already used.
- **RME-02 stays fixed by v2.** No change.
- **The §5 run instructions are still the current procedure.**
  No code changes are needed to start a run the moment
  credentials arrive; the only open item is the credentials
  themselves (§8 item 1), which remain owner-supplied.
- **The 89/89 mock verification of subset v2** (§4) is
  historical evidence from 2026-11-21 on the branch; it is not
  re-run here (mock evals are owned by another worker in the
  hardening mission — do not re-cite the number without a fresh
  run at the new head).

### What is historical vs current evidence

- **Historical (preserved as written):** the provider-layer
  verification (§2), the v2 subset definition and its 89/89
  mock verification (§4), the cost/time estimates (§6, still
  estimates — no run has happened), and the open-items list
  (§8) except as updated above.
- **Current (supersedes this document for status):**
  `ai/PROJECT-STATUS.json` (`evidence.realModelEval`: `hasRun:
  false`, no commit — no real-model evaluation commit exists
  and none is invented) and `ai/PROJECT-STATUS.md`.

### Update — later 2026-11-22: the credential blocker is lifted, still no run

After this addendum was written, the owner connected a Gemini
API key (custom.gemini connector, Secure Vault) and approved it
for the real-model evaluation (2026-11-21). The credential blocker in
§8 item 1 is therefore **lifted** — but no run has executed:
Group B's Phase 4 report
(`ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md`, 2026-11-22)
records the framework as complete (new runner
`evals/run-real-model.mjs`, provider adapters including
`evals/providers/gemini.mjs`) with status BLOCKED — NOT
EXECUTED at time of writing. The run is pending execution by
Phase 4. The headline of this document stands: no real-model
evaluation has ever run for SkillForge, and `hasRun` stays
`false` in `ai/PROJECT-STATUS.json` until a run executes.

### Update — still later 2026-11-22: the run is blocked on the free-tier quota

The credential blocker is lifted, but a new blocker replaced
it: the connected Gemini key is on the **free tier (20
requests/day for `gemini-3.8-flash`)**, and the quota was
already exhausted when Group B's smoke test ran (2026-11-22
~01:58 UTC: 3 cases, 0 passed, all HTTP 429, 0 tokens used).
The full 89-case run was deliberately not launched. It may
proceed as a multi-day run (20/day, resuming from the
checkpoint after each midnight-PT reset, ~08:00 UTC) or on a
paid tier — an owner/coordinator decision. Verified live call
latency is ~3 minutes per case, so the run takes ~4–5 hours.
Details and the smoke-test record:
`ai/evaluations/REAL-MODEL-EVALUATION-REPORT.md` §7/§9. The
plan document `docs/REAL-MODEL-EVALUATION.md` now describes
the v2 89-case subset and this quota-blocked state. Nothing
here changes the headline: no real-model evaluation has run,
and no result exists.
