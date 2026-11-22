---
name: vercel
description: >
  Use this skill when deploying and hosting web applications on Vercel:
  connecting a Git repository, configuring a project, managing preview
  and production deployments, setting environment variables, adding a
  custom domain, and using the Vercel CLI. Trigger keywords: Vercel,
  deploy, hosting, preview deployment, production deployment, vercel CLI,
  custom domain, environment variable, serverless function, edge.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a Vercel account, a Git repository, and network access to Vercel.
---

# Vercel

## Purpose

This skill covers deploying and hosting web applications on Vercel, with
Git-connected deployments, preview environments, environment variables,
and custom domains. It produces a project that deploys automatically on
every push and behaves the same in preview and production.

## When to Use

- Creating a Vercel project from a Git repository.
- Deploying a Next.js, Astro, React, or static site to Vercel.
- Setting environment variables for preview and production.
- Adding a custom domain and configuring DNS for a Vercel project.
- Debugging a failed Vercel deployment or a build error.
- Using the Vercel CLI for local development or manual deploys.

## When Not to Use

- Deploying to Cloudflare Workers or Pages — use `cloudflare-workers`
  or `cloudflare`.
- Container-based hosting — use `docker` and `deployment`.
- Long-running servers, background workers, or stateful services —
  Vercel is for web frontends and serverless functions; use a container
  or VM host instead.
- General CI pipelines — use `github-actions` or `ci-cd`.

## Prerequisites

- A Vercel account and a Git repository containing the project.
- The project builds successfully locally (`npm run build` or the
  project's build command).
- A `vercel.json` only when the project needs custom configuration;
  most projects work with zero configuration.
- For CLI work: the Vercel CLI installed and authenticated with
  `vercel login`.
- Version range: Node.js 26.x is the default for new projects
  (generally available 2026-10-29); 24.x and 22.x are also available.
  Node.js 20 was deprecated on 2026-10-01 and new deployments
  targeting it fail. Pin the version with `engines.node` in
  `package.json`, which overrides the dashboard setting. The Edge
  runtime is deprecated; use the default Node.js runtime.

## Official Documentation

- [Vercel Documentation](https://vercel.com/docs) — the docs home for
  projects, deployments, domains, and functions.
- [Vercel CLI reference](https://vercel.com/docs/cli) — command
  reference for the Vercel CLI.
- [Vercel Dashboard](https://vercel.com/dashboard) — project and
  deployment management.

## Required Workflow

1. Confirm the project builds locally before connecting it to Vercel.
2. Import the Git repository into Vercel and confirm the framework is
   detected correctly.
3. Set the root directory, build command, and output directory only when
   the defaults are wrong.
4. Add environment variables for each environment (production, preview,
   development) in the dashboard or with the CLI; never commit them.
5. Trigger the first deployment and confirm it succeeds.
6. Verify the production deployment with `curl` and a browser check.
7. Add the custom domain in the project settings and update DNS at the
   registrar as instructed by Vercel.
8. Open a pull request and confirm a preview deployment is created and
   passes its checks.

## Implementation Standards

- Keep the framework's default build settings unless there is a specific
  reason to override them.
- Store every secret and API key as an environment variable in Vercel,
  scoped to the right environment; never commit secrets.
- Use `vercel.json` only for configuration that cannot be expressed in
  the dashboard, such as redirects, rewrites, and headers.
- Keep serverless function code small and fast; functions have execution
  time and size limits that vary by plan.
- Set the Node.js runtime version explicitly when the project needs a
  specific version; otherwise use the Vercel default.
- Use preview deployments for every pull request and require a passing
  preview before merging.

## Best Practices

- Use Git integration so every push deploys automatically and every pull
  request gets a preview URL.
- Protect preview deployments with Vercel Authentication when the site
  is not yet public.
- Use environment-specific variables so preview deployments never point
  at production services or databases.
- Add redirects in `vercel.json` for renamed pages instead of leaving
  broken links.
- Monitor deployment logs and function logs after each release.
- Keep the build fast: cache dependencies, avoid unnecessary build steps,
  and keep the bundle small.

## Security Considerations

- Never commit environment variables or secrets; set them in the Vercel
  dashboard or with the CLI.
- Restrict who can change project settings and environment variables.
- Use Vercel Authentication or password protection for preview
  deployments that show unreleased work.
- Do not expose server-only secrets to the browser: only variables
  prefixed for client exposure are bundled into the frontend.
- Validate and sanitize all input in serverless functions, as with any
  public endpoint.

## Performance Considerations

- Vercel serves static assets from its edge network; keep assets small
  and cacheable.
- Use the framework's image optimization and font optimization rather
  than serving unoptimized assets.
- Keep serverless functions fast: cold starts and execution time limits
  punish slow handlers.
- Use incremental static regeneration or static generation where the
  framework supports it, instead of rendering every page on demand.
- Monitor Core Web Vitals in the Vercel dashboard and fix regressions
  before they reach production.

## Common Mistakes

- Committing a `.env` file with real secrets — use the dashboard or CLI
  to set environment variables.
- Using production environment variables in preview deployments — scope
  variables per environment.
- Assuming a local build success guarantees a Vercel build success —
  Vercel builds in a clean environment; missing dependencies fail there.
- Ignoring build warnings — warnings in the log often become errors in
  a later framework version.
- Adding a custom domain without updating DNS — the domain will not
  resolve until the registrar records are set.
- Putting heavy work in a serverless function — functions have time
  limits; move heavy work to a queue or a dedicated service.

## Examples

Deploy from the CLI and check the deployment status:

```bash
vercel login
vercel --prod
```

Set an environment variable for production:

```bash
vercel env add DATABASE_URL production
```

A `vercel.json` with a redirect and a security header:

```json
{
  "redirects": [
    { "source": "/old-blog/:slug", "destination": "/blog/:slug", "permanent": true }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

## Validation Checklist

- [ ] The project builds locally and the Vercel deployment succeeds.
- [ ] Production and preview environment variables are set and scoped
      correctly.
- [ ] The production URL and the custom domain both respond over HTTPS.
- [ ] A pull request produces a working preview deployment.
- [ ] No secret appears in source control.
- [ ] Redirects and headers in `vercel.json` behave as expected.

## Expected Deliverables

- The Vercel project connected to the Git repository with automatic
  deployments.
- Environment variables set for each environment.
- The custom domain configured and verified.
- Verification that production and preview deployments work.

## References

- [Vercel Documentation](https://vercel.com/docs) — projects,
  deployments, domains, and functions.
- [Vercel CLI reference](https://vercel.com/docs/cli) — CLI commands.
- Related skills in this repository: `deployment`, `github-actions`,
  `ci-cd`, `observability`, `cloudflare-workers`.
