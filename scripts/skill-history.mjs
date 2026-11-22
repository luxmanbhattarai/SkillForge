#!/usr/bin/env node
// skill-history.mjs — per-skill change history reconstructed from git.
//
// Centralized changelog (see ai/quality/SKILL-CHANGELOG.md): skill files
// are never edited for versioning. History is derived from git log, so
// the changelog cannot drift from what actually happened, and upstream
// skills (verbatim imports under skills/upstream/) keep their
// attribution untouched.
//
// For a skill (or all skills) this reconstructs, from git log:
//   commit, date, author, full message, files changed, diffstat
// and classifies each change:
//   added / removed / renamed / upstream-reimport / security /
//   breaking / compatibility / fix / revert / content / formatting-only
//
// Formatting-only changes (whitespace-only or line-ending-only diffs,
// detected by re-running the diff with -w --ignore-cr-at-eol) are
// recorded but do NOT count as meaningful changes and do NOT bump the
// derived version.
//
// Merge commits are excluded: a merge's diff is the sum of its branch
// commits, which git log already lists, so including merges would
// double-count every change. (The revert / re-apply pair around PR #1
// are ordinary commits, so they ARE included — they genuinely removed
// and re-added skills.)
//
// Usage:
//   node scripts/skill-history.mjs <skill-name|skill-path|--all> [--json]
//     [--out <file>] [--repo <path>] [--since <date>] [--limit <n>]
//   npm run history -- <skill>        (see package.json; coordinator adds)
//
// Exit code 0 on success, 1 on usage error, 2 when the skill is unknown.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPosixPath } from './lib/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Skill path helpers
// ---------------------------------------------------------------------------

/** True when `relPath` (POSIX, repo-relative) is inside skills/upstream/. */
export function isUpstreamSkill(relPath) {
  return toPosixPath(relPath).startsWith('skills/upstream/');
}

/**
 * The skill directory a repo-relative file belongs to, or null when the
 * file is not inside a skill directory (e.g. skills/upstream/<vendor>/
 * ATTRIBUTION.md, a vendor-level file, or skills/README.md).
 * Original skills: skills/<category>/<name>/...
 * Upstream skills: skills/upstream/<vendor>/<name>/...
 */
export function skillDirOf(relPath) {
  const parts = toPosixPath(relPath).split('/');
  if (parts[0] !== 'skills' || parts.length < 3) return null;
  if (parts[1] === 'upstream') {
    if (parts.length < 4) return null;
    // Vendor-level file, e.g. skills/upstream/vercel/ATTRIBUTION.md:
    // a 4-part path whose last part is a filename, not a skill
    // directory. Skill names are lowercase-hyphen slugs and never
    // contain a dot; files do (their extension).
    if (parts.length === 4 && parts[3].includes('.')) return null;
    return parts.slice(0, 4).join('/');
  }
  // Category-level file, e.g. skills/frontend/README.md.
  if (parts.length === 3 && parts[2].includes('.')) return null;
  return parts.slice(0, 3).join('/');
}

// ---------------------------------------------------------------------------
// Classification (pure: no git, fully unit-testable)
// ---------------------------------------------------------------------------

const SECURITY_RE = /security|CVE-\d{4}-\d+|vulnerab|secret|credential leak|gitleaks|semgrep|hardening|injection|traversal/i;
const BREAKING_RE = /breaking change|BREAKING CHANGE|breaking:/i;
const COMPAT_RE = /compatib|windows|macos|linux|node ?2[0-9]|platform|junction/i;
const FIX_RE = /\bfix(e[sd]|ing)?\b|correct(e[sd]|ion)?|patch\b|repair/i;
const IMPORT_RE = /import|re-?import|upstream/i;
const REVERT_RE = /^(Revert|Reapply) "/;

/**
 * Classify one change to a skill.
 *
 * @param {object} change
 * @param {string} change.subject - commit subject line
 * @param {string} [change.body] - full commit message (subject + body)
 * @param {Array<{path:string,status:string}>} change.files - files changed
 * @param {string} change.skillPath - POSIX repo-relative skill directory
 * @param {boolean} [change.formattingOnly] - diff is whitespace/line-ending only
 * @returns {{ classes: string[], meaningful: boolean, formattingOnly: boolean }}
 *
 * Rules (several classes may apply at once; see
 * ai/quality/SKILL-CHANGELOG.md for the rationale):
 * - the skill's SKILL.md added/removed/renamed -> added/removed/renamed
 * - a rename is also breaking: the skill's name/path is its identity,
 *   and installers reference it by path
 * - upstream skill + import wording (or first add) -> upstream-reimport
 * - security / breaking / compatibility / fix wording in the message
 * - formatting-only -> formatting-only (never meaningful, never a
 *   version bump); anything else meaningful -> content
 */
