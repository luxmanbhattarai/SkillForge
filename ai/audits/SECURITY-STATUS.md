# Security Status — S-01 through S-15 (Remediation, Stage E)

- **Date:** 2026-11-20
- **Branch:** `feat/skillforge-production-upgrade` (local only; nothing pushed)
- **Sources:** Phase 7 audit (`ai/audits/SECURITY-AUDIT.md`), Stage A
  re-review (`ai/remediation/ISSUE-REGISTER.md`), Stage B re-verification
  and fixes (`ai/remediation/STAGE-B-RESULTS.md`), Stage D external
  scanners and supply-chain audit
  (`ai/remediation/STAGE-D-RESULTS.md`,
  `ai/remediation/stage-d/supply-chain-audit.md`,
  `ai/remediation/stage-d/ci-validation.md`).
- **Scanner state at the final battery:** `npm run check:security`
  PASS, no findings (1,078 text files + 4 binary files, 29 patterns;
  the count grows with the tree — 1,075 at Stage E head `fad76e0`).
  See `ai/reports/FINAL-REMEDIATION-REPORT.md` §10.

## Summary

| Status | Count | IDs |
| --- | --- | --- |
| Fixed (in Phase 7, re-verified in Stage B) | 7 | S-01, S-02, S-03, S-04, S-05, S-06, S-15 |
| Accepted upstream (confirmed in Stage B) | 4 | S-07, S-10, S-12, S-13 |
| Mitigated, still open upstream | 3 | S-08 (High), S-09, S-11 |
| Open (MONITOR) | 1 | S-14 |
| **Total** | **15** | |

No Critical findings. No live credentials and no malicious code were
found at any stage (repo scanner, history sweep, and three external
scanners agree — see "Secret scanning" below).

## S-01 — Medium — FIXED (Phase 7; re-verified Stage B)

- **Original status (Phase 7):** FIXED. The secrets-management skill
  used a realistic-looking 9-character example password in a
  `DATABASE_URL` example; both example lines now use `<password>`.
- **Current status:** FIXED. Stage B spot-checked both examples —
  placeholders in place.
- **Evidence:** `skills/security/secrets-management/SKILL.md`;
  `ai/audits/SECURITY-AUDIT.md` S-01.
- **Remaining risk:** none.

## S-02 — Medium — FIXED (Phase 7; re-verified Stage B)

- **Original status (Phase 7):** FIXED. The scanner missed multi-line
  curl-pipe commands; multi-line detection was added and now finds
  both upstream instances (see S-08).
- **Current status:** FIXED. Stage B re-verified the multi-line
  detection is present and now regression-tested end-to-end.
- **Evidence:** `scripts/security-scan.mjs` (multi-line curl-pipe
  detection); `test/security.test.mjs`.
- **Remaining risk:** none.

## S-03 — Low — FIXED (Phase 7; re-verified Stage B)

- **Original status (Phase 7):** FIXED. Five patterns false-positived
  on ordinary content; fixed with quote guards, word boundaries, and
  usage-only matching, each with a regression test.
- **Current status:** FIXED. All guard regression tests pass.
- **Evidence:** `scripts/lib/security-patterns.mjs`;
  `test/security.test.mjs`.
- **Remaining risk:** none.

## S-04 — Medium — FIXED (Phase 7; re-verified Stage B)

- **Original status (Phase 7):** FIXED. Security patterns existed in
  three divergent copies; consolidated into
  `scripts/lib/security-patterns.mjs` (34 patterns, scoped per
  consumer).
- **Current status:** FIXED. Stage B verified all three consumers
  (scanner, scorer, eval mock agent) import from the shared library.
  Pattern counts are now pinned by tests (Stage B, A-20): 34 total,
  29 scan, 11 score, 9 input.
- **Evidence:** `scripts/lib/security-patterns.mjs`;
  `test/security.test.mjs` (exact-count assertions).
- **Remaining risk:** none.

## S-05 — Medium — FIXED (Phase 7; extended in Stage B)

