---
name: pulumi
description: >
  Use this skill when managing infrastructure as code with Pulumi:
  infrastructure in TypeScript, Python, Go, .NET, Java, YAML, or HCL;
  projects and stacks; state backends including Pulumi Cloud and DIY
  backends; components; secrets management; testing; policy as code with
  CrossGuard; and CI/CD integration. Trigger keywords: Pulumi, pulumi up,
  pulumi preview, stack, Pulumi Cloud, CrossGuard, policy pack, Automation
  API, infrastructure as code, IaC, ESC.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Pulumi

## Purpose

This skill covers managing infrastructure as code with Pulumi:
writing infrastructure in a real programming language (TypeScript,
Python, Go, .NET, Java) or in YAML or HCL; organizing work into
projects and stacks; choosing state backends; composing reusable
components; managing secrets; testing programs; enforcing policy with
CrossGuard; and running Pulumi in CI/CD. It produces infrastructure
that is versioned, reviewable, testable with ordinary unit tests, and
safe to change in teams.

## When to Use

- Provisioning or changing cloud infrastructure with Pulumi.
- Choosing a Pulumi language or starting a new Pulumi project.
- Setting up stacks per environment and a state backend (Pulumi Cloud
  or a DIY backend).
- Writing reusable components or sharing code between stacks.
- Managing secrets with Pulumi config and secrets providers, or with
  Pulumi ESC (Environments, Secrets, and Configuration).
- Testing Pulumi programs with unit tests and mocks.
- Enforcing policy as code with CrossGuard policy packs.
- Running Pulumi in CI/CD with preview-on-pull-request and
  up-on-merge.
- Comparing Pulumi with Terraform for a new project.

## When Not to Use

- Declarative HCL-only infrastructure — use `terraform`.
- Cloud-specific resource design — use `aws`, `gcp`, or `kubernetes`
  for what to build; this skill covers how to declare it in Pulumi.
- The release pipeline around Pulumi — use `ci-cd` and
  `github-actions`; this skill covers the Pulumi steps inside it.
- Kubernetes manifests and Helm — use `kubernetes`.
- Secrets storage design — use `secrets-management`; this skill covers
  how Pulumi handles secrets.

## Prerequisites

- Pulumi CLI installed; 3.277.0 was the current stable version as of
  2026-11-18 (see the official CLI versions page). Run
  `pulumi version` to confirm, and keep the CLI and the language SDKs
  at matching versions.
- A language runtime for the chosen language (Node.js for TypeScript,
  Python 3 for Python, Go for Go), plus the provider SDK packages
  (for example `@pulumi/aws` or `pulumi_aws`).
- A Pulumi Cloud account (the default backend) or a DIY backend
  decision (S3, Azure Blob Storage, Google Cloud Storage, PostgreSQL,
  or local filesystem).
- Cloud credentials for the target provider, configured through
  environment variables or the provider's native auth — never
  hardcoded in a program.
- A secrets provider decided before the first stack is created: the
  Pulumi Cloud default, a passphrase, or a cloud KMS key (AWS KMS,
  Google Cloud KMS, Azure Key Vault, HashiCorp Vault).
- Git for versioning programs; stack state is never committed.

## Official Documentation

