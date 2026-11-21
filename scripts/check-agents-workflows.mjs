#!/usr/bin/env node
// check-agents-workflows.mjs — structural validation for agents/ and
// workflows/ (finding H-05: they were entirely unvalidated).
//
// Checks, per file: H1 title present, required ## sections present,
// every backticked token resolves to a registry skill, an agent, a
// workflow, or an existing repo path, and (agents) every skill in
// "Skills it should use" also appears in "Skills it can discover".
//
// Usage: node scripts/check-agents-workflows.mjs
//   npm run check:agents
// Exit code 1 on any error; warnings do not fail the run.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContent } from './lib/agents-workflows.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(await readFile(path.join(ROOT, 'registry/skills.json'), 'utf8'));
const index = {
  skills: new Set(registry.skills.map((s) => s.name)),
  agents: new Set((await readdir(path.join(ROOT, 'agents'))).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))),
  workflows: new Set((await readdir(path.join(ROOT, 'workflows'))).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))),
};
const fileExists = (rel) => existsSync(path.join(ROOT, rel));

let files = 0;
let errors = 0;
let warnings = 0;

for (const [dir, kind] of [['agents', 'agent'], ['workflows', 'workflow']]) {
  const names = (await readdir(path.join(ROOT, dir))).filter((f) => f.endsWith('.md')).sort();
  for (const name of names) {
    files++;
    const relPath = `${dir}/${name}`;
    const text = await readFile(path.join(ROOT, relPath), 'utf8');
    const result = checkContent({ relPath, text, kind, index, fileExists });
    for (const e of result.errors) {
      errors++;
      console.log(`  ERROR ${relPath}${e.line ? ':' + e.line : ''} ${e.message}`);
    }
    for (const w of result.warnings) {
      warnings++;
      console.log(`  WARN  ${relPath}${w.line ? ':' + w.line : ''} ${w.message}`);
    }
  }
}

console.log(`\nChecked ${files} files (${index.agents.size} agents, ${index.workflows.size} workflows) against ${index.skills.size} skills.`);
if (errors > 0) {
  console.log(`FAIL: ${errors} error(s), ${warnings} warning(s).`);
  process.exit(1);
}
console.log(warnings > 0 ? `PASS with ${warnings} warning(s).` : 'PASS.');