- **Original status (Phase 7):** FIXED. Added `test/security.test.mjs`
  (22 tests: matches, guards, non-matches, scope partitioning).
- **Current status:** FIXED, coverage extended. Security tests are now
  23 unit + 10 scanner integration tests (`test/scanner.test.mjs`,
  Stage B, S-11) = 33, all passing.
- **Evidence:** `test/security.test.mjs`, `test/scanner.test.mjs`.
- **Remaining risk:** none.

## S-06 — Low — FIXED (Phase 7; re-verified Stages A, B, D, E)

- **Original status (Phase 7):** FIXED. All 6 upstream commits and
  licenses re-verified via the public GitHub API.
- **Current status:** FIXED, continuously re-verified. Stage A
  reproduced the verification (claim 15); Stage B re-verified the
  agentic-seo leg independently; Stage D re-ran `check:upstream`
  (5 up-to-date, Vercel behind, pre-re-import) and re-imported
  Vercel verbatim to head; Stage E re-ran `check:upstream` after
  the rate-limit reset: **6 up-to-date, 0 behind, 0 ahead,
  0 diverged, 0 unknown** (2026-11-20).
- **Evidence:** `sources/imported-skills.md`,
  `sources/licenses.md`; Stage E `npm run check:upstream` output
  (see `ai/reports/FINAL-REMEDIATION-REPORT.md` §G).
- **Remaining risk:** none for the recorded pins. Note the S-14
  monitoring gap: the drift check watches the dormant agentic-seo
  fork, not the author's live repo.

## S-07 — Medium — ACCEPTED (upstream; confirmed Stage B)

- **Original status (Phase 7):** ACCEPTED (upstream). Agentic SEO
  documents unpinned `pip install` commands (~30 occurrences);
  unpinned installs can pull a compromised future release.
- **Current status:** ACCEPTED, confirmed. Stage B re-read the
  upstream code: 32 unpinned occurrences, mostly in error-message
  strings; none pinned. The directory-wide CMD-04 exception for
  `skills/upstream/agentic-seo/` is deliberate and per-pattern,
  and is now regression-tested in `test/scanner.test.mjs`. No
  local code change is possible under the verbatim policy; the
  safe-install guide tells users to install dependencies
  themselves, pinned, in a virtual environment.
- **Evidence:** `skills/upstream/agentic-seo/` (upstream, unedited);
  `docs/AGENTIC-SEO-SAFE-INSTALL.md`; `test/scanner.test.mjs`.
- **Remaining risk:** a user following the upstream docs installs
  unpinned packages. Mitigated by the safe-install guide and by
  the install/doctor warnings (S-08). Upstream follow-up owed.

## S-08 — High — UNRESOLVED (upstream) — MITIGATED, STILL OPEN

- **Original status (Phase 7):** UNRESOLVED (upstream). Agentic SEO
  documents a curl-piped-to-shell install (`curl … | bash`) in its
  README and in `install.sh` usage text, conflicting with this
  repo's security guidance.
- **Current status:** MITIGATED, STILL OPEN. Stage B investigated
  (read-only): the upstream install is fetched from the moving
  `main` branch — remote code executes without verification, the
  script is not pinned to any version, and there are no checksums
  or signatures anywhere; the installer itself, in remote mode,
  does an unpinned `git clone --depth 1` of `main`. Confirmed as
  reported, High severity. The upstream source is unchanged.
- **Mitigations implemented (local maximum under the verbatim
  policy):**
  - `docs/AGENTIC-SEO-SAFE-INSTALL.md`: the verified path
    (SkillForge's own installer installs the `seo` skill from the
    vendored copy, pinned to commit `67775741…`, no network fetch,
    no remote code execution — the coordinator independently
    verified the pinned `install.sh`/`README.md` are
    byte-identical to the vendored copies) and the safe
    standalone path (download from the pinned commit, verify the
    SHA-256, inspect, run locally).
  - Install/update and doctor warnings: emitted when the `seo`
    skill is installed/updated (detected by the
    `skills/upstream/agentic-seo/` source prefix) and as
    level-`warn` doctor problems per installed matching entry.
  - This repo's own docs never recommend curl-pipe installs.
