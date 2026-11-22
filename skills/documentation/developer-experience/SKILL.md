---
name: developer-experience
description: >
  Improve developer experience (DX) for a project, library, or API:
  onboarding time, error messages, tooling, documentation, and
  feedback loops. Use when new developers struggle to get started,
  errors are cryptic, setup takes too long, or adoption is low
  despite a good product. Covers time-to-first-success, DX audits,
  and feedback loops.
license: MIT
metadata:
  version: "1.0.0"
  category: documentation
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Developer Experience

## Purpose

This skill helps an agent improve the experience of working with a
project, library, or API: how fast a new developer reaches their
first success, how clear the errors are, and how little friction
stands between an idea and a working result. The outcome is a
measurably shorter path from "I want to use this" to "it works" —
and fewer support questions along the way.

## When to Use

- New developers take too long to get started with a project or API.
- Error messages are cryptic and developers keep asking what they
  mean.
- Adoption is low despite a product that works well.
- Setting up a new project, library, or API with DX in mind.
- Auditing the developer journey for friction points.
- Before a public launch, to make sure the first impression is good.

## When Not to Use

- When the task is writing a specific document — use
  `technical-documentation`, `api-documentation`, or
  `readme-engineering` for the document itself.
- When the task is a changelog — use `changelog-management`.
- When the problem is the product's functionality, not the
  experience of using it — that is a product or engineering task.
- When the audience is end users, not developers — DX is about
  developers; user experience is a different discipline.

## Prerequisites

- Access to the project, library, or API being improved.
- A way to observe real developers: usage data, support questions,
  or a willing new user.
- Knowledge of the current onboarding path (install, setup, first
  success).
- Authority to change docs, error messages, tooling, or defaults.

## Official Documentation

