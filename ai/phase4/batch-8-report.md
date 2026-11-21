# Phase 4 — Batch 8 Report: cloud + infrastructure-as-code

- **Date:** 2026-11-20
- **Batch:** 8 (`skills/infrastructure/`)
- **Skills written:** 5 new original skills
- **Branch:** `feat/skillforge-production-upgrade` (no commits made; coordinator commits)

## Skills written

| Skill | Directory | Lines | Status |
| --- | --- | --- | --- |
| AWS | `skills/infrastructure/aws/` | 303 | PASS |
| GCP | `skills/infrastructure/gcp/` | 327 | PASS |
| Kubernetes | `skills/infrastructure/kubernetes/` | 360 | PASS |
| Terraform | `skills/infrastructure/terraform/` | 322 | PASS |
| Pulumi | `skills/infrastructure/pulumi/` | 367 | PASS |

All five follow `templates/SKILL-TEMPLATE.md` exactly (15 sections in
order), carry the standard frontmatter (`license: MIT`, metadata
`version: "1.0.0"`, `category: infrastructure`,
`maintainer: skills-library`, `source: original`,
`last_verified: "2026-11-20"`), and stay under the 500-line limit. No
`references/` subdirectories were needed; all material fits in
`SKILL.md`. No files outside the batch assignment were touched, and
`skills/upstream/` was not touched.

## Official sources consulted per skill

Versions below were verified against official docs, official release
pages, or official release announcements on 2026-11-20.

### aws

- AWS Documentation home — `https://docs.aws.amazon.com/`
- AWS CLI version 2 user guide (v2 is the current major version; 2.41.0
  released 2026-11-17 per the AWS CLI changelog) —
  `https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-changes.html`
- Security best practices in IAM (federation, temporary credentials,
  MFA, least privilege, Access Analyzer) —
  `https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html`
- How Amazon VPC works —
  `https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html`
  (VPC CLI tutorial commands verified from the same guide)
- Using Amazon CloudWatch alarms —
  `https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html`
- AWS Well-Architected Framework (six pillars) —
  `https://docs.aws.amazon.com/wellarchitected/latest/userguide/waf.html`

### gcp

- Google Cloud documentation home — `https://docs.cloud.google.com/docs`
- gcloud CLI overview; Cloud SDK 594.0.0 released 2026-11-17 per Google
  Cloud release notes —
  `https://docs.cloud.google.com/sdk/gcloud`
- Install the Google Cloud CLI —
  `https://docs.cloud.google.com/sdk/docs/install`
- GKE security best practices —
  `https://docs.cloud.google.com/docs/security/gke-security-bps`
- Configure secrets for Cloud Run jobs (Secret Manager integration) —
  `https://docs.cloud.google.com/run/docs/configuring/jobs/secrets`
- Secret Manager event notifications —
  `https://docs.cloud.google.com/secret-manager/docs/event-notifications`

### kubernetes

- Kubernetes documentation home — `https://kubernetes.io/docs/home/`
- kubectl reference — `https://kubernetes.io/docs/reference/kubectl/`
- kubectl quick reference (current for v1.37) —
  `https://kubernetes.io/docs/reference/kubectl/quick-reference/`
- Helm docs: Using Helm — `https://helm.sh/docs/intro/using_helm/`
- helm install reference — `https://helm.sh/docs/helm/helm_install/`
- Version facts: Kubernetes 1.37 ("Garhwal", released 2026-08-26) is the
  current stable minor, latest patch 1.37.2 (2026-10-28); supported
  minors 1.37, 1.36, 1.35; 1.34 reached end of life 2026-10-27; 1.38
  planned 2026-12-16. Helm 4.3.2 (2026-11-13) is current; Helm 3
  receives security fixes only until 2027-02-10.

### terraform

- Terraform documentation home — `https://developer.hashicorp.com/terraform`
- State (remote backends, locking, state sensitivity) —
  `https://developer.hashicorp.com/terraform/language/state`
