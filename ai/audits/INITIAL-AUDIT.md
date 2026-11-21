# Initial Repository Audit — SkillForge v1.0.0

- **Audit date:** 2026-11-20
- **Scope:** `feat/skillforge-production-upgrade` @ 2601b23 (base: `main` @ bc304a2, v1.0.0)
- **Auditor:** Wave 1 coordinator (Phases 1–3)
- **Method:** full revalidation from scratch. Every check below was re-run or
  re-read for this audit; the v1.0.0 `AUDIT-REPORT.md` was treated as a claim
  to verify, not as evidence. Baseline outputs are recorded in
  `ai/test-results/phase1-baseline-validations.txt` and
  `ai/test-results/phase1-inventory.txt`.

## Baseline revalidation (all re-run 2026-11-20)

| Check | Command | Result |
| --- | --- | --- |
| Skill validation | `npm run validate` | PASS with 11 warnings (all upstream-only; same 11 as v1.0.0) |
| Frontmatter | `npm run check:frontmatter` | PASS (226 skills) |
| Links (offline) | `npm run check:links` | PASS (14 internal links; 311 unique external URLs listed) |
| Links (online) | `node scripts/check-links.mjs --online` | PASS — 311 unique external URLs verified, 47 skipped (example domains / documented exceptions), 0 errors (6m55s run) |
| Sources/provenance | `npm run check:sources` | PASS with 0 warnings (226 skills, 7 sources) |
| Duplicates | `npm run check:duplicates` | PASS (threshold 0.8) |
| Security scan | `npm run check:security` | PASS: no findings |
| Coverage report | `npm run report` | 177/177 planned original skills (100%), 226 total |
| Registry regeneration | `npm run registry` | No diff (same-day regeneration is deterministic) |

Inventory confirmed: 845 tracked files on this branch (844 on `main` +
ai/ scaffold), 177 original skills, 49 upstream skills (6 vendors),
20 agents, 9 workflows, 48,212 total lines of `SKILL.md` (avg ~213/skill).
Zero npm dependencies; `engines: node >= 18`; no lockfile (correctly —
there is nothing to lock). All scripts ran clean on Node v24.22.1.

## Strengths (verified, not just claimed)

- Structural validation is strong: frontmatter rules, 15 required sections
  on original skills, duplicate-name detection, registry↔disk consistency,
  relative-link resolution, and placeholder detection all run and pass.
- Documentation is unusually honest: `docs/AGENT-COMPATIBILITY.md`
  explicitly refuses to document vendor behavior it has not verified, and
  the security scanner labels itself a smoke screen.
- Attribution and licensing are thorough: per-vendor `ATTRIBUTION.md`
  (all 6 present), `sources/licenses.md` with per-vendor evidence,
  Apache-2.0 `LICENSE.txt` files preserved in Anthropic skills.
- Zero-dependency tooling keeps the supply-chain surface minimal.
- A real security policy exists (`SECURITY.md`) with a private-reporting
  route and a clear scope statement.

## Finding counts

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 5 |
| Medium | 10 |
| Low | 12 |
| **Total** | **27** |

---

## High findings

### H-01 — Installer silently deletes existing skill directories

- **Severity:** High
- **Affected:** `scripts/install-skills.mjs`
- **Description:** Installing over an existing skill directory deletes it
  first with no backup, no comparison, no confirmation, and no warning.
  Any user modification to an installed skill is destroyed silently.