- **Evidence:** `skills/upstream/agentic-seo/seo/README.md`,
  `skills/upstream/agentic-seo/seo/install.sh` (upstream,
  unedited); `docs/AGENTIC-SEO-SAFE-INSTALL.md`;
  `scripts/install/commands.mjs` (warnings).
- **Remaining risk:** HIGH (upstream). Anyone who finds the
  upstream repository directly may follow the unsafe install.
  Upstream follow-up (raising this with the agentic-seo author)
  is still owed. Do not mark fixed while upstream is unchanged.

## S-09 — Medium — UNRESOLVED (upstream) — MITIGATED, STILL OPEN

- **Original status (Phase 7):** UNRESOLVED (upstream). Agentic SEO
  `scripts/broken_links.py` disables TLS verification
  (`verify=False`) on both its HEAD and GET requests, silently.
  The sibling `fetch_page.py` keeps verification on, suggesting
  an oversight.
- **Current status:** MITIGATED, STILL OPEN. Stage B sharpened the
  oversight reading: the same script's initial page fetch keeps
  verification on, and only the per-link checks disable it. The
  vendored script is unchanged (a patched copy would diverge from
  upstream, which the verbatim policy forbids).
- **Mitigations:** docs warning in
  `docs/AGENTIC-SEO-SAFE-INSTALL.md` (impact, why it looks like
  an oversight, user workarounds) plus the install/doctor
  warnings (same trigger as S-08).
- **Evidence:** `skills/upstream/agentic-seo/seo/scripts/broken_links.py`
  (upstream, unedited); `docs/AGENTIC-SEO-SAFE-INSTALL.md`.
- **Remaining risk:** MEDIUM (upstream). Every install of the `seo`
  skill carries the flawed script until upstream fixes it or the
  skill is re-imported from a fixed upstream commit. Upstream
  follow-up owed.

## S-10 — Medium — ACCEPTED (upstream; wording corrected Stage B)

- **Original status (Phase 7):** ACCEPTED (upstream). Anthropic
  `webapp-testing/scripts/with_server.py` runs user-provided
  server commands with `shell=True`; the audit's trust boundary
  was "the user's own local config file".
- **Current status:** ACCEPTED, with a correction. Stage B
  re-read `with_server.py`: the commands come from the invoking
  user's `--server` CLI arguments (argparse, `--server` is
  required) — no config file is read anywhere in the script.
  The trust boundary is the invoking user, not untrusted input;
  an attacker would need to control the invoking user's command
  line (i.e. already have code execution). The ACCEPTED decision
  stands; the scanner exception reason was corrected and a dated
  correction note was added to `ai/audits/SECURITY-AUDIT.md`.
- **Evidence:** `skills/upstream/anthropic/webapp-testing/scripts/with_server.py`
  (upstream, unedited); `scripts/security-scan.mjs` (exception
  reason); `ai/audits/SECURITY-AUDIT.md` (correction note).
- **Remaining risk:** none beyond the accepted design: the script
  runs only commands its invoker supplies.

## S-11 — Medium — UNRESOLVED (upstream) — MITIGATED

- **Original status (Phase 7):** UNRESOLVED (upstream). Prisma's
  upgrade guide (`prisma-upgrade-v7`) recommends
  `rejectUnauthorized: false` to "preserve old behavior" /
  "accept self-signed certs"; the same doc also recommends
  proper CA configuration (`NODE_EXTRA_CA_CERTS`), but the
  insecure workaround is presented first.
