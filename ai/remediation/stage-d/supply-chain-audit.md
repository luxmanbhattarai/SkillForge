# Stage D — Supply-chain audit (A-23, A-27, L-Prisma)

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; nothing pushed,
  merged, or PR'd; no commit made by this agent — changes left uncommitted
  for coordinator review)
- **Scope:** A-23 (link-checker hardening), the supply-chain audit below,
  L-Prisma verification/consolidation, A-27 (Vercel re-import decision).
- **Method notes:** this agent made **no GitHub API calls** and ran **no
  online link check** against the real internet. Upstream drift status is
  cited from Stage A (API re-verification 2026-11-20) and the Stage D
  `check:upstream` re-run (5 up-to-date / 1 behind / 0 unknown) as reported
  in the mission brief. The Vercel re-import used the git protocol only.
  Link-checker online behavior was tested against a local stub server.

## Verdict

| Area | Result |
| --- | --- |
| Zero-dependency claim | **Verified** — no dependencies of any kind, no lockfile |
| GitHub Actions | 3 first-party actions, all SHA-pinned; pins re-verified by another Stage D agent |
| Binary files | 4 files, all upstream imports, all load-bearing; hashes recorded here for the first time |
| Upstream skill sources | 6 vendors, pins + licenses as recorded; Vercel re-imported to head (A-27, done) |
| Post-install scripts | **None** — no scripts hooks in `package.json`, no dependencies to carry any |
| Dependency confusion / typosquatting | Minimal surface (zero deps, private package); one documentation note on the `npx skills` path |
| Unnecessary dependencies | None by construction |
| L-Prisma | **Still holds** — Prisma 8 still an RC with no GA date (page unchanged since Stage C) |
| A-23 link-checker hardening | **Fixed** — code stripping, retry/backoff, inter-request delay; 14 regression tests pass |

No supply-chain finding blocks release. The open items are the
already-recorded Stage E issues A-25/A-26 (upstream LICENSE preservation,
second copyright holder — **not fixed here**, Stage E owns them) and the
`node-pty` dependency decision (§8).

## 1. Zero-dependency claim — verified

`package.json` (read 2026-11-20) contains **no** `dependencies`,
`devDependencies`, `peerDependencies`, or `optionalDependencies` keys at
all. There is **no lockfile**: `package-lock.json`, `yarn.lock`,
`pnpm-lock.yaml`, and `bun.lockb` were all checked and none exists. The
package is `"private": true`, `"type": "module"`, engines `node >= 18`.

**Why this is deliberate, not an accident.** Every script and test in the
repo runs on Node built-ins only: `node:fs`, `node:path`, `node:test`,
`node:assert`, `node:http` (test stub servers), the global `fetch`, and
`node:child_process`. The test runner is `node --test`, the linters are
hand-written scripts, and the eval harness is plain Node. There is no
build step, no bundler, and no test framework to install.

**Consequences, all already handled:**

- `npm audit` fails with `ENOLOCK` on a lockfile-less repo. The
  `security-audit` workflow already guards this: it runs the audit only
  if a lockfile exists, otherwise it prints the zero-dependency note and
  passes.
- Dependabot has deliberately **no npm ecosystem entry** (see §2): there
  is nothing for it to update.
- CI workflows pass no cache configuration to `setup-node`, with a
  comment in each workflow noting there is nothing to cache.
- Contributors need only Node ≥ 18; `npm install` is a no-op. There is
  no install-time code execution surface at all (see §5).

## 2. GitHub Actions inventory

Every `uses:` line across `.github/workflows/` (6 files) plus
`.github/dependabot.yml` was inventoried. Counts below are from the
working tree at audit time, which includes the Stage D CI agent's
in-flight workflow edits (new `evals` and `windows` jobs in
`validate-skills.yml`, concurrency groups); the **action SHAs are
identical** in the committed HEAD and the working tree — the CI edits did
not touch any pin.

