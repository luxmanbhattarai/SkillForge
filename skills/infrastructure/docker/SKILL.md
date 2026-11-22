---
name: docker
description: >
  Use this skill when containerizing applications with Docker: writing
  Dockerfiles, building and tagging images, running containers, composing
  multi-service setups with Docker Compose, managing volumes and networks,
  and debugging containerized applications. Trigger keywords: Docker,
  Dockerfile, container, image, docker compose, docker build, docker run,
  volume, containerize.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Docker installed and running on the machine, and network access to pull base images.
---

# Docker

## Purpose

This skill covers containerizing applications with Docker: writing
correct, small, secure Dockerfiles; building and running images; and
orchestrating local multi-service setups with Docker Compose. It produces
containers that build reproducibly and run the same everywhere.

## When to Use

- Writing a Dockerfile for an application or service.
- Building, tagging, and running a Docker image.
- Setting up a local development stack with Docker Compose.
- Debugging a container that fails to start or behaves differently from
  local runs.
- Optimizing image size or build time.

## When Not to Use

- Deploying to a serverless platform — use `cloudflare-workers` or
  `vercel` instead.
- Designing the CI pipeline that builds the image — use `github-actions`
  or `ci-cd`.
- Kubernetes deployment manifests — that is out of scope for this skill;
  use the cluster's own documentation.
- Production orchestration beyond Compose — use the hosting platform's
  docs (see `deployment`).

## Prerequisites

- Docker installed and running (Docker Desktop or the Docker Engine).
- Docker Compose available (included with current Docker Desktop and
  Docker Engine installs). Use Compose v2 (`docker compose`); the
  standalone `docker-compose` v1 binary is end-of-life.
- Base images: Node.js 22, 24, and 26 are the active LTS lines
  (26 is the newest LTS; `node:26-alpine` exists on Docker
  Hub). Node.js 20 reached end-of-life on 30 April 2026; do not base new
  images on it. Alpine images use musl libc, so verify native
  dependencies work there before choosing `-alpine` over `-slim`.
- The application builds and runs outside Docker first; containerize a
  working application, not a broken one.
- A `.dockerignore` file in the project root before the first build.
- Version range: Docker Compose v2; Node.js 22, 24, or 26 LTS for base images.

## Official Documentation

- [Docker Docs](https://docs.docker.com/) — the docs home for Docker,
  Dockerfiles, and Compose.
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/) —
  Dockerfile instruction reference.
- [Docker Compose reference](https://docs.docker.com/compose/) — Compose
  file reference and CLI.

## Required Workflow

1. Confirm the application runs locally without Docker.
2. Write a `.dockerignore` that excludes `node_modules`, `.git`, build
   output, and local environment files.
3. Write a multi-stage Dockerfile: a build stage that installs
   dependencies and builds, and a slim runtime stage that copies only the
   build output.
4. Pin the base image to a specific version tag (for example
   `node:24-alpine`) rather than `latest`.
5. Build the image with `docker build` and confirm it succeeds.
6. Run the container with `docker run`, mapping the port and passing
   environment variables with `--env-file` or `-e`.
7. Verify the running container responds as expected with `curl`.
8. For multi-service setups, define the services in `docker-compose.yml`
   and start them with `docker compose up`.

## Implementation Standards

- Use multi-stage builds so the final image contains only what the
  application needs to run.
- Pin base image tags to a specific version; never use `latest` for a
  production image.
- Run the container as a non-root user.
- Copy dependency manifests first and install dependencies before copying
  source code, so Docker layer caching reuses the dependency layer.
- Use `.dockerignore` to keep the build context small and to keep secrets
  out of the image.
- Never bake secrets, API keys, or credentials into an image; pass them
  at runtime through environment variables or a secret store.
- Set a `HEALTHCHECK` for services that other services depend on.
- Use `COPY` rather than `ADD` unless archive extraction is genuinely
  needed.
- Keep one process per container; use Compose for multi-process setups.

## Best Practices

- Prefer small base images such as `alpine` variants when the application
  supports them.
- Use `docker compose` for local development so the whole stack starts
  with one command.
- Name volumes for data that must survive container restarts; use bind
  mounts only for source code during development.
- Use `docker logs` and `docker exec` to inspect a running container
  before rebuilding it.
- Tag images with the Git commit SHA in CI so any deployed image can be
  traced back to its source.
- Keep the Dockerfile in the repository root or next to the service it
  builds, and document the build and run commands.

## Security Considerations

- Never include secrets in the image, in build arguments, or in layers;
  secrets in a layer remain in the image history.
- Run containers as a non-root user and drop unnecessary capabilities.
- Scan images for known vulnerabilities before deploying them.
- Keep base images updated; an old base image carries old vulnerabilities.
- Do not mount the Docker socket into a container unless the use case
  genuinely requires it; it gives the container control of the host.
- Limit container resources (CPU and memory) so one container cannot starve
  the host.

## Performance Considerations

- Layer caching makes rebuilds fast: order Dockerfile instructions from
  least-changing to most-changing.
- Keep the build context small with `.dockerignore`; a large context
  slows every build.
- Multi-stage builds keep the final image small, which speeds pulls and
  deploys.
- Use BuildKit cache mounts for package managers when builds are slow.
- Avoid installing build tools in the runtime stage.

## Common Mistakes

- Using `latest` as the base image tag — builds are not reproducible and
  can break without warning.
- Copying the whole project before installing dependencies — every source
  change invalidates the dependency layer and the build becomes slow.
- Baking secrets into the image with `ENV` or build arguments — secrets
  persist in image history.
- Running as root — a compromised container has full privileges.
- Switching to the non-root user before `COPY` or `npm ci` — the app
  directory is root-owned, so copies and installs fail; install as
  root (or `COPY --chown=node:node`) and switch user last, as in the
  example below.
- Forgetting `.dockerignore` — `node_modules` and `.git` bloat the build
  context and can leak files into the image.
- Storing data inside the container filesystem — data is lost when the
  container is removed; use a volume.

## Examples

Multi-stage Dockerfile for a Node.js application:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/dist ./dist
RUN npm ci --omit=dev
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t my-app:1.0.0 .
docker run --rm -p 3000:3000 --env-file .env my-app:1.0.0
```

Minimal Compose file for an app and a database:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - db
  db:
    image: postgres:17-alpine
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

## Validation Checklist

- [ ] The image builds from a clean checkout with `docker build`.
- [ ] The container runs and responds correctly with `docker run`.
- [ ] The base image tag is pinned to a specific version.
- [ ] No secret appears in the image, Dockerfile, or Compose file.
- [ ] The container runs as a non-root user.
- [ ] `.dockerignore` excludes `node_modules`, `.git`, and local env files.
- [ ] `docker compose up` starts the full stack when Compose is used.

## Expected Deliverables

- The Dockerfile (and `docker-compose.yml` when needed) committed to the
  project.
- A `.dockerignore` file.
- Verification that the image builds and the container runs correctly.
- Documentation of the build, run, and Compose commands.

## References

- [Docker Docs](https://docs.docker.com/) — Docker, Dockerfile, and
  Compose documentation.
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/) —
  instruction reference.
- Related skills in this repository: `github-actions`, `ci-cd`,
  `deployment`, `observability`.
