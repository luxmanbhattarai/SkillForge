# Third-Party Skills (Referenced, Not Imported)

Skills and collections that are useful but deliberately **not** copied into
this repository — because they are too large, because their names collide
with original skills here, because they are out of scope, or because their
license does not permit redistribution. Install them directly from their
upstream source.

## Large collections (install selected skills only)

### github/awesome-copilot (MIT, 464 skills)

https://github.com/github/awesome-copilot

Community-contributed Copilot instructions, agents, and skills. Quality
varies by contributor; review any skill before trusting it, especially for
security topics. Relevant examples (verify names in the repo before
installing — the collection changes frequently):

- `agent-owasp-compliance`, `api-breaking-change-detector`,
  `architecture-blueprint-generator`, `azure-*` (Azure-focused),
  `aws-*` (AWS-focused)

Install via the Skills CLI or by copying the skill directory:

```bash
npx skills add github/awesome-copilot --skill <skill-name>
```

### seoskills.sh (licenses vary per skill, 472 skills)

https://seoskills.sh/

SEO-specific skills directory. Each skill is its own GitHub repository;
check the individual skill's license before redistributing it.

```bash
npx skills add https://seoskills.sh
```

## Upstream skills referenced instead of imported (name collisions)

These exist upstream but share a name with an original skill in this
repository. The original skill is canonical here; the upstream version is
linked for comparison. Do not import these under the same name.

| Upstream skill | Upstream source | Original skill here |
| --- | --- | --- |
| `seo-audit` | coreyhaines31/marketingskills | `seo-audit` |
| `content-strategy` | coreyhaines31/marketingskills | `content-strategy` |
| `programmatic-seo` | coreyhaines31/marketingskills | `programmatic-seo` |
| `copywriting` | coreyhaines31/marketingskills | `copywriting` |

## Upstream skills referenced instead of imported (conceptual overlap)

| Upstream skill | Upstream source | Covered here by |
| --- | --- | --- |
| `test-driven-development` | obra/superpowers | `tdd` |
| `systematic-debugging` | obra/superpowers | `debugging` |

## Out-of-scope upstream skills (not imported)

| Upstream skill | Source | Reason |
| --- | --- | --- |
| `react-native-skills` | vercel-labs/agent-skills | React Native is outside this repo's web-focused scope |
| `pdf`, `docx`, `xlsx`, `pptx` | anthropics/skills | Document-format skills; install from upstream if needed |
| `slack-gif-creator`, `internal-comms`, `academy-guide`, `discernment-nudge`, `claude-api`, `algorithmic-art`, `canvas-design` | anthropics/skills | Narrow or product-specific; install from upstream if needed |
| Remaining 41 marketingskills | coreyhaines31/marketingskills | Marketing-domain (ads, email, pricing, etc.); install from upstream if needed |

## Rules for third-party skills

1. Never treat a third-party skill as a trusted security authority without
   reviewing it against official documentation.
2. Never execute an imported script without reading it first.
3. If a third-party skill is later imported, move its entry to
   `imported-skills.md` and add an `ATTRIBUTION.md` in its directory.
