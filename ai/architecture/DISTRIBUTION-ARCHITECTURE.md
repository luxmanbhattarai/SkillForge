# Distribution Architecture

- **Phase:** 6 of the SkillForge production-hardening mission
  (Group B).
- **Date:** 2026-11-22.
- **Branch:** `feat/production-hardening` (from `main` @ `b86b469`).
- **Current version:** 1.1.0. `package.json` has `"private": true`
  — unchanged by this phase, by design.

## 1. Current state

SkillForge is distributed **only through GitHub** today:

| Channel | State |
| --- | --- |
| GitHub repository | Public: https://github.com/luxmanbhattarai/SkillForge |
| GitHub Releases | v1.0.0 (restored) and v1.1.0 (Latest), each with GitHub's auto-generated source archives (zip + tar.gz) of the tagged commit. No other release assets. |
| npm | **Not published.** `package.json` is `"private": true` and the unscoped name `skillforge` is taken by an unrelated package (see §6). |
| Installer CLI | `scripts/install-skills.mjs` (bin: `skillforge`) installs skills from a local checkout into Claude Code / Cursor / Codex / Antigravity, project or user scope. It is run from the repo, not from a published package. |

There is no build step: the release artifact is the source tree
itself (1,135 tracked files at `b86b469`, ~13 MB). There are zero
npm dependencies and no lockfile, so there is no dependency tree
to ship, audit, or keep in sync — the supply chain is the repo's
own files plus the pinned GitHub Actions that validate them.

## 2. Release workflow verification

`.github/workflows/release.yml` ("Release validation") runs on
tag pushes (`v*.*.*`). It is **validation-only**: it creates no
release and publishes nothing. Its purpose is that a bad tag can
never look green.

### 2.1 What the workflow checks (verified by reading it)

| Gate | How | Verdict |
| --- | --- | --- |
| Tag ↔ version matching | `v$TAG` must equal `package.json` `version` (including any `-rc.N` suffix) | ✅ |
| CHANGELOG entry | `CHANGELOG.md` must contain a `## [$TAG]` section | ✅ |
| Strict skill validation | `npm run validate:strict` | ✅ |
| Frontmatter, links (offline), duplicates, sources/licenses, agents/workflows | `check:*` scripts | ✅ |
| Security scan | `npm run check:security` (29 patterns + binary hashes) | ✅ |
| Quality scoring | `npm run score` | ✅ |
| Regression tests | `npm test` | ✅ |
| Behavioral evals (mock provider) | `npm run evals` — no LLM APIs, no keys, no network | ✅ |
| Registry schema + contents | `npm run check:registry` | ✅ |
| Registry freshness | Regenerate (`npm run registry`) and fail if `registry/` differs | ✅ |
| Audit-report freshness | Regenerate (`npm run report`) and fail if `report.json` / `AUDIT-REPORT.md` differ | ✅ |
| Permissions | `contents: read`, no secrets | ✅ least privilege |
| Concurrency | None, deliberately: each run validates one immutable tag; runs are read-only and never interfere | ✅ by design |
| Timeout | 10 minutes | ✅ |

**Observations (not defects):**

- The workflow validates the *tagged tree*, not its ancestry: it
  does not check that the tag's commit is on `main`. A tag pushed
  on a side branch would validate green. Tag discipline (tags are
  created from `main` by the owner) and branch protection cover
  this today; a `git branch --contains` ancestry check would be a
  possible future hardening.
- There is no clean-tree check, and none is needed: CI checks out
  the tag, which is clean by definition. The registry/report
  diff gates serve as the "generated files match the tree" check.
- The workflow has no artifact uploads: its output is the green
  check on the tag. The SBOM (§5) is generated on demand, not by
  this workflow; attaching it to the tag run is a possible future
  step (see §8).

### 2.2 Evidence: the v1.1.0 tag run (on GitHub)

Run `44967209791` (tag push, head `9216cbb`, created
2026-11-22T00:33:35Z): **conclusion `success`** — the first
execution of `release.yml`, all steps green. This is the live
proof that the gates work end to end, including the tag↔version
and CHANGELOG gates that only a real tag push exercises.

### 2.3 Local re-run of the release validation steps (2026-11-22)

Every `release.yml` step was re-run locally on the
`feat/production-hardening` tree. The registry/report regenerate
steps are forbidden to run in-repo by the mission rules, so they
were run in a throwaway `/tmp` copy of the tree and diffed back
against the repo — equivalent to the CI gate without touching the
working tree.