export function classifyChange({ subject, body, files, skillPath, formattingOnly = false }) {
  const text = `${subject}\n${body || ''}`;
  const skillFile = `${toPosixPath(skillPath)}/SKILL.md`;
  const classes = new Set();
  // The skill's own SKILL.md, by basename: --follow returns the file
  // under its pre-rename path for older commits, so the current path
  // alone would miss the original add. (Callers only ever pass files
  // belonging to this skill, so a SKILL.md here is this skill's.)
  const main = files.find((f) => f.path.endsWith('/SKILL.md') || f.path === 'SKILL.md');
  // A rename shows the NEW path in name-status; the old path is in
  // oldPath. Either side matching the skill file counts.
  const renamedFile = files.find((f) => f.status.startsWith('R') && (f.path === skillFile || f.oldPath === skillFile));

  if (main && main.status === 'A') classes.add('added');
  if (main && main.status === 'D') classes.add('removed');
  if (renamedFile) { classes.add('renamed'); classes.add('breaking'); }
  // A rename is neither an add nor a removal: the directory pass
  // (no --follow) sees a rename as a plain add, because the old path
  // is outside its pathspec — the rename classification wins.
  if (classes.has('renamed')) { classes.delete('added'); classes.delete('removed'); }

  const upstream = isUpstreamSkill(skillPath);
  if (upstream && (IMPORT_RE.test(text) || classes.has('added'))) classes.add('upstream-reimport');
  if (SECURITY_RE.test(text)) classes.add('security');
  if (BREAKING_RE.test(text)) classes.add('breaking');
  if (COMPAT_RE.test(text)) classes.add('compatibility');
  if (FIX_RE.test(text)) classes.add('fix');
  if (REVERT_RE.test(subject)) classes.add('revert');

  if (formattingOnly) {
    classes.add('formatting-only');
  } else if (!classes.has('added') && !classes.has('removed') && !classes.has('renamed') &&
    ![...classes].some((c) => ['upstream-reimport', 'security', 'breaking', 'compatibility', 'fix'].includes(c))) {
    // 'content' is the fallback for a meaningful change with no more
    // specific class — it is not added alongside fix/security/etc.,
    // so that a fix-only change stays distinguishable for versioning.
    classes.add('content');
  }

  return {
    classes: [...classes],
    meaningful: !formattingOnly,
    formattingOnly,
  };
}

/**
 * Derive a semver-style version from a skill's entries, oldest first.
 *  - first add            -> 1.0.0 (or the first meaningful entry, when
 *    history is truncated by --since and no add is visible)
 *  - re-add after removal -> minor+1 (a restore, not a new skill: the
 *    version does NOT reset — the Nov 2026 revert/re-apply pair
 *    removed and re-added every upgrade skill, and resetting there
 *    would erase their earlier history)
 *  - breaking change      -> major+1, minor/patch reset
 *  - content/compat/security/upstream-reimport -> minor+1, patch reset
 *  - fix-only change      -> patch+1
 *  - formatting-only      -> no bump (never a meaningful version change)
 *  - removed              -> version unchanged (the skill is gone, not v0)
 * Returns null when there are no entries at all.
 */
export function deriveVersion(entriesOldestFirst) {
  if (!entriesOldestFirst || entriesOldestFirst.length === 0) return null;
  let major = 0;
  let minor = 0;
  let patch = 0;
  let started = false;
  for (const e of entriesOldestFirst) {
    const c = e.classes || [];
    if (c.includes('added')) {
      if (!started) { major = 1; minor = 0; patch = 0; started = true; }
      else { minor += 1; patch = 0; } // re-add after a removal: restore, not reset
      continue;
    }
    if (!e.meaningful) continue;
    // Truncated history (--since, or a bulk pass that missed the add):
    // the first visible meaningful change is the 1.0.0 baseline, not
    // a bump on top of it.
    if (!started) { major = 1; minor = 0; patch = 0; started = true; continue; }
    if (c.includes('breaking')) { major += 1; minor = 0; patch = 0; }
    else if (c.includes('removed')) { /* version unchanged */ }
    else if (c.length === 1 && c[0] === 'fix') { patch += 1; }
    else { minor += 1; patch = 0; }
  }
  return started ? `${major}.${minor}.${patch}` : null;
}

