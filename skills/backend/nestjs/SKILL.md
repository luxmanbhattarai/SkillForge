---
name: nestjs
description: >
  Build scalable server-side applications with NestJS: modules, controllers,
  and providers, dependency injection, middleware, guards, interceptors,
  pipes, validation, testing with @nestjs/testing, configuration, and
  deployment. Use when starting a new NestJS app, adding a feature to an
  existing NestJS service, or choosing an opinionated TypeScript backend
  framework with a built-in architecture.
license: MIT
metadata:
  version: "1.0.0"
  category: backend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires Node.js v20.19+ or v22.12+ (NestJS 12); TypeScript 6.x (TypeScript 7 not yet supported by nest build).
---

# NestJS

## Purpose

This skill covers building server-side applications with NestJS, a
progressive TypeScript framework with an out-of-the-box architecture
inspired by Angular: modules, controllers, providers, and dependency
injection. It covers the request lifecycle (middleware, guards,
interceptors, pipes), validation, testing, configuration, and
deployment. The outcome is a NestJS service that is modular, testable,
and ready for production.

## When to Use

- Starting a new API or backend service with NestJS.
- Adding a module, controller, provider, guard, interceptor, or pipe
  to an existing NestJS app.
- Building a large or team-owned backend where a prescribed
  architecture pays off.
- Building a service that needs built-in support for GraphQL,
  WebSockets, microservices, or scheduled tasks.
- Migrating an Express or Fastify service to a structured framework.

## When Not to Use

- Building a tiny API or single-purpose service where a minimal
  framework is faster — use `fastify`, `express`, or `hono` instead.
- Building a full-stack app with server rendering and file routing —
  use `nextjs` or `astro` instead.
- Building a GraphQL API — use `graphql` for schema and resolver
  design (NestJS can host the endpoint, but the GraphQL skill governs
  the schema).
- Needing to run on an edge runtime — NestJS targets Node.js servers.

## Prerequisites

- Node.js v20.19+ or v22.12+ installed (required by NestJS 12; the
  latest active LTS is recommended).
- Familiarity with TypeScript and decorators, and HTTP fundamentals.
- A project scaffolded with the Nest CLI (`nest new`) or an existing
  NestJS app.
- NestJS 12.x (12.6.0, November 2026) is the current stable line.
  Version 12 ships the core packages as ESM; existing CommonJS apps
  keep working through Node's `require(esm)` support. NestJS 11 is in
  security support only; new projects start on 12.

## Official Documentation

