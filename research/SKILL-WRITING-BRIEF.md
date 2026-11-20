# Skill-Writing Brief (for writer agents)

You are writing original Agent Skills for the `SkillForge` repository
at `~/workspace/SkillForge/`. Follow this brief exactly. It exists so
every skill passes `node scripts/validate-skills.mjs` on the first run.

## 1. Location and naming

- One skill = one directory: `skills/<category>/<skill-name>/SKILL.md`
- `<skill-name>` must match the frontmatter `name` exactly.
- Names: lowercase letters, digits, hyphens only; 1-64 chars; no leading,
  trailing, or consecutive hyphens (agentskills.io spec).
- Do NOT create `references/`, `examples/`, `scripts/`, or `assets/`
  subdirectories unless the skill genuinely needs them. Most skills need
  only `SKILL.md`.

## 2. Frontmatter (exact format)

Copy the frontmatter from `templates/SKILL-TEMPLATE.md`. Rules:

- `name`: the skill directory name.
- `description`: 1-1024 characters, plain prose. Must say what the skill
  does AND when to use it, with trigger keywords. Use the folded `>` style.
- `license: MIT`
- `metadata` (all values strings):
  - `version: "1.0.0"`
  - `category: <the category directory name>`
  - `maintainer: skills-library`
  - `source: original`
  - `last_verified: "2026-11-20"`
- Add `compatibility:` ONLY if the skill needs specific tools, runtimes, or
  network access (max 500 chars). Omit it otherwise.
- Do NOT add any other frontmatter fields.

## 3. Body (required sections, in this order)

Follow `templates/SKILL-TEMPLATE.md` exactly:

Purpose, When to Use, When Not to Use, Prerequisites, Official
Documentation, Required Workflow, Implementation Standards, Best Practices,
Security Considerations, Performance Considerations, Common Mistakes,
Examples, Validation Checklist, Expected Deliverables, References.

- Total file: 120-300 lines of body is the target. Hard limit: under
  500 lines (agentskills.io recommendation; the validator errors above 800).
- Every section must have real content. No "TODO", "coming soon", "lorem
  ipsum", "placeholder", or empty sections. The validator rejects those words.
- "When Not to Use" must name the better alternative skill or approach.
- "Official Documentation" and "References" must link REAL URLs only.
  Link official docs homepages / well-known doc paths you are confident
  exist (e.g. `https://developers.google.com/search/docs/essentials`).
  If you are unsure a deep URL exists, link the documentation homepage
  instead of guessing a path. Never invent a URL.
- "Examples" must be technically valid, minimal, and secure by default.
  No fake APIs, no invented package methods, no invented CLI flags.
  If you are unsure a method/flag exists, write the example in
  pseudocode-free plain prose or use a simpler example you are sure about.
- Versions: do NOT pin a version number unless you verified it against an
  official source during this session. Prefer "current stable" plus a link
  to the official releases page. Verified-as-of-2026-11-20 facts you may
  use: Astro 7 is current; Prisma ORM 8 is current (Prisma 6/7 still
  supported); Node.js 24 is current LTS line; React 19 is current;
  Next.js 16 is current; Tailwind CSS v4 is current; TypeScript 5.x is
  current. Do not state minor/patch numbers you have not verified.
- SEO/GEO skills: never promise rankings or citations; never invent search
  volume or difficulty numbers; label any estimate as an estimate; never
  fabricate ratings, reviews, or business details in schema examples
  (use clearly generic example values and say so).
- Auth/security skills: never recommend rolling custom auth when a
  maintained framework fits; never show secrets in examples (use
  placeholders like `$SESSION_SECRET` and say to use a secret manager).
- Cross-references: refer to sibling skills by backticked name only
  (e.g. `` `nextjs` ``), NOT by relative file path, so links never break.

## 4. Quality bar

Each skill must be genuinely useful to a coding agent: concrete steps,
concrete standards, concrete checks. Avoid generic filler ("always write
clean code"). Prefer specific rules, thresholds, commands, and checklists.
Write for an agent that will execute the skill, not for a human browsing.

## 5. After writing

Run the validator scoped to your category, e.g.:

```bash
cd ~/workspace/SkillForge
node scripts/validate-skills.mjs --filter skills/frontend/
```

Fix every error before reporting done. Warnings are acceptable only with
a reason stated in your report.

## 6. What NOT to do

- Do not modify anything under `skills/upstream/` (imported upstream skills).
- Do not modify `scripts/`, `registry/`, or `templates/`.
- Do not create files outside your assigned category directories.
- Do not invent statistics, benchmarks, or "studies show" claims.
- Do not copy text from other repositories. Write original content.