- **Current status:** MITIGATED. The upstream Prisma guidance is
  unchanged (verbatim policy); the finding stays open upstream.
  The local scanner-exception handling was hardened in Stage B:
  the Prisma CODE-14 exceptions are per-file (the two triaged
  files only), not directory-wide; the exception matcher was
  hardened (a prefix ending in `/` matches a directory, any
  other prefix must match the file path exactly — the old bare
  prefix match would have excepted e.g. `SECURITY-AUDIT.md.bak`
  alongside the excepted `SECURITY-AUDIT.md`); the scanner
  gained a root override for testing; 10 new integration tests
  in `test/scanner.test.mjs` prove genuine TLS-disable,
  curl-pipe, and Python shell-execution constructs in ordinary
  files are still reported, and that prefix-sharing files,
  same-directory siblings of excepted files, and non-excepted
  patterns in excepted files are all still reported.
- **Evidence:** `skills/upstream/prisma/prisma-upgrade-v7/`
  (upstream, unedited); `scripts/security-scan.mjs`
  (`matchesPrefix`, EXCEPTIONS); `test/scanner.test.mjs`.
- **Remaining risk:** MEDIUM (upstream). Users reading the
  upstream guide may follow the insecure workaround first. The
  safe path (proper CA configuration) is present in the same
  doc. Upstream follow-up owed.

## S-12 — Low — ACCEPTED (upstream; confirmed Stage B)

- **Original status (Phase 7):** ACCEPTED (upstream). Agentic SEO
  `install.sh` runs `rm -rf` on two variable paths, both
  guarded: `TEMP_DIR` (mktemp-created, non-empty + is-directory
  check) and `dest` (built from validated `--target` + user
  `--project-dir`, only with `--force`). A `--skill-name`
  containing `../` could traverse, but only with the user's own
  arguments (self-inflicted, not an attack vector).
- **Current status:** ACCEPTED, confirmed. Stage B re-verified
  the temp-dir guard and destination guards in `install.sh`.
- **Evidence:** `skills/upstream/agentic-seo/seo/install.sh`
  (upstream, unedited).
- **Remaining risk:** none beyond the accepted self-inflicted case.

## S-13 — Low — ACCEPTED (upstream; confirmed Stage B)

- **Original status (Phase 7):** ACCEPTED (upstream). Agentic SEO
  `fetch_page.py` has an SSRF guard (resolves the hostname,
  blocks private/loopback/reserved IPs) but resolves DNS once
  for the check and `requests` resolves again for the fetch, so
  a DNS-rebinding attack could theoretically bypass it (TOCTOU).
  Stops the naive SSRF case.
- **Current status:** ACCEPTED, confirmed. Stage B re-verified
  the guard and the TOCTOU window in `fetch_page.py`.
- **Evidence:** `skills/upstream/agentic-seo/seo/scripts/fetch_page.py`
  (upstream, unedited).
- **Remaining risk:** LOW (upstream). The rebinding case needs
  upstream attention; the naive SSRF case is stopped.

## S-14 — Medium — OPEN — MONITOR stands

- **Original status (Phase 7):** OPEN. The agentic-seo import
  source (`pwg-projects/agentic-seo-skill`, last push
  2026-03-03) is dormant, but the author's personal repo
  (`Bhanunamikaze/Agentic-SEO-Skill`, last push 2026-10-14) is
  active and contains the imported commit. Decision: MONITOR,
  do not replace.
- **Current status:** OPEN, MONITOR stands. Stage A re-confirmed
  via the GitHub API; Stage B re-verified: `pwg-projects/agentic-seo-skill`
  is a fork (`fork: true`) of the author's repo, last push
  2026-03-03, 0 stars, head exactly at the pinned commit. The
  author's repo is active (last push 2026-10-14, 1,075 stars,
  MIT) and exactly 50 commits ahead of the pin (compare: ahead
  by 50, behind by 0 — the pin is an ancestor of the author's
  head).
- **Monitoring gap (found Stage B, documented):**
  `scripts/check-upstream.mjs` monitors the recorded pin
  source — the dormant fork — so the weekly drift check reports
  agentic-seo UP-TO-DATE while the live upstream is 50 commits
  ahead. Documented in `docs/SECURITY-SCANNING.md`
  (supply-chain monitoring) and `docs/THREAT-MODEL.md`. This
  needs a re-point decision at the next re-import, not a code
  change now.
