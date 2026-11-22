helm upgrade --install my-app oci://ghcr.io/example/charts/my-app \
  --namespace production --create-namespace \
  --version 1.4.2 --values values-production.yaml
