// skill-files.mjs — shared skill-file discovery and the constants
// every skill check agrees on (A2-18).
//
// `findSkillFiles` used to be duplicated in six scripts
// (generate-registry, validate-skills, validate-registry,
// check-duplicates, check-frontmatter, score-skills), and the
// copies had already drifted: some normalized paths with
// toPosixPath and some did not, which is how the W-3 registry
// mismatch and the A2-14 --filter bug happened — a fix in one copy
// missed the others. Likewise REQUIRED_SECTIONS and the
// placeholder regexes were duplicated between validate-skills and
// score-skills. There is now one copy of each; the four scripts
// this workstream owns import them, and check-frontmatter /
// score-skills migrate to them in a follow-up (their workstream
// owns those files).
//
// findSkillFiles returns ABSOLUTE paths to SKILL.md files.
// Callers that need relative paths (validate-registry compares
// POSIX-relative directory paths against the registry) derive
// them with path.relative + toPosixPath at the call site.

import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Recursively collect every SKILL.md under `dir` (absolute paths). */
export async function findSkillFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findSkillFiles(full));
    else if (e.name === 'SKILL.md') out.push(full);
  }
  return out;
}

// The 15 sections every original skill must have (repository
// standard; upstream skills are exempt). Single source of truth
// for validate-skills and (after migration) score-skills.
export const REQUIRED_SECTIONS = [
  'Purpose', 'When to Use', 'When Not to Use', 'Prerequisites',
  'Official Documentation', 'Required Workflow', 'Implementation Standards',
  'Best Practices', 'Security Considerations', 'Performance Considerations',
  'Common Mistakes', 'Examples', 'Validation Checklist',
  'Expected Deliverables', 'References',
];

// Placeholder markers: acronyms match only in UPPERCASE (so ordinary
// prose like "a todo list" does not trip the check); phrases match
// any case. Two regexes because a single /i flag would apply to the
// whole pattern. Single source of truth for validate-skills and
// (after migration) score-skills.
export const PLACEHOLDER_ACRONYM_RE = /\b(TODO|FIXME|XXX|TBD)\b/;
export const PLACEHOLDER_PHRASE_RE = /lorem ipsum|coming soon|placeholder text/i;
