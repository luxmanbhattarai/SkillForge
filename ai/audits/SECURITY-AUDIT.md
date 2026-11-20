# Security Audit — Phase 7

**Date:** 2026-11-20
**Scope:** the SkillForge repository on branch
`feat/skillforge-production-upgrade` — all 277 skills (228 original +
49 upstream), agents, workflows, scripts, docs, and the 4 binary
assets.
**Auditor:** Wave 3 coordinator (automated scan + manual review).
**Result:** no live credentials, no malicious code, no
prompt-injection content in the library. 6 findings fixed in this
phase, 9 documented as accepted upstream risks or open items (all in
upstream files this repository cannot edit).

## What ran

### Automated checks

| Check | Result |
| --- | --- |
| Expanded pattern scan (`npm run check:security`) | **PASS** — 0 findings after triage; 960 text files + 4 binary files, 29 patterns |
| Quality scorer security dimension (`npm run score`) | **PASS** — 0 CRITICAL |
| Security unit tests (`test/security.test.mjs`) | **PASS** — 22 tests |
| Behavioral evals, security cases (`npm run evals`) | **PASS** — 372/372 cases, incl. 20 refusal + 6 over-refusal-guard cases |
| Full test suite (`npm test`) | PASS (see `ai/test-results/phase7-security-results.json`) |
| Supply-chain verification (GitHub API) | All 6 upstream commits exist; all 6 licenses verified (see below) |

First expanded scan run: 96 findings. After pattern fixes (guards,
word boundaries, usage-only matching): 59. After triage: 0 remaining
— every finding was either fixed, a false positive, or a documented
exception with a reason. The scanner exits 1 on any new finding, so
this state is enforced, not just observed.

### Tools checked — and honestly not run

| Tool | Status | Reason |
| --- | --- | --- |
| Semgrep | **Blocked** | Not installed in this environment |
| Gitleaks | **Blocked** | Not installed |
| TruffleHog | **Blocked** | Not installed |
| CodeQL | **Blocked** | Not installed; needs GitHub-side setup |
| `npm audit` | **N/A** | Zero dependencies, no lockfile — nothing to audit (`ENOLOCK`) |
| GitHub secret scanning / Dependabot | **Not enabled from here** | Repository settings; recommended for Phase 10 CI |

None of these is claimed to have run. The local story is the pattern
scanner plus manual review below; adding GitHub secret scanning,
Dependabot, and CodeQL to CI is a Phase 10 recommendation.

### Manual review (what a human read)

- `skills/upstream/agentic-seo/seo/install.sh` — full read (installer
  with `--force` overwrite, `rm -rf` on guarded paths, curl-pipe
  documented in usage).
- `skills/upstream/agentic-seo/seo/scripts/pre_commit_seo_check.sh` —
  full read (git-hook helper; staged-file checks only).
- `skills/upstream/anthropic/webapp-testing/scripts/with_server.py` —
  full read (`shell=True` on user-provided local config).
- `skills/upstream/agentic-seo/seo/scripts/broken_links.py`,
  `fetch_page.py`, `duplicate_content.py` — read around the flagged
  lines (TLS, SSRF guard, MinHash).
- `skills/upstream/tools/clis/*.js` (5 files) — re-verified by grep:
  no `eval`, `child_process`, `exec`, `spawn`, `Function`, file
  writes, or hardcoded keys. Confirms the import-time review.
- All upstream `.py`/`.sh` — targeted grep for `os.system`,
  `os.popen`, `eval(`, `exec(`, `pickle`, `socket`, unverified SSL,
  base64+exec. Only hits: SSRF-guard DNS lookups (a security feature)
  and `run_eval(` function names (false positive on the grep itself).
- `scripts/` (installer, validators, scorer, scanner) — read during
  Waves 1–2 and this phase's refactor; no dangerous calls found.
- Every `SEC-*` finding's value was classified programmatically
  without printing it (placeholder vs realistic-looking). No live
  credential was found.

## Findings

Severity: High = exploitable or a live credential; Medium = a real
weakness with a bounded blast radius; Low = hygiene or defense in
depth.

### Fixed in this phase

**S-01 — Medium, FIXED.** `skills/security/secrets-management/SKILL.md`
used a realistic-looking 9-character example password in a
`DATABASE_URL` example. A secrets-management skill must model
placeholder-only examples. Both example lines now use `<password>`.

