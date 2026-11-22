import { useEffect, useState } from 'react';

interface Article {
  id: string;
  title: string;
}

export function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/articles', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
      })
      .then(setArticles)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      });
    return () => controller.abort();
  }, []);

  const count = articles.length; // derived, not state

  if (error) return <p role="alert">Could not load articles: {error}</p>;

  return (
    <section aria-label="Articles">
      <p>{count} articles</p>
      <ul>
        {articles.map((article) => (
          <li key={article.id}>{article.title}</li>
        ))}
      </ul>
    </section>
  );
}
