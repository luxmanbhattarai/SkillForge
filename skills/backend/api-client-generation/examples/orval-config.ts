// orval.config.ts
export default {
  petstore: {
    input: "./openapi.bundled.yaml",
    output: {
      target: "./src/generated/petstore.ts",
      client: "fetch",
      mock: false,
    },
  },
};
