# Production Readiness Audit — SkillForge

**Branch:** `feat/skillforge-production-upgrade`
**HEAD audited:** `b6193885426cdc473428308a82f88a16d0e84e04`
**Audit date:** 2026-11-21
**Auditors:** 5 parallel Phase A workstreams (docs/history, code review, skills data,
CI/config, security) coordinated into this report.
**Method:** every important claim re-verified against source, tests, workflows, and
live GitHub state. Prior audits were treated as unverified until re-checked; where
this report disagrees with a prior audit, the disagreement is called out explicitly.

**Status:** Phase A complete. Phases B–G follow the execution plan in §7.

## 1. Executive summary

The branch is in genuinely good shape where it matters most: the installer core is
real and heavily tested, all headline counts verify exactly, the registry and
validators pass, and no Critical finding was found in any workstream. The
headline problems are (a) documentation that overstates CI coverage, (b) zero CI
on the current HEAD, (c) a small set of real medium-severity code bugs, and
(d) one High security item (S-08) that is mitigated but can only be closed
upstream or by removing the skill.

**Findings: 60 unique new findings — 4 High, 14 Medium, 42 Low — plus 4
re-investigated prior security items (1 High mitigated, 2 Medium mitigated,
1 Medium unresolved). No Critical findings.**

| Severity | Count | IDs |
|---|---|---|
| High | 4 | A1-01, A1-02, A4-01, A4-02 |
| Medium | 14 | A1-03, A1-04, A1-05, A1-06, A2-01, A2-02, A2-03, A2-04/A5-01, A3-01, A3-02, A4-03, A4-04, A4-05, A5-02 |
| Low | 42 | A1-07–A1-11, A2-05–A2-18, A2-20–A2-22, A3-03, A3-04, A4-06–A4-12, A5-03–A5-11, A5-13, A2-19/A5-12 |
| Prior (re-investigated) | 4 | S-08 High mitigated, S-09 Medium mitigated, S-11 Medium mitigated, S-14 Medium unresolved |

**The single most consequential correction:** the claim "all 6 workflows have run
on GitHub and pass" (README, phase10/NOTES, remediation report §8 item 10) is
**false**. Only 4 workflows ran on PR #1; `scheduled-maintenance.yml` and
`release.yml` have never executed anywhere (A1-01). The b619388 doc fix that
introduced that claim overstated it.

**Release-blocking items (must resolve for PRODUCTION READY):** the 4 High
findings, the zero-CI-on-HEAD gap (A4-01), and a final disposition for S-08.
Branch protection (A4-02) is a known user decision; the workflow comment
overstating it must be fixed regardless.

## 2. Verified facts (re-derived, not trusted)

### 2.1 Counts — all verified exactly

| Claim | Verified | Evidence |
|---|---|---|
| 277 skills (228 original + 49 upstream) | ✅ exact | `npm run validate`: "Checked 277 skills (228 original, 49 upstream)"; disk walk = registry = verification-status, 0 diff either direction |
| 18 categories, 24 agents, 16 workflows | ✅ exact | registry files + disk; `check:registry` PASS |
| Verification split 254 / 17 / 6 / 0 | ✅ exact | `sources/verification-status.json` walk; `npm run query -- status` |
| Eval cases 463 (186 hand-written + 277 generated) | ✅ exact | `evals/cases/*.json` total 186 (172 + 14 discovery-realistic) + `discovery-generated.json` 277 |
| Unit tests 250 (static) / 255 in Windows log | ⚠️ needs live run | static count of top-level `test(` = 250 across 14 files; Windows CI log "tests 255, pass 250, 5 skipped" — the 5 extra are runner-counted subtests (A1-11) |
| Tracked files 1,116 at HEAD | ✅ | `git ls-files` (1,115 at Stage E head; +1 atomic-write.mjs etc.) |
| Node engines `>=24`, CI all Node 24 | ✅ | package.json:25-27; all 11 `node-version` refs `"24"`; matrix `["24"]` |
| 51 Phase 4 skills audited | ✅ | 14/14 sampled fixes present in current files (all 3 High + all 11 Medium covered); matrix split 50 verified / 1 with-limitations / 0 unverified |
| 6 needs-correction skills | ✅ all upstream, untouched | `git diff main...HEAD -- skills/upstream/` empty; errors still present in vendored files (fixes belong upstream) |
| 4 binary assets SHA-256 | ✅ all match | recomputed by hand in this audit; tarball re-listed (49 entries, no symlinks/absolute paths) |

### 2.2 CI state

| Fact | Status | Evidence |
|---|---|---|
| PR #1 checks at 508b044 | ✅ 8/8 pass | `gh pr checks 1`; runs 44933250315 (Validate), 44933250320 (Lint), 44933250321 (Security), 44933250387 (CodeQL), 2026-11-21T18:01:51Z |
| Windows leg, real runner | ✅ 250/255, 0 fail | run 44933250315, job 136934258380; also green on Dependabot runs 44933916452, 44933927107 — all with `continue-on-error: true` in force |
| Workflows that ran on PR #1 | 4 of 6 | Validate skills, Lint, Security audit, CodeQL. `scheduled-maintenance` (schedule/dispatch only) and `release` (tag only) never ran |
| CI on HEAD b619388 | ❌ none | check-runs and workflow-runs for b619388 both `total_count: 0` |
| Semgrep (SAST) job | defined, never run | added in b619388; absent from all check runs; locally clean in Stage D (0 findings, 68 rules) |
| Gating Windows leg | never executed | `continue-on-error` removed in b619388; the gating configuration itself is unproven |
| CodeQL alerts | 5 open (2 error, 3 warning) | all in `skills/upstream/`; created 2026-11-21T17:11:11Z; untriaged (A4-03) |

### 2.3 Repo settings (GitHub API, 2026-11-21)

Secret scanning **enabled**, push protection **enabled**, Dependabot security
updates **enabled**, 0 open secret-scanning alerts, 0 open Dependabot alerts,
default workflow token permissions `read`, CodeQL default setup `not-configured`
(correct — advanced setup only), no repo secrets. **Branch protection: NOT
enabled** (404). Secret-scanning validity checks and non-provider patterns
disabled. `sha_pinning_required: false`, `allowed_actions: all`.

### 2.4 Branch / PR history

- Merge-base(main, HEAD) = `508b044`. `main..HEAD`: 1 commit (`b619388`).
  `HEAD..main`: 2 commits (merge `de6023d` + revert `06100e3`), netting to zero.
- Main HEAD `06100e3` tree is byte-identical to pre-merge `5d36d02` (226 skills).
  The upgrade exists only on the branch.
- PR #1: created 2026-11-21T17:10:02Z, merged 18:08:10Z (`de6023d`), reverted
  18:09:49Z (`06100e3`, ~99 s later). GitHub state: MERGED.
- **Reconciliation implication:** merging again requires reverting the revert
  (`06100e3`) first; a fresh PR from the branch otherwise shows only b619388's
  9-file diff. Dependabot PRs #2/#3 are open, conflicted, based on pre-revert
  main (`de6023d`) — see A4-05.

## 3. High findings

### A1-01 — High — False flagship CI claim in 3 docs
- **Files:** README.md:245-246, ai/phase10/NOTES.md:236-237,
  ai/reports/FINAL-REMEDIATION-REPORT.md:601-604 (§8 item 10).
