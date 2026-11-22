---
name: engineering-standards
description: >
  Define and apply team engineering standards: code style, branching,
  commit messages, versioning, documentation, and CI checks. Use when
  setting up a new repository, onboarding a team, standardising how
  work is done, or resolving "how should we do this here?" questions.
  Covers conventions, automation, and keeping standards lightweight.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Engineering Standards

## Purpose

This skill establishes the shared conventions that let a team work
together without friction: how code is formatted, how changes are
branched and committed, how versions are cut, and what is checked
automatically. Good standards are few, enforced by tooling, and written
down where everyone can find them.

## When to Use

- Setting up a new repository or project.
- Onboarding a team or standardising across repositories.
- Answering "how should we do this here?" for branching, commits,
  versioning, or documentation.
- Adding CI checks, linting, or formatting to a project.
- Reviewing whether existing standards still serve the team.

## When Not to Use

- For code-level quality of a specific change — use `clean-code` or
  `code-review`.
- For architecture decisions — use `software-architecture` and
  `technical-decision-records`.
- For testing workflow — use `tdd`.
- For security policy — use `security`.

## Prerequisites

- Agreement on the project's language, package manager, and runtime
  (for example, Node.js 26 LTS, TypeScript 7.x, pnpm 12).
- Supported versions: Node.js 26 LTS is the
  current line (Active LTS since 2026-10-28, supported to 2029-04-30);
  Node.js 24 is in maintenance until 2028-04-30; Node.js 20 and 25 are
  end-of-life and must not be targeted. TypeScript 7.x is current
  (7.0 GA July 2026, native Go compiler); TypeScript 6.x is the bridge
  release — tooling that uses the compiler's programmatic API
  (typescript-eslint, framework template type-checking) stays on 6.x
  until 7.1 ships the new API; 5.x is superseded. pnpm 12.x is current;
  pnpm 11 is supported until 2027-04-30; pnpm 10 and earlier are
  unsupported.
- Access to the repository settings and CI configuration.
- Knowledge of the team's size and workflow (solo, small team, or
  many contributors).

## Official Documentation

- [Google Engineering Practices](https://google.github.io/eng-practices/) —
  code review, style, and engineering culture guidance.
- [Semantic Versioning](https://semver.org/) — the versioning scheme
  this skill uses.
- [Conventional Commits](https://www.conventionalcommits.org/) — the
  commit message format this skill uses.
- [The Twelve-Factor App](https://12factor.net/) — principles for
  building portable, deployable services.

## Required Workflow

1. Write the standards down in the repository (for example,
   `CONTRIBUTING.md` and `AGENTS.md`), not in someone's head or a
   chat thread.
2. Automate what can be automated: formatting, linting, type-checking,
   and tests run in CI on every change.
3. Define the branching model: trunk-based development with short-lived
   feature branches is the default unless the team has a reason for
   something else.
4. Define the commit convention: Conventional Commits (`feat:`, `fix:`,
   `docs:`, `refactor:`, `test:`, `chore:`), one logical change per commit.
5. Define versioning: Semantic Versioning (`MAJOR.MINOR.PATCH`) for
   anything published or released.
6. Define the pull request process: description template, required
   checks, reviewer expectations, and merge rules (see `code-review`).
7. Define documentation expectations: a README that explains setup and
   use, and ADRs for significant decisions (see
   `technical-decision-records`).
8. Review the standards regularly and remove any rule that no longer
   earns its cost.

## Implementation Standards

- Formatting is enforced by a formatter (for example, Prettier), not
  by review comments. The formatter runs in CI.
- Linting is enforced by a linter with the project's ruleset; warnings
  are fixed, not ignored.
- Type-checking runs in CI for typed languages; the build fails on
  type errors.
- Tests run in CI on every pull request; a failing suite blocks merging.
- Dependencies are pinned with a lockfile, and updates are deliberate,
  not automatic surprises.
- Environment-specific configuration lives in environment variables,
  never in committed files.
- Every repository has a README that a new contributor can follow to
  get running in under fifteen minutes.
- Secrets never appear in the repository, in any file, in any branch.

## Best Practices

- Keep the number of standards small. Every rule has a cost; a rule
  that nobody follows is worse than no rule.
- Prefer tooling over documentation: a check that runs is worth ten
  rules that are read.
- Make the happy path the easy path: the default commands should do
  the right thing without flags or tribal knowledge.
- Onboard by doing: the README's setup steps should be tested by a
  real new contributor, not assumed to work.
- Version the standards themselves: when a rule changes, note it in
  the changelog or the standards document.
- Let teams diverge where it matters: a standard that fits every
  project is usually too vague to help any of them.

## Security Considerations

- CI must not expose secrets in logs; use the platform's secret store
  and mask secret values in output.
- Dependency updates are reviewed for supply-chain risk, not applied
  blindly.
- Branch protection rules prevent direct pushes to the main branch
  and require review before merging.
- See `security` for the full checklist.

## Performance Considerations

- CI should be fast enough that developers do not avoid it: cache
  dependencies, run jobs in parallel, and keep the suite lean.
- Linting and formatting checks run on changed files in local hooks
  so feedback is immediate.
- See `performance` for measurement guidance.

## Common Mistakes

- Standards that live only in people's heads — unwritten rules are
  not standards.
- Too many rules — a 50-page style guide nobody reads is not a standard.
- Enforcing style by review comment instead of by formatter — it wastes
  reviewer time and creates friction.
- Skipping CI checks "just this once" — the exception becomes the norm.
- Copying another company's standards wholesale without adapting them
  to this team's size and stack.
- Letting the README rot — setup instructions that do not work cost
  every new contributor hours.

## Examples

Conventional Commits examples:

```text
feat: add loyalty discount to order totals
fix: handle empty orders in checkout total
docs: document the ADR process in CONTRIBUTING.md
refactor: extract pricing rules into a strategy
test: add regression test for empty order totals
chore: upgrade dependencies to current stable
```

Minimal CI checklist for a TypeScript project:

```text
On every pull request, run:
  1. Install dependencies (from the lockfile)
  2. Lint (fails on errors)
  3. Type-check (fails on errors)
  4. Format check (fails if files are unformatted)
  5. Test suite (fails on any failure)
  6. Build (fails on build errors)
```

README structure that works:

```text
# Project name — one-line description
## Setup — prerequisites, install, environment variables
## Development — how to run, test, and lint
## Architecture — link to the architecture overview and ADRs
## Contributing — link to CONTRIBUTING.md
```

## Validation Checklist

- [ ] Standards are written in the repository and linked from the README.
- [ ] Formatting, linting, type-checking, and tests run in CI.
- [ ] Branch protection requires review before merging to main.
- [ ] Commit messages follow Conventional Commits.
- [ ] Releases follow Semantic Versioning.
- [ ] A new contributor can get running from the README alone.
- [ ] No secrets exist in the repository history or config.

## Expected Deliverables

- `CONTRIBUTING.md` (or equivalent) with the team's standards.
- CI configuration running the checks above on every change.
- A README that gets a new contributor running quickly.
- Branch protection and required checks enabled on the main branch.

## References

- [Google Engineering Practices](https://google.github.io/eng-practices/) —
  review and engineering culture.
- [Semantic Versioning](https://semver.org/) — versioning scheme.
- [Conventional Commits](https://www.conventionalcommits.org/) — commit
  message format.
- [The Twelve-Factor App](https://12factor.net/) — service design
  principles.
- Related skills in this repository: `code-review`, `clean-code`,
  `technical-decision-records`, `tdd`, `security`.
