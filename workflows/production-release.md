# Production Release

Ship a release safely: verify, document, deploy, and watch it in
production.

## Inputs

- The change set to release (branch, commits, or version).
- Release notes or changelog draft, if one exists.
- Deployment target and rollback plan.

## Steps

1. **Confirm the release contents.** List what is included and what is
   not. Confirm the version number and that breaking changes are called
   out.
2. **Run the full verification** (`verification-before-completion`
   upstream). Type checks, lint, and the full test suite
   (`unit-testing`, `integration-testing`, `e2e-testing` as the
   project uses them). Do not release around failing checks.
3. **Run regression tests** (`regression-testing`) for areas the
   release touches.
4. **Review the change set** (`code-review`). Confirm blocking review
   feedback is resolved.
5. **Check security** (`owasp`, `secrets-management`). Confirm no
   secrets were introduced and no new unsafe patterns shipped.
6. **Write the changelog** (`changelog-management`). Record what
   changed, including breaking changes and migration notes.
7. **Deploy** (`deployment`, plus `cloudflare-workers` or `vercel`
   for the host). Deploy to staging or preview first when the project
   has one; verify there before production.
8. **Verify in production.** Check the deployed version responds and
   behaves as expected. Confirm the rollback path is known.
9. **Watch production** (`observability`). Check logs and metrics for
   errors after the release.
10. **Close out.** Confirm the release is done, note any follow-ups,
    and update the changelog or release notes if anything changed
    during the release.

## Outputs

- Released version, verified in production.
- Changelog entry describing the release.
- A short note of any follow-ups.

## Checks

- [ ] All checks pass; no release around failures.
- [ ] Breaking changes are documented with migration notes.
- [ ] No secrets in the release.
- [ ] Production verified after deployment.
- [ ] Rollback path is known.
- [ ] Logs checked after release.