- **Evidence:** `install-skills.mjs`:
  `if (existsSync(dst)) await rm(dst, { recursive: true, force: true });`
  `docs/INSTALLATION.md` documents this as normal ("It overwrites the
  installed skills with the current versions").
- **Recommended solution:** Implement conflict detection, existing-file
  comparison, backup-before-replacement, and overwrite confirmation;
  make destructive replacement opt-in via `--force` only.
- **Implementation status:** Fixed in Phase 2 (2026-11-20). The
  installer now detects conflicts by hash comparison, refuses to
  overwrite user modifications without `--force`/`--backup`, backs up
  before every replacement, and installs via atomic rename with
  rollback. Verified by 62 tests and a coordinator smoke test.

### H-02 — Registry generation is non-deterministic; CI will fail from 2026-11-21

- **Severity:** High
- **Affected:** `scripts/generate-registry.mjs`, `scripts/generate-report.mjs`,
  `.github/workflows/validate-skills.yml`
- **Description:** The registry embeds the wall-clock date
  (`generated: new Date().toISOString().slice(0, 10)`) in
  `registry/skills.json` and `registry/versions.json`. CI regenerates the
  registry and fails on any diff (`git diff --exit-code registry/`).
  The committed date is 2026-11-20, so the first push or PR on any later
  date fails CI even when nothing about the skills changed. Same-day
  regeneration was verified clean (no diff); the cross-date failure
  follows directly from the code.
- **Evidence:** `generate-registry.mjs:116,124`; `validate-skills.yml`
  `run: git diff --exit-code registry/`; committed `generated` value
  `2026-11-20` in both files. `generate-report.mjs:66` has the same
  pattern for `report.json` / `AUDIT-REPORT.md` (not CI-checked, same
  defect class).
- **Recommended solution:** Make generation deterministic — derive
  `generated` from content on disk (e.g. the newest `last_verified`
  across skills) or drop the field. Regenerate and commit. Fix in Wave 1
  (Phase 3 commit) or Phase 9 at the latest; workaround until then is to
  regenerate and commit the registry on the same day as any push.
- **Implementation status:** Fixed in Wave 1 (2026-11-20).
  `generate-registry.mjs` and `generate-report.mjs` now derive
  `generated` from the newest `last_verified` on disk; verified by
  double regeneration with zero diff and grep confirming no
  wall-clock reads remain. See
  `ai/decisions/2026-11-20-registry-determinism.md`.

### H-03 — No test suite exists anywhere in the repository

- **Severity:** High
- **Affected:** repository-wide (no `test/` directory, no test script)
- **Description:** There are zero test files and no `test` script in
  `package.json`. All quality gates are static validators. The installer
  (which writes to user directories), the registry generators, and the
  frontmatter parser have no tests at all, including no failure-path
  tests. There is no behavioral evaluation of any kind.
- **Evidence:** `find . -name "*test*"` returns only skill content about
  testing (`skills/testing/`, `agents/qa-testing-specialist.md`);
  `package.json` scripts list contains no test entry.
- **Recommended solution:** Add a zero-dependency `node:test` suite:
  installer tests first (Phase 2), then generator/validator tests, then
  the behavioral evaluation framework (Phase 6).
- **Implementation status:** Open — Phases 2, 6, 12.

### H-04 — Next.js skill states outdated fetch-caching default

- **Severity:** High
- **Affected:** `skills/frontend/nextjs/SKILL.md:101-103`
- **Description:** The skill states "`fetch` requests in server
  components are cached unless opted out". Next.js 15 changed the
  default: `fetch` requests are uncached by default unless caching is
  explicitly opted into. The skill's guidance appears to describe the
  Next.js 14 behavior and would mislead agents building on current
  Next.js.
- **Evidence:** Verbatim quote from `skills/frontend/nextjs/SKILL.md`:
  "Caching: understand the default — `fetch` requests in server
  components are cached unless opted out; use `revalidatePath` or
  `revalidateTag` after mutations…". (Flagged in the mission brief as a
  known item to verify; this audit confirms the claim is present as
  stated.)
- **Recommended solution:** Verify against current official Next.js
  documentation in Phase 3 and correct the skill, including the
  version boundary (14 vs 15+) and the correct opt-in mechanism.
- **Implementation status:** Fixed in Phase 3 (2026-11-20). `skills/frontend/nextjs/SKILL.md` now states fetch is NOT cached by default since Next.js 15, with the 14-vs-15 boundary, the opt-ins (`force-cache`, `next: { revalidate }`, `fetchCache`), and a Common Mistakes entry. Verified against current official Next.js docs. See ai/audits/TECHNICAL-ACCURACY-AUDIT.md.

