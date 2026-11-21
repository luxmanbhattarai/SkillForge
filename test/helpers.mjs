// helpers.mjs — shared test helpers for the installer suite.
//
// Every test runs in its own temp sandbox: a fake HOME and a fake
// project directory. No test ever touches the real home directory
// or any real agent directory.

import { execFile, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INSTALLER = path.join(REPO_ROOT, 'scripts', 'install-skills.mjs');

/** Create an isolated sandbox: { base, home, proj }. */
export async function makeSandbox() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'skillforge-installer-test-'));
  const home = path.join(base, 'home');
  const proj = path.join(base, 'proj');
  await mkdir(home, { recursive: true });
  await mkdir(proj, { recursive: true });
  return { base, home, proj };
}

/**
 * Run the installer CLI as a child process with a sandboxed HOME
 * and cwd. Resolves (never rejects on non-zero exit) with
 * { code, stdout, stderr }.
 */
export function runCli(args, { home, proj, env = {} } = {}) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [INSTALLER, ...args],
      {
        cwd: proj,
        timeout: 60000,
        env: { ...process.env, HOME: home, ...env },
      },
      (err, stdout, stderr) => {
        resolve({ code: err ? err.code : 0, stdout: stdout || '', stderr: stderr || '' });
      },
    );
  });
}

/**
 * Find an executable on PATH (like `which`). Returns the full path,
 * or null when no executable entry exists.
 */
async function findOnPath(name) {
  const { access, constants } = await import('node:fs/promises');
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Not here; keep looking.
    }
  }
  return null;
}

/**
 * Run the installer under a PTY (via `script`) so it believes it is
 * interactive. `input` is written to the PTY after `delayMs`.
 * Returns { code, output }. Skips itself — returning
 * { skipped: true, reason } — when `script` is missing.
 *
 * `script` is looked up on PATH rather than hard-coded to
 * /usr/bin/script: it lives in /bin on some systems and in other
 * locations on others (A-13c). Node has no built-in PTY, and the
 * only portable alternative would be a native dependency
 * (node-pty) or a second runtime (python3 -c 'pty...'), so a
 * clear skip with a reason is the honest fallback on systems
 * without `script` (notably Windows, which has no `script` at
 * all); the prompt paths are still covered on every Unix CI
 * runner, where `script` is standard.
 */
export async function runCliPty(args, { home, proj, input, delayMs = 800, env = {} } = {}) {
  const scriptPath = await findOnPath('script');
  if (!scriptPath) {
    return { skipped: true, reason: 'no PTY available (`script` not found on PATH)' };
  }
  const cmd = `node ${INSTALLER} ${args.map((a) => `'${a}'`).join(' ')}`;
  return new Promise((resolve) => {
    const child = spawn(scriptPath, ['-qec', cmd, '/dev/null'], {
      cwd: proj,
      env: { ...process.env, HOME: home, ...env },
    });
    let output = '';
    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => { output += d.toString(); });
    const timer = setTimeout(() => {
      child.stdin.write(input);
      setTimeout(() => child.stdin.end(), 300);
    }, delayMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      // `script` vanished between the PATH lookup and the spawn:
      // treat it as unavailable, not as a test failure.
      if (err.code === 'ENOENT') resolve({ skipped: true, reason: `no PTY available (\`script\` not found: ${err.message})` });
      else resolve({ code: 1, output: `${output}\nspawn error: ${err.message}` });
    });
  });
}

export async function exists(p) {
  try {
    await (await import('node:fs/promises')).lstat(p);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

export async function listNames(dir) {
  try {
    return (await readdir(dir)).sort();
  } catch {
    return [];
  }
}

/**
 * Build a minimal fixture library (a fake SkillForge repo root) for
 * tests that need to change the library between runs — e.g. update
 * detection. Returns { root, setSkillBody } where setSkillBody
 * rewrites a fixture skill's SKILL.md.
 */
export async function makeFixtureLibrary(base) {
  const root = path.join(base, 'fixture-lib');
  const skillMd = (name, description, body) =>
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}\n`;
  await mkdir(path.join(root, 'skills', 'alpha', 'fixture-one'), { recursive: true });
  await mkdir(path.join(root, 'skills', 'beta', 'fixture-two'), { recursive: true });
  await mkdir(path.join(root, 'agents'), { recursive: true });
  await mkdir(path.join(root, 'workflows'), { recursive: true });
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'skillforge-fixture', version: '9.9.9', type: 'module' }, null, 2),
  );
  const registry = {
    name: 'skillforge',
    version: '9.9.9',
    generated: '2026-11-20',
    categories: ['alpha', 'beta'],
    total_skills: 2,
    skills: [
      {
        name: 'fixture-one',
        description: 'Fixture skill one.',
        path: 'skills/alpha/fixture-one',
        category: 'alpha',
        vendor: null,
        source_type: 'original',
        source: 'original',
        status: 'verified',
        version: '9.9.9',
        license: 'MIT',
        maintainer: 'skills-library',
        compatibility: null,
        last_verified: '2026-11-20',
      },
      {
        name: 'fixture-two',
        description: 'Fixture skill two.',
        path: 'skills/beta/fixture-two',
        category: 'beta',
        vendor: null,
        source_type: 'original',
        source: 'original',
        status: 'verified',
        version: '9.9.9',
        license: 'MIT',
        maintainer: 'skills-library',
        compatibility: null,
        last_verified: '2026-11-20',
      },
    ],
  };
  await mkdir(path.join(root, 'registry'), { recursive: true });
  await writeFile(path.join(root, 'registry', 'skills.json'), JSON.stringify(registry, null, 2));
  const onePath = path.join(root, 'skills', 'alpha', 'fixture-one', 'SKILL.md');
  const twoPath = path.join(root, 'skills', 'beta', 'fixture-two', 'SKILL.md');
  await writeFile(onePath, skillMd('fixture-one', 'Fixture skill one.', 'Version one body.'));
  await writeFile(twoPath, skillMd('fixture-two', 'Fixture skill two.', 'Version one body.'));
  await writeFile(
    path.join(root, 'agents', 'fixture-agent.md'),
    '# Fixture Agent\n\nDoes fixture things, reliably and quickly.\n\n## Role\n\nFixture role text.\n',
  );
  await writeFile(
    path.join(root, 'workflows', 'fixture-workflow.md'),
    '# Fixture Workflow\n\nRuns a fixture workflow end to end.\n\n## Inputs\n\nNothing.\n',
  );
  return {
    root,
    setSkillBody: async (name, body) => {
      const p = name === 'fixture-one' ? onePath : twoPath;
      await writeFile(p, skillMd(name, `Fixture skill ${name === 'fixture-one' ? 'one' : 'two'}.`, body));
    },
  };
}
