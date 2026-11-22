npx @openapitools/openapi-generator-cli generate \
  -i ./openapi.bundled.yaml \
  -g typescript-fetch \
  -o ./src/generated \
  --config ./openapi-generator-config.json