### H-05 — Agents and workflows have no validation at all

- **Severity:** High
- **Affected:** `agents/` (20 files), `workflows/` (9 files), `scripts/`
- **Description:** No script reads `agents/` or `workflows/`. There is
  no check for file structure, frontmatter, or whether the skills an
  agent or workflow names actually exist. A workflow can reference a
  nonexistent skill and nothing fails.
- **Evidence:** `grep -l "agents|workflows" scripts/*.mjs` returns no
  matches. A manual cross-check of backticked references found 5
  shorthand names that match no skill (see M-07).
- **Recommended solution:** Add a validator for agents/workflows
  (structure + skill-reference resolution) and run it in CI.
- **Implementation status:** Open — Phases 8/9.

---

## Medium findings

### M-01 — Registry marks every skill `status: "verified"` without evidence

- **Severity:** Medium
- **Affected:** `scripts/generate-registry.mjs`, `registry/skills.json`
- **Description:** The generator hardcodes `status: 'verified'` for all
  226 skills, including the 49 upstream skills imported verbatim and
  never technically reviewed. Consumers of the registry cannot
  distinguish reviewed skills from unreviewed imports.
- **Evidence:** `generate-registry.mjs`: `status: 'verified'` (literal,
  unconditional).
- **Recommended solution:** Derive status from real verification state
  (Phase 3 audit outcomes); upstream imports should carry a distinct
  status until reviewed.
- **Implementation status:** Partially resolved in Phase 3 (2026-11-20). The Phase 3 audit now provides real per-skill verification state (204 Verified, 16 with limitations, 6 Needs correction — see ai/audits/TECHNICAL-ACCURACY-AUDIT.md), so the evidence M-01 lacked now exists. The registry still hardcodes `status: "verified"`; deriving registry status from the audit outcomes is deferred to Phase 9.

### M-02 — Security scanner is regex-only (7 patterns)

- **Severity:** Medium
- **Affected:** `scripts/security-scan.mjs`
- **Description:** The only automated security control is a line-regex
  scan for private keys, a few token prefixes, hardcoded-credential
  shapes, curl-piped-to-shell, destructive `rm -rf`, and two
  prompt-injection phrases. It misses AWS key IDs, JWTs, connection
  strings, most secret formats, and all code-level vulnerability
  classes (SQLi, XSS, command injection, path traversal). It does not
  scan binary files. It honestly calls itself a smoke screen.
- **Evidence:** `security-scan.mjs` `PATTERNS` (7 entries); scan covers
  `.md/.mjs/.js/.sh/.py/.json/.yml/.yaml` only.
- **Recommended solution:** Keep as one layer; add GitHub secret
  scanning / CodeQL / Semgrep where available and document what each
  layer does and does not cover (Phase 7). Do not claim a tool ran if
  it was unavailable.
- **Implementation status:** Open — Phase 7.

### M-03 — CI does not run all available checks

- **Severity:** Medium
- **Affected:** `.github/workflows/`
- **Description:** `check:duplicates` and `check:sources` exist but run
  in no workflow. There is no scheduled link verification and no
  upstream-update monitoring; the only scheduled job is the weekly
  security audit.
- **Evidence:** `validate-skills.yml` runs `validate` + `registry` +
  diff; `lint.yml` runs frontmatter + links (offline) + whitespace;
  `security-audit.yml` runs `check:security`. No workflow invokes
  `check:duplicates` or `check:sources`.
- **Recommended solution:** Add the missing checks to CI and add
  scheduled jobs for link verification and stale-verification detection
  (Phase 10).
- **Implementation status:** Open — Phase 10.

### M-04 — CI actions unpinned; no least-privilege permissions

- **Severity:** Medium
- **Affected:** `.github/workflows/*.yml`
- **Description:** Workflows use floating major tags
  (`actions/checkout@v4`, `actions/setup-node@v4`) rather than pinned
  SHAs, and declare no `permissions:` blocks, so jobs run with default
  token permissions.
