#!/usr/bin/env node
// generate-registry.mjs — rebuilds registry/*.json from the skills on disk.
// The registry is always generated, never hand-edited. Run after adding,
// removing, or renaming any skill.
// Usage: node scripts/generate-registry.mjs

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter } from './lib/frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_DIR = path.join(ROOT, 'registry');
const VERSION = '1.0.0';

// Known sources. 'original' covers skills authored in this repository.
// Upstream vendors are keyed by their skills/upstream/<vendor>/ directory.
const KNOWN_SOURCES = {
  original: { id: 'original', type: 'original', name: 'SkillForge (original)', url: '', license: 'MIT' },
  anthropic: { id: 'anthropic', type: 'upstream', name: 'Anthropic Skills', url: 'https://github.com/anthropics/skills', license: 'Apache-2.0' },
  vercel: { id: 'vercel', type: 'upstream', name: 'Vercel Agent Skills', url: 'https://github.com/vercel-labs/agent-skills', license: 'MIT' },
  superpowers: { id: 'superpowers', type: 'upstream', name: 'Superpowers', url: 'https://github.com/obra/superpowers', license: 'MIT' },
  prisma: { id: 'prisma', type: 'upstream', name: 'Prisma Skills', url: 'https://github.com/prisma/skills', license: 'MIT' },
  marketingskills: { id: 'marketingskills', type: 'upstream', name: 'Marketing Skills', url: 'https://github.com/coreyhaines31/marketingskills', license: 'MIT' },
  'agentic-seo': { id: 'agentic-seo', type: 'upstream', name: 'Agentic SEO Skill', url: 'https://github.com/pwg-projects/agentic-seo-skill', license: 'MIT' },
};

const CATEGORY_DESCRIPTIONS = {
  core: 'Software engineering fundamentals: architecture, code quality, debugging, review.',
  frontend: 'HTML, CSS, JavaScript, TypeScript, React, Next.js, Astro, Hugo, UI.',
  backend: 'Node.js, APIs, queues, caching, SDK and package development, MCP.',
  database: 'Database design, SQL, PostgreSQL/MySQL/SQLite/MongoDB, Prisma, Drizzle.',
  auth: 'Authentication, authorization, OAuth, sessions, JWT, RBAC, MFA.',
  architecture: 'Monorepos, Turborepo, modular monoliths, microservices, DDD.',
  infrastructure: 'Cloudflare, Vercel, Docker, CI/CD, deployment, observability.',
  testing: 'Unit, integration, E2E, accessibility and performance testing.',
  security: 'OWASP, XSS/CSRF/SQLi prevention, secrets, headers, auditing.',
  seo: 'Technical SEO, on-page SEO, schema, GEO/AEO, keyword research.',
  performance: 'Core Web Vitals, Lighthouse, image/JS optimization, caching.',
  content: 'Content strategy, article writing, editorial review, localization.',
  media: 'AI image generation, OG images, thumbnails, image optimization.',
  metadata: 'SEO metadata, Open Graph, Twitter Cards, social sharing.',
  documentation: 'Technical docs, API docs, changelogs, READMEs, DX.',
  upstream: 'Imported upstream skills, organized by vendor.',
};

async function findSkillFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findSkillFiles(full));
    else if (e.name === 'SKILL.md') out.push(full);
  }
  return out;
}

const skills = [];
for (const file of (await findSkillFiles(path.join(ROOT, 'skills'))).sort()) {
  const relDir = path.relative(ROOT, path.dirname(file)); // skills/<cat>/<name> or skills/upstream/<vendor>/<name>
  const parts = relDir.split(path.sep);
  const text = await readFile(file, 'utf8');
  const { raw } = splitFrontmatter(text);
  const { data } = parseFrontmatter(raw || '');
  if (!data?.name) { console.warn(`WARN: skipping ${relDir} (no frontmatter name)`); continue; }
  const isUpstream = parts[1] === 'upstream';
  const vendor = isUpstream ? parts[2] : null;
  const md = (data.metadata && typeof data.metadata === 'object') ? data.metadata : {};
  skills.push({
    name: data.name,
    description: (data.description || '').slice(0, 1024),
    path: relDir,
    category: isUpstream ? 'upstream' : parts[1],
    vendor: vendor || null,
    source_type: isUpstream ? 'upstream' : 'original',
    source: isUpstream ? vendor : 'original',
    status: 'verified',
    version: md.version || '1.0.0',
    license: data.license || (KNOWN_SOURCES[vendor]?.license ?? 'MIT'),
    maintainer: md.maintainer || md.author || (isUpstream ? vendor : 'skills-library'),
    compatibility: data.compatibility || null,
    last_verified: md.last_verified || null,
  });
}

skills.sort((a, b) => a.name.localeCompare(b.name));

// categories.json
const categories = {};
for (const s of skills) {
  categories[s.category] = categories[s.category] || { name: s.category, description: CATEGORY_DESCRIPTIONS[s.category] || '', count: 0, skills: [] };
  categories[s.category].count++;
  categories[s.category].skills.push(s.name);
}

// sources.json — only sources actually used
const usedSources = [...new Set(skills.map((s) => s.source))];
const sources = usedSources.map((id) => {
  const known = KNOWN_SOURCES[id];
  if (!known) return { id, type: 'unknown', name: id, url: '', license: '', skills: skills.filter((s) => s.source === id).map((s) => s.name) };
  return { ...known, skills: skills.filter((s) => s.source === id).map((s) => s.name) };
});

// compatibility.json — skills grouped by compatibility requirement
const compatibility = {};
for (const s of skills) {
  const key = s.compatibility || 'any agent implementing the Agent Skills standard';
  compatibility[key] = compatibility[key] || [];
  compatibility[key].push(s.name);
}

// versions.json
const versions = { registry_version: VERSION, generated: new Date().toISOString().slice(0, 10), skills: {} };
for (const s of skills) versions.skills[s.name] = s.version;

await mkdir(REGISTRY_DIR, { recursive: true });
const write = (name, obj) => writeFile(path.join(REGISTRY_DIR, name), JSON.stringify(obj, null, 2) + '\n');
await write('skills.json', {
  name: 'skillforge',
  version: VERSION,
  generated: new Date().toISOString().slice(0, 10),
  categories: Object.keys(categories).sort(),
  total_skills: skills.length,
  skills,
});
await write('categories.json', { version: VERSION, categories: Object.values(categories).sort((a, b) => a.name.localeCompare(b.name)) });
await write('sources.json', { version: VERSION, sources });
await write('compatibility.json', { version: VERSION, compatibility });
await write('versions.json', versions);

console.log(`Registry generated: ${skills.length} skills, ${Object.keys(categories).length} categories, ${sources.length} sources.`);
for (const c of Object.values(categories).sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`  ${c.name}: ${c.count}`);
}