**S-02 — Medium, FIXED.** The scanner missed multi-line curl-pipe
commands (`curl … | \` + `bash` on the next line) because patterns are
line-based. The upstream `install.sh` usage text evaded it. Added
multi-line detection; it now finds both upstream instances (see S-08).

**S-03 — Low, FIXED.** Five patterns false-positived on ordinary
content: bare "update" in prose (CODE-03/04), prose mentions of
`dangerouslySetInnerHTML` (CODE-06), "cache keys" (CODE-12), a config
key named `user` (CODE-13), and `f'` in "itself'" (CODE-04). Fixed
with quote guards, word boundaries, and usage-only matching; each fix
has a regression test in `test/security.test.mjs`.

**S-04 — Medium, FIXED.** Security patterns existed in three divergent
copies (scanner, scorer, eval mock agent). Consolidated into
`scripts/lib/security-patterns.mjs` (34 patterns, scoped per
consumer). All three consumers now import from it; the refactor
changed no eval behavior (372/372 before and after).

**S-05 — Medium, FIXED.** No tests covered the security patterns.
Added `test/security.test.mjs` (22 tests: matches, guards,
non-matches, scope partitioning).

**S-06 — Low, FIXED.** No supply-chain verification existed beyond the
import record. All 6 upstream commits and licenses re-verified via
the public GitHub API on 2026-11-20 (table below).

**S-15 — Low, FIXED.** `sources/licenses.md` claimed a `LICENSE.txt`
in every Anthropic skill directory. `doc-coauthoring` ships none
upstream (verified: the upstream directory at commit `e4bb5d96`
contains only `SKILL.md`). The license table and note now say 7 of 8.

### Accepted or open (all in upstream files — cannot edit here)

**S-07 — Medium, ACCEPTED (upstream).** Agentic SEO documents
unpinned `pip install` commands (~30 occurrences across scripts,
README, SKILL.md, and `install.sh`). Unpinned installs can pull a
compromised future release. Upstream hygiene issue; flagged for the
next update cycle. Scanner exception documents it.

**S-08 — High, UNRESOLVED (upstream).** Agentic SEO documents a
curl-piped-to-shell install (`curl … | bash`) in its README and in
`install.sh` usage text. This directly conflicts with this
repository's security guidance. Cannot edit upstream; the risk is
that a user follows the upstream install path instead of SkillForge's
installer. Mitigation: this repository's own docs never recommend
curl-pipe installs, and the finding is recorded here and in the
scanner exceptions. Flagged for upstream follow-up.

**S-09 — Medium, UNRESOLVED (upstream).** Agentic SEO
`scripts/broken_links.py` disables TLS verification (`verify=False`)
on both its HEAD and GET requests, silently. Any link check against a
host with a bad certificate proceeds without warning. Genuine issue;
cannot edit upstream. Note the sibling script `fetch_page.py` keeps
verification on — the inconsistency suggests an oversight rather than
a deliberate choice. Flagged for upstream follow-up.

**S-10 — Medium, ACCEPTED (upstream).** Anthropic
`webapp-testing/scripts/with_server.py` runs user-provided server
commands with `shell=True` (comment: "to support commands with cd and
&&"). The trust boundary is the user's own local config file: the
commands come from a file the user wrote, not from untrusted input.
Accepted as a deliberate design choice; the risk would materialize
only if the config file itself were attacker-controlled. Scanner
exception documents the boundary.
**Stage B correction (2026-11-20):** re-reading `with_server.py`
shows the commands come from the invoking user's `--server` CLI
arguments (argparse, `--server` is required) — no config file is read
anywhere in the script. The trust boundary is the invoking user, not
untrusted input; the ACCEPTED decision stands (an attacker would need
to control the invoking user's command line, i.e. already have code
execution). The scanner exception reason was corrected to match.

**S-11 — Medium, UNRESOLVED (upstream).** Prisma's upgrade guide
(`prisma-upgrade-v7`) recommends `rejectUnauthorized: false` to
"preserve old behavior" / "accept self-signed certs". The same doc
also recommends proper CA configuration (`NODE_EXTRA_CA_CERTS`), so
the safe path is present — but the insecure workaround is presented
first. Upstream guidance issue; flagged for the next update cycle.

**S-12 — Low, ACCEPTED (upstream).** Agentic SEO `install.sh` runs
`rm -rf` on two variable paths: `TEMP_DIR` (mktemp-created, guarded
by a non-empty + is-directory check) and `dest` (a skill install path
built from validated `--target` + user `--project-dir`, only with
`--force`). Both are guarded. A `--skill-name` containing `../` could
traverse — but the user runs the installer with their own arguments,
so that is self-inflicted, not an attack vector.

**S-13 — Low, ACCEPTED (upstream).** Agentic SEO `fetch_page.py` has
an SSRF guard (resolves the hostname, blocks private/loopback/
reserved IPs) — good — but it resolves DNS once for the check and
`requests` resolves again for the fetch, so a DNS-rebinding attack
could theoretically bypass it (TOCTOU). Stops the naive SSRF case;
the rebinding case needs upstream attention.

**S-14 — Medium, OPEN.** The agentic-seo import source
(`pwg-projects/agentic-seo-skill`, last push 2026-03-03) is dormant,
but the author's personal repo (`Bhanunamikaze/Agentic-SEO-Skill`,
last push 2026-10-14) is active, is not a fork, and contains the
imported commit — and `install.sh` already points at it as its
default source. The project is not dead; the import points at the
stale copy. **Decision (resolves L-10): MONITOR, do not replace.**
At the next update cycle, re-verify the source and re-point the
import to the author's personal repo if it is confirmed as the live
upstream; do not re-import from the dormant copy without checking.

## False positives triaged (not findings)

| What flagged | Why it is not a finding |
| --- | --- |
| Prisma `$queryRaw` / `Prisma.sql` template literals (5) | Prisma parameterizes interpolated values by design |
| Prisma connection-string examples (8) | Placeholder passwords; localhost/placeholder hosts |
| `dangerouslySetInnerHTML` with DOMPurify-sanitized HTML | The skill's recommended safe pattern (allowlisted tags/attrs) |
| `dangerouslySetInnerHTML` with escaped JSON-LD | `<` escaped to `\u003c` — the standard safe pattern |
| `dangerouslySetInnerHTML` with a static theme script | No user data interpolated |
| MD5 in `duplicate_content.py` | Non-cryptographic MinHash for duplicate detection |
| Vercel example token (10 chars) | Real Vercel tokens are 24 chars; not a credential |
| `socket.gethostbyname` in agentic-seo scripts | SSRF guard, not exfiltration |
| `run_eval(` in Anthropic scripts | Function name, not `eval()` |
| Eval + test fixtures containing injection strings | Intentional by construction; excepted |

## Supply-chain verification (2026-11-20, public GitHub API)

| Vendor | Repository | Recorded commit | Commit exists | Commit date | License (recorded → verified) |
| --- | --- | --- | --- | --- | --- |
| Anthropic | anthropics/skills | `e4bb5d96…` | yes | 2026-11-16 | Apache-2.0 → per-skill LICENSE.txt (7 of 8; no repo-root LICENSE file, so the API license endpoint 404s — expected) |
| Vercel | vercel-labs/agent-skills | `1a2c79d4…` | yes | 2026-10-27 | MIT → README "## License / MIT" verified live (no LICENSE file upstream, as recorded) |
| Superpowers | obra/superpowers | `22f0b463…` | yes | 2026-11-03 | MIT → MIT |
| Prisma | prisma/skills | `a6f19295…` | yes | 2026-11-09 | MIT → MIT |
| MarketingSkills | coreyhaines31/marketingskills | `5b2b400e…` | yes | 2026-11-20 | MIT → MIT |
| Agentic SEO | pwg-projects/agentic-seo-skill | `67775741…` | yes | 2026-03-03 | MIT → MIT |

Full SHAs are in `sources/imported-skills.md`. No commit was missing
or replaced; no license changed.

## Automated vs manual vs unverified

- **Automated:** pattern scan, scorer security dimension, security
  unit tests, eval refusal cases, supply-chain API checks.
- **Manual:** imported-code reads and greps listed above; every
  finding triaged by reading the flagged line in context; credential
  values classified without being printed.
- **Unverified:** binary asset contents beyond the byte scan (the
  shadcn tarball is gzipped — a byte scan over compressed data is
  weak); real-model eval behavior (the mock agent tests the library's
  guidance, not a model's reasoning); upstream repositories' full
  history (only the pinned commit was checked); GitHub-side scanning
  (secret scanning, Dependabot, CodeQL — not enabled from here);
  Windows-specific paths.

## Recommendations

1. **Phase 10 CI:** enable GitHub secret scanning, Dependabot, and
   CodeQL; pin actions by SHA.
2. **Next upstream update:** re-verify the agentic-seo source (S-14)
   before re-importing; raise S-08/S-09 upstream.
3. **Next audit cycle:** re-run the supply-chain verification (commits
   + licenses) and re-triage the exceptions list — exceptions must not
   become permanent without review.
