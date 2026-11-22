gcloud artifacts repositories create my-service \
  --repository-format=docker --location=us-central1

gcloud run deploy my-service \
  --image us-central1-docker.pkg.dev/PROJECT_ID/my-service/my-service:1.0.0 \
  --region us-central1 \
  --allow-unauthenticated \
  --max-instances 10