// ---------------------------------------------------------------------------
// git log parsing (pure: parses captured output, fully unit-testable)
// ---------------------------------------------------------------------------

const MARKER = '__SFH__';
const NAME_STATUS_RE = /^([ACDMRTU]\d*)\t(.+)$/;
const NUMSTAT_RE = /^(\d+|-)\t(\d+|-)\t(.+)$/;

/**
 * Parse `git log --format=__SFH__%H%x00%an%x00%ad%x00%s --name-status`
 * output into commit records keyed by hash. Each record:
 * { hash, author, date, subject, files: [{ path, status, oldPath? }] }
 */
export function parseNameStatusLog(text) {
  const commits = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith(MARKER)) {
      const fields = line.slice(MARKER.length).split('\0');
      current = {
        hash: fields[0],
        author: fields[1] || '',
        date: fields[2] || '',
        subject: fields[3] || '',
        files: [],
      };
      commits.set(current.hash, current);
      continue;
    }
    if (!current || line === '') continue;
    const m = line.match(NAME_STATUS_RE);
    if (!m) continue;
    const status = m[1];
    const rest = m[2].split('\t');
    if (status.startsWith('R') || status.startsWith('C')) {
      current.files.push({ path: rest[1], status, oldPath: rest[0] });
    } else {
      current.files.push({ path: rest[0], status });
    }
  }
  return commits;
}

/**
 * Parse `git log --format=__SFH__%H --numstat` output into
 * Map<hash, Map<path, { added, deleted, binary }>>.
 * Binary files show '-' for both counts.
 */
export function parseNumstatLog(text) {
  const out = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith(MARKER)) {
      const hash = line.slice(MARKER.length);
      current = new Map();
      out.set(hash, current);
      continue;
    }
    if (!current || line === '') continue;
    const m = line.match(NUMSTAT_RE);
    if (!m) continue;
    const binary = m[1] === '-' || m[2] === '-';
    current.set(m[3], {
      added: binary ? null : Number(m[1]),
      deleted: binary ? null : Number(m[2]),
      binary,
    });
  }
  return out;
}

/**
 * Parse `git log --format=%H%x00%B%x1e` output into Map<hash, message>.
 * %B is the full message (subject + body); records are separated by \x1e.
 */
export function parseMessagesLog(text) {
  const out = new Map();
  for (const record of text.split('\x1e')) {
    const trimmed = record.replace(/^\n+/, '');
    if (!trimmed) continue;
    const sep = trimmed.indexOf('\0');
    if (sep === -1) continue;
    out.set(trimmed.slice(0, sep), trimmed.slice(sep + 1).trim());
  }
  return out;
}

// ---------------------------------------------------------------------------
// git log collection
// ---------------------------------------------------------------------------

