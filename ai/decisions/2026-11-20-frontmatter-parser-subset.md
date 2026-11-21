# Decision: document the frontmatter parser subset (L-05)

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 11
- **Context:** Audit finding L-05 (`ai/audits/INITIAL-AUDIT.md`).
  `scripts/lib/frontmatter.mjs` is a hand-rolled YAML parser covering
  a strict subset: top-level scalars, block scalars, and one level of
  nested string maps. It fails closed on anything else. Contributors
  using standard YAML features (lists, deeper nesting, anchors) get
  validation errors with no documentation explaining why.

## Options considered

1. **Document the supported subset (chosen).** Add a precise
   "Frontmatter parser subset" section to `docs/SKILL-STANDARDS.md`,
   derived from reading the parser code — supported constructs,
   unsupported constructs, and the practical consequences.
2. **Adopt a YAML dependency.** A real parser would remove the
   limitation, but it breaks the zero-dependency policy (no lockfile,
   no dependency tree to audit or poison) for a documentation-only
   gain. The subset covers everything the template and all 277
   skills use.
3. **Extend the hand-rolled parser.** More code to maintain and test
   for features no skill needs.

## Decision

Option 1. The subset is documented in
`docs/SKILL-STANDARDS.md#frontmatter-parser-subset`, stated exactly
from `scripts/lib/frontmatter.mjs`:

- Supported: file shape (`---` fences, CRLF tolerated), top-level
  scalar keys, quoted values (quotes stripped, no escape
  processing), folded/literal block scalars (`>`/`|` with optional
  `-`, two-space continuation), plain multi-line scalars, one level
  of nested string maps (`metadata:`), blank lines and full-line `#`
  comments.
- Not supported: lists, deeper nesting, inline comments (kept as
  part of the value), anchors/aliases/tags/flow style/multi-line
  quoted strings; duplicate keys silently last-win; a key with no
  value and no continuation is an error.

`CONTRIBUTING.md` links to the section from its worked example, and
`docs/TROUBLESHOOTING.md` points frontmatter validation errors at it.

## Consequences

- Contributors hitting "unparseable frontmatter line" have a
  documented explanation instead of a guess.
- If a future skill genuinely needs a YAML feature outside the
  subset, the decision to revisit is explicit — and the cost is
  either a dependency or parser work, weighed then.
