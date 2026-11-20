# Database Migration

Change a database schema safely: design the migration, prove it on a
copy, apply it with a rollback plan, and verify the result.

## Inputs

- The schema change and why it is needed.
- The database engine and ORM in use (`prisma` or `drizzle`).
- The deployment window and the rollback requirement.

## Steps

1. **Design the change** (`database-design`). Define the new schema,
   constraints, and indexes. Prefer additive changes (new columns,
   new tables) over destructive ones; never drop a column the
   running code still reads.
2. **Write the migration.** Generate it with the ORM's migration tool
   (`prisma` or `drizzle`); review the generated SQL by hand. A
   migration the author has not read is not ready.
3. **Plan the rollout.** Decide whether the migration runs before,
   with, or after the code deploy. For breaking changes, use
   expand-then-contract: add the new shape, migrate the code, then
   remove the old shape in a later release.
4. **Test on a copy.** Apply the migration to a copy of production
   data (or a realistic seed) and measure how long it takes. A
   migration that locks a large table needs a different approach.
5. **Back up before applying.** Confirm a restorable backup exists
   and the restore path is known. If there is no backup, stop.
6. **Apply the migration.** Run it against the target database and
   confirm it completes. If it fails halfway, stop: do not re-run or
   hand-edit the database until the failure is understood.
7. **Verify the result.** Check the schema, row counts, and a sample
   of queries. Run the application's smoke tests against the migrated
   database.
8. **Run regression tests** (`regression-testing`) for the areas the
   schema change touches.
9. **Confirm the rollback.** If the migration must be reversed, the
   rollback migration (or restore) is tested, not assumed. Record
   how to roll back in the release notes.

## Outputs

- Reviewed migration file(s) and the rollout plan.
- Evidence the migration applies cleanly to a production-like copy.
- Rollback procedure, tested or explicitly untested with a reason.
- A note of timing and lock behavior for large tables.

## Checks

- [ ] The migration SQL was read and reviewed by hand.
- [ ] A restorable backup exists before applying.
- [ ] The migration was proven on a production-like copy.
- [ ] Expand-then-contract used for breaking changes.
- [ ] Rollback path is known and, where possible, tested.
- [ ] Smoke tests and regression tests pass after the migration.
