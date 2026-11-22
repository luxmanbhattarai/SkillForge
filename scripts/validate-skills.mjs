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
//
// Progressive disclosure (docs/PROGRESSIVE-DISCLOSURE.md): where a
// skill uses references/, scripts/, assets/ or examples/, this
// validator checks the structure — disclosure files must be linked
// from SKILL.md (warning when orphaned), and paths the body points
// at must exist (error for original skills). Unmigrated skills
// remain valid: a single-file skill is never failed for lacking
// disclosure folders, and the 300-line budget is a standard target
// measured by scripts/disclosure-coverage.mjs, not a validator rule.
// Only a body over 500 lines without any disclosure folder earns a
// warning suggesting the split.
//
// Hardcoded version dates (Finding 4): a body that states a version
// fact as "as of YYYY-MM-DD" fails (original) or warns (upstream).
// Frontmatter last_verified is the single source of truth for
// freshness and is exempt by construction (only the body is scanned);
// ai/audits/* historical reports and CHANGELOG.md are out of scope
// because this validator only scans skills/.

import { readdir, readFile } from 'node:fs/promises';
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

// Progressive-disclosure folders (docs/PROGRESSIVE-DISCLOSURE.md).
// `reference/` (singular) is deliberately NOT listed: it is an
// upstream layout, and upstream skills are exempt from this
// repository's disclosure standard.
export const DISCLOSURE_DIRS = ['references', 'scripts', 'assets', 'examples'];

// Hardcoded version-fact dates: "as of YYYY-MM-DD", where the words
// may wrap across lines ("as\nof 2026-11-20" is the same hardcoded
// date — 16 of the 110 occurrences in the library are wrapped, and
// a single-line grep misses them). Exported for testing.
const AS_OF_DATE_RE = /as\s+of\s+(\d{4}-\d{2}-\d{2})/g;

// Find hardcoded "as of YYYY-MM-DD" dates in a skill body.
// Returns [{ line, date }] with the 1-based line of the DATE.
// `lineOffset` is the number of lines before the body in the file
// (the frontmatter block): callers add it so reported lines are
// FILE lines, not body-relative lines.
export function findHardcodedAsOfDates(body, lineOffset = 0) {
  const out = [];
  for (const m of body.matchAll(AS_OF_DATE_RE)) {
    const dateIndex = m.index + m[0].indexOf(m[1]);
    const line = body.slice(0, dateIndex).split('\n').length + lineOffset;
    out.push({ line, date: m[1] });
  }
  return out;
}

// Bare disclosure-path mentions: references/…, scripts/…, assets/…,
// examples/… outside fenced code blocks. Fenced blocks are excluded
// because they are extended examples whose paths may be illustrative
// (package-boundaries shows a hypothetical scripts/check-boundaries.mjs
// in a code comment); inline code spans are KEPT, because a backticked
// `scripts/foo.sh` in prose is a reference. The lookbehind excludes
// URL contexts (https://example.com/assets/… must not match) and the
// trailing-punctuation strip keeps "see references/guide.md." from
// resolving to "guide.md.". Markdown links are handled separately
// by the REL_LINK_RE check; this catches the prose/backticked form.
// Returns [{ target, line }]. Exported for testing.
const DISCLOSURE_MENTION_RE = /(?<![A-Za-z0-9_./:-])(references|scripts|assets|examples)\/[A-Za-z0-9_][A-Za-z0-9_./-]*/g;
export function extractDisclosureMentions(body, lineOffset = 0) {
  // Line-by-line with fence tracking (not strip + re-split:
  // removing lines would shift every later line number).
  // `lineOffset` is the number of lines before the body in the file
  // (the frontmatter block); see findHardcodedAsOfDates.
  const out = [];
  const lines = body.split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    for (const m of line.matchAll(DISCLOSURE_MENTION_RE)) {
      out.push({ target: m[0].replace(/[.,;:)]+$/, ''), line: i + 1 + lineOffset });
    }
  }
  return out;
}

// Relative markdown-link targets in a body (no anchors, no
// fragments). Shared by the broken-link check and the orphan
// reachability walk. Exported for testing.
export function extractRelativeLinkTargets(body) {
  const out = [];
  for (const m of body.matchAll(REL_LINK_RE)) {
    const target = m[1].split('#')[0].split('?')[0];
    if (target) out.push(target);
  }
  return out;
}

