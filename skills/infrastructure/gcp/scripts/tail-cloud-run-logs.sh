gcloud logging read \
  'resource.type="cloud_run_revision" resource.labels.service_name="my-service"' \
  --limit 50 --format json