- [NestJS documentation](https://docs.nestjs.com) — guides, API
  reference, and techniques. NestJS 12.x is the current release line.
- [First steps](https://docs.nestjs.com/first-steps) — controllers,
  providers, modules, middleware, and exception filters.
- [Validation](https://docs.nestjs.com/techniques/validation) —
  `ValidationPipe`, DTOs, and class-validator.
- [Configuration](https://docs.nestjs.com/techniques/configuration) —
  `@nestjs/config` and environment handling.
- [Testing](https://docs.nestjs.com/fundamentals/testing) —
  `@nestjs/testing` unit, integration, and end-to-end testing.
- [CLI overview](https://docs.nestjs.com/cli/overview) — `nest new`,
  `nest generate`, and `nest upgrade`.
- [Authentication](https://docs.nestjs.com/security/authentication) —
  guards, Passport integration, and JWT.
- [NestJS releases](https://github.com/nestjs/nest/releases) — release
  notes and the current stable version.

## Required Workflow

1. Scaffold with the Nest CLI (`nest new project-name`, or
   `nest new project-name --minimal` for a single-file start) and
   confirm `npm run start:dev` serves the default route.
2. Design the module layout first: one feature module per domain area
   (`UsersModule`, `OrdersModule`), each owning its controllers,
   providers, and (where used) entities.
3. Implement the request flow per feature: controller (thin, HTTP
   only) → service (business logic) → data layer. Keep controllers
   free of business logic.
4. Add validation at the boundary: enable the global `ValidationPipe`
   with `whitelist: true` and `forbidNonWhitelisted: true`, and define
   DTOs with class-validator decorators. NestJS 12 also supports
   Standard Schema validators on route decorators.
5. Add cross-cutting behavior in the right layer: guards for
   authorization, interceptors for logging/transformation/caching,
   exception filters for error mapping, middleware only for things
   that must run before the Nest lifecycle.
6. Configure with `@nestjs/config`: validate environment variables at
   startup with a schema (Joi or class-validator) so a missing secret
   fails fast instead of failing at runtime.
7. Write tests at three levels: unit tests for services, integration
   tests with `Test.createTestingModule`, and end-to-end tests with
   `app.getHttpServer()` and supertest.
8. Add a health endpoint (for example with `@nestjs/terminus`), enable
   graceful shutdown, and verify the production build
   (`npm run build` then `npm run start:prod`) before deploying.

## Implementation Standards

- One feature module per domain area. A module declares its own
  controllers and providers and exports only what other modules need;
  never import a provider from another module without going through
  its exports.
- Controllers are thin: parse and validate input (via DTOs), call a
  service, return the result. Business logic lives in injectable
  services, which are easy to unit-test in isolation.
- Use constructor-based dependency injection with `private readonly`
  properties. Prefer the default singleton scope; request scope only
  when state is genuinely per-request, since it disables much of the
  framework's caching.
- Register the global `ValidationPipe` in `main.ts` with
  `whitelist: true` (strip unknown properties) and
  `transform: true` (coerce query/param types). DTOs use
  class-validator decorators (`@IsString()`, `@IsInt()`,
  `@IsOptional()`) and class-transformer where conversion is needed.
- Return domain errors as Nest HTTP exceptions (`NotFoundException`,
   `BadRequestException`, `ConflictException`) from services, and map
  unexpected errors to a generic 500 with an exception filter. Never
  leak stack traces or internal details to clients.
- Use guards (`CanActivate`) for authorization decisions and keep
  authentication (who you are) separate from authorization (what you
  may do). Apply guards at the controller or method level, not inside
  handlers.
- Use interceptors for response transformation, logging, timeouts,
  and caching; use pipes for input transformation and validation.
  Do not put these concerns in controllers.
- Use `@nestjs/config`'s `ConfigService` (or typed `registerAs`
  configuration) for all environment access; never read
  `process.env` directly in feature code.
- Prefer the default Express adapter unless there is a measured
  reason to switch to Fastify (`FastifyAdapter`) or `node:http`
  (`NodeAdapter`); switching adapters changes available middleware.
- Enable shutdown hooks (`app.enableShutdownHooks()`) so in-flight
  requests and database connections close cleanly.
- Follow the CLI's naming conventions (`*.controller.ts`,
  `*.service.ts`, `*.module.ts`, `*.dto.ts`, `*.spec.ts`) so the
  project stays navigable as it grows.

### Testing Strategy

- Test at three levels: unit tests for services in isolation,
  integration tests with `Test.createTestingModule` (real module
  wiring, fakes substituted through the module system), and
  end-to-end tests with supertest against `app.getHttpServer()`.
- Test the global `ValidationPipe`: unknown properties are
  stripped (`whitelist: true`), query and param types are
  coerced (`transform: true`), and invalid DTOs get a 400.
- Test guards separately from handlers: an unauthenticated
  request is rejected, an authenticated request without the
  required role is rejected, and an authorized request passes.
- Test module wiring end to end: unit tests do not catch a
  missing provider export or a circular dependency, so every
  module is exercised through at least one HTTP test.
- Test error mapping: domain errors surface as the intended
  HTTP exceptions (`NotFoundException`, `ConflictException`),
  and unexpected errors become a generic 500 with no stack
  trace or internal detail.

## Best Practices

- Generate code with the CLI (`nest g resource users`,
  `nest g controller orders`) so files, module wiring, and test
  stubs stay consistent.
- Keep services framework-free where possible: a service that only
  depends on other services and a repository is trivial to test and
  to reuse outside HTTP.
- Use custom providers (factories, values, aliases) for
  configuration-driven dependencies such as database clients, so
  tests can substitute fakes through the module system.
- Version the API (`app.setGlobalPrefix('v1')` or URI versioning)
  from the start; adding versioning later is a breaking change.
- Use `class-transformer`'s `@Exclude()` / `@Expose()` with the
  `ClassSerializerInterceptor` to keep internal fields (password
  hashes, internal flags) out of responses.
- Document the API with `@nestjs/swagger` and OpenAPI decorators on
  controllers and DTOs; generate the spec from the code, not by hand.
- Log with request context (request id, user id) via an interceptor
  or middleware so production issues are traceable.
- Upgrade with the CLI (`nest upgrade`) when moving between majors;
  it applies the mechanical migration steps and reports what still
  needs review by hand.

## Security Considerations

- Validate and whitelist all input with the global `ValidationPipe`;
  mass-assignment bugs come from unvalidated properties reaching the
  data layer.
- Authenticate with guards and authorize per resource inside the
  service layer; a valid token is not permission to access any
  resource. See `authentication` and the official authentication
  docs for Passport/JWT setup.
- Never store secrets in code or in committed `.env` files; load
  them from the environment or a secret manager and validate their
  presence at startup.
- Enable security headers (helmet) and CORS with an explicit origin
  allow-list; the defaults are permissive.
- Use parameterized queries or an ORM for database access; never
  interpolate user input into a query string.
- Rate-limit public endpoints and authentication endpoints (see
  `rate-limiting`); add `@nestjs/throttler` for in-app throttling.
- Keep dependencies current: NestJS 12 requires Node.js v20.19+ or
  v22.12+ partly because older runtimes lack the ESM support the
  framework now depends on.
- Never log secrets, tokens, or full request bodies.

## Performance Considerations

- The usual bottlenecks are database queries and unbatched data
  loading, not the framework. Profile those before tuning Nest.
- Prefer the default singleton provider scope; request-scoped
  providers disable controller/service instance reuse and slow
  every request.
- Paginate every collection endpoint and cap page sizes; never
  return unbounded lists.
- Use interceptors for response caching on read-heavy endpoints, and
  HTTP caching headers (`Cache-Control`, `ETag`) for cacheable GETs
  (see `caching`).
- Offload slow or bursty work (email, image processing, webhooks)
  to a queue rather than blocking the request (see `queues` and
  `background-jobs`).
- Enable compression only for responses that benefit from it, and
  prefer streaming for large payloads instead of buffering them.
- In production, run the compiled build (`npm run start:prod`), not
  `ts-node` in watch mode, and run the app behind a process manager
  or orchestrator with multiple instances.

## Common Mistakes

- Putting business logic in controllers — it becomes untestable and
  unreusable. Controllers parse, delegate, and return.
- Forgetting `whitelist: true` on the `ValidationPipe` — unknown
  client properties then flow into the service and the database.
- Importing a provider directly from another module's file instead
  of importing the module — this bypasses the DI container and
  creates duplicate instances.
- Using request-scoped providers by default — it silently disables
  singleton caching and hurts throughput.
- Catching errors inside every handler instead of using exception
  filters — inconsistent error responses. Centralize error mapping.
- Reading `process.env` in feature code — configuration becomes
  untestable and unvalidated. Use `ConfigService`.
- Returning entities directly from controllers — internal fields
  leak. Use DTOs or the `ClassSerializerInterceptor`.
- Skipping end-to-end tests — unit tests do not catch module wiring
  errors, missing providers, or guard misconfiguration.

## Examples

A feature module with a controller, a service, and a validated DTO:

```ts
// create-order.dto.ts
import { IsInt, IsPositive, IsString, Length } from "class-validator";

export class CreateOrderDto {
  @IsInt()
  @IsPositive()
  totalMinor!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;
}
```

```ts
// orders.service.ts
import { Injectable } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";

@Injectable()
export class OrdersService {
  create(dto: CreateOrderDto) {
    return { id: "ord_01", ...dto, status: "created" };
  }
}
```

```ts
// orders.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }
}
```

```ts
// main.ts — global validation pipe
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

## Validation Checklist

- [ ] Modules are organized by domain area; each module exports only
      what other modules need.
- [ ] Controllers are thin; business logic lives in injectable
      services.
- [ ] The global `ValidationPipe` runs with `whitelist: true` and
      `transform: true`; invalid input returns `400`.
- [ ] Guards enforce authorization; no handler trusts a token alone
      for access to a resource.
- [ ] Errors map to consistent HTTP responses; no stack traces leak
      to clients.
- [ ] Environment variables are validated at startup via
      `@nestjs/config`.
- [ ] Unit, integration, and end-to-end tests cover the happy path,
      validation failures, and unauthorized access.
- [ ] The production build starts cleanly and the health endpoint
      responds in the deployed environment.

## Expected Deliverables

- A NestJS app with feature modules, thin controllers, and
  injectable services.
- Global validation, centralized error handling, and guards for
  authentication and authorization.
- Configuration validated at startup and a health endpoint.
- Tests at unit, integration, and end-to-end levels.
- A production build and deployment configuration with graceful
  shutdown.

## References

- [NestJS documentation](https://docs.nestjs.com)
- [First steps](https://docs.nestjs.com/first-steps)
- [Validation](https://docs.nestjs.com/techniques/validation)
- [Configuration](https://docs.nestjs.com/techniques/configuration)
- [Testing](https://docs.nestjs.com/fundamentals/testing)
- [CLI overview](https://docs.nestjs.com/cli/overview)
- [Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS releases](https://github.com/nestjs/nest/releases)
- Related skills in this repository: `rest-api`, `api-design`,
  `graphql`, `nodejs`, `typescript`, `authentication`,
  `rate-limiting`, `caching`, `queues`, `background-jobs`,
  `observability`, `fastify`, `express`.
