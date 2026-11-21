// links.mjs — link creation and Windows filesystem behavior.
//
// This module owns the installer's Windows link semantics (A-11) and
// the small Windows file-locking helpers used by the rename/rm paths:
//
//   * createLink() — create a symlink, falling back to a directory
//     junction on Windows when symlink creation is denied for lack
//     of privilege. Junctions need no privilege (no Developer Mode,
//     no administrator), but they only work for directories, only
//     store absolute targets, and only point at local volumes —
//     exactly the shape of a linked skill install, and never the
//     shape of an agent/workflow file.
//   * sameLinkTarget() — compare two link targets the way Windows
//     needs: NT namespace prefixes stripped, case-insensitive.
//   * isWindowsLockError() / lockErrorMessage() — EBUSY/EPERM on a
//     Windows rename/rm usually means another program holds a file
//     open (editor, agent, antivirus); the message says so instead
//     of surfacing the bare errno.
//   * rmRecursiveOptions() — Node's fs.rm retries EBUSY/EPERM when
//     maxRetries is set; on Windows those transient locks are
//     common, so recursive removals retry a few times. POSIX
//     behavior is unchanged (the same options as before).
//
// Junction semantics, as researched for Stage D (see
// ai/remediation/stage-d/windows-link-analysis.md for the full
// matrix, including what is proven, what is assumed, and what
// still needs real Windows execution):
//   * Node reports a junction as a symbolic link from lstat() and
//     readdir() Dirents, and readlink() returns its target — so
//     every classify/verify/doctor/backup path that keys on
//     isSymbolicLink()/readlink() treats a junction exactly like
//     the directory symlink it replaces. The manifest records
//     method 'link' either way; nothing downstream distinguishes
//     them, and nothing needs to.
//   * Junction substitute names are stored in NT namespace form
//     (a `\??\` prefix); current libuv strips that prefix in
//     readlink(), older versions did not — sameLinkTarget() strips
//     it either way, so the comparison is stable across versions.
//   * A junction's target must exist at creation time and must be
//     absolute (Node normalizes a relative target to absolute, but
//     against the process cwd — createLink resolves it against the
//     link's parent instead, which is the correct base for a
//     relative link target).
//   * Deleting or renaming a junction affects only the junction,
//     never its target — the same as a symlink. This is the one
//     assumption with a catastrophic failure mode if wrong (a
//     recursive rm that followed a junction into the library), and
//     it is the highest-priority item for the first real-Windows
//     run; see the analysis fragment.

import { symlink } from 'node:fs/promises';
import path from 'node:path';

/** A link could not be created (all attempts failed). */
export class LinkError extends Error {
  constructor(message, { cause = null, attempts = [] } = {}) {
    super(message);
    this.name = 'LinkError';
    this.cause = cause;
    // What was tried, in order: ['symlink'] or ['symlink', 'junction'].
    this.attempts = attempts;
  }
}

/**
 * Create a link at `linkPath` pointing at `target`.
 *
 * `kind` selects the Windows link type: skills are directories
 * ('dir'), agents/workflows are files ('file'). Returns 'symlink'
 * or 'junction' — whichever form was actually created.
 *
 * On Windows, creating a symlink needs Developer Mode or
 * administrator privileges; without them the call fails with
 * EPERM. For a directory link, createLink then retries as a
 * junction, which needs no privilege — so `--link` keeps working
 * on a stock Windows install instead of failing outright (A-11).
 * Symlink-first (rather than junction-first) is deliberate: a
 * symlink is the better link where it can be created (relative
 * targets, network targets, the form every other platform uses),
 * and the fallback only changes behavior for users who would
 * otherwise get an error. File links cannot be junctions, so they
 * keep the clear privilege error.
 *
 * Only EPERM is retried: any other failure (missing target,
 * existing destination, bad path) would fail the same way as a
 * junction, and retrying would only hide the real error.
 *
 * `platform` and `symlinkFn` are injectable so tests can drive
 * the Windows fallback path on any platform (fault injection —
 * see test/installer.test.mjs). Production callers omit both.
 */
