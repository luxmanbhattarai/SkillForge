#!/usr/bin/env node
// install-skills.mjs — installs selected skills into an agent's skills
// directory by copying (default) or symlinking (--link).
//
// Targets and their skill directories (per each vendor's documentation
// as of 2026-11-20; use --dest to override when a vendor changes paths):
//   claude-code  project: .claude/skills        user: ~/.claude/skills
//   cursor       project: .cursor/skills        user: ~/.cursor/skills
//   codex        project: .codex/skills         user: ~/.codex/skills
//   antigravity  project: .agent/skills         user: ~/.agent/skills
//
// Usage:
//   node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro
//   node scripts/install-skills.mjs --target codex --scope user --skills all
//   node scripts/install-skills.mjs --target claude-code --scope project --skills all --link
//   node scripts/install-skills.mjs --dest /custom/path --skills seo-audit

import { readdir, readFile, cp, symlink, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = os.homedir();

const TARGETS = {
  'claude-code': { project: '.claude/skills', user: path.join(HOME, '.claude/skills') },
  cursor: { project: '.cursor/skills', user: path.join(HOME, '.cursor/skills') },
  codex: { project: '.codex/skills', user: path.join(HOME, '.codex/skills') },
  antigravity: { project: '.agent/skills', user: path.join(HOME, '.agent/skills') },
};

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const target = arg('--target');
const scope = arg('--scope') || 'project';
const destOverride = arg('--dest');
const skillsArg = arg('--skills');
const useLink = process.argv.includes('--link');

if (!skillsArg) {
  console.error('Usage: node scripts/install-skills.mjs --target <claude-code|cursor|codex|antigravity> --scope <project|user> --skills <name,name|all> [--link] [--dest <path>]');
  process.exit(2);
}
let dest;
if (destOverride) dest = path.resolve(destOverride);
else {
  if (!TARGETS[target]) { console.error(`Unknown target '${target}'. Known: ${Object.keys(TARGETS).join(', ')}`); process.exit(2); }
  if (!['project', 'user'].includes(scope)) { console.error(`Unknown scope '${scope}'. Use project or user.`); process.exit(2); }
  dest = scope === 'user' ? TARGETS[target].user : path.resolve(process.cwd(), TARGETS[target].project);
}

const reg = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));
const wanted = skillsArg === 'all' ? reg.skills.map((s) => s.name) : skillsArg.split(',').map((s) => s.trim()).filter(Boolean);
const byName = new Map(reg.skills.map((s) => [s.name, s]));
const missing = wanted.filter((n) => !byName.has(n));
if (missing.length) { console.error(`Unknown skill(s): ${missing.join(', ')}`); process.exit(2); }

await mkdir(dest, { recursive: true });
let installed = 0;
for (const name of wanted) {
  const src = path.join(ROOT, byName.get(name).path);
  const dst = path.join(dest, name);
  if (existsSync(dst)) await rm(dst, { recursive: true, force: true });
  if (useLink) await symlink(src, dst, 'dir');
  else await cp(src, dst, { recursive: true });
  installed++;
}
console.log(`Installed ${installed} skill(s) to ${dest}${useLink ? ' (symlinked)' : ' (copied)'}${target ? ` for ${target} (${scope})` : ''}.`);
console.log('Restart the agent (or reload the project) so it picks up the new skills.');
