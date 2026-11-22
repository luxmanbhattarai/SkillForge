- Every resource is created by infrastructure as code and carries the
  agreed labels; console-created resources are treated as drift.
- Production workloads run in private subnets across at least two
  zones; only load balancers and Cloud Run ingress accept public
  traffic.

- All state-changing work goes through a reviewed change (pull request
  or pipeline approval), never through direct console edits in
  production.
- Use managed services over self-managed equivalents when the managed
  service meets the requirement; it removes undifferentiated operations.
- Pin the provider and CLI versions used by pipelines so builds are
  reproducible.