- **Evidence:** `grep uses: .github/workflows/*.yml`; no `permissions:`
  key in any workflow file.
- **Recommended solution:** Pin third-party actions to reviewed SHAs
  and add least-privilege `permissions:` per workflow (Phase 10).
- **Implementation status:** Open — Phase 10.

### M-05 — Installer lacks all safety and lifecycle features

- **Severity:** Medium
- **Affected:** `scripts/install-skills.mjs`, `docs/INSTALLATION.md`
- **Description:** Beyond the destructive default (H-01), the installer
  has no dry-run, force flag, backup/restore, update, uninstall, list,
  doctor, or verify command; no category, agent, or workflow install;
  no interactive mode; no partial-failure handling or rollback; no
  installed-skills manifest (so update/uninstall cannot be reliable).
  It is a single copy-or-symlink loop.
- **Evidence:** `install-skills.mjs` (69 lines; one code path) and the
  options list in `docs/INSTALLATION.md`.
- **Recommended solution:** Overhaul per the Phase 2 specification.
- **Implementation status:** Fixed in Phase 2 (2026-11-20). Full CLI
  implemented: install (all/category/skill/agent/workflow), update,
  list, doctor, validate, uninstall, restore, dry-run, force, backup,
  manifest, idempotency, atomic installs. See `docs/INSTALLATION.md`.

### M-06 — Install target paths asserted without vendor-doc references

- **Severity:** Medium
- **Affected:** `scripts/install-skills.mjs`, `docs/INSTALLATION.md`,
  `docs/AGENT-COMPATIBILITY.md`
