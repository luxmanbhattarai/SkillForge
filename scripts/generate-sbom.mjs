#!/usr/bin/env node
// generate-sbom.mjs — generate a CycloneDX-style SBOM for the
// SkillForge repository.
//
// The repo has zero npm dependencies and no lockfile, so there is
// no dependency tree to inventory. What a consumer of a SkillForge
// release actually needs to verify is (a) the contents of the
// release archive itself and (b) the pinned GitHub Actions that
// built and validated it. This script covers both:
//
//   - one `file` component per tracked file in the release tree
//     (the exact set `git ls-files` reports — the same tree GitHub
//     archives for a release), each with its SHA-256 hash;
//   - one `library` component per pinned GitHub Action used by any
//     workflow in .github/workflows/, with its pinned commit SHA
//     (and tag, when the workflow records one in a comment).
//
// Output is a single CycloneDX 1.5 JSON document. The component
// hashes are the stable, verifiable part: the same tree always
// produces the same hashes. The document timestamp varies per run
// by design; verify releases by comparing component hashes, not by
// diffing whole SBOM files byte-for-byte.
//
// Usage:
//   node scripts/generate-sbom.mjs [--out <file>] [--root <dir>]
//   --out   write to this file (default: <root>/sbom.json)
//   --root  repository root to inventory (default: this repo)
// Exit code 0 on success, 2 on error (bad root, unreadable file).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
export const SBOM_TOOL_VERSION = '1.0.0';
export const SBOM_SPEC_VERSION = '1.5';

export async function hashFile(absPath) {
  const hash = createHash('sha256');
  const data = await readFile(absPath);
  hash.update(data);
  return hash.digest('hex');
}

// The release tree is exactly the tracked file set: `git ls-files`
// reports it, and it is what GitHub archives for a release tag.
// When git is unavailable (or the directory is not a checkout),
// fall back to a filesystem walk that skips .git and node_modules.
// Either way the result is a sorted list of forward-slash relative
// paths, so output is deterministic.
export async function collectFiles(root) {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'buffer', timeout: 30000 });
    const files = out.toString('utf8').split('\0').filter(Boolean).sort();
    if (files.length > 0) return files;
  } catch {
    // Not a git checkout, or git unavailable: fall through to the walk.
  }
  const found = [];
  async function walk(dir, rel) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      const childAbs = path.join(dir, e.name);
      if (e.isDirectory()) await walk(childAbs, childRel);
      else if (e.isFile()) found.push(childRel);
      else {
        // Symlinks and special files: follow only symlinks whose
        // resolved target is a regular file inside the tree. A link
        // pointing outside the tree, or to a non-file, is skipped —
        // hashing it would inventory content that is not in the
        // release. (The git path above is the normal case; symlinks
        // only matter for the non-git fallback.)
        const st = await lstat(childAbs).catch(() => null);
        if (st && st.isSymbolicLink()) {
          try {
            const real = await realpath(childAbs);
            const rootReal = await realpath(root);
            if (real === rootReal || real.startsWith(rootReal + path.sep)) {
              const targetStat = await lstat(real);
              if (targetStat.isFile()) found.push(childRel);
            }
          } catch { /* dangling or unreadable: skip */ }
        }
      }
    }
  }
  await walk(root, '');
  return found.sort();
}

