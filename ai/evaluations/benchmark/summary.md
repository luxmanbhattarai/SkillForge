# SkillForge Benchmark Dashboard

Generated 2026-11-22T01:48:11.429Z from evals/reports/latest.json (no real-model report found).

## Datasets

- **Full suite:** Full suite (evals/cases + datasets/discovery-generated.json) — 463 cases.
- **Real-model subset:** Real-model subset (evals/datasets/real-model-subset-v2.json) — version 2, 89 cases (generated 2026-11-21).

## Evaluation runs — mock

> **MOCK RESULTS.** This run used the deterministic mock agent: it measures the library (discoverability, content, trigger discrimination), not an LLM's reasoning. It says nothing about whether a real model will select the right skills, ground its answers in them, or refuse unsafe requests.

- Provider: mock; generated 2026-11-21T21:13:30.553Z.
- Cases: 463 total, 463 passed, 0 failed (pass rate 100.0%); critical failures: 0.
- Coverage: 277/277 skills selected (100.0%).

| Metric | Score | Passed/Total | Derivation |
| --- | --- | --- | --- |
| Skill selection accuracy | 100.0% | 861/861 | recall / precision / top-N / no-forbidden checks |
| Instruction-following score | 100.0% | 33/33 | all checks on instruction-following cases |
| Refusal accuracy | 100.0% | 463/463 | refused / not-refused checks |
| Grounding score | 100.0% | 86/86 | grounded-in checks |
| Code quality score | 100.0% | 53/53 | code-* and fixture checks |

### By category

| Category | Total | Passed | Failed | Critical | Pass rate |
| --- | --- | --- | --- | --- | --- |
| skill-discovery | 298 | 298 | 0 | 0 | 100.0% |
| skill-selection | 34 | 34 | 0 | 0 | 100.0% |
| trigger-accuracy | 11 | 11 | 0 | 0 | 100.0% |
| instruction-following | 7 | 7 | 0 | 0 | 100.0% |
| technical-correctness | 37 | 37 | 0 | 0 | 100.0% |
| code-generation | 12 | 12 | 0 | 0 | 100.0% |
| security-compliance | 25 | 25 | 0 | 0 | 100.0% |
| error-handling | 7 | 7 | 0 | 0 | 100.0% |
| negative-case-handling | 13 | 13 | 0 | 0 | 100.0% |
| hallucination-resistance | 6 | 6 | 0 | 0 | 100.0% |
| tool-use-correctness | 9 | 9 | 0 | 0 | 100.0% |
| output-quality | 4 | 4 | 0 | 0 | 100.0% |

## Regression indicators

Baseline comparison (baseline generated 2026-11-21T00:41:38.522Z): 0 regression(s), 0 fix(es), 0 new case(s), 0 removed case(s).

- Regressions: none
- Fixes: none
- New cases: none
- Removed cases: none

Pass rate unchanged vs the previous baseline (100.0% on 2026-11-20 → 100.0%; delta 0.0 percentage points).

## Evaluation history

| Date | Snapshot | Total | Passed | Critical | Pass rate |
| --- | --- | --- | --- | --- | --- |
| 2026-11-20 | baseline-2026-11-20.json | 449 | 449 | 0 | 100.0% |
| 2026-11-21 | baseline-2026-11-21.json | 463 | 463 | 0 | 100.0% |

## Real-model results

**UNAVAILABLE — no real-model evaluation has ever run.**

No real-model evaluation has ever run. A Gemini API key was connected and approved for the real-model evaluation (custom.gemini connector, Secure Vault), but no run has been executed yet. See docs/REAL-MODEL-EVALUATION.md.

| Metric | Score | Passed/Total | Derivation |
| --- | --- | --- | --- |
| Skill selection accuracy | UNAVAILABLE | — | recall / precision / top-N / no-forbidden checks |
| Instruction-following score | UNAVAILABLE | — | all checks on instruction-following cases |
| Refusal accuracy | UNAVAILABLE | — | refused / not-refused checks |
| Grounding score | UNAVAILABLE | — | grounded-in checks |
| Code quality score | UNAVAILABLE | — | code-* and fixture checks |

Unavailable metrics are never shown as zero or estimated. They will appear here once a real-model run exists (see docs/REAL-MODEL-EVALUATION.md).

## Methodology

- Metrics are computed from the per-check data in the eval reports, not from category rollups. Each metric's derivation is listed in its table row.
- The real-model runner also emits its own aggregate dimensions in its report, derived from case categories. The dashboard does not reuse them: it computes all metrics from per-check data the same way for mock and real-model runs, so the two sections stay comparable. Small differences between the dashboard's numbers and the runner's dimensions are expected — they measure related but different things.
- A metric with no checks of its type in a run is UNAVAILABLE, never zero: zero checks is not a zero score.
- Mock and real-model runs are never compared as regressions: they answer different questions. Baselines are mock-only.
- The model was asked to self-report its skill selection as JSON; content checks are substring matches; grounding checks verify the evaluated skill was among the selected skills. See the eval report's Limitations section for what the scores do and do not prove.

Regenerate: `node scripts/generate-benchmark-report.mjs` — see `ai/evaluations/BENCHMARK-DASHBOARD.md`. The exact input data for this report is in `input.json` next to this file.
