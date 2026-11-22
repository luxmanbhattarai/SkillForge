// server/api/articles/[id].get.ts
import { defineEventHandler, getRouterParam, createError } from 'nuxt/server';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');
  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    throw createError({ status: 400, statusText: 'Invalid article id.' });
  }
  // Load the article from the database here; 404 when missing.
  return { id, title: 'Example article', body: 'Example body.' };
});
