# Generation: context assembly, grounding, citations

- Context assembly: dedupe near-identical chunks, order by
  relevance (best first), and cap the total context tokens with a
  fixed budget. Include the citation id inline with each chunk so
  the model can cite and the user can verify.
- Grounding: the generation prompt must require the model to answer
  only from the provided context and to say it does not know when
  the context is insufficient. Refuse to answer from general
  knowledge when the question is about your corpus — a confident
  wrong answer is worse than no answer.
- Citations: every factual claim in the answer maps to a cited
  chunk. Verify citations mechanically where possible (the cited
  chunk id exists in the retrieved set).
