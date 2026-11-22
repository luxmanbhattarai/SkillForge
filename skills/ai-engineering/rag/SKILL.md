---
name: rag
description: >
  Build Retrieval-Augmented Generation systems: document ingestion and
  chunking, embedding model selection, vector database selection (Pinecone,
  Weaviate, Qdrant, Chroma, pgvector), retrieval pipelines, reranking,
  hybrid search, context assembly with citations, grounding, and RAG
  evaluation (faithfulness, relevance). Use when a chatbot or assistant
  must answer from your own documents, knowledge base, or private data
  instead of the model's training knowledge.
license: MIT
metadata:
  version: "1.0.0"
  category: ai-engineering
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# RAG (Retrieval-Augmented Generation)

## Purpose

This skill covers building retrieval-augmented generation: turning
your documents into searchable chunks, embedding them, storing them
in a vector database, retrieving the relevant pieces for a question,
and generating a grounded, cited answer from them. The outcome is a
system that answers from your data, says when it does not know, and
can be measured for retrieval quality and answer faithfulness.

## When to Use

- Building a chatbot, assistant, or search feature over private or
  current documents (docs, wikis, tickets, contracts, manuals).
- Answering questions where the model's training knowledge is stale,
  wrong, or missing.
- Reducing hallucinations by grounding answers in retrievable
  sources with citations.
- Adding semantic search over a document collection.
- Diagnosing a RAG system that retrieves the wrong chunks or
  generates unsupported answers.

## When Not to Use

- The answer lives entirely in the model's general knowledge and
  does not need your data — a plain LLM call (`llm-integration`)
  is simpler and cheaper.
- The task is precise lookup over structured data (a database query,
  an API call) — retrieve with code, not embeddings.
- The corpus is tiny and stable enough to paste into the prompt —
  put it in context directly until that stops working.
- The system must take multi-step actions, not just answer — use
  `ai-agents` (RAG can be one of its tools).

## Prerequisites

- A defined corpus: which documents, who owns them, how often they
  change, and who is allowed to read each one.
- An embedding model choice and a vector store (see Implementation
  Standards for selection criteria).
- An LLM integration for the generation step (see
  `llm-integration`).
- A small set of real example questions with known-good answers, to
  evaluate against from the start (see `agent-evaluation`).
- Conceptual skill; version range: none — applies to the
  current vector stores, embedding APIs, and frameworks; check the
  release notes for the store and framework you choose (linked in
  Official Documentation) before pinning versions.

## Official Documentation

