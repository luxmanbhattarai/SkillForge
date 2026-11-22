kubectl config current-context
kubectl apply --dry-run=server -f deployment.yaml
kubectl apply -f deployment.yaml
kubectl rollout status deployment/web -n production
kubectl get pods -n production
kubectl logs -f deployment/web -n production
kubectl describe pod -l app.kubernetes.io/name=web -n production
kubectl rollout undo deployment/web -n production
