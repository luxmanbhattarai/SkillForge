---
name: ci-cd
description: >
  Use this skill when designing and improving continuous integration and
  continuous delivery pipelines: choosing CI/CD tooling, structuring
  build, test, and deploy stages, managing environments and approvals,
  adding quality gates, and making releases safe and repeatable. Trigger
  keywords: CI/CD, continuous integration, continuous delivery, pipeline,
  build pipeline, deploy pipeline, release, quality gate, environment,
  rollback, trunk-based development.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# CI/CD

## Purpose

This skill covers designing continuous integration and continuous delivery
pipelines that are fast, reliable, and safe. It produces pipelines where
every change is tested automatically, releases are repeatable, and a bad
deploy can be rolled back quickly.

## When to Use

- Designing a CI/CD pipeline for a new project or repository.
- Adding quality gates (tests, lint, type check, security scan) to a
  pipeline.
- Structuring environments (development, staging, production) and the
  promotion path between them.
- Improving a slow or flaky pipeline.
- Setting up release automation, versioning, or changelogs.
- Planning a rollback strategy for production deploys.

## When Not to Use

- Writing a specific GitHub Actions workflow file — use `github-actions`.
- Deploying to a specific host — use `vercel`, `cloudflare-workers`, or
  `deployment`.
- Building the container image — use `docker`.
- Monitoring a deployed service — use `observability`.

## Prerequisites

- A version control repository with a clear branching model.
- A build and test suite that runs locally and passes.
- A deployment target and a way to deploy to it from automation.
- Agreement on environments: at minimum staging and production for a
  user-facing service.
- Version range: none — this skill covers methodology, not a versioned tool.

## Official Documentation

- [GitHub Actions docs](https://docs.github.com/en/actions) — the most
  common CI/CD platform for GitHub-hosted projects.
- [Vercel Documentation](https://vercel.com/docs) — Git-connected
  deployments and preview environments.
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) —
  deploying Workers from CI with Wrangler.

## Required Workflow

1. Map the pipeline stages: install, lint, type check, unit test,
   build, integration test, deploy to staging, deploy to production.
2. Decide the trigger for each stage: every pull request, every push to
   the main branch, or a manual release.
3. Put fast checks first so a failure is found in seconds, not minutes.
4. Gate the production deploy behind all checks and, for production,
   behind an approval or an environment rule.
5. Make every deploy traceable: record the commit SHA, the pipeline run,
   and the environment in the deployment record.
6. Define the rollback path before the first production deploy: redeploy
   the previous known-good commit or use the platform's rollback feature.
7. Run the full pipeline on a test change and verify each stage.
8. Document the pipeline, the environments, and the rollback steps.

## Implementation Standards

- Every pull request runs the full check suite before it can merge.
- The main branch is always deployable: no direct pushes that skip CI.
- Builds are reproducible: lock dependency versions and pin tool
  versions.
- Deployments are automated; manual deploys from a developer machine are
  the exception, not the rule.
- Secrets live in the CI platform's secret store, never in the repository.
- Each environment has its own configuration and secrets; staging never
  shares production credentials.
- Pipeline configuration lives in the repository and is reviewed like
  code.

## Best Practices

- Keep the pipeline fast: aim for a pull-request check under ten minutes
  by caching dependencies and parallelizing jobs.
- Fail fast: run lint and type checks before the test suite.
- Use preview deployments for pull requests so reviewers can test the
  change in a live environment.
- Make the pipeline idempotent: re-running a stage produces the same
  result.
- Treat flaky tests as pipeline bugs: quarantine and fix them instead of
  re-running the pipeline until it passes.
- Use semantic versioning and a changelog for releases that users or
  other services depend on.
- Notify the team on pipeline failure in the channel they actually read.

## Security Considerations

- Scope pipeline secrets to the minimum environments and jobs that need
  them.
- Require approval for production deploys from a human who is not the
  author of the change when the team size allows it.
- Scan dependencies for known vulnerabilities in the pipeline and fail
  the build on critical findings.
- Do not let pull requests from forks access production secrets.
- Audit pipeline changes: a change to the pipeline is a change to what
  can reach production.
- Rotate CI secrets on a schedule and when a team member leaves.

## Performance Considerations

- Cache dependencies and build artifacts between runs.
- Parallelize independent jobs; run tests, lint, and type checks
  concurrently where possible.
- Use concurrency groups to cancel stale runs for the same branch.
- Keep the test suite fast by splitting slow integration tests from fast
  unit tests.
- Monitor pipeline duration over time; a pipeline that gets slower every
  month will eventually be skipped or worked around.

## Common Mistakes

- A pipeline that is slow or flaky — developers start merging without
  waiting for it, and it stops protecting the main branch.
- Deploying from a developer machine — the deploy is not reproducible
  and not traceable.
- No rollback plan — a bad deploy becomes a long outage while the team
  figures out how to undo it.
- Sharing secrets between staging and production — a staging breach
  becomes a production breach.
- Skipping CI on the main branch — direct pushes bypass the checks that
  exist to protect production.
- Testing only in production — staging exists to catch problems before
  users do.

## Examples

Pipeline stage layout for a typical web application:

```text
Pull request:
  install -> lint -> type check -> unit tests -> build
  (all in parallel where possible; preview deployment on success)

Merge to main:
  full check suite -> deploy to staging -> smoke tests
  -> approval -> deploy to production -> smoke tests
```

Branch protection rules to enforce the pipeline:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings.

A minimal release checklist:

1. All checks pass on the main branch.
2. The changelog is updated.
3. The version is bumped.
4. The staging deploy is verified.
5. The production deploy is approved and verified.
6. The rollback commit is recorded.

## Validation Checklist

- [ ] Every pull request runs the full check suite before merging.
- [ ] The main branch is protected and always deployable.
- [ ] Staging and production have separate configuration and secrets.
- [ ] A production deploy is gated behind checks and an approval.
- [ ] The rollback path is documented and has been exercised at least once.
- [ ] Pipeline duration is acceptable and flaky tests are tracked.

## Expected Deliverables

- The pipeline design and configuration committed to the repository.
- Branch protection and environment rules configured.
- Documentation of the stages, environments, and rollback steps.
- A verified end-to-end run from pull request to production.

## References

- [GitHub Actions docs](https://docs.github.com/en/actions) — CI/CD
  automation on GitHub.
- [Vercel Documentation](https://vercel.com/docs) — Git-connected
  deployments.
- Related skills in this repository: `github-actions`, `deployment`,
  `docker`, `vercel`, `cloudflare-workers`, `observability`.
