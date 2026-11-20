#!/usr/bin/env node
// check-frontmatter.mjs — fast frontmatter-only check over every SKILL.md.
// Same rules as validate-skills.mjs, without body/section/link checks.
// Usage: node scripts/check-frontmatter.mjs

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter, validateName } from './lib/frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function findSkillFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findSkillFiles(full));
    else if (e.name === 'SKILL.md') out.push(full);
  }
  return out;
}

const files = (await findSkillFiles(path.join(ROOT, 'skills'))).sort();
const errors = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const dirName = path.basename(path.dirname(file));
  const text = await readFile(file, 'utf8');
  const { raw, error: splitErr } = splitFrontmatter(text);
  if (splitErr) { errors.push(`${rel}: ${splitErr}`); continue; }
  const { data, error: parseErr } = parseFrontmatter(raw);
  if (parseErr) { errors.push(`${rel}: ${parseErr}`); continue; }
  const nameErr = validateName(data.name);
  if (nameErr) errors.push(`${rel}: invalid name: ${nameErr}`);
  else if (data.name !== dirName) errors.push(`${rel}: name '${data.name}' != directory '${dirName}'`);
  if (!data.description || data.description.length > 1024) {
    errors.push(`${rel}: description missing/empty or > 1024 chars`);
  }
  if (data.compatibility && data.compatibility.length > 500) {
    errors.push(`${rel}: compatibility > 500 chars`);
  }
}
console.log(`Checked frontmatter of ${files.length} skills.`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length ? `FAIL: ${errors.length} error(s).` : 'PASS.');
process.exit(errors.length ? 1 : 0);