export async function createLink(
  target,
  linkPath,
  { kind = 'skill', platform = process.platform, symlinkFn = symlink } = {},
) {
  const type = kind === 'skill' ? 'dir' : 'file';
  try {
    await symlinkFn(target, linkPath, type);
    return 'symlink';
  } catch (err) {
    if (err.code === 'EPERM' && platform === 'win32' && kind === 'skill') {
      // Junctions store absolute targets. Resolve a relative
      // target against the link's parent directory: Node would
      // resolve it against the process cwd, which is the wrong
      // base for a link target (absolute targets are unaffected).
      const absoluteTarget = path.resolve(path.dirname(linkPath), target);
      try {
        await symlinkFn(absoluteTarget, linkPath, 'junction');
        return 'junction';
      } catch (junctionErr) {
        throw new LinkError(
          'cannot create a directory link on Windows: a directory symlink needs Developer Mode or ' +
            `administrator privileges, and the junction fallback also failed (${junctionErr.message})`,
          { cause: junctionErr, attempts: ['symlink', 'junction'] },
        );
      }
    }
    if (err.code === 'EPERM' && platform === 'win32') {
      throw new LinkError(
        'cannot create a file symlink on Windows: file symlinks need Developer Mode or administrator ' +
          'privileges (and, unlike directory links, file links cannot fall back to a junction, which only works for directories)',
        { cause: err, attempts: ['symlink'] },
      );
    }
    throw err;
  }
}

/**
 * Compare two link targets for equality, the way Windows needs.
 * Strips the NT namespace prefixes a readlink() result can carry
 * (`\\?\` and `\??\` — junction substitute names are stored in
 * the latter form), normalizes separators and `.`/`..` segments,
 * and compares case-insensitively on Windows (where the
 * filesystem is case-insensitive, so a stored target may differ
 * in case from the path the installer computed). On POSIX this is
 * a normalized case-sensitive comparison — the same result the
 * old `===` gave for the paths the installer actually compares.
 * `platform` is injectable so the Windows rules are unit-testable
 * on any platform.
 */
export function sameLinkTarget(a, b, platform = process.platform) {
  const pathMod = platform === 'win32' ? path.win32 : path.posix;
  const normalize = (p) => {
    let s = String(p);
    s = s.replace(/^\\\\\?\\/, '').replace(/^\\\?\?\\/, '');
    s = pathMod.normalize(s);
    // path.normalize keeps a trailing separator; link targets must
    // compare equal with or without one (except a bare root, where
    // the separator is the path: '/' or 'C:\').
    const isRoot =
      platform === 'win32' ? /^[A-Za-z]:[\\/]?$/.test(s) || s === '\\' : s === '/';
    if (!isRoot) s = s.replace(/[\\/]+$/, '');
    if (platform === 'win32') s = s.toLowerCase();
    return s;
  };
  return normalize(a) === normalize(b);
}

/**
 * Is this error a Windows file lock? On Windows, renaming or
 * removing a file another program holds open fails with EBUSY
 * (sharing violation) or EPERM (access denied — the same code a
 * genuine ACL denial produces, so the message must name both
 * possibilities). `platform` is injectable for tests.
 */
export function isWindowsLockError(err, platform = process.platform) {
  return Boolean(platform === 'win32' && err && (err.code === 'EBUSY' || err.code === 'EPERM'));
}

/** Human-readable explanation for a Windows lock error. */
export function lockErrorMessage(err, action) {
  return (
    `${action} failed (${err.message}): a file may be in use by another program (an editor, the agent, ` +
    'or antivirus software) or you may not have permission to change it — close the program holding it open and re-run.'
  );
}

/**
 * Options for a recursive rm. On Windows, transient locks from
 * antivirus/indexer scans are common, and Node retries EBUSY/EPERM
 * when maxRetries is set (linear backoff, retryDelay longer on
 * each try) — so retry a few times before failing. On POSIX this
 * returns exactly the options the installer always used.
 * `platform` is injectable for tests.
 */
export function rmRecursiveOptions(platform = process.platform) {
  if (platform === 'win32') return { recursive: true, force: true, maxRetries: 3, retryDelay: 100 };
  return { recursive: true, force: true };
}