| Step | Result |
| --- | --- |
| Tag ↔ version gate (simulated, v1.1.0) | ✅ pass — tag `1.1.0` == `package.json` `1.1.0` |
| CHANGELOG gate (simulated, v1.1.0) | ✅ pass — `## [1.1.0]` present |
| `npm run validate:strict` | ✅ pass (4 upstream warnings, informational) |
| `npm run check:frontmatter` | ✅ pass — 277 skills |
| `npm run check:links` (offline) | ✅ pass — 75 internal links, 607 external URLs listed |
| `npm run check:duplicates` | ✅ pass — 277 skills compared |
| `npm run check:sources` | ✅ pass — 277 skills, 7 sources, 0 warnings |
| `npm run check:agents` | ✅ pass — 40 files (24 agents, 16 workflows) |
| `npm run check:security` | ✅ pass after one fix — see below |
| `npm run score` | ✅ pass |
| `npm test` | ⚠️ exit 1 — 402/416 pass; 12 failures, all in other workers' in-flight files (see below) |
| `npm run evals` (mock) | ✅ pass — 463/463, 0 failed, 0 critical, 277/277 coverage, 0 regressions |
| `npm run check:registry` | ✅ pass (1 warning: the documented link-building override) |
| Registry regenerate + diff (via `/tmp` copy) | ✅ pass — regenerated registry byte-identical |
| Audit-report regenerate + diff (via `/tmp` copy) | ✅ pass — `report.json` and `AUDIT-REPORT.md` byte-identical |

**Security-scan note:** the first `check:security` run flagged
one HIGH finding — in this phase's own new file,
`evals/run-real-model.mjs`, where a log string containing the
word "eval" immediately followed by an open parenthesis matched
the scanner's CODE-01 pattern for dynamic code execution. It was
a false positive (no dynamic code execution call exists in the
file); the string was reworded to `Real-model run (` and the scan
re-ran green (1,148 text files + 4 binary files, 29 patterns, 0
findings).

**`npm test` note — read before citing this battery:** the 12
failures are not in Group B's code. 9 are in
`test/installer-integration.test.mjs` and 2 in
`test/freshness.test.mjs` — test files added to the shared working
tree by other mission workers while this battery ran — and 1 is a
stale line-count expectation in `test/validate.test.mjs`
(nextjs `SKILL.md` grew to 530 lines after another worker's edit;
the test expects `51x` lines — the behavior it checks still
holds, only the expected number is stale). Group B's own tests
(`test/real-model-eval.test.mjs`, `test/generate-sbom.test.mjs`)
are 20/20 green in the same run. The release battery on this
shared tree cannot be called fully green until the owning workers
resolve their 12 failures — but the release *workflow* is verified
sound (§2.1) and green on the v1.1.0 tag (§2.2).

### 2.4 Version consistency (verified 2026-11-22)

`package.json` 1.1.0, `CHANGELOG.md` `## [1.1.0]`, README status
line "v1.1.0 released 2026-11-21", `ai/PROJECT-STATUS.json`
version 1.1.0 — all consistent. Registry holds 277 skills
(`generated: 2026-11-20`, from the max `last_verified` date, not
wall clock — deterministic by design).

## 3. Recommended distribution strategy

**Primary: GitHub Releases (current, keep).** The audience is
developers installing skills into AI coding tools from a repo
checkout or a downloaded archive; GitHub Releases serve that
audience with no new infrastructure, no registry account, and no
publish credentials to protect. Every release is a tagged commit
plus GitHub's auto-generated source archives, gated by
`release.yml` (§2).

**Secondary, opt-in only: npm (prepare now, decide later).**
npm would serve one new audience: users who want `npx skillforge`
or a `npm install -g` path instead of cloning. That audience is
real but unproven, and npm adds a permanent maintenance surface
(name ownership, token security, version discipline, tarball
contents). The capability is now prepared (§6) so the decision can
be taken later on evidence, not under time pressure. It must not
be switched on casually: the preconditions in §6 are all
deliberate owner decisions.

**Not recommended:** a custom download server, a Homebrew tap, or
any channel that duplicates the GitHub release without adding an
audience. Each new channel is a new place where a stale or
tampered copy can live.

## 4. Package integrity verification

