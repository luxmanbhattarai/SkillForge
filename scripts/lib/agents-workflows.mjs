// agents-workflows.mjs — shared checks for agents/*.md and workflows/*.md.
//
// Agents and workflows have no frontmatter (they are plain Markdown
// starting with an H1 title), so this validates structure and
// references instead:
//   - the H1 title and the required ## sections are present
//   - every backticked token resolves to a registry skill, an agent,
//     a workflow, or an existing repo path
//   - every skill in "Skills it should use" also appears in
//     "Skills it can discover" (an agent cannot be required to use a
//     skill it cannot discover)
//
// Token classification: a token with whitespace or uppercase letters
// is prose or a command, not a reference; a token containing a dot is
// a filename (e.g. `llms.txt`); a token containing a slash is a repo
// path and must exist. Anything else must resolve. Skill names win
// over agent/workflow names on collision (none exists today).

export const AGENT_SECTIONS = [
  'Role',
  'Responsibilities',
  'Skills it can discover',
  'Skills it should use',
  'Required workflow',
  'Expected deliverables',
  'Validation criteria',
  'Escalation rules',
];

export const WORKFLOW_SECTIONS = ['Inputs', 'Steps', 'Outputs', 'Checks'];

// index: { skills: Set, agents: Set, workflows: Set }
// fileExists: (relPath) => boolean, for path tokens.
// Returns { kind, target? } where kind is one of:
//   skill | agent | workflow | path | ignored | unknown
export function classifyToken(token, index, fileExists) {
  if (/[\sA-Z]/.test(token)) return { kind: 'ignored', reason: 'prose or command' };
  if (token.includes('/')) {
    if (/^(agents|workflows)\//.test(token) || token.endsWith('.md')) {
      return fileExists(token)
        ? { kind: 'path', target: token }
        : { kind: 'unknown', reason: 'path does not exist' };
    }
    return { kind: 'ignored', reason: 'slash term, not a repo path' };
  }
  if (token.includes('.')) return { kind: 'ignored', reason: 'filename or dotted term' };
  if (index.skills.has(token)) return { kind: 'skill', target: token };
  if (index.agents.has(token)) return { kind: 'agent', target: token };
  if (index.workflows.has(token)) return { kind: 'workflow', target: token };
  return { kind: 'unknown', reason: 'no such skill, agent, or workflow' };
}

// Extract the body of a ## section (text up to the next ## heading).
// Exported for the registry generator (agents.json / workflows.json).
export function extractSection(text, name) {
  const m = text.match(new RegExp(`^## ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

// Lowercase backticked tokens in a section — the skill-name references.
// Exported for the registry generator.
export function extractSkillTokens(section) {
  if (!section) return new Set();
  return new Set([...section.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)].map((m) => m[1]));
}

// The H1 title (first line), without the '# '. '' when absent.
export function extractTitle(text) {
  const first = (text.split('\n')[0] || '');
  const m = first.match(/^#\s+(.+)$/);
  return m ? m[1].trim() : '';
}

// The first paragraph after the H1: the agent/workflow description.
// '' when absent.
export function extractDescription(text) {
  const lines = text.split('\n').slice(1);
  const para = [];
  let started = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) break;
    if (line.trim() === '') {
      if (started) break;
      continue;
    }
    started = true;
    para.push(line.trim());
  }
  return para.join(' ');
}

function sectionBody(text, name) {
  return extractSection(text, name);
}

function skillTokens(section) {
  return extractSkillTokens(section);
}

// Check one file's content. kind is 'agent' or 'workflow'.
// Returns { errors: [{ line, message }], warnings: [{ line, message }] }.
export function checkContent({ relPath, text, kind, index, fileExists }) {
  const errors = [];
  const warnings = [];
  const lines = text.split('\n');

  if (!/^# \S/.test(lines[0] || '')) {
    errors.push({ line: 1, message: 'missing H1 title on the first line' });
  }

  const required = kind === 'agent' ? AGENT_SECTIONS : WORKFLOW_SECTIONS;
  for (const section of required) {
    if (!new RegExp(`^## ${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').test(text)) {
      errors.push({ line: 0, message: `missing required section: ## ${section}` });
    }
  }

  // Backticked tokens must resolve.
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const token = m[1];
      const found = classifyToken(token, index, fileExists);
      if (found.kind === 'unknown') {
        errors.push({ line: idx + 1, message: `unresolved reference \`${token}\` (${found.reason})` });
      }
    }
  });

  // Agents: "should use" must be a subset of "can discover".
  if (kind === 'agent') {
    const discover = skillTokens(sectionBody(text, 'Skills it can discover'));
    const use = skillTokens(sectionBody(text, 'Skills it should use'));
    for (const skill of [...use].sort()) {
      if (!discover.has(skill)) {
        errors.push({ line: 0, message: `\`${skill}\` is in "Skills it should use" but not in "Skills it can discover"` });
      }
    }
  }

  return { errors, warnings };
}