- [Pulumi documentation](https://www.pulumi.com/docs/) — the docs
  home: getting started, concepts, languages, and the CLI reference.
- [Pulumi CLI versions](https://www.pulumi.com/docs/install/versions/) —
  the current stable CLI version and the full version history.
- [State and Backends](https://www.pulumi.com/docs/iac/concepts/state-and-backends/) —
  how Pulumi stores state, Pulumi Cloud versus DIY backends, and
  migrating between backends.
- [Using a DIY Backend](https://www.pulumi.com/docs/iac/operations/stack-management/using-a-diy-backend/) —
  S3, Azure Blob Storage, Google Cloud Storage, PostgreSQL, and
  filesystem backends.
- [Policy as Code with CrossGuard](https://www.pulumi.com/blog/multicloud-policy-as-code/) —
  how CrossGuard policy packs work across clouds.
- [pulumi stack CLI reference](https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/) —
  managing stacks and viewing stack state.

## Required Workflow

1. Confirm the CLI and SDK versions (`pulumi version`) and log in to
   the chosen backend (`pulumi login` for Pulumi Cloud, or
   `pulumi login s3://<bucket>` for a DIY backend).
2. Create or open the project (`pulumi new <template>` for a new
   project) and a stack per environment (`pulumi stack init dev`).
3. Write the program in small, focused changes; keep resources,
   configuration, and shared logic in separate files or components.
4. Set configuration with `pulumi config set`, using `--secret` for
   sensitive values, and confirm the secrets provider is the one the
   team agreed on.
5. Preview: `pulumi preview` and read the whole preview — every
   create, update, replace, and delete — before approving it.
6. Apply with `pulumi up`, confirming the preview matches what was
   reviewed; never run an unreviewed update in production.
7. Verify the applied infrastructure in the cloud console or with the
   provider's CLI, and confirm stack outputs (`pulumi stack output`).
8. Commit the program change; state and the stack's checkpoint files
   are never committed.
9. For existing infrastructure, import it (`pulumi import` or the
   `import` resource option), then preview to confirm no unintended
   diff.
10. For team workflows, run preview in CI on every pull request and
    update only from the main branch after review.

## Implementation Standards

- One project per deployable unit; one stack per environment
  (dev, staging, production), with per-stack configuration in
  `Pulumi.<stack>.yaml`.
- State lives in Pulumi Cloud or a DIY backend with locking; the
  local filesystem backend is only for throwaway learning projects.
- State is treated as sensitive: it can contain secret values. Secrets
  are encrypted with the stack's secrets provider; restrict access to
  state and never print it in logs.
- Pin provider package versions in the language's lockfile so
  installs are reproducible.
- Secrets come from `pulumi config --secret`, Pulumi ESC, or a cloud
  secret manager — never hardcoded in a program or committed in
  `Pulumi.<stack>.yaml` in plain text.
- Outputs are the only way to expose values from a program; use stack
  references (`StackReference`) to read another stack's outputs.
- Resources that must not be deleted carry `protect: true` in their
  resource options.
- Destructive changes (deletes, replacements) are called out in the
  pull request and require explicit approval.

### Testing Strategy

- Test with `pulumi preview` on every change and review the plan
  in the pull request: unexpected replacements or deletions block
  the change before `pulumi up` runs.
- Test programs in a disposable dev stack before staging or
  production: create, update, and destroy the stack end to end
  so a broken program fails where it is cheap.
- Test stack configuration: required config is present, secrets
  are encrypted with the stack's secrets provider, and a missing
  or mistyped value fails fast instead of deploying with a
  wrong default.
- Test protected resources: a change that would delete or
  replace a resource marked `protect: true` is refused, and
  stack references resolve to the expected outputs of the
  referenced stack.
- Test recovery: destroy and recreate a stack from code and
  configuration alone (state restored from the backend) to prove
  the program — not manual console edits — defines the
  infrastructure.

## Best Practices

- Keep programs small and single-purpose; extract shared infrastructure
  into components (a component that provisions a VPC, one that
  provisions a database) instead of copying code between projects.
- Use the language's own tooling: types, linters, formatters, and
  package managers — infrastructure code is still code.
- Use `pulumi preview --diff` to see the detailed property-level
  changes before an update.
- Prefer stack references over duplicating values between stacks, and
  prefer Pulumi ESC over scattered per-stack secrets for shared
  configuration.
- Use the Automation API when infrastructure needs to be driven from
  another program (self-service portals, CLIs, tests) instead of
  shelling out to the CLI.
- Run `pulumi refresh` on a schedule to detect drift, and treat
  unexpected drift as a signal to investigate, not to ignore.
- Use `pulumi up --target` only as a diagnostic; routine updates apply
  the whole stack.
- Tag and label resources from one shared helper so every resource
  carries the team's standard tags.

## Security Considerations

- State contains secret values. Use a strong secrets provider (a cloud
  KMS key, not a shared passphrase in a wiki), restrict who can read
  state, and never expose state in CI logs or artifacts.
- Never hardcode credentials, tokens, or secret values in a program;
  use environment variables, the provider's native auth (IAM roles,
  workload identity), or a secret manager.
- Pulumi marks values created with `pulumi.secret` or
  `--secret` config as secrets and encrypts them in state — but
  secrets can still leak through plain-text outputs, logs, and
  `--json` output; review outputs before shipping them.
- Restrict who can run `pulumi up` against production stacks; use
  Pulumi Cloud access controls and CI with OIDC federation so no human
  holds long-lived cloud credentials for production.
- Enforce policy as code with CrossGuard: mandatory policies fail the
  preview or update, advisory policies warn, and policy packs can be
  enforced across an organization through policy groups.
- Review every preview for unintended deletes and for resources that
  would become public (open security groups, public buckets).
- Rotate backend and secrets-provider credentials and audit stack
  access; stack access is effectively infrastructure admin access.
- Do not use `pulumi stack output --show-secrets` in CI; it prints
  secret values in plain text.

## Performance Considerations

- Large stacks make previews slow: split into multiple projects
  (network, data, applications) so previews stay fast and blast
  radius stays small.
- Pulumi does not refresh state before every operation by design; run
  `pulumi refresh` explicitly when drift is suspected.
- Parallelism defaults apply per update; provider rate limits are the
  usual ceiling, not the CLI.
- Keep the program's dependency graph shallow: deeply chained
  `Output.apply` calls make previews harder to read and debug.
- Use `pulumi preview` in CI as the cheap gate; it runs the program
  without touching the cloud.

## Pulumi and Terraform: factual comparison points

- Language: Pulumi programs are written in general-purpose languages
  (TypeScript, Python, Go, .NET, Java) or in YAML or HCL; Terraform
  uses HCL, its own declarative language.
- State: both keep state; Pulumi's default backend is Pulumi Cloud,
  with DIY backends (S3, Azure Blob Storage, Google Cloud Storage,
  PostgreSQL, filesystem); Terraform uses remote backends or HCP
  Terraform.
- Licensing: the Pulumi CLI and core SDKs are Apache License 2.0;
  Terraform has been Business Source License 1.1 since version 1.6.
- Testing: Pulumi programs are tested with the language's own test
  frameworks plus Pulumi's mocking support; Terraform has
  `terraform test` and `check` blocks.
- Policy: Pulumi uses CrossGuard policy packs (TypeScript, Python, or
  OPA Rego); Terraform uses Terraform Policy (generally available in
  1.17) and Sentinel on HCP Terraform and Terraform Enterprise.
- Choose on team fit: a team fluent in TypeScript or Python that wants
  loops, functions, and unit tests in its infrastructure will usually
  prefer Pulumi; a team that wants a declarative DSL and the broadest
  provider catalog will usually prefer Terraform.

## Common Mistakes

- Local state for team infrastructure — it cannot be shared, locked,
  or audited; use Pulumi Cloud or a DIY backend.
- Committing stack state or plain-text secrets in
  `Pulumi.<stack>.yaml` to Git — state and secret values do not belong
  in version control.
- Updating without reading the preview — a preview that deletes a
  database looks the same as any other preview until you read it.
- Unpinned provider packages — a provider upgrade can change behavior
  without warning.
- `pulumi up --yes` in production without a reviewed preview —
  automation is fine in CI after review, but a human should approve
  the preview first.
- Editing state by hand — use `pulumi state` subcommands (`mv`, `rm`,
  `unprotect`) so Pulumi keeps its bookkeeping consistent.
- One giant stack for everything — previews get slow and a single
  mistake can affect the whole platform.
- Using `pulumi watch` or the bare `pulumi logs` command — both were
  removed in Pulumi 3.273.0; use the cloud provider's log tooling.
- Forgetting `protect: true` on irreplaceable resources — a mistaken
  `pulumi destroy` then has nothing to stop it.

## Examples

A minimal TypeScript program creating an S3 bucket with versioning
and encryption:

```ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("app-bucket", {
  versioning: { enabled: true },
  serverSideEncryptionConfiguration: {
    rule: {
      applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" },
    },
  },
});

export const bucketName = bucket.id;
```

A component that wraps a reusable pattern (TypeScript):

```ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class PrivateBucket extends pulumi.ComponentResource {
  public readonly bucket: aws.s3.Bucket;

  constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
    super("example:storage:PrivateBucket", name, {}, opts);
    this.bucket = new aws.s3.Bucket(name, {
      acl: "private",
      versioning: { enabled: true },
    }, { parent: this });
    this.registerOutputs({ bucketName: this.bucket.id });
  }
}
```

A CrossGuard policy pack rule that forbids public S3 buckets
(TypeScript):

```ts
import * as aws from "@pulumi/aws";
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";

new PolicyPack("acme-baseline", {
  policies: [
    {
      name: "s3-no-public-read",
      description: "S3 buckets must not allow public read access.",
      enforcementLevel: "mandatory",
      validateResource: validateResourceOfType(
        aws.s3.Bucket,
        (bucket, args, reportViolation) => {
          if (bucket.acl === "public-read") {
            reportViolation("S3 buckets must not use the public-read ACL.");
          }
        },
      ),
    },
  ],
});
```

Core workflow commands:

```bash
pulumi login
pulumi stack init dev
pulumi config set region us-east-1
pulumi config set dbPassword --secret
pulumi preview --diff
pulumi up
pulumi stack output
pulumi refresh
pulumi destroy
```

## Validation Checklist

- [ ] `pulumi preview` was read in full before `pulumi up`, including
      every delete and replacement.
- [ ] State is in Pulumi Cloud or a DIY backend with locking; no state
      file is committed.
- [ ] Provider package versions are pinned in the lockfile.
- [ ] No secret appears in the program, configuration files, or logs.
- [ ] Sensitive values use `--secret` config or `pulumi.secret`, and
      the secrets provider is the agreed one.
- [ ] Irreplaceable resources carry `protect: true`.
- [ ] CI runs preview on pull requests and update only from the main
      branch after review.
- [ ] CrossGuard policy packs pass where the team enforces them.

## Expected Deliverables

- A version-controlled Pulumi program: project, stacks, components,
  and configuration.
- A configured state backend and secrets provider, with a documented
  way to bootstrap them.
- The reviewed preview and the applied result.
- Documentation of the project layout, stack strategy, and how to run
  preview and update.
- Policy packs where the team enforces them.

## References

- [Pulumi documentation](https://www.pulumi.com/docs/) — getting
  started, concepts, and the CLI reference.
- [State and Backends](https://www.pulumi.com/docs/iac/concepts/state-and-backends/) —
  Pulumi Cloud and DIY backends.
- [Pulumi CLI versions](https://www.pulumi.com/docs/install/versions/) —
  the current stable CLI version.
- Related skills in this repository: `terraform`, `aws`, `gcp`,
  `kubernetes`, `ci-cd`, `github-actions`, `secrets-management`,
  `deployment`.
