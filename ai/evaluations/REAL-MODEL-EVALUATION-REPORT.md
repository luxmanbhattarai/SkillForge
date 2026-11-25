# Real-Model Evaluation Report

> **Status: BLOCKED — GEMINI FREE-TIER DAILY QUOTA EXHAUSTED.**
> The 3-case smoke test (2026-11-22, ~01:58 UTC) proved the
> connected key's project is on the free tier: **20
> generate-content requests per day for `gemini-3.8-flash`**,
> already exhausted before the smoke test started (the very first
> attempt returned HTTP 429). All 3 smoke cases failed as
> provider-errors (429); 0 tokens used. The full 89-case run was
> deliberately **not** launched — it would fail all 89 cases
> identically. The quota resets at midnight Pacific Time
> (~08:00 UTC); on the free tier the run needs ~5 days at 20
> calls/day (the runner's checkpoint/resume supports exactly
> that), or the owner can link billing to move the project to a
> paid tier. See §7 and §9. Nothing in this document is a
> real-model result — the smoke test measured the quota, not the
> model. Do not cite mock results as real-model results — the
> mock numbers in §3 are a baseline for the library, not evidence
> about any model.

- **Phase:** 4 of the SkillForge production-hardening mission
  (Group B).
- **Date:** 2026-11-22.
- **Branch:** `feat/production-hardening` (from `main` @ `b86b469`).
- **Update (2026-11-22):** the user connected a Gemini API key
  (custom.gemini connector, Secure Vault) and approved it for the
  real-model evaluation (~89 calls). Model: `gemini-3.8-flash`
  (`gemini-2.5-flash` returns 404 for this key). The runner was
  refactored onto the provider registry (§4.1) and is ready; the
  helper-based adapter has landed and been verified live (§7).
- **Update (2026-11-22, later):** model switched to
  `gemini-3.5-flash` per owner instruction — 3.5-flash has the
  higher per-minute limit (10–15 RPM vs 5 RPM) on the same
  20 req/day free-tier quota. Probe verified the same day
  (completion returned model `gemini-3.5-flash`, finish `stop`,
  327 total tokens). The 3.8-flash references below that describe
  the smoke test and its quota exhaustion are history and stay
  as written; the run commands and defaults now name 3.5-flash.
- **Supersedes for the runner:** the operator plan in
  `docs/REAL-MODEL-EVALUATION.md` and the audit in
  `ai/audits/REAL-MODEL-EVALUATION.md` (2026-11-21) remain the
  background reading; this report records what Phase 4 verified,
  built, and tested, and the exact blocker. Where this report and
  the older plan disagree on the subset, this report governs: the
  v2 subset (89 cases) is the current target, not the v1 subset
  (75 cases) the plan still describes.

## 1. Methodology

A real-model evaluation answers a different question from the mock
suite. The mock provider (`evals/runners/mock-agent.mjs`) is a
deterministic keyword retriever: it proves the library is
discoverable, its content is present, and its refusal guidance is
pattern-matched. It says nothing about whether a real model will
select the right skills, ground answers in them, refuse unsafe
requests, or write compilable code. The real-model run tests one
model, on one day, at temperature 0, against a fixed 89-case subset
(§2), scored by the same four scorers as the mock suite
(selection, content, refusal, code) so a case scores identically
in both runners.

The run record a real-model evaluation must produce — and what the
new runner captures (§4) — is:

- model name as requested **and** the exact served model version
  observed in response bodies (providers serve dated snapshots
  behind an alias; two runs of "the same" model are not comparable
  without it);
- timestamp, dataset version + SHA-256 fingerprint, git commit,
  Node version;
- per-case IDs, results, checks, and per-case token usage;
- aggregate scores across eight dimensions (skill selection,
  instruction following, refusal, code quality, grounding,
  tool use, unsafe-instruction handling, context preservation);
- failed cases with a first-pass failure category, each flagged
  for human review (a machine category is not a verdict — see
  `ai/audits/REAL-MODEL-EVALUATION.md` §5.4);
- cost/token tracking where the provider reports usage, and no
  fabricated cost when it does not (the estimate stays `null`);
- reproducible output: machine-readable JSON + human Markdown
  summary, written to a per-run directory that a later run never
  overwrites.

Model runs are never compared to the mock baseline and can never
save a baseline: a model run measures a model, not the library's
regression state.

## 2. Dataset: real-model-subset-v2 (89 cases)

**File:** `evals/datasets/real-model-subset-v2.json`
(version 2, generated 2026-11-21, supersedes the v1 75-case
subset). The file lists case IDs; the cases themselves live in
`evals/cases/*.json` and `evals/datasets/discovery-generated.json`.

**Verification performed in this phase** (2026-11-22, scripted
check against the case files, not a re-read of the audit):

| Check | Result |
| --- | --- |
| IDs listed | 89, all unique |
| Declared `count` | 89 — matches |
| IDs resolving to real cases | 89/89 (0 missing) |
| Malformed cases (missing input / expectations) | 0 |
| Categories covered | all 12 |
| Distinct skills referenced | 55 |

Category breakdown (verified): skill-discovery 34, security-
compliance 25, code-generation 12, and 2 each from
skill-selection, trigger-accuracy, instruction-following,
technical-correctness, error-handling, negative-case-handling,
hallucination-resistance, tool-use-correctness, output-quality.
Types: positive 61, security 18, negative 4, regression 4,
ambiguous 2.

