---
name: aws
description: >
  Use this skill when building, deploying, or operating workloads on Amazon
  Web Services (AWS): EC2, Lambda, ECS, EKS, S3, RDS, Aurora, DynamoDB, VPC
  networking, IAM, Secrets Manager, CloudWatch, CloudTrail, CloudFormation,
  scaling, disaster recovery, cost optimization, and production operations.
  Trigger keywords: AWS, Amazon Web Services, EC2, Lambda, ECS, EKS, S3,
  RDS, Aurora, DynamoDB, VPC, IAM, CloudWatch, CloudTrail, CloudFormation,
  Secrets Manager, Route 53, cost optimization, disaster recovery.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# AWS

## Purpose

This skill covers building and operating production workloads on Amazon Web
Services: choosing compute, storage, and database services; designing VPC
networking and IAM access; managing secrets; observing with CloudWatch and
CloudTrail; scaling; recovering from failure; and controlling cost. It
produces AWS architectures that are secure by default, observable, and
operable under the AWS Well-Architected Framework's six pillars:
operational excellence, security, reliability, performance efficiency, cost
optimization, and sustainability.

## When to Use

- Choosing AWS services for a new application or migrating a workload to AWS.
- Designing a VPC: subnets, route tables, security groups, NAT, and endpoints.
- Setting up IAM users, roles, and policies, or fixing an access problem.
- Storing and rotating secrets with AWS Secrets Manager or SSM Parameter Store.
- Deploying compute: EC2, Lambda, ECS, or EKS.
- Setting up managed databases: RDS, Aurora, or DynamoDB.
- Adding monitoring, logging, and alerting with CloudWatch and CloudTrail.
- Planning scaling, disaster recovery, or cost optimization on AWS.
- Automating AWS infrastructure with CloudFormation or the AWS CLI.

## When Not to Use

- Google Cloud workloads — use `gcp`.
- Provider-neutral Kubernetes concepts — use `kubernetes` (EKS specifics
  stay here).
- Terraform or Pulumi as the provisioning tool — use `terraform` or
  `pulumi`; this skill covers the AWS resources they manage.
- Container image authoring — use `docker`.
- The release process itself — use `deployment` and `ci-cd`.
- General observability design — use `observability`; this skill covers
  the AWS-native tooling.

## Prerequisites

- An AWS account with a defined home Region and billing alerts enabled.
- AWS CLI v2 installed (the current major version; 2.42.1 was the latest
  release at last verification) and authenticated, preferably through IAM
  Identity Center (`aws configure sso`) rather than long-term access keys.
- The target Region(s) and Availability Zones decided, with data-residency
  and latency requirements understood.
- A tagging convention agreed before resources are created (for example
  `Environment`, `Service`, `Owner`), so cost and ownership stay traceable.
- Infrastructure defined as code (CloudFormation, `terraform`, or
  `pulumi`) for anything beyond a throwaway experiment.

## Official Documentation

- [AWS Documentation](https://docs.aws.amazon.com/) — the docs home for
  every AWS service.
- [AWS CLI version 2 user guide](https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-changes.html) —
  what is new in CLI v2 and how it differs from v1.
- [Security best practices in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) —
  AWS's own IAM guidance: federation, temporary credentials, MFA, and
  least privilege.
- [How Amazon VPC works](https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html) —
  VPCs, subnets, route tables, gateways, and endpoints.
- [Using Amazon CloudWatch alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html) —
  metric, composite, log, and anomaly-detection alarms.
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/userguide/waf.html) —
  the six-pillar framework this skill follows.

## Required Workflow

1. Confirm the workload's requirements: traffic pattern, latency, data
   durability, compliance, and budget.
2. Pick the Region (and a second Region for disaster recovery when the
   workload needs it) and confirm the account is set up with MFA on the
   root user, billing alerts, and CloudTrail enabled.
3. Design the network first: a VPC with public and private subnets across
   at least two Availability Zones, a NAT gateway or VPC endpoints for
   private outbound access, and security groups that allow only the
   traffic each tier needs.
4. Define IAM access: roles for workloads and federated human access via
   IAM Identity Center; no long-term access keys for applications.