- [LlamaIndex documentation](https://docs.llamaindex.ai/en/stable/)
  — the open-source Python framework for RAG and agents: document
  loading, indexing, query engines, and workflows.
- [Pinecone documentation](https://docs.pinecone.io/) — managed
  vector database; Documents API, integrated embedding, hybrid
  search, namespaces, and reranking.
- [Weaviate documentation](https://weaviate.io/developers/weaviate)
  — open-source vector database (self-hosted or cloud) with native
  hybrid search and multi-tenancy.
- [Qdrant documentation](https://qdrant.tech/documentation/) —
  open-source vector search engine (self-hosted or cloud) with
  dense, sparse, and hybrid queries and payload filtering.
- [Chroma documentation](https://docs.trychroma.com/) —
  open-source embedding database for local development, self-hosted
  servers, or Chroma Cloud.
- [LangChain agents documentation](https://docs.langchain.com/oss/python/langchain/agents)
  — for exposing a RAG pipeline as a tool inside an agent.

## Required Workflow

1. Define the corpus and its access rules: sources, update cadence,
   ownership, and per-user or per-tenant visibility. Retrieval must
   never show a user a document they cannot read at the source.
2. Build ingestion: load documents, extract clean text (structure
   preserved where it matters — headings, tables), normalize, and
   attach metadata (source id, title, URL, version, access scope).
3. Chunk the text: split on structure first (headings, paragraphs),
   then by size with overlap. Record chunk boundaries and the
   source span of every chunk so answers can cite precisely.
4. Choose and fix the embedding model, then embed and upsert chunks
   with their metadata. The embedding model is part of the index
   contract: changing it means re-indexing everything.
5. Build retrieval: embed the query, search the top-k candidates,
   apply metadata filters (access scope first), optionally rerank,
   and return chunks with scores and source metadata.
6. Assemble context: dedupe overlapping chunks, order by relevance,
   fit the token budget, and attach a citation id to each chunk.
7. Generate with a prompt that requires grounding: answer only from
   the provided context, cite sources, and say when the context
   does not contain the answer. See `llm-integration` for the call.
8. Evaluate before shipping: measure retrieval quality and answer
   faithfulness on the example set (see `agent-evaluation`), and
   inspect failures by hand.
9. Ship with ingestion as a repeatable pipeline (see
   `background-jobs`): re-index on source changes, version the
   index, and keep the old index live until the new one is verified.
10. Monitor in production: retrieval hit rate, empty-result rate,
    citation coverage, user feedback, and latency per stage.

## Implementation Standards

- Indexing — structure-aware chunking, embeddings, vector store
  selection: see [references/indexing.md](./references/indexing.md).
- Retrieval — access-scoped queries, hybrid search, reranking: see
  [references/retrieval.md](./references/retrieval.md).
- Generation — context assembly, grounding, citations: see
  [references/generation.md](./references/generation.md).
- Operations — index versioning, failure handling: see
  [references/operations.md](./references/operations.md).

### Testing Strategy

- Keep a fixed question set with known-good answers and measure recall
  at k and answer correctness on every chunking, embedding-model, or
  retrieval change; a re-index is a deployment and is evaluated before
  reads switch to it.
- Test hybrid search against dense-only on your own questions; do not
  ship hybrid on the assumption that it is always better.
- Test access scoping as a security property: a query from one user
  must never retrieve another user's documents, even when the
  embedding is a near-perfect match.
- Test the failure cases: empty retrieval, low-score retrieval, and
  embedding-service outage must each produce their defined behavior
  instead of a confident answer from nothing.
- Test citations mechanically: every factual claim in a test answer
  maps to a chunk id present in the retrieved set.

## Best Practices

- Start simple: one embedding model, one vector store, top-k
  retrieval, no reranker. Measure, then add complexity only where
  the failures point.
- Evaluate retrieval separately from generation. If the right chunk
  was retrieved but the answer is wrong, the problem is the prompt
  or the model; if the right chunk was not retrieved, no prompt
  will fix it.
- Keep a regression set of real user questions (anonymized) and run
  it on every pipeline change: chunking, embedding model, top-k,
  reranker, or prompt.
- Enrich chunks with context at ingestion time: prepend the
  document title and section heading to each chunk so it is
  interpretable on its own.
- Handle document updates as upserts and deletes, not append-only
  growth — stale chunks are a top source of wrong answers. Track
  source versions and remove chunks whose source changed.
- Log retrieval traces (query, retrieved chunk ids, scores) so
  failures can be replayed and diagnosed.
- Use query transformation sparingly: a rewritten or expanded query
  helps when users ask vague questions, but it adds latency and a
  failure mode of its own. Measure before keeping it.

## Security Considerations

- Access control is a retrieval property, not a display property:
  enforce per-user and per-tenant filters inside the vector query
  (metadata filters or namespaces). A user must never retrieve a
  chunk they are not allowed to read, even if the UI would hide it.
  See `multi-tenancy` and `database-security`.
- Indexed documents may contain PII, secrets, or confidential data.
  Scan and redact at ingestion; never index credentials. The vector
  store is a data store — encrypt it, authenticate access to it,
  and audit who queries it.
- Retrieved content is untrusted input to the model: a document in
  the corpus can contain instructions ("ignore previous
  instructions and...") that steer the model — indirect prompt
  injection. Delimit retrieved context, instruct the model to
  treat it as data, and never let retrieved text authorize actions.
  See `mcp-security` for the same pattern in tool results, and the
  OWASP GenAI Security Project (<https://genai.owasp.org/>).
- Poisoning: anyone who can write to a source document can poison
  retrieval. Control write access to sources, review changes to
  high-trust documents, and version the index so a poisoned build
  can be rolled back.
- Do not leak document existence through error messages: "no
  results" should look the same whether the document does not
  exist or the user cannot access it.
- Embedding and generation providers see your queries and (for
  hosted embedding) your documents. Check their data-handling
  terms before indexing sensitive material.

## Performance Considerations

- Retrieval latency is usually dominated by the embedding call and
  the reranker, not the vector search. Cache query embeddings for
  repeated queries and batch ingestion embeddings.
- Index size and query cost scale with chunk count: smaller chunks
  mean more vectors. Tune chunk size against recall on your eval
  set, not by rule of thumb.
- Keep the generation context budget fixed and small enough that
  the model stays fast and cheap; more context is not better
  context. Measure answer quality against context size.
- Ingestion is a background job (see `background-jobs`): large
  corpora take minutes to hours to embed. Parallelize with a
  bounded worker pool and respect the embedding provider's rate
  limits.
- For high query volume, cache retrieval results for identical
  queries with a short TTL, and pre-warm the index after deploys.

## Common Mistakes

- Chunking by fixed character count with no overlap — facts get
  split across chunks and neither half answers the question.
- Changing the embedding model without re-indexing — old and new
  vectors live in different spaces and retrieval silently degrades.
- Retrieving top-3 and stopping — recall suffers. Retrieve wide,
  rerank, then cut.
- No access filtering in the query — post-filtering leaks metadata
  and breaks ranking; filter inside the vector store.
- Letting the model answer from general knowledge when retrieval
  is empty — this is where confident hallucinations come from.
- Evaluating only the final answer — retrieval and generation fail
  differently and need separate metrics.
- Never updating the index — the system confidently answers from
  last year's documents.
- Indexing everything including boilerplate, navigation, and
  duplicates — noise in, noise out. Clean at ingestion.

## Examples

Indexing documents with LlamaIndex (Python), following the
framework's own documented pattern — the high-level API handles
chunking, embedding, and storage:

  [examples/minimal-rag.py](./examples/minimal-rag.py).

By default this embeds with the provider configured in settings;
set `Settings.embed_model` explicitly to pin the embedding model
and record it with the index (see the LlamaIndex docs for the
current settings API).

## Validation Checklist

- [ ] Ingestion is repeatable: same sources produce the same index,
      and re-indexing is a tested pipeline step.
- [ ] Every chunk carries source, section, and access-scope metadata.
- [ ] The embedding model and chunking parameters are recorded with
      the index build.
- [ ] Retrieval filters by access scope inside the vector query.
- [ ] Retrieval quality is measured on a real question set, before
      and after each pipeline change.
- [ ] The generation prompt requires grounding and an explicit
      "I don't know" when context is insufficient.
- [ ] Answers carry citations that resolve to retrieved chunks.
- [ ] Empty retrieval, low-score retrieval, and provider outages
      have defined behavior.
- [ ] Stale chunks are removed when sources change.
- [ ] No secrets or unredacted PII are indexed.

## Expected Deliverables

- An ingestion pipeline (load, clean, chunk, embed, upsert) with
  index versioning.
- A retrieval service with access filtering, reranking, and
  context assembly.
- A generation prompt with grounding and citation requirements.
- An evaluation set of real questions with retrieval and
  faithfulness metrics, run in CI (see `agent-evaluation`).
- Monitoring for retrieval quality, empty results, latency, and
  cost per query.
- Documentation of the embedding model, vector store, and chunking
  choices and why they were made.

## References

- [LlamaIndex documentation](https://docs.llamaindex.ai/en/stable/)
- [Pinecone documentation](https://docs.pinecone.io/)
- [Weaviate documentation](https://weaviate.io/developers/weaviate)
- [Qdrant documentation](https://qdrant.tech/documentation/)
- [Chroma documentation](https://docs.trychroma.com/)
- [LangChain agents documentation](https://docs.langchain.com/oss/python/langchain/agents)
- [OWASP GenAI Security Project](https://genai.owasp.org/)
- Related skills in this repository: `llm-integration`,
  `ai-agents`, `agent-evaluation`, `database-design`,
  `database-security`, `multi-tenancy`, `background-jobs`,
  `caching`, `observability`.