- **Evidence:** GitHub API (Stage A + Stage B); `sources/imported-skills.md`,
  `sources/licenses.md`,
  `skills/upstream/agentic-seo/ATTRIBUTION.md`,
  `scripts/check-upstream.mjs`.
- **Remaining risk:** MEDIUM. The import tracks a stale copy;
  security fixes landing in the author's repo are invisible to
  the drift check until the import is re-pointed. Re-verify the
  source at the next re-import; do not re-import from the
  dormant copy without checking.

## Secret scanning

| Check | Result |
| --- | --- |
| Repo scanner (`npm run check:security`) | PASS, no findings (29 patterns, text + binary byte-scan) |
| History sweep (Stage B, `git log --all -p` greps) | No live credential. Private-key headers: only the pattern definition and the test fixture (no key material). Token prefixes (`ghp_`/`gho_`/`github_pat_`/`sk-`): 0 hits. `AKIA`: 1 hit — AWS's documented example key ID in the security tests, not a live credential |
| Gitleaks 8.30.1 (Stage D, 66 commits + tree) | 5 findings, 0 real (test fixtures, a public doc-example token, a UUID example key) |
| TruffleHog 3.100.0 (Stage D, filesystem) | 4 unverified, 0 verified (placeholder connection strings in upstream Prisma docs + 1 historical blob) |
| Semgrep 1.186.0 (Stage D, `p/javascript` over scripts/test/evals) | 0 findings, 0 errors |
| CodeQL | Blocked locally (bundle size + DB build); runs via `codeql.yml` on GitHub on the first push/PR |

No credential values were reproduced in any report. The external
scanners agree with the repo's own scanner: no real leaked
credentials in the tree or its history.

## Scanner exceptions — scope and test coverage

Every scanner exception is per-file + per-pattern with an
explicit reason in `scripts/security-scan.mjs` (EXCEPTIONS map),
following the `SECURITY-AUDIT.md` precedent. There is no
directory-wide exception for repo documentation. The exception
matcher was hardened in Stage B (exact file match vs directory
prefix). `test/scanner.test.mjs` (10 integration tests, spawning
the real scanner against temp trees) proves the exceptions do
not suppress genuine vulnerabilities: genuine TLS-disable,
curl-pipe, and shell-execution constructs in ordinary files are
still reported (exit 1), as are the same constructs in
prefix-sharing files, same-directory siblings of excepted files,
and non-excepted patterns in excepted files.

Stage E added 6 exceptions (commit `783392d`, finding A-38):
this document and `ai/reports/FINAL-REMEDIATION-REPORT.md` each
quote the CMD-01 / CODE-14 / CODE-08 constructs as evidence for
S-08/S-09/S-10/S-11 — the same treatment as the audit report.
Stage E also made the scanner tolerate files deleted between
the directory listing and the read (ENOENT → skip; counts only
include files actually read).

## Supply chain (Stage D)

- Zero dependencies (verified): no `dependencies` /
  `devDependencies` / `peerDependencies` /
  `optionalDependencies` in `package.json`, no lockfile of any
  kind. `npm audit` ENOLOCK is handled by the security workflow.
- 3 first-party GitHub Actions, all SHA-pinned (checkout v5,
  setup-node v5, codeql-action v4); pins re-verified via
  `git ls-remote` (Stage D). Dependabot is github-actions-only.
- 4 binary files, all upstream and load-bearing, SHA-256 hashes
  recorded for the first time (Stage D): 2 agentic-seo PNG
  screenshots, the Anthropic theme-showcase PDF, and
  `shadcn-components.tar.gz` (49 entries, all `.tsx` shadcn
  components, listing-inspected — no executables, no scripts,
  no absolute paths, no symlinks).
- Post-install scripts: none. Unnecessary dependencies: none.
- `npx skills add` fetches Vercel's `skills` CLI unpinned
  (documentation-level note; recommend pinning a verified CLI
  version at the next docs pass — no change made, a pin must
  come from a verified install).
