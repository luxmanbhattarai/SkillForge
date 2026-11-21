---
name: technical-writing
description: >
  Write clear technical documentation for developers and technical users:
  guides, tutorials, API references, and how-tos that are accurate, tested,
  and easy to follow. Use when writing docs, tutorials, README files, or API
  references for a technical product. Trigger keywords: technical writing,
  documentation, docs, API reference, tutorial, developer docs, README,
  user guide.
license: MIT
metadata:
  version: "1.0.0"
  category: content
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Technical Writing

## Purpose

This skill produces documentation that lets a technical reader succeed
without guessing: accurate procedures, tested code examples, and a structure
that matches how readers actually use docs — scanning for the answer, then
following steps in order. It covers guides, tutorials, references, and
READMEs, and treats every code sample as a promise that must work.

## When to Use

- Writing or updating product documentation, developer guides, or tutorials.
- Creating API references or CLI documentation.
- Writing README files, setup guides, or troubleshooting pages.
- Turning a feature or workflow into step-by-step instructions.

## When Not to Use

- Marketing copy or landing pages — use `copywriting` instead.
- General blog posts — use `blog-writing` instead.
- Long-form explanatory articles for a general audience — use `article-writing` instead.
- Localizing existing docs — use `content-localization` instead.

## Prerequisites

- Access to the product, API, or code being documented, so examples can be verified.
- The audience's technical level (beginner, intermediate, expert) and what they are trying to do.
- The current version of the product and its official docs, to avoid documenting outdated behavior.
- A list of the tasks the docs must cover, or a brief naming them.

## Official Documentation

- [Google developer documentation style guide](https://developers.google.com/style) — the standard style guide for technical docs.
- [Google Technical Writing courses](https://developers.google.com/tech-writing) — free courses on planning and writing technical docs.
- [Markdown Guide](https://www.markdownguide.org/) — Markdown syntax reference for docs written in Markdown.
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/) — accessibility requirements that docs must meet. WCAG 2.2 (W3C Recommendation, October 2023) is the current version.
- Compatibility: Node.js 26 is the current LTS line as of 28 October 2026 (codename "Lithium", supported until April 2029); Node.js 24 moved to Maintenance LTS on 20 October 2026 and Node.js 22 reaches end of life in April 2027. From Node.js 27 onward the project moves to one release per year with every major version becoming LTS, so the old even-numbered-only LTS rule no longer applies. Check the [Node.js release schedule](https://nodejs.org/en/about/previous-releases) before stating which line is current — do not cite a version from memory.

## Required Workflow

1. Define the reader and their goal: who reads this doc and what task they must complete after reading it.
2. List the tasks the doc must cover, in the order a reader encounters them, and decide the doc type (tutorial, how-to, reference, or explanation).
3. Gather the facts from the source: read the code, run the commands, and check the official docs. Never document behavior you have not verified.
4. Write the outline with task-based headings ("Install the CLI", not "Installation").
5. Draft the doc: short introduction stating what the reader will achieve, prerequisites, then numbered steps.
6. Write every code example so it is complete and runnable, then test it. A code example that has not been run is a bug waiting to be reported.
7. Add troubleshooting for the errors a reader is most likely to hit, with the exact error text where known.
8. Review for accuracy, clarity, and consistency with the style guide, and have a second person (or a fresh run-through) follow the steps.
9. Publish with version information and a last-updated date, and note where readers can report doc errors.

## Implementation Standards

- Every procedure is a numbered list of steps, each step one action, in the order the reader performs them.
- Every code example is complete, runnable, and tested against the current version. Snippets that cannot run must say so and explain why.
- Commands show the exact syntax, including required flags and realistic values. Never invent a flag, method, or option.
- Versions are stated as "current stable as of YYYY-MM-DD" with a link to the official releases page, unless the version was verified against an official source in this session.
- Use the second person ("you") and the imperative mood for instructions ("Run the command", not "The command should be run").
- Define acronyms and jargon on first use, or link to a glossary.
- Headings are task-based and descriptive; a reader scanning the headings should see the workflow.
- Screenshots and diagrams are used only where text cannot convey the information, and every image has alt text.
- Docs carry a last-updated date and the product version they describe.

## Best Practices

- Write the shortest doc that lets the reader succeed; completeness means covering the task, not every detail.
- Put the most common path first and edge cases later; most readers never need the edge cases.
- Use tables for options, flags, and parameters — they beat prose for reference material.
- Link to related docs instead of duplicating their content; duplicated content drifts out of sync.
- Keep a consistent vocabulary: one term per concept, used the same way everywhere.
- Test docs on a clean environment when possible; steps that work on your machine may assume setup the reader lacks.

## Security Considerations

- Never include real credentials, API keys, tokens, or secrets in code examples. Use clearly marked values such as `$API_KEY` and tell the reader to use a secret manager.
- Show secure defaults: examples should use HTTPS, least-privilege permissions, and safe configuration.
- Do not document how to bypass authentication, licensing, or security controls.
- When documenting authentication, point to the official auth docs and warn against rolling custom auth when a maintained framework fits.

## Performance Considerations

- Keep docs pages focused: one task per page, with links to related tasks, so pages load fast and readers find answers quickly.
- Avoid heavy images and embedded videos; prefer text and diagrams that render fast.
- Keep the docs build fast by avoiding unnecessary plugins and large generated assets.

## Common Mistakes

- Documenting behavior from memory instead of verifying it against the product.
- Code examples that are fragments, not runnable code, leaving the reader to fill in the gaps.
- Writing reference-style prose for a tutorial, or tutorial-style prose for a reference.
- Burying prerequisites at the end, so the reader discovers halfway through that they lack a required tool.
- Letting docs drift from the product: docs updated only when someone complains.

## Examples

Example how-to structure:

```md
# Install TypeScript

This guide installs the TypeScript compiler and verifies it runs.

## Prerequisites

- Node.js 26 (current LTS line since 28 October 2026) or later
- A terminal with network access

## Steps

1. Install the package:

   ```bash
   npm install -g typescript
   ```

2. Verify the installation:

   ```bash
   tsc --version
   ```

   You should see the installed version number.

## Troubleshooting

- `command not found`: check that the npm global bin directory is on your PATH.
```

## Validation Checklist

- [ ] The reader and their goal are stated at the top.
- [ ] Prerequisites are listed before the steps.
- [ ] Every procedure is a numbered list with one action per step.
- [ ] Every code example is complete, runnable, and tested.
- [ ] No real credentials or secrets appear in any example.
- [ ] Versions are stated with a date or verified against an official source.
- [ ] The doc carries a last-updated date and product version.
- [ ] A second person or a fresh run-through has followed the steps.

## Expected Deliverables

- Complete documentation in Markdown (or the project's docs format), ready to publish.
- Tested code examples.
- A list of related docs linked from the new page.

## References

- [Google developer documentation style guide](https://developers.google.com/style) — style rules for technical docs.
- [Google Technical Writing courses](https://developers.google.com/tech-writing) — courses on planning and writing docs.
- [Markdown Guide](https://www.markdownguide.org/) — Markdown syntax reference.
- Related skills in this repository: `article-writing`, `content-localization`, `editorial-review`, `fact-checking`.