- [Write the Docs](https://www.writethedocs.org/) — community
  guidance on documentation as part of DX.
- [Diátaxis](https://diataxis.fr/) — the documentation framework
  behind good developer docs.
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
  — style guidance for developer-facing writing.

## Required Workflow

1. Define the developer journey. Write down the steps a new
   developer takes: discover, install, configure, first success,
   and then the common ongoing tasks.
2. Measure the baseline. Time how long each step takes for a new
   developer (or simulate it from a clean environment), and record
   where they get stuck.
3. Collect friction points: support questions, GitHub issues,
   error messages developers ask about, and steps that require
   knowledge the docs do not provide.
4. Prioritize by impact: the friction that affects the most
   developers, earliest in the journey, comes first. A broken
   install step matters more than a confusing advanced guide.
5. Fix the top friction points, one at a time:
   - Simplify setup (fewer steps, better defaults, a single
     install command).
   - Improve the first-run experience (a working example, a
     starter template, clear next steps).
   - Rewrite the most confusing error messages to state what
     happened, why, and what to do.
   - Fix or write the documentation for the steps where developers
     get stuck.
6. Verify each fix with a fresh developer or a clean environment:
   follow the journey again and confirm the friction is gone.
7. Measure again and compare against the baseline: time to first
   success, number of steps, and support questions.
8. Set up a feedback loop so DX regressions are caught: track time
   to first success, review support questions regularly, and
   re-audit after major releases.

## Implementation Standards

- Time to first success is the primary metric: the time from a
  clean environment to a working result. Measure it, do not guess
  it.
- Every error message must state what happened, why, and what to
  do next. An error that only states what happened is incomplete.
- Defaults must work out of the box. A new developer should not
  need to configure anything to reach the first success.
- Every step in the onboarding path must be documented or
  self-evident. A step that requires tribal knowledge is a bug.
- Breaking changes must come with a migration path (see
  `changelog-management`); a breaking change without one is a DX
  failure.
- Do not add tooling or process that slows the inner loop (edit,
  test, see the result). A slow feedback loop is the most expensive
  DX problem.
- Collect feedback continuously: support questions, issue labels,
  and direct observation. Do not rely on assumptions about what
  developers struggle with.

### Accessibility

- Error messages are readable by everyone: plain text, specific, and
  actionable — never color-only status or an error code alone.
- CLI and tooling output does not rely on color alone: pair color with
  symbols or text so color-blind developers get the same signal.
- Onboarding docs follow the documentation baseline: headings, link
  text, alt text for diagrams.
- Defaults and configuration are documented in text, not only in a
  video or screenshot.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Watch a new developer use the project. Observation reveals
  friction that surveys and analytics miss.
- Provide a starter template or a working example, not just
  documentation. A runnable example beats a page of explanation.
- Make the happy path obvious and the advanced path discoverable.
  Most developers should never need the advanced documentation.
- Keep the number of decisions a new developer must make as low as
  possible. Every required choice is a chance to get stuck.
- Version the documentation with the product, so developers on an
  older version see the right docs.
- Respond to support questions by fixing the underlying friction,
  not just answering the question.
- Celebrate the first success: a clear "it works" moment keeps a
  developer going.

## Security Considerations

- Good DX must not come at the cost of security. A setup that skips
  authentication or uses default credentials to be "easy" is a
  security failure.
- Starter templates and examples must not contain real credentials
  or insecure defaults. Use clearly fake values and secure defaults.
- Error messages must not leak sensitive information (internal
  paths, stack traces with secrets, user data).
- When simplifying setup, keep the secure path the default path;
  make the insecure option the one that requires extra effort.
- Do not ask developers to disable security features to make setup
  work.

## Performance Considerations

- A fast inner loop is a DX feature: slow builds, slow tests, and
  slow deploys cost developer time every day.
- Documentation sites should be fast and searchable; slow docs are
  a DX problem.
- Setup that downloads large dependencies or builds from source
  should be optimized or cached where possible.
- Measure the cost of the developer's time, not just the machine's:
  a five-minute setup that fails twice costs more than a
  ten-minute setup that works first time.

## Common Mistakes

- Optimizing the advanced experience while the onboarding is broken.
- Error messages that state what happened but not what to do.
- Requiring configuration before the first success.
- Documenting the happy path and ignoring the errors developers
  actually hit.
- Adding tooling that slows the inner loop in the name of DX.
- Measuring DX by surveys alone, without observing real developers.
- Treating DX as a one-off project instead of an ongoing practice.
- Making setup "easy" by skipping security steps.

## Examples

A bad error message and a better one:

```text
Bad:  Error: EACCES

Good: Could not write to /var/log/app.log: permission denied.
      The log directory is owned by root. Either run the setup
      with sudo, or set LOG_DIR to a directory you own.
```

A DX audit finding, written for action:

```md
### Finding: install fails on a clean machine

- Step: installation, step 2 of 5.
- Symptom: `npm install` fails with a native build error because
  Python is not installed.
- Impact: every new developer on macOS hits this.
- Fix: remove the native dependency, or document the Python
  requirement before the install step.
- Verify: run the install from a clean machine and confirm it
  succeeds.
```

A minimal time-to-first-success measurement:

```md
| Step | Time | Notes |
| --- | --- | --- |
| Install | 2 min | Worked first time. |
| Configure | 8 min | Needed to find the config format in the docs. |
| First success | 3 min | Example ran after config was fixed. |
| Total | 13 min | Target: under 10 min. |
```

## Validation Checklist

- [ ] The developer journey is written down, from discovery to
      first success.
- [ ] Time to first success is measured from a clean environment.
- [ ] Friction points are collected from real developers (support
      questions, issues, observation).
- [ ] The top friction points are fixed, starting with the earliest
      in the journey.
- [ ] Error messages state what happened, why, and what to do.
- [ ] Defaults work out of the box with no configuration required
      for first success.
- [ ] Fixes are verified with a fresh developer or clean
      environment.
- [ ] A feedback loop is in place to catch future regressions.
- [ ] Accessibility: errors are text, not color-only; CLI output pairs color with symbols or text.

## Expected Deliverables

- A DX audit: the developer journey, measured times, and friction
  points ranked by impact.
- The implemented fixes, each mapped to a friction point.
- Before/after measurements of time to first success.
- Rewritten error messages for the most confusing errors.
- A feedback loop plan (what to track, how often to review).

## References

- [Write the Docs](https://www.writethedocs.org/) — documentation
  as part of DX.
- [Diátaxis](https://diataxis.fr/) — documentation structure.
- [Google Developer Documentation Style Guide](https://developers.google.com/style)
  — style guidance.
- Related skills in this repository: `technical-documentation`,
  `api-documentation`, `readme-engineering`, `changelog-management`.