| Action | Pinned SHA | Used in | What it does | Trust assessment |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` (v5) | All 6 workflows, 11 jobs | Checks out the repository | First-party GitHub action, SHA-pinned. The most widely used action in existence; compromise would be visible immediately. Low risk. |
| `actions/setup-node` | `a0853c24544627f65ddf259abe73b1d18a591444` (v5) | 5 workflows, 10 jobs | Installs Node.js (18/20/22 matrix in validate; 20 elsewhere) | First-party GitHub action, SHA-pinned. No cache configured (nothing to cache — see §1). Low risk. |
| `github/codeql-action/init` + `analyze` | `1bd86f2fdb4b86187fa4059f16f31a3202acc9ea` (v4, same SHA for both) | `codeql.yml`, 1 job | Initializes and runs CodeQL static analysis (javascript-typescript) | First-party GitHub action, SHA-pinned. Runs with `security-events: write` only in its own workflow. Low risk. |

**Dependabot** (`.github/dependabot.yml`): `github-actions` ecosystem
only, weekly schedule, directory `/`. No npm ecosystem entry by design
(zero dependencies). This is the mechanism that keeps the SHA pins
current: Dependabot opens one PR per action when a newer release exists.

**Notes:**

- All three actions are first-party (published by GitHub itself) and all
  pins carry a `# vN` version comment, so a reviewer can see the major
  version without resolving the SHA.
- No third-party actions are used anywhere. No action receives secrets
  except the default `GITHUB_TOKEN` (read-only here) in the upstream
  monitoring job; all workflows declare least-privilege `permissions`
  (mostly `contents: read`).
- **Pin re-verification belongs to another Stage D agent** (per the
  mission brief); this audit inventories the pins but does not
  re-resolve them against upstream tags. That agent's result should be
  recorded in the Stage D results before merge.
- **Update policy (no blind upgrades):** when Dependabot proposes a pin
  bump, take it one action at a time on its own PR, let CI run the full
  validation suite on it, and merge only on green. A `setup-node` major
  bump changes the Node toolchain the checks run under, so its PR needs
  the Node 18/20/22 matrix leg to pass, not just the default leg. A
  CodeQL major bump can change the query set and produce new findings;
  treat new findings as findings, not as noise to suppress. No action
  update is needed for this release: the pins are the current majors
  (checkout v5, setup-node v5, codeql-action v4) and no workflow has run
  on GitHub yet (L-CI), so the first remote run is the real test of the
  pins as they stand.

## 3. Binary files — all four identified

