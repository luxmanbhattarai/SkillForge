# Pinned GitHub Actions (Phase 10)

Every third-party action used by `.github/workflows/` is pinned to a
full 40-character commit SHA (audit finding M-04). No floating tags
remain in any workflow.

## Pins

| Action | Tag | Pinned SHA | Verified |
| --- | --- | --- | --- |
| `actions/checkout` | v5 | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` | `git ls-remote`, 2026-11-20 |
| `actions/setup-node` | v5 | `a0853c24544627f65ddf259abe73b1d18a591444` | `git ls-remote`, 2026-11-20 |
| `github/codeql-action/init` | v4 | `1bd86f2fdb4b86187fa4059f16f31a3202acc9ea` | `git ls-remote` (dereferenced), 2026-11-20 |
| `github/codeql-action/analyze` | v4 | `1bd86f2fdb4b86187fa4059f16f31a3202acc9ea` | `git ls-remote` (dereferenced), 2026-11-20 |

The `init` and `analyze` sub-actions share one SHA because they are
directories of the same `github/codeql-action` repository at the same
commit.

## Verification method

Each SHA was read from the upstream repository with `git ls-remote`,
never copied from memory or documentation:

```sh
git ls-remote https://github.com/actions/checkout.git 'refs/tags/v[345]'
git ls-remote https://github.com/actions/setup-node.git 'refs/tags/v[345]'
git ls-remote https://github.com/github/codeql-action.git 'refs/tags/v[345]'
```

`actions/checkout` and `actions/setup-node` use lightweight tags, so
the tag ref points directly at the commit. `github/codeql-action`
uses **annotated** tags: `refs/tags/v4` points at tag object
`800a1d8701a65d150a672fef0923dbf2660a62ec`, and the commit it points
to was resolved with:

```sh
git ls-remote https://github.com/github/codeql-action.git 'refs/tags/v[345]^{}'
# refs/tags/v4^{} -> 1bd86f2fdb4b86187fa4059f16f31a3202acc9ea
```

The pinned SHA is the dereferenced commit SHA, which is what GitHub
Actions checks out. Pinning the tag-object SHA would fail.

## Tag choices

- v5 is the current major for `actions/checkout` and
  `actions/setup-node` (confirmed via `ls-remote`: both repos have a
  `v5` tag).
- v4 is the current major for `github/codeql-action` (confirmed via
  `ls-remote`: the repo has `v3` and `v4` tags, no `v5`).

## Staying current

`.github/dependabot.yml` enables weekly Dependabot updates for the
`github-actions` ecosystem, so a newer release of any pinned action
arrives as a PR with the new SHA. Review the diff, then merge.
