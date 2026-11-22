# Security Risk Acceptance — Finding S-08 (Agentic SEO curl-pipe install)

- **Finding:** S-08 (High) — unsafe curl-pipe-to-shell install
  instructions in the Agentic SEO upstream skill.
  Original finding: `ai/audits/SECURITY-AUDIT.md` (S-08);
  re-verified in `ai/audits/SECURITY-AUDIT-UPDATED.md`
  (Phase G, Phase 3 addendum) and in this document's mission
  (production-hardening, Group A Phase 3, 2026-11-22).
- **Status: MITIGATED — AWAITING OWNER DECISION. No owner
  acceptance has been recorded.** Nothing in this document is
  an approval. The recommended decision in §7 awaits the
  owner's explicit word; until then the finding stays open.
- **Related findings:** S-09 (Medium, `broken_links.py`
  disables TLS verification — same skill, same doc),
  S-14 (Medium, import source is a dormant fork, 50 commits
  behind live upstream). Dropping the skill would close all
  three.

## 1. The finding (original vulnerability)

The `seo` skill is an upstream import (vendor: agentic-seo),
vendored verbatim into `skills/upstream/agentic-seo/` and never
edited here. Its own documentation tells users to install it by
piping a remote script straight into a shell. Occurrences
(re-verified 2026-11-22 against `main` @ `b86b469` — the text
is unchanged since the original finding):

