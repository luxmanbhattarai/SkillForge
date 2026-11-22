import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

interface Article {
  id: string;
  title: string;
}

export function ArticleListScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('https://example.com/api/articles', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<Article[]>;
      })
      .then(setArticles)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <ActivityIndicator accessibilityLabel="Loading articles" />;
  if (error) return <Text role="alert">Could not load articles: {error}</Text>;

  return (
    <FlatList
      data={articles}
      keyExtractor={(article) => article.id}
      ListEmptyComponent={<Text>No articles yet.</Text>}
      renderItem={({ item }) => (
        <View accessible accessibilityLabel={item.title}>
          <Text>{item.title}</Text>
        </View>
      )}
    />
  );
}