Selection rule (from the file's `selectionRule`): all hand-written
security-compliance cases (25), all hand-written code-generation
cases (12), the first 2 hand-written cases (sorted by id) from
each of the other 10 categories (20), one generated discovery case
per registry category (18), and all 14 non-circular discovery
cases (`DIS-real-*`, realistic prompts that do not quote registry
text — the strongest discovery signal for a real model).

**No defects were found in the dataset.** No fix was needed and
none was made; the file is unchanged from `main`.

## 3. Framework state (verified)

| Component | State | Evidence |
| --- | --- | --- |
| Provider interface (`evals/runners/providers.mjs`) | Ready | OpenAI-compatible chat endpoint, `EVAL_PROVIDER_*` env config, fails fast without credentials (exit 2, names the missing variables), Bearer key never logged or written to reports (report metadata carries the endpoint host only), retries on 429/5xx/timeout/network errors with exponential backoff capped at 30 s and `Retry-After` honored, temperature fixed at 0, per-case + aggregate token/cost tracking when the endpoint reports `usage`. Verified by reading the full file and by the provider unit tests in `test/evals.test.mjs` / `test/audit-fixes-c2-evals.test.mjs`. |
| Case validation (`validateCases`) | Ready | Unknown category/skill, duplicate id, missing fixture, bad `topN`, and expectation-less cases all fail fast (exit 2) before any API call. |
| Scorers (selection, content, refusal, code) | Ready | Provider-independent; identical observation shape for mock and model providers. Code cases score the model's own code blocks for compilation (`node --check`); TypeScript blocks get a structural check only, never reported as compiled. |
| RME-01 (pricing-unit doc bug) | **Fixed** | The audit's finding that `docs/REAL-MODEL-EVALUATION.md` used per-1k values `3`/`15` for a per-1M example is resolved: the plan now shows `0.003` / `0.015` (verified 2026-11-22). |
| RME-02 (v1 predates the `DIS-real-*` cases) | **Fixed by v2** | All 14 non-circular discovery cases are in the v2 subset (verified above). |
| Mock baseline | Green | `npm run evals`: **463/463 passed, 0 failed, 0 critical**, 277/277 skills covered, 0 regressions vs baseline (run 2026-11-22, output to `/tmp/groupb-mock-baseline`). |
| Subset on mock | Green | `npm run evals -- --cases-file evals/datasets/real-model-subset-v2.json`: **89/89 passed, 0 failed, 0 critical**, 95/277 skills selected (run 2026-11-22, output to `/tmp/groupb-subset-mock`). Any real-model failure on this subset is a model-behavior signal, not a broken case. |

**Known framework limits (unchanged, by design):** no retrieval
augmentation (the model never sees skill text, so a "grounded"
answer may come from its weights); no structured-output
enforcement (JSON is requested in prose and parsed leniently);
no spend cap (start with the subset, read the `usage` block,
scale only with cost-per-case in hand); sequential requests only
(by design, to stay inside rate limits). No dedicated
context-preservation cases exist in the subset — the runner
reports that dimension as an explicit proxy (§4).

**Doc staleness (not fixed here — `docs/` is outside Group B's
scope, flagged for the coordinator):** `docs/REAL-MODEL-
EVALUATION.md` still describes the v1 75-case subset throughout
(its "What to run" section, run commands, and cost/time estimates
all say 75 cases). The v2 subset (89 cases) is the current target
per the audit and this report. The plan should be updated to v2
before the first run so an operator does not run the superseded
subset.

## 4. What was implemented and tested

### 4.1 `evals/run-real-model.mjs` (new)

Dedicated real-model runner. It shares the case validation and
scorers with `run-evals.mjs` (a case scores identically in both),
obtains its provider from the registry
(`evals/lib/provider-registry.mjs`), and adds what a real-model
run record needs:

- **Provider resolution via the registry.** `--provider gemini`
  (default), `openai`, `anthropic`, `local`, or `model` (the
  legacy generic OpenAI-compatible provider). An unknown or
  unconfigured provider fails fast (exit 2) naming the missing
  variables, before any case runs and before any API call. The
  runner never falls back to another provider and never reads
  credentials from files. For Gemini, the CLI error additionally
  warns never to paste the raw key into the environment — the
  approved credential lives in the Secure Vault and is used
  through the helper-based adapter.
- **Gemini defaults** (applied to a copy of env, never to
  `process.env`, and recorded in the report): model
  `gemini-3.5-flash` and max tokens `2048` (the minimum that
  avoids empty content from this thinking model). An
  operator-set value always wins over a default.
- **Exact served model version** via `evals/lib/model-version.mjs`
  (new): a fetch wrapper that reads the `model` field out of
  response bodies (best-effort, via `Response.clone()`; silently
  skipped when cloning is unavailable). The report records the
  requested alias, the observed served model(s), and whether the
  served model was consistent across the run.
- **Dataset fingerprint:** subset file, version, generation date,
  case count (with a declared-vs-actual count check), and SHA-256
  of the dataset file. Unresolvable case IDs fail fast (exit 2).
- **Eight aggregate dimensions:** skill selection
  (selection + discovery + trigger-accuracy), instruction
  following, refusal (all security-compliance cases, including
  legitimate requests — over-refusal counts), code quality,
  grounding (technical-correctness + hallucination-resistance),
  tool use, unsafe-instruction handling (security-compliance
  cases with `refuse: true` only), and context preservation —
  flagged as a **proxy** (error-handling + negative-case-handling
  + output-quality) with the limitation stated in both the JSON
  report and the Markdown summary, because no dedicated
  context-preservation cases exist. Dimensions with no cases in
  the run report `passRate: null`, never a fabricated number.
- **Failure classification:** first-pass machine categories
  (`provider-error`, `refusal-gap`, `code-gap`,
  `selection-gap`, `content-gap`, `tool-gap`, `unclassified`)
  following the audit's §5.4 taxonomy, with priority
  provider-error > refusal > code > selection > content > tool,
  the full failed-check list retained, and every failure flagged
  `needsHumanReview: true`.
- **Run discipline for live providers.** Cases run sequentially
  with a small delay between them (`--delay-ms`, default 500).
  A rate-limit (429) error retries the case once after a backoff
  (`--retry-backoff-ms`, default 10000) and then fails the case
  as a provider error — never a retry loop. An authentication
  error (401/403) aborts the whole run immediately (exit 2, no
  report written) — a rejected credential is never retried
  blindly. An empty model response is recorded as the observed
  outcome (`emptyResponse` on the result, plus `finishReason`
  when the adapter surfaces it); it never crashes the run.
- **Cost/token tracking:** per-case `usage` when the provider
  reports it, plus the provider's aggregate `usage` block
  (requests, attempts, retries, errors, token counts,
  `estimatedCostUsd` when both price variables are set, `null`
  otherwise).
- **Reproducible output:** per-run directory
  `evals/reports/model/<run-id>/` (or `--out <dir>`) with
  `latest.json` + `latest.md`; `--archive <file>` additionally
  writes the JSON report to a durable path (for the Gemini run:
  `ai/evaluations/runs/real-model-gemini-3.5-flash-<YYYY-MM-DD>.json`,
  the file the dashboard worker consumes). The JSON carries run
  ID, timestamp, provider name, model, dataset fingerprint,
  environment (Node, platform, git commit), summary, dimensions,
  per-category breakdown, failures, usage, runner-level retry
  count, full per-case results, and limitations. Exit codes: 0 =
  all passed (or `--report-only`), 1 = any case failed, 2 =
  configuration/dataset/validation error or aborted run.
- **No credential leakage:** the report carries the endpoint host
  only; the key and full URL appear nowhere (asserted in tests).
- **Checkpointing (added for the long live run):** after every
  case, `<outDir>/checkpoint.json` is written atomically with all
  completed results, the dataset fingerprint, the provider/model,
  served models, and accumulated token totals. `--resume
  <checkpoint>` continues an interrupted run: it validates the
  checkpoint against the current dataset, provider, and model,
  skips completed cases (no re-billing), keeps the original run
  id, and merges checkpointed token totals into the final report.
  A case in flight when the process dies is re-run on resume
  (one extra call). Progress is logged per case to stderr
  (`[12/89] <id> pass|FAIL ...`) so a background run can be
  watched. See §7 for why this matters (a live call takes
  ~3 minutes).

### 4.2 `evals/lib/model-version.mjs` (new)

Provider-interface helper (see §4.1): `createVersionCapturingFetch`
+ `summarizeServedModel`. Passive observer only — it never changes
a request, never retries, never logs, and can never fail a run.

### 4.3 `test/real-model-eval.test.mjs` (new) — 32 tests, all passing

End-to-end tests with a fake in-process provider (canned
OpenAI-compatible responses keyed on the real case inputs — no
network, no credentials, no billable calls). The Gemini path is
tested through the real registry + real adapter with a **stub
helper script** (`GEMINI_HELPER_PATH` pointing at a temp `.py`
file that prints canned responses) — the real `gemini_chat.py`
helper is never invoked by the tests, so no test can make a paid
call:

- missing-credentials refusal: function-level (legacy provider
  rejects naming all three variables, writes nothing; gemini
  rejects naming `GEMINI_HELPER_PATH` when the helper is absent)
  and CLI-level (exit 2, names the variables / helper path, states
  the credential lives in the Secure Vault and must never be
  pasted into the environment);
- unknown provider rejected with the known list; `--help` exits 0
  and documents the flags; `applyProviderEnvDefaults` (gemini
  model + max tokens, operator values win, input not mutated);
- error classifiers: auth (401/403), rate limit (429), retry
  exhausted ("after 1 retry" / "after 3 attempt(s)"), model
  unavailable (404);
- full fake run: 3 real cases (selection, refusal, code) pass;
  served model captured (`fake-model-2026-01-01`); usage and cost
  tracked (450 tokens, estimated cost $0.00315 at the configured
  prices); all 8 dimensions present with correct aggregates;
  JSON + Markdown written; no credential material in the report;
- Gemini stub-helper run: 2 cases pass through the registry +
  real adapter; the stub's argv log proves `--model
  gemini-3.5-flash`, `--max-tokens 2048`, `--temperature 0` were
  passed; served model + usage + `servedModels` recorded;
  model defaults to `gemini-3.5-flash` when `GEMINI_MODEL` is
  unset; empty content (`finish_reason: length`) recorded with
  `finishReason`, never retried;
- failure run: a bad model (selects nothing, refuses nothing,
  writes no code) fails all 3 cases with the expected categories
  (`refusal-gap`, `selection-gap`, `code-gap`), 1 critical,
  exit 1, and exit 0 under `reportOnly`;
- provider-error run: a throwing fetch fails the case as
  `provider-error` (never silently skipped), `usage.errors` 1,
  served model `null` (not invented);
- 429 handling: a fresh 429 retries once and the case passes; a
  second 429 fails the case as `provider-error` (no retry loop);
  an already-exhausted 429 ("after 1 retry") is not retried again
  by the runner (the adapter already retried);
- auth failure (403) and model-unavailable (404) abort the run
  immediately with no report written, one call made, and the
  checkpoint path carried on the error for resume;
- empty response: recorded as the observed outcome with
  `finishReason`, no crash, never retried;
- archive: `--archive` writes a copy of the JSON report;
- checkpointing: checkpoint written after each case (kind,
  version, run id, dataset SHA, results, served models, usage
  totals); resume after an abort skips the completed case,
  keeps the run id, merges checkpointed token totals
  (3 requests, 300/150/450 tokens in the test), and records
  `resumedFrom` + a usage note; resume rejects a checkpoint for
  a different dataset, provider, or model; `onProgress` fires
  once per completed case;
- scoring consistency: the same fake run twice gives identical
  per-case results, dimensions, and summary;
- dataset validation: unresolvable IDs fail fast; duplicate IDs,
  empty lists, and count mismatches rejected; v2 loads as
  version 2 / 89 IDs with a SHA-256 matching the file bytes;
- `classifyFailure` priority order + `unclassified` fallback;
  `computeDimensions` predicate dimension + empty-dimension
  `null` rate; version capture with/without `clone()`, multiple
  served models, and non-2xx responses.

Command: `node --test test/real-model-eval.test.mjs` →
**32 tests, 32 pass, 0 fail** (2026-11-22).

### 4.4 What was NOT changed

- `evals/datasets/real-model-subset-v2.json`: verified clean, no
  defects, untouched.
- `evals/runners/providers.mjs`, `evals/runners/run-evals.mjs`,
  scorers: read and verified, not edited (outside this task's
  ownership; no defects found in them).
- No provider adapters were created or edited
  (`evals/providers/` belongs to another worker). The runner
  obtains its provider through the registry only.
- No credentials were created, requested, read, or stored
  anywhere. The Secure Vault was not accessed.

## 5. Cost and time expectations (estimates, not measured)

From the audit (§6), unchanged — no run has happened to measure
against. Per case roughly 700–1,500 tokens; subset v2 (89 cases)
roughly 60k–135k tokens, roughly **$0.60–$1.80** at example prices
of $3/1M input + $15/1M output (per-1k price variables `0.003` /
`0.015`); full suite (463 cases) roughly **$3–$9**. Time:
sequential at ~2–6 s per case — subset **~3–10 minutes**, full
suite **~20–45 minutes** plus retry delays. The report's `usage`
block is the source of truth for a completed run; these numbers
are for budget approval only.

## 6. Environment check (2026-11-22)

Checked for credentials in the environment only (env vars — no
files, vaults, or other sources were searched, per the mission
rules):

```text
$ env | grep -i EVAL_PROVIDER
(no output — no EVAL_PROVIDER_* variables are set)
```

No `EVAL_PROVIDER_*` variables are set, and no `GEMINI_API_KEY`
is set either (nor should one be — the approved Gemini credential
lives in the Secure Vault and must never be read into an env var).
The CLI was run without credentials and refused as designed
(exit 2, §4.3). **A 3-case live smoke test was run (§7, §9) and
failed on the free-tier daily quota; the full 89-case run has not
executed. No mock result is presented as a real-model result
anywhere in this report.**

## 7. Adapter state, latency, and how the run is executed

**Phase state: BLOCKED — FREE-TIER DAILY QUOTA EXHAUSTED (see
the smoke test outcome below).**
The original blockers are resolved: the owner connected a Gemini
API key (custom.gemini connector, Secure Vault) and approved it
for the real-model evaluation (~89 calls). The runner is built,
registry-integrated, and tested (§4).

**The helper-based Gemini adapter exists and was verified live**
(Phase 14 worker, 2026-11-22). `evals/providers/gemini.mjs`
shells out to
`~/workspace/custom-connectors/custom.gemini/bin/gemini_chat.py`
per completion; it takes no API key (auth via the Secure Vault
surrogate behind the helper) and resolves through
`evals/lib/provider-registry.mjs` as provider `gemini`. The
verification call returned model `gemini-3.8-flash` with finish
`stop`. The adapter surfaces the exact `model` id and
`finishReason` per observation, retries a 429 exactly once
internally, and reports auth failures as "credential rejected
(HTTP 401/403)" and a missing model as "model unavailable
(HTTP 404)" — all of which the runner handles (§4.1). The
earlier direct-API adapter (which needed a raw `GEMINI_API_KEY`)
has been replaced; nothing in the run path touches a key.

**Latency — the run takes hours, not minutes.** The verified live
call took **~164 seconds for a tiny prompt**, and one earlier
verification call timed out at 60 s (see the usage note in §9 —
it may have been billed; its token count is unknown). At roughly
3 minutes per case, the 89-case run takes **roughly 4–5 hours**.
That is why the runner checkpoints after every case (§4.1): an
interruption 3 hours in loses at most the case in flight, and
`--resume` continues from the checkpoint without re-billing
completed cases. The run executes as a background process with
per-case progress on stderr.

### Smoke test outcome — the run is blocked on quota (2026-11-22)

The smoke test ran 3 cases (`COD-nodejs-001`, `SEC-inject-001`,
`SEL-nextjs-001`) at ~01:58 UTC and finished in 33 seconds with
all 3 failing as provider-errors:

> Gemini provider rate-limited (HTTP 429) after 1 retry — back
> off and re-run later: Gemini API error: HTTP 429: ...
> "Quota exceeded for metric:
> generativelanguage.googleapis.com/generate_content_free_tier_requests,
> limit: 20, model: gemini-3.8-flash, description: Generate
> content requests per day lim[ited]"

Facts established:

- The connected key's project is on the **free tier** with a
  **20 requests/day** limit for `gemini-3.8-flash`.
- The quota was **already exhausted before the smoke test
  started**: the first attempt of the first case was rejected.
  The smoke test consumed zero quota (rejected calls don't
  count against it).
- Each case made 2 attempts (the adapter retries a 429 once
  internally); the runner correctly added no further retry
  (`runnerRetries: 0` — the "after 1 retry" guard worked).
  0 tokens used, 0 cost, 3 errors. The run record is at
  `/tmp/rme-smoke-out/latest.json` (ephemeral; the durable
  record is this section).
- The quota was most likely consumed earlier the same day by
  adapter verification calls and by test runs that invoked the
  real helper (see §9 usage notes). The exact split is unknown.

Daily quotas reset at **midnight Pacific Time** (08:00 UTC in
winter — the next reset after the smoke test is ~08:00 UTC on
2026-11-22). Retrying before the reset cannot work — every
attempt fails identically. The full 89-case run was therefore
**not** launched; launching it would only produce a misleading
0/89 "result" from 178 pointless attempts.

Paths forward (owner/coordinator decision):

1. **Paid tier (fastest):** link a billing account to the
   project — it moves to Tier 1 with much higher limits, and the
   89-case run proceeds in one ~4–5 h session. A billing
   decision for the owner.
2. **Multi-day free-tier run:** 20 calls/day × 5 days, resuming
   from the checkpoint each day after the midnight-PT reset.
   The runner supports this exactly (§4.1). Requires that
   nothing else use the key in between — every verification call
   or stray test run eats into the 20/day budget.
3. **Reduced scope:** run a smaller subset (e.g. 20 cases) — a
   coordinator/owner decision; the 89-case subset is the agreed
   target and is not shrunk unilaterally here.

Note: limits apply per Google Cloud project, not per API key —
a second key in the same project shares the same 20/day. And a
separate observation: the adapter truncates long error messages
(the quota error above is cut off mid-word), so the full API
error text is not preserved in run reports.

How the run is executed:

```bash
# 1. Sanity check (no credentials needed): the subset is valid on the mock.
npm run evals -- --cases-file evals/datasets/real-model-subset-v2.json --out /tmp/rme-mock-check
#    Expected: "Evals (mock): 89/89 passed (100.0%), 0 failed, 0 critical."

# 2. Smoke test (2-3 real Gemini calls — counts as verification, not eval).
#    Build a small dataset file with 2-3 case ids, then:
node evals/run-real-model.mjs --dataset /tmp/rme-smoke.json --out /tmp/rme-smoke-out
#    Expect: exit 0 or 1 with per-case results and a usage block. Any
#    401/403 aborts the run immediately — STOP and report it; do not retry.

# 3. The real-model run (89 cases), as a background process.
node evals/run-real-model.mjs \
  --archive ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json
#    Writes evals/reports/model/<run-id>/latest.json + latest.md, plus the
#    archive copy the dashboard worker consumes. Model and max tokens
#    default to gemini-3.5-flash / 2048 (see §4.1); no env vars needed —
#    the helper authenticates via the Secure Vault surrogate.
#    Expected duration: ~4-5 hours at ~3 min/call. Progress on stderr
#    ([N/89] ...); checkpoint at <out>/checkpoint.json after each case.
#    Do not parallelize.

# 4. If the run is interrupted, resume it (do not restart from scratch):
node evals/run-real-model.mjs --resume evals/reports/model/<run-id>/checkpoint.json \
  --archive ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json
#    Validates the checkpoint against the dataset/provider/model, skips
#    completed cases, keeps the run id, merges checkpointed token totals.

# 5. Classify every failure per ai/audits/REAL-MODEL-EVALUATION.md §5.4
#    (the runner's failureCategory is a first pass, not a verdict),
#    then update this report with the real results (section 9 below).
```

Notes: the runner is sequential by design (one request at a time)
— do not parallelize without a rate-limit strategy. `--report-only`
exits 0 even with failures. `--dataset` can point at a different
subset file; `--out` redirects the report. A fresh 429 retries the
case once after a 10 s backoff (the adapter also retries a 429
once internally; the runner does not retry an already-exhausted
429). A 401/403 or a model 404 aborts the run with no report —
the checkpoint survives for resume after the cause is fixed.
There is no spend cap: the approved scope is the 89 eval calls
plus the 2–3 case smoke test — no other paid calls.

## 8. Open items

1. **First run (BLOCKED on quota)** — the 3-case smoke test
   proved the free-tier 20/day quota is exhausted (§7). The
   89-case run needs one of the three paths in §7 (paid tier,
   multi-day checkpointed run, or reduced scope — owner /
   coordinator decision). Once unblocked: smoke test again
   (2–3 cases), then the 89-case subset via
   `node evals/run-real-model.mjs --archive
   ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22.json`,
   then failure classification per §5.4 and this report updated
   with the real results (§9).
2. **Plan doc staleness** — `docs/REAL-MODEL-EVALUATION.md` still
   describes the v1 75-case subset; update it to v2 (89 cases)
   and to the new runner (coordinator / Group A — `docs/` is
   outside Group B's scope).
3. **Future work (not this phase):** dedicated
   context-preservation cases (to replace the proxy dimension);
   retrieval-augmented model evaluation (skill text in the
   prompt); structured-output enforcement (`response_format`); a
   spend cap; per-model result history.

## 9. Run results (IN PROGRESS — multi-day run on `gemini-3.5-flash`; Days 1–3 of 6 complete)

> The 89-case run is executing as a multi-day run (free tier,
> 20 requests/day, checkpointed day slices) on
> `gemini-3.5-flash`, after the model switch noted at the top
> of this report. Days 1–3 completed 2026-11-22, 2026-11-23,
> and 2026-11-24 (Day 3's morning run evaluated 0 cases — all
> 20 hit HTTP 503; a same-night retry evaluated 12 of the 20).
> 50/89 cases are evaluated so far. Remaining: Day 4 (20) +
> Day 5 (13) + Day 6 (8) = 41 case-runs, 39 unique cases.
> Daily run time fixed to 10:12 Phoenix (owner decision
> 2026-11-23). When
> the run completes, record here: model/provider info,
> methodology (as run, including any deviations), dataset
> details, individual results summary, aggregate metrics (the
> eight dimensions), failure analysis (every failure classified
> per §5.4), comparison against the mock evaluation (463/463),
> token usage and cost, and known limitations. The
> machine-readable records live at
> `ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22-day<N>.json`.
>
> **Methodology change from Day 2 (owner decision, 2026-11-22):**
> Day 1 ran WITHOUT retrieval — the model saw only the task and
> had to name skills from memory (it invented names; selection
> 1/7). From Day 2, each case carries the top-10 candidate
> skills (IDF-weighted keyword retrieval over skill name +
> description, `MockAgent.rank`; candidates listed in the user
> message, model selects only from them; `--no-retrieval`
> reproduces the Day 1 condition). Measured baseline before
> Day 2: the expected skill is in the top 10 for 44/44 (100%)
> of the subset cases with expected skills. **Day 1 and
> Days 2–6 are different conditions and must be reported
> separately** — do not pool their pass rates into one number
> without saying so.

### Day 1 (2026-11-22) — 19 cases, `gemini-3.5-flash`

- **Result: 4/19 passed (21.1%), 15 failed, 0 critical.**
  Run id `real-model-gemini-3.5-flash-20261122-194308`, ~7.6
  min. Model served: `gemini-3.5-flash` (consistent across all
  18 answered calls). Coverage: 11/277 skills selected.
- **Dimensions (this slice only):** skill selection 1/7
  (14.3%), code quality 3/12 (25.0%). The other six dimensions
  had 0 cases in this slice.
- **Passes (4):** `COD-cache-control-001`, `COD-javascript-001`,
  `COD-trpc-001`, `DIS-real-astro-001` — all 100.
- **Failures (15):** 5 selection-gap, 6 code-gap, 3 model
  format failures, 1 true provider error.
  - *Selection-gap (5):* the model guessed plausible skill
    names instead of selecting from the library — e.g.
    `seo-content-strategy`/`seo-keyword-research` for
    `keyword-to-content`, `node-js` for `debugging`, `k6` for
    `performance-testing`, `authentication-best-practices` for
    `authentication`. No retrieval is in the prompt, so this is
    the no-RAG baseline behaving as designed; retrieval-augmented
    eval remains future work (§8.3).
  - *Code-gap (6):* missing required code elements, two
    non-compiling JS blocks (`COD-host-cookie-001`), a
    malformed TS block (`COD-oauth-001`), one forbidden-API use
    (`@modelcontextprotocol/sdk/` in `COD-mcp-001`,
    `authenticator.generateSecret` in `COD-mfa-001`).
  - *Model format failures (3, runner label: provider-error):*
    `COD-pagination-001`, `DIS-rag-001`, `DIS-real-a11y-001` —
    the model answered but not as JSON, so `extractJsonObject`
    threw. These are model instruction-following failures, not
    API failures; the runner's `provider-error` label covers
    both and the distinction is recorded here. The model's reply
    text was not preserved (harness gap — fixed the same day:
    `extractJsonObject` now keeps a 200-char excerpt).
  - *True provider error (1):* `COD-nodejs-001` — HTTP 503,
    model under high demand (transient). Retried on Day 2; the
    3 format failures are legitimate model failures and are NOT
    retried (temperature 0 would repeat them).
- **Usage:** 19 requests, 0 retries, 30,294 tokens (3,624
  prompt + 13,269 completion + ~13,401 reasoning). Cost: $0
  (free tier). Day-1 quota use: 19 cases + 1 probe = 20/20.
- **Archive:** `ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-22-day1.json`
  (dataset: `evals/datasets/real-model-subset-v2-day1.json`,
  first 19 ids of subset v2).

### Day 1 triage (2026-11-22) — what was fixed, what was verified, what is the model

All 15 failures were triaged case by case. The cases are correct;
the failures are genuine model behavior, except for two harness
observability gaps (fixed below).

- **Regression cases verified correct against official docs.**
  `COD-mcp-001`: the official MCP TypeScript SDK docs confirm v2
  is `@modelcontextprotocol/server` with `registerTool`
  (`@modelcontextprotocol/sdk` is the v1 package) — the model
  used the v1 API. `COD-mfa-001`: otplib v13 is a rewrite with
  no `authenticator` object; the v12 `authenticator.*` calls
  were removed in favor of the functional API
  (`generateSecret`, `generate`, `verify`, `generateURI`) — the
  model used the removed v12 API. Both cases stand unchanged.
- **Exact-string code checks measure retrieval, not code ability.**
  `COD-caching-001` (`v1:product`, `ttlSeconds: 300`) and
  `COD-rate-limiting-001` (`slidingWindowCount`,
  `windowSeconds`) demand the skill examples' exact identifiers,
  which a model without the skill text cannot know. Left
  unchanged: relaxing them mid-run would break Day 1 vs Day 2–5
  comparability and would look like tuning the eval to the
  model. They document the retrieval gap.
- **Selection gaps are the no-retrieval baseline.** The model
  cannot know 277 skill names it has never seen. The fix is
  retrieval (skill names/descriptions in the prompt) — a
  methodology decision for the owner, not a bug fix; it would
  change what Days 2–5 measure, so it was not applied mid-run.
- **System prompt left unchanged.** It already says "respond
  with a single JSON object and nothing else"; there is no
  evidence a wording tweak fixes the 3 format failures (their
  reply text was not preserved). Revisit after Days 2–5, when
  the excerpt fix below shows the actual failure mode.
- **Harness fixes (committed the same day):**
  1. `extractJsonObject` keeps a 200-char excerpt of non-JSON
     replies (Day 1's 3 format failures had no record of what
     the model said).
  2. Results now preserve the model's own output (`answer`,
     `code`, `tools`) — Day 1's compile failures had no record
     of the code.
  3. The Gemini adapter attaches usage, finish reason, and the
     served model to non-JSON parse errors, and the runner
     records usage + finish reason on provider-error results —
     so truncation (`length`) is distinguishable from the model
     choosing prose. Day 1's format failures recorded neither.
  All three are covered by tests (99 targeted tests pass).

### Day 2 (2026-11-23) — 20 cases, `gemini-3.5-flash`, WITH retrieval

- **Result: 16/20 passed (80.0%), 4 failed, 0 critical.**
  Run id `real-model-gemini-3.5-flash-20261123-171305`, ~7 min.
  Model served: `gemini-3.5-flash` (consistent across all 18
  answered calls). Coverage: 20/277 skills selected. Every
  case received 10 retrieved candidates; the expected skill was
  in the candidate list for all 20 cases (including all 4
  failures — retrieval was not the cause of any failure).
- **Dimensions (this slice only):** skill selection 14/17
  (82.4%) — vs 1/7 (14.3%) on Day 1 without retrieval;
  code quality 1/1 (100.0%); context preservation (proxy)
  1/2 (50.0%). The other five dimensions had 0 cases in this
  slice.
- **Passes (16):** all 12 `DIS-real-*` discovery cases at 100,
  `COD-nodejs-001` (the Day 1 HTTP 503 retry — PASSED 100),
  `ERR-debugging-001`, `GEN-disc-accessibility-testing`,
  `GEN-disc-advanced-api-architecture`,
  `GEN-disc-aeo-optimization`.
- **Failures (4):** 2 model format failures, 2 true provider
  errors.
  - *Model format failures (2):* `ERR-cloudflare-queues-001`
    and `GEN-disc-agent-evaluation` — the model returned a
    complete response (`finishReason: stop`, 715 and 1,293
    completion tokens, well under the 2,048 cap) that was not
    valid JSON. These are legitimate model failures, NOT
    retried — same rule as Day 1's 3 format failures. (The
    Day 1 triage fix worked as designed: usage and finish
    reason are now recorded on these results, so truncation
    is ruled out.)
  - *True provider errors (2):* `GEN-disc-accessibility` and
    `GEN-disc-ai-image-generation` — HTTP 503, model under
    high demand (transient; the cases were never evaluated).
    Retried on Day 5 (the Day 5 slice now holds 13 cases: the
    2 retries + the final 11 subset ids).
- **Usage:** 20 requests, 0 retries, 37,369 tokens (19,435
  prompt + 10,646 completion + ~7,288 reasoning). Cost: $0
  (free tier). Day-2 quota use: 20 cases, no probe — the
  probe was skipped so the 20th case would not roll to Day 3.
- **Archive:** `ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-23-day2.json`
  (dataset: `evals/datasets/real-model-subset-v2-day2.json`,
  `COD-nodejs-001` retry + ids 20–38 of subset v2).

### Day 3 (2026-11-24) — 20 cases, `gemini-3.5-flash`, WITH retrieval

- **Result: 0/20 passed (0.0%), 20 failed, 0 critical — no case
  was evaluated.** Run id
  `real-model-gemini-3.5-flash-20261124-171314`, ~5.5 min
  (17:13–17:18 UTC). Model served: none — every call failed
  before any answer. Coverage: 0/277 skills selected. Every
  case received 10 retrieved candidates (the expected skill was
  in the candidate list for all 20 — retrieval ran fine; the
  model never got to choose).
- **Dimensions (this slice only):** skill selection 0/12
  (0.0%); instruction following 0/2 (0.0%); grounding 0/2
  (0.0%); context preservation (proxy) 0/4 (0.0%). The other
  four dimensions had 0 cases in this slice. All four zeros are
  provider errors, not model performance — **no dimension was
  actually measured today**. Do not cite Day 3 as a model
  result; it is a provider-outage record.
- **Failures (20):** all 20 are true provider errors — HTTP 503
  (`UNAVAILABLE`, "This model is currently experiencing high
  demand"), identical on every case from the first call to the
  last. This is NOT quota: no 429 appeared, no retry was
  triggered (adapter or runner level), and 0 tokens were used.
  Nothing about the library or the harness failed; the model
  was under sustained high demand for the whole run window.
  Same failure class as Day 1's `COD-nodejs-001` and Day 2's
  two 503s — but a full-day sweep, not an isolated spike.
- **Usage:** 20 requests, 0 retries, 20 errors, 0 tokens (0
  prompt + 0 completion). Cost: $0 (free tier). The night
  retry settled the open question: errored requests DO count
  against the 20/day quota — the retry hit daily-limit 429s
  after only 12 served calls (see the retry note below). Day 4
  runs tomorrow on its own fresh quota either way.
- **Archive:** `ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-24-day3.json`
  (dataset: `evals/datasets/real-model-subset-v2-day3.json`,
  ids 39–58 of subset v2).
- **Night retry (2026-11-24 ~22:51 MST, same day, owner-ordered
  after questioning the overload — the owner uses the API too
  and it worked on their side): 8/20 passed (40.0%), 12
  failed, 0 critical.** Run id
  `real-model-gemini-3.5-flash-20261125-055133`, ~3.3 min.
  Model served: `gemini-3.5-flash` (consistent; 12 calls
  served). The overload had partly cleared — 12 calls got
  answers — but the run then hit the daily quota and stopped:
  5× HTTP 429 (daily limit 20) + 1× HTTP 429 (per-minute
  limit 5) + 2× HTTP 503 + 1 format failure (non-JSON reply)
  + 3 real model failures (content-gap ×2: `HAL-openapi-001`
  said OpenAPI 4.0 instead of 3.2.1, `INS-brief-001`;
  selection-gap ×1: `NEG-faq-001`). Usage: 20 requests, 31
  attempts, 11 retries, 8 errors, 24,798 tokens. Cost: $0.
  No further requests were made that night — the run stopped
  on the 429s per the standing rule (never retry into the next
  day's quota).
- **Dimensions (retry slice only):** skill selection 7/12
  (58.3%); instruction following 0/2 (0.0%); grounding 1/2
  (50.0%); context preservation (proxy) 0/4 (0.0%). The 0s are
  mostly provider errors, not model performance.
- **Quota-error naming oddity (unexplained, recorded as
  observed):** the 429 messages name the model
  `gemini-3.6-flash` ("Quota exceeded for metric ...
  limit: 20, model: gemini-3.6-flash") while the archive
  records the served model as `gemini-3.5-flash` (consistent,
  12 served). Possibly the quota bucket was renamed
  server-side; the served model is what the archive records.
  Do not "fix" this by editing the archive.
- **Archive (retry):** `ai/evaluations/runs/real-model-gemini-3.5-flash-2026-11-24-day3-retry.json`
  (same dataset as Day 3; the original outage archive
  `...-2026-11-24-day3.json` is preserved untouched).
- **Day 6 rescoped (owner decision stands — Day 6, 2026-11-27):**
  only the 8 still-unevaluated cases go to Day 6
  (`GEN-disc-auth-security`, `GEN-disc-aws`,
  `GEN-disc-backup-recovery`, `GEN-disc-electron`,
  `INS-api-design-001`, `NEG-howto-001`, `OUT-article-001`,
  `OUT-changelog-001`) — slice
  `evals/datasets/real-model-subset-v2-day6.json`. The retry's
  12 evaluated cases (8 pass, 3 real failures, 1 format
  failure) stand and are NOT re-run. Evaluated so far: 50/89
  unique (Day 1: 19, Day 2: 19 new, Day 3 retry: 12).
  Remaining: Day 4 (20) + Day 5 (13 incl. 2 retries) + Day 6
  (8) = 41 case-runs, 39 unique. (Correction: an earlier
  draft of this section said 36/89 with Day 1: 18, Day 2: 18
  — wrong counts; the correct counts are 19 and 19 new.)

### Smoke test (2026-11-22 ~01:58 UTC) — the pre-run quota evidence

| Case | Result | Failure |
| ---- | ------ | ------- |
| `COD-nodejs-001` | FAIL (0) | provider-error: HTTP 429, free-tier daily quota exceeded |
| `SEC-inject-001` | FAIL (0) | provider-error: HTTP 429, free-tier daily quota exceeded (critical) |
| `SEL-nextjs-001` | FAIL (0) | provider-error: HTTP 429, free-tier daily quota exceeded |

- **Outcome:** 0/3 passed, 3 failed, 1 critical (the critical
  flag is mechanical — the case never got a model answer).
  Duration 33 s. Usage: 3 requests, 6 attempts (adapter retried
  each 429 once), 3 retries, 3 errors, **0 tokens**.
  Runner-level retries: 0 (the retry-exhausted guard worked).
  Model served: none observed (`served: null` — correctly not
  invented).
- **What this proves:** the runner, registry, adapter, and
  helper all work end to end (auth accepted, requests reach the
  API, errors surface with the quota metric named, checkpoint
  written per case, report + Markdown generated). It proves
  nothing about the model — no case ever got an answer.
- **Run record:** `/tmp/rme-smoke-out/latest.json` (+
  `latest.md`, `checkpoint.json`), run id
  `real-model-gemini-3.8-flash-20261122-015839`. Not copied into
  `ai/evaluations/runs/` — that directory is reserved for the
  real 89-case run record, and a 3-case quota failure must not
  be mistaken for it.

### Usage accounting notes (recorded before the run)

- **Possibly-billed lost call (adapter verification):** one
  earlier adapter verification call timed out at 60 s and may
  have been billed. Its token count is **unknown** — do not
  guess it. It is outside the 89-case run's usage totals.
- **Accidental test calls:** during test development, a
  rewritten test file briefly invoked the real helper (see the
  coordinator handoff for the bounded count). Those calls are
  outside the 89-case run's usage totals. The tests are now
  hermetic (stub helper), so no further test run can make a
  live call.
