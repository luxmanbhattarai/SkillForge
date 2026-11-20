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
| Anthropic | Apache-2.0 | Per-skill `LICENSE.txt` preserved in each imported skill directory | 8 |
| Vercel | MIT | Upstream README "License: MIT" (no LICENSE file upstream); recorded in `skills/upstream/vercel/ATTRIBUTION.md` | 8 |
| Superpowers | MIT | Upstream LICENSE file (Copyright (c) 2025 Jesse Vincent) | 13 |
| Prisma | MIT | Upstream LICENSE file (Copyright (c) 2025 Prisma) | 11 |
| Marketing Skills | MIT | Upstream LICENSE file (Copyright (c) 2025 Corey Haines) | 8 |
| Agentic SEO | MIT | Upstream LICENSE file (Copyright (c) 2026 Bhanu Namikaze), preserved in `skills/upstream/agentic-seo/seo/LICENSE` | 1 |

## Notes

- **Apache-2.0 (Anthropic):** redistribution requires preserving the
  license and any notices. Each imported Anthropic skill keeps its
  `LICENSE.txt`; do not delete it.
- **MIT (all others):** redistribution requires preserving the copyright
  notice. Copyright holders are recorded in each vendor's
  `ATTRIBUTION.md` and above.
- **Vercel:** the upstream repository states MIT in its README but ships
  no LICENSE file. If a future upstream release adds a LICENSE file with
  different terms, re-audit before updating the import.
- **No other licenses** are present in this repository. If an import
  introduces a new license, add it here and confirm redistribution is
  permitted before merging.
