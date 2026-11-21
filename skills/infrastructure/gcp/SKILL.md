---
name: gcp
description: >
  Use this skill when building, deploying, or operating workloads on Google
  Cloud Platform (GCP): Compute Engine, Cloud Run, GKE, Cloud Storage, Cloud
  SQL, VPC networking, Cloud IAM, Secret Manager, Cloud Monitoring and
  Logging, Cloud Build, scaling, disaster recovery, cost optimization, and
  production operations. Trigger keywords: GCP, Google Cloud, gcloud,
  Compute Engine, Cloud Run, GKE, Kubernetes Engine, Cloud Storage, Cloud
  SQL, IAM, Secret Manager, Cloud Monitoring, Cloud Logging, Cloud Build.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# GCP

## Purpose

This skill covers building and operating production workloads on Google
Cloud Platform: choosing compute, storage, and database services;
designing VPC networks and Cloud IAM access; managing secrets with Secret
Manager; observing with Cloud Monitoring and Cloud Logging; scaling;
recovering from failure; and controlling cost. It produces GCP
architectures that are secure by default, observable, and operable,
following Google Cloud's own architecture and security guidance.

## When to Use

- Choosing GCP services for a new application or migrating a workload
  to Google Cloud.
- Designing a VPC network: subnets, firewall rules, Cloud NAT, and
  Private Service Connect.
- Setting up Cloud IAM roles, service accounts, and Workload Identity
  Federation, or fixing an access problem.
- Storing and rotating secrets with Secret Manager.
- Deploying compute: Compute Engine, Cloud Run, Cloud Run functions,
  or GKE.
- Setting up managed databases: Cloud SQL, Cloud Spanner, or Firestore.
- Adding monitoring, logging, and alerting with Cloud Monitoring and
  Cloud Logging.
- Planning scaling, disaster recovery, or cost optimization on GCP.
- Automating GCP infrastructure with the gcloud CLI, Deployment
  Manager, or an IaC tool.

## When Not to Use

- AWS workloads — use `aws`.
- Provider-neutral Kubernetes concepts — use `kubernetes` (GKE
  specifics stay here).
- Terraform or Pulumi as the provisioning tool — use `terraform` or
  `pulumi`; this skill covers the GCP resources they manage.
- Container image authoring — use `docker`.
- The release process itself — use `deployment` and `ci-cd`.
- General observability design — use `observability`; this skill covers
  the Google Cloud-native tooling.

## Prerequisites

- A Google Cloud project (or organization with folders per environment)
  with billing enabled and a budget alert configured.
- Google Cloud CLI (`gcloud`) installed and authenticated; 594.0.0 was
  the latest release as of 2026-11-17. Run `gcloud components update`
  to stay current (tarball installs; package-manager installs update
  through the package manager), and `gcloud auth login` plus
  `gcloud config set project PROJECT_ID` before working.
- The target region(s) decided, with data-residency and latency
  requirements understood. Prefer multi-zone or multi-region designs
  for production.
- Required APIs enabled for the services in use (for example
  `run.googleapis.com`, `container.googleapis.com`,
  `secretmanager.googleapis.com`).
- A labeling convention agreed before resources are created (for
  example `environment`, `service`, `owner`), so cost and ownership
  stay traceable.
- Infrastructure defined as code (`terraform`, `pulumi`, or Config
  Connector) for anything beyond a throwaway experiment.

## Official Documentation

