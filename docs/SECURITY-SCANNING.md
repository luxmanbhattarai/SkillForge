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
| Security unit tests | 22 tests pinning pattern behavior (matches, guards, non-matches) | `node --test test/security.test.mjs` |
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
in this environment: Semgrep, Gitleaks, TruffleHog, CodeQL. `npm audit`
does not apply: the repository has zero dependencies and no lockfile,
so there is nothing to audit. The scanner above plus manual review is
the local story.

On the GitHub side, CodeQL now runs via a workflow
(`.github/workflows/codeql.yml`, advanced setup — do not also enable
CodeQL default setup). GitHub secret scanning and Dependabot alerts
are manual repo settings that still need enabling; branch protection
is recommended too (see `ai/phase10/NOTES.md`). No workflow has run
on GitHub yet, so do not claim any of those tools have run until
they have.

## Files

- `scripts/security-scan.mjs` — the scanner (exceptions live here)
- `scripts/lib/security-patterns.mjs` — the shared patterns
- `test/security.test.mjs` — pattern unit tests
- `ai/audits/SECURITY-AUDIT.md` — the triaged findings
- `docs/THREAT-MODEL.md` — what is and is not defended against
