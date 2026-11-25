// targets.mjs — install target definitions for the SkillForge installer.
//
// Every path below was verified against the vendor's CURRENT official
// documentation on 2026-11-20. Sources are recorded per target so the
// next verification pass can re-check them. Paths that vendors have
// moved since v1.0.0 are noted as legacy paths; the installer still
// detects installs in legacy locations (see doctor) but installs to
// the current documented locations.
//
// Verified 2026-11-20:
//   Claude Code   skills .claude/skills, ~/.claude/skills
//                 agents .claude/agents, ~/.claude/agents
//                 https://code.claude.com/docs/en/skills
//                 https://code.claude.com/docs/en/sub-agents
//   Cursor        skills .cursor/skills, ~/.cursor/skills
//                 agents .cursor/agents, ~/.cursor/agents
//                 https://cursor.com/docs/skills
//                 https://cursor.com/docs/subagents
//   Codex         skills .agents/skills, ~/.agents/skills
//                 agents .codex/agents, ~/.codex/agents (TOML files)
//                 https://developers.openai.com/codex/skills
//                 https://learn.chatgpt.com/docs/agent-configuration/subagents
//                 Legacy skills path .codex/skills / ~/.codex/skills is
//                 no longer in the current Codex docs (kept working by
//                 Codex for backward compatibility, openai/codex#10437).
//   Antigravity   skills .agents/skills, ~/.gemini/config/skills
//                 agents .agents/agents, ~/.gemini/config/agents
//                 workflows .agents/workflows,
//                           ~/.gemini/config/global_workflows (LEGACY:
//                           deprecated by Google, see below)
//                 https://antigravity.google/docs/skills/
//                 https://antigravity.google/docs/subagents
//                 https://antigravity.google/docs/customization-discovery
//                 https://antigravity.google/docs/migration/workflows-to-skills/
//                 https://antigravity.google/docs/ide/workflows/
//                 Legacy workspace path .agent/skills is still read
//                 for backward compatibility. The v1.0.0 user path
//                 ~/.agent/skills was never a documented Antigravity
//                 path. Antigravity surfaces disagree on the global
//                 path (App: ~/.gemini/config/skills, IDE:
//                 ~/.gemini/antigravity/skills, CLI:
//                 ~/.gemini/antigravity-cli/skills); the installer
//                 defaults to the App path and --dest overrides it.
//                 Antigravity workflows are deprecated by Google
//                 (May 2026: "Workflows are deprecated, and a new
//                 workflows system is on the way"); the installer
//                 supports them only for Antigravity, with a warning,
//                 because it is the only target with any documented
//                 workflow location at all.
//   Muse          skills ~/workspace/custom-skills (user scope
//                 only — Muse documents no project-level skills
//                 location). A Muse skill is SKILL.md WITHOUT
//                 frontmatter plus a skill.yaml beside it (name,
//                 title, description, category, include_in_prompt);
//                 the installer converts library skills into that
//                 shape (see library.mjs toMuseSkill) and always
//                 copies them — a conversion cannot be a symlink.
//                 include_in_prompt is false, so skills are found
//                 via search instead of being listed in every
//                 conversation (the 277-skill library would flood
//                 the prompt otherwise). Verified 2026-11-24
//                 against Muse's own skill template:
//                 ~/workspace/custom-skills/<skill_name>/skill.yaml
//                 beside SKILL.md ("This file holds the
//                 instructions alone, with no frontmatter").
//
// Project paths are relative to the working directory; user paths are
// relative to the user's home directory. Agent/workflow formats:
//   markdown — a .md file with YAML frontmatter (name, description)
//   toml     — a .toml file (Codex custom agents: name, description,
//              developer_instructions)

export const VERIFIED_DATE = '2026-11-20';

export const TARGETS = {
  'claude-code': {
    id: 'claude-code',
    aliases: ['claude'],
    label: 'Claude Code',
    skills: { project: '.claude/skills', user: '.claude/skills' },
    agents: { project: '.claude/agents', user: '.claude/agents', format: 'markdown' },
    workflows: null,
    legacySkills: { project: null, user: null },
    docs: {
      skills: 'https://code.claude.com/docs/en/skills',
      agents: 'https://code.claude.com/docs/en/sub-agents',
    },
  },
  cursor: {
    id: 'cursor',
    aliases: [],
    label: 'Cursor',
    skills: { project: '.cursor/skills', user: '.cursor/skills' },
    agents: { project: '.cursor/agents', user: '.cursor/agents', format: 'markdown' },
    workflows: null,
    legacySkills: { project: null, user: null },
    docs: {
      skills: 'https://cursor.com/docs/skills',
      agents: 'https://cursor.com/docs/subagents',
    },
  },
  codex: {
    id: 'codex',
    aliases: [],
    label: 'Codex',
    skills: { project: '.agents/skills', user: '.agents/skills' },
    agents: { project: '.codex/agents', user: '.codex/agents', format: 'toml' },
    workflows: null,
    legacySkills: { project: '.codex/skills', user: '.codex/skills' },
    docs: {
      skills: 'https://developers.openai.com/codex/skills',
      agents: 'https://learn.chatgpt.com/docs/agent-configuration/subagents',
    },
  },
  antigravity: {
    id: 'antigravity',
    aliases: [],
    label: 'Antigravity',
    skills: { project: '.agents/skills', user: '.gemini/config/skills' },
    agents: { project: '.agents/agents', user: '.gemini/config/agents', format: 'markdown' },
    workflows: {
      project: '.agents/workflows',
      user: '.gemini/config/global_workflows',
      format: 'markdown',
      deprecated: true,
      deprecationNote:
        'Antigravity workflows are deprecated by Google (see https://antigravity.google/docs/migration/workflows-to-skills/); ' +
        'they keep working for now, but new work should be packaged as Agent Skills.',
    },
    legacySkills: { project: '.agent/skills', user: '.agent/skills' },
    docs: {
      skills: 'https://antigravity.google/docs/skills/',
      agents: 'https://antigravity.google/docs/subagents',
      workflows: 'https://antigravity.google/docs/migration/workflows-to-skills/',
    },
  },
  muse: {
    id: 'muse',
    aliases: [],
    label: 'Muse',
    // User scope only: Muse documents no project-level skills
    // location, so project scope is refused with a clear error
    // (see resolveLocations). The user path is Muse's own
    // custom-skills directory, relative to the home directory.
    skills: { project: null, user: 'workspace/custom-skills' },
    agents: null,
    workflows: null,
    // Skills are converted to Muse format on install (SKILL.md
    // without frontmatter + a generated skill.yaml); see
    // library.mjs toMuseSkill. The installer branches on this.
    skillFormat: 'muse',
    legacySkills: { project: null, user: null },
    // No public per-skill docs page exists for Muse custom
    // skills; the product home stands in, and the authoritative
    // source is Muse's own skill template (see the header
    // comment above).
    docs: {
      skills: 'https://muse.ai',
    },
  },
};

const ALIASES = new Map();
for (const def of Object.values(TARGETS)) {
  ALIASES.set(def.id, def);
  for (const alias of def.aliases) ALIASES.set(alias, def);
}

/** Resolve a --target value to a target definition, or null. */
export function resolveTarget(name) {
  if (typeof name !== 'string') return null;
  return ALIASES.get(name.trim().toLowerCase()) || null;
}

export function targetIds() {
  return Object.keys(TARGETS);
}

/** Human-readable list of accepted --target values, aliases included. */
export function targetNames() {
  const names = [];
  for (const def of Object.values(TARGETS)) {
    names.push(def.id, ...def.aliases);
  }
  return names;
}
