# Troubleshooting

Common errors and fixes. Installer-specific problems are covered in
detail in [`INSTALLATION.md`](INSTALLATION.md#troubleshooting); this
page covers the rest and points back there where the topics overlap.

## A skill does not appear in my agent

1. Confirm the install: `node scripts/install-skills.mjs list
   --target <target> --scope <scope>`.
2. Confirm health: `node scripts/install-skills.mjs doctor`.
3. Confirm the skill is well-formed:
   `node scripts/install-skills.mjs validate --target <target> --scope <scope>`.
4. Check the directory name matches the skill's frontmatter `name`
   (the Agent Skills spec requires this).
5. Check you installed into the path your agent version reads — see
   [`AGENT-COMPATIBILITY.md`](AGENT-COMPATIBILITY.md). Codex and
   Antigravity paths changed since v1.0.0; `doctor` reports skills
   left in the legacy locations.
6. Restart the agent or reload the project; most agents discover
   skills at startup.

## Installer refuses with "the installed copy was modified after install"

You (or the agent) edited an installed skill. Re-run with `--force`
to overwrite it (a backup is made first), or edit the library copy
and re-install, or leave it alone. See
[`INSTALLATION.md`](INSTALLATION.md#troubleshooting) for the other
installer messages (`manifest is corrupt`, `stale`, `orphan`).

## `npm run validate` fails

- **"missing frontmatter" / "unparseable frontmatter line" /
  "unexpected indented line":** the frontmatter uses a YAML feature
  outside the supported subset (lists, deeper nesting, anchors).
  See [Frontmatter parser subset](SKILL-STANDARDS.md#frontmatter-parser-subset)
  and compare against `templates/SKILL-TEMPLATE.md`.
- **"missing required section":** original skills need all 15
  template sections, in order. Upstream skills are exempt (warnings
  only) because they are never edited.
- **"name does not match directory":** the frontmatter `name` must
  equal the parent directory name, exactly.
- **"duplicate skill name":** names are unique across the whole
  library, original and upstream. Rename the new skill.
- **"registry lists missing skill" / registry mismatch:** the
  registry is stale. Regenerate it with `npm run registry` and
  commit the result. Never hand-edit `registry/`.
- **"SKILL.md is N lines (hard limit 800)":** move reference
  material into `references/` files that load on demand; keep
  `SKILL.md` under 500 lines.
- **Upstream-only warnings:** `validate` reports upstream issues as
  warnings, not errors. `npm run validate:strict` fails on warnings
  too — use it for releases, not for everyday work.

## `npm run check:registry` fails

- **Schema errors:** the committed registry does not match
  `scripts/schemas/`. Regenerate with `npm run registry`; if the
  error persists, the generator and the schema disagree — report it,
  do not hand-edit the registry.
- **"regeneration differs" (CI):** the committed registry is stale.
  Run `npm run registry` locally and commit the regenerated files.
- **Verification-coverage errors:** a skill has no entry in
  `sources/verification-status.json`. New skills start as
  `unverified` — add the entry; never label a skill `verified`
  without an audit.

## `npm run check:links` fails

- **Broken relative link:** the target file moved or the path is
  wrong. Fix the link; check-links strips `#anchors` and checks the
  file path only.
- **Upstream links are excluded by default.** Upstream skills
  legitimately reference files outside the imported subsets; those
  surface as warnings from `npm run validate` instead.
- **Online mode (`--online`)** HEAD-checks every external URL and is
  slow (~5 minutes) and rate-limit prone. Hosts that block automated
  checks are listed as documented exceptions in
  `scripts/check-links.mjs` — add entries only with independent
  evidence, never to silence a real 404.

## `npm run check:security` reports a finding

Read the line in context first: skills legitimately document attacks
and show vulnerable code as counter-examples. If it is real, fix it
(a real secret must be revoked, not just deleted). If it is
intentional, document it via the exceptions list in
`scripts/security-scan.mjs` or a line-level `security-scan:ignore`
marker. Never delete a pattern to silence a finding. Full procedure:
[`SECURITY-SCANNING.md`](SECURITY-SCANNING.md#handling-a-finding).

## `npm run score` caps a skill

- **Capped at 40 / CRITICAL:** a security-scan pattern hit. Fix the
  content (or document a genuine counter-example — see above).
- **Capped at 50:** a required section is missing.
- **Capped at 60:** a placeholder marker (TODO/FIXME/TBD/lorem
  ipsum/coming soon).
- **Low "testing" dimension:** most skills score low here (library
  mean 37/100) — it usually means no test strategy subsection in
  Implementation Standards. See
  [`SKILL-STANDARDS.md`](SKILL-STANDARDS.md#quality-scoring).

## `npm run evals` fails

- **Case validation errors (exit 2):** unknown category, unknown
  skill name, duplicate id, or missing fixture. Fix the case file in
  `evals/cases/`; the runner fails fast before running anything.
- **A case fails:** the mock agent did not select, ground, refuse,
  or generate as the case expects. Read `evals/reports/latest.md`
  for the per-case detail, then decide whether the library is wrong
  (fix the skill) or the case is wrong (fix the case). Do not edit
  the baseline to make a failure pass.
- **Regressions vs baseline:** the runner writes a comparison to
  `evals/regression/latest.json`. Update the baseline only with
  `npm run evals -- --save-baseline` when the new behavior is
  deliberately correct.
- **Model provider errors:** `--provider model` needs
  `EVAL_PROVIDER_URL`, `EVAL_PROVIDER_KEY`, and
  `EVAL_PROVIDER_MODEL`. The default mock provider needs none of
  these and is what CI runs.

## `npm run query -- stale` exits 1

That is the tool working as designed: it exits 1 when any skill has
not been re-verified in the last N days (default 180). Re-verify the
listed skills against official docs per
[`UPDATE-PROCESS.md`](UPDATE-PROCESS.md#re-verifying-original-skills),
or pass a longer window (`--days 365`) to see the picture.

## `npm run check:upstream` reports drift

Drift is informational: the script exits 0 even when upstreams moved.
A vendor being behind its `main` head (Vercel was 4 commits behind
on 2026-11-20) means a re-import is available, not that anything is
broken. Re-import per
[`UPDATE-PROCESS.md`](UPDATE-PROCESS.md#updating-upstream-imports)
when a new upstream commit is worth taking.

## Still stuck

- Run the failing command with the narrowest scope first
  (`--filter` for validate/score, `--cases` for evals).
- Check `ai/phase*/NOTES.md` for the phase that built the tool —
  known limitations are recorded there.
- Open an issue: describe the command, the full error, and the
  Node version (`node --version`). For security issues, report
  privately per [`SECURITY.md`](../SECURITY.md) — never in a
  public issue.