- **Evidence:** "All 6 workflows plus the Windows leg have run on GitHub and
  pass (PR #1, run 44933250315)". `gh pr checks 1` shows 8 checks from only 4
  workflows; run 44933250315 is the Validate-skills run only; `gh api
  .../actions/workflows` on main lists only Lint, Security audit, Validate
  skills (+Dependabot/Dependency Graph) — scheduled-maintenance and release
  return 404 and have no runs.
- **Impact:** two workflows (weekly maintenance, release validation) are entirely
  unexercised yet claimed passing; a reviewer would merge believing full CI
  coverage.
- **Fix:** correct all three to "4 of 6 workflows ran on PR #1;
  scheduled-maintenance and release have never run". Exercise release.yml via a
  draft PR + tag discipline later; scheduled-maintenance needs a run from the
  default branch after re-merge.
- **Verification:** `gh` checks/runs (done — claim falsified).
- **Status:** open.

### A1-02 — High — CHANGELOG.md [Unreleased] stale on 6 points
- **File:** CHANGELOG.md:37-38 (449 cases), :49 (Node 18/20/22 matrix), :124
  ("No CI workflow has run on GitHub yet"), :126 ("51 Phase 4 skills are
  unverified"), :128 ("Windows --link EPERM path untested"), :130-132 ("Vercel
  is 4 commits behind"). Header "in progress" also stale.
- **Evidence:** current truth is 463 cases, Node 24-only, 4 workflows ran,
  0 unverified, Windows link proven on a real runner, 6 up-to-date per Stage E.
- **Impact:** the living changelog misstates the release's contents and status.
- **Fix:** update [Unreleased] with dated corrections (v1.0.0 section below is
  historical and fine).
- **Verification:** read + disk counts (done).
- **Status:** open.

### A4-01 — High — Zero CI on HEAD b619388; Semgrep job and Windows gating never executed
- **Files:** HEAD b619388; `.github/workflows/security-audit.yml:62-78`,
  `.github/workflows/validate-skills.yml` Windows job.
- **Evidence:** check-runs and workflow-runs for b619388 both `total_count: 0`;
  Semgrep added in b619388 (absent at 508b044); `continue-on-error` removed in
  b619388 (present at 508b044:164). A push to the feature branch triggers zero
  workflows (every push trigger is `branches: [main]`; PR #1 is merged).
- **Impact:** the two headline changes of the audit-fix commit — real SAST in
  CI and a gating Windows leg — are unverified. A broken Semgrep job or a
  Windows failure under gating would only surface on the next PR.
- **Fix:** open a new draft PR (branch → main); confirm a "Semgrep (SAST)"
  check appears and passes and the Windows leg passes without
  `continue-on-error`. Never merge the PR.
- **Verification:** `gh pr checks <new>` shows Semgrep (SAST) pass; `gh run
  list --branch feat/skillforge-production-upgrade` shows runs for b619388.
- **Status:** open, unmitigated.

### A4-02 — High — No branch protection on main; "required check" comment is false
- **Files:** repo settings; `.github/workflows/validate-skills.yml:139`.
- **Evidence:** `gh api .../branches/main/protection` → HTTP 404 "Branch not
  protected". The workflow comment claims "The leg is a required
  branch-protection check (ai/phase10/NOTES.md)", but NOTES.md:196-204 says
  protection is only "recommended".
- **Impact:** all CI is advisory — any push to main bypasses every check.
  "Gating" currently means only "the job fails the run," not "the job blocks
  merging."
- **Fix:** correct the L139 comment now. Enable protection (requiring the 8
  check names in NOTES.md) only after A4-01 — a required-but-never-reported
  check blocks all merges — and only with the owner's go-ahead (it blocks their
  direct pushes; recorded user decision pending).
- **Verification:** `gh api .../branches/main/protection` returns a rule with
  the required checks (owner action); comment fix verified by read.
- **Status:** open; protection is a user decision, comment inaccuracy unaddressed.

## 4. Medium findings

### A1-03 — Medium — README + ARCHITECTURE state stale test count and a self-contradictory eval breakdown
- **Files:** README.md:193 ("unit tests (196 tests)"), :207-208 ("172
  hand-written … plus 277 generated" = 449, contradicting :45 and :194 "463
  cases"); docs/ARCHITECTURE.md:23, :159 ("196 tests").
- **Evidence:** 196 was the Stage C count; verified breakdown from disk is 186
  hand-written + 277 generated = 463; static test count is 250.
- **Impact:** README contradicts itself; test count underreported by 54.
- **Fix:** 250 tests (confirm by live run); 186 hand-written + 277 generated.
- **Verification:** static counts done; exact live count needs test run.
- **Status:** open.

### A1-04 — Medium — SECURITY.md and docs/SECURITY-SCANNING.md state stale repo settings
- **Files:** SECURITY.md:76-78, docs/SECURITY-SCANNING.md:169-173 ("secret
  scanning, Dependabot alerts, and branch protection … still to be enabled …
  No workflow has run on GitHub yet"). Same staleness in
  docs/THREAT-MODEL.md §1 (per security workstream).
- **Evidence:** API-verified: secret scanning, push protection, Dependabot
  security updates all enabled; 4 workflows + CodeQL have run. Only branch
  protection remains disabled (true).
- **Impact:** the security policy contradicts repo reality.
- **Fix:** update all three files to current settings; keep the
  branch-protection note.
- **Verification:** GitHub API (done).
- **Status:** open.

### A1-05 — Medium — Production acceptance checklist frozen at a pre-PR head
- **File:** ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md:4-5 (pins head
  `4f909da`, 2026-11-20). Stale rows: C4 OPEN "No workflow has ever run on
  GitHub"; C5 "advisory Windows leg"; S9 OPEN "CodeQL never run"; Q7 "249
  pass"; I8/I9 PARTIAL on real Windows execution; C7 OPEN (secret scanning +
  Dependabot now enabled); L139 "add `Windows (Node 20)`" (wrong version).
  Its D3 PASS ("Living docs state current counts") is falsified by A1-02/A1-03.
- **Evidence:** see §2.2/§2.3.
- **Impact:** the acceptance record cannot be used to sign off the current HEAD.
- **Fix:** dated addendum (historical record — no silent rewrite) or a fresh
  acceptance run at HEAD (this mission's RELEASE-ACCEPTANCE.md supersedes it).
- **Verification:** needs full battery re-run.
- **Status:** open.

### A1-06 — Medium — ai/phase10/NOTES.md Node-matrix and tool-status contradictions
- **File:** ai/phase10/NOTES.md:14 ("validate job — Node matrix 18/20/22"),
  :124-125 (self-contradictory "matrix 24 on the main validation job only;
  every other job runs Node 24"), :244 ("Last known result: 449/449"),
  :247-250 ("CodeQL, Semgrep … none of them ran here … the others are not in
  CI at all"), :254 ("Node 18/22 matrix legs were not run locally" — moot).
- **Evidence:** matrix is `["24"]` (validate-skills.yml:36); CodeQL ran on
  GitHub; Semgrep is in CI (security-audit.yml:62-78).
- **Impact:** the CI reference doc misdescribes the pipeline.
- **Fix:** rewrite the Node-version and "not verified" sections with a dated
  update.
- **Verification:** workflow files + `gh` (done).
- **Status:** open.

### A2-01 — Medium — Security-score hard cap is dead code (`.length` on a `Set`)
- **File:** `scripts/score-skills.mjs:150,212`.
- **Evidence:** `const secHits = new Set();` … `if (secHits.length > 0)
  overall = Math.min(overall, 40);` Sets have no `.length`, so `undefined > 0`
  is always false and the documented cap ("any security-scan pattern hit ->
  overall capped at 40", header line 18) never fires. The CRITICAL flag at
  line 155 correctly uses `secHits.size`, so the exit code still fails.
- **Impact:** a skill with a security-pattern hit can still score 80+ overall,
  defeating "a high score must not hide a critical failure."
- **Fix:** line 212 → `secHits.size > 0`; add a regression test (scorer is
  untested — see A2-22).
- **Verification:** craft a skill with a `score`-scope pattern hit and assert
  `overall <= 40`.
- **Status:** open, confirmed by code reading.

### A2-02 — Medium — `validate-registry` crashes with an uncaught TypeError instead of a clean FAIL on malformed registry
- **File:** `scripts/validate-registry.mjs:147,158,171-172,179,192,195,213,234,237`.
- **Evidence:** schema errors are collected into `errors[]` but execution
  continues; semantic checks then dereference keys the schema requires (e.g.
  `Object.entries(data.compatibility.compatibility)`, `vs[n]` where `vs` may
  be undefined).
- **Impact:** a malformed registry produces a stack trace and no diagnostic
  report (collected schema errors never printed). Exit code is still 1, so CI
  fails correctly but unactionably.
- **Fix:** guard each semantic block on the required key existing (or skip
  semantic checks for a file that failed schema validation and report the
  schema errors).
- **Verification:** temp repo copy with `compatibility` key deleted from
  `registry/compatibility.json`; expect clean `FAIL:` listing, not TypeError.
- **Status:** open, confirmed by code reading.

### A2-03 — Medium — Install/update planning is not per-item fault-isolated; one bad library item aborts the whole run
- **File:** `scripts/install/commands.mjs:503-505` (runInstall), `:631` (runUpdate).
- **Evidence:** `for (const item of items) { plannedItems.push(await
  computePlanned(...)); }` — no try/catch. `computePlanned` throws on a
  missing skill source dir, an unreadable agent file, or a `"""` in an agent
  body. Contradicts the engine's stated rule: "Partial failure: one bad item
  never aborts the run" (`installer.mjs:20-23`). Per-item isolation exists
  only in the execute phase.
- **Impact:** a single corrupt/missing library item makes install/update fail
  entirely instead of installing the other 276 skills and reporting one
  failure.
- **Fix:** wrap each planning call in try/catch, record the item as failed
  with its error, continue; surface planning failures in the summary.
- **Verification:** fixture library with one deleted skill source dir;
  `install --skills all` installs the rest and exits 1 with the one failure
  listed.
- **Status:** open, confirmed by code reading.

### A2-04 / A5-01 — Medium — Security scanner never scans `.cjs`, `.html`, `.xml`, `.txt`, or extensionless executable files
- **File:** `scripts/security-scan.mjs:48-49` (`TEXT_EXT` allowlist:
  md|mjs|js|ts|sh|py|json|yml|yaml|toml).
- **Evidence:** unscanned tracked files include `skills/upstream/superpowers/
  brainstorming/scripts/server.cjs` (723-line HTTP/WebSocket server),
  7 extensionless executable upstream scripts, 14 `.txt`, 3 `.html`, 1 `.xml`,
  1 `.cjs`, 1 `.dot`. `server.cjs:540` contains a CODE-07-shaped
  `cp.exec(...)` construct and `:13` a CODE-11-shaped `createHash('sha1')`
  (legitimate per RFC 6455) — neither ever scanned. Docs claim "29 patterns
  over every text file" (SECURITY.md:54, docs/SECURITY-SCANNING.md:11) —
  inaccurate. Manual review of the unscanned files found no live vulnerability
  (server.cjs is well-hardened; bash scripts clean; .html uses are local-viewer
  self-XSS at most) — the gap is forward-looking.
- **Impact:** a secret or dangerous command in these files is invisible to
  `npm run check:security`; the "1,079 files scanned" count silently excludes
  them.
- **Fix:** extend `TEXT_EXT` with `cjs`, `html`, `xml`, `txt`, and
  extensionless files with a shebang (or content-sniff text files); triage the
  resulting `server.cjs` hits as documented exceptions; correct the docs claim.
- **Verification:** fixture secret in an extensionless temp file under a test
  root must be flagged; `server.cjs` counted and its lines reported-or-excepted.
- **Status:** open, confirmed by code reading + `git ls-files` inventory.
  (Two workstreams found this independently; merged here.)

### A3-01 — Medium — `link-building` verification note is stale: the 6 "broken links" now resolve
- **Files:** `sources/verification-status.json` (`link-building` note);
  `registry/skills.json` status for `link-building`
  (`verified-with-limitations`).
- **Evidence:** note says "6 broken relative links to
  `../../tools/integrations/{ahrefs,semrush,dataforseo,exa,firecrawl,hunter}…`".
  All 6 targets exist (`skills/upstream/tools/integrations/*.md`); `npm run
  validate` emits no warning for link-building. Root cause: `tools/` was
  imported in Phase 4 (commit `caf1f32`) but the Phase 3 note was never
  updated. The stale note is user-visible via `npm run query -- show
  link-building`.
- **Impact:** agents/users are told a working skill has broken links; the
  17-count of "with limitations" includes one limitation that no longer exists.
- **Fix:** update the note (and regenerate the registry); consider promoting
  the skill to `verified` if no other limitation applies. Do NOT edit the
  upstream skill content.
- **Verification:** `ls skills/upstream/tools/integrations/` + re-run
  `validate` + `query -- show link-building` after the update.
- **Status:** open — new finding (not in the Stage E remaining-risks list).

### A3-02 — Medium — 17 verification-status notes truncated at 160 chars, including all 6 needs-correction notes
- **Files:** `sources/verification-status.json` (17 of 23 notes end in `...`,
  all exactly 160 chars); same truncation copied into
  `ai/audits/TECHNICAL-ACCURACY-AUDIT.md` summary table (~lines 380-397).
- **Evidence:** `npm run query -- show seo` prints "…FAQPage schema is limited
  to government and healthc..." — hiding 5 of the 6 documented seo errors.
  Full text survives only in the audit detail table (lines 109-114).
- **Impact:** the machine-readable record of *what correction is needed* is
  lossy; upstream follow-up based on it would be incomplete.
- **Fix:** restore full note text from the audit detail table; remove the
  160-char truncation in whatever generator produced it; regenerate the
  registry.
- **Verification:** 0 notes ending in `...`; `query -- show seo` prints the
  full note.
- **Status:** open — previously known (Stage E remaining risk); re-confirmed
  with exact count and ids.

### A4-03 — Medium — 5 open CodeQL alerts (2 error severity), untriaged
- **Files:** all in `skills/upstream/`: #1 `js/regex-injection` (error)
  `vercel-optimize/lib/verify-claim.mjs:1211`; #2 `js/reflected-xss` (error)
  `superpowers/brainstorming/scripts/server.cjs:405`; #3-5
  `js/incomplete-sanitization` (warning) in `vercel-optimize/lib/
  {cost-coverage.mjs:142, render-report.mjs:915, workspace-resolver.mjs:162}`.
- **Evidence:** `gh api .../code-scanning/alerts` — all created
  2026-11-21T17:11:11Z, state open, no dismissal; no triage in `ai/` or
  `docs/`.
- **Impact:** error-severity findings open on the default branch with no
  recorded disposition. Mitigated: all in vendored upstream code (never edited
  per policy; fixes belong upstream), and the CodeQL workflow does not fail on
  alerts.
- **Fix:** triage each — dismiss with reason (false positive / won't-fix
  upstream) or file upstream issues — and record the disposition in
  `ai/audits/SECURITY-STATUS.md`.
- **Verification:** `gh api .../code-scanning/alerts` shows dismissed/fixed
  states with reasons.
- **Status:** open.

### A4-04 — Medium — Revert stripped 3 workflows from main; scheduled jobs cannot fire; `release.yml` never ran
- **Files:** `main` HEAD `06100e3`; `.github/workflows/{codeql,release,
  scheduled-maintenance}.yml` (feature-branch-only).
- **Evidence:** `git ls-tree main .github/workflows/` lists only 3 files;
  `gh run list --workflow release.yml` and `--workflow
  scheduled-maintenance.yml` both HTTP 404 on the default branch; main's
  `validate-skills.yml` has a single `validate` job.
- **Impact:** no CodeQL on main pushes; Thu 06:30 CodeQL schedule and Mon
  07:00 maintenance jobs (online link check, stale verification, upstream
  monitoring) will not fire; release validation never executed anywhere.
- **Fix:** re-merge the feature branch (revert-of-revert + new PR); until
  then, accept the coverage gap or run the scheduled checks manually.
- **Verification:** after re-merge, `gh run list --workflow codeql.yml
  --branch main` shows runs; first scheduled maintenance run appears after
  Mon 07:00 UTC.
- **Status:** open; resolves on re-merge.

### A4-05 — Medium — Dependabot PRs #2/#3 are conflicted and based on merged main
- **Files:** PR #2 (setup-node → 7.1.0), PR #3 (checkout → 7.0.1).
- **Evidence:** both OPEN, `mergeable: false`, `base_sha: de6023d` (created
  before the revert). Their diffs touch merged-era workflow files including
  `release.yml`/`scheduled-maintenance.yml` — absent from current main. Main's
  `package.json` lacks `check:agents`, `check:registry`, `check:upstream`,
  `evals`, `query`, `score`, which the merged-era workflows invoke.
- **Impact:** resolving conflicts by taking the Dependabot side would
  reintroduce the 6-workflow set onto reverted main, where workflows would
  fail on missing npm scripts.
- **Fix:** close and let Dependabot re-raise after the branch re-merges (or
  rebase onto current main, taking main's side except the pin line).
- **Verification:** `gh pr view` shows `mergeable: true` with a diff limited
  to pin lines.
- **Status:** open.

### A5-02 — Medium — Uninstall deletes non-link content for link-method manifest entries without backup
- **File:** `scripts/install/commands.mjs:1169-1172` + `:1283`.
- **Evidence:** link entries are classified `action: 'remove'` with
  `needsBackup: !inLibrary(...)` and **no `isSymbolicLink()` check** on what
  is actually at `destAbs`; removal is `rm(p.destAbs,
  rmRecursiveOptions())`. If the destination is a real directory (user
  replaced a linked skill with their own content, or a crafted git-traveled
  manifest claims `method: 'link'` for a path holding user content),
  uninstall deletes it with no backup when the item is in the library. Doctor
  *does* flag this shape as fail (`commands.mjs:800-804`) — uninstall ignores
  its own diagnostic.
- **Impact:** silent data loss, violating "never silently delete user
  modifications". Requires victim to run uninstall; crafted manifest is the
  adversarial path, user reorganization the accidental one.
- **Fix:** in `runUninstall`, for link entries verify
  `lstat(destAbs).isSymbolicLink()`; if not a link, classify as
  `modified`/`foreign` with `needsBackup: true`.
- **Verification:** test with a real directory at a link-entry path —
  uninstall must refuse or back up first, never silently `rm -rf`.
- **Status:** open.

## 5. Low findings

### A1-07 — Low — FINAL-IMPLEMENTATION-REPORT.md addendum never got the post-PR update
- **File:** ai/reports/FINAL-IMPLEMENTATION-REPORT.md:856-860 ("What is still
  open": "No workflow has run on GitHub (L-CI); no real Windows execution …
  CodeQL never run anywhere" — all closed 2026-11-21), :823-827 (§20 item 2:
  required check `Validate (Node 18/20/22)`, "Do NOT require `Windows (Node
  20)`" — both stale names).
- **Impact:** the addendum, meant to be the correction layer, itself needs
  correction. **Fix:** dated post-PR note (no silent rewrite).
- **Verification:** read + `gh` (done). **Status:** open.

### A1-08 — Low — FINAL-REMEDIATION-REPORT.md contradicts itself
- **File:** ai/reports/FINAL-REMEDIATION-REPORT.md §11 "Remaining risks" still
  lists L-CI "No CI workflow has ever run" (:707), L-Win "No real Windows
  execution" (:708), CodeQL "never run anywhere" (:714), L-Settings "still to
  be enabled" (:722), while §8 item 10 (:601-604) closes them.
- **Impact:** a reader of §11 alone gets the pre-PR picture. **Fix:** annotate
  the four §11 rows as closed/superseded by §8 item 10.
- **Verification:** read (done). **Status:** open.

### A1-09 — Low — Semgrep-in-CI claim overstates execution
- **Files:** README.md:238-240 ("real SAST runs in CI via the Semgrep job");
  ai/phase10/NOTES.md:198-199 (lists `Semgrep (SAST)` as a required
  branch-protection check). Job added in b619388, after PR #1 merged; never
  run on GitHub; locally clean in Stage D.
- **Impact:** a required check name that has never produced a check run.
- **Fix:** qualify as "added in b619388, awaiting its first run" until a new
  PR exercises it. **Verification:** `gh pr checks 1` / run list (done).
- **Status:** open.

### A1-10 — Low — Stale "local only / do not push" rules
- **Files:** ai/PROJECT-STATUS.md:5 ("Rule: local commits only … Do NOT push,
  merge, or open a PR"); ai/audits/SECURITY-STATUS.md:4 and
  ai/audits/SKILL-AUDIT-MATRIX.md:4 ("(local only; nothing pushed)") —
  superseded (pushed, PR #1 opened, merged, reverted).
- **Impact:** the PROJECT-STATUS rule reads as a live instruction.
- **Fix:** annotate as superseded 2026-11-21. **Verification:** git log + `gh`
  (done). **Status:** open.

### A1-11 — Low — Test-count ambiguity 250 vs 255
- **Evidence:** static count of top-level `test(` = 250 (14 files); Windows CI
  log reports "tests 255, pass 250, 5 skipped" (runner-counted subtests).
  Docs variously say 196 / 249 / 250.
- **Impact:** no single canonical count is documented.
- **Fix:** one `npm test` run on POSIX to confirm the live total, then state a
  single canonical count (and note the Windows 255-with-skips figure).
- **Verification:** needs test run. **Status:** open.

### A2-05 — Low — `restore --list` crashes with TypeError when a backup.json parses but lacks an `items` array
- **Files:** scripts/install/backups.mjs:163-166, scripts/install/commands.mjs:1366.
- **Evidence:** `listBackups` pushes any JSON-parsing record unvalidated; the
  human `--list` path does `b.items.map(...)` — `{}` throws. (`--json`
  survives; `readBackup` validates, so `restore <id>` is safe.)
- **Impact:** one malformed backup directory breaks `restore --list` for all.
- **Fix:** in `listBackups`, treat a parsed record without an array `items`
  as corrupt (same shape as the catch branch).
- **Verification:** temp backups dir with `backup.json` = `{}`; expect a
  corrupt report, not a crash. **Status:** open.

### A2-06 — Low — Generated discovery cases embed a wall-clock date in committed output
- **File:** evals/datasets/generate-discovery-cases.mjs:42 (`generated: new
  Date().toISOString().slice(0, 10)`).
- **Impact:** spurious diffs on regeneration; contradicts the repo's
  determinism rule. **Fix:** derive the date deterministically (e.g. registry
  `generated`) or drop the field.
- **Verification:** run the generator twice; diff must be empty.
- **Status:** open.

### A2-07 — Low — Registry/eval sorting uses locale-dependent `localeCompare`
- **Files:** scripts/generate-registry.mjs:94,174,237,245; evals/runners/mock-agent.mjs:150; evals/runners/run-evals.mjs:322.
- **Evidence:** collation order depends on the runtime's ICU default locale;
  code-point comparison would be locale-independent. Skill names are
  `[a-z0-9-]` so the risk is latent.
- **Impact:** a locale difference between machines could produce a registry
  diff or different eval tie-breaking.
- **Fix:** replace with code-point comparison for generated-output and
  eval-ranking sorts. **Verification:** regenerate with `LANG`/`LC_ALL`
  varied; output byte-identical. **Status:** open.

### A2-08 — Low — `check-frontmatter` and `validate-skills` disagree on upstream name-mismatch severity
- **Files:** scripts/check-frontmatter.mjs:35 (error, no upstream distinction)
  vs scripts/validate-skills.mjs:115-116 (warning for upstream, by policy).
- **Impact:** latent — an upstream name mismatch would fail `check:frontmatter`
  (CI lint leg) while passing `validate`. No current mismatch exists.
- **Fix:** align check-frontmatter with the validate-skills policy (upstream →
  warning) or document the stricter rule.
- **Verification:** fixture upstream skill with mismatched name; both scripts
  agree. **Status:** open.

### A2-09 — Low — `restore --category` is silently ignored
- **File:** scripts/install/commands.mjs:~1330-1345 (runRestore selector filter
  matches only skill/agent/workflow names; categories never consulted, yet
  `hasSelectors` includes categories).
- **Impact:** `restore <id> --category seo` yields "No items … match" even
  when the backup holds seo skills. Minor UX trap; no data risk.
- **Fix:** resolve categories to skill names in the restore filter, or reject
  `--category` for restore with a UsageError.
- **Verification:** `restore <id> --category <cat>` on a matching backup.
- **Status:** open.

### A2-10 — Low — `check-upstream` has no fetch timeout and no retry
- **File:** scripts/check-upstream.mjs:56-66 (`api()` — bare `fetch`, unlike
  check-links.mjs's 15s timeout + retry and providers.mjs's 60s timeout +
  retries).
- **Impact:** a hung GitHub API call hangs the script (and the scheduled
  workflow) indefinitely; a transient 429 marks a vendor UNKNOWN.
- **Fix:** `AbortSignal.timeout(15000)` + one retry on 429/5xx.
- **Verification:** stub endpoint delaying > timeout / returning 429 then 200.
- **Status:** open.

### A2-11 — Low — No CI check that `report.json` / `AUDIT-REPORT.md` are in sync
- **Files:** .github/workflows/validate-skills.yml:96, release.yml:68
  (registry-only diff checks; no workflow references `generate-report`).
- **Impact:** the committed audit report can go stale silently after registry
  changes. **Fix:** add `npm run report` + `git diff --exit-code report.json
  AUDIT-REPORT.md` to the registry-drift job.
- **Verification:** change a skill count; CI job fails until the report is
  regenerated. **Status:** open.

### A2-12 — Low — Eval report and baseline writes are non-atomic
- **File:** evals/runners/run-evals.mjs:~400-430 (plain `writeFile` for
  reports/baselines/regression files, while registry/manifest use
  `atomicWriteFile` after A-37).
- **Impact:** a concurrent or interrupted eval run can leave truncated
  `evals/reports/latest.json` or `evals/baselines/current.json`; a subsequent
  baseline comparison would crash on JSON.parse.
- **Fix:** use `atomicWriteFile` for report/baseline/regression writes.
- **Verification:** concurrent reader loop during a run never sees a JSON
  parse error (A-37 test pattern). **Status:** open.

### A2-13 — Low — Model provider: no `Retry-After` honoring, strictly sequential execution
- **Files:** evals/runners/providers.mjs:222-280 (429 retries use fixed
  exponential backoff without reading `Retry-After`); evals/runners/run-evals.mjs:~360-390 (serial case execution).
- **Impact:** a 429 with a long `Retry-After` burns retries; a full 463-case
  model run takes 8-25 min serially (the 75-case subset is fine).
- **Fix:** honor `Retry-After` when present; optionally add a `--concurrency`
  flag for model runs. **Verification:** stub 429 with `Retry-After: 5` then
  200; provider waits ~5s. **Status:** open.

### A2-14 — Low — `validate-skills --filter` uses platform separators, so a POSIX filter never matches on Windows
- **File:** scripts/validate-skills.mjs:76-77 (`path.relative` has backslashes
  on Windows; documented filter form is POSIX). Same W-2/W-3 class fixed in
  `score-skills.mjs` but not here.
- **Impact:** `--filter` silently checks zero skills on Windows.
- **Fix:** normalize `rel` with `toPosixPath` before the prefix match.
- **Verification:** `--filter skills/backend/nestjs` checks exactly that
  subtree on Windows (or with a mocked separator). **Status:** open.

### A2-15 — Low — Scanner excludes two whole test files from scanning
- **File:** scripts/security-scan.mjs:52-56 (`SKIP_FILES`:
  `test/security.test.mjs`, `test/scanner.test.mjs` — skipped because fixtures
  contain pattern strings).
- **Impact:** two blind spots; a real secret planted anywhere in those files
  (188 + 194 lines) would never be flagged.
- **Fix:** replace the file-level skip with line-level
  `security-scan:ignore` comments on the fixture lines (mechanism exists).
- **Verification:** add a fake token to a non-fixture line of
  `test/security.test.mjs`; scanner must flag it. **Status:** open.

### A2-16 — Low — Multi-line curl-pipe detection ignores line-level `security-scan:ignore`
- **File:** scripts/security-scan.mjs:228-232 (multi-line check consults only
  `isExcepted(rel, 'CMD-01')`; the per-line `ignoredPatterns()` mechanism is
  not applied, unlike the single-line loop).
- **Impact:** a documented multi-line curl-pipe example can only be silenced
  via the EXCEPTIONS table, not a local ignore comment.
- **Fix:** check the ignore comment on the lines spanned by the multi-line match.
- **Verification:** fixture multi-line curl-pipe + `// security-scan:ignore
  CMD-01` on the first line; expect no finding. **Status:** open.

### A2-17 — Low — `loadLibrary` does no shape validation; a corrupt registry breaks even read-only commands
- **Files:** scripts/install/library.mjs:28-44; scripts/install-skills.mjs
  (main loads library before dispatch).
- **Evidence:** `JSON.parse(...)` with no shape check; `reg.skills || []`
  means a registry parsing to a non-object yields a silently empty library
  ("Nothing to install"). `list`/`doctor`/`validate` all fail when the
  registry is corrupt even though they don't need the library.
- **Impact:** misleading empty-library behavior; diagnostics unavailable
  exactly when the repo is broken.
- **Fix:** validate the parsed registry is an object with a `skills` array
  (clear `LibraryError` otherwise); consider lazy-loading for commands that
  don't need it. **Verification:** corrupt registry to `[]`; clear error, not
  "Nothing to install." **Status:** open.

### A2-18 — Low — Duplicated functionality across check scripts (drift risk)
- **Files:** `findSkillFiles` duplicated in 6 scripts (generate-registry,
  validate-skills, validate-registry, check-duplicates, check-frontmatter,
  score-skills); `REQUIRED_SECTIONS` duplicated in validate-skills.mjs:17-23
  and score-skills.mjs:29-35; placeholder regexes and headings/sections logic
  duplicated. Copies already differ (some normalize with `toPosixPath`, some
  don't — the source of A2-14 and the earlier W-3 bug).
- **Impact:** the next fix in one copy will likely miss the others (already
  happened once: W-3).
- **Fix:** extract `findSkillFiles`, `REQUIRED_SECTIONS`, placeholder regexes
  into `scripts/lib/` and import them.
- **Verification:** single implementation used by all six; existing tests
  pass unchanged. **Status:** open.

### A2-19 / A5-12 — Low — Known residual: tier-2 manifest validation allows agent/workflow roots to climb arbitrarily deep
- **File:** scripts/install/manifest.mjs (`validateRootShape`).
- **Evidence:** a root like `../../../../agents` (or
  `../../../other-project/.claude/agents`) passes tier-2 when tier-1 exact
  matching doesn't apply (custom `--dest`, unknown target). Skill entries
  cannot escape at all (root must be `.`); impact bounded to files named
  `<name>.md`/`.toml` in a dir named `agents`/`workflows`/`global_workflows`.
- **Impact:** a crafted git-traveled manifest could steer update/uninstall/
  restore at another tool's agent file.
- **Fix:** cap the `..` climb depth, or require tier-1-style exact matching
  whenever target/scope are known (already the case for standard installs).
- **Verification:** manifest with a deep-climb root; new bound rejects it.
- **Status:** open known limitation (documented in code and Stage B records);
  re-confirmed this round. (Two workstreams found this independently; merged.)

### A2-20 — Low — `query related` crashes on a stale related-skill reference
- **File:** scripts/query-skills.mjs:~205 (`cmdRelated` — `byName.get(r)` not
  null-checked; `other.category` throws on a removed skill).
- **Impact:** minor crash instead of a clear error when the registry is
  inconsistent (validate-registry normally guards this).
- **Fix:** skip/flag unknown related names with a clear message.
- **Verification:** registry with a stale `related` entry; no TypeError.
- **Status:** open.

### A2-21 — Low — `check-sources` silently ignores an invalid `last_verified` date
- **File:** scripts/check-sources.mjs:30-33 (invalid date → `NaN`; `NaN > 180`
  is false, so no warning; a missing date does warn).
- **Impact:** a malformed date passes silently (second-line gap only —
  validate-skills catches the format for original skills).
- **Fix:** warn when `Number.isNaN(age)`. **Verification:** registry entry
  with `last_verified: "not-a-date"`; expect a warning. **Status:** open.

### A2-22 — Low — Untested areas (test-coverage gaps)
- **Evidence:** `test/validators.test.mjs:25-27` explicitly excludes
  score-skills and generate-report ("not among the 14 acceptance areas; CI
  runs both") and check-upstream (network-dependent). `parsePins` is not
  exported and the script runs on import, so it is untestable as written.
  `atomic-write.mjs` retry/backoff covered only indirectly via the A-37 test;
  `install-skills.mjs` `parseArgs` has CLI-level tests only;
  `evals/datasets/generate-discovery-cases.mjs` has no test.
- **Impact:** A2-01 survived precisely because the scorer is untested; the
  same class of silent regression is possible in the other untested scripts.
- **Fix:** unit tests for the scorer's caps/dimensions (highest value), export
  `parsePins` for testing, direct retry test for `atomicWriteFile` with a
  fault-injected rename.
- **Verification:** new tests fail against the current code for A2-01 and
  pass after the fix. **Status:** open.

### A3-03 — Low — Accessibility standard element 14 non-conformance is library-wide
- **Evidence:** 214 of 228 original skills lack an Accessibility subsection;
  even where SKILL-STANDARDS.md element 14 says it applies "where applicable":
  frontend 5/21, media 4/16, content 2/19, metadata 0/6. Only desktop is
  complete (3/3). Total with subsection: 14/228.
- **Impact:** inconsistent quality against the library's own 22-element
  standard; no accuracy or safety impact.
- **Fix:** library-wide element-14 pass as follow-up work (as the matrix
  recommends), or narrow the standard's wording to match the actual
  convention. Not a blocker.
- **Verification:** re-run the Accessibility-subsection scan.
- **Status:** open — previously known (SKILL-AUDIT-MATRIX.md follow-ups).

### A3-04 — Low — Railway Config-as-Code hard cutoff 2026-12-01 is 10 days out, with no re-verification scheduled
- **File:** skills/infrastructure/railway/SKILL.md:72-74 (correctly states the
  cutoff and `railway config migrate`).
- **Impact:** time-bounded staleness risk after 2026-12-01; no current error.
- **Fix:** schedule re-verification shortly after 2026-12-01 (and of the
  other fast-moving version pins the matrix lists).
- **Verification:** re-check against Railway's official docs after 2026-12-01.
- **Status:** open — previously known (Stage E remaining risks).

### A4-06 — Low — Semgrep job has no supply-chain integrity: unhashed pip install + runtime ruleset fetch, no timeout
- **File:** .github/workflows/security-audit.yml:74-78 (`pip install
  semgrep==1.186.0` — version pin only, transitive deps unpinned, no
  `--require-hashes`; `--config p/javascript` resolves the ruleset from the
  Semgrep Registry at runtime; no `timeout-minutes`).
- **Impact:** a compromised/withdrawn PyPI release or registry outage breaks
  or subverts the SAST gate; inconsistent with the repo's SHA-pinned posture.
- **Fix:** pin with `--require-hashes` (or a locked requirements file), or a
  SHA-pinned Semgrep action; vendor or pin the ruleset version; add
  `timeout-minutes`.
- **Verification:** job passes with hash enforcement; ruleset version in the
  log. **Status:** open.

### A4-07 — Low — Action pins two majors behind current (v5 vs v7 available)
- **Evidence:** Dependabot PRs #2/#3 offer checkout 7.0.1 and setup-node
  7.1.0. Pins verified current within v5 — staleness, not a wrong pin.
- **Impact:** low — pinned SHAs are safe; missing newer action features/fixes.
- **Fix:** accept the Dependabot bumps after re-merge (verify the v7 actions
  on the runners first — their Node requirements changed across majors).
- **Verification:** pins match Dependabot's offered SHAs; CI green.
- **Status:** open; Dependabot PRs already raised.

### A4-08 — Low — No `timeout-minutes` on 11 of 12 jobs
- **Evidence:** `grep timeout-minutes .github/workflows/` returns only the
  Windows job (20 min).
- **Impact:** a hung step (e.g. the 600+ URL online link check) could run to
  GitHub's 360-minute default.
- **Fix:** per-job timeouts (e.g. 10 min lint/security, 20 min
  validate/windows, 30 min online-links).
- **Verification:** `timeout-minutes` present in every job. **Status:** open.

### A4-09 — Low — SHA pinning is by convention, not enforced
- **Evidence:** repo Actions settings: `allowed_actions: all`,
  `sha_pinning_required: false`.
- **Impact:** a future workflow edit could introduce tag-pinned actions
  without any control flagging it.
- **Fix:** set `sha_pinning_required: true` (Dependabot updates SHAs, so it
  is compatible). Owner action (repo setting).
- **Verification:** `gh api .../actions/permissions` shows
  `sha_pinning_required: true`. **Status:** open.

### A4-10 — Low — Secret-scanning hardening options disabled
- **Evidence:** `secret_scanning_validity_checks: disabled`,
  `secret_scanning_non_provider_patterns: disabled` (scanning + push
  protection enabled).
- **Impact:** missed non-provider-pattern secrets; no validity triage.
- **Fix:** enable both (repo Settings → Code security). Owner action.
- **Verification:** `gh api repos/...` shows both `enabled`. **Status:** open.

### A4-11 — Low — No CODEOWNERS; workflow files have no designated reviewer
- **Evidence:** `.github/` contains only ISSUE_TEMPLATE/,
  PULL_REQUEST_TEMPLATE.md, dependabot.yml, workflows/.
- **Impact:** with A4-02, workflow and upstream-skill changes get no
  automatic review routing. Low in practice (solo-owner repo).
- **Fix:** add CODEOWNERS covering `.github/workflows/` and
  `skills/upstream/`.
- **Verification:** file exists; review-request behavior confirmed on a test
  PR. **Status:** open.

### A4-12 — Low — Stale "Set up Node.js 20" step labels on main
- **Evidence:** branch fixed all 9 labels in b619388, but the revert restored
  the stale labels on main. `node-version` values were already `"24"` —
  labels only, cosmetic.
- **Impact:** confusing run logs on main; no functional effect.
- **Fix:** resolves on re-merge of the branch.
- **Verification:** `git show main:.github/workflows/lint.yml | grep "Node.js
  20"` returns nothing after re-merge. **Status:** open; resolves on re-merge.

### A5-03 — Low — Recovered-backup restore uses unvalidated `fileName` as `destName`
- **Files:** scripts/install/backups.mjs (`recoverBackupRecord` — fileName
  from `readdir`, only single-segment-validated); scripts/install/commands.mjs
  recovered-restore path (`item.destName = item.fileName`).
- **Evidence:** the normal path (`validateBackupRecord`) enforces
  destName-must-match-name, but the recovery path (backup.json missing/corrupt)
  skips it. A crafted backup dir `items/0-agent-foo/bar.md` restores to
  `agents/bar.md`, overwriting a different agent's file.
- **Impact:** bounded — single segment, agents/workflows dirs only, and
  restore backs up replaced content first (reversible).
- **Fix:** in `recoverBackupRecord`, require `fileName` to equal
  `` `${name}.md` `` or `` `${name}.toml` `` for agents/workflows; skip
  non-matching items. **Verification:** crafted backup dir with a mismatched
  fileName is rejected/skipped. **Status:** open.

### A5-04 — Low — Registry trusted blindly; tampered `registry/skills.json` enables path traversal
- **Files:** scripts/install/library.mjs:loadLibrary (`source: s.path`, `name:
  s.name` used unvalidated); scripts/install/installer.mjs:computePlanned
  (`path.join(library.root, item.source)`); evals/runners/mock-agent.mjs:loadSkill.
- **Evidence:** no validation that a registry `path` stays under the library
  root or that a `name` is a single segment. A tampered registry could make
  the installer copy/hash arbitrary directories or the mock agent read
  arbitrary files into eval reports.
- **Impact:** requires repo write access (registry is generated and
  repo-controlled) — defense-in-depth only.
- **Fix:** in `loadLibrary`/`loadKind`, reject names containing separators
  and resolve `source` against root, rejecting escapes.
- **Verification:** unit test with a crafted registry containing `../` paths
  — expect a load error. **Status:** open.

### A5-05 — Low — Eval fixture name not validated before dynamic `import()` (code execution)
- **File:** evals/scorers/code.mjs:runFixture — `path.join(FIXTURES_DIR,
  fixtureName + '.mjs')` then `await import(...)`, with `fixtureName` from
  eval-case JSON or a user-supplied `--cases-file`.
- **Evidence:** no validation; `../../scripts/x` would import and execute an
  arbitrary `.mjs` file. Fixture execution is by design; the traversal is not.
- **Impact:** requires a malicious eval-case file or an untrusted
  `--cases-file` — low.
- **Fix:** validate `fixtureName` against `/^[A-Za-z0-9_-]+$/` before joining.
- **Verification:** a case with `fixture: "../../../x"` is rejected, not
  imported. **Status:** open.

### A5-06 — Low — Online link/source checkers follow redirects with no SSRF guard
- **Files:** scripts/check-links.mjs:fetchWithRetry (`redirect: 'follow'`,
  URLs from repo Markdown, ~600 fetched from CI weekly);
  scripts/check-sources.mjs:40 (same, registry URLs).
- **Evidence:** no scheme/host validation, no private-IP block. A link
  redirecting to `169.254.169.254` or loopback would be fetched from the CI
  runner or dev machine.
- **Impact:** probing only — only HTTP status is recorded, bodies cancelled,
  no credentials sent — so no exfiltration; internal-service probing from CI
  is still undesirable.
- **Fix:** handle redirects manually with a private/loopback/reserved-IP
  blocklist, or use `redirect: 'manual'` and report redirect targets.
- **Verification:** local stub server redirecting to `127.0.0.1` is
  refused/blocked, not fetched. **Status:** open.

### A5-07 — Low — `security-scan:ignore` line comments can silence any pattern with no gate
- **File:** scripts/security-scan.mjs:ignoredPatterns (a bare marker ignores
  *all* patterns on the line; specific IDs also allowed).
- **Evidence:** no test or CI check enumerates or allowlists uses. Currently
  exactly 1 legitimate use (scripts/install/commands.mjs:92, CMD-01,
  documented). A malicious PR could add ignores to hide a real finding and CI
  would stay green.
- **Impact:** scanner bypass via a one-line comment; requires a merged PR.
- **Fix:** add a CI check failing on `security-scan:ignore` uses outside an
  allowlisted set, or reject bare (unscoped) markers.
- **Verification:** add an ignore in a fixture and confirm CI flags it.
- **Status:** open.

### A5-08 — Low — Eval model provider accepts plaintext `http://` endpoints and sends the Bearer key over them
- **File:** evals/runners/providers.mjs:parseModelConfig — accepts both
  `http:` and `https:`; key sent as `Authorization: Bearer` via default
  `fetch` (redirects followed). Redaction is otherwise good (key never
  logged, host-only metadata, no key in reports).
- **Impact:** a typo'd or non-TLS `EVAL_PROVIDER_URL` exposes the key in
  cleartext. Local-LLM users on `http://localhost` are unaffected in practice.
- **Fix:** warn loudly (or require an explicit opt-in flag) for non-localhost
  `http:` URLs; consider `redirect: 'error'` for the provider fetch.
- **Verification:** configure an `http://` URL and confirm a warning/refusal.
- **Status:** open.

### A5-09 — Low — Binary asset hashes recorded only in prose, never machine-checked
- **Evidence:** hashes exist only in
  ai/remediation/stage-d/supply-chain-audit.md:130-135; no script or CI job
  verifies them (all 4 verified by hand in this audit). The recommended
  `docs/UPDATE-PROCESS.md` re-import checklist addition was never made.
- **Impact:** a tampered binary would not be caught by any check.
- **Fix:** record hashes in a machine-readable file (e.g. `sources/`) and
  verify them in `check:sources` or the security scan; add the re-import
  checklist line.
- **Verification:** flip a byte in a copy of a binary and confirm the check
  fails. **Status:** open.

### A5-10 — Low — `atomicWriteFile` temp file created without `O_EXCL`
- **File:** scripts/lib/atomic-write.mjs — temp name
  `${file}.tmp-${pid}-${rand}` (6 base36 chars) written with plain
  `writeFile`, which follows a pre-planted symlink. (The rename itself
  correctly replaces a symlinked target rather than following it.)
- **Impact:** guessing the name is practically infeasible, but `flag: 'wx'`
  would close it entirely at zero cost.
- **Fix:** `writeFile(tmp, content, { flag: 'wx' })`.
- **Verification:** pre-create a symlink at a known tmp path in a test
  harness; confirm failure rather than follow. **Status:** open.

### A5-11 — Low — Junction removal on real Windows not demonstrably exercised
- **Files:** scripts/install/links.mjs header; ai/remediation/stage-d/windows-link-analysis.md:91-95 (flags `fs.rm` on a junction as the
  catastrophic-failure-mode assumption); tests fault-injected only
  (test/installer.test.mjs:1872-1990).
- **Evidence:** the Windows CI leg runs the full suite including the `--link`
  uninstall test, but nothing establishes whether that test created a real
  junction on the runner (GitHub Windows runners may permit symlinks via
  Developer Mode, so the fallback may never trigger in CI). Junction
  *creation* is proven; junction *removal* specifically is not demonstrably
  proven. (Node's `fs.rm` is documented not to follow reparse points.)
- **Impact:** theoretical, but this is the one assumption the prior audit
  flagged as catastrophic if wrong.
- **Fix:** add a Windows CI step/test that forces junction creation and
  uninstalls it, asserting the library source survives.
- **Verification:** CI log shows `(junction)` plus the link-removal test
  passing on `windows-latest`. **Status:** open (verification gap).

### A5-13 — Low — CMD-01 pattern misses `wget`-pipe and curl-via-substitution forms
- **File:** scripts/lib/security-patterns.mjs (CMD-01 regex covers `curl … |
  sh|bash` only, plus the multi-line variant).
- **Evidence:** `wget … | bash`, `sh -c "$(curl …)"`, and `bash <(curl …)`
  match no pattern. Grep confirms zero occurrences in the repo today —
  forward-looking gap.
- **Fix:** add `wget` to CMD-01 (and the multi-line regex) and a pattern for
  `sh -c "$(curl` / process substitution.
- **Verification:** fixture lines flagged by the scanner. **Status:** open.

## 6. Prior security findings re-investigated (S-08 / S-09 / S-11 / S-14)

All four were re-derived from current code and live GitHub state; prior-audit
statuses were not assumed.

### S-08 (High) — Agentic SEO curl-pipe install — Mitigated, still open (upstream)
- **Still present, confirmed.** `skills/upstream/agentic-seo/seo/README.md:109-110`:
  `curl -fsSL https://raw.githubusercontent.com/Bhanunamikaze/Agentic-SEO-Skill/main/install.sh
  | bash -s -- --target codex`. Same in `install.sh:57-58` (usage text). Remote
  mode also does an unpinned `git clone --depth 1` (`install.sh:222`). The curl
  URL points at the **author's live repo**, not the dormant fork — the unsafe
  install pulls from the moving `main`.
- **Mitigations verified real:** `docs/AGENTIC-SEO-SAFE-INSTALL.md:80-84` gives a
  pinned-commit download + SHA-256 verification path; install/update warnings
  (`scripts/install/commands.mjs:91-93`, fired at `:415`); doctor warnings
  (`:796-799`); scanner CMD-01 exceptions per-file (README + install.sh only).
  Pin byte-identity independently verified (local `git hash-object` matches
  GitHub blob SHAs at pin `67775741…`).
- **Remaining:** upstream text unchanged; author follow-up still owed. No further
  local mitigation is available short of dropping the skill or patching upstream
  (verbatim policy forbids local edits).
- **Status:** Mitigated, still open (upstream). This is the one High item that
  cannot be fully closed locally; see §7 for the verdict implication.

### S-09 (Medium) — `broken_links.py` disables TLS verification — Mitigated, still open (upstream)
- **Still present, confirmed.** `skills/upstream/agentic-seo/seo/scripts/broken_links.py:71`
  and `:76`: `verify=False` on both HEAD and GET per-link checks. The "oversight"
  reading is confirmed: the same script's initial fetch at `:131` keeps
  verification on, and sibling `fetch_page.py` has no `verify=` at all.
- **Mitigations verified:** safe-install doc documents impact + workarounds
  (`docs/AGENTIC-SEO-SAFE-INSTALL.md:114,147`); same install/doctor warnings as
  S-08; scanner CODE-14 exception per-file for this one script.
- **Remaining:** vendored script unchanged; upstream fix or re-import from a
  fixed commit required; follow-up owed.
- **Status:** Mitigated, still open (upstream).

### S-11 (Medium) — `rejectUnauthorized: false` exception — Mitigated (local handling hardened; upstream open)
- **Occurrences (complete, via `git grep`):** upstream only —
  `skills/upstream/prisma/prisma-upgrade-v7/SKILL.md:244` and
  `references/driver-adapters.md:203` (both per-file CODE-14 exceptions with
  reasons). All other hits are audit-doc quotes (each per-file excepted), test
  fixtures (in SKIP_FILES by design), and the pattern definition itself.
  **No `rejectUnauthorized` / `NODE_TLS_REJECT_UNAUTHORIZED` / custom undici
  agent exists in any first-party code.** `evals/runners/providers.mjs` uses
  global `fetch` with default TLS validation.
- **Suppression narrowness verified:** `matchesPrefix`
  (`scripts/security-scan.mjs:169-171`) requires exact file match for non-`/`
  prefixes; every exception is per-file + per-pattern with a reason; multi-line
  curl detection respects exceptions (`:243`). 10 scanner integration tests exist.
- **Caveat:** the line-level `security-scan:ignore` mechanism can suppress any
  pattern on any line with no gate — see A5-07.
- **Status:** Mitigated (local handling hardened; upstream Prisma guidance
  unchanged — safe CA path is present in the same doc, but the insecure
  workaround is still presented).

### S-14 (Medium) — Agentic-seo import tracks a dormant fork — Still unresolved (MONITOR; documentation only)
- **Live-verified via GitHub API:** `pwg-projects/agentic-seo-skill` is
  `fork: true`, last push 2026-03-03; `Bhanunamikaze/Agentic-SEO-Skill` last
  push 2026-10-14, 1077 stars; compare pin `67775741…`→HEAD: `ahead_by: 50,
  behind_by: 0`. Exactly as the prior audit stated.
- **No concrete monitoring mechanism exists.** `sources/imported-skills.md:105-106`
  still pins the fork; `scripts/check-upstream.mjs` parses pins only from that
  file and the weekly scheduled-maintenance job runs it — so the drift check
  still reports agentic-seo UP-TO-DATE while live upstream is 50 commits ahead.
  The author's repo is named only in prose docs; nothing in code watches it.
- **Remaining:** a re-point decision at next re-import (or an added second pin
  entry / compare check for the author's repo). This mission's Phase C will
  implement the compare check (concrete mitigation, no re-import needed).
- **Status:** Still unresolved (MONITOR).

### Other S-items (S-01–S-07, S-10, S-12, S-13, S-15)
Per `ai/audits/SECURITY-STATUS.md` (Stage E record): 7 fixed, 4 accepted
upstream, 3 mitigated-still-open upstream (S-08, S-09, S-11). These were not
individually re-verified in this round beyond the spot checks in §6 and the
"verified clean" list below; the full updated status is in
`ai/audits/SECURITY-AUDIT-UPDATED.md` (Phase G deliverable).

### Verified clean (no finding this round)
- Zero-dependency claim confirmed; no live credentials anywhere (token/private-key
  greps hit only pattern definitions, test fixtures, redacted placeholders);
  eval provider key handling correctly redacted.
- Installer hardening verified thorough (manifest/backup validation, lockfile,
  `cleanStaleStaging` lock discipline); no `exec`/`spawn`/shell anywhere in the
  installer; no symlinks in the tracked tree.
- Workflows: minimal permissions, no `pull_request_target`, no `${{ }}`
  interpolation in `run:` blocks, all actions SHA-pinned.
- Original skills: no `curl|bash`, `wget|bash`, `rm -rf /`, `chmod 777`,
  `eval(`, or base64-decode-and-execute; upstream hits are exactly the known
  S-08/S-09/S-10/S-12 items plus guarded `rm -rf`.
- Prompt-injection boundary documented and real (AGENTS.md, THREAT-MODEL.md
  §2/§3, INJ-*/REQ-* patterns, refusal evals).

## 7. Phase B prioritization + execution plan (Phases C–G)

### 7.1 Priority groups

**P0 — must fix for any production verdict (High + Medium security/code):**
A1-01, A1-02, A4-01, A4-02 (comment), A2-01, A2-02, A2-03, A2-04/A5-01, A5-02,
A4-03 (triage + record), S-14 (implement the compare check — converts MONITOR
into a mechanism). S-08: no local close available; final disposition decision
at Phase G (see §7.3).

**P1 — fix in this mission (remaining Medium):** A1-03, A1-04, A1-05, A1-06,
A3-01, A3-02, A4-04 (docs/record only — resolves on re-merge), A4-05
(recommendation + owner action; the branch cannot fix main's PRs).

**P2 — fix in this mission where cheap and safe (Low):** all 42 Low findings
except where explicitly deferred below. A3-03 (Accessibility) and A3-04
(Railway cutoff) are follow-up work, not blockers: A3-03 is a library-wide
content pass (defer with a recorded plan, or narrow the standard's wording);
A3-04 needs a calendar re-check after 2026-12-01, not code. A4-07 (action-pin
majors) is deferred to post-re-merge Dependabot. A4-12 resolves on re-merge.
A4-09/A4-10 are owner repo-setting actions (document, don't change).

**Dependencies / sequencing:**
- A4-01 (fresh CI) requires a draft PR; the PR must wait until the P0/P1 code
  fixes land so the run validates the final HEAD, not an intermediate one.
- A4-02 (branch protection) requires A4-01 first (a required check that never
  reported blocks all merges) and owner approval — owner action, documented.
- A4-03 triage record (SECURITY-STATUS.md) precedes any alert dismissal.
- A3-01/A3-02 (verification-status.json) require registry regeneration; the
  regeneration must be verified zero-diff except for the intended changes.
- A2-18 (dedup) touches 6 scripts — run the full suite immediately after.
- PROJECT-STATUS.json (Phase F) is built from verified counts only after the
  full battery runs in Phase E.

### 7.2 Phase C workstreams (disjoint file ownership; coordinator commits)

| Workstream | Findings | Files (exclusive) |
|---|---|---|
| C1 Docs + status | A1-01–A1-10, A3-01, A3-02, A4-03 record, A5-09 docs line, A3-03 standard wording | README.md, CHANGELOG.md, SECURITY.md, docs/SECURITY-SCANNING.md, docs/THREAT-MODEL.md, docs/UPDATE-PROCESS.md, docs/ARCHITECTURE.md, ai/phase10/NOTES.md, ai/reports/PRODUCTION-ACCEPTANCE-CHECKLIST.md (addendum only), ai/reports/FINAL-IMPLEMENTATION-REPORT.md (addendum only), ai/reports/FINAL-REMEDIATION-REPORT.md (§11 annotations only), ai/PROJECT-STATUS.md, ai/audits/SECURITY-STATUS.md, ai/audits/SKILL-AUDIT-MATRIX.md (header only), sources/verification-status.json + registry regen, docs/SKILL-STANDARDS.md (element-14 wording, if narrowed) |
| C2 Installer + registry + evals code | A2-02, A2-03, A2-05, A2-06, A2-07, A2-09, A2-10, A2-12, A2-13, A2-14, A2-17, A2-18, A2-20, A2-21, A5-02, A5-03, A5-04, A5-05, A5-06, A5-08, A5-10, A5-12, S-14 (compare check) | scripts/install/*.mjs, scripts/generate-registry.mjs, scripts/validate-registry.mjs, scripts/validate-skills.mjs, scripts/check-*.mjs, scripts/query-skills.mjs, scripts/lib/atomic-write.mjs, scripts/lib/paths.mjs, evals/runners/*.mjs, evals/scorers/code.mjs, evals/datasets/*.mjs, sources/imported-skills.md (live-upstream pin entry) |
| C3 Scanner + scorer | A2-01, A2-04/A5-01, A2-08, A2-15, A2-16, A2-22, A5-07, A5-09, A5-13 | scripts/security-scan.mjs, scripts/lib/security-patterns.mjs, scripts/score-skills.mjs, scripts/check-frontmatter.mjs, sources/binary-hashes.json (new), scripts/check-sources.mjs (hash verification hook — coordinate with C2, which owns check-sources; C3 adds only the hash check function, C2 owns the file) |
| C4 Workflows + CI | A4-02 comment, A4-06, A4-08, A4-11, A2-11, A5-11, A1-09 (wording) | .github/workflows/*.yml, .github/CODEOWNERS (new) |

**Rules for all fix workstreams:** tests for every meaningful fix (new test
files per workstream, e.g. `test/audit-fixes-c2.test.mjs`, to avoid edit
collisions — do not edit existing test files except where the fix requires
it); never weaken existing tests; never edit `skills/upstream/`; historical
records corrected only by dated addenda; never `git add -A` (untracked
`evals/` outputs must never be committed); do NOT commit — the coordinator
verifies and commits.

### 7.3 The S-08 verdict question (decided at Phase G, not now)
S-08 is High, mitigated, and unclosable locally: the `curl | bash` text lives
in a verbatim upstream import. The §15 criterion "no unresolved Critical or
High" turns on whether "mitigated with verified warnings + safe-install path +
per-file scanner exceptions" counts as resolved. Options: (a) accept the
mitigation as the disposition and record it (PRODUCTION READY possible, with
the residual stated plainly); (b) drop the agentic-seo skill from the library
(closes S-08/S-09/S-14 outright, but loses a skill and is a product decision
for the owner); (c) verdict READY FOR STAGING with S-08 as the named blocker
until the owner chooses (a) or (b) or upstream fixes it. The coordinator will
decide at Phase G on the evidence and state the reasoning in
RELEASE-ACCEPTANCE.md. No silent acceptance.

### 7.4 Phases D–G
- **D (Test):** focused tests after each fix (each workstream runs the
  affected suite before handing back).
- **E (Full validation):** full local battery (tests, validate, registry,
  evals, security scan, Semgrep pinned 1.186.0, link check), then draft PR #2
  (branch → main, CI-validation only, NEVER merge); watch all runs incl.
  Windows (Node 24) and Semgrep (SAST); fix failures the runs expose.
- **F (Documentation):** `ai/PROJECT-STATUS.json` from verified counts + a
  drift-validation script wired into CI; sync README/CHANGELOG/SECURITY.md/
  checklists to verified evidence.
- **G (Release readiness):** deliverables — this report,
  `ai/audits/SECURITY-AUDIT-UPDATED.md`, `ai/audits/SKILL-VERIFICATION-REPORT.md`,
  `ai/audits/CI-VALIDATION-REPORT.md`, `ai/audits/RELEASE-ACCEPTANCE.md`,
  `ai/PROJECT-STATUS.json`, validation scripts. Final verdict exactly one of
  PRODUCTION READY / READY FOR STAGING / NOT READY, per §15 criteria.

## Appendix — evidence index
- Phase A workstream reports (5, delivered to the coordinator 2026-11-21):
  docs/history (A1), code review (A2), skills data (A3), CI/config (A4),
  security (A5). Finding IDs preserve their workstream prefixes.
- Live GitHub evidence: `gh pr checks 1` (8/8 at 508b044); runs 44933250315 /
  44933250320 / 44933250321 / 44933250387; `gh api` repo settings, code-scanning
  alerts (5 open), Dependabot PRs #2/#3; upstream compare
  `Bhanunamikaze/Agentic-SEO-Skill` ahead_by 50.
- Local commands: `npm run validate` (277 skills, PASS, 4 upstream warnings),
  `npm run check:registry` (PASS), `npm run check:frontmatter` (PASS),
  `npm run query -- status` (254/17/6/0), `node scripts/security-scan.mjs`
  (PASS, 1079 text + 4 binary files, 29 patterns), Semgrep 1.186.0 local
  (0 findings, 68 rules — Stage D + b619388 verification).