5. Choose the compute and data services that fit the workload, and define
   them as code with versioned templates.
6. Put secrets in Secrets Manager (or Parameter Store for non-rotating
   configuration) and grant access through IAM roles, never through
   environment variables baked into images.
7. Add observability before launch: CloudWatch metrics, logs, and alarms
   for the golden signals, plus CloudTrail for API auditing.
8. Verify the deployment end to end in a non-production account or
   environment, then promote the same artifact to production.
9. Test the failure modes: fail over to the second Availability Zone,
   restore a database backup, and confirm alarms fire.
10. Review cost after the first billing period with Cost Explorer and
    right-size what is idle or oversized.

## Implementation Standards

- Every resource is created by infrastructure as code and carries the
  agreed tags; console-created resources are treated as drift.
- Production workloads run in private subnets across at least two
  Availability Zones; only load balancers live in public subnets.
- Data at rest is encrypted: S3 buckets use SSE-S3 or SSE-KMS, EBS volumes
  and RDS instances use KMS encryption, and secrets use Secrets Manager.
- S3 buckets block public access by default; public access requires an
  explicit, reviewed exception.
- Databases use automated backups with a defined retention period, and
  production databases are Multi-AZ.
- All state-changing work goes through a reviewed change (pull request or
  pipeline approval), never through direct console edits in production.
- Use AWS managed services over self-managed equivalents when the managed
  service meets the requirement; it removes undifferentiated operations.
- Pin the AWS provider and CLI versions used by pipelines so builds are
  reproducible.

### Testing Strategy

- Test infrastructure changes in a sandbox account first: review the plan output (`terraform plan`, `cdk diff`) and apply to a non-production account before production.
- Test IAM policies with the IAM Policy Simulator or Access Analyzer before attaching them, and verify that a denied action actually fails.
- Test backups by restoring them to a sandbox account on a schedule; a backup that has never been restored is a hope, not a recovery plan.
- Test Multi-AZ failover and billing alerts in staging so the first real failure is not the first test of either.

## Best Practices

- Use IAM Identity Center for human access and IAM roles for workloads;
  both issue temporary credentials and remove the need for access keys.
- Prefer VPC endpoints for AWS services (S3, DynamoDB) so private-subnet
  traffic never crosses the public internet.
- Use Application Load Balancer in front of web workloads and let it
  terminate TLS; keep certificates in ACM.
- Let Auto Scaling groups and managed scaling (Lambda concurrency, ECS
  service auto scaling, DynamoDB on-demand or auto scaling) absorb
  traffic changes instead of statically sizing for peak.
- Use S3 lifecycle rules to move aging objects to cheaper storage
  classes, and S3 versioning plus Object Lock where retention matters.
- Centralize logs in CloudWatch Logs with a retention policy, and ship
  audit logs (CloudTrail, VPC Flow Logs) to a separate, access-restricted
  account or bucket.
- Use AWS Budgets with alerts at 50%, 80%, and 100% of the expected spend
  so cost surprises arrive as notifications, not invoices.
- Keep a runbook for every alarm: what it means, how to confirm it, and
  what to do.

## Security Considerations

- Protect the root user: enable MFA, lock away its credentials, and never
  use it for daily work.
- Apply least privilege everywhere: IAM policies grant only the actions
  and resources a role needs; avoid `Action: "*"` and `Resource: "*"`
  except where a service genuinely requires them.
- Enable CloudTrail in all Regions, GuardDuty for threat detection, and
  AWS Config or Security Hub for continuous posture checks.
- Never put credentials in code, images, or environment variables that
  are committed; use Secrets Manager with automatic rotation where the
  service supports it.
- Restrict security groups to the smallest source ranges; never open
  SSH (22), RDP (3389), or database ports to `0.0.0.0/0`.
- Enable MFA Delete on S3 buckets holding critical data, and versioning
  on every bucket that holds anything irreplaceable.
- Use IAM Access Analyzer to find resources shared externally and to
  validate policies before they ship.
- Isolate environments with separate AWS accounts (via AWS Organizations)
  rather than with naming conventions inside one account.

## Performance Considerations

- Put compute close to users: pick Regions by measured latency, and use
  CloudFront for static content and caching at the edge.
