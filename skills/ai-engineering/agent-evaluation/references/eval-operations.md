# Eval operations: regression, metrics, harnesses, CI, human review

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
