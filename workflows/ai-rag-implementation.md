# AI/RAG Implementation

Build a retrieval-augmented AI feature: ingest the knowledge base,
retrieve the right context, ground the model's answers, and evaluate
the result.

## Inputs

- The question the feature answers and who asks it.
- The knowledge base (docs, tickets, code) and its update cadence.
- Quality bar: what counts as a good answer, and what must never
  happen (hallucinated citations, leaked private content).

## Steps

1. **Define the behavior** (`rag`, `llm-integration`). Decide what
   the feature answers, what it refuses, and how it says it does not
   know. A RAG feature that always answers is a hallucination
   feature.
2. **Prepare the knowledge base** (`rag`). Ingest, clean, and chunk
   the source content. Decide the chunking strategy and what metadata
   each chunk carries; keep the source of every chunk.
3. **Choose the retrieval store** (`database-design`). Pick the
   vector store or search index that fits the scale; design the
   schema for chunks, embeddings, and metadata.
4. **Build retrieval.** Implement embedding, retrieval, and ranking.
   Measure retrieval quality on real questions before wiring up the
   model — bad retrieval cannot be fixed by a better prompt.
5. **Build generation** (`llm-integration`). Ground the model in the
   retrieved context with citations to the source chunks. Refuse or
   say "I don't know" when the context does not support an answer.
6. **Add guardrails** (`mcp-security` for tool-using features).
   Validate model output before it affects state or users; keep
   secrets out of prompts and logs.
7. **Evaluate** (`agent-evaluation`). Build a golden set of questions
   with expected answers and citations. Score retrieval and
   generation separately; track regressions as the knowledge base
   changes.
8. **Make it observable** (`observability`). Log questions,
   retrieved chunks, answers, and costs. Review failures regularly;
   the golden set grows from real failures.
9. **Verify before shipping** (`verification-before-completion`
   upstream). Check edge cases, adversarial inputs, and private
   content handling before calling the feature done.

## Outputs

- Working RAG feature with grounded, cited answers.
- Retrieval store with documented chunking and schema.
- Golden evaluation set with baseline scores.
- A note of model, cost, and latency characteristics.

## Checks

- [ ] Answers cite real source chunks; no invented citations.
- [ ] The feature says it does not know when the context is insufficient.
- [ ] Retrieval quality measured separately from generation quality.
- [ ] No secrets or private content in prompts, logs, or answers.
- [ ] Golden set exists and regressions are tracked.
- [ ] No invented capabilities, benchmarks, or evaluation scores.
