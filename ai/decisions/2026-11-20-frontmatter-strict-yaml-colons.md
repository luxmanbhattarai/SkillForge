# Decision: frontmatter parser rejects unquoted `: ` in plain scalars

- **Date:** 2026-11-20
- **Status:** Accepted (Phase 12)
- **Context:** The repository's hand-rolled frontmatter parser
  (`scripts/lib/frontmatter.mjs`) splits `key: value` on the first
  `: ` and accepts anything after it — including further `: `
  sequences. Strict YAML does not: a plain scalar containing
  `: ` (colon + space) is read as a nested mapping, and the whole
  frontmatter fails to parse. The Phase 11 L-05 documentation even
  stated "a value may contain colons after the first `key: `
  separator", which is true of this parser but false of YAML.

  The divergence had a real consequence: `skills/backend/graphql`
  had `compatibility: Requires ... server library: GraphQL Yoga
  6.x ...`, and `npx skills add --list` skipped the skill with a
  YAML parse error — it was invisible to the Skills CLI. A scan of
  all 277 skills found exactly one offending line.

## Decision

1. The `graphql` compatibility value is now double-quoted (same
   parsed string; the registry is unchanged).
2. The parser rejects unquoted plain scalars containing `: ` with
   a clear error ("plain scalar value contains ': ' — quote the
   value (strict YAML rejects it)"), at top level, in nested maps,
   and in plain multi-line continuations. Block-scalar content is
   literal and is not checked. A colon not followed by a space
   (e.g. `https://…`) is still fine.
3. `docs/SKILL-STANDARDS.md` (L-05 section) now states the rule.

## Consequences

- Frontmatter this repo accepts is now also valid strict YAML for
  this construct, so spec-compliant tools (Skills CLI, agent
  frontmatter parsers) can read every skill. Verified: the Skills
  CLI discovers 277/277 after the fix.
- The check is enforced by `npm run validate` (which parses every
  skill's frontmatter) and covered by unit tests in
  `test/validate.test.mjs`.
- Known remaining divergence (documented, not fixed): inline `#`
  comments are kept as part of the value by this parser but
  stripped by YAML. No skill currently relies on that either way.