| Location | Content |
| --- | --- |
| `seo/README.md:109-110` | The curl-pipe install command (download `install.sh` from the author's `main` branch and pipe it to `bash -s -- --target codex`) — quoted in full in `docs/AGENTIC-SEO-SAFE-INSTALL.md`, which carries the scanner exception for the quote |
| `seo/install.sh:57-58` | The same command, in the script's own usage text ("Pipe install from GitHub") |

The pinned import is commit
`67775741ce88e0a474513ac53d6f6e4558ff1a3b` of the fork
`pwg-projects/agentic-seo-skill`
(`sources/imported-skills.md`); the live upstream is
`Bhanunamikaze/Agentic-SEO-Skill`. The command fetches from
the upstream author's `main` branch — not from the pinned
commit SkillForge vendors.

What makes it unsafe (all three verified against the vendored
copy):

1. **Remote code executes without verification.** The
   downloaded script is piped straight into `bash`: no
   checksum, no signature, no content check of any kind,
   before or during execution.
2. **Not pinned to a trusted version.** `main` is a moving
   target. Whoever controls the branch controls what the next
   install runs.
3. **The installer itself clones unpinned.** When `install.sh`
   runs in remote mode it does `git clone --depth 1` of
   `$REPO_URL` (`install.sh:221`) — again `main`, again no
   commit pin and no verification. The script also performs
   `rm -rf` cleanup of temp directories and copies files into
   the user's agent directories.

Origin: **upstream, not local.** No SkillForge-authored file
documents, recommends, or performs this install. The text
ships verbatim because the verbatim-import policy forbids
editing upstream files, even to fix them.

## 2. Attack scenario

An attacker who can change what the upstream `main` branch
serves — by compromising the author's GitHub account, by
compromising a maintainer's token, or by a supply-chain attack
on the repository — replaces `install.sh` with a malicious
script. The next user who follows the upstream README's
install instructions downloads and executes it immediately,
with that user's privileges, with no opportunity to inspect it
(the pipe executes as it downloads). The malicious script runs
before the user sees anything wrong; a plausible installer
that also exfiltrates credentials or installs a persistent
payload would look like a successful install.

A second, lower-skill path needs no compromise at all: a user
who finds the upstream repository directly (rather than
through SkillForge) follows the documented install and runs
whatever `main` currently serves — including any defect or
malicious change that has landed since SkillForge's pinned
review.

What the attacker gains is bounded by the installing user's
privileges (no privilege escalation is involved), but on a
developer's machine that typically includes SSH keys,
cloud credentials, and source code. Blast radius: one user
per install; the attack scales with the number of users who
follow the upstream instructions.

SkillForge's own install path is **not** in this scenario:
see §3.

## 3. Existing mitigation (verified working)

| # | Mitigation | Verification |
| --- | --- | --- |
| 1 | **SkillForge installs from the vendored copy only.** The installer copies the pinned, reviewed files from this repository; it never fetches from the network and never executes the upstream script. | `scripts/install/` contains no child-process execution of upstream scripts; `install.sh` is non-executable in the repo (`-rw-rw----`, verified 2026-11-22). The vendored copy was verified byte-identical to the pinned commit (SHA-256 of `install.sh` recorded in `docs/AGENTIC-SEO-SAFE-INSTALL.md`). |
| 2 | **Mandatory installer warnings (S-08 + S-09)** on every path that leaves the `seo` skill installed: normal install, update, dry-run install, dry-run update, already-installed re-run, and doctor. Once per run, on stderr (stdout for doctor), naming the finding and pointing at the safe-install guide. | `scripts/install/commands.mjs` (`AGENTIC_SEO_WARNINGS`, `isAgenticSeoSource`); regression tests in `test/installer.test.mjs` (S-08/S-09 block) — install, re-run, dry-run, update dry-run, doctor (incl. `--json`). Coverage holes on dry-run and already-installed were found and fixed in `9fdc0d0`. |
| 3 | **No flag suppresses the warnings.** `--force` skips only the overwrite prompt (a backup is still made first); there is no `--quiet` / `--silent` flag. | CLI flag inventory in `scripts/install-skills.mjs` (`BOOL_FLAGS`); regression test `test/installer-warnings.test.mjs` (--force overwrite still warns once). |
| 4 | **Safe-install guide** with the verified alternative: install from the vendored copy, or standalone via download → SHA-256 verify against the pinned commit → inspect → run locally, never piped. | `docs/AGENTIC-SEO-SAFE-INSTALL.md` (Safe paths 1–2). |
| 5 | **Scanner + eval coverage.** The security scanner's CMD-01 pattern flags curl-pipe-to-shell (multi-line form included); the behavioral eval suite refuses curl-pipe requests (`SEC-curl-001`: a "run curl … piped to a shell" install request → must refuse, reason `curl-piped-to-shell`). | `scripts/lib/security-patterns.mjs`; `evals/cases/security-refusal.json`. |
| 6 | **No generated agent instruction authorizes it.** No agent definition or workflow references the upstream install command; the `seo` skill's own `SKILL.md` contains no `curl` reference at all (its only shell reference is a local script, `bash <SKILL_DIR>/scripts/pre_commit_seo_check.sh`, SKILL.md:262 — a local file, not a remote pipe; noted, out of S-08 scope). | Grep over `agents/`, `workflows/`, and `skills/upstream/agentic-seo/seo/SKILL.md`, 2026-11-22. |

## 4. Additional mitigation (this mission, Group A)

A **restore-path warning gap** was found and fixed. Before
the fix, `restore` was the only command that could (re-)install
the `seo` skill without warning: restoring a backup containing
`seo` — on dry-run or for real — printed no S-08/S-09 warning.
The gap is in the same family as the dry-run and
already-installed holes fixed in `9fdc0d0`.

- **Fix:** `scripts/install/commands.mjs` (`runRestore`) now
  emits the warnings once per run on the restore dry-run and
  on the real restore (restored, replaced, and already-matching
  items; a failed restore warns about nothing, matching install
  behavior). Detection uses the backup entry's library
  `source`, falling back to the library record by name for
  recovered (corrupt) backups, which carry no entry.
- **Tests:** `test/installer-warnings.test.mjs` (5 tests:
  restore dry-run warns, restore + re-restore warn, recovered
  corrupt backup warns via the library fallback, non-agentic
  restore warns nothing, `--force` overwrite still warns).
  All 5 pass on the fixed code; the 3 restore tests fail on
  the pre-fix code (verified both ways 2026-11-22).
- **Doc updates:** `docs/AGENTIC-SEO-SAFE-INSTALL.md` carries
  a dated 2026-11-22 verification note; this risk record is
  new.

A related installer-side enforcement landed separately and
shares the pattern (enforce known-bad content at install time
rather than trusting the user to notice): the Finding 3
needs-correction status filter. It does **not** bear on S-08
directly — it filters on verification status, not on install
instructions — but it changes how the `seo` skill (which is
needs-correction) installs: an explicit `--skill seo` is now
refused per item by default (the run exits 1; other requested
skills still install) unless the run passes
`--allow-needs-correction`, and bulk installs skip it with a
warning. The S-08/S-09 warnings still fire whenever `seo` does
install. See "Needs-correction skills" in
`docs/INSTALLATION.md` and `test/installer-status-filter.test.mjs`.

## 5. Residual risk

- **For SkillForge-mediated installs: LOW.** The installer
  never executes the upstream script, installs only the pinned
  vendored copy, and warns on every path that leaves the skill
  installed. The remaining exposure is a user who reads the
  installed skill's README and follows its upstream install
  instructions anyway — the warning tells them not to, but a
  warning is not an enforcement.
- **For direct-upstream installs: HIGH (unchanged).** Anyone
  who finds the upstream repository directly and follows its
  README runs unverified remote code. SkillForge cannot change
  the upstream docs; it can only offer the safe paths and warn
  at install time. Upstream follow-up with the author remains
  owed (see §7).
- **The unsafe text still ships in every install of the `seo`
  skill.** The vendored README and `install.sh` carry the
  curl-pipe instructions into the user's agent directories.
  An agent loading the skill could read them; the mitigations
  in §3 items 5–6 (scanner, eval refusal, no authorizing
  instruction) are the defense there, and the eval refusal is
  mock-verified only — no real-model run has ever tested
  whether a real model refuses (see
  `ai/audits/REAL-MODEL-EVALUATION.md`).
- **S-09 and S-14 ride along.** Every install also carries
  `broken_links.py` (TLS verification disabled; FIXED upstream
  at live head, vendored copy still mitigated) and the import
  still trails live upstream by 50 commits.

## 6. Severity

**High — unchanged.** The vulnerability itself (arbitrary
remote-code execution as the installing user, no verification,
unpinned source) is High by any scoring. The mitigation
reduces the *exposure through SkillForge* to Low; it does not
reduce the severity of the upstream finding, which is what
this record scores. Re-scoring it down would require the
upstream text to change or the skill to be dropped.

## 7. Recommended owner decision

Re-affirming the Phase 3 recommendation
(`ai/audits/SECURITY-AUDIT-UPDATED.md`, Phase 3 addendum):

> **Keep the `seo` skill with mandatory warnings + the
> safe-install guide**, and record that disposition as the
> production acceptance for S-08 — **or drop the `seo` skill**,
> which closes S-08, S-09, and S-14 outright.

Either way, the upstream follow-up with the author remains
owed: ask upstream to replace the curl-pipe instructions with
the pinned download → verify → inspect → run flow (the exact
text is in `docs/AGENTIC-SEO-SAFE-INSTALL.md`, Safe path 2),
and to fix `broken_links.py` (one line: re-enable
verification, matching `fetch_page.py`).

**Decision record — to be completed by the owner:**

| Field | Value |
| --- | --- |
| Decision | *(none recorded)* |
| Decided by | *(owner — name/date when given)* |
| Date | *(none recorded)* |
| Rationale | *(owner's words when given)* |

Do not fill this table from any agent's recommendation. An
agent recommendation is not an acceptance.
