// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const response = await fetch(`/api/posts/${params.slug}`);
  if (response.status === 404) error(404, 'Post not found');
  if (!response.ok) error(500, 'Failed to load post');
  const post = await response.json();
  return { post };
};
