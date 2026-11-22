// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },
    '/articles/**': { swr: 3600 },
    '/admin/**': { ssr: true, headers: { 'Cache-Control': 'private, no-store' } },
  },
});
