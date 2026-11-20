---
name: kubernetes
description: >
  Use this skill when working with Kubernetes: cluster architecture,
  Deployments, StatefulSets, Jobs, Services, Ingress, ConfigMaps, Secrets,
  RBAC, networking, storage, observability, autoscaling with HPA and VPA,
  Helm charts, GitOps, security hardening, and production cluster
  operations. Trigger keywords: Kubernetes, k8s, kubectl, pod, Deployment,
  StatefulSet, Service, Ingress, Helm, RBAC, HPA, namespace, ConfigMap,
  GitOps, Argo CD, Flux, cluster.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Kubernetes

## Purpose

This skill covers running applications on Kubernetes: the control plane
and node architecture, workloads, networking, storage, RBAC, and
observability, plus Helm packaging, GitOps delivery, security hardening,
and day-to-day production operations. It produces clusters and workloads
that are declarative, observable, and safe to change — where the desired
state lives in version control and the cluster converges to it.

## When to Use

- Designing or operating a Kubernetes cluster (managed or self-hosted).
- Writing workload manifests: Deployments, StatefulSets, DaemonSets,
  Jobs, and CronJobs.
- Exposing services with Services, Ingress, and Gateway API.
- Managing configuration and secrets with ConfigMaps and Secrets.
- Setting up RBAC, NetworkPolicies, and Pod Security Standards.
- Adding storage with PersistentVolumes and StorageClasses.
- Scaling with the Horizontal Pod Autoscaler (HPA) or Vertical Pod
  Autoscaler (VPA).
- Packaging applications with Helm charts.
- Delivering with GitOps (Argo CD, Flux).
- Debugging a workload that will not schedule, start, or stay healthy.

## When Not to Use

- Managed Kubernetes specifics on one cloud — use `aws` for EKS or
  `gcp` for GKE; this skill covers the provider-neutral core.
- Container image authoring — use `docker`.
- The release process around the cluster — use `deployment` and `ci-cd`.
- General observability design — use `observability`; this skill covers
  the Kubernetes-native pieces (metrics-server, Prometheus, events).
- Provisioning the cluster itself with IaC — use `terraform` or
  `pulumi`.

## Prerequisites

- A running cluster, or a plan to create one (managed: EKS, GKE, AKS;
  local: kind, minikube, k3s).
- `kubectl` installed and configured with a kubeconfig for the target
  cluster; keep the kubectl minor version within one minor of the
  cluster's server version.
- Kubernetes 1.37 is the current stable minor (released 2026-08-26;
  latest patch 1.37.2 as of 2026-10-28); supported minors are 1.37,
  1.36, and 1.35. Version 1.34 reached end of life on 2026-10-27.
  New clusters should use a supported minor.
- Helm 4 for packaging (4.3.2 was the latest release as of 2026-11-13);
  Helm 3 receives security fixes only until 2027-02-10 and should not
  be used for new work.
- Container images published to a registry the cluster can reach.
- Namespaces planned per environment or team before workloads are
  applied.

## Official Documentation

