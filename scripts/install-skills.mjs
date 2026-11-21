#!/usr/bin/env node
// install-skills.mjs — install SkillForge skills, agents, and
// workflows into an AI agent's directories, safely.
//
// Safety first: this installer NEVER silently deletes user
// modifications. On a conflict it compares the installed content
// against the library and the manifest, reports what differs, and
// (interactively) asks or (non-interactively) refuses with
// instructions. Every replacement is backed up first, installs are
// staged and swapped in with two renames (each rename is atomic on
// the same filesystem, but the pair is NOT atomic — see
// installer.mjs swapIn), and re-running an install with no changes
// is a no-op.
//
// Commands:
//   install    install skills (default: all), --category, --skill,
//              --agent, --workflow
//   update     re-install manifest items from the current library
//   list       installed items (from the manifest, or a disk scan)
//   doctor     check paths, manifest integrity, stale installs
//   validate   validate installed skills (SKILL.md, frontmatter)
//   uninstall  remove installed items (--skill/--agent/--workflow/
//              --category/--all)
//   restore    list backups (restore --list) or restore one
//              (restore <id>)
//   help       this help
//
// The legacy invocation keeps working exactly as before:
//   node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro
// (no command word + --skills means `install`.)
//
// Install paths — verified against each vendor's CURRENT official
// documentation on 2026-11-20 (see scripts/install/targets.mjs for
// the full source list):
//   claude-code  skills .claude/skills / ~/.claude/skills
//                agents .claude/agents / ~/.claude/agents
//   cursor       skills .cursor/skills / ~/.cursor/skills
//                agents .cursor/agents / ~/.cursor/agents
//   codex        skills .agents/skills / ~/.agents/skills
//                agents .codex/agents / ~/.codex/agents (TOML)
//   antigravity  skills .agents/skills / ~/.gemini/config/skills
//                agents .agents/agents / ~/.gemini/config/agents
//                workflows .agents/workflows /
//                          ~/.gemini/config/global_workflows
//                          (deprecated by Google)
// Codex and Antigravity paths changed since v1.0.0: Codex moved
// from .codex/skills to .agents/skills, Antigravity from
// .agent/skills to .agents/skills (and ~/.agent/skills was never a
// documented global path). `doctor` reports installs left in the
// legacy locations. Use --dest to override any path.
//
// Environment:
//   SKILLFORGE_ROOT  override the library root (used by the test
//                    suite to install from a fixture library;
//                    normally the repository this script lives in)

import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadLibrary } from './install/library.mjs';
import { UsageError, InstallerError } from './install/installer.mjs';
import { isInteractive, askChoice, closePrompt } from './install/prompt.mjs';
import {
  cmdInstall,
  cmdUpdate,
  cmdList,
  cmdDoctor,
  cmdValidate,
  cmdUninstall,
  cmdRestore,
} from './install/commands.mjs';

