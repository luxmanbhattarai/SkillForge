# Retrieval: access scoping, hybrid search, reranking

- Retrieval: always filter by access scope in the query itself,
  never by post-filtering results the user should not have seen.
  Retrieve more candidates than you will show the model (for
  example top-20) and rerank down to the final set (for example
  top-5) — cheap retrieval plus a reranker beats either alone.
- Hybrid search: combine dense vector search with keyword (BM25)
  search and fuse the rankings (for example reciprocal rank fusion)
  when queries contain exact terms, codes, names, or ids that
  embeddings blur. Test hybrid against dense-only on your own
  questions; do not assume it is always better.
- Reranking: use a cross-encoder or hosted reranker on the
  candidate set when precision matters. Reranking is the cheapest
  quality lever after chunking.
