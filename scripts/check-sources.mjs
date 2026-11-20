#!/usr/bin/env node
// check-sources.mjs — validates provenance records in registry/sources.json
// and registry/skills.json: every skill has a known source, every source has
// a URL and license, and verification dates are not stale (> 180 days).
// With --online, source URLs are HEAD-checked.
// Usage: node scripts/check-sources.mjs [--online]

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = process.argv.includes('--online');
const STALE_DAYS = 180;

const errors = [];
const warnings = [];
const skillsReg = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));
const sourcesReg = JSON.parse(await readFile(path.join(ROOT, 'registry', 'sources.json'), 'utf8'));
const sourcesById = new Map((sourcesReg.sources || []).map((s) => [s.id, s]));

for (const s of skillsReg.skills || []) {
  if (!s.source) { errors.push(`${s.name}: no source recorded`); continue; }
  const src = sourcesById.get(s.source);
  if (!src) { errors.push(`${s.name}: unknown source id '${s.source}'`); continue; }
  if (!src.url) warnings.push(`${s.name}: source '${s.source}' has no URL`);
  if (!src.license) warnings.push(`${s.name}: source '${s.source}' has no license recorded`);
  if (s.last_verified) {
    const age = (Date.now() - new Date(s.last_verified).getTime()) / 86400000;
    if (age > STALE_DAYS) warnings.push(`${s.name}: last_verified ${s.last_verified} is ${Math.floor(age)} days old (stale)`);
  } else {
    warnings.push(`${s.name}: no last_verified date`);
  }
}

if (ONLINE) {
  for (const src of sourcesReg.sources || []) {
    if (!src.url) continue;
    try {
      const res = await fetch(src.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (res.status >= 400) errors.push(`source '${src.id}': ${src.url} -> HTTP ${res.status}`);
    } catch (e) {
      errors.push(`source '${src.id}': ${src.url} unreachable (${e.cause?.code || e.message})`);
    }
  }
}

console.log(`Checked ${(skillsReg.skills || []).length} skills against ${(sourcesReg.sources || []).length} sources.`);
for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length ? `FAIL: ${errors.length} error(s), ${warnings.length} warning(s).` : `PASS with ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
