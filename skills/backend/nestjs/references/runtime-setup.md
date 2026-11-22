# Runtime setup: config, adapter, shutdown, naming

- Use `@nestjs/config`'s `ConfigService` (or typed `registerAs`
  configuration) for all environment access; never read
  `process.env` directly in feature code.
- Prefer the `node:http` adapter (`NodeAdapter`) for new projects:
  the official docs recommend it from NestJS 12.3 as the fastest of
  the three adapters, and it becomes the default in v13. Use
  `FastifyAdapter` only when you need Fastify-specific plugins or
  hooks, and the default Express adapter only when existing Express
  middleware cannot move; switching adapters changes available
  middleware.
- Enable shutdown hooks (`app.enableShutdownHooks()`) so in-flight
  requests and database connections close cleanly.
- Follow the CLI's naming conventions (`*.controller.ts`,
  `*.service.ts`, `*.module.ts`, `*.dto.ts`, `*.spec.ts`) so the
  project stays navigable as it grows.
