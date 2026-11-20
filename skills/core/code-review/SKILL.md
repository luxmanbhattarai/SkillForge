---
name: code-review
description: >
  Review code changes thoroughly and constructively: check correctness,
  security, tests, and readability before code is merged. Use when
  reviewing a pull request, preparing your own change for review, or
  setting review standards for a team. Covers what to check, how to
  give feedback, and when to block versus approve.
license: MIT
metadata:
  version: "1.0.0"
  category: core
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Code Review

## Purpose

This skill makes code review a reliable quality gate instead of a rubber
stamp. A good review catches real defects — wrong logic, missing tests,
security holes — while keeping feedback specific, respectful, and focused
on the change, not the author.

## When to Use

- Reviewing a pull request or merge request before it lands.
- Preparing your own change for review (self-review first).
- Defining or improving a team's review checklist and standards.
- Investigating whether a merged change was adequately reviewed.

## When Not to Use

- For fixing a bug — use `debugging`.
- For restructuring code — use `refactoring`.
- For judging architecture — use `software-architecture`.
- For writing tests from scratch — use `tdd`.

## Prerequisites

- The change is complete, builds, and passes its tests.
- The pull request has a description explaining what changed and why.
- Access to the diff, the tests, and the surrounding code.
- The project's coding standards and review expectations.

## Official Documentation

- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/) —
  the standard reference for what reviewers should look for.
- [GitHub: Reviewing proposed changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request) —
  how to review, comment, and approve on GitHub.

## Required Workflow

1. Read the pull request description first: understand the intent before
   judging the implementation.
2. Check the change is the right size. If it is too large to review
   properly (hundreds of lines, multiple concerns), ask for it to be
   split before reviewing in depth.
3. Read the diff in full, not just the files you know. Follow the data
   flow, not just the syntax.
4. Verify correctness: does the code do what the description claims,
   including edge cases and error paths?
5. Verify tests: is the new behaviour tested, do the tests fail without
   the fix, and are edge cases covered?
6. Check security: input validation, authorisation, secrets, and data
   handling (see `security`).
7. Check readability: naming, structure, and whether a future reader can
   follow the change (see `clean-code`).
8. Leave feedback that is specific, cites the code, and distinguishes
   blocking issues from suggestions.
9. Approve only when the blocking issues are resolved and the change is
   one you would be comfortable owning.

## Implementation Standards

- Review the change, not the author. Feedback addresses code and
  behaviour, never the person.
- Every blocking comment states the problem, why it matters, and what
  would fix it.
- Nitpicks are labelled as such and never block a merge on their own.
- Do not approve a change you have not read. "Looks good" on an unread
  diff is not a review.
- Review promptly: a change waiting days for review slows the whole team.
- Large reviews are split by concern or by commit so each part gets real
  attention.
- Automated checks (tests, lint, type-check) run before human review;
  humans review what automation cannot judge.

## Best Practices

- Start with the highest-risk parts: security-sensitive code, data
  migrations, concurrency, and public APIs.
- Ask questions instead of issuing orders when the intent is unclear:
  "What happens if this is null?" beats "Fix this."
- Praise good work specifically; it reinforces the standard.
- If you do not understand a change, say so — that is itself useful
  feedback about readability.
- Check the tests by reading them, not by trusting the green checkmark;
  a passing test suite can still miss the behaviour that changed.
- Watch for scope creep: unrelated changes in a pull request should be
  split out.

## Security Considerations

- Treat every review as a security check: look for unsanitised input,
  missing authorisation, exposed secrets, and unsafe data handling.
- New dependencies must be justified and checked for known
  vulnerabilities before merging.
- Never approve code that logs secrets or personal data, even in
  "temporary" debug output.
- See `security` for the full checklist.

## Performance Considerations

- Look for new work in hot paths: database queries in loops, repeated
  I/O, unbounded collections, and missing pagination.
- Ask for measurements when a change claims a performance improvement;
  do not accept the claim on faith.
- Check that new queries use indexes and that list endpoints are paginated.
- See `performance` for measurement guidance.

## Common Mistakes

- Rubber-stamping — approving without reading, which defeats the purpose.
- Style-only reviews — commenting on formatting while missing a logic
  error. Let the formatter handle style.
- Reviewing in a vacuum — not running the code or checking the tests.
- Blocking on taste — personal preference is not a defect; if the
  project has no standard, the author's choice stands.
- Drive-by redesigns — demanding a rewrite for a working change instead
  of raising a follow-up.
- Vague feedback — "this is wrong" without saying what is wrong or how
  to fix it.

## Examples

A useful blocking comment:

```text
Blocking: this endpoint returns the full user record, including the
password hash field, to any authenticated user. Please return only the
public fields (id, name, avatarUrl) or use the existing
toPublicProfile() helper.
```

A useful suggestion, clearly non-blocking:

```text
Nit: this conditional chain could be a lookup map, which would be
easier to extend. Not blocking — fine to leave as is.
```

## Validation Checklist

- [ ] The full diff has been read and the intent understood.
- [ ] Correctness, edge cases, and error paths have been checked.
- [ ] Tests cover the new behaviour and fail without the change.
- [ ] Security-sensitive code has been checked against the checklist.
- [ ] Feedback is specific, kind, and distinguishes blocking from optional.
- [ ] No approval was given for unread or untested code.

## Expected Deliverables

- Review comments on the pull request, with blocking issues clearly marked.
- An approval, a request for changes, or a comment-only review — with a
  clear rationale in each case.

## References

- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/) —
  what to look for in a review.
- [GitHub: Reviewing proposed changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request) —
  GitHub review workflow.
- Related skills in this repository: `clean-code`, `security`, `tdd`,
  `debugging`, `engineering-standards`.
