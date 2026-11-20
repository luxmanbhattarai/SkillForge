#!/usr/bin/env node
// check-links.mjs — checks internal Markdown links across the repository.
// External links are listed, not fetched, unless --online is passed (then a
// HEAD request verifies each unique external URL; slow and rate-limit prone).
// Usage: node scripts/check-links.mjs [--online]

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = process.argv.includes('--online');
const SKIP_DIRS = new Set(['.git', 'node_modules']);

async function findMd(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const errors = [];
const external = new Map(); // url -> [files]
let checked = 0;

for (const file of (await findMd(ROOT)).sort()) {
  const rel = path.relative(ROOT, file);
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(LINK_RE)) {
    const href = m[1];
    if (href.startsWith('#') || href.startsWith('mailto:')) continue;
    if (/^https?:\/\//.test(href)) {
      if (!external.has(href)) external.set(href, []);
      external.get(href).push(rel);
      continue;
    }
    checked++;
    const target = href.split('#')[0];
    if (!target) continue;
    if (!existsSync(path.resolve(path.dirname(file), target))) {
      errors.push(`${rel}: broken internal link: ${href}`);
    }
  }
}

if (ONLINE) {
  console.log(`Checking ${external.size} unique external URLs (HEAD requests)...`);
  for (const [url, files] of external) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (res.status >= 400) errors.push(`${url}: HTTP ${res.status} (referenced from ${files[0]})`);
    } catch (e) {
      errors.push(`${url}: unreachable (${e.cause?.code || e.message}) (referenced from ${files[0]})`);
    }
  }
}

console.log(`Checked ${checked} internal links; ${external.size} unique external URLs ${ONLINE ? 'verified' : 'listed (use --online to verify)'}.`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length ? `FAIL: ${errors.length} error(s).` : 'PASS.');
process.exit(errors.length ? 1 : 0);