- Use Auto Scaling with target-tracking policies on a meaningful metric
  (request count, CPU, or queue depth), not on a fixed schedule.
- For DynamoDB, design the partition key for even distribution; hot
  partitions throttle while the table still has capacity.
- For RDS, use read replicas for read-heavy workloads and Performance
  Insights to find slow queries before scaling the instance.
- S3 request rates scale automatically, but listing large prefixes and
  small-object churn are the usual bottlenecks; batch and prefix-partition
  accordingly.
- Lambda cold starts matter for latency-sensitive paths: keep functions
  small, reuse connections outside the handler, and use provisioned
  concurrency only where the latency budget requires it.
- Watch data-transfer costs: traffic between Availability Zones and out
  to the internet is metered; keep chatty services in the same zone
  where consistency allows it.

## Common Mistakes

- Running everything in the default VPC — it has public subnets and
  permissive defaults; create a purpose-built VPC instead.
- Using the root user or long-term access keys for daily work — use IAM
  Identity Center and roles with temporary credentials.
- Opening security groups to `0.0.0.0/0` to "make it work" — restrict to
  the load balancer's security group or a known CIDR.
- Storing secrets in environment variables or code — use Secrets Manager
  and grant access by IAM role.
- Single-AZ deployments for production — one Availability Zone failure
  becomes a full outage; spread across at least two.
- No billing alarms — the first sign of a runaway resource should be an
  alert, not the monthly invoice.
- Deploying by hand in the console — undocumented, unreviewed, and
  unrepeatable; use infrastructure as code.
- Forgetting to test restores — a backup that has never been restored is
  a hope, not a recovery plan.

## Examples

Confirm identity and Region before doing anything else:

  [scripts/check-identity.sh](./scripts/check-identity.sh).

Create a VPC with a private CIDR range (from the official VPC tutorial):

  [scripts/create-vpc.sh](./scripts/create-vpc.sh).

Create a subnet in one Availability Zone:

  [scripts/create-subnet.sh](./scripts/create-subnet.sh).

Store a secret and read it back (never print secrets in CI logs):

  [scripts/store-secret.sh](./scripts/store-secret.sh).

Tail Lambda logs in real time:

  [scripts/tail-lambda-logs.sh](./scripts/tail-lambda-logs.sh).

Create a CloudWatch alarm on 5xx errors from an Application Load
Balancer, notifying an SNS topic:

  [scripts/create-5xx-alarm.sh](./scripts/create-5xx-alarm.sh).

## Validation Checklist

- [ ] Root user has MFA and is not used for daily work; human access goes
      through IAM Identity Center.
- [ ] CloudTrail is enabled in all Regions and logs are protected.
- [ ] Production resources run in private subnets across at least two
      Availability Zones.
- [ ] No security group allows administrative or database ports from
      `0.0.0.0/0`.
- [ ] All secrets live in Secrets Manager or Parameter Store; none appear
      in code, images, or logs.
- [ ] Data stores have encryption at rest, backups, and a tested restore.
- [ ] CloudWatch alarms exist for error rate, latency, and availability,
      with runbooks.
- [ ] Billing alerts are configured and the first cost review is scheduled.
- [ ] All infrastructure is defined as code and tagged.

## Expected Deliverables

- The AWS architecture: VPC, compute, data, and IAM resources defined as
  code and deployed.
- A network diagram or written description of subnets, routing, and
  security-group rules.
- Secrets stored in Secrets Manager with rotation where supported.
- CloudWatch dashboards, alarms, and runbooks for the workload.
- A disaster-recovery note: RPO/RTO targets, backup schedule, and the
  tested restore procedure.
- A cost baseline with budgets and alerts configured.

## References

- [AWS Documentation](https://docs.aws.amazon.com/) — docs home for
  every AWS service.
- [Security best practices in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) —
  IAM guidance from AWS.
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/userguide/waf.html) —
  the six-pillar framework.
- Related skills in this repository: `terraform`, `pulumi`,
  `kubernetes`, `docker`, `deployment`, `ci-cd`, `observability`,
  `secrets-management`, `backup-recovery`, `database-security`.
