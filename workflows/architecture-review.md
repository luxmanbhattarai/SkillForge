# Architecture Review

Review an existing system's architecture for coherence, scalability, and
maintainability, and produce prioritized recommendations.

## Inputs

- The codebase or system to review.
- Current pain points or goals (scaling, speed of change, reliability).
- Existing architecture documents, if any.

## Steps

1. **Define the scope.** Agree which parts of the system are under
   review and what the review should answer.
2. **Map the current architecture** (`software-architecture`). Read the
   code to build an honest picture: components, boundaries, data flow,
   and dependencies. Do not review the architecture as documented if
   the code disagrees — review the code.
3. **Review module and package structure** (`package-boundaries`,
   `dependency-management`). Look for circular dependencies, leaky
   boundaries, and misplaced responsibilities.
4. **Review the data model** (`database-design`). Check relations,
   constraints, and whether the schema still fits how the data is used.
5. **Review API contracts** (`api-design`). Check consistency, error
   handling, and versioning.
6. **Review security posture** (`owasp`, `secrets-management`). Check
   auth boundaries, secrets handling, and input validation at trust
   boundaries.
7. **Review operability** (`observability`, `deployment`). Check
   logging, monitoring, and whether the system can be deployed and
   rolled back safely.
8. **Prioritize findings.** Rank by impact and effort. Separate
   structural problems from cosmetic ones.
9. **Write the report.** Each finding gets evidence, impact, and a
   recommended action with an owner.

## Outputs

- Architecture review report with prioritized findings.
- A current-state architecture map (as found in the code).
- Recommended next steps with owners.

## Checks

- [ ] Every finding is backed by evidence from the code.
- [ ] Findings are ranked by impact, not by the order they were found.
- [ ] Recommendations are concrete enough to act on.
- [ ] The report distinguishes facts from opinions.
- [ ] No invented problems: if a concern is unproven, it is flagged as
      needing verification.
