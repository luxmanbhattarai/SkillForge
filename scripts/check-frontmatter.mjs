#!/usr/bin/env node
// check-frontmatter.mjs — fast frontmatter-only check over every SKILL.md.
// Same rules as validate-skills.mjs, without body/section/link checks.
// Usage: node scripts/check-frontmatter.mjs

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter, validateName } from './lib/frontmatter.mjs';
import { findSkillFiles } from './lib/skill-files.mjs'; // shared discovery (A2-18)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = (await findSkillFiles(path.join(ROOT, 'skills'))).sort();
const errors = [];
const warnings = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  // Upstream skills are imported verbatim: a name mismatch there is
  // the vendor's, not ours — warn like validate-skills.mjs does
  // (audit A2-08), instead of failing the lint leg on content this
  // repository must not edit.
  const isUpstream = rel.split(path.sep)[1] === 'upstream';
  const dirName = path.basename(path.dirname(file));
  const text = await readFile(file, 'utf8');
  const { raw, error: splitErr } = splitFrontmatter(text);
  if (splitErr) { errors.push(`${rel}: ${splitErr}`); continue; }
  const { data, error: parseErr } = parseFrontmatter(raw);
  if (parseErr) { errors.push(`${rel}: ${parseErr}`); continue; }
  const nameErr = validateName(data.name);
  if (nameErr) errors.push(`${rel}: invalid name: ${nameErr}`);
  else if (data.name !== dirName) {
    (isUpstream ? warnings : errors).push(`${rel}: name '${data.name}' != directory '${dirName}'`);
  }
  if (!data.description || data.description.length > 1024) {
    errors.push(`${rel}: description missing/empty or > 1024 chars`);
  }
  if (data.compatibility && data.compatibility.length > 500) {
    errors.push(`${rel}: compatibility > 500 chars`);
  }
}
console.log(`Checked frontmatter of ${files.length} skills.`);
for (const e of errors) console.log(`  ERROR ${e}`);
for (const w of warnings) console.log(`  WARN ${w}`);
console.log(errors.length ? `FAIL: ${errors.length} error(s).` : 'PASS.');
process.exit(errors.length ? 1 : 0);
