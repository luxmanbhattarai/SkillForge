// disclosure-coverage.mjs — progressive-disclosure coverage for
// original skills (Finding 1).
//
// Measures, per original skill, whether its detail is factored into
// the disclosure folders defined in docs/PROGRESSIVE-DISCLOSURE.md
// (references/, scripts/, assets/, examples/) and how long its
// SKILL.md body is. Upstream skills are excluded: their layout is
// theirs, and they are never edited.
//
// Status taxonomy (total SKILL.md lines, budget 300 — see the
// standard for the justification):
//   single-file            <=300 lines, no disclosure folders
//   needs-disclosure       >300 lines, no disclosure folders
//   disclosed              disclosure folders present, <=300 lines
//   disclosed-over-budget  disclosure folders present, >300 lines
//
// A folder counts only when it exists AND is non-empty — an empty
// references/ dir discloses nothing (same rule as the scorer's
// disclosure bonus). The 300-line budget is measured here, not
// validator-enforced: unmigrated skills remain valid.
//
// Usage:
//   node scripts/disclosure-coverage.mjs [--root <dir>] [--json] [--out <file>]
//   npm run disclosure
// Exit code 0 always (this is a measurement, not a gate).

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findSkillFiles } from './lib/skill-files.mjs';
import { splitFrontmatter } from './lib/frontmatter.mjs';

export const DISCLOSURE_DIRS = ['references', 'scripts', 'assets', 'examples'];
export const LINE_BUDGET = 300;

const args = process.argv.slice(2);
const flagValue = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const ROOT = flagValue('--root') ? path.resolve(flagValue('--root')) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = args.includes('--json');
const OUT_FILE = flagValue('--out');

// Total lines of a file, same count as the validator:
// split on \n, minus one for a trailing newline.
export function countLines(text) {
  return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

export function disclosureStatus(lines, folders) {
  if (folders.length === 0) return lines <= LINE_BUDGET ? 'single-file' : 'needs-disclosure';
  return lines <= LINE_BUDGET ? 'disclosed' : 'disclosed-over-budget';
}

function nonEmptyFolders(skillDir) {
  const found = [];
  for (const dir of DISCLOSURE_DIRS) {
    const full = path.join(skillDir, dir);
    try {
      if (existsSync(full) && readdirSync(full).length > 0) found.push(dir);
    } catch {
      // unreadable directory: treat as absent, not as disclosed
    }
  }
  return found;
}

export async function measureSkill(file) {
  const text = readFileSync(file, 'utf8');
  const lines = countLines(text);
  const { body } = splitFrontmatter(text);
  const bodyLines = body ? countLines(body) : lines;
  const skillDir = path.dirname(file);
  const folders = nonEmptyFolders(skillDir);
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const [, category, name] = rel.split('/');
  return {
    path: rel,
    name,
    category,
    lines,
    bodyLines,
    folders,
    status: disclosureStatus(lines, folders),
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function headCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return null;
  }
}

async function main() {
  const files = (await findSkillFiles(path.join(ROOT, 'skills')))
    .filter((f) => !f.includes(`${path.sep}upstream${path.sep}`))
    .sort();
  const skills = [];
  for (const file of files) skills.push(await measureSkill(file));

  const lines = skills.map((s) => s.lines);
  const byStatus = {};
  for (const s of skills) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  const byFolder = {};
  for (const dir of DISCLOSURE_DIRS) {
    byFolder[dir] = skills.filter((s) => s.folders.includes(dir)).length;
  }
  const longest = [...skills].sort((a, b) => b.lines - a.lines).slice(0, 10)
    .map((s) => ({ path: s.path, lines: s.lines, status: s.status }));

  const report = {
    generated: new Date().toISOString().slice(0, 10),
    commit: headCommit(),
    summary: {
      total: skills.length,
      medianLines: median(lines),
      maxLines: Math.max(...lines),
      minLines: Math.min(...lines),
      overBudget: skills.filter((s) => s.lines > LINE_BUDGET).length,
      withFolders: skills.filter((s) => s.folders.length > 0).length,
      byFolder,
      byStatus,
    },
    longest,
    skills,
  };

  if (OUT_FILE) {
    writeFileSync(path.resolve(OUT_FILE), JSON.stringify(report, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE} (${skills.length} skills).`);
  }
  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (!OUT_FILE) {
    console.log(`Progressive-disclosure coverage: ${skills.length} original skills (upstream excluded).`);
    console.log(`SKILL.md lines: median ${report.summary.medianLines}, max ${report.summary.maxLines}, min ${report.summary.minLines}.`);
    console.log(`Over the ${LINE_BUDGET}-line budget: ${report.summary.overBudget}. With disclosure folders: ${report.summary.withFolders}.`);
    console.log('By folder: ' + DISCLOSURE_DIRS.map((d) => `${d} ${byFolder[d]}`).join(', ') + '.');
    console.log('By status: ' + Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ') + '.');
    console.log('\nLongest 10:');
    for (const s of longest) console.log(`  ${String(s.lines).padStart(3)}  ${s.path} (${s.status})`);
  }
}

const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main();
}