- **Description:** The four target paths (Claude Code, Cursor, Codex,
  Antigravity) are stated as correct "as of 2026-11-20" with no links
  to the vendor documentation they came from. Agent vendors change
  skills paths (Cursor's skills support in particular is newer), so
  these need re-verification against current official docs before the
  installer is presented as production-grade.
- **Evidence:** Installer header comment; `AGENT-COMPATIBILITY.md`
  notes per agent defer to vendor docs without linking them.
- **Recommended solution:** Verify each target path against current
  official agent documentation in Phase 2; record sources and dates.
- **Implementation status:** Fixed in Phase 2 (2026-11-20). All four
  targets verified against current official docs; Codex moved to
  `.agents/skills` and Antigravity to `.agents/skills` /
  `~/.gemini/config/skills` (coordinator independently re-verified
  both moves from the vendor docs). Sources in
  `scripts/install/targets.mjs` and
  `ai/decisions/2026-11-20-installer-target-paths.md`.

### M-07 — Agents/workflows reference skills by names that do not exist

- **Severity:** Medium
- **Affected:** `agents/security-specialist.md`,
  `agents/media-specialist.md`, `workflows/image-generation.md`
- **Description:** A cross-check of every backticked token in `agents/`
  and `workflows/` against the registry found 5 shorthand references
  matching no skill: `ddd` (skill is `domain-driven-design`),
  `security-headers` (skill is `secure-headers`), `sql-injection`
  (skill is `sql-injection-prevention`), `xss` (skill is
  `xss-prevention`), `thumbnails` (skill is `youtube-thumbnails`).
  All other backticked tokens resolve to real skills or are agent
  cross-references (legitimate). Impact is low today (agents resolve
  by reading), but nothing catches this class of error (see H-05).
- **Evidence:** Cross-check script output recorded during this audit
  (registry names vs backticked tokens in `agents/` + `workflows/`).
- **Recommended solution:** Fix the five references to exact skill
  names; add reference validation (H-05).
- **Implementation status:** Open — Phase 8.

### M-08 — 11 upstream-only validator warnings are permanent as-is

- **Severity:** Medium
- **Affected:** `skills/upstream/` (marketingskills, superpowers,
  anthropic, agentic-seo)
- **Description:** Validation passes with 11 warnings, all upstream:
  2 "placeholder text" prose hits, 1 file at 501 lines
  (`marketingskills/ai-seo`), 7 broken relative links to
  `marketingskills/tools/` (not imported), 1 "TBD" in superpowers
  `writing-plans`. Upstream files are never edited, so these warnings
  cannot be fixed in place; they will recur on every run unless the
  imports are expanded or the warnings are formally triaged.
- **Evidence:** `npm run validate` output, re-run for this audit.
- **Recommended solution:** Formally triage: either expand the
  marketingskills import to include `tools/` (Phase 4/7 decision) or
  record the warnings as accepted with reasons. Do not silence them
  without a decision record.
- **Implementation status:** Triaged in Phase 3 (2026-11-20) — partially resolved. The 11 warnings: 3 false positives (legitimate prose), 1 borderline (ai-seo 500 vs 501 lines, trailing-newline count), 6 genuine (link-building `tools/` links — the marketingskills `tools/` directory was not imported), 1 trivial (site-architecture illustrative anchor). The 6 genuine warnings disappear only if `tools/` is imported (Phase 4/7 decision). See ai/audits/TECHNICAL-ACCURACY-AUDIT.md §M-08 triage outcome.

### M-09 — `npx skills add` install path is advertised but untested

- **Severity:** Medium
- **Affected:** `README.md`, `docs/INSTALLATION.md`
- **Description:** Both docs offer `npx skills add
  luxmanbhattarai/SkillForge` as an install option. The `skills` CLI
  exists (vercel-labs/skills), but nobody has verified that it works
  against this repository's layout, and there is no test or record of
  a successful run.
- **Evidence:** README "Option 2 — Skills CLI"; no test or verification
  record in the repo.
- **Recommended solution:** Verify in a sandbox in Phase 2 (without
  touching real agent directories); keep the docs only if it works,
  otherwise remove the claim.
- **Implementation status:** Fixed in Phase 2 (2026-11-20). Verified
  in a sandbox: `npx skills add` discovers all 226 skills and installs
  with byte-identical content; documented honestly (bare command is
  interactive). See
  `ai/decisions/2026-11-20-npx-skills-verification.md`.

### M-10 — No registries for agents/workflows; no registry schema validation

- **Severity:** Medium
- **Affected:** `registry/`, `scripts/generate-registry.mjs`
- **Description:** Only skills are indexed (`skills.json`,
  `categories.json`, `sources.json`, `compatibility.json`,
  `versions.json`). Agents and workflows have no machine-readable
  index, no schema validation exists for any registry file, and the
  registry carries no dependency/relationship metadata between skills.
- **Evidence:** `ls registry/`; generator writes skills only.
- **Recommended solution:** Add `agents.json` / `workflows.json`,
  JSON Schema validation, and relationship metadata (Phase 9).
- **Implementation status:** Open — Phase 9.

---

## Low findings

### L-01 — Validator line count is off by one

- **Severity:** Low
- **Affected:** `scripts/validate-skills.mjs`
- **Description:** `text.split('\n').length` counts a trailing newline
  as an extra line, so a 500-line file reports as 501 lines.
  `marketingskills/ai-seo` is 500 lines by `wc -l` but flagged as 501.
- **Evidence:** Validator output vs `wc -l skills/upstream/marketingskills/ai-seo/SKILL.md` (500).
- **Recommended solution:** Count lines as `text.split('\n').length`
  minus 1 when the file ends with `\n`, or trim before splitting.
- **Implementation status:** Open — Phase 5/12.

### L-02 — Two upstream skills are 14-line pointer stubs

- **Severity:** Low
- **Affected:** `skills/upstream/prisma/prisma-database-setup/SKILL.md`,
  `skills/upstream/prisma/prisma-postgres/SKILL.md`
- **Description:** These are the shortest skills in the library (14
  lines each); they point at scripts rather than carrying guidance.
  Correct verbatim imports, but thin value.
- **Evidence:** `wc -l` size ranking.
- **Recommended solution:** None required; note for import triage.
- **Implementation status:** Open — informational.

### L-03 — Progressive disclosure is specified but unused by original skills

- **Severity:** Low
- **Affected:** `skills/*/` (original skills)
- **Description:** The standards define `references/`, `examples/`,
  `scripts/`, and `assets/` subdirectories for on-demand loading, but
  no original skill uses any of them — all content is inline in
  `SKILL.md` (48,212 lines total). The design intent (small core file,
  details on demand) is not realized.
- **Evidence:** Directory scan: every original skill lacks all four
  subdirectories.
- **Recommended solution:** Consider in Phase 5 quality standards;
  extract reference material for the longest skills where it improves
  load cost. Do not churn files for its own sake.
- **Implementation status:** Open — Phase 5.

### L-04 — Research snapshot contains a parse error and has no update process

- **Severity:** Low
- **Affected:** `research/repo-inventory.txt`
- **Description:** The inventory snapshot lists `prisma/skills` as
  `PARSE ERROR` and is a point-in-time snapshot (2026-11-20) with no
  documented refresh process.
- **Evidence:** File contents, line for `prisma/skills`.
- **Recommended solution:** Fix or annotate the line; document the
  snapshot's purpose and refresh cadence, or move it under `ai/`.
- **Implementation status:** Open — hygiene.

### L-05 — Hand-rolled YAML frontmatter parser covers a strict subset

- **Severity:** Low
- **Affected:** `scripts/lib/frontmatter.mjs`
- **Description:** The parser supports only top-level scalars, block
  scalars, and one level of nested string maps, failing closed on
  anything else. That is safe, but contributors using standard YAML
  features (quoted strings with colons, deeper nesting, lists) get
  validation errors. The zero-dependency policy motivates the
  hand-rolled parser.
- **Evidence:** Parser header comment ("intentionally strict").
- **Recommended solution:** Document the supported subset in
  `docs/SKILL-STANDARDS.md`, or adopt a YAML dependency if the
  zero-dependency policy is relaxed (Phase 9/11 decision).
- **Implementation status:** Open — Phase 9/11.

### L-06 — Report generator hardcodes the 177-skill target tree

- **Severity:** Low
- **Affected:** `scripts/generate-report.mjs`
- **Description:** The planned-skill tree is hardcoded in the
  generator. Phase 4 additions require generator edits, and the
  generator also date-stamps `report.json` / `AUDIT-REPORT.md`
  (non-deterministic output, though not CI-checked).
- **Evidence:** `generate-report.mjs` TARGET_TREE; `:66` date stamp.
- **Recommended solution:** Externalize the target tree (or derive
  coverage from the registry) and apply the same determinism fix as
  H-02 (Phase 4/9).
- **Implementation status:** Open — Phase 4/9.

### L-07 — Vendor and category tables hardcoded in the registry generator

- **Severity:** Low
- **Affected:** `scripts/generate-registry.mjs`
- **Description:** `KNOWN_SOURCES` and `CATEGORY_DESCRIPTIONS` are
  hardcoded; adding a vendor or category requires editing the
  generator (with an `unknown` fallback for unlisted vendors).
- **Evidence:** Generator source.
- **Recommended solution:** Externalize to data files in Phase 9.
- **Implementation status:** Open — Phase 9.

### L-08 — `.claude/settings.json` is an empty permissions object

- **Severity:** Low
- **Affected:** `.claude/settings.json`
- **Description:** The file contains only `{"permissions":{}}`. Its
  purpose is unclear — it reads as a placeholder with no documented
  effect.
- **Evidence:** File contents.
- **Recommended solution:** Clarify its purpose in docs or remove it
  (Phase 11).
- **Implementation status:** Open — Phase 11.

### L-09 — Category-count wording differs between README and registry

- **Severity:** Low
- **Affected:** `README.md`
- **Description:** README says "177 original skills across 15
  categories" while the registry counts 16 categories (15 original +
  `upstream`). Both are true under different readings; the wording is
  easy to misread.
