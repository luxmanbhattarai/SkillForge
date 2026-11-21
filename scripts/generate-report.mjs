#!/usr/bin/env node
// generate-report.mjs — produces a coverage + audit report from the registry
// and the target skill tree. Compares what exists against the planned tree
// and reports what remains. Writes report.json and AUDIT-REPORT.md.
// Usage: node scripts/generate-report.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);

// Planned original skill tree (category -> skill names), externalized
// to scripts/lib/target-tree.json (finding L-06): the v1 plan (177
// skills) plus the 51 skills added in Phase 4, 228 in total. The
// report shows coverage against it honestly; a skill added without
// a tree entry shows up as missing coverage, not as a silent pass.
const TARGET_TREE = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'lib', 'target-tree.json'), 'utf8'));

const reg = JSON.parse(await readFile(path.join(ROOT, 'registry', 'skills.json'), 'utf8'));
const existing = new Map(reg.skills.map((s) => [s.name, s]));

const coverage = {};
let planned = 0, done = 0;
const remaining = [];
for (const [cat, names] of Object.entries(TARGET_TREE)) {
  planned += names.length;
  const have = names.filter((n) => existing.has(n) && existing.get(n).source_type === 'original');
  const missing = names.filter((n) => !have.includes(n));
  done += have.length;
  coverage[cat] = { planned: names.length, done: have.length, missing };
  for (const m of missing) remaining.push(`${cat}/${m}`);
}

const original = reg.skills.filter((s) => s.source_type === 'original').length;
const upstream = reg.skills.filter((s) => s.source_type === 'upstream').length;
const bySource = {};
for (const s of reg.skills) bySource[s.source] = (bySource[s.source] || 0) + 1;

// Run the validator and capture its verdict.
let validation = 'not run';
try {
  const { stdout } = await run('node', ['scripts/validate-skills.mjs'], { cwd: ROOT });
  validation = stdout.trim().split('\n').pop();
} catch (e) {
  validation = 'FAILED — ' + (e.stdout || e.message).trim().split('\n').pop();
}

const report = {
  // Inherit the registry's deterministic generation date (newest
  // last_verified on disk) so the report is reproducible too. The
  // fallbacks derive the same value from the registry skills, so no
  // wall-clock read remains anywhere in this generator.
  generated: reg.generated
    || reg.skills.map((s) => s.last_verified).filter(Boolean).sort().pop()
    || '2026-11-20',
  registry_version: reg.version,
  totals: { skills: reg.skills.length, original, upstream, categories: reg.categories.length },
  by_source: bySource,
  target_coverage: { planned_original: planned, done, percent: Math.round((done / planned) * 100) },
  coverage,
  remaining,
  validation,
};

await writeFile(path.join(ROOT, 'report.json'), JSON.stringify(report, null, 2) + '\n');

let md = `# Audit Report\n\nGenerated: ${report.generated} · Registry version: ${reg.version}\n\n## Totals\n\n- **Skills:** ${reg.skills.length} (${original} original, ${upstream} upstream)\n- **Categories:** ${reg.categories.length}\n- **Target coverage:** ${done}/${planned} planned original skills (${report.target_coverage.percent}%)\n- **Validation:** ${validation}\n\n## Skills by source\n\n`;
for (const [src, n] of Object.entries(bySource)) md += `- ${src}: ${n}\n`;
md += `\n## Coverage by category\n\n| Category | Done | Planned |\n| --- | --- | --- |\n`;
for (const [cat, c] of Object.entries(coverage)) md += `| ${cat} | ${c.done} | ${c.planned} |\n`;
md += `\n## Remaining planned skills (${remaining.length})\n\n`;
md += remaining.length ? remaining.map((r) => `- ${r}`).join('\n') + '\n' : 'None — the planned tree is complete.\n';
md += `\n## Known limitations\n\n- Upstream skills are imported verbatim and validated at spec level only;\n  they are exempt from this repository's section requirements.\n- Registry and report are generated artifacts: regenerate after any change\n  with \`npm run registry && npm run report\`.\n`;
await writeFile(path.join(ROOT, 'AUDIT-REPORT.md'), md);
console.log(`Report written: ${done}/${planned} planned original skills (${report.target_coverage.percent}%), ${reg.skills.length} total skills. Validation: ${validation}`);