The security scan reports "4 binary files"; `file` confirms exactly four
non-text files in the tracked tree. All four are upstream imports, all
four are load-bearing (referenced by upstream content), and none is a
build artifact, credential, or unexplained blob. **No hash or content
inventory of these files existed anywhere in the repo before this audit**
(the PDF is mentioned in the remediation plan and verification matrix
only to say it is the repo's only PDF); the SHA-256 hashes below are the
first recorded copy.

| # | Path | Type / size | Provenance | Referenced by | Should it be there? |
| --- | --- | --- | --- | --- | --- |
| 1 | `skills/upstream/agentic-seo/seo/docs/images/example-prompt-output.png` | PNG, 815×1220 | Agentic SEO import, commit `67775741` | `skills/upstream/agentic-seo/seo/README.md` (documentation screenshot) | Yes — verbatim upstream docs asset |
| 2 | `skills/upstream/agentic-seo/seo/docs/images/report-dashboard.png` | PNG, 1365×1254 | Agentic SEO import, commit `67775741` | Same README (documentation screenshot) | Yes — verbatim upstream docs asset |
| 3 | `skills/upstream/anthropic/theme-factory/theme-showcase.pdf` | PDF 1.4, 10 pages | Anthropic import, commit `e4bb5d96` | Theme-factory skill showcase document | Yes — verbatim upstream skill asset (see A-35: it is the repo's only PDF and must not be confused with the implementation-report PDF, which lives outside the repo) |
| 4 | `skills/upstream/anthropic/web-artifacts-builder/scripts/shadcn-components.tar.gz` | gzip, 19,967 bytes, 49 entries | Anthropic import, commit `e4bb5d96` | `skills/upstream/anthropic/web-artifacts-builder/scripts/init-artifact.sh` (extracts it when scaffolding an artifact) | Yes — load-bearing upstream script asset |

SHA-256 (computed 2026-11-20, `sha256sum`):

- `example-prompt-output.png`: `f245824212620cbcf6e9b75b4780155b2d821febb3d9b69fcbea897d57839bb7`
- `report-dashboard.png`: `1c4bf2aeb6d7a4ccffbce2a333a69d5d3a35ba8c0a22e639d5b947a73bcab6bb`
- `theme-showcase.pdf`: `3e126eca9fe99088051f7cb984c97cedb31c7d9e09ce0ba5d61bd01e70a0d253`
- `shadcn-components.tar.gz`: `1296f069e825de7933de7e8ac63672495cacce3f88f2dc45554dbcddbcbca60f`

**Tarball contents inspected** (`tar -tzf`, listing only — nothing
extracted or executed): 49 entries, all under `components/ui/`, all
`.tsx` shadcn/ui component sources (accordion, alert, card, dialog,
tabs, tooltip, etc.). No executables, no scripts, no absolute paths, no
symlinks in the listing. The contents match what the skill's own
scaffolding script expects.

**Recommendation:** no change. The four files are legitimate upstream
content. If a future re-import changes any of them, the new hashes
should be recorded the same way (the re-import checklist in
`docs/UPDATE-PROCESS.md` does not currently ask for binary hashes — a
one-line addition there is a reasonable Stage E follow-up, not a
release blocker). Note the Vercel re-import in §7 deliberately did **not**
add a fifth binary: the upstream `web-design-guidelines.zip` was not
imported, matching the original import scope (skill directories only;
none of the five upstream zips are vendored).

## 4. Upstream skill sources

Six vendors, 49 skills. Pins and licenses below are as recorded in
`sources/imported-skills.md` and `sources/licenses.md`; Stage A
re-verified all six pins and licenses against the GitHub API on
2026-11-20, and the Stage D `check:upstream` re-run confirmed **5
up-to-date / 1 behind (Vercel) / 0 unknown** before the A-27 re-import.
This agent made no further API calls.

| Vendor | Source repo | Pinned commit | License | Skills |
| --- | --- | --- | --- | --- |
| Anthropic | `anthropics/skills` | `e4bb5d960d87126ff3b3a8af1a104b7db67560ba` | Apache-2.0 | 8 |
| Vercel | `vercel-labs/agent-skills` | `5a37a6329fbad3666c3207392a6a7c0110e92efb` (re-imported 2026-11-20; was `1a2c79d4…`) | MIT (README statement; no LICENSE file upstream) | 8 |
| Superpowers | `obra/superpowers` | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT | 13 |
| Prisma | `prisma/skills` | `a6f192959cf43b08aa330fe1ffca090267215812` | MIT | 11 |
| Marketing Skills | `coreyhaines31/marketingskills` | `5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1` | MIT | 8 (+ 11 tool files at `skills/upstream/tools/`) |
| Agentic SEO | `pwg-projects/agentic-seo-skill` | `67775741ce88e0a474513ac53d6f6e4558ff1a3b` | MIT | 1 |

**Trust notes (no change from Stage A/B unless stated):**

- All six imports are pinned to full 40-hex commits, recorded in both
  `sources/imported-skills.md` and each vendor's `ATTRIBUTION.md`, and
  monitored weekly by the `upstream` job in
  `scheduled-maintenance.yml` (informational, exits 0 on drift).
- Agentic SEO (S-14): the import source is a dormant fork of the
  author's repo; the author is 50 commits ahead. Decision stands:
  MONITOR, re-point at the next re-import. The weekly drift check
  watches the dormant fork, so drift on the author's repo is invisible
  to it — a known monitoring gap, recorded in Stage B.
- Agentic SEO (S-08/S-09, open upstream, mitigated in docs): the
  upstream skill documents an unsafe install pattern and its link
  checker disables TLS verification. Both are documented with warnings
  in this repo; the upstream text is unchanged and cannot be edited
  under the verbatim policy.
- Prisma (S-11, mitigated): the upstream upgrade guide recommends an
  insecure TLS workaround first; scanner exceptions are per-file and
  regression-tested (Stage B).
- Anthropic (S-10, accepted): one upstream helper runs user-supplied
  server commands through the shell; the commands come from the
  invoking user's own CLI arguments, not from untrusted input.
- **A-25/A-26 (Stage E, not fixed here):** three of six imports ship no
  preserved LICENSE file in the vendored copy (superpowers, prisma,
  marketingskills — copyright holders are recorded in ATTRIBUTION.md
  and `sources/licenses.md` only), and the agentic-seo LICENSE names a
  second copyright holder not recorded in this repo's attribution
  files. Cited here for completeness; Stage E owns both.

## 5. Post-install scripts — none

`package.json` has no `postinstall`, `preinstall`, `prepare`, or any
other lifecycle script — the `scripts` section is only check/test/utility
commands run explicitly by a maintainer. With zero dependencies there
are also no transitive install scripts: `npm install` in this repo
executes no third-party code at all. The only code that runs on a user's
machine from this repo is code the user invokes explicitly (`node
scripts/install-skills.mjs`, `npm test`, the check scripts) or code an
agent runs after reading a skill — and the repo's own guidance (AGENTS.md
discovery rules, `sources/imported-skills.md` policy 5) says never to
execute an imported script without reading it first.

## 6. Dependency confusion / typosquatting

**Inside the repo: no exposure.** There are no dependencies to confuse,
no private registry, and no scoped internal packages whose names could
be squatted on a public registry. The package name `skillforge` is
`"private": true` and is never published, so nothing in this repo ever
resolves it from npm.

**The `bin` entry:** `package.json` declares `"skillforge":
"scripts/install-skills.mjs"`. Because the package is private, this bin
is only reachable from a local clone (via `npm link` or by running the
script directly). It is **not** installable from npm, and nobody should
run `npx skillforge`: whatever that name resolves to on the public
registry is not this project. The documented install paths never use
it — they are (1) clone the repo and run `node
scripts/install-skills.mjs`, (2) the Skills CLI (below), and (3) a Git
submodule.

**The `npx skills add` path (documented in `README.md` and
`docs/INSTALLATION.md`):** this is the one place the repo's docs send
users to an npm package. The `skills` CLI is Vercel's
`vercel-labs/skills` (MIT, recorded in `sources/official-sources.md`),
and the documented command is `npx skills add
luxmanbhattarai/SkillForge`. Assessment:

- The GitHub specifier is exact (`owner/repo`), so there is no
  ambiguity about which repository's skills get installed — a
  same-named repo under another owner cannot be substituted by
  accident.
- The CLI itself, however, is fetched unpinned: `npx skills` installs
  whatever `latest` of the `skills` package is on npm at run time. The
  repo has no control over that package. If it were compromised or the
  name taken over, users following the docs would execute attacker
  code. This is a documentation-level exposure, not a repo dependency:
  nothing in the repo itself installs or runs the CLI.
- **Recommendation (not a release blocker):** at the next docs pass,
  consider pinning a known-good CLI version in the documented commands
  (the `skills@x.y.z` form) and noting the primary install path (clone
  + local script) as the one that avoids npm entirely. Do not invent a
  version number to pin — the pin must come from a verified install,
  the way the Phase 12 sandbox run verified the CLI against the local
  library. No change made here: the docs wording is out of this
  agent's file scope, and an unpinned-but-explicit command is honest
  about what it does.

**Upstream skill content as a confusion vector:** the six upstream
imports are pinned by commit hash, not by tag or branch, so a retagged
release or a force-push cannot silently change what a re-import pulls
— the pin either resolves to the same content or fails loudly. The
re-import in §7 verified byte-identity against the new pin before
anything was committed to the working tree.

## 7. A-27 — Vercel re-import: DONE (verbatim, verified)

**Decision: re-imported.** The change was confined to the expected
files, reviewed, and verified byte-identical to upstream at the new
pin. No unexpected files, no new skills, no validation failures.

**Upstream diff** (`1a2c79d4…` → `5a37a632…`, 4 commits, all
`web-design-guidelines`, fetched via git protocol into a scratch clone
outside the repo):

- `f766b64` — bundle pinned guidelines instead of fetching from `main`
- `840f3b0` — regenerate the zip with bundled guidelines
- `53b6e3d` — expand guideline update steps (docs)
- `5a37a63` — merge of the above (PR #358)

Files changed upstream: `skills/web-design-guidelines.zip` (binary,
946 → 5,458 bytes), `skills/web-design-guidelines/SKILL.md` (version
1.0.0 → 1.1.0; now reads the bundled reference file instead of fetching
rules from the network at review time), and the new
`skills/web-design-guidelines/references/command.md` (191 lines: the
pinned Web Interface Guidelines snapshot, pinned to upstream commit
`434b7f91` of `vercel-labs/web-interface-guidelines`).

**Baseline check first:** before touching anything, all 259 vendored
Vercel files were hash-compared against upstream at the old pin
(accounting for the three documented directory renames and the
exclusion of the five upstream zips and `react-native-skills`):
**259/259 byte-identical, 0 mismatches**, and the vendored file count
matches the upstream file count exactly. The vendored tree was a clean
verbatim import, so the re-import had a trustworthy baseline.

**What was imported:** `SKILL.md` (replaced) and
`references/command.md` (new) only. The `.zip` was **not** imported:
the original import scope was skill directories only, none of the five
upstream zips are vendored, and the skill's new text does not need the
zip — the bundled reference file is what the skill reads. (The SKILL.md
"Updating the Guidelines" section mentions regenerating the zip; that
is an instruction for upstream maintainers, not a dependency of the
vendored skill.)

**Review (UPDATE-PROCESS step 8):** the full diff was read, including
all 191 lines of the new reference file. It is pure design-guideline
prose (accessibility, focus states, forms, animation, typography,
performance, anti-patterns, output format). No scripts, no executable
content, no network calls in the new material — the change *removes* a
network fetch from the skill's workflow. The license is unchanged (MIT
statement in the upstream README; still no LICENSE file upstream).

**Byte-identity verification:** both imported files were hash-compared
against upstream at `5a37a632` after copying — both match. The new
reference file's SHA-256 (`d246b026…e0234`) also matches the hash the
new SKILL.md itself states, which independently confirms the snapshot
is the one upstream pinned.

**Records updated:** `skills/upstream/vercel/ATTRIBUTION.md` (new
commit; original pin noted), `sources/imported-skills.md` (new commit;
re-import noted). Registry regenerated: the only diff is
`web-design-guidelines` 1.0.0 → 1.1.0 in `registry/skills.json` and
`registry/versions.json`. Historical records (final report, audit
files, issue register, verification matrix) were deliberately left
alone — they describe the state at their own dates.

**Validation after re-import:** `npm run validate` PASS (same 4
pre-existing upstream warnings), `npm run check:sources` PASS (0
warnings), `npm run check:links` (offline) PASS, `npm run
check:security` PASS, `npm test` 225/226 in the full run with the
single failure explained as a test-environment artifact (see §9) and
passing standalone. No eval case references `web-design-guidelines`,
so the content change cannot affect the eval suite.

**Follow-ups for the coordinator (not done here):** `docs/UPDATE-PROCESS.md`
step 7 asks for a CHANGELOG entry under `Unreleased` naming the vendor
and new commit — CHANGELOG.md was outside this agent's file scope, so
the entry is still owed. `npm run check:upstream` should now report
Vercel up-to-date (6/0/0); worth a re-run when the coordinator next
runs the battery, since the Stage D 5/1/0 result predates this
re-import.

## 8. Recommended updates — compatibility impact and test requirements

No blind upgrades. Each candidate below states what changes, what could
break, and what must be run before merging.

| Candidate | Recommendation | Compatibility impact | Test requirements |
| --- | --- | --- | --- |
| Vercel re-import (`1a2c79d4` → `5a37a632`) | **Done (§7)** | Skill version 1.0.0 → 1.1.0; the skill no longer fetches rules from the network at review time (behavior change, in the direction of less network dependence). No API, registry schema, or installer impact. | Done: validate, check:sources, check:links offline, check:security, npm test. Coordinator to re-run `check:upstream` + the full battery at merge. |
| Prisma 8 (ORM) | **Do not upgrade** — still an RC with no GA date (§9). The library stance (pin `prisma@7`, use `npx prisma@7` in CI) stands. | A GA upgrade would be a breaking change for Prisma users: new contract model, per-database libraries, dropped commands, new minimum Node/TS versions. The GA upgrade path is documented in `ai/remediation/stage-c/regression-145-review.md` §4. | At GA: re-verify every Prisma skill, the three upstream Prisma skills' RC pins, Prisma-related eval cases, and the Compute/Accelerate guidance (Accelerate retires 2026-12-01). |
| GitHub Actions pin bumps (via Dependabot) | Take one at a time, on green CI (§2). None needed for this release. | `setup-node` major bumps change the CI toolchain; CodeQL major bumps can add findings. | Full CI run on the PR, including the Node 18/20/22 matrix for `setup-node` and a findings review for CodeQL. |
| `node-pty` (or equivalent) for Windows PTY tests | **Do not add in this cycle.** Stage C left it as a dependency decision for Stage D (A-13): the installer prompt tests skip on Windows because there is no `script` binary there. | It would be the repo's **first dependency**: it ends the zero-dependency posture, requires a lockfile, adds a native build to CI, and creates the repo's first `npm audit` surface. That is a deliberate architecture decision, not a test fix. | If ever adopted: add the lockfile, extend the security-audit workflow's conditional audit, pin the version, and prove the Windows PTY tests pass in the new `windows` CI job. Until then, the honest skip-with-reason stands. |
| Other upstream re-imports | None due. After the Vercel re-import, all six vendors are at head as of the last drift check. | Each re-import is a content change to vendored skills; follow `docs/UPDATE-PROCESS.md` (verbatim copy, hash verification, registry regen, validation). | Same battery as §7. Agentic SEO re-point (S-14) needs the fork-vs-author decision first, not just a pin bump. |

## 9. L-Prisma — spot-check: headline claim still holds

Stage C resolved L-Prisma (see `ai/remediation/stage-c/regression-145-review.md`
§4 and `ai/remediation/STAGE-C-RESULTS.md` §6): current stable Prisma
ORM 7.10.1; Prisma 8 still a release candidate with no GA date
announced. This agent spot-checked only the headline claim against the
official release-status page
(https://www.prisma.io/docs/orm/release-status, fetched 2026-11-20):

- **The page is unchanged since Stage C** — same "Updated"
  timestamp (`2026-11-20T15:18:16Z`), same version table (`prisma`
  8.0.0-rc.34, `@prisma/orm-postgres` / `@prisma/orm-mongo`
  8.0.0-rc.24, dated 16 November 2026), same statement that Prisma
  ORM 8 "has not reached general availability yet" and that npm still
  installs a release candidate under `latest`. No GA date has been
  announced.
- The page still says `@prisma/client` stays at 7.10.1, Prisma 7 is
  supported for 18 months after Prisma 8 GA, and Prisma 6 support
  ended 19 November 2026. It still recommends locking `prisma@7` /
  `@prisma/client@7` and using `npx prisma@7` for unversioned runs —
  exactly the library's stance.
- **No research redone, no version changed.** The three upstream Prisma
  skills' stale RC pins remain documented-only (upstream policy), as
  Stage C left them.

**Stance documentation — no edit needed.** The task asked for a docs
note if the pin-`prisma@7` stance lived only in the Stage C fragment.
It does not: the stance is already stated in the user-facing
`skills/database/prisma/SKILL.md` ("Pin the major version in
`package.json` (`prisma@7` and `@prisma/client@7`)… In CI or one-off
commands use `npx prisma@7`"), which is the most sensible place for it
— it is where a Prisma user will actually read it. The GA upgrade path
stays in the Stage C fragment, which is the right home for a
point-in-time plan; no new file and no docs edit were made.

## 10. A-23 — link-checker hardening: fixed

`scripts/check-links.mjs` was hardened; the validation rules for real
links are unchanged (what counts as broken / verified / skipped is the
same — only the fetching is more patient and code examples are no
longer mistaken for links).

**Changes:**

- **Code stripping.** Link extraction now strips fenced code blocks
  (triple-backtick and tilde fences) and inline code spans
  (single- and double-backtick) before matching links. This is the
  Stage B lesson: a link-shaped example in prose tripped the offline
  check because the checker read it as a real link. Exported as
  `stripCode(text)` / `extractLinks(text)` for testing.
- **Retry with backoff (online path).** `fetchWithRetry` retries
  403/429 responses and network errors/timeouts, up to 3 attempts,
  with exponential backoff (500ms, then 1000ms). Non-retryable
  statuses are returned immediately, never retried. The existing
  HEAD-then-GET-fallback rule (GET on 405/403/429) is preserved; the
  GET fallback now also retries.
- **Inter-request delay (online path).** `verifyExternalUrls` waits
  200ms between requests (not before the first, not for skipped URLs),
  so the weekly online run no longer fires a burst.
- **Testability.** The script was restructured into exported functions
  behind a main-guard (the same pattern `evals/runners/run-evals.mjs`
  uses for `validateCases`), so tests import the helpers without
  running a full check. CLI behavior is unchanged: same flags, same
  output lines, same exit codes.

**Tests** (`test/links.test.mjs`, 14 tests, all passing, hermetic — the
online tests run against a local `127.0.0.1` stub server, no real
network):

- Extraction ignores inline-code, double-backtick, and fenced-block
  link-shaped text; still extracts real internal/external/anchored/
  titled links; leaves plain prose untouched (5 tests).
- Retry: 429-then-200, 403-then-200, and timeout-then-200 all verify,
  each with exactly 2 stub hits (3 tests).
- A persistent 429 exhausts retries on HEAD and on the GET fallback
  (4 hits at 2 attempts); a 404 is reported immediately with 1 hit;
  the GET fallback still decides when HEAD returns 405 (3 tests).
- The inter-request delay is applied (3 URLs at 120ms delay take
  ≥ 200ms — asserted loosely so a busy CI machine cannot flake it);
  example domains and documented exceptions are skipped without
  fetching; a broken URL is reported with its referencing file
  (3 tests).

**Observed effect on the offline run:** `npm run check:links` still
passes with 75 internal links, and the external-URL count went from
610 to 604 — the 6 dropped URLs are all `example.com` placeholders
inside one fenced code block in `skills/seo/llms-txt/SKILL.md`, which
were previously enumerated (and then skipped as example domains)
and are now correctly never counted as links.

## 11. Validation runs (this agent)

All commands run from the repo root on branch
`feat/skillforge-production-upgrade`, after the last edit unless noted.
`npm test` needed a `TMPDIR` redirect because the environment's `/tmp`
(a 512 MB tmpfs) is 100% full; the redirect target was `/dev/shm`
with mode 755 (see the note below).

| Command | Result |
| --- | --- |
| `node --test test/links.test.mjs` | **14/14 pass** |
| `npm run check:links` (offline) | PASS (75 internal links; 604 unique external URLs listed) |
| `npm run check:security` | PASS: no findings (1,060 text files + 4 binary, 29 patterns) at the final run — see the transient-red note below |
| `npm run validate` | PASS with 4 warnings (same 4 pre-existing upstream warnings) |
| `npm run check:sources` | PASS (277 skills, 0 warnings) |
| `npm run registry` (after re-import) | Only diff: `web-design-guidelines` 1.0.0 → 1.1.0 in `skills.json` + `versions.json` |
| `npm test` (full, `TMPDIR=/dev/shm/sf-test-tmp`) | **227/227 pass, 0 fail** (single clean run after the last edit; the count includes this agent's 14 new tests plus other agents' concurrent additions) |

**Notes for the coordinator:**

- **Security scan went transiently red mid-stage, then green again.**
  One run during this stage reported a single finding in another
  agent's in-flight file (`ai/remediation/stage-d/ci-validation.md`,
  an unpinned package-install command tripping CMD-04). No finding
  ever named any file this agent changed. The owning agent has since
  reworded that file and the final run is green (see table). This
  agent did not touch the other agent's file.
- **Test-environment note (not a repo defect).** `/tmp` is full (512 MB
  tmpfs, 100% used — largely other agents' leftover installer-test
  sandboxes and a 136 MB `/tmp/stage-d` directory; this agent deleted
  nothing belonging to others). The full suite was therefore run with
  `TMPDIR` pointed at `/dev/shm`. Two artifacts of that redirect, both
  understood and both resolved: (1) an early full run executed while
  another Stage D agent was mid-edit of `scripts/install/` failed 23
  installer tests with an error naming a variable that no longer
  exists in the tree — a re-run after those edits settled passed
  79/80; (2) the permission test failed twice for redirect reasons
  (first `chown` refused on the workspace mount, then `nobody`
  unable to traverse a mode-770 redirect directory) and passes with
  the redirect directory at mode 755. Neither failure implicates this
  agent's changes. The coordinator's merge-time battery should run
  with a clean `/tmp` (or the same `/dev/shm` redirect) and with no
  concurrent edits in flight.
- **Concurrent in-flight work observed (not touched):** uncommitted
  edits by other Stage D agents in `.github/workflows/`,
  `scripts/install/` (+ new `scripts/install/links.mjs`), and
  `test/helpers.mjs`. This agent's files do not overlap them except
  that the actions inventory in §2 was taken with the CI agent's
  workflow edits present; the pins are identical to HEAD.
- **Files changed by this agent (all uncommitted):**
  `scripts/check-links.mjs`, `test/links.test.mjs` (new),
  `ai/remediation/stage-d/supply-chain-audit.md` (new, this file),
  `skills/upstream/vercel/web-design-guidelines/SKILL.md`,
  `skills/upstream/vercel/web-design-guidelines/references/command.md`
  (new), `skills/upstream/vercel/ATTRIBUTION.md`,
  `sources/imported-skills.md`, `registry/skills.json`,
  `registry/versions.json`.
- **Scratch cleanup:** the upstream clone used for the re-import lived
  outside the repo (`~/workspace/.scratch/vercel-agent-skills`) and
  was removed after verification, along with the test `TMPDIR`
  sandboxes. No scratch files remain in the repo tree.
