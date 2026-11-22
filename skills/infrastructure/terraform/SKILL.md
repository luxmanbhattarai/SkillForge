---
name: terraform
description: >
  Use this skill when managing infrastructure as code with HashiCorp
  Terraform: HCL configuration, providers, remote state and locking,
  modules, workspaces, plan and apply workflows, importing existing
  resources, testing and validation, sensitive values and policy as code,
  and CI/CD integration. Trigger keywords: Terraform, HCL, terraform plan,
  terraform apply, tfstate, backend, module, provider, workspace, import,
  OpenTofu, infrastructure as code, IaC.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Terraform

## Purpose

This skill covers managing cloud infrastructure as code with HashiCorp
Terraform: writing HCL configuration, choosing providers, storing state
remotely with locking, composing reusable modules, separating
environments with workspaces or directories, planning and applying
changes safely, importing existing resources, testing configuration,
and enforcing policy. It produces infrastructure that is versioned,
reviewable, repeatable, and safe to change in teams.

## When to Use

- Provisioning or changing cloud infrastructure with Terraform.
- Setting up remote state backends and state locking.
- Writing or refactoring Terraform modules.
- Separating environments (dev, staging, production) in Terraform.
- Importing infrastructure that was created outside Terraform.
- Testing Terraform configuration (`terraform test`, `validate`, `fmt`).
- Enforcing policy on Terraform plans (Terraform Policy, Sentinel).
- Running Terraform in CI/CD with plan-on-pull-request and
  apply-on-merge.
- Migrating between Terraform versions or from Terraform to OpenTofu.

## When Not to Use

- Infrastructure as real code in TypeScript, Python, or Go — use
  `pulumi`.
- Cloud-specific resource design — use `aws`, `gcp`, or `kubernetes`
  for what to build; this skill covers how to declare it in Terraform.
- The release pipeline around Terraform — use `ci-cd` and
  `github-actions`; this skill covers the Terraform steps inside it.
- Kubernetes manifests and Helm — use `kubernetes`.
- Secrets storage design — use `secrets-management`; this skill covers
  how Terraform handles sensitive values.

## Prerequisites

- Terraform CLI installed; 1.17.2 was the latest stable release at last
  verification (1.17.0, released 2026-10-21, made Terraform Policy
  generally available and added the `-minimal-refresh` planning option).
  Pin the CLI version per project (for example with `tfenv` or a
  container image) and declare `required_version` in every root module.
- A provider account and credentials for the target cloud, configured
  through environment variables or the provider's native auth — never
  hardcoded in configuration.
- A remote state backend decided before the first `apply` (HCP
  Terraform, or a cloud object store with locking).
- Terraform is source-available under the Business Source License
  (BUSL 1.1) since version 1.6; OpenTofu is the open-source fork under
  the Linux Foundation for teams that require an OSI-approved license.
- Git for versioning configuration; state files are never committed.

## Official Documentation

