<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface Article {
  id: string;
  title: string;
}

const articles = ref<Article[]>([]);
const error = ref<string | null>(null);
const loading = ref(true);

const count = computed(() => articles.value.length); // derived, not state

onMounted(async () => {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    articles.value = (await response.json()) as Article[];
  } catch (err: unknown) {
    if (err instanceof Error) error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section aria-label="Articles">
    <p v-if="loading">Loading articles…</p>
    <p v-else-if="error" role="alert">Could not load articles: {{ error }}</p>
    <template v-else>
      <p>{{ count }} articles</p>
      <ul>
        <li v-for="article in articles" :key="article.id">{{ article.title }}</li>
      </ul>
      <p v-if="articles.length === 0">No articles yet.</p>
    </template>
  </section>
</template>
