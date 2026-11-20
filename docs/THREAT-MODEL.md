# Threat Model

What SkillForge defends against, what it does not, and where the trust
boundaries are. This is a skills library — mostly Markdown, plus
install/validation scripts and imported upstream code — so the threats
are about **content that misleads an agent or a human**, not about a
running service.

## Assets

1. **The skills themselves** — guidance agents follow. A compromised
   skill can make many agents behave badly.
2. **The installer** (`scripts/install-skills.mjs`) — runs on users'
   machines and writes files into their agent configuration.
3. **Imported upstream code** — scripts and installers shipped inside
   upstream skills.
4. **The registry** (`registry/skills.json`) — the machine-readable
   index agents use for discovery. A wrong entry misroutes agents.
5. **Maintainer and contributor credentials** — GitHub access to this
   repository.

## Threats and mitigations

### 1. A real secret committed to the repository

An API key, token, or private key in a skill example, a script, or a
fixture. Anyone cloning the repo gets it; secret-scanning bots harvest
public repos within minutes.

- **Mitigations:** pattern scan (`SEC-*`) on every change + CI;
  placeholder-only examples in original skills; byte-level scan over
  binaries; quality scorer caps any skill with a secret-pattern hit.
- **Residual risk:** the placeholder guard can miss a real credential
  containing a placeholder word; encoded or split secrets are not
  detected. GitHub secret scanning (recommended for Phase 10 CI)
  would add a second, independent detector.

### 2. Prompt injection via skill content

A skill that instructs an agent to ignore its instructions, exfiltrate
secrets, or run destructive commands — whether planted maliciously or
copied in from a compromised upstream.

- **Mitigations:** injection patterns (`INJ-*`) in the scanner and the
  scorer; behavioral evals test refusal of injection, exfiltration,
  and destructive requests; upstream skills are treated as untrusted
  input until reviewed (AGENTS.md); upstream imports are pinned to a
  verified commit and reviewed at import.
- **Residual risk:** patterns match known phrases only. A novel
  injection phrasing, an injection in a non-English language, or an
  indirect injection (via a file the skill tells the agent to fetch)
  is not detected. The eval mock agent tests the library's guidance,
  not a real model's behavior.

### 3. Malicious or vulnerable imported code

An upstream skill ships a script that exfiltrates data, runs arbitrary
commands, or disables security controls — or a vulnerability in an
imported script (e.g. unsanitized input to a shell).

- **Mitigations:** imported executable code is read at import and
  re-verified by grep + the scanner (see the audit report); the
  scanner flags `eval`, shell execution, deserialization, and TLS
  bypasses; AGENTS.md forbids executing an imported script without
  reading it first.
- **Residual risk:** review is manual and point-in-time. Upstream
  updates are not monitored continuously, and the verbatim-import
  policy means a vulnerability found upstream can only be fixed
  upstream. Known accepted upstream risks are listed in
  `ai/audits/SECURITY-AUDIT.md` (S-08, S-09, S-10, S-11).

### 4. A skill teaching an insecure practice

A skill that recommends a deprecated crypto algorithm, string-built
SQL, `innerHTML` with user data, or disabled TLS verification. The
agent follows the guidance and ships the vulnerability.

- **Mitigations:** code-vulnerability patterns (`CODE-*`) flag the
  shapes in skills; counter-examples must be labeled; the Phase 3
  accuracy audit checked security guidance against official docs.
- **Residual risk:** the scanner cannot judge context — a flagged
  shape may be a counter-example, and an unflagged paragraph may still
  teach something subtly wrong. Human review of security skills is the
  real control.

### 5. Supply-chain compromise of an upstream source

An upstream repository is taken over, a recorded commit is replaced,
or a license changes under an import.

- **Mitigations:** imports pin exact commits, verified against the
  public GitHub API (2026-11-20); licenses recorded per vendor in
  `sources/licenses.md`; the repository has zero runtime dependencies,
  so there is no dependency tree to poison.
- **Residual risk:** verification is point-in-time. A force-push
  rewriting the pinned commit, or a future import from a moved repo,
  would not be caught until the next verification cycle. The
  agentic-seo import source is dormant while the author's personal
  repo stays active (audit finding S-14) — the next update must
  re-verify the source before re-importing.

### 6. Installer misuse or compromise

The installer writes into agent configuration directories. A bug could
overwrite user files; a compromised installer could write anywhere.

- **Mitigations:** the Phase 2 installer rewrite added conflict
  detection by hash, backups before replacement, atomic installs with
  rollback, dry-run, and manifest tracking (62 tests). It only writes
  inside the target skills directory for the chosen target.
- **Residual risk:** the installer runs with the user's privileges and
  is trusted code. There is no signature verification of the
  repository itself; users should clone from the official GitHub URL.

## Explicitly out of scope

- Vulnerabilities in the software a skill describes (report upstream).
- The security of AI models, agent harnesses, or tools that consume
  these skills.
- Runtime protection of applications built by following a skill.
- Availability of this repository (GitHub's responsibility).

## Trust boundaries

- **Original skills** — trusted after review; owned by this repo.
- **Upstream skills** — untrusted until reviewed; pinned, verified,
  never edited in place.
- **User input to the installer** — skill names are validated against
  the registry; paths are resolved inside the target directory.
- **Eval fixtures** — injection strings by design; never executed,
  only matched against.
