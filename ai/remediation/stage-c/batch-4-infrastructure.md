# Stage C — Batch 4: Infrastructure Skills Audit

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local working-tree edits only; nothing committed, pushed, or merged)
- **Scope:** 9 Phase 4 (new) infrastructure skills under `skills/infrastructure/`: `aws`, `fly-io`, `gcp`, `kubernetes`, `pulumi`, `railway`, `render`, `self-hosted-vps`, `terraform`
- **Method:** Phase 3 method (`ai/audits/TECHNICAL-ACCURACY-AUDIT.md`) and the 22-element standard (`docs/SKILL-STANDARDS.md`). Every skill read in full; every versioned claim, CLI command, console path, and permission claim checked against current official docs (evidence hierarchy: official product docs > official API references > official GitHub repos/release notes > official migration guides > recognized standards > reputable secondary sources). No upstream files touched; no files outside the 9 skill directories edited except this fragment.
- **Structure check:** all 9 skills are a single `SKILL.md` each (no `references/`/`examples/`/`scripts/` subdirectories, so no missing referenced files possible); all 15 template sections present in all 9 (pulumi has one additional comparison section); all `SKILL.md` files under 500 lines (310–442); all frontmatter descriptions ≤ 1024 chars; all related-skill backtick references resolve to existing skills; no relative Markdown links exist in any of the 9 (no broken internal links possible). No duplicated skills and no consolidation-worthy overlap found: `aws`/`gcp` are provider skills, `terraform`/`pulumi` are IaC-tool skills, `railway`/`render`/`fly-io` are distinct platforms, `self-hosted-vps` is the self-hosted counterpart, `kubernetes` is provider-neutral. No unsafe shell commands, no credential leakage, no prompt-injection markers, and no fabricated capabilities found in any skill. No destructive commands are given without the surrounding review/approval workflow the skills themselves require.

## Matrix

| Skill | Category | Status | Findings (by severity) | Fixes applied | Recommended verification status |
|---|---|---|---|---|---|
| `aws` | infrastructure | PASS | 0 | — | verified |
| `fly-io` | infrastructure | PASS | 0 | — | verified |
| `gcp` | infrastructure | FIXED | 3 (1 High, 2 Low) | 3 | verified |
| `kubernetes` | infrastructure | FIXED | 1 (1 Medium) | 1 | verified |
| `pulumi` | infrastructure | FIXED | 2 (1 Medium, 1 Low) | 2 | verified |
| `railway` | infrastructure | FIXED | 3 (1 Medium, 2 Low) | 3 | verified |
| `render` | infrastructure | PASS | 0 | — | verified |
| `self-hosted-vps` | infrastructure | FIXED | 1 (1 Low) | 1 | verified |
| `terraform` | infrastructure | FIXED | 1 (1 Low) | 1 | verified |

## Per-skill findings

### `aws` — PASS (0 findings)

Verified against current official AWS docs. AWS CLI v2 2.41.0 released 2026-11-17 (claim as dated is accurate; 2.41.1/2.41.2 followed on 2026-11-18/19). All CLI commands valid (`aws sts get-caller-identity`, `aws ec2 create-vpc`/`create-subnet` with `--tag-specifications`, `aws secretsmanager create-secret`/`get-secret-value --query SecretString`, `aws logs tail --follow`, `aws cloudwatch put-metric-alarm` with correct `AWS/ApplicationELB` namespace and `HTTPCode_Target_5XX_Count` metric). IAM guidance (Identity Center, temporary credentials, least privilege, no `0.0.0.0/0` on admin/DB ports), Well-Architected six pillars, S3 Block Public Access default, and Secrets Manager rotation guidance all correct. No changes made.

### `fly-io` — PASS (0 findings)

