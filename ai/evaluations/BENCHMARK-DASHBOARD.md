# Benchmark Dashboard

The benchmark dashboard is a static report of SkillForge evaluation
results: mock-eval results rendered as what they are, and real-model
results shown as unavailable until a real-model run actually exists.

## The report

`ai/evaluations/benchmark/` holds the latest generated report:

| File | Contents |
| --- | --- |
| `index.html` | The dashboard — a single self-contained HTML file (inline CSS, no JavaScript, no framework, no database, no build step). Open it in any browser. |
| `summary.md` | The same content as Markdown. |
| `input.json` | The exact data the report was generated from, so the report is reproducible: the same inputs plus the same `--generated` timestamp produce byte-identical outputs. |

## What the dashboard presents

- **Evaluation runs** — provider and model, generation time, case
  totals, pass rate, critical failures, skill coverage, and token
  usage when the provider reported it.
- **Provider and model** — the exact provider name (`mock`, or
  `openai:gpt-5-mini` for a model run) and model id from the
  report's metadata.
- **Dataset version** — the full suite (463 cases from
  `evals/cases` + `datasets/discovery-generated.json`) and the
  real-model subset descriptor
  (`evals/datasets/real-model-subset-v2.json`: version 2, 89 cases).
- **Skill selection accuracy** — pass rate over the selection
  checks (`recall`, `precision`, `top-N`, `no-forbidden`).
- **Instruction-following score** — pass rate over all checks on
  cases in the `instruction-following` category.
- **Refusal accuracy** — pass rate over the refusal checks
  (`refused`, `not-refused`).
- **Grounding score** — pass rate over the `grounded-in:` checks.
- **Code quality score** — pass rate over the code checks
  (`code-*`, `fixture:`).
- **Regression indicators** — the baseline comparison
  (regressions, fixes, new and removed cases, with ids) plus the
  pass-rate trend against the previous baseline snapshot.
- **Evaluation history** — the baseline snapshots in
  `evals/baselines/` as a pass-rate trend table
  (`current.json` duplicates the dated snapshot it was copied from,
  so it is deduplicated).

Every metric's derivation is listed in its table row in the report
itself. Metrics are computed from the per-check data in the eval
reports, not from the category rollups.

## Mock vs real: the distinction that matters

The mock provider is a deterministic agent that evaluates the
**library** — discoverability, trigger discrimination, content
completeness, safety guidance — not an LLM's reasoning. The mock's
463/463 says the library is internally consistent and retrievable
by keyword overlap. It says nothing about whether a real model will
select the right skills, ground its answers in them, or refuse
unsafe requests.

The dashboard enforces the distinction:

- Mock results carry a **MOCK RESULTS** banner stating exactly what
  they do and do not measure.
- Real-model results are **UNAVAILABLE** until a real-model report
  exists (discovered as described below). The unavailable panel
  states the exact blocker: no real-model evaluation has ever run
  (a Gemini key is approved, but no run has been executed yet).
- Unavailable metrics are never shown as zero or estimated. A
  metric with no checks of its type in a run is UNAVAILABLE, never
  0: zero checks is not a zero score.
- Mock and real-model runs are never compared as regressions: they
  answer different questions. Baselines are mock-only.

## Data sources

| Input | Default path | Role |
| --- | --- | --- |
| Mock report | `evals/reports/latest.json` | Primary input; the report fails (exit 1) when it is missing or unreadable. |
| Real-model report | Discovered (see below) | Rendered when present; absent is the normal state and renders as unavailable. |
| Baselines | `evals/baselines/` | Evaluation history. A missing or empty directory is an empty history, not an error. |
| Real-model subset | `evals/datasets/real-model-subset-v2.json` | Dataset version line. A missing descriptor renders as "descriptor not found". |

All inputs are files the eval runner already produces; the
generator makes no network calls and needs no credentials.

### Real-model report discovery

When `--model` is not given, the generator discovers the newest
real-model report automatically, searching in this order of
layouts (newest by the report's own `generated` timestamp wins):

1. `evals/reports/model/latest.json` (single-file layout),
2. `evals/reports/model/<run-id>/latest.json` (the Phase 4
   runner's default layout; run-id like
   `real-model-gemini-3.8-flash-20261122-013000`),
3. `ai/evaluations/runs/real-model-*.json` (flat exported runs).

An explicit `--model <path>` wins over discovery. The report's
`input.json` records which file was actually used
(`sources.modelReport`). The generator accepts both report shapes:
the `run-evals.mjs` shape and the real-model runner's shape
(`kind: skillforge-real-model-eval`, top-level `byCategory` and
`model` block, no top-level `provider` field).

## How to regenerate

```bash
node scripts/generate-benchmark-report.mjs
```

This regenerates `ai/evaluations/benchmark/` from the current
inputs. Options:

```bash
node scripts/generate-benchmark-report.mjs \
  --mock evals/reports/latest.json \
  --model evals/reports/model/latest.json \
  --baselines evals/baselines \
  --subset evals/datasets/real-model-subset-v2.json \
  --out ai/evaluations/benchmark \
  --generated 2026-11-22T00:00:00.000Z
```

`--generated` overrides the report timestamp; with the same inputs
and the same `--generated` value, the outputs are byte-identical
(verified by `test/benchmark-report.test.mjs`).

Regenerate after any eval run whose results should be reflected in
the dashboard — after `npm run evals` (mock) and after any
real-model run. The dashboard is a snapshot, not a live view: it
shows the reports on disk at generation time. Re-running the
generator after the Phase 4 eval run picks up the real data
automatically through discovery (see above) — no flag changes
needed.

## Current state

The first report (generated 2026-11-22) shows the mock run from
2026-11-21T21:13:30Z: 463/463 passed, all five metrics at 100%
(selection 861/861 checks, instruction-following 33/33, refusal
463/463, grounding 86/86, code 53/53), 0 regressions against the
2026-11-21 baseline, coverage 277/277 skills. Every real-model
metric is UNAVAILABLE — no real-model run has happened yet. A
Gemini API key was connected and approved for the real-model eval
on 2026-11-21 (custom.gemini connector, Secure Vault) and the
Gemini adapter is verified live (see
`ai/evaluations/MULTI-MODEL-EVALUATION.md`); the 89-case run is
still pending with the Phase 4 worker.