- [Kubernetes documentation](https://kubernetes.io/docs/home/) — the
  docs home: concepts, tasks, and tutorials.
- [kubectl reference](https://kubernetes.io/docs/reference/kubectl/) —
  the kubectl command-line tool reference.
- [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/) —
  commonly used kubectl commands and flags, current for v1.37.
- [Helm docs: Using Helm](https://helm.sh/docs/intro/using_helm/) —
  installing, customizing, and managing Helm releases.
- [helm install reference](https://helm.sh/docs/helm/helm_install/) —
  the `helm install` command and its flags.

## Required Workflow

1. Confirm the target cluster and context (`kubectl config
   current-context` and `kubectl cluster-info`) before applying
   anything — the wrong context deploys to the wrong cluster.
2. Create a namespace for the workload; never run application workloads
   in `default` or `kube-system`.
3. Write manifests declaratively (YAML in version control), with
   resource requests and limits, probes, labels, and a non-root
   security context on every workload.
4. Validate before applying: `kubectl apply --dry-run=server -f` and
   `kubectl explain` for unfamiliar fields.
5. Apply with `kubectl apply -f` or, for teams, through a GitOps
   controller so the cluster state is continuously reconciled from Git.
6. Verify rollout: `kubectl rollout status`, `kubectl get pods`, and
   the application's health endpoint.
7. Add observability: metrics-server or Prometheus scraping, structured
   logs to stdout, and alerts on restart counts and readiness.
8. Set up scaling (HPA on CPU, memory, or custom metrics) and confirm
   it reacts under load before production traffic arrives.
9. Test failure modes: delete a pod, drain a node, and confirm the
   workload recovers within its SLO.
10. Document the workload: namespace, resources, scaling, and the
    rollback procedure.

## Implementation Standards

- Everything is declarative and in version control: no imperative
  `kubectl run` or `kubectl edit` in production.
- Every container sets CPU and memory requests and limits; requests
  drive scheduling, limits bound noisy neighbors.
- Every workload defines readiness and liveness probes; readiness
  gates traffic, liveness restarts a wedged process.
- Pods run as non-root with a read-only root filesystem where the
  application allows it, and drop unneeded Linux capabilities.
- Images are pinned by digest or immutable tag; `latest` is never used
  in production.
- Secrets are never stored in plain YAML in Git; use an external
  secrets operator, sealed secrets, or the cloud secret manager.
- Deployments use rolling updates with `maxUnavailable: 0` (or a
  deliberate value) and a PodDisruptionBudget for availability during
  node maintenance.
- Namespaces carry resource quotas and limit ranges so one team cannot
  starve the cluster.

## Best Practices

- One Deployment per service, with a Service in front of it; expose
  externally only through Ingress or Gateway API, never with
  `NodePort` or host ports in production.
- Use Helm charts (or Kustomize overlays) to parameterize environments
  instead of copying YAML per environment.
- Keep manifests small and composable; prefer a chart per application
  over one giant chart for everything.
- Label everything consistently (`app.kubernetes.io/name`,
  `app.kubernetes.io/instance`, `app.kubernetes.io/version`) so
  selection, dashboards, and cleanup work.
- Use the cluster autoscaler together with the HPA: HPA scales pods,
  the cluster autoscaler scales nodes.
- Prefer StatefulSets only when the workload needs stable identity or
  storage; most services are Deployments.
- Run `kubectl get events --sort-by=.lastTimestamp` early when
  debugging — events usually name the problem.
- Upgrade one minor at a time, in a non-production cluster first, and
  read the release notes for removed APIs before each hop.

## Security Considerations

- RBAC is mandatory: bind the least-privilege Role or ClusterRole to
  each service account; never bind `cluster-admin` to an application.
- Enable Pod Security Standards (`restricted` for application
  namespaces) and enforce them with admission control.
- Use NetworkPolicies to deny traffic by default and allow only the
  flows each workload needs; without a NetworkPolicy, all pods can
  reach all pods.
- Protect the API server: restrict who can reach it, require
  authentication for every request, and audit API access.
- Scan images for known vulnerabilities and admit only images from
  trusted registries; use admission control to enforce it.
- Secrets in etcd are base64-encoded, not encrypted, unless encryption
  at rest is enabled — enable it, and prefer an external secret store.
- Never mount the Docker socket or the host filesystem into a
  container; never run privileged containers in production.
- Keep the cluster on a supported minor version; end-of-life versions
  receive no security patches.
- Limit `kubectl` access: kubeconfig files are credentials — never
  commit them, share them in chat, or bake them into images.

## Performance Considerations

- Requests and limits are the performance contract: undersized
  requests cause throttling and OOM kills; oversized requests waste
  capacity and block scheduling.
- The HPA needs metrics-server (or a custom metrics provider) and a
  stabilization window tuned so it does not flap under bursty load.
- Node sizing matters: fewer, larger nodes reduce per-node overhead;
  more, smaller nodes limit the blast radius of a node failure.
- etcd is the cluster's bottleneck: keep the number of objects and
  the watch load reasonable, and never run heavy workloads on control
  plane nodes.
- Use readiness probes with realistic timeouts so the Service stops
  sending traffic to a pod that cannot serve, without flapping.
- Image pull time dominates cold starts: keep images small, use a
  registry close to the cluster, and warm node image caches for
  latency-sensitive workloads.

## Common Mistakes

- Applying to the wrong cluster — always check the context first.
- Running workloads in `default` — namespaces exist to isolate teams
  and environments.
- No resource requests or limits — one workload can starve the node,
  and the HPA has nothing to scale on.
- No readiness probe — the Service sends traffic to pods that are
  still starting, and users see errors.
- Using `latest` image tags — rollbacks become guesswork and the
  cluster may run different code than expected.
- Secrets committed to Git in plain YAML — use an external secret
  store or sealed secrets.
- Editing live objects with `kubectl edit` — the change is lost at the
  next GitOps sync and is invisible to the team.
- One giant namespace for everything — quotas, RBAC, and NetworkPolicy
  all key off namespaces.
- Ignoring PodDisruptionBudgets — node drains take down the whole
  service instead of one replica at a time.

## Examples

A minimal Deployment with probes, resources, and a non-root security
context:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: production
  labels:
    app.kubernetes.io/name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: web
  template:
    metadata:
      labels:
        app.kubernetes.io/name: web
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: web
          image: ghcr.io/example/web:1.4.2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
```

A Service exposing the Deployment inside the cluster:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: production
spec:
  selector:
    app.kubernetes.io/name: web
  ports:
    - port: 80
      targetPort: 8080
```

A HorizontalPodAutoscaler scaling on CPU utilization:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Essential kubectl commands:

```bash
kubectl config current-context
kubectl apply --dry-run=server -f deployment.yaml
kubectl apply -f deployment.yaml
kubectl rollout status deployment/web -n production
kubectl get pods -n production
kubectl logs -f deployment/web -n production
kubectl describe pod <pod-name> -n production
kubectl rollout undo deployment/web -n production
```

Install a chart with Helm, pinned to a chart version:

```bash
helm upgrade --install my-app ./charts/my-app \
  --namespace production --create-namespace \
  --version 1.4.2 --values values-production.yaml
```

## Validation Checklist

- [ ] The correct cluster and context were confirmed before applying.
- [ ] Workloads run in a dedicated namespace, not `default`.
- [ ] Every container has CPU/memory requests and limits, and readiness
      and liveness probes.
- [ ] Pods run as non-root and images are pinned to a digest or
      immutable tag.
- [ ] No secret is stored in plain YAML in version control.
- [ ] RBAC grants least privilege; no application has `cluster-admin`.
- [ ] A NetworkPolicy restricts traffic for the workload.
- [ ] The HPA and PodDisruptionBudget are configured and tested.
- [ ] Rollout was verified and the rollback path is known.

## Expected Deliverables

- Version-controlled manifests (or a Helm chart) for the workload.
- The namespace, RBAC, NetworkPolicy, and resource quota configuration.
- Verification output: rollout status and healthy pods.
- Scaling configuration (HPA/VPA) with the metrics it scales on.
- A runbook: how to deploy, roll back, scale, and debug the workload.

## References

- [Kubernetes documentation](https://kubernetes.io/docs/home/) —
  concepts, tasks, and tutorials.
- [kubectl reference](https://kubernetes.io/docs/reference/kubectl/) —
  the kubectl command reference.
- [Helm docs: Using Helm](https://helm.sh/docs/intro/using_helm/) —
  managing Helm releases.
- Related skills in this repository: `docker`, `aws`, `gcp`,
  `deployment`, `ci-cd`, `observability`, `secrets-management`,
  `terraform`, `pulumi`, `rbac`.
