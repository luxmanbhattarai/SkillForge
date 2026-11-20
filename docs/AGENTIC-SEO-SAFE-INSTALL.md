# Agentic SEO — Safe Install & Known Upstream Risks

The `seo` skill is an **upstream import** (vendor: agentic-seo) that
SkillForge vendors verbatim: its files are never edited here, even
when they contain security issues. This page documents the two open
upstream findings that affect installation and use — **S-08** (High)
and **S-09** (Medium) from `ai/audits/SECURITY-AUDIT.md` — and the
safe paths around them.

**Status: neither finding is fixed.** The upstream source still
contains both issues. What this page gives you is a verified install
path that never touches the unsafe upstream flow, plus a safe
standalone path if you install outside SkillForge. The residual risk
is stated honestly at the bottom.

## S-08 — Upstream documents a curl-pipe-to-shell install (High, UNRESOLVED)

### What upstream does

The upstream README (`seo/README.md:109-110`) and `install.sh` usage
text (`seo/install.sh:57-58`) document this install:

```bash
curl -fsSL https://raw.githubusercontent.com/Bhanunamikaze/Agentic-SEO-Skill/main/install.sh | \
  bash -s -- --target codex
```

Verified 2026-11-20 against the vendored copy (pinned commit
`67775741ce88e0a474513ac53d6f6e4558ff1a3b`):

- **Remote code executes without verification.** The downloaded
  script is piped straight into `bash`. There is no checksum, no
  signature, and no content check of any kind — before or during
  execution.
- **Not pinned to a trusted version.** The script is fetched from the
  `main` branch — a moving target. Whoever controls the branch
  controls what the next install runs. The README's clone-based
  install is unpinned the same way (`git clone` of `main`, then
  `bash install.sh` with no checkout step).
- **The installer itself clones unpinned.** When `install.sh` runs in
  remote mode it does `git clone --depth 1` of `$REPO_URL`
  (`install.sh:220-230`) — again `main`, again no commit pin and no
  verification.

**Never run the upstream curl-pipe command.** It directly conflicts
with this repository's security guidance, and no SkillForge doc
recommends it.

### Safe path 1 (recommended): install from the vendored copy

SkillForge's own installer installs the `seo` skill from the copy
already in this repository — no network fetch, no remote code
execution:

```bash
node scripts/install-skills.mjs --target claude-code --scope project --skills seo
```

(Other targets: `--target cursor`, `--target codex`,
`--target antigravity`; see `docs/INSTALLATION.md`.)

The vendored copy is pinned to commit
`67775741ce88e0a474513ac53d6f6e4558ff1a3b`, verified against the
public GitHub API, and byte-identical to that commit in the author's
repository (`Bhanunamikaze/Agentic-SEO-Skill`) — verified
2026-11-20 by downloading the pinned `install.sh` and `README.md`
and diffing them against the vendored files (SHA-256 of
`install.sh`:
`05e142bafe21e3f0b5490391a74a125c47a669f8d57bc7cf70ac8584a0cec4b3`).
This is the verified install path.

### Safe path 2: standalone install without SkillForge

If you install outside SkillForge, download first, verify against
the pinned commit, inspect, then run locally — never pipe to a
shell:

```bash
# 1. Download the installer from the PINNED commit, not from main.
curl -fsSL https://raw.githubusercontent.com/Bhanunamikaze/Agentic-SEO-Skill/67775741ce88e0a474513ac53d6f6e4558ff1a3b/install.sh -o install.sh

# 2. Verify it is the reviewed copy (SHA-256 from the vendored file).
#    Expected: 05e142bafe21e3f0b5490391a74a125c47a669f8d57bc7cf70ac8584a0cec4b3
sha256sum install.sh

# 3. Read it before running it. (It is ~280 lines; the risky parts are
#    the rm -rf paths and the unpinned remote clone — see S-12.)
less install.sh

# 4. Run the local file. Prefer --source local with a pinned checkout:
git clone https://github.com/Bhanunamikaze/Agentic-SEO-Skill.git
cd Agentic-SEO-Skill && git checkout 67775741ce88e0a474513ac53d6f6e4558ff1a3b
bash install.sh --target codex --source local
```

