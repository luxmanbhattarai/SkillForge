# Pulumi and Terraform: factual comparison points

- Language: Pulumi programs are written in general-purpose languages
  (TypeScript, Python, Go, .NET, Java) or in YAML or HCL; Terraform
  uses HCL, its own declarative language.
- State: both keep state; Pulumi's default backend is Pulumi Cloud,
  with DIY backends (S3, Azure Blob Storage, Google Cloud Storage,
  PostgreSQL, filesystem); Terraform uses remote backends or HCP
  Terraform.
- Licensing: the Pulumi CLI and core SDKs are Apache License 2.0;
  Terraform has been Business Source License 1.1 since version 1.6.
- Testing: Pulumi programs are tested with the language's own test
  frameworks plus Pulumi's mocking support; Terraform has
  `terraform test` and `check` blocks.
- Policy: Pulumi uses CrossGuard policy packs (TypeScript, Python, or
  OPA Rego); Terraform uses Terraform Policy (generally available in
  1.17) and Sentinel on HCP Terraform and Terraform Enterprise.
- Choose on team fit: a team fluent in TypeScript or Python that wants
  loops, functions, and unit tests in its infrastructure will usually
  prefer Pulumi; a team that wants a declarative DSL and the broadest
  provider catalog will usually prefer Terraform.
