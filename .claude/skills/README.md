# Skills directory (Claude Code, project scope)

This directory is populated by the install script. Do **not** fill it by
copying skills manually.

## How skills get here

Run the installer from the repository root:

```bash
node scripts/install-skills.mjs --target claude-code --scope project --skills <name,name|all>
```

The installer copies the selected skills from `skills/` into
`.claude/skills/`, preserving each skill's directory structure. Use
`--link` to symlink instead of copying, so updates to the library are
reflected immediately.

## Why not copy manually

- The installer validates skill names and resolves them through the
  registry, so a typo fails loudly instead of installing a broken skill.
- Copying by hand risks partial skills (missing `references/` or
  `scripts/`), wrong directory names (which break the Agent Skills
  spec's name-matches-directory rule), and stale copies that drift from
  the library.
- To update installed skills, re-run the installer. To remove a skill,
  delete its directory here — the library itself is untouched.

## User-level installs

For skills available in every project, use `--scope user` instead. The
installer places them in `~/.claude/skills/`. See
[`docs/INSTALLATION.md`](../../docs/INSTALLATION.md) for all targets and
scopes.