// Parse `uses:` lines out of one workflow file's text. Returns
// [{ owner, repo, subpath, ref, tag, workflow }] where ref is the
// pinned value after @ (a full commit SHA in this repo), tag is the
// version recorded in a trailing comment, e.g. "# v7.0.1", and
// subpath is the action's path inside its repo, e.g. "/upload-sarif"
// for github/codeql-action/upload-sarif ("" when the action is the
// repo root). Local actions (./...) and docker:// actions are not
// GitHub Actions and are skipped.
export function parseWorkflowActions(content, workflow) {
  const actions = [];
  const re = /^\s*(?:-\s*)?uses:\s*([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)((?:\/[A-Za-z0-9_.-]+)*)@(\S+?)\s*(?:#\s*(\S+))?\s*$/gm;
  for (const m of content.matchAll(re)) {
    const [, owner, repo, subpath, ref, tag] = m;
    actions.push({ owner, repo, subpath: subpath || '', ref, tag: tag || null, workflow });
  }
  return actions;
}

async function collectActions(root) {
  const workflowsDir = path.join(root, '.github', 'workflows');
  const files = (await readdir(workflowsDir).catch(() => [])).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
  const byRef = new Map();
  for (const f of files) {
    const content = await readFile(path.join(workflowsDir, f), 'utf8');
    for (const a of parseWorkflowActions(content, `.github/workflows/${f}`)) {
      const key = `${a.owner}/${a.repo}${a.subpath}@${a.ref}`;
      if (!byRef.has(key)) byRef.set(key, { ...a, workflows: [a.workflow] });
      else if (!byRef.get(key).workflows.includes(a.workflow)) byRef.get(key).workflows.push(a.workflow);
    }
  }
  return [...byRef.values()].sort((a, b) => (`${a.owner}/${a.repo}` < `${b.owner}/${b.repo}` ? -1 : 1));
}

function fileComponent(relPath, sha256, size) {
  return {
    type: 'file',
    'bom-ref': `file:${relPath}`,
    name: relPath,
    hashes: [{ alg: 'SHA-256', content: sha256 }],
    properties: [{ name: 'skillforge:size-bytes', value: String(size) }],
  };
}

function actionComponent(a) {
  const name = `${a.owner}/${a.repo}${a.subpath}`;
  return {
    type: 'library',
    'bom-ref': `github-actions:${name}@${a.ref}`,
    name,
    version: a.ref,
    description: `Pinned GitHub Action used by ${a.workflows.join(', ')}`,
    purl: `pkg:github/${a.owner}/${a.repo}@${a.ref}`,
    externalReferences: [{ type: 'vcs', url: `https://github.com/${a.owner}/${a.repo}` }],
    properties: [
      { name: 'skillforge:pinned-sha', value: a.ref },
      ...(a.tag ? [{ name: 'skillforge:tag', value: a.tag }] : []),
      ...(a.subpath ? [{ name: 'skillforge:subpath', value: a.subpath }] : []),
      { name: 'skillforge:used-by', value: a.workflows.join(', ') },
    ],
  };
}

// Build the SBOM document for a repository root. Pure (no writes):
// tests call this directly; the CLI writes the result.
export async function generateSbom(root) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const files = await collectFiles(root);
  const fileComponents = [];
  let totalBytes = 0;
  for (const rel of files) {
    const abs = path.join(root, ...rel.split('/'));
    const data = await readFile(abs);
    const sha256 = createHash('sha256').update(data).digest('hex');
    totalBytes += data.length;
    fileComponents.push(fileComponent(rel, sha256, data.length));
  }
  const actions = await collectActions(root);
  const actionComponents = actions.map(actionComponent);

  let gitCommit = null;
  try {
    gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: 5000 }).trim() || null;
  } catch { /* not a checkout: leave null */ }

  return {
    bomFormat: 'CycloneDX',
    specVersion: SBOM_SPEC_VERSION,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'SkillForge', name: 'generate-sbom.mjs', version: SBOM_TOOL_VERSION }],
      component: {
        type: 'application',
        'bom-ref': `${pkg.name}@${pkg.version}`,
        name: pkg.name,
        version: pkg.version,
        description: pkg.description || undefined,
        licenses: pkg.license ? [{ license: { id: pkg.license } }] : undefined,
        externalReferences: [
          { type: 'website', url: pkg.homepage || `https://github.com/luxmanbhattarai/SkillForge` },
          { type: 'vcs', url: 'https://github.com/luxmanbhattarai/SkillForge' },
        ],
      },
      properties: [
        { name: 'skillforge:npm-dependencies', value: '0' },
        { name: 'skillforge:files', value: String(files.length) },
        { name: 'skillforge:total-bytes', value: String(totalBytes) },
        { name: 'skillforge:github-actions', value: String(actions.length) },
        ...(gitCommit ? [{ name: 'skillforge:git-commit', value: gitCommit }] : []),
      ],
    },
    components: [...fileComponents, ...actionComponents],
  };
}

const args = process.argv.slice(2);
function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log([
      'Usage: node scripts/generate-sbom.mjs [--out <file>] [--root <dir>]',
      '',
      'Generates a CycloneDX 1.5 SBOM for the repository: one file component',
      'with a SHA-256 hash per tracked file, plus one component per pinned',
      'GitHub Action. Default output: <root>/sbom.json.',
    ].join('\n'));
    return;
  }
  const root = flagValue('--root') ? path.resolve(flagValue('--root')) : DEFAULT_ROOT;
  const out = flagValue('--out') ? path.resolve(flagValue('--out')) : path.join(root, 'sbom.json');
  let sbom;
  try {
    sbom = await generateSbom(root);
  } catch (e) {
    console.error(`SBOM generation failed: ${e.message}`);
    process.exitCode = 2;
    return;
  }
  await writeFile(out, JSON.stringify(sbom, null, 2) + '\n', 'utf8');
  const files = sbom.metadata.properties.find((p) => p.name === 'skillforge:files').value;
  const actions = sbom.metadata.properties.find((p) => p.name === 'skillforge:github-actions').value;
  console.log(`SBOM written to ${out}: ${files} files, ${actions} pinned GitHub Actions, 0 npm dependencies.`);
}

const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  main().catch((e) => {
    console.error(`SBOM generation failed: ${e.message}`);
    process.exitCode = 2;
  });
}