Notes:

- The pinned commit above is the one SkillForge vendors and has
  reviewed. A newer commit has not been reviewed here; do not
  substitute `main` or a newer SHA and assume the same review
  applies.
- The installer copies the whole skill directory (including the
  Python scripts with the S-09 issue below). Installing safely does
  not fix S-09.
- `--install-deps` runs unpinned `pip install` commands (finding
  S-07). Prefer installing the dependencies yourself, pinned to the
  versions current when you install, in a virtual environment
  (e.g. `python3 -m pip install 'requests==<current>'
  'beautifulsoup4==<current>'` — check the current releases on PyPI
  first rather than copying a version from a doc).

## S-09 — `broken_links.py` disables TLS verification (Medium, UNRESOLVED)

`seo/scripts/broken_links.py` passes `verify=False` on both its
per-link requests — the HEAD request (line 71) and the GET fallback
for servers that reject HEAD (line 76) — silently, with no warning
to the user.

### What this means in practice

- A link check against a host with an expired, self-signed, or
  otherwise invalid certificate proceeds without any warning, and
  the link is reported healthy if the server answers.
- A network attacker able to intercept a check (e.g. on an untrusted
  network) could serve a forged response and make a broken or
  hijacked link look healthy. The data at stake is public link
  statuses, so the blast radius is bounded — but a "healthy" verdict
  from this script is not evidence the real host answered.
- The inconsistency points to an oversight, not a deliberate choice:
  the same script's initial page fetch (`check_broken_links`, line
  131) keeps verification **on**, and the sibling script
  `fetch_page.py` keeps verification on and handles `SSLError`
  explicitly. Only the per-link checks in `broken_links.py` disable
  it.

### Local mitigation (what SkillForge can do)

A patched copy would diverge from upstream, which the verbatim-import
policy forbids — so the mitigation is documentation plus a warning,
not a code fix:

1. **This document** — the warning above.
2. **A doctor warning** when the `seo` skill is installed (planned;
   see the specification in the Stage B report — the installer warns
   at install time that `broken_links.py` disables TLS verification).
3. **Upstream follow-up** — raise the issue upstream at the next
   update cycle; the fix is a one-line change (`verify=False` →
   default verification, matching `fetch_page.py`).

### What you can do as a user

- Treat `broken_links.py` results for external links as advisory,
  not as proof of a healthy certificate chain. If a link matters,
  re-check it with a verifying client (`curl`, a browser, or
  `fetch_page.py`).
- If you need verified link checks, run your own copy of the script
  with verification enabled — that is your copy to maintain, and it
  will diverge from upstream on the next re-import.

## Residual risk (stated plainly)

- **S-08 stays open.** The upstream README and `install.sh` still
  document the curl-pipe install. Anyone who finds the upstream
  repository directly — rather than through SkillForge — may follow
  it. SkillForge cannot change the upstream docs; it can only offer
  the safe paths above and warn at install time.
- **S-09 stays open.** The vendored `broken_links.py` still disables
  TLS verification. Every install of the `seo` skill carries the
  flawed script until upstream fixes it or the skill is re-imported
  from a fixed upstream commit.
- **The import source is dormant** (finding S-14): SkillForge pins
  the fork `pwg-projects/agentic-seo-skill` (last push 2026-03-03),
  while the author's repository is active and 50 commits ahead of
  the pin. The next re-import must re-verify the source and re-point
  to the author's repository if confirmed as the live upstream; see
  `docs/SECURITY-SCANNING.md` (supply-chain monitoring) and
  `sources/imported-skills.md`.

## Related

- `ai/audits/SECURITY-AUDIT.md` — findings S-07, S-08, S-09, S-12,
  S-13, S-14 (full evidence and decisions)
- `docs/SECURITY-SCANNING.md` — the scanner, its exceptions, and
  supply-chain monitoring
- `docs/THREAT-MODEL.md` — threat 3 (malicious or vulnerable
  imported code) and threat 5 (supply-chain compromise)
- `sources/imported-skills.md` — the pinned commit for every
  upstream import
