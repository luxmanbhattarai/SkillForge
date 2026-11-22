# Deploy and roll-back commands for the app service.
# Run ONE of the two commands below, not the whole file:
# the first deploys a new version, the second rolls back to a previous one.

# Deploy: pull the new image and recreate the app container
APP_VERSION="${APP_VERSION:?Set APP_VERSION to the new commit SHA}" docker compose up -d app

# Roll back: redeploy the previous known-good image
APP_VERSION="${APP_VERSION:?Set APP_VERSION to the previous commit SHA}" docker compose up -d app