function git(repoRoot, args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * True when a file set is formatting-only: every file has a non-empty
 * normal diffstat but an empty -w diffstat. Binary files are never
 * formatting-only; a file with no -w row (should not happen) is
 * treated as content, so the check fails closed.
 */
export function isFormattingOnlyFileSet(files) {
  return files.length > 0 && files.every((f) => {
    if (f.binary) return false;
    if (f.wAdded === null || f.wAdded === undefined) return false;
    const normal = (f.added ?? 0) + (f.deleted ?? 0);
    return normal > 0 && (f.wAdded ?? 0) === 0 && (f.wDeleted ?? 0) === 0;
  });
}

function logArgs({ follow, since, limit, extra = [], format }) {
  const args = ['log', '--no-merges', `--format=${format}`, '--date=iso-strict'];
  if (follow) args.push('--follow');
  if (since) args.push(`--since=${since}`);
  if (limit) args.push(`-n`, String(limit));
  args.push(...extra);
  return args;
}

/**
 * Collect commit records for one pathspec group (one file with --follow,
 * or one directory). Runs four passes: name-status (structure),
 * numstat (diffstat), numstat -w (formatting detection), and full
 * messages (classification input, including BREAKING CHANGE footers).
 * Returns Map<hash, entry> where entry carries files with diffstat,
 * classes, and formattingOnly.
 */
export function collectHistory(repoRoot, { pathspec, follow = false, since = null, limit = null, skillPath }) {
  const metaFormat = `${MARKER}%H%x00%an%x00%ad%x00%s`;
  const ns = parseNameStatusLog(git(repoRoot, [...logArgs({ follow, since, limit, format: metaFormat, extra: ['--name-status'] }), '--', pathspec]));
  const num = parseNumstatLog(git(repoRoot, [...logArgs({ follow, since, limit, format: `${MARKER}%H`, extra: ['--numstat'] }), '--', pathspec]));
  const numW = parseNumstatLog(git(repoRoot, [...logArgs({ follow, since, limit, format: `${MARKER}%H`, extra: ['--numstat', '-w', '--ignore-cr-at-eol'] }), '--', pathspec]));
  const messages = parseMessagesLog(git(repoRoot, [...logArgs({ follow, since, limit, format: '%H%x00%B%x1e' }), '--', pathspec]));

  const entries = new Map();
  for (const [hash, commit] of ns) {
    // The -w pass lists every commit but OMITS files whose -w diff
    // is empty (verified: a whitespace-only commit appears with no
    // numstat lines). So: file row present -> its counts; file row
    // absent but commit present -> 0/0 (whitespace-only for that
    // file); commit absent from the -w pass -> unknown (null), and
    // isFormattingOnlyFileSet fails closed on null.
    const wMap = numW.get(hash);
    const files = commit.files.map((f) => {
      const stat = (num.get(hash) || new Map()).get(f.path) || {};
      const w = wMap ? wMap.get(f.path) : undefined;
      return {
        ...f,
        added: stat.added ?? null,
        deleted: stat.deleted ?? null,
        binary: stat.binary ?? false,
        // -w diffstat, retained so callers can recompute
        // formatting-only for a subset of the files (the --all
        // partition does this per skill).
        wAdded: w ? w.added : (wMap ? 0 : null),
        wDeleted: w ? w.deleted : (wMap ? 0 : null),
      };
    });
    const formattingOnly = isFormattingOnlyFileSet(files);
    const body = messages.get(hash) || '';
    const { classes, meaningful } = classifyChange({
      subject: commit.subject,
      body,
      files,
      skillPath,
      formattingOnly,
    });
    entries.set(hash, {
      hash,
      short: hash.slice(0, 7),
      date: commit.date,
      author: commit.author,
      subject: commit.subject,
      body,
      classes,
      meaningful,
      formattingOnly,
      files,
      added: files.reduce((a, f) => a + (f.added ?? 0), 0),
      deleted: files.reduce((a, f) => a + (f.deleted ?? 0), 0),
    });
  }
  return entries;
}

function mergeEntries(target, source) {
  for (const [hash, entry] of source) {
    if (!target.has(hash)) {
      target.set(hash, entry);
    } else {
      // Same commit seen via two pathspecs (e.g. SKILL.md --follow and
      // the skill directory): union the file lists, keep the richer
      // classification (a rename seen on either side counts).
      const existing = target.get(hash);
      const byPath = new Map(existing.files.map((f) => [f.path, f]));
      for (const f of entry.files) if (!byPath.has(f.path)) byPath.set(f.path, f);
      existing.files = [...byPath.values()];
      existing.added = existing.files.reduce((a, f) => a + (f.added ?? 0), 0);
      existing.deleted = existing.files.reduce((a, f) => a + (f.deleted ?? 0), 0);
      existing.classes = [...new Set([...existing.classes, ...entry.classes])];
      // Same supersede rule as classifyChange: the directory pass
      // sees a rename as a plain add, so the union can hold both —
      // the rename wins.
      if (existing.classes.includes('renamed')) {
        existing.classes = existing.classes.filter((c) => c !== 'added' && c !== 'removed');
      }
      // Recompute from the unioned file list: a commit that reformats
      // SKILL.md but changes a reference file is not formatting-only.
      existing.formattingOnly = isFormattingOnlyFileSet(existing.files);
      if (existing.formattingOnly && !existing.classes.includes('formatting-only')) existing.classes.push('formatting-only');
      if (!existing.formattingOnly) existing.classes = existing.classes.filter((c) => c !== 'formatting-only');
      existing.meaningful = !existing.formattingOnly;
    }
  }
  return target;
}

function buildSkillRecord({ name, skillPath, sourceType, vendor, entries }) {
  const sorted = [...entries.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  const chronological = [...sorted].reverse();
  const meaningful = sorted.filter((e) => e.meaningful);
  const lastMeaningful = meaningful[0];
  return {
    name,
    path: skillPath,
    sourceType,
    vendor: vendor || null,
    derivedVersion: deriveVersion(chronological),
    totalChanges: sorted.length,
    meaningfulChanges: meaningful.length,
    formattingOnlyChanges: sorted.length - meaningful.length,
    firstSeen: chronological[0] ? chronological[0].date.slice(0, 10) : null,
    lastChange: sorted[0] ? sorted[0].date.slice(0, 10) : null,
    lastMeaningfulChange: lastMeaningful ? lastMeaningful.date.slice(0, 10) : null,
    removed: sorted[0] ? sorted[0].classes.includes('removed') : false,
    entries: sorted,
  };
}

/**
 * History for one skill: --follow on its SKILL.md (follows renames)
 * plus a directory pass for its references/, examples/, scripts/.
 */
export function getSkillHistory(repoRoot, skill, opts = {}) {
  const skillPath = toPosixPath(skill.path);
  const entries = collectHistory(repoRoot, { pathspec: `${skillPath}/SKILL.md`, follow: true, skillPath, ...opts });
  mergeEntries(entries, collectHistory(repoRoot, { pathspec: skillPath, skillPath, ...opts }));
  return buildSkillRecord({ name: skill.name, skillPath, sourceType: skill.sourceType, vendor: skill.vendor, entries });
}

/**
 * History for every skill in one bulk pass over skills/ (no --follow:
 * a rename moves a skill's older history under its old path, which the
 * bulk partition cannot attribute — use single-skill mode, which
 * follows renames, when a skill's full history matters). Returns
 * { skills: [...], unattributed: { commits, files } }.
 */
export function getAllSkillHistory(repoRoot, registrySkills, opts = {}) {
  // One bulk collection over skills/, partitioned per skill below.
  // collectHistory needs a skillPath for classification; pass the
  // skills root and re-classify per skill after partitioning.
  const bulk = collectHistory(repoRoot, { pathspec: 'skills', skillPath: 'skills', ...opts });
  const bySkill = new Map();
  const unattributedFiles = new Set();
  let unattributedCommits = 0;
  for (const entry of bulk.values()) {
    const perSkillFiles = new Map();
    for (const f of entry.files) {
      const dir = skillDirOf(f.path) || (f.oldPath ? skillDirOf(f.oldPath) : null);
      if (!dir) { unattributedFiles.add(f.path); continue; }
      if (!perSkillFiles.has(dir)) perSkillFiles.set(dir, []);
      perSkillFiles.get(dir).push(f);
    }
    if (perSkillFiles.size === 0) { unattributedCommits += 1; continue; }
    for (const [dir, files] of perSkillFiles) {
      if (!bySkill.has(dir)) bySkill.set(dir, new Map());
      // Re-classify against this skill (the bulk pass classified
      // against 'skills', which only yields content/security/etc. —
      // added/removed/renamed/upstream need the real skill path),
      // and recompute formatting-only for this skill's files only:
      // a commit that reformats one skill and rewrites another is
      // formatting-only for the first, content for the second.
      const formattingOnly = isFormattingOnlyFileSet(files);
      const { classes, meaningful } = classifyChange({
        subject: entry.subject,
        body: entry.body || '',
        files,
        skillPath: dir,
        formattingOnly,
      });
      bySkill.get(dir).set(entry.hash, {
        ...entry,
        files,
        classes,
        meaningful,
        formattingOnly,
        added: files.reduce((a, f) => a + (f.added ?? 0), 0),
        deleted: files.reduce((a, f) => a + (f.deleted ?? 0), 0),
      });
    }
  }
  const skills = registrySkills.map((s) => {
    const dir = toPosixPath(s.path);
    return buildSkillRecord({
      name: s.name,
      skillPath: dir,
      sourceType: s.source_type,
      vendor: s.vendor,
      entries: bySkill.get(dir) || new Map(),
    });
  });
  return {
    skills,
    unattributed: { commits: unattributedCommits, files: [...unattributedFiles].sort() },
  };
}

// ---------------------------------------------------------------------------
// Registry lookup + CLI
// ---------------------------------------------------------------------------

async function loadRegistry(repoRoot) {
  const raw = await readFile(path.join(repoRoot, 'registry', 'skills.json'), 'utf8');
  return JSON.parse(raw).skills;
}

function resolveSkillArg(arg, registrySkills) {
  const byName = registrySkills.find((s) => s.name === arg);
  if (byName) return byName;
  const asPath = toPosixPath(arg).replace(/\/$/, '');
  const byPath = registrySkills.find((s) => toPosixPath(s.path) === asPath);
  if (byPath) return byPath;
  return null;
}

function humanReport(result) {
  const lines = [];
  for (const s of result.skills) {
    lines.push(`${s.name} (${s.path}) — v${s.derivedVersion || '?.?.?'} — ${s.totalChanges} change(s), ${s.meaningfulChanges} meaningful, ${s.formattingOnlyChanges} formatting-only`);
    if (s.entries.length === 0) { lines.push('  (no history in git log)'); continue; }
    for (const e of s.entries) {
      const flags = e.formattingOnly ? ' [formatting-only]' : '';
      lines.push(`  ${e.date.slice(0, 10)} ${e.short} [${e.classes.join(', ')}] +${e.added}/-${e.deleted} ${e.subject}${flags}`);
    }
  }
  if (result.unattributed) {
    lines.push(`\nUnattributed: ${result.unattributed.commits} commit(s) touched skills/ files outside any skill directory (${result.unattributed.files.length} file(s)).`);
  }
  return lines.join('\n');
}

function usage() {
  return [
    'Usage: node scripts/skill-history.mjs <skill-name|skill-path|--all> [options]',
    '  --json            machine-readable JSON output',
    '  --out <file>      write JSON output to <file> (implies --json)',
    '  --repo <path>     repository root (default: this repo)',
    '  --since <date>    only changes on/after <date> (git --since)',
    '  --limit <n>       at most <n> entries per skill',
  ].join('\n');
}

// Only run as a script: tests import the helpers above.
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let jsonOut = false;
  let outFile = null;
  let repoRoot = ROOT;
  let since = null;
  let limit = null;
  let target = null;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--json') jsonOut = true;
    else if (a === '--all') target = '--all';
    else if (a === '--out') { outFile = args[i + 1]; i += 1; jsonOut = true; }
    else if (a === '--repo') { repoRoot = path.resolve(args[i + 1]); i += 1; }
    else if (a === '--since') { since = args[i + 1]; i += 1; }
    else if (a === '--limit') { limit = Number(args[i + 1]); i += 1; }
    else if (a.startsWith('--')) { console.error(`Unknown option: ${a}\n${usage()}`); process.exitCode = 1; }
    else if (!target) target = a;
    else { console.error(`Unexpected argument: ${a}\n${usage()}`); process.exitCode = 1; }
  }
  if (process.exitCode) { /* usage error already reported */ }
  else if (!target || !existsSync(path.join(repoRoot, '.git'))) {
    console.error(usage());
    if (!target) console.error('\nError: a skill name, skill path, or --all is required.');
    else console.error(`\nError: ${repoRoot} is not a git repository.`);
    process.exitCode = 1;
  } else {
    const registrySkills = await loadRegistry(repoRoot);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    let result;
    if (target === '--all') {
      const { skills, unattributed } = getAllSkillHistory(repoRoot, registrySkills, { since, limit });
      result = { generated: new Date().toISOString(), repo: repoRoot, head, mode: 'all', skills, unattributed };
    } else {
      const skill = resolveSkillArg(target, registrySkills);
      if (!skill) {
        console.error(`Error: no skill named '${target}' in registry/skills.json.`);
        process.exitCode = 2;
      } else {
        const record = getSkillHistory(repoRoot, skill, { since, limit });
        result = { generated: new Date().toISOString(), repo: repoRoot, head, mode: 'single', skills: [record] };
      }
    }
    if (result) {
      if (jsonOut) {
        const text = JSON.stringify(result, null, 2);
        if (outFile) { await writeFile(outFile, text + '\n', 'utf8'); console.log(`Wrote ${outFile}`); }
        else console.log(text);
      } else {
        console.log(humanReport(result));
      }
    }
  }
}
