from llama_index.core import Document, VectorStoreIndex

documents = [
    Document(
        text="Refunds are issued within 14 days of the request.",
        metadata={"source": "docs/refunds.md", "section": "Refunds"},
    ),
]

index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("How long do refunds take?")
print(response)  # grounded in the indexed document
