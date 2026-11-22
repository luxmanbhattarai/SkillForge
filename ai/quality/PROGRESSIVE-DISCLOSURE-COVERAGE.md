# Progressive-Disclosure Coverage

Baseline measurement for Finding 1 of the production-hardening
mission: how much of the library has factored its detail into the
disclosure folders defined in `docs/PROGRESSIVE-DISCLOSURE.md`
(`references/`, `scripts/`, `assets/`, `examples/`).

Measured with `scripts/disclosure-coverage.mjs`
(`npm run disclosure`). Status taxonomy: `single-file` (≤300 lines,
no folders), `needs-disclosure` (>300 lines, no folders),
`disclosed` (folders, ≤300 lines), `disclosed-over-budget`
(folders, >300 lines). A folder counts only when it exists AND is
non-empty. Upstream skills are excluded — their layout is theirs.

## Baseline — 2026-11-22

Generated 2026-11-22 at commit
`b86b4696e518a87edded3f0f55ef0643fd08c3cd` (branch
`feat/production-hardening`), with uncommitted sibling edits in the
worktree at measurement time. The numbers below are the worktree
numbers; the only known difference from HEAD is the maximum
(electron 489 lines in the worktree, 488 at HEAD — one line added
by a sibling edit). All other counts are identical to HEAD.

| Metric | Value |
| --- | --- |
| Original skills measured | 228 |
| Median SKILL.md lines (total) | 247 |
| Median SKILL.md lines (body only) | 231 |
| Longest SKILL.md | 489 (`desktop/electron`) |
| Shortest SKILL.md | 142 |
| Skills with any disclosure folder | **0** |
| `references/` | 0 |
| `scripts/` | 0 |
| `assets/` | 0 |
| `examples/` | 0 |
| Over the 300-line budget | 44 |
| Over 350 lines | 32 |
| Over 400 lines | 9 |
| Over 450 lines | 4 |
| Over 500 lines | 0 |

| Status | Count |
| --- | --- |
| `single-file` | 184 |
| `needs-disclosure` | 44 |
| `disclosed` | 0 |
| `disclosed-over-budget` | 0 |

**Progressive disclosure is zero.** No original skill has a
disclosure folder, so every activation loads the whole file. The
44 over-budget skills are the migration backlog; the 184
single-file skills are fine as they are and must not be split for
its own sake.

Over-budget skills by category (over-budget / total): frontend
9/21, infrastructure 9/22, backend 8/21, ai-engineering 5/5 (every
skill in the category), auth 4/14, seo 4/31, desktop 3/3 (every
skill), media 2/16. All other categories have no over-budget
skills.

Longest 10 at baseline:

| Lines | Skill | Status |
| --- | --- | --- |
| 489 | `desktop/electron` | needs-disclosure |
| 468 | `backend/python-sdk` | needs-disclosure |
| 452 | `ai-engineering/mcp-security` | needs-disclosure |
| 451 | `backend/openapi` | needs-disclosure |
| 446 | `desktop/rust` | needs-disclosure |
| 442 | `infrastructure/self-hosted-vps` | needs-disclosure |
| 433 | `desktop/tauri` | needs-disclosure |
| 427 | `backend/advanced-api-architecture` | needs-disclosure |
| 404 | `frontend/expo` | needs-disclosure |
| 400 | `infrastructure/pulumi` | needs-disclosure |

## Re-measuring after migration

The migration is done by another worker; this document records the
baseline the migration is measured against. Re-run after migration
lands:

```bash
node scripts/disclosure-coverage.mjs            # human-readable summary
node scripts/disclosure-coverage.mjs --json     # full per-skill JSON
node scripts/disclosure-coverage.mjs --out coverage.json
```

Then update the table above with the new run's numbers (and the
date and commit). The script's JSON output carries `generated`,
`commit`, `summary` (counts, median, max, per-folder and
per-status breakdowns), `longest`, and per-skill `skills` entries,
so a before/after diff is a one-command comparison.

What a healthy post-migration library looks like: the
`needs-disclosure` count trending toward 0 (every >300-line skill
either split or shortened), `disclosed` growing, and no skill
crossing 500 lines. The `single-file` count should stay high —
small skills stay whole.

## Enforcement split (where the numbers live)

- This script measures coverage. It never fails — it is a
  measurement, not a gate.
- The validator warns (never errors) on a >500-line skill without
  disclosure folders, and validates disclosure structure where it
  exists (orphaned files warn; dangling pointers error).
- The scorer rewards disclosure for long skills (bonus up to +20
  on maintainability above 350 lines) and never punishes a short
  single-file skill.