Consumers verify a release in three layers, cheapest first:

1. **Git tag.** `git tag --verify` is not applicable (tags are
   annotated but unsigned — see §7); the practical check is that
   the tag points at the expected commit (`git rev-list -n 1
   v1.1.0`) and that the commit is on `main`.
2. **Archive checksums.** GitHub's source archives are
   deterministic per commit, but GitHub does not publish
   checksums for them. The verifiable checksum set is the SBOM
   (§5): every tracked file's SHA-256. To verify an extracted
   archive, recompute the file hashes and compare against the
   SBOM for that release. (The SBOM is generated per tree, so a
   release's SBOM must be archived with the release — see §8.)
3. **npm integrity (if npm is ever used).** The registry serves a
   `dist.integrity` (SHA-512) per tarball; `npm install` verifies
   it automatically. The publish workflow (§6) also records the
   tarball SHA-256 in `checksums.txt` alongside the SBOM.

## 5. SBOM generation

`node scripts/generate-sbom.mjs [--out <file>] [--root <dir>]`
writes a CycloneDX 1.5 JSON document (`sbom.json` by default).
Because the repo has zero npm dependencies, the SBOM inventories
what actually matters for this repo:

- **One `file` component per tracked file** (`git ls-files` —
  the exact tree GitHub archives for a release), each with its
  SHA-256 hash and size. At `b86b469`: 1,135 files.
- **One `library` component per pinned GitHub Action** used by
  any workflow, with its pinned commit SHA, tag (when recorded),
  and a `pkg:github/...` purl. At `b86b469`: 5 actions
  (`actions/checkout`, `actions/setup-node`,
  `github/codeql-action/init`, `github/codeql-action/analyze`,
  `gitleaks/gitleaks-action`).
- **Metadata:** package name/version, license (MIT), zero
  npm dependencies (recorded explicitly), file count, total
  bytes, git commit, generator version.

The component hashes are deterministic — the same tree always
produces the same hashes — so two SBOMs for the same release are
comparable by their components (the document timestamp varies per
run by design). When git is unavailable, the script falls back to
a filesystem walk that skips `.git`/`node_modules` and refuses
symlinks escaping the tree. Tests:
`test/generate-sbom.test.mjs` (7 tests, all passing), including a
test that the real-repo SBOM matches `git ls-files` exactly.

## 6. Optional npm distribution (prepared, not enabled)

**Capability:** `.github/workflows/publish-npm.yml`, created in
this phase. It is `workflow_dispatch` **only** — no push,
pull-request, tag, or schedule trigger exists, so it is
impossible for it to publish on push/tag/schedule. It defaults
to **dry-run**: a dispatch with no inputs only packs the tarball,
prints what would ship, generates the SBOM + checksums, and
uploads them as artifacts. Publishing requires explicitly setting
`dry_run=false`, and then only if every guard passes:

| Guard | What it enforces |
| --- | --- |
| Main branch only | A dispatch from any other branch refuses to publish. |
| Not private | `package.json` must no longer have `"private": true`. The workflow never edits `package.json` — flipping it is a reviewed owner commit. |
| Name not taken | The unscoped name `skillforge` is refused (see below). |
| NPM_TOKEN present | The `NPM_TOKEN` repository secret must exist (granular token, publish permission for the package only). |
| Version free | `npm view <pkg>@<version>` must 404 — no republishing a version. |
| Full validation green | The same battery as `release.yml` (validate, checks, security, score, tests, evals, registry + report diff gates). |
| Environment | The job runs in the `npm` GitHub Environment — configure required reviewers there before the first real publish. |
| Provenance + checksums | `npm publish --provenance --access public --tag <dist-tag>` (Sigstore attestation linking the tarball to the workflow run; needs `id-token: write`); SBOM + tarball SHA-256 uploaded as artifacts (90-day retention). |

**The name problem (verified 2026-11-22):** the unscoped npm
name `skillforge` is **taken by an unrelated package**
(`skillforge@0.1.0`, "Minimal runner and eval framework for
Claude Skills"). Publishing under it is impossible. The
recommended path is a scoped name the owner controls, e.g.
`@luxmanbhattarai/skillforge` — which also namespaces the package
to the author and avoids future collisions. Renaming is a
`package.json` edit (plus the README/install docs that name the
package) owned by the coordinator/owner; it is not done here.

**Tarball contents (decision needed before the first publish):**
`package.json` has no `files` field, so `npm pack` ships
everything npm does not exclude — including `test/`, `ai/`,
`evals/`, and workflow files. Before the first real publish, add
a `files` allowlist shipping only the installable payload
(skills, registry, installer CLI, README, LICENSE, CHANGELOG).
The dry-run `npm pack --dry-run` output is the review point for
this: it lists exactly what would ship. The `bin` entry
(`skillforge` → `scripts/install-skills.mjs`) already exists and
needs no change.

**Preconditions checklist for the first npm publish** (all owner
decisions; none done in this phase):

1. [ ] Decide the package name (scoped name recommended — the
       unscoped name is taken).
2. [ ] Add a `files` allowlist to `package.json`.
3. [ ] Flip `"private": true` → `false` in a reviewed commit on
       `main`.
4. [ ] Create a granular `NPM_TOKEN` secret (publish permission
       for the package only).
5. [ ] Create the `npm` GitHub Environment with required
       reviewers.
6. [ ] Dispatch the workflow with `dry_run=true` first; review
       the packed file list, SBOM, and checksums.
7. [ ] Dispatch with `dry_run=false` and `dist_tag=latest`
       (or `next` for a pre-release).

## 7. Release provenance

- **GitHub Releases (today):** provenance is the tag → commit
  link plus the green `release.yml` run on that tag. Tags are
  annotated but **unsigned**; signed tags (GPG/SSH) would add
  authorship proof and are a possible future step — they need the
  owner's signing key and are not set up here. GitHub artifact
  attestations (`gh attestation`) for release archives are
  another future option; they are not configured.
- **npm (if enabled):** `--provenance` attaches a Sigstore
  attestation binding the tarball to the exact workflow run, and
  the publish workflow uploads the SBOM + tarball SHA-256 as run
  artifacts. Consumers can verify with `npm audit signatures`
  and the published `dist.integrity`.

## 8. Artifact retention

| Artifact | Retention |
| --- | --- |
| GitHub Releases + source archives | Permanent (until a release is deleted by the owner). |
| `release.yml` run logs | GitHub default, 90 days. No artifacts uploaded by the workflow. |
| `publish-npm.yml` SBOM + checksums artifacts | 90 days (`retention-days: 90`). |
| SBOM for a release | **Gap:** the SBOM is generated on demand and is not currently archived with the release. Until a release's SBOM is attached to the GitHub Release (or committed under `ai/` with a dated name), a consumer cannot fetch the SBOM for v1.1.0 from the release page — they must regenerate it from the tag. Recommended follow-up: attach `sbom.json` to each GitHub Release (a release-asset step, owner decision — it changes what a release contains). |

## 9. Version compatibility

- **Semver:** the project follows Semantic Versioning
  (CHANGELOG format: Keep a Changelog). 1.1.0 was a
  backwards-compatible production upgrade (51 new skills, new
  agents/workflows, installer overhaul); the one breaking-adjacent
  change — Codex/Antigravity install paths — is documented in
  `UPGRADE.md` and `docs/INSTALLATION.md`.
- **Runtime:** `engines: { node: ">=24" }`. The installer CLI and
  all scripts target Node 24; CI runs Node 24 everywhere.
- **Consumers:** skills are Markdown + frontmatter consumed by
  Claude Code, Cursor, Codex, and Antigravity. The installer
  abstracts the per-tool paths; a new tool target is a
  `target-tree.json` entry, not a release-format change.
- **Upgrade path:** installers are idempotent — re-running the
  installer updates an existing install in place, and `update` /
  `restore` commands exist for recovery. The registry is
  deterministic (generated from max `last_verified`), so a
  regenerated registry for the same tree is byte-identical (§2.3).

## 10. Decisions needed from the owner

1. **npm: yes or no, and when.** The capability is ready; the
   name, `files` allowlist, `private` flip, token, and
   environment reviewers are all owner decisions (§6).
2. **Package name if npm goes ahead.** Scoped
   `@luxmanbhattarai/skillforge` recommended (unscoped is taken).
3. **Attach the SBOM to GitHub Releases?** Closes the §8 gap;
   changes what a release contains.
4. **Signed tags?** Adds authorship proof to releases; needs the
   owner's signing key.
5. **Attach the SBOM to the `release.yml` tag run as an artifact?**
   Would give every tag validation a downloadable SBOM without
   changing releases.