Verified against current Fly.io docs. `fly launch --db mpg` provisions Managed Postgres as part of launch; `fly mpg create` / `fly mpg attach <cluster-id> -a <app>` set the pooled `DATABASE_URL` secret via PgBouncer; `fly mpg proxy` and `fly mpg connect` are the documented local-access paths. `kill_signal` default `SIGINT`, `kill_timeout` default 5s (max 300s); first deploy creates two Machines for process groups with services; rolling is the default deploy strategy; `fly releases --image` + `fly deploy --image <image> --rollback` is the documented rollback path; `fly tokens create deploy` is the documented scoped CI token; `fly scale vm shared-cpu-2x --memory 1024` and `fly volumes create … --size 1 --region iad` are valid. The `fly.toml` example (`[http_service]` checks, `[[vm]]`, `auto_stop_machines = "stop"`, `min_machines_running`) matches the current reference. The installer guidance (download, review, then run — never pipe to shell) is correct and safe. No changes made.

### `gcp` — FIXED (1 High, 2 Low)

**G-01 — High. Cloud Run example deploys from a dead registry.**
Evidence: `skills/infrastructure/gcp/SKILL.md` (Examples, Cloud Run deploy) used `--image gcr.io/PROJECT_ID/my-service:1.0.0`. Google shut down Container Registry for writes on 18 March 2025; new projects must use Artifact Registry (`LOCATION-docker.pkg.dev`). Sources: Google Cloud Container Registry deprecation/shutdown (corroborated by multiple secondary sources, e.g. https://www.matthewswong.com/en/blog/container-registry-gcr/ and https://www.ajayk.sh/blog/deploy-to-cloud-run-github-actions-guide/); Artifact Registry repository format `gcloud artifacts repositories create … --repository-format=docker --location=…` per Google Cloud docs.
Fix applied: example now creates the Artifact Registry repository first (`gcloud artifacts repositories create my-service --repository-format=docker --location=us-central1`) and deploys `--image us-central1-docker.pkg.dev/PROJECT_ID/my-service/my-service:1.0.0`, with a note that `gcr.io` stopped accepting writes on 18 March 2025.

**G-02 — Low. Sustained-use discounts mis-scoped.**
Evidence: Performance Considerations said "sustained-use pricing is automatic for the rest" after naming Compute Engine and Cloud SQL, implying SUDs cover Cloud SQL. Sustained-use discounts apply to Compute Engine only (including GKE nodes on Compute Engine); Cloud SQL has committed-use discounts only. Source: Google Cloud discount documentation (https://docs.cloud.google.com/docs/cuds-multiprice) and ProsperOps comparison (https://www.prosperops.com/blog/google-cloud-discounts/).
Fix applied: reworded to state SUDs apply automatically but only to eligible Compute Engine usage, not to Cloud SQL or other services.

**G-03 — Low. `gcloud components update` stated unconditionally.**
Evidence: Prerequisites said "Run `gcloud components update` to stay current". That command only updates tarball installs; package-manager installs update through the package manager. Source: Google Cloud SDK install docs (corroborated by https://techcommune.org/docs/cloud-tutorials/gcloud-cli.html).
Fix applied: added the parenthetical "(tarball installs; package-manager installs update through the package manager)".

Also verified, no change needed: gcloud CLI 594.0.0 released 2026-11-17 (Google Cloud release notes, https://docs.cloud.google.com/release-notes#November_17_2026); the Cloud Storage sequential-naming guidance ("avoid sequential prefixes… randomize the leading characters") is still Google's current documented recommendation (https://docs.cloud.google.com/storage/docs/request-rate) — an initial suspicion that it was retired was checked and disproved; uniform bucket-level access is the default for new buckets; `gcloud run deploy`, `gcloud secrets create/add-iam-policy-binding`, `gcloud container clusters create-auto`, `gcloud storage cp`, and the `gcloud logging read` filter are all valid; Cloud Run functions, Binary Authorization on GKE/Cloud Run, and Workload Identity Federation claims are correct.

### `kubernetes` — FIXED (1 Medium)

**K-01 — Medium. Helm example claims a version pin that does nothing.**
Evidence: `skills/infrastructure/kubernetes/SKILL.md` (Examples) showed `helm upgrade --install my-app ./charts/my-app … --version 1.4.2` under the heading "pinned to a chart version". `--version` selects a version only for chart-repository and OCI references; for a local chart directory the version comes from the chart's own `Chart.yaml`, so the flag has no effect there. Source: Helm `helm install` reference (https://helm.sh/docs/helm/helm_install/) — `--version` is documented only in the chart-reference flow ("It will install the latest stable version of that chart until you… supply a version number with the '--version' flag").
Fix applied: example now installs from an OCI reference (`oci://ghcr.io/example/charts/my-app --version 1.4.2`, the form the Helm docs use for pinned installs) with a note explaining `--version` does not apply to local chart directories.

Also verified, no change needed: Kubernetes 1.37 released 2026-08-26, latest patch 1.37.2 (tagged 2026-10-27); supported minors 1.37/1.36/1.35; 1.34 EOL 2026-10-27 (https://endoflife.date/kubernetes); Helm 4.3.2 released 2026-11-13 and Helm 3 security fixes end 2027-02-10 (Helm project EOL post, 2 June 2026); kubectl version-skew rule, HPA `autoscaling/v2` example, Deployment example (`seccompProfile: RuntimeDefault`, probes, requests/limits), and all kubectl commands are correct.

### `pulumi` — FIXED (1 Medium, 1 Low)

**P-01 — Medium. S3 examples use deprecated inline `Bucket` arguments.**
Evidence: `skills/infrastructure/pulumi/SKILL.md` (Examples) used `versioning: { enabled: true }` and `serverSideEncryptionConfiguration` inline on `aws.s3.Bucket` (first example) and `acl: "private"` + `versioning` inline (component example). In the current provider (@pulumi/aws v7.55.0, 2026-11-13) all three are deprecated: "Deprecated: versioning is deprecated. Use the aws.s3.BucketVersioning resource instead", "Deprecated: acl is deprecated. Use the aws.s3.BucketAcl resource instead" (and likewise for `server_side_encryption_configuration`). Source: Pulumi Registry, AWS v7.55.0 — https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucket/ ; replacement shapes verified at https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketversioning/ and https://www.pulumi.com/registry/packages/aws/api-docs/s3/bucketserversideencryptionconfiguration/.
Fix applied: first example rewritten to create the bucket plus separate `BucketVersioning` (`versioningConfiguration: { status: "Enabled" }`) and `BucketServerSideEncryptionConfiguration` (`rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" } }]`) resources, with a note that the inline arguments are deprecated; component example rewritten to create separate `BucketAcl` and `BucketVersioning` resources (with `parent: this`).

**P-02 — Low. CrossGuard policy example validates a deprecated property.**
Evidence: the policy example used `validateResourceOfType(aws.s3.Bucket, …)` checking `bucket.acl === "public-read"`. The inline `acl` argument is deprecated; ACLs are now managed by the separate `aws.s3.BucketAcl` resource. Source: same Pulumi Registry v7.55.0 Bucket docs as P-01.
Fix applied: policy retargeted to `validateResourceOfType(aws.s3.BucketAcl, (acl, …) => { if (acl.acl === "public-read") … })`.

Also verified, no change needed: Pulumi CLI 3.277.0 current stable as of 2026-11-18 (https://www.pulumi.com/docs/install/versions/); `pulumi watch` and bare `pulumi logs` were removed in 3.273.0 (2026-10-28) per the official changelog (https://www.pulumi.com/releases/changelog/); DIY backends (S3, Azure Blob, GCS, PostgreSQL, filesystem), `pulumi login s3://…`, `pulumi config set … --secret`, `pulumi preview --diff`, `pulumi stack output --show-secrets`, `pulumi state mv/rm/unprotect`, `protect: true`, and CrossGuard enforcement levels are all correct; the Terraform comparison points (BUSL 1.1 since 1.6, Terraform Policy GA in 1.17, Sentinel on HCP Terraform/Enterprise) check out against the `terraform` skill and HashiCorp sources.

### `railway` — FIXED (1 Medium, 2 Low)

**R-01 — Medium. Config-as-Code deprecation omits the hard cutoff date.**
Evidence: Prerequisites said `railway.json`/`railway.toml` are deprecated and to "Confirm current status in the official docs", but did not state that existing Config as Code files stop being read on 2026-12-01 — 11 days after this audit — which is load-bearing for migration planning. Source: Railway docs, Infrastructure as Code (https://docs.railway.com/infrastructure-as-code): "Existing Config as Code files stop being read on 2026-12-01 (hard cutoff)."
Fix applied: added the cutoff date and the migration command (`railway config migrate`).

**R-02 — Low. PgBouncer command is a command group, not the enable command.**
Evidence: Performance Considerations said to enable pooling with "`railway postgres pgbouncer`". `railway postgres pgbouncer` is the command group; enabling pooling is `railway postgres pgbouncer add` (subcommands: `status`, `add`, `remove`, `configure`, `scale`). Source: Railway docs (https://docs.railway.com/cli/postgres).
Fix applied: changed to `railway postgres pgbouncer add`.

**R-03 — Low. Dockerfile example pins a maintenance-line Node.**
Evidence: Examples used `FROM node:24-alpine`. Node 24 is in maintenance; Node 26 LTS is the current line (repo Phase 3 standard). Fix applied: `FROM node:26-alpine`.

Also verified, no change needed: `railway.json`/`railway.toml` deprecation and the `.railway/railway.ts` IaC replacement with `railway config plan`/`apply` (https://docs.railway.com/infrastructure-as-code); `railway add --database postgres` (`-d, --database <TYPE>`, https://docs.railway.com/cli/add); `railway logs -b` for build logs (`-b, --build`, https://docs.railway.com/cli/logs); the Postgres major-version-tag rule for PITR/HA (":16"; minor tags unsupported, `:latest` unsupported for HA conversion — https://docs.railway.com/cli/postgres); Railpack as the default builder; `${{ServiceName.VARIABLE}}` references; `railway variables set`, `railway run`, `railway redeploy`, `railway status`, `railway up`, `railway init`/`link` are all valid.

### `render` — PASS (0 findings)

Verified against current Render docs. Zero-downtime shutdown sequence is exactly as stated: 60 seconds after traffic switches, Render sends `SIGTERM`; the shutdown delay defaults to 30 seconds and is extendable to 300 seconds via `maxShutdownDelaySeconds` (https://render.com/docs/deploys). `render blueprints validate render.yaml` is the documented validation command, requiring Render CLI 2.7.0 or later. Pre-deploy commands are available for paid web services, private services, and background workers. Postgres storage autoscaling triggers at 90% full (+50%, rounded up to the nearest 5 GB; storage can only grow). Autoscaling requires a Pro workspace or higher. The `render.yaml` examples (`fromDatabase` + `property: connectionString`, `generateValue: true`, `sync: false`, `plan: starter`, cron schedule, `healthCheckPath`, `preDeployCommand`) all match the Blueprint specification (https://render.com/docs/blueprint-spec). Disk-backed services are single-instance and lose zero-downtime deploys, as stated. No changes made.

### `self-hosted-vps` — FIXED (1 Low)

**V-01 — Low. Compose example defaults to the `latest` tag the skill itself forbids.**
Evidence: `skills/infrastructure/self-hosted-vps/SKILL.md` (Examples) used `image: my-app:${APP_VERSION:-latest}`, so an unset `APP_VERSION` deploys `latest` — contradicting the skill's own Implementation Standard ("tag images with the Git commit SHA, and keep the previous image available so a rollback is a redeploy, not a rebuild").
Fix applied: changed to `image: my-app:${APP_VERSION:?Set APP_VERSION to a Git commit SHA}` so a missing tag fails fast instead of silently deploying `latest`.

Also verified, no change needed: Ubuntu 26.04 LTS "Resolute Raccoon" released 2026-04-23 and is the current LTS (https://canonical.com/blog/canonical-releases-ubuntu-26-04-lts-resolute-raccoon); SSH hardening directives (`PermitRootLogin no`, `PasswordAuthentication no`, `MaxAuthTries 3`, `LoginGraceTime 30`), `sshd -t` validation, `systemctl restart ssh.service`, UFW command sequence (allow SSH before enabling), `ufw allow 80,443/tcp`, Caddyfile (`reverse_proxy localhost:3000`), `caddy validate`, Nginx `proxy_pass` + forwarded headers, `nginx -t`, Compose v2 file (named volume, `depends_on` + `service_healthy`, `pg_isready` healthcheck, DB port unpublished), and `docker compose exec -T db pg_dump` backup are all correct. `postgres:17-alpine` is a supported release (PostgreSQL 17 in support); no change needed.

### `terraform` — FIXED (1 Low)

**T-01 — Low. `-minimal-refresh` presented without its documented drift tradeoff.**
Evidence: Performance Considerations described `-minimal-refresh` only as a speedup ("limits how much state Terraform re-checks during a plan"). It refreshes only resources the plan would change, so drift on untouched resources is hidden; the docs note it plans "at the expense of possibly planning against a stale record" and it should not be the only plan run against production. Source: Terraform 1.17.0 release notes (HashiCorp Discuss, https://discuss.hashicorp.com/t/terraform-v1-17-0-released/77877) and the `-minimal-refresh` implementation/behaviour analysis (https://www.aicassindra.com/blogs/cloud/terraform_1_17_policy_minimal_refresh.html).
Fix applied: added the caveat — use it for fast inner-loop plans, keep a scheduled full or `-refresh-only` plan to catch drift.

Also verified, no change needed: Terraform 1.17.2 released 2026-11-11 (https://discuss.hashicorp.com/t/terraform-v1-17-2-released/78129); 1.17.0 released 2026-10-21 with Terraform Policy GA and `-minimal-refresh`; S3 backend `use_lockfile = true` native locking; `required_version = "~> 1.17.0"`; AWS provider `~> 6.0`; `db.t4g.medium` is a valid RDS instance class; `import` blocks, `moved` blocks, `terraform test`, `check` blocks, `prevent_destroy`/`create_before_destroy`/`ignore_changes`, BUSL 1.1 since 1.6, and OpenTofu as the Linux Foundation fork are all correct.

## Batch totals

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 2 |
| Low | 7 |
| Informational | 0 |
| **Total** | **10** |

- Skills audited: 9. PASS: 3 (`aws`, `fly-io`, `render`). FIXED: 6 (`gcp`, `kubernetes`, `pulumi`, `railway`, `self-hosted-vps`, `terraform`). NEEDS-REVIEW: 0.
- Findings fixed in place: 10 of 10. Unresolved: 0.
- Files changed: 6 (`skills/infrastructure/{gcp,kubernetes,pulumi,railway,self-hosted-vps,terraform}/SKILL.md`; +51/−24 lines across those files). No other files modified by this batch (other working-tree changes present are from parallel batches and were not touched).
- Recommended verification status for all 9 skills: **verified**.

## Validation

Run from the repo root after all edits (2026-11-20):

| Check | Result |
|---|---|
| `npm run validate` | PASS with 4 warning(s) — all 4 upstream, informational, pre-existing (agentic-seo placeholder text, anthropic doc-coauthoring placeholder text, marketingskills site-architecture `/features/analytics` link, superpowers writing-plans `TBD`); none in this batch's skills |
| `npm run check:frontmatter` | PASS (277 skills) |

## Could not verify

- Nothing in scope was left unverified. Two initial suspicions were checked and disproved (no findings): the GCP Cloud Storage sequential-naming guidance is still Google's current documented recommendation, and the Pulumi `pulumi watch` / bare `pulumi logs` removal in 3.273.0 is real and correctly stated.
- Version claims are dated as of 2026-11-20; fast-moving pins (AWS CLI 2.41.x, gcloud 594.0.0, Pulumi 3.277.0, Terraform 1.17.2, Helm 4.3.2, Kubernetes 1.37.2) will drift on their normal release cadence and should be re-checked at the next audit cycle.
