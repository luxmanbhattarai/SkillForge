# License Audit

Every skill in this repository is covered by one of the licenses below.
No skill is distributed under a license that forbids redistribution.
Verified 2026-11-20.

## Original skills (this repository)

- **License:** MIT (see root `LICENSE`)
- **Applies to:** all skills under `skills/` except `skills/upstream/`
- **Copyright:** SkillForge contributors

## Upstream skills

| Vendor | License | Evidence | Skills |
| --- | --- | --- | --- |
| Anthropic | Apache-2.0 | Per-skill `LICENSE.txt` preserved in 7 of 8 imported skill directories (see note) | 8 |
| Vercel | MIT | Upstream README "License: MIT" (no LICENSE file upstream); recorded in `skills/upstream/vercel/ATTRIBUTION.md` | 8 |
| Superpowers | MIT | Upstream LICENSE file (Copyright (c) 2025 Jesse Vincent) | 13 |
| Prisma | MIT | Upstream LICENSE file (Copyright (c) 2025 Prisma) | 11 |
| Marketing Skills | MIT | Upstream LICENSE file (Copyright (c) 2025 Corey Haines) | 8 |
| Agentic SEO | MIT | Upstream LICENSE file (Copyright (c) 2026 Bhanu Namikaze and Copyright (c) 2026 agricidaniel), preserved in `skills/upstream/agentic-seo/seo/LICENSE` | 1 |

## Notes

- **Apache-2.0 (Anthropic):** redistribution requires preserving the
  license and any notices. Each imported Anthropic skill keeps its
  `LICENSE.txt`; do not delete it. Exception: `doc-coauthoring` ships
  no `LICENSE.txt` upstream (verified against commit `e4bb5d96` on
  2026-11-20 — the upstream directory contains only `SKILL.md`), so
  there is no per-skill notice to preserve for it; the Apache-2.0
  license still applies via the other skills' notices.
- **MIT (all others):** redistribution requires preserving the copyright
  notice. Copyright holders are recorded in each vendor's
  `ATTRIBUTION.md` and above.
- **Vercel:** the upstream repository states MIT in its README but ships
  no LICENSE file. If a future upstream release adds a LICENSE file with
  different terms, re-audit before updating the import.
- **Upstream LICENSE texts not preserved locally (Stage E, 2026-11-20 —
  issue A-25):** superpowers, prisma, and marketingskills ship no
  LICENSE file in the imported copy; only this file and each vendor's
  `ATTRIBUTION.md` record the holder and license. That arguably
  satisfies MIT's copyright-notice requirement, but the license texts
  themselves are absent. **Decision:** at the next re-import of each
  vendor (per `docs/UPDATE-PROCESS.md`, re-import by commit with no
  hand-editing), copy the upstream LICENSE file verbatim into the
  vendor directory alongside `ATTRIBUTION.md`. Availability at the
  pinned commits was verified 2026-11-20 via the upstream repositories
  (pins in `sources/imported-skills.md`):
  - Superpowers @ `22f0b463`: LICENSE **exists** — MIT, Copyright (c)
    2025 Jesse Vincent (1,070 bytes).
    https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/LICENSE
  - Prisma @ `a6f19295`: LICENSE **exists** — MIT, Copyright (c) 2025
    Prisma (1,063 bytes).
    https://github.com/prisma/skills/blob/a6f192959cf43b08aa330fe1ffca090267215812/LICENSE
  - Marketing Skills @ `5b2b400e`: LICENSE **exists** — MIT, Copyright
    (c) 2025 Corey Haines (1,069 bytes).
    https://github.com/coreyhaines31/marketingskills/blob/5b2b400eec1e7e1cec76245a715d0b0d4fd2a9c1/LICENSE
  - Vercel @ `5a37a632` (current pin after the Stage D re-import): NO
    LICENSE file upstream (confirmed 2026-11-20); the README-only MIT
    statement stands, so there is nothing to preserve at re-import.
  - Anthropic and Agentic SEO already preserve license files locally
    (per-skill `LICENSE.txt` / `seo/LICENSE`); the Agentic SEO copy
    was verified byte-identical to upstream on 2026-11-20
    (SHA-256 `aa3532d279e8…`).
- **No other licenses** are present in this repository. If an import
  introduces a new license, add it here and confirm redistribution is
  permitted before merging.