- [Google Cloud documentation](https://docs.cloud.google.com/docs) —
  the docs home for every Google Cloud product.
- [gcloud CLI overview](https://docs.cloud.google.com/sdk/gcloud) —
  the Google Cloud CLI, its command patterns, and the current version.
- [Install the Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install) —
  installation and initialization for every platform.
- [GKE security best practices](https://docs.cloud.google.com/docs/security/gke-security-bps) —
  Google's security guidance for GKE workloads.
- [Configure secrets for Cloud Run jobs](https://docs.cloud.google.com/run/docs/configuring/jobs/secrets) —
  Secret Manager integration with Cloud Run.
- [Secret Manager event notifications](https://docs.cloud.google.com/secret-manager/docs/event-notifications) —
  Pub/Sub notifications for secret changes.

## Required Workflow

1. Confirm the workload's requirements: traffic pattern, latency, data
   durability, compliance, and budget.
2. Pick the region (and a second region for disaster recovery when the
   workload needs it) and confirm the project has billing alerts, audit
   logging, and the required APIs enabled.
3. Design the network first: a VPC with subnets per region, firewall
   rules that allow only needed traffic, Cloud NAT for private outbound
   access, and Private Service Connect or VPC peering where services
   must stay private.
4. Define IAM access: least-privilege roles on dedicated service
   accounts per workload, and Workload Identity Federation for
   workloads outside Google Cloud; no user-managed service account
   keys unless a third party genuinely requires them.
5. Choose the compute and data services that fit the workload, and
   define them as code with versioned configuration.
6. Put secrets in Secret Manager and grant access through IAM roles;
   mount them as volumes or environment variables in Cloud Run and
   GKE, never bake them into images.
7. Add observability before launch: Cloud Monitoring metrics and
   uptime checks, Cloud Logging with structured logs, and alert
   policies for the golden signals.
8. Verify the deployment end to end in a non-production project, then
   promote the same artifact to production.
9. Test the failure modes: fail over across zones, restore a database
   backup, and confirm alerts fire.
10. Review cost after the first billing period with the Cloud Billing
    reports and right-size what is idle or oversized.

## Implementation Standards

- Every resource is created by infrastructure as code and carries the
  agreed labels; console-created resources are treated as drift.
- Production workloads run in private subnets across at least two
  zones; only load balancers and Cloud Run ingress accept public
  traffic.
- Data at rest is encrypted with Google-managed keys by default; use
  customer-managed keys (CMEK) via Cloud KMS where the workload's
  compliance needs them.
- Cloud Storage buckets are private by default (uniform bucket-level
  access enabled); public access requires an explicit, reviewed
  exception.
- Databases use automated backups with a defined retention period, and
  production databases are highly available (regional Cloud SQL,
  multi-region Spanner or Firestore where needed).
- All state-changing work goes through a reviewed change (pull request
  or pipeline approval), never through direct console edits in
  production.
- Use managed services over self-managed equivalents when the managed
  service meets the requirement; it removes undifferentiated operations.
- Pin the provider and CLI versions used by pipelines so builds are
  reproducible.

### Testing Strategy

- Test infrastructure changes in a sandbox project first: review the
  plan output and apply to a non-production project before production.
- Test IAM bindings with the Policy Simulator before granting them,
  and verify that a denied action actually fails.
- Test Cloud Run revisions with traffic splitting: shift a small share
  of traffic to the new revision and roll back on error before
  promoting it fully.
- Test backups by restoring them: a Cloud SQL point-in-time recovery
  rehearsed in staging is the only proof the retention setting works.
- Test budget alerts by confirming they fire at their thresholds in a
  test project, not by discovering a missing alert on the real bill.

## Best Practices

- Give every workload its own service account with only the roles it
  needs; never share the Compute Engine default service account across
  services, and never grant it broad roles.
- Use Workload Identity Federation for GKE so Kubernetes service
  accounts map to Google service accounts without keys.
- Prefer Cloud Run for stateless containerized services: it scales to
  zero, manages TLS, and removes cluster operations; use GKE when you
  need Kubernetes features Cloud Run does not offer.
- Put Cloud Load Balancing in front of public services and Cloud Armor
  in front of anything facing the internet.
- Use Cloud Storage lifecycle rules to move aging objects to cheaper
  storage classes, and Object Versioning plus retention policies where
  retention matters.
- Centralize logs in Cloud Logging with a defined retention, and export
  audit logs to a separate, access-restricted project or bucket.
- Set budget alerts at 50%, 80%, and 100% of expected spend so cost
  surprises arrive as notifications, not invoices.
- Keep a runbook for every alert: what it means, how to confirm it, and
  what to do.

## Security Considerations

- Apply least privilege everywhere: grant predefined roles at the
  narrowest scope (project, folder, or resource) and prefer custom
  roles only when no predefined role fits.
- Never create user-managed service account keys unless an external
  system cannot use federation; keys are long-lived credentials that
  leak. Rotate any that exist and track them in the console.
- Enable Cloud Audit Logs (Admin Activity is on by default; enable Data
  Access logs for sensitive services) and Security Command Center for
  posture findings.
- Never put credentials in code, images, or environment variables that
  are committed; use Secret Manager with versioning and rotation.
- Restrict firewall rules to the smallest source ranges; never open SSH
  (22), RDP (3389), or database ports to `0.0.0.0/0`. Use Identity-Aware
  Proxy for administrative access instead of public IPs.
- Enable VPC Service Controls for sensitive projects to reduce the risk
  of data exfiltration.
- Use Binary Authorization on GKE and Cloud Run to deploy only signed,
  verified images.
- Isolate environments with separate projects under folders (and
  separate organizations only when tenancy demands it) rather than with
  naming conventions inside one project.

## Performance Considerations

- Put compute close to users: pick regions by measured latency, and use
  Cloud CDN for static content and caching at the edge.
- Cloud Run scales on request count by default; set minimum instances
  only where cold starts break the latency budget, and set maximum
  instances to bound cost.
- For GKE, use node auto-provisioning and the Horizontal Pod Autoscaler
  together, and set resource requests honestly — the scheduler and the
  autoscaler both trust them.
- For Cloud SQL, use read replicas for read-heavy workloads and Query
  Insights to find slow queries before scaling the instance.
- Cloud Storage throughput scales with object naming: avoid sequential
  prefixes for high-rate writes; randomize the leading characters.
- Watch egress costs: traffic between regions and out to the internet
  is metered; keep chatty services in the same region where consistency
  allows it.
- Use committed use discounts for steady-state Compute Engine and Cloud
  SQL capacity; sustained-use discounts apply automatically, but only to
  eligible Compute Engine usage (including GKE nodes), not to Cloud SQL
  or other services.

## Common Mistakes

- Using the default service account with the Editor role — it is
  over-privileged and shared; create dedicated service accounts.
- Creating service account keys for code running on GCP — workloads on
  GCP get credentials from the metadata server automatically.
- Opening firewall rules to `0.0.0.0/0` to "make it work" — restrict to
  the load balancer or a known CIDR.
- Storing secrets in environment variables or code — use Secret
  Manager and grant access by IAM role.
- Single-zone deployments for production — one zone failure becomes a
  full outage; spread across at least two zones.
- No budget alerts — the first sign of a runaway resource should be an
  alert, not the monthly invoice.
- Deploying by hand in the console — undocumented, unreviewed, and
  unrepeatable; use infrastructure as code.
- Forgetting to test restores — a backup that has never been restored
  is a hope, not a recovery plan.

## Examples

Confirm identity and project before doing anything else:

```bash
gcloud auth list
gcloud config get-value project
```

Deploy a containerized service to Cloud Run. Images live in Artifact
Registry — Container Registry (`gcr.io`) stopped accepting writes on
18 March 2025, so new projects must not use it:

```bash
gcloud artifacts repositories create my-service \
  --repository-format=docker --location=us-central1

gcloud run deploy my-service \
  --image us-central1-docker.pkg.dev/PROJECT_ID/my-service/my-service:1.0.0 \
  --region us-central1 \
  --allow-unauthenticated \
  --max-instances 10
```

Create a secret and grant a service account access to it:

```bash
echo -n "CHANGE_ME" | gcloud secrets create db-password --data-file=-
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:my-service@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Create a regional GKE cluster (Autopilot manages the nodes):

```bash
gcloud container clusters create-auto my-cluster \
  --region us-central1 \
  --project PROJECT_ID
```

Copy a file to Cloud Storage:

```bash
gcloud storage cp ./dist/app.tar.gz gs://my-bucket/releases/
```

Tail Cloud Run logs:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" resource.labels.service_name="my-service"' \
  --limit 50 --format json
```

## Validation Checklist

- [ ] No user-managed service account keys exist unless an external
      system genuinely requires them.
- [ ] Each workload runs with its own service account and
      least-privilege roles.
- [ ] Cloud Audit Logs are enabled and exported to a protected location.
- [ ] No firewall rule allows administrative or database ports from
      `0.0.0.0/0`.
- [ ] All secrets live in Secret Manager; none appear in code, images,
      or logs.
- [ ] Data stores have backups and a tested restore.
- [ ] Cloud Monitoring alert policies exist for error rate, latency,
      and availability, with runbooks.
- [ ] Budget alerts are configured and the first cost review is
      scheduled.
- [ ] All infrastructure is defined as code and labeled.

## Expected Deliverables

- The GCP architecture: VPC, compute, data, and IAM resources defined
  as code and deployed.
- A network description: subnets, firewall rules, and how services
  reach each other.
- Secrets stored in Secret Manager with access granted by IAM role.
- Cloud Monitoring dashboards, alert policies, and runbooks for the
  workload.
- A disaster-recovery note: RPO/RTO targets, backup schedule, and the
  tested restore procedure.
- A cost baseline with budget alerts configured.

## References

- [Google Cloud documentation](https://docs.cloud.google.com/docs) —
  docs home for every Google Cloud product.
- [gcloud CLI overview](https://docs.cloud.google.com/sdk/gcloud) —
  the Google Cloud CLI.
- [GKE security best practices](https://docs.cloud.google.com/docs/security/gke-security-bps) —
  Google's GKE security guidance.
- Related skills in this repository: `terraform`, `pulumi`,
  `kubernetes`, `docker`, `deployment`, `ci-cd`, `observability`,
  `secrets-management`, `backup-recovery`, `database-security`.
