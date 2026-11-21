---
name: github-actions
description: >
  Use this skill when building automation with GitHub Actions: writing
  workflow files, setting triggers, running tests and builds in CI,
  deploying from a workflow, managing secrets and environments, using
  caching, and debugging failed workflow runs. Trigger keywords: GitHub
  Actions, workflow, workflow file, CI, YAML, job, step, action, runner,
  secrets, GITHUB_TOKEN.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a GitHub repository with Actions enabled and network access to GitHub.
---

# GitHub Actions

## Purpose

This skill covers building reliable automation with GitHub Actions:
workflow files that test, build, and deploy code on every push and pull
request. It produces workflows that are fast, secure, and easy to debug.

## When to Use

- Creating a new workflow file under `.github/workflows/`.
- Running tests, linting, type checks, or builds on pull requests.
- Deploying from GitHub Actions to Vercel, Cloudflare, or another host.
- Adding caching, matrix builds, or reusable workflows.
- Managing workflow secrets, variables, and environments.
- Debugging a failed workflow run.

## When Not to Use

- General CI/CD strategy that spans multiple providers — use `ci-cd`.
- The deployment target's own configuration — use `vercel`,
  `cloudflare-workers`, or `deployment`.
- Building the container image itself — use `docker` (the workflow only
  runs the build).
- Scheduled jobs that are not tied to a repository — use the hosting
  platform's scheduler or a cron service.

## Prerequisites

- A GitHub repository with Actions enabled.
- The project builds and its tests pass locally.
- Secrets the workflow needs, added in the repository settings under
  Settings, Secrets and variables, Actions.
- Familiarity with YAML and the repository's build and test commands.
- Action versions: `actions/checkout` and `actions/setup-node` are at
  v7 as of 2026-11-20 (setup-node v7.1.0). v5 moved both actions to
  the Node.js 24 runtime (self-hosted runners need v2.327.1 or
  later); v6 changed checkout's credential storage and limited
  setup-node's automatic caching to npm; v7 migrated internals to
  ESM. v4 and earlier run on Node.js 20, which reached end-of-life
  on 30 April 2026 — do not use v4 for new workflows.
- Node.js 22, 24, and 26 are the active LTS lines as of 2026-11-20;
  use one of them for `node-version`.

## Official Documentation

- [GitHub Actions docs](https://docs.github.com/en/actions) — workflows,
  triggers, jobs, and reference.
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions) —
  published actions.
- [Workflow syntax reference](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions) —
  workflow file syntax.

## Required Workflow

1. Identify the trigger: push to a branch, pull request, schedule, or
   manual dispatch.
2. Create the workflow file under `.github/workflows/` with a clear name.
3. Pin every third-party action to a full commit SHA or a major version
   tag from a trusted publisher.
4. Add jobs for the checks that matter: install, lint, type check, test,
   and build, in that order where dependencies allow.
5. Cache dependencies so repeat runs are fast.
6. Run the workflow on a pull request and confirm it passes.
7. For deploys, gate the deploy job behind the test job and, for
   production, behind an environment with required reviewers.
8. Verify the deployed result after the workflow runs.

## Implementation Standards

- One workflow file per purpose: keep CI (test and build) separate from
  CD (deploy) where the deploy needs different permissions or approvals.
- Pin actions to a full commit SHA for production workflows, or to a
  major version tag (such as `v7`) when the publisher is trusted and the
  repository accepts that trade-off.
- Set explicit `permissions` at the top of the workflow; never rely on
  the default token permissions.
- Never print secrets to logs; mask sensitive values and avoid echoing
  environment variables.
- Use `secrets.*` for credentials and `vars.*` for non-secret
  configuration.
- Use concurrency groups to cancel in-progress runs for the same branch
  or pull request.
- Keep jobs fast: run independent jobs in parallel and cache aggressively.

## Best Practices

- Run the same checks in CI that developers run locally so a green local
  run means a green CI run.
- Use matrix builds to test across Node.js versions or operating systems
  when the project supports more than one.
- Use reusable workflows for steps shared across repositories.
- Name jobs and steps clearly; the run log is the first place a developer
  looks when something fails.
- Use environments for production deploys so approvals and secrets are
  scoped correctly.
- Keep the workflow file readable: short jobs, clear names, and comments
  where a step is non-obvious.

## Security Considerations

- Never use `pull_request_target` with untrusted code unless the workflow
  is explicitly designed for it; it runs with write permissions and
  access to secrets.
- Do not interpolate `${{ github.event.pull_request.title }}` or other
  user-controlled values into `run:` scripts; that is script injection.
- Pin third-party actions to a commit SHA so a compromised tag cannot
  change what the workflow runs.
- Grant the minimum `permissions` the workflow needs; a workflow that
  only runs tests does not need write access.
- Audit the actions the workflow uses and remove actions that are no
  longer maintained.
- Rotate secrets used by workflows when a team member leaves or a secret
  is exposed.

## Performance Considerations

- Cache dependencies with the package manager's cache action or the
  framework's cache support; dependency installation is usually the
  slowest step.
- Cancel in-progress runs for superseded commits with a concurrency
  group so CI does not waste time on stale code.
- Run independent jobs in parallel rather than in one long sequential job.
- Keep the runner image minimal: use the smallest runner that has the
  tools the job needs.
- Avoid re-running the full suite on documentation-only changes when the
  repository supports path filters.

## Common Mistakes

- Interpolating user-controlled values into `run:` scripts — this is
  script injection; pass values through environment variables instead.
- Using `latest` or an unpinned action version — the action can change
  without warning.
- Leaving default token permissions — a compromised step gets more access
  than it needs.
- Running deploys on every push without gating them behind tests — a
  broken build reaches production.
- Hard-coding secrets in the workflow file — use repository secrets.
- No concurrency control — multiple runs for the same branch queue up
  and waste time.

## Examples

CI workflow for a Node.js project:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

Deploy job that depends on the test job:

```yaml
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7
      - run: npm ci
      - run: npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Validation Checklist

- [ ] The workflow file is valid YAML and GitHub accepts it.
- [ ] The workflow runs and passes on a pull request.
- [ ] Third-party actions are pinned to a commit SHA or a major version.
- [ ] `permissions` are set explicitly and minimally.
- [ ] No secret appears in the workflow file or the logs.
- [ ] The deploy job is gated behind the test job and a production
      environment when it deploys to production.

## Expected Deliverables

- The workflow file committed under `.github/workflows/`.
- A passing workflow run on a pull request (or a link to the run).
- Documentation of the secrets and environments the workflow needs.
- Verification that the deploy job works when the workflow deploys.

## References

- [GitHub Actions docs](https://docs.github.com/en/actions) — workflows,
  triggers, and reference.
- [Workflow syntax reference](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions) —
  workflow file syntax.
- Related skills in this repository: `ci-cd`, `deployment`, `docker`,
  `vercel`, `cloudflare-workers`, `observability`.