- Terraform block reference (`required_version`, `required_providers`,
  `backend`, `cloud`) —
  `https://developer.hashicorp.com/terraform/language/block/terraform`
- Terraform releases — `https://github.com/hashicorp/terraform/releases`
- Version facts: Terraform 1.17.2 (2026-11-11) is the latest stable
  release; 1.17.0 (2026-10-21) made Terraform Policy generally
  available and added `-minimal-refresh`. S3 backend native locking
  via `use_lockfile = true` is the current locking approach.
  Terraform is BUSL 1.1 since 1.6; OpenTofu is the Linux Foundation
  open-source fork.

### pulumi

- Pulumi documentation home — `https://www.pulumi.com/docs/`
- Pulumi CLI versions (3.277.0 current stable as of 2026-11-18) —
  `https://www.pulumi.com/docs/install/versions/`
- State and Backends (Pulumi Cloud vs DIY backends) —
  `https://www.pulumi.com/docs/iac/concepts/state-and-backends/`
- Using a DIY Backend —
  `https://www.pulumi.com/docs/iac/operations/stack-management/using-a-diy-backend/`
- Policy as Code with CrossGuard —
  `https://www.pulumi.com/blog/multicloud-policy-as-code/`
- pulumi stack CLI reference —
  `https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/`
- Noted removals: `pulumi watch` and the bare `pulumi logs` command
  were removed in Pulumi 3.273.0 (2026-10-28).

## Validation output

Each skill validated individually with the filtered validator (registry
regeneration is the coordinator's job; unfiltered validate was not run):

```text
=== aws ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== gcp ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== kubernetes ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== terraform ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
=== pulumi ===
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

No validation errors or warnings in any of the five skills.

## Decisions and notes

- **Cross-references, not duplication.** The three existing
  infrastructure skills (`deployment`, `docker`, `observability`) were
  skimmed first. The new skills reference siblings by backticked name
  (`deployment`, `docker`, `observability`, `ci-cd`,
  `secrets-management`, plus `backup-recovery`, `database-security`,
  `rbac` where relevant) and point cloud-specific Kubernetes questions
  to `aws`/`gcp` while keeping provider-neutral Kubernetes in
  `kubernetes`.
- **Version info in the body only**, per
  `ai/decisions/2026-11-20-phase3-version-metadata.md`. Each skill
  states the current stable version with its release date in
  Prerequisites and points at the official release notes for updates.
- **No invented pricing or statistics.** Cost guidance is qualitative
  (right-sizing, lifecycle rules, budget alerts, committed-use
  discounts) with no invented prices. The one price figure encountered
  in research (NAT Gateway hourly rate in an AWS tutorial) was not
  reproduced, to avoid staleness.
- **Pulumi vs Terraform comparison is factual only** (language, state
  backends, licensing, testing, policy) with no superlatives or
  recommendations beyond team fit.
- **Link verification caveat.** Links were verified through
  `browser.search` results (official pages, recently crawled) and, for
  doc-home URLs, through their verified sub-paths. Direct
  `browser.open` confirmation was not possible: the browser service
  returned HTTP 429 (rate limit) on all six landing-page open attempts
  and those requests were not retried. Every URL in the skills is
  either verbatim from a search result or the canonical doc home of a
  verified deep page (for example `https://docs.aws.amazon.com/`,
  `https://kubernetes.io/docs/home/`,
  `https://www.pulumi.com/docs/`,
  `https://developer.hashicorp.com/terraform`). If the coordinator
  wants a live link re-check, `npm run check:links` at the end of
  Phase 4 will cover it.
- **Example commands are real.** AWS CLI commands follow the official
  VPC tutorial and CloudWatch/CLI references; gcloud commands follow
  Google Cloud docs; kubectl/Helm commands follow the official
  references; HCL follows the Terraform language docs; Pulumi
  TypeScript follows Pulumi docs and the CrossGuard blog example.
  Placeholder values use obvious stand-ins (`PROJECT_ID`,
  `CHANGE_ME`, `vpc-0123456789abcdef0`) and no real credentials appear
  anywhere.