- [Terraform documentation](https://developer.hashicorp.com/terraform) —
  the docs home: language, CLI, providers, and HCP Terraform.
- [State](https://developer.hashicorp.com/terraform/language/state) —
  what state is, remote backends, and why state must never live in
  version control.
- [Terraform block reference](https://developer.hashicorp.com/terraform/language/block/terraform) —
  the `terraform` block: `required_version`, `required_providers`,
  `backend`, and `cloud`.
- [Terraform releases](https://github.com/hashicorp/terraform/releases) —
  release notes and downloads for every version.

## Required Workflow

1. Confirm the Terraform and provider versions: check
   `required_version` and `required_providers` constraints, and run
   `terraform version`.
2. Initialize with `terraform init` (use `-migrate-state` when changing
   backends) and confirm the backend is reachable.
3. Write or edit configuration in small, focused changes; keep
   resources, variables, outputs, and the backend in separate files
   (`main.tf`, `variables.tf`, `outputs.tf`, `backend.tf`).
4. Format and validate: `terraform fmt -recursive` and
   `terraform validate`.
5. Plan: `terraform plan -out=tfplan` and read the whole plan — every
   create, update, replace, and destroy — before approving it.
6. Apply the saved plan (`terraform apply tfplan`) so what was
   reviewed is exactly what runs; never `apply` an unreviewed plan in
   production.
7. Verify the applied infrastructure in the cloud console or with the
   provider's CLI, and confirm outputs.
8. Commit the configuration change; the plan file and state are never
   committed.
9. For existing infrastructure, import it first (`import` blocks or
   `terraform import`), then plan to confirm no unintended diff.
10. For team workflows, run plan in CI on every pull request and apply
    only from the main branch after review.

## Implementation Standards

- Remote state with locking for every shared environment; local state
  is only for throwaway learning projects.
- State is treated as sensitive: it can contain secret values in plain
  text. Encrypt it at rest, restrict access to it, and never commit it
  or print it in logs.
- Pin provider versions with `~>` constraints in `required_providers`
  so upgrades are deliberate, and commit the dependency lock file
  (`.terraform.lock.hcl`).
- One root module per environment or per deployable unit; share code
  through versioned modules, not copy-paste.
- Variables have types and descriptions; sensitive variables are
  marked `sensitive = true`, and secrets come from a secret manager,
  not from `.tfvars` files in Git.
- Outputs are the only way modules expose values; never reach into
  another module's internals.
- Resource names and tags follow one convention across the codebase;
  use `locals` for values repeated across resources.
- Destructive changes (`destroy`, replacements) are called out in the
  pull request and require explicit approval.

### Testing Strategy

- Test with `terraform plan` on every change and review the plan
  in the pull request: unexpected replacements or deletions block
  the change before `terraform apply` runs.
- Test modules in isolation with `terraform test`: a module
  creates, updates, and destroys cleanly, and its outputs match
  what consuming modules expect.
- Test state locking: a second apply against locked state is
  refused, and a failed apply leaves state consistent rather
  than half-written.
- Test configuration hygiene in CI: `terraform validate` and
  `terraform fmt -check` pass, and the lock file
  (`.terraform.lock.hcl`) matches the pinned provider versions.
- Test sensitive handling: variables marked `sensitive = true`
  never appear in plan or apply output or logs, and no secret
  reaches a `.tfvars` file in Git.

## Best Practices

- Keep modules small and single-purpose: a module that provisions a
  VPC, a module that provisions a database — not one module for the
  whole platform.
- Use workspaces only for near-identical environments; use separate
  directories (and separate state) when environments genuinely differ.
- Prefer `import` blocks in configuration over the imperative
  `terraform import` command so imports are reviewable and repeatable.
- Use `terraform test` for module behavior and `check` blocks for
  ongoing assertions about applied infrastructure.
- Use `moved` blocks when renaming or restructuring resources so
  Terraform tracks the move instead of destroying and recreating.
- Run `terraform plan` in CI on every pull request and post the plan
  as a comment so reviewers see the blast radius.
- Use `lifecycle` meta-arguments deliberately: `prevent_destroy` for
  irreplaceable data, `create_before_destroy` for zero-downtime
  replacements, `ignore_changes` only where an external process owns
  the field.
- Keep the state small: split large infrastructures into multiple
  root modules (network, data, applications) so plans stay fast and
  blast radius stays small.

## Security Considerations

- State files contain secrets in plain text. Store them in an
  encrypted backend with tight access control, enable versioning on
  the state bucket, and never expose state in CI logs or artifacts.
- Never hardcode credentials, tokens, or secret values in `.tf` or
  `.tfvars` files; use environment variables, the provider's native
  auth (IAM roles, workload identity), or a secret manager data source.
- Mark sensitive variables and outputs with `sensitive = true` so
  Terraform redacts them from CLI output — and remember that does not
  encrypt them in state.
- Restrict who can run `apply` against production state; use HCP
  Terraform or CI with OIDC federation so no human holds long-lived
  cloud credentials for production.
- Enforce policy as code: Terraform Policy (generally available in
  1.17) for CLI workflows, or Sentinel on HCP Terraform and Terraform
  Enterprise, to block forbidden resources, regions, and public
  exposure.
- Review every plan for unintended destroys and for resources that
  would become public (open security groups, public buckets).
- Rotate backend credentials and audit state access; state access is
  effectively infrastructure admin access.

## Performance Considerations

- Large states make plans slow: split into multiple root modules and
  use targeted plans (`-target`) only as a diagnostic, never as a
  routine apply path.
- Refresh is the slow part of a plan on large infrastructures; the
  `-minimal-refresh` option (1.17) limits how much state Terraform
  re-checks during a plan. It refreshes only resources the plan would
  change, so it hides drift on untouched resources — use it for fast
  inner-loop plans, not as the only plan that runs against production;
  keep a scheduled full or `-refresh-only` plan to catch drift.
- Parallelism defaults to 10 operations; raise `-parallelism` only
  when the provider and the cloud API can absorb it.
- Provider plugin startup dominates short runs; keep the number of
  distinct providers per root module small.
- `terraform plan -refresh-only` is a cheap drift check to run on a
  schedule without producing a change plan.

## Common Mistakes

- Local state for team infrastructure — it cannot be shared, locked,
  or audited; use a remote backend.
- Committing `.tfstate` or `.tfvars` with secrets to Git — state and
  secret values do not belong in version control.
- Applying without reading the plan — a plan that destroys a database
  looks the same as any other plan until you read it.
- Unpinned providers — a provider upgrade can change behavior or
  introduce a breaking change without warning.
- `terraform apply -auto-approve` in production — automation is fine
  in CI after review, but a human should approve the plan first.
- Editing state by hand — use `terraform state mv`, `rm`, and `import`
  so Terraform keeps its bookkeeping consistent.
- One giant root module for everything — plans get slow and a single
  mistake can affect the whole platform.
- Forgetting the lock file — `.terraform.lock.hcl` pins provider
  checksums; without it, installs are not reproducible.
- Using `count` where `for_each` fits — `count` reorders resources
  when the list changes; `for_each` keys them by a stable name.

## Examples

Root module with version constraints and an S3 backend using native
locking:

  [examples/root-module.tf](./examples/root-module.tf).

A module call with a sensitive variable:

  [examples/module-call.tf](./examples/module-call.tf).

Importing an existing bucket with a configuration-driven import block:

  [examples/import-block.tf](./examples/import-block.tf).

Core workflow commands:

  [scripts/core-commands.sh](./scripts/core-commands.sh).

## Validation Checklist

- [ ] `terraform fmt -check` and `terraform validate` pass.
- [ ] State is remote, encrypted, versioned, and locked; no state file
      is committed.
- [ ] Provider versions are pinned and `.terraform.lock.hcl` is
      committed.
- [ ] The plan was read in full before apply, including every destroy
      and replacement.
- [ ] No secret appears in configuration, variables files, or logs.
- [ ] Sensitive variables and outputs are marked `sensitive = true`.
- [ ] CI runs plan on pull requests and apply only from the main
      branch after review.
- [ ] Policy checks pass (Terraform Policy or Sentinel where used).

## Expected Deliverables

- Version-controlled Terraform configuration: root module, modules,
  variables, and outputs.
- A configured remote backend with locking, and a documented way to
  bootstrap it.
- The reviewed plan and the applied result.
- Documentation of the module layout, workspace strategy, and how to
  run plan and apply.
- Policy configuration where the team enforces it.

## References

- [Terraform documentation](https://developer.hashicorp.com/terraform) —
  language, CLI, and provider docs.
- [State](https://developer.hashicorp.com/terraform/language/state) —
  remote state and backends.
- [Terraform releases](https://github.com/hashicorp/terraform/releases) —
  release notes for every version.
- Related skills in this repository: `pulumi`, `aws`, `gcp`,
  `kubernetes`, `ci-cd`, `github-actions`, `secrets-management`,
  `deployment`.
