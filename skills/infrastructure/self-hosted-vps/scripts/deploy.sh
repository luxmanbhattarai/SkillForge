# Deploy: pull the new image and recreate the app container
APP_VERSION=<new-commit-sha> docker compose up -d app

# Roll back: redeploy the previous known-good image
APP_VERSION=<previous-commit-sha> docker compose up -d app
