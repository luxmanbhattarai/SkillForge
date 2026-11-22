import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'All articles on Example Site.',
};

interface Article {
  id: string;
  title: string;
}

async function getArticles(): Promise<Article[]> {
  const response = await fetch('https://example.com/api/articles', {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error('Failed to load articles');
  return response.json();
}

export default async function ArticlesPage() {
  const articles = await getArticles();
  return (
    <main>
      <h1>Articles</h1>
      <ul>
        {articles.map((article) => (
          <li key={article.id}>{article.title}</li>
        ))}
      </ul>
    </main>
  );
}
