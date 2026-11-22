from langchain.agents import create_agent
from langchain.tools import tool

@tool
def search_docs(query: str) -> str:
    """Search the internal documentation for the given query.

    Returns the most relevant passage, or an empty string.
    """
    return docs_search(query)  # your retrieval implementation

agent = create_agent(
    model=model,  # configured per deployment, e.g. "provider:model"
    tools=[search_docs],
    system_prompt="Answer from the documentation. Say when you do not know.",
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "How do refunds work?"}]},
    {"configurable": {"thread_id": "run-123"}},
)
