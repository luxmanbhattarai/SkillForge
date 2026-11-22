# Spec discipline: source of truth, versioning, gaps

- Treat the spec as the single source of truth: type names,
  operation IDs, and descriptions in generated code come from the
  spec. Improve naming in the spec (`operationId`, schema names),
  not with post-processing.
- When the API versions, version the generated client with it.
  Run a breaking-change check (`oasdiff breaking`) between the old
  and new spec before regenerating, and surface breaking changes
  in the pull request.
- If a generator cannot express something the API needs (custom
  auth flows, streaming, multipart edge cases), wrap the generated
  client in a hand-written layer rather than patching generated
  output or forking the generator's templates. Template forks are
  a maintenance liability; use them only as a last resort and
  document the fork.
