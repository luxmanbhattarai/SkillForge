---
name: technical-decision-records
description: >
  Record architecture and technical decisions as lightweight ADRs
  (Architecture Decision Records) so future developers know what was
  decided and why. Use when choosing a framework, database, pattern,
  or API design, or when a decision will be hard to reverse. Covers
  ADR format, when to write one, status lifecycle, and superseding
  decisions.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# Technical Decision Records

## Purpose

This skill captures the reasoning behind significant technical decisions
in short, durable documents — Architecture Decision Records (ADRs) — so
that a future developer can understand why the system looks the way it
does, without re-litigating settled questions or accidentally undoing a
deliberate choice.

## When to Use

- Choosing a framework, database, language, hosting platform, or
  major library.
- Adopting or rejecting a pattern, protocol, or API design.
- Making a decision that will be expensive or painful to reverse.
- Resolving a disagreement where the reasoning should outlive the
  discussion.
- Superseding or reversing an earlier decision.

## When Not to Use

- For trivial or easily reversible choices (a variable name, a small
  utility) — a code comment is enough.
- For the architecture design itself — use `software-architecture`;
  ADRs record the decisions that come out of that work.
- For project planning or task tracking — use the project's issue
  tracker, not ADRs.

## Prerequisites

- Agreement on where ADRs live in the repository (conventionally
  `docs/adr/` or `docs/decisions/`).
- A numbering scheme for ADR files (for example `0001-use-postgres.md`).
- Knowledge of the decision's context: the options considered and the
  constraints that shaped the choice.
- Conceptual skill; version range: none — the ADR format is versionless;
  see the templates linked in Official Documentation.

## Official Documentation

- [ADR GitHub organisation](https://adr.github.io/) — the home of the
  ADR concept, with templates and tooling.
- [Architecture Decision Record repo](https://github.com/joelparkerhenderson/architecture-decision-record) —
  the widely used template and guidance by Joel Parker Henderson.
- [Michael Nygard on ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) —
  the original article introducing decision records.

## Required Workflow

1. Decide whether the decision merits an ADR: is it significant, hard
   to reverse, or likely to be questioned later? If yes, write one.
2. Assign the next ADR number and create the file in the ADR directory.
3. Write the Context: the problem, the constraints, and the forces at
   play. A reader with no prior knowledge should understand the situation.
4. List the options considered, including the option of doing nothing,
   with a fair summary of each.
5. Write the Decision: what was chosen, in one clear paragraph.
6. Write the Consequences: what becomes easier, what becomes harder,
   and what follow-up work the decision creates.
7. Set the status to `proposed` for review, then `accepted` once agreed.
8. Link the ADR from the pull request or discussion that implements the
   decision.
9. When a decision is later reversed, do not delete or rewrite the old
   ADR: mark it `superseded` and link to the new ADR that replaces it.

## Implementation Standards

- One decision per ADR. A record that decides five things is five records.
- ADRs are immutable once accepted: corrections go in a new ADR, not by
  editing history.
- Keep each ADR short: one to two pages. If it is longer, the decision
  is probably several decisions.
- Write for a reader who arrives in two years with no context: explain
  the problem, not just the answer.
- Name the alternatives honestly. An ADR that lists only the winning
  option teaches nothing.
- Status values are limited to: `proposed`, `accepted`, `deprecated`,
  `superseded`. Do not invent new statuses.
- File names use the pattern `NNNN-short-title.md`, numbered in the
  order decisions were made.

## Best Practices

- Write the ADR when the decision is made, not months later — the
  reasoning is freshest at decision time.
- Keep the tone factual and neutral; ADRs are records, not arguments.
- Reference the ADR number in commit messages and pull requests that
  implement the decision.
- Review ADRs in the same pull request review as the code that
  implements them.
- Periodically review accepted ADRs: some decisions expire as the
  system and team change.
- A short ADR that exists beats a perfect ADR that was never written.

## Security Considerations

- ADRs must not contain secrets, credentials, or internal URLs that
  should not be shared. Reference secrets by name only.
- When a decision has security consequences (for example, choosing an
  auth approach), state them explicitly in the Consequences section.
- If an ADR documents a known security trade-off, link to the
  follow-up work that mitigates it.
- See `security` for the full checklist.

## Performance Considerations

- When performance is a deciding factor, record the numbers and the
  measurement method in the Context, not just the conclusion.
- Note the performance consequences of the decision (for example, an
  extra network hop) so they are visible to future readers.
- See `performance` for measurement guidance.

## Common Mistakes

- Writing ADRs only for big architecture — medium decisions (a library
  choice, a data format) also deserve records.
- Recording the decision without the reasoning — the "why" is the
  whole point.
- Editing an accepted ADR to change history — supersede it instead.
- Listing a single option — without alternatives, the record cannot
  explain why the others were rejected.
- Letting ADRs rot in a wiki nobody reads — they belong in the
  repository, next to the code they explain.
- Writing the ADR after the code is merged and the reasoning is
  forgotten.

## Examples

Minimal ADR template:

```markdown
# 0001. Use PostgreSQL for the primary database

Status: accepted

Date: 2026-11-20

## Context

We need a primary database for the new ordering service. The data is
relational (orders, items, customers), the team knows SQL, and we need
transactions for order placement.

## Decision

We will use PostgreSQL as the primary database, accessed through the
Prisma ORM.

## Consequences

- The team can use familiar SQL and transactions.
- We take on operating a PostgreSQL instance (backups, upgrades).
- Full-text search beyond simple queries will need a separate solution
  later; this is accepted for now.
```

Superseding an ADR:

```markdown
# 0007. Replace REST polling with server-sent events

Status: accepted

Supersedes: 0003 (polling for order updates)

## Context

ADR 0003 chose polling for order status updates. Polling now causes
noticeable load and delayed updates at our current scale...
```

## Validation Checklist

- [ ] The ADR states the problem, the options, the decision, and the
      consequences.
- [ ] At least one rejected alternative is named with its reason.
- [ ] The file follows the numbering and naming convention.
- [ ] The status is one of the four allowed values.
- [ ] No secrets or sensitive internals appear in the record.
- [ ] The ADR is linked from the implementing pull request.
- [ ] Superseded ADRs point to their replacement.

## Expected Deliverables

- The ADR file in the repository's ADR directory.
- A link to the ADR from the relevant pull request or discussion.
- Updated status on any ADR this decision supersedes.

## References

- [ADR GitHub organisation](https://adr.github.io/) — templates and
  tooling.
- [Architecture Decision Record repo](https://github.com/joelparkerhenderson/architecture-decision-record) —
  the standard template.
- [Michael Nygard on ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) —
  the original article.
- Related skills in this repository: `software-architecture`,
  `engineering-standards`, `code-review`.
