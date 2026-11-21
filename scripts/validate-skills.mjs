#!/usr/bin/env node
// validate-skills.mjs — validates every SKILL.md in skills/.
//
// Two profiles:
//   original  — full repository standard (frontmatter + all required sections)
//   upstream  — Agent Skills spec compliance only (name/description/dir match);
//               upstream files are never edited, so issues are warnings.
//
// Usage:
//   node scripts/validate-skills.mjs [--filter <path-prefix>] [--strict]
// Exit code 1 if any error is found. --strict also fails on warnings
// on original skills. Upstream warnings never fail, even in strict
// mode: upstream files are never edited, so an upstream warning is
// informational by policy (see ai/decisions/2026-11-20-validate-strict-upstream-warnings.md).

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFrontmatter, parseFrontmatter, validateName } from './lib/frontmatter.mjs';
import { toPosixPath } from './lib/paths.mjs';
// Shared skill-file discovery and constants (A2-18): one copy of
// findSkillFiles, REQUIRED_SECTIONS, and the placeholder regexes
// for all the check scripts, so a fix in one place cannot miss
// the others (as the W-3/A2-14 path bugs did).
import {
  findSkillFiles,
  REQUIRED_SECTIONS,
  PLACEHOLDER_ACRONYM_RE,
  PLACEHOLDER_PHRASE_RE,
} from './lib/skill-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const REL_LINK_RE = /\[[^\]]*\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;

const args = process.argv.slice(2);
const filterIdx = args.indexOf('--filter');
const FILTER = filterIdx >= 0 ? args[filterIdx + 1] : null;
const STRICT = args.includes('--strict');

/**
 * Does the repo-relative path `rel` match the --filter prefix?
 * Both sides are normalized to POSIX separators first (A2-14):
 * path.relative returns backslashes on Windows while the
 * documented filter form is POSIX, so an unnormalized prefix
 * match silently checked zero skills there. Exported for testing
 * (a Windows-style path can be fed in on POSIX).
 */
export function matchesFilter(rel, filter) {
  if (!filter) return true;
  const prefix = toPosixPath(filter).replace(/^\.\//, '');
  return toPosixPath(rel).startsWith(prefix);
}

function headings(body) {
  const found = new Set();
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) found.add(m[1].trim());
  }
  return found;
}

// Registry/disk consistency, exported for testing. Registry paths are
// always POSIX; disk paths use platform separators, so on Windows
// path.relative returns backslashes and every skill mismatches unless
// disk paths are normalized first (PR #1: the Windows leg failed with
// 277 "registry lists missing skill" errors for exactly this reason).
export function findRegistryMismatches(regPaths, diskPaths) {
  const reg = new Set(regPaths);
  const disk = new Set([...diskPaths].map((p) => toPosixPath(p)));
  const errors = [];
  for (const p of reg) if (!disk.has(p)) errors.push(`registry lists missing skill: ${p}`);
  for (const p of disk) if (!reg.has(p)) errors.push(`skill on disk missing from registry: ${p}`);
  return errors;
}