// Recursively collect .md files under `dir` (absolute paths).
async function findMdFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await findMdFiles(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

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
    const skillDir = path.dirname(file);
    const hasDisclosure = !isUpstream && DISCLOSURE_DIRS.some((d) =>
      existsSync(path.join(skillDir, d)));

    if (lineCount > 800) err(`SKILL.md is ${lineCount} lines (hard limit 800; keep under 500)`);
    else if (lineCount > 500) {
      // The 500-line warning is the MUST-split line of the
      // progressive-disclosure standard: above it, a skill without
      // disclosure folders is told where to go. The 300-line budget
      // is deliberately NOT warned here — migration is gradual, and
      // the budget is measured by disclosure-coverage.mjs.
      warn(`SKILL.md is ${lineCount} lines (recommended max 500)` +
        (hasDisclosure ? '' : '; consider progressive disclosure (docs/PROGRESSIVE-DISCLOSURE.md)'));
    }

    const { raw, body, error: splitErr } = splitFrontmatter(text);
    if (splitErr) { err(splitErr); continue; }
    const { data, error: parseErr } = parseFrontmatter(raw);
    if (parseErr) { err(parseErr); continue; }
    // Lines before the body (frontmatter + delimiters), so the
    // body-relative checks below report FILE line numbers.
    const bodyOffset = text.slice(0, text.length - body.length).split('\n').length - 1;

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

    // --- hardcoded version-fact dates (Finding 4; all, body only) ---
    // Frontmatter is exempt by construction (only `body` is scanned):
    // last_verified is the single source of truth for freshness.
    // ai/audits/* and CHANGELOG.md are out of scope: this validator
    // only scans skills/.
    for (const { line, date } of findHardcodedAsOfDates(body, bodyOffset)) {
      (isUpstream ? warn : err)(
        `hardcoded version date "as of ${date}" (line ${line}): version facts belong in ` +
        `frontmatter last_verified or as a version range, not as a date in the body`,
      );
    }

    // --- disclosure-path mentions resolve (all) ---
    // Bare/prose references to references/, scripts/, assets/ or
    // examples/ files must exist, like markdown links — but ONLY
    // when the skill has that disclosure folder. Without the folder,
    // a mention is illustrative or aspirational, not a pointer into
    // the skill's own layout: writing-skills teaches "invoke bundled
    // scripts (`bash scripts/tool.sh`)" as a generic pattern, and
    // flagging it would be a false positive. With the folder, a
    // mention of a missing file is a genuine dangling pointer
    // (prisma-postgres-upgrade references a references/
    // deploy-existing-app.md that was never imported).
    // Deduplicated by target: one missing file is one error,
    // however often it is mentioned.
    const seenMentions = new Set();
    for (const { target, line } of extractDisclosureMentions(body, bodyOffset)) {
      if (seenMentions.has(target)) continue;
      seenMentions.add(target);
      const mentionDir = target.split('/')[0];
      if (!existsSync(path.join(skillDir, mentionDir))) continue;
      if (!existsSync(path.resolve(path.dirname(file), target))) {
        (isUpstream ? warn : err)(`dangling disclosure pointer (line ${line}): ${target} does not exist`);
      }
    }

    // --- orphaned disclosure files (original only) ---
    // Every file under a disclosure folder must be reachable from
    // SKILL.md by following relative links and path mentions
    // (transitively through other .md files under the skill dir).
    // Unreachable files are dead content no agent will find: a
    // warning, not an error — an orphan breaks nothing, and
    // migration is gradual.
    if (!isUpstream && hasDisclosure) {
      // Only files under the four disclosure folders are disclosure
      // files: an .md file under any other subdir is not judged here.
      const mdFiles = (await findMdFiles(skillDir)).filter((f) => {
        const relToSkill = toPosixPath(path.relative(skillDir, f));
        return DISCLOSURE_DIRS.some((d) => relToSkill.startsWith(`${d}/`));
      });
      const reachable = new Set(['SKILL.md']);
      const queue = [file];
      const seenFiles = new Set([file]);
      while (queue.length > 0) {
        const current = queue.shift();
        const currentText = current === file ? text : await readFile(current, 'utf8');
        const targets = [
          ...extractRelativeLinkTargets(currentText),
          ...extractDisclosureMentions(currentText).map((m) => m.target),
        ];
        for (const target of targets) {
          const relTarget = toPosixPath(path.relative(
            skillDir, path.resolve(path.dirname(current), target)));
          if (relTarget.startsWith('..')) continue; // points outside the skill dir
          reachable.add(relTarget);
          const abs = path.join(skillDir, relTarget);
          if (relTarget.endsWith('.md') && existsSync(abs) && !seenFiles.has(abs)) {
            seenFiles.add(abs);
            queue.push(abs);
          }
        }
      }
      for (const md of mdFiles) {
        const relToSkill = toPosixPath(path.relative(skillDir, md));
        if (relToSkill === 'SKILL.md') continue;
        if (!reachable.has(relToSkill)) {
          warnings.push(`${rel}: disclosure file '${relToSkill}' is not linked from SKILL.md (no agent will find it)`);
        }
      }
      // Non-.md disclosure files (scripts, templates, diagrams) are
      // leaves: they cannot link onward, so they only need a pointer.
      for (const dir of DISCLOSURE_DIRS) {
        const dirAbs = path.join(skillDir, dir);
        if (!existsSync(dirAbs)) continue;
        const stack = [dirAbs];
        while (stack.length > 0) {
          const current = stack.pop();
          for (const e of await readdir(current, { withFileTypes: true }).catch(() => [])) {
            const full = path.join(current, e.name);
            if (e.isDirectory()) { stack.push(full); continue; }
            if (e.name.endsWith('.md')) continue; // covered by the .md walk above
            const relToSkill = toPosixPath(path.relative(skillDir, full));
            if (!reachable.has(relToSkill)) {
              warnings.push(`${rel}: disclosure file '${relToSkill}' is not referenced from SKILL.md (no agent will find it)`);
            }
          }
        }
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
