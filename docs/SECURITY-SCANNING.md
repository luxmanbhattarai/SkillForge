# Security Scanning

How SkillForge checks itself for secrets, dangerous code, and
prompt-injection content — what runs, what it can and cannot catch,
and how to handle a finding.

## The layers

| Layer | What it is | Command |
| --- | --- | --- |
| Pattern scan | 29 regex patterns over every text file + byte-level secret scan over binaries | `npm run check:security` |
| Quality scorer | Secrets + injection subset; a hit caps the skill at 40 and flags it CRITICAL | `npm run score` |
| Behavioral evals | Refusal cases: does the library lead an agent to refuse unsafe requests? | `npm run evals` |
| Security unit tests | 23 tests pinning pattern behavior (matches, guards, non-matches, exact scope counts) | `node --test test/security.test.mjs` |
| Scanner integration tests | 10 tests spawning the real scanner against temp trees, proving exceptions are narrow (see below) | `node --test test/scanner.test.mjs` |
| Manual review | Imported executable code is read, not just scanned | see `ai/audits/SECURITY-AUDIT.md` |
| Supply-chain check | Upstream commits + licenses re-verified via the public GitHub API | manual, recorded in the audit |

All patterns live in one place: `scripts/lib/security-patterns.mjs`.
The scanner, the scorer, and the eval mock agent import from it; there
is no second copy to drift. Each pattern has a stable ID (`SEC-01`,
`INJ-03`, `CODE-04`, …), a severity, and a scope:

- `scan` — the repo scanner (all patterns except the input-only ones)
- `score` — the quality scorer (secrets + injection only; command and
  code patterns need context triage and must not cap a score by
  themselves)
- `input` — the eval mock agent's unsafe-request checks (injection +
  unsafe-request patterns only; asking *about* secrets is legitimate
  and must not be refused)

## Running the scanner

```bash
npm run check:security          # human-readable; exit 1 on any finding
node scripts/security-scan.mjs --json   # machine-readable output
```

