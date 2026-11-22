---
name: skill-name
description: >
  Clear explanation of what the skill does, what it covers, and when an
  agent should use it. Include trigger keywords. Max 1024 characters.
license: MIT
metadata:
  version: "1.0.0"
  category: category-name
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

<!-- Progressive disclosure (see docs/PROGRESSIVE-DISCLOSURE.md):
keep this file short — core instructions + pointers only, budget
300 lines total. When the body would exceed it, move detail out
and link to it: references/ for detailed guides, scripts/ for
reusable code, assets/ for templates and diagrams, examples/ for
runnable examples. Small skills stay whole in one file; split
only when the detail earns its place. Every disclosure file must
be linked from this file (directly or through another linked
file); unlinked files warn in validation. -->

# Skill Name

## Purpose

What this skill is for and what outcome it produces. 2-4 sentences.

## When to Use

- Concrete trigger situations, one per bullet.

## When Not to Use

- Situations where a different skill or approach is better, naming the alternative.

## Prerequisites

- What must exist or be known before following this skill (tools, accounts, project state).
- Supported versions (required): the version range this skill was
  verified against (e.g. "Node.js 24 or 26", "ESLint 10.x"), with a
  link to the official release notes. Never state a version you did
  not verify. If the skill is genuinely version-agnostic, write
  "version range: none" and say why in one sentence — do not date
  the claim: version facts belong in frontmatter `last_verified`,
  never as "as of YYYY-MM-DD" in the body (validation fails on
  hardcoded version dates).

## Official Documentation

- [Official docs name](https://example.com/docs) — what to check there.
- Only link real, official sources. Never invent URLs.

## Required Workflow

Numbered steps the agent must follow, in order. Be specific enough that a
capable agent can execute without guessing. Keep the core workflow in
the body; if a step needs a long procedure, link to it in
`references/` instead of inlining it.

1. Step one.
2. Step two.

## Implementation Standards

Rules, conventions, and patterns the work must follow. Include version notes
only for versions verified against official sources, stated as version
ranges ("requires X 2.x") — never date a version claim in the body
("as of YYYY-MM-DD" fails validation; the frontmatter
`last_verified` date is the single source of truth for when the
skill was verified).
Use "must" only for checkable requirements; "should" for recommendations.

### Architecture

Architecture guidance for the work, where applicable. Reference sibling
skills by name instead of repeating their content.

### Testing Strategy

How the work this skill produces is tested: what to test, with which
tools, and what passing looks like.

### Accessibility

Accessibility requirements, where applicable (frontend, media,
content, metadata skills). If the skill has no user-facing surface,
say so in one sentence and explain why.

## Best Practices

- Practical guidance that separates good work from adequate work.

## Security Considerations

- Threats, misconfigurations, and unsafe patterns relevant to this skill.
- If genuinely none apply, say so in one sentence and explain why.

## Performance Considerations

- What affects speed, cost, or scale, with concrete thresholds where official
  guidance exists.

## Common Mistakes

- Mistake — why it happens and what to do instead.

## Examples

Real, valid, minimal examples. No fake APIs, no invented package methods.
Keep examples short; put long code in `examples/` or `references/`.
Include at least one counter-example (the wrong way, labeled as such)
next to the correct way where a common mistake exists.

```ts
// Example: concise, runnable, secure by default.
```

```ts
// Counter-example: do NOT do this — <why it is wrong>.
```

## Validation Checklist

- [ ] Checkable outcome the agent can verify before finishing.
- [ ] A second checkable outcome.

## Expected Deliverables

- What the agent hands back (files, changes, reports) when the task is done.

## References

- [Official source](https://example.com) — short note on what it covers.
- Related skills in this repository: `skill-a`, `skill-b`.
