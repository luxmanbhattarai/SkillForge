# Extending Nuxt: modules and configuration

- Modules: add functionality through Nuxt modules in the `modules`
  array of `nuxt.config.ts` (for example `@nuxt/image` for
  optimized images, `@nuxt/content` for file-based content,
  `@pinia/nuxt` for Pinia). Prefer maintained official modules
  over hand-rolled equivalents.
- Configuration: `runtimeConfig` holds secrets (server-only) and
  `runtimeConfig.public` holds values safe for the browser. Never
  put a secret under `public`. `appConfig` holds public,
  build-time configuration.
