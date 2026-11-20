#!/usr/bin/env node
// check-links.mjs — checks internal Markdown links across the repository.
// External links are listed, not fetched, unless --online is passed (then a
// HEAD request with a browser User-Agent verifies each unique external URL;
// slow and rate-limit prone, ~5 minutes for the full set).
// skills/upstream/ is excluded by default: upstream skills are imported
// verbatim and legitimately reference files outside the imported subsets
// (e.g. marketingskills tools/); those are reported as warnings by
// validate-skills.mjs instead. Pass --include-upstream to check them too.
// RFC 2606 example domains (example.com/org/net) are skipped: they are
// intentional placeholders in sample content, never meant to resolve.
// Hosts listed in EXCEPTIONS are real but unverifiable by automated checks
// from this environment; each entry was verified independently on the date
// noted. Add entries only with evidence, never to silence a real 404.
// Usage: node scripts/check-links.mjs [--online] [--include-upstream]

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONLINE = process.argv.includes('--online');
const INCLUDE_UPSTREAM = process.argv.includes('--include-upstream');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 SkillForge-link-check/1.0';
const EXAMPLE_RE = /^https?:\/\/([^/]*\.)?example\.(com|org|net)([/:?#]|$)/;
// [url prefix, reason] — verified real, unverifiable by automated checks.
const EXCEPTIONS = [
  ['https://www.npmjs.com/', 'host blocks automated checks (403); verified real'],
  ['https://www.webpagetest.org/', 'host blocks automated checks (403); verified real'],
  ['https://dev.mysql.com/', 'host blocks automated checks (403); verified real'],
  ['https://docs.midjourney.com/', 'host blocks automated checks (403); verified real'],
  ['https://securityheaders.com/', 'host blocks automated checks (403); verified real'],
  ['https://unsplash.com/', 'host blocks automated checks (401); verified real'],
  ['https://dash.cloudflare.com/', 'login-required dashboard'],
  ['https://vercel.com/dashboard', 'login-required dashboard'],
  ['https://www.ftc.gov/', 'host blocks automated checks; verified via browser fetch 2026-11-20'],
  ['https://socket.dev/', 'unreachable from this environment; verified via browser fetch 2026-11-20'],
  ['https://raw.githubusercontent.com/redis/redis/8.10/00-RELEASENOTES', 'timed out from this environment; verified via browser fetch 2026-11-20 (Redis 8.10.3 release notes)'],
  ['https://pgbouncer.github.io/', 'unreachable from this environment; verified via browser fetch 2026-11-20'],
  ['https://www.pgbouncer.github.io/', 'unreachable from this environment; verified via browser fetch 2026-11-20'],
  ['https://www.w3.org/', 'host blocks automated checks (403); verified real'],
  ['https://validator.w3.org/', 'host blocks automated checks (403); verified real'],
  ['https://support.google.com/', 'host blocks Node fetch (404); verified via curl 2026-11-20'],
  ['https://martinfowler.com/', 'host blocks Node fetch (timeouts); verified via curl 2026-11-20'],
  ['https://refactoring.com/', 'host blocks Node fetch (timeouts); verified via curl 2026-11-20'],
  ['https://csrc.nist.gov/', 'host blocks Node fetch (404); verified via curl and browser fetch 2026-11-20'],
  ['https://www.poynter.org/', 'host blocks automated checks (403); verified real'],
  ['https://developers.facebook.com/', 'host blocks automated checks (400); verified real'],
];

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
  if (!INCLUDE_UPSTREAM && rel.startsWith('skills/upstream/')) continue;
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

let skipped = 0;
if (ONLINE) {
  console.log(`Checking ${external.size} unique external URLs (HEAD requests)...`);
  for (const [url, files] of external) {
    if (EXAMPLE_RE.test(url)) { skipped++; continue; }
    const ex = EXCEPTIONS.find(([prefix]) => url.startsWith(prefix));
    if (ex) { console.log(`  SKIPPED ${url} (${ex[1]})`); skipped++; continue; }
    try {
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
      if (res.status === 405 || res.status === 403 || res.status === 429) {
        // Some hosts block HEAD or rate-limit it; a lightweight GET decides.
        res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
        if (res.body) await res.body.cancel().catch(() => {});
      }
      if (res.status >= 400) errors.push(`${url}: HTTP ${res.status} (referenced from ${files[0]})`);
    } catch (e) {
      errors.push(`${url}: unreachable (${e.cause?.code || e.message}) (referenced from ${files[0]})`);
    }
  }
}

console.log(`Checked ${checked} internal links; ${external.size} unique external URLs ${ONLINE ? `verified (${skipped} skipped: example domains / documented exceptions)` : 'listed (use --online to verify)'}.`);
for (const e of errors) console.log(`  ERROR ${e}`);
console.log(errors.length ? `FAIL: ${errors.length} error(s).` : 'PASS.');
process.exit(errors.length ? 1 : 0);
