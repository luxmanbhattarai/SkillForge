#!/usr/bin/env node
// security-scan.mjs — lightweight static scan over the repository for
// exposed credentials, suspicious shell commands, and prompt-injection
// markers in imported content. This is a smoke screen, not a full SAST
// tool: anything it flags needs human review.
// Usage: node scripts/security-scan.mjs

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);

const PATTERNS = [
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key material'],
  [/(?:sk-|ghp_|gho_|github_pat_|xox[baprs]-)[A-Za-z0-9]{10,}/, 'possible API/token secret'],
  [/(?:api[_-]?key|secret|password)\s*[:=]\s*['"][^'"]{8,}['"]/i, 'possible hardcoded credential (verify: placeholders like $VAR are fine)'],
  [/curl\s+[^|]*\|\s*(?:sudo\s+)?(?:sh|bash)\b/, 'curl-piped-to-shell command'],
  [/rm\s+-rf\s+(\/|\$HOME|~)/, 'destructive rm -rf'],
  [/ignore (all )?previous instructions/i, 'prompt-injection marker'],
  [/disregard (all )?(prior|previous|above) instructions/i, 'prompt-injection marker'],
];

async function findFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findFiles(full));
    else if (/\.(md|mjs|js|sh|py|json|yml|yaml)$/.test(e.name)) out.push(full);
  }
  return out;
}

const findings = [];
for (const file of (await findFiles(ROOT)).sort()) {
  const rel = path.relative(ROOT, file);
  const text = await readFile(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    for (const [re, label] of PATTERNS) {
      if (re.test(line)) findings.push(`${rel}:${idx + 1}: ${label}`);
    }
  });
}
console.log(`Scanned repository for credential / injection patterns.`);
for (const f of findings) console.log(`  FINDING ${f}`);
console.log(findings.length ? `REVIEW NEEDED: ${findings.length} finding(s).` : 'PASS: no findings.');
process.exit(findings.length ? 1 : 0);