async function main() {
  const errors = [];
  const warnings = []; // non-upstream warnings (fail --strict)
  const upstreamWarnings = []; // upstream warnings (informational, never fail)
  const names = new Map(); // name -> [paths]
  let checked = 0, original = 0, upstream = 0;

  const files = (await findSkillFiles(SKILLS_DIR)).sort();
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (!matchesFilter(rel, FILTER)) continue;
    checked++;
    const parts = rel.split(path.sep); // skills/<category>/<name>/SKILL.md
    const isUpstream = parts[1] === 'upstream';
    if (isUpstream) upstream++; else original++;
    const dirName = parts[parts.length - 2];
    const text = await readFile(file, 'utf8');
    // Line count that agrees with `wc -l`: split() counts a trailing
    // newline as an extra empty line (audit finding L-01).
    const lineCount = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    const err = (msg) => errors.push(`${rel}: ${msg}`);
    const warn = (msg) => (isUpstream ? upstreamWarnings : warnings).push(`${rel}: ${msg}`);

    if (lineCount > 800) err(`SKILL.md is ${lineCount} lines (hard limit 800; keep under 500)`);
    else if (lineCount > 500) warn(`SKILL.md is ${lineCount} lines (recommended max 500)`);

    const { raw, body, error: splitErr } = splitFrontmatter(text);
    if (splitErr) { err(splitErr); continue; }
    const { data, error: parseErr } = parseFrontmatter(raw);
    if (parseErr) { err(parseErr); continue; }

    // --- name ---
    const nameErr = validateName(data.name);
    if (nameErr) err(`invalid name: ${nameErr}`);
    else {
      if (data.name !== dirName) {
        (isUpstream ? warn : err)(`name '${data.name}' does not match directory '${dirName}'`);
      }
      if (!names.has(data.name)) names.set(data.name, []);
      names.get(data.name).push(rel);
    }

    // --- description ---
    if (typeof data.description !== 'string' || data.description.trim().length === 0) {
      err('missing or empty description');
    } else if (data.description.length > 1024) {
      (isUpstream ? warn : err)(`description is ${data.description.length} chars (max 1024)`);
    }

    // --- license / compatibility ---
    if (!isUpstream && !data.license) err('missing license (original skills must declare one)');
    if (data.compatibility && data.compatibility.length > 500) {
      err(`compatibility is ${data.compatibility.length} chars (max 500)`);
    }

    // --- metadata (original only) ---
    if (!isUpstream) {
      const md = data.metadata;
      if (!md || typeof md !== 'object') err('missing metadata map');
      else {
        for (const k of ['version', 'category', 'maintainer', 'source', 'last_verified']) {
          if (!md[k]) err(`metadata.${k} is missing`);
        }
        if (md.category && md.category !== parts[1]) err(`metadata.category '${md.category}' does not match directory category '${parts[1]}'`);
        if (md.source && md.source !== 'original') err(`metadata.source must be 'original' for skills outside skills/upstream/`);
        if (md.last_verified && !/^\d{4}-\d{2}-\d{2}$/.test(md.last_verified)) err(`metadata.last_verified '${md.last_verified}' is not YYYY-MM-DD`);
      }
    }

    // --- body: required sections (original only) ---
    if (!isUpstream) {
      const found = headings(body);
      for (const section of REQUIRED_SECTIONS) {
        if (!found.has(section)) err(`missing required section '## ${section}'`);
      }
      if (body.trim().length < 2000) err('body is suspiciously short (< 2000 chars)');
    }

    // --- placeholders (all) ---
    const ph = body.match(PLACEHOLDER_ACRONYM_RE) || body.match(PLACEHOLDER_PHRASE_RE);
    if (ph) (isUpstream ? warn : err)(`placeholder marker found: '${ph[0]}'`);

    // --- relative file references resolve (all) ---
    for (const m of body.matchAll(REL_LINK_RE)) {
      const target = m[1].split('#')[0];
      if (!target) continue;
      if (!existsSync(path.resolve(path.dirname(file), target))) {
        (isUpstream ? warn : err)(`broken relative link: ${target}`);
      }
    }
  }

  // --- duplicate names ---
  for (const [name, paths] of names) {
    if (paths.length > 1) errors.push(`duplicate skill name '${name}':\n    ${paths.join('\n    ')}`);
  }

  // --- registry consistency ---
  const registryPath = path.join(ROOT, 'registry', 'skills.json');
  if (existsSync(registryPath) && !FILTER) {
    try {
      const reg = JSON.parse(await readFile(registryPath, 'utf8'));
      const regPaths = new Set((reg.skills || []).map((s) => s.path));
      const diskPaths = new Set(files.map((f) => path.relative(ROOT, path.dirname(f))));
      errors.push(...findRegistryMismatches(regPaths, diskPaths));
    } catch (e) {
      errors.push(`registry/skills.json is not valid JSON: ${e.message}`);
    }
  }

  const totalWarnings = warnings.length + upstreamWarnings.length;
  // The summary line must agree with the exit code: a strict-mode
  // failure on warnings is a FAIL, not a PASS.
  const failed = errors.length > 0 || (STRICT && warnings.length > 0);
  console.log(`Checked ${checked} skills (${original} original, ${upstream} upstream).`);
  for (const w of warnings) console.log(`  WARN  ${w}`);
  for (const w of upstreamWarnings) console.log(`  WARN (upstream)  ${w}`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  console.log(!failed
    ? (totalWarnings
      ? `PASS with ${totalWarnings} warning(s)${upstreamWarnings.length ? ` (${upstreamWarnings.length} upstream, informational)` : ''}.`
      : 'PASS: all skills valid.')
    : `FAIL: ${errors.length} error(s), ${totalWarnings} warning(s).`);
  // exitCode, not process.exit(): a hard exit discards pending piped
  // stdout. Natural exit flushes it first (see validate-registry.mjs).
  process.exitCode = failed ? 1 : 0;
}

// Main guard (same idiom as evals/runners/run-evals.mjs): importing
// this module for findRegistryMismatches must not run the suite.
const invokedAsScript = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) main();
