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

// Planned original skill tree (category -> skill names). This is the v1 target;
// the report shows coverage against it honestly.
const TARGET_TREE = {
  core: ['software-architecture', 'clean-code', 'design-patterns', 'debugging', 'code-review', 'refactoring', 'tdd', 'security', 'performance', 'technical-decision-records', 'engineering-standards'],
  frontend: ['html', 'semantic-html', 'css', 'modern-css', 'responsive-design', 'javascript', 'typescript', 'react', 'nextjs', 'astro', 'hugo', 'tailwind-css', 'shadcn-ui', 'accessibility', 'ui-design', 'frontend-performance'],
  backend: ['nodejs', 'api-design', 'rest-api', 'graphql', 'trpc', 'hono', 'background-jobs', 'queues', 'caching', 'rate-limiting', 'sdk-development', 'package-development', 'mcp-development'],
  database: ['database-design', 'postgresql', 'mysql', 'sqlite', 'mongodb', 'prisma', 'drizzle', 'sql-optimization', 'indexing', 'migrations', 'transactions', 'connection-pooling', 'backup-recovery', 'database-security'],
  auth: ['better-auth', 'oauth', 'authentication', 'authorization', 'jwt', 'session-management', 'rbac', 'multi-tenancy', 'mfa', 'auth-security'],
  architecture: ['monorepo', 'pnpm-workspaces', 'turborepo', 'modular-monolith', 'microservices', 'domain-driven-design', 'package-boundaries', 'dependency-management', 'system-design'],
  infrastructure: ['cloudflare', 'cloudflare-workers', 'cloudflare-d1', 'cloudflare-r2', 'cloudflare-kv', 'cloudflare-queues', 'durable-objects', 'vercel', 'docker', 'github-actions', 'ci-cd', 'deployment', 'observability'],
  testing: ['unit-testing', 'integration-testing', 'e2e-testing', 'vitest', 'playwright', 'accessibility-testing', 'performance-testing', 'regression-testing'],
  security: ['owasp', 'xss-prevention', 'csrf-protection', 'sql-injection-prevention', 'secrets-management', 'dependency-security', 'secure-headers', 'security-auditing'],
  seo: ['seo-audit', 'on-page-seo', 'technical-seo', 'off-page-seo', 'keyword-research', 'keyword-clustering', 'search-intent', 'serp-analysis', 'competitor-analysis', 'content-gap-analysis', 'internal-linking', 'schema-jsonld', 'structured-data', 'geo-optimization', 'aeo-optimization', 'llm-seo', 'llms-txt', 'sitemap-robots', 'canonical-management', 'hreflang', 'international-seo', 'programmatic-seo', 'local-seo', 'image-seo', 'seo-migration', 'eeat', 'search-console'],
  performance: ['core-web-vitals', 'lighthouse', 'pagespeed-insights', 'image-optimization', 'javascript-optimization', 'caching-strategy', 'bundle-optimization', 'web-performance-audit'],
  content: ['content-strategy', 'keyword-to-content', 'article-writing', 'blog-writing', 'seo-content-writing', 'content-brief', 'content-research', 'technical-writing', 'copywriting', 'fact-checking', 'human-editing', 'eeat-writing', 'content-refresh', 'content-localization', 'content-repurposing', 'faq-generation', 'editorial-review'],
  media: ['ai-image-generation', 'image-prompt-engineering', 'blog-featured-images', 'og-image-generation', 'twitter-card-images', 'social-preview', 'youtube-thumbnails', 'infographic-generation', 'image-compression', 'image-format-conversion', 'image-accessibility', 'brand-visual-consistency'],
  metadata: ['seo-metadata', 'open-graph', 'twitter-cards', 'dynamic-metadata', 'social-sharing', 'metadata-validation'],
  documentation: ['technical-documentation', 'api-documentation', 'changelog-management', 'readme-engineering', 'developer-experience'],
};

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
  generated: new Date().toISOString().slice(0, 10),
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
