# New Project

Start a project from scratch: design the architecture, scaffold the
repository, and reach a deployable first version.

## Inputs

- Project goal and audience.
- Constraints: stack preferences, hosting, timeline, team size.
- Any existing requirements, designs, or decisions.

## Steps

1. **Clarify the goal.** Confirm the goal, audience, and constraints with
   the user. Do not design against vague requirements.
2. **Design the architecture** (`software-architecture`). Define
   components, boundaries, data flow, and API contracts. Record
   decisions and trade-offs. Use `writing-plans` (upstream) when the
   output is an implementation plan for other agents.
3. **Choose the repository shape** (`monorepo`, `pnpm-workspaces`,
   `turborepo`). Use a monorepo only when the project has multiple
   packages; otherwise keep a single package. Define package boundaries
   (`package-boundaries`) when using a monorepo.
4. **Design the data model** (`database-design`). Define entities,
   relations, and constraints before writing code.
5. **Scaffold the project.** Set up the framework (`nextjs`, `astro`, or
   the chosen stack), `typescript`, and the test runner (`vitest`).
   Keep the scaffold minimal: only what the first feature needs.
6. **Set up persistence** (`prisma` or `drizzle`, plus the database
   skill for the engine in use). Create the first migration and verify
   it applies to a fresh database.
7. **Set up deployment** (`deployment`, plus `cloudflare-workers` or
   `vercel` for the chosen host). Deploy an empty but working version
   early so the pipeline is proven.
8. **Add authentication if needed** (`authentication`, `better-auth` or
   `oauth`, `session-management`). Prefer a maintained framework over
   custom auth.
9. **Build the first feature** following `workflows/feature-development.md`.
10. **Verify the whole path.** Run type checks, tests, and a fresh
    deployment before calling the setup done.

## Outputs

- Working repository with architecture documented.
- Deployable application with a proven deployment pipeline.
- Data model and first migration.
- A short README or setup note for the next developer.

## Checks

- [ ] Architecture decisions are written down with rationale.
- [ ] A clean install, build, test, and deploy all pass.
- [ ] No secrets in code or version control.
- [ ] The first feature works end to end in the deployed environment.
