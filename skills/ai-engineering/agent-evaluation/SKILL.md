---
name: agent-evaluation
description: >
  Evaluate LLM applications and AI agents systematically: evaluation
  datasets and golden sets, task-based evals, LLM-as-judge grading (and
  its limits), hallucination and faithfulness testing, regression evals,
  metrics (task pass rate, tool-use accuracy, latency, cost), eval
  harnesses, CI integration, and human review sampling. Use when measuring
  whether a model, prompt, RAG pipeline, or agent actually works, before
  shipping it and on every change after.
license: MIT
metadata:
  version: "1.0.0"
  category: ai-engineering
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Agent Evaluation

## Purpose

This skill covers evaluating LLM applications and agents: building
datasets of representative tasks, grading outputs with code and
with model judges, testing for hallucinations, running regression
evals on every change, and wiring the whole thing into CI with
human review where automation cannot judge. The outcome is a
number — and a set of inspected failures — that tells you whether
a prompt, model, or pipeline change made things better or worse,
before your users find out.

## When to Use

- Before shipping an LLM feature, RAG pipeline, or agent.
- After any change to a prompt, model, tool, retrieval pipeline,
  or agent architecture.
- Comparing two models, prompts, or approaches on the same tasks.
- Investigating quality complaints: wrong answers, hallucinations,
  or failed tasks in production.
- Setting up continuous evaluation in CI or as a scheduled job.
- Deciding what to measure and what "good enough" means for an AI
  feature.

## When Not to Use

- Testing deterministic code with known outputs — use
  `unit-testing`, `integration-testing`, and `regression-testing`.
  Evals are for non-deterministic systems where "correct" is
  judged, not computed.
- Debugging a single failure in development — use `debugging`
  first, then add the case to the eval set.
- Evaluating a model in the abstract — evals measure your system
  on your tasks, not a model's leaderboard position.

## Prerequisites

- A working system to evaluate (LLM feature, RAG pipeline, or
  agent) with a stable interface for running it offline.
- Representative tasks: real user requests, anonymized, with
  known-good answers or clear success criteria.
- A grading approach per eval: deterministic checks where
  possible, model judges where judgment is needed, humans where
  only humans can tell.
- A baseline: run the evals once before the change you want to
  measure, so the comparison is meaningful.
- A budget: evals cost model calls. Know the cost per full run
  and who pays for it.

## Official Documentation

