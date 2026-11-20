# Decision: honest verification-status wording

- **Date:** 2026-11-20
- **Status:** Accepted, implemented in Phase 11
- **Context:** The v1.0.0 README said the 49 upstream skills were
  "imported and verified" and implied the whole library was
  verified. That is no longer true and was never precisely true:
  the Phase 3 audit found 6 upstream skills needing correction and
  16 verified with limitations, and the 51 Phase 4 skills have no
  formal audit at all. Phase 9 made the registry's `status` derive
  from `sources/verification-status.json` so the data is honest;
  the documentation had to catch up.

## Decision

Docs state the verification split exactly, with the same four
statuses the registry uses, and never claim all 277 skills are
technically verified:

| Status | Skills | Wording |
| --- | --- | --- |
| `verified` | 204 | Audited against official docs; guidance confirmed. |
| `verified-with-limitations` | 16 | Audited; known limits recorded. |
| `needs-correction` | 6 | Known errors — all upstream; fixes belong upstream. |
| `unverified` | 51 | Written against official docs; no formal audit yet. |

Rules:

- The split is stated in `README.md` (with a table) and in
  `docs/ARCHITECTURE.md` (registry semantics). `AGENTS.md` tells
  agents to check per-skill status before relying on
  version-specific claims.
- "Verified" without qualification refers to the 204, never to the
  library as a whole.
- A skill with no audit entry is `unverified` — the generator
  defaults that way with a warning, and the docs must not
  relabel it.
- The scorer's "technical accuracy" dimension is labeled a proxy
  in `docs/SKILL-STANDARDS.md` and must never be presented as
  proof a skill's content is correct; only a Phase 3-style audit
  against official docs does that.

## Consequences

- Readers and agents can calibrate trust per skill instead of
  trusting the library uniformly.
- The 51 unverified skills are visible as a known gap, not hidden
  behind a blanket claim — re-auditing them is future work, not a
  documentation fix.