const ROOT = process.env.SKILLFORGE_ROOT
  ? path.resolve(process.env.SKILLFORGE_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COMMANDS = ['install', 'update', 'list', 'doctor', 'validate', 'uninstall', 'restore', 'help'];
const VALUE_FLAGS = new Set(['--target', '--scope', '--dest', '--skill', '--skills', '--category', '--agent', '--workflow']);
const BOOL_FLAGS = new Set(['--link', '--dry-run', '--force', '--backup', '--all', '--json', '--list', '--help', '-h', '--version']);

const HELP = `SkillForge installer — install skills, agents, and workflows into an AI agent's directories.

Usage:
  node scripts/install-skills.mjs <command> [options]
  node scripts/install-skills.mjs [options]            (legacy: no command means install)

Commands:
  install     Install skills (default: all skills), --category, --skill, --agent, --workflow
  update      Re-install installed items from the current library
  list        List installed items (manifest, or a disk scan when there is no manifest)
  doctor      Check install paths, manifest integrity, and stale installs
  validate    Validate installed skills (SKILL.md present, frontmatter name matches directory)
  uninstall   Remove installed items
  restore     Restore from a backup (restore --list, restore <id>)
  help        Show this help

Options:
  --target <name>     claude-code (or claude) | cursor | codex | antigravity
  --scope <scope>     project (default) | user
  --dest <path>       Install to a custom directory instead of a target path
                      (skills only; agents/workflows need --target)
  --skill <name>      Skill to install (repeatable, comma-separated, or 'all')
  --skills <list>     Legacy alias for --skill
  --category <name>   Install a whole category (repeatable; see registry/skills.json)
  --agent <name>      Agent to install (repeatable, or 'all'); needs --target
  --workflow <name>   Workflow to install (repeatable, or 'all'); Antigravity only
  --link              Symlink skills instead of copying (agents/workflows are always copied)
  --dry-run           Print exactly what would happen; change nothing
  --force             Overwrite conflicts without prompting (a backup is still made first)
  --backup            Back up and overwrite conflicts without prompting
  --all               (uninstall) remove everything in the manifest
  --json              (list, doctor, validate, restore --list) machine-readable output
  --list              (restore) list available backups
  --help, -h          Show this help
  --version           Show the installer version

Safety:
  The installer never silently deletes your modifications. When installed
  content differs from both the library and the manifest, interactive runs
  ask what to do and non-interactive runs refuse with instructions.
  Every replacement is backed up first, into a sibling directory:
  <parent>/.skillforge-backups/<timestamp>-<id>/. Restore with:
  node scripts/install-skills.mjs restore --list
  node scripts/install-skills.mjs restore <id> [--target ... | --dest ...]

Examples:
  node scripts/install-skills.mjs --target claude-code --scope project --skills nextjs,astro
  node scripts/install-skills.mjs install --target codex --scope user --category seo
  node scripts/install-skills.mjs install --target cursor --scope project --agent frontend-specialist
  node scripts/install-skills.mjs install --target claude-code --scope user --skills all --link
  node scripts/install-skills.mjs update --target claude-code --scope project --dry-run
  node scripts/install-skills.mjs list --target claude-code --scope project
  node scripts/install-skills.mjs doctor
  node scripts/install-skills.mjs uninstall --target codex --scope user --skill nextjs
  node scripts/install-skills.mjs restore --list --target claude-code --scope project

See docs/INSTALLATION.md for the full reference.
`;

function parseArgs(argv) {
  const ctx = {
    command: null,
    positional: [],
    target: null,
    scope: null,
    dest: null,
    skills: [],
    categories: [],
    agents: [],
    workflows: [],
    link: false,
    dryRun: false,
    force: false,
    backup: false,
    all: false,
    json: false,
    listBackups: false,
    help: false,
    version: false,
  };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (!arg.startsWith('-') && ctx.command === null && COMMANDS.includes(arg)) {
      ctx.command = arg;
      i++;
      continue;
    }
    if (!arg.startsWith('-')) {
      ctx.positional.push(arg);
      i++;
      continue;
    }
    let name = arg;
    let value = null;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      name = arg.slice(0, eq);
      value = arg.slice(eq + 1);
    }
    if (VALUE_FLAGS.has(name)) {
      if (value === null) {
        value = argv[i + 1];
        if (value === undefined || value.startsWith('-')) {
          throw new UsageError(`${name} needs a value.`);
        }
        i++;
      }
      if (value === '') throw new UsageError(`${name} needs a non-empty value.`);
      if (name === '--target') ctx.target = value;
      else if (name === '--scope') ctx.scope = value;
      else if (name === '--dest') ctx.dest = value;
      else if (name === '--skill' || name === '--skills') ctx.skills.push(value);
      else if (name === '--category') ctx.categories.push(value);
      else if (name === '--agent') ctx.agents.push(value);
      else if (name === '--workflow') ctx.workflows.push(value);
      i++;
      continue;
    }
    if (BOOL_FLAGS.has(name)) {
      if (value !== null) throw new UsageError(`${name} takes no value.`);
      if (name === '--link') ctx.link = true;
      else if (name === '--dry-run') ctx.dryRun = true;
      else if (name === '--force') ctx.force = true;
      else if (name === '--backup') ctx.backup = true;
      else if (name === '--all') ctx.all = true;
      else if (name === '--json') ctx.json = true;
      else if (name === '--list') ctx.listBackups = true;
      else if (name === '--help' || name === '-h') ctx.help = true;
      else if (name === '--version') ctx.version = true;
      i++;
      continue;
    }
    throw new UsageError(`Unknown option '${arg}'. Run with --help for usage.`);
  }
  return ctx;
}

async function main() {
  const ctx = parseArgs(process.argv.slice(2));

  if (ctx.help || ctx.command === 'help') {
    process.stdout.write(HELP);
    return 0;
  }
  if (ctx.version) {
    const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
    process.stdout.write(`skillforge-installer ${pkg.version}\n`);
    return 0;
  }

  // Legacy invocation: no command word. --skills (or any selector)
  // means install; with no selectors at all, show usage.
  if (!ctx.command) {
    const hasSelector = ctx.skills.length || ctx.categories.length || ctx.agents.length || ctx.workflows.length;
    if (!hasSelector) {
      process.stderr.write(HELP);
      process.stderr.write('\nError: no command given. Run with --help for usage.\n');
      return 2;
    }
    ctx.command = 'install';
  }

  if (ctx.command === 'restore' && ctx.listBackups && ctx.positional.length) {
    throw new UsageError('restore --list takes no backup id.');
  }
  if (ctx.command !== 'restore' && ctx.positional.length) {
    throw new UsageError(`Unexpected argument '${ctx.positional[0]}'.`);
  }

  ctx.root = ROOT;
  ctx.home = os.homedir();
  ctx.cwd = process.cwd();
  ctx.interactive = isInteractive();
  ctx.ask = askChoice;
  ctx.out = (msg) => process.stdout.write(`${msg}\n`);
  ctx.err = (msg) => process.stderr.write(`${msg}\n`);

  ctx.library = await loadLibrary(ROOT);

  switch (ctx.command) {
    case 'install': return cmdInstall(ctx);
    case 'update': return cmdUpdate(ctx);
    case 'list': return cmdList(ctx);
    case 'doctor': return cmdDoctor(ctx);
    case 'validate': return cmdValidate(ctx);
    case 'uninstall': return cmdUninstall(ctx);
    case 'restore': return cmdRestore(ctx);
    default: throw new UsageError(`Unknown command '${ctx.command}'.`);
  }
}

try {
  process.exitCode = await main();
} catch (err) {
  if (err instanceof UsageError) {
    process.stderr.write(`Error: ${err.message}\nRun with --help for usage.\n`);
    process.exitCode = 2;
  } else if (err instanceof InstallerError) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  } else {
    process.stderr.write(`Error: ${err.message}\n`);
    if (process.env.SKILLFORGE_DEBUG) process.stderr.write(`${err.stack}\n`);
    process.exitCode = 1;
  }
} finally {
  closePrompt();
}