- [OpenAI API: evals](https://developers.openai.com/api/docs/guides/evals)
  — OpenAI's evals guide (datasets, graders, runs). Note: OpenAI
  is deprecating the Evals platform — read-only for existing users
  2026-10-31, shutdown 2026-11-30. Do not build new long-term
  evaluation infrastructure on it; OpenAI points new users to
  Datasets instead.
- [LangSmith documentation](https://docs.smith.langchain.com/)
  — tracing, datasets, online evaluations, and annotation queues
  for LLM applications across providers and frameworks.
- [LangChain agents documentation](https://docs.langchain.com/oss/python/langchain/agents)
  — the agent harness whose runs you will trace and evaluate.
- [LlamaIndex documentation](https://docs.llamaindex.ai/en/stable/)
  — RAG and agent frameworks with evaluation hooks.
- [OWASP GenAI Security Project](https://genai.owasp.org/) — for
  the security-flavored eval cases (prompt injection,
  misinformation) your suite should include.

## Required Workflow

1. Define what "good" means for the system: task success, answer
   quality, safety, latency, and cost. Write the success criteria
   before building the dataset.
2. Build the evaluation dataset: real tasks sampled from
   production traffic (anonymized) plus hand-written edge cases.
   Cover the happy path, ambiguity, missing information,
   adversarial inputs, and requests the system should refuse.
   Version the dataset; never evaluate on the same cases you
   tuned prompts against without a held-out split.
3. Split the dataset: a development set for iterating and a
   held-out set for the final verdict. Tuning on the test set
   produces eval scores that lie.
4. Choose graders per eval: deterministic checks first (exact
   match, schema validity, citation resolution, tool-call
   correctness), model judges for qualities code cannot check
   (relevance, helpfulness, faithfulness), and human review for
   the rest.
5. Build the harness: run each case through the system, grade the
   output, record the metrics and the raw traces. Keep the harness
   small and in the repository — a script that runs cases and
   reports scores beats a platform you do not control.
6. Establish the baseline: run the full suite against the current
   system and record the scores. Every later comparison is
   against this baseline.
7. Run evals on every change: prompt, model, tool, retrieval, or
   architecture. A change that drops a metric below its threshold
   does not ship until the drop is explained.
8. Inspect failures by hand: read the failing cases, classify
   them (retrieval miss, reasoning error, tool misuse, bad
   grading), and fix the system or the eval — whichever is wrong.
9. Sample production traffic for human review on an ongoing
   schedule, and feed confirmed failures back into the dataset.
10. Report: scores per metric, change from baseline, failing
    cases with traces, and the human-review findings. An eval
    run without a report is a run nobody acts on.

## Implementation Standards

- Evaluation datasets: cases are versioned files (JSONL or
  equivalent) with an id, input, expected output or success
  criteria, and metadata (source, category, difficulty). Datasets
  live in version control alongside the code they evaluate.
  Production-derived cases are anonymized; secrets and PII are
  removed before a case enters the dataset.
- Task-based evals: grade the outcome, not the transcript. A
  task passes when the end state is correct (the right answer,
  the right tool called with the right arguments, the right file
  changed) — not when the agent's reasoning looked good. Where
  the end state is hard to check mechanically, define a rubric
  and grade against it.
- LLM-as-judge: use a judge model with a written rubric, a
  defined output format (structured output), and a fixed
  temperature. Calibrate the judge against human labels on a
  sample before trusting it, and re-calibrate when the judge
  model or rubric changes. Know the limits: judges prefer
  longer answers, prefer their own model's style, are sensitive
  to the order of options, and are non-deterministic. Mitigate
  by grading blind (no model identity), randomizing option
  order, using a judge from a different model family than the
  system under test where possible, and treating judge scores
  as signals, not ground truth. Never let the system under test
  grade itself as the only judge.
- Hallucination testing: include cases where the correct answer
  is "I don't know" (questions about facts not in the corpus, or
  about events after the cutoff), and grade whether the system
  abstains instead of inventing. For RAG, verify every cited
  claim against the cited chunk: a citation that does not
  support the claim is a failure. Adversarial cases (loaded
  questions, false premises, contradictory documents) belong in
  the suite.
- Regression evals: a fixed suite runs on every change to
  prompts, models, tools, or retrieval. Thresholds are set per
  metric from the baseline; a drop beyond the threshold blocks
  the change. Small suites are noisy — report confidence along
  with the score, and do not treat a one-case swing as a
  regression.
- Metrics: report task pass rate (primary), tool-use accuracy
  (right tool, right arguments), retrieval metrics for RAG
  (whether the needed chunk was retrieved; whether the answer
  stayed faithful to it), latency (median and p95 per task),
  cost per task (tokens and currency), and refusal correctness
  (refused when it should, answered when it should). Track
  metrics per category, not just in aggregate — a rising average
  can hide a collapsing category.
- Eval harnesses: prefer a small in-repository harness (a runner,
  graders, and a reporter) over a hosted platform for the core
  regression suite, so evals run in CI without external
  dependencies beyond the model APIs. Hosted platforms
  (LangSmith and similar) complement it with tracing, datasets,
  and annotation queues. Avoid building on a platform that is
  being retired — see the OpenAI Evals deprecation note above.
- CI integration: a fast smoke subset runs on every pull request
  (minutes, not hours); the full suite runs nightly or on
  release. Eval jobs need model API keys as CI secrets, a cost
  cap per run, and flaky-eval handling (retry once, then report
  as flaky rather than failing the build on noise). Results are
  stored as build artifacts with traces. See `ci-cd` and
  `github-actions`.
- Human review sampling: sample production traffic on a schedule
  (a fixed number of runs per week, stratified by category and
  including failures and low-confidence outputs). Reviewers use
  the same rubric as the judges; disagreement between humans and
  judges is itself a signal to fix the rubric or the judge.
  Confirmed failures become new eval cases.

## Best Practices

- Grade with code whenever you can: exact matches, schema checks,
  tool-call comparisons, and citation resolution are cheap,
  deterministic, and fast. Reserve model judges for what code
  cannot check.
- Keep evals fast enough to run often. A suite nobody runs is
  worse than a small suite that runs on every change.
- Write the rubric before looking at outputs. Grading criteria
  written after seeing the results will favor the results you
  saw.
- Measure cost and latency alongside quality. A change that
  improves quality 2% while tripling cost is not obviously a win.
- Track eval scores over time. A slow drift downward is as
  important as a sudden drop — it usually means the data or the
  users changed.
- Include safety cases: prompt-injection attempts, requests for
  disallowed content, and requests that should be refused. A
  quality eval without safety cases is incomplete.
- Treat the eval suite as a product: review it, prune stale
  cases, add cases from production failures, and retire cases
  that no longer discriminate.

## Security Considerations

- Eval datasets are sensitive: they contain real user requests.
  Anonymize, remove secrets and PII, restrict access, and never
  publish a production-derived dataset.
- Eval runs call model APIs with production-like data. Use the
  same data-handling rules as production (see `llm-integration`):
  check provider retention terms and redact where possible.
- Adversarial eval cases (injection payloads, jailbreak attempts)
  are attack artifacts: keep them in a restricted part of the
  repository, and do not include working exploits in public
  documentation.
- Judge prompts can themselves be attacked by the output under
  test (a model output containing instructions to the judge).
  Delimit the output being graded, and never let graded content
  change the judge's rubric or permissions.
- CI secrets for eval jobs follow the same rules as any secret
  (see `secrets-management`): scoped, rotated, and never printed
  in logs.

## Performance Considerations

- Eval cost is dominated by model calls: the system under test
  plus the judge. Budget per run, cap concurrency, and use the
  smallest judge model that correlates with human labels.
- Run independent cases in parallel with a bounded worker pool;
  respect provider rate limits.
- Cache deterministic grading results per (case version, output
  hash) so re-runs of unchanged cases are free.
- Keep the smoke subset small (tens of cases) so PR checks stay
  fast; the full suite (hundreds of cases) runs on a schedule.

## Common Mistakes

- Tuning on the test set — the scores look great and mean nothing.
  Hold out a set you do not tune against.
- One aggregate score — it hides category regressions. Report per
  category.
- Letting the system grade itself — a model judging its own
  output is biased. Use a different judge, and calibrate against
  humans.
- Evals that never run — a suite too slow or too expensive to run
  is documentation, not a safety net. Shrink it until it runs.
- Grading the transcript instead of the outcome — a confident,
  well-reasoned wrong answer still fails the task.
- Ignoring cost and latency — quality without a budget is not a
  shipping decision.
- Treating a one-case swing as a regression — small suites are
  noisy. Report uncertainty and look at trends.
- No human review — automated metrics miss tone, usefulness, and
  subtle wrongness. Sample and read real outputs.

## Examples

An eval case file (JSONL, one case per line) for a RAG assistant:

```json
{"id": "refunds-001", "category": "refunds", "input": "How long do refunds take?", "expected_contains": ["14 days"], "must_cite": true}
{"id": "unknown-001", "category": "abstention", "input": "What is the refund policy for lunar hotels?", "expected_behavior": "abstain"}
```

A minimal harness sketch (Python): run each case, grade with
deterministic checks, report the pass rate. Real harnesses add
judges, traces, and reporting — but this shape is enough to start:

```python
import json


def grade(case, answer, citations):
    if case.get("expected_behavior") == "abstain":
        return "don't know" in answer.lower()
    ok = all(s in answer for s in case.get("expected_contains", []))
    if case.get("must_cite"):
        ok = ok and len(citations) > 0
    return ok


def run_suite(cases_path, run_system):
    cases = [json.loads(line) for line in open(cases_path)]
    results = []
    for case in cases:
        answer, citations = run_system(case["input"])
        results.append(grade(case, answer, citations))
    passed = sum(results)
    print(f"{passed}/{len(results)} passed ({passed / len(results):.0%})")
    return passed / len(results)
```

## Validation Checklist

- [ ] Success criteria are written before the dataset is built.
- [ ] The dataset covers happy path, edge cases, adversarial
      inputs, and refusals, with a held-out split.
- [ ] Graders are deterministic where possible; judges have a
      written rubric and are calibrated against human labels.
- [ ] Hallucination and abstention cases exist and are graded.
- [ ] Baseline scores are recorded before the change under test.
- [ ] A smoke subset runs in CI on every change; the full suite
      runs on a schedule.
- [ ] Metrics include pass rate, tool-use accuracy, latency, and
      cost per task, reported per category.
- [ ] Failing cases are inspected by hand and classified.
- [ ] Human review sampling runs on a schedule and feeds the
      dataset.
- [ ] Eval data is anonymized and access-restricted; no secrets
      in datasets or logs.

## Expected Deliverables

- A versioned evaluation dataset with a held-out split.
- Graders (deterministic checks, judge rubrics) and a harness
  that runs them and reports scores.
- Baseline scores and per-category metrics with latency and cost.
- CI wiring: smoke subset on pull requests, full suite on a
  schedule.
- A human-review sampling process with a rubric and a feedback
  loop into the dataset.
- An eval report per run: scores, change from baseline, failing
  cases with traces.

## References

- [OpenAI API: evals](https://developers.openai.com/api/docs/guides/evals)
- [LangSmith documentation](https://docs.smith.langchain.com/)
- [LangChain agents documentation](https://docs.langchain.com/oss/python/langchain/agents)
- [LlamaIndex documentation](https://docs.llamaindex.ai/en/stable/)
- [OWASP GenAI Security Project](https://genai.owasp.org/)
- Related skills in this repository: `llm-integration`, `rag`,
  `ai-agents`, `mcp-security`, `unit-testing`,
  `integration-testing`, `regression-testing`, `ci-cd`,
  `github-actions`, `observability`.
