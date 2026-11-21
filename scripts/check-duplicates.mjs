#!/usr/bin/env node
// check-duplicates.mjs — detects duplicate skill names and near-duplicate
// descriptions (Jaccard similarity over description tokens).
// Usage: node scripts/check-duplicates.mjs [--threshold 0.8]

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter } from './lib/frontmatter.mjs';
// Shared skill-file discovery (A2-18).
import { findSkillFiles } from './lib/skill-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tIdx = process.argv.indexOf('--threshold');
const THRESHOLD = tIdx >= 0 ? parseFloat(process.argv[tIdx + 1]) : 0.8;

function tokens(text) {
  return new Set((text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter((w) => w.length > 2));
}
function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

const skills = [];
const errors = [];
const warnings = [];
const byName = new Map();
for (const file of (await findSkillFiles(path.join(ROOT, 'skills'))).sort()) {
  const rel = path.relative(ROOT, file);
  const { raw } = splitFrontmatter(await readFile(file, 'utf8'));
  const { data } = parseFrontmatter(raw || '');
  if (!data?.name) continue;
  if (byName.has(data.name)) errors.push(`duplicate name '${data.name}': ${byName.get(data.name)} and ${rel}`);
  byName.set(data.name, rel);
  skills.push({ name: data.name, rel, desc: data.description || '' });
}
for (let i = 0; i < skills.length; i++) {
  for (let j = i + 1; j < skills.length; j++) {
    const sim = jaccard(tokens(skills[i].desc), tokens(skills[j].desc));
    if (sim >= THRESHOLD) {
      warnings.push(`near-duplicate descriptions (${sim.toFixed(2)}): '${skills[i].name}' and '${skills[j].name}' — justify or merge`);
    }
  }
}
console.log(`Compared ${skills.length} skills (threshold ${THRESHOLD}).`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length ? `FAIL: ${errors.length} error(s).` : warnings.length ? `PASS with ${warnings.length} warning(s).` : 'PASS.');
process.exit(errors.length ? 1 : 0);
