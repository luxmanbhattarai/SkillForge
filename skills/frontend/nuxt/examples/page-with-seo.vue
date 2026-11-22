<!-- app/pages/articles/[id].vue -->
<script setup lang="ts">
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: article, status, error } = await useFetch(
  () => `/api/articles/${id.value}`,
  { pick: ['title', 'body'] },
);

useSeoMeta({
  title: () => article.value?.title ?? 'Article',
  description: () => article.value?.body?.slice(0, 160) ?? '',
});
</script>

<template>
  <article v-if="status === 'success' && article">
    <h1>{{ article.title }}</h1>
    <p>{{ article.body }}</p>
  </article>
  <p v-else-if="status === 'pending'">Loading article…</p>
  <p v-else role="alert">Could not load this article.</p>
</template>
