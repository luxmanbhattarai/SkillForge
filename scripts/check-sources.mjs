#!/usr/bin/env node
// check-sources.mjs — validates provenance records in registry/sources.json
// and registry/skills.json: every skill has a known source, every source has
// a URL and license, and verification dates are not stale (> 180 days).
// With --online, source URLs are HEAD-checked through check-links.mjs's
// fetchWithRetry, so redirects get the same SSRF guard (A5-06).
// Usage: node scripts/check-sources.mjs [--online]

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// NOTE: fetchWithRetry (check-links.mjs) is imported dynamically
// inside the --online branch, not statically: the offline path —
// including fixture repos that copy this script alone — must not
// require the sibling module to exist.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = process.argv.includes('--online');
export const STALE_DAYS = 180;

/**
 * The last_verified warning for one skill, or null when the date is
 * fine. A missing date warns; an unparseable date warns too (A2-21)
 * — it used to produce a NaN age, and `NaN > 180` is false, so a
 * malformed date passed silently while a missing one warned.
 * Exported for testing.
 */
export function lastVerifiedWarning(skill, { staleDays = STALE_DAYS, nowMs = Date.now() } = {}) {
  if (!skill.last_verified) return `${skill.name}: no last_verified date`;
  const age = (nowMs - new Date(skill.last_verified).getTime()) / 86400000;
  if (Number.isNaN(age)) return `${skill.name}: last_verified '${skill.last_verified}' is not a valid date`;
  if (age > staleDays) return `${skill.name}: last_verified ${skill.last_verified} is ${Math.floor(age)} days old (stale)`;
  return null;
}

async function main() {
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
    const dateWarning = lastVerifiedWarning(s);
    if (dateWarning) warnings.push(dateWarning);
  }

  if (ONLINE) {
    // fetchWithRetry (A5-06): redirects are followed manually with
    // the localhost/private-IP guard; a refused redirect throws
    // and is reported as an error, never fetched. Loaded
    // dynamically — see the NOTE at the top of this file.
    const { fetchWithRetry } = await import('./check-links.mjs');
    for (const src of sourcesReg.sources || []) {
      if (!src.url) continue;
      try {
        const res = await fetchWithRetry(src.url, { method: 'HEAD' });
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
  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout. Natural exit flushes it first (see validate-registry.mjs).
  process.exitCode = errors.length ? 1 : 0;
}

// Main guard (same idiom as check-links.mjs): importing this module
// for lastVerifiedWarning must not run the check.
const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`Source check failed: ${e.message}`);
    process.exit(2);
  });
}
