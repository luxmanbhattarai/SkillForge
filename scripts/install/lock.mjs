// lock.mjs — a lockfile around mutating installer runs.
//
// Two concurrent runs used to race: the manifest read-modify-write
// was last-writer-wins (entries silently lost) and
// cleanStaleStaging could delete another live run's staging/trash.
// The lock is a file in the skills directory, created atomically
// (open 'wx'), holding the holder's pid, start time, command, and
// a random token. A second run fails fast with a clear message
// instead of corrupting shared state.
//
// Stale locks (a previous run killed before releasing) are taken
// over only when the recorded pid is dead AND the lock is older
// than STALE_LOCK_MAX_AGE_MS. The age requirement guards the pid
// check against pid reuse: a pid can be recycled by an unrelated
// process, so a live pid proves nothing about the lock holder —
// but a dead pid on an old lock is strong evidence the holder is
// gone. When in doubt the lock is kept: a live pid never loses
// its lock, however old, and the operator can always remove the
// file by hand (the error message says where it is).
//
// If the lock file cannot be created at all (e.g. the skills dir
// is read-only or blocked by a file), acquireLock returns an
// unheld handle instead of throwing: a run that cannot create the
// lock file cannot write the manifest either, so it cannot corrupt
// shared state — it proceeds (callers warn) and fails at its first
// real write with the underlying error, exactly as before. Callers
// must skip cleanStaleStaging when the lock is unheld: without the
// lock, another live run's staging could be deleted.

import { mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

export const LOCK_NAME = '.skillforge-lock';
// A full install of the whole library takes seconds; a lock older
// than this with a dead pid is not a slow run, it is a dead one.
export const STALE_LOCK_MAX_AGE_MS = 10 * 60 * 1000;
const ACQUIRE_ATTEMPTS = 5;

export function lockPath(skillsDir) {
  return path.join(skillsDir, LOCK_NAME);
}

function isPidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH: no such process. EPERM: a process exists but belongs
    // to another user — still alive.
    return err.code !== 'ESRCH';
  }
}

// Read a lock file's payload. Returns null when the file is gone;
// { parseable: false } when its contents are not our JSON (age is
// then taken from the file mtime, which cannot be forged in the
// payload). A lock path that is a directory is never stale — the
// operator removes it by hand; the installer never rm -rf's it.
async function inspectLock(file) {
  let raw;
  let st;
  try {
    raw = await readFile(file, 'utf8');
    st = await stat(file);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    if (err.code === 'EISDIR') return { isDirectory: true, ageMs: Infinity, parseable: false };
    throw err;
  }
  if (st.isDirectory()) return { isDirectory: true, ageMs: Infinity, parseable: false };
  const ageMs = Date.now() - st.mtimeMs;
  try {
    return { ...JSON.parse(raw), ageMs, parseable: true };
  } catch {
    return { pid: null, startedAt: null, token: null, ageMs, parseable: false };
  }
}

function lockIsStale(info) {
  if (!info || info.isDirectory) return false;
  if (info.ageMs < STALE_LOCK_MAX_AGE_MS) return false;
  if (!info.parseable) return true; // old + unreadable: nothing can claim it
  if (info.pid === process.pid) return false;
  return !isPidAlive(info.pid);
}

function unavailable(file, error) {
  return { file, held: false, error, release: async () => {} };
}

/**
 * Acquire the install lock for a skills directory.
 * Returns a handle { file, held, release }: held is false when the
 * lock file could not be created (see the header comment).
 * Throws when another run holds the lock, or when a stale-lock
 * takeover keeps losing the race.
 */
export async function acquireLock(skillsDir, { command = null } = {}) {
  const file = lockPath(skillsDir);
  try {
    await mkdir(skillsDir, { recursive: true });
  } catch (err) {
    return unavailable(file, err);
  }
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), command, token }) + '\n';
  for (let attempt = 0; attempt < ACQUIRE_ATTEMPTS; attempt++) {
    try {
      const fh = await open(file, 'wx');
      try {
        await fh.writeFile(payload, 'utf8');
      } finally {
        await fh.close();
      }
      return {
        file,
        held: true,
        error: null,
        release: async () => {
          // Only remove the lock if it is still ours: a stale
          // takeover must never delete another run's lock.
          let current;
          try {
            current = JSON.parse(await readFile(file, 'utf8'));
          } catch (err) {
            return; // gone or unreadable: not ours to remove
          }
          if (current.token !== token) return;
          await rm(file, { force: true });
        },
      };
    } catch (err) {
      if (err.code !== 'EEXIST') return unavailable(file, err);
    }
    // The lock exists: is it stale enough to take over?
    const info = await inspectLock(file);
    if (info === null) continue; // vanished between the create and the read; retry
    if (!lockIsStale(info)) {
      const holder = info.parseable && info.pid ? ` (pid ${info.pid}, started ${info.startedAt || 'unknown'})` : '';
      const age = info.isDirectory
        ? 'unknown'
        : info.ageMs < 60000
          ? `${Math.round(info.ageMs / 1000)}s`
          : `${Math.round(info.ageMs / 60000)}m`;
      const staleHint =
        info.parseable && !isPidAlive(info.pid)
          ? ` The recorded pid is not running, so the lock looks stale, but it is only ${age} old; stale locks are taken over after ${STALE_LOCK_MAX_AGE_MS / 60000} minutes.`
          : '';
      const dirHint = info.isDirectory
        ? ` The lock path is a directory, which the installer will not remove.`
        : '';
      throw new Error(
        `Another SkillForge installer run is already using ${skillsDir}${holder} (lock held for ${age}). ` +
          `Wait for it to finish, or if no install is running, remove the lock file: ${file}.${staleHint}${dirHint}`,
      );
    }
    // Stale: re-read to make sure it is still the same lock, then
    // remove it and retry the create. The create is atomic ('wx'),
    // so if another process takes it over first we get EEXIST and
    // see a fresh, live lock on the next attempt.
    const again = await inspectLock(file);
    if (again === null) continue;
    if (again.parseable !== info.parseable || again.pid !== info.pid || again.startedAt !== info.startedAt) continue;
    await rm(file, { force: true });
  }
  throw new Error(
    `Could not acquire the installer lock for ${skillsDir} after ${ACQUIRE_ATTEMPTS} attempts (${file}). ` +
      'If no install is running, remove the lock file and retry.',
  );
}

/** Acquire the lock, run fn with the handle, release in a finally. */
export async function withLock(skillsDir, opts, fn) {
  const lock = await acquireLock(skillsDir, opts);
  try {
    return await fn(lock);
  } finally {
    await lock.release();
  }
}
