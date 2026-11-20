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

- The repository runs an automated credential and prompt-injection scan
  (`npm run check:security`) on every push, pull request, and weekly
  via CI.
- Upstream skills are treated as untrusted input until reviewed; see
  `AGENTS.md`.
- Examples in original skills use secret-manager placeholders, never
  real secrets.

## No security guarantees

SkillForge is provided as-is under the MIT license. The maintainers make
no guarantee that the library is free of vulnerabilities, that skills
are secure for every use case, or that reported issues will be fixed
within any particular timeframe. Review any skill — especially imported
upstream skills and any script they contain — before running it in your
environment, and never execute an imported script without reading it
first.
