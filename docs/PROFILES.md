# Install profiles

Profiles are named bundles of skills (plus agents and workflows)
that install as one unit. They exist because installing everything
is expensive in agent context: all 277 skill descriptions total
100,263 characters (about 25,066 tokens at ~4 chars/token), and a
`--skills all` user-scope install preloads all of it. A profile
installs only the bundle a project needs — the frontend profile,
for example, loads about 1,761 tokens of descriptions instead of
about 25,066.

Numbers below were measured from `registry/skills.json`
descriptions (characters ÷ 4 ≈ tokens); they move as the library
grows. `--skills all` still works unchanged for anyone who wants
the whole library.

## Catalog

| Profile | Skills | Agents | Workflows | Description chars | ≈ Tokens | % of all-install |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `ai` | 5 | 1 | 1 | 2,481 | 620 | 2.5% |
| `architecture` | 23 | 3 | 3 | 8,054 | 2,014 | 8.0% |
| `backend` | 39 | 2 | 2 | 14,905 | 3,726 | 14.9% |
| `desktop` | 3 | 1 | 0 | 1,635 | 409 | 1.6% |
| `devops` | 22 | 4 | 2 | 9,917 | 2,479 | 9.9% |
| `frontend` | 21 | 1 | 0 | 7,045 | 1,761 | 7.0% |
| `fullstack` | 74 | 3 | 2 | 27,080 | 6,770 | 27.0% |
| `media` | 16 | 1 | 1 | 5,111 | 1,278 | 5.1% |
| `quality` | 27 | 4 | 2 | 9,090 | 2,273 | 9.1% |
| `security` | 22 | 1 | 3 | 7,368 | 1,842 | 7.3% |
| `seo` | 37 | 3 | 1 | 14,444 | 3,611 | 14.4% |
| `writing` | 24 | 3 | 1 | 9,498 | 2,375 | 9.5% |
| **all skills** | **277** | **24** | **16** | **100,263** | **25,066** | **100%** |

Profiles cover every original skill, all 24 agents, and all 16
workflows. The `upstream` category (49 imported skills) is
deliberately not covered by any profile: upstream imports come
from many vendors with mixed verification status, so they are
installed explicitly (`--category upstream` or `--skill <name>`),
never as part of a bundle.

## Using profiles

```bash
# Install the frontend bundle into a Claude Code project
node scripts/install-skills.mjs install --target claude-code --scope project --profile frontend

# --bundle is an alias for --profile; repeatable
node scripts/install-skills.mjs install --target cursor --scope project --bundle backend --bundle devops

# Profiles combine with other selectors as a union (deduped)
node scripts/install-skills.mjs install --target claude-code --scope project --profile desktop --skill nextjs

# Update and uninstall accept --profile too
node scripts/install-skills.mjs update --target claude-code --scope project --profile frontend
node scripts/install-skills.mjs uninstall --target claude-code --scope project --profile frontend
```

An unknown profile is a usage error (exit 2) that lists the known
profiles:

```text
Error: unknown profile 'nope' (known profiles: ai, architecture, backend, desktop, devops, frontend, fullstack, media, quality, security, seo, writing)
```

**Profiles need `--target`.** Every shipped profile bundles at
least one agent, and agents cannot install to a bare `--dest`
(the destination has no agents directory) — the run fails with
the same `needs --target` error as `--agent` with `--dest`.
`--dest` users select skills directly with `--skill` or
`--category`.

## Needs-correction interaction

No shipped profile lists a needs-correction skill (all six are
in the excluded `upstream` category). A custom profile that does
is subject to the bulk-install rule of the status filter: the
skill is warned about on stderr and skipped, and the rest of the
profile installs. See "Needs-correction skills" in
[INSTALLATION.md](INSTALLATION.md).

## Defining a custom profile

Profiles live in `profiles/<name>.json` at the library root:

```json
{
  "name": "frontend",
  "description": "Frontend development: frameworks, styling, and browser skills for building web interfaces.",
  "skills": ["nextjs", "react", "tailwind-css"],
  "agents": ["frontend-specialist"],
  "workflows": []
}
```

Rules, enforced by the installer when the profile is used (a bad
profile fails the run with a `LibraryError` naming the file — the
same fail-closed treatment as a malformed registry):

- `name` must equal the file name (without `.json`).
- `description` must be a non-empty string.
- `skills`, `agents`, `workflows` are arrays of names; any of
  them may be omitted (treated as empty).
- Every named skill, agent, and workflow must exist in the
  library registries; an unknown member fails the run.

Profiles are loaded lazily — only when `--profile`/`--bundle` is
given — so a malformed profile cannot break unrelated commands.
