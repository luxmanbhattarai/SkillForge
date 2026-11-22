# Generation workflow: pinning, layout, spec source

- Pin the generator version exactly (no `^` or `~` ranges) in
  `package.json` / the lockfile, and record the version in the
  generated output's header comment where the generator supports
  it. Upgrades are deliberate, reviewed changes.
- Generated code lives in one dedicated directory (for example
  `src/generated/`), clearly marked as generated, and is never
  hand-edited. Custom behavior goes in a hand-written wrapper
  module that imports the generated code.
- Mark generated files as generated for tooling: add them to
  `.gitattributes` with `linguist-generated=true`, exclude them
  from linting and coverage, and do not review them line by line
  in pull requests — review the spec diff and the config instead.
- Generate from a pinned spec: a committed file, or a versioned
  URL with an exact version. Never generate from a floating
  "latest" URL in CI; a spec change then changes the client
  without a reviewable diff.
- Keep the generator configuration in the repository next to the
  spec, and generate with one command (`npm run generate` or
  equivalent) that any developer and CI can run identically.