- **Evidence:** README status line vs `registry/skills.json`
  `categories` (16 entries).
- **Recommended solution:** Align wording in Phase 11.
- **Implementation status:** Open — Phase 11.

### L-10 — Agentic SEO upstream source is low-activity

- **Severity:** Low
- **Affected:** `skills/upstream/agentic-seo/`, `sources/imported-skills.md`
- **Description:** The source repo has 0 stars and last pushed
  2026-03-03. The import was flagged at v1.0.0 time and remains
  low-activity; a dormant upstream means no fixes will arrive from
  that vendor.
- **Evidence:** `research/repo-inventory.txt`; `sources/imported-skills.md`.
- **Recommended solution:** Monitor; consider replacing with an
  original skill if the upstream stays dormant (Phase 7 decision).
- **Implementation status:** Open — Phase 7.

### L-11 — Link-check exception list has no scheduled re-verification

- **Severity:** Low
- **Affected:** `scripts/check-links.mjs`
- **Description:** 47 URLs are skipped via a documented exceptions map
  (bot-gated, login-walled, or unreachable-from-CI hosts). Each entry
  was verified once (2026-11-20); nothing re-verifies them on a
  schedule, so a genuinely dead exception would go unnoticed.
- **Evidence:** `check-links.mjs` EXCEPTIONS list; no scheduled
  workflow runs the online check.
