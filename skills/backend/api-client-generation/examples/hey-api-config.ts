// openapi-ts.config.ts
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.bundled.yaml",
  output: "./src/generated",
  plugins: ["@hey-api/client-fetch", "@hey-api/typescript"],
});
