---
name: technical-documentation
description: >
  Write and maintain technical documentation that developers can
  actually use: guides, how-tos, explanations, and reference pages
  organized by what the reader is trying to do. Use when creating
  docs for a project, library, or system; when docs are out of date
  or hard to navigate; or when setting up a documentation site.
  Covers Diataxis structure, audience, and doc maintenance.
license: MIT
metadata:
  version: "1.0.0"
  category: documentation
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Technical Documentation

## Purpose

This skill helps an agent write technical documentation that answers
the reader's question quickly: organized by task, written in plain
language, and kept accurate as the code changes. The outcome is docs
a developer can use without asking the author — a guide that gets
them started, a how-to that solves a problem, and a reference that
states the facts.

## When to Use

- Creating documentation for a project, library, service, or system.
- Reorganizing docs that are hard to navigate or full of outdated
  pages.
- Writing a getting-started guide, a how-to, or a conceptual
  explanation.
- Setting up a documentation site or a docs folder in a repository.
- Auditing existing docs for gaps, staleness, or duplication.

## When Not to Use

- When the task is API reference documentation specifically — use
  `api-documentation` for endpoints, schemas, and examples.
- When the task is a README — use `readme-engineering`.
- When the task is a changelog — use `changelog-management`.
- When the task is the overall developer experience (onboarding,
  tooling, DX) — use `developer-experience`.

## Prerequisites

- Knowledge of the system being documented, or access to someone
  who has it.
- Access to the code or product, so examples can be verified.
- Knowledge of the audience: who reads the docs and what they are
  trying to do.
- A place for the docs to live (repository folder, docs site, or
  wiki) and a way to publish updates.
- Conceptual skill; version range: none — applies to any system
  being documented; no tool or version is pinned.

## Official Documentation

- [Diátaxis](https://diataxis.fr/) — the framework for organizing
  documentation into tutorials, how-to guides, explanations, and
  reference.
- [Write the Docs](https://www.writethedocs.org/) — community
  guidance on writing and maintaining documentation.
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
  — a widely used style guide for technical writing.

## Required Workflow

1. Identify the audience and their tasks. Write down who reads the
   docs and the top five things they are trying to do. If you cannot
   name the tasks, interview a user before writing.
2. Audit what exists. List current docs, note what is outdated or
   duplicated, and identify the gaps against the task list.
3. Organize by type, following Diátaxis:
   - Tutorials: learning-oriented, step-by-step, for beginners.
   - How-to guides: task-oriented, for a reader who knows the
     system and wants to accomplish something specific.
   - Explanations: understanding-oriented, for a reader who wants
     to know why something works the way it does.
   - Reference: information-oriented, complete and precise, for
     lookup.
4. Write each page for one type and one task. Do not mix a tutorial
   with a reference page; link between them instead.
5. Verify every example and command by running it. An example that
   does not work is worse than no example.
6. Review for accuracy with someone who knows the system, and for
   clarity with someone who does not.
7. Publish, link the new pages from the docs index, and remove or
   redirect outdated pages so readers do not land on stale content.
8. Set a maintenance rule: docs change with the code. Tie doc
   updates to the change that makes them necessary (a pull request
   that changes behavior updates the docs in the same change).

## Implementation Standards

- One page, one purpose. A page that tries to teach, explain, and
  reference at once does none of them well.
- Start each page with what the reader will be able to do after
  reading it, and what they need before starting.
- Use the reader's vocabulary, not internal jargon. Define terms on
  first use.
- Every code example must be complete, correct, and tested. Show
  the expected output where it helps.
- Use headings that describe tasks ("Deploy to staging"), not
  topics ("Deployment").
- Keep pages short enough to scan: a how-to should fit on one
  screen of scrolling where possible; split long pages by task.
- Link, do not duplicate. If the same information appears in two
  places, one of them will go stale.
- Date-stamp or version-stamp docs that depend on a version, and
  state which version the docs describe.

### Accessibility

- Docs are structured documents: one `h1`, headings in order, no
  skipped levels — readers navigate by headings.
- Diagrams and screenshots get alt text or a text description of what
  they show; code samples are real text, never screenshots of code.
- Link text describes its destination; tables use header cells.
- Plain language: define terms on first use, keep sentences short, put
  the outcome first.
- Examples work without color: do not mark required / optional or
  old / new by color alone.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Write the tutorial first: it forces you to experience the product
  as a new user and reveals gaps.
- Use real examples from the actual system, not abstract ones.
- Include troubleshooting for the errors readers actually hit, with
  the error message quoted so it is searchable.
- Ask new users to follow the docs and watch where they get stuck;
  that is the most reliable feedback.
- Keep a docs index that mirrors the reader's tasks, not the
  codebase's structure.
- Review docs on a schedule (for example, quarterly) and after
  every major release.
- Write in the second person ("you") and the active voice.

## Security Considerations

- Never include real credentials, tokens, API keys, or internal
  URLs in documentation. Use clearly fake values and say so.
- Do not document internal-only procedures in public docs.
- Be careful with screenshots: they can leak internal data,
  personal information, or infrastructure details.
- When documenting authentication or security features, follow the
  product's security guidance exactly; do not invent a shortcut.
- Review docs for sensitive information before publishing, the same
  way code is reviewed.

## Performance Considerations

- Documentation sites should be fast and searchable; a slow docs
  site is a docs problem, not just a performance problem.
- Keep pages small and images optimized so docs load quickly on any
  connection.
- A good search function matters more than a perfect information
  architecture; make sure the docs are searchable.

## Common Mistakes

- Writing reference material when the reader needs a how-to, or a
  tutorial when they need a reference.
- Examples that were never run and do not work.
- Duplicating the same information in several pages, so updates
  miss some copies.
- Organizing docs by the codebase's structure instead of the
  reader's tasks.
- Letting docs go stale after a release because no one owns updates.
- Writing for experts when the audience is beginners, or vice versa.
- A getting-started guide that assumes knowledge the reader does
  not have.

## Examples

A how-to page structure:

```md
# Deploy to Staging

After reading this guide, you will have deployed the current
branch to the staging environment.

## Before you begin

- Access to the staging environment.
- The project checked out locally.

## Steps

1. Run the deploy command.
2. Verify the deployment.
3. Check the logs for errors.

## Troubleshooting

- If the deploy fails with "permission denied", check that your
  account has the deployer role.
```

A reference page structure:

```md
# Configuration Options

## `port`

- Type: number
- Default: `3000`
- Description: the port the server listens on.
```

## Validation Checklist

- [ ] The audience and their top tasks are written down.
- [ ] Each page has one type (tutorial, how-to, explanation, or
      reference) and one purpose.
- [ ] Every example and command was run and verified.
- [ ] Pages are linked from the docs index; outdated pages are
      removed or redirected.
- [ ] A reviewer who knows the system checked accuracy, and a
      reviewer who does not checked clarity.
- [ ] No credentials, tokens, or internal URLs appear in the docs.
- [ ] A maintenance rule ties doc updates to code changes.
- [ ] Accessibility: heading outline valid; diagrams have text descriptions; code is real text.

## Expected Deliverables

- The new or revised documentation pages.
- An updated docs index linking to the new pages.
- A list of outdated pages removed or redirected.
- Verification notes: which examples were run and their results.
- A maintenance rule for keeping the docs current.

## References

- [Diátaxis](https://diataxis.fr/) — documentation structure.
- [Write the Docs](https://www.writethedocs.org/) — technical
  writing guidance.
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
  — style guidance.
- Related skills in this repository: `api-documentation`,
  `readme-engineering`, `changelog-management`, `developer-experience`.
