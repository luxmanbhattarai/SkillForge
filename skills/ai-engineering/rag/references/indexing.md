# Indexing: chunking, embeddings, vector store

- Chunking: prefer structure-aware splitting (by heading or
  paragraph) over blind fixed-size windows; when fixed-size
  splitting is needed, use overlap so facts at boundaries are not
  split. Keep chunks small enough that several fit in the context
  budget alongside the question — a chunk that eats the whole
  budget is useless. Store the chunk's source document, section,
  and position for citations.
- Embeddings: choose the embedding model by the corpus language,
  domain vocabulary, required recall, and cost — not by headline
  benchmark scores. Prefer a model with a documented dimensionality
  and a stable API; record the model name and version with the
  index. Hosted embedding APIs are the default; local models make
  sense when data cannot leave your infrastructure.
- Vector store selection: decide on deployment (managed vs
  self-hosted), scale, hybrid search needs, metadata filtering,
  multi-tenancy, and data-residency requirements. Managed options
  (Pinecone, Weaviate Cloud, Qdrant Cloud, Chroma Cloud) remove
  operations work; self-hosted options (Weaviate, Qdrant, Chroma,
  pgvector as a Postgres extension) keep data in your
  infrastructure and suit smaller scale or existing Postgres
  deployments. Record the decision and revisit it when scale or
  requirements change.