The scanner reads every text file (`.md .mjs .js .ts .sh .py .json
.yml .yaml .toml`) and byte-scans binary files (`.png .jpg .gif .pdf
.gz .tar .zip`) for secret patterns. It also detects multi-line
curl-pipe commands (`curl … | \` followed by `bash` on the next line),
which a line-based pattern misses.

For tests only, the scan root can be overridden with the
`SECURITY_SCAN_ROOT` environment variable or a `--root <dir>` flag
(`--root` wins). The default is the repository root. The override
exists so `test/scanner.test.mjs` can run the real scanner against
temp trees; it is not a way to scan a subset of the repo in CI.

## How narrow the exceptions are

An exception is `[path prefix, pattern id, reason]` — per-file (or
per-directory) **and** per-pattern. The matcher is deliberately
strict:

- A prefix ending in `/` is a directory: it matches everything under
  it (e.g. `skills/upstream/agentic-seo/` for the `CMD-04` unpinned
  pip installs that span that whole tree, audit S-07).
- Any other prefix is a file path and must match **exactly**. A file
  that merely shares a prefix with an excepted file — e.g.
  `ai/audits/SECURITY-AUDIT.md.bak` next to the excepted
  `ai/audits/SECURITY-AUDIT.md` — is **not** excepted. (A bare
  `startsWith` matcher would have excepted it; this was fixed in
  Stage B, finding S-11.)
- An excepted file still reports every *other* pattern. Excepting
  `CODE-14` in a file does not except `SEC-05` in the same file.

`test/scanner.test.mjs` proves all of this by spawning the real
scanner against temp trees: genuine TLS-disable, curl-pipe, and
Python shell-execution constructs in ordinary files are still reported (exit
1); the same constructs in excepted paths are suppressed; and
prefix-sharing files, same-directory siblings of excepted files, and
non-excepted patterns in excepted files are all still reported.

Pattern counts are pinned by `test/security.test.mjs` (finding
A-20): 34 patterns total, 29 in the `scan` scope, 11 in `score`,
9 in `input`. If a pattern is added or removed, update those
numbers deliberately — do not loosen the assertions.

## Upstream risks with local guidance

Two open upstream findings have dedicated safe-install guidance in
`docs/AGENTIC-SEO-SAFE-INSTALL.md` — neither is fixed upstream, and
the guide says so:

- **S-08 (High):** upstream documents a curl-pipe install from the
  `main` branch with no verification. The guide documents the
  verified install path (SkillForge's installer, from the vendored
  copy pinned to `67775741…`) and the safe standalone path
  (download from the pinned commit, verify the SHA-256, inspect,
  run locally).
- **S-09 (Medium):** upstream `broken_links.py` disables TLS
  verification on its per-link requests (lines 71 and 76). The guide warns
  users and explains the inconsistency with the sibling
  `fetch_page.py`, which keeps verification on.

## Supply-chain monitoring

`scripts/check-upstream.mjs` (weekly CI) compares each vendor repo's
default-branch head against the pin in `sources/imported-skills.md`.
One gap to know about (finding S-14): it monitors the **recorded
pin source**, which for agentic-seo is the dormant fork
`pwg-projects/agentic-seo-skill` — so the weekly check reports
agentic-seo UP-TO-DATE while the author's live repository
(`Bhanunamikaze/Agentic-SEO-Skill`) is 50 commits ahead of the pin
(re-verified 2026-11-20). At the next re-import, re-verify the
source and re-point the pin to the author's repository if it is
confirmed as the live upstream; do not re-import from the dormant
copy without checking.

## Handling a finding

1. **Read the line in context.** The scanner is a smoke screen, not
   SAST. Skills legitimately document attacks and show vulnerable code
   as counter-examples; the pattern cannot tell a counter-example from
   a recommendation.
2. **If it is real, fix it.** A real secret must be revoked, not just
   deleted from the file — assume it is already copied. See
   `SECURITY.md` for reporting.
3. **If it is intentional, document it** — never delete a pattern to
   silence a finding. Two mechanisms:
   - **Exceptions list** in `scripts/security-scan.mjs` (`EXCEPTIONS`):
     `[path prefix, pattern id, reason]`. Use this for upstream files
     (which cannot be edited) and for skill counter-examples. Keep the
     prefix as narrow as the evidence allows.
   - **Line-level ignore:** add `security-scan:ignore` to the line
     (or `security-scan:ignore SEC-01,CODE-03` for specific patterns).
     Only for files this repository owns.
4. **If the pattern is wrong, fix the pattern** and add a regression
   test in `test/security.test.mjs` pinning the non-match. Several
   patterns carry guards learned this way (see below).

## Guards and known limits

- **Placeholder guard:** secret patterns skip values containing
  obvious placeholder words (`example`, `changeme`, `<password>`,
  `password`, `secret`, `test`, `demo`, …). Trade-off: a real leaked
  credential containing one of those words would be missed. In a docs
  repository the realistic noise is example passwords; reviewers still
  eyeball every `SEC-*` finding the scanner reports.
- **Quote guard (CODE-03/CODE-04):** the SQL keyword must sit inside a
  string or template literal. Bare "update" in prose ("would update
  ${x}") is not SQL.
- **Usage-only (CODE-06):** `dangerouslySetInnerHTML` only flags as
  JSX usage (`={{`); prose mentions ("avoid dangerouslySetInnerHTML")
  are guidance, not code.
- **Word boundaries (CODE-12):** "cache keys" is not a cryptographic
  key.
- **No bare "user" (CODE-13):** a config key named `user`
  (`targetDef.skills.user`) is not user input.
- **The jwt.io example token** is guarded out of SEC-04 (it is the
  standard documentation example, not a credential).
- **What the scanner cannot do:** it cannot follow data flow (a
  sanitizer two lines above a sink looks the same as no sanitizer),
  it cannot judge whether a shell command's variable is safe, and it
  cannot detect secrets split across lines or encoded. Those need
  human review and, for code, real SAST (see below).

## Tools not available locally

The following were checked for on 2026-11-20 and are **not installed**
in this environment: Semgrep, TruffleHog, CodeQL. (Gitleaks was
downloaded to a scratch directory for a one-off triage on
2026-11-21 and is not installed either.) `npm audit` does not
apply: the repository has zero dependencies and no lockfile, so
there is nothing to audit. The scanner above plus manual review is
the local story.

On the GitHub side, CodeQL runs via a workflow
(`.github/workflows/codeql.yml`, advanced setup — do not also enable
CodeQL default setup) and has run green on PRs #1/#4/#5 and on main.
GitHub secret scanning (with push protection) and Dependabot
security updates are enabled; branch protection is enabled on
`main` (2026-11-21): 10 required status checks (strict), force
pushes and deletions blocked, admins bypass the checks so direct
pushes still work. 5 of 6 workflows have run on GitHub (Validate,
Lint, Security audit, CodeQL, Release validation on the v1.1.0
tag); `scheduled-maintenance` has never run. The Semgrep job runs
green in CI (0 findings, `p/javascript`), and the Gitleaks job
scans the full git history on every push/PR (0 findings; 13
triage findings were all fake test fixtures or documented
examples, allowlisted by exact value in `.gitleaks.toml`).

## Files

- `scripts/security-scan.mjs` — the scanner (exceptions live here)
- `scripts/lib/security-patterns.mjs` — the shared patterns
- `test/security.test.mjs` — pattern unit tests (counts pinned)
- `test/scanner.test.mjs` — scanner integration tests (exception narrowness)
- `docs/AGENTIC-SEO-SAFE-INSTALL.md` — safe install guidance for the open upstream findings S-08/S-09
- `ai/audits/SECURITY-AUDIT.md` — the triaged findings
- `docs/THREAT-MODEL.md` — what is and is not defended against
