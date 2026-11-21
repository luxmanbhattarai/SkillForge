---
name: readme-engineering
description: >
  Write a README that sells the project in seconds and gets a new
  user running in minutes: what it is, why it matters, how to
  install it, and how to use it. Use when creating a README for a
  new project, fixing a README that is vague or out of date, or
  auditing the first impression a repository makes. Covers structure,
  examples, badges, and contribution guidance.
license: MIT
metadata:
  version: "1.0.0"
  category: documentation
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# README Engineering

## Purpose

This skill helps an agent write a README that does its two jobs:
convince a visitor the project is worth their time, and get them to
a working result as fast as possible. The outcome is a README a
stranger can read in two minutes and act on — install, run, and
understand what the project does — without asking anyone.

## When to Use

- Creating a README for a new project, library, or tool.
- Fixing a README that is vague, outdated, or missing install and
  usage instructions.
- Auditing the first impression a repository makes on visitors.
- Adding contribution, license, or support information to a project.
- Preparing a project for public release.

## When Not to Use

- When the task is full technical documentation — use
  `technical-documentation` for guides and reference.
- When the task is API documentation — use `api-documentation`.
- When the task is a changelog — use `changelog-management`.
- When the task is the overall developer experience — use
  `developer-experience`.

## Prerequisites

- Knowledge of what the project does and who it is for.
- A working install and a minimal usage example, verified by
  running them.
- The project's license, repository URL, and support channels.
- Knowledge of the project's requirements (runtime, version,
  dependencies).

## Official Documentation

- [GitHub Docs — About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
  — how GitHub renders READMEs and what to include.
- [Write the Docs](https://www.writethedocs.org/) — community
  guidance on writing documentation.
- [Choose a License](https://choosealicense.com/) — help picking
  and stating a license.

## Required Workflow

1. Identify the audience: who will read the README and what they
   want to do (use the project, contribute, evaluate it).
2. Draft the structure before writing: name and one-line description,
   why it exists, installation, quick start, usage, configuration,
   contributing, license.
3. Write the one-line description first: what the project is and who
   it is for, in a single sentence. If you cannot write it, the
   project's purpose is not clear enough yet.
4. Write the quick start: the smallest sequence of commands that
   produces a working result. Run every command exactly as written,
   from a clean checkout, and fix what fails.
5. Add a usage example that shows the most common task, with the
   expected output where it helps.
6. Add the remaining sections: requirements, installation options,
   configuration, contributing, license, and links to full
   documentation.
7. Add badges only where they convey real information (build status,
   version, license). Do not add badges for their own sake.
8. Review the README as a stranger: read it top to bottom, follow
   the quick start, and note every place where it assumes knowledge
   the reader does not have.
9. Keep the README in sync with the project: update it in the same
   change that changes installation, usage, or requirements.

## Implementation Standards

- The first screen of the README must answer: what is this, who is
  it for, and how do I start. Everything else comes after.
- The quick start must be verified by running it from a clean
  checkout. An install command that fails is the worst README bug.
- State the requirements explicitly (runtime, version, operating
  system) before the install steps, so the reader does not discover
  them by failing.
- Use one code block per command sequence, with the working
  directory stated where it matters.
- Keep the README short: it is an entry point, not the full
  documentation. Link to the docs for detail instead of copying
  them in.
- The license must be stated in the README and present as a LICENSE
  file in the repository.
- Every link in the README must work. Check them before publishing.
- Do not include credentials, tokens, internal URLs, or personal
  data in the README.

## Best Practices

- Lead with the value, not the technology: what the reader can do
  with the project, not what it is built with.
- Show, do not tell: a short example beats a long description.
- Use screenshots or a short demo only where the project is visual;
  a text-only tool does not need them.
- Keep the tone direct and plain. A README is not marketing copy,
  but it is also not a specification.
- Put contribution guidance in the README briefly and link to a
  CONTRIBUTING file for detail.
- Review the README after every release and after any change to
  installation or usage.
- If the project is archived or deprecated, say so at the top of
  the README, with a pointer to the replacement if one exists.

## Security Considerations

- Never include real credentials, tokens, API keys, or internal
  URLs in a README. Use clearly fake values in examples.
- Do not document internal-only procedures in a public README.
- Be careful with screenshots: they can leak internal data or
  personal information.
- If the project handles authentication or secrets, the README
  should point to the secure setup instructions, not include a
  shortcut.
- Review the README for sensitive information before publishing,
  the same way code is reviewed.

## Performance Considerations

- A README is a text file; its own performance cost is negligible.
  The cost is the reader's time: a README that is too long or
  disorganized wastes it. Keep it scannable.
- Keep images in the README small and few; a README full of large
  screenshots loads slowly and is hard to scan.
- Link to the full documentation rather than duplicating it, so the
  README stays short and the docs stay current.

## Common Mistakes

- A README that describes the project in vague terms and never says
  how to use it.
- Install instructions that were never run and do not work.
- No quick start: the reader must read the whole README to get
  going.
- The README duplicates the full documentation and goes stale.
- Missing requirements, so the install fails for a reader on a
  different runtime version.
- Badges that convey nothing, or broken badges.
- No license stated, leaving users unsure whether they can use the
  project.
- Links that are broken or point to internal resources.

## Examples

A minimal README structure (shown as the markdown a writer would
produce, with the code blocks the README itself contains):

# Project Name

One sentence: what the project is and who it is for.

## Why this exists

Two or three sentences on the problem it solves.

## Requirements

- Node.js 24 LTS or later.

## Installation

```bash
npm install project-name
```

## Quick Start

```bash
npx project-name init
npx project-name start
```

Open http://localhost:3000 to see it running.

## Usage

Short example of the most common task.

## Documentation

Link to the full documentation.

## Contributing

See CONTRIBUTING.md.

## License

MIT. See LICENSE.

A good one-line description:

```md
# SkillForge

A library of Agent Skills for AI coding agents: discoverable,
versioned, and ready to install into any project.
```

## Validation Checklist

- [ ] The first screen answers what the project is, who it is for,
      and how to start.
- [ ] The quick start was run from a clean checkout and works.
- [ ] Requirements are stated before the install steps.
- [ ] The license is stated and a LICENSE file exists.
- [ ] Every link in the README works.
- [ ] No credentials, tokens, or internal URLs appear.
- [ ] The README links to full documentation instead of duplicating
      it.
- [ ] A stranger reviewed the README and could follow the quick
      start.

## Expected Deliverables

- A README.md (new or revised) for the project.
- Verification notes: the quick start was run from a clean
  checkout, with results.
- A list of links checked.
- Notes on any documentation the README links to that still needs
  to be written.

## References

- [GitHub Docs — About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
  — how GitHub renders READMEs.
- [Write the Docs](https://www.writethedocs.org/) — technical
  writing guidance.
- [Choose a License](https://choosealicense.com/) — picking a
  license.
- Related skills in this repository: `technical-documentation`,
  `api-documentation`, `changelog-management`, `developer-experience`.