- **Recommended solution:** Add a scheduled online link check
  (Phase 10) that reports on exception entries.
- **Implementation status:** Open — Phase 10.

### L-12 — Runtime version spread is untested

- **Severity:** Low
- **Affected:** `package.json`, `.github/workflows/`
- **Description:** `engines` claims Node >= 18, CI runs Node 20, and
  this audit ran on Node 24 — all scripts passed on 24, but Node 18
  itself was never exercised. The spread is untested at the low end.
- **Evidence:** `package.json` engines; CI `node-version: "20"`;
  audit runtime Node v24.22.1.
- **Recommended solution:** Test the low end in CI (matrix 18/20/22)
  or narrow the engines claim (Phase 10/12).
- **Implementation status:** Open — Phase 10/12.

---

## Areas checked with no findings

- **Licenses:** all 226 skills covered; MIT originals, Apache-2.0
  Anthropic (LICENSE.txt preserved), MIT others with evidence recorded.
- **Attribution:** all 6 vendor `ATTRIBUTION.md` files present.
- **Duplicates:** no duplicate skill names; description-similarity check
  passes at 0.8.
- **Sources/provenance:** all skills resolve to a known source; no
  stale `last_verified` dates (all 2026-11-20).
- **Secrets:** security scan finds none; examples use placeholders.
- **Registry↔disk consistency:** validator confirms the registry
  matches disk exactly.
- **Broken internal links:** offline link check passes (14 internal
  links); upstream-relative-link warnings are the M-08 items.
- **Dependency health:** zero dependencies; nothing to audit, pin, or
  update.

## Online link re-verification (completed 2026-11-20)

`node scripts/check-links.mjs --online`: PASS. 311 unique external URLs
verified, 47 skipped (7 `example.*` placeholder domains + 40 documented
exceptions for bot-gated, login-walled, or environment-unreachable
hosts), 0 errors. Output tail recorded in
`ai/test-results/phase1-linkcheck-online.txt`. This matches the v1.0.0
baseline exactly — no link regressions since release.

## Phase assignment summary

| Phase | Findings |
| --- | --- |
| 2 — Installer | H-01, H-03 (installer tests), M-05, M-06, M-09 |
| 3 — Technical accuracy | H-04, M-01 (status semantics), M-08 (triage) |
| 4 — Expansion | M-08 (import decision), L-06 |
| 5 — Quality standards | L-01, L-03 |
| 6 — Behavioral evaluation | H-03 (framework) |
| 7 — Security | M-02, L-10 |
| 8 — Agents/workflows | H-05, M-07 |
| 9 — Registry/architecture | H-02 (if not fixed in Wave 1), M-10, L-05, L-06, L-07 |
| 10 — CI/CD | M-03, M-04, L-11, L-12 |
| 11 — Documentation | L-08, L-09 |
| 12 — Testing | H-03, L-01, L-12 |
