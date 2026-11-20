# Feature Development

Take a feature from request to merged, tested code.

## Inputs

- Feature request or ticket with acceptance criteria.
- The codebase and its conventions.
- Design or API contract, when one exists.

## Steps

1. **Clarify the feature.** Confirm acceptance criteria and edge cases
   with the user. If the design is missing and the feature is large,
   start with `software-architecture` or an implementation plan
   (`writing-plans`, upstream).
2. **Explore the codebase.** Find the existing patterns for this kind of
   feature: where similar code lives, how it is tested, and what can be
   reused.
3. **Write tests first when the team works test-first** (`tdd`,
   `unit-testing`). Otherwise, plan the tests alongside the
   implementation.
4. **Implement the feature** using the stack skills for the area being
   changed: frontend (`react`, `nextjs`, `astro`, `typescript`,
   `tailwind-css`), backend (`nodejs`, `rest-api`), or database
   (`database-design`, `prisma` or `drizzle`).
5. **Handle errors and edge cases.** Validate inputs, return consistent
   errors, and cover the failure paths the acceptance criteria imply.
6. **Run the tests** (`vitest`, `playwright` for browser flows). Fix
   failures; do not skip or weaken tests to get a green run.
7. **Debug failures properly** (`debugging`). Reproduce before fixing;
   verify the fix removes the reproduction.
8. **Review the change** (`code-review`, `clean-code`). Self-review the
   diff for correctness, clarity, and convention fit before requesting
   review.
9. **Add regression coverage** (`regression-testing`) for any bug fixed
   during development.
10. **Request review and address feedback**
    (`requesting-code-review`, `receiving-code-review`, upstream).
11. **Finish the branch** (`finishing-a-development-branch`, upstream):
    run the full checks, update the changelog (`changelog-management`)
    if the project keeps one, and merge.

## Outputs

- Implemented feature matching the acceptance criteria.
- Tests covering the new behavior.
- Reviewed and merged change.

## Checks

- [ ] Acceptance criteria are met and demonstrable.
- [ ] Tests pass; new behavior is covered.
- [ ] No secrets, dead code, or debug leftovers.
- [ ] The diff was reviewed and feedback addressed.
- [ ] Documentation updated where the feature changes behavior.
