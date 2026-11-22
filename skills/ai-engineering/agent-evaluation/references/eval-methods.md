# Eval methods: datasets, task evals, LLM-as-judge, hallucination

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
