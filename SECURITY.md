# Security Policy

## Reporting a vulnerability

If you find a security issue in SkillForge, please report it privately
so it can be fixed before it is disclosed publicly.

- **Preferred:** open a private security advisory on GitHub at
  https://github.com/luxmanbhattarai/SkillForge/security/advisories/new
- **Alternative:** open a GitHub issue at
  https://github.com/luxmanbhattarai/SkillForge/issues — but do **not**
  include exploit details, credentials, or sensitive data in a public
  issue. Describe the issue in general terms and ask a maintainer for a
  private channel.

Please include:

- What the issue is and where it is (file and, if relevant, line).
- Why it is a security problem (impact).
- Steps to reproduce, if you have them.
- Any suggested fix, if you have one.

You will receive an acknowledgement, and the issue will be triaged and
fixed as soon as reasonably possible. Please do not disclose the issue
publicly until a fix is available.

## Scope

This policy covers the SkillForge repository itself:

- Original skills, agents, workflows, documentation, and scripts in
  this repository.
- The validation and install scripts under `scripts/`.
- CI workflows under `.github/workflows/`.

It does **not** cover:

- Vulnerabilities in the software a skill describes (for example, a
  vulnerability in a framework or tool). Report those to the relevant
  upstream project.
- Vulnerabilities in imported upstream skills. Report those to the
  upstream repository listed in the vendor's `ATTRIBUTION.md` (and let
  us know, so the import can be updated once fixed upstream).
- Third-party services, accounts, or infrastructure you use alongside
  this library.

## What this repository does

Security here is layered; no single check is the whole story. See
`docs/SECURITY-SCANNING.md` for the scanner and
`docs/THREAT-MODEL.md` for what is and is not defended against.

- **Pattern scan** (`npm run check:security`, also in CI on every push,
  pull request, and weekly): 29 patterns over every text file plus a
  byte-level secret scan over binary files — secrets (keys, tokens,
  JWTs, connection strings), prompt-injection markers, dangerous
  commands (including multi-line curl-pipe), and code-vulnerability
  shapes (SQLi, XSS, command injection, insecure deserialization,
  weak crypto, disabled TLS). Findings are triaged, not auto-fixed:
  intentional examples live in a documented exceptions list, and every
  exception needs a reason.
- **Shared pattern library** (`scripts/lib/security-patterns.mjs`): one
  source of truth for the scanner, the quality scorer, and the eval
  mock agent, covered by 22 unit tests (`test/security.test.mjs`).
- **Behavioral evals** (`npm run evals`): refusal cases test that the
  library's guidance leads an agent to refuse injection, exfiltration,
  and destructive-command requests — and that legitimate security
  questions are still answered.
- **Supply-chain verification:** every upstream import records its
  source repository, commit, and license in `sources/`, and the
  commits and licenses were re-verified against the public GitHub API
  on 2026-11-20 (see `ai/audits/SECURITY-AUDIT.md`). Drift against
  the pinned commits is monitored weekly by CI
  (`npm run check:upstream`).
- **CI scanning:** CodeQL runs via a workflow
  (`.github/workflows/codeql.yml`, advanced setup) and has run on
  GitHub (PR #1 and draft PR #4, 2026-11-21; 0 open alerts — the
  5 alerts found, all in upstream code, were triaged and dismissed,
  see `ai/audits/SECURITY-STATUS.md`). Semgrep SAST also runs in
  CI (`p/javascript`, 0 findings). GitHub secret scanning (with
  push protection) and Dependabot security updates are enabled;
  branch protection is not yet enabled (user decision). 4 of 6
  workflows have run on GitHub; see `ai/phase10/NOTES.md` for the
  current state.
- **Manual review:** imported executable code (scripts, installers) is
  read before it is trusted; the audit report records what was
  reviewed, what was found, and what remains an accepted upstream risk.
- Upstream skills are treated as untrusted input until reviewed; see
  `AGENTS.md`.
- Examples in original skills use secret-manager placeholders, never
  real secrets.

## Supported versions

Only the latest release (and `main` between releases) receives security
fixes. Older snapshots are not patched; upgrade to the latest release.

## What we will not do

- We will not ask you for credentials, tokens, or private keys as part
  of a report. Do not send them.
- We will not silently fix a vulnerability in an imported upstream
  skill by editing it here: upstream stays verbatim, so the fix goes
  upstream and the import is updated afterwards.

## No security guarantees

SkillForge is provided as-is under the MIT license. The maintainers make
no guarantee that the library is free of vulnerabilities, that skills
are secure for every use case, or that reported issues will be fixed
within any particular timeframe. Review any skill — especially imported
upstream skills and any script they contain — before running it in your
environment, and never execute an imported script without reading it
first.
